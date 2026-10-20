/* smol brains 2 — main.js
   The game object, the fixed-step loop (with render interpolation and far-away low fidelity), spawning,
   eggs and hatching, sparks and miracles, achievements, offline progress ("while you were away"),
   world codes, the player-page postMessage protocol and the Computer Cooked SDK hooks. */
(function () {
  "use strict";
  var SB = window.SB;
  var Game = (SB.Game = {});
  Game.POP_CAP = 36;

  Game.newId = function (game) { return game.nextId++; };

  // id lookup: an index rebuilt every step, with a linear fallback for things made mid-step
  Game.byId = function (game, id) {
    if (id == null) return null;
    if (id >= SB.World.NODE_ID0) return game.world.nodeById[id] || null;
    var ix = game._idx;
    if (ix) { var hit = ix.get(id); if (hit && !hit.gone) return hit; }
    var i, cs = game.creatures, its = game.world.items, ss = game.world.structures;
    for (i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i];
    for (i = 0; i < its.length; i++) if (its[i].id === id) return its[i];
    for (i = 0; i < ss.length; i++) if (ss[i].id === id) return ss[i];
    return null;
  };
  function reindex(game) {
    var ix = game._idx || (game._idx = new Map());
    ix.clear();
    var i, cs = game.creatures, its = game.world.items, ss = game.world.structures;
    for (i = 0; i < cs.length; i++) ix.set(cs[i].id, cs[i]);
    for (i = 0; i < its.length; i++) ix.set(its[i].id, its[i]);
    for (i = 0; i < ss.length; i++) ix.set(ss[i].id, ss[i]);
  }

  Game.note = function (game, text) {
    game.log.push({ t: game.time, text: text });
    if (game.log.length > 60) game.log.shift();
    if (game.offline) { (game.offlineLog = game.offlineLog || []).push(text); return; }
    SB.bus.emit("note", { text: text });
  };

  /* ---------------- achievements ---------------- */
  SB.ACHIEVEMENTS = [
    { id: "hatch", icon: "🐣", name: "it's alive", desc: "hatch your first smol." },
    { id: "name", icon: "🏷", name: "name giver", desc: "name a smol." },
    { id: "feed", icon: "🍎", name: "snack delivery", desc: "watch a smol eat." },
    { id: "tickle", icon: "🪶", name: "good smol", desc: "tickle a smol to reward it." },
    { id: "tap", icon: "👆", name: "tough love", desc: "tap a smol to tell it off." },
    { id: "word1", icon: "💬", name: "first word", desc: "a smol says its first word." },
    { id: "word5", icon: "📖", name: "chatterbox", desc: "one smol knows 5 words." },
    { id: "word15", icon: "🎓", name: "smol scholar", desc: "one smol knows 15 words." },
    { id: "word30", icon: "🧠", name: "big brain smol", desc: "one smol knows 30 words." },
    { id: "obey", icon: "🫡", name: "good listener", desc: "a smol does what you told it to." },
    { id: "brain", icon: "🔬", name: "neuroscientist", desc: "open the brain viewer." },
    { id: "sentence", icon: "🗣", name: "full sentence", desc: "a smol tells you what it wants, in words." },
    { id: "egg", icon: "🥚", name: "love is in the air", desc: "two smols make an egg." },
    { id: "gen2", icon: "👪", name: "second generation", desc: "hatch a gen 2 smol." },
    { id: "gen5", icon: "🌳", name: "dynasty", desc: "hatch a gen 5 smol." },
    { id: "gen10", icon: "🧬", name: "evolution, baby", desc: "hatch a gen 10 smol." },
    { id: "gen25", icon: "🗿", name: "deep time", desc: "hatch a gen 25 smol." },
    { id: "mutant", icon: "✨", name: "mutant", desc: "hatch a smol with a new mutation." },
    { id: "pop5", icon: "🏘", name: "smol town", desc: "have 5 smols alive at once." },
    { id: "pop10", icon: "🏙", name: "smol city", desc: "have 10 smols alive at once." },
    { id: "pop25", icon: "🌆", name: "smolopolis", desc: "have 25 smols alive at once." },
    { id: "grump", icon: "👺", name: "night visitor", desc: "survive your first grump night." },
    { id: "scare", icon: "😤", name: "shoo!", desc: "chase a grump home." },
    { id: "cure", icon: "💊", name: "smol doctor", desc: "a sick smol gets better." },
    { id: "elder", icon: "👴", name: "wise old smol", desc: "a smol becomes an elder." },
    { id: "explorer", icon: "🧭", name: "explorer", desc: "one smol visits 6 different biomes." },
    { id: "iq100", icon: "💯", name: "genius", desc: "a smol scores 100+ iq." },
    { id: "iq150", icon: "🚀", name: "galaxy brain", desc: "a smol scores 150+ iq." },
    { id: "iq250", icon: "🌌", name: "cosmic brain", desc: "a smol scores 250+ iq." },
    { id: "share", icon: "📤", name: "show off", desc: "share a smol code or your civilisation card." },
    { id: "import", icon: "🌌", name: "pen pal", desc: "bring in a smol from a code." },
    { id: "day7", icon: "📅", name: "one week", desc: "reach day 7." },
    { id: "winter", icon: "❄️", name: "made it through winter", desc: "reach the first spring." },
    { id: "goodbye", icon: "🕊", name: "circle of life", desc: "a smol lives a full life." },
    { id: "critter", icon: "🐾", name: "legs!", desc: "a smol evolves into a critter." },
    { id: "tooluser", icon: "🪵", name: "opposable thumbs", desc: "a smol evolves hands: tool-user." },
    { id: "tribe", icon: "🔥", name: "we are many", desc: "a smol evolves into the tribe stage." },
    { id: "builder", icon: "🛖", name: "architects", desc: "a smol evolves into a builder." },
    { id: "thinker", icon: "🧠", name: "the thinkers", desc: "a smol evolves into a thinker." },
    { id: "ascended", icon: "✨", name: "ascension", desc: "a smol ascends." },
    { id: "eureka", icon: "💡", name: "eureka", desc: "a smol discovers an idea." },
    { id: "ideas5", icon: "🗂", name: "know-how", desc: "your smols have discovered 5 ideas." },
    { id: "ideas15", icon: "🏛", name: "civilisation", desc: "your smols have discovered 15 ideas." },
    { id: "ideasAll", icon: "🌠", name: "everything, basically", desc: "every idea discovered." },
    { id: "teach", icon: "🧑‍🏫", name: "pass it on", desc: "a smol teaches another smol an idea." },
    { id: "built", icon: "🔨", name: "first build", desc: "smols finish their first building." },
    { id: "village", icon: "🏘", name: "village people", desc: "found a village." },
    { id: "species3", icon: "🌿", name: "branching out", desc: "3 species have existed." },
    { id: "species8", icon: "🌳", name: "tree of life", desc: "8 species have existed." },
    { id: "lost", icon: "🕯", name: "dark age", desc: "an idea is forgotten forever (oops)." },
    { id: "lightning", icon: "⚡", name: "bolt from the blue", desc: "lightning strikes near your smols." },
    { id: "wildfire", icon: "🔥", name: "it's fine", desc: "a tree catches fire." },
    { id: "prayer", icon: "🙏", name: "answered prayers", desc: "answer a smol's prayer." },
    { id: "miracle", icon: "🪄", name: "act of god", desc: "perform a miracle." },
    { id: "song", icon: "🎶", name: "campfire songs", desc: "smols sing together." },
    { id: "offline", icon: "🌙", name: "while you were away", desc: "come back to a world that kept going." },
    { id: "card", icon: "🪪", name: "postcard", desc: "make a civilisation card." },
    { id: "seed", icon: "🌱", name: "world builder", desc: "copy a world code to share." },
    { id: "migrate", icon: "🛶", name: "old friends", desc: "smols from the old valley found the island." },
    { id: "bigthought", icon: "🌟", name: "the big thought", desc: "finish the spire." }
  ];
  var ACH = {};
  SB.ACHIEVEMENTS.forEach(function (a) { ACH[a.id] = a; });

  Game.unlock = function (game, id) {
    if (!game || game.achievements[id] || !ACH[id]) return false;
    game.achievements[id] = Date.now();
    Game.addSparks(game, 3, null);
    SB.bus.emit("achievement", { a: ACH[id] });
    if (window.cc && cc.event) try { cc.event("achievement", { id: id }); } catch (e) {}
    return true;
  };

  Game.smols = function (game) { return game.creatures.filter(function (c) { return c.alive && c.species === "smol"; }); };
  Game.grumps = function (game) { return game.creatures.filter(function (c) { return c.alive && c.species === "grump"; }); };
  Game.cultureKnows = function (game, id) {
    if (game.culture && game.culture.alive && game.culture.alive[id] > 0) return true;
    return game.creatures.some(function (c) { return c.alive && c.ideas && c.ideas[id] >= 1; });
  };

  /* ---------------- sparks (the god's currency) ---------------- */
  Game.addSparks = function (game, n, where) {
    game.sparks = Math.min(999, (game.sparks || 0) + n);
    game.stats.sparksEarned = (game.stats.sparksEarned || 0) + n;
    if (n > 0 && !game.offline) SB.bus.emit("sparks", { n: n, at: where });
  };
  Game.spend = function (game, n) {
    if ((game.sparks || 0) < n) return false;
    game.sparks -= n;
    return true;
  };

  /* ---------------- family, spawning, eggs ---------------- */

  Game.familyAdd = function (game, c) {
    if (c.species !== "smol") return;
    var f = (game.family[c.id] = { id: c.id, name: c.name, gen: c.gen, parents: (c.parents || []).slice(), born: game.time, died: null, cause: null, look: c.look, tier: c.tier, clade: c.clade, kids: [] });
    f.parents.forEach(function (pid) { var p = game.family[pid]; if (p && p.kids.indexOf(c.id) < 0) p.kids.push(c.id); });
  };

  Game.spawnSmol = function (game, opts) {
    opts = opts || {};
    var c = SB.Creature.create(game, {
      species: "smol", genome: opts.genome || SB.Genome.random(game.rng, { species: "smol" }),
      name: opts.name || SB.makeName(game.rng), x: opts.x, z: opts.z, gen: opts.gen || 1,
      parents: opts.parents || [], brain: opts.brain, vocab: opts.vocab, age: opts.age, tribe: opts.tribe, ideas: opts.ideas
    });
    game.creatures.push(c);
    Game.familyAdd(game, c);
    return c;
  };

  Game.spawnGrump = function (game, x, z) {
    var c = SB.Creature.create(game, { species: "grump", genome: SB.Genome.random(game.rng, { species: "grump" }), name: "grump", x: x, z: z, gen: 1, age: 900 });
    game.creatures.push(c);
    SB.bus.emit("grumpArrive", { c: c });
    return c;
  };

  Game.layEgg = function (game, a, b, x, z) {
    var ga = a.genome || a, gb = b.genome || b;
    var echo = null;
    if (a.habits && b.habits) {
      var ea = SB.Creature.echo(a), eb = SB.Creature.echo(b);
      echo = {};
      for (var k in ea) echo[k] = (ea[k] + (eb[k] || 0)) / 2;
    }
    var bless = game.blessing && game.blessing.uses > 0 ? game.blessing.genes : null;
    if (bless) { game.blessing.uses--; if (game.blessing.uses <= 0) game.blessing = null; }
    var child = SB.Genome.cross(ga, gb, game.rng, echo, bless);
    child.gen = Math.max(a.gen || 1, b.gen || 1) + 1;
    if (a.clade != null) child.clade = game.rng.chance(0.5) ? a.clade : b.clade;
    var egg = SB.World.add(game.world, game, "egg", x, z, {
      genome: child, parents: [a.id, b.id].filter(function (v) { return v != null; }), gen: child.gen, progress: 0,
      tribe: a.tribe || 0, blessed: !!bless, echo: echo,
      ideas: inherit(a, b), vocab: inheritWords(a, b)
    });
    game.stats.eggsLaid++;
    Game.unlock(game, "egg");
    Game.note(game, (a.name || "?") + " and " + (b.name || "?") + " made an egg! 🥚");
    SB.bus.emit("egg", { obj: egg });
    if (window.cc && cc.event) try { cc.event("egg", { gen: child.gen }); } catch (e) {}
    return egg;
  };
  // babies don't inherit ideas, but tribe-tier parents give them a head start on what the family knows
  function inherit(a, b) {
    var out = {};
    [a, b].forEach(function (p) { if (p.tier >= 3 && p.ideas) for (var k in p.ideas) if (p.ideas[k] >= 1) out[k] = Math.max(out[k] || 0, 0.35); });
    return out;
  }
  function inheritWords(a, b) { return {}; }

  Game.hatch = function (game, egg) {
    var d = egg.data || {};
    var c = Game.spawnSmol(game, { genome: d.genome, x: egg.x, z: egg.z, gen: d.gen || 1, parents: d.parents || [], name: d.name, tribe: d.tribe, ideas: d.ideas });
    if (d.starter) {
      c.chem.hunger = 0.72; c.chem.bored = 0.15;
      SB.Brain.dream(c.brain, [{ drive: SB.D.hunger, noun: SB.N.food, verb: SB.V.eat, s: 1 }], 80, game.rng);
    }
    if (SB.Render && SB.Render.camera) c.facing = Math.atan2(SB.Render.camera.eye[0] - c.x, SB.Render.camera.eye[2] - c.z) || 0;
    SB.World.remove(game.world, egg);
    game.stats.hatched++;
    if (c.gen > game.stats.maxGen) game.stats.maxGen = c.gen;
    if (c.tier > (game.stats.maxTier || 0)) {
      game.stats.maxTier = c.tier;
      if (c.tier >= 1) Game.unlock(game, SB.TIERS[c.tier].id);
      SB.bus.emit("tierUp", { c: c, tier: c.tier });
      Game.addSparks(game, 10 * c.tier, c);
      if (window.cc && cc.event) try { cc.event("tier", { tier: c.tier, gen: c.gen }); } catch (e) {}
    }
    SB.Species.onHatch(game, c);
    Game.unlock(game, "hatch");
    if (c.gen >= 2) Game.unlock(game, "gen2");
    if (c.gen >= 5) Game.unlock(game, "gen5");
    if (c.gen >= 10) Game.unlock(game, "gen10");
    if (c.gen >= 25) Game.unlock(game, "gen25");
    if (c.genome.mutated && c.genome.mutated.length) Game.unlock(game, "mutant");
    if (SB.Species.count(game) >= 3) Game.unlock(game, "species3");
    if (SB.Species.count(game) >= 8) Game.unlock(game, "species8");
    Game.addSparks(game, 2, c);
    Game.note(game, c.name + " hatched! (gen " + c.gen + ", " + SB.TIERS[c.tier].name + ")");
    SB.bus.emit("hatch", { c: c, obj: egg });
    if (window.cc && cc.event) try { cc.event("hatch", { gen: c.gen, tier: c.tier }); } catch (e) {}
    return c;
  };

  Game.select = function (game, id) {
    game.selectedId = id;
    SB.bus.emit("select", { c: Game.byId(game, id) });
  };

  /* ---------------- score ---------------- */
  Game.score = function (game) {
    var s = game.stats, cu = game.culture || { found: {} };
    var ideas = Object.keys(cu.found || {}).length;
    return Math.round((s.maxTier || 0) * 250 + ideas * 40 + (s.maxGen || 1) * 8 + (s.bestIQ || 0) + (game.villages ? game.villages.length * 120 : 0) + SB.Species.count(game) * 25 + (s.built || 0) * 6 + (game.achievements.bigthought ? 3000 : 0));
  };

  /* ---------------- new game ---------------- */

  Game.create = function (seed) {
    seed = seed || SB.newSeed();
    var game = {
      v: 2, seed: seed, time: 0, speed: 1, rng: SB.rng(seed ^ 0x5bd1e995), nextId: 1,
      world: null, creatures: [], selectedId: null,
      hand: { x: 0, y: 0, z: 0, visible: false, tool: "grab", heldId: null, saying: null, sayT: 0 },
      family: {}, achievements: {}, tutorial: { step: 0, done: false }, log: [],
      stats: { hatched: 0, eggsLaid: 0, maxGen: 1, wordsTaught: 0, tickles: 0, taps: 0, deaths: 0, bestIQ: 0, grumpNights: 0, cured: 0, imported: 0, exported: 0, maxTier: 0, built: 0, crafted: 0, miracles: 0, prayersAnswered: 0 },
      sparks: 12, prayers: [], blessing: null, culture: null, tribes: null, villages: null, clades: null,
      lang: SB.Lang.create(seed), created: Date.now(), playTime: 0
    };
    game.world = SB.World.create(game, seed);
    game.time = SB.DAY_LENGTH * 0.335; // golden morning
    game.world.time = game.time;
    SB.Society.init(game);
    SB.Species.init(game);
    return game;
  };

  Game.newGame = function (seed) {
    var g = Game.create(seed);
    var nest = g.world.T.nest;
    var egg = SB.World.add(g.world, g, "egg", nest.x, nest.z, { genome: SB.Genome.random(g.rng, { species: "smol" }), parents: [], gen: 1, progress: 0, starter: true });
    var ins = egg.data.genome.instincts, hasEat = false;
    for (var i = 0; i < ins.length; i++) if (ins[i].drive === SB.D.hunger && ins[i].noun === SB.N.food && ins[i].verb === SB.V.eat) { ins[i].s = Math.max(ins[i].s, 0.8); hasEat = true; }
    if (!hasEat) ins.push({ drive: SB.D.hunger, noun: SB.N.food, verb: SB.V.eat, s: 0.8 });
    // an apple waits by the nest, and a gift from the sky
    var a = SB.World.add(g.world, g, "apple", nest.x + 1.6, nest.z + 0.6, {});
    a.data.starterApple = true;
    SB.World.add(g.world, g, "ball", nest.x - 1.8, nest.z + 1.2, {});
    return g;
  };

  /* ---------------- loop ---------------- */

  var acc = 0, last = 0, game = null, running = false, achT = 0, scoreT = 0, saveT = 0;

  function farFlags(game) {
    var cam = SB.Render.camera, r = Math.max(cam.halfW, cam.halfH) + 10;
    for (var i = 0; i < game.creatures.length; i++) {
      var c = game.creatures[i];
      c.far = Math.abs(c.x - cam.x) > r * 1.3 || Math.abs(c.z - cam.z) > r * 1.6;
    }
    game.focus = { x: cam.x, z: cam.z };
  }

  // average hunger of the living smols, refreshed every few seconds (breeding and the HUD use it)
  Game.colonyHunger = function (game) {
    if (game._chT != null && game.time - game._chT < 3) return game._ch;
    var sm = Game.smols(game), t = 0, its = game.world.items, f = 0;
    for (var i = 0; i < sm.length; i++) t += sm[i].chem.hunger;
    for (i = 0; i < its.length; i++) if (its[i].noun === "food" && !its[i].data.rotten) f++;
    game._chT = game.time; game._ch = sm.length ? t / sm.length : 0;
    game._foodPer = sm.length ? f / sm.length : 9;
    return game._ch;
  };
  // fresh food on the island per smol (same refresh as colonyHunger)
  Game.foodPerSmol = function (game) { Game.colonyHunger(game); return game._foodPer; };

  Game.step = function (game, dt) {
    game.time += dt;
    reindex(game);
    SB.World.rebuildCreatureGrid(game.world, game);
    SB.World.tick(game.world, dt, game);
    var cs = game.creatures;
    for (var i = 0; i < cs.length; i++) if (cs[i].alive || cs[i].dying) SB.Creature.tick(cs[i], dt, game);
    for (var j = cs.length - 1; j >= 0; j--) if (cs[j].gone) { if (game.hand.heldId === cs[j].id) game.hand.heldId = null; cs.splice(j, 1); }
    if (game.hand.sayT > 0) { game.hand.sayT -= dt; if (game.hand.sayT <= 0) game.hand.saying = null; }
    SB.Species.tick(game, dt);
    SB.Society.tick(game, dt);
    checkAchievements(game, dt);
    if (game.offline) {
      // offline mode is gentle: nobody starves or dies of a cold while you're away (old age still happens)
      for (var k = 0; k < cs.length; k++) {
        var c = cs[k];
        if (!c.alive || c.species !== "smol") continue;
        if (c.chem.health < 0.3) c.chem.health = 0.3;
        if (c.chem.hunger > 0.8) c.chem.hunger = 0.8;
      }
    }
  };

  function checkAchievements(game, dt) {
    achT += dt;
    if (achT < 1) return;
    achT = 0;
    var smols = Game.smols(game);
    if (smols.length >= 5) Game.unlock(game, "pop5");
    if (smols.length >= 10) Game.unlock(game, "pop10");
    if (smols.length >= 25) Game.unlock(game, "pop25");
    if (game.time / SB.DAY_LENGTH >= 6) Game.unlock(game, "day7");
    if (game.world.dayIndex >= SB.SEASON_DAYS * 4) Game.unlock(game, "winter");
    var eggs = game.world.items.some(function (o) { return o.kind === "egg"; });
    // extinction is not a dead end: a wild egg turns up in the nest
    if (!smols.length && !eggs && game.stats.hatched > 0) {
      game.emptyT = (game.emptyT || 0) + 1;
      if (game.emptyT >= 45) {
        game.emptyT = 0;
        var nest = game.world.T.nest, last = game.lastGenome;
        var g = last ? SB.Genome.cross(last, last, game.rng) : SB.Genome.random(game.rng, { species: "smol" });
        SB.World.add(game.world, game, "egg", nest.x, nest.z, { genome: g, parents: [], gen: g.gen || 1, progress: 0.3 });
        Game.note(game, "the island is quiet... an egg turned up in the nest 🥚");
      }
    } else game.emptyT = 0;
    // a small colony gets visitors: an egg from "over the hill" (a cousin of the smols you have, so evolution keeps its progress)
    if (smols.length >= 1 && smols.length < 4 && game.tutorial.wildDone && !eggs) {
      game.cousinT = (game.cousinT || 0) + 1;
      if (game.cousinT > 130) {
        game.cousinT = 0;
        var pa = game.rng.pick(smols), pb = game.rng.pick(smols);
        // cousins have been evolving over the hill too: they lean toward whatever the colony's next tier still needs
        var need = SB.Genome.nextNeeds(pa.genome).filter(function (n) { return SB.Genome.EVO_GENES.indexOf(n.gene) >= 0; })[0];
        var cb = need ? {} : null; if (need) cb[need.gene] = 0.18;
        var cg = SB.Genome.cross(pa.genome, pb.genome, game.rng, SB.Creature.echo(pa), cb);
        cg.gen = Math.max(pa.gen, pb.gen);
        var ang2 = game.rng() * 6.28, home = SB.Society.home(game, 0);
        var ex2 = home.x + Math.sin(ang2) * 6, ez2 = home.z + Math.cos(ang2) * 6;
        if (!SB.World.walkable(game.world, ex2, ez2)) { ex2 = game.world.T.nest.x; ez2 = game.world.T.nest.z; }
        SB.World.add(game.world, game, "egg", ex2, ez2, { genome: cg, parents: [], gen: cg.gen, progress: 0.5, wild: true });
        Game.note(game, "an egg rolled in from over the hill 🥚 (a cousin, by the look of it)");
      }
    } else game.cousinT = 0;
    // a wild smol wanders in now and then while the colony is tiny, so there's always someone to love
    if (smols.length === 1 && game.stats.hatched >= 1 && !game.tutorial.wildDone && game.time > SB.DAY_LENGTH * 0.335 + 90) {
      game.tutorial.wildDone = true;
      var s0 = smols[0], ang = game.rng() * 6.28;
      var wx = s0.x + Math.sin(ang) * 9, wz = s0.z + Math.cos(ang) * 9;
      if (!SB.World.walkable(game.world, wx, wz)) { wx = game.world.T.spawn.x + 2; wz = game.world.T.spawn.z + 2; }
      var wild = SB.World.add(game.world, game, "egg", wx, wz, { genome: SB.Genome.random(game.rng, { species: "smol" }), parents: [], gen: 1, progress: 0.55, wild: true });
      Game.note(game, "a wild egg rolled out of the bushes! 🥚 keep it warm");
      SB.bus.emit("wildEgg", { obj: wild });
    }
    var best = game.stats.bestIQ;
    for (var i = 0; i < smols.length; i++) {
      var c = smols[i];
      var iq = SB.Creature.iq(c);
      if (iq > game.stats.bestIQ) game.stats.bestIQ = iq;
      if (iq >= 100) Game.unlock(game, "iq100");
      if (iq >= 150) Game.unlock(game, "iq150");
      if (iq >= 250) Game.unlock(game, "iq250");
      if (c.stage >= 4) Game.unlock(game, "elder");
      if (c.visited && Object.keys(c.visited).length >= 6) Game.unlock(game, "explorer");
      if (c.gen >= 1) game.lastGenome = c.genome;
    }
    if (game.stats.bestIQ > best && window.cc && cc.score) try { cc.score(Game.score(game)); } catch (e) {}
    var found = Object.keys(game.culture.found).length;
    if (found >= 1) Game.unlock(game, "eureka");
    if (found >= 5) Game.unlock(game, "ideas5");
    if (found >= 15) Game.unlock(game, "ideas15");
    if (found >= SB.Ideas.LIST.length) Game.unlock(game, "ideasAll");
    if ((game.stats.built || 0) >= 1) Game.unlock(game, "built");
    if (game.villages.length) Game.unlock(game, "village");
    if (game.culture.lostCount) Game.unlock(game, "lost");
    // expire unanswered prayers
    game.prayers = (game.prayers || []).filter(function (p) { return !p.answered && game.time - p.t < 60; });
  }

  // simple bus-driven bookkeeping
  function wireBus() {
    SB.bus.on("eureka", function (d) { if (!game) return; Game.addSparks(game, d.first ? 12 : 4, d.c); });
    SB.bus.on("learnWord", function () { if (game) Game.addSparks(game, 1, null); });
    SB.bus.on("teach", function (d) { if (d.learned && game) Game.unlock(game, "teach"); });
    SB.bus.on("lightning", function (d) { if (!game) return; var near = game.creatures.some(function (c) { return c.alive && c.species === "smol" && SB.dist(c.x, c.z, d.x, d.z) < 16; }); if (near) Game.unlock(game, "lightning"); });
    SB.bus.on("wildfire", function () { if (game) Game.unlock(game, "wildfire"); });
    SB.bus.on("prayerAnswered", function (d) { if (!game) return; game.stats.prayersAnswered++; Game.addSparks(game, 4, d.c); Game.unlock(game, "prayer"); });
    SB.bus.on("dawn", function () { if (game && game.world.nightGrumps > 0) { game.stats.grumpNights++; Game.unlock(game, "grump"); } });
    SB.bus.on("built", function (d) { if (game && d.st.kind === "spire" && d.st.done) { Game.unlock(game, "bigthought"); SB.bus.emit("bigThought", { st: d.st }); } });
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dtReal = Math.min(0.1, (now - last) / 1000 || 0);
    last = now;
    var paused = game.speed === 0 || Game.hostPaused || (SB.UI && SB.UI.modalOpen) || game.offlineRunning;
    if (!paused) {
      farFlags(game);
      acc += dtReal * game.speed;
      var steps = 0;
      var ts0 = performance.now();
      while (acc >= SB.TICK && steps < 24) { Game.step(game, SB.TICK); acc -= SB.TICK; steps++; }
      if (steps) Game.stepMs = (Game.stepMs || 0) * 0.9 + (performance.now() - ts0) / steps * 0.1;
      if (steps >= 24) acc = 0;
      game.playTime += dtReal;
    }
    var alpha = paused ? 1 : acc / SB.TICK;
    SB.Render.frame(game, dtReal, alpha);
    if (SB.UI && SB.UI.frame) SB.UI.frame(game, dtReal);
    saveT += dtReal;
    if (saveT > 20) { saveT = 0; try { SB.Save.save(game); } catch (e) {} }
    scoreT += dtReal;
    if (scoreT > 30) { scoreT = 0; if (window.cc && cc.score) try { cc.score(Game.score(game)); } catch (e) {} }
  }

  Game.start = function (g) {
    game = Game.current = g;
    acc = 0;
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  };

  Game.swap = function (g) {
    game = Game.current = g;
    SB.Render.setWorld(g);
    if (SB.UI && SB.UI.setGame) SB.UI.setGame(g);
    Game.start(g);
    try { SB.Save.save(g); } catch (e) {}
  };

  /* ---------------- offline progress ---------------- */

  // how much sim time to grant for real time away: 1:1 for 10 minutes, then much slower, max 75 sim minutes
  Game.offlineBudget = function (awaySec) {
    if (!(awaySec > 60)) return 0;
    var a = Math.min(awaySec, 3600 * 12);
    return Math.min(4500, Math.min(a, 600) + Math.max(0, a - 600) / 8);
  };
  // run the sim fast (coarse step, chunked so the page stays responsive). cb(report) at the end.
  Game.runOffline = function (g, simSec, onProgress, cb) {
    var before = snapshotStats(g);
    g.offline = true; g.offlineRunning = true; g.offlineLog = [];
    var done = 0, dt = 0.25;
    function chunk() {
      var t0 = performance.now();
      while (done < simSec && performance.now() - t0 < 30) {
        farAll(g);
        Game.step(g, dt);
        done += dt;
      }
      if (onProgress) onProgress(done / simSec);
      if (done < simSec) setTimeout(chunk, 0);
      else {
        g.offline = false; g.offlineRunning = false;
        var rep = diffStats(g, before, simSec);
        rep.log = g.offlineLog.slice(-12); g.offlineLog = null;
        Game.unlock(g, "offline");
        cb(rep);
      }
    }
    chunk();
  };
  function farAll(g) { for (var i = 0; i < g.creatures.length; i++) g.creatures[i].far = true; }
  function snapshotStats(g) {
    return { hatched: g.stats.hatched, deaths: g.stats.deaths, words: g.stats.wordsTaught, found: Object.keys(g.culture.found).length, built: g.stats.built || 0, species: SB.Species.count(g), villages: g.villages.length, maxGen: g.stats.maxGen, maxTier: g.stats.maxTier || 0, sparks: g.sparks };
  }
  function diffStats(g, b, sec) {
    var a = snapshotStats(g);
    return { sim: sec, hatched: a.hatched - b.hatched, deaths: a.deaths - b.deaths, words: a.words - b.words, ideas: a.found - b.found, built: a.built - b.built, species: a.species - b.species, villages: a.villages - b.villages, gens: a.maxGen - b.maxGen, tier: a.maxTier > b.maxTier ? a.maxTier : null, sparks: a.sparks - b.sparks };
  }

  /* ---------------- boot ---------------- */

  function urlSeed() {
    try {
      var q = new URLSearchParams(location.search), w = q.get("world") || q.get("seed");
      return w ? SB.parseWorldCode(w) : 0;
    } catch (e) { return 0; }
  }

  function boot() {
    wireBus();
    SB.Audio && SB.Audio.init && SB.Audio.init();
    var canvas = document.getElementById("view"), ov = document.getElementById("overlay");
    if (!SB.Render.init(canvas, ov)) { SB.UI.noWebGL(); return; }
    try { if (/[?&]perf=1/.test(location.search)) SB.Render.perf.show = true; } catch (e) {}
    var g = null, data = null, migrated = false, seedFromUrl = urlSeed();
    try { data = SB.Save.load(); } catch (e) { data = null; }
    // a shared world link opens that world, but never silently over an island you already have
    if (data && seedFromUrl && data.seed !== seedFromUrl) {
      var day = Math.floor((data.time || 0) / SB.DAY_LENGTH) + 1;
      var code = ""; try { var q = new URLSearchParams(location.search); code = q.get("world") || q.get("seed") || ""; } catch (e) {}
      if (window.confirm("this link opens the world " + (code || SB.worldCode(seedFromUrl)) + ". your own island (day " + day + ") will be replaced. open it?")) data = null;
      else { seedFromUrl = 0; try { history.replaceState(null, "", location.pathname); } catch (e) {} }
    }
    if (data) { try { g = SB.Save.revive(data); } catch (e) { console.warn("[smol] save load failed, new game", e); g = null; } }
    if (!g && !seedFromUrl) {
      var v1 = SB.Save.loadV1();
      if (v1) { try { g = SB.Save.migrateV1(v1); migrated = !!g; } catch (e) { console.warn("[smol] v1 migration failed", e); g = null; } }
    }
    var fresh = !g;
    if (!g) g = Game.newGame(seedFromUrl || 0);
    game = Game.current = g;
    SB.Render.setWorld(g);
    SB.UI.init(g, { fresh: fresh, migrated: migrated });
    Game.start(g);
    if (window.cc && cc.start) try { cc.start(); } catch (e) {}
    SB.Save.cloud && SB.Save.cloud();

    // offline progress
    if (!fresh && data && data.savedAt) {
      var away = (Date.now() - data.savedAt) / 1000, budget = Game.offlineBudget(away);
      if (budget > 30 && SB.UI.awayScreen) SB.UI.awayScreen(g, away, budget);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        try { SB.Save.save(Game.current); } catch (e) {}
        if (window.cc && cc.end) try { cc.end({ score: Game.score(Game.current) }); } catch (e) {}
      }
    });
    window.addEventListener("pagehide", function () { try { SB.Save.save(Game.current); } catch (e) {} });
    window.addEventListener("resize", function () { SB.Render.resize(); });

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
  Game.boot = boot;

  // debug helpers for testing and screenshots: SB.Debug.spawnTier(4), SB.Debug.ideas(), SB.Debug.build("hut")
  SB.Debug = {
    spawnTier: function (tier, n) {
      var g = Game.current, sp = SB.Society.home(g, 0), out = [];
      for (var i = 0; i < (n || 1); i++) {
        var ge = SB.Genome.random(g.rng, { species: "smol" }), need = SB.Genome.TIER_NEEDS;
        for (var t = 1; t <= tier; t++) for (var k in need[t]) if (k !== "neurons" && k !== "layers") ge.genes[k] = Math.max(ge.genes[k], need[t][k] + 0.05);
        if (tier >= 2) { ge.genes.hidden = 0.6; ge.genes.cortex = Math.max(ge.genes.cortex, [0, 0, 0.1, 0.35, 0.5, 0.95, 1][tier]); }
        if (tier >= 4) ge.genes.layers = Math.max(ge.genes.layers, tier >= 6 ? 0.85 : 0.5);
        var c = Game.spawnSmol(g, { genome: ge, x: sp.x + (i % 4) * 1.4 - 2, z: sp.z + Math.floor(i / 4) * 1.4 + 2, age: 700 });
        out.push(c);
      }
      g.stats.maxTier = Math.max(g.stats.maxTier || 0, out[0].tier);
      return out;
    },
    ideas: function (c, list) { (list || SB.Ideas.LIST.map(function (d) { return d.id; })).forEach(function (id) { if (SB.Ideas.canHold(c, id)) SB.Ideas.discover(c, id, Game.current); }); },
    build: function (kind, x, z) { var g = Game.current, sp = SB.Society.home(g, 0); return SB.World.addStructure(g.world, g, kind, x == null ? sp.x + 3 : x, z == null ? sp.z : z, { done: true }); },
    skip: function (sec) { var g = Game.current; for (var t = 0; t < sec; t += SB.TICK) Game.step(g, SB.TICK); }
  };

  if (typeof document !== "undefined" && document.getElementById) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
