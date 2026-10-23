import type { SessionSummary } from '../../types/sessions';
import { toIsoString } from '../../utils/to-iso-string';

// A `sessions` row. Inside row_to_json() the timestamps arrive as strings.
export interface SessionRow {
  id: string;
  title: string;
  instructor: string;
  starts_at: Date | string;
  duration_minutes: number;
  capacity: number;
  price_cents: number;
  booked_count: number;
}

export function toSessionSummary(row: SessionRow): SessionSummary {
  return {
    id: row.id,
    title: row.title,
    instructor: row.instructor,
    startsAt: toIsoString(row.starts_at),
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    priceCents: row.price_cents,
    spotsLeft: Math.max(0, row.capacity - row.booked_count),
    isFull: row.booked_count >= row.capacity,
  };
}
