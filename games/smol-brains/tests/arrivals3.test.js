// Round 3, arrivals: how an island starts and who turns up. Landing sites, flat and one-islet islands, the hidden
// vale, the island editor, maple-wood shrubs and winter icebergs; guests, passers-by, a grump in a smol suit, arrivals
// on conditions, smols from codes at the sky gate, two islands merged; founders' kin, Pip's look, a starting
// critter, the beacon lamps of new game+; title secrets and language packs.
// node games/smol-brains/tests/arrivals3.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
const dir = path.join(__dirname, "..", "play", "js"), js = f => fs.readFileSync(path.join(dir, f), "utf8");
const ctx = load();
["meshes", "ext", "arrivals3", "title"].forEach(n => vm.runInContext(js(n + ".js"), ctx, { filename: n + ".js" }));
const SB = ctx.SB, ST = SB.Strangers, AR = SB.Arr, TI = SB.Title, WG = SB.WorldGen, B = SB.B;
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
function mk(seed, w, n) { const g = SB.Game.newGame(seed, n || 256, w || { gv: 2 }); SB.Game.current = g; g.tutorial.done = true; return g; }
function founders(g) { const pod = g.world.items.find(o => o.kind === "egg" && o.data.pod); const a = SB.Game.hatch(g, pod), b = pod.data.twin; [a, b].forEach(c => { c.age = SB.STAGES[3].from + 10; c.stage = 3; }); return [a, b]; }
function land(T) { let n = 0; for (let i = 0; i < T.biome.length; i++) if (T.biome[i] !== B.ocean && T.biome[i] !== B.reef) n++; return n / T.biome.length; }
function maxH(T) { let m = -1e9; for (let i = 0; i < T.h.length; i++) if (T.h[i] > m) m = T.h[i]; return m; }
function notes(g) { return (g.log || []).map(l => l.text || l.t || String(l)).join(" | "); }

console.log("1. an island with none of the new choices");
const base = mk(21);
const T0 = base.world.T;
check("no vale, no stamps, and the nest where it always was", !T0.vale && T0._rw.site === null && T0._rw.pod === null && T0.nest === T0.nodes.find(n => n.kind === "nest"));
check("the same seed makes the same island twice", (() => { const g2 = mk(21); const ok = g2.world.T.nest.x === T0.nest.x && g2.world.T.nodes.length === T0.nodes.length; SB.Game.current = base; return ok; })());
check("every new node has an id in a range of its own, and no two nodes share one", T0.nodes.every(n => (n.id >= WG.ARR_ID0 && n.id < WG.ARR_ID0 + 5000) === (["redshrub", "shelfcap", "iceberg", "glowstone"].indexOf(n.kind) >= 0)) && new Set(T0.nodes.map(n => n.id)).size === T0.nodes.length, T0.nodes.filter(n => n.id >= WG.ARR_ID0).length + " new");

console.log("2. the maple woods: red shrubs and shelf mushrooms");
const shrubs = T0.nodes.filter(n => n.kind === "redshrub"), caps = T0.nodes.filter(n => n.kind === "shelfcap");
check("this island's maple woods have both", shrubs.length > 0 && caps.length > 0, shrubs.length + " shrubs, " + caps.length + " shelf mushrooms");
check("and only the maple woods", shrubs.concat(caps).every(n => WG.biomeAt(T0, n.x, n.z) === B.maple));
check("a red shrub is a plant that drops berries, a shelf mushroom drops shrooms", SB.NODES.redshrub.noun === "plant" && SB.NODES.redshrub.drops === "berry" && SB.NODES.shelfcap.noun === "mushroom" && !!SB.KINDS[SB.NODES.shelfcap.drops]);
check("they are ready to tick like any bush", shrubs[0].state === "ok" && shrubs[0].dropT > 0 && shrubs[0].noun === "plant");
{
  const sh = shrubs[0], n0 = base.world.items.length;
  base.creatures.push; const f0 = founders(base); f0[0].x = sh.x + 1; f0[0].z = sh.z + 1; sh.dropT = 0.01;
  for (let t = 0; t < 30; t += SB.TICK) SB.Game.step(base, SB.TICK);
  check("left alone near a smol, a red shrub drops a berry", base.world.items.some(o => o.kind === "berry" && SB.dist(o.x, o.z, sh.x, sh.z) < 3) || base.world.items.length > n0, base.world.items.length - n0 + " new items");
}

console.log("3. icebergs in the winter sea");
check("the island has sea ice, hidden for now", T0.ice.length > 0 && T0.ice.every(n => n.state === "gone" && n.kind === "iceberg"), T0.ice.length + " bergs");
check("each floats where the sea is two deep", T0.ice.every(n => Math.abs(WG.heightAt(T0, n.x, n.z) + 2) <= 0.21 && WG.biomeAt(T0, n.x, n.z) === B.ocean));
check("nobody's eyes go to an iceberg (the AI skips it)", SB.NODES.iceberg.nop === 1 && T0.ice[0].nop === 1);
base.world.season = 3; AR.slow(base);
check("winter: the ice is there", T0.ice.every(n => n.state === "ok"));
base.world.season = 0; AR.slow(base);
check("spring: gone again", T0.ice.every(n => n.state === "gone"));

