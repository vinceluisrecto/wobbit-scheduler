import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { makeWaitlistEntry } from '../fixtures';

const { leaveWaitlist } = vi.hoisted(() => ({ leaveWaitlist: vi.fn() }));
vi.mock('@/api/waitlist', () => ({ leaveWaitlist }));

const { WaitlistEntryCard } = await import('@/components/waitlist');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('WaitlistEntryCard', () => {
  it('shows the position', () => {
    render(<WaitlistEntryCard entry={makeWaitlistEntry({ position: 1 })} onChanged={vi.fn()} />);
    expect(screen.getByText("You're #1 in line")).toBeInTheDocument();
  });

  it('treats an entry that is already gone as a change (refetch shows where it went)', async () => {
    leaveWaitlist.mockRejectedValue(new ApiError('WAITLIST_ENTRY_NOT_FOUND', 'Gone', 404));
    const onChanged = vi.fn();
    render(<WaitlistEntryCard entry={makeWaitlistEntry()} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Leave waitlist' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, leave' }));

    await vi.waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });

  it('shows other errors inline', async () => {
    leaveWaitlist.mockRejectedValue(new ApiError('INTERNAL_ERROR', 'Boom', 500));
    const onChanged = vi.fn();
    render(<WaitlistEntryCard entry={makeWaitlistEntry()} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Leave waitlist' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, leave' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('you are still on the waitlist');
    expect(onChanged).not.toHaveBeenCalled();
  });
});
