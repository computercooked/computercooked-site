-- K-0050a: the raw utm_source / utm_medium a play arrived with (play_tags keeps the campaign; plays.referrer the channel)
CREATE TABLE IF NOT EXISTS play_utm (
  play_id TEXT PRIMARY KEY,           -- plays.id
  source TEXT,                        -- cleaned utm_source (lowercase, [a-z0-9_.-], max 40)
  medium TEXT                         -- cleaned utm_medium, same cleaning
);
