import { apiRequest } from '@/api/client';
import type { MyBookingsResponse } from '@/types/account';

export async function getMyBookings(): Promise<MyBookingsResponse> {
  return apiRequest<MyBookingsResponse>('/account/bookings');
}
