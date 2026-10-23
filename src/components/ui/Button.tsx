import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'inverse' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Stretch to the container width. */
  fullWidth?: boolean;
  className?: string;
}

interface ButtonAsLinkProps extends ButtonBaseProps {
  href: string;
  transitionTypes?: string[];
}

interface ButtonAsButtonProps
  extends ButtonBaseProps,
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'> {
  /** Shows a spinner and `loadingLabel`, and disables the button. */
  isLoading?: boolean;
  /** Label while loading, e.g. "Booking…". The width never changes between the two labels. */
  loadingLabel?: string;
}

export type ButtonProps = ButtonAsLinkProps | ButtonAsButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-ink-200 bg-white text-ink-900 hover:border-ink-300 hover:bg-ink-50',
  inverse: 'bg-white text-brand-700 hover:bg-brand-50',
  ghost: 'text-ink-700 hover:bg-ink-100 hover:text-ink-900',
  danger: 'bg-danger-700 text-white hover:bg-danger-700/90',
};

// Every size keeps a tap target of at least 44px.
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-4 text-sm',
  md: 'min-h-12 px-5 text-sm',
  lg: 'min-h-14 px-7 text-base',
};

const baseClasses =
  'relative inline-flex select-none items-center justify-center gap-2 rounded-control font-semibold transition duration-(--duration-fast) ease-out-soft motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 motion-safe:disabled:active:scale-100';

function buttonClasses({ variant = 'primary', size = 'md', fullWidth = false, className }: ButtonBaseProps) {
  return cn(baseClasses, variantClasses[variant], sizeClasses[size], fullWidth && 'w-full', className);
}

export function Button(props: ButtonProps) {
  if ('href' in props) {
    return (
      <Link href={props.href} transitionTypes={props.transitionTypes} className={buttonClasses(props)}>
        {props.children}
      </Link>
    );
  }

  const {
    children,
    variant,
    size,
    fullWidth,
    className,
    isLoading = false,
    loadingLabel,
    disabled,
    type = 'button',
    ...buttonProps
  } = props;
  const classes = buttonClasses({ children, variant, size, fullWidth, className });

  return (
    <button
      {...buttonProps}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={classes}
    >
      {/* Both labels share one grid cell, so the button keeps the width of the longer one. */}
      <span className="grid place-items-center">
        <span
          aria-hidden={isLoading || undefined}
          className={cn('col-start-1 row-start-1 inline-flex items-center gap-2', isLoading && 'invisible')}
        >
          {children}
        </span>
        <span
          aria-hidden={!isLoading || undefined}
          className={cn('col-start-1 row-start-1 inline-flex items-center gap-2', !isLoading && 'invisible')}
        >
          <Spinner />
          {loadingLabel ?? children}
        </span>
      </span>
    </button>
  );
}
