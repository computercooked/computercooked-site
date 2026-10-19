/* smol brains — genome.js
   Genes (all 0..1 floats), drive-reward weights and an instinct list. Random genomes, crossover,
   mutation (with human-readable notes), appearance, trait words and a compact string codec.
   Instincts are stored as indices: {drive: SB.D[..], noun: SB.N[..], verb: SB.V[..], s: 0..1}. */
(function () {
  "use strict";
  var SB = window.SB;

  var G = (SB.Genome = {});

  // Gene order matters: it is the encode() byte layout. Append only.
  var GENES = [
    // appearance
    ["hue", "body colour"], ["hue2", "second colour"], ["sat", "colour strength"], ["light", "brightness"],
    ["pattern", "pattern"], ["ears", "ears"], ["eyes", "eye size"], ["tail", "tail"], ["body", "body shape"],
    ["size", "size"], ["cheeks", "cheeks"], ["antenna", "antenna"], ["spots", "spot layout"],
    // brain
    ["hidden", "brain size"], ["learnRate", "learning speed"], ["curiosity", "curiosity"], ["attnLearn", "attention learning"],
    ["memory", "memory"], ["instinctStrength", "instinct strength"],
    // temperament
    ["bravery", "bravery"], ["sociability", "sociability"], ["playfulness", "playfulness"], ["grumpiness", "grumpiness"],
    ["obedience", "obedience"], ["chattiness", "chattiness"], ["appetite", "appetite"], ["affection", "affection"],
    ["sleepiness", "sleepiness"],
    // body
    ["metabolism", "metabolism"], ["immunity", "immunity"], ["lifespan", "lifespan"], ["fertility", "fertility"],
    ["voice", "voice pitch"], ["coldTolerance", "cold tolerance"], ["heatTolerance", "heat tolerance"],
    ["speed", "walk speed"], ["growth", "growth rate"], ["toughness", "toughness"]
  ];
  G.GENES = GENES.map(function (g) { return g[0]; });
  G.GENE_LABELS = {};
  GENES.forEach(function (g) { G.GENE_LABELS[g[0]] = g[1]; });

  var SPECIES = ["smol", "grump"];

  // Grump instinct set (names, resolved to indices below).
  var GRUMP_INST = [
    { drive: "anger", noun: "smol", verb: "hit" },
    { drive: "hunger", noun: "food", verb: "eat" },
    { drive: "bored", noun: "food", verb: "pickup" },
    { drive: "fear", noun: "hand", verb: "flee" },
    { drive: "anger", noun: "hand", verb: "hit" },
    { drive: "bored", noun: "smol", verb: "hit" }
  ];

  function inst(row, s) { return { drive: SB.D[row.drive], noun: SB.N[row.noun], verb: SB.V[row.verb], s: s }; }
  function q(v) { return Math.round(SB.clamp01(v) * 255) / 255; }
  function randInst(rng, s) {
    return { drive: rng.int(SB.N_DRIVES), noun: rng.int(SB.N_NOUNS), verb: rng.int(SB.N_VERBS), s: s };
  }
  function instKey(i) { return i.drive + "," + i.noun + "," + i.verb; }
  G.instName = function (i) {
    return SB.DRIVES[i.drive] + " + " + SB.NOUNS[i.noun] + " → " + SB.VERBS[i.verb];
  };

  /* ---------------- random ---------------- */

  G.random = function (rng, opts) {
    var species = (opts && opts.species) || "smol";
    var grump = species === "grump";
    var genes = {};
    for (var i = 0; i < G.GENES.length; i++) genes[G.GENES[i]] = rng();
    // smols start with mid-size brains; grumps are small-brained and grumpy
    genes.hidden = grump ? rng.range(0.05, 0.3) : rng.range(0.11, 0.56);
    genes.learnRate = rng.range(0.25, 0.85);
    genes.instinctStrength = rng.range(0.35, 0.9);
    if (grump) {
      // dark purple or swampy green
      genes.hue = rng.chance(0.6) ? rng.range(0.72, 0.8) : rng.range(0.25, 0.38);
      genes.hue2 = genes.hue + rng.range(-0.05, 0.05);
      genes.sat = rng.range(0.3, 0.7);
      genes.light = rng.range(0, 0.4);
      genes.grumpiness = rng.range(0.75, 1);
      genes.bravery = rng.range(0.5, 1);
      genes.sociability = rng.range(0, 0.3);
      genes.antenna = rng.range(0, 0.5);
      genes.cheeks = rng.range(0, 0.4);
    } else {
      genes.grumpiness = rng.range(0, 0.6);
      genes.light = rng.range(0.2, 1);
    }
    for (var k in genes) genes[k] = q(genes[k]);

    var driveW = [];
    for (var d = 0; d < SB.N_DRIVES; d++) driveW.push(q(rng.range(0.6, 1.4) / 2) * 2);

    var instincts = [];
    var str = genes.instinctStrength;
    if (grump) {
      GRUMP_INST.forEach(function (row) { instincts.push(inst(row, q(rng.range(0.6, 1)))); });
    } else {
      SB.GOOD.forEach(function (row) {
        if (rng.chance(0.65)) instincts.push(inst(row, q(rng.range(0.3, 1) * (0.5 + str))));
      });
      var extra = rng.int(3);
      for (var e = 0; e < extra; e++) instincts.push(randInst(rng, q(rng.range(0.1, 0.35))));
    }
    return { v: 1, species: species, gen: 1, genes: genes, driveW: driveW, instincts: dedupe(instincts), mutated: [] };
  };

  function dedupe(list) {
    var seen = {}, out = [];
    for (var i = 0; i < list.length; i++) {
      var k = instKey(list[i]);
      if (seen[k] != null) { var o = out[seen[k]]; o.s = q(Math.max(o.s, list[i].s)); continue; }
      seen[k] = out.length;
      out.push({ drive: list[i].drive, noun: list[i].noun, verb: list[i].verb, s: q(list[i].s) });
    }
    return out.slice(0, 40);
  }

  /* ---------------- breeding ---------------- */

  G.cross = function (a, b, rng) {
    var genes = {};
    for (var i = 0; i < G.GENES.length; i++) {
      var n = G.GENES[i];
      var va = a.genes[n] != null ? a.genes[n] : 0.5, vb = b.genes[n] != null ? b.genes[n] : 0.5;
      genes[n] = q(rng.chance(0.2) ? SB.lerp(va, vb, rng()) : rng.chance(0.5) ? va : vb);
    }
    var driveW = [];
    for (var d = 0; d < SB.N_DRIVES; d++) {
      var wa = a.driveW[d] != null ? a.driveW[d] : 1, wb = b.driveW[d] != null ? b.driveW[d] : 1;
      driveW.push(rng.chance(0.2) ? (wa + wb) / 2 : rng.chance(0.5) ? wa : wb);
    }
    // instincts: shared ones are kept (averaged), each parent's own ones are inherited ~55% of the time
    var byKey = {}, list = [];
    function add(x, keepP) {
      var k = instKey(x);
      if (byKey[k]) { byKey[k].s = (byKey[k].s + x.s) / 2; byKey[k].both = true; return; }
      var o = { drive: x.drive, noun: x.noun, verb: x.verb, s: x.s, keep: keepP };
      byKey[k] = o; list.push(o);
    }
    (a.instincts || []).forEach(function (x) { add(x, 0.55); });
    (b.instincts || []).forEach(function (x) { add(x, 0.55); });
    var instincts = list.filter(function (o) { return o.both || rng.chance(o.keep); });
    var child = {
      v: 1, species: a.species || "smol", gen: Math.max(a.gen || 1, b.gen || 1) + 1,
      genes: genes, driveW: driveW, instincts: dedupe(instincts), mutated: []
    };
    G.mutate(child, rng, 0.05);
    return child;
  };

  G.mutate = function (g, rng, rate) {
    rate = rate == null ? 0.05 : rate;
    var notes = g.mutated || (g.mutated = []);
    function note(s) { if (notes.indexOf(s) < 0) notes.push(s); }
    for (var i = 0; i < G.GENES.length; i++) {
      var n = G.GENES[i];
      if (rng.chance(rate)) {
        var old = g.genes[n];
        g.genes[n] = q(old + rng.gauss() * 0.12);
        if (Math.abs(g.genes[n] - old) > 0.02) note(G.GENE_LABELS[n]);
      }
    }
    // rare big jump
    if (rng.chance(0.02)) {
      var big = rng.pick(G.GENES);
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
      if (r < 0.3) {
        ins.splice(j, 1);
        note("lost instinct: " + G.instName(x));
      } else if (r < 0.55) {
        var dup = { drive: x.drive, noun: x.noun, verb: x.verb, s: q(x.s * rng.range(0.6, 1.1)) };
        if (rng.chance(0.5)) dup.noun = rng.int(SB.N_NOUNS); else dup.drive = rng.int(SB.N_DRIVES);
        ins.push(dup);
        note("new instinct: " + G.instName(dup));
      } else if (r < 0.8) {
        x.verb = rng.int(SB.N_VERBS);
        note("rewired instinct: " + G.instName(x));
      } else if (r < 0.9) {
        x.noun = rng.int(SB.N_NOUNS);
        note("rewired instinct: " + G.instName(x));
      } else {
        x.s = q(x.s + rng.gauss() * 0.25);
        note("instinct strength");
      }
    }
    if (rng.chance(rate)) {
      var nw = randInst(rng, q(rng.range(0.15, 0.5)));
      ins.push(nw);
      note("new instinct: " + G.instName(nw));
    }
    g.instincts = dedupe(ins);
    return g;
  };

  /* ---------------- appearance & traits ---------------- */

  G.nHid = function (g) { return 6 + Math.round(SB.clamp01(g.genes.hidden) * 18); };

  G.look = function (g) {
    var e = g.genes, grump = g.species === "grump";
    return {
      species: g.species,
      hue: Math.round(e.hue * 360) % 360,
      hue2: Math.round(e.hue2 * 360) % 360,
      sat: Math.round(grump ? 25 + e.sat * 40 : 45 + e.sat * 50),
      light: Math.round(grump ? 22 + e.light * 20 : 50 + e.light * 24),
      pattern: Math.min(3, Math.floor(e.pattern * 4)),
      ears: Math.min(4, Math.floor(e.ears * 5)),
      eyes: 0.6 + e.eyes * 0.8,
      tail: Math.min(3, Math.floor(e.tail * 4)),
      body: 0.8 + e.body * 0.45,
      size: 0.85 + e.size * 0.35,
      spotsSeed: Math.floor(e.spots * 65535) + 1,
      cheeks: e.cheeks > 0.5,
      antenna: e.antenna > 0.8
    };
  };

  // [gene, word when high, word when low]
  var TRAITS = [
    ["curiosity", "curious", "cautious"], ["bravery", "brave", "timid"], ["chattiness", "chatty", "quiet"],
    ["appetite", "big eater", "picky eater"], ["sleepiness", "sleepyhead", "night owl"],
    ["learnRate", "quick learner", "slow learner"], ["immunity", "tough", "fragile"],
    ["affection", "huggy", "aloof"], ["sociability", "social", "loner"], ["grumpiness", "grumpy", "sunny"],
    ["hidden", "big brain", "smol brain"], ["playfulness", "playful", "chill"], ["obedience", "obedient", "stubborn"],
    ["memory", "good memory", "forgetful"], ["metabolism", "hyper", "lazy"], ["lifespan", "long-lived", "short-lived"],
    ["speed", "zoomy", "slowpoke"], ["coldTolerance", "fluffy", "chilly"]
  ];

  G.traits = function (g) {
    var c = [];
    for (var i = 0; i < TRAITS.length; i++) {
      var t = TRAITS[i], v = g.genes[t[0]];
      if (v == null) continue;
      // brain size is judged against the smol range, not the full gene range
      if (t[0] === "hidden") v = SB.clamp01((v - 0.11) / 0.45);
      c.push({ w: v >= 0.5 ? t[1] : t[2], d: Math.abs(v - 0.5) });
    }
    c.sort(function (a, b) { return b.d - a.d; });
    var out = [];
    for (var j = 0; j < c.length && out.length < 5; j++) if (out.length < 3 || c[j].d > 0.38) out.push(c[j].w);
    if (g.species === "grump" && out.indexOf("grumpy") < 0) out[out.length - 1] = "grumpy";
    return out;
  };

  /* ---------------- codec ---------------- */

  var B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
  var B64I = {};
  for (var bi = 0; bi < 64; bi++) B64I[B64[bi]] = bi;

  // bytes (Uint8Array or array) -> base64url (no padding)
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
  // base64url (also accepts +/ and padding) -> Uint8Array
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

  // Layout: v, species, gen hi, gen lo, nGenes, genes..., driveW x12 (0..2), nInst, (drive, noun, verb, s)...
  G.encode = function (g) {
    var b = [1, Math.max(0, SPECIES.indexOf(g.species)), (g.gen >> 8) & 255, g.gen & 255, G.GENES.length];
    for (var i = 0; i < G.GENES.length; i++) b.push(byte(g.genes[G.GENES[i]]));
    for (var d = 0; d < SB.N_DRIVES; d++) b.push(byte((g.driveW[d] != null ? g.driveW[d] : 1) / 2));
    var ins = g.instincts.slice(0, 255);
    b.push(ins.length);
    ins.forEach(function (x) { b.push(x.drive & 255, x.noun & 255, x.verb & 255, byte(x.s)); });
    return G.b64enc(b);
  };

  G.decode = function (str) {
    var b = G.b64dec(str), p = 0;
    if (b[p++] !== 1) throw new Error("unknown genome version");
    var species = SPECIES[b[p++]] || "smol";
    var gen = (b[p++] << 8) | b[p++];
    var ng = b[p++], genes = {};
    for (var i = 0; i < ng; i++) { var v = b[p++] / 255; if (i < G.GENES.length) genes[G.GENES[i]] = v; }
    for (var j = ng; j < G.GENES.length; j++) genes[G.GENES[j]] = 0.5; // genes added after this code was made
    var driveW = [];
    for (var d = 0; d < SB.N_DRIVES; d++) driveW.push(b[p++] / 255 * 2);
    var ni = b[p++], instincts = [];
    for (var k = 0; k < ni; k++) {
      var x = { drive: b[p++], noun: b[p++], verb: b[p++], s: b[p++] / 255 };
      if (x.drive < SB.N_DRIVES && x.noun < SB.N_NOUNS && x.verb < SB.N_VERBS) instincts.push(x);
    }
    if (p > b.length) throw new Error("genome code is cut short");
    return { v: 1, species: species, gen: gen || 1, genes: genes, driveW: driveW, instincts: instincts, mutated: [] };
  };
})();
