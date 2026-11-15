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
    { id: "dims", icon: "🌑", name: "the dims", cause: "a grump's bite in the dark", sym: ["weak by day", "strong and hard to see at night"], cure: "suntea" }
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
    if (PW.fx2) PW.fx2(game, c, out, p);
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
  PW.cast = function (game, id, c, at, big) {
    var n = PW.BY[id], s = st(game), S = inBody(c), body = !!S;
    if (!n || n.kind !== "cast") return fail("no such power");
    if (PW.locked && PW.locked(game)) return fail(PW.locked(game));
    var bigK = big ? 2 : 1, free = !body && PW.wishFree && PW.wishFree(game);
    if (!s.tree[id]) return fail("the Lantern hasn't remembered " + n.name + " yet");
    var left = PW.cdLeft(game, id);
    if (left > 0) return fail(n.name + " is ready in " + Math.ceil(left) + "s");
    var x = body ? c.x : at ? at.x : c ? c.x : null, z = body ? c.z : at ? at.z : c ? c.z : null;
    if (x == null) return fail("pick a place or a smol first");
    var f = fxOf(game, body ? c : null), pep = Math.min(0.95, n.pep * (1 - Math.min(0.5, f.cost || 0)) * bigK * (PW.pepK ? PW.pepK(game, c) : 1)), sparks = body || free ? 0 : (SB.Game.miracleCost ? SB.Game.miracleCost(game, n.sparks) : n.sparks) * bigK;
    if (body && S.stam < pep && !godOn(game)) return fail("not enough pep: " + n.name + " takes " + Math.round(pep * 100) + "%");
    if (!body && (game.sparks || 0) < sparks) return fail("not enough sparks ✨ (" + sparks + " needed)");
    var rank0 = PW.rank(game, id);
    var res = CAST[id](game, { c: c || null, x: x, z: z, body: body, S: S, k: (1 + 0.25 * (rank0 - 1)) * (big ? 1.6 : 1) * (PW.castK ? PW.castK(game, c, id) : 1) });
    if (!res.ok) return res; // nothing spent on a power that had nothing to do
    if (body) S.stam = Math.max(0, S.stam - (godOn(game) ? 0 : pep)); else if (sparks > 0 && SB.Game.spend) SB.Game.spend(game, sparks);
    s.cd[id] = Math.round(game.time + n.cd * (1 - cdCut(game, body ? c : null)));
    s.casts[id] = (s.casts[id] || 0) + 1;
    if (free && PW.wishUsed) res.msg += PW.wishUsed(game);
    if (PW.rank(game, id) > rank0) res.msg += " · " + n.name + " grew stronger (rank " + PW.rank(game, id) + ")";
    if (id !== "grow" && id !== "recall") burst(game, id === "burst" || id === "ward" ? "gold" : "sparkle", x, ground(game, x, z) + 0.8, z, 16, { r: 2.5 });
    snd(id === "burst" ? "whoosh" : "chime", 0.7);
    emit("power", { id: id, c: c || null, x: x, z: z, sky: !body, res: res, big: !!big });
    return res;
  };

  /* ---------------- words of power ---------------- */
  PW.wordLevel = function (game, id) { return st(game).words[id] || 0; };
  PW.shout = function (game, c, id) {
    var w = PW.WORD[id], L = PW.wordLevel(game, id), S = inBody(c), s = st(game);
    if (!w) return fail("no such word");
    if (!L) return fail(w.buy ? "the Lantern hasn't remembered that word yet. an ember teaches it" : "you haven't found that word yet. whisper stones teach them");
    if (PW.locked && PW.locked(game)) return fail(PW.locked(game));
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
    } else if (w.fn) {
      var r2 = w.fn(game, c, L, S);
      if (!r2 || r2.ok === false) return fail(r2 ? r2.msg : "nothing happens");
      n = r2.n || 0; msg = r2.msg;
    } else {
      S.stam = Math.min(1, S.stam + 0.25 + 0.15 * L);
      near(game, c.x, c.z, 6, function (o) { if (o !== c && o.species === "smol" && o.alive) { SB.Chem.apply(o.chem, { reward: 0.2, fear: -0.2, bored: -0.2 }); if (SB.Creature.emote) SB.Creature.emote(o, "happy", 2); n++; } });
      PW.buff(c, "cheered", 30 * L, game);
      msg = "🎉 a cheer! pep back" + (n ? ", and " + n + " smol" + (n > 1 ? "s" : "") + " cheered up" : "");
    }
    s.cd["w:" + id] = Math.round(game.time + w.cd * (1 - cdCut(game, c)) * (PW.wordK ? PW.wordK(game, id) : 1));
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
    if (e.day !== d && PW.boonPay && !PW.boonPay(game)) msg += " · on a harsh island the stone's warmth costs 2 sparks, and you have none";
    else if (e.day !== d) {
      e.day = d;
      PW.buff(c, "boon", 240, game);
      easeIll(game, c, 1);
      msg += " · the stone is warm today: pep comes back faster for a while";
      if (PW.boon2) msg += PW.boon2(game, c, b);
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
    if (p.ill || PW.immune(game, c, id) || PW.has(c, "braced", game) || godOn(game) || (PW.immune2 && PW.immune2(game, c, id))) return false;
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
  PW.usable = function (kind) { return !!PW.RECIPE[kind] || !!(PW.USE2 && PW.USE2[kind]); };
  PW.useLabel = function (kind) { return PW.USE2 && PW.USE2[kind] ? PW.USE2[kind].label : kind === "bandage" ? "bind your cut with the bandage" : kind === "splint" ? "set your sprain with the splint" : kind === "poultice" ? "put the poultice on" : kind === "kit" ? "use the healer's kit" : kind === "chew" ? "chew the bark" : kind === "crittercharm" ? "rub the critter charm" : "drink your " + label(kind); };
  // use one from the bag. nothing is used up when it had nothing to do
  PW.use = function (game, c, kind) {
    if (!PW.usable(kind) || !Sv().count(c, kind, true)) return fail("you have none");
    if (PW.has(c, "bigglow", game)) return fail("no paws for that while the glow is out");
    if (PW.USE2 && PW.USE2[kind]) return PW.use2(game, c, kind);
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
    if (PW.onToggle) PW.onToggle(game, key, !!s[key]);
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
      if (PW.blow2) mul *= PW.blow2(game, c, S, grump, d);
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
    if (PW.afterBlow && mul > 0 && !lesson) PW.afterBlow(game, c, d * mul, grump);
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
      if (ill.heal >= PW.ILL_REST && !(PW.noRest && PW.noRest(game, c, ill))) PW.recover(game, c, "rest");
      else if (!resting && (ill.w += step) >= PW.ILL_WORSE && ill.stage < 3 && ill.id !== "dims") {
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
    if (PW.frame2) PW.frame2(game, on ? S : null, dt);
    if ((tT -= dt) > 0) return;
    tT = 0.5;
    PW.placeStones(game);
    wardTick(game);
    if (set(game).peaceful) peaceTick(game);
    if (goneQ.length) flushGone(game);
    if (on) bodySlow(game, S.c, S, 0.5);
    if (PW.slow2) PW.slow2(game, on ? S : null, 0.5);
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
    on("knockout", function (d) { var g = cur(); if (!g || !d || !d.c) return; d.at = { x: d.c.x, z: d.c.z }; if (set(g).oneLife) goneQ.push(d.c); else carryHome(g, d.c); });
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
      if (hk && PW.usable(hk) && !(r && r.type === "creature")) o.place = x.op(PW.useLabel(hk), function () { var res = PW.use(game, c, hk); x.say(res.msg); if (res.ok) x.audio(PW.RECIPE[hk] && PW.RECIPE[hk].group === "care" ? "craft" : "eat", 0.6); return res.ok; }, null);
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
      if (p.ill && p.ill.id === "dims") m *= game.world.night ? 1 + 0.1 * p.ill.stage : 1 - 0.08 * p.ill.stage;
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
    (PW.PAGES2 || []).forEach(function (pg) { if (!pg.show || pg.show(game, c)) pages.push([pg.id, pg.label]); });
    if (!pages.some(function (pg) { return pg[0] === page; })) page = "light";
    var p2 = (PW.PAGES2 || []).filter(function (pg) { return pg.id === page; })[0];
    var out = "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin:0 0 4px'>" + pages.map(function (p) { return btn("pwpage", p[0], p[1], false, page === p[0]); }).join("") + "</div>";
    return out + (p2 ? p2.html(game, c, icon, !!sky) : page === "you" ? youHtml(game, c, icon) + (PW.you2 ? PW.you2(game, c, icon) : "") : page === "modes" ? modesHtml(game) + (PW.modes2 ? PW.modes2(game, c) : "") : lightHtml(game, c, !!sky) + (PW.light2 ? PW.light2(game, c, !!sky) : ""));
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
    if (PW.wire2) PW.wire2(root, game, c, redraw, say, sky, done, each);
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
  PW._ = { st: st, me: me, set: set, cur: cur, Sv: Sv, P: P, PS: PS, K: K, label: label, day: day, hashKey: hashKey, clamp: clamp, live: live, burst: burst, snd: snd, emit: emit, inBody: inBody, tell: tell, ground: ground, near: near, roll: roll, give: give, fxOf: fxOf, ok: ok, fail: fail, godOn: godOn, easeIll: easeIll, hasCut: hasCut, wounded: wounded, rc: rc, btn: btn, lbl: lbl, esc: esc, r1: r1, CAST: CAST, shove: shove, sendHome: sendHome, hushScout: hushScout, story: story, skyAt: skyAt, bump: function () { stamp++; }, setLast: function (c) { if (lastId === c.id) lastH = c.chem.health; } };
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { try { ME.STRUCT_BUILDERS.blessstone = standing; ME.STRUCT_BUILDERS.wordstone = whisper; } catch (e) {} }
})();

/* smol brains — powers.js, round 2 (4.35): the rest of the Lantern's ledger. All of it is tables and small machines:
     gear       things you wear in five slots (armour points against bites; some stop the sun, a fall, a sickness),
                and imbues: three seeded offers for the thing in your paw, levels 1 to 3, one imbue per thing, carved
                tablets that carry one for later, and grump-touched ones with a catch.
     the body   nine parts (heart, lungs, gut, head, eyes, ears, paws, legs, tail) that wear and fail, capacities,
                elders' creaky knees and dim eyes, wooden and ark-made parts a healer fits. hazards: long drops, an air
                meter, catching alight, cactus, a heavy bag, sunburn, icy water, germ spots, too many treats.
     the glow   the Lantern's glow is a pool the tribe sings up at the great glowshroom and you fill by sitting quietly.
                it gives the Lantern a level. more words (bought with embers), great lights, star rites, clay helpers.
     gifts      a spark shop: scraps, seeds, berries, eggs, a call back from the edge, a pocket chest, twins, research.
     modes      more switches and knobs, island rules, starts for a new island, secret words, sandbox tools and a
                typed console.
   State: more fields on game.quests.powers and on c.pw. Own dice, seeded from the island. */
(function () {
  "use strict";
  var SB = window.SB, PW = SB && SB.Powers, U = PW && PW._;
  if (!U) return;
  var st = U.st, me = U.me, set = U.set, cur = U.cur, Sv = U.Sv, P = U.P, PS = U.PS, K = U.K, label = U.label, day = U.day, hashKey = U.hashKey, clamp = U.clamp, live = U.live, snd = U.snd, emit = U.emit, inBody = U.inBody, tell = U.tell, near = U.near, give = U.give, fxOf = U.fxOf, ok = U.ok, fail = U.fail, godOn = U.godOn, rc = U.rc, lbl = U.lbl, esc = U.esc, btn = U.btn;
  var DAY = SB.DAY_LENGTH || 1200;
  function s2(game) {
    var s = st(game);
    if (!s.rules) s.rules = {}; if (!s.shop) s.shop = {}; if (!s.research) s.research = {}; if (!s.start) s.start = {}; if (!s.al) s.al = { k: 0, h: 0 };
    if (!Array.isArray(s.helpers)) s.helpers = []; if (typeof s.glow !== "number") s.glow = 0; if (!s.dares) s.dares = {}; if (!s.qdone) s.qdone = {};
    return s;
  }
  function m2(c) {
    var p = me(c);
    if (!p.wear) p.wear = {}; if (!p.imb) p.imb = {}; if (!p.parts) p.parts = {}; if (!p.up) p.up = {}; if (!p.fit) p.fit = {}; if (!p.gift) p.gift = {}; if (!Array.isArray(p.tabs)) p.tabs = [];
    return p;
  }
  PW.state2 = s2; PW.of2 = m2;
  function W() { return SB.World; }
  function dice(game, key) { return SB.rng((hashKey(key) ^ (game.seed >>> 0)) >>> 0); }
  function sandbox(game) { return !!(SB.Game && SB.Game.sandbox && SB.Game.sandbox(game)); }
  function biome(game, x, z) { var b = W() && W().biomeAt ? W().biomeAt(game.world, x, z) : null; return typeof b === "number" ? (SB.BIOMES && SB.BIOMES[b] ? SB.BIOMES[b].id : "") : b || ""; }
  function depthAt(game, c) { return W() && W().depthAt ? W().depthAt(game.world, c.x, c.z) : 0; }
  function rain(game) { return game.world && game.world.weather ? game.world.weather.rain || 0 : 0; }
  function spend(game, n) { if (!(n > 0) || sandbox(game)) return true; return SB.Game.spend(game, n); }
  function note(game, t) { if (SB.Game && SB.Game.note) SB.Game.note(game, t); }
  function smols(game) { return SB.Game.smols(game); }
  function nest(game) { var h = SB.Society && SB.Society.home ? SB.Society.home(game, 0) : null; if (!h && game.world && game.world.T) { var N = game.world.T.N || 256; h = { x: N / 2, z: N / 2 }; } return h; }
  function has(c, k) { return !!(Sv() && Sv().count(c, k, true) > 0); }
  function b2(v, text, off, go) { return btn("pw2", v, text, off, go); }
  function stoneNear(game, c, r) { return PW.stoneAt(game, c, "blessstone", r || 5); }
  function shroomNear(game, c, r) { var s = s2(game).shroom; return !!(s && c && SB.dist(s.x, s.z, c.x, c.z) <= (r || 6)); }
  function struct(game, kind, x, z, data) {
    var b = { id: SB.Game.newId(game), type: "struct", kind: kind, noun: SB.STRUCTS[kind].noun, x: U.r1(x), z: U.r1(z), rot: (hashKey(kind + x) % 628) / 100, s: 1, done: true, work: 0, need: {}, tribe: 0, builders: [], data: data || {}, born: game.time, name: null };
    game.world.structures.push(b);
    if (W().markNode) W().markNode(game.world, b);
    return b;
  }
  function drop(game, kind, n, x, z) { if (K()[kind] && Sv() && Sv().spawn && n > 0) { Sv().spawn(game, kind, n, x, z); return n; } return 0; }
  function freeSpot(game, x, z, min, max, r) {
    for (var t = 0; t < 200; t++) {
      var a = r() * 6.283, d = min + r() * (max - min), nx = x + Math.sin(a) * d, nz = z + Math.cos(a) * d;
      if (W().inBounds && !W().inBounds(game.world, nx, nz)) continue;
      if (W().walkable(game.world, nx, nz, false) && !(W().depthAt && W().depthAt(game.world, nx, nz) > 0.02)) return { x: nx, z: nz };
    }
    return { x: x + min, z: z };
  }

  /* ---------------- island rules: the hazards can each be switched off ---------------- */
  PW.RULES = {
    falls: ["🪂", "long drops hurt", "a drop off a cliff costs hearts (not into water)"],
    load: ["🎒", "a heavy bag", "stacks of logs, stone and ore slow your running"],
    parts: ["🦴", "body parts", "paws, legs, eyes and the rest can be hurt, fail, and be mended"],
    burns: ["🔥", "fire and thorns", "standing in a fire sets your fur alight (water puts it out). cactus pricks"],
    sun: ["🌞", "sun and ice", "the desert sun burns a bare head. wading in a frozen land chills fast"],
    germs: ["🦠", "germ spots", "swamp water and unburied smols carry their own sicknesses"]
  };
  PW.rule = function (game, k) { var s = game && game.quests && game.quests.powers; return !(s && s.rules && s.rules[k] === false); };
  PW.setRule = function (game, k, on) { if (!PW.RULES[k]) return false; s2(game).rules[k] = !!on; U.bump(); emit("rule", { key: k, on: !!on }); return true; };

  /* ---------------- gear: what you wear ---------------- */
  PW.SLOTS = [["head", "🧢"], ["body", "🦺"], ["feet", "🥾"], ["charm", "📿"], ["paw", "🦯"]];
  PW.WEAR = {
    leafhat: { slot: "head", arm: 0, res: { sun: 1 }, label: "leaf hat", emoji: "🍃", cost: { leaves: 3, vine: 1 }, desc: "keeps the sun off. nothing more." },
    furcap: { slot: "head", arm: 1, res: { sun: 1 }, fx: { warmth: 0.5 }, label: "fur cap", emoji: "🧢", cost: { fur: 1, fiber: 1 }, desc: "warm ears, and a little off every bite." },
    coppercap: { slot: "head", arm: 2, res: { sun: 1 }, label: "copper cap", emoji: "⛑", cost: { metal: 1, fiber: 1 }, desc: "a beaten metal cap. bites glance off." },
    ironcap: { slot: "head", arm: 3, res: { sun: 1 }, label: "iron cap", emoji: "🪖", cost: { iron: 1, fur: 1 }, desc: "the best thing to have between a grump and your head." },
    hidevest: { slot: "body", arm: 2, fx: { warmth: 0.5 }, label: "hide vest", emoji: "🦺", cost: { fur: 2, fiber: 2 }, desc: "thick and warm. softens bites." },
    coppervest: { slot: "body", arm: 3, label: "copper vest", emoji: "🥉", cost: { metal: 2, vine: 1 }, desc: "plates on a vine. heavy bites become light ones." },
    ironvest: { slot: "body", arm: 4, res: { burn: 0.3 }, label: "iron vest", emoji: "🛡", cost: { iron: 2, fur: 1 }, desc: "the most a smol can wear. fire likes it less, too." },
    wraps: { slot: "feet", arm: 1, res: { fall: 0.3, prick: 1 }, label: "foot wraps", emoji: "🩹", cost: { leaves: 2, fiber: 1 }, desc: "soft landings and no thorns." },
    furboots: { slot: "feet", arm: 1, res: { fall: 0.3, prick: 1, icy: 1 }, fx: { warmth: 0.5 }, label: "fur boots", emoji: "🥾", cost: { fur: 1, vine: 1 }, desc: "soft landings, no thorns, and icy water can't bite." },
    sniffcharm: { slot: "charm", immune: ["sniffles"], label: "herb charm", emoji: "🌿", cost: { herb: 1, vine: 1 }, desc: "a sprig round your neck. the sniffles pass you by." },
    suncharm: { slot: "charm", immune: ["dims", "glooms"], res: { sun: 1 }, label: "sun charm", emoji: "🌞", cost: { glowcap: 1, vine: 1 }, desc: "a little kept light. no dims, no glooms, no sunburn." },
    dampcharm: { slot: "charm", immune: ["shivers", "swampfever"], label: "river charm", emoji: "🐚", cost: { clam: 1, vine: 1 }, desc: "a shell that hums. no shivers, no swamp fever." },
    glasses: { slot: "charm", part: "eyes", label: "crystal glasses", emoji: "👓", cost: { lens: 1, vine: 1 }, desc: "two lenses on a vine. dim old eyes see well again." },
    walkstick: { slot: "paw", part: "legs", label: "walking stick", emoji: "🦯", cost: { stick: 2, vine: 1 }, desc: "creaky knees and bad legs get about as well as ever." }
  };
  PW.ARM_STEP = 0.05;
  PW.wearing = function (c, slot) { var p = c && c.pw; return p && p.wear && PW.WEAR[p.wear[slot]] ? p.wear[slot] : null; };
  PW.armour = function (c) { var p = c && c.pw, n = 0; if (p && p.wear) for (var k in p.wear) if (PW.WEAR[p.wear[k]]) n += PW.WEAR[p.wear[k]].arm || 0; return n; };
  // how much of one kind of hurt your gear turns aside (0..1; a bite at most 0.45): bite, burn, fall, prick, sun, icy
  PW.resist = function (c, type) {
    var p = c && c.pw, v = 0, k, w, im;
    if (!p || !p.wear) return 0;
    for (k in p.wear) {
      w = PW.WEAR[p.wear[k]]; if (!w) continue;
      if (w.res && w.res[type]) v += w.res[type];
      im = imbOf(c, p.wear[k]);
      if (im && im.d.res && im.d.res[type]) v += im.d.res[type] * im.lv;
    }
    return type === "bite" ? Math.min(0.45, PW.armour(c) * PW.ARM_STEP + v) : Math.min(1, v);
  };
  PW.putOn = function (game, c, kind) {
    var w = PW.WEAR[kind], p = m2(c);
    if (!w) return fail("that isn't something to wear");
    if (!has(c, kind)) return fail("you have none");
    if (c.tier < 2) return fail("it takes hands: a tool-user and up");
    var was = p.wear[w.slot];
    Sv().take(c, kind, 1);
    p.wear[w.slot] = kind; U.bump();
    if (was && PW.WEAR[was]) give(game, c, was, 1);
    emit("worn", { c: c, kind: kind, slot: w.slot });
    return ok(w.emoji + " " + w.label + " on" + (w.arm ? ": " + PW.armour(c) + " armour now, " + Math.round(PW.resist(c, "bite") * 100) + "% off every bite" : ": " + w.desc));
  };
  PW.takeOff = function (game, c, slot) {
    var p = m2(c), k = p.wear[slot];
    if (!k) return fail("nothing there");
    delete p.wear[slot]; U.bump();
    give(game, c, k, 1);
    return ok("you take the " + label(k) + " off");
  };

  /* ---------------- imbues ---------------- */
  // fam: what it goes on. fx / res scale with the level (1 to 3). curse: grump-touched, cheap, strong, with a catch
  PW.IMBUES = [
    { id: "keen", fam: "weapon", icon: "✨", name: "keen", desc: "hits 15% harder a level" },
    { id: "cinder", fam: "weapon", icon: "🔥", name: "cinder", desc: "every third hit singes: harder, and the grump reels" },
    { id: "finder", fam: "weapon", icon: "🍀", name: "finder", desc: "a grump you chase off leaves more behind" },
    { id: "trueflight", fam: "bow", icon: "🎯", name: "true flight", desc: "arrows hit a fifth harder a level" },
    { id: "lightarrow", fam: "bow", icon: "🌟", name: "light arrows", desc: "every third arrow is a bolt of light that dazzles" },
    { id: "whirl", fam: "sling", icon: "🌀", name: "quick whirl", desc: "stones hit a quarter harder a level" },
    { id: "stonecall", fam: "sling", icon: "🪨", name: "stone call", desc: "every third stone stuns" },
    { id: "storm", fam: "spear", icon: "⛈", name: "storm caller", desc: "in the rain it hits harder and stuns" },
    { id: "riptide", fam: "spear", icon: "🌊", name: "rain rider", desc: "in the rain or the shallows it flings you forward" },
    { id: "slam", fam: "club", icon: "🔨", name: "heavy slam", desc: "every third swing lands like a falling tree" },
    { id: "lasting", fam: "tool", icon: "♾", name: "lasting", desc: "the tool wears out much more slowly" },
    { id: "plenty", fam: "tool", icon: "🧺", name: "plenty", desc: "now and then the work gives one more" },
    { id: "thick", fam: "wear", icon: "🛡", name: "thick", res: { bite: 0.05 }, desc: "5% more off every bite a level" },
    { id: "snug", fam: "wear", icon: "♨️", name: "snug", fx: { warmth: 0.5 }, desc: "the cold lets go faster" },
    { id: "cool", fam: "wear", icon: "🧊", name: "cool", res: { burn: 0.25 }, desc: "fire bites a quarter less a level" },
    { id: "wading", fam: "feet", icon: "🦆", name: "wading", desc: "quicker through water and snow" },
    { id: "gill", fam: "head", icon: "🫧", name: "deep breath", desc: "your air lasts much longer under water" },
    { id: "grudge", fam: "weapon", curse: true, icon: "😠", name: "grudge", desc: "hits 40% harder. you are hungry all the time" },
    { id: "leaden", fam: "wear", curse: true, icon: "⚓", name: "leaden", res: { bite: 0.2 }, desc: "a fifth off every bite. running costs more pep" }
  ];
  PW.IMB = {}; PW.IMBUES.forEach(function (d) { PW.IMB[d.id] = d; });
  PW.fams = function (kind) {
    var w = PW.WEAR[kind], out = {}, d = K()[kind], T = Sv() && Sv().TOOL ? Sv().TOOL[kind] : null;
    if (w) { if (w.slot === "head" || w.slot === "body" || w.slot === "feet") { out.wear = 1; out[w.slot] = 1; } return out; }
    if (kind === "bow") { out.bow = 1; return out; }
    if (kind === "sling") { out.sling = 1; return out; }
    if (!d || !d.tool) return out;
    if (kind === "spear") out.spear = 1;
    if (kind === "club" || kind === "maul" || kind === "hammer") out.club = 1;
    if (out.spear || out.club || (T && T.dmg >= 0.75)) out.weapon = 1;
    if (!out.weapon || (T && (T.wood > 0.5 || T.stone > 0.5 || T.ore > 0))) out.tool = 1;
    return out;
  };
  function imbOf(c, kind) { var p = c && c.pw, e = p && p.imb ? p.imb[kind] : null, d = e ? PW.IMB[e.id] : null; return d ? { d: d, lv: e.lv || 1 } : null; }
  PW.imbueOf = imbOf;
  PW.imbueName = function (c, kind) { var im = imbOf(c, kind); return im ? im.d.icon + " " + im.d.name + " " + ["", "I", "II", "III"][im.lv] : ""; };
  function owns(c, kind) { var p = c && c.pw; if (has(c, kind)) return true; if (p && p.wear) for (var k in p.wear) if (p.wear[k] === kind) return true; return false; }
  // three offers for this thing, today (the same three until tomorrow)
  PW.offers = function (game, c, kind) {
    var f = PW.fams(kind), fit = PW.IMBUES.filter(function (d) { return !!f[d.fam]; }), r = dice(game, "imb:" + day(game) + ":" + c.id + ":" + kind), out = [], now = imbOf(c, kind);
    while (fit.length && out.length < 3) {
      var d = fit.splice(Math.floor(r() * fit.length), 1)[0], lv = 1 + (r() < 0.35 ? 1 : 0) + (r() < 0.12 ? 1 : 0);
      if (now && now.d === d) lv = Math.min(3, now.lv + 1);
      out.push({ id: d.id, lv: lv, cost: (d.curse ? 2 : 4) * lv, d: d });
    }
    return out;
  };
  PW.benchWhy = function (game, c) {
    if (has(c, "lens") || stoneNear(game, c) || PW.stoneAt(game, c, "wordstone", 5) || shroomNear(game, c)) return "";
    return "imbuing takes a crystal lens in your bag, or a stone of the Lantern beside you";
  };
  function payImbue(game, c, o, how) {
    if (how === "skill") { // a level of your best skill instead of sparks
      var B = SB.Body, best = null, bl = 0;
      if (!B) return "no skills to give";
      B.SKILLS.forEach(function (s) { var l = B.level(c, s.id); if (l > bl) { bl = l; best = s.id; } });
      if (!best) return "you have no skill level to give";
      B.of(c).sk[best].l--; B.of(c).sk[best].x = 0; U.bump();
      return "";
    }
    return spend(game, o.cost) ? "" : "it takes " + o.cost + " sparks ✨";
  }
  PW.imbue = function (game, c, kind, i, how) {
    var o = PW.offers(game, c, kind)[i], why = PW.benchWhy(game, c), p = m2(c);
    if (!o) return fail("nothing to imbue there");
    if (!owns(c, kind)) return fail("you don't have that");
    if (why) return fail(why);
    var now = imbOf(c, kind);
    if (now && now.d.curse) return fail("it is grump-touched. clear tea washes that off first");
    why = payImbue(game, c, o, how); if (why) return fail(why);
    p.imb[kind] = { id: o.id, lv: o.lv }; U.bump();
    emit("imbued", { c: c, kind: kind, id: o.id, lv: o.lv });
    return ok(o.d.icon + " your " + label(kind) + " is " + o.d.name + " " + ["", "I", "II", "III"][o.lv] + " now: " + o.d.desc + (now && now.d !== o.d ? " (" + now.d.name + " is gone: one imbue a thing)" : ""));
  };
  // carve an offer on a tablet instead: it keeps, and goes on any thing of the right kind later
  PW.carve = function (game, c, kind, i) {
    var o = PW.offers(game, c, kind)[i], why = PW.benchWhy(game, c), p = m2(c);
    if (!o) return fail("nothing to carve");
    if (why) return fail(why);
    if (!has(c, "stone")) return fail("a tablet is carved from a stone");
    why = payImbue(game, c, o); if (why) return fail(why);
    Sv().take(c, "stone", 1);
    p.tabs.push({ id: o.id, lv: o.lv }); give(game, c, "tablet", 1);
    emit("carved", { c: c, id: o.id, lv: o.lv });
    return ok("🪧 carved: " + o.d.name + " " + ["", "I", "II", "III"][o.lv] + ". it goes on a " + o.d.fam + " thing whenever you like");
  };
  PW.useTablet = function (game, c, kind, ti) {
    var p = m2(c), t = p.tabs[ti], d = t ? PW.IMB[t.id] : null;
    if (!d || !has(c, "tablet")) return fail("no tablet for that");
    if (!owns(c, kind) || !PW.fams(kind)[d.fam]) return fail(d.name + " goes on a " + d.fam + " thing");
    Sv().take(c, "tablet", 1); p.tabs.splice(ti, 1);
    p.imb[kind] = { id: t.id, lv: t.lv }; U.bump();
    emit("imbued", { c: c, kind: kind, id: t.id, lv: t.lv, tablet: true });
    return ok(d.icon + " the tablet crumbles and your " + label(kind) + " is " + d.name + " now");
  };
  PW.unimbue = function (game, c, kind) {
    var p = m2(c), im = imbOf(c, kind);
    if (!im) return fail("nothing on it");
    if (im.d.curse) { if (!has(c, "cleartea")) return fail("a grump-touched thing wants clear tea to wash it"); Sv().take(c, "cleartea", 1); }
    delete p.imb[kind]; U.bump();
    return ok("the " + label(kind) + " is plain again");
  };
  // a grump you chase off sometimes leaves a grump-touched tablet
  function touchedTablet(game, c) {
    var p = m2(c), r = dice(game, "curse:" + c.id + ":" + (p.tabs.length + (p.nCurse = (p.nCurse || 0) + 1))), d = r() < 0.5 ? "grudge" : "leaden";
    p.tabs.push({ id: d, lv: 1 }); give(game, c, "tablet", 1);
    tell(game, c, "🪧 the grump dropped a carved tablet. it feels cross (" + PW.IMB[d].name + ": " + PW.IMB[d].desc + ")");
    emit("cursedLoot", { c: c, id: d });
  }

  /* ---------------- the body: parts, capacities, age ---------------- */
  PW.PARTS = [
    { id: "heart", icon: "❤️", name: "heart", cap: "blood", organ: 1, bad: "resting no longer heals" },
    { id: "lungs", icon: "🫁", name: "lungs", cap: "breath", organ: 1, bad: "pep runs short" },
    { id: "gut", icon: "🍽", name: "tummy", cap: "eating", organ: 1, bad: "hungry much sooner" },
    { id: "head", icon: "🧠", name: "head", cap: "thinking", organ: 1, bad: "skills come slowly" },
    { id: "eyes", icon: "👁", name: "eyes", cap: "sight", bad: "nights look darker" },
    { id: "ears", icon: "👂", name: "ears", cap: "hearing", bad: "whisper stones are too quiet to hear" },
    { id: "paws", icon: "🐾", name: "paws", cap: "working", bad: "hits land soft" },
    { id: "legs", icon: "🦵", name: "legs", cap: "moving", bad: "running costs more pep" },
    { id: "tail", icon: "〰️", name: "tail", cap: "balance", bad: "falls hurt more" }
  ];
  PW.PART = {}; PW.PARTS.forEach(function (d) { PW.PART[d.id] = d; });
  PW.OUTER = ["paws", "legs", "ears", "tail", "eyes"];
  PW.FAIL = 0.25;
  PW.FITS = {
    pegleg: { part: "legs", v: 0.75, label: "peg leg", emoji: "🦿", cost: { log: 1, vine: 1 }, desc: "a wooden leg. not fast, but it never tires or sprains." },
    woodpaw: { part: "paws", v: 0.75, label: "wooden paw", emoji: "🪵", cost: { plank: 1, fiber: 1 }, desc: "carved to hold a tool. good enough for most work." },
    crystaleye: { part: "eyes", v: 1, night: 1, label: "crystal eye", emoji: "🔮", cost: { crystal: 1, lens: 1 }, desc: "sees as well as a real one, and better after dark." },
    arkleg: { part: "legs", v: 1.25, label: "ark leg", emoji: "🦿", cost: { arkshard: 1, metal: 1 }, desc: "made from a piece of the ark. better than the one you were hatched with." },
    arkeye: { part: "eyes", v: 1.25, night: 1, label: "ark eye", emoji: "💠", cost: { arkshard: 1, lens: 1 }, desc: "a little ark light behind a lens. nights are never black again." },
    arkheart: { part: "heart", v: 1.25, label: "ark heart", emoji: "💗", cost: { arkshard: 2, crystal: 1 }, desc: "it ticks. resting heals faster than nature meant." }
  };
  PW.part = function (c, id) { var p = c && c.pw; return p && p.parts && p.parts[id] != null ? p.parts[id] : 1; };
  // what a part can do right now: its health, or what's fitted in its place, less what age takes
  PW.cap = function (c, id, game) {
    var p = c && c.pw, v = PW.part(c, id), f = p && p.fit ? PW.FITS[p.fit[id]] : null;
    if (f) return f.v;
    if (c && c.stage >= 4) { // an elder: creaky knees, dim eyes
      if (id === "legs" && PW.wearing(c, "paw") !== "walkstick" && !PW.has(c, "limber", game)) v = Math.min(v, 0.6);
      if (id === "eyes" && PW.wearing(c, "charm") !== "glasses") v = Math.min(v, 0.6);
    }
    return v;
  };
  PW.failed = function (c, game) { return PW.PARTS.filter(function (d) { return PW.cap(c, d.id, game) < PW.FAIL; }).map(function (d) { return d.id; }); };
  PW.hurtPart = function (game, c, id, amt) {
    if (!PW.PART[id] || !PW.rule(game, "parts") || !(amt > 0)) return false;
    var p = m2(c), was = PW.part(c, id);
    if (p.fit[id]) return false; // wood and ark don't bruise
    p.parts[id] = Math.max(0, Math.round((was - amt) * 1000) / 1000); U.bump();
    if (was >= PW.FAIL && p.parts[id] < PW.FAIL) { if (inBody(c)) tell(game, c, PW.PART[id].icon + " your " + PW.PART[id].name + " " + (id === "eyes" || id === "ears" || id === "paws" || id === "legs" || id === "lungs" ? "are" : "is") + " badly hurt: " + PW.PART[id].bad + ". a healer can mend it"); emit("partFail", { c: c, id: id }); }
    return true;
  };
  PW.healPart = function (c, id, amt) { var p = c && c.pw; if (!p || !p.parts || p.parts[id] == null) return false; p.parts[id] = Math.min(1, p.parts[id] + amt); if (p.parts[id] >= 1) delete p.parts[id]; U.bump(); return true; };
  // a healer (or a healer's kit) mends one part properly
  PW.operate = function (game, c, id) {
    var p = m2(c), h = PW.healerNear(game, c);
    if (!PW.PART[id] || PW.part(c, id) >= 0.8) return fail("that is well enough");
    if (!h && !has(c, "kit")) return fail("that takes a smol who knows herb lore beside you, or a healer's kit");
    if (h) { var fee = Math.min(3, c.purse || 0); if (fee > 0) { c.purse = Math.round((c.purse - fee) * 100) / 100; h.purse = Math.round(((h.purse || 0) + fee) * 100) / 100; } }
    else Sv().take(c, "kit", 1);
    p.parts[id] = 0.85; U.bump();
    emit("operated", { c: c, part: id, healer: h || null });
    return ok("🌿 " + (h ? h.name + " sets" : "the kit sets") + " your " + PW.PART[id].name + " right. it will mend the rest of the way with rest");
  };
  PW.fitPart = function (game, c, kind) {
    var f = PW.FITS[kind], p = m2(c);
    if (!f) return fail("that isn't a part");
    if (!has(c, kind)) return fail("you have none");
    if (!PW.healerNear(game, c) && !has(c, "kit") && c.tier < 4) return fail("fitting it takes a healer beside you, a healer's kit, or a builder's own paws");
    var was = p.fit[f.part];
    Sv().take(c, kind, 1);
    p.fit[f.part] = kind; delete p.parts[f.part]; U.bump();
    if (was && PW.FITS[was]) give(game, c, was, 1);
    emit("fitted", { c: c, kind: kind, part: f.part });
    return ok(f.emoji + " fitted: " + f.label + ". " + f.desc);
  };
  PW.unfit = function (game, c, part) { var p = m2(c), k = p.fit[part]; if (!k) return fail("nothing fitted there"); delete p.fit[part]; p.parts[part] = 0.2; U.bump(); give(game, c, k, 1); return ok("the " + label(k) + " comes off"); };
  // hurt of one kind, through what you wear. used by the hazards below (and open to other systems)
  PW.hurt = function (game, c, amt, type) {
    if (!c || !c.alive || !(amt > 0) || godOn(game)) return 0;
    var d = amt * (1 - PW.resist(c, type)) * (s2(game).nasty ? 1.5 : 1);
    if (!(d > 0)) return 0;
    c.chem.health = Math.max(0.02, c.chem.health - d);
    U.setLast(c);
    if (type === "fall") PW.hurtPart(game, c, "legs", d * 0.8);
    emit("hurt2", { c: c, type: type, d: d });
    return d;
  };

  /* ---------------- everything round 2 adds to a smol's numbers ---------------- */
  PW.WAYS = [
    { id: "hearth", icon: "🔥", name: "the way of the hearth", fx: { regen: 1 }, desc: "resting heals twice as fast" },
    { id: "hunt", icon: "🏹", name: "the way of the hunt", fx: { dmg: 0.1, huntMeat: 0.34 }, desc: "harder hits, and more from a hunt" },
    { id: "star", icon: "⭐", name: "the way of the star", fx: { cd: 0.15, xpAll: 0.15 }, desc: "powers are ready sooner and skills come quicker" }
  ];
  PW.WAY = {}; PW.WAYS.forEach(function (w) { PW.WAY[w.id] = w; });
  PW.GIFTS = [
    { id: "nightowl", icon: "🦉", name: "night owl", cost: 20, fx: {}, desc: "the dark is only half as dark, for good" },
    { id: "irontum", icon: "🥘", name: "iron tummy", cost: 20, fx: {}, desc: "bad food and too many treats never upset it" },
    { id: "quickheal", icon: "🍀", name: "quick healer", cost: 20, fx: { regen: 1 }, desc: "resting heals twice as fast, for good" }
  ];
  PW.GIFT = {}; PW.GIFTS.forEach(function (g) { PW.GIFT[g.id] = g; });
  PW.fx2 = function (game, c, out, p) {
    function add(o, k) { for (var f in o) out[f] = (out[f] || 0) + o[f] * (k || 1); }
    var s = game.quests && game.quests.powers, key, w, im;
    if (s && s.way && PW.WAY[s.way]) add(PW.WAY[s.way].fx);
    if (s && s.cosy) add({ regen: 1 });
    if (!p) return;
    for (key in p.wear || {}) {
      w = PW.WEAR[p.wear[key]]; if (!w) continue;
      if (w.fx) add(w.fx);
      im = imbOf(c, p.wear[key]);
      if (im && im.d.fx) add(im.d.fx, im.lv);
    }
    if (p.up) {
      if (p.up.pep) add({ cost: 0.1 * p.up.pep });
      if (p.up.luck) add({ forMore: 0.1 * p.up.luck, chopStick: 0.1 * p.up.luck, mineStone: 0.1 * p.up.luck, fishMore: 0.1 * p.up.luck });
    }
    for (key in p.gift || {}) if (PW.GIFT[key]) add(PW.GIFT[key].fx);
    if (PW.rule(game, "parts") && c) { var hd = PW.cap(c, "head", game); if (hd < 1) add({ xpAll: -0.5 * (1 - hd) }); }
  };
  PW.immune2 = function (game, c, id) {
    var p = c && c.pw, k, w;
    if (!p) return false;
    if (PW.has(c, "bigglow", game)) return true;
    if (id === "tummy" && p.gift && p.gift.irontum) return true;
    if (id === "glooms" && p.back) return true;
    for (k in p.wear || {}) { w = PW.WEAR[p.wear[k]]; if (w && w.immune && w.immune.indexOf(id) >= 0) return true; }
    return false;
  };
  PW.noRest = function (game, c, ill) { return ill.id === "dims" && ill.stage >= 2; };
  // what a blow costs, after round 2: armour, a bigger heart, a dash, a hard dark, the glow
  PW.blow2 = function (game, c, S, grump) {
    var p = c.pw || {}, m = 1, s = s2(game);
    if (grump) m *= 1 - PW.resist(c, "bite");
    if (p.up && p.up.heart) m *= 1 - 0.04 * p.up.heart;
    if (PW.has(c, "dashing", game)) m *= 0.5;
    if (PW.has(c, "bigglow", game)) m *= 0.7;
    if (grump && set(game).deepHard && SB.Deep && SB.Deep.cur && SB.Deep.cur(game)) m *= 1.5;
    if (grump && p.dimGift === "kin" && !game.world.night) m *= 1.25;
    if (s.nasty) m *= 1.2;
    return m;
  };
  PW.afterBlow = function (game, c, d, grump) {
    var p = m2(c);
    if (d >= 0.06 && PW.rule(game, "parts")) { p.pN = (p.pN || 0) + 1; PW.hurtPart(game, c, PW.OUTER[p.pN % PW.OUTER.length], d * 0.7); }
    if (grump && PW.diff(game).dmg >= 1.35) { p.hard = (p.hard || 0) + 1; if (p.hard % 3 === 0) { PW.buff(c, "rattled", 10, game); } } // a hard island's grumps hit so you see stars
  };

  /* ---------------- the Lantern's glow: a pool, a level, sitting quietly ---------------- */
  PW.GLOW_MAX = 120;
  PW.glow = function (game) { return Math.round(s2(game).glow * 10) / 10; };
  PW.link = function (game) { return Math.min(6, 1 + Math.floor(s2(game).glow / 20)); };
  PW.addGlow = function (game, n) {
    var s = s2(game), was = PW.link(game);
    s.glow = clamp(s.glow + n, 0, PW.GLOW_MAX);
    if (PW.link(game) > was) { note(game, "🕯 the Lantern's glow grew: level " + PW.link(game) + ". every power is a little stronger."); emit("linkUp", { level: PW.link(game) }); }
    return s.glow;
  };
  PW.align = function (game) { var a = s2(game).al, v = (a.k || 0) - (a.h || 0); return { score: v, id: v >= 10 ? "kind" : v <= -10 ? "harsh" : "even" }; };
  var KIND_CASTS = { heal: 1, mend: 1, calm: 1, grow: 1 };
  PW.castK = function (game, c, id) {
    var k = 1 + 0.05 * (PW.link(game) - 1), a = PW.align(game).id;
    if (c && c.tier >= 2 && has(c, "lens")) k += 0.1; // a crystal lens makes thinking louder
    if (a === "kind" && KIND_CASTS[id]) k += 0.2;
    if (a === "harsh") k += id === "burst" ? 0.25 : KIND_CASTS[id] ? -0.2 : 0;
    return k;
  };
  PW.pepK = function (game, c) { return c && PW.has(c, "focused", game) ? 0.75 : 1; };
  PW.wordK = function (game, id) { return s2(game).focusWord === id ? 0.7 : 1; };
  PW.locked = function (game) { return set(game).handsOff ? "hands off: the island is on its own (modes)" : ""; };
  PW.wishFree = function (game) { return (s2(game).wishes || 0) > 0; };
  PW.wishUsed = function (game) { var s = s2(game); s.wishes = Math.max(0, (s.wishes || 0) - 1); emit("wish", { left: s.wishes }); return " · a wish spent (" + s.wishes + " left)"; };
  function harsh(game) { return (SB.Wilds && SB.Wilds.level && SB.Wilds.level(game) === "harsh") || PW.diff(game).dmg >= 1.35; }
  PW.boonPay = function (game) { return !harsh(game) || spend(game, 2); };
  PW.SCRAPS = { scrapheal: "heal", scrapburst: "burst", scrapward: "ward", scrapgrow: "grow", homeember: "recall" };
  PW.boon2 = function (game, c, b) {
    var s = s2(game), r = dice(game, "boon:" + day(game) + ":" + b.id), ks = Object.keys(PW.SCRAPS), k = ks[Math.floor(r() * ks.length)], msg = "";
    give(game, c, k, 1); msg += " · it left you " + label(k);
    if (!s.lamp) { s.lamp = 1; give(game, c, "wishlamp", 1); msg += " · and a little lamp sat at its foot: rub it for three free miracles"; }
    return msg;
  };
  // sit quietly: by a stone, under the great glowshroom, at a shrine, or under a clear night sky
  PW.meditate = function (game, c, wordId) {
    var S = inBody(c), s = s2(game), where = "";
    if (!S) return fail("sit quietly from inside a body");
    if (PW.cdLeft(game, "med") > 0) return fail("your head is still full. in " + Math.ceil(PW.cdLeft(game, "med")) + "s");
    if (shroomNear(game, c)) where = "shroom";
    else if (stoneNear(game, c)) where = "stone";
    else if (W().structsNear && (W().structsNear(game.world, c.x, c.z, 5, function (b) { return b.done && (b.kind === "shrine" || b.kind === "totem" || b.kind === "observatory"); }) || []).length) where = "shrine";
    else if (game.world.night && rain(game) < 0.2) where = "stars";
    else return fail("sit by a stone of the Lantern, the great glowshroom, a shrine, or under a clear night sky");
    s.cd.med = Math.round(game.time + 120);
    S.stam = Math.min(1, S.stam + 0.4);
    PW.buff(c, "focused", 120, game);
    PW.addGlow(game, where === "shroom" ? 6 : 3);
    var msg = "🧘 " + (where === "stars" ? "you watch the stars for a while" : where === "shroom" ? "you sit under the great glowshroom" : where === "stone" ? "you sit with your back to the stone" : "you sit a while") + ". pep back, powers cost less for a while, and the Lantern's glow is " + Math.round(s.glow);
    if (where === "stone" && wordId && PW.WORD[wordId] && PW.wordLevel(game, wordId) && s.focusDay !== day(game)) { s.focusWord = wordId; s.focusDay = day(game); msg += " · " + PW.WORD[wordId].name + " is your word now: ready a third sooner, for good"; }
    emit("meditate", { c: c, where: where });
    return ok(msg, { where: where });
  };
  PW.placeShroom = function (game) {
    var s = s2(game), hm = nest(game);
    if (s.shroom || !hm || !game.world || !game.world.structures || !W() || !W().walkable) return false;
    var p = freeSpot(game, hm.x, hm.z, 13, 24, dice(game, "powers:shroom"));
    var b = struct(game, "glowshroom", p.x, p.z, { pw2: "shroom" });
    s.shroom = { id: b.id, x: b.x, z: b.z };
    return true;
  };
  function singTick(game) {
    var s = s2(game), sh = s.shroom, n = 0, d = day(game);
    if (!sh || !game.world.night) return;
    near(game, sh.x, sh.z, 9, function (c) { if (c.species === "smol" && c.alive && !c.asleep) n++; });
    if (!n) return;
    if (s.sungDay !== d) { s.sungDay = d; s.sung = 0; }
    if (s.sung >= 12) return;
    var add = Math.min(12 - s.sung, 0.25 * n); s.sung += add; PW.addGlow(game, add);
    if (n >= 2 && s.singDay !== d) { s.singDay = d; note(game, "🍄 the tribe is singing under the great glowshroom. the Lantern's glow is rising."); emit("sing", { n: n }); }
  }

  /* ---------------- more words of power: bought with an ember each, three levels ---------------- */
  function grumpsNear(game, c, r, fn) { var n = 0; near(game, c.x, c.z, r, function (g) { if (g.species === "grump" && g.alive) { fn(g); n++; } }); return n; }
  function hop(game, c, steps) { // straight ahead, as far as the ground lets you
    var dx = Math.sin(c.facing || 0), dz = Math.cos(c.facing || 0), done = 0;
    for (var i = 0; i < steps * 2; i++) { var nx = c.x + dx * 0.5, nz = c.z + dz * 0.5; if (!W().walkable(game.world, nx, nz, false)) break; c.x = nx; c.z = nz; done += 0.5; }
    if (c.px != null) { c.px = c.x; c.pz = c.z; }
    T2.y = null;
    return done;
  }
  function setWeather(game, kind) { if (!game.world || !game.world.weather) return false; game.forceWeather = kind; game.world.weather.t = game.world.weather.next; return true; }
  PW.setWeather = setWeather;
  PW.WORDS2 = [
    { id: "ember", icon: "🔥", name: "ember", cd: 50, desc: "the island's fire word: lights a cold fire ahead, singes grumps close by, and warms you",
      fn: function (game, c, L) {
        var n = 0, g;
        (W().structsNear ? W().structsNear(game.world, c.x, c.z, 4 + 2 * L, function (b) { return b.done && (b.kind === "campfire" || b.kind === "kiln") && b.data && !b.data.lit; }) || [] : []).forEach(function (b) { b.data.fuel = Math.max(b.data.fuel || 0, 0.5); b.data.lit = true; emit("fireLit", { c: c, st: b, word: true }); n++; });
        g = grumpsNear(game, c, 2 + L, function (o) { PW.stun(game, o, o.boss ? 0.5 : 1); if (!o.boss) SB.Chem.apply(o.chem, { fear: 0.2 * L }); });
        PW.buff(c, "warm", 20 * L, game);
        return { n: n + g, msg: "🔥 ember! " + (n ? n + " fire" + (n > 1 ? "s catch" : " catches") : g ? g + " grump" + (g > 1 ? "s are" : " is") + " singed" : "you are warm right through") };
      } },
    { id: "dash", icon: "💫", name: "dash", cd: 25, desc: "a step of light straight ahead. hurts cost half for a moment",
      fn: function (game, c, L) { var d = hop(game, c, 3 + L); PW.buff(c, "dashing", 2, game); return d ? { n: 1, msg: "💫 dash!" } : { ok: false, msg: "no room to dash" }; } },
    { id: "soothe", icon: "🕊", name: "soothe", cd: 60, desc: "calms a tantrum or a fright, and calls your animals",
      fn: function (game, c, L) {
        var n = 0;
        near(game, c.x, c.z, 6 + 2 * L, function (o) { if (o !== c && o.species === "smol" && o.alive) { SB.Chem.apply(o.chem, { anger: -0.7, fear: -0.6, punish: -0.3 }); if (SB.Creature.emote) SB.Creature.emote(o, "happy", 2); n++; } });
        if (SB.Animals && SB.Animals.call) { try { SB.Animals.call(game, c); } catch (e) {} }
        return { n: n, msg: "🕊 soothe. " + (n ? n + " smol" + (n > 1 ? "s settle" : " settles") : "the air goes soft") };
      } },
    { id: "sight", icon: "👁", name: "sight", cd: 60, desc: "shows the smols and grumps around you, through the dark",
      fn: function (game, c, L) {
        var R = 20 + 10 * L, sm = 0, gr = 0, best = null, bd = 1e9;
        near(game, c.x, c.z, R, function (o) { if (!o.alive || o === c) return; if (o.species === "smol") sm++; else if (o.species === "grump") { gr++; var d = SB.dist(o.x, o.z, c.x, c.z); if (d < bd) { bd = d; best = o; } } });
        PW.buff(c, "sight", 20 + 10 * L, game);
        if (best && P().setGoal) P().setGoal({ x: best.x, z: best.z, label: "👁 a grump", small: true });
        return { n: sm + gr, msg: "👁 " + sm + " smol" + (sm === 1 ? "" : "s") + " and " + gr + " grump" + (gr === 1 ? "" : "s") + " within " + R + " steps" + (best ? ". the nearest grump is marked, " + Math.round(bd) + " steps off" : "") };
      } },
    { id: "skies", icon: "🌤", name: "skies", cd: 240, desc: "clears the sky. said under a clear one (level 2), it calls rain",
      fn: function (game, c, L) {
        var k = game.world.weather ? game.world.weather.kind : "clear";
        if (k === "clear" && L < 2) return { ok: false, msg: "the sky is clear already" };
        setWeather(game, k === "clear" ? "rain" : "clear");
        return { n: 1, msg: k === "clear" ? "🌧 the clouds come when called" : "🌤 the clouds roll back" };
      } },
    { id: "drain", icon: "🌒", name: "drain", cd: 45, late: 1, desc: "pulls the dark out of a grump: it weakens, you mend",
      fn: function (game, c, L) {
        var best = null, bd = 4 + L;
        grumpsNear(game, c, 4 + L, function (g) { var d = SB.dist(g.x, g.z, c.x, c.z); if (d < bd) { bd = d; best = g; } });
        if (!best) return { ok: false, msg: "no grump close enough" };
        best.chem.health = Math.max(0.05, best.chem.health - (best.boss ? 0.04 : 0.12) * L); SB.Chem.apply(best.chem, { fear: 0.2 });
        c.chem.health = Math.min(1, c.chem.health + 0.08 * L); U.setLast(c);
        PW.stun(game, best, 0.5);
        return { n: 1, msg: "🌒 the dark runs out of it and you feel better" };
      } },
    { id: "coat", icon: "🌟", name: "glow coat", cd: 90, late: 1, desc: "a coat of light: soaks bites, singes grumps that touch it, and dries your fur",
      fn: function (game, c, L) { m2(c).shield = 1 + L; PW.buff(c, "shield", 120, game); PW.buff(c, "glowcloak", 20 + 10 * L, game); return { n: 1, msg: "🌟 a coat of light: the next " + (1 + L) + " bites slide off, and grumps won't like touching you" }; } },
    { id: "whirl", icon: "🌪", name: "whirl", cd: 50, late: 1, desc: "spins every grump close by away from you",
      fn: function (game, c, L) { var n = grumpsNear(game, c, 4, function (g) { if (!g.boss) U.shove(game, g, c.x, c.z, 2 + L); PW.stun(game, g, g.boss ? 0.5 : 1); }); return { n: n, msg: n ? "🌪 " + n + " grump" + (n > 1 ? "s go" : " goes") + " spinning" : "🌪 you spin. nothing was close" }; } },
    { id: "rally", icon: "🚩", name: "rally", cd: 120, late: 1, desc: "the tribe takes heart and comes to you. you hit harder for a while",
      fn: function (game, c, L) {
        var n = 0;
        near(game, c.x, c.z, 10 + 2 * L, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep) { SB.Chem.apply(o.chem, { fear: -0.6, adrenaline: 0.3, reward: 0.1 }); if (n < 2 + 2 * L && SB.Creature.sendTo) SB.Creature.sendTo(o, c.x, c.z, game, 14); n++; } });
        PW.buff(c, "rallied", 30 * L, game);
        return { n: n, msg: "🚩 rally! " + (n ? n + " smol" + (n > 1 ? "s take" : " takes") + " heart" : "nobody near, but you feel braver") };
      } }
  ];
  PW.WORDS2.forEach(function (w) { w.buy = 1; PW.WORD[w.id] = w; });
  PW.whyNotWord = function (game, id) {
    var w = PW.WORD[id];
    if (!w || !w.buy) return "no such word";
    if (PW.wordLevel(game, id) >= 3) return "you know all of it";
    if (w.late && !sandbox(game) && !(SB.Bosses && SB.Bosses.beaten && SB.Bosses.beaten(game) >= 1)) return "a later word: a captain has to fall first";
    if (PW.points(game) < 1) return "it takes an ember to spend";
    return "";
  };
  PW.learnWord = function (game, id) {
    var why = PW.whyNotWord(game, id), s = st(game), w = PW.WORD[id];
    if (why) return fail(why);
    s.words[id] = (s.words[id] || 0) + 1; s.spent += 1;
    emit("wordLearned", { id: id, level: s.words[id], bought: true });
    return ok("🗣 the ember burns down to a word: “" + w.name + "” (level " + s.words[id] + " of 3). " + w.desc);
  };

  /* ---------------- great lights: big miracles a fallen captain unlocks, with a long charge ---------------- */
  PW.GREAT = [
    { id: "daybreak", icon: "🌅", name: "daybreak", need: 1, cost: 20, desc: "the night ends now, and every grump goes home" },
    { id: "mending", icon: "💞", name: "the great mending", need: 2, cost: 25, desc: "every smol on the island is healed, and every sickness eased" },
    { id: "hush", icon: "🕊", name: "the long hush", need: 3, cost: 30, desc: "no grump leaves its cave for a whole day" }
  ];
  PW.GREAT_BY = {}; PW.GREAT.forEach(function (g) { PW.GREAT_BY[g.id] = g; });
  PW.CHARGE = 90;
  function beaten(game) { return sandbox(game) ? 3 : SB.Bosses && SB.Bosses.beaten ? SB.Bosses.beaten(game) : 0; }
  PW.setTime = function (game, name) {
    var fr = { dawn: 0.27, noon: 0.5, dusk: 0.74, night: 0.9 }[name];
    if (fr == null) return false;
    var cu = (game.time % DAY) / DAY, adv = ((fr - cu + 1) % 1) * DAY;
    game.time += adv; if (game.world && game.world.time != null) game.world.time = game.time;
    T2.y = null;
    return true;
  };
  PW.great = function (game, id) {
    var g = PW.GREAT_BY[id], s = s2(game);
    if (!g) return fail("no such light");
    if (PW.locked(game)) return fail(PW.locked(game));
    if (beaten(game) < g.need) return fail(g.name + " wakes when " + g.need + " captain" + (g.need > 1 ? "s have" : " has") + " fallen");
    if (PW.cdLeft(game, "g:" + id) > 0) return fail(g.name + " rests until tomorrow");
    if (!s.charge || s.charge.id !== id) {
      if (!spend(game, SB.Game.miracleCost ? SB.Game.miracleCost(game, g.cost) : g.cost)) return fail("not enough sparks ✨ (" + g.cost + " needed)");
      s.charge = { id: id, at: Math.round(game.time + PW.CHARGE) };
      return ok(g.icon + " " + g.name + " is gathering. it takes a while: come back and let it go", { charging: true });
    }
    if (game.time < s.charge.at) return fail(g.name + " is still gathering: " + Math.ceil(s.charge.at - game.time) + "s");
    s.charge = null; s.cd["g:" + id] = Math.round(game.time + DAY);
    var n = 0;
    if (id === "daybreak") { if (game.world.night) PW.setTime(game, "dawn"); game.creatures.forEach(function (c) { if (c.species === "grump" && c.alive && !c.boss) { U.sendHome(c); n++; } }); }
    else if (id === "mending") smols(game).forEach(function (c) { SB.Chem.apply(c.chem, { sick: -0.8, pain: -0.8, toxin: -0.6, antigen: -0.6, health: 0.6 }); U.easeIll(game, c, 1); if (c.pw && c.pw.parts) for (var k in c.pw.parts) c.pw.parts[k] = Math.max(c.pw.parts[k], 0.6); n++; });
    else { s.quiet = Math.round(game.time + DAY); n = 1; }
    U.bump(); snd("achievement", 0.8);
    if (SB.Game.usedMiracle) SB.Game.usedMiracle(game, "great");
    emit("great", { id: id, n: n });
    note(game, g.icon + " " + g.name + ": " + g.desc + ".");
    return ok(g.icon + " " + g.name + "! " + g.desc, { n: n });
  };

  /* ---------------- star rites: a thinker spends crystals to call something ---------------- */
  PW.RITES = [
    { id: "rain", icon: "🌧", name: "the rain rite", cost: 1, desc: "calls rain", go: function (game) { return setWeather(game, "rain"); } },
    { id: "clear", icon: "☀️", name: "the sun rite", cost: 1, desc: "clears the sky", go: function (game) { return setWeather(game, "clear"); } },
    { id: "stars", icon: "🌠", name: "the star rite", cost: 2, desc: "a falling star: 12 sparks", go: function (game) { SB.Game.addSparks(game, 12); return true; } },
    { id: "guest", icon: "🧳", name: "the guest rite", cost: 2, desc: "a stranger finds the island soon", go: function (game) { game.strangerT = 5; return true; } },
    { id: "quiet", icon: "🕯", name: "the quiet rite", cost: 3, desc: "a wide ward round the nest until morning", go: function (game) { var h = nest(game), s = st(game); if (!h) return false; s.wards.push({ x: U.r1(h.x), z: U.r1(h.z), until: Math.round(game.time + 600), r: 14 }); while (s.wards.length > PW.WARD_MAX + 1) s.wards.shift(); return true; } }
  ];
  PW.RITE = {}; PW.RITES.forEach(function (r) { PW.RITE[r.id] = r; });
  PW.rite = function (game, c, id) {
    var r = PW.RITE[id];
    if (!r || !c) return fail("no such rite");
    if (c.tier < 5 && !sandbox(game)) return fail("a star rite takes a thinker");
    if (PW.cdLeft(game, "r:" + id) > 0) return fail("that rite was done today");
    if (Sv().count(c, "crystal", true) < r.cost) return fail("it takes " + r.cost + " thought crystal" + (r.cost > 1 ? "s" : ""));
    if (!r.go(game, c)) return fail("the stars don't answer");
    Sv().take(c, "crystal", r.cost);
    st(game).cd["r:" + id] = Math.round(game.time + DAY);
    emit("rite", { c: c, id: id });
    return ok(r.icon + " " + c.name + " lays out the crystals. " + r.name + ": " + r.desc);
  };

  /* ---------------- helpers: clay-and-crystal things a thinker makes, and sprites of the great glowshroom ---------------- */
  PW.HELPERS = {
    tidy: { icon: "🧹", name: "clay tidier", cost: { clay: 3, crystal: 1 }, desc: "gathers what lies about into a pile at its feet" },
    watch: { icon: "🗿", name: "clay watcher", cost: { clay: 3, crystal: 1, stone: 2 }, desc: "turns back a grump that comes near" },
    sprite: { icon: "🧚", name: "shroom sprite", cost: { glowcap: 2, herb: 1 }, desc: "regrows picked bushes around it. made under the great glowshroom" }
  };
  PW.helpers = function (game) { var s = s2(game), w = game.world; s.helpers = s.helpers.filter(function (h) { return w.structures.some(function (b) { return b.id === h.id; }); }); return s.helpers; };
  // a thinker's head size caps its clay helpers; the shroom keeps two sprites
  PW.helperCap = function (game, c, kind) {
    if (kind === "sprite") return 2;
    var g = c && c.genome && c.genome.genes ? c.genome.genes.head || 0 : 0;
    if (c && c.tier >= 5) return 1 + Math.round(g * 3);
    return s2(game).start.mem === "helper" || sandbox(game) ? 1 : 0;
  };
  PW.makeHelper = function (game, c, kind) {
    var d = PW.HELPERS[kind], k, n;
    if (!d) return fail("no such helper");
    n = PW.helpers(game).filter(function (h) { return (h.kind === "sprite") === (kind === "sprite"); }).length;
    if (kind === "sprite" && !shroomNear(game, c, 8)) return fail("a sprite is grown under the great glowshroom");
    if (kind !== "sprite" && !PW.helperCap(game, c, kind)) return fail("clay helpers take a thinker to make");
    if (n >= PW.helperCap(game, c, kind)) return fail(kind === "sprite" ? "the shroom keeps two sprites" : c.name + "'s head can hold " + PW.helperCap(game, c, kind) + " helper" + (PW.helperCap(game, c, kind) > 1 ? "s" : "") + ". a bigger head holds more");
    for (k in d.cost) if (Sv().count(c, k, true) < d.cost[k]) return fail("it needs " + PW.costText({ in: d.cost }));
    for (k in d.cost) Sv().take(c, k, d.cost[k]);
    var b = struct(game, "clayhelper", c.x + Math.sin(c.facing || 0) * 1.2, c.z + Math.cos(c.facing || 0) * 1.2, { pw2: "helper", kind: kind });
    s2(game).helpers.push({ id: b.id, kind: kind, by: c.name, t: 0 });
    emit("helperMade", { c: c, kind: kind, st: b });
    return ok(d.icon + " a " + d.name + " stands up. it " + d.desc);
  };
  function helperStruct(game, h) { var L = game.world.structures; for (var i = 0; i < L.length; i++) if (L[i].id === h.id) return L[i]; return null; }
  PW.callHelper = function (game, c, i) { var h = PW.helpers(game)[i], b = h ? helperStruct(game, h) : null; if (!b) return fail("no such helper"); b.x = U.r1(c.x + 1); b.z = U.r1(c.z); if (W().markNode) W().markNode(game.world, b); return ok(PW.HELPERS[h.kind].icon + " the " + PW.HELPERS[h.kind].name + " shuffles over and stands by you"); };
  PW.dismissHelper = function (game, i) { var h = PW.helpers(game)[i], b = h ? helperStruct(game, h) : null; if (!b) return fail("no such helper"); W().removeStructure(game.world, b); s2(game).helpers.splice(i, 1); return ok("it sits down and is clay again"); };
  function helperTick(game) {
    PW.helpers(game).forEach(function (h) {
      var b = helperStruct(game, h), n = 0; if (!b) return;
      if (h.kind === "tidy") {
        var items = game.world.items;
        for (var i = 0; i < items.length && n < 2; i++) {
          var o = items[i], d = SB.dist(o.x, o.z, b.x, b.z);
          if (d < 1.6 || d > 7 || o.heldBy || o.gone || o.noun === "egg" || o.noun === "critter" || (o.data && o.data.pod) || !(K()[o.kind] && (K()[o.kind].mat || K()[o.kind].food))) continue;
          o.x = b.x + ((hashKey("t" + o.id) % 100) / 100 - 0.5) * 1.6; o.z = b.z + ((hashKey("u" + o.id) % 100) / 100 - 0.5) * 1.6; o.y = U.ground(game, o.x, o.z); n++;
        }
      } else if (h.kind === "watch") {
        if ((h.t || 0) > game.time) return;
        near(game, b.x, b.z, 7, function (g) { if (g.species === "grump" && g.alive && !g.boss) { U.sendHome(g); n++; } });
        if (n) h.t = Math.round(game.time + 20);
      } else {
        if ((h.t || 0) > game.time) return;
        var nd = (W().nodesNear ? W().nodesNear(game.world, b.x, b.z, 6, function (o) { return o.state === "picked" || o.state === "stump"; }) || [] : [])[0];
        if (nd) { nd.state = "ok"; nd.left = null; nd.hp = null; nd.regrowT = 0; nd.grow = null; if (W().markNode) W().markNode(game.world, nd); h.t = Math.round(game.time + 30); n = 1; }
      }
      if (n) { h.n = (h.n || 0) + n; emit("helperWork", { kind: h.kind, n: n }); }
    });
  }

  /* ---------------- things you use: scraps, stones, jars, berries, parts ---------------- */
  function scrap(id) { return function (game, c) { var S = inBody(c); return U.CAST[id](game, { c: c, x: c.x, z: c.z, body: !!S, S: S, k: 1 }); }; }
  function upgrade(key, max, msg) { return function (game, c) { var p = m2(c); if ((p.up[key] || 0) >= max) return fail("that is as far as it goes"); p.up[key] = (p.up[key] || 0) + 1; U.bump(); emit("upgrade", { c: c, key: key, n: p.up[key] }); return ok(msg + " (" + p.up[key] + " of " + max + ")"); }; }
  PW.blink = function (game, c, steps) {
    var d = hop(game, c, steps || 6);
    if (!d) return fail("no room to blink");
    if (PW.has(c, "blinked", game)) PW.hurt(game, c, 0.1, "blink"); // twice in a hurry stings
    PW.buff(c, "blinked", 20, game);
    U.burst(game, "sparkle", c.x, (c.y || 0) + 0.8, c.z, 12);
    emit("blink", { c: c, d: d });
    return ok("✨ blink! " + Math.round(d) + " steps");
  };
  PW.douse = function (game, x, z, r) {
    var n = 0, L = game.world.burning || [];
    for (var i = L.length - 1; i >= 0; i--) { var nd = L[i]; if (nd.state === "burning" && SB.dist(nd.x, nd.z, x, z) <= r) { nd.state = "ok"; nd.noun = "plant"; nd.burnT = 0; if (W().markNode) W().markNode(game.world, nd); L.splice(i, 1); n++; } }
    near(game, x, z, r, function (c) { if (c.pw && c.pw.buffs && c.pw.buffs.alight) { delete c.pw.buffs.alight; n++; } });
    return n;
  };
  PW.USE2 = {
    scrapheal: { label: "burn the ember scrap (heal)", go: scrap("heal") },
    scrapburst: { label: "burn the ember scrap (burst)", go: scrap("burst") },
    scrapward: { label: "burn the ember scrap (ward)", go: scrap("ward") },
    scrapgrow: { label: "burn the ember scrap (grow)", go: scrap("grow") },
    homeember: { label: "hold the home ember", go: scrap("recall") },
    blinkstone: { label: "squeeze the blink stone", go: function (game, c) { return PW.blink(game, c, 6); } },
    raintotem: { label: "plant the rain totem", go: function (game) { setWeather(game, "rain"); return ok("🌧 the totem hums and the clouds come"); } },
    dousepod: { label: "throw the douse pod", go: function (game, c) { var n = PW.douse(game, c.x, c.z, 7); return n ? ok("💦 pop! " + n + " fire" + (n > 1 ? "s" : "") + " out") : fail("nothing is burning here"); } },
    stormjar: { label: "let the storm out", go: function (game, c) {
      var n = grumpsNear(game, c, 12, function (g) { PW.stun(game, g, g.boss ? 2 : 6); if (!g.boss) { SB.Chem.apply(g.chem, { fear: 0.8 }); U.sendHome(g); } });
      if (!n) return fail("keep it for a raid: no grump is near");
      if (SB.Render && SB.Render.flash && live(game)) SB.Render.flash(0.7, true);
      return ok("⛈ the caged storm bursts out: " + n + " grump" + (n > 1 ? "s" : "") + " struck silly and sent running", { n: n });
    } },
    jointtea: { label: "drink the joint tea", go: function (game, c) { PW.buff(c, "limber", 600, game); return ok("🍵 your knees stop creaking for a good while"); } },
    youthberry: { label: "eat the youth berry", go: function (game, c) { if (c.age < 300) return fail("you are young enough"); c.age = Math.max(210, c.age - 700); if (SB.Creature.stageFor) c.stage = SB.Creature.stageFor(c.age, c); emit("younger", { c: c }); return ok("🫐 a season falls off " + (inBody(c) ? "you" : c.name)); } },
    glowseed: { label: "swallow the glow seed", go: upgrade("pep", 3, "🌟 your inner light grows: every power costs a tenth less pep") },
    luckstone: { label: "rub the luck stone", go: upgrade("luck", 3, "🍀 lucky: picking, chopping, mining and fishing turn up more") },
    skillstone: { label: "read the skill stone", go: function (game, c) {
      var B = SB.Body, low = null, ll = 1e9; if (!B) return fail("nothing to learn");
      B.SKILLS.forEach(function (s) { var l = B.level(c, s.id); if (l < ll && l < B.MAX) { ll = l; low = s; } });
      if (!low) return fail("you know it all");
      var sk = B.of(c).sk[low.id] || (B.of(c).sk[low.id] = { l: 0, x: 0 }); sk.l++; sk.x = 0; U.bump();
      emit("skillUp", { c: c, id: low.id, level: sk.l, shared: true });
      return ok("📜 " + low.label + " is level " + sk.l + " now");
    } },
    heartbloom: { label: "eat the heart bloom", go: function (game, c) { if (beaten(game) < 3) return fail("it won't open until the three captains have fallen"); return upgrade("heart", 2, "💗 your heart grows past what a heart-fruit can do: 4% off every hurt")(game, c); } },
    wishlamp: { label: "rub the wish lamp", go: function (game) { var s = s2(game); s.wishes = (s.wishes || 0) + 3; emit("lamp", { wishes: s.wishes }); return ok("🪔 three wishes: the Lantern's next three powers from the sky cost no sparks"); } },
    arkvial: { label: "open the ark vial", go: function (game, c) { var b = PW.bodyNear(game, c.x, c.z, 6); if (!b) return fail("keep it for the worst day: nobody lies here"); PW.raise(game, b); note(game, "🧪 the ark vial brought " + b.name + " back."); return ok("🧪 a breath of ark light, and " + b.name + " opens its eyes"); } }
  };
  Object.keys(PW.WEAR).forEach(function (k) { PW.USE2[k] = { label: "put on the " + PW.WEAR[k].label, go: function (game, c) { var r = PW.putOn(game, c, k); r.kept = r.ok; return r; } }; });
  Object.keys(PW.FITS).forEach(function (k) { PW.USE2[k] = { label: "fit the " + PW.FITS[k].label, go: function (game, c) { var r = PW.fitPart(game, c, k); r.kept = r.ok; return r; } }; });
  PW.use2 = function (game, c, kind) {
    var d = PW.USE2[kind], r = d.go(game, c);
    if (!r || !r.ok) return r || fail("nothing happens");
    if (!r.kept) Sv().take(c, kind, 1); // (putting a thing on takes it out of the bag itself)
    if (PW.SWEET[kind]) treat(game, c);
    emit("used2", { c: c, kind: kind });
    return r;
  };
  PW.ITEMS2 = {
    tablet: { label: "carved tablet", emoji: "🪧", color: 0xb0a890, desc: "an imbue, carved to keep. put it on a thing from the gear page." },
    arkshard: { label: "ark shard", emoji: "🔷", color: 0x6fd0ff, desc: "a piece of the ark, still warm. a healer can make a part of it." },
    arkvial: { label: "ark vial", emoji: "🧪", color: 0x9ff0e0, desc: "one breath of the ark's light. it brings back a smol who has not been laid to rest." },
    blinkstone: { label: "blink stone", emoji: "💠", color: 0x9fd8ff, desc: "squeeze it and you are six steps further on. once." },
    raintotem: { label: "rain totem", emoji: "🪆", color: 0x7aa0c8, desc: "plant it and the rain comes." },
    dousepod: { label: "douse pod", emoji: "💦", color: 0x8fd0e8, desc: "a clay pod of wet leaves. throw it and the fires near you go out." },
    stormjar: { label: "storm jar", emoji: "⛈", color: 0x6a7a9a, desc: "a caged storm cloud. let it out on a raid." },
    lightstaff: { label: "light staff", emoji: "🪄", color: 0xffe9a0, desc: "carry it: your hits spend a little pep and strike with light, half again as hard." },
    jointtea: { label: "joint tea", emoji: "🍵", color: 0xc8b070, desc: "an elder's creaky knees go quiet for a good while." },
    youthberry: { label: "youth berry", emoji: "🫐", color: 0x7a6fe0, desc: "a season of age falls away." },
    glowseed: { label: "glow seed", emoji: "🌟", color: 0xfff0a0, desc: "your inner light grows for good: powers cost less pep." },
    luckstone: { label: "luck stone", emoji: "🍀", color: 0x7fd08a, desc: "luck for good: more from picking, chopping, mining and fishing." },
    skillstone: { label: "skill stone", emoji: "📜", color: 0xd8c8a0, desc: "one level in the skill you know least." },
    heartbloom: { label: "heart bloom", emoji: "🌺", color: 0xff8fa8, desc: "a late flower. it opens when the captains have fallen, and grows a heart past its limit." },
    wishlamp: { label: "wish lamp", emoji: "🪔", color: 0xf0c060, desc: "rub it: three free miracles." },
    scrapheal: { label: "ember scrap: heal", emoji: "📃", color: 0xa0e0a0, desc: "a scrap of the Lantern's memory. burn it for one heal." },
    scrapburst: { label: "ember scrap: burst", emoji: "📃", color: 0xf0d080, desc: "burn it for one burst of light." },
    scrapward: { label: "ember scrap: ward", emoji: "📃", color: 0xf0e0a0, desc: "burn it for one ward." },
    scrapgrow: { label: "ember scrap: grow", emoji: "📃", color: 0x90d090, desc: "burn it and things grow back." },
    homeember: { label: "home ember", emoji: "🏮", color: 0xff9a50, desc: "hold it and the light carries you home. once." }
  };
  PW.RECIPES2 = [
    { id: "blinkstone", in: { crystal: 1, flint: 1 }, group: "magic" }, { id: "raintotem", in: { stick: 2, clay: 1, leaves: 2 }, group: "magic" },
    { id: "dousepod", in: { clay: 1, leaves: 2 }, group: "magic" }, { id: "stormjar", in: { pot: 1, crystal: 2 }, group: "magic" },
    { id: "lightstaff", in: { stick: 2, crystal: 1, glowcap: 1 }, group: "magic" }, { id: "jointtea", in: { herb: 1, honey: 1 }, at: "fire", group: "magic" }
  ];
  Object.keys(PW.WEAR).forEach(function (k) { PW.RECIPES2.push({ id: k, in: PW.WEAR[k].cost, group: "wear" }); });
  Object.keys(PW.FITS).forEach(function (k) { PW.RECIPES2.push({ id: k, in: PW.FITS[k].cost, group: "part" }); });
  PW.RECIPE2 = {}; PW.RECIPES2.forEach(function (r) { PW.RECIPE2[r.id] = r; });
  PW.whyNotMake2 = function (game, c, id) {
    var r = PW.RECIPE2[id];
    if (!r || !K()[id]) return "no such thing";
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    for (var k in r.in) if (Sv().count(c, k, true) < r.in[k]) return "it needs " + PW.costText(r);
    if (r.at === "fire" && !(Sv().nearFire && Sv().nearFire(c, game)) && !has(c, "torch")) return "do this by a fire";
    return "";
  };
  PW.make2 = function (game, c, id) {
    var why = PW.whyNotMake2(game, c, id), r = PW.RECIPE2[id];
    if (why) return fail(why);
    for (var k in r.in) Sv().take(c, k, r.in[k]);
    give(game, c, id, 1);
    if (c.stats) c.stats.crafted = (c.stats.crafted || 0) + 1;
    emit("craft", { c: c, id: "gear", item: { kind: id }, pov: !!inBody(c), remedy: true });
    return ok("made a " + label(id) + ": " + K()[id].desc);
  };

  /* ---------------- coming back: downed, not gone; the call back; a new life at a grave ---------------- */
  PW.bodyNear = function (game, x, z, r) { var best = null, bd = r || 8; (game.bodies || []).forEach(function (b) { if (b.gone2 || b.alive) return; var d = SB.dist(b.x, b.z, x, z); if (d < bd) { bd = d; best = b; } }); return best; };
  // a smol that has just fallen, or lies unburied, gets up again
  PW.raise = function (game, c) {
    if (!c || c.alive || c.species !== "smol") return false;
    var i = (game.bodies || []).indexOf(c); if (i >= 0) game.bodies.splice(i, 1);
    (game.funerals || []).forEach(function (f) { var j = f.ids ? f.ids.indexOf(c.id) : -1; if (j >= 0) f.ids.splice(j, 1); });
    if (game.funerals) game.funerals = game.funerals.filter(function (f) { return !(f.phase === "plan" && f.ids && !f.ids.length); });
    c.alive = true; c.dying = false; c.gone = false; c.corpse = false; c.fade = 0; c.asleep = true; c.body = null; c.drownT = 0;
    var f = game.family && game.family[c.id]; if (f) { f.died = null; f.cause = null; }
    if (game.stats && game.stats.deaths > 0) game.stats.deaths--;
    var ch = c.chem; ch.health = 0.35; ch.pain = 0.2; ch.hunger = Math.min(ch.hunger, 0.5); ch.cold = Math.min(ch.cold || 0, 0.3); ch.hot = Math.min(ch.hot || 0, 0.3); ch.sick = Math.min(ch.sick || 0, 0.3); ch.toxin = 0; ch.fear = 0; ch.sleepy = 1;
    if (game.creatures.indexOf(c) < 0) game.creatures.push(c);
    game.creatures.forEach(function (o) { // nobody is widowed or in mourning after all
      if (o.widowed === c.id) { o.widowed = null; o.widowT = 0; o.partner = c.id; c.partner = o.id; }
      if (o.grief && o.grief.id === c.id) o.grief = null;
    });
    if (W().groundY) c.y = W().groundY(game.world, c.x, c.z);
    emit("raised", { c: c });
    return true;
  };
  function downed(game, c, cause) {
    var se = set(game), p = m2(c), pals = 0, d = day(game);
    if (cause === "old" || c.stranger || U.story(game)) return false;
    if (!se.noDeath) {
      if (se.oneLife || cause !== "hurt" || p.downDay === d) return false;
      near(game, c.x, c.z, 14, function (o) { if (o !== c && o.species === "smol" && o.alive) pals++; });
      if (!pals) return false;
    }
    if (!PW.raise(game, c)) return false;
    p.downDay = d; p.downs = (p.downs || 0) + 1;
    PW.hurtPart(game, c, PW.OUTER[(p.downs + c.id) % PW.OUTER.length], 0.5);
    var h = PW.homeSpot(game, c);
    if (h) { c.x = h.x; c.z = h.z; c.px = c.x; c.pz = c.z; }
    note(game, "💤 " + c.name + " went down, and was carried home. it is hurt and needs a day's rest" + (se.noDeath ? "." : ": it won't get up from a second fall today."));
    emit("downed", { c: c, cause: cause });
    return true;
  }
  // a new life at a grave: the same smol, with something a little odd about it
  PW.newLife = function (game, x, z) {
    var g = null, bd = 8, G = SB.Genome;
    game.world.structures.forEach(function (b) { if (b.kind !== "grave" || !b.data || b.data.id == null || b.data.risen) return; var d = SB.dist(b.x, b.z, x, z); if (d < bd) { bd = d; g = b; } });
    var f = g && game.family ? game.family[g.data.id] : null;
    if (!g) return fail("that is done at a grave: stand by one");
    if (!f || !f.gx || !G || !G.unsnap) return fail("the Lantern can't remember " + (g.data.name || "that smol") + " well enough");
    var genes; try { genes = G.unsnap(f.gx); } catch (e) { genes = null; }
    if (!genes || !G.random) return fail("the Lantern can't remember " + f.name + " well enough");
    var genome = G.random(dice(game, "back:" + f.id), { species: "smol" }); // what the family tree kept of it, on a fresh frame
    for (var gk in genes) if (genome.genes[gk] != null) genome.genes[gk] = genes[gk];
    var c = SB.Game.spawnSmol(game, { genome: genome, name: f.name, x: g.x + 0.8, z: g.z + 0.4, age: 400, gen: f.gen, parents: f.parents, how: "returned" });
    g.data.risen = 1;
    var p = m2(c); p.back = 1; p.scars = 1; U.bump();
    note(game, "🕯 " + c.name + " walked back out of the dark. it is a little see-through now, and the glooms can't touch it.");
    emit("newLife", { c: c, grave: g });
    return ok("🕯 " + c.name + " is back, a little see-through", { c: c });
  };

  /* ---------------- the spark shop ---------------- */
  PW.TWIN = { stick: "fiber", fiber: "stick", log: "plank", plank: "log", stone: "flint", flint: "stone", ore: "crystal", crystal: "ore", berry: "apple", apple: "berry", herb: "glowcap", glowcap: "herb", fur: "leaves", leaves: "fur", clay: "coal", coal: "clay", fish: "clam", clam: "fish" };
  function item(kind, cost, more) { var o = { id: kind, item: kind, cost: cost, smol: 1 }; for (var k in more || {}) o[k] = more[k]; return o; }
  PW.SHOP = [
    item("scrapheal", 4), item("scrapburst", 4), item("scrapward", 4), item("scrapgrow", 4), item("homeember", 5), item("blinkstone", 5),
    item("glowseed", 15), item("luckstone", 15), item("skillstone", 15), item("youthberry", 25), item("heartbloom", 30),
    { id: "wordbook", icon: "📖", name: "the whole word book", cost: 40, smol: 1, desc: "one smol learns every word there is, at once",
      go: function (game, c) { var n = 0; for (var w in SB.LEXICON || {}) { if (!(c.vocab[w] >= 1)) n++; c.vocab[w] = 1; } if (!n) return fail(c.name + " knows every word already"); return ok("📖 " + c.name + " blinks, and knows " + n + " new words"); } },
    { id: "relook", icon: "🎨", name: "a new coat", cost: 6, smol: 1, desc: "re-roll one smol's colours",
      go: function (game, c) { var p = m2(c), r = dice(game, "look:" + c.id + ":" + (p.looks = (p.looks || 0) + 1)); p.hue = Math.floor(r() * 360); applyHue(c); return ok("🎨 " + c.name + " shakes, and is a new colour"); } },
    { id: "sparktree", icon: "🌳", name: "a spark tree", cost: 30, smol: 1, desc: "planted where the smol stands. it drops two sparks every morning. one an island",
      go: function (game, c) { var s = s2(game); if (s.tree2) return fail("the island has its spark tree"); var b = struct(game, "sparktree", c.x + 1.2, c.z, { pw2: "sparktree" }); s.tree2 = { id: b.id, x: b.x, z: b.z }; return ok("🌳 a spark tree takes root. two sparks every morning"); } },
    { id: "baby", icon: "🥚", name: "a sky-blessed egg", cost: 25, smol: 1, desc: "this smol and the grown smol nearest it are blessed with an egg",
      go: function (game, c) {
        var o = null, bd = 12;
        near(game, c.x, c.z, 12, function (x) { if (x !== c && x.species === "smol" && x.alive && x.stage >= 3) { var d = SB.dist(x.x, x.z, c.x, c.z); if (d < bd) { bd = d; o = x; } } });
        if (c.stage < 3) return fail(c.name + " is too young");
        if (!o) return fail("no other grown smol is close enough");
        SB.Game.layEgg(game, c, o, c.x + 0.8, c.z + 0.3);
        return ok("🥚 an egg, from " + c.name + " and " + o.name);
      } },
    { id: "egg", icon: "🪺", name: "call an egg", cost: 15, desc: "an egg from far away lands by the nest, of the picked smol's kind if you picked one (free on an empty island)",
      go: function (game, c, at) {
        var h = c || at || nest(game), s = s2(game), r = dice(game, "egg:" + (s.eggs = (s.eggs || 0) + 1));
        if (!h || !SB.Genome || !W().add) return fail("nowhere to land it");
        var g = SB.Genome.random(r, { species: "smol" });
        if (c && c.clade != null) g.clade = c.clade; // the picked smol's kind
        var e = W().add(game.world, game, "egg", h.x + 1, h.z + 0.6, { genome: g, parents: [], gen: 1, progress: 0.6 });
        s.lost = 0;
        emit("eggCalled", { obj: e });
        return ok("🪺 an egg drifts down" + (c ? " beside " + c.name : ""));
      } },
    { id: "seedbank", icon: "🌰", name: "the seed bank", cost: 10, desc: "saplings, seeds and a few critters, for an island that has run out",
      go: function (game, c, at) {
        var h = c || at || nest(game); if (!h) return fail("nowhere to put it");
        var n = drop(game, "sapling", 3, h.x + 1, h.z) + drop(game, "seed", 4, h.x, h.z + 1) + drop(game, "herb", 2, h.x - 1, h.z);
        ["hopper", "butterfly", "beetle"].forEach(function (k, i) { if (K()[k] && W().add) { W().add(game.world, game, k, h.x + 2 + i, h.z + 2, {}); n++; } });
        return n ? ok("🌰 the bank opens: saplings, seeds, healroot and a few critters") : fail("nothing to give");
      } },
    { id: "dust", icon: "✨", name: "builder's dust", cost: 12, desc: "the nearest half-built thing is finished at once",
      go: function (game, c, at) {
        var h = c || at, best = null, bd = 14; if (!h) return fail("pick a smol or a place");
        game.world.structures.forEach(function (b) { if (b.done || !SB.STRUCTS[b.kind]) return; var d = SB.dist(b.x, b.z, h.x, h.z); if (d < bd) { bd = d; best = b; } });
        if (!best) return fail("nothing half-built is near");
        best.need = {}; if (SB.Ideas && SB.Ideas.complete) SB.Ideas.complete(best, game); else { best.done = true; best.noun = SB.STRUCTS[best.kind].noun; }
        return ok("✨ the " + SB.STRUCTS[best.kind].label + " is finished");
      } },
    { id: "cracker", icon: "🍪", name: "a golden biscuit", cost: 20, smol: 1, desc: "the tame animal nearest this smol gives double, for good",
      go: function (game, c) {
        var A = SB.Animals, best = null, bd = 12; if (!A || !A.all) return fail("no animals here");
        A.all(game).forEach(function (r) { if (r.gold) return; var d = SB.dist(r.x, r.z, c.x, c.z); if (d < bd) { bd = d; best = r; } });
        if (!best) return fail("no tame animal is close enough");
        best.gold = 1; emit("goldAnimal", { rec: best });
        return ok("🍪 " + (best.name || "it") + " shines a little. double from now on");
      } },
    { id: "callback", icon: "🕊", name: "call back from the edge", cost: 15, desc: "a smol who has fallen and not yet been laid to rest opens its eyes",
      go: function (game, c, at) { var h = c || at, b = h ? PW.bodyNear(game, h.x, h.z, 12) : (game.bodies || []).filter(function (x) { return !x.gone2 && !x.alive; })[0]; if (!b) return fail("nobody lies waiting"); PW.raise(game, b); note(game, "🕊 the Lantern pulled " + b.name + " back from the edge."); return ok("🕊 " + b.name + " breathes again"); } },
    { id: "newlife", icon: "🕯", name: "a new life", cost: 40, desc: "at a grave: the smol walks back, a little see-through",
      go: function (game, c, at) { var h = c || at; return h ? PW.newLife(game, h.x, h.z) : fail("stand by a grave"); } },
    { id: "forget", icon: "🫧", name: "let it go", cost: 5, smol: 1, desc: "this smol forgets a lost love and a jealous thought",
      go: function (game, c) { c.widowT = 0; c.widowed = null; c.jealous = null; c.court = null; SB.Chem.apply(c.chem, { lonely: -0.5, punish: -0.5, anger: -0.5 }); emit("forgot", { c: c }); return ok("🫧 " + c.name + " sighs, and looks lighter"); } },
    { id: "chest", icon: "🧰", name: "a pocket of home", cost: 5, smol: 1, desc: "your home chest opens wherever this smol is, for a while",
      go: function (game, c) { if (!(SB.Home && SB.Home.has && SB.Home.has(game, "chest"))) return fail("your home has no chest yet"); PW.buff(c, "chestlink", 180, game); return ok("🧰 your home chest is in reach for a while: the body page"); } }
  ];
  PW.GIFTS.forEach(function (g) { PW.SHOP.push({ id: "gift_" + g.id, icon: g.icon, name: g.name, cost: g.cost, smol: 1, desc: g.desc + " (a lasting gift for one smol)", go: function (game, c) { var p = m2(c); if (p.gift[g.id]) return fail(c.name + " has that"); p.gift[g.id] = 1; U.bump(); return ok(g.icon + " " + c.name + " is a " + g.name + " now"); } }); });
  PW.SHOP_BY = {}; PW.SHOP.forEach(function (o) { PW.SHOP_BY[o.id] = o; });
  PW.price = function (game, id) { var o = PW.SHOP_BY[id], s = s2(game); if (!o) return 0; if (id === "egg" && !smols(game).length) return 0; return sandbox(game) ? 0 : o.cost; };
  PW.buy = function (game, id, c, at) {
    var o = PW.SHOP_BY[id], cost = PW.price(game, id), r;
    if (!o) return fail("no such gift");
    if (PW.locked(game)) return fail(PW.locked(game));
    if (o.smol && !c) return fail("pick a smol first");
    if ((game.sparks || 0) < cost) return fail("not enough sparks ✨ (" + cost + " needed)");
    if (o.item) { if (!K()[o.item]) return fail("no such thing"); give(game, c, o.item, 1); r = ok(K()[o.item].emoji + " " + label(o.item) + ": " + K()[o.item].desc); }
    else r = o.go(game, c, at);
    if (!r.ok) return r;
    spend(game, cost);
    s2(game).shop[id] = (s2(game).shop[id] || 0) + 1;
    emit("bought", { id: id, c: c || null });
    return r;
  };
  // the home chest from anywhere (a pocket of home, or free at a blessing stone)
  PW.chestOpen = function (game, c) { return !!(SB.Home && SB.Home.has && SB.Home.has(game, "chest") && (PW.has(c, "chestlink", game) || stoneNear(game, c))); };
  PW.chestTake = function (game, c, i) {
    if (!PW.chestOpen(game, c)) return fail("the chest is at home");
    var ch = SB.Home.chest(game), sl = ch[i]; if (!sl) return fail("nothing there");
    var left = Sv().add(c, sl.k, sl.n, sl.w);
    if (left === sl.n) return fail("your bag is full");
    if (left > 0) sl.n = left; else ch[i] = null;
    return ok("out of the chest: " + label(sl.k));
  };
  PW.chestPut = function (game, c) {
    if (!PW.chestOpen(game, c)) return fail("the chest is at home");
    var v = Sv().inv(c), sl = Sv().held(c); if (!sl) return fail("hold what you want to put away");
    var left = SB.Home.put(game, sl.k, sl.n, sl.w);
    if (left === sl.n) return fail("the chest is full");
    if (left > 0) sl.n = left; else v.s[v.sel] = null;
    return ok("into the chest: " + label(sl.k));
  };
  PW.twin = function (game, c) {
    var sl = Sv().held(c), t = sl ? PW.TWIN[sl.k] : null, free = shroomNear(game, c);
    if (!t || !K()[t]) return fail("hold something that has a twin: a stick, a stone, a berry...");
    if (!free && !spend(game, 2)) return fail("away from the great glowshroom's pool a twin costs 2 sparks ✨");
    var k = sl.k; Sv().take(c, k, 1); give(game, c, t, 1);
    emit("twin", { c: c, from: k, to: t });
    return ok("🫧 the " + label(k) + " sinks, and a " + label(t) + " comes up" + (free ? "" : " (2 ✨)"));
  };
  // research: hand in enough of a thing and the Lantern remembers it, and can make more for sparks
  PW.researchNeed = function (kind) { var d = K()[kind]; return !d ? 0 : d.tool ? 1 : d.food ? 5 : 15; };
  PW.researched = function (game, kind) { return (s2(game).research[kind] || 0) >= PW.researchNeed(kind) && PW.researchNeed(kind) > 0; };
  PW.research = function (game, c) {
    var sl = Sv().held(c), s = s2(game); if (!sl || !K()[sl.k]) return fail("hold what you want the Lantern to remember");
    var k = sl.k, need = PW.researchNeed(k), had = s.research[k] || 0;
    if (had >= need) return fail("the Lantern remembers " + label(k) + " already");
    var n = Math.min(need - had, Sv().count(c, k, true));
    Sv().take(c, k, n); s.research[k] = had + n;
    emit("research", { kind: k, n: s.research[k], done: s.research[k] >= need });
    return ok(s.research[k] >= need ? "🔬 the Lantern remembers " + label(k) + " now, and can make more for sparks" : "🔬 " + s.research[k] + " of " + need + " " + label(k) + " handed in");
  };
  PW.conjure = function (game, c, kind) {
    if (!PW.researched(game, kind)) return fail("the Lantern doesn't remember that yet");
    var cost = K()[kind].tool ? 6 : 2;
    if (!spend(game, cost)) return fail("not enough sparks ✨ (" + cost + " needed)");
    give(game, c, kind, 1);
    return ok(K()[kind].emoji + " one " + label(kind) + ", from memory");
  };
  // a titled smol calls in a favour, once a day
  PW.favour = function (game, c, kind) {
    if (!c || !c.title) return fail("favours are for a smol with a title");
    if (PW.cdLeft(game, "fav") > 0) return fail("the tribe has done its favour for today");
    var n = 0;
    if (kind === "food") { n = drop(game, K().cooked ? "cooked" : "berry", 3, c.x + 0.8, c.z) + drop(game, "berry", 3, c.x - 0.6, c.z + 0.5); }
    else near(game, c.x, c.z, 20, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep && n < 4 && SB.Creature.sendTo && SB.Creature.sendTo(o, c.x, c.z, game, 16)) n++; });
    if (!n) return fail("nobody is near enough to oblige");
    st(game).cd.fav = Math.round(game.time + DAY);
    emit("favour", { c: c, kind: kind, n: n });
    return ok("🎖 for " + c.name + " " + c.title + ": " + (kind === "food" ? "the tribe sends a basket" : n + " smol" + (n > 1 ? "s come" : " comes") + " to help"));
  };

  /* ---------------- the dims, the big glow ---------------- */
  PW.DIMG = [
    { id: "eyes", icon: "🌙", name: "night eyes", desc: "the night is nearly bright to you. the sun burns you twice as fast" },
    { id: "kin", icon: "🐾", name: "grump-kin", desc: "at night grumps take you for one of theirs. by day their bites hurt more" },
    { id: "step", icon: "💨", name: "shadow step", desc: "at night you can blink for nothing. by day your pep comes back slowly" }
  ];
  PW.DIMG_BY = {}; PW.DIMG.forEach(function (g) { PW.DIMG_BY[g.id] = g; });
  PW.dimGift = function (game, c, id) {
    var p = m2(c);
    if (!PW.DIMG_BY[id]) return fail("no such gift");
    if (!(p.ill && p.ill.id === "dims")) return fail("only the dims brings these");
    if (p.dimGift) return fail("the dims gave you " + PW.DIMG_BY[p.dimGift].name + " already");
    p.dimGift = id; U.bump();
    emit("dimGift", { c: c, id: id });
    return ok(PW.DIMG_BY[id].icon + " " + PW.DIMG_BY[id].name + ": " + PW.DIMG_BY[id].desc + ". it goes when the dims does");
  };
  PW.shadowStep = function (game, c) {
    var p = c.pw || {};
    if (p.dimGift !== "step" || !game.world.night) return fail("that is for the dimmed, at night");
    if (PW.cdLeft(game, "sstep") > 0) return fail("in " + Math.ceil(PW.cdLeft(game, "sstep")) + "s");
    var d = hop(game, c, 6); if (!d) return fail("no room");
    st(game).cd.sstep = Math.round(game.time + 30);
    return ok("💨 a step through the shadow");
  };
  PW.RELICS = [
    { id: "fear", icon: "😱", name: "the tooth relic", desc: "in the big glow your roar sends every grump near running home" },
    { id: "pack", icon: "🐾", name: "the paw relic", desc: "in the big glow your roar brings the tribe running" },
    { id: "eye", icon: "👁", name: "the eye relic", desc: "in the big glow your roar shows the nearest hidden thing" }
  ];
  PW.RELIC = {}; PW.RELICS.forEach(function (r) { PW.RELIC[r.id] = r; });
  PW.setRelic = function (game, c, id) { if (!PW.RELIC[id]) return fail("no such relic"); m2(c).relic = id; return ok(PW.RELIC[id].icon + " " + PW.RELIC[id].name + ": " + PW.RELIC[id].desc); };
  // once a night: the glow comes out. fast, strong, never sick, no paws for the bag; you wake worn out
  PW.bigGlow = function (game, c) {
    var S = inBody(c), p = m2(c), d = day(game);
    if (!S) return fail("from inside a body");
    if (!game.world.night) return fail("the glow only comes out at night");
    if (!PW.has(c, "glowing", game) && PW.link(game) < 3) return fail("eat a glowcap after dark first (or raise the Lantern's glow to level 3)");
    if (p.glowDay === d) return fail("once a night");
    p.glowDay = d;
    PW.buff(c, "bigglow", 90, game);
    emit("bigGlow", { c: c });
    return ok("🌕 the glow comes out! you are big, bright and fast. no paws for your bag until it fades");
  };

  /* ---------------- starts for a new island, ways, a quiz, secret words ---------------- */
  function founders(game) { return smols(game); }
  function teach(game, n) { var I = SB.Ideas, got = 0; if (!I) return 0; founders(game).forEach(function (c) { var m = 0; I.LIST.forEach(function (d) { if (m < n && !I.known(c, d.id) && I.canHold(c, d.id)) { c.ideas[d.id] = 1; m++; got++; } }); }); return got; }
  PW.STARTS = [
    { id: "meadow", cat: "land", icon: "🌾", name: "a meadow start", gifts: { s_grain: 6, seed: 4, hoe: 1 }, desc: "seeds and a hoe by the nest: farm from the first morning" },
    { id: "river", cat: "land", icon: "🎣", name: "a river start", gifts: { rod: 1, bait: 6, fish: 2 }, desc: "a rod, bait, and a well dug by the nest", go: function (game, h) { if (SB.STRUCTS.well) { var p = freeSpot(game, h.x, h.z, 3, 6, dice(game, "start:well")); struct(game, "well", p.x, p.z, {}); } } },
    { id: "woods", cat: "land", icon: "🌲", name: "a deep woods start", gifts: { sapling: 4, stoneaxe: 1, berry: 6, morel: 2 }, desc: "saplings, an axe and a forager's lunch" },
    { id: "hill", cat: "land", icon: "⛰", name: "a mountain foot start", gifts: { stonepick: 1, ore: 4, flint: 4 }, desc: "a pick, and two ore veins by the nest", go: function (game, h) { var r = dice(game, "start:ore"); for (var i = 0; i < 2; i++) { var p = freeSpot(game, h.x, h.z, 5, 9, r); if (W().addNode) W().addNode(game.world, game, "orevein", p.x, p.z, 1); } } },
    { id: "harsh", cat: "land", icon: "💀", name: "a harsh start", gifts: { club: 1, torch: 1 }, sparks: 10, goal: "harsh", desc: "harsh wilds, a club, 10 sparks. last five days for a prize", go: function (game) { if (SB.Wilds && SB.Wilds.set) SB.Wilds.set(game, "harsh"); } },
    { id: "beach", cat: "land", icon: "🏖", name: "a beach start", gifts: { clam: 6, plank: 4, fiber: 4 }, desc: "clams, driftwood, and two washed-up lockers", go: function (game, h) { if (!SB.Loot || !SB.Loot.place) return; var r = dice(game, "start:beach"); for (var i = 0; i < 2; i++) { var p = freeSpot(game, h.x, h.z, 4, 8, r); try { SB.Loot.place(game, "pw-beach" + i, "wreck", p.x, p.z); } catch (e) {} } } },
    { id: "raft", cat: "land", icon: "🛶", name: "a raft start", gifts: { raft: 1, rod: 1, plank: 4, fish: 3 }, desc: "you came on a raft, and it still floats" },
    { id: "remember", cat: "mem", icon: "💡", name: "they remember", desc: "the founders wake already knowing a few ideas", go: function (game) { teach(game, 4); } },
    { id: "helper", cat: "mem", icon: "🗿", name: "the helper-maker", gifts: { clay: 6, crystal: 2 }, goal: "helper", desc: "clay, crystals, and the knack of one clay helper before any thinker" },
    { id: "night", cat: "mem", icon: "🌑", name: "the night folk", gifts: { glowcap: 4 }, desc: "the founders hatch with the dims, and its night eyes", go: function (game) { founders(game).forEach(function (c) { if (PW.catchIll(game, c, "dims", true)) m2(c).dimGift = "eyes"; }); } },
    { id: "lean", cat: "funds", icon: "🥀", name: "nothing but fur", goal: "lean", desc: "no sparks and scarce food. last six days for a prize", go: function (game) { game.sparks = 0; world2(game).food = "scarce"; delete game._fx; } },
    { id: "rich", cat: "funds", icon: "💰", name: "a full pod", sparks: 30, desc: "30 sparks, and 10 shells for each founder", go: function (game) { founders(game).forEach(function (c) { c.purse = (c.purse || 0) + 10; }); } },
    { id: "pile", cat: "pile", icon: "📦", name: "a starter pile", gifts: { stick: 6, stone: 4, fiber: 4, berry: 6, torch: 1 }, desc: "sticks, stones, fibre, berries and a torch beside the pod" },
    { id: "tiny", cat: "goal", icon: "⛺", name: "the tiny home", goal: "tiny", desc: "no hut, house or lodge until day five. the prize: resting heals twice as fast, for good" }
  ];
  PW.START = {}; PW.STARTS.forEach(function (o) { PW.START[o.id] = o; });
  PW.CATS = { land: "where you landed", mem: "what they remember", funds: "what was in the pod", pile: "a bonus", goal: "a dare" };
  PW.GOALS = {
    harsh: { text: "last until day 5 on harsh", sparks: 20, test: function (game) { return !smols(game).length ? "fail" : day(game) >= 5 ? "done" : ""; } },
    lean: { text: "last until day 6 with scarce food", sparks: 25, test: function (game) { return !smols(game).length ? "fail" : day(game) >= 6 ? "done" : ""; } },
    helper: { text: "make two helpers", sparks: 15, test: function (game) { return PW.helpers(game).length >= 2 ? "done" : ""; } },
    tiny: { text: "no hut, house or lodge until day 5", sparks: 10, test: function (game) { var big = game.world.structures.some(function (b) { return b.done && (b.kind === "hut" || b.kind === "house" || b.kind === "lodge" || b.kind === "hall"); }); return big ? "fail" : day(game) >= 5 ? "done" : ""; }, win: function (game) { s2(game).cosy = 1; U.bump(); } }
  };
  function world2(game) { var se = set(game); if (!se.world || typeof se.world !== "object") se.world = {}; return se.world; }
  PW.startOpen = function (game) { return day(game) <= 2; };
  PW.start = function (game, id) {
    var o = PW.START[id], s = s2(game), h = nest(game), k, i = 0;
    if (!o) return fail("no such start");
    if (!PW.startOpen(game)) return fail("that was for the first two days");
    if (s.start[o.cat]) return fail("you chose " + PW.START[s.start[o.cat]].name + " already");
    if (!h) return fail("nobody has landed yet");
    s.start[o.cat] = id;
    for (k in o.gifts || {}) { drop(game, k, o.gifts[k], h.x + 1.5 + (i % 3) * 0.7, h.z + 1.2 + Math.floor(i / 3) * 0.7); i++; }
    if (o.sparks) SB.Game.addSparks(game, o.sparks);
    if (o.go) o.go(game, h);
    if (o.goal) { if (!s.goals) s.goals = {}; s.goals[o.goal] = "on"; }
    emit("start", { id: id });
    return ok(o.icon + " " + o.name + ": " + o.desc);
  };
  function goalTick(game) {
    var s = s2(game);
    for (var id in s.goals || {}) {
      var g = PW.GOALS[id]; if (!g || s.goals[id] !== "on") continue;
      var r = g.test(game); if (!r) continue;
      s.goals[id] = r;
      if (r === "done") { SB.Game.addSparks(game, g.sparks); if (g.win) g.win(game); note(game, "🏁 goal hit: " + g.text + ". " + g.sparks + " sparks."); snd("achievement", 0.7); }
      else note(game, "🏁 the dare is off: " + g.text + ".");
      emit("goal2", { id: id, how: r });
    }
  }
  PW.setWay = function (game, id) { var s = s2(game); if (!PW.WAY[id]) return fail("no such way"); if (s.way && !PW.startOpen(game)) return fail("the tribe's way was set in its first days"); s.way = id; U.bump(); emit("way", { id: id }); return ok(PW.WAY[id].icon + " " + PW.WAY[id].name + ": " + PW.WAY[id].desc); };
  PW.QUIZ = [
    { q: "the pod opens. what do you look at first?", a: [["the water", { start: "river" }], ["the trees", { start: "woods" }], ["the rocks", { start: "hill" }]] },
    { q: "something growls in the dark. you...", a: [["hide", { diff: "easy" }], ["growl back", { diff: "hard" }], ["offer it a berry", { diff: "peaceful" }]] },
    { q: "what matters most?", a: [["a warm bed", { way: "hearth", gift: "quickheal" }], ["a full tummy", { way: "hunt", gift: "irontum" }], ["the stars", { way: "star", gift: "nightowl" }]] }
  ];
  PW.quiz = function (game, ans) {
    var s = s2(game), out = [];
    if (!PW.startOpen(game)) return fail("that was for the first two days");
    if (s.quiz) return fail("the island has heard your answers");
    if (!ans || ans.length !== PW.QUIZ.length) return fail("answer all three");
    s.quiz = ans.slice();
    PW.QUIZ.forEach(function (q, i) {
      var a = (q.a[ans[i]] || q.a[0])[1];
      if (a.start) { var r = PW.start(game, a.start); if (r.ok) out.push(PW.START[a.start].name); }
      if (a.diff) { PW.setDiff(game, a.diff); out.push(a.diff); }
      if (a.way) { PW.setWay(game, a.way); out.push(PW.WAY[a.way].name); }
      if (a.gift) founders(game).forEach(function (c) { m2(c).gift[a.gift] = 1; });
    });
    U.bump();
    return ok("📜 the island heard you: " + out.join(", ") + ". the founders take after your answers");
  };
  function applyHue(c) { var p = c.pw; if (p && p.hue != null && c.look && typeof c.look === "object") { c.look.hue = p.hue; c.look.hue2 = (p.hue + 30) % 360; } }
  // the founders again: new colours and a new knack each (up to three times, in the first two days)
  PW.reroll = function (game) {
    var s = s2(game), n = 0;
    if (!PW.startOpen(game)) return fail("that was for the first two days");
    if ((s.rerolls || 0) >= 3) return fail("three tries is the lot");
    s.rerolls = (s.rerolls || 0) + 1;
    var r = dice(game, "reroll:" + s.rerolls);
    smols(game).forEach(function (c) { if (!c.founder) return; var p = m2(c); p.hue = Math.floor(r() * 360); applyHue(c); p.gift = {}; p.gift[PW.GIFTS[Math.floor(r() * PW.GIFTS.length)].id] = 1; n++; });
    if (!n) { s.rerolls--; return fail("the founders haven't hatched yet"); }
    U.bump(); emit("reroll", { n: n });
    return ok("🎲 the founders shake themselves: new colours, and each a new knack (" + (3 - s.rerolls) + " tries left)");
  };
  // new island quirks. they also show in create world (title.js lists SB.QUIRKS), and a secret word turns one on later
  var QUIRKS2 = {
    bees: { icon: "🐝", name: "honey island", desc: "hives everywhere and fat bushes. a pot of honey to start.", fx: { critters: 1.3, food: 1.25 }, pw: { gifts: { honey: 6 } } },
    party: { icon: "🎉", name: "festival island", desc: "prayers pay more, and a present lands by the nest every morning.", fx: { sparks: 1.3 }, pw: { daily: 1 } },
    worthy: { icon: "☠️", name: "for the worthy", desc: "more grumps, hard bites, and every hazard half again as nasty.", fx: { grumps: 1.5 }, pw: { nasty: 1, diff: "hard" } },
    tipsy: { icon: "🥴", name: "tipsy island", desc: "the weather can't make its mind up, and brews fizz twice as long.", fx: { storms: 1.5 }, pw: { tipsy: 1 } },
    snares: { icon: "🪤", name: "snare island", desc: "more grumps, and vines and sticks for a ring of traps to start.", fx: { grumps: 1.3 }, pw: { gifts: { vine: 8, stick: 8 } } },
    everything: { icon: "🌈", name: "everything at once", desc: "every quirk on one island. good luck.", fx: { critters: 1.6, food: 1.3, ore: 1.5, storms: 1.6, grumps: 1.6, sparks: 1.3, sites: 1.4 }, pw: { gifts: { honey: 4, vine: 6, stick: 6 }, daily: 1, nasty: 1, tipsy: 1 } }
  };
  // (the two nasty ones are kept off the create-world list and out of "surprise me": only a secret word finds them)
  if (SB.QUIRKS) for (var qk in QUIRKS2) if (!SB.QUIRKS[qk]) { if (qk === "worthy" || qk === "everything") Object.defineProperty(SB.QUIRKS, qk, { value: QUIRKS2[qk], enumerable: false }); else SB.QUIRKS[qk] = QUIRKS2[qk]; }
  PW.SECRETS = { "not the bees": "bees", "celebration": "party", "for the worthy": "worthy", "drunk world": "tipsy", "no traps": "snares", "get fixed boi": "everything", "zenith": "everything" };
  PW.quirks = function (game) { var w = game.settings && game.settings.world; return (w && w.quirks) || []; };
  PW.secret = function (game, text) {
    var k = PW.SECRETS[String(text || "").toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim()], w;
    if (!k || !SB.QUIRKS || !SB.QUIRKS[k]) return fail("the island doesn't know that word");
    w = world2(game); if (!Array.isArray(w.quirks)) w.quirks = [];
    if (w.quirks.indexOf(k) >= 0) return fail("the island is that already");
    w.quirks.push(k); delete game._fx;
    quirkTick(game);
    emit("secret", { id: k });
    return ok(SB.QUIRKS[k].icon + " a secret word! this is " + SB.QUIRKS[k].name + " now: " + SB.QUIRKS[k].desc);
  };
  function quirkTick(game) {
    var s = s2(game), h = nest(game);
    PW.quirks(game).forEach(function (q) {
      var d = SB.QUIRKS && SB.QUIRKS[q], pw = d && d.pw, k, i = 0;
      if (!pw || s.qdone[q] || !h) return;
      s.qdone[q] = 1;
      for (k in pw.gifts || {}) { drop(game, k, pw.gifts[k], h.x - 1.5 - (i % 3) * 0.7, h.z + 1.4); i++; }
      if (pw.nasty) s.nasty = 1;
      if (pw.daily) s.daily = 1;
      if (pw.tipsy) s.tipsy = 1;
      if (pw.diff && PW.diff(game).id === "normal") PW.setDiff(game, pw.diff);
    });
  }

  /* ---------------- more switches and knobs ---------------- */
  var T2X = {
    noAge: ["⏳", "nobody grows old", "smols stop at the edge of old age and stay"],
    noDeath: ["🕊", "nobody is lost", "a smol that would be lost goes down instead, and is carried home"],
    noEggs: ["🥚", "no new eggs", "couples stop laying"],
    noJealous: ["💞", "no jealousy", "a hug is only a hug: nobody minds"],
    noStrangers: ["🚪", "no strangers", "nobody new turns up at the edge of the village"],
    calmNights: ["🌙", "calm nights", "no night chase, and no glooms from the unburied"],
    noGoal: ["🧭", "no story prompts", "the guide stops pointing at what to do next"],
    simple: ["🧸", "simple mode", "just the light page here, and fewer panels in the sky"],
    handsOff: ["🙌", "hands off", "the Lantern only watches: no powers, no gifts, no sparks. turn it off for the report"],
    noRegen: ["🩹", "no easy mending", "hearts come back only from food, a remedy or sleep"],
    deepHard: ["🕳", "a hard dark", "in a delve, bites hurt half again as much and rocks give one more"]
  };
  for (var tk in T2X) PW.TOGGLES[tk] = T2X[tk];
  PW.onToggle = function (game, key, on) {
    var se = set(game), s = s2(game);
    if (key === "calmNights") { if (on) se.nightChase = false; else delete se.nightChase; }
    if (key === "noGoal" || key === "simple") { if (on) se.guide = false; else if (!se.noGoal && !se.simple) delete se.guide; }
    if (key === "simple") { if (on) { se.minimap = false; PW.page("light"); } else delete se.minimap; }
    if (key === "handsOff") {
      if (on) s.hands = { day: day(game), pop: smols(game).length, deaths: game.stats.deaths || 0, sparks: game.sparks || 0 };
      else if (s.hands) { game.sparks = Math.max(game.sparks || 0, s.hands.sparks || 0); note(game, PW.report(game)); s.hands = null; }
    }
  };
  // how the island did on its own
  PW.report = function (game) {
    var h = s2(game).hands, sm = smols(game), top = 0;
    if (!h) return "the island hasn't been left on its own yet";
    sm.forEach(function (c) { if (c.tier > top) top = c.tier; });
    return "🙌 hands off for " + Math.max(0, day(game) - h.day) + " day" + (day(game) - h.day === 1 ? "" : "s") + ": " + h.pop + " smols then, " + sm.length + " now. " + Math.max(0, (game.stats.deaths || 0) - h.deaths) + " lost. the cleverest is tier " + top + ".";
  };
  PW.KNOBS2 = {
    grumps: ["grumps", ["none", "few", "normal", "many"], "world"], food: ["food", ["scarce", "normal", "plenty"], "world"], storms: ["storms", ["calm", "normal", "wild"], "world"],
    storyteller: ["storyteller", ["calm", "balanced", "wild"], "set"], seasons: ["seasons", ["normal", "short"], "set"], life: ["lives", ["short", "normal", "long"], "set"]
  };
  PW.LIFE = { short: 0.6, normal: 1, long: 1.6 };
  PW.knobVal = function (game, key) { var d = PW.KNOBS2[key], se = set(game), v = d ? (d[2] === "world" ? (se.world || {})[key] : se[key]) : null; return d && d[1].indexOf(v) >= 0 ? v : key === "storyteller" ? "balanced" : "normal"; };
  PW.knob2 = function (game, key) {
    var d = PW.KNOBS2[key]; if (!d) return false;
    var v = d[1][(d[1].indexOf(PW.knobVal(game, key)) + 1) % d[1].length], se = set(game);
    if (d[2] === "world") { world2(game)[key] = v; delete game._fx; }
    else if (key === "seasons" && v === "normal") delete se.seasons;
    else se[key] = v;
    emit("knob", { key: key, v: v });
    return v;
  };
  PW.makeSandbox = function (game) { if (sandbox(game)) return fail("it is one already"); world2(game).mode = "sandbox"; emit("sandboxed", {}); return ok("🧪 this is a sandbox island now: free miracles, the catalogue and the console. it posts no score, and it can't be undone"); };
  // a second family to follow: keep two "your smol"s and swap between them
  PW.second = function (game, c) { if (!c || !c.alive || c.species !== "smol") return fail("pick a smol"); s2(game).second = c.id; return ok("👥 " + c.name + " is your second smol. swap to it whenever you like"); };
  PW.swapMine = function (game) {
    var M = SB.Mine, s = s2(game), o = s.second != null && SB.Game.byId ? SB.Game.byId(game, s.second) : null, now = M && M.get ? M.get(game) : null;
    if (!M || !M.set) return fail("there is no smol of yours yet");
    if (!o || !o.alive) return fail("pick a second smol first");
    if (!M.set(game, o, "swap")) return fail(o.name + " can't be yours");
    s.second = now ? now.id : null;
    emit("mineSwap", { c: o });
    return ok("👥 " + o.name + " is your smol now" + (now ? ", and " + now.name + " waits its turn" : ""));
  };
  // from the sky: the stone or shroom beside the picked smol does its thing for it
  PW.skyUse = function (game, c) {
    if (!c) return fail("pick a smol first");
    var b = stoneNear(game, c, 6), w = PW.stoneAt(game, c, "wordstone", 6);
    if (b) return PW.touch(game, c, b);
    if (w) return PW.hear(game, c, w);
    if (shroomNear(game, c, 8)) { PW.addGlow(game, 2); return ok("🍄 " + c.name + " hums under the great glowshroom. the Lantern's glow is " + Math.round(s2(game).glow)); }
    return fail("nothing of the Lantern's stands near " + c.name);
  };

  /* ---------------- dares for a hard island, paid in star tokens ---------------- */
  PW.DARES = [
    { id: "chase", icon: "👹", text: "chase off 5 grumps", n: 5, ev: "grumpChased" }, { id: "brew", icon: "🍵", text: "use 6 remedies or brews", n: 6, ev: "medicine" },
    { id: "words", icon: "🗣", text: "say 8 words of power", n: 8, ev: "shout" }, { id: "imbue", icon: "🔮", text: "imbue 3 things", n: 3, ev: "imbued" }
  ];
  PW.TOKENS = { arkshard: 1, arkvial: 2, wishlamp: 2, heartbloom: 3 };
  PW.daresOpen = function (game) { return !!(game.ngPlus || PW.diff(game).dmg >= 1.35 || sandbox(game)); };
  PW.tokenBuy = function (game, c, kind) {
    var s = s2(game), cost = PW.TOKENS[kind];
    if (!cost || !K()[kind] || !c) return fail("no such prize");
    if ((s.tokens || 0) < cost) return fail("that takes " + cost + " star token" + (cost > 1 ? "s" : ""));
    s.tokens -= cost; give(game, c, kind, 1);
    return ok("⭐ " + label(kind) + ", for " + cost + " star token" + (cost > 1 ? "s" : ""));
  };

  /* ---------------- sandbox tools and the typed console ---------------- */
  var tool = null, moving = null, reach0 = null, catGroup = "food";
  PW.sandTool = function (t) { if (t !== undefined) { tool = t; moving = null; } return tool; };
  PW.erase = function (game, r) {
    if (!sandbox(game) || !r || !r.ref) return fail("sandbox only");
    if (r.type === "item") { W().remove(game.world, r.ref); return ok("erased"); }
    if (r.type === "struct") { W().removeStructure(game.world, r.ref); return ok("erased"); }
    return fail("that stays");
  };
  PW.moveStruct = function (game, b, x, z) { if (!sandbox(game) || !b) return fail("sandbox only"); if (W().markNode) W().markNode(game.world, b); b.x = U.r1(x); b.z = U.r1(z); if (W().markNode) W().markNode(game.world, b); return ok("moved the " + (SB.STRUCTS[b.kind] ? SB.STRUCTS[b.kind].label : "thing")); };
  PW.longReach = function (game) { var Po = P(); if (!sandbox(game) || !Po) return fail("sandbox only"); if (reach0 == null) reach0 = Po.REACH; Po.REACH = Po.REACH > reach0 ? reach0 : reach0 * 2.2; return ok(Po.REACH > reach0 ? "🦒 a long reach" : "your reach is your own again"); };
  PW.COMMANDS = {
    help: ["", "the list", function () { return ok("commands: " + Object.keys(PW.COMMANDS).map(function (k) { return k + (PW.COMMANDS[k][0] ? " " + PW.COMMANDS[k][0] : ""); }).join(" · ")); }],
    give: ["<thing> [n]", "any item", function (game, c, a) { if (!c) return fail("pick a smol"); if (!K()[a[0]]) return fail("no such thing: " + a[0]); var n = Math.max(1, Math.min(99, +a[1] || 1)); give(game, c, a[0], n); return ok(n + " " + label(a[0])); }],
    time: ["dawn|noon|dusk|night", "set the hour", function (game, c, a) { return PW.setTime(game, a[0]) ? ok("it is " + a[0]) : fail("dawn, noon, dusk or night"); }],
    weather: ["clear|cloudy|rain|storm|fog|free", "set and hold the weather", function (game, c, a) { var s = s2(game); if (a[0] === "free") { s.wlock = null; return ok("the weather is its own again"); } if (["clear", "cloudy", "rain", "storm", "fog"].indexOf(a[0]) < 0) return fail("clear, cloudy, rain, storm, fog or free"); s.wlock = a[0]; setWeather(game, a[0]); return ok("the weather is held at " + a[0]); }],
    chem: ["<name> <0..1>", "one drop of a chemical", function (game, c, a) { if (!c) return fail("pick a smol"); if (!(a[0] in c.chem) || isNaN(+a[1])) return fail("chemicals: " + Object.keys(c.chem).join(" ")); c.chem[a[0]] = clamp(+a[1], 0, 1); U.setLast(c); return ok(a[0] + " = " + c.chem[a[0]]); }],
    heal: ["", "all better", function (game, c) { if (!c) return fail("pick a smol"); var ch = c.chem; ch.health = 1; ch.hunger = 0.1; ch.pain = 0; ch.sick = 0; ch.toxin = 0; ch.cold = 0; ch.fear = 0; if (SB.Body) { SB.Body.heal(c); SB.Body.of(c).thirst = 0; } if (c.pw) { c.pw.ill = null; c.pw.parts = {}; c.pw.sprain = 0; } U.bump(); U.setLast(c); return ok(c.name + " is as good as new"); }],
    sparks: ["<n>", "set sparks", function (game, c, a) { game.sparks = clamp(+a[0] || 0, 0, 999); return ok(game.sparks + " sparks"); }],
    embers: ["<n>", "set embers", function (game, c, a) { if (!SB.Embers || !SB.Embers.state) return fail("no embers here"); SB.Embers.state(game).embers = clamp(Math.round(+a[0] || 0), 0, 99); return ok(SB.Embers.state(game).embers + " embers"); }],
    glow: ["<n>", "set the Lantern's glow", function (game, c, a) { s2(game).glow = clamp(+a[0] || 0, 0, PW.GLOW_MAX); return ok("glow " + s2(game).glow + ", level " + PW.link(game)); }],
    spawn: ["t0..t6|egg|grump|food", "from the palette", function (game, c, a) { var h = c || U.skyAt(game); if (!h) return fail("pick a place"); return SB.Game.sandboxSpawn(game, a[0], h.x + 1.5, h.z + 1) ? ok("a " + a[0]) : fail("t0 to t6, egg, grump or food"); }],
    build: ["<building>", "any building, finished", function (game, c, a) { var h = c || U.skyAt(game); if (!h || !SB.STRUCTS[a[0]]) return fail("no such building: " + a[0]); struct(game, a[0], h.x + 2, h.z + 1, {}); return ok("a " + SB.STRUCTS[a[0]].label); }],
    ill: ["<sickness>", "catch one", function (game, c, a) { if (!c) return fail("pick a smol"); return PW.ILL[a[0]] && PW.catchIll(game, c, a[0], true) ? ok(PW.ILL[a[0]].name) : fail("sicknesses: " + PW.ILLS.map(function (i) { return i.id; }).join(" ")); }],
    age: ["<seconds>", "set age", function (game, c, a) { if (!c || isNaN(+a[0])) return fail("pick a smol and a number"); c.age = Math.max(0, +a[0]); if (SB.Creature.stageFor) c.stage = SB.Creature.stageFor(c.age, c); return ok(c.name + " is " + Math.round(c.age) + "s old"); }],
    speed: ["<0.25..16>", "how fast time runs", function (game, c, a) { game.speed = clamp(+a[0] || 1, 0.25, 16); return ok("speed " + game.speed); }]
  };
  PW.command = function (game, c, text) {
    var a = String(text || "").trim().toLowerCase().replace(/^\//, "").split(/\s+/), cmd = PW.COMMANDS[a[0]];
    if (!sandbox(game)) return fail("typed commands work on a sandbox island (modes → make this a sandbox)");
    if (!cmd) return fail("no such command. try: help");
    var r; try { r = cmd[2](game, c, a.slice(1)); } catch (e) { r = fail("that didn't work"); }
    emit("command", { cmd: a[0], ok: !!(r && r.ok) });
    return r;
  };

  /* ---------------- the body you are in: every frame, and twice a second ---------------- */
  PW.SWEET = { honey: 1, honeycake: 1, berrytart: 1, jam: 1, cider: 1, fizz: 1, potion: 1, treat: 1, jellypudding: 1, swiftbrew: 1, warmbrew: 1, owlbrew: 1, strongbrew: 1, stoutbrew: 1, youthberry: 1 };
  PW.WEIGHT = { log: 1, plank: 0.6, stone: 0.5, ore: 0.6, ironore: 0.7, iron: 0.7, metal: 0.6, clay: 0.5, coal: 0.4, silverore: 0.7, starmetal: 0.8, firewood: 0.5 };
  PW.LOAD = 22;
  PW.load = function (c) { var v = Sv() ? Sv().inv(c) : null, n = 0; if (v) for (var i = 0; i < v.s.length; i++) if (v.s[i]) n += (PW.WEIGHT[v.s[i].k] || 0.03) * v.s[i].n; return Math.round(n * 10) / 10; };
  PW.loadMax = function (game, c) { return PW.LOAD * (harsh(game) ? 0.5 : 1) * (PW.cap(c, "legs", game) < PW.FAIL ? 0.7 : 1); };
  PW.heavy = function (game, c) { return PW.rule(game, "load") && PW.load(c) > PW.loadMax(game, c); };
  function treat(game, c) { // too many treats in a row and your tummy says so
    var p = m2(c), t = game.time;
    p.sweet = (p.sweet || []).filter(function (x) { return x > t - 150; }); p.sweet.push(Math.round(t));
    if (p.sweet.length >= 4) { p.sweet = []; if (PW.catchIll(game, c, "tummy", true)) tell(game, c, "🤢 too many treats. the collywobbles! tummy tea, or a lie down"); emit("overdose", { c: c }); }
  }
  PW.AIR = 6; PW.FALL = 2; // seconds of air; how far you can drop for nothing
  PW.air = function (c) { if (!(c.drownT > 0)) return 1; var im = PW.wearing(c, "head") ? imbOf(c, PW.wearing(c, "head")) : null, k = im && im.d.id === "gill" ? 1 + im.lv : 1; return clamp(1 - c.drownT / (PW.AIR * k), 0, 1); };
  var T2 = { id: null };
  function tracker2(c) { if (T2.id !== c.id) T2 = { id: c.id, y: null, x: c.x, z: c.z, h: c.chem.health, fed: 0, sun: 0, swamp: 0, grave: 0, prick: 0, said: {}, w: null, big: false, heavy: false }; return T2; }
  function sayOnce(game, c, key, gap, msg) { var T = tracker2(c); if ((T.said[key] || 0) > game.time) return; T.said[key] = game.time + gap; tell(game, c, msg); }
  PW.moveK = function (game, c, S) {
    var k = 1, f = PW.wearing(c, "feet"), im = f ? imbOf(c, f) : null;
    if (im && im.d.id === "wading" && (depthAt(game, c) > 0.02 || (game.world.snowCover || 0) > 0.3)) k += 0.15 * im.lv;
    if (PW.has(c, "bigglow", game)) k += 0.4;
    if (PW.heavy(game, c)) k *= S && S.running ? 0.6 : 0.85;
    if (PW.rule(game, "parts") && PW.cap(c, "legs", game) < PW.FAIL) k *= 0.8;
    return k;
  };
  PW.frame2 = function (game, S, dt) {
    if (!S) return;
    var c = S.c, T = tracker2(c), ch = c.chem, p = c.pw || {}, se = set(game), lesson = !!(S.firstNight || S.nightChase || S.hungerClock), moved = SB.dist(c.x, c.z, T.x, T.z);
    // a long drop: from the highest point since you left the ground to where you land. a hop or a slope never counts
    if (T.y == null || moved > 2.5 || c.y == null) { T.y = c.y; T.air = false; }
    else if (c.onGround === false) { T.air = true; if (c.y > T.y) T.y = c.y; }
    else {
      var drop0 = T.y - c.y; T.y = c.y; T.air = false;
      if (drop0 > PW.FALL && PW.rule(game, "falls") && !lesson && !(depthAt(game, c) > 0.02)) {
        var d = PW.hurt(game, c, Math.min(0.5, (drop0 - PW.FALL) * 0.07 + 0.03) * (PW.cap(c, "tail", game) < PW.FAIL ? 1.3 : 1), "fall");
        if (d > 0) { sayOnce(game, c, "fall", 4, "🪂 ow! that was a long way down"); snd("bonk", 0.6); emit("fell", { c: c, drop: drop0, d: d }); }
      }
    }
    T.x = c.x; T.z = c.z;
    // under water: a deep-breath cap holds your air
    if (c.drownT > 0 && PW.air(c) > 0 && ch.health > 0) { ch.health = Math.min(1, ch.health + dt * 0.035); U.setLast(c); }
    if (PW.has(c, "alight", game)) PW.hurt(game, c, dt * 0.02, "burn");
    if (PW.has(c, "bigglow", game)) { S.stam = 1; T.big = true; }
    if (!lesson) {
      var parts = PW.rule(game, "parts");
      if (parts) {
        var lg = PW.cap(c, "legs", game), lu = PW.cap(c, "lungs", game), gu = PW.cap(c, "gut", game);
        if (S.running && lg < 1) S.stam = Math.max(0, S.stam - dt * 0.06 * (1 - lg));
        if (lu < 1 && S.stam > 0.4 + 0.6 * lu) S.stam = 0.4 + 0.6 * lu;
        if (gu < 1 && P().hungerRate) ch.hunger = clamp(ch.hunger + dt * P().hungerRate() * 0.6 * (1 - gu), 0, 1);
      }
      var im = S.running && PW.wearing(c, "body") ? imbOf(c, PW.wearing(c, "body")) : null;
      if (im && im.d.id === "leaden") S.stam = Math.max(0, S.stam - dt * 0.03);
      var hk = Sv() && Sv().heldKind ? Sv().heldKind(c) : null, ih = hk ? imbOf(c, hk) : null;
      if (ih && ih.d.id === "grudge" && P().hungerRate) ch.hunger = clamp(ch.hunger + dt * P().hungerRate() * 0.5, 0, 1);
      if (!S.running && (PW.has(c, "rattled", game) || (p.dimGift === "step" && !game.world.night))) S.stam = Math.max(0, S.stam - dt * 0.05);
      if (PW.has(c, "sunburnt", game) && S.stam > 0.85) S.stam = 0.85;
      // no easy mending: hearts only from food, a remedy or sleep
      if ((se.noRegen || PW.has(c, "wornout", game) || (parts && PW.cap(c, "heart", game) < PW.FAIL)) && ch.health > T.h && !c.asleep && game.time > T.fed) { ch.health = T.h; U.setLast(c); }
    }
    T.h = ch.health;
  };
  function bodySlow2(game, S, step) {
    var c = S.c, T = tracker2(c), ch = c.chem, p = m2(c), B = SB.Body, b = B ? B.of(c) : null, lesson = !!(S.firstNight || S.nightChase || S.hungerClock), wet = depthAt(game, c) > 0.02, t = game.time;
    if (T.big && !PW.has(c, "bigglow", game)) { T.big = false; PW.buff(c, "wornout", 180, game); if (b) b.cosy = 0; tell(game, c, "🌘 the glow goes back in. you are worn out: no mending until you have eaten or slept"); emit("glowOver", { c: c }); }
    if (PW.has(c, "glowcloak", game)) { grumpsNear(game, c, 2.5, function (g) { if (!g.boss) { PW.stun(game, g, 0.6); SB.Chem.apply(g.chem, { fear: 0.2 }); } }); if (b) b.wet = 0; ch.cold = Math.max(0, (ch.cold || 0) - 0.02); }
    if (lesson) return;
    // catching alight, and what puts you out
    if (PW.rule(game, "burns")) {
      var inFire = !!(B && B.litFireNear && B.litFireNear(game.world, c, 0.7)) || (game.world.burning || []).some(function (n) { return n.state === "burning" && SB.dist(n.x, n.z, c.x, c.z) < 1.3; });
      if (PW.has(c, "alight", game)) { if (wet || (b && b.wet > 0.5) || rain(game) > 0.5) { PW.clear(c, "alight"); tell(game, c, "💦 the water puts you out"); emit("doused", { c: c }); } }
      else if (inFire && !wet && !godOn(game)) { PW.buff(c, "alight", 6, game); sayOnce(game, c, "fire", 20, "🔥 your fur is alight! water puts it out"); emit("alight", { c: c }); }
      if (c._povMove && (T.prick || 0) <= t && W().nodesNear && (W().nodesNear(game.world, c.x, c.z, 1, function (n) { return n.kind === "cactus" && n.state === "ok"; }) || []).length) { T.prick = t + 3; if (PW.hurt(game, c, 0.04, "prick") > 0) { sayOnce(game, c, "prick", 15, "🌵 ouch! cactus. foot wraps keep the thorns out"); emit("pricked", { c: c }); } }
    }
    if (PW.rule(game, "sun")) {
      var bm = biome(game, c.x, c.z), k = game.world.weather ? game.world.weather.kind : "clear";
      if ((bm === "desert" || bm === "mesa") && !game.world.night && k === "clear" && PW.resist(c, "sun") < 1 && !PW.has(c, "sunburnt", game)) {
        T.sun += step * (p.dimGift === "eyes" ? 2 : 1);
        if (T.sun >= 60) { T.sun = 0; PW.buff(c, "sunburnt", 240, game); p.tan = Math.min(3, (p.tan || 0) + 1); tell(game, c, "🌞 sunburnt. a hat keeps the desert sun off"); emit("sunburn", { c: c, tan: p.tan }); }
      } else T.sun = Math.max(0, T.sun - step);
      if (wet && ((game.world.snowCover || 0) > 0.3 || (W().tempAt && W().tempAt(game.world, c.x, c.z) < 0.22)) && PW.resist(c, "icy") < 1) { ch.cold = Math.min(1, (ch.cold || 0) + 0.03 * step); PW.buff(c, "icy", 2, game); }
    }
    if (PW.rule(game, "germs")) {
      var bm2 = biome(game, c.x, c.z);
      if (wet && (bm2 === "swamp" || bm2 === "mangrove")) { if ((T.swamp += step) >= 30) { T.swamp = 0; PW.catchIll(game, c, "swampfever"); } } else T.swamp = Math.max(0, T.swamp - step * 0.5);
      if (!set(game).calmNights && PW.bodyNear(game, c.x, c.z, 2.5)) { if ((T.grave += step) >= 30) { T.grave = 0; PW.catchIll(game, c, "glooms"); } } else T.grave = Math.max(0, T.grave - step * 0.5);
    }
    // parts wear with what ails you, and mend with rest
    if (PW.rule(game, "parts")) {
      if ((ch.toxin || 0) > 0.3) PW.hurtPart(game, c, "gut", 0.004 * step);
      if ((ch.sick || 0) > 0.4 || p.ill) PW.hurtPart(game, c, "lungs", 0.002 * step);
      if (ch.hunger > 0.88) PW.hurtPart(game, c, "heart", 0.003 * step);
      if (PW.resting(c) && ch.hunger < 0.75) for (var id in p.parts) PW.healPart(c, id, 0.002 * step * (PW.cap(c, "heart", game) > 1 ? 2 : 1));
    }
    // the dims deepen a stage a day, to four
    var ill = p.ill;
    if (ill && ill.id === "dims") {
      var stg = Math.min(4, 1 + Math.floor((t - (ill.t0 || t)) / DAY));
      if (stg > ill.stage) { ill.stage = stg; tell(game, c, "🌑 the dims deepen (stage " + stg + " of 4): stronger and harder to see by night, weaker by day. sun tea lifts it"); emit("illnessWorse", { c: c, id: "dims", stage: stg }); }
      if (game.world.night && (ill.stage >= 3 || p.dimGift === "kin")) U.hushScout(game, c, S);
    } else if (p.dimGift) p.dimGift = null;
    if (ill && P().hungerRate) ch.hunger = clamp(ch.hunger + step * P().hungerRate() * 0.1, 0, 1); // fighting something off takes food
    // a lasting tool
    var v = Sv().inv(c), sl = Sv().held(c), im = sl ? imbOf(c, sl.k) : null;
    if (sl && im && im.d.id === "lasting" && T.w && T.w.k === sl.k && T.w.i === v.sel && sl.w < T.w.w && U.roll(c, "lasting", 0.25 * im.lv)) sl.w = T.w.w;
    T.w = sl && sl.w != null ? { k: sl.k, i: v.sel, w: sl.w } : null;
    T.heavy = PW.heavy(game, c);
    if (T.heavy) sayOnce(game, c, "heavy", 60, "🎒 your bag is heavy: running is slow. logs, stone and ore weigh the most");
  }

  /* ---------------- the island, on timers ---------------- */
  var scanI = 0, t2 = 0, t5 = 0, t20 = 0;
  function scanOne(game, c, el) {
    var se = set(game), p = c.pw, want = PW.LIFE[se.life] || 1, ch = c.chem;
    if (want !== ((p && p.lk) || 1)) { c.lifespan = c.lifespan * want / ((p && p.lk) || 1); me(c).lk = want; p = c.pw; }
    if (se.noAge && c.age > c.lifespan - 120) c.lifespan = c.age + 240;
    if (p && p.hue != null) applyHue(c);
    if (c._pov) return;
    if (p && p.ill && p.ill.id !== "dims" && (p.ill.heal = (p.ill.heal || 0) + el) >= PW.ILL_REST) { p.immune[p.ill.id] = day(game) + PW.IMMUNE_DAYS; p.ill = null; } // a smol you aren't in gets over a sickness quietly
    if (!PW.rule(game, "parts")) return;
    // the same wear for every smol, in big slow steps
    if ((ch.toxin || 0) > 0.3) PW.hurtPart(game, c, "gut", 0.004 * el);
    if ((ch.sick || 0) > 0.4) PW.hurtPart(game, c, "lungs", 0.002 * el);
    if (ch.hunger > 0.88) PW.hurtPart(game, c, "heart", 0.0015 * el);
    if ((ch.pain || 0) > 0.6) PW.hurtPart(game, c, PW.OUTER[c.id % PW.OUTER.length], 0.003 * el);
    p = c.pw; if (!p || !p.parts) return;
    var any = false;
    for (var id in p.parts) { any = true; if (ch.hunger < 0.7 && (ch.pain || 0) < 0.3) PW.healPart(c, id, 0.0015 * el); }
    if (!any) return;
    if (PW.cap(c, "gut", game) < PW.FAIL) ch.hunger = Math.min(1, ch.hunger + 0.0006 * el);
    if (PW.cap(c, "heart", game) < PW.FAIL) ch.health = Math.max(0.2, ch.health - 0.0006 * el);
    if (PW.cap(c, "lungs", game) < PW.FAIL) ch.tired = Math.min(1, (ch.tired || 0) + 0.001 * el);
    if (PW.cap(c, "legs", game) < PW.FAIL) ch.tired = Math.min(1, (ch.tired || 0) + 0.0006 * el);
  }
  // a shaman: a thinker (or a very glowy smol) now and then mends a neighbour on its own
  function shamanTick(game) {
    var sm = smols(game), done = false;
    sm.forEach(function (c) {
      if (done || c._pov || c.asleep || !c.alive || (c.tier < 5 && !(c.genome && c.genome.genes && c.genome.genes.glow > 0.6))) return;
      if (c.pw && c.pw.shT > game.time) return;
      var t = null;
      near(game, c.x, c.z, 6, function (o) { if (!t && o !== c && o.species === "smol" && o.alive && ((o.chem.sick || 0) > 0.5 || o.chem.health < 0.5)) t = o; });
      if (!t) return;
      SB.Chem.apply(t.chem, { sick: -0.4, pain: -0.3, health: 0.2 });
      me(c).shT = Math.round(game.time + 120); done = true;
      if (SB.Creature.emote) { SB.Creature.emote(c, "idea", 2); SB.Creature.emote(t, "love", 2); }
      var s = s2(game); if (s.shDay !== day(game)) { s.shDay = day(game); note(game, "✨ " + c.name + " laid a glowing paw on " + t.name + ", and it felt better. nobody asked it to."); }
      emit("shamanCast", { c: c, to: t });
    });
  }
  function packTick(game) {
    var s = s2(game), pk = s.pack; if (!pk || game.time < pk.until) return;
    var h = PW.homeSpot(game, null), n = 0; s.pack = null;
    if (!h) return;
    game.world.items.forEach(function (o) { if (!o.heldBy && !o.gone && SB.dist(o.x, o.z, pk.x, pk.z) < 3 && n < 40) { o.x = h.x + ((n % 5) - 2) * 0.4; o.z = h.z + 0.8 + Math.floor(n / 5) * 0.4; o.y = U.ground(game, o.x, o.z); n++; } });
    if (n) { note(game, "🎒 friends brought the dropped pack home."); emit("packHome", { n: n }); }
  }
  PW.slow2 = function (game, S, step) {
    var s = s2(game), se = set(game), sm, i;
    hook2();
    if (S) bodySlow2(game, S, step);
    PW.placeShroom(game);
    sm = smols(game);
    if (sm.length) { scanI = (scanI + 1) % sm.length; scanOne(game, sm[scanI], sm.length * step); }
    if ((t2 -= step) <= 0) {
      t2 = 2;
      if (se.noJealous) for (i = 0; i < sm.length; i++) if (sm[i].jealous) sm[i].jealous = null;
      if (se.noStrangers) game.strangerT = Math.max(game.strangerT || 0, 600);
      if (se.handsOff) game.sparks = 0;
      if (s.wlock && game.world.weather && game.world.weather.kind !== s.wlock && !game.forceWeather) setWeather(game, s.wlock);
      if (s.quiet > game.time && !U.story(game)) for (i = 0; i < game.creatures.length; i++) { var g = game.creatures[i]; if (g.species === "grump" && g.alive && !g.boss) U.sendHome(g); }
      quirkTick(game);
    }
    if ((t5 -= step) <= 0) { t5 = 5; if (s.helpers.length) helperTick(game); singTick(game); goalTick(game); packTick(game); if (s.tipsy && Math.floor(game.time / 150) !== s.tipsyN) { s.tipsyN = Math.floor(game.time / 150); setWeather(game, ["clear", "rain", "fog", "cloudy", "storm"][Math.floor(dice(game, "tipsy:" + s.tipsyN)() * 5)]); } }
    if ((t20 -= step) <= 0) { t20 = 20; shamanTick(game); }
  };
  function dawn2(game) {
    var s = s2(game), h = nest(game);
    if (s.tree2) { SB.Game.addSparks(game, 2); emit("sparkTree", {}); }
    if (s.daily && h) { var ks = ["honey", "berry", "apple", "cooked", "herb", "glowcap"].filter(function (k) { return !!K()[k]; }); drop(game, ks[Math.floor(dice(game, "daily:" + day(game))() * ks.length)], 2, h.x + 1, h.z - 1.2); }
    var A = SB.Animals;
    if (A && A.all) {
      var recs = []; try { recs = A.all(game) || []; } catch (e) { recs = []; }
      recs.forEach(function (r) { if (r.sick) r.mood = Math.max(-1, (r.mood || 0) - 0.2); });
      var r0 = dice(game, "pet:" + day(game)), pick = recs.length ? recs[Math.floor(r0() * recs.length)] : null;
      if (pick && !pick.sick && r0() < (st(game).plague > game.time ? 0.6 : 0.2)) { pick.sick = day(game); note(game, "🤧 " + (pick.name || "one of the animals") + " has the sniffles. a smol with healroot can see to it (the lantern tab's gear page)."); emit("petSick", { rec: pick }); }
    }
  }
  PW.sickPets = function (game) { var A = SB.Animals, out = []; if (A && A.all) { try { out = (A.all(game) || []).filter(function (r) { return !!r.sick; }); } catch (e) { out = []; } } return out; };
  PW.tendPet = function (game, c, rec) {
    if (!rec || !rec.sick) return fail("it is well");
    var knows = SB.Ideas && SB.Ideas.known(c, "herbal");
    if (!knows && !has(c, "herb")) return fail("that takes healroot, or a smol who knows herb lore");
    if (!knows) Sv().take(c, "herb", 1);
    rec.sick = 0; rec.mood = Math.min(1, (rec.mood || 0) + 0.2);
    emit("petTended", { c: c, rec: rec });
    return ok("🌿 " + (rec.name || "it") + " perks up. the sniffles are gone");
  };

  /* ---------------- hooks ---------------- */
  function hook2() {
    var Po = P(), Wi = SB.Wilds;
    if (Po && Po.drive && Po.drive._pw && !Po.drive._pw2) {
      var d0 = Po.drive;
      Po.drive = function (c, dt, game) {
        var s = Po.state ? Po.state() : null, mine = !!(s && s.c === c && !s.dead), x0 = c.x, z0 = c.z;
        var r = d0.call(Po, c, dt, game);
        if (mine && c._povMove) {
          var k = PW.moveK(game, c, s);
          if (k !== 1) { var nx = x0 + (c.x - x0) * k, nz = z0 + (c.z - z0) * k; if (k < 1 || SB.World.walkable(game.world, nx, nz, SB.Creature.canSwim ? SB.Creature.canSwim(c) : false)) { c.x = nx; c.z = nz; } }
        }
        return r;
      };
      Po.drive._pw = 1; Po.drive._pw2 = 1;
    }
    if (Wi && Wi.darkness && Wi.darkness._pw && !Wi.darkness._pw2) {
      var dk0 = Wi.darkness;
      Wi.darkness = function (game, s, night) {
        var d = dk0.call(Wi, game, s, night), c = s && s.c, p = c && c.pw, k = 1;
        if (!c || !(d > 0)) return d;
        if (PW.rule(game, "parts")) { var e = PW.cap(c, "eyes", game); k *= e < 1 ? 1 + 0.6 * (1 - e) : 1 - 0.4 * Math.min(1, e - 1) * 4; }
        if (p && p.fit && PW.FITS[p.fit.eyes] && PW.FITS[p.fit.eyes].night) k *= 0.6;
        if (p && p.gift && p.gift.nightowl) k *= 0.5;
        if (p && p.ill && p.ill.id === "dims") k *= p.dimGift === "eyes" ? 0.3 : 0.7;
        if (PW.has(c, "sight", game) || PW.has(c, "bigglow", game)) k *= 0.5;
        return Math.min(1, d * k);
      };
      Wi.darkness._pw = 1; Wi.darkness._pw2 = 1;
    }
  }
  PW.hook2 = hook2;
  var hooked = false;
  (function () {
    if (hooked || !SB.bus) return; hooked = true;
    var on = SB.bus.on.bind(SB.bus);
    function pov(d) { var g = cur(); return g && d && d.c && d.c._pov ? g : null; }
    function bonus(g, c, kind) { var hk = Sv().heldKind ? Sv().heldKind(c) : null, im = hk ? imbOf(c, hk) : null; if (im && im.d.id === "plenty" && U.roll(c, "plenty", 0.2 * im.lv)) { give(g, c, kind, 1); emit("perkBonus", { c: c, key: "plenty", kind: kind }); } }
    on("chop", function (d) { var g = pov(d); if (g && d.pov) bonus(g, d.c, "log"); });
    on("rockGone", function (d) { var g = pov(d); if (!g) return; bonus(g, d.c, "stone"); if (set(g).deepHard && SB.Deep && SB.Deep.cur && SB.Deep.cur(g)) give(g, d.c, "stone", 1); });
    on("death", function (d) {
      var g = cur(); if (!g || !d || !d.c || d.c.species !== "smol") return;
      if (downed(g, d.c, d.cause)) return;
      if (!smols(g).length) { s2(g).lost = day(g); note(g, "🕯 the island is quiet. the Lantern can call an egg for nothing: ✨ magic → the Lantern's powers → gifts."); emit("islandEmpty", {}); }
    });
    on("egg", function (d) { var g = cur(); if (g && set(g).noEggs && d && d.obj && W() && W().remove) { W().remove(g.world, d.obj); emit("eggStopped", {}); } });
    on("tickle", function () { var g = cur(); if (g) s2(g).al.k++; });
    on("tap", function () { var g = cur(); if (g) s2(g).al.h++; });
    on("miracle", function (d) { var g = cur(); if (!g || !d) return; if (d.id === "bolt") s2(g).al.h += 2; else if (d.id === "heal" || d.id === "bounty" || d.id === "gift") s2(g).al.k++; });
    on("power", function (d) { var g = cur(); if (!g || !d) return; if (KIND_CASTS[d.id]) s2(g).al.k += 2; else if (d.id === "burst") s2(g).al.h++; if (d.c && T2.id === d.c.id) T2.fed = g.time + 3; if (d.id === "recall" || d.id === "slow") T2.y = null; });
    on("povEat", function (d) { var g = pov(d); if (!g) return; if (T2.id === d.c.id) T2.fed = g.time + 4; if (PW.SWEET[d.kind]) treat(g, d.c); });
    on("medicine", function (d) {
      var g = cur(); if (!g || !d || !d.c) return;
      if (T2.id === d.c.id) T2.fed = g.time + 4;
      if (PW.SWEET[d.kind]) treat(g, d.c);
      if (d.kind === "bandage" || d.kind === "splint" || d.kind === "poultice") PW.buff(d.c, "bandaged", 240, g);
      if (d.kind === "kit" && d.c.pw && d.c.pw.parts) { for (var k in d.c.pw.parts) d.c.pw.parts[k] = Math.min(1, d.c.pw.parts[k] + 0.3); U.bump(); }
      if (d.kind === "cleartea" && d.c.pw && d.c.pw.buffs) { delete d.c.pw.buffs.alight; delete d.c.pw.buffs.sunburnt; delete d.c.pw.buffs.rattled; }
    });
    on("buff", function (d) { var g = cur(); if (g && d && d.id === "fizz" && s2(g).tipsy && d.c && d.c.pw) d.c.pw.buffs.fizz = g.time + PW.FIZZ * 2; });
    ["tended", "stoneBoon", "heartFruit", "used2", "raised", "operated"].forEach(function (n) { on(n, function (d) { var g = cur(); if (g && d && d.c && T2.id === d.c.id) T2.fed = g.time + 4; }); });
    on("recovered", function (d) { if (d && d.c && d.c.pw && d.id === "dims") d.c.pw.dimGift = null; });
    on("grumpChased", function (d) {
      var g = pov(d); if (!g) return;
      var c = d.c, hk = Sv().heldKind ? Sv().heldKind(c) : null, im = hk ? imbOf(c, hk) : null, p = m2(c);
      if (im && im.d.id === "finder" && U.roll(c, "finder", 0.34 * im.lv)) give(g, c, K().tooth ? "tooth" : "mote", 1);
      p.chased = (p.chased || 0) + 1;
      if (p.chased % 7 === 0) touchedTablet(g, c);
      if (PW.diff(g).dmg >= 1.35 && U.roll(c, "hardDrop", 0.34)) { give(g, c, p.chased % 9 === 0 ? "arkshard" : K().tooth ? "tooth" : "mote", 1); emit("hardDrop", { c: c }); }
    });
    on("shout", function (d) {
      var g = cur(); if (!g || !d || !d.c || d.id !== "roar" || !PW.has(d.c, "bigglow", g)) return;
      var c = d.c, rl = (c.pw && c.pw.relic) || "fear", n = 0;
      if (rl === "fear") n = grumpsNear(g, c, 9, function (o) { if (!o.boss) U.sendHome(o); });
      else if (rl === "pack") near(g, c.x, c.z, 16, function (o) { if (o !== c && o.species === "smol" && o.alive && !o.asleep && n < 4 && SB.Creature.sendTo && SB.Creature.sendTo(o, c.x, c.z, g, 14)) n++; });
      else { var r = U.CAST.reveal(g, { c: c, x: c.x, z: c.z, body: true, S: inBody(c), k: 1 }); n = r.ok ? 1 : 0; }
      emit("relicRoar", { c: c, relic: rl, n: n });
    });
    on("penCollected", function (d) {
      var g = cur(), A = SB.Animals; if (!g || !d || !d.c || !d.st || !A || !A.penAnimals || !A.SP) return;
      var recs = []; try { recs = A.penAnimals(g, d.st) || []; } catch (e) { recs = []; }
      recs.forEach(function (r) { var k = r.gold && A.SP[r.k] ? A.SP[r.k].daily : null; if (k && K()[k]) give(g, d.c, k, 1); });
    });
    on("stranger", function (d) { // one stranger in four turns up sniffling: wait a day, or heal it first
      var g = cur(), c = d && d.c; if (!g || !c || !c.alive) return;
      if (dice(g, "sniff:" + c.id)() < 0.25 && PW.catchIll(g, c, "sniffles", true)) { c.chem.sick = Math.max(c.chem.sick || 0, 0.5); note(g, "🤧 the stranger at the edge is sniffling. heal it before you welcome it, or it will pass the sniffles on."); emit("sickStranger", { c: c }); }
    });
    function fell(d) { var g = cur(); if (g && d && d.c && d.items && d.items.length) s2(g).pack = { x: U.r1((d.fell || d.at || d.c).x), z: U.r1((d.fell || d.at || d.c).z), until: Math.round(g.time + 600) }; }
    on("knockout", fell); on("respawn", fell);
    on("dawn", function () { var g = cur(); if (g) dawn2(g); });
    on("possess", function () { T2 = { id: null }; tool = null; moving = null; });
    PW.DARES.forEach(function (da) {
      on(da.ev, function () {
        var g = cur(); if (!g || !PW.daresOpen(g)) return;
        var s = s2(g), v = s.dares[da.id] || 0; if (v === "done") return;
        v++; if (v >= da.n) { s.dares[da.id] = "done"; s.tokens = (s.tokens || 0) + 1; note(g, "⭐ dare done: " + da.text + ". a star token."); emit("dare", { id: da.id }); } else s.dares[da.id] = v;
      });
    });
  })();
  hook2();

  var X = SB.Ext;
  if (X) {
    X.on("damage", function (game, c, target, info) {
      var hk = info && info.hk, p = m2(c), im = hk ? imbOf(c, hk) : null, m = 1, S = inBody(c), armed = !!(hk && K()[hk] && K()[hk].tool);
      if (im) {
        var id = im.d.id, lv = im.lv;
        if (id === "keen") m += 0.15 * lv; else if (id === "trueflight") m += 0.2 * lv; else if (id === "whirl") m += 0.25 * lv; else if (id === "grudge") m += 0.4;
        else if (id === "storm" && rain(game) > 0.3) { m += 0.25 * lv; if (target && target.alive) PW.stun(game, target, 0.5 * lv); }
        else if (id === "cinder" || id === "slam" || id === "lightarrow" || id === "stonecall") {
          p.imN = (p.imN || 0) + 1;
          if (p.imN % 3 === 0) { m += id === "slam" ? 0.5 * lv : 0.3 * lv; if (target && target.alive) PW.stun(game, target, target.boss ? 0.5 : 0.6 + 0.4 * lv); emit("imbueHit", { c: c, id: id }); }
        }
      }
      if (!armed && PW.has(c, "lightclub", game)) m *= 2.5;
      if (S && has(c, "lightstaff") && S.stam > 0.06) { S.stam -= 0.04; m += 0.5; }
      if (PW.has(c, "rallied", game)) m += 0.25;
      if (PW.has(c, "bigglow", game)) m *= 2;
      if (PW.rule(game, "parts")) m *= 0.6 + 0.4 * Math.min(1, PW.cap(c, "paws", game));
      return m;
    });
    X.on("options", function (game, c, r, o, x) {
      var hk = x.hk, S = inBody(c), im;
      if (PW.has(c, "bigglow", game)) return;
      if (r && r.type === "struct" && r.kind === "glowshroom") o.use = x.op("sit under the great glowshroom", function () { var res = PW.meditate(game, c); x.say(res.msg); if (res.ok) x.audio("chime", 0.6); return res.ok; }, null);
      else if (r && r.type === "struct" && r.kind === "clayhelper" && !o.pick) o.pick = x.op("look at the helper", function () { PW.page("gifts"); x.openBag("lantern"); return true; }, null);
      else if (r && r.type === "creature" && r.ref.species === "grump" && r.ref.alive && !o.pick && !(hk && K()[hk] && K()[hk].tool) && !PW.cdLeft(game, "club") && S && S.stam >= 0.2)
        o.pick = x.op("a club of light ✨", function () { S.stam -= 0.2; st(game).cd.club = Math.round(game.time + 120); PW.buff(c, "lightclub", 45, game); x.say("✨ a club of light in your paw: bare paws hit two and a half times as hard for a while"); x.audio("chime", 0.6); emit("boundClub", { c: c }); return true; }, null);
      im = hk ? imbOf(c, hk) : null;
      if (im && im.d.id === "riptide" && !o.pick && (rain(game) > 0.3 || depthAt(game, c) > 0.02) && !PW.cdLeft(game, "rip"))
        o.pick = x.op("ride the rain 🌊", function () { var d = hop(game, c, 3 + 2 * im.lv); if (!d) { x.say("no room"); return false; } st(game).cd.rip = Math.round(game.time + 15); PW.buff(c, "dashing", 2, game); x.say("🌊 whoosh!"); emit("riptide", { c: c, d: d }); return true; }, null);
      if (sandbox(game)) {
        if (moving) o.place = x.op("put the " + (SB.STRUCTS[moving.kind] ? SB.STRUCTS[moving.kind].label : "thing") + " here", function () { var res = PW.moveStruct(game, moving, c.x + Math.sin(c.facing || 0) * 1.6, c.z + Math.cos(c.facing || 0) * 1.6); moving = null; x.say(res.msg); return res.ok; }, null);
        if (tool === "erase" && r && (r.type === "item" || r.type === "struct")) o.use = x.op("erase this 🧽", function () { var res = PW.erase(game, r); x.say(res.msg); return res.ok; }, null);
        else if (tool === "move" && r && r.type === "struct" && !moving) o.use = x.op("pick this up", function () { moving = r.ref; x.say("carry it where you want it, then put it down"); return true; }, null);
        else if (r && (r.type === "item" || r.type === "node") && !o.pick && K()[r.kind]) o.pick = x.op("copy this 🧪", function () { give(game, c, r.kind, 1); x.say("one " + label(r.kind)); return true; }, null);
      }
    });
    X.on("vitals", function (game, c) {
      var out = [], p = c.pw, s = game.quests && game.quests.powers; if (!p) return out;
      if (c.drownT > 0) out.push({ icon: "🫧", text: "air " + Math.round(PW.air(c) * 100) + "%", bad: PW.air(c) < 0.4, tip: "get to the shore. a deep-breath cap holds your air longer" });
      if (T2.id === c.id && T2.heavy) out.push({ icon: "🎒", text: "heavy", bad: true, tip: "running is slow. logs, stone and ore weigh the most" });
      if (PW.rule(game, "parts")) { var bad = PW.failed(c, game); if (bad.length) out.push({ icon: PW.PART[bad[0]].icon, text: "bad " + PW.PART[bad[0]].name + (bad.length > 1 ? " +" + (bad.length - 1) : ""), bad: true, tip: PW.PART[bad[0]].bad + ". a healer can mend it" }); }
      if (s && s.pack && s.pack.until > game.time) { var left = Math.ceil(s.pack.until - game.time); out.push({ icon: "🎒", text: "pack " + Math.floor(left / 60) + ":" + (left % 60 < 10 ? "0" : "") + (left % 60), tip: "your dropped pack. after that, friends carry it home" }); }
      return out;
    });
    X.on("goals", function (game, add) {
      var s = game.quests && game.quests.powers; if (!s) return;
      if (s.lost && !smols(game).length) add("🪺 the island is empty: call an egg for nothing (✨ magic → the Lantern's powers → gifts)", "", false, true);
      for (var id in s.goals || {}) if (s.goals[id] === "on" && PW.GOALS[id]) add("🏁 " + PW.GOALS[id].text, "day " + day(game), false);
      if (s.charge && PW.GREAT_BY[s.charge.id]) add(PW.GREAT_BY[s.charge.id].icon + " " + PW.GREAT_BY[s.charge.id].name + (game.time >= s.charge.at ? " is ready: let it go" : " is gathering"), game.time >= s.charge.at ? "ready" : Math.ceil(s.charge.at - game.time) + "s", false);
    });
  }

  /* ---------------- more sicknesses, buffs, items, buildings ---------------- */
  [{ id: "swampfever", icon: "🐸", name: "swamp fever", cause: "wading in swamp water", sym: ["hungry sooner", "less pep"], cure: "broth" },
    { id: "glooms", icon: "👻", name: "the glooms", cause: "standing by a smol not yet laid to rest", sym: ["less pep"], cure: "suntea" }].forEach(function (d) { if (!PW.ILL[d.id]) { PW.ILLS.push(d); PW.ILL[d.id] = d; } });
  var B2 = {
    alight: { icon: "🔥", text: "alight", bad: true, tip: "your fur is on fire. water puts it out" }, sunburnt: { icon: "🌞", text: "sunburnt", bad: true, tip: "a little less pep. a hat keeps the sun off" },
    icy: { icon: "🧊", text: "icy water", bad: true, tip: "the cold gets in fast. fur boots stop it" }, rattled: { icon: "💫", text: "rattled", bad: true, tip: "seeing stars: pep comes back slowly" },
    wornout: { icon: "🌘", text: "worn out", bad: true, tip: "after the big glow: no mending until you eat or sleep" }, blinked: { icon: "💠", text: "blink-dizzy", bad: true, tip: "another blink right now would sting" },
    focused: { icon: "🧘", text: "focused", tip: "powers cost a quarter less pep" }, dashing: { icon: "💫", text: "dashing", tip: "hurts cost half" }, sight: { icon: "👁", text: "sight", tip: "you see through the dark" },
    rallied: { icon: "🚩", text: "rallied", tip: "you hit a quarter harder" }, glowcloak: { icon: "🌟", text: "glow coat", tip: "singes grumps that touch you, and keeps you dry" }, lightclub: { icon: "✨", text: "club of light", tip: "bare paws hit much harder" },
    bigglow: { icon: "🌕", text: "the big glow", tip: "fast, strong, never sick. no paws for your bag" }, limber: { icon: "🍵", text: "limber", tip: "no creaky knees" }, chestlink: { icon: "🧰", text: "pocket of home", tip: "your home chest is in reach: the body page" },
    bandaged: { icon: "🩹", text: "bandaged", tip: "bound clean" }
  };
  for (var bk in B2) if (!PW.BUFFS[bk]) PW.BUFFS[bk] = B2[bk];
  (function () {
    var KK = SB.KINDS, k, d;
    if (!KK) return;
    function kind(id, o) { if (!KK[id]) KK[id] = { noun: "material", mat: 1, label: o.label, emoji: o.emoji, r: 0.13, color: o.color || 0xc8c0a8, desc: o.desc }; }
    for (k in PW.ITEMS2) kind(k, PW.ITEMS2[k]);
    for (k in PW.WEAR) { d = PW.WEAR[k]; kind(k, { label: d.label, emoji: d.emoji, desc: d.desc + (d.arm ? " armour " + d.arm + "." : ""), color: 0xb89a6a }); }
    for (k in PW.FITS) { d = PW.FITS[k]; kind(k, { label: d.label, emoji: d.emoji, desc: d.desc, color: 0x9ab0c0 }); }
    // ark shards and vials turn up in wreck lockers; scraps in ruins
    var L = SB.Loot && SB.Loot.TABLES;
    if (L && L.wreck && L.wreck.items && !L.wreck._pw) { L.wreck._pw = 1; L.wreck.items.push(["arkshard", 1, 1, 2], ["arkvial", 1, 1, 1], ["scrapheal", 1, 1, 1]); }
    if (L && L.ruin && L.ruin.items && !L.ruin._pw) { L.ruin._pw = 1; L.ruin.items.push(["scrapward", 1, 1, 1], ["scrapburst", 1, 1, 1]); }
  })();
  SB.STRUCTS = SB.STRUCTS || {};
  if (!SB.STRUCTS.glowshroom) SB.STRUCTS.glowshroom = { noun: "wonder", label: "the great glowshroom", emoji: "🍄", r: 0.9, cost: {}, work: 1, desc: "taller than a hut and humming. the tribe sings under it at night, and the Lantern's glow rises." };
  if (!SB.STRUCTS.clayhelper) SB.STRUCTS.clayhelper = { noun: "wonder", label: "helper", emoji: "🗿", r: 0.35, cost: {}, work: 1, desc: "a little thing a smol made to help. it stands where it is put and does its one job." };
  if (!SB.STRUCTS.sparktree) SB.STRUCTS.sparktree = { noun: "wonder", label: "spark tree", emoji: "🌳", r: 0.5, cost: {}, work: 1, desc: "a gift of the Lantern. it drops two sparks every morning." };
  var ME = SB.Meshes || SB.ME;
  function shroomMesh() {
    var b = ME.builder();
    b.color(0xe8e0d0).push().translate(0, 1.3, 0).box(0.5, 2.6, 0.5).pop();
    b.color(0x8c70c4).push().translate(0, 2.8, 0).box(2.4, 0.5, 2.4).pop();
    b.color(0x9c82d8).push().translate(0, 3.2, 0).box(1.6, 0.4, 1.6).pop();
    b.color(0xc9f0ff).push().translate(0.7, 2.9, 1.21).box(0.3, 0.2, 0.02).pop();
    b.color(0xc9f0ff).push().translate(-0.6, 2.9, 1.21).box(0.25, 0.18, 0.02).pop();
    b.color(0xc9f0ff).push().translate(1.21, 2.9, -0.4).box(0.02, 0.2, 0.3).pop();
    return b.finish();
  }
  function helperMesh() {
    var b = ME.builder();
    b.color(0xb98a62).push().translate(0, 0.28, 0).box(0.4, 0.56, 0.3).pop();
    b.color(0xc99a70).push().translate(0, 0.7, 0).box(0.32, 0.3, 0.28).pop();
    b.color(0x8fe8ff).push().translate(0, 0.72, 0.15).box(0.1, 0.1, 0.02).pop();
    b.color(0xb98a62).push().translate(0.27, 0.34, 0).box(0.1, 0.36, 0.12).pop();
    b.color(0xb98a62).push().translate(-0.27, 0.34, 0).box(0.1, 0.36, 0.12).pop();
    return b.finish();
  }
  function treeMesh() {
    var b = ME.builder();
    b.color(0x8a6a48).push().translate(0, 0.7, 0).box(0.28, 1.4, 0.28).pop();
    b.color(0xf0d060).push().translate(0, 1.7, 0).box(1.3, 0.9, 1.3).pop();
    b.color(0xffe890).push().translate(0, 2.3, 0).box(0.8, 0.5, 0.8).pop();
    return b.finish();
  }
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { try { ME.STRUCT_BUILDERS.glowshroom = shroomMesh; ME.STRUCT_BUILDERS.clayhelper = helperMesh; ME.STRUCT_BUILDERS.sparktree = treeMesh; } catch (e) {} }

  /* ---------------- the pages ---------------- */
  var quizA = [];
  function pct(v) { return Math.round(Math.min(1.25, v) * 100) + "%"; }
  PW.light2 = function (game, c, sky) {
    var s = s2(game), S = inBody(c), out = "", a = PW.align(game), simple = set(game).simple;
    out += lbl("the Lantern's glow: level <b>" + PW.link(game) + "</b> of 6 (" + Math.round(s.glow) + ") · " + (a.id === "kind" ? "a kind light: mending is stronger" : a.id === "harsh" ? "a harsh light: bursts are stronger, mending weaker" : "an even light") + ((s.wishes || 0) > 0 ? " · 🪔 " + s.wishes + " wishes" : "")) + "<div class='rlist'>";
    if (S) out += rc("🧘", "sit quietly", "by a stone, the great glowshroom, a shrine or under clear stars: pep back and the glow rises" + (s.focusWord && PW.WORD[s.focusWord] ? " · your word: " + esc(PW.WORD[s.focusWord].name) : ""), b2("med", PW.cdLeft(game, "med") > 0 ? Math.ceil(PW.cdLeft(game, "med")) + "s" : "sit", PW.cdLeft(game, "med") > 0, true));
    else if (c) out += rc("👆", "wake what stands near " + esc(c.name), "a stone or the great glowshroom beside the smol you picked", b2("skyuse", "wake"));
    if (S && PW.has(c, "glowing", game) || (S && PW.link(game) >= 3 && game.world.night)) out += rc("🌕", "the big glow", "once a night: fast, strong, never sick, no paws for your bag. you wake worn out", b2("bigglow", "let it out", false, true));
    out += "</div>";
    if (simple) return out;
    out += lbl("more words · an ember each level") + "<div class='rlist'>";
    PW.WORDS2.forEach(function (w) {
      var L = PW.wordLevel(game, w.id), left = PW.cdLeft(game, "w:" + w.id), why = PW.whyNotWord(game, w.id), dots = ""; for (var i = 0; i < 3; i++) dots += i < L ? "●" : "○";
      out += rc(w.icon, esc(w.name) + " " + dots, esc(w.desc), (L && S ? btn("pwsay", w.id, left > 0 ? Math.ceil(left) + "s" : "say", left > 0, left <= 0) : "") + (L < 3 ? "<button class='btn' data-pw2='word:" + w.id + "' title='" + esc(why) + "'" + (why ? " disabled" : "") + ">1 🔥</button>" : ""));
    });
    out += "</div>" + lbl("great lights · a fallen captain wakes each one") + "<div class='rlist'>";
    PW.GREAT.forEach(function (g) {
      var open = beaten(game) >= g.need, ch = s.charge && s.charge.id === g.id, left = PW.cdLeft(game, "g:" + g.id);
      out += rc(g.icon, esc(g.name), esc(g.desc) + " · " + g.cost + " ✨, then a long gathering", !open ? "<small>" + g.need + " captain" + (g.need > 1 ? "s" : "") + "</small>" : b2("great:" + g.id, left > 0 ? "tomorrow" : ch ? (game.time >= s.charge.at ? "let it go" : Math.ceil(s.charge.at - game.time) + "s") : "gather", left > 0 || (ch && game.time < s.charge.at), ch));
    });
    out += "</div>";
    if (S) {
      var big = PW.TREE.filter(function (n) { return n.kind === "cast" && PW.owns(game, n.id) && n.id !== "slow" && !PW.cdLeft(game, n.id); });
      if (big.length) { out += lbl("with both paws · twice the pep, much stronger") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>"; big.forEach(function (n) { out += b2("big:" + n.id, n.icon + " big " + n.name); }); out += "</div>"; }
    }
    return out;
  };
  PW.you2 = function (game, c, icon) {
    var p = m2(c), out = "", S = inBody(c);
    out += lbl("worn · armour <b>" + PW.armour(c) + "</b> · " + Math.round(PW.resist(c, "bite") * 100) + "% off a bite") + "<div class='rlist'>";
    PW.SLOTS.forEach(function (sl) { var k = p.wear[sl[0]], w = PW.WEAR[k]; out += rc(w ? w.emoji : sl[1], w ? esc(w.label) + (PW.imbueName(c, k) ? " · " + esc(PW.imbueName(c, k)) : "") : "<small style='display:inline;opacity:.7'>" + sl[0] + ": nothing</small>", w ? esc(w.desc) : "", w ? b2("off:" + sl[0], "take off") : ""); });
    out += "</div>";
    if (PW.rule(game, "parts")) {
      out += lbl("what your body can do") + "<div class='rlist'>";
      PW.PARTS.forEach(function (d) {
        var v = PW.cap(c, d.id, game), raw = PW.part(c, d.id), f = PW.FITS[p.fit[d.id]], old = !f && v < raw;
        if (v >= 1 && !f) return;
        out += rc(d.icon, esc(d.name) + " · " + d.cap + " " + pct(v), f ? esc(f.label) + " fitted" : v < PW.FAIL ? esc(d.bad) : old ? "old age: " + (d.id === "legs" ? "a walking stick or joint tea helps" : "crystal glasses help") : "mending with rest", f ? b2("unfit:" + d.id, "take off") : raw < 0.8 ? b2("operate:" + d.id, "mend") : "");
      });
      if (!PW.PARTS.some(function (d) { return PW.cap(c, d.id, game) < 1 || p.fit[d.id]; })) out += "<p class='help'>every part is whole. hard knocks hurt paws, legs, ears, tail and eyes; sickness, hunger and bad food wear the heart, lungs and tummy.</p>";
      out += "</div>";
    }
    var ill = PW.illOf(c);
    if (ill) out += lbl("the race") + "<div class='rlist'>" + rc("🏁", "getting over it " + Math.min(100, Math.round(ill.heal / PW.ILL_REST * 100)) + "% · getting worse " + Math.min(100, Math.round((ill.w || 0) / PW.ILL_WORSE * 100)) + "%", ill.id === "dims" && ill.stage >= 2 ? "the dims is past resting off: sun tea, or a healer" : "resting counts three times. whichever fills first wins") + "</div>";
    if (ill && ill.id === "dims") {
      out += lbl("what the dims gives, and takes") + "<div class='rlist'>";
      PW.DIMG.forEach(function (g) { out += rc(g.icon, esc(g.name), esc(g.desc), p.dimGift === g.id ? "<span class='ok'>✓</span>" : p.dimGift ? "" : b2("dimgift:" + g.id, "take")); });
      if (p.dimGift === "step" && S) out += rc("💨", "shadow step", "at night", b2("sstep", "step"));
      out += "</div>";
    }
    if (S) { out += lbl("the big glow wears") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>"; PW.RELICS.forEach(function (r) { out += "<button class='btn" + ((p.relic || "fear") === r.id ? " go" : "") + "' data-pw2='relic:" + r.id + "' title='" + esc(r.desc) + "'>" + r.icon + " " + esc(r.name) + "</button>"; }); out += "</div>"; }
    if (c.title) out += lbl("a favour for " + esc(c.name) + " " + esc(c.title) + " · once a day") + "<div class='row' style='display:flex;gap:4px'>" + b2("favour:food", "🧺 a basket of food") + b2("favour:help", "🙋 help") + "</div>";
    var up = [];
    if (p.up.pep) up.push("inner light +" + p.up.pep); if (p.up.luck) up.push("luck +" + p.up.luck); if (p.up.heart) up.push("heart +" + p.up.heart);
    Object.keys(p.gift).forEach(function (k) { if (PW.GIFT[k]) up.push(PW.GIFT[k].name); });
    if (p.back) up.push("came back, a little see-through"); if (p.tan) up.push("sun-bleached fur ×" + p.tan);
    if (up.length) out += lbl("for good") + "<p class='help'>" + esc(up.join(" · ")) + "</p>";
    if (PW.chestOpen(game, c)) {
      out += lbl("🧰 your home chest") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
      SB.Home.chest(game).forEach(function (sl, i) { if (sl) out += b2("chest:" + i, icon(sl.k, 16) + " " + esc(label(sl.k)) + " ×" + sl.n); });
      out += b2("chestput", "put away what you hold", !Sv().held(c)) + "</div>";
    }
    return out;
  };
  function gearHtml(game, c, icon) {
    var p = m2(c), out = "", sl = Sv().held(c), hk = sl ? sl.k : null, why = PW.benchWhy(game, c);
    var things = []; if (hk && Object.keys(PW.fams(hk)).length) things.push(hk);
    for (var k in p.wear) if (Object.keys(PW.fams(p.wear[k])).length && things.indexOf(p.wear[k]) < 0) things.push(p.wear[k]);
    out += lbl("imbue · the thing in your paw, and what you wear") + "<div class='rlist'>";
    if (why) out += "<p class='help'>" + esc(why) + ".</p>";
    if (!things.length) out += "<p class='help'>hold a tool or a weapon, or wear something, and three imbues are offered each day. one imbue a thing.</p>";
    things.forEach(function (kd) {
      out += rc(icon(kd, 22), esc(label(kd)), PW.imbueName(c, kd) ? esc(PW.imbueName(c, kd)) : "plain", PW.imbueName(c, kd) ? b2("unimbue:" + kd, "wash off") : "");
      PW.offers(game, c, kd).forEach(function (o, i) {
        out += rc(o.d.icon, esc(o.d.name) + " " + ["", "I", "II", "III"][o.lv] + (o.d.curse ? " <small style='display:inline;opacity:.7'>grump-touched</small>" : ""), esc(o.d.desc), b2("imbue:" + kd + ":" + i, o.cost + " ✨", !!why, !why) + b2("imbueskill:" + kd + ":" + i, "a skill level", !!why) + b2("carve:" + kd + ":" + i, "🪧", !!why));
      });
      p.tabs.forEach(function (t, ti) { var d = PW.IMB[t.id]; if (d && PW.fams(kd)[d.fam]) out += rc("🪧", "tablet: " + esc(d.name) + " " + ["", "I", "II", "III"][t.lv], esc(d.desc), b2("tablet:" + kd + ":" + ti, "put on", !has(c, "tablet"), true)); });
    });
    if (p.tabs.length) out += "<p class='help'>" + p.tabs.length + " carved tablet" + (p.tabs.length > 1 ? "s" : "") + ": " + esc(p.tabs.map(function (t) { return PW.IMB[t.id] ? PW.IMB[t.id].name : "?"; }).join(", ")) + ".</p>";
    out += "</div>";
    [["wear", "things to wear"], ["part", "parts a healer fits"], ["magic", "odds and ends"]].forEach(function (g) {
      out += lbl(g[1]) + "<div class='rlist'>";
      PW.RECIPES2.forEach(function (r) {
        if (r.group !== g[0] || !K()[r.id]) return;
        var need = [], have = Sv().count(c, r.id, true);
        for (var k2 in r.in) { var n = Sv().count(c, k2, true); need.push("<span class='" + (n >= r.in[k2] ? "ok" : "no") + "'>" + icon(k2, 16) + " " + Math.min(n, r.in[k2]) + "/" + r.in[k2] + "</span>"); }
        out += rc(icon(r.id, 24), esc(label(r.id)) + (have ? " ×" + have : ""), esc(K()[r.id].desc) + (r.at ? " · by a fire" : "") + "<div class='need'>" + need.join(" ") + "</div>", (have && PW.USE2[r.id] ? b2("use:" + r.id, g[0] === "wear" ? "wear" : g[0] === "part" ? "fit" : "use", false, true) : "") + b2("make:" + r.id, "make", !!PW.whyNotMake2(game, c, r.id)));
      });
      out += "</div>";
    });
    var pets = PW.sickPets(game);
    if (pets.length) { out += lbl("sniffling animals") + "<div class='rlist'>"; pets.forEach(function (r, i) { out += rc("🤧", esc(r.name || "an animal"), "healroot, or a smol who knows herb lore", b2("pet:" + i, "tend", false, true)); }); out += "</div>"; }
    return out;
  }
  function giftsHtml(game, c, icon, sky) {
    var s = s2(game), out = "", S = inBody(c), simple = set(game).simple;
    out += lbl("gifts of the Lantern · sparks: <b>" + Math.round(game.sparks || 0) + "</b>" + (c ? " · for " + esc(c.name) : " · tap a smol for the ones marked 🐾")) + "<div class='rlist'>";
    PW.SHOP.forEach(function (o) {
      var kd = o.item ? K()[o.item] : null; if (o.item && !kd) return;
      var cost = PW.price(game, o.id);
      out += rc(kd ? kd.emoji : o.icon, esc(kd ? kd.label : o.name) + (o.smol ? " 🐾" : ""), esc(kd ? kd.desc : o.desc), b2("buy:" + o.id, cost ? cost + " ✨" : "free", (o.smol && !c) || (game.sparks || 0) < cost, !((o.smol && !c) || (game.sparks || 0) < cost)));
    });
    out += "</div>";
    if (simple) return out;
    if (c) {
      var sl = Sv().held(c), tw = sl ? PW.TWIN[sl.k] : null;
      out += lbl("memory") + "<div class='rlist'>";
      out += rc("🫧", "the memory pool", sl && tw && K()[tw] ? "your " + esc(label(sl.k)) + " for a " + esc(label(tw)) : "hold a stick, a stone, a berry... and it comes back as its twin. free under the great glowshroom", b2("twin", shroomNear(game, c) ? "free" : "2 ✨", !(tw && K()[tw])));
      out += rc("🔬", "remember a thing", sl ? esc(label(sl.k)) + ": " + (s.research[sl.k] || 0) + " of " + PW.researchNeed(sl.k) + " handed in" : "hold a thing and hand in enough of it. then the Lantern can make more for sparks", b2("research", "hand in", !sl || PW.researched(game, sl.k)));
      Object.keys(s.research).forEach(function (k) { if (PW.researched(game, k)) out += rc(icon(k, 20), esc(label(k)), "remembered", b2("conjure:" + k, (sandbox(game) ? 0 : K()[k].tool ? 6 : 2) + " ✨")); });
      out += "</div>" + lbl("star rites · a thinker and thought crystals") + "<div class='rlist'>";
      PW.RITES.forEach(function (r) { var left = PW.cdLeft(game, "r:" + r.id); out += rc(r.icon, esc(r.name), esc(r.desc) + " · " + r.cost + " 💎", b2("rite:" + r.id, left > 0 ? "tomorrow" : "do it", left > 0 || (c.tier < 5 && !sandbox(game)))); });
      out += "</div>" + lbl("helpers · " + PW.helpers(game).length + " standing") + "<div class='rlist'>";
      PW.helpers(game).forEach(function (h, i) { var d = PW.HELPERS[h.kind]; out += rc(d.icon, esc(d.name), "made by " + esc(h.by || "?") + " · " + (h.n || 0) + " jobs done", (S ? b2("hcall:" + i, "come here") : "") + b2("hgone:" + i, "rest")); });
      Object.keys(PW.HELPERS).forEach(function (k) { var d = PW.HELPERS[k]; out += rc(d.icon, "make a " + esc(d.name), esc(d.desc) + " · " + esc(PW.costText({ in: d.cost })), b2("helper:" + k, "make")); });
      out += "</div>";
    }
    if (PW.daresOpen(game)) {
      out += lbl("dares · star tokens: <b>" + (s.tokens || 0) + "</b>") + "<div class='rlist'>";
      PW.DARES.forEach(function (d) { var v = s.dares[d.id] || 0; out += rc(d.icon, esc(d.text), v === "done" ? "done" : v + " of " + d.n, v === "done" ? "<span class='ok'>✓</span>" : ""); });
      Object.keys(PW.TOKENS).forEach(function (k) { if (K()[k]) out += rc(K()[k].emoji, esc(label(k)), esc(K()[k].desc), b2("token:" + k, PW.TOKENS[k] + " ⭐", !c || (s.tokens || 0) < PW.TOKENS[k])); });
      out += "</div>";
    }
    var M = SB.Mine, mine = M && M.get ? M.get(game) : null, sec = s.second != null ? SB.Game.byId(game, s.second) : null;
    if (mine) out += lbl("two families") + "<div class='rlist'>" + rc("👥", "your smol: " + esc(mine.name), sec && sec.alive ? "second: " + esc(sec.name) : "pick another smol as your second, then swap between them", (c && c !== mine ? b2("second", "make " + esc(c.name) + " second") : "") + (sec && sec.alive ? b2("swap", "swap", false, true) : "")) + "</div>";
    return out;
  }
  PW.modes2 = function (game, c) {
    var s = s2(game), se = set(game), out = "";
    if (se.simple) return lbl("simple mode") + "<div class='rlist'>" + rc("🧸", "simple mode", "fewer panels. turn it off for everything else", b2("tog:simple", "on", false, true)) + "</div>";
    out += lbl("the island itself · changes from now on") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    Object.keys(PW.KNOBS2).forEach(function (k) { out += b2("knob:" + k, PW.KNOBS2[k][0] + ": " + PW.knobVal(game, k)); });
    out += "</div>" + lbl("more ways to play") + "<div class='rlist'>";
    Object.keys(T2X).forEach(function (k) { var t = T2X[k]; out += rc(t[0], t[1], esc(t[2]), btn("pwtog", k, se[k] ? "on" : "off", false, !!se[k])); });
    out += "</div>" + lbl("island rules · on unless you say") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    Object.keys(PW.RULES).forEach(function (k) { out += "<button class='btn" + (PW.rule(game, k) ? " go" : "") + "' data-pw2='rule:" + k + "' title='" + esc(PW.RULES[k][2]) + "'>" + PW.RULES[k][0] + " " + PW.RULES[k][1] + "</button>"; });
    out += "</div>" + lbl("the tribe's way" + (s.way ? "" : " · pick one")) + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    PW.WAYS.forEach(function (w) { out += "<button class='btn" + (s.way === w.id ? " go" : "") + "' data-pw2='way:" + w.id + "' title='" + esc(w.desc) + "'" + (s.way && !PW.startOpen(game) ? " disabled" : "") + ">" + w.icon + " " + esc(w.name) + "</button>"; });
    out += "</div>";
    if (PW.startOpen(game)) {
      out += lbl("a new island · the first two days only") + "<div class='rlist'>";
      Object.keys(PW.CATS).forEach(function (cat) {
        var got = s.start[cat];
        out += rc("", "<b>" + PW.CATS[cat] + "</b>", got ? esc(PW.START[got].icon + " " + PW.START[got].name) : "");
        if (!got) PW.STARTS.forEach(function (o) { if (o.cat === cat) out += rc(o.icon, esc(o.name), esc(o.desc), b2("start:" + o.id, "choose")); });
      });
      out += rc("🎲", "the founders again", "new colours and a new knack each. three tries", b2("reroll", "re-roll", (s.rerolls || 0) >= 3));
      if (!s.quiz) {
        PW.QUIZ.forEach(function (q, i) { out += rc("❔", esc(q.q), "", q.a.map(function (a, j) { return "<button class='btn" + (quizA[i] === j ? " go" : "") + "' data-pw2='quiz:" + i + ":" + j + "'>" + esc(a[0]) + "</button>"; }).join("")); });
      }
      out += "</div>";
    }
    out += lbl("a secret word") + "<div class='row' style='display:flex;gap:4px'><input class='inp' data-pw2in='secret' placeholder='say it to the island' style='flex:1;min-width:0'>" + b2("secret", "say") + "</div>";
    if (PW.quirks(game).length) out += "<p class='help'>this island: " + esc(PW.quirks(game).map(function (q) { return SB.QUIRKS[q] ? SB.QUIRKS[q].icon + " " + SB.QUIRKS[q].name : q; }).join(" · ")) + "</p>";
    if (se.handsOff) out += "<p class='help'>" + esc(PW.report(game)) + "</p>";
    if (!sandbox(game)) out += lbl("sandbox") + "<div class='rlist'>" + rc("🧪", "make this a sandbox island", "free miracles, every item, a console. no score, and no going back", b2("sandbox", "do it")) + "</div>";
    return out;
  };
  var CAT = { food: "🍎 food", material: "🪵 stuff", tool: "🪓 tools", other: "✨ the rest" };
  function catOf(d) { return d.tool ? "tool" : d.food ? "food" : d.mat || d.noun === "material" || d.noun === "stick" || d.noun === "stone" ? "material" : "other"; }
  function sandHtml(game, c, icon) {
    var out = "", s = s2(game), k;
    out += lbl("the hour and the sky") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    ["dawn", "noon", "dusk", "night"].forEach(function (t) { out += b2("cmd:time " + t, t); });
    ["clear", "rain", "storm", "free"].forEach(function (t) { out += "<button class='btn" + ((s.wlock || "free") === t ? " go" : "") + "' data-pw2='cmd:weather " + t + "'>" + t + "</button>"; });
    out += "</div>" + lbl("tools") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
    out += "<button class='btn" + (tool === "erase" ? " go" : "") + "' data-pw2='tool:erase'>🧽 eraser</button><button class='btn" + (tool === "move" ? " go" : "") + "' data-pw2='tool:move'>✋ move buildings</button>" + b2("reach", "🦒 long reach");
    ["t0", "t3", "t5", "egg", "grump", "food"].forEach(function (t) { out += b2("cmd:spawn " + t, "+" + t); });
    out += "</div>";
    if (c) {
      out += lbl(esc(c.name) + "'s needs") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + b2("cmd:heal", "💚 all better");
      ["hunger", "tired", "fear", "cold", "sick", "toxin", "pain", "lonely", "bored", "anger"].forEach(function (ck) { if (ck in c.chem) out += b2("cmd:chem " + ck + " " + (c.chem[ck] > 0.5 ? 0 : 1), ck + " " + Math.round(c.chem[ck] * 100) + "%"); });
      out += "</div>" + lbl("every thing there is") + "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
      Object.keys(CAT).forEach(function (g) { out += "<button class='btn" + (catGroup === g ? " go" : "") + "' data-pw2='cat:" + g + "'>" + CAT[g] + "</button>"; });
      out += "</div><div class='row' style='display:flex;flex-wrap:wrap;gap:3px;max-height:240px;overflow:auto'>";
      for (k in K()) if (catOf(K()[k]) === catGroup && K()[k].label) out += "<button class='btn' data-pw2='cmd:give " + k + "' title='" + esc(K()[k].label) + "'>" + icon(k, 16) + " " + esc(K()[k].label) + "</button>";
      out += "</div>";
    }
    out += lbl("the console") + "<div class='row' style='display:flex;gap:4px'><input class='inp' data-pw2in='cmd' placeholder='help' style='flex:1;min-width:0'>" + b2("run", "run") + "</div>";
    return out;
  }
  PW.PAGES2 = [
    { id: "gear", label: "🔮 gear", show: function (game, c) { return !!c && !set(game).simple; }, html: gearHtml },
    { id: "gifts", label: "🎁 gifts", show: function () { return true; }, html: giftsHtml },
    { id: "sand", label: "🧪 sandbox", show: function (game) { return sandbox(game); }, html: sandHtml }
  ];
  // every button on the round 2 pages goes through here: "verb:arg:arg"
  PW.ACTS = {
    med: function (g, c) { return PW.meditate(g, c, s2(g).lastWord); }, skyuse: function (g, c) { return PW.skyUse(g, c); }, bigglow: function (g, c) { return PW.bigGlow(g, c); },
    word: function (g, c, a) { return PW.learnWord(g, a[0]); }, great: function (g, c, a) { return PW.great(g, a[0]); }, big: function (g, c, a) { return PW.cast(g, a[0], c, null, true); },
    off: function (g, c, a) { return PW.takeOff(g, c, a[0]); }, unfit: function (g, c, a) { return PW.unfit(g, c, a[0]); }, operate: function (g, c, a) { return PW.operate(g, c, a[0]); },
    dimgift: function (g, c, a) { return PW.dimGift(g, c, a[0]); }, sstep: function (g, c) { return PW.shadowStep(g, c); }, relic: function (g, c, a) { return PW.setRelic(g, c, a[0]); },
    favour: function (g, c, a) { return PW.favour(g, c, a[0]); }, chest: function (g, c, a) { return PW.chestTake(g, c, +a[0]); }, chestput: function (g, c) { return PW.chestPut(g, c); },
    imbue: function (g, c, a) { return PW.imbue(g, c, a[0], +a[1]); }, imbueskill: function (g, c, a) { return PW.imbue(g, c, a[0], +a[1], "skill"); }, carve: function (g, c, a) { return PW.carve(g, c, a[0], +a[1]); },
    tablet: function (g, c, a) { return PW.useTablet(g, c, a[0], +a[1]); }, unimbue: function (g, c, a) { return PW.unimbue(g, c, a[0]); },
    make: function (g, c, a) { return PW.make2(g, c, a[0]); }, use: function (g, c, a) { return PW.use(g, c, a[0]); }, pet: function (g, c, a) { return PW.tendPet(g, c, PW.sickPets(g)[+a[0]]); },
    buy: function (g, c, a) { return PW.buy(g, a[0], c, c ? null : U.skyAt(g)); }, twin: function (g, c) { return PW.twin(g, c); }, research: function (g, c) { return PW.research(g, c); }, conjure: function (g, c, a) { return PW.conjure(g, c, a[0]); },
    rite: function (g, c, a) { return PW.rite(g, c, a[0]); }, helper: function (g, c, a) { return PW.makeHelper(g, c, a[0]); }, hcall: function (g, c, a) { return PW.callHelper(g, c, +a[0]); }, hgone: function (g, c, a) { return PW.dismissHelper(g, +a[0]); },
    token: function (g, c, a) { return PW.tokenBuy(g, c, a[0]); }, second: function (g, c) { return PW.second(g, c); }, swap: function (g) { return PW.swapMine(g); },
    knob: function (g, c, a) { var v = PW.knob2(g, a[0]); return v ? ok(PW.KNOBS2[a[0]][0] + ": " + v) : fail("no such knob"); }, tog: function (g, c, a) { return PW.toggle(g, a[0]) ? ok(PW.TOGGLES[a[0]][1] + (PW.on(g, a[0]) ? " on" : " off")) : fail("no"); },
    rule: function (g, c, a) { PW.setRule(g, a[0], !PW.rule(g, a[0])); return ok(PW.RULES[a[0]][0] + " " + PW.RULES[a[0]][1] + (PW.rule(g, a[0]) ? ": on" : ": off")); },
    way: function (g, c, a) { return PW.setWay(g, a[0]); }, start: function (g, c, a) { return PW.start(g, a[0]); }, reroll: function (g) { return PW.reroll(g); },
    quiz: function (g, c, a) { quizA[+a[0]] = +a[1]; for (var i = 0; i < PW.QUIZ.length; i++) if (quizA[i] == null) return ok(""); var r = PW.quiz(g, quizA); quizA = []; return r; },
    secret: function (g, c, a, text) { return PW.secret(g, text); }, sandbox: function (g) { return PW.makeSandbox(g); },
    cmd: function (g, c, a) { return PW.command(g, c, a.join(":")); }, run: function (g, c, a, text) { return PW.command(g, c, text); },
    tool: function (g, c, a) { PW.sandTool(tool === a[0] ? null : a[0]); return ok(tool === "erase" ? "🧽 look at a thing and erase it" : tool === "move" ? "✋ look at a building and pick it up" : "tool put away"); },
    reach: function (g) { return PW.longReach(g); }, cat: function (g, c, a) { catGroup = a[0]; return ok(""); }
  };
  PW.act = function (game, c, v, text) {
    var a = String(v).split(":"), fn = PW.ACTS[a[0]];
    if (!fn) return fail("?");
    if (!c && { med: 1, bigglow: 1, off: 1, unfit: 1, operate: 1, dimgift: 1, sstep: 1, relic: 1, favour: 1, chest: 1, chestput: 1, imbue: 1, imbueskill: 1, carve: 1, tablet: 1, unimbue: 1, make: 1, use: 1, pet: 1, twin: 1, research: 1, conjure: 1, rite: 1, helper: 1, hcall: 1, token: 1, big: 1 }[a[0]]) return fail("pick a smol first");
    return fn(game, c, a.slice(1), text);
  };
  PW.wire2 = function (root, game, c, redraw, say, sky, done, each) {
    each("pw2", function (v, b) {
      var inp = null, verb = String(v).split(":")[0];
      if (verb === "secret" || verb === "run") { var L = root.querySelectorAll("[data-pw2in]"); for (var i = 0; i < L.length; i++) if (L[i].getAttribute("data-pw2in") === (verb === "run" ? "cmd" : "secret")) inp = L[i]; }
      done(PW.act(game, c, v, inp ? inp.value : ""), verb === "buy" || verb === "great" ? "chime" : "craft");
    });
  };
  // the last word you said is the one a stone offers to make yours
  if (SB.bus) SB.bus.on("shout", function (d) { var g = cur(); if (g && d && d.id) s2(g).lastWord = d.id; });
})();
