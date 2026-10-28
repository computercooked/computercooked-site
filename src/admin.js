// Admin API, guarded by a bearer token stored as the ADMIN_TOKEN Worker secret.
import { json, bad, readJson, now, dayOf, safeEqual, limited, REAL } from "./util.js";
import { games } from "./db.js";
import { FOLLOW_PLATFORMS } from "./follow.js";
import { TIP_SLOTS } from "./hits.js";
import { rankWinners } from "./winners.js";

export function isAdmin(req, env, ip) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!env.ADMIN_TOKEN || env.ADMIN_TOKEN.length < 24) return false;
  if (limited("admin:" + ip, 120, 60000)) return false;
  return safeEqual(token, env.ADMIN_TOKEN);
}

const PLAYER = "COALESCE('u' || user_id, 'a' || anon_id)";

// GET /api/admin/metrics?since=YYYY-MM-DD
export async function metrics(url, env, origin) {
  const since = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("since") || "") ? url.searchParams.get("since") : dayOf(now() - 7 * 86400000);
  const today = dayOf(now());
  const catalog = await games(env, origin);
  const db = env.DB;

  const base = (await db.prepare(
    `SELECT game, COUNT(*) plays, COUNT(DISTINCT ${PLAYER}) players,
       AVG(duration_ms) avg_ms,
       AVG(CASE WHEN ended_at IS NOT NULL THEN completed END) completion,
       SUM(auto) auto_plays, SUM(ended_at IS NOT NULL) finished
     FROM plays WHERE day >= ? AND ${REAL} GROUP BY game`
  ).bind(since).all()).results;

  const fb = (await db.prepare(
    `SELECT game, COUNT(*) n, SUM(rating = 1) up, SUM(rating = -1) down FROM feedback WHERE ts >= ? AND ${REAL} GROUP BY game`
  ).bind(Date.parse(since)).all()).results;

  const refs = (await db.prepare(
    `SELECT game, referrer, COUNT(*) n FROM plays WHERE day >= ? AND ${REAL} GROUP BY game, referrer ORDER BY n DESC`
  ).bind(since).all()).results;

  const testers = (await db.prepare(
    `SELECT game, tester, COUNT(*) n FROM plays WHERE day >= ? AND tester IS NOT NULL AND ${REAL} GROUP BY game, tester ORDER BY n DESC`
  ).bind(since).all()).results;

  const devices = (await db.prepare(
    `SELECT game, device, COUNT(*) n FROM plays WHERE day >= ? AND ${REAL} GROUP BY game, device`
  ).bind(since).all()).results;

  // D1 / D7 return: of players whose FIRST play of this game was on/after `since`,
  // the share who played it again exactly 1 / 7 days later. Only cohorts old enough count.
  const ret = (await db.prepare(
    `WITH firsts AS (
       SELECT game, ${PLAYER} p, MIN(day) d FROM plays WHERE ${REAL} GROUP BY game, p HAVING d >= ?
     ), days AS (
       SELECT DISTINCT game, ${PLAYER} p, day FROM plays WHERE day >= ? AND ${REAL}
     )
     SELECT f.game,
       SUM(f.d <= date(?, '-1 day')) n1,
       SUM(f.d <= date(?, '-1 day') AND EXISTS (SELECT 1 FROM days x WHERE x.game = f.game AND x.p = f.p AND x.day = date(f.d, '+1 day'))) r1,
       SUM(f.d <= date(?, '-7 day')) n7,
       SUM(f.d <= date(?, '-7 day') AND EXISTS (SELECT 1 FROM days x WHERE x.game = f.game AND x.p = f.p AND x.day = date(f.d, '+7 day'))) r7
     FROM firsts f GROUP BY f.game`
  ).bind(since, since, today, today, today, today).all()).results;

  // shares per game: dares made / actually sent, plus "share this game" sends (cc:share, smoke never stored)
  const dareShares = (await db.prepare(
    `SELECT d.game, COUNT(*) made, SUM(f.shared_at IS NOT NULL) sent FROM dares d LEFT JOIN dare_funnel f ON f.dare_id = d.id
     WHERE d.created_at >= ? AND d.from_player NOT LIKE 'a:smoke%' GROUP BY d.game`
  ).bind(Date.parse(since)).all()).results;
  const gameShares = (await db.prepare(
    "SELECT game, COUNT(*) n FROM events WHERE name = 'cc:share' AND ts >= ? GROUP BY game"
  ).bind(Date.parse(since)).all()).results;

  // funnel inputs: game page views (from the path, so older rows count too) and follow clicks per game
  const pvPaths = (await db.prepare(
    "SELECT json_extract(data, '$.path') path, COUNT(*) n FROM events WHERE name = 'cc:pageview' AND ts >= ? AND json_extract(data, '$.path') LIKE '/games/%' GROUP BY 1"
  ).bind(Date.parse(since)).all()).results;
  const landed = {};
  for (const r of pvPaths) { const m = /^\/games\/([a-z0-9-]+)\/?/.exec(r.path || ""); if (m) landed[m[1]] = (landed[m[1]] || 0) + r.n; }
  const fcGames = (await db.prepare(
    "SELECT game, COUNT(*) n FROM events WHERE name = 'cc:follow_click' AND ts >= ? GROUP BY game"
  ).bind(Date.parse(since)).all()).results;

  const latest = (await db.prepare(
    `SELECT game, rating, text, tester, version, ts FROM feedback WHERE ts >= ? AND text IS NOT NULL AND ${REAL} ORDER BY ts DESC LIMIT 200`
  ).bind(Date.parse(since)).all()).results;

  const slugs = new Set([...catalog.keys(), ...base.map((r) => r.game)]);
  const pick = (arr, g) => arr.filter((r) => r.game === g);
  const out = [...slugs].map((g) => {
    const b = base.find((r) => r.game === g) || {};
    const f = fb.find((r) => r.game === g) || {};
    const r = ret.find((x) => x.game === g) || {};
    const rated = (f.up || 0) + (f.down || 0);
    const ds = dareShares.find((x) => x.game === g) || {}, gs1 = gameShares.find((x) => x.game === g) || {};
    const outside = pick(refs, g).filter((x) => x.referrer && x.referrer !== "internal").reduce((n, x) => n + x.n, 0);
    return {
      game: g,
      title: catalog.get(g)?.title || g,
      plays: b.plays || 0,
      unique_players: b.players || 0,
      avg_session_seconds: b.avg_ms ? Math.round(b.avg_ms / 100) / 10 : null,
      completion_rate: b.completion == null ? null : Math.round(b.completion * 1000) / 1000,
      auto_logged_plays: b.auto_plays || 0,
      total_minutes: b.avg_ms && b.plays ? Math.round((b.avg_ms * b.plays) / 60000) : 0,
      outside_plays: outside,
      shares: { dares_made: ds.made || 0, dares_sent: ds.sent || 0, game_shares: gs1.n || 0, total: (ds.sent || 0) + (gs1.n || 0) },
      funnel: {
        landed: landed[g] || 0, played: b.plays || 0, finished: b.finished || 0,
        shared: (ds.sent || 0) + (gs1.n || 0), followed: (fcGames.find((x) => x.game === g) || {}).n || 0,
      },
      d1_return_rate: r.n1 ? Math.round((r.r1 / r.n1) * 1000) / 1000 : null,
      d1_cohort: r.n1 || 0,
      d7_return_rate: r.n7 ? Math.round((r.r7 / r.n7) * 1000) / 1000 : null,
      d7_cohort: r.n7 || 0,
      avg_rating: rated ? Math.round(((f.up - f.down) / rated) * 1000) / 1000 : null, // -1..1
      thumbs_up: f.up || 0,
      thumbs_down: f.down || 0,
      feedback_count: f.n || 0,
      latest_feedback: pick(latest, g).slice(0, 10).map(({ rating, text, tester, version, ts }) => ({ rating, text, tester, version, at: new Date(ts).toISOString() })),
      top_referrers: pick(refs, g).slice(0, 5).map(({ referrer, n }) => ({ referrer, plays: n })),
      testers: pick(testers, g).map(({ tester, n }) => ({ tester, plays: n })),
      devices: Object.fromEntries(pick(devices, g).map(({ device, n }) => [device, n])),
    };
  }).sort((a, b) => b.plays - a.plays);

  // challenge-a-friend funnel for dares made since `since`: made → sent → opened → beaten, split by where the
  // offer came from (best = shown after a new personal best, button = asked for after any run)
  const funnel = (await db.prepare(
    `SELECT COALESCE(f.source, 'button') source, COUNT(*) made, SUM(f.shared_at IS NOT NULL) sent,
       SUM(f.shared_how = 'share') via_share, SUM(f.shared_how = 'copy') via_copy,
       SUM(f.shared_how = 'card') via_card, SUM(f.shared_how = 'download') via_download,
       SUM(d.opens > 0) opened, SUM(d.opens) opens, SUM(d.beats > 0) beaten, SUM(d.beats) beats
     FROM dares d LEFT JOIN dare_funnel f ON f.dare_id = d.id WHERE d.created_at >= ? AND d.from_player NOT LIKE 'a:smoke%' GROUP BY 1`
  ).bind(Date.parse(since)).all()).results;
  const rate = (a, b) => (b ? Math.round((a / b) * 1000) / 1000 : null);
  const step = (rows) => {
    const s = (k) => rows.reduce((n, r) => n + (r[k] || 0), 0);
    const made = s("made"), sent = s("sent"), opened = s("opened"), beaten = s("beaten");
    return { made, sent, via_share: s("via_share"), via_copy: s("via_copy"), via_card: s("via_card"), via_download: s("via_download"), opened, opens: s("opens"), beaten, beats: s("beats"),
      sent_rate: rate(sent, made), open_rate: rate(opened, sent || made), beat_rate: rate(beaten, opened) };
  };
  const dares = { ...step(funnel), by_source: Object.fromEntries(["best", "button"].map((k) => [k, step(funnel.filter((r) => r.source === k))])) };

  // "play next" rail: plays started from it (cc:next events) per run ended, split by which card was tapped
  const nx = (await db.prepare(
    `SELECT COALESCE(json_extract(e.data, '$.slot'), 'other') slot, COUNT(*) plays, SUM(p.ended_at IS NOT NULL) ended
     FROM events e JOIN plays p ON p.id = e.play_id WHERE e.name = 'cc:next' AND p.day >= ? AND ${REAL} GROUP BY 1`
  ).bind(since).all()).results;
  const runsEnded = await db.prepare(`SELECT COUNT(*) n FROM plays WHERE day >= ? AND ended_at IS NOT NULL AND ${REAL}`).bind(since).first("n");
  const nextPlays = nx.reduce((n, r) => n + r.plays, 0);
  const next = {
    runs_ended: runsEnded || 0, plays: nextPlays, ended: nx.reduce((n, r) => n + (r.ended || 0), 0),
    per_run: rate(nextPlays, runsEnded),
    by_slot: Object.fromEntries(["challenge", "similar", "new"].map((k) => [k, (nx.find((r) => r.slot === k) || {}).plays || 0])),
  };

  // "share this game" after runs with no score (no dare): sends by method (smoke ones are never stored)
  const gs = (await db.prepare(
    "SELECT json_extract(data, '$.how') how, COUNT(*) n FROM events WHERE name = 'cc:share' AND ts >= ? GROUP BY 1"
  ).bind(Date.parse(since)).all()).results;
  const gsOf = (k) => (gs.find((r) => r.how === k) || {}).n || 0;
  const game_shares = { sent: gs.reduce((n, r) => n + r.n, 0), via_share: gsOf("share"), via_copy: gsOf("copy"), via_card: gsOf("card"), via_download: gsOf("download") };

  // "follow @computercooked" clicks (site → socials), by platform and by where the button was
  const fc = (await db.prepare(
    "SELECT json_extract(data, '$.platform') platform, json_extract(data, '$.slot') slot, COUNT(*) n FROM events WHERE name = 'cc:follow_click' AND ts >= ? GROUP BY 1, 2"
  ).bind(Date.parse(since)).all()).results;
  const sumBy = (k, v) => fc.filter((r) => r[k] === v).reduce((n, r) => n + r.n, 0);
  const follow_clicks = {
    total: fc.reduce((n, r) => n + r.n, 0),
    by_platform: Object.fromEntries(FOLLOW_PLATFORMS.map((p) => [p, sumBy("platform", p)])),
    by_slot: Object.fromEntries(["hub-card", "hub-footer", "post-run"].map((s) => [s, sumBy("slot", s)])),
  };

  // site measurement (src/hits.js): page views, tip clicks and tip successes, each with the visit's channel and campaign
  const hits = (await db.prepare(
    `SELECT name, json_extract(data, '$.path') path, json_extract(data, '$.ref') ref, json_extract(data, '$.campaign') campaign,
       json_extract(data, '$.slot') slot, COUNT(*) n
     FROM events WHERE name IN ('cc:pageview', 'cc:tip_click', 'cc:tip_success') AND ts >= ? GROUP BY 1, 2, 3, 4, 5`
  ).bind(Date.parse(since)).all()).results;
  const tally = (rows, key) => {
    const m = {};
    for (const r of rows) { const k = r[key] == null ? "none" : r[key]; m[k] = (m[k] || 0) + r.n; }
    return Object.fromEntries(Object.entries(m).sort((a, b) => b[1] - a[1]));
  };
  const ofKind = (k) => hits.filter((r) => r.name === "cc:" + k);
  const pv = ofKind("pageview"), tc = ofKind("tip_click"), ts = ofKind("tip_success");
  const total = (rows) => rows.reduce((n, r) => n + r.n, 0);
  const pageviews = { total: total(pv), by_ref: tally(pv, "ref"), by_path: Object.fromEntries(Object.entries(tally(pv, "path")).slice(0, 20)) };
  const tcSlots = tally(tc, "slot");
  const tips = {
    clicks: total(tc), clicks_by_slot: Object.fromEntries(TIP_SLOTS.concat("other").map((k) => [k, tcSlots[k] || 0])),
    clicks_by_ref: tally(tc, "ref"), successes: total(ts), successes_by_ref: tally(ts, "ref"),
  };
  // real plays by channel, and everything by utm_campaign (plays via play_tags)
  const playsRef = (await db.prepare(`SELECT referrer, COUNT(*) n FROM plays WHERE day >= ? AND ${REAL} GROUP BY 1`).bind(since).all()).results;
  const plays_by_ref = tally(playsRef, "referrer");
  const playsCamp = (await db.prepare(
    `SELECT t.campaign, COUNT(*) n FROM plays p JOIN play_tags t ON t.play_id = p.id WHERE p.day >= ? AND ${REAL.replace(/anon_id/g, "p.anon_id").replace(/user_id/g, "p.user_id")} GROUP BY 1`
  ).bind(since).all()).results;
  const campaigns = {};
  const bump = (c, k, n) => { if (!c) return; campaigns[c] = campaigns[c] || { pageviews: 0, plays: 0, tip_clicks: 0, tip_successes: 0 }; campaigns[c][k] += n; };
  for (const r of pv) bump(r.campaign, "pageviews", r.n);
  for (const r of tc) bump(r.campaign, "tip_clicks", r.n);
  for (const r of ts) bump(r.campaign, "tip_successes", r.n);
  for (const r of playsCamp) bump(r.campaign, "plays", r.n);

  // smoke-test traffic left out of everything above, counted here so a live smoke run can be confirmed excluded
  const test = await db.prepare(
    `SELECT (SELECT COUNT(*) FROM plays WHERE day >= ?1 AND NOT ${REAL}) plays,
       (SELECT COUNT(*) FROM scores WHERE day >= ?1 AND player LIKE 'a:smoke%') scores,
       (SELECT COUNT(*) FROM scores WHERE day >= ?1 AND player LIKE 'a:smoke%' AND hidden = 0) scores_visible,
       (SELECT COUNT(*) FROM feedback WHERE ts >= ?2 AND NOT ${REAL}) feedback,
       (SELECT COUNT(*) FROM dares WHERE created_at >= ?2 AND from_player LIKE 'a:smoke%') dares,
       (SELECT COUNT(*) FROM events e JOIN plays p ON p.id = e.play_id WHERE e.name = 'cc:next' AND p.day >= ?1 AND NOT ${REAL}) next,
       (SELECT COUNT(*) FROM events WHERE name LIKE 'test:cc:%' AND ts >= ?2) site_hits`
  ).bind(since, Date.parse(since)).first();
  const users = await db.prepare("SELECT COUNT(*) n, SUM(created_at >= ?) new FROM users").bind(Date.parse(since)).first();
  const opened = await db.prepare("SELECT COUNT(*) n FROM events WHERE name = 'cc:dare_opened' AND ts >= ?").bind(Date.parse(since)).first("n");
  // the whole site, one line: land → play → finish → share → follow / tip / sign up
  const sum = (k) => out.reduce((n, g) => n + g.funnel[k], 0);
  // ad moments under the assets/ads.js caps (no network yet): what an ad network would get to fill
  const ad = (await db.prepare(
    "SELECT json_extract(data, '$.slot') slot, COUNT(*) n FROM events WHERE name = 'cc:ad_slot' AND ts >= ? GROUP BY 1"
  ).bind(Date.parse(since)).all()).results;
  const adN = (k) => (ad.find((r) => r.slot === k) || {}).n || 0;
  const ad_slots = { interstitial: adN("interstitial"), rewarded: adN("rewarded") };
  const site_funnel = {
    landed: pageviews.total, played: out.reduce((n, g) => n + g.plays, 0), finished: sum("finished"),
    shared: dares.sent + game_shares.sent, dares_opened: opened || 0,
    followed: follow_clicks.total, tip_clicks: tips.clicks, signups: users.new || 0,
  };
  const pending = await db.prepare("SELECT COUNT(*) n FROM uploads WHERE status = 'pending'").first("n");
  const reports = await db.prepare("SELECT COUNT(*) n FROM reports WHERE resolved = 0").first("n");
  return json({
    ok: true, since, generated_at: new Date().toISOString(),
    totals: {
      plays: out.reduce((s, g) => s + g.plays, 0),
      accounts: users.n || 0, new_accounts: users.new || 0,
      uploads_pending: pending || 0, open_reports: reports || 0,
    },
    funnel: site_funnel,
    ad_slots,
    dares,
    game_shares,
    follow_clicks,
    pageviews,
    tips,
    plays_by_ref,
    campaigns,
    next,
    test_traffic: test,
    winners: rankWinners(out),
    games: out,
  });
}

