"use client";

import { useEffect } from "react";

/**
 * Auto-triggers the analytics/health push to Intellogy OS.
 *
 * Why this exists: `/api/cron/health` collects analytics and pushes them to Intellogy OS,
 * but *something* has to call it. In production that's an external cron (Vercel Cron / cron-job.org)
 * hitting the deployed URL with the CRON_SECRET. On **localhost** there is no such scheduler, so this
 * component acts as the fallback: while an admin has the ERP open locally, it pings the endpoint on
 * mount and every 60s (only when the tab is visible), keeping Intellogy's dashboard live in real time.
 *
 * On a deployed (non-localhost) host it stays dormant and lets the real cron do the work — so we never
 * spam 401s against the secret-protected production endpoint.
 */
const PING_INTERVAL_MS = 60 * 1000; // 60s → near-real-time on the Intellogy dashboard

function isLocalhost() {
  if (typeof window === "undefined") return false;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local");
}

export default function AnalyticsHeartbeat() {
  useEffect(() => {
    if (!isLocalhost()) return; // production is driven by the external cron instead

    let cancelled = false;
    const ping = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      // Fire-and-forget; failures are logged server-side and reported to Intellogy.
      fetch("/api/cron/health", { cache: "no-store" }).catch(() => {});
    };

    ping(); // immediate push on load
    const id = setInterval(ping, PING_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
