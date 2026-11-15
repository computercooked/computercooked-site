// round 3, "helpers": clay helpers that walk and do chores, stepping into a ghost-light or a pet, sleep pods and a
// winter-sleeping line, egg sex / hurried eggs / carried eggs, an incubator, pet words, studying a grump, the wrecks'
// motes, swapper and broken bot, ark stones, odd blobs, a fisher's spot, weeds on the home plot.
// node games/smol-brains/tests/helpers3.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0, count = 0;
function check(name, ok, extra) { count++; console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");

seeded(3003, () => {
  const ctx = load();
  ["meshes.js", "ext.js", "bosses.js", "body.js", "possess.js", "home.js", "loot.js", "harvest.js", "animals.js", "helpers3.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses)) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, H = SB.Helpers3, A = SB.Animals, Surv = SB.Surv || SB.Survival, W = SB.World, K = SB.KINDS; P.headless = true;
  const game = SB.Game.newGame(133); SB.Game.current = game; game.tutorial.done = true; game.headless = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  const ev = []; ["golemMade", "golemHauled", "golemTended", "podSlept", "podWoke", "vessel", "vesselEnd", "ghostDone", "oddBlob", "wispGift", "incHatched", "petWord", "grumpStudied", "eggLaid", "hatchedEarly", "mazeDone", "stoneTwin", "fishTip"].forEach(n => SB.bus.on(n, () => ev.push(n)));
  const tick = (sec, dt) => { dt = dt || 0.25; for (let t = 0; t < sec; t += dt) { game.time += dt; H.tick(game, dt); } };
  const ref = o => ({ type: o.type === "struct" ? "struct" : o.type === "item" ? "item" : "creature", id: o.id });
  const opts = o => P.options(game, P.c || me, o ? ref(o) : null);
  const lab = (o, k) => ((opts(o)[k] || {}).label || "");
  const hold = (k, n) => { const v = Surv.inv(me); for (let i = 0; i < v.s.length; i++) v.s[i] = null; Surv.add(me, k, n || 1); Surv.select(me, v.s.findIndex(x => x && x.k === k)); };
  const give = (k, n) => Surv.add(me, k, n || 1);
  const flat = (() => { const s = game.world.T.spawn; for (let r = 6; r < 50; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r; let ok = true; for (let dx = -8; dx <= 8 && ok; dx += 2) for (let dz = -8; dz <= 8 && ok; dz += 2) if (!W.walkable(game.world, x + dx, z + dz, false) || W.depthAt(game.world, x + dx, z + dz) > 0.02) ok = false; if (ok && W.siteFree(game.world, x, z, 2.2)) return { x, z }; } return { x: s.x, z: s.z }; })();
  const put = (c, x, z) => { c.x = x; c.z = z; c.px = x; c.pz = z; };
  const loose = (k, x, z) => { const o = W.add(game.world, game, k, x, z, {}); return o; };
  put(me, flat.x, flat.z);
  // a few more smols so somebody can sleep
  const extra = []; for (let i = 0; i < 4; i++) { const c = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(SB.rng(50 + i), 3), x: flat.x + 6 + i, z: flat.z + 6, age: 400 }); c.asleep = false; extra.push(c); }
  game.time = SB.DAY_LENGTH * 0.4; game.world.time = game.time; game.world.night = false; game.world.season = 0;
  P.enter(game, me, { free: true });

  console.log("1. the new things exist");
  check("helpers, lights, motes, weeds and the buildings are real", ["golem_ssb", "golem_lhl", "arkbot", "ghostlight", "wisp", "weed", "burrow"].every(k => !!K[k]) && ["sleeppod", "incubator", "swapper", "arkstone", "brokenbot"].every(k => !!SB.STRUCTS[k]));
  check("every one has a model with something in it", Object.keys(H.MESHES).length >= 13 && Object.keys(H.MESHES).every(k => { const m = SB.Meshes.itemMesh(k); return !!m && (m.pos || m.positions || m.v || m.verts || Object.values(m).find(a => a && a.length > 9)); }) && Object.keys(H.STRUCT_MODELS).every(k => !!SB.Meshes.STRUCT_BUILDERS[k]()));
  check("eight helper shapes, one for each choice of parts", new Set(["s", "l"].flatMap(l => ["s", "h"].flatMap(a => ["b", "l"].map(h => JSON.stringify(Object.values(SB.Meshes.itemMesh("golem_" + l + a + h)).map(v => v && v.length)))))).size >= 4);
  check("it plugs in through ext.js: a tab", !!SB.Ext.tabById("helpers3") && SB.Ext._handlers.options.indexOf(H.options) >= 0 && SB.Ext._handlers.tick.indexOf(H.tick) >= 0);
  check("an island with none of this state is fine", (() => { delete game.quests.helpers3; H.tick(game, 3); return H.golems(game).length === 0 && /clay helpers/.test(H.html(game, me)) && H.vitals(game, me).length === 0; })());

  console.log("2. a thinker fires a clay helper at a kiln");
  check("not before there are thinkers", !H.fire(game, me, { l: "l", a: "s", h: "l" }).ok && /thinker/.test(H.last || H.fire(game, me).msg));
  game.stats.maxTier = 5;
  check("not without a lit kiln", /kiln/.test(H.fire(game, me).msg));
  const kiln = W.addStructure(game.world, game, "kiln", flat.x + 2, flat.z, { done: true, rot: 0 }); kiln.data.fuel = 0.9; kiln.data.lit = true;
  check("not without clay and a crystal", /needs/.test(H.fire(game, me).msg));
  give("clay", 4); give("crystal", 1); give("stick", 2);
  const f1 = H.fire(game, me, { l: "l", a: "s", h: "l" }), g1 = f1.rec;
  check("fired: a helper with the parts you chose", f1.ok && g1 && g1.l === "l" && g1.a === "s" && g1.h === "l" && ev.includes("golemMade") && Surv.count(me, "clay", true) === 0, f1.msg);
  const body1 = H.body(game, g1);
  check("it stands in the world as its own thing", body1.kind === "golem_lsl" && H.byItem(game, body1) === g1 && game.world.items.includes(body1));
  check("looking at it: look it over, and change its job", /look over/.test(lab(body1, "use")) && /next job/.test(lab(body1, "pick")));
  H.setPost(game, { x: flat.x - 3, z: flat.z - 3 }, g1);
  const sticks = [[5, 0], [6, 2], [4, -5]].map(p => loose("stick", flat.x - 3 + p[0], flat.z - 3 + p[1]));
  const x0 = body1.x, z0 = body1.z, fuel0 = g1.fuel;
  tick(60);
  const pile = game.world.items.filter(o => o.kind === "stick" && o.data.keep && SB.dist(o.x, o.z, g1.px, g1.pz) < 3).reduce((n, o) => n + Surv.pileN(o), 0);
  check("it walked off by itself", SB.dist(body1.x, body1.z, x0, z0) > 1 || g1.fuel < fuel0, "moved " + SB.dist(body1.x, body1.z, x0, z0).toFixed(1));
  check("and hauled the loose sticks to its post", pile === 3 && sticks.every(o => o.gone) && ev.includes("golemHauled"), "pile " + pile);
  check("work burns firewood and cracks it a little", g1.fuel < fuel0 && g1.wear > 0);
  hold("stick", 2); put(me, body1.x + 1, body1.z); g1.fuel = 0.3;
  check("holding a stick: stoke it", /stoke/.test(lab(body1, "place")) && H.stoke(game, me, g1).ok && Math.abs(g1.fuel - 0.55) < 0.01);
  g1.fuel = 0; const apple = loose("apple", g1.px + 5, g1.pz + 1); H.setJob(game, g1, "sort"); const bx = body1.x;
  tick(10);
  check("out of firewood it stands cold", body1.x === bx && !apple.gone && /cold/.test(H.line(game, g1)));
  g1.fuel = 1; tick(90);
  const nest = game.world.T.nest;
  check("sorting: loose food goes to the nest", apple.gone && game.world.items.some(o => o.kind === "apple" && o.data.keep && SB.dist(o.x, o.z, nest.x, nest.z) < 3));
  kiln.data.fuel = 0.1; H.setJob(game, g1, "tend"); H.setPost(game, { x: kiln.x + 2, z: kiln.z + 2 }, g1);
  const wd = W.add(game.world, game, "weed", kiln.x + 4, kiln.z + 4, { keep: 1 });
  tick(90);
  check("tending: a low fire is fed", kiln.data.fuel >= 0.5 && ev.includes("golemTended"), "fuel " + kiln.data.fuel);
  check("tending: a weed is pulled", wd.gone);
  g1.wear = 1; hold("clay", 1); put(me, body1.x + 1, body1.z); const bx2 = body1.x; tick(5);
  check("cracked through it stops, and clay patches it", body1.x === bx2 && /patch/.test(lab(body1, "place")) && H.patch(game, me, g1).ok && g1.wear === 0.5);
  give("clay", 4); give("crystal", 1); give("stick", 2); put(me, kiln.x - 2, kiln.z);
  const g2 = H.fire(game, me, { l: "s", a: "h", h: "b" }).rec; H.setJob(game, g2, "haul");
  const far = loose("stone", g2.px + 4, g2.pz); game.world.night = true; tick(20);
  check("a bowl head sleeps at night, a lamp head works on", !far.gone && /asleep/.test(H.line(game, g2)));
  game.world.night = false;
  W.remove(game.world, body1);
  check("a lost body is made again from the record", H.body(game, g1).kind === "golem_lsl" && !H.body(game, g1).gone);
  check("the helpers are in the save, without their errands", (() => { const s = JSON.parse(JSON.stringify(SB.Save.plain(game.quests.helpers3))); return s.g[g1.id].name === g1.name && s.g[g1.id]._t === undefined; })());
  check("the bag tab lists them and offers the parts", /next job/.test(H.html(game, me)) && /long legs/.test(H.html(game, me)) && /fire it/.test(H.html(game, me)) && H.act(game, me, "part", "ll").ok);

  console.log("3. the wrecks: motes, a swapper, a broken helper");
  const wrecks = game.sites.filter(s => s.kind === "wreck"), wA = wrecks.find(s => s.id % 2 === 0), wB = wrecks.find(s => s.id % 2 === 1);
  wrecks.forEach(s => { s.found = true; s.gone = false; });
  const ruins = game.sites.filter(s => s.kind === "ruin"); ruins.forEach(s => { s.found = true; });
  tick(3);
  const motes = game.world.items.filter(o => o.kind === "wisp" && o.data.wisp === wA.id);
  check("three light-motes live at a found wreck", motes.length === 3 && motes.every(o => SB.dist(o.x, o.z, wA.x, wA.z) < 4));
  const mx = motes[1].x; tick(2);
  check("they drift about above the ground", motes[1].x !== mx && motes[1].y > W.groundY(game.world, motes[1].x, motes[1].z) + 0.3);
  hold("apple", 1);
  check("offer one food and it is carried off", /offer/.test(lab(motes[0], "place")) && H.offer(game, me, motes[0]).ok && Surv.count(me, "apple", true) === 0);
  tick(1);
  check("the mote with the offering is over the nest", SB.dist(motes[0].x, motes[0].z, nest.x, nest.z) < 3);
  game.time += SB.DAY_LENGTH; SB.bus.emit("dawn", {});
  check("next morning a gift lies by the nest", ev.includes("wispGift") && /gift/.test(H.last));
  const swapper = game.world.structures.find(b => b.kind === "swapper"), bot = game.world.structures.find(b => b.kind === "brokenbot");
  check("an ark swapper in one wreck, a broken helper in another", !!swapper && !!bot && SB.dist(swapper.x, swapper.z, wA.x, wA.z) < 6 && SB.dist(bot.x, bot.z, wB.x, wB.z) < 6);
  put(me, swapper.x + 1.5, swapper.z); hold("stone", 3); give("stick", 1);
  const sw = H.swap(game, me, 0);
  check("the swapper swaps a set for something else", sw.ok && Surv.count(me, "flint", true) === 2 && Surv.count(me, "stone", true) === 0 && /work the ark swapper/.test(lab(swapper, "use")), sw.msg);
  give("stone", 9); give("stick", 3); H.swap(game, me, 0); H.swap(game, me, 0);
  check("three swaps a day", !H.swap(game, me, 0).ok && /swap/.test(H.html(game, me)));
  put(me, bot.x + 1.5, bot.z);
  check("mending the helper needs wreck parts", /mend/.test(lab(bot, "use")) && !H.rebuild(game, me, bot).ok);
  give("metal", 3); give("crystal", 1);
  const rb = H.rebuild(game, me, bot), ark = rb.rec;
  check("mended: an ark helper that walks", rb.ok && ark.ark === 1 && H.body(game, ark).kind === "arkbot" && !game.world.structures.includes(bot));
  ark.fuel = 0.5; tick(10);
  check("it charges in daylight and takes no firewood", ark.fuel > 0.5 && !H.stoke(game, me, ark).ok);

  console.log("4. ark stones at the ruins");
  const stones = game.world.structures.filter(b => b.kind === "arkstone"), by = k => stones.find(b => b.data.stone === k);
  check("every found ruin has a stone", stones.length === ruins.length && stones.length > 0);
  const twinS = by("twin"), shufS = by("shuffle"), mazeS = by("maze");
  if (twinS) {
    put(me, twinS.x + 1, twinS.z);
    check("the twin stone wants a crystal", !H.touch(game, me, twinS).ok);
    give("crystal", 1); const n0 = SB.Game.smols(game).length, tw = H.touch(game, me, twinS);
    check("then there are two of you", tw.ok && SB.Game.smols(game).length === n0 + 1 && tw.twin.sex === me.sex && SB.Genome.encode(tw.twin.genome) === SB.Genome.encode(me.genome) && tw.twin.name === me.name + " two");
    give("crystal", 1);
    check("only once", !H.touch(game, me, twinS).ok);
  } else check("twin stone (not on this island)", true);
  if (shufS) {
    put(me, shufS.x + 1, shufS.z); give("crystal", 1); const e0 = game.world.items.filter(o => o.kind === "egg").length, sh = H.touch(game, me, shufS);
    check("the shuffle stone hands back a shuffled egg", sh.ok && game.world.items.filter(o => o.kind === "egg").length === e0 + 1 && sh.egg.data.parents[0] === me.id && SB.Genome.encode(sh.egg.data.genome) !== SB.Genome.encode(me.genome));
  } else check("shuffle stone (not on this island)", true);
  if (mazeS) {
    put(me, mazeS.x + 1, mazeS.z); const mz = H.touch(game, me, mazeS);
    check("the maze stone loses you in the fog", mz.ok && SB.dist(me.x, me.z, mazeS.x, mazeS.z) > 25 && H.vitals(game, me).some(v => v.icon === "🌀"));
    const sp0 = game.sparks || 0; put(me, mazeS.x + 1, mazeS.z); tick(3);
    check("find it again and it pays", ev.includes("mazeDone") && (game.sparks || 0) === sp0 + 4 && !H.state(game).maze);
  } else check("maze stone (not on this island)", true);

  console.log("5. a sleep pod, and a line that sleeps the winter");
  put(me, flat.x, flat.z + 8); give("plank", 3); give("fur", 1); give("crystal", 1);
  const pb = H.buildPod(game, me), pod = pb.st;
  check("a sleep pod built by hand", pb.ok && pod.kind === "sleeppod" && /empty sleep pod/.test(lab(pod, "use")), pb.msg);
  const old = extra[0]; put(old, pod.x + 2, pod.z + 1);
  check("not for the well", !H.tuck(game, me, old).ok && !/tuck/.test(lab(old, "pick")));
  old.chem.sick = 0.8; const age0 = old.age, id0 = old.id;
  check("a sick smol near a pod: tuck them in", /tuck/.test(lab(old, "pick")));
  const tk = H.tuck(game, me, old);
  check("asleep: out of the world, in the pod", tk.ok && !game.creatures.includes(old) && pod.data.sl === id0 && ev.includes("podSlept") && /wake/.test(lab(pod, "use")));
  const saved = JSON.parse(JSON.stringify(SB.Save.plain(game.quests.helpers3)));
  check("the sleeper is in the save", saved.sleep[id0].name === old.name && typeof saved.sleep[id0].c.genome === "string");
  game.time += 900; tick(4);
  game.quests.helpers3 = saved; // as if loaded
  const wk = H.wake(game, id0), back = wk.c;
  check("woken: back, not a second older, and better", wk.ok && game.creatures.includes(back) && back.id === id0 && Math.abs(back.age - age0) < 1 && back.chem.sick < 0.5 && pod.data.sl == null && ev.includes("podWoke"), "age " + age0.toFixed(0) + " -> " + back.age.toFixed(0));
  const sl = extra[1]; H.setLine(game, sl);
  const kid = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(SB.rng(77), 3), x: flat.x + 9, z: flat.z + 9, age: 400, parents: [sl.id] }); kid.asleep = false;
  check("a line: the smol and its children", H.inLine(game, sl) && H.inLine(game, kid) && !H.inLine(game, extra[2]));
  game.world.season = 3; tick(3);
  check("winter: the line goes to sleep, in a pod or a burrow", !game.creatures.includes(sl) && !game.creatures.includes(kid) && game.world.items.some(o => o.kind === "burrow") && game.creatures.includes(extra[2]));
  check("the tab lists who is asleep", /asleep until spring/.test(H.html(game, me)));
  game.world.season = 0; tick(3);
  check("spring: they wake", SB.Game.smols(game).some(c => c.id === sl.id) && SB.Game.smols(game).some(c => c.id === kid.id) && !game.world.items.some(o => o.kind === "burrow") && H.sleepers(game).length === 0);

  console.log("6. eggs");
  const a = extra[2], b = extra[3]; a.sex = "f"; b.sex = "m";
  const egg = SB.Game.layEgg(game, a, b, flat.x + 3, flat.z + 9);
  check("carrying is off unless you turn it on: the egg is laid at once", egg.heldBy == null && !egg.data.carry);
  const sx = H.eggSex(game, egg);
  check("a look fixes an egg's sex, and it stays", (sx === "f" || sx === "m") && H.eggSex(game, egg) === sx && egg.data.sex === sx);
  check("looking at the egg says so", new RegExp(sx === "f" ? "a girl" : "a boy").test(lab(egg, "pick")), lab(egg, "pick"));
  egg.data.sex = "m"; const born1 = SB.Game.hatch(game, egg);
  check("it hatches as what the look said", born1.sex === "m" && game.family[born1.id].sex === "m" && !born1.early);
  const egg2 = SB.Game.layEgg(game, a, b, flat.x + 3, flat.z + 10);
  W.warmEgg(game.world, game, egg2); W.warmEgg(game.world, game, egg2, 0.02);
  check("a brooded egg is not a hurried one", !egg2.data.rush);
  for (let i = 0; i < 6; i++) W.warmEgg(game.world, game, egg2, 0.06);
  check("six taps of the hand are written on the egg", egg2.data.rush >= 0.3 && /tapped out early/.test(H.eggLine(game, egg2)));
  const born2 = SB.Game.hatch(game, egg2);
  check("the cost: it hatches small and hungry", born2.early === 1 && born2.chem.hunger >= 0.7 && ev.includes("hatchedEarly"));
  check("turn carrying on", H.setCarry(game).ok && H.state(game).carry === 1);
  const egg3 = SB.Game.layEgg(game, a, b, flat.x + 3, flat.z + 11);
  check("now the mother carries it first", egg3.heldBy === a.id && a.carrying === egg3.id);
  put(a, flat.x + 7, flat.z + 12); tick(5);
  check("it goes where she goes", SB.dist(egg3.x, egg3.z, a.x, a.z) < 0.5 && egg3.y > a.y);
  tick(45);
  check("then she lays it", egg3.heldBy == null && !egg3.data.carry && a.carrying === undefined && ev.includes("eggLaid"));
  H.setCarry(game);

  console.log("7. animals: an incubator, words, the grump");
  put(me, flat.x - 6, flat.z + 6); give("clay", 2); give("plank", 2); give("fur", 1);
  const ib = H.buildInc(game, me), inc = ib.st;
  check("an incubator built by hand", ib.ok && inc.kind === "incubator");
  hold("cluckegg", 1);
  check("set a clucker egg in it", /incubator/.test(lab(inc, "place")) && H.setEgg(game, me, inc).ok && inc.data.egg.k === "cluckegg");
  const an0 = A.all(game).length; game.time += SB.DAY_LENGTH; SB.bus.emit("dawn", {});
  const chick = A.all(game).find(r => r.k === "clucker");
  check("next morning: a tame chick, and the box is empty", A.all(game).length === an0 + 1 && !!chick && chick.kid && !inc.data.egg && ev.includes("incHatched"));
  const bun = A.makeRec(game, "hopper", { x: me.x + 1, z: me.z + 1 });
  let tw1 = H.teachWord(game, me, bun, "come"), n = 1; while (!(bun.words.come >= 1) && n++ < 6) tw1 = H.teachWord(game, me, bun, "come");
  check("a pet learns a word by hearing it a few times", bun.words.come >= 1 && n >= 2 && n <= 4 && ev.includes("petWord"), "said " + n + " times");
  bun.mode = "stay"; A.body(game, bun).x = me.x + 30;
  const sw1 = H.sayWord(game, me, bun, "come");
  check("say it: it comes, from anywhere", sw1.ok && bun.mode === "follow" && SB.dist(A.body(game, bun).x, A.body(game, bun).z, me.x, me.z) < 3, sw1.msg);
  check("a word it was never taught does nothing", !H.sayWord(game, me, bun, "home").ok);
  give("lead", 1); const gr = SB.Game.spawnGrump(game, me.x + 2, me.z); const grec = A.capture(game, me, gr);
  check("a grump on a lead is not studied", !!grec && !H.study(game, me, grec).ok);
  grec.mode = "pen"; A.body(game, grec).x = me.x + 1; A.body(game, grec).z = me.z;
  const sp1 = game.sparks || 0, st1 = H.study(game, me, grec);
  check("studying the penned grump: lore, a spark and a thought", st1.ok && (game.sparks || 0) === sp1 + 1 && ev.includes("grumpStudied") && /study the grump/.test(lab(A.body(game, grec), "pick")), st1.msg);
  H.study(game, me, grec);
  check("twice a day", !H.study(game, me, grec).ok);

  console.log("8. stepping into a pet");
  bun.bond = 0.8; A.body(game, bun).x = me.x + 1; A.body(game, bun).z = me.z + 1;
  const bp = H.bePet(game, me, bun), ves = P.c;
  check("you are the pet", bp.ok && P.active && ves !== me && ves.vessel === "pet" && ves.name === bun.name && ev.includes("vessel"), bp.msg);
  put(ves, ves.x + 2, ves.z + 1); tick(1);
  check("its body goes where you go", SB.dist(A.body(game, bun).x, A.body(game, bun).z, ves.x, ves.z) < 0.01);
  const nose = H.nose(game);
  check("nose about: you dig something up, once", /nose about/.test((P.options(game, ves, null).pick || {}).label || "") && nose.ok && !H.nose(game).ok, nose.msg);
  check("a chip says who you are and for how long", H.vitals(game, ves).some(v => v.icon === "🐾"));
  tick(62);
  check("after a minute you are your own smol again", P.active && P.c === me && !H.vessel(game) && (ves.gone || !game.creatures.includes(ves)) && bun.bond > 0.8 && ev.includes("vesselEnd"));

  console.log("9. a ghost-light");
  const goner = extra[2]; put(goner, me.x + 3, me.z + 2);
  const plot = W.addStructure(game.world, game, "hut", me.x + 9, me.z + 4, { rot: 0 });
  SB.Creature.die(goner, game, "old");
  const light = game.world.items.find(o => o.kind === "ghostlight");
  check("a smol that dies leaves a light where it fell", !!light && light.data.gl.name === goner.name && SB.dist(light.x, light.z, goner.x, goner.z) < 0.1);
  put(me, light.x + 1, light.z);
  check("looking at it: step in", /step into/.test(lab(light, "use")));
  const gh = H.ghost(game, me, light), gv = P.c;
  check("you are the light, with one thing to finish", gh.ok && gv.vessel === "ghost" && gv.name === goner.name && H.vessel(game).task.t === "build" && light.gone && H.vitals(game, gv).some(v => v.icon === "👻" && /finish the/.test(v.text)), gh.msg);
  check("not from far off", !H.finish(game).ok && !plot.done);
  put(gv, plot.x + 1.5, plot.z);
  check("the unfinished hut is the button", /finish the/.test((P.options(game, gv, ref(plot)).use || {}).label || ""));
  const sp2 = game.sparks || 0, fin = H.finish(game);
  check("finished: the hut stands, the light goes, you are back", fin.ok && plot.done && P.c === me && !H.vessel(game) && (game.sparks || 0) >= sp2 + 2 && ev.includes("ghostDone"), fin.msg);
  check("no stray bodies left behind", (() => { tick(3); return !game.creatures.some(c => c.vessel && c.alive); })());

  console.log("10. odd blobs, a fisher's spot, weeds");
  const n1 = SB.Game.smols(game).length;
  for (let i = 0; i < 3; i++) SB.bus.emit("chestOpened", {});
  tick(3);
  const glint = SB.Game.smols(game).find(c => c.odd === "shiny");
  check("three chests opened by hand: an odd blob joins", !!glint && glint.name === "Glint" && glint.tier === 0 && SB.Game.smols(game).length >= n1 + 1 && ev.includes("oddBlob"));
  check("the clay blob came for the helper", SB.Game.smols(game).some(c => c.odd === "clay"));
  tick(5);
  check("each only once", SB.Game.smols(game).filter(c => c.odd === "shiny").length === 1 && /Glint/.test(H.html(game, me)));
  const bub = SB.Harvest.bubbleNear(game, me.x, me.z, 200);
  check("harvest says where the water bubbles today", !!bub && SB.Harvest.bubbling(game, bub.x, bub.z) && W.depthAt(game.world, bub.x, bub.z) > 0.05);
  const friend = extra[3]; put(friend, me.x + 1.5, me.z); hold("rod", 1);
  check("with a rod in hand, ask a smol where the fish bite", /where the fish bite/.test(lab(friend, "place")));
  if (SB.Harvest.bubbleNear(game, me.x, me.z, 70)) {
    const af = H.askFish(game, me, friend);
    check("they tell you their spot, and a chip points at it", af.ok && ev.includes("fishTip") && H.vitals(game, me).some(v => v.icon === "🫧"), af.msg);
  } else check("no bubbling water near: they say so", !H.askFish(game, me, friend).ok);
  const hut = W.addStructure(game.world, game, "hut", flat.x - 4, flat.z - 9, { done: true, rot: 0 });
  SB.Home.claim(game, hut, me);
  for (let d = 0; d < 3; d++) { game.time += SB.DAY_LENGTH; SB.bus.emit("dawn", {}); }
  const weeds = game.world.items.filter(o => o.kind === "weed" && SB.dist(o.x, o.z, hut.x, hut.z) < 9), creep = game.world.items.filter(o => (o.kind === "weed" || o.data.creep) && SB.dist(o.x, o.z, hut.x, hut.z) < 9);
  check("weeds and rocks creep onto the home plot overnight", weeds.length >= 1 && creep.length >= 2 && creep.length <= 6, weeds.length + " weeds, " + creep.length + " in all");
  for (let d = 0; d < 6; d++) { game.time += SB.DAY_LENGTH; SB.bus.emit("dawn", {}); }
  check("never more than six", game.world.items.filter(o => (o.kind === "weed" || o.data.creep) && SB.dist(o.x, o.z, hut.x, hut.z) < 9).length <= 6);
  const w0 = weeds[0]; put(me, w0.x + 1, w0.z); const fb = Surv.count(me, "fiber", true);
  check("pull one: fiber", /pull the weed/.test(lab(w0, "use")) && H.pull(game, me, w0).ok && w0.gone && Surv.count(me, "fiber", true) === fb + 1);

  console.log("11. living with the rest of the island");
  const sick = SB.Game.smols(game).find(c => c !== me && !c.odd && c.stage >= 2 && !c.vessel); sick.chem.health = 0.3; put(sick, pod.x + 2, pod.z); put(me, pod.x + 1, pod.z + 2);
  const tk2 = H.tuck(game, me, sick, pod);
  H.setJob(game, g1, "haul"); g1.fuel = 1; g1.wear = 0; loose("stick", g1.px + 5, g1.pz + 2);
  bun.mode = "stay"; A.body(game, bun).x = me.x + 1; A.body(game, bun).z = me.z + 1;
  const bp2 = H.bePet(game, me, bun);
  let threw = null; try { for (let i = 0; i < 400; i++) SB.Game.step(game, 0.1); } catch (e) { threw = e; }
  check("the whole island runs with a helper at work, a sleeper in a pod and you in a pet", tk2.ok && bp2.ok && !threw && Object.keys(SB.Ext._handlers).every(k => SB.Ext._handlers[k].every(fn => !fn._off)), threw && threw.stack && threw.stack.split("\n").slice(0, 3).join(" | "));
  H.endVessel(game, "time");
  check("and you come back to your own smol", P.active && P.c === me);
  P.leave();
  check("from the sky nothing throws", (() => { tick(5); return true; })());
  const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(game))), game2 = SB.Save.revive(snap);
  SB.Game.current = game2; game2.headless = true; game2.tutorial.done = true;
  let threw2 = null; try { for (let i = 0; i < 30; i++) { game2.time += 0.25; H.tick(game2, 0.25); } } catch (e) { threw2 = e; }
  check("a saved island loads with its helpers, standing where they were", !threw2 && H.golems(game2).length === H.golems(game).length && H.golems(game2).every(r => { const o = W.itemById(game2.world, r.item); return o && !o.gone && /^golem_|^arkbot$/.test(o.kind); }), threw2 && String(threw2.stack).slice(0, 200));
  const n2 = game2.creatures.length, wk2 = H.wake(game2, sick.id);
  check("and its sleeper, who wakes", wk2.ok && game2.creatures.length === n2 + 1 && wk2.c.name === sick.name && wk2.c.brain && wk2.c.genome.genes);
  check("an old save with none of this loads too", (() => { const d = JSON.parse(JSON.stringify(snap)); delete d.quests.helpers3; const g3 = SB.Save.revive(d); SB.Game.current = g3; H.tick(g3, 3); H.tick(g3, 3); return H.golems(g3).length === 0 && H.sleepers(g3).length === 0; })());
  SB.Game.current = game;
});

console.log("11. the files");
const src = fs.readFileSync(path.join(__dirname, "..", "src", "helpers3.js"), "utf8");
check("its own dice, never the island's", !/game\.rng/.test(src));
check("old-phone javascript", !/=>|[;{(]\s*(let|const)\s|^\s*(let|const)\s|`/m.test(src));
check("world.js writes a hurried egg down, harvest.js says where the bubbles are", /d\.rush = /.test(js("world.js")) && /H\.bubbleNear = /.test(js("harvest.js")));

console.log(failed ? "\n" + failed + " of " + count + " failed" : "\nall " + count + " passed");
process.exit(failed ? 1 : 0);
