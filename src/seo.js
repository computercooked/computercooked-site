// Game pages (/games/<slug>/) pass through here so search engines get more than an iframe:
// JSON-LD (VideoGame + breadcrumbs), a "how to play" card built from games.json, and a server-rendered
// "games like X" row of internal links. Dare links (?vs=/&d=) also get their preview tags here.
// Everything comes from games.json, so a game added with add-game.ps1 gets it with no extra step.
import { dareTags } from "./dares.js";
import { embeddable, embedCard } from "./embed.js";

const SITE = "https://computercooked.com";
// keep in step with VIBES / FALLBACK in assets/fx.js (the hub filter chips)
const VIBES = {
  arcade: ["arcade", "dodge", "runner", "obby", "platformer", "reflex", "action", "shooter"],
  puzzle: ["puzzle", "arrow puzzle", "tic tac toe", "strategy", "logic", "word"],
  chill: ["casual", "idle", "clicker", "cozy", "chill", "relaxing"],
  quick: ["short", "60s runs", "challenge", "one-thumb", "quick"],
  rage: ["rage", "trick", "hard", "funny"],
};
const FALLBACK = { "tab-hoarder": ["arcade", "quick"], bellchain: ["chill"], "handbag-havoc": ["arcade"], fathom: ["puzzle"], "smol-brains": ["chill"] };
const VAGUE = new Set(["1 player", "halloween", "casual", "mobile", "funny"]); // shared by too many games to mean "similar"

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tagsOf = (g) => (g.tags || []).map((t) => String(t).toLowerCase());
const vibesOf = (g) => {
  const tags = tagsOf(g);
  const v = Object.keys(VIBES).filter((k) => VIBES[k].some((t) => tags.includes(t)));
  return v.length ? v : FALLBACK[g.slug] || [];
};

// the 3 games most like this one: shared vibes count double, specific shared tags once, newer wins ties
export function related(games, slug, n = 3) {
  const me = games.find((g) => g.slug === slug);
  if (!me) return [];
  const mv = vibesOf(me), mt = tagsOf(me).filter((t) => !VAGUE.has(t));
  return games
    .map((g, i) => ({ g, i, s: 2 * vibesOf(g).filter((v) => mv.includes(v)).length + tagsOf(g).filter((t) => mt.includes(t)).length }))
    .filter((x) => x.g.slug !== slug && x.g.made_by !== "community")
    .sort((a, b) => b.s - a.s || b.i - a.i)
    .slice(0, n)
    .map((x) => x.g);
}

function jsonLd(g) {
  const url = `${SITE}/games/${g.slug}/`;
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "VideoGame",
        name: g.title,
        url,
        description: g.pitch,
        image: `${url}og.png`,
        thumbnailUrl: g.thumbnail && g.thumbnail.startsWith("/") ? SITE + g.thumbnail : undefined,
        genre: (g.tags || []).filter((t) => t !== "halloween"),
        gamePlatform: ["Web browser", "Mobile web browser"],
        operatingSystem: "Any (plays in the browser)",
        applicationCategory: "Game",
        playMode: "SinglePlayer",
        isAccessibleForFree: true,
        inLanguage: "en",
        datePublished: g.added || undefined,
        softwareVersion: g.version ? String(g.version) : undefined,
        fileSize: g.size_kb ? `${g.size_kb} KB` : undefined,
        author: { "@type": "Organization", name: "Computer Cooked", url: SITE + "/" },
        publisher: { "@type": "Organization", name: "Computer Cooked", url: SITE + "/" },
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Computer Cooked", item: SITE + "/" },
          { "@type": "ListItem", position: 2, name: "games", item: `${SITE}/games/` },
          { "@type": "ListItem", position: 3, name: g.title, item: url },
        ],
      },
    ],
  };
  // "<" can't appear raw inside a script tag
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
}

function howTo(g) {
  const steps = String(g.controls || "").split(/\.\s+/).map((s) => s.replace(/\.$/, "").trim()).filter(Boolean);
  const tips = (g.how_to || []).filter(Boolean);
  const facts = ["free", "no download", g.size_kb && `${g.size_kb} KB`, "phone, tablet or computer"];
  if (tagsOf(g).includes("daily")) facts.push("a new daily round at midnight, the same for everyone");
  return `<h2>// how to play ${esc(g.title)}</h2>
          <p>${esc(g.pitch)}</p>
          ${steps.length ? `<ul class="how-steps">${steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
          ${tips.length ? `<p><b>tips:</b></p><ul class="how-steps">${tips.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : ""}
          <p class="how-facts">${facts.filter(Boolean).map(esc).join(" · ")}</p>`;
}

function card(g) {
  return `<li class="game-card"><div class="game-card-inner"><img class="game-thumb" src="${esc(g.thumbnail)}" alt="" width="640" height="360" loading="lazy" decoding="async"><div class="game-body"><h3 class="game-name">${esc(g.title)}</h3><p class="game-pitch">${esc(g.pitch)}</p><a class="play-btn" href="/games/${encodeURIComponent(g.slug)}/" aria-label="play ${esc(g.title)}">play ▶</a></div></div></li>`;
}

const PWA = `<link rel="manifest" href="/manifest.webmanifest"><script src="/assets/pwa.js" defer></script>`;

export async function gamePage(req, env, url, slug) {
  const page = await env.ASSETS.fetch(req);
  if (!page.ok || !(page.headers.get("content-type") || "").includes("text/html")) return page;
  let games = [];
  try {
    games = (await (await env.ASSETS.fetch(new Request(url.origin + "/games/games.json"))).json()).games || [];
  } catch (e) { /* serve the page as it is */ }
  const g = games.find((x) => x.slug === slug);
  if (!g) return page;

  const rw = new HTMLRewriter()
    // installable web app: every game page links the manifest and registers the offline service worker (assets/pwa.js)
    .on("head", { element(e) { e.append(jsonLd(g) + PWA, { html: true }); } })
    .on("[data-how-to]", { element(e) { e.setInnerContent(howTo(g), { html: true }); if (embeddable(g)) e.after(embedCard(g), { html: true }); } })
    .on("[data-more-games]", { element(e) { e.removeAttribute("hidden"); } })
    .on("#more-heading", { element(e) { e.setInnerContent(`games like ${esc(g.title)} <a class="shelf-link" href="/games/">all games ▶</a>`, { html: true }); } })
    .on("[data-more-games] ul", { element(e) { e.setInnerContent(related(games, slug).map(card).join(""), { html: true }); } });

  let cache = page.headers.get("cache-control");
  const dare = (url.searchParams.has("vs") || url.searchParams.has("d")) && (await dareTags(env, url, slug));
  if (dare) {
    const title = `can you beat ${dare.score} on ${g.title}?${dare.from ? ` from ${dare.from}` : ""}`;
    const set = (v) => ({ element(e) { e.setAttribute("content", v); } });
    rw.on("title", { element(e) { e.setInnerContent(title + " — Computer Cooked Games"); } })
      .on('meta[property="og:title"], meta[name="twitter:title"]', set(title))
      .on('meta[property="og:description"], meta[name="twitter:description"]', set("a friend dared you. free browser game: no download, plays on your phone."))
      .on('meta[property="og:image"], meta[name="twitter:image"]', set(`${url.origin}/games/${slug}/og-vs.png`));
    cache = "public, max-age=300";
  }
  const headers = new Headers(page.headers);
  headers.delete("content-length");
  headers.delete("etag"); // the body changes, so the asset's etag no longer describes it
  if (cache) headers.set("cache-control", cache);
  return rw.transform(new Response(page.body, { status: page.status, headers }));
}
