-- K-0050a item 7: "what should we make next?" suggestions from the lab page (src/ideas.js). No login, no IP stored.
CREATE TABLE IF NOT EXISTS ideas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL,                 -- the idea, 3..280 characters, no links
  handle TEXT,                        -- optional @handle, [a-z0-9_.-], max 30
  page TEXT,                          -- the page it came from (lab, games, …)
  ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ideas_ts ON ideas(ts);
