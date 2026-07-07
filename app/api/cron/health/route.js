import { NextResponse } from 'next/server';

export async function GET(req) {
  // Only check for the CRON_SECRET if we are in production
  if (process.env.NODE_ENV === 'production') {
    if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  try {
    const status = "healthy"; 
    // Send the POST request to Intellogy OS
    await fetch(`${process.env.INTELLOGY_OS_URL}/api/health/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-token': process.env.INTELLOGY_HEALTH_TOKEN,
      },
      body: JSON.stringify({
        status,
        message: "Local test successful!",
        source: "vercel-erp",
        environment: process.env.NODE_ENV || "development",
      }),
    });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
