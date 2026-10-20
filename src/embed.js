// Embed kit: /games/<slug>/embed/ is a bare player (game + slim bar with a credit link) that other sites can
// iframe, and every embeddable game page gets an "embed this game" card with the snippet.
// The game still runs from /games/<slug>/play/ on our origin, and plays count with ref "embed".
const SITE = "https://computercooked.com";
// every game with a /games/<slug>/play/ build can be embedded (CRASH got one in games/crash/play/)
const NOT_EMBEDDABLE = new Set();

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export const embeddable = (g) => !!g && !NOT_EMBEDDABLE.has(g.slug) && g.made_by !== "community";

export function snippet(g) {
  return `<iframe src="${SITE}/games/${g.slug}/embed/" title="${esc(g.title)} — Computer Cooked Games" width="800" height="600" style="border:0;max-width:100%;aspect-ratio:4/3;height:auto" allow="fullscreen; autoplay" loading="lazy"></iframe>
<p><a href="${SITE}/games/${g.slug}/">Play ${esc(g.title)}</a> free on <a href="${SITE}/games/">Computer Cooked Games</a></p>`;
}

export function embedCard(g) {
  return `<div class="about-card embed-card">
          <h2>// embed this game</h2>
          <p>put ${esc(g.title)} on your site or blog. it's free, plays right in the page and links back here.</p>
          <textarea class="embed-code" readonly rows="5" aria-label="embed code for ${esc(g.title)}">${esc(snippet(g))}</textarea>
          <button class="tool embed-copy" type="button" data-copy-embed><span class="tool-text">copy code</span></button>
        </div>`;
}

const icon = {
  restart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v5h5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
  mute: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path class="ico-on" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/><path class="ico-off" d="M16 9l6 6m0-6l-6 6" stroke="currentColor" stroke-width="2" style="display:none"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>',
  fs: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>',
};

// player.js drives this page the same way it drives the full player (it needs every id below)
function page(g) {
  const url = `${SITE}/games/${g.slug}/`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(g.title)} — Computer Cooked Games</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${url}">
  <meta name="color-scheme" content="dark">
  <link rel="icon" href="/assets/logo.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/styles.css">
  <link rel="stylesheet" href="/games/games.css">
</head>
<body class="embed">
  <section class="player" id="player" aria-label="${esc(g.title)} game" data-title="${esc(g.title)}" data-url="${url}" data-version="${esc(g.version || "1")}">
    <div class="player-stage">
      <iframe id="game-frame" src="/games/${g.slug}/play/" title="${esc(g.title)}" allow="fullscreen; autoplay"></iframe>
    </div>
    <div class="player-bar">
      <a class="player-title embed-title" href="${url}" target="_blank" rel="noopener">${esc(g.title)}</a>
      <button class="tool" id="btn-restart" type="button" aria-label="restart">${icon.restart}<span class="tool-text">restart</span></button>
      <button class="tool" id="btn-mute" type="button" aria-label="mute" aria-pressed="false">${icon.mute}<span class="tool-text">sound on</span></button>
      <button class="tool" id="btn-share" type="button" aria-label="share link">${icon.share}<span class="tool-text">share</span></button>
      <button class="tool" id="btn-fs" type="button" aria-label="fullscreen" aria-pressed="false">${icon.fs}<span class="tool-text">fullscreen</span></button>
      <a class="embed-brand" href="${SITE}/games/" target="_blank" rel="noopener">more<span class="embed-brand-long"> free games</span> ▶</a>
    </div>
  </section>
  <div class="toast" id="toast" role="status" aria-live="polite"></div>
  <script src="/games/cc-sdk.js"></script>
  <script src="/games/player.js"></script>
</body>
</html>`;
}

export async function embedPage(env, url, slug) {
  let g = null;
  try {
    const list = await (await env.ASSETS.fetch(new Request(url.origin + "/games/games.json"))).json();
    g = (list.games || []).find((x) => x.slug === slug);
  } catch (e) { /* treated as unknown */ }
  if (!embeddable(g)) return new Response("no such game to embed", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  return new Response(page(g), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      // the one page any site may frame (the rest of the site sends X-Frame-Options: DENY via _headers)
      "content-security-policy": "frame-ancestors *",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
    },
  });
}
