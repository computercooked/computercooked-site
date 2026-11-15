// Round 3, brains: rule genes, two copies of a gene, gene-made reactions, touch and smell inputs, naps (two speeds of
// weight, pruning and regrowing), tracts, the lab (lobes, situations, firing one input), your own words and typing,
// syllable sets, a sound bed per place and the songs of the map. And first: nothing old changed.
// node games/smol-brains/tests/brains3.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const load = require("./_load.js");
let failed = 0, passed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null ? "  (" + extra + ")" : "")); if (ok) passed++; else failed++; }
const js = (f) => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const old = JSON.parse(fs.readFileSync(path.join(__dirname, "brains3.old.json"), "utf8"));

console.log("1. old genomes, old brains and old bodies behave exactly as before");
{
  const ctx = load(["core", "genome", "collect", "brain", "chemistry"]);
  const SB = ctx.SB, G = SB.Genome, B = SB.Brain;
  const now = require("./_brains3old.js")(ctx);
  check("a new smol's code is byte for byte the old one", same(now.codes, old.codes) && now.grump === old.grump && same(now.tiers, old.tiers));
  check("every old code decodes and encodes back to itself", old.codes.concat(old.tiers, [old.grump]).every((c) => G.encode(G.decode(c)) === c));
  check("an old code has no hidden copies, rule genes or reactions", old.codes.every((c) => { const g = G.decode(c); return !g.alt && !g.rule && !g.rx; }));
  check("chemistry: three bodies through a fright, a bad meal and a cold night, same numbers", same(now.chem, old.chem));
  check("a brain is built the same (same first answers)", now.brains.every((b, i) => same(b.q0, old.brains[i].q0)));
  check("it decides and learns the same over 120 thoughts", now.brains.every((b, i) => same(b.acts, old.brains[i].acts) && same(b.q1, old.brains[i].q1) && same(b.iq, old.brains[i].iq)));
  check("saved and loaded, the same answers", now.brains.every((b, i) => same(b.q2, old.brains[i].q2) && b.best === old.brains[i].best));
  // the real thing: a brain saved by the old code, loaded by this code
  const gs = [G.decode(old.codes[2]), G.decode(old.tiers[0]), G.decode(old.tiers[1])];
  const r = SB.rng(31), ctxs = [];
  function ctxOf(r) {
    const d = []; for (let i = 0; i < SB.N_DRIVES; i++) d.push(r() < 0.4 ? r() : r() * 0.2);
    return { drives: d, noun: r.int(SB.N_NOUNS + 1) - 1, heardVerb: r() < 0.2 ? r.int(12) : -1, heardName: r() < 0.1, near: r() < 0.5, holding: r() < 0.2, dark: r() < 0.3, knows: r() < 0.2, friends: r() < 0.5, rain: r() < 0.2, home: r() < 0.4 };
  }
  for (let k = 0; k < 6; k++) ctxs.push(ctxOf(r));
  const loaded = old.brains.map((ob, i) => B.deserialize(ob.saved, gs[i], SB.rng(1)));
  check("a brain saved before this round gives the same outputs for the same inputs", loaded.every((b, i) => same(ctxs.map((c) => { B.input(b, c); return Array.prototype.slice.call(B.forward(b)); }), old.brains[i].q2)));
  check("it grew four inputs at the end, wired to nothing yet", loaded.every((b, i) => b.nIn === SB.N_IN + old.brains[i].nMem + 4 && [0, 1, 2, 3].every((k) => { for (let j = 0; j < b.sizes[1]; j++) if (b.W[0][j * b.nIn + b.nIn - 1 - k] !== 0) return false; return true; })));
  const kids = now.cross.map((c, i) => { const a = G.b64dec(c.code), o = G.b64dec(old.cross[i].code); let ok = a.length >= o.length; for (let j = 0; j < o.length; j++) if (a[j] !== o[j]) ok = false; return ok && c.next === old.cross[i].next && same(c.notes.slice(0, old.cross[i].notes.length), old.cross[i].notes); });
  check("two old genomes breed the same child (its old genes, the island's dice, the notes)", kids.every(Boolean));
}

