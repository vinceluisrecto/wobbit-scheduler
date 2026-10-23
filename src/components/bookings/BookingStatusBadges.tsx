import { Badge } from '@/components/ui';
import type { Booking } from '@/types/bookings';

export interface BookingStatusBadgesProps {
  booking: Pick<Booking, 'status' | 'cancelledBy' | 'paymentStatus'>;
}

/** Booking status and payment status, in the shared status colors. */
export function BookingStatusBadges({ booking }: BookingStatusBadgesProps) {
  const isCancelled = booking.status === 'cancelled';
  const cancelledLabel = booking.cancelledBy === 'admin' ? 'Cancelled by the studio' : 'Cancelled by you';

  return (
    <div className="flex flex-wrap gap-2">
      {isCancelled ? <Badge tone="danger">{cancelledLabel}</Badge> : <Badge tone="success">Confirmed</Badge>}
      {booking.paymentStatus === 'paid' ? (
        <Badge tone="success">Paid</Badge>
      ) : (
        <Badge tone={isCancelled ? 'neutral' : 'warning'}>Unpaid</Badge>
      )}
    </div>
  );
}
