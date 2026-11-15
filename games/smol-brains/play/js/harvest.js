/* smol brains — harvest.js ("the farm, the kitchen and the water").
   Until now a farm grew one crop by itself, fishing was one roll of the dice and cooking made one "cooked food".
   This file gives the three of them some character, all of it done with a smol's own paws:
     fishing    cast, wait, and hook the bite inside a short window (the big button does it). Nineteen fish by water
                (sea, river, pond), season, weather, time of day and biome, with rarity, size and five great fish you
                catch once. Bait, lures, chum, bubbling spots, junk, pod crates, a better rod, and a crab pot you leave.
     beds       till a garden bed with a hoe, sow it, water it (a pot or a leaf cup you fill; rain does it for you),
                feed it compost. Thirteen crops by season, some regrow, some grow giant. Care gives stars. Birds peck
                beds with no scarecrow. The season turning withers what is out of season. The tribe's farms can be
                watered, fed and told what to grow.
     kitchen    named dishes from real ingredients at a lit fire, each a food with a timed boost (pep, warmth, harder
                hits, quicker feet, luck, mending, a keen eye, green paws) shown as a chip by the hearts. Drinks have a
                slot of their own. Recipes are found by trying, or come with cooking levels.
     machines   a drying rack, a smoker, a crock, a quern, a compost heap, a bee box: small buildings that turn
                produce into better goods over time. A water pipe and a scarecrow help the beds.
     foraging   look under trees and in patches: a different find each season, seeds of the wild crops, and sap from
                a tapped tree.
     almanac    one bag tab ("harvest") with the cookbook, the things to make, the fish log and the crop log.
   State: game.quests.harvest = { fish: {id: {n, best, d}}, dishes: {id: {n, d}}, crops: {id: {n, q, g}}, forage: {},
   taps: {nodeId: t}, casts, lureFor, chum, dug } (saved with the quest board). A bed's crop and a machine's load live
   on the building (b.data), boosts and carried water on the smol (c.buff, c.sip). Rolls its own dice. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var H = SB.Harvest = {};
  var K = SB.KINDS, SK = SB.STRUCTS, NK = SB.NODES;
  if (!K || !SK) return;

  function Sv() { return SB.Surv || SB.Survival; }
  function Ps() { return SB.Possess; }
  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  var KEYS = ["fish", "dishes", "crops", "forage", "taps"];
  function st(game) {
    var q = Q(game);
    if (!q.harvest || typeof q.harvest !== "object") q.harvest = {};
    var s = q.harvest;
    KEYS.forEach(function (k) { if (!s[k] || typeof s[k] !== "object") s[k] = {}; });
    if (typeof s.casts !== "number") s.casts = 0;
    return s;
  }
  H.state = st;
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function season(game) { return game.world && game.world.season ? game.world.season | 0 : 0; }
  function raining(game) { var w = game.world && game.world.weather; return !!w && (w.rain || 0) > 0.3; }
  function label(k) { return K[k] && K[k].label ? K[k].label : k; }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(game, key) { return SB.rng((hashKey(key) ^ (game.seed >>> 0)) >>> 0); }
  function lv(c, id) { return SB.Body && c ? SB.Body.level(c, id) : 0; }
  function bonus(c, id) { return SB.Body && c ? SB.Body.bonus(c, id) : 0; }
  function xp(c, id, n) { if (SB.Body && c) SB.Body.xp(c, id, n); }
  function r1(v) { return Math.round(v * 10) / 10; }
  function emit(ev, d) { if (SB.bus) SB.bus.emit(ev, d); }
  function say(msg) { var P = Ps(); if (msg && P && P.active && P.say) P.say(msg); }
  function sound(name) { var P = Ps(); if (SB.Audio && SB.Audio.play && !(P && P.headless)) SB.Audio.play(name); }
  function mark(game, b) { if (SB.World && SB.World.markNode) SB.World.markNode(game.world, b); }
  function give(game, c, kind, n) {
    if (!K[kind] || n <= 0) return 0;
    var left = Sv().add(c, kind, n);
    if (left > 0 && Sv().spawn) Sv().spawn(game, kind, left, c.x + 0.5, c.z + 0.3, { by: c.id });
    return left;
  }
  function biomeId(game, x, z) { var b = SB.BIOMES && SB.World ? SB.BIOMES[SB.World.biomeAt(game.world, x, z)] : null; return b ? b.id : ""; }
  function waterNear(game, x, z, r) {
    var W = SB.World, w = game.world;
    if (W.depthAt(w, x, z) > 0.05) return { x: x, z: z };
    for (var d = 0.8; d <= r; d += 0.8) for (var a = 0; a < 6.28; a += 0.785) { var px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d; if (W.depthAt(w, px, pz) > 0.05) return { x: px, z: pz }; }
    return null;
  }
  var SEASON = SB.SEASONS || ["spring", "summer", "autumn", "winter"];
  function seasonsText(s) { return !s || s.length >= 4 ? "all year" : s.map(function (i) { return SEASON[i]; }).join(" and "); }

  /* ================= the new things ================= */
  var SHAPE = {}; // kind -> the little model it gets (see the bottom of the file)
  function kind(id, shape, def) { if (!K[id]) { if (def.r == null) def.r = 0.14; K[id] = def; } SHAPE[id] = shape; return K[id]; }
  function food(id, shape, lab, emoji, color, hunger, desc, extra) {
    var d = { noun: "food", label: lab, emoji: emoji, color: color, food: { hunger: -hunger }, chem: { glucose: Math.round(hunger * 50) / 100 }, rots: 900, desc: desc };
    for (var k in extra || {}) d[k] = extra[k];
    return kind(id, shape, d);
  }
  function mat(id, shape, lab, emoji, color, desc) { return kind(id, shape, { noun: "material", label: lab, emoji: emoji, color: color, mat: 1, desc: desc }); }
  var TOOLS = {};
  function tool(id, lab, emoji, color, verb, desc, pow) { kind(id, "tool", { noun: "tool", label: lab, emoji: emoji, r: 0.15, color: color, tool: verb, desc: desc }); TOOLS[id] = pow; }

  /* ---- fish: where, when, how rare (1 common .. 4 a great fish, caught once), how long in cm ---- */
  H.FISH = [];
  var FISH_BY = H.FISH_BY = {};
  function fish(id, lab, emoji, color, w, o) {
    var f = { id: id, label: lab, emoji: emoji, w: w, s: o.s || null, t: o.t || "", wx: o.wx || "", rare: o.rare || 1, min: o.min, max: o.max, b: o.b || null, pot: !!o.pot };
    H.FISH.push(f); FISH_BY[id] = f;
    food(id, "fish", lab, emoji, color, o.hunger || 0.4, o.desc, { raw: !o.safe, rots: 240, chem: { glucose: 0.2, fat: 0.3 }, glow: o.glow ? 1 : undefined, r: 0.16 });
    return f;
  }
  fish("minnow", "minnow", "🐟", 0xa9c4cf, ["river", "pond"], { rare: 1, min: 4, max: 9, hunger: 0.2, desc: "tiny and everywhere in fresh water. good bait, small supper." });
  fish("silverling", "silverling", "🐟", 0xc9d6e2, ["sea"], { rare: 1, min: 8, max: 16, hunger: 0.25, desc: "flashes in the shallows of the sea, all year." });
  fish("mudcarp", "mud carp", "🐟", 0x9a8a5a, ["pond"], { s: [0, 1, 2], rare: 2, min: 25, max: 60, hunger: 0.5, desc: "a fat pond fish. sleeps under the ice all winter." });
  fish("trout", "brook trout", "🐟", 0x8fae7a, ["river"], { s: [0, 2], rare: 2, min: 20, max: 45, hunger: 0.45, desc: "likes cool running water: spring and autumn rivers." });
  fish("leaper", "silver leaper", "🐠", 0xe58a6a, ["river"], { s: [2], rare: 3, min: 40, max: 85, hunger: 0.6, desc: "swims up the rivers in autumn. strong on the line." });
  fish("whiskerfish", "whiskerfish", "🐟", 0x6a6a72, ["river", "pond"], { wx: "r", rare: 2, min: 30, max: 70, hunger: 0.5, desc: "only comes up to feed when it rains." });
  fish("puffer", "puffer", "🐡", 0xe8c86a, ["sea"], { s: [1], t: "d", rare: 2, min: 12, max: 30, hunger: 0.35, desc: "a round summer fish of sunny seas. very cross about being caught." });
  fish("flatfish", "flatfish", "🐟", 0xb8a888, ["sea"], { s: [0, 2, 3], rare: 2, min: 20, max: 50, hunger: 0.45, desc: "lies on the sea floor pretending to be sand." });
  fish("mooneel", "moon eel", "🐍", 0x4a5a8a, ["sea", "river"], { t: "n", rare: 3, min: 50, max: 110, hunger: 0.55, desc: "long, dark and only out at night." });
  fish("icefin", "icefin", "🐟", 0xbfe6f5, ["pond", "river"], { s: [3], rare: 2, min: 15, max: 35, hunger: 0.4, desc: "a pale winter fish. the cold doesn't bother it." });
  fish("sunperch", "sunperch", "🐠", 0xf2a23a, ["pond"], { s: [1], t: "d", wx: "c", rare: 2, min: 15, max: 30, hunger: 0.4, desc: "basks near the top of a pond on a clear summer day." });
  fish("jelly", "glow jelly", "🪼", 0x9af0e0, ["sea"], { s: [1, 2], t: "n", rare: 3, min: 8, max: 20, hunger: 0.2, safe: 1, glow: 1, desc: "drifts in on warm nights, glowing. wobbly, and good in a pudding." });
  fish("coralfin", "coralfin", "🐠", 0xff7a8a, ["sea"], { b: ["reef"], rare: 2, min: 10, max: 25, hunger: 0.35, desc: "lives only in the coral shallows." });
  fish("glimmerfin", "glimmerfin", "🐠", 0xc0a8ff, ["river", "pond", "sea"], { b: ["crystal", "shroom"], rare: 3, min: 15, max: 30, hunger: 0.4, glow: 1, desc: "found only in the waters of the crystal steppe and the glowshroom grove." });
  fish("oldbarnacle", "Old Barnacle", "🐋", 0x5a7a8a, ["sea"], { s: [1], t: "d", rare: 4, min: 140, max: 190, hunger: 0.8, desc: "a great fish. the oldest thing in the summer sea." });
  fish("riverghost", "the River Ghost", "🐟", 0xeef4f8, ["river"], { s: [3], t: "n", rare: 4, min: 90, max: 130, hunger: 0.8, desc: "a great fish. white as frost, seen on winter nights." });
  fish("grandcarp", "Grandmother Carp", "🐡", 0xd9a03a, ["pond"], { s: [0], wx: "r", rare: 4, min: 100, max: 150, hunger: 0.8, desc: "a great fish. she only rises in the spring rain." });
  fish("moonscale", "Moonscale", "🐠", 0xdfe6ff, ["sea"], { s: [2], t: "n", rare: 4, min: 110, max: 160, hunger: 0.8, glow: 1, desc: "a great fish. it follows the autumn moon in to shore." });
  fish("gloop", "the Gloop", "🐸", 0x6a9a4a, ["pond", "river"], { b: ["swamp", "mangrove", "jungle"], wx: "r", rare: 4, min: 80, max: 120, hunger: 0.8, desc: "a great fish, if it is a fish. swamp water, in the rain." });
  fish("crab", "crab", "🦀", 0xe0603a, ["sea", "river", "pond"], { pot: 1, rare: 2, min: 8, max: 18, hunger: 0.4, desc: "walks into crab pots sideways. boil it." });
  H.GREAT = H.FISH.filter(function (f) { return f.rare === 4; });
  var RARE_W = [0, 10, 4.5, 1.6, 0.4], RARE_WORD = ["", "common", "uncommon", "rare", "great"];

  food("seaweed", "veg", "seaweed", "🥬", 0x3f8a5a, 0.15, "pulled up on a line at sea. chewy. dries into something a fire will burn.", { rots: 0 });
  mat("pondweed", "veg", "pondweed", "🌿", 0x5a8a3a, "slimy green stuff off a hook. makes good compost.");
  mat("oldboot", "tool", "old boot", "🥾", 0x6a4a36, "somebody's. nobody on this island wears boots. compost it.");
  mat("bait", "seed", "bait", "🪱", 0xc98a7a, "wriggly. with bait in your bag the bites come twice as fast (one a cast).");
  mat("lure", "seed", "lure", "🪶", 0xf0d060, "made from a fish, to catch more of that fish. one a cast.");
  mat("compost", "seed", "compost", "🟤", 0x4a3424, "rotted-down scraps. feed it to a garden bed or a farm: faster, and better.");
  mat("tapper", "tool", "tree tap", "🪠", 0x9a7a4a, "push it into a pine, maple, birch or apple tree. come back later for the sap.");
  food("sap", "jar", "sweet sap", "🍯", 0xd9a24a, 0.2, "tapped from a tree. sweet, sticky, and it burns.", { rots: 0 });
  mat("flour", "seed", "flour", "🌾", 0xf0e6cf, "grain ground in a quern. the start of pies and cakes.");

  tool("hoe", "hoe", "⛏", 0x8a6a48, "till", "a flat stone on a stick. look at open ground and till a garden bed.", { wood: 0, stone: 0, ore: 0, dmg: 0.3, uses: 80 });
  tool("sickle", "sickle", "🌙", 0x7a8a9a, "reap", "a curved flint on a handle. harvest with it: one more from every bed, more seeds, and it reaps the beds beside it too.", { wood: 0, stone: 0, ore: 0, dmg: 0.5, uses: 120 });
  tool("dipper", "leaf cup", "🍃", 0x6fbf4a, "water", "leaves folded into a cup. fill it at any water: three waterings.", { wood: 0, stone: 0, ore: 0, dmg: 0, uses: 100 });
  tool("finerod", "bamboo rod", "🎣", 0xb8c46a, "fish", "long and springy. you get longer to hook a bite.", { wood: 0, stone: 0, ore: 0, dmg: 0.2, uses: 220 });
  H.RODS = { rod: { win: 1.0, line: 1 }, finerod: { win: 1.5, line: 1 }, spear: { win: 0.7, line: 0 } };
  H.WATER = { pot: 8, dipper: 3 };

  /* ---- crops: seasons (0 spring .. 3 winter), seconds to ripen when watered, regrow, how many ---- */
  H.CROPS = [];
  var CROP = H.CROP = {}, CROP_SEED = {}, CROP_OUT = {};
  function crop(id, lab, out, s, grow, y, o) {
    o = o || {};
    var cr = { id: id, label: lab, out: out, seed: "s_" + id, s: s, grow: grow, y: y, regrow: o.regrow || 0, giant: !!o.giant, paddy: !!o.paddy, damp: !!o.damp, found: !!o.found };
    H.CROPS.push(cr); CROP[id] = cr; CROP_SEED[cr.seed] = cr; if (!CROP_OUT[out]) CROP_OUT[out] = cr;
    kind(cr.seed, "seed", { noun: "crop", label: lab + " seeds", emoji: "🌱", r: 0.1, color: o.col || 0x9bd16a, mat: 1, desc: "sow them in a garden bed in " + seasonsText(s) + (o.note ? ". " + o.note : ".") });
    return cr;
  }
  food("firepod", "veg", "firepod", "🌶", 0xe0402a, 0.2, "a hot little summer pod. warms you from the inside.");
  food("bean", "veg", "pole beans", "🫘", 0x8a5a3a, 0.3, "climbs anything. keeps giving all spring and summer.");
  food("rice", "seed", "marsh rice", "🍚", 0xf2ecd8, 0.3, "grown with its feet wet. fills a bowl.", { rots: 1600 });
  kind("tealeaf", "veg", { noun: "material", label: "tea leaves", emoji: "🍵", color: 0x5a9a4a, mat: 1, desc: "from a tea bush. brew them in a pot by the fire." });
  food("snowbulb", "veg", "snowbulb", "🧅", 0xdfeef8, 0.4, "the one crop that likes winter. sweet when the frost has had it.");
  food("starmelon", "veg", "star melon", "🍈", 0xa8e06a, 0.7, "an old ark crop. slow, grows all year, and tastes like luck.", { r: 0.22, rots: 1400 });
  crop("sunroot", "sunroot", "carrot", [0, 2], 300, [1, 2]);
  crop("grain", "grain", "grain", [1, 2], 340, [2, 3]);
  crop("gourd", "gourd", "pumpkin", [1, 2], 460, [1, 1], { giant: 1, note: "well kept, one may grow giant" });
  crop("berry", "berry bramble", "berry", [0, 1], 300, [2, 3], { regrow: 150, note: "keeps fruiting" });
  crop("firepod", "firepod", "firepod", [1], 320, [1, 2], { regrow: 170, col: 0xe0402a, note: "keeps fruiting" });
  crop("bean", "pole bean", "bean", [0, 1], 280, [2, 3], { regrow: 140, note: "keeps fruiting" });
  crop("rice", "marsh rice", "rice", [0, 1, 2], 380, [2, 4], { paddy: 1, note: "beside water it waters itself and grows faster" });
  crop("healroot", "healroot", "herb", [0, 1, 2], 320, [1, 2], { regrow: 200, note: "a herb bed keeps giving" });
  crop("glowcap", "glowcap", "glowcap", [0, 1, 2, 3], 300, [1, 2], { regrow: 160, damp: 1, col: 0x67d4ff, note: "a mushroom bed: needs no watering, fruits even in winter" });
  crop("tea", "tea bush", "tealeaf", [0, 1, 2], 400, [2, 3], { regrow: 150, note: "leaves for a pot of tea" });
  crop("reed", "reed", "fiber", [0, 1, 2], 260, [2, 3], { regrow: 130, paddy: 1, note: "fibre you grow yourself" });
  crop("snowbulb", "snowbulb", "snowbulb", [3], 320, [1, 2], { found: 1, col: 0xdfeef8, note: "found in old ruins" });
  crop("starmelon", "star melon", "starmelon", [0, 1, 2, 3], 600, [1, 1], { giant: 1, found: 1, col: 0xffe27a, note: "found in pod crates and wrecks" });

  /* ---- what the seasons hide (look under a tree or in a patch) ---- */
  food("leek", "veg", "wild leek", "🧅", 0xcfe6a8, 0.25, "comes up under the trees in spring.");
  food("morel", "veg", "morel", "🍄", 0xb89a6a, 0.25, "a wrinkly spring mushroom. a safe one.", { noun: "food" });
  kind("mint", "veg", { noun: "material", label: "wild mint", emoji: "🌿", color: 0x6ad1a0, mat: 1, desc: "summer leaves from damp places. makes a pot of tea." });
  food("truffle", "veg", "truffle", "🟤", 0x4a3a30, 0.35, "an autumn find under old trees. smols would trade a house for one.", { rots: 0 });
  food("snowroot", "veg", "snowroot", "🥔", 0xd8c8a8, 0.35, "dug out from under the snow in winter. plain, filling.", { rots: 1600 });
  H.FORAGE = [
    { id: "leek", s: 0, p: 0.5, nodes: ["oak", "birch", "maple", "sakura", "giant"] },
    { id: "morel", s: 0, p: 0.45, nodes: ["deadtree", "shrooms", "pine", "shroomtree"] },
    { id: "mint", s: 1, p: 0.5, nodes: ["reeds", "herbs", "bush", "bamboo", "mangrove"] },
    { id: "truffle", s: 2, p: 0.2, nodes: ["oak", "pine", "maple", "giant", "birch"] },
    { id: "snowroot", s: 3, p: 0.5, nodes: ["roots", "bush", "oak", "pine", "birch", "maple", "deadtree", "sakura"] }
  ];
  H.SEED_NODE = { roots: "s_sunroot", gourds: "s_gourd", bush: "s_berry", herbs: "s_healroot", reeds: "s_reed", shrooms: "s_glowcap", shroomtree: "s_glowcap", cactus: "s_firepod", sakura: "s_tea", mangrove: "s_rice", bamboo: "s_bean", palm: "s_grain" };
  H.TAP_TREES = { pine: 1, maple: 1, birch: 1, oak: 1, sakura: 1, giant: 1 };
  H.TAP_SECS = 500;

  /* ---- boosts: what a dish or a drink does for a while ---- */
  H.BUFFS = {
    pep: { icon: "⚡", name: "peppy", tip: "your pep comes back much faster" },
    warm: { icon: "🔥", name: "warm", tip: "the cold can't get into you" },
    mighty: { icon: "💪", name: "mighty", tip: "you hit a third harder" },
    quick: { icon: "💨", name: "quick", tip: "you walk and run faster" },
    lucky: { icon: "🍀", name: "lucky", tip: "rarer fish, bigger harvests, better finds" },
    hearty: { icon: "💗", name: "mending", tip: "your hearts slowly come back" },
    keen: { icon: "🎣", name: "keen", tip: "longer to hook a bite" },
    green: { icon: "🌱", name: "green paws", tip: "watering lasts twice as long, and one more from every harvest" }
  };
  var BUFF_KEYS = Object.keys(H.BUFFS);
  /* ---- dishes. in: what goes in (a name ending in * is a group). pot: needs a pot. cold: no fire needed.
     lvl: the cooking level that teaches it (otherwise you find it by trying) ---- */
  H.DISHES = [];
  var DISH = H.DISH = {}, BUFF_OF = H.BUFF_OF = {};
  function dish(id, lab, emoji, color, ins, buff, secs, hunger, o) {
    o = o || {};
    var d = { id: id, label: lab, emoji: emoji, in: ins, buff: buff, secs: secs, pot: !!o.pot, cold: !!o.cold, lvl: o.lvl == null ? 99 : o.lvl, drink: !!o.drink, riddle: o.riddle || "" };
    H.DISHES.push(d); DISH[id] = d;
    var bt = buff && H.BUFFS[buff] ? H.BUFFS[buff].name + " for " + Math.round(secs / 60) + " min" : "a surprise";
    kind(id, o.drink ? "jar" : "bowl", { noun: o.drink ? "medicine" : "food", label: lab, emoji: emoji, r: 0.15, color: color, food: { hunger: -hunger }, chem: { glucose: Math.round(hunger * 45) / 100, fat: o.drink ? 0 : 0.15 }, rots: 1500, desc: (o.desc || "a dish.") + " " + bt + "." });
    if (buff) BUFF_OF[id] = { k: buff, secs: secs, slot: o.drink ? "drink" : "food" };
    return d;
  }
  dish("roastroots", "roast roots", "🥕", 0xe8843a, { carrot: 2 }, "quick", 240, 0.6, { lvl: 0, riddle: "two of the same root", desc: "sunroots done in the embers." });
  dish("fishstew", "fish stew", "🍲", 0xd9a05a, { "fish*": 1, carrot: 1 }, "warm", 300, 0.8, { pot: 1, lvl: 0, riddle: "something fishy and a root, in a pot", desc: "any fish and a sunroot, simmered." });
  dish("berrytart", "berry tart", "🥧", 0x8a5ac8, { berry: 2, flour: 1 }, "pep", 300, 0.6, { lvl: 2, riddle: "berries and something ground", desc: "berries in a crust." });
  dish("fishpie", "fish pie", "🥧", 0xd8b070, { "fish*": 1, flour: 1 }, "hearty", 300, 0.85, { lvl: 2, riddle: "something fishy and something ground", desc: "fish under a lid of pastry." });
  dish("gourdsoup", "gourd soup", "🎃", 0xf2a23a, { pumpkin: 1, herb: 1 }, "hearty", 360, 0.8, { pot: 1, lvl: 4, riddle: "a gourd and a root that heals, in a pot", desc: "thick, orange and kind." });
  dish("firestew", "fire stew", "🌶", 0xc8402a, { firepod: 1, "meat*": 1 }, "mighty", 240, 0.8, { pot: 1, lvl: 4, riddle: "something hot and something meaty, in a pot", desc: "puts fight in a smol." });
  dish("honeycake", "honey cake", "🍰", 0xf2c860, { "sweet*": 1, flour: 1 }, "lucky", 300, 0.6, { lvl: 6, riddle: "something sweet and something ground", desc: "a lucky cake." });
  dish("ricebowl", "fisher's bowl", "🍚", 0xf2ecd8, { rice: 2, "fish*": 1 }, "keen", 300, 0.8, { lvl: 6, riddle: "marsh rice and something fishy", desc: "what fishers eat before a long day." });
  dish("beanpot", "bean pot", "🫘", 0x9a5a3a, { bean: 2, firepod: 1 }, "green", 360, 0.7, { pot: 1, lvl: 8, riddle: "beans and something hot, in a pot", desc: "a gardener's supper." });
  dish("feast", "harvest feast", "🍽", 0xe8c070, { truffle: 1, "meat*": 1, bread: 1 }, "lucky", 600, 1, { lvl: 8, riddle: "the autumn find, something meaty and a loaf", desc: "the best plate on the island." });
  dish("trailmix", "trail mix", "🥜", 0xc8a070, { nutmeat: 1, driedfruit: 1 }, "pep", 240, 0.5, { cold: 1, riddle: "nut meat and dried fruit. no fire needed", desc: "a pocket snack." });
  dish("shroomfry", "mushroom fry", "🍄", 0xb89a6a, { "shroom*": 2 }, "lucky", 200, 0.5, { riddle: "two safe mushrooms", desc: "fried till the edges curl." });
  dish("crabboil", "crab boil", "🦀", 0xe0603a, { crab: 1, seaweed: 1 }, "mighty", 300, 0.8, { pot: 1, riddle: "a crab and something green from the sea, in a pot", desc: "pinchy, then delicious." });
  dish("jellypudding", "glow pudding", "🍮", 0x9af0e0, { jelly: 1, "sweet*": 1 }, "quick", 360, 0.5, { riddle: "something that glows from the sea, and something sweet", desc: "it wobbles. so do you, quickly." });
  dish("springsoup", "spring soup", "🥣", 0xa8d88a, { leek: 1, morel: 1 }, "pep", 360, 0.6, { pot: 1, riddle: "two spring finds, in a pot", desc: "tastes like the thaw." });
  dish("snowbroth", "snow broth", "🥣", 0xdfeef8, { snowbulb: 1, snowroot: 1 }, "warm", 480, 0.7, { pot: 1, riddle: "two winter roots, in a pot", desc: "winter in a bowl, but warm." });
  dish("mysterystew", "mystery stew", "🥘", 0x8a6a9a, { shroom: 1, "any*": 1 }, null, 240, 0.5, { pot: 1, riddle: "a red shroom and anything you can eat, in a pot. brave", desc: "nobody knows what it will do. not even the cook." });
  dish("herbtea", "herb tea", "🍵", 0x8ac87a, { "tea*": 2 }, "pep", 300, 0.05, { pot: 1, drink: 1, lvl: 0, riddle: "two handfuls of leaves for brewing, in a pot", desc: "a drink. calms a smol down too." });
  dish("berryjuice", "berry juice", "🧃", 0x7a5ad8, { berry: 3 }, "quick", 240, 0.15, { pot: 1, cold: 1, drink: 1, riddle: "a lot of berries, squashed in a pot. no fire", desc: "a drink." });
  dish("kelpbroth", "kelp broth", "🍶", 0x4a9a7a, { seaweed: 2 }, "keen", 300, 0.1, { pot: 1, drink: 1, riddle: "sea greens, twice, in a pot", desc: "a drink. fishers swear by it." });
  dish("cider", "hot cider", "🍺", 0xd9903a, { apple: 2 }, "warm", 300, 0.2, { pot: 1, drink: 1, riddle: "two apples, in a pot", desc: "a drink. apples, hot." });
  // what the machines make (and two wild things with a boost of their own)
  food("driedfruit", "veg", "dried fruit", "🍑", 0xd98a5a, 0.3, "off the drying rack. never goes bad.", { rots: 0 });
  food("jerky", "fish", "jerky", "🥓", 0x9a5a4a, 0.5, "dried fish or meat. never goes bad, never makes you sick.", { rots: 0, chem: { glucose: 0.15, fat: 0.3 } });
  food("smokedfish", "fish", "smoked fish", "🐟", 0xb87a4a, 0.75, "out of the smoker. feeds more than a fresh one and keeps for ages.", { rots: 3000, chem: { glucose: 0.25, fat: 0.35 } });
  food("jam", "jar", "jam", "🍓", 0xc8305a, 0.45, "fruit, potted. never goes bad.", { rots: 0 });
  food("pickles", "jar", "pickles", "🥒", 0x7aa84a, 0.45, "roots and pods, potted. never goes bad.", { rots: 0 });
  kind("fizz", "jar", { noun: "medicine", label: "honey fizz", emoji: "🥂", r: 0.15, color: 0xf7d76a, food: { hunger: -0.1, bored: -0.3, lonely: -0.15 }, chem: { glucose: 0.3 }, rots: 0, desc: "honey left in a crock until it tickles. a party drink. lucky for 5 min." });
  BUFF_OF.fizz = { k: "lucky", secs: 300, slot: "drink" };
  BUFF_OF.jam = { k: "pep", secs: 120, slot: "food" };
  BUFF_OF.honey = { k: "hearty", secs: 60, slot: "food" };
  BUFF_OF.starmelon = { k: "lucky", secs: 240, slot: "food" };
  BUFF_OF.firepod = { k: "warm", secs: 120, slot: "food" };

  /* ---- groups: "any fish", "any fruit"... ---- */
  function inList(list) { var m = {}; list.forEach(function (k) { m[k] = 1; }); return function (k) { return !!m[k]; }; }
  var GROUPS = H.GROUPS = {
    "fish*": { name: "fish (any)", is: function (k) { return k === "fish" || !!FISH_BY[k] && k !== "crab"; } },
    "fruit*": { name: "fruit (any)", is: inList(["apple", "cherry", "berry", "banana", "pricklypear"]) },
    "veg*": { name: "roots or pods (any)", is: inList(["carrot", "pumpkin", "bean", "firepod", "leek", "snowbulb", "snowroot"]) },
    "meat*": { name: "meat, clam or crab", is: inList(["meat", "clam", "crab", "jerky"]) },
    "shroom*": { name: "safe mushrooms", is: inList(["glowcap", "morel", "truffle"]) },
    "tea*": { name: "tea leaves or mint", is: inList(["tealeaf", "mint"]) },
    "sweet*": { name: "honeycomb, sap or jam", is: inList(["honey", "sap", "jam"]) },
    "scrap*": { name: "scraps (any food, weed or an old boot)", is: function (k) { return k === "pondweed" || k === "oldboot" || k === "seaweed" || (Sv().edible(k) && !DISH[k]); } },
    "any*": { name: "anything you can eat", is: function (k) { return k !== "shroom" && Sv().edible(k) && !DISH[k]; } }
  };
  function countOf(c, want) {
    if (!GROUPS[want]) return Sv().count(c, want, true);
    var v = Sv().inv(c), n = 0;
    for (var i = 0; i < v.s.length; i++) if (v.s[i] && GROUPS[want].is(v.s[i].k)) n += v.s[i].n;
    return n;
  }
  // take n of a kind or a group out of the bag (the commonest first). returns the kinds taken
  function takeOf(c, want, n) {
    if (!GROUPS[want]) return Sv().take(c, want, n);
    var v = Sv().inv(c), idx = [], out = [];
    for (var i = 0; i < v.s.length; i++) if (v.s[i] && GROUPS[want].is(v.s[i].k)) idx.push(i);
    function rank(k) { return FISH_BY[k] ? FISH_BY[k].rare : k === "oldboot" || k === "pondweed" || k === "seaweed" ? -1 : 0; } // junk before supper, a minnow before a great fish
    idx.sort(function (a, b) { return rank(v.s[a].k) - rank(v.s[b].k); });
    for (var j = 0; j < idx.length && n > 0; j++) { var sl = v.s[idx[j]]; while (sl.n > 0 && n > 0) { sl.n--; n--; out.push(sl.k); } if (sl.n <= 0) v.s[idx[j]] = null; }
    return out;
  }
  function wantText(want, n) { return n + " " + (GROUPS[want] ? GROUPS[want].name : label(want)); }
  H.costText = function (cost) { var out = []; for (var k in cost) out.push(wantText(k, cost[k])); return out.join(", "); };
  function lacks(c, cost) { for (var k in cost) if (countOf(c, k) < cost[k]) return true; return false; }
  H.countOf = countOf;

  /* ================= boosts ================= */
  H.buffs = function (c, game) {
    var out = [], b = c && c.buff, t = game.time || 0;
    if (!b) return out;
    ["food", "drink"].forEach(function (slot) { var x = b[slot]; if (x && x.until > t && H.BUFFS[x.k]) out.push({ slot: slot, k: x.k, id: x.id, left: x.until - t, def: H.BUFFS[x.k] }); });
    return out;
  };
  H.has = function (c, k, game) { var b = c && c.buff, t = game.time || 0; return !!(b && ((b.food && b.food.k === k && b.food.until > t) || (b.drink && b.drink.k === k && b.drink.until > t))); };
  H.giveBuff = function (game, c, k, secs, slot, id) {
    if (!H.BUFFS[k] || !c) return null;
    if (!c.buff || typeof c.buff !== "object") c.buff = {};
    if (lv(c, "cook") >= 3) secs *= 1.25; // a practised cook gets more out of a meal
    c.buff[slot || "food"] = { k: k, id: id || k, until: (game.time || 0) + secs };
    emit("buff", { c: c, k: k, secs: secs, slot: slot || "food" });
    return c.buff[slot || "food"];
  };
  // something was eaten in a body (possess.js says so on the bus)
  H.ate = function (game, c, k) {
    if (!game || !c) return null;
    var bo = BUFF_OF[k], msg = null;
    if (k === "mysterystew") {
      var s = st(game), r = rnd(game, "myst" + (s.myst = (s.myst || 0) + 1))();
      if (r < 0.2) { c.chem.sick = Math.min(1, (c.chem.sick || 0) + 0.25); msg = "🥘 mystery stew… your tummy gurgles. that was the wrong mystery"; }
      else bo = { k: BUFF_KEYS[Math.floor(r * 97) % BUFF_KEYS.length], secs: 240, slot: "food" };
    }
    if (k === "honey" && c.chem.toxin != null) c.chem.toxin = Math.max(0, c.chem.toxin - 0.3); // honey settles a bad shroom
    if (k === "herbtea") { if (c.chem.fear != null) c.chem.fear = Math.max(0, c.chem.fear - 0.3); if (c.chem.anger != null) c.chem.anger = Math.max(0, c.chem.anger - 0.3); }
    if (bo) {
      var b = H.giveBuff(game, c, bo.k, bo.secs, bo.slot, k), def = H.BUFFS[bo.k];
      msg = def.icon + " " + label(k) + ": " + def.name + " for " + Math.max(1, Math.round((b.until - game.time) / 60)) + " min. " + def.tip;
    }
    if (msg) say(msg);
    return bo || null;
  };
  var lastX = null, lastZ = null, lastId = null;
  function buffTick(game, dt) {
    var P = Ps(), c = P && P.active ? P.c : null;
    if (!c || !c.alive || !c.buff) { lastId = null; return; }
    var S = P.state ? P.state() : null, ch = c.chem;
    if (H.has(c, "pep", game) && S && typeof S.stam === "number") S.stam = Math.min(1, S.stam + dt * 0.07);
    if (H.has(c, "warm", game) && ch.cold != null) ch.cold = Math.max(0, ch.cold - dt * 0.03);
    if (H.has(c, "hearty", game) && ch.health > 0 && ch.health < 1) ch.health = Math.min(1, ch.health + dt * 0.004);
    // quick: a little further along the step you just took
    if (H.has(c, "quick", game) && lastId === c.id && !c.asleep) {
      var dx = c.x - lastX, dz = c.z - lastZ, d = Math.sqrt(dx * dx + dz * dz);
      if (d > 0.0005 && d < 0.6) { var nx = c.x + dx * 0.2, nz = c.z + dz * 0.2; if (SB.World.walkable(game.world, nx, nz, false)) { c.x = nx; c.z = nz; } }
    }
    lastX = c.x; lastZ = c.z; lastId = c.id;
  }

  /* ================= fishing ================= */
  H.waterKind = function (game, x, z) {
    var w = game.world, T = w.T, WG = SB.WorldGen, b = biomeId(game, x, z);
    if (b === "ocean" || b === "reef") return "sea";
    if (!T || !WG) return "pond";
    var lvl = WG.waterAt(T, x, z);
    if (lvl !== T.NONE && lvl <= (SB.SEA || 0) + 0.06) return "sea";
    if (T.river && T.V) {
      var i0 = Math.round(x), j0 = Math.round(z);
      for (var j = j0 - 1; j <= j0 + 1; j++) for (var i = i0 - 1; i <= i0 + 1; i++) if (i >= 0 && j >= 0 && i < T.V && j < T.V && T.river[j * T.V + i]) return "river";
    }
    return "pond";
  };
  // some patches of water are bubbling today: quicker bites, better fish
  H.bubbling = function (game, x, z) { return (hashKey("bub:" + Math.floor(x / 5) + "," + Math.floor(z / 5) + ":" + day(game)) ^ (game.seed >>> 0)) % 5 === 0; };
  H.fishHere = function (game, x, z, c) {
    var w = game.world, wk = H.waterKind(game, x, z), se = season(game), night = !!w.night, rain = raining(game);
    var b1 = biomeId(game, x, z), b2 = c ? biomeId(game, c.x, c.z) : b1;
    return H.FISH.filter(function (f) {
      if (f.pot || f.w.indexOf(wk) < 0) return false;
      if (f.s && f.s.indexOf(se) < 0) return false;
      if ((f.t === "n" && !night) || (f.t === "d" && night)) return false;
      if ((f.wx === "r" && !rain) || (f.wx === "c" && rain)) return false;
      if (f.b && f.b.indexOf(b1) < 0 && f.b.indexOf(b2) < 0) return false;
      return true;
    });
  };
  H.fishHint = function (f) {
    var p = [f.pot ? "a crab pot left in any water" : f.w.join(" or ")];
    if (f.b) p.push("only in the " + f.b.map(function (id) { var b = null; (SB.BIOMES || []).forEach(function (x) { if (x.id === id) b = x; }); return b ? b.name : id; }).join(" or "));
    if (f.s) p.push(seasonsText(f.s));
    if (f.t) p.push(f.t === "n" ? "at night" : "by day");
    if (f.wx) p.push(f.wx === "r" ? "in the rain" : "in clear weather");
    return p.join(" · ");
  };
  // what is on the end of this cast. o: { x, z, tool, bait, bubbles, r (dice) }
  H.rollCatch = function (game, c, o) {
    var r = o.r, s = st(game), fl = lv(c, "fish"), lucky = H.has(c, "lucky", game), spear = o.tool === "spear";
    var wk = H.waterKind(game, o.x, o.z), x = r();
    var crateP = spear ? 0 : 0.03 + (lucky ? 0.03 : 0), junkP = spear ? 0 : fl >= 5 ? 0.05 : 0.13;
    if (x < crateP) return { crate: true, water: wk };
    if (x < crateP + junkP) return { junk: wk === "sea" ? (r() < 0.6 ? "seaweed" : "oldboot") : (r() < 0.5 ? "pondweed" : r() < 0.6 ? "oldboot" : "stick"), water: wk };
    var list = H.fishHere(game, o.x, o.z, c), wts = [], tot = 0;
    list.forEach(function (f) {
      var w = RARE_W[f.rare];
      if (f.rare === 4 && (spear || (s.fish[f.id] && s.fish[f.id].n > 0))) w = 0; // a great fish is caught once, on a line
      if (spear && f.rare > 2) w = 0;
      if (f.rare >= 3) w *= (lucky ? 1.7 : 1) * (o.bubbles ? 1.5 : 1) * (fl >= 8 ? 1.5 : 1);
      if (o.bait === "lure" && s.lureFor === f.id) w *= 8;
      wts.push(w); tot += w;
    });
    if (tot <= 0) return { junk: wk === "sea" ? "seaweed" : "pondweed", water: wk };
    var roll = r() * tot, j = 0; while (j < list.length - 1 && (roll -= wts[j]) > 0) j++;
    while (wts[j] <= 0 && j > 0) j--;
    var f = list[j];
    return { fish: f, size: Math.round(f.min + (f.max - f.min) * Math.pow(r(), 1.6)), water: wk };
  };
  var F = null; // the line that is out: { cid, x, z, wx, wz, phase: "wait"|"bite", t, at, win, res, tool, bait, spooks }
  H.line = function () { return F; };
  H.reel = function () { F = null; }; // wind it in with nothing on it
  H.cast = function (game, c, wx, wz) {
    var hk = Sv().heldKind(c), R = H.RODS[hk];
    if (!R || c.tier < 2) return { ok: false, msg: "hold a rod or a spear" };
    if (F) return { ok: false, msg: "your line is already out" };
    var s = st(game), n = (s.casts = (s.casts || 0) + 1), r = rnd(game, "cast" + n);
    var bub = H.bubbling(game, wx, wz), chum = !!(s.chum && s.chum.until > game.time && SB.dist(s.chum.x, s.chum.z, wx, wz) < 9), bait = null;
    if (R.line) { if (Sv().count(c, "lure", true) && s.lureFor) bait = "lure"; else if (Sv().count(c, "bait", true)) bait = "bait"; if (bait) Sv().take(c, bait, 1); }
    var res = H.rollCatch(game, c, { x: wx, z: wz, tool: hk, bait: bait, bubbles: bub, r: r });
    var wait = (R.line ? 3 + r() * 4.5 : 1.2 + r() * 1.5) * (bait ? 0.55 : 1) * (bub ? 0.6 : 1) * (chum ? 0.6 : 1) * (1 - Math.min(0.4, bonus(c, "fish") * 0.8));
    var rar = res.fish ? res.fish.rare : 1;
    var win = Math.max(0.4, R.win + (lv(c, "fish") >= 2 ? 0.15 : 0) + (H.has(c, "keen", game) ? 0.35 : 0) - (rar - 1) * 0.14);
    F = { cid: c.id, x: c.x, z: c.z, wx: wx, wz: wz, phase: "wait", t: wait, at: 0, win: win, res: res, tool: hk, bait: bait, bubbles: bub, spooks: 0 };
    emit("fishCast", { c: c, water: res.water, bait: bait, bubbles: bub });
    return { ok: true, wait: wait, win: win, msg: (R.line ? "🎣 the float sits on the " + res.water : "🔱 you stand over the " + res.water + ", spear up") + (bait ? " (" + label(bait) + " on)" : "") + (bub ? ". bubbles: they're biting here" : "") + ". wait for the bite…" };
  };
  function fishTick(game, dt) {
    if (!F) return;
    var P = Ps(), c = P && P.active ? P.c : null;
    if (!c || c.id !== F.cid || !c.alive) { F = null; return; }
    if (SB.dist(c.x, c.z, F.x, F.z) > 2.5) { F = null; say("you wandered off. the line went slack"); return; }
    if (Sv().heldKind(c) !== F.tool) { F = null; return; }
    if (F.phase === "wait") {
      if ((F.t -= dt) <= 0) { F.phase = "bite"; F.at = 0; say("❗ a bite! hook it!"); sound("chime"); if (SB.FX && SB.FX.burst) SB.FX.burst("sparkle", F.wx, SB.World.groundY(game.world, F.wx, F.wz) + 0.1, F.wz, 8); emit("fishBite", { c: c }); }
    } else if ((F.at += dt) > F.win) { F = null; say("…too slow. it got away"); xp(c, "fish", 1); emit("fishAway", { c: c }); }
  }
  // the button, while the line is out: too soon scares the fish off for a moment; in the window, it's yours
  H.pull = function (game, c) {
    if (!F || F.cid !== c.id) return { ok: false, msg: "" };
    if (F.phase === "wait") { F.t = Math.max(F.t, 1.2); F.spooks++; return { ok: false, early: true, msg: F.spooks === 1 ? "shh. keep still until it bites" : "" }; }
    var f = F; F = null;
    return H.land(game, c, f);
  };
  H.land = function (game, c, f) {
    var s = st(game), res = f.res, perfect = f.at <= f.win * 0.35, v = Sv().inv(c), msg;
    if (K[f.tool] && v.s[v.sel] && v.s[v.sel].k === f.tool) Sv().wear(c, game, v.sel, 1);
    if (res.crate) {
      var r = rnd(game, "crate" + (s.crates = (s.crates || 0) + 1)), got = [["metal", 1 + Math.floor(r() * 2)], ["plank", 2], ["s_starmelon", 1 + Math.floor(r() * 2)]];
      if (r() < 0.3 && K.axe) got.push(["axe", 1]);
      got.forEach(function (g) { give(game, c, g[0], g[1]); });
      xp(c, "fish", 4);
      emit("fishCrate", { c: c, got: got });
      return { ok: true, crate: true, got: got, msg: "🧰 you hooked a sunk pod crate! " + got.map(function (g) { return g[1] + " " + label(g[0]); }).join(", ") };
    }
    if (res.junk) {
      give(game, c, res.junk, 1); s.junk = (s.junk || 0) + 1; xp(c, "fish", 1);
      emit("fishJunk", { c: c, kind: res.junk });
      return { ok: true, junk: res.junk, msg: "you hooked… " + (res.junk === "oldboot" ? "an old boot. whose?" : res.junk === "stick" ? "a stick" : label(res.junk)) };
    }
    var fi = res.fish, size = perfect ? Math.min(fi.max, Math.round(res.size * 1.12)) : res.size, e = s.fish[fi.id] || (s.fish[fi.id] = { n: 0, best: 0, d: day(game) });
    var first = e.n === 0, record = !first && size > e.best, n = 1;
    if (fi.rare === 1 && lv(c, "fish") >= 6 && SB.Body && SB.Body.roll(c, "fish")) n = 2;
    e.n += n; if (size > e.best) e.best = size;
    give(game, c, fi.id, n);
    xp(c, "fish", (perfect ? 2 : 0) + (fi.rare - 1) * 2);
    emit("fish", { c: c });
    emit("fishCaught", { c: c, id: fi.id, size: size, perfect: perfect, first: first, great: fi.rare === 4, n: n });
    msg = fi.emoji + " " + (fi.rare === 4 ? "you caught " + fi.label + "! " : (/^[aeiou]/.test(fi.label) ? "an " : "a ") + fi.label + (n > 1 ? " (and another!)" : "") + ", ") + size + " cm" + (perfect ? " · a perfect hook" : "") + (first ? " · a new one for the fish log" : record ? " · your biggest yet" : "");
    return { ok: true, fish: fi.id, size: size, perfect: perfect, first: first, n: n, msg: msg };
  };
  H.chum = function (game, c, wx, wz) {
    if (!Sv().count(c, "bait", true)) return { ok: false, msg: "no bait to throw" };
    Sv().take(c, "bait", 1);
    st(game).chum = { x: r1(wx), z: r1(wz), until: game.time + 300 };
    return { ok: true, msg: "you scatter bait on the water. the fish here will bite faster for a while" };
  };
  H.catchBug = function (game, c, it) {
    if (!it || it.gone) return { ok: false, msg: "" };
    if (SB.dist(c.x, c.z, it.x, it.z) > 2.6) return { ok: false, msg: "get closer. slowly" };
    SB.World.remove(game.world, it);
    give(game, c, "bait", 2);
    return { ok: true, msg: "got it! 2 bait" };
  };

  /* ================= small buildings ================= */
  function struct(id, noun, lab, emoji, r, cost, desc) { if (!SK[id]) SK[id] = { noun: noun, label: lab, emoji: emoji, r: r, cost: cost, work: 1, desc: desc }; }
  ["", "1", "2", "3"].forEach(function (sfx) { struct("gardenbed" + sfx, "material", "garden bed", "🟫", 0.5, {}, "tilled by hand. sow it, water it, harvest it."); });
  H.MACH = {
    dryrack: { label: "drying rack", emoji: "🧵", r: 0.6, cost: { stick: 4, vine: 1 }, time: 300, cap: 4, word: "drying", takes: "fruit, fish or meat", make: function (k) { return GROUPS["fruit*"].is(k) ? ["driedfruit", 1] : GROUPS["fish*"].is(k) || k === "meat" ? ["jerky", 1] : null; }, desc: "fruit, fish and meat dry here into food that never goes bad." },
    smoker: { label: "smoker", emoji: "♨️", r: 0.6, cost: { stone: 3, stick: 2 }, time: 220, cap: 4, word: "smoking", takes: "fish, meat or crab", make: function (k) { return GROUPS["fish*"].is(k) || k === "meat" || k === "crab" || k === "clam" ? ["smokedfish", 1] : null; }, desc: "smokes fish so it feeds more and keeps for ages." },
    crock: { label: "crock", emoji: "🏺", r: 0.5, cost: { clay: 3 }, time: 400, cap: 4, word: "working", takes: "fruit, roots and pods, or honeycomb", make: function (k) { return GROUPS["fruit*"].is(k) ? ["jam", 1] : GROUPS["veg*"].is(k) ? ["pickles", 1] : k === "honey" ? ["fizz", 1] : null; }, desc: "a big clay jar. fruit turns to jam, roots to pickles, honeycomb to honey fizz." },
    quern: { label: "quern", emoji: "⚙️", r: 0.5, cost: { stone: 4, stick: 1 }, time: 120, cap: 6, word: "grinding", takes: "grain, marsh rice, or fish (for compost)", make: function (k) { return k === "grain" || k === "rice" ? ["flour", 1] : GROUPS["fish*"].is(k) ? ["compost", 2] : null; }, desc: "two stones that grind grain into flour, and fish into compost." },
    heap: { label: "compost heap", emoji: "🟤", r: 0.6, cost: { stick: 3, leaves: 3 }, time: 240, cap: 6, word: "rotting down", takes: "scraps: any food, leaves, weed, an old boot", make: function (k) { return k === "leaves" || GROUPS["scrap*"].is(k) ? ["compost", 1] : null; }, desc: "scraps in, compost out." },
    beebox: { label: "bee box", emoji: "🐝", r: 0.5, cost: { stick: 4, honey: 1 }, time: 700, cap: 2, gen: "honey", word: "the bees are busy", desc: "a hive you keep. honeycomb now and then (not in winter), and beds nearby grow faster." },
    crabpot: { label: "crab pot", emoji: "🧺", r: 0.45, cost: { fiber: 3, stick: 2 }, time: 520, cap: 2, gen: "crab", water: 2.6, word: "waiting", desc: "a woven trap. set it at the water's edge and come back later. bait makes it quicker." },
    scarecrow: { label: "scarecrow", emoji: "🧑‍🌾", r: 0.4, cost: { stick: 3, leaves: 2, fiber: 1 }, helper: 1, reach: 7, desc: "keeps the birds off every garden bed within seven steps." },
    sprinkler: { label: "water pipe", emoji: "🎋", r: 0.4, cost: { stick: 4, fiber: 2 }, helper: 1, reach: 3.6, water: 10, desc: "hollow sticks from the nearest water. keeps every bed within three steps watered." }
  };
  for (var mk in H.MACH) struct(mk, "material", H.MACH[mk].label, H.MACH[mk].emoji, H.MACH[mk].r, H.MACH[mk].cost, H.MACH[mk].desc);
  H.MAX_BEDS = 30;
  function isBed(b) { return !!b && typeof b.kind === "string" && b.kind.indexOf("gardenbed") === 0; }
  H.isBed = isBed;
  H.beds = function (game) { return game.world.structures.filter(isBed); };
  function free(game, x, z, r, c) {
    var W = SB.World, w = game.world, ok = true;
    if (!W.walkable(w, x, z, false) || W.depthAt(w, x, z) > 0.02) return false;
    if (W.isSeen && !W.isSeen(w, x, z)) return false;
    if (c && SB.dist(c.x, c.z, x, z) < r + 0.35) return false;
    for (var i = 0; i < w.structures.length; i++) { var o = w.structures[i]; if (SB.dist(x, z, o.x, o.z) < r + (SK[o.kind] ? SK[o.kind].r : 0.6) + 0.12) return false; }
    W.eachNodeNear(w, x, z, r + 1.2, function (n) { if (!n.nop && n.state !== "gone" && SB.dist(n.x, n.z, x, z) < r + (NK[n.kind] ? NK[n.kind].r : 0.4) * (n.s || 1) * 0.7) ok = false; });
    return ok;
  }
  // somewhere to put a thing of radius r: where you aim, else just ahead, else anywhere close
  H.spot = function (game, c, r, needWater) {
    var P = Ps(), ag = P && P.active && P.c === c && P.aimGround ? P.aimGround(game, c, 5) : null;
    var d0 = r + 1.1, sx = ag && !ag.far ? ag.x : c.x + Math.sin(c.facing || 0) * d0, sz = ag && !ag.far ? ag.z : c.z + Math.cos(c.facing || 0) * d0;
    function good(x, z) { return free(game, x, z, r, c) && (!needWater || !!waterNear(game, x, z, needWater)); }
    if (good(sx, sz)) return { x: sx, z: sz };
    for (var rr = 0.7; rr <= (needWater ? 6 : 4.2); rr += 0.7) for (var k = 0; k < 8; k++) { var a = k * 0.785, x = sx + Math.sin(a) * rr, z = sz + Math.cos(a) * rr; if (SB.dist(x, z, c.x, c.z) < 7 && good(x, z)) return { x: x, z: z }; }
    return null;
  };
  function put(game, c, kindId, x, z, data) {
    var b = { id: SB.Game.newId(game), type: "struct", kind: kindId, noun: SK[kindId].noun, x: r1(x), z: r1(z), rot: isBed({ kind: kindId }) ? 0 : (hashKey(kindId + ":" + r1(x) + ":" + r1(z)) % 628) / 100, s: 1,
      done: true, work: 0, need: {}, tribe: c && c.tribe ? c.tribe : 0, builders: [], data: data || {}, born: game.time, name: null };
    game.world.structures.push(b); mark(game, b);
    return b;
  }
  H.remove = function (game, c, b) {
    if (!b) return { ok: false, msg: "" };
    var m = H.MACH[b.kind], d = b.data || {};
    if (m && (d.n > 0)) return { ok: false, msg: "empty it first" };
    SB.World.removeStructure(game.world, b);
    if (m) for (var k in m.cost) give(game, c, k, m.cost[k]);
    emit("harvestRemoved", { c: c, kind: b.kind });
    return { ok: true, msg: m ? "you take the " + m.label + " down. the pieces are back in your bag" : "you rake the bed flat" };
  };

  /* ---------------- garden beds ---------------- */
  H.till = function (game, c, x, z) {
    if (c.tier < 2) return { ok: false, msg: "you need hands to till" };
    if (Sv().heldKind(c) !== "hoe") return { ok: false, msg: "hold a hoe to till a bed" };
    if (H.beds(game).length >= H.MAX_BEDS) return { ok: false, msg: "that's as many beds as one island's smols can keep (" + H.MAX_BEDS + ")" };
    var p = x != null && free(game, x, z, 0.5, c) ? { x: x, z: z } : H.spot(game, c, 0.5);
    if (!p) return { ok: false, msg: "no room for a bed here: it needs open, dry ground" };
    var b = put(game, c, "gardenbed", p.x, p.z, { g: 0, wet: raining(game) ? 200 : 0 }), v = Sv().inv(c);
    Sv().wear(c, game, v.sel, 1); xp(c, "farm", 2);
    emit("bedTilled", { c: c, st: b });
    return { ok: true, st: b, msg: "🟫 a garden bed. hold seeds and look at it to sow" };
  };
  // plain "seeds" are wild: whatever suits the season comes up
  function wildCrop(game, b) { var se = season(game), pool = H.CROPS.filter(function (cr) { return !cr.found && cr.s.indexOf(se) >= 0; }); return pool.length ? pool[Math.floor(rnd(game, "wild" + b.id + ":" + day(game))() * pool.length)] : null; }
  function beesNear(game, b) {
    var yes = false;
    SB.World.eachNodeNear(game.world, b.x, b.z, 8, function (n) { if (n.kind === "hive" && n.state !== "gone") yes = true; });
    return yes || SB.World.structsNear(game.world, b.x, b.z, 8, function (o) { return o.kind === "beebox"; }).length > 0;
  }
  H.sow = function (game, c, b, seedKind) {
    var d = b && b.data;
    if (!isBed(b) || !d) return { ok: false, msg: "" };
    if (d.crop) return { ok: false, msg: "something is growing here already" };
    var cr = seedKind === "seed" ? wildCrop(game, b) : CROP_SEED[seedKind], se = season(game);
    if (!cr) return { ok: false, msg: seedKind === "seed" ? "nothing wild will come up in " + SEASON[se] + ". glowcap and snowbulb beds grow in winter" : "those aren't seeds" };
    if (cr.s.indexOf(se) < 0) return { ok: false, msg: cr.label + " won't grow in " + SEASON[se] + ": sow it in " + seasonsText(cr.s) };
    if (!Sv().take(c, seedKind, 1).length) return { ok: false, msg: "no seeds" };
    d.crop = cr.id; d.g = 0.02; d.age = 0; d.care = 0; d.dead = 0; d.q = 0; d.giant = 0; d.pecked = 0;
    d.sk = bonus(c, "farm"); d.paddy = waterNear(game, b.x, b.z, 2.6) ? 1 : 0; d.bee = beesNear(game, b) ? 1 : 0;
    restage(game, b); xp(c, "farm", 1);
    emit("bedSown", { c: c, st: b, crop: cr.id });
    return { ok: true, crop: cr.id, msg: "🌱 " + cr.label + (seedKind === "seed" ? " came out of the wild seeds" : "") + ", sown. " + (cr.damp ? "it needs no watering" : d.paddy && cr.paddy ? "the water beside it will do the watering" : "keep it watered: a pot or a leaf cup, or rain") };
  };
  H.water = function (game, c, b) {
    var d = b && b.data;
    if (!isBed(b) || !d) return { ok: false, msg: "" };
    if ((c.sip || 0) <= 0) return { ok: false, msg: "nothing to water with: fill a pot or a leaf cup at any water" };
    if (d.wet > 120) return { ok: false, msg: "this bed is still wet" };
    c.sip--;
    d.wet = 400 * (lv(c, "farm") >= 2 ? 1.5 : 1) * (H.has(c, "green", game) ? 2 : 1);
    restage(game, b); xp(c, "farm", 1);
    emit("bedWatered", { c: c, st: b });
    return { ok: true, msg: "💧 watered (" + c.sip + " left)" };
  };
  H.fill = function (game, c) {
    var hk = Sv().heldKind(c), cap = H.WATER[hk];
    if (!cap) return { ok: false, msg: "hold a pot or a leaf cup" };
    if ((c.sip || 0) >= cap) return { ok: false, msg: "it's full" };
    c.sip = cap;
    return { ok: true, msg: "💧 full: " + cap + " waterings" };
  };
  H.feed = function (game, c, b) {
    var d = b && b.data;
    if (!isBed(b) || !d) return { ok: false, msg: "" };
    if (d.fert) return { ok: false, msg: "this bed is well fed already" };
    if (!Sv().take(c, "compost", 1).length) return { ok: false, msg: "no compost" };
    d.fert = 1;
    if (d.crop && !d.dead && d.g < 1) d.g = Math.min(0.99, d.g + 0.15); // it jumps up at once
    restage(game, b); xp(c, "farm", 1);
    emit("bedFed", { c: c, st: b });
    return { ok: true, msg: "🟤 compost dug in: it grows faster, and comes up better" };
  };
  function stageOf(d) { return !d.crop ? 0 : d.dead ? 1 : d.g >= 1 ? 3 : d.g >= 0.45 ? 2 : 1; }
  H.ripe = function (b) { return isBed(b) && !!b.data.crop && !b.data.dead && b.data.g >= 1; };
  function restage(game, b) {
    var d = b.data, sg = stageOf(d), k = "gardenbed" + (sg || ""), s = d.giant && sg === 3 ? 1.5 : 1, tint = d.dead ? "d" : d.wet > 0 ? "w" : "";
    var sig = k + s + tint;
    b.kind = k; b.noun = SK[k].noun; b.s = s;
    if (tint === "d") b.tint = [0.62, 0.52, 0.42]; else if (tint === "w") b.tint = [0.8, 0.76, 0.74]; else b.tint = null;
    if (b._sig !== sig) { b._sig = sig; mark(game, b); }
  }
  function ripen(game, b) {
    var d = b.data, cr = CROP[d.crop], P = Ps(), me = P && P.active ? P.c : null;
    var ratio = cr.damp ? 1 : d.care / Math.max(1, d.age), q = ratio >= 0.9 && (d.fert || (d.sk || 0) >= 0.25) ? 2 : ratio >= 0.6 ? 1 : 0;
    d.g = 1; d.q = q; d.giant = 0;
    if (cr.giant && q === 2) {
      var near = SB.World.structsNear(game.world, b.x, b.z, 2.7, function (o) { return o !== b && isBed(o) && o.data.crop === d.crop && !o.data.dead; }).length;
      var p = 0.12 + Math.min(3, near) * 0.1 + (me && H.has(me, "lucky", game) ? 0.1 : 0) + ((d.sk || 0) >= 0.3 ? 0.1 : 0);
      if (rnd(game, "giant" + b.id + ":" + Math.floor(game.time))() < p) d.giant = 1;
    }
    emit("bedRipe", { st: b, crop: cr.id, q: q, giant: !!d.giant });
  }
  function growBed(game, b, step, pipes, rain) {
    var d = b.data, cr = CROP[d.crop];
    if (rain) d.wet = Math.max(d.wet || 0, 200);
    for (var i = 0; i < pipes.length; i++) if (SB.dist(pipes[i].x, pipes[i].z, b.x, b.z) <= H.MACH.sprinkler.reach) { d.wet = Math.max(d.wet || 0, 60); break; }
    if (cr && !d.dead && d.g < 1) {
      if (d.paddy && cr.paddy) d.wet = Math.max(d.wet || 0, 60);
      var wet = d.wet > 0 || cr.damp;
      var rate = (wet ? 1 : 0.3) * (d.fert ? 1.35 : 1) * (d.bee ? 1.15 : 1) * (d.paddy && cr.paddy ? 1.4 : 1) * (1 + (d.sk || 0));
      d.age = (d.age || 0) + step; if (wet) d.care = (d.care || 0) + step;
      d.g = Math.min(1, d.g + step / cr.grow * rate);
      if (d.g >= 1) ripen(game, b);
    }
    d.wet = Math.max(0, (d.wet || 0) - step);
    restage(game, b);
  }
  H.harvest = function (game, c, b) {
    if (!H.ripe(b)) return { ok: false, msg: "not ripe yet" };
    var d = b.data, cr = CROP[d.crop], s = st(game), q = d.q || 0, sickle = Sv().heldKind(c) === "sickle";
    var r = rnd(game, "hv" + b.id + ":" + (s.hv = (s.hv || 0) + 1));
    var n = d.giant ? 6 + q : cr.y[0] + Math.floor(r() * (cr.y[1] - cr.y[0] + 1)) + q;
    if (H.has(c, "green", game)) n++;
    if (sickle) n++;
    var sn = d.giant ? 2 : (lv(c, "farm") >= 4 || r() < 0.35 + 0.2 * q + (sickle ? 0.2 : 0)) ? 1 : 0, giant = !!d.giant;
    give(game, c, cr.out, n); give(game, c, cr.seed, sn);
    var e = s.crops[cr.id] || (s.crops[cr.id] = { n: 0, q: 0, g: 0 }), first = e.n === 0;
    e.n += n; if (q > e.q) e.q = q; if (giant) e.g++;
    xp(c, "farm", 3 + q + (giant ? 4 : 0));
    var se = season(game);
    if (cr.regrow && cr.s.indexOf(se) >= 0) { d.g = Math.max(0.45, 1 - cr.regrow / cr.grow); d.age = 0; d.care = 0; d.q = 0; d.giant = 0; }
    else { d.crop = null; d.g = 0; d.fert = 0; d.giant = 0; d.q = 0; }
    restage(game, b);
    emit("bedHarvest", { c: c, st: b, crop: cr.id, n: n, q: q, giant: giant, seeds: sn, first: first });
    return { ok: true, crop: cr.id, n: n, q: q, giant: giant, seeds: sn, msg: (giant ? "🌟 a GIANT " + label(cr.out) + "! " : "") + n + " " + label(cr.out) + (q ? " " + (q === 2 ? "★★" : "★") : "") + (sn ? " and " + (sn > 1 ? sn + " lots of seeds" : "seeds") : "") + (cr.regrow && d.crop ? ". it will fruit again" : "") };
  };
  // with a sickle: this bed and every ripe one beside it
  H.reap = function (game, c, b) {
    var first = H.harvest(game, c, b);
    if (!first.ok || Sv().heldKind(c) !== "sickle") return first;
    var more = 0, v = Sv().inv(c);
    SB.World.structsNear(game.world, b.x, b.z, 2.7, function (o) { return o !== b && H.ripe(o); }).forEach(function (o) { if (H.harvest(game, c, o).ok) more++; });
    Sv().wear(c, game, v.sel, 1);
    if (more) first.msg += " · the sickle reaped " + more + " more bed" + (more > 1 ? "s" : "");
    first.more = more;
    return first;
  };
  H.clear = function (game, c, b) {
    if (!isBed(b)) return { ok: false, msg: "" };
    var d = b.data; d.crop = null; d.dead = 0; d.g = 0; d.giant = 0; d.q = 0;
    restage(game, b);
    return { ok: true, msg: "you pull the dead stalks. the bed is ready again" };
  };
  H.bedText = function (game, b) {
    var d = b.data, cr = CROP[d.crop];
    if (!cr) return "an empty bed" + (d.fert ? " (fed)" : "") + ": hold seeds to sow it";
    if (d.dead) return "withered " + cr.label + ": the season turned";
    if (d.g >= 1) return (d.giant ? "a GIANT " : "ripe ") + cr.label + (d.q ? " " + (d.q === 2 ? "★★" : "★") : "");
    var wet = d.wet > 0 || cr.damp || (d.paddy && cr.paddy);
    return cr.label + ": " + (d.g < 0.25 ? "just sown" : d.g < 0.6 ? "growing" : "nearly ripe") + (wet ? "" : " · dry! it needs water") + (d.fert ? " · fed" : "");
  };
  // the tribe's own farms: water them, feed them, or tell them what to grow
  H.farmCare = function (game, c, f, how, seedKind) {
    if (!f || f.kind !== "farm" || !f.done) return { ok: false, msg: "" };
    var d = f.data;
    if (how === "sow") {
      var cr = CROP_SEED[seedKind];
      if (!cr || !Sv().take(c, seedKind, 1).length) return { ok: false, msg: "no seeds" };
      d.crop = cr.out; xp(c, "farm", 2); mark(game, f);
      emit("farmSown", { c: c, st: f, crop: cr.id });
      return { ok: true, msg: "🌾 the farm will grow " + label(cr.out) + " from now on" };
    }
    if (how === "water") {
      if ((c.sip || 0) <= 0) return { ok: false, msg: "nothing to water with" };
      if (d.hvWet && game.time - d.hvWet < 120) return { ok: false, msg: "the farm is still wet" };
      c.sip--; d.hvWet = game.time; d.grow = Math.min(1, (d.grow || 0) + 0.12);
    } else {
      if (d.hvFed && game.time - d.hvFed < 240) return { ok: false, msg: "the farm is well fed already" };
      if (!Sv().take(c, "compost", 1).length) return { ok: false, msg: "no compost" };
      d.hvFed = game.time; d.grow = Math.min(1, (d.grow || 0) + 0.25);
    }
    xp(c, "farm", 1); mark(game, f);
    emit("farmCared", { c: c, st: f, how: how });
    return { ok: true, msg: how === "water" ? "💧 the farm drinks it up" : "🟤 the farm shoots up" };
  };

  /* ---------------- machines ---------------- */
  H.machText = function (b) {
    var m = H.MACH[b.kind], d = b.data || {};
    if (!m) return "";
    if (m.helper) return m.label + ": " + m.desc;
    if (ready(b)) return label(d.out) + (d.n > 1 ? " ×" + d.n : "") + " ready";
    if (m.gen) return m.word + "… " + (d.t > 0 ? "about " + Math.max(1, Math.ceil(d.t / 60)) + " min" : "soon");
    if (d.n > 0) return m.word + "… about " + Math.max(1, Math.ceil(d.t / 60)) + " min";
    return "an empty " + m.label + ": hold " + m.takes;
  };
  H.load = function (game, c, b, k) {
    var m = H.MACH[b.kind], d = b.data, mk2 = m && m.make ? m.make(k) : null;
    if (!mk2) return { ok: false, msg: m ? "that doesn't go in a " + m.label + ". it takes " + m.takes : "" };
    if (ready(b)) return { ok: false, msg: "take out what's ready first" };
    if (d.n > 0 && d.out !== mk2[0]) return { ok: false, msg: "it's busy making " + label(d.out) };
    if ((d.n || 0) >= m.cap * mk2[1]) return { ok: false, msg: "the " + m.label + " is full" };
    if (!Sv().take(c, k, 1).length) return { ok: false, msg: "" };
    d.out = mk2[0]; d.n = (d.n || 0) + mk2[1]; d.t = m.time * (lv(c, "cook") >= 5 ? 0.8 : 1);
    mark(game, b);
    emit("machLoaded", { c: c, st: b, kind: k, out: d.out });
    return { ok: true, msg: label(k) + " in the " + m.label + ". " + m.word + "…" };
  };
  H.unload = function (game, c, b) {
    var m = H.MACH[b.kind], d = b.data;
    if (!m || !ready(b)) return { ok: false, msg: m ? H.machText(b) : "" };
    var k = d.out, n = d.n;
    give(game, c, k, n);
    d.n = 0; d.out = null; d.t = m.gen ? m.time : 0; if (m.gen) d.baited = 0;
    xp(c, m.gen === "crab" ? "fish" : m.gen ? "farm" : "cook", 2);
    if (FISH_BY[k]) { var e = st(game).fish[k] || (st(game).fish[k] = { n: 0, best: 0, d: day(game) }); e.n += n; if (!e.best) e.best = FISH_BY[k].min + 2; }
    mark(game, b);
    emit("machTaken", { c: c, st: b, kind: k, n: n });
    return { ok: true, kind: k, n: n, msg: "you take " + n + " " + label(k) + " from the " + m.label };
  };
  H.baitPot = function (game, c, b) {
    var d = b.data;
    if (b.kind !== "crabpot" || d.baited) return { ok: false, msg: "it's baited already" };
    if (!Sv().take(c, "bait", 1).length) return { ok: false, msg: "no bait" };
    d.baited = 1; d.t = Math.min(d.t || 0, H.MACH.crabpot.time * 0.5);
    return { ok: true, msg: "baited. it won't be long now" };
  };
  function runMach(game, b, step) {
    var m = H.MACH[b.kind], d = b.data;
    if (!m || m.helper) return;
    if (m.gen) {
      if ((d.n || 0) >= m.cap) return;
      if (m.gen === "honey" && season(game) === 3) return; // the bees sleep
      if (d.t == null) d.t = m.time;
      if ((d.t -= step) > 0) return;
      var out = m.gen;
      if (m.gen === "crab") { var wn = waterNear(game, b.x, b.z, 3), wk = wn ? H.waterKind(game, wn.x, wn.z) : "pond", r = rnd(game, "pot" + b.id + ":" + Math.floor(game.time))(); out = r < 0.5 ? "crab" : r < 0.75 ? (wk === "sea" ? "clam" : "minnow") : wk === "sea" ? "seaweed" : "pondweed"; }
      if (d.n > 0 && d.out !== out) out = d.out;
      d.out = out; d.n = (d.n || 0) + 1; d.baited = 0;
      d.t = d.n >= m.cap ? 0 : m.time;
      mark(game, b);
      return;
    }
    if (d.n > 0 && d.t > 0) { d.t -= step; if (d.t <= 0) { d.t = 0; mark(game, b); emit("machReady", { st: b, kind: d.out, n: d.n }); } }
  }
  // ready to be emptied: a machine when its batch is done, a bee box or a crab pot as soon as it holds anything
  function ready(b) { var m = H.MACH[b.kind], d = b.data || {}; return !!m && !m.helper && d.n > 0 && (!!m.gen || !(d.t > 0)); }
  H.ready = ready;

  /* ---------------- foraging and tapping ---------------- */
  function dug(game) { var s = st(game), dd = day(game); if (!s.dug || s.dug.d !== dd) s.dug = { d: dd, ids: {} }; return s.dug; }
  H.canForage = function (game, n) {
    if (!n || n.state !== "ok" || n.grow != null && n.grow < 1) return false;
    if (dug(game).ids[n.id]) return false;
    var se = season(game);
    return !!H.SEED_NODE[n.kind] || H.FORAGE.some(function (f) { return f.s === se && f.nodes.indexOf(n.kind) >= 0; });
  };
  H.forage = function (game, c, n) {
    if (!H.canForage(game, n)) return { ok: false, msg: "you've looked here today" };
    if (SB.dist(c.x, c.z, n.x, n.z) > 4.5) return { ok: false, msg: "get closer" };
    dug(game).ids[n.id] = 1;
    var se = season(game), r = rnd(game, "fg" + n.id + ":" + day(game)), s = st(game), lucky = H.has(c, "lucky", game) ? 0.15 : 0, got = null;
    var fl = bonus(c, "forage");
    H.FORAGE.forEach(function (f) { if (!got && f.s === se && f.nodes.indexOf(n.kind) >= 0 && r() < f.p + lucky + fl * 0.4) got = f.id; });
    if (!got && H.SEED_NODE[n.kind] && r() < 0.4 + lucky + fl * 0.4) got = H.SEED_NODE[n.kind];
    xp(c, "forage", 1);
    if (!got) return { ok: true, found: null, msg: se === 3 ? "you dig under the snow. nothing here today" : "you poke about. nothing here today" };
    give(game, c, got, 1);
    s.forage[got] = (s.forage[got] || 0) + 1;
    emit("foraged", { c: c, kind: got, node: n });
    return { ok: true, found: got, msg: (se === 3 ? "under the snow: " : "you found ") + (CROP_SEED[got] ? label(got) : (/^[aeiou]/.test(label(got)) ? "an " : "a ") + label(got)) + "!" + (s.forage[got] === 1 && !CROP_SEED[got] ? " (" + SEASON[se] + " only)" : "") };
  };
  H.tapState = function (game, n) {
    var t = st(game).taps[n.id];
    if (t == null) return null;
    return (game.time - t) >= H.TAP_SECS ? "ready" : "dripping";
  };
  H.tap = function (game, c, n) {
    if (!n || !H.TAP_TREES[n.kind] || n.state !== "ok") return { ok: false, msg: "that won't give sap" };
    if (st(game).taps[n.id] != null) return { ok: false, msg: "this tree is tapped already" };
    if (!Sv().take(c, "tapper", 1).length) return { ok: false, msg: "you need a tree tap" };
    st(game).taps[n.id] = game.time;
    emit("treeTapped", { c: c, node: n });
    return { ok: true, msg: "tapped. come back in a while for the sap" };
  };
  H.collectSap = function (game, c, n) {
    if (H.tapState(game, n) !== "ready") return { ok: false, msg: "still dripping. come back later" };
    st(game).taps[n.id] = game.time;
    give(game, c, "sap", n.kind === "maple" ? 2 : 1); xp(c, "forage", 2);
    return { ok: true, msg: "🍯 sweet sap" + (n.kind === "maple" ? " (maples give double)" : "") };
  };

  /* ================= the kitchen ================= */
  H.nearFire = function (game, c) {
    var s = game.world.structures;
    for (var i = 0; i < s.length; i++) if (s[i].done && (s[i].kind === "campfire" || s[i].kind === "kiln") && s[i].data && s[i].data.lit && SB.dist(s[i].x, s[i].z, c.x, c.z) < 3.8) return true;
    return !!(SB.Home && SB.Home.has && SB.Home.has(game, "hearth") && SB.Home.at(game, c));
  };
  H.knows = function (game, c, id) { var d = DISH[id]; return !!d && (!!st(game).dishes[id] || d.lvl <= lv(c, "cook")); };
  H.whyNotCook = function (game, c, id) {
    var d = DISH[id];
    if (!d) return "that's not a dish";
    if (c.tier < 2) return "it takes hands to cook";
    if (lacks(c, d.in)) return "it needs " + H.costText(d.in);
    if (d.pot && !Sv().count(c, "pot", true)) return "it needs a pot";
    if (!d.cold && !H.nearFire(game, c)) return "cook it by a lit fire, a kiln or your hearth";
    return "";
  };
  H.cook = function (game, c, id) {
    var why = H.whyNotCook(game, c, id), d = DISH[id], Id = SB.Ideas;
    if (why) return { ok: false, msg: why };
    for (var k in d.in) takeOf(c, k, d.in[k]);
    if (Id && !d.cold && !Id.known(c, "cook") && Id.canHold(c, "cook")) { try { if (!game.culture.found.cook) Id.discover(c, "cook", game); else Id.learn(c, "cook", 1, game, "figured out"); } catch (e) {} }
    var s = st(game), e = s.dishes[id], first = !e, n = 1;
    if (!e) e = s.dishes[id] = { n: 0, d: day(game) };
    if (SB.Body && SB.Body.roll(c, "cook")) n = 2;
    e.n += n;
    give(game, c, id, n);
    xp(c, "cook", 3); if (SB.Body) SB.Body.count(c, "cooked");
    emit("dishCooked", { c: c, id: id, first: first, n: n });
    return { ok: true, first: first, n: n, msg: d.emoji + " " + d.label + (n > 1 ? " ×2: you made it stretch" : "") + (first ? "! a new one for the cookbook" : "") };
  };
  // recipes this smol could make right now (for the button at a fire)
  H.cookable = function (game, c) { return H.DISHES.filter(function (d) { return !H.whyNotCook(game, c, d.id); }); };
  function holdsSome(c, d) { for (var k in d.in) if (countOf(c, k) > 0) return true; return false; }

  /* ---------------- things you make by hand ---------------- */
  H.CRAFTS = [
    { id: "hoe", out: "hoe", n: 1, cost: { stick: 2, stone: 1, vine: 1 } },
    { id: "dipper", out: "dipper", n: 1, cost: { leaves: 2, vine: 1 } },
    { id: "sickle", out: "sickle", n: 1, cost: { flint: 1, stick: 1, vine: 1 } },
    { id: "finerod", out: "finerod", n: 1, cost: { rod: 1, stick: 2, fiber: 2 } },
    { id: "bait", out: "bait", n: 3, cost: { "meat*": 1 }, note: "or catch a beetle or a flutterby" },
    { id: "lure", out: "lure", n: 3, cost: { "fish*": 1, fiber: 1 }, note: "draws more of the fish you made it from" },
    { id: "compost", out: "compost", n: 2, cost: { leaves: 3, "scrap*": 1 } },
    { id: "tapper", out: "tapper", n: 1, cost: { stick: 1, flint: 1 } }
  ];
  for (var mk3 in H.MACH) H.CRAFTS.push({ id: mk3, build: mk3, cost: H.MACH[mk3].cost, note: H.MACH[mk3].desc });
  var CRAFT = {}; H.CRAFTS.forEach(function (x) { CRAFT[x.id] = x; });
  H.whyNotMake = function (game, c, id) {
    var x = CRAFT[id];
    if (!x) return "nobody knows how to make that";
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    if (lacks(c, x.cost)) return "it needs " + H.costText(x.cost);
    return "";
  };
  H.make = function (game, c, id) {
    var why = H.whyNotMake(game, c, id), x = CRAFT[id];
    if (why) return { ok: false, msg: why };
    if (x.build) {
      var m = H.MACH[x.build], p = H.spot(game, c, m.r, m.water || 0);
      if (!p) return { ok: false, msg: m.water ? "it has to stand near water" + (x.build === "sprinkler" ? " (within ten steps)" : ": go to the edge") : "no room here: it needs open, dry ground" };
      for (var k in x.cost) takeOf(c, k, x.cost[k]);
      var b = put(game, c, x.build, p.x, p.z, m.gen ? { n: 0, t: m.time } : {});
      emit("harvestBuilt", { c: c, st: b });
      return { ok: true, st: b, msg: m.emoji + " a " + m.label + ", just ahead of you. " + m.desc };
    }
    var taken = {};
    for (var k2 in x.cost) taken[k2] = takeOf(c, k2, x.cost[k2]);
    if (id === "lure") st(game).lureFor = taken["fish*"][0];
    give(game, c, x.out, x.n);
    if (K[x.out].tool && bonus(c, "craft")) { var v = Sv().inv(c); for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k === x.out && v.s[i].w === Sv().uses(x.out)) { v.s[i].w = Math.round(Sv().uses(x.out) * (1 + bonus(c, "craft"))); break; } }
    xp(c, "craft", 2);
    emit("harvestMade", { c: c, kind: x.out, n: x.n });
    return { ok: true, msg: "made " + (x.n > 1 ? x.n + " " : "a ") + label(x.out) + (id === "lure" ? " for " + label(st(game).lureFor) : "") };
  };
  // thresh a crop back into seeds
  H.saveSeeds = function (game, c, out) {
    var cr = CROP_OUT[out];
    if (!cr || c.tier < 2) return { ok: false, msg: "no seeds in that" };
    if (!Sv().take(c, out, 1).length) return { ok: false, msg: "you have none" };
    give(game, c, cr.seed, 2); xp(c, "farm", 1);
    return { ok: true, msg: "2 " + label(cr.seed) + " saved from a " + label(out) };
  };

  /* ================= time ================= */
  var acc = 0;
  H.slow = function (game, step) {
    var sts = game.world.structures, pipes = [], rain = raining(game), i;
    for (i = 0; i < sts.length; i++) if (sts[i].kind === "sprinkler") pipes.push(sts[i]);
    for (i = 0; i < sts.length; i++) {
      var b = sts[i];
      if (!b.data) continue;
      if (isBed(b)) growBed(game, b, step, pipes, rain);
      else if (H.MACH[b.kind]) runMach(game, b, step);
    }
  };
  H.tick = function (game, dt) {
    if (!game || game.offline || !game.world) return;
    if (!linked.all && (linked.tries = (linked.tries || 0) + 1) < 600) linked.all = H.link();
    fishTick(game, dt);
    buffTick(game, dt);
    if ((acc += dt) < 2) return;
    var step = acc; acc = 0;
    H.slow(game, step);
  };
  // dawn: the birds have a go at any bed with no scarecrow, and the bees are counted again
  H.dawn = function (game) {
    var crows = SB.World.structsNear(game.world, 0, 0, 1e9, function (o) { return o.kind === "scarecrow"; }), pecked = 0, dd = day(game);
    H.beds(game).forEach(function (b) {
      var d = b.data;
      d.bee = beesNear(game, b) ? 1 : 0;
      if (!d.crop || d.dead || CROP[d.crop].damp) return;
      for (var i = 0; i < crows.length; i++) if (SB.dist(crows[i].x, crows[i].z, b.x, b.z) <= H.MACH.scarecrow.reach) return;
      if (rnd(game, "crow" + b.id + ":" + dd)() < 0.2) { d.g = Math.max(0.05, d.g - 0.35); d.q = 0; d.giant = 0; d.pecked = dd; pecked++; restage(game, b); }
    });
    if (pecked) { emit("bedsPecked", { n: pecked }); say("🐦 birds got at " + pecked + " of your beds in the night. a scarecrow would stop that"); }
    return pecked;
  };
  // the season turns: what is out of season withers (a ripe crop waits to be picked)
  H.turn = function (game) {
    var se = season(game), n = 0;
    H.beds(game).forEach(function (b) {
      var d = b.data, cr = CROP[d.crop];
      if (!cr || d.dead || d.g >= 1 || cr.s.indexOf(se) >= 0) return;
      d.dead = 1; d.giant = 0; n++; restage(game, b);
    });
    if (n) { emit("bedsWithered", { n: n, season: se }); say("🍂 " + SEASON[se] + ": " + n + " of your beds withered. pull the stalks and sow something for the season"); }
    return n;
  };

  /* ================= the buttons ================= */
  function done(x, r, snd) { if (r && r.msg) x.say(r.msg); if (r && r.ok && snd) x.audio(snd, 0.7); return !!(r && r.ok); }
  H.options = function (game, c, r, o, x) {
    if (!c || c.tier < 2 || !Sv()) return;
    var hk = x.hk, op = x.op, no = x.no, s = st(game);
    // a line that is out takes the main button, wherever you look
    if (F && F.cid === c.id) {
      o.use = op(F.phase === "bite" ? "hook it!" : "wait for a bite", function () { var rr = H.pull(game, c); if (rr.msg) x.say(rr.msg); if (rr.ok) { if (x.swing) x.swing(); x.audio(rr.first || rr.crate ? "achievement" : "craft", 0.7); } return rr.ok; }, null);
      if (!r || r.type === "water") o.pick = null;
      return;
    }
    if (r && r.type === "water") {
      if (H.RODS[hk]) o.use = op("cast your line", function () { var rr = H.cast(game, c, r.x != null ? r.x : c.x, r.z != null ? r.z : c.z); if (x.swing) x.swing(); x.say(rr.msg); return rr.ok; }, null);
      else if (H.WATER[hk]) o.use = (c.sip || 0) >= H.WATER[hk] ? no("your " + label(hk) + " is full of water") : op("fill your " + label(hk), function () { return done(x, H.fill(game, c), "craft"); }, null);
      else if (hk === "bait") o.use = op("throw bait in", function () { return done(x, H.chum(game, c, r.x, r.z), "craft"); }, null);
      return;
    }
    if (r && r.type === "struct") {
      var b = r.ref, d = b.data || {};
      if (isBed(b)) {
        var cr = CROP[d.crop];
        if (!cr) {
          if (hk === "seed" || CROP_SEED[hk]) o.use = op("sow " + (hk === "seed" ? "wild seeds" : CROP_SEED[hk].label), function () { return done(x, H.sow(game, c, b, hk), "build"); }, null);
          else if (hk === "compost" && !d.fert) o.use = op("dig in compost", function () { return done(x, H.feed(game, c, b), "build"); }, null);
          else o.use = no(H.bedText(game, b));
          if (hk === "hoe") o.place = op("rake the bed flat", function () { return done(x, H.remove(game, c, b), "build"); }, null);
        } else if (d.dead) o.use = op("pull the dead stalks", function () { return done(x, H.clear(game, c, b), "build"); }, null);
        else if (d.g >= 1) { o.use = op("harvest the " + cr.label, function () { if (x.swing) x.swing(); var rr = H.reap(game, c, b); return done(x, rr, rr.giant ? "achievement" : "craft"); }, null); o.pick = o.use; }
        else if (H.WATER[hk] && !cr.damp) o.use = (c.sip || 0) <= 0 ? no("your " + label(hk) + " is empty: fill it at any water") : d.wet > 120 ? no(H.bedText(game, b) + " · wet") : op("water the " + cr.label, function () { return done(x, H.water(game, c, b), "craft"); }, null);
        else if (hk === "compost" && !d.fert) o.use = op("dig in compost", function () { return done(x, H.feed(game, c, b), "build"); }, null);
        else o.use = no(H.bedText(game, b));
        if (o.use && !o.use.locked && !o.place) o.place = o.use;
        return;
      }
      var m = H.MACH[b.kind];
      if (m) {
        if (m.helper) o.use = no(H.machText(b));
        else if (ready(b)) { o.use = op("take the " + label(d.out) + (d.n > 1 ? " ×" + d.n : ""), function () { return done(x, H.unload(game, c, b), "craft"); }, null); o.pick = o.use; }
        else if (b.kind === "crabpot" && hk === "bait" && !d.baited) o.use = op("bait the pot", function () { return done(x, H.baitPot(game, c, b), "craft"); }, null);
        else if (m.make && hk && m.make(hk) && (!(d.n > 0) || (d.out === m.make(hk)[0] && d.n < m.cap * m.make(hk)[1]))) o.use = op("put your " + label(hk) + " in", function () { return done(x, H.load(game, c, b, hk), "craft"); }, null);
        else o.use = no(H.machText(b));
        if (!(d.n > 0) || m.helper) o.place = op("take the " + m.label + " down", function () { return done(x, H.remove(game, c, b), "build"); }, null);
        else if (o.use && !o.use.locked) o.place = o.use;
        return;
      }
      if (b.kind === "farm" && b.done) {
        if (H.WATER[hk] && (c.sip || 0) > 0) o.place = op("water the farm", function () { return done(x, H.farmCare(game, c, b, "water"), "craft"); }, null);
        else if (hk === "compost") o.place = op("feed the farm compost", function () { return done(x, H.farmCare(game, c, b, "feed"), "build"); }, null);
        else if (CROP_SEED[hk]) o.place = op("sow " + CROP_SEED[hk].label + " here", function () { return done(x, H.farmCare(game, c, b, "sow", hk), "build"); }, null);
        return;
      }
      if ((b.kind === "campfire" || b.kind === "kiln") && b.done && d.lit && !o.pick && H.cookable(game, c).length) o.pick = op("cook a dish", function () { page = "cook"; x.openBag("harvest"); return true; }, null);
      return;
    }
    if (r && r.type === "node") {
      var n = r.ref, ts = H.TAP_TREES[n.kind] && n.state === "ok" ? H.tapState(game, n) : null;
      if (ts === "ready") o.pick = op("collect the sap", function () { return done(x, H.collectSap(game, c, n), "craft"); }, null);
      else if (hk === "tapper" && H.TAP_TREES[n.kind] && n.state === "ok" && !ts) o.place = op("tap the " + (NK[n.kind] ? NK[n.kind].label : "tree"), function () { return done(x, H.tap(game, c, n), "build"); }, null);
      else if (H.canForage(game, n) && (!o.place || /^put down/.test(o.place.label || ""))) o.place = op(season(game) === 3 ? "dig under the snow" : "look for wild food", function () { return done(x, H.forage(game, c, n), "craft"); }, null);
      return;
    }
    if (r && r.type === "item") {
      if ((r.kind === "beetle" || r.kind === "butterfly") && !o.pick) o.pick = op("catch it for bait", function () { return done(x, H.catchBug(game, c, r.ref), "craft"); }, null);
      return;
    }
    if (!r && hk === "hoe") {
      var ag = x.state && x.state.aim ? x.state.aim : null;
      o.use = op("till a bed here", function () { if (x.swing) x.swing(); return done(x, H.till(game, c, ag && !ag.far ? ag.x : null, ag && !ag.far ? ag.z : null), "build"); }, null);
    }
    void s;
  };

  /* ================= the bag's "harvest" tab ================= */
  var page = "cook";
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  H.found = function (game) {
    var s = st(game), f = 0, d = 0, cr = 0;
    H.FISH.forEach(function (x) { if (s.fish[x.id] && s.fish[x.id].n > 0) f++; });
    H.DISHES.forEach(function (x) { if (s.dishes[x.id]) d++; });
    H.CROPS.forEach(function (x) { if (s.crops[x.id]) cr++; });
    return { fish: f, fishOf: H.FISH.length, dishes: d, dishesOf: H.DISHES.length, crops: cr, cropsOf: H.CROPS.length, n: f + d + cr, of: H.FISH.length + H.DISHES.length + H.CROPS.length };
  };
  function needHtml(c, cost, icon) {
    var out = [];
    for (var k in cost) { var n = countOf(c, k); out.push("<span class='" + (n >= cost[k] ? "ok" : "no") + "'>" + (GROUPS[k] ? "" : icon(k, 16) + " ") + Math.min(n, cost[k]) + "/" + cost[k] + (GROUPS[k] ? " " + esc(GROUPS[k].name) : "") + "</span>"); }
    return "<div class='need'>" + out.join("") + "</div>";
  }
  H.PERKS = {
    farm: [[2, "watering lasts half as long again"], [4, "seeds back from every harvest"], [5, "two-star crops without compost"], [6, "more giant crops"]],
    cook: [[2, "berry tart and fish pie"], [3, "boosts last a quarter longer"], [4, "gourd soup and fire stew"], [5, "machines work faster for you"], [6, "honey cake and fisher's bowl"], [8, "bean pot and the harvest feast"]],
    fish: [[2, "longer to hook a bite"], [5, "far less junk"], [6, "now and then two small fish at once"], [8, "rare fish bite more"]]
  };
  function cookHtml(game, c, icon) {
    var s = st(game), fire = H.nearFire(game, c), out = "<div class='lbl'>" + (fire ? "🔥 you're by a fire: cook away" : "cook by a lit fire, a kiln or your hearth") + (Sv().count(c, "pot", true) ? " · you have a pot" : " · no pot: some dishes need one") + "</div><div class='rlist'>", hidden = 0;
    H.DISHES.forEach(function (d) {
      var known = H.knows(game, c, d.id), why = H.whyNotCook(game, c, d.id), e = s.dishes[d.id], bd = d.buff ? H.BUFFS[d.buff] : null;
      if (!known && !holdsSome(c, d)) { hidden++; return; }
      if (known) out += "<div class='rc'><span class='big'>" + d.emoji + "</span><div class='t'>" + esc(d.label) + (d.drink ? " <small>(a drink)</small>" : "") + "<small>" + (bd ? bd.icon + " " + esc(bd.name) + " " + Math.round(d.secs / 60) + " min" : "❓ a surprise") + (d.pot ? " · pot" : "") + (d.cold ? " · no fire" : "") + (e ? " · cooked ×" + e.n : "") + "</small>" + needHtml(c, d.in, icon) + "</div><button class='btn go' data-hvcook='" + d.id + "' " + (why ? "disabled" : "") + ">cook</button></div>";
      else out += "<div class='rc'><span class='big'>❓</span><div class='t'>a dish you don't know<small>" + esc(d.riddle) + "</small></div><button class='btn go' data-hvcook='" + d.id + "' " + (why ? "disabled" : "") + ">try it</button></div>";
    });
    out += "</div>";
    if (hidden) out += "<p class='help'>" + hidden + " more to find. carry an ingredient and a hint shows up here.</p>";
    return out;
  }
  function makeHtml(game, c, icon) {
    var out = "<div class='lbl'>make by hand</div><div class='rlist'>";
    H.CRAFTS.forEach(function (x) {
      var m = x.build ? H.MACH[x.build] : null, k = x.out, why = H.whyNotMake(game, c, x.id);
      out += "<div class='rc'><span class='big'>" + (m ? m.emoji : icon(k, 28)) + "</span><div class='t'>" + esc(m ? m.label : label(k)) + (x.n > 1 ? " ×" + x.n : "") + "<small>" + esc(m ? m.desc : (K[k].desc || "") + (x.note ? " " + x.note + "." : "")) + "</small>" + needHtml(c, x.cost, icon) + "</div><button class='btn go' data-hvmake='" + x.id + "' " + (why ? "disabled" : "") + ">" + (m ? "set up" : "make") + "</button></div>";
    });
    out += "</div>";
    var seeds = [];
    H.CROPS.forEach(function (cr) { if (CROP_OUT[cr.out] === cr && Sv().count(c, cr.out, true) > 0) seeds.push("<button class='btn' data-hvseed='" + cr.out + "'>" + icon(cr.out, 16) + " " + esc(label(cr.out)) + " → 2 seeds</button>"); });
    out += "<div class='lbl'>save seeds from a crop</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + (seeds.length ? seeds.join("") : "<span class='help'>carry something you grew (or found) and you can thresh it for seeds</span>") + "</div>";
    if (SB.Body) {
      out += "<div class='lbl'>what practice gives you</div>";
      ["farm", "cook", "fish"].forEach(function (id) {
        var l = lv(c, id), sk = SB.Body.BY_ID[id];
        out += "<p class='help'><b>" + (sk ? sk.emoji + " " + esc(sk.label) : id) + " " + l + "</b> · " + H.PERKS[id].map(function (p) { return "<span class='" + (l >= p[0] ? "ok" : "no") + "'>" + p[0] + ": " + esc(p[1]) + "</span>"; }).join(" · ") + "</p>";
      });
    }
    return out;
  }
  function fishHtml(game, c, icon) {
    var s = st(game), fd = H.found(game), out = "<div class='lbl'>the fish log · " + fd.fish + " of " + fd.fishOf + " kinds" + (s.junk ? " · junk " + s.junk : "") + (s.crates ? " · crates " + s.crates : "") + (s.lureFor ? " · your lures draw " + esc(label(s.lureFor)) : "") + "</div><div class='rlist'>";
    H.FISH.forEach(function (f) {
      var e = s.fish[f.id], got = e && e.n > 0;
      out += "<div class='rc'><span class='big'>" + (got ? f.emoji : "❔") + "</span><div class='t'>" + (got ? esc(f.label) : "not caught yet") + " <small>(" + RARE_WORD[f.rare] + ")</small><small>" + (got ? "caught ×" + e.n + " · biggest " + e.best + " cm · " : "") + esc(H.fishHint(f)) + "</small></div>" + (got ? "<span class='ok'>✓</span>" : "") + "</div>";
    });
    return out + "</div>";
  }
  function cropHtml(game, c, icon) {
    var s = st(game), fd = H.found(game), beds = H.beds(game), ripe = 0, dry = 0, se = season(game);
    beds.forEach(function (b) { var d = b.data, cr = CROP[d.crop]; if (H.ripe(b)) ripe++; else if (cr && !d.dead && !cr.damp && !(d.wet > 0)) dry++; });
    var out = "<div class='lbl'>your beds: " + beds.length + (ripe ? " · " + ripe + " ripe" : "") + (dry ? " · " + dry + " dry" : "") + " · it's " + SEASON[se] + ((c.sip || 0) > 0 ? " · 💧 " + c.sip + " waterings carried" : "") + "</div><div class='rlist'>";
    H.CROPS.forEach(function (cr) {
      var e = s.crops[cr.id], now = cr.s.indexOf(se) >= 0;
      out += "<div class='rc'><span class='big'>" + icon(cr.out, 28) + "</span><div class='t'>" + esc(cr.label) + " <small class='" + (now ? "ok" : "no") + "'>" + esc(seasonsText(cr.s)) + "</small><small>" + (e ? "grown ×" + e.n + (e.q ? " · best " + (e.q === 2 ? "★★" : "★") : "") + (e.g ? " · giants " + e.g : "") + " · " : "") + (cr.regrow ? "fruits again" : "one harvest") + (cr.giant ? " · can grow giant" : "") + (cr.paddy ? " · loves wet feet" : "") + (cr.damp ? " · no watering" : "") + (cr.found ? " · seeds are found, not wild" : "") + "</small></div>" + (e ? "<span class='ok'>✓</span>" : "") + "</div>";
    });
    out += "</div><div class='lbl'>found in the wild</div><p class='help'>";
    out += H.FORAGE.map(function (f) { return (s.forage[f.id] ? "<span class='ok'>" + K[f.id].emoji + " " + esc(label(f.id)) + " ×" + s.forage[f.id] + "</span>" : "<span class='no'>❔ " + SEASON[f.s] + "</span>"); }).join(" · ") + "</p>";
    out += "<p class='help'>crops " + fd.crops + "/" + fd.cropsOf + ". till a bed with a hoe, sow, water. care gives stars: a bigger harvest. no scarecrow, and the birds come.</p>";
    return out;
  }
  H.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    var fd = H.found(game), tabs = [["cook", "🍲 cook " + fd.dishes + "/" + fd.dishesOf], ["make", "🛠 make"], ["fish", "🐟 fish " + fd.fish + "/" + fd.fishOf], ["crops", "🌱 crops " + fd.crops + "/" + fd.cropsOf]];
    var out = "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px'>" + tabs.map(function (t) { return "<button class='btn" + (page === t[0] ? " go" : "") + "' data-hvpage='" + t[0] + "'>" + t[1] + "</button>"; }).join("") + "</div>";
    var bf = H.buffs(c, game);
    if (bf.length) out += "<div class='lbl'>" + bf.map(function (b) { return b.def.icon + " " + esc(b.def.name) + " " + Math.max(1, Math.ceil(b.left / 60)) + " min"; }).join(" · ") + "</div>";
    if (c.tier < 2 && (page === "cook" || page === "make")) return out + "<p><b>it takes hands.</b> a tool-user and up can fish, till, cook and build these. the logs fill in as you go.</p>";
    return out + (page === "make" ? makeHtml(game, c, icon) : page === "fish" ? fishHtml(game, c, icon) : page === "crops" ? cropHtml(game, c, icon) : cookHtml(game, c, icon));
  };
  H.wire = function (root, game, c, redraw, sayFn) {
    function fin(r) { if (r && r.msg && sayFn) sayFn(r.msg); if (r && r.ok) sound(r.first ? "achievement" : "craft"); redraw(); }
    root.querySelectorAll("[data-hvpage]").forEach(function (b) { b.addEventListener("click", function () { page = b.getAttribute("data-hvpage"); redraw(); }); });
    root.querySelectorAll("[data-hvcook]").forEach(function (b) { b.addEventListener("click", function () { fin(H.cook(game, c, b.getAttribute("data-hvcook"))); }); });
    root.querySelectorAll("[data-hvmake]").forEach(function (b) { b.addEventListener("click", function () { fin(H.make(game, c, b.getAttribute("data-hvmake"))); }); });
    root.querySelectorAll("[data-hvseed]").forEach(function (b) { b.addEventListener("click", function () { fin(H.saveSeeds(game, c, b.getAttribute("data-hvseed"))); }); });
  };
  H.setPage = function (p) { page = p; };
  H.chips = function (game, c) {
    var out = [];
    if (F && c && F.cid === c.id) out.push(F.phase === "bite" ? { icon: "❗", text: "a bite!", bad: true, tip: "press use now" } : { icon: "🎣", text: "line out", tip: "keep still. press use when it bites" });
    H.buffs(c, game).forEach(function (b) { out.push({ icon: b.def.icon, text: b.def.name + " " + Math.max(1, Math.ceil(b.left / 60)) + "m", tip: label(b.id) + ": " + b.def.tip }); });
    if (c && (c.sip || 0) > 0 && Sv() && H.WATER[Sv().heldKind(c)]) out.push({ icon: "💧", text: c.sip + " waterings", tip: "look at a garden bed or a farm to water it" });
    return out;
  };

  /* ================= hooks ================= */
  // things that live in other files (whichever of them is loaded, and in whatever order): done once each
  var linked = {};
  H.link = function () {
    var S = Sv(), B = SB.Body, L = SB.Loot;
    if (S && S.TOOL && !linked.tool) { linked.tool = 1; for (var t in TOOLS) if (!S.TOOL[t]) S.TOOL[t] = TOOLS[t]; if (S.FUEL) { if (!S.FUEL.seaweed) S.FUEL.seaweed = 0.25; if (!S.FUEL.sap) S.FUEL.sap = 0.5; } }
    if (B && B.SKILLS && B.BY_ID && !linked.body) { linked.body = 1; if (!B.BY_ID.farm) { var fs = { id: "farm", label: "farming", emoji: "🌱", perk: "crops grow faster, and come up better" }; B.SKILLS.push(fs); B.BY_ID.farm = fs; } }
    if (L && L.TABLES && !linked.loot) { // old seeds turn up where the ark's things do
      linked.loot = 1;
      var LT = L.TABLES;
      if (LT.ruin) LT.ruin.items.push(["s_snowbulb", 1, 2, 2]);
      if (LT.wreck) LT.wreck.items.push(["s_starmelon", 1, 2, 2]);
      if (LT.pod) LT.pod.items.push(["s_starmelon", 1, 1, 2]);
      if (LT.nest) LT.nest.items.push(["s_berry", 2, 3, 1]);
      if (L.PACK) L.PACK.push(["s_starmelon", 2, 4], ["s_snowbulb", 2, 3], ["s_tea", 2, 2]);
    }
    return linked.tool && linked.body && linked.loot;
  };
  H.link();
  var hooked = false;
  H.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function cur() { return SB.Game && SB.Game.current; }
    SB.bus.on("povEat", function (d) { var game = cur(); if (game && d && d.c) H.ate(game, d.c, d.kind); });
    SB.bus.on("dawn", function () { var game = cur(); if (game && !game.offline && game.world) H.dawn(game); });
    SB.bus.on("season", function () { var game = cur(); if (game && !game.offline && game.world) H.turn(game); });
    if (SB.Ext) {
      SB.Ext.on("tick", H.tick);
      SB.Ext.on("options", H.options);
      SB.Ext.on("damage", function (game, c) { return c && H.has(c, "mighty", game) ? 1.3 : 1; });
      SB.Ext.on("vitals", H.chips);
      SB.Ext.on("goals", function (game, add) { if (!game.quests || !game.quests.harvest) return; var fd = H.found(game); if (fd.n > 0) add("fill the harvest book: fish, dishes and crops", fd.n + "/" + fd.of, fd.n >= fd.of, false); });
      SB.Ext.tab({ id: "harvest", label: function () { return "🌾 harvest"; }, show: function (game, c) { return c.tier >= 2 || H.found(game).n > 0; }, html: H.html, wire: H.wire });
    }
  };
  H.hook();

  /* ================= the models ================= */
  var ME = SB.Meshes || SB.ME;
  function bedModel(stage) {
    return function () {
      var b = ME.builder(), i, j;
      b.color(0x5a3a22).push().translate(0, 0.03, 0).box(0.92, 0.07, 0.92).pop();
      b.color(0x7a5236);
      for (i = 0; i < 3; i++) b.push().translate(-0.28 + i * 0.28, 0.08, 0).box(0.18, 0.06, 0.84).pop();
      if (!stage) return b.finish();
      var h = stage === 1 ? 0.1 : stage === 2 ? 0.24 : 0.3;
      for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
        var px = -0.28 + i * 0.28, pz = -0.28 + j * 0.28;
        b.color(stage === 1 ? 0x8fd06a : 0x4f9a3a).push().translate(px, 0.1, pz).cone(5, stage === 1 ? 0.04 : 0.09, h).pop();
        if (stage === 3) b.color(0xf2b84b).push().translate(px + 0.05, 0.1 + h * 0.6, pz + 0.03).scale(0.055).sphere(0).pop();
      }
      return b.finish();
    };
  }
  var MODELS = {
    gardenbed: bedModel(0), gardenbed1: bedModel(1), gardenbed2: bedModel(2), gardenbed3: bedModel(3),
    dryrack: function () {
      var b = ME.builder(), i;
      b.color(0x8a6440);
      [-0.45, 0.45].forEach(function (px) { b.push().translate(px, 0, -0.18).rotX(0.3).cyl(4, 0.03, 0.025, 0.85).pop().push().translate(px, 0, 0.18).rotX(-0.3).cyl(4, 0.03, 0.025, 0.85).pop(); });
      b.push().translate(0, 0.78, 0).box(1.0, 0.04, 0.04).pop().push().translate(0, 0.5, 0).box(0.96, 0.03, 0.03).pop();
      for (i = 0; i < 4; i++) b.color(i % 2 ? 0xd98a5a : 0x9a5a4a).push().translate(-0.3 + i * 0.2, 0.66, 0).box(0.07, 0.2, 0.02).pop();
      return b.finish();
    },
    smoker: function () {
      var b = ME.builder();
      b.color(0x8e8a96).cyl(7, 0.38, 0.32, 0.5);
      b.color(0x2a2522).push().translate(0, 0.16, 0.3).box(0.2, 0.22, 0.1).pop();
      b.color(0x6a4a2e).push().translate(0, 0.5, 0).cone(7, 0.44, 0.34).pop();
      b.color(0xbdbdc6).push().translate(0, 0.9, 0).scale(0.09).sphere(0).pop();
      return b.finish();
    },
    crock: function () {
      var b = ME.builder();
      b.color(0xb0603a).cyl(8, 0.22, 0.3, 0.3).push().translate(0, 0.3, 0).cyl(8, 0.3, 0.2, 0.22).pop();
      b.color(0x8a4a2e).push().translate(0, 0.52, 0).cyl(8, 0.22, 0.22, 0.05).pop().push().translate(0, 0.57, 0).scale(0.05).sphere(0).pop();
      return b.finish();
    },
    quern: function () {
      var b = ME.builder();
      b.color(0x8e8a96).cyl(8, 0.36, 0.36, 0.16);
      b.color(0xa8a4b0).push().translate(0, 0.18, 0).cyl(8, 0.3, 0.3, 0.14).pop();
      b.color(0x8a6440).push().translate(0.2, 0.32, 0).cyl(4, 0.025, 0.025, 0.22).pop();
      b.color(0xf0e6cf).push().translate(0.42, 0.03, 0.1).scale(0.09, 0.04, 0.09).sphere(0).pop();
      return b.finish();
    },
    heap: function () {
      var b = ME.builder();
      b.color(0x8a6440);
      [[-0.42, 0], [0.42, 0]].forEach(function (p) { b.push().translate(p[0], 0.18, p[1]).box(0.05, 0.36, 0.8).pop(); });
      b.push().translate(0, 0.18, -0.4).box(0.86, 0.36, 0.05).pop();
      b.color(0x4a3424).push().translate(0, 0.12, 0).scale(0.36, 0.26, 0.34).sphere(1).pop();
      b.color(0x6fbf4a).push().translate(0.1, 0.36, 0.05).scale(0.08, 0.03, 0.08).sphere(0).pop();
      return b.finish();
    },
    beebox: function () {
      var b = ME.builder();
      b.color(0x8a6440);
      [[-0.2, -0.16], [0.2, -0.16], [-0.2, 0.16], [0.2, 0.16]].forEach(function (p) { b.push().translate(p[0], 0, p[1]).cyl(4, 0.03, 0.03, 0.2).pop(); });
      b.color(0xf2c860).push().translate(0, 0.38, 0).box(0.5, 0.36, 0.42).pop();
      b.color(0x3a2a1a).push().translate(0, 0.38, 0.215).box(0.5, 0.05, 0.01).pop().push().translate(0, 0.26, 0.215).box(0.16, 0.04, 0.02).pop();
      b.color(0x9a6a3c).push().translate(0, 0.59, 0).box(0.6, 0.06, 0.52).pop();
      return b.finish();
    },
    crabpot: function () {
      var b = ME.builder();
      b.color(0xc9a05a).cyl(8, 0.3, 0.24, 0.3, false);
      b.color(0xa8804a).push().translate(0, 0.3, 0).cyl(8, 0.24, 0.1, 0.08, false).pop();
      b.color(0x8a6440).push().translate(0.34, 0, 0).cyl(4, 0.02, 0.02, 0.6).pop();
      b.color(0xe5484d).push().translate(0.34, 0.62, 0).scale(0.06).sphere(0).pop();
      return b.finish();
    },
    scarecrow: function () {
      var b = ME.builder();
      b.color(0x8a6440).cyl(4, 0.035, 0.035, 1.0).push().translate(0, 0.72, 0).rotZ(1.5708).translate(0, -0.32, 0).cyl(4, 0.028, 0.028, 0.64).pop();
      b.color(0xd96a4a).push().translate(0, 0.56, 0).box(0.28, 0.3, 0.12).pop();
      b.color(0xe8cf8a).push().translate(0, 0.94, 0).scale(0.12).sphere(1).pop();
      b.color(0xd9b86a).push().translate(0, 1.02, 0).cyl(7, 0.2, 0.03, 0.12).pop();
      return b.finish();
    },
    sprinkler: function () {
      var b = ME.builder();
      b.color(0x8a6440).push().translate(-0.25, 0, 0).cyl(4, 0.03, 0.03, 0.4).pop().push().translate(0.25, 0, 0).cyl(4, 0.03, 0.03, 0.34).pop();
      b.color(0xb8c46a).push().translate(-0.36, 0.42, 0).rotZ(-1.66).cyl(6, 0.045, 0.045, 0.74).pop();
      b.color(0x7fb7d6).push().translate(0.4, 0.14, 0).scale(0.03, 0.14, 0.03).sphere(0).pop().push().translate(0.4, 0.02, 0).scale(0.12, 0.015, 0.12).sphere(0).pop();
      return b.finish();
    }
  };
  function itemModel(k) {
    var b = ME.builder(), col = K[k].color || 0xffffff, sh = SHAPE[k];
    if (K[k].glow && b.glow) b.glow(0.6);
    if (sh === "fish") {
      var big = FISH_BY[k] && FISH_BY[k].rare === 4 ? 1.5 : 1;
      b.color(col).push().translate(0, 0.08 * big, 0).scale(0.2 * big, 0.08 * big, 0.06 * big).sphere(1).pop();
      b.push().translate(-0.2 * big, 0.08 * big, 0).box(0.1 * big, 0.12 * big, 0.02).pop();
      b.color(0x1a1a22).push().translate(0.13 * big, 0.1 * big, 0.05 * big).scale(0.015).sphere(0).pop();
    } else if (sh === "bowl") {
      b.color(0x9a6a3c).cyl(8, 0.08, 0.15, 0.09);
      b.color(col).push().translate(0, 0.09, 0).scale(0.13, 0.05, 0.13).sphere(1).pop();
    } else if (sh === "jar") {
      b.color(col).cyl(7, 0.08, 0.09, 0.16);
      b.color(0x8a5a33).push().translate(0, 0.16, 0).cyl(7, 0.07, 0.07, 0.03).pop();
    } else if (sh === "veg") {
      b.color(col).push().translate(0, 0.09, 0).scale(0.1, 0.09, 0.1).sphere(1).pop();
      b.color(0x4f9a3a).push().translate(0, 0.17, 0).cone(4, 0.04, 0.08).pop();
    } else if (sh === "tool") {
      b.color(0x8a5a33).push().translate(-0.22, 0.04, 0).rotZ(-1.5).cyl(4, 0.025, 0.02, 0.46).pop();
      b.color(col).push().translate(0.2, 0.05, 0).box(0.12, 0.05, 0.14).pop();
    } else {
      b.color(0xc9a05a).push().translate(0, 0.06, 0).scale(0.09, 0.07, 0.09).sphere(1).pop();
      b.color(col).push().translate(0, 0.13, 0).scale(0.05).sphere(0).pop();
    }
    return b.finish();
  }
  if (ME && ME.STRUCT_BUILDERS && ME.builder) {
    try {
      for (var mm in MODELS) if (!ME.STRUCT_BUILDERS[mm]) ME.STRUCT_BUILDERS[mm] = MODELS[mm];
      if (ME.itemMesh && !ME.itemMesh._harvest) {
        var old = ME.itemMesh;
        ME.itemMesh = function (k) { if (SHAPE[k] && K[k]) { try { return itemModel(k); } catch (e) {} } return old(k); };
        ME.itemMesh._harvest = 1;
      }
    } catch (e) {}
  }
  H.MODELS = MODELS;
})();
