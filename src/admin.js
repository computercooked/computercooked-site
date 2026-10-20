// Admin API, guarded by a bearer token stored as the ADMIN_TOKEN Worker secret.
import { json, bad, readJson, now, dayOf, safeEqual, limited, REAL } from "./util.js";
import { games } from "./db.js";

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
       SUM(auto) auto_plays
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
    return {
      game: g,
      title: catalog.get(g)?.title || g,
      plays: b.plays || 0,
      unique_players: b.players || 0,
      avg_session_seconds: b.avg_ms ? Math.round(b.avg_ms / 100) / 10 : null,
      completion_rate: b.completion == null ? null : Math.round(b.completion * 1000) / 1000,
      auto_logged_plays: b.auto_plays || 0,
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
       SUM(d.opens > 0) opened, SUM(d.opens) opens, SUM(d.beats > 0) beaten, SUM(d.beats) beats
     FROM dares d LEFT JOIN dare_funnel f ON f.dare_id = d.id WHERE d.created_at >= ? AND d.from_player NOT LIKE 'a:smoke%' GROUP BY 1`
  ).bind(Date.parse(since)).all()).results;
  const rate = (a, b) => (b ? Math.round((a / b) * 1000) / 1000 : null);
  const step = (rows) => {
    const s = (k) => rows.reduce((n, r) => n + (r[k] || 0), 0);
    const made = s("made"), sent = s("sent"), opened = s("opened"), beaten = s("beaten");
    return { made, sent, via_share: s("via_share"), via_copy: s("via_copy"), opened, opens: s("opens"), beaten, beats: s("beats"),
      sent_rate: rate(sent, made), open_rate: rate(opened, sent || made), beat_rate: rate(beaten, opened) };
  };
  const dares = { ...step(funnel), by_source: Object.fromEntries(["best", "button"].map((k) => [k, step(funnel.filter((r) => r.source === k))])) };

  // smoke-test traffic left out of everything above, counted here so a live smoke run can be confirmed excluded
  const test = await db.prepare(
    `SELECT (SELECT COUNT(*) FROM plays WHERE day >= ?1 AND NOT ${REAL}) plays,
       (SELECT COUNT(*) FROM scores WHERE day >= ?1 AND player LIKE 'a:smoke%') scores,
       (SELECT COUNT(*) FROM scores WHERE day >= ?1 AND player LIKE 'a:smoke%' AND hidden = 0) scores_visible,
       (SELECT COUNT(*) FROM feedback WHERE ts >= ?2 AND NOT ${REAL}) feedback,
       (SELECT COUNT(*) FROM dares WHERE created_at >= ?2 AND from_player LIKE 'a:smoke%') dares`
  ).bind(since, Date.parse(since)).first();
  const users = await db.prepare("SELECT COUNT(*) n, SUM(created_at >= ?) new FROM users").bind(Date.parse(since)).first();
  const pending = await db.prepare("SELECT COUNT(*) n FROM uploads WHERE status = 'pending'").first("n");
  const reports = await db.prepare("SELECT COUNT(*) n FROM reports WHERE resolved = 0").first("n");
  return json({
    ok: true, since, generated_at: new Date().toISOString(),
    totals: {
      plays: out.reduce((s, g) => s + g.plays, 0),
      accounts: users.n || 0, new_accounts: users.new || 0,
      uploads_pending: pending || 0, open_reports: reports || 0,
    },
    dares,
    test_traffic: test,
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
