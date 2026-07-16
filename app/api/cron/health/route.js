import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/db/mongodb';
import { collectAnalytics } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

const INGEST_URL = () =>
  `${process.env.INTELLOGY_OS_URL || 'https://intellogy-os.vercel.app'}/api/health/ingest`;

/**
 * POST a payload to the Intellogy OS ingest endpoint using the per-client token.
 * Returns the fetch Response (or throws on network failure).
 */
async function sendToIntellogy(body) {
  return fetch(INGEST_URL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-token': process.env.INTELLOGY_HEALTH_TOKEN || '',
    },
    body: JSON.stringify(body),
  });
}

export async function GET(req) {
  // In production, enforce the shared secret ONLY when one is configured.
  // - CRON_SECRET set  -> require `Authorization: Bearer <secret>` (locked down).
  // - CRON_SECRET unset -> endpoint stays callable, so a plain-URL scheduler
  //   (e.g. cron-job.org hitting the URL every 5 min) works with zero auth setup.
  const cronSecret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  const environment = process.env.NODE_ENV || 'development';
  const startedAt = Date.now();
  let analytics = null;
  let dbLatencyMs = null;

  try {
    // 1. Connect + measure DB round-trip latency (Intellogy renders metrics.db_latency_ms).
    await dbConnect();
    const dbStart = Date.now();
    await mongoose.connection.db.admin().ping();
    dbLatencyMs = Date.now() - dbStart;

    // 2. Gather a live analytics snapshot from the database.
    analytics = await collectAnalytics();
    const responseTimeMs = Date.now() - startedAt;

    // 3. Push health + analytics in one payload.
    //    Top-level `response_time_ms` / `error_count` and `metrics.db_latency_ms` /
    //    `metrics.active_users` match the schema Intellogy OS already renders; the full
    //    ERP snapshot rides along under `metrics.erp` for richer dashboards.
    const res = await sendToIntellogy({
      status: 'healthy',
      message: `ERP online · ${analytics.totals.total_students} students · ₹${analytics.totals.total_collected.toLocaleString('en-IN')} collected`,
      source: 'vercel-erp',
      environment,
      response_time_ms: responseTimeMs,
      error_count: 0,
      metrics: {
        db_latency_ms: dbLatencyMs,
        active_users: analytics.totals.total_students,
        erp: analytics,
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ingest returned ${res.status}: ${text}`);
    }

    return NextResponse.json({
      success: true,
      status: 'healthy',
      response_time_ms: responseTimeMs,
      db_latency_ms: dbLatencyMs,
      // Echo the exact analytics we pushed, so hitting this URL shows what Intellogy received.
      metrics: analytics,
    });
  } catch (error) {
    console.error('Health/analytics ping failed:', error);

    // 4. Report the failure to Intellogy OS too, so problems surface in real time.
    //    Best-effort — never let the error report itself crash the route.
    try {
      await sendToIntellogy({
        // Ingest accepts healthy | degraded | down — a failed analytics run is "down".
        status: 'down',
        message: error.message || 'Unknown error while collecting analytics',
        source: 'vercel-erp',
        environment,
        response_time_ms: Date.now() - startedAt,
        error_count: 1,
        metrics: {
          db_latency_ms: dbLatencyMs,
          active_users: analytics?.totals?.total_students ?? null,
          erp: analytics, // whatever we gathered before failing (may be null)
        },
        error: {
          source: 'api/cron/health',
          message: error.message,
          name: error.name,
          stack: error.stack?.split('\n').slice(0, 5).join('\n'),
        },
      });
    } catch (reportErr) {
      console.error('Failed to report error to Intellogy OS:', reportErr.message);
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
