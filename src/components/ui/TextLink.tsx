import Link from 'next/link';
import type { ReactNode } from 'react';

export interface TextLinkProps {
  href: string;
  children: ReactNode;
}

/** An inline text link in the brand color, with a 44px tap target. */
export function TextLink({ href, children }: TextLinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline-offset-4 hover:text-brand-800 hover:underline"
    >
      {children}
    </Link>
  );
}
