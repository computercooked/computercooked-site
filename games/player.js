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

  // the results card and the phone layout live in their own sheet (games/player-plus.css), added here so the
  // generated game pages don't need a new <link>
  if (!document.querySelector('link[href^="/games/player-plus.css"]')) {
    var plus = document.createElement("link"); plus.rel = "stylesheet"; plus.href = "/games/player-plus.css";
    document.head.appendChild(plus);
  }

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
  var shareLastRun = null; // set by the results card below: after a run, the bar's share button shares that run
  document.getElementById("btn-share").addEventListener("click", function () {
    if (shareLastRun && shareLastRun()) return;
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

  /* Play on your phone: a phone button in the game bar (screens 900px and wider; hidden below that in games.css) shows a
     QR code of this game's page, tagged ?ref=qr, so a phone camera can pick the game up there. The code is drawn on
     this page by /assets/qr.js, loaded on the first click; nothing is sent. */
  (function () {
    var b = document.createElement("button"), dlg = null;
    b.className = "tool"; b.id = "btn-phone"; b.type = "button"; b.setAttribute("aria-label", "play this on your phone");
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2.5" width="10" height="19" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M11 18h2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="tool-text">phone</span>';
    btnFs.parentNode.insertBefore(b, btnFs);
    function show() {
      var url = location.origin + location.pathname + "?ref=qr", svg = window.ccQr && window.ccQr(url);
      if (!svg) { toast("couldn't make the code. the link is in the share button."); return; }
      if (!dlg) {
        dlg = document.createElement("dialog"); dlg.className = "qrbox"; dlg.setAttribute("aria-labelledby", "qrbox-tag");
        dlg.innerHTML = '<p class="qrbox-tag" id="qrbox-tag">play it on your phone</p><div class="qrbox-code"></div><p class="qrbox-say"></p><button type="button" class="qrbox-close">done</button>';
        dlg.querySelector(".qrbox-close").addEventListener("click", function () { dlg.close(); });
        dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
        document.body.appendChild(dlg);
      }
      dlg.querySelector(".qrbox-code").innerHTML = svg; // drawn by assets/qr.js from this page's own address
      dlg.querySelector(".qrbox-say").textContent = "point your phone's camera at this and " + String(title).toLowerCase() + " opens there. no app, no account.";
      (document.fullscreenElement ? document.exitFullscreen() : Promise.resolve()).catch(function () {}).then(function () { dlg.showModal(); });
    }
    b.addEventListener("click", function () {
      if (window.ccQr) { show(); return; }
      var s = document.createElement("script"); s.src = "/assets/qr.js";
      s.onload = show; s.onerror = function () { toast("couldn't load the code. try again in a sec."); };
      document.head.appendChild(s);
    });
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
        var blob = new Blob([bytes], { type: "image/png" });
        var save = function () {
          var a = document.createElement("a"), u = URL.createObjectURL(blob);
          a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(u); }, 2000);
          toast("snap. saved to your downloads.");
        };
        player.classList.add("is-snapped"); setTimeout(function () { player.classList.remove("is-snapped"); }, 350);
        // on a phone a download is hard to find: open the share sheet instead (save to photos, send to a friend).
        // if the phone says no (or can't share pictures), fall back to the download; a cancel just closes the sheet
        var file = null;
        try { if (window.matchMedia && matchMedia("(pointer: coarse)").matches && navigator.share && navigator.canShare && typeof File === "function") file = new File([blob], name, { type: "image/png" }); } catch (e) { file = null; }
        if (file && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: String(title).toLowerCase(), text: String(title).toLowerCase() + " on computercooked.com" })
            .then(function () { toast("snap. sent."); }, function (err) { if (!err || err.name !== "AbortError") save(); });
        } else save();
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

  /* ---------- the results card: the moment a run ends, on the game itself ----------
     The score with Gary's take on it, a big "play again" (Enter or R), one "try this next" game and a share button
     that sends a short brag in text (score, an emoji bar, the dare link). It sits over the game screen, so phones
     see it without scrolling, and it works in fullscreen. Esc or the x closes it; the next run closes it too.
     The share card, the clip, the leaderboard and the "play next" row are still below (games/platform.js);
     "more ↓" scrolls to them. Shown for SDK games only (they fire cc:end), never for idle/sim games, never for a
     quit run. Best scores for Gary's lines are kept per game on this device (localStorage "cc-best-here").
     Test from the console: ccResults.test(1840) or ccResults.test(2500, { best: true }).
     A dare link (?vs=<score>&from=<name>&d=<id>) adds the friend's side: an intro card before the first run
     (ccResults.intro() shows it again), a "target" chip on the game, and the results card says beat it or how far
     short. The dare banner, the ?open=1 count and POST /api/dare/:id/beat stay in platform.js; this reads the
     same query params, and the banner's score and "is-beaten" class (the server's answer), never the API.
     Local test, no server calls: /games/<slug>/?cctest=1&vs=1840&from=pat, then ccResults.test(2000) / (900). */
  (function () {
    var m = /\/games\/([a-z0-9-]+)\//.exec(location.pathname);
    var stage = player.querySelector(".player-stage");
    if (!m || !stage) return;
    var slug = m[1];
    // games that restart a run on {type:"cc-restart"}; the rest are reloaded (back to their start screen)
    var RESTARTS = /^(ant-farm|bellchain|cooked-sweeper|crash|crash-cheats|crash-test-daily|desktop-jam|fathom|handbag-havoc|keyboard-escape|level-devil-exe|one-percent-popup|overdue-notice|pixel-purge|plus-one-ram|prove-youre-human|reel-weird|smol-brains|tab-hoarder)$/;
    var NO_CARD = ["idle", "sim", "incremental"]; // no "run over" moment in these
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
    var catalog = null, catP = null;
    function games() {
      if (!catP) catP = fetch("/games/games.json").then(function (r) { return r.json(); })
        .then(function (d) { catalog = (d && d.games) || []; return catalog; }, function () { catP = null; return []; });
      return catP;
    }
    function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString("en-US"); }
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    function bests() { try { var v = JSON.parse(localStorage.getItem("cc-best-here")); return v && typeof v === "object" ? v : {}; } catch (e) { return {}; } }
    function api(path, body) {
      return fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" })
        .then(function (r) { return r.json(); }).catch(function () { return null; });
    }

    var LINES = {
      best: ["new best. the computer is sweating.", "personal record. gary is printing it out.", "that's your best yet. the fans just kicked in.", "new best. gary has to sit down."],
      first: ["first run logged. the computer is watching now.", "ok, now you know how it works. again.", "run one. that was the tutorial, right?"],
      close: ["so close. annoyingly close.", "{off} off your best. one more.", "a hair off your best. gary felt that."],
      mid: ["not your best. not your worst. very computer of you.", "the computer has seen better. from you, specifically.", "solid. forgettable, but solid."],
      low: ["that was a warm-up, right?", "gary looked away for that one. go again.", "the computer is pretending it didn't see that."],
      none: ["run over. the computer is not ok.", "and that's a wrap. gary needs a minute.", "well. that happened."]
    };
    var QUIPS = ["the computer is not ok.", "the computer is cooked.", "gary needs a minute.", "the fans are screaming."];
    var FACE = { best: "trophy", first: "happy", close: "fire", mid: "gamer", low: "sleep", none: "gamer" };

    var box = null, last = null, timer = 0, openedAt = 0, dareP = null, dare = null;

    /* ---------- the dare, from the friend's side ---------- */
    var testMode = /[?&]cctest=1(&|$)/.test(location.search);
    // the same params and cleaning as platform.js; with a dare id the URL holds the server's own score and name
    // (src/dares.js dareUrl), and the banner's numbers replace them once platform.js has checked (syncBanner)
    var vs = (function () {
      var q = new URLSearchParams(location.search), s = parseFloat(q.get("vs"));
      if (!(s > 0) || !isFinite(s)) return null;
      var from = (q.get("from") || "").replace(/[^A-Za-z0-9 _.-]/g, "").slice(0, 24).trim();
      return { score: s, from: from || "a friend", beaten: false, counted: false };
    })();
    var chip = null, intro = null, introShown = false;
    function lc(s) { return String(s).toLowerCase(); }

    // "target 1,840" on the game, top centre, out of the way of thumbs and taps (pointer-events: none)
    function showChip() {
      if (!vs) return;
      if (!chip) {
        chip = document.createElement("div"); chip.className = "ccr-target"; chip.setAttribute("aria-hidden", "true"); // the banner above says it for screen readers
        stage.appendChild(chip);
      }
      chip.classList.toggle("is-beaten", vs.beaten);
      chip.innerHTML = vs.beaten ? '<span>beaten ✓</span> <b></b>' : '<span>target:</span> <b></b> <i></i>';
      chip.querySelector("b").textContent = fmt(vs.score);
      var i = chip.querySelector("i"); if (i) i.textContent = "· " + vs.from;
    }

    // platform.js's banner: the checked score once the dare id is looked up, and "is-beaten" once
    // POST /api/dare/:id/beat says so. Read only; the banner itself is platform.js's.
    function syncBanner() {
      var lay = document.querySelector(".player-layout"), host = lay && lay.parentNode;
      if (!vs || !host || !window.MutationObserver) return;
      var watched = null, mo = new MutationObserver(read), co = new MutationObserver(read);
      function read() {
        var b = host.querySelector(".dare");
        if (b && b !== watched) { watched = b; co.disconnect(); co.observe(b, { attributes: true, attributeFilter: ["class"] }); }
        if (!b) return;
        if (b.classList.contains("is-beaten")) {
          if (!vs.counted) { vs.counted = vs.beaten = true; showChip(); var ok = box && box.querySelector(".ccr-vs-ok"); if (ok && last && last.v && last.v.won) ok.textContent = "✓ counted"; }
          return;
        }
        var n = b.querySelector(".dare-text b"), f = b.querySelector(".dare-text i"), s = n && parseFloat(n.textContent.replace(/,/g, ""));
        var changed = false;
        if (s > 0 && s !== vs.score) { vs.score = s; changed = true; }
        if (f && f.textContent && f.textContent !== vs.from) { vs.from = f.textContent; changed = true; }
        if (changed) { showChip(); if (intro && intro.open) fillIntro(); }
      }
      mo.observe(host, { childList: true });
      read();
    }

    // before the first run: who dared you, the number, the game's poster, one line of how to play, and one big button
    function buildIntro() {
      intro = document.createElement("dialog");
      intro.className = "ccd"; intro.setAttribute("aria-labelledby", "ccd-t"); intro.setAttribute("aria-describedby", "ccd-how");
      intro.innerHTML =
        '<div class="ccd-card">' +
          '<button type="button" class="ccd-x" aria-label="close (esc)">×</button>' +
          '<img class="ccd-poster" alt="" width="640" height="360" hidden>' +
          '<div class="ccd-row">' +
            '<div class="ccd-gary" aria-hidden="true"><img src="/assets/mascot/happy.svg" alt="" width="64" height="83"><span class="ccd-sign"><small>beat</small><b></b></span></div>' +
            '<div class="ccd-words"><p class="ccd-kick">you’ve been dared</p><h2 class="ccd-t" id="ccd-t"></h2></div>' +
          '</div>' +
          '<button type="button" class="ccd-go">accept <span aria-hidden="true">▶</span>' + (fine ? ' <kbd>enter</kbd>' : "") + '</button>' +
          '<p class="ccd-how" id="ccd-how"><b>how to play</b> <span></span></p>' +
        '</div>';
      document.body.appendChild(intro);
      intro.querySelector(".ccd-go").addEventListener("click", function () { closeIntro(true); });
      intro.querySelector(".ccd-x").addEventListener("click", function () { closeIntro(false); });
      intro.addEventListener("cancel", function (e) { e.preventDefault(); closeIntro(false); }); // esc
      intro.addEventListener("click", function (e) { if (e.target === intro) closeIntro(false); }); // the dimmed backdrop
      intro.addEventListener("keydown", function (e) {
        if (e.key === "Enter" && !e.repeat && !e.altKey && !e.ctrlKey && !e.metaKey && document.activeElement !== intro.querySelector(".ccd-x")) { e.preventDefault(); closeIntro(true); }
      });
    }
    function fillIntro() {
      var t = intro.querySelector(".ccd-t"), b = document.createElement("b");
      b.textContent = fmt(vs.score);
      t.textContent = "";
      t.appendChild(document.createTextNode(vs.from + " scored "));
      t.appendChild(b);
      t.appendChild(document.createTextNode(" on " + lc(title) + ". beat it."));
      intro.querySelector(".ccd-sign b").textContent = fmt(vs.score);
      var how = intro.querySelector(".ccd-how");
      how.hidden = true;
      games().then(function (list) {
        var g = list.filter(function (x) { return x.slug === slug; })[0];
        if (!g || !intro) return;
        var p = intro.querySelector(".ccd-poster"), src = g.poster || g.thumbnail;
        if (src) { p.onerror = function () { p.hidden = true; }; p.src = src; p.hidden = false; }
        // how_to[0] where the game has one; otherwise the first sentence of its controls
        var line = (g.how_to && g.how_to[0]) || (g.controls ? String(g.controls).split(/\.\s/)[0].replace(/\.$/, "") + "." : "");
        if (line) { how.querySelector("span").textContent = line; how.hidden = false; }
      });
    }
    function openIntro(force) {
      if (!vs || (introShown && !force) || !window.HTMLDialogElement) return;
      if (!force && window.cc && window.cc._active && window.cc._active()) return; // already playing: the chip says it
      introShown = true;
      if (!intro) buildIntro();
      fillIntro();
      if (intro.open) return;
      try { intro.showModal(); } catch (e) { return; }
      var go = intro.querySelector(".ccd-go");
      try { go.focus({ preventScroll: true }); } catch (e) { go.focus(); }
    }
    function closeIntro(accepted) {
      if (!intro || !intro.open) return;
      intro.close();
      if (!frame.src && frame.dataset.src) frame.src = frame.dataset.src; // the page's own loader may not have started it yet
      if (accepted) {
        var r = player.getBoundingClientRect();
        if (r.top < 0 || r.bottom > window.innerHeight) player.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
      }
      try { frame.focus({ preventScroll: true }); frame.contentWindow.focus(); } catch (e) {}
    }

    // the run against the dare: null without a dare or a score
    function versus(o) {
      if (!vs || !o.scored) return null;
      var diff = Math.round((o.score - vs.score) * 10) / 10;
      return { won: diff > 0, tie: diff === 0, by: Math.abs(diff) };
    }
    // a link for a run that has no server dare (no board, or not counted): the hand-made kind platform.js shows
    // as "beat <score> from a friend" (nothing verified or rewarded, same as a typed ?vs=)
    function handDare(score) {
      return location.origin + "/games/" + slug + "/?vs=" + encodeURIComponent(Math.round(score * 10) / 10) + "&utm_source=share&utm_medium=player&utm_campaign=" + slug;
    }

    function build() {
      box = document.createElement("div");
      box.className = "ccr"; box.hidden = true;
      box.setAttribute("role", "dialog"); box.setAttribute("aria-labelledby", "ccr-kicker"); box.setAttribute("aria-describedby", "ccr-gary");
      box.innerHTML =
        '<div class="ccr-card">' +
          '<button type="button" class="ccr-x" aria-label="close results (esc)">×</button>' +
          '<div class="ccr-head"><img class="ccr-face" alt="" width="40" height="52"><div>' +
            '<p class="ccr-kicker" id="ccr-kicker"></p><p class="ccr-gary" id="ccr-gary"></p></div></div>' +
          '<p class="ccr-score"><b class="ccr-num"></b><span class="ccr-sub"></span></p>' +
          '<div class="ccr-bar" aria-hidden="true"></div>' +
          '<p class="ccr-vs" hidden><span class="ccr-vs-tag">dare</span> <span class="ccr-vs-line"></span> <span class="ccr-vs-ok"></span></p>' +
          '<div class="ccr-acts">' +
            '<button type="button" class="ccr-again"><span aria-hidden="true">▶</span> play again' + (fine ? ' <kbd>enter</kbd>' : "") + '</button>' +
            '<button type="button" class="ccr-share"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v7h14v-7" fill="none" stroke="currentColor" stroke-width="2.2"/></svg> <span>share score</span></button>' +
          '</div>' +
          '<a class="ccr-next" hidden><img alt="" width="96" height="54" loading="lazy"><span><small>try this next</small><b></b><i></i></span></a>' +
          '<p class="ccr-foot"><button type="button" class="ccr-more">share card, clip &amp; leaderboard ↓</button><span class="ccr-say" role="status" aria-live="polite"></span></p>' +
        '</div>';
      stage.appendChild(box);
      box.querySelector(".ccr-x").addEventListener("click", function () { close(true); });
      box.querySelector(".ccr-again").addEventListener("click", again);
      var sh = box.querySelector(".ccr-share");
      // the dare link is made on the press (pointerdown), so it's usually ready by the click and the share sheet
      // can open inside the tap (iOS needs that). Nothing is made just for looking at the card.
      sh.addEventListener("pointerdown", warm);
      sh.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") warm(); });
      sh.addEventListener("click", share);
      box.querySelector(".ccr-more").addEventListener("click", function () {
        close(false);
        var t = document.getElementById("cc-dare") || document.getElementById("cc-next") || document.getElementById("cc-panel");
        if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
        if (t) setTimeout(function () { t.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }, 60);
      });
      box.addEventListener("click", function (e) { if (e.target === box && performance.now() - openedAt > 600) close(true); });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(true); return; }
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if ((e.key === "r" || e.key === "R") && !e.repeat) { e.preventDefault(); again(); return; }
        if ((e.key === "n" || e.key === "N") && !e.repeat) { var a = box.querySelector(".ccr-next"); if (!a.hidden) { e.preventDefault(); a.click(); } return; }
        if (e.key === "Tab") { // keep tabbing inside the card while it's up
          var f = [].filter.call(box.querySelectorAll("button, a[href]"), function (x) { return !x.hidden && x.offsetParent !== null; });
          if (!f.length) return;
          var i = f.indexOf(document.activeElement);
          if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
          else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
        }
      });
    }

    // a status line on the card; when the card is closed (the bar's share button) it goes to a toast instead
    function say(t) {
      if (box && !box.hidden) box.querySelector(".ccr-say").textContent = t;
      else if (t) toast(t);
    }

    // what kind of run this was, against the best on this device (or the board's, when the run counted)
    function judge(d) {
      var r = d.result, s = d.score, all = bests(), here = typeof all[slug] === "number" ? all[slug] : null;
      var scored = typeof s === "number" && isFinite(s);
      var boardPrev = r && r.accepted && typeof r.prev_best === "number" ? r.prev_best : null;
      var prev = boardPrev != null ? (here != null ? Math.max(boardPrev, here) : boardPrev) : here;
      var o = { scored: scored, score: s, prev: prev, r: r && r.accepted ? r : null };
      if (!scored) o.kind = "none";
      else if (prev == null) o.kind = "first";
      else if (s > prev) o.kind = "best";
      else {
        var ratio = prev > 0 ? s / prev : 1;
        o.kind = ratio >= 0.85 ? "close" : ratio >= 0.4 ? "mid" : "low";
      }
      o.best = o.kind === "best" ? s : prev;
      if (scored && (here == null || s > here)) { all[slug] = s; try { localStorage.setItem("cc-best-here", JSON.stringify(all)); } catch (e) {} }
      return o;
    }
    function cells(o) {
      if (!o.scored) return 0;
      if (o.kind === "best" || o.kind === "first") return 10;
      return Math.max(o.score > 0 ? 1 : 0, Math.min(10, Math.round(10 * o.score / Math.max(1e-9, o.best))));
    }
    function emojiBar(o) {
      var n = cells(o), s = "";
      for (var i = 0; i < 10; i++) s += i < n ? "🟩" : "⬛";
      return s + (o.kind === "best" ? " 🏆 new best" : o.kind === "first" ? " first try" : " " + Math.round(100 * o.score / Math.max(1e-9, o.best)) + "% of my best");
    }

    function open(d, o) {
      if (!box) build();
      o = o || judge(d);
      var v = versus(o);
      last = { d: d, o: o, v: v };
      dare = null; dareP = null;
      if (v && v.won) { vs.beaten = true; showChip(); }
      box.classList.toggle("is-best", o.kind === "best" || !!(v && v.won));
      box.classList.toggle("is-vs-won", !!(v && v.won));
      box.querySelector(".ccr-face").src = "/assets/mascot/" + (v && v.won ? "trophy" : FACE[o.kind]) + ".svg";
      box.querySelector(".ccr-kicker").textContent = v && v.won ? "dare beaten!" : o.kind === "best" ? "new best!" : o.kind === "first" ? "first run" : o.scored ? "run over" : "game over";
      // the dare line: beat it (and by how much), a tie, or how far short
      var vsEl = box.querySelector(".ccr-vs");
      vsEl.hidden = !v;
      vsEl.classList.toggle("is-won", !!(v && v.won));
      if (v) {
        vsEl.querySelector(".ccr-vs-line").textContent = v.won ? "you beat " + vs.from + ". by " + fmt(v.by) + ". tell them."
          : v.tie ? "tied " + vs.from + " at " + fmt(vs.score) + ". exactly. one more point. go."
          : fmt(v.by) + " short of " + vs.from + "'s " + fmt(vs.score) + ". the computer believes in you. barely.";
        vsEl.querySelector(".ccr-vs-ok").textContent = v.won && vs.counted ? "✓ counted" : "";
      }
      var tie = o.scored && o.kind !== "best" && o.kind !== "first" && o.best === o.score;
      box.querySelector(".ccr-gary").textContent = tie ? "tied your best. the computer doesn't know how to feel." : pick(LINES[o.kind]).replace("{off}", o.scored && o.best != null ? fmt(Math.abs(o.best - o.score)) : "");
      var num = box.querySelector(".ccr-num"), sub = box.querySelector(".ccr-sub");
      num.textContent = o.scored ? fmt(o.score) : "";
      num.hidden = !o.scored;
      var bits = [];
      if (o.r) bits.push(o.r.today && o.r.today.of > 1 ? "#" + o.r.today.rank + " of " + o.r.today.of + " today" : "#" + o.r.rank + " all-time");
      if (o.scored && o.kind !== "best" && o.kind !== "first" && o.best != null) bits.push("best " + fmt(o.best));
      else if (o.kind === "best" && o.prev != null) bits.push("was " + fmt(o.prev));
      sub.textContent = bits.join(" · ");
      // a little pixel bar: this run against your best
      var bar = box.querySelector(".ccr-bar"), n = cells(o), h = "";
      for (var i = 0; i < 10; i++) h += '<i class="' + (i < n ? "on" : "") + '" style="--i:' + i + '"></i>';
      bar.innerHTML = h; bar.hidden = !o.scored;
      box.querySelector(".ccr-share span").textContent = v && v.won ? "dare them back" : o.scored ? "share score" : "share game";
      box.querySelector(".ccr-say").textContent = "";
      nextTile();
      // a new best on the board already gets platform.js's confetti; this covers the rest (no board, run not counted)
      if ((o.kind === "best" && !(o.r && o.r.prev_best != null && o.score > o.r.prev_best)) || (v && v.won)) confetti();
      box.hidden = false;
      openedAt = performance.now();
      requestAnimationFrame(function () { box.classList.add("is-on"); });
      var a = box.querySelector(".ccr-again");
      try { a.focus({ preventScroll: true }); } catch (e) { a.focus(); }
      shareLastRun = shareFromBar;
    }
    function close(refocus) {
      clearTimeout(timer);
      if (!box || box.hidden) return;
      box.hidden = true; box.classList.remove("is-on");
      if (refocus) { try { frame.focus({ preventScroll: true }); } catch (e) {} }
    }

    function again() {
      if (performance.now() - openedAt < 450) return; // a key still held from the run doesn't count
      close(false);
      try { frame.focus({ preventScroll: true }); } catch (e) {}
      if (RESTARTS.test(slug)) send({ type: "cc-restart" });
      else {
        try { frame.contentWindow.location.reload(); } catch (e) { frame.src = frame.dataset.src || frame.src; }
        frame.addEventListener("load", function f() { frame.removeEventListener("load", f); try { frame.focus({ preventScroll: true }); frame.contentWindow.focus(); } catch (e) {} });
      }
    }

    // one game to go to next: most tags in common, not played on this device first, a little luck for ties
    function nextTile() {
      var a = box.querySelector(".ccr-next");
      games().then(function (list) {
        var me = list.filter(function (g) { return g.slug === slug; })[0], tags = (me && me.tags) || [];
        var seen = {};
        try { JSON.parse(localStorage.getItem("cc-recent") || "[]").forEach(function (x) { if (x && x.g) seen[x.g] = 1; }); } catch (e) {}
        var best = null, top = -1;
        list.forEach(function (g) {
          if (!g || g.slug === slug || !g.title) return;
          var s = 3 * (g.tags || []).filter(function (t) { return tags.indexOf(t) >= 0; }).length + (seen[g.slug] ? 0 : 2) + Math.random() * 2.5;
          if (s > top) { top = s; best = g; }
        });
        if (!best) { a.hidden = true; return; }
        a.href = "/games/" + encodeURIComponent(best.slug) + "/?src=next&slot=similar";
        var img = a.querySelector("img");
        img.src = best.poster || best.thumbnail || "/games/" + best.slug + "/cover.png";
        a.querySelector("b").textContent = String(best.title).toLowerCase();
        a.querySelector("i").textContent = best.pitch || "";
        a.setAttribute("aria-label", "try this next: " + best.title + (fine ? " (n)" : ""));
        a.hidden = false;
      });
    }

    // the brag: one line, an emoji bar, the dare link (a run that counted) or the game's link
    function shareText(o, v) {
      var gt = String(title).toLowerCase();
      if (!o.scored) return "i played " + gt + " on computer cooked. " + pick(QUIPS);
      if (v && v.won) return "i beat " + vs.from + "'s " + fmt(vs.score) + " on " + gt + " with " + fmt(o.score) + ". your move.\n" + emojiBar(o);
      return "i scored " + fmt(o.score) + " on " + gt + ". " + pick(QUIPS) + "\n" + emojiBar(o);
    }
    function scoredRun() { return !!(last && last.o.scored && last.o.r && last.d.playId && window.cc); }
    function warm() {
      if (dareP || !scoredRun()) return dareP;
      dareP = api("/api/dare", { play_id: last.d.playId, anon: window.cc._anon, source: "button" }).then(function (d) {
        if (d && d.ok && d.url) return (dare = d);
        dareP = null; return null;
      });
      return dareP;
    }
    function gameUrl() { return location.origin + "/games/" + slug + "/?utm_source=share&utm_medium=player&utm_campaign=" + slug; }
    function sent(how) {
      if (testMode) return; // ?cctest=1: nothing counted
      if (dare) api("/api/dare/" + dare.id + "/shared", { how: how });
      else api("/api/share", { game: slug, how: how, anon: window.cc && window.cc._anon });
    }
    function deliver(text, url, label) {
      var full = text + "\n" + label + url;
      if (navigator.share) {
        navigator.share({ title: String(title).toLowerCase(), text: text + "\n" + label.trim(), url: url }).then(function () { sent("share"); say("sent. good luck to them."); }, function (err) {
          if (err && err.name === "NotAllowedError") { say("link ready. tap share again."); return; }
          if (!err || err.name !== "AbortError") copy(full);
        });
        return;
      }
      copy(full);
    }
    function copy(full) {
      var ok = function () { sent("copy"); say("copied. paste it anywhere."); if (box && !box.hidden) toast("copied. paste it anywhere."); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(full).then(ok, function () { fallbackCopy(full) ? ok() : say("couldn't copy. the link: " + full.split("\n").pop()); });
      else if (fallbackCopy(full)) ok(); else say(full);
    }
    function fallbackCopy(t) {
      var ta = document.createElement("textarea"); ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      (box || document.body).appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      ta.remove(); return ok;
    }
    function share() {
      if (!last) return;
      var o = last.o, text = shareText(o, last.v);
      // a dared player's run with no server dare to send still goes back as a dare (a hand-made ?vs= link)
      if (!scoredRun()) { if (last.v) deliver(text, handDare(o.score), "beat it: "); else deliver(text, gameUrl(), "play: "); return; }
      if (dare) { deliver(text, dare.url, "beat it: "); return; }
      say("making your link…");
      (warm() || Promise.resolve(null)).then(function (d) {
        say("");
        deliver(text, d ? d.url : last.v ? handDare(o.score) : gameUrl(), d || last.v ? "beat it: " : "play: ");
      });
    }
    // the bar's share button, after a run: share the run (true), not just the game
    function shareFromBar() {
      if (!last || (window.cc && window.cc._active())) return false;
      share(); return true;
    }

    function confetti() {
      if (reduce || document.querySelector(".cc-confetti")) return;
      var layer = document.createElement("div"), cols = ["var(--lime)", "#b9ff3c", "#ff6b5e", "#ffd23c", "#7ad7ff", "#f4efe2"], h = "";
      layer.className = "cc-confetti"; layer.setAttribute("aria-hidden", "true");
      for (var i = 0; i < 48; i++) {
        var size = 6 + Math.floor(Math.random() * 3) * 2;
        h += '<i style="left:' + (Math.random() * 100).toFixed(1) + "%;width:" + size + "px;height:" + size + "px;background:" + cols[i % cols.length] +
          ";animation-delay:" + (Math.random() * 0.5).toFixed(2) + "s;animation-duration:" + (1.6 + Math.random() * 1.2).toFixed(2) + "s;--dx:" + Math.round(Math.random() * 160 - 80) + 'px"></i>';
      }
      layer.innerHTML = h;
      (document.fullscreenElement || document.body).appendChild(layer);
      setTimeout(function () { layer.remove(); }, 3600);
    }

    document.addEventListener("cc:start", function () { close(false); shareLastRun = null; games(); });
    document.addEventListener("cc:end", function (e) {
      var d = e.detail || {};
      if (d.completed === false || (d.game && d.game !== slug)) return;
      clearTimeout(timer);
      games().then(function (list) {
        var me = list.filter(function (g) { return g.slug === slug; })[0];
        if (me && (me.tags || []).some(function (t) { return NO_CARD.indexOf(t) >= 0; })) return;
        var o = judge(d); // the best on this device moves even if the card ends up not showing
        // a beat for the game's own "game over" to land first
        timer = setTimeout(function () {
          if ((window.cc && window.cc._active()) || player.classList.contains("is-mini") || document.querySelector("dialog[open]")) return;
          open(d, o);
        }, 700);
      });
    });
    window.ccResults = {
      // for testing: shows the card for a made-up run (no score is sent anywhere)
      test: function (score, opt) {
        opt = opt || {};
        if (opt.best) { var all = bests(); all[slug] = Math.max(0, (typeof score === "number" ? score : 1) - 1); try { localStorage.setItem("cc-best-here", JSON.stringify(all)); } catch (e) {} }
        open({ game: slug, playId: null, score: typeof score === "number" ? score : null, result: null, completed: true });
      },
      close: function () { close(true); },
      // the dare intro again (only on a page opened with ?vs=)
      intro: function () { openIntro(true); }
    };
    if (vs) {
      showChip();
      syncBanner();
      openIntro(false);
    }
  })();

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
