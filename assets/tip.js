/* The one tip button (K-0059): "Tip the chef" with the CRT mascot, a plain link out to the Stripe Payment Link.
   The link lives in one place: TIP_URL in wrangler.jsonc, served by /api/tip (null = off, and then nothing shows).
   Use it anywhere, site pages and game screens alike (it brings its own styles):
     <script src="/assets/tip.js" defer></script>
     ccTip.mount(el, { game: "cooked-sweeper", slot: "game-over" })   -> Promise<the button's <p> | null>
       appends the button to el (once per el); game = the game's slug, or "home" / "hub" for site pages
     ccTip.ready()                                                     -> Promise<url | null> (null: tips are off)
   The link carries ?ref=tipjar-<game> and client_reference_id=tipjar-<game> (Stripe shows that one on each payment).
   A click is counted as tip_click {slot, game} (POST /api/hit; test-mode browsers are answered but not stored).
   Never a popup: it opens Stripe's own page in a new tab. Taps and keys on it don't reach the game underneath, so it
   can't trigger a restart. Hidden in the native app builds (App Store 3.1.1: no outside payment links). */
(function () {
  "use strict";
  if (window.ccTip) return;
  var native = !!(window.ccNative && window.ccNative.isNative) ||
    !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var urlP = null;
  function ready() {
    if (native) return Promise.resolve(null);
    if (!urlP) urlP = fetch("/api/tip").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && typeof j.url === "string" && /^https:\/\/buy\.stripe\.com\/[A-Za-z0-9_-]+$/.test(j.url) ? j.url : null; })
      .catch(function () { return null; });
    return urlP;
  }
  var slug = function (s) { return String(s || "site").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "site"; };
  function link(url, game) {
    var tag = "tipjar-" + slug(game);
    return url + "?ref=" + tag + "&client_reference_id=" + tag;
  }

  var CSS = ".cc-tipjar{margin:10px 0 0;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 10px;" +
    "font:12px/1.4 var(--mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace)}" +
    ".cc-tipjar a{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:4px 14px 4px 6px;border:1px solid var(--lime,#c6ff3d);" +
    "border-radius:999px;background:#0e120c;color:var(--lime,#c6ff3d);font:700 14px/1 var(--display,var(--mono,ui-monospace,monospace));" +
    "text-decoration:none;box-shadow:0 0 0 rgba(198,255,61,0);-webkit-tap-highlight-color:transparent;touch-action:manipulation}" +
    ".cc-tipjar img{width:22px;height:32px;image-rendering:pixelated;flex:none}" +
    ".cc-tipjar a:hover,.cc-tipjar a:focus-visible{background:#1b2513;box-shadow:0 0 14px rgba(198,255,61,.35);outline:none}" +
    ".cc-tipjar a:focus-visible{outline:2px solid var(--lime,#c6ff3d);outline-offset:2px}" +
    ".cc-tipjar small{font-size:12px;white-space:nowrap}" +
    "@media (prefers-reduced-motion:no-preference){.cc-tipjar a{transition:transform .15s ease,box-shadow .15s ease,background .15s ease}" +
    ".cc-tipjar a:hover{transform:translateY(-1px)}.cc-tipjar a:active{transform:scale(.97)}" +
    ".cc-tipjar img{transform-origin:50% 100%;animation:cc-tipjar-bob 2.4s ease-in-out infinite}" +
    "@keyframes cc-tipjar-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}}";
  function style() {
    if (document.getElementById("cc-tipjar-css")) return;
    var s = document.createElement("style");
    s.id = "cc-tipjar-css"; s.textContent = CSS;
    (document.head || document.documentElement).appendChild(s);
  }

  function count(slot, game) {
    var g = slug(game);
    var extra = { slot: slot };
    if (g !== "home" && g !== "hub" && g !== "site") extra.game = g;
    if (window.ccHit) return window.ccHit("tip_click", extra); // site pages: assets/deck.js adds the visit's ref / utm
    try {
      var body = { kind: "tip_click", path: location.pathname, ref: "direct", anon: localStorage.getItem("cc-anon") };
      for (var k in extra) body[k] = extra[k];
      fetch("/api/hit", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(function () {});
    } catch (e) {}
  }

  function mount(el, opt) {
    opt = opt || {};
    var game = opt.game || "site", slot = opt.slot || "other";
    return ready().then(function (url) {
      if (!url || !el || !el.isConnected) return null;
      var have = el.querySelector(".cc-tipjar");
      if (have) return have;
      style();
      var p = document.createElement("p");
      p.className = "cc-tipjar";
      var a = document.createElement("a");
      a.href = link(url, game);
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.referrerPolicy = "no-referrer";
      a.setAttribute("data-tip", slot);
      a.setAttribute("aria-label", "Tip the chef (opens Stripe in a new tab)");
      a.innerHTML = '<img src="/assets/mascot-happy.svg" alt="" width="22" height="32" decoding="async" loading="lazy">Tip the chef';
      var small = document.createElement("small");
      small.textContent = "keeps the games free · 18+ / ask a parent";
      p.appendChild(a); p.appendChild(small);
      // the game underneath never sees these (no accidental restart / flag / jump)
      ["pointerdown", "pointerup", "mousedown", "mouseup", "touchstart", "touchend", "click", "keydown", "keyup"].forEach(function (t) {
        p.addEventListener(t, function (e) { e.stopPropagation(); }, { passive: true });
      });
      a.addEventListener("click", function () { count(slot, game); });
      el.appendChild(p);
      return p;
    });
  }

  window.ccTip = { ready: ready, mount: mount, link: link };
})();
