// Island sizes and biomes (v3.7): every size generates (and how long it takes), every biome turns up
// somewhere, biomes are bigger places than on the old islands, the first egg lands on dry walkable ground,
// and old 256 and 384 islands still come back exactly as they were.
// node games/smol-brains/tests/biomes.test.js
"use strict";
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
function cpuMs(fn) { const c0 = process.cpuUsage(), t0 = Date.now(); const v = fn(); const c = process.cpuUsage(c0); return { v, cpu: (c.user + c.system) / 1000 | 0, wall: Date.now() - t0 }; }
function gen(SB, seed, n, wopts) { SB.setWorldN(n); SB.WORLD_OPTS = SB.worldFx(wopts); return SB.WorldGen.generate(seed); }
function hashT(T) {
  let h = 0; const mix = v => { h = (Math.imul(h ^ (Math.round(v * 1e4) | 0), 16777619) + 0x9e3779b9) | 0; };
  for (let i = 0; i < T.h.length; i += 3) mix(T.h[i]);
  for (let i = 0; i < T.biome.length; i += 3) mix(T.biome[i] + T.temp[i]);
  T.nodes.forEach(nd => { mix(nd.x); mix(nd.z); mix(nd.kind.length); });
  return h >>> 0;
}
// area-weighted mean size of connected same-biome land regions (tiles): "how big is the place you stand in"
function regionSize(SB, T) {
  const N = T.N, seen = new Uint8Array(N * N), st = new Int32Array(N * N); let sumSq = 0, sum = 0;
  for (let s = 0; s < N * N; s++) {
    if (seen[s] || T.biome[s] === SB.B.ocean || T.biome[s] === SB.B.reef) continue;
    const b = T.biome[s]; let sp = 0, n = 0; st[sp++] = s; seen[s] = 1;
    while (sp) {
      const t = st[--sp], i = t % N, j = (t / N) | 0; n++;
      if (i > 0 && !seen[t - 1] && T.biome[t - 1] === b) { seen[t - 1] = 1; st[sp++] = t - 1; }
      if (i < N - 1 && !seen[t + 1] && T.biome[t + 1] === b) { seen[t + 1] = 1; st[sp++] = t + 1; }
      if (j > 0 && !seen[t - N] && T.biome[t - N] === b) { seen[t - N] = 1; st[sp++] = t - N; }
      if (j < N - 1 && !seen[t + N] && T.biome[t + N] === b) { seen[t + N] = 1; st[sp++] = t + N; }
    }
    sumSq += n * n; sum += n;
  }
  return sum ? sumSq / sum : 0;
}
function spawnOk(SB, T) {
  const t = (T.spawn.z | 0) * T.N + (T.spawn.x | 0);
  return SB.WorldGen.walkable(T, T.spawn.x, T.spawn.z) && SB.WorldGen.depthAt(T, T.spawn.x, T.spawn.z) === 0 && T.biome[t] !== SB.B.ocean && T.biome[t] !== SB.B.reef;
}

console.log("1. every island size generates");
{
  const SB = load().SB;
  check("sizes are small 384, medium 544, large 768, extra large 1024", JSON.stringify(SB.WORLD_CHOICES.size) === JSON.stringify({ small: 384, normal: 544, large: 768, huge: 1024 }));
  check("new islands default to medium 544 on generator 2", SB.WORLD_N_NEW === 544 && SB.WORLD_GV === 2);
  [384, 544, 768, 1024].forEach(n => {
    const r = cpuMs(() => gen(SB, 4242 + n, n, { gv: 2 }));
    const T = r.v;
    check(n + " generates with a good spawn", T.N === n && T.gv === 2 && T.nodes.length > n * n / 160 && spawnOk(SB, T), "cpu " + r.cpu + " ms, wall " + r.wall + " ms, " + T.nodes.length + " nodes, " + T.arch);
  });
}

