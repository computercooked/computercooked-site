// Homepage, /lab and /log rendered on the server (K-0031 items 8 and 10). Their content lives in two static files,
// so editing them updates every page: /lab/lab.json (pipeline + the vote) and /log/log.json (the cooked log, the
// computer's own). K-0048: /gary/ now 301s to /log/; gary/log.json and garyEntry/garyPage stay, unused.
// The homepage also shows the hub's game of the week. Votes themselves are in src/lab.js.
import { ensureSchema, games as catalogOf } from "./db.js";
import { themeAttr, now, dayOf, REAL } from "./util.js";
import { pickFeatured } from "./featured.js";
import { challengeFor, weekEnd } from "./social.js";
import { vibesOf } from "./seo.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const STAGE = { building: "building", next: "up next", shipped: "shipped" };
const day = (d) => new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toLowerCase();

async function jsonAsset(env, origin, path) {
  try { const r = await env.ASSETS.fetch(new Request(origin + path)); return r.ok ? await r.json() : null; } catch (e) { return null; }
}

export function labItem(p) {
  const inner = `<span class="stage stage-${esc(p.stage)}">${esc(STAGE[p.stage] || p.stage)}</span><b>${esc(p.title)}</b><span>${esc(p.note)}</span>`;
  return `<li class="lab-item">${p.slug ? `<a href="/games/${encodeURIComponent(p.slug)}/">${inner}</a>` : `<div>${inner}</div>`}</li>`;
}

// the cooked log as a timeline: each entry in its game's own colour (themeAttr), with the game's cover
export function logEntry(e, catalog, first) {
  const g = e.game && catalog && catalog.get(e.game);
  const href = g ? `/games/${encodeURIComponent(g.slug)}/` : "";
  return `<article class="log-entry${first ? " is-latest" : ""}${g && g.thumbnail ? "" : " no-thumb"}"${g ? themeAttr(g) : ""} id="log-${esc(e.date)}">` +
    (g && g.thumbnail ? `<a class="log-thumb" href="${href}" tabindex="-1" aria-hidden="true"><img src="${esc(g.thumbnail)}" alt="" width="160" height="100"${first ? "" : ' loading="lazy"'} decoding="async"></a>` : "") +
    `<div class="log-body"><p class="log-date"><time class="num" datetime="${esc(e.date)}">${esc(day(e.date))}</time>${first ? '<span class="log-new">newest</span>' : ""}${g ? ` · <a href="${href}">${esc(g.title)}</a>` : ""}</p>` +
    `<h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></div></article>`;
}

export function garyEntry(e, catalog, first) {
  const g = e.game && catalog && catalog.get(e.game);
  return `<article class="gary-entry${first ? " is-latest" : ""}" id="log-${esc(e.date)}">` +
    `<p class="gary-date"><time class="num" datetime="${esc(e.date)}">${esc(day(e.date))}</time>${g ? ` · <a href="/games/${encodeURIComponent(g.slug)}/">${esc(g.title)}</a>` : ""}</p>` +
    `<h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></article>`;
}

// K-0044 redesign: the desktop's icons, the shelf's cards (clip on hover) and what the computer says about each game
const LINES = {
  crash: "that's me. i'm crash. it's a documentary.", "level-devil-exe": "the floor lies. so do i.", "one-percent-popup": "only 1% close it. you won't.",
  "keyboard-escape": "every key makes it faster. don't.", "tab-hoarder": "this is literally my life.", "desktop-jam": "please clean my desktop.",
  fathom: "a submarine. i get seasick.", bellchain: "it plays actual music. i hum along.", "pixel-purge": "my pictures got corrupted. help.",
  "crash-cheats": "i cheat at tic tac toe. sue me.", "overdue-notice": "smash the bills. i can't pay them either.", "plus-one-ram": "+1 mb a second. i'm gaining.",
  "smol-brains": "tiny creatures. tinier brains.", "reel-weird": "the pond keeps the rod.", "haunted-self-checkout": "unexpected item in bagging area.", "goose-court": "the goose has a lawyer.", "elevator-full-of-fish": "please fling responsibly.", "sandwich-tower": "the fridge gave me a sock.", "microwave-panic": "never microwave the fork.", "cooked-sweeper": "minesweeper has a virus. so do i.", "handbag-havoc": "granny is faster than you.", "crash-test-daily": "a new puzzle every day.",
};
const isNew = (g) => g.added && Date.now() - Date.parse(g.added) < 7 * 86400000;
export const newest = (list, n = 6) => list.filter((g) => g.added && Date.now() - Date.parse(g.added) < 14 * 86400000)
  .map((g, i) => [g, i]).sort((a, b) => b[0].added.localeCompare(a[0].added) || a[1] - b[1]).map((x) => x[0]).slice(0, n);
