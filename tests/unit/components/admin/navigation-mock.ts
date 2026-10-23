import { useMemo, useSyncExternalStore } from 'react';
import { vi } from 'vitest';

// A stand-in for next/navigation. Like the real router, useSearchParams and usePathname follow
// window.history.replaceState, which the admin header and schedule use to share ?q=, ?new= and ?edit=.

export const router = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
};

const listeners = new Set<() => void>();
const originalReplaceState = window.history.replaceState.bind(window.history);

window.history.replaceState = (...args: Parameters<History['replaceState']>) => {
  originalReplaceState(...args);
  listeners.forEach((listener) => listener());
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Sets the current URL (path and query) before rendering. */
export function setUrl(url: string) {
  window.history.replaceState(null, '', url);
}

export const navigationModule = {
  useRouter: () => router,
  usePathname: () => useSyncExternalStore(subscribe, () => window.location.pathname),
  useSearchParams: () => {
    const search = useSyncExternalStore(subscribe, () => window.location.search);
    return useMemo(() => new URLSearchParams(search), [search]);
  },
  redirect: vi.fn(),
};
