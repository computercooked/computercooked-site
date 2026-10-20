// smol brains — strangers. Other escape pods came down too; their survivors have been living wild.
// Every so often one wanders up to your village and waits. You decide: welcome them or send them away.
// Family can't have kids together, so a colony that never lets anyone in slowly runs out of futures.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var ST = SB.Strangers = {};

  var WAIT = 150; // seconds a stranger waits for an answer before deciding for themselves

  function smols(game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol" && !c.stranger; }); }
  // pairs who could still start a family: grown-up, one of each, not related
  ST.breedablePairs = function (game) {
    var ad = smols(game).filter(function (c) { return c.stage >= 2 && c.stage <= 3; }), n = 0;
    for (var i = 0; i < ad.length; i++) for (var j = i + 1; j < ad.length; j++) {
      var a = ad[i], b = ad[j];
      if (a.sex !== b.sex && !SB.Game.related(game, a, b)) n++;
    }
    return n;
  };
  ST.pending = function (game) { return game.creatures.filter(function (c) { return c.alive && c.stranger && c.stranger.state === "waiting"; })[0] || null; };

  function nextIn(game) {
    var r = game.rng, urgent = ST.breedablePairs(game) === 0;
    return urgent ? r.range(150, 260) : r.range(480, 840);
  }
  function spot(game, home, dist) {
    var w = game.world, r = game.rng;
    for (var i = 0; i < 40; i++) {
      var a = r() * 6.283, d = dist * (0.8 + r() * 0.4), x = home.x + Math.cos(a) * d, z = home.z + Math.sin(a) * d;
      if (SB.World.inBounds(w, x, z) && SB.World.walkable(w, x, z, false) && SB.World.depthAt(w, x, z) < 0.1) return { x: x, z: z };
    }
    return null;
  }

  ST.tick = function (game, dt) {
    var all = smols(game);
    if (!all.length) return;
    if (game.strangerT == null) game.strangerT = 600; // the first one turns up about ten minutes in
    // strangers who are here: walk up, wait, or leave
    game.creatures.forEach(function (c) {
      var s = c.stranger;
      if (!c.alive || !s) return;
      if (s.state === "waiting" && game.time - s.t > WAIT) ST.decide(game, c, all.length < 8 || ST.breedablePairs(game) === 0, true);
      if (s.state === "leaving" && (game.time - s.t > 70 || SB.dist(c.x, c.z, s.x0, s.z0) < 3)) { c.alive = false; c.gone = true; c.dying = false; }
    });
    game.strangerT -= dt;
    if (game.strangerT > 0) return;
    game.strangerT = nextIn(game);
    if (ST.pending(game)) return;
    if (all.length + 1 >= SB.Game.POP_CAP) return;
    ST.arrive(game);
  };

  // a stranger walks in from the wild
  ST.arrive = function (game, opts) {
    opts = opts || {};
    var all = smols(game), r = game.rng;
    var home = SB.Society ? SB.Society.home(game, 0) : game.world.T.spawn;
    var from = spot(game, home, 30), wait = spot(game, home, 7);
    if (!from || !wait) return null;
    var top = all.reduce(function (m, c) { return Math.max(m, c.tier); }, 0);
    var tier = opts.tier != null ? opts.tier : Math.max(0, Math.min(5, top + (r() < 0.2 ? 1 : r() < 0.55 ? 0 : -1)));
    // the colony's more lopsided sex is what newcomers tend to be
    var f = all.filter(function (c) { return c.sex === "f"; }).length, m = all.length - f;
    var sex = opts.sex || (f < m ? (r() < 0.75 ? "f" : "m") : m < f ? (r() < 0.75 ? "m" : "f") : (r() < 0.5 ? "f" : "m"));
    var c = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(r, tier), x: from.x, z: from.z, age: SB.STAGES[3].from + 30 + r() * 120, sex: sex, tribe: 0 });
    c.stranger = { state: "waiting", t: game.time, x0: from.x, z0: from.z, wx: wait.x, wz: wait.z };
    // survivors have had to learn things out there
    if (SB.Ideas && c.tier >= 2) {
      var can = SB.Ideas.LIST.filter(function (d) { return SB.Ideas.canHold(c, d.id) && d.tier <= c.tier && !SB.Game.cultureKnows(game, d.id); });
      if (can.length && r() < 0.6) { var d = r.pick(can); c.ideas[d.id] = 1; c.stranger.brings = d.id; }
    }
    c.stranger.trait = r.pick(["shy", "brave", "chatty", "hungry", "tired", "cheerful", "grumpy", "curious"]);
    if (c.stranger.trait === "grumpy") c.chem.anger = 0.35;
    if (c.stranger.trait === "hungry") c.chem.hunger = 0.7;
    SB.bus.emit("stranger", { c: c });
    return c;
  };

  // welcome (true) or send away (false)
  ST.decide = function (game, c, welcome, auto) {
    var s = c.stranger;
    if (!s || s.state !== "waiting") return;
    if (welcome) {
      c.stranger = null;
      c.tribe = 0;
      SB.Chem.apply(c.chem, { lonely: -0.5, fear: -0.3 });
      c.anim.emote = "love"; c.anim.emoteT = 2;
      SB.Game.unlock(game, "stranger");
      SB.Game.note(game, c.name + (auto ? " wandered in and stayed. welcome!" : " joined your smols! 🧳"));
      SB.bus.emit("strangerJoined", { c: c, auto: !!auto });
    } else {
      s.state = "leaving"; s.t = game.time;
      c.action = null; c.plan = null;
      SB.bus.emit("strangerLeft", { c: c, auto: !!auto });
    }
  };

  // how a stranger spends its time (called from the creature's think): walk up, wait, or walk away
  ST.think = function (c, game) {
    var s = c.stranger;
    if (!s) return false;
    var tx = s.state === "leaving" ? s.x0 : s.wx, tz = s.state === "leaving" ? s.z0 : s.wz;
    if (SB.dist(c.x, c.z, tx, tz) > 1.5) return { x: tx, z: tz };
    return { wait: true };
  };
})();
