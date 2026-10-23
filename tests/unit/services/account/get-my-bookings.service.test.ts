import { listBookingsByUser } from '../../../../src/repositories/bookings';
import { listUpcomingWaitlistByUser } from '../../../../src/repositories/waitlist';
import { getMyBookings } from '../../../../src/services/account';
import { makeBooking, makeWaitlistEntry } from '../fixtures';

jest.mock('../../../../src/repositories/bookings');
jest.mock('../../../../src/repositories/waitlist');

describe('getMyBookings', () => {
  it('combines upcoming bookings, upcoming waitlist and past bookings for the user', async () => {
    const upcoming = makeBooking({ id: 'up' });
    const past = makeBooking({ id: 'past' });
    const entry = makeWaitlistEntry();
    jest.mocked(listBookingsByUser).mockImplementation(async (_userId, scope) => (scope === 'upcoming' ? [upcoming] : [past]));
    jest.mocked(listUpcomingWaitlistByUser).mockResolvedValue([entry]);

    await expect(getMyBookings('member-1')).resolves.toEqual({
      upcoming: { bookings: [upcoming], waitlist: [entry] },
      past: { bookings: [past] },
    });
    expect(listBookingsByUser).toHaveBeenCalledWith('member-1', 'upcoming');
    expect(listBookingsByUser).toHaveBeenCalledWith('member-1', 'past');
    expect(listUpcomingWaitlistByUser).toHaveBeenCalledWith('member-1');
  });
});
