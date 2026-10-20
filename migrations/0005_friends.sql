-- Slice D1: friends. One row per direction.
--   A asks B:        (A, B, 'pending')
--   B accepts:       (A, B, 'accepted') + (B, A, 'accepted')
--   A blocks B:      both rows removed, then (A, B, 'blocked'), and B can no longer ask A
CREATE TABLE IF NOT EXISTS friends (
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT NOT NULL,               -- pending | accepted | blocked
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, friend_id)
);
CREATE INDEX IF NOT EXISTS friends_in ON friends(friend_id, status);
