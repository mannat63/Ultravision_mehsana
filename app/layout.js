import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "UltraVision Academy | Academic Excellence",
  description: "A modern management platform for UltraVision Academy. Track students, fees, attendance, and results with ease.",
};

export default function RootLayout({ children }) {
  // Clerk runs only where its key is present (production/preview). Locally we
  // test Supabase Auth without Clerk keys, so wrap conditionally.
  const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const inner = (
    <>
      {children}
      <Analytics />
    </>
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        {clerkEnabled ? <ClerkProvider>{inner}</ClerkProvider> : inner}
      </body>
    </html>
  );
}
