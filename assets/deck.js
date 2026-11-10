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
      // (page views, plays, feedback, scores). ?cctest=0 drops it so the next game makes a normal id. ?cctest=1 stays in
      // the address (K-0057: it vanished on arrival, so test runs looked counted); ?cctest=0 comes off.
      var tm = q.get("cctest");
      if (tm === "1" && !/^smoke/i.test(localStorage.getItem("cc-anon") || "")) {
        localStorage.setItem("cc-anon", "smoke-team-" + Math.random().toString(36).slice(2, 12));
      } else if (tm === "0" && /^smoke/i.test(localStorage.getItem("cc-anon") || "")) {
        localStorage.removeItem("cc-anon");
      }
      if (tm !== null && tm !== "1") q.delete("cctest");
      // test mode sticks to this browser (localStorage) until ?cctest=0 or a tap on the badge: a clean visitor never
      // has a smoke id, so never sees it, and every one of their visits is counted. The badge shows on a local dev
      // server only (K-0056): on the live site it ended up in the team's screen recordings; ?cctest=0 still leaves
      if (/^smoke/i.test(localStorage.getItem("cc-anon") || "") && /^(localhost|127\.0\.0\.1|\[::1\])$|\.localhost$/.test(location.hostname)) {
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
      if (tagged || thanks || (tm !== null && tm !== "1")) history.replaceState(history.state, "", u.pathname + u.search + u.hash);
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
      // K-0055: every follow link on any page (a[data-follow]: assets/follow.js rows and cards, the homepage row and
      // footer) counts one click: POST /api/follow → cc:follow_click, read in /admin and /api/admin/utm
      window.ccFollowAll = true;
      document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("a[data-follow]");
        if (!a) return;
        var gm = /^\/games\/([a-z0-9-]+)\//.exec(location.pathname);
        try {
          fetch("/api/follow", { method: "POST", keepalive: true, headers: { "content-type": "application/json" },
            body: JSON.stringify({ platform: a.dataset.follow, slot: a.dataset.slot, game: gm ? gm[1] : null, anon: localStorage.getItem("cc-anon") }) }).catch(function () {});
        } catch (err) {}
      });
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
    { name: "triple feature", hint: "three random games, back to back", feature: true, keys: "three 3 in a row playlist marathon mix gauntlet shuffle back to back" },
    { name: "arcade games", hint: "dodge, run, shoot", href: "/games/?vibe=arcade" },
    { name: "puzzle games", hint: "use the brain. sorry.", href: "/games/?vibe=puzzle" },
    { name: "chill games", hint: "low stakes, low heart rate", href: "/games/?vibe=chill" },
    { name: "quick games", hint: "60 seconds or less", href: "/games/?vibe=quick" },
    { name: "rage games", hint: "you will blame the computer", href: "/games/?vibe=rage" },
    { name: "new games", hint: "fresh out of the oven", href: "/games/?vibe=new" },
    { name: "epic gamers", hint: "who holds #1 on every game", href: "/champs/", keys: "champions crowns wall leaderboard high scores hall of fame" },
    { name: "channel surf", hint: "flip through every game like tv", href: "/surf/", keys: "tv channels flip browse clips preview shuffle" },
    { name: "follow", hint: "all the socials", href: "/#follow" },
    { name: "ideas", hint: "tell us what we should cook next", href: "/lab/#ideas" },
    { name: "tiktok", hint: "@computercooked", href: TIKTOK, ext: true },
    { name: "youtube", hint: "subscribe", href: "https://www.youtube.com/channel/UCsL1cRo3Az36HYwxapWiFgw", ext: true },
    { name: "instagram", hint: "@computercooked", href: "https://www.instagram.com/computercooked", ext: true },
    { name: "x", hint: "@computercooked", href: "https://x.com/computercooked", ext: true },
    { name: "threads", hint: "@computercooked", href: "https://www.threads.com/@computercooked", ext: true },
    { name: "bluesky", hint: "computercooked.bsky.social", href: "https://bsky.app/profile/computercooked.bsky.social", ext: true },
    { name: "screen colour", hint: "green, amber, ice or pink. enter flips to the next", tint: true, keys: "theme color colour tint accent skin amber ice pink green dark mode" },
    { name: "keyboard shortcuts", hint: "every key the computer knows (or press ?)", help: true, keys: "hotkeys keys keyboard ?" },
    { name: "help", hint: "list everything", say: "type a page name. tab completes, enter goes, esc leaves. press ? for every shortcut." }
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
    "ls": "home  games  daily  me  regrets/",
    "konami": "up up down down left right left right b a. on the keyboard, not in here.",
    "cheats": "there is one. it involves a lot of arrow keys."
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
    if (c.help) { dialog.close(); openHelp(); return; }
    if (c.tint) { say.textContent = "screen colour: " + (window.ccTint ? window.ccTint() : "green") + ". enter for the next one."; return; }
    if (c.feature) { say.textContent = "picking three. no refunds."; window.ccFeature.start(); return; }
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

  /* "?" lists every shortcut that works on this page. Built when first opened, from the deck's own data-key links. */
  var help = null;
  function openHelp() {
    if (help && help.open) return;
    if (!help) {
      help = document.createElement("dialog");
      help.className = "cmd keys";
      help.setAttribute("aria-label", "keyboard shortcuts");
      var rows = [["/", "search and jump anywhere"]];
      Object.keys(keys).forEach(function (k) {
        var l = keys[k].querySelector(".deck-label");
        rows.push([k, l && l.hasAttribute("data-account-label") ? "your account" : "go to " + (l ? l.textContent : keys[k].getAttribute("href"))]);
      });
      if (document.getElementById("tv-guide")) rows.push(["← →", "flip channels"], ["enter", "play this channel"], ["a", "auto surf on or off"]);
      if (window.ccHop && window.ccHop.any()) rows.push(["← ↑ ↓ →", "hop between games once one has focus. a controller works too"]);
      rows.push(["?", "this list"], ["esc", "close"]);
      var head = document.createElement("div"); head.className = "keys-head";
      var h = document.createElement("h2"); h.textContent = "keys the computer knows";
      var x = document.createElement("button"); x.type = "button"; x.className = "cmd-esc"; x.textContent = "esc";
      x.addEventListener("click", function () { help.close(); });
      head.appendChild(h); head.appendChild(x);
      var dl = document.createElement("dl"); dl.className = "keys-list";
      rows.forEach(function (r) {
        var dt = document.createElement("dt");
        r[0].split(" ").forEach(function (k) { var kb = document.createElement("kbd"); kb.textContent = k; dt.appendChild(kb); });
        var dd = document.createElement("dd"); dd.textContent = r[1];
        dl.appendChild(dt); dl.appendChild(dd);
      });
      help.appendChild(head); help.appendChild(dl);
      help.addEventListener("click", function (e) { if (e.target === help) help.close(); });
      document.body.appendChild(help);
    }
    help.showModal();
  }

  document.addEventListener("keydown", function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || dialog.open) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
    if (help && help.open) { if (e.key === "?") { e.preventDefault(); help.close(); } return; }
    if (e.key === "/") { e.preventDefault(); open(); return; }
    if (window.ccGameActive) return; // games own the keyboard while running
    if (e.key === "?") { e.preventDefault(); openHelp(); return; }
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

