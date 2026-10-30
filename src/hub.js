// The games hub (/games/) rendered on the server: the static page only carries one placeholder card and CRASH
// in the spotlight, so crawlers, link previews and no-JS visitors saw a stale page. Here every Computer Cooked
// game goes into the grid as real HTML from games.json, and the spotlight / hero button / ticker show the same
// game of the week that games/hub.js and assets/fx.js pick on the client. The client still re-renders on top
// (stats, hearts, "new" badges), so this only has to match its markup.
import { ensureSchema, games as catalogOf } from "./db.js";
import { pickFeatured } from "./featured.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function hubCard(g, i) {
  const tags = (g.tags || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("");
  const isNew = g.added && Date.now() - Date.parse(g.added) < 14 * 86400000;
  // K-0031: the whole card is the link; no per-card button
  return `<li class="game-card"><a class="game-card-inner game-link" href="/games/${encodeURIComponent(g.slug)}/">` +
    `<img class="game-thumb" src="${esc(g.thumbnail)}" alt="" width="640" height="400" loading="${i < 4 ? "eager" : "lazy"}" decoding="async">` +
    `<span class="game-body">` + (isNew ? `<span class="game-new">new</span>` : "") +
    `<h3 class="game-name">${esc(g.title)}</h3><span class="game-pitch">${esc(g.pitch)}</span>` +
    (tags ? `<span class="game-tags">${tags}</span>` : "") +
    `</span></a></li>`;
}

export async function hubPage(req, env, url) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  let ours = [], feat = null;
  try {
    const catalog = await catalogOf(env, url.origin);
    // same order as games/hub.js: featured_rank first, then file order (sort is stable)
    ours = [...catalog.values()].filter((g) => g.made_by === "computer-cooked")
      .sort((a, b) => (a.featured_rank || 1e9) - (b.featured_rank || 1e9));
    try {
      if (env.DB) { await ensureSchema(env); const f = await pickFeatured(env, catalog); feat = f && catalog.get(f.game); }
    } catch (e) { /* no database: fall back below */ }
    if (!feat) feat = catalog.get("crash") || ours[0] || null;
  } catch (e) { return page; }
  if (!ours.length) return page;

  const txt = (v) => ({ element(e) { e.setInnerContent(v); } });
  const fresh = ours.map((g, i) => [g, i]).filter(([g]) => g.added && Date.now() - Date.parse(g.added) < 14 * 86400000)
    .sort((a, b) => b[0].added.localeCompare(a[0].added) || a[1] - b[1]).map(([g]) => g).slice(0, 6);
  // structured data: the hub as an ItemList of VideoGames (rich results), "<" escaped so a title can't close the script
  const ld = JSON.stringify({
    "@context": "https://schema.org", "@type": "ItemList", name: "Computer Cooked Games",
    itemListElement: ours.map((g, i) => ({
      "@type": "ListItem", position: i + 1, url: `${url.origin}/games/${g.slug}/`,
      item: { "@type": "VideoGame", name: g.title, description: g.pitch, url: `${url.origin}/games/${g.slug}/`, image: url.origin + g.thumbnail,
        genre: (g.tags || []).slice(0, 3), gamePlatform: "Web browser", applicationCategory: "Game", offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
    })),
  }).replace(/</g, String.fromCharCode(92) + "u003c"); // "<" as its JSON escape
  const rw = new HTMLRewriter()
    .on("head", { element(e) { e.append(`<script type="application/ld+json">${ld}</script>`, { html: true }); } })
    .on("title", txt("free online games, no download — Computer Cooked Games"))
    .on("#shelf-computer-cooked", { element(e) { e.setInnerContent(ours.map(hubCard).join(""), { html: true }); } })
    // "just cooked" (K-0050 item 5) on the server too, picked as games/hub.js picks it: it used to appear only after
    // games.json loaded and pushed the whole page down (CLS 0.57)
    .on("#shelf-new", { element(e) { if (fresh.length) e.removeAttribute("hidden"); } })
    .on("#shelf-new #new-heading", { element(e) { if (fresh.length) e.setInnerContent(`just cooked <small>new this fortnight</small>`, { html: true }); } })
    .on("#shelf-new .card-grid", { element(e) { if (fresh.length) e.setInnerContent(fresh.map(hubCard).join(""), { html: true }); } })
    .on("#ours-heading [data-count]", txt(String(ours.length)))
    .on(".ticker-track", { element(e) { const t = ours.map((g) => `<span>${esc(g.title)}</span>`).join(""); e.setInnerContent(t + t, { html: true }); } });
  if (feat) {
    const href = `/games/${encodeURIComponent(feat.slug)}/`;
    rw.on("a.spotlight", { element(e) { e.setAttribute("href", href); e.setAttribute("aria-label", `featured game: ${feat.title}. ${feat.pitch}`); } })
      .on(".spot-screen img", { element(e) { e.setAttribute("src", feat.thumbnail); } })
      .on(".spot-name", txt(feat.title))
      .on(".spot-pitch", txt(feat.pitch))
      .on("a.hero-play", { element(e) { e.setAttribute("href", href); e.setInnerContent(`play ${feat.title}`); } });
  }
  return rw.transform(page);
}
