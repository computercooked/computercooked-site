/* smol brains — brain.js
   A small real neural net per creature: 45 perception inputs -> nHid tanh -> 12 verb outputs, where each
   output is the predicted reward of doing that verb to the attended thing. Learns online from reward with
   eligibility traces (normalised, so lr = "fraction of the surprise corrected per lesson"), plus a learnable
   attention layer. Hot paths (input/forward/decide/attend/reinforce) do not allocate. */
(function () {
  "use strict";
  var SB = window.SB;

  var B = (SB.Brain = {});
  var NI = SB.N_IN, NO = SB.N_VERBS, ND = SB.N_DRIVES, NN = SB.N_NOUNS, NA = ND + 1;
  var IN = SB.IN;
  var NTR = 4; // eligibility traces kept
  var WMAX = 4, AMAX = 3;
  // w1 starts as modest random features so each situation looks a bit different to the output layer;
  // the per-verb bias learns slowly (BSTEP) so lessons stay tied to the situation, not the verb in general
  var W1INIT = 0.3, BSTEP = 0.05;
  var exp = Math.exp, abs = Math.abs;

  function alloc(nHid) {
    var b = {
      nIn: NI, nHid: nHid, nOut: NO,
      w1: new Float32Array(nHid * NI), b1: new Float32Array(nHid),
      w2: new Float32Array(NO * nHid), b2: new Float32Array(NO),
      att: new Float32Array(NN * NA),
      cmd: new Float32Array(NO * NO), // heard verb -> chosen verb: what spoken commands mean, learned from praise
      nv: new Float32Array(NN * NO),  // seen noun -> verb: specific lessons ("not THAT mushroom"), like a concept lobe
      x: new Float32Array(NI), h: new Float32Array(nHid), q: new Float32Array(NO),
      dw1: new Float32Array(nHid * NI), dw2: new Float32Array(NO * nHid),
      lr: 0.2, temp: 0.2, attnLr: 0.05,
      traces: [], traceHead: 0,
      updates: 0, lastErr: 0, lastVerb: -1, lastReward: 0, lastNoun: -1,
      attDrives: new Float32Array(NA),
      // scratch (not shown by the viewer)
      _h: new Float32Array(nHid), _q: new Float32Array(NO), _x: new Float32Array(NI), _g: new Float32Array(nHid),
      _p: new Float32Array(Math.max(NO, 64))
    };
    for (var i = 0; i < NTR; i++) b.traces.push({ x: new Float32Array(NI), a: 0, e: 0 });
    return b;
  }

  function params(b, genome) {
    var g = (genome && genome.genes) || {};
    var v = function (n, d) { return g[n] != null ? g[n] : d; };
    b.lr = 0.1 + 0.3 * v("learnRate", 0.5);
    b.temp = 0.08 + 0.27 * v("curiosity", 0.5);
    b.attnLr = 0.02 + 0.1 * v("attnLearn", 0.5);
    b.instinct = v("instinctStrength", 0.5);
  }

  B.create = function (genome, rng) {
    var nHid = SB.Genome.nHid(genome);
    var b = alloc(nHid);
    params(b, genome);
    var i;
    for (i = 0; i < b.w1.length; i++) b.w1[i] = (rng() * 2 - 1) * W1INIT;
    for (i = 0; i < b.b1.length; i++) b.b1[i] = (rng() * 2 - 1) * 0.1;
    for (i = 0; i < b.w2.length; i++) b.w2[i] = (rng() * 2 - 1) * 0.1;
    for (i = 0; i < NO; i++) b.b2[i] = -0.02;
    if (genome && genome.instincts && genome.instincts.length) B.dream(b, genome.instincts, 600, rng);
    return b;
  };

  /* ---------------- perception ---------------- */

  B.input = function (b, ctx) {
    var x = b.x, i;
    for (i = 0; i < NI; i++) x[i] = 0;
    var d = ctx.drives;
    if (d) for (i = 0; i < ND; i++) x[IN.DRIVE0 + i] = d[i] || 0;
    if (ctx.noun != null && ctx.noun >= 0) x[IN.NOUN0 + ctx.noun] = 1;
    if (ctx.heardVerb != null && ctx.heardVerb >= 0) x[IN.HEARD0 + ctx.heardVerb] = 1;
    x[IN.HEARDNOUN] = ctx.heardName ? 1 : 0;
    x[IN.NEAR] = ctx.near ? 1 : 0;
    x[IN.HOLDING] = ctx.holding ? 1 : 0;
    x[IN.DARK] = ctx.dark ? 1 : 0;
    x[IN.BIAS] = 1;
    return x;
  };

  // nonzero input indices (inputs are mostly sparse one-hots), shared scratch
  var nzI = new Int32Array(NI), nzV = new Float32Array(NI);

  function fwd(b, x, h, q) {
    var nH = b.nHid, w1 = b.w1, w2 = b.w2, b1 = b.b1, j, i, k, nz = 0;
    for (i = 0; i < NI; i++) if (x[i] !== 0) { nzI[nz] = i; nzV[nz++] = x[i]; }
    for (j = 0; j < nH; j++) {
      var s = b1[j], o = j * NI;
      for (i = 0; i < nz; i++) s += w1[o + nzI[i]] * nzV[i];
      // fast tanh (rational approx, |err| < 0.02)
      h[j] = s > 3 ? 1 : s < -3 ? -1 : s * (27 + s * s) / (27 + 9 * s * s);
    }
    for (k = 0; k < NO; k++) {
      var t = b.b2[k], p = k * nH;
      for (j = 0; j < nH; j++) t += w2[p + j] * h[j];
      q[k] = t;
    }
    return q;
  }

  B.forward = function (b) { fwd(b, b.x, b.h, b.q); tables(b, b.x, b.q); return b.q; };

  // The two lesson tables sit on top of the net's output: specific memories of what the player taught.
  function tables(b, x, q) {
    var n = -1, hv = -1, i;
    for (i = 0; i < NN; i++) if (x[IN.NOUN0 + i] > 0.5) { n = i; break; }
    for (i = 0; i < NO; i++) if (x[IN.HEARD0 + i] > 0.5) { hv = i; break; }
    if (n >= 0) for (i = 0; i < NO; i++) q[i] += b.nv[n * NO + i];
    if (hv >= 0) for (i = 0; i < NO; i++) q[i] += b.cmd[hv * NO + i];
  }

  // softmax sample from vals[0..n) / temp, honouring mask (null = all allowed). Uses b._p scratch.
  function sample(b, vals, n, temp, mask, rng) {
    var p = b._p, mx = -1e9, i, any = false;
    for (i = 0; i < n; i++) if (!mask || mask[i]) { any = true; if (vals[i] > mx) mx = vals[i]; }
    if (!any) return -1;
    var sum = 0;
    for (i = 0; i < n; i++) { p[i] = !mask || mask[i] ? exp((vals[i] - mx) / temp) : 0; sum += p[i]; }
    var r = rng() * sum;
    for (i = 0; i < n; i++) { r -= p[i]; if (r <= 0 && p[i] > 0) return i; }
    for (i = n - 1; i >= 0; i--) if (p[i] > 0) return i;
    return -1;
  }

  /* ---------------- decision ---------------- */

  // bias (optional, length 12): added to q before sampling, e.g. a genetic urge to obey a spoken command
  B.decide = function (b, rng, mask, bias) {
    fwd(b, b.x, b.h, b.q);
    if (bias) for (var k = 0; k < NO; k++) b.q[k] += bias[k];
    tables(b, b.x, b.q);
    var a = sample(b, b.q, NO, b.temp, mask, rng);
    if (a < 0) a = 0;
    // older decisions become less susceptible; newest one goes into the ring buffer
    for (var t = 0; t < NTR; t++) b.traces[t].e *= 0.5;
    var tr = b.traces[b.traceHead];
    b.traceHead = (b.traceHead + 1) % NTR;
    tr.x.set(b.x);
    tr.a = a;
    tr.e = 1;
    b.lastVerb = a;
    return a;
  };

  // greedy choice for the current b.x (no trace, for tests / "what would it do")
  B.best = function (b, mask) {
    fwd(b, b.x, b.h, b.q);
    var bi = -1, bv = -1e9;
    for (var i = 0; i < NO; i++) if ((!mask || mask[i]) && b.q[i] > bv) { bv = b.q[i]; bi = i; }
    return bi;
  };

  /* ---------------- attention ---------------- */

  var attScore = new Float32Array(64);
  B.attend = function (b, drives, cands, rng) {
    var n = cands.length;
    if (!n) return -1;
    if (n > attScore.length) attScore = new Float32Array(n * 2);
    if (b._p.length < n) b._p = new Float32Array(n * 2);
    for (var c = 0; c < n; c++) {
      var nn = cands[c].noun, s = cands[c].sal || 0;
      if (nn >= 0 && nn < NN) {
        var o = nn * NA;
        for (var d = 0; d < ND; d++) s += b.att[o + d] * (drives[d] || 0);
        s += b.att[o + ND];
      }
      attScore[c] = s;
    }
    var k = sample(b, attScore, n, b.temp * 2, null, rng);
    if (k < 0) k = 0;
    b.lastNoun = cands[k].noun;
    for (var i = 0; i < ND; i++) b.attDrives[i] = drives[i] || 0;
    b.attDrives[ND] = 1;
    return k;
  };

  /* ---------------- learning ---------------- */

  // Move q[a](x) toward target by fraction `frac` of the error (normalised LMS through the hidden layer).
  // Uses scratch arrays only; returns the error before the step.
  function train(b, x, a, target, frac, viz) {
    var nH = b.nHid, h = b._h, q = b._q, g = b._g, w1 = b.w1, w2 = b.w2, j, i;
    fwd(b, x, h, q);
    var err = target - q[a];
    // gradient-norm estimate so one step corrects ~frac of the error regardless of net size
    var xx = 1, nrm = BSTEP, p = a * nH;
    for (i = 0; i < NI; i++) xx += x[i] * x[i];
    for (j = 0; j < nH; j++) {
      g[j] = w2[p + j] * (1 - h[j] * h[j]);
      nrm += h[j] * h[j] + g[j] * g[j] * xx;
    }
    var step = frac * err / nrm;
    for (j = 0; j < nH; j++) {
      var dh = step * g[j];
      var dw = step * h[j], nw = w2[p + j] + dw;
      w2[p + j] = nw > WMAX ? WMAX : nw < -WMAX ? -WMAX : nw;
      if (viz) { var vv = b.dw2[p + j] + abs(dw) * 8; b.dw2[p + j] = vv > 1 ? 1 : vv; }
      if (dh === 0) continue;
      var o = j * NI;
      for (i = 0; i < NI; i++) {
        var xi = x[i];
        if (xi === 0) continue;
        var d1 = dh * xi, n1 = w1[o + i] + d1;
        w1[o + i] = n1 > WMAX ? WMAX : n1 < -WMAX ? -WMAX : n1;
        if (viz) { var v1 = b.dw1[o + i] + abs(d1) * 8; b.dw1[o + i] = v1 > 1 ? 1 : v1; }
      }
      var nb = b.b1[j] + dh;
      b.b1[j] = nb > WMAX ? WMAX : nb < -WMAX ? -WMAX : nb;
    }
    var n2 = b.b2[a] + step * BSTEP;
    b.b2[a] = n2 > WMAX ? WMAX : n2 < -WMAX ? -WMAX : n2;
    return err;
  }

  // reward in [-1,1]: credits recent decisions by eligibility, and the last attention choice.
  B.reinforce = function (b, reward) {
    reward = reward > 1 ? 1 : reward < -1 ? -1 : reward || 0;
    var newest = (b.traceHead + NTR - 1) % NTR;
    for (var t = 0; t < NTR; t++) {
      var tr = b.traces[t];
      if (tr.e < 0.05) continue;
      var err = train(b, tr.x, tr.a, reward, b.lr * tr.e, true);
      if (t === newest) b.lastErr = err;
      // a lesson "uses up" some susceptibility, so one reward isn't credited to old actions over and over
      // (the newest keeps more, so a tickle right after the action's own outcome still counts)
      tr.e *= t === newest ? 0.7 : 0.4;
    }
    if (b.lastNoun >= 0) {
      var o = b.lastNoun * NA, s = b.attnLr * reward;
      for (var i = 0; i < NA; i++) {
        var v = b.att[o + i] + s * b.attDrives[i];
        b.att[o + i] = v > AMAX ? AMAX : v < -AMAX ? -AMAX : v;
      }
    }
    b.lastReward = reward;
    b.updates++;
  };

  function heardVerb(x) {
    for (var i = 0; i < NO; i++) if (x[IN.HEARD0 + i] > 0.5) return i;
    return -1;
  }

  // A direct lesson from the player (tickle, tap, "good", "bad") about one specific past decision:
  // input x, verb a, and how much better (+) or worse (-) than expected it was. Also teaches what a
  // spoken command means when one was heard. boost scales the learning rate (hand lessons are vivid).
  B.teach = function (b, x, a, delta, boost) {
    fwd(b, x, b._h, b._q);
    var target = b._q[a] + delta;
    target = target > 1.5 ? 1.5 : target < -1.5 ? -1.5 : target;
    var hv = heardVerb(x), n = -1, i;
    for (i = 0; i < NN; i++) if (x[IN.NOUN0 + i] > 0.5) { n = i; break; }
    // most of a lesson goes into a specific memory: "what that word means" when a command was heard,
    // otherwise "doing this to THAT thing". The net (habits in general) gets a smaller share.
    var step = delta * (0.25 + b.lr * 1.2);
    var tab = hv >= 0 ? b.cmd : n >= 0 ? b.nv : null, row = hv >= 0 ? hv : n;
    if (tab) { var k = row * NO + a, v = tab[k] + step; tab[k] = v > 1.5 ? 1.5 : v < -1.5 ? -1.5 : v; }
    var rate = Math.min(0.9, b.lr * (boost || 1)) * (tab ? 0.03 : 1);
    b.lastErr = train(b, x, a, target, rate, true);
    b.lastReward = delta > 1 ? 1 : delta < -1 ? -1 : delta;
    b.updates++;
  };

  // Supervised nudge toward `verb` for input x (watching someone else do it). rate ~0.05..0.3.
  B.imitate = function (b, x, verb, rate) {
    fwd(b, x, b._h, b._q);
    var mx = -1e9;
    for (var i = 0; i < NO; i++) if (b._q[i] > mx) mx = b._q[i];
    var target = Math.min(1, mx + 0.2);
    if (b._q[verb] >= target) return;
    train(b, x, verb, target, rate == null ? 0.15 : rate, true);
  };

  // Rehearse instincts as if they had been lived (done before hatching).
  B.dream = function (b, instincts, n, rng) {
    if (!instincts || !instincts.length) return;
    var x = b._x, tot = 0, i, k;
    var list = instincts.map(function (it) {
      var o = { drive: idx(it.drive, SB.D), noun: idx(it.noun, SB.N), verb: idx(it.verb, SB.V), s: SB.clamp01(it.s == null ? 0.5 : it.s) };
      tot += o.s + 0.05;
      return o;
    }).filter(function (o) { return o.drive >= 0 && o.noun >= 0 && o.verb >= 0; });
    if (!list.length) return;
    for (k = 0; k < n; k++) {
      // stronger instincts are rehearsed more often
      var r = rng() * tot, it = list[0];
      for (i = 0; i < list.length; i++) { r -= list[i].s + 0.05; if (r <= 0) { it = list[i]; break; } }
      for (i = 0; i < NI; i++) x[i] = 0;
      for (i = 0; i < ND; i++) x[IN.DRIVE0 + i] = rng() * 0.3;
      x[IN.DRIVE0 + it.drive] = 0.7 + rng() * 0.3;
      x[IN.NOUN0 + it.noun] = 1;
      x[IN.NEAR] = rng() < 0.5 ? 1 : 0;
      x[IN.DARK] = rng() < 0.3 ? 1 : 0;
      x[IN.BIAS] = 1;
      var dr = 0.05 + 0.14 * (b.instinct == null ? 0.5 : b.instinct); // the instinctStrength gene
      train(b, x, it.verb, it.s * 0.8, dr, false);
      var other = rng.int(NO);
      if (other !== it.verb) train(b, x, other, -0.05 * rng(), dr, false);
      // attention: notice that noun when the drive is high
      var o = it.noun * NA + it.drive, v = b.att[o] + 0.004 * it.s;
      b.att[o] = v > AMAX ? AMAX : v;
    }
  };

  function idx(v, map) {
    if (typeof v === "number") return v;
    return map[v] != null ? map[v] : -1;
  }

  // Fade the viewer's "just learned" flashes.
  B.decayViz = function (b, dt) {
    var f = Math.exp(-dt * 1.5), i;
    for (i = 0; i < b.dw1.length; i++) if (b.dw1[i] !== 0) b.dw1[i] = b.dw1[i] < 0.002 ? 0 : b.dw1[i] * f;
    for (i = 0; i < b.dw2.length; i++) if (b.dw2[i] !== 0) b.dw2[i] = b.dw2[i] < 0.002 ? 0 : b.dw2[i] * f;
  };

  /* ---------------- tests & legibility ---------------- */

  function probe(b, x, drive, noun) {
    for (var i = 0; i < NI; i++) x[i] = 0;
    for (i = 0; i < ND; i++) x[IN.DRIVE0 + i] = 0.1;
    x[IN.DRIVE0 + drive] = 0.9;
    x[IN.NOUN0 + noun] = 1;
    x[IN.NEAR] = 1;
    x[IN.BIAS] = 1;
    fwd(b, x, b._h, b._q);
    tables(b, x, b._q);
    var bi = 1, bv = -1e9;
    for (i = 1; i < NO; i++) if (b._q[i] > bv) { bv = b._q[i]; bi = i; } // skip idle
    return bi;
  }

  // {good: share of SB.GOOD situations answered right, bad: share of SB.BAD temptations avoided}
  B.iqTest = function (b) {
    var x = b._x, g = 0, bad = 0, i, r;
    for (i = 0; i < SB.GOOD.length; i++) {
      r = SB.GOOD[i];
      if (probe(b, x, SB.D[r.drive], SB.N[r.noun]) === SB.V[r.verb]) g++;
    }
    for (i = 0; i < SB.BAD.length; i++) {
      r = SB.BAD[i];
      if (probe(b, x, SB.D[r.drive], SB.N[r.noun]) !== SB.V[r.verb]) bad++;
    }
    return { good: g / SB.GOOD.length, bad: bad / SB.BAD.length };
  };

  // Top 3 inputs pushing `verb` up for the current b.x (gradient x input). For "hungry + sees food -> eat".
  B.explain = function (b, verb) {
    var nH = b.nHid, x = b.x, out = [];
    fwd(b, x, b._h, b._q);
    for (var i = 0; i < NI; i++) {
      if (x[i] === 0 || i === IN.BIAS) continue;
      if (i < IN.DRIVE0 + ND && x[i] < 0.3) continue; // mild feelings don't explain much
      var s = 0;
      for (var j = 0; j < nH; j++) {
        var hj = b._h[j];
        s += b.w2[verb * nH + j] * (1 - hj * hj) * b.w1[j * NI + i];
      }
      var v = s * x[i];
      if (v > 0) out.push({ i: i, label: SB.INPUT_LABELS[i], v: v });
    }
    // specific lessons count too ("you taught it: ball → play", "heard 'come'")
    for (i = 0; i < NN; i++) if (x[IN.NOUN0 + i] > 0.5 && b.nv[i * NO + verb] > 0.1) out.push({ i: IN.NOUN0 + i, label: "a lesson about " + SB.NOUNS[i], v: b.nv[i * NO + verb] });
    for (i = 0; i < NO; i++) if (x[IN.HEARD0 + i] > 0.5 && b.cmd[i * NO + verb] > 0.1) out.push({ i: IN.HEARD0 + i, label: 'heard "' + SB.VERB_WORDS[i] + '"', v: b.cmd[i * NO + verb] });
    out.sort(function (a, c) { return c.v - a.v; });
    return out.slice(0, 3);
  };

  /* ---------------- save / load ---------------- */

  function packArr(arr) {
    var mx = 0, i;
    for (i = 0; i < arr.length; i++) { var a = Math.abs(arr[i]); if (a > mx) mx = a; }
    var sc = mx > 0 ? mx / 127 : 1, bytes = new Uint8Array(arr.length);
    for (i = 0; i < arr.length; i++) bytes[i] = Math.round(arr[i] / sc) & 255;
    return { s: sc, d: SB.Genome.b64enc(bytes) };
  }
  function unpackArr(p, arr) {
    if (!p) return;
    var bytes = SB.Genome.b64dec(p.d);
    for (var i = 0; i < arr.length && i < bytes.length; i++) {
      var v = bytes[i];
      arr[i] = (v > 127 ? v - 256 : v) * p.s;
    }
  }

  B.serialize = function (b) {
    return {
      v: 1, nHid: b.nHid, lr: b.lr, temp: b.temp, attnLr: b.attnLr, updates: b.updates,
      w1: packArr(b.w1), b1: packArr(b.b1), w2: packArr(b.w2), b2: packArr(b.b2), att: packArr(b.att), cmd: packArr(b.cmd), nv: packArr(b.nv)
    };
  };

  B.deserialize = function (o, genome) {
    var nHid = o.nHid || SB.Genome.nHid(genome);
    var b = alloc(nHid);
    params(b, genome);
    if (o.lr != null) b.lr = o.lr;
    if (o.temp != null) b.temp = o.temp;
    if (o.attnLr != null) b.attnLr = o.attnLr;
    b.updates = o.updates || 0;
    unpackArr(o.w1, b.w1); unpackArr(o.b1, b.b1); unpackArr(o.w2, b.w2); unpackArr(o.b2, b.b2); unpackArr(o.att, b.att); unpackArr(o.cmd, b.cmd); unpackArr(o.nv, b.nv);
    return b;
  };

  B.clone = function (b) {
    var c = alloc(b.nHid);
    ["w1", "b1", "w2", "b2", "att", "cmd", "nv", "x", "h", "q"].forEach(function (k) { c[k].set(b[k]); });
    c.lr = b.lr; c.temp = b.temp; c.attnLr = b.attnLr; c.updates = b.updates;
    return c;
  };
})();
