// Admin API, guarded by a bearer token stored as the ADMIN_TOKEN Worker secret.
import { json, bad, readJson, now, dayOf, safeEqual, limited } from "./util.js";
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
     FROM plays WHERE day >= ? GROUP BY game`
  ).bind(since).all()).results;

  const fb = (await db.prepare(
    `SELECT game, COUNT(*) n, SUM(rating = 1) up, SUM(rating = -1) down FROM feedback WHERE ts >= ? GROUP BY game`
  ).bind(Date.parse(since)).all()).results;

  const refs = (await db.prepare(
    `SELECT game, referrer, COUNT(*) n FROM plays WHERE day >= ? GROUP BY game, referrer ORDER BY n DESC`
  ).bind(since).all()).results;

  const testers = (await db.prepare(
    `SELECT game, tester, COUNT(*) n FROM plays WHERE day >= ? AND tester IS NOT NULL GROUP BY game, tester ORDER BY n DESC`
  ).bind(since).all()).results;

  const devices = (await db.prepare(
    `SELECT game, device, COUNT(*) n FROM plays WHERE day >= ? GROUP BY game, device`
  ).bind(since).all()).results;

  // D1 / D7 return: of players whose FIRST play of this game was on/after `since`,
  // the share who played it again exactly 1 / 7 days later. Only cohorts old enough count.
  const ret = (await db.prepare(
    `WITH firsts AS (
       SELECT game, ${PLAYER} p, MIN(day) d FROM plays GROUP BY game, p HAVING d >= ?
     ), days AS (
       SELECT DISTINCT game, ${PLAYER} p, day FROM plays WHERE day >= ?
     )
     SELECT f.game,
       SUM(f.d <= date(?, '-1 day')) n1,
       SUM(f.d <= date(?, '-1 day') AND EXISTS (SELECT 1 FROM days x WHERE x.game = f.game AND x.p = f.p AND x.day = date(f.d, '+1 day'))) r1,
       SUM(f.d <= date(?, '-7 day')) n7,
       SUM(f.d <= date(?, '-7 day') AND EXISTS (SELECT 1 FROM days x WHERE x.game = f.game AND x.p = f.p AND x.day = date(f.d, '+7 day'))) r7
     FROM firsts f GROUP BY f.game`
  ).bind(since, since, today, today, today, today).all()).results;

  const latest = (await db.prepare(
    `SELECT game, rating, text, tester, version, ts FROM feedback WHERE ts >= ? AND text IS NOT NULL ORDER BY ts DESC LIMIT 200`
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
