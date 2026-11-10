// /champs/: the wall of epic gamers. One crown per game: whoever holds the all-time #1 (the same rule as the EPIC GAMER
// tag on each game's leaderboard: highest score, a tie goes to whoever set it first), plus this week's leader.
// Rendered on the server from the live boards and kept for 5 minutes per isolate. No play counts are shown.
import { ensureSchema, games as catalogOf } from "./db.js";
import { now, weekOf, themeAttr } from "./util.js";
import { people } from "./friends.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const dateOf = (ms) => { const d = new Date(ms); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const TOP = (where) => `SELECT game, player, user_id, name, score, ts FROM (SELECT game, player, user_id, name, score, ts,
  ROW_NUMBER() OVER (PARTITION BY game ORDER BY score DESC, ts ASC) rn FROM scores WHERE hidden = 0${where}) WHERE rn = 1`;

let cache = { at: 0, v: null };
export async function champsData(env, catalog) {
  const t = now();
  if (cache.v && t - cache.at < 300000 && t >= cache.at) return cache.v;
  await ensureSchema(env);
  const [all, week] = await Promise.all([
    env.DB.prepare(TOP("")).all(),
    env.DB.prepare(TOP(" AND week = ?")).bind(weekOf(t)).all(),
  ]);
  const rows = all.results.filter((r) => { const g = catalog.get(r.game); return g && g.made_by === "computer-cooked"; });
  const wk = new Map(week.results.map((r) => [r.game, r]));
  const who = await people(env, rows.map((r) => r.user_id).concat(week.results.map((r) => r.user_id)).filter(Boolean));
  const face = (r) => { const p = r.user_id && who.get(r.user_id); return { key: r.player, name: p ? p.name : r.name, u: p ? p.username : null, score: r.score, ts: r.ts }; };
  // the newest crowns first: the wall changes at the top when someone takes one
  const list = rows.map((r) => ({ game: r.game, champ: face(r), week: wk.has(r.game) ? face(wk.get(r.game)) : null })).sort((a, b) => b.champ.ts - a.champ.ts);
  // most crowns: players holding more than one
  const tally = new Map();
  for (const x of list) { const c = tally.get(x.champ.key) || { who: x.champ, n: 0 }; c.n++; tally.set(x.champ.key, c); }
  const most = [...tally.values()].filter((c) => c.n > 1).sort((a, b) => b.n - a.n).slice(0, 5);
  const v = { list, most, at: t };
  cache = { at: t, v };
  return v;
}

const person = (p) => p.u ? `<a class="champ-who" href="/u/${esc(p.u)}">${esc(p.name)}</a>` : `<span class="champ-who">${esc(p.name)}</span>`;

function card(x, g, t) {
  const fresh = t - x.champ.ts < 2 * 86400000;
  const href = `/games/${encodeURIComponent(g.slug)}/?ref=champs`;
  const same = x.week && x.week.key === x.champ.key;
  const week = !x.week ? "nobody yet. it's open."
    : same ? `${esc(x.champ.name)} again, <span class="num">${fmt(x.week.score)}</span>`
    : `${person(x.week)} <span class="num">${fmt(x.week.score)}</span>`;
  return `<li class="champ-card${fresh ? " is-fresh" : ""}"${themeAttr(g)}>` +
    `<a class="champ-cover" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(g.thumbnail)}" alt="" width="640" height="400" loading="lazy" decoding="async"></a>` +
    `<div class="champ-body"><h2 class="champ-game"><a href="${href}">${esc(g.title)}</a>${fresh ? ' <span class="champ-new">new crown</span>' : ""}</h2>` +
    `<p class="champ-line"><span class="champ-crown" aria-hidden="true">♛</span> ${person(x.champ)} <span class="champ-score num">${fmt(x.champ.score)}</span></p>` +
    `<p class="champ-meta">#1 since <time datetime="${new Date(x.champ.ts).toISOString().slice(0, 10)}">${dateOf(x.champ.ts)}</time> · this week: ${week}</p></div>` +
    `<a class="champ-cta" href="${href}" aria-label="take the crown on ${esc(g.title)}">take the crown ▶</a></li>`;
}

export async function champsPage(req, env, url) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  let data = null, catalog = new Map();
  try { catalog = await catalogOf(env, url.origin); if (env.DB && catalog.size) data = await champsData(env, catalog); } catch (e) { /* no database: the static page */ }
  if (!data || !data.list.length) return page;
  const rw = new HTMLRewriter()
    .on("#champ-list", { element(e) { e.setInnerContent(data.list.map((x) => card(x, catalog.get(x.game), data.at)).join(""), { html: true }); } })
    .on("[data-champ-count]", { element(e) { e.setInnerContent(`${data.list.length} crown${data.list.length === 1 ? "" : "s"} held right now`); } });
  if (data.most.length) {
    rw.on("#champ-most", { element(e) { e.removeAttribute("hidden"); } })
      .on("#champ-most-list", { element(e) {
        e.setInnerContent(data.most.map((c) => `<li><span class="champ-crown" aria-hidden="true">♛</span> ${person(c.who)} <span class="num">${c.n} crowns</span></li>`).join(""), { html: true });
      } });
  }
  return new Response(rw.transform(page).body, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
}
