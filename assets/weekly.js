/* K-0030 step 6: "this week's top xp" across every game (GET /api/xp/week). Used on /me and /games/daily/.
   window.ccWeekly(root): fills root with the board; faces come from /assets/avatars.js (loaded when needed). */
(function () {
  "use strict";
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function faces(cb) {
    if (window.ccAvatar) return cb();
    var s = document.createElement("script"); s.src = "/assets/avatars.js"; s.onload = cb; s.onerror = cb; document.head.appendChild(s);
  }
  function left(ms) {
    var h = Math.max(0, Math.round((ms - Date.now()) / 3600000));
    return h >= 48 ? Math.round(h / 24) + " days" : h + " hours";
  }
  window.ccWeekly = function (root) {
    if (!root) return;
    fetch("/api/xp/week", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (d) {
      if (!d || !d.ok) { root.hidden = true; return; }
      faces(function () {
        var face = function (a) { return window.ccAvatar && a ? '<span class="wk-face" aria-hidden="true">' + window.ccAvatar(a) + "</span>" : '<span class="wk-face" aria-hidden="true"></span>'; };
        var rows = d.rows.map(function (r) {
          return '<li class="' + (r.me ? "is-me" : "") + '"><span class="wk-rank num">' + r.rank + "</span>" + face(r.a) +
            '<a class="wk-name" href="/u/' + encodeURIComponent(r.u) + '">' + esc(r.name) + '</a><span class="wk-lvl">lv ' + r.level + '</span><span class="wk-xp num">' + r.xp + " xp</span></li>";
        }).join("");
        var you = d.rows.some(function (r) { return r.me; }) ? "that's you up there. keep it." : d.you ? (d.you.rank ? "you're #" + d.you.rank + " with " + d.you.xp + " xp this week." : "no xp yet this week. finish a run to get on the board.")
          : '<a href="/me/">make an account</a> to get on this board. your device xp comes with you.';
        root.innerHTML = '<h2 class="wk-h"><img class="wk-trophy" src="/assets/mascot/trophy.svg" alt="" width="31" height="40">this week’s top xp</h2><p class="wk-sub">every game counts. resets in ' + left(d.resets_at) + ".</p>" +
          (rows ? '<ol class="wk-list">' + rows + "</ol>" : '<p class="wk-empty">nobody yet this week. first run wins it.</p>') +
          '<p class="wk-you">' + you + "</p>";
        root.hidden = false;
      });
    });
  };
})();
