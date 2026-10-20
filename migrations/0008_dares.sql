-- Challenge-a-friend links: /games/<slug>/?vs=<score>&from=<name>&d=<id>. Made from a validated score.
CREATE TABLE IF NOT EXISTS dares (
  id TEXT PRIMARY KEY,                -- short random id in the link
  game TEXT NOT NULL,
  play_id TEXT NOT NULL UNIQUE,       -- the run being bragged about (one dare per run)
  score REAL NOT NULL,
  from_user INTEGER,                  -- sender's account (XP when someone beats it), null for guests
  from_player TEXT NOT NULL,          -- 'u:<id>' or 'a:<anon>', so the sender can't beat their own dare
  from_name TEXT NOT NULL,
  opens INTEGER NOT NULL DEFAULT 0,
  beats INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS dares_from ON dares(from_user, created_at);
-- one row per player who beat a dare
CREATE TABLE IF NOT EXISTS dare_beats (
  dare_id TEXT NOT NULL,
  player TEXT NOT NULL,
  score REAL NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (dare_id, player)
);
