'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyBookings } from '@/api/account';
import { getMe } from '@/api/auth';
import { isApiError } from '@/api/client';
import { Button, Notice, Skeleton, Tabs } from '@/components/ui';
import { Reveal } from '@/components/ui/Reveal';
import { WaitlistEntryCard } from '@/components/waitlist';
import type { MyBookingsResponse } from '@/types/account';
import type { BookingWithSession } from '@/types/bookings';
import type { WaitlistEntryWithSession } from '@/types/waitlist';
import { AccountBookingCard } from './AccountBookingCard';

type AccountTab = 'upcoming' | 'past';

type ViewState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'logged-out' }
  | { status: 'ready'; data: MyBookingsResponse; loadedAt: number };

type UpcomingItem =
  | { kind: 'booking'; booking: BookingWithSession; isPromoted: boolean }
  | { kind: 'waitlist'; entry: WaitlistEntryWithSession };

const LOGIN_HREF = `/login?next=${encodeURIComponent('/account')}`;

function startsAt(item: UpcomingItem): number {
  return new Date(item.kind === 'booking' ? item.booking.session.startsAt : item.entry.session.startsAt).getTime();
}

// Upcoming: confirmed bookings and waiting entries, soonest first. A promoted entry marks its booking.
function toUpcomingItems(data: MyBookingsResponse): UpcomingItem[] {
  const promotedBookingIds = new Set(
    data.upcoming.waitlist.filter((entry) => entry.status === 'promoted').map((entry) => entry.bookingId),
  );
  const bookings: UpcomingItem[] = data.upcoming.bookings
    .filter((booking) => booking.status === 'confirmed')
    .map((booking) => ({ kind: 'booking', booking, isPromoted: promotedBookingIds.has(booking.id) }));
  const waiting: UpcomingItem[] = data.upcoming.waitlist
    .filter((entry) => entry.status === 'waiting')
    .map((entry) => ({ kind: 'waitlist', entry }));
  return [...bookings, ...waiting].sort((a, b) => startsAt(a) - startsAt(b));
}

// Past: previous classes, plus upcoming bookings that were cancelled. Most recent first.
function toPastBookings(data: MyBookingsResponse): BookingWithSession[] {
  const cancelledUpcoming = data.upcoming.bookings.filter((booking) => booking.status === 'cancelled');
  return [...cancelledUpcoming, ...data.past.bookings].sort(
    (a, b) => new Date(b.session.startsAt).getTime() - new Date(a.session.startsAt).getTime(),
  );
}

async function fetchAccount(): Promise<ViewState> {
  try {
    const user = await getMe();
    if (!user) return { status: 'logged-out' };
    return { status: 'ready', data: await getMyBookings(), loadedAt: Date.now() };
  } catch (error) {
    return isApiError(error, 'UNAUTHORIZED') ? { status: 'logged-out' } : { status: 'error' };
  }
}

export function AccountView() {
  const router = useRouter();
  const [state, setState] = useState<ViewState>({ status: 'loading' });
  const [tab, setTab] = useState<AccountTab>('upcoming');
  const [reloadKey, setReloadKey] = useState(0);

  // Loads on mount, after every change (reloadKey), and whenever the window regains focus.
  useEffect(() => {
    let isCurrent = true;
    const refresh = () => {
      fetchAccount().then((next) => {
        if (!isCurrent) return;
        if (next.status === 'logged-out') {
          router.replace(LOGIN_HREF);
          return;
        }
        // Keep showing what we have if a background refetch fails.
        setState((current) => (next.status === 'error' && current.status === 'ready' ? current : next));
      });
    };
    refresh();
    window.addEventListener('focus', refresh);
    return () => {
      isCurrent = false;
      window.removeEventListener('focus', refresh);
    };
  }, [reloadKey, router]);

  const reload = () => setReloadKey((key) => key + 1);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-[clamp(2.25rem,6vw,3.5rem)] leading-tight font-bold tracking-tight text-ink-900">
        My bookings
      </h1>

      <div className="mt-6">
        {(state.status === 'loading' || state.status === 'logged-out') && (
          <div aria-busy="true" aria-label="Loading your bookings" className="flex flex-col gap-4">
            <Skeleton className="h-12 w-52" shape="pill" />
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-36 w-full" shape="block" />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div className="flex flex-col items-start gap-3">
            <Notice tone="danger">We couldn&apos;t load your bookings. Check your connection and try again.</Notice>
            <Button
              variant="secondary"
              onClick={() => {
                setState({ status: 'loading' });
                reload();
              }}
            >
              Try again
            </Button>
          </div>
        )}

        {state.status === 'ready' && (
          <AccountTabs data={state.data} now={state.loadedAt} tab={tab} onTabChange={setTab} onChanged={reload} />
        )}
      </div>
    </div>
  );
}

interface AccountTabsProps {
  data: MyBookingsResponse;
  now: number;
  tab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
  onChanged: () => void;
}

function AccountTabs({ data, now, tab, onTabChange, onChanged }: AccountTabsProps) {
  const upcoming = toUpcomingItems(data);
  const past = toPastBookings(data);

  return (
    <Tabs
      label="My bookings"
      value={tab}
      onChange={onTabChange}
      tabs={[
        { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
        { value: 'past', label: 'Past', count: past.length },
      ]}
    >
      {tab === 'upcoming' &&
        (upcoming.length === 0 ? (
          <EmptyState title="Nothing booked yet" text="Find a class you like and grab a spot." />
        ) : (
          <Reveal key="upcoming" variant="stagger" className="flex flex-col gap-4">
            {upcoming.map((item) =>
              item.kind === 'booking' ? (
                <AccountBookingCard
                  key={item.booking.id}
                  booking={item.booking}
                  isPromoted={item.isPromoted}
                  now={now}
                  onChanged={onChanged}
                />
              ) : (
                <WaitlistEntryCard key={item.entry.id} entry={item.entry} onChanged={onChanged} />
              ),
            )}
          </Reveal>
        ))}

      {tab === 'past' &&
        (past.length === 0 ? (
          <EmptyState title="No past classes yet" text="Classes you've booked show up here afterwards." />
        ) : (
          <Reveal key="past" variant="stagger" className="flex flex-col gap-4">
            {past.map((booking) => (
              <AccountBookingCard key={booking.id} booking={booking} now={now} onChanged={onChanged} />
            ))}
          </Reveal>
        ))}
    </Tabs>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-card border border-dashed border-ink-300 bg-white px-6 py-12 text-center">
      <p className="font-display text-xl font-semibold text-ink-900">{title}</p>
      <p className="mt-1 text-ink-500">{text}</p>
      <Button href="/sessions" className="mt-6">
        See classes
      </Button>
    </div>
  );
}
