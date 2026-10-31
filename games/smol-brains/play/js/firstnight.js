// smol brains — the first night (K-0041 P2, "The Last Lantern"). The tutorial is the story: no windows, only what
// you can see and hear on the island, and a two-word hint at a time.
//   pod     the founders' pod (the one that knocked the Lantern down) opens. Pip, who made the wish, is there too.
//   hungry  Pip is hungry and dimming. a berry bush pulses: nudge Pip to it (grab and carry). the founders copy Pip.
//   sunset  the sun goes down on a timer you can see. grump eyes at the edge of the trees, a growl. Pip freezes.
//   lurk    one glowing button: "lend your light".
//   chase   you're Pip, facing the grump, the nest glowing behind. it comes (90% of your running speed, a 1.5 s
//           wind-up, then a pounce). grab two sticks on the way home and light the nest: light scares it off.
//   dawn    a short film: the first memory ember flies to the Lantern. then the island is yours.
// state lives in game.tutorial.night (saved with the tutorial). an island reloaded mid-night just carries on.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var FN = SB.FirstNight = {};
  FN.SUNSET = 40;      // real seconds of visible sunset
  FN.DAY1 = 160;       // real seconds of free day after Pip eats, before the sunset starts (K-0057: night came a minute after the tutorial)
  FN.EYES_AT = 14;     // the grump's eyes show this long before dark
  FN.FALLBACK = 90;    // Pip finds the berries alone after this long
  FN.GRUMP_K = 0.9;    // the grump runs at 90% of your running speed
  FN.STICKS = 2;
  FN.FIRE_SCARE = 9;   // a grump this close to the lit nest fire turns tail

  var ui = null; // the few things on screen: a hint, the sky timer, the lend-your-light button
  function n(game) { return game && game.tutorial && game.tutorial.night; }
  FN.active = function (game) { var s = n(game); return !!s && !s.done; };
  FN.state = function (game) { return n(game); };
  // a brand-new island, guided, not new game+: it gets the first night
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

  FN.start = function (game) {
    var st = game.tutorial;
    var nest = game.world.T.nest, w = game.world, x = nest.x + 3, z = nest.z + 1.5;
    for (var a = 0; a < 12 && !W().walkable(w, x, z); a++) { x = nest.x + Math.cos(a) * 3; z = nest.z + Math.sin(a) * 3; }
    var pip = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(game.rng, 0), name: "Pip", x: x, z: z, age: 260, how: "story" });
    pip.pip = true; pip.asleep = false; pip.chem.hunger = 0.8;
    st.night = { s: "pod", t: 0, pip: pip.id, grump: null, sticks: 0, stickIds: [], lit: null, bush: null };
    // nothing else happens tonight: no incidents, strangers or second pods
    var later = game.time + SB.DAY_LENGTH;
    if (game.dir) game.dir.nextT = Math.max(game.dir.nextT || 0, later);
    game.strangerT = Math.max(game.strangerT || 0, later);
    game.podT = Math.max(game.podT || 0, later);
    SB.bus.emit("firstNight", { step: "pod" });
    return pip;
  };
  function go(game, step) { var s = n(game); s.s = step; s.t = 0; SB.bus.emit("firstNight", { step: step }); show(game); }

  FN.tick = function (game, dt) {
    var s = n(game);
    if (!s || s.done || game.offline) return;
    s.t += dt;
    FN.frame(game);
    var pip = FN.pip(game), w = game.world;
    if (!pip || !pip.alive) { finish(game); return; } // (never in the script; a sandbox might do it)
    if (s.s === "pod") {
      if (SB.Game.smols(game).length >= 3) go(game, "hungry"); // the founders are out
    } else if (s.s === "hungry") {
      if (pip.chem.hunger < 0.7) pip.chem.hunger = 0.8; // Pip doesn't eat on its own yet: you nudge it
      var b = bush(game, pip);
      if (b && (s.pulseT = (s.pulseT || 0) - dt) <= 0) { s.pulseT = 1.2; if (SB.FX) SB.FX.burst("sparkle", b.x, W().groundY(w, b.x, b.z) + 0.9, b.z, 6); }
      if (s.t > FN.FALLBACK && b && !s.fallback) { s.fallback = true; SB.Creature.sendTo(pip, b.x, b.z, game, 20); } // it finds them itself in the end
    } else if (s.s === "fed") {
      // the day waits for the sunset, even sped up: the sun stays up until the script brings the dark
      var late = Math.floor(game.time / SB.DAY_LENGTH) * SB.DAY_LENGTH + 0.72 * SB.DAY_LENGTH;
      if (game.time > late) { game.time = late; game.world.time = game.time; }
      if (s.t > FN.DAY1) { s.sunEnd = game.time; go(game, "sunset"); }
    } else if (s.s === "sunset") {
      var dusk = Math.floor(game.time / SB.DAY_LENGTH) * SB.DAY_LENGTH + 0.83 * SB.DAY_LENGTH, left = FN.SUNSET - s.t;
      if (game.time < dusk) game.time = Math.min(dusk, game.time + Math.max(0, (dusk - game.time) / Math.max(0.5, left) - 1) * dt); // the sun goes down fast
      if (left <= FN.EYES_AT && !s.grump) eyes(game, pip);
      if (left <= 0 || game.time >= dusk) { if (!s.grump) eyes(game, pip); go(game, "lurk"); }
      freeze(pip, s.grump != null);
    } else if (s.s === "lurk") {
      freeze(pip, true);
      var g = FN.grump(game);
      if (g && (s.growlT = (s.growlT || 0) - dt) <= 0) { s.growlT = 7; if (SB.Audio && SB.Audio.play && !game.headless) SB.Audio.play("grump", { vol: 0.7 }); }
    } else if (s.s === "chase") {
      var P = SB.Possess;
      if (!P || !P.active || P.c !== pip) return;
      var gr = FN.grump(game), nest = w.T.nest;
      // sticks: walk over them (light lends Pip hands it doesn't have yet)
      s.stickIds.forEach(function (id) {
        var it = byId(game, id);
        if (!it || it.gone || s.sticks >= FN.STICKS + 1) return;
        if (SB.dist(it.x, it.z, pip.x, pip.z) < 1.4) { W().remove(w, it); s.sticks++; if (SB.PovHud && SB.PovHud.gain) SB.PovHud.gain("stick", 1); if (SB.Audio && SB.Audio.play) SB.Audio.play("pop", { vol: 0.6 }); }
      });
      if (!s.lit) {
        if (s.sticks >= FN.STICKS && SB.dist(pip.x, pip.z, nest.x, nest.z) < 2.8) light(game, pip);
        else P.setGoal(s.sticks < FN.STICKS ? nearestStick(game, pip) : { x: nest.x, z: nest.z, y: W().groundY(w, nest.x, nest.z) + 1, label: "🔥 light the nest" });
      } else {
        P.setGoal(null);
        var f = byId(game, s.lit);
        if (gr && gr.alive && f && SB.dist(gr.x, gr.z, f.x, f.z) < FN.FIRE_SCARE) gr.chem.fear = 1; // possess.js ends the chase: "the light scared it off!"
      }
    } else if (s.s === "won") {
      if (s.t > 3 && !s.leaving) { s.leaving = true; if (SB.Possess && SB.Possess.active) SB.Possess.leave(); dawn(game); }
    }
  };
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
    SB.bus.emit("firstNightEyes", { g: g, pip: pip });
  }
  FN.lend = function (game) {
    var s = n(game), pip = FN.pip(game), g = FN.grump(game);
    if (!s || s.s !== "lurk" || !pip || !SB.Possess) return false;
    pip.chem.hunger = Math.min(pip.chem.hunger, 0.08); // Pip ate at the bush: the chase starts nearly full (K-0051)
    return SB.Possess.enter(game, pip, { free: true, firstNight: true, face: g ? { x: g.x, z: g.z } : null });
  };
  function sticks(game, pip) {
    var s = n(game), w = game.world, nest = w.T.nest, ids = [];
    [0.3, 0.55, 0.78].forEach(function (k, i) {
      var x = pip.x + (nest.x - pip.x) * k + (i % 2 ? 1.6 : -1.6), z = pip.z + (nest.z - pip.z) * k + (i % 2 ? -1 : 1);
      if (!W().walkable(w, x, z)) { x = pip.x + (nest.x - pip.x) * k; z = pip.z + (nest.z - pip.z) * k; }
      var it = W().add(w, game, "stick", x, z, { night: true });
      if (it) ids.push(it.id);
    });
    s.stickIds = ids;
  }
  function nearestStick(game, pip) {
    var s = n(game), best = null, bd = 1e9;
    s.stickIds.forEach(function (id) { var it = byId(game, id); if (!it || it.gone) return; var d = SB.dist(it.x, it.z, pip.x, pip.z); if (d < bd) { bd = d; best = it; } });
    return best ? { x: best.x, z: best.z, y: (best.y || W().groundY(game.world, best.x, best.z)) + 0.6, label: "🪵 grab sticks" } : null;
  }
  function light(game, pip) {
    var s = n(game), w = game.world, nest = w.T.nest;
    var st = W().addStructure(w, game, "campfire", nest.x + 1.4, nest.z + 0.4, { done: true, data: { fuel: 1 } });
    s.lit = st.id; s.sticks -= FN.STICKS;
    if (SB.FX) SB.FX.burst("sparkle", st.x, W().groundY(w, st.x, st.z) + 0.8, st.z, 30);
    if (SB.Audio && SB.Audio.play && !game.headless) SB.Audio.play("achievement", { vol: 0.8 });
    if (SB.PovHud && SB.PovHud.beat) SB.PovHud.beat("🔥 light!", "grumps hate light: lead it here", true);
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
    if (s.s === "dawn") { game.time = (day + 1) * SB.DAY_LENGTH + 0.21 * SB.DAY_LENGTH; game.world.time = game.time; } // the rest of the night passes
    var g = FN.grump(game); if (g && g.alive) { if (g.scout) g.scout.done = true; g.goingHome = true; }
    var pip = FN.pip(game);
    if (pip && pip.alive) { pip.chem.fear = 0; pip.chem.hunger = Math.min(pip.chem.hunger, 0.35); pip.speech = { text: "lumi!", t: 2.5, kind: "say" }; }
    s.done = true; s.s = "done"; s.ember = 1; // the first memory ember
    if (SB.Embers) SB.Embers.add(game, "night1", "Pip remembered fire", pip);
    if (game.dir) game.dir.nextT = Math.min(game.dir.nextT || 0, game.time + 240);
    game.podT = Math.min(game.podT || 1e9, game.time + 600);
    if (SB.Game.note) SB.Game.note(game, "🏮 Pip remembers fire. the first memory ember flew to the Lantern.");
    SB.bus.emit("firstNight", { step: "done" });
    SB.bus.emit("lantern", { stage: 0, ember: 1 });
    show(game);
    if (SB.UI && SB.UI.afterNight) SB.UI.afterNight();
  }

  // the bus: Pip eating, possession, the chase ending
  var hooked = false;
  FN.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function ate(d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || s.s !== "hungry" || !d || !d.c || d.c.id !== s.pip) return;
      SB.Game.smols(game).forEach(function (o) { // the others copy Pip: smols learn from each other
        if (o.id === s.pip || !o.alive) return;
        o.chem.hunger = Math.max(o.chem.hunger, 0.6);
        var b = bush(game, d.c); if (b) SB.Creature.sendTo(o, b.x, b.z, game, 15);
        o.speech = { text: "pip-a!", t: 2, kind: "say" };
      });
      d.c.chem.hunger = Math.min(d.c.chem.hunger, 0.4);
      go(game, "fed");
    }
    SB.bus.on("eat", ate); SB.bus.on("nibble", ate);
    SB.bus.on("possess", function (d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || !d || !d.c || d.c.id !== s.pip || s.s !== "lurk") return;
      var g = FN.grump(game);
      sticks(game, d.c);
      go(game, "chase");
      if (g && SB.Possess.adoptScout) SB.Possess.adoptScout(g);
    });
    SB.bus.on("unpossess", function (d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || s.s !== "chase" || !d || !d.c || d.c.id !== s.pip) return;
      var g = FN.grump(game); if (g && g.scout) { g.scout.hold = true; g.scout.wind = 0; } // you let go: it waits for your light again
      go(game, "lurk");
    });
    SB.bus.on("scoutEnd", function (d) {
      var game = SB.Game.current, s = n(game);
      if (!s || s.done || s.s !== "chase" || !d || !d.ok) return;
      go(game, "won");
    });
  };
  FN.hook();

  // on screen: one hint at a time, the sky timer, the button
  var HINTS = { pod: null, hungry: "🫳 nudge Pip", fed: null, sunset: null, lurk: null, chase: null, won: null, dawn: null, done: null };
  function show(game) {
    if (typeof document === "undefined" || !document.getElementById) return;
    var root = document.getElementById("ui"); if (!root) return;
    if (!ui) {
      ui = { hint: document.createElement("div"), timer: document.createElement("div"), lend: document.createElement("button") };
      ui.hint.className = "fnhint glass"; ui.timer.className = "fntimer glass"; ui.lend.className = "lendbtn";
      ui.lend.innerHTML = "🕯 lend your light<small>possess Pip</small>";
      ui.lend.onclick = function (e) {
        e.stopPropagation();
        var g = SB.Game.current; if (!g || ui.lend.dataset.busy) return;
        ui.lend.dataset.busy = "1"; ui.lend.classList.remove("on");
        var go = function () { delete ui.lend.dataset.busy; FN.lend(g); show(g); };
        if (SB.Lantern && SB.Lantern.SCENES && !(g.lantern && g.lantern.films && g.lantern.films.lend)) { (g.lantern = g.lantern || { embers: 0, stage: 0, got: {}, log: [] }).films = g.lantern.films || {}; g.lantern.films.lend = 1; SB.Lantern.play({ scene: "lend", noGate: true, done: go }); }
        else go();
      };
      root.appendChild(ui.hint); root.appendChild(ui.timer); root.appendChild(ui.lend);
    }
    var s = n(game), step = s && !s.done ? s.s : "done";
    var h = HINTS[step];
    if (step === "hungry") { var p = FN.pip(game); h = "🫳 nudge Pip <span>(grab Pip, carry to the ✨ berries)</span>"; void p; }
    ui.hint.innerHTML = h || ""; ui.hint.classList.toggle("on", !!h);
    ui.timer.classList.toggle("on", step === "sunset");
    ui.lend.classList.toggle("on", step === "lurk" && !ui.lend.dataset.busy);
  }
  FN.ui = function () { return ui; };
  // the timer counts down every frame
  FN.frame = function (game) {
    var s = n(game);
    if (!ui || !s || s.done) return;
    if (s.s === "sunset") { var left = Math.max(0, Math.ceil(FN.SUNSET - s.t)); ui.timer.textContent = "🌙 night falls in 0:" + (left < 10 ? "0" : "") + left; }
  };
})();
