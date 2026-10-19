/* smol brains — brain + genome tests. Run: node games/smol-brains/tests/brain.test.js */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const JS = path.join(__dirname, "..", "play", "js");
const ctx = { console, Math, Float32Array, Int8Array, Uint8Array, Date, JSON, Error, Object, Array, String, Number };
ctx.window = ctx;
vm.createContext(ctx);
for (const f of ["core.js", "genome.js", "brain.js"]) {
  vm.runInContext(fs.readFileSync(path.join(JS, f), "utf8"), ctx, { filename: f });
}
const SB = ctx.SB;
const { D, N, V, IN } = SB;

let failed = 0;
function check(name, ok, info) {
  console.log((ok ? "  ok   " : "  FAIL ") + name + (info ? "  (" + info + ")" : ""));
  if (!ok) failed++;
}
function argmax(q) { let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; return b; }

/* ---- 1. learning from scratch in a toy world ---- */
console.log("1. learning from reward (no instincts)");
{
  const tasks = [
    { drive: D.hunger, noun: N.food, verb: V.eat },
    { drive: D.bored, noun: N.ball, verb: V.play },
    { drive: D.lonely, noun: N.smol, verb: V.talk }
  ];
  const nouns = [N.food, N.ball, N.smol, N.toy];
  const drives = new Float32Array(12);
  function freshBrain(seed) {
    const rng = SB.rng(seed);
    const g = SB.Genome.random(rng, { species: "smol" });
    g.instincts = [];
    g.genes.learnRate = 0.5; g.genes.curiosity = 0.5; g.genes.hidden = 0.3;
    return { g, rng, b: SB.Brain.create(g, rng) };
  }
  function situation(b, r, task) {
    for (let i = 0; i < 12; i++) drives[i] = r() * 0.5;
    let noun;
    if (task) { drives[task.drive] = 0.7 + r() * 0.3; noun = task.noun; }
    else {
      noun = r.pick(nouns);
      if (r() < 0.6) { const t = r.pick(tasks); drives[t.drive] = 0.7 + r() * 0.3; if (r() < 0.7) noun = t.noun; }
    }
    SB.Brain.input(b, { drives, noun, heardVerb: -1, heardName: false, near: true, holding: false, dark: false });
  }
  function reward(b, verb) {
    for (const t of tasks) if (b.x[IN.DRIVE0 + t.drive] > 0.6 && b.x[IN.NOUN0 + t.noun] === 1 && verb === t.verb) return 1;
    return -0.1;
  }
  function score(b) {
    const er = SB.rng(7); let ok = 0, n = 0;
    for (let k = 0; k < 60; k++) for (const t of tasks) { situation(b, er, t); if (SB.Brain.best(b) === t.verb) ok++; n++; }
    return ok / n;
  }
  const finals = [];
  let mx = 0;
  for (const seed of [42, 43, 44, 45, 46]) {
    const { b, rng } = freshBrain(seed);
    const curve = [];
    let hits = 0;
    for (let step = 1; step <= 400; step++) {
      situation(b, rng);
      const a = SB.Brain.decide(b, rng, null);
      const r = reward(b, a);
      if (r > 0) hits++;
      SB.Brain.reinforce(b, r);
      if (step % 50 === 0) curve.push(Math.round(score(b) * 100));
    }
    finals.push(score(b));
    for (const a of [b.w1, b.w2, b.b1, b.b2]) for (const v of a) mx = isFinite(v) ? Math.max(mx, Math.abs(v)) : Infinity;
    console.log("     seed " + seed + " greedy % every 50 decisions: " + curve.join(" ") + "   (rewarded " + hits + "/400)");
  }
  const mean = finals.reduce((a, c) => a + c, 0) / finals.length;
  check("greedy policy >= 80% after 400 decisions (mean of 5 brains)", mean >= 0.8, Math.round(mean * 100) + "%");
  check("weights finite and bounded", mx <= 4, "max |w| " + mx.toFixed(2));

  // few-shot: the player tickles every time it hugs the toy; how fast does P(hug) climb?
  const shotsTo50 = [];
  for (const seed of [1, 2, 3, 4, 5]) {
    const { b, rng } = freshBrain(seed * 7);
    drives.fill(0.1); drives[D.bored] = 0.9;
    const c = { drives, noun: N.toy, near: true };
    const pHug = () => {
      SB.Brain.input(b, c); SB.Brain.forward(b);
      let m = -9, s = 0; for (const q of b.q) m = Math.max(m, q);
      for (const q of b.q) s += Math.exp((q - m) / b.temp);
      return Math.exp((b.q[V.cuddle] - m) / b.temp) / s;
    };
    let t = 0;
    for (let k = 0; k < 300 && pHug() < 0.5; k++) {
      const a = SB.Brain.decide(b, rng, null);
      if (a === V.cuddle) { SB.Brain.reinforce(b, 1); t++; } else SB.Brain.reinforce(b, -0.02);
    }
    shotsTo50.push(t);
  }
  console.log("     tickles until P(hug toy) > 50%: " + shotsTo50.join(", "));
  check("a new habit forms after ~3-6 tickles", shotsTo50.every((t) => t >= 2 && t <= 6));

  // stability: long noisy life, rewards that make no sense
  const { b, rng } = freshBrain(9);
  for (let k = 0; k < 20000; k++) {
    for (let i = 0; i < 12; i++) drives[i] = rng();
    SB.Brain.input(b, { drives, noun: rng.int(16), heardVerb: rng() < 0.3 ? rng.int(12) : -1, near: rng() < 0.5, dark: rng() < 0.5 });
    SB.Brain.decide(b, rng, null);
    SB.Brain.reinforce(b, rng() < 0.5 ? 1 : -1);
    if (k % 3 === 0) SB.Brain.imitate(b, b.x, rng.int(12), 0.2);
  }
  let ok = true;
  for (const a of [b.w1, b.w2, b.b1, b.b2, b.att, b.q]) for (const v of a) if (!isFinite(v) || Math.abs(v) > 4) ok = false;
  check("stable over 20k noisy updates", ok);
}

