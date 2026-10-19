/* smol brains — main.js
   The game object, the fixed-step loop, game-level helpers (spawning, eggs, hatching, achievements),
   the player-page postMessage protocol and the Computer Cooked SDK hooks. */
(function () {
  "use strict";
  var SB = window.SB;

  var Game = (SB.Game = {});

  Game.newId = function (game) { return game.nextId++; };

  Game.byId = function (game, id) {
    if (id == null) return null;
    for (var i = 0; i < game.creatures.length; i++) if (game.creatures[i].id === id) return game.creatures[i];
    var objs = game.world.objects;
    for (var j = 0; j < objs.length; j++) if (objs[j].id === id) return objs[j];
    return null;
  };

  Game.note = function (game, text) {
    game.log.push({ t: game.time, text: text });
    if (game.log.length > 50) game.log.shift();
    SB.bus.emit("note", { text: text });
  };

  Game.unlock = function (game, id) {
    if (game.achievements[id]) return false;
    var a = SB.ACHIEVEMENTS.filter(function (x) { return x.id === id; })[0];
    if (!a) return false;
    game.achievements[id] = Date.now();
    SB.bus.emit("achievement", { a: a });
    if (window.cc && cc.event) try { cc.event("achievement", { id: id }); } catch (e) {}
    return true;
  };

  Game.smols = function (game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol"; }); };
  Game.grumps = function (game) { return game.creatures.filter(function (c) { return c.alive && c.species === "grump"; }); };

  Game.familyAdd = function (game, c) {
    if (c.species !== "smol") return;
    var f = (game.family[c.id] = { id: c.id, name: c.name, gen: c.gen, parents: (c.parents || []).slice(), born: game.time, died: null, cause: null, look: c.look, kids: [] });
    f.parents.forEach(function (pid) { var p = game.family[pid]; if (p && p.kids.indexOf(c.id) < 0) p.kids.push(c.id); });
  };

  Game.spawnSmol = function (game, opts) {
    opts = opts || {};
    var c = SB.Creature.create(game, {
      species: "smol",
      genome: opts.genome || SB.Genome.random(game.rng, { species: "smol" }),
      name: opts.name || SB.makeName(game.rng),
      x: opts.x != null ? opts.x : SB.HOME_X,
      gen: opts.gen || 1,
      parents: opts.parents || [],
      brain: opts.brain,
      vocab: opts.vocab,
      age: opts.age
    });
    game.creatures.push(c);
    Game.familyAdd(game, c);
    return c;
  };

  Game.spawnGrump = function (game, x) {
    var c = SB.Creature.create(game, { species: "grump", genome: SB.Genome.random(game.rng, { species: "grump" }), name: "grump", x: x, gen: 1, age: 1300 });
    game.creatures.push(c);
    SB.bus.emit("grumpArrive", { c: c });
    return c;
  };

  // Lay an egg from two parent creatures (or a genome pair) at x.
  Game.layEgg = function (game, a, b, x) {
    var ga = a.genome || a, gb = b.genome || b;
    var child = SB.Genome.cross(ga, gb, game.rng);
    child.gen = Math.max(a.gen || 1, b.gen || 1) + 1;
    var egg = SB.World.add(game.world, game, "egg", x, SB.World.groundY(game.world, x) - 40, {
      genome: child, parents: [a.id, b.id].filter(function (v) { return v != null; }), gen: child.gen, warmth: 0, progress: 0
    });
    game.stats.eggsLaid++;
    Game.unlock(game, "egg");
    Game.note(game, (a.name || "?") + " and " + (b.name || "?") + " made an egg! 🥚");
    SB.bus.emit("egg", { obj: egg });
    if (window.cc && cc.event) try { cc.event("egg", { gen: child.gen }); } catch (e) {}
    return egg;
  };

  Game.hatch = function (game, egg) {
    var d = egg.data || {};
    var c = Game.spawnSmol(game, { genome: d.genome, x: egg.x, gen: d.gen || 1, parents: d.parents || [], name: d.name });
    c.y = egg.y;
    SB.World.remove(game.world, egg);
    game.stats.hatched++;
    if (c.gen > game.stats.maxGen) game.stats.maxGen = c.gen;
    Game.unlock(game, "hatch");
    if (c.gen >= 2) Game.unlock(game, "gen2");
    if (c.gen >= 5) Game.unlock(game, "gen5");
    if (c.gen >= 10) Game.unlock(game, "gen10");
    if (c.genome.mutated && c.genome.mutated.length) Game.unlock(game, "mutant");
    Game.note(game, c.name + " hatched! (gen " + c.gen + ")");
    SB.bus.emit("hatch", { c: c, obj: egg });
    if (window.cc && cc.event) try { cc.event("hatch", { gen: c.gen }); } catch (e) {}
    return c;
  };

  Game.select = function (game, id) {
    game.selectedId = id;
    SB.bus.emit("select", { c: Game.byId(game, id) });
  };

  /* ---------------- new game ---------------- */

  Game.create = function (seed) {
    seed = seed || (Date.now() % 2147483647);
    var game = {
      v: 1, seed: seed, time: 0, speed: 1, rng: SB.rng(seed), nextId: 1,
      world: null, creatures: [], selectedId: null,
      hand: { x: SB.HOME_X, y: 300, visible: false, tool: "grab", heldId: null, saying: null, sayT: 0 },
      family: {},
      stats: { hatched: 0, eggsLaid: 0, maxGen: 1, wordsTaught: 0, tickles: 0, taps: 0, deaths: 0, bestIQ: 0, grumpNights: 0, cured: 0, imported: 0, exported: 0 },
      achievements: {},
      tutorial: { step: 0, done: false },
      log: []
    };
    game.world = SB.World.create(game);
    return game;
  };

  // Rebuild a game from SB.Save.load() data (save.js does the heavy lifting; this just re-links the rng).
  Game.revive = function (data) {
    var game = SB.Save.revive(data);
    if (!game.rng) { game.rng = SB.rng(game.seed); if (data.rngState) game.rng.setState(data.rngState); }
    return game;
  };

  /* ---------------- achievements that are simplest to check globally ---------------- */
  var checkT = 0;
  function checkAchievements(game, dt) {
    checkT += dt;
    if (checkT < 1) return;
    checkT = 0;
    var smols = Game.smols(game);
    if (smols.length >= 5) Game.unlock(game, "pop5");
    if (smols.length >= 10) Game.unlock(game, "pop10");
    if (game.time / SB.DAY_LENGTH >= 6) Game.unlock(game, "day7");
    for (var i = 0; i < smols.length; i++) {
      var c = smols[i];
      var iq = SB.Creature.iq(c);
      if (iq > game.stats.bestIQ) game.stats.bestIQ = iq;
      if (iq >= 100) Game.unlock(game, "iq100");
      if (iq >= 150) Game.unlock(game, "iq150");
      if (c.stage >= 4) Game.unlock(game, "elder");
      if (c.visited && Object.keys(c.visited).length >= SB.ROOMS.length) Game.unlock(game, "explorer");
    }
  }

  /* ---------------- loop ---------------- */

  var acc = 0, last = 0, game = null, running = false;

  function step(dt) {
    game.time += dt;
    SB.World.tick(game.world, dt, game);
    var cs = game.creatures;
    for (var i = 0; i < cs.length; i++) if (cs[i].alive || cs[i].dying) SB.Creature.tick(cs[i], dt, game);
    // remove the dead after their fade-out (creature.js sets c.gone = true when the body should vanish)
    for (var j = cs.length - 1; j >= 0; j--) if (cs[j].gone) cs.splice(j, 1);
    if (game.hand.sayT > 0) { game.hand.sayT -= dt; if (game.hand.sayT <= 0) game.hand.saying = null; }
    checkAchievements(game, dt);
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dtReal = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    var paused = game.speed === 0 || Game.hostPaused || (SB.UI && SB.UI.modalOpen);
    if (!paused) {
      acc += dtReal * game.speed;
      var steps = 0;
      while (acc >= SB.TICK && steps < 8) { step(SB.TICK); acc -= SB.TICK; steps++; }
      if (steps >= 8) acc = 0; // can't keep up: drop time rather than spiral
    }
    SB.Render.frame(game, dtReal);
    if (SB.UI && SB.UI.frame) SB.UI.frame(game, dtReal);
  }

  Game.start = function (g) {
    game = Game.current = g;
    acc = 0;
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  };

  // Replace the running game (load, import, restart).
  Game.swap = function (g) {
    Game.start(g);
    SB.Render.init(document.getElementById("view"), g);
    SB.UI.init(g);
  };

  Game.newGame = function () {
    var g = Game.create();
    // the starter egg sits in the incubator
    var inc = g.world.objects.filter(function (o) { return o.kind === "incubator"; })[0];
    var ex = inc ? inc.x : SB.HOME_X;
    var egg = SB.World.add(g.world, g, "egg", ex, SB.World.groundY(g.world, ex) - 30, {
      genome: SB.Genome.random(g.rng, { species: "smol" }), parents: [], gen: 1, warmth: 0, progress: 0, starter: true
    });
    egg.data.genome.gen = 1;
    return g;
  };

  /* ---------------- boot ---------------- */

  function boot() {
    SB.Audio && SB.Audio.init && SB.Audio.init();
    var g = null;
    try { var data = SB.Save.load(); if (data) g = Game.revive(data); } catch (e) { console.warn("save load failed, new game", e); g = null; }
    if (!g) g = Game.newGame();
    Game.start(g);
    SB.Render.init(document.getElementById("view"), g);
    SB.UI.init(g);
    if (window.cc && cc.start) try { cc.start(); } catch (e) {}

    // autosave
    setInterval(function () { try { SB.Save.save(Game.current); } catch (e) {} }, 20000);
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        try { SB.Save.save(Game.current); } catch (e) {}
        if (window.cc && cc.end) try { cc.end({ score: Math.round(Game.current.stats.bestIQ) }); } catch (e) {}
      }
    });
    window.addEventListener("pagehide", function () { try { SB.Save.save(Game.current); } catch (e) {} });

    // player page protocol
    window.addEventListener("message", function (e) {
      var m = e.data;
      if (!m || typeof m !== "object") return;
      if (m.type === "cc-mute") SB.Audio && SB.Audio.setMuted(!!m.muted, "host");
      else if (m.type === "cc-pause") Game.hostPaused = !!(m.paused == null ? true : m.paused);
      else if (m.type === "cc-resume") Game.hostPaused = false;
      else if (m.type === "cc-restart") SB.UI && SB.UI.confirmRestart && SB.UI.confirmRestart();
    });

    window.ccGameActive = true;
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
