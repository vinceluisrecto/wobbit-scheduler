import { ViewTransition, type ReactNode } from 'react';
import { Footer, Header } from '@/components/layout';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      {/* Page navigations crossfade; named elements (the session card) morph. */}
      <ViewTransition>
        <main className="flex-1">{children}</main>
      </ViewTransition>
      <Footer />
    </div>
  );
}
