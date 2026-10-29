/* /u/<username>: a player's public profile. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var THEME = { lime: "#C5FF49", lilac: "#B59AFF", hot: "#ff8a7d", ice: "#5bc8ff", cooked: "#ffb84d", paper: "#F5F3ED", mint: "#7dffb0", pink: "#ff6bd6", gold: "#ffd84d", chrome: "#d9e2ec", sunset: "#ff9f43", grape: "#8f5bff", aqua: "#2ee6d6", rose: "#ff9ec4", lemon: "#fff35c", ember: "#ff4d2e" };
  var name = decodeURIComponent((/^\/u\/([^/]+)/.exec(location.pathname) || [])[1] || "");
  var catalog = {};

  function card(slug, meta) {
    var g = catalog[slug];
    if (!g) return "";
    return '<li class="me-game"><a href="/games/' + encodeURIComponent(slug) + '/"><img src="' + esc(g.thumbnail) + '" alt="" width="160" height="120" loading="lazy">' +
      '<span class="me-game-t">' + esc(g.title) + "</span>" + (meta ? '<span class="me-game-m">' + esc(meta) + "</span>" : "") + "</a></li>";
  }
  // add friend / accept, from the viewer's side (relation is null when logged out)
  var LABEL = { none: "add friend", requested: "request sent · cancel", incoming: "accept friend request", friends: "friends ✓", blocked: "blocked" };
  var ACTION = { none: "add", requested: "cancel", incoming: "accept" };
  var DONE = { requested: "request sent.", friends: "you're friends now.", none: "" };
  function friendButton(rel) {
    var box = $("#u-friend"), btn = $("#u-friend-btn"), msg = box.querySelector(".me-msg");
    if (!rel) return;
    box.hidden = false;
    if (rel === "self") { btn.outerHTML = '<a class="tool" href="/me/" id="u-friend-btn">edit your profile</a>'; return; }
    if (rel === "friends" || rel === "blocked") { btn.outerHTML = '<a class="tool" href="/me/#friends" id="u-friend-btn">' + LABEL[rel] + "</a>"; return; }
    btn.textContent = LABEL[rel];
    btn.onclick = function () {
      btn.disabled = true;
      fetch("/api/me/friends", { method: "POST", headers: { "content-type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ action: ACTION[rel], username: name }) })
        .then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: "you look offline." }; })
        .then(function (r) {
          btn.disabled = false;
          msg.textContent = r.ok ? DONE[r.status] || "" : r.error || "that didn't work.";
          if (r.ok) friendButton(r.status === "friends" ? "friends" : r.status === "requested" ? "requested" : "none");
        });
    };
  }
  function missing() { $("#u-missing").hidden = false; document.title = "no such player — Computer Cooked Games"; }

  if (!/^[A-Za-z0-9_]{3,16}$/.test(name)) return missing();

  Promise.all([
    fetch("/games/games.json").then(function (r) { return r.json(); }).catch(function () { return { games: [] }; }),
    fetch("/api/u/" + encodeURIComponent(name)).then(function (r) { return r.json().catch(function () { return null; }); }).catch(function () { return null; })
  ]).then(function (res) {
    (res[0].games || []).forEach(function (g) { catalog[g.slug] = g; });
    var p = res[1];
    if (p && p.moved && /^[A-Za-z0-9_]{3,16}$/.test(p.moved)) { location.replace("/u/" + p.moved); return; } // renamed in the last 30 days
    if (!p || !p.ok) return missing();
    var shown = p.display_name || p.username;
    document.title = shown + " — Computer Cooked Games";
    document.documentElement.style.setProperty("--u-accent", THEME[p.theme] || THEME.lime);
    $("#u-title").innerHTML = esc(shown);
    $("#u-avatar").innerHTML = window.ccAvatar(p.avatar);
    if (p.frame && p.frame !== "none") $("#u-avatar").dataset.frame = p.frame; // level-unlocked border (shown even when private, like the color)
    $("#u-name").textContent = shown;
    $("#u-handle").textContent = "@" + p.username;
    $("#u-level").innerHTML = "<b>level " + p.level + "</b> · " + esc(p.title);
    $("#u-card").hidden = false;
    friendButton(p.relation);
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
