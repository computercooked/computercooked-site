// 4.48: a wading or swimming route crosses water, not cliffs (island 102: three starving smols stood at the foot of a
// band of steep ground until they died; smol-brains-handover/4.46-island-102-the-spot-where-three-starved.txt).
//   1. the route grid remembers why a cell is shut: 1 open, 2 shut by water alone, 0 shut for everyone
//   2. on island 102's own ground, from the cell where two of them died: the swimming route no longer runs through the
//      steep band, and a starving smol put there walks round and eats
//   3. a finned smol and an ascended one (tier 6), who swim all the time, walk round the same band and do not freeze
//   4. water is still crossed: a starving smol cut off by a strait wades it and eats (4.37, 4.40)
//   5. the safety net: a minute's wading that left it where it began is given up, and not tried again for three minutes
//   6. a route is judged by progress along it: one that leads away from the goal first (round a band of steep ground) is
//      walked to its end. It used to be dropped 8 seconds after the smol last got nearer the goal in a straight line
//      (smol-brains-handover/4.48-island-102-the-one-that-still-starved.txt)
//   8. two guards for routes that are now walked to their end: no step of a route runs past a minute (it is planned
//      again from where the smol stands), and a smol that gets starving on a walk it was sent on breaks it off to eat
//      (island 77: one walked home from a grump camp past food and starved)
//   7. the case the old rule was written for still holds: a route whose next step the smol cannot reach (a ledge the
//      coarse map thinks is fine) is dropped after 8 seconds, and the smol is marked lost so it scrambles back
// node games/smol-brains/tests/play448.test.js
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
function step(SB, game, secs, each) { for (let s = 0; s < secs / SB.TICK; s++) { if (each && each(s) === false) return s * SB.TICK; SB.Game.step(game, SB.TICK); if (SB.Ext) SB.Ext.tick(game, SB.TICK); } return secs; }
const isFood = (SB, o) => SB.KINDS[o.kind] && SB.KINDS[o.kind].noun === "food";
function clearFood(SB, game, x, z, r) { game.world.items.filter(o => isFood(SB, o) && Math.hypot(o.x - x, o.z - z) < r).forEach(o => { if (SB.World.remove) SB.World.remove(game.world, o); else o.x += 5000; }); }
const routeLen = (p, x, z) => { if (!p) return -1; let l = 0; p.forEach(q => { l += Math.hypot(q.x - x, q.z - z); x = q.x; z = q.z; }); return l; };
const steepOn = (SB, w, p) => (p || []).filter(q => SB.WorldGen.slopeAt(w.T, q.x, q.z) > 2.8).length;
// a plain grown smol with no fins, put on a spot, awake, with nothing on its mind
function put(SB, game, x, z, o) {
  const c = SB.Game.spawnSmol(game, { x: x, z: z, age: 700 }); o = o || {};
  c.tier = o.tier != null ? o.tier : 3; c.look = c.look || {}; c.look.fins = !!o.fins; c.wade = 0; c.lifespan = 1e7;
  c.chem.health = 1; c.chem.hunger = o.hunger != null ? o.hunger : 0.3; c.chem.sleepy = 0; c.chem.tired = 0;
  return c;
}

