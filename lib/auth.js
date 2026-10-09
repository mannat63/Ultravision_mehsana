import { auth, currentUser } from "@clerk/nextjs/server";
import dbConnect from "./db/mongodb";
import { createSupabaseServerClient, isSupabaseConfigured } from "./supabase/server";
import User from "@/models/User";
import Institute from "@/models/Institute";
import { ROLE_MAP, DEFAULT_ROLE, INSTITUTE_NAME } from "@/config/appConfig";
import { cache } from "react";

// ============================================================
// AUTO-PROVISIONING AUTH — dual provider (Supabase + Clerk)
//
// During the Clerk -> Supabase migration both providers run in
// parallel. A request is authenticated if EITHER provider has a
// valid session. The MongoDB User is always resolved by EMAIL,
// so a user keeps the same record (roles, institute, business
// data) regardless of which provider signed them in.
//
// clerk_id and supabase_id are both kept on the User as session
// bindings; the one for the active provider is linked on first
// login. This is additive and idempotent — safe to re-run.
// TODO: Replace hardcoded role logic with DB-based roles
// ============================================================

const CLERK_ENABLED = !!process.env.CLERK_SECRET_KEY;

// Resolve (and lazily link) the MongoDB user for a provider identity.
async function resolveUserForIdentity({ provider, providerId, email, name }) {
  const idField = provider === "supabase" ? "supabase_id" : "clerk_id";

  // FAST PATH: already linked by provider id.
  let user = await User.findOne({ [idField]: providerId }).exec();
  if (user) return user;

  // EMAIL PATH: link this provider id to the existing record by email.
  if (email) {
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const userByEmail = await User.findOne({
      phoneOrEmail: new RegExp(`^${escapedEmail}$`, "i"),
    })
      .sort({ updatedAt: -1 })
      .exec();

    if (userByEmail) {
      if (userByEmail[idField] !== providerId) {
        // Ensure the provider id is unique: detach it from any other record.
        await User.updateMany({ [idField]: providerId }, { $unset: { [idField]: 1 } });
        userByEmail[idField] = providerId;
        if (!userByEmail.name && name) userByEmail.name = name;
        await userByEmail.save();
      }
      return userByEmail;
    }
  }

  // AUTO-PROVISION: admins get an institute; everyone else must be invited.
  const resolvedName = name || email;
  const role = ROLE_MAP[(email || "").toLowerCase()] || DEFAULT_ROLE;

  let institute;
  if (role === "ADMIN") {
    const instituteName = INSTITUTE_NAME || `School of ${email}`;
    institute = await Institute.findOne({ name: instituteName });
    if (!institute) {
      institute = await Institute.create({
        name: instituteName,
        owner_name: resolvedName,
        email,
        phone: "+910000000000",
      });
    }
  } else {
    throw new Error(
      "Access Denied: You must be invited by an Administrator to join a school."
    );
  }

  return await User.create({
    name: resolvedName,
    phoneOrEmail: email,
    role,
    institute_id: institute._id,
    [idField]: providerId,
  });
}

// Returns the provider identity for the current session, or null.
// Supabase is checked first; Clerk is the fallback during migration.
export async function getCurrentIdentity() {
  // --- Supabase ---
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();
      if (sbUser) {
        return {
          provider: "supabase",
          providerId: sbUser.id,
          email: sbUser.email || "",
          name:
            sbUser.user_metadata?.full_name ||
            sbUser.user_metadata?.name ||
            "",
        };
      }
    } catch {
      // fall through to Clerk
    }
  }

  // --- Clerk ---
  if (CLERK_ENABLED) {
    try {
      const { userId } = await auth();
      if (userId) {
        const clerkUser = await currentUser();
        const email = clerkUser?.emailAddresses?.[0]?.emailAddress || "";
        const name =
          `${clerkUser?.firstName || ""} ${clerkUser?.lastName || ""}`.trim() ||
          email;
        return { provider: "clerk", providerId: userId, email, name };
      }
    } catch {
      // no clerk session
    }
  }

  return null;
}

// Lightweight gate: is there any valid session? (no currentUser() network call)
export async function hasSession() {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user: sbUser },
      } = await supabase.auth.getUser();
      if (sbUser) return true;
    } catch {}
  }
  if (CLERK_ENABLED) {
    try {
      const { userId } = await auth();
      if (userId) return true;
    } catch {}
  }
  return false;
}

export const getAuthUser = cache(async function getAuthUser() {
  await dbConnect();

  const identity = await getCurrentIdentity();
  if (!identity) {
    throw new Error("Unauthorized");
  }

  return await resolveUserForIdentity(identity);
});

export async function requireRole(allowedRoles) {
  const user = await getAuthUser();
  if (!allowedRoles.includes(user.role)) {
    throw new Error("Forbidden: Invalid Role");
  }
  return user;
}
