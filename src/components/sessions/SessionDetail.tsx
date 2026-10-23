'use client';

import Link from 'next/link';
import { useEffect, useState, ViewTransition, type ReactNode } from 'react';
import { getMyBookings } from '@/api/account';
import { getMe } from '@/api/auth';
import { isApiError } from '@/api/client';
import { getSession } from '@/api/sessions';
import { Button, Notice, Skeleton } from '@/components/ui';
import type { SessionSummary } from '@/types/sessions';
import { formatPrice } from '@/utils/format-price';
import { formatSessionDay, formatSessionTime } from '@/utils/format-session-time';
import { SessionAction } from './SessionAction';
import { SpotsBadge } from './SpotsBadge';

export interface SessionDetailProps {
  sessionId: string;
}

interface Membership {
  bookingId: string | null;
  waitlistPosition: number | null;
}

type DetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; session: SessionSummary; isLoggedIn: boolean; membership: Membership };

const longDateFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

// Whether the member already holds a place (or a waitlist spot) in this class.
async function loadMembership(sessionId: string): Promise<Membership> {
  const { upcoming } = await getMyBookings();
  const booking = upcoming.bookings.find((item) => item.sessionId === sessionId && item.status === 'confirmed');
  const entry = upcoming.waitlist.find((item) => item.sessionId === sessionId && item.status === 'waiting');
  return { bookingId: booking?.id ?? null, waitlistPosition: entry?.position ?? null };
}

const NO_MEMBERSHIP: Membership = { bookingId: null, waitlistPosition: null };

async function fetchDetail(sessionId: string): Promise<DetailState> {
  try {
    const [session, user] = await Promise.all([getSession(sessionId), getMe().catch(() => null)]);
    const membership = user ? await loadMembership(sessionId).catch(() => NO_MEMBERSHIP) : NO_MEMBERSHIP;
    return { status: 'ready', session, isLoggedIn: user !== null, membership };
  } catch (error) {
    const isMissing = isApiError(error, 'SESSION_NOT_FOUND') || isApiError(error, 'VALIDATION_ERROR');
    return { status: isMissing ? 'not-found' : 'error' };
  }
}

export function SessionDetail({ sessionId }: SessionDetailProps) {
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    fetchDetail(sessionId).then((next) => isCurrent && setState(next));
    return () => {
      isCurrent = false;
    };
  }, [sessionId, reloadKey]);

  if (state.status === 'not-found') {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl font-bold text-ink-900">We can&apos;t find that class</h1>
        <p className="mt-2 text-ink-500">It may have been removed from the timetable.</p>
        <Button href="/sessions" transitionTypes={['nav-back']} className="mt-6">
          See all classes
        </Button>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-start gap-3 px-4 py-20 sm:px-6">
        <Notice tone="danger">We couldn&apos;t load this class. Check your connection and try again.</Notice>
        <Button
          variant="secondary"
          onClick={() => {
            setState({ status: 'loading' });
            setReloadKey((key) => key + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const session = state.status === 'ready' ? state.session : null;

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-48 sm:px-6 sm:pt-10 sm:pb-16">
      <Link
        href="/sessions"
        transitionTypes={['nav-back']}
        className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-600 hover:text-ink-900"
      >
        <span aria-hidden="true">←</span> All classes
      </Link>

      {/* Rendered right away (with a skeleton inside), so the card → header morph has a partner. */}
      <ViewTransition name={`session-${sessionId}`} share="morph" default="none">
        <header className="relative mt-3 overflow-hidden rounded-card bg-linear-to-br from-brand-700 via-brand-600 to-accent-700 p-6 text-white shadow-lift sm:p-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-white/15 blur-2xl motion-safe:animate-drift"
          />
          {session ? (
            <div className="relative">
              <p className="text-sm font-semibold text-white">{formatSessionDay(session.startsAt)}</p>
              <p className="mt-1 font-display text-5xl font-bold tracking-tight sm:text-6xl">
                {formatSessionTime(session.startsAt)}
              </p>
              <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{session.title}</h1>
              <p className="mt-1 text-white">with {session.instructor}</p>
            </div>
          ) : (
            <div className="relative" aria-busy="true" aria-label="Loading class">
              <Skeleton className="h-4 w-20" tone="inverse" />
              <Skeleton className="mt-2 h-12 w-40" tone="inverse" />
              <Skeleton className="mt-5 h-8 w-56" tone="inverse" />
              <Skeleton className="mt-2 h-5 w-36" tone="inverse" />
            </div>
          )}
        </header>
      </ViewTransition>

      {session && state.status === 'ready' ? (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Date">{longDateFormatter.format(new Date(session.startsAt))}</Fact>
            <Fact label="Length">{session.durationMinutes} min</Fact>
            <Fact label="Price">
              {formatPrice(session.priceCents)}
              {session.priceCents > 0 && <span className="block text-xs font-normal text-ink-500">Pay at the studio</span>}
            </Fact>
            <Fact label="Spots">
              <SpotsBadge spotsLeft={session.spotsLeft} isFull={session.isFull} />
            </Fact>
          </dl>

          {/* One primary action: a sticky bottom bar on mobile, inline from sm up. */}
          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <div className="mx-auto max-w-3xl sm:max-w-sm">
              <SessionAction
                session={session}
                isLoggedIn={state.isLoggedIn}
                bookingId={state.membership.bookingId}
                waitlistPosition={state.membership.waitlistPosition}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20" shape="block" />
          ))}
        </div>
      )}
    </div>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-control border border-ink-200/70 bg-white p-4">
      <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink-900">{children}</dd>
    </div>
  );
}
