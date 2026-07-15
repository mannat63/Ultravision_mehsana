import { NextResponse } from 'next/server';
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
  let analytics = null;

  try {
    // 1. Gather a live analytics snapshot from the database.
    await dbConnect();
    analytics = await collectAnalytics();

    // 2. Push health + analytics to Intellogy OS in one real-time payload.
    const res = await sendToIntellogy({
      status: 'healthy',
      message: `ERP online · ${analytics.totals.total_students} students · ₹${analytics.totals.total_collected.toLocaleString()} collected`,
      source: 'vercel-erp',
      environment,
      metrics: analytics,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Ingest returned ${res.status}: ${text}`);
    }

    return NextResponse.json({ success: true, status: 'healthy', totals: analytics.totals });
  } catch (error) {
    console.error('Health/analytics ping failed:', error);

    // 3. Report the failure to Intellogy OS too, so problems surface in real time.
    //    Best-effort — never let the error report itself crash the route.
    try {
      await sendToIntellogy({
        // Ingest accepts healthy | degraded | down — a failed analytics run is "down".
        status: 'down',
        message: error.message || 'Unknown error while collecting analytics',
        source: 'vercel-erp',
        environment,
        metrics: analytics, // whatever we gathered before failing (may be null)
      });
    } catch (reportErr) {
      console.error('Failed to report error to Intellogy OS:', reportErr.message);
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
