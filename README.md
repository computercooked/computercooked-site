# computercooked.com

the computer is not handling it well.

Landing page and link-in-bio for Computer Cooked. Plain static files, no framework, no build step, no trackers.

```
index.html        the page
404.html          "this page got cooked"
styles.css        all styles (brand colors are CSS variables at the top)
assets/           logo.svg (also the favicon), og.png, apple-touch-icon.png, fonts/
assets/deck.*     the "control deck" nav + "/" command bar, shared by every page
games/            Computer Cooked Games: hub (index.html), games.json, games.css, hub.js
games/crash/      CRASH, our first game (index.html player page, crash.js, thumb.svg)
robots.txt, sitemap.xml, _headers
wrangler.jsonc    Cloudflare Worker config (static assets only)
.assetsignore     files kept off the live site
scripts/          optional: regenerates og.png and the touch icon
```

## Editing the links

Social links live in `index.html` inside `<ul class="link-grid">`. Each one is an `<li>` with an `<a class="btn" href="...">`. Change the `href` to change where it goes. Order on the page is the order in the file. Items with `class="wide"` and `btn-primary` (TikTok, YouTube) are the big lime full-width buttons; the rest sit two per row.

The rotating "system status" lines are in the small `<script>` at the bottom of `index.html` (`var lines = [...]`). The contact email is in the footer.

## Navigation: the control deck

Every page has a floating CRT-style dock at the bottom (`<nav class="deck">`, copied into each page, styled by `assets/deck.css`, driven by `assets/deck.js`). It "powers on" like an old monitor, has hover magnetism on desktop, and highlights the current page.

- Items: home, games, follow (`/#follow`), ideas (TikTok, "dm us what we should cook next").
- Keyboard: `/` opens the command bar (type `games`, `follow`, `play crash`, `tiktok`… with autocomplete; ↑↓ to pick, Tab completes, Enter goes, Esc closes). `H` `G` `F` `I` jump straight to each item. Single-letter keys are switched off while a game is running (`window.ccGameActive`).
- To add a command, add an entry to `COMMANDS` in `assets/deck.js`. To add a nav item, add an `<a class="deck-link">` to the deck markup in each page.
- Page changes use the View Transitions API (`@view-transition`), the deck border is an `@property`-animated gradient, game cards use container queries and scroll-driven reveal. All motion is off under `prefers-reduced-motion`.
- Not done yet: the WebGL/canvas background layer from the brief. Left out of v1 to keep mobile Lighthouse high; if added, vendor the lib in `assets/vendor/` (no CDN).

## Games

`/games/` is the hub. It renders shelves from `games/games.json`:

```json
{ "slug": "crash", "title": "CRASH", "pitch": "...", "thumbnail": "/games/crash/thumb.svg",
  "made_by": "computer-cooked", "tags": ["arcade"] }
```

`made_by` is `"computer-cooked"` (top shelf) or `"community"` (community shelf). To add a game: make `games/<slug>/index.html` (copy `games/crash/index.html` for the player shell: fullscreen, mute, restart, share), add an entry to `games.json`, and add the URL to `sitemap.xml`. The hub HTML also has a static CRASH card so it works without JS; update it if you reorder.

### CRASH

Vanilla JS + canvas, no build step, ~65 KB total. Touch (drag anywhere), arrows / A D, P or Esc to pause, M to mute. Heat rises on its own and with every task that hits; coffee and fans cool down; 100° = cooked. High score is in `localStorage` (wrapped in try/catch). Sound effects are generated with WebAudio, so there are no audio files.

**Swapping in real art:** everything is drawn in code by default. Drop images in `games/crash/assets/` (the ccgames bot's output from `computer-cooked-games\assets\crash\`) and set their paths in the `SPRITES` object at the top of `games/crash/crash.js` (`crash` ~64×56, `coffee` and `fan` ~30×30). Task labels and game-over one-liners are arrays near the top of the same file. Music is not wired in yet; when `music\crash\` exists, add an `<audio loop>` that respects the mute button.

### Ads (later, not live)

The game pages have EMPTY `<div class="ad-slot">` placeholders above and beside the player; they're collapsed (`.ad-slot:empty { display: none }`). There are no ad scripts, trackers or cookies. Ads come later: AdSense needs real traffic first, and because the audience may include kids, the ad setup must use child-directed / COPPA settings (and a cookie banner for EU visitors once any ad or analytics cookie exists).

## v2 plan (not built)

1. User accounts and game uploads on Cloudflare Workers + D1 (data) + R2 (game files).
2. Uploaded games run sandboxed on a **separate origin** (e.g. `play.computercooked-usercontent.com`) inside `<iframe sandbox="allow-scripts">`, never on computercooked.com. Note `_headers` sets `X-Frame-Options: DENY` for this site, so our own pages don't iframe each other.
3. Moderation queue, report button, and a Content-Security-Policy.
4. Then ads, plus distribution on Poki / CrazyGames.
5. Then mobile wrappers (Capacitor) for the best games.

The "upload your own game" card on `/games/` is a mailto waitlist until step 1 exists.

## Preview locally

Any static server from the repo root works, for example `npx serve .` or `python3 -m http.server`, then open http://localhost:3000 (or :8000).

## Deploy (Cloudflare Workers, static assets)

Deployed as a static-assets-only Worker through Workers Builds, connected to this GitHub repo.

- Production branch: `main`
- Root directory: `/`
- Build command: (none)
- Deploy command: `npx wrangler deploy`

`wrangler.jsonc` points the Worker's assets at the repo root and has no `main` script, so Cloudflare just serves the files. Unknown paths get `404.html` (`not_found_handling: "404-page"`), and the headers in `_headers` are applied. `.assetsignore` keeps repo-only files (README, scripts/, docs/, wrangler.jsonc, .git and so on) off the live site; add to it if you put anything else at the root that shouldn't be public.

Every push to `main` deploys.

## Regenerating the share image

Only needed if the logo or wordmark changes. Edit `scripts/og.html`, then:

```
npm i --no-save playwright
node scripts/render-images.mjs
```

That rewrites `assets/og.png` (1200×630) and `assets/apple-touch-icon.png`.

## Font

JetBrains Mono ExtraBold is self-hosted in `assets/fonts/` (SIL Open Font License, see `OFL.txt`), so the page makes no third-party requests.
