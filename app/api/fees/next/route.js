import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth";
import Fee from "@/models/Fee";
import Student from "@/models/Student";
import { createNextFeeRecord, FeeCycleError } from "@/lib/fees";
import { withTransaction } from "@/lib/db/withTransaction";
import { reportError } from "@/lib/reportError";

export const dynamic = "force-dynamic";

/**
 * POST /api/fees/next  { student_id }
 *
 * Explicitly raise the next invoice for a student, from their existing billing plan.
 * This is the only endpoint that creates a recurring invoice — settlement never does.
 *
 * Backs both "Create Next Fee Record" in the post-settlement dialog and the
 * "Create Fee Record" button on the student profile (which also resumes a paused cycle).
 */
export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);

    const { student_id } = await req.json();

    if (!student_id || !mongoose.isValidObjectId(student_id)) {
      return NextResponse.json(
        { error: "A valid student_id is required.", code: "INVALID_STUDENT_ID" },
        { status: 400 }
      );
    }

    // All validation + both writes (invoice, cycle resume) commit or roll back together.
    const fee = await withTransaction((session) =>
      createNextFeeRecord({
        studentId: student_id,
        instituteId: authUser.institute_id,
        models: { Fee, Student },
        session,
      })
    );

    return NextResponse.json(fee, { status: 201 });
  } catch (error) {
    // Expected, user-facing rejections (unsettled invoice, duplicate period, no amount).
    if (error instanceof FeeCycleError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error("Fees next POST error:", error);
    await reportError({ source: "api/fees/next POST", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
