// Weekly challenge, seasonal events and the /me activity feed (slice D2).
//   GET /api/challenge   this week's challenge + any live event, with your progress when logged in
//   GET /api/me/feed     your recent activity: allow-listed game events, achievements, challenges
import { json, now, dayOf, weekOf, textClean } from "./util.js";
import { SITE_ACH } from "./xp.js";
import { friendIds, people } from "./friends.js";

// One featured game per ISO week (UTC, Monday to Sunday). A hand pick here always wins. A week with no
// entry gets an automatic pick (see autoPick), stored in the challenges table on first use.
// `target` is a single run's score on that game's board.
export const CHALLENGES = [
  { week: "2026-W43", game: "level-devil-exe", target: 1000, goal: "clear 10 levels in one run (score 1,000+)", xp: 100 },
];

// Seasonal events: a site badge for finishing any run (10 s+, logged in) between `from` and `until` (UTC days, until exclusive).
export const EVENTS = [
  { id: "halloween_2026", from: "2026-10-19", until: "2026-11-01", name: "trick or treat.exe", desc: "finish a run before nov 1 (halloween 2026)", xp: 31, label: "halloween" },
];

export const AUTO_XP = 100;
const WEEK = 7 * 86400000;

// Monday 00:00 UTC of the week of t
function weekStart(t) {
  const d = new Date(t), dow = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1 - dow);
}

let cached = { week: null, c: null };
// This week's challenge. With a catalog it may make (and store) the automatic pick; without one
// (inside awardPlay) it only reads a pick that already exists.
export async function challengeFor(env, t, catalog = null) {
  const week = weekOf(t);
  const manual = CHALLENGES.find((c) => c.week === week);
  if (manual) return manual;
  if (cached.week === week && cached.c) return cached.c;
  let row = await env.DB.prepare("SELECT week, game, target, goal, xp FROM challenges WHERE week = ?").bind(week).first();
  if (!row && catalog) {
    const pick = await autoPick(env, t, catalog);
    if (!pick) return null;
    await env.DB.prepare("INSERT OR IGNORE INTO challenges (week, game, target, goal, xp, created_at) VALUES (?,?,?,?,?,?)")
      .bind(week, pick.game, pick.target, pick.goal, pick.xp, now()).run();
    row = await env.DB.prepare("SELECT week, game, target, goal, xp FROM challenges WHERE week = ?").bind(week).first(); // first writer wins
  }
  if (row) { row.auto = true; cached = { week, c: row }; }
  return row || null;
}

// 2 significant figures: 1234 -> 1200, 0.0372 -> 0.037
const nice = (x) => Number(Number(x).toPrecision(2));

// The game with the most unique players in the 7 days before the week started (so the pick is the same
// all week), among games with a leaderboard, skipping last week's pick. Target: about the 60th
// percentile of that game's scores (needs 10+ runs, else 30 s of perfect play).
export async function autoPick(env, t, catalog) {
  const start = weekStart(t), prevWeek = weekOf(start - WEEK);
  const prev = CHALLENGES.find((c) => c.week === prevWeek)?.game
    || await env.DB.prepare("SELECT game FROM challenges WHERE week = ?").bind(prevWeek).first("game");
  const ok = (slug) => slug !== prev && catalog.get(slug)?.max_score_per_sec > 0;
  const { results } = await env.DB.prepare(
    `SELECT game, COUNT(DISTINCT COALESCE('u' || user_id, 'a' || anon_id)) players, COUNT(*) plays
     FROM plays WHERE day >= ? AND day < ? GROUP BY game ORDER BY players DESC, plays DESC`
  ).bind(dayOf(start - WEEK), dayOf(start)).all();
  let game = results.map((r) => r.game).find(ok);
  if (!game) { // no plays last week: most played ever, then the catalog order
    const all = (await env.DB.prepare("SELECT game FROM plays GROUP BY game ORDER BY COUNT(*) DESC").all()).results.map((r) => r.game);
    game = all.find(ok) || [...catalog.keys()].find(ok);
  }
  if (!game) return null;
  const g = catalog.get(game);
  const n = await env.DB.prepare("SELECT COUNT(*) n FROM scores WHERE game = ? AND hidden = 0").bind(game).first("n");
  let target;
  if (n >= 10) {
    target = await env.DB.prepare("SELECT score FROM scores WHERE game = ? AND hidden = 0 ORDER BY score LIMIT 1 OFFSET ?")
      .bind(game, Math.floor(0.6 * (n - 1))).first("score");
  }
  target = nice(target > 0 ? target : g.max_score_per_sec * 30);
  return { week: weekOf(start), game, target, goal: `score ${target.toLocaleString("en-US")}+ in one run`, xp: AUTO_XP, auto: true, basis: { players_last_week: results.find((r) => r.game === game)?.players || 0, scores: n, excluded: prev || null } };
}
export const eventsLive = (t) => EVENTS.filter((e) => dayOf(t) >= e.from && dayOf(t) < e.until);
export const eventDef = (id) => EVENTS.find((e) => e.id === id) || null;

