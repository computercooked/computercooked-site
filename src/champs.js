// /champs/: the wall of epic gamers. One crown per game: whoever holds the all-time #1 (the same rule as the EPIC GAMER
// tag on each game's leaderboard: highest score, a tie goes to whoever set it first), plus this week's leader.
// Rendered on the server from the live boards and kept for 5 minutes per isolate. No play counts are shown.
// Every game gets a plaque: held crowns first (newest crown on top), then the free ones ("nobody. this crown is free.").
// Gary's commentator lines are written here from the same data, so the page reads fine without JavaScript.
// assets/champs.js then puts the dates in the visitor's time zone, keeps "held 3 days" current, adds "your best" from
// this device's history, sorts the wall, cycles Gary's lines and powers plaques on as they scroll in.
// ?champsdemo=1 renders made-up demo data (names start with "demo"): nothing is read from or written to the database.
import { FRESH } from "./boards.js";
import { ensureSchema, games as catalogOf } from "./db.js";
import { now, weekOf, themeAttr } from "./util.js";
import { people } from "./friends.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
const dateOf = (ms) => { const d = new Date(ms); return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`; };
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const DAY = 86400000, HOUR = 3600000;
const TOP = (where) => `SELECT game, player, user_id, name, score, ts FROM (SELECT game, player, user_id, name, score, ts,
  ROW_NUMBER() OVER (PARTITION BY game ORDER BY score DESC, ts ASC) rn FROM scores WHERE ${FRESH} AND hidden = 0${where}) WHERE rn = 1`;
const ours = (g) => g && g.made_by === "computer-cooked";
// the games nobody holds yet, newest game first
const freeOf = (catalog, held) => [...catalog.values()].filter((g) => ours(g) && !held.has(g.slug))
  .sort((a, b) => String(b.added || "").localeCompare(String(a.added || ""))).map((g) => g.slug);

let cache = { at: 0, v: null };
export async function champsData(env, catalog) {
  const t = now();
  if (cache.v && t - cache.at < 300000 && t >= cache.at) return cache.v;
  await ensureSchema(env);
  const [all, week] = await Promise.all([
    env.DB.prepare(TOP("")).all(),
    env.DB.prepare(TOP(" AND week = ?")).bind(weekOf(t)).all(),
  ]);
  const rows = all.results.filter((r) => ours(catalog.get(r.game)));
  const wk = new Map(week.results.map((r) => [r.game, r]));
  const who = await people(env, rows.map((r) => r.user_id).concat(week.results.map((r) => r.user_id)).filter(Boolean));
  const face = (r) => { const p = r.user_id && who.get(r.user_id); return { key: r.player, name: p ? p.name : r.name, u: p ? p.username : null, score: r.score, ts: r.ts }; };
  // the newest crowns first: the wall changes at the top when someone takes one (the home page's "latest crowns" uses this order)
  const list = rows.map((r) => ({ game: r.game, champ: face(r), week: wk.has(r.game) ? face(wk.get(r.game)) : null })).sort((a, b) => b.champ.ts - a.champ.ts);
  const v = shape(list, catalog, t);
  cache = { at: t, v };
  return v;
}

// list -> the full data object: most crowns (players holding more than one), free games, distinct holders
function shape(list, catalog, t) {
  const tally = new Map();
  for (const x of list) { const c = tally.get(x.champ.key) || { who: x.champ, n: 0 }; c.n++; tally.set(x.champ.key, c); }
  const most = [...tally.values()].filter((c) => c.n > 1).sort((a, b) => b.n - a.n).slice(0, 5);
  const free = freeOf(catalog, new Set(list.map((x) => x.game)));
  return { list, most, free, holders: tally.size, at: t };
}

// ?champsdemo=1: a made-up wall so the page can be looked at without real scores. Deterministic, never stored.
const DEMO_NAMES = ["demo_goblin", "demo_beige_fan", "demo_tired_intern", "demo_keyboard_masher", "demo_gary_stan", "demo_nap_champion"];
function demoData(catalog, t) {
  const games = [...catalog.values()].filter(ours);
  const pick = [0, 0, 1, 0, 2, 3, 1, 0, 4, 5, 2]; // demo_goblin holds 4, two others hold 2
  const list = games.slice(0, Math.min(pick.length, Math.max(0, games.length - 3))).map((g, i) => {
    const name = DEMO_NAMES[pick[i]];
    const champ = { key: "demo-" + pick[i], name, u: null, score: 1200 + ((i * 7919) % 48000), ts: t - [0.2, 1.4, 3, 5, 6, 9, 12, 15, 21, 30, 44][i] * DAY };
    const wkName = DEMO_NAMES[(pick[i] + 1 + (i % 2)) % DEMO_NAMES.length];
    const week = i % 3 === 2 ? null : i % 3 === 0 ? { ...champ } : { key: "demo-w" + i, name: wkName, u: null, score: Math.round(champ.score * 0.7), ts: t - DAY };
    return { game: g.slug, champ, week };
  }).sort((a, b) => b.champ.ts - a.champ.ts);
  return shape(list, catalog, t);
}

const person = (p) => p.u ? `<a class="champ-who" href="/u/${esc(p.u)}">${esc(p.name)}</a>` : `<span class="champ-who">${esc(p.name)}</span>`;

// "held 3 days" (assets/champs.js keeps it current from data-ts)
export function heldFor(ms) {
  if (!(ms >= 0)) return "";
  if (ms < HOUR) return "held for minutes";
  if (ms < DAY) { const h = Math.floor(ms / HOUR); return `held ${h} hour${h === 1 ? "" : "s"}`; }
  const d = Math.floor(ms / DAY); return `held ${d} day${d === 1 ? "" : "s"}`;
}
const agoOf = (ms) => ms < HOUR ? "minutes ago" : ms < DAY ? `${Math.floor(ms / HOUR)}h ago` : `${Math.floor(ms / DAY)}d ago`;

function plaque(x, g, t, i, longest) {
  const fresh = t - x.champ.ts < 2 * DAY;
  const href = `/games/${encodeURIComponent(g.slug)}/?ref=champs`;
  const same = x.week && x.week.key === x.champ.key;
  const week = !x.week ? "nobody yet. it's open."
    : same ? `${esc(x.champ.name)} again, <span class="num">${fmt(x.week.score)}</span>`
    : `${person(x.week)} <span class="num">${fmt(x.week.score)}</span>`;
  const badge = fresh ? '<span class="plaque-badge is-new">new crown</span>'
    : longest ? '<span class="plaque-badge is-long">longest reign</span>' : "";
  return `<li class="plaque${fresh ? " is-fresh" : ""}${longest ? " is-longest" : ""}" data-slug="${esc(g.slug)}" data-score="${Number(x.champ.score) || 0}" data-ts="${Number(x.champ.ts) || 0}" data-i="${i}"${themeAttr(g)}>` +
    art(g, href, i) +
    `<div class="plaque-body"><h2 class="plaque-game"><a href="${href}">${esc(g.title)}</a></h2>${badge}` +
    `<p class="plaque-holder"><span class="plaque-crown" aria-hidden="true">♛</span><span class="visually-hidden">crown holder: </span>${person(x.champ)} <span class="plaque-score num">${fmt(x.champ.score)}</span></p>` +
    `<p class="plaque-meta"><span class="plaque-held" data-held>${heldFor(t - x.champ.ts)}</span> · since <time datetime="${new Date(x.champ.ts).toISOString()}">${dateOf(x.champ.ts)}</time></p>` +
    `<p class="plaque-week">this week: ${week}</p>` +
    // filled by assets/champs.js from this device's own best (cc-history); stays hidden for a game you haven't played
    `<p class="champ-you" hidden></p></div>` +
    `<a class="plaque-cta" href="${href}" aria-label="take the crown on ${esc(g.title)}">take the crown <span aria-hidden="true">▶</span></a></li>`;
}

function freePlaque(g, i) {
  const href = `/games/${encodeURIComponent(g.slug)}/?ref=champs`;
  return `<li class="plaque is-free" data-slug="${esc(g.slug)}" data-i="${i}"${themeAttr(g)}>` + art(g, href, i) +
    `<div class="plaque-body"><h2 class="plaque-game"><a href="${href}">${esc(g.title)}</a></h2><span class="plaque-badge is-free">up for grabs</span>` +
    `<p class="plaque-holder"><span class="plaque-crown is-empty" aria-hidden="true">♛</span>nobody. this crown is free. go.</p>` +
    `<p class="plaque-meta">any score takes it.</p><p class="champ-you" hidden></p></div>` +
    `<a class="plaque-cta" href="${href}" aria-label="take the free crown on ${esc(g.title)}">take the crown <span aria-hidden="true">▶</span></a></li>`;
}

// the gameplay poster (games.json "poster", 320x180), the cover as a fallback; the first two load at once
const art = (g, href, i) => `<a class="plaque-art" href="${href}" tabindex="-1" aria-hidden="true">` +
  (g.poster ? `<img src="${esc(g.poster)}" alt="" width="320" height="180"` : `<img src="${esc(g.thumbnail)}" alt="" width="640" height="400"`) +
  ` loading="${i < 2 ? "eager" : "lazy"}" decoding="async"></a>`;

// Gary, commentating. Plain text lines (names are escaped when they are written into the page). Most crowns first.
export function garyLines(data, catalog, t) {
  const out = [];
  const title = (slug) => (catalog.get(slug) || {}).title || slug;
  const { list, most, free } = data;
  if (!list.length) {
    out.push("the wall is empty. the computer is lonely. any score takes a crown.");
    if (free.length) out.push(`${free.length} crowns, zero owners. this is the easiest it will ever be.`);
    return out;
  }
  if (most.length) {
    const top = most[0];
    out.push(top.n >= 4 ? `${top.who.name} owns ${top.n} crowns. the computer is concerned.`
      : `${top.who.name} holds ${top.n} crowns. greedy, but legal.`);
    if (most[1] && most[1].n === top.n) out.push(`${top.who.name} and ${most[1].who.name} are tied on ${top.n} crowns each. somebody break it.`);
  }
  const newest = list[0], age = t - newest.champ.ts;
  out.push(age < 2 * DAY ? `${newest.champ.name} took the ${title(newest.game)} crown ${agoOf(age)}. the paint is still wet.`
    : `nobody has taken a crown in ${Math.floor(age / DAY)} days. the wall is getting dusty.`);
  if (list.length > 1) {
    const old = list[list.length - 1], d = Math.floor((t - old.champ.ts) / DAY);
    if (d >= 3) out.push(`${old.champ.name} has held ${title(old.game)} for ${d} days. someone please do something.`);
  }
  if (free.length === 1) out.push(`one crown left unclaimed: ${title(free[0])}. any score takes it.`);
  else if (free.length > 1) out.push(`${free.length} crowns are just lying on the floor. any score takes one.`);
  const rival = list.find((x) => x.week && x.week.key !== x.champ.key);
  if (rival) out.push(`${rival.week.name} is leading ${title(rival.game)} this week. ${rival.champ.name} should be nervous.`);
  if (data.holders === list.length && list.length > 2) out.push(`${list.length} crowns, ${list.length} different people. suspiciously fair.`);
  out.push("i don't play. i just watch. it's worse.");
  return out;
}

function mostRow(c, i) {
  const pips = "♛".repeat(Math.min(c.n, 8));
  return `<li class="most-row${i === 0 ? " is-top" : ""}"><span class="most-rank num" aria-hidden="true">${i + 1}</span>${person(c.who)}` +
    `<span class="most-pips" aria-hidden="true">${pips}</span><span class="num most-n">${c.n} crowns</span></li>`;
}

export async function champsPage(req, env, url) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  const demo = url.searchParams.get("champsdemo") === "1";
  let data = null, catalog = new Map();
  try {
    catalog = await catalogOf(env, url.origin);
    if (demo && catalog.size) data = demoData(catalog, now());
    else if (env.DB && catalog.size) data = await champsData(env, catalog);
  } catch (e) { /* no database: the static page */ }
  if (!data || !(data.list.length || (data.free && data.free.length))) return page;
  const t = data.at;
  // longest reign: the oldest crown, once there are a few to compare and it has stood a day
  const oldest = data.list.length > 2 && t - data.list[data.list.length - 1].champ.ts >= DAY ? data.list[data.list.length - 1].game : null;
  const free = (data.free || []).filter((s) => catalog.has(s));
  const plaques = data.list.map((x, i) => plaque(x, catalog.get(x.game), t, i, x.game === oldest))
    .concat(free.map((s, j) => freePlaque(catalog.get(s), data.list.length + j))).join("");
  const lines = garyLines({ ...data, free }, catalog, t);
  const count = `${data.list.length} crown${data.list.length === 1 ? "" : "s"} held` + (free.length ? ` · ${free.length} up for grabs` : "") + (demo ? " · demo data, fake names" : "");
  const rw = new HTMLRewriter()
    .on("#champ-list", { element(e) { e.setInnerContent(plaques, { html: true }); } })
    .on("[data-champ-count]", { element(e) { e.setInnerContent(count); } })
    // every line, for assets/champs.js to cycle through (a hidden list, so names stay escaped text)
    .on("[data-says-lines]", { element(e) { e.setInnerContent(lines.map((l) => `<li>${esc(l)}</li>`).join(""), { html: true }); } })
    .on("[data-says-text]", { element(e) { e.setInnerContent(lines[0]); } });
  if (data.most.length) {
    rw.on("#champ-most", { element(e) { e.removeAttribute("hidden"); } })
      .on("#champ-most-list", { element(e) { e.setInnerContent(data.most.map(mostRow).join(""), { html: true }); } });
  }
  if (demo) rw.on("head", { element(e) { e.append('<meta name="robots" content="noindex">', { html: true }); } });
  return new Response(rw.transform(page).body, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": demo ? "no-store" : "public, max-age=0, must-revalidate" } });
}
