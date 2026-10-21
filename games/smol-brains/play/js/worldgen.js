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
      var fx = SB.clamp(x, 0, 1) * res, fz = SB.clamp(z, 0, 1) * res, i = Math.min(res - 1, fx | 0), j = Math.min(res - 1, fz | 0);
      var tx = fx - i, tz = fz - j, a = j * (res + 1) + i;
      return (g[a] * (1 - tx) + g[a + 1] * tx) * (1 - tz) + (g[a + res + 1] * (1 - tx) + g[a + res + 2] * tx) * tz;
    };
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

    /* ---- heights ---- */
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
    var RIVER_T = 260 * (0.8 + r() * 0.5);
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
    var tempF = coarse(function (x, z) { return nT(x * 2.2 * Math.sqrt(K), z * 2.2 * Math.sqrt(K)); }, KR(48)), moistF = coarse(function (x, z) { return nM(x * 2.6 * Math.sqrt(K) + 9, z * 2.6 * Math.sqrt(K) - 4); }, KR(48));
    var specF = coarse(function (x, z) { return nP(x * 5.5 * K, z * 5.5 * K); }, KR(96));
    for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
      var t = j * N + i, a = j * V + i;
      var h00 = h[a], h10 = h[a + 1], h01 = h[a + V], h11 = h[a + V + 1];
      var th = (h00 + h10 + h01 + h11) / 4;
      tileH[t] = th;
      slope[t] = Math.max(Math.abs(h00 - h11), Math.abs(h10 - h01));
      x = (i + 0.5) / N; z = (j + 0.5) / N;
      var tt = 0.56 + (z - 0.5) * 0.85 * warmSouth + tempF(x, z) * 0.17 - Math.max(0, th - 4) * 0.026;
      var wd = Math.min(wdist[a], wdist[a + V + 1]);
      var mm = 0.36 + moistF(x, z) * 0.4 + Math.max(0, 1 - wd / 16) * 0.28;
      temp[t] = SB.clamp01(tt); moist[t] = SB.clamp01(mm);
      var wet = W[a] !== NONE && W[a] > h00 + 0.05 && W[a + V + 1] !== NONE && W[a + V + 1] > h11 + 0.05;
      var bm;
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
      nodes: [], decor: null, caves: [], spawn: null
    };

    placeNodes(terrain, r, nP);
    terrain.decor = makeDecor(terrain, SB.rng(seed * 3 + 1));
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
    for (k = 0; k < 6000 && caves.length < 4; k++) {
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
      if (bm4 !== B.meadow && bm4 !== B.forest) continue;
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
    if (!best) best = { x: Nn / 2, z: Nn / 2 };
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
      if (T.biome[tt] !== B.beach || T.wdist[ta] > 2 || WG.depthAt(T, x, z) > 0.05) continue;
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
  }

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

  function makeDecor(T, r) {
    var out = [], Nn = T.N;
    for (var j = 1; j < Nn - 1; j++) for (var i = 1; i < Nn - 1; i++) {
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
