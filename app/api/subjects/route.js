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

    data.institute_id = authUser.institute_id;

    const existing = await Subject.findOne({
      institute_id: authUser.institute_id,
      name: { $regex: new RegExp(`^${data.name.trim()}$`, "i") },
    });

    if (existing) {
      return NextResponse.json({ error: `Subject "${data.name.trim()}" already exists` }, { status: 409 });
    }

    data.name = data.name.trim();
    const newSubject = await Subject.create(data);
    return NextResponse.json(newSubject, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