// Instant pages: when a visitor rests on (or presses) a same-site link, the browser fetches that page ahead of the click
// (Speculation Rules, prefetch only: no page script runs early, so nothing is counted or started). Browsers without it
// just navigate as before. Skipped inside embeds and when the visitor asked to save data. Never touches /api, /admin or /d links.
(function () {
  if (window.self !== window.top) return;
  var c = navigator.connection;
  if (c && c.saveData) return;
  if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return;
  var s = document.createElement("script");
  s.type = "speculationrules";
  s.textContent = JSON.stringify({ prefetch: [{ where: { and: [
    { href_matches: "/*" },
    { not: { href_matches: ["/api/*", "/admin/*", "/d/*"] } },
    { not: { selector_matches: "[download], [target=_blank], [rel~=nofollow], [data-no-prefetch]" } }
  ] }, eagerness: "moderate" }] });
  document.head.appendChild(s);
})();

/* Easter egg: the konami code (up up down down left right left right b a) cooks the computer: a fake crash screen with
   a way back and a way into a random game. Never while typing in a field or while a game owns the keyboard. Nothing is sent. */
(function () {
  "use strict";
  if (!window.HTMLDialogElement) return;
  var SEQ = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"];
  var at = 0, box = null, pct = null, timer = 0;
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function cook() {
    if (!box) {
      box = el("dialog", "cooked");
      box.setAttribute("aria-label", "the computer is cooked");
      var inner = el("div", "cooked-in");
      inner.appendChild(el("p", "cooked-face", ":("));
      inner.appendChild(el("h2", "cooked-title", "your computer is cooked."));
      inner.appendChild(el("p", "cooked-text", "it ran into a cheat code and needs a minute. we are collecting 0% of your data and 100% of its regrets."));
      pct = el("p", "cooked-pct", "cooking: 0% complete");
      pct.setAttribute("aria-hidden", "true");
      inner.appendChild(pct);
      inner.appendChild(el("p", "cooked-code", "stop code: KONAMI_CODE_ACCEPTED"));
      var row = el("p", "cooked-row"), go = el("a", "cooked-go", "play something random →"), back = el("button", "cooked-back", "esc: back to normal");
      go.href = "/surf/"; back.type = "button";
      back.addEventListener("click", function () { box.close(); });
      row.appendChild(go); row.appendChild(back);
      inner.appendChild(row); box.appendChild(inner);
      box.addEventListener("close", function () { clearInterval(timer); });
      document.body.appendChild(box);
    }
    if (box.open) return;
    box.showModal();
    clearInterval(timer);
    var n = 0, still = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
    var set = function () { pct.textContent = "cooking: " + n + "% complete" + (n >= 100 ? ". well done." : ""); };
    if (still) { n = 100; set(); return; }
    set();
    timer = setInterval(function () { n = Math.min(100, n + 1 + Math.floor(Math.random() * 4)); set(); if (n >= 100) clearInterval(timer); }, 70);
  }
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || window.ccGameActive) { at = 0; return; }
    var t = e.target;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) { at = 0; return; }
    var k = String(e.key).toLowerCase();
    if (k === SEQ[at]) at++;
    else if (k === "arrowup") at = at === 2 ? 2 : 1; // a third "up" still counts as the first two
    else at = 0;
    if (at === SEQ.length) { at = 0; cook(); }
  });
})();

