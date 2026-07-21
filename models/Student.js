import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    // Subjects this student is enrolled in within their batch/section.
    // A single student record supports one, some, or all subjects — never duplicated per subject.
    enrolled_subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Subject" }],

    parent_name: { type: String, required: true },
    parent_phone: { type: String, required: true },
    admission_date: { type: Date, default: Date.now },

    // ── Billing plan ──────────────────────────────────────────────────────────
    // Every student is billed on a recurring cycle. `monthly_fee` is the base MONTHLY
    // rate; each invoice charges monthly_fee × months-in-cycle for `fee_frequency`.
    fee_frequency: {
      type: String,
      enum: ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"],
      default: "MONTHLY",
    },
    monthly_fee: { type: Number, default: 0 },

    // ── Billing cycle state ───────────────────────────────────────────────────
    // Fee records are NEVER generated automatically. After an invoice is fully
    // settled the admin explicitly chooses to raise the next one or to stop.
    //   ACTIVE    — cycle running; the next invoice may be raised on demand.
    //   PAUSED    — student on a break / continuation pending; no invoices raised.
    //   COMPLETED — student has left or the plan ended; no invoices raised.
    // PAUSED and COMPLETED both surface the "Create Fee Record" action on the
    // student profile, which resumes the cycle (back to ACTIVE) and raises one invoice.
    fee_cycle_status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "COMPLETED"],
      default: "ACTIVE",
      index: true,
    },
    fee_cycle_updated_at: { type: Date },

    institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
  },
  { timestamps: true }
);

// Compound indexes for common query patterns
StudentSchema.index({ institute_id: 1, section_id: 1 });
StudentSchema.index({ institute_id: 1, user_id: 1 }, { unique: true });

export default mongoose.models.Student || mongoose.model("Student", StudentSchema);
