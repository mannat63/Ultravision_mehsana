/**
 * Fee frequency / billing-cycle helpers.
 *
 * The whole ERP revolves around a per-student billing plan:
 *   - fee_frequency : how often an invoice is raised (Monthly / Quarterly / Half-Yearly / Yearly)
 *   - monthly_fee   : the base MONTHLY rate the admin enters
 *
 * Each invoice (Fee document) charges `monthly_fee × months-in-cycle`, and the next
 * invoice's due date advances by that same number of calendar months.
 *
 * This module is the single source of truth for that math. Both the fees API and the
 * defaulters API use `generateRecurringFees` so behaviour can never drift between them.
 */

export const FEE_FREQUENCIES = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];

// Months per billing cycle, keyed by frequency.
export const CYCLE_MONTHS = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

// Human labels for UI.
export const FREQUENCY_LABELS = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  HALF_YEARLY: "Half-Yearly",
  YEARLY: "Yearly",
};

// Word used for a single billing period, per frequency (for "Month 1 / Quarter 1" style labels).
export const PERIOD_NOUN = {
  MONTHLY: "Month",
  QUARTERLY: "Quarter",
  HALF_YEARLY: "Half",
  YEARLY: "Year",
};

/** Normalise / validate a frequency, falling back to MONTHLY. */
export function normalizeFrequency(freq) {
  return FEE_FREQUENCIES.includes(freq) ? freq : "MONTHLY";
}

/** Number of months in one billing cycle for the given frequency. */
export function cycleMonths(freq) {
  return CYCLE_MONTHS[normalizeFrequency(freq)];
}

/**
 * Add `n` calendar months to a date (UTC), clamping to end-of-month so that
 * e.g. Jan 31 + 1 month = Feb 28/29 rather than rolling into March.
 * Returns a new Date at UTC midnight.
 */
export function addMonths(date, n) {
  const d = new Date(date);
  const day = d.getUTCDate();
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1, 0, 0, 0, 0));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

/** UTC midnight copy of a date. */
export function midnightUTC(date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Per-invoice charge for a plan: monthly rate × months-in-cycle.
 * Falls back to `fallback` (e.g. the previous invoice amount) when no monthly rate is set,
 * so legacy records that only stored a per-invoice total keep working.
 */
export function invoiceAmount(monthlyFee, freq, fallback = 0) {
  const rate = Number(monthlyFee) || 0;
  if (rate > 0) return rate * cycleMonths(freq);
  return Number(fallback) || 0;
}

/**
 * Given the START date of a billing period and its frequency, return the period's
 * end date (last day covered before the next cycle begins).
 */
export function periodEnd(startDate, freq) {
  const next = addMonths(startDate, cycleMonths(freq));
  // one day before the next cycle starts
  return new Date(next.getTime() - 24 * 60 * 60 * 1000);
}

/**
 * Auto-generate any missing recurring invoices for every student in an institute,
 * driven by each student's billing plan.
 *
 * For each student that already has at least one fee, we look at their latest invoice and
 * roll forward — creating the next invoice whenever the current one is due/overdue or paid —
 * spacing due dates by the student's cycle length and charging monthly_fee × cycle.
 *
 * Idempotent: relies on the unique { student_id, institute_id, due_date } index to avoid
 * duplicates under concurrency.
 *
 * @param {ObjectId|string} instituteId
 * @param {{ Fee: import('mongoose').Model, Student: import('mongoose').Model }} models
 * @returns {Promise<number>} number of invoices created
 */
export async function generateRecurringFees(instituteId, { Fee, Student }) {
  const latestFees = await Fee.aggregate([
    { $match: { institute_id: instituteId } },
    { $sort: { due_date: -1 } },
    { $group: { _id: "$student_id", latestFee: { $first: "$$ROOT" } } },
  ]);

  if (!latestFees.length) return 0;

  // Pull the billing plan for every student we might extend.
  const studentIds = latestFees.map((f) => f._id);
  const plans = await Student.find(
    { _id: { $in: studentIds } },
    { fee_frequency: 1, monthly_fee: 1 }
  ).lean();
  const planMap = Object.fromEntries(
    plans.map((s) => [String(s._id), s])
  );

  const today = midnightUTC(new Date());

  // Build every missing invoice in memory first (no per-cycle DB round-trips), then bulk insert.
  const docs = [];
  for (const f of latestFees) {
    const plan = planMap[String(f._id)] || {};
    const freq = normalizeFrequency(plan.fee_frequency || f.latestFee.frequency);
    const step = cycleMonths(freq);
    const amount = invoiceAmount(plan.monthly_fee, freq, f.latestFee.total_amount);

    let cursor = midnightUTC(f.latestFee.due_date);
    let isLatestPaid = f.latestFee.status === "PAID";
    let iter = 0;

    // Cap iterations so a very old plan can't spin forever; 12 cycles is >=1 year for any frequency.
    // We generate strictly forward from the latest invoice, so these due dates are all new.
    while ((today >= cursor || isLatestPaid) && iter < 12) {
      cursor = addMonths(cursor, step);
      const start = new Date(cursor);
      docs.push({
        student_id: f._id,
        total_amount: amount,
        paid_amount: 0,
        due_amount: amount,
        due_date: new Date(cursor),
        status: "DUE",
        frequency: freq,
        period_start: start,
        period_end: periodEnd(start, freq),
        institute_id: instituteId,
      });
      isLatestPaid = false;
      iter++;
    }
  }

  if (!docs.length) return 0;

  // Single bulk insert. `ordered: false` lets the unique { student_id, institute_id, due_date }
  // index silently reject any duplicate from concurrent generation without aborting the rest.
  try {
    const res = await Fee.insertMany(docs, { ordered: false, rawResult: true });
    return res?.insertedCount ?? docs.length;
  } catch (e) {
    // Duplicate-key (11000) from concurrent runs is expected — swallow it; rethrow anything else.
    if (e?.code === 11000 || e?.writeErrors || e?.result) {
      return e?.result?.insertedCount ?? e?.insertedDocs?.length ?? 0;
    }
    throw e;
  }
}