console.log("4. a flat island, and a one-islet island");
const flat = mk(21, { gv: 2, peaks: "none" }), hill0 = maxH(T0), hillF = maxH(flat.world.T);
check("mountains: none makes a level plain", hillF < 1.3 && hill0 > 4, "highest point " + hillF.toFixed(2) + " against " + hill0.toFixed(1));
check("still an island you can land on", !!flat.world.T.nest && WG.walkable(flat.world.T, flat.world.T.nest.x, flat.world.T.nest.z) && land(flat.world.T) > 0.15);
const isl = mk(21, { gv: 2, arch: "islet", size: "tiny" }, SB.WORLD_CHOICES.size.tiny);
check("tiny is a 256 island", SB.WORLD_CHOICES.size.tiny === 256 && isl.world.T.N === 256);
check("one islet: a little land in a wide sea", land(isl.world.T) < 0.2 && land(isl.world.T) > 0.01 && land(isl.world.T) < land(T0), Math.round(land(isl.world.T) * 100) + "% land against " + Math.round(land(T0) * 100) + "%");
check("the islet shape is never a surprise pick", WG.ARCHS.indexOf("islet") < 0 && isl.world.T.arch === "islet");
{
  const f = founders(isl); let threw = null;
  try { for (let t = 0; t < 60; t += SB.TICK) SB.Game.step(isl, SB.TICK); } catch (e) { threw = e; }
  check("the founders live a minute on the islet without a hitch", !threw && f[0].alive && f[1].alive, threw && threw.message);
}

console.log("5. choosing where the pod lands");
const big = 256;
const def = mk(33, { gv: 2 }, big).world.T;
["woods", "shore", "dunes", "snow", "jungle"].forEach(site => {
  const T = mk(33, { gv: 2, site: site }, big).world.T, bm = WG.biomeAt(T, T.nest.x, T.nest.z), has = (() => { for (let i = 0; i < T.biome.length; i++) if (WG.SITES[site][T.biome[i]]) return true; return false; })();
  check("landing site " + site + ": the nest is there" + (has ? "" : " (no such place on this island: it lands mid-island)"), has ? !!WG.SITES[site][bm] : !!T.nest, SB.BIOMES[bm].id);
});
{
  const T = mk(33, { gv: 2, site: "far" }, big).world.T, mid = big / 2;
  const cd = t => Math.min.apply(null, t.caves.map(c => SB.dist(c.x, c.z, t.nest.x, t.nest.z)));
  check("the far shore: further out than the usual nest", SB.dist(T.nest.x, T.nest.z, mid, mid) > SB.dist(def.nest.x, def.nest.z, mid, mid) + 20, Math.round(SB.dist(T.nest.x, T.nest.z, mid, mid)) + " from the middle against " + Math.round(SB.dist(def.nest.x, def.nest.z, mid, mid)));
  check("and among the lairs", cd(T) < 45 && cd(T) >= 14, "nearest cave " + Math.round(cd(T)));
  check("with the starter kit still round it", T.nodes.filter(n => n.kind === "oak" && SB.dist(n.x, n.z, T.nest.x, T.nest.z) < 12).length >= 3);
}
{
  const T = mk(33, { gv: 2, pod: [0.3, 0.62] }, big).world.T;
  check("a spot tapped on the map: the pod lands on the nearest dry ground to it", SB.dist(T.nest.x, T.nest.z, 0.3 * big, 0.62 * big) < 40 && WG.depthAt(T, T.nest.x, T.nest.z) === 0, Math.round(SB.dist(T.nest.x, T.nest.z, 0.3 * big, 0.62 * big)) + " away");
}

console.log("6. the hidden vale and its glow-stones");
const vg = mk(33, { gv: 2, vale: 1 }, big), VT = vg.world.T, va = VT.vale;
check("the island has a vale", !!va && va.r === 7);
{
  let floor = 0, wet = 0, far = 0;
  // flood out from the middle over every tile a walker can stand on (corners count as touching): nothing past the wall
  const seen = new Set(), q = [[Math.floor(va.x), Math.floor(va.z)]]; seen.add(q[0].join());
  while (q.length) { const c = q.pop(); far = Math.max(far, Math.hypot(c[0] + 0.5 - va.x, c[1] + 0.5 - va.z)); if (far > 30) break; for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const n = [c[0] + dx, c[1] + dz], k = n.join(); if (!seen.has(k) && WG.walkable(VT, n[0] + 0.5, n[1] + 0.5)) { seen.add(k); q.push(n); } } }
  for (let i = 0; i < 40; i++) { const a = i * 0.7, d = (i % 6); const x = va.x + Math.cos(a) * d, z = va.z + Math.sin(a) * d; if (WG.walkable(VT, x, z)) floor++; if (WG.depthAt(VT, x, z) > 0.05) wet++; }
  check("a ring of cliffs nobody can walk, all the way round: no way in or out on foot", far < 11 && seen.size > 100, seen.size + " tiles inside, the furthest " + far.toFixed(1) + " from the middle");
  check("a dry, level floor inside", floor === 40 && wet === 0, floor + "/40 walkable, " + wet + " wet");
  check("that glitters (crystal ground)", WG.biomeAt(VT, va.x, va.z) === B.crystal);
}
const stones = AR.stones(vg), inS = stones.find(n => SB.dist(n.x, n.z, va.x, va.z) < 3), outS = stones.find(n => n !== inS);
check("two glow-stones: one inside, one out in the open", stones.length === 2 && !!inS && !!outS && SB.dist(outS.x, outS.z, va.x, va.z) > 18 && WG.walkable(VT, outS.x, outS.z));
const vf = founders(vg), me = vf[0];
me.x = outS.x + 1; me.z = outS.z;
{
  const o = { use: null, place: null, pick: null }, said = [];
  const x = { op: (label, go) => ({ label, go }), no: l => ({ label: l, locked: true }), say: t => said.push(t), audio() {} };
  AR.options(vg, me, { type: "node", ref: outS, kind: "glowstone" }, o, x);
  check("in a body, a glow-stone offers a hop", !!o.use && /hop/.test(o.use.label));
  const sp0 = vg.sparks; o.use.go();
  check("the hop lands you in the vale", SB.dist(me.x, me.z, va.x, va.z) < va.r && /hop/.test(said[0] || ""), said[0]);
  check("finding it the first time pays 5 sparks, once", vg.sparks === sp0 + 5 && AR.state(vg).vale === 1);
  const o2 = { use: null }; AR.options(vg, me, { type: "node", ref: inS, kind: "glowstone" }, o2, x); o2.use.go();
  check("and the stone inside hops you back out", SB.dist(me.x, me.z, outS.x, outS.z) < 2 && vg.sparks === sp0 + 5);
}
check("an island without the choice has no vale and no glow-stones", !T0.vale && !T0.nodes.some(n => n.kind === "glowstone"));

