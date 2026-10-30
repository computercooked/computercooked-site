// vox.js without a GPU (K-0052, the voxel look): block tops sit on the cube grid and close to the sim's ground,
// smols in water stay at the surface, the terrain mesher makes far fewer quads than columns with walls only
// where columns differ, the voxelizer turns a shape into outside faces only, the giant's bones stay off the
// nest, and the extra meshes (the Lantern, the giant, the wreckage) only exist in the voxel look.
// node games/smol-brains/tests/vox.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
const JS = path.join(__dirname, "..", "play", "js");

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const ctx = load();
for (const f of ["meshes", "gl", "render", "vox"]) vm.runInContext(fs.readFileSync(path.join(JS, f + ".js"), "utf8"), ctx, { filename: f + ".js" });
const SB = ctx.SB, R = SB.Render, V = SB.Vox, WG = SB.WorldGen;
SB.GL.buffer = (c, data) => ({ data }); // no GPU: keep the data so the counts can be read back
SB.GL.texture = () => ({});
const fakeGl = { gl: { bindTexture() {}, texSubImage2D() {}, deleteTexture() {}, TEXTURE_2D: 0, RGBA: 0, UNSIGNED_BYTE: 0 } };

console.log("1. block tops");
const g = SB.Game.create(4242, 0, { gv: SB.WORLD_GV });
const T = g.world.T;
R.setWorld(g); // (classic path: no voxel look, so just the heightfield and AO)
V.setWorld(T, fakeGl);
let onGrid = 0, close = 0, n = 0, wetZero = 0, wet = 0, maxErr = 0;
for (let k = 0; k < 4000; k++) {
  const x = 20 + SB.hash(k, 1, 3) * (T.N - 40), z = 20 + SB.hash(k, 2, 3) * (T.N - 40);
  const gtop = V.groundAt(x, z), h = WG.heightAt(T, x, z), w = WG.waterAt(T, x, z);
  n++;
  if (Math.abs(gtop * 2 - Math.round(gtop * 2)) < 1e-9) onGrid++;
  if (w !== T.NONE && w > h + 0.1) { wet++; if (V.dy(x, z) === 0) wetZero++; continue; }
  const err = Math.abs(gtop - V.relief(Math.floor(x / V.CELL) * V.CELL + V.CELL / 2, Math.floor(z / V.CELL) * V.CELL + V.CELL / 2) - h);
  if (err < 0.9) close++;
  if (err > maxErr) maxErr = err;
}
check("every column top is on the half-unit cube grid", onGrid === n, onGrid + " of " + n);
check("block tops stay close to the sim's own ground (bones aside)", close / (n - wet) > 0.97, "max " + maxErr.toFixed(2));
check("smols in water stay at the surface (no block offset)", wet > 0 && wetZero === wet, wetZero + " of " + wet);

console.log("2. the terrain mesher");
const nc = T.N / SB.CHUNK;
let quads = 0, tops = 0, walls = 0, cols = 0, badN = 0;
for (let cj = 2; cj < 4; cj++) for (let ci = 2; ci < 4; ci++) {
  const L = V.terrainLOD({ ci, cj }, 1, fakeGl), d = L.buf.data;
  cols += (SB.CHUNK / V.CELL) ** 2;
  for (let i = 0; i < d.length; i += V.STRIDE * 6) {
    quads++;
    const ny = d[i + 4], nx = d[i + 3], nz = d[i + 5];
    if (ny === 1) tops++; else if (ny === 0 && Math.abs(nx) + Math.abs(nz) === 1) walls++; else badN++;
  }
}
check("tops are greedy-merged: far fewer top quads than columns", tops < cols * 0.5, tops + " tops for " + cols + " columns");
check("every face is a top or an axis-aligned wall", badN === 0 && walls > 0, walls + " walls");
check("a chunk is a few thousand quads at most", quads / 4 < 6000, Math.round(quads / 4) + " per chunk");

console.log("3. the voxelizer");
const tree = ctx.SB.Meshes.NODE_BUILDERS.oak(1), vt = V.voxelize(tree, V.voxOpts("n:oak"));
let axis = 0;
for (let i = 0; i < vt.data.length; i += 12) { const a = Math.abs(vt.data[i + 3]) + Math.abs(vt.data[i + 4]) + Math.abs(vt.data[i + 5]); if (Math.abs(a - 1) < 1e-6) axis++; }
check("an oak becomes blocks: every face axis-aligned", vt !== tree && axis === vt.count, vt.count / 3 + " triangles");
check("the blocks keep the tree's own colours (crown green, trunk brown)", (() => { let green = 0, brown = 0; for (let i = 0; i < vt.data.length; i += 12) { const r = vt.data[i + 6], gg = vt.data[i + 7], b = vt.data[i + 8]; if (gg > r && gg > b) green++; if (r > gg && gg > b) brown++; } return green > 0 && brown > 0; })());
check("people's parts and roads are left alone", V.voxOpts("p:body") === null && V.voxOpts("s:road") === null);
// a closed box voxelizes to a shell with no faces inside it
const cell = new Int32Array(6 * 6 * 6); for (let i = 0; i < cell.length; i++) cell[i] = 1;
const box = V.meshCells(cell, 6, 6, 6, 1, 0, 0, 0, [null, [1, 1, 1, 0, 0, 0]]);
check("a solid cube meshes to its 6 outside faces (greedy, nothing inside)", box.count === 36, box.count / 6 + " quads");

console.log("4. the giant");
const sp = V.spine();
check("the giant's spine runs through the island", !!sp && sp.half > 10, sp && sp.half.toFixed(0));
let nearNest = 0;
for (let k = 0; k < 400; k++) { const a = k / 400 * 6.283, r = (k % 10) * 0.9; nearNest = Math.max(nearNest, V.relief(T.spawn.x + Math.cos(a) * r, T.spawn.z + Math.sin(a) * r)); }
check("the bones never lift the nest's hill", nearNest === 0);

console.log("5. only in the voxel look");
check("no Lantern, giant or wreckage meshes in the other looks", !ctx.SB.Meshes.extraMeshes()["v:lantern"]);
R.voxel = true;
const ex = ctx.SB.Meshes.extraMeshes();
check("the voxel look has the Lantern, the giant and four kinds of wreckage", ex["v:lantern"] && ex["v:giant"] && ex["v:deb0"] && ex["v:deb3"]);
let glow = 0; for (let i = 0; i < ex["v:lantern"].data.length; i += 12) if (ex["v:lantern"].data[i + 11] > 0.9) glow++;
check("the Lantern has a glowing amber heart", glow > 0);
const debris = V.debris(100, 100, 7, 1);
check("a pod's wreckage lies round it, the same every time", debris.length === 11 && JSON.stringify(debris) === JSON.stringify(V.debris(100, 100, 7, 1)) && debris.every((d) => Math.hypot(d.x - 100, d.z - 100) < 3));
const html = fs.readFileSync(path.join(__dirname, "..", "play", "index.html"), "utf8");
check("vox.js loads after render.js and before voxel.js", html.indexOf("js/render.js") < html.indexOf("js/vox.js") && html.indexOf("js/vox.js") < html.indexOf("js/voxel.js"));

console.log(failed ? "\n" + failed + " FAILED" : "\nall vox checks passed");
process.exit(failed ? 1 : 0);
