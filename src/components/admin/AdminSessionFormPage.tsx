'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getAdminSession } from '@/api/admin';
import { isApiError } from '@/api/client';
import { Button, Notice, Skeleton } from '@/components/ui';
import type { AdminSessionSummary } from '@/types/admin';
import { redirectIfSignedOut } from './redirect-if-signed-out';
import { SCHEDULE_PATH } from './schedule-url';
import { SessionForm } from './SessionForm';

export interface AdminSessionFormPageProps {
  /** The class to edit. Without it, the page creates a new class. */
  sessionId?: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ready'; session?: AdminSessionSummary };

/** The deep-link pages /admin/sessions/new and /admin/sessions/[id]/edit: the same SessionForm, full page. */
export function AdminSessionFormPage({ sessionId }: AdminSessionFormPageProps) {
  const router = useRouter();
  const [state, setState] = useState<LoadState>(sessionId ? { status: 'loading' } : { status: 'ready' });
  const backHref = sessionId ? `${SCHEDULE_PATH}/${sessionId}` : SCHEDULE_PATH;

  const [attempt, setAttempt] = useState(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    if (!sessionId) return;
    let isCurrent = true;
    getAdminSession(sessionId)
      .then(({ session }) => isCurrent && setState({ status: 'ready', session }))
      .catch((error: unknown) => {
        if (!isCurrent || redirectIfSignedOut(error, router)) return;
        const isMissing = isApiError(error, 'SESSION_NOT_FOUND') || isApiError(error, 'VALIDATION_ERROR');
        setState({ status: isMissing ? 'not-found' : 'error' });
      });
    return () => {
      isCurrent = false;
    };
  }, [sessionId, router, attempt]);

  const hasStarted =
    state.status === 'ready' && state.session !== undefined && new Date(state.session.startsAt).getTime() <= now;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <Link
        href={backHref}
        className="inline-flex min-h-11 items-center gap-1 self-start text-sm font-semibold text-ink-600 hover:text-ink-900"
      >
        <span aria-hidden="true">←</span> {sessionId ? 'Class' : 'Schedule'}
      </Link>
      <h1 className="font-display text-2xl font-bold text-ink-900">{sessionId ? 'Edit class' : 'New class'}</h1>

      {state.status === 'loading' && (
        <div aria-busy="true" aria-label="Loading class" className="flex flex-col gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full" shape="block" />
          ))}
        </div>
      )}
      {state.status === 'not-found' && <Notice tone="danger">We can&apos;t find that class.</Notice>}
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
      {hasStarted && <Notice tone="warning">This class has already started, so it can&apos;t be edited.</Notice>}
      {state.status === 'ready' && !hasStarted && (
        <div className="rounded-control border border-ink-200 bg-white p-4 sm:p-6">
          <SessionForm
            session={state.session}
            onSaved={(saved) => router.push(`${SCHEDULE_PATH}?saved=${saved.id}`)}
            onCancel={() => router.push(backHref)}
          />
        </div>
      )}
    </div>
  );
}
