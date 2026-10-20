// GET /api/admin/digest?days=7: one compact row per Pacific-time day for the daily status check (CEO, money
// agent; scripts/digest.mjs prints it as a table). Everything is computed from existing tables, smoke traffic
// left out the same way as /api/admin/metrics.
import { json, now, REAL } from "./util.js";
import { FOLLOW_PLATFORMS } from "./follow.js";

const TZ = "America/Los_Angeles";
const PLAYER = "COALESCE('u' || user_id, 'a' || anon_id)";
const CHANNELS = ["tiktok", "youtube", "instagram", "x", "threads", "bluesky", "search", "other", "direct", "internal", "app", "embed"];

// ms offset of Pacific time from UTC at instant t (negative: -7h or -8h)
const fmt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
function offsetAt(t) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(t / 1000) * 1000;
}
const ptDate = (t) => new Date(t + offsetAt(t)).toISOString().slice(0, 10);
// UTC ms of midnight Pacific on YYYY-MM-DD
function ptMidnight(date) {
  const [y, m, d] = date.split("-").map(Number);
  const guess = Date.UTC(y, m - 1, d, 8);
  return Date.UTC(y, m - 1, d) - offsetAt(guess);
}
const nextDate = (date) => new Date(Date.parse(date + "T00:00:00Z") + 86400000).toISOString().slice(0, 10);

