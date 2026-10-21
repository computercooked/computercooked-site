/* smol brains 2 — genome.js
   Genes (0..1 floats), drive-reward weights and instincts. Random genomes, crossover, mutation with
   human-readable notes, appearance, the evolution tier, traits, and a compact string codec (v1 codes still decode).
   The twist: "echoes". What parents DO during their lives (walk, carry, talk, build, think, swim) nudges the
   genes of their kids in that direction, so the way you raise smols steers how their species evolves.
   Instincts are stored as indices: {drive: SB.D[..], noun: SB.N[..], verb: SB.V[..], s: 0..1}. */
(function () {
  "use strict";
  var SB = window.SB;
  var G = (SB.Genome = {});

  // Gene order is the encode() byte layout. Append only (the first 38 are v1's).
  var GENES = [
    ["hue", "body colour"], ["hue2", "second colour"], ["sat", "colour strength"], ["light", "brightness"],
    ["pattern", "pattern"], ["ears", "ears"], ["eyes", "eye size"], ["tail", "tail"], ["body", "body shape"],
    ["size", "size"], ["cheeks", "cheeks"], ["antenna", "antenna"], ["spots", "spot layout"],
    ["hidden", "brain size"], ["learnRate", "learning speed"], ["curiosity", "curiosity"], ["attnLearn", "attention learning"],
    ["memory", "memory"], ["instinctStrength", "instinct strength"],
    ["bravery", "bravery"], ["sociability", "sociability"], ["playfulness", "playfulness"], ["grumpiness", "grumpiness"],
    ["obedience", "obedience"], ["chattiness", "chattiness"], ["appetite", "appetite"], ["affection", "affection"],
    ["sleepiness", "sleepiness"],
    ["metabolism", "metabolism"], ["immunity", "immunity"], ["lifespan", "lifespan"], ["fertility", "fertility"],
    ["voice", "voice pitch"], ["coldTolerance", "cold tolerance"], ["heatTolerance", "heat tolerance"],
    ["speed", "walk speed"], ["growth", "growth rate"], ["toughness", "toughness"],
    // v2: the evolution genes
    ["limbs", "legs"], ["arms", "hands"], ["cortex", "cortex"], ["layers", "brain layers"], ["recall", "working memory"],
    ["planning", "planning"], ["social", "language centre"], ["dexterity", "dexterity"], ["senses", "senses"],
    ["head", "head size"], ["fins", "fins"], ["fluff", "fluff"], ["horns", "horns"], ["wings", "wings"], ["glow", "inner glow"]
  ];
  G.GENES = GENES.map(function (g) { return g[0]; });
  G.GENE_LABELS = {};
  GENES.forEach(function (g) { G.GENE_LABELS[g[0]] = g[1]; });
  G.V1_GENES = 38;
  var EVO = (G.EVO_GENES = ["limbs", "arms", "cortex", "layers", "recall", "planning", "social", "dexterity", "senses", "head", "fins", "fluff", "horns", "wings", "glow"]);
  var EVO_SET = {};
  EVO.forEach(function (n) { EVO_SET[n] = 1; });

  var SPECIES = ["smol", "grump"];

  var GRUMP_INST = [
    { drive: "anger", noun: "smol", verb: "hit" },
    { drive: "hunger", noun: "food", verb: "eat" },
    { drive: "bored", noun: "food", verb: "pickup" },
    { drive: "fear", noun: "hand", verb: "flee" },
    { drive: "fear", noun: "fire", verb: "flee" },
    { drive: "anger", noun: "hand", verb: "hit" },
    { drive: "bored", noun: "smol", verb: "hit" }
  ];

  function inst(row, s) { return { drive: SB.D[row.drive], noun: SB.N[row.noun], verb: SB.V[row.verb], s: s }; }
  function q(v) { return Math.round(SB.clamp01(v) * 255) / 255; }
  function randInst(rng, s) { return { drive: rng.int(SB.N_DRIVES), noun: rng.int(SB.N_NOUNS), verb: rng.int(12), s: s }; }
  function instKey(i) { return i.drive + "," + i.noun + "," + i.verb; }
  G.instName = function (i) { return SB.DRIVES[i.drive] + " + " + SB.NOUNS[i.noun] + " → " + SB.VERBS[i.verb]; };

  /* ---------------- random ---------------- */

  G.random = function (rng, opts) {
    var species = (opts && opts.species) || "smol";
    var grump = species === "grump";
    var genes = {};
    for (var i = 0; i < G.GENES.length; i++) genes[G.GENES[i]] = rng();
    genes.hidden = grump ? rng.range(0.05, 0.3) : rng.range(0.11, 0.56);
    genes.learnRate = rng.range(0.25, 0.85);
    genes.instinctStrength = rng.range(0.35, 0.9);
    // a fresh smol is a blob: the evolution genes start low
    genes.limbs = rng.range(0.16, 0.3); genes.arms = rng.range(0, 0.25); genes.cortex = rng.range(0, 0.14);
    genes.layers = rng.range(0, 0.18); genes.recall = rng.range(0, 0.2); genes.planning = rng.range(0, 0.18);
    genes.social = rng.range(0.08, 0.32); genes.dexterity = rng.range(0, 0.3); genes.senses = rng.range(0.1, 0.4);
    genes.head = rng.range(0, 0.25); genes.fins = rng.range(0, 0.3); genes.fluff = rng.range(0, 0.35);
    genes.horns = rng.range(0, 0.3); genes.wings = rng.range(0, 0.2); genes.glow = rng.range(0, 0.15);
    if (grump) {
      genes.hue = rng.chance(0.6) ? rng.range(0.72, 0.8) : rng.range(0.25, 0.38);
      genes.hue2 = genes.hue + rng.range(-0.05, 0.05);
      genes.sat = rng.range(0.3, 0.7); genes.light = rng.range(0, 0.4);
      genes.grumpiness = rng.range(0.75, 1); genes.bravery = rng.range(0.5, 1); genes.sociability = rng.range(0, 0.3);
      genes.antenna = rng.range(0, 0.5); genes.cheeks = rng.range(0, 0.4);
      genes.limbs = rng.range(0.45, 0.7); genes.horns = rng.range(0.6, 1); genes.arms = rng.range(0.3, 0.6);
    } else {
      genes.grumpiness = rng.range(0, 0.6);
      genes.light = rng.range(0.2, 1);
    }
    for (var k in genes) genes[k] = q(genes[k]);
    var driveW = [];
    for (var d = 0; d < SB.N_DRIVES; d++) driveW.push(q(rng.range(0.6, 1.4) / 2) * 2);
    var instincts = [];
    var str = genes.instinctStrength;
    if (grump) GRUMP_INST.forEach(function (row) { instincts.push(inst(row, q(rng.range(0.6, 1)))); });
    else {
      SB.GOOD.forEach(function (row) { if (rng.chance(0.65)) instincts.push(inst(row, q(rng.range(0.3, 1) * (0.5 + str)))); });
      var extra = rng.int(3);
      for (var e = 0; e < extra; e++) instincts.push(randInst(rng, q(rng.range(0.1, 0.35))));
    }
    return { v: 2, species: species, gen: 1, genes: genes, driveW: driveW, instincts: dedupe(instincts), mutated: [], clade: 0 };
  };

  function dedupe(list) {
    var seen = {}, out = [];
    for (var i = 0; i < list.length; i++) {
      var k = instKey(list[i]);
      if (seen[k] != null) { var o = out[seen[k]]; o.s = q(Math.max(o.s, list[i].s)); continue; }
      seen[k] = out.length;
      out.push({ drive: list[i].drive, noun: list[i].noun, verb: list[i].verb, s: q(list[i].s) });
    }
    return out.slice(0, 48);
  }

  /* ---------------- breeding ---------------- */

  // echo: {gene: 0..1} from the parents' habits (see creature.js), bless: {gene: amount} from the player
  // a random smol genome that comes out at (at least) the given tier: strangers, test smols
  G.forTier = function (rng, tier) {
    var ge = G.random(rng, { species: "smol" }), need = G.TIER_NEEDS;
    for (var t = 1; t <= tier; t++) for (var k in need[t]) if (k !== "neurons" && k !== "layers") ge.genes[k] = Math.max(ge.genes[k], need[t][k] + 0.05);
    if (tier >= 2) { ge.genes.hidden = 0.6; ge.genes.cortex = Math.max(ge.genes.cortex, [0, 0, 0.1, 0.35, 0.5, 0.95, 1][tier]); }
    if (tier >= 4) ge.genes.layers = Math.max(ge.genes.layers, tier >= 6 ? 0.85 : 0.5);
    return ge;
  };
  G.cross = function (a, b, rng, echo, bless) {
    var genes = {};
    for (var i = 0; i < G.GENES.length; i++) {
      var n = G.GENES[i];
      var va = a.genes[n] != null ? a.genes[n] : 0.5, vb = b.genes[n] != null ? b.genes[n] : 0.5;
      // evolution has momentum: a child often takes the more evolved parent's side
      genes[n] = q(EVO_SET[n] && rng.chance(0.3) ? Math.max(va, vb) : rng.chance(0.25) ? SB.lerp(va, vb, rng()) : rng.chance(0.5) ? va : vb);
    }
    var driveW = [];
    for (var d = 0; d < SB.N_DRIVES; d++) {
      var wa = a.driveW[d] != null ? a.driveW[d] : 1, wb = b.driveW[d] != null ? b.driveW[d] : 1;
      driveW.push(rng.chance(0.2) ? (wa + wb) / 2 : rng.chance(0.5) ? wa : wb);
    }
    var byKey = {}, list = [];
    function add(x) {
      var k = instKey(x);
      if (byKey[k]) { byKey[k].s = (byKey[k].s + x.s) / 2; byKey[k].both = true; return; }
      var o = { drive: x.drive, noun: x.noun, verb: x.verb, s: x.s };
      byKey[k] = o; list.push(o);
    }
    (a.instincts || []).forEach(add);
    (b.instincts || []).forEach(add);
    var instincts = list.filter(function (o) { return o.both || rng.chance(0.55); });
    var child = {
      v: 2, species: a.species || "smol", gen: Math.max(a.gen || 1, b.gen || 1) + 1,
      genes: genes, driveW: driveW, instincts: dedupe(instincts), mutated: [],
      clade: rng.chance(0.5) ? a.clade || 0 : b.clade || 0
    };
    G.mutate(child, rng, 0.05, echo, bless);
    return child;
  };

  G.mutate = function (g, rng, rate, echo, bless) {
    rate = rate == null ? 0.05 : rate;
    var notes = g.mutated || (g.mutated = []);
    function note(s) { if (notes.indexOf(s) < 0) notes.push(s); }
    var i, n, old;
    for (i = 0; i < G.GENES.length; i++) {
      n = G.GENES[i];
      if (EVO_SET[n]) continue;
      if (rng.chance(rate)) {
        old = g.genes[n];
        g.genes[n] = q(old + rng.gauss() * 0.12);
        if (Math.abs(g.genes[n] - old) > 0.02) note(G.GENE_LABELS[n]);
      }
    }
    // evolution genes drift more, and lean toward what the parents practised (echoes) or the player blessed
    var grump = g.species === "grump";
    for (i = 0; i < EVO.length; i++) {
      n = EVO[i];
      old = g.genes[n];
      var v = old;
      // hands are the first big step: kids of parents who handled lots of things lean harder toward them
      if (!grump && echo && echo[n] > 0) v += (n === "arms" ? 0.32 : 0.24) * Math.min(1, echo[n]) * (1.1 - v);
      if (!grump && echo) v += 0.01; // life tends to get more complex (very slowly)
      // a blessing amplifies what the parents actually practised: it's strong on a well-raised family, weak on its own
      if (!grump && bless && bless[n]) v += bless[n] * (0.6 + 0.9 * Math.min(1, (echo && echo[n]) || 0)) * (1.05 - v);
      if (rng.chance(0.3)) v += rng.gauss() * 0.05;
      g.genes[n] = q(v);
      var dv = g.genes[n] - old;
      if (dv > 0.03) note("more " + G.GENE_LABELS[n]);
      else if (dv < -0.03) note("less " + G.GENE_LABELS[n]);
    }
    // the rare big leap
    if (!grump && rng.chance(0.03)) {
      var leap = rng.pick(EVO);
      g.genes[leap] = q(g.genes[leap] + rng.range(0.12, 0.25));
      note("big leap: " + G.GENE_LABELS[leap]);
      g.leap = leap;
    }
    if (rng.chance(0.02)) {
      var big = rng.pick(G.GENES.slice(0, G.V1_GENES));
      g.genes[big] = q(rng());
      note("big mutation: " + G.GENE_LABELS[big]);
    }
    for (var d = 0; d < SB.N_DRIVES; d++) {
      if (rng.chance(rate * 0.5)) {
        g.driveW[d] = SB.clamp(g.driveW[d] + rng.gauss() * 0.15, 0.3, 1.9);
        note(SB.DRIVES[d] + " sensitivity");
      }
    }
    var ins = g.instincts;
    for (var j = ins.length - 1; j >= 0; j--) {
      if (!rng.chance(rate * 1.5)) continue;
      var x = ins[j], r = rng();
      if (r < 0.3) { ins.splice(j, 1); note("lost instinct: " + G.instName(x)); }
      else if (r < 0.55) {
        var dup = { drive: x.drive, noun: x.noun, verb: x.verb, s: q(x.s * rng.range(0.6, 1.1)) };
        if (rng.chance(0.5)) dup.noun = rng.int(SB.N_NOUNS); else dup.drive = rng.int(SB.N_DRIVES);
        ins.push(dup); note("new instinct: " + G.instName(dup));
      } else if (r < 0.8) { x.verb = rng.int(12); note("rewired instinct: " + G.instName(x)); }
      else if (r < 0.9) { x.noun = rng.int(SB.N_NOUNS); note("rewired instinct: " + G.instName(x)); }
      else { x.s = q(x.s + rng.gauss() * 0.25); note("instinct strength"); }
    }
    if (rng.chance(rate)) { var nw = randInst(rng, q(rng.range(0.15, 0.5))); ins.push(nw); note("new instinct: " + G.instName(nw)); }
    g.instincts = dedupe(ins);
    return g;
  };

  /* ---------------- brain shape, tier, appearance ---------------- */

  function gv(g, n, d) { return g.genes[n] != null ? g.genes[n] : d; }

  // hidden layer sizes, e.g. [14] or [40, 24, 16]
  G.layers = function (g) {
    var l1 = Math.round(6 + SB.clamp01(gv(g, "hidden", 0.3)) * 18 + gv(g, "cortex", 0) * 36);
    var nl = 1 + (gv(g, "layers", 0) >= 0.4 ? 1 : 0) + (gv(g, "layers", 0) >= 0.8 ? 1 : 0);
    var out = [l1];
    if (nl >= 2) out.push(Math.max(6, Math.round(l1 * (0.45 + gv(g, "cortex", 0) * 0.4))));
    if (nl >= 3) out.push(Math.max(6, Math.round(out[1] * 0.75)));
    return out;
  };
  G.nHid = function (g) { return G.layers(g)[0]; };
  G.memUnits = function (g) { return Math.round(gv(g, "recall", 0) * 12); };
  G.neurons = function (g) { var l = G.layers(g), s = 0; for (var i = 0; i < l.length; i++) s += l[i]; return s + G.memUnits(g); };
  G.planDepth = function (g) { var p = gv(g, "planning", 0); return p < 0.3 ? 0 : p < 0.55 ? 1 : p < 0.8 ? 2 : 3; };

  // the evolution ladder (see SB.TIERS). Each step needs the body AND the brain.
  G.TIER_NEEDS = [
    null,
    { limbs: 0.35, neurons: 0 },
    { arms: 0.5, neurons: 16 },
    { social: 0.5, neurons: 28 },
    { planning: 0.45, layers: 2, neurons: 36 },
    { head: 0.5, recall: 0.5, neurons: 58 },
    { glow: 0.6, layers: 3, neurons: 88 }
  ];
  G.tierOf = function (g) {
    if (!g || g.species === "grump") return 1;
    var neurons = G.neurons(g), nl = G.layers(g).length, t = 0;
    for (var i = 1; i < G.TIER_NEEDS.length; i++) {
      var need = G.TIER_NEEDS[i], ok = neurons >= need.neurons && (!need.layers || nl >= need.layers);
      for (var k in need) if (k !== "neurons" && k !== "layers" && gv(g, k, 0) < need[k]) ok = false;
      if (!ok) break;
      t = i;
    }
    return t;
  };
  // what the next tier still needs, as [{gene, have, need}] (for the "next evolution" hint)
  G.nextNeeds = function (g) {
    var t = G.tierOf(g);
    if (t >= G.TIER_NEEDS.length - 1) return [];
    var need = G.TIER_NEEDS[t + 1], out = [];
    for (var k in need) {
      if (k === "neurons") { var nn = G.neurons(g); if (nn < need.neurons) out.push({ gene: "neurons", label: "neurons", have: nn, need: need.neurons }); }
      else if (k === "layers") { var nl = G.layers(g).length; if (nl < need.layers) out.push({ gene: "layers", label: "brain layers", have: nl, need: need.layers }); }
      else if (gv(g, k, 0) < need[k]) out.push({ gene: k, label: G.GENE_LABELS[k], have: gv(g, k, 0), need: need[k] });
    }
    return out;
  };

  G.look = function (g) {
    var e = g.genes, grump = g.species === "grump";
    var tier = G.tierOf(g);
    var limbs = gv(g, "limbs", 0), arms = gv(g, "arms", 0);
    return {
      species: g.species, tier: tier,
      hue: Math.round(e.hue * 360) % 360,
      hue2: Math.round(e.hue2 * 360) % 360,
      sat: grump ? 25 + e.sat * 40 : 45 + e.sat * 50,
      light: grump ? 22 + e.light * 20 : 50 + e.light * 24,
      pattern: Math.min(3, Math.floor(e.pattern * 4)),
      ears: Math.min(4, Math.floor(e.ears * 5)),
      eyes: 0.6 + e.eyes * 0.8,
      tail: Math.min(3, Math.floor(e.tail * 4)),
      body: 0.8 + e.body * 0.45,
      size: 0.85 + e.size * 0.35,
      spotsSeed: Math.floor(e.spots * 65535) + 1,
      cheeks: e.cheeks > 0.5,
      antenna: e.antenna > 0.8,
      legs: limbs < 0.35 ? 0 : limbs < 0.72 ? 2 : 4,
      legLen: 0.25 + limbs * 0.5,
      arms: arms >= 0.5,
      armLen: 0.3 + arms * 0.4,
      head: gv(g, "head", 0),
      brainy: tier >= 5,
      fins: gv(g, "fins", 0) > 0.6,
      fluff: gv(g, "fluff", 0) > 0.6,
      horns: gv(g, "horns", 0) > 0.7 || grump,
      wings: gv(g, "wings", 0) > 0.72,
      glow: tier >= 6 ? 1 : gv(g, "glow", 0) > 0.6 ? gv(g, "glow", 0) * 0.6 : 0,
      halo: tier >= 6
    };
  };

  var TRAITS = [
    ["curiosity", "curious", "cautious"], ["bravery", "brave", "timid"], ["chattiness", "chatty", "quiet"],
    ["appetite", "big eater", "picky eater"], ["sleepiness", "sleepyhead", "night owl"],
    ["learnRate", "quick learner", "slow learner"], ["immunity", "tough", "fragile"],
    ["affection", "huggy", "aloof"], ["sociability", "social", "loner"], ["grumpiness", "grumpy", "sunny"],
    ["hidden", "big brain", "smol brain"], ["playfulness", "playful", "chill"], ["obedience", "obedient", "stubborn"],
    ["memory", "good memory", "forgetful"], ["metabolism", "hyper", "lazy"], ["lifespan", "long-lived", "short-lived"],
    ["speed", "zoomy", "slowpoke"], ["coldTolerance", "fluffy", "chilly"], ["dexterity", "nimble fingers", null],
    ["planning", "planner", null], ["fins", "swimmer", null]
  ];
  G.traits = function (g) {
    var c = [];
    for (var i = 0; i < TRAITS.length; i++) {
      var t = TRAITS[i], v = g.genes[t[0]];
      if (v == null) continue;
      if (t[0] === "hidden") v = SB.clamp01((v - 0.11) / 0.45);
      var w = v >= 0.5 ? t[1] : t[2];
      if (!w) continue;
      c.push({ w: w, d: Math.abs(v - 0.5) });
    }
    c.sort(function (a, b) { return b.d - a.d; });
    var out = [];
    for (var j = 0; j < c.length && out.length < 5; j++) if (out.length < 3 || c[j].d > 0.38) out.push(c[j].w);
    if (g.species === "grump" && out.indexOf("grumpy") < 0) out[out.length - 1] = "grumpy";
    return out;
  };

  // genetic distance 0..1 (species splits use it)
  G.distance = function (a, b) {
    var s = 0, n = 0;
    for (var i = 0; i < G.GENES.length; i++) {
      var k = G.GENES[i], w = EVO_SET[k] ? 2 : k === "hue" || k === "hue2" ? 0.6 : 0.4;
      var d = Math.abs((a.genes[k] || 0) - (b.genes[k] || 0));
      if (k === "hue" || k === "hue2") d = Math.min(d, 1 - d) * 2;
      s += d * w; n += w;
    }
    return s / n;
  };

  /* ---------------- codec ---------------- */

  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var B64I = {};
  for (var bi = 0; bi < 64; bi++) B64I[B64[bi]] = bi;
  G.b64enc = function (bytes) {
    var s = "", n = bytes.length;
    for (var i = 0; i < n; i += 3) {
      var a = bytes[i], b = i + 1 < n ? bytes[i + 1] : 0, c = i + 2 < n ? bytes[i + 2] : 0;
      var t = (a << 16) | (b << 8) | c;
      s += B64[(t >> 18) & 63] + B64[(t >> 12) & 63];
      if (i + 1 < n) s += B64[(t >> 6) & 63];
      if (i + 2 < n) s += B64[t & 63];
    }
    return s;
  };
  G.b64dec = function (str) {
    str = String(str).replace(/[=\s]/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    var n = Math.floor(str.length * 3 / 4), out = new Uint8Array(n), o = 0;
    for (var i = 0; i < str.length; i += 4) {
      var t = 0, k;
      for (k = 0; k < 4; k++) {
        var ch = str[i + k], v = ch == null ? 0 : B64I[ch];
        if (v == null) throw new Error("bad base64");
        t = (t << 6) | v;
      }
      if (o < n) out[o++] = (t >> 16) & 255;
      if (o < n) out[o++] = (t >> 8) & 255;
      if (o < n) out[o++] = t & 255;
    }
    return out;
  };
  function byte(v) { return Math.round(SB.clamp01(v) * 255); }

  // v2 layout: 2, species, gen hi, gen lo, nGenes, genes..., driveW x12, nInst, (drive, noun, verb, s)..., clade hi, clade lo
  G.encode = function (g) {
    var b = [2, Math.max(0, SPECIES.indexOf(g.species)), (g.gen >> 8) & 255, g.gen & 255, G.GENES.length];
    for (var i = 0; i < G.GENES.length; i++) b.push(byte(g.genes[G.GENES[i]]));
    for (var d = 0; d < SB.N_DRIVES; d++) b.push(byte((g.driveW[d] != null ? g.driveW[d] : 1) / 2));
    var ins = g.instincts.slice(0, 255);
    b.push(ins.length);
    ins.forEach(function (x) { b.push(x.drive & 255, x.noun & 255, x.verb & 255, byte(x.s)); });
    var cl = g.clade || 0;
    b.push((cl >> 8) & 255, cl & 255);
    return G.b64enc(b);
  };

  // v1 noun indices -> v2 names
  var V1_NOUNS = ["hand", "smol", "grump", "food", "mushroom", "toy", "ball", "music", "bed", "medicine", "snackbox", "egg", "computer", "bug", "plant", "gadget"];
  var V1_TO_V2 = { music: "toy", bed: "shelter", snackbox: "food", computer: "totem", gadget: "fire" };
  G.v1Noun = function (i) { var n = V1_NOUNS[i]; if (n == null) return -1; n = V1_TO_V2[n] || n; return SB.N[n] != null ? SB.N[n] : -1; };

  G.decode = function (str) {
    var b = G.b64dec(str), p = 0;
    var ver = b[p++];
    if (ver !== 1 && ver !== 2) throw new Error("unknown genome version");
    var species = SPECIES[b[p++]] || "smol";
    var gen = (b[p++] << 8) | b[p++];
    var ng = b[p++], genes = {};
    for (var i = 0; i < ng; i++) { var v = b[p++] / 255; if (i < G.GENES.length) genes[G.GENES[i]] = v; }
    var fresh = G.random(SB.rng((gen + 7) * 31 + ng), { species: species }).genes;
    for (var j = ng; j < G.GENES.length; j++) genes[G.GENES[j]] = fresh[G.GENES[j]]; // genes added after this code was made
    var driveW = [];
    for (var d = 0; d < SB.N_DRIVES; d++) driveW.push(b[p++] / 255 * 2);
    var ni = b[p++], instincts = [];
    for (var k = 0; k < ni; k++) {
      var x = { drive: b[p++], noun: b[p++], verb: b[p++], s: b[p++] / 255 };
      if (ver === 1) x.noun = G.v1Noun(x.noun);
      if (x.drive < SB.N_DRIVES && x.noun >= 0 && x.noun < SB.N_NOUNS && x.verb < SB.N_VERBS) instincts.push(x);
    }
    var clade = 0;
    if (ver >= 2 && p + 1 < b.length + 1) { clade = ((b[p++] || 0) << 8) | (b[p++] || 0); }
    if (p > b.length) throw new Error("genome code is cut short");
    return { v: 2, species: species, gen: gen || 1, genes: genes, driveW: driveW, instincts: instincts, mutated: [], clade: clade };
  };

  // Upgrade a plain genome object from a v1 save (noun indices change; new genes are filled in as a blob's).
  G.upgrade = function (g) {
    if (!g || g.v === 2) return g;
    var fresh = G.random(SB.rng(((g.gen || 1) * 977 + 13) >>> 0), { species: g.species || "smol" }).genes;
    var genes = {};
    for (var i = 0; i < G.GENES.length; i++) { var n = G.GENES[i]; genes[n] = g.genes && g.genes[n] != null ? g.genes[n] : fresh[n]; }
    var instincts = (g.instincts || []).map(function (x) { return { drive: x.drive, noun: G.v1Noun(x.noun), verb: x.verb, s: x.s }; })
      .filter(function (x) { return x.noun >= 0 && x.drive < SB.N_DRIVES && x.verb < 12; });
    return { v: 2, species: g.species || "smol", gen: g.gen || 1, genes: genes, driveW: (g.driveW || []).slice(0, SB.N_DRIVES), instincts: dedupe(instincts), mutated: [], clade: 0 };
  };
})();
