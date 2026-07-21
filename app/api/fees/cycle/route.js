import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth";
import Student from "@/models/Student";
import { setFeeCycleStatus, FEE_CYCLE_STATUSES, FeeCycleError } from "@/lib/fees";
import { reportError } from "@/lib/reportError";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/fees/cycle  { student_id, status: "ACTIVE" | "PAUSED" | "COMPLETED" }
 *
 * Pause / end / resume a student's billing cycle without touching any invoice.
 * Backs "Pause/End for Now" in the post-settlement dialog.
 *
 * A single atomic findOneAndUpdate — no transaction needed, and payment history and
 * past invoices are deliberately left untouched so reports stay intact.
 */
export async function PATCH(req) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);

    const { student_id, status } = await req.json();

    if (!student_id || !mongoose.isValidObjectId(student_id)) {
      return NextResponse.json(
        { error: "A valid student_id is required.", code: "INVALID_STUDENT_ID" },
        { status: 400 }
      );
    }

    if (!FEE_CYCLE_STATUSES.includes(status)) {
      return NextResponse.json(
        {
          error: `status must be one of: ${FEE_CYCLE_STATUSES.join(", ")}.`,
          code: "INVALID_STATUS",
        },
        { status: 400 }
      );
    }

    const student = await setFeeCycleStatus({
      studentId: student_id,
      instituteId: authUser.institute_id,
      status,
      models: { Student },
    });

    return NextResponse.json({
      student_id: student._id,
      fee_cycle_status: student.fee_cycle_status,
      fee_cycle_updated_at: student.fee_cycle_updated_at,
    });
  } catch (error) {
    if (error instanceof FeeCycleError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("Fees cycle PATCH error:", error);
    await reportError({ source: "api/fees/cycle PATCH", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
