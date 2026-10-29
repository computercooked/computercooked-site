-- Email signup (K-0031): addresses kept in our own database only, to email new games. No outside email service.
-- consent is the exact line the person agreed to; token is the secret in their unsubscribe link.
CREATE TABLE IF NOT EXISTS subscribers (
  email TEXT PRIMARY KEY,             -- lowercased
  source TEXT,                        -- where they signed up (landing, hub, ...)
  consent TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  unsubscribed_at INTEGER             -- set by GET /api/unsubscribe?t=<token>; the row stays as proof of opt-out
);