// Monday 00:00 UTC after the week of t
function weekEnd(t) {
  const d = new Date(t), dow = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 8 - dow);
}

export async function challenge(env, user, catalog) {
  const t = now(), c = await challengeFor(env, t, catalog);
  let out = null;
  if (c && catalog.has(c.game)) {
    const g = catalog.get(c.game);
    const finishers = await env.DB.prepare("SELECT COUNT(*) n FROM xp_events WHERE kind = 'challenge' AND ref = ?").bind(c.week).first("n");
    out = { week: c.week, game: c.game, title: g.title, thumbnail: g.thumbnail, goal: c.goal, target: c.target, xp: c.xp, auto: !!c.auto, ends_at: new Date(weekEnd(t)).toISOString(), finishers };
    if (user) {
      out.done = !!(await env.DB.prepare("SELECT 1 FROM xp_events WHERE user_id = ? AND kind = 'challenge' AND ref = ?").bind(user.id, c.week).first());
      out.best = await env.DB.prepare("SELECT MAX(score) b FROM scores WHERE user_id = ? AND game = ? AND week = ? AND hidden = 0").bind(user.id, c.game, c.week).first("b");
    }
  }
  const events = [];
  for (const e of eventsLive(t)) {
    const ev = { id: e.id, label: e.label, name: e.name, desc: e.desc, xp: e.xp, until: e.until };
    if (user) ev.got = !!(await env.DB.prepare("SELECT 1 FROM achievements WHERE user_id = ? AND game = 'site' AND ach_id = ?").bind(user.id, e.id).first());
    events.push(ev);
  }
  return json({ ok: true, challenge: out, events }, 200, { "cache-control": "no-store" });
}

// GET /api/admin/challenge?date=YYYY-MM-DD (admin): the pick for that date's week (hand pick, stored
// auto pick, or what the auto pick would be right now) without storing anything. Default: next week.
export async function previewChallenge(url, env, catalog) {
  const d = url.searchParams.get("date");
  const t = d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? Date.parse(d + "T12:00:00Z") : now() + WEEK;
  const week = weekOf(t);
  const manual = CHALLENGES.find((c) => c.week === week);
  const stored = await env.DB.prepare("SELECT week, game, target, goal, xp FROM challenges WHERE week = ?").bind(week).first();
  return json({ ok: true, week, source: manual ? "hand" : stored ? "stored" : "auto (not stored yet)", pick: manual || stored || await autoPick(env, t, catalog) });
}

// ---------- activity feed ----------
// Only these (game, event) pairs ever reach the feed, rendered from a fixed template. Values are
// clipped, cleaned and word-filtered, so a game can't put arbitrary text on anyone's page.
// has(d, ...keys): every value is present and survived cleaning, otherwise the line is dropped
const has = (d, ...k) => k.every((x) => d[x] !== "" && d[x] != null);
const FEED = {
  "smol-brains": {
    first_word: (d) => has(d, "word") && `a smol learned the word "${d.word}"`,
    firstWord: (d) => has(d, "word") && `a smol learned the word "${d.word}"`,
    egg: (d) => has(d, "gen") && `a generation ${d.gen} egg was laid`,
    hatch: (d) => has(d, "gen") && `a generation ${d.gen} smol hatched`,
  },
  "level-devil-exe": {
    milestone: (d) => has(d, "lv", "deaths") && `cleared level ${d.lv} (${d.deaths} deaths so far)`,
    finish: (d) => has(d, "t", "deaths") && `beat all 31 levels in ${d.t}s with ${d.deaths} deaths`,
  },
};
const FEED_NAMES = [...new Set(Object.values(FEED).flatMap((m) => Object.keys(m)))];

