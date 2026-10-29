-- K-0030 step 6: the weekly xp board sums xp_events by day across all players
CREATE INDEX IF NOT EXISTS xp_day ON xp_events(day, user_id);
