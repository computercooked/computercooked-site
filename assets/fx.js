/* Presentation-only effects for /games pages: card tilt, the hub ticker, the
   player "booting" screen and the "play next" strip. No data writes, no SDK.
   Everything here is optional polish; pages work fine if this never runs. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- card tilt + sheen (hub and play-next grids) ---------- */
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

  /* ---------- player: hide the boot screen once the game frame loads ---------- */
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

  /* ---------- games list: ticker + play-next ---------- */
  var ticker = document.querySelector(".ticker-track");
  var more = document.querySelector("[data-more-games]");
  if (!ticker && !more) return;

  fetch("/games/games.json")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) {
      var games = (data.games || []).filter(function (g) { return g.made_by === "computer-cooked"; });
      if (!games.length) return;

      if (ticker) {
        var names = games.map(function (g) { return "<span>" + esc(g.title) + "</span>"; }).join("") + "<span>more cooking</span>";
        ticker.innerHTML = names + names;
      }

      if (more) {
        var here = more.getAttribute("data-more-games");
        var pick = games.filter(function (g) { return g.slug !== here; }).slice(0, 3);
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
    })
    .catch(function () { /* keep the static ticker; play-next stays hidden */ });
})();
