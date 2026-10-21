/* smol brains 2 — island generation and world simulation tests. Run: node games/smol-brains/tests/world.test.js */
"use strict";
const load = require("./_load.js");
const ctx = load();
const SB = ctx.SB;
SB.Render = undefined;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}
function hashArr(a) { let h = 2166136261; for (let i = 0; i < a.length; i += 7) { h ^= Math.round(a[i] * 1000); h = Math.imul(h, 16777619); } return h >>> 0; }

console.log("1. world generation");
const WG = SB.WorldGen;
const seeds = [1, 42, 777, 12345, 31337];
let t0 = Date.now();
const A = WG.generate(42), A2 = WG.generate(42), Bw = WG.generate(43);
const genMs = (Date.now() - t0) / 3;
check("same seed, same island", hashArr(A.h) === hashArr(A2.h) && A.nodes.length === A2.nodes.length && A.spawn.x === A2.spawn.x);
check("different seed, different island", hashArr(A.h) !== hashArr(Bw.h));
check("generation is reasonably fast", genMs < 2500, Math.round(genMs) + " ms each");
for (const s of seeds) {
  const T = WG.generate(s);
  const N = T.N, V = T.V;
  let land = 0, water = 0, river = 0, lake = 0;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const d = WG.depthAt(T, i + 0.5, j + 0.5);
    if (d > 0.05) water++; else land++;
  }
  for (let k = 0; k < V * V; k++) { if (T.river[k]) river++; if (T.W[k] !== T.NONE && T.W[k] > SB.SEA + 0.05 && T.W[k] > T.h[k] && !T.river[k]) lake++; }
  const landFrac = land / (N * N);
  const edgeWet = [[2, 2], [N - 2, 2], [2, N - 2], [N - 2, N - 2], [N / 2, 1]].every(p => WG.depthAt(T, p[0], p[1]) > 0.3);
  const biomes = new Set(Array.from(T.biome)).size;
  const sp = T.spawn;
  const nearOaks = T.nodes.filter(n => n.kind === "oak" && SB.dist(n.x, n.z, sp.x, sp.z) < 12).length;
  const counts = {}; T.nodes.forEach(n => counts[n.kind] = (counts[n.kind] || 0) + 1);
  check(`seed ${s}: an island (land ${Math.round(landFrac * 100)}%, sea at the edges)`, landFrac > 0.3 && landFrac < 0.75 && edgeWet);
  check(`seed ${s}: rivers and variety`, river > 200 && biomes >= 8, `${river} river vertices, ${lake} lake vertices, ${biomes} biomes`);
  check(`seed ${s}: a walkable nest with food nearby`, WG.walkable(T, sp.x, sp.z) && WG.depthAt(T, sp.x, sp.z) === 0 && nearOaks >= 2 && T.nest, `${nearOaks} apple trees near`);
  check(`seed ${s}: resources and grump caves`, counts.boulder > 10 && counts.reeds > 10 && counts.flintrock > 3 && counts.orevein > 2 && T.caves.length >= 1, JSON.stringify({ trees: (counts.oak || 0) + (counts.pine || 0) + (counts.birch || 0), crystals: counts.crystals || 0, caves: T.caves.length }));
  // heightAt follows the rendered triangles exactly at vertices
  let maxErr = 0;
  for (let k = 0; k < 200; k++) { const i = 1 + ((k * 37) % (N - 2)), j = 1 + ((k * 91) % (N - 2)); maxErr = Math.max(maxErr, Math.abs(WG.heightAt(T, i, j) - T.h[j * V + i])); }
  if (s === 42) check("height sampling matches the mesh", maxErr < 1e-4, "max err " + maxErr);
}

console.log("2. world codes");
{
  let ok = true;
  for (const s of [1, 255, 4096, 123456, 25599999]) { const c = SB.worldCode(s); if (SB.parseWorldCode(c) !== s) { ok = false; console.log("   ", s, c, SB.parseWorldCode(c)); } }
  check("world codes round trip", ok, SB.worldCode(123456));
  check("any word is a world", SB.parseWorldCode("bananas") > 0 && SB.parseWorldCode("bananas") === SB.parseWorldCode("Bananas "));
}

