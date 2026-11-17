// Game of the day: one of our games per UTC day pays 2x play XP (src/xp.js grants a "gotd" event equal to the play XP,
// so the per-game daily cap of 150 caps the bonus too). Plan: Website\Ideas\game-of-the-day-2x-xp-plan-2026-11-16.md.
//   Pool: our games, minus the week's challenge game and featured game (they have their own cards), the daily 3
//   (they pay their own bonus), games in their first 14 days (the NEW shelf has them) and anything picked in the
//   last 7 days. Pick: the fewest unique players over the last 7 days, so the quiet games get their turn; ties go to
//   the one picked longest ago, then catalog order. Stored once per day in the gotd table (first writer wins).
// GET /api/gotd -> {ok, day, game, title, pitch, thumbnail, poster, ends_at}
import { json, now, dayOf, REAL, isNewGame } from "./util.js";
import { challengeFor } from "./social.js";
import { pickFeatured } from "./featured.js";
import { DAILY3 } from "./xp.js";

const DAY = 86400000;
const PLAYER = "COALESCE('u' || user_id, 'a' || anon_id)";
let cached = { day: null, row: null };

// next UTC midnight after t, as an ISO string (what the home page countdowns read)
export const gotdEnds = (t) => new Date(Date.parse(dayOf(t) + "T00:00:00Z") + DAY).toISOString();

// The day's row ({day, game}), or null. With a catalog it picks and stores today's game if nobody has yet; without
// one it only reads (guest replay and past days never create a pick after the fact).
export async function gotdFor(env, t = now(), catalog = null) {
  const day = dayOf(t);
  if (cached.day === day && cached.row) return cached.row;
  let row = await env.DB.prepare("SELECT day, game FROM gotd WHERE day = ?").bind(day).first();
  if (!row && catalog && day === dayOf(now())) {
    const game = await pickGotd(env, t, catalog);
    if (!game) return null;
    await env.DB.prepare("INSERT OR IGNORE INTO gotd (day, game, picked_at) VALUES (?, ?, ?)").bind(day, game, now()).run();
    row = await env.DB.prepare("SELECT day, game FROM gotd WHERE day = ?").bind(day).first();
  }
  if (row && day === dayOf(now())) cached = { day, row };
  return row || null;
}

export async function pickGotd(env, t, catalog) {
  const day = dayOf(t), since = dayOf(t - 7 * DAY);
  let ch = null, feat = null;
  try { ch = await challengeFor(env, t, catalog); } catch (e) { /* no challenge: nothing to skip */ }
  try { feat = await pickFeatured(env, catalog, t); } catch (e) { /* no featured pick: nothing to skip */ }
  const last = new Map((await env.DB.prepare("SELECT game, MAX(day) d FROM gotd WHERE day < ? GROUP BY game").bind(day).all()).results.map((r) => [r.game, r.d]));
  const base = [...catalog.values()].filter((g) => g.made_by === "computer-cooked" && g.slug !== ch?.game && g.slug !== feat?.game
    && !DAILY3.includes(g.slug) && !isNewGame(g, t));
  // a small catalog can run out of games not picked this week: then the week rule gives way
  const pool = base.filter((g) => !(last.get(g.slug) >= since)).length ? base.filter((g) => !(last.get(g.slug) >= since)) : base;
  if (!pool.length) return null;
  const players = new Map((await env.DB.prepare(
    `SELECT game, COUNT(DISTINCT ${PLAYER}) n FROM plays WHERE day >= ? AND day < ? AND ${REAL} GROUP BY game`
  ).bind(since, day).all()).results.map((r) => [r.game, r.n]));
  const order = pool.map((g, i) => [g.slug, players.get(g.slug) || 0, last.get(g.slug) || "", i])
    .sort((a, b) => a[1] - b[1] || a[2].localeCompare(b[2]) || a[3] - b[3]);
  return order[0][0];
}

export async function gotdApi(env, catalog, t = now()) {
  const row = await gotdFor(env, t, catalog);
  const g = row && catalog.get(row.game);
  if (!g) return json({ ok: true, game: null }, 200, { "cache-control": "public, max-age=60" });
  return json({ ok: true, day: row.day, game: g.slug, title: g.title, pitch: g.pitch || "", thumbnail: g.thumbnail, poster: g.poster || null, ends_at: gotdEnds(t) },
    200, { "cache-control": "public, max-age=300" });
}