console.log("7. the island editor's stamps");
{
  const plain = mk(33, { gv: 2 }, big).world.T, hx = Math.round(plain.nest.x) + 30, hz = Math.round(plain.nest.z);
  const ed = [["hill", hx / big, hz / big], ["lake", (plain.nest.x - 25) / big, plain.nest.z / big], ["grove", (plain.nest.x) / big, (plain.nest.z + 22) / big]];
  const T = mk(33, { gv: 2, edits: ed }, big).world.T;
  check("a hill stamp raises the ground", WG.heightAt(T, hx, hz) > WG.heightAt(plain, hx, hz) + 4, WG.heightAt(plain, hx, hz).toFixed(1) + " -> " + WG.heightAt(T, hx, hz).toFixed(1));
  check("a lake stamp holds water", WG.depthAt(T, Math.round(plain.nest.x - 25), Math.round(plain.nest.z)) > 0.5, WG.depthAt(T, Math.round(plain.nest.x - 25), Math.round(plain.nest.z)).toFixed(2) + " deep");
  const oaks = t => t.nodes.filter(n => n.kind === "oak" && SB.dist(n.x, n.z, plain.nest.x, plain.nest.z + 22) < 8).length;
  check("a grove stamp plants trees", oaks(T) >= oaks(plain) + 4, oaks(plain) + " -> " + oaks(T));
  check("the stamps ride in the island's settings, so a save brings the same island back", (() => { const g = mk(33, { gv: 2, edits: ed }, big); const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(g)))); return Math.abs(WG.heightAt(g2.world.T, hx, hz) - WG.heightAt(T, hx, hz)) < 1e-6 && g2.settings.world.edits.length === 3; })());
}

