-- Slice D2: the /me activity feed joins events to plays by play_id. Index only, no new tables.
CREATE INDEX IF NOT EXISTS events_play ON events(play_id);
