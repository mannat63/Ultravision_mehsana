import { NextResponse } from "next/server";
import { getCurrentIdentity } from "@/lib/auth";
import dbConnect from "@/lib/db/mongodb";
import User from "@/models/User";
import Institute from "@/models/Institute";

// POST /api/onboard
// First-time setup: creates an Institute + Admin user linked to the current
// auth session (Supabase or Clerk). This should only be called once per institute.
export async function POST(req) {
  try {
    await dbConnect();

    const identity = await getCurrentIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized — please sign in first" }, { status: 401 });
    }
    const idField = identity.provider === "supabase" ? "supabase_id" : "clerk_id";

    // Check if this auth user already has a profile (by provider id or email)
    const existingUser = await User.findOne({
      $or: [
        { [idField]: identity.providerId },
        ...(identity.email
          ? [{ phoneOrEmail: new RegExp(`^${identity.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }]
          : []),
      ],
    });
    if (existingUser) {
      return NextResponse.json({
        message: "You are already onboarded!",
        user: existingUser,
      });
    }

    const body = await req.json();
    const {
      institute_name,
      owner_name,
      phone,
      admin_email,
    } = body;

    if (!institute_name || !owner_name || !phone) {
      return NextResponse.json(
        { error: "institute_name, owner_name, and phone are required" },
        { status: 400 }
      );
    }

    // 1. Create the Institute
    const institute = await Institute.create({
      name: institute_name,
      owner_name,
      phone,
    });

    // 2. Create the Admin user linked to the current auth session
    const adminUser = await User.create({
      name: owner_name,
      phoneOrEmail: admin_email || phone,
      role: "ADMIN",
      institute_id: institute._id,
      [idField]: identity.providerId,
    });

    return NextResponse.json(
      {
        message: "Onboarding complete! You are now an ADMIN.",
        institute,
        user: adminUser,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/onboard — check onboarding status
export async function GET() {
  try {
    await dbConnect();

    const identity = await getCurrentIdentity();
    if (!identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const idField = identity.provider === "supabase" ? "supabase_id" : "clerk_id";

    const user = await User.findOne({
      $or: [
        { [idField]: identity.providerId },
        ...(identity.email
          ? [{ phoneOrEmail: new RegExp(`^${identity.email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }]
          : []),
      ],
    });
    if (!user) {
      return NextResponse.json({ onboarded: false, message: "Not onboarded yet. POST to /api/onboard to set up." });
    }

    const institute = await Institute.findById(user.institute_id);
    return NextResponse.json({ onboarded: true, user, institute });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
