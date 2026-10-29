-- K-0030 step 5: getting back in without email. Recovery codes are shown once and only their hashes are stored.
-- Passkeys store the public key only (the private key never leaves the person's device).
CREATE TABLE IF NOT EXISTS recovery_codes (
  user_id INTEGER NOT NULL, code_hash TEXT NOT NULL, created_at INTEGER NOT NULL, used_at INTEGER );
CREATE INDEX IF NOT EXISTS recovery_codes_user ON recovery_codes(user_id);
CREATE TABLE IF NOT EXISTS passkeys (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, public_key TEXT NOT NULL, alg INTEGER NOT NULL,
  sign_count INTEGER NOT NULL DEFAULT 0, label TEXT, created_at INTEGER NOT NULL, last_used INTEGER );
CREATE INDEX IF NOT EXISTS passkeys_user ON passkeys(user_id);
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  challenge TEXT PRIMARY KEY, user_id INTEGER, kind TEXT NOT NULL, expires_at INTEGER NOT NULL );