// GET /api/admin/reports
export async function listReports(env) {
  const { results } = await env.DB.prepare("SELECT * FROM reports WHERE resolved = 0 ORDER BY ts DESC LIMIT 100").all();
  return json({ ok: true, reports: results });
}

// POST /api/admin/moderate {action, id}
//   hide-score / show-score (scores.id), hide-user / ban-user / restore-user (users.username), resolve-report (reports.id)
export async function moderate(req, env) {
  const b = await readJson(req, 2048);
  const db = env.DB;
  switch (b.action) {
    case "hide-score": await db.prepare("UPDATE scores SET hidden = 1 WHERE id = ?").bind(+b.id).run(); break;
    case "show-score": await db.prepare("UPDATE scores SET hidden = 0 WHERE id = ?").bind(+b.id).run(); break;
    case "ban-user": {
      const u = await db.prepare("SELECT id FROM users WHERE username = ?").bind(String(b.id)).first("id");
      if (!u) return bad("no such user", 404);
      await db.batch([
        db.prepare("UPDATE users SET status = 'banned' WHERE id = ?").bind(u),
        db.prepare("UPDATE scores SET hidden = 1 WHERE user_id = ?").bind(u),
        db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(u),
      ]);
      break;
    }
    case "restore-user": {
      const u = await db.prepare("SELECT id FROM users WHERE username = ?").bind(String(b.id)).first("id");
      if (!u) return bad("no such user", 404);
      await db.batch([
        db.prepare("UPDATE users SET status = 'active' WHERE id = ?").bind(u),
        db.prepare("UPDATE scores SET hidden = 0 WHERE user_id = ?").bind(u),
      ]);
      break;
    }
    case "resolve-report": await db.prepare("UPDATE reports SET resolved = 1 WHERE id = ?").bind(+b.id).run(); break;
    default: return bad("unknown action");
  }
  return json({ ok: true });
}

