import type { SessionSummary } from '../sessions';

export type BookingStatus = 'confirmed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid';

export interface Booking {
  id: string;
  sessionId: string;
  userId: string;
  name: string; // from the owning user
  email: string; // from the owning user
  status: BookingStatus;
  cancelledAt: string | null;
  cancelledBy: 'member' | 'admin' | null;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  createdAt: string;
}

export interface BookingWithSession extends Booking {
  session: SessionSummary;
}

export interface BookingResponse {
  booking: BookingWithSession; // create, get, cancel
}
