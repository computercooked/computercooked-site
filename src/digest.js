// GET /api/admin/digest?days=7: one compact row per Pacific-time day for the daily status check (CEO, money
// agent; scripts/digest.mjs prints it as a table). Everything is computed from existing tables, smoke traffic
// left out the same way as /api/admin/metrics.
import { json, now, REAL, weekOf } from "./util.js";
import { FOLLOW_PLATFORMS } from "./follow.js";
import { COOK_POLL, cookTally } from "./cook.js";

const TZ = "America/Los_Angeles";
const PLAYER = "COALESCE('u' || user_id, 'a' || anon_id)";
// game over (K-0065): runs that ended, their average length, and the average / best score of ended runs that had one
const OVER = `SUM(ended_at IS NOT NULL) ended, AVG(CASE WHEN ended_at IS NOT NULL THEN duration_ms END) ms,
       AVG(CASE WHEN ended_at IS NOT NULL THEN score END) avg_score, MAX(CASE WHEN ended_at IS NOT NULL THEN score END) best_score`;
const CHANNELS = ["tiktok", "youtube", "instagram", "x", "threads", "bluesky", "search", "short", "other", "direct", "internal", "app", "embed", "portal"];

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
       AVG(CASE WHEN ended_at IS NOT NULL THEN completed END) completion, AVG(auto) auto, ${OVER}
     FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} GROUP BY 1, 2 ORDER BY plays DESC`
  ).bind(start, end).all()).results;
  const gameTotals = (await db.prepare(
    `SELECT game, COUNT(*) plays, COUNT(DISTINCT ${PLAYER}) players,
       AVG(CASE WHEN ended_at IS NOT NULL THEN completed END) completion, AVG(auto) auto, ${OVER}
     FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} GROUP BY game ORDER BY plays DESC`
  ).bind(start, end).all()).results;

  // D1 return: players whose first play ever was on day d, and how many of them played again on day d+1
  const firsts = (await db.prepare(
    `SELECT ${PLAYER} p, MIN(started_at) t FROM plays WHERE ${REAL} AND ${PLAYER} IS NOT NULL GROUP BY p HAVING t >= ? AND t < ?`
  ).bind(start, end).all()).results;
  const seen = new Set((await db.prepare(
    `SELECT DISTINCT ${PLAYER} p, ${dayOf("started_at")} d FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL} AND ${PLAYER} IS NOT NULL`
  ).bind(start, end).all()).results.map((r) => r.p + "|" + r.d));

  // channel funnels (round 21: TikTok to the site, end to end). landed = the first page of a tab (cc:pageview land 1)
  // that came from the channel; played = people whose first-ever play from that channel fell on the day (first touch,
  // so each person counts once); second_game = of those, played 2+ different games that day; back_7d = of those,
  // played again (from anywhere: a return from the home screen is "direct") on one of the next 7 Pacific days;
  // still_open = not back yet and their 7 days aren't over (today counts as not over).
  const lands = (await db.prepare(
    `SELECT ${dayOf("ts")} d, json_extract(data, '$.ref') r, json_extract(data, '$.path') path, COUNT(*) n FROM events
     WHERE name = 'cc:pageview' AND json_extract(data, '$.land') = 1 AND ts >= ? AND ts < ? GROUP BY 1, 2, 3`
  ).bind(start, end).all()).results;
  const touch = (await db.prepare(
    `SELECT ${PLAYER} p, referrer r, MIN(started_at) t FROM plays
     WHERE ${REAL} AND ${PLAYER} IS NOT NULL AND referrer IS NOT NULL GROUP BY p, r HAVING t >= ? AND t < ?`
  ).bind(start, end).all()).results;
  const dayGames = (await db.prepare(
    `SELECT DISTINCT ${PLAYER} p, ${dayOf("started_at")} d, game FROM plays
     WHERE started_at >= ? AND started_at < ? AND ${REAL} AND ${PLAYER} IS NOT NULL`
  ).bind(start, end).all()).results;
  const chan = (r) => (CHANNELS.includes(r) ? r : "other");
  const gamesOn = {};
  for (const r of dayGames) (gamesOn[r.p + "|" + r.d] ||= new Set()).add(r.game);
  const dayIdx = (t) => bounds.findIndex((b, i) => i < dates.length && t < bounds[i + 1]);
  const cohorts = touch.map((c) => ({ p: c.p, r: chan(c.r), d: dayIdx(c.t) }));
  const lastDay = dates.length - 1;
  function funnel(ch, days) {
    const on = new Set(days);
    const landed = lands.filter((l) => on.has(l.d) && chan(l.r) === ch).reduce((s, l) => s + l.n, 0);
    const co = cohorts.filter((c) => c.r === ch && on.has(c.d));
    let back = 0, open = 0;
    for (const c of co) {
      let b = false;
      for (let k = c.d + 1; k <= Math.min(c.d + 7, lastDay) && !b; k++) b = seen.has(c.p + "|" + k);
      if (b) back++; else if (c.d + 7 >= lastDay) open++;
    }
    return { landed, played: co.length, second_game: co.filter((c) => (gamesOn[c.p + "|" + c.d]?.size || 0) >= 2).length, back_7d: back, still_open: open };
  }
  // tiktok always, plus every channel that landed or played in the window
  const funnelChannels = ["tiktok", ...CHANNELS.filter((c) => c !== "tiktok" && (lands.some((l) => chan(l.r) === c) || cohorts.some((x) => x.r === c)))];
  const allDays = dates.map((_, i) => i);
  const ttPages = {};
  for (const l of lands) if (chan(l.r) === "tiktok") ttPages[l.path || "?"] = (ttPages[l.path || "?"] || 0) + l.n;

  const next = (await db.prepare(
    `SELECT ${dayOf("p.started_at")} d, COUNT(*) n FROM events e JOIN plays p ON p.id = e.play_id
     WHERE e.name = 'cc:next' AND p.started_at >= ? AND p.started_at < ? AND ${REAL} GROUP BY 1`
  ).bind(start, end).all()).results;
  // "what should we cook next?" votes counted that day (cc:vote, src/cook.js), and the poll's running split
  const votes = (await db.prepare(
    `SELECT ${dayOf("ts")} d, COUNT(*) n FROM events WHERE name = 'cc:vote' AND ts >= ? AND ts < ? GROUP BY 1`
  ).bind(start, end).all()).results;
  const cookWeek = weekOf(now());
  const cook = { poll: COOK_POLL, week: cookWeek, ...(await cookTally(env, cookWeek)) };
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

  // site visits (K-0047): page views, daily visitors new/back and visible time on page, from POST /api/hit rows
  const views = (await db.prepare(
    `SELECT ${dayOf("ts")} d, COUNT(*) views, SUM(json_extract(data, '$.vis') = 'new') fresh, SUM(json_extract(data, '$.vis') = 'back') back
     FROM events WHERE name = 'cc:pageview' AND ts >= ? AND ts < ? GROUP BY 1`
  ).bind(start, end).all()).results;
  const stays = (await db.prepare(
    `SELECT ${dayOf("ts")} d, COUNT(*) n, AVG(json_extract(data, '$.ms')) ms FROM events WHERE name = 'cc:leave' AND ts >= ? AND ts < ? GROUP BY 1`
  ).bind(start, end).all()).results;
  // K-0065: "Tip the chef" clicks, and the homepage "your desk" row (K-0064): times shown, cards opened (resume = the
  // pick-up card), per day and per game opened
  const outs = (await db.prepare(
    `SELECT ${dayOf("ts")} d, name, game, json_extract(data, '$.slot') slot, json_extract(data, '$.place') place, COUNT(*) n FROM events
     WHERE name IN ('cc:tip_click', 'cc:desk_shown', 'cc:desk_click', 'cc:tiktok_out', 'cc:next_shown', 'cc:next_tap') AND ts >= ? AND ts < ? GROUP BY 1, 2, 3, 4, 5`
  ).bind(start, end).all()).results;
  const outN = (f) => outs.filter(f).reduce((s, r) => s + r.n, 0);
  // round 26: link-outs to TikTok. show_follow / show_episode = clicks on /show/ (cc:tiktok_out); follow_elsewhere = the
  // site's other TikTok follow buttons (cc:follow_click, platform tiktok); total = all three
  const ttOut = (f, dayF) => {
    const show_follow = outN((r) => f(r) && r.name === "cc:tiktok_out" && /^follow/.test(r.slot || ""));
    const show_episode = outN((r) => f(r) && r.name === "cc:tiktok_out" && r.slot === "episode");
    const follow_elsewhere = follows.filter((r) => dayF(r) && r.p === "tiktok").reduce((s, r) => s + r.n, 0);
    return { show_follow, show_episode, follow_elsewhere, total: show_follow + show_episode + follow_elsewhere };
  };
  const ttEps = (await db.prepare(
    `SELECT json_extract(data, '$.ep') ep, COUNT(*) n FROM events WHERE name = 'cc:tiktok_out' AND json_extract(data, '$.slot') = 'episode'
     AND ts >= ? AND ts < ? GROUP BY 1 ORDER BY 2 DESC`
  ).bind(start, end).all()).results;
  const deskOf = (f) => ({ shown: outN((r) => f(r) && r.name === "cc:desk_shown"), clicks: outN((r) => f(r) && r.name === "cc:desk_click" && r.slot !== "nudge"),
    nudge: outN((r) => f(r) && r.name === "cc:desk_click" && r.slot === "nudge"),
    resume: outN((r) => f(r) && r.name === "cc:desk_click" && r.slot === "resume") });
  // round 27: the results card's "try this next" tile. shown / taps = cc:next_shown / cc:next_tap (touch = on touch-only
  // devices); plays = taps that reached a started run (cc:next, by the run's start day); per_run = plays per ended run
  const nextOf = (f, plays, ended) => ({
    shown: outN((r) => f(r) && r.name === "cc:next_shown"), taps: outN((r) => f(r) && r.name === "cc:next_tap"), plays,
    per_run: ended ? Math.round((plays / ended) * 1000) / 1000 : null,
    touch: { shown: outN((r) => f(r) && r.name === "cc:next_shown" && r.slot === "touch"), taps: outN((r) => f(r) && r.name === "cc:next_tap" && r.slot === "touch") },
    // round 28: the quiet games' line under the bar (shown and taps above include it)
    bar: { shown: outN((r) => f(r) && r.name === "cc:next_shown" && r.place === "bar"), taps: outN((r) => f(r) && r.name === "cc:next_tap" && r.place === "bar") },
  });
  const deskGames = {};
  for (const r of outs) if (r.name === "cc:desk_click" && r.slot !== "nudge") deskGames[r.game] = (deskGames[r.game] || 0) + r.n;
  // per game page, whole window: views and average visible time
  const pageRows = (await db.prepare(
    `SELECT json_extract(data, '$.path') path, name, COUNT(*) n, AVG(json_extract(data, '$.ms')) ms FROM events
     WHERE name IN ('cc:pageview', 'cc:leave') AND ts >= ? AND ts < ? AND json_extract(data, '$.path') LIKE '/games/_%' GROUP BY 1, 2`
  ).bind(start, end).all()).results;
  const pages = {};
  for (const r of pageRows) {
    const m = /^\/games\/([a-z0-9-]+)\/?$/.exec(r.path || "");
    if (!m) continue;
    const g = pages[m[1]] || (pages[m[1]] = { game: m[1], views: 0, timed: 0, ms: 0 });
    if (r.name === "cc:pageview") g.views += r.n; else { g.ms = (g.ms * g.timed + r.ms * r.n) / (g.timed + r.n); g.timed += r.n; }
  }
  const secs = (ms) => (ms == null ? null : Math.round(ms / 1000));

  // K-0050a: every tagged link, whole window. One row per utm_source / utm_medium / utm_campaign: page views,
  // visitors (first view of the day in a browser) and plays that arrived with it
  const utmViews = (await db.prepare(
    `SELECT json_extract(data, '$.src') s, json_extract(data, '$.medium') m, json_extract(data, '$.campaign') c,
       COUNT(*) views, SUM(json_extract(data, '$.vis') IN ('new', 'back')) visitors
     FROM events WHERE name = 'cc:pageview' AND ts >= ? AND ts < ?
       AND (json_extract(data, '$.src') IS NOT NULL OR json_extract(data, '$.medium') IS NOT NULL OR json_extract(data, '$.campaign') IS NOT NULL)
     GROUP BY 1, 2, 3`
  ).bind(start, end).all()).results;
  const P = (sql) => sql.replace(/\b(anon_id|user_id)\b/g, "p.$1");
  const utmPlays = (await db.prepare(
    `SELECT u.source s, u.medium m, t.campaign c, COUNT(*) plays, GROUP_CONCAT(DISTINCT p.game) games
     FROM plays p LEFT JOIN play_utm u ON u.play_id = p.id LEFT JOIN play_tags t ON t.play_id = p.id
     WHERE p.started_at >= ? AND p.started_at < ? AND ${P(REAL)} AND (u.play_id IS NOT NULL OR t.play_id IS NOT NULL)
     GROUP BY 1, 2, 3`
  ).bind(start, end).all()).results;
  const utmRows = {};
  const utmKey = (r) => [r.s || "-", r.m || "-", r.c || "-"].join("|");
  for (const r of utmViews) utmRows[utmKey(r)] = { source: r.s, medium: r.m, campaign: r.c, page_views: r.views, visitors: r.visitors || 0, plays: 0, games: [] };
  for (const r of utmPlays) {
    const row = utmRows[utmKey(r)] || (utmRows[utmKey(r)] = { source: r.s, medium: r.m, campaign: r.c, page_views: 0, visitors: 0, plays: 0, games: [] });
    row.plays += r.plays; row.games = (r.games || "").split(",").filter(Boolean);
  }

  const at = (rows, i) => rows.find((r) => r.d === i) || {};
  const pct = (v) => (v == null ? null : Math.round(v * 100));
  const num = (v) => (v == null ? null : Math.round(v * 10) / 10);
  const shape = (g) => ({ game: g.game, plays: g.plays, players: g.players, completion_pct: pct(g.completion), auto_pct: pct(g.auto),
    runs_ended: g.ended || 0, avg_session_s: secs(g.ms), avg_score: num(g.avg_score), best_score: g.best_score });

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
      // played that day, and had played before (any game, any earlier day)
      returning_players: Math.max(0, (p.players || 0) - newbies.length),
      d1_return: d1Known ? { back, of: newbies.length, pct: newbies.length ? Math.round((back / newbies.length) * 100) : null } : null,
      ref,
      funnel: Object.fromEntries(funnelChannels.map((c) => [c, funnel(c, [i])])),
      next: nextOf((r) => r.d === i, nextPlays, p.ended || 0),
      runs_ended: p.ended || 0,
      game_shares: at(shares, i).n || 0,
      tip_clicks: outN((r) => r.d === i && r.name === "cc:tip_click"),
      tiktok_out: ttOut((r) => r.d === i, (r) => r.d === i),
      desk: deskOf((r) => r.d === i),
      votes: at(votes, i).n || 0,
      follow_clicks: Object.fromEntries(FOLLOW_PLATFORMS.map((p) => [p, follows.filter((r) => r.d === i && r.p === p).reduce((s, r) => s + r.n, 0)])),
      dares: { made: dr.made || 0, sent: dr.sent || 0, opened: dr.opened || 0, beaten: dr.beaten || 0 },
      new_accounts: at(accounts, i).n || 0,
      site: (() => {
        const v = at(views, i), st = at(stays, i), vis = (v.fresh || 0) + (v.back || 0);
        return { page_views: v.views || 0, visitors: vis, returning: v.back || 0, returning_pct: vis ? Math.round(((v.back || 0) / vis) * 100) : null, avg_time_s: secs(st.ms) };
      })(),
      games: perGame.filter((g) => g.d === i).map(shape),
    };
  });

  return json({ ok: true, version: 2, tz: TZ, days: n, from: dates[0], to: dates[dates.length - 1], generated_at: new Date().toISOString(), rows, games: gameTotals.map(shape), cook_vote: cook,
    funnel: { ...Object.fromEntries(funnelChannels.map((c) => [c, funnel(c, allDays)])),
      tiktok_landing_pages: Object.entries(ttPages).sort((a, b) => b[1] - a[1]).map(([path, n]) => ({ path, n })) },
    utm: Object.values(utmRows).sort((a, b) => b.plays - a.plays || b.page_views - a.page_views),
    desk: { ...deskOf(() => true), by_game: Object.fromEntries(Object.entries(deskGames).sort((a, b) => b[1] - a[1])) },
    next: nextOf(() => true, next.reduce((s, r) => s + r.n, 0), plays.reduce((s, r) => s + (r.ended || 0), 0)),
    tiktok_out: { ...ttOut(() => true, () => true), by_episode: Object.fromEntries(ttEps.filter((r) => r.ep).map((r) => [r.ep, r.n])) },
    game_pages: Object.values(pages).sort((a, b) => b.views - a.views).map((g) => ({ game: g.game, views: g.views, avg_time_s: secs(g.timed ? g.ms : null) })) });
}
