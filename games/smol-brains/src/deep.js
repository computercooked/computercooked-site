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
     round 2    places with rooms and puzzles, the under-dark, the gloom, keys, relics, expeditions and more: see
                the "round 2" block further down.
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
  Object.keys(D.POI).forEach(function (k) { var d = D.POI[k]; struct("poi_" + k, d.name, d.icon, d.r, d.desc); }); // (round 2's places: D.MORE, further down)
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
    for (var k in rc.in) { var h = Sv().count(c, k) + (D.ALT[k] ? Sv().count(c, D.ALT[k], true) : 0); if (h < rc.in[k]) lack.push((rc.in[k] - h) + " " + label(k)); }
    if (lack.length) return "missing " + lack.join(", ");
    if (rc.at === "kiln" && !(Sv().nearKiln && Sv().nearKiln(c, game))) return "do this by a lit kiln";
    return "";
  };
  D.make = function (game, c, id) {
    var why = D.whyNotMake(game, c, id), rc = D.recipe(id);
    if (why) return fail(why);
    for (var k in rc.in) { var own = Math.min(rc.in[k], Sv().count(c, k)); if (own) Sv().take(c, k, own); if (own < rc.in[k] && D.ALT[k]) Sv().take(c, D.ALT[k], rc.in[k] - own); }
    give(game, c, rc.id, 1);
    c.stats.crafted = (c.stats.crafted || 0) + 1;
    if (game.stats) game.stats.crafted = (game.stats.crafted || 0) + 1;
    SB.bus.emit("deepMake", { c: c, id: id });
    SB.bus.emit("craft", { c: c, id: id, item: { kind: rc.id }, pov: true });
    return ok("made " + (function (w) { return /[^s]s$/.test(w) ? "" : /^[aeiou]/.test(w) ? "an " : "a "; })(label(rc.id)) + label(rc.id)); // 4.37: "made a climbing claws"
  };

  /* ================= delves ================= */
  D.MAX = 6; D.SLOTS = 7; D.REACH = 4.5; D.RING = 11; D.PEP = 0.25; D.SECS = 30; D.TORCH_SECS = 70; D.RESTOCK = 3; D.DARK_SECS = 12;
  D.NODE_ID0 = 5e7; // 4.44: was 3e7, the same ids as the red shrubs, shelf mushrooms and icebergs worldgen adds last (WG.ARR_ID0): a delve's rocks took their places in the id table
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
  D.caveById = function (game, id) {
    if (typeof id === "string" && id.indexOf("in:") === 0) return D.anchor(game, id.slice(3));
    var n = id == null ? null : game.world.nodeById[id]; return n && n.kind === "cave" ? n : null;
  };
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
  D.zone = function (game) { return zoneAt(game, D.cur(game), D.depth(game)) || null; };
  D.deepest = function (game) { var s = st(game), m = 0; for (var k in s.delves) if (k.indexOf("in:") !== 0) m = Math.max(m, s.delves[k].max || 0); return m; };
  D.hasLight = function (c) { return has(c, "mosslamp") || has(c, "torch"); };
  D.isDelveNode = function (n) { return !!(n && n.kind && (n.delve || (n.kind.charAt(0) === "d" && n.kind.charAt(1) === "_"))); };

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
    var z = zoneAt(game, cave, depth);
    if (!z || !z.nodes) return 0;
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
    var ls = L.state(game), w = game.world, cv = D.cur(game), depth = D.depth(game), z = zoneAt(game, cv, depth);
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
  D.spawnGrump = function (game, c, depth, cave, keeper, name) {
    if (!SB.Game.spawnGrump || !c || c.tier < 2 || grump(game)) return null;
    if (!keeper && name !== "the stalker" && c.dp && c.dp.bones > game.time) return null; // a bone mask: they leave you be
    var w = game.world, a0 = Math.random() * 6.283, at = null;
    for (var a = 0; a < 12 && !at; a++) { var ang = a0 + a * 0.52, x = c.x + Math.sin(ang) * 9, z = c.z + Math.cos(ang) * 9; if (W().walkable(w, x, z, false) && W().depthAt(w, x, z) < 0.05) at = { x: x, z: z }; }
    if (!at) return null;
    var g = SB.Game.spawnGrump(game, at.x, at.z);
    g.name = name || (keeper ? "the cave's keeper" : "a cave grump"); g.caveGrump = depth;
    if (name === "the stalker") g.stalker = 1;
    var zg = cave ? zoneAt(game, cave, depth) : null;
    if (keeper) g.caveKeeper = cave.id;
    g.tough = (keeper ? 1.6 : 0.6 + Math.min(depth, 8) * 0.12) * (D.moon(game).dark ? 1.3 : 1) * (zg && zg.tough ? zg.tough : 1) * (st(game).act2 ? 1.2 : 1);
    g.scout = { who: c.id, t: 0, hitT: 0, speedK: 0.8, dmg: Math.min(0.2, 0.06 + depth * 0.02), lethal: 0 }; // it stings, but never takes the last quarter of your hearts
    grumpId = g.id; grumpT = 0;
    audio("grump", 0.7);
    say(g.stalker ? "👁 something is in here with you. it only moves when you are not looking at it" : name ? "👹 " + name + "! chase it off" : keeper ? "👹 the cave's keeper! chase it off and the hoard is yours" : "👹 a cave grump! hit it, or climb out: it won't follow you up");
    SB.bus.emit("caveGrump", { c: c, g: g, depth: depth, keeper: !!keeper });
    return g;
  };
  D.keeperUp = function (game) { var g = grump(game); return !!(g && g.caveKeeper != null); };

  function arrive(game, c, cave, to, from) {
    var s = st(game), d = D.delve(game, cave), z = zoneAt(game, cave, to), zf = zoneAt(game, cave, from), ins = cave.kind === "inside", first = to > (d.max || 0);
    d.depth = to; s.cur = cave.id;
    if (first) d.max = to;
    burnT = 0; darkT = 0; warnedDark = false;
    populate(game, cave, to);
    syncChests(game);
    if (to > from) {
      if (z.wet && SB.Body) SB.Body.of(c).wet = 1;
      if (z.hot && SB.Body && !has(c, "frostflask") && !has(c, "sandglass")) SB.Body.of(c).thirst = Math.min(1, SB.Body.of(c).thirst + 0.15);
      var S2 = PS();
      if (z.cold && !(SB.Body && SB.Body.cloaked && SB.Body.cloaked(c))) c.chem.cold = Math.min(1, (c.chem.cold || 0) + 0.3);
      if (z.gas && S2 && S2.c === c) S2.stam = Math.max(0, (S2.stam || 0) - 0.15);
      if ((z.slip || z.burn) && s.boon !== "delver" && !has(c, "claws") && Math.random() < 0.3) { c.chem.health = Math.max(0.25, c.chem.health - 0.06); c.chem.pain = Math.min(1, (c.chem.pain || 0) + 0.1); say(z.burn ? "🔥 a lick of lava! ow" : "🪨 you slip on the wet spikes! ow. (climbing claws stop that)"); }
      if (z.curse && !d.keeper) { dp(c).curse = 1; say("🥶 the guardian's chill settles on you: a curse. a shrine or a hot spring lifts it"); }
      if (z.flood && !(zf && zf.flood)) breath = D.breathMax(c);
      if ((z.keeper || z.guard) && !d.keeper) D.spawnGrump(game, c, to, cave, true, z.guard);
      else if (z.stalk) D.spawnGrump(game, c, to, cave, false, "the stalker");
      else if (z.grump && Math.random() < z.grump * (has(c, "mooncharm") || D.maskSet(c) ? 0.5 : 1)) D.spawnGrump(game, c, to, cave, false);
    }
    SB.bus.emit(to > from ? "delveDown" : "delveUp", { c: c, cave: cave, depth: to, first: first });
    if (first && !ins && to > D.MAX && to % 10 === 0) { sparks(game, 3, c); say("🏅 level " + to + " of the under-dark! +3 ✨"); }
    if (first && ins && to === maxOf(game, cave)) { sparks(game, 2, c); SB.bus.emit("insideEnd", { c: c, cave: cave }); }
    if (first && !ins && to === D.MAX) { d.bottom = day(game); if (SB.Game.addSparks) SB.Game.addSparks(game, 5, c); SB.bus.emit("delveBottom", { c: c, cave: cave }); }
    return { z: z, first: first };
  }
  // one level down (or, with a ladder, straight to the deepest level this cave has been explored to)
  D.down = function (game, c, cave, ladder) {
    var S = PS(), s = st(game);
    if (booted !== game) boot(game);
    if (!S || S.c !== c) return fail("only a smol you are inside can go down");
    if (!cave) return fail("no cave here");
    var ins = cave.kind === "inside";
    if (SB.dist(c.x, c.z, cave.x, cave.z) > D.REACH) return fail(ins ? "get closer to the way in" : "get closer to the cave mouth");
    if (s.cur != null && s.cur !== cave.id) D.leave(game, "moved");
    var max = maxOf(game, cave), d = D.delve(game, cave), from = s.cur === cave.id ? d.depth || 0 : 0, to = ladder ? d.max || 0 : from + 1;
    if (ladder && (!d.ladder || to <= from)) return fail("no ladder goes deeper than this");
    if (ins && !from) { var gw = D.gateWhy(game, c, cave); if (gw) return fail(gw); }
    if (to > max) return fail(ins ? "this is the last room" : "this is the bottom: " + max + " levels down");
    var zf = zoneAt(game, cave, from), shaft = !ladder && !!(zf && zf.shaft);
    if (from && D.puzzle(game, cave)) return fail("the way on is shut. " + D.puzHint(game, c, cave));
    if (zf && zf.guard && !d.keeper) return fail(zf.guard + " is in the way. chase it off first");
    if (shaft) to = Math.min(max, from + 3);
    var z = zoneAt(game, cave, to);
    if (z.dark && !D.hasLight(c)) return fail("too dark below: bring a torch or a moss lamp");
    var lv = ladder || shaft ? 1 : to - from, cost = D.PEP * lv * (s.boon === "delver" ? 0.5 : 1) * (c.dp && c.dp.trip > game.time ? 0.5 : 1);
    if ((S.stam || 0) < cost) return fail("too puffed to climb down: catch your breath first");
    S.stam = Math.max(0, S.stam - cost);
    game.time += (c.dp && c.dp.perks && c.dp.perks.back ? 0 : D.SECS) * lv;
    var a = arrive(game, c, cave, to, from);
    if (ins) return ok((z.flood ? "🤿" : "🚪") + " " + (max > 1 ? "room " + to + " of " + max + " · " : "") + z.name + ": " + z.rule + (D.puzzle(game, cave) ? " · " + D.puzHint(game, c, cave) : ""), { depth: to, first: a.first });
    return ok("⬇ level " + to + (to <= D.MAX ? " of " + D.MAX : " (the under-dark)") + " · " + z.name + ": " + z.rule + (shaft ? " · a shaft! you dropped three levels at once" : "") + (a.first ? (to === D.MAX ? " · the bottom! +5 ✨" : " · a new record for this cave") : ""), { depth: to, first: a.first });
  };
  D.up = function (game, c, cave, all) {
    var s = st(game), S = PS();
    cave = cave || D.cur(game);
    if (!cave || s.cur !== cave.id) return fail("you are not down a cave");
    var d = D.delve(game, cave), from = d.depth || 0, to = all ? 0 : from - 1;
    if (from <= 0) return fail("you are already on top");
    if (S && S.c === c) S.stam = Math.max(0, (S.stam || 0) - 0.08);
    game.time += 12 * (from - to);
    if (to <= 0) { D.leave(game, "climbed"); return ok(cave.kind === "inside" ? "🌤 back outside" : "🌤 back on top, in the daylight", { depth: 0 }); }
    arrive(game, c, cave, to, from);
    return ok(cave.kind === "inside" ? "⬅ back to " + zoneAt(game, cave, to).name : "⬆ up to level " + to + " · " + zoneAt(game, cave, to).name, { depth: to });
  };
  // back on the surface: the rocks go, the grump stays below
  D.leave = function (game, why) {
    var s = st(game), cv = D.cur(game);
    if (cv) D.delve(game, cv).depth = 0;
    for (var k in s.delves) if (s.delves[k].depth) s.delves[k].depth = 0;
    s.cur = null;
    clearNodes(game); syncChests(game); endGrump(game);
    burnT = 0; darkT = 0; breath = 0;
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
    } else if (D.HAND[n.kind]) {
      var hr = D.HAND[n.kind][1](game, c, n);
      if (!hr.ok) return hr;
      msg = hr.msg;
      if (hr.keep) { SB.bus.emit("delvePick", { c: c, node: n }); return ok(msg); }
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
    // 4.44: the list is kept with the island. it used to be worked out again on every load from things that change in
    // play (the sites, the caves, where a smol can walk, the water), so places drifted away from the markers already
    // standing on them: an old barrow's "go in" answered "get closer to the way in"
    var kept0 = st(game).places;
    if (Array.isArray(kept0) && kept0.length) {
      var keptL = [];
      kept0.forEach(function (a) { if (!a || !PD(a[1])) return; var o = { id: a[0], kind: a[1], x: a[2], z: a[3], b: a[4], h: a[5] }; if (a[6]) o.boon = a[6]; keptL.push(o); });
      game._deepPois = { w: game.world, list: keptL };
      return keptL;
    }
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
    PKEYS().forEach(function (k) {
      var def = PD(k), n = Math.max(1, Math.min(def.max || 99, Math.round(def.n * Math.pow(Math.max(1, KK), 1.2)))), ring = 0;
      for (var i = 0; i < n; i++) {
        var best = null;
        for (var t = 0; t < 90 && !(def.far && !far.length); t++) {
          var x, z;
          if (def.far) { var fc = far[Math.floor(r() * far.length)]; x = (fc % N) + 0.5; z = ((fc / N) | 0) + 0.5; }
          else { var a = r() * 6.283, d = def.near ? 11 + r() * 14 : 16 + r() * (N * 0.46 - 16); x = sp.x + Math.sin(a) * d; z = sp.z + Math.cos(a) * d; }
          if (!land(x, z) || !clear(x, z)) continue;
          var bits = walk[(z | 0) * N + (x | 0)], b = G.biomeAt(T, x, z);
          if (def.far ? bits !== 2 : !(bits & 1)) continue;
          if (b === bid("ocean")) continue;
          if (def.biomes && !def.biomes.some(function (nm) { return bid(nm) === b; })) continue;
          if (def.far && !(land(x + 1, z) && land(x - 1, z) && land(x, z + 1) && land(x, z - 1))) continue;
          var cand = { id: k + i, kind: k, x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10, b: b, h: G.heightAt(T, x, z) };
          if (k !== "lookout" && !def.high) { best = cand; break; }
          if (!best || cand.h > best.h) best = cand; // a lookout takes the highest of the spots it tried
        }
        if (!best) continue;
        if (k === "ring") best.boon = D.BOON_ORDER[ring++ % D.BOON_ORDER.length];
        out.push(best);
      }
    });
    // an island from before 4.44: where a marker already stands, that is where its place is
    // the drift also left some spots with two markers: a place that had drifted onto a found spot was "found" there
    // again. the older marker keeps the spot. the newer one is taken away, and its place goes to the spot the older
    // one's place had drifted off to (or stays where it is now), not found yet, so the island has every place once
    var held = [], ghosts = [];
    (w.structures || []).forEach(function (sb) {
      var pid = sb.data && sb.data.poi, pp = null, pi, hi, at = null;
      if (!pid || String(sb.kind).slice(0, 4) !== "poi_") return;
      for (pi = 0; pi < out.length; pi++) if (out[pi].id === pid) pp = out[pi];
      if (!pp) return;
      for (hi = 0; hi < held.length; hi++) if (SB.dist(held[hi].sb.x, held[hi].sb.z, sb.x, sb.z) < 1.5) at = held[hi];
      if (at) { ghosts.push({ sb: sb, pp: pp, at: at }); return; }
      var rec = { sb: sb, was: null };
      held.push(rec);
      if (SB.dist(pp.x, pp.z, sb.x, sb.z) < 1.5) return;
      rec.was = { x: pp.x, z: pp.z, b: pp.b, h: pp.h };
      pp.x = Math.round(sb.x * 10) / 10; pp.z = Math.round(sb.z * 10) / 10; pp.b = G.biomeAt(T, sb.x, sb.z); pp.h = G.heightAt(T, sb.x, sb.z);
    });
    ghosts.forEach(function (gh) {
      var was = gh.at.was, pp = gh.pp, sx = st(game);
      if (was && !out.some(function (o) { return o !== pp && SB.dist(o.x, o.z, was.x, was.z) < 9; })) { pp.x = was.x; pp.z = was.z; pp.b = was.b; pp.h = was.h; gh.at.was = null; }
      if (W().removeStructure) W().removeStructure(w, gh.sb);
      if (sx.found) delete sx.found[pp.id];
    });
    // and no place is left sitting on another: one that still is goes to the nearest clear ground the island made for it
    ghosts.forEach(function (gh) {
      var pp = gh.pp;
      if (!out.some(function (o) { return o !== pp && SB.dist(o.x, o.z, pp.x, pp.z) < 1.5; })) return;
      for (var tr = 0; tr < 400; tr++) {
        var a = r() * 6.283, d = 12 + r() * 40, x = pp.x + Math.sin(a) * d, z = pp.z + Math.cos(a) * d;
        if (!land(x, z) || G.biomeAt(T, x, z) === bid("ocean") || !(walk[(z | 0) * N + (x | 0)] & 1)) continue;
        if (out.some(function (o) { return o !== pp && SB.dist(o.x, o.z, x, z) < 9; })) continue;
        pp.x = Math.round(x * 10) / 10; pp.z = Math.round(z * 10) / 10; pp.b = G.biomeAt(T, x, z); pp.h = G.heightAt(T, x, z);
        break;
      }
    });
    st(game).places = out.map(function (p) { return [p.id, p.kind, p.x, p.z, p.b, Math.round(p.h * 10) / 10, p.boon || 0]; });
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
    var pr = D.progress(game), def = PD(p.kind);
    SB.bus.emit("poiFound", { c: c || null, poi: p, found: pr.found, total: pr.total });
    tell(def.icon + " " + (c && PS() && PS().c === c ? "you" : c ? c.name : "someone") + " found " + (p.kind === "hermit" ? "the " : def.art != null ? def.art : /^the /.test(def.name) ? "" : /^[aeiou]/.test(def.name) ? "an " : "a ") + def.name + "! " + def.desc + " (" + pr.found + " of " + pr.total + " places · +1 ✨)");
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
    var s = st(game), k = b.kind.slice(4), id = b.data ? b.data.poi || (b.data.dyn ? "dyn" + b.id : null) : null, p = id ? D.poi(game, id) : null, u = id ? s.used[id] : null, today = day(game), out = {};
    function near() { return SB.dist(c.x, c.z, b.x, b.z) <= 4.5; }
    function act(lbl, fn) { return { label: lbl, go: function () { if (!near()) return fail("get closer"); var r = fn(); if (r && r.ok) SB.bus.emit("poiUsed", { c: c, kind: k, st: b }); return r; } }; }
    function no(lbl) { return { label: lbl, locked: true }; }
    if (p && !s.found[id]) D.found(game, p, c);
    if (D.WILT[k] && D.gloomAt(game, b.x, b.z)) { out.use = no("the gloom has wilted this place. push the dark back first"); return out; }
    if (k === "lookout") {
      out.use = fogged(game) ? no("too foggy to see far. come back when it clears") : act("climb up and look out", function () {
        var n = W().reveal(game.world, b.x, b.z, wk(game) === "walkday" ? 60 : 46);
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
        ch.health = Math.min(1, (ch.health || 0) + 0.5); ch.pain = 0; ch.cold = 0; if (c.dp) c.dp.curse = 0; ch.tired = Math.max(0, (ch.tired || 0) - 0.4);
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
        c.chem.fear = 0; c.chem.pain = 0; if (c.dp) c.dp.curse = 0;
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
        if (r() < 0.3 || perk(c, "nose")) { give(game, c, "fossil", 1); noteFind(game, bi, "fossil"); parts.push("an old bone"); }
        if (!s.keeps || typeof s.keeps !== "object") s.keeps = {};
        if (!s.keeps[bi]) { s.keeps[bi] = today; parts.push("a keepsake of the " + biomeName(bi) + " for the shelf"); }
        SB.bus.emit("deepDig", { c: c, kind: "dig", biome: bi });
        return ok("🕳 you dig up " + parts.join(" and ") + (got ? ". you only find those in the " + biomeName(bi) : ""));
      });
    } else if (k === "waystone" || (k === "gate" && b.data.awake)) {
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
        if (r() < 0.25) { var wash = r() < 0.5 ? "keyshard" : "scrap"; give(game, c, wash, 1); give(game, c, "torch", 1); parts.push("a pod crate the tide washed up (a " + label(wash) + " and a torch in it)"); }
        return ok("🐚 in the pool: " + (parts.join(" and ") || "only sand this time"));
      });
    } else if (k === "islet") {
      out.use = no("a castaway's flag. only a raft gets anybody here");
    } else D.ops2(game, c, b, hk, k, id, out, act, no);
    D.opsPost(game, c, b, hk, k, id, out, act, no);
    return out;
  };
  D.waystones = function (game) { return game.world.structures.filter(function (b) { return (b.kind === "poi_waystone" || b.kind === "poi_gate") && b.data && b.data.awake; }); };
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
    if (m.fig) { give(game, c, "figurine", 1); var Sf = PS(); if (Sf && Sf.goal && Sf.goal.deep) P().setGoal(null); SB.bus.emit("deepDig", { c: c, kind: "figurine" }); return ok("🪆 wrapped in old cloth, just where the scrap said: an ark figurine, for the keeping shelf"); }
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
    if (b === bid("tundra") || (w.season === 3 && (b === bid("taiga") || b === bid("mountain")))) return cellRand(game, x, z, 41) < 0.2 && W().depthAt(w, x, z) < 0.05 ? "drift" : "";
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
  // round 4: a raft in the bag no longer borrows fins (the body drew them). it keeps c.wade topped up, which the swim
  // check in creature.js reads; only the ice still sets look.fins (raft.fin)
  var RAFT_WADE = 1.5;
  D.RAFT_WADE = RAFT_WADE;
  function unraft() { if (raft && raft.c) { if (raft.fin) { if (raft.c.look) raft.c.look.fins = false; if (raft.c.dp) raft.c.dp.rf = 0; } else if (!(raft.c.wade > RAFT_WADE)) raft.c.wade = 0; } raft = null; }
  D.afloat = function () { return !!haz.raft; };
  function bodyTick(game, S, dt) {
    var c = S.c, w = game.world, s = st(game), Bd = SB.Body;
    // a raft in the bag: deep water carries you (the body borrows a swimmer's legs while you hold it)
    var ice = D.frozen(game, c.x, c.z), boat = ice || (c.tier >= 2 && hasBoat(c));
    if (!raft && c.dp && c.dp.rf && c.look) { c.look.fins = false; c.dp.rf = 0; }
    if (raft && ((raft.fin && !ice) || (!raft.fin && ice) || !boat || raft.c !== c)) unraft();
    if (ice && c.look && !c.look.fins) { c.look.fins = true; raft = { c: c, fin: 1 }; dp(c).rf = 1; }
    else if (!ice && boat && c.look && (!c.look.fins || (raft && !raft.fin))) { if (!raft) raft = { c: c }; if (!(c.wade > RAFT_WADE)) c.wade = RAFT_WADE; }
    var wd0 = W().depthAt(w, c.x, c.z), deep = wd0 > 0.5, afloat = !!(raft && deep), onIce = ice && wd0 > 0.05;
    if (onIce && !afloat && Bd) { var bi0 = Bd.of(c); if (bi0.wet > raftWet) bi0.wet = raftWet; }
    if (onIce) {
      if (!haz.ice) once(game, "ice", has(c, "wraps") ? "🧊 the water is frozen hard. with your feet wrapped you slide along" : "🧊 the water is frozen: you can walk on it. it is slippery: walk, or wrap your feet", 90);
      if (S.running && !has(c, "wraps") && (slipT += dt) > 2.5) { slipT = 0; S.stam = Math.max(0, (S.stam || 0) - 0.1); c.chem.pain = Math.min(1, (c.chem.pain || 0) + 0.05); say("🧊 whoops! flat on your back. (walk on ice, or wrap your feet)"); SB.bus.emit("deepSlip", { c: c }); }
    } else slipT = 0;
    haz.ice = onIce;
    if (afloat) {
      if (s.boon !== "wanderer" && c._povMove && !onIce && !D.windy(game)) S.stam = Math.max(0, (S.stam || 0) - dt * 0.035);
      if (Bd) { var b0 = Bd.of(c); if (b0.wet > raftWet) b0.wet = raftWet; }
      if (lastPos && lastPos.c === c) s.n.sailed = (s.n.sailed || 0) + Math.min(2, SB.dist(c.x, c.z, lastPos.x, lastPos.z));
      if (!haz.raft && !onIce) { once(game, "raft", "🛶 afloat! the raft carries you over deep water. paddling uses pep", 60); SB.bus.emit("deepAfloat", { c: c }); }
    } else if (Bd && !onIce) raftWet = Bd.of(c).wet;
    haz.raft = afloat && !onIce;
    // sucking mud: half speed (the step you just took is pulled half back)
    var g = afloat || onIce ? "" : D.ground(game, c.x, c.z), slow = (g === "mud" || g === "drift") && !perk(c, "feet");
    if (slow && lastPos && lastPos.c === c) {
      var dx = c.x - lastPos.x, dz = c.z - lastPos.z;
      if (dx * dx + dz * dz < 4) { c.x = lastPos.x + dx * 0.5; c.z = lastPos.z + dz * 0.5; }
      if (g === "mud" && !haz.mud) once(game, "mud", "🟤 sucking mud! it slows you to half. head for firmer ground");
      if (g === "drift" && !haz.drift) once(game, "drift", "❄️ a deep snow drift! slow going, and cold. go round");
    }
    var quick = !slow && c._povMove && lastPos && lastPos.c === c ? (onIce && has(c, "wraps") ? 0.4 : !afloat && !onIce && D.onRoad(game, c.x, c.z) ? 0.3 : 0) : 0;
    if (quick) { var qx = c.x - lastPos.x, qz = c.z - lastPos.z, qnx = c.x + qx * quick, qnz = c.z + qz * quick; if (qx * qx + qz * qz < 4 && W().walkable(w, qnx, qnz, !!(SB.Creature && SB.Creature.canSwim ? SB.Creature.canSwim(c) : c.look && c.look.fins))) { c.x = qnx; c.z = qnz; } }
    haz.road = quick === 0.3;
    haz.mud = g === "mud" && slow; haz.drift = g === "drift" && slow; haz.thorns = g === "thorns";
    lastPos = { c: c, x: c.x, z: c.z };
    if ((hazT -= dt) > 0) return;
    var step = 0.5 + hazT; hazT = 0.5; if (!(step > 0)) step = 0.5; if (step > 2) step = 2;
    var ch = c.chem, b = W().biomeAt(w, c.x, c.z), depth = W().depthAt(w, c.x, c.z);
    if (haz.thorns && S.running) { ch.health = Math.max(0.2, ch.health - 0.02 * step); ch.pain = Math.min(1, (ch.pain || 0) + 0.05); once(game, "thorns", "🌿 thorns! running through them scratches. walk"); }
    haz.icy = !afloat && depth > 0.15 && (b === bid("tundra") || (w.season === 3 && (b === bid("taiga") || b === bid("mountain"))));
    if (haz.icy) { ch.cold = Math.min(1, (ch.cold || 0) + 0.06 * step); once(game, "icy", "🧊 icy water! it chills you fast. get out and get warm"); }
    haz.heat = D.hot(game, c) && !has(c, "frostflask") && !has(c, "sandglass") && D.depth(game) === 0;
    if (haz.heat && Bd) { var bb = Bd.of(c); bb.thirst = Math.min(1, bb.thirst + step * (Bd.THIRST || 1 / 420)); once(game, "heat", D.heatwave(game) ? "🥵 a heat wave: you get thirsty twice as fast. drink often" : "🥵 the heat! you get thirsty twice as fast out here by day", 90); }
    haz.steam = b === bid("ash") && !!W().nearestNode(w, c.x, c.z, 2.2, function (n) { return n.kind === "vent" && n.state === "ok"; });
    if (haz.steam) { ch.health = Math.max(0.2, ch.health - 0.03 * step); once(game, "steam", "♨️ hot steam! step back from the vent"); }
    haz.bliz = D.blizzard(game) && !W().shelterAt(w, c.x, c.z) && !(Bd && Bd.litFireNear && Bd.litFireNear(w, c, 4)) && D.depth(game) === 0;
    if (haz.bliz) { ch.cold = Math.min(1, (ch.cold || 0) + (Bd && Bd.cloaked && Bd.cloaked(c) ? 0.012 : 0.03) * step); once(game, "bliz", "🌨 a blizzard! it chills you fast: get under a roof or to a fire", 90); }
    haz2(game, S, c, step, b, depth);
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
    grumpId = null; lastPos = null; raft = null; haz = {}; saidT = {}; breath = 0; gloomT = 0; ashT = 0;
    var s = st(game);
    if (Sv() && Sv().ROCKS && Sv().ROCKS.d_coal) Sv().ROCKS.d_coal.item = D.twin(game) ? "peat" : "coal"; // twin ores: this island's seams are one or the other
    if (SB.Game && SB.Game.smols) SB.Game.smols(game).forEach(function (o) { if (o.dp && o.dp.rf && o.look) { o.look.fins = false; o.dp.rf = 0; } });
    if (s.cur != null || s.nodes.length) D.leave(game, "loaded");
  }
  function placeTick(game) {
    var w = game.world, s = st(game), S = PS(), c = S && S.game === game && !S.dead ? S.c : null, list = D.pois(game), have = {}, mouths = {};
    w.structures.forEach(function (b) { if (b.data && b.data.poi) have[b.data.poi] = b; else if (b.kind === "delvemouth" && b.data) mouths[b.data.cave] = b; });
    var fr = (fogged(game) ? 4 : D.FIND_R) * (c && perk(c, "eyes") ? 2 : 1);
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
        delveTick2(game, c, S, dt, z);
      }
    } else skyGrump(game, dt);
    if (c) bodyTick(game, S, dt);
    else if (lastPos || raft) { unraft(); lastPos = null; haz = {}; }
    if ((wxT -= dt) <= 0) { wxT = 2; weatherTick(game); sky2(game); }
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
    SB.bus.on("unpossess", function () { var game = cur(); unraft(); lastPos = null; haz = {}; if (game) endGrump(game); if (game && st(game).cur != null) D.leave(game, "sky"); });
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

  // the buttons at a cave mouth, or at the way in to a place with rooms
  function mouthOpts(game, c, cave, o, x) {
    var s = st(game), d = D.delve(game, cave), ins = cave.kind === "inside", dive = ins && D.INS[cave.ik].word === "dive", max = maxOf(game, cave), here = s.cur === cave.id ? d.depth || 0 : 0, nx = here + 1;
    function go(fn, snd) { return function () { var r = fn(); if (r && r.msg) x.say(r.msg); if (r && r.ok) x.audio(snd || "chime", 0.7); return !!(r && r.ok); }; }
    function how() { return x.op(ins ? "how rooms work" : "how delving works", function () { x.say(ins ? "🚪 a place with rooms works like a cave: you stay at the way in and the things round it change. walk away and you are back outside" : D.RULES[0]); if (!ins) x.openBag("deep"); return true; }, null); }
    var gate = ins && !here ? D.gateWhy(game, c, cave) : "", pz = here ? D.puzzle(game, cave) : null, zh = zoneAt(game, cave, here);
    var up = here > 0 ? x.op(ins ? (dive ? "come up for air" : here > 1 ? "step back a room" : "step back outside") : (here > 1 ? "climb up a level" : "climb out"), go(function () { return D.up(game, c, cave); }), null) : null;
    var upAll = x.op(ins ? (dive ? "swim all the way up" : "go all the way out") : "climb all the way out", go(function () { return D.up(game, c, cave, true); }), null);
    var act = here && zh && zh.act && !(d.acts && d.acts[here]) ? x.op(zh.act.label, go(function () { return D.roomAct(game, c, cave); }, "achievement"), null) : null;
    function press(i) { return function () { var r = D.puzPress(game, c, cave, i); if (r && r.msg) x.say(r.msg); x.audio(r && r.ok ? (r.solved ? "achievement" : "chime") : "bonk", 0.7); return true; }; }
    if (gate) o.use = x.no(gate);
    else if (pz && pz.type === "seq") {
      var slots = ["use", "place", "pick"];
      pz.syms.forEach(function (sy, i) { o[slots[i]] = x.op(pz.verb.replace("%s", sy[0] + " " + sy[1]), press(i), null); });
      if (pz.syms.length < 3) o.pick = up;
    } else if (pz) {
      var have = pz.type === "need" ? pz.items.filter(function (k) { return has(c, k); })[0] : null;
      o.use = pz.type === "when" || (pz.type === "need" && !have) ? x.no(pz.why) : x.op(pz.type === "need" ? pz.label + " (your " + label(have) + ")" : d.pz && d.pz.room === here && d.pz.t ? "heave!" : "lean on the bar", press(0), null);
    } else if (here < max) {
      var zn = zoneAt(game, cave, nx);
      if (zh && zh.guard && !d.keeper) o.use = x.no(zh.guard + " is in the way. chase it off first");
      else if (ins) o.use = x.op((here ? (dive ? "dive deeper" : "go further in") : (dive ? "dive in" : "go in")) + " (" + (max > 1 ? "room " + nx + " of " + max + ": " : "") + zn.name + ")", go(function () { return D.down(game, c, cave); }), null);
      else o.use = x.op((zh && zh.shaft ? "jump down the shaft" : here ? "go deeper" : "go down into the cave") + " (level " + nx + (max <= D.MAX ? " of " + D.MAX : "") + ": " + zn.name + ")", go(function () { return D.down(game, c, cave); }), null);
    } else o.use = x.no(ins ? (max > 1 ? "this is the last room" : "you are in: " + zh.name) : "this is the bottom of the cave");
    if (here > 0) {
      if (!(pz && pz.type === "seq")) { o.place = up; o.pick = act || (here > 1 ? upAll : how()); }
    } else {
      if (!ins && x.hk === "ropeladder" && !d.ladder) o.place = x.op("fix your rope ladder here", go(function () { return D.fixLadder(game, c, cave); }, "build"), null);
      else if (!ins && d.ladder && d.max > 1) o.place = x.op("take the ladder down to level " + d.max, go(function () { return D.down(game, c, cave, true); }), null);
      else if (ins) o.place = null;
      o.pick = how();
    }
    if (ins) o.hint = (d.max ? "explored " + d.max + " of " + max + (max > 1 ? " rooms" : " room") : "nobody has been in here yet") + (here ? " · you are in " + zh.name : "") + (pz ? " · " + D.puzHint(game, c, cave) : "") + (here && zh.flood ? " · breath: " + Math.max(0, Math.ceil(D.breath())) + "s" : "");
    else o.hint = (d.max ? "explored " + d.max + (max <= D.MAX ? " of " + D.MAX : "") + " levels" + (d.bottom ? " · the bottom is found" : "") + (d.ladder ? " · ladder" : "") : "nobody has been down here yet") + (here ? " · you are on level " + here : "");
  }
  function nodeOpts(game, c, n, o, x) {
    var z = D.zone(game), need = D.NEED[n.kind];
    function go(fn) { return function () { var r = fn(); if (r && r.msg) x.say(r.msg); if (r && r.ok) { x.audio("craft", 0.7); if (x.swing) x.swing(); } return !!(r && r.ok); }; }
    if (z && z.dark && !D.hasLight(c)) { o.use = x.no("too dark to see: you need a torch or a moss lamp"); o.pick = null; o.place = null; return; }
    if (D.HAND[n.kind]) { o.use = o.pick = x.op(D.HAND[n.kind][0], go(function () { return D.pick(game, c, n); }), null); return; }
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
        else if (k.indexOf("poi_") === 0 && D.INS[k.slice(4)]) {
          var pid = b.data ? b.data.poi || (b.data.dyn ? "dyn" + b.id : null) : null, pp = pid ? D.poi(game, pid) : null, anc = pid ? D.anchor(game, pid) : null;
          if (pp && !st(game).found[pid]) D.found(game, pp, c);
          if (anc) mouthOpts(game, c, anc, o, x);
        } else if (k.indexOf("poi_") === 0) {
          var ops = D.poiOps(game, c, b, hk);
          ["use", "place"].forEach(function (slot) {
            var a = ops[slot];
            if (!a) return;
            o[slot] = a.locked ? x.no(a.label) : x.op(a.label, function () { var res = a.go(); if (res && res.msg) x.say(res.msg); if (res && res.ok) { x.audio("chime", 0.7); if (a.open) x.openBag(a.open); } return !!(res && res.ok); }, null);
          });
          if (ops.use && !ops.place && o.place && !o.place.locked) o.place = null; // (don't put your things down on a shrine by mistake)
        } else if (k === "lootchest" && b.data && String(b.data.loot).indexOf("delve") === 0 && D.keeperUp(game)) { o.use = x.no((D.grump(game).name || "the cave's keeper") + " is in the way. chase it off first"); o.place = null; }
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
    var more = D.html2(game, c, icon);
    out += "<div class='lbl'>🧭 the island · <b>" + pr.pct + "%</b> explored · <b>" + pr.found + " of " + pr.total + "</b> places found · deepest delve: level <b>" + pr.deepest + "</b> of " + (D.underOpen(game) ? D.UNDER_MAX : D.MAX) + "</div>";
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
    var unk = 0;
    Object.keys(D.MORE).forEach(function (k) { var o = pr.by[k]; if (!o) return; if (!o.found) { unk += o.n; return; } out += "<span class='" + (o.found >= o.n ? "ok" : "") + "' title='" + esc(D.MORE[k].desc) + "'>" + D.MORE[k].icon + " " + esc(D.MORE[k].name) + " " + o.found + "/" + o.n + "</span>"; });
    out += "</div>" + (unk ? "<p class='help'>and " + unk + " stranger places nobody has seen yet</p>" : "");
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
    out += "<p class='help'>" + D.RULES.map(esc).join("<br>") + "</p>" + more;
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
    D.wire2(root, game, c, redraw, sayFn);
  };

  /* ================= round 2: insides, the under-dark, more places, the gloom, sky and ground =================
     insides     some places have rooms. They work like a delve (you stay at the way in, the things round it change),
                 with puzzles (carved orders, levers, knocks, sockets, a stuck hatch), guardians, flooded rooms that
                 need breath, and a chest at the end. D.INS has them: barrow, pyramid, temple, grump hall, fort, the
                 old city, a fallen piece of the ark, a sunk pod to dive for, a hollow giant, a web grove, a sinkhole...
     under-dark  once the three captains have fallen every cave goes on down past level 6: themed levels that change
                 every few days, shafts that drop you three levels, a locker every fifth level.
     the gloom   the dark round an unbeaten captain's lair grows a little every day. Torches, glowcaps and fires
                 push it back. It wilts places, frightens (or chills, or tires) a body, and its grumps come at night.
     the rest    keys and lockers, relics, ark tablets, star seeds, masks, one-off tools, a keeping shelf, stars to
                 find, pins, weekdays, expeditions, a cart, climbing, gliding, sledging, panning, ice, drifts, old
                 roads, thin air, lava, storm rods, falling stars, a quake, windy days, the aurora. */
  function BO() { return SB.Bosses; }
  function captains(game) { var b = BO(); try { return b && b.beaten ? b.beaten(game) : 0; } catch (e) { return 0; } }
  function bossEntry(game, id) { var b = BO(), s = b && b.state ? b.state(game) : null; return s && s.list ? s.list[id] : null; }
  function dp(c) { if (!c.dp || typeof c.dp !== "object") c.dp = {}; if (!c.dp.perks || typeof c.dp.perks !== "object") c.dp.perks = {}; return c.dp; }
  function perk(c, id) { return !!(c && c.dp && c.dp.perks && c.dp.perks[id]); }
  function sparks(game, n, c) { if (SB.Game.addSparks) SB.Game.addSparks(game, n, c || null); }
  function gives(game, c, list) { var parts = []; list.forEach(function (x) { if (K[x[0]] && x[1] > 0) { give(game, c, x[0], x[1]); parts.push(x[1] + " " + label(x[0])); } }); return parts.join(", "); }
  function wk(game) { return D.WEEK[(day(game) - 1) % 7]; }
  function sea(b) { return b === bid("ocean") || b === bid("reef"); }
  function hasBoat(c) { return has(c, "raft") || has(c, "bambooraft"); }
  function hasAxe(c) { return ["stoneaxe", "axe", "ironaxe", "sunsickle"].some(function (k) { return has(c, k); }); }
  function hasPick(c) { return ["stonepick", "ironpick", "silverpick", "starpick", "patientpick", "hammer"].some(function (k) { return has(c, k); }); }
  function hardPick(c) { return ["ironpick", "silverpick", "starpick", "patientpick"].some(function (k) { return has(c, k); }); }
  function fwd(c) { var a = c.facing || 0; return { x: Math.sin(a), z: Math.cos(a) }; }
  function moveTo(game, c, x, z) { c.x = x; c.z = z; if (c.px != null) c.px = x; if (c.pz != null) c.pz = z; lastPos = null; }
  function drySpot(game, r, x0, z0, dmin, dmax) {
    var w = game.world;
    for (var t = 0; t < 50; t++) {
      var a = r() * 6.283, d = dmin + r() * (dmax - dmin), x = x0 + Math.sin(a) * d, z = z0 + Math.cos(a) * d;
      if (!W().inBounds(w, x, z) || W().depthAt(w, x, z) > 0.02 || !W().walkable(w, x, z, false) || W().structsNear(w, x, z, 2.5).length) continue;
      return { x: Math.round(x * 10) / 10, z: Math.round(z * 10) / 10 };
    }
    return null;
  }
  D.now = function () { return Date.now() / 1000; };
  D.lootTier = function (game) { return (game.stats && game.stats.maxTier) || 0; }; // what old crates and jars hold gets better as the tribe does
  D.WEEK = ["restday", "logday", "fishday", "makeday", "walkday", "marketday", "fireday"];
  D.WEEK_PERK = { restday: "igloos, huts and camps rest you right through", logday: "fallen trees give an extra log", fishday: "pools and the oasis give double", makeday: "jars and crates hold one thing more", walkday: "climbing, gliding and sledging cost no pep", marketday: "the cart is free", fireday: "a torch pushes the gloom back twice as far" };
  D.weekday = wk;

  /* ---------------- more things ---------------- */
  kind("keyshard", { noun: "material", label: "key shard", emoji: "🗝", r: 0.1, color: 0xd8c27a, desc: "a bit of an ark key. opens one ark locker, and its marks show the order at a marked door. cave grumps and old crates have them." });
  kind("arkkey", { noun: "material", label: "captain's key", emoji: "🔑", r: 0.11, color: 0xffd76a, glow: 1, desc: "a captain dropped it. it opens a sealed room, or any ark locker." });
  kind("relic", { noun: "material", label: "relic piece", emoji: "🏺", r: 0.12, color: 0xb98a5a, mat: 1, desc: "a piece of something old. hold three and fit them together: a blessing, most of the time." });
  kind("tablet", { noun: "material", label: "ark tablet", emoji: "📜", r: 0.13, color: 0xcfe6ff, glow: 1, desc: "hold it and read it. the smol that reads it keeps one gift for good." });
  kind("skyseed", { noun: "material", label: "star seed", emoji: "🌟", r: 0.1, color: 0xfff2a0, glow: 1, desc: "hold it and swallow it: a bigger heart, for good." });
  kind("powercell", { noun: "material", label: "power cell", emoji: "🔋", r: 0.13, color: 0x7dffb0, glow: 1, mat: 1, desc: "it still hums. old ark doors and lifts wake up for one." });
  kind("stormglass", { noun: "material", label: "storm glass", emoji: "⚡", r: 0.11, color: 0xfff7a8, glow: 1, mat: 1, desc: "lightning, caught by a storm rod. it wakes an old socket as well as a crystal does." });
  kind("brimstone", { noun: "material", label: "brimstone", emoji: "🟡", r: 0.12, color: 0xe6d24a, mat: 1, desc: "yellow rock from the hot places. burns hotter than coal." });
  kind("peat", { noun: "material", label: "bog coal", emoji: "🟤", r: 0.13, color: 0x4a3626, mat: 1, desc: "on some islands the seams are bog coal, not coal. it burns and smelts the same." });
  kind("statue", { noun: "material", label: "old statue", emoji: "🗿", r: 0.2, color: 0x9d98a3, mat: 1, desc: "a stone smol from before. it would look fine on the keeping shelf." });
  kind("figurine", { noun: "material", label: "ark figurine", emoji: "🪆", r: 0.11, color: 0xd9c2a0, mat: 1, desc: "a tiny carved pilot. a journal scrap led you to it." });
  kind("mask_scowl", { noun: "material", label: "scowl mask", emoji: "👺", r: 0.14, color: 0xb04a3a, desc: "a grump mask from the grump hall. carry all four and the dark thinks twice." });
  kind("mask_grin", { noun: "material", label: "grin mask", emoji: "🎭", r: 0.14, color: 0xd8b24a, desc: "a grump mask from the ash fort. carry all four and the dark thinks twice." });
  kind("mask_yawn", { noun: "material", label: "yawn mask", emoji: "🥱", r: 0.14, color: 0x6a5a8a, desc: "a grump mask from the old city. carry all four and the dark thinks twice." });
  kind("mask_bone", { noun: "tool", label: "bone mask", emoji: "🦴", r: 0.14, color: 0xe6dcc0, tool: "wear", desc: "hold it and put it on: for a day you look like old bones, and grumps of the dark leave you be." });
  kind("vinerope", { noun: "tool", label: "vine rope", emoji: "🪢", r: 0.14, color: 0x6a9a4a, tool: "climb", desc: "hold it, face a cliff, and throw it up: you climb to the top." });
  kind("claws", { noun: "tool", label: "climbing claws", emoji: "🧗", r: 0.12, color: 0x46526c, tool: "climb", desc: "in your bag, a climb costs half the pep and you do not slip on wet spikes." });
  kind("wraps", { noun: "tool", label: "foot wraps", emoji: "🧦", r: 0.12, color: 0xd8c8a8, tool: "grip", desc: "in your bag, ice is a fast slide and never a slip." });
  kind("sled", { noun: "tool", label: "bark sled", emoji: "🛷", r: 0.18, color: 0x9a6a3a, tool: "slide", desc: "hold it on snow, face downhill, and go." });
  kind("snorkel", { noun: "tool", label: "reed pipe", emoji: "🎋", r: 0.12, color: 0x9cb85a, tool: "breathe", desc: "in your bag, your breath lasts half again as long under water." });
  kind("stormrod", { noun: "tool", label: "storm rod", emoji: "🌩", r: 0.16, color: 0x8a8590, tool: "plant", desc: "hold it and set it up. in a storm it catches lightning as storm glass." });
  kind("wings", { noun: "tool", label: "glide wings", emoji: "🪽", r: 0.18, color: 0xf5f3ed, tool: "glide", glow: 1, desc: "hold them on high ground and jump: you glide a long way down." });
  kind("reader", { noun: "tool", label: "old-tongue reader", emoji: "🔎", r: 0.12, color: 0xf2b84a, tool: "read", desc: "in your bag, old carvings can be read: worn door marks, and what statues say." });
  kind("rubbing", { noun: "material", label: "carving rubbing", emoji: "📋", r: 0.12, color: 0xe2cf9a, desc: "an idea, rubbed off an old carving. hold it and study it: the smol learns an idea it was ready for." });
  kind("scrap", { noun: "material", label: "journal scrap", emoji: "📄", r: 0.11, color: 0xf0e6d0, desc: "a torn page. hold it and read it: a clue, a tune, or where something is buried." });
  kind("date", { noun: "food", label: "date", emoji: "🌴", r: 0.1, color: 0x8a4a26, food: { hunger: -0.2 }, chem: { glucose: 0.2 }, desc: "sweet and sticky. only grows at an oasis." });
  kind("cavefish", { noun: "food", label: "blindfish", emoji: "🐟", r: 0.13, color: 0xe8e0f0, food: { hunger: -0.3 }, chem: { glucose: 0.2 }, desc: "a pale fish with no eyes, from a cave pool." });
  kind("bambooraft", { noun: "tool", label: "bamboo raft", emoji: "🎍", r: 0.2, color: 0x96cf5a, tool: "float", desc: "the cheap first boat. it carries you over deep water just like a log raft." });
  kind("sandglass", { noun: "tool", label: "the cool glass", emoji: "⏳", r: 0.12, color: 0xbfefff, tool: "cool", glow: 1, desc: "one of a kind, from the buried ark. in your bag the heat never makes you thirsty." });
  kind("arkcutter", { noun: "tool", label: "the ark-cutter", emoji: "🗡", r: 0.17, color: 0xdff6ff, tool: "fight", glow: 1, desc: "one of a kind. the tool that cut the pods free. it was stuck in a stone, waiting." });
  kind("sunsickle", { noun: "tool", label: "the sun sickle", emoji: "🌙", r: 0.16, color: 0xffd76a, tool: "chop", glow: 1, desc: "one of a kind, from the haunted hall. cuts wood and vines like butter, and never wears out." });
  kind("patientpick", { noun: "tool", label: "the patient pick", emoji: "⛏", r: 0.16, color: 0xffc0e0, tool: "mine", glow: 1, desc: "one of a kind, from a captain's locker. it cuts anything, and never wears out." });
  D.UNIQUES = ["sandglass", "arkcutter", "sunsickle", "patientpick", "wings"];
  D.MASKS = ["mask_scowl", "mask_grin", "mask_yawn", "mask_bone"];
  D.maskSet = function (c) { return D.MASKS.every(function (k) { return has(c, k); }); };
  if (Sv() && Sv().TOOL) {
    var TL2 = Sv().TOOL;
    if (!TL2.arkcutter) TL2.arkcutter = { wood: 0.3, stone: 0, ore: 0, dmg: 3.6, uses: 99999 };
    if (!TL2.sunsickle) TL2.sunsickle = { wood: 4, stone: 0, ore: 0, dmg: 1.6, uses: 99999 };
    if (!TL2.patientpick) TL2.patientpick = { wood: 0.5, stone: 8, ore: 7, dmg: 1.2, uses: 99999 };
  }
  if (Sv() && Sv().FUEL) { if (!Sv().FUEL.brimstone) Sv().FUEL.brimstone = 2.2; if (!Sv().FUEL.peat) Sv().FUEL.peat = 1.5; }
  D.ALT = { coal: "peat" };
  [{ id: "bambooraft", in: { stick: 6, fiber: 3 }, hint: "bamboo canes (sticks) lashed with reed fibre: no logs, no axe" },
    { id: "vinerope", in: { vine: 3, flint: 1 }, hint: "three vines and a flint hook" },
    { id: "claws", in: { flint: 2, fiber: 2 }, hint: "flints bound to your paws" },
    { id: "wraps", in: { fiber: 3 }, hint: "reed fibre round your feet" },
    { id: "sled", in: { log: 1, vine: 1 }, hint: "a curl of bark and a pull-rope" },
    { id: "snorkel", in: { stick: 1, fiber: 1 }, hint: "a hollow cane" },
    { id: "stormrod", in: { iron: 1, stick: 2 }, hint: "iron on a tall pole" },
    { id: "reader", in: { crystal: 1, amber: 1 }, hint: "a crystal in an amber ring" }
  ].forEach(function (rc) { if (!D.recipe(rc.id)) D.RECIPES.push(rc); });

  // things in rooms and deep levels that are not the first ten rocks
  node("u_crate", { noun: "material", label: "old pod crate", emoji: "📦", r: 0.5, desc: "an ark crate, still shut. break it open." });
  node("u_jar", { noun: "material", label: "old jar", emoji: "🏺", r: 0.4, desc: "sealed long ago. smash it." });
  node("u_pool", { noun: "water", label: "cave pool", emoji: "💧", r: 0.6, desc: "still black water. pale fish in it, for a rod." });
  node("u_brim", { noun: "material", label: "brimstone crust", emoji: "🟡", r: 0.5, desc: "yellow and hot. needs a pick." });
  node("u_crystal", { noun: "material", label: "crystal spur", emoji: "💎", r: 0.5, glow: 1, desc: "a spur of thought crystal. needs a pick." });
  node("u_cap", { noun: "mushroom", label: "glowcaps", emoji: "🍄", r: 0.4, glow: 1, desc: "a clump of glowing caps." });
  node("u_cell", { noun: "material", label: "power cell rack", emoji: "🔋", r: 0.45, glow: 1, desc: "one cell still hums. take it." });
  node("u_shell", { noun: "material", label: "shell bed", emoji: "🐚", r: 0.45, desc: "clams, and now and then a pearl." });
  node("u_web", { noun: "material", label: "thick web", emoji: "🕸", r: 0.5, desc: "sticky. pull it down for fibre." });
  node("u_hive", { noun: "material", label: "wild hive", emoji: "🍯", r: 0.45, desc: "honey, if you do not mind a sting." });
  if (Sv() && Sv().ROCKS) {
    var RK2 = Sv().ROCKS;
    if (!RK2.u_brim) RK2.u_brim = { item: "brimstone", left: 2, hp: 3, ore: 1 };
    if (!RK2.u_crystal) RK2.u_crystal = { item: "crystal", left: 2, hp: 3.5, ore: 1 };
  }
  D.NEED.u_brim = [1, "a stone pick"]; D.NEED.u_crystal = [1, "a stone pick"];
  // by hand: [what the button says, what happens]
  D.HAND = {
    u_crate: ["break the crate open", function (game, c, n) {
      var r = dice(game, "crate:" + n.seed + ":" + day(game)), list = [[r() < 0.5 ? "torch" : "cooked", 1], [r() < 0.5 ? "stick" : "fiber", 2]];
      if (wk(game) === "makeday") list.push(["flint", 1]);
      var tl = D.lootTier(game);
      if (tl >= 4 && r() < 0.35) list.push(["iron", 1]);
      if (tl >= 5 && r() < 0.25) list.push(["silver", 1]);
      if (r() < 0.25) list.push(["keyshard", 1]);
      if (r() < 0.2) list.push(["scrap", 1]);
      return ok("📦 crack! inside: " + gives(game, c, list));
    }],
    u_jar: ["smash the jar", function (game, c, n) {
      var r = dice(game, "jar:" + n.seed + ":" + day(game)), list = [[r() < 0.5 ? "seed" : "coal", 1]];
      if (wk(game) === "makeday") list.push(["clay", 1]);
      if (D.lootTier(game) >= 3) list.push(["flint", 1]);
      if (D.lootTier(game) >= 5 && r() < 0.3) list.push(["geode", 1]);
      if (r() < 0.2) list.push(["relic", 1]);
      if (r() < 0.12) list.push(["scrap", 1]);
      return ok("🏺 crash! inside: " + gives(game, c, list));
    }],
    u_pool: ["fish the cave pool", function (game, c, n) {
      if (!has(c, "rod")) return fail("pale fish in the pool. you need a rod");
      var nn = wk(game) === "fishday" ? 2 : 1;
      give(game, c, "cavefish", nn); if (SB.Body && SB.Body.xp) SB.Body.xp(c, "fish", 2);
      n.left = (n.left == null ? 3 : n.left) - 1;
      return ok("🐟 " + nn + " blindfish" + (n.left > 0 ? "" : ". the pool is fished out for now"), { keep: n.left > 0 });
    }],
    u_cap: ["pick the glowcaps", function (game, c) { var k = K.glowcap ? "glowcap" : "glowmoss"; give(game, c, k, 2); return ok("🍄 2 " + label(k)); }],
    u_cell: ["take the power cell", function (game, c) { give(game, c, "powercell", 1); return ok("🔋 a power cell. it still hums: an old lift or door will wake for it"); }],
    u_shell: ["prise the shells loose", function (game, c, n) { var r = dice(game, "shell:" + n.seed + ":" + day(game)), list = [[K.clam ? "clam" : "pearl", 1]]; if (r() < 0.35) list.push(["pearl", 1]); return ok("🐚 " + gives(game, c, list)); }],
    u_web: ["pull the web down", function (game, c) { give(game, c, "fiber", 2); return ok("🕸 2 " + label("fiber")); }],
    u_hive: ["reach into the hive", function (game, c) {
      var smoke = has(c, "torch"); if (!smoke) { c.chem.health = Math.max(0.3, c.chem.health - 0.04); c.chem.pain = Math.min(1, (c.chem.pain || 0) + 0.1); }
      give(game, c, K.honey ? "honey" : "amber", 1);
      return ok("🍯 " + label(K.honey ? "honey" : "amber") + (smoke ? ". your torch smoke keeps the bees dozy" : ". ow! stung. (a torch in your bag smokes them quiet)"));
    }]
  };

  /* ---------------- more places ---------------- */
  D.MORE = {
    jars: { icon: "🏺", name: "old jars", art: "some ", n: 3, r: 0.6, desc: "sealed long ago. smash them for what is inside." },
    fallen: { icon: "🪵", name: "fallen tree", n: 4, r: 0.9, desc: "logs for the taking. no axe needed." },
    statue: { icon: "🗿", name: "old statue", n: 2, r: 0.6, desc: "a stone smol from before. brush it clean, or carry it home." },
    locker: { icon: "🔐", name: "ark locker", n: 3, r: 0.5, desc: "locked. it wants a key shard." },
    biolocker: { icon: "🧳", name: "captain's locker", n: 3, max: 3, r: 0.5, desc: "sealed by the three captains. it opens when all three have fallen." },
    gate: { icon: "🚪", name: "broken ark gate", n: 2, max: 2, r: 0.8, desc: "mend it with iron and a crystal, and you can step between the two." },
    tunnel: { icon: "🚇", name: "old tunnel", n: 2, max: 2, r: 0.8, desc: "it comes out somewhere else." },
    oasis: { icon: "🌴", name: "oasis", n: 1, r: 1.2, biomes: ["desert", "mesa"], desc: "water, dates and its own fish, in the middle of the dry." },
    hut: { icon: "🛖", name: "lonely hut", n: 2, r: 0.9, biomes: ["tundra", "swamp", "mangrove"], desc: "an igloo in the snow, or a bog hut in the swamp." },
    lava: { icon: "🌋", name: "lava pool", n: 3, r: 1.1, biomes: ["ash"], desc: "it burns anybody who stands close. brimstone crusts its edge." },
    scree: { icon: "🪨", name: "windy scree", n: 2, r: 0.9, biomes: ["mountain"], desc: "loose rock on a windy slope. flint for the picking." },
    summit: { icon: "🏔", name: "the summit", n: 1, max: 1, r: 1, biomes: ["mountain"], high: 1, desc: "the top of the island. three hard climbs." },
    giant: { icon: "🦣", name: "shy giant", n: 1, max: 1, r: 1.2, biomes: ["mountain", "taiga", "tundra"], desc: "very big, very shy. it likes berries." },
    oldtree: { icon: "🌳", name: "grumpy old tree", n: 1, max: 1, r: 1.2, biomes: ["forest", "maple", "blossom", "taiga", "jungle"], desc: "older than the ark. it swats whoever shakes it." },
    pool: { icon: "🪞", name: "memory pool", n: 1, max: 1, r: 1, desc: "still, bright water. look in." },
    sword: { icon: "⚔", name: "the tool in the stone", n: 1, max: 1, r: 0.6, desc: "an old ark tool, stuck fast in a rock." },
    vault: { icon: "🏛", name: "the masters' vault", n: 1, max: 1, r: 0.9, desc: "it opens for a smol that has mastered every skill." },
    haunt: { icon: "👻", name: "haunted hall", n: 1, max: 1, r: 1.1, desc: "three lost spirits. they only show at night." },
    grove: { icon: "🌲", name: "thorn-walled grove", n: 1, max: 1, r: 1.2, biomes: ["forest", "maple", "taiga", "jungle", "blossom"], desc: "old thorn as thick as a wall. only an iron axe gets through." },
    midden: { icon: "🗑", name: "the old heap", n: 1, max: 1, r: 0.8, near: 1, desc: "what the tribe threw out. worth a rummage." },
    notes: { icon: "🎶", name: "note stones", art: "the ", n: 1, max: 1, r: 1, desc: "three stones that ring. play the right tune." },
    shaft: { icon: "🛤", name: "ark-crew diggings", art: "some ", n: 2, r: 0.9, desc: "the crew dug here once. props, crates and ore." },
    tomb: { icon: "⚰", name: "old barrow", n: 2, r: 1, desc: "a mound with a door. something guards it." },
    pyramid: { icon: "🔺", name: "buried ark section", n: 1, max: 1, r: 1.1, biomes: ["desert", "mesa"], desc: "a corner of the ark, deep in the sand. the floor bites." },
    temple: { icon: "🛕", name: "vine-choked temple", n: 1, max: 1, r: 1.2, biomes: ["jungle", "bamboo"], desc: "cut your way in with an axe." },
    hall: { icon: "🏚", name: "grump hall", n: 1, max: 1, r: 1.3, biomes: ["forest", "maple", "taiga", "blossom"], desc: "a big dark hall, full of grumps and what they took." },
    fort: { icon: "🏰", name: "ash fort", n: 1, max: 1, r: 1.3, biomes: ["ash"], desc: "the grumps' fort in the ashlands." },
    city: { icon: "🏙", name: "the old city", n: 1, max: 1, r: 1.3, desc: "dark, silent, and something walks in it when you look away." },
    hull: { icon: "🛸", name: "fallen ark hull", n: 1, max: 1, r: 1.4, desc: "a piece of the ark itself. four holds and a memory hall." },
    sunk: { icon: "🤿", name: "diving rock", n: 2, r: 0.8, biomes: ["beach", "reef", "mangrove"], desc: "a sunk pod lies under the water here. dive for it." },
    hollow: { icon: "🌴", name: "hollow giant tree", n: 1, r: 1.3, biomes: ["jungle", "forest", "bamboo"], desc: "big enough to step inside." },
    web: { icon: "🕸", name: "web grove", n: 1, max: 1, r: 1.1, biomes: ["swamp", "forest", "jungle", "taiga", "maple"], desc: "webs between every tree. somebody is stuck in there." },
    sink: { icon: "🕳", name: "sinkhole", n: 1, max: 1, r: 1, desc: "grumps come up out of it. go down and seal it." },
    sewer: { icon: "🚰", name: "the drains", n: 1, max: 1, r: 0.7, near: 1, desc: "tunnels under the village. the grate opens when the tribe are builders." },
    crack: { icon: "🐾", name: "narrow crack", n: 2, r: 0.5, desc: "too small for a big smol. a blob or a critter fits." },
    pale: { icon: "🌫", name: "pale grove", n: 1, max: 1, r: 1.2, desc: "grey, and silent. something stands among the trees." }
  };
  D.DYN = { altar: ["🪦", "dark altar", "what is left of a captain's dark. break it."], vein: ["⛏", "new ore vein", "the island gave this up when the altar broke. it needs an iron pick."], crater: ["🌠", "star crater", "a star came down here. dig it out before it cools away."], rod: ["🌩", "storm rod", "it catches lightning as storm glass."], expcamp: ["⛺", "expedition camp", "your camp, far from home."] };
  Object.keys(D.MORE).forEach(function (k) { var d = D.MORE[k]; struct("poi_" + k, d.name, d.icon, d.r, d.desc); });
  Object.keys(D.DYN).forEach(function (k) { var d = D.DYN[k]; struct("poi_" + k, d[1], d[0], 0.7, d[2]); });
  function PD(k) { return D.POI[k] || D.MORE[k] || null; }
  function PKEYS() { return Object.keys(D.POI).concat(Object.keys(D.MORE)); }
  D.placeDef = PD;
  D.WILT = { dig: 1, fallen: 1, oasis: 1, tidepool: 1, oldtree: 1, grove: 1 };

  if (SB.Loot && SB.Loot.TABLES) {
    var T2 = SB.Loot.TABLES;
    var tbl = function (k, def) { if (!T2[k]) T2[k] = def; };
    tbl("shaft", { name: "the crew's strongbox", shells: [3, 6], mote: 0.3, fruit: 0.15, sure: [["keyshard", 1]], items: [["ironore", 2, 3, 2], ["coal", 2, 3, 2], ["torch", 2, 2, 2], ["scrap", 1, 1, 1]] });
    tbl("tomb", { name: "the barrow's treasure", shells: [6, 10], mote: 0.6, fruit: 0.4, sure: [["relic", 1], ["tablet", 1]], items: [["silver", 1, 1, 1], ["geode", 1, 2, 2], ["amber", 1, 2, 1]] });
    tbl("pyramid", { name: "the ark's cold store", shells: [6, 10], mote: 0.6, fruit: 0.3, sure: [["sandglass", 1], ["relic", 1]], items: [["opal", 1, 2, 2], ["powercell", 1, 1, 1], ["scrap", 1, 1, 1]] });
    tbl("temple", { name: "the temple's heart", shells: [8, 12], motes: 1, fruit: 0.5, sure: [["tablet", 1], ["skyseed", 1]], items: [["amber", 2, 3, 2], ["relic", 1, 1, 1], ["crystal", 1, 2, 1]] });
    tbl("hall", { name: "the grump chief's hoard", shells: [8, 14], mote: 0.6, fruit: 0.3, sure: [["mask_scowl", 1]], items: [["cooked", 2, 4, 2], ["iron", 1, 2, 1], ["keyshard", 1, 1, 2], ["relic", 1, 1, 1]] });
    tbl("fort", { name: "the fort's strongroom", shells: [10, 16], motes: 1, fruit: 0.3, sure: [["mask_grin", 1], ["brimstone", 2]], items: [["silver", 1, 2, 2], ["keyshard", 1, 1, 2], ["starmetal", 1, 1, 1]] });
    tbl("city", { name: "the deep vault of the old city", shells: [14, 22], motes: 2, fruits: 1, sure: [["mask_yawn", 1], ["tablet", 1], ["skyseed", 1]], items: [["starmetal", 1, 2, 2], ["relic", 1, 2, 2], ["silver", 1, 2, 1]] });
    tbl("hull", { name: "the ark's memory chest", shells: [8, 12], motes: 1, fruit: 0.5, sure: [["tablet", 1], ["reader", 1]], items: [["powercell", 1, 1, 2], ["crystal", 1, 2, 2], ["scrap", 1, 2, 1]] });
    tbl("hull2", { name: "the ark's last locker", shells: [14, 20], motes: 2, fruits: 1, sure: [["skyseed", 1], ["starmetal", 2]], items: [["tablet", 1, 1, 1], ["relic", 1, 2, 1]] });
    tbl("sunk", { name: "the sunk pod's locker", shells: [5, 9], mote: 0.5, fruit: 0.3, sure: [["pearl", 2]], items: [["metal", 1, 2, 2], ["keyshard", 1, 1, 2], ["scrap", 1, 1, 1], ["relic", 1, 1, 1]] });
    tbl("hollow", { name: "a cache inside the giant", shells: [2, 5], mote: 0.3, fruit: 0.3, sure: [["amber", 1]], items: [["honey", 1, 2, 2], ["seed", 2, 3, 2], ["mapscrap", 1, 1, 1]] });
    tbl("sewer", { name: "what the cistern kept", shells: [4, 8], mote: 0.3, fruit: 0.2, sure: [["keyshard", 1]], items: [["iron", 1, 1, 1], ["scrap", 1, 1, 2], ["potion", 1, 1, 1]] });
    tbl("crack", { name: "a tiny hoard", shells: [3, 6], mote: 0.6, fruit: 0.3, sure: [["relic", 1]], items: [["pearl", 1, 1, 1], ["amber", 1, 1, 1], ["seed", 2, 3, 1]] });
    tbl("pale", { name: "the pale chest", shells: [5, 9], mote: 0.6, fruit: 0.4, sure: [["relic", 1]], items: [["icegem", 1, 2, 2], ["scrap", 1, 1, 1], ["silver", 1, 1, 1]] });
    tbl("locker", { name: "an ark locker", shells: [4, 8], mote: 0.5, fruit: 0.3, items: [["powercell", 1, 1, 2], ["iron", 1, 2, 2], ["tablet", 1, 1, 1], ["relic", 1, 1, 2], ["crystal", 1, 2, 2]] });
    tbl("under", { name: "a locker in the under-dark", shells: [10, 16], motes: 1, fruit: 0.5, sure: [["starmetal", 1]], items: [["tablet", 1, 1, 1], ["skyseed", 1, 1, 1], ["silver", 1, 2, 2], ["relic", 1, 2, 2]] });
    tbl("secret", { name: "a secret", shells: [3, 7], mote: 0.5, fruit: 0.3, items: [["scrap", 1, 1, 2], ["keyshard", 1, 1, 2], ["geode", 1, 2, 2], ["mapscrap", 1, 1, 1]] });
    tbl("vault", { name: "the masters' reward", shells: [16, 24], motes: 2, fruits: 1, sure: [["tablet", 2], ["skyseed", 1]], items: [["starmetal", 1, 2, 1]] });
    tbl("haunt", { name: "what the spirits kept", shells: [6, 10], mote: 0.6, fruit: 0.4, sure: [["sunsickle", 1], ["mask_bone", 1]], items: [["relic", 1, 1, 1], ["silver", 1, 1, 1]] });
  }

  /* ---------------- insides: places with rooms ---------------- */
  var SUN = [["☀", "sun"], ["🌙", "moon"], ["⭐", "star"]], LEV = [["⬅", "left"], ["⬆", "middle"], ["➡", "right"]], KNOCK = [["▬", "long"], ["•", "short"]], NOTE = [["🔈", "low"], ["🔉", "middle"], ["🔊", "high"]], FEET = [["⬅", "left"], ["➡", "right"]];
  D.INS = {
    shaft: { rooms: [
      { name: "the timbered tunnel", rule: "old props and pod crates", dark: 1, nodes: [["u_crate", 3], ["d_copper", 2], ["d_coal", 2]] },
      { name: "the cart hall", rule: "the crew's strongbox is still here", dark: 1, grump: 0.3, chest: "shaft", nodes: [["d_iron", 3], ["u_crate", 2], ["d_gem", 1]] }] },
    tomb: { rooms: [
      { name: "the jar room", rule: "three stones to push, in the carved order", dark: 1, nodes: [["u_jar", 4], ["d_bones", 1]],
        puz: { type: "seq", syms: SUN, len: 3, verb: "push the %s stone", lead: "carved over the door: " },
        act: { label: "pull at the vines on the far wall", go: function (game, c) { return ok("🌿 the vines pull away: a hidden nook! " + gives(game, c, [["relic", 1], ["keyshard", 1]])); } } },
      { name: "the guardian's hall", rule: "it has stood here a very long time", dark: 1, guard: "the old guardian", curse: 1, nodes: [["u_jar", 2], ["d_gem", 2]] },
      { name: "the quiet room", rule: "a crack of daylight: the way out is easy", dark: 1, chest: "tomb", nodes: [["d_bones", 2], ["u_jar", 2]] }] },
    pyramid: { rooms: [
      { name: "the tilted corridor", rule: "the floor bites: step in the right order", dark: 1, nodes: [["u_jar", 3], ["d_gem", 1]],
        puz: { type: "seq", syms: FEET, len: 4, trap: 0.06, verb: "step %s", lead: "the marks on your key match the floor: ", hintNeed: "key", blind: "the floor marks are worn smooth. a key shard carries the same marks" } },
      { name: "the sand-filled hold", rule: "cold air, after all this time", dark: 1, chest: "pyramid", nodes: [["u_crate", 2], ["d_bones", 2]] }] },
    temple: { gate: function (game, c, d) { if (d.cut) return ""; if (hasAxe(c)) { d.cut = day(game); return ""; } return "choked with vines. bring an axe and cut your way in"; }, rooms: [
      { name: "the vine court", rule: "three levers, in the carved order", nodes: [["d_moss", 2], ["u_jar", 3]], puz: { type: "seq", syms: LEV, len: 3, verb: "pull the %s lever", lead: "carved on the lintel: " } },
      { name: "the dart walk", rule: "watch your feet. the last door has a keyhole", dark: 1, slip: 1, grump: 0.4, nodes: [["d_gem", 2], ["u_jar", 2]], puz: { type: "need", items: ["arkkey"], label: "turn the captain's key", why: "sealed. only a captain's key opens it" } },
      { name: "the sealed heart", rule: "nobody has stood here since the ark fell", dark: 1, chest: "temple", nodes: [["d_gem", 2], ["u_crystal", 1]] }] },
    hall: { rooms: [
      { name: "the long table", rule: "grumps, and everything they took", grump: 1, nodes: [["u_crate", 3], ["u_jar", 2]] },
      { name: "the pantry", rule: "the tribe's own food is in here. creep", dark: 1, grump: 0.3, nodes: [["u_crate", 4]],
        act: { label: "take the tribe's food back", go: function (game, c, d, cave) {
          var quiet = !!(SB.Fight && SB.Fight.sneaking && SB.Fight.sneaking(c));
          if (!quiet) D.spawnGrump(game, c, 2, cave, false);
          return ok((quiet ? "🤫 quiet as a moth: " : "👹 they heard you! you grab what you can: ") + gives(game, c, [["cooked", quiet ? 4 : 2], ["berry", quiet ? 4 : 1]]) + (quiet ? "" : ". (crouch next time)"));
        } } },
      { name: "the chief's loft", rule: "the hall chief sits on the hoard", dark: 1, guard: "the hall chief", chest: "hall", nodes: [["u_crate", 2]] }] },
    fort: { rooms: [
      { name: "the cinder yard", rule: "hot, and guarded", hot: 1, grump: 1, nodes: [["u_brim", 3], ["d_coal", 2]] },
      { name: "the keep", rule: "the warden holds the stair", dark: 1, hot: 1, guard: "the fort's warden", nodes: [["u_brim", 2], ["u_crate", 2]] },
      { name: "the strongroom", rule: "everything the fort was guarding", dark: 1, chest: "fort", nodes: [["u_crate", 2], ["d_silver", 1]] }] },
    city: { rooms: [
      { name: "the silent street", rule: "something follows. it only moves when you look away", dark: 1, stalk: 1, nodes: [["u_jar", 3], ["u_crate", 2]] },
      { name: "the dry fountain", rule: "a door with an empty socket", dark: 1, stalk: 1, nodes: [["d_silver", 2], ["d_gem", 2]], puz: { type: "need", items: ["crystal", "stormglass", "powercell"], label: "set it in the socket", why: "the door has an empty socket. it wants a crystal, storm glass or a power cell" } },
      { name: "the long stair", rule: "down, and down", dark: 1, stalk: 1, nodes: [["d_star", 1], ["u_jar", 3]] },
      { name: "the deep vault", rule: "the best of what the old ones kept", dark: 1, chest: "city", nodes: [["d_star", 2]] }] },
    hull: { gate: function (game) { return !BO() || !BO().state || (bossEntry(game, "gloom") || {}).beaten ? "" : "sealed by Gloom's dark. beat the first captain and it opens"; }, rooms: [
      { name: "the winter hold", rule: "frost on everything. a rack of power cells", cold: 1, nodes: [["u_crate", 3], ["u_cell", 2]], puz: { type: "seq", syms: KNOCK, len: 4, verb: "knock %s", lead: "the hatch ticks: " } },
      { name: "the spring hold", rule: "moss has taken it. the lift is dead", nodes: [["d_moss", 3], ["u_cap", 2]], puz: { type: "need", items: ["powercell", "stormglass", "crystal"], label: "wake the lift", why: "the lift is dead. it wants a power cell, storm glass or a crystal" } },
      { name: "the summer hold", rule: "the engines are still warm. the hatch is stuck", hot: 1, grump: 0.4, nodes: [["u_crate", 2], ["u_crystal", 2]], puz: { type: "prise" } },
      { name: "the autumn hold", rule: "crates of what they meant to plant", nodes: [["u_crate", 3], ["u_jar", 2]] },
      { name: "the memory hall", rule: "the walls remember", chest: "hull", nodes: [["u_crystal", 2]], puz: { type: "when", ok: function (game) { return captains(game) >= 3; }, why: "an inner door, sealed by all three captains" },
        act: { label: "read the memory wall", go: function (game, c) {
          if (SB.Body && SB.Body.xp) SB.Body.SKILLS.forEach(function (sk) { SB.Body.xp(c, sk.id, 3); });
          var rub = has(c, "reader"); if (rub) give(game, c, "rubbing", 1);
          return ok("🧠 the wall remembers: four thousand smols asleep, and a lantern keeping watch. you feel a little cleverer at everything" + (rub ? ". your reader takes a rubbing of it" : ""));
        } } },
      { name: "the last locker", rule: "what the ark kept for the very end. the dark kept it too", dark: 1, grump: 0.7, tough: 1.5, chest: "hull2", nodes: [["u_crate", 2], ["u_crystal", 2]] }] },
    sunk: { word: "dive", rooms: [
      { name: "the shallows", rule: "under water: watch your breath", flood: 1, nodes: [["u_shell", 4]] },
      { name: "the sunk pod", rule: "deeper. crates, still shut", flood: 1, nodes: [["u_crate", 2], ["u_shell", 2]] },
      { name: "the dark hold", rule: "the pod's own locker", flood: 1, chest: "sunk", nodes: [["u_shell", 1]] }] },
    hollow: { rooms: [
      { name: "inside the giant", rule: "warm, dim and humming with bees", nodes: [["u_hive", 3], ["u_cap", 2]] },
      { name: "the root cellar", rule: "something big lives down among the roots", dark: 1, guard: "the root grump", chest: "hollow", nodes: [["u_hive", 1], ["d_gem", 2]] }] },
    web: { rooms: [
      { name: "the web grove", rule: "sticky going", grump: 0.4, nodes: [["u_web", 5]] },
      { name: "the cocoon", rule: "somebody is wrapped up in there", nodes: [["u_web", 3]],
        act: { label: "cut the stranger free", go: function (game, c) { sparks(game, 3, c); return ok("🧶 a wandering smol tumbles out, hugs your leg and trots off toward the village. it pressed these into your paw: " + gives(game, c, [["mapscrap", 1], ["keyshard", 1]]) + " · +3 ✨"); } } }] },
    sink: { gate: function (game, c, d) { return d.sealed ? "sealed with stones. nothing comes up here any more" : ""; }, rooms: [
      { name: "the undercave", rule: "they nest down here", dark: 1, grump: 1, nodes: [["d_iron", 2], ["d_coal", 2]] },
      { name: "the nest of the dark", rule: "chase off the pit boss, then seal it", dark: 1, guard: "the pit boss", nodes: [["d_silver", 2]],
        act: { label: "seal the pit (4 stones)", go: function (game, c, d) {
          if (!d.keeper) return fail("the pit boss is still here");
          if (Sv().count(c, "stone", true) < 4) return fail("you need 4 stones to wedge it shut");
          Sv().take(c, "stone", 4); d.sealed = day(game); sparks(game, 5, c);
          return ok("🪨 wedged shut. no more grumps from under here · +5 ✨. climb out");
        } } }] },
    sewer: { gate: function (game) { return ((game.stats && game.stats.maxTier) || 0) >= 4 ? "" : "the grate is shut. it opens when the tribe are builders"; }, rooms: [
      { name: "the drain", rule: "everything the village lost ends up here", dark: 1, nodes: [["u_crate", 2], ["u_jar", 2], ["u_pool", 1]] },
      { name: "the old cistern", rule: "older than the village", dark: 1, grump: 0.3, chest: "sewer", nodes: [["u_pool", 2], ["d_gem", 1]] }] },
    crack: { gate: function (game, c) { return c.tier <= 1 ? "" : "too narrow for a big smol. a blob or a critter could squeeze in"; }, rooms: [{ name: "the snug hollow", rule: "somebody small hid things here", chest: "crack", nodes: [["u_cap", 2]] }] },
    pale: { rooms: [{ name: "among the pale trees", rule: "it only moves when you look away", stalk: 1, chest: "pale", nodes: [["d_bones", 2], ["u_cap", 2]] }] },
    notes: { rooms: [{ name: "the ring of note stones", rule: "play the tune", puz: { type: "seq", syms: NOTE, len: 4, verb: "strike the %s stone", lead: "the tune on the journal scrap: ", hintNeed: "tune", blind: "you do not know the tune. a journal scrap has it", prize: [["pearl", 2], ["mote", 1]] } }] }
  };
  function insKind(game, pid) {
    var p = D.poi(game, pid);
    if (p) return D.INS[p.kind] ? { x: p.x, z: p.z, ik: p.kind } : null;
    var l = game.world.structures;
    for (var i = 0; i < l.length; i++) if (l[i].data && l[i].data.dyn && "dyn" + l[i].id === pid && D.INS[l[i].kind.slice(4)]) return { x: l[i].x, z: l[i].z, ik: l[i].kind.slice(4) };
    return null;
  }
  // the way in to a place with rooms, as a thing the delve code can stand at
  D.anchor = function (game, pid) { var k = insKind(game, pid); return k ? { id: "in:" + pid, x: k.x, z: k.z, kind: "inside", ik: k.ik, pid: pid } : null; };
  function zoneAt(game, cave, depth) {
    if (!cave || !(depth > 0)) return null;
    if (cave.kind === "inside") return D.INS[cave.ik].rooms[depth - 1] || null;
    if (depth <= D.MAX) return D.ZONES[depth];
    return underZone(game, cave, depth);
  }
  function maxOf(game, cave) { return cave.kind === "inside" ? D.INS[cave.ik].rooms.length : D.underOpen(game) ? D.UNDER_MAX : D.MAX; }
  D.zoneAt = zoneAt; D.maxOf = maxOf;
  D.gateWhy = function (game, c, cave) { var def = cave.kind === "inside" ? D.INS[cave.ik] : null; return def && def.gate ? def.gate(game, c, D.delve(game, cave), cave) : ""; };

  /* ---- puzzles ---- */
  D.puzzle = function (game, cave) {
    var d = D.delve(game, cave), z = zoneAt(game, cave, d.depth || 0);
    if (!z || !z.puz) return null;
    if (!d.puz || typeof d.puz !== "object") d.puz = {};
    if (!d.puz[d.depth] && z.puz.type === "when" && z.puz.ok(game)) d.puz[d.depth] = day(game);
    return d.puz[d.depth] ? null : z.puz;
  };
  D.puzAnswer = function (game, cave, depth) {
    var z = zoneAt(game, cave, depth), pz = z && z.puz, out = [];
    if (!pz || pz.type !== "seq") return out;
    var r = dice(game, "puz:" + cave.id + ":" + depth);
    for (var i = 0; i < pz.len; i++) out.push(Math.floor(r() * pz.syms.length));
    return out;
  };
  D.puzHint = function (game, c, cave) {
    var pz = D.puzzle(game, cave), d = D.delve(game, cave);
    if (!pz) return "";
    if (pz.type === "need" || pz.type === "when") return pz.why;
    if (pz.type === "prise") return "the hatch is stuck. lean on the bar, count two slow breaths, then heave";
    var can = !pz.hintNeed || (pz.hintNeed === "key" ? has(c, "keyshard") || has(c, "arkkey") : pz.hintNeed === "tune" ? !!st(game).tune : has(c, pz.hintNeed));
    if (!can) return pz.blind;
    return pz.lead + D.puzAnswer(game, cave, d.depth).map(function (i) { return pz.syms[i][0] + " " + pz.syms[i][1]; }).join(", ");
  };
  function solved(game, c, cave, d, pz) {
    d.puz[d.depth] = day(game); d.pz = null;
    var got = pz.prize ? gives(game, c, pz.prize) : "";
    sparks(game, 1, c); count(game, "puzzles");
    SB.bus.emit("deepPuzzle", { c: c, cave: cave, depth: d.depth, type: pz.type });
    return ok("✔ " + (pz.prize ? "the stones ring together, and something rolls out: " + got : "it grinds open. the way on is clear") + " · +1 ✨", { solved: true });
  }
  D.puzPress = function (game, c, cave, i) {
    var d = D.delve(game, cave), pz = D.puzzle(game, cave);
    if (!pz) return fail("nothing to solve here");
    if (pz.type === "when") return fail(pz.why);
    if (pz.type === "need") {
      var k = pz.items.filter(function (x) { return has(c, x); })[0];
      if (!k) return fail(pz.why);
      Sv().take(c, k, 1);
      return solved(game, c, cave, d, pz);
    }
    if (pz.type === "prise") {
      if (!d.pz || d.pz.room !== d.depth || !d.pz.t) { d.pz = { room: d.depth, t: D.now() }; return ok("😤 you lean on the bar. it creaks... two slow breaths, then heave"); }
      var dt = D.now() - d.pz.t; d.pz = null;
      if (dt < 1.2) return fail("too soon: the bar springs back. lean on it again, and wait two breaths");
      if (dt > 3.2) return fail("too slow: it settled back. lean on it again");
      return solved(game, c, cave, d, pz);
    }
    var ans = D.puzAnswer(game, cave, d.depth), got = d.pz && d.pz.room === d.depth && d.pz.got ? d.pz.got : [];
    if (ans[got.length] !== i) {
      d.pz = { room: d.depth, got: [] };
      if (pz.trap) { c.chem.health = Math.max(0.25, c.chem.health - pz.trap); c.chem.pain = Math.min(1, (c.chem.pain || 0) + 0.1); }
      return fail("✖ " + (pz.trap ? "snap! the floor nips you. " : "") + "wrong: it all slides back. start again");
    }
    got = got.concat([i]); d.pz = { room: d.depth, got: got };
    if (got.length < ans.length) return ok("✔ " + got.length + " of " + ans.length);
    return solved(game, c, cave, d, pz);
  };
  D.roomAct = function (game, c, cave) {
    var d = D.delve(game, cave), z = zoneAt(game, cave, d.depth || 0);
    if (!z || !z.act) return fail("nothing to do here");
    if (!d.acts || typeof d.acts !== "object") d.acts = {};
    if (d.acts[d.depth]) return fail("already done");
    var r = z.act.go(game, c, d, cave);
    if (r && r.ok) { d.acts[d.depth] = day(game); SB.bus.emit("deepRoomAct", { c: c, cave: cave, depth: d.depth }); }
    return r;
  };

  /* ---- the under-dark: past level 6, once the three captains have fallen ---- */
  D.UNDER_MAX = 60;
  D.underOpen = function (game) { return !!BO() && captains(game) >= 3; };
  D.THEMES = [
    { id: "drip", name: "the dripstone hall", rule: "spikes above and below: a slip hurts", slip: 1, nodes: [["d_rock", 2], ["d_iron", 3], ["d_silver", 2], ["u_pool", 1]] },
    { id: "sulfur", name: "the sulfur cave", rule: "gas pools: they take your wind", gas: 1, nodes: [["u_brim", 4], ["d_coal", 3], ["d_gem", 1]] },
    { id: "sand", name: "the sandstone hollow", rule: "old bones in soft rock, and tougher grumps", tough: 1.4, nodes: [["d_bones", 3], ["d_gem", 3], ["u_jar", 2]] },
    { id: "flood", name: "the flooded room", rule: "under water: watch your breath", flood: 1, nodes: [["u_shell", 3], ["d_silver", 3], ["u_crate", 1]] },
    { id: "lava", name: "the lava cave", rule: "it is never the same twice, and it burns", hot: 1, burn: 1, nodes: [["d_star", 2], ["u_brim", 3], ["d_silver", 2]] },
    { id: "fungal", name: "the glowshroom cavern", rule: "a forest of glowing caps lights it", lit: 1, nodes: [["u_cap", 4], ["d_moss", 3], ["u_pool", 1], ["d_gem", 1]] },
    { id: "geode", name: "the crystal geode", rule: "a hollow lined with crystal. it lights itself", lit: 1, nodes: [["u_crystal", 4], ["d_gem", 3]] },
    { id: "nest", name: "the buried nest", rule: "a giant's nest, turned to stone", nodes: [["d_bones", 4], ["u_jar", 1], ["d_gem", 2]] },
    { id: "dig", name: "the deep diggings", rule: "the ark crew got this far: props and pod crates", nodes: [["u_crate", 4], ["d_iron", 2], ["d_star", 1]] }
  ];
  var underCache = {};
  function underZone(game, cave, depth) {
    var per = Math.floor((day(game) - 1) / D.RESTOCK), key = (game.seed >>> 0) + ":" + cave.id + ":" + depth + ":" + per, z = underCache[key];
    if (z) return z;
    var r = dice(game, "under:" + cave.id + ":" + depth + ":" + per), t = D.THEMES[Math.floor(r() * D.THEMES.length)];
    z = { name: t.name, rule: t.rule, dark: t.lit ? 0 : 1, grump: 0.5, nodes: t.nodes, theme: t.id, slip: t.slip, gas: t.gas, flood: t.flood, hot: t.hot, burn: t.burn, tough: t.tough, under: 1, chest: depth % 5 === 0 ? "under" : null, shaft: r() < 0.25 };
    underCache[key] = z;
    return z;
  }

  /* ---- breath: flooded rooms and dives ---- */
  var breath = 0;
  D.BREATH = 20;
  D.breathMax = function (c) { return D.BREATH * (has(c, "snorkel") ? 1.5 : 1) * (c.look && c.look.fins && !(raft && raft.c === c) ? 1.5 : 1) * (perk(c, "lungs") ? 1.5 : 1); };
  D.breath = function () { return breath; };
  var gloomT = 0, ashT = 0, dryWet = 0, slipT = 0;
  function delveTick2(game, c, S, dt, z) {
    var g = grump(game);
    if (g && g.stalker && g.scout) {
      var f = fwd(c), dx = g.x - c.x, dz = g.z - c.z, dd = Math.sqrt(dx * dx + dz * dz) || 1;
      g.scout.speedK = (f.x * dx + f.z * dz) / dd > 0.55 ? 0.01 : 1.3; // watched, it stands still
    }
    if (z && z.flood) {
      breath -= dt;
      if (breath <= 0) { c.chem.health = Math.max(0.2, c.chem.health - 0.15); D.leave(game, "air"); say("🫧 out of breath! you burst up, coughing"); SB.bus.emit("deepGasp", { c: c }); }
    }
  }
  function skyGrump(game, dt) { var g = grump(game); if (g && (grumpT += dt) > 45) endGrump(game); }

  /* ---------------- the gloom ---------------- */
  D.GLOOM0 = 10; D.GLOOM_MAX = 34;
  D.FLAVOUR = { gloom: ["the hush", "fear"], murk: ["the chill", "cold"], night: ["the weight", "tired"] };
  D.stain = function (game) { var s = st(game), L = BO() && BO().LIST; if (!L || !L.length) return null; if (!s.stain || !BO().BY[s.stain]) s.stain = L[Math.floor(dice(game, "stain")() * L.length)].id; return s.stain; };
  D.canStain = function (game) { return !!(BO() && BO().LIST) && day(game) <= 3 && !st(game).stainSet; };
  D.setStain = function (game, id) { if (!D.canStain(game) || !BO().BY[id]) return fail("the island's dark is settled now"); var s = st(game); s.stain = id; s.stainSet = 1; return ok("🌑 " + BO().BY[id].name + "'s dark is the strong one on this island: " + D.FLAVOUR[id][0] + ". it spreads twice as fast"); };
  D.patches = function (game) {
    var s = st(game), out = [], BB = BO();
    if (!s.gloom || typeof s.gloom !== "object") s.gloom = {};
    if (BB && BB.LIST && BB.state) BB.LIST.forEach(function (d) {
      var e = BB.state(game).list[d.id], key = "lair:" + d.id;
      if (!e || e.beaten) return;
      if (s.gloom[key] == null) s.gloom[key] = D.GLOOM0;
      if (s.gloom[key] > 0.5) out.push({ key: key, x: e.x, z: e.z, r: s.gloom[key], boss: d.id, name: d.name + "'s dark", kind: D.FLAVOUR[d.id] || D.FLAVOUR.gloom });
    });
    (game.sites || []).forEach(function (o) {
      if (o.kind !== "camp" || o.done || o.gone) return;
      var key = "camp:" + o.id; if (s.gloom[key] == null) s.gloom[key] = 7;
      if (s.gloom[key] > 0.5) out.push({ key: key, x: o.x, z: o.z, r: s.gloom[key], name: "a grump camp's dark", kind: D.FLAVOUR.gloom, fixed: 1 });
    });
    (s.scars || []).forEach(function (o, i) { if (o.r > 0.5) out.push({ key: "scar:" + i, x: o.x, z: o.z, r: o.r, name: "a scar of the second dark", kind: D.FLAVOUR.night, scar: o, fixed: 1 }); });
    return out;
  };
  D.gloomAt = function (game, x, z) { var l = D.patches(game); for (var i = 0; i < l.length; i++) if (SB.dist(l[i].x, l[i].z, x, z) < l[i].r) return l[i]; return null; };
  function setGloom(game, p, r) { var s = st(game); r = Math.max(0, Math.min(D.GLOOM_MAX, r)); if (p.scar) p.scar.r = r; else s.gloom[p.key] = r; p.r = r; }
  // a new day: the dark round a live lair creeps out, unless fires and glowcaps hold it
  D.gloomDay = function (game) {
    var s = st(game), w = game.world, stain = D.stain(game), none = captains(game) === 0;
    if (!s.caps || typeof s.caps !== "object") s.caps = {};
    D.patches(game).forEach(function (p) {
      var grow = p.fixed ? 0 : (none ? 1.5 : 0.75) * (p.boss === stain ? 2 : 1);
      var fires = W().structsNear(w, p.x, p.z, p.r + 3, function (b) { return b.done && b.data && b.data.lit; }).length;
      grow -= Math.min(3, fires) + (s.caps[p.key] || 0) * 0.5;
      if (grow) setGloom(game, p, p.r + grow);
    });
  };
  D.pushGloom = function (game, c, with_) {
    var p = D.gloomAt(game, c.x, c.z), s = st(game);
    if (!p) return fail("there is no gloom here to push back");
    if (!has(c, with_) || (with_ !== "torch" && with_ !== "glowcap")) return fail("you need a torch or a glowcap in your paw");
    Sv().take(c, with_, 1);
    var by = with_ === "torch" ? (wk(game) === "fireday" ? 4 : 2) : 1;
    if (with_ === "glowcap") { if (!s.caps || typeof s.caps !== "object") s.caps = {}; s.caps[p.key] = (s.caps[p.key] || 0) + 1; }
    setGloom(game, p, p.r - by); count(game, "pushed");
    SB.bus.emit("gloomPushed", { c: c, key: p.key, r: p.r });
    if (p.r <= 0.5) { sparks(game, 3, c); return ok("✨ the last of " + p.name + " blows away like smoke · +3 ✨" + (p.boss ? ". it will creep back while its captain lives" : ""), { gone: true }); }
    return ok(with_ === "torch" ? "🔥 you plant the torch. the gloom draws back " + by + " steps (" + Math.round(p.r) + " left)" : "🍄 you plant the glowcap. the gloom thins, and will keep thinning a little every day (" + Math.round(p.r) + " steps left)");
  };
  D.onBossBeaten = function (game, d) {
    var s = st(game), id = d && d.boss && d.boss.id; if (!id) return;
    if (!s.gloom) s.gloom = {};
    s.gloom["lair:" + id] = 0;
    var x = d.x, z = d.z;
    if (d.c && d.c.alive) give(game, d.c, "arkkey", 1); else if (Sv() && Sv().spawn) Sv().spawn(game, "arkkey", 1, x + 0.5, z + 0.5, {});
    if (!game.world.structures.some(function (b) { return b.kind === "poi_altar" && b.data && b.data.boss === id; })) { var sp = sideSpot(game, x, z, "altar:" + id); put(game, "poi_altar", sp.x, sp.z, { dyn: 1, boss: id }, 0); }
    if (captains(game) >= 3) say("🕳 the caves go deeper now: past level " + D.MAX + ", the under-dark");
  };
  // the second act: the spire is up, and the dark answers with two scars
  D.act2 = function (game) {
    var s = st(game), T = game.world.T, sp = T.nest || T.spawn, r = dice(game, "scars");
    if (s.act2) return false;
    s.act2 = day(game); s.scars = [];
    for (var i = 0; i < 2; i++) { var at = drySpot(game, r, sp.x, sp.z, 30, T.N * 0.4); if (at) s.scars.push({ x: at.x, z: at.z, r: 12 }); }
    SB.bus.emit("deepAct2", { scars: s.scars.length });
    return true;
  };

  /* ---------------- ground, air and water, in a body ---------------- */
  D.windy = function (game) { var wx = st(game).wx; return !!(wx.wind && wx.wind > game.time); };
  D.aurora = function (game) { var wx = st(game).wx; return !!(wx.aurora && wx.aurora > game.time); };
  D.frozen = function (game, x, z) { var w = game.world; return w.season === 3 && !sea(W().biomeAt(w, x, z)); };
  D.snowy = function (game, x, z) { var w = game.world, b = W().biomeAt(w, x, z); return b === bid("tundra") || (w.season === 3 && !sea(b) && b !== bid("desert") && b !== bid("ash")); };
  D.onRoad = function (game, x, z) {
    var T = game.world.T, sp = T.nest || T.spawn, dx = x - sp.x, dz = z - sp.z;
    if (dx * dx + dz * dz < 36) return false;
    var cch = game._deepRoads; if (!cch || cch.w !== game.world) { var r = dice(game, "roads"); cch = game._deepRoads = { w: game.world, a: [r() * 3.1416, r() * 3.1416] }; }
    for (var i = 0; i < 2; i++) if (Math.abs(dx * Math.cos(cch.a[i]) - dz * Math.sin(cch.a[i])) < 1.4) return true;
    return false;
  };
  D.high = function (game, x, z) {
    var w = game.world, T = w.T, cch = game._deepH;
    if (!cch || cch.w !== w) { var m = 0; for (var j = 4; j < T.N - 4; j += 4) for (var i = 4; i < T.N - 4; i += 4) m = Math.max(m, WG().heightAt(T, i, j)); cch = game._deepH = { w: w, max: m }; }
    return cch.max > 0 && WG().heightAt(T, x, z) > cch.max * 0.8;
  };
  D.LOTS = { warm: ["a warm hollow", "the cold lets go of you here"], restful: ["restful ground", "standing still, your pep comes back faster"], eerie: ["eerie ground", "at night it sets your fur on end"], lucky: ["lucky water", "a pan never comes up empty here"] };
  D.lot = function (game, x, z) {
    var h = (Math.imul((x / 20) | 0, 83492791) ^ Math.imul((z / 20) | 0, 2971215073) ^ (game.seed >>> 0) ^ 0x10751) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; h ^= h >>> 13;
    var v = (h >>> 0) % 10;
    return v === 0 ? "warm" : v === 1 ? "restful" : v === 2 ? "eerie" : v === 3 ? "lucky" : "";
  };
  D.shimmer = function (game, x, z) { var s = st(game), pn = s.pan; return cellRand(game, x, z, 37) < 0.14 && !(pn && pn.d === day(game) && pn.c[((x / 3) | 0) + ":" + ((z / 3) | 0)]); };
  function haz2(game, S, c, step, b, depth) {
    var w = game.world, ch = c.chem, Bd = SB.Body, lit = D.hasLight(c), down = D.depth(game) > 0;
    var gp = down ? null : D.gloomAt(game, c.x, c.z);
    haz.gloom = gp ? gp.name : "";
    if (gp) {
      var kk = gp.kind[1]; ch[kk] = Math.min(0.75, Math.max(ch[kk] || 0, Math.min(0.75, (ch[kk] || 0) + (lit ? 0.008 : 0.02) * step)));
      once(game, "gloom", "🌫 " + gp.name + ": " + gp.kind[0] + ". hold a torch or a glowcap and plant it to push the dark back", 120);
      if (w.night && !lit) { if ((gloomT += step) > 20 && !grump(game)) { D.spawnGrump(game, c, 2, null, false, "a grump of " + gp.kind[0]); gloomT = -40; } } else gloomT = 0;
    } else gloomT = 0;
    haz.thin = !down && D.high(game, c.x, c.z);
    if (haz.thin) { if (c._povMove) S.stam = Math.max(0, (S.stam || 0) - 0.012 * step); once(game, "thin", "😮‍💨 thin air up here: moving takes your wind", 120); }
    if (b === bid("ash") && !down) {
      ashT += step;
      if (c.sip > 0 && !w.night && Math.floor(ashT / 20) !== Math.floor((ashT - step) / 20)) { c.sip--; once(game, "boil", "♨️ the water you carry is boiling off in this heat", 90); }
    } else ashT = Math.max(0, ashT - step * 2);
    haz.ash = ashT > 60;
    if (haz.ash) { ch.health = Math.max(0.5, ch.health - 0.004 * step); once(game, "ash", "😷 the ash is getting in your chest. do not stay in the ashlands too long", 120); }
    var wx = w.weather, dryB = b === bid("desert") || b === bid("mesa") || b === bid("ash");
    if (Bd) { var bb = Bd.of(c); if (dryB && wx && wx.rain > 0.2 && depth < 0.05) { if (bb.wet > dryWet) bb.wet = dryWet; haz.dry = true; } else { dryWet = bb.wet; haz.dry = false; } }
    if (haz.drift) ch.cold = Math.min(1, (ch.cold || 0) + (Bd && Bd.cloaked && Bd.cloaked(c) ? 0.006 : 0.02) * step);
    haz.lava = !down && W().structsNear(w, c.x, c.z, 1.9, function (o) { return o.kind === "poi_lava"; }).length > 0;
    if (haz.lava) { ch.health = Math.max(0.2, ch.health - 0.06 * step); ch.pain = Math.min(1, (ch.pain || 0) + 0.1); once(game, "lava", "🔥 lava! it burns. step back"); }
    haz.curse = !!(c.dp && c.dp.curse);
    if (haz.curse && S.stam > 0.6) S.stam = 0.6;
    haz.aurora = D.aurora(game) && w.night && !down;
    if (haz.aurora) ch.fear = Math.max(0, (ch.fear || 0) - 0.05 * step);
    haz.shimmer = depth > 0.05 && depth < 0.7 && !sea(b) && D.shimmer(game, c.x, c.z);
    var lot = down ? "" : D.lot(game, c.x, c.z);
    haz.lot = lot;
    if (lot === "warm") ch.cold = Math.max(0, (ch.cold || 0) - 0.03 * step);
    else if (lot === "restful" && !c._povMove) S.stam = Math.min(1, (S.stam || 0) + 0.02 * step);
    else if (lot === "eerie" && w.night) ch.fear = Math.min(0.4, Math.max(ch.fear || 0, Math.min(0.4, (ch.fear || 0) + 0.01 * step)));
    haz.windy = D.windy(game) && !down;
    haz.charged = !!(c.dp && c.dp.charged > game.time);
    haz.trip = !!(c.dp && c.dp.trip > game.time);
    haz.bones = !!(c.dp && c.dp.bones > game.time);
  }

  /* ---------------- climbing, gliding, sledging, looking far, panning ---------------- */
  function freeDay(game) { return wk(game) === "walkday"; }
  D.climb = function (game, c) {
    var S = PS(), w = game.world, f = fwd(c), s = st(game);
    if (!has(c, "vinerope") && !has(c, "claws")) return fail("you need a vine rope or climbing claws");
    var steep = false, spot = null;
    for (var d = 1; d <= 9 && !spot; d += 0.5) {
      var x = c.x + f.x * d, z = c.z + f.z * d;
      if (!W().inBounds(w, x, z) || W().depthAt(w, x, z) > 0.5) break;
      if (!W().walkable(w, x, z, false)) { steep = true; continue; }
      if (steep) spot = { x: x, z: z };
    }
    if (!spot) return fail(steep ? "too tall here: the rope does not reach the top. try along a bit" : "no cliff ahead. face a slope too steep to walk");
    var cost = freeDay(game) ? 0 : 0.3 * (has(c, "claws") ? 0.5 : 1) * ((s.n.climbs || 0) >= 10 ? 0.5 : 1) * (c.dp && c.dp.trip > game.time ? 0.5 : 1);
    if (S && S.c === c) { if ((S.stam || 0) < cost) return fail("too puffed to climb. catch your breath"); S.stam -= cost; }
    moveTo(game, c, spot.x, spot.z); count(game, "climbs");
    if (SB.Body && SB.Body.xp) SB.Body.xp(c, "run", 2);
    SB.bus.emit("deepClimb", { c: c });
    return ok("🧗 up you go, paw over paw, to the top" + (s.n.climbs === 10 ? ". ten climbs: you are a climber now, and it costs half the pep" : ""));
  };
  D.canGlide = function (c) { return c.tier >= 6 || has(c, "wings"); };
  D.glide = function (game, c) {
    var S = PS(), w = game.world, f = fwd(c), h0 = W().heightAt(w, c.x, c.z), best = null, R = D.windy(game) ? 45 : 30;
    if (!D.canGlide(c)) return fail("only an ascended smol, or one with glide wings, can glide");
    for (var d = 6; d <= R; d += 1) {
      var x = c.x + f.x * d, z = c.z + f.z * d;
      if (!W().inBounds(w, x, z)) break;
      if (W().walkable(w, x, z, false) && W().depthAt(w, x, z) < 0.05 && W().heightAt(w, x, z) < h0 - 0.2) best = { x: x, z: z, d: d };
    }
    if (!best) return fail("you need high ground, with lower land ahead of you");
    if (S && S.c === c && !freeDay(game)) S.stam = Math.max(0, (S.stam || 0) - 0.15);
    moveTo(game, c, best.x, best.z); W().reveal(w, best.x, best.z, 8, true); count(game, "glides");
    SB.bus.emit("deepGlide", { c: c, d: best.d });
    return ok("🪽 you step off and the air holds you: " + Math.round(best.d) + " steps, down to the ground like a leaf");
  };
  D.slide = function (game, c) {
    var w = game.world, f = fwd(c), h = W().heightAt(w, c.x, c.z), at = null, n = 0;
    if (!has(c, "sled")) return fail("you need a bark sled");
    if (!D.snowy(game, c.x, c.z)) return fail("a sled needs snow: the snowfield, or anywhere in winter");
    for (var d = 1; d <= 18; d += 1) {
      var x = c.x + f.x * d, z = c.z + f.z * d, hh = W().inBounds(w, x, z) ? W().heightAt(w, x, z) : 1e9;
      if (hh > h + 0.02 || !W().walkable(w, x, z, false) || W().depthAt(w, x, z) > 0.05) break;
      h = hh; at = { x: x, z: z }; n = d;
    }
    if (n < 4) return fail("not enough slope ahead. face downhill");
    moveTo(game, c, at.x, at.z); count(game, "slides"); c.chem.fear = 0;
    SB.bus.emit("deepSlide", { c: c, d: n });
    return ok("🛷 wheee! " + n + " steps downhill in a blink");
  };
  D.peer = function (game, c) {
    var w = game.world, f = fwd(c), n = 0;
    if (!has(c, "lens")) return fail("you need a crystal lens");
    if (fogged(game)) return fail("too foggy to see far");
    for (var d = 8; d <= 48; d += 8) n += W().reveal(w, c.x + f.x * d, c.z + f.z * d, 6) || 0;
    count(game, "peers");
    return ok(n ? "🔮 through the lens the far land jumps close: the map fills in along where you look" : "🔮 nothing new that way");
  };
  D.scan = function (game, c) {
    var w = game.world, n = W().nearestNode(w, c.x, c.z, 90, function (o) { return o.state !== "gone" && (o.kind === "orevein" || o.kind === "crystals"); });
    if (!has(c, "lens")) return fail("you need a crystal lens to scan with");
    if (!n) return fail("🔮 no ore glints anywhere near");
    if (P() && P().setGoal && PS()) P().setGoal({ x: n.x, z: n.z, label: "⛏ " + (NK[n.kind] ? NK[n.kind].label : "ore"), small: true, deep: 1 });
    return ok("🔮 a glint! " + (NK[n.kind] ? NK[n.kind].label : "ore") + ", " + Math.round(SB.dist(n.x, n.z, c.x, c.z)) + " steps off. follow the ⛏", { node: n });
  };
  D.canPan = function (game, c) { var w = game.world, d = W().depthAt(w, c.x, c.z); return d > 0.05 && d < 0.7 && !sea(W().biomeAt(w, c.x, c.z)); };
  D.pan = function (game, c) {
    var s = st(game), S = PS(), today = day(game), key = ((c.x / 3) | 0) + ":" + ((c.z / 3) | 0);
    if (!has(c, "pot")) return fail("you need a pot to pan with");
    if (!D.canPan(game, c)) return fail("stand in the shallows of a river or a pond");
    if (!s.pan || s.pan.d !== today) s.pan = { d: today, c: {} };
    if (s.pan.c[key]) return fail("this bit of gravel is panned out for today. move along");
    var shim = D.shimmer(game, c.x, c.z), r = dice(game, "pan:" + key + ":" + today), roll = r(), got;
    if (S && S.c === c) { if ((S.stam || 0) < 0.06) return fail("too puffed. catch your breath"); S.stam -= 0.06; }
    s.pan.c[key] = 1; count(game, "pans");
    if (shim) got = roll < 0.3 ? "geode" : roll < 0.5 ? "silverore" : roll < 0.7 ? "crystal" : roll < 0.85 ? "opal" : "amber";
    else got = roll < 0.4 ? (D.lot(game, c.x, c.z) === "lucky" ? "flint" : null) : roll < 0.65 ? "flint" : roll < 0.85 ? "ore" : roll < 0.95 ? "clay" : "geode";
    if (got && !K[got]) got = "flint";
    if (got) { give(game, c, got, 1); noteFind(game, W().biomeAt(game.world, c.x, c.z), got); }
    SB.bus.emit("deepPan", { c: c, kind: got, shimmer: shim });
    return ok(got ? (shim ? "✨ the shimmer was real: a " : "🥘 swirl, swirl... a ") + label(got) + " in the pot" : "🥘 swirl, swirl... only gravel. try another bit, or look for a shimmer");
  };

  /* ---------------- things you hold and use ---------------- */
  D.PERKS = { lungs: "your breath lasts half again as long under water", feet: "mud and snow drifts do not slow you", eyes: "you spot hidden places from twice as far", back: "going down a level takes no time", nose: "soft earth always gives up an old bone too" };
  D.readTablet = function (game, c) {
    if (!has(c, "tablet")) return fail("no ark tablet to read");
    var p = dp(c).perks, ids = Object.keys(D.PERKS).filter(function (k) { return !p[k]; });
    Sv().take(c, "tablet", 1);
    if (!ids.length) { sparks(game, 3, c); return ok("📜 you know all this already. the tablet crumbles into light · +3 ✨"); }
    var id = ids[Math.floor(dice(game, "tablet:" + c.id + ":" + ids.length)() * ids.length)];
    p[id] = day(game); SB.bus.emit("deepPerk", { c: c, id: id });
    return ok("📜 the words sink in, and stay: " + D.PERKS[id] + ". (" + c.name + " keeps this for good)", { perk: id });
  };
  D.STAR_MAX = 3;
  D.eatStar = function (game, c) {
    if (!has(c, "skyseed")) return fail("no star seed");
    var d = dp(c); if ((d.star || 0) >= D.STAR_MAX) return fail("🌟 " + c.name + " has swallowed all the star a smol can hold");
    Sv().take(c, "skyseed", 1); d.star = (d.star || 0) + 1;
    if (!c.body) c.body = {}; c.body.hp = (c.body.hp || 0) + 1; c.chem.health = 1;
    SB.bus.emit("deepStar", { c: c, n: d.star });
    return ok("🌟 warm all the way down. " + c.name + "'s heart is bigger, for good (" + d.star + " of " + D.STAR_MAX + " star seeds)");
  };
  D.joinRelics = function (game, c) {
    if (Sv().count(c, "relic", true) < 3) return fail("three relic pieces fit together");
    Sv().take(c, "relic", 3);
    var n = count(game, "relics"), r = dice(game, "relic:" + n), roll = r();
    if (roll < 0.25) { dp(c).curse = 1; give(game, c, "geode", 2); SB.bus.emit("deepRelic", { c: c, curse: true }); return ok("🏺 the pieces snap together, and a cold breath comes out: a curse! (pep stays low until a shrine or a hot spring lifts it.) two geodes fell out as well", { curse: true }); }
    var prize = roll < 0.5 ? "tablet" : roll < 0.75 ? "skyseed" : "heartfruit"; if (!K[prize]) prize = "tablet";
    give(game, c, prize, 1); sparks(game, 2, c);
    SB.bus.emit("deepRelic", { c: c, curse: false, prize: prize });
    return ok("🏺 the pieces fit, and the whole thing opens like a flower: a " + label(prize) + " · +2 ✨", { prize: prize });
  };
  D.readScrap = function (game, c) {
    var s = st(game), w = game.world;
    if (!has(c, "scrap")) return fail("no journal scrap to read");
    Sv().take(c, "scrap", 1);
    var n = count(game, "scraps"), r = dice(game, "scrap:" + n);
    if (SB.Body && SB.Body.xp) SB.Body.xp(c, "forage", 2);
    if (!s.tune && (n % 3 === 1 || r() < 0.3)) { s.tune = day(game); return ok("📄 “three stones that ring. i wrote the tune down so i would not forget it.” the note stones' tune is in your head now", { tune: true }); }
    var spot = drySpot(game, r, c.x, c.z, 24, 60);
    if (spot && r() < 0.7) {
      var m = { id: count(game, "maps"), x: spot.x, z: spot.z, done: 0, fig: 1 };
      s.maps.push(m);
      if (P() && P().setGoal && PS()) P().setGoal({ x: m.x, z: m.z, label: "✖ the scrap's X", small: true, deep: 1 });
      return ok("📄 “i buried the little pilot " + Math.round(SB.dist(c.x, c.z, m.x, m.z)) + " steps off, in the " + biomeName(W().biomeAt(w, m.x, m.z)) + ", where grumps would not look.” follow the ✖ and dig", { map: m });
    }
    var hint = D.seek(game, c, true);
    return ok("📄 “" + D.LORE[n % D.LORE.length] + "”" + (hint ? " on the back, an arrow: " + hint.what + ", about " + Math.round(hint.d) + " steps off" : ""));
  };
  D.LORE = ["we counted the pods as they fell. nine. remember that: nine.", "the grumps do not hate us. they are cold, and we are warm. that is all it is.", "if the little ones grow clever again, tell them the lantern never left.", "the crew dug for metal the first winter. the deep places were here before us.", "the three captains were ours once. the dark got into them on the way down."];
  D.study = function (game, c) {
    var I = SB.Ideas;
    if (!has(c, "rubbing")) return fail("no rubbing to study");
    if (!c.ideas) c.ideas = {};
    var id = null;
    if (I && I.LIST && I.canHold && I.learn) for (var i = 0; i < I.LIST.length && !id; i++) if (I.canHold(c, I.LIST[i].id) && !I.known(c, I.LIST[i].id)) id = I.LIST[i].id;
    Sv().take(c, "rubbing", 1);
    if (!id) { if (SB.Body && SB.Body.xp) SB.Body.xp(c, "craft", 6); return ok("📋 nothing here " + c.name + " was not ready for already. still, it sharpens the paws (crafting)"); }
    c.ideas[id] = 0.999; I.learn(c, id, 5, game, "rubbing");
    return ok("📋 " + c.name + " traces the rubbing with a claw... and gets it: a new idea", { idea: id });
  };
  D.wearBones = function (game, c) { if (!has(c, "mask_bone")) return fail("no bone mask"); dp(c).bones = game.time + SB.DAY_LENGTH; return ok("🦴 you look like a heap of old bones. for a day, grumps of the dark leave you be"); };
  D.setRod = function (game, c) {
    var w = game.world, f = fwd(c), x = c.x + f.x * 1.3, z = c.z + f.z * 1.3;
    if (!has(c, "stormrod")) return fail("no storm rod");
    if (W().depthAt(w, x, z) > 0.05 || !W().walkable(w, x, z, false) || W().structsNear(w, x, z, 2).length) return fail("it needs clear dry ground");
    Sv().take(c, "stormrod", 1);
    var b = put(game, "poi_rod", x, z, { dyn: 1, charge: 0 }, 0);
    return ok("🌩 the storm rod is up. come back after a storm", { st: b });
  };
  D.rods = function (game) { return game.world.structures.filter(function (b) { return b.kind === "poi_rod"; }); };

  /* ---------------- what you can do at the new places ---------------- */
  D.STARS = ["the ladle", "the long tail", "two sisters", "the lantern", "the sleeping blob", "the fish hook", "the ark", "old auntie", "the three captains", "the open paw", "the kite", "the last pod"];
  D.stargaze = function (game, c) {
    var s = st(game), today = day(game);
    if (!Array.isArray(s.stars)) s.stars = [];
    if (!game.world.night) return fail("the stars come out at night");
    if (fogged(game) || (game.world.weather && game.world.weather.cloud > 0.7)) return fail("too cloudy for stars tonight");
    if (s.starDay === today) return fail("you have found tonight's star. come back another night");
    if (s.stars.length >= D.STARS.length) return fail("⭐ you know every star in the island's sky");
    var left = D.STARS.map(function (n, i) { return i; }).filter(function (i) { return s.stars.indexOf(i) < 0; }), i = left[Math.floor(dice(game, "star:" + s.stars.length)() * left.length)];
    s.stars.push(i); s.starDay = today;
    var all = s.stars.length >= D.STARS.length; sparks(game, all ? 5 : 1, c);
    SB.bus.emit("deepStarFound", { c: c, star: D.STARS[i], n: s.stars.length });
    return ok("⭐ a pattern nobody has named. from now on it is “" + D.STARS[i] + "” (" + s.stars.length + " of " + D.STARS.length + ")" + (all ? ". that is every star there is · +5 ✨" : " · +1 ✨"));
  };
  D.other = function (game, p) { var l = D.pois(game); for (var i = 0; i < l.length; i++) if (l[i].kind === p.kind && l[i].id !== p.id) return l[i]; return null; };
  D.ops2 = function (game, c, b, hk, k, id, out, act, no) {
    var s = st(game), u = s.used[id], today = day(game), w = game.world, wd = wk(game), S = PS();
    function mark(extra) { var o = { day: today, n: ((u && u.n) || 0) + 1 }; for (var kk in u && typeof u === "object" ? u : {}) if (o[kk] == null) o[kk] = u[kk]; for (var e in extra || {}) o[e] = extra[e]; s.used[id] = u = o; return o; }
    function every(days, lbl, fn, doneLbl) { return u && u.day && today - u.day < days ? no(doneLbl) : act(lbl, function () { var r = fn(); if (r && r.ok) mark(); return r; }); }
    if (k === "jars") {
      out.use = every(4, "smash the old jars", function () {
        var r = dice(game, "jars:" + id + ":" + today), list = [["seed", 2], [r() < 0.5 ? "flint" : "coal", 1]];
        if (wd === "makeday") list.push(["stick", 2]);
        if (r() < 0.3) list.push(["relic", 1]);
        if (r() < 0.25) list.push(["scrap", 1]);
        return ok("🏺 crash! inside: " + gives(game, c, list));
      }, "only shards. the dust will settle on new ones in a few days");
    } else if (k === "fallen") {
      out.use = every(5, "pull logs off the fallen tree", function () { return ok("🪵 no axe needed: " + gives(game, c, [["log", wd === "logday" ? 3 : 2], ["stick", 1]])); }, "stripped bare. another will come down in time");
    } else if (k === "statue") {
      var sweet = hk === "honey" || (hk && K[hk] && K[hk].giant) ? hk : null;
      if (sweet && !s.cannoli) out.use = act("leave your " + label(sweet) + " in the statue's paws", function () { Sv().take(c, sweet, 1); s.cannoli = today; give(game, c, "skyseed", 1); return ok("🗿 the stone paws close. when they open again, a star seed is sitting there"); });
      else out.use = u && u.dust ? no("brushed clean. its paws are cupped, as if for something sweet") : act("brush the dust off the carving", function () {
        mark({ dust: today }); if (SB.Body && SB.Body.xp) SB.Body.xp(c, "craft", 4);
        var rd = has(c, "reader"); if (rd) give(game, c, "rubbing", 1);
        return ok("🖌 under the dust: " + (rd ? "words you can read with the reader. you take a rubbing (an idea to study), and learn a little about making things" : "worn old marks. you learn a little about making things from the chisel work. (an old-tongue reader would read them)"));
      });
      out.place = u && u.took ? no("you carried the little statue home already") : act("carry the little statue off", function () { mark({ took: today }); give(game, c, "statue", 1); return ok("🗿 the small one beside it comes loose: an old statue for the keeping shelf"); });
    } else if (k === "locker") {
      var key = has(c, "keyshard") ? "keyshard" : has(c, "arkkey") ? "arkkey" : null;
      out.use = u ? no("unlocked. the chest stands open to you") : !key ? no("locked. it wants a key shard (cave grumps and old crates have them)") : act("unlock it with your " + label(key), function () { Sv().take(c, key, 1); mark(); if (SB.Loot) SB.Loot.place(game, "deep-locker-" + id, "locker", b.x, b.z); return ok("🔓 click. the ark locker swings open: a chest! open it"); });
    } else if (k === "biolocker") {
      var n3 = captains(game), idx = parseInt(String(id).replace(/\D/g, ""), 10) || 0, prize = ["wings", "patientpick", "tablet"][idx % 3];
      out.use = u ? no("empty. you have what the captains kept here") : n3 < 3 ? no("sealed by the three captains (" + n3 + " of 3 beaten)") : act("break the captains' seal", function () { mark(); give(game, c, prize, 1); if (SB.Loot) SB.Loot.place(game, "deep-locker-" + id, "locker", b.x, b.z); sparks(game, 2, c); return ok("🧳 the seal is only ash now. inside: " + label(prize) + ", and a chest · +2 ✨"); });
    } else if (k === "gate" && !b.data.awake) {
      var lack = []; if (!has(c, "iron")) lack.push("1 iron"); if (!has(c, "crystal") && !has(c, "stormglass")) lack.push("1 crystal");
      out.use = lack.length ? no("broken. mending it takes " + lack.join(" and ")) : act("mend the ark gate and light it", function () { Sv().take(c, "iron", 1); Sv().take(c, has(c, "crystal") ? "crystal" : "stormglass", 1); b.data.awake = 1; mark(); sparks(game, 2, c); return ok("🚪 the ring hums and fills with light. it works like a waystone now: step between the gates and stones you have woken · +2 ✨"); });
    } else if (k === "tunnel") {
      var p0 = D.poi(game, id), q = p0 ? D.other(game, p0) : null;
      out.use = !q ? no("the far end has fallen in") : act("crawl through the old tunnel", function () {
        var first = !s.n.tunnel, spot = sideSpot(game, q.x, q.z, "tun:" + q.id);
        moveTo(game, c, spot.x, spot.z); W().reveal(w, c.x, c.z, 10, true); count(game, "tunnel"); game.time += 10;
        if (!s.found[q.id]) D.found(game, q, c);
        if (first && SB.Loot) SB.Loot.place(game, "deep-tunnel", "secret", q.x, q.z);
        return ok("🚇 dark, drippy, and then daylight: you come out in the " + biomeName(W().biomeAt(w, q.x, q.z)) + (first ? ". and somebody hid a chest at this end" : ""));
      });
    } else if (k === "oasis") {
      if (hk === "rod") out.use = u && u.fish === today ? no("the oasis fish are hiding. try tomorrow") : act("fish the oasis", function () { mark({ fish: today }); var list = [["fish", wd === "fishday" ? 2 : 1]]; if (dice(game, "oasis:" + today)() < 0.4) list.push(["opal", 1]); return ok("🎣 from the still green water: " + gives(game, c, list)); });
      else out.use = act(u && u.dates === today ? "drink at the oasis" : "drink, and pick the dates", function () {
        if (SB.Body) SB.Body.drink(c);
        if (u && u.dates === today) return ok("💧 cool, sweet water");
        mark({ dates: today }); give(game, c, "date", 2); noteFind(game, W().biomeAt(w, b.x, b.z), "date", 2);
        return ok("🌴 cool water, and 2 dates. (hold a rod here for the oasis's own fish)");
      });
    } else if (k === "hut") {
      var cold = W().biomeAt(w, b.x, b.z) === bid("tundra");
      if (cold) {
        out.use = act("warm up in the igloo", function () { c.chem.cold = 0; if (S && S.c === c) S.stam = 1; if (wd === "restday") c.chem.health = Math.min(1, c.chem.health + 0.3); return ok("🛖 out of the wind. warm again, and your pep is back"); });
        out.place = u && u.cellar ? no("the cellar is open") : !has(c, "shovel") ? no("the floor sounds hollow. you need a digging stick") : act("dig under the igloo floor", function () { mark({ cellar: today }); if (SB.Loot) SB.Loot.place(game, "deep-cellar-" + id, "secret", b.x, b.z); return ok("🧊 under the ice floor: a hidden cellar, and a chest in it"); });
      } else {
        var caps = hk === "glowcap" && Sv().count(c, "glowcap", true) >= 3;
        out.use = u && u.day === today ? no("the bog-wife is brewing. come back tomorrow") : !caps ? no("somebody inside calls: “three glowcaps for a potion, dearie.” hold them") : act("swap three glowcaps for a potion", function () { Sv().take(c, "glowcap", 3); mark(); give(game, c, K.potion ? "potion" : "heartfruit", 1); return ok("🧪 a paw comes out of the door, takes the caps, and leaves a warm bottle"); });
      }
    } else if (k === "lava") {
      out.use = every(1, "break brimstone off the crust", function () {
        if (!has(c, "frostflask") && !has(c, "sandglass")) { c.chem.health = Math.max(0.3, c.chem.health - 0.05); c.chem.pain = Math.min(1, (c.chem.pain || 0) + 0.1); }
        give(game, c, "brimstone", 2); noteFind(game, W().biomeAt(w, b.x, b.z), "brimstone", 2);
        return ok("🟡 2 brimstone, hot in the paw" + (has(c, "frostflask") || has(c, "sandglass") ? "" : ". ow: it singed you (a frost flask stops that)"));
      }, "the crust is still soft from this morning");
    } else if (k === "scree") {
      out.use = every(2, "pick through the loose rock", function () {
        var slide = dice(game, "scree:" + id + ":" + today)() < 0.2 && s.boon !== "delver";
        if (slide) { c.chem.health = Math.max(0.3, c.chem.health - 0.05); SB.bus.emit("deepSlideRock", { c: c }); }
        return ok("🪨 " + gives(game, c, [["flint", D.windy(game) ? 4 : 3], ["stone", 2]]) + (slide ? ". and a rockslide rattles past: ow" : ""));
      }, "picked over. the wind will loosen more in a day or two");
    } else if (k === "summit") {
      var stage = (u && u.stage) || 0, gear = has(c, "vinerope") || has(c, "claws"), warm = (SB.Body && SB.Body.cloaked && SB.Body.cloaked(c)) || has(c, "torch") || has(c, "mosslamp");
      if (stage >= 3) {
        out.use = fogged(game) ? no("cloud all round the summit. come back when it clears") : act("look out from the top of the island", function () { var n = W().reveal(w, b.x, b.z, wd === "walkday" ? 80 : 64); return ok(n ? "🏔 the whole island lies under you: the map fills in" : "🏔 nothing you have not seen. still: what a view"); });
        if (D.canGlide(c)) out.place = act("glide from the summit", function () { return D.glide(game, c); });
        else if (has(c, "sled") && D.snowy(game, c.x, c.z)) out.place = act("sledge down", function () { return D.slide(game, c); });
      } else {
        var names = ["the first shelf", "the cold chimney", "the last ridge"];
        out.use = !gear ? no("a real climb. you need a vine rope or climbing claws") : stage >= 1 && !warm ? no("bitter cold from here up. bring a cloak, or a torch to warm your paws") : act("climb " + names[stage] + " (" + (stage + 1) + " of 3)", function () {
          var cost = freeDay(game) ? 0 : 0.3 * (has(c, "claws") ? 0.5 : 1);
          if (S && S.c === c) { if ((S.stam || 0) < cost) return fail("too puffed. rest on the ledge a moment"); S.stam -= cost; }
          if (stage >= 1) c.chem.cold = Math.min(1, (c.chem.cold || 0) + 0.15);
          mark({ stage: stage + 1 }); count(game, "climbs");
          if (stage + 1 < 3) return ok("🧗 up " + names[stage] + ". " + (2 - stage) + " to go" + (stage === 0 ? ". it gets cold from here: a cloak or a torch" : ""));
          sparks(game, 5, c); give(game, c, "icegem", 2); W().reveal(w, b.x, b.z, 64);
          SB.bus.emit("deepSummit", { c: c });
          return ok("🏔 the top of the island! the wind takes your breath, and the map fills in for miles. two frost shards were lying in the cairn · +5 ✨");
        });
      }
    } else if (k === "giant") {
      var fed = (u && u.fed) || 0, food = hk && Sv().edible && Sv().edible(hk) ? hk : null;
      if (fed >= 3) out.use = u.day === today ? no("the giant is dozing in the sun") : act("visit your giant friend", function () { mark(); return ok("🦣 it rumbles hello and nudges a heap toward you: " + gives(game, c, [["berry", 4], ["amber", 1]])); });
      else out.use = !food ? no("it peers at you from behind a rock. hold something to eat, berries best") : u && u.day === today ? no("it took your gift and hid. come back tomorrow") : act("hold out your " + label(food), function () {
        Sv().take(c, food, 1); mark({ fed: fed + (food === "berry" ? 2 : 1) });
        if (u.fed < 3) return ok("🦣 a huge soft nose takes it, very gently. then it hides again. (it likes berries best)");
        s.giant = today; sparks(game, 3, c);
        return ok("🦣 it sits down beside you with a thump. a friend! it shows you its berry patch: the tribe's stalls pay double for berries from now on · +3 ✨");
      });
    } else if (k === "oldtree") {
      out.use = every(1, "shake the grumpy old tree", function () {
        c.chem.health = Math.max(0.3, c.chem.health - 0.04); c.chem.pain = Math.min(1, (c.chem.pain || 0) + 0.08);
        return ok("🌳 THWACK. a branch swats you for your cheek. but down come " + gives(game, c, [["amber", 1], ["stick", 2], ["sapling", 1]]));
      }, "it is watching you. leave it till tomorrow");
    } else if (k === "pool") {
      var d0 = dp(c);
      out.use = d0.pool ? no(c.name + " has looked already. the pool shows each smol one thing") : act("look into the memory pool", function () {
        d0.pool = today;
        var B2 = SB.Body, low = null; if (B2 && B2.SKILLS) B2.SKILLS.forEach(function (sk) { if (!low || B2.level(c, sk.id) < B2.level(c, low.id)) low = sk; });
        if (low) B2.xp(c, low.id, 14);
        var first = !u; if (first) { mark(); give(game, c, "skyseed", 1); }
        return ok("🪞 not your face: a smol on the ark, long ago, " + (low ? low.label + " as if it were easy. " + c.name + " remembers how (" + low.label + " grows)" : "smiling") + (first ? ". something bright is lying on the bottom: a star seed" : ""));
      });
    } else if (k === "sword") {
      out.use = u ? no("an empty slot in the rock") : D.deepest(game) < D.MAX ? no("stuck fast. it will only come free for a smol of a tribe that has seen the bottom of a cave") : act("draw the old tool from the stone", function () { mark(); give(game, c, "arkcutter", 1); sparks(game, 3, c); return ok("⚔ it slides out as if it had been waiting: the ark-cutter · +3 ✨"); });
    } else if (k === "vault") {
      var B3 = SB.Body, full = 0, tot = B3 && B3.SKILLS ? B3.SKILLS.length : 0;
      if (tot) B3.SKILLS.forEach(function (sk) { if (B3.level(c, sk.id) >= B3.MAX) full++; });
      out.use = u ? no("open. the masters' chest is yours") : !tot || full < tot ? no("sealed. it opens for a smol that has mastered every skill (" + full + " of " + tot + ")") : act("put your paw on the masters' door", function () { mark(); if (SB.Loot) SB.Loot.place(game, "deep-vault", "vault", b.x, b.z); return ok("🏛 the door knows a master when it feels one. inside: a chest"); });
    } else if (k === "haunt") {
      var calm = (u && u.calm) || 0;
      out.use = calm >= 3 ? no("quiet now. the spirits have gone on") : !w.night ? no("empty by day. the spirits only show at night (" + calm + " of 3 settled)") : u && u.day === today ? no("the others will not come tonight. come back tomorrow night") : act("sit with a lost spirit until it settles", function () {
        if (S && S.c === c) { if ((S.stam || 0) < 0.3) return fail("too tired to sit up with it"); S.stam -= 0.3; }
        mark({ calm: calm + 1 }); c.chem.fear = 0;
        if (calm + 1 < 3) return ok("👻 it wails, then sighs, then is only moonlight. " + (2 - calm) + " more are still lost");
        if (SB.Loot) SB.Loot.place(game, "deep-haunt", "haunt", b.x, b.z); sparks(game, 3, c);
        return ok("👻 the last one goes, and where it stood there is a chest · +3 ✨");
      });
    } else if (k === "grove") {
      if (!(u && u.open)) out.use = !has(c, "ironaxe") && !has(c, "sunsickle") ? no("thorn as thick as a wall. only an iron axe gets through") : act("cut a way through the thorn wall", function () { mark({ open: today, day: 0 }); return ok("🪓 a gap, just smol-sized. inside it is green and still, and nobody has picked anything for a hundred years"); });
      else out.use = every(1, "gather in the hidden grove", function () { return ok("🌲 " + gives(game, c, [["amber", 1], ["log", 2], [K.glowcap ? "glowcap" : "seed", 2]])); }, "picked for today. it grows back overnight");
    } else if (k === "midden") {
      out.use = every(1, "rummage in the old heap", function () {
        var r = dice(game, "midden:" + today), list = [[r() < 0.5 ? "stick" : "fiber", 2], ["seed", 1]];
        if (r() < 0.15) list.push(["keyshard", 1]);
        if (r() < 0.2) list.push(["scrap", 1]);
        return ok("🗑 pooh. but: " + gives(game, c, list));
      }, "you have turned it all over today");
    } else if (k === "altar") {
      out.use = !hasPick(c) ? no("cold black stone. you need a pick or a hammer to break it") : act("break the dark altar", function () {
        var r = dice(game, "veins:" + b.data.boss), n = 0;
        for (var i = 0; i < 3; i++) { var at = drySpot(game, r, b.x, b.z, 8, 40); if (at) { put(game, "poi_vein", at.x, at.z, { dyn: 1, t: 0 }, 0); n++; } }
        W().removeStructure(w, b); sparks(game, 2, c); count(game, "altars");
        SB.bus.emit("deepAltar", { c: c, veins: n });
        return ok("💥 it cracks from top to bottom, and the ground shivers: " + n + " new ore veins have broken the surface nearby · +2 ✨");
      });
    } else if (k === "vein") {
      out.use = b.data.t && today - b.data.t < D.RESTOCK ? no("mined out. the vein fills again in a few days") : !hardPick(c) ? no("too hard for that. it needs an iron pick") : act("break ore loose", function () { b.data.t = today; var list = [["silverore", 2]]; if (dice(game, "vein:" + b.id + ":" + today)() < 0.35) list.push(["starmetal", 1]); return ok("⛏ " + gives(game, c, list)); });
    } else if (k === "crater") {
      out.use = !hasPick(c) ? no("still glowing. you need a pick or a hammer to dig the star out") : act("dig the star out", function () { W().removeStructure(w, b); st(game).wx.crater = null; sparks(game, 2, c); return ok("🌠 warm as a loaf: " + gives(game, c, [["starmetal", 1], ["crystal", 2]]) + " · +2 ✨"); });
    } else if (k === "rod") {
      out.use = b.data.charge > 0 ? act("take the storm glass (" + b.data.charge + ")", function () { var n = b.data.charge; b.data.charge = 0; give(game, c, "stormglass", n); return ok("⚡ " + n + " storm glass, still fizzing"); }) : no("nothing yet. it catches lightning when a storm comes over");
      out.place = act("take the rod down", function () { W().removeStructure(w, b); give(game, c, "stormrod", 1); return ok("🌩 you pull the rod up"); });
    } else if (k === "expcamp") {
      out.use = act("rest at the camp", function () { return D.expRest(game, c); });
      out.place = act("pack up and go home", function () { return D.expHome(game, c); });
    }
  };
  // extra buttons on round-1 places
  D.opsPost = function (game, c, b, hk, k, id, out, act) {
    if (k === "lookout") {
      if (hk === "lens") out.place = act("scan for ore through the lens", function () { return D.scan(game, c); });
      else if (game.world.night) out.place = act("look at the stars", function () { return D.stargaze(game, c); });
      else if (D.canGlide(c)) out.place = act("glide from the lookout", function () { return D.glide(game, c); });
    }
  };

  /* ---------------- pins, the shelf, the cart ---------------- */
  D.PIN_MAX = 9;
  D.pin = function (game, c) {
    var s = st(game); if (!Array.isArray(s.pins)) s.pins = [];
    if (s.pins.length >= D.PIN_MAX) return fail("the map desk holds " + D.PIN_MAX + " pins. pull one out first");
    var n = count(game, "pins"), p = { x: Math.round(c.x), z: Math.round(c.z), n: n, name: "pin " + n + " · " + biomeName(W().biomeAt(game.world, c.x, c.z)) };
    s.pins.push(p);
    return ok("📍 pinned: " + p.name, { pin: p });
  };
  D.unpin = function (game, i) { var s = st(game); if (!s.pins || !s.pins[i]) return fail("no such pin"); s.pins.splice(i, 1); return ok("📍 pin pulled"); };
  D.wayTo = function (game, x, z, lbl) { if (!P() || !P().setGoal || !PS()) return fail("you can only follow a marker in a body"); P().setGoal({ x: x, z: z, label: lbl, small: true, deep: 1 }); return ok("🧭 marked: " + lbl + ". follow the marker"); };
  D.SHELF = ["amber", "opal", "icegem", "pearl", "crystal", "silver", "starmetal", "brimstone", "stormglass", "fossil", "relic", "statue", "figurine", "powercell", "mask_scowl", "mask_grin", "mask_yawn", "mask_bone"];
  D.SHELF_PRIZES = [[4, [["mapscrap", 2]], "two map scraps"], [8, [["keyshard", 2]], "two key shards"], [12, [["arkkey", 1]], "a captain's key, for a door nothing else opens"], [18, [["skyseed", 1]], "a star seed"]];
  D.shelf = function (game) { var s = st(game); if (!s.shelf || typeof s.shelf !== "object") s.shelf = {}; return s.shelf; };
  D.shelfCount = function (game) { return Object.keys(D.shelf(game)).length; };
  D.donate = function (game, c, k) {
    var sh = D.shelf(game);
    if (D.SHELF.indexOf(k) < 0) return fail("the keeping shelf has no place for that");
    if (sh[k]) return fail("there is one on the shelf already");
    if (!has(c, k)) return fail("you are not carrying one");
    Sv().take(c, k, 1); sh[k] = day(game);
    var n = D.shelfCount(game), msg = "🏛 " + (/^[aeiou]/i.test(label(k)) ? "an " : "a ") + label(k) + " goes on the keeping shelf (" + n + " of " + D.SHELF.length + ")";
    D.SHELF_PRIZES.forEach(function (pz) { if (n === pz[0]) { gives(game, c, pz[1]); msg += ". the hermit sends a thank-you: " + pz[2]; } });
    SB.bus.emit("deepShelf", { c: c, kind: k, n: n });
    return ok(msg);
  };
  D.cartStops = function (game) {
    var out = [], T = game.world.T, h = SB.Home && SB.Home.get ? SB.Home.get(game) : null;
    if (T.nest) out.push({ id: "village", name: "the village", x: T.nest.x, z: T.nest.z });
    if (h) out.push({ id: "home", name: "your home", x: h.x, z: h.z });
    return out;
  };
  D.cartHere = function (game, c) { var l = D.cartStops(game); if (l.length < 2 || SB.dist(l[0].x, l[0].z, l[1].x, l[1].z) < 20) return null; for (var i = 0; i < l.length; i++) if (SB.dist(c.x, c.z, l[i].x, l[i].z) < 9) return { from: l[i], to: l[1 - i] }; return null; };
  D.ride = function (game, c) {
    var h = D.cartHere(game, c), free = wk(game) === "marketday";
    if (!h) return fail("the cart runs between the village and your home. stand at one of them");
    if (!free && (c.purse || 0) < 1) return fail("the carter wants one " + (SB.Loot && SB.Loot.moneyWord ? SB.Loot.moneyWord(game).replace(/s$/, "") : "shell") + ". your purse is empty");
    if (!free) c.purse -= 1;
    if (D.cur(game)) D.leave(game, "travel");
    var spot = sideSpot(game, h.to.x, h.to.z, "cart:" + count(game, "rides"));
    moveTo(game, c, spot.x, spot.z); game.time += 15; W().reveal(game.world, c.x, c.z, 8, true);
    SB.bus.emit("deepRide", { c: c, to: h.to.id });
    return ok("🛒 you bump along on the back of the cart, all the way to " + h.to.name + (free ? ". market day: no charge" : ""));
  };

  /* ---------------- expeditions ---------------- */
  D.ROLES = ["scout", "cook", "guard", "carrier"];
  D.ROLE_PERK = { scout: "the fog lifts further round the camp", cook: "resting at the camp fills everybody up", guard: "nothing creeps up on the camp at night", carrier: "an extra find comes home with you" };
  D.party = function (game) { var F = SB.Friends; try { return F && F.followers ? F.followers(game) : []; } catch (e) { return []; } };
  function foodIn(c) { var v = Sv().inv(c), n = 0; for (var i = 0; i < v.s.length; i++) if (v.s[i] && Sv().edible && Sv().edible(v.s[i].k)) n += v.s[i].n || 1; return n; }
  D.expTargets = function (game, c) {
    var T = game.world.T, sp = T.nest || T.spawn, best = {}, seen = game.world.biomesSeen || {};
    D.pois(game).forEach(function (p) { var d = SB.dist(p.x, p.z, sp.x, sp.z); if (d < 35 || p.kind === "islet" || !seen[p.b]) return; if (!best[p.b] || d < best[p.b].d) best[p.b] = { b: p.b, x: p.x, z: p.z, d: d, name: biomeName(p.b) }; });
    return Object.keys(best).map(function (k) { return best[k]; }).sort(function (a, b) { return b.d - a.d; }).slice(0, 6);
  };
  D.expRole = function (game, id) {
    var s = st(game); if (!s.roles || typeof s.roles !== "object") s.roles = {};
    var i = D.ROLES.indexOf(s.roles[id]); s.roles[id] = D.ROLES[(i + 1) % D.ROLES.length];
    return ok("🎒 " + s.roles[id] + ": " + D.ROLE_PERK[s.roles[id]]);
  };
  D.hasRole = function (game, role) { var s = st(game), r = s.roles || {}; return D.party(game).some(function (o) { return r[o.id] === role; }); };
  D.expPlan = function (game, c, bi) {
    var s = st(game), t = D.expTargets(game, c).filter(function (o) { return o.b === bi; })[0];
    if (s.exp) return fail("you are on an expedition already");
    if (!t) return fail("nowhere far enough to go in that land yet");
    var n = 1 + D.party(game).length;
    if (foodIn(c) < 2) return fail("pack at least two things to eat first");
    s.exp = { b: bi, x: t.x, z: t.z, stage: "out", day0: day(game), n: n, found0: D.progress(game).found };
    if (P() && P().setGoal && PS()) P().setGoal({ x: t.x, z: t.z, label: "⛺ expedition: the " + t.name, small: true });
    SB.bus.emit("deepExp", { c: c, stage: "out", n: n });
    return ok("🎒 off to the " + t.name + ", " + n + " of you, about " + Math.round(SB.dist(c.x, c.z, t.x, t.z)) + " steps. follow the ⛺ and make camp when you get there");
  };
  D.expNear = function (game, c) { var e = st(game).exp; return !!(e && e.stage === "out" && SB.dist(c.x, c.z, e.x, e.z) < 12); };
  D.expCamp = function (game, c) {
    var s = st(game), e = s.exp, w = game.world;
    if (!D.expNear(game, c)) return fail("you are not there yet");
    var at = drySpot(game, dice(game, "expcamp:" + e.day0), c.x, c.z, 1.5, 4) || { x: c.x + 1.5, z: c.z };
    var b = put(game, "poi_expcamp", at.x, at.z, { dyn: 1 }, 0);
    e.stage = "camp"; e.t = game.time; e.id = b.id;
    W().reveal(w, c.x, c.z, D.hasRole(game, "scout") ? 34 : 18, true);
    if (!s.keeps || typeof s.keeps !== "object") s.keeps = {};
    if (!s.keeps[e.b]) s.keeps[e.b] = day(game);
    var amb = w.night && !D.hasRole(game, "guard") && dice(game, "ambush:" + e.day0)() < 0.25 + 0.1 * e.n;
    if (amb) D.spawnGrump(game, c, 2, null, false, "a camp raider");
    if (PS() && PS().goal && !PS().goal.deep) P().setGoal(null);
    SB.bus.emit("deepExp", { c: c, stage: "camp", ambush: amb });
    return ok("⛺ camp is up in the " + biomeName(e.b) + ". rest here, look about, and pack up when you are done" + (amb ? ". something was watching the fire: a raider! (a guard in the party stops that)" : ""));
  };
  D.expRest = function (game, c) {
    var S = PS(), e = st(game).exp; if (!e || e.stage !== "camp") return fail("no camp");
    if (S && S.c === c) S.stam = 1;
    c.chem.tired = Math.max(0, (c.chem.tired || 0) - 0.4); c.chem.cold = Math.max(0, (c.chem.cold || 0) - 0.5);
    var cook = D.hasRole(game, "cook") || wk(game) === "restday";
    if (cook && !(e.ate === day(game))) { e.ate = day(game); c.chem.hunger = Math.max(0, (c.chem.hunger || 0) - 0.3); }
    return ok("⛺ feet up by the camp fire. pep full" + (cook ? ", and a hot supper" : ""));
  };
  D.expHome = function (game, c) {
    var s = st(game), e = s.exp, w = game.world;
    if (!e || e.stage !== "camp") return fail("no camp to pack up");
    var b = W().structById(w, e.id); if (b) W().removeStructure(w, b);
    var found = D.progress(game).found - e.found0, bname = SB.BIOMES[e.b] ? SB.BIOMES[e.b].id : "", gem = D.DIG[bname] || "seed", list = [[gem, D.hasRole(game, "carrier") ? 2 : 1]];
    var got = gives(game, c, list);
    if (!Array.isArray(s.trips)) s.trips = [];
    s.trips.push({ b: e.b, day: day(game), n: e.n, found: found }); if (s.trips.length > 12) s.trips.shift();
    dp(c).trip = game.time + SB.DAY_LENGTH;
    sparks(game, 3 + Math.min(3, found), c);
    var F = SB.Friends; if (F && F.add) D.party(game).forEach(function (o) { try { F.add(game, o, 10); } catch (err) {} });
    s.exp = null;
    SB.bus.emit("deepExp", { c: c, stage: "home", found: found });
    return ok("🎒 camp packed. a keepsake of the " + biomeName(e.b) + " comes home with you (" + got + "), and it goes in the trip book. for a day you are fresh from a trip: climbs and delves cost half the pep · +" + (3 + Math.min(3, found)) + " ✨");
  };

  /* ---------------- more sky ---------------- */
  D.starfall = function (game) {
    var s = st(game), f = focus(game), r = dice(game, "starfall:" + day(game));
    if (s.wx.crater || !f) return null;
    var at = drySpot(game, r, f.x, f.z, 20, 45); if (!at) return null;
    var b = put(game, "poi_crater", at.x, at.z, { dyn: 1, until: game.time + SB.DAY_LENGTH }, 0);
    s.wx.crater = { id: b.id, until: b.data.until }; count(game, "starfalls");
    if (PS() && P().setGoal && !PS().goal) P().setGoal({ x: b.x, z: b.z, label: "🌠 the fallen star", small: true, deep: 1 });
    tell("🌠 a star came down, " + Math.round(SB.dist(f.x, f.z, b.x, b.z)) + " steps off! dig it out with a pick before it cools away");
    SB.bus.emit("starfall", { st: b });
    return b;
  };
  D.quake = function (game) {
    var s = st(game), T = game.world.T, sp = T.nest || T.spawn;
    if (s.quake) return null;
    var at = drySpot(game, dice(game, "quake"), sp.x, sp.z, 30, T.N * 0.4); if (!at) return null;
    var b = put(game, "poi_spring", at.x, at.z, { dyn: 1, quake: 1 }, 0);
    s.quake = { day: day(game), x: b.x, z: b.z };
    if (SB.Loot) SB.Loot.place(game, "deep-quake", "secret", b.x, b.z);
    tell("🫨 the ground shook in the night. a crack has opened in the " + biomeName(W().biomeAt(game.world, b.x, b.z)) + ": steam is rising from it");
    SB.bus.emit("deepQuake", { st: b });
    return b;
  };
  function newDay2(game) {
    var s = st(game), w = game.world, r = dice(game, "wx2:" + day(game));
    D.gloomDay(game);
    if (r() < 0.2) { s.wx.wind = game.time + SB.DAY_LENGTH * 0.7; SB.bus.emit("windyDay", {}); }
    if (w.season === 3 && r() < 0.35) { s.wx.aurora = game.time + SB.DAY_LENGTH; SB.bus.emit("aurora", {}); }
    if (r() < 0.15) s.wx.starAt = game.time + SB.DAY_LENGTH * 0.85;
    if (day(game) >= 5 && !s.quake && r() < 0.25) D.quake(game);
  }
  function sky2(game) {
    var s = st(game), w = game.world, wx = w.weather, cr = s.wx.crater;
    if (cr && (game.time > cr.until || !W().structById(w, cr.id))) { var b = W().structById(w, cr.id); if (b) W().removeStructure(w, b); s.wx.crater = null; }
    if (s.wx.starAt && game.time >= s.wx.starAt) { s.wx.starAt = 0; if (w.night) D.starfall(game); }
    if (s.wx.wind && s.wx.wind <= game.time) s.wx.wind = 0;
    if (s.wx.aurora && s.wx.aurora <= game.time) s.wx.aurora = 0;
    if (D.windy(game) && wx) wx.wind = Math.max(wx.wind || 0, 1);
    if (wx && wx.kind === "storm" && Math.random() < 0.05) D.rods(game).forEach(function (b) { if ((b.data.charge || 0) < 3) { b.data.charge = (b.data.charge || 0) + 1; SB.bus.emit("rodCharged", { st: b }); } });
  }
  D.onLightning = function (game, d) {
    var S = PS(), c = S && S.game === game ? S.c : null;
    D.rods(game).forEach(function (b) { if (SB.dist(b.x, b.z, d.x, d.z) < 30 && (b.data.charge || 0) < 3) b.data.charge = (b.data.charge || 0) + 1; });
    if (c && SB.dist(c.x, c.z, d.x, d.z) < 6) { dp(c).charged = game.time + 120; say("⚡ that was close! your fur stands on end: for a while your hits land a third harder"); SB.bus.emit("deepCharged", { c: c }); }
  };
  // rock on a steep mountain face comes down when you break it
  function rockslide(game, d) {
    var c = d.c, n = d.node, w = game.world;
    if (!c || !n || n.delve || W().biomeAt(w, n.x, n.z) !== bid("mountain") || WG().slopeAt(w.T, n.x, n.z) < 1.2 || Math.random() > 0.3) return;
    give(game, c, "stone", 2);
    if (st(game).boon !== "delver") { c.chem.health = Math.max(0.3, c.chem.health - 0.04); }
    say("🪨 the face above lets go: a rockslide! two more stones, and a bump on the head");
    SB.bus.emit("deepRockslide", { c: c });
  }
  D.twin = function (game) { return dice(game, "twin-ore")() < 0.5; };

  /* ---------------- hooks, round 2 ---------------- */
  D.cmd = function (game, c, cmd, arg) {
    if (cmd === "pin") return D.pin(game, c);
    if (cmd === "unpin") return D.unpin(game, +arg);
    if (cmd === "showpin") { var p = (st(game).pins || [])[+arg]; return p ? D.wayTo(game, p.x, p.z, "📍 " + p.name) : fail("no such pin"); }
    if (cmd === "site") { var o = (game.sites || [])[+arg]; return o && o.found && !o.gone ? D.wayTo(game, o.x, o.z, "📍 " + (SB.Sites && SB.Sites.KINDS[o.kind] ? SB.Sites.KINDS[o.kind].name : "a place")) : fail("no such place"); }
    if (cmd === "donate") return D.donate(game, c, arg);
    if (cmd === "ride") return D.ride(game, c);
    if (cmd === "stain") return D.setStain(game, arg);
    if (cmd === "exp") return D.expPlan(game, c, +arg);
    if (cmd === "role") return D.expRole(game, +arg);
    if (cmd === "exphome") return D.expHome(game, c);
    if (cmd === "gloom") { var g = D.patches(game)[+arg]; return g ? D.wayTo(game, g.x, g.z, "🌫 " + g.name) : fail("gone"); }
    return fail("?");
  };
  if (SB.Loot && SB.Loot.sellPrice && !SB.Loot._deepPrice) {
    var sell0 = SB.Loot.sellPrice; SB.Loot._deepPrice = true;
    SB.Loot.sellPrice = function (game, k) { var v = sell0.apply(SB.Loot, arguments); return k === "berry" && game && game.quests && game.quests.deep && game.quests.deep.giant ? v * 2 : v; };
  }
  if (SB.bus) {
    var cur2 = function () { return SB.Game && SB.Game.current; };
    SB.bus.on("bossBeaten", function (d) { var game = cur2(); if (game && d) D.onBossBeaten(game, d); });
    SB.bus.on("beaconReady", function () { var game = cur2(); if (game && !game.offline) D.act2(game); });
    SB.bus.on("lightning", function (d) { var game = cur2(); if (game && !game.offline && d) D.onLightning(game, d); });
    SB.bus.on("rockGone", function (d) { var game = cur2(); if (game && d) rockslide(game, d); });
    SB.bus.on("newDay", function () { var game = cur2(); if (game && !game.offline) newDay2(game); });
    SB.bus.on("grumpChased", function (d) {
      var game = cur2(); if (!game || !d || !d.g || !d.c || !d.g.caveGrump) return;
      if (dice(game, "shard:" + count(game, "caveChased"))() < 0.35) { give(game, d.c, "keyshard", 1); say("🗝 it dropped a key shard"); }
    });
  }
  if (SB.Ext) {
    SB.Ext.on("options", function (game, c, r, o, x) {
      var hk = r && r.type === "creature" ? null : x.hk, s = st(game), Su = Sv();
      function op(lbl, fn, snd) { return x.op(lbl, function () { var res = fn(); if (res && res.msg) x.say(res.msg); if (res && res.ok) x.audio(snd || "chime", 0.7); return !!(res && res.ok); }, null); }
      if (hk === "tablet") o.place = op("read the ark tablet", function () { return D.readTablet(game, c); }, "eureka");
      else if (hk === "skyseed") o.place = op("swallow the star seed", function () { return D.eatStar(game, c); }, "achievement");
      else if (hk === "relic" && Su.count(c, "relic", true) >= 3) o.place = op("fit the three relic pieces together", function () { return D.joinRelics(game, c); }, "achievement");
      else if (hk === "scrap") o.place = op("read the journal scrap", function () { return D.readScrap(game, c); });
      else if (hk === "rubbing") o.place = op("study the rubbing", function () { return D.study(game, c); }, "eureka");
      else if (hk === "vinerope" || hk === "claws") o.place = op("climb the cliff ahead", function () { return D.climb(game, c); });
      else if (hk === "wings") o.place = op("jump and glide", function () { return D.glide(game, c); });
      else if (hk === "sled") o.place = op("sledge downhill", function () { return D.slide(game, c); });
      else if (hk === "lens" && !(r && r.type === "struct")) o.place = op("look far through the lens", function () { return D.peer(game, c); });
      else if (hk === "stormrod") o.place = op("set the storm rod up here", function () { return D.setRod(game, c); }, "build");
      else if (hk === "mask_bone") o.place = op("put on the bone mask", function () { return D.wearBones(game, c); });
      else if (hk === "pot" && (!r || r.type === "water") && D.canPan(game, c)) o.place = op("pan the shallows", function () { return D.pan(game, c); }, "craft");
      else if ((hk === "torch" || hk === "glowcap") && !r && !D.depth(game) && D.gloomAt(game, c.x, c.z)) o.place = op(hk === "torch" ? "plant your torch: push the gloom back" : "plant the glowcap: thin the gloom", function () { return D.pushGloom(game, c, hk); });
      if (!r && D.expNear(game, c)) o.pick = op("make camp here", function () { return D.expCamp(game, c); }, "build");
    });
    SB.Ext.on("vitals", function (game, c) {
      var out = [], z = D.zone(game);
      if (z && z.flood) out.push({ icon: "🫧", text: "breath " + Math.max(0, Math.ceil(breath)) + "s", bad: breath < 6, tip: "go back up before it runs out" });
      if (haz.gloom) out.push({ icon: "🌫", text: "gloom", bad: true, tip: haz.gloom + ". plant a torch or a glowcap" });
      if (haz.ice) out.push({ icon: "🧊", text: has(c, "wraps") ? "ice: sliding" : "ice: slippery", bad: !has(c, "wraps"), tip: "foot wraps make ice a fast slide" });
      if (haz.drift) out.push({ icon: "❄️", text: "snow drift", bad: true, tip: "slow and cold" });
      if (haz.road) out.push({ icon: "🛤", text: "old ark road", tip: "quick feet" });
      if (haz.thin) out.push({ icon: "😮‍💨", text: "thin air", bad: true, tip: "moving takes your wind" });
      if (haz.ash) out.push({ icon: "😷", text: "ash cough", bad: true, tip: "leave the ashlands for a while" });
      if (haz.lava) out.push({ icon: "🔥", text: "lava", bad: true, tip: "step back" });
      if (haz.curse) out.push({ icon: "🥶", text: "cursed", bad: true, tip: "pep stays low. a shrine or a hot spring lifts it" });
      if (haz.aurora) out.push({ icon: "🌌", text: "aurora", tip: "nothing frightens you under it" });
      if (haz.shimmer) out.push({ icon: "✨", text: "shimmer", tip: "pan here with a pot" });
      if (haz.windy) out.push({ icon: "💨", text: "windy", tip: "rafts are free, glides go further, scree gives more" });
      if (haz.charged) out.push({ icon: "⚡", text: "charged", tip: "hits land a third harder" });
      if (haz.trip) out.push({ icon: "🎒", text: "fresh from a trip", tip: "climbs and delves cost half the pep" });
      if (haz.bones) out.push({ icon: "🦴", text: "bone mask", tip: "grumps of the dark leave you be" });
      return out;
    });
    SB.Ext.on("damage", function (game, c) { return (c && c.dp && c.dp.charged > game.time ? 1.3 : 1) * (D.maskSet(c) ? 1.15 : 1); });
    SB.Ext.on("goals", function (game, add) {
      var l = D.patches(game).filter(function (p) { return p.boss; });
      if (l.length) add("hold back the captains' gloom (plant torches and glowcaps at its edge)", l.map(function (p) { return Math.round(p.r); }).join(", ") + " steps wide", false, false);
    });
  }

  /* ---------------- the map tab, round 2 ---------------- */
  D.html2 = function (game, c, icon) {
    var s = st(game), out = "", wd = wk(game);
    function btn(cmd, arg, lbl, dis) { return "<button class='btn go' data-deep2='" + cmd + ":" + arg + "' " + (dis ? "disabled" : "") + ">" + lbl + "</button>"; }
    var lt = c && c.x != null ? D.lot(game, c.x, c.z) : "";
    out += "<div class='lbl'>📅 day " + day(game) + " · " + wd + ": " + esc(D.WEEK_PERK[wd]) + (D.windy(game) ? " · 💨 windy" : "") + (D.aurora(game) ? " · 🌌 aurora tonight" : "") + (s.wx.crater ? " · 🌠 a star fell" : "") + "</div>";
    if (lt) out += "<p class='help'>📍 where you stand: " + esc(D.LOTS[lt][0]) + ". " + esc(D.LOTS[lt][1]) + "</p>";
    // the gloom
    var gl = D.patches(game);
    if (gl.length || D.underOpen(game)) {
      out += "<div class='lbl'>🌫 the gloom</div><p class='help'>";
      out += gl.map(function (p, i) { return esc(p.name) + " (" + esc(p.kind[0]) + "): " + Math.round(p.r) + " steps wide " + btn("gloom", i, "🧭"); }).join(" · ") || "none left";
      out += "<br>it creeps out a little each day while its captain lives. plant a torch or a glowcap inside it, or keep fires lit near it, to push it back" + (D.underOpen(game) ? "<br>🕳 the under-dark is open: every cave goes on past level " + D.MAX : "") + "</p>";
      if (D.canStain(game) && BO()) out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'><span class='help'>which captain's dark is strongest here? (" + esc(BO().BY[D.stain(game)].name) + " now)</span>" + BO().LIST.map(function (d) { return btn("stain", d.id, d.icon + " " + esc(d.name)); }).join("") + "</div>";
    }
    // going places
    var cart = D.cartHere(game, c), e = s.exp, party = D.party(game);
    out += "<div class='lbl'>🎒 expeditions" + (e ? " · " + (e.stage === "out" ? "on the way to the " : "camped in the ") + esc(biomeName(e.b)) : "") + "</div>";
    if (!e) {
      var tg = D.expTargets(game, c);
      out += "<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + (tg.length ? tg.map(function (t) { return btn("exp", t.b, "⛺ " + esc(t.name)); }).join("") : "<span class='help'>find a far place first, then plan a trip to it</span>") + "</div>";
    } else if (e.stage === "camp") out += "<div class='row'>" + btn("exphome", 0, "pack up and go home") + "</div>";
    out += "<p class='help'>who goes: you" + (party.length ? party.map(function (o) { return ", " + esc(o.name) + " " + btn("role", o.id, esc((s.roles && s.roles[o.id]) || "no job")); }).join("") : " (ask friends to follow you and they come too, each with a job)") + " · food packed: " + foodIn(c) + " (2 needed)</p>";
    if (cart) out += "<div class='row'>" + btn("ride", 0, "🛒 ride the cart to " + esc(cart.to.name) + (wd === "marketday" ? " (free today)" : " (1 from your purse)")) + "</div>";
    if (s.trips && s.trips.length) out += "<p class='help'>📖 trip book: " + s.trips.map(function (t) { return "day " + t.day + ", the " + esc(biomeName(t.b)) + " (" + t.n + " went, " + t.found + " found)"; }).join(" · ") + "</p>";
    // the map desk
    var pins = s.pins || [], sites = (game.sites || []).filter(function (o) { return o.found && !o.gone; });
    out += "<details><summary class='lbl'>📍 the map desk · " + pins.length + " pins · " + sites.length + " sites</summary><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>" + btn("pin", 0, "📍 pin this spot", pins.length >= D.PIN_MAX);
    pins.forEach(function (p, i) { out += "<span>" + esc(p.name) + " " + btn("showpin", i, "🧭") + btn("unpin", i, "✖") + "</span>"; });
    sites.forEach(function (o) { out += "<span>" + (SB.Sites && SB.Sites.KINDS[o.kind] ? SB.Sites.KINDS[o.kind].icon + " " + esc(SB.Sites.KINDS[o.kind].name) : "a place") + (o.done ? " ✓" : "") + " " + btn("site", o.id, "🧭") + "</span>"; });
    out += "</div></details>";
    // the keeping shelf
    var sh = D.shelf(game), nsh = D.shelfCount(game), nextPz = D.SHELF_PRIZES.filter(function (p) { return p[0] > nsh; })[0];
    out += "<details><summary class='lbl'>🏛 the keeping shelf · " + nsh + " of " + D.SHELF.length + (nextPz ? " · at " + nextPz[0] + ": " + esc(nextPz[2]) : " · full!") + "</summary><div class='row' style='display:flex;flex-wrap:wrap;gap:4px 8px'>";
    D.SHELF.forEach(function (k) { out += "<span class='" + (sh[k] ? "ok" : "") + "'>" + icon(k, 16) + " " + esc(label(k)) + (sh[k] ? " ✓" : has(c, k) ? " " + btn("donate", k, "give") : "") + "</span>"; });
    out += "</div><p class='help'>⭐ stars named: " + ((s.stars || []).map(function (i) { return esc(D.STARS[i]); }).join(", ") || "none yet. climb a lookout rock at night") + " (" + (s.stars || []).length + " of " + D.STARS.length + ")<br>🎁 keepsakes: " + (Object.keys(s.keeps || {}).map(function (b) { return esc(biomeName(+b)); }).join(", ") || "none yet. dig soft earth or camp somewhere far") + "</p></details>";
    var pk = Object.keys((c.dp && c.dp.perks) || {});
    if (pk.length || (c.dp && c.dp.star)) out += "<p class='help'>📜 " + esc(c.name) + " keeps: " + pk.map(function (k) { return esc(D.PERKS[k] || k); }).join(" · ") + (c.dp.star ? (pk.length ? " · " : "") + "🌟 " + c.dp.star + " star seed" + (c.dp.star > 1 ? "s" : "") : "") + "</p>";
    return out;
  };
  D.wire2 = function (root, game, c, redraw, sayFn) {
    root.querySelectorAll("[data-deep2]").forEach(function (b) {
      b.addEventListener("click", function () { var a = b.getAttribute("data-deep2"), i = a.indexOf(":"), r = D.cmd(game, c, a.slice(0, i), a.slice(i + 1)); if (r && r.msg && sayFn) sayFn(r.msg); if (r && r.ok) audio("chime"); redraw(); });
    });
  };

  D._put = put; // (tests stand a place up by hand)

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
  /* ---- round 2 models: simple shapes, one look per kind ---- */
  function prim(list) {
    return function () {
      var b = ME.builder();
      list.forEach(function (p) {
        b.color(p[1]).glow(p[2] || 0).push().translate(p[3], p[4], p[5]);
        if (p[0] === "box") b.box(p[6], p[7], p[8]);
        else if (p[0] === "cyl") b.cyl(p[9] || 6, p[6], p[7], p[8]);
        else if (p[0] === "cone") b.cone(p[8] || 6, p[6], p[7]);
        else b.scale(p[6], p[7], p[8]).sphere(0);
        b.pop();
      });
      b.glow(0);
      return b.finish();
    };
  }
  var ST = 0x8f8a99, DK = 0x4a4650, WD = 0x8a6a48, GL = 0x8ab8ff, GR = 0x4a9a3c, RD = 0xb04a3a, SN = 0xe0c890, YL = 0xffe27a;
  var M2 = {
    jars: [["cyl", 0xb86b45, 0, -0.3, 0, 0, 0.16, 0.22, 0.45], ["cyl", 0xa85a3a, 0, 0.15, 0, 0.2, 0.14, 0.2, 0.36], ["cyl", 0xc47a50, 0, 0.3, 0, -0.2, 0.12, 0.16, 0.3]],
    fallen: [["box", 0x7a4a26, 0, 0, 0.22, 0, 1.7, 0.4, 0.42], ["ball", GR, 0, 0.9, 0.3, 0.1, 0.4, 0.3, 0.4], ["cyl", 0x5e3d26, 0, -0.9, 0, 0.1, 0.24, 0.2, 0.3]],
    statue: [["box", ST, 0, 0, 0.12, 0, 0.6, 0.24, 0.6], ["ball", 0x9d98a3, 0, 0, 0.62, 0, 0.3, 0.4, 0.28], ["ball", 0x9d98a3, 0, 0, 1.1, 0, 0.22, 0.2, 0.22], ["ball", 0x7d7888, 0, 0.5, 0.2, 0.2, 0.14, 0.2, 0.14]],
    locker: [["box", 0x6f7a8a, 0, 0, 0.5, 0, 0.6, 1, 0.5], ["box", YL, 0.5, 0, 0.55, 0.26, 0.12, 0.16, 0.03]],
    biolocker: [["box", 0x3a3848, 0, 0, 0.45, 0, 0.8, 0.9, 0.6], ["box", 0xb59aff, 0.7, 0, 0.5, 0.31, 0.5, 0.08, 0.03], ["box", 0xb59aff, 0.7, 0, 0.5, 0.31, 0.08, 0.5, 0.03]],
    gate: [["box", ST, 0, -0.6, 0.8, 0, 0.22, 1.6, 0.22], ["box", ST, 0, 0.6, 0.6, 0, 0.22, 1.2, 0.22], ["box", 0x7d7888, 0, 0.1, 1.65, 0, 1.1, 0.2, 0.22], ["ball", GL, 0.6, 0, 0.7, 0, 0.3, 0.5, 0.04]],
    tunnel: [["ball", 0x8a8590, 0, 0, 0.3, 0, 0.9, 0.75, 0.7], ["ball", 0x1a1a22, 0, 0, 0.32, 0.36, 0.45, 0.45, 0.4]],
    oasis: [["cyl", 0x5fc9c0, 0.2, 0, 0.02, 0, 1, 1, 0.05, 12], ["cyl", WD, 0, 0.9, 0, 0.3, 0.07, 0.05, 1.5], ["ball", 0x62bc4c, 0, 0.9, 1.6, 0.3, 0.6, 0.18, 0.6], ["cyl", WD, 0, -0.8, 0, -0.5, 0.06, 0.05, 1.2], ["ball", 0x62bc4c, 0, -0.8, 1.3, -0.5, 0.5, 0.15, 0.5]],
    hut: [["ball", 0xe7eef5, 0, 0, 0.1, 0, 0.9, 0.75, 0.9], ["box", 0x3a2a20, 0, 0, 0.3, 0.82, 0.34, 0.5, 0.1], ["ball", 0xffa040, 0.7, 0.5, 0.6, 0.7, 0.07, 0.09, 0.07]],
    lava: [["cyl", 0x2a2522, 0, 0, 0.02, 0, 1.2, 1.2, 0.06, 10], ["cyl", 0xff5a2a, 0.9, 0, 0.06, 0, 0.95, 0.95, 0.05, 10], ["ball", 0xffd76a, 1, 0.3, 0.14, 0.2, 0.16, 0.08, 0.16], ["ball", 0xe6d24a, 0, -1, 0.1, 0.4, 0.2, 0.12, 0.18]],
    scree: [["ball", 0x8a8590, 0, 0, 0.12, 0, 0.5, 0.24, 0.4], ["ball", 0x9d98a3, 0, 0.5, 0.1, 0.3, 0.3, 0.2, 0.26], ["ball", 0x46526c, 0, -0.4, 0.1, 0.3, 0.2, 0.14, 0.2], ["ball", 0x7d7888, 0, 0.1, 0.1, -0.5, 0.26, 0.16, 0.24]],
    summit: [["cone", 0x9d98a3, 0, 0, 0, 0, 0.9, 1.4], ["cone", 0xf5f8fc, 0, 0, 0.9, 0, 0.36, 0.56], ["cyl", WD, 0, 0, 1.4, 0, 0.03, 0.03, 0.8, 4], ["box", RD, 0, 0.2, 2.05, 0, 0.36, 0.22, 0.02]],
    giant: [["ball", 0x8a7a6a, 0, 0, 0.9, 0, 0.9, 0.9, 0.75], ["ball", 0x9a8a7a, 0, 0, 1.75, 0.35, 0.45, 0.4, 0.42], ["ball", 0x1a1a22, 0, 0.16, 1.85, 0.72, 0.05, 0.06, 0.04], ["ball", 0x1a1a22, 0, -0.16, 1.85, 0.72, 0.05, 0.06, 0.04], ["ball", 0x9d98a3, 0, 1.2, 0.4, 0.3, 0.6, 0.5, 0.5]],
    oldtree: [["cyl", 0x5e3d26, 0, 0, 0, 0, 0.5, 0.32, 2.2, 7], ["ball", 0x4a7a3c, 0, 0, 2.7, 0, 1.3, 0.9, 1.3], ["ball", 0x1a1a22, 0, 0.16, 1.3, 0.38, 0.07, 0.05, 0.05], ["ball", 0x1a1a22, 0, -0.16, 1.3, 0.38, 0.07, 0.05, 0.05], ["box", 0x1a1a22, 0, 0, 1.05, 0.4, 0.3, 0.05, 0.05]],
    pool: [["cyl", ST, 0, 0, 0, 0, 1, 1.05, 0.14, 10], ["cyl", 0xdff6ff, 0.8, 0, 0.12, 0, 0.85, 0.85, 0.05, 10]],
    sword: [["ball", 0x8a8590, 0, 0, 0.2, 0, 0.6, 0.42, 0.5], ["box", 0xdff6ff, 0.6, 0, 0.9, 0, 0.08, 0.9, 0.03], ["box", 0xd8b24a, 0, 0, 1.3, 0, 0.3, 0.06, 0.06]],
    vault: [["box", 0x7d7888, 0, 0, 0.7, 0, 1.5, 1.4, 0.7], ["box", 0xd8b24a, 0.5, 0, 0.6, 0.36, 0.5, 0.9, 0.03], ["box", ST, 0, 0, 1.5, 0, 1.8, 0.2, 0.9]],
    haunt: [["box", 0x5a5560, 0, -0.7, 0.6, 0, 0.2, 1.2, 0.9], ["box", 0x5a5560, 0, 0.7, 0.45, 0, 0.2, 0.9, 0.9], ["box", 0x4a4650, 0, 0, 0.08, 0, 1.6, 0.16, 1], ["ball", 0xcfeeff, 0.8, 0, 0.9, 0, 0.16, 0.26, 0.16]],
    grove: [["ball", 0x3a6a34, 0, 0, 0.5, 0, 1.2, 0.7, 1.2], ["cone", 0x2f7c4e, 0, 0.3, 0.6, 0.2, 0.5, 1.4], ["cone", 0x2f7c4e, 0, -0.4, 0.5, -0.2, 0.45, 1.2]],
    midden: [["ball", 0x7a6a4a, 0, 0, 0.1, 0, 0.7, 0.3, 0.6], ["box", WD, 0, 0.2, 0.36, 0.1, 0.4, 0.06, 0.08], ["ball", 0xe6dcc0, 0, -0.2, 0.34, 0, 0.1, 0.06, 0.1]],
    notes: [["box", ST, 0, -0.6, 0.35, 0, 0.3, 0.7, 0.24], ["box", 0x7d7888, 0, 0, 0.5, 0, 0.3, 1, 0.24], ["box", ST, 0, 0.6, 0.65, 0, 0.3, 1.3, 0.24], ["ball", YL, 0.6, 0, 1.15, 0, 0.08, 0.08, 0.08]],
    shaft: [["box", WD, 0, -0.45, 0.6, 0, 0.14, 1.2, 0.14], ["box", WD, 0, 0.45, 0.6, 0, 0.14, 1.2, 0.14], ["box", WD, 0, 0, 1.25, 0, 1.2, 0.14, 0.16], ["box", 0x1a1a22, 0, 0, 0.55, -0.1, 0.76, 1.1, 0.1]],
    tomb: [["ball", 0x6a8a4a, 0, 0, 0.1, 0, 1.3, 0.9, 1.1], ["box", ST, 0, 0, 0.45, 0.95, 0.7, 0.9, 0.16], ["box", 0x1a1a22, 0, 0, 0.36, 1.04, 0.36, 0.7, 0.04]],
    pyramid: [["cone", SN, 0, 0, 0, 0, 1.3, 1.3, 4], ["box", 0x6f7a8a, 0, 0.5, 0.3, 0.6, 0.7, 0.6, 0.5], ["box", GL, 0.5, 0.5, 0.36, 0.86, 0.2, 0.3, 0.02]],
    temple: [["box", 0x7d8a70, 0, 0, 0.3, 0, 1.8, 0.6, 1.4], ["box", 0x8f9a80, 0, 0, 0.85, 0, 1.2, 0.5, 0.9], ["box", 0x1a1a22, 0, 0, 0.3, 0.71, 0.4, 0.5, 0.04], ["ball", GR, 0, 0.6, 0.9, 0.4, 0.5, 0.3, 0.4], ["ball", GR, 0, -0.7, 0.5, 0.5, 0.4, 0.4, 0.3]],
    hall: [["box", 0x4a3a2e, 0, 0, 0.6, 0, 2, 1.2, 1.3], ["cone", 0x2a2522, 0, 0, 1.2, 0, 1.5, 0.9, 4], ["box", 0xff5a2a, 0.6, 0, 0.4, 0.66, 0.36, 0.6, 0.03]],
    fort: [["box", 0x3a3438, 0, 0, 0.6, 0, 1.8, 1.2, 1.4], ["box", 0x4a4248, 0, -0.8, 1.45, 0, 0.36, 0.5, 0.36], ["box", 0x4a4248, 0, 0.8, 1.45, 0, 0.36, 0.5, 0.36], ["box", 0xff5a2a, 0.7, 0, 0.4, 0.71, 0.4, 0.6, 0.03]],
    city: [["box", DK, 0, -0.7, 0.9, 0, 0.5, 1.8, 0.5], ["box", 0x5a5560, 0, 0.1, 0.6, 0.2, 0.6, 1.2, 0.5], ["box", DK, 0, 0.8, 1.1, -0.1, 0.4, 2.2, 0.4], ["box", 0x7dffb0, 0.5, 0.1, 0.5, 0.46, 0.14, 0.2, 0.02]],
    hull: [["cyl", 0xc9d2dc, 0, 0, 0, 0, 1.2, 0.9, 1.3, 8], ["box", 0x6f7a8a, 0, 0, 0.5, 1.05, 0.5, 0.8, 0.1], ["box", GL, 0.6, 0.6, 0.9, 0.8, 0.24, 0.2, 0.05], ["box", GL, 0.6, -0.6, 0.9, 0.8, 0.24, 0.2, 0.05]],
    sunk: [["ball", 0xa89a84, 0, 0, 0.2, 0, 0.7, 0.45, 0.6], ["cyl", WD, 0, 0.3, 0.5, 0, 0.03, 0.03, 0.9, 4], ["box", 0x5fc9c0, 0, 0.48, 1.25, 0, 0.32, 0.2, 0.02]],
    hollow: [["cyl", 0x6a4a30, 0, 0, 0, 0, 1, 0.8, 2.6, 8], ["box", 0x1a1a22, 0, 0, 0.5, 0.9, 0.5, 0.9, 0.1], ["ball", 0x34a052, 0, 0, 3.2, 0, 1.8, 1, 1.8]],
    web: [["cyl", WD, 0, -0.7, 0, 0, 0.1, 0.08, 1.6], ["cyl", WD, 0, 0.7, 0, 0, 0.1, 0.08, 1.6], ["box", 0xf5f3ed, 0, 0, 0.9, 0, 1.3, 0.9, 0.02], ["ball", 0xf5f3ed, 0, 0, 0.6, 0.1, 0.2, 0.34, 0.2]],
    sink: [["cyl", 0x4a4248, 0, 0, 0.01, 0, 1.1, 1.1, 0.05, 10], ["cyl", 0x0e0e12, 0, 0, 0.04, 0, 0.8, 0.8, 0.04, 10], ["ball", 0x8a8590, 0, 1, 0.1, 0.2, 0.26, 0.18, 0.22]],
    sewer: [["cyl", 0x6f6a80, 0, 0, 0, 0, 0.6, 0.6, 0.1, 8], ["box", 0x1a1a22, 0, 0, 0.11, 0, 0.8, 0.02, 0.08], ["box", 0x1a1a22, 0, 0, 0.11, 0, 0.08, 0.02, 0.8]],
    crack: [["ball", 0x8a8590, 0, -0.3, 0.3, 0, 0.4, 0.6, 0.5], ["ball", 0x9d98a3, 0, 0.3, 0.26, 0, 0.4, 0.5, 0.5], ["box", 0x0e0e12, 0, 0, 0.2, 0.3, 0.12, 0.36, 0.3]],
    pale: [["cyl", 0xd8d4dc, 0, -0.5, 0, 0, 0.12, 0.08, 1.9], ["ball", 0xc8c4cc, 0, -0.5, 2.1, 0, 0.6, 0.5, 0.6], ["cyl", 0xd8d4dc, 0, 0.6, 0, 0.3, 0.1, 0.07, 1.5], ["ball", 0xc8c4cc, 0, 0.6, 1.7, 0.3, 0.5, 0.4, 0.5]],
    altar: [["box", 0x1a1a22, 0, 0, 0.3, 0, 0.9, 0.6, 0.6], ["ball", 0x6a3a8a, 0.7, 0, 0.75, 0, 0.16, 0.16, 0.16]],
    vein: [["ball", 0x55505a, 0, 0, 0.2, 0, 0.6, 0.42, 0.5], ["box", 0xe4ebf2, 0.4, 0.2, 0.45, 0.2, 0.2, 0.17, 0.18], ["box", 0x8fd8ff, 0.8, -0.2, 0.4, 0, 0.16, 0.16, 0.16]],
    crater: [["cyl", 0x4a3a2e, 0, 0, 0.01, 0, 1.2, 1.3, 0.12, 10], ["ball", 0x8fd8ff, 1, 0, 0.2, 0, 0.3, 0.24, 0.3]],
    rod: [["cyl", WD, 0, 0, 0, 0, 0.05, 0.04, 2.2, 5], ["cone", 0xc9d2dc, 0.3, 0, 2.2, 0, 0.08, 0.4, 5]],
    expcamp: [["cone", 0xd8c8a8, 0, -0.4, 0, 0, 0.7, 0.9, 4], ["ball", 0xffa040, 0.9, 0.7, 0.12, 0.3, 0.12, 0.16, 0.12], ["cyl", 0x4a3a2e, 0, 0.7, 0, 0.3, 0.26, 0.26, 0.06, 8]]
  };
  var N2 = {
    u_crate: [["box", 0x8a9aa8, 0, 0, 0.26, 0, 0.6, 0.52, 0.5], ["box", GL, 0.4, 0, 0.3, 0.26, 0.3, 0.08, 0.02]],
    u_jar: [["cyl", 0xb86b45, 0, 0, 0, 0, 0.16, 0.24, 0.5], ["cyl", 0x8a4a30, 0, 0, 0.5, 0, 0.12, 0.1, 0.06]],
    u_pool: [["cyl", DK, 0, 0, 0, 0, 0.7, 0.75, 0.06, 10], ["cyl", 0x26404a, 0.15, 0, 0.05, 0, 0.6, 0.6, 0.03, 10]],
    u_brim: [["ball", 0x55505a, 0, 0, 0.16, 0, 0.55, 0.32, 0.5], ["box", 0xe6d24a, 0.3, 0.15, 0.36, 0.1, 0.24, 0.16, 0.2], ["box", 0xe6d24a, 0.3, -0.2, 0.3, -0.1, 0.18, 0.14, 0.18]],
    u_crystal: [["ball", 0x6a6078, 0, 0, 0.12, 0, 0.45, 0.24, 0.4], ["cone", 0xb59aff, 0.8, 0.1, 0.15, 0, 0.14, 0.8, 5], ["cone", 0xc79aff, 0.8, -0.2, 0.15, 0.1, 0.1, 0.5, 5]],
    u_cap: [["cyl", 0xe8e0f0, 0, 0, 0, 0, 0.05, 0.05, 0.3, 5], ["ball", 0x8c70c4, 0.7, 0, 0.34, 0, 0.2, 0.1, 0.2], ["cyl", 0xe8e0f0, 0, 0.25, 0, 0.1, 0.04, 0.04, 0.2, 5], ["ball", 0x7dffb0, 0.7, 0.25, 0.22, 0.1, 0.14, 0.07, 0.14]],
    u_cell: [["box", 0x6f7a8a, 0, 0, 0.3, 0, 0.6, 0.6, 0.3], ["cyl", 0x7dffb0, 0.9, 0, 0.2, 0.18, 0.08, 0.08, 0.3, 6]],
    u_shell: [["ball", 0xa89a84, 0, 0, 0.06, 0, 0.5, 0.1, 0.45], ["ball", 0xf6c0c8, 0, 0.15, 0.14, 0.1, 0.14, 0.07, 0.12], ["ball", 0xf6f0ea, 0, -0.2, 0.13, -0.1, 0.12, 0.06, 0.1]],
    u_web: [["box", 0xf5f3ed, 0, 0, 0.5, 0, 0.9, 0.9, 0.03], ["box", 0xf5f3ed, 0, 0, 0.5, 0, 0.03, 0.9, 0.9]],
    u_hive: [["ball", 0xd8a23a, 0, 0, 0.4, 0, 0.3, 0.4, 0.3], ["ball", 0x3a2a20, 0, 0, 0.3, 0.26, 0.08, 0.08, 0.05]]
  };
  if (ME && ME.builder && ME.NODE_BUILDERS && ME.STRUCT_BUILDERS) {
    try {
      Object.keys(M2).forEach(function (k) { if (!ME.STRUCT_BUILDERS["poi_" + k]) ME.STRUCT_BUILDERS["poi_" + k] = prim(M2[k]); });
      Object.keys(N2).forEach(function (k) { if (!ME.NODE_BUILDERS[k]) ME.NODE_BUILDERS[k] = prim(N2[k]); });
    } catch (e) {}
  }
})();
