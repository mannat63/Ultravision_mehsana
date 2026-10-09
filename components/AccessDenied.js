"use client";

import { signOutEverywhere } from "@/lib/supabase/signOut";
import { ShieldAlert, LogOut } from "lucide-react";

/**
 * Shown when a signed-in account isn't linked to any student/teacher/admin
 * record (e.g. a student signed in with a Google email the academy never added).
 * Gives a clear explanation and — critically — a working Sign-out button so the
 * user can switch accounts instead of being stuck on a blank error screen.
 */
export default function AccessDenied({ message }) {
  const friendly =
    message && /invited|access denied/i.test(message)
      ? "This account isn't linked to UltraVision Academy yet."
      : "We couldn't load your account.";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-5">
          <ShieldAlert size={26} className="text-amber-500" />
        </div>

        <h1 className="text-lg font-bold text-gray-900">Account not linked</h1>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          {friendly} Please sign in with the email your academy registered for you,
          or ask the academy office to add your email.
        </p>

        <div className="mt-6 flex flex-col gap-2">
          <button onClick={signOutEverywhere} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors">
            <LogOut size={15} /> Sign out & try another account
          </button>
          <a
            href="https://wa.me/919509728788?text=I%20need%20help%20logging%20into%20UltraVision%20Academy"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-gray-600 text-sm font-semibold rounded-xl border border-gray-100 hover:bg-gray-100 transition-colors"
          >
            Contact the academy
          </a>
        </div>
      </div>
    </div>
  );
}
