/* cc-sdk.js — Computer Cooked Games SDK.
   Games call:
     cc.start()                                   a run begins
     cc.score(n)                                  live score (optional)
     cc.end({score, durationMs, completed})       a run ends -> Promise<{accepted, best, rank, name}>
     cc.event(name, data)                         something notable happened (optional)
   Works on a top-level game page (sends to /api/events itself) and inside the player
   iframe (relays to the player page with postMessage, which sends). Always safe to call:
   if anything fails, the game keeps running.
   Privacy: anonymous players get a random id in localStorage (no cookie). No IPs, no fingerprinting. */
(function () {
  "use strict";
  if (window.cc && window.cc.__sdk) return;

  var VERSION_SDK = 1;
  var framed = false;
  try { framed = window.parent !== window && window.parent.location.origin === location.origin; } catch (e) { framed = false; }

  function ls(k, v) {
    try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function rid(n) {
    var a = new Uint8Array(n || 12), s = "";
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < a.length; i++) s += "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[a[i] % 62];
    return s;
  }

  // game slug from /games/<slug>/...
  function slugFromPath(p) { var m = /\/games\/([a-z0-9-]+)\//.exec(p); return m ? m[1] : null; }

  /* ---------------- relay mode (inside the player iframe) ---------------- */
  if (framed) {
    var waiting = {}, n = 0;
    var send = function (op, args) {
      var id = ++n;
      try { window.parent.postMessage({ type: "cc-sdk", op: op, args: args, id: id }, location.origin); } catch (e) {}
      return id;
    };
    window.addEventListener("message", function (e) {
      if (e.origin !== location.origin || !e.data || e.data.type !== "cc-sdk-reply") return;
      var w = waiting[e.data.id];
      if (w) { delete waiting[e.data.id]; w(e.data.result); }
    });
    send("hello", { sdk: VERSION_SDK });
    window.cc = {
      __sdk: true,
      start: function () { send("start"); },
      score: function (s) { send("score", s); },
      event: function (name, data) { send("event", { name: name, data: data }); },
      end: function (o) {
        return new Promise(function (resolve) {
          var id = send("end", o || {});
          waiting[id] = resolve;
          setTimeout(function () { if (waiting[id]) { delete waiting[id]; resolve(null); } }, 8000);
        });
      }
    };
    return;
  }

  /* ---------------- collector mode (top-level page) ---------------- */
  var anon = ls("cc-anon");
  if (!anon || !/^[A-Za-z0-9_-]{8,64}$/.test(anon)) { anon = rid(16); ls("cc-anon", anon); }

  var q = new URLSearchParams(location.search);
  var tester = q.get("tester");
  if (tester) {
    tester = tester.replace(/[^A-Za-z0-9_ .-]/g, "").slice(0, 32);
    try { sessionStorage.setItem("cc-tester", tester); } catch (e) {}
  } else {
    try { tester = sessionStorage.getItem("cc-tester"); } catch (e) {}
  }

  function refBucket() {
    var r = document.referrer;
    if (!r) return "direct";
    var h;
    try { h = new URL(r).hostname.replace(/^www\./, ""); } catch (e) { return "other"; }
    if (h === location.hostname) return "internal";
    if (/tiktok/.test(h)) return "tiktok";
    if (/youtube|youtu\.be/.test(h)) return "youtube";
    if (/instagram/.test(h)) return "instagram";
    if (/(^|\.)x\.com$|twitter|t\.co$/.test(h)) return "x";
    if (/threads/.test(h)) return "threads";
    if (/bsky/.test(h)) return "bluesky";
    if (/google|bing|duckduckgo|yahoo|ecosia|brave/.test(h)) return "search";
    return "other";
  }
  // first referrer of this visit sticks for the session
  var ref;
  try { ref = sessionStorage.getItem("cc-ref"); if (!ref) { ref = refBucket(); sessionStorage.setItem("cc-ref", ref); } } catch (e) { ref = refBucket(); }

  var game = slugFromPath(location.pathname);
  var version = "1";
  var play = null;     // {id, t0, score, auto}
  var queue = [];
  var timer = null;

  function payload(evts) {
    return JSON.stringify({ anon: anon, tester: tester || null, ref: ref, name: ls("cc-guest-name") || null, events: evts });
  }

  // The platform API may not be live yet; ask once and stay quiet if it is not.
  var apiUp = null;
  function apiReady() {
    if (apiUp) return apiUp;
    apiUp = fetch("/api/health", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return !!(j && j.db); })
      .catch(function () { return false; });
    return apiUp;
  }

  function flush(beacon) {
    return apiReady().then(function (up) {
      if (!up) { queue.length = 0; return null; }
      return send(beacon);
    });
  }
  function send(beacon) {
    clearTimeout(timer); timer = null;
    if (!queue.length) return Promise.resolve(null);
    var evts = queue.splice(0, 50);
    var body = payload(evts);
    if (beacon && navigator.sendBeacon) {
      try { if (navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }))) return Promise.resolve(null); } catch (e) {}
    }
    return fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: body, keepalive: true, credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  }
  function soon() { if (!timer) timer = setTimeout(flush, 4000); }

  function start(opts) {
    if (!game) return;
    if (play) end({ completed: false });
    play = { id: rid(16), t0: Date.now(), score: null, auto: !!(opts && opts.auto), events: 0 };
    queue.push({ t: "start", id: play.id, game: game, v: version, auto: play.auto ? 1 : 0 });
    flush();
  }
  function score(s) { if (play && typeof s === "number" && isFinite(s)) play.score = s; }
  function event(name, data) {
    if (!play || play.events >= 20 || typeof name !== "string") return;
    play.events++;
    queue.push({ t: "event", id: play.id, game: game, name: name.slice(0, 40), data: data == null ? null : data });
    soon();
  }
  function end(o, beacon) {
    if (!play) return Promise.resolve(null);
    o = o || {};
    var p = play;
    play = null;
    var sc = typeof o.score === "number" && isFinite(o.score) ? o.score : p.score;
    var dur = typeof o.durationMs === "number" && isFinite(o.durationMs) ? o.durationMs : Date.now() - p.t0;
    queue.push({ t: "end", id: p.id, game: game, score: sc, dur: Math.round(dur), completed: o.completed !== false });
    var done = flush(beacon).then(function (res) {
      var r = res && res.results ? res.results[p.id] || null : null;
      document.dispatchEvent(new CustomEvent("cc:end", { detail: { game: game, playId: p.id, score: sc, result: r } }));
      return r;
    });
    lastPlayId = p.id;
    return done;
  }
  var lastPlayId = null;

  var known = false;
  apiReady().then(function (up) { known = up; });
  window.addEventListener("pagehide", function () {
    if (!known) return;
    if (play) { end({ completed: false }, true); }
    send(true);
  });

  window.cc = {
    __sdk: true,
    start: start, score: score, event: event,
    end: function (o) { return end(o); },
    // used by the player page and site UI
    _setGame: function (slug, v) { game = slug; if (v) version = String(v); },
    _game: function () { return game; },
    _version: function () { return version; },
    _active: function () { return !!play; },
    _anon: anon,
    _apiReady: apiReady,
    _tester: function () { return tester; },
    _lastPlay: function () { return play ? play.id : lastPlayId; },
    guestName: function (n) { if (n === undefined) return ls("cc-guest-name"); ls("cc-guest-name", String(n).slice(0, 16)); }
  };
})();
