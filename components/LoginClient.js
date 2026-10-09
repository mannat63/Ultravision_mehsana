"use client";

import { useState, useEffect } from "react";
import { SignInButton } from "@clerk/nextjs";
import { createSupabaseBrowserClient, supabaseEnabled } from "@/lib/supabase/client";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

async function signInWithGoogleSupabase() {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
}

const features = [
  { text: "Real-time Analytics & Insights" },
  { text: "AI-Powered Performance Tracking" },
  { text: "Comprehensive Fee Management" },
  { text: "24/7 Cloud Infrastructure" },
];

function GoogleLogo({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function FloatingParticles() {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const items = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${(i * 7.3 + 5) % 100}%`,
      top: `${(i * 11.7 + 10) % 100}%`,
      width: `${(i % 4) + 2}px`,
      height: `${(i % 4) + 2}px`,
      delay: `${(i * 0.6) % 8}s`,
      duration: `${(i % 5) + 10}s`,
    }));
    setParticles(items);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="login-particles">
      {particles.map((p) => (
        <div
          key={p.id}
          className="login-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.width,
            height: p.height,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginClient() {
  return (
    <div className="login-page">
      {/* Left Panel: Scenic Branding */}
      <div className="login-left">
        <FloatingParticles />

        <div className="login-orb login-orb-1" />
        <div className="login-orb login-orb-2" />
        <div className="login-orb login-orb-3" />

        {/* Scenic overlay image */}
        <div className="login-left-scenic" />

        {/* Brand */}
        <div className="login-left-brand">
          <div className="login-left-logo">
            <img src="/uv_meh_logo.png" alt="UltraVision Academy" />
          </div>
          <div className="login-left-text">
            <div className="login-left-name">UltraVision Academy</div>
            <div className="login-left-sub">Academy</div>
          </div>
        </div>

        {/* Hero content */}
        <div className="login-hero-content">
          <div className="login-hero-badge">
            <span className="login-badge-dot" />
            Welcome to UltraVision Academy
          </div>

          <h1 className="login-hero-title">
            Where <span className="login-hero-highlight">Excellence</span> Meets Innovation
          </h1>

          <p className="login-hero-subtitle">
            Empowering students with world-class education and personalized academic tracking at UltraVision Academy.
          </p>

          {/* Feature list */}
          <div className="login-features-list">
            {features.map((f, i) => (
              <div key={i} className="login-feature-item" style={{ animationDelay: `${i * 0.1}s` }}>
                <span className="login-feature-icon">&#10022;</span>
                <span>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right">
        <div className="login-right-decor login-right-decor-1" />
        <div className="login-right-decor login-right-decor-2" />

        {/* Mobile top branding */}
        <div className="login-mobile-top-brand">
          <div className="login-mobile-top-logo">
            <img src="/uv_meh_logo.png" alt="UltraVision Academy" />
          </div>
          <div>
            <div className="login-mobile-top-name">UltraVision Academy</div>
            <div className="login-mobile-top-sub">Academy</div>
          </div>
        </div>

        <div className="login-card">
          {/* Welcome text */}
          <div className="login-welcome-tag">
            UltraVision Academy Portal
          </div>

          {/* Logo Section instead of rotating avatars */}
          <div className="login-avatar-section">
            <div className="login-logo-showcase">
              <img src="/uv_meh_logo.png" alt="UltraVision Academy" className="login-showcase-logo" />
            </div>
            <div className="login-role-name">Welcome Back</div>
            <p className="login-role-desc">
              Sign in to access your dashboard, track performance, and manage academic activities.
            </p>
          </div>

          {/* Sign In Section */}
          <div className="login-signin-section">
            <div className="login-divider">
              <div className="login-divider-line" />
              <span className="login-divider-text">Official Access</span>
              <div className="login-divider-line" />
            </div>

            {supabaseEnabled && (
              <button className="login-google-btn" id="login-google-signin-supabase" onClick={signInWithGoogleSupabase}>
                <GoogleLogo size={22} />
                <span>Continue with Google</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-google-arrow">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            )}

            {clerkEnabled && (
              <SignInButton mode="modal">
                <button className="login-google-btn" id="login-google-signin" style={supabaseEnabled ? { marginTop: "10px", opacity: 0.85 } : undefined}>
                  <GoogleLogo size={22} />
                  <span>{supabaseEnabled ? "Continue with Google (Legacy)" : "Continue with Google"}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-google-arrow">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </button>
              </SignInButton>
            )}

            {/* Trust indicators */}
            <div className="login-trust">
              <div className="login-trust-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span>256-bit SSL</span>
              </div>
              <div className="login-trust-divider-dot" />
              <div className="login-trust-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span>Secure Platform</span>
              </div>
              <div className="login-trust-divider-dot" />
              <div className="login-trust-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Data Protected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <span>&copy; {new Date().getFullYear()} UltraVision Academy</span>
          <span className="login-footer-dot">&middot;</span>
          <span>Privacy Policy</span>
          <span className="login-footer-dot">&middot;</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </div>
  );
}
