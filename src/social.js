// Weekly challenge, seasonal events and the /me activity feed (slice D2).
//   GET /api/challenge   this week's challenge + any live event, with your progress when logged in
//   GET /api/me/feed     your recent activity: allow-listed game events, achievements, challenges
import { json, now, dayOf, weekOf, textClean } from "./util.js";
import { SITE_ACH } from "./xp.js";

// One featured game per ISO week (UTC, Monday to Sunday). Add the next pick before the week starts;
// a week with no entry simply shows no challenge. `target` is a single run's score on that game's board.
export const CHALLENGES = [
  { week: "2026-W43", game: "level-devil-exe", target: 1000, goal: "clear 10 levels in one run (score 1,000+)", xp: 100 },
];

// Seasonal events: a site badge for finishing any run (10 s+, logged in) between `from` and `until` (UTC days, until exclusive).
export const EVENTS = [
  { id: "halloween_2026", from: "2026-10-19", until: "2026-11-01", name: "trick or treat.exe", desc: "finish a run before nov 1 (halloween 2026)", xp: 31, label: "halloween" },
];

export const challengeFor = (t) => CHALLENGES.find((c) => c.week === weekOf(t)) || null;
export const eventsLive = (t) => EVENTS.filter((e) => dayOf(t) >= e.from && dayOf(t) < e.until);
export const eventDef = (id) => EVENTS.find((e) => e.id === id) || null;

// Monday 00:00 UTC after the week of t
function weekEnd(t) {
  const d = new Date(t), dow = d.getUTCDay() || 7;
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 8 - dow);
}

export async function challenge(env, user, catalog) {
  const t = now(), c = challengeFor(t);
  let out = null;
  if (c && catalog.has(c.game)) {
    const g = catalog.get(c.game);
    const finishers = await env.DB.prepare("SELECT COUNT(*) n FROM xp_events WHERE kind = 'challenge' AND ref = ?").bind(c.week).first("n");
    out = { week: c.week, game: c.game, title: g.title, thumbnail: g.thumbnail, goal: c.goal, target: c.target, xp: c.xp, ends_at: new Date(weekEnd(t)).toISOString(), finishers };
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
  // collapse repeats (the same line from one game) to the newest, then newest first
  const seen = new Set();
  const out = items.sort((a, b) => b.ts - a.ts).filter((i) => { const k = i.game + "|" + i.text; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 30);
  return json({ ok: true, items: out.map((i) => ({ ...i, title: i.game ? catalog.get(i.game)?.title || i.game : null })) });
}
