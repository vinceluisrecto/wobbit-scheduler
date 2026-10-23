import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmButton } from '@/components/ui';
import { deferred } from '../fixtures';

function setup() {
  const pending = deferred<void>();
  const onConfirm = vi.fn(() => pending.promise);
  render(
    <ConfirmButton label="Cancel booking" confirmLabel="Yes, cancel" loadingLabel="Cancelling…" onConfirm={onConfirm} />,
  );
  return { onConfirm, pending };
}

describe('ConfirmButton', () => {
  it('needs a second click before it runs', async () => {
    const { onConfirm, pending } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Yes, cancel' })).toHaveFocus();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled();

    await act(async () => pending.resolve());
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });

  it('backs out with the keep button or Escape', () => {
    const { onConfirm } = setup();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Yes, cancel' }), { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
