import mongoose from "mongoose";

const HomeworkSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    subject: { type: String, required: true },
    // Optional link to the Subject document, used to scope homework to enrolled students.
    subject_id: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
    due_date: { type: Date, required: true },
    section_id: { type: mongoose.Schema.Types.ObjectId, ref: "Section", required: true },
    teacher_id: { type: mongoose.Schema.Types.ObjectId, ref: "Teacher", required: true },
    institute_id: { type: mongoose.Schema.Types.ObjectId, ref: "Institute", required: true },
    drive_link: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.models.Homework || mongoose.model("Homework", HomeworkSchema);
