// 4.49: what the proof pass and the island traces turned up next.
//   1. an egg's gift is a strength: "give it NAME's X" only ever passes a gene the smol is strong in (over the middle)
//      AND has more of than the egg has. a smol with nothing like that has nothing to give, the button says so, and
//      no sparks are spent. no gift ever lowers a gene. (4.48 took the gene furthest from the middle, either way:
//      on the test island a smol with no affection at all took an egg's affection from 0.62 to 0.)
//   2. a route is judged by progress along it: one that leads away from the goal first (round a band of steep ground) is
//      walked to its end. It used to be dropped 8 seconds after the smol last got nearer the goal in a straight line
//      (smol-brains-handover/4.48-island-102-the-one-that-still-starved.txt). Written for 4.48 and held back
//   3. the case the old rule was written for still holds: a route whose next step the smol cannot reach (a ledge the
//      coarse map thinks is fine) is dropped after 8 seconds, and the smol is marked lost so it scrambles back
//   4. two guards for routes that are now walked to their end: no step of a route runs past a minute (it is planned
//      again from where the smol stands), and a smol that gets starving on a walk it was sent on breaks it off to eat
//      (island 77: one walked home from a grump camp past food and starved)
//   5. food is chosen by the length of the way to it: once a smol has planned a route to the nearest food and found it
//      a long way round, a food that lies nearer than that walk is the one it goes for; with no such food it takes the
//      long way; and a way longer than its hunger is worth is left alone like food it cannot reach
//   6. the clock for one food follows its route: 25 seconds (90 starving) as before for a straight walk, and on a route
//      what the route needs at the smol's own pace, half again, and ten seconds (island 77: a ninety-second walk round
//      was cut off a few paces short, three times, and the smol starved)
//   7. three small things from the proof pass: no "fit your padding" button on an animal that does not fight; "call
//      NAME to heel" with the heels full says who to tell to wait, and a tame animal waiting by a pen can be put in
//      from its own button; the lab says the island waits while the surgery window is open
//   8. the grump with a grudge says what it is when it comes, and once more when it finds you in another body: it
//      follows whichever smol you play, leaves for good once beaten, and gives up after a couple of days if left alone
//   9. four small things from rows 121 to 160: seeds that will not grow in this bed now say why on the button; the
//      parley line no longer says a grump stands where none is drawn; a wave never ends "9 of 7 chased off"; a standing
//      order's reason is worked out when you look
//   10. the level "inside the wreck" can be reached: an opened crashed pod counts as the wreck (the slate asked for a
//      site of kind "wreck", and those are hidden on every island, so it was never offered)
// node games/smol-brains/tests/play449.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js"), seeded = load.seeded;
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const dir = path.join(__dirname, "..", "play", "js");
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
const js = f => fs.readFileSync(path.join(dir, f), "utf8");
const order = (html.match(/src="js\/([a-z0-9-]+)\.js"/g) || []).map(s => s.slice(8, -4));
const EXTRA = ["ext", "bosses", "body", "possess", "home", "loot", "friends", "town", "dark", "powers", "fight", "deep", "harvest", "animals", "qol", "wear", "shapes", "wardrobe3", "motion3", "world3", "helpers3", "arrivals3", "minds3"];
// an island with nobody on it but who the check puts there: no pod hatched, the tutorial done, the storyteller asleep
function island(seed) {
  const ctx = load(), SB = ctx.SB;
  order.filter(n => EXTRA.indexOf(n) >= 0).forEach(n => { if (n === "bosses" && SB.Bosses) return; vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }); });
  if (SB.Possess) SB.Possess.headless = true;
  const game = SB.Game.newGame(seed); SB.Game.current = game; game.tutorial.done = true;
  const DR = SB.Director.state(game); DR.active = null; DR.nextT = game.time + 1e7;
  try { SB.Dark._h.st(game).raid.truce = game.time + 1e7; } catch (e) {}
  if (!game.world.pathGrid) SB.World.buildPathGrid(game.world);
  return { SB, game, W: SB.World, w: game.world, hm: game.world.T.spawn };
}
function step(SB, game, secs, each) { for (let s = 0; s < secs / SB.TICK; s++) { if (each && each(s) === false) return s * SB.TICK; SB.Game.step(game, SB.TICK); } return secs; } // 4.49: Game.step runs the add-on systems itself. The older test files call SB.Ext.tick again after it, which runs them at twice the speed of real play
const isFood = (SB, o) => SB.KINDS[o.kind] && SB.KINDS[o.kind].noun === "food";
function clearFood(SB, game, x, z, r) { game.world.nodes.forEach(n => { if (n && Math.hypot(n.x - x, n.z - z) < r && SB.NODES[n.kind] && SB.NODES[n.kind].drops) n.dropT = 1e9; }); /* and nothing ripens or drops near while the check runs */ game.world.items.filter(o => isFood(SB, o) && Math.hypot(o.x - x, o.z - z) < r).forEach(o => { if (SB.World.remove) SB.World.remove(game.world, o); else o.x += 5000; }); }
const routeLen = (p, x, z) => { if (!p) return -1; let l = 0; p.forEach(q => { l += Math.hypot(q.x - x, q.z - z); x = q.x; z = q.z; }); return l; };
const steepOn = (SB, w, p) => (p || []).filter(q => SB.WorldGen.slopeAt(w.T, q.x, q.z) > 2.8).length;
// a plain grown smol with no fins, put on a spot, awake, with nothing on its mind
function put(SB, game, x, z, o) {
  const c = SB.Game.spawnSmol(game, { x: x, z: z, age: 700 }); o = o || {};
  c.tier = o.tier != null ? o.tier : 3; c.look = c.look || {}; c.look.fins = !!o.fins; c.wade = 0; c.lifespan = 1e7;
  c.chem.health = 1; c.chem.hunger = o.hunger != null ? o.hunger : 0.3; c.chem.sleepy = 0; c.chem.tired = 0;
  return c;
}

