// Weekly recap on /me (GET /api/me/recap?week=last|this): your week in numbers, from tables that already exist.
// "last" is the most recent full week (Mon 00:00 to Mon 00:00 UTC), shown on /me all of the week after;
// "this" is the current week so far. Nothing is stored: every number is a query over plays, xp_events,
// scores and achievements, so deleting an account deletes its recap too.
import { json, now, dayOf, weekOf } from "./util.js";
import { levelOf, SITE_ACH } from "./xp.js";
import { eventDef } from "./social.js";

const DAY = 86400000, WEEK = 7 * DAY;

// Monday 00:00 UTC of the week of t
function weekStart(t) {
  const d = new Date(t), dow = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1 - dow);
}

async function playStats(env, userId, from, to) {
  // plays are indexed by (user_id, day), so the range is by day
  return env.DB.prepare(
    "SELECT COUNT(*) runs, COALESCE(SUM(duration_ms), 0) ms, COUNT(DISTINCT game) games, COUNT(DISTINCT day) days FROM plays WHERE user_id = ? AND day >= ? AND day < ?"
  ).bind(userId, dayOf(from), dayOf(to)).first();
}
const xpBetween = (env, userId, from, to) => env.DB.prepare(
  "SELECT COALESCE(SUM(amount), 0) x FROM xp_events WHERE user_id = ? AND day >= ? AND day < ?"
).bind(userId, dayOf(from), dayOf(to)).first("x");

export async function weekRecap(env, userId, catalog, which = "last", t = now()) {
  const thisWeek = weekStart(t);
  const start = which === "this" ? thisWeek : thisWeek - WEEK, end = start + WEEK;
  const s = await playStats(env, userId, start, end);
  if (!s || !s.runs) return null;
  const prev = await playStats(env, userId, start - WEEK, start);
  const [xp, xpPrev, xpBefore] = await Promise.all([
    xpBetween(env, userId, start, end),
    xpBetween(env, userId, start - WEEK, start),
    env.DB.prepare("SELECT COALESCE(SUM(amount), 0) x FROM xp_events WHERE user_id = ? AND day < ?").bind(userId, dayOf(start)).first("x"),
  ]);
  const top = await env.DB.prepare(
    "SELECT game, COUNT(*) runs, COALESCE(SUM(duration_ms), 0) ms FROM plays WHERE user_id = ? AND day >= ? AND day < ? GROUP BY game ORDER BY runs DESC, ms DESC LIMIT 1"
  ).bind(userId, dayOf(start), dayOf(end)).first();
  // best moments: games where this week's best beat everything before it (or was the first score there);
  // beaten old bests come first, biggest jump first
  const week = (await env.DB.prepare(
    "SELECT game, MAX(score) best FROM scores WHERE user_id = ? AND hidden = 0 AND ts >= ? AND ts < ? GROUP BY game"
  ).bind(userId, start, end).all()).results;
  const before = new Map((await env.DB.prepare(
    "SELECT game, MAX(score) best FROM scores WHERE user_id = ? AND hidden = 0 AND ts < ? GROUP BY game"
  ).bind(userId, start).all()).results.map((r) => [r.game, r.best]));
  const title = (g) => catalog.get(g)?.title || g;
  const bests = week.filter((r) => !(before.get(r.game) >= r.best))
    .map((r) => ({ game: r.game, title: title(r.game), score: r.best, prev: before.get(r.game) ?? null }))
    .sort((a, b) => (a.prev === null) - (b.prev === null) || b.score / (b.prev || 1) - a.score / (a.prev || 1));
  const achs = (await env.DB.prepare(
    "SELECT game, ach_id FROM achievements WHERE user_id = ? AND ts >= ? AND ts < ? ORDER BY ts"
  ).bind(userId, start, end).all()).results.map((a) => {
    const d = a.game === "site" ? SITE_ACH[a.ach_id] || eventDef(a.ach_id) : (catalog.get(a.game)?.achievements || []).find((x) => x.id === a.ach_id);
    return { game: a.game, id: a.ach_id, name: d?.name || a.ach_id };
  });
  const from = levelOf(xpBefore), to = levelOf(xpBefore + xp);
  return {
    week: weekOf(start), which, from: dayOf(start), to: dayOf(end - DAY), complete: which !== "this",
    runs: s.runs, minutes: Math.round(s.ms / 60000), games: s.games, days: s.days, xp,
    prev: { runs: prev?.runs || 0, xp: xpPrev || 0 },
    level: { from: from.level, to: to.level, title: to.title },
    top: top && { game: top.game, title: title(top.game), runs: top.runs, minutes: Math.round(top.ms / 60000) },
    bests: bests.slice(0, 3), bests_total: bests.length,
    achievements: achs.slice(0, 3), achievements_total: achs.length,
  };
}

// GET /api/me/recap?week=last|this
export async function recapRoute(url, env, user, catalog) {
  const which = url.searchParams.get("week") === "this" ? "this" : "last";
  return json({ ok: true, recap: await weekRecap(env, user.id, catalog, which) });
}
