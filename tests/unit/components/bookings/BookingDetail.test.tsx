import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import { deferred, inHours, makeBooking, makeSession } from '../fixtures';

const { replace, getBooking, cancelBooking, animate, createDrawable } = vi.hoisted(() => ({
  replace: vi.fn(),
  getBooking: vi.fn(),
  cancelBooking: vi.fn(),
  animate: vi.fn(() => ({ revert: vi.fn() })),
  createDrawable: vi.fn(() => []),
}));
const router = { push: vi.fn(), replace, refresh: vi.fn() }; // stable, like Next's real router
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/api/bookings', () => ({ getBooking, cancelBooking }));
vi.mock('animejs', () => ({ animate, createDrawable, stagger: vi.fn() }));
vi.mock('@/utils/prefers-reduced-motion', () => ({ prefersReducedMotion: () => false }));

const { BookingDetail } = await import('@/components/bookings');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BookingDetail', () => {
  it('celebrates when arriving straight from booking', async () => {
    getBooking.mockResolvedValue(makeBooking());
    render(<BookingDetail bookingId="booking-1" justBooked />);

    expect(await screen.findByText("You're booked!")).toBeInTheDocument();
    expect(createDrawable).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ draw: ['0 0', '0 1'] }));
  });

  it('shows details, price, "Pay at the studio" and payment status', async () => {
    getBooking.mockResolvedValue(makeBooking());
    render(<BookingDetail bookingId="booking-1" />);

    expect(await screen.findByRole('heading', { name: 'Sunset Vinyasa' })).toBeInTheDocument();
    expect(screen.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getByText('Pay at the studio')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Unpaid')).toBeInTheDocument();
    expect(animate).not.toHaveBeenCalled();
  });

  it.each([
    ['member', 'Cancelled by you'],
    ['admin', 'Cancelled by the studio'],
  ] as const)('a booking cancelled by the %s says "%s" and has no cancel button', async (cancelledBy, label) => {
    getBooking.mockResolvedValue(
      makeBooking({ status: 'cancelled', cancelledBy, cancelledAt: new Date().toISOString() }),
    );
    render(<BookingDetail bookingId="booking-1" />);

    expect(await screen.findByText(label)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('cancels only after the inline confirm, then shows the cancelled booking', async () => {
    getBooking.mockResolvedValue(makeBooking());
    const pending = deferred<unknown>();
    cancelBooking.mockReturnValue(pending.promise);
    render(<BookingDetail bookingId="booking-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    expect(cancelBooking).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));
    expect(cancelBooking).toHaveBeenCalledWith('booking-1');
    expect(screen.getByRole('button', { name: 'Cancelling…' })).toBeDisabled();

    await act(async () =>
      pending.resolve(makeBooking({ status: 'cancelled', cancelledBy: 'member', cancelledAt: new Date().toISOString() })),
    );

    expect(screen.getByRole('status')).toHaveTextContent('Booking cancelled');
    expect(screen.getByText('Cancelled by you')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('shows the cancel error inline', async () => {
    getBooking.mockResolvedValue(makeBooking());
    cancelBooking.mockRejectedValue(new ApiError('SESSION_PAST', 'Past', 409));
    render(<BookingDetail bookingId="booking-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancel booking' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This class has already started');
  });

  it('has no cancel button once the class has started', async () => {
    getBooking.mockResolvedValue(makeBooking({ session: makeSession({ startsAt: inHours(-2) }) }));
    render(<BookingDetail bookingId="booking-1" />);

    await screen.findByText('Confirmed');
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('shows a not-found state for a missing booking or someone else\'s', async () => {
    getBooking.mockRejectedValue(new ApiError('BOOKING_NOT_FOUND', 'Not found', 404));
    render(<BookingDetail bookingId="booking-x" />);

    expect(await screen.findByText("We can't find that booking")).toBeInTheDocument();
  });

  it('sends logged-out visitors to log in', async () => {
    getBooking.mockRejectedValue(new ApiError('UNAUTHORIZED', 'Log in', 401));
    render(<BookingDetail bookingId="booking-1" />);

    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Fbookings%2Fbooking-1'));
  });
});
