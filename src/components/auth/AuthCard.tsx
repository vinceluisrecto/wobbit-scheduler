import type { ReactNode } from 'react';

export interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Links under the card, e.g. "New here? Sign up". */
  footer?: ReactNode;
}

/** The shared frame of the login, sign-up and password pages. */
export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <div className="relative isolate overflow-hidden px-4 py-12 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 size-[28rem] -translate-x-1/2 rounded-full bg-brand-100/80 blur-3xl"
      />
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-card border border-ink-200/70 bg-white p-6 shadow-card sm:p-8">
          <h1 className="font-display text-3xl font-bold tracking-tight text-ink-900">{title}</h1>
          {subtitle && <p className="mt-1 text-ink-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-6 text-center text-sm text-ink-600">{footer}</div>}
      </div>
    </div>
  );
}
