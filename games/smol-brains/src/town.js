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
      var wk = T.wearK ? T.wearK(game, b) : 1;
      if (wk > 0 && (d.dmg || 0) < T.WORN + 0.06) d.dmg = Math.round(((d.dmg || 0) + (b === h ? T.WEAR * 0.75 : T.WEAR) * wk) * 100) / 100;
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
    X.tab({ id: "town", label: function () { return "🏘 town"; }, show: function (game, c) { return !!c && c.tier >= 2; }, html: function (game, c, icon) { return T.html(game, c, icon); }, wire: function (root, game, c, redraw, sayFn) { return T.wire(root, game, c, redraw, sayFn); } });
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

  T._ = { dice: dice, home: home, say: say, lower: lower, canPay: canPay, pay: pay, needHtml: needHtml, btn: btn, esc: esc, near: near, once: once, give: give, isSmol: isSmol, structs: structs, money: money, addStock: addStock, ideaFor: ideaFor, mendKind: mendKind, guests: guests, sign: sign }; // for the second half of this file
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
      // 4.42: from the sky the roof was one flat green disc. a darker eave gives it an edge, a white band marks it as the healer's
      b.color(0x3f7a34, 1).push().translate(0, 0.8, 0).cyl(10, 1.04, 0.86, 0.14).pop();
      b.color(0xffffff, 1).push().translate(0, 1.2, 0).cyl(10, 0.62, 0.5, 0.12).pop();
      b.color(0xffffff, 1).push().translate(0, 1.7, 0).scale(0.09).sphere(1).pop();
      door(b, 0, 0.78);
      b.sides(true).color(LEAF); for (var i = 0; i < 3; i++) b.push().translate(0.36 + i * 0.1, 0.62, 0.74).rotX(3.14).leaf(0.07, 0.2, 0.02).pop();
      b.sides(false).color(DARK).push().translate(-0.55, 0, 0.7).cyl(4, 0.03, 0.03, 1.2).pop();
      b.color(0xffffff, 1).push().translate(-0.36, 0.86, 0.7).box(0.36, 0.34, 0.02).pop();
      b.color(0x3f9a3a, 1).push().translate(-0.36, 0.93, 0.715).box(0.08, 0.2, 0.01).pop().push().translate(-0.36, 0.99, 0.715).box(0.2, 0.08, 0.01).pop();
      return b.finish();
    }
  };
  T.MODELS = MODELS;
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { for (var mk in MODELS) { try { if (!ME.STRUCT_BUILDERS[mk]) { MODELS[mk](); ME.STRUCT_BUILDERS[mk] = MODELS[mk]; } } catch (e) {} } }
})();

/* ======================================================================================================================
   round 2: money, trade, work and the rest of the home. Everything below builds on the half above and on economy.js,
   civ.js and loot.js (the purse a smol carries is the same purse the smols use among themselves).
     money       a savings jar at home that every smol you play shares and that shops draw on; grumps drop shells; the
                 council's tithe; a trade crate that sells overnight; your own stall; investing in a smol's stall.
     shops       smols with a trade (and the keepers of your buildings) sell to you and buy from you: stock that runs out,
                 prices that climb as it sells, haggling, regulars' stars, buy-back, services (re-working a tool, tablets,
                 a blessing, a song night, a hired guard). Shut at night and on the rest day.
     traders     every few days somebody sets up camp for two days: a raft trader, a caravan, a travelling cart, a
                 wandering scribe, a dyer, a tinker, a sand trader, an elder from the ark. A signal fire calls the raft.
                 A hermit by a found cave; a lone grump with a sack at night once the captains are beaten.
     work        your smol's trade has ranks (helper to master, with badges), two shifts a day at a workplace, a little
                 list of jobs for the day, burn-out, days off, a pension for elders, and a choice of two paths for masters.
     home        looks (roof, walls, floor, bed, footing) with matching sets, paint, add-on rooms, housemates and a door
                 guard, dirt and sweeping, a wash, kinds of play, a camp kit and outposts, carrying a building somewhere
                 else, a staked plot, the board of asks, gadgets (bell, trip-plate, watchfire, feeder, lightning rod...).
   State: more fields on game.quests.town; plain fields on a smol (rank, spec, work, play, hireT...). */
