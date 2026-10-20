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

  /* ---------------- saves + user (same in both modes: the iframe is same-origin, so it talks to the API itself) ----------------
     cc.save(slot, data) -> Promise<{local, cloud}>   localStorage now; the cloud too when logged in (batched to ~1 write/10s/slot)
     cc.load(slot)       -> Promise<data|null>        the newer of this device's copy and the cloud copy
     cc.saves()          -> Promise<[{slot, updated_at, bytes}]>
     cc.user()           -> {id, name, level, avatar} | null
     cc.onUser(fn)       -> fn(user|null) now (once known) and on every login/logout */
  var saveGame = slugFromPath(location.pathname);
  var MAX_BYTES = 512 * 1024, CLOUD_GAP = 10500;
  var slotOk = function (s) { return typeof s === "string" && /^[a-z0-9_-]{1,32}$/.test(s); };
  var lkey = function (slot) { return "cc-save:" + saveGame + ":" + slot; };
  function readLocal(slot) {
    try { var o = JSON.parse(localStorage.getItem(lkey(slot))); return o && typeof o.t === "number" ? o : null; } catch (e) { return null; }
  }
  function writeLocal(slot, o) { try { localStorage.setItem(lkey(slot), JSON.stringify(o)); return true; } catch (e) { return false; } }
  function bytesOf(s) { try { return new Blob([s]).size; } catch (e) { return s.length; } }
  function status(state) {
    var d = { game: saveGame, state: state };
    try { document.dispatchEvent(new CustomEvent("cc:save", { detail: d })); } catch (e) {}
    try { if (window.parent !== window) window.parent.postMessage({ type: "cc-save-status", state: state, game: saveGame }, location.origin); } catch (e) {}
  }

  var me = undefined, userFns = [], meReq = null; // undefined = not known yet
  function fetchUser() {
    meReq = fetch("/api/health", { credentials: "same-origin" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (h) { return h && h.db ? fetch("/api/me", { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }) : null; })
      .then(function (j) { return j && j.user ? { id: j.user.id, name: j.user.username, level: j.user.level || 1, avatar: j.user.avatar } : null; })
      .catch(function () { return null; })
      .then(function (u) {
        var changed = me === undefined || (me ? me.id : 0) !== (u ? u.id : 0);
        me = u;
        if (changed) { userFns.forEach(function (fn) { try { fn(me); } catch (e) {} }); if (me) pushLocal(); }
        return me;
      });
    return meReq;
  }
  function whenUser() { return me !== undefined ? Promise.resolve(me) : (meReq || fetchUser()); }
  // the /me page writes cc-user-change on login/logout; other tabs and frames pick it up here
  window.addEventListener("storage", function (e) { if (e.key === "cc-user-change") fetchUser(); });

  var pend = {}; // slot -> {timer, last}
  function cloudPut(slot) {
    var p = pend[slot] || (pend[slot] = { timer: null, last: 0 });
    if (p.timer) return p.promise;
    var wait = Math.max(0, p.last + CLOUD_GAP - Date.now());
    p.promise = new Promise(function (resolve) {
      p.timer = setTimeout(function () {
        p.timer = null; p.last = Date.now();
        var o = readLocal(slot);
        if (!o || !me) return resolve(false);
        fetch("/api/saves/" + saveGame + "/" + slot, {
          method: "PUT", credentials: "same-origin", keepalive: o.n < 60000,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ data: o.d, updated_at: o.t, version: o.v || null })
        }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
          var ok = !!(j && j.ok);
          if (ok) { var cur = readLocal(slot); if (cur && cur.t === o.t) { cur.c = 1; writeLocal(slot, cur); } }
          status(ok ? "cloud" : "local");
          resolve(ok);
        }).catch(function () { status("local"); resolve(false); });
      }, wait);
    });
    return p.promise;
  }
  // after a login: this device's saves that never reached the cloud go up (the server keeps whichever copy is newer)
  function pushLocal() {
    if (!saveGame) return;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i), pre = "cc-save:" + saveGame + ":";
        if (k && k.indexOf(pre) === 0) { var s = k.slice(pre.length), o = readLocal(s); if (o && !o.c && slotOk(s)) cloudPut(s); }
      }
    } catch (e) {}
  }

  function save(slot, data) {
    if (!saveGame || !slotOk(slot)) return Promise.resolve({ local: false, cloud: false });
    var text;
    try { text = JSON.stringify(data === undefined ? null : data); } catch (e) { return Promise.resolve({ local: false, cloud: false }); }
    var n = bytesOf(text);
    var o = { d: data === undefined ? null : data, t: Date.now(), n: n, c: 0, v: window.cc && cc._version ? cc._version() : null };
    var local = writeLocal(slot, o);
    if (n > MAX_BYTES) { status("local"); return Promise.resolve({ local: local, cloud: false, error: "over 512 KB" }); }
    return whenUser().then(function (u) {
      if (!u) { status(local ? "guest" : "none"); return { local: local, cloud: false }; }
      status("saving");
      return cloudPut(slot).then(function (ok) { return { local: local, cloud: ok }; });
    });
  }
  function load(slot) {
    if (!saveGame || !slotOk(slot)) return Promise.resolve(null);
    var o = readLocal(slot);
    return whenUser().then(function (u) {
      if (!u) return o ? o.d : null;
      return fetch("/api/saves/" + saveGame + "/" + slot, { credentials: "same-origin" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          var c = j && j.save;
          if (c && (!o || c.updated_at > o.t)) { writeLocal(slot, { d: c.data, t: c.updated_at, n: c.bytes, c: 1, v: c.version }); return c.data; }
          if (o && !o.c) cloudPut(slot);
          return o ? o.d : null;
        })
        .catch(function () { return o ? o.d : null; });
    });
  }
  function saves() {
    var out = {}, pre = "cc-save:" + saveGame + ":";
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf(pre) === 0) { var o = readLocal(k.slice(pre.length)); if (o) out[k.slice(pre.length)] = { slot: k.slice(pre.length), updated_at: o.t, bytes: o.n || 0, cloud: !!o.c }; }
      }
    } catch (e) {}
    return whenUser().then(function (u) {
      if (!u || !saveGame) return out;
      return fetch("/api/saves/" + saveGame, { credentials: "same-origin" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        (j && j.slots || []).forEach(function (s) {
          var l = out[s.slot];
          if (!l || s.updated_at >= l.updated_at) out[s.slot] = { slot: s.slot, updated_at: s.updated_at, bytes: s.bytes, cloud: true };
        });
        return out;
      }).catch(function () { return out; });
    }).then(function (m) { return Object.keys(m).map(function (k) { return m[k]; }).sort(function (a, b) { return b.updated_at - a.updated_at; }); });
  }
  var saveApi = {
    save: save, load: load, saves: saves,
    user: function () { if (me === undefined) whenUser(); return me || null; },
    onUser: function (fn) { if (typeof fn !== "function") return; userFns.push(fn); if (me !== undefined) { try { fn(me); } catch (e) {} } else whenUser(); }
  };
  // games in the player iframe learn who is playing right away; top-level pages only ask once a save/user call needs it
  try { if (saveGame && window.parent !== window) fetchUser(); } catch (e) {}

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
      },
      achieve: function (aid) {
        return new Promise(function (resolve) {
          var id = send("achieve", aid);
          waiting[id] = resolve;
          setTimeout(function () { if (waiting[id]) { delete waiting[id]; resolve(null); } }, 8000);
        });
      },
      save: saveApi.save, load: saveApi.load, saves: saveApi.saves, user: saveApi.user, onUser: saveApi.onUser
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
      .then(function (j) {
        // achievements unlocked by this batch (cc.achieve, or site-wide ones a finished play earned)
        var list = (j && j.achievements || []).slice();
        if (j && j.results) for (var k in j.results) { var x = j.results[k] && j.results[k].xp; if (x && x.achievements) list = list.concat(x.achievements); }
        list.forEach(function (a) { try { document.dispatchEvent(new CustomEvent("cc:achieve", { detail: a })); } catch (e) {} });
        return j;
      })
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

  // cc.achieve(id): only ids the game lists in its entry.json count, and only for logged-in players
  function achieve(id) {
    if (!game || typeof id !== "string" || !/^[a-z0-9_-]{1,40}$/.test(id)) return Promise.resolve(null);
    queue.push({ t: "achieve", id: play ? play.id : rid(16), game: game, ach: id });
    return flush().then(function (res) {
      var a = res && res.achievements || [];
      for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
      return null;
    });
  }

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
    achieve: achieve,
    save: saveApi.save, load: saveApi.load, saves: saveApi.saves, user: saveApi.user, onUser: saveApi.onUser,
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
