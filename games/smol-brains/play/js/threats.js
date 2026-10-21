// smol brains — threats. Grumps that get stronger and smarter as the island grows (they hurt, they steal,
// they carry smols off to their camps, they smash and burn what you build, and they learn your walls),
// a village that defends itself (the armed and brave stand, kids and elders hide in the huts), and very
// rare natural disasters that depend on where the village lives: tsunamis on the coast, hurricanes in the
// warm months, sandstorms near the savanna, tornadoes, and earthquakes under the mountains.
// Sim-side, plus two small render hooks (env tint, frame fx) that do nothing headless.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var T = SB.Threats = {};
  var PACE = { calm: 1.6, balanced: 1, wild: 0.6 };
  var NOWRECK = { grave: 1, spire: 1, bridge: 1 };

  function smols(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger; }); }
  function home(game) { return SB.Society ? SB.Society.home(game, 0) : game.world.T.spawn; }
  function chron(game, icon, txt) { if (SB.Social) SB.Social.chronicle(game, icon, txt); }
  function diary(game, c, icon, txt) { if (SB.Social) SB.Social.log(game, c, icon, txt); }
  function topTier(game) { var t = 0; smols(game).forEach(function (c) { if (c.tier > t) t = c.tier; }); return t; }
  function pace(game) { return PACE[(game.settings && game.settings.storyteller) || "balanced"] || 1; }
  function dirOf(dx, dz) { var a = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360; return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(a / 45) % 8]; }
  function fx(kind, x, y, z, n, o) { if (SB.FX) SB.FX.burst(kind, x, y, z, n, o); }
  function mem(game, c, k, w, s, x, z) { if (SB.Mind) SB.Mind.remember(c, game, k, w, s, x, z); }

  T.state = function (game) {
    var s = game.threats || (game.threats = {});
    if (!s.lore) s.lore = { raids: 0, walled: 0 };
    if (!s.camps) s.camps = {};
    if (s.lastDis == null) s.lastDis = -1e9;
    if (s.lastDisReal == null) s.lastDisReal = -1e9;
    if (!s.dis) s.dis = 0;
    if (!s.taken) s.taken = 0;
    if (!Array.isArray(s.grabT)) s.grabT = [];
    if (!Array.isArray(s.campCards)) s.campCards = [];
    return s;
  };
  // rolling caps over the last 200 minutes: a handful of kidnaps and camp cards, spaced out
  var WINDOW = 12000, SPACING = 1200, CAP = 6;
  function recent(list, now) { while (list.length && now - list[0] > WINDOW) list.shift(); return list; }
  function capOk(list, now) { recent(list, now); return list.length < CAP && (!list.length || now - list[list.length - 1] >= SPACING); }
  T.grabOk = function (game) { return capOk(T.state(game).grabT, game.time); };
  T.campCardOk = function (game) { return capOk(T.state(game).campCards, game.time); };
  T.campCard = function (game) { T.state(game).campCards.push(game.time); };
  // when the next camp card may be dealt (so a blocked camp doesn't keep knocking on the storyteller's door)
  T.campNext = function (game) { var l = recent(T.state(game).campCards, game.time); return l.length >= CAP ? l[0] + WINDOW : l.length ? l[l.length - 1] + SPACING : game.time; };
  T.serialize = function (game) {
    var s = T.state(game);
    return { lore: s.lore, camps: s.camps, lastDis: Math.round(s.lastDis), lastDisReal: Math.round(s.lastDisReal), dis: s.dis, taken: s.taken, campT: Math.round(s.campT || 0), grabT: s.grabT.map(Math.round), campCards: s.campCards.map(Math.round) };
  };
  T.revive = function (game, data) {
    game.threats = null;
    var s = T.state(game);
    if (!data || typeof data !== "object") return;
    if (data.lore && typeof data.lore === "object") { s.lore.raids = +data.lore.raids || 0; s.lore.walled = +data.lore.walled || 0; }
    if (data.camps && typeof data.camps === "object") for (var k in data.camps) s.camps[k] = Math.max(1, Math.min(5, +data.camps[k] || 1));
    s.lastDis = isFinite(+data.lastDis) ? +data.lastDis : -1e9; s.lastDisReal = isFinite(+data.lastDisReal) ? +data.lastDisReal : -1e9;
    s.dis = +data.dis || 0; s.taken = +data.taken || 0; s.campT = +data.campT || 0;
    var nums = function (a) { return Array.isArray(a) ? a.map(Number).filter(isFinite).slice(-CAP) : []; };
    s.grabT = nums(data.grabT); s.campCards = nums(data.campCards);
  };

  /* ================= grumps ================= */

  // how strong grumps are now: they grow with time, with your tribe's tier, and round after round of new game+
  T.level = function (game) {
    var lv = 1 + Math.min(0.75, game.time / 3600 * 0.25) + topTier(game) * 0.12 + 0.2 * Math.min(4, game.ngPlus || 0);
    return Math.round(lv * 100) / 100;
  };
  // what they've learned about you. walls once → ladders, twice → rams; and torches once you've shown them fire
  T.gear = function (game) {
    var l = T.state(game).lore;
    return { ladders: l.walled >= 1, rams: l.walled >= 2, torches: l.raids >= 3 && topTier(game) >= 3 };
  };
  T.wallTime = function (game) { var g = T.gear(game); return g.rams ? 6 : g.ladders ? 11 : 25; };
  T.raidNote = function (game) {
    var g = T.gear(game), lv = T.level(game), bits = [];
    if (g.rams) bits.push("they're dragging a battering ram for your palisades");
    else if (g.ladders) bits.push("they've brought ladders: palisades won't hold them long");
    if (g.torches) bits.push("some carry torches, so huts and farms could burn");
    if (lv >= 1.6) bits.push("these are big ones");
    return bits.length ? bits.join(", ") + "." : "";
  };
  T.raidSize = function (game, n) { return Math.max(2, Math.min(12, Math.round(n * (0.85 + 0.15 * T.level(game))))); };

  // a new grump: as strong as the times
  SB.bus.on("grumpArrive", function (e) {
    var game = SB.Game && SB.Game.current, g = e.c;
    if (!game || !g) return;
    var lv = T.level(game);
    g.str = lv; g.tough = 1 + (lv - 1) * 0.6;
    if (g.look) g.look.size = (g.look.size || 1) * (1 + (lv - 1) * 0.18);
  });

  // a grump lands a blow on a smol. huts protect; only someone fighting (or caught alone in the dark, late on) can be killed
  T.wound = function (game, g, o) {
    var w = game.world, s = g.str || 1, ch = o.chem;
    var inHut = o.inBed || !!SB.World.shelterAt(w, o.x, o.z);
    var friends = 0; SB.World.creaturesNear(w, game, o.x, o.z, 6, function (q) { if (q !== o && q.species === "smol") friends++; });
    var alone = w.night && !friends && !inHut && !SB.World.nearestFire(w, o.x, o.z, 6);
    var dmg = 0.06 * s * (inHut ? 0.25 : 1) * (o.stage <= 1 ? 0.7 : 1);
    var floor = o.rally > 0 ? 0 : alone ? (s >= 1.6 ? 0 : 0.08) : o.stage <= 1 || o.stage >= 4 ? 0.4 : 0.3;
    if (ch.health > floor) ch.health = Math.max(floor, ch.health - dmg);
    mem(game, o, "hurt", "a grump hit me", 0.8, g.x, g.z);
    if (SB.Mind && SB.Mind.learnPlace) SB.Mind.learnPlace(o, game, "danger", g.x, g.z, "grumps", 0.8);
  };
  // a smol whacks a grump: big grumps take more whacks to chase off
  T.whacksNeeded = function (g) { return Math.max(3, Math.round(3 * (g.tough || 1))); };

  /* ----- carrying smols off ----- */
  T.drop = function (game, g, by) {
    if (!g || g.carry == null) return null;
    var c = SB.Game.byId(game, g.carry);
    g.carry = null;
    if (!c) return null;
    c.carriedBy = null; c.onGround = false; c.vy = 3; c.vx = game.rng.range(-1.5, 1.5); c.vz = game.rng.range(-1.5, 1.5);
    SB.Chem.apply(c.chem, { fear: -0.2 });
    if (by && by.species === "smol") {
      SB.Game.note(game, by.name + " made the grump drop " + c.name + "! 🏏");
      if (SB.Social) SB.Social.remember(game, c, by, "saved", 45, "saved me from a grump", 7200);
      diary(game, by, "🏏", "saved " + c.name + " from a grump"); diary(game, c, "👺", "was grabbed by a grump, and " + by.name + " saved me");
      chron(game, "🏏", by.name + " saved " + c.name + " from a grump's clutches");
    } else {
      SB.Game.note(game, "the grump dropped " + c.name + "! 😮‍💨");
      diary(game, c, "👺", "was grabbed by a grump, then dropped");
    }
    mem(game, c, "hurt", "a grump grabbed me", 1.3, g.x, g.z);
    SB.bus.emit("grumpDrop", { g: g, c: c, by: by });
    return c;
  };
  function grab(game, g, c) {
    g.carry = c.id; c.carriedBy = g.id; c.asleep = false; c.inBed = false; c.action = null;
    if (c.plan && SB.Creature.endPlan) SB.Creature.endPlan(c, game, false);
    g.goingHome = true; g.raider = null; g.action = null;
    T.state(game).grabT.push(game.time);
    SB.Chem.apply(c.chem, { fear: 0.9 });
    c.speech = { text: c.stage <= 1 ? "waaah!" : "help!!", t: 2.5, kind: "say" };
    SB.Game.note(game, "a grump grabbed " + c.name + "! hit it, or tap it, before it gets away 👺");
    SB.bus.emit("grumpGrab", { g: g, c: c });
  }
  // the grump got away with it: the smol is held at a grump camp until someone frees it (or it escapes)
  function taken(game, c, x, z) {
    var s = T.state(game), camps = (game.sites || []).filter(function (q) { return q.kind === "camp" && !q.gone; });
    c.carriedBy = null;
    var camp = null;
    if (camps.length) camp = camps.reduce(function (b, q) { return !b || SB.dist(q.x, q.z, x, z) < SB.dist(b.x, b.z, x, z) ? q : b; }, null);
    if (!camp) { // nowhere to take it: dumped in the wild, scared half to death
      c.onGround = false; c.vy = 2;
      SB.Game.note(game, c.name + " was dumped out in the wild, and is trying to find the way home 😢");
      diary(game, c, "👺", "was carried off by a grump and dumped in the wild");
      c.lostT = game.time;
      return;
    }
    if (camp.done) { camp.done = false; camp.asked = false; s.camps[camp.id] = 1; }
    if (!camp.found) { camp.found = true; if (SB.World.reveal) SB.World.reveal(game.world, camp.x, camp.z, 8); }
    camp.asked = !T.campCardOk(game); camp.againT = camp.asked ? T.campNext(game) : 0;
    c.captive = camp.id; c.captiveT = game.time;
    c.x = camp.x + game.rng.range(-1, 1); c.z = camp.z + game.rng.range(-1, 1); c.px = c.x; c.pz = c.z; c.y = SB.World.groundY(game.world, c.x, c.z); c.onGround = true; c.vx = c.vz = c.vy = 0; c.action = null; c.path = null;
    s.taken++;
    var hm = home(game);
    SB.Game.note(game, "the grumps carried " + c.name + " off to their camp in the " + dirOf(camp.x - hm.x, camp.z - hm.z) + " ⛺ free them!");
    diary(game, c, "⛓", "was carried off to a grump camp");
    chron(game, "⛓", "grumps carried " + c.name + " off to their camp");
    smols(game).forEach(function (o) { if (o !== c && SB.Social && SB.Social.opinion(game, o, c) > 20) { SB.Chem.apply(o.chem, { lonely: 0.3, anger: 0.3 }); mem(game, o, "loss", "the grumps took " + c.name, 1.2); } });
    SB.bus.emit("captive", { c: c, site: camp });
  }
  T.captives = function (game, site) { return game.creatures.filter(function (c) { return c.alive && c.captive != null && (site == null || c.captive === site.id); }); };
  function release(game, c, how) {
    var hm = home(game);
    c.captive = null; c.captiveT = null;
    SB.Chem.apply(c.chem, { fear: -0.5, lonely: -0.3 });
    SB.Creature.sendTo(c, hm.x + game.rng.range(-3, 3), hm.z + game.rng.range(-3, 3), game, 90);
    diary(game, c, "⛓", how === "escaped" ? "escaped from the grump camp" : "was freed from the grump camp");
    mem(game, c, "life", how === "escaped" ? "i got away from the grumps" : "they came for me", 1.3);
  }
  // freeing a camp frees your own captured smols too
  if (SB.Sites && SB.Sites.free) {
    var free0 = SB.Sites.free;
    SB.Sites.free = function (game, s) {
      var out = free0(game, s), mine = T.captives(game, s);
      mine.forEach(function (c) { release(game, c, "freed"); });
      if (mine.length) chron(game, "⛓", mine.map(function (c) { return c.name; }).join(" and ") + " came home from the grump camp");
      T.state(game).camps[s.id] = 1;
      return out.concat(mine);
    };
  }
  T.campSize = function (game, site) { return site ? T.state(game).camps[site.id] || 1 : 1; };

  /* ----- smashing and burning ----- */
  T.damage = function (game, st, amt, how) {
    if (!st || !st.done || NOWRECK[st.kind]) return false;
    st.data = st.data || {};
    st.data.dmg = (st.data.dmg || 0) + amt;
    if (st.data.dmg < 1) return false;
    return T.wreck(game, st, how);
  };
  T.wreck = function (game, st, how) {
    if (!st || !st.done || NOWRECK[st.kind]) return false;
    var def = SB.STRUCTS[st.kind], need = {};
    for (var k in def.cost) need[k] = Math.max(1, Math.ceil(def.cost[k] / 2));
    st.done = false; st.need = need; st.work = 0; st.noun = "material"; st.builders = [];
    st.data.dmg = 0; st.data.wrecked = how || "smashed";
    if (st.kind === "campfire" || st.kind === "kiln") { st.data.fuel = 0; st.data.lit = false; }
    if (st.kind === "farm") st.data.grow = 0;
    var y = SB.World.groundY(game.world, st.x, st.z);
    if (how === "burned") { fx("embers", st.x, y + 0.6, st.z, 30, { r: 1.5 }); fx("smoke", st.x, y + 1, st.z, 14, { r: 1.2 }); }
    else fx("dust", st.x, y + 0.4, st.z, 22, { r: 1.6 });
    if (SB.World.markNode) SB.World.markNode(game.world, st);
    SB.bus.emit("wrecked", { st: st, how: how });
    return true;
  };

  /* ----- the village defends itself ----- */
  function armed(c, game) { var k = SB.Ideas ? (SB.Ideas.heldKind(c, game) || SB.Ideas.toolKind(c, game)) : null; return k === "club" || k === "spear" || k === "torch"; }
  function brave(c) { return (c.genome.genes.bravery || 0.5) >= 0.45; }
  function hutFor(game, c) {
    var best = null, bd = 1e9;
    game.world.structures.forEach(function (s) { if (s.kind === "hut" && s.done) { var d = SB.dist(s.x, s.z, c.x, c.z); if (d < bd) { bd = d; best = s; } } });
    return bd < 30 ? best : null;
  }
  function hostiles(game) {
    var hm = home(game);
    return game.creatures.filter(function (g) { return g.alive && g.species === "grump" && !g.goingHome && SB.dist(g.x, g.z, hm.x, hm.z) < 16; });
  }

  var acc = 0;
  T.tick = function (game, dt) {
    acc += dt;
    if (acc < 1) return;
    var step = acc; acc = 0;
    if (game.offline) return;
    var s = T.state(game), w = game.world, hm = home(game), r = game.rng;
    var d = SB.Director ? SB.Director.state(game) : {}, inc = d.active;
    var raid = inc && inc.id === "raid" && inc.phase === "on" ? inc : null;

    // grump camps grow while left alone, and a big one sends war parties more often
    s.campT = (s.campT || 0) + step;
    var big = 0;
    if (s.campT > 600) {
      s.campT = 0;
      (game.sites || []).forEach(function (q) { if (q.kind === "camp" && !q.gone && !q.done) s.camps[q.id] = Math.min(5, (s.camps[q.id] || 1) + 1); });
    }
    (game.sites || []).forEach(function (q) { if (q.kind === "camp" && !q.gone && !q.done && q.found) big += (s.camps[q.id] || 1) - 1; });
    if (SB.Director && SB.Director.raid) SB.Director.raid.w = 4 + big * 0.8;

    // grumps at work: carrying, stealing, smashing
    var hostile = [];
    game.creatures.forEach(function (g) {
      if (!g.alive || g.species !== "grump") return;
      if (g.carry != null) {
        var cc = SB.Game.byId(game, g.carry);
        if (!cc || !cc.alive) { g.carry = null; return; }
        if (g.heldBy === "hand") { T.drop(game, g, null); return; } // the god picked it up
        g.carryX = g.x; g.carryZ = g.z;
        return;
      }
      if (g.goingHome) return;
      var dh = SB.dist(g.x, g.z, hm.x, hm.z);
      if (dh < 16) hostile.push(g);
      // a night prowler (or a raider, late on) snatches a kid or a sleeper who's out in the open
      if ((!g.raider || T.level(game) >= 1.5) && !g.heldBy) {
        var vic = null;
        SB.World.creaturesNear(w, game, g.x, g.z, 1.7, function (o) {
          if (vic || o.species !== "smol" || !o.alive || o.heldBy || o.carriedBy != null || o.captive != null || o.stranger) return;
          if (o.inBed || SB.World.shelterAt(w, o.x, o.z)) return;
          if (o.stage <= 1 || o.asleep) vic = o;
        });
        // at most one smol taken per raid, and one per night: a threat, not a massacre
        var night = Math.floor(w.time / SB.DAY_LENGTH);
        var allowed = (g.raider ? !(raid && raid.grabs) : s.grabNight !== night) && T.grabOk(game);
        var grabK = topTier(game) <= 4 ? 0.06 : 0.12; // until thinkers can guard their kids, go easier on them
        if (vic && allowed && r.chance(Math.min(0.5, grabK * (g.str || 1) * step))) { var wasRaider = !!g.raider; grab(game, g, vic); if (raid && wasRaider) raid.grabs = 1; else s.grabNight = night; }
      }
      // raiders in the village go for the buildings
      // (a raid levels a few buildings, not the whole village: two, or three once they carry torches)
      var gear = T.gear(game), sated = raid && (raid.wrecked || []).length >= (gear.torches ? 3 : 2);
      if (g.raider && dh < 11 && !sated) {
        var near = SB.World.structsNear(w, g.x, g.z, 2.4, function (q) { return q.done && !NOWRECK[q.kind] && q.kind !== "wall"; })[0];
        if (near) {
          var burn = gear.torches && (near.kind === "hut" || near.kind === "farm" || near.kind === "school" || near.kind === "workshop");
          if (T.damage(game, near, 0.04 * Math.min(2, g.str || 1) * (burn ? 1.5 : 1) * step, burn ? "burned" : "smashed") && raid) (raid.wrecked || (raid.wrecked = [])).push(near.kind);
          if (burn && SB.FX && !g.far) fx("embers", near.x, SB.World.groundY(w, near.x, near.z) + 0.8, near.z, 4, { r: 1 });
        } else if (!(g.action && g.action.called) && r.chance(0.25 * step)) {
          var tgt = SB.World.structsNear(w, hm.x, hm.z, 11, function (q) { return q.done && !NOWRECK[q.kind] && q.kind !== "wall"; });
          if (tgt.length) { var t0 = r.pick(tgt); SB.Creature.sendTo(g, t0.x + r.range(-1, 1), t0.z + r.range(-1, 1), game, 12); }
        }
        if (g.holding != null && raid) { var it = SB.Game.byId(game, g.holding); if (it && it.noun === "food") raid.stole = (raid.stole || 0) + 1; }
      }
    });

    // a carried smol whose grump vanished (it got home with it) ends up at the camp
    game.creatures.forEach(function (c) {
      if (c.species !== "smol" || !c.alive) return;
      if (c.carriedBy != null) {
        var g = SB.Game.byId(game, c.carriedBy);
        if (!g || !g.alive || g.gone) taken(game, c, g ? g.x : c.x, g ? g.z : c.z);
      }
      // held at a camp: fed gruel, scared, and after a long while slips out on its own
      if (c.captive != null) {
        var site = game.sites && game.sites[c.captive];
        if (!site || site.done || site.gone) { release(game, c, "freed"); return; }
        c.chem.hunger = Math.min(c.chem.hunger, 0.55); c.chem.fear = Math.max(c.chem.fear, 0.4);
        if (game.time - (c.captiveT || 0) > 1500 * pace(game)) { release(game, c, "escaped"); SB.Game.note(game, c.name + " escaped from the grump camp and is heading home! 🏃"); chron(game, "🏃", c.name + " escaped from the grump camp"); }
      }
    });

    // defence: when grumps are in the village the armed and brave stand up to them; kids and elders hide
    if (hostile.length) {
      smols(game).forEach(function (c) {
        if (c.captive != null || c.carriedBy != null || c.heldBy) return;
        var near = hostile.reduce(function (b, g) { return !b || SB.dist(g.x, g.z, c.x, c.z) < SB.dist(b.x, b.z, c.x, c.z) ? g : b; }, null);
        var dd = near ? SB.dist(near.x, near.z, c.x, c.z) : 99;
        if (c.stage <= 1 || c.stage >= 4) {
          var hut = hutFor(game, c);
          if (hut && dd < 14) c.hideAt = { x: hut.x, z: hut.z, t: game.time + 20 };
          return;
        }
        if (c.stage >= 2 && c.tier >= 1 && armed(c, game) && brave(c) && c.chem.pain < 0.6 && c.chem.health > 0.35) {
          c.rally = Math.max(c.rally || 0, 20); c.shelterT = 0; c.defend = true;
          if (dd < 14 && !(c.action && c.action.verb === SB.V.hit) && r.chance(0.6)) SB.Creature.provoke(c, near, game);
        } else if (c.defend && (c.chem.pain > 0.6 || c.chem.health < 0.35)) { c.rally = 0; c.defend = false; }
      });
      // the brave chase a grump that's carrying someone off
      game.creatures.forEach(function (g) {
        if (!g.alive || g.carry == null) return;
        smols(game).forEach(function (c) { if (c.stage >= 2 && c.tier >= 1 && brave(c) && c.chem.pain < 0.6 && SB.dist(c.x, c.z, g.x, g.z) < 10 && !(c.action && c.action.verb === SB.V.hit) && r.chance(0.5)) SB.Creature.provoke(c, g, game); });
      });
    } else smols(game).forEach(function (c) { if (c.defend) { c.defend = false; if (!(raid && raid.choice === "fight")) c.rally = 0; } });

    // the dead and the lost come back as lessons: lost smols eventually find the way home
    smols(game).forEach(function (c) { if (c.lostT && game.time - c.lostT > 60) { c.lostT = null; SB.Creature.sendTo(c, hm.x, hm.z, game, 120); } });

    if (game.disaster) T.disasterTick(game, step);
  };

  // what a raid did (for its end card)
  T.raidReport = function (game, inc) {
    var bits = [], wr = inc.wrecked || [];
    if (wr.length) { var n = {}; wr.forEach(function (k) { n[k] = (n[k] || 0) + 1; }); bits.push("they wrecked " + Object.keys(n).map(function (k) { return n[k] > 1 ? n[k] + " " + SB.STRUCTS[k].label + "s" : "a " + SB.STRUCTS[k].label; }).join(", ") + " (your builders will fix it)"); }
    if (inc.stole) bits.push("they ran off with " + inc.stole + " food");
    if (inc.grabbed) bits.push("they carried off " + inc.grabbed);
    return bits.length ? " " + bits.join(". ") + "." : "";
  };
  SB.bus.on("grumpGrab", function (e) { var game = SB.Game.current, inc = game && game.dir && game.dir.active; if (inc && inc.id === "raid") inc.grabbed = (inc.grabbed ? inc.grabbed + " and " : "") + e.c.name; });
  SB.bus.on("incidentEnd", function (e) {
    var game = SB.Game.current;
    if (!game || !e.inc || e.inc.id !== "raid") return;
    var l = T.state(game).lore, g0 = T.gear(game);
    l.raids++;
    if (e.inc.walled) l.walled++;
    var g1 = T.gear(game);
    if (!g0.ladders && g1.ladders) SB.Game.note(game, "the grumps went home muttering about your palisade. they'll be back with ladders 🪜");
    else if (!g0.rams && g1.rams) SB.Game.note(game, "the grumps are building a battering ram 😠");
    else if (!g0.torches && g1.torches) SB.Game.note(game, "the grumps have learned fire from watching you. next time they'll bring torches 🔥");
  });

  /* ================= natural disasters ================= */
  // very rare: about one every hour or two, never in the first half hour, never twice in a row.

  function ready(game) {
    var s = T.state(game), p = pace(game), d = SB.Director.state(game);
    if (game.time < 1800 || (game.playTime > 0 && game.playTime < 1800)) return false;
    if (game.time - s.lastDis < 2700 * p) return false;
    if (game.playTime > 0 && game.playTime - s.lastDisReal < 2400 * p) return false;
    var last = d.history && d.history[d.history.length - 1];
    if (last && DIS[last[1]]) return false;
    return smols(game).length >= 3 && !game.disaster;
  }
  // terrain checks around the village
  function oceanD(game, x, z) { var T0 = game.world.T, V = T0.V || T0.N + 1, i = Math.round(z) * V + Math.round(x); return T0.oceanDist ? T0.oceanDist[i] : 1e9; }
  function ring(game, r, fn) { var hm = home(game), out = 0; for (var a = 0; a < 24; a++) for (var k = 1; k <= 3; k++) { var x = hm.x + Math.sin(a * 0.2618) * r * k / 3, z = hm.z + Math.cos(a * 0.2618) * r * k / 3; if (SB.World.inBounds(game.world, x, z) && fn(x, z)) out++; } return out; }
  function lowCoast(game, x, z) { return oceanD(game, x, z) < 12 && SB.World.heightAt(game.world, x, z) < 2.2 && SB.World.depthAt(game.world, x, z) < 0.3; }
  T.coastal = function (game) { return ring(game, 30, function (x, z) { return lowCoast(game, x, z); }) >= 6; };
  T.dusty = function (game) { var B = SB.B; return ring(game, 40, function (x, z) { var b = SB.World.biomeAt(game.world, x, z); return b === B.savanna || b === B.desert || (B.mesa != null && b === B.mesa); }) >= 8; };
  T.mountains = function (game) { var B = SB.B; return ring(game, 55, function (x, z) { return SB.World.biomeAt(game.world, x, z) === B.mountain; }) >= 6; };
  function sea(game) { // which way the sea is from the village
    var hm = home(game), bx = 0, bz = 0;
    for (var a = 0; a < 32; a++) { var ang = a * 0.19635; for (var dd = 6; dd < 60; dd += 3) { var x = hm.x + Math.sin(ang) * dd, z = hm.z + Math.cos(ang) * dd; if (!SB.World.inBounds(game.world, x, z)) break; if (oceanD(game, x, z) === 0) { bx += Math.sin(ang) / dd; bz += Math.cos(ang) / dd; break; } } }
    var l = Math.hypot(bx, bz) || 1; return { x: bx / l, z: bz / l };
  }
  function warn(game, base) {
    var dome = game.world.structures.some(function (s) { return s.kind === "observatory" && s.done; }) && topTier(game) >= 5;
    return { t: dome ? 120 : base, dome: dome };
  }
  function shelterAll(game, secs) { smols(game).forEach(function (c) { c.shelterT = secs; }); }
  // kids and elders to the huts, everyone else home
  function hideAll(game, secs) { smols(game).forEach(function (c) { c.shelterT = secs; var h = hutFor(game, c); if (h && (c.stage <= 1 || c.stage >= 4)) c.hideAt = { x: h.x, z: h.z, t: game.time + secs }; }); }
  function safe(game, c) { return c.inBed || !!SB.World.shelterAt(game.world, c.x, c.z) || (c.hideAt && game.time < c.hideAt.t && SB.dist(c.x, c.z, c.hideAt.x, c.hideAt.z) < 1.6); }
  function hurt(game, c, pain, kill, why) {
    var ch = c.chem;
    SB.Chem.apply(ch, { pain: pain, fear: 0.5 });
    var floor = kill ? 0 : 0.25;
    if (ch.health > floor) ch.health = Math.max(floor, ch.health - pain * 0.5);
    if (SB.Creature.emote) SB.Creature.emote(c, "ouch", 1.4);
    if (why) mem(game, c, "hurt", why, 1.1, c.x, c.z);
  }
  function fling(c, vx, vz, vy) { if (c.heldBy) return; c.vx = vx; c.vz = vz; c.vy = vy; c.onGround = false; c.asleep = false; c.inBed = false; c.action = null; }

  var DIS = {}, DIS_ODDS = 5; // the total weight of the disaster cards that can happen here
  // an inland village only gets tornadoes (maybe quakes): the odds are shared among the kinds that can happen here,
  // so every island sees about the same number of disasters, just of its own kinds
  var possG = null, possT = -1e9, possW = 1;
  function possible(game) {
    if (possG === game && Math.abs(game.time - possT) < 30) return possW;
    possG = game; possT = game.time; possW = 0;
    for (var id in DIS) if (DIS[id].can(game)) possW += DIS[id].w;
    return possW || 1;
  }
  function disaster(def) {
    DIS[def.id] = def;
    var card = {
      id: def.id, bad: true, minTier: 0, w: def.w, gap: 5400, dis: true,
      ok: function (game) {
        if (!ready(game) || !def.can(game)) return false;
        card.w = def.w * DIS_ODDS / possible(game) / pace(game); // calm storytellers deal them less, wild ones more
        return true;
      },
      start: function (game) {
        var hm = home(game), wn = warn(game, def.warn), info = def.setup ? def.setup(game) : {};
        if (!info) return null;
        var text = [def.text(game, info)];
        text.push(wn.dome ? "the stargazers in the star dome saw it coming early, so there's time to get ready." : def.hint);
        var inc = { icon: def.icon, title: def.title, x: info.x != null ? info.x : hm.x, z: info.z != null ? info.z : hm.z, warn: wn.t, info: info, text: text, choices: def.choices.map(function (c) { var o = {}; for (var k in c) o[k] = c[k]; return o; }) };
        return inc;
      },
      begin: function (game, inc) {
        var s = T.state(game);
        s.lastDis = game.time; s.lastDisReal = game.playTime || 0; s.dis++;
        if (inc.choice === "calm") {
          var hm = home(game);
          fx("magic", hm.x, SB.World.groundY(game.world, hm.x, hm.z) + 3, hm.z, 50, { r: 8 });
          return SB.Director.end(game, inc, true);
        }
        inc.dur = def.dur;
        game.disaster = { kind: def.id, t0: game.time, dur: def.dur, x: inc.x, z: inc.z, info: inc.info, choice: inc.choice, hits: {}, wrecked: [], lost: 0 };
        if (inc.choice === "shelter") hideAll(game, def.dur + 10);
        if (def.begin) def.begin(game, inc, game.disaster);
        SB.bus.emit("disaster", { kind: def.id, inc: inc });
      },
      tick: function (game, inc) {
        if (!game.disaster) return SB.Director.end(game, inc, true);
        if (game.time - game.disaster.t0 > inc.dur) return SB.Director.end(game, inc, true);
      },
      finish: function (game, inc) {
        var dz = game.disaster;
        game.disaster = null;
        var d = SB.Director.state(game);
        d.nextT = Math.max(d.nextT, game.time + 420 * pace(game)); // a long breather after a disaster
        if (inc.choice === "calm") { chron(game, def.icon, def.calmed); return def.calmMsg; }
        smols(game).forEach(function (c) { c.shelterT = 0; c.hideAt = null; if (c.evac) c.evac = null; });
        var wr = dz ? dz.wrecked : [], hurtN = dz ? Object.keys(dz.hits).length : 0;
        // everyone who lived through it remembers it, and it goes in the chronicle
        smols(game).forEach(function (c) { mem(game, c, "sky", "the " + def.name, 1.4, c.x, c.z); if (c.stage >= 2) diary(game, c, def.icon, "lived through the " + def.name); if (dz && dz.hits[c.id]) SB.Chem.apply(c.chem, { fear: 0.2 }); });
        chron(game, def.icon, "the " + def.name + " hit the island" + (wr.length ? " and wrecked " + wr.length + (wr.length === 1 ? " building" : " buildings") : "") + (hurtN ? "; " + hurtN + " smols were hurt" : ""));
        var msg = def.after + (wr.length ? " " + wr.length + (wr.length === 1 ? " building was" : " buildings were") + " wrecked: your builders will put them back up." : " nothing was wrecked.") + (hurtN ? " " + hurtN + (hurtN === 1 ? " smol got" : " smols got") + " hurt." : "");
        if (inc.choice === "shelter" && !hurtN) { SB.Game.addSparks(game, 4); msg += " everyone kept safe. +4 ✨"; }
        return msg;
      }
    };
    if (SB.Director && SB.Director.DECK) { SB.Director.DECK.push(card); SB.Director[def.id] = card; }
  }
  T.DIS = DIS;
  function wreckAt(game, x, z, r, how, chance) {
    var dz = game.disaster, n = 0;
    SB.World.structsNear(game.world, x, z, r, function (q) { return q.done && !NOWRECK[q.kind]; }).forEach(function (st) {
      if (chance != null && !game.rng.chance(chance)) return;
      if (T.wreck(game, st, how)) { n++; if (dz) dz.wrecked.push(st.kind); }
    });
    return n;
  }

  // --- tsunami: the sea pulls back, then a wave sweeps the beach and floods the low ground
  disaster({
    id: "tsunami", name: "great wave", icon: "🌊", title: "the sea is pulling back!", w: 2.2, warn: 30, dur: 40,
    can: function (game) { return T.coastal(game); },
    setup: function (game) { var sv = sea(game), hm = home(game); return { sx: sv.x, sz: sv.z, x: hm.x + sv.x * 20, z: hm.z + sv.z * 20 }; },
    text: function (game, info) { var hm = home(game); return "the water is draining off the beach to the " + dirOf(info.sx, info.sz) + ", further than anyone's ever seen. the ground shook a little while ago. a huge wave is coming."; },
    hint: "anything on low ground by the shore will be swept away. high ground is safe.",
    choices: [
      { key: "calm", label: "🌊 still the sea", cost: 25, now: true, hint: "you hold the wave back. it breaks gently out at sea" },
      { key: "shelter", label: "⛰ run for high ground", hint: "everyone climbs away from the shore. the beach will still flood" },
      { key: "ride", label: "🤞 ride it out", hint: "hope it isn't that bad" }
    ],
    calmed: "a great wave rose off the coast, and the sky held it back", calmMsg: "the wave rose... and settled. the sea is calm again. 🌊",
    after: "the water's going back out.",
    begin: function (game, inc, dz) {
      dz.front = 0;
      if (inc.choice === "shelter") smols(game).forEach(function (c) { if (lowCoast(game, c.x, c.z) || oceanD(game, c.x, c.z) < 16) { var hs = high(game, c); if (hs) { c.evac = hs; c.shelterT = 0; SB.Creature.sendTo(c, hs.x, hs.z, game, 40); } } });
    },
    tick: function (game, dz, step) {
      var f = (game.time - dz.t0) / dz.dur, front = f < 0.6 ? f / 0.6 * 13 : (1 - f) / 0.4 * 13, w = game.world;
      dz.front = Math.max(0, front);
      var hm = home(game);
      game.creatures.forEach(function (c) {
        if (!c.alive || c.species !== "smol" || c.captive != null || c.carriedBy != null) return;
        if (SB.dist(c.x, c.z, hm.x, hm.z) > 60) return;
        var od = oceanD(game, c.x, c.z);
        if (od > dz.front || SB.World.heightAt(w, c.x, c.z) > 2.6 || c.evac && SB.World.heightAt(w, c.x, c.z) > 2.2) return;
        if (game.rng.chance(0.5 * step)) { fling(c, -dz.info.sx * 5, -dz.info.sz * 5, 4); if (!dz.hits[c.id]) { dz.hits[c.id] = 1; hurt(game, c, 0.3, dz.choice === "ride", "the great wave swept me away"); } }
      });
      w.items.slice().forEach(function (o) {
        if (o.heldBy != null || oceanD(game, o.x, o.z) > dz.front || SB.World.heightAt(w, o.x, o.z) > 2.6 || SB.dist(o.x, o.z, hm.x, hm.z) > 60) return;
        if (o.kind === "egg") return;
        if (o.noun === "food" && game.rng.chance(0.3 * step)) SB.World.remove(w, o);
        else if (game.rng.chance(0.3 * step)) SB.World.toss(o, -dz.info.sx * 3, -dz.info.sz * 3, 2);
      });
      w.structures.slice().forEach(function (st) {
        if (!st.done || NOWRECK[st.kind] || oceanD(game, st.x, st.z) > dz.front || SB.World.heightAt(w, st.x, st.z) > 2.6) return;
        if (st.kind === "campfire") { st.data.fuel = 0; st.data.lit = false; }
        if (game.rng.chance(0.25 * step) && T.wreck(game, st, "flooded")) dz.wrecked.push(st.kind);
      });
    }
  });
  function high(game, c) {
    var hm = home(game), best = null, bh = -1e9;
    for (var a = 0; a < 16; a++) for (var dd = 8; dd <= 30; dd += 7) {
      var x = hm.x + Math.sin(a * 0.3927) * dd, z = hm.z + Math.cos(a * 0.3927) * dd;
      if (!SB.World.inBounds(game.world, x, z) || !SB.World.walkable(game.world, x, z, false)) continue;
      var h = SB.World.heightAt(game.world, x, z) - dd * 0.03;
      if (h > bh) { bh = h; best = { x: x, z: z }; }
    }
    return best;
  }

  // --- hurricane: days of wind and rain in the warm months. roofs lift, crops flatten
  disaster({
    id: "hurricane", name: "hurricane", icon: "🌀", title: "a hurricane is coming", w: 2.2, warn: 40, dur: 150,
    can: function (game) { var s = game.world.season; return (s === 1 || s === 2) && T.coastal(game) && game.world.structures.some(function (q) { return q.done; }); },
    text: function () { return "a wall of black cloud is spinning in off the sea, bigger than any storm. the wind is already bending the trees."; },
    hint: "huts and farms out in the wind will take a beating. smols are safest indoors.",
    choices: [
      { key: "calm", label: "🌤 turn it out to sea", cost: 20, now: true, hint: "it spins away and blows itself out over the water" },
      { key: "shelter", label: "🛖 everyone indoors", hint: "kids and elders in the huts, everyone else huddled at home" },
      { key: "ride", label: "🌀 ride it out", hint: "work through it. it's only wind" }
    ],
    calmed: "a hurricane spun toward the island, and the sky sent it away", calmMsg: "the hurricane turned and spun away over the sea. 🌤",
    after: "the wind has dropped. branches and thatch everywhere.",
    begin: function (game) { game.forceWeather = "storm"; game.world.weather.t = game.world.weather.next; },
    tick: function (game, dz, step) {
      var w = game.world, hm = home(game), r = game.rng;
      if (w.weather.kind === "storm") w.weather.next = Math.max(w.weather.next, w.weather.t + 10);
      var f = (game.time - dz.t0) / dz.dur, gust = Math.sin(f * Math.PI); // builds, peaks, eases
      dz.wind = gust;
      if (f > 0.97) w.weather.next = w.weather.t + 1;
      var ang = game.time * 0.05;
      // roofs lift, crops flatten
      w.structures.forEach(function (st) {
        if (!st.done || NOWRECK[st.kind] || SB.dist(st.x, st.z, hm.x, hm.z) > 45) return;
        if (st.kind === "farm") st.data.grow = Math.max(0, (st.data.grow || 0) - 0.02 * gust * step);
        if (r.chance(0.012 * gust * step) && T.damage(game, st, 0.55, "blown down")) dz.wrecked.push(st.kind);
      });
      smols(game).forEach(function (c) {
        if (c.captive != null || c.carriedBy != null || safe(game, c) || c.shelterT > 0 && SB.dist(c.x, c.z, hm.x, hm.z) < 5) return;
        if (r.chance(0.06 * gust * step)) { fling(c, Math.sin(ang) * 4, Math.cos(ang) * 4, 2.5); if (r.chance(0.4)) { dz.hits[c.id] = 1; hurt(game, c, 0.18, dz.choice === "ride" && gust > 0.8, "the hurricane threw me"); } }
      });
      w.items.forEach(function (o) { if (o.heldBy == null && o.kind !== "egg" && r.chance(0.01 * gust * step)) SB.World.toss(o, Math.sin(ang) * 3, Math.cos(ang) * 3, 2); });
    }
  });

  // --- sandstorm: a red-brown wall rolls in off the savanna. you can't see, crops get buried
  disaster({
    id: "sandstorm", name: "sandstorm", icon: "🏜", title: "a sandstorm!", w: 2.5, warn: 30, dur: 100,
    can: function (game) { return game.world.season !== 3 && T.dusty(game); },
    setup: function (game) { var B = SB.B, hm = home(game), bx = 0, bz = 0; for (var a = 0; a < 24; a++) for (var dd = 10; dd < 45; dd += 5) { var x = hm.x + Math.sin(a * 0.2618) * dd, z = hm.z + Math.cos(a * 0.2618) * dd; if (!SB.World.inBounds(game.world, x, z)) continue; var b = SB.World.biomeAt(game.world, x, z); if (b === B.savanna || b === B.desert || (B.mesa != null && b === B.mesa)) { bx += Math.sin(a * 0.2618); bz += Math.cos(a * 0.2618); } } var l = Math.hypot(bx, bz) || 1; return { dx: bx / l, dz: bz / l }; },
    text: function (game, info) { return "a red-brown wall of dust is rolling in from the " + dirOf(info.dx, info.dz) + ". it's taller than the trees and swallowing the sun."; },
    hint: "nobody will be able to see a thing. smols caught outside get lost and scraped, and the farms will be buried.",
    choices: [
      { key: "calm", label: "💨 blow it apart", cost: 14, now: true, hint: "a clean wind scatters the dust before it arrives" },
      { key: "shelter", label: "🛖 everyone indoors", hint: "wait it out together. the farms will still need digging out" },
      { key: "ride", label: "😤 keep working", hint: "cover your faces and get on with it" }
    ],
    calmed: "a sandstorm rolled off the savanna, and the sky blew it apart", calmMsg: "a clean wind came and the dust fell out of the sky. 💨",
    after: "the dust is settling. everything's a bit orange.",
    begin: function (game, inc, dz) { game.world.structures.forEach(function (st) { if (st.kind === "farm" && st.done && SB.dist(st.x, st.z, inc.x, inc.z) < 50) { st.data.grow = 0; st.data.buried = true; } }); },
    tick: function (game, dz, step) {
      var r = game.rng, hm = home(game), f = (game.time - dz.t0) / dz.dur;
      dz.thick = Math.min(1, Math.min(f, 1 - f) * 6);
      smols(game).forEach(function (c) {
        if (c.captive != null || c.carriedBy != null || safe(game, c) || (c.shelterT > 0 && SB.dist(c.x, c.z, hm.x, hm.z) < 5)) return;
        SB.Chem.apply(c.chem, { fear: 0.02 * step, tired: 0.01 * step });
        // can't see: smols out in it wander off the way they came
        if (r.chance(0.04 * dz.thick * step) && !(c.action && c.action.called)) SB.Creature.sendTo(c, c.x + r.range(-6, 6), c.z + r.range(-6, 6), game, 6);
        if (r.chance(0.01 * dz.thick * step)) { dz.hits[c.id] = 1; hurt(game, c, 0.12, false, "the sand stung my eyes"); }
      });
      // dust buries what's lying around
      game.world.items.slice().forEach(function (o) { if (o.heldBy == null && o.noun === "food" && SB.dist(o.x, o.z, hm.x, hm.z) < 40 && r.chance(0.004 * dz.thick * step)) SB.World.remove(game.world, o); });
    }
  });

  // --- tornado: rare. a funnel walks across the land and takes everything in its path
  disaster({
    id: "tornado", name: "tornado", icon: "🌪", title: "a tornado!", w: 1.4, warn: 25, dur: 70,
    can: function (game) { return game.world.season !== 3 && game.world.structures.some(function (q) { return q.done; }); },
    setup: function (game) {
      var hm = home(game), r = game.rng, a = r() * 6.283, x0 = hm.x + Math.sin(a) * 38, z0 = hm.z + Math.cos(a) * 38;
      var off = r.range(-6, 6), ex = hm.x - Math.sin(a) * 38 + Math.cos(a) * off * 2, ez = hm.z - Math.cos(a) * 38 - Math.sin(a) * off * 2;
      return { x: x0, z: z0, x0: x0, z0: z0, x1: ex, z1: ez, off: off };
    },
    text: function (game, info) { var hm = home(game); return "a dark funnel has dropped out of the clouds to the " + dirOf(info.x0 - hm.x, info.z0 - hm.z) + ", and it's heading this way. it's tearing up everything it touches."; },
    hint: "anything in its path gets thrown. smols inside huts are safe; out in the open, get out of the way.",
    choices: [
      { key: "calm", label: "✋ unwind it", cost: 18, now: true, hint: "the funnel slows, wobbles and comes apart" },
      { key: "shelter", label: "🏃 get out of its path", hint: "everyone runs sideways and hides. buildings in the way will still go" },
      { key: "ride", label: "😨 hold on tight", hint: "maybe it'll miss" }
    ],
    calmed: "a tornado came down from the clouds, and the sky unwound it", calmMsg: "the funnel wobbled, thinned, and blew apart into a breeze. ✋",
    after: "the funnel lifted back into the clouds. there's a long scar across the land.",
    begin: function (game, inc, dz) {
      game.forceWeather = "storm"; game.world.weather.t = game.world.weather.next;
      if (inc.choice === "shelter") {
        var i = dz.info, px = i.z1 - i.z0, pz = -(i.x1 - i.x0), l = Math.hypot(px, pz) || 1; px /= l; pz /= l;
        smols(game).forEach(function (c) { if (safe(game, c)) return; var side = ((c.x - i.x0) * px + (c.z - i.z0) * pz) >= 0 ? 1 : -1; var tx = c.x + px * side * 12, tz = c.z + pz * side * 12; if (SB.World.inBounds(game.world, tx, tz)) { c.shelterT = 0; c.evac = { x: tx, z: tz }; SB.Creature.sendTo(c, tx, tz, game, 40); } });
      }
    },
    tick: function (game, dz, step) {
      var i = dz.info, f = Math.min(1, (game.time - dz.t0) / dz.dur), w = game.world, r = game.rng;
      var x = i.x0 + (i.x1 - i.x0) * f + Math.sin(game.time * 0.7) * 2.5, z = i.z0 + (i.z1 - i.z0) * f + Math.cos(game.time * 0.53) * 2.5;
      dz.x = x; dz.z = z;
      if (game.world.weather.kind === "storm") w.weather.next = Math.max(w.weather.next, w.weather.t + 5);
      if (f > 0.97) w.weather.next = w.weather.t + 1;
      var R = 3.6;
      SB.World.structsNear(w, x, z, R, function (q) { return q.done && !NOWRECK[q.kind]; }).forEach(function (st) { if (T.damage(game, st, 0.9 * step, "torn apart")) dz.wrecked.push(st.kind); });
      SB.World.creaturesNear(w, game, x, z, R, function (c) {
        if (!c.alive || c.heldBy || c.captive != null || c.carriedBy != null) return;
        if (c.species === "smol" && safe(game, c)) return;
        var a = Math.atan2(c.x - x, c.z - z) + 1.2;
        fling(c, Math.sin(a) * 7, Math.cos(a) * 7, 7 + r() * 3);
        if (c.species === "smol" && !dz.hits[c.id]) { dz.hits[c.id] = 1; hurt(game, c, 0.35, dz.choice === "ride", "the tornado threw me into the sky"); }
      });
      SB.World.itemsNear(w, x, z, R, function (o) { if (o.heldBy == null && o.kind !== "egg") { var a = Math.atan2(o.x - x, o.z - z) + 1.2; SB.World.toss(o, Math.sin(a) * 6, Math.cos(a) * 6, 6 + r() * 3); } });
    }
  });

  // --- earthquake: only where there are mountains. a minute of shaking, rockfalls, cracked walls
  disaster({
    id: "quake", name: "earthquake", icon: "🫨", title: "the ground is rumbling", w: 1.8, warn: 15, dur: 30,
    can: function (game) { return T.mountains(game) && game.world.structures.some(function (q) { return q.done; }); },
    text: function () { return "the birds have all gone quiet, and the ground is humming under everyone's feet. the old smols say the mountain is waking up."; },
    hint: "buildings will crack and shake apart. smols out in the open are safest, away from walls and roofs.",
    choices: [
      { key: "calm", label: "🤲 hold the ground still", cost: 20, now: true, hint: "you press the island flat and quiet" },
      { key: "shelter", label: "🏕 everyone out in the open", hint: "away from roofs and walls until it's over" },
      { key: "ride", label: "🤞 hope it passes", hint: "it's probably nothing" }
    ],
    calmed: "the mountain stirred, and the sky held the island still", calmMsg: "the rumbling faded away. the birds are singing again. 🤲",
    after: "the shaking has stopped. there are cracks everywhere.",
    begin: function (game, inc) {
      if (inc.choice === "shelter") { var hm = home(game); smols(game).forEach(function (c) { var a = game.rng() * 6.283; c.shelterT = 0; c.evac = { x: hm.x + Math.sin(a) * 9, z: hm.z + Math.cos(a) * 9 }; c.inBed = false; c.asleep = false; SB.Creature.sendTo(c, c.evac.x, c.evac.z, game, 30); }); }
    },
    tick: function (game, dz, step) {
      var w = game.world, r = game.rng, hm = home(game), f = (game.time - dz.t0) / dz.dur;
      dz.shake = Math.sin(Math.min(1, f) * Math.PI);
      w.structures.forEach(function (st) {
        if (!st.done || NOWRECK[st.kind] || SB.dist(st.x, st.z, hm.x, hm.z) > 50) return;
        if (r.chance(0.04 * dz.shake * step) && T.damage(game, st, 0.6, "shaken down")) dz.wrecked.push(st.kind);
      });
      smols(game).forEach(function (c) {
        if (c.captive != null || c.carriedBy != null) return;
        if (c.onGround && r.chance(0.1 * dz.shake * step)) { fling(c, r.range(-1, 1), r.range(-1, 1), 2); }
        var roof = c.inBed || SB.World.shelterAt(w, c.x, c.z);
        if (roof && r.chance(0.08 * dz.shake * step)) { dz.hits[c.id] = 1; hurt(game, c, 0.2, false, "the roof shook down on me"); }
      });
      // rockfalls under the mountains: new boulders and stone to pick up after
      if (r.chance(0.3 * dz.shake * step) && SB.World.addNode) {
        var a = r() * 6.283, d = 14 + r() * 26, x = hm.x + Math.sin(a) * d, z = hm.z + Math.cos(a) * d;
        if (SB.World.inBounds(w, x, z) && SB.World.walkable(w, x, z, false) && SB.World.biomeAt(w, x, z) === SB.B.mountain) { SB.World.addNode(w, game, "boulder", x, z, 0.7 + r() * 0.5); fx("dust", x, SB.World.groundY(w, x, z) + 0.5, z, 16, { r: 2 }); }
      }
    }
  });

  T.disasterTick = function (game, step) {
    var dz = game.disaster, def = dz && DIS[dz.kind];
    if (!def) { game.disaster = null; return; }
    if (def.tick) def.tick(game, dz, step);
  };

  /* ================= the look of it (browser only) ================= */
  // sky tint: called from the renderer's environment update
  T.env = function (env) {
    var game = SB.Game && SB.Game.current, dz = game && game.disaster;
    if (!dz) return;
    var k = 1, mix = function (key, col, a) { env[key] = SB.mixC(env[key], col, a); };
    if (dz.kind === "sandstorm") { k = dz.thick || 0; mix("fog", [0.72, 0.45, 0.26], k * 0.9); mix("sky", [0.7, 0.45, 0.28], k * 0.8); env.sun = env.sun.map(function (v, i) { return v * (1 - k * 0.35) * [1.1, 0.85, 0.6][i]; }); }
    else if (dz.kind === "tsunami") { mix("sky", [0.36, 0.44, 0.48], 0.5); mix("fog", [0.4, 0.5, 0.55], 0.4); }
    else if (dz.kind === "hurricane") { k = 0.3 + 0.6 * (dz.wind || 0); mix("sky", [0.22, 0.25, 0.3], k); mix("fog", [0.3, 0.33, 0.38], k * 0.7); env.sun = env.sun.map(function (v) { return v * (1 - k * 0.4); }); env.wind = Math.max(env.wind, 1 + k); env.rain = Math.max(env.rain, k); }
    else if (dz.kind === "tornado") { mix("sky", [0.35, 0.42, 0.3], 0.55); mix("fog", [0.42, 0.48, 0.36], 0.4); }
    else if (dz.kind === "quake") { mix("sky", [0.6, 0.5, 0.45], 0.2 * (dz.shake || 0)); }
  };
  // drawn fresh every frame like the rain: the funnel, the wave, the dust. pt(x,y,z,size,r,g,b,a), ln(x0,y0,z0,x1,y1,z1,r,g,b,a)
  var waveCells = null, waveFor = null;
  T.draw = function (game, cam, t, pt, ln) {
    var dz = game && game.disaster, w = game && game.world;
    if (!dz) return;
    var i, x, z, y, gy, R0 = Math.max(cam.halfW || 16, (cam.halfH || 10) * 1.6) + 2;
    if (dz.kind === "tornado" && dz.x != null) {
      gy = SB.World.groundY(w, dz.x, dz.z);
      for (i = 0; i < 320; i++) { // a twisting cone of dust and cloud
        var h = i / 320, rad = 0.35 + h * h * 5.5, a = t * (7 - h * 3) + i * 2.399, wob = Math.sin(t * 1.3 + h * 4) * h * 1.2, gr = 0.42 + h * 0.18;
        pt(dz.x + Math.sin(a) * rad + wob, gy + h * 17, dz.z + Math.cos(a) * rad, 0.16 + h * 0.4, gr, gr * 0.97, gr * 0.92 + h * 0.06, 0.75);
      }
      for (i = 0; i < 70; i++) { // debris whirling round the foot
        var ad = -t * 9 + i * 0.9, rd = 1.2 + (i % 7) * 0.45, yd = gy + ((i * 0.37 + t * 1.5) % 3.2);
        pt(dz.x + Math.sin(ad) * rd, yd, dz.z + Math.cos(ad) * rd, 0.1, 0.45, 0.33, 0.2, 0.9);
      }
      for (i = 0; i < 24; i++) { var al = t * 6 + i * 0.26, r1 = 0.6 + (i / 24) * 4; ln(dz.x + Math.sin(al) * r1, gy + i * 0.6, dz.z + Math.cos(al) * r1, dz.x + Math.sin(al + 0.7) * r1, gy + i * 0.6 + 0.4, dz.z + Math.cos(al + 0.7) * r1, 0.75, 0.75, 0.78, 0.5); }
    } else if (dz.kind === "tsunami") {
      if (waveFor !== dz) { // the low coast near the village, found once per wave
        waveFor = dz; waveCells = [];
        var hm = home(game);
        for (x = hm.x - 55; x < hm.x + 55; x += 1.2) for (z = hm.z - 55; z < hm.z + 55; z += 1.2) {
          if (!SB.World.inBounds(w, x, z)) continue;
          var od = oceanD(game, x, z);
          if (od < 14 && od > 0 && SB.World.heightAt(w, x, z) < 2.6) waveCells.push([x, z, od]);
        }
      }
      var fr = dz.front || 0, n = 0;
      for (i = 0; i < waveCells.length && n < 900; i++) {
        var c = waveCells[i];
        if (Math.abs(c[0] - cam.x) > R0 || Math.abs(c[1] - cam.z) > R0) continue;
        gy = SB.World.groundY(w, c[0], c[1]);
        if (Math.abs(c[2] - fr) < 1.1) { pt(c[0], gy + 0.5 + Math.sin(t * 8 + i) * 0.25, c[1], 0.38, 0.95, 0.98, 1, 0.95); n++; } // foam on the wave's lip
        else if (c[2] < fr) { pt(c[0], gy + 0.18, c[1], 0.62, 0.25, 0.55, 0.78, 0.6); n++; } // water over the land
      }
    } else if (dz.kind === "sandstorm") {
      var k = dz.thick || 0, rr = SB.rng(77);
      for (i = 0; i < 380 * k; i++) {
        var bx = (rr() - 0.5) * 2 * R0, bz = (rr() - 0.5) * 2 * R0, f = (t * 0.6 + rr()) % 1;
        x = cam.x + bx + (f - 0.5) * 14; z = cam.z + bz + (f - 0.5) * 4;
        y = SB.World.groundY(w, x, z) + 0.3 + rr() * 4;
        ln(x, y, z, x + 1.6, y + 0.1, z + 0.5, 0.9, 0.66, 0.4, 0.75 * k);
      }
    } else if (dz.kind === "hurricane") {
      var g2 = dz.wind || 0, r2 = SB.rng(91);
      for (i = 0; i < 260 * g2; i++) {
        var cx2 = cam.x + (r2() - 0.5) * 2 * R0, cz2 = cam.z + (r2() - 0.5) * 2 * R0, f2 = (t * 1.4 + r2()) % 1;
        x = cx2 + (f2 - 0.5) * 18; z = cz2 + (f2 - 0.5) * 6; y = SB.World.groundY(w, x, z) + 0.5 + r2() * 5;
        ln(x, y, z, x + 2.2, y - 0.35, z + 0.7, 0.8, 0.85, 0.92, 0.4 * g2);
      }
    }
  };

  // a colour wash over the whole screen while dust or a gale is up
  var haze = null;
  function wash(dz) {
    if (typeof document === "undefined") return;
    var col = null, a = 0;
    if (dz && dz.kind === "sandstorm") { col = "196,128,64"; a = 0.6 * (dz.thick || 0); }
    else if (dz && dz.kind === "hurricane") { col = "30,40,55"; a = 0.3 * (dz.wind || 0); }
    else if (dz && dz.kind === "tornado") { col = "60,75,50"; a = 0.18; }
    if (!col) { if (haze) haze.style.opacity = "0"; return; }
    if (!haze) {
      if (!document.body) return;
      haze = document.createElement("div"); haze.className = "sb-haze";
      haze.style.cssText = "position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:1;transition:opacity 1s;opacity:0";
      document.body.appendChild(haze);
    }
    haze.style.background = "radial-gradient(ellipse at center, rgba(" + col + "," + (a * 0.5).toFixed(3) + ") 0%, rgba(" + col + "," + a.toFixed(3) + ") 100%)";
    haze.style.opacity = "1";
  }

  // particles and camera shake: called once a frame
  var fxT = 0;
  T.frame = function (game, dt) {
    var R = SB.Render;
    if (!game || !R || !R.camera || !SB.FX) return;
    var cam = R.camera, dz = game.disaster, w = game.world;
    // grumps carrying torches, and grumps carrying smols, are easy to spot
    fxT += dt;
    var tick = fxT > 0.12; if (tick) fxT = 0;
    if (tick) game.creatures.forEach(function (g) {
      if (!g.alive || g.species !== "grump" || g.far) return;
      if (g.raider && T.gear(game).torches) fx("embers", g.x, g.y + 1.2, g.z, 1);
    });
    wash(dz);
    if (!dz) return;
    if (dz.kind === "quake") cam.shake = Math.max(cam.shake, 0.55 * (dz.shake || 0));
    if (!tick) return;
    var cx = cam.x, cz = cam.z, rr = Math.max(10, (cam.halfW || 16));
    if (dz.kind === "tornado" && dz.x != null) {
      var gy = SB.World.groundY(w, dz.x, dz.z), d = SB.dist(cx, cz, dz.x, dz.z);
      for (var h = 0; h < 9; h++) { var y = gy + h * 1.1, rad = 0.4 + h * 0.32, a = game.time * 4 + h; fx(h < 3 ? "dust" : "smoke", dz.x + Math.sin(a) * rad, y, dz.z + Math.cos(a) * rad, 2, { r: rad, col: h < 3 ? [0.55, 0.48, 0.38] : [0.38, 0.4, 0.42] }); }
      fx("leaves", dz.x, gy + 2, dz.z, 3, { r: 4 });
      cam.shake = Math.max(cam.shake, Math.max(0, 0.5 - d / 60));
    } else if (dz.kind === "tsunami") {
      for (var i = 0; i < 14; i++) {
        var a2 = Math.random() * 6.283, d2 = Math.random() * rr * 1.4, x = cx + Math.sin(a2) * d2, z = cz + Math.cos(a2) * d2;
        if (!SB.World.inBounds(w, x, z)) continue;
        var od = oceanD(game, x, z);
        if (Math.abs(od - (dz.front || 0)) < 1.6 && SB.World.heightAt(w, x, z) < 2.6) fx("splash", x, SB.World.groundY(w, x, z) + 0.3, z, 6, { r: 1.2, scale: 1.6 });
      }
      cam.shake = Math.max(cam.shake, 0.15);
    } else if (dz.kind === "sandstorm") {
      for (var j = 0; j < 10 * (dz.thick || 0); j++) { var a3 = Math.random() * 6.283, d3 = Math.random() * rr; fx("dust", cx + Math.sin(a3) * d3, SB.World.groundY(w, cx, cz) + 0.5 + Math.random() * 3, cz + Math.cos(a3) * d3, 2, { r: 2, col: [0.78, 0.55, 0.32], scale: 1.8 }); }
    } else if (dz.kind === "hurricane") {
      for (var k2 = 0; k2 < 6 * (dz.wind || 0); k2++) { var a4 = Math.random() * 6.283, d4 = Math.random() * rr; fx("leaves", cx + Math.sin(a4) * d4, SB.World.groundY(w, cx, cz) + 1 + Math.random() * 3, cz + Math.cos(a4) * d4, 2, { r: 2 }); }
      if (Math.random() < 0.1 * (dz.wind || 0)) cam.shake = Math.max(cam.shake, 0.2);
    }
  };
})();
