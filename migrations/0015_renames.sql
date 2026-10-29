-- K-0030 step 3: username changes (once every 30 days). An old name stays held for its owner for 30 days,
-- and /u/<old name> points to the new one meanwhile.
CREATE TABLE IF NOT EXISTS username_history (
  user_id INTEGER NOT NULL, old_name TEXT NOT NULL COLLATE NOCASE, new_name TEXT NOT NULL, changed_at INTEGER NOT NULL );
CREATE INDEX IF NOT EXISTS username_history_old ON username_history(old_name, changed_at);
CREATE INDEX IF NOT EXISTS username_history_user ON username_history(user_id, changed_at);
