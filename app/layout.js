import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  title: "Intellogy Corporation | Academic Excellence",
  description: "A modern management platform for Intellogy Corporation. Track students, fees, attendance, and results with ease.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <ClerkProvider>
          {children}
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}
