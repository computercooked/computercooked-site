/* smol brains 2 — core.js
   Shared namespace, constants, tables and tiny utilities (rng, noise, event bus, names).
   Load order: core, genome, brain, chemistry, lang, ideas, worldgen, world, creature, species, society,
   gl, meshes, render, input, audio, save, ui, main. Nothing in this file touches the DOM.
   World space: x east, z south, y up. 1 unit ≈ 1 m; an adult smol is ~0.7 tall. */
(function () {
  "use strict";
  var SB = (window.SB = window.SB || {});
  SB.VERSION = 2;

  /* ---------------- the brain's vocabulary ---------------- */

  // Drives are chemicals 0..1 the creature wants LOW. Order is the brain's input layout (labels are what is saved).
  SB.DRIVES = ["hunger", "tired", "sleepy", "bored", "lonely", "pain", "fear", "cold", "hot", "sick", "love", "anger"];
  SB.DRIVE_WORDS = ["hungry", "tired", "sleepy", "bored", "lonely", "ouch", "scared", "cold", "hot", "sick", "love", "angry"];
  SB.DRIVE_EMOJI = ["🍎", "🥱", "😴", "😐", "🥺", "🤕", "😱", "🥶", "🥵", "🤢", "💕", "😠"];
  SB.DRIVE_COLORS = ["#ff9f43", "#c8a2ff", "#7d8cff", "#a0a4ad", "#ff7eb6", "#ff4d4d", "#ffd166", "#6fd3ff", "#ff7a3d", "#8bd450", "#ff5fa2", "#e04040"];

  // Verbs = decision outputs. The first 12 are v1's (their trained weights migrate by name).
  SB.VERBS = ["idle", "approach", "eat", "play", "hit", "pickup", "drop", "sleep", "flee", "talk", "cuddle", "wander",
    "use", "make", "build", "teach", "give", "pray"];
  SB.VERB_WORDS = ["wait", "come", "eat", "play", "hit", "get", "drop", "sleep", "run", "talk", "hug", "explore",
    "use", "make", "build", "teach", "give", "pray"];
  SB.VERB_EMOJI = ["⏸", "👣", "😋", "🎲", "👊", "✋", "🫳", "💤", "💨", "💬", "🤗", "🧭", "🪄", "🔨", "🏗", "🧑‍🏫", "🎁", "🙏"];
  SB.VERB_NEEDS_TARGET = [false, true, true, true, true, true, false, false, true, false, true, false, true, false, false, true, true, false];
  // the lowest evolution tier that can even try a verb (tiers: see SB.TIERS)
  SB.VERB_TIER = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 4, 3, 3, 3];

  // Nouns = attention categories. Every creature, item, plant and building belongs to exactly one.
  SB.NOUNS = ["hand", "smol", "grump", "food", "mushroom", "toy", "ball", "medicine", "egg", "bug", "plant", "water",
    "stick", "stone", "material", "fire", "shelter", "tool", "critter", "crop", "totem", "wonder"];
  SB.NOUN_WORDS = ["hand", "smol", "grump", "food", "shroom", "toy", "ball", "herb", "egg", "bug", "tree", "water",
    "stick", "rock", "goods", "fire", "home", "tool", "bunny", "crop", "totem", "wonder"];
  SB.NOUN_EMOJI = ["✋", "🐣", "👺", "🍎", "🍄", "🧸", "⚽", "🌿", "🥚", "🐞", "🌳", "💧", "🪵", "🪨", "🧶", "🔥", "🛖", "🛠", "🐇", "🌾", "🗿", "✨"];

  SB.N_DRIVES = SB.DRIVES.length;
  SB.N_VERBS = SB.VERBS.length;
  SB.N_NOUNS = SB.NOUNS.length;
  SB.D = idx(SB.DRIVES);
  SB.V = idx(SB.VERBS);
  SB.N = idx(SB.NOUNS);

  /* Brain input layout (perception). Context ("memory") units are appended per brain by brain.js.
     [drives 12][attended noun 22][heard verb 18] heardName near holding dark knowsUse friends raining home bias */
  SB.IN = { DRIVE0: 0, NOUN0: 12, HEARD0: 34 };
  SB.IN.HEARDNOUN = SB.IN.HEARD0 + SB.N_VERBS;
  SB.IN.NEAR = SB.IN.HEARDNOUN + 1;
  SB.IN.HOLDING = SB.IN.NEAR + 1;
  SB.IN.DARK = SB.IN.HOLDING + 1;
  SB.IN.KNOWS = SB.IN.DARK + 1;   // "I know something to do with this" (an idea applies to the attended thing)
  SB.IN.FRIENDS = SB.IN.KNOWS + 1;
  SB.IN.RAIN = SB.IN.FRIENDS + 1;
  SB.IN.HOME = SB.IN.RAIN + 1;    // near its tribe's camp / its nest
  SB.IN.BIAS = SB.IN.HOME + 1;
  SB.N_IN = SB.IN.BIAS + 1; // 61 (+ context units)
  SB.INPUT_LABELS = SB.DRIVES.slice()
    .concat(SB.NOUNS.map(function (n) { return "see " + n; }))
    .concat(SB.VERB_WORDS.map(function (w) { return 'heard "' + w + '"'; }))
    .concat(["heard its name", "near it", "holding", "dark", "knows a use", "friends near", "raining", "home", "bias"]);

  /* ---------------- time ---------------- */

  SB.TICK = 1 / 20;        // fixed sim step (render interpolates)
  SB.DAY_LENGTH = 1200;    // sim seconds per day (20 min at 1x, like minecraft: ~13 min of day, ~7 of night)
  SB.SEASON_DAYS = 2;      // spring, summer, autumn, winter (40 min each)
  SB.SEASONS = ["spring", "summer", "autumn", "winter"];
  SB.SPEEDS = [0, 1, 2, 4, 8, 16];

  SB.STAGES = [
    { id: "baby", name: "baby", from: 0, scale: 0.55 },
    { id: "kid", name: "kid", from: 90, scale: 0.72 },
    { id: "teen", name: "teen", from: 190, scale: 0.86 },
    { id: "adult", name: "adult", from: 300, scale: 1 },
    { id: "elder", name: "elder", from: 2100, scale: 0.97 }
  ];
  SB.BASE_LIFESPAN = 2700; // ± genome.lifespan (about 45 min at 1x)

  /* ---------------- the evolution ladder ----------------
     A smol's tier comes from its genes (see genome.js tierOf). Each tier unlocks verbs and a new look. */
  SB.TIERS = [
    { id: "blob", name: "blob", icon: "🫧", color: "#b59aff", desc: "a wobbly ball with a brain. rolls, hops, eats, sleeps, learns." },
    { id: "critter", name: "critter", icon: "🐾", color: "#8fd3ff", desc: "grew legs and sharper senses. walks further, sees more, remembers a little." },
    { id: "tooluser", name: "tool-user", icon: "🪵", color: "#ffd166", desc: "has hands. picks things up on purpose, uses sticks and rocks, discovers crafts." },
    { id: "tribe", name: "tribe", icon: "🔥", color: "#ff9f43", desc: "talks in sentences, teaches others, shares food, gathers around fires, prays to you." },
    { id: "builder", name: "builder", icon: "🛖", color: "#c5ff49", desc: "plans ahead. builds huts, farms, walls and villages." },
    { id: "thinker", name: "thinker", icon: "🧠", color: "#ff7eb6", desc: "huge head, deep brain. writes ideas on totems, studies the sky, builds machines." },
    { id: "ascended", name: "ascended", icon: "✨", color: "#f5f3ed", desc: "glows. floats a little. thinks thoughts too big for one head. building something." }
  ];

  /* ---------------- world ---------------- */

  SB.WORLD_N = 256;          // tiles per side
  SB.CHUNK = 32;             // tiles per render chunk side
  SB.SEA = 0;                // sea level

  // Biomes: id, name, ground colours (low, high), temperature 0..1, what grows there.
  SB.BIOMES = [
    { id: "ocean", name: "ocean", c: [0x2b6f9c, 0x3f8fbf], temp: 0.5 },
    { id: "beach", name: "beach", c: [0xe9d8a6, 0xf2e2b4], temp: 0.62 },
    { id: "meadow", name: "meadow", c: [0x7fcf5f, 0x9ad86a], temp: 0.55 },
    { id: "forest", name: "forest", c: [0x4f9a48, 0x5fae52], temp: 0.5 },
    { id: "jungle", name: "jungle", c: [0x2f9a5a, 0x3fb468], temp: 0.78 },
    { id: "savanna", name: "savanna", c: [0xc8c068, 0xd6cc74], temp: 0.72 },
    { id: "desert", name: "desert", c: [0xe8c487, 0xf0cf94], temp: 0.88 },
    { id: "swamp", name: "swamp", c: [0x587a4a, 0x66885a], temp: 0.6 },
    { id: "taiga", name: "pine woods", c: [0x4f7d5d, 0x5d8c69], temp: 0.3 },
    { id: "tundra", name: "snowfield", c: [0xe7eef5, 0xf5f8fc], temp: 0.12 },
    { id: "mountain", name: "mountains", c: [0x8a8590, 0x9d98a3], temp: 0.3 },
    { id: "shroom", name: "glowshroom grove", c: [0x7a5fb0, 0x8c70c4], temp: 0.5 },
    { id: "crystal", name: "crystal steppe", c: [0xb4b9d8, 0xc6cbe6], temp: 0.4 }
  ];
  SB.B = idx(SB.BIOMES.map(function (b) { return b.id; }));

  /* ---------------- items (dynamic, mostly carryable) ----------------
     noun: attention category. r: radius. food: drive deltas when eaten. chem: body chemistry when eaten.
     rots: seconds before it goes bad (0 = never). tool: crafted tool that an "use" verb can apply. */
  SB.KINDS = {
    apple: { noun: "food", label: "apple", emoji: "🍎", r: 0.16, color: 0xe5484d, food: { hunger: -0.42 }, chem: { glucose: 0.32 }, rots: 480, desc: "falls from apple trees. crunchy, honest food." },
    berry: { noun: "food", label: "berries", emoji: "🫐", r: 0.13, color: 0x6c5ce7, food: { hunger: -0.28, bored: -0.04 }, chem: { glucose: 0.24 }, rots: 360, desc: "grows on berry bushes. small but sweet." },
    banana: { noun: "food", label: "sunfruit", emoji: "🍌", r: 0.16, color: 0xffd23f, food: { hunger: -0.45 }, chem: { glucose: 0.36 }, rots: 420, desc: "hangs from jungle palms. a smol favourite." },
    nut: { noun: "material", label: "hardnut", emoji: "🌰", r: 0.13, color: 0x9a6a3a, food: { hunger: -0.05 }, chem: {}, rots: 0, shell: "nutmeat", desc: "drops from pines. impossible to eat... unless you crack it with a rock." },
    nutmeat: { noun: "food", label: "nut meat", emoji: "🥜", r: 0.12, color: 0xe6c08a, food: { hunger: -0.5 }, chem: { glucose: 0.25, fat: 0.25 }, rots: 400, desc: "what's inside a hardnut. rich and filling." },
    fish: { noun: "food", label: "fish", emoji: "🐟", r: 0.17, color: 0x7fb7d6, food: { hunger: -0.5 }, chem: { glucose: 0.2, fat: 0.3 }, rots: 200, raw: true, desc: "caught with a spear. better cooked." },
    meat: { noun: "food", label: "hopper meat", emoji: "🍖", r: 0.16, color: 0xd9776a, food: { hunger: -0.55 }, chem: { fat: 0.35, glucose: 0.15 }, rots: 180, raw: true, desc: "from a hunted hopper. raw meat can make a smol sick. cook it." },
    cooked: { noun: "food", label: "cooked food", emoji: "🍢", r: 0.16, color: 0xc77b3b, food: { hunger: -0.7, bored: -0.05 }, chem: { glucose: 0.4, fat: 0.25 }, rots: 600, desc: "food + fire. more filling, never makes you sick." },
    grain: { noun: "food", label: "grain", emoji: "🌾", r: 0.13, color: 0xe8c45a, food: { hunger: -0.35 }, chem: { glucose: 0.3 }, rots: 1600, desc: "grown on farms. keeps for ages: winter food." },
    bread: { noun: "food", label: "bread", emoji: "🍞", r: 0.15, color: 0xd29b55, food: { hunger: -0.8 }, chem: { glucose: 0.5, fat: 0.1 }, rots: 1200, desc: "grain + fire + a pot. civilisation, basically." },
    carrot: { noun: "food", label: "sunroot", emoji: "🥕", r: 0.14, color: 0xff8a3d, food: { hunger: -0.38 }, chem: { glucose: 0.28 }, rots: 700, desc: "pulled from a root patch. crunchy and keeps well." },
    pumpkin: { noun: "food", label: "gourd", emoji: "🎃", r: 0.22, color: 0xf59b2b, food: { hunger: -0.65, bored: -0.05 }, chem: { glucose: 0.4 }, rots: 1100, desc: "a big round gourd. feeds a smol for ages." },
    honey: { noun: "food", label: "honeycomb", emoji: "🍯", r: 0.14, color: 0xffc94a, food: { hunger: -0.4, bored: -0.12, lonely: -0.05 }, chem: { glucose: 0.55 }, rots: 0, desc: "from a beehive. the sweetest thing on the island. the bees disagree." },
    pricklypear: { noun: "food", label: "cactus fruit", emoji: "🌵", r: 0.13, color: 0xd9467a, food: { hunger: -0.32, bored: -0.03 }, chem: { glucose: 0.25 }, rots: 500, desc: "pink and juicy, once you get past the spines." },
    clam: { noun: "food", label: "clam", emoji: "🦪", r: 0.13, color: 0xc9c1b4, food: { hunger: -0.36 }, chem: { fat: 0.2, glucose: 0.1 }, rots: 240, raw: true, desc: "dug from wet sand at the beach. better cooked." },
    glowcap: { noun: "food", label: "glowcap", emoji: "🔵", r: 0.13, color: 0x67d4ff, food: { hunger: -0.22, sleepy: -0.12 }, chem: { glucose: 0.14 }, rots: 500, glow: 1, desc: "glows at night. safe and a little perky." },
    shroom: { noun: "mushroom", label: "red shroom", emoji: "🍄", r: 0.14, color: 0xe0405a, food: { hunger: -0.18 }, chem: { toxin: 0.45 }, rots: 500, desc: "pretty. poisonous. a smol that eats one gets sick." },
    herb: { noun: "medicine", label: "healroot", emoji: "🌿", r: 0.12, color: 0x5ed17a, food: { sick: -0.4, pain: -0.2, hunger: -0.04 }, chem: { medicine: 0.5 }, rots: 500, desc: "grows in damp places. cures what ails a smol." },
    potion: { noun: "medicine", label: "brew", emoji: "🧪", r: 0.13, color: 0x8de0c0, food: { sick: -0.7, pain: -0.5 }, chem: { medicine: 0.9, antibody: 0.3 }, rots: 0, desc: "healroot boiled in a pot. thinker medicine." },
    egg: { noun: "egg", label: "egg", emoji: "🥚", r: 0.2, color: 0xf5f3ed, desc: "a smol in waiting. keep it warm: nests, fires, cuddles." },
    stick: { noun: "stick", label: "stick", emoji: "🪵", r: 0.14, color: 0x8a5a33, mat: 1, desc: "falls from trees. the start of everything." },
    stone: { noun: "stone", label: "rock", emoji: "🪨", r: 0.14, color: 0x9a96a0, mat: 1, desc: "a good rock. bonks things." },
    flint: { noun: "stone", label: "flint", emoji: "🔷", r: 0.13, color: 0x4b5a78, mat: 1, desc: "sharp-edged rock from rocky places. knap it into blades." },
    fiber: { noun: "material", label: "reed fibre", emoji: "🧶", r: 0.13, color: 0xb8c46a, mat: 1, desc: "pulled from reeds by the water. weave it." },
    clay: { noun: "material", label: "clay", emoji: "🟫", r: 0.13, color: 0xb86b45, mat: 1, desc: "sticky river mud. fire turns it into pots." },
    ore: { noun: "material", label: "copper ore", emoji: "🟠", r: 0.13, color: 0xc0703a, mat: 1, desc: "green-orange rock from the mountains. smelt it." },
    metal: { noun: "material", label: "copper", emoji: "🥉", r: 0.12, color: 0xe08a4a, mat: 1, desc: "smelted ore. shiny. the bronze-ish age begins." },
    crystal: { noun: "material", label: "thought crystal", emoji: "💎", r: 0.14, color: 0xa8e6ff, mat: 1, glow: 1, desc: "hums when a smol thinks near it. ascended smols build with it." },
    seed: { noun: "crop", label: "seeds", emoji: "🌱", r: 0.1, color: 0x9bd16a, mat: 1, desc: "plant them. wait. food happens." },
    butterfly: { noun: "bug", label: "flutterby", emoji: "🦋", r: 0.12, color: 0xffb3e6, critter: "fly", food: { hunger: -0.15 }, chem: { glucose: 0.1 }, desc: "flaps around. fun to chase. edible if you catch it." },
    beetle: { noun: "bug", label: "beetle", emoji: "🐞", r: 0.1, color: 0xe5484d, critter: "crawl", food: { hunger: -0.15 }, chem: { glucose: 0.1 }, desc: "crawls about. crunchy." },
    hopper: { noun: "critter", label: "bunny", emoji: "🐇", r: 0.2, color: 0xd9c7a8, critter: "hop", desc: "a fluffy thing that hops away. hunters with spears get meat." },
    ball: { noun: "ball", label: "ball", emoji: "⚽", r: 0.18, color: 0xf5f3ed, bouncy: true, desc: "a gift from the sky. kick it, chase it." },
    plush: { noun: "toy", label: "plush", emoji: "🧸", r: 0.18, color: 0xd9a066, desc: "a tiny stuffed smol. very huggable." },
    // tools: made with ideas, used with the "use" verb
    pokestick: { noun: "tool", label: "poke stick", emoji: "🥢", r: 0.14, color: 0x9c6a3d, tool: "poke", desc: "a stick for poking. knocks fruit down, digs up roots." },
    hammer: { noun: "tool", label: "hammerstone", emoji: "🔨", r: 0.14, color: 0x8e8a96, tool: "bonk", desc: "a rock for hitting things that aren't smols. cracks nuts." },
    blade: { noun: "tool", label: "flint blade", emoji: "🔪", r: 0.13, color: 0x5d6d8e, tool: "cut", desc: "cuts reeds, scrapes wood, prepares meat." },
    spear: { noun: "tool", label: "spear", emoji: "🔱", r: 0.15, color: 0x7a5232, tool: "stab", desc: "for fishing and hunting. grumps respect a spear." },
    torch: { noun: "fire", label: "torch", emoji: "🔦", r: 0.14, color: 0xffa040, tool: "burn", light: 1, desc: "carried fire. scares grumps. lights new fires." },
    basket: { noun: "tool", label: "basket", emoji: "🧺", r: 0.17, color: 0xc9a05a, tool: "carry", desc: "carry three things at once. a logistics revolution." },
    pot: { noun: "tool", label: "pot", emoji: "🏺", r: 0.16, color: 0xb0603a, tool: "brew", desc: "fired clay. cooks bread and brews medicine." },
    stoneaxe: { noun: "tool", label: "stone axe", emoji: "🪓", r: 0.15, color: 0x8a7a68, tool: "chop", desc: "a flint blade lashed to a stick. chops trees into logs, slowly." },
    club: { noun: "tool", label: "club", emoji: "🏏", r: 0.15, color: 0x7a5232, tool: "whack", desc: "a heavy stick with a rock in it. a grump hit with one runs for it." },
    rod: { noun: "tool", label: "fishing rod", emoji: "🎣", r: 0.15, color: 0xa07a50, tool: "fish", desc: "a stick, some reed string and a lot of patience. catches fish." },
    cloak: { noun: "tool", label: "fur cloak", emoji: "🧥", r: 0.16, color: 0xc8b48a, tool: "warm", desc: "bunny fur sewn with reed thread. the smol wearing it shrugs off the cold." },
    log: { noun: "stick", label: "log", emoji: "🪵", r: 0.2, color: 0x8a5a35, mat: 1, desc: "a chunk of tree. worth three sticks when building." },
    fur: { noun: "material", label: "bunny fur", emoji: "🐾", r: 0.14, color: 0xe6d8c0, mat: 1, desc: "soft and warm, from a hunted bunny. sewn into cloaks." },
    axe: { noun: "tool", label: "copper axe", emoji: "🪓", r: 0.15, color: 0xd98c4a, tool: "chop", desc: "chops trees into lots of wood, fast." },
    lens: { noun: "tool", label: "crystal lens", emoji: "🔮", r: 0.14, color: 0xbfefff, tool: "focus", glow: 1, desc: "makes thinking louder. thinkers stare through it at the stars." }
  };

  // Static things that sit in the world and produce items (made by worldgen, some by smols).
  SB.NODES = {
    oak: { noun: "plant", label: "apple tree", emoji: "🌳", r: 0.55, drops: "apple", every: 70, also: "stick", desc: "drops apples and sticks. shake it (play) for one sooner." },
    pine: { noun: "plant", label: "pine", emoji: "🌲", r: 0.5, drops: "nut", every: 110, also: "stick", desc: "drops hardnuts and sticks." },
    palm: { noun: "plant", label: "sun palm", emoji: "🌴", r: 0.45, drops: "banana", every: 90, desc: "grows sunfruit. too high to reach... without a poke stick." },
    birch: { noun: "plant", label: "birch", emoji: "🌳", r: 0.45, drops: "stick", every: 80, desc: "pale, papery, drops sticks." },
    giant: { noun: "plant", label: "jungle giant", emoji: "🌳", r: 0.8, drops: "banana", every: 75, also: "stick", desc: "an enormous tree full of fruit." },
    deadtree: { noun: "plant", label: "dead tree", emoji: "🪾", r: 0.4, drops: "stick", every: 60, dry: 1, desc: "all sticks, no leaves. burns easily." },
    shroomtree: { noun: "plant", label: "glowshroom", emoji: "🍄", r: 0.6, drops: "glowcap", every: 100, glow: 1, desc: "a mushroom the size of a house. glows at night." },
    cactus: { noun: "plant", label: "cactus", emoji: "🌵", r: 0.35, drops: "pricklypear", every: 160, spiky: 1, desc: "prickly, but its fruit is sweet." },
    bush: { noun: "plant", label: "berry bush", emoji: "🫐", r: 0.4, drops: "berry", every: 55, desc: "berries. faster in the rain." },
    roots: { noun: "plant", label: "sunroot patch", emoji: "🥕", r: 0.35, drops: "carrot", every: 85, desc: "feathery leaves. pull one (play) and there's a sunroot underneath." },
    gourds: { noun: "plant", label: "gourd vine", emoji: "🎃", r: 0.5, drops: "pumpkin", every: 150, desc: "a sprawling vine with big round gourds." },
    hive: { noun: "plant", label: "beehive", emoji: "🐝", r: 0.4, drops: "honey", every: 130, stings: 1, desc: "full of honey and very protective bees. smoke (a torch) calms them." },
    clams: { noun: "plant", label: "clam bed", emoji: "🦪", r: 0.4, drops: "clam", every: 70, desc: "bubbles in the wet sand. there are clams under there." },
    reeds: { noun: "plant", label: "reeds", emoji: "🌾", r: 0.35, drops: "fiber", every: 90, desc: "pull them for fibre." },
    herbs: { noun: "plant", label: "healroot patch", emoji: "🌱", r: 0.3, drops: "herb", every: 140, desc: "grows medicine roots." },
    shrooms: { noun: "mushroom", label: "shroom ring", emoji: "🍄", r: 0.4, drops: "shroom", every: 120, desc: "red ones (bad) and sometimes glowcaps (fine)." },
    boulder: { noun: "stone", label: "boulder", emoji: "🪨", r: 0.6, drops: "stone", every: 150, desc: "a big rock that sheds small rocks." },
    flintrock: { noun: "stone", label: "flint outcrop", emoji: "🔷", r: 0.5, drops: "flint", every: 200, desc: "dark glassy rock. sharp." },
    claybank: { noun: "material", label: "clay bank", emoji: "🟫", r: 0.5, drops: "clay", every: 160, desc: "squishy riverbank. good for pots." },
    orevein: { noun: "material", label: "ore vein", emoji: "🟠", r: 0.55, drops: "ore", every: 150, desc: "copper in the rock." },
    crystals: { noun: "material", label: "thought crystals", emoji: "💎", r: 0.55, drops: "crystal", every: 240, glow: 1, desc: "crystals that hum near big brains." },
    cave: { noun: "grump", label: "grump cave", emoji: "🕳", r: 0.9, desc: "grumps sleep here by day." },
    nest: { noun: "shelter", label: "nest", emoji: "🪺", r: 0.7, desc: "where your first egg was found. smols sleep well here." }
  };

  // Buildings smols can make (ideas.js says which idea unlocks which). cost: materials delivered; work: seconds of building.
  SB.STRUCTS = {
    campfire: { noun: "fire", label: "campfire", emoji: "🔥", r: 0.6, cost: { stick: 3, stone: 2 }, work: 5, desc: "warmth, light, cooking, stories. grumps hate it." },
    hut: { noun: "shelter", label: "hut", emoji: "🛖", r: 1.1, cost: { stick: 6, fiber: 3 }, work: 18, desc: "a roof! sleeping here is warm, dry and safe from grumps." },
    farm: { noun: "crop", label: "farm", emoji: "🌾", r: 1.1, cost: { stick: 2, seed: 2 }, work: 10, desc: "grows grain, sunroots or gourds by itself: a harvest every couple of minutes. faster in the rain and near a windmill." },
    totem: { noun: "totem", label: "story pole", emoji: "🗿", r: 0.4, cost: { stick: 3, stone: 1 }, work: 12, desc: "ideas carved in wood. smols who study it learn what the tribe knows, even after the inventors are gone." },
    school: { noun: "totem", label: "school", emoji: "🏫", r: 1.2, cost: { stick: 8, stone: 3, fiber: 2 }, work: 22, desc: "a roof, a slate and a circle of kids. kids nearby pick up the tribe's words and ideas twice as fast." },
    grave: { noun: "wonder", label: "grave", emoji: "🪦", r: 0.35, cost: {}, work: 1, desc: "where a smol rests. friends come here to remember." },
    wall: { noun: "shelter", label: "palisade", emoji: "🪵", r: 0.9, cost: { stick: 4 }, work: 7, desc: "pointy sticks in a row. grumps don't like walking through it." },
    kiln: { noun: "fire", label: "kiln", emoji: "🏺", r: 0.8, cost: { stone: 4, clay: 2 }, work: 14, desc: "a hot clay oven. fires pots and smelts ore into copper." },
    workshop: { noun: "tool", label: "workshop", emoji: "🛠", r: 1.1, cost: { stick: 6, stone: 2, metal: 1 }, work: 18, desc: "a bench and a roof. crafting here is twice as fast." },
    windmill: { noun: "crop", label: "windmill", emoji: "🌬", r: 0.8, cost: { stick: 6, stone: 3, metal: 1 }, work: 26, desc: "turns wind into bread. every farm nearby grows faster." },
    observatory: { noun: "totem", label: "star dome", emoji: "🔭", r: 1.0, cost: { stone: 8, crystal: 1, metal: 1 }, work: 30, desc: "thinkers watch the sky and get ideas. forecasts the weather." },
    bridge: { noun: "material", label: "bridge", emoji: "🌉", r: 1.0, cost: { stick: 8 }, work: 12, desc: "walk over water like it's nothing." },
    spire: { noun: "wonder", label: "the big thought", emoji: "✨", r: 2.0, cost: { crystal: 6, metal: 4, stone: 12 }, work: 60, desc: "a crystal spire tuned to every smol mind at once. what happens when it's finished? nobody knows." }
  };

  /* ---------------- stimulus table ----------------
     STIM[noun][verb] = drive deltas applied to the actor when the action completes (negative = relief). */
  SB.STIM = {
    hand: { approach: { lonely: -0.08 }, play: { bored: -0.18, lonely: -0.1 }, cuddle: { lonely: -0.3 }, talk: { lonely: -0.15, bored: -0.05 }, hit: { anger: -0.3 }, flee: { fear: -0.2 } },
    smol: { approach: { lonely: -0.08 }, talk: { lonely: -0.22, bored: -0.08 }, play: { bored: -0.28, lonely: -0.12, tired: 0.05 }, cuddle: { lonely: -0.35, love: -0.3 }, hit: { anger: -0.35 }, flee: { fear: -0.25 }, teach: { lonely: -0.15, bored: -0.15 }, give: { lonely: -0.2 } },
    grump: { approach: { fear: 0.1 }, hit: { anger: -0.35, fear: -0.1 }, flee: { fear: -0.35 }, talk: { fear: 0.05 }, play: { bored: -0.1, fear: 0.1 } },
    food: { eat: {}, play: { bored: -0.05 }, pickup: {} },
    mushroom: { eat: {}, play: { bored: -0.05 }, pickup: {} },
    toy: { play: { bored: -0.35, tired: 0.03 }, cuddle: { lonely: -0.15 }, pickup: { bored: -0.05 }, hit: { anger: -0.25 }, eat: { pain: 0.1 } },
    ball: { play: { bored: -0.4, tired: 0.06, cold: -0.05 }, hit: { anger: -0.25, bored: -0.1 }, pickup: { bored: -0.05 }, eat: { pain: 0.1 } },
    medicine: { eat: {}, pickup: {} },
    egg: { cuddle: { lonely: -0.12 }, play: { bored: -0.05 }, pickup: {} },
    bug: { eat: {}, play: { bored: -0.3, tired: 0.03 }, flee: { fear: -0.1 }, pickup: { bored: -0.1 } },
    plant: { play: { bored: -0.08 }, use: {}, eat: { hunger: -0.06 } },
    water: { play: { bored: -0.15, hot: -0.3 }, eat: { hot: -0.1 }, approach: {} },
    stick: { pickup: { bored: -0.04 }, play: { bored: -0.12 }, use: {} },
    stone: { pickup: {}, play: { bored: -0.06 }, hit: { anger: -0.2 }, use: {} },
    material: { pickup: {}, play: { bored: -0.05 } },
    fire: { approach: { cold: -0.25, fear: -0.05 }, play: { pain: 0.25 }, eat: { pain: 0.4 }, use: {}, pickup: {} },
    shelter: { approach: { fear: -0.08 }, play: { bored: -0.05 } },
    tool: { pickup: { bored: -0.05 }, play: { bored: -0.1 }, use: {} },
    critter: { play: { bored: -0.2 }, hit: { anger: -0.2 }, use: {} },
    crop: { pickup: {}, use: {}, eat: { hunger: -0.05 } },
    totem: { approach: { bored: -0.05 }, play: { bored: -0.2 }, use: {}, pray: {} },
    wonder: { approach: { bored: -0.1, fear: -0.1 }, play: { bored: -0.3 }, pray: {} }
  };
  SB.SELF_STIM = { idle: { tired: -0.05 }, wander: { bored: -0.07 }, talk: { lonely: -0.03 }, sleep: {}, drop: {}, pray: {}, make: {}, build: {} };

  /* What a sensible smol does about each drive (starting instincts, IQ test). */
  SB.GOOD = [
    { drive: "hunger", noun: "food", verb: "eat" },
    { drive: "hunger", noun: "bug", verb: "eat" },
    { drive: "hunger", noun: "plant", verb: "play" },
    { drive: "bored", noun: "ball", verb: "play" },
    { drive: "bored", noun: "toy", verb: "play" },
    { drive: "bored", noun: "bug", verb: "play" },
    { drive: "lonely", noun: "smol", verb: "talk" },
    { drive: "lonely", noun: "hand", verb: "cuddle" },
    { drive: "fear", noun: "grump", verb: "flee" },
    { drive: "sick", noun: "medicine", verb: "eat" },
    { drive: "pain", noun: "medicine", verb: "eat" },
    { drive: "cold", noun: "fire", verb: "approach" },
    { drive: "hot", noun: "water", verb: "play" },
    { drive: "love", noun: "smol", verb: "cuddle" },
    { drive: "tired", noun: "shelter", verb: "sleep" },
    { drive: "sleepy", noun: "shelter", verb: "sleep" }
  ];
  SB.BAD = [
    { drive: "hunger", noun: "mushroom", verb: "eat" },
    { drive: "anger", noun: "smol", verb: "hit" },
    { drive: "bored", noun: "grump", verb: "approach" },
    { drive: "cold", noun: "fire", verb: "play" }
  ];

  /* ---------------- utils ---------------- */

  function idx(arr) { var o = {}; for (var i = 0; i < arr.length; i++) o[arr[i]] = i; return o; }
  SB.idx = idx;
  SB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  SB.clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  SB.lerp = function (a, b, t) { return a + (b - a) * t; };
  SB.smooth = function (t) { t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t); };
  SB.dist = function (ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); };
  SB.dist2 = function (ax, az, bx, bz) { var dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; };
  SB.angDiff = function (a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
  SB.hex = function (c) { return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255]; };
  SB.mixC = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; };
  SB.hsl = function (h, s, l) { // h 0..360, s/l 0..1 -> [r,g,b] 0..1
    h = ((h % 360) + 360) % 360 / 360;
    function f(n) { var k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }
    return [f(0), f(8), f(4)];
  };

  // Seeded RNG (mulberry32). r() -> [0,1). r.int(n), r.range(a,b), r.pick(arr), r.chance(p), r.gauss().
  SB.rng = function (seed) {
    var s = seed >>> 0 || 1;
    function r() {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    r.int = function (n) { return Math.floor(r() * n); };
    r.range = function (a, b) { return a + (b - a) * r(); };
    r.pick = function (arr) { return arr[Math.floor(r() * arr.length)]; };
    r.chance = function (p) { return r() < p; };
    r.gauss = function () { var u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    r.state = function () { return s; };
    r.setState = function (v) { s = v >>> 0; };
    return r;
  };

  // Integer hash -> [0,1). For deterministic per-thing randomness without an rng stream.
  SB.hash = function (a, b, c) {
    var h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // 2D simplex noise (seeded permutation). SB.noise2(seed) -> fn(x, y) in [-1, 1].
  SB.noise2 = function (seed) {
    var r = SB.rng(seed), p = new Uint8Array(512), perm = [], i;
    for (i = 0; i < 256; i++) perm[i] = i;
    for (i = 255; i > 0; i--) { var j = r.int(i + 1), t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    for (i = 0; i < 512; i++) p[i] = perm[i & 255];
    var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    var GX = [1, -1, 1, -1, 1, -1, 0, 0], GY = [1, 1, -1, -1, 0, 0, 1, -1];
    return function (xin, yin) {
      var s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s);
      var t = (i + j) * G2, x0 = xin - (i - t), y0 = yin - (j - t);
      var i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
      var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
      var ii = i & 255, jj = j & 255, n = 0, g, tt;
      tt = 0.5 - x0 * x0 - y0 * y0;
      if (tt > 0) { g = p[ii + p[jj]] & 7; tt *= tt; n += tt * tt * (GX[g] * x0 + GY[g] * y0); }
      tt = 0.5 - x1 * x1 - y1 * y1;
      if (tt > 0) { g = p[ii + i1 + p[jj + j1]] & 7; tt *= tt; n += tt * tt * (GX[g] * x1 + GY[g] * y1); }
      tt = 0.5 - x2 * x2 - y2 * y2;
      if (tt > 0) { g = p[ii + 1 + p[jj + 1]] & 7; tt *= tt; n += tt * tt * (GX[g] * x2 + GY[g] * y2); }
      return 70 * n;
    };
  };

  // Tiny event bus. SB.bus.on("hatch", fn); SB.bus.emit("hatch", payload).
  var handlers = {};
  SB.bus = {
    on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    off: function (ev, fn) { var h = handlers[ev]; if (h) handlers[ev] = h.filter(function (f) { return f !== fn; }); },
    emit: function (ev, data) {
      var h = handlers[ev];
      if (!h) return;
      for (var i = 0; i < h.length; i++) { try { h[i](data); } catch (e) { console.error("[bus " + ev + "]", e); } }
    },
    clear: function () { handlers = {}; }
  };

  // Names: cute 2-3 syllable names.
  var SYL_A = ["Bo", "Pi", "Mo", "Lu", "Ki", "Zu", "No", "Fi", "Da", "Wi", "Po", "Ta", "Bi", "Ru", "Ji", "Mi", "Su", "Ko", "Ne", "Yu", "Gu", "Pa", "Te", "Vo"];
  var SYL_B = ["bo", "lo", "mi", "ppy", "nk", "zle", "do", "ri", "bble", "mp", "sh", "ki", "na", "go", "tz", "ffle", "ni", "ru", "pi", "x", "mo", "bu"];
  SB.makeName = function (r) {
    var n = r.pick(SYL_A) + r.pick(SYL_B);
    if (r.chance(0.25)) n += r.pick(SYL_B);
    return n;
  };

  // World codes: a friendly name for a seed ("mossy-otter-4821") and back.
  var CODE_A = ["mossy", "sunny", "fuzzy", "salty", "misty", "rusty", "minty", "lumpy", "sleepy", "spicy", "frosty", "dusty", "soggy", "zesty", "cozy", "wobbly"];
  var CODE_B = ["otter", "pebble", "noodle", "badger", "comet", "turnip", "walrus", "pickle", "goblin", "muffin", "lagoon", "beetle", "canyon", "biscuit", "meadow", "tadpole"];
  SB.worldCode = function (seed) {
    seed = seed >>> 0;
    return CODE_A[seed & 15] + "-" + CODE_B[(seed >> 4) & 15] + "-" + ((seed >>> 8) % 100000);
  };
  SB.parseWorldCode = function (str) {
    str = String(str || "").trim().toLowerCase();
    var m = /^([a-z]+)-([a-z]+)-(\d{1,5})$/.exec(str);
    if (m && CODE_A.indexOf(m[1]) >= 0 && CODE_B.indexOf(m[2]) >= 0) return ((+m[3] << 8) | (CODE_B.indexOf(m[2]) << 4) | CODE_A.indexOf(m[1])) >>> 0;
    if (/^\d{1,10}$/.test(str)) return (+str >>> 0) || 1;
    if (!str) return 0;
    var h = 2166136261; // any other text: hash it, so "bananas" is a world too
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 25600000) || 1;
  };
  SB.newSeed = function () { return ((Math.random() * 25600000) >>> 0) + 1; };

  // Every word a smol can learn (ideas add their own invented words at runtime).
  SB.LEXICON = {};
  SB.VERB_WORDS.forEach(function (w, i) { SB.LEXICON[w] = { type: "verb", i: i }; });
  SB.NOUN_WORDS.forEach(function (w, i) { SB.LEXICON[w] = { type: "noun", i: i }; });
  SB.DRIVE_WORDS.forEach(function (w, i) { SB.LEXICON[w] = { type: "drive", i: i }; });
  SB.SYNONYMS = { yes: "good", no: "bad", go: "explore", stop: "wait", stay: "wait", here: "come", grab: "get", take: "get", pick: "get", kiss: "hug", cuddle: "hug", nap: "sleep", flee: "run", chat: "talk", hi: "talk", hello: "talk", kick: "hit", punch: "hit", apple: "food", berries: "food", fruit: "food", mushroom: "shroom", medicine: "herb", medi: "herb", plant: "tree", bush: "tree", stuff: "goods", stone: "rock", wood: "stick", house: "home", hut: "home", bed: "home", nest: "home", craft: "make", gift: "give", worship: "pray", hopper: "bunny", rabbit: "bunny" };
  SB.ALL_WORDS = Object.keys(SB.LEXICON);
})();
