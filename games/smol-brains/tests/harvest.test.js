// harvest.js: the farm, the kitchen and the water. Fish kinds and a timed hook, bait and crab pots, hand-tilled beds
// with seasons, watering, stars and giants, named dishes with boosts, machines, foraging, tapping and the harvest tab.
// node games/smol-brains/tests/harvest.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4340, () => {
  const ctx = load();
  ["ext.js", "body.js", "possess.js", "home.js", "loot.js", "harvest.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, H = SB.Harvest, Surv = SB.Surv, W = SB.World, K = SB.KINDS; P.headless = true;
  const game = SB.Game.newGame(77); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  const w = game.world, nest = w.T.nest;
  let ev = []; ["fishCaught", "fishBite", "fishAway", "bedTilled", "bedSown", "bedRipe", "bedHarvest", "dishCooked", "buff", "machReady", "foraged", "bedsPecked", "bedsWithered"].forEach(n => SB.bus.on(n, d => ev.push(n)));
  const hold = k => { const v = Surv.inv(me); let i = v.s.findIndex(x => x && x.k === k); if (i < 0) { Surv.add(me, k, 1); i = v.s.findIndex(x => x && x.k === k); } if (i >= Surv.hotN(me)) { const j = 0; const t = v.s[j]; v.s[j] = v.s[i]; v.s[i] = t; i = j; } v.sel = i; return i; };
  const clearBag = () => { Surv.inv(me).s = Surv.inv(me).s.map(() => null); };
  const run = secs => { for (let t = 0; t < secs; t += 2) H.slow(game, 2); };
  const opt = t => P.options(game, me, t);
  const lab = o => (o && o.label) || "";
  const place = (x, z) => { me.x = x; me.z = z; me.px = x; me.pz = z; W.reveal(w, x, z, 12, true); };
  // open, dry ground near the nest
  const dry = (() => { for (let d = 8; d < 40; d += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = nest.x + Math.sin(a) * d, z = nest.z + Math.cos(a) * d; let ok = W.walkable(w, x, z, false) && W.depthAt(w, x, z) <= 0.02 && !waterIn(x, z, 6); if (ok) w.nodes.forEach(n => { if (SB.dist(n.x, n.z, x, z) < 5) ok = false; }); if (ok && !w.structures.some(s => SB.dist(s.x, s.z, x, z) < 6)) return { x, z }; } return null; })();
  function waterIn(x, z, r) { for (let dx = -r; dx <= r; dx += 1) for (let dz = -r; dz <= r; dz += 1) if (W.depthAt(w, x + dx, z + dz) > 0.02) return true; return false; }
  const waters = {}; for (let z = 6; z < w.T.N - 6; z += 2) for (let x = 6; x < w.T.N - 6; x += 2) if (W.depthAt(w, x, z) > 0.15) { const k = H.waterKind(game, x, z); if (!waters[k]) waters[k] = { x, z }; }
  // a spot on dry land with water within a couple of steps (for the crab pot)
  const shore = (() => { for (let z = 6; z < w.T.N - 6; z += 1) for (let x = 6; x < w.T.N - 6; x += 1) if (W.walkable(w, x, z, false) && W.depthAt(w, x, z) <= 0.02 && W.depthAt(w, x + 2, z) > 0.1 && W.walkable(w, x - 2, z, false) && W.depthAt(w, x - 2, z) <= 0.02 && W.isSeen(w, x, z) && !w.nodes.some(n => SB.dist(n.x, n.z, x, z) < 3)) return { x, z }; return null; })();

  console.log("1. the new things exist");
  check("nineteen fish and a crab, five of them great fish, all real food", H.FISH.length === 20 && H.GREAT.length === 5 && H.FISH.every(f => K[f.id] && Surv.edible(f.id)));
  check("every dish is a real item and only asks for real things", H.DISHES.length >= 20 && H.DISHES.every(d => K[d.id] && Surv.edible(d.id) && Object.keys(d.in).every(k => K[k] || H.GROUPS[k])));
  check("every crop has seeds and something to harvest", H.CROPS.length === 13 && H.CROPS.every(c => K[c.seed] && K[c.out] && c.s.length > 0));
  check("every machine is a building with a model and a price in real things", Object.keys(H.MACH).every(k => SB.STRUCTS[k] && H.MODELS[k] && Object.keys(H.MACH[k].cost).every(x => K[x])) && ["gardenbed", "gardenbed1", "gardenbed2", "gardenbed3"].every(k => SB.STRUCTS[k] && H.MODELS[k]));
  check("the new tools wear like tools", ["hoe", "sickle", "dipper", "finerod"].every(k => K[k].tool && Surv.TOOL[k] && Surv.TOOL[k].uses > 0));
  check("farming is a skill now", !!SB.Body.BY_ID.farm && SB.Body.xp(me, "farm", 1) === 0 && SB.Body.SKILLS.some(s => s.id === "farm"));
  check("old seeds turn up in chests and with pedlars", SB.Loot.TABLES.ruin.items.some(x => x[0] === "s_snowbulb") && SB.Loot.PACK.some(x => x[0] === "s_starmelon"));

  console.log("2. which fish, where and when");
  check("the island has sea, river and pond water", !!waters.sea && !!waters.river && !!waters.pond, Object.keys(waters).join(","));
  const names = (wk) => H.fishHere(game, waters[wk].x, waters[wk].z, null).map(f => f.id);
  w.season = 0; w.night = false; w.weather.rain = 0;
  check("spring river, by day: minnow and trout, no eel, no leaper", names("river").includes("minnow") && names("river").includes("trout") && !names("river").includes("mooneel") && !names("river").includes("leaper"), names("river").join(","));
  check("the sea has its own", names("sea").includes("silverling") && !names("sea").includes("minnow") && !names("sea").includes("trout"));
  w.night = true;
  check("the moon eel only at night", names("river").includes("mooneel") && names("sea").includes("mooneel"));
  w.night = false; w.weather.rain = 0.8;
  check("the whiskerfish only in the rain, and Grandmother Carp in spring rain", names("pond").includes("whiskerfish") && names("pond").includes("grandcarp"));
  w.weather.rain = 0; w.season = 2;
  check("autumn: the leaper runs, the trout is back, the carp stays", names("river").includes("leaper") && names("pond").includes("mudcarp") && !names("pond").includes("grandcarp"));
  w.season = 3;
  check("winter: icefin, and no carp", names("pond").includes("icefin") && !names("pond").includes("mudcarp"));
  w.season = 0;
  check("every water always has something to catch", ["sea", "river", "pond"].every(k => [0, 1, 2, 3].every(s => { w.season = s; return names(k).length > 0; })));
  w.season = 0;
  check("the log says where to look for each", /river/.test(H.fishHint(H.FISH_BY.trout)) && /night/.test(H.fishHint(H.FISH_BY.mooneel)) && /rain/.test(H.fishHint(H.FISH_BY.grandcarp)));

  console.log("3. the timed hook");
  const pond = waters.pond, wt = { type: "water", x: pond.x, z: pond.z };
  place(pond.x, pond.z);
  P.enter(game, me, { free: true });
  clearBag(); hold("rod");
  check("with a rod at the water: cast your line", lab(opt(wt).use) === "cast your line" && lab(opt(wt).ctx) === "cast your line");
  opt(wt).use.go();
  check("the line is out, and the hearts row says so", !!H.line() && H.line().phase === "wait" && H.chips(game, me).some(c => /line out/.test(c.text)));
  check("the button now waits for the bite", lab(opt(wt).use) === "wait for a bite");
  const early = H.pull(game, me);
  check("pulling too soon catches nothing and scares the fish", !early.ok && early.early && !!H.line() && H.line().t >= 1.2);
  let guard = 0; while (H.line() && H.line().phase === "wait" && guard++ < 400) H.tick(game, 0.05);
  check("then: a bite!", !!H.line() && H.line().phase === "bite" && ev.includes("fishBite") && lab(opt(wt).use) === "hook it!" && H.chips(game, me).some(c => c.bad));
  const n0 = Surv.list(me).reduce((a, x) => a + x.n, 0);
  check("hook it in time and it's yours", opt(wt).use.go() === true && !H.line() && Surv.list(me).reduce((a, x) => a + x.n, 0) > n0);
  // fish until a real fish comes up (junk and crates are possible)
  let caught = null;
  for (let i = 0; i < 30 && !caught; i++) { H.cast(game, me, pond.x, pond.z); let g = 0; while (H.line() && H.line().phase === "wait" && g++ < 400) H.tick(game, 0.05); const r = H.pull(game, me); if (r.fish) caught = r; }
  check("a fish: a real item, with a size, in the log", !!caught && Surv.count(me, caught.fish, true) >= 1 && caught.size >= H.FISH_BY[caught.fish].min && H.state(game).fish[caught.fish].best >= caught.size && ev.includes("fishCaught"), caught && caught.msg);
  H.cast(game, me, pond.x, pond.z);
  const before = JSON.stringify(Surv.list(me)); guard = 0;
  while (H.line() && guard++ < 2000) H.tick(game, 0.05);
  check("too slow and it gets away", !H.line() && ev.includes("fishAway") && JSON.stringify(Surv.list(me)) === before);
  H.cast(game, me, pond.x, pond.z); place(pond.x + 6, pond.z); H.tick(game, 0.05);
  check("walk off and the line goes slack", !H.line());
  place(pond.x, pond.z);
  const rodWin = []; for (let i = 0; i < 12; i++) { const r = H.cast(game, me, pond.x, pond.z); rodWin.push([H.line().res.fish ? H.line().res.fish.rare : 1, r.win]); H.reel(); }
  hold("finerod");
  const fineWin = []; for (let i = 0; i < 12; i++) { const r = H.cast(game, me, pond.x, pond.z); fineWin.push([H.line().res.fish ? H.line().res.fish.rare : 1, r.win]); H.reel(); }
  check("a better rod gives longer to hook", Math.max(...fineWin.map(x => x[1])) > Math.max(...rodWin.map(x => x[1])) + 0.4);
  const byRare = {}; for (let i = 0; i < 80 && Object.keys(byRare).length < 2; i++) { const r = H.cast(game, me, pond.x, pond.z); byRare[H.line().res.fish ? H.line().res.fish.rare : 1] = r.win; H.reel(); }
  const rk = Object.keys(byRare).map(Number).sort();
  check("a rarer fish gives less", rk.length >= 2 && byRare[rk[1]] < byRare[rk[0]], JSON.stringify(byRare));
  Surv.add(me, "bait", 2);
  H.cast(game, me, pond.x, pond.z);
  check("bait goes on the hook, one a cast", H.line().bait === "bait" && Surv.count(me, "bait", true) === 1);
  H.reel();
  const perfect = H.land(game, me, { res: { fish: H.FISH_BY.mudcarp, size: 40 }, at: 0.05, win: 1, tool: "finerod" });
  const sloppy = H.land(game, me, { res: { fish: H.FISH_BY.mudcarp, size: 40 }, at: 0.9, win: 1, tool: "finerod" });
  check("a perfect hook lands a bigger fish", perfect.perfect && perfect.size > sloppy.size && !sloppy.perfect);
  const crate = H.land(game, me, { res: { crate: true }, at: 0.5, win: 1, tool: "finerod" });
  check("a sunk pod crate holds ark things", crate.ok && crate.crate && Surv.count(me, "s_starmelon", true) >= 1 && H.state(game).crates === 1);
  const junk = H.land(game, me, { res: { junk: "oldboot" }, at: 0.5, win: 1, tool: "finerod" });
  check("and sometimes it's a boot", junk.ok && Surv.count(me, "oldboot", true) === 1);
  // great fish: only on a line, only once
  w.season = 0; w.weather.rain = 0.8;
  let great = 0, greatSpear = 0;
  for (let i = 0; i < 400; i++) { const r = SB.rng(1000 + i); if ((H.rollCatch(game, me, { x: pond.x, z: pond.z, tool: "rod", r }).fish || {}).rare === 4) great++; const r2 = SB.rng(1000 + i); if ((H.rollCatch(game, me, { x: pond.x, z: pond.z, tool: "spear", r: r2 }).fish || {}).rare > 2) greatSpear++; }
  H.state(game).fish.grandcarp = { n: 1, best: 120, d: 1 };
  let again = 0; for (let i = 0; i < 400; i++) { if ((H.rollCatch(game, me, { x: pond.x, z: pond.z, tool: "rod", r: SB.rng(1000 + i) }).fish || {}).id === "grandcarp") again++; }
  check("a great fish can be hooked on a line, never on a spear, and only once", great > 0 && greatSpear === 0 && again === 0, great + " in 400");
  w.weather.rain = 0;
  const bug = W.add(w, game, "beetle", me.x + 0.5, me.z + 0.5, {});
  const b0 = Surv.count(me, "bait", true);
  check("a beetle can be caught for bait", lab(opt({ type: "item", id: bug.id }).pick) === "catch it for bait" && opt({ type: "item", id: bug.id }).pick.go() && Surv.count(me, "bait", true) === b0 + 2);
  hold("bait");
  check("bait thrown on the water draws the fish", lab(opt(wt).use) === "throw bait in" && opt(wt).use.go() && H.state(game).chum.until > game.time);

  console.log("4. a crab pot");
  place(shore.x, shore.z); clearBag();
  check("it needs its reeds and sticks", !H.make(game, me, "crabpot").ok);
  Surv.add(me, "fiber", 3); Surv.add(me, "stick", 2);
  const potR = H.make(game, me, "crabpot"), pot = potR.st;
  check("set at the water's edge", potR.ok && pot.kind === "crabpot" && W.depthAt(w, pot.x, pot.z) <= 0.02 && Surv.count(me, "fiber", true) === 0, potR.msg);
  check("nothing in it yet", !H.ready(pot) && lab(opt({ type: "struct", id: pot.id }).use).length > 0 && opt({ type: "struct", id: pot.id }).use.locked);
  run(540);
  check("come back later: something walked in", H.ready(pot) && /^take the/.test(lab(opt({ type: "struct", id: pot.id }).use)));
  const potKind = pot.data.out;
  check("and it goes in your bag", opt({ type: "struct", id: pot.id }).use.go() && Surv.count(me, potKind, true) >= 1 && !H.ready(pot));
  check("take it down and you get the pieces back", opt({ type: "struct", id: pot.id }).place.go() && !w.structures.includes(pot) && Surv.count(me, "fiber", true) === 3);

  console.log("5. a garden bed: till, sow, water");
  place(dry.x, dry.z); clearBag(); w.season = 0; w.weather.rain = 0;
  Surv.add(me, "stick", 2); Surv.add(me, "stone", 1); Surv.add(me, "vine", 1);
  check("a hoe from a stick, a rock and a vine", H.make(game, me, "hoe").ok && Surv.count(me, "hoe", true) === 1 && Surv.count(me, "stick", true) === 0);
  hold("hoe");
  check("hold it, look at the ground: till a bed", lab(opt(null).use) === "till a bed here");
  const tillSaid = (opt(null).use.go(), P.state().lastSay);
  const bed = H.beds(game)[0];
  if (!bed) console.log("   till said:", tillSaid, JSON.stringify(dry), W.isSeen(w, dry.x, dry.z), Surv.heldKind(me), JSON.stringify(H.spot(game, me, 0.5)));
  check("a garden bed", !!bed && bed.kind === "gardenbed" && SB.dist(bed.x, bed.z, me.x, me.z) < 5 && ev.includes("bedTilled"));
  const bref = { type: "struct", id: bed.id };
  check("an empty bed says what it wants", /hold seeds/.test(lab(opt(bref).use)) && opt(bref).use.locked);
  Surv.add(me, "s_grain", 1); hold("s_grain");
  check("grain won't go in in spring", !H.sow(game, me, bed, "s_grain").ok && /summer/.test(H.sow(game, me, bed, "s_grain").msg) && Surv.count(me, "s_grain", true) === 1);
  Surv.add(me, "s_sunroot", 3); hold("s_sunroot");
  check("sunroot will", lab(opt(bref).use) === "sow sunroot" && opt(bref).use.go() && bed.data.crop === "sunroot" && bed.kind === "gardenbed1" && Surv.count(me, "s_sunroot", true) === 2);
  // a second bed, left dry
  hold("hoe"); const t2 = H.till(game, me), bed2 = t2.st;
  H.sow(game, me, bed2, "s_sunroot");
  Surv.add(me, "leaves", 2); Surv.add(me, "vine", 1);
  check("a leaf cup to carry water", H.make(game, me, "dipper").ok);
  hold("dipper");
  check("empty, it waters nothing", opt(bref).use.locked && /empty/.test(lab(opt(bref).use)));
  check("fill it at any water", lab(opt(wt).use) === "fill your leaf cup" && opt(wt).use.go() && me.sip === 3);
  check("water the bed", lab(opt(bref).use) === "water the sunroot" && opt(bref).use.go() && bed.data.wet > 300 && me.sip === 2);
  check("not twice", opt(bref).use.locked);
  run(310);
  check("watered, it ripens; dry, it lags", H.ripe(bed) && bed.kind === "gardenbed3" && !H.ripe(bed2) && bed2.data.g < 0.5 && ev.includes("bedRipe"), "dry bed at " + bed2.data.g.toFixed(2));
  check("care shows as stars", bed.data.q >= 1 && /★/.test(H.bedText(game, bed)));
  hold("dipper");
  const h1 = (() => { const o = opt(bref); return lab(o.use) === "harvest the sunroot" && lab(o.ctx) === "harvest the sunroot" ? H.reap(game, me, bed) : { ok: false }; })();
  check("harvest: sunroots in the bag, and the bed is bare again", h1.ok && Surv.count(me, "carrot", true) === h1.n && h1.n >= 2 && bed.data.crop == null && bed.kind === "gardenbed" && H.state(game).crops.sunroot.n === h1.n, h1.msg);
  w.weather.rain = 0.8; run(4);
  check("rain waters for you", bed2.data.wet > 0);
  w.weather.rain = 0;
  Surv.add(me, "leaves", 3); Surv.add(me, "oldboot", 1);
  check("compost from leaves and scraps", H.make(game, me, "compost").ok && Surv.count(me, "compost", true) === 2 && Surv.count(me, "oldboot", true) === 0);
  const g0 = bed2.data.g; hold("compost");
  check("dug in, the crop jumps up", lab(opt({ type: "struct", id: bed2.id }).use) === "dig in compost" && opt({ type: "struct", id: bed2.id }).use.go() && bed2.data.fert === 1 && bed2.data.g > g0 + 0.1);
  check("save seeds from what you grew", H.saveSeeds(game, me, "carrot").ok && Surv.count(me, "s_sunroot", true) >= 3);

  console.log("6. seasons, regrowing, giants, birds");
  Surv.add(me, "s_berry", 1);
  check("a berry bramble fruits again after picking", H.sow(game, me, bed, "s_berry").ok && (() => { me.sip = 3; hold("dipper"); bed.data.wet = 0; H.water(game, me, bed); run(320); const r = H.harvest(game, me, bed); return r.ok && bed.data.crop === "berry" && bed.data.g < 1 && bed.data.g >= 0.45 && bed.kind === "gardenbed2"; })());
  bed2.data.g = 0.5; w.season = 1; const withered = H.turn(game);
  check("the season turns: sunroot withers, the summer bramble does not", withered === 1 && bed2.data.dead === 1 && !bed.data.dead && ev.includes("bedsWithered"));
  check("pull the dead stalks and the bed is ready", lab(opt({ type: "struct", id: bed2.id }).use) === "pull the dead stalks" && opt({ type: "struct", id: bed2.id }).use.go() && bed2.data.crop == null);
  // a block of well-kept gourds
  hold("hoe"); Surv.inv(me).s[Surv.inv(me).sel].w = 80;
  const gourds = []; for (let i = 0; i < 10; i++) { const t = H.till(game, me); if (t.ok) { Surv.add(me, "s_gourd", 1); Surv.add(me, "compost", 1); H.sow(game, me, t.st, "s_gourd"); H.feed(game, me, t.st); gourds.push(t.st); } }
  for (let t = 0; t < 400; t += 2) { gourds.forEach(b => { b.data.wet = 300; }); H.slow(game, 2); }
  const giants = gourds.filter(b => b.data.giant);
  check("fed and watered every day they come up two-star", gourds.length >= 8 && gourds.every(b => H.ripe(b) && b.data.q === 2));
  check("and a gourd among them grows giant", giants.length >= 1 && giants[0].s === 1.5 && /GIANT/.test(H.bedText(game, giants[0])), giants.length + " of " + gourds.length);
  const gh = H.harvest(game, me, giants[0]);
  check("a giant gourd is six gourds and more", gh.ok && gh.giant && gh.n >= 6 && H.state(game).crops.gourd.g === 1, gh.msg);
  Surv.add(me, "flint", 1); Surv.add(me, "stick", 1); Surv.add(me, "vine", 1); H.make(game, me, "sickle"); hold("sickle");
  const ripeBefore = gourds.filter(b => H.ripe(b)).length, sweep = H.reap(game, me, gourds.find(b => H.ripe(b)));
  check("a sickle reaps the beds beside it too", sweep.ok && sweep.more >= 1 && gourds.filter(b => H.ripe(b)).length <= ripeBefore - 2, sweep.msg);
  // birds
  clearBag(); gourds.forEach(b => { b.data.crop = "gourd"; b.data.g = 0.6; b.data.dead = 0; });
  let pecks = 0; for (let d = 0; d < 6; d++) { game.time += SB.DAY_LENGTH; pecks += H.dawn(game); }
  check("birds get at beds with no scarecrow", pecks > 0 && ev.includes("bedsPecked"), pecks + " pecks in 6 mornings");
  Surv.add(me, "stick", 3); Surv.add(me, "leaves", 2); Surv.add(me, "fiber", 1);
  const sc = H.make(game, me, "scarecrow");
  gourds.forEach(b => { b.data.g = 0.6; });
  let pecks2 = 0; for (let d = 0; d < 6; d++) { game.time += SB.DAY_LENGTH; H.dawn(game); } gourds.forEach(b => { if (SB.dist(b.x, b.z, sc.st.x, sc.st.z) <= 7 && b.data.g < 0.6) pecks2++; });
  check("a scarecrow keeps them off", sc.ok && pecks2 === 0);
  // the tribe's own farm
  const farm = W.addStructure(w, game, "farm", dry.x + 9, dry.z + 9, { done: true, rot: 0 }); farm.data.grow = 0.2;
  place(farm.x - 2, farm.z); me.sip = 2; hold("dipper");
  const fref = { type: "struct", id: farm.id };
  check("you can water the tribe's farm", lab(opt(fref).place) === "water the farm" && opt(fref).place.go() && farm.data.grow > 0.3 && me.sip === 1);
  Surv.add(me, "s_firepod", 1); hold("s_firepod");
  check("and tell it what to grow", lab(opt(fref).place) === "sow firepod here" && opt(fref).place.go() && farm.data.crop === "firepod");

  console.log("7. the kitchen");
  place(dry.x, dry.z); clearBag(); P.leave(); P.enter(game, me, { free: true });
  Surv.add(me, "minnow", 2); Surv.add(me, "carrot", 2); Surv.add(me, "pot", 1);
  check("no fire, no stew", /fire/.test(H.whyNotCook(game, me, "fishstew")) && !H.cook(game, me, "fishstew").ok);
  const fire = W.addStructure(w, game, "campfire", me.x + 1.5, me.z + 4, { done: true, rot: 0 });
  place(fire.x - 1.5, fire.z);
  check("at a lit fire the big button offers to cook", H.nearFire(game, me) && lab(opt({ type: "struct", id: fire.id }).pick) === "cook a dish");
  const ck = H.cook(game, me, "fishstew");
  check("fish stew: one fish and one sunroot gone, a stew in the bag, a page in the cookbook", ck.ok && ck.first && Surv.count(me, "fishstew", true) === 1 && Surv.count(me, "minnow", true) === 1 && Surv.count(me, "carrot", true) === 1 && H.state(game).dishes.fishstew.n === 1 && ev.includes("dishCooked"), ck.msg);
  me.chem.hunger = 0.7; hold("fishstew");
  check("eat it like any food", lab(opt(null).place) === "eat your fish stew" && opt(null).place.go() && Surv.count(me, "fishstew", true) === 0);
  check("and you're warm for five minutes: a chip by the hearts", H.has(me, "warm", game) && SB.Ext.vitals(game, me).some(c => /warm 5m/.test(c.text)) && ev.includes("buff"));
  me.chem.cold = 0.5; H.tick(game, 1);
  check("warm means the cold leaves you", me.chem.cold < 0.5);
  Surv.add(me, "mint", 2);
  check("herb tea is a drink: it has its own slot", H.cook(game, me, "herbtea").ok && (SB.bus.emit("povEat", { c: me, kind: "herbtea" }), H.has(me, "pep", game) && H.has(me, "warm", game) && H.buffs(me, game).length === 2));
  const S = P.state(); S.stam = 0.2; H.tick(game, 1);
  check("peppy: pep comes back faster", S.stam > 0.25);
  check("no boost, plain hits", SB.Ext.damage(game, me, {}, { hk: null, dmg: 1 }) === 1);
  H.giveBuff(game, me, "mighty", 60, "food", "firestew");
  check("mighty: a third harder (and it took the food slot from warm)", Math.abs(SB.Ext.damage(game, me, {}, { hk: null, dmg: 1 }) - 1.3) < 1e-9 && !H.has(me, "warm", game));
  H.giveBuff(game, me, "quick", 60, "food", "roastroots"); H.tick(game, 0.016);
  const x0 = me.x; me.x += 0.05; H.tick(game, 0.016);
  check("quick: each step carries further", me.x > x0 + 0.055);
  game.time += 700;
  check("boosts wear off", H.buffs(me, game).length === 0 && SB.Ext.vitals(game, me).length === 0);
  check("a recipe you don't know is a riddle until you carry a bit of it", !H.knows(game, me, "berrytart") && !/berry tart/.test(H.html(game, me)) && (Surv.add(me, "berry", 2), H.setPage("cook"), /berries and something ground/.test(H.html(game, me))));
  SB.Body.xp(me, "cook", 40);
  check("cooking levels teach recipes", SB.Body.level(me, "cook") >= 2 && H.knows(game, me, "berrytart") && /berry tart/.test(H.html(game, me)));
  me.chem.toxin = 0.5; SB.bus.emit("povEat", { c: me, kind: "honey" });
  check("honeycomb settles a bad shroom and mends you a little", me.chem.toxin < 0.5 && H.has(me, "hearty", game));
  SB.bus.emit("povEat", { c: me, kind: "mysterystew" });
  check("mystery stew does… something", H.buffs(me, game).length >= 1 || me.chem.sick > 0);

  console.log("8. machines");
  clearBag(); place(dry.x - 4, dry.z - 4);
  Surv.add(me, "stick", 4); Surv.add(me, "vine", 1);
  const rackR = H.make(game, me, "dryrack"), rack = rackR.st, rref = rack && { type: "struct", id: rack.id };
  check("a drying rack, set up just ahead", rackR.ok && rack.kind === "dryrack" && SB.dist(rack.x, rack.z, me.x, me.z) < 5 && Surv.count(me, "stick", true) === 0);
  check("empty, it says what it takes", opt(rref).use.locked && /fruit/.test(lab(opt(rref).use)));
  Surv.add(me, "berry", 2); hold("berry");
  check("put your berries in", lab(opt(rref).use) === "put your berries in" && opt(rref).use.go() && opt(rref).use.go() && rack.data.n === 2 && Surv.count(me, "berry", true) === 0);
  check("it takes time", !H.ready(rack) && /drying/.test(H.machText(rack)));
  run(310);
  check("dried fruit, which never goes bad", H.ready(rack) && ev.includes("machReady") && opt(rref).use.go() && Surv.count(me, "driedfruit", true) === 2 && !K.driedfruit.rots);
  Surv.add(me, "clay", 3); Surv.add(me, "stone", 7); Surv.add(me, "stick", 3);
  const crock = H.make(game, me, "crock").st, quern = H.make(game, me, "quern").st, smoker = H.make(game, me, "smoker").st;
  Surv.add(me, "honey", 1); Surv.add(me, "grain", 1); Surv.add(me, "trout", 1);
  check("a crock, a quern and a smoker", !!crock && !!quern && !!smoker && H.load(game, me, crock, "honey").ok && H.load(game, me, quern, "grain").ok && H.load(game, me, smoker, "trout").ok && !H.load(game, me, quern, "stick").ok);
  run(410);
  check("honey fizz, flour and smoked fish", H.unload(game, me, crock).kind === "fizz" && H.unload(game, me, quern).kind === "flour" && H.unload(game, me, smoker).kind === "smokedfish");
  Surv.add(me, "nutmeat", 1);
  check("trail mix needs no fire", !H.nearFire(game, me) && H.cook(game, me, "trailmix").ok && Surv.count(me, "trailmix", true) === 1);
  Surv.add(me, "stick", 4); Surv.add(me, "honey", 1);
  const box = H.make(game, me, "beebox").st;
  w.season = 3; run(720);
  const winterHoney = box.data.n || 0;
  w.season = 0; run(720);
  check("a bee box gives honeycomb, but not in winter", !!box && winterHoney === 0 && box.data.n >= 1 && H.unload(game, me, box).kind === "honey");

  console.log("9. foraging and tapping");
  clearBag(); w.season = 0;
  const trees = w.nodes.filter(n => n.kind === "oak" && n.state === "ok" && (n.grow == null || n.grow >= 1));
  place(trees[0].x + 1, trees[0].z);
  const nref = { type: "node", id: trees[0].id };
  check("look under a tree", lab(opt(nref).place) === "look for wild food" && opt(nref).place.go() === true);
  check("once a day each", !H.canForage(game, trees[0]) && lab(opt(nref).place) !== "look for wild food");
  let leeks = 0; trees.slice(1, 40).forEach(n => { place(n.x + 1, n.z); const r = H.forage(game, me, n); if (r.found === "leek") leeks++; });
  check("spring under the oaks: wild leeks", leeks >= 3 && Surv.count(me, "leek", true) >= 3 && H.state(game).forage.leek >= 3 && ev.includes("foraged"), leeks + " leeks");
  game.time += SB.DAY_LENGTH; w.season = 3; clearBag();
  place(trees[0].x + 1, trees[0].z);
  check("a new day, and in winter you dig under the snow", lab(opt(nref).place) === "dig under the snow");
  let roots = 0; trees.slice(0, 40).forEach(n => { place(n.x + 1, n.z); if (H.forage(game, me, n).found === "snowroot") roots++; });
  check("winter gives snowroot, not leeks", roots >= 3 && Surv.count(me, "snowroot", true) === roots);
  w.season = 0;
  Surv.add(me, "stick", 1); Surv.add(me, "flint", 1); H.make(game, me, "tapper"); hold("tapper");
  const tree = trees[1]; place(tree.x + 1, tree.z); const tref = { type: "node", id: tree.id };
  check("tap a tree", lab(opt(tref).place) === "tap the apple tree" && opt(tref).place.go() && H.tapState(game, tree) === "dripping" && Surv.count(me, "tapper", true) === 0);
  check("not yet", !H.collectSap(game, me, tree).ok);
  game.time += 520;
  check("later: sweet sap", lab(opt(tref).pick) === "collect the sap" && opt(tref).pick.go() && Surv.count(me, "sap", true) === 1 && H.tapState(game, tree) === "dripping");

  console.log("10. the harvest tab, saving, and nothing breaks");
  const tab = SB.Ext.tabById("harvest");
  check("there is a harvest tab in the bag", !!tab && tab.show(game, me) && /harvest/.test(tab.label(game, me)));
  H.setPage("fish");
  check("the fish log lists what you caught and hints at the rest", /the fish log/.test(H.html(game, me)) && /biggest \d+ cm/.test(H.html(game, me)) && /not caught yet/.test(H.html(game, me)));
  H.setPage("crops");
  check("the crop log knows your beds and your giants", /your beds: \d+/.test(H.html(game, me)) && /giants \d/.test(H.html(game, me)) && /wild leek/.test(H.html(game, me)));
  H.setPage("make");
  check("the make page lists tools and machines, and what practice gives", /data-hvmake='hoe'/.test(H.html(game, me)) && /data-hvmake='smoker'/.test(H.html(game, me)) && /farming/.test(H.html(game, me)));
  H.setPage("cook");
  check("the cookbook counts what you cooked", /cooked ×1/.test(H.html(game, me)) && /data-hvcook='fishstew'/.test(H.html(game, me)));
  const fd = H.found(game); let goals = [];
  SB.Ext.goals(game, (t, p) => goals.push(t + " " + p));
  check("the book adds up, and the sky's goals show it", fd.fish >= 2 && fd.dishes >= 3 && fd.crops >= 3 && goals.some(g => g.includes(fd.n + "/" + fd.of)), fd.n + "/" + fd.of);
  const saved = JSON.parse(JSON.stringify({ q: game.quests.harvest, bed: bed.data, buff: me.buff, sip: me.sip, skill: me.body.sk.farm }));
  check("it all saves: the logs, a bed's crop, a smol's boosts and skill", saved.q.fish.grandcarp.n === 1 && saved.q.dishes.fishstew.n === 1 && saved.q.crops.gourd.g >= 1 && saved.bed.crop === "berry" && !!saved.buff && saved.skill.l >= 1);
  check("a bed keeps its stage through a save (its kind is the stage)", ["gardenbed", "gardenbed1", "gardenbed2", "gardenbed3"].includes(bed.kind) && SB.STRUCTS[bed.kind].r === 0.5);
  check("farming grew by doing", SB.Body.level(me, "farm") >= 2, "level " + SB.Body.level(me, "farm"));
  // every kind of thing you can look at, with every new thing in hand: no handler may throw
  const refs = [null, wt, bref, rref, fref, nref, { type: "struct", id: fire.id }, { type: "creature", id: (SB.Game.smols(game)[1] || me).id }];
  ["hoe", "sickle", "dipper", "finerod", "rod", "spear", "bait", "compost", "tapper", "s_gourd", "seed", "pot", "berry", "jam"].forEach(k => { clearBag(); hold(k); refs.forEach(r => opt(r)); });
  P.leave();
  let threw = null;
  try { H.tick(game, 0.5); H.slow(game, 2); H.html(game, me); H.chips(game, me); const old = game.quests.harvest; delete game.quests.harvest; H.tick(game, 3); H.html(game, me); H.dawn(game); H.turn(game); SB.Ext.vitals(game, me); game.quests.harvest = old; game.offline = true; H.tick(game, 5); game.offline = false; const g2 = SB.Game.newGame(5); H.tick(g2, 3); H.html(g2, SB.Game.smols(g2)[0] || me); } catch (e) { threw = e; }
  check("nobody in a body, an old save, an offline island, a brand-new island: nothing throws", !threw, threw && threw.stack);
  check("none of the plug-in handlers was switched off", ["tick", "options", "damage", "vitals", "goals"].every(k => SB.Ext._handlers[k].length >= 1 && SB.Ext._handlers[k].every(h => !h._off)));
});

console.log("11. the file");
const src = js("harvest.js");
check("old-phone javascript: no arrows, let, const, classes or template strings", !/=>/.test(src) && !/\b(let|const|class)\s/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").replace(/"(?:[^"\\]|\\.)*"/g, '""')) && !/`/.test(src) && /"use strict"/.test(src));
check("it never touches the island's own dice", !/game\.rng/.test(src));
check("it plugs in through ext.js and keeps its state on the quest board", /SB\.Ext\.on\("options"/.test(src) && /SB\.Ext\.tab\(/.test(src) && /q\.harvest/.test(src));

console.log(failed ? "\n" + failed + " failed, " + passed + " passed" : "\nall " + passed + " passed");
process.exit(failed ? 1 : 0);
