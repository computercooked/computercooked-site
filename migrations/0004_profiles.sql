-- Slice C: profiles and account settings. One row per user, created on first edit.
-- The avatar stays in users.avatar (presets or built "x:..." strings). No real names, 13+ only.
CREATE TABLE IF NOT EXISTS profiles (
  user_id INTEGER PRIMARY KEY,
  display_name TEXT,                  -- shown instead of the username where it fits (2-24 chars, filtered)
  bio TEXT,                           -- up to 160 chars, word-filtered
  fav_game TEXT,
  badges TEXT,                        -- JSON array of up to 3 "game:ach_id" the player has unlocked
  theme TEXT,                         -- profile accent color, one of a fixed palette
  public INTEGER NOT NULL DEFAULT 1,  -- 0 hides /u/<username> details
  email TEXT,                         -- optional, for recovery and news later
  email_verified INTEGER NOT NULL DEFAULT 0, -- verifying needs an email provider (not set up yet)
  news_optin INTEGER NOT NULL DEFAULT 0,     -- no email goes out until verified and opted in
  updated_at INTEGER NOT NULL
);
