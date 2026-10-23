export interface CapacityBarProps {
  booked: number;
  capacity: number;
}

/** booked/capacity with a small progress bar. */
export function CapacityBar({ booked, capacity }: CapacityBarProps) {
  const percent = capacity > 0 ? Math.min(100, Math.round((booked / capacity) * 100)) : 0;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-sm font-semibold text-ink-900 tabular-nums">
        {booked}/{capacity}
        <span className="sr-only"> booked</span>
      </span>
      <div
        role="progressbar"
        aria-label="Places booked"
        aria-valuemin={0}
        aria-valuemax={capacity}
        aria-valuenow={booked}
        className="h-2 w-full min-w-12 overflow-hidden rounded-full bg-ink-200"
      >
        {/* A dynamic width has no Tailwind equivalent, so this is the one inline style. */}
        <div className="h-full rounded-full bg-success-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
