/* Player shell for games that run in an iframe (/games/<slug>/play/).
   Drives the game with postMessage: {type:"cc-mute", muted} and {type:"cc-restart"}.
   The page sets data-title / data-share on #player. */
(function () {
  "use strict";

  var player = document.getElementById("player");
  var frame = document.getElementById("game-frame");
  var btnMute = document.getElementById("btn-mute");
  var toastEl = document.getElementById("toast");
  if (!player || !frame) return;

  var title = player.dataset.title || "this game";
  var url = player.dataset.url || location.href;

  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  var muted = load("cc-games-muted", "0") === "1";

  function send(msg) {
    try { frame.contentWindow.postMessage(msg, location.origin); } catch (e) {}
  }

  function setMuted(m) {
    muted = m;
    save("cc-games-muted", m ? "1" : "0");
    btnMute.setAttribute("aria-pressed", String(m));
    btnMute.querySelector(".tool-text").textContent = m ? "sound off" : "sound on";
    btnMute.querySelector(".ico-on").style.display = m ? "none" : "";
    btnMute.querySelector(".ico-off").style.display = m ? "" : "none";
    send({ type: "cc-mute", muted: m });
  }

  // phones: the bottom nav slides away while a run is going (it took a big share of the screen) and comes back when
  // the run ends or the game is scrolled off screen. The CSS is assets/deck.css .cc-playing.
  var root = document.documentElement, running = false, onScreen = true;
  function syncDeck() { root.classList.toggle("cc-playing", running && onScreen); }
  function playing(on) { running = on; syncDeck(); }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { onScreen = es[0].intersectionRatio >= 0.5; syncDeck(); }, { threshold: [0, 0.5, 1] }).observe(player);
  }

  frame.addEventListener("load", function () { send({ type: "cc-mute", muted: muted }); });
  btnMute.addEventListener("click", function () { setMuted(!muted); });
  document.getElementById("btn-restart").addEventListener("click", function () {
    send({ type: "cc-restart" });
    frame.focus();
  });

  // messages queue up (score rank, +xp, level up, achievements) instead of replacing each other
  var toastQ = [];
  function toast(msg) {
    if (toastQ.length < 5) toastQ.push(msg);
    if (!toast.t) nextToast();
  }
  function nextToast() {
    var msg = toastQ.shift();
    if (msg == null) { toastEl.classList.remove("show"); toast.t = null; return; }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    toast.t = setTimeout(nextToast, 2200);
  }
  document.getElementById("btn-share").addEventListener("click", function () {
    var text = "play " + title + " on computer cooked games.";
    if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () {}); return; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text + " " + url).then(function () { toast("link copied."); }, function () { toast(url); });
    } else toast(url);
  });

  var btnFs = document.getElementById("btn-fs");
  // One click in, one click out, whatever happened before: the button reads the real state each time, and a
  // leftover fallback ("is-pseudo-fs", used when the browser refuses real fullscreen) never eats a click.
  // In real fullscreen, Esc is locked to the game where the browser allows it (Chrome: Keyboard Lock), so games
  // that use Esc (smol brains) get it; holding Esc still leaves fullscreen.
  // in fullscreen the browser's own bar is gone, so this button turns into a labelled "exit fullscreen" (K-0023)
  function fsLabel(on) {
    btnFs.setAttribute("aria-pressed", String(on));
    btnFs.setAttribute("aria-label", on ? "exit fullscreen" : "fullscreen");
    btnFs.classList.toggle("is-exit", on);
    btnFs.querySelector(".tool-text").textContent = on ? "exit fullscreen" : "fullscreen";
  }
  function pseudoFs(on) {
    player.classList.toggle("is-pseudo-fs", on);
    document.body.style.overflow = on ? "hidden" : "";
    fsLabel(on);
  }
  btnFs.addEventListener("click", function () {
    if (document.fullscreenElement) { document.exitFullscreen().catch(function () {}); return; }
    if (player.classList.contains("is-pseudo-fs")) { pseudoFs(false); return; }
    if (!document.fullscreenEnabled || !player.requestFullscreen) { pseudoFs(true); return; }
    player.requestFullscreen().then(function () {
      if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(["Escape"]).then(function () { toast("hold esc (or tap exit fullscreen) to leave"); }, function () {});
      var f = document.getElementById("game-frame");
      if (f && f.contentWindow) try { f.contentWindow.focus(); } catch (e) {}
    }, function () { pseudoFs(true); });
  });
  var toastHome = toastEl.parentNode;
  document.addEventListener("fullscreenchange", function () {
    fsLabel(!!document.fullscreenElement);
    // only the fullscreen element is drawn, so the toast moves in with it (K-0028: the "hold esc" hint never showed)
    if (document.fullscreenElement === player) player.appendChild(toastEl); else if (toastEl.parentNode !== toastHome) toastHome.appendChild(toastEl);
    if (!document.fullscreenElement && navigator.keyboard && navigator.keyboard.unlock) navigator.keyboard.unlock();
  });
  document.addEventListener("cc:deck-open", function () { send({ type: "cc-pause" }); });
  window.ccToast = toast;

  /* Mini player: scroll down past the game (to the scores, the how-to, more games) and the cabinet shrinks into the
     bottom right corner, still running, so you can keep an eye on it. Click it to go back up; the x sends it away until
     you scroll back to the game. Only the styles change (.player.is-mini in games.css), so the game never reloads; a
     same-height stand-in (.player-ghost) keeps the page from jumping. Wide screens only, and never in fullscreen. */
  (function () {
    if (!window.matchMedia) return;
    var wide = matchMedia("(min-width: 760px)"), ghost = null, sent = false, queued = false, stageH = 0;
    var stage = player.querySelector(".player-stage");
    var back = document.createElement("button"); back.type = "button"; back.className = "mini-back"; back.hidden = true;
    back.innerHTML = '<span>back to the game \u2191</span>';
    var x = document.createElement("button"); x.type = "button"; x.className = "mini-x"; x.hidden = true; x.textContent = "\u00d7"; x.setAttribute("aria-label", "close the mini player");
    player.appendChild(back); player.appendChild(x);
    function dock(on) {
      if (on === !!ghost) return;
      if (on) {
        ghost = document.createElement("div"); ghost.className = "player-ghost"; ghost.style.height = player.offsetHeight + "px";
        player.parentNode.insertBefore(ghost, player);
      } else { ghost.remove(); ghost = null; }
      player.classList.toggle("is-mini", on); back.hidden = x.hidden = !on;
    }
    function check() {
      queued = false;
      if (!ghost) stageH = stage.offsetHeight;
      var r = (ghost || player).getBoundingClientRect(), gone = r.top + stageH - 60 < stageH * 0.25; // under a quarter of the screen still shows below the site nav
      if (!gone) sent = false; // back at the game: the x no longer counts
      dock(gone && !sent && wide.matches && !document.fullscreenElement && !player.classList.contains("is-pseudo-fs") && !!frame.src);
    }
    function soon() { if (!queued) { queued = true; setTimeout(check, 80); } }
    window.addEventListener("scroll", soon, { passive: true });
    window.addEventListener("resize", soon);
    document.addEventListener("fullscreenchange", soon);
    back.addEventListener("click", function () {
      if (!ghost) return;
      var top = ghost.getBoundingClientRect().top + window.pageYOffset - 80;
      sent = true; dock(false); // stays undocked on the way up; cleared once the game is back in view
      window.scrollTo({ top: Math.max(0, top), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      frame.focus({ preventScroll: true });
    });
    x.addEventListener("click", function () { sent = true; dock(false); });
  })();

  /* Play time: the seconds a run is actually going with the tab showing are added up per game on this device
     (localStorage "cc-time": {slug: seconds}). The about card shows "you've played this for 12 min", a toast marks
     10 minutes, 30 minutes and an hour, and the command bar's "time played" (assets/deck.js) reads the totals.
     Nothing is sent. */
  (function () {
    var m = /\/games\/([a-z0-9-]+)\//.exec(location.pathname);
    if (!m) return;
    var slug = m[1], add = 0, card = document.querySelector(".about-card.how-to, [data-how-to]") /* the worker moves the about card under the game (src/seo.js) */, line = null;
    function read() { try { var v = JSON.parse(localStorage.getItem("cc-time")); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } }
    var total = Math.max(0, Math.floor(+read()[slug]) || 0);
    function fmt(s) { var mins = Math.floor(s / 60), h = Math.floor(mins / 60); return h ? h + " h " + (mins % 60) + " min" : mins + " min"; }
    function show() {
      if (total < 60 || !card) return;
      if (!line) { line = document.createElement("p"); line.className = "play-time"; card.appendChild(line); }
      line.textContent = "you've played this for " + fmt(total) + ".";
    }
    function flush() { // another tab may have added time too, so add to what is stored now
      if (!add) return;
      var all = read(); all[slug] = Math.max(0, Math.floor(+all[slug]) || 0) + add; add = 0;
      save("cc-time", JSON.stringify(all));
    }
    var MARKS = { 600: "ten minutes on " + title + ". the computer noticed.", 1800: "half an hour on " + title + ". respect.", 3600: "one hour on " + title + ". are you okay? (keep going.)" };
    setInterval(function () {
      if (!running || document.hidden) return;
      add++; total++;
      if (total % 60 === 0) show();
      if (MARKS[total]) toast(MARKS[total]);
      if (add >= 15) flush();
    }, 1000);
    document.addEventListener("visibilitychange", function () { if (document.hidden) flush(); });
    window.addEventListener("pagehide", flush);
    show();
  })();

  /* Lights off: a lamp button next to fullscreen dims everything on the page except the game (html.lights-off, styled
     in games.css). The veil lets clicks through, so the rest of the page still works, just in the dark. Esc or the button turns
     them back on. The choice is kept on this device (localStorage "cc-lights") so it carries from game to game. */
  (function () {
    var root = document.documentElement, b = document.createElement("button");
    b.className = "tool"; b.id = "btn-lights"; b.type = "button";
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-4 10.5c.8.8 1.2 1.6 1.3 2.5h5.4c.1-.9.5-1.7 1.3-2.5A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg><span class="tool-text">lights</span>';
    function set(on, quiet) {
      root.classList.toggle("lights-off", on);
      b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "turn the lights on" : "turn the lights off");
      try { if (on) localStorage.setItem("cc-lights", "1"); else localStorage.removeItem("cc-lights"); } catch (e) {}
      if (!quiet) toast(on ? "lights off. just you and the game." : "lights on.");
    }
    btnFs.parentNode.insertBefore(b, btnFs);
    var veil = document.createElement("div"); veil.className = "lights-veil"; veil.setAttribute("aria-hidden", "true"); document.body.appendChild(veil);
    b.addEventListener("click", function () { set(!root.classList.contains("lights-off")); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !e.defaultPrevented && root.classList.contains("lights-off") && !document.fullscreenElement && !document.querySelector("dialog[open]")) set(false);
    });
    var saved = false; try { saved = localStorage.getItem("cc-lights") === "1"; } catch (e) {}
    set(saved, true);
  })();

  /* Wide mode: a button next to the lamp gives the game the whole row on big screens (html.wide-game, styled in
     games.css): the side column drops below and the screen grows taller. Shown from 1000px wide, where the side
     column exists. The choice is kept on this device (localStorage "cc-wide") so it carries from game to game. */
  (function () {
    var root = document.documentElement, b = document.createElement("button");
    b.className = "tool"; b.id = "btn-wide"; b.type = "button";
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3zM8 10l-2 2 2 2M16 10l2 2-2 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg><span class="tool-text">wide</span>';
    function set(on, quiet) {
      root.classList.toggle("wide-game", on);
      b.setAttribute("aria-pressed", String(on)); b.setAttribute("aria-label", on ? "back to the normal size" : "make the game wider");
      try { if (on) localStorage.setItem("cc-wide", "1"); else localStorage.removeItem("cc-wide"); } catch (e) {}
      if (!quiet) toast(on ? "wide mode. room to breathe." : "back to normal size.");
    }
    btnFs.parentNode.insertBefore(b, btnFs);
    b.addEventListener("click", function () { set(!root.classList.contains("wide-game")); });
    var saved = false; try { saved = localStorage.getItem("cc-wide") === "1"; } catch (e) {}
    set(saved, true);
  })();

  /* Snap: a camera button saves a picture of the game as it looks right now (a PNG download), with the game's name and
     the site along the bottom. It copies the biggest canvas inside the game frame; small pixel screens are scaled up
     in whole steps so they stay crisp. A game whose screen can't be read (nothing drawn yet) gets a toast instead.
     Nothing is uploaded or stored. */
  (function () {
    var b = document.createElement("button");
    b.className = "tool"; b.id = "btn-snap"; b.type = "button"; b.setAttribute("aria-label", "save a picture of the game");
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg><span class="tool-text">snap</span>';
    var before = document.getElementById("btn-wide") || btnFs;
    before.parentNode.insertBefore(b, before);
    function screen() { // the biggest canvas the game is showing
      var doc; try { doc = frame.contentDocument; } catch (e) { return null; }
      if (!doc) return null;
      var best = null, area = 0;
      [].forEach.call(doc.querySelectorAll("canvas"), function (c) {
        var r = c.getBoundingClientRect(), a = r.width * r.height;
        if (c.width && c.height && a > area) { area = a; best = c; }
      });
      return best;
    }
    function blank(c) { // every sampled pixel the same: nothing was drawn (or the screen can't be read)
      try {
        var t = document.createElement("canvas"); t.width = t.height = 16;
        var x = t.getContext("2d"); x.drawImage(c, 0, 0, 16, 16);
        var d = x.getImageData(0, 0, 16, 16).data;
        for (var i = 4; i < d.length; i++) if (d[i] !== d[i % 4]) return false;
        return true;
      } catch (e) { return true; }
    }
    function shoot() {
      var src = screen();
      if (!src || blank(src)) { toast("nothing to snap yet. start the game first."); return; }
      var k = Math.max(1, Math.ceil(640 / src.width)), w = src.width * k, h = src.height * k, foot = Math.max(28, Math.round(w / 22));
      var c = document.createElement("canvas"); c.width = w; c.height = h + foot;
      var x = c.getContext("2d");
      x.fillStyle = "#0b0d0a"; x.fillRect(0, 0, w, h + foot);
      x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, w, h);
      x.font = "700 " + Math.round(foot * 0.46) + "px ui-monospace, Menlo, Consolas, monospace"; x.textBaseline = "middle";
      x.fillStyle = "#f4efe4"; x.textAlign = "left"; x.fillText(String(title).toLowerCase(), foot * 0.4, h + foot / 2, w * 0.55);
      x.fillStyle = "#ff9f43"; x.textAlign = "right"; x.fillText("computercooked.com", w - foot * 0.4, h + foot / 2, w * 0.4);
      var m = /^\/games\/([^/]+)\//.exec(location.pathname), name = (m ? m[1] : "game") + "-" + Date.now().toString(36) + ".png";
      try {
        var bin = atob(c.toDataURL("image/png").split(",")[1]), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var a = document.createElement("a"), u = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
        a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
        player.classList.add("is-snapped"); setTimeout(function () { player.classList.remove("is-snapped"); }, 350);
        toast("snap. saved to your downloads.");
      } catch (e) { toast("couldn't take that picture."); }
    }
    b.addEventListener("click", function () {
      // right after the game's own frame is drawn: a WebGL screen can only be read then. the timer covers a paused game
      var done = false, go = function () { if (!done) { done = true; shoot(); } };
      try { frame.contentWindow.requestAnimationFrame(go); } catch (e) {}
      setTimeout(go, 250);
    });
  })();

  // "embed this game" card (added by the Worker): copy the snippet
  var embedBtn = document.querySelector("[data-copy-embed]");
  if (embedBtn) {
    var code = document.querySelector(".embed-code");
    code.addEventListener("focus", function () { code.select(); });
    embedBtn.addEventListener("click", function () {
      code.select();
      var done = function () { toast("embed code copied. paste it into your site's html."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code.value).then(done, function () { toast("press ctrl+c (or ⌘c) to copy"); });
      else toast("press ctrl+c (or ⌘c) to copy");
    });
  }

  /* ---------- SDK relay: the game (in the iframe) talks to cc-sdk.js on this page ---------- */
  var cc = window.cc;
  var sdkGame = false;
  if (cc) {
    var m = /\/games\/([a-z0-9-]+)\//.exec(location.pathname);
    if (m) cc._setGame(m[1], player.dataset.version || "1");
    // save status from the game's cc.save(): one note per kind per visit, so autosaves don't spam
    var saveNoted = {};
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data || e.data.type !== "cc-save-status") return;
      var s = e.data.state;
      if (saveNoted[s]) return;
      saveNoted[s] = true;
      if (s === "cloud") toast("saved to your account");
      else if (s === "guest") toast("saved on this device. log in to keep it everywhere.");
    });
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data || e.data.type !== "cc-sdk") return;
      var d = e.data;
      // "hello" only means the SDK script loaded; a game counts as hooked once it calls start/end
      if (d.op === "hello") return;
      sdkGame = true;
      if (d.op === "start") { cc.start(); playing(true); }
      else if (d.op === "score") cc.score(d.args);
      else if (d.op === "event") cc.event(d.args && d.args.name, d.args && d.args.data);
      else if (d.op === "achieve") {
        cc.achieve(d.args).then(function (result) {
          try { frame.contentWindow.postMessage({ type: "cc-sdk-reply", id: d.id, result: result }, location.origin); } catch (err) {}
        });
      }
      else if (d.op === "end") {
        playing(false);
        cc.end(d.args || {}).then(function (result) {
          try { frame.contentWindow.postMessage({ type: "cc-sdk-reply", id: d.id, result: result }, location.origin); } catch (err) {}
        });
      }
    });

    // Games without SDK hooks still get a basic "play" logged: first tap/key in the game
    // starts it, leaving the page ends it (time played, no score).
    var autoArm = function () {
      var doc;
      try { doc = frame.contentWindow.document; } catch (err) { return; }
      // A hooked game usually calls cc.start on that same first input, a moment later (its message has to cross
      // the frame). Wait for it: starting an auto play first meant the game's start ended it as a stray quit run.
      var first = function () {
        doc.removeEventListener("pointerdown", first, true);
        doc.removeEventListener("keydown", first, true);
        playing(true); // a game without SDK hooks: from the first input on, it's being played
        setTimeout(function () { if (!sdkGame && !cc._active()) cc.start({ auto: true }); }, 1500);
      };
      doc.addEventListener("pointerdown", first, true);
      doc.addEventListener("keydown", first, true);
    };
    frame.addEventListener("load", autoArm);
    if (frame.contentDocument && frame.contentDocument.readyState === "complete") autoArm();
  }

  setMuted(muted);

  // K-0070: a title too long to sit beside the tools gets its own row above them (.title-row in games.css)
  // instead of an ellipsis ("elevator full of f…" on phones). Re-checked when the bar's width changes.
  var bar = player.querySelector(".player-bar");
  var tEl = bar && bar.querySelector(".player-title");
  if (bar && tEl) {
    var barW = -1;
    var fitTitle = function (force) {
      var w = bar.clientWidth;
      if (w === barW && force !== true) return;
      barW = w;
      bar.classList.remove("title-row");
      if (tEl.scrollWidth > tEl.clientWidth + 1) bar.classList.add("title-row");
    };
    fitTitle();
    if (window.ResizeObserver) new ResizeObserver(function () { fitTitle(); }).observe(bar);
    else addEventListener("resize", fitTitle);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitTitle(true); });
  }
})();
