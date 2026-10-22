import Link from 'next/link';
import { Button } from '@/components/ui';

const navLinks = [
  { href: '#features', label: 'Features' },
  { href: '#get-started', label: 'Get started' },
];

export function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-slate-900">
          Wobbit
        </Link>
        <nav className="flex items-center gap-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block"
            >
              {link.label}
            </a>
          ))}
          <Button href="#get-started" size="sm">
            Sign up
          </Button>
        </nav>
      </div>
    </header>
  );
}