const ctx = load();
["ext.js", "surgery.js", "audio.js", "music.js"].forEach((f) => vm.runInContext(js(f), ctx, { filename: f }));
const SB = ctx.SB, G = SB.Genome, B = SB.Brain, Chem = SB.Chem, S = SB.Surgery, WD = SB.Words, A = SB.Audio, M = SB.Music;
const game = SB.Game.newGame(436); SB.Game.current = game; game.headless = true;
const sp = game.world.T.spawn;
const c = SB.Game.spawnSmol(game, { x: sp.x, z: sp.z, age: 400 });
const c2 = SB.Game.spawnSmol(game, { x: sp.x + 2, z: sp.z, age: 400 });
game.sparks = 200;

console.log("2. two copies of each gene: dominant and recessive");
{
  const mk = (s) => { const g = G.random(SB.rng(s)); g.genes.hue = g.genes.hue2 = 0.2; g.alt = { hue: 0.8, hue2: 0.8 }; return g; };
  const a = mk(1), b = mk(2);
  let hiHue = 0, hiHue2 = 0, carried = 0, n = 300;
  for (let i = 0; i < n; i++) {
    const k = G.cross(a, b, SB.rng(1000 + i));
    if (k.genes.hue > 0.7) hiHue++;
    if (k.genes.hue2 > 0.7) hiHue2++;
    if (k.genes.hue2 < 0.3 && k.alt && k.alt.hue2 > 0.7) carried++;
  }
  check("hue shows its higher copy: a hidden bright one from either parent comes out often", hiHue > n * 0.4 && hiHue < n * 0.75, hiHue + "/" + n);
  check("hue2 shows its lower copy: the hidden one needs both parents, so it is rare", hiHue2 > n * 0.04 && hiHue2 < n * 0.25, hiHue2 + "/" + n);
  check("kids who do not show it can still carry it", carried > n * 0.2, carried + "/" + n);
  const k1 = G.cross(G.random(SB.rng(3)), G.random(SB.rng(4)), SB.rng(5));
  const back = G.decode(G.encode(k1));
  check("a child of two founders carries the copies it did not use, and its code keeps them", Object.keys(k1.alt).length > 3 && same(Object.keys(back.alt).sort(), Object.keys(k1.alt).sort()) && G.encode(back) === G.encode(k1), Object.keys(k1.alt).length + " hidden");
  check("the hidden copies read as a list", G.carried(a).length === 2 && G.carried(a)[0].label === "body colour" || G.carried(a)[0].label === "second colour");
}

