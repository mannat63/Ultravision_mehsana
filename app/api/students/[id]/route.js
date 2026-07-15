import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import { getAuthUser, requireRole } from "@/lib/auth";
import Student from "@/models/Student";
import User from "@/models/User";
import Fee from "@/models/Fee";
import Payment from "@/models/Payment";
import Attendance from "@/models/Attendance";
import Result from "@/models/Result";
import Test from "@/models/Test";
import RecycleBin from "@/models/RecycleBin";
import { logActivity } from "@/lib/logActivity";
import { normalizeFrequency, invoiceAmount, periodEnd, midnightUTC } from "@/lib/fees";
import { reportError } from "@/lib/reportError";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    const { id } = await params;

    const student = await Student.findOne({ _id: id, institute_id: authUser.institute_id })
      .populate("user_id", "name phoneOrEmail")
      .populate({ path: "section_id", select: "name class_id", populate: { path: "class_id", select: "name" } })
      .lean();

    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    // Students can only view themselves
    if (authUser.role === "STUDENT" && student.user_id?._id?.toString() !== authUser._id?.toString())
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const sid = student._id;
    const ninety = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const thirty = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [feeRecord, payments, att30, att90, results] = await Promise.all([
      Fee.findOne({ student_id: sid }).sort({ due_date: -1 }).lean(),
      Payment.find({ student_id: sid }).sort({ createdAt: -1 }).limit(10).lean(),

      Attendance.aggregate([
        { $match: { student_id: new mongoose.Types.ObjectId(sid), date: { $gte: thirty }, status: { $ne: "NOT_MARKED" } } },
        { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] } } } },
      ]),

      Attendance.aggregate([
        { $match: { student_id: new mongoose.Types.ObjectId(sid), date: { $gte: ninety }, status: { $ne: "NOT_MARKED" } } },
        { $group: { _id: null, total: { $sum: 1 }, present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] } } } },
      ]),

      Result.find({ student_id: sid })
        .populate({ path: "test_id", select: "name date subjects section_id", populate: { path: "section_id", select: "name" } })
        .sort({ createdAt: -1 })
        .limit(12)
        .lean(),
    ]);

    // Compute performance — max is scoped to the subjects the student was actually graded on
    // (their enrolled subjects), so partial-enrollment students aren't unfairly penalised.
    const testResults = results.map(r => {
      const test = r.test_id;
      const earned = (r.subject_marks || []).reduce((s, sm) => s + sm.marks, 0);
      const gradedNames = new Set((r.subject_marks || []).map(sm => sm.subject));
      const max    = (test?.subjects || []).filter(sub => gradedNames.has(sub.name)).reduce((s, sub) => s + sub.max_marks, 0);
      return {
        testId:    test?._id,
        testName:  test?.name || "—",
        date:      test?.date,
        section:   test?.section_id?.name,
        earned,
        max,
        pct:       max > 0 ? Math.round((earned / max) * 1000) / 10 : 0,
        subjects:  (r.subject_marks || []).map(sm => {
          const subInfo = (test?.subjects || []).find(s => s.name === sm.subject);
          const sMax = subInfo?.max_marks || 0;
          return { subject: sm.subject, marks: sm.marks, max: sMax, pct: sMax > 0 ? Math.round((sm.marks / sMax) * 1000) / 10 : 0 };
        }),
      };
    }).filter(r => r.max > 0);

    const avgPct = testResults.length
      ? Math.round(testResults.reduce((s, r) => s + r.pct, 0) / testResults.length * 10) / 10
      : null;

    const a30 = att30[0] || { total: 0, present: 0 };
    const a90 = att90[0] || { total: 0, present: 0 };

    return NextResponse.json({
      student,
      fee: feeRecord,
      payments,
      attendance: {
        last30: { total: a30.total, present: a30.present, pct: a30.total > 0 ? Math.round((a30.present / a30.total) * 1000) / 10 : null },
        last90: { total: a90.total, present: a90.present, pct: a90.total > 0 ? Math.round((a90.present / a90.total) * 1000) / 10 : null },
      },
      results: testResults,
      avgPerformance: avgPct,
    });
  } catch (error) {
    console.error("Student GET error:", error);
    await reportError({ source: "api/students/[id] GET", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const { name, phoneOrEmail, section_id, parent_name, parent_phone, admission_date, due_date } = body;
    const monthlyRate = body.monthly_fee !== undefined ? body.monthly_fee : body.total_fee;
    const hasFreq = body.fee_frequency !== undefined;
    const fee_frequency = normalizeFrequency(body.fee_frequency);

    if (phoneOrEmail) {
      const trimmed = phoneOrEmail.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
      const isPhone = /^\+91\s?\d{10}$/.test(trimmed);
      if (!isEmail && !isPhone) {
        return NextResponse.json({ error: "Please enter a valid email address or a 10-digit phone number with +91 prefix" }, { status: 400 });
      }
    }

    if (parent_phone && parent_phone.trim() !== "+91" && parent_phone.trim() !== "+91 ") {
      if (!/^\+91\s?\d{10}$/.test(parent_phone.trim())) {
        return NextResponse.json({ error: "Parent phone must be exactly 10 digits with +91 prefix (e.g., +91 9876543210)" }, { status: 400 });
      }
    }

    const student = await Student.findById(id);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    if (student.user_id) await User.findByIdAndUpdate(student.user_id, { name, phoneOrEmail });

    student.section_id  = section_id;
    student.parent_name  = parent_name;
    student.parent_phone = parent_phone;

    if (admission_date) student.admission_date = new Date(admission_date);

    // ── Billing plan: update frequency + monthly rate on the student ──
    const prevFreq = normalizeFrequency(student.fee_frequency);
    const freq = hasFreq ? fee_frequency : prevFreq;
    if (hasFreq) student.fee_frequency = freq;
    const hasRate = monthlyRate !== undefined && monthlyRate !== null && monthlyRate !== "";
    if (hasRate) student.monthly_fee = Number(monthlyRate) || 0;
    await student.save();

    // ── Re-price the latest invoice, carefully ──────────────────────────────────
    // Only re-price when we have a positive monthly rate to price from AND the admin
    // actually changed something pricing-relevant (entered a rate, or changed frequency).
    // This protects legacy records that store a direct per-invoice total (monthly_fee = 0):
    // editing an unrelated field (name/section) must never zero out their fee.
    const freqChanged = hasFreq && freq !== prevFreq;
    const canPrice = (student.monthly_fee || 0) > 0;
    const latestFee = await Fee.findOne({ student_id: student._id }).sort({ due_date: -1 });

    if ((hasRate || freqChanged) && canPrice) {
      const amount = invoiceAmount(student.monthly_fee, freq);
      if (latestFee) {
        latestFee.total_amount = amount;
        latestFee.frequency = freq;
        if (due_date) {
          const start = midnightUTC(due_date);
          latestFee.due_date = start;
          latestFee.period_start = start;
          latestFee.period_end = periodEnd(start, freq);
        }
        // pre-save hook recomputes due_amount & status from total_amount - paid_amount
        await latestFee.save();
      } else {
        const start = midnightUTC(due_date || new Date());
        await Fee.create({
          student_id: student._id,
          total_amount: amount,
          paid_amount: 0,
          due_amount: amount,
          due_date: start,
          status: "DUE",
          frequency: freq,
          period_start: start,
          period_end: periodEnd(start, freq),
          institute_id: authUser.institute_id,
        });
      }
    } else if (due_date && latestFee) {
      // Date-only change: move the due date without touching the amount.
      const start = midnightUTC(due_date);
      latestFee.due_date = start;
      latestFee.period_start = start;
      latestFee.period_end = periodEnd(start, freq);
      await latestFee.save();
    }

    await logActivity({
      institute_id: authUser.institute_id,
      action: "UPDATED",
      collection: "Student",
      record_id: student._id,
      record_label: name,
      performed_by: authUser._id,
      performed_by_name: authUser.name || authUser.phoneOrEmail,
    });

    return NextResponse.json(student);
  } catch (error) {
    console.error("Student PUT error:", error);
    await reportError({ source: "api/students/[id] PUT", error });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);
    const { id } = await params;

    const student = await Student.findById(id).lean();
    if (!student) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const user = await User.findById(student.user_id).lean();
    const fees = await Fee.find({ student_id: id }).lean();
    const payments = await Payment.find({ student_id: id }).lean();

    await RecycleBin.create({
      original_collection: "Student",
      original_id: student._id,
      institute_id: authUser.institute_id,
      data: { student, user, fees, payments },
      deleted_by: authUser._id
    });

    const studentName = user?.name || "Unknown";

    await Promise.all([
      User.findByIdAndDelete(student.user_id),
      Fee.deleteMany({ student_id: id }),
      Attendance.deleteMany({ student_id: id }),
      Result.deleteMany({ student_id: id }),
      Payment.deleteMany({ student_id: id }),
      Student.findByIdAndDelete(id),
    ]);

    await logActivity({
      institute_id: authUser.institute_id,
      action: "DELETED",
      collection: "Student",
      record_id: student._id,
      record_label: studentName,
      performed_by: authUser._id,
      performed_by_name: authUser.name || authUser.phoneOrEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
