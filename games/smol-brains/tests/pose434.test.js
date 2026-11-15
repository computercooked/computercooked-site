// 4.34: poses. The voxel smol's rig gets a pose for what it is doing: asleep, hurt, swinging, eating, talking,
// cuddling, playing, reaching, fleeing, cheering, angry, puzzled, sick, plus small idle life. Pure numbers, no dice.
// node games/smol-brains/tests/pose434.test.js
"use strict";
require("./_src.js");
const fs = require("fs"), path = require("path"), vm = require("vm");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const src = fs.readFileSync(path.join(__dirname, "..", "play", "js", "voxel.js"), "utf8");
// pull VX.pose out of the file and run it on its own (the rest of voxel.js needs a GL context)
const i = src.indexOf("  var POSE0 = "), j = src.indexOf("  VX.creature = function");
check("the pose function is in voxel.js, ahead of the draw", i > 0 && j > i);
const ctx = { SB: { V: { hit: 1, eat: 2, talk: 3, cuddle: 4, play: 5, pickup: 6, use: 7, flee: 8 }, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) }, VX: {}, Math };
vm.createContext(ctx); vm.runInContext("var SB = this.SB, VX = this.VX;\n" + src.slice(i, j), ctx);
const pose = ctx.VX.pose, V = ctx.SB.V;
const smol = o => Object.assign({ id: 7, anim: { walk: 0 }, action: null }, o);
const span = (c, moving, key, idx) => { let lo = 1e9, hi = -1e9; for (let t = 0; t < 12; t += 0.03) { const p = pose(c, t, moving, 2); const v = idx == null ? p[key] : (p[key] ? p[key][idx] : 0); lo = Math.min(lo, v); hi = Math.max(hi, v); } return [lo, hi]; };
const finite = c => { for (let t = 0; t < 12; t += 0.07) for (const mv of [false, true]) for (const lg of [0, 2, 4]) { const p = pose(c, t, mv, lg); if (![p.sq, p.lean, p.hop, p.ear, p.wag].every(Number.isFinite)) return false; if (p.arms && !p.arms.every(Number.isFinite)) return false; } return true; };
check("asleep: ears flopped and slow breathing, nothing else", (() => { const p = pose(smol({ asleep: true }), 1, false, 2); return p.ear < -0.2 && !p.arms && span(smol({ asleep: true }), false, "sq")[1] < 0.05; })());
check("hurt: a flinch back", (() => { const p = pose(smol({ anim: { flash: 0.5 } }), 1, false, 2); return p.lean < -0.2 && p.sq > 0.1 && p.ear < 0; })());
check("a swing winds the arm up and whips it through", (() => { const s = span(smol({ action: { phase: "do", verb: V.hit } }), false, "arms", 1); return s[0] < 0 && s[1] > 1.8; })());
check("eating nods into the food with paws at the mouth", (() => { const c = smol({ action: { phase: "do", verb: V.eat } }); const l = span(c, false, "lean"); return l[0] >= 0.09 && l[1] > 0.2 && pose(c, 1, false, 2).arms[0] > 1.2; })());
check("chewing counts as eating even between actions", pose(smol({ anim: { mouth: "chew" } }), 1, false, 2).arms != null);
check("talking waves one paw", (() => { const s = span(smol({ action: { phase: "do", verb: V.talk } }), false, "arms", 0); return s[1] - s[0] > 0.8; })());
check("playing hops", span(smol({ action: { phase: "do", verb: V.play } }), false, "hop")[1] > 1);
check("fleeing leans in with ears back", (() => { const p = pose(smol({ action: { phase: "do", verb: V.flee } }), 1, true, 2); return p.lean > 0.2 && p.ear < -0.3; })());
check("a cheer hops with both paws up", (() => { const c = smol({ anim: { emote: "happy" } }); return span(c, false, "hop")[1] > 1.2 && pose(c, 1, false, 2).arms[0] > 2; })());
check("an idea jumps higher than a smile", span(smol({ anim: { emote: "idea" } }), false, "hop")[1] > span(smol({ anim: { emote: "happy" } }), false, "hop")[1]);
check("angry stamps, sick sags", pose(smol({ anim: { emote: "angry" } }), 1, false, 2).ear < 0 && pose(smol({ anim: { emote: "sick" } }), 1, false, 2).sq > 0.04);
check("an idle smol stretches now and then, and is mostly still", (() => { const s = span(smol({}), false, "sq"); let still = 0, n = 0; for (let t = 0; t < 30; t += 0.05) { n++; const p = pose(smol({}), t, false, 2); if (!p.arms && p.sq === 0 && p.lean === 0) still++; } return s[0] < -0.05 && still / n > 0.8; })());
check("walking shows the footfall", span(smol({ anim: { walk: 0 } }), true, "sq")[0] <= 0 && (() => { let hi = -1; for (let w = 0; w < 6; w += 0.1) hi = Math.max(hi, pose(smol({ anim: { walk: w } }), 1, true, 2).sq); return hi > 0.015; })());
check("a held or dead smol is left alone", (() => { const a = pose(smol({ heldBy: "hand", anim: { emote: "happy" } }), 1, false, 2), b = pose(smol({ corpse: true }), 1, false, 2); return a.hop === 0 && !a.arms && b.sq === 0; })());
check("every pose is finite for every body", [{}, { asleep: true }, { anim: { flash: 1 } }, { anim: { emote: "love" } }, { action: { phase: "do", verb: V.hit } }, { action: { phase: "do", verb: V.cuddle } }, { action: { phase: "do", verb: V.pickup } }, { convo: {} }, { anim: null }].every(o => finite(smol(o))));
check("the draw uses it and clamps the lean", /var lean = mo \? mo\.ln \* 0\.9 : 0, P = VX\.pose\(c, t, moving, legs\);/.test(src) && /SB\.clamp\(lean, -0\.6, 0\.6\)/.test(src));
check("no dice", !/game\.rng|Math\.random/.test(src.slice(i, j)));
console.log(failed ? "\n" + failed + " failed" : "\nall passed");
process.exit(failed ? 1 : 0);
