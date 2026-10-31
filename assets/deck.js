/* control deck: active-page highlight, hover magnetism, single-key shortcuts,
   and the "/" command bar with autocomplete. No dependencies. */
(function () {
  "use strict";

  // Where this visit came from, for play counts (games/cc-sdk.js reads "cc-ref" when a game starts). The first page
  // of the visit decides: a ?ref=<channel> / utm_source tag on our posted links (same map as cc-sdk.js), else an
  // outside referrer (so tiktok.com → hub → game still counts as tiktok). Tags come off the URL once read.
  (function () {
    var TAGS = { tiktok: "tiktok", tt: "tiktok", youtube: "youtube", yt: "youtube", instagram: "instagram", ig: "instagram",
      x: "x", twitter: "x", threads: "threads", bluesky: "bluesky", bsky: "bluesky", portal: "portal" };
    try {
      var u = new URL(location.href), q = u.searchParams;
      var v = (q.get("ref") || q.get("utm_source") || "").toLowerCase().trim();
      var tag = v && v !== "app" ? TAGS[v] || "other" : null;
      if (!sessionStorage.getItem("cc-ref")) {
        var from = null;
        if (!tag && document.referrer) {
          var h = new URL(document.referrer).hostname.replace(/^www\./, "");
          if (h !== location.hostname) {
            from = /tiktok/.test(h) ? "tiktok" : /youtube|youtu\.be/.test(h) ? "youtube" : /instagram/.test(h) ? "instagram"
              : /(^|\.)x\.com$|twitter|t\.co$/.test(h) ? "x" : /threads/.test(h) ? "threads" : /bsky/.test(h) ? "bluesky"
              : /google|bing|duckduckgo|yahoo|ecosia|brave/.test(h) ? "search" : "other";
          }
        }
        if (tag || from) sessionStorage.setItem("cc-ref", tag || from);
      }
      // the campaign of the first tagged link this visit (utm_campaign), sent with page views, plays and tips
      var camp = (q.get("utm_campaign") || "").trim().toLowerCase();
      if (/^[a-z0-9_.-]{1,40}$/.test(camp) && !sessionStorage.getItem("cc-campaign")) sessionStorage.setItem("cc-campaign", camp);
      // and its raw utm_source / utm_medium (K-0050a: Chip tags every post), kept as typed so a post is attributable
      // even when the source isn't one of the channels above. Same cleaning as the campaign; first tagged link wins.
      var us = (q.get("utm_source") || "").trim().toLowerCase(), um = (q.get("utm_medium") || "").trim().toLowerCase();
      var tagOk = function (v) { return /^[a-z0-9_.-]{1,40}$/.test(v) ? v : null; };
      if ((tagOk(us) || tagOk(um)) && !sessionStorage.getItem("cc-utm")) sessionStorage.setItem("cc-utm", JSON.stringify({ s: tagOk(us), m: tagOk(um) }));
      // team test mode: ?cctest=1 gives this browser a "smoke-" anonymous id, which every count already leaves out
      // (page views, plays, feedback, scores). ?cctest=0 drops it so the next game makes a normal id. Param removed.
      var tm = q.get("cctest");
      if (tm === "1" && !/^smoke/i.test(localStorage.getItem("cc-anon") || "")) {
        localStorage.setItem("cc-anon", "smoke-team-" + Math.random().toString(36).slice(2, 12));
      } else if (tm === "0" && /^smoke/i.test(localStorage.getItem("cc-anon") || "")) {
        localStorage.removeItem("cc-anon");
      }
      if (tm !== null) q.delete("cctest");
      // test mode sticks to this browser (localStorage) until ?cctest=0 or a tap on the badge: a clean visitor never
      // has a smoke id, so never sees it, and every one of their visits is counted
      if (/^smoke/i.test(localStorage.getItem("cc-anon") || "")) {
        var badge = document.createElement("button");
        badge.type = "button";
        badge.textContent = "test mode: not counted · tap to leave";
        badge.title = "this browser was put in team test mode by a ?cctest=1 link. tap to count it again.";
        badge.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:9999;padding:2px 8px;border:0;border-radius:6px;" +
          "font:11px ui-monospace,monospace;background:#c6ff3d;color:#0e120c;opacity:.85;cursor:pointer";
        badge.onclick = function () {
          try { if (/^smoke/i.test(localStorage.getItem("cc-anon") || "")) localStorage.removeItem("cc-anon"); } catch (e) {}
          badge.remove();
        };
        (document.body || document.documentElement).appendChild(badge);
      }
      // back from a Stripe tip (the Payment Link redirects to ?tip=thanks): counted once per visit, param removed
      var thanks = q.get("tip") === "thanks";
      if (thanks) q.delete("tip");
      var tagged = false;
      ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
        if (q.has(k) && !(k === "ref" && q.get(k) === "app")) { q.delete(k); tagged = true; }
      });
      if (tagged || thanks || tm !== null) history.replaceState(history.state, "", u.pathname + u.search + u.hash);
      // one page view per load, and the tip success: no cookies, no player id stored (POST /api/hit, src/hits.js)
      var hit = window.ccHit = function (kind, extra) {
        try {
          var utm = JSON.parse(sessionStorage.getItem("cc-utm") || "{}");
          var body = { kind: kind, path: location.pathname, ref: sessionStorage.getItem("cc-ref") || "direct",
            campaign: sessionStorage.getItem("cc-campaign"), src: utm.s || null, medium: utm.m || null, anon: localStorage.getItem("cc-anon") };
          for (var k in extra || {}) body[k] = extra[k];
          fetch("/api/hit", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(function () {});
        } catch (err) {}
      };
      // first page view of the day says whether this browser is new or back (only the last-seen day is kept), and the
      // first page of a tab says land: one session per visit for the tagged-links report (K-0054, src/utm.js)
      var day = new Date().toDateString(), last = localStorage.getItem("cc-seen"), pv = {};
      if (last !== day) { localStorage.setItem("cc-seen", day); pv.vis = last ? "back" : "new"; }
      if (!sessionStorage.getItem("cc-landed")) { sessionStorage.setItem("cc-landed", "1"); pv.land = 1; }
      hit("pageview", pv);
      // time on page: visible time only, sent once when the tab is hidden or closed
      var shown = document.visibilityState === "visible" ? Date.now() : 0, seen = 0, left = false;
      document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "visible") { shown = Date.now(); return; }
        if (shown) { seen += Date.now() - shown; shown = 0; }
        if (!left) { left = true; hit("leave", { ms: seen }); }
      });
      if (thanks && !sessionStorage.getItem("cc-tipped")) { sessionStorage.setItem("cc-tipped", "1"); hit("tip_success"); window.ccTipThanks = true; }
    } catch (e) {}
  })();

  var deck = document.querySelector(".deck");
  if (!deck) return;

  
  var TIKTOK = "https://www.tiktok.com/@computercooked";
  var COMMANDS = [
    { name: "home", hint: "the main page", href: "/" },
    { name: "games", hint: "computer cooked games", href: "/games/" },
    { name: "play crash", hint: "dodge tasks. stay cool.", href: "/games/crash/" },
    { name: "random game", hint: "let the computer pick. it will pick wrong.", random: true },
    { name: "follow", hint: "all the socials", href: "/#follow" },
    { name: "ideas", hint: "tell us what we should cook next", href: "/lab/#ideas" },
    { name: "tiktok", hint: "@computercooked", href: TIKTOK, ext: true },
    { name: "youtube", hint: "subscribe", href: "https://www.youtube.com/channel/UCsL1cRo3Az36HYwxapWiFgw", ext: true },
    { name: "instagram", hint: "@computercooked", href: "https://www.instagram.com/computercooked", ext: true },
    { name: "x", hint: "@computercooked", href: "https://x.com/computercooked", ext: true },
    { name: "threads", hint: "@computercooked", href: "https://www.threads.com/@computercooked", ext: true },
    { name: "bluesky", hint: "computercooked.bsky.social", href: "https://bsky.app/profile/computercooked.bsky.social", ext: true },
    { name: "help", hint: "list everything", say: "type a page name. tab completes, enter goes, esc leaves." }
  ];
  /* every game in games.json becomes a "play <title>" command (tags are searchable too) */
  var gamesLoaded = false;
  var GAMES = [];
  function loadGames() {
    if (gamesLoaded) return;
    gamesLoaded = true;
    fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.games) return;
      GAMES = d.games.filter(function (g) { return g.slug && g.made_by !== "community"; });
      var at = 3; // after home, games, play crash
      GAMES.forEach(function (g) {
        var name = "play " + String(g.title).toLowerCase();
        if (COMMANDS.some(function (c) { return c.name === name; })) return;
        COMMANDS.splice(at++, 0, { name: name, hint: String(g.pitch || "").toLowerCase(), href: "/games/" + g.slug + "/",
          keys: (g.tags || []).join(" ").toLowerCase() });
      });
      if (dialog.open) render();
    }).catch(function () { gamesLoaded = false; });
  }

  var JOKES = {
    "sudo": "nice try. you are not in the sudoers file. this incident will be reported.",
    "rm -rf": "already did that. that's why we're like this.",
    "exit": "there is no exit. only esc.",
    "fix": "fixing is not on the roadmap.",
    "hello": "hi. the fans are loud today, sorry.",
    "ls": "home  games  daily  me  regrets/"
  };

  /* ---------- active page ---------- */
  // the longest matching link wins, so /games/daily/ lights "daily", not "games" too
  var path = location.pathname, best = null, bestLen = -1;
  deck.querySelectorAll(".deck-link").forEach(function (a) {
    var href = a.getAttribute("href");
    var on = href === "/" ? (path === "/" || path === "/index.html") : (href.charAt(0) === "/" && href.indexOf("#") < 0 && path.indexOf(href) === 0);
    if (on && href.length > bestLen) { best = a; bestLen = href.length; }
  });
  if (best) best.setAttribute("aria-current", "page");

  /* ---------- account: "log in", or your name once the API says who you are ---------- */
  var acct = deck.querySelector("[data-account-label]");
  if (acct && !/^\/(admin)\//.test(path)) {
    fetch("/api/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (j && j.user && j.user.username) { acct.textContent = j.user.username; acct.closest("a").setAttribute("aria-label", "your account: " + j.user.username); }
    }).catch(function () {});
  }


  /* ---------- command bar ---------- */
  var dialog = document.createElement("dialog");
  dialog.className = "cmd";
  dialog.setAttribute("aria-label", "command bar");
  dialog.innerHTML =
    '<form class="cmd-form" method="dialog">' +
      '<span class="cmd-prompt" aria-hidden="true">&gt;_</span>' +
      '<input class="cmd-input" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"' +
      ' role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-autocomplete="list" aria-label="where to?" placeholder="where to? try games">' +
      '<button class="cmd-esc" type="button" data-close>esc</button>' +
    '</form>' +
    '<ul class="cmd-list" id="cmd-list" role="listbox" aria-label="suggestions"></ul>' +
    '<p class="cmd-say" role="status" aria-live="polite"></p>';
  document.body.appendChild(dialog);

  var input = dialog.querySelector(".cmd-input");
  var list = dialog.querySelector(".cmd-list");
  var say = dialog.querySelector(".cmd-say");
  var matches = [];
  var sel = 0;

  function esc(s) {
    return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  function render() {
    var q = input.value.trim().toLowerCase();
    matches = COMMANDS.filter(function (c) {
      return !q || c.name.indexOf(q) >= 0 || c.hint.indexOf(q) >= 0 || (c.keys && c.keys.indexOf(q) >= 0);
    }).sort(function (a, b) {
      return (b.name.indexOf(q) === 0) - (a.name.indexOf(q) === 0);
    });
    if (sel >= matches.length) sel = 0;
    list.innerHTML = matches.map(function (c, i) {
      var n = esc(c.name);
      if (q) {
        var at = c.name.indexOf(q);
        if (at >= 0) n = esc(c.name.slice(0, at)) + "<mark>" + esc(c.name.slice(at, at + q.length)) + "</mark>" + esc(c.name.slice(at + q.length));
      }
      return '<li class="cmd-opt" role="option" id="cmd-opt-' + i + '" data-i="' + i + '" aria-selected="' + (i === sel) + '">' +
        n + (c.ext ? " ↗" : "") + "<small>" + esc(c.hint) + "</small></li>";
    }).join("");
    input.setAttribute("aria-activedescendant", matches.length ? "cmd-opt-" + sel : "");
    var active = list.querySelector('[aria-selected="true"]');
    if (active) active.scrollIntoView({ block: "nearest" });
  }

  function go(c) {
    if (!c) {
      var q = input.value.trim().toLowerCase();
      say.textContent = JOKES[q] || (q ? "command not found: " + q + ". the computer shrugged." : "");
      return;
    }
    if (c.say) { say.textContent = c.say; return; }
    if (c.random) {
      var pool = GAMES.filter(function (g) { return location.pathname.indexOf("/games/" + g.slug + "/") !== 0; });
      if (!pool.length) { say.textContent = "still loading the games. try again in a sec."; loadGames(); return; }
      c = { href: "/games/" + pool[Math.floor(Math.random() * pool.length)].slug + "/" };
    }
    dialog.close();
    if (c.ext) window.open(c.href, "_blank", "noopener");
    else location.href = c.href;
  }

  function open() {
    if (dialog.open) return;
    loadGames();
    input.value = "";
    say.textContent = "";
    sel = 0;
    render();
    dialog.showModal();
    input.focus();
    document.dispatchEvent(new CustomEvent("cc:deck-open"));
  }

  input.addEventListener("input", function () { sel = 0; say.textContent = ""; render(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % Math.max(matches.length, 1); render(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + matches.length) % Math.max(matches.length, 1); render(); }
    else if (e.key === "Tab" && matches[sel]) { e.preventDefault(); input.value = matches[sel].name; render(); }
    else if (e.key === "Enter") {
      e.preventDefault();
      var q = input.value.trim().toLowerCase();
      go(JOKES[q] ? null : matches[sel]);
    }
  });
  list.addEventListener("click", function (e) {
    var li = e.target.closest(".cmd-opt");
    if (li) go(matches[+li.dataset.i]);
  });
  dialog.querySelector("[data-close]").addEventListener("click", function () { dialog.close(); });
  dialog.addEventListener("click", function (e) { if (e.target === dialog) dialog.close(); });

  deck.querySelectorAll("[data-cmd-open]").forEach(function (b) { b.addEventListener("click", open); });

  /* ---------- keyboard shortcuts ---------- */
  var keys = {};
  deck.querySelectorAll(".deck-link[data-key]").forEach(function (a) { keys[a.dataset.key] = a; });

  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || dialog.open) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    if (e.key === "/") { e.preventDefault(); open(); return; }
    if (window.ccGameActive) return; // games own the keyboard while running
    var a = keys[e.key.toLowerCase()];
    if (a) { e.preventDefault(); a.click(); }
  });
})();