export function deskIcon(g) {
  return `<li><a class="desk-icon"${themeAttr(g)} href="/games/${encodeURIComponent(g.slug)}/?ref=desk" data-slug="${esc(g.slug)}" data-pitch="${esc(g.pitch)}"` +
    `${g.clip ? ` data-clip="${esc(g.clip)}"` : ""} data-line="${esc(LINES[g.slug] || "ooh. " + g.title + ".")}">` +
    `<span class="ico"><img src="${esc(g.thumbnail)}" alt="" width="96" height="60" decoding="async"></span><span class="lbl">${esc(/\.exe$/.test(g.title) ? g.title : g.title + ".exe")}</span></a></li>`;
}
export function card2(g, ref = "shelf") {
  // data-slug / data-added: the "your desk" row (assets/home.js, K-0064) builds its cards from these
  return `<li><a class="card2"${themeAttr(g)} href="/games/${encodeURIComponent(g.slug)}/?ref=${ref}" data-slug="${esc(g.slug)}"${g.added ? ` data-added="${esc(g.added)}"` : ""}>${isNew(g) ? '<span class="tag-new">new</span>' : ""}` +
    `<span class="thumb"><img src="${esc(g.thumbnail)}" alt="" width="320" height="200" loading="lazy" decoding="async">` +
    `${g.clip ? `<video muted loop playsinline preload="none" data-src="${esc(g.clip)}" aria-hidden="true"></video>` : ""}</span>` +
    `<span class="meta"><b>${esc(g.title)}</b><small>${esc(g.pitch)}</small></span></a></li>`;
}

// "happening now" on the homepage: this week's challenge and the week's chart. The chart ranks our games by unique
// players over the last 7 days (plays break ties) and shows how each moved against the 7 days before; it stays hidden
// until three games have players, and it never prints the counts. Both are cached for five minutes per isolate.
const PLAYER = "COALESCE('u' || user_id, 'a' || anon_id)";
let nowCache = { at: 0, v: null };
export async function homeNow(env, catalog, t = now()) {
  if (nowCache.v && t - nowCache.at < 300000 && t >= nowCache.at) return nowCache.v;
  const v = { ch: null, top: [] };
  const c = await challengeFor(env, t, catalog);
  if (c && catalog.has(c.game)) {
    const n = await env.DB.prepare("SELECT COUNT(*) n FROM xp_events WHERE kind = 'challenge' AND ref = ?").bind(c.week).first("n");
    v.ch = { game: c.game, goal: c.goal, xp: c.xp, finishers: n || 0, ends: new Date(weekEnd(t)).toISOString() };
  }
  const wk = dayOf(t - 7 * 86400000), prev = dayOf(t - 14 * 86400000);
  const { results } = await env.DB.prepare(
    `SELECT game, SUM(day >= ?) plays,
       COUNT(DISTINCT CASE WHEN day >= ? THEN ${PLAYER} END) players,
       COUNT(DISTINCT CASE WHEN day < ? THEN ${PLAYER} END) before
     FROM plays WHERE ${REAL} AND day >= ? GROUP BY game`
  ).bind(wk, wk, wk, prev).all();
  v.top = chart((results || []).filter((r) => catalog.get(r.game)?.made_by === "computer-cooked"));
  nowCache = { at: t, v };
  return v;
}
// rows {game, plays, players, before} -> the top five [{game, move}], move: places climbed (+), dropped (-), 0, "new", or null when there is no week before to compare with
export function chart(rows, n = 5) {
  const cur = rows.filter((r) => r.players > 0).sort((a, b) => b.players - a.players || b.plays - a.plays || a.game.localeCompare(b.game));
  if (cur.length < 3) return [];
  const old = rows.filter((r) => r.before > 0).sort((a, b) => b.before - a.before || a.game.localeCompare(b.game)).map((r) => r.game);
  return cur.slice(0, n).map((r, i) => { const was = old.indexOf(r.game); return { game: r.game, move: !old.length ? null : was < 0 ? "new" : was - i }; });
}
const nf = (n) => Number(n).toLocaleString("en-US");
function challengeCard(c, g) {
  return `<img class="now-thumb" src="${esc(g.thumbnail)}" alt="" width="96" height="60" loading="lazy" decoding="async">` +
    `<span class="now-tag">weekly challenge <b>+${nf(c.xp)} xp</b></span>` +
    `<strong class="now-title">${esc(g.title)}: ${esc(c.goal)}</strong>` +
    `<span class="now-meta">${c.finishers ? `${nf(c.finishers)} ${c.finishers === 1 ? "player has" : "players have"} done it.` : "nobody has done it yet. be first."}</span>` +
    `<span class="now-count">ends in <b class="num" data-until="${esc(c.ends)}">this week</b></span>`;
}
function chartRow(r, g, i) {
  const m = r.move, mv = m == null ? "" : m === "new" ? '<span class="mv mv-new">new</span>'
    : m > 0 ? `<span class="mv mv-up"><span aria-hidden="true">▲</span><span class="visually-hidden">up </span>${m}</span>`
    : m < 0 ? `<span class="mv mv-down"><span aria-hidden="true">▼</span><span class="visually-hidden">down </span>${-m}</span>`
    : '<span class="mv" aria-hidden="true">–</span>';
  return `<li><a${themeAttr(g)} href="/games/${encodeURIComponent(g.slug)}/?ref=now"><span class="rank num">${i + 1}</span>` +
    `<img src="${esc(g.thumbnail)}" alt="" width="48" height="30" loading="lazy" decoding="async"><span class="nm">${esc(g.title)}</span>${mv}</a></li>`;
}

