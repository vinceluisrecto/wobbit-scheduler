'use client';

import Link from 'next/link';
import { useState } from 'react';
import { isApiError } from '@/api/client';
import { leaveWaitlist } from '@/api/waitlist';
import { SessionInfo } from '@/components/sessions';
import { Badge, ConfirmButton, Notice } from '@/components/ui';
import type { WaitlistEntryWithSession } from '@/types/waitlist';

export interface WaitlistEntryCardProps {
  entry: WaitlistEntryWithSession;
  /** Called after the member leaves (or the entry turns out to be gone), so the list can refetch. */
  onChanged: () => void;
}

/** A waiting entry in My bookings: "You're #N in line", with Leave (inline confirm). */
export function WaitlistEntryCard({ entry, onChanged }: WaitlistEntryCardProps) {
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setError(null);
    try {
      await leaveWaitlist(entry.id);
      onChanged();
    } catch (leaveError) {
      if (isApiError(leaveError, 'WAITLIST_ENTRY_NOT_FOUND')) {
        onChanged(); // already promoted or removed: the refetch shows where it went
        return;
      }
      setError('Something went wrong, you are still on the waitlist');
    }
  }

  return (
    <article className="rounded-card border border-dashed border-warning-500/50 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href={`/sessions/${entry.session.id}`} className="min-w-0 rounded-control hover:opacity-80">
          <SessionInfo session={entry.session} />
        </Link>
        <Badge tone="warning" dot="static">
          {entry.position ? `You're #${entry.position} in line` : 'On the waitlist'}
        </Badge>
      </div>
      <p className="mt-3 text-sm text-ink-500">We&apos;ll book you in automatically if a place opens.</p>
      <div className="mt-4 flex flex-col gap-3">
        {error && <Notice tone="danger">{error}</Notice>}
        <div>
          <ConfirmButton
            label="Leave waitlist"
            confirmLabel="Yes, leave"
            keepLabel="Stay in line"
            loadingLabel="Leaving…"
            size="sm"
            onConfirm={handleLeave}
          />
        </div>
      </div>
    </article>
  );
}
