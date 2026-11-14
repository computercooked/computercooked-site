/* smol brains — bosses.js (4.26, "the captains of the dark"): the Terraria side of the game.
   The grumps that broke the ark came down with it, and three of their captains have dug in on the island. Each has a
   lair, far from the nest, in its own direction. They don't raid: they wait. You go to them, in a smol's body, with
   the best thing you've made, and you fight: it winds up and pounces (the same duel as a night chase), you hit it
   between pounces. Each one's hide turns a weaker weapon, so the three of them are the reason to climb from a club
   to stone to iron:
     Gloom           a club, a spear or any real tool          (tool-users)
     Murk            a proper weapon or axe: nothing soft      (the tribe)
     the Long Night  iron                                      (builders)
   Walk away and it lets you go (and licks its wounds). Lose and you crawl off with a quarter of your hearts. Win and
   the light it was sitting on comes back to the Lantern: embers, sparks, and the dark around its lair lifts for good.
   State lives in game.quests.boss (saved with the quest board); the creature itself is re-made if a save lost it.
   Rolls its own dice for the lair spots (seeded from the island), so the island's random stream is untouched. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var B = SB.Bosses = {};
  B.LIST = [
    { id: "gloom", name: "Gloom", icon: "🌑", tier: 2, tough: 2.3, armour: 0.5, dmg: 0.2, speed: 0.8, size: 1.5, embers: 2, sparks: 15,
      needs: "a club, a spear or a stone tool", line: "the first of the three captains. slow, and not as tough as it looks." },
    { id: "murk", name: "Murk", icon: "🌘", tier: 3, tough: 5, armour: 1, dmg: 0.22, speed: 0.9, size: 1.8, embers: 3, sparks: 25,
      needs: "a club, a spear or an axe (a rock-on-a-stick bounces off)", line: "the second captain. it has eaten a lot of campfires." },
    { id: "night", name: "the Long Night", icon: "🌚", tier: 4, tough: 9, armour: 1.25, dmg: 0.25, speed: 1, size: 2.2, embers: 5, sparks: 40,
      needs: "iron: an iron axe or a sword", line: "the one that caught the ark. nothing softer than iron marks it." }
  ];
  B.BY = {}; B.LIST.forEach(function (d, i) { d.i = i; B.BY[d.id] = d; });
  B.AGGRO = 9;    // this close to a lair, in a body, and it comes for you
  B.LEASH = 26;   // this far from its lair and it lets you go
  B.NEAR = 40;    // a smol this close finds the lair (it goes on the goals list)
  B.LOSE_AT = 0.3; // hearts left when it has beaten you
  B.FIRST_DAY = 3; // nothing before this day
  B.REST = 15;      // seconds it leaves you alone after a duel ends
  B.FIT = 0.5;      // and it won't start on a smol with fewer hearts than this (rest and eat first)
  B.REEL = 2;       // a hit landed while it reels after a pounce counts this many times

  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) { var q = Q(game); if (!q.boss || typeof q.boss !== "object") q.boss = { list: {} }; if (!q.boss.list) q.boss.list = {}; return q.boss; }
  B.state = st;
  function W() { return SB.World; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function home(game) { return SB.Society && SB.Society.home ? SB.Society.home(game, 0) : game.world.T.nest; }
  function dirOf(dx, dz) { var a = Math.atan2(dx, -dz) * 180 / Math.PI; a = (a + 360) % 360; return ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"][Math.round(a / 45) % 8]; }

  // where the three lairs are: far from the nest, a third of a turn apart, on dry walkable ground
  // one lair: far from the nest, in its own third of the compass, on dry ground you can WALK to (4.28: the first cut
  // only asked for dry ground, and a lair could sit across a lake or on a rock in the sea)
  function placeOne(game, d, a0, r) {
    var w = game.world, hm = home(game), N = w.T.N, i = d.i, spot = null, fallback = null;
    for (var t = 0; t < 90 && !spot; t++) {
      var ang = a0 + i * 2.094 + (r() - 0.5) * (0.9 + t * 0.03), dist = N * (0.2 + i * 0.045) * (0.85 + r() * 0.3) * (1 - t / 180);
      var x = hm.x + Math.sin(ang) * dist, z = hm.z + Math.cos(ang) * dist;
      if (!(W().inBounds(w, x, z) && W().walkable(w, x, z, false) && W().depthAt(w, x, z) < 0.05 && SB.dist(x, z, hm.x, hm.z) > 30)) continue;
      if (!fallback) fallback = { x: x, z: z };
      if (!W().findPath || W().findPath(w, hm.x, hm.z, x, z, false, 60000)) spot = { x: x, z: z };
    }
    if (!spot) spot = fallback || { x: hm.x + Math.sin(a0 + i * 2.094) * 34, z: hm.z + Math.cos(a0 + i * 2.094) * 34 };
    return { x: Math.round(spot.x * 10) / 10, z: Math.round(spot.z * 10) / 10, found: false, beaten: false, cid: null, tries: 0 };
  }
  B.place = function (game) {
    var s = st(game);
    if (s.placed === 2) return s;
    var r = SB.rng(((game.seed >>> 0) ^ 0xb055) >>> 0), a0 = r() * 6.283, w = game.world, hm = home(game);
    B.LIST.forEach(function (d) {
      var e = s.list[d.id];
      if (!e) { s.list[d.id] = placeOne(game, d, a0, r); return; }
      // an island from 4.26/4.27: a lair nobody has found yet moves if you couldn't have walked to it
      if (!e.beaten && !e.found && W().findPath && !W().findPath(w, hm.x, hm.z, e.x, e.z, false, 60000)) {
        var old = e.cid != null ? SB.Game.byId(game, e.cid) : null; if (old && old.alive) { old.alive = false; old.gone = true; }
        s.list[d.id] = placeOne(game, d, a0, r);
      }
    });
    s.placed = 2;
    return s;
  };
  B.open = function (game) { return !!game && !game.showcase && day(game) >= B.FIRST_DAY && (!game.tutorial || game.tutorial.done || (game.tutorial.night && game.tutorial.night.done)); };
  // is this captain out there yet? (the island has to have grown the hands to fight it)
  B.awake = function (game, d) { return B.open(game) && ((game.stats && game.stats.maxTier) || 0) >= d.tier && (d.i === 0 || st(game).list[B.LIST[d.i - 1].id].beaten); };
  B.creature = function (game, d) { var e = st(game).list[d.id], c = e && e.cid != null ? SB.Game.byId(game, e.cid) : null; return c && c.alive && c.species === "grump" ? c : null; };
  B.of = function (g) { return g && g.boss ? B.BY[g.boss] || null : null; };
  B.where = function (game, d) { var e = st(game).list[d.id], hm = home(game); return e ? dirOf(e.x - hm.x, e.z - hm.z) : ""; };

  function spawn(game, d) {
    var e = st(game).list[d.id];
    var g = SB.Game.spawnGrump(game, e.x, e.z);
    g.name = d.name; g.boss = d.id; g.tough = d.tough; g.whacked = e.hurt || 0;
    if (g.look) g.look.size = (g.look.size || 1) * d.size;
    g.scout = { who: null, t: 0, hitT: 0, hold: true, speedK: d.speed, dmg: d.dmg, boss: d.id };
    e.cid = g.id;
    return g;
  }
  // someone for a waiting captain to glare at (creature.js drops a scout whose prey is gone)
  function anyone(game, x, z) {
    var best = null, bd = 1e9;
    SB.Game.smols(game).forEach(function (c) { if (!c.alive) return; var dd = SB.dist(c.x, c.z, x, z); if (dd < bd) { bd = dd; best = c; } });
    return best;
  }
  var tT = 0;
  B.tick = function (game, dt) {
    if (!game || game.offline || !B.open(game)) return;
    if ((tT -= dt) > 0) return;
    tT = 0.5;
    var s = B.place(game), P = SB.Possess, me = P && P.active ? P.c : null;
    B.LIST.forEach(function (d) {
      var e = s.list[d.id];
      if (e.beaten || !B.awake(game, d)) return;
      var g = B.creature(game, d) || spawn(game, d);
      var dueling = !!(me && P.scout && P.scout() === g);
      if (!g.scout || g.scout.done) g.scout = { who: null, t: 0, hitT: 0, hold: true, speedK: d.speed, dmg: d.dmg, boss: d.id };
      if (!dueling) { // at home, waiting, mending
        var who = anyone(game, e.x, e.z);
        g.scout.who = who ? who.id : null; g.scout.hold = true;
        if (SB.dist(g.x, g.z, e.x, e.z) > 1.5) { g.x = e.x; g.z = e.z; g.px = e.x; g.pz = e.z; }
        g.goingHome = false; g.chem.fear = 0;
        if (g.whacked > 0) g.whacked = Math.max(0, g.whacked - 0.5 * 0.05 * B.need(d)); // back to full in about 20 s
        e.hurt = g.whacked;
      }
      // found: any smol of yours wanders near
      if (!e.found) {
        var near = anyone(game, e.x, e.z);
        if (near && SB.dist(near.x, near.z, e.x, e.z) < B.NEAR) { e.found = true; if (W().reveal) W().reveal(game.world, e.x, e.z, 8); SB.bus.emit("bossFound", { boss: d, c: near, x: e.x, z: e.z }); }
      }
      // in a body, close: it comes for you
      if (me && me.alive && !dueling && P.scout && !P.scout() && SB.dist(me.x, me.z, e.x, e.z) < B.AGGRO && game.time >= (e.rest || 0) && me.chem.health >= B.FIT) {
        g.scout.who = me.id; g.scout.hits = 0;
        if (P.adoptScout(g, { keep: true })) { e.tries = (e.tries || 0) + 1; if (!e.found) e.found = true; SB.bus.emit("bossFight", { boss: d, c: me, g: g }); }
      }
    });
  };
  // hits it takes (with a weapon of strength 1)
  B.need = function (d) { return SB.Threats && SB.Threats.whacksNeeded ? SB.Threats.whacksNeeded({ tough: d.tough }) : Math.round(3 * d.tough); };
  // possess.js asks, each tick of a duel: has it ended without a kill? returns [message, why] or null
  B.duel = function (game, c, g) {
    var d = B.of(g); if (!d) return null;
    var e = st(game).list[d.id];
    if (SB.dist(c.x, c.z, e.x, e.z) > B.LEASH) { e.rest = game.time + B.REST; return ["😮‍💨 " + d.name + " lets you go. it will be waiting", "left"]; }
    if (c.chem.health <= B.LOSE_AT) { e.rest = game.time + B.REST; return ["💢 " + d.name + " was too much. you crawl away. eat, rest, and come back (a better weapon helps)", "lost"]; }
    return null;
  };
  // can this weapon mark it? (possess.js attack). returns "" or the reason it can't
  B.blocks = function (g, dmg, toolName) {
    var d = B.of(g); if (!d) return "";
    return dmg + 1e-9 >= d.armour ? "" : (toolName ? "your " + toolName + " bounces off " : "your paws bounce off ") + d.name + "'s hide. it needs " + d.needs;
  };
  // dodge its pounce and it stumbles for a couple of seconds: hits landed then count double. (After it BITES you it
  // only stands and glares, as any grump does: no bonus for getting bitten.)
  B.OPEN = 2.4;
  B.reeling = function (g) { return !!(g && g.boss && g.scout && g.scout.open && g.scout.hitT > 0.9); };
  B.hp = function (game, d) { var g = B.creature(game, d); return g ? Math.max(0, 1 - (g.whacked || 0) / B.need(d)) : 0; };
  // beaten: the light it sat on comes back
  B.win = function (game, d, c) {
    var e = st(game).list[d.id];
    if (!e || e.beaten) return false;
    e.beaten = true; e.cid = null; e.day = day(game); e.by = c ? c.name : null;
    if (SB.Embers) for (var i = 0; i < d.embers; i++) SB.Embers.add(game, "boss-" + d.id + "-" + i, d.name + " beaten: its stolen light came home", c);
    if (SB.Game.addSparks) SB.Game.addSparks(game, d.sparks, c || null);
    if (W().reveal) W().reveal(game.world, e.x, e.z, 14);
    if (SB.Game.note) SB.Game.note(game, d.icon + " " + (c ? c.name : "your smols") + " beat " + d.name + "! the light it was sitting on came home to the Lantern.");
    SB.bus.emit("bossBeaten", { boss: d, c: c || null, x: e.x, z: e.z, last: d.i === B.LIST.length - 1 });
    return true;
  };
  B.beaten = function (game) { var s = st(game); return B.LIST.filter(function (d) { return s.list[d.id] && s.list[d.id].beaten; }).length; };
  // may the beacon be started? Only with all three captains' light back (an island that began its spire before 4.27
  // carries on: ideas.js only asks before a new site)
  B.gates = function (game) { return !B.open(game) ? true : B.beaten(game) >= B.LIST.length; };
  // the next one, for the goals list: { boss, found, where, x, z } or null
  B.next = function (game) {
    if (!B.open(game)) return null;
    var s = B.place(game);
    for (var i = 0; i < B.LIST.length; i++) {
      var d = B.LIST[i], e = s.list[d.id];
      if (e.beaten) continue;
      return B.awake(game, d) ? { boss: d, found: e.found, where: B.where(game, d), x: e.x, z: e.z, tries: e.tries || 0 } : null;
    }
    return null;
  };

  var hooked = false;
  B.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    SB.bus.on("scoutMiss", function (d) { if (d && d.g && d.g.boss && d.g.scout) { d.g.scout.hitT = 0.9 + B.OPEN; d.g.scout.reel = 0.8; d.g.scout.open = true; } });
    SB.bus.on("scoutHit", function (d) { if (d && d.g && d.g.boss && d.g.scout) d.g.scout.open = false; });
    SB.bus.on("grumpChased", function (d) { var game = SB.Game.current, b = d && B.of(d.g); if (game && b) B.win(game, b, d.c); });
  };
  B.hook();
})();
