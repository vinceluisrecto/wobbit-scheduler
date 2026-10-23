'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMe, logout } from '@/api/auth';
import { Button, Skeleton } from '@/components/ui';
import { STUDIO_NAME } from '@/constants/studio';
import type { User } from '@/types/auth';
import { cn } from '@/utils/cn';

const NO_RETURN_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password'];

// Come back to the current page after logging in, except from the landing and auth pages.
function loginHref(pathname: string): string {
  if (NO_RETURN_PATHS.includes(pathname)) return '/login';
  return `/login?next=${encodeURIComponent(pathname)}`;
}

type AccountState ={ status: 'loading' } | { status: 'ready'; user: User | null };

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [account, setAccount] = useState<AccountState>({ status: 'loading' });
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Re-checked on every navigation, so the menu updates right after logging in or out.
  useEffect(() => {
    let isCurrent = true;
    getMe()
      .then((user) => isCurrent && setAccount({ status: 'ready', user }))
      .catch(() => isCurrent && setAccount({ status: 'ready', user: null }));
    return () => {
      isCurrent = false;
    };
  }, [pathname]);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Already logged out (401) or unreachable: either way, show the logged-out menu.
    } finally {
      setIsLoggingOut(false);
      setAccount({ status: 'ready', user: null });
      router.push('/');
      router.refresh();
    }
  }

  const isClassesActive = pathname.startsWith('/sessions');

  return (
    <header className="sticky top-0 z-30 border-b border-ink-200/70 bg-ink-50/85 backdrop-blur-md [view-transition-name:site-header]">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-11 min-w-11 items-center gap-2 font-display text-lg font-bold tracking-tight text-ink-900"
        >
          <span aria-hidden="true" className="size-7 shrink-0 rounded-full bg-linear-to-br from-brand-500 to-accent-500" />
          {/* Just the mark on small phones, so the account menu always fits at 375px. */}
          <span className="sr-only sm:not-sr-only">{STUDIO_NAME}</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-2">
          <Link
            href="/sessions"
            aria-current={isClassesActive ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center whitespace-nowrap rounded-control px-2.5 text-sm font-semibold sm:px-3 transition-colors duration-(--duration-fast) hover:bg-ink-100',
              isClassesActive ? 'text-brand-700' : 'text-ink-700',
            )}
          >
            Classes
          </Link>

          {account.status === 'loading' && <Skeleton className="h-11 w-24" shape="block" />}

          {account.status === 'ready' && account.user && (
            <>
              <Link
                href="/account"
                aria-current={pathname === '/account' ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 items-center whitespace-nowrap rounded-control px-2.5 text-sm font-semibold sm:px-3 transition-colors duration-(--duration-fast) hover:bg-ink-100',
                  pathname === '/account' ? 'text-brand-700' : 'text-ink-700',
                )}
              >
                My bookings
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout} isLoading={isLoggingOut} loadingLabel="Logging out…">
                Log out
              </Button>
            </>
          )}

          {account.status === 'ready' && !account.user && (
            <Button href={loginHref(pathname)} size="sm">
              Log in
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