console.log("8. the title: custom island, the map, secrets, languages");
const st0 = { mode: "normal", size: "normal", shape: "surprise", land: "island", peaks: "normal", climate: "temperate", food: "normal", grumps: "normal", storms: "normal", story: "balanced", seasons: "normal", crew: "pair", quirk: "surprise", site: "", kin: "", pip: "", critter: "", secret: "", pod: null, edits: [], tool: "pod", seed: "" };
{
  const w = TI.worldOf(st0, []);
  check("play now and an untouched custom island carry none of the new settings", ["site", "kin", "pip", "critter", "vale", "pod", "edits"].every(k => !(k in w)) && w.gv === SB.WORLD_GV && w.arch === undefined);
  const st = Object.assign({}, st0, { size: "tiny", shape: "islet", peaks: "none", site: "far", kin: "siblings", pip: "sky", critter: "hopper", secret: "vale", edits: [] });
  const w2 = TI.worldOf(st, []);
  check("picked ones go into the island's settings", w2.arch === "islet" && w2.peaks === "none" && w2.site === "far" && w2.kin === "siblings" && w2.pip === "sky" && w2.critter === "hopper" && w2.vale === 1);
  TI.stamp(st, "hill", 0.4, 0.5); TI.stamp(st, "lake", 0.6, 0.5); TI.stamp(st, "pod", 0.5, 0.52);
  check("tapping the map stamps it and moves the pod", st.edits.length === 2 && st.pod[0] === 0.5 && TI.worldOf(st, []).edits.length === 2);
  TI.stamp(st, "undo", 0, 0); TI.stamp(st, "undo", 0, 0); TI.stamp(st, "undo", 0, 0);
  check("undo takes stamps back, then the pod", st.edits.length === 0 && st.pod === null);
  for (let i = 0; i < 30; i++) TI.stamp(st, "grove", 0.5, 0.5);
  check("24 stamps at most", st.edits.length === 24);
  const keepN = SB.WORLD_N, keepO = SB.WORLD_OPTS, pst = Object.assign({}, st0, { size: "small", seed: SB.worldCode(33), pod: [0.3, 0.62] });
  const P = TI.preview(pst), real = mk(33, TI.worldOf(pst, []), SB.WORLD_CHOICES.size.small).world.T;
  SB.setWorldN(keepN);
  check("the map preview draws the island those settings make", P.N === 384 && P.nest.x === real.nest.x && P.nest.z === real.nest.z && WG.minimap(P).length === 384 * 384 * 4);
  check("and leaves the island on screen alone", (() => { const n0 = 256; SB.setWorldN(n0); const o = SB.WORLD_OPTS; TI.preview(pst); return SB.WORLD_N === n0 && SB.WORLD_OPTS === o; })());
  const src = js("title.js");
  check("every new choice is a row on the custom island page, under more options", ["site", "kin", "pip", "critter", "secret"].every(k => new RegExp('"' + k + '"').test(src.match(/var ORDER = \[[^\]]+\]/)[0])) && /ORDER\.slice\(0, 4\)/.test(src));
}
{
  let r = null;
  for (let i = 0; i < 4; i++) r = TI.secret("logo");
  check("the logo: four taps are just hops", r.hit === false && r.n === 0);
  r = TI.secret("logo");
  check("the fifth lays an egg: a secret found", r.hit && r.n === 1 && !r.all);
  r = TI.secret("cooked");
  check("the studio's name fries an egg at once", r.hit && r.n === 2);
  TI.secret("version"); TI.secret("version"); r = TI.secret("version");
  check("the version number, tapped three times: all three found", r.hit && r.all && r.n === 3);
  check("found secrets are remembered on this device", /logo/.test(ctx.localStorage.getItem("smolbrains-secrets")) && TI.secret("nonsense").n === 3);
}
{
  const TR = SB.Tr;
  check("english is the language unless you pick another", TR.lang === "en" && TR.t("▶ play now") === "▶ play now");
  check("a spanish pack ships, for the title, new-world and settings screens", TR.count("es") >= 60 && TR.packs.es._name === "español", TR.count("es") + " lines");
  TR.set("es");
  check("pick it and lines come back in spanish", TR.t("▶ play now") === "▶ jugar ya" && TR.t("landing site") === "lugar de aterrizaje" && ctx.localStorage.getItem("smolbrains-lang") === "es");
  check("a line the pack lacks stays english", TR.t("something nobody translated") === "something nobody translated");
  const node = { nodeType: 1, getAttribute: k => k === "title" ? "settings" : null, setAttribute(k, v) { this["_" + k] = v; }, childNodes: [{ nodeType: 3, nodeValue: " ▶ continue " }, { nodeType: 1, childNodes: [{ nodeType: 3, nodeValue: "load game" }, { nodeType: 3, nodeValue: "Biscuit island" }] }] };
  const n = TR.sweep(node);
  check("a whole screen is swept into the language, names left alone", n === 3 && node.childNodes[0].nodeValue === " ▶ continuar " && node.childNodes[1].childNodes[0].nodeValue === "cargar partida" && node.childNodes[1].childNodes[1].nodeValue === "Biscuit island" && node._title === "ajustes");
  TR.add("pirate", "pirate", { "▶ play now": "▶ set sail" }); TR.set("pirate");
  check("anyone can add a pack: a table of english lines to theirs", TR.t("▶ play now") === "▶ set sail" && TR.count("pirate") === 1);
  TR.add("pirate", null, { "{} joined your smols! 🧳": "{} be crew now, arr" });
  check("a line with a name in it is matched by its shape", TR.t("Biscuit (the 2nd) joined your smols! 🧳") === "Biscuit (the 2nd) be crew now, arr" && TR.t("nobody joined") === "nobody joined");
  TR.set("es");
  check("the spanish pack has some of those too", TR.t("🛏 Mo is your guest for 3 days") === "🛏 Mo es tu huésped durante 3 días");
  TR.set("en");
  check("and switch back", TR.t("▶ play now") === "▶ play now" && TR.sweep(node) === 0);
}

console.log("9. the founders: kin, Pip's look, a starting critter");
{
  const g = mk(21, { gv: 2, kin: "siblings" }), f = founders(g);
  check("brother and sister: related from the first day", SB.Game.related(g, f[0], f[1]) && f[0].sex === "f" && f[1].sex === "m");
  check("with two lost parents in the family tree", f[0].parents.length === 2 && g.family[f[0].parents[0]].kids.length === 2 && /lost/.test(g.family[f[0].parents[0]].name));
  check("so the colony needs newcomers", ST.breedablePairs(g) === 0);
  const g2 = mk(21, { gv: 2, kin: "sweethearts" }), f2 = founders(g2);
  check("sweethearts: partners as they climb out, and not related", f2[0].partner === f2[1].id && f2[1].partner === f2[0].id && !SB.Game.related(g2, f2[0], f2[1]));
  const g3 = mk(21), f3 = founders(g3);
  check("left alone: two strangers, as ever", !SB.Game.related(g3, f3[0], f3[1]) && !f3[0].partner && f3[0].parents.length === 0);
  check("the same founders either way (the choice costs no dice)", SB.Genome.encode(f3[0].genome) === SB.Genome.encode(f2[0].genome));
}
{
  const g = mk(21, { gv: 2, pip: "sky" });
  const pip = SB.Game.spawnSmol(g, { genome: SB.Genome.forTier(g.rng, 0), name: "Pip", x: g.world.T.nest.x + 3, z: g.world.T.nest.z, age: 260, how: "story" });
  check("Pip's look: sky blue", Math.abs(pip.genome.genes.hue - 0.58) < 1e-9 && pip.look.hue === Math.round(0.58 * 360));
  const other = SB.Game.spawnSmol(g, { genome: SB.Genome.forTier(g.rng, 0), name: "Mo", x: g.world.T.nest.x + 4, z: g.world.T.nest.z, age: 260, how: "story" });
  check("only Pip", other.genome.genes.hue !== 0.58);
  const g0 = mk(21), p0 = SB.Game.spawnSmol(g0, { genome: SB.Genome.forTier(g0.rng, 0), name: "Pip", how: "story" });
  check("and only when asked", p0.genome.genes.hue !== 0.58 && Object.keys(SB.Game.PIP).length === 5);
}
{
  const g = mk(21, { gv: 2, critter: "hopper" }), f = founders(g);
  const pets = g.world.items.filter(o => o.kind === "hopper" && o.data.gift);
  check("a starting critter climbs out of the pod with them", pets.length === 1 && SB.dist(pets[0].x, pets[0].z, f[0].x, f[0].z) < 3);
  check("an island without the choice gets none", !mk(21).world.items.some(o => o.data && o.data.gift));
}

