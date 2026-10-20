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

  // tip jar (off until TIP_URL is a buy.stripe.com Payment Link): a plain link out, nothing tracked, no payment here
  function tipLine(url) {
    return '<p class="cc-tip"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">keep the games free: tip the computer ↗</a> <small>18+ / ask a parent</small></p>';
  }
  var tip = null;
  function tipUrl() {
    if (!tip) tip = fetch("/api/tip").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && typeof j.url === "string" && j.url.indexOf("https://buy.stripe.com/") === 0 ? j.url : null; })
      .catch(function () { return null; });
    return tip;
  }
  tipUrl().then(function (url) {
    var foot = document.querySelector(".footer");
    if (url && foot && !foot.querySelector(".cc-tip")) foot.insertAdjacentHTML("afterbegin", tipLine(url));
  });

  var live = fetch("/api/health").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return !!(j && j.db); }).catch(function () { return false; });
  var off = function () { return Promise.resolve(null); };
  Promise.all([
    fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }),
    live.then(function (up) { return up ? api("/api/stats") : null; }),
    live.then(function (up) { return up ? api("/api/me") : null; })
  ]).then(function (res) {
    var data = res[0], st = res[1], who = res[2];
    if (st && st.ok) st.games.forEach(function (g) { stats[g.game] = g; });
    me = who && who.user;
    var chip = document.getElementById("hub-chip");
    live.then(function (up) { if (chip) chip.hidden = !up; });
    if (chip && me) { chip.textContent = me.username; chip.classList.add("is-in"); }
    return (me ? api("/api/me/summary") : Promise.resolve(null)).then(function (sum) {
      if (sum && sum.ok) favs = sum.favorites;
      render(data);
      jumpBackIn(data, sum && sum.ok ? sum : null);
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
    live.then(function (up) { return up ? api("/api/community") : null; }).then(function (c) {
      if (!c || !c.ok || !c.games.length || !cshelf) return;
      cshelf.insertAdjacentHTML("afterbegin", c.games.map(function (u) {
        return card({ slug: "community/" + u.slug, title: u.title, pitch: u.pitch || "", thumbnail: "/assets/logo.svg", tags: ["community"] })
          .replace('/games/community%2F' + encodeURIComponent(u.slug) + "/", "/games/community/?g=" + encodeURIComponent(u.slug));
      }).join(""));
    });

    live.then(function (up) { return up ? api("/api/challenge") : null; }).then(weekly);

    var count = document.querySelector("[data-count]");
    if (count) count.textContent = ours.length + (ours.length === 1 ? " game. more cooking." : " games");
  }

  // "jump back in": games played on this device or account, newest first, with save state.
  // A cloud save newer than this device's copy says so (it loads automatically in the game).
  function ago(t) {
    var m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? "just now" : m < 60 ? m + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago";
  }
  function localSaves() {
    var out = {};
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), m = /^cc-save:([^:]+):/.exec(k || "");
        if (!m) continue;
        var o = JSON.parse(localStorage.getItem(k));
        if (o && typeof o.t === "number" && o.d !== null) out[m[1]] = Math.max(out[m[1]] || 0, o.t);
      }
    } catch (e) {}
    return out;
  }
  function jumpBackIn(data, sum) {
    var byslug = {};
    (data.games || []).forEach(function (g) { byslug[g.slug] = g; });
    var seen = {}, local = localSaves(), cloud = {};
    function touch(slug, t) { if (byslug[slug] && t) seen[slug] = Math.max(seen[slug] || 0, t); }
    try { JSON.parse(localStorage.getItem("cc-recent") || "[]").forEach(function (x) { touch(x.g, x.t); }); } catch (e) {}
    Object.keys(local).forEach(function (s) { touch(s, local[s]); });
    if (sum) {
      (sum.recent || []).forEach(function (r) { touch(r.game, r.last); });
      (sum.saves || []).forEach(function (s) { cloud[s.game] = s.updated_at; touch(s.game, s.updated_at); });
    }
    var list = Object.keys(seen).sort(function (a, b) { return seen[b] - seen[a]; }).slice(0, 4);
    if (!list.length) return;
    document.getElementById("continue-row").innerHTML = list.map(function (slug) {
      var g = byslug[slug], c = cloud[slug], l = local[slug], meta, cls = "";
      if (c && (!l || c > l + 5000)) { meta = "newer save from another device ☁ · " + ago(c); cls = " is-sync"; }
      else if (c) meta = "saved to your account ☁ · " + ago(c);
      else if (l) meta = "saved on this device · " + ago(l);
      else meta = "played " + ago(seen[slug]);
      return '<li><a class="continue-card' + cls + '" href="/games/' + encodeURIComponent(slug) + '/">' +
        '<img src="' + esc(g.thumbnail) + '" alt="" width="96" height="72" loading="lazy">' +
        '<span class="continue-body"><b>' + esc(g.title) + "</b><small>" + esc(meta) + '</small></span><span class="continue-go" aria-hidden="true">▶</span></a></li>';
    }).join("");
    document.getElementById("hub-continue").hidden = false;
  }

  // weekly challenge + seasonal event (slice D2)
  function weekly(r) {
    if (!r || !r.ok || (!r.challenge && !r.events.length)) return;
    var sec = document.getElementById("hub-weekly"), c = r.challenge;
    var card = document.getElementById("weekly-card");
    if (c) {
      var days = Math.max(0, Math.ceil((Date.parse(c.ends_at) - Date.now()) / 86400000));
      document.getElementById("weekly-ends").textContent = days <= 1 ? "ends today" : "ends in " + days + " days";
      card.href = "/games/" + encodeURIComponent(c.game) + "/";
      document.getElementById("weekly-thumb").src = c.thumbnail;
      document.getElementById("weekly-title").textContent = c.title;
      document.getElementById("weekly-goal").textContent = c.goal;
      var meta = "+" + c.xp + " xp";
      if (c.done) meta = "done ✓ · " + meta;
      else if (c.best != null) meta += " · your best this week " + Math.round(c.best);
      else if (!me) meta += " · log in to earn it";
      if (c.finishers) meta += " · " + c.finishers + (c.finishers === 1 ? " player has" : " players have") + " done it";
      document.getElementById("weekly-meta").textContent = meta;
      card.classList.toggle("is-done", !!c.done);
    } else {
      card.hidden = true;
      sec.querySelector(".shelf-head").textContent = "events";
    }
    var ev = r.events[0];
    if (ev) {
      var p = document.getElementById("weekly-event");
      var until = new Date(ev.until + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toLowerCase();
      p.innerHTML = "<b>" + esc(ev.label) + " event</b> · finish any run before " + esc(until) + " for the <i>" + esc(ev.name) + "</i> badge" + (ev.got ? " · got it ✓" : " (+" + ev.xp + " xp)");
      p.hidden = false;
    }
    sec.hidden = false;
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
