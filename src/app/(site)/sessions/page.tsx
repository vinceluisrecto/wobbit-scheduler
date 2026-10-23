import type { Metadata } from 'next';
import { SessionList } from '@/components/sessions';

export const metadata: Metadata = { title: 'Classes' };

export default function SessionsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-tight font-bold tracking-tight text-ink-900">
        Classes
      </h1>
      <p className="mt-2 text-lg text-ink-500">Pick a class and grab your spot.</p>
      <div className="mt-8">
        <SessionList />
      </div>
    </div>
  );
}
