import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Google OAuth callback. Exchanges the auth code for a session (cookies),
// then forwards to the dashboard. No application data is written here.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth failed or missing code — back to login with a flag.
  return NextResponse.redirect(`${origin}/?auth_error=1`);
}
