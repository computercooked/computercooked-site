// Collectible smols: trait rolls match their odds, rare parents make rare kids more often, mutations can make a
// mythic, every trait paints a whole sprite, codes carry traits and reject edits, old saves get the same traits
// every time, and the same smol can't be imported twice.
// node games/smol-brains/tests/collect.test.js
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const load = require("./_load.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra ? "  (" + extra + ")" : "")); if (!ok) failed++; }

const ctx = load();
const SB = ctx.SB, CX = SB.Collect;

console.log("1. rolls match the odds tables");
{
  const N = 200000, r = SB.rng(77), counts = {};
  for (let i = 0; i < N; i++) { const cx = CX.roll(r); for (const k of CX.KEYS) { const key = k + ":" + cx[k]; counts[key] = (counts[key] || 0) + 1; } }
  let worst = 0, worstName = "";
  for (const s of CX.SLOTS) for (const e of s.list) {
    const want = e.p * N, got = counts[s.id + ":" + e.i] || 0, sd = Math.sqrt(want * (1 - e.p));
    const z = Math.abs(got - want) / Math.max(1, sd);
    if (z > worst) { worst = z; worstName = s.id + " " + e[0] + " " + got + " vs " + want.toFixed(0); }
  }
  check("every trait within 4.5 sd of its weight", worst < 4.5, "worst " + worst.toFixed(2) + ": " + worstName);
  check("shiny is about 1 in 512", Math.abs(CX.odds("pal", 3) - 512) < 5, "1 in " + CX.odds("pal", 3));
  // fluff grade: P(f < x) = x²
  let fn = 0, bs = 0;
  for (let i = 0; i < N; i++) { const f = CX.roll(r).f; if (f < 0.07) fn++; if (f >= 0.45) bs++; }
  check("pristine fluff is rare (~0.5%)", Math.abs(fn / N - 0.0049) < 0.0015, (fn / N * 100).toFixed(2) + "%");
  check("most smols are scruffy (~80%)", Math.abs(bs / N - 0.7975) < 0.01, (bs / N * 100).toFixed(1) + "%");
  // overall rarity spread
  const tiers = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < N; i++) tiers[CX.info({ cx: CX.roll(r) }).tier]++;
  console.log("     overall: " + tiers.map((n, i) => CX.RARITY[i].name + " " + (n / N * 100).toFixed(3) + "%").join(", "));
  check("tiers get rarer all the way up", tiers.every((n, i) => i === 0 || n < tiers[i - 1]) && tiers[5] > 0);
  // genomes: random genomes get traits from their genes, same as the tables
  let rareG = 0;
  for (let i = 0; i < 4000; i++) { const g = SB.Genome.random(SB.rng(5000 + i)); if (CX.info(g).tier >= 2) rareG++; }
  check("random genomes are rare+ about as often as rolls", Math.abs(rareG / 4000 - (tiers[2] + tiers[3] + tiers[4] + tiers[5]) / N) < 0.03, (rareG / 40).toFixed(1) + "%");
}

