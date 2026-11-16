/* "daily 3" (audit P1 #12): play crash test daily, desktop jam and fathom once each today, keep the streak going.
   Kept on this device. Local dates, so "today" is the player's today and a new set starts at local midnight.
     cc-daily3         { "YYYY-MM-DD": ["fathom", ...] }, the last 60 days
     cc-daily3-stats   { days: complete days ever, best: best streak ever, last: the last complete day counted }
                       (so neither is lost when the 60-day log rolls over; seeded from the log the first time)
     cc-daily3-scores  { d: { "YYYY-MM-DD": { slug: score } }, sig: { slug: "..." } }, the last 14 days. The score is
                       the newest accepted run in cc-history (games/platform.js writes it just before mark() runs)
   window.ccDaily3:
     GAMES                     the three slugs, in order
     mark(slug)                a finished run in one of them today (games/platform.js calls this on every run end)
     today()                   slugs done today
     streak()                  days in a row with all three done (today counts once it's complete; one missed day ends it)
     stats()                   { done, of, streak, best, days, week: [{ key, n }] x7 oldest first, scores: { slug: n } }
     msToReset()               ms until the next set (local midnight)
     share([st])               "computer cooked daily 3 · nov 16\n🟩🟩🟩 streak 4\ncomputercooked.com/g/daily"
                               (st = { done: [slugs], streak } to share something other than the real today)
   Used by /games/daily/, the home page and the toast after a daily run. */
(function () {
  "use strict";
  var GAMES = ["crash-test-daily", "desktop-jam", "fathom"];
  var KEY = "cc-daily3", SKEY = "cc-daily3-stats", PKEY = "cc-daily3-scores";
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function day(d) {
    d = d || new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function prev(k) { var p = k.split("-"); return day(new Date(+p[0], +p[1] - 1, +p[2] - 1)); }
  function get(k, dflt) { try { return JSON.parse(localStorage.getItem(k) || "null") || dflt; } catch (e) { return dflt; } }
  function put(k, o) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (e) {} }
  function read() { return get(KEY, {}); }
  function write(o) {
    var keys = Object.keys(o).sort().slice(-60), out = {};
    keys.forEach(function (k) { out[k] = o[k]; });
    put(KEY, out);
  }
  function count(o, k) { var l = o[k] || []; return GAMES.filter(function (g) { return l.indexOf(g) >= 0; }).length; }
  function doneOn(o, k) { return count(o, k) === GAMES.length; }
  function streakOf(o) {
    var k = day(), n = 0;
    if (!doneOn(o, k)) k = prev(k); // today not finished yet: count up to yesterday
    while (doneOn(o, k)) { n++; k = prev(k); }
    return n;
  }
  function longest(o) {
    var best = 0, run = 0, last = "";
    Object.keys(o).sort().forEach(function (k) {
      if (!doneOn(o, k)) { run = 0; return; }
      run = last && prev(k) === last ? run + 1 : 1; last = k;
      if (run > best) best = run;
    });
    return best;
  }
  // brings the lifetime counters up to date with the log (idempotent; writes only when something changed)
  function sync(o) {
    var s = get(SKEY, {}), ch = false;
    s.days = s.days || 0; s.best = s.best || 0; s.last = s.last || "";
    Object.keys(o).sort().forEach(function (k) { if (k > s.last && doneOn(o, k)) { s.days++; s.last = k; ch = true; } });
    var b = Math.max(s.best, longest(o), streakOf(o));
    if (b !== s.best) { s.best = b; ch = true; }
    if (ch) put(SKEY, s);
    return s;
  }
  function noteScore(slug, k) {
    var h = get("cc-history", {})[slug], r = h && Array.isArray(h.r) ? h.r : [];
    if (!r.length) return;
    var p = get(PKEY, {}), sig = r.join(","), last = r[r.length - 1];
    p.d = p.d || {}; p.sig = p.sig || {};
    if (p.sig[slug] === sig || typeof last !== "number" || !isFinite(last)) return;
    p.sig[slug] = sig;
    (p.d[k] = p.d[k] || {})[slug] = last;
    var keep = {};
    Object.keys(p.d).sort().slice(-14).forEach(function (x) { keep[x] = p.d[x]; });
    p.d = keep;
    put(PKEY, p);
  }
  function short(d) { return (d || new Date()).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase(); }
  var api = window.ccDaily3 = {
    GAMES: GAMES,
    day: day,
    mark: function (slug) {
      if (GAMES.indexOf(slug) < 0) return null;
      var o = read(), k = day(), l = o[k] || [];
      noteScore(slug, k);
      if (l.indexOf(slug) < 0) { l.push(slug); o[k] = l; write(o); sync(o); }
      return { done: count(o, k), of: GAMES.length, streak: streakOf(o) };
    },
    today: function () { return (read()[day()] || []).slice(); },
    streak: function () { return streakOf(read()); },
    stats: function () {
      var o = read(), s = sync(o), k = day(), week = [], x = k, i;
      for (i = 0; i < 7; i++) { week.unshift({ key: x, n: count(o, x) }); x = prev(x); }
      var sc = (get(PKEY, {}).d || {})[k] || {}, scores = {};
      GAMES.forEach(function (g) { if ((o[k] || []).indexOf(g) >= 0 && typeof sc[g] === "number") scores[g] = sc[g]; });
      return { done: GAMES.filter(function (g) { return (o[k] || []).indexOf(g) >= 0; }), of: GAMES.length,
        streak: streakOf(o), best: s.best, days: s.days, week: week, scores: scores };
    },
    msToReset: function () {
      var t = new Date();
      return new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1) - t;
    },
    share: function (st) {
      var t = st && st.done ? st.done : api.today(), s = st && typeof st.streak === "number" ? st.streak : api.streak();
      return "computer cooked daily 3 · " + short() + "\n" +
        GAMES.map(function (g) { return t.indexOf(g) >= 0 ? "🟩" : "⬜"; }).join("") + (s ? " streak " + s : "") +
        "\ncomputercooked.com/g/daily";
    }
  };
})();
