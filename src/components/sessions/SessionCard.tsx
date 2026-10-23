import Link from 'next/link';
import { ViewTransition } from 'react';
import type { SessionSummary } from '@/types/sessions';
import { formatPrice } from '@/utils/format-price';
import { formatSessionDay, formatSessionTime } from '@/utils/format-session-time';
import { SpotsBadge } from './SpotsBadge';

export interface SessionCardProps {
  session: SessionSummary;
}

/** The whole card is one big tap target. Its header morphs into the class page header. */
export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      transitionTypes={['nav-forward']}
      className="group flex h-full flex-col gap-5 rounded-card border border-ink-200/70 bg-white p-5 shadow-card transition duration-(--duration-base) ease-out-soft hover:border-ink-300 hover:shadow-lift motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.98] sm:p-6"
    >
      <ViewTransition name={`session-${session.id}`} share="morph" default="none">
        <div>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-semibold text-ink-500">{formatSessionDay(session.startsAt)}</p>
            <SpotsBadge spotsLeft={session.spotsLeft} isFull={session.isFull} />
          </div>
          <p className="mt-1 font-display text-4xl font-bold tracking-tight text-ink-900">
            {formatSessionTime(session.startsAt)}
          </p>
          <h3 className="mt-3 text-lg font-semibold text-ink-900">{session.title}</h3>
          <p className="text-sm text-ink-500">
            with {session.instructor} · {session.durationMinutes} min
          </p>
        </div>
      </ViewTransition>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <span className="text-base font-semibold text-ink-900">{formatPrice(session.priceCents)}</span>
        <span className={session.isFull ? 'text-sm font-semibold text-accent-700' : 'text-sm font-semibold text-brand-700'}>
          {session.isFull ? 'Join waitlist' : 'Book'}{' '}
          <span aria-hidden="true" className="inline-block transition-transform duration-(--duration-fast) motion-safe:group-hover:translate-x-0.5">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
