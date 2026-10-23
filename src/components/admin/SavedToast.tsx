'use client';

import { useEffect } from 'react';

export interface SavedToastProps {
  /** Shown while true. */
  isVisible: boolean;
  /** Called after a short delay, so the parent can hide it. */
  onDismiss: () => void;
}

const VISIBLE_MS = 2500;

/** The one toast in the admin area: "Saved", after a class is created or edited. */
export function SavedToast({ isVisible, onDismiss }: SavedToastProps) {
  useEffect(() => {
    if (!isVisible) return;
    const timer = window.setTimeout(onDismiss, VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [isVisible, onDismiss]);

  // The live region stays mounted so screen readers announce the text when it appears.
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
    >
      {isVisible && (
        <p className="rounded-full bg-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-lift">
          <span aria-hidden="true">✓ </span>Saved
        </p>
      )}
    </div>
  );
}