function featuredCard(g) {
  const tags = (g.tags || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("");
  return `<a class="feature-card card2"${themeAttr(g)} href="/games/${encodeURIComponent(g.slug)}/?ref=landing">` +
    `<span class="thumb"><img class="game-thumb" src="${esc(g.thumbnail)}" alt="" width="640" height="400" decoding="async">` +
    `${g.clip ? `<video muted loop playsinline preload="none" data-src="${esc(g.clip)}" aria-hidden="true"></video>` : ""}</span>` +
    `<span class="feature-body"><span class="eyebrow">game of the week</span><h3 class="game-name">${esc(g.title)}</h3>` +
    `<span class="feature-pitch">${esc(g.pitch)}</span>${tags ? `<span class="game-tags">${tags}</span>` : ""}</span></a>`;
}

export async function homePage(req, env, url) {
  const page = await env.ASSETS.fetch(new Request(url.origin + "/", req));
  if (!page.ok) return page;
  let catalog = new Map(), feat = null;
  try {
    catalog = await catalogOf(env, url.origin);
    try { if (env.DB) { await ensureSchema(env); const f = await pickFeatured(env, catalog); feat = f && catalog.get(f.game); } } catch (e) { /* no database */ }
    if (!feat) feat = catalog.get("crash") || null;
  } catch (e) { /* static page as it is */ }
  const lab = await jsonAsset(env, url.origin, "/lab/lab.json");
  const ours = [...catalog.values()].filter((g) => g.made_by === "computer-cooked").length;
  const rw = new HTMLRewriter();
  if (feat) {
    rw.on("#home-featured", { element(e) { e.setInnerContent(featuredCard(feat), { html: true }); } })
      .on("a#home-play", { element(e) { e.setAttribute("href", `/games/${encodeURIComponent(feat.slug)}/?ref=landing`); e.setInnerContent(`play ${feat.title} ▶`); } });
  }
  if (ours) rw.on("[data-games-count]", { element(e) { e.setInnerContent(`all ${ours} games`); } });
  if (lab && lab.pipeline) rw.on("#home-lab", { element(e) { e.setInnerContent(lab.pipeline.slice(0, 4).map(labItem).join(""), { html: true }); } });
  const mine = [...catalog.values()].filter((g) => g.made_by === "computer-cooked");
  if (mine.length) {
    // newest first, then the catalog's order; the desktop gets eight, the shelf gets everything
    const order = mine.slice().sort((a, b) => (isNew(b) ? 1 : 0) - (isNew(a) ? 1 : 0));
    const desk = (feat ? [feat] : []).concat(order.filter((g) => !feat || g.slug !== feat.slug)).slice(0, 8);
    // K-0050 item 5: the "just cooked" shelf, the newest launches (two weeks at most), newest first
    const fresh = newest(mine);
    // K-0062: a game on "just cooked" isn't repeated on the shelf right under it (it read as a duplicate link)
    const onNew = new Set(fresh.map((g) => g.slug));
    const rest = order.filter((g) => !onNew.has(g.slug));
    rw.on("#desk-icons", { element(e) { e.setInnerContent(desk.map(deskIcon).join(""), { html: true }); } })
      .on("#home-shelf", { element(e) { e.setInnerContent((rest.length ? rest : order).map((g) => card2(g)).join(""), { html: true }); } });
    // pick a mood: each tile gets three covers and its count (the cover strip's height is reserved, so nothing moves)
    let mood = [];
    const shown = new Set(); // a cover appears on one tile only while there are others to show
    rw.on("a.mood", { element(e) {
      const v = e.getAttribute("data-mood");
      mood = order.filter((g) => vibesOf(g).includes(v));
      if (!mood.length) e.setAttribute("hidden", "");
    } })
      .on("a.mood .mood-art", { element(e) {
        const pick = mood.filter((g) => !shown.has(g.slug)).concat(mood.filter((g) => shown.has(g.slug))).slice(0, 3);
        pick.forEach((g) => shown.add(g.slug));
        e.setInnerContent(pick.map((g) => `<img src="${esc(g.thumbnail)}" alt="" width="64" height="40" loading="lazy" decoding="async">`).join(""), { html: true });
      } })
      .on("a.mood .mood-n", { element(e) { if (mood.length) e.setInnerContent(`${mood.length} game${mood.length === 1 ? "" : "s"} ▶`); } });
    if (fresh.length) {
      rw.on("#home-new-sec", { element(e) { e.removeAttribute("hidden"); } })
        .on("#home-new", { element(e) { e.setInnerContent(fresh.map((g) => card2(g, "new")).join(""), { html: true }); } });
    }
  }
  // "happening now": the weekly challenge and the week's chart (each card stays hidden when there's nothing to show)
  let live = null;
  try { if (env.DB && catalog.size) live = await homeNow(env, catalog); } catch (e) { /* no database: the dailies card alone */ }
  if (live && live.ch) {
    const g = catalog.get(live.ch.game);
    rw.on("a#home-ch", { element(e) {
      e.removeAttribute("hidden"); e.setAttribute("href", `/games/${encodeURIComponent(g.slug)}/?ref=now`);
      e.setInnerContent(challengeCard(live.ch, g), { html: true });
    } });
  }
  if (live && live.top.length) {
    rw.on("#home-top", { element(e) { e.removeAttribute("hidden"); } })
      .on("#home-chart", { element(e) { e.setInnerContent(live.top.map((r, i) => chartRow(r, catalog.get(r.game), i)).join(""), { html: true }); } });
  }
  const out = rw.transform(page);
  return new Response(out.body, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" } });
}

export async function logPage(req, env, url) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  const [log, catalog] = await Promise.all([jsonAsset(env, url.origin, "/log/log.json"), catalogOf(env, url.origin).catch(() => new Map())]);
  if (!log || !log.entries) return page;
  return new HTMLRewriter()
    .on("#cooked-log", { element(e) { e.setInnerContent(log.entries.map((x, i) => logEntry(x, catalog, i === 0)).join(""), { html: true }); } })
    .transform(page);
}

export async function garyPage(req, env, url) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  const [log, catalog] = await Promise.all([jsonAsset(env, url.origin, "/gary/log.json"), catalogOf(env, url.origin).catch(() => new Map())]);
  if (!log || !log.entries) return page;
  return new HTMLRewriter()
    .on("#gary-log", { element(e) { e.setInnerContent(log.entries.map((x, i) => garyEntry(x, catalog, i === 0)).join(""), { html: true }); } })
    .transform(page);
}

export async function labPage(req, env, url) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  const lab = await jsonAsset(env, url.origin, "/lab/lab.json");
  if (!lab) return page;
  const opts = (lab.poll && lab.poll.options) || [];
  return new HTMLRewriter()
    .on("#lab-pipeline", { element(e) { e.setInnerContent((lab.pipeline || []).map(labItem).join(""), { html: true }); } })
    .on("#poll-q", { element(e) { if (lab.poll) e.setInnerContent(lab.poll.question); } })
    .on("#poll", { element(e) {
      if (!lab.poll) return;
      e.setAttribute("data-poll", lab.poll.id);
      e.setInnerContent(opts.map((o) =>
        `<li><button type="button" class="poll-opt" data-option="${esc(o.id)}" aria-pressed="false">` +
        `<span class="poll-text"><b>${esc(o.title)}</b><span>${esc(o.pitch)}</span></span>` +
        `<span class="poll-bar" aria-hidden="true"><span></span></span><span class="poll-n num" aria-hidden="true"></span></button></li>`).join(""), { html: true });
    } })
    .transform(page);
}
