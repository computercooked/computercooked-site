/* smol brains — town.js ("home and town"): the rest of the Sims / Stardew / Hearthfire side, on top of home.js.
   home.js gives you one home with a bed, a chest, a hearth and a berry patch. This file adds, without rewriting it:
     furniture   twenty-two more things made at the door from your bag (table, rug, lantern, shelf, wardrobe, pot,
                 workbench, window box, music box, mirror, rain barrel, pet bed, noticeboard...). Each has a comfort
                 value and most do something. They are a list in the home tab, not 3D objects.
     comfort     everything in and around the home adds up to a score with named steps (bare, plain, tidy, snug, cosy,
                 homely, grand). Wake in your own bed and the step sets your morning: mood, a longer cosy day, less tired.
     upgrades    lean-to to hut to house to lodge, in place, keeping everything inside. More room and chest with each.
     the yard    small things you build near home: garden fence, stepping stones, flower bed, beehive, garden plot,
                 bench, lamp post, signpost, swing. And a well.
     the wall    captain trophies (loot.js), your biggest fish, keepsakes from feasts, market days and housewarmings.
     dye         a mirror at home lets a smol dye its fur (the look's own hue), and wash it out again.
     the town    buildings the tribe has no idea for, which you plan and build by hand (or pay the tribe to stock):
                 well, common house, bakery, smithy, archive, watchtower, shrine, storehouse, healer's hut.
                 Each does one real thing for the tribe. Paving stones laid by hand.
     keepers     ask a smol to keep a building (baker, smith, keeper, watch, healer): it does more, and never wears out.
     upkeep      your buildings wear a little every day; a worn-out one stops working until it is mended with a stick.
     names       give your home and buildings a name. Take a building of yours down for half its materials.
     visitors    a comfortable home gets visitors who sign the guest book; throw a housewarming.
   State: game.quests.town (saved with the quest board). What a building holds lives in its own data (saved with the
   world); a smol's post, dye and snug morning are plain fields on the smol. Rolls its own dice. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var T = SB.Town = {};
  var K = SB.KINDS || {}, SK = SB.STRUCTS || {};
  T.YARD = 12;      // this close to home and a yard thing counts for the home
  T.NEAR = 6;       // this close to a building and the town tab shows it
  T.WORN = 0.5;     // damage at which a building of yours stops working
  T.WEAR = 0.04;    // what a day adds
  T.STORE = 18;     // slots in a storehouse
  T.STEPS = [[0, "bare"], [4, "plain"], [8, "tidy"], [13, "snug"], [19, "cosy"], [26, "homely"], [34, "grand"]];
  T.ROOMS = { leanto: 4, hut: 10, house: 16, lodge: 30 };     // how many pieces of furniture fit
  T.CHEST = { leanto: 12, hut: 18, house: 24, lodge: 30 };    // chest slots
  T.KIND_COMFORT = { leanto: 0, hut: 1, house: 3, lodge: 5 };
  T.NEXT = { leanto: "hut", hut: "house", house: "lodge" };
  T.FURNITURE = [
    { id: "table", icon: "🪑", name: "a table and stools", cost: { stick: 6 }, c: 2, perk: "a meal eaten at home fills you more." },
    { id: "rug", icon: "🧶", name: "a fur rug", cost: { fur: 2 }, c: 2, perk: "soft under your paws." },
    { id: "lantern", icon: "🏮", name: "a lantern", cost: { clay: 1, stick: 1 }, c: 1, perk: "its light pushes the hearth's safe ring out further." },
    { id: "shelf", icon: "🗄", name: "a shelf", cost: { stick: 4 }, c: 1, perk: "six more slots in the chest." },
    { id: "wardrobe", icon: "🚪", name: "a wardrobe", cost: { stick: 6, fiber: 2 }, c: 1, perk: "six more slots, for the big things." },
    { id: "pot", icon: "🍲", name: "a cooking pot", cost: { clay: 3 }, c: 1, perk: "a hot meal waiting every morning." },
    { id: "bench", icon: "🔨", name: "a workbench", cost: { stick: 4, stone: 2 }, c: 1, perk: "tools you make at home last a quarter longer." },
    { id: "windowbox", icon: "🌼", name: "a window box", cost: { seed: 1, clay: 1 }, c: 2, perk: "a herb to pick every other morning." },
    { id: "musicbox", icon: "🎵", name: "a music box", cost: { metal: 1, stick: 2 }, c: 2, perk: "wind it up and boredom melts away." },
    { id: "mirror", icon: "🪞", name: "a mirror", cost: { metal: 1 }, c: 1, perk: "dye your fur a new colour here." },
    { id: "barrel", icon: "🛢", name: "a rain barrel", cost: { stick: 5, vine: 1 }, c: 1, perk: "a drink at home. no walk to the pond." },
    { id: "petbed", icon: "🧺", name: "a pet bed", cost: { leaves: 3, fur: 1 }, c: 1, perk: "somewhere soft for a small friend." },
    { id: "board", icon: "📌", name: "a noticeboard", cost: { stick: 3, leaves: 1 }, c: 1, perk: "friends see you're in: visitors come twice as often." },
    { id: "basket", icon: "📮", name: "a doorstep basket", cost: { fiber: 3, vine: 1 }, c: 1, perk: "visitors leave you something in it." },
    { id: "cushions", icon: "🛋", name: "cushions", cost: { fur: 1, fiber: 2 }, c: 1, perk: "for sinking into." },
    { id: "candles", icon: "🕯", name: "beeswax candles", cost: { honey: 2 }, c: 1, perk: "a warm little light." },
    { id: "painting", icon: "🖼", name: "a painting", cost: { berry: 3, leaves: 2 }, c: 2, perk: "the island, in berry juice." },
    { id: "floor", icon: "🟫", name: "a wooden floor", cost: { stick: 8 }, c: 2, perk: "no more muddy paws." },
    { id: "fishbowl", icon: "🐟", name: "a fish bowl", cost: { clay: 2, fish: 1 }, c: 1, perk: "a fish you caught, swimming in circles." },
    { id: "bugjar", icon: "🫙", name: "a bug jar", cost: { clay: 1, beetle: 1 }, c: 1, perk: "a beetle with a view." },
    { id: "rack", icon: "🪝", name: "a display rack", cost: { stick: 3, vine: 1 }, c: 1, perk: "trophies and keepsakes on show count twice." },
    { id: "flowerpot", icon: "🪴", name: "a flower pot", cost: { clay: 1, seed: 1 }, c: 1, perk: "something green indoors." }
  ];
  T.FBY = {}; T.FURNITURE.forEach(function (f) { T.FBY[f.id] = f; });
  T.DYES = [
    { id: "berry", icon: "🫐", name: "berry purple", hue: 285, cost: { berry: 2 } },
    { id: "leaf", icon: "🍃", name: "leaf green", hue: 110, cost: { leaves: 2 } },
    { id: "clay", icon: "🧱", name: "clay red", hue: 14, cost: { clay: 1 } },
    { id: "honey", icon: "🍯", name: "honey gold", hue: 46, cost: { honey: 1 } },
    { id: "cherry", icon: "🍒", name: "cherry pink", hue: 334, cost: { cherry: 2 } },
    { id: "glow", icon: "🍄", name: "glowcap blue", hue: 200, cost: { glowcap: 1 } }
  ];
  /* the buildings. group: home (the lodge), yard (count for the home when near it), town (do something for the tribe).
     gate: an idea the tribe must have first. job: what a smol who keeps it is called. c: comfort when in the yard */
  T.META = {
    lodge: { group: "home", gate: "house", roof: 1 },
    fence: { group: "yard", c: 1, max: 3 }, path: { group: "yard", c: 1, max: 4 }, flowerbed: { group: "yard", c: 2, max: 3 },
    beehive: { group: "yard", c: 1, max: 2 }, vegplot: { group: "yard", c: 1, max: 2 }, bench: { group: "yard", c: 1, max: 2 },
    lamp: { group: "yard", c: 1, max: 3, gate: "torch" }, sign: { group: "yard", c: 1, max: 1 }, swing: { group: "yard", c: 2, max: 1 },
    well: { group: "town", c: 2, max: 1, gate: "campfire" },
    inn: { group: "town", gate: "hut", job: "keeper", roof: 1 }, bakery: { group: "town", gate: "bake", job: "baker", roof: 1 },
    smithy: { group: "town", gate: "smelt", job: "smith", roof: 1 }, library: { group: "town", gate: "writing", job: "keeper", roof: 1 },
    watchtower: { group: "town", gate: "wall", job: "watch" }, shrine: { group: "town", gate: "totem", job: "keeper" },
    storehouse: { group: "town", gate: "hut", job: "keeper", roof: 1 }, healer: { group: "town", gate: "herbal", job: "healer", roof: 1 }
  };
  var DEFS = {
    lodge: { noun: "shelter", label: "lodge", emoji: "🏡", r: 1.3, cost: { stick: 12, stone: 8, fiber: 4 }, work: 30, desc: "two rooms, a porch and a tall chimney. the biggest home there is: room for everything." },
    fence: { noun: "material", label: "garden fence", emoji: "🪵", r: 0.5, cost: { stick: 3 }, work: 3, desc: "a bit of picket fence. by your home it keeps nibblers off the berry patch: one more handful each morning." },
    path: { noun: "stone", label: "stepping stones", emoji: "🪨", r: 0.45, cost: { stone: 2 }, work: 2, desc: "flat stones to the door. tidy." },
    flowerbed: { noun: "plant", label: "flower bed", emoji: "🌷", r: 0.5, cost: { seed: 2, stick: 1 }, work: 3, desc: "flowers. smols who pass feel a little better." },
    beehive: { noun: "material", label: "beehive", emoji: "🐝", r: 0.45, cost: { stick: 3, fiber: 2 }, work: 5, desc: "a straw hive. honey every other morning." },
    vegplot: { noun: "crop", label: "garden plot", emoji: "🥕", r: 0.7, cost: { stick: 2, seed: 3 }, work: 5, desc: "a little bed of carrots. one to pull every morning, except in winter." },
    bench: { noun: "material", label: "bench", emoji: "🪑", r: 0.5, cost: { stick: 4 }, work: 3, desc: "sit down. smols who rest here are less tired." },
    lamp: { noun: "fire", label: "lamp post", emoji: "🏮", r: 0.3, cost: { stick: 3, stone: 1 }, work: 4, desc: "a light on a post. smols near it at night are less afraid." },
    sign: { noun: "material", label: "signpost", emoji: "🪧", r: 0.3, cost: { stick: 2 }, work: 2, desc: "a carved sign. it carries a name." },
    swing: { noun: "toy", label: "swing", emoji: "🛝", r: 0.7, cost: { stick: 5, vine: 2 }, work: 6, desc: "a swing on two vines. kids nearby are never bored for long." },
    well: { noun: "water", label: "well", emoji: "⛲", r: 0.6, cost: { stone: 6, stick: 2 }, work: 10, desc: "cool water anywhere. drink here; smols near it keep cool." },
    inn: { noun: "shelter", label: "common house", emoji: "🏨", r: 1.4, cost: { stick: 10, stone: 6, fiber: 3 }, work: 30, desc: "a long roof with beds for anyone. eight more smols can live on the island. sleep here yourself." },
    bakery: { noun: "fire", label: "bakery", emoji: "🥖", r: 1.1, cost: { stone: 6, clay: 3, stick: 4 }, work: 22, desc: "a brick oven under a roof. a loaf every morning; with a baker, bread for the tribe too." },
    smithy: { noun: "tool", label: "smithy", emoji: "⚒", r: 1.1, cost: { stone: 6, stick: 4, metal: 1 }, work: 24, desc: "an anvil and a forge. tools made here last half as long again; mend a worn tool for a stone." },
    library: { noun: "totem", label: "archive", emoji: "📚", r: 1.1, cost: { stick: 8, stone: 4, fiber: 2 }, work: 26, desc: "shelves of carved tablets. every morning a smol nearby learns something the tribe knows. read here yourself." },
    watchtower: { noun: "shelter", label: "watchtower", emoji: "🗼", r: 0.7, cost: { stick: 10, stone: 2 }, work: 20, desc: "a tall look-out. a war party is seen sooner, so it takes longer to reach you. climb it and look." },
    shrine: { noun: "totem", label: "shrine", emoji: "⛩", r: 0.6, cost: { stone: 5, stick: 2 }, work: 12, desc: "a quiet stone. smols near it calm down. leave an offering once a day for a spark." },
    storehouse: { noun: "material", label: "storehouse", emoji: "🏚", r: 1.1, cost: { stick: 10, stone: 2 }, work: 18, desc: "eighteen slots, away from home, for you and whoever comes after." },
    healer: { noun: "medicine", label: "healer's hut", emoji: "🌿", r: 1.0, cost: { stick: 6, fiber: 3, herb: 2 }, work: 18, desc: "herbs drying under a roof. hurt smols nearby mend faster. rest here once a day." }
  };
  var FOR_IDEA = { lodge: "house", inn: "house" }; // the tribe's builders lend a hand as they would with these
  (function register() {
    for (var k in DEFS) if (!SK[k]) SK[k] = DEFS[k];
    var I = SB.Ideas;
    if (I && I.forStruct) for (var k2 in DEFS) if (!I.forStruct[k2]) I.forStruct[k2] = FOR_IDEA[k2] || "hut";
    if (SB.Home && SB.Home.KINDS) SB.Home.KINDS.lodge = 1;
  })();

  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) {
    var q = Q(game), s = q.town;
    if (!s || typeof s !== "object") s = q.town = {};
    if (!s.fur) s.fur = {}; if (!Array.isArray(s.keeps)) s.keeps = []; if (!Array.isArray(s.book)) s.book = [];
    if (!s.stores) s.stores = {}; if (!s.party) s.party = {};
    return s;
  }
  T.state = st;
  function H() { return SB.Home || null; }
  function Sv() { return SB.Surv || SB.Survival; }
  function P() { return SB.Possess || null; }
  function me() { var p = P(); return p && p.active && p.c ? p.c : null; }
  function cur() { return SB.Game && SB.Game.current; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function label(k) { return K[k] && K[k].label ? K[k].label : k; }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dice(game, key) { return SB.rng((hashKey("town:" + key) ^ (game.seed >>> 0)) >>> 0); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  function lower(v, n) { return Math.max(0, (v || 0) - n); }
  function home(game) { return H() && game ? H().get(game) : null; }
  function isSmol(c) { return !!c && c.alive && c.species === "smol" && !c.stranger; }
  function say(c, msg) { var p = P(); if (c && c === me() && p.say) p.say(msg); }
  function costText(cost) { var out = []; for (var k in cost) out.push(cost[k] + " " + label(k)); return out.join(", "); }
  T.costText = costText;
  function canPay(c, cost) { for (var k in cost) if (Sv().count(c, k) < cost[k]) return false; return true; }
  function pay(c, cost) { for (var k in cost) Sv().take(c, k, cost[k]); }
  function needHtml(c, cost, icon) {
    var out = [];
    for (var k in cost) { var n = Sv().count(c, k); out.push("<span class='" + (n >= cost[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + Math.min(n, cost[k]) + "/" + cost[k] + "</span>"); }
    return out.join("");
  }
  function structs(game, fn) { var s = game.world.structures, out = []; for (var i = 0; i < s.length; i++) if (fn(s[i])) out.push(s[i]); return out; }
  function nameOf(b) { return b.name || SK[b.kind].label; }
  T.nameOf = nameOf;
  T.worn = function (b) { return !!(b && b.data && (b.data.dmg || 0) >= T.WORN); };
  function works(b) { return !!b && b.done && !T.worn(b); }
  T.works = works;
  // finished, working buildings of a kind
  T.all = function (game, kind) { return structs(game, function (b) { return b.kind === kind && works(b); }); };

  /* ---------------- furniture ---------------- */
  T.has = function (game, id) { return !!home(game) && !!st(game).fur[id]; };
  T.furnitureCount = function (game) { var s = st(game), n = 0; T.FURNITURE.forEach(function (f) { if (s.fur[f.id]) n++; }); return n; };
  T.room = function (game) { var h = home(game); return h ? T.ROOMS[h.kind] || 4 : 0; };
  T.whyNot = function (game, c, id) {
    var f = T.FBY[id], h = home(game);
    if (!f) return "no such thing";
    if (!h) return "you have no home yet";
    if (st(game).fur[id]) return "your home has one";
    if (!H().at(game, c)) return "you have to be at home to make it";
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    if (T.furnitureCount(game) >= T.room(game)) return "no room left in a " + SK[h.kind].label + ": make your home bigger first";
    if (!canPay(c, f.cost)) return "it needs " + costText(f.cost);
    return "";
  };
  T.make = function (game, c, id) {
    var why = T.whyNot(game, c, id), f = T.FBY[id];
    if (why) return { ok: false, msg: why };
    pay(c, f.cost);
    st(game).fur[id] = day(game);
    T.sync(game);
    SB.bus.emit("townFurniture", { thing: f, c: c, n: T.furnitureCount(game), comfort: T.comfort(game).n });
    return { ok: true, msg: f.icon + " " + f.name + "! " + f.perk + " (comfort +" + f.c + ")" };
  };

  /* ---------------- comfort ---------------- */
  // yard things: finished, working, close to home. { kind: n }
  T.yard = function (game) {
    var h = home(game), out = {};
    if (!h) return out;
    structs(game, function (b) { return works(b) && T.META[b.kind] && T.META[b.kind].c && SB.dist(b.x, b.z, h.x, h.z) <= T.YARD; }).forEach(function (b) { out[b.kind] = (out[b.kind] || 0) + 1; });
    return out;
  };
  T.inYard = function (game, b) { var h = home(game); return !!h && !!b && SB.dist(b.x, b.z, h.x, h.z) <= T.YARD; };
  T.trophies = function (game) { return SB.Loot && SB.Loot.trophies ? SB.Loot.trophies(game) : []; };
  T.keeps = function (game) { return st(game).keeps; };
  T.comfort = function (game) {
    var h = home(game), s = st(game), parts = { home: 0, things: 0, furniture: 0, yard: 0, wall: 0, worn: 0 };
    if (!h) return { n: 0, step: 0, name: T.STEPS[0][1], next: T.STEPS[1], parts: parts };
    parts.home = T.KIND_COMFORT[h.kind] || 0;
    parts.things = H().count(game);
    T.FURNITURE.forEach(function (f) { if (s.fur[f.id]) parts.furniture += f.c; });
    var y = T.yard(game);
    for (var k in y) parts.yard += T.META[k].c * Math.min(y[k], T.META[k].max || 1);
    parts.wall = Math.min(8, T.trophies(game).length + s.keeps.length) * (s.fur.rack ? 2 : 1);
    if (T.worn(h)) parts.worn = -3;
    var n = Math.max(0, parts.home + parts.things + parts.furniture + parts.yard + parts.wall + parts.worn), step = 0;
    for (var i = 0; i < T.STEPS.length; i++) if (n >= T.STEPS[i][0]) step = i;
    return { n: n, step: step, name: T.STEPS[step][1], next: T.STEPS[step + 1] || null, parts: parts };
  };
  // the chest and the hearth's ring follow what the home has (home.js reads these two numbers)
  T.sync = function (game) {
    var Hm = H(), h = home(game);
    if (!Hm) return;
    if (!h) { Hm.CHEST = 12; Hm.SAFE = 7; return; }
    var s = st(game);
    Hm.CHEST = (T.CHEST[h.kind] || 12) + (s.fur.shelf ? 6 : 0) + (s.fur.wardrobe ? 6 : 0);
    Hm.SAFE = 7 + (s.fur.lantern ? 3 : 0) + (T.yard(game).lamp ? 2 : 0);
  };
  T.snug = function (c, game) { return c && c.snugT > game.time ? c.snug || 0 : 0; };
  // waking in your own bed: the comfort step sets the morning
  function rested(d) {
    var game = cur(), c = d && d.c;
    if (!game || !c || !home(game)) return;
    var cf = T.comfort(game), s = cf.step;
    if (s < 1) return;
    var ch = c.chem;
    ch.bored = lower(ch.bored, 0.1 * s); ch.lonely = lower(ch.lonely, 0.05 * s); ch.fear = lower(ch.fear, 0.1 * s); ch.anger = lower(ch.anger, 0.1 * s);
    c.snug = s; c.snugT = game.time + SB.DAY_LENGTH * 0.75;
    if (c.body && typeof c.body.cosy === "number") c.body.cosy = Math.max(c.body.cosy, game.time + SB.DAY_LENGTH * (0.6 + 0.08 * s));
    SB.bus.emit("townCosy", { c: c, step: s, name: cf.name, me: !!d.me });
    if (d.me) say(c, "🏡 a " + cf.name + " home (comfort " + cf.n + "): you wake in a good mood, and the day tires you less");
  }

  /* ---------------- home upgrades ---------------- */
  T.upgradeTo = function (game) { var h = home(game); return h ? T.NEXT[h.kind] || null : null; };
  T.upgradeWhy = function (game, c) {
    var h = home(game), nx = T.upgradeTo(game);
    if (!h) return "you have no home yet";
    if (!nx) return "a lodge is as big as a home gets";
    if (!H().at(game, c)) return "you have to be at home";
    if (c.tier < 2) return "it takes hands: a tool-user and up";
    if (!canPay(c, SK[nx].cost)) return "a " + SK[nx].label + " needs " + costText(SK[nx].cost);
    return "";
  };
  T.upgrade = function (game, c) {
    var why = T.upgradeWhy(game, c), h = home(game), nx = T.upgradeTo(game);
    if (why) return { ok: false, msg: why };
    var was = h.kind;
    pay(c, SK[nx].cost);
    h.kind = nx; h.noun = SK[nx].noun; if (h.data) h.data.dmg = 0;
    H().state(game).kind = nx;
    if (SB.World.markNode) SB.World.markNode(game.world, h);
    if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(h.x | 0, h.z | 0);
    T.sync(game);
    SB.bus.emit("homeUpgraded", { st: h, c: c, from: was, to: nx });
    return { ok: true, msg: SK[nx].emoji + " your " + SK[was].label + " is a " + SK[nx].label + " now. everything inside stayed put: room for " + T.ROOMS[nx] + " things, " + H().CHEST + " chest slots" };
  };

  /* ---------------- names ---------------- */
  var HOME_NAMES = ["the burrow", "berry end", "snug corner", "lantern rest", "mossy nook", "pebble house", "the acorn", "sunny side", "driftwood den", "honeypot", "cloud nine", "the teapot"];
  var INN_NAMES = ["the sleepy mole", "the yawning toad", "the full moon", "the warm stone", "the nodding owl", "the last crumb"];
  var WORDS = ["old", "little", "lucky", "crooked", "sunny", "mossy", "jolly", "quiet", "wobbly", "tall"];
  T.namesFor = function (game, b) {
    if (H() && H().is(game, b)) return HOME_NAMES;
    if (b.kind === "inn") return INN_NAMES;
    var founder = b.founder ? [b.founder + "'s " + SK[b.kind].label] : [];
    return founder.concat(WORDS.map(function (w) { return "the " + w + " " + SK[b.kind].label; }));
  };
  // no typing: each tap carves the next name from a list that starts somewhere different for every building
  T.rename = function (game, b) {
    if (!b || !SK[b.kind]) return { ok: false, msg: "nothing to name" };
    var L = T.namesFor(game, b), d = b.data || (b.data = {});
    var start = Math.floor(dice(game, "name" + b.id)() * L.length);
    d.nm = d.nm == null ? 0 : d.nm + 1;
    if (d.nm >= L.length) { d.nm = null; b.name = null; if (H() && H().is(game, b)) st(game).name = null; return { ok: true, msg: "just “" + SK[b.kind].label + "” again" }; }
    b.name = L[(start + d.nm) % L.length];
    if (H() && H().is(game, b)) st(game).name = b.name;
    SB.bus.emit("townNamed", { st: b, name: b.name });
    return { ok: true, msg: "🪧 it's called “" + b.name + "” now" };
  };
  T.homeName = function (game) { var h = home(game); return h ? (st(game).name || "your " + SK[h.kind].label) : ""; };

  /* ---------------- upkeep, mending, taking down ---------------- */
  function mendKind(b) { var c = SK[b.kind].cost || {}; return c.stick || !c.stone ? "stick" : "stone"; }
  T.mendWhy = function (game, c, b) {
    if (!b || !b.done) return "nothing to mend";
    if (!((b.data && b.data.dmg) > 0.05)) return "it's in good shape";
    if (SB.dist(c.x, c.z, b.x, b.z) > T.NEAR + SK[b.kind].r) return "get closer";
    if (c.tier < 2) return "it takes hands";
    if (Sv().count(c, mendKind(b)) < 1) return "mending takes a " + label(mendKind(b));
    return "";
  };
  T.mend = function (game, c, b) {
    var why = T.mendWhy(game, c, b);
    if (why) return { ok: false, msg: why };
    Sv().take(c, mendKind(b), 1);
    b.data.dmg = Math.max(0, Math.round((b.data.dmg - 0.34) * 100) / 100);
    if (b.data.dmg < 0.05) b.data.dmg = 0;
    if (SB.Ideas && SB.Ideas.habit) SB.Ideas.habit(c, "build", 0.5);
    SB.bus.emit("townMended", { st: b, c: c });
    return { ok: true, msg: "🔨 mended" + (b.data.dmg > 0 ? ". it could use a little more" : ": good as new") };
  };
  T.canTakeDown = function (game, b) {
    if (!b || b.kind === "spire" || b.kind === "grave" || b.kind === "lootchest" || (H() && H().is(game, b))) return false;
    return !!T.META[b.kind] || !!(b.data && b.data.pov);
  };
  // half of what it cost comes back
  T.takeDown = function (game, c, b) {
    if (!T.canTakeDown(game, b)) return { ok: false, msg: "that one stays" };
    if (SB.dist(c.x, c.z, b.x, b.z) > T.NEAR + SK[b.kind].r) return { ok: false, msg: "get closer" };
    var cost = SK[b.kind].cost || {}, parts = [];
    for (var k in cost) {
      var n = Math.floor((cost[k] - (b.done ? 0 : (b.need && b.need[k]) || 0)) / 2);
      if (n <= 0) continue;
      var left = Sv().add(c, k, n);
      if (left > 0 && Sv().spawn) Sv().spawn(game, k, left, b.x, b.z);
      parts.push(n + " " + label(k));
    }
    var s = st(game), ch = s.stores[b.id];
    if (ch) { ch.forEach(function (sl) { if (sl && Sv().spawn) Sv().spawn(game, sl.k, sl.n, b.x, b.z, { w: sl.w }); }); delete s.stores[b.id]; }
    T.unpost(game, b);
    SB.World.removeStructure(game.world, b);
    if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(b.x | 0, b.z | 0);
    SB.bus.emit("townTakenDown", { st: b, c: c });
    T.sync(game);
    return { ok: true, msg: "🪓 the " + SK[b.kind].label + " is down" + (parts.length ? ". you got back " + parts.join(", ") : "") };
  };
  // pay shells and the tribe brings what the site still needs
  T.commissionPrice = function (b) { var n = 0; if (b && !b.done) for (var k in b.need) n += Math.max(0, b.need[k]); return Math.round(n * 0.5 * 10) / 10; };
  T.commission = function (game, c, b) {
    var price = T.commissionPrice(b);
    if (!b || b.done || price <= 0) return { ok: false, msg: "it has everything it needs" };
    if ((c.purse || 0) < price) return { ok: false, msg: "the tribe wants " + price + " " + money(game) + " for that. you have " + (Math.round((c.purse || 0) * 100) / 100) };
    c.purse = Math.round((c.purse - price) * 100) / 100;
    for (var k in b.need) b.need[k] = 0;
    b.data.paid = price;
    var helpers = game.creatures.filter(function (o) { return isSmol(o) && o !== c && o.tier >= 2 && (o.stage == null || o.stage >= 3) && SB.dist(o.x, o.z, b.x, b.z) < 40; }).sort(function (a, z) { return SB.dist(a.x, a.z, b.x, b.z) - SB.dist(z.x, z.z, b.x, b.z); }).slice(0, 2);
    helpers.forEach(function (o) { o.purse = Math.round(((o.purse || 0) + price / helpers.length) * 100) / 100; if (!game.offline && SB.Creature.sendTo) SB.Creature.sendTo(o, b.x + 1, b.z + 1, game, 30); });
    SB.bus.emit("townCommission", { st: b, c: c, price: price, helpers: helpers.length });
    return { ok: true, msg: "🤝 paid " + price + " " + money(game) + ": the tribe brought everything. now it only needs building" };
  };
  function money(game) { return SB.Loot && SB.Loot.moneyIcon ? SB.Loot.moneyIcon(game) : "🐚"; }

  /* ---------------- keepers ---------------- */
  T.keeper = function (game, b) { var id = b && b.data ? b.data.keeper : null, c = id != null ? SB.Game.byId(game, id) : null; return c && c.alive && c.postId === b.id ? c : null; };
  T.postOf = function (game, c) { return c && c.postId != null ? SB.World.structById(game.world, c.postId) : null; };
  T.unpost = function (game, b) { var k = T.keeper(game, b); if (k) { k.postId = null; k.postJob = null; } if (b && b.data) b.data.keeper = null; };
  T.candidates = function (game, c, b) {
    return game.creatures.filter(function (o) { return isSmol(o) && o !== c && o.tribe === c.tribe && (o.stage == null || o.stage >= 3) && o.tier >= 2 && SB.dist(o.x, o.z, b.x, b.z) < 30 && o.postId !== b.id; })
      .sort(function (a, z) { return SB.dist(a.x, a.z, b.x, b.z) - SB.dist(z.x, z.z, b.x, b.z); }).slice(0, 4);
  };
  T.assign = function (game, b, who) {
    var m = b ? T.META[b.kind] : null;
    if (!m || !m.job || !b.done) return { ok: false, msg: "nobody can keep that" };
    if (!isSmol(who) || who.tier < 2 || (who.stage != null && who.stage < 3)) return { ok: false, msg: "it takes a grown-up with hands" };
    var old = T.postOf(game, who);
    if (old && old !== b) T.unpost(game, old);
    T.unpost(game, b);
    b.data.keeper = who.id; who.postId = b.id; who.postJob = m.job;
    if (SB.Social && SB.Social.log) SB.Social.log(game, who, SK[b.kind].emoji, "became the " + m.job + " at the " + nameOf(b));
    if (!game.offline && SB.Creature.sendTo) SB.Creature.sendTo(who, b.x + SK[b.kind].r + 0.6, b.z, game, 30);
    if (SB.Creature.emote) SB.Creature.emote(who, "happy", 2);
    SB.bus.emit("townKeeper", { st: b, c: who, job: m.job });
    return { ok: true, msg: SK[b.kind].emoji + " " + who.name + " is the " + m.job + " at the " + nameOf(b) + " now" };
  };

  /* ---------------- what the town buildings do by hand ---------------- */
  function once(b, key, game) { var d = b.data || (b.data = {}); if (d[key] === day(game)) return false; d[key] = day(game); return true; }
  function near(c, b, extra) { return SB.dist(c.x, c.z, b.x, b.z) <= SK[b.kind].r + (extra || 3.2); }
  function drinkNow(c) {
    if (SB.Body && SB.Body.drink) SB.Body.drink(c);
    c.chem.hot = lower(c.chem.hot, 0.3);
  }
  T.drink = function (game, c, b) {
    if (b && !works(b)) return { ok: false, msg: "the " + SK[b.kind].label + " is worn out: mend it first" };
    if (b && !near(c, b)) return { ok: false, msg: "get closer" };
    if (!b && !(T.has(game, "barrel") && H().at(game, c))) return { ok: false, msg: "the rain barrel is at home" };
    drinkNow(c);
    return { ok: true, msg: "💧 cool water. ahh" };
  };
  // anything a building has ready to take: bread, honey, a carrot, a tool
  T.take = function (game, c, b) {
    var d = b && b.data;
    if (!d || !d.stock || !d.stockKind) return { ok: false, msg: "nothing ready yet" };
    if (!near(c, b)) return { ok: false, msg: "get closer" };
    var left = Sv().add(c, d.stockKind, d.stock), got = d.stock - left;
    if (!got) return { ok: false, msg: Sv().whyNot(c, d.stockKind) || "your bag is full" };
    d.stock = left;
    SB.bus.emit("townTook", { st: b, c: c, kind: d.stockKind, n: got });
    return { ok: true, msg: SK[b.kind].emoji + " " + got + " " + label(d.stockKind) };
  };
  function addStock(b, kind, n, max) { var d = b.data || (b.data = {}); if (d.stockKind !== kind) { d.stockKind = kind; d.stock = 0; } d.stock = Math.min(max, (d.stock || 0) + n); }
  // a tool in your hand, as good as new, for a stone
  T.fixTool = function (game, c, b) {
    if (!works(b) || b.kind !== "smithy") return { ok: false, msg: "that takes a working smithy" };
    var v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl || !K[sl.k] || !K[sl.k].tool || sl.w == null) return { ok: false, msg: "hold the tool you want mended" };
    var full = Sv().uses(sl.k);
    if (sl.w >= full) return { ok: false, msg: "your " + label(sl.k) + " is as good as new" };
    if (Sv().count(c, "stone") < 1) return { ok: false, msg: "mending a tool takes a stone" };
    Sv().take(c, "stone", 1);
    sl.w = full;
    SB.bus.emit("townToolFixed", { c: c, kind: sl.k });
    return { ok: true, msg: "⚒ your " + label(sl.k) + " is as good as new" };
  };
  // one idea the tribe has that this smol could hold and does not know yet
  function ideaFor(game, c) {
    var I = SB.Ideas; if (!I || !I.LIST) return null;
    for (var i = 0; i < I.LIST.length; i++) { var d = I.LIST[i]; if (!I.known(c, d.id) && I.canHold(c, d.id) && SB.Game.cultureKnows(game, d.id)) return d; }
    return null;
  }
  T.read = function (game, c, b) {
    if (!works(b) || b.kind !== "library") return { ok: false, msg: "that takes a working archive" };
    if (!near(c, b)) return { ok: false, msg: "get closer" };
    var d = ideaFor(game, c);
    if (!d) return { ok: false, msg: "📚 nothing here you don't already know" };
    if (!once(b, "read", game)) return { ok: false, msg: "📚 your head is full for today. come back tomorrow" };
    if (!c.ideas) c.ideas = {};
    try { SB.Ideas.learn(c, d.id, 5, game, "read at the archive"); } catch (e) {}
    if (!(c.ideas[d.id] >= 1)) c.ideas[d.id] = 1;
    SB.bus.emit("townRead", { c: c, idea: d.id });
    return { ok: true, msg: "📚 you read the tablets and learned " + d.name + " " + (d.icon || "") };
  };
  T.offer = function (game, c, b) {
    if (!works(b) || b.kind !== "shrine") return { ok: false, msg: "that takes a shrine" };
    if (!near(c, b)) return { ok: false, msg: "get closer" };
    var v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl || sl.k === "plans") return { ok: false, msg: "hold something to leave as an offering" };
    if (!once(b, "offer", game)) return { ok: false, msg: "⛩ one offering a day is plenty" };
    var kind = sl.k, n = T.keeper(game, b) ? 2 : 1;
    sl.n--; if (sl.n <= 0) v.s[v.sel] = null;
    if (SB.Game.addSparks) SB.Game.addSparks(game, n, c);
    c.chem.fear = lower(c.chem.fear, 0.3); c.chem.anger = lower(c.chem.anger, 0.3);
    SB.bus.emit("townOffering", { c: c, kind: kind, sparks: n });
    return { ok: true, msg: "⛩ you left your " + label(kind) + " at the shrine: +" + n + " ✨" };
  };
  T.rest = function (game, c, b) {
    if (!works(b) || b.kind !== "healer") return { ok: false, msg: "that takes a healer's hut" };
    if (!near(c, b)) return { ok: false, msg: "get closer" };
    if (!once(b, "rest", game)) return { ok: false, msg: "🌿 the herbs need a day to dry. come back tomorrow" };
    c.chem.health = Math.min(1, c.chem.health + (T.keeper(game, b) ? 0.6 : 0.35));
    c.chem.sick = lower(c.chem.sick, 0.5);
    if (SB.Body && SB.Body.heal) { try { SB.Body.heal(c); } catch (e) {} }
    SB.bus.emit("townHealed", { c: c, st: b });
    return { ok: true, msg: "🌿 a poultice and a sit-down. that's better" };
  };
  // what you can see from up there
  T.lookOut = function (game, c, b) {
    var gr = game.creatures.filter(function (o) { return o.alive && o.species === "grump" && SB.dist(o.x, o.z, b.x, b.z) < 60; });
    if (!gr.length) return { ok: true, msg: "🗼 all quiet. no grumps as far as you can see" };
    var g = gr.sort(function (a, z) { return SB.dist(a.x, a.z, b.x, b.z) - SB.dist(z.x, z.z, b.x, b.z); })[0], dx = g.x - b.x, dz = g.z - b.z;
    var dir = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? "east" : "west") : (dz > 0 ? "south" : "north");
    return { ok: true, msg: "🗼 " + gr.length + (gr.length === 1 ? " grump" : " grumps") + ", the nearest " + Math.round(SB.dist(g.x, g.z, b.x, b.z)) + " steps to the " + dir };
  };
  function sleepAt(game, c, b) {
    var ch = c.chem;
    if (ch.sleepy < 0.12 && ch.tired < 0.2 && !game.world.night) return { ok: false, msg: "not sleepy yet. come back tonight" };
    var ok = SB.Creature.startAction && SB.V ? SB.Creature.startAction(c, game, SB.V.sleep, { type: "struct", id: b.id }) : false;
    return { ok: !!ok, msg: ok ? "zzz… (move to wake up)" : "" };
  }
  T.sleepAt = sleepAt;
  T.sit = function (game, c, b, how) {
    if (SB.Creature.startAction && SB.V) { SB.Creature.startAction(c, game, SB.V.idle, null); if (c.action) c.action.dur = 6; }
    if (how === "swing") c.chem.bored = lower(c.chem.bored, 0.4); else if (how === "flowers") c.chem.bored = lower(c.chem.bored, 0.15); else c.chem.tired = lower(c.chem.tired, 0.15);
    if (SB.Creature.emote) SB.Creature.emote(c, "happy", 1.5);
    return { ok: true, msg: how === "swing" ? "🛝 wheee!" : how === "flowers" ? "🌷 mmm. they smell of summer" : "🪑 a sit-down. your legs thank you" };
  };
  // one stone, one paved tile under your paws
  T.pave = function (game, c) {
    var w = game.world, N = w.T && w.T.N, i = Math.floor(c.x), j = Math.floor(c.z);
    if (!w.road || !N || !game.civ) return { ok: false, msg: "paths come with a village: nobody walks here enough yet" };
    if (c.tier < 2) return { ok: false, msg: "it takes hands" };
    var t = j * N + i;
    if (!(t >= 0 && t < w.road.length)) return { ok: false, msg: "not here" };
    if (w.road[t] === 2) return { ok: false, msg: "this bit is paved already. step along" };
    if (SB.World.depthAt && SB.World.depthAt(w, i + 0.5, j + 0.5) > 0.2) return { ok: false, msg: "not in the water" };
    if (Sv().count(c, "stone") < 1) return { ok: false, msg: "a paving stone takes a stone" };
    Sv().take(c, "stone", 1);
    w.road[t] = 2;
    game.civ.roadN = (game.civ.roadN || 0) + 1;
    if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(i, j);
    SB.bus.emit("townPaved", { c: c, x: i, z: j });
    return { ok: true, msg: "🪨 a paving stone. walking on it is faster" };
  };

  /* ---------------- storehouses ---------------- */
  T.store = function (game, b) { var s = st(game), ch = s.stores[b.id] || (s.stores[b.id] = []); while (ch.length < T.STORE) ch.push(null); return ch; };
  function storeWhy(game, c, b) { return !b || b.kind !== "storehouse" || !b.done ? "no storehouse here" : T.worn(b) ? "the storehouse is worn out: mend it first" : !near(c, b, T.NEAR) ? "the storehouse is over there" : ""; }
  T.storeStash = function (game, c, b, i) {
    var why = storeWhy(game, c, b); if (why) return { ok: false, msg: why };
    var v = Sv().inv(c), sl = v.s[i], ch = T.store(game, b), n, mx, j, t;
    if (!sl || sl.k === "plans") return { ok: false, msg: "nothing to put away" };
    n = sl.n; mx = Math.max(1, Sv().stackOf(sl.k));
    if (mx > 1) for (j = 0; j < ch.length && n > 0; j++) if (ch[j] && ch[j].k === sl.k && ch[j].n < mx) { t = Math.min(n, mx - ch[j].n); ch[j].n += t; n -= t; }
    for (j = 0; j < ch.length && n > 0; j++) if (!ch[j]) { t = Math.min(n, mx); ch[j] = { k: sl.k, n: t }; if (sl.w != null) ch[j].w = sl.w; n -= t; }
    if (n === sl.n) return { ok: false, msg: "the storehouse is full" };
    if (n > 0) sl.n = n; else v.s[i] = null;
    return { ok: true, msg: "" };
  };
  T.storeFetch = function (game, c, b, i) {
    var why = storeWhy(game, c, b); if (why) return { ok: false, msg: why };
    var ch = T.store(game, b), sl = ch[i];
    if (!sl) return { ok: false, msg: "" };
    var left = Sv().add(c, sl.k, sl.n, sl.w);
    if (left === sl.n) return { ok: false, msg: Sv().whyNot(c, sl.k) || "your bag is full" };
    if (left > 0) sl.n = left; else ch[i] = null;
    return { ok: true, msg: "" };
  };

  /* ---------------- the wall: keepsakes and the biggest fish ---------------- */
  T.keep = function (game, id, icon, name) {
    var s = st(game), i;
    for (i = 0; i < s.keeps.length; i++) if (s.keeps[i].id === id) { s.keeps[i].icon = icon; s.keeps[i].name = name; s.keeps[i].day = day(game); return false; }
    if (s.keeps.length >= 12) return false;
    s.keeps.push({ id: id, icon: icon, name: name, day: day(game) });
    SB.bus.emit("townKeepsake", { id: id, icon: icon, name: name });
    return true;
  };
  function caught(d) {
    var game = cur(), c = d && d.c;
    if (!game || !c || c !== me()) return;
    var s = st(game);
    s.fishN = (s.fishN || 0) + 1;
    var r = dice(game, "fish" + s.fishN)(), len = Math.round((1 + r * r * 8) * 10) / 10;
    if (s.fish && s.fish.len >= len) return;
    s.fish = { len: len, day: day(game), by: c.name };
    T.keep(game, "fish", "🐟", "a fish " + len + " paws long, caught by " + c.name);
    say(c, "🐟 " + len + " paws long! the biggest yet" + (home(game) ? ": it goes on the wall at home" : ""));
  }
  // trophies on the wall make whoever slept under them a bit bolder with grumps
  T.pride = function (game, c) { return T.snug(c, game) > 0 ? 1 + 0.04 * Math.min(5, T.trophies(game).length) : 1; };

  /* ---------------- dye ---------------- */
  function ownHue(c) { try { return SB.Genome.look(c.genome).hue; } catch (e) { return c.look ? c.look.hue : 0; } }
  T.dye = function (game, c, id) {
    var d = null; T.DYES.forEach(function (x) { if (x.id === id) d = x; });
    if (!T.has(game, "mirror") || !H().at(game, c)) return { ok: false, msg: "dyeing takes the mirror at home" };
    if (!c.look) return { ok: false, msg: "" };
    if (id === "wash") { if (c.dye == null) return { ok: false, msg: "nothing to wash out" }; c.dye = null; c.look.hue = ownHue(c); SB.bus.emit("townDyed", { c: c, hue: null }); return { ok: true, msg: "🫧 washed out. " + c.name + "'s own colour again" }; }
    if (!d) return { ok: false, msg: "no such colour" };
    if (!canPay(c, d.cost)) return { ok: false, msg: d.name + " takes " + costText(d.cost) };
    pay(c, d.cost);
    c.dye = d.hue; c.look.hue = d.hue;
    SB.bus.emit("townDyed", { c: c, hue: d.hue });
    return { ok: true, msg: d.icon + " " + c.name + " is " + d.name + " now" };
  };
  T.music = function (game, c) {
    if (!T.has(game, "musicbox") || !H().at(game, c)) return { ok: false, msg: "the music box is at home" };
    c.chem.bored = lower(c.chem.bored, 0.5);
    if (SB.Audio && SB.Audio.play) SB.Audio.play("chime");
    if (SB.Creature.emote) SB.Creature.emote(c, "happy", 2);
    return { ok: true, msg: "🎵 plink, plink, plonk. a good tune" };
  };

  /* ---------------- visitors, the guest book, a housewarming ---------------- */
  var LINES = ["lovely place!", "it smells of berries in here", "i sat on everything", "can i move in?", "so many things!", "your roof doesn't even leak", "came for a nap. stayed for two", "nice door"];
  var GIFTS = ["berry", "apple", "herb", "honey", "seed", "nut"];
  function give(game, kind, n) {
    var h = home(game); if (!h || !K[kind]) return;
    var left = H().has(game, "chest") ? H().put(game, kind, n) : n;
    if (left > 0 && Sv().spawn) Sv().spawn(game, kind, left, h.x + 1.2, h.z + 0.6);
  }
  function sign(game, who, r, gift) {
    var s = st(game), e = { n: who.name, d: day(game), l: Math.floor(r() * LINES.length) };
    if (gift) e.g = gift;
    s.book.push(e); if (s.book.length > 12) s.book.shift();
    who.chem.lonely = lower(who.chem.lonely, 0.2); who.chem.bored = lower(who.chem.bored, 0.2);
    if (SB.Social && SB.Social.log) SB.Social.log(game, who, "🚪", "visited " + T.homeName(game));
    return e;
  }
  function guests(game) {
    var p = me(), mine = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null, h = home(game);
    return game.creatures.filter(function (o) { return isSmol(o) && o !== p && o !== mine && (o.stage == null || o.stage >= 2) && SB.dist(o.x, o.z, h.x, h.z) < 60; });
  }
  T.visit = function (game, force) {
    var h = home(game); if (!h) return null;
    var cf = T.comfort(game), s = st(game), r = dice(game, "visit" + day(game));
    var chance = Math.min(0.9, 0.15 * cf.step * (s.fur.board ? 2 : 1));
    if (cf.step < 2 && !force) return null;
    if (!force && r() >= chance) return null;
    var pool = guests(game); if (!pool.length) return null;
    var who = pool[Math.floor(r() * pool.length)], gift = s.fur.basket ? GIFTS[Math.floor(r() * GIFTS.length)] : null;
    if (gift && !K[gift]) gift = null;
    var e = sign(game, who, r, gift);
    if (gift) give(game, gift, 1);
    if (!game.offline && SB.Creature.sendTo) SB.Creature.sendTo(who, h.x + 1.4, h.z + 1, game, 40);
    if (s.book.length === 1) T.keep(game, "guest", "📖", "the first name in your guest book: " + who.name);
    SB.bus.emit("townGuest", { c: who, gift: gift, entry: e });
    var p = me();
    if (p && H().at(game, p)) say(p, "🚪 " + who.name + " dropped by and signed the guest book" + (gift ? ". they left a " + label(gift) : ""));
    return e;
  };
  function foodSlots(c) { var v = Sv().inv(c), out = []; for (var i = 0; i < v.s.length; i++) if (v.s[i] && Sv().edible && Sv().edible(v.s[i].k)) for (var q = 0; q < v.s[i].n; q++) out.push(i); return out; }
  T.partyWhy = function (game, c) {
    var h = home(game);
    if (!h) return "you have no home yet";
    if (st(game).party[h.kind]) return "this " + SK[h.kind].label + " has had its housewarming. a bigger home gets another";
    if (!H().at(game, c)) return "you have to be at home";
    if (T.comfort(game).step < 2) return "make it tidy first (comfort " + T.STEPS[2][0] + ")";
    if (foodSlots(c).length < 3) return "a party needs 3 things to eat from your bag";
    return "";
  };
  T.party = function (game, c) {
    var why = T.partyWhy(game, c), h = home(game);
    if (why) return { ok: false, msg: why };
    var v = Sv().inv(c), fs = foodSlots(c).slice(0, 3);
    fs.forEach(function (i) { v.s[i].n--; });
    for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].n <= 0) v.s[i] = null;
    var r = dice(game, "party" + h.kind + day(game));
    var came = guests(game).sort(function (a, z) { return SB.dist(a.x, a.z, h.x, h.z) - SB.dist(z.x, z.z, h.x, h.z); }).slice(0, 6);
    came.forEach(function (o, n) {
      sign(game, o, r, null);
      o.chem.bored = lower(o.chem.bored, 0.5); o.chem.lonely = lower(o.chem.lonely, 0.5);
      if (SB.Creature.emote) SB.Creature.emote(o, "happy", 3);
      if (!game.offline && SB.Creature.sendTo) SB.Creature.sendTo(o, h.x + Math.sin(n * 1.05) * 2.2, h.z + Math.cos(n * 1.05) * 2.2, game, 40);
    });
    c.chem.bored = lower(c.chem.bored, 0.5); c.chem.lonely = lower(c.chem.lonely, 0.6);
    st(game).party[h.kind] = day(game);
    T.keep(game, "party:" + h.kind, "🎀", "a garland from the housewarming of your " + SK[h.kind].label);
    if (SB.Game.addSparks) SB.Game.addSparks(game, 2, c);
    SB.bus.emit("townParty", { c: c, st: h, came: came.length });
    return { ok: true, msg: "🎉 a housewarming! " + (came.length ? came.length + (came.length === 1 ? " smol came" : " smols came") + " and signed the guest book" : "nobody was near, but the snacks were good") + ". +2 ✨" };
  };

  /* ---------------- every morning ---------------- */
  function produce(game) {
    var h = home(game), s = st(game), dn = day(game), winter = game.world.season === 3;
    if (h) {
      if (s.fur.pot && K.cooked) give(game, "cooked", 1);
      if (s.fur.windowbox && dn % 2 === 0 && K.herb) give(game, "herb", 1);
      if (H().has(game, "garden") && T.yard(game).fence && K.berry) give(game, "berry", 1);
    }
    game.world.structures.forEach(function (b) {
      if (!works(b) || !T.META[b.kind]) return;
      var k = T.keeper(game, b), yard = h && SB.dist(b.x, b.z, h.x, h.z) <= T.YARD && H().has(game, "chest");
      if (b.kind === "beehive" && dn % 2 === 0 && K.honey) { if (yard) give(game, "honey", 1); else addStock(b, "honey", 1, 3); }
      else if (b.kind === "vegplot" && !winter && K.carrot) { if (yard) give(game, "carrot", 1); else addStock(b, "carrot", 1, 3); }
      else if (b.kind === "bakery" && K.bread) {
        addStock(b, "bread", 1, 6);
        if (k && Sv().spawn) Sv().spawn(game, "bread", 2, b.x + SK.bakery.r + 0.5, b.z + 0.3);
      } else if (b.kind === "smithy" && k && dn % 2 === 0 && K.stoneaxe) {
        if (!(b.data.stock > 0)) addStock(b, "stoneaxe", 1, 1);
        if (SB.Civ && SB.Civ.xp) SB.Civ.xp(k, "smith", 0.5);
      } else if (b.kind === "library" && SB.Ideas) {
        var best = null, bn = 1e9;
        game.creatures.forEach(function (o) { if (!isSmol(o) || SB.dist(o.x, o.z, b.x, b.z) > 14 || !ideaFor(game, o)) return; var n = 0; for (var id in o.ideas || {}) if (o.ideas[id] >= 1) n++; if (n < bn) { bn = n; best = o; } });
        if (best) { var d = ideaFor(game, best); try { SB.Ideas.learn(best, d.id, k ? 1 : 0.5, game, "read at the archive"); } catch (e) {} b.data.taught = (b.data.taught || 0) + 1; SB.bus.emit("townTaught", { c: best, idea: d.id, st: b }); }
      }
    });
  }
  function wear(game) {
    var h = home(game), worn = [];
    game.world.structures.forEach(function (b) {
      if (!b.done || !(T.META[b.kind] || b === h)) return;
      var d = b.data || (b.data = {}), was = (d.dmg || 0) >= T.WORN;
      if (T.keeper(game, b)) { d.dmg = Math.max(0, (d.dmg || 0) - 0.1); return; }
      if ((d.dmg || 0) < T.WORN + 0.06) d.dmg = Math.round(((d.dmg || 0) + (b === h ? T.WEAR * 0.75 : T.WEAR)) * 100) / 100;
      if (!was && d.dmg >= T.WORN) worn.push(b);
    });
    if (worn.length) {
      var txt = "🔨 " + (worn.length === 1 ? "the " + nameOf(worn[0]) + " is worn out" : worn.length + " of your buildings are worn out") + ": mend with a stick, or give it a keeper";
      if (SB.Game.note) SB.Game.note(game, txt);
      SB.bus.emit("townWorn", { list: worn });
    }
  }
  function posts(game) {
    if (game.offline || !SB.Creature.sendTo) return;
    game.world.structures.forEach(function (b) { var k = b.done && T.META[b.kind] ? T.keeper(game, b) : null; if (k && k !== me() && !k.asleep) SB.Creature.sendTo(k, b.x + SK[b.kind].r + 0.6, b.z, game, 30); });
  }
  function dawn() {
    var game = cur(); if (!game || !game.quests) return;
    if (!game.quests.town && !home(game) && !structs(game, function (b) { return !!T.META[b.kind]; }).length) return;
    var s = st(game), dn = day(game);
    if (s.lastDawn === dn) return;
    s.lastDawn = dn;
    T.sync(game);
    produce(game); wear(game); posts(game);
    if (home(game)) T.visit(game);
  }

  /* ---------------- the slow tick: what buildings do to smols nearby ---------------- */
  var AURA = { well: 6, shrine: 6, healer: 6, swing: 5, flowerbed: 4, bench: 3, lamp: 6 };
  function scan(game, step) {
    var list = structs(game, function (b) { return !!AURA[b.kind] && works(b); }), night = !!game.world.night, cs = game.creatures;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c.alive || c.species !== "smol") continue;
      if (c.dye != null && c.look && c.look.hue !== c.dye) c.look.hue = c.dye;
      var ch = c.chem;
      for (var j = 0; j < list.length; j++) {
        var b = list[j];
        if (Math.abs(c.x - b.x) > 6 || Math.abs(c.z - b.z) > 6 || SB.dist(c.x, c.z, b.x, b.z) > AURA[b.kind]) continue;
        if (b.kind === "well") ch.hot = lower(ch.hot, 0.012 * step);
        else if (b.kind === "shrine") { ch.fear = lower(ch.fear, 0.012 * step); ch.anger = lower(ch.anger, 0.012 * step); }
        else if (b.kind === "healer") { var k = T.keeper(game, b) ? 2 : 1; if (ch.health < 1) ch.health = Math.min(1, ch.health + 0.003 * k * step); ch.sick = lower(ch.sick, 0.008 * k * step); }
        else if (b.kind === "swing") ch.bored = lower(ch.bored, (c.stage != null && c.stage < 3 ? 0.02 : 0.005) * step);
        else if (b.kind === "flowerbed") ch.bored = lower(ch.bored, 0.005 * step);
        else if (b.kind === "bench") ch.tired = lower(ch.tired, 0.005 * step);
        else if (b.kind === "lamp" && night) ch.fear = lower(ch.fear, 0.012 * step);
      }
    }
  }
  var tT = 0, sT = 0;
  T.tick = function (game, dt) {
    if (!game || game.offline) return;
    if ((tT -= dt) > 0) return;
    var step = 1 - tT; tT = 1;
    var c = me(), s = c ? T.snug(c, game) : 0;
    if (s > 0) { c.chem.tired = lower(c.chem.tired, 0.0012 * s * step); c.chem.bored = lower(c.chem.bored, 0.0012 * s * step); }
    if ((sT -= step) > 0) return;
    sT = 4;
    T.sync(game);
    scan(game, 4);
  };
  T.scan = scan; // for tests

  /* ---------------- plans: what you can build ---------------- */
  function ideaName(id) { var I = SB.Ideas, d = I && I.BY_ID ? I.BY_ID[id] : null; return d ? d.name : id; }
  T.planWhy = function (game, c, kind) {
    var m = T.META[kind];
    if (!m) return "no such plan";
    if (c.tier < 2) return "building takes hands: a tool-user and up";
    if (m.group === "yard" && !home(game)) return "the yard comes with a home";
    if (m.gate && SB.Ideas && SB.Ideas.BY_ID && SB.Ideas.BY_ID[m.gate] && !SB.Game.cultureKnows(game, m.gate)) return "the tribe has to learn " + ideaName(m.gate) + " first";
    return "";
  };
  T.plans = function (game, c, group) {
    var out = [];
    for (var k in T.META) if (!group || T.META[k].group === group) out.push({ kind: k, def: SK[k], why: T.planWhy(game, c, k), cost: SK[k].cost });
    return out;
  };
  var listing = false;
  T.startBuild = function (game, c, kind) {
    var p = P(), why = T.planWhy(game, c, kind);
    if (why) return { ok: false, msg: why };
    if (!p || !p.startBuild || p.c !== c) return { ok: false, msg: "step into a smol to build" };
    listing = true;
    var ok; try { ok = p.startBuild(kind); } finally { listing = false; }
    return { ok: !!ok, msg: "" };
  };
  // possess.js asks "what can this smol build" from the ideas; while one of ours is being planned, ours are on the list too
  function wrapPossess() {
    var p = P();
    if (!p || !p.buildable || p._townWrapped) return;
    p._townWrapped = true;
    var b0 = p.buildable;
    p.buildable = function () {
      var out = b0.apply(p, arguments);
      if (!listing) return out;
      var c = p.c, game = cur(); if (!c || !game) return out;
      for (var k in T.META) out.push({ id: k, kind: k, d: null, known: true, tribe: false, fresh: false, can: !T.planWhy(game, c, k), cost: SK[k].cost });
      return out;
    };
  }

  /* ---------------- hooks ---------------- */
  var hooked = false;
  T.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    wrapPossess();
    SB.bus.on("dawn", dawn);
    SB.bus.on("homeRested", rested);
    SB.bus.on("homeClaimed", function () { var game = cur(); if (game) { var h = home(game); if (h && st(game).name) h.name = st(game).name; T.sync(game); } });
    SB.bus.on("fish", caught);
    SB.bus.on("povEat", function (d) { var game = cur(); if (game && d && d.c && T.has(game, "table") && H().at(game, d.c)) d.c.chem.hunger = lower(d.c.chem.hunger, 0.08); });
    // a tool made at your own bench, or by a smithy, is a better tool
    SB.bus.on("craft", function (d) {
      var game = cur(), c = d && d.c, kind = d && d.item && d.item.kind;
      if (!game || !c || !d.pov || !kind || !K[kind] || !K[kind].tool) return;
      var k = structs(game, function (b) { return b.kind === "smithy" && works(b) && SB.dist(b.x, b.z, c.x, c.z) < 7; }).length ? 1.5 : T.has(game, "bench") && H().at(game, c) ? 1.25 : 1;
      if (k === 1) return;
      var v = Sv().inv(c), full = Sv().uses(kind);
      for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k === kind && v.s[i].w === full) { v.s[i].w = Math.round(full * k); SB.bus.emit("townBetterTool", { c: c, kind: kind, k: k }); break; }
    });
    // a watchtower sees a war party sooner: it takes longer to arrive
    SB.bus.on("incidentChoice", function (d) {
      var game = cur(), inc = d && d.inc;
      if (!game || !inc || inc.id !== "raid" || inc.phase !== "warn" || inc.towered) return;
      var tw = T.all(game, "watchtower"); if (!tw.length) return;
      var extra = 25 + (tw.some(function (b) { return !!T.keeper(game, b); }) ? 15 : 0);
      inc.t1 += extra; inc.towered = extra;
      if (SB.Game.note) SB.Game.note(game, "🗼 the watchtower saw them coming: " + extra + " more seconds to get ready");
      SB.bus.emit("townWatch", { inc: inc, extra: extra });
    });
    SB.bus.on("incidentEnd", function (d) { var game = cur(); if (game && d && d.inc && d.inc.id === "feast" && d.inc.choice === "yes" && home(game)) T.keep(game, "feast", "🎉", "a garland from the harvest feast"); });
    SB.bus.on("marketDay", function () { var game = cur(); if (game && me() && home(game)) T.keep(game, "market", "🎏", "a ribbon from market day"); });
    SB.bus.on("era", function (d) { var game = cur(); if (game && d && d.up && home(game)) T.keep(game, "era" + d.era, "📜", "the " + (d.name || "village") + " charter"); });
    SB.bus.on("strangerJoined", function (d) { var game = cur(); if (game && d && d.c && home(game)) T.keep(game, "stranger", "🪵", "a thank-you carving from " + d.c.name); });
    SB.bus.on("mineHeir", function (d) { var game = cur(); if (game && d && d.was && home(game)) T.keep(game, "heir", "🦯", d.was + "'s old walking stick"); });
    SB.bus.on("wrecked", function (d) { var game = cur(); if (game && d && d.st && T.META[d.st.kind] && d.st.data) d.st.data.stock = 0; });
    // more roofs: a lodge and a common house are beds for the tribe, and the big buildings keep the rain off
    var Cv = SB.Civ, W = SB.World;
    if (Cv && Cv.room && !Cv._townWrapped) {
      Cv._townWrapped = true;
      var room0 = Cv.room;
      Cv.room = function (game) {
        var r = room0(game);
        if (r === Infinity || !game || !game.world) return r;
        return r + 10 * T.all(game, "lodge").length + T.all(game, "inn").reduce(function (n, b) { return n + (T.keeper(game, b) ? 12 : 8); }, 0);
      };
    }
    if (W && W.shelterAt && !W._townWrapped) {
      W._townWrapped = true;
      var sh0 = W.shelterAt;
      W.shelterAt = function (world, x, z) {
        var got = sh0(world, x, z); if (got) return got;
        var s = world.structures;
        for (var i = 0; i < s.length; i++) { var b = s[i], m = T.META[b.kind]; if (m && m.roof && b.done && SB.dist(x, z, b.x, b.z) < (SK[b.kind].r + 0.3) * (b.s || 1)) return b; }
        return null;
      };
    }
    var X = SB.Ext;
    if (!X) return;
    X.on("tick", T.tick);
    X.on("options", options);
    X.on("damage", function (game, c) { return T.pride(game, c); });
    X.on("vitals", function (game, c) { var s = T.snug(c, game); return s > 0 ? [{ icon: "🏡", text: T.STEPS[s][1] + " home", tip: "you woke in a comfortable home: the day tires and bores you less" }] : []; });
    X.on("goals", function (game, add) {
      if (!home(game) || (H().next && H().next(game))) return;
      var cf = T.comfort(game);
      if (cf.step < 3) add("🏡 make your home snug: furniture made at the door, things in the yard", "comfort " + cf.n + "/" + T.STEPS[3][0], false);
    });
    X.tab({ id: "town", label: function () { return "🏘 town"; }, show: function (game, c) { return !!c && c.tier >= 2; }, html: T.html, wire: T.wire });
    // the home tab is home.js's: ours goes round it
    var Hm = H();
    if (Hm && Hm.html && !Hm._townWrapped) {
      Hm._townWrapped = true;
      var html0 = Hm.html, wire0 = Hm.wire;
      Hm.html = function (game, c, icon) { var base = html0(game, c, icon); try { return T.homeHtml(game, c, icon, base); } catch (e) { return base; } };
      Hm.wire = function (root, game, c, redraw, sayFn) { wire0(root, game, c, redraw, sayFn); try { T.homeWire(root, game, c, redraw, sayFn); } catch (e) {} };
    }
  };

  /* ---------------- looking at things, in a body ---------------- */
  function options(game, c, r, o, x) {
    if (!r || r.type !== "struct" || !r.ref) return;
    var b = r.ref, m = T.META[b.kind], lab = SK[b.kind] ? SK[b.kind].label : b.kind, tier = c.tier, Hm = H();
    function act(fn, snd) { return function () { var res = fn(); if (res && res.msg) x.say(res.msg); if (res && res.ok && snd) x.audio(snd, 0.7); return !!(res && res.ok); }; }
    function tab(name) { return function () { x.openBag(name); return true; }; }
    if (!b.done) return;
    var dmg = (b.data && b.data.dmg) || 0;
    // anything worn can be mended by hand
    if (dmg >= 0.2 && tier >= 2 && (m || (Hm && Hm.is(game, b)) || dmg >= T.WORN)) {
      var mo = T.mendWhy(game, c, b) ? x.no("mend the " + lab + ": bring a " + label(mendKind(b))) : x.op("mend the " + lab + " (1 " + label(mendKind(b)) + ")", act(function () { return T.mend(game, c, b); }, "build"), null);
      if (m && dmg >= T.WORN) { o.use = mo; o.place = x.op("open the town book", tab("town"), null); return; }
      if (!o.pick) o.pick = mo;
    }
    if (!m) return;
    var k = b.kind;
    if (k === "lodge") {
      if (Hm && Hm.is(game, b)) { o.use = x.op("open your home", tab("home"), null); o.place = x.op("sleep in the lodge", act(function () { return sleepAt(game, c, b); }), null); }
      else {
        o.use = x.op("sleep in the lodge", act(function () { return sleepAt(game, c, b); }), null);
        if (Hm && Hm.canClaim(game, b)) o.place = x.op(Hm.get(game) ? "move your home here" : "make this your home", function () { var ok = Hm.claim(game, b, c); if (ok) { x.audio("achievement", 0.7); x.say("🏡 this lodge is your home now"); } return ok; }, null);
      }
    } else if (k === "well") { o.use = x.op("drink from the well", act(function () { return T.drink(game, c, b); }, "eat"), null); o.place = o.use; }
    else if (k === "inn") { o.use = x.op("sleep at the " + nameOf(b), act(function () { return sleepAt(game, c, b); }), null); o.place = x.op("open the town book", tab("town"), null); }
    else if (k === "bakery" || k === "beehive" || k === "vegplot") {
      var sk = b.data && b.data.stock > 0 ? b.data.stockKind : null;
      o.use = sk ? x.op("take the " + label(sk) + (b.data.stock > 1 ? " (" + b.data.stock + ")" : ""), act(function () { return T.take(game, c, b); }, "craft"), null) : x.no(k === "bakery" ? "nothing baked yet: a loaf every morning" : k === "beehive" ? "the bees are busy: honey every other morning" : T.inYard(game, b) && Hm && Hm.has(game, "chest") ? "it goes straight to your chest each morning" : "nothing to pull yet: come back in the morning");
      if (k === "bakery") o.place = x.op("open the town book", tab("town"), null);
    } else if (k === "smithy") {
      var hd = x.held && K[x.hk] && K[x.hk].tool && x.held.w != null && x.held.w < Sv().uses(x.hk);
      var stock = b.data && b.data.stock > 0;
      o.use = hd ? x.op("mend your " + label(x.hk) + " (1 stone)", act(function () { return T.fixTool(game, c, b); }, "craft"), null) : stock ? x.op("take the " + label(b.data.stockKind) + " the smith made", act(function () { return T.take(game, c, b); }, "craft"), null) : x.op("open the town book", tab("town"), null);
      if (hd && stock) o.place = x.op("take the " + label(b.data.stockKind) + " the smith made", act(function () { return T.take(game, c, b); }, "craft"), null);
    } else if (k === "library") { o.use = x.op("read the tablets", act(function () { return T.read(game, c, b); }, "eureka"), null); o.place = x.op("open the town book", tab("town"), null); }
    else if (k === "watchtower") { o.use = x.op("climb up and look out", act(function () { return T.lookOut(game, c, b); }), null); o.place = x.op("open the town book", tab("town"), null); }
    else if (k === "shrine") {
      o.use = x.held && x.hk !== "plans" ? x.op("leave your " + label(x.hk) + " as an offering", act(function () { return T.offer(game, c, b); }, "chime"), null) : x.op("sit quietly at the shrine", act(function () { c.chem.fear = lower(c.chem.fear, 0.2); c.chem.anger = lower(c.chem.anger, 0.2); return T.sit(game, c, b, "sit"); }), null);
      o.place = x.op("open the town book", tab("town"), null);
    } else if (k === "storehouse") { o.use = x.op("open the storehouse", tab("town"), null); o.place = o.use; }
    else if (k === "healer") { o.use = x.op("rest at the healer's hut", act(function () { return T.rest(game, c, b); }, "chime"), null); o.place = x.op("open the town book", tab("town"), null); }
    else if (k === "bench") { o.use = x.op("sit on the bench", act(function () { return T.sit(game, c, b, "sit"); }), null); o.place = o.use; }
    else if (k === "swing") { o.use = x.op("have a swing", act(function () { return T.sit(game, c, b, "swing"); }), null); o.place = o.use; }
    else if (k === "flowerbed") { o.use = x.op("smell the flowers", act(function () { return T.sit(game, c, b, "flowers"); }), null); o.place = o.use; }
    else if (k === "sign") { o.use = x.op(b.name ? "read the sign" : "carve a name on the sign", act(function () { return b.name ? { ok: true, msg: "🪧 “" + b.name + "”" } : T.rename(game, b); }), null); o.place = x.op("carve a new name", act(function () { return T.rename(game, b); }, "craft"), null); }
    else if (k === "lamp") o.use = x.no(game.world.night ? "a lamp, lit" : "a lamp. it lights itself at dusk");
    else if (k === "fence" || k === "path") o.use = x.no(T.inYard(game, b) ? "part of your yard" : "a " + lab);
  }
  T.options = options;

  /* ---------------- the home tab (round home.js's own) ---------------- */
  function btn(attr, val, text, off, cls) { return "<button class='btn" + (cls ? " " + cls : "") + "' " + attr + "='" + val + "' " + (off ? "disabled" : "") + ">" + text + "</button>"; }
  T.homeHtml = function (game, c, icon, base) {
    var h = home(game);
    if (!h) return base;
    icon = icon || function () { return ""; };
    var s = st(game), cf = T.comfort(game), at = H().at(game, c), top = "", out = "", nx = T.upgradeTo(game);
    T.sync(game);
    top += "<div class='lbl'>🏡 " + esc(T.homeName(game)) + " · comfort <b>" + cf.n + "</b> · <b>" + cf.name + "</b>" + (cf.next ? " · " + cf.next[1] + " at " + cf.next[0] : "") + "</div>";
    top += "<div class='help'>" + (cf.step ? "wake in your own bed in a " + cf.name + " home: a better mood, a longer cosy day, less tired." : "a bare home is only a roof. make things at the door and the mornings get better.") + (T.worn(h) ? " <b>the roof leaks: mend it (comfort −3).</b>" : "") + "</div>";
    top += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin:4px 0'>";
    if (nx) top += btn("data-townup", "1", SK[nx].emoji + " make it a " + esc(SK[nx].label) + " · " + esc(costText(SK[nx].cost)), !!T.upgradeWhy(game, c), "go");
    top += btn("data-townname", "home", "🪧 name it", !at);
    if ((h.data && h.data.dmg) > 0.05) top += btn("data-townmend", "home", "🔨 mend (1 " + label(mendKind(h)) + ")", !!T.mendWhy(game, c, h));
    top += "</div>";
    // furniture
    var have = [], room = T.room(game), n = T.furnitureCount(game);
    T.FURNITURE.forEach(function (f) { if (s.fur[f.id]) have.push("<span title='" + esc(f.name + ": " + f.perk) + "'>" + f.icon + "</span>"); });
    out += "<div class='lbl'>furniture · " + n + " of " + room + " that fit in a " + esc(SK[h.kind].label) + (have.length ? " · " + have.join(" ") : "") + "</div>";
    if (at) {
      var acts = [];
      if (s.fur.barrel) acts.push(btn("data-towndo", "drink", "💧 drink from the barrel"));
      if (s.fur.musicbox) acts.push(btn("data-towndo", "music", "🎵 wind the music box"));
      acts.push(btn("data-towndo", "party", "🎉 throw a housewarming", !!T.partyWhy(game, c)));
      out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin:4px 0'>" + acts.join("") + "</div>";
      if (s.fur.mirror) {
        out += "<div class='lbl'>🪞 dye " + esc(c.name) + "'s fur</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
        T.DYES.forEach(function (d) { out += btn("data-towndye", d.id, d.icon + " " + esc(d.name) + " · " + esc(costText(d.cost)), !canPay(c, d.cost)); });
        if (c.dye != null) out += btn("data-towndye", "wash", "🫧 wash it out");
        out += "</div>";
      }
    }
    out += "<div class='rlist'>";
    T.FURNITURE.forEach(function (f) {
      if (s.fur[f.id]) return;
      out += "<div class='rc'><span class='big'>" + f.icon + "</span><div class='t'>" + esc(f.name) + " · +" + f.c + "<small>" + esc(f.perk) + "</small><div class='need'>" + needHtml(c, f.cost, icon) + "</div></div>" + btn("data-townmake", f.id, "make", !!T.whyNot(game, c, f.id), "go") + "</div>";
    });
    out += "</div>";
    // the yard
    var y = T.yard(game), yl = [];
    for (var k in y) yl.push(SK[k].emoji + (y[k] > 1 ? "×" + y[k] : ""));
    out += "<div class='lbl'>the yard · " + (yl.length ? yl.join(" ") : "nothing yet") + "</div><div class='help'>fence, stones, flowers, a hive, a plot, a bench, a lamp, a swing: plan them in the town tab and build them within " + T.YARD + " steps of your door.</div>";
    // the wall
    var wall = T.trophies(game).map(function (t) { return t.icon + " " + esc(t.name); }).concat(s.keeps.map(function (kp) { return kp.icon + " " + esc(kp.name); }));
    out += "<div class='lbl'>keepsakes · " + (wall.length ? wall.length + (s.fur.rack ? " on the rack (count twice)" : "") : "none yet") + "</div>" + (wall.length ? "<div class='help'>" + wall.join("<br>") + "</div>" : "<div class='help'>the biggest fish you catch, a garland from a feast, a ribbon from market day: they end up here.</div>");
    if (T.trophies(game).length) out += "<div class='help'>trophies make whoever wakes here bolder: +" + Math.round((T.pride(game, { snug: 1, snugT: game.time + 1 }) - 1) * 100) + "% to every whack at a grump that day.</div>";
    // the guest book
    out += "<div class='lbl'>📖 the guest book</div><div class='help'>" + (s.book.length ? s.book.slice(-5).reverse().map(function (e) { return "day " + e.d + " · <b>" + esc(e.n) + "</b>: “" + LINES[e.l % LINES.length] + "”" + (e.g ? " (left a " + esc(label(e.g)) + ")" : ""); }).join("<br>") : cf.step < 2 ? "nobody yet. smols start dropping by once a home is tidy." : "nobody yet. somebody will drop by.") + "</div>";
    return top + base + out;
  };
  T.homeWire = function (root, game, c, redraw, sayFn) {
    function done(r) { if (r && r.msg && sayFn) sayFn(r.msg); if (r && r.ok && SB.Audio && SB.Audio.play) SB.Audio.play("craft"); redraw(); }
    function on(sel, fn) { var L = root.querySelectorAll(sel); for (var i = 0; i < L.length; i++) (function (b) { b.addEventListener("click", function () { fn(b); }); })(L[i]); }
    on("[data-townmake]", function (b) { done(T.make(game, c, b.getAttribute("data-townmake"))); });
    on("[data-townup]", function () { done(T.upgrade(game, c)); });
    on("[data-townname='home']", function () { done(T.rename(game, home(game))); });
    on("[data-townmend='home']", function () { done(T.mend(game, c, home(game))); });
    on("[data-towndye]", function (b) { done(T.dye(game, c, b.getAttribute("data-towndye"))); });
    on("[data-towndo]", function (b) { var w = b.getAttribute("data-towndo"); done(w === "drink" ? T.drink(game, c, null) : w === "music" ? T.music(game, c) : T.party(game, c)); });
  };

  /* ---------------- the bag's "town" tab ---------------- */
  // the building of yours (or a site) you are standing at
  T.nearest = function (game, c) {
    var best = null, bd = 1e9;
    game.world.structures.forEach(function (b) {
      if (!SK[b.kind] || !(T.META[b.kind] || (b.data && b.data.pov))) return;
      var d = SB.dist(b.x, b.z, c.x, c.z) - SK[b.kind].r;
      if (d < T.NEAR && d < bd) { bd = d; best = b; }
    });
    return best;
  };
  var armed = null;
  T.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    var out = "", b = T.nearest(game, c);
    if (b) {
      var m = T.META[b.kind] || {}, def = SK[b.kind], dmg = (b.data && b.data.dmg) || 0, k = T.keeper(game, b);
      out += "<div class='lbl'>" + def.emoji + " " + esc(nameOf(b)) + (b.name ? " (" + esc(def.label) + ")" : "") + " · " + (!b.done ? "being built" : dmg >= T.WORN ? "<b>worn out: it does nothing until it's mended</b>" : dmg >= 0.2 ? "a bit worn" : "in good shape") + "</div>";
      out += "<div class='help'>" + esc(def.desc) + "</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin:4px 0'>";
      if (!b.done && T.commissionPrice(b) > 0) out += btn("data-townact", "commission", "🤝 pay the tribe to bring the rest · " + T.commissionPrice(b) + " " + money(game), (c.purse || 0) < T.commissionPrice(b), "go");
      if (b.done) out += btn("data-townact", "name", "🪧 name it");
      if (b.done && dmg > 0.05) out += btn("data-townact", "mend", "🔨 mend (1 " + label(mendKind(b)) + ")", !!T.mendWhy(game, c, b));
      if (b.done && b.data && b.data.stock > 0) out += btn("data-townact", "take", "take " + b.data.stock + " " + esc(label(b.data.stockKind)));
      if (T.canTakeDown(game, b)) out += btn("data-townact", "down", armed === b.id ? "🪓 tap again: take it down" : "🪓 take it down");
      out += "</div>";
      if (b.done && m.job) {
        out += "<div class='lbl'>" + (k ? "kept by <b>" + esc(k.name) + "</b>, the " + m.job + " · it does more and never wears out" : "nobody keeps it · ask a smol to be the " + m.job) + "</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
        T.candidates(game, c, b).forEach(function (o) { out += btn("data-townkeep", o.id, "ask " + esc(o.name) + (o.postJob ? " (now a " + esc(o.postJob) + ")" : "")); });
        if (k) out += btn("data-townkeep", "none", "let " + esc(k.name) + " go");
        out += "</div>";
      }
      if (b.kind === "storehouse" && b.done) {
        var ch = T.store(game, b), v = Sv().inv(c), ok = !storeWhy(game, c, b), puts = [], i;
        out += "<div class='lbl'>the storehouse · tap a thing to take it</div><div class='grid' style='grid-template-columns:repeat(6,minmax(0,40px))'>";
        for (i = 0; i < ch.length; i++) out += "<div class='slot" + (ok ? "" : " off") + "' data-townfetch='" + i + "' title='" + (ch[i] ? esc(label(ch[i].k)) : "") + "'>" + (ch[i] ? icon(ch[i].k, 32) + (ch[i].n > 1 ? "<em>" + ch[i].n + "</em>" : "") : "") + "</div>";
        out += "</div>";
        for (i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k !== "plans") puts.push(btn("data-townstash", i, icon(v.s[i].k, 16) + " " + esc(label(v.s[i].k)) + (v.s[i].n > 1 ? " ×" + v.s[i].n : ""), !ok));
        out += "<div class='lbl'>put away</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + (puts.length ? puts.join("") : "<span class='help'>your bag is empty</span>") + "</div>";
      }
    } else out += "<div class='help'>stand by a building of yours to name it, mend it, give it a keeper or take it down.</div>";
    // the town at a glance
    var posts = [], worn = 0;
    game.world.structures.forEach(function (x) { if (!T.META[x.kind] || !x.done) return; if (T.worn(x)) worn++; var kp = T.keeper(game, x); if (kp) posts.push(SK[x.kind].emoji + " " + esc(kp.name)); });
    if (posts.length || worn) out += "<div class='lbl'>the town · " + (posts.length ? posts.join(" · ") : "no keepers") + (worn ? " · <b>" + worn + " worn out</b>" : "") + "</div>";
    // plans
    [["town", "for the tribe · plan one, then place it, bring what it asks for and build it"], ["yard", "for your yard"], ["home", "a bigger home"]].forEach(function (g) {
      var L = T.plans(game, c, g[0]);
      out += "<div class='lbl'>" + g[1] + "</div><div class='rlist'>";
      L.forEach(function (p) {
        out += "<div class='rc'><span class='big'>" + p.def.emoji + "</span><div class='t'>" + esc(p.def.label) + "<small>" + esc(p.why || p.def.desc) + "</small><div class='need'>" + needHtml(c, p.cost, icon) + "</div></div>" + btn("data-townplan", p.kind, "plan", !!p.why, "go") + "</div>";
      });
      out += "</div>";
    });
    out += "<div class='lbl'>paths</div><div class='row'>" + btn("data-townact", "pave", "🪨 lay a paving stone where you stand (1 stone)", !game.civ || Sv().count(c, "stone") < 1) + "</div>";
    return out;
  };
  T.wire = function (root, game, c, redraw, sayFn) {
    function done(r) { if (r && r.msg && sayFn) sayFn(r.msg); if (r && r.ok && SB.Audio && SB.Audio.play) SB.Audio.play("craft"); redraw(); }
    function on(sel, fn) { var L = root.querySelectorAll(sel); for (var i = 0; i < L.length; i++) (function (el) { el.addEventListener("click", function () { fn(el); }); })(L[i]); }
    var b = T.nearest(game, c);
    on("[data-townplan]", function (el) { var r = T.startBuild(game, c, el.getAttribute("data-townplan")); if (!r.ok) done(r); });
    on("[data-townact]", function (el) {
      var w = el.getAttribute("data-townact");
      if (w === "pave") return done(T.pave(game, c));
      if (!b) return redraw();
      if (w === "down") { if (armed !== b.id) { armed = b.id; return redraw(); } armed = null; return done(T.takeDown(game, c, b)); }
      armed = null;
      done(w === "name" ? T.rename(game, b) : w === "mend" ? T.mend(game, c, b) : w === "take" ? T.take(game, c, b) : w === "commission" ? T.commission(game, c, b) : null);
    });
    on("[data-townkeep]", function (el) { var id = el.getAttribute("data-townkeep"); if (!b) return redraw(); if (id === "none") { T.unpost(game, b); return redraw(); } done(T.assign(game, b, SB.Game.byId(game, +id))); });
    on("[data-townfetch]", function (el) { if (b) done(T.storeFetch(game, c, b, +el.getAttribute("data-townfetch"))); });
    on("[data-townstash]", function (el) { if (b) done(T.storeStash(game, c, b, +el.getAttribute("data-townstash"))); });
  };

  T.hook();

  /* ---------------- the models ---------------- */
  var ME = SB.Meshes || SB.ME;
  var WOOD = 0x8a5a36, DARK = 0x5e3d26, STONE = 0x9a948e, THATCH = 0xe2b862, TILE = 0xb4573a, PLASTER = 0xd9cdb4, LEAF = 0x6cc04a;
  function roof(b, w, d, y, col) { // two tilted slabs meeting on a ridge along x
    b.color(col, 1);
    b.push().translate(0, y, -d * 0.27).rotX(0.62).box(w, 0.07, d * 0.72).pop();
    b.push().translate(0, y, d * 0.27).rotX(-0.62).box(w, 0.07, d * 0.72).pop();
  }
  function door(b, x, z) { b.color(0x3a2a1c).push().translate(x, 0, z).box(0.34, 0.58, 0.04).pop(); }
  function win(b, x, y, z) { b.color(0xffd27a, 1).glow(0.5).push().translate(x, y, z).box(0.3, 0.24, 0.03).pop().glow(0); }
  var MODELS = {
    lodge: function () { // a long timber house on a stone footing with a porch, two windows and a tall chimney
      var b = ME.builder();
      b.color(STONE).push().box(2.3, 0.14, 1.7).pop();
      b.color(0xc8925a).push().translate(0, 0.14, -0.1).box(2.1, 0.95, 1.3).pop();
      roof(b, 2.4, 1.75, 1.08, 0x8a4a34);
      b.color(0xa8a094).push().translate(0, 1.09, -0.1).cyl(3, 0.6, 0.01, 0.5).pop();
      b.color(STONE).push().translate(0.75, 0.9, -0.35).box(0.26, 0.95, 0.26).pop();
      b.color(WOOD).push().translate(0, 0.14, 0.7).box(1.5, 0.06, 0.4).pop();
      b.push().translate(-0.68, 0.2, 0.85).cyl(4, 0.04, 0.04, 0.7).pop().push().translate(0.68, 0.2, 0.85).cyl(4, 0.04, 0.04, 0.7).pop();
      b.color(0x8a4a34, 1).push().translate(0, 0.9, 0.72).rotX(-0.3).box(1.6, 0.05, 0.5).pop();
      door(b, 0, 0.56); win(b, -0.65, 0.55, 0.56); win(b, 0.65, 0.55, 0.56);
      return b.finish();
    },
    fence: function () {
      var b = ME.builder().color(0xd8c9a8);
      for (var i = 0; i < 5; i++) b.push().translate(-0.4 + i * 0.2, 0, 0).box(0.07, 0.42 + (i % 2) * 0.05, 0.04).pop();
      b.color(0xc4b48f).push().translate(0, 0.14, 0).box(0.94, 0.05, 0.03).pop().push().translate(0, 0.3, 0).box(0.94, 0.05, 0.03).pop();
      return b.finish();
    },
    path: function () {
      var b = ME.builder();
      [[-0.22, -0.12, 0.2], [0.14, -0.2, 0.17], [0.2, 0.14, 0.21], [-0.14, 0.2, 0.16], [0, 0, 0.13]].forEach(function (p, i) { b.color(i % 2 ? 0xa8a29a : 0x8f8a84).push().translate(p[0], 0, p[1]).cyl(7, p[2], p[2] * 0.9, 0.05).pop(); });
      return b.finish();
    },
    flowerbed: function () {
      var b = ME.builder().color(0x6a4a2e).push().box(0.9, 0.1, 0.6).pop();
      b.color(0x4a3320).push().translate(0, 0.1, 0).box(0.8, 0.03, 0.5).pop();
      var cols = [0xff7aa8, 0xffd84a, 0xb07aff, 0xff9a4a, 0xffffff, 0xff5a5a];
      for (var i = 0; i < 6; i++) { var x = -0.3 + (i % 3) * 0.3, z = i < 3 ? -0.12 : 0.12; b.color(0x4f9a3a).push().translate(x, 0.12, z).cyl(3, 0.012, 0.012, 0.16).pop(); b.color(cols[i], 1).push().translate(x, 0.3, z).scale(0.06).sphere(0).pop(); }
      return b.finish();
    },
    beehive: function () {
      var b = ME.builder().color(WOOD).push().box(0.5, 0.06, 0.5).pop();
      for (var i = 0; i < 4; i++) b.color(i % 2 ? 0xe0b85a : 0xd4a94a, 1).push().translate(0, 0.06 + i * 0.12, 0).cyl(9, 0.26 - i * 0.045, 0.22 - i * 0.045, 0.12).pop();
      b.color(0x3a2a1c).push().translate(0, 0.1, 0.25).box(0.1, 0.07, 0.03).pop();
      return b.finish();
    },
    vegplot: function () {
      var b = ME.builder().color(0x6a4a2e).push().box(1.2, 0.08, 0.9).pop();
      b.color(0x4a3320).push().translate(0, 0.08, 0).box(1.1, 0.03, 0.8).pop();
      for (var i = 0; i < 8; i++) { var x = -0.4 + (i % 4) * 0.27, z = i < 4 ? -0.2 : 0.2; b.color(0xff8a3a).push().translate(x, 0.09, z).cyl(5, 0.04, 0.03, 0.05).pop(); b.sides(true).color(LEAF).push().translate(x, 0.13, z).rotY(i).rotX(-0.5).leaf(0.08, 0.2, 0.03).pop().sides(false); }
      return b.finish();
    },
    bench: function () {
      var b = ME.builder().color(WOOD);
      b.push().translate(0, 0.22, 0).box(0.8, 0.05, 0.26).pop().push().translate(0, 0.27, -0.12).box(0.8, 0.26, 0.04).pop();
      b.color(DARK).push().translate(-0.34, 0, 0).box(0.06, 0.22, 0.24).pop().push().translate(0.34, 0, 0).box(0.06, 0.22, 0.24).pop();
      return b.finish();
    },
    lamp: function () {
      var b = ME.builder().color(DARK).cyl(5, 0.05, 0.035, 1.2);
      b.color(STONE).cyl(6, 0.11, 0.09, 0.08);
      b.color(DARK).push().translate(0, 1.2, 0).box(0.2, 0.03, 0.2).pop().push().translate(0, 1.43, 0).cone(4, 0.16, 0.1).pop();
      b.color(0xffd27a, 1).glow(1.2).push().translate(0, 1.23, 0).box(0.14, 0.2, 0.14).pop().glow(0);
      return b.finish();
    },
    sign: function () {
      var b = ME.builder().color(DARK).cyl(4, 0.04, 0.035, 0.8);
      b.color(0xc9935a).push().translate(0, 0.52, 0.04).box(0.5, 0.26, 0.04).pop();
      b.color(DARK).push().translate(0, 0.62, 0.065).box(0.34, 0.025, 0.01).pop().push().translate(0, 0.56, 0.065).box(0.26, 0.025, 0.01).pop();
      return b.finish();
    },
    swing: function () {
      var b = ME.builder().color(WOOD);
      b.push().translate(-0.5, 0, 0).cyl(4, 0.05, 0.04, 1.3).pop().push().translate(0.5, 0, 0).cyl(4, 0.05, 0.04, 1.3).pop();
      b.push().translate(0, 1.27, 0).box(1.15, 0.07, 0.07).pop();
      b.color(0x4f9a3a).push().translate(-0.17, 0.4, 0).cyl(3, 0.012, 0.012, 0.88).pop().push().translate(0.17, 0.4, 0).cyl(3, 0.012, 0.012, 0.88).pop();
      b.color(0xc9935a).push().translate(0, 0.37, 0).box(0.42, 0.04, 0.16).pop();
      return b.finish();
    },
    well: function () {
      var b = ME.builder().color(STONE).cyl(10, 0.5, 0.48, 0.42, false);
      b.color(0x7f7a75).push().translate(0, 0.42, 0).cyl(10, 0.54, 0.54, 0.05).pop();
      b.color(0x3a6ea8, 1).push().translate(0, 0.3, 0).cyl(10, 0.44, 0.44, 0.02).pop();
      b.color(WOOD).push().translate(-0.46, 0.4, 0).cyl(4, 0.04, 0.04, 0.75).pop().push().translate(0.46, 0.4, 0).cyl(4, 0.04, 0.04, 0.75).pop();
      b.push().translate(0, 1.0, 0).box(1.0, 0.05, 0.06).pop();
      b.color(TILE, 1).push().translate(0, 1.12, 0).scale(1, 1, 0.75).cone(4, 0.75, 0.32).pop();
      b.color(DARK).push().translate(0.12, 0.56, 0).cyl(6, 0.08, 0.07, 0.13).pop();
      return b.finish();
    },
    inn: function () { // a long thatched hall with a row of lit windows and a hanging sign
      var b = ME.builder();
      b.color(STONE).push().box(2.6, 0.12, 1.5).pop();
      b.color(PLASTER).push().translate(0, 0.12, 0).box(2.4, 0.85, 1.3).pop();
      b.color(DARK); for (var i = 0; i < 5; i++) b.push().translate(-1.2 + i * 0.6, 0.12, 0.655).box(0.06, 0.85, 0.02).pop();
      roof(b, 2.7, 1.8, 0.96, THATCH);
      b.color(0xcbb894).push().translate(0, 0.97, 0).cyl(3, 0.62, 0.01, 0.5).pop();
      door(b, -0.9, 0.66); win(b, -0.3, 0.5, 0.66); win(b, 0.3, 0.5, 0.66); win(b, 0.9, 0.5, 0.66);
      b.color(DARK).push().translate(-1.3, 0.85, 0.85).box(0.04, 0.04, 0.4).pop();
      b.color(0xc9935a).push().translate(-1.3, 0.6, 0.98).box(0.04, 0.22, 0.26).pop();
      return b.finish();
    },
    bakery: function () { // plaster walls, a tiled roof, a big brick oven with a glowing mouth, loaves on a sill
      var b = ME.builder();
      b.color(PLASTER).push().box(1.5, 0.85, 1.2).pop();
      roof(b, 1.7, 1.6, 0.85, TILE);
      b.color(0xcbb894).push().translate(0, 0.85, 0).cyl(3, 0.58, 0.01, 0.45).pop();
      b.color(0xa85a3c).push().translate(0.95, 0, 0).cyl(8, 0.42, 0.3, 0.7).pop().push().translate(0.95, 0.7, 0).cyl(6, 0.12, 0.1, 0.7).pop();
      b.color(0xff8a2a, 1).glow(0.9).push().translate(0.95, 0.12, 0.4).box(0.26, 0.2, 0.03).pop().glow(0);
      door(b, -0.4, 0.61); win(b, 0.3, 0.5, 0.61);
      b.color(WOOD).push().translate(0.3, 0.34, 0.66).box(0.4, 0.03, 0.12).pop();
      b.color(0xd9a55a).push().translate(0.22, 0.37, 0.66).scale(0.08, 0.05, 0.05).sphere(0).pop().push().translate(0.4, 0.37, 0.66).scale(0.08, 0.05, 0.05).sphere(0).pop();
      return b.finish();
    },
    smithy: function () { // an open stone forge under a slate roof, an anvil on a stump, a glowing hearth
      var b = ME.builder();
      b.color(0x7f7a80).push().translate(0, 0, -0.4).box(1.5, 0.9, 0.3).pop();
      b.color(WOOD).push().translate(-0.68, 0, 0.45).cyl(4, 0.05, 0.05, 0.9).pop().push().translate(0.68, 0, 0.45).cyl(4, 0.05, 0.05, 0.9).pop();
      roof(b, 1.7, 1.5, 0.9, 0x5a5560);
      b.color(0x6a6474).push().translate(-0.4, 0, -0.15).box(0.5, 0.45, 0.4).pop();
      b.color(0xff7a2a, 1).glow(1.0).push().translate(-0.4, 0.45, -0.15).box(0.36, 0.04, 0.28).pop().glow(0);
      b.color(0x6a6474).push().translate(-0.4, 0.9, -0.4).cyl(6, 0.13, 0.1, 0.6).pop();
      b.color(DARK).push().translate(0.35, 0, 0.1).cyl(7, 0.14, 0.14, 0.26).pop();
      b.color(0x3d3d46).push().translate(0.35, 0.26, 0.1).box(0.3, 0.1, 0.12).pop().push().translate(0.5, 0.3, 0.1).box(0.12, 0.05, 0.08).pop();
      return b.finish();
    },
    library: function () { // a tall narrow house of pale stone with a blue roof and a tablet over the door
      var b = ME.builder();
      b.color(0xcfc6b4).push().box(1.5, 0.12, 1.3).pop();
      b.color(0xd9d0be).push().translate(0, 0.12, 0).box(1.35, 1.15, 1.15).pop();
      roof(b, 1.55, 1.55, 1.27, 0x4a5f8a);
      b.color(0xc6bda9).push().translate(0, 1.27, 0).cyl(3, 0.56, 0.01, 0.45).pop();
      door(b, 0, 0.585); win(b, -0.42, 0.75, 0.585); win(b, 0.42, 0.75, 0.585);
      b.color(0xb8a878).push().translate(0, 0.78, 0.59).box(0.26, 0.2, 0.03).pop();
      b.color(DARK).push().translate(0, 0.86, 0.61).box(0.16, 0.02, 0.01).pop().push().translate(0, 0.81, 0.61).box(0.12, 0.02, 0.01).pop();
      return b.finish();
    },
    watchtower: function () { // four legs, a railed platform with a little roof, a ladder
      var b = ME.builder().color(WOOD);
      for (var i = 0; i < 4; i++) b.push().translate(i & 1 ? 0.4 : -0.4, 0, i & 2 ? 0.4 : -0.4).cyl(4, 0.06, 0.05, 2.0).pop();
      b.color(0xa8743e).push().translate(0, 1.5, 0).box(1.05, 0.07, 1.05).pop();
      b.color(WOOD).push().translate(0, 1.82, 0.5).box(1.0, 0.05, 0.04).pop().push().translate(0, 1.82, -0.5).box(1.0, 0.05, 0.04).pop().push().translate(0.5, 1.82, 0).box(0.04, 0.05, 1.0).pop().push().translate(-0.5, 1.82, 0).box(0.04, 0.05, 1.0).pop();
      b.color(THATCH, 1).push().translate(0, 2.0, 0).cone(4, 0.85, 0.5).pop();
      b.color(DARK).push().translate(0.12, 0, 0.5).rotX(-0.12).cyl(3, 0.02, 0.02, 1.55).pop().push().translate(-0.12, 0, 0.5).rotX(-0.12).cyl(3, 0.02, 0.02, 1.55).pop();
      for (var r = 0; r < 5; r++) b.push().translate(0, 0.2 + r * 0.28, 0.48 - r * 0.035).box(0.26, 0.025, 0.025).pop();
      return b.finish();
    },
    shrine: function () { // a stepped stone base, a standing stone with a glowing mark, two little posts and a lintel
      var b = ME.builder();
      b.color(STONE).push().box(1.0, 0.1, 0.8).pop().push().translate(0, 0.1, 0).box(0.7, 0.1, 0.55).pop();
      b.color(0xb8b2aa).push().translate(0, 0.2, -0.05).scale(1, 1, 0.6).cyl(6, 0.2, 0.13, 0.7).pop();
      b.color(0xc5ff49, 1).glow(1.1).push().translate(0, 0.55, 0.06).box(0.08, 0.14, 0.02).pop().glow(0);
      b.color(0xb4573a).push().translate(-0.42, 0, 0.3).cyl(5, 0.04, 0.04, 0.85).pop().push().translate(0.42, 0, 0.3).cyl(5, 0.04, 0.04, 0.85).pop();
      b.push().translate(0, 0.8, 0.3).box(1.05, 0.07, 0.09).pop().push().translate(0, 0.68, 0.3).box(0.9, 0.04, 0.06).pop();
      return b.finish();
    },
    storehouse: function () { // a plank barn with a big double door and barrels outside
      var b = ME.builder();
      b.color(0xa8743e).push().box(1.6, 0.95, 1.2).pop();
      b.color(WOOD); for (var i = 0; i < 6; i++) b.push().translate(-0.75 + i * 0.3, 0, 0.605).box(0.03, 0.95, 0.01).pop();
      roof(b, 1.8, 1.6, 0.95, 0x6e4528);
      b.color(0x9a6a3c).push().translate(0, 0.95, 0).cyl(3, 0.58, 0.01, 0.45).pop();
      b.color(DARK).push().translate(0, 0, 0.61).box(0.7, 0.7, 0.03).pop();
      b.color(0xd8b24a).push().translate(0, 0.35, 0.63).box(0.03, 0.7, 0.01).pop();
      b.color(0x8a5630).push().translate(1.0, 0, 0.35).cyl(8, 0.16, 0.16, 0.34).pop().push().translate(1.0, 0, -0.05).cyl(8, 0.16, 0.16, 0.34).pop();
      return b.finish();
    },
    healer: function () { // a round hut with a leafy green roof, herbs hanging by the door, a white banner
      var b = ME.builder();
      b.color(STONE).cyl(10, 0.9, 0.88, 0.12);
      b.color(PLASTER).push().translate(0, 0.12, 0).cyl(10, 0.8, 0.78, 0.75, false).pop();
      b.color(0x5fa04a, 1).push().translate(0, 0.82, 0).cyl(10, 0.98, 0.06, 0.9).pop();
      door(b, 0, 0.78);
      b.sides(true).color(LEAF); for (var i = 0; i < 3; i++) b.push().translate(0.36 + i * 0.1, 0.62, 0.74).rotX(3.14).leaf(0.07, 0.2, 0.02).pop();
      b.sides(false).color(DARK).push().translate(-0.55, 0, 0.7).cyl(4, 0.03, 0.03, 1.2).pop();
      b.color(0xffffff, 1).push().translate(-0.4, 0.95, 0.7).box(0.26, 0.22, 0.02).pop();
      b.color(0x5fa04a, 1).push().translate(-0.4, 1.0, 0.715).box(0.06, 0.14, 0.01).pop().push().translate(-0.4, 1.04, 0.715).box(0.14, 0.06, 0.01).pop();
      return b.finish();
    }
  };
  T.MODELS = MODELS;
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { for (var mk in MODELS) { try { if (!ME.STRUCT_BUILDERS[mk]) { MODELS[mk](); ME.STRUCT_BUILDERS[mk] = MODELS[mk]; } } catch (e) {} } }
})();
