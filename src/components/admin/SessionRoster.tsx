'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { updatePayment } from '@/api/admin';
import { cancelBooking } from '@/api/bookings';
import { leaveWaitlist } from '@/api/waitlist';
import { Badge, Button, ConfirmButton } from '@/components/ui';
import type { AdminSessionDetailResponse } from '@/types/admin';
import type { Booking } from '@/types/bookings';
import type { WaitlistEntry } from '@/types/waitlist';
import { cn } from '@/utils/cn';
import { formatSessionDateTime } from '@/utils/format-session-time';
import { redirectIfSignedOut } from './redirect-if-signed-out';

export interface SessionRosterProps {
  detail: AdminSessionDetailResponse;
  /** Refetches this class's detail (and its counts). Called after every action; no optimistic updates. */
  onChanged: () => Promise<void>;
}

/** Inline success or error text, shown next to the line (or section) that changed. */
interface Feedback {
  targetId: string;
  tone: 'success' | 'danger';
  text: string;
}

const WAITLIST_SECTION = 'waitlist';
const WAITLIST_HEADING_ID = 'roster-waitlist-heading';

function paymentButtonId(bookingId: string): string {
  return `payment-${bookingId}`;
}

/** The roster, waitlist and cancelled bookings, each line with its one-click actions. */
export function SessionRoster({ detail, onChanged }: SessionRosterProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  // The element to give focus back to after an action: the pressed button is disabled while
  // loading (or removed, after a cancel), which drops keyboard focus to <body>.
  const refocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    const id = refocusIdRef.current;
    if (payingId !== null || !id) return;
    refocusIdRef.current = null;
    const active = document.activeElement;
    if (active === null || active === document.body) document.getElementById(id)?.focus();
  });

  const confirmed = detail.bookings.filter((booking) => booking.status === 'confirmed');
  const cancelled = detail.bookings.filter((booking) => booking.status === 'cancelled');
  // Cancelling and removing are refused once the class has started (D7), so they're hidden then.
  const hasStarted = new Date(detail.session.startsAt).getTime() <= now;

  function showError(targetId: string, error: unknown, fallback: string) {
    if (redirectIfSignedOut(error, router)) return;
    const text = error instanceof Error && error.message ? error.message : fallback;
    setFeedback({ targetId, tone: 'danger', text });
  }

  async function handleTogglePayment(booking: Booking) {
    const next = booking.paymentStatus === 'paid' ? 'unpaid' : 'paid';
    setPayingId(booking.id);
    setFeedback(null);
    try {
      await updatePayment(booking.id, next);
      await onChanged();
      setFeedback({ targetId: booking.id, tone: 'success', text: next === 'paid' ? 'Marked paid' : 'Marked unpaid' });
    } catch (error) {
      showError(booking.id, error, "Couldn't update the payment. Try again.");
    } finally {
      refocusIdRef.current = paymentButtonId(booking.id);
      setPayingId(null);
    }
  }

  async function handleCancel(booking: Booking) {
    setFeedback(null);
    try {
      await cancelBooking(booking.id);
      await onChanged();
      const refund = booking.paymentStatus === 'paid' ? ' A refund is due.' : '';
      setFeedback({ targetId: booking.id, tone: 'success', text: `Booking cancelled.${refund}` });
    } catch (error) {
      showError(booking.id, error, "Couldn't cancel the booking. Try again.");
    }
    refocusIdRef.current = paymentButtonId(booking.id);
  }

  async function handleRemove(entry: WaitlistEntry) {
    setFeedback(null);
    try {
      await leaveWaitlist(entry.id);
      await onChanged();
      setFeedback({ targetId: WAITLIST_SECTION, tone: 'success', text: `${entry.name} removed from the waitlist.` });
      refocusIdRef.current = WAITLIST_HEADING_ID;
    } catch (error) {
      showError(entry.id, error, "Couldn't remove them. Try again.");
    }
  }

  function feedbackFor(targetId: string) {
    if (feedback?.targetId !== targetId) return null;
    return (
      <p
        role={feedback.tone === 'danger' ? 'alert' : 'status'}
        className={cn('text-sm font-medium', feedback.tone === 'danger' ? 'text-danger-700' : 'text-success-700')}
      >
        {feedback.text}
      </p>
    );
  }

  function paymentButton(booking: Booking) {
    const isPaid = booking.paymentStatus === 'paid';
    const label = !isPaid ? 'Mark paid' : booking.status === 'cancelled' ? 'Mark refunded' : 'Mark unpaid';
    return (
      <Button
        id={paymentButtonId(booking.id)}
        variant="secondary"
        size="sm"
        isLoading={payingId === booking.id}
        loadingLabel="Saving…"
        disabled={payingId !== null && payingId !== booking.id}
        onClick={() => handleTogglePayment(booking)}
        aria-label={`${label}: ${booking.name}`}
      >
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Section title="Roster" count={confirmed.length} empty="No one is booked yet.">
        {confirmed.map((booking) => (
          <Line
            key={booking.id}
            name={booking.name}
            email={booking.email}
            meta={`Booked ${formatSessionDateTime(booking.createdAt)}`}
            badges={<PaymentBadge booking={booking} />}
            actions={
              <>
                {paymentButton(booking)}
                {!hasStarted && (
                  <ConfirmButton
                    size="sm"
                    label="Cancel booking"
                    confirmLabel="Confirm cancel"
                    keepLabel="Keep"
                    loadingLabel="Cancelling…"
                    onConfirm={() => handleCancel(booking)}
                  />
                )}
              </>
            }
            feedback={feedbackFor(booking.id)}
          />
        ))}
      </Section>

      <Section
        title="Waitlist"
        headingId={WAITLIST_HEADING_ID}
        count={detail.waitlist.length}
        empty="No one is waiting."
        feedback={feedbackFor(WAITLIST_SECTION)}
      >
        {detail.waitlist.map((entry) => (
          <Line
            key={entry.id}
            name={entry.name}
            email={entry.email}
            lead={<span className="font-semibold text-warning-700 tabular-nums">#{entry.position}</span>}
            meta={`Joined ${formatSessionDateTime(entry.createdAt)}`}
            badges={<Badge tone="warning">Waiting</Badge>}
            actions={
              !hasStarted && (
                <ConfirmButton
                  size="sm"
                  label="Remove"
                  confirmLabel="Confirm remove"
                  keepLabel="Keep"
                  loadingLabel="Removing…"
                  onConfirm={() => handleRemove(entry)}
                />
              )
            }
            feedback={feedbackFor(entry.id)}
          />
        ))}
      </Section>

      {cancelled.length > 0 && (
        <Section title="Cancelled" count={cancelled.length}>
          {cancelled.map((booking) => (
            <Line
              key={booking.id}
              name={booking.name}
              email={booking.email}
              meta={`Cancelled ${booking.cancelledAt ? formatSessionDateTime(booking.cancelledAt) : ''} by ${
                booking.cancelledBy === 'admin' ? 'the studio' : 'the member'
              }`}
              badges={
                <>
                  <Badge tone="danger">Cancelled</Badge>
                  <PaymentBadge booking={booking} />
                </>
              }
              actions={paymentButton(booking)}
              feedback={feedbackFor(booking.id)}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

/** Green = paid, amber = unpaid, red = refund due (a cancelled booking that was paid). */
function PaymentBadge({ booking }: { booking: Booking }) {
  if (booking.status === 'cancelled' && booking.paymentStatus === 'paid') return <Badge tone="danger">Refund due</Badge>;
  if (booking.paymentStatus === 'paid') return <Badge tone="success">Paid</Badge>;
  return <Badge tone="warning">Unpaid</Badge>;
}

interface SectionProps {
  title: string;
  /** Lets focus land on the heading after the line that had it is gone. */
  headingId?: string;
  count: number;
  empty?: string;
  feedback?: ReactNode;
  children: ReactNode;
}

function Section({ title, headingId, count, empty, feedback, children }: SectionProps) {
  return (
    <section aria-label={title}>
      <h3
        id={headingId}
        tabIndex={headingId ? -1 : undefined}
        className="text-xs font-semibold tracking-wide text-ink-500 uppercase"
      >
        {title} <span className="tabular-nums">({count})</span>
      </h3>
      {feedback && <div className="mt-2">{feedback}</div>}
      {count === 0 ? (
        empty && <p className="mt-2 text-sm text-ink-500">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-ink-200 rounded-control border border-ink-200 bg-white">{children}</ul>
      )}
    </section>
  );
}

interface LineProps {
  name: string;
  email: string;
  meta: string;
  lead?: ReactNode;
  badges: ReactNode;
  actions: ReactNode;
  feedback: ReactNode;
}

// Mobile: a stacked card with the actions in full view (no overflow menu). sm+: one line.
function Line({ name, email, meta, lead, badges, actions, feedback }: LineProps) {
  return (
    <li className="flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        {lead}
        <div className="min-w-0">
          <p className="font-semibold text-ink-900">{name}</p>
          <p className="truncate text-sm text-ink-600">{email}</p>
          <p className="text-xs text-ink-500">{meta}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">{badges}</div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      {feedback && <div className="sm:basis-full">{feedback}</div>}
    </li>
  );
}
