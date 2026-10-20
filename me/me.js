/* /me: log in, sign up (13+, neutral age gate), profile with favorites, recent, bests, streak. */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function api(path, body) {
    return fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: "server hiccup. try again." }; }); })
      .catch(function () { return { ok: false, error: "you look offline." }; });
  }
  var anon = ls("cc-anon");
  var catalog = {};

  /* ---------- avatar pickers ---------- */
  var chosen = "lime";
  function picker(root, current, onPick) {
    root.innerHTML = window.ccAvatarKeys.map(function (k) {
      return '<button type="button" class="avatar-opt" data-k="' + k + '" aria-pressed="' + (k === current) + '" aria-label="' + k + ' face">' + window.ccAvatar(k) + "</button>";
    }).join("");
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".avatar-opt");
      if (!b) return;
      root.querySelectorAll(".avatar-opt").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      onPick(b.dataset.k);
    });
  }
  picker($("#avatar-pick"), chosen, function (k) { chosen = k; });

  /* ---------- year list: no default, no hint ---------- */
  var ys = $("#year-select"), y0 = new Date().getFullYear();
  for (var y = y0; y >= y0 - 100; y--) { var o = document.createElement("option"); o.value = o.textContent = y; ys.appendChild(o); }

  /* ---------- tabs ---------- */
  function tab(which) {
    var login = which === "login";
    $("#tab-login").setAttribute("aria-selected", String(login));
    $("#tab-signup").setAttribute("aria-selected", String(!login));
    $("#form-login").hidden = !login;
    $("#form-signup").hidden = login;
  }
  $("#tab-login").addEventListener("click", function () { tab("login"); });
  $("#tab-signup").addEventListener("click", function () { tab("signup"); });
  if (location.hash === "#signup") tab("signup");

  function noAccount() {
    $("#form-login").hidden = $("#form-signup").hidden = true;
    document.querySelector(".me-tabs").hidden = true;
    $("#no-account").hidden = false;
  }
  // someone who answered under 13 isn't shown the form again for a day
  var blocked = +ls("cc-noacct") || 0;

  function submit(form, path, extra) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".me-msg");
      var data = Object.fromEntries(new FormData(form).entries());
      Object.assign(data, extra ? extra() : {}, { anon_id: anon });
      msg.textContent = "…";
      var btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      api(path, data).then(function (r) {
        btn.disabled = false;
        if (r.under13) { ls("cc-noacct", String(Date.now())); noAccount(); return; }
        if (!r.ok) { msg.textContent = r.error || "that didn't work."; return; }
        msg.textContent = "";
        ls("cc-user-change", String(Date.now())); // open game tabs pick up the login and sync their saves
        showProfile(r.user);
      });
    });
  }
  submit($("#form-login"), "/api/auth/login");
  submit($("#form-signup"), "/api/auth/signup", function () { return { avatar: chosen }; });

  $("#btn-logout").addEventListener("click", function () {
    api("/api/auth/logout", {}).then(function () { ls("cc-user-change", String(Date.now())); location.reload(); });
  });

  /* ---------- profile ---------- */
  function card(slug, meta) {
    var g = catalog[slug] || { title: slug, thumbnail: "/assets/logo.svg" };
    return '<li class="me-game"><a href="/games/' + encodeURIComponent(slug) + '/"><img src="' + esc(g.thumbnail) + '" alt="" width="160" height="120" loading="lazy">' +
      '<span class="me-game-t">' + esc(g.title) + "</span>" + (meta ? '<span class="me-game-m">' + esc(meta) + "</span>" : "") + "</a></li>";
  }

  function showProfile(user) {
    $("#auth").hidden = true;
    $("#profile").hidden = false;
    $("#me-title").innerHTML = "hi, <span>" + esc(user.username) + "</span>";
    $("#me-sub").textContent = "your stuff. still no ads. still no email.";
    $("#me-name").textContent = user.username;
    $("#me-avatar").innerHTML = window.ccAvatar(user.avatar);
    picker($("#avatar-change"), user.avatar, function (k) { setFace(k); });
    $("#me-public-link").href = "/u/" + encodeURIComponent(user.username);
    initSettings(user);
    initFriends();
    loadFeed();
    api("/api/me/summary").then(function (s) {
      if (!s.ok) return;
      $("#me-streak").textContent = s.streak;
      $("#me-days").textContent = s.days_played;
      var best = {};
      s.bests.forEach(function (b) { best[b.game] = b.best; });
      $("#favs").innerHTML = s.favorites.length ? s.favorites.map(function (g) { return card(g, best[g] ? "best " + Math.round(best[g]) : ""); }).join("")
        : '<li class="me-empty">tap ♡ on a game page to keep it here.</li>';
      $("#recent").innerHTML = s.recent.length ? s.recent.slice(0, 12).map(function (r) {
        return card(r.game, r.plays + (r.plays === 1 ? " play" : " plays") + " · " + mins(r.ms) + (best[r.game] ? " · best " + Math.round(best[r.game]) : ""));
      }).join("") : '<li class="me-empty">nothing yet. <a href="/games/">go play something</a>.</li>';
      if (s.xp) showXp(s);
    });
  }

  /* ---------- profile + account settings (slice C) ---------- */
  var THEMES = { lime: "#C5FF49", lilac: "#B59AFF", hot: "#ff8a7d", ice: "#5bc8ff", cooked: "#ffb84d", paper: "#F5F3ED", mint: "#7dffb0", pink: "#ff6bd6", gold: "#ffd84d", chrome: "#d9e2ec" };
  // grey out cosmetics this account hasn't reached yet (the server refuses them too)
  function lockRow(root, values, need) {
    root.querySelectorAll(".swatch").forEach(function (b) {
      var v = values[+b.dataset.v], lv = need[v];
      if (!lv) return;
      b.disabled = true;
      b.classList.add("is-locked");
      b.dataset.lv = "lv " + lv;
      b.setAttribute("aria-label", (b.getAttribute("aria-label") || v) + " (unlocks at level " + lv + ")");
      if (!b.classList.contains("swatch-color")) b.textContent = v + " · lv " + lv;
    });
  }
  function showUnlocks(r) {
    var locked = { acc: {}, theme: {} }, next = null;
    (r.cosmetics || []).forEach(function (u) {
      if (u.unlocked) return;
      locked[u.kind][u.id] = u.level;
      if (!next) next = u;
    });
    lockRow($("#b-acc"), window.ccAvatarParts.accs, locked.acc);
    lockRow($("#theme-pick"), Object.keys(THEMES), locked.theme);
    $("#lvl-unlock").textContent = next ? "next unlock: " + next.name + " at level " + next.level : "every level unlock earned. show it off.";
  }
  var unlockedBadges = [];
  function setFace(k) {
    api("/api/me/avatar", { avatar: k }).then(function (r) {
      if (!r.ok) return;
      $("#me-avatar").innerHTML = window.ccAvatar(k);
      $("#b-preview").innerHTML = window.ccAvatar(k);
    });
  }
  // a row of radio-style buttons; onPick(value)
  function swatches(root, values, current, label, onPick, colorOf) {
    root.innerHTML = values.map(function (v, i) {
      var c = colorOf ? colorOf(v, i) : null;
      return '<button type="button" role="radio" class="swatch' + (c ? " swatch-color" : "") + '" data-v="' + esc(String(i)) + '" aria-checked="' + (i === current) + '" aria-label="' + esc(label(v, i)) + '"' +
        (c ? ' style="background:' + c + '"' : "") + ">" + (c ? "" : esc(label(v, i))) + "</button>";
    }).join("");
    root.onclick = function (e) {
      var b = e.target.closest(".swatch");
      if (!b) return;
      root.querySelectorAll(".swatch").forEach(function (x) { x.setAttribute("aria-checked", String(x === b)); });
      onPick(+b.dataset.v);
    };
  }
  function initSettings(user) {
    var P = window.ccAvatarParts;
    var m = /^x:([a-z]+)-(\d)-(\d)-([a-z]+)$/.exec(user.avatar || "");
    var face = m ? { mood: P.moods.indexOf(m[1]), face: +m[2], body: +m[3], acc: P.accs.indexOf(m[4]) } : { mood: 1, face: 0, body: 0, acc: 0 };
    function built() { return "x:" + P.moods[face.mood] + "-" + face.face + "-" + face.body + "-" + P.accs[face.acc]; }
    var t = null;
    function changed() { $("#b-preview").innerHTML = window.ccAvatar(built()); clearTimeout(t); t = setTimeout(function () { setFace(built()); }, 400); }
    $("#b-preview").innerHTML = window.ccAvatar(m ? user.avatar : built());
    swatches($("#b-mood"), P.moods, face.mood, function (v) { return v === "x" ? "cooked" : v; }, function (i) { face.mood = i; changed(); });
    swatches($("#b-face"), P.faces, face.face, function (v, i) { return "screen color " + (i + 1); }, function (i) { face.face = i; changed(); }, function (v) { return v; });
    swatches($("#b-body"), P.bodies, face.body, function (v, i) { return "case color " + (i + 1); }, function (i) { face.body = i; changed(); }, function (v) { return v; });
    swatches($("#b-acc"), P.accs, face.acc, function (v) { return v; }, function (i) { face.acc = i; changed(); });

    var form = $("#form-profile"), theme = "lime";
    var themeKeys = Object.keys(THEMES);
    $("#fav-select").innerHTML = '<option value="">none</option>' + Object.keys(catalog).map(function (s) { return '<option value="' + esc(s) + '">' + esc(catalog[s].title) + "</option>"; }).join("");
    form.bio.addEventListener("input", function () { $("#bio-count").textContent = form.bio.value.length + "/160"; });
    api("/api/me/profile").then(function (r) {
      if (!r.ok) return;
      var p = r.profile;
      form.display_name.value = p.display_name || "";
      form.bio.value = p.bio || ""; $("#bio-count").textContent = form.bio.value.length + "/160";
      form.fav_game.value = p.fav_game || "";
      form.public.checked = p.public;
      theme = p.theme || "lime";
      swatches($("#theme-pick"), themeKeys, themeKeys.indexOf(theme), function (v) { return v; }, function (i) { theme = themeKeys[i]; }, function (v) { return THEMES[v]; });
      showUnlocks(r);
      pinned = p.badges || [];
      renderBadges();
      var ef = $("#form-email");
      ef.email.value = r.email || "";
      ef.news.checked = !!r.news_optin;
    });
    var pinned = [];
    function renderBadges() {
      if (!unlockedBadges.length) return;
      $("#badge-pick").innerHTML = unlockedBadges.map(function (a) {
        var k = a.game + ":" + a.id;
        return '<label class="me-check"><input type="checkbox" value="' + esc(k) + '"' + (pinned.indexOf(k) >= 0 ? " checked" : "") + "> " + esc(a.name) + "</label>";
      }).join("");
    }
    $("#badge-pick").addEventListener("change", function (e) {
      var boxes = [].slice.call($("#badge-pick").querySelectorAll("input:checked"));
      if (boxes.length > 3) { e.target.checked = false; return; }
      pinned = boxes.map(function (x) { return x.value; });
    });
    showProfile.renderBadges = renderBadges;

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = form.querySelector(".me-msg");
      msg.textContent = "…";
      api("/api/me/profile", { display_name: form.display_name.value, bio: form.bio.value, fav_game: form.fav_game.value, badges: pinned, theme: theme, public: form.public.checked })
        .then(function (r) { msg.textContent = r.ok ? "saved." : (r.error || "that didn't work."); });
    });

    var ef = $("#form-email");
    ef.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = ef.querySelector(".me-msg");
      api("/api/me/email", { email: ef.email.value, news: ef.news.checked }).then(function (r) {
        msg.textContent = r.ok ? (r.email ? "saved. we'll verify it once email sending is set up." : "email removed.") : (r.error || "that didn't work.");
      });
    });
    var pf = $("#form-password");
    pf.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = pf.querySelector(".me-msg");
      api("/api/me/password", { current: pf.current.value, next: pf.next.value }).then(function (r) {
        msg.textContent = r.ok ? "changed. other devices are logged out." : (r.error || "that didn't work.");
        if (r.ok) pf.reset();
      });
    });
    $("#btn-logout-all").addEventListener("click", function () {
      if (!confirm("log out on every device, including this one?")) return;
      api("/api/me/logout-all", {}).then(function () { ls("cc-user-change", String(Date.now())); location.reload(); });
    });
    var df = $("#form-delete");
    df.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = df.querySelector(".me-msg");
      if (!confirm("delete your account for good? this can't be undone.")) return;
      api("/api/me/delete", { password: df.password.value }).then(function (r) {
        if (!r.ok) { msg.textContent = r.error || "that didn't work."; return; }
        ls("cc-user-change", String(Date.now()));
        location.reload();
      });
    });
  }

  /* ---------- friends (slice D1) ---------- */
  function person(p, note, buttons) {
    return '<li><a class="me-person" href="/u/' + encodeURIComponent(p.username) + '"><span class="me-person-face">' + window.ccAvatar(p.avatar) + "</span>" +
      "<b>" + esc(p.name) + "</b><small>" + (p.name !== p.username ? "@" + esc(p.username) + " · " : "") + "lv " + p.level + (note ? " · " + note : "") + "</small></a>" +
      '<span class="me-person-act">' + buttons.map(function (b) {
        return '<button type="button" class="tool' + (b[2] ? " is-quiet" : "") + '" data-act="' + b[0] + '" data-u="' + esc(p.username) + '">' + b[1] + "</button>";
      }).join("") + "</span></li>";
  }
  function loadFriends() {
    api("/api/me/friends").then(function (r) {
      if (!r.ok) return;
      $("#fr-count").textContent = r.friends.length ? String(r.friends.length) : "";
      $("#fr-incoming").innerHTML = r.incoming.map(function (p) { return person(p, "wants to be friends", [["accept", "accept"], ["decline", "decline", 1]]); }).join("");
      $("#fr-list").innerHTML = r.friends.length ? r.friends.map(function (p) { return person(p, "", [["remove", "remove", 1], ["block", "block", 1]]); }).join("")
        : '<li class="me-empty">no friends yet. add someone by username, then compare scores on the friends tab of any leaderboard.</li>';
      $("#fr-out").innerHTML = r.outgoing.map(function (p) { return person(p, "request sent", [["cancel", "cancel", 1]]); }).join("");
      $("#fr-blocked-wrap").hidden = !r.blocked.length;
      $("#fr-blocked").innerHTML = r.blocked.map(function (p) { return person(p, "", [["unblock", "unblock", 1]]); }).join("");
    });
  }
  var DONE = { requested: "request sent.", friends: "you're friends now.", none: "", blocked: "blocked. they can't add you anymore." };
  function friendDo(action, username, msg) {
    return api("/api/me/friends", { action: action, username: username }).then(function (r) {
      if (msg) msg.textContent = r.ok ? DONE[r.status] || "" : r.error || "that didn't work.";
      if (r.ok) loadFriends();
      return r;
    });
  }
  function initFriends() {
    var ff = $("#form-friend");
    ff.addEventListener("submit", function (e) {
      e.preventDefault();
      friendDo("add", ff.username.value.trim(), ff.querySelector(".me-msg")).then(function (r) { if (r.ok) ff.reset(); });
    });
    $("#friends").addEventListener("click", function (e) {
      var b = e.target.closest("button[data-act]");
      if (!b) return;
      var act = b.dataset.act;
      if (act === "remove" && !confirm("remove " + b.dataset.u + " from your friends?")) return;
      if (act === "block" && !confirm("block " + b.dataset.u + "? they're removed and can't add you again.")) return;
      b.disabled = true;
      friendDo(act, b.dataset.u, ff.querySelector(".me-msg"));
    });
    loadFriends();
  }

  function mins(ms) { var m = Math.round((ms || 0) / 60000); return m < 1 ? "<1 min" : m + " min"; }
  var KIND = { play: "run", first: "first time", streak: "streak bonus", achievement: "achievement", challenge: "weekly challenge" };
  function ago(ts) {
    var m = Math.round((Date.now() - ts) / 60000);
    return m < 1 ? "just now" : m < 60 ? m + "m ago" : m < 1440 ? Math.round(m / 60) + "h ago" : Math.round(m / 1440) + "d ago";
  }
  function loadFeed() {
    api("/api/me/feed").then(function (r) {
      if (!r.ok) return;
      $("#feed").innerHTML = r.items.length ? r.items.map(function (i) {
        var g = i.game ? '<a href="/games/' + encodeURIComponent(i.game) + '/">' + esc(i.title) + "</a> · " : "";
        return '<li class="is-' + esc(i.kind) + '"><span>' + g + esc(i.text) + "</span><small>" + ago(i.ts) + "</small></li>";
      }).join("") : '<li class="me-empty">things you do in games show up here: words your smols learn, levels you clear, badges you earn.</li>';
    });
  }
  function showXp(s) {
    var x = s.xp, span = Math.max(1, x.next - x.floor), pct = Math.min(100, Math.round(100 * (x.xp - x.floor) / span));
    $("#lvl-n").textContent = "level " + x.level;
    $("#lvl-title").textContent = x.title;
    $("#lvl-fill").style.width = pct + "%";
    $("#lvl-bar").setAttribute("aria-valuenow", String(pct));
    $("#lvl-x").textContent = x.xp + " xp · " + (x.next - x.xp) + " to level " + (x.level + 1);
    var gotList = s.achievements.filter(function (a) { return a.unlocked_at; });
    var got = gotList.length;
    unlockedBadges = gotList;
    if (showProfile.renderBadges) showProfile.renderBadges();
    $("#ach-count").textContent = got + "/" + s.achievements.length;
    $("#achs").innerHTML = s.achievements.map(function (a) {
      var where = a.game === "site" ? "" : " · " + esc((catalog[a.game] || {}).title || a.game);
      return '<li class="' + (a.unlocked_at ? "is-got" : "") + (a.event ? " is-event" : "") + '"><b>' + esc(a.name) + '</b><span>' + esc(a.desc) + where + '</span><i>+' + a.xp + " xp" + (a.event ? " · " + esc(a.event) + " event" : "") + "</i></li>";
    }).join("");
    $("#xp-log").innerHTML = s.xp_history.length ? s.xp_history.map(function (h) {
      var g = h.game ? " · " + esc((catalog[h.game] || {}).title || h.game) : "";
      return "<li><b>+" + h.amount + "</b> " + esc(KIND[h.kind] || h.kind) + g + "</li>";
    }).join("") : '<li class="me-empty">finish a run of 10s or more to start earning.</li>';
  }

  fetch("/games/games.json").then(function (r) { return r.json(); }).catch(function () { return { games: [] }; }).then(function (d) {
    (d.games || []).forEach(function (g) { catalog[g.slug] = g; });
    return fetch("/api/health").then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }).then(function (h) {
    if (!h || !h.db) { $("#auth").hidden = true; $("#soon").hidden = false; return null; }
    return api("/api/me");
  }).then(function (r) {
    if (r === null) return;
    if (r && r.user) showProfile(r.user);
    else {
      $("#auth").hidden = false;
      if (blocked && Date.now() - blocked < 86400000) noAccount();
    }
  });
})();
