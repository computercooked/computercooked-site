/* "daily 3" (audit P1 #12): play crash test daily, desktop jam and fathom once each today, keep the streak going.
   Kept on this device. Local dates, so "today" is the player's today and a new set starts at local midnight.
     cc-daily3         { "YYYY-MM-DD": ["fathom", ...] }, the last 60 days
     cc-daily3-stats   { days: complete days ever, best: best streak ever, last: the last complete day counted }
                       (so neither is lost when the 60-day log rolls over; seeded from the log the first time)
     cc-daily3-scores  { d: { "YYYY-MM-DD": { slug: score } }, sig: { slug: "..." } }, the last 14 days. The score is
                       the newest accepted run in cc-history (games/platform.js writes it just before mark() runs)
     cc-daily3-freeze  { weekUsed: "YYYY-Www", days: ["YYYY-MM-DD", ...] }: the missed days a streak freeze covered
   Streak freeze: one per ISO week (monday to sunday, local), never banked. It covers one missed day, in its own week,
   that sits right after a complete day (so never before the first one, and never two misses in a row). Today is never
   frozen: today still needs playing. It's applied lazily, the first time the streak is worked out after the miss,
   and saved, so a day once frozen stays frozen. A frozen day keeps the streak going but doesn't add to it.
   window.ccDaily3:
     GAMES                     the three slugs, in order
     mark(slug)                a finished run in one of them today (games/platform.js calls this on every run end)
     today()                   slugs done today
     streak()                  days in a row with all three done (today counts once it's complete; a frozen day is
                               stepped over; any other missed day ends it). Still a number.
     freeze()                  { ready: this week's freeze unused, usedOn: "YYYY-MM-DD" this week or "", held: that
                               day is part of the current streak, days: frozen days in the current streak }
     stats()                   { done, of, streak, best, days, week: [{ key, n, frozen }] x7 oldest first,
                                 scores: { slug: n }, freeze: freeze() }
     msToReset()               ms until the next set (local midnight)
     share([st])               "computer cooked daily 3 · nov 16\n🟩🟩🟩 streak 4\ncomputercooked.com/g/daily"
                               (st = { done: [slugs], streak } to share something other than the real today)
   Used by /games/daily/, the home page and the toast after a daily run. */
(function () {
  "use strict";
  var GAMES = ["crash-test-daily", "desktop-jam", "fathom"];
  var KEY = "cc-daily3", SKEY = "cc-daily3-stats", PKEY = "cc-daily3-scores", FKEY = "cc-daily3-freeze";
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
  function next(k) { var p = k.split("-"); return day(new Date(+p[0], +p[1] - 1, +p[2] + 1)); }
  // ISO week of a date key, "2026-W47": weeks start on monday, and a week belongs to the year its thursday is in
  function week(k) {
    var p = k.split("-"), d = new Date(+p[0], +p[1] - 1, +p[2]), wd = (d.getDay() + 6) % 7;
    var th = new Date(d.getFullYear(), d.getMonth(), d.getDate() - wd + 3), y = th.getFullYear();
    var w = 1 + Math.floor(Math.round((th - new Date(y, 0, 1)) / 864e5) / 7);
    return y + "-W" + pad(w);
  }
  function fzRead() {
    var f = get(FKEY, {}), l = Array.isArray(f.days) ? f.days : [];
    return { weekUsed: typeof f.weekUsed === "string" ? f.weekUsed : "",
      days: l.filter(function (x) { return typeof x === "string" && /^\d{4}-\d\d-\d\d$/.test(x); }) };
  }
  function frozenOn(f, k) { return f.days.indexOf(k) >= 0; }
  // a missed day the freeze can cover: before today, right after a complete day, not followed by another frozen
  // day, and its week's freeze not spent yet
  function canFreeze(o, f, k) {
    if (k >= day() || doneOn(o, k) || frozenOn(f, k) || !doneOn(o, prev(k)) || frozenOn(f, next(k))) return false;
    var w = week(k);
    return !f.days.some(function (x) { return week(x) === w; });
  }
  // the streak, walking back from today (from yesterday while today isn't finished). Complete days count, frozen days
  // are stepped over, a missed day the freeze can cover gets frozen (and saved), anything else ends it.
  function walk(o) {
    var f = fzRead(), k = day(), n = 0, held = [], ch = false, i;
    if (!doneOn(o, k)) k = prev(k); // today not finished yet: count up to yesterday
    for (i = 0; i < 400; i++) {
      if (doneOn(o, k)) n++;
      else if (frozenOn(f, k)) held.push(k);
      else if (canFreeze(o, f, k)) { f.days.push(k); held.push(k); ch = true; }
      else break;
      k = prev(k);
    }
    if (ch) {
      f.days = f.days.sort().slice(-30);
      f.weekUsed = week(f.days[f.days.length - 1]);
      put(FKEY, f);
    }
    return { n: n, held: held, f: f };
  }
  function streakOf(o) { return walk(o).n; }
  function freezeOf(r) {
    var w = week(day()), mine = r.f.days.filter(function (x) { return week(x) === w; })[0] || "";
    return { ready: !mine, usedOn: mine, held: !!mine && r.held.indexOf(mine) >= 0, days: r.held.slice().sort() };
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
    freeze: function () { return freezeOf(walk(read())); },
    stats: function () {
      var o = read(), s = sync(o), r = walk(o), k = day(), wk = [], x = k, i;
      for (i = 0; i < 7; i++) { wk.unshift({ key: x, n: count(o, x), frozen: frozenOn(r.f, x) }); x = prev(x); }
      var sc = (get(PKEY, {}).d || {})[k] || {}, scores = {};
      GAMES.forEach(function (g) { if ((o[k] || []).indexOf(g) >= 0 && typeof sc[g] === "number") scores[g] = sc[g]; });
      return { done: GAMES.filter(function (g) { return (o[k] || []).indexOf(g) >= 0; }), of: GAMES.length,
        streak: r.n, best: s.best, days: s.days, week: wk, scores: scores, freeze: freezeOf(r) };
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