console.log("10. guests: a few days, never one of the tribe");
const game = mk(21); SB.Game.current = game;
const ff = founders(game), home = SB.Society.home(game, 0);
for (let i = 0; i < 4; i++) { const k = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(game.rng, 2), x: home.x + i, z: home.z + 2, age: SB.STAGES[3].from + 20 }); k.stage = 3; }
game.stats.maxTier = 2;
const tribe = () => game.creatures.filter(c => c.alive && c.species === "smol" && !c.stranger).length;
{
  const n0 = tribe(), gst = ST.arrive(game, { kind: "guest" });
  check("a guest turns up, waiting like any stranger", gst && gst.stranger.kind === "guest" && gst.stranger.state === "waiting" && ST.pending(game) === gst);
  check("with something to notice about them", typeof gst.stranger.look === "string" && gst.stranger.look.length > 3);
  ST.decide(game, gst, true);
  check("let in, they stay as a guest, not a tribe member", gst.stranger && gst.stranger.state === "guest" && tribe() === n0 && !ST.pending(game));
  check("for three days", Math.abs(gst.stranger.until - game.time - 3 * SB.DAY_LENGTH) < 1);
  gst.x = gst.stranger.wx + 2; gst.z = gst.stranger.wz;
  check("a guest lives its own days near the village", ST.think(gst, game) === false);
  gst.x += 40;
  check("and comes back if it strays", ST.think(gst, game).x === gst.stranger.wx);
  const sp = game.sparks; game.time = gst.stranger.until + 1; gst.stranger.asked = 1; // (already asked once: this time they go)
  ST.tick(game, 0.1);
  check("when the stay is over they thank you and go, leaving 3 sparks", gst.stranger.state === "leaving" && game.sparks === sp + 3);
  const g2 = ST.arrive(game, { kind: "guest" }); ST.decide(game, g2, true); game.time = g2.stranger.until + 1;
  ff.concat(game.creatures).forEach(c => { if (c.chem) c.chem.hunger = 0.1; }); game._chT = null;
  let asked = false; for (let i = 0; i < 40 && !asked; i++) { const s = g2.stranger; s.state = "guest"; s.asked = 0; ST.guestOut(game, g2); asked = g2.stranger.state === "waiting"; }
  check("a well-fed guest sometimes asks to stay for good", asked && g2.stranger.asked === 1 && ST.pending(game) === g2);
  ST.decide(game, g2, true);
  check("say yes then, and they join", !g2.stranger && tribe() === n0 + 1);
  const g3 = ST.arrive(game, { kind: "guest" }); ST.decide(game, g3, false);
  check("a guest can be sent away at the door too", g3.stranger.state === "leaving");
  g3.alive = false; gst.alive = false;
}

console.log("11. someone only passing through");
{
  const n0 = tribe(), p = ST.pass(game);
  check("a passer-by crosses the island near the village", p && p.stranger.state === "passing" && SB.dist(p.stranger.x0, p.stranger.z0, p.stranger.x1, p.stranger.z1) > 24);
  check("nobody is asked anything", !ST.pending(game) && tribe() === n0);
  check("they walk for the far side", ST.think(p, game).x === p.stranger.x1);
  const sp = game.sparks, r1 = ST.wave(game, ff[0], p), r2 = ST.wave(game, ff[0], p);
  check("in a body you can wave: a word back and a spark, once", r1.ok && r1.msg.indexOf(p.stranger.line) > 0 && game.sparks === sp + 1 && !r2.ok && game.sparks === sp + 1);
  const o = { pick: null }, x = { op: (label, go) => ({ label, go }), say() {}, audio() {} }, p2 = ST.pass(game, { cameo: 0 });
  AR.options(game, ff[0], { type: "creature", ref: p2 }, o, x);
  check("the wave is a button when you look at them", !!o.pick && o.pick.label === "wave to " + p2.name);
  check("now and then it is a cameo from another computer cooked game", p2.name === "Judge Honk" && p2.stranger.cameo === "goose court" && /goose court/.test(p2.stranger.trait) && ST.CAMEOS.length >= 5);
  p.x = p.stranger.x1; p.z = p.stranger.z1; ST.tick(game, 0.1);
  check("at the far side they are gone", !p.alive && p.gone);
  p2.stranger.t = game.time - 200; ST.tick(game, 0.1);
  check("and one who dawdles is gone in a few minutes anyway", !p2.alive);
  const g = mk(5); founders(g); g.time = SB.DAY_LENGTH * 0.5; ST.tick(g, 5000);
  check("never on the calm first day", !g.creatures.some(c => c.stranger));
  g.time = SB.DAY_LENGTH * 1.2; g.strangerT = 1e9; ST.tick(g, 1); ST.state(g).passT = 0.5; ST.tick(g, 1);
  check("from day two the timer brings them", g.creatures.some(c => c.stranger && c.stranger.state === "passing"));
  SB.Game.current = game;
}

