import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Server-side Supabase sign-out. (Client-side signOutEverywhere also clears Clerk.)
export async function POST(request) {
  const { origin } = new URL(request.url);
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {}
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