console.log("1. the route grid remembers why a cell is shut");
{
  const { SB, game, W, w } = island(102), g = w.pathGrid, n = w.pathN, PC = W.PATH_CELL;
  let c1 = 0, c2 = 0, c0 = 0, wrongWater = 0, wrongSteep = 0, wrongOpen = 0;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = g[j * n + i], x = i * PC + PC / 2, z = j * PC + PC / 2;
    if (v === 1) c1++; else if (v === 2) c2++; else c0++;
    const pts = [[0, 0], [-0.6, 0], [0.6, 0], [0, -0.6], [0, 0.6]].map(o => [x + o[0], z + o[1]]);
    const walk = pts.filter(p => W.walkable(w, p[0], p[1], false)).length, swim = pts.filter(p => W.walkable(w, p[0], p[1], true)).length;
    if (v === 1 && walk < 4) wrongOpen++;
    if (v === 2 && !(walk < 4 && swim >= 4)) wrongWater++;
    if (v === 0 && swim >= 4) wrongSteep++;
  }
  check("the grid holds all three kinds on island 102", c1 > 1000 && c2 > 100 && c0 > 100, "open " + c1 + ", water " + c2 + ", shut " + c0);
  check("1 is ground you can walk, 2 is shut by water alone, 0 is shut for a swimmer too", wrongOpen === 0 && wrongWater === 0 && wrongSteep === 0, wrongOpen + " / " + wrongWater + " / " + wrongSteep);
  check("pathOpen still means plain walkable ground", (() => { for (let j = 0; j < n; j += 7) for (let i = 0; i < n; i += 7) if (W.pathOpen(w, i * PC + 1, j * PC + 1) !== (g[j * n + i] === 1)) return false; return true; })());
  check("a finished bridge still opens its cells", (() => { const k = g.findIndex(v => v === 2), x = (k % n) * PC + 1, z = ((k / n) | 0) * PC + 1; W.openPathAt(w, x, z, 0.5); const ok = g[k] === 1; g[k] = 2; return ok; })());
  check("the source: a swimming route opens what is not shut for everyone", /function open\(k\) ?\{ ?return swim ?\? ?g\[k\] ?!== ?0 ?: ?g\[k\] ?=== ?1;? ?\}/.test(js("world.js")));
}

console.log("2. island 102, the cell where two of them died");
seeded(4482, () => {
  const { SB, game, W, w, hm } = island(102);
  const cx = hm.x - 3, cz = hm.z - 58, ax = hm.x + 8, az = hm.z - 62; // Bibena's cell, and the apple it wanted 12 paces off
  check("home is where the run's home was", Math.abs(hm.x - 225.9) < 0.2 && Math.abs(hm.z - 256.3) < 0.2, hm.x.toFixed(1) + ", " + hm.z.toFixed(1));
  check("the cell can be stood on, and the apple's spot too", W.walkable(w, cx, cz, false) && W.walkable(w, ax, az, false));
  const line = []; for (let t = 0; t <= 1; t += 0.05) line.push({ x: cx + (ax - cx) * t, z: cz + (az - cz) * t });
  check("steep ground lies between them, and no water", steepOn(SB, w, line) >= 2 && line.every(q => W.depthAt(w, q.x, q.z) < 0.12), steepOn(SB, w, line) + " steep points on the straight line");
  const plain = W.findPath(w, cx, cz, ax, az, false, 5000), swim = W.findPath(w, cx, cz, ax, az, true, 5000);
  const pl = routeLen(plain, cx, cz), sl = routeLen(swim, cx, cz);
  check("the plain route walks round: long", !!plain && pl > 40, pl.toFixed(0) + " paces");
  check("the swimming route goes round too, over no steep ground (it was 13 paces, straight through the band)", !!swim && sl > 40 && steepOn(SB, w, swim) === 0, sl.toFixed(0) + " paces, " + steepOn(SB, w, swim) + " steep cells on it");
  // a starving smol on that cell, the apple and a berry on the far side, no other food near
  clearFood(SB, game, cx, cz, 60);
  const me = put(SB, game, cx, cz, { hunger: 0.97 });
  W.add(w, game, "apple", ax, az, {}); W.add(w, game, "berry", hm.x + 14, hm.z - 64, {});
  let ate = -1, waded = 0, far = 0; const x0 = me.x, z0 = me.z;
  SB.bus.on("eat", d => { if (d && d.c === me && ate < 0) ate = game.time; });
  const t0 = game.time;
  step(SB, game, 240, () => { if (me.wade > 0) waded += SB.TICK; far = Math.max(far, Math.hypot(me.x - x0, me.z - z0)); me.chem.health = Math.max(me.chem.health, 0.5); return ate < 0 && me.alive; });
  check("it left the cell (they stood on it for 200 seconds and more)", far > 6, far.toFixed(0) + " paces at the furthest");
  check("it ate", ate >= 0, ate >= 0 ? "after " + Math.round(ate - t0) + "s" : "no meal in 240s, " + Math.hypot(me.x - ax, me.z - az).toFixed(0) + " paces from the apple");
  check("it did not go wading where there is no water", waded < 1, waded.toFixed(0) + "s wading");
});