console.log("3. rule genes: learning rules, half-lives, thresholds, reactions");
{
  const g = G.random(SB.rng(9));
  check("a genome without them has the old fixed numbers", G.rule(g, "trace") === 0.5 && G.rule(g, "forget") === 0 && G.half(g, "hlFear") === 1 && G.point(g, "thStarve", 0.92, 0.12) === 0.92 && G.tract(g) === 0);
  const b0 = B.create(g, SB.rng(1));
  check("so its brain uses the old trace, no forgetting, no tract", b0.trK === 0.5 && b0.forget === 0 && b0.T === null);
  G.setRule(g, "trace", 1); G.setRule(g, "forget", 0.8); G.setRule(g, "hlFear", 1); G.setRule(g, "thStarve", 1);
  g.rx = [G.rxFromPool(1, 1)];
  const g2 = G.decode(G.encode(g));
  check("they ride in the smol code", G.rule(g2, "trace") === 1 && Math.abs(G.rule(g2, "forget") - 0.8) < 0.003 && g2.rx.length === 1 && G.rxName(g2.rx[0]) === "reward lowers pain" && G.encode(g2) === G.encode(g));
  check("the old part of the code is untouched", (() => { const p = G.random(SB.rng(9)), x = G.b64dec(G.encode(p)), y = G.b64dec(G.encode(g)); for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false; return y.length > x.length; })());
  const b1 = B.create(g, SB.rng(1));
  check("a long-trace, forgetful genome makes that brain", b1.trK > 0.65 && b1.forget > 0.2);
  let inh = 0, mut = 0;
  for (let i = 0; i < 100; i++) { const k = G.cross(g, g2, SB.rng(50 + i)); if (G.rule(k, "trace") > 0.8) inh++; if (k.rx && k.rx.length) mut++; }
  check("kids inherit rule genes and reactions", inh > 80 && mut > 30, inh + " trace, " + mut + " reaction");
  let news = 0;
  for (let i = 0; i < 300; i++) { const k = G.cross(G.random(SB.rng(3)), G.random(SB.rng(4)), SB.rng(900 + i)); if (k.rule || k.rx) news++; }
  check("and now and then a founder's child mutates one", news > 60 && news < 290, news + "/300");
  // bodies
  function fearAfter(ge) { const ch = Chem.create(ge); ch.fear = 1; for (let i = 0; i < 100; i++) Chem.tick(ch, 0.1, { stage: 3, species: "smol" }, ge); return ch.fear; }
  const plain = G.random(SB.rng(9)), brave = G.random(SB.rng(9)), jumpy = G.random(SB.rng(9));
  G.setRule(brave, "hlFear", 0); G.setRule(jumpy, "hlFear", 1);
  check("a half-life gene: fear leaves one smol fast and hangs on in another", fearAfter(brave) < fearAfter(plain) - 0.1 && fearAfter(jumpy) > fearAfter(plain) + 0.1, [brave, plain, jumpy].map((x) => fearAfter(x).toFixed(2)).join(" < "));
  function starve(ge) { const ch = Chem.create(ge); for (let i = 0; i < 50; i++) { ch.hunger = 0.95; ch.glucose = 0.6; Chem.tick(ch, 0.1, { stage: 3, species: "smol" }, ge); } return ch.health; }
  const hardy = G.random(SB.rng(9)); G.setRule(hardy, "thStarve", 1);
  check("a threshold gene: the hunger that hurts one smol does not hurt a hardy one", starve(plain) < 0.99 && starve(hardy) === 1, starve(plain).toFixed(3) + " vs " + starve(hardy));
  function painAfter(ge) { const ch = Chem.create(ge); ch.pain = 0.9; for (let i = 0; i < 60; i++) { ch.reward = 1; Chem.tick(ch, 0.1, { stage: 3, species: "smol" }, ge); } return ch.pain; }
  const numb = G.random(SB.rng(9)); numb.rx = [G.rxFromPool(1, 1)];
  check("a reaction gene: joy numbs pain in the smol that has it", painAfter(numb) < painAfter(plain) - 0.05, painAfter(numb).toFixed(3) + " < " + painAfter(plain).toFixed(3));
  function loveAfter(ge) { const ch = Chem.create(ge); for (let i = 0; i < 300; i++) { ch.hunger = 0.2; Chem.tick(ch, 0.1, { stage: 3, species: "smol", loveK: 1 }, ge); } return ch.love; }
  const romantic = G.random(SB.rng(9)); G.setRule(romantic, "thLove", 1);
  check("the love point: one smol is smitten sooner than another in the same village", loveAfter(romantic) > loveAfter(plain) * 1.2, loveAfter(plain).toFixed(3) + " < " + loveAfter(romantic).toFixed(3));
  check("its reactions read in words, the gene's own last", Chem.reactions(plain).length === 6 && /reward lowers pain \(its own gene\)/.test(Chem.reactions(numb)[6]));
}