/* Screen colour: the site's one accent in four phosphors (green, amber, ice, pink; rules in assets/tokens.css).
   window.ccTint() steps to the next one and returns its name; a "cc:tint" event on document does the same, and
   "cc:tinted" (detail: the name) is sent after every change. Kept on this device only (localStorage "cc-tint"). */
(function () {
  "use strict";
  var TINTS = ["", "amber", "ice", "pink"];
  window.ccTint = function () {
    var root = document.documentElement, t = TINTS[(TINTS.indexOf(root.dataset.tint || "") + 1) % TINTS.length];
    if (t) root.dataset.tint = t; else delete root.dataset.tint;
    try { if (t) localStorage.setItem("cc-tint", t); else localStorage.removeItem("cc-tint"); } catch (e) {}
    document.dispatchEvent(new CustomEvent("cc:tinted", { detail: t || "green" }));
    return t || "green";
  };
  document.addEventListener("cc:tint", window.ccTint);
})();

/* Couch mode: move between game cards like a console menu. With a card focused (tab to one), the arrow keys hop to the
   nearest card in that direction. A plugged-in controller does the same from anywhere: d-pad or left stick moves,
   A opens the game, B goes back a page. Games own the keys and the controller while they run (window.ccGameActive),
   and the surf page keeps its own arrows. html.pad-nav (assets/tokens.css) draws the focus ring; a mouse press clears it. */
