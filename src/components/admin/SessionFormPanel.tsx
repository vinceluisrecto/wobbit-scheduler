'use client';

import { useEffect, useRef } from 'react';
import type { AdminSessionSummary } from '@/types/admin';
import { SessionForm } from './SessionForm';

export interface SessionFormPanelProps {
  /** The class to edit. Without it, the panel creates a new class. */
  session?: AdminSessionSummary;
  onSaved: (session: AdminSessionSummary) => void;
  onClose: () => void;
}

/**
 * The class form opened in place: a slide-over panel on desktop, a full-screen sheet on mobile.
 * A native modal <dialog> traps focus, closes on Escape, and makes the page behind it inert.
 */
export function SessionFormPanel({ session, onSaved, onClose }: SessionFormPanelProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const title = session ? 'Edit class' : 'New class';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // showModal() focuses the first focusable element (the Close button); the first field is what's wanted.
    dialog.querySelector<HTMLInputElement>('input')?.focus();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="session-form-title"
      onClose={onClose}
      onClick={(event) => {
        // A click on the backdrop (the dialog element itself, outside the panel) closes it.
        if (event.target === event.currentTarget) onClose();
      }}
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto bg-white p-0 shadow-lift backdrop:bg-ink-900/40 md:left-auto md:w-md md:border-l md:border-ink-200"
    >
      <div className="flex min-h-full flex-col">
        <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-ink-200 bg-white px-4 sm:px-6">
          <h2 id="session-form-title" className="font-display text-lg font-bold text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex size-11 items-center justify-center rounded-control text-xl text-ink-600 hover:bg-ink-100 hover:text-ink-900"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <div className="p-4 sm:p-6">
          <SessionForm session={session} onSaved={onSaved} onCancel={onClose} />
        </div>
      </div>
    </dialog>
  );
}
