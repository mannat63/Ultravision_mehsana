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
 * This module is the single source of truth for that math.
 *
 * IMPORTANT — invoices are NEVER generated automatically. Settling a fee does not
 * create the next one, and no read path (fees list, defaulters list) creates records
 * as a side effect. The next invoice is raised only through an explicit admin action
 * via `createNextFeeRecord`, which is what the post-settlement dialog and the
 * "Create Fee Record" button on the student profile both call.
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

/** Billing-cycle states a student can be in. See models/Student.js. */
export const FEE_CYCLE_STATUSES = ["ACTIVE", "PAUSED", "COMPLETED"];

/**
 * A rejected fee-cycle operation, carrying the HTTP status + machine code the API
 * should respond with. Lets route handlers translate failures without string matching.
 */
export class FeeCycleError extends Error {
  constructor(message, { status = 400, code = "FEE_CYCLE_ERROR" } = {}) {
    super(message);
    this.name = "FeeCycleError";
    this.status = status;
    this.code = code;
  }
}

/** Due date of the invoice that follows `latestFee` under `freq`. */
export function nextDueDate(latestFee, freq) {
  return addMonths(midnightUTC(latestFee.due_date), cycleMonths(freq));
}

/**
 * Explicitly raise the NEXT invoice for one student, from their billing plan.
 *
 * This is the ONLY path that creates a recurring invoice. It is called by the
 * post-settlement dialog ("Create Next Fee Record") and by the "Create Fee Record"
 * button on the student profile — never as a side effect of payment or of a read.
 *
 * Integrity rules enforced here:
 *   1. The student must belong to `instituteId`.
 *   2. No unsettled invoice may exist — we never stack a new invoice on an unpaid one.
 *   3. No invoice may already cover the next period (checked, and backstopped by the
 *      unique { student_id, institute_id, due_date } index for concurrent callers).
 *   4. The plan must price to a positive amount.
 *
 * Raising an invoice resumes a paused/completed cycle (ACTIVE), which is what makes
 * the profile button double as "resume billing".
 *
 * @returns {Promise<object>} the created Fee document
 */
export async function createNextFeeRecord({
  studentId,
  instituteId,
  models: { Fee, Student },
  session = null,
  resumeCycle = true,
}) {
  const opts = session ? { session } : {};
  const withSession = (query) => (session ? query.session(session) : query);

  const student = await withSession(
    Student.findOne({ _id: studentId, institute_id: instituteId })
  );
  if (!student) {
    throw new FeeCycleError("Student not found.", { status: 404, code: "STUDENT_NOT_FOUND" });
  }

  const freq = normalizeFrequency(student.fee_frequency);

  // Rule 2 — an outstanding invoice must be settled first.
  const outstanding = await withSession(
    Fee.findOne({ student_id: studentId, institute_id: instituteId, status: { $ne: "PAID" } })
      .sort({ due_date: 1 })
  );
  if (outstanding) {
    throw new FeeCycleError(
      "This student still has an unsettled fee record. Settle it before raising the next one.",
      { status: 409, code: "OUTSTANDING_FEE_EXISTS" }
    );
  }

  const latest = await withSession(
    Fee.findOne({ student_id: studentId, institute_id: instituteId }).sort({ due_date: -1 })
  );

  // First-ever invoice starts today; otherwise continue the cycle from the last one.
  const start = latest ? nextDueDate(latest, freq) : midnightUTC(new Date());
  const amount = invoiceAmount(student.monthly_fee, freq, latest?.total_amount);

  // Rule 4 — never raise a zero-value invoice.
  if (!(amount > 0)) {
    throw new FeeCycleError(
      "This student has no fee amount configured. Set a monthly fee before raising an invoice.",
      { status: 400, code: "NO_FEE_AMOUNT" }
    );
  }

  // Rule 3 — pre-check for a record already covering this period.
  const duplicate = await withSession(
    Fee.findOne({ student_id: studentId, institute_id: instituteId, due_date: start })
  );
  if (duplicate) {
    throw new FeeCycleError("A fee record for the next period already exists.", {
      status: 409,
      code: "DUPLICATE_FEE",
    });
  }

  let created;
  try {
    const [doc] = await Fee.create(
      [
        {
          student_id: studentId,
          total_amount: amount,
          paid_amount: 0,
          due_amount: amount,
          due_date: start,
          status: "DUE",
          frequency: freq,
          period_start: start,
          period_end: periodEnd(start, freq),
          institute_id: instituteId,
        },
      ],
      opts
    );
    created = doc;
  } catch (e) {
    // Lost a race against a concurrent caller — the unique index is the source of truth.
    if (e?.code === 11000) {
      throw new FeeCycleError("A fee record for the next period already exists.", {
        status: 409,
        code: "DUPLICATE_FEE",
      });
    }
    throw e;
  }

  // Raising an invoice resumes billing.
  if (resumeCycle && student.fee_cycle_status !== "ACTIVE") {
    student.fee_cycle_status = "ACTIVE";
    student.fee_cycle_updated_at = new Date();
    await student.save(opts);
  }

  return created;
}

/**
 * Set a student's billing-cycle state (pause / end / resume) without touching invoices.
 * Used by "Pause/End for Now" in the post-settlement dialog.
 */
export async function setFeeCycleStatus({
  studentId,
  instituteId,
  status,
  models: { Student },
  session = null,
}) {
  if (!FEE_CYCLE_STATUSES.includes(status)) {
    throw new FeeCycleError(`Invalid fee cycle status "${status}".`, {
      status: 400,
      code: "INVALID_STATUS",
    });
  }

  const query = Student.findOneAndUpdate(
    { _id: studentId, institute_id: instituteId },
    { $set: { fee_cycle_status: status, fee_cycle_updated_at: new Date() } },
    { new: true }
  );

  const student = await (session ? query.session(session) : query);
  if (!student) {
    throw new FeeCycleError("Student not found.", { status: 404, code: "STUDENT_NOT_FOUND" });
  }
  return student;
}