function val(v) {
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v !== "string") return "";
  const s = v.replace(/[^\p{L}\p{N} '\-]/gu, "").trim().slice(0, 24);
  return s && textClean(s) !== false ? s : "";
}

function line(game, name, raw) {
  const tpl = FEED[game] && Object.prototype.hasOwnProperty.call(FEED[game], name) ? FEED[game][name] : null;
  if (!tpl) return null;
  let d = {};
  try { d = JSON.parse(raw || "{}") || {}; } catch (e) { return null; }
  const clean = {};
  for (const k of Object.keys(d).slice(0, 8)) clean[k] = val(d[k]);
  return tpl(clean) || null;
}

export async function feed(env, user, catalog) {
  const since = dayOf(now() - 30 * 86400000);
  const items = [];
  const evs = (await env.DB.prepare(
    `SELECT e.game, e.name, e.data, e.ts FROM plays p JOIN events e ON e.play_id = p.id
     WHERE p.user_id = ? AND p.day >= ? AND e.name IN (${FEED_NAMES.map(() => "?").join(",")}) ORDER BY e.ts DESC LIMIT 80`
  ).bind(user.id, since, ...FEED_NAMES).all()).results;
  for (const e of evs) {
    const text = line(e.game, e.name, e.data);
    if (text) items.push({ kind: "game", game: e.game, text, ts: e.ts });
  }
  const achs = (await env.DB.prepare("SELECT game, ach_id, ts FROM achievements WHERE user_id = ? ORDER BY ts DESC LIMIT 20").bind(user.id).all()).results;
  for (const a of achs) {
    const d = a.game === "site" ? SITE_ACH[a.ach_id] || eventDef(a.ach_id) : (catalog.get(a.game)?.achievements || []).find((x) => x.id === a.ach_id);
    if (d) items.push({ kind: "achievement", game: a.game === "site" ? null : a.game, text: `unlocked ${d.name}`, ts: a.ts });
  }
  const chs = (await env.DB.prepare("SELECT game, ref, amount, ts FROM xp_events WHERE user_id = ? AND kind = 'challenge' ORDER BY ts DESC LIMIT 10").bind(user.id).all()).results;
  for (const c of chs) items.push({ kind: "challenge", game: c.game, text: `finished the weekly challenge (+${c.amount} xp)`, ts: c.ts });
  const dz = (await env.DB.prepare("SELECT game, amount, ts FROM xp_events WHERE user_id = ? AND kind = 'dare' ORDER BY ts DESC LIMIT 10").bind(user.id).all()).results;
  for (const c of dz) items.push({ kind: "challenge", game: c.game, text: `someone took your dare and won (+${c.amount} xp)`, ts: c.ts });
  // collapse repeats (the same line from one game) to the newest, then newest first
  const seen = new Set();
  const out = items.sort((a, b) => b.ts - a.ts).filter((i) => { const k = i.game + "|" + i.text; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 30);
  return json({ ok: true, items: out.map((i) => ({ ...i, title: i.game ? catalog.get(i.game)?.title || i.game : null })) });
}

// GET /api/me/friends/feed: what your friends did lately (14 days). Friends with a private profile are left
// out, and so are game moments (those stay on the player's own /me): badges, weekly challenge wins, new bests.
export async function friendsFeed(env, user, catalog) {
  const ids = await friendIds(env, user.id);
  if (!ids.length) return json({ ok: true, friends: 0, items: [] });
  const q = ids.map(() => "?").join(",");
  const hidden = new Set((await env.DB.prepare(`SELECT user_id FROM profiles WHERE public = 0 AND user_id IN (${q})`).bind(...ids).all()).results.map((r) => r.user_id));
  const open = ids.filter((id) => !hidden.has(id));
  if (!open.length) return json({ ok: true, friends: ids.length, items: [] });
  const q2 = open.map(() => "?").join(","), since = now() - 14 * 86400000;
  const items = [];
  const achs = (await env.DB.prepare(`SELECT user_id, game, ach_id, ts FROM achievements WHERE user_id IN (${q2}) AND ts >= ? ORDER BY ts DESC LIMIT 60`).bind(...open, since).all()).results;
  for (const a of achs) {
    const d = a.game === "site" ? SITE_ACH[a.ach_id] || eventDef(a.ach_id) : (catalog.get(a.game)?.achievements || []).find((x) => x.id === a.ach_id && !x.secret);
    if (d) items.push({ uid: a.user_id, kind: "achievement", game: a.game === "site" ? null : a.game, text: `unlocked ${d.name}`, ts: a.ts });
  }
  const chs = (await env.DB.prepare(`SELECT user_id, game, ts FROM xp_events WHERE kind = 'challenge' AND user_id IN (${q2}) AND ts >= ? ORDER BY ts DESC LIMIT 30`).bind(...open, since).all()).results;
  for (const c of chs) items.push({ uid: c.user_id, kind: "challenge", game: c.game, text: "finished the weekly challenge", ts: c.ts });
  // a run that is (still) that friend's best on the game
  const bests = (await env.DB.prepare(
    `SELECT s.user_id, s.game, s.score, MAX(s.ts) ts FROM scores s WHERE s.user_id IN (${q2}) AND s.hidden = 0 AND s.ts >= ?
       AND s.score = (SELECT MAX(score) FROM scores t WHERE t.user_id = s.user_id AND t.game = s.game AND t.hidden = 0)
     GROUP BY s.user_id, s.game ORDER BY ts DESC LIMIT 40`
  ).bind(...open, since).all()).results;
  for (const b of bests) items.push({ uid: b.user_id, kind: "best", game: b.game, text: `new best: ${Math.round(b.score * 10) / 10}`, ts: b.ts });
  const who = await people(env, open);
  const out = items.filter((i) => who.has(i.uid) && (!i.game || catalog.has(i.game))).sort((a, b) => b.ts - a.ts).slice(0, 30)
    .map(({ uid, ...i }) => ({ ...i, who: who.get(uid), title: i.game ? catalog.get(i.game).title : null }));
  return json({ ok: true, friends: ids.length, items: out });
}
