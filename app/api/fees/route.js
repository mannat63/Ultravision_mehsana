import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import { getAuthUser, requireRole } from "@/lib/auth";
import Fee from "@/models/Fee";
import Student from "@/models/Student";
import Institute from "@/models/Institute";
import Notification from "@/models/Notification";
import {
  normalizeFrequency,
  invoiceAmount,
  periodEnd,
  midnightUTC,
} from "@/lib/fees";
import { reportError } from "@/lib/reportError";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();

    const { searchParams } = new URL(req.url);
    const student_id = searchParams.get("student_id");

    const query = { institute_id: authUser.institute_id };

    if (authUser.role === "TEACHER") {
      return NextResponse.json(
        { error: "Forbidden: Teachers do not have fee access" },
        { status: 403 }
      );
    } else if (authUser.role === "STUDENT") {
      const student = await Student.findOne(
        { user_id: authUser._id },
        { _id: 1 }
      ).lean();
      if (!student) return NextResponse.json([], { status: 200 });
      query.student_id = student._id;
    } else {
      if (student_id) query.student_id = student_id;
    }

    // NOTE: listing fees never creates them. Recurring invoices are raised only by an
    // explicit admin action (POST /api/fees/next) — see lib/fees.js.

    const fees = await Fee.find(query)
      .select("student_id total_amount paid_amount due_amount due_date status frequency period_start period_end")
      .populate({
        path: "student_id",
        select: "parent_name parent_phone user_id",
        populate: { path: "user_id", select: "name" },
      })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(fees);
  } catch (error) {
    console.error("Fees GET error:", error);
    await reportError({ source: "api/fees GET", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);

    const body = await req.json();
    const { student_id, monthly_fee, fee_frequency, due_date } = body;
    // Backward-compat: some callers may still send a raw per-invoice `total_amount`.
    const rawTotal = body.total_amount;

    const freq = normalizeFrequency(fee_frequency);
    const start = midnightUTC(due_date || new Date());

    // Persist the plan on the student so future invoices auto-generate correctly.
    const monthlyRate = Number(monthly_fee);
    if (student_id && (Number.isFinite(monthlyRate) || fee_frequency)) {
      const update = { fee_frequency: freq };
      if (Number.isFinite(monthlyRate)) update.monthly_fee = monthlyRate;
      await Student.findByIdAndUpdate(student_id, update);
    }

    const total = rawTotal !== undefined && rawTotal !== null && rawTotal !== ""
      ? Number(rawTotal) || 0
      : invoiceAmount(monthlyRate, freq);

    const fee = await Fee.create({
      student_id,
      total_amount: total,
      paid_amount: 0,
      due_amount: total,
      due_date: start,
      status: "DUE",
      frequency: freq,
      period_start: start,
      period_end: periodEnd(start, freq),
      institute_id: authUser.institute_id,
    });

    // Notify parent via in-app Notification (same as test notify)
    try {
      const student = await Student.findById(student_id)
        .select("parent_phone parent_name user_id")
        .populate("user_id", "name")
        .lean();

      if (student) {
        const studentName = student.user_id?.name || student.parent_name || "Student";
        const parentPhone = student.parent_phone || "—";
        const dueDateStr = new Date(fee.due_date).toLocaleDateString("en-GB");
        const message = `Fee reminder: ₹${fee.due_amount} is due on ${dueDateStr}. Please make the payment on time.`;

        await Notification.create({
          institute_id: authUser.institute_id,
          student_id: student._id,
          type: "FEE_REMINDER",
          recipient_name: studentName,
          recipient_phone: parentPhone,
          message,
          status: "SENT",
        });
      }
    } catch (e) {
      console.error("Fee notification error:", e.message);
    }

    return NextResponse.json(fee, { status: 201 });
  } catch (error) {
    console.error("Fees POST error:", error);
    await reportError({ source: "api/fees POST", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