console.log("3. the living world");
{
  const game = SB.Game.newGame(42);
  game.tutorial.done = true;
  const w = game.world;
  const sp = w.T.spawn;
  const c = SB.Game.spawnSmol(game, { x: sp.x + 1, z: sp.z + 1, age: 400 });
  let drops = 0;
  SB.bus.on("drop", () => drops++);
  for (let s = 0; s < 20 * 240; s++) SB.Game.step(game, SB.TICK);
  check("trees drop fruit and sticks near smols", drops > 10, drops + " drops in 4 min, " + w.items.length + " items");
  const far = w.items.filter(o => SB.dist(o.x, o.z, sp.x, sp.z) > 70 && !SB.KINDS[o.kind].critter).length;
  check("far-away places don't fill up with stuff", far < 5, far + " items far away");
  // rot
  const apple = SB.World.add(w, game, "apple", sp.x + 3, sp.z, {});
  apple.age = SB.KINDS.apple.rots + 1;
  SB.Game.step(game, SB.TICK);
  check("old food rots (and reads as bad to eat)", apple.data.rotten && apple.noun === "mushroom");
  // seasons and time
  const clock = SB.World.clock(w);
  check("clock and seasons", clock.day >= 1 && SB.SEASONS.indexOf(clock.season) >= 0, "day " + clock.day + " " + clock.season);
  // weather + lightning + wildfire
  const tree = w.nodes.find(n => n.kind === "oak" && SB.dist(n.x, n.z, sp.x, sp.z) < 12);
  SB.World.lightning(w, game, tree.x, tree.z, true);
  check("lightning sets a tree on fire", tree.state === "burning" || w.nodes.some(n => n.state === "burning"));
  // lightning picks the tallest tree nearby, which may not be ours: watch whichever one caught
  const lit = tree.state === "burning" ? tree : w.nodes.find(n => n.state === "burning");
  let burnt = false;
  for (let s = 0; s < 20 * 80; s++) { SB.Game.step(game, SB.TICK); if (lit.state === "burnt") { burnt = true; break; } }
  check("the fire burns out and leaves a burnt tree", burnt, "state " + lit.state);
  check("fire is warm", SB.World.fireWarmth(w, tree.x, tree.z) >= 0);
  // eggs hatch near warmth
  const egg = SB.World.add(w, game, "egg", sp.x, sp.z, { genome: SB.Genome.random(game.rng, {}), gen: 1, progress: 0.9, parents: [] });
  let hatched = false;
  SB.bus.on("hatch", d => { if (d.obj === egg) hatched = true; });
  for (let s = 0; s < 20 * 60 && !hatched; s++) SB.Game.step(game, SB.TICK);
  check("eggs hatch", hatched);
  // structures
  const hut = SB.World.addStructure(w, game, "hut", sp.x + 4, sp.z + 4, { done: true });
  check("a hut is a shelter", SB.World.shelterAt(w, hut.x, hut.z) === hut);
  const farm = SB.World.addStructure(w, game, "farm", sp.x - 5, sp.z + 4, { done: true });
  farm.data.grow = 0.99;
  const before = w.items.length; let harvested = null;
  SB.bus.on("harvest", d => { if (d.st === farm && !harvested) harvested = w.items.slice(before).filter(o => o.kind === d.crop || o.kind === "grain").length; });
  for (let s = 0; s < 20 * 20 && harvested == null; s++) SB.Game.step(game, SB.TICK);
  check("farms ripen into a harvest of several crops", harvested >= 3, harvested + " crops");
  // walkability: deep water blocks walkers but not swimmers
  let deep = null;
  for (let k = 0; k < 4000 && !deep; k++) { const x = 20 + (k * 13) % 216, z = 20 + (k * 29) % 216; if (SB.World.depthAt(w, x, z) > 1.2) deep = { x, z }; }
  check("deep water blocks walkers, not swimmers", deep && !SB.World.walkable(w, deep.x, deep.z, false) && SB.World.walkable(w, deep.x, deep.z, true));
  // water: a smol that can't swim, dropped far out, flails and drowns; one dropped by the shore climbs out
  const shoreDist = (x, z) => { for (let r = 0.5; r < 30; r += 0.5) for (let a = 0; a < 6.28; a += 0.3) { const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (SB.World.walkable(w, px, pz) && SB.World.depthAt(w, px, pz) < 0.3) return r; } return 99; };
  let lakeNear = null, lakeFar = null;
  for (let k = 0; k < 20000 && (!lakeNear || !lakeFar); k++) { const x = 10 + (k * 37) % 236, z = 10 + (k * 61) % 236; if (SB.World.depthAt(w, x, z) < 1) continue; const d = shoreDist(x, z); if (!lakeNear && d > 1.5 && d < 2.5) lakeNear = { x, z }; if (!lakeFar && d > 9 && d < 14) lakeFar = { x, z }; }
  const swimTest = (p) => { const c = SB.Game.spawnSmol(game, { x: p.x, z: p.z, age: 600 }); c.genome.genes.fins = 0; c.look = SB.Genome.look(c.genome); c.onGround = true; for (let s = 0; s < 60 / SB.TICK && c.alive; s++) SB.Game.step(game, SB.TICK); return c; };
  if (lakeNear && lakeFar) {
    const cn = swimTest(lakeNear), cf = swimTest(lakeFar);
    check("a smol dropped by the shore climbs out", cn.alive && SB.World.depthAt(w, cn.x, cn.z) <= 0.5);
    check("a smol dropped far out in deep water drowns (no floating out)", !cf.alive);
  }
  check("no NaNs in creatures", game.creatures.every(o => isFinite(o.x) && isFinite(o.y) && isFinite(o.z)));
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