console.log("12. a grump in a smol suit");
{
  const fk = ST.arrive(game, { kind: "fake" });
  check("looks like any stranger at the edge", fk.species === "smol" && fk.stranger.state === "waiting" && fk.stranger.kind === "fake");
  check("but look closer: something is off", ST.TELLS.indexOf(fk.stranger.look) >= 0 && !fk.stranger.brings && fk.stranger.trait === "very friendly", fk.stranger.look);
  const real = ST.arrive(game, {});
  check("an honest stranger never has a tell", ST.TELLS.indexOf(real.stranger.look) < 0);
  real.alive = false;
  const sp = game.sparks; let caught = 0; SB.bus.on("fakeCaught", () => caught++);
  ST.decide(game, fk, false);
  check("send it away and the mask comes off: good eye, +3 sparks", fk.stranger.state === "leaving" && game.sparks === sp + 3 && caught === 1 && /good eye/.test(notes(game)));
  fk.alive = false;
  const fk2 = ST.arrive(game, { kind: "fake" }), n0 = tribe();
  ST.decide(game, fk2, true);
  check("let it in and it joins like anyone", !fk2.stranger && tribe() === n0 + 1 && ST.state(game).fake.id === fk2.id);
  let seen = null; SB.bus.on("unmasked", d => { seen = d; });
  const g0 = game.creatures.filter(c => c.species === "grump" && c.alive).length;
  game.time = ST.state(game).fake.t + 1; ST.tick(game, 0.1);
  check("then one day the mask comes off: the smol is gone and a grump bolts", !fk2.alive && fk2.gone && seen && seen.g.species === "grump" && seen.g.goingHome && game.creatures.filter(c => c.species === "grump" && c.alive).length === g0 + 1);
  check("the family tree remembers what it was", /grump/.test(game.family[fk2.id].cause) && ST.state(game).fake === null && ST.state(game).fakes === 1);
  seen.g.alive = false;
  const r = [];
  for (let i = 0; i < 200; i++) r.push(ST.roll(game).kind || "");
  check("the timer mostly brings newcomers, sometimes a guest, rarely a fake (this band is too small for one)", r.filter(k => k === "").length > 120 && r.filter(k => k === "guest").length > 15 && r.filter(k => k === "fake").length === 0 || ST.couples(game) === 0);
}

console.log("13. arrivals on conditions");
{
  const W = SB.World, w = game.world;
  check("nothing built: nobody comes", ST.checkConds(game) === null);
  W.addStructure(w, game, "campfire", home.x + 3, home.z, { done: true });
  const cook = ST.checkConds(game);
  check("a campfire stands: a cook turns up", cook && cook.stranger.role === "cook" && cook.stranger.kind === "special" && ST.state(game).came.cook === 1);
  check("only the once", ST.checkConds(game) === null || ST.pending(game) !== cook);
  const n0 = w.items.length;
  ST.decide(game, cook, true);
  check("welcomed, the cook brings food", w.items.length === n0 + 3 && cook.came === "cook" && !cook.stranger && /came as a cook/.test(notes(game)));
  W.addStructure(w, game, "hut", home.x - 4, home.z, { done: true });
  const mason = ST.checkConds(game);
  check("a hut stands: a mason", mason && mason.stranger.role === "mason");
  ST.decide(game, mason, false);
  check("sent away, a conditional arrival does not come again", ST.checkConds(game) === null && ST.state(game).came.mason === 1);
  mason.alive = false;
  ff[1].chem.sick = 0.8;
  const healer = ST.checkConds(game);
  check("someone is ill: a healer, with healroot", healer && healer.stranger.role === "healer" && (ST.decide(game, healer, true), w.items.filter(o => o.kind === "herb").length >= 2));
  ff[1].chem.sick = 0;
  check("the special arrival waits until every job in town is filled", !ST.jobsFilled(game) && ST.checkConds(game) === null);
  const sm = game.creatures.filter(c => c.alive && c.species === "smol" && !c.stranger), jobs = Object.keys(SB.Civ.JOBS);
  while (sm.length < jobs.length) { const k = SB.Game.spawnSmol(game, { genome: SB.Genome.forTier(game.rng, 2), x: home.x + 1, z: home.z - 2, age: SB.STAGES[3].from + 20 }); k.stage = 3; sm.push(k); }
  jobs.forEach((j, i) => { sm[i].job = j; });
  const crown = ST.checkConds(game), sp = game.sparks;
  check("then the crowned one comes", ST.jobsFilled(game) && crown && crown.stranger.role === "crown");
  sm[0].chem.lonely = 0.9; ST.decide(game, crown, true);
  check("welcomed: 15 sparks, a crown, and the village cheers up", game.sparks === sp + 15 && crown.crown === 1 && sm[0].chem.lonely < 0.7);
  const g = mk(5); founders(g); W.addStructure(g.world, g, "campfire", g.world.T.nest.x + 3, g.world.T.nest.z, { done: true });
  g.time = SB.DAY_LENGTH * 1.2; g.strangerT = 1e9; ST.state(g).passT = 1e9; ST.state(g).condT = 0.5; ST.tick(g, 1);
  check("the tick checks the conditions by itself", g.creatures.some(c => c.stranger && c.stranger.role === "cook"));
  SB.Game.current = game;
}

