import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans } from 'next/font/google';
import type { ReactNode } from 'react';
import { STUDIO_NAME } from '@/constants/studio';
import './globals.css';

const headingFont = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
});

const bodyFont = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: STUDIO_NAME, template: `%s · ${STUDIO_NAME}` },
  description: 'Book your place in a class in one tap.',
};

export const viewport: Viewport = {
  themeColor: '#c73d16',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-dvh bg-ink-50 font-sans text-ink-900 antialiased">{children}</body>
    </html>
  );
}
