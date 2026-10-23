'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { getMe, logout } from '@/api/auth';
import { Button, Notice, Spinner } from '@/components/ui';
import { STUDIO_NAME } from '@/constants/studio';
import { ADMIN_LOGIN_PATH, redirectIfSignedOut } from './redirect-if-signed-out';
import { replaceScheduleParams, SCHEDULE_PATH } from './schedule-url';

export interface AdminShellProps {
  children: ReactNode;
}

type GuardState = { status: 'checking' } | { status: 'error' } | { status: 'ready' };

/**
 * The admin guard and sticky header. It shows a loading state until /auth/me answers, and only an
 * admin sees the pages. Every admin endpoint checks the role again: the API is the real security.
 */
export function AdminShell({ children }: AdminShellProps) {
  const router = useRouter();
  const [guard, setGuard] = useState<GuardState>({ status: 'checking' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let isCurrent = true;
    getMe()
      .then((user) => {
        if (!isCurrent) return;
        if (!user) router.replace(ADMIN_LOGIN_PATH);
        else if (user.role !== 'admin') router.replace(`${ADMIN_LOGIN_PATH}?reason=forbidden`);
        else setGuard({ status: 'ready' });
      })
      .catch((error: unknown) => {
        if (!isCurrent || redirectIfSignedOut(error, router)) return;
        setGuard({ status: 'error' });
      });
    return () => {
      isCurrent = false;
    };
  }, [router, attempt]);

  if (guard.status === 'checking') {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center gap-2 text-sm text-ink-600">
        <Spinner />
        Checking your account…
      </div>
    );
  }

  if (guard.status === 'error') {
    return (
      <div className="mx-auto flex max-w-md flex-col items-start gap-3 px-4 py-20">
        <Notice tone="danger">We couldn&apos;t check your account. Check your connection and try again.</Notice>
        <Button
          variant="secondary"
          onClick={() => {
            setGuard({ status: 'checking' });
            setAttempt((count) => count + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <AdminHeader />
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:px-6">{children}</main>
    </div>
  );
}

function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleNewClass() {
    if (pathname === SCHEDULE_PATH) replaceScheduleParams({ new: '1', edit: null });
    else router.push(`${SCHEDULE_PATH}?new=1`);
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Already logged out or unreachable: the login page is the right place either way.
    }
    router.replace(ADMIN_LOGIN_PATH);
  }

  // Mobile: two rows of exactly h-14 (7rem); md+: one h-16 row. Sticky day headings sit below it.
  return (
    <header className="sticky top-0 z-30 border-b border-ink-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 px-4 sm:px-6 md:h-16 md:flex-nowrap">
        <div className="flex h-14 w-full items-center justify-between gap-2 md:contents">
          <Link
            href={SCHEDULE_PATH}
            className="flex min-h-11 shrink-0 items-center gap-2 font-display text-base font-bold text-ink-900"
          >
            <span aria-hidden="true" className="size-5 rounded-full bg-ink-900" />
            <span className="hidden sm:inline">{STUDIO_NAME}</span>
            <span className="rounded-md bg-ink-100 px-1.5 py-0.5 text-xs font-semibold text-ink-700">Admin</span>
          </Link>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2 md:order-last">
            <Button size="sm" onClick={handleNewClass}>
              + New class
            </Button>
            {/* No longer loading label: the button must keep its width so the header fits at 375px. */}
            <Button variant="ghost" size="sm" onClick={handleLogout} isLoading={isLoggingOut}>
              Log out
            </Button>
          </div>
        </div>
        <div className="flex h-14 w-full items-center md:h-auto md:max-w-md md:flex-1">
          {/* useSearchParams needs a Suspense boundary when the page is prerendered. */}
          <Suspense fallback={<SearchInput value="" onChange={() => undefined} />}>
            <AdminSearch />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

function AdminSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get('q') ?? '');

  function handleChange(next: string) {
    setValue(next);
    if (pathname === SCHEDULE_PATH) replaceScheduleParams({ q: next.trim() ? next : null });
    else router.push(`${SCHEDULE_PATH}?q=${encodeURIComponent(next)}`);
  }

  return <SearchInput value={value} onChange={handleChange} />;
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchInput({ value, onChange }: SearchInputProps) {
  return (
    <div className="relative w-full">
      <label htmlFor="admin-search" className="sr-only">
        Search classes and members
      </label>
      <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-400">
        <svg viewBox="0 0 20 20" fill="none" className="size-4">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" />
          <path d="m14 14 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
      <input
        id="admin-search"
        type="search"
        autoComplete="off"
        placeholder="Search class, instructor or member"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-control border border-ink-200 bg-ink-50 pr-3 pl-9 text-base text-ink-900 placeholder:text-ink-400 hover:border-ink-300 focus:border-ink-500 focus:bg-white sm:text-sm"
      />
    </div>
  );
}
