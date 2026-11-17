-- CI only (.github/workflows/checks.yml, local D1): rows from before crash test daily's 1.4 scoring (src/boards.js
-- BOARD_FROM), so scripts/smoke-test.mjs can check that old-rules scores stay off the boards and old dares are retired.
-- Never run against the live database.
INSERT OR IGNORE INTO scores (game, play_id, player, user_id, name, score, day, week, ts, hidden) VALUES
  ('crash-test-daily', 'oldrules-play-1', 'a:oldrules-seed', NULL, 'oldrules', 1500, '2026-11-10', '2026-W46', 1762800000000, 0),
  ('crash-test-daily', 'oldrules-play-2', 'a:smoke-oldrules', NULL, 'smokeold', 1500, '2026-11-10', '2026-W46', 1762800000000, 1);
INSERT OR IGNORE INTO dares (id, game, play_id, score, from_user, from_player, from_name, created_at) VALUES
  ('oldrul3s', 'crash-test-daily', 'oldrules-play-1', 1500, NULL, 'a:oldrules-seed', 'oldrules', 1762800000000);
