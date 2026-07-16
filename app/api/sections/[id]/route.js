import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import { requireRole } from "@/lib/auth";
import Section from "@/models/Section";
import RecycleBin from "@/models/RecycleBin";

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);
    const { id } = await params;
    const body = await req.json();
    const { name, class_id, capacity } = body;

    const existing = await Section.findOne({ _id: id, institute_id: authUser.institute_id });
    if (!existing) return NextResponse.json({ error: "Section not found" }, { status: 404 });

    const updateData = {};

    // Store the name exactly as typed — no forced "Section " prefix.
    if (name !== undefined) {
      const sectionName = String(name).trim();
      if (!sectionName) {
        return NextResponse.json({ error: "Section name cannot be empty" }, { status: 400 });
      }
      // Case-insensitive duplicate check against *other* sections in the same class.
      const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const clash = await Section.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${escaped}$`, "i") },
        class_id: class_id || existing.class_id,
        institute_id: authUser.institute_id,
      });
      if (clash) {
        return NextResponse.json({ error: "A section with this name already exists in this class." }, { status: 400 });
      }
      updateData.name = sectionName;
    }

    // Only touch class_id when the caller actually sent one — the edit form sends
    // just { name, capacity }, and blindly writing `undefined` could clear the class link.
    if (class_id) updateData.class_id = class_id;

    if (capacity !== undefined && capacity !== null && capacity !== "") {
      const seats = parseInt(capacity, 10);
      if (!Number.isInteger(seats) || seats < 1) {
        return NextResponse.json({ error: "Seats must be a whole number of at least 1" }, { status: 400 });
      }
      updateData.capacity = seats;
    }

    const section = await Section.findOneAndUpdate(
      { _id: id, institute_id: authUser.institute_id },
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate("class_id", "name");

    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    return NextResponse.json(section);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);
    const { id } = await params;
    
    // Check for relational integrity
    const { default: Student } = await import("@/models/Student");
    const studentCount = await Student.countDocuments({ section_id: id, institute_id: authUser.institute_id });
    if (studentCount > 0) {
      return NextResponse.json({ error: "Cannot delete section with active students" }, { status: 400 });
    }

    const section = await Section.findOne({ _id: id, institute_id: authUser.institute_id });
    if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });
    
    await RecycleBin.create({
      original_collection: "Section",
      original_id: section._id,
      institute_id: section.institute_id,
      data: section.toObject(),
      deleted_by: authUser._id
    });

    await Section.deleteOne({ _id: id });
    
    // Cleanup related data like Attendance and Tests (Results cascade deleted if we delete Tests)
    const { default: Attendance } = await import("@/models/Attendance");
    const { default: Test } = await import("@/models/Test");
    const { default: Result } = await import("@/models/Result");

    await Attendance.deleteMany({ section_id: id });
    const tests = await Test.find({ section_id: id }, { _id: 1 });
    const testIds = tests.map(t => t._id);
    await Result.deleteMany({ test_id: { $in: testIds } });
    await Test.deleteMany({ section_id: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
