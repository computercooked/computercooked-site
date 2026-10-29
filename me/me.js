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
        loggedIn(r);
      });
    });
  }
  function loggedIn(r) {
    try { localStorage.removeItem("cc-guest-xp"); } catch (e) {} // K-0030 step 1: the server replayed the guest xp
    ls("cc-user-change", String(Date.now())); // open game tabs pick up the login and sync their saves
    showProfile(r.user);
    if (r.recovery_codes) showCodes(r.recovery_codes); // K-0030 step 5: new accounts see their codes once
  }
  submit($("#form-login"), "/api/auth/login");
  // a dare link opened in the last 30 days credits whoever sent it (see games/platform.js)
  function refDare() {
    try { var r = JSON.parse(ls("cc-ref-dare") || "null"); return r && Date.now() - r.t < 30 * 86400000 ? r.d : undefined; } catch (e) { return undefined; }
  }
  submit($("#form-signup"), "/api/auth/signup", function () { return { avatar: chosen, ref_dare: refDare() }; });

  $("#btn-logout").addEventListener("click", function () {
    api("/api/auth/logout", {}).then(function () { ls("cc-user-change", String(Date.now())); location.reload(); });
  });

  /* ---------- K-0030 step 5: recovery codes + passkeys ---------- */
  function b64u(buf) { var s = "", a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
  function unb64u(s) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
  var canPasskey = !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  function pkError(e, fallback) {
    if (e && e.name === "NotAllowedError") return "cancelled. nothing changed.";
    if (e && e.name === "InvalidStateError") return "this device already has a passkey here.";
    return (e && e.message) || fallback;
  }
  function deviceName() {
    var ua = navigator.userAgent;
    return /iPhone/.test(ua) ? "iphone" : /iPad/.test(ua) ? "ipad" : /Android/.test(ua) ? "android" : /Mac/.test(ua) ? "mac" : /Windows/.test(ua) ? "windows pc" : /CrOS/.test(ua) ? "chromebook" : "passkey";
  }

  // shown once, right after sign-up or "make new codes"
  function showCodes(codes) {
    var box = $("#me-codes");
    var text = "computer cooked recovery codes for " + ($("#me-name").textContent || "your account") + "\n" +
      "each code works once. use one at computercooked.com/me if you forget your password.\n\n" + codes.join("\n") + "\n";
    box.innerHTML = '<h2 id="codes-h">save your recovery codes</h2>' +
      "<p>there's no email reset here. if you forget your password, one of these gets you back in. each works once, and we can't show them again.</p>" +
      '<ol class="me-codes-list">' + codes.map(function (c) { return "<li><code>" + esc(c) + "</code></li>"; }).join("") + "</ol>" +
      '<div class="me-row"><button class="tool" type="button" data-act="copy">copy</button><button class="tool" type="button" data-act="save">download .txt</button>' +
      '<button class="play-btn" type="button" data-act="done">i saved them</button></div><p class="me-msg" role="status"></p>';
    box.hidden = false;
    box.scrollIntoView({ block: "start" });
    var msg = box.querySelector(".me-msg");
    box.querySelector('[data-act="copy"]').addEventListener("click", function () {
      (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { msg.textContent = "copied. paste them somewhere safe."; }, function () { msg.textContent = "couldn't copy. write them down instead."; });
    });
    box.querySelector('[data-act="save"]').addEventListener("click", function () {
      var a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
      a.download = "computercooked-recovery-codes.txt";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      msg.textContent = "saved to your downloads.";
    });
    box.querySelector('[data-act="done"]').addEventListener("click", function () { box.hidden = true; box.innerHTML = ""; });
  }
  // older accounts (and anyone who used them all) get a nudge to make some
  function nudgeCodes() {
    var box = $("#me-codes");
    box.innerHTML = '<h2 id="codes-h">get recovery codes</h2><p>if you forget your password, there is no email reset, so make a set of one-time codes now and keep them somewhere safe.</p>' +
      '<div class="me-row"><button class="play-btn" type="button" data-act="go">make codes</button></div>';
    box.hidden = false;
    box.querySelector('[data-act="go"]').addEventListener("click", function () {
      var s = $("#account-settings"); s.open = true;
      box.hidden = true;
      $("#form-recovery").scrollIntoView({ block: "center" });
      $("#form-recovery").password.focus();
    });
  }

  function initRecovery() {
    var rf = $("#form-recovery"), note = $("#recovery-note");
    function left(n) {
      note.textContent = n ? n + " of 8 codes left. making new ones replaces them." : "you have no recovery codes. make some so a forgotten password can't lock you out.";
      if (!n && $("#me-codes").hidden) nudgeCodes();
    }
    api("/api/me/recovery").then(function (r) { if (r && r.ok) left(r.left); });
    rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = rf.querySelector(".me-msg");
      api("/api/me/recovery", { password: rf.password.value }).then(function (r) {
        if (!r.ok) { msg.textContent = r.error || "that didn't work."; return; }
        rf.reset(); msg.textContent = "new codes made. the old ones stopped working.";
        left(r.codes.length);
        showCodes(r.codes);
      });
    });
  }

  function initPasskeys() {
    var pf = $("#form-passkey"), list = $("#passkey-list");
    if (!canPasskey) { $("#passkey-note").textContent = "this browser can't do passkeys. your password still works everywhere."; pf.password.hidden = pf.querySelector("button").hidden = true; return; }
    function day(t) { return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toLowerCase(); }
    function render(keys) {
      list.innerHTML = keys.map(function (k) {
        return '<li><span><b>' + esc(k.label) + "</b> <small>added " + day(k.created_at) + (k.last_used ? " · last used " + day(k.last_used) : "") + '</small></span><button class="tool" type="button" data-id="' + esc(k.id) + '">remove</button></li>';
      }).join("");
    }
    api("/api/me/passkeys").then(function (r) { if (r && r.ok) render(r.passkeys); });
    list.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-id]");
      if (!b || !confirm("remove this passkey? you can still log in with your password.")) return;
      api("/api/me/passkey/delete", { id: b.dataset.id }).then(function (r) { if (r.ok) render(r.passkeys); });
    });
    pf.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = pf.querySelector(".me-msg"), btn = pf.querySelector("button[type=submit]");
      btn.disabled = true; msg.textContent = "…";
      api("/api/me/passkey/options", { password: pf.password.value }).then(function (o) {
        if (!o.ok) throw new Error(o.error || "that didn't work.");
        var pk = o.publicKey;
        pk.challenge = unb64u(pk.challenge);
        pk.user.id = unb64u(pk.user.id);
        pk.excludeCredentials = pk.excludeCredentials.map(function (x) { return { type: "public-key", id: unb64u(x.id) }; });
        return navigator.credentials.create({ publicKey: pk });
      }).then(function (c) {
        var res = c.response;
        if (!res.getPublicKey || !res.getAuthenticatorData) throw new Error("this browser is too old to add a passkey.");
        return api("/api/me/passkey", { id: c.id, clientDataJSON: b64u(res.clientDataJSON), authenticatorData: b64u(res.getAuthenticatorData()), publicKey: b64u(res.getPublicKey()), alg: res.getPublicKeyAlgorithm(), label: deviceName() });
      }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) { msg.textContent = r.error || "that didn't work."; return; }
        pf.reset(); msg.textContent = "passkey added. next time, tap \"log in with a passkey\".";
        render(r.passkeys);
      }).catch(function (err) { btn.disabled = false; msg.textContent = pkError(err, "that didn't work."); });
    });
  }

  // logged out: passkey log-in, and the recovery form
  (function () {
    var lf = $("#form-login"), rf = $("#form-recover"), pkBtn = $("#btn-passkey-login");
    pkBtn.hidden = !canPasskey;
    pkBtn.addEventListener("click", function () {
      var msg = lf.querySelector(".me-msg");
      msg.textContent = "…"; pkBtn.disabled = true;
      api("/api/auth/passkey/options", {}).then(function (o) {
        if (!o.ok) throw new Error(o.error || "that didn't work.");
        o.publicKey.challenge = unb64u(o.publicKey.challenge);
        return navigator.credentials.get({ publicKey: o.publicKey });
      }).then(function (c) {
        var res = c.response;
        return api("/api/auth/passkey", { id: c.id, clientDataJSON: b64u(res.clientDataJSON), authenticatorData: b64u(res.authenticatorData), signature: b64u(res.signature), anon_id: anon });
      }).then(function (r) {
        pkBtn.disabled = false;
        if (!r.ok) { msg.textContent = r.error || "that passkey didn't work."; return; }
        msg.textContent = "";
        loggedIn(r);
      }).catch(function (err) { pkBtn.disabled = false; msg.textContent = pkError(err, "that passkey didn't work. try your password."); });
    });
    function show(recover) {
      lf.hidden = recover; rf.hidden = !recover;
      document.querySelector(".me-tabs").hidden = recover;
      (recover ? rf.username : lf.username).focus();
    }
    $("#btn-forgot").addEventListener("click", function () { show(true); });
    $("#btn-back-login").addEventListener("click", function () { show(false); });
    rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = rf.querySelector(".me-msg"), btn = rf.querySelector("button[type=submit]");
      btn.disabled = true; msg.textContent = "…";
      api("/api/auth/recover", { username: rf.username.value.trim(), code: rf.code.value, password: rf.password.value, anon_id: anon }).then(function (r) {
        btn.disabled = false;
        if (!r.ok) { msg.textContent = r.error || "that didn't work."; return; }
        msg.textContent = "";
        loggedIn(r);
        if (window.ccToast) window.ccToast("you're back in. " + r.left + " recovery code" + (r.left === 1 ? "" : "s") + " left.");
      });
    });
  })();

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
    $("#me-sub").textContent = "your stuff. still no ads. email stays optional.";
    $("#me-name").textContent = user.username;
    $("#me-avatar").innerHTML = window.ccAvatar(user.avatar);
    picker($("#avatar-change"), user.avatar, function (k) { setFace(k); });
    $("#me-public-link").href = "/u/" + encodeURIComponent(user.username);
    initSettings(user);
    initFriends();
    loadFeed();
    loadRecap();
    if (window.ccWeekly) window.ccWeekly($("#me-week"));
    api("/api/me/summary").then(function (s) {
      if (!s.ok) return;
      $("#me-streak").textContent = s.streak;
      $("#me-saver").hidden = !s.streak_saved;
      $("#me-days").textContent = s.days_played;
      var bi = s.brought_in || {};
      $("#me-brought").hidden = !(bi.credited || bi.pending);
      $("#me-brought-n").textContent = bi.credited || 0;
      $("#me-brought").title = "players who joined from your dare links" + (bi.pending ? " (" + bi.pending + " more once they finish a run)" : "") + ". +50 xp each.";
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
  var THEMES = { lime: "#C5FF49", lilac: "#B59AFF", hot: "#ff8a7d", ice: "#5bc8ff", cooked: "#ffb84d", paper: "#F5F3ED", mint: "#7dffb0", pink: "#ff6bd6", gold: "#ffd84d", chrome: "#d9e2ec", sunset: "#ff9f43", grape: "#8f5bff", aqua: "#2ee6d6", rose: "#ff9ec4", lemon: "#fff35c", ember: "#ff4d2e" };
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
    var locked = { acc: {}, theme: {}, frame: {}, mood: {}, face: {}, body: {} }, next = null;
    (r.cosmetics || []).forEach(function (u) {
      if (u.unlocked) return;
      locked[u.kind][u.id] = u.level;
      if (!next) next = u;
    });
    lockRow($("#b-acc"), window.ccAvatarParts.accs, locked.acc);
    // K-0030 step 4: moods, screen and case colours unlock by level too
    var P2 = window.ccAvatarParts, idx = function (list) { return list.map(function (_, i) { return String(i); }); };
    lockRow($("#b-mood"), P2.moods, locked.mood);
    lockRow($("#b-face"), idx(P2.faces), locked.face);
    lockRow($("#b-body"), idx(P2.bodies), locked.body);
    lockRow($("#theme-pick"), Object.keys(THEMES), locked.theme);
    lockRow($("#frame-pick"), frameKeys(r), locked.frame);
    // K-0030 step 6: the whole ladder, so every level's reward is visible
    var byLevel = {};
    (r.cosmetics || []).forEach(function (u) { (byLevel[u.level] = byLevel[u.level] || []).push(u); });
    $("#lvl-list").innerHTML = Object.keys(byLevel).map(Number).sort(function (a, b) { return a - b; }).map(function (L) {
      var got = byLevel[L][0].unlocked;
      return '<li class="' + (got ? "is-got" : "") + (L === r.level + 1 ? " is-next" : "") + '"><b>level ' + L + "</b><span>" + byLevel[L].map(function (u) { return esc(u.name); }).join(", ") + "</span><i>" + (got ? "✓" : "") + "</i></li>";
    }).join("");
    $("#lvl-unlock").textContent = next ? "next unlock: " + next.name + " at level " + next.level : "every level unlock earned. show it off.";
  }
  // profile frames: "none" plus the frame unlocks the server lists (it refuses locked ones too)
  function frameKeys(r) { return ["none"].concat((r.cosmetics || []).filter(function (u) { return u.kind === "frame"; }).map(function (u) { return u.id; })); }
  function setFrame(el, f) { if (f && f !== "none") el.dataset.frame = f; else delete el.dataset.frame; }
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
    initRecovery();
    initPasskeys();
    var P = window.ccAvatarParts;
    var m = /^x:([a-z]+)-(\d+)-(\d+)-([a-z]+)$/.exec(user.avatar || "");
    var face = m ? { mood: P.moods.indexOf(m[1]), face: +m[2], body: +m[3], acc: P.accs.indexOf(m[4]) } : { mood: 1, face: 0, body: 0, acc: 0 };
    function built() { return "x:" + P.moods[face.mood] + "-" + face.face + "-" + face.body + "-" + P.accs[face.acc]; }
    var t = null;
    function changed() { $("#b-preview").innerHTML = window.ccAvatar(built()); clearTimeout(t); t = setTimeout(function () { setFace(built()); }, 400); }
    $("#b-preview").innerHTML = window.ccAvatar(m ? user.avatar : built());
    swatches($("#b-mood"), P.moods, face.mood, function (v) { return v === "x" ? "cooked" : v; }, function (i) { face.mood = i; changed(); });
    swatches($("#b-face"), P.faces, face.face, function (v, i) { return "screen color " + (i + 1); }, function (i) { face.face = i; changed(); }, function (v) { return v; });
    swatches($("#b-body"), P.bodies, face.body, function (v, i) { return "case color " + (i + 1); }, function (i) { face.body = i; changed(); }, function (v) { return v; });
    swatches($("#b-acc"), P.accs, face.acc, function (v) { return v; }, function (i) { face.acc = i; changed(); });

    var form = $("#form-profile"), theme = "lime", frame = "none";
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
      var fk = frameKeys(r);
      frame = fk.indexOf(p.frame) >= 0 ? p.frame : "none";
      setFrame($("#me-avatar"), frame);
      setFrame($("#b-preview"), frame);
      swatches($("#frame-pick"), fk, fk.indexOf(frame), function (v) { return v; }, function (i) { frame = fk[i]; setFrame($("#b-preview"), frame); });
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
      api("/api/me/profile", { display_name: form.display_name.value, bio: form.bio.value, fav_game: form.fav_game.value, badges: pinned, theme: theme, frame: frame, public: form.public.checked })
        .then(function (r) {
          msg.textContent = r.ok ? "saved." : (r.error || "that didn't work.");
          if (r.ok) setFrame($("#me-avatar"), r.profile.frame);
        });
    });

    var ef = $("#form-email");
    ef.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = ef.querySelector(".me-msg");
      api("/api/me/email", { email: ef.email.value, news: ef.news.checked }).then(function (r) {
        msg.textContent = r.ok ? (r.email ? "saved. we'll verify it once email sending is set up." : "email removed.") : (r.error || "that didn't work.");
      });
    });
    // K-0030 step 3: change username (once every 30 days, needs the password)
    var uf = $("#form-username");
    function nextNote(t) {
      var n = $("#username-note");
      if (t && t > Date.now()) n.textContent = "you can change it again on " + new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase() + ". capital letters can change any time.";
    }
    api("/api/me/username").then(function (r) { if (r && r.ok) nextNote(r.next_change); });
    uf.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = uf.querySelector(".me-msg");
      api("/api/me/username", { username: uf.username.value.trim(), password: uf.password.value }).then(function (r) {
        if (!r.ok) { msg.textContent = r.error || "that didn't work."; return; }
        msg.textContent = "done. you're " + r.username + " now.";
        uf.reset(); nextNote(r.next_change);
        ls("cc-user-change", String(Date.now()));
        setTimeout(function () { location.reload(); }, 900);
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
      if (r.ok) { loadFriends(); loadFriendsFeed(); }
      return r;
    });
  }
  function loadFriendsFeed() {
    api("/api/me/friends/feed").then(function (r) {
      if (!r.ok) return;
      $("#fr-feed-wrap").hidden = !r.friends;
      if (!r.friends) return;
      $("#fr-feed").innerHTML = r.items.length ? r.items.map(function (i) {
        var who = '<a class="fr-who" href="/u/' + encodeURIComponent(i.who.username) + '"><span class="fr-face">' + window.ccAvatar(i.who.avatar) + "</span>" + esc(i.who.name) + "</a>";
        var g = i.game ? ' · <a href="/games/' + encodeURIComponent(i.game) + '/">' + esc(i.title) + "</a>" : "";
        return '<li class="is-' + esc(i.kind) + '"><span>' + who + " " + esc(i.text) + g + "</span><small>" + ago(i.ts) + "</small></li>";
      }).join("") : '<li class="me-empty">quiet week. go set a score for them to chase.</li>';
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
    loadFriendsFeed();
  }

  function mins(ms) { var m = Math.round((ms || 0) / 60000); return m < 1 ? "<1 min" : m + " min"; }
  var KIND = { play: "run", first: "first time", streak: "streak bonus", achievement: "achievement", challenge: "weekly challenge", daily3: "daily 3 done", dare: "someone took your dare", referral: "brought in a new player" };
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
  // your week in numbers: last full week (Mon-Sun, UTC) all week long, or this week so far
  function loadRecap() {
    Promise.all([api("/api/me/recap?week=last"), api("/api/me/recap?week=this")]).then(function (rs) {
      var weeks = { last: rs[0] && rs[0].recap, "this": rs[1] && rs[1].recap };
      if (!weeks.last && !weeks["this"]) return;
      $("#me-recap").hidden = false;
      var tabs = $("#recap-tabs");
      tabs.hidden = !(weeks.last && weeks["this"]);
      tabs.onclick = function (e) {
        var b = e.target.closest("button");
        if (b) showRecap(weeks[b.dataset.week], b.dataset.week);
      };
      showRecap(weeks.last || weeks["this"], weeks.last ? "last" : "this");
    });
  }
  function showRecap(r, which) {
    $("#recap-tabs").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.week === which)); });
    function day(d) { return new Date(d + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" }); }
    function num(n) { return Math.round(n).toLocaleString(); }
    function delta(n, p) {
      if (!r.complete || !p) return "";
      var d = n - p;
      return d === 0 ? "<i>same as the week before</i>" : '<i class="' + (d > 0 ? "is-up" : "") + '">' + (d > 0 ? "▲ " : "▼ ") + num(Math.abs(d)) + " vs week before</i>";
    }
    function stat(v, label, extra) { return "<li><b>" + v + "</b><span>" + label + "</span>" + (extra || "") + "</li>"; }
    $("#recap-dates").textContent = day(r.from) + " – " + day(r.to) + (r.complete ? "" : " · so far");
    $("#recap-stats").innerHTML = stat(num(r.runs), r.runs === 1 ? "run" : "runs", delta(r.runs, r.prev.runs)) +
      stat(r.minutes < 1 ? "<1" : num(r.minutes), r.minutes === 1 ? "minute played" : "minutes played") +
      stat(num(r.games), r.games === 1 ? "game" : "games") +
      stat(r.days + "/7", "days you played") +
      stat("+" + num(r.xp), "xp", delta(r.xp, r.prev.xp));
    var top = $("#recap-top");
    top.hidden = !r.top;
    if (r.top) top.innerHTML = 'most played: <a href="/games/' + encodeURIComponent(r.top.game) + '/">' + esc(r.top.title) + "</a> · " + r.top.runs + (r.top.runs === 1 ? " run" : " runs") + " · " + mins(r.top.minutes * 60000);
    var lines = [];
    if (r.level.to > r.level.from) lines.push('<li class="is-achievement"><span>levelled up: ' + r.level.from + " → " + r.level.to + " (" + esc(r.level.title) + ")</span></li>");
    r.bests.forEach(function (b) {
      var g = '<a href="/games/' + encodeURIComponent(b.game) + '/">' + esc(b.title) + "</a>";
      lines.push('<li class="is-best"><span>' + (b.prev === null ? "first score on " + g + ": " + num(b.score) : "new best on " + g + ": " + num(b.score) + " (was " + num(b.prev) + ")") + "</span></li>");
    });
    if (r.bests_total > r.bests.length) lines.push("<li><span>+" + (r.bests_total - r.bests.length) + " more new bests</span></li>");
    r.achievements.forEach(function (a) {
      var where = a.game === "site" ? "" : " · " + esc((catalog[a.game] || {}).title || a.game);
      lines.push('<li class="is-achievement"><span>badge: ' + esc(a.name) + where + "</span></li>");
    });
    if (r.achievements_total > r.achievements.length) lines.push("<li><span>+" + (r.achievements_total - r.achievements.length) + " more badges</span></li>");
    $("#recap-moments").innerHTML = lines.join("");
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