console.log("14. a smol from a code arrives as a stranger; the sky gate");
{
  const code = SB.Save.exportSmol(ff[0]), d = SB.Save.importSmol(code), n0 = tribe();
  const c = ST.land(game, d);
  check("pasted in, it does not just appear in the village: it waits as a stranger", c.stranger && c.stranger.imported && c.stranger.state === "waiting" && tribe() === n0 && c.name === ff[0].name);
  check("with no gate it walks in from the edge", c.stranger.gate === false && SB.dist(c.x, c.z, home.x, home.z) > 15);
  ST.decide(game, c, false, true);
  check("the tribe never sends your smol away for you", c.stranger.state === "waiting");
  c.stranger.t = game.time - 500; ST.tick(game, 0.1);
  check("left waiting, it is taken in or still waits: never lost", !c.stranger || c.stranger.state === "waiting");
  if (c.stranger) ST.decide(game, c, true);
  check("welcome it and it joins", !c.stranger && c.alive);
  const b = ff[1]; b.tier = Math.max(b.tier, 2); b.x = home.x + 1; b.z = home.z + 1;
  check("no stone, no gate", /4 stone/.test(AR.gateWhy(game, b)) && !AR.raiseGate(game, b).ok);
  SB.Surv.add(b, "stone", 4); SB.Surv.add(b, "crystal", 1);
  const o = { use: null, place: null, pick: null }, said = [], x = { op: (label, go) => ({ label, go }), say: t => said.push(t), audio() {} };
  AR.options(game, b, { type: "node", ref: game.world.T.nest, kind: "nest" }, o, x);
  check("holding 4 stone and a crystal, the nest offers a sky gate", !!o.place && /sky gate/.test(o.place.label), SB.Surv.count(b, "stone", true) + " stone");
  o.place.go();
  const gate = ST.gate(game);
  check("raised: a finished building, paid for", !!gate && gate.done && gate.kind === "skygate" && SB.Surv.count(b, "stone", true) === 0 && SB.Surv.count(b, "crystal", true) === 0 && /sky gate/.test(said[0]));
  check("one gate is enough", /already/.test(AR.gateWhy(game, b)));
  const c2 = ST.land(game, SB.Save.importSmol(SB.Save.exportSmol(ff[1])));
  check("now a pasted smol steps out of the gate", c2.stranger.gate === true && SB.dist(c2.x, c2.z, gate.x, gate.z) < 3);
  ST.decide(game, c2, true);
  const o2 = { use: null }, ex0 = game.stats.exported || 0;
  AR.options(game, b, { type: "struct", ref: gate, kind: "skygate" }, o2, x);
  const mc = AR.makeCode(game, b);
  check("at the gate you make your smol's code", !!o2.use && /code/.test(o2.use.label) && mc.ok && /^SMOL2:/.test(mc.code) && SB.Save.importSmol(mc.code).name === b.name && (game.stats.exported || 0) === ex0 + 1);
  check("the gate is a building with a price and a model", SB.STRUCTS.skygate.cost.stone === 4 && typeof SB.Meshes.STRUCT_BUILDERS.skygate === "function");
}

console.log("15. two islands into one");
{
  const o = mk(77); o.wid = "wother"; o.wname = "mossy cove";
  const of = founders(o);
  const kid1 = SB.Game.spawnSmol(o, { parents: [of[0].id, of[1].id], gen: 2, age: SB.STAGES[3].from + 10, sex: "f" }), kid2 = SB.Game.spawnSmol(o, { parents: [of[0].id, of[1].id], gen: 2, age: SB.STAGES[3].from + 10, sex: "m" });
  const data = JSON.parse(JSON.stringify(SB.Save.snapshot(o)));
  SB.Game.current = game; game.wid = "wmine";
  game.creatures.forEach(c => { if (c.stranger) c.alive = false; });
  SB.Game.POP_CAP = SB.Game.JOIN_CAP = tribe() + 1;
  check("a full village takes nobody", !ST.merge(game, data).ok && /no room/.test(ST.merge(game, data).msg));
  SB.Game.POP_CAP = SB.Game.JOIN_CAP = 36;
  const n0 = tribe(), fam0 = Object.keys(game.family).length, r = ST.merge(game, data);
  check("the smols of another saved island come over as a band", r.ok && r.n === 4 && /mossy cove/.test(r.msg), r.msg);
  check("as strangers at the gate, to welcome one by one", r.band.every(c => c.stranger && c.stranger.imported && c.stranger.state === "waiting") && tribe() === n0);
  const nk1 = r.band.find(c => c.name === kid1.name), nk2 = r.band.find(c => c.name === kid2.name), np = r.band.find(c => c.name === of[0].name);
  check("their family tree comes with them: brother and sister still are", nk1 && nk2 && SB.Game.related(game, nk1, nk2) && SB.Game.related(game, nk1, np));
  check("and not related to anyone here", !SB.Game.related(game, nk1, ff[0]) && !SB.Game.related(game, np, ff[1]));
  check("one stranger card at a time", (() => { let n = 0; const h = () => n++; SB.bus.on("stranger", h); const g = mk(78); founders(g); g.wid = "w3"; ST.merge(g, data); SB.Game.current = game; return n === 1; })());
  r.band.forEach(c => ST.decide(game, c, true));
  check("welcomed, the two tribes are one", tribe() === n0 + 4 && Object.keys(game.family).length >= fam0 + 4);
  check("an island merges once", !ST.merge(game, data).ok && /already/.test(ST.merge(game, data).msg));
  check("and never with itself, or with nothing", !ST.merge(game, JSON.parse(JSON.stringify(SB.Save.snapshot(game)))).ok && !ST.merge(game, null).ok && !ST.merge(game, { creatures: [] }).ok);
}

