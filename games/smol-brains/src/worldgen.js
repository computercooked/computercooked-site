/* smol brains 2 — worldgen.js
   Turns a seed into an island: heights, lakes and rivers (priority-flood + flow accumulation), temperature,
   moisture, biomes, resource nodes (trees, bushes, rocks...), decorations and a nice spot for the first egg.
   Pure and deterministic: the same seed always makes the same island (that's how world codes work).
   SB.WorldGen.generate(seed) -> terrain object (see bottom of file). */
(function () {
  "use strict";
  var SB = window.SB;
  var WG = (SB.WorldGen = {});

  var N = SB.WORLD_N, V = N + 1;
  var B = SB.B;

  function fbm(nz, x, y, oct, lac, gain) {
    var a = 1, f = 1, s = 0, n = 0;
    for (var o = 0; o < oct; o++) { s += a * nz(x * f, y * f); n += a; a *= gain; f *= lac; }
    return s / n;
  }

  // binary min-heap on (key, value) with Float64 keys
  function Heap(cap) {
    this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0;
  }
  Heap.prototype.push = function (key, val) {
    var i = this.n++, k = this.k, v = this.v;
    while (i > 0) { var p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  };
  Heap.prototype.pop = function () {
    var k = this.k, v = this.v, top = v[0], n = --this.n, key = k[n], val = v[n], i = 0;
    while (true) {
      var l = i * 2 + 1; if (l >= n) break;
      var r = l + 1, c = r < n && k[r] < k[l] ? r : l;
      if (k[c] >= key) break;
      k[i] = k[c]; v[i] = v[c]; i = c;
    }
    k[i] = key; v[i] = val;
    return top;
  };

  var DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];

  // A smooth field sampled on a coarse (res+1)^2 grid over [0,1]^2 and read back bilinearly: low-frequency
  // noise (warps, climate) doesn't need full resolution, and this makes generation ~2x faster on phones.
  function coarse(fn, res) {
    var g = new Float32Array((res + 1) * (res + 1));
    for (var j = 0; j <= res; j++) for (var i = 0; i <= res; i++) g[j * (res + 1) + i] = fn(i / res, j / res);
    return function (x, z) {
      var fx = (x < 0 ? 0 : x > 1 ? 1 : x) * res, fz = (z < 0 ? 0 : z > 1 ? 1 : z) * res, i = fx | 0, j = fz | 0;
      if (i > res - 1) i = res - 1; if (j > res - 1) j = res - 1;
      var tx = fx - i, tz = fz - j, a = j * (res + 1) + i;
      return (g[a] * (1 - tx) + g[a + 1] * tx) * (1 - tz) + (g[a + res + 1] * (1 - tx) + g[a + res + 2] * tx) * tz;
    };
  }

  /* ---------------- generator 2 (v3.7): island archetypes ----------------
     Every new island is one of these shapes (picked by the seed, or chosen in "create world"), with the same
     per-tile hills, ridges and rivers on top, so a big island has more of everything rather than bigger bumps. */
  var ARCHS = ["classic", "volcano", "twin", "crescent", "mesa", "delta", "lakes", "fjord"];
  WG.ARCHS = ARCHS;
  WG.ARCH_NAMES = { classic: "one big island", volcano: "volcano island", twin: "twin islands", crescent: "crescent bay", mesa: "mesa country", delta: "river delta", lakes: "lake district", fjord: "fjord coast" };
  function segDist(px, pz, ax, az, bx, bz) {
    var vx = bx - ax, vz = bz - az, t = ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz);
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    var ex = ax + vx * t - px, ez = az + vz * t - pz;
    return Math.sqrt(ex * ex + ez * ez);
  }
  function heights2(h, seed, shape, arch, feat, nA, nB, nC, nD, nP) {
    var K = N / 256, T2 = N / 256; // tiles-per-classic-unit: noise below is in tiles, so features keep their size
    var ra = SB.rng((seed * 977 + 5) >>> 0);
    var res = Math.max(32, N >> 3);
    var warpF = coarse(function (x, z) { return fbm(nC, x * 3 * T2 + shape.ox, z * 3 * T2 + shape.oz, 3, 2, 0.5); }, res);
    var mtnF = coarse(function (x, z) { return fbm(nD, x * 1.6 * T2 + 7, z * 1.6 * T2 - 3, 3, 2, 0.5); }, res);
    var ridgeF = coarse(function (x, z) { return fbm(nB, x * 3.1 * T2, z * 3.1 * T2, 4, 2.1, 0.5); }, Math.max(64, N >> 1));
    // big-shape warp in island units (coastlines that wander), and extras per archetype
    var nS = SB.noise2(seed + 909), bigF = coarse(function (x, z) { return fbm(nS, x * 2.2 + 5, z * 2.2 - 8, 3, 2, 0.5); }, 48);
    var nL = SB.noise2(seed + 919), lakeF = arch === "lakes" ? coarse(function (x, z) { return fbm(nL, x * N / 70, z * N / 70, 2, 2, 0.5); }, Math.max(32, N >> 2)) : null;
    var fjF = arch === "fjord" ? coarse(function (x, z) { return 1 - Math.abs(fbm(nL, x * N / 55 + 3, z * N / 55, 3, 2, 0.5)) * 2.2; }, Math.max(48, N >> 1)) : null;
    var canF = arch === "mesa" ? coarse(function (x, z) { return Math.abs(fbm(nL, x * N / 90 - 4, z * N / 90 + 2, 3, 2, 0.5)); }, Math.max(48, N >> 1)) : null;
    var a0 = ra() * 6.283, ca = Math.cos(a0), sa = Math.sin(a0);
    var c1x = 0.5 - ca * 0.235, c1z = 0.5 - sa * 0.235, c2x = 0.5 + ca * 0.235, c2z = 0.5 + sa * 0.235; // twins
    var vx = 0.5 + (ra() - 0.5) * 0.16, vz = 0.5 + (ra() - 0.5) * 0.16; // the volcano
    var gapA = ra() * 6.283; // where the crescent opens
    if (arch === "volcano") feat.volcano = { x: vx * N, z: vz * N, r: 0.2 * N };
    var V2 = V, Nn = N, oct = 5;
    for (var j = 0; j < V2; j++) for (var i = 0; i < V2; i++) {
      var x = i / Nn, z = j / Nn, dx = x - 0.5, dz = z - 0.5, ang = Math.atan2(dz, dx), rr = Math.sqrt(dx * dx + dz * dz);
      var d = rr * 2, warp = warpF(x, z), big = bigF(x, z);
      if (arch === "twin") d = Math.min(Math.hypot(x - c1x, z - c1z), Math.hypot(x - c2x, z - c2z)) * 3.9;
      else if (arch === "crescent") {
        var gd = Math.abs(SB.angDiff(ang, gapA));
        d = Math.abs(rr - 0.29) * 5.2 + 0.2 + SB.smooth(1 - gd / 0.75) * 1.1;
      }
      d += warp * 0.2 + big * 0.12 + (arch === "classic" || arch === "volcano" || arch === "mesa" ? Math.sin(ang * shape.lobes + shape.lobeA) * 0.07 : 0);
      if (fjF) { var mk0 = SB.smooth((1.02 - d) / 0.42); if (mk0 > 0.1 && mk0 < 0.97) { var fv = fjF(x, z); if (fv > 0.7) d += (fv - 0.7) / 0.3 * 1.1 * (1.05 - mk0); } }
      var mask = SB.smooth((1.02 - d) / 0.42) * shape.land;
      var e = fbm(nA, x * 4.2 * T2 + shape.ox, z * 4.2 * T2 + shape.oz, oct, 2.05, 0.5);
      var ridge = 1 - Math.abs(ridgeF(x, z) * 1.4); ridge *= ridge;
      var mtnMask = SB.smooth((mtnF(x, z) + 0.05 + shape.tilt * (x - 0.5)) / 0.4);
      var mtn = shape.mtn * (arch === "delta" ? 0.45 : arch === "mesa" ? 0.6 : 1);
      var hh = (mask - 0.42) * 15 + e * 5 * shape.rough + ridge * mtnMask * mask * 17 * mtn;
      if (hh > 0.4 && hh < 6) hh = 0.4 + (hh - 0.4) * (arch === "delta" ? 0.5 : 0.72);
      if (arch === "volcano") {
        var dc = Math.hypot(x - vx, z - vz) / 0.2;
        if (dc < 1) { var cone = SB.smooth(1 - dc); hh += cone * cone * 24 - SB.smooth(1 - dc / 0.12) * 9; }
      }
      if (arch === "twin") { var sd = segDist(x, z, c1x, c1z, c2x, c2z) * Nn; if (sd < 7) hh = Math.max(hh, 0.55 * SB.smooth(1 - sd / 7) - (1 - SB.smooth(1 - sd / 7)) * 2); }
      if (canF && hh > 1.2) {
        // mesas: flat tops and cliffs, cut by dry canyons
        var st = 2.8, v = (hh - 1.2) / st, f = v - Math.floor(v);
        hh = 1.2 + (Math.floor(v) + SB.smooth((f - 0.72) / 0.24)) * st;
        var cv = canF(x, z); if (cv < 0.06) hh -= (1 - cv / 0.06) * Math.min(5, hh - 0.6);
      }
      if (lakeF && mask > 0.75) { var lv = lakeF(x, z); if (lv > 0.32) hh -= (lv - 0.32) * 14; }
      if (hh < -7) hh = -7 + (hh + 7) * 0.3;
      h[j * V2 + i] = hh;
    }
    // sea stacks: rock pillars standing in the shallows
    var nStacks = Math.round(10 * K * K);
    for (var s = 0, tries = 0; s < nStacks && tries < nStacks * 60; tries++) {
      var si = 14 + ra.int(Nn - 28), sj = 14 + ra.int(Nn - 28), hv = h[sj * V2 + si];
      if (hv > -0.6 || hv < -3.2) continue;
      var land = false;
      for (var q = 0; q < 8 && !land; q++) { var qi = si + Math.round(Math.cos(q * 0.785) * 9), qj = sj + Math.round(Math.sin(q * 0.785) * 9); if (qi > 0 && qj > 0 && qi < Nn && qj < Nn && h[qj * V2 + qi] > 0.5) land = true; }
      if (!land) continue;
      var top = 3 + ra() * 4, rad = 1.2 + ra() * 1.2;
      for (var pj = -3; pj <= 3; pj++) for (var pi = -3; pi <= 3; pi++) {
        var dd = Math.hypot(pi, pj) / rad; if (dd > 1.6) continue;
        var kk = (sj + pj) * V2 + si + pi;
        h[kk] = Math.max(h[kk], dd < 1 ? top - dd * 0.8 : hv + (top - hv) * (1.6 - dd) / 0.6 * 0.4);
      }
      s++;
    }
    feat.stacks = s;
  }

  // generator 2 biomes: the classic twelve plus eight new ones, chosen by climate and a slow "variant"
  // noise that splits a forest into maple or blossom woods, a jungle into bamboo, a meadow into flower fields
  function biome2(th, tt, mm, sl, sea, od, vr, sp, rf, feat, i, j) {
    if (th < SB.SEA - 0.15 && sea) return th > SB.SEA - 1.8 && tt > 0.5 && rf > -0.15 ? B.reef : B.ocean;
    if (feat.volcano) { var dv = Math.hypot(i - feat.volcano.x, j - feat.volcano.z) / feat.volcano.r; if (dv < 0.75 + sp * 0.15 && th > 1) return B.ash; }
    if (od < 4 && th < 1.4 && sl < 1.2) return tt < 0.2 ? B.tundra : tt > 0.6 && mm > 0.62 ? B.mangrove : B.beach;
    if (th > 14 || (th > 9 && sl > 1.6)) return tt > 0.68 && mm < 0.4 ? B.mesa : sp > 0.72 ? B.ash : B.mountain;
    var bm;
    if (tt < 0.2) bm = B.tundra;
    else if (tt < 0.36) bm = mm > 0.42 ? B.taiga : B.tundra;
    else if (tt > 0.72) bm = mm < 0.34 ? (th > 3 && vr > -0.1 ? B.mesa : B.desert) : mm < 0.56 ? B.savanna : vr < -0.22 ? B.bamboo : B.jungle;
    else if (mm > 0.7 && th < 3.4) bm = od < 10 && tt > 0.58 ? B.mangrove : B.swamp;
    else if (mm > 0.55) bm = vr > 0.28 ? B.maple : vr < -0.24 ? B.blossom : B.forest;
    else bm = vr > 0.34 ? B.flowers : B.meadow;
    if ((bm === B.forest || bm === B.swamp || bm === B.taiga || bm === B.maple) && sp > 0.62) bm = B.shroom;
    if ((bm === B.meadow || bm === B.tundra || bm === B.savanna || bm === B.flowers) && sp < -0.66 && th > 3) bm = B.crystal;
    if (bm === B.mesa && th < 1.2) bm = B.desert;
    return bm;
  }

  WG.generate = function (seed) {
    seed = seed >>> 0 || 1;
    N = SB.WORLD_N; V = N + 1;
    // bigger islands get more of everything (hills, rivers, biomes), not a blown-up copy of a small one.
    // k = 1 for the classic 256 islands, so old worlds come out exactly as they were
    var K = N / 256, KR = function (res) { return Math.round(res * K); };
    var t0 = Date.now();
    var r = SB.rng(seed * 7 + 13);
    var nA = SB.noise2(seed), nB = SB.noise2(seed + 101), nC = SB.noise2(seed + 202), nD = SB.noise2(seed + 303);
    var nT = SB.noise2(seed + 404), nM = SB.noise2(seed + 505), nP = SB.noise2(seed + 606);
    var h = new Float32Array(V * V);
    var i, j, k, x, z;

    // a few random "shape" knobs so islands differ in character
    var shape = {
      ox: r.range(-1000, 1000), oz: r.range(-1000, 1000),
      land: r.range(0.92, 1.12), mtn: r.range(0.7, 1.35), rough: r.range(0.8, 1.2),
      tilt: r.range(-0.25, 0.25), lobes: r.int(3) + 2, lobeA: r.range(0, 6.28)
    };
    // the "create world" choices (all 1 / 0 for a classic island, so old worlds come out the same)
    var WO = SB.WORLD_OPTS || {};
    shape.land *= WO.land || 1; shape.mtn *= WO.mtn || 1;

    // v3.7 islands (generator 2): archetypes, bigger biomes, more of them. Saves made before keep generator 1,
    // which is everything outside the G2 branches below, untouched, so old islands come back exactly the same
    var G2 = (WO.gv || 1) >= 2, arch = null, feat = {};
    if (G2) { arch = ARCHS.indexOf(WO.arch) >= 0 ? WO.arch : ARCHS[SB.rng((seed * 131 + 71) >>> 0).int(ARCHS.length)]; }

    /* ---- heights ---- */
    if (G2) heights2(h, seed, shape, arch, feat, nA, nB, nC, nD, nP);
    else {
    var warpF = coarse(function (x, z) { return fbm(nC, x * 3 * K + shape.ox, z * 3 * K + shape.oz, 3, 2, 0.5); }, KR(64));
    var mtnF = coarse(function (x, z) { return fbm(nD, x * 1.6 * K + 7, z * 1.6 * K - 3, 3, 2, 0.5); }, KR(48));
    var ridgeF = coarse(function (x, z) { return fbm(nB, x * 3.1 * K, z * 3.1 * K, 4, 2.1, 0.5); }, KR(128));
    for (j = 0; j < V; j++) for (i = 0; i < V; i++) {
      x = i / N; z = j / N;
      var dx = x - 0.5, dz = z - 0.5;
      var ang = Math.atan2(dz, dx);
      var d = Math.sqrt(dx * dx + dz * dz) * 2; // 0 centre .. ~1.4 corners
      var warp = warpF(x, z);
      d += warp * 0.22 + Math.sin(ang * shape.lobes + shape.lobeA) * 0.07;
      var mask = SB.smooth((1.02 - d) / 0.42) * shape.land;
      var e = fbm(nA, x * 4.2 * K + shape.ox, z * 4.2 * K + shape.oz, 5, 2.05, 0.5); // -1..1-ish
      var ridge = 1 - Math.abs(ridgeF(x, z) * 1.4);
      ridge = ridge * ridge;
      var mtnMask = SB.smooth((mtnF(x, z) + 0.05 + shape.tilt * (x - 0.5)) / 0.4);
      var hh = (mask - 0.42) * 15 + e * 5 * shape.rough + ridge * mtnMask * mask * 17 * shape.mtn;
      // gentle plateaus: soften the lowlands so there's room to walk and build
      if (hh > 0.4 && hh < 6) hh = 0.4 + (hh - 0.4) * 0.72;
      if (hh < -7) hh = -7 + (hh + 7) * 0.3;
      h[j * V + i] = hh;
    }
    }
    // edges are always deep sea
    for (j = 0; j < V; j++) for (i = 0; i < V; i++) {
      var edge = Math.min(i, j, N - i, N - j);
      if (edge < 10) h[j * V + i] = Math.min(h[j * V + i], -1.5 - (10 - edge) * 0.45);
    }

    /* ---- priority flood: fill depressions so every drop of rain reaches the sea ---- */
    var F = new Float32Array(V * V), done = new Uint8Array(V * V), heap = new Heap(V * V);
    for (j = 0; j < V; j++) for (i = 0; i < V; i++) {
      if (i === 0 || j === 0 || i === N || j === N) { k = j * V + i; F[k] = h[k]; done[k] = 1; heap.push(F[k], k); }
    }
    var order = new Int32Array(V * V), on = 0, EPS = 0.0005;
    while (heap.n) {
      k = heap.pop(); order[on++] = k;
      var ki = k % V, kj = (k / V) | 0;
      for (var q = 0; q < 4; q++) {
        var ni = ki + DX[q], nj = kj + DZ[q];
        if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
        var nk = nj * V + ni;
        if (done[nk]) continue;
        done[nk] = 1;
        F[nk] = Math.max(h[nk], F[k] + EPS);
        heap.push(F[nk], nk);
      }
    }

    /* ---- flow accumulation on the filled surface (highest first) ---- */
    var acc = new Float32Array(V * V), down = new Int32Array(V * V), ci, cj;
    var rainF = coarse(function (x, z) { return nM(x * 3 * K, z * 3 * K); }, KR(48));
    for (k = 0; k < V * V; k++) {
      x = (k % V) / N; z = ((k / V) | 0) / N;
      acc[k] = 0.6 + 0.4 * (rainF(x, z) + 1) * 0.5; // rain, a bit uneven
      down[k] = -1;
    }
    for (var o = on - 1; o >= 0; o--) {
      k = order[o];
      ci = k % V; cj = (k / V) | 0; var best = -1, bh = F[k];
      for (q = 0; q < 8; q++) {
        ni = ci + DX[q]; nj = cj + DZ[q];
        if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
        nk = nj * V + ni;
        if (F[nk] < bh) { bh = F[nk]; best = nk; }
      }
      down[k] = best;
      if (best >= 0) acc[best] += acc[k];
    }

    /* ---- water: sea, lakes, rivers ---- */
    var W = new Float32Array(V * V), river = new Uint8Array(V * V);
    var NONE = -99;
    var RIVER_T = 260 * (0.8 + r() * 0.5) * (arch === "delta" ? 0.45 : arch === "lakes" ? 0.8 : 1);
    for (k = 0; k < V * V; k++) W[k] = NONE;
    // lakes: only depressions deeper than LAKE_D hold water (plus a shallow shore around them);
    // shallower dips are filled in as flat dry ground, so the island isn't all puddles
    var LAKE_D = 1.2, lake = new Uint8Array(V * V);
    for (k = 0; k < V * V; k++) {
      if (F[k] <= SB.SEA + 0.002 && h[k] < SB.SEA) { W[k] = SB.SEA; continue; }
      if (F[k] > SB.SEA && F[k] - h[k] > LAKE_D) lake[k] = 1;
    }
    for (var pass = 0; pass < 3; pass++) {
      var grow = [];
      for (k = 0; k < V * V; k++) {
        if (lake[k] || !(F[k] - h[k] > 0.01) || F[k] <= SB.SEA) continue;
        ci = k % V; cj = (k / V) | 0;
        for (q = 0; q < 4; q++) {
          ni = ci + DX[q]; nj = cj + DZ[q];
          if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
          if (lake[nj * V + ni]) { grow.push(k); break; }
        }
      }
      for (q = 0; q < grow.length; q++) lake[grow[q]] = 1;
    }
    for (k = 0; k < V * V; k++) {
      if (W[k] !== NONE) continue;
      if (lake[k]) W[k] = F[k] - 0.02;
      else if (F[k] - h[k] > 0.0001 && F[k] > SB.SEA) h[k] = F[k] + 0.03;
    }
    for (k = 0; k < V * V; k++) {
      if (W[k] !== NONE || acc[k] < RIVER_T || h[k] <= SB.SEA) continue;
      var depth = Math.min(1.1, 0.28 + 0.16 * Math.log(acc[k] / RIVER_T + 1));
      river[k] = 1;
      W[k] = F[k] - depth * 0.3;
      h[k] = Math.min(h[k], F[k] - depth);
    }
    // widen rivers: every river vertex wets its 4 neighbours, big rivers a 2-wide band
    var rv = [];
    for (k = 0; k < V * V; k++) if (river[k]) rv.push(k);
    for (var ri = 0; ri < rv.length; ri++) {
      k = rv[ri];
      ci = k % V; cj = (k / V) | 0;
      var big = acc[k] > RIVER_T * 4, rad = big ? 2 : 1;
      for (var dzz = -rad; dzz <= rad; dzz++) for (var dxx = -rad; dxx <= rad; dxx++) {
        if (Math.abs(dxx) + Math.abs(dzz) > rad) continue;
        ni = ci + dxx; nj = cj + dzz;
        if (ni < 1 || nj < 1 || ni >= N || nj >= N) continue;
        nk = nj * V + ni;
        if (W[nk] !== NONE && !river[nk]) continue;
        var target = W[k] - 0.22;
        if (h[nk] - W[k] > 1.4) continue; // don't cut through hills
        if (h[nk] > target) h[nk] = target;
        if (W[nk] === NONE || W[nk] < W[k]) W[nk] = W[k];
        river[nk] = 1;
      }
    }
    // water-free vertices next to water copy the lowest neighbouring water level, so the water mesh edges tuck into the banks
    var W2 = new Float32Array(W);
    for (k = 0; k < V * V; k++) {
      if (W[k] !== NONE) continue;
      ci = k % V; cj = (k / V) | 0;
      var lo = 1e9;
      for (q = 0; q < 8; q++) {
        ni = ci + DX[q]; nj = cj + DZ[q];
        if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
        nk = nj * V + ni;
        if (W[nk] !== NONE && W[nk] < lo) lo = W[nk];
      }
      if (lo < 1e9) W2[k] = Math.min(lo, h[k] - 0.06);
    }
    W = W2;

    /* ---- distance to water (for moisture, beaches, reeds) ---- */
    var wdist = new Float32Array(V * V);
    var queue = new Int32Array(V * V), qh = 0, qt = 0;
    for (k = 0; k < V * V; k++) {
      if (W[k] !== NONE && W[k] > h[k]) { wdist[k] = 0; queue[qt++] = k; } else wdist[k] = 1e9;
    }
    while (qh < qt) {
      k = queue[qh++]; ci = k % V; cj = (k / V) | 0;
      for (q = 0; q < 4; q++) {
        ni = ci + DX[q]; nj = cj + DZ[q];
        if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
        nk = nj * V + ni;
        if (wdist[nk] > wdist[k] + 1) { wdist[nk] = wdist[k] + 1; queue[qt++] = nk; }
      }
    }
    var oceanDist = new Float32Array(V * V);
    qh = 0; qt = 0;
    for (k = 0; k < V * V; k++) { if (W[k] === SB.SEA && h[k] < SB.SEA) { oceanDist[k] = 0; queue[qt++] = k; } else oceanDist[k] = 1e9; }
    while (qh < qt) {
      k = queue[qh++]; ci = k % V; cj = (k / V) | 0;
      for (q = 0; q < 4; q++) {
        ni = ci + DX[q]; nj = cj + DZ[q];
        if (ni < 0 || nj < 0 || ni > N || nj > N) continue;
        nk = nj * V + ni;
        if (oceanDist[nk] > oceanDist[k] + 1) { oceanDist[nk] = oceanDist[k] + 1; queue[qt++] = nk; }
      }
    }

    /* ---- climate and biomes (per tile) ---- */
    var biome = new Uint8Array(N * N), temp = new Float32Array(N * N), moist = new Float32Array(N * N), slope = new Float32Array(N * N);
    var tileH = new Float32Array(N * N);
    var warmSouth = r.chance(0.5) ? 1 : -1;
    var tempF, moistF, specF, varF = null, reefF = null;
    if (G2) {
      // generator 2: climate measured in tiles, not in islands, with long wavelengths, so biomes are big
      // places (a few hundred tiles of forest, not a patch) and a bigger island simply has more of them
      var nV = SB.noise2(seed + 707), nR = SB.noise2(seed + 808), CW = N / 420, MW = N / 340, SW = N / 170, VW = N / 300;
      tempF = coarse(function (x, z) { return fbm(nT, x * CW, z * CW, 2, 2, 0.4); }, Math.max(16, N >> 4));
      moistF = coarse(function (x, z) { return fbm(nM, x * MW + 9, z * MW - 4, 2, 2, 0.4); }, Math.max(16, N >> 4));
      specF = coarse(function (x, z) { return nP(x * SW, z * SW); }, Math.max(24, N >> 3));
      varF = coarse(function (x, z) { return fbm(nV, x * VW + 3, z * VW + 1, 2, 2, 0.45); }, Math.max(16, N >> 4));
      reefF = coarse(function (x, z) { return nR(x * N / 60, z * N / 60); }, Math.max(24, N >> 3));
    } else {
    tempF = coarse(function (x, z) { return nT(x * 2.2 * Math.sqrt(K), z * 2.2 * Math.sqrt(K)); }, KR(48)); moistF = coarse(function (x, z) { return nM(x * 2.6 * Math.sqrt(K) + 9, z * 2.6 * Math.sqrt(K) - 4); }, KR(48));
    specF = coarse(function (x, z) { return nP(x * 5.5 * K, z * 5.5 * K); }, KR(96));
    }
    var archT = arch === "mesa" ? 0.08 : arch === "volcano" ? 0.04 : 0, archM = arch === "mesa" ? -0.12 : arch === "delta" || arch === "lakes" ? 0.08 : 0;
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var t = j * N + i, a = j * V + i;
      var h00 = h[a], h10 = h[a + 1], h01 = h[a + V], h11 = h[a + V + 1];
      var th = (h00 + h10 + h01 + h11) / 4;
      tileH[t] = th;
      slope[t] = Math.max(Math.abs(h00 - h11), Math.abs(h10 - h01));
      x = (i + 0.5) / N; z = (j + 0.5) / N;
      var tt = 0.56 + (WO.temp || 0) + (z - 0.5) * 0.85 * warmSouth + tempF(x, z) * 0.17 - Math.max(0, th - 4) * 0.026;
      var wd = Math.min(wdist[a], wdist[a + V + 1]);
      var mm = 0.36 + (WO.moist || 0) + moistF(x, z) * 0.4 + Math.max(0, 1 - wd / 16) * 0.28;
      if (G2) { tt += archT - (z - 0.5) * 0.2 * warmSouth + Math.max(0, th - 4) * 0.008; mm += archM; }
      temp[t] = SB.clamp01(tt); moist[t] = SB.clamp01(mm);
      var wet = W[a] !== NONE && W[a] > h00 + 0.05 && W[a + V + 1] !== NONE && W[a + V + 1] > h11 + 0.05;
      var bm;
      if (G2) {
        bm = biome2(th, tt, mm, slope[t], W[a] === SB.SEA, oceanDist[a], varF(x, z), specF(x, z), reefF(x, z), feat, i, j);
        if (bm === B.ash) temp[t] = SB.clamp01(tt + 0.14); // warm ground
        biome[t] = bm;
        continue;
      }
      if (th < SB.SEA - 0.15 && W[a] === SB.SEA) bm = B.ocean;
      else if (oceanDist[a] < 4 && th < 1.4 && slope[t] < 1.2) bm = tt < 0.2 ? B.tundra : B.beach;
      else if (th > 12.5 || (th > 8 && slope[t] > 1.5)) bm = B.mountain;
      else if (tt < 0.2) bm = B.tundra;
      else if (tt < 0.36) bm = mm > 0.42 ? B.taiga : B.tundra;
      else if (tt > 0.72) bm = mm < 0.34 ? B.desert : mm < 0.56 ? B.savanna : B.jungle;
      else if (mm > 0.78 && th < 2.6) bm = B.swamp;
      else if (mm > 0.55) bm = B.forest;
      else bm = B.meadow;
      // rare special places
      var sp = specF(x, z);
      if ((bm === B.forest || bm === B.swamp || bm === B.taiga) && sp > 0.62) bm = B.shroom;
      if ((bm === B.meadow || bm === B.tundra || bm === B.mountain || bm === B.savanna) && sp < -0.66 && th > 3) bm = B.crystal;
      if (wet && bm !== B.ocean) { /* river/lake bed keeps its land biome for colour under water */ }
      biome[t] = bm;
    }

    var terrain = {
      seed: seed, N: N, V: V, h: h, W: W, NONE: NONE, river: river, acc: acc, wdist: wdist, oceanDist: oceanDist,
      biome: biome, temp: temp, moist: moist, slope: slope, tileH: tileH, warmSouth: warmSouth,
      nodes: [], decor: null, caves: [], spawn: null, gv: G2 ? 2 : 1, arch: arch || "classic", volcano: feat.volcano || null
    };

    placeNodes(terrain, r, nP);
    terrain.decor = null; // see WG.decorChunk
    terrain.genMs = Date.now() - t0;
    return terrain;
  };

  /* ---------------- sampling ---------------- */

  // Height on the exact rendered triangles (diagonal from (i,j) to (i+1,j+1)).
  WG.heightAt = function (T, x, z) {
    var n = T.N, v = T.V, h = T.h;
    if (x < 0) x = 0; if (z < 0) z = 0; if (x > n - 0.001) x = n - 0.001; if (z > n - 0.001) z = n - 0.001;
    var i = x | 0, j = z | 0, fx = x - i, fz = z - j, a = j * v + i;
    var h00 = h[a], h10 = h[a + 1], h01 = h[a + v], h11 = h[a + v + 1];
    if (fx > fz) return h00 + (h10 - h00) * fx + (h11 - h10) * fz;
    return h00 + (h11 - h01) * fx + (h01 - h00) * fz;
  };
  // Water surface (bilinear), or NONE.
  WG.waterAt = function (T, x, z) {
    var n = T.N, v = T.V, w = T.W, NONE = T.NONE;
    if (x < 0) x = 0; if (z < 0) z = 0; if (x > n - 0.001) x = n - 0.001; if (z > n - 0.001) z = n - 0.001;
    var i = x | 0, j = z | 0, fx = x - i, fz = z - j, a = j * v + i;
    var w00 = w[a], w10 = w[a + 1], w01 = w[a + v], w11 = w[a + v + 1];
    if (w00 === NONE && w10 === NONE && w01 === NONE && w11 === NONE) return NONE;
    var lo = 1e9;
    if (w00 !== NONE && w00 < lo) lo = w00; if (w10 !== NONE && w10 < lo) lo = w10;
    if (w01 !== NONE && w01 < lo) lo = w01; if (w11 !== NONE && w11 < lo) lo = w11;
    if (w00 === NONE) w00 = lo; if (w10 === NONE) w10 = lo; if (w01 === NONE) w01 = lo; if (w11 === NONE) w11 = lo;
    return (w00 * (1 - fx) + w10 * fx) * (1 - fz) + (w01 * (1 - fx) + w11 * fx) * fz;
  };
  // How deep the water is at x,z (0 when dry).
  WG.depthAt = function (T, x, z) {
    var w = WG.waterAt(T, x, z);
    if (w === T.NONE) return 0;
    var d = w - WG.heightAt(T, x, z);
    return d > 0 ? d : 0;
  };
  WG.biomeAt = function (T, x, z) {
    var i = SB.clamp(x | 0, 0, T.N - 1), j = SB.clamp(z | 0, 0, T.N - 1);
    return T.biome[j * T.N + i];
  };
  WG.tempAt = function (T, x, z) {
    var i = SB.clamp(x | 0, 0, T.N - 1), j = SB.clamp(z | 0, 0, T.N - 1);
    return T.temp[j * T.N + i];
  };
  WG.slopeAt = function (T, x, z) {
    var i = SB.clamp(x | 0, 0, T.N - 1), j = SB.clamp(z | 0, 0, T.N - 1);
    return T.slope[j * T.N + i];
  };
  // can a walker stand here? (deep water and cliffs are not walkable; fins/floating change this, see creature.js)
  WG.walkable = function (T, x, z, swim) {
    if (x < 2 || z < 2 || x > T.N - 2 || z > T.N - 2) return false;
    var d = WG.depthAt(T, x, z);
    if (d > (swim ? 99 : 0.45)) return false;
    return WG.slopeAt(T, x, z) < 2.6;
  };

  /* ---------------- resource nodes ---------------- */

  // per biome: [kind, chance per 2x2 cell]
  var FLORA = {};
  FLORA[B.meadow] = [["oak", 0.05], ["bush", 0.05], ["boulder", 0.012], ["herbs", 0.006], ["birch", 0.012], ["shrooms", 0.004]];
  FLORA[B.forest] = [["oak", 0.2], ["birch", 0.12], ["bush", 0.05], ["herbs", 0.014], ["shrooms", 0.012], ["boulder", 0.01], ["deadtree", 0.012]];
  FLORA[B.jungle] = [["giant", 0.1], ["palm", 0.12], ["bush", 0.07], ["herbs", 0.02], ["boulder", 0.006]];
  FLORA[B.savanna] = [["palm", 0.02], ["deadtree", 0.018], ["bush", 0.02], ["boulder", 0.012], ["flintrock", 0.006]];
  FLORA[B.desert] = [["cactus", 0.04], ["boulder", 0.014], ["flintrock", 0.01], ["deadtree", 0.006]];
  FLORA[B.swamp] = [["deadtree", 0.05], ["shrooms", 0.03], ["herbs", 0.03], ["birch", 0.03], ["reeds", 0.05]];
  FLORA[B.taiga] = [["pine", 0.22], ["boulder", 0.018], ["bush", 0.02], ["deadtree", 0.01]];
  FLORA[B.tundra] = [["pine", 0.025], ["boulder", 0.02], ["flintrock", 0.006]];
  FLORA[B.mountain] = [["boulder", 0.04], ["flintrock", 0.022], ["orevein", 0.018], ["pine", 0.012]];
  FLORA[B.beach] = [["palm", 0.03], ["boulder", 0.006]];
  FLORA[B.shroom] = [["shroomtree", 0.16], ["shrooms", 0.04], ["herbs", 0.02], ["crystals", 0.004]];
  FLORA[B.crystal] = [["crystals", 0.04], ["boulder", 0.03], ["orevein", 0.01], ["flintrock", 0.01]];
  FLORA[B.blossom] = [["sakura", 0.16], ["bush", 0.05], ["herbs", 0.015], ["boulder", 0.008], ["hive", 0.006]];
  FLORA[B.maple] = [["maple", 0.2], ["oak", 0.04], ["shrooms", 0.02], ["bush", 0.03], ["boulder", 0.01]];
  FLORA[B.ash] = [["basalt", 0.05], ["vent", 0.012], ["deadtree", 0.02], ["flintrock", 0.01], ["orevein", 0.008]];
  FLORA[B.mangrove] = [["mangrove", 0.14], ["reeds", 0.06], ["herbs", 0.01], ["palm", 0.02]];
  FLORA[B.bamboo] = [["bamboo", 0.3], ["bush", 0.04], ["herbs", 0.02], ["giant", 0.02]];
  FLORA[B.mesa] = [["redrock", 0.04], ["cactus", 0.02], ["orevein", 0.014], ["deadtree", 0.01], ["flintrock", 0.008]];
  FLORA[B.flowers] = [["bush", 0.05], ["hive", 0.012], ["herbs", 0.02], ["oak", 0.012], ["sakura", 0.006]];

  function placeNodes(T, r, nP) {
    var Nn = T.N, nodes = T.nodes, occ = new Uint8Array(Nn * Nn);
    var id = 1;
    function free(x, z, rad) {
      var r0 = Math.ceil(rad);
      for (var dz = -r0; dz <= r0; dz++) for (var dx = -r0; dx <= r0; dx++) {
        var i = (x | 0) + dx, j = (z | 0) + dz;
        if (i < 0 || j < 0 || i >= Nn || j >= Nn) return false;
        if (occ[j * Nn + i]) return false;
      }
      return true;
    }
    function mark(x, z, rad) {
      var r0 = Math.max(0, Math.round(rad) - 0);
      for (var dz = -r0; dz <= r0; dz++) for (var dx = -r0; dx <= r0; dx++) {
        var i = (x | 0) + dx, j = (z | 0) + dz;
        if (i >= 0 && j >= 0 && i < Nn && j < Nn) occ[j * Nn + i] = 1;
      }
    }
    function add(kind, x, z, s) {
      var n = { id: id++, kind: kind, x: x, z: z, s: s || 1, rot: r() * 6.283, seed: (r() * 1e9) | 0 };
      nodes.push(n);
      mark(x, z, SB.NODES[kind].r * (s || 1));
      return n;
    }
    T.addNode = add;

    for (var cj = 2; cj < Nn - 2; cj += 2) for (var ci = 2; ci < Nn - 2; ci += 2) {
      var x = ci + r() * 2, z = cj + r() * 2;
      var t = (z | 0) * Nn + (x | 0), bm = T.biome[t];
      var list = FLORA[bm];
      if (!list) continue;
      if (WG.depthAt(T, x, z) > 0.02 || T.slope[t] > 2.2) continue;
      var a = (z | 0) * T.V + (x | 0);
      // clumping: a low-frequency noise makes groves and clearings
      var clump = 0.55 + 0.9 * (nP(x * 0.06 + 31, z * 0.06 - 17) + 1) * 0.5;
      for (var li = 0; li < list.length; li++) {
        var kind = list[li][0], p = list[li][1];
        var isTree = SB.NODES[kind].noun === "plant" && kind !== "bush" && kind !== "reeds" && kind !== "herbs";
        if (isTree) p *= clump;
        if (r() >= p) continue;
        var s = isTree ? r.range(0.75, 1.25) : r.range(0.8, 1.15);
        if (kind === "giant") s = r.range(0.9, 1.3);
        if (!free(x, z, SB.NODES[kind].r * s + 0.4)) break;
        if (T.wdist[a] < 1.5 && kind !== "reeds") break;
        add(kind, x, z, s);
        break;
      }
    }
    // reeds and clay along fresh water and shores
    for (var k = 0; k < 2600; k++) {
      x = 3 + r() * (Nn - 6); z = 3 + r() * (Nn - 6);
      var a2 = (z | 0) * T.V + (x | 0), t2 = (z | 0) * Nn + (x | 0);
      if (T.wdist[a2] < 1 || T.wdist[a2] > 3) continue;
      if (WG.depthAt(T, x, z) > 0.05) continue;
      var tb = T.biome[t2];
      if (tb === B.tundra || tb === B.mountain || tb === B.ocean) continue;
      var fresh = T.oceanDist[a2] > 6;
      if (r() < (fresh ? 0.6 : 0.15) && free(x, z, 0.6)) add(r() < 0.72 ? "reeds" : "claybank", x, z, r.range(0.8, 1.1));
    }

    // grump caves: at the foot of steep slopes, away from the middle
    var caves = [];
    var KK = T.N / 256, nCaves = T.gv >= 2 ? Math.min(14, Math.round(4 * KK * KK * 0.6)) : 4;
    for (k = 0; k < 6000 * (T.gv >= 2 ? KK * KK : 1) && caves.length < nCaves; k++) {
      x = 12 + r() * (Nn - 24); z = 12 + r() * (Nn - 24);
      var t3 = (z | 0) * Nn + (x | 0);
      var bm3 = T.biome[t3];
      if (bm3 === B.ocean || bm3 === B.beach) continue;
      if (T.slope[t3] < 0.6 || T.slope[t3] > 1.6) continue;
      if (WG.depthAt(T, x, z) > 0) continue;
      var ok = true;
      for (var c = 0; c < caves.length; c++) if (SB.dist(x, z, caves[c].x, caves[c].z) < 60) ok = false;
      if (!ok || !free(x, z, 1.5)) continue;
      caves.push(add("cave", x, z, 1));
    }
    T.caves = caves;

    // the nest: a temperate, walkable spot near fresh water and fruit, not too close to a cave
    var best = null, bestS = -1e9;
    for (k = 0; k < 4000; k++) {
      x = 30 + r() * (Nn - 60); z = 30 + r() * (Nn - 60);
      var t4 = (z | 0) * Nn + (x | 0), a4 = (z | 0) * T.V + (x | 0), bm4 = T.biome[t4];
      if (bm4 !== B.meadow && bm4 !== B.forest && bm4 !== B.flowers && bm4 !== B.blossom && bm4 !== B.maple) continue;
      if (T.slope[t4] > 0.6 || WG.depthAt(T, x, z) > 0) continue;
      var sc = 0;
      sc -= Math.abs(T.wdist[a4] - 7) * 0.6;
      sc -= Math.abs(T.temp[t4] - 0.55) * 20;
      sc -= SB.dist(x, z, Nn / 2, Nn / 2) * 0.05;
      for (c = 0; c < caves.length; c++) { var cd = SB.dist(x, z, caves[c].x, caves[c].z); if (cd < 45) sc -= (45 - cd) * 0.5; }
      var trees = 0;
      for (var ni = 0; ni < nodes.length; ni += 3) { var nd = nodes[ni]; if ((nd.kind === "oak" || nd.kind === "bush") && SB.dist2(nd.x, nd.z, x, z) < 225) trees++; }
      sc += Math.min(6, trees) * 0.8;
      if (!free(x, z, 1.2)) sc -= 5;
      if (sc > bestS) { bestS = sc; best = { x: x, z: z }; }
    }
    if (!best) {
      // no temperate meadow anywhere (a frozen or desert island): the flattest dry spot nearest the middle
      for (var sr = 0; sr < Nn / 2 && !best; sr += 2) for (var sa = 0; sa < 24 && !best; sa++) {
        var bx = Nn / 2 + Math.cos(sa / 24 * 6.283) * sr, bz = Nn / 2 + Math.sin(sa / 24 * 6.283) * sr, bt = (bz | 0) * Nn + (bx | 0);
        if (WG.walkable(T, bx, bz) && WG.depthAt(T, bx, bz) === 0 && T.slope[bt] < 0.8 && T.biome[bt] !== B.ocean) best = { x: bx, z: bz };
      }
      if (!best) best = { x: Nn / 2, z: Nn / 2 };
    }
    // clear the spot and guarantee a starter kit around it
    for (var n = nodes.length - 1; n >= 0; n--) if (SB.dist2(nodes[n].x, nodes[n].z, best.x, best.z) < 9) { nodes.splice(n, 1); }
    for (var cz = -2; cz <= 2; cz++) for (var cx = -2; cx <= 2; cx++) { var ti = ((best.z | 0) + cz) * Nn + (best.x | 0) + cx; if (ti >= 0 && ti < occ.length) occ[ti] = 0; }
    T.spawn = best;
    T.nest = add("nest", best.x, best.z, 1);
    function ensure(kind, count, rmin, rmax) {
      var have = 0;
      for (var q = 0; q < nodes.length; q++) if (nodes[q].kind === kind && SB.dist(nodes[q].x, nodes[q].z, best.x, best.z) < rmax) have++;
      for (var tries = 0; have < count && tries < 400; tries++) {
        var aa = r() * 6.283, rr = r.range(rmin, rmax);
        var px = best.x + Math.cos(aa) * rr, pz = best.z + Math.sin(aa) * rr;
        if (!WG.walkable(T, px, pz) || WG.depthAt(T, px, pz) > 0 || !free(px, pz, 0.8)) continue;
        add(kind, px, pz, r.range(0.9, 1.1));
        have++;
      }
    }
    ensure("oak", 3, 4, 11);
    ensure("bush", 2, 3, 9);
    ensure("boulder", 1, 6, 14);
    ensure("herbs", 1, 6, 16);
    ensure("shrooms", 1, 9, 18);
    ensure("pine", 1, 10, 22);
    ensure("flintrock", 1, 12, 30);

    // v2.1 food plants. Placed last, from their own random stream, so islands from older saves keep every
    // node they had (same ids, same spots) and simply gain these.
    var r2 = SB.rng((T.seed * 31 + 977) >>> 0);
    function add2(kind, x, z, s) {
      var n = { id: id++, kind: kind, x: x, z: z, s: s || 1, rot: r2() * 6.283, seed: (r2() * 1e9) | 0 };
      nodes.push(n); mark(x, z, SB.NODES[kind].r * (s || 1));
      return n;
    }
    var EXTRA = {};
    EXTRA[B.meadow] = [["roots", 0.022], ["gourds", 0.008]];
    EXTRA[B.forest] = [["hive", 0.01], ["roots", 0.008], ["gourds", 0.005]];
    EXTRA[B.jungle] = [["gourds", 0.012], ["hive", 0.008]];
    EXTRA[B.savanna] = [["roots", 0.02], ["gourds", 0.01]];
    EXTRA[B.swamp] = [["roots", 0.01]];
    EXTRA[B.taiga] = [["roots", 0.006], ["hive", 0.004]];
    EXTRA[B.flowers] = [["roots", 0.02], ["gourds", 0.008]];
    EXTRA[B.blossom] = [["roots", 0.01]];
    EXTRA[B.maple] = [["gourds", 0.01], ["roots", 0.006]];
    EXTRA[B.bamboo] = [["gourds", 0.008]];
    for (var ej = 3; ej < Nn - 3; ej += 2) for (var ei = 3; ei < Nn - 3; ei += 2) {
      var ex = ei + r2() * 2, ez = ej + r2() * 2, et = (ez | 0) * Nn + (ex | 0), elist = EXTRA[T.biome[et]];
      if (!elist || WG.depthAt(T, ex, ez) > 0.02 || T.slope[et] > 1.6 || T.wdist[(ez | 0) * T.V + (ex | 0)] < 1.5) continue;
      for (var el = 0; el < elist.length; el++) {
        if (r2() >= elist[el][1]) continue;
        var es = r2.range(0.85, 1.15);
        if (free(ex, ez, SB.NODES[elist[el][0]].r * es + 0.4)) add2(elist[el][0], ex, ez, es);
        break;
      }
    }
    // clam beds on sandy shores
    for (k = 0; k < 3000; k++) {
      x = 3 + r2() * (Nn - 6); z = 3 + r2() * (Nn - 6);
      var ta = (z | 0) * T.V + (x | 0), tt = (z | 0) * Nn + (x | 0);
      if ((T.biome[tt] !== B.beach && T.biome[tt] !== B.mangrove) || T.wdist[ta] > 2 || WG.depthAt(T, x, z) > 0.05) continue;
      if (r2() < 0.25 && free(x, z, 0.6)) add2("clams", x, z, r2.range(0.85, 1.1));
    }
    // every nest gets a sunroot patch and a gourd vine within reach
    function ensure2(kind, rmin, rmax) {
      for (var q = 0; q < nodes.length; q++) if (nodes[q].kind === kind && SB.dist(nodes[q].x, nodes[q].z, best.x, best.z) < rmax) return;
      for (var tries = 0; tries < 400; tries++) {
        var aa = r2() * 6.283, rr = r2.range(rmin, rmax), px = best.x + Math.cos(aa) * rr, pz = best.z + Math.sin(aa) * rr;
        if (!WG.walkable(T, px, pz) || WG.depthAt(T, px, pz) > 0 || !free(px, pz, 0.8)) continue;
        add2(kind, px, pz, r2.range(0.9, 1.1)); return;
      }
    }
    ensure2("roots", 5, 14);
    ensure2("gourds", 8, 20);

    // thought crystals within a thinker's round: the glow that makes ascended smols is practised by crystals, and many
    // islands (most v4 ones) put the crystal steppes 60-130 tiles from the nest. With none within 50, a small patch
    // 30-50 tiles out, from its own random stream and its own id range (CRYSTAL_ID0), so nothing else on the island moves
    var nearCry = nodes.some(function (n) { return n.kind === "crystals" && SB.dist(n.x, n.z, best.x, best.z) < 50; });
    if (!nearCry) {
      var r3 = SB.rng((T.seed * 53 + 4111) >>> 0), cn = 0, ca = r3() * 6.283;
      for (var ct = 0; ct < 600 && cn < 3; ct++) {
        if (ct % 60 === 59) ca = r3() * 6.283; // that way's no good: try another
        var cr = cn ? 2 + r3() * 3 : r3.range(30, 50), cx0 = cn ? T._cry.x : best.x, cz0 = cn ? T._cry.z : best.z, ang = cn ? r3() * 6.283 : ca + r3.range(-0.5, 0.5);
        var qx = cx0 + Math.cos(ang) * cr, qz = cz0 + Math.sin(ang) * cr, qt = (qz | 0) * Nn + (qx | 0);
        if (qx < 3 || qz < 3 || qx > Nn - 3 || qz > Nn - 3 || !WG.walkable(T, qx, qz) || WG.depthAt(T, qx, qz) > 0 || T.slope[qt] > 1.4 || !free(qx, qz, 0.9)) continue;
        var cnode = { id: WG.CRYSTAL_ID0 + cn, kind: "crystals", x: qx, z: qz, s: r3.range(0.85, 1.1), rot: r3() * 6.283, seed: (r3() * 1e9) | 0, patch: 1 };
        nodes.push(cnode); mark(qx, qz, SB.NODES.crystals.r * cnode.s);
        if (!cn) T._cry = { x: qx, z: qz };
        cn++;
      }
    }
  }
  WG.CRYSTAL_ID0 = 2e7;

  /* ---------------- decorations (render only) ----------------
     Float32Array of [x, z, type, scale, rot] per item. Types: 0 grass, 1 flower, 2 pebble, 3 fern, 4 snowtuft, 5 cattail, 6 glowdot */
  var DECOR = {};
  DECOR[B.meadow] = [[0, 0.5], [1, 0.25], [2, 0.03]];
  DECOR[B.forest] = [[0, 0.3], [3, 0.2], [1, 0.05], [2, 0.03]];
  DECOR[B.jungle] = [[3, 0.45], [0, 0.25], [1, 0.08]];
  DECOR[B.savanna] = [[0, 0.35], [2, 0.04]];
  DECOR[B.desert] = [[2, 0.05]];
  DECOR[B.swamp] = [[5, 0.25], [0, 0.2], [3, 0.1]];
  DECOR[B.taiga] = [[3, 0.15], [0, 0.12], [4, 0.05]];
  DECOR[B.tundra] = [[4, 0.12], [2, 0.03]];
  DECOR[B.mountain] = [[2, 0.08]];
  DECOR[B.beach] = [[2, 0.03]];
  DECOR[B.shroom] = [[6, 0.3], [3, 0.15]];
  DECOR[B.crystal] = [[6, 0.15], [2, 0.08]];
  // v3.7 types: 7 petals, 8 leaf pile, 9 ember, 10 dry grass, 11 tall flowers
  DECOR[B.blossom] = [[7, 0.35], [0, 0.3], [1, 0.08]];
  DECOR[B.maple] = [[8, 0.3], [3, 0.12], [0, 0.12]];
  DECOR[B.ash] = [[9, 0.05], [2, 0.12]];
  DECOR[B.mangrove] = [[5, 0.25], [3, 0.15]];
  DECOR[B.bamboo] = [[3, 0.35], [0, 0.2]];
  DECOR[B.mesa] = [[10, 0.12], [2, 0.08]];
  DECOR[B.flowers] = [[11, 0.35], [1, 0.35], [0, 0.25]];

  // decor is made per chunk when the renderer first needs it (a 1024 island has millions of tufts)
  WG.decorChunk = function (T, ci, cj) {
    var S = SB.CHUNK, key = cj * (T.N / S) + ci, cache = T._decor || (T._decor = {});
    if (cache[key]) return cache[key];
    return (cache[key] = makeDecor(T, SB.rng((T.seed * 3 + 1 + key * 7919) >>> 0), ci * S, cj * S, S));
  };
  function makeDecor(T, r, i0, j0, S) {
    var out = [], Nn = T.N, i1 = Math.min(Nn - 1, i0 + S), j1 = Math.min(Nn - 1, j0 + S);
    for (var j = Math.max(1, j0); j < j1; j++) for (var i = Math.max(1, i0); i < i1; i++) {
      var t = j * Nn + i, list = DECOR[T.biome[t]];
      if (!list) continue;
      for (var k = 0; k < 2; k++) {
        var x = i + r(), z = j + r();
        if (WG.depthAt(T, x, z) > 0.01) continue;
        for (var li = 0; li < list.length; li++) {
          if (r() < list[li][1]) { out.push(x, z, list[li][0], r.range(0.7, 1.3), r() * 6.283); break; }
        }
      }
    }
    return new Float32Array(out);
  }

  /* ---------------- minimap ----------------
     RGBA bytes (N*N*4) for a canvas ImageData: biome colours, shaded by slope, water in blue. */
  WG.minimap = function (T) {
    var Nn = T.N, out = new Uint8ClampedArray(Nn * Nn * 4);
    for (var j = 0; j < Nn; j++) for (var i = 0; i < Nn; i++) {
      var t = j * Nn + i, a = j * T.V + i, bm = SB.BIOMES[T.biome[t]];
      var c = SB.hex(bm.c[0]);
      var sh = (T.h[a + 1] - T.h[a]) * 0.12 + (T.h[a + T.V] - T.h[a]) * 0.08;
      var l = 1 - sh;
      var d = WG.depthAt(T, i + 0.5, j + 0.5);
      if (d > 0.02) { var wcol = SB.mixC([0.42, 0.78, 0.86], [0.12, 0.33, 0.55], Math.min(1, d / 4)); c = wcol; l = 1; }
      out[t * 4] = Math.min(255, c[0] * 255 * l); out[t * 4 + 1] = Math.min(255, c[1] * 255 * l); out[t * 4 + 2] = Math.min(255, c[2] * 255 * l); out[t * 4 + 3] = 255;
    }
    return out;
  };
})();
