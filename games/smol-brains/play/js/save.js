/* smol brains 2 — save.js
   Autosave/load (localStorage, v2 key), the v1 -> v2 migration ("your smols from the old valley woke up
   on an island"), and copy-paste smol codes (SMOL2:..., SMOL1 codes still import). The v1 save is never
   touched, so going back is always possible. */
(function () {
  "use strict";
  var SB = window.SB;
  var Save = (SB.Save = {});
  var KEY = "smolbrains-save-v2", KEY_V1 = "smolbrains-save-v1";
  var CREATURE_DROP = { convo: 1, brain: 1, action: 1, attn: 1, speech: 1, plan: 1, anim: 1, look: 1, px: 1, pz: 1, py: 1, far: 1, moving: 1, heard: 1, lastDone: 1, badMeal: 1, type: 1, lost: 1 };

  function round(v) { return Number.isInteger(v) ? v : Math.round(v * 1e4) / 1e4; }
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
    o.genome = SB.Genome.encode(c.genome);
    if (c.brain) o.brain = SB.Brain.serialize(c.brain);
    return o;
  }

  // the family tree only grows. Keep everyone alive, their ancestors, the recently dead, and the
  // founders; long-gone branches with nobody left are let go once the tree gets big
  function pruneFamily(game) {
    var fam = game.family || {}, ids = Object.keys(fam);
    if (ids.length <= 600) return fam;
    var keep = {};
    function up(id, d) { var f = fam[id]; if (!f || d > 4 || keep[id] > 0) return; keep[id] = 1; (f.parents || []).forEach(function (p) { up(p, d + 1); }); }
    ids.forEach(function (id) { var f = fam[id]; if (f.died == null || game.time - f.died < SB.DAY_LENGTH * 3 || f.gen <= 1) up(id, 0); });
    var out = {};
    ids.forEach(function (id) { if (keep[id]) { var f = fam[id]; out[id] = f.kids ? Object.assign({}, f, { kids: f.kids.filter(function (k) { return fam[k] && keep[k]; }) }) : f; } });
    return out;
  }

  Save.snapshot = function (game) {
    return {
      v: 2, savedAt: Date.now(), wid: game.wid || null, wname: game.wname || null, seed: game.seed, n: game.world && game.world.T ? game.world.T.N : SB.WORLD_N, rngState: game.rng.state(),
      time: round(game.time), speed: game.speed, nextId: game.nextId, selectedId: game.selectedId,
      hand: { tool: game.hand.tool }, family: plain(pruneFamily(game), 0), stats: plain(game.stats, 0), achievements: plain(game.achievements, 0),
      tutorial: plain(game.tutorial, 0), lantern: plain(game.lantern || null, 0), quests: plain(game.quests || null, 0), nest: game.nest ? { fluff: game.nest.fluff | 0, cosy: game.nest.cosy | 0 } : null, log: plain(game.log.slice(-40), 0), sparks: round(game.sparks || 0), blessing: plain(game.blessing, 0), godHeat: round(game.godHeat || 0), spoil: round(game.spoil || 0), chronicle: plain((game.chronicle || []).slice(-220), 0), sites: SB.Sites ? SB.Sites.serialize(game) : [], logsFound: game.logsFound || 0, threats: SB.Threats ? SB.Threats.serialize(game) : null, podsDown: game.podsDown || 0, bodies: SB.Funeral ? SB.Funeral.serialize(game) : [], civ: SB.Civ ? SB.Civ.serialize(game) : null, econ: SB.Economy ? SB.Economy.serialize(game) : null, orders: SB.Orders ? SB.Orders.serialize(game) : null, lore: SB.Mind && SB.Mind.saveLore ? plain(SB.Mind.saveLore(game), 0) : null, podT: game.podT == null ? null : Math.round(game.podT), dir: game.dir ? { nextT: round(game.dir.nextT), count: game.dir.count || 0, last: plain(game.dir.last || {}, 0), losses: plain(game.dir.losses || [], 0), history: plain(game.dir.history || [], 0), marks: plain(game.dir.marks || [], 0), lastBad: game.dir.lastBad || 0 } : null, strangerT: game.strangerT == null ? null : round(game.strangerT),
      culture: plain({ words: game.culture.words, found: game.culture.found, lost: game.culture.lost, alive: game.culture.alive, lostCount: game.culture.lostCount, sharedMax: game.culture.sharedMax || 0, spireBoost: !!game.culture.spireBoost }, 0),
      tribes: plain(game.tribes, 0), villages: plain(game.villages, 0), clades: plain(game.clades, 0), nextClade: game.nextClade,
      playTime: round(game.playTime || 0), created: game.created, migratedFromV1: !!game.migratedFromV1, settings: plain(game.settings || {}, 0), collect: plain(game.collect || {}, 0), ngPlus: game.ngPlus || 0, ended: !!game.ended,
      world: SB.World.serialize(game.world),
      creatures: game.creatures.filter(function (c) { return !c.gone && (c.alive || c.dying) && c.species === "smol"; }).map(plainCreature)
    };
  };

  // The site SDK (cc.save/cc.load) keeps a copy on the player's account when they're logged in.
  // This game's own localStorage save stays the source of truth on this device and the fallback without the SDK.
  var CLOUD_SLOT = "main";
  function sdk() { return window.cc && typeof window.cc.save === "function" ? window.cc : null; }

  Save.save = function (game) {
    if (!game || game.offlineRunning || game.showcase || reloading) return false;
    var snap, ok = false, json = null;
    Save.claim(game);
    try {
      snap = Save.snapshot(game);
      json = JSON.stringify(snap);
      window.localStorage.setItem(KEY, json);
      ok = true;
    } catch (e) {
      // quota / private mode / no storage: ignore
    }
    if (snap) { Save.note(snap); if (json) idb("put", snap.wid, json); }
    var cc = sdk();
    // until the boot-time cloud check answers, a brand-new game must not look "newer" than the account's save
    if (cc && snap && !checking) { try { cc.save(CLOUD_SLOT, snap).catch(function () {}); } catch (e) {} }
    if (ok) { Save.lastAt = Date.now(); if (SB.bus) SB.bus.emit("saved", { game: game }); } // the HUD's 💾 blink
    return ok;
  };

  // After boot: if the account has a newer save (another device), offer it and restart into it.
  // A v1 save on the account (from before the island) goes into the v1 slot, so boot migrates it as usual.
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
        var v1 = d.v !== 2;
        if (v1 && (local || !Array.isArray(d.creatures))) return done(); // this device is already on the island
        if (local && d.savedAt <= (local.savedAt || 0) + 2000) return done();
        if (local && !window.confirm("your account has a newer smol brains save (from another device). load it?")) return done();
        try {
          window.localStorage.setItem(v1 ? KEY_V1 : KEY, JSON.stringify(d));
          if (v1) window.localStorage.removeItem(KEY); // only the brand-new game started this visit; the migration replaces it
        } catch (e) { return done(); }
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
      if (!d || typeof d !== "object" || typeof d.seed !== "number" || d.v !== 2) return null;
      return d;
    } catch (e) { return null; }
  };
  Save.loadV1 = function () {
    try {
      var s = window.localStorage.getItem(KEY_V1);
      if (!s) return null;
      var d = JSON.parse(s);
      return d && typeof d === "object" && Array.isArray(d.creatures) ? d : null;
    } catch (e) { return null; }
  };
  Save.wipe = function () {
    var cur = Save.load();
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    if (cur && cur.wid) Save.forget(cur.wid);
    var cc = sdk(); // the account copy is cleared too, so a fresh start isn't overridden by the old save
    if (cc) { try { cc.save(CLOUD_SLOT, null).catch(function () {}); } catch (e) {} }
  };

  /* ---------------- many worlds (v3.6) ----------------
     The island being played stays in the one localStorage save above (so old builds, the cloud copy and
     the tests all keep working). Every island also has a copy in IndexedDB under its world id, and a small
     list of them (name, day, tier...) lives in localStorage for the "load game" screen. Without IndexedDB
     the browser keeps one island, as before. */
  var INDEX = "smolbrains-worlds", DB = "smolbrains", STORE = "worlds";
  var dbP = null;
  function openDb() {
    if (dbP) return dbP;
    dbP = new Promise(function (ok, no) {
      try {
        if (!window.indexedDB) return no(new Error("no indexeddb"));
        var rq = window.indexedDB.open(DB, 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore(STORE); };
        rq.onsuccess = function () { ok(rq.result); };
        rq.onerror = function () { no(rq.error); };
        rq.onblocked = function () { no(new Error("blocked")); };
      } catch (e) { no(e); }
    });
    dbP.catch(function () {});
    return dbP;
  }
  // idb(op, key, value) -> promise of the result (null on any failure)
  function idb(op, key, val) {
    if (!key) return Promise.resolve(null);
    return openDb().then(function (db) {
      return new Promise(function (ok) {
        try {
          var tx = db.transaction(STORE, op === "get" ? "readonly" : "readwrite"), st = tx.objectStore(STORE);
          var rq = op === "get" ? st.get(key) : op === "put" ? st.put(val, key) : st.delete(key);
          rq.onsuccess = function () { ok(op === "get" ? rq.result : true); };
          rq.onerror = function () { ok(null); };
        } catch (e) { ok(null); }
      });
    }).catch(function () { return null; });
  }
  Save.manyOk = function () { return openDb().then(function () { return true; }, function () { return false; }); };
  function readIndex() {
    try { var d = JSON.parse(window.localStorage.getItem(INDEX) || "null"); return d && Array.isArray(d.list) ? d : { list: [] }; } catch (e) { return { list: [] }; }
  }
  function writeIndex(d) { try { window.localStorage.setItem(INDEX, JSON.stringify(d)); } catch (e) {} }
  Save.newWid = function () { return "w" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36); };
  // every played island gets an id and a name the first time it's saved (saves from before v3.6 included)
  Save.claim = function (game) {
    if (!game.wid) game.wid = Save.newWid();
    if (!game.wname) game.wname = "my first island";
    return game.wid;
  };
  // what the load screen shows about an island, from its save
  Save.meta = function (d) {
    var cs = Array.isArray(d.creatures) ? d.creatures : [], tier = 0;
    cs.forEach(function (c) { if (c && typeof c.tier === "number" && c.tier > tier) tier = c.tier; });
    var st = obj(d.stats), w = obj(obj(d.settings).world);
    return { id: d.wid, name: String(d.wname || "my first island").slice(0, 40), seed: d.seed, n: num(d.n, 256), day: Math.floor(num(d.time, 0) / SB.DAY_LENGTH) + 1, pop: cs.length, tier: Math.max(tier, num(st.maxTier, 0)), gen: num(st.maxGen, 1), savedAt: num(d.savedAt, 0), created: num(d.created, 0), play: Math.round(num(d.playTime, 0)), quirks: Array.isArray(w.quirks) ? w.quirks.slice(0, 3) : [], ended: !!d.ended };
  };
  Save.note = function (d) {
    if (!d || !d.wid) return;
    var ix = readIndex(), m = Save.meta(d), i = ix.list.findIndex(function (e) { return e && e.id === d.wid; });
    if (i >= 0) ix.list[i] = m; else ix.list.push(m);
    ix.active = d.wid;
    writeIndex(ix);
  };
  Save.forget = function (wid) {
    var ix = readIndex();
    ix.list = ix.list.filter(function (e) { return e && e.id !== wid; });
    if (ix.active === wid) ix.active = null;
    writeIndex(ix);
    idb("del", wid);
  };
  // every island this browser keeps, the most recently played first. The live save always counts
  Save.worlds = function () {
    var ix = readIndex(), cur = Save.load(), list = ix.list.filter(function (e) { return e && e.id; });
    if (cur) {
      if (!cur.wid) cur.wid = "legacy"; // a save from before v3.6: it gets a real id when it's next saved
      var m = Save.meta(cur), i = list.findIndex(function (e) { return e.id === cur.wid; });
      if (i >= 0) list[i] = m; else list.push(m);
    }
    return list.sort(function (a, b) { return (b.savedAt || 0) - (a.savedAt || 0); });
  };
  // the island's save, from the live slot or its IndexedDB copy -> promise of the data (or null)
  Save.loadWorld = function (wid) {
    var cur = Save.load();
    if (cur && (cur.wid || "legacy") === wid) return Promise.resolve(cur);
    return idb("get", wid).then(function (s) {
      if (!s) return null;
      try { var d = JSON.parse(s); return d && d.v === 2 && typeof d.seed === "number" ? d : null; } catch (e) { return null; }
    });
  };
  // before another island takes the live slot: make sure the one there is safe in IndexedDB.
  // -> promise of true when it is (or there's nothing to keep)
  Save.stash = function () {
    var cur = Save.load();
    if (!cur) return Promise.resolve(true);
    if (!cur.wid) { cur.wid = Save.newWid(); cur.wname = cur.wname || "my first island"; }
    var json = JSON.stringify(cur);
    return idb("put", cur.wid, json).then(function (ok) {
      if (!ok) return false;
      try { window.localStorage.setItem(KEY, json); } catch (e) {}
      Save.note(cur);
      return true;
    });
  };
  // make an island the live one (the caller then revives it)
  Save.adopt = function (d) {
    try { window.localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {}
    Save.note(d);
  };
  // save slots (the bot's K-0011): keep a copy of this island as it is now. The copy is its own island in
  // 📂 load game ("name · day 12"), so you can go back to it; playing it carries on from there and never
  // touches the original. -> promise of the copy's meta, or null (no IndexedDB, or it couldn't be written)
  Save.keepCopy = function (game) {
    if (!game || game.showcase) return Promise.resolve(null);
    Save.save(game);
    var snap;
    try { snap = Save.snapshot(game); } catch (e) { return Promise.resolve(null); }
    var day = Math.floor(num(snap.time, 0) / SB.DAY_LENGTH) + 1, base = String(game.wname || "my first island").replace(/ · day \d+( \(\d+\))?$/, "");
    snap.wid = Save.newWid();
    snap.wname = (base + " · day " + day).slice(0, 40);
    snap.copyOf = game.wid || null;
    snap.savedAt = Date.now();
    var json = JSON.stringify(snap);
    return idb("put", snap.wid, json).then(function (ok) {
      if (!ok) return null;
      var ix = readIndex(), m = Save.meta(snap);
      ix.list.push(m); // the island you're on stays the active one
      writeIndex(ix);
      return m;
    });
  };
  Save.copies = function (game) { var wid = game && game.wid; return readIndex().list.filter(function (e) { return e && e.id !== wid && e.name && game && e.name.indexOf(String(game.wname || "").replace(/ · day \d+.*$/, "") + " · day ") === 0; }); };
  Save.removeWorld = function (wid) {
    var cur = Save.load();
    if (cur && (cur.wid || "legacy") === wid) {
      try { window.localStorage.removeItem(KEY); } catch (e) {}
      var cc = sdk(); if (cc) { try { cc.save(CLOUD_SLOT, null).catch(function () {}); } catch (e) {} }
    }
    Save.forget(wid);
  };

  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  Save.revive = function (data) {
    data = obj(data);
    var seed = num(data.seed, 1) || 1;
    var game = SB.Game.create(seed, num(data.n, 256), obj(data.settings).world || null); // saves from before v3.5 have no size: those islands are 256 across
    game.time = Math.max(0, num(data.time, game.time));
    game.speed = SB.SPEEDS.indexOf(data.speed) >= 0 ? data.speed : 1;
    if (data.rngState != null) game.rng.setState(data.rngState);
    game.nextId = Math.max(1, num(data.nextId, 1));
    var tools = ["grab", "tickle", "tap", "talk", "magic", "orders"];
    if (data.hand && tools.indexOf(data.hand.tool) >= 0) game.hand.tool = data.hand.tool;
    game.family = obj(data.family); game.achievements = obj(data.achievements); game.tutorial = obj(data.tutorial); game.lantern = data.lantern && typeof data.lantern === "object" ? { embers: Math.max(0, data.lantern.embers | 0), stage: Math.max(0, data.lantern.stage | 0), got: obj(data.lantern.got), log: Array.isArray(data.lantern.log) ? data.lantern.log.slice(-60) : [] } : null; game.quests = data.quests && typeof data.quests === "object" ? data.quests : null; game.nest = data.nest && typeof data.nest === "object" ? { fluff: Math.max(0, data.nest.fluff | 0), cosy: Math.max(0, Math.min(3, data.nest.cosy | 0)) } : null;
    if (typeof game.tutorial.step !== "number") game.tutorial.step = 0;
    game.tutorial.done = !!game.tutorial.done;
    game.log = Array.isArray(data.log) ? data.log.slice(-40) : [];
    var st = obj(data.stats);
    for (var k in st) if (typeof st[k] === "number") game.stats[k] = st[k];
    game.sparks = num(data.sparks, 12); game.blessing = data.blessing || null;
    game.godHeat = num(data.godHeat, 0); game.spoil = num(data.spoil, 0); game.chronicle = Array.isArray(data.chronicle) ? data.chronicle : []; if (SB.Sites) SB.Sites.revive(game, data.sites); game.logsFound = num(data.logsFound, 0); if (SB.Threats) SB.Threats.revive(game, data.threats); game.podsDown = num(data.podsDown, 0); game.podT = data.podT == null ? null : num(data.podT, 0); game.dir = data.dir && typeof data.dir === "object" ? { nextT: num(data.dir.nextT, 480), count: num(data.dir.count, 0), last: data.dir.last || {}, losses: data.dir.losses || [], history: data.dir.history || [], marks: data.dir.marks || [], lastBad: num(data.dir.lastBad, 0), active: null } : null; game.strangerT = data.strangerT == null ? null : num(data.strangerT, 600);
    game.playTime = num(data.playTime, 0); game.created = num(data.created, Date.now()); game.migratedFromV1 = !!data.migratedFromV1;
    game.wid = typeof data.wid === "string" && data.wid !== "legacy" ? data.wid.slice(0, 40) : null; game.wname = typeof data.wname === "string" ? data.wname.slice(0, 40) : null;
    game.settings = obj(data.settings); game.ngPlus = num(data.ngPlus, 0); game.ended = !!data.ended;
    game.world = SB.World.revive(obj(data.world), game);
    game.world.time = game.time;
    var cu = obj(data.culture);
    game.culture = { words: obj(cu.words), found: obj(cu.found), lost: obj(cu.lost), alive: obj(cu.alive), lostCount: num(cu.lostCount, 0), sharedMax: num(cu.sharedMax, 0), spireBoost: !!cu.spireBoost };
    game.tribes = Array.isArray(data.tribes) && data.tribes.length ? data.tribes : null;
    game.villages = Array.isArray(data.villages) ? data.villages : [];
    game.clades = data.clades && data.clades[0] ? data.clades : null;
    game.nextClade = num(data.nextClade, 1);
    SB.Society.init(game);
    SB.Species.init(game);
    var cs = Array.isArray(data.creatures) ? data.creatures : [];
    cs.forEach(function (p) {
      try {
        if (typeof p.genome === "string") p.genome = SB.Genome.decode(p.genome);
        var c = SB.Creature.revive(p, game);
        if (c && c.alive) game.creatures.push(c);
      } catch (e) { if (window.console) console.warn("[save] could not revive creature", p && p.name, e); }
    });
    if (SB.Funeral) SB.Funeral.revive(game, Array.isArray(data.bodies) ? data.bodies : []);
    if (SB.Orders) SB.Orders.revive(game, data.orders);
    if (SB.Mind && SB.Mind.loadLore) SB.Mind.loadLore(game, data.lore); // the tribe's rituals and taboos
    if (SB.Civ) SB.Civ.revive(game, data.civ);
    if (SB.Economy) SB.Economy.revive(game, data.econ);
    fixIds(game);
    if (SB.Collect) { game.collect = obj(data.collect); SB.Collect.backfill(game); } // older saves: everyone gets a serial number
    if (data.selectedId != null && SB.Game.byId(game, data.selectedId)) game.selectedId = data.selectedId;
    return game;
  };

  function fixIds(game) {
    var maxId = 0, ids = {};
    game.creatures.forEach(function (c) { ids[c.id] = c; if (c.id > maxId) maxId = c.id; });
    game.world.items.forEach(function (o) { if (o.id > maxId) maxId = o.id; });
    game.world.structures.forEach(function (s) { if (s.id > maxId) maxId = s.id; });
    for (var fid in game.family) { var n = +fid; if (n > maxId && n < SB.World.NODE_ID0) maxId = n; }
    if (game.nextId <= maxId) game.nextId = maxId + 1;
    // carried things must point at a living carrier
    game.world.items.forEach(function (o) {
      if (o.heldBy != null) { var h = ids[o.heldBy]; if (!h || (h.holding !== o.id && h.tool !== o.id && (h.bag || []).indexOf(o.id) < 0)) { o.heldBy = null; o.onGround = false; o.inBag = false; o.onBelt = false; } }
    });
    game.creatures.forEach(function (c) {
      ["holding", "tool"].forEach(function (slot) { if (c[slot] != null && !game.world.items.some(function (o) { return o.id === c[slot]; })) c[slot] = null; });
      c.bag = (c.bag || []).filter(function (id) { return game.world.items.some(function (o) { return o.id === id; }); });
    });
  }

  /* ---------------- v1 -> v2 ---------------- */

  Save.migrateV1 = function (v1) {
    var seed = (num(v1.seed, 1) >>> 0) % 25600000 || 1;
    var game = SB.Game.create(seed, 256);
    game.migratedFromV1 = true;
    game.tutorial = { step: 99, done: true, wildDone: true };
    game.achievements = obj(v1.achievements);
    var s1 = obj(v1.stats);
    ["hatched", "eggsLaid", "maxGen", "wordsTaught", "tickles", "taps", "deaths", "bestIQ", "grumpNights", "cured", "imported", "exported"].forEach(function (k) { if (typeof s1[k] === "number") game.stats[k] = s1[k]; });
    game.family = obj(v1.family);
    for (var fid in game.family) { var f = game.family[fid]; if (f && f.look) f.look.tier = 0; }
    var maxId = num(v1.nextId, 1);
    for (var k in game.family) if (+k > maxId) maxId = +k;
    (v1.creatures || []).forEach(function (p) { if (p && +p.id > maxId) maxId = +p.id; });
    game.nextId = maxId + 1; // new things get ids above everything from the old valley
    var nest = game.world.T.nest, n = 0;
    (v1.creatures || []).forEach(function (p) {
      if (!p || p.species !== "smol" || p.alive === false) return;
      try {
        var genome = SB.Genome.upgrade(p.genome);
        var ang = n * 2.4, r = 1.6 + n * 0.5;
        var x = nest.x + Math.cos(ang) * r, z = nest.z + Math.sin(ang) * r;
        if (!SB.World.walkable(game.world, x, z)) { x = nest.x; z = nest.z; }
        var c = SB.Creature.create(game, { species: "smol", genome: genome, name: p.name, gen: p.gen, parents: p.parents, age: Math.min(num(p.age, 0), SB.STAGES[4].from - 60), vocab: obj(p.vocab), x: x, z: z,
          brain: p.brain ? SB.Brain.deserialize(p.brain, genome, game.rng) : null });
        c.id = num(p.id, c.id);
        c.stats = Object.assign(c.stats, obj(p.stats));
        c.age = Math.min(num(p.age, 0), SB.STAGES[4].from - 60);
        c.stage = SB.Creature.stageFor(c.age);
        // lifespans were longer in the old valley; keep each smol's remaining life fair
        c.lifespan = Math.max(c.age + 1500, c.lifespan);
        game.creatures.push(c);
        if (!game.family[c.id]) SB.Game.familyAdd(game, c);
        if (c.id > maxId) maxId = c.id;
        n++;
      } catch (e) { if (window.console) console.warn("[save] v1 smol could not migrate", p && p.name, e); }
    });
    ((v1.world && v1.world.objects) || []).forEach(function (o) {
      if (!o || o.kind !== "egg" || !o.data || !o.data.genome) return;
      var g = typeof o.data.genome === "string" ? SB.Genome.decode(o.data.genome) : SB.Genome.upgrade(o.data.genome);
      var ang = n * 2.4, r = 1.2 + n * 0.4;
      SB.World.add(game.world, game, "egg", nest.x + Math.cos(ang) * r, nest.z + Math.sin(ang) * r, { genome: g, parents: o.data.parents || [], gen: o.data.gen || g.gen || 1, progress: Math.min(0.9, num(o.data.progress, 0.3)) });
      n++;
    });
    if (game.nextId <= maxId) game.nextId = maxId + 1;
    if (!game.creatures.length && !game.world.items.some(function (o) { return o.kind === "egg"; })) return null;
    game.time = SB.DAY_LENGTH * 0.3;
    SB.Game.unlock(game, "migrate");
    SB.Game.note(game, "your smols from the old valley woke up on an island. it's a lot bigger out here. 🏝");
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
    for (var w in c.vocab || {}) { var v = c.vocab[w]; if (v >= 0.05 && SB.LEXICON[w] && SB.LEXICON[w].type !== "idea") vocab[w] = Math.round(v * 100) / 100; }
    var ideas = {};
    for (var id in c.ideas || {}) if (c.ideas[id] >= 1) ideas[id] = 1;
    var payload = {
      name: String(c.name || "smol").slice(0, 32), gen: c.gen || 1,
      genome: SB.Genome.encode(c.genome), brain: c.brain ? plain(SB.Brain.serialize(c.brain), 0) : null,
      vocab: vocab, ideas: ideas, age: Math.min(Math.round(c.age || 0), SB.STAGES[3].from)
    };
    if (SB.Collect) {
      if (c.oid) payload.oid = c.oid;
      if (c.serial) payload.ser = c.serial;
      payload.ck = SB.Collect.checksum(JSON.stringify(payload)); // the last key, over everything before it
    }
    return "SMOL2:" + b64urlEncode(JSON.stringify(payload));
  };

  Save.importSmol = function (code) {
    var bad = function () { return new Error("not a smol code"); };
    if (typeof code !== "string") throw bad();
    var s = code.replace(/\s+/g, "");
    var m = /^SMOL(\d*):/i.exec(s);
    if (m) s = s.slice(m[0].length);
    if (!s || /[^A-Za-z0-9\-_+/=]/.test(s)) throw bad();
    var p;
    try { p = JSON.parse(b64urlDecode(s)); } catch (e) { throw bad(); }
    if (!p || typeof p !== "object" || !p.genome) throw bad();
    var signed = false;
    if (p.ck != null && SB.Collect) {
      var rest = {};
      for (var pk in p) if (pk !== "ck") rest[pk] = p[pk];
      if (SB.Collect.checksum(JSON.stringify(rest)) !== p.ck) { var e2 = new Error("this smol code was changed or mistyped"); e2.tampered = true; throw e2; }
      signed = true;
    }
    var genome;
    try { genome = typeof p.genome === "string" ? SB.Genome.decode(p.genome) : SB.Genome.upgrade(p.genome); } catch (e) { throw bad(); }
    if (!signed) delete genome.cx; // an unsigned code keeps no traits of its own: they come from its genes, so nobody can type in a legendary
    var vocab = {};
    for (var w in obj(p.vocab)) { var v = num(p.vocab[w], 0); if (v > 0 && SB.LEXICON[w]) vocab[w] = Math.min(1.5, v); }
    var ideas = {};
    for (var id in obj(p.ideas)) if (SB.Ideas.BY_ID[id]) ideas[id] = 1;
    var name = String(p.name || "smol").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24) || "smol";
    var oid = typeof p.oid === "string" ? p.oid.slice(0, 40) : null;
    return { name: name, gen: Math.max(1, Math.floor(num(p.gen, 1))), genome: genome, brain: p.brain || null, vocab: vocab, ideas: ideas, age: SB.clamp(num(p.age, 0), 0, SB.STAGES[3].from),
      oid: oid, ser: num(p.ser, 0), key: SB.Collect ? SB.Collect.importKey(typeof p.genome === "string" ? p.genome : JSON.stringify(p.genome), oid) : null };
  };
})();
