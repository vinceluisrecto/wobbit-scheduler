'use client';

import { useState } from 'react';
import { Button } from './Button';

type ConfirmButtonSize = 'sm' | 'md';

export interface ConfirmButtonProps {
  /** First-click label, e.g. "Cancel booking". */
  label: string;
  /** Second-click label, e.g. "Yes, cancel". */
  confirmLabel: string;
  /** Label of the button that backs out, e.g. "Keep it". */
  keepLabel?: string;
  /** Label while `onConfirm` runs, e.g. "Cancelling…". */
  loadingLabel?: string;
  /** Runs on the second click. Handle errors inside it; the button returns to its first state afterwards. */
  onConfirm: () => Promise<void>;
  size?: ConfirmButtonSize;
  disabled?: boolean;
}

/**
 * A destructive action with an inline "Confirm?" second click. Never a browser confirm().
 * Escape or the keep button backs out.
 */
export function ConfirmButton({
  label,
  confirmLabel,
  keepLabel = 'Keep it',
  loadingLabel,
  onConfirm,
  size = 'md',
  disabled = false,
}: ConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleConfirm() {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
      setIsConfirming(false);
    }
  }

  if (!isConfirming) {
    return (
      <Button variant="secondary" size={size} disabled={disabled} onClick={() => setIsConfirming(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap items-center gap-2"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !isLoading) setIsConfirming(false);
      }}
    >
      <Button
        variant="danger"
        size={size}
        autoFocus
        isLoading={isLoading}
        loadingLabel={loadingLabel}
        onClick={handleConfirm}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" size={size} disabled={isLoading} onClick={() => setIsConfirming(false)}>
        {keepLabel}
      </Button>
    </div>
  );
}
