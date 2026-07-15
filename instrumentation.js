/**
 * Next.js instrumentation hook.
 *
 * `onRequestError` fires for any UNCAUGHT server-side error (route handlers, RSC render, etc.).
 * We forward it to Intellogy OS so unexpected crashes appear on the health dashboard in real time.
 * (Errors that a route catches and turns into a 500 JSON response are reported explicitly via
 * lib/reportError.js from inside those catch blocks.)
 */
export async function onRequestError(err, request, context) {
  try {
    const { reportError } = await import("@/lib/reportError");
    await reportError({
      source: `uncaught ${request?.method || ""} ${request?.path || request?.url || ""}`.trim(),
      error: err,
      context: {
        routerKind: context?.routerKind,
        routePath: context?.routePath,
        renderSource: context?.renderSource,
      },
    });
  } catch {
    // swallow — instrumentation must never throw
  }
}
