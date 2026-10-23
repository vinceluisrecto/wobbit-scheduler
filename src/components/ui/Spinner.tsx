import { cn } from '@/utils/cn';

export interface SpinnerProps {
  className?: string;
}

/** A small inline spinner that inherits the text color. Decorative: pair it with a text label. */
export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn('size-4 shrink-0 animate-spin', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
