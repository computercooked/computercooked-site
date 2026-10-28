/* smol brains — tricks.js
   Tricks: the training game, made visible. Each trick is a situation (a feeling, a thing in view, maybe a
   word it heard) and the verb a well-raised smol picks there (or the one it should leave alone). The meter is
   read straight out of the smol's own net (Brain.qOf over the verbs it could pick), so every tickle and tap
   moves it, and so does everything else it learns: punish shroom-eating too hard and "eat when hungry" can
   slip. A trick counts as learned when the meter crosses the line; it pays sparks the first time per smol,
   and it can be forgotten (and learned again, for nothing) if the net drifts.
   v4.5.1: the bar you see is progress from where this smol started (its instinct when it was first read,
   `r.b`) to its goal, so every new smol starts near 0% and the bar is what you taught. A "set it up" opens a
   short session: a tickle (or tap) that lands while the smol is doing something else is held back with a
   "wait for it", so a mistimed click can't quietly teach the wrong thing.
   Pure sim: no DOM. ui.js draws the panel, quests.js counts them. */
(function () {
  "use strict";
  var SB = window.SB;
  var T = (SB.Tricks = {});
  var IN = SB.IN;

  // data: drive (0.9, others 0.1), noun in view (near), heard (a word), verb (do it) or avoid (don't).
  // practice: what the "set it up" button does (drop an item beside it, or say a word to it).
  T.LIST = [
    { id: "eat", icon: "🍎", name: "eat when hungry", drive: "hunger", noun: "food", verb: "eat", practice: { drop: "apple" },
      how: "when it's hungry, put food beside it and 🪶 tickle it while it eats." },
    { id: "shroom", icon: "🍄", name: "leave red shrooms alone", drive: "hunger", noun: "mushroom", avoid: "eat", practice: { drop: "shroom" },
      how: "drop a shroom beside it. 👆 tap it the moment it nibbles. careful: tap too hard and it may go off food altogether." },
    { id: "come", icon: "👣", name: "come when called", noun: "hand", heard: "approach", verb: "approach", practice: { say: "come" },
      how: "say 💬 “come” to it, then 🪶 tickle it as it walks over." },
    { id: "play", icon: "⚽", name: "play when bored", drive: "bored", noun: "ball", verb: "play", practice: { drop: "ball" },
      how: "give a bored smol a ball and 🪶 tickle it while it plays." },
    { id: "herb", icon: "🌿", name: "eat healroot when sick", drive: "sick", noun: "medicine", verb: "eat", practice: { drop: "herb" },
      how: "when it's poorly, put healroot beside it and 🪶 tickle it while it eats." },
    { id: "hug", icon: "🤗", name: "hug a friend when lonely", drive: "lonely", noun: "smol", verb: "cuddle",
      how: "when it's lonely and near another smol, 🪶 tickle it while they cuddle." },
    { id: "nohit", icon: "✋", name: "never hit other smols", drive: "anger", noun: "smol", avoid: "hit",
      how: "👆 tap it straight away whenever it shoves or hits someone." },
    { id: "run", icon: "💨", name: "run from grumps", drive: "fear", noun: "grump", verb: "flee",
      how: "at night, 🪶 tickle it when it runs away from a grump." }
  ];
  T.BY = {};
  T.LIST.forEach(function (d) { T.BY[d.id] = d; });
  T.LEARN = 0.8;   // the meter at which a trick counts as learned (one good lesson often gets close, two get there)
  T.FORGET = 0.45; // and the meter below which a learned trick slips
  T.PAY = 2;       // sparks, the first time a smol learns a trick
  var TEMP = 0.25; // softmax temperature for reading the net (q values sit roughly in -1..1): 2-3 good lessons fill a bar
  var FIRST = 1, LAST = 11; // the everyday verbs (approach..wander): what probe() in brain.js weighs

  var xs = {}; // one scratch input per brain size
  function input(b, d) {
    var x = xs[b.nIn] || (xs[b.nIn] = new Float32Array(b.nIn)), i;
    for (i = 0; i < b.nIn; i++) x[i] = 0;
    for (i = 0; i < SB.N_DRIVES; i++) x[IN.DRIVE0 + i] = 0.1;
    if (d.drive) x[IN.DRIVE0 + SB.D[d.drive]] = 0.9;
    x[IN.NOUN0 + SB.N[d.noun]] = 1;
    if (d.heard) x[IN.HEARD0 + SB.V[d.heard]] = 1;
    x[IN.NEAR] = 1;
    x[IN.BIAS] = 1;
    return x;
  }
  var qs = new Float32Array(SB.N_VERBS);
  // how likely this brain is to pick the trick's verb in the trick's situation (0..1)
  T.chance = function (b, d) {
    if (!b) return 0;
    var x = input(b, d), mx = -1e9, a, s = 0;
    for (a = FIRST; a <= LAST; a++) { qs[a] = SB.Brain.qOf(b, x, a); if (qs[a] > mx) mx = qs[a]; }
    for (a = FIRST; a <= LAST; a++) { qs[a] = Math.exp((qs[a] - mx) / TEMP); s += qs[a]; }
    return qs[SB.V[d.verb || d.avoid]] / s;
  };
  // the meter: 0..1, higher is better trained, for "do" and "avoid" tricks alike
  T.meter = function (c, d) {
    if (!c || !c.brain) return 0;
    var p = T.chance(c.brain, d);
    if (d.verb) return SB.clamp01(p);
    return SB.clamp01(1 - p / 0.12); // avoid: 12% or more = empty, learned under ~5%
  };
  // where this smol started on a trick, and what it has to reach. a smol born good at something still has a
  // little way to go, so every trick is something you teach
  T.STRETCH = 0.15;
  T.goal = function (r) {
    var b = r && r.b != null ? r.b : 0;
    return { b: b, g: b >= T.LEARN - T.STRETCH ? b + (1 - b) * 0.5 : Math.max(T.LEARN, b + T.STRETCH) }; // born good at it: half the way that's left
  };
  // 0..1: how far along the taught part of the bar it is
  T.progress = function (c, d) {
    var r = c && c.tricks && c.tricks[d.id], m = T.meter(c, d), q = T.goal(r);
    return { p: SB.clamp01((m - q.b) / Math.max(0.05, q.g - q.b)), m: m, g: q.g, b: q.b };
  };
  // a habit takes repeating: the brain may get it from one lesson, but a trick counts after REPS good ones,
  // and the bar you see fills a step per good lesson (never past what the net really does)
  T.REPS = 3;
  T.shown = function (c, d) {
    if (T.known(c, d.id)) return 1;
    var r = c && c.tricks && c.tricks[d.id];
    return Math.min(T.progress(c, d).p, ((r && r.n) || 0) / T.REPS);
  };
  T.known = function (c, id) { return !!(c && c.tricks && c.tricks[id] && c.tricks[id].on); };
  T.count = function (c) { var n = 0; if (c && c.tricks) for (var k in c.tricks) if (c.tricks[k].on) n++; return n; };
  // tricks you've taught the colony (instincts don't count): how many different ones, and the total
  T.colony = function (game) {
    var kinds = {}, total = 0;
    SB.Game.smols(game).forEach(function (c) { if (c.tricks) for (var k in c.tricks) if (c.tricks[k].on && c.tricks[k].by) { kinds[k] = 1; total++; } });
    return { kinds: Object.keys(kinds).length, total: total };
  };
  T.best = function (game) { var m = 0; SB.Game.smols(game).forEach(function (c) { m = Math.max(m, T.count(c)); }); return m; };

  // re-read one smol's tricks after its brain changed; emits trickLearned / trickForgot
  T.check = function (c, game, quiet) {
    if (!c || !c.alive || c.species !== "smol" || !c.brain) return;
    var tr = c.tricks || (c.tricks = {});
    for (var i = 0; i < T.LIST.length; i++) {
      var d = T.LIST[i], m = T.meter(c, d), r = tr[d.id];
      // first read (a hatchling, a founder, a stranger): where it starts. old saves get a start too
      if (!r) { r = tr[d.id] = { on: 0, b: Math.round(m * 1000) / 1000 }; if (quiet) continue; }
      if (r.b == null) r.b = r.on ? Math.max(0, T.LEARN - T.STRETCH) : Math.round(m * 1000) / 1000;
      var q = T.goal(r);
      if (m >= q.g && !r.on && (quiet || (r.n || 0) >= T.REPS)) {
        var first = !r.t;
        r.on = 1; r.t = Math.round(game.time); r.by = quiet ? (r.by || 0) : 1; // by: 1 = you taught it, 0 = instinct
        if (first && !quiet) {
          SB.Game.addSparks(game, T.PAY, c);
          game.stats.tricks = (game.stats.tricks || 0) + 1;
          if (SB.Social && SB.Social.log) SB.Social.log(game, c, d.icon, "the sky taught me to " + d.name);
        }
        if (!quiet) SB.bus.emit("trickLearned", { c: c, trick: d, first: first });
      } else if (r.on && m < Math.min(T.FORGET, q.g - 0.2)) {
        r.on = 0;
        if (!quiet) SB.bus.emit("trickForgot", { c: c, trick: d });
      }
    }
  };
  // at hatch: what it already does by instinct counts, without a reward (you didn't teach it)
  T.seed = function (c, game) { T.check(c, game, true); };

  // set the trick up beside the smol, so the next tickle or tap lands on the right thing
  T.practice = function (game, c, id) {
    var d = T.BY[id];
    if (!d || !d.practice || !c || !c.alive) return false;
    var p = d.practice;
    if (p.drop) {
      var a = (c.facing || 0) + (game.rng() - 0.5) * 0.8, x = c.x + Math.sin(a) * 0.9, z = c.z + Math.cos(a) * 0.9;
      var it = SB.World.walkable(game.world, x, z) ? SB.World.add(game.world, game, p.drop, x, z) : SB.World.add(game.world, game, p.drop, c.x + 0.5, c.z);
      c.lure = { id: it.id, t: game.time + 20 }; // it looks at the thing; what it does with it is up to its brain
      c.thinkT = Math.min(c.thinkT || 0, 0.3);
      if (c.action && !c.plan && (c.action.verb === SB.V.idle || c.action.verb === SB.V.wander)) c.action = null;
    } else if (p.say) SB.Creature.hear(c, p.say, game, { call: true });
    game.stats.practices = (game.stats.practices || 0) + 1;
    c.trickSession = { id: id, until: game.time + 30, from: T.shown(c, d) };
    return true;
  };
  // the trick it's being set up for, if the session is still on
  T.session = function (c, game) {
    var s = c && c.trickSession;
    if (!s) return null;
    if (game.time > s.until || !T.BY[s.id]) { c.trickSession = null; return null; }
    return s;
  };
  // is it doing the trick's verb right now (or did it just)?
  T.doing = function (c, game, d) {
    var v = SB.V[d.verb || d.avoid], a = c.action;
    if (a && a.verb === v && (a.phase === "do" || v === SB.V.approach)) return true;
    return !!(c.lastDone && c.lastDone.a === v && game.time - c.lastDone.t < 1.5);
  };
  // the hand asks before a lesson lands (creature.js tickle/tap). sign: +1 tickle, -1 tap. false = hold it back
  T.gate = function (c, game, sign) {
    var s = T.session(c, game);
    if (!s) return true;
    var d = T.BY[s.id], want = d.avoid ? -1 : 1;
    if (sign !== want) return true; // the other hand isn't part of this trick: it lands as usual
    if (T.doing(c, game, d)) { s.until = Math.max(s.until, game.time + 8); return true; }
    SB.bus.emit("trickWait", { c: c, trick: d });
    return false;
  };
  // after a lesson inside a session: how much the bar moved (the UI shows +n%). runs after the counting below
  T._delta = (function (e) {
    var g = SB.Game.current, c = e && e.c;
    if (!g || !c) return;
    var s = T.session(c, g);
    if (!s) return;
    var d = T.BY[s.id], p = T.shown(c, d);
    SB.bus.emit("trickDelta", { c: c, trick: d, from: s.last != null ? s.last : s.from, to: p });
    s.last = p;
  });

  // after any lesson (tickle, tap, "good"/"bad", a possessed choice), and every few seconds as brains
  // drift from living, look again
  var t = 0;
  T.tick = function (game, dt) {
    t -= dt;
    if (t > 0) return;
    t = 3;
    SB.Game.smols(game).forEach(function (c) { if (!c.tricks) T.seed(c, game); else if (!c.far) T.check(c, game); });
  };
  // a smol nobody has read yet (a founder, a stranger, an old save) starts from what it already does
  SB.bus.on("learned", function (d) {
    var g = SB.Game.current; if (!g || !d || !d.c) return;
    var c = d.c;
    if (!c.tricks) T.seed(c, g);
    // a lesson on the trick's own thing, the right way round (a tickle for doing it, a tap for doing what
    // it should leave alone), counts as one repetition of it
    for (var i = 0; i < T.LIST.length; i++) {
      var tr = T.LIST[i], r = c.tricks[tr.id];
      if (!r || r.on || d.verb !== SB.V[tr.verb || tr.avoid] || (d.noun >= 0 && d.noun !== SB.N[tr.noun])) continue;
      if (tr.avoid ? d.delta < 0 : d.delta > 0) r.n = (r.n || 0) + 1;
    }
    T.check(c, g);
    T._delta(d);
  });
  SB.bus.on("hatch", function (d) { var g = SB.Game.current; if (g && d && d.c) T.seed(d.c, g); });
})();
