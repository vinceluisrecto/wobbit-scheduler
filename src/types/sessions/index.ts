export interface SessionSummary {
  id: string;
  title: string;
  instructor: string;
  startsAt: string; // ISO-8601 UTC
  durationMinutes: number;
  capacity: number;
  priceCents: number; // USD cents; 0 = free
  spotsLeft: number; // capacity - confirmed bookings, never < 0
  isFull: boolean;
}

export interface ListSessionsResponse {
  sessions: SessionSummary[];
}

export interface GetSessionResponse {
  session: SessionSummary;
}
