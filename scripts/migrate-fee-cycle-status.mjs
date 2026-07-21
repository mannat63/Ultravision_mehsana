// One-time migration: sets fee_cycle_status="ACTIVE" on students missing the field.
// Run with: node scripts/migrate-fee-cycle-status.mjs
//
// Optional but recommended. Mongoose applies the schema default when it hydrates a
// document, so the app already behaves correctly without this. Backfilling makes the
// value explicit in the database and lets the { fee_cycle_status } index actually be used.

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set (add it to .env.local)");

await mongoose.connect(MONGODB_URI);

const Student = mongoose.model("Student", new mongoose.Schema({
  institute_id: mongoose.Schema.Types.ObjectId,
  fee_cycle_status: String,
}, { strict: false }));

const res = await Student.updateMany(
  { $or: [{ fee_cycle_status: { $exists: false } }, { fee_cycle_status: null }] },
  { $set: { fee_cycle_status: "ACTIVE" } }
);

console.log(`✅ Backfilled fee_cycle_status="ACTIVE" on ${res.modifiedCount} students`);

await mongoose.disconnect();
