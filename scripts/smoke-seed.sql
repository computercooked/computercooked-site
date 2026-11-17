-- CI only (.github/workflows/checks.yml, local D1): rows from before crash test daily's 1.4 scoring (src/boards.js
-- BOARD_FROM), so scripts/smoke-test.mjs can check that old-rules scores stay off the boards and old dares are retired.
-- Never run against the live database.
INSERT OR IGNORE INTO scores (game, play_id, player, user_id, name, score, day, week, ts, hidden) VALUES
  ('crash-test-daily', 'oldrules-play-1', 'a:oldrules-seed', NULL, 'oldrules', 1500, '2026-11-10', '2026-W46', 1762800000000, 0),
  ('crash-test-daily', 'oldrules-play-2', 'a:smoke-oldrules', NULL, 'smokeold', 1500, '2026-11-10', '2026-W46', 1762800000000, 1);
INSERT OR IGNORE INTO dares (id, game, play_id, score, from_user, from_player, from_name, created_at) VALUES
  ('oldrul3s', 'crash-test-daily', 'oldrules-play-1', 1500, NULL, 'a:oldrules-seed', 'oldrules', 1762800000000);
-- round 21 TikTok funnel (src/digest.js funnel): one person who came from TikTok 3 days ago (a landing, two games that
-- day) and came back 2 days ago from the home screen (direct). Not a smoke id, so the digest counts it; local D1 only.
INSERT OR IGNORE INTO plays (id, game, version, anon_id, started_at, referrer, device, day) VALUES
  ('ttseed-play-1', 'desktop-takeover', '1', 'ttseed-person', CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3 * 86400000, 'tiktok', 'mobile', '2026-01-01'),
  ('ttseed-play-2', 'keyboard-escape', '1', 'ttseed-person', CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3 * 86400000 + 60000, 'tiktok', 'mobile', '2026-01-01'),
  ('ttseed-play-3', 'desktop-takeover', '1', 'ttseed-person', CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 2 * 86400000, 'direct', 'mobile', '2026-01-01');
INSERT INTO events (play_id, game, name, data, ts) VALUES
  (NULL, 'site', 'cc:pageview', '{"path":"/games/desktop-takeover/","ref":"tiktok","land":1}', CAST(strftime('%s', 'now') AS INTEGER) * 1000 - 3 * 86400000 - 5000);
