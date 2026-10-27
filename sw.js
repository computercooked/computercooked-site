/* Computer Cooked service worker: makes the games site installable ("add to home screen") and lets games you've
   played open offline.
   - Network first, always: online you get exactly what the server sends (a deploy is never masked by an old copy).
     The caches are only the fallback for when the network fails.
   - Game files (/games/<slug>/play/...) live in one cache per game VERSION from games.json, "cc-game-<slug>@<version>".
     When games.json shows a new version, that game's old cache is deleted, so an offline copy is never a mix of
     two versions (no stale game JS next to a newer page). The game is saved again the next time it's played.
   - Everything else (the hub and site shell, pages, assets) lives in "cc-<VERSION>": the shell up front, the rest
     as you load it (same origin, GET, plain 200 responses only).
   - Never touched: /api/* (always network, never cached), /admin/*, other sites, non-GET, range requests.
   - Offline navigation with nothing saved: /games/offline (games/offline.html), which lists the games this device can play.
   Bump VERSION when SHELL changes; old shell caches are deleted on activate. */
const VERSION = "v2";
const CACHE = "cc-" + VERSION;
const GAME_PREFIX = "cc-game-";
const SHELL = [
  "/games/", "/games/offline", "/games/games.json", "/games/games.css", "/games/hub.js",
  "/games/player.js", "/games/platform.js", "/games/cc-sdk.js",
  "/styles.css", "/assets/deck.css", "/assets/deck.js", "/assets/fx.js", "/assets/avatars.js", "/assets/pwa.js",
  "/assets/logo.svg", "/assets/brand/wordmark-480.webp", "/assets/favicon-32.png", "/assets/icon-192.png", "/assets/fonts/jetbrains-mono-latin-800-normal.woff2",
  "/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the HTTP cache so the shell is fresh from the server
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cc-") && !k.startsWith(GAME_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => versionsFrom(null))
    .then(() => self.clients.claim()));
});

// ---------- game versions (slug -> version) from games.json ----------
let versions = null;
// from a fresh games.json response, or (res null) the cached copy; drops caches of versions that are no longer current
async function versionsFrom(res) {
  try {
    const src = res || (await caches.match("/games/games.json"));
    if (!src) return versions;
    const list = (await src.json()).games || [];
    versions = new Map(list.map((g) => [g.slug, String(g.version || "1")]));
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => {
      if (!k.startsWith(GAME_PREFIX)) return false;
      const at = k.lastIndexOf("@"), slug = k.slice(GAME_PREFIX.length, at), v = k.slice(at + 1);
      return versions.has(slug) && versions.get(slug) !== v;
    }).map((k) => caches.delete(k)));
  } catch (err) { /* keep what we had */ }
  return versions;
}
// the current games.json, from the network when we can (so a new version is noticed before its files are saved)
let refreshing = null;
function refreshVersions() {
  if (!refreshing) {
    refreshing = fetch("/games/games.json", { cache: "no-cache" })
      .then((res) => (res.ok ? caches.open(CACHE).then((c) => c.put("/games/games.json", res.clone())).then(() => versionsFrom(res)) : versions))
      .catch(() => versions)
      .finally(() => { setTimeout(() => { refreshing = null; }, 60000); });
  }
  return refreshing;
}
const gameOf = (path) => (/^\/games\/([a-z0-9-]+)\/play\//.exec(path) || [])[1] || null;
async function cacheFor(path) {
  const slug = gameOf(path);
  if (!slug) return CACHE;
  const v = (await refreshVersions()) || (await versionsFrom(null));
  return GAME_PREFIX + slug + "@" + ((v && v.get(slug)) || "0");
}

// ---------- fetch ----------
const skip = (req, url) => req.method !== "GET" || url.origin !== self.location.origin || req.headers.has("range") ||
  url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin");

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (skip(req, url)) return; // the browser handles it as if there were no service worker
  e.respondWith(fromNetwork(req, url, e));
});

async function fromNetwork(req, url, e) {
  try {
    const res = await fetch(req);
    if (res.ok && res.status === 200 && res.type === "basic") {
      const copy = res.clone();
      if (url.pathname === "/games/games.json") e.waitUntil(versionsFrom(res.clone()));
      e.waitUntil(cacheFor(url.pathname).then((name) => caches.open(name)).then((c) => c.put(req, copy)).catch(() => {}));
    }
    return res;
  } catch (err) {
    // pages ignore the query string (dare links, ?ref=app) so a saved /games/crash/ still opens
    const opts = { ignoreSearch: req.mode === "navigate" };
    const slug = gameOf(url.pathname);
    // a game's files only come from its current version's cache
    const hit = slug ? await (await caches.open(await cacheFor(url.pathname))).match(req, opts) : await (await caches.open(CACHE)).match(req, opts);
    if (hit) return hit;
    if (req.mode === "navigate") {
      // re-served with only a content type: the site-wide X-Frame-Options: DENY would otherwise blank it when the
      // missing page is a game frame (/games/<slug>/play/). The page itself opens its links in the top window.
      const off = await caches.match("/games/offline");
      if (off) return new Response(await off.blob(), { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    throw err;
  }
}
