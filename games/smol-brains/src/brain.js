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
  // 4.36: four more inputs, after the memory units (appended, so every older weight keeps its place): a pat, a tap,
  // a bump and the smell of food. A brain saved before them loads with those weights at zero: same answers as before.
  var NX = 4, PAT = 0, TAP = 1, BUMP = 2, SCENT = 3;
  B.SENSES = ["a pat", "a tap", "a bump", "smells food"];
  var exp = Math.exp, abs = Math.abs;

  function tanh(s) { return s > 3 ? 1 : s < -3 ? -1 : s * (27 + s * s) / (27 + 9 * s * s); }

  // sizes: [hidden1, hidden2?, hidden3?]; nMem context units
  function alloc(hidden, nMem) {
    var nIn = NB + nMem + NX, sizes = [nIn].concat(hidden).concat([NO]);
    var b = {
      nIn: nIn, nMem: nMem, nX: NX, nOut: NO, hidden: hidden.slice(), sizes: sizes, nHid: hidden[0],
      sx: new Float32Array(NX), fire: null, S: null, T: null, tract: 0, t0: 0, t1: 0,
      trK: 0.5, forget: 0, pruneAt: 0.002, naps: 0, pruned: 0, regrown: 0, seedP: 12345 + nIn,
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
    // the learning-rule genes (genome.js RULES). Their defaults are the numbers that used to be fixed here
    var Ge = SB.Genome;
    b.trK = 0.5 + (Ge.rule(genome, "trace") - 0.5) * 0.4;
    b.forget = Ge.rule(genome, "forget") * 0.3;
    b.pruneAt = 0.002 + 0.03 * Ge.rule(genome, "prune");
    setTract(b, Ge.tract(genome));
  }
  // a tract: one input group wired straight to the verbs, skipping the hidden layers (its weights start at zero)
  function setTract(b, t) {
    var o = NB + b.nMem;
    b.tract = t;
    b.t0 = t === 1 ? IN.DRIVE0 : t === 2 ? IN.NOUN0 : t === 3 ? IN.HEARD0 : o;
    b.t1 = t === 1 ? ND : t === 2 ? IN.NOUN0 + NN : t === 3 ? IN.HEARDNOUN + 1 : o + NX;
    if (!t) b.T = null; else if (!b.T) b.T = new Float32Array(NO * b.nIn);
  }
  B.setTract = setTract;
  B.retune = params;
  // long-term weights: a copy the short-term ones are measured against (see B.nap)
  function settle(b) { b.S = b.W.map(function (w) { return Float32Array.from(w); }); return b; }

  B.create = function (genome, rng) {
    var hidden = SB.Genome.layers(genome), nMem = SB.Genome.memUnits(genome);
    var b = alloc(hidden, nMem);
    params(b, genome);
    var L = b.W.length;
    for (var l = 0; l < L; l++) {
      var W = b.W[l], fanIn = b.sizes[l], last = l === L - 1;
      var sc = last ? 0.1 : l === 0 ? W1INIT : 1 / Math.sqrt(fanIn);
      var i;
      if (l === 0) { for (var j = 0, nOld = NB + b.nMem; j < b.sizes[1]; j++) for (i = 0; i < nOld; i++) W[j * b.nIn + i] = (rng() * 2 - 1) * sc; }
      else for (i = 0; i < W.length; i++) W[i] = (rng() * 2 - 1) * sc;
      var bs = b.Bs[l];
      for (i = 0; i < bs.length; i++) bs[i] = last ? -0.02 : (rng() * 2 - 1) * 0.1;
    }
    if (genome && genome.instincts && genome.instincts.length) B.dream(b, genome.instincts, 500 + 40 * (L - 1), rng);
    return settle(b);
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
    // touch and smell: a pat, a tap and a bump ring on for a thought or two; the smell stays while food is near
    var o = NB + b.nMem, s = b.sx;
    for (i = 0; i < NX; i++) x[o + i] = s[i];
    for (i = 0; i < SCENT; i++) s[i] = s[i] < 0.1 ? 0 : s[i] * 0.5;
    // an input fired by hand in the lab
    if (b.fire) { x[b.fire.i] = b.fire.v; if (--b.fire.n <= 0) b.fire = null; }
    if (!hooked && SB.Ext) { hooked = true; SB.Ext.on("tick", function (game, dt) { if ((smT -= dt) <= 0) { smT = 1; B.smell(game); } }); }
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
  // how much the brain wants action a for input x, without touching its live state (for "what did it learn?")
  B.qOf = function (b, x, a) { fwd(b, x, b._acts); var q = b._acts[b.W.length]; tables(b, x, q); return q[a]; };

  function tables(b, x, q) {
    var n = -1, hv = -1, i;
    for (i = 0; i < NN; i++) if (x[IN.NOUN0 + i] > 0.5) { n = i; break; }
    for (i = 0; i < NO; i++) if (x[IN.HEARD0 + i] > 0.5) { hv = i; break; }
    if (n >= 0) for (i = 0; i < NO; i++) q[i] += b.nv[n * NO + i];
    if (hv >= 0) for (i = 0; i < NO; i++) q[i] += b.cmd[hv * NO + i];
    if (b.T) {
      var T = b.T, nI = b.nIn;
      for (i = b.t0; i < b.t1; i++) { var xi = x[i]; if (xi !== 0) for (var a = 0; a < NO; a++) q[a] += T[a * nI + i] * xi; }
    }
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
    for (var t = 0; t < NTR; t++) b.traces[t].e *= b.trK;
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
    var T = b.T, ti, tk = a * b.nIn;
    if (T) for (ti = b.t0; ti < b.t1; ti++) if (x[ti] !== 0) { err -= T[tk + ti] * x[ti]; nrm += x[ti] * x[ti]; }
    var step = frac * err / nrm;
    if (T) for (ti = b.t0; ti < b.t1; ti++) if (x[ti] !== 0) { var tw = T[tk + ti] + step * x[ti]; T[tk + ti] = tw > WMAX ? WMAX : tw < -WMAX ? -WMAX : tw; }
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

  // experience replay (sleep): retrain on a remembered (input, action, reward) as if it were happening again.
  // the remembered input is a copy, so the working-memory units it carries are the ones from back then.
  B.replay = function (b, x, a, reward, frac) {
    if (!x || x.length !== b.nIn || a < 0 || a >= NO) return 0;
    reward = reward > 1 ? 1 : reward < -1 ? -1 : reward || 0;
    var err = train(b, x, a, reward, frac == null ? b.lr * 0.35 : frac, true);
    b.updates++;
    if (++b.naps % 6 === 0) B.nap(b, x);
    return err;
  };

  /* ---------------- sleep: two speeds of weight, and dendrites that move ---------------- */

  // What a smol learned since it last slept is short-term: the gap between its weights (b.W) and the long-term copy
  // (b.S). A nap (every sixth replayed memory) lets a forgetful brain lose a share of that gap, then moves the
  // long-term copy halfway to what is left. It also prunes the weakest input links (they go to zero) and grows a
  // faint link from a concept neuron to something the replayed memory x was full of.
  B.nap = function (b, x) {
    if (!b.S) settle(b);
    var l, i, W, S, f = b.forget, d;
    for (l = 0; l < b.W.length; l++) {
      W = b.W[l]; S = b.S[l];
      for (i = 0; i < W.length; i++) { d = W[i] - S[i]; if (d !== 0) { if (f) W[i] -= d * f; S[i] += (W[i] - S[i]) * 0.5; } }
    }
    W = b.W[0]; S = b.S[0];
    var nI = b.nIn, thr = b.pruneAt, cut = 0, nz = 0, w;
    if (x) for (i = 0; i < nI; i++) if (x[i] !== 0 && i !== IN.BIAS) nzI[nz++] = i;
    for (i = 0; i < W.length && cut < 12; i++) {
      w = W[i];
      if (w === 0 || w >= thr || w <= -thr) continue;
      W[i] = S[i] = 0; cut++; b.pruned++;
      if (!nz) continue;
      b.seedP = (Math.imul(b.seedP, 1664525) + 1013904223) >>> 0;
      var k = i - (i % nI) + nzI[(b.seedP >>> 8) % nz];
      if (W[k] < 0.02 && W[k] > -0.02) { W[k] = S[k] = W[k] < 0 || (W[k] === 0 && b.seedP & 1) ? -0.02 : 0.02; b.regrown++; }
    }
  };
  // how much of what it knows is still short-term (0..1)
  B.shortTerm = function (b) {
    if (!b.S) return 0;
    var d = 0, t = 0;
    for (var l = 0; l < b.W.length; l++) for (var W = b.W[l], S = b.S[l], i = 0; i < W.length; i++) { d += abs(W[i] - S[i]); t += abs(W[i]); }
    return t ? d / t : 0;
  };

  /* ---------------- touch and smell ---------------- */

  var hooked = false, smT = 0, smP = 0;
  B.sense = function (b, k, v) { if (b && b.sx && k >= 0 && k < NX && v > b.sx[k]) b.sx[k] = v > 1 ? 1 : v; };
  function isFood(o) { return o.noun === "food" && o.heldBy == null && !(o.data && o.data.rotten); }
  // the smell of food: how close the nearest meal is, for a quarter of the smols a call (all: everyone now)
  B.smell = function (game, all) {
    var cs = game && game.creatures, Wd = SB.World;
    if (!cs || !Wd || !Wd.nearestItem || !game.world) return;
    for (var i = all ? 0 : smP; i < cs.length; i += all ? 1 : 4) {
      var c = cs[i];
      if (!c || !c.alive || !c.brain || !c.brain.sx || c.species !== "smol") continue;
      var g = c.genome && c.genome.genes, R = 10 + 12 * (g && g.senses != null ? g.senses : 0.3);
      var it = Wd.nearestItem(game.world, c.x, c.z, R, isFood);
      c.brain.sx[SCENT] = it ? Math.max(0, 1 - SB.dist(it.x, it.z, c.x, c.z) / R) : 0;
    }
    smP = (smP + 1) % 4;
  };
  if (SB.bus) {
    SB.bus.on("tickle", function (e) { if (e && e.c) B.sense(e.c.brain, PAT, 1); });
    SB.bus.on("tap", function (e) { if (e && e.c) B.sense(e.c.brain, TAP, 1); });
    SB.bus.on("hit", function (e) { if (e && e.target) B.sense(e.target.brain, BUMP, 1); });
  }

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

  B.inputLabel = function (b, i) { return i < NB ? SB.INPUT_LABELS[i] : i < NB + b.nMem ? "memory " + (i - NB + 1) : B.SENSES[i - NB - b.nMem]; };

  /* ---------------- the lab: lobes, situations, firing one input ---------------- */

  // The net as named lobes. Where each sits is set by the genes: lobes are in columns (inputs, then each hidden
  // layer, then the verbs), and inside a column the lobe its genes made biggest sits on top.
  B.lobes = function (b, genome) {
    var g = (genome && genome.genes) || {}, o = NB + b.nMem, L = [], nc = b.hidden.length + 2, i;
    function v(n) { return g[n] != null ? g[n] : 0.3; }
    function act(A, from, to) { var s = 0; for (var k = from; k < to; k++) s += abs(A[k]); return to > from ? Math.min(1, s / (to - from)) : 0; }
    function add(id, name, col, n, a, size) { L.push({ id: id, name: name, col: col, n: n, act: a, size: 0.4 + 0.6 * SB.clamp01(size) }); }
    add("drive", "drive lobe", 0, ND, act(b.x, 0, ND), v("appetite"));
    add("vision", "vision lobe", 0, NN, act(b.x, IN.NOUN0, IN.NOUN0 + NN) * 8, v("senses"));
    add("hearing", "hearing lobe", 0, NO + 1, act(b.x, IN.HEARD0, IN.HEARDNOUN + 1) * 8, v("social"));
    add("sense", "general sense lobe", 0, IN.BIAS - IN.NEAR, act(b.x, IN.NEAR, IN.BIAS), v("curiosity"));
    add("touch", "touch and smell lobe", 0, NX, act(b.x, o, o + NX), v("senses") * 0.8);
    if (b.nMem) add("memory", "memory lobe", 0, b.nMem, act(b.x, NB, o), v("recall"));
    var HN = ["concept lobe", "thinking lobe", "planning lobe"], HG = ["cortex", "layers", "planning"];
    for (i = 0; i < b.hidden.length; i++) add("hidden" + (i + 1), HN[i] || "deep lobe", i + 1, b.hidden[i], act(b.acts[i + 1], 0, b.hidden[i]), v(HG[i] || "cortex"));
    add("decision", "decision lobe", nc - 1, NO, act(b.q, 0, NO), v("planning"));
    add("word", "word lobe", nc - 1, NN + NO, act(b.cmd, 0, b.cmd.length) * 4 + act(b.nv, 0, b.nv.length) * 4, v("social") * 0.7);
    add("attention", "attention lobe", nc - 1, NN, act(b.att, 0, b.att.length) * 4, v("attnLearn") * 0.6);
    if (b.T) add("tract", SB.Genome.TRACTS[b.tract] + " tract", nc - 1, b.t1 - b.t0, act(b.T, 0, b.T.length) * 20, 0.2);
    for (var c = 0; c < nc; c++) {
      var col = L.filter(function (x) { return x.col === c; }).sort(function (p, r) { return r.size - p.size; });
      for (i = 0; i < col.length; i++) { col[i].x = (c + 0.5) / nc; col[i].y = (i + 0.5) / col.length; }
    }
    return L;
  };

  // The concept lobe, readable: the n busiest first-layer neurons as "when <its two strongest inputs>, lean toward <verb>".
  B.situations = function (b, n) {
    var W = b.W[0], nI = b.nIn, nH = b.sizes[1], h = b.acts[1], L = b.W.length, out = [], order = [], j, i, l, k;
    for (j = 0; j < nH; j++) order.push(j);
    order.sort(function (p, r) { return abs(h[r]) - abs(h[p]) || p - r; });
    for (var c = 0; c < order.length && out.length < (n || 4); c++) {
      j = order[c];
      var o = j * nI, i1 = -1, i2 = -1, w1 = 0, w2 = 0;
      for (i = 0; i < nI; i++) {
        if (i === IN.BIAS) continue;
        var w = W[o + i];
        if (w > w1) { i2 = i1; w2 = w1; i1 = i; w1 = w; } else if (w > w2) { i2 = i; w2 = w; }
      }
      if (i1 < 0) continue;
      // this neuron's pull on each verb, straight down the layers
      var cur = [1], idx = [j];
      for (l = 1; l < L; l++) {
        var Wl = b.W[l], nIl = b.sizes[l], nOl = b.sizes[l + 1], nx = [], ni = [];
        for (k = 0; k < nOl; k++) { var s = 0; for (i = 0; i < cur.length; i++) s += Wl[k * nIl + idx[i]] * cur[i]; nx.push(s); ni.push(k); }
        cur = nx; idx = ni;
      }
      var bv = 1, sg = h[j] < 0 ? -1 : 1;
      for (k = 1; k < NO; k++) if (cur[k] * sg > cur[bv] * sg) bv = k;
      out.push({ j: j, act: h[j], when: i2 >= 0 ? [B.inputLabel(b, i1), B.inputLabel(b, i2)] : [B.inputLabel(b, i1)], verb: bv, pull: cur[bv] * sg });
    }
    return out;
  };

  // Fire one input on its own (nothing else on but the bias) and see which verb it pushes hardest. Changes nothing.
  B.poke = function (b, i, v) {
    var x = b._x, k, q0 = new Float32Array(NO), bi = 0, bd = -1e9;
    for (k = 0; k < b.nIn; k++) x[k] = 0;
    x[IN.BIAS] = 1;
    for (k = 0; k < NO; k++) q0[k] = B.qOf(b, x, k);
    x[i] = v == null ? 1 : v;
    for (k = 0; k < NO; k++) { var d = B.qOf(b, x, k) - q0[k]; if (d > bd) { bd = d; bi = k; } }
    return { verb: bi, d: bd, q: B.qOf(b, x, bi) };
  };
  // ...or fire it for real: the smol's next n thoughts have that input switched on
  B.fire = function (b, i, v, n) { if (i >= 0 && i < b.nIn) b.fire = { i: i, v: v == null ? 1 : v, n: n || 3 }; };

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
      W: b.W.map(packArr), Bs: b.Bs.map(packArr), att: packArr(b.att), cmd: packArr(b.cmd), nv: packArr(b.nv), mem: packArr(b.mem),
      nx: b.nX, T: b.T ? packArr(b.T) : null, pr: [b.pruned, b.regrown]
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
      // a brain saved with fewer inputs (before 4.36: none after the memory units): its weights keep their columns
      var nWas = NB + b.nMem + (o.nx || 0), n1 = b.sizes[1];
      for (var l = 0; l < b.W.length; l++) {
        if (l === 0 && nWas !== b.nIn) {
          var old = unpackArr(o.W && o.W[0], new Float32Array(n1 * nWas));
          for (var hj = 0; hj < n1; hj++) for (var hi = 0; hi < nWas && hi < b.nIn; hi++) b.W[0][hj * b.nIn + hi] = old[hj * nWas + hi];
        } else unpackArr(o.W && o.W[l], b.W[l]);
        unpackArr(o.Bs && o.Bs[l], b.Bs[l]);
      }
      unpackArr(o.att, b.att); unpackArr(o.cmd, b.cmd); unpackArr(o.nv, b.nv); unpackArr(o.mem, b.mem);
      if (b.T && o.T && nWas === b.nIn) unpackArr(o.T, b.T);
      if (o.pr) { b.pruned = o.pr[0] || 0; b.regrown = o.pr[1] || 0; }
      return settle(b);
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
    for (j = 0; j < nHid; j++) for (i = 0; i < NB; i++) W0[j * NI2 + i] = (r() * 2 - 1) * 0.05;
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
    return settle(nb);
  };

  B.clone = function (b) {
    var c = alloc(b.hidden, b.nMem);
    for (var l = 0; l < b.W.length; l++) { c.W[l].set(b.W[l]); c.Bs[l].set(b.Bs[l]); }
    c.att.set(b.att); c.cmd.set(b.cmd); c.nv.set(b.nv); c.mem.set(b.mem);
    c.lr = b.lr; c.temp = b.temp; c.attnLr = b.attnLr; c.updates = b.updates; c.instinct = b.instinct; c.memKeep = b.memKeep;
    c.trK = b.trK; c.forget = b.forget; c.pruneAt = b.pruneAt; c.pruned = b.pruned; c.regrown = b.regrown;
    setTract(c, b.tract);
    if (b.T) c.T.set(b.T);
    return settle(c);
  };
})();
