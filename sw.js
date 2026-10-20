/* Computer Cooked service worker: makes the games site installable ("add to home screen") and lets games you've
   played open offline.
   - Network first, always: online you get exactly what the server sends (a deploy is never masked by an old copy).
     The cache is only the fallback for when the network fails.
   - What's cached: the hub and site shell up front (SHELL), plus each page, game file and asset as you load it
     (same origin, GET, plain 200 responses only).
   - Never touched: /api/* (always network, never cached), /admin/*, other sites, non-GET, range requests.
   - Offline navigation with nothing cached: /games/offline (games/offline.html), which lists the games this device can play.
   Bump VERSION when SHELL changes; old caches are deleted on activate. */
const VERSION = "v1";
const CACHE = "cc-" + VERSION;
const SHELL = [
  "/games/", "/games/offline", "/games/games.json", "/games/games.css", "/games/hub.js",
  "/games/player.js", "/games/platform.js", "/games/cc-sdk.js",
  "/styles.css", "/assets/deck.css", "/assets/deck.js", "/assets/fx.js", "/assets/avatars.js", "/assets/pwa.js",
  "/assets/logo.svg", "/assets/icon-192.png", "/assets/fonts/jetbrains-mono-latin-800-normal.woff2",
  "/manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  // cache: "reload" skips the HTTP cache so the shell is fresh from the server
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("cc-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

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
      e.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}));
    }
    return res;
  } catch (err) {
    const c = await caches.open(CACHE);
    // pages ignore the query string (dare links, ?ref=app) so a cached /games/crash/ still opens
    const hit = await c.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    if (req.mode === "navigate") {
      const off = await c.match("/games/offline");
      if (off) return off;
    }
    throw err;
  }
}
