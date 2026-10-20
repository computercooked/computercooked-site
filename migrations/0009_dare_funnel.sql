-- Challenge-a-friend funnel: where each dare came from and whether it was actually sent.
-- One row per dare (dares made before this migration have none and count as 'button').
CREATE TABLE IF NOT EXISTS dare_funnel (
  dare_id TEXT PRIMARY KEY,
  source TEXT NOT NULL,          -- 'best' (offered after a new personal best) or 'button' (asked for after any run)
  shared_how TEXT,               -- 'share' (share sheet completed) or 'copy' (link copied); the first one only
  shared_at INTEGER
);
