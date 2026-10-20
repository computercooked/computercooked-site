/* control deck: active-page highlight, hover magnetism, single-key shortcuts,
   and the "/" command bar with autocomplete. No dependencies. */
(function () {
  "use strict";

  // Where this visit came from, for play counts (games/cc-sdk.js reads "cc-ref" when a game starts). The first page
  // of the visit decides: a ?ref=<channel> / utm_source tag on our posted links (same map as cc-sdk.js), else an
  // outside referrer (so tiktok.com → hub → game still counts as tiktok). Tags come off the URL once read.
  (function () {
    var TAGS = { tiktok: "tiktok", tt: "tiktok", youtube: "youtube", yt: "youtube", instagram: "instagram", ig: "instagram",
      x: "x", twitter: "x", threads: "threads", bluesky: "bluesky", bsky: "bluesky" };
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
      var tagged = false;
      ["ref", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (k) {
        if (q.has(k) && !(k === "ref" && q.get(k) === "app")) { q.delete(k); tagged = true; }
      });
      if (tagged) history.replaceState(history.state, "", u.pathname + u.search + u.hash);
    } catch (e) {}
  })();

  var deck = document.querySelector(".deck");
  if (!deck) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  var TIKTOK = "https://www.tiktok.com/@computercooked";
  var COMMANDS = [
    { name: "home", hint: "the main page", href: "/" },
    { name: "games", hint: "computer cooked games", href: "/games/" },
    { name: "play crash", hint: "dodge tasks. stay cool.", href: "/games/crash/" },
    { name: "random game", hint: "let the computer pick. it will pick wrong.", random: true },
    { name: "follow", hint: "all the socials", href: "/#follow" },
    { name: "ideas", hint: "dm us what we should cook next", href: TIKTOK, ext: true },
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
    "ls": "home  games  follow  ideas  regrets/"
  };

  /* ---------- active page ---------- */
  var path = location.pathname;
  deck.querySelectorAll(".deck-link").forEach(function (a) {
    var href = a.getAttribute("href");
    var on = href === "/" ? (path === "/" || path === "/index.html") : (href.charAt(0) === "/" && href.indexOf("#") < 0 && path.indexOf(href) === 0);
    if (on) a.setAttribute("aria-current", "page");
  });

  /* ---------- hover magnetism ---------- */
  if (finePointer && !reduceMotion) {
    deck.querySelectorAll(".deck-link, .deck-cmd").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.translate = (dx * 8).toFixed(1) + "px " + (dy * 6).toFixed(1) + "px";
      });
      el.addEventListener("pointerleave", function () { el.style.translate = ""; });
    });
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
