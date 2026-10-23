import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type NoticeTone = 'info' | 'success' | 'warning' | 'danger';

export interface NoticeProps {
  children: ReactNode;
  tone?: NoticeTone;
}

const toneClasses: Record<NoticeTone, string> = {
  info: 'border-ink-200 bg-white text-ink-700',
  success: 'border-success-100 bg-success-50 text-success-700',
  warning: 'border-warning-100 bg-warning-50 text-warning-700',
  danger: 'border-danger-100 bg-danger-50 text-danger-700',
};

/**
 * Inline feedback next to the thing that changed. Errors are announced at once (role="alert"),
 * everything else politely (role="status").
 */
export function Notice({ children, tone = 'info' }: NoticeProps) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-control border px-4 py-3 text-sm font-medium', toneClasses[tone])}
    >
      {children}
    </div>
  );
}
