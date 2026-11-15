/* smol brains — arrivals3.js (round 3): the small things arrivals need that live in nobody's core file.
     the sky gate     a small building (4 stone, 1 crystal, raised at the nest in a body). pasted smols and merged
                      islands arrive beside it (strangers.js ST.land), and at it you make your smol's code
     glow-stones      the hidden vale's hop points (worldgen.js): step up to one and it hops you to its twin
     icebergs         sea ice that shows in winter and is gone by spring
     the beacon lamp  light carried over to a new game+ once the beacon is lit: it clears the fog round it, calms
                      smols near it and sends grumps home
     waving           in a body, wave to someone passing through or to a guest
     spreading off    the "stay put" world choice: blight stops going farm to farm and bug nests stop budding (dark.js)
   Models for the new world things (red shrub, shelf mushrooms, glow-stone, iceberg, sky gate) are at the bottom. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var AR = SB.Arr = {};
  var GATE_COST = { stone: 4, crystal: 1 };
  AR.GATE_COST = GATE_COST;
  function Sv() { return SB.Surv; }
  function st(game) { var q = game.quests || (game.quests = {}); return q.arrivals3 || (q.arrivals3 = { hops: 0 }); }
  AR.state = st;

  if (SB.KINDS && !SB.KINDS.beaconlamp) SB.KINDS.beaconlamp = { noun: "tool", label: "beacon lamp", emoji: "🏮", r: 0.16, color: 0xfff0a8, light: 1, desc: "a little of the old beacon's light. it clears the fog, calms smols and sends grumps home." };
  if (SB.STRUCTS && !SB.STRUCTS.skygate) SB.STRUCTS.skygate = { noun: "wonder", label: "sky gate", emoji: "🌀", r: 0.9, cost: GATE_COST, work: 6, desc: "smols from codes and from other islands arrive here. step up to it to make your own smol's code." };

  /* ---------------- the sky gate ---------------- */
  AR.gate = function (game) { return SB.Strangers && SB.Strangers.gate ? SB.Strangers.gate(game) : null; };
  AR.gateWhy = function (game, c) {
    if (AR.gate(game)) return "there's a sky gate already";
    if (!Sv()) return "no paws for it";
    for (var k in GATE_COST) if (Sv().count(c, k, true) < GATE_COST[k]) return "a sky gate takes " + GATE_COST.stone + " stone and " + GATE_COST.crystal + " crystal";
    return "";
  };
  AR.raiseGate = function (game, c) {
    var why = AR.gateWhy(game, c), W = SB.World, w = game.world, at = null;
    if (why) return { ok: false, msg: why };
    for (var i = 0; i < 16 && !at; i++) { var a = i * 0.785, d = 2.2 + (i >> 3) * 1.4, x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d; if (W.siteFree ? W.siteFree(w, x, z, 0.9) : W.walkable(w, x, z)) at = { x: x, z: z }; }
    if (!at) return { ok: false, msg: "no level ground here for a gate" };
    for (var k in GATE_COST) Sv().take(c, k, GATE_COST[k]);
    var g = W.addStructure(w, game, "skygate", at.x, at.z, { done: true, rot: 0 });
    SB.Game.note(game, "🌀 " + c.name + " raised a sky gate. smols from codes arrive here now");
    return { ok: true, gate: g, msg: "🌀 the sky gate hums. smols from codes and other islands arrive here" };
  };
  AR.makeCode = function (game, c) {
    var code = SB.Save && SB.Save.exportSmol ? SB.Save.exportSmol(c) : "";
    if (!code) return { ok: false, msg: "the gate stays quiet" };
    if (SB.Cards && SB.Cards.copyCode && typeof navigator !== "undefined") SB.Cards.copyCode(c);
    else game.stats.exported = (game.stats.exported || 0) + 1;
    return { ok: true, code: code, msg: "🌀 the gate wrote " + c.name + "'s code. paste it into any island" };
  };

  /* ---------------- glow-stones ---------------- */
  AR.stones = function (game) { return game.world.nodes.filter(function (n) { return n.kind === "glowstone"; }); };
  AR.hop = function (game, c, n) {
    var W = SB.World, w = game.world, to = AR.stones(game).filter(function (o) { return o !== n; })[0];
    if (!to) return { ok: false, msg: "this stone has no twin" };
    for (var i = 0; i < 8; i++) {
      var a = i * 0.785, x = to.x + Math.cos(a) * 1.2, z = to.z + Math.sin(a) * 1.2;
      if (!W.walkable(w, x, z, false)) continue;
      c.x = x; c.z = z; c.action = null;
      if (W.reveal) W.reveal(w, x, z, 9);
      var s = st(game); s.hops++;
      if (w.T.vale && SB.dist(x, z, w.T.vale.x, w.T.vale.z) < w.T.vale.r + 1 && !s.vale) { s.vale = 1; SB.Game.addSparks(game, 5, c); SB.Game.note(game, "🔆 " + c.name + " found the hidden vale! +5 ✨"); }
      return { ok: true, msg: "🔆 hop! " + (s.vale && s.hops < 3 ? "a hidden vale, ringed by cliffs" : "the stone hums behind you") };
    }
    return { ok: false, msg: "the twin stone is blocked" };
  };

  /* ---------------- in a body ---------------- */
  AR.options = function (game, c, r, o, x) {
    if (!r || !r.ref) return;
    function run(fn) { return function () { var q = fn(); if (q && q.msg) x.say(q.msg); if (q && q.ok) x.audio("chime", 0.6); return true; }; }
    if (r.type === "node" && r.ref.kind === "glowstone") o.use = x.op("hop through the glow-stone", run(function () { return AR.hop(game, c, r.ref); }), null);
    else if (r.type === "node" && r.ref === game.world.T.nest && !o.place && !AR.gate(game) && !AR.gateWhy(game, c)) o.place = x.op("raise a sky gate (4 stone, 1 crystal)", run(function () { return AR.raiseGate(game, c); }), null);
    else if (r.type === "struct" && r.ref.kind === "skygate") o.use = x.op("make " + c.name + "'s code", run(function () { return AR.makeCode(game, c); }), null);
    else if (r.type === "creature" && r.ref.stranger && (r.ref.stranger.state === "passing" || r.ref.stranger.state === "guest") && !r.ref.stranger.waved && !o.pick && SB.Strangers && SB.Strangers.wave) o.pick = x.op("wave to " + r.ref.name, run(function () { return SB.Strangers.wave(game, c, r.ref); }), null);
  };

  /* ---------------- the slow tick: sea ice by season, and the lamps ---------------- */
  var tT = 0;
  AR.lamps = function (game) {
    var out = [], its = game.world.items, cs = game.creatures, i;
    for (i = 0; i < its.length; i++) if (its[i].kind === "beaconlamp") out.push(its[i]);
    if (Sv() && Sv().has) for (i = 0; i < cs.length; i++) if (cs[i].alive && cs[i].species === "smol" && cs[i].inv && Sv().has(cs[i], "beaconlamp")) out.push(cs[i]);
    return out;
  };
  // "spreading things: stay put": the two things in dark.js that spread are held where they are. Blight counts s.t
  // up to 20 before it jumps a farm, and a bug nest buds two days after p.spread: both are pinned here
  AR.hold = function (game) {
    var x = game.quests && game.quests.dark && game.quests.dark.x2, n = 0;
    if (!x) return 0;
    if (x.sky && x.sky.id === "blight") { x.sky.t = 0; n++; }
    (x.places || []).forEach(function (p) { if (p && p.kind === "nest") { p.spread = 1e9; n++; } });
    return n;
  };
  AR.slow = function (game) {
    var w = game.world, T = w.T, want = w.season === 3 ? "ok" : "gone";
    if (game.settings && game.settings.world && game.settings.world.spread === "off") AR.hold(game);
    if (T.ice && T._iceS !== want) { T._iceS = want; T.ice.forEach(function (n) { n.state = want; if (SB.World.markNode) SB.World.markNode(w, n); }); }
    AR.lamps(game).forEach(function (l) {
      if (SB.World.reveal) SB.World.reveal(w, l.x, l.z, 12);
      game.creatures.forEach(function (o) {
        if (!o.alive || SB.dist2(o.x, o.z, l.x, l.z) > 49) return;
        if (o.species === "grump") { SB.Chem.apply(o.chem, { fear: 0.5 }); if (o.chem.fear > 0.7) o.goingHome = true; }
        else if (o.species === "smol") SB.Chem.apply(o.chem, { fear: -0.2 });
      });
    });
  };
  AR.tick = function (game, dt) {
    tT -= dt;
    if (tT > 0) return;
    tT = 3;
    AR.slow(game);
  };
  if (SB.Ext) { SB.Ext.on("tick", AR.tick); SB.Ext.on("options", AR.options); }

  /* ---------------- models (not seen in a browser yet) ---------------- */
  var ME = SB.Meshes || SB.ME;
  if (ME && ME.NODE_BUILDERS && ME.STRUCT_BUILDERS && ME.builder) {
    try {
      var NB = ME.NODE_BUILDERS;
      NB.redshrub = function (seed) { // a low dome of red and orange leaves, dark berries tucked in
        var b = ME.builder();
        b.flex(1 / 0.8, 0, 0.4).color(0xc8372d, 1).smoothShade(true).shadeY(0, 0.7, 0.45);
        b.push().translate(0, 0.28, 0).scale(0.55, 0.38, 0.55).blob(1, 0.3, seed, 0.5).pop();
        b.color(0xe2702b, 1).push().translate(0.28, 0.24, -0.1).scale(0.36, 0.28, 0.36).blob(1, 0.3, seed + 2, 0.5).pop();
        b.shadeY(null).smoothShade(false).color(0x5a1630);
        for (var i = 0; i < 5; i++) { var a = i * 1.9 + seed; b.push().translate(Math.cos(a) * 0.4, 0.36 + (i % 2) * 0.12, Math.sin(a) * 0.4).scale(0.07).sphere(0).pop(); }
        return b.finish();
      };
      NB.shelfcap = function (seed) { // an old stump with flat brown caps stepping up one side
        var b = ME.builder();
        b.color(0x6b4a32).cyl(6, 0.2, 0.16, 0.55);
        for (var i = 0; i < 4; i++) {
          var a = seed + i * 1.7;
          b.color(i % 2 ? 0xc99a5b : 0xa9743c).push().translate(Math.cos(a) * 0.2, 0.12 + i * 0.12, Math.sin(a) * 0.2).scale(0.2 - i * 0.02, 0.035, 0.2 - i * 0.02).sphere(0).pop();
        }
        return b.finish();
      };
      NB.glowstone = function (seed) { // a tall pale stone, lit from inside, on a dark foot
        var b = ME.builder();
        b.color(0x4a5568).push().scale(0.5, 0.14, 0.5).blob(0, 0.3, seed).pop();
        b.color(0x9adfff).glow(0.8).push().rotY(seed).cyl(5, 0.26, 0.12, 1.3).pop();
        b.color(0xffffff).glow(1).push().translate(0, 1.45, 0).scale(0.1).sphere(0).pop().glow(0);
        return b.finish();
      };
      NB.iceberg = function (seed) { // floats two above its foot: worldgen only puts one where the sea is two deep
        var b = ME.builder();
        b.color(0xe6f5ff, 1).glow(0.12).smoothShade(true);
        b.push().translate(0, 2.05, 0).scale(1.5, 0.75, 1.25).blob(1, 0.35, seed).pop();
        b.color(0xcdeaff, 1).push().translate(0.35, 2.75, 0.1).rotY(seed).scale(0.7, 0.85, 0.6).blob(1, 0.4, seed + 3).pop();
        b.push().translate(-0.6, 2.4, -0.3).scale(0.5, 0.45, 0.5).blob(1, 0.4, seed + 5).pop();
        return b.smoothShade(false).glow(0).finish();
      };
      ME.STRUCT_BUILDERS.skygate = function () { // two stone posts, a lintel, and a ring of light between them
        var b = ME.builder();
        b.color(0x8f96a8).push().translate(-0.55, 0, 0).box(0.22, 1.4, 0.26).pop().push().translate(0.55, 0, 0).box(0.22, 1.4, 0.26).pop();
        b.push().translate(0, 1.38, 0).box(1.5, 0.2, 0.3).pop();
        b.color(0x9ad7ff).glow(0.9);
        for (var i = 0; i < 10; i++) { var a = i / 10 * 6.283; b.push().translate(Math.cos(a) * 0.36, 0.75 + Math.sin(a) * 0.5, 0).scale(0.07).sphere(0).pop(); }
        return b.glow(0).finish();
      };
    } catch (e) {}
  }
})();
