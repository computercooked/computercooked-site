/* smol brains 2 — brain.js
   A real neural net per creature, shaped by its genes: perception inputs (+ "memory" context units that
   echo the last thought, Elman-style) -> 1 to 3 tanh hidden layers -> one output per verb = the predicted
   reward of doing that verb to the attended thing. Learns online from reward with eligibility traces
   (normalised steps: lr = "fraction of the surprise corrected per lesson"), plus a learnable attention
   table and two lesson tables (spoken command -> verb, noun -> verb) like Creatures' concept lobe.
   v1 brains load by mapping weights onto the new inputs/outputs by name. Hot paths don't allocate. */
(function () {
  "use strict";
  var SB = window.SB;
  var B = (SB.Brain = {});
  var NB = SB.N_IN, NO = SB.N_VERBS, ND = SB.N_DRIVES, NN = SB.N_NOUNS, NA = ND + 1;
  var IN = SB.IN;
  var NTR = 4, WMAX = 4, AMAX = 3, W1INIT = 0.3, BSTEP = 0.05;
  var exp = Math.exp, abs = Math.abs;

  function tanh(s) { return s > 3 ? 1 : s < -3 ? -1 : s * (27 + s * s) / (27 + 9 * s * s); }

  // sizes: [hidden1, hidden2?, hidden3?]; nMem context units
  function alloc(hidden, nMem) {
    var nIn = NB + nMem, sizes = [nIn].concat(hidden).concat([NO]);
    var b = {
      nIn: nIn, nMem: nMem, nOut: NO, hidden: hidden.slice(), sizes: sizes, nHid: hidden[0],
      W: [], Bs: [], dW: [],
      acts: [], _acts: [], _g: [],
      att: new Float32Array(NN * NA), cmd: new Float32Array(NO * NO), nv: new Float32Array(NN * NO),
      mem: new Float32Array(nMem),
      lr: 0.2, temp: 0.2, attnLr: 0.05, instinct: 0.5, memKeep: 0.6,
      traces: [], traceHead: 0,
      updates: 0, lastErr: 0, lastVerb: -1, lastReward: 0, lastNoun: -1,
      attDrives: new Float32Array(NA),
      _x: new Float32Array(nIn), _p: new Float32Array(64)
    };
    for (var l = 0; l < sizes.length - 1; l++) {
      b.W.push(new Float32Array(sizes[l + 1] * sizes[l]));
      b.Bs.push(new Float32Array(sizes[l + 1]));
      b.dW.push(new Float32Array(sizes[l + 1] * sizes[l]));
    }
    for (var s = 0; s < sizes.length; s++) { b.acts.push(new Float32Array(sizes[s])); b._acts.push(new Float32Array(sizes[s])); b._g.push(new Float32Array(sizes[s])); }
    b.x = b.acts[0]; b.q = b.acts[sizes.length - 1]; b.h = b.acts[1];
    for (var i = 0; i < NTR; i++) b.traces.push({ x: new Float32Array(nIn), a: 0, e: 0 });
    return b;
  }

  function params(b, genome) {
    var g = (genome && genome.genes) || {};
    var v = function (n, d) { return g[n] != null ? g[n] : d; };
    b.lr = 0.1 + 0.3 * v("learnRate", 0.5);
    b.temp = 0.08 + 0.27 * v("curiosity", 0.5);
    b.attnLr = 0.02 + 0.1 * v("attnLearn", 0.5);
    b.instinct = v("instinctStrength", 0.5);
    b.memKeep = 0.3 + 0.6 * v("memory", 0.5);
  }

  B.create = function (genome, rng) {
    var hidden = SB.Genome.layers(genome), nMem = SB.Genome.memUnits(genome);
    var b = alloc(hidden, nMem);
    params(b, genome);
    var L = b.W.length;
    for (var l = 0; l < L; l++) {
      var W = b.W[l], fanIn = b.sizes[l], last = l === L - 1;
      var sc = last ? 0.1 : l === 0 ? W1INIT : 1 / Math.sqrt(fanIn);
      for (var i = 0; i < W.length; i++) W[i] = (rng() * 2 - 1) * sc;
      var bs = b.Bs[l];
      for (i = 0; i < bs.length; i++) bs[i] = last ? -0.02 : (rng() * 2 - 1) * 0.1;
    }
    if (genome && genome.instincts && genome.instincts.length) B.dream(b, genome.instincts, 600 + 80 * (L - 1), rng);
    return b;
  };

  /* ---------------- perception ---------------- */

  B.input = function (b, ctx) {
    var x = b.x, i;
    for (i = 0; i < b.nIn; i++) x[i] = 0;
    var d = ctx.drives;
    if (d) for (i = 0; i < ND; i++) x[IN.DRIVE0 + i] = d[i] || 0;
    if (ctx.noun != null && ctx.noun >= 0) x[IN.NOUN0 + ctx.noun] = 1;
    if (ctx.heardVerb != null && ctx.heardVerb >= 0) x[IN.HEARD0 + ctx.heardVerb] = 1;
    x[IN.HEARDNOUN] = ctx.heardName ? 1 : 0;
    x[IN.NEAR] = ctx.near ? 1 : 0;
    x[IN.HOLDING] = ctx.holding ? 1 : 0;
    x[IN.DARK] = ctx.dark ? 1 : 0;
    x[IN.KNOWS] = ctx.knows ? 1 : 0;
    x[IN.FRIENDS] = ctx.friends ? 1 : 0;
    x[IN.RAIN] = ctx.rain ? 1 : 0;
    x[IN.HOME] = ctx.home ? 1 : 0;
    x[IN.BIAS] = 1;
    for (i = 0; i < b.nMem; i++) x[NB + i] = b.mem[i];
    return x;
  };

  // forward pass of input x into the activation set A (b.acts or b._acts). Returns the output array.
  var nzI = new Int32Array(128), nzV = new Float32Array(128);
  function fwd(b, x, A) {
    var L = b.W.length, sizes = b.sizes, l, j, i, k;
    if (A[0] !== x) A[0].set(x);
    for (l = 0; l < L; l++) {
      var inA = A[l], outA = A[l + 1], W = b.W[l], bs = b.Bs[l], nI = sizes[l], nOut = sizes[l + 1], last = l === L - 1;
      if (l === 0) {
        // input layer is sparse (one-hots), so skip zeros
        var nz = 0;
        for (i = 0; i < nI; i++) if (inA[i] !== 0) { nzI[nz] = i; nzV[nz++] = inA[i]; }
        for (j = 0; j < nOut; j++) {
          var s = bs[j], o = j * nI;
          for (k = 0; k < nz; k++) s += W[o + nzI[k]] * nzV[k];
          outA[j] = last ? s : tanh(s);
        }
      } else {
        for (j = 0; j < nOut; j++) {
          var t = bs[j], p = j * nI;
          for (i = 0; i < nI; i++) t += W[p + i] * inA[i];
          outA[j] = last ? t : tanh(t);
        }
      }
    }
    return A[L];
  }

  B.forward = function (b) { fwd(b, b.x, b.acts); tables(b, b.x, b.q); return b.q; };

  function tables(b, x, q) {
    var n = -1, hv = -1, i;
    for (i = 0; i < NN; i++) if (x[IN.NOUN0 + i] > 0.5) { n = i; break; }
    for (i = 0; i < NO; i++) if (x[IN.HEARD0 + i] > 0.5) { hv = i; break; }
    if (n >= 0) for (i = 0; i < NO; i++) q[i] += b.nv[n * NO + i];
    if (hv >= 0) for (i = 0; i < NO; i++) q[i] += b.cmd[hv * NO + i];
  }

  function sample(b, vals, n, temp, mask, rng) {
    if (b._p.length < n) b._p = new Float32Array(n * 2);
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

  // tempScale < 1 narrows the choice (an urgent need makes a creature less playful about what it does)
  B.decide = function (b, rng, mask, bias, tempScale) {
    fwd(b, b.x, b.acts);
    if (bias) for (var k = 0; k < NO; k++) b.q[k] += bias[k];
    tables(b, b.x, b.q);
    var a = sample(b, b.q, NO, b.temp * (tempScale || 1), mask, rng);
    if (a < 0) a = 0;
    for (var t = 0; t < NTR; t++) b.traces[t].e *= 0.5;
    var tr = b.traces[b.traceHead];
    b.traceHead = (b.traceHead + 1) % NTR;
    tr.x.set(b.x);
    tr.a = a; tr.e = 1;
    b.lastVerb = a;
    // working memory: the first hidden units echo into the next decision's input
    var h = b.acts[1];
    for (var m = 0; m < b.nMem; m++) b.mem[m] = b.mem[m] * (1 - b.memKeep) * 0.5 + h[m % h.length] * b.memKeep;
    return a;
  };

  B.best = function (b, mask) {
    fwd(b, b.x, b.acts);
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

  // Move q[a](x) toward target by fraction `frac` of the error: normalised LMS backpropagated through every layer.
  function train(b, x, a, target, frac, viz) {
    var A = b._acts, Gs = b._g, L = b.W.length, sizes = b.sizes, l, i, j;
    fwd(b, x, A);
    var err = target - A[L][a];
    // gradients of q_a w.r.t. each hidden layer's pre-activations
    var nH = sizes[L - 1] || 0, gl = Gs[L - 1], Wo = b.W[L - 1], p = a * nH;
    var nrm = BSTEP;
    for (j = 0; j < nH; j++) { var hj = A[L - 1][j]; nrm += hj * hj; }
    if (L >= 2) {
      for (j = 0; j < nH; j++) gl[j] = Wo[p + j] * (1 - A[L - 1][j] * A[L - 1][j]);
      for (l = L - 2; l >= 1; l--) {
        var gUp = Gs[l + 1], gThis = Gs[l], Wl = b.W[l], nI = sizes[l], nU = sizes[l + 1];
        for (i = 0; i < nI; i++) {
          var s = 0;
          for (j = 0; j < nU; j++) s += Wl[j * nI + i] * gUp[j];
          gThis[i] = s * (1 - A[l][i] * A[l][i]);
        }
      }
      for (l = 1; l < L; l++) {
        var gg = Gs[l], inA = A[l - 1], xx = 1;
        for (i = 0; i < sizes[l - 1]; i++) xx += inA[i] * inA[i];
        for (j = 0; j < sizes[l]; j++) nrm += gg[j] * gg[j] * xx;
      }
    }
    var step = frac * err / nrm;
    // output layer (only row a)
    for (j = 0; j < nH; j++) {
      var dw = step * A[L - 1][j], nw = Wo[p + j] + dw;
      Wo[p + j] = nw > WMAX ? WMAX : nw < -WMAX ? -WMAX : nw;
      if (viz) { var vv = b.dW[L - 1][p + j] + abs(dw) * 8; b.dW[L - 1][p + j] = vv > 1 ? 1 : vv; }
    }
    var nb = b.Bs[L - 1][a] + step * BSTEP;
    b.Bs[L - 1][a] = nb > WMAX ? WMAX : nb < -WMAX ? -WMAX : nb;
    // hidden layers
    for (l = 0; l < L - 1; l++) {
      var W = b.W[l], bs = b.Bs[l], g2 = Gs[l + 1], inp = A[l], nIn = sizes[l], nOut = sizes[l + 1], dWl = b.dW[l];
      for (j = 0; j < nOut; j++) {
        var dh = step * g2[j];
        if (dh === 0) continue;
        var o = j * nIn;
        for (i = 0; i < nIn; i++) {
          var xi = inp[i];
          if (xi === 0) continue;
          var d1 = dh * xi, n1 = W[o + i] + d1;
          W[o + i] = n1 > WMAX ? WMAX : n1 < -WMAX ? -WMAX : n1;
          if (viz) { var v1 = dWl[o + i] + abs(d1) * 8; dWl[o + i] = v1 > 1 ? 1 : v1; }
        }
        var nbb = bs[j] + dh;
        bs[j] = nbb > WMAX ? WMAX : nbb < -WMAX ? -WMAX : nbb;
      }
    }
    return err;
  }

  B.reinforce = function (b, reward) {
    reward = reward > 1 ? 1 : reward < -1 ? -1 : reward || 0;
    var newest = (b.traceHead + NTR - 1) % NTR;
    // lived experience also keeps the noun -> verb lesson table honest (a few bad meals shouldn't ban food forever)
    var ntr = b.traces[newest];
    if (ntr.e > 0.5) {
      for (var ni = 0; ni < NN; ni++) if (ntr.x[IN.NOUN0 + ni] > 0.5) {
        var kk = ni * NO + ntr.a, cur = b.nv[kk];
        if (reward > 0.05 && cur < 0) b.nv[kk] = Math.min(0, cur + reward * 0.35);
        break;
      }
    }
    for (var t = 0; t < NTR; t++) {
      var tr = b.traces[t];
      if (tr.e < 0.05) continue;
      var err = train(b, tr.x, tr.a, reward, b.lr * tr.e, true);
      if (t === newest) b.lastErr = err;
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

  function heardVerb(x) { for (var i = 0; i < NO; i++) if (x[IN.HEARD0 + i] > 0.5) return i; return -1; }

  // A direct lesson (tickle, tap, "good", "bad") about one specific past decision.
  B.teach = function (b, x, a, delta, boost) {
    fwd(b, x, b._acts);
    var q = b._acts[b.W.length];
    var target = q[a] + delta;
    target = target > 1.5 ? 1.5 : target < -1.5 ? -1.5 : target;
    var hv = heardVerb(x), n = -1, i;
    for (i = 0; i < NN; i++) if (x[IN.NOUN0 + i] > 0.5) { n = i; break; }
    var step = delta * (0.25 + b.lr * 1.2);
    var tab = hv >= 0 ? b.cmd : n >= 0 ? b.nv : null, row = hv >= 0 ? hv : n;
    if (tab) { var k = row * NO + a, v = tab[k] + step; tab[k] = v > 1.5 ? 1.5 : v < -1.5 ? -1.5 : v; }
    var rate = Math.min(0.9, b.lr * (boost || 1)) * (tab ? 0.03 : 1);
    b.lastErr = train(b, x, a, target, rate, true);
    b.lastReward = delta > 1 ? 1 : delta < -1 ? -1 : delta;
    b.updates++;
  };

  B.imitate = function (b, x, verb, rate) {
    fwd(b, x, b._acts);
    var q = b._acts[b.W.length], mx = -1e9;
    for (var i = 0; i < NO; i++) if (q[i] > mx) mx = q[i];
    var target = Math.min(1, mx + 0.2);
    if (q[verb] >= target) return;
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
    }).filter(function (o) { return o.drive >= 0 && o.noun >= 0 && o.verb >= 0 && o.noun < NN && o.verb < NO; });
    if (!list.length) return;
    for (k = 0; k < n; k++) {
      var r = rng() * tot, it = list[0];
      for (i = 0; i < list.length; i++) { r -= list[i].s + 0.05; if (r <= 0) { it = list[i]; break; } }
      for (i = 0; i < b.nIn; i++) x[i] = 0;
      for (i = 0; i < ND; i++) x[IN.DRIVE0 + i] = rng() * 0.3;
      x[IN.DRIVE0 + it.drive] = 0.7 + rng() * 0.3;
      x[IN.NOUN0 + it.noun] = 1;
      x[IN.NEAR] = rng() < 0.5 ? 1 : 0;
      x[IN.DARK] = rng() < 0.3 ? 1 : 0;
      x[IN.BIAS] = 1;
      var dr = 0.05 + 0.14 * (b.instinct == null ? 0.5 : b.instinct);
      train(b, x, it.verb, it.s * 0.8, dr, false);
      var other = rng.int(12);
      if (other !== it.verb) train(b, x, other, -0.05 * rng(), dr, false);
      var o = it.noun * NA + it.drive, v = b.att[o] + 0.004 * it.s;
      b.att[o] = v > AMAX ? AMAX : v;
    }
  };
  function idx(v, map) { if (typeof v === "number") return v; return map[v] != null ? map[v] : -1; }

  B.decayViz = function (b, dt) {
    var f = Math.exp(-dt * 1.5);
    for (var l = 0; l < b.dW.length; l++) {
      var a = b.dW[l];
      for (var i = 0; i < a.length; i++) if (a[i] !== 0) a[i] = a[i] < 0.002 ? 0 : a[i] * f;
    }
  };

  /* ---------------- tests & legibility ---------------- */

  function probe(b, drive, noun) {
    var x = b._x, A = b._acts, i;
    for (i = 0; i < b.nIn; i++) x[i] = 0;
    for (i = 0; i < ND; i++) x[IN.DRIVE0 + i] = 0.1;
    x[IN.DRIVE0 + drive] = 0.9;
    x[IN.NOUN0 + noun] = 1;
    x[IN.NEAR] = 1;
    x[IN.BIAS] = 1;
    var q = fwd(b, x, A);
    tables(b, x, q);
    var bi = 1, bv = -1e9;
    for (i = 1; i < 12; i++) if (q[i] > bv) { bv = q[i]; bi = i; }
    return bi;
  }
  B.iqTest = function (b) {
    var g = 0, bad = 0, i, r;
    for (i = 0; i < SB.GOOD.length; i++) { r = SB.GOOD[i]; if (probe(b, SB.D[r.drive], SB.N[r.noun]) === SB.V[r.verb]) g++; }
    for (i = 0; i < SB.BAD.length; i++) { r = SB.BAD[i]; if (probe(b, SB.D[r.drive], SB.N[r.noun]) !== SB.V[r.verb]) bad++; }
    return { good: g / SB.GOOD.length, bad: bad / SB.BAD.length };
  };

  B.inputLabel = function (b, i) { return i < NB ? SB.INPUT_LABELS[i] : "memory " + (i - NB + 1); };

  // Top 3 inputs pushing `verb` up for the current b.x (gradient x input through all layers).
  B.explain = function (b, verb) {
    var x = b.x, L = b.W.length, A = b._acts, Gs = b._g, sizes = b.sizes, out = [], i, j, l;
    fwd(b, x, A);
    // d q_verb / d input
    var nH = sizes[L - 1];
    var Wo = b.W[L - 1];
    if (L >= 2) {
      for (j = 0; j < nH; j++) Gs[L - 1][j] = Wo[verb * nH + j] * (1 - A[L - 1][j] * A[L - 1][j]);
      for (l = L - 2; l >= 0; l--) {
        var gUp = Gs[l + 1], Wl = b.W[l], nI = sizes[l], nU = sizes[l + 1];
        for (i = 0; i < nI; i++) {
          var s = 0;
          for (j = 0; j < nU; j++) s += Wl[j * nI + i] * gUp[j];
          Gs[l][i] = l > 0 ? s * (1 - A[l][i] * A[l][i]) : s;
        }
      }
    }
    for (i = 0; i < b.nIn; i++) {
      if (x[i] === 0 || i === IN.BIAS) continue;
      if (i < IN.DRIVE0 + ND && x[i] < 0.3) continue;
      var v = Gs[0][i] * x[i];
      if (v > 0) out.push({ i: i, label: B.inputLabel(b, i), v: v });
    }
    for (i = 0; i < NN; i++) if (x[IN.NOUN0 + i] > 0.5 && b.nv[i * NO + verb] > 0.1) out.push({ i: IN.NOUN0 + i, label: "a lesson about " + SB.NOUNS[i], v: b.nv[i * NO + verb] });
    for (i = 0; i < NO; i++) if (x[IN.HEARD0 + i] > 0.5 && b.cmd[i * NO + verb] > 0.1) out.push({ i: IN.HEARD0 + i, label: 'heard "' + SB.VERB_WORDS[i] + '"', v: b.cmd[i * NO + verb] });
    out.sort(function (a, c) { return c.v - a.v; });
    return out.slice(0, 3);
  };

  B.size = function (b) { var s = 0; for (var i = 0; i < b.hidden.length; i++) s += b.hidden[i]; return s + b.nMem; };
  B.synapses = function (b) { var s = 0; for (var i = 0; i < b.W.length; i++) s += b.W[i].length; return s; };

  /* ---------------- save / load ---------------- */

  function packArr(arr) {
    var mx = 0, i;
    for (i = 0; i < arr.length; i++) { var a = Math.abs(arr[i]); if (a > mx) mx = a; }
    var sc = mx > 0 ? mx / 127 : 1, bytes = new Uint8Array(arr.length);
    for (i = 0; i < arr.length; i++) bytes[i] = Math.round(arr[i] / sc) & 255;
    return { s: sc, d: SB.Genome.b64enc(bytes) };
  }
  function unpackArr(p, arr) {
    if (!p) return arr;
    var bytes = SB.Genome.b64dec(p.d);
    for (var i = 0; i < arr.length && i < bytes.length; i++) { var v = bytes[i]; arr[i] = (v > 127 ? v - 256 : v) * p.s; }
    return arr;
  }

  B.serialize = function (b) {
    return {
      v: 2, hidden: b.hidden, nMem: b.nMem, lr: b.lr, temp: b.temp, attnLr: b.attnLr, updates: b.updates,
      W: b.W.map(packArr), Bs: b.Bs.map(packArr), att: packArr(b.att), cmd: packArr(b.cmd), nv: packArr(b.nv), mem: packArr(b.mem)
    };
  };

  // v1 input index -> v2 input index
  function v1Input(i) {
    if (i < 12) return i;
    if (i < 28) { var n = SB.Genome.v1Noun(i - 12); return n >= 0 ? IN.NOUN0 + n : -1; }
    if (i < 40) return IN.HEARD0 + (i - 28);
    return [IN.HEARDNOUN, IN.NEAR, IN.HOLDING, IN.DARK, IN.BIAS][i - 40];
  }

  B.deserialize = function (o, genome, rng) {
    if (!o) return B.create(genome, rng || SB.rng(1));
    if (o.v === 2) {
      var b = alloc(o.hidden && o.hidden.length ? o.hidden : SB.Genome.layers(genome), o.nMem || 0);
      params(b, genome);
      if (o.lr != null) b.lr = o.lr; if (o.temp != null) b.temp = o.temp; if (o.attnLr != null) b.attnLr = o.attnLr;
      b.updates = o.updates || 0;
      for (var l = 0; l < b.W.length; l++) { unpackArr(o.W && o.W[l], b.W[l]); unpackArr(o.Bs && o.Bs[l], b.Bs[l]); }
      unpackArr(o.att, b.att); unpackArr(o.cmd, b.cmd); unpackArr(o.nv, b.nv); unpackArr(o.mem, b.mem);
      return b;
    }
    // v1: 45 inputs -> nHid -> 12 verbs. Same hidden size, weights moved to the new layout by name.
    var nHid = o.nHid || 12;
    var nb = alloc([nHid], 0);
    params(nb, genome);
    if (o.lr != null) nb.lr = o.lr; if (o.temp != null) nb.temp = o.temp; if (o.attnLr != null) nb.attnLr = o.attnLr;
    nb.updates = o.updates || 0;
    var r = rng || SB.rng(nHid * 31 + 7), i, j;
    var w1 = unpackArr(o.w1, new Float32Array(nHid * 45)), b1 = unpackArr(o.b1, new Float32Array(nHid));
    var w2 = unpackArr(o.w2, new Float32Array(12 * nHid)), b2 = unpackArr(o.b2, new Float32Array(12));
    var W0 = nb.W[0], NI2 = nb.nIn;
    for (i = 0; i < W0.length; i++) W0[i] = (r() * 2 - 1) * 0.05;
    for (j = 0; j < nHid; j++) for (i = 0; i < 45; i++) { var ni = v1Input(i); if (ni >= 0) W0[j * NI2 + ni] = w1[j * 45 + i]; }
    nb.Bs[0].set(b1);
    var W1 = nb.W[1];
    for (i = 0; i < W1.length; i++) W1[i] = (r() * 2 - 1) * 0.05;
    for (j = 0; j < 12; j++) for (i = 0; i < nHid; i++) W1[j * nHid + i] = w2[j * nHid + i];
    for (j = 0; j < NO; j++) nb.Bs[1][j] = j < 12 ? b2[j] : -0.05;
    var att1 = unpackArr(o.att, new Float32Array(16 * NA)), cmd1 = unpackArr(o.cmd, new Float32Array(144)), nv1 = unpackArr(o.nv, new Float32Array(16 * 12));
    for (var n1 = 0; n1 < 16; n1++) {
      var n2 = SB.Genome.v1Noun(n1);
      if (n2 < 0) continue;
      for (i = 0; i < NA; i++) nb.att[n2 * NA + i] = att1[n1 * NA + i];
      for (i = 0; i < 12; i++) nb.nv[n2 * NO + i] = nv1[n1 * 12 + i];
    }
    for (j = 0; j < 12; j++) for (i = 0; i < 12; i++) nb.cmd[j * NO + i] = cmd1[j * 12 + i];
    return nb;
  };

  B.clone = function (b) {
    var c = alloc(b.hidden, b.nMem);
    for (var l = 0; l < b.W.length; l++) { c.W[l].set(b.W[l]); c.Bs[l].set(b.Bs[l]); }
    c.att.set(b.att); c.cmd.set(b.cmd); c.nv.set(b.nv); c.mem.set(b.mem);
    c.lr = b.lr; c.temp = b.temp; c.attnLr = b.attnLr; c.updates = b.updates; c.instinct = b.instinct; c.memKeep = b.memKeep;
    return c;
  };
})();
