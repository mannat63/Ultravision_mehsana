import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth";
import Payment from "@/models/Payment";
import Fee from "@/models/Fee";
import { reportError } from "@/lib/reportError";

export const dynamic = "force-dynamic";

const METHODS = ["CASH", "UPI", "BANK_TRANSFER"];

/**
 * POST /api/payments — record a payment against an invoice (created PENDING).
 *
 * Validated here so a bad amount can never reach the invoice; PUT /api/payments/:id/confirm
 * re-checks against the live outstanding balance before applying it. Recording a payment
 * never creates a fee record.
 */
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]); // manual entry by admin

    const body = await req.json();
    const { student_id, fee_id, method, reference_note } = body;
    const amount = Number(body.amount);

    if (!fee_id || !mongoose.isValidObjectId(fee_id)) {
      return NextResponse.json({ error: "A valid fee_id is required." }, { status: 400 });
    }
    if (!student_id || !mongoose.isValidObjectId(student_id)) {
      return NextResponse.json({ error: "A valid student_id is required." }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Payment amount must be greater than zero." },
        { status: 400 }
      );
    }
    if (!METHODS.includes(method)) {
      return NextResponse.json(
        { error: `method must be one of: ${METHODS.join(", ")}.` },
        { status: 400 }
      );
    }

    // The invoice must exist in this institute and belong to the named student.
    const fee = await Fee.findOne({ _id: fee_id, institute_id: authUser.institute_id }).lean();
    if (!fee) {
      return NextResponse.json({ error: "Fee record not found." }, { status: 404 });
    }
    if (String(fee.student_id) !== String(student_id)) {
      return NextResponse.json(
        { error: "This fee record does not belong to that student." },
        { status: 400 }
      );
    }
    if (fee.status === "PAID") {
      return NextResponse.json(
        { error: "This invoice is already fully settled." },
        { status: 400 }
      );
    }
    if (amount > Number(fee.due_amount) + 0.01) {
      return NextResponse.json(
        {
          error: `Payment of ₹${amount.toLocaleString("en-IN")} exceeds the outstanding ₹${Number(
            fee.due_amount
          ).toLocaleString("en-IN")} on this invoice.`,
        },
        { status: 400 }
      );
    }

    const payment = await Payment.create({
      student_id,
      fee_id,
      amount,
      method,
      reference_note,
      status: "PENDING",
      institute_id: authUser.institute_id,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Payments POST error:", error);
    await reportError({ source: "api/payments POST", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
