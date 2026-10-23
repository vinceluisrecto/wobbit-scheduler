import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** success = paid/confirmed, warning = unpaid/waitlist/filling fast, danger = cancelled/refund due/full. */
export type BadgeTone = 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger';

export interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  /** A leading dot. "pulse" adds the subtle CSS pulse (e.g. "Filling fast"). */
  dot?: 'static' | 'pulse';
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700',
  accent: 'bg-accent-50 text-accent-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
};

export function Badge({ children, tone = 'neutral', dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
      )}
    >
      {dot && (
        <span aria-hidden="true" className="relative inline-flex size-2">
          {dot === 'pulse' && (
            <span className="absolute inline-flex size-full animate-pulse-dot rounded-full bg-current" />
          )}
          <span className="relative inline-flex size-2 rounded-full bg-current" />
        </span>
      )}
      {children}
    </span>
  );
}
