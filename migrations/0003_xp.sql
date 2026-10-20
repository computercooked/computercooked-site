-- Slice B: XP, levels and achievements (accounts only; guests play as before).
-- Every XP grant is one row, so totals, history and caps are all queries. A player's level comes from their total.
CREATE TABLE IF NOT EXISTS xp_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,                 -- play | first | streak | achievement
  game TEXT,                          -- NULL for site-wide grants
  ref TEXT NOT NULL,                  -- play id, day or achievement id: (user_id, kind, ref) is unique, so retries never double-pay
  amount INTEGER NOT NULL,
  day TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS xp_once ON xp_events(user_id, kind, ref);
CREATE INDEX IF NOT EXISTS xp_user_day ON xp_events(user_id, day, game);

CREATE TABLE IF NOT EXISTS achievements (
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,                 -- 'site' for site-wide achievements
  ach_id TEXT NOT NULL,
  ts INTEGER NOT NULL,
  PRIMARY KEY (user_id, game, ach_id)
);
