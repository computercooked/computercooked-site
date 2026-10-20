-- Weekly challenge picks made automatically (weeks with no CHALLENGES entry in src/social.js).
-- The first request of the week stores the pick, so it stays the same all week on every isolate.
CREATE TABLE IF NOT EXISTS challenges (
  week TEXT PRIMARY KEY,              -- ISO week, e.g. 2026-W44
  game TEXT NOT NULL,
  target REAL NOT NULL,               -- one run's score on that game's board
  goal TEXT NOT NULL,
  xp INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
