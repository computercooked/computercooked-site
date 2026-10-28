/* smol brains — orders.js
   The sky's orders: strategy without puppets. You can't steer a smol, but you can leave signs it may follow:
   a rally flag, an explore beacon, work marks on trees and rocks (RimWorld-style designations), building
   blueprints, zones (no-go, stockpile, home) and a nudge to each smol's job interests. Whether a smol
   follows depends on how much it trusts the sky (tickles, answered prayers, orders that worked out), its
   personality (obedient or stubborn, curious, brave) and what it needs right now. Order too much and they
   get annoyed. How often they listen is the strategy. */
(function () {
  "use strict";
  var SB = window.SB;
  var O = (SB.Orders = {});
  var V = SB.V;

  O.KINDS = {
    rally: { e: "🚩", name: "rally", tier: 0, cost: 1, life: 180, cap: 99, desc: "gather here. for raids, storms and saying goodbye." },
    explore: { e: "🔭", name: "explore", tier: 1, cost: 1, life: 300, cap: 3, desc: "curious smols head out there, even into the fog." },
    mark: { e: "🪓", name: "work", tier: 2, cost: 0.6, life: 300, cap: 3, desc: "tap a tree to chop, a bush or field to harvest, a rock to mine, a bunny to hunt." },
    build: { e: "📐", name: "build", tier: 2, cost: 1.2, cap: 99, desc: "place a building they know. builders do it there instead of picking their own spot." },
    nogo: { e: "🚫", name: "no-go", tier: 0, cost: 0.5, zone: true, r: 6, desc: "keep out: danger, or a taboo place." },
    stock: { e: "📦", name: "stockpile", tier: 2, cost: 0.5, zone: true, r: 3.5, desc: "willing smols bring what they gather here. builders find it fast." },
    home: { e: "🏠", name: "home", tier: 0, cost: 0.5, zone: true, r: 10, desc: "where they settle: new buildings go here and wanderers drift back." }
  };
  O.PRIO = [["gather", "🧺", "gather"], ["build", "🔨", "build"], ["craft", "🛠", "craft"], ["explore", "👣", "explore"], ["care", "💚", "care"], ["fight", "👊", "fight"]];
  var MAX_ORDERS = 14, MAX_ZONES = 8, REROLL = 45;
  var FOLLOW = ["the sky wants it!", "ok sky!", "sky says go!", "for the sky!", "on it!"], NAH = ["nah", "busy", "later…", "hmph", "no thanks"];

  function rng(game) { return game.rng; }
  function gene(c, k) { var g = c.genome && c.genome.genes; return g && g[k] != null ? g[k] : 0.5; }
  O.ensure = function (game) {
    var od = game.orders;
    if (!od || typeof od !== "object" || !Array.isArray(od.list)) od = game.orders = { list: [], heat: 0, nextId: 1, placed: 0, followed: 0, refused: 0, annoyed: 0 };
    return od;
  };
  // blobs can follow a rally flag and keep to their zones as soon as the tutorial is done (the bot's K-0011:
  // "zones and a go-there at the blob stage"); work marks, blueprints and stockpiles wait for tool-users
  O.unlocked = function (game) { return (game.stats && game.stats.maxTier || 0) >= 2 || !!(game.tutorial && game.tutorial.done); };

  /* ---------------- trust ---------------- */
  // how much this smol trusts the sky, 0..1 (0.5 to start). the minds' faith, when a smol has one, counts too
  O.trust = function (c) {
    var t = typeof c.trust === "number" ? c.trust : 0.5;
    if (typeof c.faith === "number") t = t * 0.6 + SB.clamp(c.faith, 0, 1) * 0.4;
    return SB.clamp(t, 0, 1);
  };
  function addTrust(c, d) { c.trust = SB.clamp((typeof c.trust === "number" ? c.trust : 0.5) + d, 0, 1); }
  O.addTrust = addTrust;

  // the chance this smol follows an order of this kind right now (0..1)
  O.willing = function (c, game, kind, o) {
    if (!c || c.species !== "smol" || c.stranger) return 0;
    var K = O.KINDS[kind];
    if (K && c.tier < K.tier) return 0;
    var ch = c.chem, ob = gene(c, "obedience");
    var w = 0.06 + O.trust(c) * 0.7 + (ob - 0.5) * 0.5;
    if (kind === "explore") w += (gene(c, "curiosity") - 0.5) * 0.6;
    if (kind === "mark" && o && o.target && o.target.type === "item") w += (gene(c, "bravery") - 0.5) * 0.4; // a hunt
    if (kind === "rally" && ch.fear > 0.4) w += 0.15; // scared smols are glad of somewhere to go
    if (ob < 0.3) w *= 0.6; // stubborn
    var urgent = Math.max(ch.hunger, ch.sick, ch.pain, ch.sleepy * 0.85);
    if (urgent > 0.7) w *= 0.35; else if (urgent > 0.5) w *= 0.7;
    var heat = (game.orders && game.orders.heat) || 0;
    w *= Math.max(0.3, 1 - Math.max(0, heat - 2.5) * 0.12);
    return SB.clamp(w, 0.02, 0.97);
  };

  // decide once per order (a refusal is reconsidered after a while), and say so
  function decide(c, game, o) {
    var d = c.ord || (c.ord = {}), k = o.id, prev = d[k];
    if (prev && (prev.f || game.time - prev.t < REROLL || prev.n >= 2)) return !!prev.f; // a refusal gets two more thoughts, then that's that
    var p = O.willing(c, game, o.kind, o), f = rng(game)() < p;
    d[k] = { f: f ? 1 : 0, t: game.time, n: prev ? (prev.n || 0) + 1 : 0 };
    var od = game.orders;
    if (f) { od.followed++; o.yes = (o.yes || 0) + 1; } else { od.refused++; o.no = (o.no || 0) + 1; }
    if (!c.far && !c.speech && !prev) {
      if (c.tier >= 3) SB.Creature.say(c, f ? rng(game).pick(FOLLOW) : c.chem.hunger > 0.5 ? "food first" : rng(game).pick(NAH), game);
      else if (SB.Creature.emote) SB.Creature.emote(c, f ? "idea" : "huh", 1.4);
    }
    SB.bus.emit(f ? "orderFollow" : "orderRefuse", { c: c, o: o });
    return f;
  }
  O.decide = decide;

  /* ---------------- placing orders ---------------- */
  function heatUp(game, amt) {
    var od = O.ensure(game);
    od.heat += amt;
    if (od.heat > 4) {
      // bossy sky: everyone trusts it a little less, and some say so
      var over = od.heat - 4;
      SB.Game.smols(game).forEach(function (c) {
        addTrust(c, -0.02 * Math.min(2, over));
        SB.Chem.apply(c.chem, { anger: 0.04 * Math.min(2, over) });
        if (!c.far && !c.speech && c.tier >= 3 && rng(game).chance(0.15)) SB.Creature.say(c, rng(game).pick(["so bossy", "sky, chill", "orders orders orders", "let us be!"]), game);
      });
      od.annoyed++;
      SB.bus.emit("ordersAnnoyed", { heat: od.heat });
    }
  }
  function newOrder(game, kind, x, z, extra) {
    var od = O.ensure(game), K = O.KINDS[kind];
    var o = { id: od.nextId++, kind: kind, x: x, z: z, t: game.time, until: K.life ? game.time + K.life : null, yes: 0, no: 0 };
    if (K.zone) o.r = K.r;
    for (var k in extra) o[k] = extra[k];
    od.list.push(o);
    od.placed++;
    heatUp(game, K.cost);
    SB.Game.unlock && SB.Game.unlock(game, "order");
    SB.bus.emit("order", { o: o });
    return o;
  }
  // place an order at a spot (or on a thing, for work marks). returns {ok, o, msg}
  O.place = function (game, kind, x, z, opts) {
    opts = opts || {};
    var od = O.ensure(game), K = O.KINDS[kind], w = game.world;
    if (!K) return { ok: false, msg: "?" };
    if (!SB.World.inBounds(w, x, z)) return { ok: false, msg: "that's off the island" };
    if (kind !== "explore" && !SB.World.isSeen(w, x, z)) return { ok: false, msg: "nobody's seen that place yet. 🔭 explore it first" };
    if (K.zone) {
      // tap an existing zone of the same kind to clear it
      var same = O.zoneAt(game, x, z, kind);
      if (same) { O.remove(game, same.id); return { ok: true, removed: true, msg: K.e + " " + K.name + " zone cleared" }; }
      if (od.list.filter(function (o) { return O.KINDS[o.kind].zone; }).length >= MAX_ZONES) return { ok: false, msg: "that's a lot of zones. tap one to clear it first" };
      if (kind === "home") od.list.filter(function (o) { return o.kind === "home"; }).forEach(function (o) { O.remove(game, o.id); }); // one home
      return { ok: true, o: newOrder(game, kind, x, z, {}) };
    }
    if (od.list.filter(function (o) { return !O.KINDS[o.kind].zone; }).length >= MAX_ORDERS) return { ok: false, msg: "too many orders at once. clear some (✕ in the list)" };
    if (kind === "rally" || kind === "explore") {
      od.list.filter(function (o) { return o.kind === kind; }).forEach(function (o) { O.remove(game, o.id); }); // one flag, one beacon
      return { ok: true, o: newOrder(game, kind, x, z, {}) };
    }
    if (kind === "mark") {
      var t = opts.hit ? markTarget(game, opts.hit) : null;
      if (!t) return { ok: false, msg: "tap a tree, bush, rock, field or bunny" };
      var dup = od.list.filter(function (o) { return o.kind === "mark" && o.target.id === t.target.id; })[0];
      if (dup) { O.remove(game, dup.id); return { ok: true, removed: true, msg: "mark cleared" }; }
      return { ok: true, o: newOrder(game, "mark", t.x, t.z, { target: t.target, job: t.job, label: t.label }) };
    }
    if (kind === "build") return O.blueprint(game, opts.build, x, z);
    return { ok: false };
  };

  // what a work mark on this thing means: {target, job, label, x, z} or null
  var ROCKS = { boulder: 1, flintrock: 1, orevein: 1, crystals: 1, claybank: 1 }, PICKS = { bush: 1, herbs: 1, reeds: 1, shrooms: 1 };
  function markTarget(game, hit) {
    var r = hit.ref;
    if (!r) return null;
    if (hit.type === "node") {
      var def = SB.NODES[r.kind];
      if (r.state !== "ok") return null;
      if (ROCKS[r.kind]) return { target: { type: "node", id: r.id }, job: "mine", label: "⛏ mine", x: r.x, z: r.z };
      if (PICKS[r.kind]) return { target: { type: "node", id: r.id }, job: "pick", label: "🧺 harvest", x: r.x, z: r.z };
      if (def && def.noun === "plant" && SB.Ideas && SB.Ideas.GATHER[r.kind]) return { target: { type: "node", id: r.id }, job: "chop", label: "🪓 chop", x: r.x, z: r.z };
      return null;
    }
    if (hit.type === "struct" && r.kind === "farm" && r.done) return { target: { type: "struct", id: r.id }, job: "harvest", label: "🌾 harvest", x: r.x, z: r.z };
    if (hit.type === "item" && SB.KINDS[r.kind] && SB.KINDS[r.kind].critter) return { target: { type: "item", id: r.id }, job: "hunt", label: "🔱 hunt", x: r.x, z: r.z };
    return null;
  }
  O.markTarget = markTarget;

  // the buildings the tribe could put up where you point
  O.buildable = function (game) {
    var out = [], smols = SB.Game.smols(game);
    SB.Ideas.LIST.forEach(function (d) {
      if (d.kind !== "build" || d.build === "bridge" || d.pov) return;
      if (smols.some(function (c) { return SB.Ideas.known(c, d.id) || (d.build === "spire" && c.tier >= 6 && SB.Ideas.known(c, "resonance")); })) out.push({ kind: d.build, idea: d.id, e: SB.STRUCTS[d.build].emoji, name: SB.STRUCTS[d.build].label });
    });
    return out;
  };
  O.canPlace = function (game, kind, x, z) {
    var def = SB.STRUCTS[kind];
    return !!def && SB.World.isSeen(game.world, x, z) && SB.World.siteFree(game.world, x, z, def.r) && !O.zoneAt(game, x, z, "nogo");
  };
  O.blueprint = function (game, kind, x, z) {
    var def = SB.STRUCTS[kind];
    if (!def || !O.buildable(game).some(function (b) { return b.kind === kind; })) return { ok: false, msg: "nobody knows how to build that yet" };
    if (!O.canPlace(game, kind, x, z)) return { ok: false, msg: "can't build " + def.label + " there. it needs flat, open, dry ground" };
    var home = SB.Society.home(game, 0), rot = kind === "wall" ? Math.atan2(z - home.z, x - home.x) + Math.PI / 2 : rng(game)() * 6.283;
    var st = SB.World.addStructure(game.world, game, kind, x, z, { tribe: 0, rot: rot });
    st.founder = "the sky"; st.data.bp = 1;
    SB.bus.emit("siteStarted", { c: null, st: st, blueprint: true });
    return { ok: true, o: newOrder(game, "build", x, z, { site: st.id, build: kind }) };
  };

  O.remove = function (game, id) {
    var od = O.ensure(game), i = -1;
    for (var k = 0; k < od.list.length; k++) if (od.list[k].id === id) i = k;
    if (i < 0) return false;
    var o = od.list[i];
    od.list.splice(i, 1);
    if (o.kind === "build") { // an untouched blueprint goes away with its order; a started one stays a building site
      var st = SB.World.structById(game.world, o.site);
      if (st && !st.done && !st.work && !st.builders.length && untouched(st)) SB.World.removeStructure(game.world, st);
    }
    SB.Game.smols(game).forEach(function (c) { if (c.ord) delete c.ord[id]; if (c.ordOn === id) c.ordOn = null; });
    return true;
  };
  function untouched(st) { var cost = SB.STRUCTS[st.kind].cost; for (var k in cost) if ((st.need[k] || 0) < cost[k]) return false; return true; }
  O.byId = function (game, id) { var od = O.ensure(game); for (var i = 0; i < od.list.length; i++) if (od.list[i].id === id) return od.list[i]; return null; };
  O.zoneAt = function (game, x, z, kind) {
    var od = game.orders;
    if (!od || !od.list.length) return null;
    for (var i = 0; i < od.list.length; i++) { var o = od.list[i]; if (o.r && (!kind || o.kind === kind) && SB.dist(o.x, o.z, x, z) < o.r) return o; }
    return null;
  };
  function first(game, kind) { var l = game.orders.list; for (var i = 0; i < l.length; i++) if (l[i].kind === kind) return l[i]; return null; }

  /* ---------------- smols thinking about orders ----------------
     Called from the creature's think() before its brain decides. Returns true when it acted on an order. */
  var MAT = { stick: 1, log: 1, stone: 1, fiber: 1, flint: 1, clay: 1, ore: 1, metal: 1, crystal: 1, seed: 1, grain: 1, fur: 1, herb: 1, berry: 1, apple: 1, banana: 1, shroom: 1, meat: 1, fish: 1 };
  O.think = function (c, game) {
    var od = game.orders;
    if (!od || !od.list.length || c.species !== "smol" || c.stranger || c.heldBy || c.convo) return false;
    var ch = c.chem;
    if (ch.hunger > 0.8 || ch.sick > 0.6 || (ch.sleepy > 0.9 && !game.world.night)) { c.ordOn = null; return false; } // needs come first
    // standing in a no-go zone: get out (if it listens)
    var ng = O.zoneAt(game, c.x, c.z, "nogo");
    if (ng && decide(c, game, ng)) {
      var ex0 = exitOf(game, ng, c);
      c.ordOn = ng.id;
      if (ex0) return SB.Creature.sendTo(c, ex0.x, ex0.z, game, 10);
    }
    var rally = first(game, "rally");
    if (rally && SB.dist(c.x, c.z, rally.x, rally.z) < 90 && decide(c, game, rally)) {
      c.ordOn = rally.id;
      var dr = SB.dist(c.x, c.z, rally.x, rally.z);
      if (dr > 3.2) return SB.Creature.sendTo(c, rally.x + rng(game).range(-1.8, 1.8), rally.z + rng(game).range(-1.8, 1.8), game, 20);
      if (!c.ordSeen || c.ordSeen !== rally.id) { c.ordSeen = rally.id; addTrust(c, 0.004); }
      if (rng(game).chance(0.75)) { SB.Creature.startOn(c, game, V.idle, null); c.action.dur = 3; return true; }
      return false; // the odd moment off: eat, chat, play nearby
    }
    if (c.tier >= 2) {
      // blueprints: a builder who knows how goes and builds it, right there
      for (var i = 0; i < od.list.length; i++) {
        var o = od.list[i];
        if (o.kind !== "build") continue;
        var st = SB.World.structById(game.world, o.site);
        if (!st || st.done) continue;
        var id = SB.Ideas.forStruct[st.kind];
        if (!(SB.Ideas.known(c, id) || (st.kind === "spire" && c.tier >= 6)) || c.stage <= 1) continue;
        if (SB.dist(c.x, c.z, st.x, st.z) > 70 || !decide(c, game, o)) continue;
        var plan = SB.Ideas.planForSite(c, st, game);
        if (!plan) continue;
        plan.verb = V.build; plan.start = SB.Chem.drives(ch, new Float32Array(SB.N_DRIVES));
        c.plan = plan; c.action = null; c.ordOn = o.id;
        return true;
      }
      // work marks
      for (var j = 0; j < od.list.length; j++) {
        var m = od.list[j];
        if (m.kind !== "mark" || SB.dist(c.x, c.z, m.x, m.z) > 50) continue;
        var busy = 0;
        SB.Game.smols(game).forEach(function (o2) { if (o2 !== c && o2.ordOn === m.id && o2.action) busy++; });
        if (busy >= O.KINDS.mark.cap || !decide(c, game, m)) continue;
        if (doMark(c, game, m)) { c.ordOn = m.id; return true; }
      }
    }
    // explore beacon: curious ones head out
    var ex = first(game, "explore");
    if (ex && !ex.reached) {
      var goers = 0;
      SB.Game.smols(game).forEach(function (o3) { if (o3 !== c && o3.ordOn === ex.id) goers++; });
      if (goers < O.KINDS.explore.cap && c.stage >= 2 && decide(c, game, ex)) {
        c.ordOn = ex.id;
        if (SB.dist(c.x, c.z, ex.x, ex.z) < 4) { reached(game, ex, c); return false; }
        return SB.Creature.sendTo(c, ex.x, ex.z, game, 25);
      }
    }
    // the stockpile: bring what you gathered
    var sp = c.tier >= 2 && !c.plan ? nearestZone(game, c, "stock", 60) : null;
    if (sp && ch.hunger < 0.55) {
      var goods = cargo(c, game);
      if (goods.length && decide(c, game, sp)) {
        if (SB.dist(c.x, c.z, sp.x, sp.z) > sp.r * 0.6) { c.ordOn = sp.id; return SB.Creature.sendTo(c, sp.x + rng(game).range(-1, 1), sp.z + rng(game).range(-1, 1), game, 20); }
        goods.forEach(function (it) { SB.Creature.dropItem(c, it, game, 0.4); it.data.piled = 1; });
        sp.n = (sp.n || 0) + goods.length;
        if (!c.far && rng(game).chance(0.3)) SB.Creature.say(c, c.tier >= 3 ? "for the pile!" : "📦", game);
        c.ordOn = null;
        SB.bus.emit("stockpiled", { c: c, n: goods.length });
        return false;
      }
    }
    c.ordOn = null;
    return false;
  };
  // the nearest dry, walkable way out of a zone
  function exitOf(game, z, c) {
    var best = null, bd = 1e9, w = game.world;
    for (var k = 0; k < 12; k++) {
      var a = k / 12 * 6.2832, x = z.x + Math.sin(a) * (z.r + 2.2), zz = z.z + Math.cos(a) * (z.r + 2.2);
      if (!SB.World.inBounds(w, x, zz) || !SB.World.walkable(w, x, zz) || SB.World.depthAt(w, x, zz) > 0.1 || O.zoneAt(game, x, zz, "nogo")) continue;
      var d = SB.dist(x, zz, c.x, c.z);
      if (d < bd) { bd = d; best = { x: x, z: zz }; }
    }
    return best;
  }
  // gathered stuff a smol could put on the pile (not tools, not what it's about to use)
  function cargo(c, game) {
    var out = [];
    [c.holding].concat(c.bag).forEach(function (id) { if (id == null) return; var it = SB.Game.byId(game, id); if (it && MAT[it.kind] && !it.reserved && !(it.data && it.data.rotten)) out.push(it); });
    if (out.length && c.chem.hunger > 0.35) out = out.filter(function (it) { return SB.KINDS[it.kind].noun !== "food"; });
    return out;
  }
  function nearestZone(game, c, kind, R) {
    var best = null, bd = R;
    game.orders.list.forEach(function (o) { if (o.kind === kind) { var d = SB.dist(o.x, o.z, c.x, c.z); if (d < bd) { bd = d; best = o; } } });
    return best;
  }
  function reached(game, ex, c) {
    if (ex.reached) return;
    ex.reached = true; ex.until = game.time + 20;
    addTrust(c, 0.01);
    SB.World.reveal(game.world, ex.x, ex.z, 12);
    SB.bus.emit("orderDone", { o: ex, c: c, msg: "🔭 " + c.name + " reached the beacon" });
  }
  // do the marked job (a single action; the mark stays until the job's done)
  function doMark(c, game, m) {
    var t = SB.Creature.resolve(game, m.target);
    if (!t) return false;
    var I = SB.Ideas, tool = I.toolKind(c, game) || I.heldKind(c, game), n = t.ref;
    switch (m.job) {
      case "chop": {
        if (n.state !== "ok") return false;
        var axe = tool === "axe" || tool === "stoneaxe" || I.toolKind(c, game) === "axe" || I.toolKind(c, game) === "stoneaxe";
        return SB.Creature.startOn(c, game, axe ? V.use : V.pickup, m.target);
      }
      case "pick": case "mine": {
        var g = I.GATHER[n.kind];
        if (!g || n.state !== "ok" || c.tier < g[3]) return false;
        if (g[1] && I.toolKind(c, game) !== g[1] && I.heldKind(c, game) !== g[1]) { if (!c.far && !c.speech && rng(game).chance(0.3)) SB.Creature.say(c, "need " + g[1], game); return false; }
        return SB.Creature.startOn(c, game, V.pickup, m.target);
      }
      case "harvest": return n.done && n.data.grow > 0.6 ? SB.Creature.startOn(c, game, V.use, m.target) : false;
      case "hunt": {
        if (I.toolKind(c, game) !== "spear" && I.heldKind(c, game) !== "spear") { if (!c.far && !c.speech && rng(game).chance(0.3)) SB.Creature.say(c, c.tier >= 3 ? "no spear" : "?", game); return false; }
        return SB.Creature.startOn(c, game, V.use, m.target); // a spear on the belt counts
      }
    }
    return false;
  }

  // a wander target inside a no-go zone gets turned round; wanderers far from the home zone drift back
  O.steer = function (c, game, a) {
    var od = game.orders;
    if (!od || !od.list.length || a.called) return;
    var ng = O.zoneAt(game, a.tx, a.tz, "nogo");
    if (ng && decide(c, game, ng)) {
      var ang = Math.atan2(a.tx - ng.x, a.tz - ng.z), ca = Math.atan2(c.x - ng.x, c.z - ng.z);
      if (SB.dist(c.x, c.z, ng.x, ng.z) < ng.r) ang = ca;
      else ang = ca + (rng(game)() - 0.5) * 1.2; // stay on this side
      var r = ng.r + 2 + rng(game)() * 4;
      a.tx = ng.x + Math.sin(ang) * r; a.tz = ng.z + Math.cos(ang) * r;
    }
    var hz = first(game, "home");
    if (hz && SB.dist(c.x, c.z, hz.x, hz.z) > hz.r + 12 && rng(game).chance(0.35) && decide(c, game, hz)) {
      a.tx = hz.x + rng(game).range(-hz.r, hz.r) * 0.6; a.tz = hz.z + rng(game).range(-hz.r, hz.r) * 0.6;
    }
  };

  // builders choosing their own spot: inside the home zone if there is one, never in a no-go zone
  if (SB.Ideas && SB.Ideas.pickSite) {
    var pickSite0 = SB.Ideas.pickSite;
    SB.Ideas.pickSite = function (c, kind, game) {
      var od = game.orders;
      if (!od || !od.list.length || kind === "bridge") return pickSite0(c, kind, game);
      var hz = first(game, "home"), t = SB.Society.tribe(game, c.tribe), keep = t && t.home ? { x: t.home.x, z: t.home.z } : null;
      if (hz && keep && !(kind === "spire")) { t.home.x = hz.x; t.home.z = hz.z; }
      try {
        for (var i = 0; i < 4; i++) { var s = pickSite0(c, kind, game); if (!s || !O.zoneAt(game, s.x, s.z, "nogo")) return s; }
        return null;
      } finally { if (hz && keep) { t.home.x = keep.x; t.home.z = keep.z; } }
    };
  }

  // job interests (the priorities panel): a nudge to the brain's choice, weaker for stubborn smols
  var GATHERN = { stick: 1, stone: 1, material: 1, plant: 1, crop: 1, food: 1 };
  O.bias = function (c, game, noun, mask, bias) {
    var P = c.prio;
    if (!P) return false;
    var k = (gene(c, "obedience") < 0.3 ? 0.3 : 1) * (0.4 + O.trust(c) * 0.6), any = false;
    function add(v, amt) { if (mask[v] && amt) { bias[v] += amt * k; any = true; } }
    if (P.gather && GATHERN[noun]) add(V.pickup, P.gather * 0.35);
    if (P.build) add(V.build, P.build * 0.4);
    if (P.craft) add(V.make, P.craft * 0.4);
    if (P.explore) add(V.wander, P.explore * 0.3);
    if (P.care && noun === "smol") { add(V.give, P.care * 0.3); add(V.cuddle, P.care * 0.2); add(V.teach, P.care * 0.3); }
    if (P.fight && noun === "grump") { add(V.hit, P.fight * 0.5); if (P.fight < 0) add(V.flee, 0.35); }
    return any;
  };
  O.setPrio = function (c, job, v) {
    c.prio = c.prio || {};
    c.prio[job] = SB.clamp(v, -1, 1);
    if (!c.prio[job]) delete c.prio[job];
    if (!Object.keys(c.prio).length) c.prio = null;
  };

  /* ---------------- tick ---------------- */
  var acc = 0;
  O.tick = function (game, dt) {
    var od = O.ensure(game);
    od.heat = Math.max(0, od.heat - dt / 40);
    acc += dt;
    if (acc < 1) return;
    acc = 0;
    var w = game.world;
    for (var i = od.list.length - 1; i >= 0; i--) {
      var o = od.list[i], done = false, msg = null;
      if (o.until != null && game.time > o.until) done = true;
      if (o.kind === "mark") {
        var t = SB.Creature.resolve(game, o.target);
        if (!t || (o.target.type === "node" && t.ref.state !== "ok") || (o.target.type === "item" && SB.KINDS[t.ref.kind] && !SB.KINDS[t.ref.kind].critter)) {
          done = true; msg = o.label + " done";
          SB.Game.smols(game).forEach(function (c) { if (c.ordOn === o.id) { addTrust(c, 0.01); c.ordOn = null; } });
        }
      }
      if (o.kind === "build") {
        var st = SB.World.structById(w, o.site);
        if (!st) done = true;
        else if (st.done) {
          done = true; msg = SB.STRUCTS[st.kind].emoji + " your " + SB.STRUCTS[st.kind].label + " is built, right where you wanted it";
          (st.builders || []).forEach(function (id) { var b = SB.Game.byId(game, id); if (b) addTrust(b, 0.03); }); // the sky's plan worked out
        }
      }
      if (done) { od.list.splice(i, 1); SB.Game.smols(game).forEach(function (c) { if (c.ord) delete c.ord[o.id]; if (c.ordOn === o.id) c.ordOn = null; }); if (msg) SB.bus.emit("orderDone", { o: o, msg: msg }); }
    }
    var ex = first(game, "explore");
    if (ex && !ex.reached) SB.Game.smols(game).forEach(function (c) { if (c.ordOn === ex.id && SB.dist(c.x, c.z, ex.x, ex.z) < 4) reached(game, ex, c); });
    // wandered into a no-go zone after something (food, a friend)? a smol who respects it turns round
    if (first(game, "nogo")) SB.Game.smols(game).forEach(function (c) {
      if (c.heldBy || c.asleep || (c.action && c.action.called)) return;
      var z = O.zoneAt(game, c.x, c.z, "nogo");
      if (z && decide(c, game, z)) { if (c.plan) SB.Creature.endPlan(c, game, false); c.action = null; c.thinkT = 0; }
    });
  };

  // a rough "how many would follow" for the UI: average willingness for a rally across the tribe
  O.obedience = function (game, kind) {
    var cs = SB.Game.smols(game).filter(function (c) { return !c.stranger; });
    if (!cs.length) return 0;
    return cs.reduce(function (s, c) { return s + O.willing(c, game, kind || "rally"); }, 0) / cs.length;
  };
  O.followers = function (game, o) { return SB.Game.smols(game).filter(function (c) { return c.ordOn === o.id; }).length; };

  /* ---------------- trust from how you treat them ---------------- */
  function G() { return SB.Game && SB.Game.current; }
  SB.bus.on("tickle", function (d) { var c = d.c, g = G(); if (!c || c.species !== "smol" || !g) return; if (g.time - (c._tkT || -99) < 4) return; c._tkT = g.time; addTrust(c, 0.012); });
  SB.bus.on("tap", function (d) { if (d.c && d.c.species === "smol") addTrust(d.c, -0.02); });
  SB.bus.on("prayerAnswered", function (d) { if (d.c) addTrust(d.c, 0.1); });
  SB.bus.on("miracle", function (d) {
    var g = G();
    if (!g || d.x == null || (d.id !== "bounty" && d.id !== "heal" && d.id !== "gift")) return;
    SB.Game.smols(g).forEach(function (c) { if (SB.dist(c.x, c.z, d.x, d.z) < 8) addTrust(c, 0.02); });
  });
  SB.bus.on("hatch", function (d) { // babies pick up how their parents feel about the sky
    var c = d.c, g = G();
    if (!c || !g || !c.parents) return;
    var ps = c.parents.map(function (id) { return SB.Game.byId(g, id); }).filter(Boolean);
    if (ps.length) c.trust = 0.15 + 0.7 * ps.reduce(function (s, p) { return s + O.trust(p); }, 0) / ps.length;
  });

  /* ---------------- save ---------------- */
  O.serialize = function (game) {
    var od = game.orders;
    if (!od) return null;
    return { heat: Math.round(od.heat * 100) / 100, nextId: od.nextId, placed: od.placed, followed: od.followed, refused: od.refused, annoyed: od.annoyed || 0, list: od.list.map(function (o) { return SB.Save.plain(o); }) };
  };
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }
  O.revive = function (game, data) {
    game.orders = null;
    var od = O.ensure(game);
    if (!data || typeof data !== "object") return od;
    od.heat = num(data.heat, 0); od.nextId = Math.max(1, num(data.nextId, 1)); od.placed = num(data.placed, 0); od.followed = num(data.followed, 0); od.refused = num(data.refused, 0); od.annoyed = num(data.annoyed, 0);
    (Array.isArray(data.list) ? data.list : []).forEach(function (o) {
      if (!o || typeof o !== "object" || !O.KINDS[o.kind] || typeof o.x !== "number" || typeof o.z !== "number" || typeof o.id !== "number") return;
      if (o.kind === "mark" && !(o.target && o.target.id != null)) return;
      if (o.kind === "build" && !SB.World.structById(game.world, o.site)) return;
      od.list.push(o);
      if (o.id >= od.nextId) od.nextId = o.id + 1;
    });
    return od;
  };

  /* ---------------- drawing (the 2D overlay) ---------------- */
  var pp = {}, COL = { nogo: ["rgba(255,95,95,0.16)", "#ff5f5f"], stock: ["rgba(255,209,102,0.16)", "#ffd166"], home: ["rgba(197,255,73,0.10)", "#c5ff49"] };
  function ring(ctx, game, x, z, r, fill, line, dash) {
    var R = SB.Render, n = 28, ok = 0, w = game.world;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var a = i / n * 6.2832, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      R.project(px, SB.World.groundY(w, px, pz) + 0.05, pz, pp);
      if (pp.on) ok++;
      if (i === 0) ctx.moveTo(pp.x, pp.y); else ctx.lineTo(pp.x, pp.y);
    }
    if (ok < 3) return;
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.setLineDash(dash || []); ctx.lineWidth = 2; ctx.strokeStyle = line; ctx.stroke(); ctx.setLineDash([]);
  }
  function tag(ctx, game, x, y, z, text, col, bob) {
    var R = SB.Render, t = R.time();
    R.project(x, y, z, pp);
    if (!pp.on) return;
    var by = Math.round(pp.y + (bob ? Math.sin(t * 2.5 + x) * 3 : 0));
    ctx.font = "700 12px " + (SB.Bodies && SB.Bodies.FONT || "system-ui");
    var tw = ctx.measureText(text).width + 18;
    ctx.fillStyle = "rgba(16,17,20,0.78)"; ctx.fillRect(Math.round(pp.x - tw / 2), by - 11, Math.round(tw), 22);
    ctx.fillStyle = col || "#f5f3ed"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    SB.Icons.fillText(ctx, text, pp.x, by + 1, 14);
  }
  O.draw = function (ctx, W, H, game) {
    var od = game && game.orders;
    var hand = game && game.hand, ghost = hand && hand.tool === "orders" && SB.UI && SB.UI.orderArmed && SB.UI.orderArmed();
    if ((!od || !od.list.length) && !ghost) return;
    var w = game.world, zoom = SB.Render.camera.zoom, on = hand.tool === "orders";
    if (zoom > 60) return;
    (od ? od.list : []).forEach(function (o) {
      var K = O.KINDS[o.kind], gy = SB.World.groundY(w, o.x, o.z);
      if (K.zone) {
        var c = COL[o.kind];
        ctx.globalAlpha = on ? 1 : 0.6;
        ring(ctx, game, o.x, o.z, o.r, c[0], c[1], o.kind === "nogo" ? [6, 4] : null);
        ctx.globalAlpha = 1;
        if (on || zoom < 20) tag(ctx, game, o.x, gy + 0.6, o.z, K.e + " " + K.name + (o.kind === "stock" && o.n ? " · " + o.n : ""), c[1]);
        return;
      }
      if (o.kind === "build") {
        var st = SB.World.structById(w, o.site), r = st ? SB.STRUCTS[st.kind].r : 1;
        ring(ctx, game, o.x, o.z, r + 0.35, "rgba(143,230,220,0.14)", "#8fe6dc", [5, 4]);
        if (on) tag(ctx, game, o.x, gy + 2.4, o.z, "📐 " + (o.yes ? o.yes + " on it" : "waiting for a builder"), "#8fe6dc");
        return;
      }
      if (o.kind === "mark") { tag(ctx, game, o.x, gy + 1.8, o.z, o.label, "#ffd166", true); return; }
      var lbl = o.kind === "rally" ? "🚩 rally" : "🔭 explore";
      if (on || zoom < 24) { var f = O.followers(game, o); lbl += " · " + f + (o.no ? " · " + o.no + " nah" : ""); }
      if (o.kind === "rally") ring(ctx, game, o.x, o.z, 3.2, "rgba(255,95,95,0.08)", "#ff9f9f", [3, 3]);
      tag(ctx, game, o.x, gy + 2.2, o.z, lbl, o.kind === "rally" ? "#ff9f9f" : "#b59aff", true);
    });
    // the blueprint you're about to place, under the hand
    if (ghost && ghost.kind === "build" && ghost.build && hand.visible) {
      var def = SB.STRUCTS[ghost.build], okp = O.canPlace(game, ghost.build, hand.x, hand.z);
      ring(ctx, game, hand.x, hand.z, def.r + 0.35, okp ? "rgba(143,230,220,0.22)" : "rgba(255,95,95,0.22)", okp ? "#8fe6dc" : "#ff5f5f", [5, 4]);
      tag(ctx, game, hand.x, SB.World.groundY(w, hand.x, hand.z) + 1.6, hand.z, def.emoji + " " + def.label + (okp ? "" : " ✕"), okp ? "#8fe6dc" : "#ff5f5f");
    } else if (ghost && O.KINDS[ghost.kind] && O.KINDS[ghost.kind].zone && hand.visible) {
      var zc = COL[ghost.kind];
      ring(ctx, game, hand.x, hand.z, O.KINDS[ghost.kind].r, zc[0], zc[1], [4, 4]);
    }
  };
})();
