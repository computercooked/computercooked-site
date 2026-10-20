/* smol brains 2 — ideas.js
   Technology lives in heads, not in a menu. An idea is discovered by one curious smol doing the right thing
   at the right moment (holding a stick near a fruit tree, standing by a lightning fire...), then spreads by
   watching, teaching and story poles. If everyone who knows an idea dies before passing it on, it's lost.
   This file has the idea web, discovery, learning, crafting recipes, tool effects, gathering, and the little
   planner that turns "make" or "build" into a sequence of steps (deeper plans need the planning gene). */
(function () {
  "use strict";
  var SB = window.SB;
  var I = (SB.Ideas = {});
  var K = SB.KINDS, NK = SB.NODES, SK = SB.STRUCTS;

  /* ---------------- the idea web ----------------
     kind: craft (make an item), build (a structure), skill (a behaviour). tier: lowest evolution tier that can hold it.
     make: {in: {kind: n}, tool: kind not consumed, at: "fire"|"kiln", out, time}. hint: shown as "???" until found. */
  var LIST = (I.LIST = [
    { id: "poke", name: "poke stick", icon: "🥢", tier: 2, needs: [], kind: "craft", make: { in: { stick: 1 }, out: "pokestick", time: 2 }, desc: "a stick, but for poking. knocks fruit out of trees (even the tall palms).", hint: "a smol with hands, a stick and a fruit tree" },
    { id: "bonk", name: "bonking", icon: "🔨", tier: 2, needs: [], kind: "craft", make: { in: { stone: 1 }, out: "hammer", time: 2 }, desc: "a rock held just right. cracks hardnuts, chips stones off boulders.", hint: "a rock and a hard nut" },
    { id: "weave", name: "weaving", icon: "🧺", tier: 2, needs: [], kind: "craft", make: { in: { fiber: 2 }, out: "basket", time: 5 }, desc: "reeds over, reeds under. a basket carries five things instead of two.", hint: "fiddling with reed fibre" },
    { id: "knap", name: "knapping", icon: "🔪", tier: 2, needs: ["bonk"], kind: "craft", make: { in: { flint: 1 }, tool: "hammer", out: "blade", time: 3 }, desc: "hit flint with a hammerstone until it's sharp. cuts reeds, bushes, meat.", hint: "a hammerstone meets flint" },
    { id: "fire", name: "fire", icon: "🔥", tier: 2, needs: [], kind: "skill", desc: "hot, bright, dangerous, wonderful. smols who know fire can light campfires and carry torches.", hint: "be near something burning. lightning helps." },
    { id: "campfire", name: "campfire", icon: "🏕", tier: 2, needs: ["fire"], kind: "build", build: "campfire", desc: "stones in a ring, sticks in the middle. warmth, light, cooking. grumps keep away.", hint: "know fire" },
    { id: "torch", name: "torch", icon: "🔦", tier: 2, needs: ["fire"], kind: "craft", make: { in: { stick: 1 }, at: "fire", out: "torch", time: 1.5 }, desc: "fire you can carry. scares grumps, lights campfires.", hint: "a stick and a fire" },
    { id: "cook", name: "cooking", icon: "🍢", tier: 2, needs: ["fire"], kind: "craft", make: { in: { food: 1 }, at: "fire", out: "cooked", time: 3 }, desc: "food + fire = more food. cooked food never makes you sick.", hint: "food near a fire" },
    { id: "spear", name: "spear", icon: "🔱", tier: 2, needs: ["knap", "poke"], kind: "craft", make: { in: { stick: 1, flint: 1 }, out: "spear", time: 4 }, desc: "for fishing, hunting hoppers, and politely suggesting grumps leave.", hint: "a sharp stone and a long stick" },
    { id: "chop", name: "stone axes", icon: "🪓", tier: 2, needs: ["knap"], kind: "craft", make: { in: { blade: 1, stick: 1 }, out: "stoneaxe", time: 4 }, desc: "lash a blade to a stick and trees become logs. a log is worth three sticks when building.", hint: "a blade, a stick, and a tree" },
    { id: "club", name: "clubs", icon: "🏏", tier: 2, needs: ["bonk"], kind: "craft", make: { in: { stick: 1, stone: 1 }, out: "club", time: 3 }, desc: "for when grumps come too close. a grump hit with a club runs off.", hint: "holding a stick, face to face with a grump" },
    { id: "fishing", name: "fishing", icon: "🎣", tier: 3, needs: ["weave"], kind: "craft", make: { in: { stick: 1, fiber: 1 }, out: "rod", time: 4 }, desc: "a stick and reed string. fishers sit by the water and come back with fish.", hint: "a stick and some reed, by the water" },
    { id: "sewing", name: "fur cloaks", icon: "🧥", tier: 3, needs: ["weave", "spear"], kind: "craft", make: { in: { fur: 2, fiber: 1 }, out: "cloak", time: 6 }, desc: "bunny fur sewn with reed thread. smols in cloaks barely feel the winter.", hint: "fur, reed, and a cold day" },
    { id: "herbal", name: "herb lore", icon: "🌿", tier: 3, needs: [], kind: "skill", desc: "healroot cures sickness. herbalists bring it to sick friends.", hint: "a sick smol eats healroot and gets better" },
    { id: "share", name: "sharing", icon: "🎁", tier: 3, needs: [], kind: "skill", desc: "giving food to the hungry. tribes that share don't starve.", hint: "a hungry friend and some food" },
    { id: "song", name: "song", icon: "🎶", tier: 3, needs: ["fire"], kind: "skill", desc: "singing together around the fire. cures boredom and loneliness for everyone listening, and they love you more for it.", hint: "friends, a fire, a night" },
    { id: "farm", name: "farming", icon: "🌾", tier: 4, needs: [], kind: "build", build: "farm", desc: "put seeds in the ground on purpose. grain grows by itself.", hint: "seeds, and a smol who plans ahead" },
    { id: "hut", name: "huts", icon: "🛖", tier: 4, needs: ["weave"], kind: "build", build: "hut", desc: "sticks and reed thatch. warm, dry, grump-proof sleep.", hint: "a builder who's cold and knows weaving" },
    { id: "pottery", name: "pottery", icon: "🏺", tier: 4, needs: ["fire"], kind: "craft", make: { in: { clay: 2 }, at: "fire", out: "pot", time: 6 }, desc: "clay + fire = a pot. pots brew medicine and bake bread.", hint: "clay near a fire" },
    { id: "totem", name: "story poles", icon: "🗿", tier: 4, needs: ["knap"], kind: "build", build: "totem", desc: "the tribe's ideas, carved in wood. study it to learn them. ideas on a pole are never forgotten.", hint: "a builder with a blade" },
    { id: "wall", name: "palisades", icon: "🪵", tier: 4, needs: ["hut"], kind: "build", build: "wall", desc: "pointy fences that grumps won't cross.", hint: "grumps, again" },
    { id: "bridge", name: "bridges", icon: "🌉", tier: 4, needs: ["hut"], kind: "build", build: "bridge", desc: "sticks across a river. the other side is now this side.", hint: "a builder at the water's edge" },
    { id: "kiln", name: "kilns", icon: "🧱", tier: 5, needs: ["pottery"], kind: "build", build: "kiln", desc: "a clay oven hot enough to melt rock.", hint: "a thinker who knows pottery" },
    { id: "smelt", name: "smelting", icon: "🥉", tier: 5, needs: ["kiln"], kind: "craft", make: { in: { ore: 1 }, at: "kiln", out: "metal", time: 8 }, desc: "green rock in, shiny copper out.", hint: "ore and a kiln" },
    { id: "axe", name: "axes", icon: "🪓", tier: 5, needs: ["smelt"], kind: "craft", make: { in: { metal: 1, stick: 1 }, out: "axe", time: 6 }, desc: "chop a tree, get a pile of sticks. the stump grows back.", hint: "copper and a stick" },
    { id: "brew", name: "brewing", icon: "🧪", tier: 5, needs: ["pottery", "herbal"], kind: "craft", make: { in: { herb: 1 }, tool: "pot", at: "fire", out: "potion", time: 5 }, desc: "boiled healroot. cures almost anything.", hint: "healroot, a pot, a fire" },
    { id: "bake", name: "baking", icon: "🍞", tier: 5, needs: ["pottery", "farm"], kind: "craft", make: { in: { grain: 2 }, tool: "pot", at: "fire", out: "bread", time: 6 }, desc: "grain + pot + fire = bread. feeds a village.", hint: "grain and a pot by the fire" },
    { id: "writing", name: "writing", icon: "📜", tier: 5, needs: ["totem"], kind: "skill", desc: "marks that mean things. story poles teach twice as fast and hold every idea.", hint: "a thinker studying a story pole" },
    { id: "workshop", name: "workshops", icon: "🛠", tier: 5, needs: ["axe"], kind: "build", build: "workshop", desc: "a proper place to make things. crafting is twice as fast nearby.", hint: "an axe and ambition" },
    { id: "windmill", name: "windmills", icon: "🌬", tier: 5, needs: ["axe", "farm"], kind: "build", build: "windmill", desc: "wind turns the stones. nearby farms grow much faster.", hint: "farms, axes, wind" },
    { id: "lens", name: "lenses", icon: "🔮", tier: 5, needs: ["smelt"], kind: "craft", make: { in: { crystal: 1, metal: 1 }, out: "lens", time: 8 }, desc: "a thought crystal in a copper ring. thinking through it makes ideas come faster.", hint: "a thought crystal and copper" },
    { id: "astronomy", name: "astronomy", icon: "🔭", tier: 5, needs: ["lens", "writing"], kind: "build", build: "observatory", desc: "a dome for watching the sky. thinkers get ideas from the stars and know when it'll rain.", hint: "a lens and a night sky" },
    { id: "resonance", name: "resonance", icon: "💠", tier: 6, needs: ["lens"], kind: "skill", desc: "ascended smols near thought crystals think together, as one big brain.", hint: "an ascended smol meets a thought crystal" },
    { id: "bigthought", name: "the big thought", icon: "✨", tier: 6, needs: ["resonance", "astronomy"], kind: "build", build: "spire", desc: "a spire that joins every smol mind at once. build it to finish the long thought.", hint: "everything." }
  ]);
  var BY = (I.BY_ID = {});
  LIST.forEach(function (d, i) { d.index = i; BY[d.id] = d; });
  I.forStruct = {};
  LIST.forEach(function (d) { if (d.build) I.forStruct[d.build] = d.id; });

  // what each node gives when a smol gathers from it: [item, tool needed (or null), seconds, min tier]
  var GATHER = (I.GATHER = {
    oak: ["stick", null, 2, 0], birch: ["stick", null, 2, 0], pine: ["stick", null, 2, 0], deadtree: ["stick", null, 1.5, 0], giant: ["stick", null, 2, 0],
    reeds: ["fiber", null, 2.5, 2], boulder: ["stone", null, 3, 0], flintrock: ["flint", null, 3.5, 2], claybank: ["clay", null, 2.5, 2],
    orevein: ["ore", "hammer", 4, 4], crystals: ["crystal", "hammer", 5, 4], herbs: ["herb", null, 2, 0], bush: ["berry", null, 1.5, 0], shrooms: ["shroom", null, 1.5, 0]
  });

  /* ---------------- knowing ---------------- */

  I.known = function (c, id) { return !!(c.ideas && c.ideas[id] >= 1); };
  I.canHold = function (c, id) {
    var d = BY[id];
    if (!d || c.species !== "smol" || c.tier < d.tier) return false;
    for (var i = 0; i < d.needs.length; i++) if (!I.known(c, d.needs[i])) return false;
    return true;
  };
  I.count = function (c) { var n = 0; for (var k in c.ideas) if (c.ideas[k] >= 1) n++; return n; };

  // the world's word for an idea (invented the first time anyone discovers it)
  I.word = function (game, id) {
    var cu = game.culture;
    if (!cu.words[id]) {
      var r = SB.rng((game.seed + BY[id].index * 7717) >>> 0);
      cu.words[id] = SB.Lang.fresh(game.lang, r, BY[id].tier >= 5 ? 3 : 2);
      SB.Lang.addWord(cu.words[id], { type: "idea", id: id });
    }
    return cu.words[id];
  };

  // amount 0..1 of progress; returns true when the idea becomes known
  I.learn = function (c, id, amount, game, how) {
    if (!I.canHold(c, id) || I.known(c, id)) return false;
    var learnK = (0.6 + (c.genome.genes.learnRate || 0.5) * 0.8) * (1 + (SB.Words && game ? SB.Words.smarts(game) : 0)) * (1 - 0.4 * ((game && game.spoil) || 0)); // shared words help ideas spread; spoiled smols can't be bothered
    c.ideas[id] = Math.min(1, (c.ideas[id] || 0) + amount * learnK);
    if (c.ideas[id] >= 1) {
      c.ideas[id] = 1;
      SB.bus.emit("ideaLearned", { c: c, id: id, how: how || "learned" });
      if (SB.Creature && SB.Creature.emote) SB.Creature.emote(c, "idea", 2);
      return true;
    }
    return false;
  };

  // A eureka: the first time anyone (alive) figures it out.
  I.discover = function (c, id, game) {
    if (!I.canHold(c, id) || I.known(c, id)) return false;
    c.ideas[id] = 1;
    c.stats.discoveries = (c.stats.discoveries || 0) + 1;
    var cu = game.culture, first = !cu.found[id];
    var word = I.word(game, id);
    if (first) cu.found[id] = { by: c.name, byId: c.id, t: game.time, gen: c.gen, word: word };
    cu.lost[id] = 0;
    habit(c, "think", 3);
    if (SB.Creature) { SB.Creature.emote(c, "idea", 3); SB.Creature.say(c, word + "!", game); }
    SB.bus.emit("eureka", { c: c, id: id, first: first, word: word });
    if (first) SB.Game.note(game, c.name + " discovered " + BY[id].name + " " + BY[id].icon + " (they call it \"" + word + "\")");
    if (window.cc && cc.event) try { cc.event("discovery", { id: id, gen: c.gen }); } catch (e) {}
    return true;
  };

  function habit(c, k, amt) { if (c.habits) c.habits[k] = (c.habits[k] || 0) + amt; }
  I.habit = habit;

  /* ---------------- discovery ---------------- */

  // How much this moment looks like the birth of an idea (0..1). ctx: {verb, noun, target, held, tool, nearFire, friends, night, sick, cold, wild}
  var TRIGGERS = {
    poke: function (x) { return x.held === "stick" && x.noun === "plant" && (x.verb === "use" || x.verb === "play" || x.verb === "hit") ? 0.7 : x.held === "stick" && x.verb === "play" ? 0.15 : 0; },
    bonk: function (x) { return (x.held === "stone" || x.held === "flint") && (x.targetKind === "nut" || x.noun === "stone") && (x.verb === "use" || x.verb === "hit" || x.verb === "play") ? 0.7 : x.held === "stone" && x.verb === "hit" ? 0.2 : 0; },
    weave: function (x) { return x.held === "fiber" && (x.verb === "play" || x.verb === "use" || x.verb === "idle") ? 0.5 : x.noun === "plant" && x.targetKind === "reeds" && x.verb === "play" ? 0.12 : 0; },
    knap: function (x) { return (x.held === "hammer" || x.held === "stone") && (x.targetKind === "flint" || x.targetKind === "flintrock") ? 0.8 : x.held === "flint" && x.verb === "hit" ? 0.3 : 0; },
    fire: function (x) { return x.nearFire ? (x.held === "stick" ? 0.9 : 0.3) : (x.held === "flint" && x.noun === "stone" && x.verb === "hit") ? 0.12 : 0; },
    campfire: function (x) { return x.nearFire && x.held === "stone" ? 0.5 : x.cold && x.held === "stick" ? 0.25 : 0; },
    torch: function (x) { return x.nearFire && x.held === "stick" && x.noun === "fire" ? 0.8 : 0; },
    cook: function (x) { return x.nearFire && x.noun === "fire" && x.heldNoun === "food" ? 0.8 : x.nearFire && x.noun === "food" ? 0.25 : 0; },
    spear: function (x) { return (x.held === "blade" || x.held === "flint") && x.noun === "stick" ? 0.6 : x.held === "pokestick" && x.noun === "stone" && x.targetKind === "flint" ? 0.5 : 0; },
    chop: function (x) { return x.held === "blade" && x.noun === "plant" && (x.verb === "use" || x.verb === "hit") ? 0.6 : x.held === "blade" && x.noun === "stick" ? 0.2 : 0; },
    club: function (x) { return (x.held === "stick" || x.held === "stone") && x.noun === "grump" ? 0.6 : x.held === "stick" && x.verb === "hit" ? 0.1 : 0; },
    fishing: function (x) { return (x.held === "stick" || x.held === "fiber") && x.noun === "water" ? 0.5 : 0; },
    sewing: function (x) { return x.held === "fur" && (x.cold || x.verb === "play" || x.verb === "use") ? 0.6 : x.held === "fur" ? 0.2 : 0; },
    herbal: function (x) { return x.verb === "eat" && x.targetKind === "herb" && x.sick ? 1 : 0; },
    share: function (x) { return x.verb === "give" || (x.noun === "smol" && x.heldNoun === "food" && (x.verb === "talk" || x.verb === "cuddle")) ? 0.6 : 0; },
    song: function (x) { return x.friends >= 2 && x.nearFire && x.night && (x.verb === "talk" || x.verb === "play") ? 0.6 : 0; },
    farm: function (x) { return x.held === "seed" || (x.targetKind === "seed") ? 0.5 : x.held === "grain" ? 0.3 : 0; },
    hut: function (x) { return x.verb === "sleep" && (x.cold || x.raining) ? 0.5 : x.noun === "shelter" && x.held === "stick" ? 0.4 : 0; },
    pottery: function (x) { return x.nearFire && (x.held === "clay" || x.targetKind === "clay") ? 0.7 : 0; },
    totem: function (x) { return x.held === "blade" && (x.noun === "stick" || x.noun === "plant") ? 0.4 : 0; },
    wall: function (x) { return x.noun === "grump" && x.held === "stick" ? 0.5 : x.noun === "grump" && x.verb === "flee" ? 0.1 : 0; },
    bridge: function (x) { return x.noun === "water" && x.held === "stick" ? 0.5 : 0; },
    kiln: function (x) { return x.nearFire && x.noun === "stone" && x.held === "clay" ? 0.6 : x.noun === "fire" && x.held === "clay" ? 0.3 : 0; },
    smelt: function (x) { return x.held === "ore" && x.noun === "fire" ? 0.6 : 0; },
    axe: function (x) { return x.held === "metal" && (x.noun === "plant" || x.noun === "stick") ? 0.6 : 0; },
    brew: function (x) { return x.held === "herb" && x.noun === "fire" && x.hasTool === "pot" ? 0.7 : x.held === "herb" && x.noun === "fire" ? 0.15 : 0; },
    bake: function (x) { return x.held === "grain" && x.noun === "fire" ? 0.5 : 0; },
    writing: function (x) { return x.noun === "totem" && (x.verb === "use" || x.verb === "play") ? 0.5 : 0; },
    workshop: function (x) { return x.verb === "make" && x.hasTool === "axe" ? 0.4 : 0; },
    windmill: function (x) { return x.noun === "crop" && x.windy ? 0.5 : 0; },
    lens: function (x) { return x.held === "crystal" && (x.verb === "play" || x.verb === "use") ? 0.5 : x.noun === "material" && x.targetKind === "crystals" ? 0.15 : 0; },
    astronomy: function (x) { return x.night && x.hasTool === "lens" && (x.verb === "idle" || x.verb === "use") ? 0.6 : x.night && x.noun === "totem" ? 0.15 : 0; },
    resonance: function (x) { return x.tier >= 6 && (x.held === "crystal" || x.targetKind === "crystals" || x.noun === "wonder") ? 0.7 : 0; },
    bigthought: function (x) { return x.tier >= 6 && x.friends >= 2 && (x.noun === "totem" || x.noun === "wonder" || x.held === "crystal") ? 0.4 : 0; }
  };

  var PONDER = 0.004;
  I.tryDiscover = function (c, ctx, game) {
    if (c.species !== "smol" || c.tier < 2) return null;
    var g = c.genome.genes;
    var mind = (0.3 + (g.curiosity || 0.5) * 0.7) * Math.min(2.2, Math.sqrt(SB.Genome.neurons(c.genome) / 24));
    if (c.inspired > 0) mind *= 3;
    if (c.tool != null) { var tl = SB.Game.byId(game, c.tool); if (tl && tl.kind === "lens") mind *= 1.6; }
    if (game.culture && game.culture.spireBoost) mind *= 1.5;
    var found = null;
    for (var i = 0; i < LIST.length; i++) {
      var d = LIST[i], tr = TRIGGERS[d.id];
      if (!tr || I.known(c, d.id) || !I.canHold(c, d.id)) continue;
      var w = tr(ctx);
      // pondering: a smol evolved enough for an idea (and who knows what it builds on) can work it out
      // eventually even if the perfect moment never comes. the right situation is still much faster.
      if (!w) w = PONDER; // (canHold already checked the tier and what it builds on)
      if (!w) continue;
      // things someone else already knows are easier to "get" (you've seen it done)
      var seen = game.culture.found[d.id] ? 1.4 : 1;
      if (game.rng() < w * 0.22 * mind * seen) { found = d.id; break; }
    }
    if (found) I.discover(c, found, game);
    return found;
  };

  /* ---------------- instincts that come with an evolved brain ---------------- */
  var TIER_INST = [
    [],
    [{ drive: "bored", noun: "plant", verb: "play" }, { drive: "hunger", noun: "plant", verb: "play" }],
    [{ drive: "bored", noun: "stick", verb: "pickup" }, { drive: "bored", noun: "stick", verb: "use" }, { drive: "hunger", noun: "plant", verb: "use" }, { drive: "bored", noun: "stone", verb: "use" }, { drive: "bored", noun: "tool", verb: "pickup" }, { drive: "bored", noun: "material", verb: "make" }, { drive: "hunger", noun: "fire", verb: "make" }, { drive: "cold", noun: "fire", verb: "use" }, { drive: "bored", noun: "stone", verb: "make" }],
    [{ drive: "lonely", noun: "smol", verb: "teach" }, { drive: "bored", noun: "smol", verb: "teach" }, { drive: "lonely", noun: "smol", verb: "give" }, { drive: "fear", noun: "hand", verb: "pray" }, { drive: "hunger", noun: "hand", verb: "pray" }],
    [{ drive: "bored", noun: "shelter", verb: "build" }, { drive: "cold", noun: "shelter", verb: "build" }, { drive: "bored", noun: "material", verb: "build" }, { drive: "bored", noun: "stick", verb: "build" }, { drive: "tired", noun: "shelter", verb: "sleep" }, { drive: "hunger", noun: "crop", verb: "use" }],
    [{ drive: "bored", noun: "totem", verb: "use" }, { drive: "bored", noun: "wonder", verb: "approach" }, { drive: "bored", noun: "tool", verb: "make" }, { drive: "sick", noun: "smol", verb: "make" }],
    [{ drive: "bored", noun: "wonder", verb: "build" }, { drive: "lonely", noun: "wonder", verb: "approach" }, { drive: "bored", noun: "material", verb: "build" }]
  ];
  I.tierInstincts = function (tier) {
    var out = [];
    for (var t = 1; t <= tier && t < TIER_INST.length; t++) TIER_INST[t].forEach(function (r) { out.push({ drive: SB.D[r.drive], noun: SB.N[r.noun], verb: SB.V[r.verb], s: 0.55 }); });
    return out;
  };

  /* ---------------- relevance (the brain's "knows a use" input) ---------------- */

  // Does this smol know something to do with a thing of this noun/kind right now?
  I.knowsUse = function (c, noun, kind, game) {
    if (c.tier < 2) return false;
    var tool = c.tool != null ? toolKind(c, game) : null, held = heldKind(c, game);
    if (noun === "plant" && (tool === "pokestick" || tool === "axe" || tool === "stoneaxe" || held === "pokestick")) return true;
    if (noun === "water" && (tool === "spear" || held === "spear" || tool === "rod" || held === "rod")) return true;
    if (noun === "critter" && (tool === "spear" || held === "spear")) return true;
    if (noun === "fire" && (held === "stick" || held === "clay" || heldNoun(c, game) === "food")) return true;
    if (noun === "totem") return true;
    if (noun === "crop") return true;
    for (var i = 0; i < LIST.length; i++) {
      var d = LIST[i];
      if (!d.make || !I.known(c, d.id)) continue;
      for (var k in d.make.in) if (k === kind || (k === "food" && noun === "food")) return true;
    }
    return false;
  };

  function heldItem(c, game) { return c.holding != null ? SB.Game.byId(game, c.holding) : null; }
  function heldKind(c, game) { var h = heldItem(c, game); return h ? h.kind : null; }
  function heldNoun(c, game) { var h = heldItem(c, game); return h ? h.noun : null; }
  function toolKind(c, game) { var t = c.tool != null ? SB.Game.byId(game, c.tool) : null; return t ? t.kind : null; }
  I.heldKind = heldKind; I.toolKind = toolKind;

  function CHOPPABLE(kind) { return kind !== "bush" && kind !== "reeds" && kind !== "herbs" && kind !== "hive" && kind !== "clams" && kind !== "roots" && kind !== "gourds" && kind !== "cactus"; }

  /* ---------------- using things ("use" verb) ---------------- */

  // returns {deltas, chem, msg, ok} — the effect of c using whatever it holds on target (item/node/struct/water)
  I.use = function (c, target, game) {
    var res = { deltas: {}, chem: {}, ok: false, msg: null };
    var world = game.world, r = game.rng;
    var held = heldItem(c, game), hk = held ? held.kind : null, tk = toolKind(c, game);
    var tool = hk && K[hk].tool ? hk : tk; // a tool in hand, else the one on the belt
    var t = target, tt = t.type;
    if (tt === "node") {
      var n = t, def = NK[n.kind];
      if ((tool === "pokestick" || tool === "spear") && def.drops && def.noun === "plant") {
        var o = SB.World.shake(world, game, n, true);
        if (o) { res.ok = true; res.deltas.bored = -0.1; res.msg = "poke!"; habit(c, "hands", 1); }
      } else if ((tool === "axe" || tool === "stoneaxe") && def.noun === "plant" && n.state === "ok" && CHOPPABLE(n.kind)) {
        // a stone axe takes a few swings; copper fells a tree in one. a felled tree gives logs and a stump that regrows
        n.chop = (n.chop || 0) + (tool === "axe" ? 1 : 0.34);
        res.ok = true; res.deltas.bored = -0.1; habit(c, "hands", 1);
        if (n.chop < 1) res.msg = "thok";
        else {
          n.chop = 0; n.state = "stump"; n.regrowT = 600; SB.World.markNode(world, n);
          for (var s = 0; s < (tool === "axe" ? 3 : 2); s++) SB.World.dropFrom(world, game, n, "log");
          SB.World.dropFrom(world, game, n, "stick");
          res.deltas.bored = -0.2; res.msg = "timber!"; habit(c, "hands", 2);
          SB.bus.emit("chop", { c: c, node: n });
        }
      } else if (tool === "hammer" && (n.kind === "boulder" || n.kind === "flintrock" || n.kind === "orevein" || n.kind === "crystals")) {
        SB.World.dropFrom(world, game, n, GATHER[n.kind][0]);
        res.ok = true; res.deltas.bored = -0.08; res.msg = "tok!"; habit(c, "hands", 1);
      } else if (tool === "blade" && n.kind === "bush") {
        var sd = SB.World.add(world, game, "seed", n.x + r.range(-0.6, 0.6), n.z + r.range(-0.6, 0.6), {});
        res.ok = !!sd; res.deltas.bored = -0.08; res.msg = "snip";
      } else if (tool === "blade" && n.kind === "reeds") {
        SB.World.dropFrom(world, game, n, "fiber"); SB.World.dropFrom(world, game, n, "fiber");
        res.ok = true; res.deltas.bored = -0.08;
      } else if (tool === "torch" && def.noun === "plant") {
        // smols don't burn the forest down on purpose. mostly.
        res.msg = "no";
      }
    } else if (tt === "item") {
      if (t.kind === "nut" && (tool === "hammer" || hk === "stone")) {
        SB.World.transform(world, t, "nutmeat");
        res.ok = true; res.msg = "crack!"; res.deltas.bored = -0.1; habit(c, "hands", 1);
      } else if (t.noun === "critter" && tool === "spear") {
        if (r.chance(0.55)) {
          var fx = t.x, fz = t.z;
          SB.World.transform(world, t, "meat"); res.ok = true; res.msg = "got it!"; habit(c, "hands", 1);
          if (r.chance(0.6)) SB.World.add(world, game, "fur", fx + 0.3, fz, {});
          SB.bus.emit("hunt", { c: c });
        }
        else { t.data.flee = 2; res.msg = "missed"; }
      }
    } else if (tt === "struct") {
      var st = t, d = st.data;
      if ((st.kind === "campfire" || st.kind === "kiln") && st.done) {
        if (hk === "stick" && I.known(c, "fire")) { // feed the fire
          d.fuel = Math.min(1, (d.fuel || 0) + 0.45); d.lit = true;
          SB.Creature.consume(c, held, game);
          res.ok = true; res.msg = "more fire"; res.deltas.cold = -0.2; res.deltas.bored = -0.05;
          SB.bus.emit("fireFed", { c: c, st: st });
        } else if (!d.lit && (hk === "torch" || (I.known(c, "fire") && (hk === "flint" || tk === "hammer")))) {
          d.fuel = Math.max(d.fuel || 0, 0.5); d.lit = true;
          res.ok = true; res.msg = "fire!"; SB.bus.emit("fireLit", { c: c, st: st });
        } else if (d.lit) { res.deltas.cold = -0.25; res.ok = true; }
      } else if (st.kind === "farm" && st.done) {
        if (d.grow > 0.6) {
          d.grow = 0.1; SB.World.markNode(world, st);
          SB.World.add(world, game, "grain", st.x + r.range(-1, 1), st.z + r.range(-1, 1), {});
          res.ok = true; res.msg = "harvest"; res.deltas.bored = -0.1;
        }
      } else if ((st.kind === "totem" || st.kind === "observatory") && st.done) {
        res.ok = I.study(c, st, game); res.deltas.bored = -0.2;
      }
    } else if (tt === "water") {
      if (tool === "rod") { // fishing: patient, and better than stabbing
        if (r.chance(0.45)) { var fr = SB.World.add(world, game, "fish", c.x + Math.sin(c.facing) * 0.5, c.z + Math.cos(c.facing) * 0.5, {}); fr.vy = 4; fr.onGround = false; res.ok = true; res.msg = "a bite!"; habit(c, "hands", 1); SB.bus.emit("fish", { c: c }); }
        else { res.msg = "…"; res.deltas.bored = -0.05; }
      } else if (tool === "spear") {
        if (r.chance(0.4)) { var f = SB.World.add(world, game, "fish", c.x + Math.sin(c.facing) * 0.5, c.z + Math.cos(c.facing) * 0.5, {}); f.vy = 5; f.onGround = false; res.ok = true; res.msg = "fish!"; habit(c, "hands", 1); }
        else res.msg = "splash";
      } else { res.deltas.hot = -0.3; res.ok = true; habit(c, "swim", 0.5); }
    }
    return res;
  };

  // study a story pole: learn one of the ideas carved on it
  I.study = function (c, st, game) {
    var ideas = Object.keys(st.data.ideas || {});
    if (st.kind === "observatory") { c.inspired = Math.max(c.inspired || 0, 30); habit(c, "think", 2); return true; }
    var cand = ideas.filter(function (id) { return !I.known(c, id) && I.canHold(c, id); });
    habit(c, "think", 1);
    // a smol who knows something the pole doesn't carves it in
    var carved = false;
    for (var k in c.ideas) if (c.ideas[k] >= 1 && !st.data.ideas[k]) { st.data.ideas[k] = 1; carved = true; SB.bus.emit("carve", { c: c, st: st, id: k }); break; }
    if (!cand.length) return carved;
    var writing = SB.Game.cultureKnows(game, "writing");
    I.learn(c, game.rng.pick(cand), writing ? 0.5 : 0.25, game, "studied");
    return true;
  };

  /* ---------------- planner ---------------- */

  // What kinds can satisfy an ingredient name ("food" is any raw-ish food; tools match by kind)
  function matches(kind, want) {
    if (want === "stick" && kind === "log") return true; // a log does for three sticks
    if (want === "food") return K[kind] && K[kind].noun === "food" && kind !== "cooked" && kind !== "bread" && kind !== "nut";
    return kind === want;
  }
  I.matches = matches;

  // inventory items (hand, bag, belt)
  function inv(c, game) {
    var out = [];
    if (c.holding != null) { var h = SB.Game.byId(game, c.holding); if (h) out.push(h); }
    for (var i = 0; i < c.bag.length; i++) { var b = SB.Game.byId(game, c.bag[i]); if (b) out.push(b); }
    if (c.tool != null) { var t = SB.Game.byId(game, c.tool); if (t) out.push(t); }
    return out;
  }
  I.inv = inv;

  // missing ingredients for an idea's recipe: [{want, n}]
  function missingFor(c, d, game) {
    var have = inv(c, game), used = {}, miss = [];
    var need = {};
    for (var k in d.make.in) need[k] = d.make.in[k];
    if (d.make.tool) need["tool:" + d.make.tool] = 1;
    for (var w in need) {
      var want = w.indexOf("tool:") === 0 ? w.slice(5) : w, n = need[w];
      for (var i = 0; i < have.length && n > 0; i++) if (!used[have[i].id] && matches(have[i].kind, want)) { used[have[i].id] = 1; n--; }
      if (n > 0) miss.push({ want: want, n: n });
    }
    return miss;
  }
  I.missingFor = missingFor;

  // is there a source of `want` within reach? returns {item} | {node} | null
  I.findSource = function (c, want, game, R) {
    var world = game.world;
    R = R || c.searchR || 20;
    var un = c.unreach || {}, now = game.time;
    var it = SB.World.nearestItem(world, c.x, c.z, R, function (o) { return o.heldBy == null && !o.claimed && matches(o.kind, want) && !(o.data && o.data.rotten) && !K[o.kind].critter && !(un[o.id] > now); });
    if (it) return { item: it };
    if (want === "food") return null;
    if (want === "seed" && I.known(c, "farm")) {
      // farmers know where seeds come from: the bottoms of bushes and fruit trees
      var sn = SB.World.nearestNode(world, c.x, c.z, R, function (n) { return n.state === "ok" && (n.kind === "bush" || n.kind === "oak" || n.kind === "birch" || n.kind === "cactus"); });
      if (sn) return { node: sn, yield: "seed", time: 3 };
    }
    var node = SB.World.nearestNode(world, c.x, c.z, R, function (n) {
      if (un[n.id] > now) return false;
      var g = GATHER[n.kind];
      if (!g || g[0] !== want || n.state !== "ok" || c.tier < g[3]) return false;
      if (g[1] && toolKind(c, game) !== g[1] && heldKind(c, game) !== g[1]) return false;
      return true;
    });
    if (node) return { node: node };
    return null;
  };

  I.stationFor = function (c, at, game) {
    var world = game.world, R = (c.searchR || 20) * 1.2;
    if (at === "fire") {
      if (heldKind(c, game) === "torch" || toolKind(c, game) === "torch") return { self: true };
      var f = SB.World.nearestFire(world, c.x, c.z, R);
      return f ? { fire: f } : null;
    }
    if (at === "kiln") {
      // a cold kiln is fine for a smol who knows fire: they stoke it when they get there (see "station")
      var canLight = I.known(c, "fire");
      var k = SB.World.structsNear(world, c.x, c.z, R, function (s) { return s.kind === "kiln" && s.done && (s.data.lit || canLight); });
      return k.length ? { struct: k[0] } : null;
    }
    return { self: true };
  };

  // Choose something to make; returns a plan or null. Plans: {idea, steps:[...], i}
  function looseNear(game, x, z, r, kind) {
    var n = 0;
    SB.World.itemsNear(game.world, x, z, r, function (o) { if (o.kind === kind && o.heldBy == null) n++; });
    return n;
  }
  I.chooseMake = function (c, game) {
    if (c.tier < 2) return null;
    var depth = SB.Genome.planDepth(c.genome) + 1;
    var ch = c.chem, cands = [];
    for (var i = 0; i < LIST.length; i++) {
      var d = LIST[i];
      if (d.kind !== "craft" || !I.known(c, d.id)) continue;
      var miss = missingFor(c, d, game);
      if (miss.length > depth) continue;
      var srcOk = true;
      for (var m = 0; m < miss.length; m++) if (!I.findSource(c, miss[m].want, game)) { srcOk = false; break; }
      if (!srcOk) continue;
      if (d.make.at && !I.stationFor(c, d.make.at, game)) continue;
      // value: learned value of this idea + what it would fix right now
      var v = (c.ideaQ[d.id] != null ? c.ideaQ[d.id] : 0.2);
      var out = d.make.out;
      if (K[out].noun === "food") v += ch.hunger * 0.8;
      if (out === "potion") v += ch.sick * 1.2 + sickFriend(c, game) * 0.6;
      if (out === "torch") v += ch.fear * 0.6 + (game.world.night ? 0.2 : 0) + ch.cold * 0.3;
      if (K[out].tool && haveKind(c, game, out)) continue; // don't hoard identical tools
      // ...and don't make another if spares are already lying around nearby (pick one of those up instead)
      if (K[out].tool && looseNear(game, c.x, c.z, 14, out) >= 1) continue;
      if (out === "spear" && (game.world.night || ch.hunger > 0.5)) v += 0.2;
      v -= miss.length * 0.1;
      cands.push({ d: d, v: v, miss: miss });
    }
    cands = cands.filter(function (o) { return o.v > -0.2; });
    if (!cands.length) return null;
    var temp = c.brain.temp + 0.05, sum = 0;
    cands.forEach(function (o) { o.p = Math.exp(o.v / temp); sum += o.p; });
    var r = game.rng() * sum, pick = cands[0];
    for (i = 0; i < cands.length; i++) { r -= cands[i].p; if (r <= 0) { pick = cands[i]; break; } }
    var steps = [];
    pick.miss.forEach(function (m) { for (var k = 0; k < m.n; k++) steps.push({ do: "fetch", want: m.want }); });
    if (pick.d.make.at) steps.push({ do: "station", at: pick.d.make.at });
    steps.push({ do: "craft", idea: pick.d.id });
    return { idea: pick.d.id, kind: "make", steps: steps, i: 0, t: 0, fails: 0 };
  };
  function haveKind(c, game, kind) { return inv(c, game).some(function (o) { return o.kind === kind; }); }
  function sickFriend(c, game) {
    var s = 0;
    SB.World.creaturesNear(game.world, game, c.x, c.z, 15, function (o) { if (o !== c && o.species === "smol" && o.chem.sick > 0.4) s = 1; });
    return s;
  }

  // Do the craft (inputs consumed, output in hand). Returns the new item or null.
  I.craft = function (c, id, game) {
    var d = BY[id];
    if (!d || !d.make) return null;
    var have = inv(c, game), used = [];
    for (var k in d.make.in) {
      var n = d.make.in[k];
      for (var i = 0; i < have.length && n > 0; i++) if (used.indexOf(have[i]) < 0 && matches(have[i].kind, k)) { used.push(have[i]); n--; }
      if (n > 0) return null;
    }
    var keepCooked = d.id === "cook" && used[0] ? used[0].kind : null;
    used.forEach(function (o) { SB.Creature.consume(c, o, game); });
    var out = SB.World.add(game.world, game, d.make.out, c.x, c.z, {});
    if (keepCooked) out.data.from = keepCooked;
    SB.Creature.carry(c, out, game, true);
    c.stats.crafted = (c.stats.crafted || 0) + 1;
    habit(c, "hands", 2);
    game.stats.crafted = (game.stats.crafted || 0) + 1;
    SB.bus.emit("craft", { c: c, id: id, item: out });
    return out;
  };

  /* ---------------- building ---------------- */

  I.chooseBuild = function (c, game) {
    if (c.tier < 2) return null;
    var world = game.world;
    // 1) help an unfinished site of my tribe
    var sites = world.structures.filter(function (s) { return !s.done && s.tribe === c.tribe && SB.dist(s.x, s.z, c.x, c.z) < 40; });
    // the big thought is everyone's: any ascended smol can help raise the spire
    var mine = sites.filter(function (s) { var id = I.forStruct[s.kind]; return id && (I.known(c, id) || (s.kind === "spire" && c.tier >= 6)); });
    if (mine.length) {
      mine.sort(function (a, b) { return SB.dist2(a.x, a.z, c.x, c.z) - SB.dist2(b.x, b.z, c.x, c.z); });
      return planForSite(c, mine[0], game);
    }
    // 2) start a new one
    var cands = [];
    LIST.forEach(function (d) {
      if (d.kind !== "build" || !I.known(c, d.id)) return;
      var need = I.buildNeed(c, d.build, game);
      if (need <= 0) return;
      var v = (c.ideaQ[d.id] != null ? c.ideaQ[d.id] : 0.2) + need;
      cands.push({ d: d, v: v });
    });
    cands = cands.filter(function (o) { return o.v > 0.05; });
    if (!cands.length) return null;
    cands.sort(function (a, b) { return b.v - a.v; });
    var pick = cands[game.rng.chance(0.75) ? 0 : game.rng.int(cands.length)];
    var site = I.pickSite(c, pick.d.build, game);
    if (!site) return null;
    var st = SB.World.addStructure(world, game, pick.d.build, site.x, site.z, { tribe: c.tribe, rot: site.rot });
    st.founder = c.name;
    SB.bus.emit("siteStarted", { c: c, st: st });
    return planForSite(c, st, game);
  };

  // how much the tribe needs another one of these right now (0 = no need)
  I.buildNeed = function (c, kind, game) {
    var world = game.world, home = SB.Society ? SB.Society.home(game, c.tribe) : world.T.spawn;
    var count = function (k, r) { return world.structures.filter(function (s) { return s.kind === k && s.tribe === c.tribe && SB.dist(s.x, s.z, home.x, home.z) < (r || 30); }).length; };
    var pop = game.creatures.filter(function (o) { return o.alive && o.species === "smol" && o.tribe === c.tribe; }).length;
    switch (kind) {
      case "campfire": return count("campfire") < 1 + Math.floor(pop / 8) ? 0.6 + c.chem.cold * 0.5 : 0;
      case "hut": return count("hut") < Math.ceil(pop / 3) ? 0.5 + c.chem.tired * 0.3 + c.chem.cold * 0.3 : 0;
      case "farm": return count("farm") < Math.ceil(pop / 4) ? 0.45 + c.chem.hunger * 0.3 : 0;
      case "totem": return count("totem") < 1 ? 0.45 : 0;
      case "wall": return count("wall") < Math.min(10, game.stats.grumpNights) ? 0.2 : 0;
      case "bridge": return count("bridge", 60) < 2 && game.rng.chance(0.2) ? 0.15 : 0;
      case "kiln": return count("kiln") < 1 ? 0.45 : 0;
      case "workshop": return count("workshop") < 1 ? 0.4 : 0;
      case "windmill": return count("farm") >= 2 && count("windmill") < 1 ? 0.4 : 0;
      case "observatory": return count("observatory") < 1 ? 0.45 : 0;
      case "spire": return count("spire", 200) < 1 ? 0.7 : 0;
    }
    return 0;
  };

  I.pickSite = function (c, kind, game) {
    var world = game.world, home = SB.Society ? SB.Society.home(game, c.tribe) : world.T.spawn;
    var def = SK[kind], r = game.rng;
    if (kind === "bridge") {
      // a narrow crossing near home: a dry point with water right next to it and dry land across
      for (var t = 0; t < 60; t++) {
        var a = r() * 6.283, d = r.range(4, 26), x = home.x + Math.cos(a) * d, z = home.z + Math.sin(a) * d;
        for (var dir = 0; dir < 4; dir++) {
          var ang = dir * Math.PI / 2, ex = Math.sin(ang), ez = Math.cos(ang);
          if (SB.World.depthAt(world, x, z) > 0.4 && SB.World.depthAt(world, x - ex * 2.2, z - ez * 2.2) < 0.1 && SB.World.depthAt(world, x + ex * 2.2, z + ez * 2.2) < 0.1) return { x: x, z: z, rot: ang };
        }
      }
      return null;
    }
    var ring = kind === "wall" ? [8, 13] : kind === "spire" ? [5, 26] : kind === "farm" || kind === "windmill" ? [5, 14] : [2.5, 10];
    for (var tries = 0, maxT = kind === "spire" || kind === "observatory" ? 160 : 50; tries < maxT; tries++) {
      var aa = r() * 6.283, dd = r.range(ring[0], ring[1] + tries * 0.2);
      var px = home.x + Math.cos(aa) * dd, pz = home.z + Math.sin(aa) * dd;
      if (SB.World.siteFree(world, px, pz, def.r)) return { x: px, z: pz, rot: kind === "wall" ? aa + Math.PI / 2 : r() * 6.283 };
    }
    return null;
  };

  function planForSite(c, st, game) {
    var steps = [];
    var need = Object.keys(st.need).filter(function (k) { return st.need[k] > 0; });
    if (need.length) {
      // bring one (or two, with a bag) of the most needed material
      need.sort(function (a, b) { return st.need[b] - st.need[a]; });
      var want = need[0];
      if (!I.findSource(c, want, game, (c.searchR || 20) * 1.5) && !inv(c, game).some(function (o) { return matches(o.kind, want); })) {
        want = null;
        for (var i = 1; i < need.length; i++) if (I.findSource(c, need[i], game, (c.searchR || 20) * 1.5)) { want = need[i]; break; }
        if (!want) return null;
      }
      var n = Math.min(st.need[want], 1 + Math.min(2, SB.Creature.bagCap(c, game)));
      for (var k = 0; k < n; k++) steps.push({ do: "fetch", want: want });
      steps.push({ do: "deliver", site: st.id });
    } else steps.push({ do: "work", site: st.id });
    return { idea: I.forStruct[st.kind], kind: "build", site: st.id, steps: steps, i: 0, t: 0, fails: 0 };
  }

  // deliver materials from inventory to a site
  I.deliver = function (c, st, game) {
    var have = inv(c, game), n = 0;
    have.forEach(function (o) {
      for (var k in st.need) if (st.need[k] > 0 && matches(o.kind, k)) { st.need[k] = Math.max(0, st.need[k] - (o.kind === "log" && k === "stick" ? 3 : 1)); SB.Creature.consume(c, o, game); n++; return; }
    });
    if (n) { habit(c, "build", n); SB.bus.emit("deliver", { c: c, st: st, n: n }); }
    if (st.builders.indexOf(c.id) < 0) st.builders.push(c.id);
    return n;
  };
  I.siteReady = function (st) { for (var k in st.need) if (st.need[k] > 0) return false; return true; };
  I.work = function (c, st, dt, game) {
    if (!I.siteReady(st)) return false;
    var ws = SB.World.structsNear(game.world, st.x, st.z, 8, function (s) { return s.kind === "workshop" && s.done; }).length ? 1.5 : 1;
    st.work += dt * ws * (0.6 + (c.genome.genes.dexterity || 0.3) * 0.8);
    habit(c, "build", dt * 0.1);
    if (st.builders.indexOf(c.id) < 0) st.builders.push(c.id);
    if (st.work >= SK[st.kind].work) { I.complete(st, game); return true; }
    return false;
  };
  I.complete = function (st, game) {
    st.done = true; st.noun = SK[st.kind].noun;
    if (st.kind === "bridge") { var bc = Math.cos(st.rot || 0), bs = Math.sin(st.rot || 0); for (var bt = -1.8; bt <= 1.8; bt += 0.9) SB.World.openPathAt(game.world, st.x + bs * bt, st.z + bc * bt, 0.6); }
    if (st.kind === "campfire") { st.data.fuel = 0.6; st.data.lit = SB.Game.cultureKnows(game, "fire"); }
    if (st.kind === "kiln") { st.data.fuel = 0.8; st.data.lit = true; }
    if (st.kind === "farm") st.data.grow = 0.05;
    SB.World.markNode(game.world, st);
    game.stats.built = (game.stats.built || 0) + 1;
    // everyone who helped feels proud
    st.builders.forEach(function (id) {
      var b = SB.Game.byId(game, id);
      if (b && b.alive) { SB.Brain.reinforce(b.brain, 0.6); if (b.ideaQ) b.ideaQ[I.forStruct[st.kind]] = Math.min(1.5, (b.ideaQ[I.forStruct[st.kind]] || 0.2) + 0.2); SB.Creature.emote(b, "happy", 2); }
    });
    SB.bus.emit("built", { st: st });
    SB.Game.note(game, (st.founder || "the smols") + (st.builders.length > 1 ? " and friends" : "") + " built a " + SK[st.kind].label + " " + SK[st.kind].emoji);
  };

  /* ---------------- teaching ---------------- */

  // teacher shares one idea the student doesn't know (and a word)
  I.teach = function (teacher, student, game) {
    var cand = [];
    for (var id in teacher.ideas) if (teacher.ideas[id] >= 1 && !I.known(student, id) && I.canHold(student, id)) cand.push(id);
    if (!cand.length) return null;
    var id2 = game.rng.pick(cand);
    var amt = 0.3 + (teacher.genome.genes.social || 0.3) * 0.3;
    var learned = I.learn(student, id2, amt, game, "taught");
    habit(teacher, "social", 1); habit(student, "think", 0.5);
    SB.bus.emit("teach", { c: teacher, student: student, id: id2, learned: learned });
    return id2;
  };

  // watching someone use or make something nudges the watcher toward that idea
  I.observe = function (actor, id, game) {
    if (!id) return;
    SB.World.creaturesNear(game.world, game, actor.x, actor.z, 7, function (w) {
      if (w === actor || w.species !== "smol" || w.asleep || !w.alive) return;
      if (I.learn(w, id, 0.12, game, "watched")) SB.Game.note(game, w.name + " learned " + BY[id].name + " by watching " + actor.name + " 👀");
    });
  };

  /* ---------------- culture ---------------- */

  // how many living smols know each idea; also totems keep ideas alive once writing exists
  I.census = function (game) {
    var counts = {};
    LIST.forEach(function (d) { counts[d.id] = 0; });
    game.creatures.forEach(function (c) { if (c.alive && c.species === "smol") for (var k in c.ideas) if (c.ideas[k] >= 1) counts[k]++; });
    var poles = {};
    game.world.structures.forEach(function (s) { if (s.kind === "totem" && s.done) for (var k in s.data.ideas) poles[k] = 1; });
    return { counts: counts, poles: poles };
  };
})();
