// One-time migration script: sets capacity=30 on all sections missing the field
// Run with: node scripts/migrate-section-capacity.mjs

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) throw new Error("MONGODB_URI is not set (add it to .env.local)");

await mongoose.connect(MONGODB_URI);

const Section = mongoose.model("Section", new mongoose.Schema({
  name: String,
  class_id: mongoose.Schema.Types.ObjectId,
  institute_id: mongoose.Schema.Types.ObjectId,
  capacity: Number,
}, { strict: false }));

// Fix sections missing the capacity field entirely
const r1 = await Section.updateMany(
  { capacity: { $exists: false } },
  { $set: { capacity: 30 } }
);

// Fix sections where capacity is null or 0
const r2 = await Section.updateMany(
  { $or: [{ capacity: null }, { capacity: 0 }] },
  { $set: { capacity: 30 } }
);

console.log(`✅ Migrated ${r1.modifiedCount} sections (missing field)`);
console.log(`✅ Migrated ${r2.modifiedCount} sections (null/zero)`);

await mongoose.disconnect();