(function () {
  "use strict";
  var SEL = "a.game-link, a.cc-next-card, a.continue-card, a.weekly-card, a.spotlight";
  var root = document.documentElement;
  function cards() {
    return Array.prototype.filter.call(document.querySelectorAll(SEL), function (a) { var r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
  }
  function busy() { return window.ccGameActive || document.getElementById("tv-guide") || document.querySelector("dialog[open]"); }
  function mid(a) { var r = a.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function go(a) {
    root.classList.add("pad-nav");
    a.focus({ preventScroll: true });
    a.scrollIntoView({ block: "nearest", inline: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }
  /* the nearest card from `from` in direction (dx, dy); distance across the direction counts triple so rows and columns hold */
  function hop(from, dx, dy) {
    var list = cards(), c = mid(from), best = null, bestScore = Infinity;
    list.forEach(function (a) {
      if (a === from) return;
      var m = mid(a), along = (m.x - c.x) * dx + (m.y - c.y) * dy, across = Math.abs((m.x - c.x) * dy) + Math.abs((m.y - c.y) * dx);
      if (along < 8) return;
      var score = along + across * 3;
      if (score < bestScore) { bestScore = score; best = a; }
    });
    if (best) go(best);
    return !!best;
  }
  function first() { // the first card on screen, or failing that the first on the page
    var list = cards(), h = window.innerHeight, on = list.filter(function (a) { var r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= h; })[0];
    if (on || list[0]) go(on || list[0]);
  }
  function here() { var a = document.activeElement; return a && a.matches && a.matches(SEL) ? a : null; }
  window.ccHop = { any: function () { return !document.getElementById("tv-guide") && cards().length > 0; } };

  var DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  document.addEventListener("keydown", function (e) {
    var d = DIR[e.key];
    if (!d || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || busy()) return;
    var a = here();
    if (a && hop(a, d[0], d[1])) e.preventDefault();
  });
  document.addEventListener("pointerdown", function () { root.classList.remove("pad-nav"); }, true);

  /* the controller: polled only while one is plugged in and the tab is showing */
  if (!navigator.getGamepads) return;
  var raf = 0, held = "", since = 0, last = 0, hello = false;
  function read() {
    var pads = navigator.getGamepads(), p = null;
    for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) { p = pads[i]; break; }
    if (!p) return "";
    var b = function (n) { return p.buttons[n] && p.buttons[n].pressed; }, x = p.axes[0] || 0, y = p.axes[1] || 0;
    if (b(0)) return "a";
    if (b(1)) return "b";
    if (b(14) || x < -0.6) return "ArrowLeft";
    if (b(15) || x > 0.6) return "ArrowRight";
    if (b(12) || y < -0.6) return "ArrowUp";
    if (b(13) || y > 0.6) return "ArrowDown";
    return "";
  }
  function act(k) {
    var a = here();
    if (k === "a") { if (a) a.click(); else first(); return; }
    if (k === "b") { if (a) { a.blur(); root.classList.remove("pad-nav"); } else if (history.length > 1) history.back(); return; }
    if (!a) first(); else hop(a, DIR[k][0], DIR[k][1]);
  }
  function tick(t) {
    raf = requestAnimationFrame(tick);
    if (document.hidden || busy()) { held = "x"; return; } // "x": whatever is down when the game ends must be let go first
    var k = read();
    if (!k) { held = ""; return; }
    if (held === "x") return;
    if (k !== held) { held = k; since = last = t; act(k); return; }
    if (DIR[k] && t - since > 380 && t - last > 150) { last = t; act(k); } // holding a direction keeps moving
  }
  function plugged() {
    var pads = navigator.getGamepads();
    for (var i = 0; i < pads.length; i++) if (pads[i] && pads[i].connected) return true;
    return false;
  }
  function start() {
    if (!raf && plugged() && cards().length) raf = requestAnimationFrame(tick);
    if (raf && !hello && window.ccToast) { hello = true; window.ccToast("controller found. d-pad picks, A plays."); }
  }
  window.addEventListener("gamepadconnected", start);
  window.addEventListener("gamepaddisconnected", function () {
    if (!plugged() && raf) { cancelAnimationFrame(raf); raf = 0; }
  });
  window.addEventListener("load", function () { setTimeout(start, 1200); }); // cards drawn after load (the hub) still count
})();

/* Triple feature: three random games, back to back. window.ccFeature.start(slugs) picks three (from `slugs` when given,
   otherwise from every game), keeps the line-up for this tab (sessionStorage "cc-feature") and opens the first one.
   On a game page that is in the line-up, a strip above the game shows where you are and links the next one; after the
   last game it offers three more. Started from the hub's "3 in a row" chip (assets/fx.js) or the command bar. */
(function () {
  "use strict";
  var KEY = "cc-feature";
  function get() { try { var v = JSON.parse(sessionStorage.getItem(KEY)); return v && v.length ? v : null; } catch (e) { return null; } }
  function end() { try { sessionStorage.removeItem(KEY); } catch (e) {} }
  function here() { var m = /^\/games\/([^/]+)\/$/.exec(location.pathname); return m ? decodeURIComponent(m[1]) : ""; }
  function url(slug) { return "/games/" + encodeURIComponent(slug) + "/?ref=feature"; }
  function start(slugs) {
    return fetch("/games/games.json").then(function (r) { return r.json(); }).then(function (d) {
      var now = here(), pool = d.games.filter(function (g) {
        return g.slug && g.made_by !== "community" && g.slug !== now && (!slugs || slugs.indexOf(g.slug) >= 0);
      });
      if (pool.length < 3) pool = d.games.filter(function (g) { return g.slug && g.made_by !== "community" && g.slug !== now; }); // a filter with under three games: pick from them all
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      var list = pool.slice(0, 3).map(function (g) { return { slug: g.slug, title: g.title }; });
      if (!list.length) return;
      try { sessionStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
      location.href = url(list[0].slug);
    }).catch(function () {});
  }
  window.ccFeature = { start: start, get: get, end: end };

  var list = get(), slug = here(), layout = document.querySelector(".player-layout");
  if (!list || !slug || !layout) return;
  var at = -1;
  list.forEach(function (g, i) { if (g.slug === slug) at = i; });
  if (at < 0) return;
  var bar = document.createElement("div"); bar.className = "feature-bar"; bar.setAttribute("role", "group"); bar.setAttribute("aria-label", "triple feature");
  var tag = document.createElement("span"); tag.className = "feature-tag"; tag.textContent = "triple feature";
  var dots = document.createElement("span"); dots.className = "feature-dots"; dots.setAttribute("aria-hidden", "true");
  list.forEach(function (g, i) { var d = document.createElement("i"); if (i <= at) d.className = "is-on"; dots.appendChild(d); });
  var where = document.createElement("span"); where.className = "feature-where"; where.textContent = "game " + (at + 1) + " of " + list.length;
  var next;
  if (at < list.length - 1) {
    next = document.createElement("a"); next.className = "feature-next"; next.href = url(list[at + 1].slug);
    next.textContent = "next: " + String(list[at + 1].title).toLowerCase() + " \u2192";
  } else {
    next = document.createElement("button"); next.type = "button"; next.className = "feature-next"; next.textContent = "last one. three more \u2192";
    next.addEventListener("click", function () { next.disabled = true; start(); });
  }
  var x = document.createElement("button"); x.type = "button"; x.className = "feature-end"; x.textContent = "\u00d7"; x.setAttribute("aria-label", "end the triple feature");
  x.addEventListener("click", function () { end(); bar.remove(); });
  bar.appendChild(tag); bar.appendChild(dots); bar.appendChild(where); bar.appendChild(next); bar.appendChild(x);
  layout.parentNode.insertBefore(bar, layout);
})();
