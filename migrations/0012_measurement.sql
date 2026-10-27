-- Measurement: page views, tip clicks/successes (events rows named cc:pageview / cc:tip_click / cc:tip_success,
-- no player id stored), and the utm_campaign a play arrived with.
-- Every statement re-runs per isolate, so only IF NOT EXISTS (no ALTER): the campaign gets its own table.
CREATE TABLE IF NOT EXISTS play_tags (
  play_id TEXT PRIMARY KEY,           -- plays.id
  campaign TEXT                       -- cleaned utm_campaign (lowercase, [a-z0-9_.-], max 40)
);
CREATE INDEX IF NOT EXISTS events_name_ts ON events(name, ts);
