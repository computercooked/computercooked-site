/* smol brains 2 — brain + genome tests. Run: node games/smol-brains/tests/brain.test.js */
"use strict";
const load = require("./_load.js");
const ctx = load(["core", "genome", "brain", "chemistry", "lang", "ideas"]);
const SB = ctx.SB;
const { D, N, V, IN } = SB;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}
function argmax(q, n) { let b = 0; for (let i = 1; i < (n || q.length); i++) if (q[i] > q[b]) b = i; return b; }

/* ---- 1. learning from reward, shallow and deep brains ---- */
console.log("1. learning from reward (no instincts)");
const tasks = [
  { drive: D.hunger, noun: N.food, verb: V.eat },
  { drive: D.bored, noun: N.ball, verb: V.play },
  { drive: D.lonely, noun: N.smol, verb: V.talk },
  { drive: D.cold, noun: N.fire, verb: V.approach }
];
function fresh(seed, deep) {
  const rng = SB.rng(seed);
  const g = SB.Genome.random(rng, { species: "smol" });
  g.instincts = [];
  g.genes.learnRate = 0.5; g.genes.curiosity = 0.5; g.genes.hidden = 0.3;
  if (deep) { g.genes.cortex = 0.8; g.genes.layers = 0.9; g.genes.recall = 0.6; }
  return { g, rng, b: SB.Brain.create(g, rng) };
}
function trainOn(b, rng, trials) {
  for (let t = 0; t < trials; t++) {
    const task = tasks[t % tasks.length];
    const drives = new Float32Array(12);
    for (let i = 0; i < 12; i++) drives[i] = rng() * 0.2;
    drives[task.drive] = 0.8 + rng() * 0.2;
    SB.Brain.input(b, { drives, noun: task.noun, near: true });
    const mask = new Array(SB.N_VERBS).fill(false); for (let i = 0; i < 12; i++) mask[i] = true;
    const a = SB.Brain.decide(b, rng, mask);
    SB.Brain.reinforce(b, a === task.verb ? 0.8 : -0.05);
  }
}
function accuracy(b) {
  let ok = 0;
  for (const task of tasks) {
    const drives = new Float32Array(12); drives[task.drive] = 0.9;
    SB.Brain.input(b, { drives, noun: task.noun, near: true });
    const q = SB.Brain.forward(b);
    if (argmax(q, 12) === task.verb) ok++;
  }
  return ok / tasks.length;
}
for (const deep of [false, true]) {
  let accs = [];
  for (let s = 1; s <= 4; s++) { const f = fresh(s * 17, deep); trainOn(f.b, f.rng, 1200); accs.push(accuracy(f.b)); }
  const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
  const f0 = fresh(5, deep);
  check((deep ? "deep" : "shallow") + " brain learns 4 drive tasks from reward", mean >= 0.75, "mean accuracy " + mean.toFixed(2) + ", layers " + f0.b.hidden.join("-") + (f0.b.nMem ? " +" + f0.b.nMem + " mem" : ""));
}

