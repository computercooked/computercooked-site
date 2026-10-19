/* smol brains — core.js
   Shared namespace, constants, tables and tiny utilities. Every other module reads from here.
   Load order (index.html): core, genome, brain, chemistry, world, creature, render, audio, save, ui, main.
   Nothing in this file touches the DOM. */
(function () {
  "use strict";
  var SB = (window.SB = window.SB || {});

  /* ---------------- vocab of the simulation ---------------- */

  // Drives are chemicals 0..1 that the creature wants LOW. Order matters: it is the brain's input layout.
  SB.DRIVES = ["hunger", "tired", "sleepy", "bored", "lonely", "pain", "fear", "cold", "hot", "sick", "love", "anger"];
  // What a smol says about a drive once it has learned the word.
  SB.DRIVE_WORDS = ["hungry", "tired", "sleepy", "bored", "lonely", "ouch", "scared", "cold", "hot", "sick", "love", "angry"];
  SB.DRIVE_EMOJI = ["🍎", "🥱", "😴", "😐", "🥺", "🤕", "😱", "🥶", "🥵", "🤢", "💕", "😠"];
  SB.DRIVE_COLORS = ["#ff9f43", "#c8a2ff", "#7d8cff", "#a0a4ad", "#ff7eb6", "#ff4d4d", "#ffd166", "#6fd3ff", "#ff7a3d", "#8bd450", "#ff5fa2", "#e04040"];

  // Verbs = the brain's output neurons (decision lobe). Order matters.
  SB.VERBS = ["idle", "approach", "eat", "play", "hit", "pickup", "drop", "sleep", "flee", "talk", "cuddle", "wander"];
  // The word the player types / the smol says for each verb.
  SB.VERB_WORDS = ["wait", "come", "eat", "play", "hit", "get", "drop", "sleep", "run", "talk", "hug", "explore"];
  SB.VERB_EMOJI = ["⏸", "👣", "😋", "🎲", "👊", "✋", "🫳", "💤", "💨", "💬", "🤗", "🧭"];
  // Verbs that need a target (the attended thing). The rest act on self.
  SB.VERB_NEEDS_TARGET = [false, true, true, true, true, true, false, false, true, false, true, false];

  // Nouns = attention categories. Every creature and object belongs to exactly one.
  SB.NOUNS = ["hand", "smol", "grump", "food", "mushroom", "toy", "ball", "music", "bed", "medicine", "snackbox", "egg", "computer", "bug", "plant", "gadget"];
  SB.NOUN_WORDS = ["hand", "smol", "grump", "food", "shroom", "toy", "ball", "music", "bed", "medi", "snackbox", "egg", "computer", "bug", "plant", "gadget"];
  SB.NOUN_EMOJI = ["✋", "🐣", "👺", "🍎", "🍄", "🧸", "⚽", "🎵", "🛏", "💊", "🍫", "🥚", "🖥", "🐞", "🌳", "⚙️"];

  SB.N_DRIVES = SB.DRIVES.length; // 12
  SB.N_VERBS = SB.VERBS.length; // 12
  SB.N_NOUNS = SB.NOUNS.length; // 16

  SB.D = idx(SB.DRIVES); // SB.D.hunger === 0
  SB.V = idx(SB.VERBS); // SB.V.eat === 2
  SB.N = idx(SB.NOUNS); // SB.N.food === 3

  /* Brain input layout (perception lobe). N_IN = 45.
     [0..11] drives, [12..27] attended noun one-hot, [28..39] heard verb one-hot,
     40 heard-noun-matches-attention, 41 target is near, 42 holding something, 43 dark, 44 bias(=1) */
  SB.IN = { DRIVE0: 0, NOUN0: 12, HEARD0: 28, HEARDNOUN: 40, NEAR: 41, HOLDING: 42, DARK: 43, BIAS: 44 };
  SB.N_IN = 45;
  SB.INPUT_LABELS = SB.DRIVES.slice()
    .concat(SB.NOUNS.map(function (n) { return "see " + n; }))
    .concat(SB.VERB_WORDS.map(function (w) { return 'heard "' + w + '"'; }))
    .concat(["heard its name", "near it", "holding", "dark", "bias"]);

  /* ---------------- time ---------------- */

  SB.TICK = 1 / 30; // sim step, seconds
  SB.DAY_LENGTH = 300; // sim seconds per in-game day (5 min at 1x)
  SB.SPEEDS = [0, 1, 2, 4, 8];

  // Life stages by age in sim seconds. A smol dies some time after ELDER (genome.lifespan).
  SB.STAGES = [
    { id: "baby", name: "baby", from: 0, scale: 0.55 },
    { id: "kid", name: "kid", from: 240, scale: 0.72 },
    { id: "teen", name: "teen", from: 720, scale: 0.86 },
    { id: "adult", name: "adult", from: 1200, scale: 1 },
    { id: "elder", name: "elder", from: 6000, scale: 0.97 }
  ];
  SB.BASE_LIFESPAN = 8400; // ± genome.lifespan

  /* ---------------- world layout ---------------- */

  SB.ROOM_W = 900;
  SB.WORLD_H = 600; // logical world height; ground sits around y≈470
  SB.ROOMS = [
    { id: "hollow", name: "Grump Hollow", temp: 0.45, sky: ["#1b1530", "#3a2a4f"], ground: "#3b3047", accent: "#7a5fa0" },
    { id: "woods", name: "Mushroom Woods", temp: 0.5, sky: ["#1f3b3a", "#4f8a6b"], ground: "#3f5e3a", accent: "#e0566e" },
    { id: "meadow", name: "Nest Meadow", temp: 0.55, sky: ["#8fd3ff", "#e6f7ff"], ground: "#6cc35a", accent: "#ffd166" },
    { id: "lab", name: "The Lab", temp: 0.55, sky: ["#2a3142", "#4a5670"], ground: "#8c93a3", accent: "#c5ff49" },
    { id: "pond", name: "Sunny Pond", temp: 0.75, sky: ["#ffcf8a", "#ffeccf"], ground: "#e8c98a", accent: "#3fb6e8" },
    { id: "peak", name: "Frost Peak", temp: 0.15, sky: ["#a8c4e8", "#e8f1ff"], ground: "#f1f6ff", accent: "#8fb8ff" }
  ];
  SB.WORLD_W = SB.ROOM_W * SB.ROOMS.length; // 5400
  SB.HOME_X = SB.ROOM_W * 2 + 450; // middle of Nest Meadow

  /* ---------------- object kinds ----------------
     noun: attention category. r: radius (px). fixed: never falls/moves, can't be carried.
     food: applied when eaten (drive deltas + chem). spawns: what a plant/machine makes. */
  SB.KINDS = {
    apple: { noun: "food", label: "Apple", emoji: "🍎", r: 11, food: { hunger: -0.45 }, chem: { glucose: 0.35 }, rots: 240, desc: "Falls from apple trees. Crunchy, honest food." },
    berry: { noun: "food", label: "Berries", emoji: "🫐", r: 9, food: { hunger: -0.3, bored: -0.05 }, chem: { glucose: 0.25 }, rots: 180, desc: "Grow on berry bushes. Small but sweet." },
    carrot: { noun: "food", label: "Carrot", emoji: "🥕", r: 11, food: { hunger: -0.5 }, chem: { glucose: 0.3, fat: 0.1 }, rots: 400, desc: "Pulled from the carrot patch. Good for eyes, allegedly." },
    cake: { noun: "food", label: "Snack Cake", emoji: "🧁", r: 11, food: { hunger: -0.6, bored: -0.1 }, chem: { glucose: 0.5, fat: 0.25 }, rots: 600, desc: "From the Snackbox. Delicious. Do not tell the dentist." },
    fish: { noun: "food", label: "Pond Fish", emoji: "🐟", r: 11, food: { hunger: -0.55 }, chem: { glucose: 0.2, fat: 0.3 }, rots: 200, desc: "Jumps out of Sunny Pond sometimes." },
    shroom_red: { noun: "mushroom", label: "Red Shroom", emoji: "🍄", r: 10, food: { hunger: -0.2 }, chem: { toxin: 0.45 }, rots: 500, desc: "Pretty. Poisonous. A smol that eats one gets sick." },
    shroom_blue: { noun: "food", label: "Glowcap", emoji: "🔵", r: 10, food: { hunger: -0.25, sleepy: -0.15 }, chem: { glucose: 0.15 }, rots: 500, desc: "Glows at night. Safe and a little perky." },
    ball: { noun: "ball", label: "Ball", emoji: "⚽", r: 13, bouncy: true, desc: "Kick it, chase it, throw it at a grump." },
    plush: { noun: "toy", label: "Plush", emoji: "🧸", r: 13, desc: "A tiny stuffed smol. Very huggable." },
    top: { noun: "toy", label: "Spinning Top", emoji: "🪀", r: 11, desc: "Spins when played with. Endlessly fascinating to small brains." },
    musicbox: { noun: "music", label: "Music Box", emoji: "🎵", r: 14, desc: "Plays a tune. Calms the bored and the lonely." },
    herb: { noun: "medicine", label: "Healroot", emoji: "🌿", r: 9, food: { sick: -0.4, pain: -0.2, hunger: -0.05 }, chem: { medicine: 0.5 }, rots: 500, desc: "Grows in the woods. Cures what ails a smol." },
    medkit: { noun: "medicine", label: "Medi Pill", emoji: "💊", r: 9, food: { sick: -0.6, pain: -0.4 }, chem: { medicine: 0.8, antibody: 0.3 }, rots: 9999, desc: "Made by the Medbot. Strong stuff." },
    egg: { noun: "egg", label: "Egg", emoji: "🥚", r: 13, desc: "A smol in waiting. Keep it warm (incubator, cuddles, or the hand)." },
    butterfly: { noun: "bug", label: "Flutterby", emoji: "🦋", r: 8, critter: "fly", food: { hunger: -0.15 }, chem: { glucose: 0.1 }, desc: "Flaps around. Fun to chase. Edible if you catch it." },
    beetle: { noun: "bug", label: "Beetle", emoji: "🐞", r: 7, critter: "crawl", food: { hunger: -0.15 }, chem: { glucose: 0.1 }, desc: "Crawls about. Crunchy." },
    bed: { noun: "bed", label: "Bed", emoji: "🛏", r: 26, fixed: true, desc: "Sleeping here is twice as restful." },
    snackbox: { noun: "snackbox", label: "Snackbox", emoji: "🍫", r: 24, fixed: true, spawns: "cake", desc: "Push it and a snack cake falls out. Smols learn this fast." },
    computer: { noun: "computer", label: "Word Machine", emoji: "🖥", r: 24, fixed: true, desc: "Shows a smol a random word for a verb or a feeling. Free school." },
    appletree: { noun: "plant", label: "Apple Tree", emoji: "🌳", r: 30, fixed: true, spawns: "apple", desc: "Drops apples now and then. Shake it (play) to drop one sooner." },
    berrybush: { noun: "plant", label: "Berry Bush", emoji: "🌿", r: 22, fixed: true, spawns: "berry", desc: "Grows berries. Faster in the rain." },
    carrotpatch: { noun: "plant", label: "Carrot Patch", emoji: "🥕", r: 22, fixed: true, spawns: "carrot", desc: "Carrots pop up. Faster in the rain." },
    herbpatch: { noun: "plant", label: "Healroot Patch", emoji: "🌱", r: 18, fixed: true, spawns: "herb", desc: "Grows medicine roots." },
    shroomring: { noun: "plant", label: "Shroom Ring", emoji: "🍄", r: 22, fixed: true, spawns: "shroom", desc: "Spawns mushrooms: some red (bad), some glowing blue (fine)." },
    heater: { noun: "gadget", label: "Heater", emoji: "🔥", r: 20, fixed: true, desc: "Play with it to get warm." },
    fan: { noun: "gadget", label: "Fan", emoji: "🌀", r: 20, fixed: true, desc: "Play with it to cool down." },
    trampoline: { noun: "gadget", label: "Bouncer", emoji: "🤸", r: 26, fixed: true, desc: "Boing. Cures boredom, causes tiredness." },
    teleporter: { noun: "gadget", label: "Zapper Pad", emoji: "🌀", r: 20, fixed: true, desc: "Zaps whoever plays with it to the other pad." },
    medbot: { noun: "gadget", label: "Medbot", emoji: "🤖", r: 22, fixed: true, spawns: "medkit", desc: "Push it to get a Medi Pill." },
    incubator: { noun: "gadget", label: "Incubator", emoji: "🧺", r: 24, fixed: true, desc: "Put an egg in here and it hatches fast." },
    warpgate: { noun: "gadget", label: "Warp Gate", emoji: "🌌", r: 26, fixed: true, desc: "Where smols shared by friends arrive." },
    grumpcave: { noun: "gadget", label: "Grump Cave", emoji: "🕳", r: 30, fixed: true, desc: "Grumps sleep here by day and come out at night." }
  };

  /* ---------------- stimulus table ----------------
     STIM[noun][verb] = drive deltas applied to the ACTOR when the action completes (negative = relief).
     Kind-specific effects (food, gadgets, machines) are added on top by SB.World.use().
     Anything missing = nothing happens (and the smol gets slightly more bored: futile actions are not rewarding). */
  SB.STIM = {
    hand: { approach: { lonely: -0.08 }, play: { bored: -0.18, lonely: -0.1 }, cuddle: { lonely: -0.3 }, talk: { lonely: -0.15, bored: -0.05 }, hit: { anger: -0.3 }, flee: { fear: -0.2 } },
    smol: { approach: { lonely: -0.08 }, talk: { lonely: -0.22, bored: -0.08 }, play: { bored: -0.28, lonely: -0.12, tired: 0.05 }, cuddle: { lonely: -0.35, love: -0.3 }, hit: { anger: -0.35 }, flee: { fear: -0.25 } },
    grump: { approach: { fear: 0.1 }, hit: { anger: -0.35, fear: -0.1 }, flee: { fear: -0.35 }, talk: { fear: 0.05 }, play: { bored: -0.1, fear: 0.1 } },
    food: { eat: {}, play: { bored: -0.05 }, pickup: {} },
    mushroom: { eat: {}, play: { bored: -0.05 }, pickup: {} },
    toy: { play: { bored: -0.35, tired: 0.03 }, cuddle: { lonely: -0.15 }, pickup: { bored: -0.05 }, hit: { anger: -0.25 }, eat: { pain: 0.1 } },
    ball: { play: { bored: -0.4, tired: 0.06, cold: -0.05 }, hit: { anger: -0.25, bored: -0.1 }, pickup: { bored: -0.05 }, eat: { pain: 0.1 } },
    music: { play: { bored: -0.25, lonely: -0.12, anger: -0.1 }, pickup: {} },
    bed: { play: { bored: -0.05 } },
    medicine: { eat: {}, pickup: {} },
    snackbox: { play: { bored: -0.08 }, hit: { anger: -0.2 } },
    egg: { cuddle: { lonely: -0.12 }, play: { bored: -0.05 }, pickup: {} },
    computer: { play: { bored: -0.3 } },
    bug: { eat: {}, play: { bored: -0.3, tired: 0.03 }, flee: { fear: -0.1 }, pickup: { bored: -0.1 } },
    plant: { eat: { hunger: -0.1 }, play: { bored: -0.08 } },
    gadget: { play: {} }
  };
  // Self verbs (no target or target ignored): applied at completion. sleep is continuous (chemistry).
  SB.SELF_STIM = { idle: { tired: -0.05 }, wander: { bored: -0.07 }, talk: { lonely: -0.03 }, sleep: {}, drop: {} };

  /* What a sensible smol does about each drive. Used for the genome's starting instincts and for IQ tests. */
  SB.GOOD = [
    { drive: "hunger", noun: "food", verb: "eat" },
    { drive: "hunger", noun: "snackbox", verb: "play" },
    { drive: "hunger", noun: "bug", verb: "eat" },
    { drive: "hunger", noun: "plant", verb: "play" },
    { drive: "bored", noun: "ball", verb: "play" },
    { drive: "bored", noun: "toy", verb: "play" },
    { drive: "bored", noun: "computer", verb: "play" },
    { drive: "bored", noun: "music", verb: "play" },
    { drive: "lonely", noun: "smol", verb: "talk" },
    { drive: "lonely", noun: "hand", verb: "cuddle" },
    { drive: "fear", noun: "grump", verb: "flee" },
    { drive: "sick", noun: "medicine", verb: "eat" },
    { drive: "pain", noun: "medicine", verb: "eat" },
    { drive: "cold", noun: "gadget", verb: "play" },
    { drive: "love", noun: "smol", verb: "cuddle" },
    { drive: "tired", noun: "bed", verb: "sleep" },
    { drive: "sleepy", noun: "bed", verb: "sleep" }
  ];
  // Things a sensible smol should NOT do (IQ test negatives).
  SB.BAD = [
    { drive: "hunger", noun: "mushroom", verb: "eat" },
    { drive: "anger", noun: "smol", verb: "hit" },
    { drive: "bored", noun: "grump", verb: "approach" }
  ];

  /* ---------------- achievements ---------------- */
  SB.ACHIEVEMENTS = [
    { id: "hatch", icon: "🐣", name: "It's Alive", desc: "Hatch your first smol." },
    { id: "name", icon: "🏷", name: "Name Giver", desc: "Name a smol." },
    { id: "feed", icon: "🍎", name: "Snack Delivery", desc: "Watch a smol eat." },
    { id: "tickle", icon: "🪶", name: "Good Smol", desc: "Tickle a smol to reward it." },
    { id: "tap", icon: "👆", name: "Tough Love", desc: "Tap a smol to tell it off." },
    { id: "word1", icon: "💬", name: "First Word", desc: "A smol says its first word." },
    { id: "word5", icon: "📖", name: "Chatterbox", desc: "One smol knows 5 words." },
    { id: "word15", icon: "🎓", name: "Smol Scholar", desc: "One smol knows 15 words." },
    { id: "word30", icon: "🧠", name: "Big Brain Smol", desc: "One smol knows 30 words." },
    { id: "obey", icon: "🫡", name: "Good Listener", desc: "A smol does what you told it to." },
    { id: "brain", icon: "🔬", name: "Neuroscientist", desc: "Open the brain viewer." },
    { id: "sentence", icon: "🗣", name: "Full Sentence", desc: "A smol tells you what it wants, in words." },
    { id: "egg", icon: "🥚", name: "Love Is In The Air", desc: "Two smols make an egg." },
    { id: "gen2", icon: "👪", name: "Second Generation", desc: "Hatch a gen 2 smol." },
    { id: "gen5", icon: "🌳", name: "Dynasty", desc: "Hatch a gen 5 smol." },
    { id: "gen10", icon: "🧬", name: "Evolution, Baby", desc: "Hatch a gen 10 smol." },
    { id: "mutant", icon: "✨", name: "Mutant", desc: "Hatch a smol with a new mutation." },
    { id: "pop5", icon: "🏘", name: "Smol Town", desc: "Have 5 smols alive at once." },
    { id: "pop10", icon: "🏙", name: "Smol City", desc: "Have 10 smols alive at once." },
    { id: "grump", icon: "👺", name: "Night Visitor", desc: "Survive your first grump night." },
    { id: "scare", icon: "😤", name: "Shoo!", desc: "Tap a grump until it runs home." },
    { id: "cure", icon: "💊", name: "Smol Doctor", desc: "A sick smol gets better." },
    { id: "elder", icon: "👴", name: "Wise Old Smol", desc: "A smol becomes an elder." },
    { id: "explorer", icon: "🧭", name: "Explorer", desc: "A smol visits every biome." },
    { id: "iq100", icon: "💯", name: "Genius", desc: "A smol scores 100+ IQ." },
    { id: "iq150", icon: "🚀", name: "Galaxy Brain", desc: "A smol scores 150+ IQ." },
    { id: "share", icon: "📤", name: "Show Off", desc: "Export a smol code or creature card." },
    { id: "import", icon: "🌌", name: "Pen Pal", desc: "Bring in a smol through the Warp Gate." },
    { id: "day7", icon: "📅", name: "One Week", desc: "Reach day 7." },
    { id: "goodbye", icon: "🕊", name: "Circle of Life", desc: "A smol lives a full life." }
  ];

  /* ---------------- utils ---------------- */

  function idx(arr) { var o = {}; for (var i = 0; i < arr.length; i++) o[arr[i]] = i; return o; }
  SB.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  SB.clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  SB.lerp = function (a, b, t) { return a + (b - a) * t; };
  SB.dist = function (ax, ay, bx, by) { var dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };

  // Seeded RNG (mulberry32). r() -> [0,1). r.int(n) -> 0..n-1. r.range(a,b). r.pick(arr). r.chance(p). r.gauss().
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

  // Tiny event bus. SB.bus.on("hatch", fn); SB.bus.emit("hatch", payload).
  var handlers = {};
  SB.bus = {
    on: function (ev, fn) { (handlers[ev] = handlers[ev] || []).push(fn); },
    off: function (ev, fn) { var h = handlers[ev]; if (h) handlers[ev] = h.filter(function (f) { return f !== fn; }); },
    emit: function (ev, data) {
      var h = handlers[ev];
      if (!h) return;
      for (var i = 0; i < h.length; i++) { try { h[i](data); } catch (e) { console.error("[bus " + ev + "]", e); } }
    }
  };

  // Name generator: cute 2-3 syllable names.
  var SYL_A = ["Bo", "Pi", "Mo", "Lu", "Ki", "Zu", "No", "Fi", "Da", "Wi", "Po", "Ta", "Bi", "Ru", "Ji", "Mi", "Su", "Ko", "Ne", "Yu"];
  var SYL_B = ["bo", "lo", "mi", "ppy", "nk", "zle", "do", "ri", "bble", "mp", "sh", "ki", "na", "go", "tz", "ffle", "ni", "ru", "pi", "x"];
  SB.makeName = function (r) {
    var n = r.pick(SYL_A) + r.pick(SYL_B);
    if (r.chance(0.25)) n += r.pick(SYL_B);
    return n;
  };

  // Every word a smol can learn: verbs, nouns, drive words. Map word -> {type, index}.
  SB.LEXICON = {};
  SB.VERB_WORDS.forEach(function (w, i) { SB.LEXICON[w] = { type: "verb", i: i }; });
  SB.NOUN_WORDS.forEach(function (w, i) { SB.LEXICON[w] = { type: "noun", i: i }; });
  SB.DRIVE_WORDS.forEach(function (w, i) { SB.LEXICON[w] = { type: "drive", i: i }; });
  // Friendly synonyms the player might type.
  SB.SYNONYMS = { yes: "good", no: "bad", go: "explore", stop: "wait", stay: "wait", here: "come", grab: "get", take: "get", pick: "get", kiss: "hug", cuddle: "hug", nap: "sleep", run: "run", flee: "run", chat: "talk", hi: "talk", hello: "talk", kick: "hit", punch: "hit", food: "food", apple: "food", carrot: "food", cake: "food", berries: "food", mushroom: "shroom", medicine: "medi", pill: "medi", toy: "toy", teddy: "toy", tree: "plant", bush: "plant", machine: "snackbox", pc: "computer" };
  SB.ALL_WORDS = Object.keys(SB.LEXICON); // 40 words. "good"/"bad" are praise words handled by creature.hear().
})();