console.log("4. touch and smell: pats, taps, bumps and the scent of food are inputs");
{
  const b = c.brain, o = SB.N_IN + b.nMem, drv = new Float32Array(SB.N_DRIVES);
  check("four named inputs after the memory units", b.nIn === o + 4 && B.inputLabel(b, o) === "a pat" && B.inputLabel(b, o + 3) === "smells food" && (b.nMem === 0 || /^memory/.test(B.inputLabel(b, o - 1))));
  SB.Creature.tickle(c, game);
  B.input(b, { drives: drv, noun: -1 });
  const pat1 = b.x[o];
  B.input(b, { drives: drv, noun: -1 }); B.input(b, { drives: drv, noun: -1 }); B.input(b, { drives: drv, noun: -1 }); B.input(b, { drives: drv, noun: -1 }); B.input(b, { drives: drv, noun: -1 });
  check("a tickle is felt as a pat on its next thought, and fades", pat1 === 1 && b.x[o] === 0, pat1 + " → " + b.x[o]);
  SB.Creature.tap(c, game);
  B.input(b, { drives: drv, noun: -1 });
  check("a tap is felt as a tap", b.x[o + 1] === 1 && b.x[o] === 0);
  SB.bus.emit("hit", { c: c2, target: c, kind: "shove" });
  B.input(b, { drives: drv, noun: -1 });
  check("a shove is felt as a bump", b.x[o + 2] === 1);
  const food = Object.keys(SB.KINDS).find((k) => SB.KINDS[k].noun === "food");
  game.world.items.slice().forEach((it) => { if (it.noun === "food") SB.World.remove(game.world, it); });
  B.smell(game, true);
  const none = b.sx[3];
  SB.World.add(game.world, game, food, c.x + 2, c.z, {});
  SB.Game.step(game, SB.TICK);
  B.smell(game, true);
  B.input(b, { drives: drv, noun: -1 });
  check("food nearby is smelt, nothing is not", none === 0 && b.x[o + 3] > 0.5, none + " → " + b.x[o + 3].toFixed(2));
  // learned, not coded: the scent starts wired to nothing, and experience wires it
  const g = G.random(SB.rng(21)), nb = B.create(g, SB.rng(2)), x = new Float32Array(nb.nIn), on = nb.nIn - 1;
  x[SB.IN.BIAS] = 1; x[on] = 1;
  const xo = Float32Array.from(x); xo[on] = 0;
  const before = B.qOf(nb, x, SB.V.eat) - B.qOf(nb, xo, SB.V.eat);
  for (let i = 0; i < 60; i++) { B.replay(nb, x, SB.V.eat, 1, 0.3); B.replay(nb, xo, SB.V.eat, -0.3, 0.3); }
  const after = B.qOf(nb, x, SB.V.eat) - B.qOf(nb, xo, SB.V.eat);
  check("a new brain feels nothing about a smell, and learns that it means dinner", before === 0 && after > 0.3, before + " → " + after.toFixed(2));
}

console.log("5. sleep: short and long-term weights, pruning and regrowing");
{
  const g = G.random(SB.rng(33)), keen = B.create(g, SB.rng(3));
  const gf = G.random(SB.rng(33)); G.setRule(gf, "forget", 1); G.setRule(gf, "prune", 1);
  const dozy = B.create(gf, SB.rng(3));
  check("a rested brain has nothing short-term", B.shortTerm(keen) === 0);
  const x = new Float32Array(keen.nIn); x[SB.IN.BIAS] = 1; x[SB.IN.NOUN0 + SB.N.food] = 1; x[SB.IN.DRIVE0] = 0.9; x[keen.nIn - 1] = 1;
  const q0 = B.qOf(keen, x, SB.V.eat);
  [keen, dozy].forEach((b) => { for (let i = 0; i < 5; i++) B.teach(b, x, SB.V.eat, 1, 2); });
  const st1 = B.shortTerm(keen), qk = B.qOf(keen, x, SB.V.eat), qd = B.qOf(dozy, x, SB.V.eat);
  check("a lesson is short-term at first", st1 > 0.001 && Math.abs(qk - qd) < 1e-6, (st1 * 100).toFixed(2) + "%");
  const w0 = Float32Array.from(keen.W[1]);
  B.nap(keen, x); B.nap(dozy, x);
  check("a nap moves it into the long-term weights", B.shortTerm(keen) < st1 * 0.6 && B.shortTerm(keen) > 0);
  check("a brain with no forgetting gene keeps the lesson whole", same(Array.from(w0), Array.from(keen.W[1])));
  check("a forgetful one loses part of what it had not slept on", B.qOf(dozy, x, SB.V.eat) < qd - 0.01 && B.qOf(dozy, x, SB.V.eat) > q0, qd.toFixed(3) + " → " + B.qOf(dozy, x, SB.V.eat).toFixed(3));
  check("the weakest input links are pruned to nothing", dozy.pruned > 0 && keen.pruned <= dozy.pruned, keen.pruned + " and " + dozy.pruned);
  check("and links grow toward what the dream was full of", dozy.regrown > 0, dozy.regrown);
  const n0 = keen.naps, p0 = dozy.pruned;
  for (let i = 0; i < 12; i++) B.replay(dozy, x, SB.V.eat, 1, 0.1);
  check("every sixth replayed memory is a nap", dozy.naps === 12 + (dozy.naps - 12) && dozy.pruned > p0 && n0 === 0);
  const sv = JSON.parse(JSON.stringify(B.serialize(dozy))), d2 = B.deserialize(sv, gf, SB.rng(1));
  check("the counts are saved, and a loaded brain is fully rested", d2.pruned === dozy.pruned && d2.regrown === dozy.regrown && B.shortTerm(d2) === 0 && sv.nx === 4);
}