/* ---- 2. instincts, genome shape, tiers ---- */
console.log("2. genome");
{
  const rng = SB.rng(9);
  const g = SB.Genome.random(rng, { species: "smol" });
  check("a random smol is a blob", SB.Genome.tierOf(g) === 0, "tier " + SB.Genome.tierOf(g));
  const need = SB.Genome.TIER_NEEDS;
  const g2 = JSON.parse(JSON.stringify(g));
  for (let t = 1; t <= 6; t++) {
    for (const k in need[t]) if (k !== "neurons" && k !== "layers") g2.genes[k] = need[t][k] + 0.02;
    g2.genes.hidden = 1; g2.genes.cortex = t >= 5 ? 1 : 0.3 + t * 0.12; g2.genes.layers = t >= 6 ? 0.85 : t >= 4 ? 0.5 : 0.1;
    check("genes for tier " + t + " (" + SB.TIERS[t].name + ") give that tier", SB.Genome.tierOf(g2) === t, "got " + SB.Genome.tierOf(g2) + ", neurons " + SB.Genome.neurons(g2));
  }
  // crossover stays in range; echoes push genes up
  let base = 0, echoed = 0;
  for (let i = 0; i < 300; i++) {
    const r = SB.rng(1000 + i);
    const a = SB.Genome.random(r, {}), b = SB.Genome.random(r, {});
    const k0 = SB.Genome.cross(a, b, SB.rng(i + 1));
    const k1 = SB.Genome.cross(a, b, SB.rng(i + 1), { limbs: 1, arms: 1 });
    base += k0.genes.limbs; echoed += k1.genes.limbs;
    for (const n of SB.Genome.GENES) if (!(k1.genes[n] >= 0 && k1.genes[n] <= 1)) { check("genes in range", false, n); break; }
  }
  check("parents who walk a lot have longer-legged kids (echo)", echoed / 300 > base / 300 + 0.04, "limbs " + (base / 300).toFixed(3) + " -> " + (echoed / 300).toFixed(3));
  // codec v2 round trip
  const code = SB.Genome.encode(g);
  const back = SB.Genome.decode(code);
  let maxErr = 0; for (const n of SB.Genome.GENES) maxErr = Math.max(maxErr, Math.abs(back.genes[n] - g.genes[n]));
  check("genome code round trip", maxErr < 0.003 && back.instincts.length === g.instincts.length, "max err " + maxErr.toFixed(4));
  // a v1 code (38 genes, v1 noun numbering) still decodes
  const v1 = [1, 0, 0, 3, 38];
  for (let i = 0; i < 38; i++) v1.push((i * 37) % 256);
  for (let d = 0; d < 12; d++) v1.push(128);
  v1.push(2, SB.D.hunger, 3, SB.V.eat, 200, SB.D.tired, 8 /* v1 "bed" */, SB.V.sleep, 180);
  const dv1 = SB.Genome.decode(SB.Genome.b64enc(v1));
  check("v1 genome codes decode, nouns remapped (bed -> shelter)", dv1.gen === 3 && dv1.instincts.length === 2 && dv1.instincts[1].noun === N.shelter && dv1.genes.limbs != null, "instinct nouns " + dv1.instincts.map(x => SB.NOUNS[x.noun]).join(","));
}

