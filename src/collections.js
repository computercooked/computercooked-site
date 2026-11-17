// Mood collection pages: /games/arcade/, /games/puzzle/, /games/chill/, /games/quick/, /games/rage/.
// One server-rendered page per mood, so each one can rank on its own ("free arcade games online") instead of
// hiding behind the hub's ?vibe= filter (which still works: src/hub.js + assets/fx.js). The games in each come from
// games.json through vibesOf() in src/seo.js, the same VIBES/FALLBACK tag map the hub chips and home mood tiles use,
// so a game added with add-game.ps1 lands in the right collections with no extra step.
// The shell (head links, deck nav, footer) is copied from games/index.html: keep them in step if that page changes.
import { games as catalogOf } from "./db.js";
import { vibesOf, VIBE_NAMES, gamesItemList } from "./seo.js";
import { themeAttr } from "./util.js";

const SITE = "https://computercooked.com";
const OG_ALT = "Computer Cooked: a tired beige pixel computer melting lime goo, next to the words computer cooked. the computer is not handling it well.";

// label: the home mood tile's name. intro: sentences; a {slug} becomes a link to that game, and a sentence naming a
// game that isn't in this mood any more is left out, so the copy never points at the wrong game.
export const MOODS = {
  arcade: {
    label: "fast hands", search: "arcade games",
    title: "free arcade games online, no download — Computer Cooked",
    heading: "fast hands. dodge things. panic a little.",
    intro: [
      "games for your thumbs, not your brain.",
      "dodge falling tasks in {crash}, or bowl garden gnomes with a granny's purse in {handbag-havoc}.",
      "free, no download, fine on a phone.",
    ],
  },
  puzzle: {
    label: "big brain", search: "puzzle games",
    title: "free puzzle games online, no download — Computer Cooked",
    heading: "big brain. think hard. the computer won't.",
    intro: [
      "think first, click second.",
      "hunt a submarine that lies about its decoys in {fathom}, or sweep a minesweeper board that fights back in {cooked-sweeper}.",
      "{crash-test-daily} adds one new sliding puzzle every day, the same for everyone.",
      "free, no download, no account.",
    ],
  },
  chill: {
    label: "low power mode", search: "relaxing games",
    title: "free chill games online, no download — Computer Cooked",
    heading: "low power mode. nothing chases you here.",
    intro: [
      "low-key games for when your brain is at 4% battery.",
      "buy one cowbell, then 200 more, in {bellchain}, or go ice fishing under the aurora in {thin-ice}.",
      "low stakes, no download, works on your phone.",
    ],
  },
  quick: {
    label: "got 60 seconds?", search: "quick games",
    title: "free quick games online, 60 seconds or less — Computer Cooked",
    heading: "got 60 seconds? that's a whole game.",
    intro: [
      "short runs. most of these are over in about a minute.",
      "cook food and never the fork in {microwave-panic}, or judge a goose on trial in {goose-court}.",
      "good for a queue, a loading screen, or pretending to work.",
    ],
  },
  rage: {
    label: "feeling brave?", search: "rage games",
    title: "free rage games online, no download — Computer Cooked",
    heading: "feeling brave? unfair on purpose. you'll retry.",
    intro: [
      "games that are rigged, and know it.",
      "{level-devil-exe} is a platformer where the floor wants you dead, and in {crash-cheats} the computer deletes your x's when it's losing.",
      "you will blame the computer. the computer will deserve it.",
    ],
  },
};

export const isMood = (v) => Object.hasOwn(MOODS, v);

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ld = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
const clipOf = (g) => (typeof g.clip === "string" && /^\/assets\/clips\/[a-z0-9-]+\.mp4$/.test(g.clip) ? g.clip : "");