/* K-0044 redesign: any game card on any page (hub, game pages, search) plays the game's clip over its thumbnail on
   hover or keyboard focus. Clips come from games.json, fetched on the first hover. Off for reduced motion and touch. */
(function () {
  "use strict";
  if (!window.matchMedia || matchMedia("(prefers-reduced-motion: reduce)").matches || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  var clips = null, asked = false;
  function load(cb) {
    if (clips) return cb();
    if (asked) return;
    asked = true;
    fetch("/games/games.json").then(function (r) { return r.json(); }).then(function (d) {
      clips = {};
      (d.games || []).forEach(function (g) { if (g.clip) clips[g.slug] = g.clip; });
      cb();
    }).catch(function () { clips = {}; });
  }
  var cur = null;
  function start(a) {
    var m = /\/games\/([a-z0-9-]+)\/?/.exec(a.getAttribute("href") || ""), img = a.querySelector("img.game-thumb");
    if (!m || !img) return;
    load(function () {
      var src = clips[m[1]];
      if (!src || cur !== a) return;
      // the games hub plays its own clips in the grids it marks (games/hub.js): one video per card, not two
      if (a.closest("[data-hub-clips]")) return;
      var v = a.querySelector("video.cc-peek");
      if (!v) {
        v = document.createElement("video");
        v.className = "cc-peek"; v.muted = true; v.loop = true; v.playsInline = true; v.setAttribute("aria-hidden", "true"); v.src = src;
        v.style.cssText = "position:absolute;left:" + img.offsetLeft + "px;top:" + img.offsetTop + "px;width:" + img.offsetWidth + "px;height:" + img.offsetHeight + "px;object-fit:cover;image-rendering:pixelated;border-radius:inherit;pointer-events:none;opacity:0;transition:opacity .2s";
        if (getComputedStyle(a).position === "static") a.style.position = "relative";
        a.appendChild(v);
      }
      v.play().then(function () { if (cur === a) v.style.opacity = "1"; }).catch(function () {});
    });
  }
  function stop(a) { var v = a && a.querySelector("video.cc-peek"); if (v) { v.style.opacity = "0"; try { v.pause(); } catch (e) {} } }
  function over(e) {
    var a = e.target.closest && e.target.closest(".game-card a.game-link, a.game-card-inner");
    if (a === cur) return;
    stop(cur); cur = a;
    if (a) start(a);
  }
  document.addEventListener("pointerover", over, { passive: true });
  document.addEventListener("focusin", over);
})();

// The stage (assets/stage.js): embers, the phosphor glow, lit card rims and boot-in. Loaded once the page is idle so
// it never slows the first paint; it skips itself on home, in game players and under reduced motion.
(function () {
  if (window.self !== window.top || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function go() {
    var s = document.createElement("script"); s.src = "/assets/stage.js"; s.async = true;
    document.head.appendChild(s);
  }
  function idle() { "requestIdleCallback" in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200); }
  document.readyState === "complete" ? idle() : addEventListener("load", idle);
})();
