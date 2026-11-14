// smol brains — the first day (4.23, "wake up"). The opening is played, not watched. The ark film ends and you
// wake as Pip, thrown clear of the crashed pod, in Pip's own eyes:
//   wake   you're starving after the long sleep: follow the marker to the berries and eat
//   pod    two more sleepers are still in the pod: walk back and knock on it until it opens
//   sticks the sun is getting low: walk over two sticks
//          carry them to the nest: a fire (it can be lit any time from here on)
//   dusk   the sun goes down (fast) and a grump's eyes show at the edge of the trees
//   chase  it comes for you. only light drives it off: be at the fire, or light it now
//   won    it runs. dawn (a short film), the first memory ember, and you rise to the sky: the island is yours
// One list on screen (possess.js OPEN_QUEST), one marker at a time, and "skip" ends it at once. If you let go of Pip
// (Esc) or load a save made part-way, a "step into Pip" button puts you back; left alone, Pip muddles through the
// daytime steps by itself. State lives in game.tutorial.night (saved with the tutorial).
// Before 4.23 the day was spent in the sky (nudge Pip to the berries, a free day, "lend your light" at dusk); an
// island saved in one of those steps is carried over to the matching new one.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var FN = SB.FirstNight = {};
  FN.STICKS = 2;
  FN.STICK_TIME = 80;  // seconds on the sticks step before the sun goes down anyway
  FN.SUNSET = 18;      // seconds of sunset once it starts
  FN.EYES_AT = 7;      // the grump's eyes show this long before dark
  FN.FALLBACK = 45;    // left alone (you let go of Pip), Pip does a daytime step by itself after this long
  FN.GRUMP_K = 0.9;    // the grump runs at 90% of your running speed
  FN.FIRE_SCARE = 9;   // a grump this close to the lit nest fire turns tail
  FN.BITES = 3;        // three bites and Pip is caught: the founders come running with fire (K-0058: the chase never ended)
  // where the sun is in each step (fraction of the day): the day moves when you do
  FN.TOD = { wake: 0.42, pod: 0.52, sticks0: 0.56, sticks1: 0.74, dusk: 0.84 };

  var ui = null; // the few things on screen: a hint, the sky timer, the step-into-Pip button
  function n(game) { return game && game.tutorial && game.tutorial.night; }
  FN.active = function (game) { var s = n(game); return !!s && !s.done; };
  FN.state = function (game) { return n(game); };
  // 4.22 opened the goals, quests and toasts during the old free day. The first day is all in Pip's body now, so
  // nothing is "free" until the night is done (kept for the callers)
  FN.free = function () { return false; };
  // a brand-new island, guided, not new game+: it gets the first day
  FN.wants = function (game) {
    var st = game && game.tutorial;
    if (!st || st.done || st.night || game.ngPlus) return false;
    if (game.settings && game.settings.guide === false) return false;
    return (game.playTime || 0) < 120;
  };
  function W() { return SB.World; }
  function byId(game, id) { return id == null ? null : SB.Game.byId(game, id); }
  FN.pip = function (game) { var s = n(game); return s ? byId(game, s.pip) : null; };
  FN.grump = function (game) { var s = n(game); return s ? byId(game, s.grump) : null; };
  FN.pod = function (game) { var its = game.world.items; for (var i = 0; i < its.length; i++) if (its[i].kind === "egg" && its[i].data && its[i].data.pod && !its[i].gone) return its[i]; return null; };
  function inBody(game) { var P = SB.Possess, s = n(game); return !!(P && P.active && s && P.c && P.c.id === s.pip); }
  FN.inBody = inBody;

  FN.start = function (game) {
    var st = game.tutorial;
    var nest = game.world.T.nest, w = game.world, x = nest.x + 3, z = nest.z + 1.5;
    for (var a = 0; a < 12 && !W().walkable(w, x, z); a++) { x = nest.x + Math.cos(a) * 3; z = nest.z + Math.sin(a) * 3; }
    var pip = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(game.rng, 0), name: "Pip", x: x, z: z, age: 260, how: "story" });
    pip.pip = true; pip.asleep = false; pip.chem.hunger = 0.8;
    st.night = { v: 2, s: "wake", t: 0, pip: pip.id, grump: null, sticks: 0, stickIds: [], lit: null, bush: null };
    // nothing else happens today: no incidents, strangers or second pods
    var later = game.time + SB.DAY_LENGTH;
    if (game.dir) game.dir.nextT = Math.max(game.dir.nextT || 0, later);
    game.strangerT = Math.max(game.strangerT || 0, later);
    game.podT = Math.max(game.podT || 0, later);
    SB.bus.emit("firstNight", { step: "wake" });
    return pip;
  };
  // into Pip's eyes (the opening calls this as the ark film ends; the button calls it after you let go)
  FN.begin = function (game) {
    var s = n(game), pip = FN.pip(game), P = SB.Possess;
    if (!s || s.done || !pip || !pip.alive || !P || inBody(game)) return false;
    if (P.active) P.leave();
    var g = FN.grump(game);
    if (s.s === "lurk" || s.s === "chase") pip.chem.hunger = Math.min(pip.chem.hunger, 0.3);
    return !!P.enter(game, pip, { free: true, firstNight: true, face: g ? { x: g.x, z: g.z } : null });
  };
  FN.lend = function (game) { return FN.begin(game); }; // the old name
  function go(game, step) { var s = n(game); s.s = step; s.t = 0; SB.bus.emit("firstNight", { step: step }); show(game); if (SB.Possess && SB.Possess.questPoke) SB.Possess.questPoke(); }

  // an island saved in the old sky-view opening
  function migrate(game, s) {
    if (s.v === 2) return;
    s.v = 2;
    var map = { pod: "pod", hungry: "wake", fed: "sticks", sunset: "dusk" };
    if (map[s.s]) s.s = map[s.s];
    if (s.s === "sticks" && !s.stickIds.length) { var p = FN.pip(game); if (p) sticks(game, p); }
    s.t = 0;
  }
  function tod(game) { return game.time / SB.DAY_LENGTH - Math.floor(game.time / SB.DAY_LENGTH); }
  function setTod(game, f) { var day = Math.floor(game.time / SB.DAY_LENGTH); game.time = (day + f) * SB.DAY_LENGTH; game.world.time = game.time; }
  function clampTod(game, lo, hi) { var f = tod(game); if (f < lo) setTod(game, lo); else if (f > hi) setTod(game, hi); }

  FN.tick = function (game, dt) {
    var s = n(game);
    if (!s || s.done || game.offline) return;
    migrate(game, s);
    s.t += dt;
    FN.frame(game);
    var pip = FN.pip(game), w = game.world, P = SB.Possess, me = inBody(game);
    if (!pip || !pip.alive) { finish(game); return; } // (never in the script; a sandbox might do it)
    if ((s.pokeT = (s.pokeT || 0) - dt) <= 0) { s.pokeT = 0.3; if (me && P.questPoke) P.questPoke(); }
    if (s.s === "wake") {
      clampTod(game, 0, FN.TOD.wake);
      if (pip.chem.hunger < 0.7) pip.chem.hunger = 0.8; // Pip is starving until it eats
      var b = bush(game, pip);
      if (b && (s.pulseT = (s.pulseT || 0) - dt) <= 0) { s.pulseT = 1.2; if (SB.FX) SB.FX.burst("sparkle", b.x, W().groundY(w, b.x, b.z) + 0.9, b.z, 6); }
      if (!me && s.t > FN.FALLBACK && b && !s.fallback) { s.fallback = true; SB.Creature.sendTo(pip, b.x, b.z, game, 20); } // it finds them itself in the end
    } else if (s.s === "pod") {
      clampTod(game, FN.TOD.wake, FN.TOD.pod);
      var pod = FN.pod(game);
      if (!pod || SB.Game.smols(game).length >= 3) { sticks(game, pip); go(game, "sticks"); return; } // the founders are out
      if ((s.podT = (s.podT || 0) - dt) <= 0) { s.podT = 1.4; if (SB.FX) SB.FX.burst("sparkle", pod.x, W().groundY(w, pod.x, pod.z) + 0.8, pod.z, 5); }
      if (!me && s.t > FN.FALLBACK) SB.Game.hatch(game, pod); // they climb out by themselves in the end
    } else if (s.s === "sticks") {
      setTod(game, FN.TOD.sticks0 + (FN.TOD.sticks1 - FN.TOD.sticks0) * Math.min(1, s.t / FN.STICK_TIME));
      gather(game, pip, me);
      if (s.lit || s.t > FN.STICK_TIME) { s.tod0 = tod(game); go(game, "dusk"); }
    } else if (s.s === "dusk") {
      setTod(game, (s.tod0 || FN.TOD.sticks1) + (FN.TOD.dusk - (s.tod0 || FN.TOD.sticks1)) * Math.min(1, s.t / FN.SUNSET)); // the sun goes down fast
      gather(game, pip, me);
      if (s.t >= FN.SUNSET - FN.EYES_AT && !FN.grump(game)) eyes(game, pip);
      if (s.t >= FN.SUNSET) {
        if (!FN.grump(game)) eyes(game, pip);
        pip.chem.hunger = Math.min(pip.chem.hunger, 0.3); // Pip ate today: the night isn't about food
        if (me) { go(game, "chase"); if (P.adoptScout) P.adoptScout(FN.grump(game)); } else go(game, "lurk");
      }
    } else if (s.s === "lurk") {
      freeze(pip, true);
      var g = FN.grump(game);
      if (g && g.alive && (!g.scout || g.scout.done)) { g.scout = { who: pip.id, t: 0, hitT: 0, hold: true, speedK: FN.GRUMP_K, night: true }; g.goingHome = false; g.chem.fear = 0; } // letting go ended its hunt: it goes back to watching
      if (g && (s.growlT = (s.growlT || 0) - dt) <= 0) { s.growlT = 7; if (SB.Audio && SB.Audio.play && !game.headless) SB.Audio.play("grump", { vol: 0.7 }); }
    } else if (s.s === "chase") {
      if (P && !me && s.t > 1) { var lg = FN.grump(game); if (lg && lg.scout) { lg.scout.hold = true; lg.scout.wind = 0; } go(game, "lurk"); return; } // loaded mid-chase, or you let go: it waits for you again
      if (!me) return;
      var gr = FN.grump(game);
      gather(game, pip, true);
      if (s.lit) {
        P.setGoal(null);
        if ((!gr || !gr.alive || P.scout && !P.scout()) && s.t > 2) { go(game, "won"); return; } // nothing left to chase you: the fire is lit, the night is won
        var f = byId(game, s.lit);
        if (gr && gr.alive && f && SB.dist(gr.x, gr.z, f.x, f.z) < FN.FIRE_SCARE) gr.chem.fear = 1; // possess.js ends the chase: "the light scared it off!"
      }
    } else if (s.s === "dawn") {
      if (s.t > 2 && !(SB.Lantern && (SB.Lantern.running || SB.Lantern.waiting))) finish(game); // loaded mid-dawn: the film is gone, the morning still comes
    } else if (s.s === "won") {
      if (s.t > 3 && !s.leaving) { s.leaving = true; if (SB.Possess && SB.Possess.active) SB.Possess.leave(); dawn(game); }
    }
  };
  // sticks: walk over them (your light lends Pip hands it doesn't have yet); two at the nest make the fire
  function gather(game, pip, me) {
    var s = n(game), w = game.world, nest = w.T.nest, P = SB.Possess;
    if (s.lit) return;
    if (me) s.stickIds.forEach(function (id) {
      var it = byId(game, id);
      if (!it || it.gone || s.sticks >= FN.STICKS) return;
      if (SB.dist(it.x, it.z, pip.x, pip.z) < 1.4) { W().remove(w, it); s.sticks++; if (SB.PovHud && SB.PovHud.gain) SB.PovHud.gain("stick", 1); if (SB.Audio && SB.Audio.play) SB.Audio.play("pop", { vol: 0.6 }); if (P.questPoke) P.questPoke(); }
    });
    if (me && s.sticks >= FN.STICKS && SB.dist(pip.x, pip.z, nest.x, nest.z) < 2.8) { light(game, pip); if (P.setGoal) P.setGoal(null); if (P.questPoke) P.questPoke(); return; }
    if (me && P.setGoal) P.setGoal(s.sticks < FN.STICKS ? nearestStick(game, pip) : { x: nest.x, z: nest.z, y: W().groundY(w, nest.x, nest.z) + 1, label: "🔥 light the nest" });
  }
  function bush(game, pip) {
    var s = n(game), b = s.bush != null ? W().nearestNode(game.world, s.bush.x, s.bush.z, 0.5, function () { return true; }) : null;
    if (b && b.state === "ok") return b;
    b = W().nearestNode(game.world, pip.x, pip.z, 45, function (o) { return o.state === "ok" && (o.kind === "bush" || o.kind === "roots" || o.kind === "gourds"); });
    s.bush = b ? { x: b.x, z: b.z } : null;
    return b;
  }
  FN.bush = function (game) { var p = FN.pip(game); return p ? bush(game, p) : null; };
  function freeze(pip, scared) {
    if (!scared) return;
    pip.action = null; pip.plan = null; pip.asleep = false;
    pip.chem.fear = Math.max(pip.chem.fear || 0, 0.85);
    if (Math.random() < 0.01) pip.speech = { text: "eep…", t: 1.6, kind: "say" };
  }
  // eyes at the edge of the trees: a grump, out past Pip on the far side from the nest, waiting
  function eyes(game, pip) {
    var s = n(game), w = game.world, nest = w.T.nest, away = Math.atan2(pip.x - nest.x, pip.z - nest.z), spot = null;
    if (SB.dist(pip.x, pip.z, nest.x, nest.z) < 2) away = Math.random() * 6.283; // Pip is at the nest: any side
    for (var a = 0; a < 20 && !spot; a++) {
      var ang = away + (a % 2 ? 1 : -1) * Math.floor(a / 2) * 0.25, r = 17 + (a % 3) * 2, x = pip.x + Math.sin(ang) * r, z = pip.z + Math.cos(ang) * r;
      if (W().walkable(w, x, z) && W().depthAt(w, x, z) < 0.05) spot = { x: x, z: z };
    }
    if (!spot) spot = { x: pip.x + 15, z: pip.z };
    var g = SB.Game.spawnGrump(game, spot.x, spot.z);
    g.name = "a hungry grump";
    g.scout = { who: pip.id, t: 0, hitT: 0, hold: true, speedK: FN.GRUMP_K, night: true }; // its speed follows yours (creature.js)
    s.grump = g.id;
    if (SB.Audio && SB.Audio.play && !game.headless) SB.Audio.play("grump", { vol: 0.9 });
    pip.speech = { text: "!!", t: 2, kind: "say" };
    if (inBody(game) && SB.PovHud && SB.PovHud.beat) SB.PovHud.beat("👀 something is out there", s.lit ? "stay by the fire" : "get the fire lit!", true);
    SB.bus.emit("firstNightEyes", { g: g, pip: pip });
  }
  function sticks(game, pip) {
    var s = n(game), w = game.world, nest = w.T.nest, ids = [];
    var near = SB.dist(pip.x, pip.z, nest.x, nest.z) < 5; // Pip is at the nest already: lay them out to one side instead of on a line of no length
    var ox = near ? nest.x + 9 : pip.x, oz = near ? nest.z + 4 : pip.z;
    [0.3, 0.55, 0.78].forEach(function (k, i) {
      var x = ox + (nest.x - ox) * k + (i % 2 ? 1.6 : -1.6), z = oz + (nest.z - oz) * k + (i % 2 ? -1 : 1);
      if (!W().walkable(w, x, z)) { x = ox + (nest.x - ox) * k; z = oz + (nest.z - oz) * k; }
      if (!W().walkable(w, x, z)) { x = nest.x + 2 + i; z = nest.z + 2; }
      var it = W().add(w, game, "stick", x, z, { night: true });
      if (it) ids.push(it.id);
    });
    s.stickIds = ids;
  }
  function nearestStick(game, pip) {
    var s = n(game), best = null, bd = 1e9;
    s.stickIds.forEach(function (id) { var it = byId(game, id); if (!it || it.gone) return; var d = SB.dist(it.x, it.z, pip.x, pip.z); if (d < bd) { bd = d; best = it; } });
    return best ? { x: best.x, z: best.z, y: (best.y || W().groundY(game.world, best.x, best.z)) + 0.6, label: "🪵 stick " + Math.min(s.sticks + 1, FN.STICKS) + "/" + FN.STICKS, small: true } : null; // a small marker: the nest's is the big one (K-0058)
  }
  function light(game, pip, quiet) {
    var s = n(game), w = game.world, nest = w.T.nest;
    var st = W().addStructure(w, game, "campfire", nest.x + 1.4, nest.z + 0.4, { done: true, data: { fuel: 1 } });
    s.lit = st.id; s.sticks -= FN.STICKS;
    if (SB.FX) SB.FX.burst("sparkle", st.x, W().groundY(w, st.x, st.z) + 0.8, st.z, 30);
    if (quiet) return; // the founders lit it: Pip was caught
    if (SB.Audio && SB.Audio.play && !game.headless) SB.Audio.play("achievement", { vol: 0.8 });
    if (s.s === "chase" && SB.PovHud && SB.PovHud.beat) SB.PovHud.beat("🔥 light!", "grumps hate light: lead it here", true); // (by day the list's own banner says it)
    SB.bus.emit("firstNightFire", { st: st });
  }
  function dawn(game) {
    go(game, "dawn");
    if (SB.Lantern && SB.Lantern.play && typeof document !== "undefined" && !game.headless && !(SB.Possess && SB.Possess.headless)) SB.Lantern.play({ scene: "dawn", noGate: true, done: function () { finish(game); } });
    else finish(game);
  }
  function finish(game) {
    var s = n(game);
    if (!s || s.done) return;
    var day = Math.floor(game.time / SB.DAY_LENGTH);
    if (s.s === "dawn") { var f = game.time / SB.DAY_LENGTH - day; game.time = (day + (f < 0.21 ? 0 : 1)) * SB.DAY_LENGTH + 0.21 * SB.DAY_LENGTH; game.world.time = game.time; } // the rest of the night passes (a chase that ran past midnight wakes the same morning, not a day later)
    var g = FN.grump(game); if (g && g.alive) { if (g.scout) g.scout.done = true; g.goingHome = true; }
    var pip = FN.pip(game);
    if (pip && pip.alive) { pip.chem.fear = 0; pip.chem.hunger = Math.min(pip.chem.hunger, 0.35); pip.speech = { text: "morning!", t: 2.5, kind: "say" }; }
    s.done = true; s.s = "done"; s.ember = 1; // the first memory ember
    if (SB.Embers) SB.Embers.add(game, "night1", pip && pip.alive ? "Pip remembered fire" : "the smols remembered fire", pip);
    if (game.dir) game.dir.nextT = Math.min(game.dir.nextT || 0, game.time + 240);
    game.podT = Math.min(game.podT || 1e9, game.time + 600);
    if (SB.Game.note) SB.Game.note(game, (pip && pip.alive ? "🏮 Pip remembers fire." : "🏮 the smols remember fire.") + " the first memory is back in the Lantern.");
    SB.bus.emit("firstNight", { step: "done" });
    SB.bus.emit("lantern", { stage: 0, ember: 1 });
    show(game);
    if (SB.UI && SB.UI.afterNight) SB.UI.afterNight();
  }
  // "skip": the whole first day, at once. The pod opens, the fire is lit, it's morning
  FN.skip = function (game) {
    var s = n(game), pip = FN.pip(game);
    if (!s || s.done) return false;
    var pod = FN.pod(game); if (pod) SB.Game.hatch(game, pod);
    if (!s.lit && pip) { s.sticks = FN.STICKS; light(game, pip, true); }
    s.stickIds.forEach(function (id) { var it = byId(game, id); if (it && !it.gone) W().remove(game.world, it); });
    var g = FN.grump(game); if (g && g.alive) { g.alive = false; g.gone = true; }
    if (SB.Possess && SB.Possess.active) SB.Possess.leave();
    if (tod(game) < 0.5) setTod(game, 0.9);
    s.s = "dawn"; // so the night passes
    finish(game);
    return true;
  };

  // the bus: Pip eating, the chase ending, letting go
  var hooked = false;
  FN.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function ate(d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || s.s !== "wake" || !d || !d.c || d.c.id !== s.pip) return;
      d.c.chem.hunger = Math.min(d.c.chem.hunger, 0.4);
      go(game, "pod");
      if (inBody(game) && SB.PovHud && SB.PovHud.beat) SB.PovHud.beat("😋 better", "now wake the others: back to the pod", true);
    }
    SB.bus.on("eat", ate); SB.bus.on("nibble", ate); SB.bus.on("povEat", ate);
    SB.bus.on("hatch", function (d) { // the founders climb out hungry, and copy Pip: smols learn from each other
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || !d || !d.c || !d.c.founder) return;
      var pip = FN.pip(game), b = pip ? bush(game, pip) : null;
      SB.Game.smols(game).forEach(function (o) {
        if (o.id === s.pip || !o.alive) return;
        o.chem.hunger = Math.max(o.chem.hunger, 0.6);
        if (b) SB.Creature.sendTo(o, b.x, b.z, game, 15);
        o.speech = { text: "pip!", t: 2, kind: "say" };
      });
    });
    SB.bus.on("possess", function (d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || !d || !d.c || d.c.id !== s.pip) return;
      if (s.s !== "lurk") return;
      var g = FN.grump(game);
      if (!g || !g.alive) { s.grump = null; eyes(game, d.c); g = FN.grump(game); } // the grump wandered off while you were away: another finds Pip
      if (!s.lit && !s.stickIds.some(function (id) { var it = byId(game, id); return it && !it.gone; })) sticks(game, d.c);
      go(game, "chase");
      if (g && SB.Possess.adoptScout) SB.Possess.adoptScout(g);
    });
    SB.bus.on("unpossess", function (d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || !d || !d.c || d.c.id !== s.pip) return;
      if (s.s === "chase") { var g = FN.grump(game); if (g && g.scout) { g.scout.hold = true; g.scout.wind = 0; } go(game, "lurk"); } // you let go: it waits for your light again
      else show(game);
    });
    SB.bus.on("scoutHit", function (d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || s.s !== "chase" || !d || !d.c || d.c.id !== s.pip || !d.g || !d.g.scout) return;
      if ((d.g.scout.hits || 0) >= FN.BITES && SB.Possess && SB.Possess.endScout) SB.Possess.endScout("👹 it caught Pip! the others came running with fire and drove it off", 0, "caught");
    });
    SB.bus.on("scoutEnd", function (d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || s.s !== "chase" || !d || !(d.ok || d.why === "caught")) return;
      if (d.why === "caught") { var pip = FN.pip(game); if (!s.lit && pip) { s.sticks = FN.STICKS; light(game, pip, true); } if (pip) SB.Chem.apply(pip.chem, { pain: 0.3 }); }
      go(game, "won");
    });
  };
  FN.hook();

  // on screen while you're not in Pip's body: one line saying where things stand, and the way back in
  var HINTS = {
    wake: "Pip is awake, and starving",
    pod: "two sleepers are still in the pod",
    sticks: "the sun is getting low: Pip needs a fire",
    dusk: "the sun is going down",
    lurk: "something is watching Pip from the dark"
  };
  function show(game) {
    if (typeof document === "undefined" || !document.getElementById) return;
    var root = document.getElementById("ui"); if (!root) return;
    if (!ui) {
      ui = { hint: document.createElement("div"), timer: document.createElement("div"), lend: document.createElement("button") };
      ui.hint.className = "fnhint glass"; ui.timer.className = "fntimer glass"; ui.lend.className = "lendbtn";
      ui.lend.innerHTML = "🕯 step into Pip<small>see through Pip's eyes</small>";
      ui.lend.onclick = function (e) {
        e.stopPropagation();
        var g = SB.Game.current; if (!g) return;
        FN.begin(g); show(g);
      };
      root.appendChild(ui.hint); root.appendChild(ui.timer); root.appendChild(ui.lend);
    }
    var s = n(game), step = s && !s.done ? s.s : "done", me = inBody(game);
    var film = !!(SB.Lantern && SB.Lantern.running) || !!(SB.Intro && SB.Intro.covering);
    var h = !me && !film ? HINTS[step] : null;
    ui.hint.textContent = h || ""; ui.hint.classList.toggle("on", !!h);
    ui.timer.classList.toggle("on", !me && (step === "sticks" || step === "dusk"));
    ui.lend.classList.toggle("on", !me && !film && !!HINTS[step]);
  }
  FN.ui = function () { return ui; };
  FN.refresh = function (game) { show(game); };
  // every frame: keep the button honest (a film ended, you let go) and the timer counting
  FN.frame = function (game) {
    var s = n(game);
    if (!ui && s && !s.done) show(game); // an island loaded part-way gets its button back
    if (!ui || !s || s.done) return;
    var me = inBody(game), want = !me && !!HINTS[s.s] && !(SB.Lantern && SB.Lantern.running) && !(SB.Intro && SB.Intro.covering);
    if (ui.lend.classList.contains("on") !== want) show(game);
    if (s.s === "sticks" || s.s === "dusk") {
      var left = Math.max(0, Math.ceil(FN.left(game) / Math.max(0.1, (game.speed || 1) * (SB.Game.pace ? SB.Game.pace(game) : 1)))), mm = Math.floor(left / 60), ss = left % 60, txt = "🌙 night falls in " + mm + ":" + (ss < 10 ? "0" : "") + ss;
      if (ui.timer.textContent !== txt) ui.timer.textContent = txt;
    }
  };
  // seconds until dark
  FN.left = function (game) { var s = n(game); return !s || s.done ? 0 : s.s === "sticks" ? FN.STICK_TIME - s.t + FN.SUNSET : s.s === "dusk" ? FN.SUNSET - s.t : 0; };
})();
