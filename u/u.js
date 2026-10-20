/* /u/<username>: a player's public profile. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var THEME = { lime: "#C5FF49", lilac: "#B59AFF", hot: "#ff8a7d", ice: "#5bc8ff", cooked: "#ffb84d", paper: "#F5F3ED" };
  var name = decodeURIComponent((/^\/u\/([^/]+)/.exec(location.pathname) || [])[1] || "");
  var catalog = {};

  function card(slug, meta) {
    var g = catalog[slug];
    if (!g) return "";
    return '<li class="me-game"><a href="/games/' + encodeURIComponent(slug) + '/"><img src="' + esc(g.thumbnail) + '" alt="" width="160" height="120" loading="lazy">' +
      '<span class="me-game-t">' + esc(g.title) + "</span>" + (meta ? '<span class="me-game-m">' + esc(meta) + "</span>" : "") + "</a></li>";
  }
  function missing() { $("#u-missing").hidden = false; document.title = "no such player — Computer Cooked Games"; }

  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return missing();

  Promise.all([
    fetch("/games/games.json").then(function (r) { return r.json(); }).catch(function () { return { games: [] }; }),
    fetch("/api/u/" + encodeURIComponent(name)).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
  ]).then(function (res) {
    (res[0].games || []).forEach(function (g) { catalog[g.slug] = g; });
    var p = res[1];
    if (!p || !p.ok) return missing();
    var shown = p.display_name || p.username;
    document.title = shown + " — Computer Cooked Games";
    document.documentElement.style.setProperty("--u-accent", THEME[p.theme] || THEME.lime);
    $("#u-title").innerHTML = esc(shown);
    $("#u-avatar").innerHTML = window.ccAvatar(p.avatar);
    $("#u-name").textContent = shown;
    $("#u-handle").textContent = "@" + p.username;
    $("#u-level").innerHTML = "<b>level " + p.level + "</b> · " + esc(p.title);
    $("#u-card").hidden = false;
    if (p.private) { $("#u-private").hidden = false; return; }

    $("#u-public").hidden = false;
    if (p.bio) { $("#u-bio").textContent = p.bio; $("#u-bio").hidden = false; }
    if (p.badges && p.badges.length) {
      $("#u-badges").innerHTML = p.badges.map(function (b) {
        var where = b.game === "site" ? "" : " · " + esc((catalog[b.game] || {}).title || b.game);
        return '<li class="is-got"><b>' + esc(b.name) + "</b><span>" + esc(b.desc) + where + "</span></li>";
      }).join("");
      $("#u-badges-s").hidden = false;
    }
    if (p.fav_game && catalog[p.fav_game]) { $("#u-fav").innerHTML = card(p.fav_game); $("#u-fav-s").hidden = false; }
    if (p.highs && p.highs.length) { $("#u-highs").innerHTML = p.highs.map(function (h) { return card(h.game, "best " + Math.round(h.best)); }).join(""); $("#u-highs-s").hidden = false; }
    $("#u-meta").textContent = p.xp + " xp · " + p.achievements + " achievements · playing since " + p.joined;
  });
})();
