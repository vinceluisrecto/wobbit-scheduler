import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MyBookingsResponse } from '@/types/account';
import { inHours, makeBooking, makeSession, makeWaitlistEntry } from '../fixtures';

const { replace, getMe, getMyBookings, cancelBooking, leaveWaitlist, animate } = vi.hoisted(() => ({
  replace: vi.fn(),
  getMe: vi.fn(),
  getMyBookings: vi.fn(),
  cancelBooking: vi.fn(),
  leaveWaitlist: vi.fn(),
  animate: vi.fn(() => ({ revert: vi.fn() })),
}));
const router = { push: vi.fn(), replace, refresh: vi.fn() }; // stable, like Next's real router
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/api/auth', () => ({ getMe }));
vi.mock('@/api/account', () => ({ getMyBookings }));
vi.mock('@/api/bookings', () => ({ cancelBooking }));
vi.mock('@/api/waitlist', () => ({ leaveWaitlist }));
vi.mock('animejs', () => ({ animate, createDrawable: vi.fn(() => []), stagger: vi.fn(), onScroll: vi.fn() }));
vi.mock('@/utils/prefers-reduced-motion', () => ({ prefersReducedMotion: () => false }));

const { AccountView } = await import('@/components/account');

const upcomingBooking = makeBooking();
const promotedBooking = makeBooking({
  id: 'booking-2',
  sessionId: 'session-3',
  session: makeSession({ id: 'session-3', title: 'HIIT Burn', startsAt: inHours(72) }),
});
const waiting = makeWaitlistEntry();
const promotedEntry = makeWaitlistEntry({
  id: 'entry-2',
  sessionId: 'session-3',
  status: 'promoted',
  position: null,
  bookingId: 'booking-2',
});
const pastBooking = makeBooking({
  id: 'booking-3',
  paymentStatus: 'paid',
  paidAt: new Date().toISOString(),
  session: makeSession({ id: 'session-4', title: 'Core Strength', startsAt: inHours(-48) }),
});
const cancelledUpcoming = makeBooking({
  id: 'booking-4',
  status: 'cancelled',
  cancelledBy: 'admin',
  cancelledAt: new Date().toISOString(),
  session: makeSession({ id: 'session-5', title: 'Breathwork Basics' }),
});

const data: MyBookingsResponse = {
  upcoming: { bookings: [upcomingBooking, promotedBooking, cancelledUpcoming], waitlist: [waiting, promotedEntry] },
  past: { bookings: [pastBooking] },
};

beforeEach(() => {
  vi.clearAllMocks();
  getMe.mockResolvedValue({ id: 'user-1', name: 'Maya', email: 'maya@example.com', role: 'member' });
  getMyBookings.mockResolvedValue(data);
});

describe('AccountView', () => {
  it('sends logged-out visitors to log in', async () => {
    getMe.mockResolvedValue(null);
    render(<AccountView />);
    await vi.waitFor(() => expect(replace).toHaveBeenCalledWith('/login?next=%2Faccount'));
  });

  it('Upcoming: confirmed bookings and the waitlist position', async () => {
    render(<AccountView />);

    const panel = await screen.findByRole('tabpanel');
    expect(within(panel).getByText('Sunset Vinyasa')).toBeInTheDocument();
    expect(within(panel).getByText("You're #2 in line")).toBeInTheDocument();
    expect(within(panel).queryByText('Core Strength')).not.toBeInTheDocument();
    expect(within(panel).queryByText('Breathwork Basics')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Upcoming/ })).toHaveTextContent('3');
  });

  it('highlights a booking that came from the waitlist', async () => {
    render(<AccountView />);

    expect(await screen.findByText('You got a place!')).toBeInTheDocument();
    expect(animate).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ draw: ['0 0', '0 1'] }));
  });

  it('Past: previous classes and cancelled ones, with payment status', async () => {
    render(<AccountView />);

    fireEvent.click(await screen.findByRole('tab', { name: /Past/ }));

    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByText('Core Strength')).toBeInTheDocument();
    expect(within(panel).getByText('Paid')).toBeInTheDocument();
    expect(within(panel).getByText('Breathwork Basics')).toBeInTheDocument();
    expect(within(panel).getByText('Cancelled by the studio')).toBeInTheDocument();
    expect(within(panel).queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument();
  });

  it('cancels a booking after the confirm and refetches', async () => {
    cancelBooking.mockResolvedValue({});
    render(<AccountView />);

    const [firstCancel] = await screen.findAllByRole('button', { name: 'Cancel booking' });
    fireEvent.click(firstCancel);
    expect(cancelBooking).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, cancel' }));

    await vi.waitFor(() => expect(getMyBookings).toHaveBeenCalledTimes(2));
    expect(cancelBooking).toHaveBeenCalledWith('booking-1');
  });

  it('leaves a waitlist after the confirm and refetches', async () => {
    leaveWaitlist.mockResolvedValue(undefined);
    render(<AccountView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Leave waitlist' }));
    expect(leaveWaitlist).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, leave' }));

    await vi.waitFor(() => expect(getMyBookings).toHaveBeenCalledTimes(2));
    expect(leaveWaitlist).toHaveBeenCalledWith('entry-1');
  });

  it('refetches when the window regains focus', async () => {
    render(<AccountView />);
    await screen.findByRole('tabpanel');

    fireEvent.focus(window);

    await vi.waitFor(() => expect(getMyBookings).toHaveBeenCalledTimes(2));
  });

  it('shows empty states', async () => {
    getMyBookings.mockResolvedValue({ upcoming: { bookings: [], waitlist: [] }, past: { bookings: [] } });
    render(<AccountView />);

    expect(await screen.findByText('Nothing booked yet')).toBeInTheDocument();
  });
});
