/* Renders the game shelves from /games/games.json. The HTML ships with a static
   card for each current game, so the page still works if this never runs. */
(function () {
  "use strict";

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function card(g) {
    var tags = (g.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    return '<li class="game-card"><div class="game-card-inner">' +
      '<img class="game-thumb" src="' + esc(g.thumbnail) + '" alt="" width="400" height="300" loading="lazy">' +
      '<div class="game-body">' +
        '<h3 class="game-name">' + esc(g.title) + "</h3>" +
        '<p class="game-pitch">' + esc(g.pitch) + "</p>" +
        (tags ? '<ul class="game-tags" aria-label="tags">' + tags + "</ul>" : "") +
        '<a class="play-btn" href="/games/' + encodeURIComponent(g.slug) + '/" aria-label="play ' + esc(g.title) + '">play ▶</a>' +
      "</div></div></li>";
  }

  fetch("/games/games.json")
    .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
    .then(function (data) {
      var games = data.games || [];
      var ours = games.filter(function (g) { return g.made_by === "computer-cooked"; });
      var community = games.filter(function (g) { return g.made_by === "community"; });

      var shelf = document.getElementById("shelf-computer-cooked");
      if (shelf && ours.length) shelf.innerHTML = ours.map(card).join("");

      var cshelf = document.getElementById("shelf-community");
      if (cshelf && community.length) cshelf.insertAdjacentHTML("afterbegin", community.map(card).join(""));

      var count = document.querySelector("[data-count]");
      if (count) count.textContent = ours.length + (ours.length === 1 ? " game. more cooking." : " games");
    })
    .catch(function () { /* keep the static cards */ });
})();