console.log("2. breeding: traits are inherited, rare parents make rare kids, mutations happen");
{
  const r = SB.rng(9);
  const mk = (cx, i) => { const g = SB.Genome.random(SB.rng(100 + i)); g.cx = Object.assign({ v: 1 }, cx); return g; };
  const plain = { pat: 0, eye: 0, acc: 0, pal: 0, size: 0, voice: 0, f: 0.8 };
  const rare = { pat: 4, eye: 3, acc: 3, pal: 1, size: 0, voice: 3, f: 0.05 };
  let plainKids = 0, rareKids = 0, kept = 0, mutants = 0, fluffSum = 0;
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const a = mk(plain, i), b = mk(plain, i + 1e5);
    const k = SB.Genome.cross(a, b, r);
    if (CX.info(k).tier >= 2) plainKids++;
    if (k.cx.mut) mutants++;
    const ra = mk(rare, i), rb = mk(Object.assign({}, rare, { pat: 3 }), i + 1e5);
    const rk = SB.Genome.cross(ra, rb, r);
    if (CX.info(rk).tier >= 2) rareKids++;
    if (rk.cx.eye === 3) kept++;
    fluffSum += rk.cx.f;
  }
  check("two rare parents have far more rare kids", rareKids > plainKids * 4, (rareKids / N * 100).toFixed(1) + "% vs " + (plainKids / N * 100).toFixed(1) + "%");
  check("a trait both parents share usually breeds true", kept / N > 0.8, (kept / N * 100).toFixed(1) + "%");
  check("low-fluff parents have low-fluff kids", fluffSum / N < 0.35, (fluffSum / N).toFixed(3));
  check("mutations to a mythic happen, rarely", mutants > 5 && mutants < N * 0.012, mutants + " of " + N);
  // fresh-roll luck: with two rare parents, a fresh pattern roll is ~3x more likely to be holo
  const luckyHolo = (() => { let n = 0; const rr = SB.rng(3); for (let i = 0; i < 100000; i++) { const cx = CX.roll(rr, { pat: 2.5 }); if (cx.pat === 6) n++; } return n / 100000; })();
  check("lucky rolls lean rare", luckyHolo > CX.entry("pat", 6).p * 2.2, (luckyHolo * 100).toFixed(2) + "% vs " + (CX.entry("pat", 6).p * 100).toFixed(2) + "%");
  // the game's own rng isn't touched by trait rolls
  const g1 = SB.rng(42), g2 = SB.rng(42);
  const pa = SB.Genome.random(SB.rng(1)), pb = SB.Genome.random(SB.rng(2));
  SB.Genome.cross(pa, pb, g1);
  const ctx2 = load(), SB2 = ctx2.SB; delete SB2.Collect;
  SB2.Genome.cross(SB2.Genome.random(SB2.rng(1)), SB2.Genome.random(SB2.rng(2)), g2);
  check("breeding uses the game rng exactly as before", g1() === g2());
}

