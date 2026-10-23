'use client';

import Link from 'next/link';
import { useState } from 'react';
import { cancelBooking } from '@/api/bookings';
import { BookingStatusBadges, cancelErrorMessage, SuccessCelebration } from '@/components/bookings';
import { SessionInfo } from '@/components/sessions';
import { ConfirmButton, Notice } from '@/components/ui';
import type { BookingWithSession } from '@/types/bookings';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/format-price';

export interface AccountBookingCardProps {
  booking: BookingWithSession;
  /** True when this booking came from the waitlist ("You got a place!"). */
  isPromoted?: boolean;
  /** When the list was loaded (ms). Decides whether the class is still upcoming. */
  now: number;
  /** Called after a cancel succeeds, so the list can refetch. */
  onChanged: () => void;
}

export function AccountBookingCard({ booking, isPromoted = false, now, onChanged }: AccountBookingCardProps) {
  const [error, setError] = useState<string | null>(null);
  const canCancel = booking.status === 'confirmed' && new Date(booking.session.startsAt).getTime() > now;

  async function handleCancel() {
    setError(null);
    try {
      await cancelBooking(booking.id);
      onChanged();
    } catch (cancelError) {
      setError(cancelErrorMessage(cancelError));
    }
  }

  const card = (
    <article
      className={cn(
        'rounded-card border bg-white p-5 shadow-card sm:p-6',
        isPromoted ? 'border-success-500 ring-4 ring-success-100' : 'border-ink-200/70',
      )}
    >
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between">
        <Link href={`/bookings/${booking.id}`} className="min-w-0 rounded-control hover:opacity-80">
          <SessionInfo session={booking.session} />
        </Link>
        <BookingStatusBadges booking={booking} />
      </div>
      <p className="mt-3 text-sm text-ink-500">
        {formatPrice(booking.session.priceCents)}
        {booking.paymentStatus === 'unpaid' && booking.status === 'confirmed' && booking.session.priceCents > 0 && (
          <> · Pay at the studio</>
        )}
      </p>
      {(canCancel || error) && (
        <div className="mt-4 flex flex-col gap-3">
          {error && <Notice tone="danger">{error}</Notice>}
          {canCancel && (
            <div>
              <ConfirmButton
                label="Cancel booking"
                confirmLabel="Yes, cancel"
                keepLabel="Keep booking"
                loadingLabel="Cancelling…"
                size="sm"
                onConfirm={handleCancel}
              />
            </div>
          )}
        </div>
      )}
    </article>
  );

  if (isPromoted && booking.status === 'confirmed') {
    return <SuccessCelebration title="You got a place!">{card}</SuccessCelebration>;
  }
  return card;
}
