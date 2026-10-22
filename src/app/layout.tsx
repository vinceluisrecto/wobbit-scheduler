import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Footer, Header } from '@/components/layout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wobbit',
  description: 'Plan, track, and ship your work in one place.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-white text-slate-900 antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