const STAND = ["ears", "size", "fluff", "bravery", "playfulness", "learnRate", "toughness", "speed", "curiosity", "affection"];

console.log("1. an egg's gift is a strength the egg lacks");
seeded(4490, () => {
  const ctx = load();
  ["possess.js", "ext.js", "home.js", "friends.js"].forEach(f => vm.runInContext(js(f), ctx, { filename: f }));
  const SB = ctx.SB, P = SB.Possess, F = SB.Friends; P.headless = true;
  const game = SB.Game.newGame(88); SB.Game.current = game; game.tutorial.done = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const nest = game.world.T.nest;
  const mk = (name, sex, dx, dz) => { const c = SB.Game.spawnSmol(game, { name, sex, x: nest.x + dx, z: nest.z + dz, age: 400 }); if (game.creatures.indexOf(c) < 0) game.creatures.push(c); c.tier = 3; c.stage = 3; return c; };
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3; me.x = nest.x + 6; me.z = nest.z + 6;
  const pa = mk("Pa", "m", 8, 6), ma = mk("Ma", "f", 9, 6), don = mk("Chu", "f", 7, 7);
  P.enter(game, me, { free: true });
  const newEgg = () => { pa.eggCooldown = 0; ma.eggCooldown = 0; return SB.Game.layEgg(game, pa, ma, me.x + 1, me.z); };
  const setAll = (o, v) => STAND.forEach(g => { o[g] = v; });
  const genes = e => Object.assign({}, e.data.genome.genes);
  const lowered = (a, b) => Object.keys(a).filter(g => b[g] < a[g] - 1e-12);
  const label = egg => { F._focus = don.id; const o = P.options(game, me, { type: "item", id: egg.id }); return o && o.place ? o.place : null; };
  game.sparks = 500;

  // the case from the test island: a smol whose one gene far from the middle is a lack
  let egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.affection = 0; setAll(egg.data.genome.genes, 0.5); egg.data.genome.genes.affection = 0.62;
  let before = genes(egg), sp = game.sparks;
  check("a smol with no affection and nothing above the middle stands out in nothing", F.standout(don) === null && F.standout(don, egg) === null, String(F.standout(don)));
  let b = label(egg);
  check("the egg's button says there is nothing to give", !!b && /Chu has nothing to give this egg/.test(b.label) && !/3 ✨/.test(b.label), b && b.label);
  let r = F.geneCopy(game, don, egg);
  check("asking anyway is refused, costs nothing and changes nothing", !r.ok && r.none === true && game.sparks === sp && !egg.data.frGene && lowered(before, genes(egg)).length === 0 && egg.data.genome.genes.affection === 0.62, r.msg);
  check("...and the egg can still be given something by another smol", (function () { pa.genome.genes.ears = 0.97; const q = F.geneCopy(game, pa, egg); return q.ok && q.gene === "ears" && egg.data.genome.genes.ears === 0.97 && game.sparks === sp - 3; })());

  // a lack and a strength in one smol: the strength is the gift, even when the lack is further from the middle
  egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.affection = 0; don.genome.genes.ears = 0.8; setAll(egg.data.genome.genes, 0.5); egg.data.genome.genes.affection = 0.62; egg.data.genome.genes.ears = 0.4;
  before = genes(egg); sp = game.sparks;
  b = label(egg);
  check("the button names the strength, not the lack", !!b && /give it Chu's /.test(b.label) && /3 ✨/.test(b.label) && !/affection/.test(b.label) && F.standout(don, egg) === "ears", b && b.label);
  r = b && b.go ? (b.go(), { gene: egg.data.frGene && egg.data.frGene[0] }) : {};
  check("pressing it gives the egg the ears and leaves its affection alone", r.gene === "ears" && egg.data.genome.genes.ears === 0.8 && egg.data.genome.genes.affection === 0.62 && game.sparks === sp - 3 && lowered(before, genes(egg)).length === 0);
  check("one gift an egg", !F.geneCopy(game, don, egg).ok && game.sparks === sp - 3);

  // the smol's best gene is no better than the egg's own: the next strength the egg lacks is the gift
  egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.ears = 0.9; don.genome.genes.speed = 0.8; setAll(egg.data.genome.genes, 0.5); egg.data.genome.genes.ears = 0.95; egg.data.genome.genes.speed = 0.3;
  check("a strength the egg already tops is passed over for one it lacks", F.standout(don) === "ears" && F.standout(don, egg) === "speed");
  r = F.geneCopy(game, don, egg);
  check("...and that is what the egg gets", r.ok && r.gene === "speed" && egg.data.genome.genes.speed === 0.8 && egg.data.genome.genes.ears === 0.95);

  // an egg that tops the smol in every strength
  egg = newEgg();
  setAll(don.genome.genes, 0.5); don.genome.genes.ears = 0.7; don.genome.genes.bravery = 0.6; setAll(egg.data.genome.genes, 0.75);
  sp = game.sparks; r = F.geneCopy(game, don, egg);
  check("an egg with more of everything gets nothing, for nothing", !r.ok && r.none === true && game.sparks === sp && F.standout(don, egg) === null && /nothing to give/.test((label(egg) || {}).label || ""));

  // any smol, any egg: a gift never lowers a gene, and what it passes is over the middle
  let tried = 0, given = 0, down = 0, weak = 0, wrong = 0, seedN = 12345;
  const rnd = () => { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return seedN / 0x7fffffff; };
  for (let i = 0; i < 300; i++) {
    egg = newEgg(); if (!egg) continue;
    STAND.forEach(g => { don.genome.genes[g] = rnd(); egg.data.genome.genes[g] = rnd(); });
    before = genes(egg); game.sparks = 500; tried++;
    const want = F.standout(don, egg); r = F.geneCopy(game, don, egg);
    if (r.ok) {
      given++;
      if (lowered(before, genes(egg)).length) down++;
      if (!(don.genome.genes[r.gene] > 0.5)) weak++;
      if (r.gene !== want || Object.keys(before).filter(g => before[g] !== egg.data.genome.genes[g]).join() !== r.gene) wrong++;
    } else if (want !== null || game.sparks !== 500 || lowered(before, genes(egg)).length) wrong++;
    SB.World.remove(game.world, egg);
  }
  check("300 smols and eggs at random: no gift lowered a gene", tried === 300 && down === 0, tried + " tried, " + given + " given, " + down + " lowered");
  check("...every gift was a gene over the middle, and only that one gene changed", weak === 0 && wrong === 0 && given > 150, weak + " weak, " + wrong + " wrong");
  check("the old rule (furthest from the middle, either way) is gone from the source", !/Math\.abs\(gene\(c, g\) - 0\.5\)/.test(fs.readFileSync(path.join(__dirname, "..", "src", "friends.js"), "utf8")));
});

console.log("2. a route that leads away first is still walked");
seeded(4486, () => {
  // island 102 again: where the last one starved, south of a band of steep ground, and one of the apples north of it
  const mk = () => { const I = island(102), { hm } = I; return Object.assign(I, { cx: hm.x + 19, cz: hm.z - 50, ax: hm.x + 25, az: hm.z - 61 }); };
  {
    const { SB, game, W, w, cx, cz, ax, az } = mk(), C = SB.Creature;
    check("both spots can be stood on", W.walkable(w, cx, cz, false) && W.walkable(w, ax, az, false));
    const line = []; for (let t = 0; t <= 1; t += 0.05) line.push({ x: cx + (ax - cx) * t, z: cz + (az - cz) * t });
    const plain = W.findPath(w, cx, cz, ax, az, false, 5000), pl = routeLen(plain, cx, cz), d0 = Math.hypot(ax - cx, az - cz);
    check("steep ground lies between them, and the way round is over twice the straight line", steepOn(SB, w, line) >= 1 && !!plain && pl > d0 * 2, steepOn(SB, w, line) + " steep points; " + d0.toFixed(0) + " paces straight, " + pl.toFixed(0) + " round");
    check("the route's first leg leads away from the apple", !!plain && Math.hypot(plain[0].x - ax, plain[0].z - az) > d0 - 0.5 || (plain && plain.some(q => Math.hypot(q.x - ax, q.z - az) > d0 + 2)), plain ? plain.slice(0, 4).map(q => Math.hypot(q.x - ax, q.z - az).toFixed(0)).join(", ") + " paces from the apple at its first steps" : "no route");
    check("the number: 8 seconds on a route with no step reached or neared, and it is dropped", C.ROUTE_STALL === 8);
    clearFood(SB, game, cx, cz, 70);
    const me = put(SB, game, cx, cz, { hunger: 0.97 });
    W.add(w, game, "apple", ax, az, {});
    let ate = -1, steps = 0; const t0 = game.time;
    SB.bus.on("eat", d => { if (d && d.c === me && ate < 0) ate = game.time; });
    step(SB, game, 200, () => { if (me.path) steps = Math.max(steps, me.pathI || 0); me.chem.health = Math.max(me.chem.health, 0.5); if (ate < 0 && me.chem.hunger < 0.8) ate = game.time; /* fed, whichever way the meal went down */ return ate < 0 && me.alive; });
    check("starving, it walks the route to its end and eats (it set off nine times and never passed the second step)", ate >= 0 && steps >= 3, ate >= 0 ? "after " + Math.round(ate - t0) + "s, " + steps + " steps along" : "no meal in 200s, " + steps + " steps along, " + Math.hypot(me.x - ax, me.z - az).toFixed(0) + " paces from the apple");
  }
  {
    // not only the starving: a smol sent to the far side gets there. (The order is given again every second, and its
    // homesickness is held at nought: a smol this far from home is sent home by the game after a few seconds.)
    const { SB, game, cx, cz, ax, az } = mk(), C = SB.Creature;
    const me = put(SB, game, cx, cz, {});
    let best = 1e9;
    step(SB, game, 150, s => { if (s % 20 === 0 && Math.hypot(me.x - ax, me.z - az) > 2) C.sendTo(me, ax, az, game, 90, true); if (me.fr) me.fr.aw = 0; best = Math.min(best, Math.hypot(me.x - ax, me.z - az)); me.chem.hunger = 0.3; me.chem.sleepy = 0; me.chem.tired = 0; return best > 1.8; });
    check("a fed smol sent round the band arrives", best <= 1.8, "closest " + best.toFixed(1) + " paces");
  }
  check("the source: a route is dropped on its own progress, not the straight line", /c\.pathLegT ?> ?C\.ROUTE_STALL/.test(js("creature.js")) && !/c\.path ?&& ?c\.wBestT ?> ?8/.test(js("creature.js")));
});

console.log("3. a route it cannot follow is still dropped");
seeded(4487, () => {
  const { SB, game, W, w, hm } = island(102), C = SB.Creature;
  const cx = hm.x - 3, cz = hm.z - 58; // the foot of the steep band north of home
  // ground it cannot stand on a few paces off, and a goal beyond it
  let bad = null;
  for (let r = 2; r <= 6 && !bad; r += 0.5) for (let a = 0; a < 6.28 && !bad; a += 0.2) { const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r; if (SB.WorldGen.slopeAt(w.T, x, z) > 3.4 && !W.walkable(w, x, z, false) && !W.walkable(w, x + Math.sin(a) * 0.6, z + Math.cos(a) * 0.6, false)) bad = { x, z, a, r }; }
  check("there is ground it cannot stand on a few paces off", !!bad, bad ? bad.r.toFixed(1) + " paces off" : "none");
  if (!bad) return;
  const far = { x: cx + Math.sin(bad.a) * (bad.r + 14), z: cz + Math.cos(bad.a) * (bad.r + 14) };
  const me = put(SB, game, cx, cz, {});
  C.sendTo(me, far.x, far.z, game, 90, true);
  // hand it the route a wrong map would: one step onto that ground, then the goal
  const route = [{ x: bad.x, z: bad.z }, { x: far.x, z: far.z }];
  me.path = route; me.pathI = 0; me.pathLegI = -1; me.pathLegT = 0; me.pathTried = true; me.pathGoal = { x: me.action.tx, z: me.action.tz }; me.wBest = Math.hypot(far.x - me.x, far.z - me.z); me.wBestT = 0;
  let held = 0, dropped = -1, wasLost = false, nearest = 1e9; const t0 = game.time;
  step(SB, game, 40, s => { me.chem.hunger = 0.3; me.chem.sleepy = 0; me.chem.tired = 0; if (me.fr) me.fr.aw = 0; /* not homesick: see section 2 */ if (me.path === route && (me.pathI || 0) === 0) held += SB.TICK; else if (dropped < 0) { dropped = game.time - t0; wasLost = !!me.lost || wasLost; } if (me.lost) wasLost = true; nearest = Math.min(nearest, Math.hypot(me.x - bad.x, me.z - bad.z)); return dropped < 0; });
  check("it could not reach the step", nearest > 0.7, "nearest " + nearest.toFixed(1) + " paces");
  check("the route is dropped: 8 seconds after its last progress, not at once and not never", dropped >= 7.5 && dropped <= 25, dropped >= 0 ? "after " + dropped.toFixed(1) + "s" : "still on it after 40s");
  check("it is marked lost, so it scrambles back to proper ground", wasLost);
  check("it never held that one step for a minute", held < 60, held.toFixed(0) + "s on the step");
});

console.log("4. the two guards");
seeded(4488, () => {
  const { SB, game, W, w, hm } = island(102), C = SB.Creature;
  check("the numbers: a minute on one step at most", C.ROUTE_STEP_MAX === 60 && C.ROUTE_STALL === 8);
  // open ground near home to walk on: find a spot 30 paces off with a plain straight walk to it
  let goal = null;
  for (let a = 0; a < 6.28 && !goal; a += 0.3) { const x = hm.x + Math.sin(a) * 30, z = hm.z + Math.cos(a) * 30; let ok = true; for (let t = 0; t <= 1 && ok; t += 0.05) ok = W.walkable(w, hm.x + (x - hm.x) * t, hm.z + (z - hm.z) * t, false); if (ok) goal = { x, z }; }
  check("there is open ground by home to walk across", !!goal);
  if (!goal) return;
  {
    // the cap: a smol 59.9 seconds into one step of a route, still creeping nearer
    const me = put(SB, game, hm.x + 1, hm.z + 1, {});
    C.sendTo(me, goal.x, goal.z, game, 90, true);
    const route = [{ x: goal.x, z: goal.z }];
    step(SB, game, 0.5);
    me.path = route; me.pathI = 0; me.pathLegI = 0; me.pathLegBest = Math.hypot(goal.x - me.x, goal.z - me.z); me.pathLegT = 0; me.pathLegAll = 59.9; me.pathTried = true; me.pathGoal = { x: me.action.tx, z: me.action.tz };
    const d0 = Math.hypot(goal.x - me.x, goal.z - me.z);
    step(SB, game, 0.5, () => { me.chem.hunger = 0.3; });
    check("past a minute on one step the route is let go, and it is not marked lost", me.path !== route && !me.lost, me.path === route ? "still on it" : "");
    step(SB, game, 6, () => { me.chem.hunger = 0.3; });
    check("and it carries on toward the same place", Math.hypot(goal.x - me.x, goal.z - me.z) < d0 - 3, (d0 - Math.hypot(goal.x - me.x, goal.z - me.z)).toFixed(1) + " paces nearer after 6s");
  }
  {
    // sent on a long walk while only peckish; then it gets starving on the way
    // it starts nine paces out from home along the open walk, with an apple six paces behind it: food (or the pod at
    // home) within three or four paces of a hungry walker is a snack, and it stops for that whoever sent it
    const on = t => ({ x: hm.x + (goal.x - hm.x) * t, z: hm.z + (goal.z - hm.z) * t });
    const me = put(SB, game, on(0.3).x, on(0.3).z, { hunger: 0.5 });
    W.add(w, game, "apple", on(0.1).x, on(0.1).z, {});
    const sent = C.sendTo(me, goal.x, goal.z, game, 90);
    step(SB, game, 2, () => { me.chem.hunger = 0.5; });
    const walking = () => !!me.action && me.action.verb === SB.V.wander && !!me.action.sent;
    check("sent, and not forced: it sets off", sent === true && walking());
    me.chem.hunger = 0.9;
    step(SB, game, 1, () => { me.chem.hunger = Math.max(me.chem.hunger, 0.9); });
    check("starving on the way, it breaks the walk off", !walking(), me.action ? SB.VERBS[me.action.verb] : "no action");
    let ate = -1; const t0 = game.time; SB.bus.on("eat", d => { if (d && d.c === me && ate < 0) ate = game.time; });
    step(SB, game, 40, () => ate < 0);
    check("and eats", ate >= 0, ate >= 0 ? "after " + Math.round(ate - t0) + "s" : "no meal in 40s");
    // forced (danger, the player's own word): it keeps walking
    const me2 = put(SB, game, on(0.35).x, on(0.35).z, { hunger: 0.9 });
    C.sendTo(me2, goal.x, goal.z, game, 90, true);
    step(SB, game, 3, () => { me2.chem.hunger = 0.9; });
    check("a forced walk is not broken off", !!me2.action && me2.action.verb === SB.V.wander && !me2.action.sent && me2.action.called === true);
  }
});

console.log("5. food is chosen by the length of the way to it");
seeded(4495, () => {
  // island 102, the cell where two smols died: an apple 12 paces off as the crow flies, and some 60 round the steep band
  const mk = () => { const I = island(102), { hm } = I; return Object.assign(I, { cx: hm.x - 3, cz: hm.z - 58, ax: hm.x + 8, az: hm.z - 62 }); };
  const here = (w, o) => w.items.indexOf(o) >= 0 && !o.gone;
  {
    const { SB, game, W, w, cx, cz, ax, az } = mk(), C = SB.Creature;
    check("the numbers: over 25 paces and twice the straight line is the long way round; 2.5 noses at most; remembered a minute", C.ROUTE_FAR === 25 && C.ROUTE_REACH === 2.5 && C.ROUTE_KEPT === 60);
    const d0 = Math.hypot(ax - cx, az - cz), pl = routeLen(W.findPath(w, cx, cz, ax, az, false, 5000), cx, cz);
    check("the apple is a long way round", pl > C.ROUTE_FAR && pl > d0 * 2, d0.toFixed(0) + " paces straight, " + pl.toFixed(0) + " round");
    // a second meal on its own side: further off as the crow flies, a plain walk
    let near = null;
    for (let r = 18; r <= 26 && !near; r += 2) for (let a = 0; a < 6.28 && !near; a += 0.25) { const x = cx + Math.sin(a) * r, z = cz + Math.cos(a) * r; let ok = W.walkable(w, x, z, false); for (let t = 0; t <= 1 && ok; t += 0.04) ok = W.walkable(w, cx + (x - cx) * t, cz + (z - cz) * t, false) && W.depthAt(w, cx + (x - cx) * t, cz + (z - cz) * t) < 0.05; if (ok) near = { x, z, r }; }
    check("there is open ground on its own side, further off than the apple and nearer than the walk round", !!near && near.r > d0 + 4 && near.r < pl - 10, near ? near.r + " paces" : "none");
    if (near) {
      clearFood(SB, game, cx, cz, 80);
      const me = put(SB, game, cx, cz, { hunger: 0.97 });
      const apple = W.add(w, game, "apple", ax, az, {}), berry = W.add(w, game, "berry", near.x, near.z, {});
      let ate = -1, walked = 0, px = me.x, pz = me.z, knew = 0; const t0 = game.time;
      SB.bus.on("eat", d => { if (d && d.c === me && ate < 0) ate = game.time; });
      step(SB, game, 150, () => { walked += Math.hypot(me.x - px, me.z - pz); px = me.x; pz = me.z; knew = Math.max(knew, C.routeKnown(me, apple.id, game)); me.chem.health = Math.max(me.chem.health, 0.5); if (ate < 0 && me.chem.hunger < 0.8) ate = game.time; /* fed, whichever way the meal went down */ return ate < 0 && me.alive; });
      check("it found out how long the way to the apple is", knew > C.ROUTE_FAR, knew.toFixed(0) + " paces");
      check("it ate the berry on its own side, and the apple is still there", ate >= 0 && !here(w, berry) && here(w, apple), ate >= 0 ? "after " + Math.round(ate - t0) + "s" : "no meal in 150s");
      check("after a walk no longer than the berry is far (and a few paces looking)", walked < near.r + 10, walked.toFixed(0) + " paces walked, the berry " + near.r + " off");
    }
  }
  {
    // the apple alone: it is the best there is, and it takes the long way and gets there
    const { SB, game, W, w, cx, cz, ax, az } = mk(), C = SB.Creature;
    clearFood(SB, game, cx, cz, 80);
    const me = put(SB, game, cx, cz, { hunger: 0.97 });
    const apple = W.add(w, game, "apple", ax, az, {});
    let ate = -1, walked = 0, px = me.x, pz = me.z, given = 0; const t0 = game.time;
    SB.bus.on("eat", d => { if (d && d.c === me && ate < 0) ate = game.time; });
    step(SB, game, 240, () => { walked += Math.hypot(me.x - px, me.z - pz); px = me.x; pz = me.z; if (me.unreach && me.unreach[apple.id] > game.time) given += SB.TICK; me.chem.health = Math.max(me.chem.health, 0.5); if (ate < 0 && me.chem.hunger < 0.8) ate = game.time; /* fed, whichever way the meal went down */ return ate < 0 && me.alive; });
    check("with no nearer food lying about it still feeds itself (the apple, or a plant on the way)", ate >= 0, ate >= 0 ? "after " + Math.round(ate - t0) + "s and " + walked.toFixed(0) + " paces" : "no meal in 240s, " + walked.toFixed(0) + " paces walked");
    check("and never gave the apple up on the way", given === 0, given.toFixed(0) + "s with the apple given up");
  }
  {
    // a way longer than its hunger is worth (the limit turned down for the check: half a nose)
    const { SB, game, W, w, cx, cz, ax, az } = mk(), C = SB.Creature;
    C.ROUTE_REACH = 0.5;
    clearFood(SB, game, cx, cz, 80);
    const me = put(SB, game, cx, cz, { hunger: 0.97 });
    const apple = W.add(w, game, "apple", ax, az, {});
    let left = false, walked = 0, px = me.x, pz = me.z;
    step(SB, game, 12, () => { walked += Math.hypot(me.x - px, me.z - pz); px = me.x; pz = me.z; if (me.unreach && me.unreach[apple.id] > game.time) left = true; me.chem.health = Math.max(me.chem.health, 0.5); return !left; });
    check("a way longer than its hunger is worth is left alone, like food it cannot reach", left && walked < 12, (left ? "left alone" : "still after it") + ", " + walked.toFixed(0) + " paces walked");
  }
  check("the source: the nose weighs a food by the walk it knows", /routeKnown\(c, ?it\.id, ?game\)/.test(js("creature.js")) && /routeKnown\(c, ?o\.id, ?game\) ?>= ?far/.test(js("creature.js")));
});

console.log("6. the clock for one food follows its route");
seeded(4496, () => {
  const { SB, game, hm } = island(102), C = SB.Creature;
  const me = put(SB, game, hm.x + 1, hm.z + 1, { hunger: 0.5 });
  const a = { verb: SB.V.eat, t: 0, target: { type: "item", id: 1 } };
  check("a straight walk: 25 seconds, as before", C.goLimit(me, a) === 25);
  me.chem.hunger = 0.97;
  check("starving: 90 seconds, as before", C.goLimit(me, a) === 90);
  const sp = C.speedOf(me, a);
  me.path = [{ x: me.x + 5, z: me.z }]; a.routeLen = 150; a.routeT = 2;
  const want = 2 + 150 / sp * 1.5 + 10;
  check("on a route of 150 paces: what the route needs at its own pace, half again, and ten seconds", Math.abs(C.goLimit(me, a) - want) < 1e-9 && want > 90, C.goLimit(me, a).toFixed(0) + "s at " + sp.toFixed(2) + " paces a second");
  a.routeLen = 12;
  check("a short route never makes the clock shorter", C.goLimit(me, a) === 90);
  me.path = null; a.routeLen = 150;
  check("off the route it is the plain clock again", C.goLimit(me, a) === 90);
  me.chem.hunger = 0.5; me.path = [{ x: me.x + 5, z: me.z }]; a.routeLen = 60;
  check("a smol that is only hungry gets the route's time too", C.goLimit(me, a) > 25 && Math.abs(C.goLimit(me, a) - (2 + 60 / C.speedOf(me, a) * 1.5 + 10)) < 1e-9, C.goLimit(me, a).toFixed(0) + "s");
  check("the source: the walk to food asks the clock that follows the route", /a\.t ?> ?goLimit\(c, ?a\)/.test(js("creature.js")) && !/a\.t ?> ?\(starvingFor\(c, ?a\) ?\? ?90 ?: ?25\)/.test(js("creature.js")));
});

console.log("7. three small things from the proof pass");
seeded(4497, () => {
  const ctx = load();
  ["meshes.js", "ext.js", "bosses.js", "body.js", "possess.js", "home.js", "loot.js", "animals.js", "surgery.js"].forEach(f => { if (!(f === "bosses.js" && ctx.SB.Bosses) && !(f === "surgery.js" && ctx.SB.Surgery) && fs.existsSync(path.join(dir, f))) vm.runInContext(js(f), ctx, { filename: f }); });
  const SB = ctx.SB, P = SB.Possess, A = SB.Animals, Surv = SB.Surv || SB.Survival, W = SB.World; P.headless = true;
  const game = SB.Game.newGame(133); SB.Game.current = game; game.tutorial.done = true; game.headless = true;
  SB.Game.hatch(game, game.world.items.find(o => o.data && o.data.pod));
  const me = SB.Game.smols(game)[0]; me.tier = 3; me.stage = 3;
  const flat = (() => { const s = game.world.T.spawn; for (let r = 4; r < 40; r += 2) for (let a = 0; a < 6.28; a += 0.4) { const x = s.x + Math.sin(a) * r, z = s.z + Math.cos(a) * r; if (W.siteFree(game.world, x, z, 2.2) && W.siteFree(game.world, x + 4, z, 1) && W.siteFree(game.world, x - 4, z, 1)) return { x, z }; } return { x: s.x, z: s.z }; })();
  me.x = flat.x; me.z = flat.z; me.px = flat.x; me.pz = flat.z;
  P.enter(game, me, { free: true });
  const hold = (k, n) => { const v = Surv.inv(me); for (let i = 0; i < v.s.length; i++) v.s[i] = null; if (k) { Surv.add(me, k, n || 1); Surv.select(me, v.s.findIndex(x => x && x.k === k)); } else Surv.select(me, 0); };
  const opts = it => P.options(game, me, { type: "item", id: it.id });
  const lab = o => o && o.label ? o.label : "";
  // a grunter (it does not fight) at your heels, and a clucker (it does) that had to wait
  const gr = A.tame(game, me, A.spawnWild(game, "grunter", me.x + 1.5, me.z, "", false)).rec;
  const cr = A.tame(game, me, A.spawnWild(game, "clucker", me.x - 1.5, me.z, "", false)).rec;
  check("set-up: a grunter does not fight and a clucker does; the first follows, the second waits (the heels are full)", !A.SP.grunter.fight && A.SP.clucker.fight > 0 && gr.mode === "follow" && cr.mode === "stay", gr.mode + " / " + cr.mode);
  hold("pad", 1);
  const og = opts(A.body(game, gr)), oc = opts(A.body(game, cr));
  check("padding in the paw: no padding button on the one that does not fight", !/padding/.test(lab(og.place) + lab(og.use) + lab(og.pick)), lab(og.place));
  check("...and one on the one that does", /^fit your padding on /.test(lab(oc.place)), lab(oc.place));
  check("the rule itself still refuses a non-fighter and keeps the padding", !A.fit(game, me, gr, "pad").ok && Surv.count(me, "pad") === 1);
  // called to heel with the heels full
  const r = A.setMode(game, me, cr, "follow");
  check("called to heel with the heels full: the answer says who to tell to wait", !r.ok && r.full === true && r.msg.indexOf("tell " + gr.name + " to wait first") >= 0 && cr.mode === "stay", r.msg);
  // a pen beside them
  hold("stick", 6); Surv.add(me, "vine", 2);
  const pen = A.buildPen(game, me).st;
  check("set-up: a pen within reach of both", !!pen && Math.hypot(pen.x - A.body(game, cr).x, pen.z - A.body(game, cr).z) < 9);
  if (pen) {
    hold(null);
    const o2 = opts(A.body(game, cr));
    check("the one waiting by the pen: its own button puts it in", lab(o2.place) === "put " + cr.name + " in the pen", lab(o2.place));
    check("the one at your heels has no such button (the pen's own button offers it)", !/in the pen/.test(lab(opts(A.body(game, gr)).place)) && lab(P.options(game, me, { type: "struct", id: pen.id }).use) === "put " + gr.name + " in the pen", lab(P.options(game, me, { type: "struct", id: pen.id }).use));
    if (o2.place && o2.place.go) o2.place.go();
    check("pressed: it is in the pen", cr.mode === "pen" && cr.pen === pen.id, cr.mode);
    check("once in, the button is gone", !/in the pen/.test(lab(opts(A.body(game, cr)).place)));
    A.setMode(game, me, gr, "stay");
    check("told to wait, the other one gets the button too", lab(opts(A.body(game, gr)).place) === "put " + gr.name + " in the pen", lab(opts(A.body(game, gr)).place));
    hold("carrot", 1);
    check("with its food in your paw the button is still \"feed\"", /^feed /.test(lab(opts(A.body(game, gr)).place)), lab(opts(A.body(game, gr)).place));
  }
  // the lab
  const f = SB.Surgery.fire(game, me, 1), src = fs.readFileSync(path.join(__dirname, "..", "src", "surgery.js"), "utf8");
  check("firing an input says the island waits while the window is open", f.ok && /it is on for its next 3 thoughts\. the island waits while this window is open: close it to watch/.test(f.msg), f.msg);
  check("and the lab says so above the list", /the island holds still while this window is open\. what you fire starts when you close it\./.test(src));
});

console.log("8. the grump with a grudge says what it is");
seeded(4498, () => {
  const { SB, game, W, w, hm } = island(102), D = SB.Dark, P = SB.Possess;
  check("the two lines are there, and say how to be rid of it", /follows whichever smol you play/.test(D.GRUDGE_LINE) && /leaves for good/.test(D.GRUDGE_LINE) && /couple of days/.test(D.GRUDGE_LINE) && /in this body too/.test(D.GRUDGE_AGAIN));
  const a = put(SB, game, hm.x + 2, hm.z + 2, {}), b = put(SB, game, hm.x + 4, hm.z + 2, {});
  const said = []; const say0 = P.say; P.say = t => { said.push(String(t)); };
  P.enter(game, a, { free: true });
  // the game sends one on every twelfth grump a body chases off
  for (let i = 0; i < 12; i++) SB.bus.emit("grumpChased", { c: a, g: { x: a.x + 3, z: a.z, boss: true } });
  const posts = () => D.state(game).posts.filter(q => q.bid === "grudge");
  check("the twelfth chase brings it", posts().length === 1, posts().length + " grudge posts");
  check("and the game says what it is, once", said.filter(t => t === D.GRUDGE_LINE).length === 1, said.filter(t => t === D.GRUDGE_LINE).length + " time(s)");
  for (let i = 0; i < 20; i++) D.tick(game, 0.5);
  check("it does not say it again to the same body", said.filter(t => t === D.GRUDGE_LINE || t === D.GRUDGE_AGAIN).length === 1, said.filter(t => t === D.GRUDGE_LINE || t === D.GRUDGE_AGAIN).length + " of the two lines");
  // another body: it finds that one too, and says so
  P.leave(); b.x = hm.x + 40; b.z = hm.z + 2; P.enter(game, b, { free: true });
  for (let i = 0; i < 20; i++) D.tick(game, 0.5);
  const p = posts()[0];
  check("in another body it follows, and says so once", !!p && Math.hypot(p.x - b.x, p.z - b.z) < 9 && said.filter(t => t === D.GRUDGE_AGAIN).length === 1, p ? Math.hypot(p.x - b.x, p.z - b.z).toFixed(0) + " paces off, " + said.filter(t => t === D.GRUDGE_AGAIN).length + " time(s)" : "no post");
  // one put down without a word (as a test or a save from before 4.49 has it) gets the full line the first time it has a body to follow
  D.state(game).posts.slice().forEach(q => { if (q.bid === "grudge") D.beastDone(game, q, null, "left"); });
  said.length = 0;
  D.spawnBeast(game, "grudge", { x: b.x + 6, z: b.z }, { quiet: true });
  for (let i = 0; i < 6; i++) D.tick(game, 0.5);
  check("one that came without a word says the whole of it when it first has a body to follow", said.filter(t => t === D.GRUDGE_LINE).length === 1 && said.filter(t => t === D.GRUDGE_AGAIN).length === 0);
  // what is true of it: beaten, it is gone; left alone, it goes at the second dawn
  check("the rule behind the last words: an old beast that is not a guard leaves at dawn after two days", /d - p\.day >= \(bd\.big \? 3 : 2\)\) D\.beastDone\(game, p, null, "left"\)/.test(fs.readFileSync(path.join(__dirname, "..", "src", "dark.js"), "utf8")));
  P.leave(); P.say = say0;
});