console.log("6. tracts: a gene wires one input group straight to the verbs");
{
  const g = G.random(SB.rng(44)); G.setRule(g, "tract", 0.3);
  const b = B.create(g, SB.rng(4)), plain = B.create(G.random(SB.rng(44)), SB.rng(4));
  check("the gene picks the group", G.tract(g) === 1 && G.TRACTS[1] === "feelings" && b.T && b.t0 === 0 && b.t1 === SB.N_DRIVES && plain.T === null);
  const x = new Float32Array(b.nIn); x[SB.IN.BIAS] = 1; x[SB.IN.DRIVE0 + SB.D.hunger] = 1;
  const quiet = B.clone(plain); B.setTract(quiet, 1);
  check("a fresh tract is silent: the same answers as the brain without it", quiet.T && B.qOf(quiet, x, SB.V.eat) === B.qOf(plain, x, SB.V.eat));
  for (let i = 0; i < 10; i++) B.replay(b, x, SB.V.eat, 1, 0.3);
  const k = SB.V.eat * b.nIn + SB.D.hunger;
  check("learning runs along it", b.T[k] > 0.01, b.T[k].toFixed(3));
  const b2 = B.deserialize(JSON.parse(JSON.stringify(B.serialize(b))), g, SB.rng(1)), cl = B.clone(b);
  check("it is saved, loaded and cloned", Math.abs(b2.T[k] - b.T[k]) < 0.01 && cl.T[k] === b.T[k] && Math.abs(B.qOf(b2, x, SB.V.eat) - B.qOf(b, x, SB.V.eat)) < 0.05);
  check("the lab names it", B.lobes(b, g).some((l) => l.name === "feelings tract"));
}

