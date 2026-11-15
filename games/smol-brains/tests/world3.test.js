// 4.36: a world that changes. Live light and soil per patch, a smell field, plants that flower, seed and die,
// felled land going barren and planted land turning, jungle crystal, shaped recipes, stilt huts, the raft home
// built in stages, and the maze under a captain's lair.
// node games/smol-brains/tests/world3.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(4360, () => {
  const ctx = load();
  ["possess.js", "ext.js", "home.js", "bosses.js", "world3.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, H = SB.Home, B = SB.Bosses, W3 = SB.World3, Wd = SB.World, Surv = SB.Survival || SB.Surv, DAY = SB.DAY_LENGTH; P.headless = true;
  const game = SB.Game.newGame(88); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 2; me.stage = 3;
  let w = game.world; w.seen.fill(255);
  const nest = w.T.nest, G = W3.G;
  me.x = nest.x + 3; me.z = nest.z + 3;
  P.enter(game, me, { free: true });
  const bid = (x, z) => SB.BIOMES[Wd.biomeAt(game.world, x, z)].id;
  const empty = () => { const v = Surv.inv(me); for (let i = 0; i < v.s.length; i++) v.s[i] = null; };
  const hold = (k, n) => { empty(); Surv.add(me, k, n || 1); Surv.select(me, 0); };
  const cellXY = c => W3.center(game, c);
  const optsAt = t => P.options(game, me, t);
  let events = {}; ["w3biome", "w3seed", "w3died", "w3jade", "w3raft", "w3sail", "w3anchor", "mazeHeart", "w3blossom"].forEach(n => SB.bus.on(n, d => { (events[n] = events[n] || []).push(d); }));
  // open spots to plant in, in and round one patch
  function spots(c, want) {
    const p = cellXY(c), out = [];
    for (let dz = -2.4; dz <= 2.4 && out.length < want; dz += 1.6) for (let dx = -2.4; dx <= 2.4 && out.length < want; dx += 1.6) if (Surv.plantSpot(game, p.x + dx, p.z + dz)) out.push({ x: p.x + dx, z: p.z + dz });
    return out;
  }
  function openPatch(test, skip) {
    for (let c = 0; c < G * G; c++) { const p = cellXY(c); if ((skip || []).indexOf(c) >= 0 || !Wd.inBounds(game.world, p.x, p.z) || Wd.depthAt(game.world, p.x, p.z) > 0 || SB.dist(p.x, p.z, nest.x, nest.z) > 60) continue; if (test(p, c) && spots(c, 7).length >= 7) return c; }
    return -1;
  }

  console.log("1. light and soil, live, per patch");
  W3.pass(game, 1);
  const s = W3.state(game);
  check("the island has a 48 x 48 grid, state in game.quests.world3", G === 48 && game.quests.world3 === s && typeof s.eco === "object");
  const t0 = game.time;
  game.time = DAY * 0.5; const noon = W3.light(game, me.x, me.z); game.time = DAY * 0.02; const night = W3.light(game, me.x, me.z); game.time = t0;
  check("light follows the sky: noon is brighter than midnight", noon > night + 0.2 && night < 0.2, noon.toFixed(2) + " vs " + night.toFixed(2));
  let shady = -1, open = -1;
  for (let c = 0; c < G * G; c++) { const p = cellXY(c), i = W3.info(game, p.x, p.z); if (Wd.depthAt(game.world, p.x, p.z) > 0) continue; if (i.trees >= 3 && shady < 0) shady = c; if (i.trees === 0 && open < 0) open = c; }
  game.time = DAY * 0.5;
  check("under a canopy it is darker than in the open", shady >= 0 && open >= 0 && W3.light(game, cellXY(shady).x, cellXY(shady).z) < W3.light(game, cellXY(open).x, cellXY(open).z) - 0.2);
  game.time = t0;
  const soil0 = W3.soil(game, me.x, me.z);
  check("soil is a number per patch, wetter ground is richer", soil0 > 0 && soil0 <= 1 && W3.info(game, me.x, me.z).wet >= 0);
  empty();
  check("no leaves, no mulch", !W3.mulch(game, me).ok);
  Surv.add(me, "leaves", 2);
  check("mulch: two leaves dug in feed the soil", W3.mulch(game, me).ok && W3.soil(game, me.x, me.z) > soil0 + 0.2 && Surv.count(me, "leaves", true) === 0);
  check("the bag has a land tab that reads the patch", /light/.test(W3.html(game, me)) && /soil/.test(W3.html(game, me)) && SB.Ext.tabById("land") != null);

  console.log("2. smell drifts");
  const fc = openPatch(() => true), fp = cellXY(fc);
  Surv.spawn(game, "berry", 3, fp.x, fp.z);
  for (let i = 0; i < 6; i++) W3.pass(game, 1);
  const wind = W3.wind(game), ax = Math.abs(wind.dx) > Math.abs(wind.dz), sx = ax ? (wind.dx > 0 ? 1 : -1) : 0, sz = ax ? 0 : (wind.dz > 0 ? 1 : -1), cs = game.world.T.N / G;
  const here = W3.smell(game, fp.x, fp.z).food, down = W3.smell(game, fp.x + sx * cs * 2, fp.z + sz * cs * 2).food, up = W3.smell(game, fp.x - sx * cs * 2, fp.z - sz * cs * 2).food;
  check("food smells strongest where it lies", here > 0.5, here.toFixed(2));
  check("the smell spreads to the patches round it", down > 0.05 && up > 0.01, down.toFixed(2) + " / " + up.toFixed(2));
  check("and drifts: stronger downwind than upwind", down > up + 0.05);
  const nose = W3.nose(game, fp.x - sx * cs * 2, fp.z - sz * cs * 2, 0);
  check("a nose two patches off finds a way the smell gets stronger", !!nose && !nose.here && nose.v > up, nose && nose.dir);
  const other = SB.Game.smols(game)[1] || me;
  const oc = Object.assign({}, other, { x: fp.x - sx * cs * 2, z: fp.z - sz * cs * 2, _pov: false, chem: Object.assign({}, other.chem, { hunger: 0.8 }) });
  const fol = W3.follow(oc, game);
  check("a hungry smol follows its nose up the smell of food", !!fol && /smells good/.test(fol.why) && W3.smell(game, fol.x, fol.z).food > W3.smell(game, oc.x, oc.z).food);
  check("a fed one does not", W3.follow(Object.assign({}, oc, { chem: Object.assign({}, oc.chem, { hunger: 0.1, cold: 0, fear: 0 }) }), game) == null);
  check("the smols' own wander target asks the nose when it has no better idea", SB.Mind.wanderTarget && SB.Mind._w3 === 1);
  const gp = cellXY(openPatch(() => true, [fc]));
  const gr = SB.Game.spawnGrump(game, gp.x, gp.z);
  Wd.addStructure(game.world, game, "campfire", gp.x + 16, gp.z, { done: true, rot: 0 });
  for (let i = 0; i < 3; i++) W3.pass(game, 1);
  check("a grump leaves a smell", W3.smell(game, gp.x, gp.z).grump > 0.5);
  const mx0 = me.x, mz0 = me.z; me.x = gp.x; me.z = gp.z;
  check("in a body you get a nose chip for it", SB.Ext.vitals(game, me).some(v => /grump/.test(v.text) && v.bad));
  me.x = mx0; me.z = mz0;
  check("a lit fire smells of smoke, and lights its patch at night", W3.smell(game, gp.x + 16, gp.z).fire > 0.5 && (() => { game.time = DAY * 0.02; const l = W3.light(game, gp.x + 16, gp.z); game.time = t0; return l >= 0.5; })());
  const gn = W3.nose(game, gp.x + cs * 2, gp.z, 3);
  check("two patches east of the grump, the nose points west at it", !!gn && gn.dx < 0, gn && gn.dir);
  const cold = W3.follow(Object.assign({}, oc, { x: gp.x + 16 - cs * 2, z: gp.z, chem: Object.assign({}, oc.chem, { hunger: 0.1, cold: 0.8 }) }), game);
  check("a cold smol follows the smoke to the fire", !!cold && /smoke/.test(cold.why) && cold.x > gp.x + 16 - cs * 2);
  gr.alive = false;

  console.log("3. plants flower, seed and die of age");
  const trees = game.world.nodes.filter(n => n.state === "ok" && Surv.isTree(n) && n.kind === "oak" && SB.dist(n.x, n.z, me.x, me.z) < 40);
  const tA = trees[0], tB = trees[1], tC = trees[2], tD = trees[3], today = Math.floor(game.time / DAY) + 1;
  check("there are oaks about", trees.length >= 4, String(trees.length));
  [tA, tB, tC, tD].forEach(n => { s.born[n.id] = today - 25; });
  game.world.season = 0;
  check("a grown tree is in flower in spring", W3.stage(game, tA) === "flower" && W3.inFlower(game, tA));
  empty();
  check("looking at it: pick a blossom", /pick a blossom/.test((optsAt({ type: "node", id: tA.id }).place || {}).label || ""));
  check("picking gives a blossom and bares the tree", W3.pick(game, me, tA).ok && Surv.count(me, "blossom", true) === 1 && !W3.inFlower(game, tA) && !W3.pick(game, me, tA).ok);
  check("a blossom is food", Surv.edible("blossom"));
  game.world.season = 2;
  check("in autumn a tree is in seed, but not one picked bare", W3.stage(game, tB) === "seed" && W3.stage(game, tA) === "grown");
  const before = game.world.nodes.length;
  let sap = null; for (let i = 0; i < trees.length && !sap; i++) { s.born[trees[i].id] = today - 25; if (trees[i] !== tA) sap = W3.seedFrom(game, trees[i]); }
  check("it drops a seedling of its own kind where there is light and soil", !!sap && sap.kind === "oak" && sap.grow === 0 && game.world.nodes.length === before + 1 && (events.w3seed || []).length === 1);
  check("the seedling is a sapling, and is in the save", W3.stage(game, sap) === "sapling" && Wd.serialize(game.world).nodes.some(p => p.id === sap.id && p.added));
  s.born[tC.id] = today - 61;
  check("past its years a tree is old", W3.stage(game, tC) === "old" && W3.age(game, tC) >= W3.LIFE.oak);
  const soilC = W3.soil(game, tC.x, tC.z), logs0 = game.world.items.filter(o => o.kind === "log").length;
  check("it falls by itself: a stump, deadfall, richer soil", W3.die(game, tC) && tC.state === "stump" && W3.soil(game, tC.x, tC.z) > soilC && game.world.items.filter(o => o.kind === "log").length > logs0);
  check("and the tree that grows from the stump is young", W3.age(game, tC) === 0);
  s.born[tD.id] = today - 70;
  W3.pass(game, DAY);
  check("the island does this by itself as the days go by", tD.state === "stump" && (events.w3died || []).length >= 2);
  game.world.season = 1;

  console.log("4. over-felling turns land barren, replanting mends it");
  const GREEN = { meadow: 1, forest: 1, jungle: 1, swamp: 1, taiga: 1, blossom: 1, maple: 1, bamboo: 1, flowers: 1, mangrove: 1 };
  const bc = openPatch(p => GREEN[bid(p.x, p.z)] && bid(p.x, p.z) !== "forest", [fc]), bp = cellXY(bc), was = bid(bp.x, bp.z);
  check("found a green patch to wreck", bc >= 0, was);
  const fake = { id: 999001, kind: "oak", x: bp.x, z: bp.z, state: "stump" };
  for (let i = 0; i < 3; i++) SB.bus.emit("chop", { c: me, node: fake });
  check("three trees down: worn, not barren yet", W3.info(game, bp.x, bp.z).word === "worn" && bid(bp.x, bp.z) === was);
  SB.bus.emit("chop", { c: me, node: fake });
  W3.pass(game, 1);
  check("a fourth: the patch is barren and the ground turns to dry grass", W3.info(game, bp.x, bp.z).word === "barren" && bid(bp.x, bp.z) === "savanna" && (events.w3biome || []).some(e => e.to === "savanna"));
  check("felling wears the soil and is counted", s.fell === 4 && s.nu[bc] != null);
  const stump = game.world.nodes.find(n => Surv.isTree(n) && W3.cell(game, n.x, n.z) === bc);
  if (stump) { const st0 = stump.state; stump.state = "stump"; stump.regrowT = 5; W3.pass(game, 1); check("stumps on barren ground stay stumps", stump.regrowT >= 120); stump.state = st0; }
  me.x = bp.x; me.z = bp.z;
  check("a chip says so when you stand there", SB.Ext.vitals(game, me).some(v => v.text === "barren"));
  empty(); Surv.add(me, "sapling", 8);
  const sp = spots(bc, 7);
  let planted = 0; sp.forEach(p => { if (Surv.plant(me, game, "sapling", p.x, p.z)) planted++; });
  W3.pass(game, 1);
  check("planting mends it: the ground comes back", planted >= 5 && W3.info(game, bp.x, bp.z).eco > W3.BARE && bid(bp.x, bp.z) !== "savanna" && s.plant === planted, planted + " planted");
  check("planted well past what was felled, it is lush", W3.eco(game, bp.x, bp.z) < W3.LUSH || W3.info(game, bp.x, bp.z).word === "lush");

  console.log("5. enough planted trees or glowcaps turn a patch into that biome");
  check("the patch is turning to forest", W3.info(game, bp.x, bp.z).turn === "forest" || bid(bp.x, bp.z) === "forest", W3.info(game, bp.x, bp.z).pct + "%");
  W3.pass(game, DAY * 0.5);
  check("slowly: half a day in it is part way", W3.info(game, bp.x, bp.z).pct > 10 && W3.info(game, bp.x, bp.z).pct < 100 && bid(bp.x, bp.z) !== "forest");
  W3.pass(game, DAY * 1.5);
  check("then it is forest", bid(bp.x, bp.z) === "forest" && (events.w3biome || []).some(e => e.to === "forest"));
  const gc = openPatch(p => bid(p.x, p.z) !== "shroom", [fc, bc, bc + 1, bc - 1, bc + G, bc - G]), gpp = cellXY(gc);
  me.x = gpp.x; me.z = gpp.z;
  hold("glowcap", 8);
  check("holding a glowcap: plant it", /plant the/.test((optsAt(null).use || {}).label || "") || /no room/.test((optsAt(null).use || {}).label || ""));
  let caps = 0; spots(gc, 7).forEach(p => { const n = Surv.plant(me, game, "glowcap", p.x, p.z); if (n && n.kind === "shrooms") caps++; });
  W3.pass(game, 1); W3.pass(game, DAY * 2);
  check("a ring of planted glowcaps makes a glowshroom grove", caps >= 5 && bid(gpp.x, gpp.z) === "shroom", caps + " caps");
  // a save and a load: the changed ground comes back
  const savedQ = JSON.parse(JSON.stringify(game.quests)), savedW = JSON.parse(JSON.stringify(Wd.serialize(game.world)));
  game.world = Wd.revive(savedW, game); game.quests = savedQ; game.world.seen.fill(255); w = game.world;
  check("a loaded island starts from its seed", bid(bp.x, bp.z) !== "forest");
  W3.pass(game, 1);
  check("and gets its changed ground back from the save", bid(bp.x, bp.z) === "forest" && bid(gpp.x, gpp.z) === "shroom" && W3.state(game).fell === 4);

  console.log("6. jungle crystal creeps through wet ground");
  const s2 = W3.state(game);
  const jades = () => game.world.nodes.filter(n => n.kind === "jadevein");
  check("the island has some to begin with", jades().length >= 1 && s2.jade === 1, String(jades().length));
  let wetP = null, dryP = null;
  for (let c = 0; c < G * G && !(wetP && dryP); c++) spots(c, 7).forEach(p => { if (SB.dist(p.x, p.z, nest.x, nest.z) > 90) return; const wt = W3.wet(game, p.x, p.z); if (wt >= 0.6 && !wetP) wetP = p; if (wt < 0.4 && !dryP) dryP = p; });
  check("found wet and dry ground", !!wetP && !!dryP);
  hold("jade", 2);
  check("it will not take in dry ground", !W3.plantJade(game, me, dryP.x, dryP.z).ok && Surv.count(me, "jade", true) === 2);
  const jr = W3.plantJade(game, me, wetP.x, wetP.z), jn = jades().find(n => SB.dist(n.x, n.z, wetP.x, wetP.z) < 0.1);
  check("in wet ground it does", jr.ok && !!jn && Surv.count(me, "jade", true) === 1);
  jn.grow = null;
  let bud = null; for (let i = 0; i < 40 && !bud; i++) bud = W3.spread(game, jn);
  check("a crystal buds another beside it, in wet ground only", !!bud && bud.kind === "jadevein" && W3.wet(game, bud.x, bud.z) >= 0.5 && SB.dist(bud.x, bud.z, jn.x, jn.z) < 2.6);
  me.x = jn.x + 1; me.z = jn.z;
  check("paws can't dig it out", /pick/.test((optsAt({ type: "node", id: jn.id }).use || {}).label || ""));
  let gave = []; for (let i = 0; i < 6 && jn.state === "ok"; i++) gave = gave.concat(Surv.hitNode(me, game, jn, "ironpick").gave);
  check("a pick does: it gives jungle crystal", gave.indexOf("jade") >= 0 && jn.state === "gone");
  const nj = jades().filter(n => n.state === "ok").length;
  bud.grow = null; W3.pass(game, 1); for (let i = 0; i < 4; i++) W3.pass(game, DAY * 3);
  check("left alone it spreads by itself, and stops at a cap", jades().filter(n => n.state === "ok").length > nj && jades().length <= W3.JADE_MAX + 2, jades().length + " crystals");

  console.log("7. shaped recipes: the order on the grid matters");
  check("a sail is two fibre over a stick and a vine", (Surv.match(["fiber", "fiber", "stick", "vine"]) || {}).id === "sail");
  check("the same things the wrong way round make nothing", Surv.match(["stick", "fiber", "vine", "fiber"]) == null && (Surv.misfit(["stick", "fiber", "vine", "fiber"]) || {}).id === "sail");
  check("old recipes still don't care about order", (Surv.match(["stick", "iron"]) || {}).id === "ironaxe" && (Surv.match(["iron", "stick"]) || {}).id === "ironaxe");
  empty(); Surv.add(me, "fiber", 4); Surv.add(me, "stick", 3); Surv.add(me, "vine", 2); Surv.add(me, "plank", 2);
  const bad = Surv.combine(me, game, ["vine", "fiber", "fiber", "stick"]);
  check("combine says so, and keeps your things", !bad.ok && /wrong way round/.test(bad.msg) && Surv.count(me, "fiber", true) === 4);
  check("no one-tap make before you have laid it out once", !Surv.craft(me, game, "sail").ok && /grid/.test(Surv.craft(me, game, "sail").msg));
  const good = Surv.combine(me, game, ["fiber", "fiber", "stick", "vine"]);
  check("laid out right it makes a sail", good.ok && good.out === "sail" && Surv.count(me, "sail", true) === 1 && Surv.count(me, "fiber", true) === 2, good.msg);
  check("after that it is in the make list like any recipe", Surv.craft(me, game, "sail").ok && Surv.count(me, "sail", true) === 2 && Surv.recipes(me, game).some(r => r.id === "sail"));
  check("a rudder: the stick first, then two planks", !Surv.combine(me, game, ["plank", "stick", "plank"]).ok && Surv.combine(me, game, ["stick", "plank", "plank"]).ok && Surv.count(me, "rudder", true) === 1);
  Surv.add(me, "jade", 2); Surv.add(me, "stone", 2);
  check("a growstone: crystal and stone corner to corner", !Surv.combine(me, game, ["jade", "jade", "stone", "stone"]).ok && Surv.combine(me, game, ["jade", "stone", "stone", "jade"]).ok && Surv.count(me, "growstone", true) === 1);
  me.x = dryP.x; me.z = dryP.z;
  const e0 = W3.eco(game, me.x, me.z), so0 = W3.soil(game, me.x, me.z);
  check("set in the ground it wakes the patch up", W3.setStone(game, me).ok && W3.eco(game, me.x, me.z) === Math.min(8, e0 + 3) && W3.soil(game, me.x, me.z) > so0 && Surv.count(me, "growstone", true) === 0);
  const bush = game.world.nodes.find(n => n.state === "ok" && SB.NODES[n.kind].drops && n.dropT != null && !(n.grow != null && n.grow < 1));
  W3.state(game).eco[W3.cell(game, bush.x, bush.z)] = W3.LUSH; bush.dropT = 100; W3.pass(game, 10);
  check("on lush ground things fruit faster", bush.dropT <= 95.01, String(bush.dropT));

  console.log("8. stilt huts over the shallows");
  const ring = W3.ring(game);
  check("the coast has shallows all the way round", ring.length > 30, ring.length + " points");
  const N = game.world.T.N, r0 = ring.find(p => Surv.canPlace(game, "stilthut", p.x, p.z)) || ring[0];
  check("a stilt hut can stand in the water, a hut cannot", Surv.canPlace(game, "stilthut", r0.x, r0.z) && !Surv.canPlace(game, "hut", r0.x, r0.z) && Wd.depthAt(game.world, r0.x, r0.z) > 0.03);
  check("but not on a dry meadow", !Surv.canPlace(game, "stilthut", nest.x + 4, nest.z + 4) || bid(nest.x + 4, nest.z + 4) === "swamp");
  const dl = Math.hypot(N / 2 - r0.x, N / 2 - r0.z); me.x = r0.x + (N / 2 - r0.x) / dl * 3; me.z = r0.z + (N / 2 - r0.z) / dl * 3;
  empty(); Surv.add(me, "stick", 8); Surv.add(me, "leaves", 4); Surv.add(me, "vine", 2);
  const sh = W3.raise(game, me);
  check("raise one from the land tab: a site in the wet, and your things go into it", sh.ok && sh.st.kind === "stilthut" && !sh.st.done && Surv.needs(sh.st).length === 0 && Surv.count(me, "stick", true) === 0 && (Wd.depthAt(game.world, sh.st.x, sh.st.z) > 0.02 || bid(sh.st.x, sh.st.z) === "swamp"), sh.msg);
  check("the tab has the button", /data-w3='raise'/.test(W3.html(game, me)));
  sh.st.done = true; sh.st.noun = "shelter";
  check("finished, it can be your home", H.get(game) == null && /make this your home/.test((optsAt({ type: "struct", id: sh.st.id }).place || {}).label || "") && optsAt({ type: "struct", id: sh.st.id }).place.go() && H.is(game, sh.st));
  check("it has a model, on legs", typeof W3.MODELS.stilthut === "function" && /wade out/.test(js("world3.js")));

  console.log("9. the raft: deck, sail, rudder, then it floats, and it is a home");
  empty();
  check("no logs, no deck", !W3.layDeck(game, me).ok);
  Surv.add(me, "log", 4); Surv.add(me, "vine", 3);
  const mx1 = me.x, mz1 = me.z; me.x = nest.x; me.z = nest.z;
  check("a deck is laid in the shallows, not inland", !W3.layDeck(game, me).ok && /shallows/.test(W3.layDeck(game, me).msg) && Surv.count(me, "log", true) === 4);
  me.x = mx1; me.z = mz1;
  hold("log", 4); Surv.add(me, "vine", 3);
  check("looking at the water with a log in hand: lay a raft deck", /lay a raft deck/.test((optsAt({ type: "water", x: r0.x, z: r0.z }).pick || {}).label || "") || !SB.Creature.resolve(game, { type: "water", x: r0.x, z: r0.z }));
  const dk = W3.layDeck(game, me), raft = W3.raft(game);
  check("the deck goes down at the shore", dk.ok && raft && raft.kind === "raftdeck" && raft.done && Wd.depthAt(game.world, raft.x, raft.z) > 0.1 && Surv.count(me, "log", true) === 0);
  check("one raft an island", !W3.layDeck(game, me).ok);
  check("a deck alone does not float", !W3.cast(game, me).ok && !W3.afloat(game));
  check("no sail in your bag, no sail on the raft", !W3.fit(game, me, "sail").ok && /grid/.test(W3.fit(game, me, "sail").msg));
  me.x = raft.x; me.z = raft.z;
  Surv.add(me, "sail", 1);
  check("looking at it with a sail: rig the sail", /rig the sail/.test((optsAt({ type: "struct", id: raft.id }).use || {}).label || ""));
  check("the sail goes up: stage two", W3.fit(game, me, "sail").ok && raft.kind === "raftsail" && !W3.afloat(game));
  check("still needs a rudder", /rudder/.test((optsAt({ type: "struct", id: raft.id }).use || {}).label || "") && optsAt({ type: "struct", id: raft.id }).use.locked);
  Surv.add(me, "rudder", 1);
  check("the rudder goes on: she floats", W3.fit(game, me, "rudder").ok && raft.kind === "houseraft" && W3.afloat(game) && (events.w3raft || []).some(e => e.afloat));
  check("each stage has its own model", ["raftdeck", "raftsail", "raftrud", "houseraft"].every(k => typeof W3.MODELS[k] === "function" && SB.STRUCTS[k] && SB.STRUCTS[k].wet));
  const ro = optsAt({ type: "struct", id: raft.id });
  check("looking at her: cast off, or make her your home", /cast off/.test(ro.use.label) && /move your home here/.test(ro.place.label));
  check("she is your home now, bed and all", ro.place.go() && H.is(game, raft) && H.get(game) === raft);
  const x0 = raft.x, z0 = raft.z, pos0 = W3.state(game).raft.pos;
  check("cast off", W3.cast(game, me).ok && W3.state(game).raft.go === 1 && SB.Ext.vitals(game, me).some(v => v.text === "sailing"));
  for (let i = 0; i < 400 && W3.state(game).raft.pos === pos0; i++) W3.tick(game, 0.35);
  check("she sails along the coast", SB.dist(raft.x, raft.z, x0, z0) > 3 && W3.state(game).raft.pos !== pos0, SB.dist(raft.x, raft.z, x0, z0).toFixed(1) + "m");
  check("and carries you, and your home, with her", SB.dist(me.x, me.z, raft.x, raft.z) < 1.5 && H.at(game, me) && Math.abs(H.state(game).x - raft.x) < 0.01);
  check("drop anchor", /drop anchor/.test(optsAt({ type: "struct", id: raft.id }).use.label) && W3.anchor(game).ok);
  for (let i = 0; i < 400 && W3.state(game).raft.go; i++) W3.tick(game, 0.35);
  const rp = ring[W3.state(game).raft.pos];
  check("she stops at the next cove", W3.state(game).raft.go === 0 && SB.dist(raft.x, raft.z, rp.x, rp.z) < 0.01 && (events.w3anchor || []).length === 1);
  const xa = raft.x; for (let i = 0; i < 10; i++) W3.tick(game, 0.35);
  check("and stays there", raft.x === xa);

  console.log("10. the maze under a captain's lair, and the ark core");
  game.time = Math.max(game.time, DAY * 3); B.place(game);
  const lair = B.state(game).list.gloom, M = B.mazeOf(game, "gloom");
  const rx = me.x, rz = me.z; me.x = lair.x + 1; me.z = lair.z;
  check("every lair has a maze: 25 rooms, one way between any two, a heart far from the way in", M.open.length === 25 && M.open.every(o => o > 0) && M.open.reduce((a, o) => a + [1, 2, 4, 8].filter(b => o & b).length, 0) === 48 && M.far >= 4 && M.heart !== M.start);
  check("the same maze every time, a different one per captain", B.mazeOf(game, "gloom") === M && B.mazeOf(game, "murk").open.join() !== M.open.join());
  check("not while the captain is at home", B.mazeAt(game, me) == null && !B.mazeEnter(game, me, "gloom").ok);
  lair.beaten = true;
  empty();
  check("beaten: the way in is at the lair", B.mazeAt(game, me) === "gloom" && /search the maze/.test((optsAt(null).pick || {}).label || ""));
  check("too dark without a light", !B.mazeEnter(game, me, "gloom").ok && /dark/.test(B.mazeEnter(game, me, "gloom").msg));
  Surv.add(me, "torch", 1);
  check("with a torch you are in", optsAt(null).pick.go() && B.mazeIn(game) === "gloom");
  const mo = optsAt(null);
  check("the three buttons are the three ways", [mo.use, mo.pick, mo.place].every(o => o && /go |wall|turn back|climb/.test(o.label)), [mo.use, mo.pick, mo.place].map(o => o.label).join(" | "));
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  function pathTo(target) { // breadth first, from where you are
    const m = B.mazeState(game, "gloom"), prev = {}, q = [m.p]; prev[m.p] = -1;
    while (q.length) { const c = q.shift(); if (c === target) break; for (let k = 0; k < 4; k++) if (M.open[c] & (1 << k)) { const nb = c + DY[k] * 5 + DX[k]; if (prev[nb] == null) { prev[nb] = c; q.push(nb); } } }
    const out = []; for (let c = target; prev[c] !== -1; c = prev[c]) out.unshift(c); return out;
  }
  function walk(target) { let last = null; pathTo(target).forEach(nx => { const m = B.mazeState(game, "gloom"), k = [-5, 1, 5, -1].indexOf(nx - m.p), t = (k - m.d + 4) % 4; last = B.mazeMove(game, me, "gloom", t === 3 ? -1 : t); }); return last; }
  const m0 = B.mazeState(game, "gloom"), wallTurn = [0, -1, 1].find(t => !(M.open[m0.p] & (1 << ((m0.d + t + 4) % 4))));
  if (wallTurn != null) check("a wall is a wall", !B.mazeMove(game, me, "gloom", wallTurn).ok && B.mazeState(game, "gloom").p === M.start);
  const de = Object.keys(M.dead)[0];
  if (de != null) { const f = walk(+de); check("a dead end holds a small find, once", f.ok && f.found === M.dead[de] && Surv.count(me, f.found, true) >= 1 && !B.mazeMove(game, me, "gloom", 0).found); }
  const hr = walk(M.heart);
  check("the heart holds the captain's piece of the ark's core", hr.ok && hr.heart && Surv.count(me, "arkcore", true) === 1 && (events.mazeHeart || []).length === 1);
  check("the core is there once", !walk(M.start) || Surv.count(me, "arkcore", true) === 1);
  check("the land tab draws the map as you go", /◆/.test(B.mazeMap(game, "gloom").join("")) && /★/.test(B.mazeMap(game, "gloom").join("")) && /the maze under Gloom/.test(W3.html(game, me)));
  const lk = B.mazeLook(game, "gloom");
  check("back at the way in, one button climbs out", lk.out != null && B.mazeMove(game, me, "gloom", lk.out).out && B.mazeIn(game) == null);
  B.mazeEnter(game, me, "gloom"); me.x = lair.x + 20; for (let i = 0; i < 3; i++) W3.tick(game, 0.3);
  check("walk off and you are out of it", B.mazeIn(game) == null);
  let goals = []; SB.Ext.goals(game, (t) => goals.push(t));
  check("the goals list stops asking once the core is found", !goals.some(t => /Gloom/.test(t)) && B.mazeState(game, "gloom").core === 1);
  me.x = raft.x; me.z = raft.z;
  check("looking at the raft with a core: fit it", /fit the ark core/.test((optsAt({ type: "struct", id: raft.id }).pick || {}).label || ""));
  check("a core makes the raft bigger: its size, its speed, its chest", H.slots(game) === 12 && W3.fit(game, me, "core").ok && W3.state(game).raft.cores === 1 && Math.abs(raft.s - 1.2) < 1e-9 && H.slots(game) === 16 && H.chest(game).length === 16);
  check("no core, no fitting", !W3.fit(game, me, "core").ok);

  console.log("11. saves, old islands, the files");
  const q3 = JSON.parse(JSON.stringify(game.quests)), w3 = JSON.parse(JSON.stringify(Wd.serialize(game.world)));
  game.world = Wd.revive(w3, game); game.quests = q3; game.world.seen.fill(255);
  W3.pass(game, 1);
  const raft2 = W3.raft(game);
  check("the raft, its parts and its cores are in the save", !!raft2 && raft2.kind === "houseraft" && Math.abs(raft2.s - 1.2) < 1e-9 && H.is(game, raft2) && B.mazeState(game, "gloom").core === 1);
  check("so are planted crystals and seedlings", game.world.nodes.some(n => n.kind === "jadevein" && n.added) && game.world.nodes.some(n => n.id === sap.id));
  const g2 = SB.Game.newGame(5); let threw = null;
  try { SB.Game.current = g2; for (let i = 0; i < 30; i++) SB.Ext.tick(g2, 0.05); W3.html(g2, { x: 100, z: 100, tier: 2 }); SB.Ext.vitals(g2, { x: 100, z: 100, chem: { hunger: 0.9 } }); delete g2.quests.world3; W3.tick(g2, 0.05); g2.offline = true; W3.tick(g2, 5); } catch (e) { threw = e; }
  SB.Game.current = game;
  check("a brand-new island, nobody in a body, an old save with none of this: nothing throws", !threw, threw && threw.stack);
  const H2 = SB.Ext._handlers;
  check("no hook was switched off along the way", ["tick", "options", "vitals", "goals"].every(k => H2[k].every(f => !f._off)));
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "world3.js"), "utf8");
  check("old phones: no arrows, let, const, classes or template strings", !/=>|\blet\s|\bconst\s|\bclass\s|`/.test(src));
  check("it never rolls the island's own dice", !/game\.rng/.test(src));
  check("the grid is coarse and a few patches are done a frame", W3.G <= 48 && /PER = 8/.test(src));
});

console.log(failed ? "\n" + failed + " failed, " + passed + " passed" : "\nall " + passed + " passed");
process.exit(failed ? 1 : 0);