console.log("9. four small things from rows 121 to 160");
seeded(4499, () => {
  const { SB, game, W, w, hm } = island(102), H = SB.Harvest, D = SB.Dark, P = SB.Possess, Surv = SB.Surv || SB.Survival;
  const me = put(SB, game, hm.x + 3, hm.z + 3, {}); me.tier = 5;
  P.enter(game, me, { free: true });
  const hold = (k, n) => { const v = Surv.inv(me); for (let i = 0; i < v.s.length; i++) v.s[i] = null; Surv.add(me, k, n || 1); Surv.select(me, v.s.findIndex(x => x && x.k === k)); };
  const lab = o => (o && o.label) || "";
  // open ground near home for a bed
  let spot = null; for (let r = 5; r < 40 && !spot; r += 2) for (let a = 0; a < 6.28 && !spot; a += 0.4) { const x = hm.x + Math.sin(a) * r, z = hm.z + Math.cos(a) * r; if (W.siteFree(w, x, z, 2.2) && W.depthAt(w, x, z) < 0.01) spot = { x, z }; }
  me.x = spot.x - 1.5; me.z = spot.z; hold("hoe");
  const bed = H.till(game, me, spot.x, spot.z).st, bref = { type: "struct", id: bed && bed.id };
  check("set-up: a bed, in a biome that is not jungle", !!bed && SB.BIOMES[W.biomeAt(w, bed.x, bed.z)].id !== "jungle");
  const use = () => P.options(game, me, bref).use;
  w.season = 3; hold("s_grain", 2);
  check("grain seeds at a bed in winter: the button says why, and cannot be pressed", !!use() && use().locked === true && /grain won't grow in winter/.test(lab(use())) && !bed.data.crop && Surv.count(me, "s_grain") === 2, lab(use()));
  check("it is the answer sowing itself gives", H.sowWhy(game, bed, "s_grain") === H.sow(game, me, bed, "s_grain").msg);
  hold("seed", 2);
  check("wild seeds in winter still sow (a glowcap comes up)", lab(use()) === "sow wild seeds" && !use().locked);
  w.season = 0; hold("s_cocoa", 2);
  check("cocoa seeds outside the jungle: the button says why", use().locked === true && /only grows in jungle ground/.test(lab(use())), lab(use()));
  hold("s_sunroot", 2);
  check("sunroot in spring: the plain button, and it sows", lab(use()) === "sow sunroot" && !use().locked && use().go() !== false && bed.data.crop === "sunroot");
  check("a sown bed gives no reason for more seeds", H.sowWhy(game, bed, "s_grain") === "");
  // the parley line says what is there
  const pl = D.LINE_BY.parley.steps;
  check("the parley line no longer says a grump is standing there before one is", !/a grump is waiting/.test(pl[0][1]) && /white rag on a stick/.test(pl[0][1]) && /go and stand by it/.test(pl[0][1]) && /a grump steps out, alone, and speaks/.test(pl[1][1]), pl[0][1]);
  // a wave's count
  const dsrc = fs.readFileSync(path.join(__dirname, "..", "src", "dark.js"), "utf8");
  check("a wave's last line and the tribe tab never count more chased off than came", /Math\.min\(w\.chased, w\.total\) \+ " of " \+ w\.total \+ " chased off"/.test(dsrc) && /Math\.min\(x\.wave\.chased, x\.wave\.total\) \+ " of " \+ x\.wave\.total \+ " chased off"/.test(dsrc) && !/" \+ w\.chased \+ " of " \+ w\.total/.test(dsrc));
  // a standing order's reason, asked when you look
  check("no chest: the order says so", (() => { const o = H.order(game, { id: "whetstone", mode: "keep", n: 2 }); return o.ok && H.orderWhy(game, o.order) === "orders need a chest at home"; })());
  const hut = W.addStructure(w, game, "hut", spot.x + 5, spot.z + 3, { done: true }); hut.done = true;
  if (SB.Home.get(game) !== hut) SB.Home.claim(game, hut, me);
  SB.Home.state(game).got.chest = 1; const chest = SB.Home.chest(game); for (let i = 0; i < chest.length; i++) chest[i] = null;
  const e = H.orders(game)[0];
  check("a chest and no bench: no workbench", H.orderWhy(game, e) === "no workbench");
  Surv.add(me, "plank", 4); Surv.add(me, "stone", 2); const mk = H.make(game, me, "workbench"), bench = w.structures.filter(b => b.kind === "workbench").pop();
  check("set-up: a workbench", !!mk.ok && !!bench);
  me.x = bench.x + 1.5; me.z = bench.z;
  check("an empty chest: short of materials", H.orderWhy(game, e) === "short of materials in the chest");
  SB.Home.put(game, "stone", 20); SB.Home.put(game, "flint", 10);
  check("materials in and a smol at the bench: no reason, at once (the stored reason is still the old one)", H.orderWhy(game, e) === "" && (e.why === undefined || e.why === "" || /short/.test(e.why || "")));
  e.who = 424242;
  check("locked to a smol that is not there: its smol is not near the bench", H.orderWhy(game, e) === "its smol is not near the bench");
  e.who = me.id; me.x = bench.x + 30;
  check("locked to me, and me thirty paces off: the same", H.orderWhy(game, e) === "its smol is not near the bench");
  me.x = bench.x + 1.5;
  check("back at the bench: no reason, and the order is worked", H.orderWhy(game, e) === "" && H.workOrders(game).ok === true);
  check("the bench page asks for the reason when it is drawn", /H\.orderWhy\(game, e\) \? "<small class='no'>"/.test(fs.readFileSync(path.join(__dirname, "..", "src", "harvest.js"), "utf8")));
  P.leave();
});

console.log("10. the level inside a wreck can be reached");
seeded(4500, () => {
  const { SB, game, hm } = island(102), M = SB.Motion3;
  const me = put(SB, game, hm.x + 3, hm.z + 3, {});
  const has = () => M.slateFor(game, me).some(x => x[0] === "ark" && x[1] === "inside the wreck");
  check("a new island's wreck sites are all hidden, and none is found", game.sites.filter(t => t.kind === "wreck").length > 0 && game.sites.filter(t => t.kind === "wreck").every(t => t.gone && !t.found));
  check("with no opened pod near, the slate does not offer it", !has());
  const pod = { id: game.sites.length, kind: "pod", x: me.x + 4, z: me.z, rot: 0, found: true, done: false, n: 1 }; game.sites.push(pod);
  check("a crashed pod nobody has opened yet does not count", !has());
  pod.done = true;
  check("standing by an opened pod, the slate offers \"inside the wreck\"", has());
  me.x = pod.x + 12;
  check("twelve paces off it does not", !has());
  me.x = pod.x + 4; pod.gone = true;
  check("a pod that is gone does not count", !has());
  pod.gone = false; pod.done = false;
  const wr = game.sites.filter(t => t.kind === "wreck")[0]; wr.found = true; me.x = wr.x + 3; me.z = wr.z;
  check("a found wreck (an old save has them) still counts", has());
});

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
