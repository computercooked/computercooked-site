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
        showProfile(r.user);
      });
    });
  }
  submit($("#form-login"), "/api/auth/login");
  submit($("#form-signup"), "/api/auth/signup", function () { return { avatar: chosen }; });

  $("#btn-logout").addEventListener("click", function () {
    api("/api/auth/logout", {}).then(function () { location.reload(); });
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
    picker($("#avatar-change"), user.avatar, function (k) {
      api("/api/me/avatar", { avatar: k }).then(function (r) { if (r.ok) $("#me-avatar").innerHTML = window.ccAvatar(k); });
    });
    api("/api/me/summary").then(function (s) {
      if (!s.ok) return;
      $("#me-streak").textContent = s.streak;
      $("#me-days").textContent = s.days_played;
      var best = {};
      s.bests.forEach(function (b) { best[b.game] = b.best; });
      $("#favs").innerHTML = s.favorites.length ? s.favorites.map(function (g) { return card(g, best[g] ? "best " + Math.round(best[g]) : ""); }).join("")
        : '<li class="me-empty">tap ♡ on a game page to keep it here.</li>';
      $("#recent").innerHTML = s.recent.length ? s.recent.map(function (r) { return card(r.game, r.plays + (r.plays === 1 ? " play" : " plays") + (best[r.game] ? " · best " + Math.round(best[r.game]) : "")); }).join("")
        : '<li class="me-empty">nothing yet. <a href="/games/">go play something</a>.</li>';
    });
  }

  fetch("/games/games.json").then(function (r) { return r.json(); }).catch(function () { return { games: [] }; }).then(function (d) {
    (d.games || []).forEach(function (g) { catalog[g.slug] = g; });
    return api("/api/me");
  }).then(function (r) {
    if (r && r.user) showProfile(r.user);
    else {
      $("#auth").hidden = false;
      if (blocked && Date.now() - blocked < 86400000) noAccount();
    }
  });
})();