console.log("3. smols that swim all the time walk round the band too");
seeded(4483, () => {
  // the same case as the two that died, for a smol whose every route is a swimming route: starving, the food across the band
  [["a finned smol", { fins: true }], ["an ascended smol (tier 6)", { tier: 6 }]].forEach(([name, o]) => {
    const { SB, game, W, w, hm } = island(102), C = SB.Creature;
    const cx = hm.x - 3, cz = hm.z - 58, ax = hm.x + 8, az = hm.z - 62;
    clearFood(SB, game, cx, cz, 60);
    const me = put(SB, game, cx, cz, Object.assign({ hunger: 0.97 }, o));
    W.add(w, game, "apple", ax, az, {}); W.add(w, game, "berry", hm.x + 14, hm.z - 64, {});
    check(name + " swims", C.canSwim(me) === true);
    let ate = -1, far = 0; const x0 = me.x, z0 = me.z, t0 = game.time;
    SB.bus.on("eat", d => { if (d && d.c === me && ate < 0) ate = game.time; });
    step(SB, game, 240, () => { far = Math.max(far, Math.hypot(me.x - x0, me.z - z0)); me.chem.health = Math.max(me.chem.health, 0.5); return ate < 0 && me.alive; });
    check(name + " leaves the cell and eats", far > 6 && ate >= 0, ate >= 0 ? "after " + Math.round(ate - t0) + "s, " + far.toFixed(0) + " paces at the furthest" : "no meal in 240s, " + far.toFixed(0) + " paces at the furthest");
  });
});

console.log("4. water is still crossed");
seeded(4484, () => {
  // find a strait on an island: two walkable spots 6 to 14 paces apart with deep water between them and a long walk round
  let found = null;
  for (const seed of [102, 23, 101, 4401]) {
    const I = island(seed), { SB, W, w } = I, g = w.pathGrid, n = w.pathN, PC = W.PATH_CELL, sp = w.T.spawn;
    const cell = (i, j) => (i < 0 || j < 0 || i >= n || j >= n) ? 0 : g[j * n + i];
    for (let j = 4; j < n - 4 && !found; j++) for (let i = 4; i < n - 4 && !found; i++) {
      if (cell(i, j) !== 1) continue;
      for (const [di, dj] of [[1, 0], [0, 1]]) {
        let k = 1; while (k <= 6 && cell(i + di * k, j + dj * k) === 2) k++;
        if (k < 3 || k > 6 || cell(i + di * k, j + dj * k) !== 1) continue; // two to five water cells, then land again
        const ax = i * PC + 1, az = j * PC + 1, bx = (i + di * k) * PC + 1, bz = (j + dj * k) * PC + 1;
        if (Math.hypot(ax - sp.x, az - sp.z) > 200) continue;
        const plain = W.findPath(w, ax, az, bx, bz, false, 40000), d0 = Math.hypot(bx - ax, bz - az), pl = routeLen(plain, ax, az);
        if (plain && pl > 60 && pl < 220) { found = Object.assign(I, { seed, ax, az, bx, bz, d0, pl }); break; } // a walk round long enough that only wading will do
      }
    }
    if (found) break;
  }
  check("there is a strait to try on one of the islands", !!found, found ? "island " + found.seed + ": " + found.d0.toFixed(0) + " paces across, " + found.pl.toFixed(0) + " round" : "none");
  if (found) {
    const { SB, game, W, w, ax, az, bx, bz } = found;
    const swim = W.findPath(w, ax, az, bx, bz, true, 5000), sl = routeLen(swim, ax, az);
    check("a swimming route goes straight across it", !!swim && sl < found.pl * 0.5 && steepOn(SB, w, swim) === 0, sl.toFixed(0) + " paces");
    clearFood(SB, game, ax, az, 70);
    const me = put(SB, game, ax, az, { hunger: 0.97 });
    W.add(w, game, "apple", bx, bz, {});
    let ate = -1, waded = 0; const t0 = game.time;
    SB.bus.on("eat", d => { if (d && d.c === me && ate < 0) ate = game.time; });
    step(SB, game, 240, () => { if (me.wade > 0) waded += SB.TICK; me.chem.health = Math.max(me.chem.health, 0.5); me.chem.hunger = Math.max(me.chem.hunger, 0.97); return ate < 0 && me.alive; });
    check("starving, with the walk round long, it wades", waded > 1, waded.toFixed(0) + "s wading");
    check("and eats on the far side", ate >= 0, ate >= 0 ? "after " + Math.round(ate - t0) + "s" : "no meal in 240s, " + Math.hypot(me.x - bx, me.z - bz).toFixed(0) + " paces from the apple");
  }
});