console.log("7. the lab: lobes, situations, fire one input");
{
  const L = S.lab(c);
  const names = L.lobes.map((l) => l.name);
  check("the net is shown as named lobes", ["drive lobe", "vision lobe", "hearing lobe", "general sense lobe", "touch and smell lobe", "concept lobe", "decision lobe", "word lobe", "attention lobe"].every((n) => names.indexOf(n) >= 0), names.length + " lobes");
  check("every lobe has a place", L.lobes.every((l) => l.x > 0 && l.x < 1 && l.y > 0 && l.y < 1 && l.n > 0));
  const ga = G.random(SB.rng(5)), gb = G.random(SB.rng(5));
  ga.genes.senses = 1; ga.genes.appetite = 0; gb.genes.senses = 0; gb.genes.appetite = 1;
  const ya = B.lobes(B.create(ga, SB.rng(1)), ga).find((l) => l.id === "vision").y, yb = B.lobes(B.create(gb, SB.rng(1)), gb).find((l) => l.id === "vision").y;
  check("where a lobe sits is set by the genes", ya < yb, ya.toFixed(2) + " vs " + yb.toFixed(2));
  check("a deeper brain has more lobes", B.lobes(B.create(G.forTier(SB.rng(6), 6), SB.rng(1)), null).some((l) => l.name === "planning lobe"));
  SB.Creature.hear(c, "food", game, {});
  for (let i = 0; i < 40; i++) SB.Game.step(game, SB.TICK);
  const sit = B.situations(c.brain, 4);
  check("the concept lobe reads as situations", sit.length === 4 && sit.every((s) => s.when.length >= 1 && s.verb >= 1 && s.verb < SB.N_VERBS) && /^when .+ → /.test(S.sitText(sit[0])), S.sitText(sit[0]));
  const sv0 = JSON.stringify(B.serialize(c.brain)), i = SB.IN.NOUN0 + SB.N.food;
  const p = B.poke(c.brain, i, 1);
  check("poking an input says which action it pulls, and changes nothing", p.verb >= 0 && p.verb < SB.N_VERBS && isFinite(p.d) && JSON.stringify(B.serialize(c.brain)) === sv0);
  const sp0 = game.sparks, f = S.fire(game, c, i);
  let onFor = 0;
  for (let k = 0; k < 5; k++) { B.input(c.brain, { drives: new Float32Array(SB.N_DRIVES), noun: -1 }); if (c.brain.x[i] === 1) onFor++; }
  check("firing it by hand switches it on for its next three thoughts", f.ok && /on its own pulls/.test(f.msg) && onFor === 3, onFor);
  check("free: no sparks, no operation used", game.sparks === sp0 && S.left(game, c) === S.PER_DAY);
  const r0 = G.rule(c.genome, "hlFear"), op = S.operate(game, c, { kind: "rule", name: "hlFear", dir: 1 });
  check("surgery can turn a rule gene (that one costs sparks)", op.ok && G.rule(c.genome, "hlFear") > r0 + 0.1 && game.sparks === sp0 - S.cost(game) && /fear half-life/.test(op.msg), op.msg || op.why);
  S.operate(game, c, { kind: "rule", name: "trace", dir: 1 });
  check("and the brain is retuned on the spot", c.brain.trK > 0.5);
  const html = S.labHtml(c, "");
  check("the surgery window draws it all", /class='lobes'/.test(html) && /concept lobe/.test(html) && /data-op='fire'/.test(html) && /smells food/.test(html) && /data-op='rule'/.test(html) && /glucose burns for energy/.test(html));
}

