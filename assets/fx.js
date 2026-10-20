/* Presentation-only effects for /games pages: card tilt, the hub ticker, spotlight rotation,
   "new" badges, today's dailies, the player "booting" screen, "play next", challenge links and
   brag cards. Reads games.json, plus /api/featured (game of the week) for the spotlight.
   Nothing is sent anywhere.
   Everything here is optional polish; pages work fine if this never runs. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var DAILY = { fathom: "daily dive", "handbag-havoc": "daily garden", "desktop-jam": "daily desktop" };
  var SPOT_MAX = 6;
  var NEW_COUNT = 4; // newest N games (end of games.json, never CRASH) get a "new" badge
  /* hub filter chips. A game lands in a vibe if any of its tags match; games without tags
     use FALLBACK until they get tags in games.json. */
  var VIBES = [
    { id: "arcade", label: "arcade", tags: ["arcade", "dodge", "runner", "obby", "platformer", "reflex", "action", "shooter"] },
    { id: "puzzle", label: "puzzle", tags: ["puzzle", "arrow puzzle", "tic tac toe", "strategy", "logic", "word"] },
    { id: "chill", label: "chill", tags: ["casual", "idle", "clicker", "cozy", "chill", "relaxing"] },
    { id: "quick", label: "60s or less", tags: ["short", "60s runs", "challenge", "one-thumb", "quick"] },
    { id: "rage", label: "rage", tags: ["rage", "trick", "hard", "funny"] }
  ];
  var FALLBACK = { "tab-hoarder": ["arcade", "quick"], bellchain: ["chill"], "handbag-havoc": ["arcade"], fathom: ["puzzle"] };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; }

  /* ---------- card tilt + sheen ---------- */
  if (finePointer && !reduceMotion) {
    document.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".game-card");
      if (!card) return;
      var r = card.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width;
      var y = (e.clientY - r.top) / r.height;
      card.classList.add("is-tilting");
      card.style.setProperty("--ry", ((x - 0.5) * 10).toFixed(2) + "deg");
      card.style.setProperty("--rx", ((0.5 - y) * 8).toFixed(2) + "deg");
      card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
      card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
    }, { passive: true });
    document.addEventListener("pointerout", function (e) {
      var card = e.target.closest && e.target.closest(".game-card");
      if (!card || card.contains(e.relatedTarget)) return;
      card.classList.remove("is-tilting");
      card.style.removeProperty("--rx");
      card.style.removeProperty("--ry");
    });
  }

  /* ---------- player page bits that need no data ---------- */
  var player = document.getElementById("player");
  var slugMatch = location.pathname.match(/^\/games\/([a-z0-9-]+)\/?$/);
  var here = player && slugMatch ? slugMatch[1] : null;

  var frame = document.getElementById("game-frame");
  var stage = frame && frame.closest(".player-stage");
  if (stage) {
    var ready = function () { stage.classList.add("is-ready"); };
    frame.addEventListener("load", ready);
    try {
      if (frame.contentDocument && frame.contentDocument.readyState === "complete" &&
          frame.contentDocument.location.href !== "about:blank") ready();
    } catch (e) { ready(); }
  }

  if (here) challengeBanner();

  /* ---------- everything that needs the game list ---------- */
  var hub = document.querySelector(".games-hero");
  var needData = hub || here || document.querySelector("[data-more-games]");
  if (!needData) return;

  fetch("/games/games.json")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) {
      var all = data.games || [];
      var games = all.filter(function (g) { return g.made_by === "computer-cooked"; });
      if (!games.length) return;
      var bySlug = {};
      games.forEach(function (g) { bySlug[g.slug] = g; });
      var newest = games.filter(function (g) { return g.slug !== "crash"; }).slice(-NEW_COUNT).reverse();
      var isNew = {};
      newest.forEach(function (g) { isNew[g.slug] = true; });

      if (hub) {
        ticker(games, isNew);
        spotlight(games, newest);
        hubStrip(games, bySlug);
        badges(isNew);
        filters(games, isNew);
        previews();
        cup(games);
      }
      if (here) {
        moreGames(games, here);
        bragTool(bySlug[here] || { slug: here, title: (player.dataset.title || here) });
      }
    })
    .catch(function () { /* keep the static markup */ });

  function ticker(games, isNew) {
    var track = document.querySelector(".ticker-track");
    if (!track) return;
    var names = games.map(function (g) {
      return "<span" + (isNew[g.slug] ? ' class="is-new"' : "") + ">" + esc(g.title) + "</span>";
    }).join("") + "<span>more cooking</span>";
    track.innerHTML = names + names;
  }

  /* hub cards are re-rendered by hub.js; badge them whenever that happens */
  function badges(isNew) {
    var shelves = document.querySelectorAll(".card-grid");
    function apply() {
      document.querySelectorAll(".game-card").forEach(function (card) {
        var slug = slugOfCard(card);
        if (!slug) return;
        var body = card.querySelector(".game-body");
        var badge = card.querySelector(".game-new");
        // hub.js badges by "added" date; when a whole batch shares a date that tags everything,
        // so the badge stays on the newest few only
        if (badge && !isNew[slug]) badge.remove();
        if (isNew[slug] && body && !card.querySelector(".game-new")) {
          body.insertAdjacentHTML("afterbegin", '<span class="game-new">new</span>');
        }
      });
    }
    apply();
    var mo = new MutationObserver(apply);
    shelves.forEach(function (s) { mo.observe(s, { childList: true }); });
  }

  /* featured spotlight: the game of the week first (/api/featured, picked from the metrics; CRASH if
     that's unavailable within 1.5 s, which is also the static LCP image), then the newest games */
  function spotlight(games, newest) {
    var spot = document.querySelector(".spotlight");
    if (!spot) return;
    var feat = fetch("/api/featured").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && j.ok ? j.featured : null; }).catch(function () { return null; });
    Promise.race([feat, new Promise(function (r) { setTimeout(function () { r(null); }, 1500); })])
      .then(function (f) { rotate(spot, games, newest, f); });
  }
  function rotate(spot, games, newest, feat) {
    var img = spot.querySelector(".spot-screen img");
    var name = spot.querySelector(".spot-name");
    var pitch = spot.querySelector(".spot-pitch");
    var tag = spot.querySelector(".spot-tag");
    var lead = (feat && games.filter(function (g) { return g.slug === feat.game; })[0]) || games.filter(function (g) { return g.slug === "crash"; })[0];
    var order = (lead ? [lead] : []).concat(newest.filter(function (g) { return g !== lead; })).concat(games.filter(function (g) {
      return g !== lead && newest.indexOf(g) < 0;
    }));
    order = order.slice(0, SPOT_MAX); // a dot per game gets long on phones past ~6
    if (feat && lead && lead.slug === feat.game) {
      var cta = document.querySelector(".hero-play");
      if (cta) { cta.href = "/games/" + encodeURIComponent(lead.slug) + "/"; cta.textContent = "play " + lead.title + " ▶"; }
    }
    if (order.length < 2) return;

    var dots = el('<div class="spot-dots" role="group" aria-label="featured games"></div>');
    order.forEach(function (g, i) {
      var b = el('<button type="button" class="spot-dot"><span class="visually-hidden"></span></button>');
      b.querySelector("span").textContent = "feature " + g.title;
      b.addEventListener("click", function () { stop(); show(i); });
      dots.appendChild(b);
    });
    spot.insertAdjacentElement("afterend", dots);

    var cur = 0, timer = null, held = false;
    function show(i) {
      cur = (i + order.length) % order.length;
      var g = order[cur];
      spot.classList.add("is-swapping");
      setTimeout(function () {
        img.src = g.thumbnail;
        img.classList.toggle("is-svg", /\.svg$/.test(g.thumbnail));
        name.textContent = g.title;
        pitch.textContent = g.pitch;
        tag.textContent = cur === 0 ? (feat && g.slug === feat.game ? "game of the week" : "featured") : (newest.indexOf(g) >= 0 ? "new" : "featured");
        spot.href = "/games/" + encodeURIComponent(g.slug) + "/";
        spot.setAttribute("aria-label", "featured game: " + g.title + ". " + g.pitch);
        spot.classList.remove("is-swapping");
      }, reduceMotion ? 0 : 220);
      dots.querySelectorAll(".spot-dot").forEach(function (d, j) { d.setAttribute("aria-pressed", String(j === cur)); });
    }
    function tick() { if (!held && !document.hidden) show(cur + 1); }
    function stop() { clearInterval(timer); timer = null; }
    [spot, dots].forEach(function (n) {
      n.addEventListener("pointerenter", function () { held = true; });
      n.addEventListener("pointerleave", function () { held = false; });
      n.addEventListener("focusin", function () { held = true; });
      n.addEventListener("focusout", function () { held = false; });
    });
    show(0);
    if (!reduceMotion) timer = setInterval(tick, 5200);
  }

  /* today's dailies, injected under the ticker */
  function hubStrip(games, bySlug) {
    var anchor = document.querySelector(".ticker") || hub;
    var today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
    var dailies = games.filter(function (g) { return DAILY[g.slug] || (g.tags || []).indexOf("daily") >= 0; });
    if (!dailies.length) return; // "continue playing" lives in games/hub.js ("jump back in": this device + account + saves)

    var html = '<div class="hub-strip">';
    if (dailies.length) {
      html += '<section class="strip-box dailies" aria-labelledby="dailies-heading">' +
        '<h2 class="strip-head" id="dailies-heading">today\'s dailies <small>' + esc(today) + "</small></h2>" +
        '<ul class="daily-list">' + dailies.map(function (g) {
          return '<li><a class="daily" href="/games/' + encodeURIComponent(g.slug) + '/">' +
            '<img src="' + esc(g.thumbnail) + '" alt="" width="64" height="36" loading="lazy" decoding="async">' +
            '<span class="daily-name">' + esc(g.title) + "</span>" +
            '<span class="daily-mode">' + esc(DAILY[g.slug] || "daily") + "</span>" +
            '<span class="daily-go" aria-hidden="true">▶</span></a></li>';
        }).join("") + "</ul><p class=\"strip-note\">same puzzle for everyone today. new one at midnight.</p></section>";
    }
    html += "</div>";
    anchor.insertAdjacentHTML("afterend", html);
  }

  function moreGames(games, slug) {
    var more = document.querySelector("[data-more-games]");
    if (!more) return;
    var pick = games.filter(function (g) { return g.slug !== slug; }).slice(-3).reverse();
    var list = more.querySelector("ul");
    if (!pick.length || !list) return;
    list.innerHTML = pick.map(function (g) {
      return '<li class="game-card"><div class="game-card-inner">' +
        '<img class="game-thumb" src="' + esc(g.thumbnail) + '" alt="" width="640" height="360" loading="lazy" decoding="async">' +
        '<div class="game-body"><h3 class="game-name">' + esc(g.title) + "</h3>" +
        '<p class="game-pitch">' + esc(g.pitch) + "</p>" +
        '<a class="play-btn" href="/games/' + encodeURIComponent(g.slug) + '/" aria-label="play ' + esc(g.title) + '">play ▶</a>' +
        "</div></div></li>";
    }).join("");
    more.hidden = false;
  }

  /* ---------- hub filters + search (scales the grid past 15-20 games) ---------- */
  function vibesOf(g) {
    var tags = (g.tags || []).map(function (t) { return String(t).toLowerCase(); });
    var out = VIBES.filter(function (v) { return v.tags.some(function (t) { return tags.indexOf(t) >= 0; }); })
      .map(function (v) { return v.id; });
    if (!out.length && FALLBACK[g.slug]) out = FALLBACK[g.slug].slice();
    if (DAILY[g.slug] || tags.indexOf("daily") >= 0) out.push("daily");
    return out;
  }

  function slugOfCard(card) {
    var a = card.querySelector(".play-btn");
    var m = a && (a.getAttribute("href") || "").match(/^\/games\/([a-z0-9-]+)\/$/);
    return m ? m[1] : null;
  }

  function filters(games, isNew) {
    var grid = document.getElementById("shelf-computer-cooked");
    if (!grid || games.length < 6) return;
    var meta = {};
    games.forEach(function (g) {
      meta[g.slug] = {
        vibes: vibesOf(g).concat(isNew[g.slug] ? ["new"] : []),
        text: [g.title, g.pitch, (g.tags || []).join(" ")].join(" ").toLowerCase()
      };
    });
    var chips = [{ id: "all", label: "all" }, { id: "new", label: "new" }].concat(VIBES, [{ id: "daily", label: "daily" }])
      .filter(function (c) {
        return c.id === "all" || games.some(function (g) { return meta[g.slug].vibes.indexOf(c.id) >= 0; });
      });

    var bar = el('<div class="hub-filters">' +
      '<label class="hub-search"><span class="visually-hidden">search games</span>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M15.5 15.5L21 21" stroke="currentColor" stroke-width="2.4"/></svg>' +
      '<input type="search" autocomplete="off" spellcheck="false" enterkeyhint="search"></label>' +
      '<div class="chip-row" role="group" aria-label="filter by vibe"></div>' +
      '<p class="hub-empty" hidden>nothing matches. the computer looked everywhere. <button type="button" class="hub-reset">show all</button></p>' +
      '<p class="visually-hidden" role="status" aria-live="polite"></p></div>');
    var q = bar.querySelector("input");
    q.placeholder = "search " + games.length + " games";
    var row = bar.querySelector(".chip-row");
    chips.forEach(function (c) {
      var b = el('<button type="button" class="chip"></button>');
      b.textContent = c.label;
      b.dataset.vibe = c.id;
      b.setAttribute("aria-pressed", String(c.id === "all"));
      row.appendChild(b);
    });
    var section = grid.closest(".shelf");
    section.querySelector(".shelf-head").insertAdjacentElement("afterend", bar);

    var empty = bar.querySelector(".hub-empty");
    var live = bar.querySelector('[role="status"]');
    var vibe = "all";

    function apply() {
      var term = q.value.trim().toLowerCase();
      var shown = 0;
      grid.querySelectorAll(".game-card").forEach(function (card) {
        var slug = slugOfCard(card);
        var info = slug && meta[slug];
        var ok = !info || ((vibe === "all" || info.vibes.indexOf(vibe) >= 0) && (!term || info.text.indexOf(term) >= 0));
        card.hidden = !ok;
        if (ok) shown++;
      });
      empty.hidden = shown > 0;
      live.textContent = (vibe === "all" && !term) ? "" : shown + (shown === 1 ? " game" : " games");
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      vibe = b.dataset.vibe;
      row.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      apply();
    });
    q.addEventListener("input", apply);
    bar.querySelector(".hub-reset").addEventListener("click", function () {
      q.value = ""; vibe = "all";
      row.querySelectorAll(".chip").forEach(function (x) { x.setAttribute("aria-pressed", String(x.dataset.vibe === "all")); });
      apply(); q.focus();
    });
    new MutationObserver(apply).observe(grid, { childList: true });
    apply();
  }

  /* ---------- live previews: hover a card (desktop) and the game's attract screen plays in it ----------
     Fine pointers only, after a short dwell, one at a time, muted, no input, removed on leave.
     Inside the hub the SDK has no player page to relay to, so previews never count as plays. */
  function previews() {
    if (!finePointer || reduceMotion || (navigator.connection && navigator.connection.saveData)) return;
    var timer = null, current = null;
    function stop() {
      clearTimeout(timer);
      if (current) {
        var f = current.querySelector(".card-preview");
        if (f) f.remove();
        current.classList.remove("is-previewing");
        current = null;
      }
    }
    document.addEventListener("pointerover", function (e) {
      var card = e.target.closest && e.target.closest(".game-card");
      if (card === current) return;
      stop();
      if (!card) return;
      var slug = slugOfCard(card);
      var thumb = card.querySelector(".game-thumb");
      if (!slug || !thumb || slug === "crash") return; // CRASH runs inline on its page, its svg thumb is already animated
      current = card;
      timer = setTimeout(function () {
        var box = el('<div class="card-preview" aria-hidden="true"><iframe tabindex="-1" title="" loading="eager"></iframe><span class="preview-tag">live preview</span></div>');
        var f = box.querySelector("iframe");
        f.src = "/games/" + slug + "/play/";
        f.addEventListener("load", function () {
          try { f.contentWindow.postMessage({ type: "cc-mute", muted: true }, location.origin); } catch (err) {}
          box.classList.add("is-live");
        });
        thumb.insertAdjacentElement("afterend", box);
        card.classList.add("is-previewing");
      }, 700);
    });
    document.addEventListener("pointerout", function (e) {
      if (current && !current.contains(e.relatedTarget)) stop();
    });
    window.addEventListener("blur", stop);
  }

  /* ---------- cooked cup: one game per week, top 5 from the weekly leaderboard ----------
     Only shows when the platform database is live and a game has a board. */
  function cup(games) {
    var boards = games.filter(function (g) { return g.max_score_per_sec || g.max_score; });
    if (!boards.length) return;
    fetch("/api/health").then(function (r) { return r.ok ? r.json() : null; }).then(function (h) {
      if (!h || !h.db) return;
      var week = Math.floor((Date.now() / 86400000 + 3) / 7); // weeks since 1970, monday to sunday
      var g = boards[week % boards.length];
      return fetch("/api/leaderboard?game=" + encodeURIComponent(g.slug) + "&period=week", { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (lb) { if (lb && lb.ok) renderCup(g, lb.rows || []); });
    }).catch(function () {});
  }

  function renderCup(g, rows) {
    var anchor = document.querySelector(".hub-strip") || document.querySelector(".ticker");
    if (!anchor) return;
    var top = rows.slice(0, 5);
    var html = '<section class="cup" aria-labelledby="cup-heading">' +
      '<div class="cup-copy"><p class="cup-eyebrow">this week</p>' +
      '<h2 class="cup-title" id="cup-heading">the cooked cup</h2>' +
      '<p class="cup-game">game: <b>' + esc(g.title) + '</b>. best score by sunday night gets the crown and a shoutout on <a href="https://www.tiktok.com/@computercooked" target="_blank" rel="noopener">tiktok</a>.</p>' +
      '<a class="play-btn cup-play" href="/games/' + encodeURIComponent(g.slug) + '/">enter the cup ▶</a></div>' +
      '<ol class="cup-board">' + (top.length ? top.map(function (r) {
        return '<li class="' + (r.rank === 1 ? "is-king" : "") + (r.me ? " is-me" : "") + '">' +
          '<span class="cup-rank">' + (r.rank === 1 ? '<span aria-hidden="true">👑</span><span class="visually-hidden">1</span>' : esc(r.rank)) + "</span>" +
          '<span class="cup-name">' + esc(r.name) + (r.me ? " (you)" : "") + '</span><span class="cup-score">' + esc(r.score) + "</span></li>";
      }).join("") : '<li class="cup-empty">no scores yet this week. the crown is just sitting there.</li>') + "</ol></section>";
    anchor.insertAdjacentHTML("afterend", html);
  }

  /* ---------- challenge links: ?beat=47s shows a dare above the game ---------- */
  function cleanScore(s) {
    return String(s || "").toLowerCase().replace(/[^0-9a-z.,:%/ ]/g, "").replace(/\s+/g, " ").trim().slice(0, 12);
  }

  function challengeBanner() {
    var q = new URLSearchParams(location.search);
    if (q.get("d") || q.get("vs")) return; // challenge-a-friend links: games/platform.js shows those
    var beat = cleanScore(q.get("beat"));
    if (!beat || !/[0-9]/.test(beat)) return;
    var layout = document.querySelector(".player-layout");
    if (!layout) return;
    var b = el('<div class="dare" role="note"><span class="dare-tag">challenge</span>' +
      '<span class="dare-text">someone got <b></b> and bet you can\'t beat it.</span>' +
      '<button type="button" class="dare-x" aria-label="dismiss challenge">✕</button></div>');
    b.querySelector("b").textContent = beat;
    b.querySelector(".dare-x").addEventListener("click", function () { b.remove(); });
    layout.insertAdjacentElement("beforebegin", b);
  }

  /* ---------- brag card: a 1080x1920 story image + a challenge link ---------- */
  function bragTool(game) {
    var bar = document.querySelector(".player-bar");
    var share = document.getElementById("btn-share");
    if (!bar || !share || !window.HTMLCanvasElement || !window.HTMLDialogElement) return;

    var btn = el('<button class="tool tool-brag" type="button" aria-haspopup="dialog">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v4a5 5 0 0 1-10 0z M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8l-1-4H9z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
      '<span class="tool-text">brag</span></button>');
    btn.setAttribute("aria-label", "make a brag card");
    share.insertAdjacentElement("beforebegin", btn);

    var dlg = el('<dialog class="brag" aria-labelledby="brag-title">' +
      '<form method="dialog" class="brag-inner">' +
        '<div class="brag-head"><h2 id="brag-title">brag card</h2><button class="brag-x" value="close" aria-label="close">esc</button></div>' +
        '<label class="brag-label" for="brag-score">your score <small>(optional, e.g. 47s or 1,200)</small></label>' +
        '<input class="brag-input" id="brag-score" maxlength="12" autocomplete="off" inputmode="text" placeholder="47s">' +
        '<div class="brag-preview"><canvas width="1080" height="1920" aria-label="brag card preview"></canvas></div>' +
        '<div class="brag-actions">' +
          '<button type="button" class="ov-btn brag-save">save image ↓</button>' +
          '<button type="button" class="ov-btn ghost brag-link">copy dare link</button>' +
        "</div>" +
        '<p class="brag-say" role="status" aria-live="polite"></p>' +
      "</form></dialog>");
    document.body.appendChild(dlg);

    var cv = dlg.querySelector("canvas");
    var input = dlg.querySelector(".brag-input");
    var say = dlg.querySelector(".brag-say");
    var logo = new Image();
    logo.src = "/assets/logo.svg";
    var thumb = new Image();
    thumb.src = game.thumbnail || "";
    logo.onload = thumb.onload = function () { draw(); };

    function url(score) {
      var u = "https://computercooked.com/games/" + game.slug + "/";
      return score ? u + "?beat=" + encodeURIComponent(score) : u;
    }

    function fit(ctx, text, max, size) {
      ctx.font = "800 " + size + "px 'JetBrains Mono', monospace";
      while (ctx.measureText(text).width > max && size > 40) { size -= 4; ctx.font = "800 " + size + "px 'JetBrains Mono', monospace"; }
      return size;
    }

    function draw() {
      var score = cleanScore(input.value);
      var c = cv.getContext("2d"), W = 1080, H = 1920;
      c.fillStyle = "#101114"; c.fillRect(0, 0, W, H);
      var g1 = c.createRadialGradient(W * 0.2, 0, 0, W * 0.2, 0, 1100);
      g1.addColorStop(0, "rgba(197,255,73,0.22)"); g1.addColorStop(1, "rgba(197,255,73,0)");
      c.fillStyle = g1; c.fillRect(0, 0, W, H);
      var g2 = c.createRadialGradient(W, H, 0, W, H, 1000);
      g2.addColorStop(0, "rgba(181,154,255,0.2)"); g2.addColorStop(1, "rgba(181,154,255,0)");
      c.fillStyle = g2; c.fillRect(0, 0, W, H);

      c.textBaseline = "alphabetic";
      if (logo.complete && logo.naturalWidth) c.drawImage(logo, 90, 120, 150, 150);
      c.fillStyle = "#B59AFF";
      c.font = "800 40px 'JetBrains Mono', monospace";
      c.fillText("computer cooked games", 270, 210);

      // game screen
      var sx = 90, sy = 380, sw = 900, sh = 506;
      c.fillStyle = "#1d1f25"; roundRect(c, sx - 24, sy - 24, sw + 48, sh + 48, 44); c.fill();
      c.save(); roundRect(c, sx, sy, sw, sh, 24); c.clip();
      c.fillStyle = "#07080a"; c.fillRect(sx, sy, sw, sh);
      if (thumb.complete && thumb.naturalWidth) {
        var r = Math.max(sw / thumb.naturalWidth, sh / thumb.naturalHeight);
        if (/\.svg$/.test(thumb.src)) r = Math.min(sw / thumb.naturalWidth, sh / thumb.naturalHeight);
        var tw = thumb.naturalWidth * r, th = thumb.naturalHeight * r;
        c.drawImage(thumb, sx + (sw - tw) / 2, sy + (sh - th) / 2, tw, th);
      }
      c.fillStyle = "rgba(0,0,0,0.18)";
      for (var y = sy; y < sy + sh; y += 6) c.fillRect(sx, y, sw, 2);
      c.restore();

      // words
      c.fillStyle = "#F5F3ED";
      c.font = "800 58px 'JetBrains Mono', monospace";
      c.fillText(score ? "i got" : "i got cooked playing", 90, 1060);
      var big = score || game.title;
      var size = fit(c, big, 900, score ? 220 : 150);
      c.fillStyle = "#C5FF49";
      c.shadowColor = "rgba(181,154,255,0.8)"; c.shadowOffsetX = 8;
      c.fillText(big, 90, 1060 + size + 10);
      c.shadowColor = "transparent"; c.shadowOffsetX = 0;
      var below = 1060 + size + 110;
      c.fillStyle = "#F5F3ED";
      c.font = "800 58px 'JetBrains Mono', monospace";
      if (score) { fit(c, "in " + game.title + ".", 900, 58); c.fillText("in " + game.title + ".", 90, below); below += 90; }
      c.fillStyle = "#b9b7b0";
      c.font = "800 50px 'JetBrains Mono', monospace";
      c.fillText("bet you can't beat it.", 90, below);

      // url pill
      c.fillStyle = "#C5FF49"; roundRect(c, 90, 1680, 900, 120, 28); c.fill();
      c.fillStyle = "#101114";
      fit(c, "computercooked.com/games", 820, 52);
      c.fillText("computercooked.com/games", 130, 1758);
    }

    function roundRect(c, x, y, w, h, r) {
      c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
    }

    btn.addEventListener("click", function () {
      document.dispatchEvent(new CustomEvent("cc:deck-open")); // pauses the game, same as the command bar
      say.textContent = "";
      dlg.showModal();
      (document.fonts && document.fonts.load ? document.fonts.load("800 40px 'JetBrains Mono'") : Promise.resolve()).then(draw, draw);
      input.focus();
    });
    input.addEventListener("input", draw);
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });

    dlg.querySelector(".brag-save").addEventListener("click", function () {
      draw();
      cv.toBlob(function (blob) {
        if (!blob) return;
        var name = "computer-cooked-" + game.slug + ".png";
        var file = window.File ? new File([blob], name, { type: "image/png" }) : null;
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], text: "bet you can't beat it. " + url(cleanScore(input.value)) }).catch(function () {});
          return;
        }
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        say.textContent = "saved. post it, tag @computercooked.";
      }, "image/png");
    });

    dlg.querySelector(".brag-link").addEventListener("click", function () {
      var text = "bet you can't beat me at " + game.title + ". " + url(cleanScore(input.value));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say.textContent = "dare link copied. send it to someone who thinks they're good."; },
          function () { say.textContent = url(cleanScore(input.value)); });
      } else say.textContent = url(cleanScore(input.value));
    });
  }
})();
