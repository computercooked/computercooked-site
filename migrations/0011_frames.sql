-- Profile frames: a level-unlocked border around your avatar on /me and /u/<username>.
-- Its own table (not a profiles column) because every migration re-runs per isolate and only IF NOT EXISTS is safe.
-- One row per user, only once a frame is picked; removed with the account (deleteAccount) and listed in the export.
CREATE TABLE IF NOT EXISTS frames (
  user_id INTEGER PRIMARY KEY,
  frame TEXT NOT NULL,                -- one of the frame ids in src/cosmetics.js
  updated_at INTEGER NOT NULL
);