// the hub's card (src/hub.js hubCard), plus data-slug/data-clip so assets/preview.js plays the clip, and the game's colours
function card(g, i) {
  const tags = (g.tags || []).slice(0, 3).map((t) => `<span>${esc(t)}</span>`).join("");
  const clip = clipOf(g);
  return `<li class="game-card" data-slug="${esc(g.slug)}"${clip ? ` data-clip="${esc(clip)}"` : ""}>` +
    `<a class="game-card-inner game-link"${themeAttr(g)} href="/games/${encodeURIComponent(g.slug)}/">` +
    (g.poster ? `<img class="game-thumb is-poster" src="${esc(g.poster)}" alt="" width="320" height="180"` : `<img class="game-thumb" src="${esc(g.thumbnail)}" alt="" width="640" height="400"`) +
    ` loading="${i < 4 ? "eager" : "lazy"}" decoding="async">` +
    `<span class="game-body"><h3 class="game-name">${esc(g.title)}</h3><span class="game-pitch">${esc(g.pitch)}</span>` +
    (tags ? `<span class="game-tags">${tags}</span>` : "") +
    `</span></a></li>`;
}

function intro(m, list) {
  const by = new Map(list.map((g) => [g.slug, g]));
  return m.intro
    .filter((s) => [...s.matchAll(/\{([a-z0-9-]+)\}/g)].every((x) => by.has(x[1])))
    .map((s) => s.split(/\{([a-z0-9-]+)\}/).map((part, i) => (i % 2 ? `<a href="/games/${part}/">${esc(by.get(part).title)}</a>` : esc(part))).join(""))
    .join(" ");
}

// the games in a mood, in the hub's order (featured_rank first, then games.json order)
export function moodGames(catalog, vibe) {
  return [...catalog.values()].filter((g) => g.made_by === "computer-cooked" && vibesOf(g).includes(vibe))
    .sort((a, b) => (a.featured_rank || 1e9) - (b.featured_rank || 1e9));
}

export function collectionHtml(vibe, list) {
  const m = MOODS[vibe], name = VIBE_NAMES[vibe], url = `${SITE}/games/${vibe}/`;
  const names = list.slice(0, 4).map((g) => g.title).join(", ") + (list.length > 4 ? " and more" : "");
  const desc = `${list.length} free ${m.search} you can play in your browser: ${names}. no download, no account, works on your phone.`;
  const ogTitle = `${list.length} free ${name} — Computer Cooked`;
  const crumbs = ld({
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Computer Cooked", item: SITE + "/" },
      { "@type": "ListItem", position: 2, name: "games", item: `${SITE}/games/` },
      { "@type": "ListItem", position: 3, name, item: url },
    ],
  });
  const others = Object.keys(MOODS).filter((k) => k !== vibe)
    .map((k) => `<a class="vibe-link" href="/games/${k}/">${esc(MOODS[k].label)} <span class="mood-other-kind">${esc(VIBE_NAMES[k])}</span></a>`).join(" ");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(m.title)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${url}">
  <meta name="theme-color" content="#101114">
  <meta name="color-scheme" content="dark">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Computer Cooked">
  <meta property="og:title" content="${esc(ogTitle)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${SITE}/assets/og.png?v=4">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(OG_ALT)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@computercooked">
  <meta name="twitter:title" content="${esc(ogTitle)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${SITE}/assets/og.png?v=4">
  <meta name="twitter:image:alt" content="${esc(OG_ALT)}">

  <link rel="icon" href="/favicon.ico" sizes="48x48">
  <link rel="icon" href="/assets/favicon-32.png" type="image/png" sizes="32x32">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="preload" href="/assets/fonts/pixelify-sans-latin-wght.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/jetbrains-mono-latin-800-normal.woff2" as="font" type="font/woff2" crossorigin>
  <script>try{var t=localStorage.getItem('cc-tint');if(/^(amber|ice|pink)$/.test(t))document.documentElement.dataset.tint=t}catch(e){}</script>
  <link rel="stylesheet" href="/assets/tokens.css">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/assets/deck.css">
  <link rel="stylesheet" href="/games/games.css">
  <link rel="stylesheet" href="/assets/collections.css">
  ${gamesItemList(list, `free ${name} — Computer Cooked`)}
  ${crumbs}
