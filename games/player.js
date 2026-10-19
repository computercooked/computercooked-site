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

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
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

  setMuted(muted);
})();
