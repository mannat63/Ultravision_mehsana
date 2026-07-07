import { NextResponse } from "next/server";
import dbConnect from "@/lib/db/mongodb";
import { getAuthUser, requireRole } from "@/lib/auth";
import Subject from "@/models/Subject";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    await dbConnect();
    const authUser = await getAuthUser();
    if (!authUser || !authUser.institute_id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const subjects = await Subject.find({ institute_id: authUser.institute_id });
    return NextResponse.json(subjects);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const authUser = await requireRole(["ADMIN"]);
    const data = await req.json();

    if (!data.name || !data.name.trim()) {
      return NextResponse.json({ error: "Subject name is required" }, { status: 400 });
    }

    const cleanName = data.name.trim();

    // Escape regex metacharacters so names like "C++" match literally, not as a pattern.
    const escaped = cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const existing = await Subject.findOne({
      institute_id: authUser.institute_id,
      name: { $regex: new RegExp(`^${escaped}$`, "i") },
    });

    if (existing) {
      return NextResponse.json({ error: `Subject "${cleanName}" already exists` }, { status: 409 });
    }

    try {
      const newSubject = await Subject.create({ name: cleanName, institute_id: authUser.institute_id });
      return NextResponse.json(newSubject, { status: 201 });
    } catch (err) {
      // Unique-index backstop (handles race where two requests pass the check together)
      if (err.code === 11000) {
        return NextResponse.json({ error: `Subject "${cleanName}" already exists` }, { status: 409 });
      }
      throw err;
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
