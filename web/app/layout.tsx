import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FTC Stream Scorer - DECODE 2025-2026',
  description: 'Web-based referee scoring interface for FTC DECODE matches. Score matches from any device!',
  keywords: ['FTC', 'FIRST Tech Challenge', 'DECODE', 'scoring', 'robotics', 'referee'],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-100">
        {children}
      </body>
    </html>
  );
}
