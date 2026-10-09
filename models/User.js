import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phoneOrEmail: { type: String, required: true, index: true },
    phone: { type: String },
    role: { type: String, enum: ["ADMIN", "TEACHER", "STUDENT"], required: true, index: true },
    institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    clerk_id: { type: String, unique: true, sparse: true, index: true },
    // Supabase Auth user id. Kept alongside clerk_id during the parallel-auth
    // migration so either provider can resolve the same MongoDB user by email.
    supabase_id: { type: String, unique: true, sparse: true, index: true }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
