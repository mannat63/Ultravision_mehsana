/**
 * Report a server-side error to Intellogy OS in real time.
 *
 * Every API route catches its errors and returns a 500 JSON body, which means those failures
 * never reach the health/analytics cron — Intellogy would keep showing "healthy" while the app
 * is actually throwing. Call this from a route's catch block (and it's also wired into the global
 * `onRequestError` hook in instrumentation.js) so failures surface on the Intellogy dashboard as
 * they happen.
 *
 * Fire-and-forget friendly: never throws, best-effort, short timeout so it can't slow the response.
 *
 * @param {Object} opts
 * @param {string} opts.source   - Where it failed, e.g. "api/students POST"
 * @param {Error|string} opts.error
 * @param {Object} [opts.context] - Extra fields (route, method, ids…)
 */
export async function reportError({ source, error, context = {} }) {
  try {
    const base = process.env.INTELLOGY_OS_URL || "https://intellogy-os.vercel.app";
    const token = process.env.INTELLOGY_HEALTH_TOKEN;
    if (!token) return; // not configured — skip silently

    const message =
      (error && (error.message || String(error))) || "Unknown error";

    // Auth failures are expected client conditions (logged-out / expired session),
    // not application faults — don't flood Intellogy with them.
    if (/unauthorized|forbidden|not authenticated/i.test(message)) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    await fetch(`${base}/api/health/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-token": token,
      },
      body: JSON.stringify({
        // Intellogy ingest only accepts healthy | degraded | down.
        // A caught application error => app is up but degraded.
        status: "degraded",
        source: "vercel-erp",
        environment: process.env.NODE_ENV || "development",
        message: `[${source}] ${message}`,
        // Top-level error_count matches the schema Intellogy OS renders.
        error_count: 1,
        metrics: { error_count: 1 },
        error: {
          source,
          message,
          name: error?.name,
          stack: error?.stack?.split("\n").slice(0, 5).join("\n"),
          ...context,
        },
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    }).catch(() => {});

    clearTimeout(timer);
  } catch {
    // Never let error reporting cause a second failure.
  }
}
