/* Renders the game shelves from /games/games.json, plus "trending this week" and "most played"
   from /api/stats, "new" badges, play counts (100+), and favorite hearts for logged-in players.
   The HTML ships with a static CRASH card, so the page still works if this never runs. */
(function () {
  "use strict";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  /* ---------- social landing: "tap to play <game>" for visitors from a clip ----------
     The head script (#cc-landing-boot) marked <html data-landing="<slug>" data-landing-ref="<platform>">.
     Draw a full-screen card for that game: one tap opens it in this same tab (no popups or new windows, which
     in-app browsers block), carrying ?ref= so the play is credited to the platform. "more games" just closes it.
     An unknown slug or a failed games.json falls back to the normal hub. */
  (function landing() {
    var root = document.documentElement, slug = root.getAttribute("data-landing"), ref = root.getAttribute("data-landing-ref");
    if (!slug) return;
    var done = false;
    function off() { done = true; root.removeAttribute("data-landing"); root.removeAttribute("data-landing-ref"); root.removeAttribute("data-landing-ready"); }
    // the game hint has done its job: drop it from the address bar (deck.js takes ?ref= off once it's stored)
    try { var u = new URL(location.href); if (u.searchParams.has("game")) { u.searchParams.delete("game"); history.replaceState(history.state, "", u.pathname + u.search + u.hash); } } catch (e) {}
    var safety = setTimeout(function () { if (!done) off(); }, 3000);
    fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (done) return;
      clearTimeout(safety);
      var g = d && (d.games || []).filter(function (x) { return x.slug === slug; })[0];
      if (!g) { off(); return; }
      var href = "/games/" + encodeURIComponent(g.slug) + "/?ref=" + encodeURIComponent(ref) + "#player";
      var card = document.createElement("div");
      card.className = "cc-landing";
      card.setAttribute("role", "dialog");
      card.setAttribute("aria-modal", "true");
      card.setAttribute("aria-labelledby", "cc-landing-title");
      card.innerHTML =
        '<div class="cc-landing-inner">' +
          '<p class="cc-landing-k"><span class="cc-landing-dot" aria-hidden="true"></span>from the clip · free · no download</p>' +
          '<a class="cc-landing-play" href="' + esc(href) + '">' +
            // the gameplay poster (320x180) when there is one: it fills the 16:9 art box exactly
            '<span class="cc-landing-art"><img src="' + esc(art(g)) + '" alt="" width="' + (g.poster ? "320" : "640") + '" height="' + (g.poster ? "180" : "360") + '" fetchpriority="high"></span>' +
            '<span class="cc-landing-title" id="cc-landing-title">' + esc(g.title) + "</span>" +
            '<span class="cc-landing-go">tap to play</span>' +
          "</a>" +
          (g.pitch ? '<p class="cc-landing-pitch">' + esc(g.pitch) + "</p>" : "") +
          '<button type="button" class="cc-landing-more">more games ↓</button>' +
        "</div>";
      // the tap counts as the game's start tap: games that read cc.autostart() skip their title screen
      card.querySelector(".cc-landing-play").addEventListener("click", function () {
        try { sessionStorage.setItem("cc-autostart", JSON.stringify({ game: g.slug, t: Date.now() })); } catch (e) {}
      });
      card.querySelector(".cc-landing-more").addEventListener("click", function () { card.remove(); off(); window.scrollTo(0, 0); });
      document.body.appendChild(card);
      root.setAttribute("data-landing-ready", "");
      try { card.querySelector(".cc-landing-play").focus({ preventScroll: true }); } catch (e) {}
    }).catch(function () { clearTimeout(safety); off(); });
  })();

  function api(path, body) {
    return fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function plays(n) { return n >= 1000 ? (Math.round(n / 100) / 10) + "k plays" : n + " plays"; }

  var stats = {}, me = null, favs = [];

  // the game's own colour on its card (games.json "theme.accent"; the same as src/util.js themeVars)
  function theme(g) {
    var a = g.theme && g.theme.accent;
    if (!a || !/^#[0-9a-f]{6}$/i.test(a)) return "";
    return ' style="--accent:' + a + ";--phosphor:" + [1, 3, 5].map(function (i) { return parseInt(a.slice(i, i + 2), 16); }).join(" ") + '"';
  }
  // the card picture: a gameplay poster (a frame of the game's clip, games.json "poster") when there is one, else the cover
  function art(g) { return g.poster || g.thumbnail; }
  function clipOf(g) { return typeof g.clip === "string" && /^\/assets\/clips\/[a-z0-9-]+\.mp4$/.test(g.clip) ? g.clip : ""; }
  var hot = {}; // the top 3 by plays this week (from /api/stats), badged "hot"
  // i: position in its grid. The first row loads straight away (it's what you see first); the rest wait until scrolled to.
  function card(g, i) {
    var tags = (g.tags || []).slice(0, 3).map(function (t) { return "<span>" + esc(t) + "</span>"; }).join("");
    var isNew = g.added && (Date.now() - Date.parse(g.added)) < 14 * 86400000;
    var s = stats[g.slug];
    var count = s && s.total > 100 ? '<span class="game-plays">' + plays(s.total) + "</span>" : "";
    var heart = me ? '<button type="button" class="cc-heart game-heart" data-game="' + esc(g.slug) + '" aria-pressed="' + (favs.indexOf(g.slug) >= 0) + '" aria-label="favorite ' + esc(g.title) + '">' + (favs.indexOf(g.slug) >= 0 ? "♥" : "♡") + "</button>" : "";
    var clip = clipOf(g), first = typeof i === "number" && i < 4;
    return '<li class="game-card" data-slug="' + esc(g.slug) + '"' + (clip ? ' data-clip="' + esc(clip) + '"' : "") + ">" + heart +
      '<a class="game-card-inner game-link"' + theme(g) + ' href="/games/' + encodeURIComponent(g.slug) + '/">' +
      '<img class="game-thumb' + (g.poster ? " is-poster" : "") + '" src="' + esc(art(g)) + '" alt="" width="640" height="400"' + (first ? "" : ' loading="lazy"') + ' decoding="async">' +
      '<span class="game-body">' +
        (isNew ? '<span class="game-new">new</span>' : "") +
        (hot[g.slug] ? '<span class="game-hot" title="one of the most played games this week">hot</span>' : "") +
        '<h3 class="game-name">' + esc(g.title) + "</h3>" +
        '<span class="game-pitch">' + esc(g.pitch) + "</span>" +
        (tags ? '<span class="game-tags">' + tags + "</span>" : "") + count +
      "</span></a></li>";
  }

  function shelf(id, title, note, list) {
    var sec = document.getElementById(id);
    if (!sec || !list.length) return;
    sec.querySelector(".shelf-head").innerHTML = esc(title) + (note ? " <small>" + esc(note) + "</small>" : "");
    sec.querySelector(".card-grid").innerHTML = list.map(card).join("");
    sec.hidden = false;
  }

  // tip jar (off until TIP_URL is a buy.stripe.com Payment Link): a plain link out, no payment here. A click is
  // counted (tip_click with its slot, via assets/deck.js → POST /api/hit); Stripe's ?tip=thanks return is a tip_success.
  function tipLine(url, slot) {
    return '<p class="cc-tip' + (slot === "hub-top" ? " cc-tip-top" : "") + '"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-tip="' + slot + '">keep the games free: tip the computer ↗</a> <small>18+ / ask a parent</small></p>';
  }
  function bindTip(el) {
    if (!el || el._ccTip) return;
    el._ccTip = true;
    el.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[data-tip]");
      if (a && window.ccHit) window.ccHit("tip_click", { slot: a.getAttribute("data-tip") });
    });
  }
  var tip = null;
  function tipUrl() {
    if (!tip) tip = fetch("/api/tip").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && typeof j.url === "string" && j.url.indexOf("https://buy.stripe.com/") === 0 ? j.url : null; })
      .catch(function () { return null; });
    return tip;
  }
  tipUrl().then(function (url) {
    if (!url) return;
    var foot = document.querySelector(".footer");
    if (foot && !foot.querySelector(".cc-tip")) { foot.insertAdjacentHTML("afterbegin", tipLine(url, "hub-footer")); bindTip(foot); }
  });

  // follow loop (assets/follow.js): the house card in the bottom slot (below every shelf, so it never pushes a
  // play button down) and a compact follow row in the footer
  if (window.ccFollow) {
    var footRow = document.querySelector(".footer");
    if (footRow && !footRow.querySelector(".cc-follow-row")) { footRow.insertAdjacentHTML("beforeend", ccFollow.row("hub-footer")); ccFollow.bind(footRow); }
  }

  var live = fetch("/api/health").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return !!(j && j.db); }).catch(function () { return false; });
  var off = function () { return Promise.resolve(null); };
  Promise.all([
    fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }),
    live.then(function (up) { return up ? api("/api/stats") : null; }),
    live.then(function (up) { return up ? api("/api/me") : null; })
  ]).then(function (res) {
    var data = res[0], st = res[1], who = res[2];
    if (st && st.ok) st.games.forEach(function (g) { stats[g.game] = g; });
    me = who && who.user;
    var chip = document.getElementById("hub-chip");
    live.then(function (up) { if (chip) chip.hidden = !up; });
    if (chip && me) { chip.textContent = me.username; chip.classList.add("is-in"); }
    return (me ? api("/api/me/summary") : Promise.resolve(null)).then(function (sum) {
      if (sum && sum.ok) favs = sum.favorites;
      render(data);
      jumpBackIn(data, sum && sum.ok ? sum : null);
    });
  }).catch(function () { /* keep the static cards */ });

  // animated thumbnails (audit P1 #18): a 3 s muted loop (games.json "clip", made by scripts/make-clips.mjs) plays over
  // the card art on hover/focus (mouse) or on the one card most in view (touch). assets/preview.js does it, for the home
  // page too: lazily, one at a time, never with reduced motion or Save-Data. Cards carry data-slug + data-clip for it.
  function clips(grid) {
    if (grid && window.ccPreview) window.ccPreview.attach(grid, ".game-card");
  }

  /* ---------- surprise me: a one-second slot machine that lands on a game, then a big play button ----------
     The hero button ([data-surprise]) and the filter bar's "surprise me" chip (assets/fx.js, which passes the games its
     filter shows) both open it. It prefers a game this device hasn't played (cc-history, kept by games/platform.js).
     Reduced motion: no spin, it just shows the pick. */
  var slotGames = [], slotLast = null, slot = null;
  var SLOT_SAY = ["the computer has spoken.", "no take-backs.", "the reel is never wrong. mostly.", "certified random. probably.", "fate picked this one, not me.", "it landed. i'm not touching it."];
  var reduceMotion = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function played() { try { return JSON.parse(localStorage.getItem("cc-history") || "{}") || {}; } catch (e) { return {}; } }
  function any(a) { return a[Math.floor(Math.random() * a.length)]; }
  function slotBuild() {
    if (slot) return slot;
    var d = document.createElement("dialog");
    d.className = "cc-slot";
    d.setAttribute("aria-labelledby", "cc-slot-h");
    d.innerHTML =
      '<div class="cc-slot-inner">' +
        '<div class="cc-slot-bar"><h2 class="cc-slot-h" id="cc-slot-h">surprise.exe</h2><button type="button" class="cc-slot-x" aria-label="close">✕</button></div>' +
        '<div class="cc-slot-win"><div class="cc-slot-reel" aria-hidden="true"><img alt="" width="320" height="180"><span class="cc-slot-name"></span></div></div>' +
        '<p class="cc-slot-say" role="status" aria-live="polite"></p>' +
        '<div class="cc-slot-row"><a class="play-btn cc-slot-go" href="/games/"></a><button type="button" class="ghost-btn cc-slot-again">spin again</button></div>' +
      "</div>";
    document.body.appendChild(d);
    d.querySelector(".cc-slot-x").addEventListener("click", function () { d.close(); });
    d.addEventListener("click", function (e) { if (e.target === d) d.close(); }); // tap outside the window
    d.querySelector(".cc-slot-again").addEventListener("click", function () { slotSpin(d._pool); });
    // the play tap counts as the game's start tap: games that read cc.autostart() skip their title screen
    d.querySelector(".cc-slot-go").addEventListener("click", function () {
      try { if (d._land) sessionStorage.setItem("cc-autostart", JSON.stringify({ game: d._land.slug, t: Date.now() })); } catch (e) {}
    });
    d.addEventListener("close", function () { clearTimeout(d._t); });
    slot = d;
    return d;
  }
  function slotShow(d, g) {
    var img = d.querySelector(".cc-slot-reel img");
    img.src = art(g);
    img.classList.toggle("is-poster", !!g.poster);
    d.querySelector(".cc-slot-name").textContent = g.title;
  }
  function slotSpin(pool) {
    var d = slotBuild();
    var list = slotGames.filter(function (g) { return !pool || pool.indexOf(g.slug) >= 0; });
    if (!list.length) list = slotGames;
    if (!list.length) return;
    var h = played(), fresh = list.filter(function (g) { return !(h[g.slug] && h[g.slug].n > 0); });
    var from = fresh.length ? fresh : list;
    if (from.length > 1) from = from.filter(function (g) { return g !== slotLast; });
    var land = any(from);
    slotLast = land; d._land = land; d._pool = pool;
    var go = d.querySelector(".cc-slot-go"), say = d.querySelector(".cc-slot-say"), again = d.querySelector(".cc-slot-again");
    go.href = "/games/" + encodeURIComponent(land.slug) + "/";
    go.textContent = "play " + land.title + " ▶";
    clearTimeout(d._t);
    function landed() {
      slotShow(d, land);
      d.classList.remove("is-spinning");
      d.classList.add("is-landed");
      say.textContent = land.title + ". " + any(SLOT_SAY) + (land.pitch ? " " + land.pitch : "");
      go.removeAttribute("aria-disabled"); go.removeAttribute("tabindex");
      again.disabled = false;
      try { go.focus({ preventScroll: true }); } catch (e) { go.focus(); }
    }
    d.classList.remove("is-landed");
    if (!d.open) { try { d.showModal(); } catch (e) { location.href = go.href; return; } }
    if (reduceMotion || list.length < 2) { landed(); return; }
    // ~1.1 s of reel: quick ticks that slow down, never the same game twice in a row, then the pick
    var steps = [45, 45, 50, 55, 60, 70, 80, 95, 115, 140, 170, 215], seq = [], prev = d._shown;
    steps.forEach(function (x, k) {
      var g = any(list), tries = 0;
      while ((g === prev || (g === land && k === steps.length - 1)) && tries++ < 12) g = any(list);
      seq.push(g); prev = g;
    });
    seq.forEach(function (g) { var im = new Image(); im.src = art(g); }); // small posters; most are cached by the grid already
    d.classList.add("is-spinning");
    go.setAttribute("aria-disabled", "true"); go.setAttribute("tabindex", "-1");
    again.disabled = true;
    say.textContent = "spinning…";
    var n = 0;
    (function tick() {
      if (!d.open) return;
      if (n >= seq.length) { landed(); return; }
      var reel = d.querySelector(".cc-slot-reel");
      slotShow(d, seq[n]); d._shown = seq[n];
      reel.classList.remove("is-tick"); void reel.offsetWidth; reel.classList.add("is-tick");
      d._t = setTimeout(tick, steps[n++]);
    })();
  }
  window.ccSurprise = { open: function (pool) { slotSpin(pool && pool.length ? pool : null); }, ready: function () { return slotGames.length > 0; } };
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-surprise]");
    if (!b || !slotGames.length) return;
    e.preventDefault();
    slotSpin(null);
  });

  function render(data) {
    var games = data.games || [];
    // featured_rank in games.json puts the hits (and a new game while it's new) first; the rest keep file order
    var ours = games.filter(function (g) { return g.made_by === "computer-cooked"; })
      .map(function (g, i) { return [g.featured_rank || 1e9, i, g]; })
      .sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    var community = games.filter(function (g) { return g.made_by === "community"; });

    // trending: most plays in the last 7 days (needs some data before it shows). Those games wear a "hot" badge everywhere.
    var trending = games.filter(function (g) { return stats[g.slug] && stats[g.slug].week >= 5; })
      .sort(function (a, b) { return stats[b.slug].week - stats[a.slug].week; }).slice(0, 3);
    hot = {};
    trending.forEach(function (g) { hot[g.slug] = true; });
    slotGames = ours.slice();
    shelf("shelf-trending", "trending this week", "", trending);
    var popular = games.filter(function (g) { return stats[g.slug] && stats[g.slug].total >= 20; })
      .sort(function (a, b) { return stats[b.slug].total - stats[a.slug].total; }).slice(0, 3);
    shelf("shelf-popular", "most played", "all time", popular);

    // just cooked (K-0050 item 5): the newest launches from the last two weeks, newest first
    var fresh = ours.filter(function (g) { return g.added && Date.now() - Date.parse(g.added) < 14 * 86400000; })
      .map(function (g, i) { return [g, i]; })
      .sort(function (a, b) { return b[0].added.localeCompare(a[0].added) || a[1] - b[1]; })
      .map(function (x) { return x[0]; }).slice(0, 6);
    shelf("shelf-new", "just cooked", "new this fortnight", fresh);
    if (fresh.length) clips(document.querySelector("#shelf-new .card-grid"));

    var mine = document.getElementById("shelf-computer-cooked");
    if (mine && ours.length) { mine.innerHTML = ours.map(card).join(""); clips(mine); }

    var cshelf = document.getElementById("shelf-community");
    if (cshelf && community.length) cshelf.insertAdjacentHTML("afterbegin", community.map(card).join(""));
    live.then(function (up) { return up ? api("/api/community") : null; }).then(function (c) {
      if (!c || !c.ok || !c.games.length || !cshelf) return;
      cshelf.insertAdjacentHTML("afterbegin", c.games.map(function (u) {
        return card({ slug: "community/" + u.slug, title: u.title, pitch: u.pitch || "", thumbnail: "/assets/logo.svg", tags: ["community"] })
          .replace('/games/community%2F' + encodeURIComponent(u.slug) + "/", "/games/community/?g=" + encodeURIComponent(u.slug));
      }).join(""));
    });

    live.then(function (up) { return up ? api("/api/challenge") : null; }).then(weekly);

    var count = document.querySelector("[data-count]");
    if (count) count.textContent = ours.length + (ours.length === 1 ? " game. more cooking." : " games");
  }

  // "jump back in": games played on this device or account, newest first, with save state.
  // A cloud save newer than this device's copy says so (it loads automatically in the game).
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? "just now" : m < 60 ? m + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago";
  }
  function localSaves() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), m = /^cc-save:([^:]+):/.exec(k || "");
        if (!m) continue;
        var o = JSON.parse(localStorage.getItem(k));
        if (o && typeof o.t === "number" && o.d !== null) out[m[1]] = Math.max(out[m[1]] || 0, o.t);
      }
    } catch (e) {}
    return out;
  }
  function jumpBackIn(data, sum) {
    var byslug = {};
    (data.games || []).forEach(function (g) { byslug[g.slug] = g; });
    var seen = {}, local = localSaves(), cloud = {};
    function touch(slug, t) { if (byslug[slug] && t) seen[slug] = Math.max(seen[slug] || 0, t); }
    try { JSON.parse(localStorage.getItem("cc-recent") || "[]").forEach(function (x) { touch(x.g, x.t); }); } catch (e) {}
    Object.keys(local).forEach(function (s) { touch(s, local[s]); });
    if (sum) {
      (sum.recent || []).forEach(function (r) { touch(r.game, r.last); });
      (sum.saves || []).forEach(function (s) { cloud[s.game] = s.updated_at; touch(s.game, s.updated_at); });
    }
    var list = Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a]; }).slice(0, 4);
    var row = document.getElementById("continue-row");
    if (!list.length || !row) return; // K-0031: "jump back in" left the hub
    row.innerHTML = list.map(function (slug) {
      var g = byslug[slug], c = cloud[slug], l = local[slug], meta, cls = "";
      if (c && (!l || c > l + 5000)) { meta = "newer save from another device · " + ago(c); cls = " is-sync"; }
      else if (c) meta = "saved to your account · " + ago(c);
      else if (l) meta = "saved on this device · " + ago(l);
      else meta = "played " + ago(seen[slug]);
      return '<li><a class="continue-card' + cls + '" href="/games/' + encodeURIComponent(slug) + '/">' +
        '<img src="' + esc(art(g)) + '" alt="" width="96" height="72" loading="lazy">' + // CSS fixes it at 72x54, object-fit cover
        '<span class="continue-body"><b>' + esc(g.title) + "</b><small>" + esc(meta) + '</small></span><span class="continue-go" aria-hidden="true">▶</span></a></li>';
    }).join("");
    document.getElementById("hub-continue").hidden = false;
  }

  // weekly challenge + seasonal event (slice D2)
  function weekly(r) {
    if (!r || !r.ok || (!r.challenge && !r.events.length)) return;
    var sec = document.getElementById("hub-weekly"), c = r.challenge;
    if (!sec) return; // K-0031: the weekly challenge left the hub
    var card = document.getElementById("weekly-card");
    if (c) {
      var days = Math.max(0, Math.ceil((Date.parse(c.ends_at) - Date.now()) / 86400000));
      document.getElementById("weekly-ends").textContent = days <= 1 ? "ends today" : "ends in " + days + " days";
      card.href = "/games/" + encodeURIComponent(c.game) + "/";
      document.getElementById("weekly-thumb").src = c.thumbnail;
      document.getElementById("weekly-title").textContent = c.title;
      document.getElementById("weekly-goal").textContent = c.goal;
      var meta = "+" + c.xp + " xp";
      if (c.done) meta = "done ✓ · " + meta;
      else if (c.best != null) meta += " · your best this week " + Math.round(c.best);
      else if (!me) meta += " · log in to earn it";
      if (c.finishers) meta += " · " + c.finishers + (c.finishers === 1 ? " player has" : " players have") + " done it";
      document.getElementById("weekly-meta").textContent = meta;
      card.classList.toggle("is-done", !!c.done);
    } else {
      card.hidden = true;
      sec.querySelector(".shelf-head").textContent = "events";
    }
    var ev = r.events[0];
    if (ev) {
      var p = document.getElementById("weekly-event");
      var until = new Date(ev.until + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toLowerCase();
      p.innerHTML = "<b>" + esc(ev.label) + " event</b> · finish any run before " + esc(until) + " for the <i>" + esc(ev.name) + "</i> badge" + (ev.got ? " · got it ✓" : " (+" + ev.xp + " xp)");
      p.hidden = false;
    }
    sec.hidden = false;
  }

  document.addEventListener("click", function (e) {
    var h = e.target.closest(".game-heart");
    if (!h) return;
    e.preventDefault();
    var on = h.getAttribute("aria-pressed") !== "true";
    document.querySelectorAll('.game-heart[data-game="' + h.dataset.game + '"]').forEach(function (x) {
      x.setAttribute("aria-pressed", String(on)); x.textContent = on ? "♥" : "♡";
    });
    api("/api/me/favorite", { game: h.dataset.game, on: on });
  });
})();
