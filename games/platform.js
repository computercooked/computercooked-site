/* Player-page panel: leaderboard, feedback (thumbs + text), favorite heart, account chip.
   Needs cc-sdk.js loaded first. Mount: <div id="cc-panel" data-game="slug"></div> */
(function () {
  "use strict";
  var panel = document.getElementById("cc-panel");
  var cc = window.cc;
  if (!panel || !cc) return;
  var game = panel.dataset.game || cc._game();
  cc._apiReady().then(function (up) { if (up) mount(); });
  function mount() {
  var me = null, info = null, period = "day";

  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function api(path, body) {
    return fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, error: "offline?" }; });
  }
  function fmt(n) { return n == null ? "" : (Math.round(n * 10) / 10).toLocaleString("en-US"); }

  panel.innerHTML =
    '<div class="about-card cc-board" hidden>' +
      '<div class="cc-head"><h2>// leaderboard</h2>' +
        '<div class="cc-tabs" role="tablist" aria-label="leaderboard period">' +
          '<button type="button" role="tab" data-p="day" aria-selected="true">today</button>' +
          '<button type="button" role="tab" data-p="week" aria-selected="false">week</button>' +
          '<button type="button" role="tab" data-p="all" aria-selected="false">all time</button>' +
          '<button type="button" role="tab" data-p="friends" aria-selected="false" hidden>friends</button>' +
        "</div></div>" +
      '<p class="cc-challenge" hidden></p>' +
      '<ol class="cc-rows" aria-live="polite"><li class="cc-empty">loading…</li></ol>' +
      '<p class="cc-guest" hidden><label>leaderboard name <input type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="guest name"></label> <a href="/me/">or make an account</a></p>' +
    "</div>" +
    '<div class="about-card cc-fb" id="cc-feedback">' +
      '<div class="cc-head"><h2>// how was it?</h2>' +
        '<button type="button" class="cc-heart" aria-pressed="false" aria-label="favorite" hidden>♡</button></div>' +
      '<div class="cc-thumbs">' +
        '<button type="button" data-r="1" aria-pressed="false" aria-label="thumbs up">👍</button>' +
        '<button type="button" data-r="-1" aria-pressed="false" aria-label="thumbs down">👎</button>' +
      "</div>" +
      '<label class="cc-label" for="cc-fb-text">what would make this better?</label>' +
      '<textarea id="cc-fb-text" maxlength="1000" rows="3" placeholder="be honest. the computer can take it. (it cannot)"></textarea>' +
      '<div class="cc-row"><button type="button" class="cc-send">send</button><span class="cc-msg" role="status"></span></div>' +
    "</div>";

  /* ---------- account chip (next to the breadcrumbs) ---------- */
  var crumbs = document.querySelector(".crumbs");
  var chip = el('<a class="cc-chip" href="/me/">log in</a>');
  if (crumbs) crumbs.appendChild(chip);

  /* ---------- leaderboard ---------- */
  var board = panel.querySelector(".cc-board");
  var rows = panel.querySelector(".cc-rows");
  var guestBox = panel.querySelector(".cc-guest");
  var guestInput = guestBox.querySelector("input");

  function loadBoard() {
    var friends = period === "friends";
    var url = "/api/leaderboard?game=" + encodeURIComponent(game) + "&period=" + (friends ? "all&friends=1" : period) + "&player=" + encodeURIComponent("a:" + cc._anon);
    api(url).then(function (r) {
      if (!r.ok) { rows.innerHTML = '<li class="cc-empty">leaderboard is napping. try later.</li>'; return; }
      if (!r.rows.length) {
        rows.innerHTML = friends
          ? '<li class="cc-empty">no friend scores yet. <a href="/me/#friends">add friends</a> and dare them.</li>'
          : '<li class="cc-empty">nobody yet. be the first casualty.</li>';
        return;
      }
      rows.innerHTML = r.rows.map(function (x) {
        var name = x.u ? '<a href="/u/' + encodeURIComponent(x.u) + '">' + esc(x.name) + "</a>" : esc(x.name);
        return '<li class="' + (x.me ? "is-me" : "") + '"><span class="cc-rank">' + x.rank + '</span><span class="cc-name">' + name +
          '</span><span class="cc-score">' + fmt(x.score) + '</span><button type="button" class="cc-flag" data-id="' + x.id + '" aria-label="report ' + esc(x.name) + '" title="report">⚑</button></li>';
      }).join("");
    });
  }
  panel.querySelectorAll(".cc-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      period = b.dataset.p;
      panel.querySelectorAll(".cc-tabs button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      loadBoard();
    });
  });
  rows.addEventListener("click", function (e) {
    var f = e.target.closest(".cc-flag");
    if (!f || f.disabled) return;
    if (!confirm("report this name or score as offensive or fake?")) return;
    f.disabled = true;
    api("/api/report", { kind: "score", target: f.dataset.id, reason: "player report", anon: cc._anon }).then(function () { f.textContent = "✓"; });
  });
  guestInput.value = cc.guestName() || "";
  guestInput.addEventListener("change", function () { cc.guestName(guestInput.value.trim()); });

  /* ---------- feedback ---------- */
  var rating = 0;
  var fb = panel.querySelector(".cc-fb");
  var msg = fb.querySelector(".cc-msg");
  var ta = fb.querySelector("textarea");
  fb.querySelectorAll(".cc-thumbs button").forEach(function (b) {
    b.addEventListener("click", function () {
      rating = rating === +b.dataset.r ? 0 : +b.dataset.r;
      fb.querySelectorAll(".cc-thumbs button").forEach(function (x) { x.setAttribute("aria-pressed", String(+x.dataset.r === rating)); });
      if (rating && !ta.value.trim()) send(true);
    });
  });
  var sentThumb = false;
  function send(thumbOnly) {
    var text = thumbOnly ? "" : ta.value.trim();
    if (!rating && !text) { msg.textContent = "pick a thumb or type something."; return; }
    if (thumbOnly && sentThumb) return;
    msg.textContent = "sending…";
    api("/api/feedback", { game: game, version: cc._version(), rating: text && sentThumb ? 0 : rating, text: text, tester: cc._tester(), anon: cc._anon, play_id: cc._lastPlay() })
      .then(function (r) {
        if (!r.ok) { msg.textContent = r.error || "couldn't send. try again."; return; }
        if (thumbOnly) { sentThumb = true; msg.textContent = "noted. tell us more below?"; }
        else { ta.value = ""; sentThumb = true; msg.textContent = "got it. thank you. we read every one."; }
      });
  }
  fb.querySelector(".cc-send").addEventListener("click", function () { send(false); });

  /* ---------- favorite + account ---------- */
  var heart = fb.querySelector(".cc-heart");
  function setHeart(on) { heart.setAttribute("aria-pressed", String(on)); heart.textContent = on ? "♥" : "♡"; heart.title = on ? "unfavorite" : "favorite"; }
  heart.addEventListener("click", function () {
    var on = heart.getAttribute("aria-pressed") !== "true";
    setHeart(on);
    api("/api/me/favorite", { game: game, on: on });
  });

  api("/api/me").then(function (r) {
    me = r && r.user;
    if (me) {
      chip.textContent = me.username;
      chip.classList.add("is-in");
      panel.querySelector('.cc-tabs [data-p="friends"]').hidden = false;
      heart.hidden = false;
      api("/api/me/summary").then(function (s) { if (s.ok) setHeart(s.favorites.indexOf(game) >= 0); });
    } else {
      guestBox.hidden = false;
    }
  });

  /* ---------- does this game have a leaderboard? ---------- */
  fetch("/games/games.json").then(function (r) { return r.json(); }).then(function (d) {
    info = (d.games || []).filter(function (g) { return g.slug === game; })[0];
    if (info && info.version) cc._setGame(game, info.version);
    if (info && info.max_score_per_sec) { board.hidden = false; loadBoard(); loadChallenge(); }
  }).catch(function () {});

  /* ---------- weekly challenge line on the featured game (slice D2) ---------- */
  function loadChallenge() {
    api("/api/challenge").then(function (r) {
      var c = r && r.ok && r.challenge, p = panel.querySelector(".cc-challenge");
      if (!c || c.game !== game) return;
      p.innerHTML = "<b>weekly challenge</b> · " + esc(c.goal) + " · " + (c.done ? "done ✓" : "+" + c.xp + " xp" + (me ? "" : ' · <a href="/me/">log in</a> to earn it'));
      p.hidden = false;
    });
  }

  /* ---------- after a run ---------- */
  document.addEventListener("cc:end", function (e) {
    if (!board.hidden) setTimeout(loadBoard, 300);
    fb.classList.add("cc-pulse");
    setTimeout(function () { fb.classList.remove("cc-pulse"); }, 2400);
    var r = e.detail && e.detail.result;
    var say = window.ccToast || function () {};
    if (r && r.accepted) say("#" + r.rank + " on the all-time board" + (r.best === e.detail.score ? " · new best" : ""));
    var x = r && r.xp;
    if (x && x.gained > 0) {
      say("+" + x.gained + " xp" + (x.parts && x.parts.some(function (p) { return p.kind === "first"; }) ? " · first time playing" : ""));
      if (x.parts && x.parts.some(function (p) { return p.kind === "challenge"; })) { say("weekly challenge done ✓"); loadChallenge(); }
      if (x.leveled_up) levelUp(x);
    } else if (x && x.parts && x.parts.some(function (p) { return p.kind === "cap"; })) {
      say("daily xp for this game maxed. try another one.");
    } else if (r && !x && !me && !nudged()) {
      say("log in to earn xp and levels for runs like that.");
    }
  });
  document.addEventListener("cc:achieve", function (e) {
    var a = e.detail;
    if (a && window.ccToast) window.ccToast("unlocked: " + a.name + (a.xp ? " · +" + a.xp + " xp" : ""));
  });
  function nudged() {
    try { if (sessionStorage.getItem("cc-xp-nudge")) return true; sessionStorage.setItem("cc-xp-nudge", "1"); } catch (e) {}
    return false;
  }
  // level up: a toast, plus a share button on the panel for the rest of the visit
  function levelUp(x) {
    if (window.ccToast) window.ccToast("level " + x.level + " · " + x.title);
    var box = document.getElementById("cc-levelup");
    if (!box) { box = document.createElement("div"); box.id = "cc-levelup"; box.className = "cc-levelup"; panel.insertBefore(box, panel.firstChild); }
    box.innerHTML = '<p><b>level ' + x.level + '</b> · ' + esc(x.title) + '</p><button type="button" class="tool">share</button>';
    box.querySelector("button").addEventListener("click", function () {
      var text = "just hit level " + x.level + " (" + x.title + ") on computer cooked games.";
      var url = "https://computercooked.com/games/";
      if (navigator.share) navigator.share({ text: text, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + " " + url).then(function () { window.ccToast && window.ccToast("copied."); });
    });
  }
  }
})();
