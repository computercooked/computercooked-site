-- Computer Cooked Games platform schema (D1 / SQLite).
-- The Worker also runs these statements with IF NOT EXISTS on first use (src/db.js),
-- so a fresh database works even if migrations were never applied.

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  pass_hash TEXT NOT NULL,            -- base64 PBKDF2-SHA256 output
  salt TEXT NOT NULL,                 -- base64, 16 random bytes per user
  iterations INTEGER NOT NULL,
  avatar TEXT NOT NULL DEFAULT 'lime',
  status TEXT NOT NULL DEFAULT 'active',   -- active | hidden (after reports) | banned
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,        -- SHA-256 of the cookie token; the token itself is never stored
  user_id INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS plays (
  id TEXT PRIMARY KEY,                -- random id made by the SDK
  game TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  anon_id TEXT,                       -- random id from localStorage, not a cookie
  user_id INTEGER,
  tester TEXT,                        -- ?tester=<name> playtest tag
  started_at INTEGER NOT NULL,        -- server receipt time, ms
  ended_at INTEGER,
  duration_ms INTEGER,
  score REAL,
  completed INTEGER NOT NULL DEFAULT 0,
  auto INTEGER NOT NULL DEFAULT 0,    -- 1 = logged by the player page, game has no SDK hooks
  referrer TEXT,                      -- bucket: tiktok | youtube | instagram | x | threads | bluesky | search | internal | direct | other
  device TEXT,                        -- mobile | tablet | desktop
  day TEXT NOT NULL                   -- YYYY-MM-DD (UTC) of start
);
CREATE INDEX IF NOT EXISTS plays_game_day ON plays(game, day);
CREATE INDEX IF NOT EXISTS plays_user ON plays(user_id, day);
CREATE INDEX IF NOT EXISTS plays_anon ON plays(anon_id, day);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  play_id TEXT,
  game TEXT NOT NULL,
  name TEXT NOT NULL,
  data TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_game ON events(game, ts);

CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  play_id TEXT NOT NULL UNIQUE,
  player TEXT NOT NULL,               -- 'u:<user_id>' or 'a:<anon_id>' (one row per player per board is picked at query time)
  user_id INTEGER,
  name TEXT NOT NULL,                 -- username, typed guest name, or guest-1234
  score REAL NOT NULL,
  day TEXT NOT NULL,
  week TEXT NOT NULL,                 -- ISO week, e.g. 2026-W43
  ts INTEGER NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS scores_board ON scores(game, hidden, score DESC);
CREATE INDEX IF NOT EXISTS scores_day ON scores(game, day);
CREATE INDEX IF NOT EXISTS scores_week ON scores(game, week);

CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  rating INTEGER NOT NULL DEFAULT 0,  -- 1 = thumbs up, -1 = thumbs down, 0 = text only
  text TEXT,
  tester TEXT,
  anon_id TEXT,
  user_id INTEGER,
  play_id TEXT,
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS feedback_game ON feedback(game, ts);

CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (user_id, game)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,                 -- username | score | feedback | upload
  target TEXT NOT NULL,
  reason TEXT,
  anon_id TEXT,
  user_id INTEGER,
  ts INTEGER NOT NULL,
  resolved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  pitch TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  r2_prefix TEXT NOT NULL,
  size INTEGER NOT NULL,
  files INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL,
  reviewed_at INTEGER
);