// POST /api/admin/test-traffic: flag the team's own visits that were stored before test mode (?cctest=1) was on.
//   {from, to}                       list (dry run): page views/tip hits and plays stored between two ms timestamps (≤ 6h)
//   {flag: {events: [id], plays: [id]}}    flag them: hit events renamed test:cc:<kind>, plays get a "smoke-flag-" anon id,
//                                          so every count leaves them out. Nothing is deleted.
//   {unflag: {events: [id], plays: [id]}}  undo exactly that
const HIT_NAMES = ["cc:pageview", "cc:tip_click", "cc:tip_success"];
export async function testTraffic(req, env) {
  const b = await readJson(req, 8192);
  const db = env.DB;
  const ids = (a, ok) => (Array.isArray(a) ? a : []).slice(0, 200).filter(ok);
  const op = b.flag || b.unflag;
  if (op) {
    const ev = ids(op.events, (n) => Number.isInteger(n) && n > 0), pl = ids(op.plays, (s) => typeof s === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(s));
    const stmts = [];
    for (const id of ev) stmts.push(b.flag
      ? db.prepare(`UPDATE events SET name = 'test:' || name WHERE id = ? AND play_id IS NULL AND name IN (${HIT_NAMES.map(() => "?").join(",")})`).bind(id, ...HIT_NAMES)
      : db.prepare("UPDATE events SET name = substr(name, 6) WHERE id = ? AND play_id IS NULL AND name LIKE 'test:cc:%'").bind(id));
    for (const id of pl) stmts.push(b.flag
      ? db.prepare("UPDATE plays SET anon_id = 'smoke-flag-' || COALESCE(anon_id, '') WHERE id = ? AND user_id IS NULL AND COALESCE(anon_id, '') NOT LIKE 'smoke%'").bind(id)
      : db.prepare("UPDATE plays SET anon_id = NULLIF(substr(anon_id, 12), '') WHERE id = ? AND anon_id LIKE 'smoke-flag-%'").bind(id));
    const res = stmts.length ? await db.batch(stmts) : [];
    const changed = res.map((r) => r.meta?.changes || 0);
    return json({ ok: true, action: b.flag ? "flag" : "unflag",
      events: changed.slice(0, ev.length).reduce((n, c) => n + c, 0), plays: changed.slice(ev.length).reduce((n, c) => n + c, 0) });
  }
  const from = +b.from, to = +b.to;
  if (!(from > 0 && to > from && to - from <= 6 * 3600e3)) return bad("from/to? (ms, up to 6h apart)", 400);
  const events = (await db.prepare(
    `SELECT id, ts, name, game, json_extract(data, '$.path') path, json_extract(data, '$.ref') ref FROM events
     WHERE ts >= ? AND ts < ? AND play_id IS NULL AND (name IN (${HIT_NAMES.map(() => "?").join(",")}) OR name LIKE 'test:cc:%') ORDER BY ts`
  ).bind(from, to, ...HIT_NAMES).all()).results;
  const plays = (await db.prepare(
    "SELECT id, started_at ts, game, referrer ref, device, (user_id IS NOT NULL) signed_in, (COALESCE(anon_id, '') LIKE 'smoke%') test FROM plays WHERE started_at >= ? AND started_at < ? ORDER BY started_at"
  ).bind(from, to).all()).results;
  return json({ ok: true, events, plays });
}
