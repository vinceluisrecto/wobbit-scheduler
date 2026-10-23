import { updatePayment as updatePaymentInDb } from '../../../../src/repositories/admin';
import { updatePayment } from '../../../../src/services/admin';
import { BookingNotFoundError } from '../../../../src/utils/errors';
import { makeBooking } from '../fixtures';

jest.mock('../../../../src/repositories/admin');

describe('admin payments service', () => {
  it('returns the updated booking', async () => {
    const booking = makeBooking({ paymentStatus: 'paid', paidAt: '2029-12-01T00:00:00.000Z' });
    jest.mocked(updatePaymentInDb).mockResolvedValue(booking);

    await expect(updatePayment('booking-1', 'paid')).resolves.toBe(booking);
    expect(updatePaymentInDb).toHaveBeenCalledWith('booking-1', 'paid');
  });

  it('throws BOOKING_NOT_FOUND when the booking does not exist', async () => {
    jest.mocked(updatePaymentInDb).mockResolvedValue(null);
    await expect(updatePayment('missing', 'unpaid')).rejects.toBeInstanceOf(BookingNotFoundError);
  });
});
