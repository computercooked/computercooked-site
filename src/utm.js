// GET /api/admin/utm?days=7 (K-0054): which tagged posts sent people, by utm_source and utm_campaign.
// The team's link: /games/GAME?utm_source=PLATFORM&utm_medium=social&utm_campaign=POSTID. assets/deck.js keeps the
// first tagged link of a tab (sessionStorage) and sends it with every page view; games/cc-sdk.js with every play.
//   sessions    page views marked land (the first page of a tab, so one per visit; reloads and clicks don't add)
//   visitors    first page view of the day in a browser (vis new / back), the same count as the digest
//   page_views  every page load carrying the tags
//   plays       game runs that started with the tags (play_utm source / medium, play_tags campaign), smoke left out
//   players     distinct players among those plays
// Smoke traffic (?cctest=1) is never stored by /api/hit, and REAL leaves it out of plays.
import { json, now, REAL } from "./util.js";

export async function utmReport(url, env) {
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get("days"), 10) || 7));
  const end = now(), start = end - days * 86400000;
  const db = env.DB;
  const views = (await db.prepare(
    `SELECT json_extract(data, '$.src') s, json_extract(data, '$.medium') m, json_extract(data, '$.campaign') c,
       COUNT(*) page_views, SUM(json_extract(data, '$.land') = 1) sessions,
       SUM(json_extract(data, '$.vis') IN ('new', 'back')) visitors,
       GROUP_CONCAT(DISTINCT CASE WHEN json_extract(data, '$.land') = 1 THEN json_extract(data, '$.path') END) landings
     FROM events WHERE name = 'cc:pageview' AND ts >= ? AND ts < ?
       AND (json_extract(data, '$.src') IS NOT NULL OR json_extract(data, '$.medium') IS NOT NULL OR json_extract(data, '$.campaign') IS NOT NULL)
     GROUP BY 1, 2, 3`
  ).bind(start, end).all()).results;
  const P = (sql) => sql.replace(/\b(anon_id|user_id)\b/g, "p.$1");
  const plays = (await db.prepare(
    `SELECT u.source s, u.medium m, t.campaign c, COUNT(*) plays,
       COUNT(DISTINCT COALESCE('u' || p.user_id, 'a' || p.anon_id)) players, GROUP_CONCAT(DISTINCT p.game) games
     FROM plays p LEFT JOIN play_utm u ON u.play_id = p.id LEFT JOIN play_tags t ON t.play_id = p.id
     WHERE p.started_at >= ? AND p.started_at < ? AND ${P(REAL)} AND (u.play_id IS NOT NULL OR t.play_id IS NOT NULL)
     GROUP BY 1, 2, 3`
  ).bind(start, end).all()).results;
  // every visit in the window, tagged or not, so a source's share of the whole site is readable
  const all = (await db.prepare(
    `SELECT COUNT(*) page_views, SUM(json_extract(data, '$.land') = 1) sessions FROM events WHERE name = 'cc:pageview' AND ts >= ? AND ts < ?`
  ).bind(start, end).first()) || {};
  const allPlays = (await db.prepare(`SELECT COUNT(*) n FROM plays WHERE started_at >= ? AND started_at < ? AND ${REAL}`).bind(start, end).first()) || {};

  const rows = {};
  const key = (r) => [r.s || "", r.m || "", r.c || ""].join("|");
  const row = (r) => rows[key(r)] || (rows[key(r)] = { source: r.s || null, medium: r.m || null, campaign: r.c || null,
    sessions: 0, visitors: 0, page_views: 0, plays: 0, players: 0, games: [], landing_pages: [] });
  for (const r of views) Object.assign(row(r), { sessions: r.sessions || 0, visitors: r.visitors || 0, page_views: r.page_views || 0,
    landing_pages: (r.landings || "").split(",").filter(Boolean) });
  for (const r of plays) Object.assign(row(r), { plays: r.plays || 0, players: r.players || 0, games: (r.games || "").split(",").filter(Boolean) });
  const list = Object.values(rows).sort((a, b) => b.plays - a.plays || b.sessions - a.sessions || b.page_views - a.page_views);

  // one line per utm_source, summed over its campaigns (players can repeat across campaigns, so it isn't summed)
  const bySource = {};
  for (const r of list) {
    const s = bySource[r.source || "-"] || (bySource[r.source || "-"] = { source: r.source, campaigns: 0, sessions: 0, visitors: 0, page_views: 0, plays: 0 });
    s.campaigns += r.campaign ? 1 : 0;
    for (const k of ["sessions", "visitors", "page_views", "plays"]) s[k] += r[k];
  }
  return json({
    ok: true, days, from: new Date(start).toISOString(), to: new Date(end).toISOString(),
    site: { sessions: all.sessions || 0, page_views: all.page_views || 0, plays: allPlays.n || 0 },
    sources: Object.values(bySource).sort((a, b) => b.plays - a.plays || b.sessions - a.sessions),
    rows: list,
  });
}
