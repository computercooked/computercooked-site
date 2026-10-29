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
})();
