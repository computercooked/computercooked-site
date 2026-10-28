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
    { id: "iq100", icon: "💯", name: "genius", desc: "a smol scores 150+ iq." },
    { id: "iq150", icon: "🚀", name: "galaxy brain", desc: "a smol scores 220+ iq." },
    { id: "iq250", icon: "🌌", name: "cosmic brain", desc: "a smol scores 320+ iq." },
    { id: "share", icon: "📤", name: "show off", desc: "share a smol code or your civilisation card." },
    { id: "import", icon: "🌌", name: "pen pal", desc: "bring in a smol from a code." },
    { id: "day7", icon: "📅", name: "three days", desc: "see three sunrises on the island." },
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
    { id: "stranger", icon: "🧳", name: "newcomer", desc: "welcome a stranger into your tribe." },
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
    if (n > 0) n = Math.round(n * SB.wopt(game, "sparks") * 10) / 10;
    game.sparks = Math.min(999, (game.sparks || 0) + n);
    game.stats.sparksEarned = (game.stats.sparksEarned || 0) + n;
    if (n > 0 && !game.offline) SB.bus.emit("sparks", { n: n, at: where });
  };
  Game.spend = function (game, n) {
    if ((game.sparks || 0) < n) return false;
    game.sparks -= n;
    return true;
  };
  // miracles get dearer the more you lean on them (it cools off over a few minutes), and cost double
  // when you're running time fast: a god at 8× or 16× isn't really paying attention
  Game.miracleCost = function (game, base) {
    var heat = game.godHeat || 0, fast = game.speed >= 8 ? 2 : 1;
    return Math.round(base * (1 + 0.3 * heat) * fast);
  };
  // the right answer pays: a miracle for a need, a tickle for a lonely or lovesick smol (it just wants you)
  Game.prayerPay = function (game, how, p) { var right = how === "miracle" || (how === "comfort" && p && /lonely|love|bored|fear/.test(p.need)); return right ? Math.round(5 * (1 - (game.spoil || 0))) : 1; };
  Game.usedMiracle = function (game, id) {
    if (game.time < SB.DAY_LENGTH * 0.335 + 1200 && !game.ngPlus) return; // the first 20 minutes are for learning what miracles do
    game.godHeat = Math.min(10, (game.godHeat || 0) + (id === "bless" ? 2 : 1));
  };
  // handing out food and toys to smols who don't need them spoils them: they stop looking for their own
  Game.spoilFrom = function (game, id) {
    var sm = Game.smols(game);
    if (!sm.length) return;
    var hunger = sm.reduce(function (a, c) { return a + c.chem.hunger; }, 0) / sm.length;
    var add = id === "bounty" ? (hunger < 0.45 ? 0.14 : 0.03) : id === "gift" ? 0.05 : 0;
    if (!add) return;
    var before = game.spoil || 0;
    game.spoil = Math.min(1, before + add);
    if (before < 0.35 && game.spoil >= 0.35) SB.bus.emit("spoiled", {});
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
      name: opts.name || SB.makeName(game.rng, game, { parents: (opts.parents || []).map(function (id) { var f = game.family[id]; return f && f.name; }).filter(Boolean) }), x: opts.x, z: opts.z, gen: opts.gen || 1,
      parents: opts.parents || [], brain: opts.brain, vocab: opts.vocab, age: opts.age, tribe: opts.tribe, ideas: opts.ideas, sex: opts.sex
    });
    game.creatures.push(c);
    Game.familyAdd(game, c);
    if (SB.Collect) c._cxNew = SB.Collect.register(game, c, opts.how);
    return c;
  };

  Game.spawnGrump = function (game, x, z) {
    var c = SB.Creature.create(game, { species: "grump", genome: SB.Genome.random(game.rng, { species: "grump" }), name: "grump", x: x, z: z, gen: 1, age: 900 });
    game.creatures.push(c);
    SB.bus.emit("grumpArrive", { c: c });
    return c;
  };

  // fewer eggs, raised with more care: from the tribe on a couple has an egg about every quarter-hour (creature.js),
  // and each child gets more of what its parents practised and leans harder toward the more evolved parent
  Game.CARE_MOMENTUM = [0.3, 0.65]; // before the tribe, from the tribe on (fewer births: each child has to carry more of the line)
  Game.GLOW_ECHO = 1.25;
  Game.care = function (game) { return ((game.stats && game.stats.maxTier) || 0) >= 3 ? 1.8 : 1; };
  Game.layEgg = function (game, a, b, x, z) {
    var ga = a.genome || a, gb = b.genome || b;
    var echo = null;
    if (a.habits && b.habits) {
      var ea = SB.Creature.echo(a), eb = SB.Creature.echo(b);
      echo = {};
      // a small band adapts faster: with room for fewer smols, what parents practise echoes harder
      var small = SB.clamp(1 + 0.6 * (36 - (Game.POP_CAP || 36)) / 24, 1, 1.6);
      for (var k in ea) echo[k] = (ea[k] + (eb[k] || 0)) / 2 * small * Game.care(game);
      // a thinker's inner glow carries further: with an egg a quarter-hour, a line can't wait out many generations
      if (Math.max(a.tier || 0, b.tier || 0) >= 5 && echo.glow) echo.glow *= Game.GLOW_ECHO;
    }
    var bless = game.blessing && game.blessing.uses > 0 ? game.blessing.genes : null;
    if (bless) { game.blessing.uses--; if (game.blessing.uses <= 0) game.blessing = null; }
    var child = SB.Genome.cross(ga, gb, game.rng, echo, bless, Game.CARE_MOMENTUM[Game.care(game) <= 1 ? 0 : 1]);
    child.gen = Math.max(a.gen || 1, b.gen || 1) + 1;
    if (a.clade != null) child.clade = game.rng.chance(0.5) ? a.clade : b.clade;
    var egg = SB.World.add(game.world, game, "egg", x, z, {
      genome: child, parents: [a.id, b.id].filter(function (v) { return v != null; }), gen: child.gen, progress: 0,
      tribe: a.tribe || 0, blessed: !!bless, echo: echo,
      ideas: inherit(a, b), vocab: inheritWords(a, b)
    });
    if (SB.FirstHour) SB.FirstHour.onEgg(game, egg, a, b, bless); // what the baby leans toward, and why
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
    var c = Game.spawnSmol(game, { genome: d.genome, x: egg.x, z: egg.z, gen: d.gen || 1, parents: d.parents || [], name: d.name, tribe: d.tribe, ideas: d.ideas, sex: d.twins ? "f" : null, how: "hatch" });
    var twin = null;
    if (d.twins && d.genome2) { // the escape pod: a girl and a boy climb out
      twin = Game.spawnSmol(game, { genome: d.genome2, x: egg.x + 0.7, z: egg.z + 0.3, gen: 1, parents: [], tribe: d.tribe, sex: "m", how: "hatch" });
      d.twin = twin;
    }
    if (d.starter) [c, twin].forEach(function (s) {
      if (!s) return;
      s.chem.hunger = 0.72; s.chem.bored = 0.15;
      SB.Brain.dream(s.brain, [{ drive: SB.D.hunger, noun: SB.N.food, verb: SB.V.eat, s: 1 }], 80, game.rng);
    });
    if (SB.Render && SB.Render.camera) c.facing = Math.atan2(SB.Render.camera.eye[0] - c.x, SB.Render.camera.eye[2] - c.z) || 0;
    SB.World.remove(game.world, egg);
    game.stats.hatched++;
    if (c.gen > game.stats.maxGen) game.stats.maxGen = c.gen;
    if (c.tier > (game.stats.maxTier || 0)) {
      for (var ti = (game.stats.maxTier || 0) + 1; ti <= c.tier; ti++) if (ti >= 1) Game.unlock(game, SB.TIERS[ti].id); // a skipped tier still counts
      game.stats.maxTier = c.tier;
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

  // wopts: the "create world" choices (settings.world); old saves and default islands have none
  Game.create = function (seed, n, wopts) {
    seed = seed || SB.newSeed();
    SB.setWorldN(n || SB.WORLD_N_NEW);
    SB.WORLD_OPTS = SB.worldFx(wopts);
    var game = {
      v: 2, seed: seed, time: 0, speed: 1, rng: SB.rng(seed ^ 0x5bd1e995), nextId: 1,
      world: null, creatures: [], selectedId: null,
      hand: { x: 0, y: 0, z: 0, visible: false, tool: "grab", heldId: null, saying: null, sayT: 0 },
      family: {}, achievements: {}, tutorial: { step: 0, done: false }, log: [],
      stats: { hatched: 0, eggsLaid: 0, maxGen: 1, wordsTaught: 0, tickles: 0, taps: 0, deaths: 0, bestIQ: 0, grumpNights: 0, cured: 0, imported: 0, exported: 0, maxTier: 0, built: 0, crafted: 0, miracles: 0, prayersAnswered: 0 },
      sparks: 12, prayers: [], blessing: null, culture: null, tribes: null, villages: null, clades: null,
      lang: SB.Lang.create(seed), created: Date.now(), playTime: 0, settings: wopts ? { world: wopts } : {}
    };
    game.world = SB.World.create(game, seed);
    game.time = SB.DAY_LENGTH * 0.335; // golden morning
    game.world.time = game.time;
    SB.Society.init(game);
    SB.Species.init(game);
    if (SB.Sites) SB.Sites.generate(game);
    return game;
  };

  Game.newGame = function (seed, n, wopts) {
    var g = Game.create(seed, n, wopts);
    var nest = g.world.T.nest;
    // the founders' escape pod (an "egg" underneath: tap it open). two unrelated blobs, a girl and a boy.
    // a "crew" start lands a second pod next to it
    for (var p = 0; p < (SB.wopt(g, "crew") >= 4 ? 2 : 1); p++) {
      var egg = SB.World.add(g.world, g, "egg", nest.x + p * 2.4, nest.z - p * 1.2, { genome: SB.Genome.random(g.rng, { species: "smol" }), genome2: SB.Genome.random(g.rng, { species: "smol" }), parents: [], gen: 1, progress: 0, starter: true, pod: true, twins: true });
      [egg.data.genome, egg.data.genome2].forEach(function (gn) {
        var ins = gn.instincts, hasEat = false;
        for (var i = 0; i < ins.length; i++) if (ins[i].drive === SB.D.hunger && ins[i].noun === SB.N.food && ins[i].verb === SB.V.eat) { ins[i].s = Math.max(ins[i].s, 0.8); hasEat = true; }
        if (!hasEat) ins.push({ drive: SB.D.hunger, noun: SB.N.food, verb: SB.V.eat, s: 0.8 });
      });
    }
    // an apple waits by the nest, and a gift from the sky
    var a = SB.World.add(g.world, g, "apple", nest.x + 1.6, nest.z + 0.6, {});
    a.data.starterApple = true;
    SB.World.add(g.world, g, "ball", nest.x - 1.8, nest.z + 1.2, {});
    return g;
  };

  // new game+: a new island, settled by two descendants of your best smols. They keep their looks,
  // personalities and instincts, but the island takes their brains back down to tool-users. The
  // storyteller remembers, and pushes harder each time round.
  // a prayer waits at least a minute of island time and half a minute of yours, so fast-forward doesn't eat it
  Game.prayerLive = function (game, p) { var gt = game.time - p.t; return gt < 60 || (gt < 600 && (game.playTime || 0) - (p.rt || 0) < 30); };
  Game.champions = function (game) {
    var sm = Game.smols(game).slice().sort(function (a, b) { return (b.tier - a.tier) || ((b.iq || 0) - (a.iq || 0)) || (b.age - a.age); });
    var f = sm.find(function (c) { return c.sex === "f"; }) || sm[0], m = sm.find(function (c) { return c.sex === "m" && c !== f; }) || sm.find(function (c) { return c !== f; });
    return [f, m].filter(Boolean);
  };
  Game.newGamePlus = function (prev, seed) {
    var g = Game.newGame(seed, prev.world && prev.world.T ? prev.world.T.N : 0, prev.settings && prev.settings.world), champs = Game.champions(prev), egg = g.world.items.find(function (o) { return o.data && o.data.pod; });
    var cap = { social: 0.45, planning: 0.4, head: 0.45, recall: 0.45, glow: 0.5 }, keep = { limbs: 1, arms: 1, dexterity: 1, senses: 1, fins: 1, fluff: 1, horns: 1, wings: 1 };
    function heir(c) {
      var ge = SB.Genome.forTier(g.rng, 2), src = c.genome;
      SB.Genome.GENES.forEach(function (k) {
        if (src.genes[k] == null) return;
        if (cap[k] != null) ge.genes[k] = Math.max(ge.genes[k], Math.min(cap[k], src.genes[k]));
        else if (keep[k] || SB.Genome.EVO_GENES.indexOf(k) < 0) ge.genes[k] = src.genes[k];
      });
      ge.instincts = JSON.parse(JSON.stringify(src.instincts || ge.instincts));
      ge.driveW = (src.driveW || ge.driveW).slice();
      return ge;
    }
    if (egg && champs.length) {
      egg.data.genome = heir(champs[0]); egg.data.genome2 = heir(champs[1] || champs[0]);
      egg.data.heirs = champs.map(function (c) { return c.name; });
      // the old stories survive: the girl remembers a few simple ideas from home, and can teach them
      var keep = SB.Ideas.LIST.filter(function (d) { return prev.culture.found[d.id] && d.tier <= 2 && !d.pov; }).slice(0, 3);
      egg.data.ideas = {}; keep.forEach(function (d) { egg.data.ideas[d.id] = 1; });
    }
    g.ngPlus = (prev.ngPlus || 0) + 1;
    g.settings = JSON.parse(JSON.stringify(prev.settings || {}));
    g.tutorial.done = true; // they've done this before
    g.sparks += 10 * Math.min(3, g.ngPlus);
    // a new island in the world list; the old one stays saved under its own name
    g.wid = SB.Save && SB.Save.newWid ? SB.Save.newWid() : null;
    g.wname = String(prev.wname || "my island").replace(/ · new game\+.*$/, "").slice(0, 26) + " · new game+" + (g.ngPlus > 1 ? " " + g.ngPlus : "");
    return g;
  };

  // the spire is finished: the end of the long thought (the first time), and every mind left thinks faster
  SB.bus.on("built", function (d) {
    var g = Game.current;
    if (!g || d.st.kind !== "spire" || !d.st.done) return;
    Game.unlock(g, "bigthought"); g.culture.spireBoost = true;
    SB.bus.emit("bigThought", { st: d.st, first: !g.ended });
    g.ended = true;
  });

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

  // close family: one is the other's parent or grandparent, or they share a parent or grandparent
  function lineage(game, id, out, depth) {
    var f = game.family[id];
    if (!f || depth <= 0) return out;
    for (var i = 0; i < f.parents.length; i++) { out[f.parents[i]] = 1; lineage(game, f.parents[i], out, depth - 1); }
    return out;
  }
  Game.related = function (game, a, b) {
    if (!a || !b || a.id === b.id) return !!a && a === b;
    var la = lineage(game, a.id, {}, 2), lb = lineage(game, b.id, {}, 2);
    if (la[b.id] || lb[a.id]) return true;
    for (var k in la) if (lb[k]) return true;
    return false;
  };

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
    if (game.godHeat > 0) game.godHeat = Math.max(0, game.godHeat - dt / 60);
    if (game.spoil > 0) game.spoil = Math.max(0, game.spoil - dt * 0.0005); // about 3% a minute: leave them be and they relearn to fend for themselves
    if (SB.Social) SB.Social.tick(game, dt);
    if (SB.Funeral) SB.Funeral.tick(game, dt);
    if (SB.Orders) SB.Orders.tick(game, dt);
    if (SB.FirstHour) SB.FirstHour.tick(game, dt);
    if (SB.Tricks && !game.offline) SB.Tricks.tick(game, dt);
    if (SB.Quests && !game.offline) SB.Quests.tick(game, dt);
    if (SB.Civ) SB.Civ.tick(game, dt);
    if (SB.Economy) SB.Economy.tick(game, dt);
    if (SB.Director) SB.Director.tick(game, dt);
    if (SB.Sites && !game.offline) SB.Sites.tick(game, dt);
    if (SB.Threats) SB.Threats.tick(game, dt);
    if (SB.Surv) SB.Surv.tick(game, dt); // v4.4: hit-point animations, rocks and vines growing back, packs
    SB.Ideas.nurse(game, dt);
    if (SB.Strangers) { game.strT = (game.strT || 0) + dt; if (game.strT >= 1) { SB.Strangers.tick(game, game.strT); game.strT = 0; } }
    game.wordsT = (game.wordsT || 0) - dt;
    if (game.wordsT <= 0 && SB.Words) { game.wordsT = 3; SB.Words.update(game); }
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
    if (game.time / SB.DAY_LENGTH >= 2.7) Game.unlock(game, "day7");
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
      if (iq >= 150) Game.unlock(game, "iq100");
      if (iq >= 220) Game.unlock(game, "iq150");
      if (iq >= 320) Game.unlock(game, "iq250");
      if (c.stage >= 4) Game.unlock(game, "elder");
      if (c.visited && Object.keys(c.visited).length >= 6) Game.unlock(game, "explorer");
      if (c.gen >= 1) game.lastGenome = c.genome;
    }
    if (game.stats.bestIQ > best && window.cc && cc.score) try { cc.score(Game.score(game)); } catch (e) {}
    var found = Object.keys(game.culture.found).length;
    if (found >= 1) Game.unlock(game, "eureka");
    if (found >= 5) Game.unlock(game, "ideas5");
    if (found >= 15) Game.unlock(game, "ideas15");
    if (found >= SB.Ideas.LIST.filter(function (d) { return !d.pov; }).length) Game.unlock(game, "ideasAll");
    if ((game.stats.built || 0) >= 1) Game.unlock(game, "built");
    if (game.villages.length) Game.unlock(game, "village");
    if (game.culture.lostCount) Game.unlock(game, "lost");
    // expire unanswered prayers
    game.prayers = (game.prayers || []).filter(function (p) { return !p.answered && Game.prayerLive(game, p); });
  }

  // simple bus-driven bookkeeping
  function wireBus() {
    SB.bus.on("eureka", function (d) { if (!game) return; if (d.first) Game.addSparks(game, 12, d.c); });
    SB.bus.on("learnWord", function () { if (game && Game.smols(game).length <= 6) Game.addSparks(game, 1, null); }); // a reward for the first lessons, not a fountain for a big tribe
    SB.bus.on("newBiome", function (d) { if (!game) return; Game.addSparks(game, 4, null); Game.note(game, "your smols found " + (/^[aeiou]/.test(SB.BIOMES[d.biome].name) ? "an " : "a ") + SB.BIOMES[d.biome].name + "! 🧭"); });
    SB.bus.on("teach", function (d) { if (d.learned && game) Game.unlock(game, "teach"); });
    SB.bus.on("lightning", function (d) { if (!game) return; var near = game.creatures.some(function (c) { return c.alive && c.species === "smol" && SB.dist(c.x, c.z, d.x, d.z) < 16; }); if (near) Game.unlock(game, "lightning"); });
    SB.bus.on("wildfire", function () { if (game) Game.unlock(game, "wildfire"); });
    // a prayer answered with the right miracle is worth a lot; a comforting tickle a little; a spoiled tribe's demands nothing
    SB.bus.on("prayerAnswered", function (d) { if (!game) return; game.stats.prayersAnswered++; Game.addSparks(game, Game.prayerPay(game, d.how, d.prayer), d.c); Game.unlock(game, "prayer"); });
    SB.bus.on("dawn", function (d) { if (game && ((d && d.grumps) || game.world.nightGrumps) > 0) { game.stats.grumpNights++; Game.unlock(game, "grump"); } });
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var dtReal = Math.max(0, Math.min(0.1, (now - last) / 1000 || 0)); // never backwards: a negative step makes the camera easing blow up
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
    if (!(SB.Intro && SB.Intro.covering)) SB.Render.frame(game, dtReal, alpha); // the opening story covers the screen: skip drawing the island under it
    if (SB.Threats && SB.Threats.frame && !paused) SB.Threats.frame(game, dtReal);
    if (SB.UI && SB.UI.frame) SB.UI.frame(game, dtReal);
    saveT += dtReal;
    if (saveT > 20) { saveT = 0; try { SB.Save.save(game); } catch (e) {} }
    scoreT += dtReal;
    if (scoreT > 30) { scoreT = 0; if (window.cc && cc.score && !game.showcase) try { cc.score(Game.score(game)); } catch (e) {} }
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
    // coarse half-second steps, and never more than ~8 s of real time (slow phones simulate a bit less)
    var done = 0, dt = 0.5, wallStart = performance.now();
    function chunk() {
      var t0 = performance.now();
      while (done < simSec && performance.now() - t0 < 30) {
        farAll(g);
        Game.step(g, dt);
        done += dt;
      }
      if (performance.now() - wallStart > 8000) simSec = done;
      if (onProgress) onProgress(Math.min(1, done / simSec));
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
    SB.Music && SB.Music.init && SB.Music.init();
    var canvas = document.getElementById("view"), ov = document.getElementById("overlay");
    var look = null; try { look = window.localStorage.getItem("smolbrains-look"); } catch (e) {}
    if (/[?&]look=3d/.test(location.search)) look = "3d"; else if (/[?&]look=pixel/.test(location.search)) look = "pixel"; else if (/[?&]look=hd/.test(location.search)) look = "hd";
    if (!SB.Render.init(canvas, ov, { pixel: look !== "3d", hd: look === "hd" })) { SB.UI.noWebGL(); return; }
    try { if (/[?&]perf=1/.test(location.search)) SB.Render.perf.show = true; } catch (e) {}
    hookPage();
    if (window.cc && cc.start) try { cc.start(); } catch (e) {}
    // how this visit starts: straight into the live island (a reload from inside the game, or ?play=1 for
    // tests), or the title screen, after "computer cooked games presents" on a fresh visit
    var flag = null; try { flag = window.sessionStorage.getItem("smolbrains-boot"); window.sessionStorage.removeItem("smolbrains-boot"); } catch (e) {}
    var q = location.search || "", seedFromUrl = urlSeed();
    try { var ns = +window.sessionStorage.getItem("smolbrains-newseed"); window.sessionStorage.removeItem("smolbrains-newseed"); if (ns > 0 && !seedFromUrl) seedFromUrl = ns; } catch (e) {}
    if (/[?&](play|notitle)=1/.test(q) || flag === "play" || !SB.Title) return enterLive(seedFromUrl);
    var title = function () {
      hideSplash();
      SB.Title.show({
        shareSeed: seedFromUrl || 0,
        onPlay: function (d) { SB.Title.hide(); enterData(d); },
        onNew: function (o) { SB.Title.hide(); enterNew(o); }
      });
    };
    if (flag === "title" || /[?&]nopresents=1/.test(q)) { SB.Title.prepare(); title(); }
    else { hideSplash(); SB.Title.presents(title); setTimeout(function () { SB.Title.prepare(); }, 900); }
  }
  function hideSplash() { var sp = document.getElementById("splash"); if (sp) { sp.classList.add("gone"); setTimeout(function () { sp.remove(); }, 800); } }
  // reloads that should skip the title (switching islands from inside the game) or land on it
  Game.reloadTo = function (where) {
    try { window.sessionStorage.setItem("smolbrains-boot", where || "title"); } catch (e) {}
    window.location.reload();
  };

  // the play URL without the island it opened (?world= / ?seed=), keeping test flags like ?cctest=1
  function cleanUrl() {
    var keep = [];
    try { new URLSearchParams(location.search).forEach(function (v, k) { if (k !== "world" && k !== "seed") keep.push(encodeURIComponent(k) + "=" + encodeURIComponent(v)); }); } catch (e) {}
    return location.pathname + (keep.length ? "?" + keep.join("&") : "");
  }
  // the island in the live save (the pre-v3.6 boot, still used by ?play=1 and in-game reloads)
  function enterLive(seedFromUrl) {
    var g = null, data = null, migrated = false;
    try { data = SB.Save.load(); } catch (e) { data = null; }
    // a shared world link opens that world, but never silently over an island you already have
    if (data && seedFromUrl && data.seed !== seedFromUrl) {
      var day = Math.floor((data.time || 0) / SB.DAY_LENGTH) + 1;
      var code = ""; try { var q = new URLSearchParams(location.search); code = q.get("world") || q.get("seed") || ""; } catch (e) {}
      if (window.confirm("this link opens the world " + (code || SB.worldCode(seedFromUrl)) + ". your own island (day " + day + ") will be replaced. open it?")) data = null;
      else { seedFromUrl = 0; try { history.replaceState(null, "", cleanUrl()); } catch (e) {} }
    }
    if (data) { try { g = SB.Save.revive(data); } catch (e) { console.warn("[smol] save load failed, new game", e); g = null; } }
    if (!g && !seedFromUrl) {
      var v1 = SB.Save.loadV1();
      if (v1) { try { g = SB.Save.migrateV1(v1); migrated = !!g; } catch (e) { console.warn("[smol] v1 migration failed", e); g = null; } }
    }
    var fresh = !g;
    if (!g) g = Game.newGame(seedFromUrl || 0, 0, { gv: SB.WORLD_GV });
    enter(g, { fresh: fresh, migrated: migrated, data: fresh ? null : data });
  }
  // an island picked on the title screen (already made the live save)
  function enterData(d) {
    var g = null;
    try { g = SB.Save.revive(d); } catch (e) { console.warn("[smol] save load failed", e); g = null; }
    if (!g) { var v1 = SB.Save.loadV1(); if (v1 && !d) try { g = SB.Save.migrateV1(v1); } catch (e) { g = null; } }
    if (!g) return enterNew({});
    enter(g, { fresh: false, data: d });
  }
  // a new island from "create world"
  function enterNew(o) {
    o = o || {};
    var g = Game.newGame(o.seed || 0, o.n || 0, o.world || { gv: SB.WORLD_GV });
    g.wid = SB.Save.newWid(); g.wname = o.name || null;
    if (o.story) g.settings.storyteller = o.story;
    try { history.replaceState(null, "", cleanUrl()); } catch (e) {}
    Game.fromTitle = true;
    enter(g, { fresh: true });
  }
  function enter(g, o) {
    game = Game.current = g;
    SB.Render.setWorld(g);
    SB.UI.init(g, { fresh: o.fresh, migrated: o.migrated });
    Game.start(g);
    try { SB.Save.save(g); } catch (e) {}
    SB.Save.cloud && SB.Save.cloud();
    // offline progress
    var data = o.data;
    if (!o.fresh && data && data.savedAt) {
      var away = (Date.now() - data.savedAt) / 1000, budget = Game.offlineBudget(away);
      if (budget > 30 && SB.UI.awayScreen) SB.UI.awayScreen(g, away, budget);
    }
  }
  var hooked = false;
  function hookPage() {
    if (hooked) return;
    hooked = true;
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        try { SB.Save.save(Game.current); } catch (e) {}
        if (window.cc && cc.end && !Game.current.showcase) try { cc.end({ score: Game.score(Game.current) }); } catch (e) {}
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
      else if (m.type === "cc-restart" && Game.current && !Game.current.showcase) SB.UI && SB.UI.confirmRestart && SB.UI.confirmRestart();
    });
    window.ccGameActive = true;
  }
  Game.boot = boot;

  // debug helpers for testing and screenshots: SB.Debug.spawnTier(4), SB.Debug.ideas(), SB.Debug.build("hut")
  SB.Debug = {
    spawnTier: function (tier, n) {
      var g = Game.current, sp = SB.Society.home(g, 0), out = [];
      for (var i = 0; i < (n || 1); i++) {
        var ge = SB.Genome.forTier(g.rng, tier);
        var c = Game.spawnSmol(g, { genome: ge, x: sp.x + (i % 4) * 1.4 - 2, z: sp.z + Math.floor(i / 4) * 1.4 + 2, age: 700 });
        out.push(c);
      }
      g.stats.maxTier = Math.max(g.stats.maxTier || 0, out[0].tier);
      return out;
    },
    ideas: function (c, list) { (list || SB.Ideas.LIST.map(function (d) { return d.id; })).forEach(function (id) { if (SB.Ideas.canHold(c, id)) SB.Ideas.discover(c, id, Game.current); }); },
    reveal: function () { var w = Game.current.world; w.seen.fill(255); w.seenDirty = true; w.seenChunks = {}; for (var i = 0; i < (SB.WORLD_N / SB.CHUNK) * (SB.WORLD_N / SB.CHUNK); i++) w.seenChunks[i] = 1; },
    build: function (kind, x, z) { var g = Game.current, sp = SB.Society.home(g, 0); return SB.World.addStructure(g.world, g, kind, x == null ? sp.x + 3 : x, z == null ? sp.z : z, { done: true }); },
    skip: function (sec) { var g = Game.current; for (var t = 0; t < sec; t += SB.TICK) Game.step(g, SB.TICK); }
  };

  if (typeof document !== "undefined" && document.getElementById) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }
})();
