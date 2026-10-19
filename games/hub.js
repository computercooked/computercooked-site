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
  function api(path, body) {
    return fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }
  function plays(n) { return n >= 1000 ? (Math.round(n / 100) / 10) + "k plays" : n + " plays"; }

  var stats = {}, me = null, favs = [];

  function card(g) {
    var tags = (g.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var isNew = g.added && (Date.now() - Date.parse(g.added)) < 14 * 86400000;
    var s = stats[g.slug];
    var count = s && s.total > 100 ? '<span class="game-plays">' + plays(s.total) + "</span>" : "";
    var heart = me ? '<button type="button" class="cc-heart game-heart" data-game="' + esc(g.slug) + '" aria-pressed="' + (favs.indexOf(g.slug) >= 0) + '" aria-label="favorite ' + esc(g.title) + '">' + (favs.indexOf(g.slug) >= 0 ? "♥" : "♡") + "</button>" : "";
    return '<li class="game-card"><div class="game-card-inner">' +
      '<img class="game-thumb" src="' + esc(g.thumbnail) + '" alt="" width="400" height="300" loading="lazy">' +
      '<div class="game-body">' +
        (isNew ? '<span class="game-new">new</span>' : "") + heart +
        '<h3 class="game-name">' + esc(g.title) + "</h3>" +
        '<p class="game-pitch">' + esc(g.pitch) + "</p>" +
        (tags ? '<ul class="game-tags" aria-label="tags">' + tags + "</ul>" : "") + count +
        '<a class="play-btn" href="/games/' + encodeURIComponent(g.slug) + '/" aria-label="play ' + esc(g.title) + '">play ▶</a>' +
      "</div></div></li>";
  }

  function shelf(id, title, note, list) {
    var sec = document.getElementById(id);
    if (!sec || !list.length) return;
    sec.querySelector(".shelf-head").innerHTML = esc(title) + (note ? " <small>" + esc(note) + "</small>" : "");
    sec.querySelector(".card-grid").innerHTML = list.map(card).join("");
    sec.hidden = false;
  }

  Promise.all([
    fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }),
    api("/api/stats"),
    api("/api/me")
  ]).then(function (res) {
    var data = res[0], st = res[1], who = res[2];
    if (st && st.ok) st.games.forEach(function (g) { stats[g.game] = g; });
    me = who && who.user;
    var chip = document.getElementById("hub-chip");
    if (chip && me) { chip.textContent = me.username; chip.classList.add("is-in"); }
    return (me ? api("/api/me/summary") : Promise.resolve(null)).then(function (sum) {
      if (sum && sum.ok) favs = sum.favorites;
      render(data);
    });
  }).catch(function () { /* keep the static cards */ });

  function render(data) {
    var games = data.games || [];
    var ours = games.filter(function (g) { return g.made_by === "computer-cooked"; });
    var community = games.filter(function (g) { return g.made_by === "community"; });

    // trending: most plays in the last 7 days (needs some data before it shows)
    var trending = games.filter(function (g) { return stats[g.slug] && stats[g.slug].week >= 5; })
      .sort(function (a, b) { return stats[b.slug].week - stats[a.slug].week; }).slice(0, 3);
    shelf("shelf-trending", "trending this week", "", trending);
    var popular = games.filter(function (g) { return stats[g.slug] && stats[g.slug].total >= 20; })
      .sort(function (a, b) { return stats[b.slug].total - stats[a.slug].total; }).slice(0, 3);
    shelf("shelf-popular", "most played", "all time", popular);

    var mine = document.getElementById("shelf-computer-cooked");
    if (mine && ours.length) mine.innerHTML = ours.map(card).join("");

    var cshelf = document.getElementById("shelf-community");
    if (cshelf && community.length) cshelf.insertAdjacentHTML("afterbegin", community.map(card).join(""));
    api("/api/community").then(function (c) {
      if (!c || !c.ok || !c.games.length || !cshelf) return;
      cshelf.insertAdjacentHTML("afterbegin", c.games.map(function (u) {
        return card({ slug: "community/" + u.slug, title: u.title, pitch: u.pitch || "", thumbnail: "/assets/logo.svg", tags: ["community"] })
          .replace('/games/community%2F' + encodeURIComponent(u.slug) + "/", "/games/community/?g=" + encodeURIComponent(u.slug));
      }).join(""));
    });

    var count = document.querySelector("[data-count]");
    if (count) count.textContent = ours.length + (ours.length === 1 ? " game. more cooking." : " games");
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
