'use client';

import { useEffect, useState } from 'react';
import { listSessions } from '@/api/sessions';
import { Button, Notice } from '@/components/ui';
import { Reveal } from '@/components/ui/Reveal';
import type { SessionSummary } from '@/types/sessions';
import { SessionCard } from './SessionCard';
import { SessionCardSkeleton } from './SessionCardSkeleton';

export interface SessionListProps {
  /** Show only the first N classes (the landing page preview). */
  limit?: number;
}

type ListState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; sessions: SessionSummary[] };

const gridClasses = 'grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3';

/** Upcoming classes. Refetches when the window regains focus, so spots stay current. */
export function SessionList({ limit }: SessionListProps) {
  const [state, setState] = useState<ListState>({ status: 'loading' });

  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    const refresh = () => {
      listSessions()
        .then((sessions) => isCurrent && setState({ status: 'ready', sessions }))
        // Keep showing the classes we already have if a background refetch fails.
        .catch(() => isCurrent && setState((current) => (current.status === 'ready' ? current : { status: 'error' })));
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      isCurrent = false;
      window.removeEventListener('focus', refresh);
    };
  }, [reloadKey]);

  function handleRetry() {
    setState({ status: 'loading' });
    setReloadKey((key) => key + 1);
  }

  if (state.status === 'loading') {
    return (
      <div className={gridClasses} aria-busy="true" aria-label="Loading classes">
        {Array.from({ length: limit ?? 6 }, (_, index) => (
          <SessionCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-3">
        <Notice tone="danger">We couldn&apos;t load the classes. Check your connection and try again.</Notice>
        <Button variant="secondary" onClick={handleRetry}>
          Try again
        </Button>
      </div>
    );
  }

  const sessions = limit === undefined ? state.sessions : state.sessions.slice(0, limit);
  if (sessions.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
        <p className="font-display text-xl font-semibold text-ink-900">No classes scheduled yet</p>
        <p className="mt-1 text-ink-500">New classes appear here as soon as the studio adds them.</p>
      </div>
    );
  }

  return (
    <Reveal variant="stagger" className={gridClasses}>
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </Reveal>
  );
}