export async function digest(url, env) {
  const db = env.DB;
  const n = Math.min(31, Math.max(1, parseInt(url.searchParams.get("days"), 10) || 7));
  // the last n Pacific days, today included (today is partial)
  const dates = [ptDate(now())];
  while (dates.length < n) dates.unshift(new Date(Date.parse(dates[0] + "T00:00:00Z") - 86400000).toISOString().slice(0, 10));
  const bounds = dates.map(ptMidnight).concat([ptMidnight(nextDate(dates[dates.length - 1]))]);
  const start = bounds[0], end = bounds[bounds.length - 1];
  // SQL for "which Pacific day is this timestamp": index into dates (numbers only, built here)
  const dayOf = (col) => "CASE " + dates.map((_, i) => `WHEN ${col} < ${bounds[i + 1]} THEN ${i}`).join(" ") + " END";

  const plays = (await db.prepare(
    `SELECT ${dayOf("started_at")} d, COUNT(*) plays, COUNT(DISTINCT ${PLAYER}) players, SUM(ended_at IS NOT NULL) ended
     FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} GROUP BY 1`
  ).bind(start, end).all()).results;
  const refs = (await db.prepare(
    `SELECT ${dayOf("started_at")} d, COALESCE(referrer, 'other') r, COUNT(*) n FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} GROUP BY 1, 2`
  ).bind(start, end).all()).results;
  const perGame = (await db.prepare(
    `SELECT ${dayOf("started_at")} d, game, COUNT(*) plays, COUNT(DISTINCT ${PLAYER}) players,
       AVG(CASE WHEN ended_at IS NOT NULL THEN completed END) completion, AVG(auto) auto
     FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} GROUP BY 1, 2 ORDER BY plays DESC`
  ).bind(start, end).all()).results;
  const gameTotals = (await db.prepare(
    `SELECT game, COUNT(*) plays, COUNT(DISTINCT ${PLAYER}) players,
       AVG(CASE WHEN ended_at IS NOT NULL THEN completed END) completion, AVG(auto) auto
     FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} GROUP BY game ORDER BY plays DESC`
  ).bind(start, end).all()).results;

  // D1 return: players whose first play ever was on day d, and how many of them played again on day d+1
  const firsts = (await db.prepare(
    `SELECT ${PLAYER} p, MIN(started_at) t FROM plays WHERE ${REAL} AND ${PLAYER} IS NOT NULL GROUP BY p HAVING t >= ? AND t < ?`
  ).bind(start, end).all()).results;
  const seen = new Set((await db.prepare(
    `SELECT DISTINCT ${PLAYER} p, ${dayOf("started_at")} d FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} AND ${PLAYER} IS NOT NULL`
  ).bind(start, end).all()).results.map((r) => r.p + "|" + r.d));

  const next = (await db.prepare(
    `SELECT ${dayOf("p.started_at")} d, COUNT(*) n FROM events e JOIN plays p ON p.id = e.play_id
     WHERE e.name = 'cc:next' AND p.started_at >= ? AND p.started_at < ? AND ${REAL} GROUP BY 1`
  ).bind(start, end).all()).results;
  const follows = (await db.prepare(
    `SELECT ${dayOf("ts")} d, json_extract(data, '$.platform') p, COUNT(*) n FROM events WHERE name = 'cc:follow_click' AND ts >= ? AND ts < ? GROUP BY 1, 2`
  ).bind(start, end).all()).results;
  const shares = (await db.prepare(
    `SELECT ${dayOf("ts")} d, COUNT(*) n FROM events WHERE name = 'cc:share' AND ts >= ? AND ts < ? GROUP BY 1`
  ).bind(start, end).all()).results;
  const dares = (await db.prepare(
    `SELECT ${dayOf("d.created_at")} d, COUNT(*) made, SUM(f.shared_at IS NOT NULL) sent, SUM(d.opens > 0) opened, SUM(d.beats > 0) beaten
     FROM dares d LEFT JOIN dare_funnel f ON f.dare_id = d.id
     WHERE d.created_at >= ? AND d.created_at < ? AND d.from_player NOT LIKE 'a:smoke%' GROUP BY 1`
  ).bind(start, end).all()).results;
  const accounts = (await db.prepare(
    `SELECT ${dayOf("created_at")} d, COUNT(*) n FROM users WHERE created_at >= ? AND created_at < ? GROUP BY 1`
  ).bind(start, end).all()).results;

  const at = (rows, i) => rows.find((r) => r.d === i) || {};
  const pct = (v) => (v == null ? null : Math.round(v * 100));
  const shape = (g) => ({ game: g.game, plays: g.plays, players: g.players, completion_pct: pct(g.completion), auto_pct: pct(g.auto) });

  const rows = dates.map((date, i) => {
    const p = at(plays, i);
    const ref = Object.fromEntries(CHANNELS.map((c) => [c, 0]));
    for (const r of refs) if (r.d === i) ref[CHANNELS.includes(r.r) ? r.r : "other"] += r.n;
    const newbies = firsts.filter((f) => f.t >= bounds[i] && f.t < bounds[i + 1]);
    const d1Known = i + 1 < dates.length; // tomorrow hasn't happened yet for the last day
    const back = d1Known ? newbies.filter((f) => seen.has(f.p + "|" + (i + 1))).length : null;
    const dr = at(dares, i);
    const nextPlays = at(next, i).n || 0;
    return {
      date, partial: i === dates.length - 1,
      plays: p.plays || 0, players: p.players || 0, new_players: newbies.length,
      d1_return: d1Known ? { back, of: newbies.length, pct: newbies.length ? Math.round((back / newbies.length) * 100) : null } : null,
      ref,
      next: { plays: nextPlays, per_run: p.ended ? Math.round((nextPlays / p.ended) * 1000) / 1000 : null },
      game_shares: at(shares, i).n || 0,
      follow_clicks: Object.fromEntries(FOLLOW_PLATFORMS.map((p) => [p, follows.filter((r) => r.d === i && r.p === p).reduce((s, r) => s + r.n, 0)])),
      dares: { made: dr.made || 0, sent: dr.sent || 0, opened: dr.opened || 0, beaten: dr.beaten || 0 },
      new_accounts: at(accounts, i).n || 0,
      games: perGame.filter((g) => g.d === i).map(shape),
    };
  });

  return json({ ok: true, tz: TZ, days: n, from: dates[0], to: dates[dates.length - 1], generated_at: new Date().toISOString(), rows, games: gameTotals.map(shape) });
}
