'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { deleteSession, getAdminSession } from '@/api/admin';
import { isApiError } from '@/api/client';
import { Button, ConfirmButton, Notice, Skeleton } from '@/components/ui';
import type { AdminSessionDetailResponse } from '@/types/admin';
import { formatPrice } from '@/utils/format-price';
import { formatSessionDateTime } from '@/utils/format-session-time';
import { SessionMarkers } from './AdminSessionRow';
import { CapacityBar } from './CapacityBar';
import { redirectIfSignedOut } from './redirect-if-signed-out';
import { SCHEDULE_PATH } from './schedule-url';
import { SessionRoster } from './SessionRoster';

export interface AdminSessionDetailProps {
  sessionId: string;
}

type DetailState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; detail: AdminSessionDetailResponse };

/** /admin/sessions/[id]: the class info and the same roster as the expanded row, plus Edit and Delete. */
export function AdminSessionDetail({ sessionId }: AdminSessionDetailProps) {
  const router = useRouter();
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [attempt, setAttempt] = useState(0);

  // Resolves to the next state, or null after redirecting to the login page.
  const fetchDetail = useCallback(async (): Promise<DetailState | null> => {
    try {
      return { status: 'ready', detail: await getAdminSession(sessionId) };
    } catch (error) {
      if (redirectIfSignedOut(error, router)) return null;
      const isMissing = isApiError(error, 'SESSION_NOT_FOUND') || isApiError(error, 'VALIDATION_ERROR');
      return { status: isMissing ? 'not-found' : 'error' };
    }
  }, [sessionId, router]);

  useEffect(() => {
    let isCurrent = true;
    void fetchDetail().then((next) => {
      if (isCurrent && next) setState(next);
    });
    return () => {
      isCurrent = false;
    };
  }, [fetchDetail, attempt]);

  // After any roster action (or a refused delete): refetch and show the current class. No optimistic updates.
  const refresh = useCallback(async () => {
    const next = await fetchDetail();
    if (next) setState(next);
  }, [fetchDetail]);

  async function handleDelete() {
    setDeleteError(null);
    try {
      await deleteSession(sessionId);
      router.push(SCHEDULE_PATH);
    } catch (error) {
      if (redirectIfSignedOut(error, router)) return;
      setDeleteError(
        isApiError(error, 'SESSION_HAS_BOOKINGS')
          ? "This class can't be deleted: it has (or had) bookings or waitlist entries."
          : "Couldn't delete the class. Try again.",
      );
      // Someone may have booked meanwhile: show the current roster.
      await refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={SCHEDULE_PATH}
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-ink-600 hover:text-ink-900"
      >
        <span aria-hidden="true">←</span> Schedule
      </Link>

      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading class" className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-40 w-full" shape="block" />
        </div>
      )}

      {state.status === 'not-found' && (
        <div className="flex flex-col items-start gap-3">
          <h1 className="font-display text-2xl font-bold text-ink-900">We can&apos;t find that class</h1>
          <Button href={SCHEDULE_PATH} variant="secondary">
            Back to the schedule
          </Button>
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-col items-start gap-3">
          <Notice tone="danger">We couldn&apos;t load this class. Check your connection and try again.</Notice>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: 'loading' });
              setAttempt((count) => count + 1);
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' && (
        <ClassDetail
          detail={state.detail}
          deleteError={deleteError}
          onDelete={handleDelete}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

interface ClassDetailProps {
  detail: AdminSessionDetailResponse;
  deleteError: string | null;
  onDelete: () => Promise<void>;
  onChanged: () => Promise<void>;
}

function ClassDetail({ detail, deleteError, onDelete, onChanged }: ClassDetailProps) {
  const { session } = detail;
  const [now] = useState(() => Date.now());
  const hasStarted = new Date(session.startsAt).getTime() <= now;
  // The server only deletes a class that never had a booking or waitlist row; this hides the button
  // when there visibly are some. SESSION_HAS_BOOKINGS still covers removed waitlist history.
  const canDelete = detail.bookings.length === 0 && detail.waitlist.length === 0;

  return (
    <>
      <div className="flex flex-col gap-4 rounded-control border border-ink-200 bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-600">{formatSessionDateTime(session.startsAt)}</p>
            <h1 className="font-display text-2xl font-bold text-ink-900">{session.title}</h1>
            <p className="text-ink-600">with {session.instructor}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!hasStarted && (
              <Button href={`${SCHEDULE_PATH}/${session.id}/edit`} variant="secondary" size="sm">
                Edit class
              </Button>
            )}
            {canDelete && (
              <ConfirmButton
                size="sm"
                label="Delete class"
                confirmLabel="Confirm delete"
                keepLabel="Keep"
                loadingLabel="Deleting…"
                onConfirm={onDelete}
              />
            )}
          </div>
        </div>
        {deleteError && <Notice tone="danger">{deleteError}</Notice>}
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Fact label="Length">{session.durationMinutes} min</Fact>
          <Fact label="Price">{formatPrice(session.priceCents)}</Fact>
          <Fact label="Booked">
            <CapacityBar booked={session.bookedCount} capacity={session.capacity} />
          </Fact>
          <Fact label="Status">{hasStarted ? 'Started' : 'Upcoming'}</Fact>
        </dl>
        <div className="flex flex-wrap gap-1.5">
          <SessionMarkers session={session} />
        </div>
      </div>

      <SessionRoster detail={detail} onChanged={onChanged} />
    </>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</dt>
      <dd className="mt-1 font-semibold text-ink-900">{children}</dd>
    </div>
  );
}
