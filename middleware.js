import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
  // Run on the Node.js runtime: Clerk's shared modules rely on Node APIs
  // (#crypto, #safe-node-apis, …) that aren't available in the Edge runtime.
  runtime: "nodejs",
};
