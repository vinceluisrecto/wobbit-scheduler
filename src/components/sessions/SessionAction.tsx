'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { isApiError } from '@/api/client';
import { createBooking } from '@/api/bookings';
import { joinWaitlist } from '@/api/waitlist';
import { Button, Notice } from '@/components/ui';
import type { SessionSummary } from '@/types/sessions';

export interface SessionActionProps {
  session: SessionSummary;
  isLoggedIn: boolean;
  /** The member's confirmed booking for this class, when known (from My bookings). */
  bookingId?: string | null;
  /** The member's waitlist position for this class, when known (from My bookings). */
  waitlistPosition?: number | null;
}

type Message = { tone: 'danger' | 'warning' | 'info'; text: string };

const GENERIC_ERROR = 'Something went wrong, nothing was saved';

/**
 * The one primary action on the class page: Book, Join waitlist, Log in to book,
 * You're booked ✓, or Already started. The backend's answer always wins over what the UI expected.
 */
export function SessionAction({ session, isLoggedIn, bookingId = null, waitlistPosition = null }: SessionActionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [isFull, setIsFull] = useState(session.isFull);
  const [hasStarted, setHasStarted] = useState(() => new Date(session.startsAt).getTime() <= Date.now());
  const [isBooked, setIsBooked] = useState(bookingId !== null);
  const [isWaitlisted, setIsWaitlisted] = useState(waitlistPosition !== null);
  const [needsLogin, setNeedsLogin] = useState(!isLoggedIn);

  const loginHref = `/login?next=${encodeURIComponent(`/sessions/${session.id}`)}`;

  // Error codes that Book and Join waitlist handle the same way.
  function handleCommonError(error: unknown): void {
    if (isApiError(error, 'ALREADY_BOOKED')) {
      setIsBooked(true);
      setMessage(null);
    } else if (isApiError(error, 'SESSION_PAST')) {
      setHasStarted(true);
      setMessage({ tone: 'warning', text: 'This class has already started' });
    } else if (isApiError(error, 'UNAUTHORIZED')) {
      setNeedsLogin(true);
      setMessage({ tone: 'info', text: 'Please log in again to continue' });
    } else if (isApiError(error, 'SESSION_NOT_FOUND')) {
      setMessage({ tone: 'danger', text: 'This class is no longer on the timetable' });
    } else {
      setMessage({ tone: 'danger', text: GENERIC_ERROR });
    }
  }

  async function handleBook() {
    setIsLoading(true);
    setMessage(null);
    try {
      const booking = await createBooking(session.id);
      router.push(`/bookings/${booking.id}?booked=1`);
      return; // keep the loading state while the booking page opens
    } catch (error) {
      if (isApiError(error, 'SESSION_FULL')) {
        setIsFull(true);
        setMessage({ tone: 'warning', text: 'This class just filled up' });
      } else {
        handleCommonError(error);
      }
    }
    setIsLoading(false);
  }

  async function handleJoinWaitlist() {
    setIsLoading(true);
    setMessage(null);
    try {
      await joinWaitlist(session.id);
      router.push('/account');
      return;
    } catch (error) {
      if (isApiError(error, 'SESSION_NOT_FULL')) {
        setIsFull(false);
        setMessage({ tone: 'info', text: 'A place just opened' });
      } else if (isApiError(error, 'ALREADY_WAITLISTED')) {
        setIsWaitlisted(true);
        setMessage({ tone: 'info', text: "You're already on the waitlist" });
      } else {
        handleCommonError(error);
      }
    }
    setIsLoading(false);
  }

  function renderAction() {
    if (isBooked) {
      return (
        <Button href={bookingId ? `/bookings/${bookingId}` : '/account'} variant="secondary" size="lg" fullWidth>
          You&apos;re booked ✓
        </Button>
      );
    }
    if (hasStarted) {
      return (
        <Button size="lg" fullWidth disabled>
          Already started
        </Button>
      );
    }
    if (needsLogin) {
      return (
        <Button href={loginHref} size="lg" fullWidth>
          Log in to book
        </Button>
      );
    }
    if (isWaitlisted) {
      return (
        <Button href="/account" variant="secondary" size="lg" fullWidth>
          {waitlistPosition ? `You're #${waitlistPosition} on the waitlist` : "You're on the waitlist"}
        </Button>
      );
    }
    if (isFull) {
      return (
        <Button size="lg" fullWidth onClick={handleJoinWaitlist} isLoading={isLoading} loadingLabel="Joining…">
          Join waitlist
        </Button>
      );
    }
    return (
      <Button size="lg" fullWidth onClick={handleBook} isLoading={isLoading} loadingLabel="Booking…">
        Book
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {message && <Notice tone={message.tone}>{message.text}</Notice>}
      {renderAction()}
      {isBooked && (
        <p className="text-center text-sm text-ink-500">It&apos;s in My bookings. Pay at the studio.</p>
      )}
      {!isBooked && isFull && !hasStarted && !isWaitlisted && (
        <p className="text-center text-sm text-ink-500">We&apos;ll book you in automatically if a place opens.</p>
      )}
    </div>
  );
}
