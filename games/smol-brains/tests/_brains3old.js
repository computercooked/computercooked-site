// What the game did BEFORE round 3's brain, gene and chemistry changes, as a repeatable script.
// tests/brains3.old.json holds what this returned on the old code (branch next-435); brains3.test.js runs it
// again on today's code and the two must match exactly: old genomes, old brains and old bodies behave the same.
"use strict";
module.exports = function scenario(ctx) {
  const SB = ctx.SB, G = SB.Genome, B = SB.Brain, Chem = SB.Chem, out = {};
  const arr = (a) => Array.prototype.slice.call(a);
  // genomes and codes
  out.codes = [1, 2, 3, 4, 5, 6].map((s) => G.encode(G.random(SB.rng(s))));
  out.grump = G.encode(G.random(SB.rng(7), { species: "grump" }));
  out.tiers = [3, 6].map((t) => G.encode(G.forTier(SB.rng(40 + t), t)));
  out.round = out.codes.map((c) => G.encode(G.decode(c)) === c);
  // breeding from founders and from decoded (saved) genomes
  out.cross = [[1, 2, 99], [3, 4, 5], [5, 6, 1234]].map((t) => {
    const a = G.decode(out.codes[t[0] - 1]), b = G.decode(out.codes[t[1] - 1]), r = SB.rng(t[2]);
    const kid = G.cross(a, b, r, { arms: 0.5, cortex: 0.3 }, null);
    return { code: G.encode(kid), next: r(), notes: kid.mutated.slice() };
  });
  // brains: make, think, learn, save, load
  function ctxOf(r) {
    const d = []; for (let i = 0; i < SB.N_DRIVES; i++) d.push(r() < 0.4 ? r() : r() * 0.2);
    return { drives: d, noun: r.int(SB.N_NOUNS + 1) - 1, heardVerb: r() < 0.2 ? r.int(12) : -1, heardName: r() < 0.1, near: r() < 0.5, holding: r() < 0.2, dark: r() < 0.3, knows: r() < 0.2, friends: r() < 0.5, rain: r() < 0.2, home: r() < 0.4 };
  }
  function probes(b) {
    const r = SB.rng(31), o = [];
    for (let k = 0; k < 6; k++) { B.input(b, ctxOf(r)); o.push(arr(B.forward(b))); }
    return o;
  }
  out.brains = [G.decode(out.codes[2]), G.decode(out.tiers[0]), G.decode(out.tiers[1])].map((g) => {
    const b = B.create(g, SB.rng(5)), o = { sizes: arr(b.sizes).slice(1), nMem: b.nMem };
    o.q0 = probes(b);
    const r = SB.rng(17), acts = [];
    for (let k = 0; k < 120; k++) {
      B.input(b, ctxOf(r));
      const a = B.decide(b, r, null, null, 1);
      acts.push(a);
      if (k % 3 === 0) B.reinforce(b, r() * 2 - 1);
      if (k % 17 === 5) B.teach(b, Float32Array.from(b.x), a, r() < 0.5 ? 1 : -1, 2);
      if (k % 23 === 7) B.imitate(b, Float32Array.from(b.x), r.int(12), 0.15);
    }
    o.acts = acts; o.q1 = probes(b); o.iq = B.iqTest(b);
    o.saved = JSON.parse(JSON.stringify(B.serialize(b)));
    const b2 = B.deserialize(o.saved, g, SB.rng(1));
    o.q2 = probes(b2);
    B.input(b2, ctxOf(SB.rng(3)));
    o.best = B.best(b2, null);
    return o;
  });
  // chemistry: a body living through a fright, a bad meal and a cold night
  out.chem = [G.decode(out.codes[0]), G.decode(out.codes[3]), G.decode(out.grump)].map((g, gi) => {
    const c = Chem.create(g), r = SB.rng(70 + gi), snaps = [];
    for (let k = 0; k < 4000; k++) {
      const env = { temp: 0.5 + 0.45 * Math.sin(k / 300), dark: (k % 1200) > 800, asleep: (k % 1200) > 900, inBed: k % 2400 > 1200, moving: r() < 0.5, nearFriends: k % 500 < 250 ? 2 : 0, stage: k < 1000 ? 0 : 3, species: g.species };
      if (k > 2000) env.loveK = k % 700 < 400 ? 0.8 : 0;
      if (k === 300) Chem.apply(c, { fear: 0.9, pain: 0.7 });
      if (k === 900) Chem.apply(c, { toxin: 0.6, antigen: 0.3 });
      if (k === 1500) Chem.apply(c, { medicine: 0.5, hunger: -0.5, glucose: 0.4 });
      if (k === 2600) Chem.apply(c, { hunger: 0.6, anger: 0.8, reward: 0.9 });
      Chem.tick(c, 0.1, env, g);
      if (k % 500 === 499) snaps.push(JSON.parse(JSON.stringify(c)));
    }
    return snaps;
  });
  return out;
};