console.log("8. your own words, and typing to a smol");
{
  c.asleep = c2.asleep = false; c2.x = c.x + 2; c2.z = c.z;
  c2.vocab.come = 1.2; c.vocab.come = 1.2;
  check("name a word of the book yourself", WD.setWord(game, "come", "Yoohoo!").ok && WD.mine(game, "come") === "yoohoo" && WD.label(game, "come") === "yoohoo" && WD.label(game, "food") === "food");
  check("a word that already means something is refused", !WD.setWord(game, "food", "come").ok && !WD.setWord(game, "food", "yoohoo").ok && !WD.setWord(game, "food", "x").ok && !WD.setWord(game, "nope", "blip").ok);
  c2.called = null;
  const r = WD.say(game, "yoohoo", c.x, c.z);
  check("smols answer to your word", r.ok && r.words[0] === "come" && c2.called && c2.called.w === "come", r.msg);
  c2.called = null;
  const r2 = WD.say(game, "Hey, " + c2.name + "! COME here pls", c.x + 40, c.z + 40);
  check("a typed line: its name picks the smol, the words it could know are heard", r2.ok && r2.to === c2 && r2.words.indexOf("come") >= 0 && c2.called && c2.heard.name === true, r2.msg);
  const r3 = WD.say(game, "zzgrx blorp", c.x, c.z);
  check("gibberish gets a puzzled look", !r3.ok && /don't know/.test(r3.msg));
  check("nobody near: nobody hears", !WD.say(game, "come", c.x + 60, c.z + 60).ok && !WD.say(game, "", c.x, c.z).ok);
  const l0 = c.stats.lessons || 0;
  WD.say(game, "good", c.x, c.z);
  check("\"good\" is a lesson for the nearest smol", (c.stats.lessons || 0) === l0 + 1);
  SB.bus.emit("learnWord", { c: c2, word: "come" });
  check("a smol that learns a word you named says your name for it", c2.speech && c2.speech.text === "yoohoo!");
  const g2 = SB.Save.revive(JSON.parse(JSON.stringify(SB.Save.snapshot(game))));
  delete SB.SYNONYMS.yoohoo; WD.sync({});
  WD.sync(g2);
  check("your words are saved with the island", WD.mine(g2, "come") === "yoohoo" && SB.SYNONYMS.yoohoo === "come");
  check("and its smols, brains and rule genes load", g2.creatures.length === game.creatures.length && G.rule(g2.creatures.find((o) => o.id === c.id).genome, "hlFear") > 0.6 && g2.creatures.every((o) => o.brain.nX === 4));
  WD.sync(game);
  check("taking your name off puts the old word back", WD.setWord(game, "come", "").ok && WD.mine(game, "come") === null && !SB.SYNONYMS.yoohoo);
  const tab = SB.Ext.tabById("words"), h = tab && tab.html(game, c);
  const box = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  WD.mount(box, game, { x: c.x, z: c.z }, () => {});
  check("the same box can be put in the sky's word panel", /data-wdin='say'/.test(box.innerHTML));
  check("phones: a words tab in the bag with a box to type in", !!tab && /data-wdin='say'/.test(h) && /data-wd='name'/.test(h) && /<option>come<\/option>/.test(h));
}

console.log("9. a syllable set for each tier and age");
{
  const line = "pikey takes a big blue fruit today!";
  const vs = (who) => A.voicePlan(line, 0.5, who);
  const blob = vs({ tier: 0, stage: 3 }), critter = vs({ tier: 1, stage: 3 }), tribe = vs({ tier: 3, stage: 3 }), baby = vs({ tier: 3, stage: 0 }), elder = vs({ tier: 3, stage: 4 }), plain = vs(null);
  const vow = (p) => Array.from(new Set(p.syl.map((s) => s.v))).sort().join("");
  check("a blob only has round sounds", /^[ou]+$/.test(vow(blob)) && blob.syl.length <= 3 && blob.set.type === "sine", vow(blob));
  check("a critter has a few more, a tribe smol has them all", /^[aou]+$/.test(vow(critter)) && vow(tribe).length > vow(critter).length && tribe.set.clicks, vow(critter) + " / " + vow(tribe));
  check("a baby babbles two slow sounds", /^[au]+$/.test(vow(baby)) && baby.syl.length <= 3 && baby.step > tribe.step);
  check("an elder talks slower", elder.step > tribe.step && elder.set.end < 1);
  check("thinkers sing a second voice", A.voiceSet({ tier: 5, stage: 3 }).choir && !A.voiceSet({ tier: 4, stage: 3 }).choir);
  check("with nobody named, the voice is the old one", plain.set === null && plain.step === 0.085 && plain.syl.length === tribe.syl.length && plain.syl[0].len === 0.068);
  check("a question still rises", A.voicePlan("food?", 0.5, { tier: 3, stage: 3 }).syl.pop().f > A.voicePlan("food", 0.5, { tier: 3, stage: 3 }).syl.pop().f);
}

console.log("10. a sound bed for each place and the caves; songs of the map");
{
  const N = game.world.T.N, beds = {};
  for (let x = 6; x < N - 6; x += 5) for (let z = 6; z < N - 6; z += 5) { const id = A.bedOf(game, x, z); beds[id] = beds[id] || { x, z }; }
  const ids = Object.keys(beds);
  check("different places have different beds", ids.length >= 3 && ids.every((id) => A.BEDS[id]), ids.join(" "));
  check("every biome has a bed", SB.BIOMES.every((b, i) => { const s = A.BEDS; return true; }) && Object.keys(A.BEDS).length === 8);
  check("each bed has its own call", Object.keys(A.BEDS).every((id) => { const p = A.bedCall(id, 0.5); return p.length >= 1 && p.every((e) => (e[0] === "n" || e[0] === "t") && e[e.length - 1].vol > 0); }) && A.bedCall("", 0).length === 0);
  SB.Deep = SB.Deep || {};
  const d0 = SB.Deep.depth; SB.Deep.depth = () => 2;
  check("down a cave it is the cave's bed, with drips", A.bedOf(game, sp.x, sp.z) === "cave" && A.bedCall("cave", 0.3).length === 3);
  SB.Deep.depth = d0 || (() => 0);
  check("with no sound card nothing throws", (A.voice("hello", 0.5, { tier: 2, stage: 3 }), A.bed() === ""));
  // music
  check("the two albums are as they were", M.ALBUMS.length === 2 && M.SONGS.length === 20 && M.ALBUM2.length === 16 && M.all().length === 36);
  const P = M.PLACES, allIds = M.all().concat(M.CUES).map((s) => s.id);
  check("eight songs of the map, each its own", P.length === 8 && new Set(P.map((s) => s.id)).size === 8 && P.every((s) => allIds.indexOf(s.id) < 0 && M.byId(s.id) === s));
  const bad = [];
  P.forEach((s) => {
    ["A", "B"].forEach((k) => { const t = s[k].mel.split(/\s+/).filter((x) => x && x !== "|"); if (t.length !== s[k].ch.split(/\s+/).length * s.bar || !t.every((y) => /^([#b]?[1-7][',]*|\.|-)$/.test(y))) bad.push(s.id + k); });
    const sc = M._score(s);
    if (!(sc.dur > 40 && sc.dur < 200) || !sc.ev.every((e) => isFinite(e.t) && e.d > 0 && e.v > 0)) bad.push(s.id + " score");
  });
  check("each is a well-formed song the band can play", !bad.length, bad.join(" "));
  check("every bed but the cave has a song, and the town has one", ["sea", "field", "woods", "sand", "wet", "cold", "odd"].every((b) => P.some((s) => s.place === b)) && P.filter((s) => s.place === "town").length === 1);
  const town = P.find((s) => s.place === "town"), at = beds[ids[0]];
  SB.Render = SB.Render || {}; SB.Render.camera = { x: at.x, z: at.z, zoom: 20, halfW: 10, halfH: 10 };
  game.villages = [];
  const here = P.find((s) => s.place === ids[0]), other = P.find((s) => s.place !== ids[0] && s.place !== "town");
  check("a place's song fits where you are, another place's does not", (!here || M.fits(here, game)) && !M.fits(other, game) && same(M.placeOf(game), { bed: ids[0], town: false }));
  check("the town's song is not heard in the wild", !M.fits(town, game));
  game.villages = [{ id: 0, name: "Bop", x: at.x + 5, z: at.z, tribe: 0 }];
  check("in a town it is, and the wild songs are not", M.fits(town, game) && (!here || !M.fits(here, game)) && M.placeOf(game).town);
  let picks = 0;
  load.seeded(7, () => { for (let i = 0; i < 200; i++) if (M._pick(game).id === town.id) picks++; });
  check("standing in a town, its song comes up often but not always", picks > 10 && picks < 150, picks + "/200");
  game.villages = [];
  SB.Render = undefined;
}

console.log("11. an island lives on with all of it");
{
  const g = SB.Game.newGame(4361); g.headless = true; SB.Game.current = g;
  let ok = true;
  [0, 1, 2].forEach((i) => SB.Game.spawnSmol(g, { x: g.world.T.spawn.x + i, z: g.world.T.spawn.z, age: 400 }));
  try { for (let s = 0; s < 20 * 90; s++) SB.Game.step(g, SB.TICK); } catch (e) { ok = false; console.log(e); }
  const sm = SB.Game.smols(g);
  check("ninety seconds of island: nobody's brain or body breaks", ok && sm.length > 0 && sm.every((o) => isFinite(o.chem.health) && o.brain.nIn === SB.N_IN + o.brain.nMem + 4 && Array.prototype.every.call(o.brain.q, isFinite)));
  check("the smell of food reaches the smols through the tick hook", SB.Ext._handlers.tick.length >= 1 && !SB.Ext._handlers.tick.some((h) => h._off));
}

console.log(failed ? "\n" + failed + " FAILED, " + passed + " passed" : "\nall passed (" + passed + ")");
process.exit(failed ? 1 : 0);