console.log("16. new game+ after the beacon: lamps of its light");
{
  const prev = mk(21); founders(prev); prev.ended = true;
  const g = SB.Game.newGamePlus(prev, 99); SB.Game.current = g;
  const lamps = g.world.items.filter(o => o.kind === "beaconlamp");
  check("two beacon lamps come along to the new island", lamps.length === 2 && SB.KINDS.beaconlamp.noun === "tool" && AR.lamps(g).length === 2);
  const prev2 = mk(21); founders(prev2);
  check("only if the beacon was lit", !SB.Game.newGamePlus(prev2, 99).world.items.some(o => o.kind === "beaconlamp"));
  SB.Game.current = g;
  const f = founders(g), gr = SB.Game.spawnGrump(g, lamps[0].x + 2, lamps[0].z), far = SB.Game.spawnGrump(g, lamps[0].x + 30, lamps[0].z);
  f[0].x = lamps[0].x + 1; f[0].z = lamps[0].z; f[0].chem.fear = 0.6; gr.chem.fear = 0; far.chem.fear = 0;
  AR.slow(g); AR.slow(g);
  check("a grump near a lamp turns for home; one far off does not", gr.goingHome === true && !far.goingHome && far.chem.fear === 0);
  check("a smol near it calms down", f[0].chem.fear < 0.3);
  let ticked = 0; const slow0 = AR.slow; AR.slow = gm => { ticked++; };
  for (let i = 0; i < 100; i++) AR.tick(g, 0.05);
  AR.slow = slow0;
  check("the lamps and the ice are looked at every few seconds, not every frame", ticked >= 1 && ticked <= 2, ticked + " in 5 s");
}

console.log("17. spreading things: stay put");
{
  const g = mk(21, { gv: 2, spread: "off" }), g0 = mk(21);
  [g, g0].forEach(o => { o.quests = o.quests || {}; o.quests.dark = { x2: { sky: { id: "blight", t: 18, until: 1e9, farms: [1] }, places: [{ kind: "nest", day: 1 }, { kind: "camp", day: 1 }] } }; AR.slow(o); });
  check("with the choice, blight never gets to jump a farm", g.quests.dark.x2.sky.t === 0);
  check("and a bug nest never buds", g.quests.dark.x2.places[0].spread === 1e9 && g.quests.dark.x2.places[1].spread === undefined);
  check("without it, both spread as ever", g0.quests.dark.x2.sky.t === 18 && g0.quests.dark.x2.places[0].spread === undefined);
  const dsrc = js("dark.js");
  check("those are the two rules dark.js spreads by", dsrc.indexOf("(s.t = (s.t || 0) + 2) < 20") > 0 && dsrc.indexOf("day(game) - (p.spread || p.day) < 2") > 0);
  check("it is a row on the custom island page", TI.worldOf(Object.assign({}, st0, { spread: "off" }), []).spread === "off" && !("spread" in TI.worldOf(st0, [])));
  SB.Game.current = game;
}

console.log("18. saves, old islands, and the models");
{
  SB.Game.current = game;
  const gst = ST.arrive(game, { kind: "guest" }); ST.decide(game, gst, true);
  const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  const gst2 = g2.creatures.find(c => c.name === gst.name && c.stranger);
  check("a guest, the gate and the arrivals' memory survive a save", gst2 && gst2.stranger.state === "guest" && Math.abs(gst2.stranger.until - gst.stranger.until) < 1 && !!ST.gate(g2) && g2.quests.arr.came.cook === 1 && g2.quests.arr.merged.wother === 1);
  const old = JSON.parse(JSON.stringify(SB.Save.snapshot(mk(21))));
  if (old.quests) { delete old.quests.arr; delete old.quests.arrivals3; }
  const g3 = SB.Save.revive(old); SB.Game.current = g3; let threw = null;
  try { founders(g3); g3.time = SB.DAY_LENGTH * 1.5; ST.tick(g3, 1); AR.tick(g3, 5); AR.slow(g3); ST.checkConds(g3); } catch (e) { threw = e; }
  check("an island saved before all this loads and runs", !threw && ST.state(g3).n >= 0, threw && threw.message);
  check("an island saved without the choices is rebuilt without them", !g3.world.T.vale && g3.world.T.nest.x === T0.nest.x);
  const ME = SB.Meshes, real = !!(ME && ME.builder && ME.NODE_BUILDERS.oak);
  ["redshrub", "shelfcap", "glowstone", "iceberg"].forEach(k => {
    let m = null, err = "";
    try { m = ME.NODE_BUILDERS[k](1); } catch (e) { err = e.message; }
    check("the " + SB.NODES[k].label + " has a model that builds", real && m && m.count > 20 && !err, err || (m && m.count + " vertices, " + m.minY.toFixed(2) + " to " + m.maxY.toFixed(2)));
  });
  const ice = ME.NODE_BUILDERS.iceberg(4.7), gm = ME.STRUCT_BUILDERS.skygate();
  check("the iceberg's model rides two above its foot, so it shows above the sea", ice.minY > 1 && ice.maxY > 2.6 && ice.maxY < 4.5, ice.minY.toFixed(2) + " to " + ice.maxY.toFixed(2));
  check("the sky gate's model stands on the ground, a smol and a half tall", gm.count > 50 && gm.minY > -0.05 && gm.maxY > 1.4 && gm.maxY < 2);
}

console.log(failed ? failed + " FAILED, " + passed + " passed" : "all " + passed + " passed");
process.exit(failed ? 1 : 0);
