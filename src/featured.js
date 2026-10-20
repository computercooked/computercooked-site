// Game of the week for the hub hero (GET /api/featured). Picked from the 4 weeks before this week
// started, so it holds all week, and never the weekly challenge's game (the challenge card shows that):
//   score = D1 return rate (needs 8+ first-time players) + 0.25 x rating (-1..1, needs 5+ ratings).
// Thin data: rotate through the newest games by week number instead.
import { json, now, dayOf, weekOf } from "./util.js";
import { challengeFor, autoPick } from "./social.js";

const DAY = 86400000;
const PLAYER = "COALESCE('u' || user_id, 'a' || anon_id)";
const MIN_COHORT = 8, MIN_RATED = 5;

function weekStart(t) {
  const d = new Date(t), dow = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1 - dow);
}

let cached = { key: null, pick: null };

export async function pickFeatured(env, catalog, t = now(), preview = false) {
  // a preview must not store a future week's challenge, so it computes the auto pick without saving it
  const ch = preview ? (await challengeFor(env, t)) || (await autoPick(env, t, catalog)) : await challengeFor(env, t, catalog);
  const key = weekOf(t) + "|" + (ch ? ch.game : "");
  if (cached.key === key && catalog.has(cached.pick?.game)) return cached.pick;

  const start = weekStart(t), since = dayOf(start - 28 * DAY);
  const ok = (slug) => slug !== ch?.game && catalog.get(slug)?.made_by === "computer-cooked";
  const ret = (await env.DB.prepare(
    `WITH firsts AS (
       SELECT game, ${PLAYER} p, MIN(day) d FROM plays GROUP BY game, p HAVING d >= ? AND d < ?
     ), days AS (
       SELECT DISTINCT game, ${PLAYER} p, day FROM plays WHERE day >= ? AND day < ?
     )
     SELECT f.game, COUNT(*) n, SUM(EXISTS (SELECT 1 FROM days x WHERE x.game = f.game AND x.p = f.p AND x.day = date(f.d, '+1 day'))) back
     FROM firsts f GROUP BY f.game`
  ).bind(since, dayOf(start - DAY), since, dayOf(start)).all()).results;
  const fb = (await env.DB.prepare(
    "SELECT game, SUM(rating = 1) up, SUM(rating = -1) down, SUM(rating != 0) rated FROM feedback WHERE ts >= ? AND ts < ? GROUP BY game"
  ).bind(start - 28 * DAY, start).all()).results;

  const stats = new Map();
  for (const r of ret) stats.set(r.game, { n: r.n, d1: r.n ? r.back / r.n : 0 });
  for (const f of fb) stats.set(f.game, { ...(stats.get(f.game) || { n: 0, d1: 0 }), rated: f.rated, rating: f.rated ? (f.up - f.down) / f.rated : 0 });

  let best = null;
  for (const [game, s] of stats) {
    if (!ok(game)) continue;
    const useD1 = s.n >= MIN_COHORT, useRating = (s.rated || 0) >= MIN_RATED;
    if (!useD1 && !useRating) continue;
    const score = (useD1 ? s.d1 : 0) + (useRating ? 0.25 * s.rating : 0);
    if (!best || score > best.score || (score === best.score && s.n > best.n)) {
      best = { game, score, n: s.n, reason: useD1 && s.d1 >= 0.15 ? "players keep coming back to this one" : useRating && s.rating > 0 ? "players rate this one highly" : "a fan favorite this month" };
    }
  }
  if (!best) {
    // not enough data yet: rotate through the newest games, one per week
    const list = [...catalog.values()].filter((g) => ok(g.slug)).sort((a, b) => String(b.added || "").localeCompare(String(a.added || "")));
    if (!list.length) return null;
    const wk = Math.floor(start / (7 * DAY));
    best = { game: list[wk % list.length].slug, reason: "fresh out of the oven" };
  }
  const g = catalog.get(best.game);
  const pick = { week: weekOf(t), game: g.slug, title: g.title, pitch: g.pitch, thumbnail: g.thumbnail, reason: best.reason, basis: "score" in best ? "metrics" : "rotation" };
  cached = { key, pick };
  return pick;
}

// GET /api/admin/featured?date=YYYY-MM-DD (admin): the pick for that date's week, computed fresh. Default: next week.
export async function previewFeatured(url, env, catalog) {
  const d = url.searchParams.get("date");
  const t = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(d + "T12:00:00Z") : now() + 7 * DAY;
  const keep = cached;
  cached = { key: null, pick: null };
  const pick = await pickFeatured(env, catalog, t, true);
  cached = keep;
  return json({ ok: true, week: weekOf(t), featured: pick });
}

export async function featured(env, catalog) {
  const pick = await pickFeatured(env, catalog);
  return json({ ok: true, featured: pick }, 200, { "cache-control": "public, max-age=300" });
}
