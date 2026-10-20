/* smol brains — save.js
   Autosave/load to localStorage, and copy-paste "smol codes" (SMOL1:...) for sharing a single creature. */
(function () {
  "use strict";
  var SB = window.SB;
  var Save = (SB.Save = {});

  var KEY = "smolbrains-save-v1";
  var VERSION = 1;
  var CODE_PREFIX = "SMOL1:";
  // Creature fields that are transient: reset on load.
  var CREATURE_DROP = { brain: 1, action: 1, attn: 1, speech: 1 };

  /* ---------------- generic plain-data conversion ---------------- */

  function round(v) { return Number.isInteger(v) ? v : Math.round(v * 1e4) / 1e4; }

  // Deep copy into JSON-safe data: typed arrays -> arrays, NaN/Infinity -> 0, functions and "_"-prefixed keys dropped.
  function plain(v, depth) {
    if (v == null) return v === undefined ? undefined : null;
    var t = typeof v;
    if (t === "number") return isFinite(v) ? round(v) : 0;
    if (t === "string" || t === "boolean") return v;
    if (t === "function") return undefined;
    if (depth > 12) return null;
    if (ArrayBuffer.isView(v)) { var a = new Array(v.length); for (var i = 0; i < v.length; i++) a[i] = isFinite(v[i]) ? round(v[i]) : 0; return a; }
    if (Array.isArray(v)) return v.map(function (x) { var p = plain(x, depth + 1); return p === undefined ? null : p; });
    var o = {};
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k) || k.charAt(0) === "_") continue;
      var pv = plain(v[k], depth + 1);
      if (pv !== undefined) o[k] = pv;
    }
    return o;
  }
  Save.plain = function (v) { return plain(v, 0); };

  function plainCreature(c) {
    var o = {};
    for (var k in c) {
      if (!Object.prototype.hasOwnProperty.call(c, k) || k.charAt(0) === "_" || CREATURE_DROP[k]) continue;
      var pv = plain(c[k], 1);
      if (pv !== undefined) o[k] = pv;
    }
    o.action = null; o.attn = null; o.speech = null;
    if (c.brain && SB.Brain && SB.Brain.serialize) o.brain = SB.Brain.serialize(c.brain);
    return o;
  }

  /* ---------------- save / load ---------------- */

  Save.snapshot = function (game) {
    var w = game.world;
    var world = SB.World.serialize ? SB.World.serialize(w) : { objects: w.objects, weather: w.weather, dayIndex: w.dayIndex, night: w.night, pads: w.pads };
    return {
      v: VERSION, savedAt: Date.now(),
      seed: game.seed, rngState: game.rng && game.rng.state ? game.rng.state() : 0,
      time: game.time, speed: game.speed, nextId: game.nextId, selectedId: game.selectedId,
      hand: { tool: game.hand ? game.hand.tool : "grab" },
      family: plain(game.family, 0), stats: plain(game.stats, 0), achievements: plain(game.achievements, 0),
      tutorial: plain(game.tutorial, 0), log: plain(game.log, 0),
      world: plain(world, 0),
      creatures: game.creatures.filter(function (c) { return !c.gone; }).map(plainCreature)
    };
  };

  // The site SDK (cc.save/cc.load) keeps a copy on the player's account when they're logged in.
  // This game's own localStorage save stays the source of truth on this device and the fallback without the SDK.
  var CLOUD_SLOT = "main";
  function sdk() { return window.cc && typeof window.cc.save === "function" ? window.cc : null; }

  Save.save = function (game) {
    if (!game || reloading) return false;
    var snap, ok = false;
    try {
      snap = Save.snapshot(game);
      window.localStorage.setItem(KEY, JSON.stringify(snap));
      ok = true;
    } catch (e) {
      // quota / private mode / no storage: ignore
    }
    var cc = sdk();
    // until the boot-time cloud check answers, a brand-new game must not look "newer" than the account's save
    if (cc && snap && !checking) { try { cc.save(CLOUD_SLOT, snap).catch(function () {}); } catch (e) {} }
    return ok;
  };

  // After boot: if the account has a newer save (another device), offer it and restart into it.
  var checking = false, reloading = false; // reloading: the pagehide autosave must not overwrite the save we just adopted
  Save.cloud = function () {
    var cc = sdk();
    if (!cc || typeof cc.load !== "function") return;
    var local = Save.load();
    checking = true;
    var done = function () { checking = false; };
    try {
      cc.load(CLOUD_SLOT).then(function (d) {
        if (!d || typeof d !== "object" || typeof d.seed !== "number" || typeof d.savedAt !== "number") return done();
        if (local && d.savedAt <= (local.savedAt || 0) + 2000) return done();
        if (local && !window.confirm("your account has a newer smol brains save (from another device). load it?")) return done();
        try { window.localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { return done(); }
        reloading = true;
        window.location.reload();
      }).catch(done);
    } catch (e) { done(); }
    setTimeout(done, 15000); // never hold cloud saves back for long
  };

  Save.load = function () {
    try {
      var s = window.localStorage.getItem(KEY);
      if (!s) return null;
      var d = JSON.parse(s);
      if (!d || typeof d !== "object" || typeof d.seed !== "number") return null;
      return d;
    } catch (e) {
      return null;
    }
  };

  Save.wipe = function () {
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    var cc = sdk(); // the account copy is cleared too, so a fresh start isn't overridden by the old save
    if (cc) { try { cc.save(CLOUD_SLOT, null).catch(function () {}); } catch (e) {} }
  };

  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  var DEFAULT_STATS = { hatched: 0, eggsLaid: 0, maxGen: 1, wordsTaught: 0, tickles: 0, taps: 0, deaths: 0, bestIQ: 0, grumpNights: 0, cured: 0, imported: 0, exported: 0 };

  function reviveCreature(p, game) {
    if (SB.Creature && SB.Creature.revive) return SB.Creature.revive(p, game);
    var c = {};
    for (var k in p) c[k] = p[k];
    c.brain = p.brain ? SB.Brain.deserialize(p.brain, p.genome) : SB.Brain.create ? SB.Brain.create(p.genome, game.rng) : null;
    c.action = null; c.attn = null; c.speech = null;
    if (!c.chem && SB.Chem && SB.Chem.create) c.chem = SB.Chem.create(c.genome);
    if (!c.look && SB.Genome && SB.Genome.look) c.look = SB.Genome.look(c.genome);
    if (!c.vocab) c.vocab = {};
    if (c.alive == null) c.alive = true;
    return c;
  }

  // Build a live game object (same shape as SB.Game.create()) from Save.load() data.
  Save.revive = function (data) {
    data = obj(data);
    var seed = num(data.seed, 1) || 1;
    var speed = num(data.speed, 1);
    var game = {
      v: VERSION, seed: seed, time: Math.max(0, num(data.time, 0)),
      speed: SB.SPEEDS.indexOf(speed) >= 0 ? speed : 1,
      rng: SB.rng(seed), nextId: Math.max(1, num(data.nextId, 1)),
      world: null, creatures: [], selectedId: null,
      hand: { x: SB.HOME_X, y: 300, visible: false, tool: "grab", heldId: null, heldType: null, saying: null, sayT: 0 },
      family: obj(data.family), stats: {}, achievements: obj(data.achievements),
      tutorial: obj(data.tutorial), log: Array.isArray(data.log) ? data.log.slice(-50) : []
    };
    if (data.rngState != null) game.rng.setState(data.rngState);
    var tools = ["grab", "tickle", "tap", "talk"];
    if (data.hand && tools.indexOf(data.hand.tool) >= 0) game.hand.tool = data.hand.tool;
    var st = obj(data.stats);
    for (var k in DEFAULT_STATS) game.stats[k] = num(st[k], DEFAULT_STATS[k]);
    if (typeof game.tutorial.step !== "number") game.tutorial.step = 0;
    game.tutorial.done = !!game.tutorial.done;

    game.world = SB.World.revive(obj(data.world), game);

    var cs = Array.isArray(data.creatures) ? data.creatures : [];
    for (var i = 0; i < cs.length; i++) {
      try {
        var c = reviveCreature(cs[i], game);
        if (c) game.creatures.push(c);
      } catch (e) {
        if (window.console) console.warn("[save] could not revive creature", cs[i] && cs[i].name, e);
      }
    }

    // ids must stay unique; dangling references are cleared
    var maxId = 0, ids = {};
    game.creatures.forEach(function (c) { ids[c.id] = c; if (c.id > maxId) maxId = c.id; });
    game.world.objects.forEach(function (o) { if (o.id > maxId) maxId = o.id; });
    for (var fid in game.family) { var n = +fid; if (n > maxId) maxId = n; }
    if (game.nextId <= maxId) game.nextId = maxId + 1;
    game.world.objects.forEach(function (o) {
      if (o.heldBy != null) { var h = ids[o.heldBy]; if (!h || h.holding !== o.id) { o.heldBy = null; o.onGround = false; } }
    });
    game.creatures.forEach(function (c) {
      if (c.holding != null && !game.world.objects.some(function (o) { return o.id === c.holding; })) c.holding = null;
      if (c.heldBy === "hand") c.heldBy = null;
    });
    if (data.selectedId != null && ids[data.selectedId]) game.selectedId = data.selectedId;
    return game;
  };

  /* ---------------- smol codes ---------------- */

  function utf8Bytes(str) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(str);
    var s = unescape(encodeURIComponent(str)), b = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  function utf8String(bytes) {
    if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    var s = "";
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(s));
  }
  function b64urlEncode(str) {
    var bytes = utf8Bytes(str), bin = "";
    for (var i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    while (s.length % 4) s += "=";
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return utf8String(bytes);
  }

  Save.exportSmol = function (c) {
    var vocab = {};
    for (var w in c.vocab || {}) { var v = c.vocab[w]; if (v >= 0.05) vocab[w] = Math.round(v * 100) / 100; }
    var stats = {};
    if (c.stats) for (var k in c.stats) if (typeof c.stats[k] === "number" && isFinite(c.stats[k])) stats[k] = round(c.stats[k]);
    var adult = SB.STAGES[3].from;
    var payload = {
      name: String(c.name || "smol").slice(0, 32), gen: c.gen || 1,
      genome: SB.Genome.encode(c.genome),
      brain: c.brain ? plain(SB.Brain.serialize(c.brain), 0) : null,
      vocab: vocab, age: Math.min(Math.round(c.age || 0), adult), stats: stats,
      born: Math.floor((c.born || 0) / SB.DAY_LENGTH) + 1
    };
    return CODE_PREFIX + b64urlEncode(JSON.stringify(payload));
  };

  Save.importSmol = function (code) {
    var bad = function () { return new Error("not a smol code"); };
    if (typeof code !== "string") throw bad();
    var s = code.replace(/\s+/g, "");
    var m = /^SMOL\d*:/i.exec(s);
    if (m) s = s.slice(m[0].length);
    if (!s || /[^A-Za-z0-9\-_+/=]/.test(s)) throw bad();
    var p;
    try { p = JSON.parse(b64urlDecode(s)); } catch (e) { throw bad(); }
    if (!p || typeof p !== "object" || !p.genome || !p.brain) throw bad();
    var genome;
    try { genome = typeof p.genome === "string" ? SB.Genome.decode(p.genome) : p.genome; } catch (e) { throw bad(); }
    if (!genome || typeof genome !== "object") throw bad();
    var vocab = {};
    for (var w in obj(p.vocab)) { var v = num(p.vocab[w], 0); if (v > 0) vocab[w] = Math.min(1.5, v); }
    var name = String(p.name || "smol").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24) || "smol";
    return {
      name: name, gen: Math.max(1, Math.floor(num(p.gen, 1))), genome: genome, brain: p.brain, vocab: vocab,
      age: SB.clamp(num(p.age, 0), 0, SB.STAGES[3].from), stats: obj(p.stats), born: num(p.born, 1)
    };
  };
})();
