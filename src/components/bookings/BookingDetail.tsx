'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { cancelBooking, getBooking } from '@/api/bookings';
import { isApiError } from '@/api/client';
import { SessionInfo } from '@/components/sessions';
import { Button, ConfirmButton, Notice, Skeleton } from '@/components/ui';
import type { BookingWithSession } from '@/types/bookings';
import { formatPrice } from '@/utils/format-price';
import { BookingStatusBadges } from './BookingStatusBadges';
import { cancelErrorMessage } from './cancel-error-message';
import { SuccessCelebration } from './SuccessCelebration';

export interface BookingDetailProps {
  bookingId: string;
  /** True when the member arrives straight from booking: plays the success animation. */
  justBooked?: boolean;
}

type DetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'unauthorized' }
  | { status: 'ready'; booking: BookingWithSession; loadedAt: number };

type Feedback = { tone: 'success' | 'danger'; text: string };

async function fetchDetail(bookingId: string): Promise<DetailState> {
  try {
    return { status: 'ready', booking: await getBooking(bookingId), loadedAt: Date.now() };
  } catch (error) {
    if (isApiError(error, 'UNAUTHORIZED')) return { status: 'unauthorized' };
    // Not found, not yours, or not a valid id all look the same: never reveal that it exists.
    const isMissing = isApiError(error, 'BOOKING_NOT_FOUND') || isApiError(error, 'VALIDATION_ERROR');
    return { status: isMissing ? 'not-found' : 'error' };
  }
}

export function BookingDetail({ bookingId, justBooked = false }: BookingDetailProps) {
  const router = useRouter();
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  useEffect(() => {
    let isCurrent = true;
    fetchDetail(bookingId).then((next) => {
      if (!isCurrent) return;
      if (next.status === 'unauthorized') {
        router.replace(`/login?next=${encodeURIComponent(`/bookings/${bookingId}`)}`);
        return;
      }
      setState(next);
    });
    return () => {
      isCurrent = false;
    };
  }, [bookingId, reloadKey, router]);

  async function handleCancel() {
    setFeedback(null);
    try {
      const booking = await cancelBooking(bookingId);
      setState({ status: 'ready', booking, loadedAt: Date.now() });
      setFeedback({ tone: 'success', text: 'Booking cancelled' });
    } catch (error) {
      setFeedback({ tone: 'danger', text: cancelErrorMessage(error) });
    }
  }

  if (state.status === 'loading' || state.status === 'unauthorized') {
    return (
      <Shell>
        <div aria-busy="true" aria-label="Loading booking" className="rounded-card border border-ink-200/70 bg-white p-6 shadow-card">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
          <Skeleton className="mt-6 h-6 w-40" shape="pill" />
          <Skeleton className="mt-6 h-12 w-full" shape="block" />
        </div>
      </Shell>
    );
  }

  if (state.status === 'not-found') {
    return (
      <Shell>
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-ink-900">We can&apos;t find that booking</h1>
          <p className="mt-2 text-ink-500">Check My bookings for everything you&apos;ve booked.</p>
          <Button href="/account" className="mt-6">
            Go to My bookings
          </Button>
        </div>
      </Shell>
    );
  }

  if (state.status === 'error') {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-3">
          <Notice tone="danger">We couldn&apos;t load this booking. Check your connection and try again.</Notice>
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
      </Shell>
    );
  }

  const { booking, loadedAt } = state;
  const isConfirmed = booking.status === 'confirmed';
  const isUpcoming = new Date(booking.session.startsAt).getTime() > loadedAt;

  const card = (
    <div className="rounded-card border border-ink-200/70 bg-white p-6 shadow-card sm:p-8">
      <SessionInfo session={booking.session} headingLevel="h2" />
      <div className="mt-5">
        <BookingStatusBadges booking={booking} />
      </div>
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-ink-100 pt-6 text-sm">
        <div>
          <dt className="text-ink-500">Price</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">{formatPrice(booking.session.priceCents)}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Payment</dt>
          <dd className="mt-0.5 font-semibold text-ink-900">
            {booking.paymentStatus === 'paid' ? 'Paid, thank you' : 'Pay at the studio'}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3">
        {feedback && <Notice tone={feedback.tone}>{feedback.text}</Notice>}
        {isConfirmed && isUpcoming && (
          <ConfirmButton
            label="Cancel booking"
            confirmLabel="Yes, cancel"
            keepLabel="Keep booking"
            loadingLabel="Cancelling…"
            onConfirm={handleCancel}
          />
        )}
      </div>
    </div>
  );

  return (
    <Shell>
      {justBooked && isConfirmed ? (
        <SuccessCelebration title="You're booked!">{card}</SuccessCelebration>
      ) : (
        <>
          <h1 className="mb-6 font-display text-3xl font-bold tracking-tight text-ink-900">Your booking</h1>
          {card}
        </>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button href="/account" variant="secondary">
          My bookings
        </Button>
        <Button href="/sessions" variant="ghost" transitionTypes={['nav-back']}>
          More classes
        </Button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-16">{children}</div>;
}
