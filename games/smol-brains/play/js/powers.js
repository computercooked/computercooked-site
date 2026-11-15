/* smol brains — powers.js (4.34, "the Lantern's powers"): light, health and how hard the island bites.
   The game's magic is light and memory, never spells. Everything here hangs off ext.js:
     the tree     embers the smols win back can be spent (they stay counted for the Lantern's stages) on new powers
                  in three branches: light (reveal, ward, burst, lantern skin, homeward), life (heal, mend, calm, grow,
                  second wind) and mind (quick study, share a memory, long memory, slow time). Cast them from a body
                  for pep ("inner light"), or from the sky for sparks (a button on the ✨ magic sheet).
     stones       three blessing stones stand on every island: touch one in a body and pick one lasting blessing of
                  its three; another stone swaps it. Once a day a stone also gives a small boon.
     words        twelve whisper stones teach four words of power (roar, call, hush, cheer), three levels each.
     perks        every body.js skill gives a pick of two perks at levels 3, 6 and 9.
     health       named sicknesses with causes, stages, symptoms, cures and immunity; sprains, scars, bandages and
                  splints; resting heals; a herbalist will tend you; fainted smols are carried home.
     buffs        SB.Powers.buff(c, id, seconds) / has / clear / defBuff, shown as chips by the hearts. Brews use it.
     modes        difficulty presets and knobs, peaceful, one life, survival, sandbox god mode, three accessibility
                  switches. All in game.settings.
   State: game.quests.powers (the tree, cooldowns, stones, words, wards) and c.pw on a smol (buffs, blessing, perks,
   illness, immunity, scars). Rolls its own dice, seeded from the island. Nothing here touches game.rng. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var PW = SB.Powers = {};

  /* ---------------- what there is ---------------- */
  // kind "cast": something you do (pep in a body, sparks from the sky, a cooldown in game seconds). kind "gift": always on
  PW.TREE = [
    { id: "reveal", branch: "light", kind: "cast", icon: "🔦", name: "reveal", cost: 1, pep: 0.15, sparks: 3, cd: 30, desc: "the light shows the nearest hidden thing: a place, a chest, a stone" },
    { id: "ward", branch: "light", kind: "cast", icon: "🕯", name: "ward", cost: 2, pep: 0.3, sparks: 6, cd: 120, desc: "light a place for a while. grumps turn back at its edge" },
    { id: "burst", branch: "light", kind: "cast", icon: "💥", name: "burst", cost: 2, pep: 0.35, sparks: 8, cd: 45, desc: "a flash that stuns every grump close by" },
    { id: "skin", branch: "light", kind: "cast", icon: "🛡", name: "lantern skin", cost: 2, pep: 0.3, sparks: 6, cd: 90, desc: "a glow that soaks the next three bites" },
    { id: "recall", branch: "light", kind: "cast", icon: "🏠", name: "homeward", cost: 3, pep: 0.5, sparks: 8, cd: 300, desc: "the light carries a smol home" },
    { id: "heal", branch: "life", kind: "cast", icon: "💚", name: "heal", cost: 1, pep: 0.3, sparks: 6, cd: 40, desc: "hearts back, and sickness eased, for every smol close by" },
    { id: "mend", branch: "life", kind: "cast", icon: "🩹", name: "mend", cost: 1, pep: 0.2, sparks: 4, cd: 40, desc: "close cuts, bruises and sprains, with no scar" },
    { id: "calm", branch: "life", kind: "cast", icon: "🌙", name: "calm", cost: 2, pep: 0.25, sparks: 5, cd: 45, desc: "frightened smols settle. grumps close by doze off for a moment" },
    { id: "grow", branch: "life", kind: "cast", icon: "🌱", name: "grow", cost: 2, pep: 0.35, sparks: 8, cd: 90, desc: "picked bushes, stumps and burnt trees close by grow back" },
    { id: "wind", branch: "life", kind: "gift", icon: "🪽", name: "second wind", cost: 3, desc: "once a day, a blow that would leave you under one heart puts you back to half instead" },
    { id: "study", branch: "mind", kind: "gift", icon: "📖", name: "quick study", cost: 1, fx: { xpAll: 0.5 }, desc: "the smol you are in learns every skill half again as fast" },
    { id: "share", branch: "mind", kind: "cast", icon: "💭", name: "share a memory", cost: 2, pep: 0.3, sparks: 6, cd: 120, desc: "one smol hands an idea or a skill to the smol beside it" },
    { id: "memory", branch: "mind", kind: "gift", icon: "🧠", name: "long memory", cost: 2, fx: { cd: 0.25 }, desc: "every power and word is ready a quarter sooner" },
    { id: "slow", branch: "mind", kind: "cast", icon: "⏳", name: "slow time", cost: 3, pep: 0.4, sparks: 0, cd: 90, desc: "for a moment the island crawls and you don't (in a body)" }
  ];
  PW.BY = {}; PW.TREE.forEach(function (n) { PW.BY[n.id] = n; });
  PW.BRANCH = { light: ["🔆", "light"], life: ["🌿", "life"], mind: ["💭", "mind"] };
  PW.RANKS = [0, 5, 15];     // casts for rank 1, 2, 3: each rank is a quarter stronger
  PW.SLOW = 0.4;             // how fast the island runs under slow time
  PW.WARD_R = 7; PW.WARD_T = 180; PW.WARD_MAX = 3;

  PW.WORDS = [
    { id: "roar", icon: "🦁", name: "roar", cd: 40, desc: "staggers grumps close by and shoves them back" },
    { id: "call", icon: "📣", name: "call", cd: 60, desc: "friends close by come running to you" },
    { id: "hush", icon: "🤫", name: "hush", cd: 60, desc: "your light dims: a grump hunting you loses you" },
    { id: "cheer", icon: "🎉", name: "cheer", cd: 50, desc: "pep back for you, and a lift for everyone near" }
  ];
  PW.WORD = {}; PW.WORDS.forEach(function (w) { PW.WORD[w.id] = w; });

  // one lasting blessing per smol, picked at a stone. each stone offers three
  PW.BLESS = [
    { id: "runner", set: "a", icon: "🦌", name: "the deer", fx: { runPep: 0.25 }, desc: "running costs a quarter less pep" },
    { id: "ox", set: "a", icon: "🐂", name: "the ox", fx: { guard: 0.15 }, desc: "every hurt costs 15% less" },
    { id: "fox", set: "a", icon: "🦊", name: "the fox", fx: { dmg: 0.2 }, desc: "you hit grumps a fifth harder" },
    { id: "owl", set: "b", icon: "🦉", name: "the owl", fx: { xpAll: 0.25 }, desc: "skills grow a quarter faster" },
    { id: "bee", set: "b", icon: "🐝", name: "the bee", fx: { cd: 0.2, cost: 0.2 }, desc: "powers and words cost less pep and are ready sooner" },
    { id: "magpie", set: "b", icon: "🐦", name: "the magpie", fx: { sell: 0.15 }, desc: "what you sell pays 15% more" },
    { id: "otter", set: "c", icon: "🦦", name: "the otter", fx: { thirst: 0.3 }, desc: "you get thirsty a third slower" },
    { id: "ember", set: "c", icon: "🔥", name: "the ember", fx: { warmth: 1 }, desc: "the cold lets go of you faster" },
    { id: "moss", set: "c", icon: "🍀", name: "the moss", fx: { regen: 1 }, desc: "resting heals twice as fast, and sickness passes sooner" }
  ];
  PW.BLESSING = {}; PW.BLESS.forEach(function (b) { PW.BLESSING[b.id] = b; });
  PW.SETS = { a: "the hunter's stone", b: "the thinker's stone", c: "the river stone" };

  // a pick of two at levels 3, 6 and 9 of every body.js skill: [name, what it says, {what it does}]
  PW.PERK_LEVELS = [3, 6, 9];
  PW.PERKS = {
    chop: [[["kindling", "every other tree leaves an extra stick", { chopStick: 0.5 }], ["easy swing", "felling a tree gives a little pep back", { chopPep: 0.15 }]],
      [["sap reader", "one tree in three gives an extra log", { chopLog: 0.34 }], ["leaf saver", "an armful of leaves from every tree", { chopLeaves: 1 }]],
      [["forester", "a sapling from every tree you fell", { chopSapling: 1 }], ["old hand", "chopping teaches you twice as fast", { xp_chop: 1 }]]],
    mine: [[["chips", "a crumbled rock leaves an extra rock", { mineStone: 1 }], ["steady paws", "finishing a rock gives a little pep back", { minePep: 0.2 }]],
      [["sharp eye", "every other rock hides a flint", { mineFlint: 0.5 }], ["ore nose", "ore veins give an extra lump", { mineOre: 1 }]],
      [["glint", "one rock in five hides a thought crystal", { mineCrystal: 0.2 }], ["deep learner", "mining teaches you twice as fast", { xp_mine: 1 }]]],
    forage: [[["full paws", "one pick in three finds an extra one", { forMore: 0.34 }], ["herb nose", "every other healroot comes up double", { forHerb: 0.5 }]],
      [["snacker", "fresh fruit gives a little pep", { eatPep: 0.12 }], ["seed saver", "one pick in four turns up a seed", { forSeed: 0.25 }]],
      [["bounty", "every pick finds an extra one", { forMore: 0.66 }], ["green paw", "foraging teaches you twice as fast", { xp_forage: 1 }]]],
    craft: [[["thrifty", "one make in three leaves a stick over", { craftStick: 0.34 }], ["apothecary", "every other remedy you make comes out double", { medExtra: 0.5 }]],
      [["sturdy", "tools you make last a quarter longer", { toolW: 0.25 }], ["tinkerer", "crafting teaches you twice as fast", { xp_craft: 1 }]],
      [["two for one", "one make in four comes out double", { craftDouble: 0.25 }], ["field medic", "bandages, splints and poultices last: every other one isn't used up", { medSave: 0.5 }]]],
    cook: [[["seasoned", "cooked food fills you more", { cookFill: 0.08 }], ["warm belly", "cooked food warms you up", { cookWarm: 0.3 }]],
      [["hearty", "cooked food gives a little heart back", { cookHeal: 0.08 }], ["camp cook", "cooked food gives pep", { cookPep: 0.2 }]],
      [["feast", "a cooked meal leaves you well fed for a good while", { cookBuff: 180 }], ["taster", "cooking teaches you twice as fast", { xp_cook: 1 }]]],
    fish: [[["double hook", "one catch in three is two fish", { fishMore: 0.34 }], ["patient", "a catch gives a little pep back", { fishPep: 0.15 }]],
      [["clam luck", "every other catch brings up a clam too", { fishClam: 0.5 }], ["fish oil", "eating fish dries and warms you", { fishWarm: 1 }]],
      [["the big one", "every catch is two fish", { fishMore: 0.66 }], ["old salt", "fishing teaches you twice as fast", { xp_fish: 1 }]]],
    hunt: [[["clean catch", "one hunt in three gives extra meat", { huntMeat: 0.34 }], ["soft paws", "one hunt in three gives extra fur", { huntFur: 0.34 }]],
      [["second breath", "a catch gives pep back", { huntPep: 0.2 }], ["nothing wasted", "every other hunt gives extra fur", { huntFur: 0.5 }]],
      [["provider", "every hunt gives extra meat", { huntMeat: 0.66 }], ["tracker", "hunting teaches you twice as fast", { xp_hunt: 1 }]]],
    fight: [[["heavy paw", "you hit grumps 15% harder", { dmg: 0.15 }], ["thick fur", "every hurt costs a tenth less", { guard: 0.1 }]],
      [["stagger", "every fourth hit staggers a grump", { stagger: 4 }], ["victor", "chasing a grump off gives hearts back", { chaseHeal: 0.25 }]],
      [["captain's bane", "you hit captains 30% harder", { bossDmg: 0.3 }], ["unshaken", "every hurt costs 15% less", { guard: 0.15 }]]],
    run: [[["light feet", "running costs a fifth less pep", { runPep: 0.2 }], ["deep lungs", "pep comes back faster when you stop", { pepRegen: 0.25 }]],
      [["slippery", "hurts cost a quarter less while you run", { runGuard: 0.25 }], ["camel", "you get thirsty a quarter slower", { thirst: 0.25 }]],
      [["the wind", "you run a little faster", { speed: 0.12 }], ["marathon", "running teaches you twice as fast", { xp_run: 1 }]]]
  };

  // sicknesses. each has a cause, three stages that get worse if you carry on, and a cure. rest gets you over it too
  PW.ILLS = [
    { id: "tummy", icon: "🤢", name: "the collywobbles", cause: "bad food", sym: ["hungry sooner", "less pep"], cure: "tummytea" },
    { id: "daze", icon: "😵", name: "shroom daze", cause: "something you shouldn't have eaten", sym: ["thirsty sooner", "less pep"], cure: "tummytea" },
    { id: "shivers", icon: "🥶", name: "the shivers", cause: "being cold and wet", sym: ["can't get warm", "less pep"], cure: "broth" },
    { id: "rot", icon: "🩹", name: "a dirty wound", cause: "a cut left unbound", sym: ["hearts slip away", "less pep"], cure: "poultice" },
    { id: "sniffles", icon: "🤧", name: "the sniffles", cause: "a sick smol close by", sym: ["much less pep", "you can pass it on"], cure: "syrup" },
    { id: "dims", icon: "🌑", name: "the dims", cause: "a grump's bite in the dark", sym: ["weak by day", "hits land soft at night"], cure: "suntea" }
  ];
  PW.ILL = {}; PW.ILLS.forEach(function (i) { PW.ILL[i.id] = i; });
  PW.ILL_REST = 300;    // game seconds of getting over it (resting counts three times)
  PW.ILL_WORSE = 120;   // seconds up and about before it gets a stage worse
  PW.IMMUNE_DAYS = 6;
  PW.SPRAIN = 300; PW.MAX_SCARS = 5; PW.FIZZ = 40;

  // what you can make (the bag's lantern tab; also real recipes in the make tab for smols who know herb lore)
  PW.ITEMS = {
    bandage: { noun: "material", mat: 1, label: "bandage", emoji: "🩹", r: 0.12, color: 0xe8e0c8, desc: "binds a cut clean, so it leaves no scar and never goes bad." },
    splint: { noun: "material", mat: 1, label: "splint", emoji: "🦴", r: 0.14, color: 0xb89a6a, desc: "two sticks and a vine. sets a sprain." },
    poultice: { noun: "material", mat: 1, label: "poultice", emoji: "🌿", r: 0.12, color: 0x6fae5a, desc: "mashed healroot on a leaf. draws a dirty wound clean." },
    tummytea: { noun: "material", mat: 1, label: "tummy tea", emoji: "🍵", r: 0.12, color: 0x9ccf7a, desc: "settles the collywobbles and a shroom daze." },
    broth: { noun: "material", mat: 1, label: "warm broth", emoji: "🥣", r: 0.13, color: 0xd9a25a, desc: "cures the shivers and keeps you warm for a while." },
    syrup: { noun: "material", mat: 1, label: "sniffle syrup", emoji: "🍯", r: 0.12, color: 0xe2b84a, desc: "honey and healroot. cures the sniffles." },
    suntea: { noun: "material", mat: 1, label: "sun tea", emoji: "🌞", r: 0.12, color: 0xffd86a, desc: "glowcap light in a cup. lifts the dims." },
    chew: { noun: "material", mat: 1, label: "bark chew", emoji: "🪵", r: 0.11, color: 0x9a7a52, desc: "takes the ache out of a bruise." },
    bracetea: { noun: "material", mat: 1, label: "bracing tea", emoji: "🫖", r: 0.12, color: 0x7fbf9a, desc: "drink it before trouble: nothing catches you for a good while." },
    kit: { noun: "material", mat: 1, label: "healer's kit", emoji: "🧺", r: 0.16, color: 0xc9d8b0, desc: "everything a healer carries. mends every wound and cures any sickness, once." },
    swiftbrew: { noun: "material", mat: 1, label: "swift brew", emoji: "💨", r: 0.12, color: 0x8fd8f0, desc: "quick feet for a while." },
    warmbrew: { noun: "material", mat: 1, label: "warming brew", emoji: "♨️", r: 0.12, color: 0xf0a060, desc: "the cold can't get in for a while." },
    owlbrew: { noun: "material", mat: 1, label: "owl brew", emoji: "🦉", r: 0.12, color: 0x9a8fe0, desc: "the night looks much less dark for a while." },
    strongbrew: { noun: "material", mat: 1, label: "strong brew", emoji: "💪", r: 0.12, color: 0xd86a5a, desc: "you hit half again as hard for a while." },
    stoutbrew: { noun: "material", mat: 1, label: "stout brew", emoji: "🛡", r: 0.12, color: 0xa0b0c8, desc: "soaks the next three bites." },
    cleartea: { noun: "material", mat: 1, label: "clear tea", emoji: "🫗", r: 0.12, color: 0xd0f0e8, desc: "washes every bad feeling off you at once." },
    crittercharm: { noun: "material", mat: 1, label: "critter charm", emoji: "🐿", r: 0.12, color: 0xc08a5a, desc: "for a short while you are critter-shaped: quick, hard to spot, and no good in a fight." }
  };
  PW.RECIPES = [
    { id: "bandage", in: { leaves: 2, fiber: 1 }, group: "care" },
    { id: "splint", in: { stick: 2, vine: 1 }, group: "care" },
    { id: "poultice", in: { herb: 1, leaves: 1 }, group: "care" },
    { id: "chew", in: { stick: 1, leaves: 1 }, group: "care" },
    { id: "kit", in: { bandage: 1, splint: 1, poultice: 1 }, group: "care" },
    { id: "tummytea", in: { herb: 1, berry: 1 }, at: "fire", group: "cure" },
    { id: "broth", in: { fish: 1, leaves: 1 }, at: "fire", group: "cure" },
    { id: "syrup", in: { honey: 1, herb: 1 }, group: "cure" },
    { id: "suntea", in: { glowcap: 1, herb: 1 }, at: "fire", group: "cure" },
    { id: "bracetea", in: { herb: 2 }, at: "fire", group: "cure" },
    { id: "cleartea", in: { herb: 1, leaves: 2 }, at: "fire", group: "brew" },
    { id: "swiftbrew", in: { banana: 1, herb: 1 }, at: "fire", group: "brew" },
    { id: "warmbrew", in: { honey: 1, leaves: 1 }, at: "fire", group: "brew" },
    { id: "owlbrew", in: { glowcap: 1, berry: 1 }, at: "fire", group: "brew" },
    { id: "strongbrew", in: { nutmeat: 1, herb: 1 }, at: "fire", group: "brew" },
    { id: "stoutbrew", in: { clam: 1, herb: 1 }, at: "fire", group: "brew" },
    { id: "crittercharm", in: { fur: 1, berry: 1 }, group: "brew" }
  ];
  PW.RECIPE = {}; PW.RECIPES.forEach(function (r) { PW.RECIPE[r.id] = r; });
  PW.BREWS = { swiftbrew: ["swift", 90], warmbrew: ["warm", 180], owlbrew: ["nightsight", 180], strongbrew: ["strong", 90], stoutbrew: ["shield", 180], crittercharm: ["critter", 45] };

  PW.BUFFS = {
    swift: { icon: "💨", text: "swift", tip: "quick feet" },
    warm: { icon: "♨️", text: "warm", tip: "the cold can't get in" },
    nightsight: { icon: "🦉", text: "owl eyes", tip: "the night looks much less dark" },
    strong: { icon: "💪", text: "strong", tip: "you hit half again as hard" },
    shield: { icon: "🛡", text: "lantern skin", tip: "soaks the next bites" },
    hushed: { icon: "🤫", text: "hushed", tip: "your light is dim: grumps lose you" },
    cheered: { icon: "🎉", text: "cheered", tip: "pep comes back faster" },
    calm: { icon: "🌙", text: "calm", tip: "pep comes back faster" },
    wellfed: { icon: "🍲", text: "well fed", tip: "a good meal: resting heals faster" },
    glowing: { icon: "✨", text: "glowing", tip: "you ate a glowcap after dark. you are your own torch tonight" },
    critter: { icon: "🐿", text: "critter-shaped", tip: "quick and hard to spot, and no good in a fight" },
    braced: { icon: "🫖", text: "braced", tip: "nothing catches you for now" },
    boon: { icon: "🗿", text: "stone's boon", tip: "today's gift from a blessing stone: pep comes back faster" },
    fizz: { icon: "🫧", text: "fizzy tummy", bad: true, tip: "wait a little before the next brew" }
  };

  PW.PRESETS = [
    { id: "peaceful", icon: "🌼", name: "peaceful", dmg: 0.5, hunger: 0.75, price: 0.8, wilds: "cosy", peaceful: true, tip: "grumps leave you be. needs run slow, and things are cheap." },
    { id: "easy", icon: "🍃", name: "easy", dmg: 0.75, hunger: 0.85, price: 0.9, wilds: "cosy", tip: "softer bites, slower hunger." },
    { id: "normal", icon: "🌿", name: "normal", dmg: 1, hunger: 1, price: 1, wilds: "normal", tip: "the island as it was made." },
    { id: "hard", icon: "🔥", name: "hard", dmg: 1.35, hunger: 1.25, price: 1.25, wilds: "harsh", tip: "bites hurt more, you get hungry faster, stalls ask more." },
    { id: "brutal", icon: "💀", name: "brutal", dmg: 1.8, hunger: 1.5, price: 1.6, wilds: "harsh", tip: "for smols who like it rough." }
  ];
  PW.PRESET = {}; PW.PRESETS.forEach(function (p) { PW.PRESET[p.id] = p; });
  PW.KNOBS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  PW.TOGGLES = {
    peaceful: ["🌼", "peaceful", "grumps go home and leave everyone be (the three captains still wait in their lairs)"],
    oneLife: ["🕯", "one life", "if the smol you are in faints, its light goes out for good"],
    survival: ["⛺", "survival", "hunger and cold bite harder, resting doesn't heal, and homeward won't carry you"],
    god: ["🧪", "sandbox: no harm", "in a body nothing hurts and you never tire (sandbox islands only)"],
    noFlash: ["🚫", "reduce flashing", "no screen flashes or shakes from lightning and powers"],
    bigMarks: ["🔎", "bigger markers", "the arrows and marks in a body are drawn larger"],
    holdToggle: ["🏃", "tap to run", "tap shift once to keep running, again to stop (no holding)"]
  };

  /* ---------------- small helpers ---------------- */
  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) {
    var q = Q(game), s = q.powers;
    if (!s || typeof s !== "object") s = q.powers = {};
    if (!s.tree) s.tree = {}; if (!s.cd) s.cd = {}; if (!s.casts) s.casts = {}; if (!s.words) s.words = {};
    if (!s.stones) s.stones = {}; if (!s.heard) s.heard = {}; if (!Array.isArray(s.wards)) s.wards = [];
    if (typeof s.spent !== "number") s.spent = 0;
    return s;
  }
  PW.state = st;
  function me(c) {
    var p = c.pw;
    if (!p || typeof p !== "object") p = c.pw = {};
    if (!p.buffs) p.buffs = {}; if (!p.perks) p.perks = {}; if (!p.immune) p.immune = {}; if (!p.acc) p.acc = {};
    return p;
  }
  PW.of = me;
  function set(game) { return game.settings || (game.settings = {}); }
  function cur() { return SB.Game && SB.Game.current; }
  function Sv() { return SB.Surv || SB.Survival; }
  function P() { return SB.Possess; }
  function PS() { var p = P(); return p && p.active && p.state ? p.state() : null; }
  function K() { return SB.KINDS || {}; }
  function label(k) { return K()[k] && K()[k].label ? K()[k].label : k; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function live(game) { return !!game && !game.headless && !game.offline && !(P() && P().headless); }
  function burst(game, name, x, y, z, n, o) { if (SB.FX && SB.FX.burst && live(game)) SB.FX.burst(name, x, y, z, n, o); }
  function snd(name, vol) { if (SB.Audio && SB.Audio.play && !(P() && P().headless)) SB.Audio.play(name, { vol: vol == null ? 0.8 : vol }); }
  function emit(name, d) { if (SB.bus) SB.bus.emit(name, d); }
  function inBody(c) { var S = PS(); return S && c && S.c === c ? S : null; }
  // say it where the player is: on the body's screen, or as a toast in the sky
  function tell(game, c, msg) {
    if (!msg) return;
    if (inBody(c)) { if (P().say) P().say(msg); }
    else if (SB.UI && SB.UI.toast && live(game)) SB.UI.toast(msg, "", 4200, c && c.alive ? c : null);
  }
  function ground(game, x, z) { return SB.World && SB.World.groundY ? SB.World.groundY(game.world, x, z) : 0; }
  function near(game, x, z, r, fn) { if (SB.World && SB.World.creaturesNear) SB.World.creaturesNear(game.world, game, x, z, r, fn); }
  // a perk that lands "chance" of the time with no dice: it builds up and pays out (as body.js does)
  function roll(c, key, chance) {
    if (!(chance > 0)) return false;
    var p = me(c); p.acc[key] = (p.acc[key] || 0) + chance;
    if (p.acc[key] >= 1 - 1e-9) { p.acc[key] -= 1; return true; }
    return false;
  }
  function give(game, c, kind, n) {
    if (!K()[kind] || !Sv()) return 0;
    var left = Sv().add(c, kind, n);
    if (left > 0 && Sv().spawn) Sv().spawn(game, kind, left, c.x + 0.5, c.z + 0.4);
    return n;
  }

  /* ---------------- everything a smol's perks, blessing and the tree's gifts add up to ---------------- */
  var stamp = 1;
  function treeFx(game, out) { var s = st(game); PW.TREE.forEach(function (n) { if (n.fx && s.tree[n.id]) for (var k in n.fx) out[k] = (out[k] || 0) + n.fx[k]; }); return out; }
  function fxOf(game, c) {
    if (!c) return treeFx(game, {});
    if (c._pfx && c._pfxN === stamp && c._pfxG === game) return c._pfx;
    var out = {}, p = c.pw;
    function add(o) { for (var k in o) out[k] = (out[k] || 0) + o[k]; }
    if (p) {
      for (var sk in p.perks || {}) for (var lv in p.perks[sk]) { var L = PW.PERKS[sk], i = PW.PERK_LEVELS.indexOf(+lv), pk = L && i >= 0 ? L[i][p.perks[sk][lv]] : null; if (pk) add(pk[2]); }
      if (p.bless && PW.BLESSING[p.bless]) add(PW.BLESSING[p.bless].fx);
      if (p.scars) out.guard = (out.guard || 0) + 0.02 * Math.min(PW.MAX_SCARS, p.scars); // a scarred smol has learned to roll with it
    }
    treeFx(game, out);
    c._pfx = out; c._pfxN = stamp; c._pfxG = game;
    return out;
  }
  PW.fx = function (c, key, game) { game = game || cur(); if (!game) return 0; return fxOf(game, c)[key] || 0; };

  /* ---------------- buffs: the small public API ---------------- */
  // SB.Powers.buff(c, "swift", 60): c has it for 60 game seconds (a longer one already running is kept)
  PW.buff = function (c, id, seconds, game) {
    game = game || cur();
    if (!c || !id || !game) return false;
    var p = me(c), until = game.time + (seconds > 0 ? seconds : 30);
    if (!(p.buffs[id] > until)) p.buffs[id] = until;
    emit("buff", { c: c, id: id, seconds: seconds });
    return true;
  };
  PW.has = function (c, id, game) { game = game || cur(); var p = c && c.pw; return !!(p && p.buffs && game && p.buffs[id] > game.time); };
  PW.left = function (c, id, game) { game = game || cur(); var p = c && c.pw; return p && p.buffs && game && p.buffs[id] > game.time ? p.buffs[id] - game.time : 0; };
  // take one off (or, with no id, every bad one). returns how many went
  PW.clear = function (c, id) {
    var p = c && c.pw, n = 0; if (!p || !p.buffs) return 0;
    for (var k in p.buffs) if (id ? k === id : PW.BUFFS[k] && PW.BUFFS[k].bad) { delete p.buffs[k]; n++; }
    if (id === "shield") p.shield = 0;
    return n;
  };
  // another system's own buff: SB.Powers.defBuff("stung", { icon: "🐝", text: "stung", bad: true, tip: "..." })
  PW.defBuff = function (id, def) { if (id && def) PW.BUFFS[id] = def; return def; };
  PW.buffsOf = function (c, game) { game = game || cur(); var out = [], p = c && c.pw; if (p && p.buffs && game) for (var k in p.buffs) if (p.buffs[k] > game.time) out.push(k); return out; };

  /* ---------------- the tree ---------------- */
  PW.embers = function (game) { return SB.Embers && SB.Embers.count ? SB.Embers.count(game) : game && game.lantern ? game.lantern.embers || 0 : 0; };
  // embers you can still spend (spending never takes one out of the Lantern)
  PW.points = function (game) { if (SB.Game && SB.Game.sandbox && SB.Game.sandbox(game)) return 99; return Math.max(0, PW.embers(game) - st(game).spent); };
  PW.owns = function (game, id) { return !!(game && game.quests && game.quests.powers && game.quests.powers.tree && game.quests.powers.tree[id]); };
  PW.owned = function (game) { var s = st(game), n = 0; PW.TREE.forEach(function (t) { if (s.tree[t.id]) n++; }); return n; };
  function prevOf(n) { var prev = null; for (var i = 0; i < PW.TREE.length; i++) { var t = PW.TREE[i]; if (t === n) return prev; if (t.branch === n.branch) prev = t; } return null; }
  PW.whyNotLearn = function (game, id) {
    var n = PW.BY[id], s = st(game);
    if (!n) return "no such power";
    if (s.tree[id]) return "the Lantern already remembers that";
    var pv = prevOf(n);
    if (pv && !s.tree[pv.id]) return "relight " + pv.name + " first";
    if (PW.points(game) < n.cost) return "it takes " + n.cost + " ember" + (n.cost > 1 ? "s" : "") + ": you have " + PW.points(game) + " to spend";
    return "";
  };
  PW.learn = function (game, id) {
    var why = PW.whyNotLearn(game, id), n = PW.BY[id], s = st(game);
    if (why) return { ok: false, msg: why };
    s.tree[id] = day(game); s.spent += n.cost; stamp++;
    emit("powerLearned", { id: id, node: n, n: PW.owned(game) });
    return { ok: true, msg: n.icon + " the Lantern remembers " + n.name + ": " + n.desc };
  };
  PW.rank = function (game, id) { var n = st(game).casts[id] || 0; return n >= PW.RANKS[2] ? 3 : n >= PW.RANKS[1] ? 2 : 1; };
  PW.cdLeft = function (game, key) { var t = st(game).cd[key]; return t > game.time ? t - game.time : 0; };
  function cdCut(game, c) { return Math.min(0.5, fxOf(game, c).cd || 0); }

  /* ---------------- stunned grumps (burst, calm, roar, the stagger perk) ---------------- */
  var stunned = []; // [{ g, until, x, z }] not saved: grumps aren't either
  PW.stun = function (game, g, secs) {
    if (!g || !g.alive || !(secs > 0)) return false;
    var until = game.time + secs;
    for (var i = 0; i < stunned.length; i++) if (stunned[i].g === g) { if (until > stunned[i].until) stunned[i].until = until; stunned[i].x = g.x; stunned[i].z = g.z; return true; }
    stunned.push({ g: g, until: until, x: g.x, z: g.z });
    g.action = null;
    if (SB.Creature && SB.Creature.emote) SB.Creature.emote(g, "huh", Math.min(4, secs));
    emit("stunned", { g: g, secs: secs });
    return true;
  };
  PW.isStunned = function (g) { for (var i = 0; i < stunned.length; i++) if (stunned[i].g === g) return true; return false; };
  function stunFrame(game) {
    for (var i = stunned.length - 1; i >= 0; i--) {
      var e = stunned[i], g = e.g;
      if (!g.alive || g.gone || game.time >= e.until) { stunned.splice(i, 1); continue; }
      g.x = e.x; g.z = e.z; g.action = null; g.thinkT = 0.4; g.vx = 0; g.vz = 0; // held where it stands
    }
  }
  function shove(game, g, fx0, fz0, d) {
    var dx = g.x - fx0, dz = g.z - fz0, l = Math.sqrt(dx * dx + dz * dz) || 1, nx = g.x + dx / l * d, nz = g.z + dz / l * d;
    if (SB.World.walkable(game.world, nx, nz, false)) { g.x = nx; g.z = nz; }
  }

  /* ---------------- casting ---------------- */
  function ok(msg, extra) { var r = { ok: true, msg: msg }; for (var k in extra || {}) r[k] = extra[k]; return r; }
  function fail(msg) { return { ok: false, msg: msg }; }
  function r1(v) { return Math.round(v * 10) / 10; }
  // where "home" is for this smol: your own home, its bed, or the nest
  PW.homeSpot = function (game, c) {
    var h = SB.Home && SB.Home.get ? SB.Home.get(game) : null, name = "home", x, z;
    if (h) { x = h.x; z = h.z; }
    else {
      var bd = SB.Wilds && SB.Wilds.bed && c ? SB.Wilds.bed(game, c) : null;
      if (bd) { x = bd.x; z = bd.z; name = "to its bed"; }
      else if (SB.Society && SB.Society.home) { var n = SB.Society.home(game, 0); if (!n) return null; x = n.x; z = n.z; name = "to the nest"; }
      else return null;
    }
    var W = SB.World, w = game.world, offs = [[1.4, 0.6], [-1.4, 0.6], [0.6, 1.6], [0.6, -1.6], [2.2, 0], [0, 0]];
    for (var i = 0; i < offs.length; i++) if (W.walkable(w, x + offs[i][0], z + offs[i][1], false)) return { x: x + offs[i][0], z: z + offs[i][1], name: name };
    return { x: x, z: z, name: name };
  };
  function easeIll(game, c, n) {
    var p = c.pw; if (!p || !p.ill) return false;
    p.ill.stage -= n; p.ill.w = 0;
    if (p.ill.stage < 1) { PW.recover(game, c, "cured"); return true; }
    return false;
  }
  var slowUntil = 0;
  var CAST = {
    reveal: function (game, o) {
      var best = null, bd = 1e9, s = st(game);
      function see(x, z, what) { var d = SB.dist(x, z, o.x, o.z); if (d > 2.5 && d < bd) { bd = d; best = { x: x, z: z, what: what }; } }
      (game.sites || []).forEach(function (si) { if (si && !si.found) see(si.x, si.z, "a place nobody has found"); });
      if (SB.Loot && SB.Loot.state) { var ch = SB.Loot.state(game).chests; for (var k in ch) if (!ch[k].open) see(ch[k].x, ch[k].z, "a chest nobody has opened"); }
      for (var key in s.stones) { var e = s.stones[key]; if (e.kind === "wordstone" ? !s.heard[key] : !e.seen) see(e.x, e.z, e.kind === "wordstone" ? "a whisper stone" : "a blessing stone"); }
      if (!best) return fail("the light finds nothing hidden, near or far");
      if (o.body && P().setGoal) P().setGoal({ x: best.x, z: best.z, label: "✨ " + best.what, small: true });
      var msg = "🔦 the light shows " + best.what + ", " + Math.round(bd) + " steps off" + (o.body ? ": follow the mark" : "");
      if (!o.body && SB.UI && SB.UI.toast && live(game)) SB.UI.toast(msg, "", 7000, { x: best.x, z: best.z });
      return ok(msg, { found: best });
    },
    ward: function (game, o) {
      var s = st(game);
      s.wards.push({ x: r1(o.x), z: r1(o.z), until: Math.round(game.time + PW.WARD_T * o.k), r: PW.WARD_R });
      while (s.wards.length > PW.WARD_MAX) s.wards.shift();
      wardTick(game);
      return ok("🕯 a ward of light. grumps turn back at its edge for a good while");
    },
    burst: function (game, o) {
      var n = 0;
      near(game, o.x, o.z, 6 * o.k, function (g) { if (g.species !== "grump" || !g.alive) return; PW.stun(game, g, (g.boss ? 2 : 4) * o.k); if (!g.boss) SB.Chem.apply(g.chem, { fear: 0.4 }); n++; });
      if (SB.Render && SB.Render.flash && live(game) && !set(game).noFlash) SB.Render.flash(0.6, true);
      return ok(n ? "💥 " + n + " grump" + (n > 1 ? "s" : "") + " stunned by the light" : "💥 a burst of light. no grump was close", { n: n });
    },
    skin: function (game, o) {
      if (!o.c) return fail("pick a smol first");
      me(o.c).shield = 2 + PW.rank(game, "skin");
      PW.buff(o.c, "shield", 180, game);
      return ok("🛡 lantern skin: the next " + me(o.c).shield + " bites slide off " + (o.body ? "you" : o.c.name));
    },
    recall: function (game, o) {
      var t = o.c, S = inBody(t);
      if (!t) return fail("pick a smol first");
      if (PW.noFastTravel(game)) return fail("survival: the light won't carry anyone. walk it");
      if (S && (S.firstNight || S.nightChase)) return fail("not tonight");
      var h = PW.homeSpot(game, t);
      if (!h) return fail("there is no home to go to");
      if (SB.dist(t.x, t.z, h.x, h.z) < 6) return fail(o.body ? "you are home already" : t.name + " is home already");
      if (S && S.scout != null && P().endScout) P().endScout("🏠 the light carried you off. the grump lost you", 0, "recall");
      burst(game, "sparkle", t.x, (t.y || 0) + 0.8, t.z, 18);
      t.x = h.x; t.z = h.z; if (t.px != null) { t.px = t.x; t.pz = t.z; }
      t.action = null;
      return ok("🏠 the light carries " + (o.body ? "you" : t.name) + " " + h.name, { to: h });
    },
    heal: function (game, o) {
      var done = [];
      function one(c) {
        if (done.indexOf(c) >= 0) return;
        done.push(c);
        SB.Chem.apply(c.chem, { sick: -0.6, pain: -0.6, toxin: -0.5, antigen: -0.5, health: 0.35 * o.k, fear: -0.2 });
        easeIll(game, c, 1);
        if (SB.Creature.emote) SB.Creature.emote(c, "love", 2);
      }
      if (o.c) one(o.c);
      near(game, o.x, o.z, 4.5 * o.k, function (c) { if (c.species === "smol" && c.alive) one(c); });
      if (!done.length) return fail("no smol is close enough to heal");
      return ok("💚 the light mends " + (done.length > 1 ? done.length + " smols" : o.body ? "you" : done[0].name), { n: done.length });
    },
    mend: function (game, o) {
      var t = o.c; if (!t) return fail("pick a smol first");
      var p = me(t), n = (SB.Body && t.body && t.body.wounds ? t.body.wounds.length : 0) + (PW.sprained(t, game) ? 1 : 0);
      if (!n) return fail(o.body ? "you have nothing to mend" : t.name + " has nothing to mend");
      p.bound = 1; p.sprain = 0;
      if (SB.Body) SB.Body.heal(t);
      SB.Chem.apply(t.chem, { pain: -0.5 });
      return ok("🩹 mended, with no scar", { n: n });
    },
    calm: function (game, o) {
      var n = 0, g = 0;
      near(game, o.x, o.z, 6 * o.k, function (c) {
        if (!c.alive) return;
        if (c.species === "smol") { SB.Chem.apply(c.chem, { fear: -0.7, adrenaline: -0.5, punish: -0.3 }); if (c !== o.c) n++; }
        else if (c.species === "grump" && !c.boss) { PW.stun(game, c, 5 * o.k); g++; }
      });
      if (o.c) { SB.Chem.apply(o.c.chem, { fear: -0.7, adrenaline: -0.5 }); PW.buff(o.c, "calm", 60, game); }
      return ok("🌙 calm settles" + (n ? " on " + n + " smol" + (n > 1 ? "s" : "") : "") + (g ? ". " + g + " grump" + (g > 1 ? "s doze" : " dozes") + " off" : ""), { n: n, grumps: g });
    },
    grow: function (game, o) {
      var W = SB.World, w = game.world, n = 0, r = 6 * o.k;
      var BACK = { stump: 1, picked: 1, gone: 1, burnt: 1 };
      (W.nodesNear ? W.nodesNear(w, o.x, o.z, r, function (nd) { return !!BACK[nd.state]; }) || [] : []).forEach(function (nd) {
        nd.state = "ok"; nd.left = null; nd.hp = null; nd.regrowT = 0; nd.grow = null; if (nd.noun === "fire") nd.noun = "plant";
        if (W.markNode) W.markNode(w, nd);
        n++;
      });
      (W.structsNear ? W.structsNear(w, o.x, o.z, r, function (b) { return b.kind === "farm" && b.done && b.data && (b.data.grow || 0) < 1; }) || [] : []).forEach(function (b) { b.data.grow = Math.min(1, (b.data.grow || 0) + 0.5); n++; });
      if (!n) return fail("nothing here needs to grow back");
      burst(game, "sparkle", o.x, ground(game, o.x, o.z) + 0.6, o.z, 20, { r: 3, col: [0.5, 1, 0.6] });
      return ok("🌱 " + n + " thing" + (n > 1 ? "s grow" : " grows") + " back", { n: n });
    },
    share: function (game, o) {
      var from = o.c, to = null, bd = 6.5;
      if (!from) return fail("pick a smol first");
      near(game, from.x, from.z, 6.5, function (c) { if (c === from || c.species !== "smol" || !c.alive) return; var d = SB.dist(c.x, c.z, from.x, from.z); if (d < bd) { bd = d; to = c; } });
      if (o.to) to = o.to;
      if (!to) return fail("nobody is close enough to share with");
      var I = SB.Ideas, got = PW.shareBetween(game, from, to) || PW.shareBetween(game, to, from);
      if (!got) return fail(from.name + " and " + to.name + " already know everything the other does");
      if (SB.Creature.emote) { SB.Creature.emote(got.to, "idea", 2); }
      return ok("💭 " + got.from.name + " showed " + got.to.name + " " + (got.idea ? (I && I.BY_ID[got.idea] ? I.BY_ID[got.idea].name : got.idea) : "how " + SB.Body.BY_ID[got.skill].label + " is done"), got);
    },
    slow: function (game, o) {
      if (!o.body) return fail("slow time works from inside a body");
      slowUntil = game.time + 3 * o.k; game.speed = PW.SLOW;
      return ok("⏳ the island crawls. go!");
    }
  };
  // one memory from a to b: an idea b can hold and doesn't have, or else a level of a's best skill
  PW.shareBetween = function (game, a, b) {
    var I = SB.Ideas, B = SB.Body, id;
    if (I && a.ideas) for (id in a.ideas) if (a.ideas[id] >= 1 && !I.known(b, id) && I.canHold(b, id)) { b.ideas[id] = 1; emit("ideaShared", { from: a, to: b, id: id }); return { from: a, to: b, idea: id }; }
    if (B) {
      var best = null, bl = 0;
      B.SKILLS.forEach(function (s) { var d = B.level(a, s.id) - B.level(b, s.id); if (d > bl) { bl = d; best = s.id; } });
      if (best) { var sk = B.of(b).sk[best] || (B.of(b).sk[best] = { l: 0, x: 0 }); sk.l++; sk.x = 0; emit("skillUp", { c: b, id: best, level: sk.l, shared: true }); return { from: a, to: b, skill: best }; }
    }
    return null;
  };
  PW.noFastTravel = function (game) { return !!(game && game.settings && game.settings.survival); };
  PW.slowed = function (game) { return slowUntil > 0 && !!game && game.time < slowUntil; };
  // cast a power. c: the smol it is about (the body you are in, or the sky's pick); at: {x, z} for a sky cast
  PW.cast = function (game, id, c, at) {
    var n = PW.BY[id], s = st(game), S = inBody(c), body = !!S;
    if (!n || n.kind !== "cast") return fail("no such power");
    if (!s.tree[id]) return fail("the Lantern hasn't remembered " + n.name + " yet");
    var left = PW.cdLeft(game, id);
    if (left > 0) return fail(n.name + " is ready in " + Math.ceil(left) + "s");
    var x = body ? c.x : at ? at.x : c ? c.x : null, z = body ? c.z : at ? at.z : c ? c.z : null;
    if (x == null) return fail("pick a place or a smol first");
    var f = fxOf(game, body ? c : null), pep = n.pep * (1 - Math.min(0.5, f.cost || 0)), sparks = body ? 0 : SB.Game.miracleCost ? SB.Game.miracleCost(game, n.sparks) : n.sparks;
    if (body && S.stam < pep && !godOn(game)) return fail("not enough pep: " + n.name + " takes " + Math.round(pep * 100) + "%");
    if (!body && (game.sparks || 0) < sparks) return fail("not enough sparks ✨ (" + sparks + " needed)");
    var rank0 = PW.rank(game, id);
    var res = CAST[id](game, { c: c || null, x: x, z: z, body: body, S: S, k: 1 + 0.25 * (rank0 - 1) });
    if (!res.ok) return res; // nothing spent on a power that had nothing to do
    if (body) S.stam = Math.max(0, S.stam - (godOn(game) ? 0 : pep)); else if (sparks > 0 && SB.Game.spend) SB.Game.spend(game, sparks);
    s.cd[id] = Math.round(game.time + n.cd * (1 - cdCut(game, body ? c : null)));
    s.casts[id] = (s.casts[id] || 0) + 1;
    if (PW.rank(game, id) > rank0) res.msg += " · " + n.name + " grew stronger (rank " + PW.rank(game, id) + ")";
    if (id !== "grow" && id !== "recall") burst(game, id === "burst" || id === "ward" ? "gold" : "sparkle", x, ground(game, x, z) + 0.8, z, 16, { r: 2.5 });
    snd(id === "burst" ? "whoosh" : "chime", 0.7);
    emit("power", { id: id, c: c || null, x: x, z: z, sky: !body, res: res });
    return res;
  };

  /* ---------------- words of power ---------------- */
  PW.wordLevel = function (game, id) { return st(game).words[id] || 0; };
  PW.shout = function (game, c, id) {
    var w = PW.WORD[id], L = PW.wordLevel(game, id), S = inBody(c), s = st(game);
    if (!w) return fail("no such word");
    if (!L) return fail("you haven't found that word yet. whisper stones teach them");
    if (!S) return fail("a word of power is said from inside a body");
    var left = PW.cdLeft(game, "w:" + id);
    if (left > 0) return fail("your voice needs " + Math.ceil(left) + "s more");
    var n = 0, msg = "";
    if (id === "roar") {
      near(game, c.x, c.z, 4 + L, function (g) { if (g.species !== "grump" || !g.alive) return; if (!g.boss) { shove(game, g, c.x, c.z, 1 + L * 0.5); SB.Chem.apply(g.chem, { fear: 0.15 * L }); } PW.stun(game, g, g.boss ? 0.5 + L * 0.5 : 1 + L); n++; });
      msg = n ? "🦁 ROAR! " + n + " grump" + (n > 1 ? "s stagger" : " staggers") + " back" : "🦁 ROAR! nothing was close enough to hear it";
    } else if (id === "call") {
      var list = [];
      near(game, c.x, c.z, 8 + 4 * L, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep && !o.heldBy) list.push(o); });
      list.sort(function (a, b) { return SB.dist(a.x, a.z, c.x, c.z) - SB.dist(b.x, b.z, c.x, c.z); });
      list.slice(0, 1 + 2 * L).forEach(function (o) { if (SB.Creature.sendTo && SB.Creature.sendTo(o, c.x, c.z, game, 14)) n++; });
      msg = n ? "📣 " + n + " friend" + (n > 1 ? "s are" : " is") + " coming" : "📣 you call. nobody is near enough to hear";
    } else if (id === "hush") {
      PW.buff(c, "hushed", 8 + 4 * L, game);
      n = hushScout(game, c, S) ? 1 : 0;
      msg = n ? "🤫 hush. the grump has lost you" : "🤫 hush. your light dims for a while";
    } else {
      S.stam = Math.min(1, S.stam + 0.25 + 0.15 * L);
      near(game, c.x, c.z, 6, function (o) { if (o !== c && o.species === "smol" && o.alive) { SB.Chem.apply(o.chem, { reward: 0.2, fear: -0.2, bored: -0.2 }); if (SB.Creature.emote) SB.Creature.emote(o, "happy", 2); n++; } });
      PW.buff(c, "cheered", 30 * L, game);
      msg = "🎉 a cheer! pep back" + (n ? ", and " + n + " smol" + (n > 1 ? "s" : "") + " cheered up" : "");
    }
    s.cd["w:" + id] = Math.round(game.time + w.cd * (1 - cdCut(game, c)));
    if (SB.Creature && SB.Creature.say) SB.Creature.say(c, id + "!", game);
    snd(id === "roar" ? "grump" : "chime", 0.7);
    emit("shout", { c: c, id: id, level: L, n: n });
    return ok(msg, { n: n });
  };
  // a grump hunting a hushed smol gives up (not a captain, not the story's own chases)
  function hushScout(game, c, S) {
    if (!S || S.scout == null || S.firstNight || S.nightChase || !P().endScout) return false;
    var g = SB.Game.byId(game, S.scout);
    if (!g || g.boss) return false;
    P().endScout("🤫 the grump lost you in the hush", 1, "hush");
    return true;
  }

  /* ---------------- the stones ---------------- */
  SB.STRUCTS = SB.STRUCTS || {};
  if (!SB.STRUCTS.blessstone) SB.STRUCTS.blessstone = { noun: "wonder", label: "blessing stone", emoji: "🗿", r: 0.5, cost: {}, work: 1, desc: "old, tall and warm to the touch. a smol who touches it carries one blessing away." };
  if (!SB.STRUCTS.wordstone) SB.STRUCTS.wordstone = { noun: "wonder", label: "whisper stone", emoji: "🪨", r: 0.35, cost: {}, work: 1, desc: "put an ear to it. it remembers a word of power." };
  // put the fifteen stones down, once per island, with our own dice. returns how many were placed
  PW.placeStones = function (game) {
    var s = st(game);
    if (s.placed || !game.world || !game.world.structures || !SB.World || !SB.World.walkable) return 0;
    s.placed = 1;
    var w = game.world, W = SB.World, r = SB.rng((hashKey("powers:stones") ^ (game.seed >>> 0)) >>> 0), N = w.T && w.T.N ? w.T.N : 256;
    var hm = SB.Society && SB.Society.home ? SB.Society.home(game, 0) : null;
    if (!hm) hm = { x: N / 2, z: N / 2 };
    var reach = Math.max(18, N / 2 - 8), spots = [], n = 0;
    function spot(minD, maxD) {
      for (var t = 0; t < 400; t++) {
        var a = r() * 6.283, d = minD + r() * Math.max(1, Math.min(maxD, reach) - minD) + (t > 200 ? (r() - 0.5) * 20 : 0), x = hm.x + Math.sin(a) * d, z = hm.z + Math.cos(a) * d, clash = false;
        if (W.inBounds && !W.inBounds(w, x, z)) continue;
        if (!W.walkable(w, x, z, false)) continue;
        if (W.depthAt && W.depthAt(w, x, z) > 0.02) continue;
        for (var i = 0; i < spots.length; i++) if (SB.dist(spots[i].x, spots[i].z, x, z) < 8) clash = true;
        if (clash || SB.dist(x, z, hm.x, hm.z) < 9) continue;
        return { x: r1(x), z: r1(z) };
      }
      return null;
    }
    function put(key, kind, data, minD, maxD) {
      var p = spot(minD, maxD); if (!p) return;
      data.pw = key;
      var b = { id: SB.Game.newId(game), type: "struct", kind: kind, noun: "wonder", x: p.x, z: p.z, rot: (hashKey(key) % 628) / 100, s: 1, done: true, work: 0, need: {}, tribe: 0, builders: [], data: data, born: game.time, name: null };
      w.structures.push(b); spots.push(p);
      s.stones[key] = { id: b.id, x: p.x, z: p.z, kind: kind };
      n++;
    }
    ["a", "b", "c"].forEach(function (k, i) { put("bless-" + k, "blessstone", { set: k }, 14 + i * 6, 34 + i * 14); });
    PW.WORDS.forEach(function (wd) { for (var i = 0; i < 3; i++) put("word-" + wd.id + "-" + (i + 1), "wordstone", { word: wd.id }, 12 + i * 12, 30 + i * 28); });
    emit("stonesPlaced", { n: n });
    return n;
  };
  PW.stoneAt = function (game, c, kind, r) {
    var best = null, bd = r || 4.5;
    game.world.structures.forEach(function (b) { if (b.kind !== kind || !b.data || !b.data.pw) return; var d = SB.dist(b.x, b.z, c.x, c.z); if (d < bd) { bd = d; best = b; } });
    return best;
  };
  // listen to a whisper stone: each one teaches its word one level, once
  PW.hear = function (game, c, b) {
    var s = st(game), key = b && b.data ? b.data.pw : null, wd = b && b.data ? PW.WORD[b.data.word] : null;
    if (!key || !wd) return fail("it's only a stone");
    if (SB.dist(c.x, c.z, b.x, b.z) > 4.5) return fail("get closer");
    if (s.heard[key]) return fail("you have heard this stone already. " + wd.name + " is at level " + PW.wordLevel(game, wd.id));
    s.heard[key] = day(game);
    s.words[wd.id] = Math.min(3, (s.words[wd.id] || 0) + 1);
    emit("wordLearned", { c: c, id: wd.id, level: s.words[wd.id], st: b });
    return ok("🗣 the stone whispers “" + wd.name + "” (level " + s.words[wd.id] + " of 3): " + wd.desc + ". say it from your bag's lantern tab");
  };
  // a blessing stone's small gift, once a day per stone: a boon, and a sickness eased
  PW.touch = function (game, c, b) {
    var s = st(game), key = b && b.data ? b.data.pw : null, e = key ? s.stones[key] : null;
    if (!e || b.kind !== "blessstone") return fail("it's only a stone");
    if (SB.dist(c.x, c.z, b.x, b.z) > 4.5) return fail("get closer");
    e.seen = 1;
    var p = me(c), d = day(game), msg = "🗿 " + PW.SETS[b.data.set] + ". " + (p.bless ? "you carry " + PW.BLESSING[p.bless].name + ": pick another to swap" : "pick a blessing to carry");
    if (e.day !== d) {
      e.day = d;
      PW.buff(c, "boon", 240, game);
      easeIll(game, c, 1);
      msg += " · the stone is warm today: pep comes back faster for a while";
      emit("stoneBoon", { c: c, st: b });
    }
    return ok(msg, { set: b.data.set });
  };
  PW.blessingOf = function (c) { return c && c.pw && PW.BLESSING[c.pw.bless] ? PW.BLESSING[c.pw.bless] : null; };
  PW.offered = function (game, c) { var b = PW.stoneAt(game, c, "blessstone"); return b ? PW.BLESS.filter(function (x) { return x.set === b.data.set; }) : []; };
  PW.bless = function (game, c, id) {
    var bl = PW.BLESSING[id], b = PW.stoneAt(game, c, "blessstone");
    if (!bl) return fail("no such blessing");
    if (!b) return fail("blessings are given at a blessing stone. find one and touch it");
    if (b.data.set !== bl.set) return fail("this stone doesn't hold " + bl.name + ". " + PW.SETS[bl.set] + " does");
    var p = me(c), was = p.bless;
    if (was === id) return fail("you carry " + bl.name + " already");
    p.bless = id; stamp++;
    st(game).stones[b.data.pw].seen = 1;
    emit("blessed", { c: c, id: id, was: was || null });
    return ok(bl.icon + " " + c.name + " carries " + bl.name + " now: " + bl.desc + (was ? " (" + PW.BLESSING[was].name + " is left at the stone)" : ""));
  };

  /* ---------------- skill perks ---------------- */
  PW.bodyLevel = function (c) { return SB.Body && c ? SB.Body.total(c) : 0; };
  PW.perkOf = function (c, skill, lvl) { var p = c && c.pw, v = p && p.perks && p.perks[skill] ? p.perks[skill][lvl] : null, i = PW.PERK_LEVELS.indexOf(+lvl); return v != null && PW.PERKS[skill] && i >= 0 ? PW.PERKS[skill][i][v] : null; };
  // the picks this smol has earned and not made yet: [{ skill, lvl }]
  PW.perkOpen = function (c) {
    var out = [];
    if (!SB.Body || !c) return out;
    SB.Body.SKILLS.forEach(function (s) { PW.PERK_LEVELS.forEach(function (lv) { if (PW.PERKS[s.id] && SB.Body.level(c, s.id) >= lv && !PW.perkOf(c, s.id, lv)) out.push({ skill: s.id, lvl: lv }); }); });
    return out;
  };
  PW.pickPerk = function (game, c, skill, lvl, opt) {
    var i = PW.PERK_LEVELS.indexOf(+lvl), L = PW.PERKS[skill];
    if (!L || i < 0 || !L[i][opt]) return fail("no such perk");
    if (!SB.Body || SB.Body.level(c, skill) < lvl) return fail("that takes " + SB.Body.BY_ID[skill].label + " level " + lvl);
    if (PW.perkOf(c, skill, lvl)) return fail("already picked. an ember clears a skill's perks");
    var p = me(c); (p.perks[skill] || (p.perks[skill] = {}))[lvl] = +opt; stamp++;
    emit("perk", { c: c, skill: skill, lvl: +lvl, opt: +opt });
    return ok("⭐ " + L[i][opt][0] + ": " + L[i][opt][1]);
  };
  PW.resetPerks = function (game, c, skill) {
    var p = me(c);
    if (!p.perks[skill] || !Object.keys(p.perks[skill]).length) return fail("no perks picked there");
    if (PW.points(game) < 1) return fail("clearing a skill's perks takes an ember to spend");
    delete p.perks[skill]; st(game).spent += 1; stamp++;
    emit("perkReset", { c: c, skill: skill });
    return ok("the perks for " + SB.Body.BY_ID[skill].label + " are yours to pick again");
  };

  /* ---------------- sickness ---------------- */
  PW.illOf = function (c) { var p = c && c.pw; return p && p.ill && PW.ILL[p.ill.id] ? p.ill : null; };
  PW.immune = function (game, c, id) { var p = c && c.pw; return !!(p && p.immune && p.immune[id] >= day(game)); };
  PW.catchIll = function (game, c, id, quiet) {
    var d = PW.ILL[id]; if (!d || !c || !c.alive) return false;
    var p = me(c);
    if (p.ill || PW.immune(game, c, id) || PW.has(c, "braced", game) || godOn(game)) return false;
    p.ill = { id: id, t0: Math.round(game.time), stage: 1, heal: 0, w: 0 };
    if (!quiet) { tell(game, c, d.icon + " " + (inBody(c) ? "you have" : c.name + " has") + " " + d.name + " (" + d.cause + "). rest, or take " + label(d.cure)); if (inBody(c)) snd("sick", 0.6); }
    emit("illness", { c: c, id: id });
    return true;
  };
  PW.recover = function (game, c, how) {
    var p = me(c), ill = p.ill; if (!ill) return false;
    p.ill = null; p.immune[ill.id] = day(game) + PW.IMMUNE_DAYS;
    SB.Chem.apply(c.chem, { sick: -0.5, antigen: -0.5, toxin: -0.3 });
    tell(game, c, "🌤 " + (inBody(c) ? "you are" : c.name + " is") + " over " + PW.ILL[ill.id].name + ". it won't come back for a good while");
    emit("recovered", { c: c, id: ill.id, how: how || "rest" });
    return true;
  };
  function illCap(p) {
    var ill = p.ill; if (!ill) return 1;
    var k = ill.stage, per = ill.id === "sniffles" ? 0.12 : ill.id === "daze" ? 0.12 : ill.id === "rot" ? 0.08 : ill.id === "dims" ? 0 : 0.1;
    return 1 - per * k;
  }

  /* ---------------- wounds and care ---------------- */
  PW.sprained = function (c, game) { game = game || cur(); var p = c && c.pw; return !!(p && p.sprain > 0 && game && p.sprain > game.time); };
  PW.sprain = function (game, c) { var p = me(c); if (PW.sprained(c, game)) return false; p.sprain = Math.round(game.time + PW.SPRAIN); emit("wound", { c: c, kind: "sprain" }); return true; };
  PW.scars = function (c) { return (c && c.pw && c.pw.scars) || 0; };
  function hasCut(c) { return !!(SB.Body && SB.Body.has(c, "cut")); }
  function wounded(c, game) { return !!(c.body && c.body.wounds && c.body.wounds.length) || PW.sprained(c, game); }

  /* ---------------- remedies and brews: making and using ---------------- */
  PW.costText = function (rc) { var out = []; for (var k in rc.in) out.push(rc.in[k] + " " + label(k)); return out.join(", ") + (rc.at ? ", by a fire" : ""); };
  PW.whyNotMake = function (game, c, id) {
    var rc = PW.RECIPE[id];
    if (!rc || !K()[id]) return "no such thing";
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    for (var k in rc.in) if (Sv().count(c, k, true) < rc.in[k]) return "it needs " + PW.costText(rc);
    if (rc.at === "fire" && !(Sv().nearFire && Sv().nearFire(c, game)) && !Sv().has(c, "torch")) return "do this by a fire";
    return "";
  };
  PW.make = function (game, c, id) {
    var why = PW.whyNotMake(game, c, id), rc = PW.RECIPE[id];
    if (why) return fail(why);
    for (var k in rc.in) Sv().take(c, k, rc.in[k]);
    var n = 1 + (rc.group !== "brew" && roll(c, "medExtra", fxOf(game, c).medExtra) ? 1 : 0);
    give(game, c, id, n);
    if (c.stats) c.stats.crafted = (c.stats.crafted || 0) + 1;
    emit("craft", { c: c, id: "herbal", item: { kind: id }, pov: !!inBody(c), remedy: true });
    return ok("made " + (n > 1 ? "two " + label(id) + "s" : "a " + label(id)) + ": " + K()[id].desc, { n: n });
  };
  PW.usable = function (kind) { return !!PW.RECIPE[kind]; };
  PW.useLabel = function (kind) { return kind === "bandage" ? "bind your cut with the bandage" : kind === "splint" ? "set your sprain with the splint" : kind === "poultice" ? "put the poultice on" : kind === "kit" ? "use the healer's kit" : kind === "chew" ? "chew the bark" : kind === "crittercharm" ? "rub the critter charm" : "drink your " + label(kind); };
  // use one from the bag. nothing is used up when it had nothing to do
  PW.use = function (game, c, kind) {
    if (!PW.usable(kind) || !Sv().count(c, kind, true)) return fail("you have none");
    var p = me(c), ill = PW.illOf(c), B = SB.Body, msg = "", keep = false;
    function cures(id) { return !!ill && PW.ILL[ill.id].cure === id; }
    if (kind === "bandage") {
      if (!hasCut(c)) return fail("no cut to bind");
      B.heal(c, "cut"); p.bound = 1; msg = "🩹 bound clean. it will leave no scar"; keep = roll(c, "medSave", fxOf(game, c).medSave);
    } else if (kind === "splint") {
      if (!PW.sprained(c, game)) return fail("nothing is sprained");
      p.sprain = 0; msg = "🦴 set and strapped. you can run again"; keep = roll(c, "medSave", fxOf(game, c).medSave);
    } else if (kind === "poultice") {
      if (!hasCut(c) && !cures("poultice")) return fail("no wound to put it on");
      if (hasCut(c)) { B.heal(c, "cut"); p.bound = 1; }
      if (cures("poultice")) PW.recover(game, c, "cured");
      msg = "🌿 the poultice draws it clean"; keep = roll(c, "medSave", fxOf(game, c).medSave);
    } else if (kind === "chew") {
      if (B) B.heal(c, "bruise");
      SB.Chem.apply(c.chem, { pain: -0.5 }); msg = "🪵 bitter. the ache fades";
    } else if (kind === "kit") {
      if (!ill && !wounded(c, game)) return fail("you are not hurt or sick");
      if (B) B.heal(c);
      p.bound = 1; p.sprain = 0;
      if (ill) PW.recover(game, c, "cured");
      SB.Chem.apply(c.chem, { health: 0.2, pain: -0.6 }); msg = "🧺 patched up, top to tail";
    } else if (kind === "bracetea") {
      PW.buff(c, "braced", 600, game); msg = "🫖 braced: nothing will catch you for a good while";
    } else if (kind === "tummytea" || kind === "broth" || kind === "syrup" || kind === "suntea") {
      if (kind === "broth") PW.buff(c, "warm", 120, game);
      else if (!cures(kind)) return fail(ill ? "that won't shift " + PW.ILL[ill.id].name + ". it wants " + label(PW.ILL[ill.id].cure) : "you feel fine. save it");
      if (cures(kind)) PW.recover(game, c, "cured");
      msg = kind === "broth" ? "🥣 warm right through" : "that did it";
    } else {
      // a brew: one at a time
      if (PW.has(c, "fizz", game)) return fail("your tummy is still fizzing from the last brew. give it " + Math.ceil(PW.left(c, "fizz", game)) + "s");
      if (kind === "cleartea") { var n = PW.clear(c); SB.Chem.apply(c.chem, { fear: -0.5, pain: -0.3 }); msg = n ? "🫗 clear as a bell: " + n + " bad feeling" + (n > 1 ? "s" : "") + " washed off" : "🫗 clear as a bell"; }
      else {
        var bw = PW.BREWS[kind];
        PW.buff(c, bw[0], bw[1], game);
        if (bw[0] === "shield") p.shield = Math.max(p.shield || 0, 3);
        msg = K()[kind].emoji + " " + K()[kind].desc;
      }
      PW.buff(c, "fizz", PW.FIZZ, game);
    }
    if (!keep) Sv().take(c, kind, 1);
    emit("medicine", { c: c, kind: kind, kept: !!keep });
    return ok(msg + (keep ? " (and it's good for another go)" : ""));
  };
  // a smol who knows herb lore tends you: wounds bound clean, a sickness eased, a little heart back. two shells if you have them
  PW.healerNear = function (game, c) {
    var best = null, bd = 4.5, I = SB.Ideas;
    if (!I) return null;
    near(game, c.x, c.z, 4.5, function (o) { if (o === c || o.species !== "smol" || !o.alive || o.asleep || !I.known(o, "herbal")) return; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < bd) { bd = d; best = o; } });
    return best;
  };
  PW.TEND_FEE = 2;
  PW.tend = function (game, c, healer) {
    if (!healer || !healer.alive || !SB.Ideas || !SB.Ideas.known(healer, "herbal")) return fail("nobody here knows herb lore");
    if (SB.dist(c.x, c.z, healer.x, healer.z) > 5) return fail(healer.name + " is over there");
    if (!PW.illOf(c) && !wounded(c, game) && c.chem.health > 0.95) return fail(healer.name + " looks you over. you're fine");
    if (healer._tendT > game.time) return fail(healer.name + " is still washing its paws. in a moment");
    healer._tendT = game.time + 60;
    var p = me(c), paid = (c.purse || 0) >= PW.TEND_FEE;
    if (paid) { c.purse = Math.round(((c.purse || 0) - PW.TEND_FEE) * 100) / 100; healer.purse = Math.round(((healer.purse || 0) + PW.TEND_FEE) * 100) / 100; }
    if (SB.Body) SB.Body.heal(c);
    p.bound = 1; p.sprain = 0;
    easeIll(game, c, paid ? 2 : 1);
    SB.Chem.apply(c.chem, { health: paid ? 0.3 : 0.15, pain: -0.5 });
    if (SB.Creature.emote) SB.Creature.emote(healer, "love", 2);
    emit("tended", { c: c, healer: healer, paid: paid });
    return ok("🌿 " + healer.name + " tends you" + (paid ? " for " + PW.TEND_FEE + " " + (SB.Loot && SB.Loot.moneyIcon ? SB.Loot.moneyIcon(game) : "🐚") : " for nothing (you have no money)") + ": bound clean, and you feel better", { paid: paid });
  };

  /* ---------------- difficulty and modes (all in game.settings) ---------------- */
  var NORMAL = { id: "normal", dmg: 1, hunger: 1, price: 1 };
  PW.diff = function (game) { var d = game && game.settings && game.settings.diff; return d && typeof d === "object" && d.dmg > 0 && d.hunger > 0 && d.price > 0 ? d : NORMAL; };
  PW.setDiff = function (game, id) {
    var p = PW.PRESET[id], s = set(game); if (!p) return false;
    s.diff = { id: id, dmg: p.dmg, hunger: p.hunger, price: p.price };
    s.peaceful = !!p.peaceful;
    if (SB.Wilds && SB.Wilds.set) SB.Wilds.set(game, p.wilds); // (a survival run keeps the level it started on)
    emit("difficulty", { id: id });
    return true;
  };
  // one of the three knobs, a step up (and round again): dmg, hunger, price
  PW.knob = function (game, key) {
    if (key !== "dmg" && key !== "hunger" && key !== "price") return false;
    var d = PW.diff(game), n = { id: "custom", dmg: d.dmg, hunger: d.hunger, price: d.price }, i = 0;
    while (i < PW.KNOBS.length && PW.KNOBS[i] <= d[key] + 1e-6) i++;
    n[key] = PW.KNOBS[i % PW.KNOBS.length];
    set(game).diff = n;
    emit("difficulty", { id: "custom" });
    return n[key];
  };
  PW.on = function (game, key) { return !!(game && game.settings && game.settings[key]); };
  PW.toggle = function (game, key) {
    if (!PW.TOGGLES[key]) return false;
    if (key === "god" && !(SB.Game.sandbox && SB.Game.sandbox(game))) return false;
    var s = set(game); s[key] = !s[key];
    if (key === "holdToggle" && !s[key]) runLock = false;
    applyAccess(game);
    emit("mode", { key: key, on: !!s[key] });
    return true;
  };
  function godOn(game) { return !!(game && game.settings && game.settings.god && SB.Game && SB.Game.sandbox && SB.Game.sandbox(game)); }
  var runLock = false, styled = false;
  PW.runLocked = function () { return runLock; };
  PW.setRunLock = function (on) { runLock = !!on; return runLock; };
  function applyAccess(game) {
    if (typeof document === "undefined" || !document.body || !document.body.classList) return;
    var s = set(game);
    if (!styled && document.createElement && document.head) {
      styled = true;
      try {
        var el = document.createElement("style");
        el.textContent = "body.sb-bigmarks #pov .qmark span{font-size:17px;font-weight:800}body.sb-bigmarks #pov .qmark i{width:18px;height:18px;box-shadow:0 0 0 3px rgba(255,255,255,.7)}body.sb-noflash #pov .hurt,body.sb-noflash #pov .flash{animation:none!important;opacity:0!important}";
        document.head.appendChild(el);
      } catch (e) {}
    }
    document.body.classList.toggle("sb-bigmarks", !!s.bigMarks);
    document.body.classList.toggle("sb-noflash", !!s.noFlash);
  }

  /* ---------------- the body, every frame ---------------- */
  var tr = { id: null }, lastH = null, lastId = null;
  function tracker(c) {
    if (tr.id !== c.id) { var b = c.body; tr = { id: c.id, ag: c.chem.antigen || 0, tox: c.chem.toxin || 0, cut: hasCut(c), cutT: 0, chill: 0, expo: 0, rest: 0, fire: false, bound: b && b.n ? b.n.bound || 0 : 0 }; }
    return tr;
  }
  // a blow just landed (was -> now). what it really costs, after the island's bite, your guard, a lantern skin
  function blow(game, c, S, p, f, was, now, lesson) {
    var d = was - now, grump = false, mul = 1;
    near(game, c.x, c.z, 5, function (o) { if (o.species === "grump" && o.alive) grump = true; });
    if (godOn(game)) mul = 0;
    else if (p.shield > 0 && PW.has(c, "shield", game)) {
      p.shield--; mul = 0;
      if (!p.shield) PW.clear(c, "shield");
      tell(game, c, "🛡 the glow soaks it" + (p.shield ? " (" + p.shield + " left)" : ". that was the last of it"));
    } else {
      if (grump) mul *= PW.diff(game).dmg;
      mul *= 1 - Math.min(0.6, (f.guard || 0) + (S.running ? f.runGuard || 0 : 0));
      if (PW.has(c, "critter", game)) mul *= 1.25;
    }
    var nh = clamp(was - d * mul, 0.02, 1);
    if (grump && mul > 0 && !lesson) {
      p.hits = (p.hits || 0) + 1;
      if (S.running && p.hits % 4 === 0 && PW.sprain(game, c)) tell(game, c, "🦶 you turned your paw running. a splint sets it; until then running costs more");
    }
    if (nh < 0.2 && mul > 0 && !lesson && PW.owns(game, "wind") && st(game).windDay !== day(game)) {
      st(game).windDay = day(game); nh = 0.5;
      tell(game, c, "🪽 second wind! the Lantern catches you: back to half (once a day)");
      emit("secondWind", { c: c });
    }
    return nh;
  }
  function bodyFrame(game, c, S, dt) {
    var p = me(c), f = fxOf(game, c), ch = c.chem, B = SB.Body, b = B ? B.of(c) : null, s = set(game), T = tracker(c), ill = p.ill;
    var lesson = !!(S.firstNight || S.nightChase || S.hungerClock);
    if (lastId === c.id && ch.health > 0 && lastH - ch.health >= 0.02) ch.health = blow(game, c, S, p, f, lastH, ch.health, lesson);
    if (!lesson) {
      var hm = PW.diff(game).hunger * (s.survival ? 1.3 : 1) * (ill && ill.id === "tummy" ? 1 + 0.25 * ill.stage : 1);
      if (hm !== 1 && P().hungerRate) { var ex = dt * P().hungerRate() * (hm - 1); ch.hunger = clamp(ch.hunger + ex, 0, 1); if (S.lastHun != null) S.lastHun = clamp(S.lastHun + ex, 0, 1); }
    }
    // pep
    if (S.running) { var back = (f.runPep || 0) - (PW.sprained(c, game) ? 0.6 : 0); if (back) S.stam = clamp(S.stam + dt * 0.11 * back, 0, 1); }
    else {
      var regen = (f.pepRegen || 0) + (PW.has(c, "cheered", game) ? 0.5 : 0) + (PW.has(c, "calm", game) ? 0.3 : 0) + (PW.has(c, "boon", game) ? 0.3 : 0);
      if (regen) S.stam = Math.min(1, S.stam + dt * 0.1 * regen);
    }
    var cap = illCap(p) - (ill && ill.id === "dims" && !game.world.night ? 0.15 * ill.stage : 0);
    if (S.stam > cap) S.stam = Math.max(0.15, cap);
    if (godOn(game)) S.stam = 1;
    // water and warmth
    if (b && !lesson) {
      if (f.thirst) b.thirst = Math.max(0, b.thirst - dt * B.THIRST * Math.min(0.8, f.thirst));
      if (ill && ill.id === "daze") b.thirst = Math.min(1, b.thirst + dt * B.THIRST * 0.5 * ill.stage);
    }
    var warm = PW.has(c, "warm", game);
    if (f.warmth || warm) ch.cold = Math.max(0, (ch.cold || 0) - dt * (0.006 * (f.warmth || 0) + (warm ? 0.03 : 0)));
    if (ill && ill.id === "shivers") ch.cold = Math.min(1, (ch.cold || 0) + dt * 0.004 * ill.stage);
    if (s.survival && game.world.night && !T.fire && !lesson) ch.cold = Math.min(1, (ch.cold || 0) + dt * 0.004);
    if (ill && ill.id === "rot" && ch.health > 0.2) ch.health = Math.max(0.2, ch.health - dt * 0.0015 * ill.stage);
    // rest heals (not in survival, not while hunted, not on an empty tummy)
    T.rest = !c._povMove && !S.running ? T.rest + dt : 0;
    if (T.rest > 5 && !s.survival && ch.hunger < 0.75 && S.scout == null && ch.health < 1 && !(ill && ill.id === "rot"))
      ch.health = Math.min(1, ch.health + dt * 0.003 * (1 + (f.regen || 0) + (PW.has(c, "wellfed", game) ? 1 : 0)) * (c.asleep ? 2 : 1));
    lastH = ch.health; lastId = c.id;
  }
  PW.resting = function (c) { return !!c && tr.id === c.id && (tr.rest > 5 || !!c.asleep); };
  // twice a second: what you catch, what closes, what passes
  function bodySlow(game, c, S, step) {
    var p = me(c), ch = c.chem, B = SB.Body, b = B ? B.of(c) : null, f = fxOf(game, c), t = game.time, T = tracker(c), k;
    var lesson = !!(S.firstNight || S.nightChase || S.hungerClock);
    for (k in p.buffs) if (p.buffs[k] <= t) delete p.buffs[k];
    if (p.sprain && p.sprain <= t) { p.sprain = 0; tell(game, c, "your sprain has eased"); }
    T.fire = !!(B && B.litFireNear && B.litFireNear(game.world, c, 4));
    if (PW.has(c, "hushed", game) || PW.has(c, "critter", game)) hushScout(game, c, S);
    if (lesson) { T.ag = ch.antigen || 0; T.tox = ch.toxin || 0; T.cut = hasCut(c); return; }
    // causes
    if ((ch.antigen || 0) - T.ag > 0.1) PW.catchIll(game, c, "tummy");
    else if ((ch.toxin || 0) - T.tox > 0.1) PW.catchIll(game, c, "daze");
    T.ag = ch.antigen || 0; T.tox = ch.toxin || 0;
    if (b && b.wet > 0.6 && (ch.cold || 0) > 0.45) { if ((T.chill += step) >= 20) { T.chill = 0; PW.catchIll(game, c, "shivers"); } } else T.chill = Math.max(0, T.chill - step);
    var cut = hasCut(c), boundN = b && b.n ? b.n.bound || 0 : 0;
    if (cut && !T.cut) {
      p.bound = 0; T.cutT = 0; T.bound = boundN;
      if (game.world.night && !(SB.Wilds && SB.Wilds.lit && SB.Wilds.lit(game, c))) { p.nightBites = (p.nightBites || 0) + 1; if (p.nightBites % 2 === 0) PW.catchIll(game, c, "dims"); }
    }
    if (cut && (T.cutT += step) >= 80) { T.cutT = 0; PW.catchIll(game, c, "rot"); }
    if (!cut && T.cut && !p.bound && boundN === T.bound && (p.scars || 0) < PW.MAX_SCARS) {
      p.scars = (p.scars || 0) + 1; stamp++;
      tell(game, c, "the cut closed on its own and left a scar. a bandage keeps it clean");
      emit("scar", { c: c, n: p.scars });
    }
    T.cut = cut;
    // a sick smol close by
    var sick = false, mine = p.ill && p.ill.id === "sniffles";
    near(game, c.x, c.z, 2.5, function (o) {
      if (o === c || o.species !== "smol" || !o.alive) return;
      if ((o.chem.sick || 0) > 0.3 || (o.pw && o.pw.ill && o.pw.ill.id === "sniffles")) sick = true;
      if (mine) o.chem.antigen = Math.min(1, (o.chem.antigen || 0) + 0.01 * step); // and you can pass yours on
    });
    if (sick) { if ((T.expo += step) >= (st(game).plague > t ? 4 : 10)) { T.expo = 0; PW.catchIll(game, c, "sniffles"); } } else T.expo = Math.max(0, T.expo - step * 0.5);
    // getting over it, or getting worse
    var ill = p.ill;
    if (ill) {
      var resting = PW.resting(c);
      ill.heal += step * (resting ? 3 : 1) * (1 + (f.regen || 0));
      if (ill.heal >= PW.ILL_REST) PW.recover(game, c, "rest");
      else if (!resting && (ill.w += step) >= PW.ILL_WORSE && ill.stage < 3) {
        ill.stage++; ill.w = 0;
        tell(game, c, PW.ILL[ill.id].icon + " " + PW.ILL[ill.id].name + " is getting worse. rest, or take " + label(PW.ILL[ill.id].cure));
        emit("illnessWorse", { c: c, id: ill.id, stage: ill.stage });
      }
    }
  }

  /* ---------------- the island, on a timer ---------------- */
  function story(game) { var S = PS(); return !!(S && (S.firstNight || S.nightChase)) || !!(game.tutorial && !game.tutorial.done) || !!(SB.FirstNight && SB.FirstNight.active && SB.FirstNight.active(game)); }
  function sendHome(g) { if (g.goingHome) return; g.goingHome = true; if (g.chem) g.chem.fear = 1; }
  function wardTick(game) {
    var s = st(game), t = game.time;
    if (!s.wards.length) return;
    s.wards = s.wards.filter(function (wd) { return wd.until > t; });
    s.wards.forEach(function (wd) { near(game, wd.x, wd.z, wd.r || PW.WARD_R, function (g) { if (g.species === "grump" && g.alive && !g.boss) sendHome(g); }); });
  }
  PW.warded = function (game, x, z) { var s = st(game), t = game.time; return s.wards.some(function (wd) { return wd.until > t && SB.dist(wd.x, wd.z, x, z) <= (wd.r || PW.WARD_R); }); };
  function peaceTick(game) {
    if (story(game)) return;
    var cs = game.creatures;
    for (var i = 0; i < cs.length; i++) if (cs[i].species === "grump" && cs[i].alive && !cs[i].boss) sendHome(cs[i]);
  }
  // one life: a faint is the end (asked for in the modes page). otherwise friends carry a fainted smol home
  var goneQ = [];
  function flushGone(game) {
    while (goneQ.length) {
      var c = goneQ.shift();
      if (!c || !c.alive) continue;
      if (P() && P().active && P().c === c) P().leave("ko");
      if (SB.Game.note) SB.Game.note(game, "🕯 one life: " + c.name + "'s light went out.");
      if (SB.Creature && SB.Creature.die) SB.Creature.die(c, game, "hurt");
      emit("oneLifeLost", { c: c });
    }
  }
  function carryHome(game, c) {
    var pals = 0, h = PW.homeSpot(game, c);
    near(game, c.x, c.z, 14, function (o) { if (o !== c && o.species === "smol" && o.alive) pals++; });
    if (!pals || !h || SB.dist(c.x, c.z, h.x, h.z) < 8) return false;
    c.x = h.x; c.z = h.z; if (c.px != null) { c.px = c.x; c.pz = c.z; }
    me(c).carried = (c.pw.carried || 0) + 1;
    if (SB.Game.note) SB.Game.note(game, "💤 " + c.name + " fainted. friends carried it " + h.name + ".");
    emit("carriedHome", { c: c, to: h });
    return true;
  }
  var tT = 0;
  PW.tick = function (game, dt) {
    if (!game || game.offline || !game.world) return;
    hookAll();
    if (stunned.length) stunFrame(game);
    var S = PS(), on = !!(S && S.game === game && !S.dead && S.c && S.c.alive);
    if (slowUntil && (!on || game.time >= slowUntil)) { if (game.speed === PW.SLOW) game.speed = 1; slowUntil = 0; }
    if (on) bodyFrame(game, S.c, S, dt); else lastId = null;
    if ((tT -= dt) > 0) return;
    tT = 0.5;
    PW.placeStones(game);
    wardTick(game);
    if (set(game).peaceful) peaceTick(game);
    if (goneQ.length) flushGone(game);
    if (on) bodySlow(game, S.c, S, 0.5);
    skyHook(game);
  };

  /* ---------------- hooks: wraps of public functions, the bus, ext.js ---------------- */
  function hookAll() {
    var Po = P(), B = SB.Body, Wi = SB.Wilds, R = SB.Render;
    if (Po && Po.drive && !Po.drive._pw) {
      var d0 = Po.drive;
      Po.drive = function (c, dt, game) {
        var s = Po.state ? Po.state() : null, mine = !!(s && s.c === c && !s.dead);
        if (mine) {
          if (runLock && game.settings && game.settings.holdToggle) Po.input.run = true;
          if (PW.slowed(game) && game.speed === PW.SLOW) dt = dt / PW.SLOW; // the island crawls: you keep your own pace
        }
        var r = d0.call(Po, c, dt, game);
        if (mine && c._povMove) {
          var k = (PW.has(c, "swift", game) ? 0.3 : 0) + (PW.has(c, "critter", game) ? 0.3 : 0) + (s.running ? fxOf(game, c).speed || 0 : 0);
          if (k > 0 && SB.Creature && SB.Creature.speedOf) {
            var step = SB.Creature.speedOf(c, null) * k * dt, nx = c.x + Math.sin(c.facing) * step, nz = c.z + Math.cos(c.facing) * step;
            if (SB.World.walkable(game.world, nx, nz, SB.Creature.canSwim ? SB.Creature.canSwim(c) : false)) { c.x = nx; c.z = nz; }
          }
        }
        return r;
      };
      Po.drive._pw = 1;
    }
    if (B && B.xp && !B.xp._pw) {
      var xp0 = B.xp;
      B.xp = function (c, id, n) {
        var g = cur();
        if (g && c && c._pov) { var f = fxOf(g, c), m = 1 + (f.xpAll || 0) + (f["xp_" + id] || 0); if (m !== 1) n = (n == null ? 1 : n) * m; }
        return xp0.call(B, c, id, n);
      };
      B.xp._pw = 1;
    }
    if (Wi && Wi.lit && !Wi.lit._pw) {
      var lit0 = Wi.lit;
      Wi.lit = function (game, c) { return lit0.call(Wi, game, c) || (PW.has(c, "glowing", game) ? "torch" : ""); };
      Wi.lit._pw = 1;
    }
    if (Wi && Wi.darkness && !Wi.darkness._pw) {
      var dk0 = Wi.darkness;
      Wi.darkness = function (game, s, night) { var d = dk0.call(Wi, game, s, night); return s && s.c && d > 0 ? d * (PW.has(s.c, "nightsight", game) ? 0.3 : PW.has(s.c, "glowing", game) ? 0.6 : 1) : d; };
      Wi.darkness._pw = 1;
    }
    if (R && R.flash && !R.flash._pw) {
      var fl0 = R.flash;
      R.flash = function () { var g = cur(); if (g && g.settings && g.settings.noFlash) { if (R.camera) R.camera.shake = 0; return; } return fl0.apply(R, arguments); };
      R.flash._pw = 1;
    }
  }
  PW.hookAll = hookAll;
  var hooked = false;
  PW.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    var on = SB.bus.on.bind(SB.bus);
    function pov(d) { var g = cur(); return g && d && d.c && d.c._pov ? g : null; }
    function bonus(g, c, key, kind, n) { if (roll(c, key, fxOf(g, c)[key])) { give(g, c, kind, n || 1); emit("perkBonus", { c: c, key: key, kind: kind }); return true; } return false; }
    function pep(c, v) { var S = inBody(c); if (S && v) S.stam = Math.min(1, S.stam + v); }
    on("chop", function (d) { var g = pov(d); if (!g || !d.pov) return; var c = d.c; bonus(g, c, "chopStick", "stick"); bonus(g, c, "chopLog", "log"); bonus(g, c, "chopLeaves", "leaves", 2); bonus(g, c, "chopSapling", "sapling"); pep(c, fxOf(g, c).chopPep); });
    on("rockGone", function (d) { var g = pov(d); if (!g) return; var c = d.c, ore = d.node && (d.node.kind === "orevein" || d.node.kind === "vent"); bonus(g, c, "mineStone", "stone"); bonus(g, c, "mineFlint", "flint"); if (ore) bonus(g, c, "mineOre", "ore"); bonus(g, c, "mineCrystal", "crystal"); pep(c, fxOf(g, c).minePep); });
    on("povGain", function (d) {
      var g = pov(d), kd = d && K()[d.kind]; if (!g || !kd || !(kd.food || d.kind === "herb")) return;
      var c = d.c;
      if (d.kind === "herb") bonus(g, c, "forHerb", "herb");
      bonus(g, c, "forMore", d.kind); bonus(g, c, "forSeed", "seed");
    });
    on("craft", function (d) {
      var g = pov(d); if (!g || !d.pov || d.remedy) return;
      var c = d.c, f = fxOf(g, c), kind = d.item && d.item.kind;
      bonus(g, c, "craftStick", "stick");
      if (kind && K()[kind] && !K()[kind].tool) bonus(g, c, "craftDouble", kind);
      if (kind && K()[kind] && K()[kind].tool && f.toolW && Sv().uses) { var v = Sv().inv(c), full = Sv().uses(kind); for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k === kind && v.s[i].w === full) { v.s[i].w = Math.round(full * (1 + f.toolW)); break; } }
    });
    on("fish", function (d) { var g = pov(d); if (!g) return; bonus(g, d.c, "fishMore", "fish"); bonus(g, d.c, "fishClam", "clam"); pep(d.c, fxOf(g, d.c).fishPep); });
    on("hunt", function (d) { var g = pov(d); if (!g) return; bonus(g, d.c, "huntMeat", "meat"); bonus(g, d.c, "huntFur", "fur"); pep(d.c, fxOf(g, d.c).huntPep); });
    on("grumpChased", function (d) { var g = pov(d); if (!g) return; var h = fxOf(g, d.c).chaseHeal; if (h) d.c.chem.health = Math.min(1, d.c.chem.health + h); });
    on("povEat", function (d) {
      var g = pov(d); if (!g) return;
      var c = d.c, f = fxOf(g, c), k = d.kind, p = me(c), ch = c.chem, S = inBody(c);
      if (k === "herb" || k === "potion") { p.bound = 1; if (p.ill) { if (k === "potion") PW.recover(g, c, "cured"); else easeIll(g, c, 1); } }
      if (k === "cooked" || k === "bread") {
        if (f.cookFill) { ch.hunger = Math.max(0, ch.hunger - f.cookFill); if (S && S.lastHun != null) S.lastHun = ch.hunger; }
        if (f.cookWarm) ch.cold = Math.max(0, (ch.cold || 0) - f.cookWarm);
        if (f.cookHeal) ch.health = Math.min(1, ch.health + f.cookHeal);
        pep(c, f.cookPep);
        if (f.cookBuff) PW.buff(c, "wellfed", f.cookBuff, g);
      }
      if (k === "berry" || k === "apple" || k === "banana") pep(c, f.eatPep);
      if ((k === "fish" || k === "cooked") && f.fishWarm) { if (c.body) c.body.wet = 0; ch.cold = Math.max(0, (ch.cold || 0) - 0.3); }
      if (k === "glowcap" && g.world.night && !PW.has(c, "glowing", g)) { PW.buff(c, "glowing", 300, g); tell(g, c, "✨ a glowcap after dark: you are glowing! nothing prowls up on a light"); emit("glowing", { c: c }); }
    });
    on("skillUp", function (d) { var g = pov(d); if (g && !d.shared && PW.PERK_LEVELS.indexOf(d.level) >= 0 && PW.PERKS[d.id]) tell(g, d.c, "⭐ " + SB.Body.BY_ID[d.id].label + " level " + d.level + ": a perk to pick, in your bag's lantern tab"); });
    on("sale", function (d) { // the island's prices (stalls and pedlars alike)
      var g = cur(), m = g ? PW.diff(g).price : 1;
      if (!g || !d || !d.byHand || !d.buyer || m === 1 || !(d.price > 0)) return;
      var extra = Math.round(d.price * (m - 1) * 100) / 100;
      d.buyer.purse = Math.max(0, Math.round(((d.buyer.purse || 0) - extra) * 100) / 100);
      if (d.seller && d.seller.purse != null && extra > 0) d.seller.purse = Math.round((d.seller.purse + extra) * 100) / 100;
    });
    on("soldByHand", function (d) { var g = cur(), k = g && d && d.c ? fxOf(g, d.c).sell : 0; if (k && d.pay > 0) d.c.purse = Math.round(((d.c.purse || 0) + d.pay * k) * 100) / 100; });
    on("incident", function (d) { var g = cur(); if (g && d && d.inc && d.inc.id === "sick") { st(g).plague = Math.round(g.time + 600); emit("plague", { until: st(g).plague }); } });
    on("dawn", function () { var S = PS(); if (S && S.c && S.c.pw && S.c.pw.buffs) delete S.c.pw.buffs.glowing; });
    on("knockout", function (d) { var g = cur(); if (!g || !d || !d.c) return; if (set(g).oneLife) goneQ.push(d.c); else carryHome(g, d.c); });
    on("respawn", function (d) { var g = cur(); if (g && d && d.c && set(g).oneLife) goneQ.push(d.c); });
    on("possess", function () { var g = cur(); tr = { id: null }; lastId = null; runLock = false; if (g) applyAccess(g); });
    on("unpossess", function () { runLock = false; });
  };
  PW.hook();
  hookAll();

  // the fastest thing to shout or cast at a grump in front of you (the third button on a phone)
  PW.quick = function (game, c) {
    var S = inBody(c); if (!S) return null;
    if (PW.wordLevel(game, "roar") && !PW.cdLeft(game, "w:roar")) return { label: "roar! 🦁", go: function () { var r = PW.shout(game, c, "roar"); if (P().say) P().say(r.msg); return r.ok; } };
    if (PW.owns(game, "burst") && !PW.cdLeft(game, "burst") && S.stam >= PW.BY.burst.pep) return { label: "burst of light 💥", go: function () { var r = PW.cast(game, "burst", c); if (P().say) P().say(r.msg); return r.ok; } };
    return null;
  };
  var X = SB.Ext;
  if (X) {
    X.on("tick", PW.tick);
    X.on("options", function (game, c, r, o, x) {
      var hk = x.hk;
      if (hk && PW.usable(hk) && !(r && r.type === "creature")) o.place = x.op(PW.useLabel(hk), function () { var res = PW.use(game, c, hk); x.say(res.msg); if (res.ok) x.audio(PW.RECIPE[hk].group === "care" ? "craft" : "eat", 0.6); return res.ok; }, null);
      if (r && r.type === "struct" && r.kind === "blessstone") o.use = x.op("touch the blessing stone", function () { var res = PW.touch(game, c, r.ref); x.say(res.msg); if (res.ok) { page = "you"; x.audio("chime", 0.7); x.openBag("lantern"); } return res.ok; }, null);
      else if (r && r.type === "struct" && r.kind === "wordstone") o.use = x.op(st(game).heard[r.ref.data && r.ref.data.pw] ? "the whisper stone (heard)" : "listen to the whisper stone", function () { var res = PW.hear(game, c, r.ref); x.say(res.msg); if (res.ok) x.audio("eureka", 0.7); return res.ok; }, null);
      else if (r && r.type === "creature" && !o.pick) {
        var cr = r.ref;
        if (cr.species === "grump" && cr.alive) { var q = PW.quick(game, c); if (q) o.pick = x.op(q.label, q.go, null); }
        else if (cr.species === "smol" && SB.Ideas && SB.Ideas.known(cr, "herbal") && (PW.illOf(c) || wounded(c, game))) o.pick = x.op("ask " + cr.name + " to tend you", function () { var res = PW.tend(game, c, cr); x.say(res.msg); if (res.ok) x.audio("chime", 0.6); return res.ok; }, null);
      }
    });
    X.on("damage", function (game, c, target) {
      var f = fxOf(game, c), p = me(c), m = 1 + (f.dmg || 0) + (target && target.boss ? f.bossDmg || 0 : 0);
      if (PW.has(c, "strong", game)) m += 0.5;
      if (PW.has(c, "critter", game)) m *= 0.5;
      if (p.ill && p.ill.id === "dims" && game.world.night) m *= 1 - 0.1 * p.ill.stage;
      if (f.stagger) { p.swings = (p.swings || 0) + 1; if (p.swings % f.stagger === 0 && target && target.alive) PW.stun(game, target, target.boss ? 0.6 : 1.5); }
      return m;
    });
    X.on("key", function (game, c, key, down) {
      if (key !== "shift" || !game.settings || !game.settings.holdToggle) return false;
      if (down) runLock = !runLock;
      return true;
    });
    X.on("goals", function (game, add) {
      if (SB.Game.sandbox && SB.Game.sandbox(game)) return;
      var can = PW.TREE.filter(function (n) { return !PW.whyNotLearn(game, n.id); });
      if (can.length) add("🕯 " + PW.points(game) + " ember" + (PW.points(game) > 1 ? "s" : "") + " to spend: ✨ magic → the Lantern's powers", PW.owned(game) + "/" + PW.TREE.length, false);
    });
    X.on("vitals", function (game, c) {
      var out = [], p = c.pw; if (!p) return out;
      var ill = PW.illOf(c);
      if (ill) out.push({ icon: PW.ILL[ill.id].icon, text: PW.ILL[ill.id].name + (ill.stage > 1 ? " " + (ill.stage === 2 ? "II" : "III") : ""), bad: true, tip: PW.ILL[ill.id].sym.join(", ") + ". " + label(PW.ILL[ill.id].cure) + " cures it, and so does rest" });
      if (PW.sprained(c, game)) out.push({ icon: "🦶", text: "sprained", bad: true, tip: "running costs more pep. a splint sets it" });
      PW.buffsOf(c, game).forEach(function (id) { var d = PW.BUFFS[id] || { icon: "", text: id }; out.push({ icon: d.icon || "", text: d.text + (id === "shield" && p.shield ? " ×" + p.shield : ""), bad: !!d.bad, tip: d.tip || "" }); });
      if (PW.slowed(game)) out.push({ icon: "⏳", text: "slow time", tip: "the island crawls" });
      if (runLock) out.push({ icon: "🏃", text: "running", tip: "tap shift to stop" });
      return out;
    });
    X.tab({ id: "lantern", label: function (game, c) { return "🕯 lantern" + (PW.perkOpen(c).length ? " ⭐" : ""); }, show: function () { return true; },
      html: function (game, c, icon) { return PW.html(game, c, icon, false); }, wire: function (root, game, c, redraw, say) { PW.wire(root, game, c, redraw, say, false); } });
  }

  /* ---------------- the lantern tab (in a body) and the sky's window: light · body · modes ---------------- */
  var page = "light";
  PW.page = function (p) { if (p) page = p; return page; };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function rc(big, t, small, right) { return "<div class='rc' style='display:flex;align-items:center;gap:8px;margin:3px 0'><span class='big' style='font-size:20px'>" + big + "</span><div class='t' style='flex:1;min-width:0'>" + t + (small ? "<small style='display:block;opacity:.8'>" + small + "</small>" : "") + "</div>" + (right || "") + "</div>"; }
  function btn(attr, val, text, off, go) { return "<button class='btn" + (go ? " go" : "") + "' data-" + attr + "='" + val + "'" + (off ? " disabled" : "") + ">" + text + "</button>"; }
  function lbl(t) { return "<div class='lbl' style='margin-top:8px'>" + t + "</div>"; }
  function dots(n, of) { var s = ""; for (var i = 0; i < of; i++) s += i < n ? "●" : "○"; return s; }
  var NEEDS_SMOL = { skin: 1, recall: 1, mend: 1, share: 1 };
  function lightHtml(game, c, sky) {
    var s = st(game), S = inBody(c), out = "", any = false;
    out += lbl("embers to spend: <b>" + (PW.points(game) >= 99 ? "∞" : PW.points(game)) + "</b> · the Lantern remembers " + PW.owned(game) + " of " + PW.TREE.length);
    out += lbl(S ? "your inner light · costs pep" : "from the sky · costs sparks" + (c ? " · around " + esc(c.name) : " · where you are looking")) + "<div class='rlist'>";
    PW.TREE.forEach(function (n) {
      if (n.kind !== "cast" || !s.tree[n.id]) return;
      any = true;
      var left = PW.cdLeft(game, n.id), rk = PW.rank(game, n.id), cost = S ? Math.round(n.pep * (1 - Math.min(0.5, fxOf(game, c).cost || 0)) * 100) + "% pep" : n.id === "slow" ? "in a body only" : (SB.Game.miracleCost ? SB.Game.miracleCost(game, n.sparks) : n.sparks) + " ✨";
      var off = left > 0 || (!S && (n.id === "slow" || (NEEDS_SMOL[n.id] && !c)));
      out += rc(n.icon, esc(n.name) + (rk > 1 ? " " + dots(rk, 3) : ""), esc(n.desc) + " · " + cost + (!S && NEEDS_SMOL[n.id] && !c ? " · tap a smol first" : ""), btn("pwcast", n.id, left > 0 ? Math.ceil(left) + "s" : "cast", off, !off));
    });
    out += (any ? "" : "<p class='help'>nothing yet. spend an ember below and the Lantern remembers a power.</p>") + "</div>";
    out += lbl("words of power · found at whisper stones") + "<div class='rlist'>";
    PW.WORDS.forEach(function (w) {
      var L = PW.wordLevel(game, w.id), left = PW.cdLeft(game, "w:" + w.id);
      out += rc(w.icon, esc(w.name) + " " + dots(L, 3), L ? esc(w.desc) : "not found yet", L && S ? btn("pwsay", w.id, left > 0 ? Math.ceil(left) + "s" : "say", left > 0, left <= 0) : "");
    });
    out += "</div>";
    ["light", "life", "mind"].forEach(function (br) {
      out += lbl(PW.BRANCH[br][0] + " " + PW.BRANCH[br][1]) + "<div class='rlist'>";
      PW.TREE.forEach(function (n) {
        if (n.branch !== br) return;
        var why = PW.whyNotLearn(game, n.id);
        out += rc(n.icon, esc(n.name) + (n.kind === "gift" ? " <small style='display:inline;opacity:.7'>always on</small>" : ""), esc(n.desc), s.tree[n.id] ? "<span class='ok'>✓</span>" : "<button class='btn" + (why ? "" : " go") + "' data-pwlearn='" + n.id + "' title='" + esc(why) + "'" + (why ? " disabled" : "") + ">" + n.cost + " 🔥</button>");
      });
      out += "</div>";
    });
    return out;
  }
  function youHtml(game, c, icon) {
    var p = me(c), B = SB.Body, out = "", bl = PW.blessingOf(c), offer = PW.offered(game, c), ill = PW.illOf(c);
    out += lbl("body level <b>" + PW.bodyLevel(c) + "</b> · every skill level counts") + "<div class='rlist'>";
    out += rc(bl ? bl.icon : "🗿", bl ? "blessed by " + esc(bl.name) : "no blessing yet", bl ? esc(bl.desc) : "three blessing stones stand on the island. touch one to pick a blessing");
    offer.forEach(function (b) { out += rc(b.icon, esc(b.name), esc(b.desc), p.bless === b.id ? "<span class='ok'>✓</span>" : btn("pwbless", b.id, p.bless ? "swap" : "take", false, true)); });
    out += "</div>" + lbl("health") + "<div class='rlist'>";
    var lines = 0;
    if (ill) { var d = PW.ILL[ill.id]; lines++; out += rc(d.icon, esc(d.name) + " · stage " + ill.stage + " of 3", "from " + esc(d.cause) + " · " + esc(d.sym.join(", ")) + " · cure: " + esc(label(d.cure)) + ", a healer, or rest"); }
    if (B && B.has(c, "cut")) { lines++; out += rc("🩸", "a cut", "a bandage binds it clean. left alone it scars, and can go bad"); }
    if (B && B.has(c, "bruise")) { lines++; out += rc("🤕", "a bruise", "bark chew takes the ache out"); }
    if (PW.sprained(c, game)) { lines++; out += rc("🦶", "a sprain", "running costs more pep. a splint sets it"); }
    if (p.scars) { lines++; out += rc("⚔", p.scars + " scar" + (p.scars > 1 ? "s" : ""), "each one took " + 2 + "% off every hurt since"); }
    var imm = Object.keys(p.immune).filter(function (k) { return PW.immune(game, c, k) && PW.ILL[k]; });
    if (imm.length) { lines++; out += rc("🛡", "had it, won't catch it again soon", esc(imm.map(function (k) { return PW.ILL[k].name; }).join(", "))); }
    var bf = PW.buffsOf(c, game);
    if (bf.length) { lines++; out += rc("✨", "on you now", esc(bf.map(function (id) { return (PW.BUFFS[id] ? PW.BUFFS[id].text : id) + " " + Math.ceil(PW.left(c, id, game)) + "s"; }).join(" · "))); }
    if (!lines) out += "<p class='help'>fit and well. standing still heals, and a smol who knows herb lore will tend you.</p>";
    out += "</div>";
    if (B) {
      var open = PW.perkOpen(c), had = false;
      if (open.length) {
        out += lbl("⭐ perks to pick") + "<div class='rlist'>";
        open.forEach(function (o) {
          var L = PW.PERKS[o.skill][PW.PERK_LEVELS.indexOf(o.lvl)], sk = B.BY_ID[o.skill];
          out += rc(sk.emoji, esc(sk.label) + " " + o.lvl, "pick one", "");
          L.forEach(function (pk, i) { out += rc("", esc(pk[0]), esc(pk[1]), btn("pwperk", o.skill + ":" + o.lvl + ":" + i, "pick", false, true)); });
        });
        out += "</div>";
      }
      var mine = "";
      B.SKILLS.forEach(function (sk) {
        var got = [];
        PW.PERK_LEVELS.forEach(function (lv) { var pk = PW.perkOf(c, sk.id, lv); if (pk) got.push(pk[0]); });
        if (got.length) { had = true; mine += rc(sk.emoji, esc(sk.label), esc(got.join(" · ")), btn("pwreset", sk.id, "clear · 1 🔥", PW.points(game) < 1)); }
      });
      out += lbl("your perks") + "<div class='rlist'>" + (had ? mine : "<p class='help'>every skill gives a pick of two perks at levels 3, 6 and 9.</p>") + "</div>";
    }
    [["care", "wounds and care"], ["cure", "cures"], ["brew", "brews · one at a time"]].forEach(function (g) {
      out += lbl(g[1]) + "<div class='rlist'>";
      PW.RECIPES.forEach(function (rcp) {
        if (rcp.group !== g[0]) return;
        var need = [];
        for (var k in rcp.in) { var n = Sv().count(c, k, true); need.push("<span class='" + (n >= rcp.in[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + Math.min(n, rcp.in[k]) + "/" + rcp.in[k] + "</span>"); }
        var have = Sv().count(c, rcp.id, true);
        out += rc(icon(rcp.id, 24), esc(label(rcp.id)) + (have ? " ×" + have : ""), esc(K()[rcp.id].desc) + (rcp.at ? " · by a fire" : "") + "<div class='need'>" + need.join(" ") + "</div>",
          (have ? btn("pwuse", rcp.id, "use", false, true) : "") + btn("pwmake", rcp.id, "make", !!PW.whyNotMake(game, c, rcp.id)));
      });
      out += "</div>";
    });
    return out;
  }
  function modesHtml(game) {
    var d = PW.diff(game), s = set(game), out = lbl("how hard the island bites") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    PW.PRESETS.forEach(function (p) { out += "<button class='btn" + (d.id === p.id ? " go" : "") + "' data-pwdiff='" + p.id + "' title='" + esc(p.tip) + "'>" + p.icon + " " + p.name + "</button>"; });
    out += "</div><p class='help'>" + esc(PW.PRESET[d.id] ? PW.PRESET[d.id].tip : "your own mix.") + " tap a number to change just that.</p><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    [["dmg", "grump bites"], ["hunger", "hunger"], ["price", "prices"]].forEach(function (k) { out += btn("pwknob", k[0], k[1] + " ×" + d[k[0]], false, false); });
    out += "</div>" + lbl("ways to play") + "<div class='rlist'>";
    ["peaceful", "oneLife", "survival", "god"].forEach(function (k) {
      var t = PW.TOGGLES[k], sand = SB.Game.sandbox && SB.Game.sandbox(game);
      if (k === "god" && !sand) return;
      out += rc(t[0], t[1], esc(t[2]), btn("pwtog", k, s[k] ? "on" : "off", false, !!s[k]));
    });
    out += "</div>" + lbl("easier to see and hold") + "<div class='rlist'>";
    ["noFlash", "bigMarks", "holdToggle"].forEach(function (k) { var t = PW.TOGGLES[k]; out += rc(t[0], t[1], esc(t[2]), btn("pwtog", k, s[k] ? "on" : "off", false, !!s[k])); });
    if (s.holdToggle && PS()) out += rc("🏃", "run", "for a phone or a tired finger", btn("pwrun", "1", runLock ? "running" : "walking", false, runLock));
    out += "</div>";
    return out;
  }
  PW.html = function (game, c, icon, sky) {
    icon = icon || function (k) { return K()[k] ? K()[k].emoji : ""; };
    var pages = c ? [["light", "🕯 light"], ["you", "🐾 body"], ["modes", "⚙ modes"]] : [["light", "🕯 light"], ["modes", "⚙ modes"]];
    if (!c && page === "you") page = "light";
    var out = "<div class='row' style='display:flex;gap:4px;margin:0 0 4px'>" + pages.map(function (p) { return btn("pwpage", p[0], p[1], false, page === p[0]); }).join("") + "</div>";
    return out + (page === "you" ? youHtml(game, c, icon) : page === "modes" ? modesHtml(game) : lightHtml(game, c, !!sky));
  };
  PW.wire = function (root, game, c, redraw, say, sky) {
    function done(r, sound) { if (r && r.msg && say) say(r.msg); if (r && r.ok) snd(sound || "craft", 0.5); redraw(); }
    function each(sel, fn) { var L = root.querySelectorAll("[data-" + sel + "]"); for (var i = 0; i < L.length; i++) (function (b) { b.addEventListener("click", function () { fn(b.getAttribute("data-" + sel), b); }); })(L[i]); }
    each("pwpage", function (v) { page = v; redraw(); });
    each("pwcast", function (v) { done(PW.cast(game, v, c, c ? null : skyAt(game)), "chime"); });
    each("pwsay", function (v) { done(c ? PW.shout(game, c, v) : null, "chime"); });
    each("pwlearn", function (v) { done(PW.learn(game, v), "eureka"); });
    each("pwbless", function (v) { done(PW.bless(game, c, v), "achievement"); });
    each("pwperk", function (v) { var a = v.split(":"); done(PW.pickPerk(game, c, a[0], +a[1], +a[2]), "achievement"); });
    each("pwreset", function (v) { done(PW.resetPerks(game, c, v)); });
    each("pwmake", function (v) { done(PW.make(game, c, v)); });
    each("pwuse", function (v) { done(PW.use(game, c, v), "eat"); });
    each("pwdiff", function (v) { PW.setDiff(game, v); done({ ok: true, msg: PW.PRESET[v].icon + " " + PW.PRESET[v].name + ": " + PW.PRESET[v].tip }); });
    each("pwknob", function (v) { PW.knob(game, v); redraw(); });
    each("pwtog", function (v) { var okd = PW.toggle(game, v); done(okd ? { ok: true, msg: PW.TOGGLES[v][0] + " " + PW.TOGGLES[v][1] + (PW.on(game, v) ? " on: " + PW.TOGGLES[v][2] : " off") } : null); });
    each("pwrun", function () { runLock = !runLock; redraw(); });
  };

  /* ---------------- the sky's way in: a button on the ✨ magic sheet, and a window ---------------- */
  function skyTarget(game) { var c = game.selectedId != null && SB.Game.byId ? SB.Game.byId(game, game.selectedId) : null; if (c && c.alive && c.species === "smol") return c; return null; }
  function skyAt(game) { var cm = SB.Render && SB.Render.camera; if (cm && cm.x != null) return { x: cm.x, z: cm.z }; var m = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null; return m ? { x: m.x, z: m.z } : null; }
  PW.skyTarget = skyTarget;
  PW.openSky = function (game) {
    game = game || cur();
    if (!game || typeof document === "undefined" || !document.createElement || !SB.UI || !SB.UI.modal) return false;
    var body = document.createElement("div");
    function draw() {
      var c = skyTarget(game);
      body.innerHTML = PW.html(game, c, null, true);
      PW.wire(body, game, c, draw, function (m) { if (SB.UI.toast) SB.UI.toast(m); }, true);
    }
    draw();
    SB.UI.modal("🕯 the Lantern's powers", body, {});
    return true;
  };
  function skyHook(game) {
    if (typeof document === "undefined" || !document.querySelector || !document.createElement || (P() && P().active)) return;
    var sheet = document.querySelector(".dock .sheet");
    if (!sheet || !sheet.dataset || sheet.dataset.kind !== "magic" || (sheet.classList && sheet.classList.contains("hide")) || sheet.querySelector("[data-pwsky]")) return;
    var b = document.createElement("button");
    b.className = "btn"; b.setAttribute("data-pwsky", "1"); b.style.cssText = "width:100%;margin-top:6px";
    b.textContent = "🕯 the Lantern's powers · " + PW.points(game) + " embers to spend";
    b.onclick = function () { PW.openSky(cur()); };
    sheet.appendChild(b);
  }

  /* ---------------- the new things: items, recipes, models ---------------- */
  (function () {
    var KK = SB.KINDS, S = Sv(), k;
    if (KK) for (k in PW.ITEMS) if (!KK[k]) KK[k] = PW.ITEMS[k];
    // real recipes in the make tab too, for smols who know herb lore (survival.js keeps a recipe pushed on later)
    if (S && S.EXTRA && S.craft && KK) {
      PW.RECIPES.forEach(function (rc0) { if (!S.EXTRA.some(function (r) { return r.id === rc0.id; })) S.EXTRA.push({ id: rc0.id, name: KK[rc0.id].label, icon: KK[rc0.id].emoji, in: rc0.in, at: rc0.at, out: rc0.id, idea: "herbal", hint: PW.costText(rc0) }); });
      // an older survival.js doesn't know a recipe pushed on late: take ours back out so the make tab shows nothing broken
      var probe = null; try { probe = S.craft({ tier: 0, species: "smol" }, null, PW.RECIPES[0].id); } catch (e) { probe = null; }
      if (!probe || /not a recipe/.test(probe.msg || "")) for (var i = S.EXTRA.length - 1; i >= 0; i--) if (PW.RECIPE[S.EXTRA[i].id] && S.EXTRA[i].idea === "herbal" && S.EXTRA[i].out === S.EXTRA[i].id) S.EXTRA.splice(i, 1);
    }
  })();
  var ME = SB.Meshes || SB.ME;
  function standing() {
    var b = ME.builder();
    b.color(0x7d828c).push().translate(0, 0.08, 0).box(0.95, 0.16, 0.75).pop();                       // the foot
    b.color(0x9aa0aa).push().translate(0, 0.95, 0).box(0.5, 1.6, 0.34).pop();                         // the stone
    b.color(0xa8aeb8).push().translate(0, 1.82, 0).box(0.36, 0.16, 0.26).pop();                       // its cap
    b.color(0xffe27a).push().translate(0, 1.2, 0.18).box(0.2, 0.2, 0.02).pop();                       // a lit mark
    b.color(0xffe27a).push().translate(0, 0.78, 0.18).box(0.06, 0.44, 0.02).pop();
    return b.finish();
  }
  function whisper() {
    var b = ME.builder();
    b.color(0x6f7480).push().translate(0, 0.3, 0).rotX(0.12).box(0.44, 0.6, 0.3).pop();               // a small leaning stone
    b.color(0x858b96).push().translate(0, 0.63, 0.03).box(0.3, 0.1, 0.22).pop();
    b.color(0xc9a8ff).push().translate(0, 0.36, 0.16).box(0.16, 0.05, 0.02).pop();                    // three lines: a word
    b.color(0xc9a8ff).push().translate(0, 0.27, 0.16).box(0.22, 0.05, 0.02).pop();
    b.color(0xc9a8ff).push().translate(0, 0.18, 0.16).box(0.12, 0.05, 0.02).pop();
    return b.finish();
  }
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { try { ME.STRUCT_BUILDERS.blessstone = standing; ME.STRUCT_BUILDERS.wordstone = whisper; } catch (e) {} }
})();
