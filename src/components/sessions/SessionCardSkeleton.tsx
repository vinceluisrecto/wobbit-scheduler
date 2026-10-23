import { Skeleton } from '@/components/ui';

/** Matches SessionCard's layout, so nothing jumps when the real cards arrive. */
export function SessionCardSkeleton() {
  return (
    <div className="flex flex-col rounded-card border border-ink-200/70 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-6 w-24" shape="pill" />
      </div>
      <Skeleton className="mt-2 h-9 w-32" />
      <Skeleton className="mt-4 h-5 w-44" />
      <Skeleton className="mt-2 h-4 w-36" />
      <div className="mt-5 flex justify-between border-t border-ink-100 pt-4">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}
