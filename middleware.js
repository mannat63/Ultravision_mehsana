import { clerkMiddleware } from "@clerk/nextjs/server";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const CLERK_ENABLED = !!process.env.CLERK_SECRET_KEY;

// Parallel auth: always refresh the Supabase session cookie. When Clerk is
// configured (production/preview), run inside clerkMiddleware so Clerk sessions
// keep working too. Locally (no Clerk keys) run Supabase-only.
const handler = CLERK_ENABLED
  ? clerkMiddleware(async (_auth, req) => {
      return await updateSupabaseSession(req);
    })
  : async (req) => {
      return await updateSupabaseSession(req);
    };

export default handler;

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
  // Run on the Node.js runtime: Clerk's shared modules rely on Node APIs
  // (#crypto, #safe-node-apis, …) that aren't available in the Edge runtime.
  runtime: "nodejs",
};