</head>
<body>
  <main class="games-page mood-page mood-page-${vibe}">
    <nav class="mood-crumbs" aria-label="breadcrumb"><a href="/games/">games</a> <span aria-hidden="true">›</span> <span aria-current="page">${esc(name)}</span></nav>
    <header class="mood-hero">
      <p class="mood-eyebrow">free ${esc(name)} · no download</p>
      <h1 class="mood-title">${esc(m.heading)}</h1>
      <p class="games-sub">${intro(m, list)}</p>
    </header>

    <section class="shelf" aria-labelledby="mood-heading">
      <h2 class="shelf-head" id="mood-heading">${esc(name)} <small>${list.length}</small></h2>
      <ul class="card-grid" id="mood-grid">${list.map(card).join("")}</ul>
    </section>

    <section class="about-card mood-more" aria-labelledby="mood-more-heading">
      <h2 id="mood-more-heading">not in the mood?</h2>
      <p class="how-vibes">${others}</p>
      <p class="mood-all"><a class="ghost-btn" href="/games/">all games ▶</a></p>
    </section>
  </main>

  <footer class="footer">
    <p>© 2026 Computer Cooked · <span class="made-by">made by <a href="https://bushgrowth.com/projects">Bush Development &amp; Growth</a></span></p>
    <p><a href="mailto:hello@computercooked.com">hello@computercooked.com</a> · <a href="/about/">about</a> · <a href="/support/">support</a> · <a href="/merch/">merch</a> · <a href="/terms/">terms</a> · <a href="/privacy/">privacy</a></p>
  </footer>

  <script src="/assets/preview.js" defer></script>
  <script>document.addEventListener("DOMContentLoaded",function(){var g=document.getElementById("mood-grid");if(window.ccPreview&&g)ccPreview.attach(g,".game-card")});</script>
  <nav class="deck" aria-label="main">
    <div class="deck-inner">
      <a class="deck-brand" href="/" aria-label="computer cooked: home"><img src="/assets/logo.svg" alt="" width="28" height="28"><span>computer cooked</span></a>
      <a class="deck-link deck-home" href="/" data-key="h"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 11l9-7 9 7v9h-6v-6H9v6H3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span class="deck-label">home</span></a>
      <a class="deck-link" href="/games/" data-key="g"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 7h12a4 4 0 0 1 4 4v2a4 4 0 0 1-7 2.6L14 14h-4l-1 1.6A4 4 0 0 1 2 13v-2a4 4 0 0 1 4-4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 9.5v4M5 11.5h4" stroke="currentColor" stroke-width="2"/></svg><span class="deck-label">games</span></a>
      <a class="deck-link deck-daily" href="/games/daily/" data-key="d"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="2"/></svg><span class="deck-label">daily</span></a>
      <a class="deck-link" href="/lab/" data-key="l"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M7 15h10" stroke="currentColor" stroke-width="2"/></svg><span class="deck-label">lab</span></a>
      <a class="deck-link" href="/log/" data-key="k"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h14v16H5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 9h6M9 13h6M9 17h3" stroke="currentColor" stroke-width="2"/></svg><span class="deck-label">log</span></a>
      <button class="deck-cmd" type="button" data-cmd-open aria-haspopup="dialog" aria-label="search (press /)" title="search ( / )"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2"/></svg><span class="deck-label">search</span><kbd class="deck-key" aria-hidden="true">/</kbd></button>
      <a class="deck-link deck-account" href="/me/" data-key="m"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="deck-label" data-account-label>log in</span></a>
    </div>
  </nav>
  <script src="/assets/pwa.js" defer></script>
  <script src="/assets/deck.js" defer></script>
</body>
</html>
`;
}

// null when this isn't a page we should draw (no catalog, a real game took the name, or the mood has no games):
// the Worker then treats the path like any other /games/<slug>/ (so it 404s as before)
export async function collectionPage(req, env, url, vibe) {
  if (!isMood(vibe)) return null;
  let catalog;
  try { catalog = await catalogOf(env, url.origin); } catch (e) { return null; }
  if (catalog.has(vibe)) return null;
  const list = moodGames(catalog, vibe);
  if (!list.length) return null;
  return new Response(req.method === "HEAD" ? null : collectionHtml(vibe, list), {
    status: 200,
    // _headers only reaches static files, so the site-wide ones are repeated here
    headers: {
      "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "DENY",
    },
  });
}
