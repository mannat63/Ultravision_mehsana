'use client';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }) {
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
    }).catch(() => {});
  }, [error]);

  // global-error replaces the root layout (providers are unmounted here), so we
  // can't use auth hooks. Clear both sessions best-effort, then navigate home.
  async function signOut() {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      if (url && key) {
        const { createBrowserClient } = await import('@supabase/ssr');
        await createBrowserClient(url, key).auth.signOut();
      }
    } catch {}
    try {
      if (typeof window !== 'undefined' && window.Clerk?.signOut) {
        await window.Clerk.signOut();
      }
    } catch {}
    if (typeof window !== 'undefined') window.location.href = '/';
  }

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif', background: '#f9fafb' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '420px', background: '#fff', border: '1px solid #f1f1f1', borderRadius: '24px', padding: '32px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '40px', lineHeight: 1, marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Something went wrong</h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px', lineHeight: 1.5 }}>
              We hit an unexpected error. Try again, or sign out and log back in with the
              email your academy registered for you.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => (reset ? reset() : window.location.reload())}
                style={{ width: '100%', padding: '10px 16px', background: '#111827', color: '#fff', fontSize: '14px', fontWeight: 700, border: 'none', borderRadius: '12px', cursor: 'pointer' }}
              >
                Try again
              </button>
              <button
                onClick={signOut}
                style={{ width: '100%', padding: '10px 16px', background: '#f9fafb', color: '#dc2626', fontSize: '14px', fontWeight: 600, border: '1px solid #f3f4f6', borderRadius: '12px', cursor: 'pointer' }}
              >
                Sign out & return to login
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
