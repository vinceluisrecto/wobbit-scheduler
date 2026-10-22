import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'inverse';
type ButtonSize = 'sm' | 'md';

export interface ButtonProps {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  inverse: 'bg-white text-brand-700 hover:bg-brand-50',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2',
  md: 'px-5 py-3',
};

export function Button({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className,
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        'inline-flex items-center justify-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </Link>
  );
}
