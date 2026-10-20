-- Slice A: cloud saves for logged-in players (guests keep localStorage).
-- data is the game's JSON as text; bytes is its UTF-8 size (max 512 KB per slot, 5 slots per game).
CREATE TABLE IF NOT EXISTS saves (
  user_id INTEGER NOT NULL,
  game TEXT NOT NULL,
  slot TEXT NOT NULL,
  data TEXT NOT NULL,
  bytes INTEGER NOT NULL,
  version TEXT,                       -- the game's version when it saved
  updated_at INTEGER NOT NULL,        -- ms since epoch
  PRIMARY KEY (user_id, game, slot)
);
