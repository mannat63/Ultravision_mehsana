import mongoose from "mongoose";

const SubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
  },
  { timestamps: true }
);

// Backstop against duplicate subjects within an institute. Case-insensitive via
// collation so "Physics" and "physics" are treated as the same name.
SubjectSchema.index(
  { institute_id: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

export default mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
