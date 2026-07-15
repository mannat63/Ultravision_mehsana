/**
 * Analytics collector.
 *
 * Aggregates a live snapshot of the ERP (fees/revenue, enrollment, attendance, academics)
 * so the cron job can push it to Intellogy OS for real-time client-usage monitoring.
 *
 * Data is grouped per institute (each institute = one client tenant) and also rolled up
 * into a totals object, so Intellogy OS can render both an overall view and per-tenant detail.
 */

import Institute from "@/models/Institute";
import Student from "@/models/Student";
import Fee from "@/models/Fee";
import Attendance from "@/models/Attendance";
import Result from "@/models/Result";
import Test from "@/models/Test";
import { CYCLE_MONTHS } from "@/lib/fees";

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

/**
 * Build the full analytics snapshot across all institutes in the connected database.
 * Assumes a DB connection is already open (caller runs dbConnect()).
 */
export async function collectAnalytics() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const institutes = await Institute.find({}, { name: 1 }).lean();

  const perInstitute = [];

  for (const inst of institutes) {
    const instituteId = inst._id;

    const [
      totalStudents,
      newStudents,
      planAgg,
      feeAgg,
      overdueAgg,
      attAgg,
      perfAgg,
    ] = await Promise.all([
      Student.countDocuments({ institute_id: instituteId }),
      Student.countDocuments({ institute_id: instituteId, admission_date: { $gte: thirtyDaysAgo } }),

      // Students grouped by billing frequency
      Student.aggregate([
        { $match: { institute_id: instituteId } },
        { $group: { _id: "$fee_frequency", count: { $sum: 1 } } },
      ]),

      // Revenue: total billed / collected across all invoices
      Fee.aggregate([
        { $match: { institute_id: instituteId } },
        {
          $group: {
            _id: null,
            billed: { $sum: "$total_amount" },
            collected: { $sum: "$paid_amount" },
            outstanding: { $sum: "$due_amount" },
            invoices: { $sum: 1 },
          },
        },
      ]),

      // Overdue: unpaid invoices past their due date
      Fee.aggregate([
        {
          $match: {
            institute_id: instituteId,
            status: { $ne: "PAID" },
            due_date: { $lt: today },
          },
        },
        {
          $group: {
            _id: null,
            overdueInvoices: { $sum: 1 },
            overdueAmount: { $sum: "$due_amount" },
            students: { $addToSet: "$student_id" },
          },
        },
      ]),

      // Attendance last 30 days
      Attendance.aggregate([
        {
          $match: {
            institute_id: instituteId,
            date: { $gte: thirtyDaysAgo },
            status: { $ne: "NOT_MARKED" },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            present: { $sum: { $cond: [{ $eq: ["$status", "PRESENT"] }, 1, 0] } },
          },
        },
      ]),

      // Academic performance across all results
      Result.aggregate([
        { $match: { institute_id: instituteId } },
        { $lookup: { from: "tests", localField: "test_id", foreignField: "_id", as: "test" } },
        { $unwind: "$test" },
        {
          $project: {
            student_id: 1,
            earned: { $sum: "$subject_marks.marks" },
            total: { $sum: "$test.subjects.max_marks" },
          },
        },
        {
          $group: {
            _id: "$student_id",
            avgPct: {
              $avg: {
                $cond: [
                  { $gt: ["$total", 0] },
                  { $multiply: [{ $divide: ["$earned", "$total"] }, 100] },
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const fees = feeAgg[0] || { billed: 0, collected: 0, outstanding: 0, invoices: 0 };
    const overdue = overdueAgg[0] || { overdueInvoices: 0, overdueAmount: 0, students: [] };
    const att = attAgg[0] || { total: 0, present: 0 };

    const byFrequency = { MONTHLY: 0, QUARTERLY: 0, HALF_YEARLY: 0, YEARLY: 0 };
    for (const p of planAgg) {
      const key = p._id && CYCLE_MONTHS[p._id] ? p._id : "MONTHLY";
      byFrequency[key] += p.count;
    }

    const perfScores = perfAgg.map((r) => r.avgPct);
    const avgPerformance = perfScores.length
      ? Math.round((perfScores.reduce((a, b) => a + b, 0) / perfScores.length) * 10) / 10
      : 0;
    const atRiskAcademic = perfScores.filter((s) => s < 50).length;

    perInstitute.push({
      institute_id: String(instituteId),
      institute_name: inst.name || "—",
      enrollment: {
        total_students: totalStudents,
        new_last_30d: newStudents,
        by_frequency: byFrequency,
      },
      fees: {
        total_billed: fees.billed,
        total_collected: fees.collected,
        outstanding: fees.outstanding,
        invoices: fees.invoices,
        overdue_invoices: overdue.overdueInvoices,
        overdue_amount: overdue.overdueAmount,
        overdue_students: (overdue.students || []).length,
        collection_rate_pct: pct(fees.collected, fees.billed),
      },
      attendance: {
        marked_last_30d: att.total,
        present_last_30d: att.present,
        attendance_rate_pct: pct(att.present, att.total),
      },
      academics: {
        avg_performance_pct: avgPerformance,
        at_risk_students: atRiskAcademic,
      },
    });
  }

  // Roll up totals across every institute.
  const totals = perInstitute.reduce(
    (acc, i) => {
      acc.institutes += 1;
      acc.total_students += i.enrollment.total_students;
      acc.total_collected += i.fees.total_collected;
      acc.total_billed += i.fees.total_billed;
      acc.outstanding += i.fees.outstanding;
      acc.overdue_invoices += i.fees.overdue_invoices;
      return acc;
    },
    { institutes: 0, total_students: 0, total_collected: 0, total_billed: 0, outstanding: 0, overdue_invoices: 0 }
  );
  totals.collection_rate_pct = pct(totals.total_collected, totals.total_billed);

  return {
    generated_at: now.toISOString(),
    totals,
    institutes: perInstitute,
  };
}