(function () {
  "use strict";
  var SB = window.SB, T = SB && SB.Town;
  if (!T || !T._) return;
  var K = SB.KINDS || {}, SK = SB.STRUCTS || {}, U = T._;
  var dice = U.dice, home = U.home, lower = U.lower, esc = U.esc, btn = U.btn, isSmol = U.isSmol, structs = U.structs, canPay = U.canPay, pay = U.pay, give = U.give;
  function H() { return SB.Home || null; }
  function Sv() { return SB.Surv || SB.Survival; }
  function P() { return SB.Possess || null; }
  function me() { var p = P(); return p && p.active && p.c ? p.c : null; }
  function cur() { return SB.Game && SB.Game.current; }
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function half(game) { return ((game.time || 0) / SB.DAY_LENGTH) % 1 < 0.5 ? "am" : "pm"; }
  function label(k) { return K[k] && K[k].label ? K[k].label : k; }
  function r2(v) { return Math.round(v * 100) / 100; }
  function ok(msg, extra) { var r = { ok: true, msg: msg }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
  function no(msg) { return { ok: false, msg: msg || "" }; }
  function mi(game) { return U.money(game); }
  function era(game) { return SB.Civ && SB.Civ.era ? SB.Civ.era(game) : 0; }
  function dirty(b) { if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(b.x | 0, b.z | 0); }
  function num(s, k) { return typeof s[k] === "number" && isFinite(s[k]) ? s[k] : 0; }
  function st(game) {
    var s = T.state(game);
    if (!s.look) s.look = {}; if (!s.addon) s.addon = {}; if (!Array.isArray(s.mates)) s.mates = []; if (!Array.isArray(s.callers)) s.callers = [];
    if (!s.shops) s.shops = {}; if (!s.loyal) s.loyal = {}; if (!s.charm) s.charm = {}; if (!Array.isArray(s.crate)) s.crate = []; if (!Array.isArray(s.back)) s.back = [];
    if (!s.order) s.order = {}; if (!s.outposts) s.outposts = {};
    return s;
  }
  function note(game, txt) { if (SB.Game && SB.Game.note) SB.Game.note(game, txt); }
  function emit(n, d) { if (SB.bus) SB.bus.emit(n, d); }
  function xp(c, job, n) { if (SB.Civ && SB.Civ.xp) SB.Civ.xp(c, job, n); else { var j = c.jobXp || (c.jobXp = {}); j[job] = Math.round(((j[job] || 0) + n) * 10) / 10; } }
  function centre(game) { var h = home(game); if (h) return h; var w = game.world; if (SB.Society && SB.Society.home) { try { var p = SB.Society.home(game, 0); if (p) return p; } catch (e) {} } return (w.T && (w.T.nest || w.T.spawn)) || { x: 0, z: 0 }; }
  function wet(game, x, z) { var W = SB.World; return W.depthAt ? W.depthAt(game.world, x, z) : 0; }
  function nearWater(game, x, z, r) { for (var a = 0; a < 8; a++) for (var d = 2; d <= r; d += 2) if (wet(game, x + Math.sin(a * 0.785) * d, z + Math.cos(a * 0.785) * d) > 0.2) return true; return false; }
  // a dry, level, empty spot in a ring round a place
  function spot(game, x, z, key, r0, r1, shore) {
    var w = game.world, W = SB.World, r = dice(game, key);
    for (var t = 0; t < 60; t++) {
      var a = r() * 6.283, d = r0 + r() * (r1 - r0), px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d;
      if (W.inBounds && !W.inBounds(w, px, pz)) continue;
      if (W.siteFree ? !W.siteFree(w, px, pz, 0.9) : (W.walkable && !W.walkable(w, px, pz, false))) continue;
      if (shore && !nearWater(game, px, pz, 4)) continue;
      if (structs(game, function (b) { return SB.dist(b.x, b.z, px, pz) < (SK[b.kind] ? SK[b.kind].r : 1) + 1.4; }).length) continue;
      return { x: Math.round(px * 10) / 10, z: Math.round(pz * 10) / 10 };
    }
    return shore ? spot(game, x, z, key + "b", r0, r1, false) : null;
  }
  // put a finished building down without the fanfare of somebody having built it
  function plant(game, kind, x, z, opts) {
    var b = SB.World.addStructure(game.world, game, kind, x, z, { done: false, tribe: opts.tribe || 0, rot: opts.rot || 0, data: opts.data || {}, name: opts.name || null });
    b.done = true; b.need = {}; b.noun = SK[kind].noun;
    if (SB.World.markNode) SB.World.markNode(game.world, b);
    dirty(b);
    return b;
  }
  // bag slot i into an array of slots; a slot of the array back into the bag
  function stashInto(arr, c, i, cap) {
    var v = Sv().inv(c), sl = v.s[i], n, mx, j, t;
    if (!sl || sl.k === "plans") return no("nothing to put in");
    while (arr.length < cap) arr.push(null);
    n = sl.n; mx = Math.max(1, Sv().stackOf ? Sv().stackOf(sl.k) : 12);
    if (mx > 1) for (j = 0; j < cap && n > 0; j++) if (arr[j] && arr[j].k === sl.k && arr[j].n < mx) { t = Math.min(n, mx - arr[j].n); arr[j].n += t; n -= t; }
    for (j = 0; j < cap && n > 0; j++) if (!arr[j]) { t = Math.min(n, mx); arr[j] = { k: sl.k, n: t }; if (sl.w != null) arr[j].w = sl.w; n -= t; }
    if (n === sl.n) return no("no room in there");
    if (n > 0) sl.n = n; else v.s[i] = null;
    return ok("");
  }
  function fetchFrom(arr, c, i) {
    var sl = arr[i]; if (!sl) return no("");
    var left = Sv().add(c, sl.k, sl.n, sl.w);
    if (left === sl.n) return no((Sv().whyNot && Sv().whyNot(c, sl.k)) || "your bag is full");
    if (left > 0) sl.n = left; else arr[i] = null;
    return ok("");
  }
  // a free bit of ground within a couple of steps of a smol
  function freeNear(game, c, r, loose) {
    var W = SB.World, w = game.world;
    for (var d = 0; d < 3; d++) for (var a = 0; a < 8; a++) {
      var x = c.x + Math.sin(a * 0.785 + 0.4) * (r + 0.6 + d * 0.9), z = c.z + Math.cos(a * 0.785 + 0.4) * (r + 0.6 + d * 0.9);
      if (loose ? (W.walkable && !W.walkable(w, x, z, false)) || (W.depthAt && W.depthAt(w, x, z) > 0.02) : W.siteFree && !W.siteFree(w, x, z, r)) continue;
      if (structs(game, function (b) { return SB.dist(b.x, b.z, x, z) < (SK[b.kind] ? SK[b.kind].r : 1) + r; }).length) continue;
      return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
    }
    return null;
  }
  function heldSlot(c) { var v = Sv().inv(c); return v.s[v.sel] ? v.sel : -1; }

  /* ---------------- new things to carry ---------------- */
  function kind(id, def) { if (!K[id]) K[id] = def; }
  kind("campkit", { noun: "material", label: "camp kit", emoji: "⛺", r: 0.2, color: 0xc9a36a, mat: 1, desc: "a rolled tent, a bedroll and a fire ring. pitch it anywhere: a roof, a bed, and your chest within reach." });
  kind("parts", { noun: "material", label: "tinker's parts", emoji: "⚙", r: 0.12, color: 0xb8894a, mat: 1, desc: "little copper cogs and springs. bells, trip-plates and feeders need them." });
  kind("thunderpot", { noun: "material", label: "thunder-pot", emoji: "🧨", r: 0.14, color: 0x9a5a3a, mat: 1, desc: "a clay pot that goes BANG. nobody is hurt, but every grump nearby remembers somewhere else to be." });
  kind("top", { noun: "toy", label: "spinning top", emoji: "🪀", r: 0.1, color: 0xd9614a, desc: "give it a spin." });
  kind("kite", { noun: "toy", label: "leaf kite", emoji: "🪁", r: 0.16, color: 0x6cc04a, desc: "a big leaf on a vine. best on a windy day." });
  kind("doll", { noun: "toy", label: "rag doll", emoji: "🪆", r: 0.12, color: 0xe8c9a0, desc: "a little smol made of scraps." });
  kind("drum", { noun: "toy", label: "drum", emoji: "🥁", r: 0.2, color: 0x8a5a36, desc: "a hollow log and a skin. everyone nearby taps a foot." });
  kind("flute", { noun: "toy", label: "reed flute", emoji: "🪈", r: 0.1, color: 0xcbb894, desc: "three holes and a tune." });
  kind("sorbet", { noun: "food", label: "berry ice", emoji: "🍧", r: 0.1, color: 0xd98ad0, food: { hunger: -0.2 }, chem: { glucose: 0.2 }, desc: "crushed berries on pond ice. sold in summer only." });
  kind("feastcake", { noun: "food", label: "fair cake", emoji: "🍰", r: 0.12, color: 0xf0d9a0, food: { hunger: -0.6 }, chem: { glucose: 0.4 }, desc: "honey cake, baked for market day and no other." });
  T.TOYS = { top: 0.3, kite: 0.3, doll: 0.3, drum: 0.3, flute: 0.3 };
  var RECIPES = [
    { id: "top", in: { stick: 1, stone: 1 }, idea: "knap" }, { id: "kite", in: { leaves: 2, stick: 1, vine: 1 }, idea: "weave" }, { id: "doll", in: { fiber: 2, fur: 1 }, idea: "sewing" },
    { id: "drum", in: { log: 1, fur: 1 }, idea: "song" }, { id: "flute", in: { stick: 2 }, idea: "song" }, { id: "campkit", in: { fiber: 4, stick: 4, fur: 1 }, idea: "leanto" },
    { id: "parts", in: { metal: 1, stick: 1 }, idea: "smelt" }, { id: "thunderpot", in: { pot: 1, flint: 2 }, idea: "kiln" }
  ];
  (function recipes() {
    var S0 = Sv(); if (!S0 || !S0.EXTRA) return;
    RECIPES.forEach(function (rc) {
      if (!K[rc.id] || S0.EXTRA.some(function (r) { return r.id === rc.id; })) return;
      var hint = []; for (var k in rc.in) hint.push(rc.in[k] + " " + label(k));
      S0.EXTRA.push({ id: rc.id, name: K[rc.id].label, icon: K[rc.id].emoji, in: rc.in, out: rc.id, idea: rc.idea, hint: hint.join(", ") });
    });
  })();

  /* ---------------- more furniture ---------------- */
  var FUR2 = [
    { id: "jar", icon: "🏺", name: "a savings jar", cost: { clay: 2 }, c: 1, perk: "put shells by. every smol you play shares it, and shops take what you owe from it." },
    { id: "crate", icon: "📦", name: "a trade crate", cost: { stick: 4, fiber: 1 }, c: 1, perk: "fill it by day: the tribe's traders buy the lot overnight." },
    { id: "crate2", icon: "📦", name: "a second crate", cost: { stick: 6, fiber: 2 }, c: 0, perk: "six more slots to sell from.", needs: function (game) { return st(game).fur.crate ? "" : "that comes after the first crate"; } },
    { id: "pegrack", icon: "🧥", name: "a peg rack", cost: { stick: 3 }, c: 1, perk: "pegs for cloaks and tools: four more chest slots." },
    { id: "doorbar", icon: "🔒", name: "a door bar", cost: { stick: 2, metal: 1 }, c: 1, perk: "the door shuts properly: the safe ring is wider." },
    { id: "tiles", icon: "🟧", name: "painted tiles", cost: { clay: 3, berry: 1 }, c: 2, perk: "kiln-fired, berry-painted. very smart." },
    { id: "thinkstone", icon: "🔮", name: "a thinking crystal", cost: { crystal: 1 }, c: 1, perk: "sleep beside it and wake a little closer to an idea." },
    { id: "heartlamp", icon: "💗", name: "a heart lantern", cost: { mote: 1, clay: 1 }, c: 1, perk: "its glow mends you slowly while you are at home." },
    { id: "helper", icon: "🧱", name: "a clay helper", cost: { clay: 6, crystal: 1 }, c: 1, perk: "a little clay somebody that sweeps, hauls the yard's pickings in and rests by the crystal." },
    { id: "plaque", icon: "🏅", name: "a master's plaque", cost: { plank: 2 }, c: 3, perk: "only a master of a trade may hang one.", needs: function (game) { return st(game).master ? "" : "one of your smols has to be a master of a trade first"; } }
  ];
  FUR2.forEach(function (f) { if (!T.FBY[f.id] && (function () { for (var k in f.cost) if (!K[k]) return false; return true; })()) { T.FURNITURE.push(f); T.FBY[f.id] = f; } });
  T.ROOMS.lodge = 36;
  var room0 = T.room;
  T.room = function (game) { var n = room0(game); if (!n) return n; var s = st(game), a = 0; for (var k in s.addon) a++; return n + 2 * a; };
  // a plan saved from another island makes the same pieces cost half
  function withPlan(game, id, fn) {
    var f = T.FBY[id], s = st(game);
    if (!f || !Array.isArray(s.plan) || s.plan.indexOf(id) < 0) return fn();
    var c0 = f.cost, h = {}; for (var k in c0) h[k] = Math.max(1, Math.floor(c0[k] / 2));
    f.cost = h; try { return fn(); } finally { f.cost = c0; }
  }
  var why0 = T.whyNot, make0 = T.make;
  T.whyNot = function (game, c, id) {
    return withPlan(game, id, function () { var w = why0(game, c, id), f = T.FBY[id]; if (f && f.needs && (!w || /^it needs/.test(w))) { var n = f.needs(game, c); if (n) return n; } return w; });
  };
  T.make = function (game, c, id) { var w = T.whyNot(game, c, id); if (w) return no(w); return withPlan(game, id, function () { return make0(game, c, id); }); };
  var planMem = null;
  T.savePlan = function (game) {
    var s = st(game), ids = []; for (var k in s.fur) if (s.fur[k] && T.FBY[k]) ids.push(k);
    if (!ids.length) return no("nothing to copy down yet");
    planMem = ids.slice();
    try { if (typeof localStorage !== "undefined") localStorage.setItem("sb_townplan", JSON.stringify(ids)); } catch (e) {}
    return ok("📐 your home's plan is copied down: " + ids.length + " things. on another island, use it and the same things cost half");
  };
  T.savedPlan = function () {
    var ids = planMem;
    try { if (!ids && typeof localStorage !== "undefined") ids = JSON.parse(localStorage.getItem("sb_townplan") || "null"); } catch (e) {}
    return Array.isArray(ids) ? ids.filter(function (k) { return typeof k === "string" && T.FBY[k]; }) : null;
  };
  T.usePlan = function (game) {
    var ids = T.savedPlan(); if (!ids || !ids.length) return no("no plan saved yet");
    if (!home(game)) return no("you have no home yet");
    st(game).plan = ids;
    return ok("📐 building to your old plan: " + ids.length + " things cost half here");
  };

  /* ---------------- money ---------------- */
  T.purse = function (c) { return r2((c && c.purse) || 0); };
  T.jar = function (game) { return r2(num(st(game), "jar")); };
  T.funds = function (game, c) { return r2(T.purse(c) + (st(game).fur.jar ? T.jar(game) : 0)); };
  T.spend = function (game, c, n) {
    n = r2(n); if (T.funds(game, c) < n) return false;
    var p = T.purse(c), a = Math.min(p, n); c.purse = r2(p - a);
    if (n > a) st(game).jar = r2(T.jar(game) - (n - a));
    return true;
  };
  T.earn = function (c, n) { c.purse = r2((c.purse || 0) + n); };
  function short(game, c, n) { return "not enough " + (SB.Loot && SB.Loot.moneyWord ? SB.Loot.moneyWord(game) : "shells") + ": it's " + n + ", you have " + T.funds(game, c); }
  T.bank = function (game, c, how) {
    if (!T.has(game, "jar") || !H().at(game, c)) return no("the savings jar is at home");
    var s = st(game), p = T.purse(c), j = T.jar(game);
    if (how === "in") { if (p <= 0) return no("your purse is empty"); s.jar = r2(j + p); c.purse = 0; return ok("🏺 " + p + " " + mi(game) + " in the jar (" + s.jar + "). every smol you play shares it"); }
    var n = Math.min(j, 5); if (n <= 0) return no("the jar is empty");
    s.jar = r2(j - n); T.earn(c, n);
    return ok("🏺 took out " + n + " " + mi(game));
  };
  T.collect = function (game, c) {
    var s = st(game), n = r2(num(s, "tithe"));
    if (n <= 0) return no("the council has nothing put by for you yet");
    s.tithe = 0; T.earn(c, n);
    emit("townTithe", { c: c, n: n });
    return ok("🏛 the council's tithe to the sky: " + n + " " + mi(game));
  };

  /* ---------------- shops ---------------- */
  // [kind, how many, price, stock a day, stars needed, when]
  T.SHOPS = {
    smith: { icon: "⚒", items: [["club", 1, 2, 2], ["spear", 1, 4, 2], ["stoneaxe", 1, 3, 2], ["axe", 1, 6, 1, 1], ["parts", 1, 3, 3], ["sword", 1, 12, 1, 3]], serv: ["reforge"] },
    baker: { icon: "🥖", items: [["bread", 1, 2, 4], ["cooked", 1, 1.5, 3], ["sorbet", 1, 2, 3, 0, "summer"], ["feastcake", 1, 4, 2, 0, "market"]] },
    fisher: { icon: "🐟", items: [["rod", 1, 4, 1], ["bait", 3, 1.5, 3], ["fish", 1, 1.2, 4], ["lure", 1, 2, 1, 1]] },
    farmer: { icon: "🌾", items: [["seed", 3, 1.5, 4], ["carrot", 2, 1, 3, 0, "notwinter"], ["grain", 2, 1.2, 3], ["compost", 2, 1.5, 2, 1]], seeds: 1 },
    potter: { icon: "🏺", items: [["pot", 1, 3, 2], ["clay", 3, 1.5, 3], ["basket", 1, 4, 1, 1]] },
    trader: { icon: "🏪", items: [["torch", 1, 2, 3], ["vine", 2, 1, 3], ["fiber", 3, 1, 3], ["basket", 1, 4, 1], ["campkit", 1, 8, 1, 1]] },
    builder: { icon: "🛠", items: [["plank", 2, 1.5, 4], ["stick", 4, 1, 5], ["stone", 4, 1.2, 5]] },
    scribe: { icon: "📜", items: [], serv: ["tablet", "degree"] },
    teacher: { icon: "🏫", items: [], serv: ["lesson", "degree"] },
    healer: { icon: "🌿", items: [["herb", 2, 1.5, 4], ["potion", 1, 4, 2, 1]], serv: ["bless", "longrest", "charmluck", "charmtongue"] },
    innkeeper: { icon: "🏨", items: [["cooked", 1, 1.5, 4], ["bread", 1, 2, 2]], serv: ["song", "crier"] },
    guard: { icon: "🛡", items: [], serv: ["hire"], medals: 1 }
  };
  T.MEDALS = [["torch", 2, 1], ["spear", 1, 2], ["thunderpot", 1, 2], ["shield", 1, 3]];
  var HERMIT = [[["glowcap", 2, 1.5, 3], ["flint", 2, 1.5, 3], ["crystal", 1, 4, 1]], [["ore", 2, 2, 3], ["torch", 1, 2, 2], ["potion", 1, 4, 1]], [["shroom", 2, 1, 3], ["ironore", 1, 3, 2], ["crystal", 1, 4, 2]], [["glowcap", 2, 1.5, 2], ["metal", 1, 3, 2], ["heartfruit", 1, 8, 1]]];
  T.CALLERS = {
    raft: { name: "a raft trader", icon: "⛵", shore: 1, purse: 20, items: [["metal", 1, 3, 3], ["crystal", 1, 5, 2], ["plank", 2, 1.5, 4], ["cloak", 1, 5, 1], ["pearl", 1, 6, 1]], swaps: [["fur", 2, "metal", 1], ["honey", 2, "crystal", 1]] },
    caravan: { name: "a caravan from over the hills", icon: "🧺", purse: 30, items: [["fur", 1, 2, 4], ["pot", 1, 3, 2], ["honey", 1, 2, 3], ["cloak", 1, 5, 1], ["iron", 1, 6, 1]], serv: ["send", "gift"], far: 1 },
    sand: { name: "a sand trader", icon: "🌵", purse: 15, items: [["pricklypear", 2, 1.5, 4], ["seed", 3, 2, 3], ["glowcap", 1, 2, 2]], swaps: [["berry", 4, "pricklypear", 2], ["stone", 4, "clay", 3], ["stick", 6, "plank", 2]], far: 1 },
    cart: { name: "the travelling cart", icon: "🛒", purse: 25, items: [["heartfruit", 1, 9, 1], ["mote", 1, 3, 2], ["potion", 1, 4, 2], ["iron", 1, 6, 1], ["campkit", 1, 7, 1]], serv: ["pattern"], seeds: 2 },
    book: { name: "a wandering scribe", icon: "📜", purse: 10, items: [], serv: ["tablet", "tabletswap"] },
    dyer: { name: "a dyer", icon: "🎨", purse: 10, items: [["feastcake", 1, 3, 2], ["sorbet", 1, 2, 2]], serv: ["dye", "groom"] },
    tinker: { name: "a tinker", icon: "⚙", purse: 20, items: [["parts", 1, 3, 4], ["thunderpot", 1, 4, 2], ["lens", 1, 6, 1], ["crystal", 1, 5, 2], ["torch", 1, 2, 3]] },
    ark: { name: "an elder from the ark", icon: "🗿", purse: 0, items: [], serv: ["tribute"] },
    grump: { name: "a lone grump with a sack", icon: "🌘", night: 1, purse: 12, items: [["fur", 1, 1.5, 3], ["club", 1, 2, 1], ["crystal", 1, 4, 2], ["heartfruit", 1, 7, 1]], swaps: [["mote", 1, "crystal", 2], ["mote", 2, "heartfruit", 1]], serv: ["barter"] },
    hermit: { name: "the cave hermit", icon: "🕯", perm: 1, purse: 15, moon: HERMIT }
  };
  var POST_SHOP = { baker: "baker", smith: "smith", healer: "healer", watch: "guard" };
  function shopOf(game, o) {
    var b = T.postOf(game, o);
    if (b && b.done && !T.worn(b)) {
      if (b.kind === "library") return "scribe"; if (b.kind === "storehouse" || b.kind === "shop") return "trader"; if (b.kind === "inn") return "innkeeper";
      if (POST_SHOP[o.postJob]) return POST_SHOP[o.postJob];
    }
    return o.job && T.SHOPS[o.job] ? o.job : null;
  }
  T.shopOf = shopOf;
  // who would trade with you from where you stand, nearest first
  T.vendors = function (game, c) {
    var out = [];
    game.creatures.forEach(function (o) {
      if (!isSmol(o) || o === c) return;
      var d = SB.dist(o.x, o.z, c.x, c.z); if (d > 7) return;
      var t = shopOf(game, o); if (t) out.push({ key: "v" + o.id, t: t, who: o, name: o.name + " the " + t, icon: T.SHOPS[t].icon, d: d });
    });
    st(game).callers.forEach(function (cl) {
      var b = SB.World.structById(game.world, cl.id); if (!b || !T.CALLERS[cl.t]) return;
      var d = SB.dist(b.x, b.z, c.x, c.z); if (d <= 7) out.push({ key: "c" + cl.t, t: cl.t, caller: cl, st: b, name: T.CALLERS[cl.t].name, icon: T.CALLERS[cl.t].icon, d: d });
    });
    return out.sort(function (a, z) { return a.d - z.d; }).slice(0, 3);
  };
  function table(v) { return T.SHOPS[v.t] || T.CALLERS[v.t] || { items: [] }; }
  function marketDay(game) { return (day(game) - 1) % 2 === 0 || !!(game.econ && game.econ.marketDay); }
  function condOk(game, cnd) { var se = game.world.season; return !cnd || (cnd === "summer" ? se === 1 : cnd === "notwinter" ? se !== 3 : cnd === "market" ? marketDay(game) : true); }
  function seedItems(game, n) {
    var Hv = SB.Harvest, out = [], se = game.world.season, all = !!st(game).order.seeds;
    if (!Hv || !Hv.CROPS) return out;
    Hv.CROPS.forEach(function (cr) { if (K[cr.seed] && (all || n === 2 ? true : cr.s.indexOf(se) >= 0) && (n !== 2 || cr.found)) out.push([cr.seed, 2, n === 2 ? 3 : 1.5, 2]); });
    return out.slice(0, n === 2 ? 3 : 6);
  }
  function shopDay(game, v) { var s = st(game), sh = s.shops[v.key], dn = day(game); if (!sh || sh.d !== dn) sh = s.shops[v.key] = { d: dn, left: {} }; return sh; }
  T.stock = function (game, v) {
    var tb = table(v), s = st(game), sh = shopDay(game, v), out = [];
    var items = (tb.moon ? tb.moon[Math.floor(day(game) / 2) % tb.moon.length] : tb.items || []).slice();
    if (tb.seeds) items = items.concat(seedItems(game, tb.seeds));
    var more = v.who ? Math.min(3, Math.floor(num(s, "guild") / 5)) : 0;
    items.forEach(function (it) {
      if (!K[it[0]] || !condOk(game, it[5])) return;
      var max = it[3] + more, left = sh.left[it[0]] == null ? max : sh.left[it[0]];
      out.push({ k: it[0], n: it[1], base: it[2], max: max, left: left, stars: it[4] || 0 });
    });
    return out;
  };
  T.stars = function (game, key) { return Math.min(3, Math.floor((st(game).loyal[key] || 0) / 3)); };
  T.discount = function (game, c, v) {
    var s = st(game), sh = shopDay(game, v), d = 0.05 * T.stars(game, v.key) + Math.min(0.1, 0.05 * num(s, "favor")) + (sh.hag || 0);
    if (T.perk(c, "deal")) d += 0.1;
    if (table(v).far) d += Math.min(0.15, 0.05 * num(s, "goodwill"));
    return Math.max(-0.1, Math.min(0.5, d));
  };
  T.priceOf = function (game, c, v, it) {
    var idx = game.econ && game.econ.index > 0 ? SB.clamp(game.econ.index, 0.5, 3) : 1;
    return Math.max(0.1, r2(it.base * idx * (1 + 0.06 * (it.max - it.left)) * (1 - T.discount(game, c, v))));
  };
  T.openWhy = function (game, v) {
    if (v.t === "hermit" && SB.Game.cultureKnows && SB.Ideas && SB.Ideas.BY_ID && SB.Ideas.BY_ID.writing && !SB.Game.cultureKnows(game, "writing")) return "the hermit only points at old carvings. the tribe has to learn writing first";
    if (v.caller) return "";
    if (game.world.night || v.who.asleep) return "shut for the night: back at dawn";
    if (day(game) % 7 === 0) return "rest day: no trading today";
    return "";
  };
  function payVendor(v, n) { if (v.who) v.who.purse = r2((v.who.purse || 0) + n); else v.caller.purse = r2((v.caller.purse || 0) + n); }
  T.buyAt = function (game, c, v, k) {
    var why = T.openWhy(game, v); if (why) return no(why);
    var it = null; T.stock(game, v).forEach(function (x) { if (x.k === k) it = x; });
    if (!it) return no("they don't sell that today");
    if (it.left <= 0) return no("sold out. more tomorrow");
    if (T.stars(game, v.key) < it.stars) return no("they keep that for regulars: trade here a few more times");
    var price = T.priceOf(game, c, v, it);
    if (T.funds(game, c) < price) return no(short(game, c, price));
    if (Sv().whyNot && Sv().whyNot(c, k)) return no(Sv().whyNot(c, k));
    var left = Sv().add(c, k, it.n);
    if (left === it.n) return no("your bag is full");
    if (left > 0 && Sv().spawn) Sv().spawn(game, k, left, c.x + 0.6, c.z + 0.4);
    T.spend(game, c, price); payVendor(v, price);
    var s = st(game); shopDay(game, v).left[k] = it.left - 1; s.loyal[v.key] = (s.loyal[v.key] || 0) + 1;
    if (v.who && SB.Social && SB.Social.remember) { try { SB.Social.remember(game, v.who, c, "trade", 2, "a fair deal", 3600, 12); } catch (e) {} }
    xp(c, "trader", 0.2);
    emit("townBought", { c: c, v: v, kind: k, price: price });
    return ok(v.icon + " bought " + it.n + " " + label(k) + " for " + price + " " + mi(game));
  };
  var ARTISAN = { bread: 1, cooked: 1, pot: 1, basket: 1, cloak: 1, torch: 1, plank: 1, iron: 1, jam: 1, pickles: 1, jerky: 1, smokedfish: 1, driedfruit: 1, fizz: 1, sorbet: 1, feastcake: 1, doll: 1, top: 1, kite: 1, drum: 1, flute: 1, potion: 1, parts: 1, thunderpot: 1, campkit: 1, flour: 1 };
  // made things are worth more than found things; a fine tool more than a botched one
  T.valueK = function (k, sl) {
    var d = K[k] || {}, m = ARTISAN[k] || d.tool ? 1.4 : 1;
    if (sl && d.tool && SB.Fight && SB.Fight.qualOf) m *= [0.7, 1, 1.3, 1.7][SB.Fight.qualOf(sl)] || 1;
    if (sl && sl.q > 0) m *= 1 + 0.25 * Math.min(3, sl.q);
    return m;
  };
  T.worth = function (game, k, sl) { var L = SB.Loot, base = L && L.sellPrice ? L.sellPrice(game, k) : 0.3; return r2(base * T.valueK(k, sl)); };
  T.sellTo = function (game, c, v, i) {
    var why = T.openWhy(game, v); if (why) return no(why);
    var inv = Sv().inv(c), sl = inv.s[i], s = st(game);
    if (!sl || sl.k === "plans") return no("nothing to sell");
    var each = T.worth(game, sl.k, sl); if (each <= 0) return no("nobody wants that");
    var purse = v.who ? T.purse(v.who) : r2(v.caller.purse || 0), n = sl.n, coins = !v.who || !!(game.econ && game.econ.coins);
    if (coins && purse < each * n) n = Math.floor(purse / each + 1e-9);
    if (n <= 0) return no((v.who ? v.who.name : "the trader") + " can't afford it: only " + purse + " " + mi(game) + " in their purse");
    var got = r2(each * n), rec = { k: sl.k, n: n, pay: got, d: day(game) };
    if (sl.w != null) rec.w = sl.w;
    if (coins) { if (v.who) v.who.purse = r2(purse - got); else v.caller.purse = r2(purse - got); }
    T.earn(c, got);
    if (n >= sl.n) inv.s[i] = null; else sl.n -= n;
    s.back.unshift(rec); if (s.back.length > 3) s.back.length = 3;
    xp(c, "trader", 0.2);
    emit("soldByHand", { c: c, kind: rec.k, n: n, pay: got, to: v.who || null });
    return ok("sold " + n + " " + label(rec.k) + " for " + got + " " + mi(game) + (inv.s[i] === sl ? ". that's all they can afford" : ""));
  };
  T.buyBack = function (game, c, j) {
    var s = st(game), rec = s.back[j];
    if (!rec || rec.d !== day(game)) return no("too late: it's been sold on");
    if (T.funds(game, c) < rec.pay) return no(short(game, c, rec.pay));
    var left = Sv().add(c, rec.k, rec.n, rec.w);
    if (left === rec.n) return no("your bag is full");
    if (left > 0 && Sv().spawn) Sv().spawn(game, rec.k, left, c.x + 0.6, c.z + 0.4);
    T.spend(game, c, rec.pay); s.back.splice(j, 1);
    return ok("bought back " + rec.n + " " + label(rec.k) + " for " + rec.pay + " " + mi(game));
  };
  T.haggle = function (game, c, v) {
    var why = T.openWhy(game, v); if (why) return no(why);
    var s = st(game), sh = shopDay(game, v);
    if (sh.tried) return no("you've had your haggle with them today");
    sh.tried = 1;
    var chance = 0.4 + Math.min(0.3, (((c.jobXp && c.jobXp.trader) || 0) * 0.02)) + (s.charm.tongue ? 0.3 : 0);
    var win = dice(game, "hag" + v.key + ":" + day(game))() < chance;
    sh.hag = win ? 0.15 : -0.05;
    xp(c, "trader", 0.3);
    emit("townHaggle", { c: c, v: v, win: win });
    return { ok: win, msg: win ? "🤝 they knock a bit off everything for today" : "😤 no deal. their prices just went up a little" };
  };
  T.swap = function (game, c, v, j) {
    var sw = (table(v).swaps || [])[j]; if (!sw || !K[sw[0]] || !K[sw[2]]) return no("no such swap");
    if (Sv().count(c, sw[0]) < sw[1]) return no("that swap takes " + sw[1] + " " + label(sw[0]));
    Sv().take(c, sw[0], sw[1]);
    var left = Sv().add(c, sw[2], sw[3]); if (left > 0 && Sv().spawn) Sv().spawn(game, sw[2], left, c.x + 0.6, c.z + 0.4);
    emit("townSwap", { c: c, v: v, give: sw[0], get: sw[2] });
    return ok("🔁 " + sw[1] + " " + label(sw[0]) + " for " + sw[3] + " " + label(sw[2]));
  };
  T.medalBuy = function (game, c, k) {
    var s = st(game), it = null; T.MEDALS.forEach(function (x) { if (x[0] === k) it = x; });
    if (!it || !K[k]) return no("they don't have that");
    if (num(s, "medals") < it[2]) return no("that's " + it[2] + " 🎖. you have " + num(s, "medals") + ": help see off a war party");
    var left = Sv().add(c, k, it[1]); if (left === it[1]) return no("your bag is full");
    s.medals -= it[2];
    return ok("🎖 " + it[1] + " " + label(k) + " from the watch");
  };
  /* what a keeper will do for you, for shells */
  var SERV = {
    reforge: {
      name: function (game, c) { var sl = heldTool(c); return "⚒ re-work your " + (sl ? label(sl.k) : "tool"); },
      why: function (game, c) { var sl = heldTool(c); if (!sl) return "hold the tool you want re-worked"; return SB.Fight && SB.Fight.qualOf && SB.Fight.qualOf(sl) >= 3 ? "that one is as fine as a tool gets" : !SB.Fight && sl.rw ? "it's been re-worked already" : ""; },
      price: function (game, c, v) { var sl = heldTool(c), q = sl && SB.Fight && SB.Fight.qualOf ? SB.Fight.qualOf(sl) : 1; return r2((2 + (sl ? T.worth(game, sl.k) : 1)) * (q + 1) * 0.5 * (1 + (v.who ? (v.who.chem.anger || 0) * 0.5 : 0))); },
      go: function (game, c) {
        var sl = heldTool(c), F = SB.Fight;
        if (F && F.qualOf && F.wearFor) { var q = Math.min(3, F.qualOf(sl) + 1); sl.w = F.wearFor(sl.k, q); return "⚒ re-worked: a " + (F.QUAL && F.QUAL[q] ? F.QUAL[q].id + " " : "") + label(sl.k) + " now"; }
        sl.w = Math.round(Sv().uses(sl.k) * 1.3); sl.rw = 1; return "⚒ re-worked: your " + label(sl.k) + " will last longer";
      }
    },
    tablet: {
      name: function () { return "📜 buy a tablet (learn something the tribe knows)"; },
      why: function (game, c) { return U.ideaFor(game, c) ? "" : "nothing on these tablets you don't already know"; },
      price: function () { return 3; },
      go: function (game, c) { var d = U.ideaFor(game, c); if (!c.ideas) c.ideas = {}; try { SB.Ideas.learn(c, d.id, 5, game, "read on a bought tablet"); } catch (e) {} if (!(c.ideas[d.id] >= 1)) c.ideas[d.id] = 1; return "📜 you read it twice and learned " + d.name; }
    },
    tabletswap: {
      name: function () { return "📜 swap a pot, basket or cloak for a tablet"; },
      why: function (game, c) { return !U.ideaFor(game, c) ? "nothing on these tablets you don't already know" : ["pot", "basket", "cloak"].some(function (k) { return Sv().count(c, k, true) > 0; }) ? "" : "the scribe swaps tablets for a pot, a basket or a cloak"; },
      price: function () { return 0; },
      go: function (game, c) { var k = ["pot", "basket", "cloak"].filter(function (x) { return Sv().count(c, x, true) > 0; })[0]; Sv().take(c, k, 1); return SERV.tablet.go(game, c); }
    },
    degree: {
      name: function (game, c) { return "🎓 study " + (T.trade(c) || "a trade") + " properly"; },
      why: function (game, c) { return c.degree ? c.name + " has studied already" : !T.trade(c) ? "work a shift somewhere first, so you know what to study" : ""; },
      price: function () { return 4; },
      go: function (game, c) { var j = T.trade(c); xp(c, j, 3); c.degree = j; return "🎓 a week of tablets in an afternoon: +3 " + j + " know-how"; }
    },
    lesson: {
      name: function (game, c) { return "🏫 a lesson in " + (T.trade(c) || "something"); }, why: function (game, c) { return T.trade(c) ? "" : "work a shift somewhere first"; }, price: function () { return 2; },
      go: function (game, c) { var j = T.trade(c); xp(c, j, 1); return "🏫 +1 " + j + " know-how"; }
    },
    bless: {
      name: function () { return "🌿 a blessing for the day"; }, why: function (game, c) { return c.blessT > game.time ? "you are blessed already" : ""; }, price: function () { return 3; },
      go: function (game, c) { c.blessT = game.time + SB.DAY_LENGTH; c.chem.fear = lower(c.chem.fear, 0.4); return "🌿 herbs behind your ear: for a day you mend as you walk, and little frightens you"; }
    },
    longrest: {
      name: function () { return "🛌 the long rest (mends every cut and bruise)"; },
      why: function (game, c) { var b = c.body; return (b && b.wounds && b.wounds.length) || c.chem.health < 0.99 || c.chem.sick > 0.05 ? "" : "nothing to mend"; }, price: function () { return 5; },
      go: function (game, c) { var n = SB.Body && SB.Body.heal ? SB.Body.heal(c) : 0; c.chem.health = 1; c.chem.sick = 0; c.chem.pain = 0; return "🛌 a long sleep under warm moss: " + (n ? n + " hurts gone, and " : "") + "good as new"; }
    },
    charmluck: {
      name: function () { return "🍀 a lucky shell charm (grumps drop twice the shells)"; }, why: function (game) { return st(game).charm.luck ? "you have one" : ""; }, price: function () { return 8; },
      go: function (game) { st(game).charm.luck = 1; return "🍀 it jingles. grumps you chase off drop twice the shells"; }
    },
    charmtongue: {
      name: function () { return "🪨 a smooth pebble (haggling goes your way more often)"; }, why: function (game) { return st(game).charm.tongue ? "you have one" : ""; }, price: function () { return 8; },
      go: function (game) { st(game).charm.tongue = 1; return "🪨 you roll it in your paw while you haggle. it works"; }
    },
    song: {
      name: function () { return "🎶 a seat at the song night"; }, why: function (game, c) { return c.work && c.work.song === day(game) ? "the singers have gone home. tomorrow" : ""; }, price: function () { return 1; },
      go: function (game, c) { c.chem.bored = lower(c.chem.bored, 0.6); c.chem.lonely = lower(c.chem.lonely, 0.6); todayOf(game, c).song = day(game); T.played(game, c, "song"); emit("townSong", { c: c }); return "🎶 a full room and a chorus you half know. lovely"; }
    },
    crier: {
      name: function () { return "📣 send the crier round (more visitors and buyers tomorrow)"; }, why: function (game) { return st(game).advert > day(game) ? "the crier is already out" : ""; }, price: function () { return 2; },
      go: function (game) { st(game).advert = day(game) + 1; return "📣 the crier is off with a drum. tomorrow: a trader, more visitors, more buyers at your stall"; }
    },
    hire: {
      name: function (game, c, v) { return "🛡 hire " + v.who.name + " to walk with you for a day"; }, why: function (game, c, v) { return v.who.hireT > game.time ? v.who.name + " is hired already" : ""; }, price: function () { return 3; },
      go: function (game, c, v) { v.who.hireBy = c.id; v.who.hireT = game.time + SB.DAY_LENGTH; if (SB.Social && SB.Social.log) SB.Social.log(game, v.who, "🛡", "was hired by " + c.name + " for a day"); emit("townHired", { c: c, who: v.who }); return "🛡 " + v.who.name + " walks with you till this time tomorrow: braver whacks while they're near"; }
    },
    send: {
      name: function (game, c) { var i = heldSlot(c), sl = i >= 0 ? Sv().inv(c).s[i] : null; return "🧺 send your " + (sl ? label(sl.k) : "goods") + " to their village (full price, paid tomorrow)"; },
      why: function (game, c) { var i = heldSlot(c), sl = i >= 0 ? Sv().inv(c).s[i] : null; return !sl || sl.k === "plans" ? "hold what you want sent" : T.worth(game, sl.k, sl) <= 0 ? "nobody there wants that" : ""; }, price: function () { return 0; },
      go: function (game, c) { var v = Sv().inv(c), sl = v.s[v.sel], got = r2(T.worth(game, sl.k, sl) / 0.6 * sl.n), s = st(game); v.s[v.sel] = null; s.sent = r2(num(s, "sent") + got); return "🧺 off it goes on the caravan. " + got + " " + mi(game) + " comes back tomorrow morning"; }
    },
    gift: {
      name: function (game, c) { var i = heldSlot(c), sl = i >= 0 ? Sv().inv(c).s[i] : null; return "🎁 give them your " + (sl ? label(sl.k) : "…") + " for their tribe"; },
      why: function (game, c) { var i = heldSlot(c); return i < 0 || Sv().inv(c).s[i].k === "plans" ? "hold a gift" : ""; }, price: function () { return 0; },
      go: function (game, c) { var v = Sv().inv(c), sl = v.s[v.sel], s = st(game); sl.n--; if (sl.n <= 0) v.s[v.sel] = null; s.goodwill = num(s, "goodwill") + 1; return "🎁 a gift for the tribe over the hills. they'll remember: better prices from far traders"; }
    },
    pattern: {
      name: function () { return "📖 a pattern book (one matching set for your home, free)"; }, why: function (game) { return st(game).pattern ? "you have one" : ""; }, price: function () { return 6; },
      go: function (game) { var ks = Object.keys(T.THEMES), t = ks[Math.floor(dice(game, "pattern")() * ks.length)]; st(game).pattern = t; return "📖 the " + t + " pattern book: those walls, floors and roofs now cost you nothing"; }
    },
    dye: {
      name: function () { return "🎨 dye your fur (the next colour along)"; }, why: function (game, c) { return c.look ? "" : "no fur to dye"; }, price: function () { return 1; },
      go: function (game, c) { var i = 0; T.DYES.forEach(function (d, n) { if (d.hue === c.dye) i = n + 1; }); var d = T.DYES[i % T.DYES.length]; c.dye = d.hue; c.look.hue = d.hue; emit("townDyed", { c: c, hue: d.hue }); return d.icon + " " + c.name + " is " + d.name + " now"; }
    },
    groom: { name: function () { return "🫧 a wash and a brush"; }, why: function () { return ""; }, price: function () { return 1; }, go: function (game, c) { return freshen(game, c, "🫧 washed, brushed and fluffed"); } },
    tribute: {
      name: function () { return "🗿 give copper to the ark (2 ✨ each)"; }, why: function (game, c) { return Sv().count(c, "metal") > 0 ? "" : "the elder collects copper"; }, price: function () { return 0; },
      go: function (game, c) { Sv().take(c, "metal", 1); if (SB.Game.addSparks) SB.Game.addSparks(game, 2, c); st(game).renownX = num(st(game), "renownX") + 1; return "🗿 the elder nods and takes the copper. the ark will speak well of this island: +2 ✨"; }
    },
    barter: { name: function () { return "🌘 hand over a copper and see what you get"; }, why: function (game, c) { return Sv().count(c, "metal") > 0 ? "" : "the grump wants copper"; }, price: function () { return 0; }, go: function (game, c) { return T.grumpBarter(game, c).msg; } }
  };
  function heldTool(c) { var v = Sv().inv(c), sl = v.s[v.sel]; return sl && K[sl.k] && K[sl.k].tool && sl.w != null ? sl : null; }
  T.services = function (game, c, v) {
    return (table(v).serv || []).map(function (id) { var sv = SERV[id]; return { id: id, name: sv.name(game, c, v), why: sv.why(game, c, v), price: r2(sv.price(game, c, v) * (1 - Math.max(0, T.discount(game, c, v)))) }; });
  };
  T.service = function (game, c, v, id) {
    var sv = SERV[id]; if (!sv || (table(v).serv || []).indexOf(id) < 0) return no("they don't do that");
    var why = T.openWhy(game, v) || sv.why(game, c, v); if (why) return no(why);
    var price = r2(sv.price(game, c, v) * (1 - Math.max(0, T.discount(game, c, v))));
    if (price > 0 && T.funds(game, c) < price) return no(short(game, c, price));
    if (price > 0) { T.spend(game, c, price); payVendor(v, price); }
    var msg = sv.go(game, c, v), s = st(game);
    s.loyal[v.key] = (s.loyal[v.key] || 0) + 1;
    emit("townService", { c: c, v: v, id: id, price: price });
    return ok(msg + (price > 0 ? " (" + price + " " + mi(game) + ")" : ""));
  };
  var BARTER = ["fur", "flint", "crystal", "club", "cooked", "mote", "stone", "glowcap"];
  // a copper for whatever the grumps feel like handing back
  T.grumpBarter = function (game, c) {
    if (Sv().count(c, "metal") < 1) return no("the grumps want copper");
    var s = st(game); s.barters = num(s, "barters") + 1;
    var pool = BARTER.filter(function (k) { return K[k]; }), k = pool[Math.floor(dice(game, "barter" + s.barters)() * pool.length)], n = k === "stone" || k === "flint" ? 3 : 1;
    Sv().take(c, "metal", 1);
    var left = Sv().add(c, k, n); if (left > 0 && Sv().spawn) Sv().spawn(game, k, left, c.x + 0.6, c.z + 0.4);
    emit("townBarter", { c: c, kind: k });
    return ok("🌘 the copper vanishes into the sack. out comes… " + n + " " + label(k));
  };
  T.campSiteNear = function (game, c) { var out = null; (game.sites || []).forEach(function (sx) { if (sx.kind === "camp" && !sx.done && !sx.gone && SB.dist(sx.x, sx.z, c.x, c.z) < 10) out = sx; }); return out; };
  // a smol's own stall: pay to grow its stock, and it sells to you cheaper ever after
  T.invest = function (game, c, b) {
    if (!b || b.kind !== "stall" || !b.done || !b.data || !b.data.good) return no("that takes a working market stall");
    if (SB.dist(c.x, c.z, b.x, b.z) > 6) return no("get closer");
    if (T.funds(game, c) < 5) return no(short(game, c, 5));
    T.spend(game, c, 5);
    var owner = SB.Game.byId(game, b.data.owner); if (owner) owner.purse = r2((owner.purse || 0) + 5);
    b.data.stock = (b.data.stock || 0) + 4; b.data.inv = (b.data.inv || 0) + 1;
    emit("townInvest", { c: c, st: b });
    return ok("🤝 5 " + mi(game) + " into the stall: four more on the counter now, and a fifth off whatever you buy here");
  };
  T.sellPet = function (game, c, rec, v) {
    var A = SB.Animals; if (!A || !rec || !v) return no("nobody here buys animals");
    var price = r2(2 + 6 * Math.max(0, Math.min(1, rec.bond || rec.tr || 0)));
    try { A.release(game, rec); } catch (e) { return no("it won't go"); }
    T.earn(c, price);
    emit("townPetSold", { c: c, price: price });
    return ok("🐾 sold for " + price + " " + mi(game) + ". the better it trusted you, the better the price");
  };

  /* ---------------- traders who come by ---------------- */
  T.renown = function (game) { var s = st(game); return num(s, "hosted") + num(s, "renownX") + Math.floor((T.keeps(game).length + T.trophies(game).length) / 3); };
  T.callTrader = function (game, t, at) {
    var def = T.CALLERS[t], s = st(game); if (!def || !SK.tradecamp) return null;
    if (s.callers.some(function (cl) { return cl.t === t; })) return null;
    var c0 = at || centre(game), p = spot(game, c0.x, c0.z, "call" + t + day(game), at ? 2 : 7, at ? 6 : def.shore ? 60 : 16, !!def.shore);
    if (!p) return null;
    var b = plant(game, "tradecamp", p.x, p.z, { data: { caller: t }, name: def.name });
    var cl = { id: b.id, t: t, until: def.perm ? 1e9 : day(game) + (def.night ? 1 : 2 + (def.far && num(s, "goodwill") >= 2 ? 1 : 0)), purse: def.purse };
    s.callers.push(cl);
    if (!def.perm) s.lastCall = day(game);
    emit("townCaller", { t: t, st: b });
    note(game, def.icon + " " + def.name + " has set up camp" + (def.shore ? " by the shore" : def.night ? " for the night" : def.perm ? "" : " near the village") + ". walk over to trade");
    return b;
  };
  function allBeaten(game) {
    var B = SB.Bosses; if (!B || !B.state) return false;
    var bl; try { bl = B.state(game).list || {}; } catch (e) { return false; }
    var n = 0; for (var id in bl) { if (!bl[id].beaten) return false; n++; }
    return n > 0;
  }
  function callersDawn(game, parts) {
    var s = st(game), dn = day(game), W = SB.World;
    s.callers = s.callers.filter(function (cl) {
      var b = W.structById(game.world, cl.id); if (!b) return false;
      if (dn >= cl.until) { W.removeStructure(game.world, b); dirty(b); return false; }
      return true;
    });
    if (num(s, "sent") > 0) { var c = me() || (SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null); if (s.fur.jar || !c) s.jar = r2(T.jar(game) + s.sent); else T.earn(c, s.sent); parts.push("🧺 the caravan paid " + s.sent + " " + mi(game) + " for what you sent"); s.sent = 0; }
    if (!home(game) && era(game) < 1) return;
    var pool = ["caravan", "cart", "book", "dyer", "tinker", "sand", "raft"].concat(era(game) >= 2 ? ["ark"] : []).filter(function (t) { return !s.callers.some(function (cl) { return cl.t === t; }); });
    var want = null, pick = pool[Math.floor(dice(game, "caller" + dn)() * pool.length)];
    if (s.signal && s.signal < dn) { want = "raft"; s.signal = 0; }
    else if (s.advert === dn) want = pick;
    else if (dn - num(s, "lastCall") >= (T.renown(game) >= 5 ? 2 : 3)) want = pick;
    if (want && s.callers.filter(function (cl) { return !T.CALLERS[cl.t].perm; }).length < 2) T.callTrader(game, want);
    if (!s.callers.some(function (cl) { return cl.t === "hermit"; })) { var cave = null; (game.sites || []).forEach(function (sx) { if (!cave && sx.kind === "cave" && sx.found && !sx.gone) cave = sx; }); if (cave) T.callTrader(game, "hermit", cave); }
  }
  T.signal = function (game, c, b) {
    if (!b || b.kind !== "signalfire" || !T.works(b)) return no("that takes a working signal fire");
    if (SB.dist(c.x, c.z, b.x, b.z) > 5) return no("get closer");
    var s = st(game); if (s.signal) return no("it's burning already. look to the shore tomorrow");
    if (Sv().count(c, "stick") < 2) return no("a signal fire takes 2 sticks");
    Sv().take(c, "stick", 2); s.signal = day(game); b.data.lit = day(game);
    emit("townSignal", { c: c, st: b });
    return ok("🔥 the signal fire is lit. a raft out at sea will see it: look to the shore tomorrow");
  };

  /* ---------------- work: trades, ranks, shifts ---------------- */
  T.WORK = { farm: "farmer", vegplot: "farmer", granary: "farmer", windmill: "farmer", waterwheel: "farmer", pond: "fisher", kiln: "potter", smithy: "smith", workshop: "smith", stall: "trader", shop: "trader", storehouse: "trader", school: "teacher", library: "scribe", hall: "scribe", watchtower: "guard", wall: "guard", watchfire: "guard", healer: "healer", bakery: "baker", inn: "innkeeper", shrine: "keeper", grave: "keeper" };
  T.RANKS = [[0, "helper", ""], [4, "apprentice", ""], [10, "journeyman", "🥉"], [20, "crafter", "🥈"], [35, "master", "🥇"]];
  T.SPECS = [
    { id: "toolmaker", job: "smith", perk: "tool", t: "tools you make last a quarter longer" }, { id: "weaponsmith", job: "smith", perk: "hit", t: "every whack at a grump lands a little harder" },
    { id: "grower", job: "farmer", perk: "yield", t: "something extra from the garden every morning" }, { id: "herder", job: "farmer", perk: "wage", t: "half as much pay again for a shift" },
    { id: "netter", job: "fisher", perk: "yield", t: "a fish in the chest every morning" }, { id: "angler", job: "fisher", perk: "deal", t: "a tenth off at every shop" },
    { id: "carpenter", job: "builder", perk: "tool", t: "tools you make last a quarter longer" }, { id: "mason", job: "builder", perk: "wage", t: "half as much pay again for a shift" },
    { id: "haggler", job: "trader", perk: "deal", t: "a tenth off at every shop" }, { id: "caravaneer", job: "trader", perk: "wage", t: "half as much pay again for a shift" },
    { id: "warden", job: "guard", perk: "hit", t: "every whack at a grump lands a little harder" }, { id: "scout", job: "guard", perk: "wage", t: "half as much pay again for a shift" }
  ];
  T.SPEC_BY = {}; T.SPECS.forEach(function (x) { T.SPEC_BY[x.id] = x; });
  T.specsFor = function (job) {
    var out = T.SPECS.filter(function (x) { return x.job === job; });
    if (!out.length) { ["steady " + job, "canny " + job].forEach(function (id, i) { if (!T.SPEC_BY[id]) T.SPEC_BY[id] = { id: id, job: job, perk: i ? "deal" : "wage", t: i ? "a tenth off at every shop" : "half as much pay again for a shift" }; out.push(T.SPEC_BY[id]); }); }
    return out;
  };
  T.perk = function (c, p) { var sp = c && c.spec ? T.SPEC_BY[c.spec] || (T.specsFor(String(c.spec).replace(/^(steady|canny) /, "")), T.SPEC_BY[c.spec]) : null; return !!sp && sp.perk === p; };
  T.xpOf = function (c, job) { return (c && c.jobXp && c.jobXp[job]) || 0; };
  T.trade = function (c) {
    if (!c) return null; if (c.job) return c.job;
    var j = c.jobXp || {}, best = null, bv = 0; for (var k in j) if (j[k] > bv) { bv = j[k]; best = k; }
    return best;
  };
  T.rankOf = function (c, job) { return (c && c.rank && c.rank[job]) || 0; };
  T.rankName = function (c, job) { return T.RANKS[T.rankOf(c, job)][1]; };
  T.badge = function (c, job) { return T.RANKS[T.rankOf(c, job)][2]; };
  T.friendsOf = function (game, c) {
    var S = SB.Social; if (!S || !S.opinion) return 99;
    var n = 0; game.creatures.forEach(function (o) { if (isSmol(o) && o !== c) { try { if (S.opinion(game, o, c) >= S.FRIEND) n++; } catch (e) {} } });
    return n;
  };
  T.promoteWhy = function (game, c, job) {
    var r = T.rankOf(c, job); if (r >= 4) return "a master already";
    var nx = T.RANKS[r + 1];
    if (T.xpOf(c, job) < nx[0]) return nx[1] + " takes " + nx[0] + " " + job + " know-how (" + T.xpOf(c, job) + " so far)";
    if ((c.chem.anger || 0) > 0.6 || (c.chem.bored || 0) > 0.9) return "nobody promotes a smol in that mood";
    if (r + 1 >= 3 && T.friendsOf(game, c) < r - 1) return nx[1] + " takes " + (r - 1) + " friends to speak up for you";
    return "";
  };
  T.promote = function (game, c, job) {
    var why = T.promoteWhy(game, c, job); if (why) return no(why);
    var r = T.rankOf(c, job) + 1; if (!c.rank || typeof c.rank !== "object") c.rank = {};
    c.rank[job] = r; T.earn(c, 2 * r);
    if (r >= 4) st(game).master = 1;
    if (SB.Social && SB.Social.log) SB.Social.log(game, c, "🎖", "became a " + T.RANKS[r][1] + " " + job);
    emit("townPromoted", { c: c, job: job, rank: r });
    return ok("🎖 " + c.name + " is a " + T.RANKS[r][1] + " " + job + " now " + T.RANKS[r][2] + " (+" + 2 * r + " " + mi(game) + ")");
  };
  T.specialise = function (game, c, id) {
    var sp = T.SPEC_BY[id]; if (!sp) return no("no such path");
    if (c.spec) return no(c.name + " chose to be a " + c.spec + " already");
    if (T.rankOf(c, sp.job) < 4) return no("only a master " + sp.job + " chooses a path");
    c.spec = id;
    emit("townSpec", { c: c, spec: id });
    return ok("🧭 " + c.name + " the " + id + ": " + sp.t);
  };
  T.jobAt = function (b) { return !b ? null : !b.done ? "builder" : T.WORK[b.kind] || null; };
  T.workplace = function (game, c) {
    var best = null, bd = 1e9;
    game.world.structures.forEach(function (b) { if (!SK[b.kind] || !T.jobAt(b) || (b.done && T.worn(b))) return; var d = SB.dist(b.x, b.z, c.x, c.z) - SK[b.kind].r; if (d < T.NEAR && d < bd) { bd = d; best = b; } });
    return best;
  };
  function todayOf(game, c) { var d = day(game); if (!c.work || typeof c.work !== "object" || c.work.d !== d) c.work = { d: d, tk: {} }; if (!c.work.tk) c.work.tk = {}; return c.work; }
  T.workWhy = function (game, c, b) {
    var job = T.jobAt(b); if (!job) return "no work here";
    if (c.tier < 2) return "work takes hands: a tool-user and up";
    if (c.stage != null && c.stage < 2) return "too little to work";
    if (game.world.night) return "work is for the daytime";
    if ((c.burn || 0) >= day(game) && c.burnJob === job) return c.name + " is sick of " + job + " work: back on day " + (c.burn + 1);
    var w = todayOf(game, c), h = half(game);
    if (w.off) return "it's your day off";
    if (w[h]) return h === "am" ? "the morning shift is done. another after midday" : "that's the day's work done. back tomorrow";
    if (c.chem.tired > 0.85) return "too tired to work";
    return "";
  };
  T.wage = function (game, c, job) {
    var k = 1 + 0.75 * T.rankOf(c, job);
    if (c.stage === 2) k *= 0.5;
    if (T.perk(c, "wage") && T.SPEC_BY[c.spec].job === job) k *= 1.5;
    return r2(k);
  };
  T.work = function (game, c, b) {
    var why = T.workWhy(game, c, b); if (why) return no(why);
    var job = T.jobAt(b), w = todayOf(game, c), d = day(game), got = T.wage(game, c, job), s = st(game);
    w[half(game)] = 1;
    T.earn(c, got); xp(c, job, c.stage === 2 ? 0.5 : 1);
    c.chem.tired = Math.min(1, (c.chem.tired || 0) + 0.15);
    c.shifts = (Array.isArray(c.shifts) ? c.shifts : []).filter(function (x) { return x >= d - 1; }); c.shifts.push(d);
    c.leaveN = r2((c.leaveN || 0) + 0.25);
    s.guild = num(s, "guild") + 1;
    if (SB.Creature.startAction && SB.V && !game.offline) { try { SB.Creature.startAction(c, game, SB.V.idle, null); if (c.action) c.action.dur = 5; } catch (e) {} }
    var msg = "🧰 a " + (c.stage === 2 ? "half " : "") + "shift as a " + job + " at the " + T.nameOf(b) + ": " + got + " " + mi(game);
    emit("townWorked", { c: c, st: b, job: job, pay: got });
    if (c.shifts.length >= 4) { c.burn = d + 2; c.burnJob = job; c.chem.bored = Math.min(1, (c.chem.bored || 0) + 0.3); msg += ". four shifts in two days: " + c.name + " is sick of it and needs a break"; emit("townBurnout", { c: c, job: job }); }
    var pr = T.promoteWhy(game, c, job) ? null : T.promote(game, c, job);
    if (pr && pr.ok) msg += ". " + pr.msg;
    if (s.guild % 5 === 0 && s.guild <= 15) msg += ". the market grows: every keeper stocks one more of everything";
    return ok(msg);
  };
  T.dayOff = function (game, c) {
    var job = T.trade(c); if (!job) return no("no trade to rest from");
    var w = todayOf(game, c); if (w.off) return no("you're already resting");
    var sick = (c.chem.sick || 0) > 0.4;
    if (!sick && (c.leaveN || 0) < 1) return no("a paid day off comes after four shifts (" + Math.floor((c.leaveN || 0) * 4) + " of 4)");
    if (!sick) c.leaveN = r2(c.leaveN - 1);
    w.off = 1; w.am = 1; w.pm = 1;
    var got = T.wage(game, c, job); T.earn(c, got);
    c.chem.bored = lower(c.chem.bored, 0.5); c.chem.tired = lower(c.chem.tired, 0.3);
    if ((c.burn || 0) >= day(game)) c.burn = 0;
    emit("townDayOff", { c: c, sick: sick });
    return ok((sick ? "🤒 a sick day" : "🏖 a day off") + ", paid: " + got + " " + mi(game) + ". feet up");
  };
  // a little list of things a smol of that trade would do today. events from the game tick them off
  T.TASKS = {
    farmer: [["townTook", 1, "pick what a plot, hive or oven has ready"], ["povEat", 1, "taste the produce"]], fisher: [["fish", 2, "land two fish"], ["soldByHand", 1, "sell a catch"]],
    potter: [["craft", 1, "make something"], ["soldByHand", 1, "sell something you made"]], smith: [["craft", 1, "make a tool"], ["townToolFixed", 1, "mend a tool at the smithy"]],
    builder: [["deliver", 1, "bring a building site what it needs"], ["townMended", 1, "mend a building"]], trader: [["soldByHand", 2, "sell two lots"], ["townBought", 1, "buy something"]],
    teacher: [["townRead", 1, "read at the archive"], ["townService", 1, "pay for a lesson or a song"]], guard: [["grumpChased", 1, "see off a grump"], ["townLook", 1, "look out from a watchtower"]],
    scribe: [["townRead", 1, "read at the archive"], ["townNamed", 1, "carve a name on something"]], healer: [["townHealed", 1, "rest at the healer's hut"], ["craft", 1, "mix or brew something"]],
    baker: [["craft", 1, "bake or cook something"], ["townTook", 1, "take the morning loaf"]], innkeeper: [["townSong", 1, "sit in on a song night"], ["soldByHand", 1, "sell something"]],
    keeper: [["townOffering", 1, "leave an offering at the shrine"], ["townMended", 1, "mend a building"]]
  };
  T.tasks = function (game, c) {
    var job = T.trade(c), L = job ? T.TASKS[job] || T.TASKS.keeper : null; if (!L) return [];
    var w = todayOf(game, c);
    return L.map(function (x) { var n = Math.min(x[1], w.tk[x[0]] || 0); return { text: x[2], n: n, of: x[1], done: n >= x[1] }; });
  };
  function tally(ev) {
    SB.bus.on(ev, function (d) {
      var game = cur(), c = me(); if (!game || !c || (d && d.c && d.c !== c)) return;
      var w = todayOf(game, c); w.tk[ev] = (w.tk[ev] || 0) + 1;
      var L = T.tasks(game, c); if (!L.length || w.paid || !L.every(function (x) { return x.done; })) return;
      var job = T.trade(c), bonus = r2(2 + T.rankOf(c, job));
      w.paid = 1; T.earn(c, bonus); xp(c, job, 1);
      emit("townJobsDone", { c: c, job: job, pay: bonus });
      U.say(c, "🧰 the day's " + job + " jobs are done: +" + bonus + " " + mi(game));
    });
  }

  /* ---------------- the board: smols who want something ---------------- */
  var ODD = [["stick", 6, 2], ["stone", 4, 2], ["berry", 5, 2], ["carrot", 3, 2.5], ["fish", 2, 3], ["fiber", 4, 2]];
  var GIG = [["fur", 2, 5, "a rug for the floor"], ["honey", 2, 5, "candles for the shelf"], ["clay", 3, 4, "a pot for flowers"], ["leaves", 4, 3, "a softer bed"], ["stick", 6, 4, "a shelf"]];
  function newAsks(game) {
    var s = st(game), dn = day(game), r = dice(game, "ask" + dn), p = me(), mine = SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null;
    var pool = game.creatures.filter(function (o) { return isSmol(o) && o !== p && o !== mine && (o.stage == null || o.stage >= 3); });
    if (!pool.length || (!home(game) && era(game) < 1)) { s.asks = null; return; }
    var a = pool[Math.floor(r() * pool.length)], b = pool[Math.floor(r() * pool.length)], o = ODD[Math.floor(r() * ODD.length)], g = GIG[Math.floor(r() * GIG.length)];
    s.asks = { d: dn, list: [{ who: a.id, k: o[0], n: o[1], pay: o[2], t: "odd" }, { who: b.id, k: g[0], n: g[1], pay: g[2], t: "gig", what: g[3] }].filter(function (x) { return K[x.k]; }) };
  }
  T.newAsks = newAsks;
  T.asks = function (game) {
    var a = st(game).asks, out = []; if (!a || a.d !== day(game)) return out;
    a.list.forEach(function (x, i) { var who = SB.Game.byId(game, x.who); if (who && who.alive && !x.done) out.push({ i: i, who: who, k: x.k, n: x.n, pay: x.pay, t: x.t, what: x.what }); });
    return out;
  };
  T.handIn = function (game, c, i) {
    var a = st(game).asks, x = a && a.d === day(game) ? a.list[i] : null, who = x ? SB.Game.byId(game, x.who) : null;
    if (!x || x.done || !who || !who.alive) return no("nobody is asking for that any more");
    if (Sv().count(c, x.k) < x.n) return no(who.name + " asked for " + x.n + " " + label(x.k));
    if (SB.dist(c.x, c.z, who.x, who.z) > 12) return no("take it to " + who.name + ": they're " + Math.round(SB.dist(c.x, c.z, who.x, who.z)) + " steps off");
    Sv().take(c, x.k, x.n); x.done = 1; T.earn(c, x.pay);
    if (SB.Social && SB.Social.remember) { try { SB.Social.remember(game, who, c, "helped", x.t === "gig" ? 8 : 4, "brought me what i asked for", 3600, 20); } catch (e) {} }
    if (SB.Creature.emote) SB.Creature.emote(who, "happy", 2);
    xp(c, x.t === "gig" ? "builder" : "trader", 0.5);
    emit("townAsk", { c: c, who: who, ask: x });
    return ok((x.t === "gig" ? "🛋 " + who.name + "'s hut has " + x.what + " now" : "🤝 " + who.name + " has the " + label(x.k)) + ": " + x.pay + " " + mi(game) + ", and they think more of you");
  };

  /* ---------------- the council: big things shells can buy ---------------- */
  T.fundPrice = function (game, kindOf) { return r2((kindOf === "house" ? 22 : kindOf === "feast" ? 20 : kindOf === "seeds" ? 10 : 15) * (1 + 0.1 * num(st(game), "infl"))); };
  // a hut for a named smol, or (who == null) a house for you
  T.fund = function (game, c, who) {
    var kd = who ? "hut" : "house", price = T.fundPrice(game, kd), s = st(game);
    if (era(game) < 1 && !home(game)) return no("that takes a village");
    if (T.funds(game, c) < price) return no(short(game, c, price));
    var c0 = who || centre(game), p = spot(game, c0.x, c0.z, "fund" + day(game) + ":" + num(s, "funded"), 5, 16, false);
    if (!p) return no("no room to build near here");
    T.spend(game, c, price);
    var b = plant(game, kd, p.x, p.z, { tribe: c.tribe, data: { funded: who ? who.id : -1 }, name: who ? who.name + "'s hut" : null });
    b.founder = c.name;
    s.funded = num(s, "funded") + 1; s.infl = num(s, "infl") + 1;
    if (who) {
      if (SB.Social && SB.Social.remember) { try { SB.Social.remember(game, who, c, "house", 25, "paid for my hut", 1e5, 60); SB.Social.log(game, who, "🛖", "was given a hut by " + c.name); } catch (e) {} }
      T.keep(game, "fund:" + who.id, "🪵", "a thank-you carving from " + who.name + " for the hut");
    }
    emit("townFunded", { c: c, st: b, who: who || null, price: price });
    return ok(who ? "🛖 the tribe built " + who.name + " a hut with your " + price + " " + mi(game) + ". they won't forget it" : "🏠 a house, built for you, for " + price + " " + mi(game) + ". walk over and make it your home");
  };
  T.order = function (game, c, id) {
    var s = st(game), price = T.fundPrice(game, id);
    if (id === "seeds") {
      if (s.order.seeds) return no("that's the rule already");
      if (era(game) < 2) return no("that takes a town with a market");
      if (!T.spend(game, c, price)) return no(short(game, c, price));
      s.order.seeds = day(game);
      return ok("🌱 by order: farmers keep every season's seeds on the counter, all year");
    }
    if (id === "feast") {
      if (s.feastD === day(game)) return no("everyone is still full");
      if (!T.spend(game, c, price)) return no(short(game, c, price));
      s.feastD = day(game); s.mess = num(s, "mess") + 3;
      var n = 0; game.creatures.forEach(function (o) { if (isSmol(o)) { o.chem.hunger = lower(o.chem.hunger, 0.6); o.chem.bored = lower(o.chem.bored, 0.3); n++; } });
      if (SB.Game.addSparks) SB.Game.addSparks(game, 2, c);
      emit("townFeast", { c: c, n: n });
      return ok("🍲 a feast on you! " + n + " smols ate their fill. +2 ✨ (and somebody will have to sweep up)");
    }
    return no("no such thing");
  };
  // paying the tribe instead of gathering makes the next price a little dearer
  var cp0 = T.commissionPrice, com0 = T.commission;
  T.commissionPrice = function (b) { var game = cur(), k = game && game.quests && game.quests.town ? 1 + 0.1 * num(game.quests.town, "infl") : 1; return r2(cp0(b) * k); };
  T.commission = function (game, c, b) { var r = com0(game, c, b); if (r.ok) { var s = st(game); s.infl = num(s, "infl") + 1; } return r; };
  // market day only: three cups, one shell, three goes
  T.cupGame = function (game, c) {
    if (!marketDay(game)) return no("the cup game is only out on market day");
    var w = todayOf(game, c); if ((w.cups || 0) >= 3) return no("three goes a day. the cup smol is packing up");
    if (!T.spend(game, c, 1)) return no(short(game, c, 1));
    w.cups = (w.cups || 0) + 1;
    var win = dice(game, "cup" + day(game) + ":" + c.id + ":" + w.cups)() < 0.34;
    if (win) T.earn(c, 2.5);
    T.played(game, c, "cups"); c.chem.bored = lower(c.chem.bored, 0.15);
    emit("townCups", { c: c, win: win });
    return { ok: true, win: win, msg: win ? "🥥 the shell was under your cup! 2.5 " + mi(game) + " back" : "🥥 not that cup. the cup smol grins" };
  };
  T.marketDay = marketDay;
  T.upkeep = function (game) {
    var n = 0, fires = 0, wells = 0, worn = 0, lamps = 0;
    game.creatures.forEach(function (o) { if (isSmol(o)) n++; });
    game.world.structures.forEach(function (b) { if (!b.done) return; if (b.kind === "campfire" || b.kind === "watchfire" || b.kind === "kiln") fires++; if (b.kind === "well" || b.kind === "pond") wells++; if (b.kind === "lamp") lamps++; if (T.META[b.kind] && T.worn(b)) worn++; });
    return { smols: n, food: n * 2, wood: fires * 2, water: wells, granary: Math.round((game.civ && game.civ.granary) || 0), worn: worn, lamps: lamps };
  };

  /* ---------------- the home: looks, paint, add-ons ---------------- */
  T.LOOKS = {
    roof: [{ id: "leaf", name: "a leaf roof" }, { id: "thatch", name: "thatch", cost: { fiber: 4 }, perk: "warm: you wake less cold" }, { id: "tile", name: "a clay tile roof", cost: { clay: 4 }, perk: "it wears half as fast" }],
    wall: [{ id: "wood", name: "wooden walls" }, { id: "stone", name: "stone walls", cost: { stone: 6 }, tint: [0.86, 0.87, 0.92], perk: "wears half as fast, and often stands through a raid or a fire" }, { id: "clay", name: "clay walls", cost: { clay: 5 }, tint: [1.12, 0.86, 0.76], perk: "cool in summer" },
      { id: "reed", name: "reed walls", cost: { fiber: 6 }, tint: [1.06, 1.06, 0.8], perk: "light and airy" }, { id: "crystal", name: "crystal-set walls", cost: { crystal: 2, stone: 2 }, tint: [0.86, 1.02, 1.16], perk: "they glow a little: the safe ring is wider" }],
    floor: [{ id: "earth", name: "an earth floor" }, { id: "reed", name: "reed mats", cost: { fiber: 3 } }, { id: "flags", name: "stone flags", cost: { stone: 4 } }, { id: "clay", name: "clay floor tiles", cost: { clay: 3 } }],
    bed: [{ id: "leaves", name: "a bed of leaves" }, { id: "fur", name: "a fur bed", cost: { fur: 2 } }, { id: "feather", name: "a feather bed", cost: { leaves: 2, fiber: 2 } }],
    base: [{ id: "none", name: "bare ground" }, { id: "stone", name: "a stone footing", cost: { stone: 5 }, perk: "dry feet: it wears a quarter slower" }]
  };
  T.THEMES = { stone: { wall: "stone", floor: "flags", base: "stone" }, reed: { roof: "thatch", wall: "reed", floor: "reed" }, clay: { roof: "tile", wall: "clay", floor: "clay" } };
  function lookDef(cat, id) { var L = T.LOOKS[cat] || [], o = null; L.forEach(function (x) { if (x.id === id) o = x; }); return o; }
  T.lookOf = function (game, cat) { var v = st(game).look[cat]; return lookDef(cat, v) ? v : T.LOOKS[cat][0].id; };
  T.matching = function (game) { for (var t in T.THEMES) { var all = true; for (var cat in T.THEMES[t]) if (T.lookOf(game, cat) !== T.THEMES[t][cat]) all = false; if (all) return t; } return null; };
  T.lookCost = function (game, cat, id) { var o = lookDef(cat, id), s = st(game); if (!o || !o.cost) return {}; return s.pattern && T.THEMES[s.pattern] && T.THEMES[s.pattern][cat] === id ? {} : o.cost; };
  T.setLook = function (game, c, cat, id) {
    var h = home(game), o = lookDef(cat, id);
    if (!h) return no("you have no home yet"); if (!o) return no("no such look");
    if (!H().at(game, c)) return no("you have to be at home");
    if (c.tier < 2) return no("it takes hands");
    if (T.lookOf(game, cat) === id) return no("it has " + o.name + " already");
    var cost = T.lookCost(game, cat, id);
    if (!canPay(c, cost)) return no(o.name + " takes " + T.costText(cost));
    pay(c, cost); st(game).look[cat] = id;
    applyTint(game, h); T.sync(game);
    emit("townLook", { c: c, cat: cat, id: id });
    var m = T.matching(game);
    return ok("🏡 " + o.name + (o.perk ? ": " + o.perk : "") + (m ? ". a matching " + m + " set (comfort +2)" : ""));
  };
  // colour: the renderer reads a building's tint; civ.js sets it for its districts, so a painted one keeps its own
  function hueTint(h) { var c = SB.hsl ? SB.hsl(h, 0.6, 0.6) : [1, 1, 1], m = Math.max(c[0], c[1], c[2]) || 1; return [r2(0.55 + 0.6 * c[0] / m), r2(0.55 + 0.6 * c[1] / m), r2(0.55 + 0.6 * c[2] / m)]; }
  function wantTint(game, b) {
    var d = b.data || {}, t = null;
    if (d.paint != null) t = hueTint(d.paint);
    else if (H() && H().is(game, b)) { var o = lookDef("wall", T.lookOf(game, "wall")); if (o && o.tint) t = o.tint.slice(); }
    if (d.glow && game.world.night) t = (t || [1, 1, 1]).map(function (v) { return r2(v * 1.25); });
    return t;
  }
  function pinned(b) { var d = Object.getOwnPropertyDescriptor(b, "tint"); return !!(d && d.get); }
  function applyTint(game, b) {
    var t = wantTint(game, b), cur0 = pinned(b) ? b.tint : null;
    if (!t) { if (cur0) { delete b.tint; dirty(b); } return; }
    if (cur0 && cur0[0] === t[0] && cur0[1] === t[1] && cur0[2] === t[2]) return;
    try { Object.defineProperty(b, "tint", { configurable: true, enumerable: false, get: function () { return t; }, set: function () {} }); } catch (e) { b.tint = t; }
    dirty(b);
  }
  T.tintOf = function (b) { return pinned(b) ? b.tint : null; };
  function mine(game, b) { return !!b && (!!T.META[b.kind] || !!(b.data && b.data.pov) || !!(H() && H().is(game, b))); }
  T.paint = function (game, c, b, id) {
    if (!b || !b.done || !mine(game, b)) return no("you can only paint what's yours");
    if (SB.dist(c.x, c.z, b.x, b.z) > T.NEAR + SK[b.kind].r) return no("get closer");
    var d = b.data || (b.data = {});
    if (id === "none") { if (d.paint == null && !d.glow) return no("it isn't painted"); d.paint = null; d.glow = 0; applyTint(game, b); return ok("🫧 scrubbed back to bare"); }
    if (id === "glowpaste") {
      if (d.glow) return no("it glows already");
      if (Sv().count(c, "glowcap") < 2) return no("glow paste takes 2 glowcaps");
      Sv().take(c, "glowcap", 2); d.glow = 1; applyTint(game, b);
      emit("townPainted", { c: c, st: b, glow: true });
      return ok("✨ glowcap paste on the " + SK[b.kind].label + ": it shines at night, and smols near it are less afraid");
    }
    var dy = null; T.DYES.forEach(function (x) { if (x.id === id) dy = x; });
    if (!dy) return no("no such colour");
    if (!canPay(c, dy.cost)) return no(dy.name + " takes " + T.costText(dy.cost));
    pay(c, dy.cost); d.paint = dy.hue; applyTint(game, b);
    emit("townPainted", { c: c, st: b, hue: dy.hue });
    return ok(dy.icon + " the " + SK[b.kind].label + " is " + dy.name + " now");
  };
  T.turn = function (game, c, b) {
    if (!b || !mine(game, b) || (H() && H().is(game, b))) return no("that one stays as it is");
    b.rot = ((b.rot || 0) + Math.PI / 4) % 6.2832; dirty(b);
    return ok("↻ turned an eighth round");
  };
  var ORDER = { leanto: 0, hut: 1, house: 2, lodge: 3 };
  T.ADDONS = [
    { id: "kitchen", slot: "wing", icon: "🍳", name: "a kitchen", cost: { stone: 6, clay: 3, stick: 4 }, min: "house", perk: "another hot meal every morning, and raw fish or meat in the chest cooks itself" },
    { id: "workshop", slot: "wing", icon: "🪚", name: "a workshop", cost: { stick: 10, stone: 4 }, min: "house", perk: "the home mends itself a little every day" },
    { id: "greenhouse", slot: "wing", icon: "🌱", name: "a greenhouse", cost: { stick: 6, crystal: 1, seed: 3 }, min: "house", perk: "a herb every morning, and a carrot even in winter" },
    { id: "glowcorner", slot: "nook", icon: "🍄", name: "a glowcap corner", cost: { glowcap: 2, clay: 1 }, min: "hut", perk: "a glowcap every morning" },
    { id: "roost", slot: "nook", icon: "🍎", name: "a fruit roost", cost: { stick: 4, apple: 2 }, min: "hut", perk: "the birds drop an apple every morning" },
    { id: "cellar", slot: "cellar", icon: "🕳", name: "a cellar", cost: { stone: 8, stick: 2 }, min: "hut", perk: "six more chest slots, dug cool under the floor" }
  ];
  T.ADDON = {}; T.ADDONS.forEach(function (a) { T.ADDON[a.id] = a; });
  T.addWhy = function (game, c, id) {
    var a = T.ADDON[id], h = home(game), s = st(game);
    if (!a) return "no such room"; if (!h) return "you have no home yet";
    if (s.addon[id]) return "your home has one";
    for (var k in s.addon) if (T.ADDON[k] && T.ADDON[k].slot === a.slot) return "you chose " + T.ADDON[k].name + ": one " + a.slot + " to a home";
    if ((ORDER[h.kind] || 0) < ORDER[a.min]) return a.name + " needs at least a " + SK[a.min].label;
    if (!H().at(game, c)) return "you have to be at home";
    if (c.tier < 2) return "it takes hands";
    if (!canPay(c, a.cost)) return a.name + " takes " + T.costText(a.cost);
    return "";
  };
  T.addOn = function (game, c, id) {
    var why = T.addWhy(game, c, id), a = T.ADDON[id]; if (why) return no(why);
    pay(c, a.cost); st(game).addon[id] = day(game); T.sync(game);
    emit("townAddon", { c: c, id: id });
    return ok(a.icon + " " + a.name + " on your home: " + a.perk + " (comfort +2, room for two more things)");
  };
  T.role = function (game) {
    var s = st(game), f = s.fur;
    return s.addon.kitchen || (f.pot && f.table) ? "kitchen" : s.addon.workshop || f.bench ? "workshop" : f.thinkstone && f.painting ? "study" : f.musicbox && f.cushions ? "parlour" : f.rack && T.trophies(game).length ? "trophy room" : null;
  };
  var ROLE_GIFT = { kitchen: "cooked", workshop: "stick", study: "herb", parlour: "honey", "trophy room": "nut" };

  /* ---------------- who lives with you ---------------- */
  T.BEDS = { leanto: 1, hut: 2, house: 3, lodge: 5 };
  T.mates = function (game) { var s = st(game); s.mates = s.mates.filter(function (m) { var o = SB.Game.byId(game, m.id); return !!o && o.alive; }); return s.mates; };
  T.roleFor = function (game, c, who) {
    if (c.partner === who.id || who.partner === c.id) return "partner";
    var S = SB.Social; if (!S || !S.opinion) return "friend";
    var op = 0; try { op = S.opinion(game, who, c); } catch (e) {}
    return op >= S.BEST ? "best friend" : op >= S.FRIEND || (SB.Friends && SB.Friends.hearts && SB.Friends.hearts(game, who) >= 2) ? "friend" : null;
  };
  T.mateWhy = function (game, c, who) {
    var h = home(game); if (!h) return "you have no home yet";
    if (!isSmol(who) || who === c || (who.stage != null && who.stage < 3)) return "it takes a grown-up smol";
    var L = T.mates(game);
    if (L.some(function (m) { return m.id === who.id; })) return who.name + " lives here already";
    if (L.length > (T.BEDS[h.kind] || 1)) return "there is no more room: make your home bigger";
    if (!T.roleFor(game, c, who)) return who.name + " doesn't know you well enough yet: be a friend first";
    return "";
  };
  T.crowded = function (game) { var h = home(game); return !!h && T.mates(game).length > (T.BEDS[h.kind] || 1); };
  T.moveIn = function (game, c, who) {
    var why = T.mateWhy(game, c, who); if (why) return no(why);
    var role = T.roleFor(game, c, who), h = home(game);
    st(game).mates.push({ id: who.id, role: role, d: day(game) });
    if (SB.Social && SB.Social.log) SB.Social.log(game, who, "🏡", "moved into " + T.homeName(game));
    if (!game.offline && SB.Creature.sendTo) SB.Creature.sendTo(who, h.x + 1.4, h.z + 1, game, 40);
    emit("townMate", { c: c, who: who, role: role });
    return ok("🏡 " + who.name + " moves in, your " + role + ". they'll tend the patch, sweep and keep the hearth" + (role === "partner" ? ", and cook you breakfast" : "") + (T.crowded(game) ? ". it's a squeeze: crowded (comfort −3)" : ""));
  };
  T.moveOut = function (game, id) { var s = st(game), n = s.mates.length; s.mates = s.mates.filter(function (m) { return m.id !== id; }); return n !== s.mates.length ? ok("they've moved back out") : no(""); };
  T.homeCandidates = function (game, c) {
    var h = home(game); if (!h) return [];
    return game.creatures.filter(function (o) { return isSmol(o) && o !== c && SB.dist(o.x, o.z, h.x, h.z) < 30 && !T.mateWhy(game, c, o); }).sort(function (a, z) { return SB.dist(a.x, a.z, h.x, h.z) - SB.dist(z.x, z.z, h.x, h.z); }).slice(0, 3);
  };
  // keepers for things that had none: a guard at your door, a gravekeeper, a porter for the kiln, a lamplighter
  var XJ = { grave: "gravekeeper", kiln: "porter", lamp: "lamplighter", shop: "shopkeeper", dorm: "minder" };
  T.jobFor = function (game, b) { if (!b) return null; if (H() && H().is(game, b)) return "door guard"; return (T.META[b.kind] && T.META[b.kind].job) || XJ[b.kind] || null; };
  var assign0 = T.assign;
  T.assign = function (game, b, who) {
    if (b && T.META[b.kind] && T.META[b.kind].job && !(H() && H().is(game, b))) return assign0(game, b, who);
    var job = T.jobFor(game, b);
    if (!job || !b.done) return no("nobody can keep that");
    if (!isSmol(who) || who.tier < 2 || (who.stage != null && who.stage < 3)) return no("it takes a grown-up with hands");
    var old = T.postOf(game, who); if (old && old !== b) T.unpost(game, old);
    T.unpost(game, b);
    if (!b.data) b.data = {};
    b.data.keeper = who.id; who.postId = b.id; who.postJob = job;
    if (SB.Social && SB.Social.log) SB.Social.log(game, who, SK[b.kind].emoji, "became the " + job + " at the " + T.nameOf(b));
    if (!game.offline && SB.Creature.sendTo) SB.Creature.sendTo(who, b.x + SK[b.kind].r + 0.6, b.z, game, 30);
    T.sync(game);
    emit("townKeeper", { st: b, c: who, job: job });
    return ok(SK[b.kind].emoji + " " + who.name + " is the " + job + " at the " + T.nameOf(b) + " now");
  };
  var near0 = T.nearest, NEAR2 = { stall: 1, hall: 1, tradecamp: 1, kiln: 1, grave: 1 };
  T.nearest = function (game, c) {
    var best = near0(game, c), bd = best ? SB.dist(best.x, best.z, c.x, c.z) - SK[best.kind].r : 1e9;
    game.world.structures.forEach(function (b) { if (!NEAR2[b.kind] || !SK[b.kind] || !b.done) return; var d = SB.dist(b.x, b.z, c.x, c.z) - SK[b.kind].r; if (d < T.NEAR && d < bd) { bd = d; best = b; } });
    return best;
  };

  /* ---------------- keeping it clean, keeping yourself clean ---------------- */
  T.sweep = function (game, c) {
    var s = st(game); if (!home(game) || !H().at(game, c)) return no("the broom is at home");
    if (num(s, "dirt") < 1) return no("spotless already");
    s.dirt = 0; c.chem.bored = Math.min(1, (c.chem.bored || 0) + 0.02);
    emit("townSwept", { c: c });
    return ok("🧹 swept out. no more muddy paw prints");
  };
  T.tidy = function (game, c) {
    var s = st(game); if (num(s, "mess") < 1) return no("the square is tidy");
    s.mess = Math.max(0, s.mess - 2);
    if (s.mess === 0 && SB.Game.addSparks) SB.Game.addSparks(game, 1, c);
    emit("townTidied", { c: c, left: s.mess });
    return ok(s.mess ? "🧹 a bit tidier. more to pick up" : "🧹 the square is tidy again: +1 ✨");
  };
  function freshen(game, c, msg) {
    c.washD = day(game); c.freshT = game.time + SB.DAY_LENGTH * 0.5;
    c.chem.bored = lower(c.chem.bored, 0.2); c.chem.hot = lower(c.chem.hot, 0.2);
    emit("townWash", { c: c });
    return msg;
  }
  T.fresh = function (c, game) { return !!c && c.freshT > game.time; };
  T.wash = function (game, c) {
    if (T.fresh(c, game)) return no("your fur is as clean as it gets");
    return ok(freshen(game, c, "🫧 a good wash. fresh fur: you feel like a new smol"));
  };

  /* ---------------- play: more kinds of it, and how many a smol wants ---------------- */
  T.played = function (game, c, k) { if (!c) return; if (!c.play || typeof c.play !== "object") c.play = {}; c.play[k] = day(game); };
  T.variety = function (game, c) { var p = (c && c.play) || {}, n = 0, d = day(game); for (var k in p) if (d - p[k] <= 2) n++; return n; };
  T.expects = function (game) { return 1 + era(game); };
  var sit0 = T.sit, music0 = T.music;
  function poorly(c) { return (c.chem.sick || 0) > 0.4 || c.stage === 0; }
  T.sit = function (game, c, b, how) {
    if (how === "swing" && poorly(c)) return no("not while you're poorly: sit this one out");
    var r = sit0(game, c, b, how); if (r.ok) T.played(game, c, how === "sit" ? "bench" : how); return r;
  };
  T.music = function (game, c) { var r = music0(game, c); if (r.ok) T.played(game, c, "tune"); return r; };
  T.toy = function (game, c, k) {
    if (!T.TOYS[k] || Sv().count(c, k, true) < 1) return no("nothing to play with");
    var wind = (game.world.weather && game.world.weather.wind) || 0, amt = T.TOYS[k], msg;
    if (k === "kite") { amt = wind > 0.3 ? 0.5 : wind > 0.1 ? 0.3 : 0.1; msg = wind > 0.3 ? "🪁 up it goes! the wind takes it right over the trees" : wind > 0.1 ? "🪁 it flies, just" : "🪁 no wind. it flops. try a breezier day"; }
    else if (k === "drum" || k === "flute") {
      var n = 0; game.creatures.forEach(function (o) { if (isSmol(o) && o !== c && SB.dist(o.x, o.z, c.x, c.z) < 8) { o.chem.bored = lower(o.chem.bored, 0.15); n++; } });
      msg = (k === "drum" ? "🥁 boom-ba-boom" : "🪈 a thin little tune") + (n ? ". " + n + (n === 1 ? " smol taps" : " smols tap") + " along" : "");
      if (SB.Audio && SB.Audio.play && !(P() && P().headless)) SB.Audio.play("chime");
    } else msg = k === "top" ? "🪀 round and round and… over" : "🪆 you make it dance. it's a good dancer";
    c.chem.bored = lower(c.chem.bored, amt);
    T.played(game, c, k === "drum" || k === "flute" ? "tune" : k);
    emit("townPlay", { c: c, kind: k });
    return ok(msg);
  };
  T.thunder = function (game, c) {
    if (Sv().count(c, "thunderpot", true) < 1) return no("no thunder-pot");
    Sv().take(c, "thunderpot", 1);
    var n = 0; game.creatures.forEach(function (g) { if (g.alive && g.species === "grump" && !g.boss && SB.dist(g.x, g.z, c.x, c.z) < 9) { g.chem.fear = Math.min(1, (g.chem.fear || 0) + 0.8); g.goingHome = true; n++; } });
    var p = P(); if (p && p.scout && p.endScout && p.scout() && !p.scout().boss) p.endScout("🧨 BANG. the grump is gone before the echo", 1, "thunder");
    if (SB.Audio && SB.Audio.play && !(p && p.headless)) SB.Audio.play("bonk");
    emit("townThunder", { c: c, n: n });
    return ok("🧨 BANG! " + (n ? n + (n === 1 ? " grump remembers" : " grumps remember") + " somewhere else to be" : "nothing about to hear it, but it was a good bang"));
  };
  T.soak = function (game, c) {
    c.chem.tired = lower(c.chem.tired, 0.3); c.chem.cold = 0; if (SB.Body && SB.Body.of) SB.Body.of(c).wet = 0;
    var n = 0; game.creatures.forEach(function (o) { if (isSmol(o) && o !== c && SB.dist(o.x, o.z, c.x, c.z) < 5) { o.chem.lonely = lower(o.chem.lonely, 0.15); o.chem.cold = lower(o.chem.cold, 0.3); n++; } });
    c.chem.lonely = lower(c.chem.lonely, n ? 0.2 : 0);
    T.played(game, c, "soak"); freshen(game, c, "");
    return ok("♨️ a long soak in the hot spring" + (n ? " with " + n + (n === 1 ? " other" : " others") : "") + ". warm to the bones");
  };

  /* ---------------- camps, outposts, carrying a building, the plot ---------------- */
  T.campName = function (game, x, z) {
    var nm = null; (game.sites || []).forEach(function (sx) { if (nm || sx.gone || SB.dist(sx.x, sx.z, x, z) > 10) return; nm = sx.kind === "wreck" ? "the wreck den" : sx.kind === "cave" ? "the cave nook" : sx.kind === "pod" ? "the pod den" : sx.kind === "ruin" ? "the ruin camp" : null; });
    return nm;
  };
  T.pitch = function (game, c, free, name) {
    if (c.tier < 2) return no("it takes hands");
    if (!SK.camp) return no("");
    if (!free && Sv().count(c, "campkit", true) < 1) return no("you need a camp kit: make one (4 fibre, 4 sticks, a fur) or buy one");
    var p = freeNear(game, c, SK.camp.r); if (!p) return no("no room to pitch a camp here: try flatter, drier ground");
    var x = p.x, z = p.z;
    if (!free) Sv().take(c, "campkit", 1);
    var b = plant(game, "camp", x, z, { tribe: c.tribe, data: { pov: 1, kit: free ? 0 : 1 }, name: name || T.campName(game, x, z) });
    b.founder = c.name;
    emit("townCamp", { c: c, st: b });
    return ok("⛺ camp pitched" + (b.name ? ": " + b.name : "") + ". a roof and a bed" + (H() && H().has(game, "chest") ? ", and your chest is in the pack" : ""), { st: b });
  };
  T.lairNear = function (game, c) {
    var B = SB.Bosses, out = null; if (!B || !B.state) return null;
    var bl; try { bl = B.state(game).list || {}; } catch (e) { return null; }
    for (var id in bl) if (bl[id] && bl[id].beaten && !st(game).outposts[id] && SB.dist(bl[id].x, bl[id].z, c.x, c.z) < 14) out = id;
    return out;
  };
  T.outpost = function (game, c) {
    var id = T.lairNear(game, c); if (!id) return no("no empty lair here");
    var nm = SB.Loot && SB.Loot.TABLES && SB.Loot.TABLES[id] ? SB.Loot.TABLES[id].name.replace(/'s hoard| hoard/, "") + "'s old lair" : "the old lair";
    var r = T.pitch(game, c, true, nm); if (!r.ok) return r;
    st(game).outposts[id] = day(game);
    return ok("🏕 the lair is yours now: an outpost, with a bed and your chest. no kit needed", { st: r.st });
  };
  T.campChest = function (game, b) { return b && b.kind === "camp" && b.done && H() && H().has(game, "chest") ? H().chest(game) : null; };
  var down0 = T.takeDown;
  T.takeDown = function (game, c, b) {
    if (b && b.kind === "camp") {
      if (SB.dist(c.x, c.z, b.x, b.z) > T.NEAR + SK.camp.r) return no("get closer");
      var kit = b.data && b.data.kit; if (kit) { var left = Sv().add(c, "campkit", 1); if (left && Sv().spawn) Sv().spawn(game, "campkit", 1, b.x, b.z); }
      SB.World.removeStructure(game.world, b); dirty(b);
      emit("townTakenDown", { st: b, c: c });
      return ok("⛺ camp packed up" + (kit ? ": the kit is back in your bag" : ""));
    }
    if (b && b.data && Array.isArray(b.data.goods) && T.canTakeDown(game, b)) b.data.goods.forEach(function (sl) { if (sl && Sv().spawn) Sv().spawn(game, sl.k, sl.n, b.x, b.z, { w: sl.w }); });
    return down0(game, c, b);
  };
  T.carry = function (game, c, b) {
    var s = st(game);
    if (s.carry) return no("you're already carrying the " + SK[s.carry.kind].label + ": set it down first");
    if (!b || !b.done || b.kind === "camp" || !T.canTakeDown(game, b)) return no("that one stays where it is");
    if (SB.dist(c.x, c.z, b.x, b.z) > T.NEAR + SK[b.kind].r) return no("get closer");
    var rec = { kind: b.kind, name: b.name || null, data: b.data || {}, rot: b.rot || 0, founder: b.founder || null };
    if (s.stores[b.id]) { rec.store = s.stores[b.id]; delete s.stores[b.id]; }
    T.unpost(game, b); rec.data.keeper = null;
    SB.World.removeStructure(game.world, b); dirty(b);
    s.carry = rec; T.sync(game);
    emit("townCarried", { c: c, kind: rec.kind });
    return ok("🫳 you heave up the " + SK[rec.kind].label + ", contents and all. set it down where you like (town tab)");
  };
  T.setDown = function (game, c) {
    var s = st(game), rec = s.carry; if (!rec || !SK[rec.kind]) return no("you aren't carrying anything");
    var p = freeNear(game, c, SK[rec.kind].r); if (!p) return no("no room here: try flatter, drier ground");
    var x = p.x, z = p.z;
    var b = plant(game, rec.kind, x, z, { tribe: c.tribe, rot: rec.rot, data: rec.data, name: rec.name });
    if (rec.founder) b.founder = rec.founder;
    if (rec.store) s.stores[b.id] = rec.store;
    s.carry = null; applyTint(game, b); T.sync(game);
    emit("townSetDown", { c: c, st: b });
    return ok("🫴 down it goes. the " + SK[rec.kind].label + " lives here now", { st: b });
  };
  // a palisade piece thrown up on the spot, no building site
  T.barricade = function (game, c) {
    if (c.tier < 2) return no("it takes hands");
    if (!SK.wall) return no("");
    if (Sv().count(c, "stick") < 3 || Sv().count(c, "stone") < 1) return no("a quick barricade takes 3 sticks and a stone");
    var p = freeNear(game, c, 0.6, true); if (!p) return no("no room here");
    var x = p.x, z = p.z;
    Sv().take(c, "stick", 3); Sv().take(c, "stone", 1);
    var b = plant(game, "wall", x, z, { tribe: c.tribe, data: { pov: 1, quick: 1 } }); b.founder = c.name;
    emit("townBarricade", { c: c, st: b });
    return ok("🪵 a barricade, hammered in on the spot. grumps won't walk through it", { st: b });
  };
  T.stake = function (game, c) {
    var s = st(game), h = home(game); if (!h) return no("you have no home yet");
    if (s.plot) return no("your plot is staked already");
    if (!H().at(game, c)) return no("you have to be at home");
    var fee = era(game) >= 3 ? 5 : 0;
    if (Sv().count(c, "stick") < 4) return no("staking a plot takes 4 sticks");
    if (fee && T.funds(game, c) < fee) return no("in a city the council wants " + fee + " " + mi(game) + " for a plot");
    Sv().take(c, "stick", 4); if (fee) T.spend(game, c, fee);
    s.plot = day(game); T.sync(game);
    emit("townPlot", { c: c });
    return ok("📍 four stakes and a bit of vine: your plot. the yard reaches " + T.YARD + " steps from the door now" + (fee ? " (the council took its " + fee + ")" : ""));
  };
  var LOOSE = { material: 1, stick: 1, stone: 1, food: 1, plant: 1, mushroom: 1, crop: 1 };
  // everything lying about in your yard goes into the chest
  T.clearPlot = function (game, c) {
    var h = home(game), s = st(game); if (!h || !s.plot) return no("stake a plot first");
    if (!H().has(game, "chest")) return no("that takes a chest to put things in");
    var got = 0, items = (game.world.items || []).slice();
    items.forEach(function (it) {
      if (!it || it.gone || it.heldBy != null || !K[it.kind] || !LOOSE[K[it.kind].noun] || (it.data && (it.data.pod || it.data.an != null)) || SB.dist(it.x, it.z, h.x, h.z) > T.YARD) return;
      var n = (it.data && it.data.n) || 1, left = H().put(game, it.kind, n, it.data ? it.data.w : undefined);
      if (left >= n) return;
      got += n - left;
      if (left > 0) it.data.n = left; else SB.World.remove(game.world, it);
    });
    emit("townCleared", { c: c, n: got });
    return ok(got ? "🧺 the plot is clear: " + got + " things picked up and put in the chest" : "🧺 nothing lying about. a tidy plot");
  };
  T.fetchPack = function (game, c) {
    var p = P(), S0 = p && p.state ? p.state() : null, goal = S0 && S0.goal;
    if (!goal || !goal.pack) return no("you haven't lost a pack");
    if (T.funds(game, c) < 3) return no(short(game, c, 3));
    var n = 0, items = (game.world.items || []).slice();
    items.forEach(function (it) {
      if (!it || it.gone || it.heldBy != null || !K[it.kind] || SB.dist(it.x, it.z, goal.x, goal.z) > 2.5) return;
      if (Sv().spawn) { Sv().spawn(game, it.kind, (it.data && it.data.n) || 1, c.x + 0.5 + n * 0.1, c.z + 0.5, { w: it.data ? it.data.w : undefined }); SB.World.remove(game.world, it); n++; }
    });
    T.spend(game, c, 3); if (p.setGoal) p.setGoal(null);
    emit("townPackFetched", { c: c, n: n });
    return ok("🎒 a quick smol ran out and fetched your pack for 3 " + mi(game) + ": it's at your feet");
  };
  T.passOut = function (game, c) {
    var h = home(game); if (!h) return no("");
    var fee = Math.min(T.purse(c), Math.max(1, r2(T.purse(c) * 0.1)));
    c.purse = r2(T.purse(c) - fee);
    c.x = h.x + (SK[h.kind].r || 1) + 0.8; c.z = h.z; c.chem.tired = 0.6; c.action = null;
    emit("townPassOut", { c: c, fee: fee });
    U.say(c, "💤 you nodded off on your feet. somebody carried you home" + (fee > 0 ? " (and kept " + fee + " " + mi(game) + " for the trouble)" : ""));
    return ok("");
  };
  T.portrait = function (game, c, who) {
    if (!home(game) || !H().at(game, c)) return no("you paint at home");
    if (!isSmol(who)) return no("nobody to paint");
    if (Sv().count(c, "berry") < 2 || Sv().count(c, "leaves") < 1) return no("a portrait takes 2 berries and a leaf");
    Sv().take(c, "berry", 2); Sv().take(c, "leaves", 1);
    T.keep(game, "portrait:" + who.id, "🖼", "a portrait of " + who.name);
    return ok("🖼 a portrait of " + who.name + ", in berry juice. it's on the wall");
  };
  T.front = function (game, id) {
    var s = st(game), i = -1; s.keeps.forEach(function (kp, n) { if (kp.id === id) i = n; });
    if (i < 0) return no("that isn't on your wall");
    var kp = s.keeps.splice(i, 1)[0]; s.keeps.unshift(kp); s.front = id;
    return ok("🖼 " + kp.name + ": pride of place, over the hearth (comfort +1)");
  };
  T.heat = function (game, c) {
    if (!H() || !H().has(game, "hearth")) return no("that takes a hearth");
    var s = st(game); s.heat = s.heat === "high" ? "low" : "high";
    T.sync(game);
    return ok(s.heat === "high" ? "🔥 the hearth is built up high: warmer mornings and a wider safe ring. it burns a stick from the chest each day" : "🔥 the hearth is banked low: no wood needed");
  };

  /* ---------------- your stall, the crate ---------------- */
  T.crateCap = function (game) { var f = st(game).fur; return f.crate ? (f.crate2 ? 12 : 6) : 0; };
  T.crateStash = function (game, c, i) { if (!T.crateCap(game) || !H().at(game, c)) return no("the trade crate is at home"); return stashInto(st(game).crate, c, i, T.crateCap(game)); };
  T.crateFetch = function (game, c, i) { if (!H().at(game, c)) return no("the trade crate is at home"); return fetchFrom(st(game).crate, c, i); };
  T.crateWorth = function (game) { var n = 0; st(game).crate.forEach(function (sl) { if (sl) n += T.worth(game, sl.k, sl) * sl.n; }); return r2(n); };
  T.shopRank = function (b) { return Math.min(3, Math.floor(((b && b.data && b.data.sold) || 0) / 10)); };
  T.shopSlots = function (b) { return 4 + 2 * T.shopRank(b); };
  function goods(b) { var d = b.data || (b.data = {}); if (!Array.isArray(d.goods)) d.goods = []; return d.goods; }
  function atShop(c, b) { return b && b.kind === "shop" && b.done && SB.dist(c.x, c.z, b.x, b.z) <= T.NEAR + SK.shop.r; }
  T.shopStock = function (game, c, b, i) { if (!atShop(c, b)) return no("your stall is over there"); if (T.worn(b)) return no("the stall is worn out: mend it first"); return stashInto(goods(b), c, i, T.shopSlots(b)); };
  T.shopTake = function (game, c, b, i) { if (!atShop(c, b)) return no("your stall is over there"); return fetchFrom(goods(b), c, i); };
  T.shopPrice = function (game, sl) { return r2(T.worth(game, sl.k, sl) / 0.6); };
  T.till = function (game, c, b) {
    if (!atShop(c, b)) return no("your stall is over there");
    var n = r2((b.data && b.data.till) || 0); if (n <= 0) return no("the till is empty. stock the stall and come back tomorrow");
    b.data.till = 0; T.earn(c, n);
    return ok("🏪 " + n + " " + mi(game) + " from the till");
  };
  function shopsDawn(game, parts) {
    var s = st(game), dn = day(game), tot = 0;
    T.all(game, "shop").forEach(function (b) {
      var g = goods(b), r = dice(game, "shop" + b.id + ":" + dn), n = 2 + T.shopRank(b) + (T.keeper(game, b) ? 2 : 0) + (s.advert === dn ? 2 : 0), made = 0;
      for (var q = 0; q < n; q++) {
        var live = []; g.forEach(function (sl, i) { if (sl) live.push(i); });
        if (!live.length) break;
        var i = live[Math.floor(r() * live.length)], sl = g[i];
        made += T.shopPrice(game, sl); sl.n--; if (sl.n <= 0) g[i] = null;
        b.data.sold = (b.data.sold || 0) + 1;
      }
      if (made > 0) {
        b.data.till = r2((b.data.till || 0) + made); tot += made;
        var owner = me() || (SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null), pool = owner ? U.guests(game) : [];
        if (pool.length && SB.Social && SB.Social.remember) { try { SB.Social.remember(game, pool[Math.floor(r() * pool.length)], owner, "fair", 2, "sold me something at a fair price", 3600, 12); } catch (e) {} }
      }
    });
    if (tot > 0) { parts.push("🏪 your stall took " + r2(tot) + " " + mi(game)); emit("townShopSales", { n: r2(tot) }); }
    if (s.crate.some(function (x) { return !!x; })) {
      var got = T.crateWorth(game), c = me() || (SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null);
      s.crate = [];
      if (s.fur.jar || !c) s.jar = r2(T.jar(game) + got); else T.earn(c, got);
      parts.push("📦 the crate sold overnight: " + got + " " + mi(game) + (s.fur.jar || !c ? " in the jar" : ""));
      emit("townCrateSold", { n: got });
    }
  }

  /* ---------------- more buildings ---------------- */
  var DEFS = {
    camp: { noun: "shelter", label: "camp", emoji: "⛺", r: 0.8, cost: {}, work: 1, desc: "a tent, a bedroll and a ring of stones. sleep here; your home chest is in the pack." },
    tradecamp: { noun: "wonder", label: "trader's camp", emoji: "🛒", r: 0.8, cost: {}, work: 1, desc: "somebody from away, with things to sell. they stay a day or two." },
    shop: { noun: "material", label: "your stall", emoji: "🏪", r: 0.7, cost: { stick: 6, fiber: 2 }, work: 8, desc: "a counter of your own. stock it from your bag: the tribe buys overnight, at the going price. the more it sells, the bigger it gets." },
    signalfire: { noun: "fire", label: "signal fire", emoji: "🔥", r: 0.6, cost: { stone: 4, stick: 6 }, work: 8, desc: "a tall pile on the shore. light it and a trading raft comes in the next morning." },
    watchfire: { noun: "fire", label: "watchfire", emoji: "🔥", r: 0.5, cost: { stone: 4, stick: 4 }, work: 8, desc: "an iron basket of fire on a post. grumps won't come near it, and smols by it at night are less afraid." },
    bell: { noun: "totem", label: "town bell", emoji: "🔔", r: 0.5, cost: { stick: 4, metal: 1, parts: 1 }, work: 8, desc: "it rings itself at dusk to call everyone home, and when a trip-plate or a grump sets it off." },
    plate: { noun: "stone", label: "trip-plate", emoji: "🔲", r: 0.4, cost: { stone: 2, parts: 1 }, work: 3, desc: "a flat stone on a spring. a grump that steps near it rings the bell." },
    feeder: { noun: "material", label: "feeder", emoji: "🥣", r: 0.45, cost: { stick: 4, parts: 1 }, work: 5, desc: "fill it with food. each morning it feeds whoever nearby is hungriest." },
    rod: { noun: "material", label: "lightning rod", emoji: "📍", r: 0.3, cost: { metal: 2, stick: 2 }, work: 5, desc: "a copper spike on a pole. lightning nearby hits it and not the trees or the huts." },
    waterwheel: { noun: "material", label: "waterwheel", emoji: "🎡", r: 0.9, cost: { stick: 8, stone: 2 }, work: 14, desc: "it has to stand by water. nearby farms grow faster and a bakery near it bakes one more loaf." },
    beaconlamp: { noun: "fire", label: "great lantern", emoji: "🏮", r: 0.6, cost: { stone: 4, crystal: 2, mote: 1 }, work: 12, desc: "a mote of the grumps' light in crystal. smols a long way round tire less and fear less." },
    tidestone: { noun: "totem", label: "tide stone", emoji: "🌊", r: 0.5, cost: { stone: 5, clam: 2 }, work: 8, desc: "a shore shrine. smols near it shrug off the cold and the wet." },
    clock: { noun: "wonder", label: "sun clock", emoji: "🕰", r: 0.8, cost: { stone: 10, metal: 4, crystal: 3 }, work: 30, desc: "a wonder. while it stands nothing of yours wears out." },
    wordpost: { noun: "totem", label: "word post", emoji: "📯", r: 0.35, cost: { stick: 3, stone: 1 }, work: 4, desc: "push it and it says a doing-word. smols who hear it learn the word." },
    feelpost: { noun: "totem", label: "feelings post", emoji: "💭", r: 0.35, cost: { stick: 3, clay: 1 }, work: 4, desc: "push it and it says a feeling: hungry, scared, cold, sick. smols who hear it learn to say so." },
    dorm: { noun: "shelter", label: "kids' hut", emoji: "🛏", r: 1.0, cost: { stick: 8, fiber: 3, leaves: 4 }, work: 14, desc: "a sleep hut for the little ones. four more beds, and no kid near it is lonely in the morning." },
    treehouse: { noun: "shelter", label: "treehouse", emoji: "🌳", r: 0.8, cost: { stick: 8, vine: 3 }, work: 12, desc: "a platform up a tree with a roof. kids pile in. you can sleep up there too." },
    playground: { noun: "toy", label: "toy corner", emoji: "🧸", r: 0.6, cost: { stick: 4, stone: 2 }, work: 5, desc: "a sand pit and a box for toys. put toys in it: the more there are, the happier the kids near it." },
    pond: { noun: "water", label: "garden pond", emoji: "🦆", r: 0.9, cost: { stone: 6, clay: 2 }, work: 10, desc: "a dug pond with reeds. have a dip; smols near it keep cool; a fish to take now and then." },
    statue: { noun: "totem", label: "statue", emoji: "🗿", r: 0.5, cost: { stone: 6 }, work: 12, desc: "carved to remember the latest thing in the island's chronicle." },
    banner: { noun: "totem", label: "banner", emoji: "🚩", r: 0.3, cost: { stick: 2, fiber: 2 }, work: 3, desc: "the tribe's colours on a pole. smols near it stand a bit taller." }
  };
  var META2 = {
    camp: { group: "camp", roof: 1 }, shop: { group: "town", gate: "market" }, signalfire: { group: "town", gate: "campfire" }, watchfire: { group: "town", gate: "torch" },
    bell: { group: "town", gate: "smelt" }, plate: { group: "town", gate: "smelt" }, feeder: { group: "town", gate: "farm" }, rod: { group: "town", gate: "smelt" }, waterwheel: { group: "town", gate: "farm" },
    beaconlamp: { group: "town", gate: "torch" }, tidestone: { group: "town", gate: "totem" }, clock: { group: "town", gate: "writing" }, wordpost: { group: "town" }, feelpost: { group: "town" },
    dorm: { group: "town", gate: "hut", roof: 1 }, treehouse: { group: "yard", c: 2, max: 1, roof: 1 }, playground: { group: "yard", c: 1, max: 1 }, pond: { group: "yard", c: 2, max: 1 },
    statue: { group: "yard", c: 2, max: 2 }, banner: { group: "yard", c: 1, max: 1 }
  };
  (function register() {
    var I = SB.Ideas;
    for (var k in DEFS) {
      var okc = true; for (var m in DEFS[k].cost) if (!K[m]) okc = false;
      if (!okc) continue;
      if (!SK[k]) SK[k] = DEFS[k];
      if (META2[k] && !T.META[k]) T.META[k] = META2[k];
      if (I && I.forStruct && !I.forStruct[k]) I.forStruct[k] = "hut";
    }
  })();
  var rename0 = T.rename;
  T.rename = function (game, b) { return b && !mine(game, b) ? no("that isn't yours to name") : rename0(game, b); };
  var names0 = T.namesFor;
  T.namesFor = function (game, b) { return b.kind === "banner" ? ["the berry banner", "the two fish banner", "the star banner", "the striped banner", "the lantern banner"] : names0(game, b); };
  T.wearK = function (game, b) {
    if (b.kind === "camp" || b.kind === "tradecamp") return 0;
    if (T.all(game, "clock").length) return 0;
    var k = 1;
    if (H() && H().is(game, b)) { if (T.lookOf(game, "wall") === "stone") k *= 0.5; if (T.lookOf(game, "roof") === "tile") k *= 0.5; if (T.lookOf(game, "base") === "stone") k *= 0.75; }
    return k;
  };
  T.wheelOk = function (game, b) { return nearWater(game, b.x, b.z, 6); };
  // fences and palisades round the home make a walled yard
  T.walled = function (game) {
    var h = home(game); if (!h) return false;
    var q = {}, n = 0;
    game.world.structures.forEach(function (b) { if (!b.done || (b.kind !== "fence" && b.kind !== "wall") || SB.dist(b.x, b.z, h.x, h.z) > T.YARD) return; n++; q[(b.x > h.x ? 1 : 0) + (b.z > h.z ? 2 : 0)] = 1; });
    return n >= 4 && Object.keys(q).length >= 3;
  };
  T.warmFloor = function (game) { var h = home(game), W = SB.World; if (!h || !W.nodesNear) return false; try { return W.nodesNear(game.world, h.x, h.z, 10, function (n) { return n.kind === "vent"; }).length > 0; } catch (e) { return false; } };
  T.parks = function (game) {
    var PK = { bench: 1, flowerbed: 1, statue: 1, pond: 1, swing: 1, playground: 1 }, L = structs(game, function (b) { return b.done && PK[b.kind]; }), out = [];
    L.forEach(function (b) { if (out.some(function (p) { return SB.dist(p.x, p.z, b.x, b.z) < 10; })) return; var n = L.filter(function (o) { return SB.dist(o.x, o.z, b.x, b.z) < 10; }).length; if (n >= 3) out.push({ x: b.x, z: b.z, n: n }); });
    return out;
  };

  /* comfort, the chest and the ring: the first half's numbers plus this half's */
  var comfort0 = T.comfort, sync0 = T.sync;
  T.comfort = function (game) {
    var cf = comfort0(game), h = home(game); if (!h) return cf;
    var s = st(game), p = cf.parts, L = T.mates(game), a = 0, cat;
    p.looks = 0; for (cat in T.LOOKS) if (T.lookOf(game, cat) !== T.LOOKS[cat][0].id) p.looks++;
    if (T.matching(game)) p.looks += 2;
    for (var k in s.addon) a++;
    p.addons = 2 * a;
    p.company = 0; L.slice(0, 3).forEach(function (m) { p.company += m.role === "partner" ? 3 : 2; });
    if (T.crowded(game)) p.company -= 3;
    p.dirt = -Math.min(3, Math.floor(num(s, "dirt") / 3));
    p.extras = (T.walled(game) ? 2 : 0) + (T.warmFloor(game) ? 1 : 0) + (s.front ? 1 : 0);
    var n = Math.max(0, cf.n + p.looks + p.addons + p.company + p.dirt + p.extras), step = 0;
    for (var i = 0; i < T.STEPS.length; i++) if (n >= T.STEPS[i][0]) step = i;
    return { n: n, step: step, name: T.STEPS[step][1], next: T.STEPS[step + 1] || null, parts: p };
  };
  T.sync = function (game) {
    sync0(game);
    var Hm = H(), h = home(game); if (!Hm) return;
    if (!h) { T.YARD = 12; return; }
    var s = st(game);
    T.YARD = s.plot ? 16 : 12;
    Hm.CHEST += (s.fur.pegrack ? 4 : 0) + (s.addon.cellar ? 6 : 0);
    Hm.SAFE += (s.fur.doorbar ? 2 : 0) + (T.keeper(game, h) ? 3 : 0) + (T.walled(game) ? 1 : 0) + (s.heat === "high" ? 2 : 0) + (T.lookOf(game, "wall") === "crystal" ? 1 : 0) + (T.yard(game).beaconlamp ? 2 : 0);
  };

  /* ---------------- gadgets you work by hand ---------------- */
  T.toggle = function (game, c, b) {
    if (!b || (b.kind !== "watchfire" && b.kind !== "bell")) return no("nothing to switch");
    var d = b.data || (b.data = {}); d.off = d.off ? 0 : 1;
    return ok(b.kind === "bell" ? (d.off ? "🔕 the bell is muffled: it won't ring by itself" : "🔔 the bell is free to ring again") : (d.off ? "🪵 the watchfire is banked: dark, and no use against grumps" : "🔥 the watchfire is stoked up bright"));
  };
  T.ring = function (game, b, why) {
    var c0 = centre(game), n = 0;
    game.creatures.forEach(function (o) {
      if (!isSmol(o) || o.asleep || o === me() || SB.dist(o.x, o.z, b.x, b.z) > 45) return;
      n++;
      if (why === "grump") o.chem.fear = Math.min(1, (o.chem.fear || 0) + 0.05);
      if (!game.offline && SB.Creature.sendTo && SB.dist(o.x, o.z, c0.x, c0.z) > 12 && (!SB.Social || !SB.Social.free || SB.Social.free(o))) SB.Creature.sendTo(o, c0.x + (n % 5) - 2, c0.z + ((n * 3) % 5) - 2, game, 40);
    });
    b.data.rang = Math.round(game.time);
    if (SB.Audio && SB.Audio.play && !(P() && P().headless) && !game.headless) SB.Audio.play("chime");
    emit("townBell", { st: b, why: why, n: n });
    return n;
  };
  T.fill = function (game, c, b) {
    if (!b || b.kind !== "feeder" || !T.works(b)) return no("that takes a working feeder");
    var v = Sv().inv(c), sl = v.s[v.sel];
    if (!sl || !Sv().edible || !Sv().edible(sl.k)) return no("hold something to eat");
    var d = b.data || (b.data = {}); if (d.stockKind && d.stockKind !== sl.k && d.stock > 0) return no("it has " + label(d.stockKind) + " in it: one kind at a time");
    if ((d.stock || 0) >= 12) return no("the feeder is full");
    var n = Math.min(sl.n, 12 - (d.stock || 0)); d.stockKind = sl.k; d.stock = (d.stock || 0) + n;
    sl.n -= n; if (sl.n <= 0) v.s[v.sel] = null;
    return ok("🥣 " + n + " " + label(d.stockKind) + " in the feeder");
  };
  T.addToy = function (game, c, b) {
    var v = Sv().inv(c), sl = v.s[v.sel];
    if (!b || b.kind !== "playground") return no("");
    if (!sl || !(T.TOYS[sl.k] || sl.k === "ball" || sl.k === "plush")) return no("hold a toy to put in the box");
    if ((b.data.toys || 0) >= 5) return no("the toy box is full");
    sl.n--; if (sl.n <= 0) v.s[v.sel] = null;
    b.data.toys = (b.data.toys || 0) + 1;
    return ok("🧸 in the box. " + b.data.toys + " of 5 toys: kids near it are happier for each one");
  };
  var WORDS1 = SB.VERB_WORDS || [], WORDS2 = ["hungry", "scared", "cold", "sick", "tired", "lonely", "hot", "ouch"];
  T.push = function (game, c, b) {
    if (!b || (b.kind !== "wordpost" && b.kind !== "feelpost") || !T.works(b)) return no("");
    var d = b.data || (b.data = {}), L = (b.kind === "wordpost" ? WORDS1 : WORDS2).filter(function (w) { return SB.LEXICON && SB.LEXICON[w]; });
    if (!L.length) return no("it has nothing to say");
    if (d.pushT && game.time - d.pushT < 15) return no("it's still humming. give it a moment");
    d.pushT = Math.round(game.time); d.wi = ((d.wi == null ? -1 : d.wi) + 1) % L.length;
    var w = L[d.wi], n = 0;
    game.creatures.forEach(function (o) { if (isSmol(o) && !o.asleep && SB.dist(o.x, o.z, b.x, b.z) < 6 && SB.Creature.learnWord) { try { SB.Creature.learnWord(o, w, 0.3, game); n++; } catch (e) {} } });
    emit("townWord", { st: b, word: w, n: n });
    return ok(SK[b.kind].emoji + " the post says “" + w + "”. " + (n ? n + (n === 1 ? " smol was" : " smols were") + " listening" : "nobody near enough to hear"), { word: w });
  };
  T.dip = function (game, c, b) {
    c.chem.hot = lower(c.chem.hot, 0.4); T.played(game, c, "dip"); freshen(game, c, "");
    if (SB.Creature.emote) SB.Creature.emote(c, "happy", 1.5);
    return ok("🦆 a splash about in the pond. cool, clean and cheerful");
  };

  /* ---------------- every morning, this half ---------------- */
  function mineOrMe(game) { return me() || (SB.Mine && SB.Mine.get ? SB.Mine.get(game) : null); }
  function chestTake(game, kinds) { var ch = H().chest(game); for (var i = 0; i < ch.length; i++) if (ch[i] && kinds.indexOf(ch[i].k) >= 0) { ch[i].n--; if (ch[i].n <= 0) ch[i] = null; return true; } return false; }
  function homeDawn(game, parts) {
    var h = home(game), s = st(game), dn = day(game), winter = game.world.season === 3; if (!h) return;
    var L = T.mates(game), helpers = L.length + (s.fur.helper && dn % 5 !== 0 ? 1 : 0), Hm = H(), role = T.role(game); // (a clay helper rests by the crystal every fifth day)
    if (role && dn % 3 === 0 && K[ROLE_GIFT[role]]) give(game, ROLE_GIFT[role], 1);
    if (s.addon.kitchen) {
      if (K.cooked) give(game, "cooked", 1);
      if (Hm.has(game, "chest")) { var ch = Hm.chest(game), done = 0; for (var i = 0; i < ch.length && done < 2; i++) while (done < 2 && ch[i] && (ch[i].k === "fish" || ch[i].k === "meat" || ch[i].k === "clam")) { ch[i].n--; if (ch[i].n <= 0) ch[i] = null; give(game, "cooked", 1); done++; } }
    }
    if (s.addon.workshop && h.data && h.data.dmg > 0) h.data.dmg = Math.max(0, r2(h.data.dmg - 0.08));
    if (s.addon.greenhouse) { if (K.herb) give(game, "herb", 1); if (winter && K.carrot) give(game, "carrot", 1); }
    if (s.addon.glowcorner && K.glowcap) give(game, "glowcap", 1);
    if (s.addon.roost && K.apple) give(game, "apple", 1);
    // dirt comes in on paws; anyone living with you (or a clay helper) sweeps
    s.dirt = Math.max(0, Math.min(9, num(s, "dirt") + 1 - 2 * helpers));
    if (s.fur.helper) { s.helperD = num(s, "helperD") + 1; if (Hm.has(game, "chest") && s.plot) T.clearPlot(game, { tier: 2 }); }
    L.forEach(function (m) {
      var o = SB.Game.byId(game, m.id);
      if (Hm.has(game, "garden") && K.berry) give(game, "berry", 1);
      if (m.role === "partner" && K.cooked) give(game, "cooked", 1);
      if (h.data && h.data.dmg > 0) h.data.dmg = Math.max(0, r2(h.data.dmg - 0.03));
      if (!game.offline && SB.Creature.sendTo && o !== me() && !o.asleep) SB.Creature.sendTo(o, h.x + 1.4, h.z + 1, game, 40);
    });
    if (s.heat === "high" && !L.length && !(Hm.has(game, "chest") && chestTake(game, ["stick", "firewood", "log", "plank"]))) { s.heat = "low"; parts.push("🔥 no wood in the chest: the hearth burned down low"); }
    var c = mineOrMe(game);
    if (c) {
      if (T.perk(c, "yield")) give(game, T.SPEC_BY[c.spec].job === "fisher" && K.fish ? "fish" : "berry", 1);
      // little ones of your own leave a drawing
      game.creatures.forEach(function (o) { if (isSmol(o) && o.stage != null && o.stage <= 2 && o.parents && o.parents.indexOf(c.id) >= 0 && SB.dist(o.x, o.z, h.x, h.z) < 30 && T.keep(game, "draw:" + o.id, "🖍", "a drawing by " + o.name + ": you, mostly legs")) { c.chem.lonely = lower(c.chem.lonely, 0.3); parts.push("🖍 " + o.name + " left you a drawing"); } });
      var partner = c.partner != null ? SB.Game.byId(game, c.partner) : null;
      if (partner && partner.alive && !L.some(function (m) { return m.id === partner.id; }) && Hm.at(game, c)) c.chem.lonely = Math.min(1, (c.chem.lonely || 0) + 0.1);
    }
    if (s.fur.thinkstone && c && Hm.at(game, c)) { var d = U.ideaFor(game, c); if (d) { try { SB.Ideas.learn(c, d.id, 0.34, game, "dreamed by the thinking crystal"); } catch (e) {} s.dreams = num(s, "dreams") + 1; } }
  }
  function townDawn(game, parts) {
    var s = st(game), dn = day(game), e = era(game), winter = game.world.season === 3;
    var smols = game.creatures.filter(isSmol), adults = smols.filter(function (o) { return o.stage == null || o.stage >= 3; }), c = mineOrMe(game);
    // the jar earns a little once there is a market to lend it to; the council puts a tithe by
    if (s.fur.jar && e >= 2 && T.jar(game) > 0) s.jar = r2(T.jar(game) + Math.min(2, T.jar(game) * 0.02));
    if (e >= 2 && (home(game) || c)) { var lead = !!(c && game.civ && game.civ.council && game.civ.council.leader === c.id); s.tithe = Math.min(20, r2(num(s, "tithe") + 0.1 * adults.length * (lead ? 2 : 1))); }
    // elders get their share: a meal from the store, and a few shells if they had a trade
    var gran = e >= 1 || !!home(game) || structs(game, function (b) { return b.done && (b.kind === "granary" || b.kind === "storehouse"); }).length > 0, pens = 0;
    smols.forEach(function (o) {
      if (o.stage === 4 && gran) { o.chem.hunger = lower(o.chem.hunger, 0.25); pens++; if (T.trade(o) && T.xpOf(o, T.trade(o)) >= 4) T.earn(o, 1); }
      var j = T.trade(o); if (j && o !== c && o.stage >= 3 && !T.promoteWhy(game, o, j)) { if (!o.rank || typeof o.rank !== "object") o.rank = {}; o.rank[j] = T.rankOf(o, j) + 1; }
      if (o.hireT && o.hireT <= game.time) { o.hireT = 0; o.hireBy = null; }
    });
    s.pension = pens;
    if (c && T.trade(c) && !T.promoteWhy(game, c, T.trade(c))) { var pr = T.promote(game, c, T.trade(c)); if (pr.ok) parts.push(pr.msg); }
    // mess after a feast, a raid or market day; whoever keeps a building picks some up
    var keepers = structs(game, function (b) { return b.done && !!T.keeper(game, b); }).length;
    s.mess = Math.max(0, num(s, "mess") - keepers);
    if (s.mess >= 3) smols.slice(0, 40).forEach(function (o) { o.chem.bored = Math.min(1, (o.chem.bored || 0) + 0.03); });
    game.world.structures.forEach(function (b) {
      if (!b.done || !SK[b.kind]) return;
      var k = T.keeper(game, b), d = b.data || (b.data = {});
      if (b.kind === "grave" && k) { d.tended = dn; smols.forEach(function (o) { if (SB.dist(o.x, o.z, b.x, b.z) < 10) o.chem.lonely = lower(o.chem.lonely, 0.1); }); }
      else if (b.kind === "kiln" && k) { d.fuel = Math.max(d.fuel || 0, 0.8); d.lit = true; }
      if (!T.META[b.kind] || !T.works(b)) return;
      if (b.kind === "feeder" && d.stock > 0) {
        var best = null, bv = 0.45, med = K[d.stockKind] && K[d.stockKind].noun === "medicine";
        smols.forEach(function (o) { var v = med ? (o.chem.sick || 0) + 0.2 : o.chem.hunger || 0; if (SB.dist(o.x, o.z, b.x, b.z) < 14 && v > bv) { bv = v; best = o; } });
        if (best) { if (med) best.chem.sick = lower(best.chem.sick, 0.4); else best.chem.hunger = lower(best.chem.hunger, 0.4); d.stock--; d.fed = (d.fed || 0) + 1; if (SB.Creature.emote) SB.Creature.emote(best, "yum", 1.5); emit("townFed", { st: b, c: best, kind: d.stockKind }); }
      } else if (b.kind === "waterwheel" && T.wheelOk(game, b)) {
        game.world.structures.forEach(function (o) { if (!o.done || SB.dist(o.x, o.z, b.x, b.z) > 14) return; if (o.kind === "farm" && o.data && o.data.grow < 1) o.data.grow = Math.min(1, (o.data.grow || 0) + 0.15); else if (o.kind === "bakery" && T.works(o) && K.bread) U.addStock(o, "bread", 1, 6); });
        d.turned = dn;
      } else if ((b.kind === "wordpost" || b.kind === "feelpost") && SB.Creature.learnWord) {
        var L = (b.kind === "wordpost" ? WORDS1 : WORDS2).filter(function (w) { return SB.LEXICON && SB.LEXICON[w]; }), who = null, wd = null;
        smols.forEach(function (o) { if (who || SB.dist(o.x, o.z, b.x, b.z) > 8) return; for (var i = 0; i < L.length; i++) if (((o.vocab && o.vocab[L[i]]) || 0) < 1) { who = o; wd = L[i]; return; } });
        if (who) { try { SB.Creature.learnWord(who, wd, 0.5, game); d.taught = (d.taught || 0) + 1; } catch (e2) {} }
      } else if (b.kind === "pond" && dn % 3 === 0 && K.fish && !winter) U.addStock(b, "fish", 1, 3);
      else if (b.kind === "playground" && (d.toys || 0) < 5 && adults.some(function (o) { return SB.dist(o.x, o.z, b.x, b.z) < 20; }) && dn % 2 === 0) d.toys = (d.toys || 0) + 1;
      else if (b.kind === "dorm" || b.kind === "treehouse") { var n = 0; smols.forEach(function (o) { if (o.stage != null && o.stage <= 2 && SB.dist(o.x, o.z, b.x, b.z) < 12) { o.chem.lonely = lower(o.chem.lonely, 0.3); o.chem.bored = lower(o.chem.bored, 0.2); n++; } }); if (n >= 2) { d.sleepovers = (d.sleepovers || 0) + 1; emit("townSleepover", { st: b, n: n }); } }
      else if (b.kind === "statue" && !b.name) T.carve(game, b);
    });
  }
  T.carve = function (game, b) {
    var ch = game.chronicle || [], e = ch[ch.length - 1], txt = e ? (Array.isArray(e) ? e[2] : e.txt || e.text) : null;
    b.name = "statue: " + (txt || "the day " + (b.founder || "somebody") + " built a statue");
    return b.name;
  };
  function dawn2() {
    var game = cur(); if (!game || !game.quests || !game.world) return;
    if (!game.quests.town && !home(game) && era(game) < 1) return;
    var s = st(game), dn = day(game);
    if (s.lastDawn2 === dn) return;
    s.lastDawn2 = dn;
    var parts = [];
    try { homeDawn(game, parts); townDawn(game, parts); shopsDawn(game, parts); callersDawn(game, parts); newAsks(game); if (s.advert === dn && home(game)) T.visit(game, true); } catch (e) { if (typeof console !== "undefined" && console.warn) console.warn("town dawn:", e); }
    T.sync(game);
    s.morning = parts.join(" · ");
    var c = me();
    if (c && parts.length) U.say(c, parts.slice(0, 3).join(" · "));
    emit("townDayEnd", { parts: parts });
  }
  function dusk2() {
    var game = cur(); if (!game || !game.quests || !game.quests.town) return;
    T.all(game, "bell").forEach(function (b) { if (!b.data.off) T.ring(game, b, "dusk"); });
    if (allBeaten(game)) T.callTrader(game, "grump");
    var s = st(game);
    if (!game.offline && SB.Creature.sendTo) structs(game, function (b) { return b.done && (b.kind === "dorm" || b.kind === "treehouse") && T.works(b); }).slice(0, 2).forEach(function (b) {
      game.creatures.forEach(function (o) { if (isSmol(o) && o.stage != null && o.stage >= 1 && o.stage <= 2 && o !== me() && SB.dist(o.x, o.z, b.x, b.z) < 25) SB.Creature.sendTo(o, b.x + 0.8, b.z + 0.6, game, 40); });
    });
    void s;
  }
  // waking at home: the roof, the hour you went to bed, how you have been playing
  function rested2(d) {
    var game = cur(), c = d && d.c; if (!game || !c || !home(game)) return;
    var s = st(game), h = home(game), bits = [];
    if (T.worn(h)) { c.chem.health = Math.max(0.3, c.chem.health - 0.15); c.snug = 0; c.snugT = 0; bits.push("🪵 a bit of the roof came down on you in the night. mend it"); emit("townRoofFell", { c: c }); }
    else if (num(s, "bedT") > 0 && c.snugT > game.time) {
      var slept = game.time - s.bedT;
      if (slept >= SB.DAY_LENGTH * 0.3) { c.snugT += SB.DAY_LENGTH * 0.15; bits.push("🌙 early to bed: the good mood lasts longer"); }
      else if (slept < SB.DAY_LENGTH * 0.12) { c.snugT -= SB.DAY_LENGTH * 0.3; bits.push("🥱 a late night: it won't last as long"); }
    }
    s.bedT = 0;
    if (T.lookOf(game, "roof") === "thatch" || T.lookOf(game, "bed") !== "leaves" || s.heat === "high" || T.warmFloor(game)) c.chem.cold = lower(c.chem.cold, 0.3);
    var v = T.variety(game, c), want = T.expects(game);
    if (v >= want) c.chem.bored = lower(c.chem.bored, 0.15); else if (d.me && (c.chem.bored || 0) > 0.3) bits.push("🎈 " + c.name + " wants more kinds of play (" + v + " of " + want + " lately)");
    if (L2(game).some(function (m) { var o = SB.Game.byId(game, m.id); return o && SB.Ideas && SB.Ideas.known && SB.Ideas.known(o, "song"); })) c.chem.bored = lower(c.chem.bored, 0.15);
    if (d.me && bits.length) U.say(c, bits.join(" · "));
    if (d.me) { emit("townWoke", { c: c, bits: bits }); var p = P(); if (SB.Save && SB.Save.save && !game.headless && !(p && p.headless)) { try { SB.Save.save(game); s.savedD = day(game); } catch (e) {} } }
  }
  function L2(game) { return T.mates(game); }

  /* ---------------- the slow tick ---------------- */
  var AURA = { pond: 6, playground: 6, treehouse: 6, banner: 6, statue: 5, beaconlamp: 14, tidestone: 10, watchfire: 7, camp: 4 };
  var tT = 0, sT = 0, aT = 0;
  function slow(game, step) {
    var list = structs(game, function (b) { return b.done && (!!AURA[b.kind] || b.kind === "bell" || b.kind === "plate") && T.works(b); }), night = !!game.world.night, cs = game.creatures, c = me(), s = st(game);
    var lighter = structs(game, function (b) { return b.kind === "lamp" && b.done && !!T.keeper(game, b); }).length > 0, lamps = lighter && night ? T.all(game, "lamp") : [];
    var swings = T.all(game, "swing"), grumps = [], i, j;
    for (i = 0; i < cs.length; i++) {
      var o = cs[i]; if (!o.alive) continue;
      if (o.species === "grump") { grumps.push(o); continue; }
      if (o.species !== "smol") continue;
      var ch = o.chem;
      if (o.hireT > game.time && c && o.hireBy === c.id && !game.offline && !o.asleep && SB.dist(o.x, o.z, c.x, c.z) > 6 && SB.Creature.sendTo) SB.Creature.sendTo(o, c.x + 1, c.z + 1, game, 20);
      if (o.blessT > game.time) { if (ch.health < 1) ch.health = Math.min(1, ch.health + 0.004 * step); ch.fear = lower(ch.fear, 0.01 * step); }
      if (poorly(o)) for (j = 0; j < swings.length; j++) if (SB.dist(o.x, o.z, swings[j].x, swings[j].z) <= 5) ch.bored = Math.min(1, (ch.bored || 0) + (o.stage != null && o.stage < 3 ? 0.02 : 0.005) * step);
      for (j = 0; j < lamps.length; j++) if (SB.dist(o.x, o.z, lamps[j].x, lamps[j].z) <= 10) ch.fear = lower(ch.fear, 0.008 * step);
      for (j = 0; j < list.length; j++) {
        var b = list[j], R = AURA[b.kind]; if (!R) continue;
        if (Math.abs(o.x - b.x) > R || Math.abs(o.z - b.z) > R || SB.dist(o.x, o.z, b.x, b.z) > R) continue;
        var kid = o.stage != null && o.stage < 3;
        if (b.kind === "pond") { ch.hot = lower(ch.hot, 0.012 * step); ch.bored = lower(ch.bored, 0.004 * step); }
        else if (b.kind === "playground") { if (kid) ch.bored = lower(ch.bored, (0.008 + 0.004 * (b.data.toys || 0)) * step); }
        else if (b.kind === "treehouse") { if (kid) { ch.bored = lower(ch.bored, 0.012 * step); ch.lonely = lower(ch.lonely, 0.006 * step); } }
        else if (b.kind === "banner") ch.fear = lower(ch.fear, 0.006 * step);
        else if (b.kind === "statue") ch.bored = lower(ch.bored, 0.004 * step);
        else if (b.kind === "beaconlamp") { ch.tired = lower(ch.tired, 0.003 * step); ch.fear = lower(ch.fear, 0.008 * step); }
        else if (b.kind === "tidestone") { ch.cold = lower(ch.cold, 0.012 * step); ch.fear = lower(ch.fear, 0.004 * step); if (o.body && o.body.wet > 0) o.body.wet = Math.max(0, o.body.wet - 0.02 * step); }
        else if (b.kind === "watchfire") { if (!b.data.off && night) ch.fear = lower(ch.fear, 0.012 * step); }
      }
    }
    // grumps: watchfires turn them, plates and bells hear them
    var rang = false;
    for (i = 0; i < grumps.length; i++) {
      var g = grumps[i];
      for (j = 0; j < list.length; j++) {
        var w = list[j], dd = SB.dist(g.x, g.z, w.x, w.z);
        if (w.kind === "watchfire" && !w.data.off && !g.boss && dd < 7) { g.chem.fear = Math.min(1, (g.chem.fear || 0) + 0.1 * step); w.data.scared = (w.data.scared || 0) + 1; }
        else if ((w.kind === "plate" && dd < 3.5) || (w.kind === "bell" && dd < 8)) rang = true;
      }
    }
    if (rang && game.time - num(s, "alarmT") > 60) {
      s.alarmT = Math.round(game.time);
      var bells = list.filter(function (x) { return x.kind === "bell" && !x.data.off; });
      if (bells.length) T.ring(game, bells[0], "grump");
      emit("townAlarm", { bell: bells.length > 0 });
      note(game, bells.length ? "🔔 the bell! a grump tripped the alarm" : "🔲 a trip-plate clacked: a grump is about");
    }
    // a watchfire is a hearth away from home: a hunting grump gives up at it
    var p = P();
    if (c && p && p.scout && p.endScout) {
      var sg = p.scout();
      if (sg && !sg.boss && sg.scout && !sg.scout.done && !sg.scout.night && list.some(function (x) { return x.kind === "watchfire" && !x.data.off && SB.dist(c.x, c.z, x.x, x.z) < 7; })) p.endScout("🔥 the grump won't come near the watchfire. it slinks off", 1, "watchfire");
    }
    // colours come back after a load, and glow paste shows at night
    game.world.structures.forEach(function (b2) { if ((b2.data && (b2.data.paint != null || b2.data.glow)) || pinned(b2) || (H() && H().is(game, b2))) applyTint(game, b2); if (b2.data && b2.data.glow && night && b2.done) for (var q = 0; q < cs.length; q++) { var o2 = cs[q]; if (o2.alive && o2.species === "smol" && Math.abs(o2.x - b2.x) < 5 && Math.abs(o2.z - b2.z) < 5) o2.chem.fear = lower(o2.chem.fear, 0.006 * step); } });
  }
  T.slow = slow; // for tests
  T.tick2 = function (game, dt) {
    if (!game || game.offline) return;
    if ((tT -= dt) > 0) return;
    var step = 1 - tT; tT = 1;
    var c = me(), s = game.quests && game.quests.town ? st(game) : null;
    if (c && s) {
      if (c.asleep && !aT) { aT = 1; if (H() && H().at(game, c)) s.bedT = Math.round(game.time); } else if (!c.asleep) aT = 0;
      if (s.fur.heartlamp && H() && H().at(game, c) && c.chem.health < 1) c.chem.health = Math.min(1, c.chem.health + 0.004 * step);
      if (game.world.night && !c.asleep && c.chem.tired >= 0.98 && home(game) && !H().at(game, c) && game.time - num(s, "outT") > 120) { s.outT = Math.round(game.time); T.passOut(game, c); }
    }
    if ((sT -= step) > 0) return;
    sT = 4;
    if (s || home(game)) slow(game, 4);
  };

  /* ---------------- hooks ---------------- */
  (function hook() {
    if (!SB.bus) return;
    SB.bus.on("dawn", dawn2);
    SB.bus.on("dusk", dusk2);
    SB.bus.on("homeRested", rested2);
    ["townTook", "povEat", "fish", "soldByHand", "craft", "townToolFixed", "deliver", "townMended", "townBought", "townRead", "townService", "grumpChased", "townLook", "townNamed", "townHealed", "townSong", "townOffering"].forEach(tally);
    // grumps drop shells, by how tough they were; seeing off a few earns a medal from the watch
    SB.bus.on("grumpChased", function (d) {
      var game = cur(), c = me(); if (!game || !c || !d || !d.g || (d.c && d.c !== c)) return;
      var s = st(game), n = (1 + (d.g.boss ? 4 : 0) + Math.floor((d.g.tier || 0) / 2)) * (s.charm.luck ? 2 : 1);
      T.earn(c, n); s.drops = num(s, "drops") + n; s.chased = num(s, "chased") + 1;
      if (s.chased % 3 === 0) s.medals = num(s, "medals") + 1;
      emit("townCoinDrop", { c: c, n: n });
    });
    SB.bus.on("incidentEnd", function (d) {
      var game = cur(), inc = d && d.inc; if (!game || !inc || !game.quests || !game.quests.town) return;
      var s = st(game);
      if (inc.id === "raid") { s.mess = num(s, "mess") + 2; if (me()) s.medals = num(s, "medals") + 1; }
      else if (inc.id === "feast") s.mess = num(s, "mess") + 3;
    });
    SB.bus.on("marketDayEnd", function () { var game = cur(); if (game && game.quests && game.quests.town) { var s = st(game); s.mess = num(s, "mess") + 1; } });
    // a fifth back at a stall you put shells into
    SB.bus.on("sale", function (d) { if (d && d.byHand && d.st && d.st.data && d.st.data.inv && d.buyer && d.buyer === me()) T.earn(d.buyer, r2(d.price * 0.2)); });
    // a good turn is remembered at every counter
    function favour() { var game = cur(); if (game && me() && game.quests && game.quests.town) { var s = st(game); s.favor = Math.min(2, num(s, "favor") + 1); } }
    SB.bus.on("captive", favour);
    SB.bus.on("nursed", function (d) { if (d && d.c && d.c === me()) favour(); });
    SB.bus.on("stranger", function () { var game = cur(); if (game && game.quests && game.quests.town && T.all(game, "inn").length) { var s = st(game); s.hosted = num(s, "hosted") + 1; } });
    // what a smol who lived or worked with you leaves behind
    SB.bus.on("death", function (d) {
      var game = cur(), o = d && d.c; if (!game || !o || o.species !== "smol" || !game.quests || !game.quests.town) return;
      var s = st(game), c = mineOrMe(game), was = s.mates.some(function (m) { return m.id === o.id; }), post = o.postId != null ? SB.World.structById(game.world, o.postId) : null;
      var close = was || (post && mine(game, post)) || (o.hireBy != null && c && o.hireBy === c.id);
      if (!close && c && SB.Social && SB.Social.opinion) { try { close = SB.Social.opinion(game, o, c) >= SB.Social.BEST; } catch (e) {} }
      if (!close || o === c) return;
      var n = r2(o.purse || 0); o.purse = 0;
      if (n > 0) { if (s.fur.jar || !c) s.jar = r2(T.jar(game) + n); else T.earn(c, n); }
      T.keep(game, "will:" + o.id, "📜", o.name + "'s last wish: " + (n > 0 ? n + " " + mi(game) + " and " : "") + "a pressed flower, left to you");
      emit("townWill", { from: o, n: n });
    });
    // where you fell: a marker with a line on it
    function fell(d) {
      var game = cur(), c = d && d.c; if (!game || !c || !SK.sign || !game.quests) return;
      var at = d.fell || { x: c.x, z: c.z }, s = st(game), old = s.fellId != null ? SB.World.structById(game.world, s.fellId) : null;
      if (old && old.data && old.data.fell) { SB.World.removeStructure(game.world, old); dirty(old); }
      var b = plant(game, "sign", at.x, at.z, { tribe: c.tribe, data: { pov: 1, fell: 1 }, name: c.name + " fell here on day " + day(game) });
      s.fellId = b.id;
      emit("townMarker", { st: b, c: c });
    }
    SB.bus.on("respawn", fell); SB.bus.on("knockout", fell);
    // stone often stands where sticks would not
    SB.bus.on("wrecked", function (d) {
      var game = cur(), b = d && d.st; if (!game || !b || b.done || !SK[b.kind] || !game.quests || !game.quests.town) return;
      if (b.kind === "camp" || b.kind === "tradecamp") { b.done = true; b.need = {}; b.noun = SK[b.kind].noun; b.data.wrecked = null; if (SB.World.markNode) SB.World.markNode(game.world, b); dirty(b); return; }
      var cost = SK[b.kind].cost || {}, stone = (game.quests.home && game.quests.home.id === b.id && T.lookOf(game, "wall") === "stone") || (!!T.META[b.kind] && (cost.stone || 0) > (cost.stick || 0));
      if (!stone || dice(game, "hold" + b.id + ":" + day(game))() >= 0.6) return;
      b.done = true; b.need = {}; b.noun = SK[b.kind].noun; b.data.wrecked = null; b.data.dmg = 0.3;
      if (SB.World.markNode) SB.World.markNode(game.world, b); dirty(b);
      note(game, "🧱 the " + T.nameOf(b) + " is only cracked: the stone held");
      emit("townHeld", { st: b });
    });
    SB.bus.on("built", function (d) { var game = cur(); if (game && d && d.st && d.st.kind === "statue" && !d.st.name) T.carve(game, d.st); });
    SB.bus.on("craft", function (d) {
      var game = cur(), c = d && d.c, k = d && d.item && d.item.kind;
      if (!game || !c || !d.pov || !k || !K[k] || !K[k].tool || !T.perk(c, "tool")) return;
      var v = Sv().inv(c), full = Sv().uses(k);
      for (var i = 0; i < v.s.length; i++) if (v.s[i] && v.s[i].k === k && v.s[i].w >= full && !v.s[i].sp) { v.s[i].w = Math.round(v.s[i].w * 1.25 * 1000) / 1000; v.s[i].sp = 1; break; }
    });
    var look0 = T.lookOut;
    T.lookOut = function (game, c, b) { var r = look0(game, c, b); emit("townLook", { c: c, st: b }); return r; };
    // more beds: a kids' hut; city houses take in another family each
    var Cv = SB.Civ, W = SB.World;
    if (Cv && Cv.room && !Cv._town2) {
      Cv._town2 = true; var rm0 = Cv.room;
      Cv.room = function (game) { var r = rm0(game); if (r === Infinity || !game || !game.world) return r; return r + 4 * T.all(game, "dorm").length + (era(game) >= 3 ? 2 * structs(game, function (b) { return b.kind === "house" && b.done; }).length : 0); };
    }
    if (W && W.lightning && !W._townRod) {
      W._townRod = true; var l0 = W.lightning;
      W.lightning = function (world, game, x, z, forced) {
        if (!forced && game && game.world === world) {
          var rods = T.all(game, "rod");
          for (var i = 0; i < rods.length; i++) if (SB.dist(rods[i].x, rods[i].z, x, z) < 16) {
            var rd = rods[i]; (world.bolts || (world.bolts = [])).push({ x: rd.x, z: rd.z, y: W.groundY ? W.groundY(world, rd.x, rd.z) + 1.5 : 0, t: 0.6 });
            rd.data.hits = (rd.data.hits || 0) + 1;
            emit("lightning", { x: rd.x, z: rd.z, node: null, rod: true });
            return;
          }
        }
        return l0.apply(this, arguments);
      };
    }
    if (SB.Wilds && SB.Wilds.BED) ["camp", "lodge", "inn", "treehouse", "dorm"].forEach(function (k) { SB.Wilds.BED[k] = 1; }); // sleep there and it is where you wake if you fall
    var X = SB.Ext; if (!X) return;
    X.on("tick", T.tick2);
    X.on("options", options2);
    X.on("damage", function (game, c) { var k = T.perk(c, "hit") ? 1.05 : 1; if (game.creatures.some(function (o) { return o.hireT > game.time && o.hireBy === c.id && o.alive && SB.dist(o.x, o.z, c.x, c.z) < 8; })) k *= 1.1; return k; });
    X.on("vitals", function (game, c) {
      var out = [], s = game.quests && game.quests.town ? st(game) : null;
      if (T.fresh(c, game)) out.push({ icon: "🫧", text: "fresh fur" });
      if (c.blessT > game.time) out.push({ icon: "🌿", text: "blessed" });
      if (s && s.carry && SK[s.carry.kind]) out.push({ icon: "🫳", text: "carrying a " + SK[s.carry.kind].label });
      if ((c.burn || 0) >= day(game)) out.push({ icon: "😮‍💨", text: "sick of " + c.burnJob + " work", bad: true });
      return out;
    });
  })();

  /* ---------------- looking at the new things, in a body ---------------- */
  function options2(game, c, r, o, x) {
    function act(fn, snd) { return function () { var res = fn(); if (res && res.msg) x.say(res.msg); if (res && res.ok && snd) x.audio(snd, 0.7); return !!(res && res.ok); }; }
    function tab(name) { return function () { x.openBag(name); return true; }; }
    var hk = x.hk, tier = c.tier;
    if (!r || r.type === "water") {
      // something in your paw that is for playing with, pitching or throwing
      var op = null;
      if (hk && T.TOYS[hk]) op = x.op(hk === "kite" ? "fly the kite" : hk === "drum" || hk === "flute" ? "play the " + label(hk) : "play with the " + label(hk), act(function () { return T.toy(game, c, hk); }, "chime"), null);
      else if (hk === "campkit" && tier >= 2 && !r) op = x.op("pitch camp here", act(function () { return T.pitch(game, c); }, "build"), null);
      else if (hk === "thunderpot") op = x.op("throw the thunder-pot", act(function () { return T.thunder(game, c); }), null);
      if (op) { if (!o.use) o.use = op; else if (!o.place) o.place = op; else if (!o.pick) o.pick = op; }
      if (r && r.type === "water" && !o.pick && !T.fresh(c, game)) o.pick = x.op("wash your fur", act(function () { return T.wash(game, c); }, "eat"), null);
      return;
    }
    if (r.type === "node" && r.ref && r.ref.kind === "vent") { var so = x.op("soak in the hot spring", act(function () { return T.soak(game, c); }, "eat"), null); if (!o.place) o.place = so; else if (!o.pick) o.pick = so; return; }
    if (r.type !== "struct" || !r.ref || !r.ref.done) return;
    var b = r.ref, k = b.kind, book = x.op("open the town book", tab("town"), null);
    if (T.META[k] && T.worn(b)) return;
    if (k === "tradecamp") { o.use = x.op("trade with " + (b.name || "the trader"), tab("town"), null); o.place = o.use; }
    else if (k === "camp") { o.use = x.op("sleep at the camp", act(function () { return T.sleepAt(game, c, b); }), null); o.place = x.op("open the camp's pack", tab("town"), null); }
    else if (k === "shop") { o.use = x.op((b.data && b.data.till > 0) ? "empty the till (" + r2(b.data.till) + ")" : "stock your stall", (b.data && b.data.till > 0) ? act(function () { return T.till(game, c, b); }, "craft") : tab("town"), null); o.place = book; }
    else if (k === "signalfire") { o.use = x.op("light the signal fire (2 sticks)", act(function () { return T.signal(game, c, b); }, "build"), null); o.place = book; }
    else if (k === "watchfire") { o.use = x.op(b.data && b.data.off ? "stoke the watchfire" : "bank the watchfire", act(function () { return T.toggle(game, c, b); }), null); o.place = book; }
    else if (k === "bell") { o.use = x.op("ring the bell", act(function () { var n = T.ring(game, b, "hand"); return ok("🔔 dong. " + (n ? n + " smols look up and head for the fire" : "nobody about to hear it")); }, "chime"), null); o.place = x.op(b.data && b.data.off ? "unmuffle the bell" : "muffle the bell", act(function () { return T.toggle(game, c, b); }), null); }
    else if (k === "feeder") { o.use = x.held && Sv().edible && Sv().edible(hk) ? x.op("put your " + label(hk) + " in the feeder", act(function () { return T.fill(game, c, b); }, "craft"), null) : x.no((b.data && b.data.stock > 0) ? "the feeder has " + b.data.stock + " " + label(b.data.stockKind) : "an empty feeder: hold some food"); o.place = book; }
    else if (k === "pond") { o.use = x.op("have a dip", act(function () { return T.dip(game, c, b); }, "eat"), null); o.place = b.data && b.data.stock > 0 ? x.op("take the " + label(b.data.stockKind), act(function () { return T.take(game, c, b); }, "craft"), null) : book; }
    else if (k === "treehouse" || k === "dorm") { o.use = x.op(k === "dorm" ? "sleep at the kids' hut" : "sleep in the treehouse", act(function () { return T.sleepAt(game, c, b); }), null); o.place = book; }
    else if (k === "playground") { o.use = x.held && (T.TOYS[hk] || hk === "ball" || hk === "plush") ? x.op("put your " + label(hk) + " in the toy box", act(function () { return T.addToy(game, c, b); }, "craft"), null) : x.op("play in the sand", act(function () { c.chem.bored = lower(c.chem.bored, 0.2); T.played(game, c, "sand"); return ok("🧸 a very good sand castle. briefly"); }), null); o.place = book; }
    else if (k === "statue") { o.use = x.op("read the statue", act(function () { return ok("🗿 " + (b.name || T.carve(game, b))); }), null); o.place = book; }
    else if (k === "wordpost" || k === "feelpost") { o.use = x.op("push the " + SK[k].label, act(function () { return T.push(game, c, b); }, "chime"), null); o.place = book; }
    else if (k === "banner") { o.use = x.op("change the banner", act(function () { return T.rename(game, b); }, "craft"), null); o.place = book; }
    else if (k === "rod" || k === "plate" || k === "waterwheel" || k === "beaconlamp" || k === "tidestone" || k === "clock") { o.use = x.no(k === "waterwheel" && !T.wheelOk(game, b) ? "a waterwheel with no water: it has to stand by a river or the sea" : k === "rod" ? "a lightning rod" + (b.data && b.data.hits ? ": hit " + b.data.hits + " times so far" : "") : SK[k].label); o.place = book; }
    else if (k === "hall" && game.civ && game.civ.council && game.civ.council.leader === c.id) { if (!o.place) o.place = x.op("sleep in the leader's room", act(function () { return T.sleepAt(game, c, b); }), null); }
    else if (k === "stall" && !o.pick && b.data && b.data.good) o.pick = x.op("put shells into this stall (5)", act(function () { return T.invest(game, c, b); }, "craft"), null);
  }
  T.options2 = options2;

  /* ---------------- one switch for every button of this half ---------------- */
  T.act = function (game, c, a, arg) {
    var v = T.vendors(game, c)[0] || null, b = T.nearest(game, c), h = home(game), none = no("nobody to trade with here"), who;
    switch (a) {
      case "buy": return v ? T.buyAt(game, c, v, arg) : none;
      case "sell": return v ? T.sellTo(game, c, v, +arg) : none;
      case "back": return T.buyBack(game, c, +arg);
      case "haggle": return v ? T.haggle(game, c, v) : none;
      case "serv": return v ? T.service(game, c, v, arg) : none;
      case "swap": return v ? T.swap(game, c, v, +arg) : none;
      case "medal": return v && table(v).medals ? T.medalBuy(game, c, arg) : none;
      case "pet": return v && SB.Animals ? T.sellPet(game, c, SB.Animals.all(game).filter(function (x) { return String(x.id) === String(arg); })[0], v) : none;
      case "barter": return T.campSiteNear(game, c) ? T.grumpBarter(game, c) : no("no grump camp here");
      case "work": return T.work(game, c, T.workplace(game, c));
      case "off": return T.dayOff(game, c);
      case "spec": return T.specialise(game, c, arg);
      case "ask": return T.handIn(game, c, +arg);
      case "tithe": return T.collect(game, c);
      case "tidy": return T.tidy(game, c);
      case "cups": return T.cupGame(game, c);
      case "fund": return T.fund(game, c, arg === "me" ? null : SB.Game.byId(game, +arg));
      case "order": return T.order(game, c, arg);
      case "pack": return T.fetchPack(game, c);
      case "paint": return T.paint(game, c, b, arg);
      case "turn": return T.turn(game, c, b);
      case "carry": return T.carry(game, c, b);
      case "setdown": return T.setDown(game, c);
      case "outpost": return T.outpost(game, c);
      case "barricade": return T.barricade(game, c);
      case "pitch": return T.pitch(game, c);
      case "shopput": return T.shopStock(game, c, b, +arg);
      case "shoptake": return T.shopTake(game, c, b, +arg);
      case "till": return T.till(game, c, b);
      case "campput": return T.campChest(game, b) ? stashInto(T.campChest(game, b), c, +arg, H().CHEST) : no("your home has no chest yet");
      case "camptake": return T.campChest(game, b) ? fetchFrom(T.campChest(game, b), c, +arg) : no("");
      case "keep": who = SB.Game.byId(game, +String(arg).replace("home:", "")); return T.assign(game, String(arg).indexOf("home:") === 0 ? h : b, who);
      case "unkeep": T.unpost(game, arg === "home" ? h : b); T.sync(game); return ok("");
      case "invest": return T.invest(game, c, b);
      case "bank": return T.bank(game, c, arg);
      case "sweep": return T.sweep(game, c);
      case "heat": return T.heat(game, c);
      case "stake": return T.stake(game, c);
      case "clear": return T.clearPlot(game, c);
      case "plansave": return T.savePlan(game);
      case "planuse": return T.usePlan(game);
      case "wash": return T.has(game, "barrel") && H().at(game, c) ? T.wash(game, c) : no("the rain barrel is at home");
      case "crateput": return T.crateStash(game, c, +arg);
      case "cratetake": return T.crateFetch(game, c, +arg);
      case "look": return T.setLook(game, c, String(arg).split(":")[0], String(arg).split(":")[1]);
      case "addon": return T.addOn(game, c, arg);
      case "movein": return T.moveIn(game, c, SB.Game.byId(game, +arg));
      case "moveout": return T.moveOut(game, +arg);
      case "front": return T.front(game, arg);
      case "portrait": return T.portrait(game, c, SB.Game.byId(game, +arg));
    }
    return no("");
  };

  /* ---------------- the tabs ---------------- */
  function b2(a, arg, text, off, cls) { return "<button class='btn" + (cls ? " " + cls : "") + "' data-t2='" + a + "' data-a='" + esc(arg == null ? "" : arg) + "' " + (off ? "disabled" : "") + ">" + text + "</button>"; }
  function row(list) { return list.length ? "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin:4px 0'>" + list.join("") + "</div>" : ""; }
  function grid(arr, cap, a, icon, off) {
    var out = "<div class='grid' style='grid-template-columns:repeat(6,minmax(0,40px))'>";
    for (var i = 0; i < cap; i++) out += "<div class='slot" + (off ? " off" : "") + "' data-t2='" + a + "' data-a='" + i + "' title='" + (arr[i] ? esc(label(arr[i].k)) : "") + "'>" + (arr[i] ? icon(arr[i].k, 32) + (arr[i].n > 1 ? "<em>" + arr[i].n + "</em>" : "") : "") + "</div>";
    return out + "</div>";
  }
  function bagButtons(c, a, icon, priceOf) {
    var v = Sv().inv(c), out = [];
    for (var i = 0; i < v.s.length; i++) { var sl = v.s[i]; if (!sl || sl.k === "plans") continue; var p = priceOf ? priceOf(sl) : null; if (priceOf && !(p > 0)) continue; out.push(b2(a, i, icon(sl.k, 16) + " " + esc(label(sl.k)) + (sl.n > 1 ? " ×" + sl.n : "") + (p != null ? " · " + p : ""))); }
    return out;
  }
  T.tradeHtml = function (game, c, icon) {
    var s = st(game), m = mi(game), vs = T.vendors(game, c), out = "";
    out += "<div class='lbl'>purse <b>" + T.purse(c) + " " + m + "</b>" + (s.fur.jar ? " · jar " + T.jar(game) : "") + (num(s, "medals") ? " · " + s.medals + " 🎖" : "") + "</div>";
    if (!vs.length) return out + (T.campSiteNear(game, c) ? row([b2("barter", "", "🌘 leave a copper at the grump camp", Sv().count(c, "metal") < 1)]) : "");
    var v = vs[0], why = T.openWhy(game, v), stars = T.stars(game, v.key), tb = table(v), funds = T.funds(game, c);
    out += "<div class='lbl'>" + v.icon + " " + esc(v.name) + (stars ? " " + "★★★".slice(0, stars) : "") + (why ? " · <b>" + esc(why) + "</b>" : v.who ? " · open till dusk" : "") + "</div>";
    var items = T.stock(game, v);
    if (items.length) {
      out += "<div class='rlist'>";
      items.forEach(function (it) {
        var price = T.priceOf(game, c, v, it), locked = stars < it.stars;
        out += "<div class='rc'><span class='big'>" + icon(it.k, 28) + "</span><div class='t'>" + it.n + " " + esc(label(it.k)) + "<small>" + (locked ? "for regulars: " + it.stars + " ★" : it.left > 0 ? it.left + " left today" : "sold out") + "</small></div>" + b2("buy", it.k, "buy · " + price + " " + m, !!why || locked || it.left <= 0 || funds < price, "go") + "</div>";
      });
      out += "</div>";
    }
    var acts = T.services(game, c, v).map(function (sv) { return b2("serv", sv.id, esc(sv.name) + (sv.price > 0 ? " · " + sv.price + " " + m : ""), !!why || !!sv.why || funds < sv.price); });
    (tb.swaps || []).forEach(function (sw, j) { if (K[sw[0]] && K[sw[2]]) acts.push(b2("swap", j, "🔁 " + sw[1] + " " + esc(label(sw[0])) + " for " + sw[3] + " " + esc(label(sw[2])), Sv().count(c, sw[0]) < sw[1])); });
    if (tb.medals) T.MEDALS.forEach(function (x) { if (K[x[0]]) acts.push(b2("medal", x[0], "🎖 " + x[1] + " " + esc(label(x[0])) + " · " + x[2] + " 🎖", num(s, "medals") < x[2])); });
    if (items.length) acts.push(b2("haggle", "", "🤝 haggle", !!why || !!shopDay(game, v).tried));
    out += row(acts);
    var sells = bagButtons(c, "sell", icon, function (sl) { return r2(T.worth(game, sl.k, sl) * sl.n); });
    if (SB.Animals && SB.Animals.all) { try { SB.Animals.all(game).slice(0, 2).forEach(function (rec) { if (rec.k !== "grump") sells.push(b2("pet", rec.id, "🐾 " + esc(rec.name || "a pet") + " · " + r2(2 + 6 * Math.max(0, Math.min(1, rec.bond || rec.tr || 0))))); }); } catch (e) {} }
    out += "<div class='lbl'>sell" + (v.who && game.econ && game.econ.coins ? " · " + esc(v.who.name) + " has " + T.purse(v.who) + " " + m : "") + "</div>" + (sells.length ? row(sells) : "<div class='help'>nothing in your bag they want</div>");
    var back = []; s.back.forEach(function (rec, j) { if (rec.d === day(game)) back.push(b2("back", j, "↩ " + rec.n + " " + esc(label(rec.k)) + " · " + rec.pay, funds < rec.pay)); });
    out += row(back);
    if (vs.length > 1) out += "<div class='help'>also here: " + vs.slice(1).map(function (o) { return esc(o.name); }).join(", ") + ". step closer to trade with them.</div>";
    return out;
  };
  T.workHtml = function (game, c) {
    var job = T.trade(c), wp = T.workplace(game, c), out = "";
    if (!job && !wp) return "";
    if (job) {
      var r = T.rankOf(c, job), nx = T.RANKS[r + 1];
      out += "<div class='lbl'>🧰 " + esc(c.name) + " the " + esc(T.rankName(c, job)) + " " + esc(job) + " " + T.badge(c, job) + " · " + T.xpOf(c, job) + " know-how" + (c.spec ? " · " + esc(c.spec) : "") + "</div>";
      out += "<div class='help'>" + (nx ? esc(T.promoteWhy(game, c, job) || "ready to be a " + nx[1] + ": work a shift") : "a master. nothing more to prove") + ". " + T.tasks(game, c).map(function (t) { return (t.done ? "☑ " : "☐ ") + esc(t.text) + (t.of > 1 ? " " + t.n + "/" + t.of : ""); }).join(" · ") + "</div>";
    }
    var acts = [];
    if (wp) { var wj = T.jobAt(wp); acts.push(b2("work", "", "🧰 work a shift at the " + esc(T.nameOf(wp)) + " · " + T.wage(game, c, wj) + " " + mi(game), !!T.workWhy(game, c, wp), "go")); if (T.workWhy(game, c, wp)) out += "<div class='help'>" + esc(T.workWhy(game, c, wp)) + "</div>"; }
    if (job) acts.push(b2("off", "", (c.chem.sick > 0.4 ? "🤒 take a sick day" : "🏖 take a paid day off"), !(c.chem.sick > 0.4) && (c.leaveN || 0) < 1));
    if (job && T.rankOf(c, job) >= 4 && !c.spec) T.specsFor(job).forEach(function (sp) { acts.push(b2("spec", sp.id, "🧭 be a " + esc(sp.id) + ": " + esc(sp.t))); });
    return out + row(acts);
  };
  T.boardHtml = function (game, c) {
    var L = T.asks(game); if (!L.length) return "";
    var out = "<div class='lbl'>📌 the board · smols who want something today</div>";
    L.forEach(function (x) {
      out += "<div class='help'><b>" + esc(x.who.name) + "</b> " + (x.t === "gig" ? "wants " + esc(x.what) + " for their hut: bring " : "will pay for ") + x.n + " " + esc(label(x.k)) + " · " + x.pay + " " + mi(game) + "</div>" + row([b2("ask", x.i, "hand it over", Sv().count(c, x.k) < x.n || SB.dist(c.x, c.z, x.who.x, x.who.z) > 12)]);
    });
    return out;
  };
  T.hereHtml = function (game, c, icon) {
    var s = st(game), b = T.nearest(game, c), out = "", acts = [];
    if (s.carry && SK[s.carry.kind]) acts.push(b2("setdown", "", "🫴 set the " + esc(SK[s.carry.kind].label) + " down here", false, "go"));
    if (T.lairNear(game, c)) acts.push(b2("outpost", "", "🏕 make this old lair your outpost", false, "go"));
    if (Sv().count(c, "campkit", true) > 0) acts.push(b2("pitch", "", "⛺ pitch camp here"));
    out += row(acts);
    if (!b || !b.done) return out;
    var own = mine(game, b), k = b.kind, i;
    if (k === "shop") {
      out += "<div class='lbl'>🏪 your stall · rank " + T.shopRank(b) + " · " + ((b.data && b.data.sold) || 0) + " sold · till " + r2((b.data && b.data.till) || 0) + " " + mi(game) + "</div>" + grid(goods(b), T.shopSlots(b), "shoptake", icon);
      out += row([b2("till", "", "empty the till", !((b.data && b.data.till) > 0), "go")].concat(bagButtons(c, "shopput", icon, function (sl) { return T.shopPrice(game, sl); })));
    } else if (k === "camp") {
      var ch = T.campChest(game, b);
      out += ch ? "<div class='lbl'>⛺ the camp's pack · your home chest, from here</div>" + grid(ch, ch.length, "camptake", icon) + row(bagButtons(c, "campput", icon)) : "<div class='help'>a chest at home would be reachable from here.</div>";
    } else if (k === "stall" && b.data && b.data.good) out += row([b2("invest", "", "🤝 put 5 " + mi(game) + " into this stall" + (b.data.inv ? " (you have, " + b.data.inv + " times)" : ""), T.funds(game, c) < 5)]);
    if (XJ[k]) {
      var kp = T.keeper(game, b), job = XJ[k], ks = [];
      T.candidates(game, c, b).forEach(function (o) { ks.push(b2("keep", o.id, "ask " + esc(o.name))); });
      if (kp) ks.push(b2("unkeep", "", "free " + esc(kp.name) + " of it"));
      out += "<div class='lbl'>" + (kp ? "kept by <b>" + esc(kp.name) + "</b>, the " + job : "nobody is the " + job + " here") + "</div>" + row(ks);
    }
    if (own && k !== "camp") {
      var ps = T.DYES.map(function (d) { return b2("paint", d.id, d.icon, !canPay(c, d.cost)); });
      ps.push(b2("paint", "glowpaste", "✨ glow", Sv().count(c, "glowcap") < 2 || !!(b.data && b.data.glow)));
      if (b.data && (b.data.paint != null || b.data.glow)) ps.push(b2("paint", "none", "🫧 scrub"));
      if (!(H() && H().is(game, b))) { ps.push(b2("turn", "", "↻ turn")); if (T.canTakeDown(game, b)) ps.push(b2("carry", "", "🫳 carry it off", !!s.carry)); }
      out += "<div class='lbl'>🎨 paint it (a dye's worth of berries, leaves, clay…)</div>" + row(ps);
    }
    return out;
  };
  T.councilHtml = function (game, c) {
    var s = st(game), e = era(game), acts = [], up = T.upkeep(game), m = mi(game), funds = T.funds(game, c), out = "";
    if (num(s, "tithe") > 0) acts.push(b2("tithe", "", "🏛 collect the tithe · " + r2(s.tithe) + " " + m, false, "go"));
    if (num(s, "mess") > 0) acts.push(b2("tidy", "", "🧹 tidy the square (" + s.mess + ")"));
    var p = P(), S0 = p && p.state ? p.state() : null;
    if (S0 && S0.goal && S0.goal.pack) acts.push(b2("pack", "", "🎒 pay a smol to fetch your pack · 3 " + m, funds < 3));
    if (e >= 1 || home(game)) {
      game.creatures.filter(function (o) { return isSmol(o) && o !== c && (o.stage == null || o.stage >= 3) && SB.dist(o.x, o.z, c.x, c.z) < 12; }).slice(0, 2).forEach(function (o) { acts.push(b2("fund", o.id, "🛖 a hut for " + esc(o.name) + " · " + T.fundPrice(game, "hut") + " " + m, funds < T.fundPrice(game, "hut"))); });
      acts.push(b2("fund", "me", "🏠 a house built for you · " + T.fundPrice(game, "house") + " " + m, funds < T.fundPrice(game, "house")));
      acts.push(b2("order", "feast", "🍲 a feast for everyone · " + T.fundPrice(game, "feast") + " " + m, funds < T.fundPrice(game, "feast")));
      if (e >= 2 && !s.order.seeds) acts.push(b2("order", "seeds", "🌱 every seed, all year · " + T.fundPrice(game, "seeds") + " " + m, funds < T.fundPrice(game, "seeds")));
    }
    if (marketDay(game) && ((game.econ && game.econ.coins) || e >= 2)) acts.push(b2("cups", "", "🥥 the cup game · 1 " + m, funds < 1));
    acts.push(b2("barricade", "", "🪵 quick barricade (3 sticks, 1 stone)", Sv().count(c, "stick") < 3 || Sv().count(c, "stone") < 1));
    out += "<div class='lbl'>🏛 what shells can do</div>" + row(acts);
    out += "<div class='lbl'>the town each day</div><div class='help'>" + up.smols + " smols eat about " + up.food + " · " + up.wood + " wood for the fires · " + up.water + (up.water === 1 ? " well" : " wells and ponds") + " · granary " + up.granary + (up.worn ? " · <b>" + up.worn + " worn out</b>" : "") + (T.parks(game).length ? " · " + T.parks(game).length + (T.parks(game).length === 1 ? " park" : " parks") : "") + (s.morning ? "<br>this morning: " + esc(s.morning) : "") + "</div>";
    return out;
  };
  var html0 = T.html, wire0 = T.wire, hhtml0 = T.homeHtml, hwire0 = T.homeWire;
  function safe(fn) { try { return fn() || ""; } catch (e) { if (typeof console !== "undefined" && console.warn) console.warn("town tab:", e); return ""; } }
  T.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    return safe(function () { return T.tradeHtml(game, c, icon); }) + safe(function () { return T.workHtml(game, c); }) + safe(function () { return T.boardHtml(game, c); }) + safe(function () { return T.hereHtml(game, c, icon); }) + html0(game, c, icon) + safe(function () { return T.councilHtml(game, c); });
  };
  function wire2(root, game, c, redraw, sayFn) {
    var L = root.querySelectorAll("[data-t2]");
    for (var i = 0; i < L.length; i++) (function (el) {
      el.addEventListener("click", function () {
        var r = T.act(game, c, el.getAttribute("data-t2"), el.getAttribute("data-a"));
        if (r && r.msg && sayFn) sayFn(r.msg);
        if (r && r.ok && r.msg && SB.Audio && SB.Audio.play) SB.Audio.play("craft");
        redraw();
      });
    })(L[i]);
  }
  T.wire = function (root, game, c, redraw, sayFn) { wire0(root, game, c, redraw, sayFn); try { wire2(root, game, c, redraw, sayFn); } catch (e) {} };
  T.homeHtml = function (game, c, icon, base) {
    var out = hhtml0(game, c, icon, base), h = home(game);
    if (!h) return out;
    return out + safe(function () { return T.homeHtml2(game, c, icon || function () { return ""; }); });
  };
  T.homeWire = function (root, game, c, redraw, sayFn) { hwire0(root, game, c, redraw, sayFn); try { wire2(root, game, c, redraw, sayFn); } catch (e) {} };
  T.homeHtml2 = function (game, c, icon) {
    var s = st(game), h = home(game), at = H().at(game, c), out = "", acts = [], role = T.role(game), m = mi(game), cf = T.comfort(game).parts;
    out += "<div class='lbl'>🧹 the house · " + (role ? "it has turned into a " + role + " · " : "") + (num(s, "dirt") >= 3 ? "<b>muddy (comfort " + cf.dirt + ")</b>" : "clean enough") + (T.walled(game) ? " · walled yard" : "") + (T.warmFloor(game) ? " · warm floor from the vent" : "") + (T.matching(game) ? " · a matching " + T.matching(game) + " set" : "") + "</div>";
    if (at) {
      acts.push(b2("sweep", "", "🧹 sweep", num(s, "dirt") < 1));
      if (s.fur.barrel) acts.push(b2("wash", "", "🫧 wash your fur", T.fresh(c, game)));
      if (H().has(game, "hearth")) acts.push(b2("heat", "", s.heat === "high" ? "🔥 bank the hearth low" : "🔥 build the hearth up"));
      if (s.fur.jar) { acts.push(b2("bank", "in", "🏺 purse into the jar (" + T.jar(game) + ")", T.purse(c) <= 0)); acts.push(b2("bank", "out", "🏺 take 5 out", T.jar(game) <= 0)); }
      acts.push(s.plot ? b2("clear", "", "🧺 clear the plot into the chest", !H().has(game, "chest")) : b2("stake", "", "📍 stake your plot (4 sticks)", Sv().count(c, "stick") < 4));
      acts.push(b2("plansave", "", "📐 copy this home's plan"));
      if (T.savedPlan() && !s.plan) acts.push(b2("planuse", "", "📐 build to your saved plan (half price)"));
      out += row(acts);
      if (T.crateCap(game)) out += "<div class='lbl'>📦 the trade crate · sells overnight for " + T.crateWorth(game) + " " + m + "</div>" + grid(s.crate, T.crateCap(game), "cratetake", icon) + row(bagButtons(c, "crateput", icon, function (sl) { return r2(T.worth(game, sl.k, sl) * sl.n); }));
      var looks = [];
      for (var cat in T.LOOKS) T.LOOKS[cat].forEach(function (o) { if (T.lookOf(game, cat) === o.id) return; var cost = T.lookCost(game, cat, o.id); looks.push(b2("look", cat + ":" + o.id, esc(o.name) + (o.cost ? " · " + (T.costText(cost) || "free") : ""), !canPay(c, cost))); });
      out += "<div class='lbl'>🪚 how it's made · " + ["roof", "wall", "floor", "bed", "base"].map(function (k) { return esc(lookDef(k, T.lookOf(game, k)).name); }).join(", ") + "</div>" + row(looks);
      out += "<div class='lbl'>🚪 rooms to add · " + (Object.keys(s.addon).map(function (k) { return T.ADDON[k] ? T.ADDON[k].icon : ""; }).join(" ") || "none yet") + "</div><div class='rlist'>";
      T.ADDONS.forEach(function (a) { if (s.addon[a.id]) return; var w = T.addWhy(game, c, a.id); out += "<div class='rc'><span class='big'>" + a.icon + "</span><div class='t'>" + esc(a.name) + "<small>" + esc(/^(you chose|.* needs at least)/.test(w) ? w : a.perk) + "</small><div class='need'>" + U.needHtml(c, a.cost, icon) + "</div></div>" + b2("addon", a.id, "build", !!w, "go") + "</div>"; });
      out += "</div>";
    }
    var L = T.mates(game), gk = T.keeper(game, h), ms = [];
    L.forEach(function (x) { var o = SB.Game.byId(game, x.id); ms.push(b2("moveout", x.id, esc(o.name) + " (" + x.role + ") · ask to leave")); });
    if (at) T.homeCandidates(game, c).forEach(function (o) { ms.push(b2("movein", o.id, "🏡 ask " + esc(o.name) + " to move in")); });
    if (at && !gk) T.candidates(game, c, h).slice(0, 2).forEach(function (o) { ms.push(b2("keep", "home:" + o.id, "🛡 ask " + esc(o.name) + " to guard the door")); });
    if (gk) ms.push(b2("unkeep", "home", "🛡 " + esc(gk.name) + " guards the door · stand down"));
    out += "<div class='lbl'>who lives here · " + L.length + " of " + (T.BEDS[h.kind] || 1) + " beds" + (T.crowded(game) ? " · <b>crowded</b>" : "") + "</div>" + (ms.length ? row(ms) : "<div class='help'>a friend or a partner can move in: they tend the patch, sweep and keep the hearth.</div>");
    if (at && s.keeps.length) {
      var ks = s.keeps.slice(0, 4).map(function (kp) { return b2("front", kp.id, kp.icon + (s.front === kp.id ? " ★" : ""), s.front === kp.id); });
      var fr = game.creatures.filter(function (o) { return isSmol(o) && o !== c && SB.dist(o.x, o.z, c.x, c.z) < 10; })[0];
      if (fr) ks.push(b2("portrait", fr.id, "🖼 paint " + esc(fr.name) + " (2 berries, a leaf)", Sv().count(c, "berry") < 2 || Sv().count(c, "leaves") < 1));
      out += "<div class='lbl'>pride of place · tap a keepsake to hang it over the hearth</div>" + row(ks);
    }
    return out;
  };

  /* ---------------- the models ---------------- */
  var ME = SB.Meshes || SB.ME;
  var WOOD = 0x8a5a36, DARK = 0x5e3d26, STONE = 0x9a948e, THATCH = 0xe2b862, CLOTH = 0xd9cdb4, LEAF = 0x6cc04a;
  function roof(b, w, d, y, col) { b.color(col, 1); b.push().translate(0, y, -d * 0.27).rotX(0.62).box(w, 0.07, d * 0.72).pop(); b.push().translate(0, y, d * 0.27).rotX(-0.62).box(w, 0.07, d * 0.72).pop(); }
  function fire(b, x, y, z, s) { b.color(0xff8a2a, 1).glow(1.2).push().translate(x, y, z).cone(5, 0.16 * s, 0.4 * s).pop().color(0xffd24a, 1).push().translate(x, y, z).cone(4, 0.09 * s, 0.26 * s).pop().glow(0); }
  var MODELS = {
    camp: function () { // a ridge tent, a bedroll and a ring of stones with a little fire
      var b = ME.builder();
      b.sides(true); roof(b, 1.0, 1.3, 0.34, CLOTH); b.sides(false);
      b.color(WOOD).push().translate(0, 0, 0).cyl(4, 0.03, 0.03, 0.62).pop();
      b.color(0xa85a3c).push().translate(0, 0, 0.2).box(0.6, 0.06, 0.3).pop();
      for (var i = 0; i < 6; i++) b.color(STONE).push().translate(0.95 + Math.sin(i * 1.05) * 0.2, 0, Math.cos(i * 1.05) * 0.2).box(0.09, 0.07, 0.09).pop();
      fire(b, 0.95, 0.03, 0, 0.7);
      return b.finish();
    },
    tradecamp: function () { // a cart with two wheels, a striped awning on poles and a pile of sacks
      var b = ME.builder();
      b.color(WOOD).push().translate(0, 0.22, 0).box(1.1, 0.1, 0.6).pop();
      b.color(DARK).push().translate(-0.35, 0.16, 0.33).rotX(1.5708).cyl(8, 0.16, 0.16, 0.05).pop().push().translate(0.35, 0.16, 0.33).rotX(1.5708).cyl(8, 0.16, 0.16, 0.05).pop();
      b.color(WOOD); [[-0.5, -0.25], [0.5, -0.25], [-0.5, 0.25], [0.5, 0.25]].forEach(function (p) { b.push().translate(p[0], 0.3, p[1]).cyl(4, 0.025, 0.025, 0.75).pop(); });
      for (var i = 0; i < 4; i++) b.color(i % 2 ? 0xd9614a : 0xf2ead8, 1).push().translate(-0.42 + i * 0.28, 1.05, 0).box(0.28, 0.04, 0.72).pop();
      b.color(0xc9a36a).push().translate(-0.2, 0.32, 0).scale(0.16, 0.12, 0.14).sphere(0).pop().push().translate(0.15, 0.32, 0.05).scale(0.14, 0.11, 0.13).sphere(0).pop();
      b.color(0xffd27a, 1).glow(0.8).push().translate(0.5, 0.95, 0.3).box(0.08, 0.1, 0.08).pop().glow(0);
      return b.finish();
    },
    shop: function () { // a counter, two posts and a green awning, with things on show
      var b = ME.builder();
      b.color(WOOD).push().box(1.0, 0.42, 0.45).pop();
      b.color(DARK).push().translate(-0.48, 0, -0.2).cyl(4, 0.03, 0.03, 1.1).pop().push().translate(0.48, 0, -0.2).cyl(4, 0.03, 0.03, 1.1).pop();
      // 4.42: a striped awning, green and cream. from the sky a plain one was a green rectangle
      for (var aw = 0; aw < 5; aw++) b.color(aw % 2 ? 0xf2ead8 : 0x5fa04a, 1).push().translate(-0.46 + aw * 0.23, 1.05, 0.05).rotX(-0.35).box(0.23, 0.04, 0.7).pop();
      b.color(0xd9614a).push().translate(-0.25, 0.42, 0).scale(0.07).sphere(0).pop().color(0xe0b85a).push().translate(0.05, 0.42, 0).box(0.14, 0.08, 0.12).pop().color(0x7fb4d8).push().translate(0.3, 0.42, 0).cyl(6, 0.06, 0.05, 0.12).pop();
      return b.finish();
    },
    signalfire: function () { // a ring of stones, a tall stack of logs and a big flame
      var b = ME.builder().color(STONE).cyl(8, 0.55, 0.5, 0.12);
      for (var i = 0; i < 5; i++) b.color(i % 2 ? WOOD : DARK).push().translate(0, 0.12, 0).rotY(i * 1.26).rotX(0.22).cyl(4, 0.05, 0.04, 1.2).pop();
      fire(b, 0, 1.0, 0, 1.6);
      return b.finish();
    },
    watchfire: function () { // an iron basket of fire on a post
      var b = ME.builder().color(DARK).cyl(5, 0.06, 0.05, 1.1);
      b.color(0x3d3d46).push().translate(0, 1.1, 0).cyl(6, 0.12, 0.22, 0.2, false).pop();
      fire(b, 0, 1.22, 0, 1);
      return b.finish();
    },
    bell: function () { // two posts, a beam and a copper bell
      var b = ME.builder().color(WOOD);
      b.push().translate(-0.32, 0, 0).cyl(4, 0.05, 0.04, 1.1).pop().push().translate(0.32, 0, 0).cyl(4, 0.05, 0.04, 1.1).pop().push().translate(0, 1.08, 0).box(0.8, 0.07, 0.08).pop();
      b.color(0xc9813a, 1).push().translate(0, 0.72, 0).cyl(8, 0.2, 0.09, 0.3).pop();
      b.color(DARK).push().translate(0, 0.64, 0).scale(0.05).sphere(0).pop();
      return b.finish();
    },
    plate: function () { var b = ME.builder().color(0x7f7a75).box(0.6, 0.04, 0.6); b.color(0xc9813a, 1).push().translate(0, 0.04, 0).box(0.42, 0.02, 0.42).pop(); return b.finish(); },
    feeder: function () { // a trough on legs under a little roof
      var b = ME.builder().color(WOOD);
      b.push().translate(0, 0.25, 0).box(0.7, 0.12, 0.3).pop().push().translate(-0.3, 0, 0).box(0.05, 0.25, 0.26).pop().push().translate(0.3, 0, 0).box(0.05, 0.25, 0.26).pop();
      b.color(0xe0b85a).push().translate(0, 0.37, 0).box(0.6, 0.03, 0.22).pop();
      b.color(THATCH, 1).push().translate(0, 0.75, 0).box(0.85, 0.04, 0.45).pop();
      b.color(DARK).push().translate(-0.38, 0.3, 0).cyl(4, 0.02, 0.02, 0.45).pop().push().translate(0.38, 0.3, 0).cyl(4, 0.02, 0.02, 0.45).pop();
      return b.finish();
    },
    rod: function () { var b = ME.builder().color(DARK).cyl(5, 0.05, 0.03, 1.6); b.color(0xc9813a, 1).push().translate(0, 1.6, 0).cone(5, 0.05, 0.5).pop(); b.color(STONE).cyl(6, 0.14, 0.1, 0.1); return b.finish(); },
    waterwheel: function () { // a big paddle wheel on a frame beside a little mill box
      var b = ME.builder().color(WOOD);
      b.push().translate(-0.45, 0, 0).box(0.08, 0.9, 0.08).pop().push().translate(0.45, 0, 0).box(0.08, 0.9, 0.08).pop();
      b.color(DARK).push().translate(0, 0.8, 0).rotZ(1.5708).translate(0, -0.5, 0).cyl(5, 0.04, 0.04, 1.0).pop();
      for (var i = 0; i < 8; i++) b.color(i % 2 ? 0xa8743e : WOOD).push().translate(0, 0.8, 0).rotX(i * 0.785).translate(0, 0.42, 0).box(0.5, 0.26, 0.04).pop();
      b.color(0xc8925a).push().translate(0.85, 0, 0).box(0.5, 0.6, 0.6).pop();
      b.push().translate(0.85, 0, 0); roof(b, 0.6, 0.8, 0.6, 0x8a4a34); b.pop();
      return b.finish();
    },
    beaconlamp: function () { // a stone pillar with a big glowing crystal lantern
      var b = ME.builder().color(STONE).cyl(6, 0.3, 0.2, 1.2);
      b.color(0x7f7a75).push().translate(0, 1.2, 0).box(0.5, 0.06, 0.5).pop();
      b.color(0xbfe9ff, 1).glow(1.6).push().translate(0, 1.26, 0).box(0.32, 0.42, 0.32).pop().glow(0);
      b.color(0x5a5560).push().translate(0, 1.68, 0).cone(4, 0.34, 0.24).pop();
      return b.finish();
    },
    tidestone: function () { // a standing stone with a blue wave mark, shells at its foot
      var b = ME.builder().color(0xa9b4b8).push().scale(1, 1, 0.55).cyl(6, 0.26, 0.16, 0.95).pop();
      b.color(0x4a8ad0, 1).glow(0.8).push().translate(0, 0.55, 0.1).box(0.2, 0.05, 0.02).pop().push().translate(0, 0.45, 0.11).box(0.14, 0.05, 0.02).pop().glow(0);
      b.color(0xf2ead8).push().translate(0.3, 0, 0.15).scale(0.07, 0.04, 0.07).sphere(0).pop().push().translate(-0.28, 0, 0.2).scale(0.06, 0.04, 0.06).sphere(0).pop();
      return b.finish();
    },
    clock: function () { // a stone ring on a plinth with a copper pointer and crystal hour marks
      var b = ME.builder().color(STONE).cyl(10, 0.8, 0.75, 0.18);
      b.color(0xcfc6b4).push().translate(0, 0.18, 0).cyl(12, 0.62, 0.62, 0.06).pop();
      for (var i = 0; i < 8; i++) b.color(0xbfe9ff, 1).glow(0.9).push().translate(Math.sin(i * 0.785) * 0.5, 0.24, Math.cos(i * 0.785) * 0.5).box(0.07, 0.05, 0.07).pop().glow(0);
      b.color(0xc9813a, 1).push().translate(0, 0.24, 0).rotZ(-0.9).box(0.05, 0.75, 0.04).pop();
      return b.finish();
    },
    wordpost: function () { var b = ME.builder().color(DARK).cyl(5, 0.06, 0.05, 0.9); b.color(0xd8b24a, 1).push().translate(0, 0.9, 0).rotX(1.2).cone(8, 0.2, 0.36).pop(); b.color(0xc5ff49, 1).glow(0.8).push().translate(0, 0.5, 0.06).box(0.08, 0.08, 0.02).pop().glow(0); return b.finish(); },
    feelpost: function () { var b = ME.builder().color(DARK).cyl(5, 0.06, 0.05, 0.9); b.color(0xffffff, 1).push().translate(0, 1.05, 0).scale(0.22, 0.16, 0.12).sphere(0).pop(); b.color(0xff7aa8, 1).glow(0.8).push().translate(0, 0.5, 0.06).box(0.08, 0.08, 0.02).pop().glow(0); return b.finish(); },
    dorm: function () { // a low round-ended hut with a patchwork roof and a row of little windows
      var b = ME.builder();
      b.color(0xd9cdb4).push().box(1.6, 0.6, 1.0).pop();
      roof(b, 1.8, 1.4, 0.6, 0xc97a5a);
      b.color(0xc9b99a).push().translate(0, 0.6, 0).cyl(3, 0.5, 0.01, 0.4).pop();
      b.color(0x3a2a1c).push().translate(-0.55, 0, 0.51).box(0.26, 0.42, 0.03).pop();
      for (var i = 0; i < 3; i++) b.color(0xffd27a, 1).glow(0.5).push().translate(-0.1 + i * 0.32, 0.3, 0.51).box(0.16, 0.16, 0.03).pop().glow(0);
      return b.finish();
    },
    treehouse: function () { // a trunk, a platform with a rail and a leaf roof, a ladder
      var b = ME.builder().color(0x6e4a2e).cyl(7, 0.22, 0.16, 1.5);
      b.color(0xa8743e).push().translate(0, 1.3, 0).box(1.3, 0.07, 1.3).pop();
      b.color(WOOD).push().translate(0, 1.6, 0.62).box(1.25, 0.05, 0.04).pop().push().translate(0, 1.6, -0.62).box(1.25, 0.05, 0.04).pop().push().translate(-0.62, 1.6, 0).box(0.04, 0.05, 1.25).pop();
      b.color(LEAF, 1).push().translate(0, 1.95, 0).cone(7, 1.05, 0.7).pop().color(0x4f9a3a, 1).push().translate(0, 2.4, 0).cone(6, 0.7, 0.55).pop();
      b.color(DARK); for (var r = 0; r < 5; r++) b.push().translate(0.55, 0.15 + r * 0.26, 0.4).box(0.26, 0.03, 0.03).pop();
      b.push().translate(0.42, 0, 0.4).cyl(3, 0.02, 0.02, 1.3).pop().push().translate(0.68, 0, 0.4).cyl(3, 0.02, 0.02, 1.3).pop();
      return b.finish();
    },
    playground: function () { // a sand pit with a bucket and a toy box
      var b = ME.builder().color(WOOD).push().box(1.0, 0.1, 1.0).pop();
      b.color(0xf0dca0).push().translate(0, 0.1, 0).box(0.88, 0.03, 0.88).pop();
      b.color(0xf0dca0).push().translate(-0.15, 0.13, -0.1).cone(6, 0.16, 0.2).pop();
      b.color(0xd9614a).push().translate(0.2, 0.13, 0.15).cyl(6, 0.07, 0.09, 0.14).pop();
      b.color(0x5a8ad0).push().translate(0.75, 0, -0.2).box(0.4, 0.26, 0.3).pop().color(0xffd84a).push().translate(0.75, 0.26, -0.2).scale(0.08).sphere(0).pop();
      return b.finish();
    },
    pond: function () { // a ring of stones round blue water, reeds and a lily pad
      var b = ME.builder().color(STONE).cyl(12, 0.9, 0.86, 0.1, false);
      b.color(0x3a7ab8, 1).push().translate(0, 0.05, 0).cyl(12, 0.82, 0.82, 0.02).pop();
      b.color(0x5fa04a).push().translate(0.25, 0.08, -0.2).cyl(8, 0.16, 0.16, 0.01).pop();
      b.color(0xff9ac0, 1).push().translate(0.25, 0.1, -0.2).scale(0.05).sphere(0).pop();
      b.sides(true).color(LEAF); for (var i = 0; i < 4; i++) b.push().translate(-0.6 + i * 0.07, 0.08, 0.35 + (i % 2) * 0.08).leaf(0.05, 0.5, 0.05).pop();
      b.sides(false);
      return b.finish();
    },
    statue: function () { // a plinth and a round-headed smol in stone, one arm up
      var b = ME.builder().color(0x8f8a84).box(0.6, 0.3, 0.6);
      b.color(0xb8b2aa).push().translate(0, 0.3, 0).scale(0.24, 0.3, 0.2).translate(0, 1, 0).sphere(0).pop();
      b.push().translate(0, 0.98, 0).scale(0.2).sphere(0).pop();
      b.push().translate(0.22, 0.75, 0).rotZ(-0.7).cyl(4, 0.04, 0.035, 0.34).pop();
      return b.finish();
    },
    banner: function () { // a pole, a crossbar and a hanging cloth with a stripe
      var b = ME.builder().color(DARK).cyl(4, 0.04, 0.03, 1.7);
      b.push().translate(0.2, 1.55, 0).box(0.5, 0.04, 0.04).pop();
      b.sides(true).color(0xd9614a, 1).push().translate(0.22, 1.0, 0).box(0.4, 0.55, 0.02).pop().color(0xf2ead8, 1).push().translate(0.22, 1.2, 0.012).box(0.4, 0.1, 0.01).pop().sides(false);
      return b.finish();
    }
  };
  T.MODELS2 = MODELS;
  for (var mk0 in MODELS) if (!T.MODELS[mk0]) T.MODELS[mk0] = MODELS[mk0];
  if (ME && ME.STRUCT_BUILDERS && ME.builder) { for (var mk in MODELS) { try { if (!ME.STRUCT_BUILDERS[mk]) { MODELS[mk](); ME.STRUCT_BUILDERS[mk] = MODELS[mk]; } } catch (e) {} } }
})();
