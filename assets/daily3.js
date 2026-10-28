/* "daily 3" (audit P1 #12): play crash test daily, desktop jam and fathom once each today, keep the streak going.
   Kept on this device (localStorage "cc-daily3": { "YYYY-MM-DD": ["fathom", ...] }, last 60 days); account sync
   is a later step. Local dates, so "today" is the player's today.
   window.ccDaily3:
     GAMES                     the three slugs, in order
     mark(slug)                a finished run in one of them today (games/platform.js calls this on every run end)
     today()                   slugs done today
     streak()                  days in a row with all three done (today counts once it's complete)
     share()                   the emoji line: "computer cooked daily 3 · oct 28 ✅✅⬜ · 🔥4" + link
   Used by /games/daily/ and the toast after a daily run. */
(function () {
  "use strict";
  var GAMES = ["crash-test-daily", "desktop-jam", "fathom"];
  var KEY = "cc-daily3";
  function day(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function read() { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } }
  function write(o) {
    var keys = Object.keys(o).sort().slice(-60), out = {};
    keys.forEach(function (k) { out[k] = o[k]; });
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) {}
  }
  function doneOn(o, k) { var l = o[k] || []; return GAMES.every(function (g) { return l.indexOf(g) >= 0; }); }
  var api = window.ccDaily3 = {
    GAMES: GAMES,
    mark: function (slug) {
      if (GAMES.indexOf(slug) < 0) return null;
      var o = read(), k = day(), l = o[k] || [];
      if (l.indexOf(slug) < 0) { l.push(slug); o[k] = l; write(o); }
      return { done: l.length, of: GAMES.length, streak: api.streak() };
    },
    today: function () { return (read()[day()] || []).slice(); },
    streak: function () {
      var o = read(), d = new Date(), n = 0;
      if (!doneOn(o, day(d))) d.setDate(d.getDate() - 1); // today not finished yet: count up to yesterday
      while (doneOn(o, day(d))) { n++; d.setDate(d.getDate() - 1); }
      return n;
    },
    share: function () {
      var t = api.today(), s = api.streak();
      var date = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase();
      return "computer cooked daily 3 · " + date + " " + GAMES.map(function (g) { return t.indexOf(g) >= 0 ? "✅" : "⬜"; }).join("") +
        (s ? " · 🔥" + s : "") + "\ncomputercooked.com/games/daily/";
    }
  };
})();