/* ---- 3. save / load / v1 migration ---- */
console.log("3. brain save and migration");
{
  const f = fresh(77, true);
  trainOn(f.b, f.rng, 400);
  const ser = JSON.parse(JSON.stringify(SB.Brain.serialize(f.b)));
  const b2 = SB.Brain.deserialize(ser, f.g, f.rng);
  let maxd = 0;
  for (const task of tasks) {
    const drives = new Float32Array(12); drives[task.drive] = 0.9;
    SB.Brain.input(f.b, { drives, noun: task.noun, near: true }); const q1 = Array.from(SB.Brain.forward(f.b));
    SB.Brain.input(b2, { drives, noun: task.noun, near: true }); const q2 = Array.from(SB.Brain.forward(b2));
    for (let i = 0; i < q1.length; i++) maxd = Math.max(maxd, Math.abs(q1[i] - q2[i]));
  }
  check("v2 brain round trip keeps its answers", maxd < 0.08, "max q diff " + maxd.toFixed(3));

  // build a v1-format brain (45 inputs -> nHid -> 12) from a trained 1-layer v2 brain, then load it back
  const s = fresh(31, false);
  trainOn(s.b, s.rng, 900);
  const nHid = s.b.hidden[0], NI2 = s.b.nIn;
  const V1N = ["hand", "smol", "grump", "food", "mushroom", "toy", "ball", "music", "bed", "medicine", "snackbox", "egg", "computer", "bug", "plant", "gadget"];
  const map = []; // v1 input -> v2 input
  for (let i = 0; i < 45; i++) {
    if (i < 12) map.push(i);
    else if (i < 28) { const n = V1N[i - 12]; map.push(SB.N[n] != null ? IN.NOUN0 + SB.N[n] : -1); }
    else if (i < 40) map.push(IN.HEARD0 + i - 28);
    else map.push([IN.HEARDNOUN, IN.NEAR, IN.HOLDING, IN.DARK, IN.BIAS][i - 40]);
  }
  const w1 = new Float32Array(nHid * 45), w2 = new Float32Array(12 * nHid);
  for (let j = 0; j < nHid; j++) for (let i = 0; i < 45; i++) if (map[i] >= 0) w1[j * 45 + i] = s.b.W[0][j * NI2 + map[i]];
  for (let k = 0; k < 12; k++) for (let j = 0; j < nHid; j++) w2[k * nHid + j] = s.b.W[1][k * nHid + j];
  function pack(arr) { let mx = 0; for (const v of arr) mx = Math.max(mx, Math.abs(v)); const sc = mx > 0 ? mx / 127 : 1; const bytes = new Uint8Array(arr.length); for (let i = 0; i < arr.length; i++) bytes[i] = Math.round(arr[i] / sc) & 255; return { s: sc, d: SB.Genome.b64enc(bytes) }; }
  const v1brain = { v: 1, nHid, lr: 0.2, temp: 0.2, attnLr: 0.05, updates: 50, w1: pack(w1), b1: pack(s.b.Bs[0]), w2: pack(w2), b2: pack(s.b.Bs[1].subarray(0, 12)), att: pack(new Float32Array(16 * 13)), cmd: pack(new Float32Array(144)), nv: pack(new Float32Array(16 * 12)) };
  const mig = SB.Brain.deserialize(JSON.parse(JSON.stringify(v1brain)), s.g, SB.rng(1));
  let agree = 0;
  for (const task of tasks.slice(0, 3)) { // fire didn't exist in v1
    const drives = new Float32Array(12); drives[task.drive] = 0.9;
    SB.Brain.input(s.b, { drives, noun: task.noun, near: true }); const a1 = argmax(SB.Brain.forward(s.b), 12);
    SB.Brain.input(mig, { drives, noun: task.noun, near: true }); const a2 = argmax(SB.Brain.forward(mig), 12);
    if (a1 === a2) agree++;
  }
  check("a v1 brain loads into v2 and makes the same choices", agree === 3, agree + "/3 agree, layers " + mig.hidden.join("-") + ", outputs " + mig.nOut);
}

/* ---- 4. memory units ---- */
console.log("4. working memory");
{
  const f = fresh(5, true);
  check("a recall gene gives memory units", f.b.nMem > 0, f.b.nMem + " units");
  const before = Array.from(f.b.mem);
  SB.Brain.input(f.b, { drives: new Float32Array(12).fill(0.5), noun: N.food, near: true });
  SB.Brain.decide(f.b, f.rng, null);
  check("thinking leaves an echo in memory", Array.from(f.b.mem).some((v, i) => Math.abs(v - before[i]) > 1e-4));
  check("the explainer names inputs", SB.Brain.explain(f.b, SB.V.eat).every(e => typeof e.label === "string"));
}

/* ---- 5. iq ---- */
console.log("5. iq test");
{
  const rng = SB.rng(4), g = SB.Genome.random(rng, {});
  g.instincts = SB.GOOD.map(r => ({ drive: SB.D[r.drive], noun: SB.N[r.noun], verb: SB.V[r.verb], s: 1 }));
  g.genes.instinctStrength = 1;
  const b = SB.Brain.create(g, rng);
  const t = SB.Brain.iqTest(b);
  const g0 = JSON.parse(JSON.stringify(g)); g0.instincts = [];
  const t0 = SB.Brain.iqTest(SB.Brain.create(g0, SB.rng(4)));
  check("strong instincts score higher on the iq test", t.good > t0.good + 0.2, "good " + t.good.toFixed(2) + " vs " + t0.good.toFixed(2));
}

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