console.log("2. every biome turns up somewhere, every archetype makes a good island");
{
  const SB = load().SB, seen = {}, WG = SB.WorldGen;
  let s = 0;
  WG.ARCHS.forEach(arch => {
    [null, "tropical", "frozen", "dry"].forEach(climate => {
      const T = gen(SB, 900 + (s++) * 37, 384, { gv: 2, arch: arch, climate: climate || undefined });
      for (let i = 0; i < T.biome.length; i++) seen[T.biome[i]] = (seen[T.biome[i]] || 0) + 1;
      if (!spawnOk(SB, T)) check(arch + "/" + (climate || "mild") + " spawn walkable and dry", false, JSON.stringify(T.spawn));
    });
    check(arch + " islands spawn on dry walkable land", true);
  });
  const missing = SB.BIOMES.filter((b, i) => !seen[i]).map(b => b.id);
  check("all " + SB.BIOMES.length + " biomes appear", !missing.length, missing.length ? "missing " + missing.join(", ") : SB.BIOMES.map((b, i) => b.id + " " + (seen[i] * 1000 / (s * 384 * 384)).toFixed(1) + "‰").join(", "));
  check("at least 20 biomes", SB.BIOMES.length >= 20);
  // ids are appended: the old twelve keep their numbers
  check("old biome ids unchanged", ["ocean", "beach", "meadow", "forest", "jungle", "savanna", "desert", "swamp", "taiga", "tundra", "mountain", "shroom", "crystal"].every((id, i) => SB.BIOMES[i].id === id));
  // every new biome has resources, a look and a name
  const nb = ["blossom", "maple", "ash", "mangrove", "bamboo", "mesa", "flowers", "reef"];
  check("new biomes have names, colours and temperatures", nb.every(id => { const b = SB.BIOMES[SB.B[id]]; return b && b.name && b.c.length === 2 && b.temp > 0; }));
  check("new node kinds exist", ["sakura", "maple", "bamboo", "mangrove", "basalt", "vent", "redrock"].every(k => SB.NODES[k] && SB.KINDS[SB.NODES[k].drops]));
  check("cherries are food", SB.KINDS.cherry && SB.KINDS.cherry.noun === "food");
}

console.log("3. biomes are bigger places than on the old islands");
{
  const SB = load().SB;
  let a = 0, b = 0;
  [11, 12, 13].forEach(seed => { a += regionSize(SB, gen(SB, seed, 384, null)); b += regionSize(SB, gen(SB, seed, 384, { gv: 2 })); });
  check("generator 2 regions are at least 1.5x bigger at the same size", b > a * 1.5, "old " + (a / 3 | 0) + " tiles, new " + (b / 3 | 0) + " tiles");
  let big = 0; [11, 12, 13].forEach(seed => { big += regionSize(SB, gen(SB, seed, 544, { gv: 2 })) / 3; });
  check("medium islands have big biomes too", big > a / 3 * 1.5, (big | 0) + " tiles");
}

console.log("4. old islands come back exactly as they were");
{
  const SB = load().SB;
  [[31, 256], [32, 384]].forEach(([seed, n]) => {
    const g = SB.Game.create(seed, n, null);
    const h0 = hashT(g.world.T);
    check(n + " island is generator 1", g.world.T.gv === 1 && g.world.T.N === n);
    const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(g)));
    const SB2 = load().SB;
    const g2 = SB2.Save.revive(snap);
    check(n + " save reloads to the same island", g2 && g2.world.T.N === n && hashT(g2.world.T) === h0);
  });
  // a v3.6 "create world" island (options but no generator) stays generator 1 as well
  const g3 = SB.Game.create(33, 384, { size: "normal", climate: "dry" });
  check("v3.6 created worlds stay generator 1", g3.world.T.gv === 1);
  const g4 = SB.Game.create(34, 544, { gv: 2, arch: "volcano" });
  const snap4 = JSON.parse(JSON.stringify(SB.Save.snapshot(g4)));
  const g5 = load().SB.Save.revive(snap4);
  check("a new volcano island reloads as itself", g5.world.T.gv === 2 && g5.world.T.arch === "volcano" && hashT(g5.world.T) === hashT(g4.world.T));
  check("volcano islands have ash fields", Array.prototype.some.call(g4.world.T.biome, b => b === SB.B.ash));
}

console.log("5. render data: lazy decor per chunk, a mesh for every new node and decor type");
{
  const SB = load().SB;
  const T = gen(SB, 77, 544, { gv: 2 });
  check("no island-wide decor array", T.decor == null);
  const d1 = SB.WorldGen.decorChunk(T, 8, 8), d2 = SB.WorldGen.decorChunk(T, 8, 8);
  check("decor per chunk, cached", d1 === d2 && d1.length % 5 === 0);
  let inside = true; for (let i = 0; i < d1.length; i += 5) if (d1[i] < 256 || d1[i] >= 288 || d1[i + 1] < 256 || d1[i + 1] >= 288) inside = false;
  check("chunk decor stays in its chunk", inside);
  const ctx = load(["core", "meshes"]);
  const ME = ctx.SB.Meshes || ctx.SB.ME || ctx.ME;
  if (ME && ME.NODE_BUILDERS) {
    const kinds = new Set(); T.nodes.forEach(n => kinds.add(n.kind));
    const noMesh = [...kinds].filter(k => !ME.NODE_BUILDERS[k]);
    check("every node on the island has a mesh", !noMesh.length, noMesh.join(", "));
    check("decor types 0..11 have meshes", ME.DECOR_BUILDERS.length >= 12);
    check("new meshes build", ["sakura", "maple", "bamboo", "mangrove", "basalt", "vent", "redrock"].every(k => ME.NODE_BUILDERS[k](1).count > 0));
  } else check("meshes load in node", false);
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall biome tests passed");
process.exit(failed ? 1 : 0);
