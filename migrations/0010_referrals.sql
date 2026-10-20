-- Referral credit: an account opened from someone's dare link. The dare's sender gets XP once the new
-- player finishes a real run (credited_at set then). One row per new account; removed with either account.
CREATE TABLE IF NOT EXISTS referrals (
  new_user INTEGER PRIMARY KEY,
  sender INTEGER NOT NULL,
  dare_id TEXT,
  created_at INTEGER NOT NULL,
  credited_at INTEGER
);
CREATE INDEX IF NOT EXISTS referrals_sender ON referrals (sender, credited_at);
