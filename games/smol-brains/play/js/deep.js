/* smol brains — deep.js ("a bigger world"): the island gets a down, an across and a reason to walk to the far end.
     delves     a grump cave mouth is a way down. In a body, at the mouth, "go down" takes you one level deeper in that
                cave's own saved state. There is no second map: you stay where you stand, and the rocks around the
                mouth are swapped for that level's rocks (deeper = better ore, new materials, darker, cave grumps).
                Six levels, a way back up, a record, a locker at level 3, a hoard and its keeper at the bottom, and a
                marker by the mouth that says how deep it has been explored.
     materials  coal, glowmoss, silver, starmetal, geodes and old bones at depth; amber, opal, frost shards and pearls
                only in certain biomes. Each one makes something (the bag's map tab has the recipes).
     a raft     carry one and a smol you are in can cross deep water: islets and far shores, each with a castaway's chest.
     places     lookouts, standing stones, hot springs, a hermit, lost shrines, buried caches, waystones, old camps,
                tide pools, soft earth to dig, placed with this file's own dice. One clear thing to do at each.
     the map    a bag tab: places found, percent explored, finds per biome, delve records, fast travel, recipes.
     hazards    sucking mud, thorns, icy water, heat, steam vents: by biome, in a body.
     weather    heat waves, blizzards, a rainbow with a gift where it lands, low tide.
   State: game.quests.deep (saved whole). Places come from the island's seed, so only what is found or used is saved.
   Nothing here calls game.rng. Delve rocks are "nop" nodes in their own id range: the smols' own eyes skip them and
   the island's clock ticks exactly as before. */
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var D = SB.Deep = {};
  var K = SB.KINDS, NK = SB.NODES, SK = SB.STRUCTS;

  function Sv() { return SB.Surv || SB.Survival; }
  function W() { return SB.World; }
  function P() { return SB.Possess; }
  function PS() { var p = P(); return p && p.active && p.state ? p.state() : null; }
  function headless() { var p = P(); return !!(p && p.headless); }
  function Q(game) { return game.quests || (game.quests = { ch: 0, done: {}, n: {} }); }
  function st(game) {
    var q = Q(game), s = q.deep;
    if (!s || typeof s !== "object") s = q.deep = {};
    if (!s.delves || typeof s.delves !== "object") s.delves = {};
    if (!Array.isArray(s.nodes)) s.nodes = [];
    if (!s.found || typeof s.found !== "object") s.found = {};
    if (!s.used || typeof s.used !== "object") s.used = {};
    if (!Array.isArray(s.maps)) s.maps = [];
    if (!s.finds || typeof s.finds !== "object") s.finds = {};
    if (!s.wx || typeof s.wx !== "object") s.wx = {};
    if (!s.n || typeof s.n !== "object") s.n = {};
    if (!(s.nid > 0)) s.nid = 0;
    return s;
  }
  D.state = st;
  function day(game) { return Math.floor((game.time || 0) / SB.DAY_LENGTH) + 1; }
  function tday(game) { return ((game.time || 0) / SB.DAY_LENGTH) % 1; }
  function label(k) { return K[k] && K[k].label ? K[k].label : k; }
  function hashKey(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function dice(game, key) { return SB.rng((hashKey(key) ^ (game.seed >>> 0)) >>> 0); }
  function say(msg) { if (msg && PS() && P().say) P().say(msg); }
  function toast(msg) { if (msg && SB.UI && SB.UI.toast && !headless()) SB.UI.toast(msg, "", 5000); }
  function tell(msg) { if (PS()) say(msg); else toast(msg); }
  function audio(name, vol) { if (SB.Audio && SB.Audio.play && !headless()) SB.Audio.play(name, { vol: vol == null ? 0.8 : vol }); }
  function sparkle(game, x, z, n) { if (SB.FX && SB.FX.burst && !headless()) SB.FX.burst("sparkle", x, W().groundY(game.world, x, z) + 0.7, z, n || 16); }
  function ok(msg, extra) { var r = { ok: true, msg: msg }; for (var k in extra || {}) r[k] = extra[k]; return r; }
  function fail(msg) { return { ok: false, msg: msg }; }
  function has(c, kind) { return !!(c && c.inv && Sv() && Sv().has(c, kind)); }
  // put things in a smol's bag; what does not fit lands at its feet
  function give(game, c, kind, n) {
    if (!K[kind] || !(n > 0)) return 0;
    var left = Sv().add(c, kind, n);
    if (left > 0 && Sv().spawn) Sv().spawn(game, kind, left, c.x + 0.5, c.z + 0.4, { by: c.id });
    return n;
  }
  function hunger(c, add) { c.chem.hunger = Math.min(1, (c.chem.hunger || 0) + add); var S = PS(); if (S && S.c === c) S.lastHun = c.chem.hunger; }
  function count(game, id) { var s = st(game); s.n[id] = (s.n[id] || 0) + 1; return s.n[id]; }

  /* ================= the new things ================= */
  function kind(k, def) { if (!K[k]) K[k] = def; }
  kind("coal", { noun: "material", label: "coal", emoji: "⚫", r: 0.13, color: 0x26242a, mat: 1, desc: "black rock from the upper cave levels. burns hot and long, and smelts silver." });
  kind("glowmoss", { noun: "material", label: "glowmoss", emoji: "🟢", r: 0.12, color: 0x7dffb0, mat: 1, glow: 1, desc: "moss that shines by itself. only grows three levels down. makes a lamp that never burns out." });
  kind("silverore", { noun: "material", label: "silver ore", emoji: "⚪", r: 0.13, color: 0xc9d2dc, mat: 1, desc: "pale ore from four levels down. smelt it with coal in a lit kiln." });
  kind("silver", { noun: "material", label: "silver", emoji: "🥈", r: 0.13, color: 0xe4ebf2, mat: 1, desc: "bright metal. makes the pick that cuts starmetal." });
  kind("starmetal", { noun: "material", label: "starmetal", emoji: "🌠", r: 0.13, color: 0x8fd8ff, mat: 1, glow: 1, desc: "from the very bottom of a cave. the best tools on the island are made of it." });
  kind("geode", { noun: "stone", label: "geode", emoji: "🪨", r: 0.14, color: 0x8a7fa0, mat: 1, desc: "a lumpy rock with something inside. crack it with a stone or a hammer in your bag." });
  kind("amber", { noun: "material", label: "amber", emoji: "🟠", r: 0.11, color: 0xf2a23a, mat: 1, desc: "old tree gold. only found under the woods and the jungle. makes a seeker stone." });
  kind("opal", { noun: "material", label: "opal", emoji: "🔵", r: 0.11, color: 0x8fc0f0, mat: 1, desc: "a milky stone from the dry lands. makes a waystone of your own." });
  kind("icegem", { noun: "material", label: "frost shard", emoji: "🧊", r: 0.11, color: 0xd6f4ff, mat: 1, desc: "never melts. only found in the cold. makes a frost flask." });
  kind("pearl", { noun: "material", label: "pearl", emoji: "🫧", r: 0.1, color: 0xf6f0ea, mat: 1, desc: "from tide pools and castaways' chests. makes a moon charm." });
  kind("fossil", { noun: "material", label: "old bone", emoji: "🦴", r: 0.13, color: 0xe6dcc0, mat: 1, desc: "from something very big and very long ago. five of them fit together." });
  kind("mapscrap", { noun: "material", label: "map scrap", emoji: "🗺", r: 0.12, color: 0xe2cf9a, desc: "a torn bit of map with an X on it. hold it and read it." });
  kind("raft", { noun: "tool", label: "raft", emoji: "🛶", r: 0.2, color: 0x9a6a3a, tool: "float", desc: "carry it and you can cross deep water. paddling uses pep." });
  kind("shovel", { noun: "tool", label: "digging stick", emoji: "🥄", r: 0.15, color: 0x8a6a48, tool: "dig", desc: "digs up buried caches, soft earth, old bones and the X on a map. it only has to be in your bag." });
  kind("ropeladder", { noun: "tool", label: "rope ladder", emoji: "🪜", r: 0.16, color: 0xb89a5a, tool: "climb", desc: "fix it at a cave mouth: from then on you can go straight down to that cave's deepest level." });
  kind("mosslamp", { noun: "tool", label: "moss lamp", emoji: "🏮", r: 0.14, color: 0x9dffc0, tool: "light", glow: 1, light: 1, desc: "glowmoss in a clay cup. lights a cave like a torch, and never burns out." });
  kind("compass", { noun: "tool", label: "seeker stone", emoji: "🧭", r: 0.12, color: 0xf2b84a, tool: "seek", desc: "hold it and ask: it points at the nearest place nobody has found." });
  kind("waymark", { noun: "tool", label: "waystone seed", emoji: "🌀", r: 0.14, color: 0x9ab8f0, tool: "plant", desc: "hold it and set it down: a waystone of your own grows there." });
  kind("frostflask", { noun: "tool", label: "frost flask", emoji: "🧴", r: 0.13, color: 0xcfeeff, tool: "cool", desc: "in your bag, the heat does not make you thirsty." });
  kind("mooncharm", { noun: "tool", label: "moon charm", emoji: "🌙", r: 0.11, color: 0xf2f2ff, tool: "ward", desc: "in your bag, cave grumps are slower to find you in the dark." });
  kind("silverpick", { noun: "tool", label: "silver pick", emoji: "⛏", r: 0.15, color: 0xdfe8f0, tool: "mine", desc: "cuts anything but starmetal's own heart quickly, and cuts starmetal at all." });
  kind("starpick", { noun: "tool", label: "starmetal pick", emoji: "⛏", r: 0.15, color: 0x8fd8ff, tool: "mine", glow: 1, desc: "the best pick there is." });
  kind("starblade", { noun: "tool", label: "starmetal blade", emoji: "🗡", r: 0.16, color: 0x8fd8ff, tool: "fight", glow: 1, desc: "the best blade there is. grumps do not stay long." });
  if (Sv() && Sv().TOOL) {
    var TL = Sv().TOOL;
    if (!TL.shovel) TL.shovel = { wood: 0, stone: 0.5, ore: 0, dmg: 0.4, uses: 200 };
    if (!TL.silverpick) TL.silverpick = { wood: 0.5, stone: 5, ore: 4, dmg: 1, uses: 900 };
    if (!TL.starpick) TL.starpick = { wood: 0.5, stone: 7, ore: 6, dmg: 1.25, uses: 1500 };
    if (!TL.starblade) TL.starblade = { wood: 0.3, stone: 0, ore: 0, dmg: 3, uses: 900 };
  }
  if (Sv() && Sv().FUEL && !Sv().FUEL.coal) Sv().FUEL.coal = 1.6;

  // the rocks of a delve: nop (the smols' own eyes skip them), no drops (the island's clock does not tick them)
  function node(k, def) { if (!NK[k]) { def.nop = 1; NK[k] = def; } }
  node("d_rock", { noun: "stone", label: "cave rock", emoji: "🪨", r: 0.55, desc: "plain cave rock. chips into stones." });
  node("d_flint", { noun: "stone", label: "flint seam", emoji: "🔷", r: 0.5, desc: "a seam of sharp dark flint." });
  node("d_copper", { noun: "material", label: "deep copper vein", emoji: "🟠", r: 0.55, desc: "copper, and iron ore at its heart." });
  node("d_coal", { noun: "material", label: "coal seam", emoji: "⚫", r: 0.5, desc: "black and crumbly. burns for a long time." });
  node("d_moss", { noun: "material", label: "glowmoss", emoji: "🟢", r: 0.45, glow: 1, desc: "it lights the whole level." });
  node("d_iron", { noun: "material", label: "iron seam", emoji: "🪨", r: 0.55, desc: "dark heavy ore. needs a pick." });
  node("d_silver", { noun: "material", label: "silver vein", emoji: "⚪", r: 0.55, desc: "pale ore. needs an iron pick." });
  node("d_gem", { noun: "material", label: "geode pocket", emoji: "🪨", r: 0.5, desc: "lumpy rocks with something inside." });
  node("d_star", { noun: "material", label: "starmetal lode", emoji: "🌠", r: 0.55, glow: 1, desc: "it hums. needs a silver pick." });
  node("d_bones", { noun: "material", label: "old bones", emoji: "🦴", r: 0.5, desc: "something very big, very long ago. dig them out." });
  if (Sv() && Sv().ROCKS) {
    var RK = Sv().ROCKS;
    if (!RK.d_rock) RK.d_rock = { item: "stone", left: 5, hp: 1.5 };
    if (!RK.d_flint) RK.d_flint = { item: "flint", left: 4, hp: 1.8 };
    if (!RK.d_copper) RK.d_copper = { item: "ore", left: 3, hp: 2.5, ore: 1 };
    if (!RK.d_coal) RK.d_coal = { item: "coal", left: 3, hp: 1.6 };
    if (!RK.d_iron) RK.d_iron = { item: "ironore", left: 2, hp: 3, ore: 1 };
    if (!RK.d_silver) RK.d_silver = { item: "silverore", left: 2, hp: 5, ore: 1 };
    if (!RK.d_gem) RK.d_gem = { item: "geode", left: 2, hp: 3, ore: 1 };
    if (!RK.d_star) RK.d_star = { item: "starmetal", left: 1, hp: 8, ore: 1 };
  }
  // how strong a pick each one takes: [ore power, what to say]
  D.NEED = { d_copper: [1, "a stone pick"], d_iron: [1, "a stone pick"], d_gem: [1, "a stone pick"], d_silver: [2.5, "an iron pick"], d_star: [4, "a silver pick"] };

  // places nobody builds (this file puts them down): you can look at them
  function struct(k, lbl, emoji, r, desc) { if (!SK[k]) SK[k] = { noun: "wonder", label: lbl, emoji: emoji, r: r, cost: {}, work: 1, desc: desc }; }
  D.POI = {
    lookout: { icon: "🔭", name: "lookout rock", n: 2, r: 0.9, desc: "climb it and the fog lifts for a long way round." },
    ring: { icon: "🗿", name: "standing stones", n: 3, r: 1.2, desc: "touch them for a boon. one boon at a time." },
    spring: { icon: "♨️", name: "hot spring", n: 2, r: 1.1, desc: "a soak mends hearts, warms you through and fills your pep." },
    hermit: { icon: "🧙", name: "hermit's camp", n: 1, max: 1, r: 1, desc: "knows where things are. swaps a map scrap for a gem." },
    shrine: { icon: "⛩", name: "lost shrine", n: 2, r: 0.7, desc: "leave some food here." },
    cache: { icon: "✖", name: "buried cache", n: 3, r: 0.5, desc: "something is buried here. it needs a digging stick." },
    waystone: { icon: "🌀", name: "waystone", n: 4, r: 0.5, desc: "wake it, then travel between the ones you have woken." },
    camp: { icon: "🏕", name: "old camp", n: 2, r: 0.9, desc: "somebody lived here once. have a rummage." },
    tidepool: { icon: "🐚", name: "tide pool", n: 2, r: 0.8, biomes: ["beach", "reef", "mangrove"], desc: "comb it at low tide (dawn and dusk)." },
    dig: { icon: "🕳", name: "soft earth", n: 9, r: 0.45, desc: "the ground is loose here. dig, with a digging stick." },
    islet: { icon: "🏝", name: "castaway's flag", n: 3, r: 0.4, far: 1, desc: "only a raft gets you here." }
  };
  Object.keys(D.POI).forEach(function (k) { var d = D.POI[k]; struct("poi_" + k, d.name, d.icon, d.r, d.desc); });
  struct("delvemouth", "delve marker", "🪜", 0.6, "a post by the cave mouth. the notches say how deep it has been explored.");
  struct("rainbowend", "the rainbow's end", "🌈", 0.5, "where the rainbow touches down. take what it left.");

  // chests (loot.js): a locker three levels down, the hoard at the bottom, buried treasure, a castaway's chest
  if (SB.Loot && SB.Loot.TABLES) {
    var LT = SB.Loot.TABLES;
    if (!LT.delve3) LT.delve3 = { name: "an old pod locker, three levels down", shells: [2, 4], mote: 0.5, fruit: 0.2, sure: [["torch", 2]], items: [["ironore", 1, 2, 2], ["coal", 2, 3, 2], ["glowmoss", 2, 3, 2], ["mapscrap", 1, 1, 1]] };
    if (!LT.delve6) LT.delve6 = { name: "the hoard at the heart of the cave", shells: [8, 12], motes: 2, fruits: 1, sure: [["starmetal", 1], ["silver", 1]], items: [["geode", 2, 3, 1], ["crystal", 1, 2, 1], ["mapscrap", 1, 1, 1]] };
    if (!LT.buried) LT.buried = { name: "a buried chest", shells: [4, 8], mote: 0.6, fruit: 0.35, items: [["silver", 1, 1, 1], ["geode", 1, 2, 2], ["iron", 1, 1, 1], ["pearl", 1, 2, 2], ["amber", 1, 2, 2], ["potion", 1, 1, 1]] };
    if (!LT.islet) LT.islet = { name: "a castaway's chest", shells: [3, 6], mote: 0.5, fruit: 0.4, sure: [["pearl", 2]], items: [["mapscrap", 1, 1, 2], ["fish", 2, 3, 2], ["metal", 1, 2, 1], ["opal", 1, 1, 1]] };
    ["wreck", "ruin"].forEach(function (t) { if (LT[t] && !LT[t].items.some(function (x) { return x[0] === "mapscrap"; })) LT[t].items.push(["mapscrap", 1, 1, 1]); });
  }

  /* ================= recipes (made from the bag's map tab) ================= */
  D.RECIPES = [
    { id: "raft", in: { log: 3, vine: 3 }, hint: "three logs lashed together" },
    { id: "shovel", in: { stick: 1, flint: 1, vine: 1 }, hint: "a flint on a stick" },
    { id: "ropeladder", in: { vine: 4, stick: 4 }, hint: "vines and rungs" },
    { id: "mosslamp", in: { glowmoss: 2, clay: 1, stick: 1 }, hint: "glowmoss in a clay cup" },
    { id: "compass", in: { amber: 1, flint: 1, fiber: 1 }, hint: "amber on a thread" },
    { id: "waymark", in: { opal: 1, stone: 4 }, hint: "an opal in a ring of stones" },
    { id: "frostflask", in: { icegem: 1, clay: 2 }, hint: "a frost shard sealed in clay" },
    { id: "mooncharm", in: { pearl: 1, silver: 1, fiber: 1 }, hint: "a pearl set in silver" },
    { id: "silver", in: { silverore: 1, coal: 1 }, at: "kiln", hint: "silver ore and coal, at a lit kiln" },
    { id: "silverpick", in: { silver: 1, stick: 1, vine: 1 }, hint: "silver on a handle" },
    { id: "starpick", in: { starmetal: 1, silver: 1, stick: 1 }, hint: "starmetal, silver and a handle" },
    { id: "starblade", in: { starmetal: 2, stick: 1 }, hint: "two starmetal and a grip" }
  ];
  D.recipe = function (id) { for (var i = 0; i < D.RECIPES.length; i++) if (D.RECIPES[i].id === id) return D.RECIPES[i]; return null; };
  D.whyNotMake = function (game, c, id) {
    var rc = D.recipe(id);
    if (!rc) return "that's not a recipe";
    if (!c || c.tier < 2) return "you need hands to make things";
    var lack = [];
    for (var k in rc.in) { var h = Sv().count(c, k); if (h < rc.in[k]) lack.push((rc.in[k] - h) + " " + label(k)); }
    if (lack.length) return "missing " + lack.join(", ");
    if (rc.at === "kiln" && !(Sv().nearKiln && Sv().nearKiln(c, game))) return "do this by a lit kiln";
    return "";
  };
  D.make = function (game, c, id) {
    var why = D.whyNotMake(game, c, id), rc = D.recipe(id);
    if (why) return fail(why);
    for (var k in rc.in) Sv().take(c, k, rc.in[k]);
    give(game, c, rc.id, 1);
    c.stats.crafted = (c.stats.crafted || 0) + 1;
    if (game.stats) game.stats.crafted = (game.stats.crafted || 0) + 1;
    SB.bus.emit("deepMake", { c: c, id: id });
    SB.bus.emit("craft", { c: c, id: id, item: { kind: rc.id }, pov: true });
    return ok("made a " + label(rc.id));
  };

  /* ================= delves ================= */
  D.MAX = 6; D.SLOTS = 7; D.REACH = 4.5; D.RING = 11; D.PEP = 0.25; D.SECS = 30; D.TORCH_SECS = 70; D.RESTOCK = 3; D.DARK_SECS = 12;
  D.NODE_ID0 = 3e7;
  D.ZONES = [null,
    { name: "the mouth hall", rule: "daylight reaches here", dark: 0, grump: 0, nodes: [["d_rock", 3], ["d_flint", 2], ["d_copper", 2], ["d_coal", 2]] },
    { name: "the copper galleries", rule: "dark: bring a torch", dark: 1, grump: 0.25, nodes: [["d_copper", 4], ["d_coal", 3], ["d_rock", 1], ["d_bones", 1]] },
    { name: "the glow garden", rule: "glowmoss lights it: no torch burns here", dark: 0, grump: 0.2, chest: "delve3", nodes: [["d_moss", 4], ["d_iron", 2], ["d_gem", 2], ["d_coal", 1]] },
    { name: "the drip hall", rule: "dark and dripping: you get soaked", dark: 1, grump: 0.35, wet: 1, nodes: [["d_iron", 3], ["d_silver", 2], ["d_gem", 2], ["d_bones", 1]] },
    { name: "the ember crack", rule: "dark and hot: you get thirsty", dark: 1, grump: 0.45, hot: 1, nodes: [["d_silver", 3], ["d_gem", 2], ["d_star", 1], ["d_coal", 2]] },
    { name: "the heart of the cave", rule: "dark. the keeper guards the hoard", dark: 1, grump: 0, keeper: 1, chest: "delve6", nodes: [["d_star", 3], ["d_silver", 2], ["d_gem", 2]] }
  ];
  D.RULES = [
    "⬇ at a cave mouth, in a body: go down one level at a time. you stay at the mouth: the rocks round it change",
    "💨 each level down costs a quarter of your pep and half a minute. climbing up is easy",
    "🔥 below level 1 it is dark: carry a torch (one burns out every " + D.TORCH_SECS + " seconds down there) or a moss lamp (never)",
    "⛏ deeper rock is richer and harder: copper and coal, then iron, silver (iron pick), starmetal (silver pick)",
    "👹 cave grumps live below. no light and they find you fast. they follow you no further than the mouth",
    "🧰 a locker at level 3, a keeper and a hoard at level " + D.MAX + ". mined rock comes back after " + D.RESTOCK + " days",
    "🚶 walk away from the mouth and you are back on top"
  ];
  D.caves = function (game) { return (game.world && game.world.T && game.world.T.caves) || []; };
  D.caveById = function (game, id) { var n = id == null ? null : game.world.nodeById[id]; return n && n.kind === "cave" ? n : null; };
  D.caveNear = function (game, x, z, r) {
    var best = null, bd = r == null ? 1e9 : r;
    D.caves(game).forEach(function (cv) { var d = SB.dist(cv.x, cv.z, x, z); if (d < bd) { bd = d; best = cv; } });
    return best;
  };
  D.delve = function (game, cave) {
    var s = st(game), d = s.delves[cave.id];
    if (!d || typeof d !== "object") d = s.delves[cave.id] = { depth: 0, max: 0 };
    if (!d.mined || typeof d.mined !== "object") d.mined = {};
    return d;
  };
  D.cur = function (game) { var s = st(game); return s.cur == null ? null : D.caveById(game, s.cur); };
  D.depth = function (game) { var cv = D.cur(game); return cv ? D.delve(game, cv).depth || 0 : 0; };
  D.zone = function (game) { return D.ZONES[D.depth(game)] || null; };
  D.deepest = function (game) { var s = st(game), m = 0; for (var k in s.delves) m = Math.max(m, s.delves[k].max || 0); return m; };
  D.hasLight = function (c) { return has(c, "mosslamp") || has(c, "torch"); };
  D.isDelveNode = function (n) { return !!(n && n.kind && n.kind.charAt(0) === "d" && n.kind.charAt(1) === "_"); };

  function clearNodes(game) {
    var w = game.world, s = st(game), any = false;
    s.nodes.forEach(function (id) {
      var n = w.nodeById[id];
      if (!n) return;
      var i = w.nodes.indexOf(n);
      if (i >= 0) w.nodes.splice(i, 1);
      delete w.nodeById[id];
      n.state = "gone"; W().markNode(w, n); any = true;
    });
    s.nodes = [];
    if (any) W().rebuildNodeGrid(w);
  }
  // swap the rocks round the mouth for this level's. The same cave and level always hold the same rocks
  function populate(game, cave, depth) {
    clearNodes(game);
    var z = D.ZONES[depth];
    if (!z) return 0;
    var w = game.world, s = st(game), d = D.delve(game, cave), r = dice(game, "delve:" + cave.id + ":" + depth), today = day(game), tot = 0, made = [];
    z.nodes.forEach(function (x) { tot += x[1]; });
    for (var i = 0; i < D.SLOTS; i++) {
      var roll = r() * tot, j = 0;
      while (j < z.nodes.length - 1 && (roll -= z.nodes[j][1]) > 0) j++;
      var nk = z.nodes[j][0], a0 = i / D.SLOTS * 6.283 + r() * 0.5, size = 0.8 + r() * 0.4, rot = r() * 6.283, sd = (r() * 1e9) | 0, d0 = 2.4 + r() * 2.6;
      var m = d.mined[depth + ":" + i];
      if (m && today - m < D.RESTOCK) continue;
      var spot = null;
      for (var t = 0; t < 6 && !spot; t++) {
        var dd = d0 + t * 0.7, aa = a0 + t * 0.35, px = cave.x + Math.sin(aa) * dd, pz = cave.z + Math.cos(aa) * dd;
        if (!W().inBounds(w, px, pz) || !W().walkable(w, px, pz, false) || W().depthAt(w, px, pz) > 0.05) continue;
        if (W().nearestNode(w, px, pz, 1, function (o) { return o.state !== "gone"; })) continue;
        if (W().structsNear(w, px, pz, 1.2).length) continue;
        if (made.some(function (o) { return SB.dist(o.x, o.z, px, pz) < 1.1; })) continue;
        spot = { x: px, z: pz };
      }
      if (!spot) continue;
      var n = { id: D.NODE_ID0 + (s.nid++), kind: nk, x: spot.x, z: spot.z, s: size, rot: rot, seed: sd, added: true, type: "node", noun: NK[nk].noun, dropT: 1e9, alsoT: 1e9, state: "ok", nop: 1, delve: { cave: cave.id, depth: depth, slot: i } };
      w.nodes.push(n); w.nodeById[n.id] = n; s.nodes.push(n.id); made.push(n);
    }
    W().rebuildNodeGrid(w);
    made.forEach(function (o) { W().markNode(w, o); });
    return made.length;
  }
  D.nodes = function (game) { var w = game.world; return st(game).nodes.map(function (id) { return w.nodeById[id]; }).filter(Boolean); };
  function mined(game, n) {
    var cv = n && n.delve ? D.caveById(game, n.delve.cave) : null;
    if (cv) D.delve(game, cv).mined[n.delve.depth + ":" + n.delve.slot] = day(game);
  }

  /* ---- the chests that sit at a level (real loot.js chests, there only while you are at that level) ---- */
  function chestKey(caveId, depth) { return "delve" + depth + "-" + caveId; }
  function syncChests(game) {
    var L = SB.Loot;
    if (!L || !L.state || !SK.lootchest) return;
    var ls = L.state(game), w = game.world, cv = D.cur(game), depth = D.depth(game), z = D.ZONES[depth];
    var want = cv && z && z.chest ? chestKey(cv.id, depth) : null;
    if (want && !ls.chests[want]) L.place(game, want, z.chest, cv.x, cv.z);
    for (var key in ls.chests) {
      if (key.indexOf("delve") !== 0) continue;
      var e = ls.chests[key], b = L.structOf(game, e);
      if (b && key !== want) W().removeStructure(w, b);
      else if (!b && key === want) {
        b = { id: SB.Game.newId(game), type: "struct", kind: "lootchest", noun: "wonder", x: e.x, z: e.z, rot: (hashKey(key) % 628) / 100, s: 1, done: true, work: 0, need: {}, tribe: 0, builders: [], data: { loot: key, table: e.kind, open: !!e.open }, born: game.time, name: null };
        w.structures.push(b); e.id = b.id; W().markNode(w, b);
      }
    }
  }

  /* ---- cave grumps ---- */
  var grumpId = null, grumpT = 0, burnT = 0, darkT = 0, warnedDark = false;
  function grump(game) { var g = grumpId == null ? null : SB.Game.byId(game, grumpId); return g && g.alive && g.scout && !g.scout.done ? g : null; }
  D.grump = grump;
  function endGrump(game) { var g = grump(game); if (g) { g.scout.done = true; g.goingHome = true; } grumpId = null; }
  D.spawnGrump = function (game, c, depth, cave, keeper) {
    if (!SB.Game.spawnGrump || !c || c.tier < 2 || grump(game)) return null;
    var w = game.world, a0 = Math.random() * 6.283, at = null;
    for (var a = 0; a < 12 && !at; a++) { var ang = a0 + a * 0.52, x = c.x + Math.sin(ang) * 9, z = c.z + Math.cos(ang) * 9; if (W().walkable(w, x, z, false) && W().depthAt(w, x, z) < 0.05) at = { x: x, z: z }; }
    if (!at) return null;
    var g = SB.Game.spawnGrump(game, at.x, at.z);
    g.name = keeper ? "the cave's keeper" : "a cave grump"; g.caveGrump = depth;
    if (keeper) g.caveKeeper = cave.id;
    g.tough = (keeper ? 1.6 : 0.6 + depth * 0.12) * (D.moon(game).dark ? 1.3 : 1);
    g.scout = { who: c.id, t: 0, hitT: 0, speedK: 0.8, dmg: Math.min(0.2, 0.06 + depth * 0.02), lethal: 0 }; // it stings, but never takes the last quarter of your hearts
    grumpId = g.id; grumpT = 0;
    audio("grump", 0.7);
    say(keeper ? "👹 the cave's keeper! chase it off and the hoard is yours" : "👹 a cave grump! hit it, or climb out: it won't follow you up");
    SB.bus.emit("caveGrump", { c: c, g: g, depth: depth, keeper: !!keeper });
    return g;
  };
  D.keeperUp = function (game) { var g = grump(game); return !!(g && g.caveKeeper != null); };

  function arrive(game, c, cave, to, from) {
    var s = st(game), d = D.delve(game, cave), z = D.ZONES[to], first = to > (d.max || 0);
    d.depth = to; s.cur = cave.id;
    if (first) d.max = to;
    burnT = 0; darkT = 0; warnedDark = false;
    populate(game, cave, to);
    syncChests(game);
    if (to > from) {
      if (z.wet && SB.Body) SB.Body.of(c).wet = 1;
      if (z.hot && SB.Body && !has(c, "frostflask")) SB.Body.of(c).thirst = Math.min(1, SB.Body.of(c).thirst + 0.15);
      if (z.keeper && !d.keeper) D.spawnGrump(game, c, to, cave, true);
      else if (z.grump && Math.random() < z.grump * (has(c, "mooncharm") ? 0.5 : 1)) D.spawnGrump(game, c, to, cave, false);
    }
    SB.bus.emit(to > from ? "delveDown" : "delveUp", { c: c, cave: cave, depth: to, first: first });
    if (first && to === D.MAX) { d.bottom = day(game); if (SB.Game.addSparks) SB.Game.addSparks(game, 5, c); SB.bus.emit("delveBottom", { c: c, cave: cave }); }
    return { z: z, first: first };
  }
  // one level down (or, with a ladder, straight to the deepest level this cave has been explored to)
  D.down = function (game, c, cave, ladder) {
    var S = PS(), s = st(game);
    if (booted !== game) boot(game);
    if (!S || S.c !== c) return fail("only a smol you are inside can go down");
    if (!cave) return fail("no cave here");
    if (SB.dist(c.x, c.z, cave.x, cave.z) > D.REACH) return fail("get closer to the cave mouth");
    if (s.cur != null && s.cur !== cave.id) D.leave(game, "moved");
    var d = D.delve(game, cave), from = s.cur === cave.id ? d.depth || 0 : 0, to = ladder ? d.max || 0 : from + 1;
    if (ladder && (!d.ladder || to <= from)) return fail("no ladder goes deeper than this");
    if (to > D.MAX) return fail("this is the bottom: " + D.MAX + " levels down");
    var z = D.ZONES[to];
    if (z.dark && !D.hasLight(c)) return fail("too dark below: bring a torch or a moss lamp");
    var cost = D.PEP * (ladder ? 1 : to - from) * (s.boon === "delver" ? 0.5 : 1);
    if ((S.stam || 0) < cost) return fail("too puffed to climb down: catch your breath first");
    S.stam = Math.max(0, S.stam - cost);
    game.time += D.SECS * (ladder ? 1 : to - from);
    var a = arrive(game, c, cave, to, from);
    return ok("⬇ level " + to + " of " + D.MAX + " · " + z.name + ": " + z.rule + (a.first ? (to === D.MAX ? " · the bottom! +5 ✨" : " · a new record for this cave") : ""), { depth: to, first: a.first });
  };
  D.up = function (game, c, cave, all) {
    var s = st(game), S = PS();
    cave = cave || D.cur(game);
    if (!cave || s.cur !== cave.id) return fail("you are not down a cave");
    var d = D.delve(game, cave), from = d.depth || 0, to = all ? 0 : from - 1;
    if (from <= 0) return fail("you are already on top");
    if (S && S.c === c) S.stam = Math.max(0, (S.stam || 0) - 0.08);
    game.time += 12 * (from - to);
    if (to <= 0) { D.leave(game, "climbed"); return ok("🌤 back on top, in the daylight", { depth: 0 }); }
    arrive(game, c, cave, to, from);
    return ok("⬆ up to level " + to + " · " + D.ZONES[to].name, { depth: to });
  };
  // back on the surface: the rocks go, the grump stays below
  D.leave = function (game, why) {
    var s = st(game), cv = D.cur(game);
    if (cv) D.delve(game, cv).depth = 0;
    for (var k in s.delves) if (s.delves[k].depth) s.delves[k].depth = 0;
    s.cur = null;
    clearNodes(game); syncChests(game); endGrump(game);
    burnT = 0; darkT = 0;
    if (cv) SB.bus.emit("delveOut", { cave: cv, why: why || "" });
  };
  D.fixLadder = function (game, c, cave) {
    var d = D.delve(game, cave);
    if (d.ladder) return fail("there is a ladder here already");
    if (!has(c, "ropeladder")) return fail("you need a rope ladder");
    Sv().take(c, "ropeladder", 1);
    d.ladder = 1;
    SB.bus.emit("delveLadder", { c: c, cave: cave });
    return ok("🪜 the ladder is fixed. from the top you can now go straight to this cave's deepest level");
  };
  // glowmoss and old bones come out by hand, not by pick
  D.pick = function (game, c, n) {
    if (!n || n.state !== "ok" || !D.isDelveNode(n)) return fail("nothing there");
    if (SB.dist(c.x, c.z, n.x, n.z) > 3.4) return fail("get closer");
    var z = D.zone(game);
    if (z && z.dark && !D.hasLight(c)) return fail("too dark to see: you need a torch or a moss lamp");
    var msg;
    if (n.kind === "d_moss") { var nn = D.moon(game).full ? 4 : 2; give(game, c, "glowmoss", nn); msg = "🟢 " + nn + " glowmoss" + (nn > 2 ? " (it grows thick under a full moon)" : ""); }
    else if (n.kind === "d_bones") {
      if (!has(c, "shovel")) return fail("old bones in the rock. you need a digging stick");
      give(game, c, "fossil", 1); msg = "🦴 an old bone! (" + Sv().count(c, "fossil", true) + " of 5 make a whole one)";
    } else return fail("that needs a pick");
    n.state = "gone"; W().markNode(game.world, n); mined(game, n);
    SB.bus.emit("delvePick", { c: c, node: n });
    return ok(msg);
  };
  // five old bones fit together
  D.bones = function (game, c) {
    if (Sv().count(c, "fossil", true) < 5) return fail("five old bones make a whole one");
    Sv().take(c, "fossil", 5);
    if (K.heartfruit) give(game, c, "heartfruit", 1);
    if (SB.Game.addSparks) SB.Game.addSparks(game, 5, c);
    count(game, "beasts");
    SB.bus.emit("deepBeast", { c: c });
    return ok("🦖 the bones fit: a great old beast, taller than a hut! +5 ✨" + (K.heartfruit ? ", and a heart-fruit was growing through its ribs" : ""));
  };
  D.GEODE = [["crystal", 2], ["opal", 2], ["amber", 2], ["icegem", 2], ["silverore", 2], ["coal", 3], ["flint", 2]];
  D.crack = function (game, c) {
    if (!has(c, "geode")) return fail("no geode to crack");
    if (!has(c, "stone") && !has(c, "hammer") && !has(c, "primtool")) return fail("you need a stone or a hammer in your bag to crack it");
    Sv().take(c, "geode", 1);
    var r = dice(game, "geode:" + count(game, "geodes")), pool = D.GEODE.filter(function (x) { return K[x[0]]; }), tot = 0;
    pool.forEach(function (x) { tot += x[1]; });
    var roll = r() * tot, j = 0; while (j < pool.length - 1 && (roll -= pool[j][1]) > 0) j++;
    give(game, c, pool[j][0], 1);
    SB.bus.emit("deepGeode", { c: c, kind: pool[j][0] });
    return ok("💥 crack! inside: a " + label(pool[j][0]), { kind: pool[j][0] });
  };

  /* ================= places ================= */
  D.BOONS = {
    warrior: { icon: "⚔", name: "the fighter's stone", perk: "your hits land a quarter harder" },
    delver: { icon: "⛏", name: "the delver's stone", perk: "going down a cave costs half the pep, and falling rock misses you" },
    wanderer: { icon: "🥾", name: "the wanderer's stone", perk: "waystones cost half, and paddling a raft costs no pep" }
  };
  D.BOON_ORDER = ["warrior", "delver", "wanderer"];
  D.FIND_R = 7; D.SOAK_SECS = 240;
  function bid(name) { return SB.B && SB.B[name] != null ? SB.B[name] : -1; }
  function biomeName(i) { return SB.BIOMES[i] ? SB.BIOMES[i].name : "somewhere"; }
  function WG() { return SB.WorldGen; }
  // where can you walk to from the nest, and where only with a raft? (two flood fills, once per island)
  function reach(game) {
    var w = game.world, T = w.T, N = T.N, G = WG(), walk = new Uint8Array(N * N), q = new Int32Array(N * N);
    function open(i, j, swim) {
      if (i < 4 || j < 4 || i >= N - 4 || j >= N - 4) return false;
      if (G.slopeAt(T, i + 0.5, j + 0.5) > 2.8) return false;
      return swim || G.depthAt(T, i + 0.5, j + 0.5) <= 0.5;
    }
    function fill(bit, swim) {
      var sp = T.spawn || T.nest, si = sp.x | 0, sj = sp.z | 0, h = 0, t = 0;
      q[t++] = sj * N + si; walk[sj * N + si] |= bit;
      while (h < t) {
        var k = q[h++], i = k % N, j = (k / N) | 0;
        for (var e = 0; e < 4; e++) {
          var ni = i + (e === 0 ? 1 : e === 1 ? -1 : 0), nj = j + (e === 2 ? 1 : e === 3 ? -1 : 0), nk2 = nj * N + ni;
          if (ni < 0 || nj < 0 || ni >= N || nj >= N || (walk[nk2] & bit) || !open(ni, nj, swim)) continue;
          walk[nk2] |= bit; q[t++] = nk2;
        }
      }
    }
    fill(1, false); fill(2, true);
    return walk;
  }
  // every place on this island, from its seed (the same every time: nothing here is saved)
  D.pois = function (game) {
    var cch = game._deepPois;
    if (cch && cch.w === game.world) return cch.list;
    var w = game.world, T = w.T, N = T.N, G = WG(), r = dice(game, "deep-places"), out = [], KK = N / 256, sp = T.spawn || T.nest;
    var walk = reach(game), sites = game.sites || [], caves = D.caves(game), far = [];
    for (var fj = 5; fj < N - 5; fj += 2) for (var fi = 5; fi < N - 5; fi += 2) if (walk[fj * N + fi] === 2 && G.depthAt(T, fi + 0.5, fj + 0.5) < 0.02 && G.slopeAt(T, fi + 0.5, fj + 0.5) < 1) far.push(fj * N + fi);
    function land(x, z) { return W().inBounds(w, x, z) && G.depthAt(T, x, z) < 0.02 && G.slopeAt(T, x, z) < 1; }
    function clear(x, z) {
      if (SB.dist(x, z, sp.x, sp.z) < 9 || (T.nest && SB.dist(x, z, T.nest.x, T.nest.z) < 9)) return false;
      if (out.some(function (o) { return SB.dist(o.x, o.z, x, z) < 9; })) return false;
      if (sites.some(function (o) { return SB.dist(o.x, o.z, x, z) < 7; })) return false;
      if (caves.some(function (o) { return SB.dist(o.x, o.z, x, z) < 6; })) return false;
      return true;
    }
    Object.keys(D.POI).forEach(function (k) {
      var def = D.POI[k], n = Math.max(1, Math.min(def.max || 99, Math.round(def.n * Math.pow(Math.max(1, KK), 1.2)))), ring = 0;
      for (var i = 0; i < n; i++) {
        var best = null;
        for (var t = 0; t < 90 && !(def.far && !far.length); t++) {
          var x, z;
          if (def.far) { var fc = far[Math.floor(r() * far.length)]; x = (fc % N) + 0.5; z = ((fc / N) | 0) + 0.5; }
          else { var a = r() * 6.283, d = 16 + r() * (N * 0.46 - 16); x = sp.x + Math.sin(a) * d; z = sp.z + Math.cos(a) * d; }
          if (!land(x, z) || !clear(x, z)) continue;
          var bits = walk[(z | 0) * N + (x | 0)], b = G.biomeAt(T, x, z);
          if (def.far ? bits !== 2 : !(bits & 1)) continue;
          if (b === bid("ocean")) continue;
          if (def.biomes && !def.biomes.some(function (nm) { return bid(nm) === b; })) continue;
          if (def.far && !(land(x + 1, z) && land(x - 1, z) && land(x, z + 1) && land(x, z - 1))) continue;
          var cand = { id: k + i, kind: k, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, b: b, h: G.heightAt(T, x, z) };
          if (k !== "lookout") { best = cand; break; }
          if (!best || cand.h > best.h) best = cand; // a lookout takes the highest of the spots it tried
        }
        if (!best) continue;
        if (k === "ring") best.boon = D.BOON_ORDER[ring++ % D.BOON_ORDER.length];
        out.push(best);
      }
    });
    game._deepPois = { w: game.world, list: out };
    return out;
  };
  D.poi = function (game, id) { var l = D.pois(game); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; };
  function put(game, k, x, z, data, rot) {
    var b = { id: SB.Game.newId(game), type: "struct", kind: k, noun: SK[k].noun, x: x, z: z, rot: rot || 0, s: 1, done: true, work: 0, need: {}, tribe: 0, builders: [], data: data || {}, born: game.time, name: null };
    game.world.structures.push(b);
    W().markNode(game.world, b);
    return b;
  }
  D.structOf = function (game, id) { var s = game.world.structures; for (var i = 0; i < s.length; i++) if (s[i].data && s[i].data.poi === id) return s[i]; return null; };
  D.mouthOf = function (game, cave) { var s = game.world.structures; for (var i = 0; i < s.length; i++) if (s[i].kind === "delvemouth" && s[i].data && s[i].data.cave === cave.id) return s[i]; return null; };
  function sideSpot(game, x, z, key) {
    var w = game.world, r = dice(game, key);
    for (var t = 0; t < 20; t++) { var a = r() * 6.283, d = 1.5 + r() * 0.8 + t * 0.1, px = x + Math.sin(a) * d, pz = z + Math.cos(a) * d; if (W().inBounds(w, px, pz) && W().walkable(w, px, pz, false) && W().depthAt(w, px, pz) < 0.05) return { x: Math.round(px * 10) / 10, z: Math.round(pz * 10) / 10 }; }
    return { x: x + 1.5, z: z + 0.5 };
  }
  D.progress = function (game) {
    var l = D.pois(game), s = st(game), found = 0, by = {};
    l.forEach(function (p) { var o = by[p.kind] || (by[p.kind] = { n: 0, found: 0 }); o.n++; if (s.found[p.id]) { o.found++; found++; } });
    return { found: found, total: l.length, by: by, pct: Math.round((W().seenFraction ? W().seenFraction(game.world) : 1) * 100), deepest: D.deepest(game) };
  };
  D.found = function (game, p, c) {
    var s = st(game);
    if (s.found[p.id]) return false;
    s.found[p.id] = day(game);
    if (!D.structOf(game, p.id)) put(game, "poi_" + p.kind, p.x, p.z, { poi: p.id }, (hashKey(p.id) % 628) / 100);
    if (p.kind === "islet" && SB.Loot && SB.Loot.TABLES.islet) SB.Loot.place(game, "deep-islet-" + p.id, "islet", p.x, p.z);
    if (SB.Game.addSparks) SB.Game.addSparks(game, 1, c || null);
    if (SB.Mine && SB.Mine.count) SB.Mine.count(game, "explore");
    var pr = D.progress(game), def = D.POI[p.kind];
    SB.bus.emit("poiFound", { c: c || null, poi: p, found: pr.found, total: pr.total });
    tell(def.icon + " " + (c && PS() && PS().c === c ? "you" : c ? c.name : "someone") + " found " + (p.kind === "hermit" ? "the " : "a ") + def.name + "! " + def.desc + " (" + pr.found + " of " + pr.total + " places · +1 ✨)");
    audio("chime", 0.7);
    return true;
  };
  D.lowTide = function (game) { var t = tday(game); return Math.abs(t - 0.25) < 0.07 || Math.abs(t - 0.75) < 0.07; };
  D.moon = function (game) { var ph = (day(game) - 1) % 8; return { phase: ph, dark: ph === 0, full: ph === 4, icon: ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"][ph], name: ph === 0 ? "dark moon: cave grumps are tougher" : ph === 4 ? "full moon: glowmoss grows thick" : "an ordinary moon" }; };
  D.DIG = { forest: "amber", jungle: "amber", maple: "amber", bamboo: "amber", blossom: "amber", desert: "opal", mesa: "opal", savanna: "opal", tundra: "icegem", taiga: "icegem", mountain: "icegem", beach: "pearl", reef: "pearl", mangrove: "pearl" };
  D.GEMS = ["amber", "opal", "icegem", "pearl", "geode", "fossil"];
  function noteFind(game, b, k, n) { var s = st(game), o = s.finds[b] || (s.finds[b] = {}); o[k] = (o[k] || 0) + (n || 1); }
  function fogged(game) { var wx = game.world.weather; return (wx && wx.kind === "fog") || D.blizzard(game); }

  // what you can do at a place: { use: {label, locked, go}, place: {...} }. go() returns {ok, msg}
  D.poiOps = function (game, c, b, hk) {
    var s = st(game), k = b.kind.slice(4), id = b.data ? b.data.poi : null, p = id ? D.poi(game, id) : null, u = id ? s.used[id] : null, today = day(game), out = {};
    function near() { return SB.dist(c.x, c.z, b.x, b.z) <= 4.5; }
    function act(lbl, fn) { return { label: lbl, go: function () { if (!near()) return fail("get closer"); var r = fn(); if (r && r.ok) SB.bus.emit("poiUsed", { c: c, kind: k, st: b }); return r; } }; }
    function no(lbl) { return { label: lbl, locked: true }; }
    if (p && !s.found[id]) D.found(game, p, c);
    if (k === "lookout") {
      out.use = fogged(game) ? no("too foggy to see far. come back when it clears") : act("climb up and look out", function () {
        var n = W().reveal(game.world, b.x, b.z, 46);
        s.used[id] = today; count(game, "views");
        return ok(n ? "🔭 you can see for miles from up here: the map filled in" : "🔭 a fine view. nothing new from up here");
      });
    } else if (k === "ring") {
      var bn = (p && p.boon) || b.data.boon || "warrior", B = D.BOONS[bn];
      out.use = s.boon === bn ? no(B.name + " already hums for you: " + B.perk) : act("touch " + B.name + " (" + B.perk + ")", function () {
        var was = s.boon; s.boon = bn; s.used[id] = today;
        SB.bus.emit("deepBoon", { c: c, boon: bn });
        return ok(B.icon + " " + B.name + ": " + B.perk + (was ? ". (it takes the place of " + D.BOONS[was].name + ")" : ". one boon at a time"));
      });
    } else if (k === "spring") {
      out.use = u && u.until > game.time ? no("still glowing from the last soak. come back in a bit") : act("soak in the hot spring", function () {
        var ch = c.chem, S = PS();
        ch.health = Math.min(1, (ch.health || 0) + 0.5); ch.pain = 0; ch.cold = 0; ch.tired = Math.max(0, (ch.tired || 0) - 0.4);
        if (S && S.c === c) S.stam = 1;
        s.used[id] = { until: game.time + D.SOAK_SECS };
        return ok("♨️ ahh. hearts mended, warm to the bones, pep full");
      });
    } else if (k === "hermit") {
      var gem = hk && D.GEMS.indexOf(hk) >= 0 ? hk : null;
      out.use = act("ask the hermit where to go", function () {
        var t = D.seek(game, c, true);
        return ok(t ? "🧙 “" + t.what + "? that way, about " + Math.round(t.d) + " steps. follow the 🧭.”" : "🧙 “you've seen it all, little one. i've nothing left to tell.”");
      });
      out.place = gem ? act("swap your " + label(gem) + " for a map scrap", function () {
        Sv().take(c, gem, 1); give(game, c, "mapscrap", 1); count(game, "swaps");
        return ok("🧙 “pretty! here: i never did go and dig this one up.” (a map scrap: hold it and read it)");
      }) : no("the hermit swaps a map scrap for a gem, a geode or an old bone: hold one");
    } else if (k === "shrine") {
      var food = hk && Sv().edible && Sv().edible(hk) ? hk : null;
      out.use = !food ? no("leave some food here: hold something to eat") : u && u.day === today ? no("the shrine has had its gift today") : act("leave your " + label(food) + " at the shrine", function () {
        var first = !u;
        Sv().take(c, food, 1);
        s.used[id] = { day: today, n: ((u && u.n) || 0) + 1 };
        c.chem.fear = 0; c.chem.pain = 0;
        if (first) { if (K.mote) give(game, c, "mote", 1); else if (SB.Game.addSparks) SB.Game.addSparks(game, 2, c); }
        return ok(first ? "⛩ the old stone warms under your paw, and something small and bright rolls out: a light mote. somebody left it here for whoever came next" : "⛩ you feel calm. no fear, no ache");
      });
    } else if (k === "cache" || k === "dig") {
      if (u) out.use = no(k === "cache" ? "an empty hole. you already dug this up" : "a dug hole");
      else if (!has(c, "shovel")) out.use = no((k === "cache" ? "something is buried here" : "the earth is loose here") + ". you need a digging stick");
      else out.use = act("dig here", function () {
        s.used[id] = today; count(game, "dug");
        if (k === "cache") { if (SB.Loot && SB.Loot.TABLES.buried) SB.Loot.place(game, "deep-cache-" + id, "buried", b.x, b.z); SB.bus.emit("deepDig", { c: c, kind: "cache" }); return ok("🧰 thunk. your digging stick hits wood: a buried chest! open it"); }
        var bi = W().biomeAt(game.world, b.x, b.z), bname = SB.BIOMES[bi] ? SB.BIOMES[bi].id : "", r = dice(game, "dig:" + id), got = D.DIG[bname], parts = [];
        if (got) { give(game, c, got, 1); noteFind(game, bi, got); parts.push("a " + label(got)); }
        else { var alt = bname === "shroom" && K.glowcap ? "glowcap" : "seed"; give(game, c, alt, 3); noteFind(game, bi, alt, 3); parts.push("3 " + label(alt) + "s"); }
        if (r() < 0.3) { give(game, c, "fossil", 1); noteFind(game, bi, "fossil"); parts.push("an old bone"); }
        SB.bus.emit("deepDig", { c: c, kind: "dig", biome: bi });
        return ok("🕳 you dig up " + parts.join(" and ") + (got ? ". you only find those in the " + biomeName(bi) : ""));
      });
    } else if (k === "waystone") {
      if (!b.data.awake) out.use = act("wake the waystone", function () { b.data.awake = 1; if (id) s.used[id] = today; return ok("🌀 the waystone hums awake. stand at any woken stone to travel to another (" + D.waystones(game).length + " awake)"); });
      else {
        var others = D.waystones(game).filter(function (o) { return o !== b; });
        out.use = others.length ? { label: "travel from this waystone…", open: "deep", go: function () { return ok("🌀 pick a stone in the map tab. each trip costs a " + (s.boon === "wanderer" ? "little" : "quarter") + " of your food bar"); } } : no("awake. wake another waystone and you can travel between them");
        if (others.length === 1) out.place = act("travel to the other waystone", function () { return D.travel(game, c, others[0].id); });
      }
    } else if (k === "camp") {
      out.use = u ? no("nothing left in the old camp") : act("rummage in the old camp", function () {
        var r = dice(game, "camp:" + id), parts = [];
        s.used[id] = today;
        [["stick", 3], ["fiber", 2], [r() < 0.5 ? "flint" : "stone", 2], [r() < 0.5 ? "torch" : "cooked", 1]].forEach(function (x) { if (K[x[0]]) { give(game, c, x[0], x[1]); parts.push(x[1] + " " + label(x[0])); } });
        if (r() < 0.6) { give(game, c, "mapscrap", 1); parts.push("a map scrap tucked under the bedroll"); }
        return ok("🏕 under the old bedroll: " + parts.join(", "));
      });
    } else if (k === "tidepool") {
      var tide = Math.floor((game.time || 0) / (SB.DAY_LENGTH / 2));
      out.use = !D.lowTide(game) ? no("the tide is in. come back at low tide (dawn and dusk)") : u && u.tide === tide ? no("picked clean until the next low tide") : act("comb the tide pool", function () {
        var r = dice(game, "tide:" + id + ":" + tide), parts = [], bi = W().biomeAt(game.world, b.x, b.z);
        s.used[id] = { tide: tide };
        if (K.clam) { var nc = 1 + Math.floor(r() * 2); give(game, c, "clam", nc); parts.push(nc + " clam" + (nc > 1 ? "s" : "")); }
        if (r() < 0.45) { give(game, c, "pearl", 1); noteFind(game, bi, "pearl"); parts.push("a pearl!"); }
        return ok("🐚 in the pool: " + (parts.join(" and ") || "only sand this time"));
      });
    } else if (k === "islet") {
      out.use = no("a castaway's flag. only a raft gets anybody here");
    }
    return out;
  };
  D.waystones = function (game) { return game.world.structures.filter(function (b) { return b.kind === "poi_waystone" && b.data && b.data.awake; }); };
  D.travelCost = function (game) { return st(game).boon === "wanderer" ? 0.12 : 0.25; };
  D.travel = function (game, c, toId) {
    var ws = D.waystones(game), from = null, to = null, w = game.world;
    ws.forEach(function (b) { if (SB.dist(b.x, b.z, c.x, c.z) < 5) from = b; if (b.id === toId) to = b; });
    if (!from) return fail("stand at a woken waystone to travel");
    if (!to || to === from) return fail("pick another woken waystone");
    var cost = D.travelCost(game);
    if ((c.chem.hunger || 0) + cost > 0.95) return fail("too hungry to travel: the stones take a bite of your food bar. eat first");
    if (D.cur(game)) D.leave(game, "travel");
    var spot = sideSpot(game, to.x, to.z, "way:" + to.id + ":" + count(game, "trips"));
    c.x = spot.x; c.z = spot.z; if (c.px != null) c.px = c.x; if (c.pz != null) c.pz = c.z;
    hunger(c, cost);
    game.time += 20;
    W().reveal(w, c.x, c.z, 10, true);
    sparkle(game, c.x, c.z, 24);
    SB.bus.emit("deepTravel", { c: c, from: from, to: to });
    return ok("🌀 the island folds, and you are standing at the " + biomeName(W().biomeAt(w, to.x, to.z)) + " waystone");
  };
  // a waystone of your own
  D.raise = function (game, c) {
    var w = game.world;
    if (!has(c, "waymark")) return fail("you need a waystone seed");
    if (W().depthAt(w, c.x, c.z) > 0.05 || !W().walkable(w, c.x, c.z, false)) return fail("it needs dry ground");
    if (W().structsNear(w, c.x, c.z, 2.5).length) return fail("too close to something else");
    Sv().take(c, "waymark", 1);
    var a = c.facing || 0, b = put(game, "poi_waystone", c.x + Math.sin(a) * 1.3, c.z + Math.cos(a) * 1.3, { awake: 1, raised: 1 }, 0);
    SB.bus.emit("deepRaise", { c: c, st: b });
    return ok("🌀 a waystone grows where you set the seed. it is awake already");
  };
  // the nearest place nobody has found: a place of this file's, a site, or a cave nobody has been down
  D.seek = function (game, c, quiet) {
    var s = st(game), best = null, bd = 1e9;
    function see(x, z, what) { var d = SB.dist(x, z, c.x, c.z); if (d < bd) { bd = d; best = { x: x, z: z, d: d, what: what }; } }
    D.pois(game).forEach(function (p) { if (!s.found[p.id] && !(p.kind === "islet" && !has(c, "raft"))) see(p.x, p.z, "somewhere new"); });
    (game.sites || []).forEach(function (o) { if (!o.found && !o.gone && !o.done) see(o.x, o.z, "somewhere new"); });
    D.caves(game).forEach(function (cv) { if (!(D.delve(game, cv).max > 0)) see(cv.x, cv.z, "a cave nobody has been down"); });
    if (best && P() && P().setGoal && PS()) P().setGoal({ x: best.x, z: best.z, label: "🧭 " + best.what, small: true, deep: 1 });
    if (best) SB.bus.emit("deepSeek", { c: c, at: best });
    return best;
  };
  /* ---- treasure maps ---- */
  D.readMap = function (game, c) {
    var s = st(game), w = game.world;
    if (!has(c, "mapscrap")) return fail("no map scrap to read");
    var r = dice(game, "map:" + s.maps.length + ":" + (s.n.maps || 0)), spot = null;
    for (var t = 0; t < 60 && !spot; t++) {
      var a = r() * 6.283, d = 28 + r() * 40, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      if (!W().inBounds(w, x, z) || W().depthAt(w, x, z) > 0.02 || !W().walkable(w, x, z, false)) continue;
      if (W().structsNear(w, x, z, 2).length) continue;
      spot = { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
    }
    if (!spot) return fail("the ink has run. try reading it somewhere else");
    Sv().take(c, "mapscrap", 1);
    var m = { id: count(game, "maps"), x: spot.x, z: spot.z, done: 0 };
    s.maps.push(m);
    if (P() && P().setGoal && PS()) P().setGoal({ x: m.x, z: m.z, label: "✖ the map's X", small: true, deep: 1 });
    SB.bus.emit("deepMap", { c: c, map: m });
    return ok("🗺 an X, " + Math.round(SB.dist(c.x, c.z, m.x, m.z)) + " steps away in the " + biomeName(W().biomeAt(w, m.x, m.z)) + ". follow the ✖ and dig there with a digging stick", { map: m });
  };
  D.mapHere = function (game, c) { var s = st(game); for (var i = 0; i < s.maps.length; i++) if (!s.maps[i].done && SB.dist(c.x, c.z, s.maps[i].x, s.maps[i].z) < 3) return s.maps[i]; return null; };
  D.digMap = function (game, c) {
    var m = D.mapHere(game, c);
    if (!m) return fail("no X here");
    if (!has(c, "shovel")) return fail("the X is right here. you need a digging stick");
    m.done = day(game); count(game, "dug");
    if (SB.Loot && SB.Loot.TABLES.buried) SB.Loot.place(game, "deep-map-" + m.id, "buried", m.x, m.z);
    var S = PS(); if (S && S.goal && S.goal.deep) P().setGoal(null);
    SB.bus.emit("deepDig", { c: c, kind: "map" });
    return ok("🧰 X marks the spot: a buried chest! open it");
  };

  /* ================= ground, heat and cold (in a body) ================= */
  function cellRand(game, x, z, salt) {
    var h = (Math.imul((x / 3) | 0, 73856093) ^ Math.imul((z / 3) | 0, 19349663) ^ (game.seed >>> 0) ^ salt) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h ^= h >>> 13;
    return (h >>> 0) / 4294967296;
  }
  // "mud" (swamp, mangrove), "thorns" (jungle, bamboo, savanna) or ""
  D.ground = function (game, x, z) {
    var w = game.world, b = W().biomeAt(w, x, z);
    if (b === bid("swamp") || b === bid("mangrove")) return cellRand(game, x, z, 11) < 0.22 && W().depthAt(w, x, z) < 0.3 ? "mud" : "";
    if (b === bid("jungle") || b === bid("bamboo") || b === bid("savanna")) return cellRand(game, x, z, 23) < 0.14 && W().depthAt(w, x, z) < 0.05 ? "thorns" : "";
    return "";
  };
  D.heatwave = function (game) { var wx = st(game).wx; return !!(wx.heat && wx.heat > game.time); };
  D.blizzard = function (game) { var wx = st(game).wx; return !!(wx.bliz && wx.bliz > game.time); };
  D.hot = function (game, c) {
    var w = game.world, b = W().biomeAt(w, c.x, c.z);
    if (w.night || W().shelterAt(w, c.x, c.z)) return false;
    return D.heatwave(game) || ((b === bid("desert") || b === bid("mesa") || b === bid("ash")) && w.season !== 3);
  };
  var haz = {}, hazT = 0, lastPos = null, saidT = {}, raft = null, raftWet = 0;
  D.hazards = function () { return haz; };
  function once(game, key, msg, gap) { if (saidT[key] && game.time - saidT[key] < (gap || 25) && game.time >= saidT[key]) return; saidT[key] = game.time; say(msg); }
  function unraft() { if (raft && raft.c && raft.c.look) raft.c.look.fins = false; raft = null; }
  D.afloat = function () { return !!haz.raft; };
  function bodyTick(game, S, dt) {
    var c = S.c, w = game.world, s = st(game), Bd = SB.Body;
    // a raft in the bag: deep water carries you (the body borrows a swimmer's legs while you hold it)
    var boat = c.tier >= 2 && has(c, "raft");
    if (boat && c.look && !c.look.fins) { c.look.fins = true; raft = { c: c }; }
    if (raft && (!boat || raft.c !== c)) unraft();
    var deep = W().depthAt(w, c.x, c.z) > 0.5, afloat = !!(raft && deep);
    if (afloat) {
      if (s.boon !== "wanderer" && c._povMove) S.stam = Math.max(0, (S.stam || 0) - dt * 0.035);
      if (Bd) { var b0 = Bd.of(c); if (b0.wet > raftWet) b0.wet = raftWet; }
      if (lastPos && lastPos.c === c) s.n.sailed = (s.n.sailed || 0) + Math.min(2, SB.dist(c.x, c.z, lastPos.x, lastPos.z));
      if (!haz.raft) { once(game, "raft", "🛶 afloat! the raft carries you over deep water. paddling uses pep", 60); SB.bus.emit("deepAfloat", { c: c }); }
    } else if (Bd) raftWet = Bd.of(c).wet;
    haz.raft = afloat;
    // sucking mud: half speed (the step you just took is pulled half back)
    var g = afloat ? "" : D.ground(game, c.x, c.z);
    if (g === "mud" && lastPos && lastPos.c === c) {
      var dx = c.x - lastPos.x, dz = c.z - lastPos.z;
      if (dx * dx + dz * dz < 4) { c.x = lastPos.x + dx * 0.5; c.z = lastPos.z + dz * 0.5; }
      if (!haz.mud) once(game, "mud", "🟤 sucking mud! it slows you to half. head for firmer ground");
    }
    haz.mud = g === "mud"; haz.thorns = g === "thorns";
    lastPos = { c: c, x: c.x, z: c.z };
    if ((hazT -= dt) > 0) return;
    var step = 0.5 + hazT; hazT = 0.5; if (!(step > 0)) step = 0.5; if (step > 2) step = 2;
    var ch = c.chem, b = W().biomeAt(w, c.x, c.z), depth = W().depthAt(w, c.x, c.z);
    if (haz.thorns && S.running) { ch.health = Math.max(0.2, ch.health - 0.02 * step); ch.pain = Math.min(1, (ch.pain || 0) + 0.05); once(game, "thorns", "🌿 thorns! running through them scratches. walk"); }
    haz.icy = !afloat && depth > 0.15 && (b === bid("tundra") || (w.season === 3 && (b === bid("taiga") || b === bid("mountain"))));
    if (haz.icy) { ch.cold = Math.min(1, (ch.cold || 0) + 0.06 * step); once(game, "icy", "🧊 icy water! it chills you fast. get out and get warm"); }
    haz.heat = D.hot(game, c) && !has(c, "frostflask") && D.depth(game) === 0;
    if (haz.heat && Bd) { var bb = Bd.of(c); bb.thirst = Math.min(1, bb.thirst + step * (Bd.THIRST || 1 / 420)); once(game, "heat", D.heatwave(game) ? "🥵 a heat wave: you get thirsty twice as fast. drink often" : "🥵 the heat! you get thirsty twice as fast out here by day", 90); }
    haz.steam = b === bid("ash") && !!W().nearestNode(w, c.x, c.z, 2.2, function (n) { return n.kind === "vent" && n.state === "ok"; });
    if (haz.steam) { ch.health = Math.max(0.2, ch.health - 0.03 * step); once(game, "steam", "♨️ hot steam! step back from the vent"); }
    haz.bliz = D.blizzard(game) && !W().shelterAt(w, c.x, c.z) && !(Bd && Bd.litFireNear && Bd.litFireNear(w, c, 4)) && D.depth(game) === 0;
    if (haz.bliz) { ch.cold = Math.min(1, (ch.cold || 0) + (Bd && Bd.cloaked && Bd.cloaked(c) ? 0.012 : 0.03) * step); once(game, "bliz", "🌨 a blizzard! it chills you fast: get under a roof or to a fire", 90); }
    // the goal you were sent to: there now
    if (S.goal && S.goal.deep && SB.dist(c.x, c.z, S.goal.x, S.goal.z) < 4 && !D.mapHere(game, c)) P().setGoal(null);
  }

  /* ================= weather ================= */
  D.RAINBOW_SECS = SB.DAY_LENGTH * 0.25;
  function focus(game) { var S = PS(); if (S && S.game === game) return S.c; var T = game.world.T; return T.nest || T.spawn; }
  D.rainbowStruct = function (game) { var rb = st(game).wx.rb; return rb ? W().structById(game.world, rb.id) : null; };
  D.rainbow = function (game) {
    var s = st(game), w = game.world, f = focus(game), r = dice(game, "rainbow:" + day(game) + ":" + (s.n.rainbows || 0));
    if (s.wx.rb || !f) return null;
    for (var t = 0; t < 24; t++) {
      var a = r() * 6.283, d = 22 + r() * 24, x = f.x + Math.sin(a) * d, z = f.z + Math.cos(a) * d;
      if (!W().inBounds(w, x, z) || W().depthAt(w, x, z) > 0.02 || !W().walkable(w, x, z, false) || W().structsNear(w, x, z, 2).length) continue;
      var b = put(game, "rainbowend", Math.round(x * 10) / 10, Math.round(z * 10) / 10, { until: game.time + D.RAINBOW_SECS }, 0);
      s.wx.rb = { id: b.id, x: b.x, z: b.z, until: b.data.until };
      count(game, "rainbows");
      if (PS() && P().setGoal && !(PS().goal && !PS().goal.deep)) P().setGoal({ x: b.x, z: b.z, label: "🌈 the rainbow's end", small: true, deep: 1 });
      tell("🌈 a rainbow! something waits where it touches down, " + Math.round(d) + " steps off. it fades by the end of the day");
      SB.bus.emit("rainbow", { st: b });
      return b;
    }
    return null;
  };
  D.takeRainbow = function (game, c, b) {
    var s = st(game);
    if (!b || !s.wx.rb || s.wx.rb.id !== b.id) return fail("the rainbow has gone");
    if (SB.dist(c.x, c.z, b.x, b.z) > 4.5) return fail("get closer");
    var r = dice(game, "rbgift:" + (s.n.rainbows || 0)), gem = ["amber", "opal", "icegem", "pearl"][Math.floor(r() * 4)];
    if (K.mote) give(game, c, "mote", 1);
    give(game, c, gem, 1);
    if (SB.Game.addSparks) SB.Game.addSparks(game, 3, c);
    W().removeStructure(game.world, b); s.wx.rb = null; count(game, "rainbowGifts");
    var S = PS(); if (S && S.goal && S.goal.deep) P().setGoal(null);
    SB.bus.emit("rainbowGift", { c: c, gem: gem });
    return ok("🌈 where the rainbow touched down: a " + label(gem) + (K.mote ? ", a light mote" : "") + " and +3 ✨");
  };
  // a new day: maybe a heat wave (summer) or a blizzard (winter). own dice, from the island and the day
  D.newDay = function (game) {
    var s = st(game), w = game.world, r = dice(game, "wx:" + day(game)), roll = r();
    if (w.season === 1 && roll < 0.25) {
      s.wx.heat = game.time + SB.DAY_LENGTH * 0.6;
      tell("🥵 a heat wave today: everyone in a body gets thirsty twice as fast until dusk. a frost flask shrugs it off");
      SB.bus.emit("heatwave", { until: s.wx.heat });
    } else if (w.season === 3 && roll < 0.3) {
      s.wx.bliz = game.time + SB.DAY_LENGTH * 0.35;
      var wx = w.weather; if (wx) { var from = wx.kind; wx.kind = "fog"; wx.t = 0; wx.next = Math.max(wx.next || 0, SB.DAY_LENGTH * 0.35); if (from !== "fog") SB.bus.emit("weather", { kind: "fog", from: from, blizzard: true }); }
      tell("🌨 a blizzard is blowing in: out in the open you chill fast, and places are hard to spot. find a roof or a fire");
      SB.bus.emit("blizzard", { until: s.wx.bliz });
    }
  };
  var wxT = 0;
  function weatherTick(game) {
    var s = st(game), w = game.world, rb = s.wx.rb;
    if (rb && (game.time > rb.until || !W().structById(w, rb.id))) { var b = W().structById(w, rb.id); if (b) W().removeStructure(w, b); s.wx.rb = null; }
    if (s.wx.heat && s.wx.heat <= game.time) s.wx.heat = 0;
    if (s.wx.bliz && s.wx.bliz <= game.time) s.wx.bliz = 0;
    if (D.blizzard(game) && w.weather) w.weather.wind = Math.max(w.weather.wind || 0, 1.2); // it howls
  }

  /* ================= every frame ================= */
  var poiT = 0, booted = null;
  function boot(game) {
    // a loaded island: the rocks of a delve somebody saved in go back (you start on top), and keep their "skip me" mark
    booted = game;
    grumpId = null; lastPos = null; raft = null; haz = {}; saidT = {};
    var s = st(game);
    if (s.cur != null || s.nodes.length) D.leave(game, "loaded");
  }
  function placeTick(game) {
    var w = game.world, s = st(game), S = PS(), c = S && S.game === game && !S.dead ? S.c : null, list = D.pois(game), have = {}, mouths = {};
    w.structures.forEach(function (b) { if (b.data && b.data.poi) have[b.data.poi] = b; else if (b.kind === "delvemouth" && b.data) mouths[b.data.cave] = b; });
    var fr = fogged(game) ? 4 : D.FIND_R;
    list.forEach(function (p) {
      if (!have[p.id] && W().isSeen(w, p.x, p.z)) have[p.id] = put(game, "poi_" + p.kind, p.x, p.z, { poi: p.id }, (hashKey(p.id) % 628) / 100);
      if (s.found[p.id]) return;
      if (c && SB.dist(c.x, c.z, p.x, p.z) < fr) { D.found(game, p, c); return; }
      if (!have[p.id] || !w.creatureGrid) return;
      var who = null;
      W().creaturesNear(w, game, p.x, p.z, 4, function (o) { if (!who && o.alive && o.species === "smol") who = o; });
      if (who) D.found(game, p, who);
    });
    D.caves(game).forEach(function (cv) {
      if (mouths[cv.id] || !W().isSeen(w, cv.x, cv.z)) return;
      var sp = sideSpot(game, cv.x, cv.z, "mouth:" + cv.id);
      put(game, "delvemouth", sp.x, sp.z, { cave: cv.id }, 0);
    });
  }
  D.tick = function (game, dt) {
    if (!game || game.offline || !game.world) return;
    if (booted !== game) boot(game);
    var s = st(game), S = PS(), c = S && S.game === game && !S.dead ? S.c : null;
    // down a cave
    if (s.cur != null) {
      var cv = D.cur(game);
      if (!cv || !c || !c.alive) D.leave(game, "left");
      else if (SB.dist(c.x, c.z, cv.x, cv.z) > D.RING) { D.leave(game, "walked"); say("🌤 you scramble back up into the daylight"); }
      else {
        var z = D.zone(game), g = grump(game);
        if (g && (grumpT += dt) > 70 && g.caveKeeper == null) endGrump(game);
        if (z && z.dark) {
          if (has(c, "mosslamp")) { burnT = 0; darkT = 0; }
          else if (has(c, "torch")) {
            darkT = 0;
            if ((burnT += dt) >= D.TORCH_SECS) {
              burnT = 0; Sv().take(c, "torch", 1);
              var left = Sv().count(c, "torch", true);
              say(left ? "🔥 a torch burns out. " + left + " left" : "🕯 your last torch gutters out! climb up, or the dark will find you");
              SB.bus.emit("delveTorch", { c: c, left: left });
            }
          } else {
            darkT += dt;
            if (!warnedDark) { warnedDark = true; say("🌑 no light! you can't see the rock, and something can hear you. climb up"); }
            if (darkT >= D.DARK_SECS * (has(c, "mooncharm") ? 2 : 1) && !g) { D.spawnGrump(game, c, D.depth(game), cv, false); darkT = -30; }
          }
        }
      }
    }
    if (c) bodyTick(game, S, dt);
    else if (lastPos || raft) { unraft(); lastPos = null; haz = {}; }
    if ((wxT -= dt) <= 0) { wxT = 2; weatherTick(game); }
    if ((poiT -= dt) <= 0) { poiT = 1.5; placeTick(game); }
  };

  /* ================= hooks ================= */
  var hooked = false;
  D.hook = function () {
    if (hooked || !SB.bus) return; hooked = true;
    function cur() { return SB.Game && SB.Game.current; }
    SB.bus.on("rockGone", function (d) { var game = cur(); if (!game || !d || !d.node || !d.node.delve) return; mined(game, d.node); rockfall(game, d.c); });
    SB.bus.on("grumpChased", function (d) {
      var game = cur(); if (!game || !d || !d.g) return;
      if (d.g.id === grumpId) grumpId = null;
      if (d.g.caveKeeper != null) { var cv = D.caveById(game, d.g.caveKeeper); if (cv) { D.delve(game, cv).keeper = day(game); say("🏆 the keeper is gone. the hoard is yours: open the chest"); audio("achievement", 0.8); SB.bus.emit("delveKeeper", { c: d.c, cave: cv }); } }
    });
    SB.bus.on("unpossess", function () { var game = cur(); unraft(); lastPos = null; haz = {}; if (game && st(game).cur != null) D.leave(game, "sky"); });
    SB.bus.on("newDay", function () { var game = cur(); if (game && !game.offline) D.newDay(game); });
    SB.bus.on("weather", function (d) {
      var game = cur(); if (!game || game.offline || !d || d.blizzard) return;
      if ((d.from === "rain" || d.from === "storm") && (d.kind === "clear" || d.kind === "cloudy") && !game.world.night && dice(game, "rb?" + day(game) + ":" + Math.floor(game.time / 60))() < 0.6) D.rainbow(game);
    });
  };
  // deeper down the rock is loose: now and then a bit comes down on you when a seam gives way
  function rockfall(game, c) {
    var s = st(game), depth = D.depth(game);
    if (!c || depth < 3 || s.boon === "delver" || Math.random() > 0.2) return;
    c.chem.health = Math.max(0.25, c.chem.health - 0.06);
    c.chem.pain = Math.min(1, (c.chem.pain || 0) + 0.15);
    say("🪨 the roof spits loose rock at you! ow. (the delver's stone stops that)");
    SB.bus.emit("delveRockfall", { c: c, depth: depth });
  }
  D.hook();

  function mouthOpts(game, c, cave, o, x) {
    var s = st(game), d = D.delve(game, cave), here = s.cur === cave.id ? d.depth || 0 : 0, nx = here + 1;
    function go(fn, snd) { return function () { var r = fn(); if (r && r.msg) x.say(r.msg); if (r && r.ok) x.audio(snd || "chime", 0.7); return !!(r && r.ok); }; }
    if (here < D.MAX) o.use = x.op((here ? "go deeper" : "go down into the cave") + " (level " + nx + " of " + D.MAX + ": " + D.ZONES[nx].name + ")", go(function () { return D.down(game, c, cave); }), null);
    else o.use = x.no("this is the bottom of the cave");
    if (here > 0) {
      o.place = x.op(here > 1 ? "climb up a level" : "climb out", go(function () { return D.up(game, c, cave); }), null);
      o.pick = here > 1 ? x.op("climb all the way out", go(function () { return D.up(game, c, cave, true); }), null) : x.op("how delving works", function () { x.say(D.RULES[0]); x.openBag("deep"); return true; }, null);
    } else {
      if (x.hk === "ropeladder" && !d.ladder) o.place = x.op("fix your rope ladder here", go(function () { return D.fixLadder(game, c, cave); }, "build"), null);
      else if (d.ladder && d.max > 1) o.place = x.op("take the ladder down to level " + d.max, go(function () { return D.down(game, c, cave, true); }), null);
      o.pick = x.op("how delving works", function () { x.say(D.RULES[0]); x.openBag("deep"); return true; }, null);
    }
    o.hint = (d.max ? "explored " + d.max + " of " + D.MAX + " levels" + (d.bottom ? " · the bottom is found" : "") + (d.ladder ? " · ladder" : "") : "nobody has been down here yet") + (here ? " · you are on level " + here : "");
  }
  function nodeOpts(game, c, n, o, x) {
    var z = D.zone(game), need = D.NEED[n.kind];
    function go(fn) { return function () { var r = fn(); if (r && r.msg) x.say(r.msg); if (r && r.ok) { x.audio("craft", 0.7); if (x.swing) x.swing(); } return !!(r && r.ok); }; }
    if (z && z.dark && !D.hasLight(c)) { o.use = x.no("too dark to see: you need a torch or a moss lamp"); o.pick = null; o.place = null; return; }
    if (n.kind === "d_moss") { o.use = o.pick = x.op("pick the glowmoss", go(function () { return D.pick(game, c, n); }), null); return; }
    if (n.kind === "d_bones") { o.use = o.pick = has(c, "shovel") ? x.op("dig out the old bones", go(function () { return D.pick(game, c, n); }), null) : x.no("old bones in the rock. you need a digging stick"); return; }
    if (need) {
      var pw = Sv().power(x.hk && K[x.hk] && K[x.hk].tool ? x.hk : "paws").ore || 0;
      if (pw < need[0]) o.use = x.no("too hard for that: the " + NK[n.kind].label + " needs " + need[1]);
    }
  }
  if (SB.Ext) {
    SB.Ext.on("tick", function (game, dt) { D.tick(game, dt); });
    SB.Ext.on("options", function (game, c, r, o, x) {
      var Su = Sv(), hk = x.hk;
      function go(fn, snd) { return function () { var res = fn(); if (res && res.msg) x.say(res.msg); if (res && res.ok) x.audio(snd || "chime", 0.7); return !!(res && res.ok); }; }
      // the thing in your paw (looking at somebody, the button is still "give")
      if (r && r.type === "creature") hk = null;
      if (hk === "mapscrap") o.place = x.op("read the map scrap", go(function () { return D.readMap(game, c); }), null);
      else if (hk === "compass") o.place = x.op("ask the seeker stone", go(function () { var t = D.seek(game, c); return t ? ok("🧭 it tugs toward " + t.what + ", about " + Math.round(t.d) + " steps off. follow the 🧭") : fail("🧭 it lies still. there is nothing left to find"); }), null);
      else if (hk === "geode") o.place = x.op("crack the geode", go(function () { return D.crack(game, c); }, "bonk"), null);
      else if (hk === "fossil" && Su.count(c, "fossil", true) >= 5) o.place = x.op("fit the old bones together", go(function () { return D.bones(game, c); }, "achievement"), null);
      else if (hk === "waymark") o.place = x.op("set the waystone seed down", go(function () { return D.raise(game, c); }, "build"), null);
      // what you are looking at
      if (r && r.type === "node" && r.ref) {
        if (r.ref.kind === "cave") mouthOpts(game, c, r.ref, o, x);
        else if (D.isDelveNode(r.ref)) nodeOpts(game, c, r.ref, o, x);
      } else if (r && r.type === "struct" && r.ref) {
        var b = r.ref, k = b.kind;
        if (k === "delvemouth") { var cv = D.caveById(game, b.data && b.data.cave); if (cv) mouthOpts(game, c, cv, o, x); }
        else if (k === "rainbowend") { o.use = x.op("take what the rainbow left", go(function () { return D.takeRainbow(game, c, b); }, "achievement"), null); o.place = o.use; }
        else if (k.indexOf("poi_") === 0) {
          var ops = D.poiOps(game, c, b, hk);
          ["use", "place"].forEach(function (slot) {
            var a = ops[slot];
            if (!a) return;
            o[slot] = a.locked ? x.no(a.label) : x.op(a.label, function () { var res = a.go(); if (res && res.msg) x.say(res.msg); if (res && res.ok) { x.audio("chime", 0.7); if (a.open) x.openBag(a.open); } return !!(res && res.ok); }, null);
          });
          if (ops.use && !ops.place && o.place && !o.place.locked) o.place = null; // (don't put your things down on a shrine by mistake)
        } else if (k === "lootchest" && b.data && String(b.data.loot).indexOf("delve" + D.MAX + "-") === 0 && D.keeperUp(game)) { o.use = x.no("the cave's keeper is in the way. chase it off first"); o.place = null; }
      }
      // standing on a map's X
      var m = D.mapHere(game, c);
      if (m) { var dg = has(c, "shovel") ? x.op("dig for the treasure", go(function () { return D.digMap(game, c); }, "achievement"), null) : x.no("the X is right here. you need a digging stick"); o.pick = dg; if (!r) o.use = dg; }
    });
    SB.Ext.on("damage", function (game) { return st(game).boon === "warrior" ? 1.25 : 1; });
    SB.Ext.on("vitals", function (game, c) {
      var out = [], dp = D.depth(game), z = D.zone(game);
      if (dp) out.push({ icon: "⬇", text: "level " + dp + " · " + z.name, tip: z.rule });
      if (dp && z.dark && !D.hasLight(c)) out.push({ icon: "🌑", text: "no light", bad: true, tip: "you can't see the rock, and something can hear you" });
      if (haz.raft) out.push({ icon: "🛶", text: "rafting", tip: "paddling uses pep" });
      if (haz.mud) out.push({ icon: "🟤", text: "mud", bad: true, tip: "half speed" });
      if (haz.thorns) out.push({ icon: "🌿", text: "thorns", bad: true, tip: "walk, don't run" });
      if (haz.icy) out.push({ icon: "🧊", text: "icy water", bad: true, tip: "chills you fast" });
      if (haz.heat) out.push({ icon: "🥵", text: "heat", bad: true, tip: "thirsty twice as fast" });
      if (haz.steam) out.push({ icon: "♨️", text: "steam", bad: true, tip: "step back" });
      if (haz.bliz) out.push({ icon: "🌨", text: "blizzard", bad: true, tip: "find a roof or a fire" });
      return out;
    });
    SB.Ext.on("goals", function (game, add) {
      var pr = D.progress(game);
      if (!pr.total) return;
      add("find the island's hidden places", pr.found + " of " + pr.total, pr.found >= pr.total, false);
      if (D.caves(game).length) add("reach the bottom of a cave (in a body, at a cave mouth)", "level " + pr.deepest + " of " + D.MAX, pr.deepest >= D.MAX, false);
    });
    SB.Ext.tab({
      id: "deep",
      label: function () { return "🧭 map"; },
      show: function () { return true; },
      html: function (game, c, icon) { return D.html(game, c, icon); },
      wire: function (root, game, c, redraw, sayFn) { D.wire(root, game, c, redraw, sayFn); }
    });
  }
  // the dark of a cave, through the eyes of the smol you are in (wilds.js hands render.js the night's dark: add ours)
  if (SB.Wilds && SB.Wilds.env && !SB.Wilds._deepEnv) {
    var env0 = SB.Wilds.env;
    SB.Wilds._deepEnv = true;
    SB.Wilds.env = function (env, povAdj) {
      env0(env, povAdj);
      try {
        var S = PS();
        if (!S || !(povAdj > 0.002) || !env) return;
        var z = D.zone(S.game), dp = D.depth(S.game);
        if (!dp) return;
        var k = (z.dark ? (D.hasLight(S.c) ? 0.3 : 0.75) : 0.15) * povAdj, f = 1 - k;
        ["sky", "gnd", "sun", "fog"].forEach(function (nm) { if (env[nm] && env[nm].map) env[nm] = env[nm].map(function (v) { return v * f; }); });
      } catch (e) {}
    };
  }
  if (SB.Render && SB.Render.addHook) SB.Render.addHook(function (game) {
    var S = PS();
    if (!S || !game || S.game !== game || !SB.Render.light) return;
    var c = S.c, dp = D.depth(game);
    if (dp && has(c, "mosslamp")) SB.Render.light(c.x, (c.y || 0) + 0.9, c.z, 8, 0.45, 1, 0.65);
    if (dp === 3) D.nodes(game).forEach(function (n) { if (n.kind === "d_moss" && n.state === "ok") SB.Render.light(n.x, W().groundY(game.world, n.x, n.z) + 0.6, n.z, 4, 0.4, 1, 0.6); });
  });

  /* ================= the bag's "map" tab ================= */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (ch) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]; }); }
  D.html = function (game, c, icon) {
    icon = icon || function () { return ""; };
    var s = st(game), pr = D.progress(game), mn = D.moon(game), out = "";
    out += "<div class='lbl'>🧭 the island · <b>" + pr.pct + "%</b> explored · <b>" + pr.found + " of " + pr.total + "</b> places found · deepest delve: level <b>" + pr.deepest + "</b> of " + D.MAX + "</div>";
    out += "<p class='help'>" + mn.icon + " " + esc(mn.name) + " · " + (D.lowTide(game) ? "🌊 low tide: the tide pools are open" : "🌊 the tide is in (low at dawn and dusk)") + (D.heatwave(game) ? " · 🥵 heat wave" : "") + (D.blizzard(game) ? " · 🌨 blizzard" : "") + (s.wx.rb ? " · 🌈 a rainbow is out" : "") + "</p>";
    if (s.boon && D.BOONS[s.boon]) out += "<div class='lbl'>" + D.BOONS[s.boon].icon + " " + esc(D.BOONS[s.boon].name) + ": " + esc(D.BOONS[s.boon].perk) + "</div>";
    // travel
    var ws = D.waystones(game), here = null;
    ws.forEach(function (b) { if (SB.dist(b.x, b.z, c.x, c.z) < 5) here = b; });
    if (ws.length) {
      out += "<div class='lbl'>🌀 waystones awake: " + ws.length + (here ? " · travel costs " + Math.round(D.travelCost(game) * 100) + "% of your food bar" : " · stand at one to travel") + "</div>";
      if (here) {
        out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
        ws.forEach(function (b) { if (b !== here) out += "<button class='btn go' data-deeptravel='" + b.id + "'>🌀 " + esc(biomeName(W().biomeAt(game.world, b.x, b.z))) + " · " + Math.round(SB.dist(b.x, b.z, c.x, c.z)) + "m</button>"; });
        out += (ws.length < 2 ? "<span class='help'>wake another waystone to travel</span>" : "") + "</div>";
      }
    }
    // places
    out += "<div class='lbl'>places</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px 10px'>";
    Object.keys(D.POI).forEach(function (k) { var o = pr.by[k]; if (o) out += "<span class='" + (o.found >= o.n ? "ok" : "") + "' title='" + esc(D.POI[k].desc) + "'>" + D.POI[k].icon + " " + esc(o.found ? D.POI[k].name : "???") + " " + o.found + "/" + o.n + "</span>"; });
    out += "</div>";
    var open = s.maps.filter(function (m) { return !m.done; });
    if (open.length) out += "<p class='help'>🗺 " + open.length + " map X" + (open.length > 1 ? "s" : "") + " still to dig up: the nearest is " + Math.round(Math.min.apply(null, open.map(function (m) { return SB.dist(m.x, m.z, c.x, c.z); }))) + " steps away</p>";
    // biomes
    var seen = game.world.biomesSeen || {}, bl = [];
    SB.BIOMES.forEach(function (b, i) {
      if (!seen[i] || b.id === "ocean") return;
      var f = s.finds[i], parts = [];
      for (var fk in f || {}) parts.push(icon(fk, 14) + " " + esc(label(fk)) + " ×" + f[fk]);
      bl.push("<span title='" + esc(D.DIG[b.id] ? "dig here for " + label(D.DIG[b.id]) : "") + "'>" + esc(b.name) + (parts.length ? ": " + parts.join(", ") : "") + "</span>");
    });
    out += "<div class='lbl'>biomes seen: " + bl.length + " of " + (SB.BIOMES.length - 1) + "</div><p class='help'>" + bl.join(" · ") + "</p>";
    // delves
    var dl = [];
    D.caves(game).forEach(function (cv, i) { var d = s.delves[cv.id]; if (d && d.max) dl.push("cave " + (i + 1) + " (" + esc(biomeName(W().biomeAt(game.world, cv.x, cv.z))) + "): level " + d.max + " of " + D.MAX + (d.keeper ? " · keeper chased off" : "") + (d.ladder ? " · ladder" : "")); });
    out += "<div class='lbl'>⬇ delves" + (D.depth(game) ? " · you are on level " + D.depth(game) + ": " + esc(D.zone(game).name) : "") + "</div><p class='help'>" + (dl.length ? dl.join(" · ") : "no cave explored yet. find a grump cave mouth and go down.") + "</p>";
    out += "<p class='help'>" + D.RULES.map(esc).join("<br>") + "</p>";
    // make
    out += "<div class='lbl'>make (explorer's things)</div><div class='rlist'>";
    D.RECIPES.forEach(function (rc) {
      var need = [];
      for (var k in rc.in) { var n = Sv().count(c, k); need.push("<span class='" + (n >= rc.in[k] ? "ok" : "no") + "'>" + icon(k, 16) + " " + esc(label(k)) + " " + Math.min(n, rc.in[k]) + "/" + rc.in[k] + "</span>"); }
      var why = D.whyNotMake(game, c, rc.id);
      out += "<div class='rc'><span class='big'>" + icon(rc.id, 28) + "</span><div class='t'>" + esc(label(rc.id)) + "<small>" + esc(K[rc.id].desc || rc.hint) + (rc.at ? " · at a lit kiln" : "") + "</small><div class='need'>" + need.join("") + "</div></div><button class='btn go' data-deepmake='" + rc.id + "' " + (why ? "disabled" : "") + ">make</button></div>";
    });
    out += "</div>";
    return out;
  };
  D.wire = function (root, game, c, redraw, sayFn) {
    function done(r, snd) { if (r && r.msg && sayFn) sayFn(r.msg); if (r && r.ok) audio(snd || "craft"); redraw(); }
    root.querySelectorAll("[data-deepmake]").forEach(function (b) { b.addEventListener("click", function () { done(D.make(game, c, b.getAttribute("data-deepmake"))); }); });
    root.querySelectorAll("[data-deeptravel]").forEach(function (b) { b.addEventListener("click", function () { done(D.travel(game, c, +b.getAttribute("data-deeptravel")), "chime"); }); });
  };

  /* ================= models ================= */
  var ME = SB.Meshes || SB.ME;
  function rockMesh(base, bits, glow, n) {
    return function (seed) {
      var b = ME.builder();
      b.color(base, 1).push().translate(0, 0.2, 0).scale(0.6, 0.42, 0.52).blob(1, 0.3, seed, 0.3).pop();
      if (bits != null) {
        b.color(bits).glow(glow || 0);
        for (var i = 0; i < (n || 5); i++) { var a = i * 1.26 + seed, up = 0.3 + (i % 2) * 0.45; b.push().translate(Math.cos(a) * 0.5 * Math.cos(up), 0.16 + 0.42 * Math.sin(up), Math.sin(a) * 0.44 * Math.cos(up)).rotY(a).rotZ(0.5 + i * 0.6).box(0.2, 0.17, 0.18).pop(); }
        b.glow(0);
      }
      return b.finish();
    };
  }
  function mossMesh(seed) {
    var b = ME.builder();
    b.color(0x4a4650, 1).push().translate(0, 0.1, 0).scale(0.5, 0.2, 0.44).blob(1, 0.3, seed, 0.3).pop();
    b.color(0x7dffb0).glow(0.7);
    for (var i = 0; i < 6; i++) { var a = i * 1.05 + seed; b.push().translate(Math.cos(a) * 0.3, 0.22 + (i % 3) * 0.05, Math.sin(a) * 0.26).scale(0.16, 0.08, 0.16).sphere(0).pop(); }
    b.glow(0);
    return b.finish();
  }
  function bonesMesh(seed) {
    var b = ME.builder();
    b.color(0x5a5560, 1).push().translate(0, 0.08, 0).scale(0.55, 0.16, 0.5).blob(1, 0.3, seed, 0.3).pop();
    b.color(0xe6dcc0);
    for (var i = 0; i < 4; i++) b.push().translate(-0.3 + i * 0.2, 0.14, 0).rotZ(0.5 - i * 0.1).cyl(5, 0.04, 0.03, 0.5).pop();
    b.push().translate(0, 0.2, 0.1).rotX(1.5).cyl(5, 0.05, 0.05, 0.6).pop();
    return b.finish();
  }
  var POI_MESH = {
    lookout: function () { var b = ME.builder(); b.color(0x8a8590).push().translate(0, 0, 0).cyl(7, 0.8, 0.55, 1.1).pop(); b.color(0x9d98a3).push().translate(0.1, 1.1, 0).cyl(6, 0.5, 0.35, 0.7).pop(); b.color(0x7a4a26).push().translate(0.1, 1.8, 0).cyl(4, 0.03, 0.03, 0.8).pop(); b.color(0xe05a4a).push().translate(0.28, 2.42, 0).box(0.34, 0.2, 0.02).pop(); return b.finish(); },
    ring: function () { var b = ME.builder(); for (var i = 0; i < 6; i++) { var a = i / 6 * 6.283; b.color(i % 2 ? 0x8f8a99 : 0x7d7888).push().translate(Math.cos(a) * 0.95, 0, Math.sin(a) * 0.95).rotY(-a).box(0.26, 1.1 + (i % 3) * 0.25, 0.2).pop(); } b.color(0xb59aff).glow(0.6).push().translate(0, 0.05, 0).cyl(8, 0.22, 0.22, 0.06).pop(); b.glow(0); return b.finish(); },
    spring: function () { var b = ME.builder(); for (var i = 0; i < 8; i++) { var a = i / 8 * 6.283; b.color(0x9a948e).push().translate(Math.cos(a) * 0.9, 0.08, Math.sin(a) * 0.9).scale(0.24, 0.16, 0.2).blob(0, 0.3, i).pop(); } b.color(0x8fe0e8).glow(0.35).push().translate(0, 0.06, 0).cyl(12, 0.85, 0.85, 0.05).pop(); b.color(0xffffff).glow(0.5).push().translate(0.2, 0.3, 0.1).scale(0.12, 0.2, 0.12).sphere(0).pop().push().translate(-0.25, 0.5, -0.15).scale(0.1, 0.16, 0.1).sphere(0).pop(); b.glow(0); return b.finish(); },
    hermit: function () { var b = ME.builder(); b.color(0x8a6a48).push().translate(0, 0, 0).cone(6, 0.9, 1.3).pop(); b.color(0x3a2a20).push().translate(0, 0.3, 0.62).box(0.34, 0.6, 0.1).pop(); b.color(0xc9b08a).push().translate(0.9, 0.22, 0.5).scale(0.2, 0.22, 0.2).sphere(1).pop(); b.color(0x6a5a8a).push().translate(0.9, 0.4, 0.5).cone(6, 0.22, 0.3).pop(); b.color(0xffa040).glow(0.8).push().translate(0.5, 0.1, 0.95).scale(0.1, 0.14, 0.1).sphere(0).pop(); b.glow(0); return b.finish(); },
    shrine: function () { var b = ME.builder(); b.color(0x9d98a3).push().translate(0, 0.1, 0).box(0.9, 0.2, 0.7).pop(); b.color(0xb04a3a).push().translate(-0.35, 0.2, 0).cyl(5, 0.06, 0.06, 1.1).pop().push().translate(0.35, 0.2, 0).cyl(5, 0.06, 0.06, 1.1).pop(); b.push().translate(0, 1.32, 0).box(1.05, 0.1, 0.16).pop().push().translate(0, 1.12, 0).box(0.8, 0.07, 0.1).pop(); b.color(0xffe27a).glow(0.6).push().translate(0, 0.3, 0).scale(0.1, 0.1, 0.1).sphere(0).pop(); b.glow(0); return b.finish(); },
    cache: function () { var b = ME.builder(); b.color(0x6a4a30).push().translate(0, 0.03, 0).scale(0.5, 0.1, 0.5).sphere(0).pop(); b.color(0xc0392b).push().translate(0, 0.14, 0).rotY(0.785).box(0.7, 0.04, 0.12).pop().push().translate(0, 0.14, 0).rotY(-0.785).box(0.7, 0.04, 0.12).pop(); return b.finish(); },
    waystone: function () { var b = ME.builder(); b.color(0x6f6a80).push().translate(0, 0, 0).cyl(6, 0.3, 0.2, 1.5).pop(); b.color(0x8ab8ff).glow(0.8).push().translate(0, 1.65, 0).scale(0.18, 0.24, 0.18).sphere(0).pop(); b.push().translate(0, 0.7, 0.24).box(0.12, 0.3, 0.02).pop(); b.glow(0); return b.finish(); },
    camp: function () { var b = ME.builder(); b.color(0x8a7a5a).push().translate(-0.3, 0, 0).rotZ(0).cone(4, 0.7, 0.8).pop(); b.color(0x4a3a2e).push().translate(0.6, 0.04, 0.3).cyl(8, 0.3, 0.3, 0.05).pop(); b.color(0x2a2522).push().translate(0.6, 0.08, 0.3).rotZ(1.2).cyl(4, 0.04, 0.04, 0.4).pop(); b.color(0xb08a5a).push().translate(0.2, 0.06, 0.7).box(0.6, 0.1, 0.3).pop(); return b.finish(); },
    tidepool: function () { var b = ME.builder(); for (var i = 0; i < 7; i++) { var a = i / 7 * 6.283; b.color(0xa89a84).push().translate(Math.cos(a) * 0.7, 0.05, Math.sin(a) * 0.7).scale(0.2, 0.1, 0.18).blob(0, 0.3, i).pop(); } b.color(0x5fc9c0).push().translate(0, 0.03, 0).cyl(10, 0.65, 0.65, 0.04).pop(); b.color(0xf6c0c8).push().translate(0.2, 0.08, 0.1).scale(0.1, 0.05, 0.1).sphere(0).pop(); return b.finish(); },
    dig: function () { var b = ME.builder(); b.color(0x7a5a3a).push().translate(0, 0.02, 0).scale(0.45, 0.1, 0.4).sphere(0).pop(); b.color(0x5a4028).push().translate(0.12, 0.08, 0.05).scale(0.18, 0.07, 0.16).sphere(0).pop(); return b.finish(); },
    islet: function () { var b = ME.builder(); b.color(0x8a6a48).push().translate(0, 0, 0).rotZ(0.08).cyl(4, 0.04, 0.03, 1.6).pop(); b.color(0xf0e6d0).push().translate(0.24, 1.38, 0).box(0.44, 0.3, 0.02).pop(); b.color(0x9a948e).push().translate(0, 0.05, 0).scale(0.22, 0.1, 0.2).blob(0, 0.3, 2).pop(); return b.finish(); }
  };
  function mouthMesh() { var b = ME.builder(); b.color(0x7a4a26).push().translate(0, 0, 0).cyl(5, 0.07, 0.06, 1.3).pop(); for (var i = 0; i < 6; i++) b.color(0xd8b24a).push().translate(0, 0.25 + i * 0.16, 0.07).box(0.16, 0.03, 0.03).pop(); b.color(0xffa040).glow(0.7).push().translate(0, 1.36, 0).scale(0.09, 0.12, 0.09).sphere(0).pop(); b.glow(0); b.color(0xb89a5a).push().translate(0.2, 0.1, 0).scale(0.16, 0.1, 0.16).sphere(0).pop(); return b.finish(); }
  function rainbowMesh() { var b = ME.builder(), cols = [0xff5a5a, 0xffa040, 0xffe27a, 0x7ddc7a, 0x6ab8ff, 0xb59aff]; for (var i = 0; i < cols.length; i++) b.color(cols[i]).glow(0.7).push().translate((i - 2.5) * 0.09, 0, 0).cyl(4, 0.04, 0.04, 2.2 - Math.abs(i - 2.5) * 0.1).pop(); b.glow(0).color(0x4a3a2e).push().translate(0, 0, 0.3).cyl(8, 0.2, 0.24, 0.26).pop(); b.color(0xffe27a).glow(0.8).push().translate(0, 0.27, 0.3).scale(0.17, 0.07, 0.17).sphere(0).pop(); b.glow(0); return b.finish(); }
  if (ME && ME.builder && ME.NODE_BUILDERS && ME.STRUCT_BUILDERS) {
    try {
      var NB = ME.NODE_BUILDERS, SBd = ME.STRUCT_BUILDERS;
      NB.d_rock = rockMesh(0x6a6570, null); NB.d_flint = rockMesh(0x5a5764, 0x2a3040, 0, 4); NB.d_copper = rockMesh(0x5f5a66, 0xf29a45, 0.15, 6);
      NB.d_coal = rockMesh(0x55505a, 0x18161a, 0, 6); NB.d_iron = rockMesh(0x55505a, 0x7a4a40, 0, 5); NB.d_silver = rockMesh(0x55505a, 0xe4ebf2, 0.3, 5);
      NB.d_gem = rockMesh(0x6a6078, 0xc79aff, 0.4, 4); NB.d_star = rockMesh(0x3a3848, 0x8fd8ff, 0.9, 6); NB.d_moss = mossMesh; NB.d_bones = bonesMesh;
      Object.keys(POI_MESH).forEach(function (k) { SBd["poi_" + k] = POI_MESH[k]; });
      SBd.delvemouth = mouthMesh; SBd.rainbowend = rainbowMesh;
    } catch (e) {}
  }
})();
