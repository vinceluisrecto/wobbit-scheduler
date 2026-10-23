CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,                       -- scrypt "salt:hash", never the plain password
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  time_zone     TEXT NOT NULL DEFAULT 'UTC',          -- IANA zone from the browser, for email times
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

CREATE TABLE password_reset_tokens (
  token_hash TEXT PRIMARY KEY,                       -- SHA-256 of the emailed token
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,                   -- now() + 1 hour
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX password_reset_tokens_user_id_idx ON password_reset_tokens (user_id);

CREATE TABLE user_sessions (
  token_hash TEXT PRIMARY KEY,                       -- SHA-256 of the cookie token
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_sessions_user_id_idx ON user_sessions (user_id);
CREATE INDEX user_sessions_expires_at_idx ON user_sessions (expires_at);
