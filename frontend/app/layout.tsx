import "./globals.css";
import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from "@/components/Navbar";
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: "VORTEX Protocol — Fault-Tolerant Bounty Escrow",
  description: "Elite, automated minimally-trusted bounty escrow system on Algorand. Backed by Oracle Consensus.",
  openGraph: {
    title: 'VORTEX Protocol',
    description: 'Elite, automated minimally-trusted bounty escrow system on Algorand.',
    url: 'https://vortex.network',
    siteName: 'VORTEX Protocol',
    images: [{ url: '/preview.png', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VORTEX Protocol',
    description: 'Code is law. Verified by sandbox + oracle consensus.',
    images: ['/preview.png'],
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Toaster theme="dark" position="bottom-right" toastOptions={{ className: 'vrtx-toast' }} />
        <Navbar />
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
