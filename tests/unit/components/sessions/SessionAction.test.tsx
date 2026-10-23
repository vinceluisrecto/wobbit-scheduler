import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/api/client';
import type { ApiErrorCode } from '@/types/shared';
import { deferred, inHours, makeSession } from '../fixtures';

const { push, createBooking, joinWaitlist } = vi.hoisted(() => ({
  push: vi.fn(),
  createBooking: vi.fn(),
  joinWaitlist: vi.fn(),
}));
const router = { push, replace: vi.fn(), refresh: vi.fn() }; // stable, like Next's real router
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/api/bookings', () => ({ createBooking }));
vi.mock('@/api/waitlist', () => ({ joinWaitlist }));

const { SessionAction } = await import('@/components/sessions');

const conflict = (code: ApiErrorCode) => new ApiError(code, code, 409);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SessionAction', () => {
  it('logged out: links to log in and come back', () => {
    render(<SessionAction session={makeSession()} isLoggedIn={false} />);
    expect(screen.getByRole('link', { name: 'Log in to book' })).toHaveAttribute(
      'href',
      '/login?next=%2Fsessions%2Fsession-1',
    );
  });

  it('already started: a disabled button', () => {
    render(<SessionAction session={makeSession({ startsAt: inHours(-1) })} isLoggedIn />);
    expect(screen.getByRole('button', { name: 'Already started' })).toBeDisabled();
  });

  it('known booking: "You\'re booked ✓" links to it', () => {
    render(<SessionAction session={makeSession()} isLoggedIn bookingId="booking-9" />);
    expect(screen.getByRole('link', { name: "You're booked ✓" })).toHaveAttribute('href', '/bookings/booking-9');
  });

  it('known waitlist spot: shows the position', () => {
    render(<SessionAction session={makeSession({ isFull: true, spotsLeft: 0 })} isLoggedIn waitlistPosition={3} />);
    expect(screen.getByRole('link', { name: "You're #3 on the waitlist" })).toHaveAttribute('href', '/account');
  });

  it('Book: sets loading first, then redirects to the booking only on success', async () => {
    const pending = deferred<{ id: string }>();
    createBooking.mockReturnValue(pending.promise);
    render(<SessionAction session={makeSession()} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(screen.getByRole('button', { name: 'Booking…' })).toBeDisabled();
    expect(createBooking).toHaveBeenCalledWith('session-1');
    expect(push).not.toHaveBeenCalled();

    await act(async () => pending.resolve({ id: 'booking-7' }));
    expect(push).toHaveBeenCalledWith('/bookings/booking-7?booked=1');
  });

  it('Join waitlist: redirects to My bookings on success', async () => {
    joinWaitlist.mockResolvedValue({ id: 'entry-1' });
    render(<SessionAction session={makeSession({ isFull: true, spotsLeft: 0 })} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Join waitlist' }));

    expect(screen.getByRole('button', { name: 'Joining…' })).toBeDisabled();
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/account'));
    expect(joinWaitlist).toHaveBeenCalledWith('session-1');
  });

  it('ALREADY_BOOKED: shows "You\'re booked ✓" with a link to My bookings', async () => {
    createBooking.mockRejectedValue(conflict('ALREADY_BOOKED'));
    render(<SessionAction session={makeSession()} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByRole('link', { name: "You're booked ✓" })).toHaveAttribute('href', '/account');
    expect(push).not.toHaveBeenCalled();
  });

  it('SESSION_FULL: says it just filled up and switches to Join waitlist', async () => {
    createBooking.mockRejectedValue(conflict('SESSION_FULL'));
    render(<SessionAction session={makeSession()} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByText('This class just filled up')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Join waitlist' })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('SESSION_NOT_FULL: says a place opened and switches to Book', async () => {
    joinWaitlist.mockRejectedValue(conflict('SESSION_NOT_FULL'));
    render(<SessionAction session={makeSession({ isFull: true, spotsLeft: 0 })} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Join waitlist' }));

    expect(await screen.findByText('A place just opened')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book' })).toBeEnabled();
  });

  it("ALREADY_WAITLISTED: says you're already on the waitlist", async () => {
    joinWaitlist.mockRejectedValue(conflict('ALREADY_WAITLISTED'));
    render(<SessionAction session={makeSession({ isFull: true, spotsLeft: 0 })} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Join waitlist' }));

    expect(await screen.findByText("You're already on the waitlist")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('SESSION_PAST: says the class has started and disables the action', async () => {
    createBooking.mockRejectedValue(conflict('SESSION_PAST'));
    render(<SessionAction session={makeSession()} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByText('This class has already started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Already started' })).toBeDisabled();
  });

  it.each([
    ['a 500', new ApiError('INTERNAL_ERROR', 'Boom', 500)],
    ['a network failure', new ApiError('INTERNAL_ERROR', 'Could not reach the server', 0)],
  ])('%s: says nothing was saved and lets you retry', async (_label, error) => {
    createBooking.mockRejectedValue(error);
    render(<SessionAction session={makeSession()} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong, nothing was saved');
    expect(screen.getByRole('button', { name: 'Book' })).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('UNAUTHORIZED (session expired): asks to log in again', async () => {
    createBooking.mockRejectedValue(new ApiError('UNAUTHORIZED', 'Log in', 401));
    render(<SessionAction session={makeSession()} isLoggedIn />);

    fireEvent.click(screen.getByRole('button', { name: 'Book' }));

    expect(await screen.findByRole('link', { name: 'Log in to book' })).toBeInTheDocument();
  });
});
