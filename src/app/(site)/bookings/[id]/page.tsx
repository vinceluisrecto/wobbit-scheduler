import type { Metadata } from 'next';
import { BookingDetail } from '@/components/bookings';

export const metadata: Metadata = { title: 'Your booking' };

export default async function BookingPage({ params, searchParams }: PageProps<'/bookings/[id]'>) {
  const [{ id }, { booked }] = await Promise.all([params, searchParams]);
  return <BookingDetail bookingId={id} justBooked={booked === '1'} />;
}
