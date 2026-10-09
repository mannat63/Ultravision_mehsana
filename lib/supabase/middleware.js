import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refreshes the Supabase auth session cookie on each request.
// Returns a NextResponse with any refreshed auth cookies attached.
export async function updateSupabaseSession(request) {
  let response = NextResponse.next({ request });

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the token and triggers cookie refresh.
  try {
    await supabase.auth.getUser();
  } catch {
    // Network/config hiccup — don't block the request.
  }

  return response;
}
