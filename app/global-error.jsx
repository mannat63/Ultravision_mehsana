'use client';
import { useEffect } from 'react';

export default function GlobalError({ error }) {
  useEffect(() => {
    // Fire-and-forget ping to Intellogy OS whenever a fatal error happens!
    fetch(`${process.env.NEXT_PUBLIC_INTELLOGY_OS_URL}/api/health/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-token': process.env.NEXT_PUBLIC_INTELLOGY_HEALTH_TOKEN,
      },
      body: JSON.stringify({
        status: "down",
        message: `${error.name}: ${error.message}\n${error.stack}`, // The full error!
        source: "vercel-erp-realtime",
        environment: process.env.NODE_ENV || "development",
      }),
    });
  }, [error]);

  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => window.location.reload()}>Try again</button>
      </body>
    </html>
  );
}
