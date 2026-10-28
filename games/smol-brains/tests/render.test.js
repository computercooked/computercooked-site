// render.js without a GPU: the day's light changes smoothly (no snaps for 8x to turn into flicker), and a tap
// on a volcano peak lands on the peak (the ground pick used to start its ray march at y=32, below volcano tops).
// node games/smol-brains/tests/render.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
const JS = path.join(__dirname, "..", "play", "js");

let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const ctx = load();
for (const f of ["meshes", "gl", "render"]) vm.runInContext(fs.readFileSync(path.join(JS, f + ".js"), "utf8"), ctx, { filename: f + ".js" });
const SB = ctx.SB, R = SB.Render;
SB.GL.buffer = () => ({}); // no GPU: setWorld only needs somewhere to put the ocean ring

console.log("1. the day's light has no jumps");
const STEPS = 24000;
let maxDir = 0, maxCol = 0, maxNight = 0, prev = null, nightDown = 0, nightUp = 0;
for (let i = 0; i <= STEPS; i++) {
  const e = R.envTarget(i / STEPS);
  if (prev) {
    maxDir = Math.max(maxDir, Math.hypot(e.sunDir[0] - prev.sunDir[0], e.sunDir[1] - prev.sunDir[1], e.sunDir[2] - prev.sunDir[2]));
    for (const k of ["sun", "sky", "gnd", "fog"]) for (let j = 0; j < 3; j++) maxCol = Math.max(maxCol, Math.abs(e[k][j] - prev[k][j]));
    const dn = e.night - prev.night;
    maxNight = Math.max(maxNight, Math.abs(dn));
    const t = i / STEPS;
    if (t > 0.6 && t < 0.9 && dn < -1e-9) nightDown++; // dusk: only ever darker
    if (t > 0.1 && t < 0.4 && dn > 1e-9) nightUp++; // dawn: only ever lighter
  }
  prev = { sunDir: e.sunDir, sun: e.sun, sky: e.sky, gnd: e.gnd, fog: e.fog, night: e.night };
}
// 1/24000 of a day is 0.05 sim seconds: one tick
check("sun direction moves smoothly through the whole day (no snap at dusk or dawn)", maxDir < 0.01, "max step " + maxDir.toFixed(4));
check("sun, sky, ground and fog colours change smoothly", maxCol < 0.01, "max step " + maxCol.toFixed(4));
check("night fades in and out smoothly", maxNight < 0.01, "max step " + maxNight.toFixed(4));
check("dusk only gets darker and dawn only lighter", nightDown === 0 && nightUp === 0, nightDown + " / " + nightUp);
check("midnight is night, noon is day", R.envTarget(0).night === 1 && R.envTarget(0.5).night === 0);

console.log("2. taps on a volcano peak land on the peak");
const g = SB.Game.create(1001, 0, { gv: SB.WORLD_GV, arch: "volcano" });
const T = g.world.T;
let top = -1e9, tk = 0;
for (let k = 0; k < T.h.length; k++) if (T.h[k] > top) { top = T.h[k]; tk = k; }
check("this volcano is taller than the old pick ceiling (32)", top > 40, top.toFixed(1));
R.setWorld(g);
const cam = R.camera, px = tk % T.V, pz = Math.floor(tk / T.V);
// the truth: march the same ray in tiny steps from above the summit. A tap only counts when the true hit is
// higher than the old ceiling (32), where the old pick always landed somewhere behind the peak.
function trueHit(sx, sy) {
  const c = cam, nx = sx * 2 - 1, ny = 1 - sy * 2, f = c.fwd;
  const o = [0, 1, 2].map((i) => c.eye[i] + c.right[i] * nx * c.halfW + c.up[i] * ny * c.halfH);
  for (let t = (o[1] - top - 1) / -f[1]; t < (o[1] + 20) / -f[1]; t += 0.01) {
    const x = o[0] + f[0] * t, y = o[1] + f[1] * t, z = o[2] + f[2] * t;
    if (y <= SB.World.groundY(g.world, x, z)) return { x, y, z };
  }
  return null;
}
let tall = 0, right = 0;
for (const view of [{ zoom: 30, yaw: 0.5 }, { zoom: 12, yaw: 2.2 }, { zoom: 60, yaw: 4 }, { zoom: 6, yaw: 1.1, tilt: -0.3 }]) {
  cam.x = px; cam.z = pz; cam.zoom = cam.tZoom = view.zoom; cam.yaw = cam.tYaw = view.yaw; cam.tilt = view.tilt || 0; cam.follow = null; cam.vx = cam.vz = 0;
  cam.y = top;
  R.updateCamera(0);
  const s0 = R.project(px, top, pz, {}); // (no canvas here: the "screen" is 1×1)
  for (let i = -5; i <= 5; i++) for (let j = -5; j <= 5; j++) {
    const sx = s0.x + i * 0.02, sy = s0.y + j * 0.02, want = trueHit(sx, sy);
    if (!want || want.y < 32) continue;
    tall++;
    const hit = R.pickGround(sx, sy);
    if (hit && Math.hypot(hit.x - want.x, hit.z - want.z) < 0.3) right++;
  }
}
// (the few misses are rays grazing the knife-edge crater rim, where a pixel either way changes the answer)
check("taps on the volcano's upper slopes land where they point", tall > 200 && right / tall > 0.95, right + " of " + tall);
// the low ground still works the same
cam.x = T.spawn.x; cam.z = T.spawn.z; cam.zoom = cam.tZoom = 20; cam.yaw = cam.tYaw = 0.5; cam.tilt = 0; cam.y = Math.max(SB.SEA, SB.World.heightAt(g.world, cam.x, cam.z));
R.updateCamera(0);
const sp = R.project(T.spawn.x, SB.World.groundY(g.world, T.spawn.x, T.spawn.z), T.spawn.z, {}), hs = R.pickGround(sp.x, sp.y);
check("a tap at the spawn lands at the spawn", hs && Math.hypot(hs.x - T.spawn.x, hs.z - T.spawn.z) < 0.3);
let t0 = process.hrtime.bigint();
for (let i = 0; i < 2000; i++) R.pickGround((i % 40) / 40, Math.floor(i / 40) / 50);
const us = Number(process.hrtime.bigint() - t0) / 2000 / 1000;
check("a pick stays cheap", us < 200, us.toFixed(1) + " µs each");

console.log(failed ? "\n" + failed + " FAILED" : "\nall ok");
process.exit(failed ? 1 : 0);
