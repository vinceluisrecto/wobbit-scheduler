CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  instructor       TEXT NOT NULL,
  starts_at        TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  capacity         INTEGER NOT NULL CHECK (capacity > 0),
  price_cents      INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  booked_count     INTEGER NOT NULL DEFAULT 0,          -- confirmed bookings only
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booked_count_within_capacity CHECK (booked_count >= 0 AND booked_count <= capacity)
);
CREATE INDEX sessions_starts_at_idx ON sessions (starts_at);

CREATE TABLE bookings (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status         TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  cancelled_at   TIMESTAMPTZ,
  cancelled_by   TEXT CHECK (cancelled_by IN ('member', 'admin')),
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
  paid_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cancelled_fields_match_status
    CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)),
  CONSTRAINT paid_at_matches_status CHECK ((payment_status = 'paid') = (paid_at IS NOT NULL))
);
-- One *confirmed* booking per member per class; a member who cancelled can book again.
CREATE UNIQUE INDEX bookings_session_user_confirmed_unique
  ON bookings (session_id, user_id) WHERE status = 'confirmed';
CREATE INDEX bookings_session_id_idx ON bookings (session_id);
CREATE INDEX bookings_user_id_idx ON bookings (user_id);

CREATE TABLE waitlist_entries (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status     TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'promoted', 'removed')),
  booking_id UUID REFERENCES bookings(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT booking_id_matches_status CHECK ((status = 'promoted') = (booking_id IS NOT NULL))
);
CREATE UNIQUE INDEX waitlist_session_user_waiting_unique
  ON waitlist_entries (session_id, user_id) WHERE status = 'waiting';
CREATE INDEX waitlist_session_queue_idx ON waitlist_entries (session_id, created_at) WHERE status = 'waiting';
CREATE INDEX waitlist_user_id_idx ON waitlist_entries (user_id);
