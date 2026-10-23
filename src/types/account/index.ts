import type { BookingWithSession } from '../bookings';
import type { WaitlistEntryWithSession } from '../waitlist';

export interface MyBookingsResponse {
  upcoming: { bookings: BookingWithSession[]; waitlist: WaitlistEntryWithSession[] };
  past: { bookings: BookingWithSession[] };
}
