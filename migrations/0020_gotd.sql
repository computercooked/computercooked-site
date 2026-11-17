-- Game of the day (src/gotd.js): one of our games per UTC day pays 2x play XP. One row per day, written by the
-- first request that needs it (INSERT OR IGNORE, so two isolates at midnight agree); guest XP replay reads it later.
CREATE TABLE IF NOT EXISTS gotd (
  day TEXT PRIMARY KEY,               -- YYYY-MM-DD, UTC
  game TEXT NOT NULL,                 -- the slug
  picked_at INTEGER NOT NULL
);
