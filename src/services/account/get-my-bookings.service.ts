import { listBookingsByUser } from '../../repositories/bookings';
import { listUpcomingWaitlistByUser } from '../../repositories/waitlist';
import type { MyBookingsResponse } from '../../types/account';

export async function getMyBookings(userId: string): Promise<MyBookingsResponse> {
  const [upcomingBookings, upcomingWaitlist, pastBookings] = await Promise.all([
    listBookingsByUser(userId, 'upcoming'),
    listUpcomingWaitlistByUser(userId),
    listBookingsByUser(userId, 'past'),
  ]);

  return {
    upcoming: { bookings: upcomingBookings, waitlist: upcomingWaitlist },
    past: { bookings: pastBookings },
  };
}
