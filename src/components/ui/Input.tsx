import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'className'> {
  label: string;
  /** Shown under the field in red, and linked with aria-describedby. */
  error?: string;
  /** Help text under the field, linked with aria-describedby. */
  hint?: string;
  id?: string;
}

/**
 * A labeled text input. Pass the right `type`, `inputMode` and `autoComplete`
 * so phones show the right keyboard (e.g. type="email", autoComplete="email").
 */
export function Input({ label, error, hint, id, ...inputProps }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink-800">
        {label}
      </label>
      <input
        {...inputProps}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          'min-h-12 w-full rounded-control border bg-white px-4 text-base text-ink-900 shadow-sm transition-colors duration-(--duration-fast) placeholder:text-ink-400 focus:outline-none focus-visible:ring-4',
          error
            ? 'border-danger-700 focus-visible:ring-danger-100'
            : 'border-ink-200 hover:border-ink-300 focus-visible:border-brand-600 focus-visible:ring-brand-100',
        )}
      />
      {hint && (
        <p id={hintId} className="text-sm text-ink-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm font-medium text-danger-700">
          {error}
        </p>
      )}
    </div>
  );
}
