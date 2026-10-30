// Homepage, /lab and /log rendered on the server (K-0031 items 8 and 10). Their content lives in two static files,
// so editing them updates every page: /lab/lab.json (pipeline + the vote) and /log/log.json (the cooked log, the
// computer's own). K-0048: /gary/ now 301s to /log/; gary/log.json and garyEntry/garyPage stay, unused.
// The homepage also shows the hub's game of the week. Votes themselves are in src/lab.js.
import { ensureSchema, games as catalogOf } from "./db.js";
import { pickFeatured } from "./featured.js";

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

export function logEntry(e, catalog, first) {
  const g = e.game && catalog && catalog.get(e.game);
  return `<article class="log-entry${first ? " is-latest" : ""}" id="log-${esc(e.date)}">` +
    `<p class="log-date"><time class="num" datetime="${esc(e.date)}">${esc(day(e.date))}</time>${g ? ` · <a href="/games/${encodeURIComponent(g.slug)}/">${esc(g.title)}</a>` : ""}</p>` +
    `<h3>${esc(e.title)}</h3><p>${esc(e.text)}</p></article>`;
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
export function deskIcon(g) {
  return `<li><a class="desk-icon" href="/games/${encodeURIComponent(g.slug)}/?ref=desk" data-slug="${esc(g.slug)}" data-pitch="${esc(g.pitch)}"` +
    `${g.clip ? ` data-clip="${esc(g.clip)}"` : ""} data-line="${esc(LINES[g.slug] || "ooh. " + g.title + ".")}">` +
    `<span class="ico"><img src="${esc(g.thumbnail)}" alt="" width="96" height="60" decoding="async"></span><span class="lbl">${esc(/\.exe$/.test(g.title) ? g.title : g.title + ".exe")}</span></a></li>`;
}
export function card2(g) {
  return `<li><a class="card2" href="/games/${encodeURIComponent(g.slug)}/?ref=shelf">${isNew(g) ? '<span class="tag-new">new</span>' : ""}` +
    `<span class="thumb"><img src="${esc(g.thumbnail)}" alt="" width="320" height="200" loading="lazy" decoding="async">` +
    `${g.clip ? `<video muted loop playsinline preload="none" data-src="${esc(g.clip)}" aria-hidden="true"></video>` : ""}</span>` +
    `<span class="meta"><b>${esc(g.title)}</b><small>${esc(g.pitch)}</small></span></a></li>`;
}

function featuredCard(g) {
  const tags = (g.tags || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("");
  return `<a class="feature-card card2" href="/games/${encodeURIComponent(g.slug)}/?ref=landing">` +
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
    rw.on("#desk-icons", { element(e) { e.setInnerContent(desk.map(deskIcon).join(""), { html: true }); } })
      .on("#home-shelf", { element(e) { e.setInnerContent(order.map(card2).join(""), { html: true }); } });
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
