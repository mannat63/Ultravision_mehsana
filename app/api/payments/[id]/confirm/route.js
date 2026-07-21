import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth";
import Payment from "@/models/Payment";
import Fee from "@/models/Fee";
import Student from "@/models/Student";
import { FeeCycleError } from "@/lib/fees";
import { withTransaction } from "@/lib/db/withTransaction";
import { reportError } from "@/lib/reportError";
import { sendEventToN8N } from "@/services/n8n";

export const dynamic = "force-dynamic";

/**
 * PUT /api/payments/:id/confirm
 *
 * Confirm a pending payment and apply it to its invoice, atomically.
 *
 * This route deliberately does NOT create the next fee record. When the invoice becomes
 * fully settled we return `settled: true` and the student's cycle state; the client then
 * asks the admin what to do next (raise the next invoice / pause / cancel). Raising the
 * next invoice is an explicit call to POST /api/fees/next.
 */
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);

    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid payment id." }, { status: 400 });
    }

    const result = await withTransaction(async (session) => {
      const saveOpts = session ? { session } : {};

      const existing = await Payment.findOne({
        _id: id,
        institute_id: authUser.institute_id,
      }).session(session);

      if (!existing) {
        throw new FeeCycleError("Payment not found.", { status: 404, code: "PAYMENT_NOT_FOUND" });
      }
      if (existing.status === "CONFIRMED") {
        throw new FeeCycleError("This payment is already confirmed.", {
          status: 400,
          code: "ALREADY_CONFIRMED",
        });
      }

      const fee = await Fee.findOne({
        _id: existing.fee_id,
        institute_id: authUser.institute_id,
      }).session(session);

      if (!fee) {
        throw new FeeCycleError("Fee record not found.", { status: 404, code: "FEE_NOT_FOUND" });
      }

      const amount = Number(existing.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new FeeCycleError("Payment amount must be greater than zero.", {
          status: 400,
          code: "INVALID_AMOUNT",
        });
      }
      // Never let a payment push an invoice past its total (tolerate float dust).
      if (amount > Number(fee.due_amount) + 0.01) {
        throw new FeeCycleError(
          `Payment of ₹${amount.toLocaleString("en-IN")} exceeds the outstanding ₹${Number(
            fee.due_amount
          ).toLocaleString("en-IN")} on this invoice.`,
          { status: 400, code: "OVERPAYMENT" }
        );
      }

      // Flip PENDING -> CONFIRMED guarded on the current status, so two concurrent
      // confirmations can never both apply the same amount to the invoice.
      const confirmed = await Payment.findOneAndUpdate(
        { _id: id, institute_id: authUser.institute_id, status: { $ne: "CONFIRMED" } },
        { $set: { status: "CONFIRMED" } },
        { new: true, session }
      );
      if (!confirmed) {
        throw new FeeCycleError("This payment is already confirmed.", {
          status: 400,
          code: "ALREADY_CONFIRMED",
        });
      }

      fee.paid_amount = (Number(fee.paid_amount) || 0) + amount;
      await fee.save(saveOpts); // pre-save hook recomputes due_amount + status

      const student = await Student.findOne({
        _id: existing.student_id,
        institute_id: authUser.institute_id,
      })
        .populate("user_id", "name")
        .session(session);

      return { payment: confirmed, fee, student };
    });

    const { payment, fee, student } = result;
    const settled = fee.status === "PAID";

    // Side effect runs only after the transaction has committed, and never fails the request.
    try {
      if (student) {
        await sendEventToN8N({
          event_type: "payment_confirmation",
          student: {
            name: student.user_id?.name || student.parent_name || "Student",
            parent_phone: student.parent_phone,
          },
          data: { amount: payment.amount },
        });
      }
    } catch (e) {
      console.error("Payment confirmation webhook failed:", e.message);
    }

    return NextResponse.json({
      message: "Payment confirmed",
      payment,
      fee,
      // Drives the post-settlement dialog on the client. No record is created here.
      settled,
      student: student
        ? {
            _id: student._id,
            name: student.user_id?.name || student.parent_name || "Student",
            fee_frequency: student.fee_frequency,
            fee_cycle_status: student.fee_cycle_status,
          }
        : null,
    });
  } catch (error) {
    if (error instanceof FeeCycleError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("Payment confirm error:", error);
    await reportError({ source: "api/payments/[id]/confirm PUT", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
