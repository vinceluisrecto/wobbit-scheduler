import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { updatePayment } from '@/api/admin';
import { cancelBooking } from '@/api/bookings';
import { ApiError } from '@/api/client';
import { leaveWaitlist } from '@/api/waitlist';
import { SessionRoster } from '@/components/admin';
import { makeBooking, makeDetail, makeWaitlistEntry, NOW } from './fixtures';
import { router } from './navigation-mock';

vi.mock('next/navigation', async () => (await import('./navigation-mock')).navigationModule);
vi.mock('@/api/admin', () => ({ updatePayment: vi.fn() }));
vi.mock('@/api/bookings', () => ({ cancelBooking: vi.fn() }));
vi.mock('@/api/waitlist', () => ({ leaveWaitlist: vi.fn() }));

const maya = makeBooking();

describe('SessionRoster', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    vi.mocked(updatePayment).mockReset();
    vi.mocked(cancelBooking).mockReset();
    vi.mocked(leaveWaitlist).mockReset();
    router.replace.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists the confirmed roster with name, email, and payment', () => {
    render(<SessionRoster detail={makeDetail()} onChanged={vi.fn()} />);

    const roster = screen.getByRole('region', { name: 'Roster' });
    expect(within(roster).getByText('Maya Santos')).toBeInTheDocument();
    expect(within(roster).getByText('maya@example.com')).toBeInTheDocument();
    expect(within(roster).getByText(/^Booked /)).toBeInTheDocument();
    expect(within(roster).getByText('Unpaid')).toBeInTheDocument();
  });

  it('marks a booking paid in one click, then refetches the class', async () => {
    vi.mocked(updatePayment).mockResolvedValue({} as never);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<SessionRoster detail={makeDetail()} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark paid: Maya Santos' }));

    expect(await screen.findByText('Marked paid')).toBeInTheDocument();
    expect(updatePayment).toHaveBeenCalledWith(maya.id, 'paid');
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('gives keyboard focus back to the payment button after it finishes loading', async () => {
    vi.mocked(updatePayment).mockResolvedValue({} as never);
    render(<SessionRoster detail={makeDetail()} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    const button = screen.getByRole('button', { name: 'Mark paid: Maya Santos' });
    button.focus();
    fireEvent.click(button);
    await screen.findByText('Marked paid');

    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark paid: Maya Santos' })).toHaveFocus());
  });

  it('marks a paid booking unpaid', async () => {
    vi.mocked(updatePayment).mockResolvedValue({} as never);
    const detail = makeDetail({ bookings: [makeBooking({ paymentStatus: 'paid', paidAt: NOW.toISOString() })] });
    render(<SessionRoster detail={detail} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText('Paid')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark unpaid: Maya Santos' }));

    await waitFor(() => expect(updatePayment).toHaveBeenCalledWith(maya.id, 'unpaid'));
  });

  it('needs a second click to cancel, and uses the shared cancelBooking', async () => {
    vi.mocked(cancelBooking).mockResolvedValue({} as never);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<SessionRoster detail={makeDetail()} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    expect(cancelBooking).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));

    await waitFor(() => expect(cancelBooking).toHaveBeenCalledWith(maya.id));
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('moves focus to the cancelled line after a cancel, so keyboard users keep their place', async () => {
    vi.mocked(cancelBooking).mockResolvedValue({} as never);
    const { rerender } = render(<SessionRoster detail={makeDetail()} onChanged={vi.fn()} />);
    const cancelledDetail = makeDetail({
      bookings: [makeBooking({ status: 'cancelled', cancelledAt: NOW.toISOString(), cancelledBy: 'admin' })],
    });
    const onChanged = vi.fn(async () => {
      rerender(<SessionRoster detail={cancelledDetail} onChanged={onChanged} />);
    });
    rerender(<SessionRoster detail={makeDetail()} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));

    const cancelled = await screen.findByRole('region', { name: 'Cancelled' });
    await waitFor(() => expect(within(cancelled).getByRole('button', { name: 'Mark paid: Maya Santos' })).toHaveFocus());
  });

  it('backs out of a cancel with Keep', () => {
    render(<SessionRoster detail={makeDetail()} onChanged={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));

    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
    expect(cancelBooking).not.toHaveBeenCalled();
  });

  it('shows an API error next to the booking', async () => {
    vi.mocked(cancelBooking).mockRejectedValue(new ApiError('SESSION_PAST', 'This class has already started', 409));
    render(<SessionRoster detail={makeDetail()} onChanged={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel booking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm cancel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This class has already started');
  });

  it('goes to the admin login when the session expired', async () => {
    vi.mocked(updatePayment).mockRejectedValue(new ApiError('UNAUTHORIZED', 'You need to log in', 401));
    render(<SessionRoster detail={makeDetail()} onChanged={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mark paid: Maya Santos' }));

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/admin/login?reason=expired'));
  });

  it('shows "Refund due" for a cancelled paid booking, with the toggle to mark the refund done', async () => {
    vi.mocked(updatePayment).mockResolvedValue({} as never);
    const cancelledPaid = makeBooking({
      status: 'cancelled',
      cancelledAt: NOW.toISOString(),
      cancelledBy: 'admin',
      paymentStatus: 'paid',
      paidAt: NOW.toISOString(),
    });
    render(<SessionRoster detail={makeDetail({ bookings: [cancelledPaid] })} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    const cancelled = screen.getByRole('region', { name: 'Cancelled' });
    expect(within(cancelled).getByText('Refund due')).toBeInTheDocument();
    expect(within(cancelled).getByText(/by the studio/)).toBeInTheDocument();
    expect(within(cancelled).queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();

    fireEvent.click(within(cancelled).getByRole('button', { name: 'Mark refunded: Maya Santos' }));
    await waitFor(() => expect(updatePayment).toHaveBeenCalledWith(maya.id, 'unpaid'));
  });

  it('does not show "Refund due" for a cancelled unpaid booking', () => {
    const cancelledUnpaid = makeBooking({ status: 'cancelled', cancelledAt: NOW.toISOString(), cancelledBy: 'member' });
    render(<SessionRoster detail={makeDetail({ bookings: [cancelledUnpaid] })} onChanged={vi.fn()} />);

    expect(screen.queryByText('Refund due')).not.toBeInTheDocument();
    expect(screen.getByText(/by the member/)).toBeInTheDocument();
  });

  it('removes a waitlist entry after a confirm, with the shared leaveWaitlist', async () => {
    vi.mocked(leaveWaitlist).mockResolvedValue(undefined);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    const lily = makeWaitlistEntry();
    render(<SessionRoster detail={makeDetail({ waitlist: [lily] })} onChanged={onChanged} />);

    const waitlist = screen.getByRole('region', { name: 'Waitlist' });
    expect(within(waitlist).getByText('#1')).toBeInTheDocument();
    expect(within(waitlist).getByText('lily@example.com')).toBeInTheDocument();

    fireEvent.click(within(waitlist).getByRole('button', { name: 'Remove' }));
    expect(leaveWaitlist).not.toHaveBeenCalled();
    fireEvent.click(within(waitlist).getByRole('button', { name: 'Confirm remove' }));

    await waitFor(() => expect(leaveWaitlist).toHaveBeenCalledWith(lily.id));
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Lily Navarro removed from the waitlist.')).toBeInTheDocument();
  });

  it('hides cancel and remove once the class has started', () => {
    const started = makeDetail({ waitlist: [makeWaitlistEntry()] });
    started.session = { ...started.session, startsAt: new Date(NOW.getTime() - 60_000).toISOString() };
    render(<SessionRoster detail={started} onChanged={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark paid: Maya Santos' })).toBeInTheDocument();
  });
});