/* ---- 2. eligibility traces ---- */
console.log("2. delayed credit via traces");
{
  const rng = SB.rng(3);
  const g = SB.Genome.random(rng, { species: "smol" }); g.instincts = [];
  const b = SB.Brain.create(g, rng);
  const d = new Float32Array(12); d[D.hunger] = 0.9;
  SB.Brain.input(b, { drives: d, noun: N.food, near: true });
  const x1 = Float32Array.from(b.x);
  const mask1 = Array(12).fill(false); mask1[V.eat] = true;
  const before = SB.Brain.forward(b)[V.eat];
  SB.Brain.decide(b, rng, mask1);
  const d2 = new Float32Array(12); d2[D.bored] = 0.9;
  SB.Brain.input(b, { drives: d2, noun: N.ball, near: true });
  const mask2 = Array(12).fill(false); mask2[V.idle] = true;
  SB.Brain.decide(b, rng, mask2);
  SB.Brain.reinforce(b, 1);
  b.x.set(x1);
  const after = SB.Brain.forward(b)[V.eat];
  check("first action's value went up", after > before + 0.03, before.toFixed(3) + " -> " + after.toFixed(3));
  check("viewer flashes recorded", b.dw2.some((v) => v > 0) && b.dw1.some((v) => v > 0));
}

/* ---- 3. serialization & genome ---- */
console.log("3. save / load and genetics");
{
  const rng = SB.rng(11);
  const g = SB.Genome.random(rng, { species: "smol" });
  const b = SB.Brain.create(g, rng);
  for (let k = 0; k < 200; k++) {
    const d = new Float32Array(12).map(() => rng());
    SB.Brain.input(b, { drives: d, noun: rng.int(16), near: rng() < 0.5 });
    SB.Brain.decide(b, rng); SB.Brain.reinforce(b, rng() * 2 - 1);
  }
  const json = JSON.parse(JSON.stringify(SB.Brain.serialize(b)));
  const b2 = SB.Brain.deserialize(json, g);
  const bc = SB.Brain.clone(b);
  let same = 0, tested = 0, cloneSame = 0;
  for (let k = 0; k < 500; k++) {
    const d = new Float32Array(12).map(() => rng());
    const ctx2 = { drives: d, noun: rng.int(16), heardVerb: rng() < 0.2 ? rng.int(12) : -1, near: rng() < 0.5, dark: rng() < 0.3 };
    SB.Brain.input(b, ctx2); SB.Brain.input(b2, ctx2); SB.Brain.input(bc, ctx2);
    const q1 = Array.from(SB.Brain.forward(b)), q2 = SB.Brain.forward(b2), q3 = SB.Brain.forward(bc);
    if (argmax(q3) === argmax(q1)) cloneSame++;
    const s = q1.slice().sort((a, c) => c - a);
    if (s[0] - s[1] < 0.02) continue; // near-tie: 8-bit quantisation may legitimately flip it
    tested++;
    if (argmax(q1) === argmax(q2)) same++;
  }
  check("serialize roundtrip keeps decisions", same === tested, same + "/" + tested + " (non-tied), " + JSON.stringify(json).length + " bytes JSON");
  check("clone is identical", cloneSame === 500);

  const code = SB.Genome.encode(g);
  const g2 = SB.Genome.decode(code);
  let maxd = 0;
  for (const k of SB.Genome.GENES) maxd = Math.max(maxd, Math.abs(g.genes[k] - g2.genes[k]));
  for (let i = 0; i < 12; i++) maxd = Math.max(maxd, Math.abs(g.driveW[i] - g2.driveW[i]) / 2);
  const instOk = g.instincts.length === g2.instincts.length && g.instincts.every((x, i) => x.drive === g2.instincts[i].drive && x.noun === g2.instincts[i].noun && x.verb === g2.instincts[i].verb && Math.abs(x.s - g2.instincts[i].s) < 0.004);
  check("genome encode/decode lossless", maxd < 0.004 && instOk && g2.species === g.species, code.length + " chars, max err " + maxd.toFixed(4));
  const gg = SB.Genome.random(rng, { species: "grump" });
  check("grump genome roundtrip", SB.Genome.decode(SB.Genome.encode(gg)).species === "grump");

  let bad = 0, muts = 0, sample = null;
  const pool = [g, gg];
  for (let k = 0; k < 8; k++) pool.push(SB.Genome.random(rng, { species: "smol" }));
  for (let k = 0; k < 200; k++) {
    const a = rng.pick(pool), c = rng.pick(pool);
    const ch = SB.Genome.cross(a, c, rng);
    for (const n of SB.Genome.GENES) { const v = ch.genes[n]; if (!(v >= 0 && v <= 1)) bad++; }
    for (const v of ch.driveW) if (!(v > 0 && v < 2.01)) bad++;
    for (const x of ch.instincts) if (!(x.drive >= 0 && x.drive < 12 && x.noun >= 0 && x.noun < 16 && x.verb >= 0 && x.verb < 12 && x.s >= 0 && x.s <= 1)) bad++;
    const lk = SB.Genome.look(ch);
    for (const key of ["hue", "hue2", "sat", "light", "eyes", "body", "size"]) if (!isFinite(lk[key])) bad++;
    if (lk.pattern > 3 || lk.ears > 4 || lk.tail > 3) bad++;
    const tr = SB.Genome.traits(ch);
    if (tr.length < 3 || tr.length > 5) bad++;
    SB.Brain.create(ch, rng); // must not throw
    if (ch.mutated.length) { muts++; if (!sample) sample = ch.mutated.join(", "); }
    pool.push(ch);
  }
  check("200 crosses produce valid genomes", bad === 0, muts + " had mutations, e.g. [" + sample + "]");
  console.log("     look: " + JSON.stringify(SB.Genome.look(g)));
  console.log("     traits: " + SB.Genome.traits(g).join(", ") + " | grump: " + SB.Genome.traits(gg).join(", "));
}

