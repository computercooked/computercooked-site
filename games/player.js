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
  btnFs.addEventListener("click", function () {
    if (document.fullscreenEnabled && player.requestFullscreen) {
      if (document.fullscreenElement) document.exitFullscreen();
      else player.requestFullscreen().catch(function () { player.classList.toggle("is-pseudo-fs"); });
    } else {
      player.classList.toggle("is-pseudo-fs");
      document.body.style.overflow = player.classList.contains("is-pseudo-fs") ? "hidden" : "";
    }
  });
  document.addEventListener("fullscreenchange", function () {
    btnFs.setAttribute("aria-pressed", String(!!document.fullscreenElement));
  });
  document.addEventListener("cc:deck-open", function () { send({ type: "cc-pause" }); });
  window.ccToast = toast;

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
      if (s === "cloud") toast("saved to your account ☁");
      else if (s === "guest") toast("saved on this device. log in to keep it everywhere.");
    });
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || e.source !== frame.contentWindow || !e.data || e.data.type !== "cc-sdk") return;
      var d = e.data;
      // "hello" only means the SDK script loaded; a game counts as hooked once it calls start/end
      if (d.op === "hello") return;
      sdkGame = true;
      if (d.op === "start") cc.start();
      else if (d.op === "score") cc.score(d.args);
      else if (d.op === "event") cc.event(d.args && d.args.name, d.args && d.args.data);
      else if (d.op === "achieve") {
        cc.achieve(d.args).then(function (result) {
          try { frame.contentWindow.postMessage({ type: "cc-sdk-reply", id: d.id, result: result }, location.origin); } catch (err) {}
        });
      }
      else if (d.op === "end") {
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
      var first = function () {
        doc.removeEventListener("pointerdown", first, true);
        doc.removeEventListener("keydown", first, true);
        if (!sdkGame && !cc._active()) cc.start({ auto: true });
      };
      doc.addEventListener("pointerdown", first, true);
      doc.addEventListener("keydown", first, true);
    };
    frame.addEventListener("load", autoArm);
    if (frame.contentDocument && frame.contentDocument.readyState === "complete") autoArm();
  }

  setMuted(muted);
})();
