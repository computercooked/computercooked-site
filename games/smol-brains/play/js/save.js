/* smol brains 2 — save.js
   Autosave/load (localStorage, v2 key), the v1 -> v2 migration ("your smols from the old valley woke up
   on an island"), and copy-paste smol codes (SMOL2:..., SMOL1 codes still import). The v1 save is never
   touched, so going back is always possible. */
(function () {
  "use strict";
  var SB = window.SB;
  var Save = (SB.Save = {});
  var KEY = "smolbrains-save-v2", KEY_V1 = "smolbrains-save-v1";
  var CREATURE_DROP = { brain: 1, action: 1, attn: 1, speech: 1, plan: 1, anim: 1, look: 1, px: 1, pz: 1, py: 1, far: 1, moving: 1, heard: 1, lastDone: 1, badMeal: 1, type: 1, lost: 1 };

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

  Save.snapshot = function (game) {
    return {
      v: 2, savedAt: Date.now(), seed: game.seed, rngState: game.rng.state(),
      time: round(game.time), speed: game.speed, nextId: game.nextId, selectedId: game.selectedId,
      hand: { tool: game.hand.tool }, family: plain(game.family, 0), stats: plain(game.stats, 0), achievements: plain(game.achievements, 0),
      tutorial: plain(game.tutorial, 0), log: plain(game.log.slice(-40), 0), sparks: round(game.sparks || 0), blessing: plain(game.blessing, 0),
      culture: plain({ words: game.culture.words, found: game.culture.found, lost: game.culture.lost, alive: game.culture.alive, lostCount: game.culture.lostCount }, 0),
      tribes: plain(game.tribes, 0), villages: plain(game.villages, 0), clades: plain(game.clades, 0), nextClade: game.nextClade,
      playTime: round(game.playTime || 0), created: game.created, migratedFromV1: !!game.migratedFromV1, settings: plain(game.settings || {}, 0),
      world: SB.World.serialize(game.world),
      creatures: game.creatures.filter(function (c) { return !c.gone && (c.alive || c.dying) && c.species === "smol"; }).map(plainCreature)
    };
  };

  Save.save = function (game) {
    if (!game || game.offlineRunning) return false;
    try { window.localStorage.setItem(KEY, JSON.stringify(Save.snapshot(game))); return true; }
    catch (e) { return false; }
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
  Save.wipe = function () { try { window.localStorage.removeItem(KEY); } catch (e) {} };

  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  function obj(v) { return v && typeof v === "object" && !Array.isArray(v) ? v : {}; }

  Save.revive = function (data) {
    data = obj(data);
    var seed = num(data.seed, 1) || 1;
    var game = SB.Game.create(seed);
    game.time = Math.max(0, num(data.time, game.time));
    game.speed = SB.SPEEDS.indexOf(data.speed) >= 0 ? data.speed : 1;
    if (data.rngState != null) game.rng.setState(data.rngState);
    game.nextId = Math.max(1, num(data.nextId, 1));
    var tools = ["grab", "tickle", "tap", "talk", "magic"];
    if (data.hand && tools.indexOf(data.hand.tool) >= 0) game.hand.tool = data.hand.tool;
    game.family = obj(data.family); game.achievements = obj(data.achievements); game.tutorial = obj(data.tutorial);
    if (typeof game.tutorial.step !== "number") game.tutorial.step = 0;
    game.tutorial.done = !!game.tutorial.done;
    game.log = Array.isArray(data.log) ? data.log.slice(-40) : [];
    var st = obj(data.stats);
    for (var k in st) if (typeof st[k] === "number") game.stats[k] = st[k];
    game.sparks = num(data.sparks, 12); game.blessing = data.blessing || null;
    game.playTime = num(data.playTime, 0); game.created = num(data.created, Date.now()); game.migratedFromV1 = !!data.migratedFromV1;
    game.settings = obj(data.settings);
    game.world = SB.World.revive(obj(data.world), game);
    game.world.time = game.time;
    var cu = obj(data.culture);
    game.culture = { words: obj(cu.words), found: obj(cu.found), lost: obj(cu.lost), alive: obj(cu.alive), lostCount: num(cu.lostCount, 0) };
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
    fixIds(game);
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
    var game = SB.Game.create(seed);
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
    var genome;
    try { genome = typeof p.genome === "string" ? SB.Genome.decode(p.genome) : SB.Genome.upgrade(p.genome); } catch (e) { throw bad(); }
    var vocab = {};
    for (var w in obj(p.vocab)) { var v = num(p.vocab[w], 0); if (v > 0 && SB.LEXICON[w]) vocab[w] = Math.min(1.5, v); }
    var ideas = {};
    for (var id in obj(p.ideas)) if (SB.Ideas.BY_ID[id]) ideas[id] = 1;
    var name = String(p.name || "smol").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 24) || "smol";
    return { name: name, gen: Math.max(1, Math.floor(num(p.gen, 1))), genome: genome, brain: p.brain || null, vocab: vocab, ideas: ideas, age: SB.clamp(num(p.age, 0), 0, SB.STAGES[3].from) };
  };
})();