/* ---- 4. newborn IQ and speed ---- */
console.log("4. newborns and performance");
{
  const rng = SB.rng(99);
  const goods = [], bads = [];
  for (let k = 0; k < 20; k++) {
    const g = SB.Genome.random(rng, { species: "smol" });
    const b = SB.Brain.create(g, rng);
    const iq = SB.Brain.iqTest(b);
    goods.push(iq.good); bads.push(iq.bad);
  }
  const avg = goods.reduce((a, c) => a + c, 0) / goods.length;
  console.log("     newborn good: " + goods.map((v) => Math.round(v * 100)).join(" ") + "  avoid-bad avg " + Math.round(bads.reduce((a, c) => a + c, 0) / bads.length * 100) + "%");
  check("newborn iq good between 0.2 and 0.8 (avg)", avg >= 0.2 && avg <= 0.8, avg.toFixed(2));
  check("every newborn knows something but not everything", goods.every((v) => v > 0.1 && v < 0.95));

  // iqTest must not disturb viewer state
  const g = SB.Genome.random(rng, { species: "smol" });
  const b = SB.Brain.create(g, rng);
  SB.Brain.input(b, { drives: new Float32Array(12).fill(0.5), noun: N.food, near: true });
  SB.Brain.forward(b);
  const q0 = Array.from(b.q), h0 = Array.from(b.h), x0 = Array.from(b.x);
  SB.Brain.iqTest(b); SB.Brain.explain(b, V.eat);
  check("iqTest/explain leave x/h/q alone", q0.every((v, i) => v === b.q[i]) && h0.every((v, i) => v === b.h[i]) && x0.every((v, i) => v === b.x[i]));
  const ex = SB.Brain.explain(b, argmax(b.q));
  console.log("     explain: " + ex.map((e) => e.label + " " + e.v.toFixed(2)).join(" + ") + " -> " + SB.VERBS[argmax(b.q)]);

  const brains = [];
  for (let k = 0; k < 15; k++) {
    const gk = SB.Genome.random(rng, { species: "smol" }); gk.genes.hidden = 1; // worst case: 24 hidden
    const bk = SB.Brain.create(gk, rng);
    SB.Brain.input(bk, { drives: new Float32Array(12).fill(0.3), noun: 3, near: true });
    brains.push(bk);
  }
  for (let k = 0; k < 200; k++) for (const bk of brains) SB.Brain.forward(bk); // JIT warmup
  const t0 = process.hrtime.bigint();
  for (let k = 0; k < 1000; k++) for (const bk of brains) SB.Brain.forward(bk);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  check("15 brains x 1000 forwards < 50ms", ms < 50, ms.toFixed(1) + "ms");
  const t1 = process.hrtime.bigint();
  for (let k = 0; k < 1000; k++) for (const bk of brains) { SB.Brain.decide(bk, rng, null); SB.Brain.reinforce(bk, 0.5); }
  console.log("     15 x 1000 decide+reinforce: " + (Number(process.hrtime.bigint() - t1) / 1e6).toFixed(1) + "ms");
}

console.log(failed ? "\n" + failed + " FAILED" : "\nall passed");
process.exit(failed ? 1 : 0);
