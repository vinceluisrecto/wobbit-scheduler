import { cn } from '@/utils/cn';

type SkeletonShape = 'line' | 'pill' | 'block';

export interface SkeletonProps {
  /** Size of the placeholder, e.g. "h-6 w-32". Use `shape` for the corners. */
  className?: string;
  /** line = text, pill = badges, block = buttons and cards. */
  shape?: SkeletonShape;
  /** "inverse" for placeholders on dark or colored backgrounds. */
  tone?: 'default' | 'inverse';
}

const shapeClasses: Record<SkeletonShape, string> = {
  line: 'rounded-md',
  pill: 'rounded-full',
  block: 'rounded-control',
};

/** A placeholder block. Build skeletons that match the final layout instead of using spinners. */
export function Skeleton({ className, shape = 'line', tone = 'default' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse',
        shapeClasses[shape],
        tone === 'inverse' ? 'bg-white/30' : 'bg-ink-200/70',
        className,
      )}
    />
  );
}
