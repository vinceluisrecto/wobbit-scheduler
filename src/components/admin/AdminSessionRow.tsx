'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { Badge, Button, Notice, Skeleton } from '@/components/ui';
import type { AdminSessionDetailResponse, AdminSessionSummary } from '@/types/admin';
import { cn } from '@/utils/cn';
import { formatPrice } from '@/utils/format-price';
import { formatSessionTime } from '@/utils/format-session-time';
import { CapacityBar } from './CapacityBar';
import { SessionRoster } from './SessionRoster';

export type RowDetail =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: AdminSessionDetailResponse };

export interface AdminSessionRowProps {
  session: AdminSessionSummary;
  /** Undefined until the row is expanded for the first time. */
  detail?: RowDetail;
  isExpanded: boolean;
  /** Just created or edited: outlined and scrolled into view. */
  isHighlighted: boolean;
  onToggle: () => void;
  /** Refetches this class's detail and counts. */
  onChanged: () => Promise<void>;
  /** Opens the edit form. Absent for classes that have started (they can't be edited). */
  onEdit?: () => void;
}

/** One class: everything that matters at a glance, and its roster inline on expand (no page change). */
export function AdminSessionRow({
  session,
  detail,
  isExpanded,
  isHighlighted,
  onToggle,
  onChanged,
  onEdit,
}: AdminSessionRowProps) {
  const rowRef = useRef<HTMLLIElement>(null);
  const regionId = `session-${session.id}-roster`;

  useEffect(() => {
    if (isHighlighted) rowRef.current?.scrollIntoView?.({ block: 'center' });
  }, [isHighlighted]);

  return (
    <li
      ref={rowRef}
      data-highlighted={isHighlighted || undefined}
      className={cn(
        'overflow-hidden rounded-control border bg-white transition-shadow duration-(--duration-base)',
        isHighlighted ? 'border-success-500 ring-2 ring-success-500' : 'border-ink-200',
      )}
    >
      <button
        type="button"
        aria-expanded={isExpanded}
        aria-controls={regionId}
        onClick={onToggle}
        className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 p-4 text-left transition-colors duration-(--duration-fast) hover:bg-ink-50 md:grid-cols-[5rem_minmax(0,1fr)_10rem_minmax(0,16rem)_auto] md:gap-x-4"
      >
        <span className="self-start md:self-center">
          <span className="block text-base font-bold text-ink-900 tabular-nums">{formatSessionTime(session.startsAt)}</span>
          <span className="block text-xs text-ink-500">{session.durationMinutes} min</span>
        </span>
        <span className="min-w-0 self-start md:self-center">
          <span className="block truncate font-semibold text-ink-900">{session.title}</span>
          <span className="block truncate text-sm text-ink-600">{session.instructor}</span>
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'inline-flex size-11 items-center justify-center self-start text-ink-500 transition-transform duration-(--duration-base) md:order-last md:self-center',
            isExpanded && 'rotate-180',
          )}
        >
          <svg viewBox="0 0 20 20" fill="none" className="size-5">
            <path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="col-span-3 md:col-span-1">
          <CapacityBar booked={session.bookedCount} capacity={session.capacity} />
        </span>
        <span className="col-span-3 flex flex-wrap gap-1.5 md:col-span-1">
          <SessionMarkers session={session} />
        </span>
      </button>

      {/* Functional disclosure: grid rows 0fr → 1fr. `inert` keeps the collapsed roster out of the tab order. */}
      <div
        id={regionId}
        role="region"
        aria-label={`${session.title} roster`}
        inert={!isExpanded}
        className={cn(
          'grid transition-[grid-template-rows] duration-(--duration-base) ease-out-soft motion-reduce:transition-none',
          isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0 overflow-hidden">
          {detail && (
            <div className="border-t border-ink-200 bg-ink-50 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <p className="mr-auto text-sm text-ink-600">
                  {formatPrice(session.priceCents)} · {session.capacity} places
                </p>
                {onEdit && (
                  <Button variant="secondary" size="sm" onClick={onEdit}>
                    Edit class
                  </Button>
                )}
                <Link
                  href={`/admin/sessions/${session.id}`}
                  className="inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-ink-700 hover:bg-ink-100 hover:text-ink-900"
                >
                  Open page
                </Link>
              </div>
              <RowRoster detail={detail} onChanged={onChanged} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function RowRoster({ detail, onChanged }: { detail: RowDetail; onChanged: () => Promise<void> }) {
  if (detail.status === 'loading') {
    return (
      <div aria-busy="true" aria-label="Loading roster" className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-16 w-full" shape="block" />
        <Skeleton className="h-16 w-full" shape="block" />
      </div>
    );
  }
  if (detail.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-2">
        <Notice tone="danger">We couldn&apos;t load this roster.</Notice>
        <Button variant="secondary" size="sm" onClick={() => void onChanged()}>
          Try again
        </Button>
      </div>
    );
  }
  return <SessionRoster detail={detail.data} onChanged={onChanged} />;
}

/** waitlist count, paid count, and the ⚠ Unpaid / Refund due markers. Green paid, amber unpaid/waitlist, red refund. */
export function SessionMarkers({ session }: { session: AdminSessionSummary }) {
  const unpaid = session.bookedCount - session.paidCount;
  return (
    <>
      <Badge tone={session.waitlistCount > 0 ? 'warning' : 'neutral'}>{session.waitlistCount} waiting</Badge>
      <Badge tone={session.paidCount > 0 ? 'success' : 'neutral'}>{session.paidCount} paid</Badge>
      {unpaid > 0 && <Badge tone="warning">⚠ {unpaid} unpaid</Badge>}
      {session.refundDueCount > 0 && (
        <Badge tone="danger">
          {session.refundDueCount === 1 ? 'Refund due' : `${session.refundDueCount} refunds due`}
        </Badge>
      )}
    </>
  );
}
