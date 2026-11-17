// Board seasons: when a game's scoring changes, its boards start fresh from that moment. Older score rows are kept
// (never deleted, still in each player's /api/me/export) but every board, rank, best, champion, weekly challenge and
// dare comparison leaves them out, so nobody's old-rules 100 sits next to a new-rules 1000. Dares made before the
// change are retired with a note (src/dares.js).
//   BOARD_FROM[slug] = ms when that game's current scoring went live (its PR's merge time)
export const BOARD_FROM = {
  "crash-test-daily": Date.parse("2026-11-17T07:43:06Z"), // 1.4: par 1000, -50 a move, speed, +500 hard (PR #368)
};
export const boardFrom = (game) => BOARD_FROM[game] || 0;
export const isOldRules = (game, ms) => ms < boardFrom(game);
export const OLD_RULES_NOTE = "this dare is from before the nov 16 scoring change, so it's retired. new rules, new scores: set your own.";

// SQL condition true for rows on the current boards. Unqualified game / ts columns, so it works inside any
// "FROM scores [alias] WHERE …"; values are this file's own constants, never request input.
const parts = Object.entries(BOARD_FROM).map(([g, t]) => {
  if (!/^[a-z0-9-]+$/.test(g) || !Number.isFinite(t)) throw new Error("bad BOARD_FROM entry: " + g);
  return `(game = '${g}' AND ts < ${t})`;
});
export const FRESH = parts.length ? `NOT (${parts.join(" OR ")})` : "1";
