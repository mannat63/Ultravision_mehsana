"use client";

import { createSupabaseBrowserClient, supabaseEnabled } from "./client";

// Signs the user out of BOTH providers (parallel auth phase), then returns home.
export async function signOutEverywhere() {
  if (supabaseEnabled) {
    try {
      await createSupabaseBrowserClient().auth.signOut();
    } catch {}
  }
  try {
    if (typeof window !== "undefined" && window.Clerk?.signOut) {
      await window.Clerk.signOut();
    }
  } catch {}
  if (typeof window !== "undefined") window.location.href = "/";
}
