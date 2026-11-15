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
    if (id === "shield" || !id && false) p.shield = 0;
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