console.log("3. codes carry traits, and edits are caught");
{
  const game = SB.Game.newGame(12); SB.Game.current = game; game.tutorial.done = true;
  const [c] = SB.Debug.spawnTier(3, 1);
  c.genome.cx = { v: 1, pat: 7, eye: 5, acc: 6, pal: 4, size: 4, voice: 4, f: 0.0042 };
  c.look = SB.Genome.look(c.genome);
  const code = SB.Save.exportSmol(c);
  const d = SB.Save.importSmol(code);
  check("traits round-trip through a code", JSON.stringify(d.genome.cx) === JSON.stringify(c.genome.cx), JSON.stringify(d.genome.cx));
  check("the code knows where the smol came from", d.oid === c.oid && d.key);
  // flip one character in the middle of the payload
  const body = code.slice(6), mid = Math.floor(body.length / 2);
  let rejected = 0, accepted = 0;
  for (let i = 0; i < 40; i++) {
    const at = mid - 20 + i, ch = body[at], nc = ch === "A" ? "B" : "A";
    const bad = "SMOL2:" + body.slice(0, at) + nc + body.slice(at + 1);
    try { SB.Save.importSmol(bad); accepted++; } catch (e) { rejected++; }
  }
  check("a typo'd code is rejected", accepted === 0, rejected + " rejected");
  // a careful edit: decode the JSON, swap the genome for a forged one, re-encode without fixing the checksum
  const json = JSON.parse(Buffer.from(body.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
  const forged = SB.Genome.decode(json.genome); forged.cx.pat = 7;
  json.name = "Fake";
  const fcode = "SMOL2:" + Buffer.from(JSON.stringify(json)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  let tampered = false; try { SB.Save.importSmol(fcode); } catch (e) { tampered = !!e.tampered; }
  check("an edited code is rejected as changed", tampered);
  // dropping the checksum: the code still imports, but its traits come from its genes, not the bytes
  delete json.ck;
  const ucode = "SMOL2:" + Buffer.from(JSON.stringify(json)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const u = SB.Save.importSmol(ucode);
  const derived = CX.ensure(u.genome), fromGenes = CX.roll(SB.rng(CX.geneHash(u.genome, 0x51ab)));
  check("an unsigned code can't bring its own traits", JSON.stringify(derived) === JSON.stringify(fromGenes) && !(derived.pat === 7 && derived.eye === 5 && derived.acc === 6));
  // the same smol can't come in twice
  check("first import is new", !CX.seenImport(game, d.key, null));
  CX.markImport(game, d.key);
  check("the second is spotted", CX.seenImport(game, d.key, null));
  check("a smol still living here can't be imported back in", CX.seenImport(game, "o:other", c.oid));
}

console.log("4. old saves: traits from the genes, the same every time; serials and the smoldex fill in");
{
  const game = SB.Game.newGame(21); SB.Game.current = game; game.tutorial.done = true;
  SB.Debug.spawnTier(2, 6);
  const snap = JSON.parse(JSON.stringify(SB.Save.snapshot(game)));
  // make it look like a save from before collectibles: genomes without trait bytes, no collection state
  const strip = (s) => { const b = SB.Genome.b64dec(s); const i = Array.from(b).lastIndexOf(0xc7); return SB.Genome.b64enc(Array.from(b).slice(0, i >= 0 && b.length - i === 11 ? i : b.length)); };
  snap.creatures.forEach(p => { p.genome = strip(p.genome); delete p.serial; delete p.oid; });
  delete snap.collect;
  const a = SB.Save.revive(JSON.parse(JSON.stringify(snap))), b = SB.Save.revive(JSON.parse(JSON.stringify(snap)));
  const ta = SB.Game.smols(a).map(c => JSON.stringify(c.genome.cx)), tb = SB.Game.smols(b).map(c => JSON.stringify(c.genome.cx));
  check("everyone gets traits", ta.length >= 6 && ta.every(t => t && t !== "undefined"));
  check("the same traits on every load", ta.join() === tb.join());
  const want = SB.Game.smols(a).map(c => JSON.stringify(CX.roll(SB.rng(CX.geneHash(c.genome, 0x51ab)))));
  check("and they're the ones the genes say", ta.join() === want.join());
  const sers = SB.Game.smols(a).map(c => c.serial);
  check("everyone gets a serial number", sers.every(s => s > 0) && new Set(sers).size === sers.length, sers.join(","));
  check("the smoldex knows them", CX.dexCount(a) >= 6);
  // and after that, saving keeps the traits as they are
  const again = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(a))));
  check("a new save keeps traits and serials", SB.Game.smols(again).map(c => JSON.stringify(c.genome.cx) + c.serial).join() === SB.Game.smols(a).map(c => JSON.stringify(c.genome.cx) + c.serial).join());
  const broken = SB.Save.revive(Object.assign(JSON.parse(JSON.stringify(snap)), { collect: { serial: "x", dex: 5, hall: {}, imports: null } }));
  check("broken collection data is fixed up", broken && typeof broken.collect.serial === "number" && Array.isArray(broken.collect.hall));
}

console.log("5. hatching: serials count up, rare hatches are recorded, legendaries make the chronicle");
{
  const game = SB.Game.newGame(5); SB.Game.current = game; game.tutorial.done = true; game.podT = 1e9;
  const [p1, p2] = SB.Debug.spawnTier(2, 2);
  p1.genome.cx = { v: 1, pat: 6, eye: 0, acc: 0, pal: 3, size: 0, voice: 0, f: 0.5 };
  p2.genome.cx = { v: 1, pat: 6, eye: 0, acc: 0, pal: 3, size: 0, voice: 0, f: 0.5 };
  const before = CX.state(game).serial;
  let legend = null;
  for (let i = 0; i < 30 && !legend; i++) {
    const egg = SB.Game.layEgg(game, p1, p2, p1.x, p1.z);
    const k = SB.Game.hatch(game, egg);
    if (CX.info(k).tier >= 4) legend = k;
  }
  check("serials count up", CX.state(game).serial > before);
  check("a shiny holo pair hatches a legendary", !!legend);
  check("the chronicle remembers it", legend && game.chronicle.some(e => e[1] === "✨" && e[2].indexOf(legend.name) >= 0));
  check("the hall of fame has it", legend && CX.state(game).hall.some(r => r.id === legend.id));
  check("eggs keep their traits through a save", (() => {
    const egg = SB.Game.layEgg(game, p1, p2, p1.x, p1.z), want = JSON.stringify(egg.data.genome.cx || CX.ensure(egg.data.genome));
    const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
    const e2 = g2.world.items.find(o => o.kind === "egg" && o.id === egg.id);
    return e2 && JSON.stringify(CX.ensure(e2.data.genome)) === want;
  })());
}

console.log("6. every trait paints a whole sprite");
{
  SB.Render = { afterObjects() {}, camera: {}, gl() { return null; } };
  SB.GL = {};
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "play", "js", "pixel.js"), "utf8"), ctx, { filename: "pixel.js" });
  const game = SB.Game.newGame(3); SB.Game.current = game;
  const F = 32;
  const opaque = (fr) => { let n = 0; for (let i = 3; i < fr.d.length; i += 4) if (fr.d[i]) n++; return n; };
  const touchesEdge = (fr) => { for (let i = 0; i < F; i++) for (const [x, y] of [[i, 0], [0, i], [F - 1, i]]) if (fr.d[(y * F + x) * 4 + 3]) return true; return false; };
  let bad = 0, n = 0, diff = 0;
  for (let tier = 0; tier <= 6; tier++) {
    const [c] = SB.Debug.spawnTier(tier, 1);
    for (const s of CX.SLOTS) for (const e of s.list) for (const stage of [0, 3]) {
      c.genome.cx = { v: 1, pat: 0, eye: 0, acc: 0, pal: 0, size: 0, voice: 0, f: 0.5 };
      c.genome.cx[s.id] = e.i; c.stage = stage;
      if (s.id === "pal" && e.i === 1) c.genome.cx.f = 0.01;
      c.look = SB.Genome.look(c.genome);
      try {
        const sh = SB.Pixel.paint(c);
        if (sh.frames.some((f, i) => i !== SB.Pixel.FR.dot && opaque(f) < 30) || sh.frames.some(touchesEdge)) { bad++; console.log("     cut/empty: tier " + tier + " " + s.id + " " + e[0] + " stage " + stage); }
        if (e.i > 0 && s.id !== "voice") { c.genome.cx[s.id] = 0; c.look = SB.Genome.look(c.genome); const plain = SB.Pixel.paint(c); if (!plain.frames[0].d.every((v, i) => v === sh.frames[0].d[i])) diff++; }
      } catch (er) { bad++; console.log(er.stack); }
      n++;
    }
    c.alive = false; c.gone = true;
  }
  check("all " + n + " trait sprites paint whole and uncut", bad === 0, bad + " bad");
  check("every visible trait changes how the smol looks", diff > 0 && diff >= (CX.SLOTS.reduce((a, s) => a + (s.id === "voice" ? 0 : s.list.length - 1), 0) * 7 * 2) * 0.9, diff + " differ");
  // 500 random rolls at random tiers
  let bad2 = 0;
  for (let i = 0; i < 500; i++) {
    const g = SB.Genome.random(SB.rng(9000 + i));
    for (const k of SB.Genome.EVO_GENES) g.genes[k] = SB.rng(i * 13 + k.length)();
    g.cx = CX.roll(SB.rng(i + 1), { pat: 3, eye: 3, acc: 3, pal: 3, size: 3 });
    const c = SB.Game.spawnSmol(game, { genome: g, age: 600 });
    try { const p = SB.Pixel.paint(c); if (p.frames.some((f, j) => j !== SB.Pixel.FR.dot && opaque(f) < 30) || p.frames.some(touchesEdge)) bad2++; } catch (e) { bad2++; console.log(e.stack); }
    c.alive = false; c.gone = true;
  }
  check("500 lucky random smols all paint", bad2 === 0, bad2 + " bad");
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