console.log("5. the safety net");
seeded(4485, () => {
  const { SB, game, w, hm } = island(102), C = SB.Creature;
  check("the numbers: under two steps in the minute is nowhere; then three minutes of plain routes", C.WADE_MOVED === 2 && C.WADE_REST === 180);
  const a = put(SB, game, hm.x + 2, hm.z + 2, {}), b = put(SB, game, hm.x - 2, hm.z + 2, {});
  a.wade = 0.3; a.wadeAt = { x: a.x, z: a.z }; a.path = [{ x: a.x + 5, z: a.z }]; a.unreach = { 7: game.time + 30 };
  b.wade = 0.3; b.wadeAt = { x: b.x - 9, z: b.z }; // this one got somewhere
  step(SB, game, 1);
  check("a wade that ran out where it began is given up", !(a.wade > 0) && a.noWade > game.time + 170 && a.noWade <= game.time + 181 && a.wadeAt == null, a.noWade ? Math.round(a.noWade - game.time) + "s of plain routes" : "no rest set");
  check("and it starts again with a clean slate", Object.keys(a.unreach || {}).length === 0);
  check("a wade that got somewhere is not held against it", !(b.wade > 0) && !(b.noWade > game.time) && b.wadeAt == null);
  const cj = js("creature.js");
  check("neither way into wading opens while it rests", /pl ?> ?C\.WADE_DETOUR ?&& ?pl ?> ?d0 ?\* ?2 ?&& ?!\(c\.noWade ?> ?game\.time\)/.test(cj) && /un ?>= ?C\.WADE_AFTER ?&& ?!\(c\.noWade ?> ?game\.time\)/.test(cj));
  check("the long way round only turns to wading when wading is shorter", /wl ?< ?pl ?\* ?0?\.7/.test(cj));
});

console.log("6. a route that leads away first is still walked");
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
    step(SB, game, 200, () => { if (me.path) steps = Math.max(steps, me.pathI || 0); me.chem.health = Math.max(me.chem.health, 0.5); return ate < 0 && me.alive; });
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

console.log("7. a route it cannot follow is still dropped");
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
  step(SB, game, 40, s => { me.chem.hunger = 0.3; me.chem.sleepy = 0; me.chem.tired = 0; if (me.fr) me.fr.aw = 0; /* not homesick: see section 6 */ if (me.path === route && (me.pathI || 0) === 0) held += SB.TICK; else if (dropped < 0) { dropped = game.time - t0; wasLost = !!me.lost || wasLost; } if (me.lost) wasLost = true; nearest = Math.min(nearest, Math.hypot(me.x - bad.x, me.z - bad.z)); return dropped < 0; });
  check("it could not reach the step", nearest > 0.7, "nearest " + nearest.toFixed(1) + " paces");
  check("the route is dropped: 8 seconds after its last progress, not at once and not never", dropped >= 7.5 && dropped <= 25, dropped >= 0 ? "after " + dropped.toFixed(1) + "s" : "still on it after 40s");
  check("it is marked lost, so it scrambles back to proper ground", wasLost);
  check("it never held that one step for a minute", held < 60, held.toFixed(0) + "s on the step");
});

console.log("8. the two guards");
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
    const me = put(SB, game, hm.x - 1, hm.z + 1, { hunger: 0.5 });
    W.add(w, game, "apple", me.x + 2, me.z + 2, {});
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
    const me2 = put(SB, game, hm.x + 1, hm.z - 1, { hunger: 0.9 });
    C.sendTo(me2, goal.x, goal.z, game, 90, true);
    step(SB, game, 3, () => { me2.chem.hunger = 0.9; });
    check("a forced walk is not broken off", !!me2.action && me2.action.verb === SB.V.wander && !me2.action.sent && me2.action.called === true);
  }
});

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
