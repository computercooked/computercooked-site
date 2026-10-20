/* smol brains 2 — world.js
   The living island on top of the generated terrain: items (food, materials, tools, eggs, critters),
   resource nodes that drop things (trees, bushes, rocks), buildings, fires (campfires, torches, wildfires),
   time of day, seasons, weather with storms and lightning, grump nights and spatial lookups.
   Ids: creatures/items/buildings share game.nextId; nodes use NODE_ID0 + their worldgen id. */
(function () {
  "use strict";
  var SB = window.SB;
  var W = (SB.World = {});
  var WG = SB.WorldGen, K = SB.KINDS, NK = SB.NODES, SK = SB.STRUCTS;
  var NODE_ID0 = (W.NODE_ID0 = 1000000);
  var CELL = 8;
  var CAP_ITEMS = 420, CAP_FOOD_NEAR = 3;
  var GRAV = 18;

  function emit(ev, d) { SB.bus.emit(ev, d); }

  /* ---------------- create / revive ---------------- */

  W.create = function (game, seed) {
    var T = WG.generate(seed || game.seed);
    var world = {
      T: T, seed: T.seed, time: game.time,
      nodes: T.nodes, nodeById: {}, nodeGrid: null, nodesByChunk: null,
      items: [], itemGrid: null, creatureGrid: null, structures: [],
      weather: { kind: "clear", cloud: 0.2, rain: 0, wind: 0.4, t: 0, next: 90, storm: 0 },
      dayIndex: 0, night: false, season: 0, snowCover: 0, autumn: 0, freeze: 0,
      fires: [], bolts: [], nightGrumps: 0, wear: new Uint8Array(T.N * T.N),
      _critT: 3, _grumpT: 10, _houseT: 1, _boltT: 10, _pending: [], _fireT: 0,
      seen: new Uint8Array(W.SEEN_N * W.SEEN_N), seenDirty: true, biomesSeen: {}, _seeT: 0
    };
    initNodes(world, game);
    W.reveal(world, T.nest.x, T.nest.z, 15, true);
    return world;
  };

  /* ---------------- fog of war ---------------- */
  // the island starts under cloud. it clears wherever smols go and look (their view range), so exploring
  // matters: new places, new plants, new materials. cells are 4×4 tiles
  var FOW = 4;
  W.SEEN_N = SB.WORLD_N / FOW;
  W.reveal = function (world, x, z, r, quiet) {
    var S = W.SEEN_N, seen = world.seen;
    if (!seen) return 0;
    var c0 = Math.max(0, Math.floor((x - r) / FOW)), c1 = Math.min(S - 1, Math.floor((x + r) / FOW));
    var r0 = Math.max(0, Math.floor((z - r) / FOW)), r1 = Math.min(S - 1, Math.floor((z + r) / FOW)), n = 0;
    for (var j = r0; j <= r1; j++) for (var i = c0; i <= c1; i++) {
      var k = j * S + i;
      if (seen[k]) continue;
      var cx = (i + 0.5) * FOW, cz = (j + 0.5) * FOW;
      if ((cx - x) * (cx - x) + (cz - z) * (cz - z) > (r + 2) * (r + 2)) continue;
      seen[k] = 255; n++;
      (world.seenChunks || (world.seenChunks = {}))[Math.floor(cz / SB.CHUNK) * (SB.WORLD_N / SB.CHUNK) + Math.floor(cx / SB.CHUNK)] = 1; // the renderer rebuilds these
      var b = WG.biomeAt(world.T, cx, cz);
      if (b != null && !world.biomesSeen[b]) { world.biomesSeen[b] = 1; if (!quiet && b !== SB.B.ocean) emit("newBiome", { biome: b, x: cx, z: cz }); }
    }
    if (n) { world.seenDirty = true; world._miniSeenV = (world._miniSeenV || 0) + 1; }
    return n;
  };
  W.isSeen = function (world, x, z) {
    if (!world.seen) return true;
    var S = W.SEEN_N, i = Math.floor(x / FOW), j = Math.floor(z / FOW);
    if (i < 0 || j < 0 || i >= S || j >= S) return false;
    return world.seen[j * S + i] > 0;
  };
  W.seenFraction = function (world) { var n = 0, s = world.seen; for (var i = 0; i < s.length; i++) if (s[i]) n++; return n / s.length; };
  function revealTick(world, game, dt) {
    world._seeT -= dt;
    if (world._seeT > 0) return;
    world._seeT = 1;
    game.creatures.forEach(function (c) { if (c.alive && c.species === "smol" && !c.stranger) W.reveal(world, c.x, c.z, (c.viewR || 6) + 2); });
  }
  // saved as runs: "count,count,…" alternating unseen/seen
  function seenToString(s) { var out = [], v = 0, run = 0; for (var i = 0; i < s.length; i++) { var b = s[i] ? 1 : 0; if (b === v) run++; else { out.push(run); v = b; run = 1; } } out.push(run); return out.join(","); }
  function seenFromString(str, s) { var parts = String(str).split(","), k = 0, v = 0; for (var p = 0; p < parts.length; p++) { var n = +parts[p] || 0; for (var q = 0; q < n && k < s.length; q++) s[k++] = v ? 255 : 0; v = 1 - v; } }

  function initNodes(world, game) {
    var T = world.T;
    world.nodeById = {};
    var r = SB.rng(T.seed * 13 + 5);
    for (var i = 0; i < world.nodes.length; i++) {
      var n = world.nodes[i];
      if (n.id < NODE_ID0) n.id += NODE_ID0;
      n.type = "node";
      n.noun = NK[n.kind].noun;
      if (n.dropT == null) n.dropT = (NK[n.kind].every || 100) * r.range(0.1, 1);
      if (n.alsoT == null) n.alsoT = (NK[n.kind].every || 100) * r.range(0.5, 2);
      if (n.state == null) n.state = "ok";
      world.nodeById[n.id] = n;
    }
    rebuildNodeGrid(world);
    W.nearWater(world);
    W.buildPathGrid(world);
  }
  function rebuildNodeGrid(world) {
    var T = world.T, gn = Math.ceil(T.N / CELL), grid = new Array(gn * gn);
    for (var i = 0; i < grid.length; i++) grid[i] = [];
    var nc = T.N / SB.CHUNK, byChunk = new Array(nc * nc);
    for (i = 0; i < byChunk.length; i++) byChunk[i] = [];
    world.nodes.forEach(function (n) {
      grid[cellOf(n.x, n.z, gn)].push(n);
      byChunk[SB.clamp((n.z / SB.CHUNK) | 0, 0, nc - 1) * nc + SB.clamp((n.x / SB.CHUNK) | 0, 0, nc - 1)].push(n);
    });
    world.nodeGrid = grid; world.gridN = gn; world.nodesByChunk = byChunk;
  }
  function cellOf(x, z, gn) { return SB.clamp((z / CELL) | 0, 0, gn - 1) * gn + SB.clamp((x / CELL) | 0, 0, gn - 1); }

  // nearest wet vertex for every vertex within 24 tiles (multi-source BFS), so "water" can be seen and walked to
  W.nearWater = function (world) {
    var T = world.T, V = T.V, n = V * V, src = new Int32Array(n), dist = new Uint8Array(n), q = new Int32Array(n), qh = 0, qt = 0;
    src.fill(-1);
    for (var k = 0; k < n; k++) {
      if (T.W[k] !== T.NONE && T.W[k] - T.h[k] > 0.08 && T.W[k] - T.h[k] < 0.6 + (T.river[k] ? 1 : 0)) { src[k] = k; q[qt++] = k; }
    }
    // deep ocean shore counts too: wet vertices that border dry land
    for (k = 0; k < n; k++) {
      if (src[k] >= 0 || T.W[k] === T.NONE || T.W[k] - T.h[k] <= 0.08) continue;
      var ci = k % V, cj = (k / V) | 0, shore = false;
      for (var d = 0; d < 4; d++) {
        var ni = ci + [1, -1, 0, 0][d], nj = cj + [0, 0, 1, -1][d];
        if (ni < 0 || nj < 0 || ni >= V || nj >= V) continue;
        var nk = nj * V + ni;
        if (T.W[nk] === T.NONE || T.W[nk] <= T.h[nk]) shore = true;
      }
      if (shore) { src[k] = k; q[qt++] = k; }
    }
    while (qh < qt) {
      k = q[qh++];
      if (dist[k] >= 24) continue;
      ci = k % V; cj = (k / V) | 0;
      for (d = 0; d < 4; d++) {
        ni = ci + [1, -1, 0, 0][d]; nj = cj + [0, 0, 1, -1][d];
        if (ni < 0 || nj < 0 || ni >= V || nj >= V) continue;
        nk = nj * V + ni;
        if (src[nk] >= 0) continue;
        src[nk] = src[k]; dist[nk] = dist[k] + 1; q[qt++] = nk;
      }
    }
    world.waterSrc = src;
  };
  // the nearest drinkable/swimmable water point to x,z, or null
  W.waterNear = function (world, x, z) {
    var T = world.T, V = T.V, i = SB.clamp(Math.round(x), 0, T.N), j = SB.clamp(Math.round(z), 0, T.N);
    var s = world.waterSrc[j * V + i];
    if (s < 0) return null;
    return { x: s % V, z: (s / V) | 0 };
  };

  /* ---------------- pathfinding ----------------
     A coarse walkability grid (2x2 tiles per cell) and A* on it, used when walking straight is blocked
     (rivers, lakes, cliffs). Bridges open cells up when they're finished. */
  var PC = (W.PATH_CELL = 2);
  W.buildPathGrid = function (world) {
    var T = world.T, n = T.N / PC, g = new Uint8Array(n * n);
    for (var j = 0; j < n; j++) for (var i = 0; i < n; i++) {
      var x = i * PC + PC / 2, z = j * PC + PC / 2;
      // walkable if the centre and most of the cell is walkable
      var ok = 0;
      for (var k = 0; k < 5; k++) { var ox = [0, -0.6, 0.6, 0, 0][k], oz = [0, 0, 0, -0.6, 0.6][k]; if (W.walkable(world, x + ox, z + oz, false)) ok++; }
      g[j * n + i] = ok >= 4 ? 1 : 0;
    }
    world.pathGrid = g; world.pathN = n;
  };
  // is (x, z) on a cell of the walkable path grid (proper ground, connected to the rest)
  W.pathOpen = function (world, x, z) {
    if (!world.pathGrid) W.buildPathGrid(world);
    var n = world.pathN, i = (x / PC) | 0, j = (z / PC) | 0;
    return i >= 0 && j >= 0 && i < n && j < n && world.pathGrid[j * n + i] === 1;
  };
  W.openPathAt = function (world, x, z, r) {
    if (!world.pathGrid) return;
    var n = world.pathN;
    for (var j = Math.floor((z - r) / PC); j <= Math.floor((z + r) / PC); j++) for (var i = Math.floor((x - r) / PC); i <= Math.floor((x + r) / PC); i++) if (i >= 0 && j >= 0 && i < n && j < n) world.pathGrid[j * n + i] = 1;
  };
  var pq = null;
  // A* from (sx,sz) to (tx,tz). Returns [{x,z}...] or null. maxNodes bounds the work.
  W.findPath = function (world, sx, sz, tx, tz, swim, maxNodes) {
    if (!world.pathGrid) W.buildPathGrid(world);
    var n = world.pathN, g = world.pathGrid;
    var si = SB.clamp((sx / PC) | 0, 0, n - 1), sj = SB.clamp((sz / PC) | 0, 0, n - 1);
    var ti = SB.clamp((tx / PC) | 0, 0, n - 1), tj = SB.clamp((tz / PC) | 0, 0, n - 1);
    var start = sj * n + si, goal = tj * n + ti;
    if (start === goal) return [{ x: tx, z: tz }];
    function open(k) { return swim ? true : g[k] === 1; }
    // a goal cell that's blocked (a tree in water, a bush on a cliff edge) is fine if a neighbour is open
    var size = n * n;
    if (!pq || pq.cost.length !== size) pq = { cost: new Float32Array(size), from: new Int32Array(size), seen: new Uint32Array(size), stamp: 0, hk: new Float32Array(size + 1), hv: new Int32Array(size + 1) };
    pq.stamp++;
    var stamp = pq.stamp, cost = pq.cost, from = pq.from, seen = pq.seen, hk = pq.hk, hv = pq.hv, hn = 0;
    function push(key, val) { var i = hn++; while (i > 0) { var p = (i - 1) >> 1; if (hk[p] <= key) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; } hk[i] = key; hv[i] = val; }
    function pop() { var top = hv[0], key = hk[--hn], val = hv[hn], i = 0; while (true) { var l = i * 2 + 1; if (l >= hn) break; var r = l + 1, c = r < hn && hk[r] < hk[l] ? r : l; if (hk[c] >= key) break; hk[i] = hk[c]; hv[i] = hv[c]; i = c; } hk[i] = key; hv[i] = val; return top; }
    cost[start] = 0; seen[start] = stamp; from[start] = -1; push(0, start);
    var budget = maxNodes || 6000, found = -1;
    while (hn && budget-- > 0) {
      var k = pop();
      if (k === goal || (Math.abs((k % n) - ti) <= 1 && Math.abs(((k / n) | 0) - tj) <= 1 && !open(goal))) { found = k; break; }
      var ci = k % n, cj = (k / n) | 0;
      for (var d = 0; d < 8; d++) {
        var ni = ci + DXP[d], nj = cj + DZP[d];
        if (ni < 0 || nj < 0 || ni >= n || nj >= n) continue;
        var nk = nj * n + ni;
        if (!open(nk) && nk !== goal) continue;
        if (d >= 4 && (!open(cj * n + ni) || !open(nj * n + ci))) continue; // no corner cutting
        var nc = cost[k] + (d >= 4 ? 1.414 : 1);
        if (seen[nk] === stamp && cost[nk] <= nc) continue;
        seen[nk] = stamp; cost[nk] = nc; from[nk] = k;
        var hx = ni - ti, hz = nj - tj;
        push(nc + Math.sqrt(hx * hx + hz * hz), nk);
      }
    }
    if (found < 0) return null;
    var cells = [];
    for (var c2 = found; c2 >= 0 && c2 !== start; c2 = from[c2]) cells.push(c2);
    cells.reverse();
    var pts = cells.map(function (q) { return { x: (q % n) * PC + PC / 2, z: ((q / n) | 0) * PC + PC / 2 }; });
    pts.push({ x: tx, z: tz });
    // drop waypoints that are in a straight line
    var out = [];
    for (var i = 0; i < pts.length; i++) {
      if (i > 0 && i < pts.length - 1) {
        var a = pts[i - 1], b = pts[i], c = pts[i + 1];
        if (Math.abs((b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x)) < 0.01) continue;
      }
      out.push(pts[i]);
    }
    return out;
  };
  var DXP = [1, -1, 0, 0, 1, 1, -1, -1], DZP = [0, 0, 1, -1, 1, -1, 1, -1];

  /* ---------------- geometry ---------------- */

  W.heightAt = function (world, x, z) { return WG.heightAt(world.T, x, z); };
  W.groundY = function (world, x, z) {
    var h = WG.heightAt(world.T, x, z), w = WG.waterAt(world.T, x, z);
    return w !== world.T.NONE && w > h ? w : h;
  };
  W.depthAt = function (world, x, z) { return WG.depthAt(world.T, x, z); };
  W.biomeAt = function (world, x, z) { return WG.biomeAt(world.T, x, z); };
  W.inBounds = function (world, x, z) { return x > 3 && z > 3 && x < world.T.N - 3 && z < world.T.N - 3; };
  W.walkable = function (world, x, z, swim) {
    if (!W.inBounds(world, x, z)) return false;
    if (WG.slopeAt(world.T, x, z) > 2.8) return false;
    var d = WG.depthAt(world.T, x, z);
    if (d > 0.5 && !swim && !W.bridgeAt(world, x, z)) return false;
    return true;
  };
  W.bridgeAt = function (world, x, z) {
    var s = world.structures;
    for (var i = 0; i < s.length; i++) {
      var b = s[i];
      if (b.kind !== "bridge" || !b.done) continue;
      var dx = x - b.x, dz = z - b.z, c = Math.cos(b.rot || 0), sn = Math.sin(b.rot || 0);
      var lx = dx * c - dz * sn, lz = dx * sn + dz * c;
      if (Math.abs(lx) < 0.8 && Math.abs(lz) < 2.0) return b;
    }
    return null;
  };

  /* ---------------- time, seasons ---------------- */

  W.clock = function (world) {
    var t = world.time / SB.DAY_LENGTH, tday = t % 1;
    var h = (tday * 24 + 24) % 24;
    return { day: Math.floor(t) + 1, tday: tday, hour: Math.floor(h), min: Math.floor((h % 1) * 60), season: SB.SEASONS[world.season], night: world.night };
  };
  function updateClock(world, game, dt) {
    var t = world.time / SB.DAY_LENGTH, tday = t % 1;
    var wasNight = world.night;
    world.night = tday < 0.18 || tday > 0.82;
    var di = Math.floor(t);
    if (di !== world.dayIndex) { world.dayIndex = di; emit("newDay", { day: di + 1 }); }
    var sIdx = Math.floor(di / SB.SEASON_DAYS) % 4, sp = (t / SB.SEASON_DAYS) % 1;
    if (sIdx !== world.season) { world.season = sIdx; emit("season", { season: SB.SEASONS[sIdx] }); if (game && SB.Game && SB.Game.note) SB.Game.note(game, ["spring is here 🌸", "summer! 🌞", "autumn. the leaves are doing the thing 🍂", "winter is coming. it's here actually ❄️"][sIdx]); }
    // seasonal visuals ramp in and out
    var snowT = sIdx === 3 ? SB.smooth(sp * 3) : sIdx === 0 ? 1 - SB.smooth(sp * 4) : 0;
    world.snowCover += (snowT * 0.95 - world.snowCover) * Math.min(1, dt * 0.05);
    var autT = sIdx === 2 ? SB.smooth(sp * 3) : sIdx === 3 ? 1 - SB.smooth(sp * 2) : 0;
    world.autumn += (autT - world.autumn) * Math.min(1, dt * 0.05);
    if (wasNight && !world.night) { emit("dawn", { grumps: world.nightGrumps }); world.nightGrumps = 0; } // count first, then reset
    if (!wasNight && world.night) emit("dusk", {});
  }
  W.seasonTemp = function (world) { return [0, 0.12, -0.04, -0.2][world.season] || 0; };

  /* ---------------- weather ---------------- */

  var WX = {
    clear: { cloud: 0.15, rain: 0, wind: 0.35 },
    cloudy: { cloud: 0.6, rain: 0, wind: 0.6 },
    rain: { cloud: 0.85, rain: 0.6, wind: 0.7 },
    storm: { cloud: 1, rain: 1, wind: 1.2 },
    fog: { cloud: 0.45, rain: 0, wind: 0.15 }
  };
  var WX_ODDS = [ // spring, summer, autumn, winter
    { clear: 3, cloudy: 2, rain: 3, storm: 1, fog: 1 },
    { clear: 5, cloudy: 2, rain: 1, storm: 1.5, fog: 0.3 },
    { clear: 2, cloudy: 3, rain: 3, storm: 1, fog: 2 },
    { clear: 3, cloudy: 3, rain: 2.5, storm: 0.5, fog: 1.5 }
  ];
  function updateWeather(world, game, dt) {
    var w = world.weather, r = game.rng;
    w.t += dt;
    if (w.t >= w.next) {
      var odds = WX_ODDS[world.season], tot = 0, k;
      for (k in odds) tot += odds[k];
      var pick = r() * tot, kind = "clear";
      for (k in odds) { pick -= odds[k]; if (pick <= 0) { kind = k; break; } }
      if (game.forceWeather) { kind = game.forceWeather; game.forceWeather = null; }
      if (kind !== w.kind) emit("weather", { kind: kind, from: w.kind });
      w.kind = kind; w.t = 0; w.next = r.range(80, 220) * (kind === "storm" ? 0.5 : 1);
    }
    var tgt = WX[w.kind] || WX.clear, f = Math.min(1, dt * 0.08);
    w.cloud += (tgt.cloud - w.cloud) * f; w.rain += (tgt.rain - w.rain) * f; w.wind += (tgt.wind - w.wind) * f;
    w.storm = w.kind === "storm" ? 1 : 0;
    // lightning: strikes near the action so you can see it
    if (w.kind === "storm" && w.rain > 0.5) {
      world._boltT -= dt;
      if (world._boltT <= 0) {
        world._boltT = r.range(6, 16);
        var cx, cz, cs = game.creatures.filter(function (c) { return c.alive && c.species === "smol"; });
        if (cs.length && r.chance(0.7)) { var c0 = r.pick(cs); cx = c0.x + r.range(-14, 14); cz = c0.z + r.range(-14, 14); }
        else { cx = (game.focus ? game.focus.x : world.T.spawn.x) + r.range(-30, 30); cz = (game.focus ? game.focus.z : world.T.spawn.z) + r.range(-30, 30); }
        W.lightning(world, game, cx, cz);
      }
    }
  }
  W.lightning = function (world, game, x, z, forced) {
    if (!W.inBounds(world, x, z)) return;
    // strike the tallest thing nearby
    var best = null, bs = 0;
    W.nodesNear(world, x, z, 4, function (n) {
      if (NK[n.kind].noun !== "plant" || n.state !== "ok") return;
      var s = n.s * (n.kind === "giant" ? 1.6 : n.kind === "pine" ? 1.3 : 1);
      if (s > bs) { bs = s; best = n; }
    });
    var tx = best ? best.x : x, tz = best ? best.z : z;
    var bolt = { x: tx, z: tz, y: W.groundY(world, tx, tz), t: 0.6 };
    world.bolts.push(bolt);
    emit("lightning", { x: tx, z: tz, node: best });
    var dry = 1 - world.weather.rain * 0.5;
    if (best && (forced || game.rng.chance(0.55 * dry))) W.ignite(world, game, best);
    // anyone nearby gets a fright
    game.creatures.forEach(function (c) {
      if (!c.alive) return;
      var d = SB.dist(c.x, c.z, tx, tz);
      if (d < 3) SB.Chem.apply(c.chem, { fear: 0.6, pain: d < 1.2 ? 0.4 : 0 });
      else if (d < 12) SB.Chem.apply(c.chem, { fear: 0.25 });
    });
    return bolt;
  };

  /* ---------------- fire ---------------- */

  W.ignite = function (world, game, n) {
    if (!n || n.state !== "ok") return false;
    var def = NK[n.kind];
    if (def.noun !== "plant" || n.kind === "reeds" || n.kind === "herbs") return false;
    n.state = "burning"; n.burnT = 25 + game.rng() * 15; n.noun = "fire";
    (world.burning || (world.burning = [])).push(n);
    markNode(world, n);
    emit("wildfire", { node: n });
    return true;
  };
  function tickFires(world, game, dt) {
    var r = game.rng, list = world.burning || (world.burning = []);
    // wildfire spread (only burning nodes are scanned)
    for (var i = list.length - 1; i >= 0; i--) {
      var n = list[i];
      if (n.state !== "burning") { list.splice(i, 1); continue; }
      n.burnT -= dt * (1 + world.weather.rain * 2);
      if (n.burnT <= 0) {
        n.state = "burnt"; n.noun = "plant"; n.regrowT = 500 + r() * 300;
        markNode(world, n); list.splice(i, 1);
        // a burnt tree drops a couple of sticks (and they're charred, but sticks are sticks)
        for (var s = 0; s < 2; s++) dropFrom(world, game, n, "stick");
        continue;
      }
      var bm = WG.biomeAt(world.T, n.x, n.z);
      var damp = bm === SB.B.swamp || bm === SB.B.jungle ? 0.3 : bm === SB.B.desert || bm === SB.B.savanna ? 1.6 : 1;
      if (r() < dt * 0.06 * damp * (1 - world.weather.rain)) {
        var near = W.nodesNear(world, n.x, n.z, 3.2, function (m) { return m.state === "ok" && NK[m.kind].noun === "plant"; });
        if (near.length) W.ignite(world, game, r.pick(near));
      }
    }
    // rebuild the fire list (lights, warmth, things to discover fire from)
    var fires = world.fires;
    fires.length = 0;
    for (i = 0; i < list.length; i++) fires.push({ x: list[i].x, z: list[i].z, y: W.heightAt(world, list[i].x, list[i].z) + 1.6, r: 7, heat: 1, ref: list[i], kind: "wild" });
    var sts = world.structures;
    for (i = 0; i < sts.length; i++) {
      var st = sts[i];
      if (!st.done) continue;
      if (st.kind === "campfire" || st.kind === "kiln") {
        var d = st.data;
        if (d.fuel > 0) {
          d.fuel = Math.max(0, d.fuel - dt / (st.kind === "kiln" ? 400 : 260) * (1 + world.weather.rain * 0.8));
          d.lit = d.fuel > 0;
          if (!d.lit) emit("fireOut", { st: st });
        }
        st.noun = d.lit ? "fire" : "material";
        if (d.lit) fires.push({ x: st.x, z: st.z, y: W.heightAt(world, st.x, st.z) + 0.6, r: st.kind === "kiln" ? 4 : 6 + d.fuel * 3, heat: 0.6 + d.fuel * 0.4, ref: st, kind: st.kind });
      }
    }
    var its = world.items;
    for (i = 0; i < its.length; i++) {
      var it = its[i];
      if (it.kind !== "torch") continue;
      it.data.burn = (it.data.burn == null ? 150 : it.data.burn) - dt * (1 + world.weather.rain);
      if (it.data.burn <= 0) { transform(world, it, "stick"); continue; }
      fires.push({ x: it.x, z: it.z, y: it.y + 0.6, r: 4.5, heat: 0.35, ref: it, kind: "torch" });
    }
    // regrowth of burnt / chopped trees
    world._fireT -= dt;
    if (world._fireT <= 0) {
      world._fireT = 5;
      for (i = 0; i < world.nodes.length; i++) {
        var nn = world.nodes[i];
        if (nn.state === "burnt" || nn.state === "stump") {
          nn.regrowT = (nn.regrowT || 400) - 5;
          if (nn.regrowT <= 0) { nn.state = "ok"; nn.grow = 0; markNode(world, nn); }
        } else if (nn.grow != null && nn.grow < 1) {
          nn.grow = Math.min(1, nn.grow + 5 / 300);
          if (nn.grow >= 1) nn.grow = null;
          markNode(world, nn);
        }
      }
    }
    for (i = world.bolts.length - 1; i >= 0; i--) { world.bolts[i].t -= dt; if (world.bolts[i].t <= 0) world.bolts.splice(i, 1); }
  }
  // warmth from fires at x,z (0..1)
  W.fireWarmth = function (world, x, z) {
    var f = world.fires, w = 0;
    for (var i = 0; i < f.length; i++) {
      var d = SB.dist(x, z, f[i].x, f[i].z), rr = f[i].kind === "torch" ? 2 : 4.5;
      if (d < rr) w = Math.max(w, (1 - d / rr) * f[i].heat);
    }
    return w;
  };
  W.nearestFire = function (world, x, z, maxD) {
    var f = world.fires, best = null, bd = maxD || 1e9;
    for (var i = 0; i < f.length; i++) { var d = SB.dist(x, z, f[i].x, f[i].z); if (d < bd) { bd = d; best = f[i]; } }
    return best;
  };
  function markNode(world, n) { if (SB.Render && SB.Render.markDirty) SB.Render.markDirty(n.x, n.z); }
  W.markNode = markNode;

  /* ---------------- temperature ---------------- */

  W.tempAt = function (world, x, z) {
    var T = world.T;
    var t = WG.tempAt(T, x, z) + W.seasonTemp(world);
    var tday = (world.time / SB.DAY_LENGTH) % 1;
    t += Math.sin((tday - 0.3) * Math.PI * 2) * 0.06;
    t -= world.weather.rain * 0.06 + world.weather.wind * 0.02;
    t -= Math.max(0, WG.heightAt(T, x, z) - 6) * 0.01;
    var fw = W.fireWarmth(world, x, z);
    if (fw > 0) t = t + (0.6 - t) * fw;
    return SB.clamp01(t);
  };
  W.shelterAt = function (world, x, z) {
    var s = world.structures;
    for (var i = 0; i < s.length; i++) {
      var b = s[i];
      if (!b.done || (b.kind !== "hut" && b.kind !== "observatory" && b.kind !== "workshop")) continue;
      if (SB.dist(x, z, b.x, b.z) < (SK[b.kind].r + 0.3) * (b.s || 1)) return b;
    }
    var nest = world.T.nest;
    if (nest && SB.dist(x, z, nest.x, nest.z) < 1.0) return nest;
    return null;
  };

  /* ---------------- items ---------------- */

  W.add = function (world, game, kind, x, z, data, y) {
    var def = K[kind];
    if (!def) throw new Error("unknown item kind " + kind);
    var gy = W.groundY(world, x, z);
    var o = {
      id: SB.Game.newId(game), type: "item", kind: kind, noun: def.noun,
      x: x, y: y == null ? gy : y, z: z, vx: 0, vy: 0, vz: 0, r: def.r, rot: game.rng() * 6.28,
      heldBy: null, age: 0, onGround: y == null || y <= gy + 0.01, data: data || {}
    };
    world.items.push(o);
    return o;
  };
  W.remove = function (world, o) {
    var i = world.items.indexOf(o);
    if (i >= 0) world.items.splice(i, 1);
    o.gone = true;
  };
  function transform(world, o, kind) {
    o.kind = kind; o.noun = K[kind].noun; o.r = K[kind].r; o.age = 0; o.data = {};
  }
  W.transform = transform;
  W.itemById = function (world, id) {
    var it = world.items;
    for (var i = 0; i < it.length; i++) if (it[i].id === id) return it[i];
    return null;
  };
  W.structById = function (world, id) {
    var s = world.structures;
    for (var i = 0; i < s.length; i++) if (s[i].id === id) return s[i];
    return null;
  };
  W.nodeById = function (world, id) { return world.nodeById[id] || null; };
  // a node that wasn't there at worldgen (a fallen star's crystals): saved with the world
  W.addNode = function (world, game, kind, x, z, s) {
    if (!NK[kind] || !W.inBounds(world, x, z)) return null;
    var id = world._nextNode || 0;
    if (!id) world.nodes.forEach(function (o) { if (o.id >= id) id = o.id + 1; });
    world._nextNode = id + 1;
    var n = { id: id, kind: kind, x: x, z: z, s: s || 1, rot: game.rng() * 6.28, seed: 1, added: true, type: "node", noun: NK[kind].noun, dropT: 20, alsoT: 60, state: "ok" };
    world.nodes.push(n); world.nodeById[id] = n;
    rebuildNodeGrid(world);
    markNode(world, n);
    return n;
  };
  W.toss = function (o, vx, vz, vy) { o.vx = vx; o.vz = vz; o.vy = vy == null ? 4 : vy; o.onGround = false; };

  function dropFrom(world, game, n, kind) {
    var r = game.rng, a = r() * 6.283, d = NK[n.kind].r * n.s + r.range(0.2, 0.9);
    var x = n.x + Math.cos(a) * d, z = n.z + Math.sin(a) * d;
    if (!W.walkable(world, x, z)) { x = n.x + Math.cos(a) * 0.6; z = n.z + Math.sin(a) * 0.6; }
    var tall = NK[n.kind].noun === "plant" && n.kind !== "bush" && n.kind !== "reeds" && n.kind !== "herbs" && n.kind !== "cactus";
    var o = W.add(world, game, kind, x, z, {}, W.groundY(world, x, z) + (tall ? 1.6 * n.s : 0.3));
    o.onGround = false; o.vx = Math.cos(a) * 0.6; o.vz = Math.sin(a) * 0.6; o.vy = 0.5;
    if (kind === "shroom" && r.chance(0.3)) transform(world, o, "glowcap");
    emit("drop", { obj: o, node: n });
    return o;
  }
  W.dropFrom = dropFrom;

  function itemsNearCount(world, x, z, r, kind) {
    var n = 0;
    W.itemsNear(world, x, z, r, function (o) { if (o.kind === kind && o.heldBy == null) n++; });
    return n;
  }

  // how many loose items of each sort the island can have lying around right now
  function budgets(world, game) {
    var smols = 0;
    for (var i = 0; i < game.creatures.length; i++) if (game.creatures[i].alive && game.creatures[i].species === "smol") smols++;
    var food = 0, mat = 0, its = world.items;
    for (i = 0; i < its.length; i++) {
      var o = its[i];
      if (o.heldBy != null || K[o.kind].critter || o.data.rotten) continue; // rotten food doesn't stop fresh food growing
      if (o.kind === "nut") mat++;
      else if (o.noun === "food" || o.noun === "mushroom" || o.noun === "medicine") food++;
      else if (K[o.kind].mat) mat++;
    }
    world._foodRoom = 8 + smols * 4 - food;
    world._matRoom = 10 + smols * 4 - mat;
  }
  function roomFor(world, kind) {
    var def = K[kind];
    if (kind === "nut" || def.mat) return world._matRoom > 0;
    if (def.noun === "food" || def.noun === "mushroom" || def.noun === "medicine") return world._foodRoom > 0;
    return true;
  }

  function tickNodes(world, game, dt) {
    budgets(world, game);
    var r = game.rng, rainBoost = 1 + world.weather.rain * 0.8;
    var winter = world.season === 3, spring = world.season === 0;
    var nodes = world.nodes, n0 = world._nodeCursor || 0, cnt = Math.min(nodes.length, 120);
    // nodes are ticked in slices (each node ~ every 0.5-1 s), with the elapsed time scaled up to match
    var sdt = dt * nodes.length / cnt;
    // only the parts of the island where someone is (smols, or you) grow stuff; elsewhere time "waits"
    var act = world._active || (world._active = []);
    act.length = 0;
    var cs = game.creatures;
    for (var a = 0; a < cs.length && act.length < 24; a++) if (cs[a].alive && cs[a].species === "smol") act.push(cs[a].x, cs[a].z);
    if (game.focus) act.push(game.focus.x, game.focus.z);
    for (var k = 0; k < cnt; k++) {
      var n = nodes[(n0 + k) % nodes.length];
      var def = NK[n.kind];
      if (!def.drops || n.state !== "ok" || (n.grow != null && n.grow < 1)) continue;
      var on = false;
      for (var q = 0; q < act.length; q += 2) { var ddx = n.x - act[q], ddz = n.z - act[q + 1]; if (ddx * ddx + ddz * ddz < 1600) { on = true; break; } }
      if (!on) continue;
      var plant = def.noun === "plant";
      // seasons: spring flush, autumn bounty (time to stock up), lean winter
      var g = plant ? rainBoost * (winter ? 0.6 : spring ? 1.3 : world.season === 2 ? 1.25 : 1) : 1;
      n.dropT -= sdt * g;
      if (n.dropT <= 0) {
        n.dropT = def.every * r.range(0.7, 1.4);
        if (world.items.length < CAP_ITEMS && roomFor(world, def.drops) && itemsNearCount(world, n.x, n.z, 4, def.drops) < CAP_FOOD_NEAR) { dropFrom(world, game, n, def.drops); if (K[def.drops].mat || def.drops === "nut") world._matRoom--; else world._foodRoom--; }
      }
      if (def.also) {
        n.alsoT -= sdt;
        if (n.alsoT <= 0) {
          n.alsoT = def.every * r.range(1.6, 3);
          if (world.items.length < CAP_ITEMS && roomFor(world, def.also) && itemsNearCount(world, n.x, n.z, 4, def.also) < 2) { dropFrom(world, game, n, def.also); world._matRoom--; }
        }
      }
    }
    world._nodeCursor = (n0 + cnt) % nodes.length;
  }
  // shake a plant (play / poke): drop something now if it has anything
  W.shake = function (world, game, n, force) {
    var def = NK[n.kind];
    if (!def || !def.drops || n.state !== "ok") return null;
    if (!force && n.kind === "palm") return null; // too tall without a poke stick
    if (!force && n.dropT > def.every * 0.85) { n.dropT -= def.every * 0.25; return null; }
    if (itemsNearCount(world, n.x, n.z, 4, def.drops) >= CAP_FOOD_NEAR + 1) return null;
    n.dropT = def.every * game.rng.range(0.7, 1.2);
    return dropFrom(world, game, n, def.drops);
  };

  function physics(world, o, dt) {
    if (o.onGround && !o.vx && !o.vz) {
      // settle on the ground (it might have been dropped onto a slope or into water)
      var gy0 = W.groundY(world, o.x, o.z);
      if (Math.abs(o.y - gy0) > 0.01) o.y += (gy0 - o.y) * Math.min(1, dt * 10);
      if (WG.depthAt(world.T, o.x, o.z) > 0.3) { o.y = gy0 + Math.sin(world.time * 2 + o.id) * 0.03; }
      return;
    }
    o.vy -= GRAV * dt;
    var nx = o.x + o.vx * dt, nz = o.z + o.vz * dt;
    if (!W.inBounds(world, nx, nz)) { o.vx = -o.vx * 0.5; o.vz = -o.vz * 0.5; nx = o.x; nz = o.z; }
    o.x = nx; o.z = nz; o.y += o.vy * dt;
    var gy = W.groundY(world, o.x, o.z);
    if (o.y <= gy) {
      o.y = gy;
      var bouncy = K[o.kind].bouncy;
      if (bouncy && o.vy < -2) { o.vy = -o.vy * 0.55; o.vx *= 0.8; o.vz *= 0.8; }
      else { o.vy = 0; o.vx *= 0.5; o.vz *= 0.5; if (Math.abs(o.vx) + Math.abs(o.vz) < 0.15) { o.vx = 0; o.vz = 0; o.onGround = true; } }
      if (WG.depthAt(world.T, o.x, o.z) > 0.3) { o.vx *= 0.9; o.vz *= 0.9; }
    } else o.onGround = false;
  }

  /* ---------------- critters ---------------- */
  function tickCritter(world, game, o, dt) {
    var d = o.data, def = K[o.kind], r = game.rng;
    d.t = (d.t || 0) - dt;
    d.flee = Math.max(0, (d.flee || 0) - dt);
    var gy = W.heightAt(world, o.x, o.z);
    if (def.critter === "fly") {
      if (d.t <= 0 || d.tx == null) { d.t = r.range(1.5, 4); d.tx = o.x + r.range(-4, 4); d.tz = o.z + r.range(-4, 4); }
      var sp = d.flee > 0 ? 3 : 1.2;
      var dx = d.tx - o.x, dz = d.tz - o.z, l = Math.hypot(dx, dz) || 1;
      if (l > 0.2 && W.inBounds(world, o.x + dx / l * sp * dt, o.z + dz / l * sp * dt)) { o.x += dx / l * sp * dt; o.z += dz / l * sp * dt; o.rot = Math.atan2(dx, dz); }
      o.y = gy + 0.7 + Math.sin(world.time * 3 + o.id) * 0.25;
      o.onGround = false;
    } else if (def.critter === "crawl") {
      if (d.t <= 0) { d.t = r.range(1, 3); d.dir = r() * 6.283; d.go = r.chance(0.6); }
      if (d.go || d.flee > 0) {
        var s2 = d.flee > 0 ? 1.6 : 0.4, nx = o.x + Math.sin(d.dir) * s2 * dt, nz = o.z + Math.cos(d.dir) * s2 * dt;
        if (W.walkable(world, nx, nz)) { o.x = nx; o.z = nz; o.rot = d.dir; } else d.dir += 2;
      }
      o.y = W.groundY(world, o.x, o.z); o.onGround = true;
    } else if (def.critter === "hop") {
      d.hop = Math.max(0, (d.hop || 0) - dt);
      if (d.t <= 0) {
        d.t = r.range(0.8, 2.5);
        // flee from smols nearby
        var threat = null;
        W.creaturesNear(world, game, o.x, o.z, 5, function (c) { if (c.alive) threat = c; });
        if (threat) { d.dir = Math.atan2(o.x - threat.x, o.z - threat.z) + r.range(-0.5, 0.5); d.flee = 2; d.t = 0.5; }
        else d.dir = r() * 6.283;
        d.hop = 0.45;
      }
      if (d.hop > 0) {
        var s3 = d.flee > 0 ? 4.5 : 2, hx = o.x + Math.sin(d.dir) * s3 * dt, hz = o.z + Math.cos(d.dir) * s3 * dt;
        if (W.walkable(world, hx, hz)) { o.x = hx; o.z = hz; o.rot = d.dir; } else d.dir += 2.5;
        o.y = W.groundY(world, o.x, o.z) + Math.sin(d.hop / 0.45 * Math.PI) * 0.35;
      } else o.y = W.groundY(world, o.x, o.z);
      o.onGround = true;
    }
  }
  function spawnCritters(world, game) {
    var r = game.rng, smols = game.creatures.filter(function (c) { return c.alive && c.species === "smol"; });
    var focus = smols.length ? r.pick(smols) : game.focus || world.T.spawn;
    var counts = { butterfly: 0, beetle: 0, hopper: 0 };
    world.items.forEach(function (o) { if (counts[o.kind] != null) counts[o.kind]++; });
    var cap = { butterfly: world.night || world.season === 3 ? 0 : 10, beetle: 8, hopper: world.season === 3 ? 3 : 7 };
    for (var k in cap) {
      if (counts[k] >= cap[k]) continue;
      for (var tries = 0; tries < 6; tries++) {
        var a = r() * 6.283, d = r.range(8, 22), x = focus.x + Math.cos(a) * d, z = focus.z + Math.sin(a) * d;
        if (!W.walkable(world, x, z) || WG.depthAt(world.T, x, z) > 0.05) continue;
        var bm = WG.biomeAt(world.T, x, z);
        if (k === "hopper" && (bm === SB.B.desert || bm === SB.B.mountain)) continue;
        W.add(world, game, k, x, z, {});
        break;
      }
    }
  }

  /* ---------------- eggs ---------------- */

  W.warmEgg = function (world, game, egg, amount) {
    if (!egg || egg.kind !== "egg") return 0;
    var d = egg.data;
    var amt = amount != null ? amount : d.starter ? 0.24 : 0.05;
    d.progress = Math.min(1, (d.progress || 0) + amt);
    d.wobble = 1;
    emit("eggWarm", { obj: egg, progress: d.progress });
    return d.progress;
  };
  function tickEgg(world, game, o, dt) {
    var d = o.data;
    d.wobble = Math.max(0, (d.wobble || 0) - dt * 1.5);
    if (d.starter && !d.progress) return; // the very first egg waits for you
    var warm = 0.007;
    if (W.shelterAt(world, o.x, o.z)) warm += 0.008;
    warm += W.fireWarmth(world, o.x, o.z) * 0.012;
    if (o.heldBy === "hand") warm += 0.006;
    if (W.tempAt(world, o.x, o.z) < 0.25) warm *= 0.5;
    d.progress = Math.min(1, (d.progress || 0) + warm * dt * (d.starter ? 3 : 1));
    if (Math.random() < dt * 0.3 * d.progress) d.wobble = 0.6;
    if (d.progress >= 1) world._pending.push(o);
  }

  /* ---------------- spatial lookups ---------------- */

  function rebuildItemGrid(world) {
    var gn = world.gridN, grid = world.itemGrid;
    if (!grid) { grid = world.itemGrid = new Array(gn * gn); for (var i = 0; i < grid.length; i++) grid[i] = []; }
    else for (i = 0; i < grid.length; i++) grid[i].length = 0;
    var its = world.items;
    for (i = 0; i < its.length; i++) grid[cellOf(its[i].x, its[i].z, gn)].push(its[i]);
  }
  W.rebuildCreatureGrid = function (world, game) {
    var gn = world.gridN, grid = world.creatureGrid;
    if (!grid) { grid = world.creatureGrid = new Array(gn * gn); for (var i = 0; i < grid.length; i++) grid[i] = []; }
    else for (i = 0; i < grid.length; i++) grid[i].length = 0;
    var cs = game.creatures;
    for (i = 0; i < cs.length; i++) if (cs[i].alive) grid[cellOf(cs[i].x, cs[i].z, gn)].push(cs[i]);
  };
  function scan(grid, gn, x, z, r, fn) {
    if (!grid) return;
    var c0 = SB.clamp(((x - r) / CELL) | 0, 0, gn - 1), c1 = SB.clamp(((x + r) / CELL) | 0, 0, gn - 1);
    var r0 = SB.clamp(((z - r) / CELL) | 0, 0, gn - 1), r1 = SB.clamp(((z + r) / CELL) | 0, 0, gn - 1);
    var r2 = r * r;
    for (var j = r0; j <= r1; j++) for (var i = c0; i <= c1; i++) {
      var L = grid[j * gn + i];
      for (var k = 0; k < L.length; k++) { var o = L[k], dx = o.x - x, dz = o.z - z; if (dx * dx + dz * dz <= r2) fn(o, dx * dx + dz * dz); }
    }
  }
  // fn(item, d2) for items within r. Returns an array when no fn is given.
  W.itemsNear = function (world, x, z, r, fn) {
    if (fn) { scan(world.itemGrid, world.gridN, x, z, r, fn); return; }
    var out = [];
    scan(world.itemGrid, world.gridN, x, z, r, function (o) { out.push(o); });
    return out;
  };
  W.nodesNear = function (world, x, z, r, filter) {
    var out = [];
    scan(world.nodeGrid, world.gridN, x, z, r, function (n) { if (!filter || filter(n)) out.push(n); });
    return out;
  };
  W.eachNodeNear = function (world, x, z, r, fn) { scan(world.nodeGrid, world.gridN, x, z, r, fn); };
  W.creaturesNear = function (world, game, x, z, r, fn) { scan(world.creatureGrid, world.gridN, x, z, r, fn); };
  W.structsNear = function (world, x, z, r, filter) {
    var out = [], s = world.structures, r2 = r * r;
    for (var i = 0; i < s.length; i++) if (SB.dist2(s[i].x, s[i].z, x, z) <= r2 && (!filter || filter(s[i]))) out.push(s[i]);
    return out;
  };
  W.nearestNode = function (world, x, z, r, filter) {
    var best = null, bd = 1e9;
    scan(world.nodeGrid, world.gridN, x, z, r, function (n, d2) { if (d2 < bd && (!filter || filter(n))) { bd = d2; best = n; } });
    return best;
  };
  W.nearestItem = function (world, x, z, r, filter) {
    var best = null, bd = 1e9;
    scan(world.itemGrid, world.gridN, x, z, r, function (o, d2) { if (d2 < bd && (!filter || filter(o))) { bd = d2; best = o; } });
    return best;
  };
  W.near = function (world, x, z, r, filter) { // v1-compatible: items only
    var out = [];
    scan(world.itemGrid, world.gridN, x, z, r, function (o) { if (!filter || filter(o)) out.push(o); });
    return out;
  };
  W.byKind = function (world, kind) { return world.items.filter(function (o) { return o.kind === kind; }); };

  /* ---------------- structures ---------------- */

  W.addStructure = function (world, game, kind, x, z, opts) {
    opts = opts || {};
    var def = SK[kind];
    var need = {};
    for (var k in def.cost) need[k] = def.cost[k];
    var st = {
      id: SB.Game.newId(game), type: "struct", kind: kind, noun: opts.done ? def.noun : "material",
      x: x, z: z, rot: opts.rot != null ? opts.rot : game.rng() * 6.283, s: 1,
      done: !!opts.done, work: 0, need: opts.done ? {} : need, tribe: opts.tribe == null ? 0 : opts.tribe,
      builders: [], data: opts.data || {}, born: game.time, name: opts.name || null
    };
    if (kind === "campfire" || kind === "kiln") { st.data.fuel = st.data.fuel == null ? (opts.done ? 0.7 : 0) : st.data.fuel; st.data.lit = st.data.fuel > 0; }
    if (kind === "farm") st.data.grow = st.data.grow || 0;
    if (kind === "totem") st.data.ideas = st.data.ideas || {};
    world.structures.push(st);
    if (st.done) { st.noun = def.noun; emit("built", { st: st }); }
    markNode(world, st);
    return st;
  };
  W.removeStructure = function (world, st) {
    var i = world.structures.indexOf(st);
    if (i >= 0) world.structures.splice(i, 1);
    markNode(world, st);
  };
  W.siteFree = function (world, x, z, rad) {
    if (!W.walkable(world, x, z) || WG.depthAt(world.T, x, z) > 0.02 || WG.slopeAt(world.T, x, z) > 0.9) return false;
    // level enough across the whole footprint (buildings sit at its highest point)
    var lo = 1e9, hi = -1e9;
    for (var q = 0; q < 5; q++) { var hx = x + [0, -rad, rad, 0, 0][q] * 0.8, hz = z + [0, 0, 0, -rad, rad][q] * 0.8, hh = WG.heightAt(world.T, hx, hz); if (WG.depthAt(world.T, hx, hz) > 0.02) return false; lo = Math.min(lo, hh); hi = Math.max(hi, hh); }
    if (hi - lo > 0.35 + rad * 0.2) return false;
    var blocked = false;
    W.eachNodeNear(world, x, z, rad + 0.8, function (n) { if (n.kind !== "herbs") blocked = true; });
    if (blocked) return false;
    var s = world.structures;
    for (var i = 0; i < s.length; i++) if (SB.dist(x, z, s[i].x, s[i].z) < rad + SK[s[i].kind].r + 0.6) return false;
    return true;
  };
  function tickStructures(world, game, dt) {
    var sts = world.structures;
    for (var i = 0; i < sts.length; i++) {
      var st = sts[i];
      if (!st.done) continue;
      if (st.kind === "farm") {
        var mill = W.structsNear(world, st.x, st.z, 10, function (s) { return s.kind === "windmill" && s.done; }).length;
        var g0 = st.data.grow;
        // a farm feeds several smols: every ~2 min it ripens into a harvest of 3 (4 with a windmill nearby)
        st.data.grow = Math.min(1, g0 + dt / 130 * (1 + world.weather.rain * 0.6) * (world.season === 3 ? 0.6 : 1) * (1 + mill * 0.5));
        if ((st.data.grow * 4 | 0) !== (g0 * 4 | 0)) markNode(world, st);
        if (st.data.grow >= 1 && itemsNearCount(world, st.x, st.z, 2.5, "grain") + itemsNearCount(world, st.x, st.z, 2.5, "carrot") + itemsNearCount(world, st.x, st.z, 2.5, "pumpkin") < 4) {
          st.data.grow = 0.1; markNode(world, st);
          var crop = st.data.crop || (st.data.crop = game.rng.pick(["grain", "grain", "carrot", "pumpkin"]));
          for (var h = 0, nh = 3 + (mill ? 1 : 0); h < nh; h++) {
            var a = game.rng() * 6.283, rr = game.rng.range(1.1, 1.5);
            W.add(world, game, h === 0 ? crop : game.rng.chance(0.7) ? crop : "grain", st.x + Math.cos(a) * rr, st.z + Math.sin(a) * rr, {});
          }
          if (game.rng.chance(0.35)) W.add(world, game, "seed", st.x + game.rng.range(-1, 1), st.z + game.rng.range(-1, 1), {});
          SB.bus.emit("harvest", { st: st, crop: crop });
        }      }
    }
  }

  /* ---------------- tick ---------------- */

  W.tick = function (world, dt, game) {
    world.time = game.time;
    updateClock(world, game, dt);
    revealTick(world, game, dt);
    updateWeather(world, game, dt);
    rebuildItemGrid(world);
    tickNodes(world, game, dt);
    tickFires(world, game, dt);
    tickStructures(world, game, dt);

    var its = world.items, i;
    for (i = its.length - 1; i >= 0; i--) {
      var o = its[i];
      if (!o) continue;
      var def = K[o.kind], d = o.data;
      o.age += dt;
      if (def.rots) {
        if (o.age > def.rots * 1.2 && o.heldBy == null) { W.remove(world, o); continue; }
        // rotten food smells wrong: it reads as a "bad to eat" thing, like a red shroom
        if (o.age > def.rots && !d.rotten) { d.rotten = true; if (o.noun === "food") o.noun = "mushroom"; }
      }
      if (o.heldBy != null) continue;
      if (def.mat && o.age > 900 && !o.data.keep && Math.random() < dt * 0.01) { W.remove(world, o); continue; }
      // abandoned tools weather away too (a poke stick left out for ten minutes is just a stick in the rain)
      if (def.tool && !o.data.keep) { d.looseT = (d.looseT || 0) + dt; if (d.looseT > 600 && Math.random() < dt * 0.005) { W.remove(world, o); continue; } }
      if (def.critter) tickCritter(world, game, o, dt);
      else physics(world, o, dt);
      if (o.kind === "egg") tickEgg(world, game, o, dt);
    }
    for (i = 0; i < its.length; i++) if (its[i].kind === "egg" && its[i].heldBy != null && its[i].data.progress >= 1) world._pending.push(its[i]);
    var pend = world._pending;
    for (i = 0; i < pend.length; i++) {
      var egg = pend[i];
      if (egg.gone || its.indexOf(egg) < 0) continue;
      if (egg.heldBy === "hand" && game.hand && game.hand.heldId === egg.id) { game.hand.heldId = null; }
      if (egg.heldBy != null && egg.heldBy !== "hand") { var hc = SB.Game.byId(game, egg.heldBy); if (hc) SB.Creature.release(hc, egg); }
      egg.heldBy = null;
      if (SB.Game && SB.Game.hatch) SB.Game.hatch(game, egg); else W.remove(world, egg);
    }
    pend.length = 0;

    world._critT -= dt;
    if (world._critT <= 0) { world._critT = game.rng.range(8, 14); spawnCritters(world, game); }

    // grump nights
    if (world.night && world.T.caves.length && SB.Game.spawnGrump && (game.tutorial.done || world.dayIndex >= 1)) {
      world._grumpT -= dt;
      if (world._grumpT <= 0) {
        world._grumpT = game.rng.range(20, 30);
        var smols = game.creatures.filter(function (c) { return c.alive && c.species === "smol"; });
        var max = Math.min(1 + Math.floor(world.dayIndex / 2) + Math.floor(smols.length / 6), 5), alive = 0;
        game.creatures.forEach(function (c) { if (c.alive && c.species === "grump") alive++; });
        if (smols.length && alive < max && world.nightGrumps < max * 2) {
          // the cave nearest to the smols
          var target = smols[0], cave = null, cd = 1e9;
          world.T.caves.forEach(function (cv) { var d = SB.dist(cv.x, cv.z, target.x, target.z); if (d < cd) { cd = d; cave = cv; } });
          if (cave) {
            var sx = cave.x, sz = cave.z;
            // a grump from a faraway cave sneaks closer first (it's been walking for a while)
            if (cd > 45) { var k = (cd - 40) / cd; sx = cave.x + (target.x - cave.x) * k; sz = cave.z + (target.z - cave.z) * k; }
            if (world.nightGrumps === 0) SB.Game.note(game, "something stirs in the dark… 👺");
            world.nightGrumps++;
            SB.Game.spawnGrump(game, sx + game.rng.range(-2, 2), sz + game.rng.range(-2, 2));
          }
        }
      }
    }

    world._houseT -= dt;
    if (world._houseT <= 0) { world._houseT = 3; housekeeping(world, game); }
  };

  function housekeeping(world, game) {
    // too many things lying around: clear junk first (rotten food, then the oldest spare tools and
    // materials), fresh food last, so a cluttered island never eats its own harvest
    var its = world.items;
    if (its.length > CAP_ITEMS) {
      var loose = its.filter(function (o) { return o.heldBy == null && o.kind !== "egg" && !K[o.kind].critter && !o.data.keep; });
      var rank = function (o) { return o.data.rotten ? 3e6 : o.noun === "food" || o.noun === "medicine" ? 0 : 1e6; };
      loose.sort(function (a, b) { return rank(b) + b.age - (rank(a) + a.age); });
      for (var i = 0; i < its.length - CAP_ITEMS && i < loose.length; i++) W.remove(world, loose[i]);
    }
    // fading paths
    var wr = world.wear;
    for (var k = 0; k < 400; k++) { var t = (Math.random() * wr.length) | 0; if (wr[t] > 0) wr[t]--; }
  }

  // creatures wear paths into the ground as they walk
  W.wearAt = function (world, x, z) {
    var N = world.T.N, i = x | 0, j = z | 0;
    if (i < 0 || j < 0 || i >= N || j >= N) return;
    var t = j * N + i;
    if (world.wear[t] < 255) world.wear[t]++;
  };

  /* ---------------- save / load ---------------- */

  W.serialize = function (world) {
    var nodes = [];
    world.nodes.forEach(function (n) {
      if (n.state !== "ok" || n.grow != null || n.added) nodes.push({ id: n.id, kind: n.kind, x: round(n.x), z: round(n.z), s: n.s, state: n.state, regrowT: round(n.regrowT || 0), burnT: round(n.burnT || 0), grow: n.grow, added: n.added ? 1 : 0, rot: round(n.rot) });
    });
    return {
      seed: world.seed,
      items: world.items.map(function (o) {
        var d = {};
        for (var k in o.data) if (k !== "genome" && k !== "genome2" && k !== "twin") d[k] = o.data[k];
        if (o.data.genome) d.genome = SB.Genome.encode(o.data.genome);
        if (o.data.genome2) d.genome2 = SB.Genome.encode(o.data.genome2);
        return { id: o.id, kind: o.kind, x: round(o.x), y: round(o.y), z: round(o.z), age: round(o.age), heldBy: o.heldBy, data: d };
      }),
      structures: world.structures.map(function (s) { return { id: s.id, kind: s.kind, x: round(s.x), z: round(s.z), rot: round(s.rot), done: s.done, work: round(s.work), need: s.need, tribe: s.tribe, data: s.data, born: round(s.born), name: s.name }; }),
      nodes: nodes,
      weather: { kind: world.weather.kind, t: round(world.weather.t), next: round(world.weather.next) },
      snowCover: round(world.snowCover), autumn: round(world.autumn), season: world.season, dayIndex: world.dayIndex, nightGrumps: world.nightGrumps,
      seen: seenToString(world.seen), biomesSeen: world.biomesSeen
    };
  };
  function round(v) { return typeof v === "number" ? Math.round(v * 1000) / 1000 : v; }
  function num(v, d) { return typeof v === "number" && isFinite(v) ? v : d; }

  W.revive = function (data, game) {
    data = data || {};
    var world = W.create(game, data.seed || game.seed);
    world.time = game.time;
    (data.nodes || []).forEach(function (p) {
      var n = world.nodeById[p.id];
      if (!n && p.added && NK[p.kind]) {
        n = { id: p.id, kind: p.kind, x: p.x, z: p.z, s: p.s || 1, rot: p.rot || 0, seed: 1, added: true, type: "node", noun: NK[p.kind].noun, dropT: 50, alsoT: 80 };
        world.nodes.push(n); world.nodeById[n.id] = n;
      }
      if (!n) return;
      n.state = p.state || "ok"; n.regrowT = p.regrowT; n.burnT = p.burnT; n.grow = p.grow == null ? null : p.grow;
      if (n.state === "burning") { n.noun = "fire"; (world.burning || (world.burning = [])).push(n); }
    });
    rebuildNodeGrid(world);
    (data.items || []).forEach(function (p) {
      if (!K[p.kind]) return;
      var d = p.data || {};
      if (typeof d.genome === "string") { try { d.genome = SB.Genome.decode(d.genome); } catch (e) { d.genome = null; } }
      if (typeof d.genome2 === "string") { try { d.genome2 = SB.Genome.decode(d.genome2); } catch (e) { d.genome2 = null; } }
      var o = { id: p.id, type: "item", kind: p.kind, noun: K[p.kind].noun, x: num(p.x, 128), y: num(p.y, 0), z: num(p.z, 128), vx: 0, vy: 0, vz: 0, r: K[p.kind].r, rot: 0, heldBy: p.heldBy == null ? null : p.heldBy, age: num(p.age, 0), onGround: true, data: d };
      if (o.kind === "egg" && !o.data.genome) return;
      world.items.push(o);
    });
    (data.structures || []).forEach(function (p) {
      if (!SK[p.kind]) return;
      var st = { id: p.id, type: "struct", kind: p.kind, noun: p.done ? SK[p.kind].noun : "material", x: p.x, z: p.z, rot: p.rot || 0, s: 1, done: !!p.done, work: p.work || 0, need: p.need || {}, tribe: p.tribe || 0, builders: [], data: p.data || {}, born: p.born || 0, name: p.name || null };
      world.structures.push(st);
    });
    var wx = data.weather || {};
    if (WX[wx.kind]) { world.weather.kind = wx.kind; world.weather.t = num(wx.t, 0); world.weather.next = num(wx.next, 90); var tg = WX[wx.kind]; world.weather.cloud = tg.cloud; world.weather.rain = tg.rain; world.weather.wind = tg.wind; }
    world.snowCover = num(data.snowCover, 0); world.autumn = num(data.autumn, 0);
    world.season = num(data.season, 0); world.dayIndex = num(data.dayIndex, 0); world.nightGrumps = num(data.nightGrumps, 0);
    var t = world.time / SB.DAY_LENGTH;
    world.night = (t % 1) < 0.18 || (t % 1) > 0.82;
    if (data.seen) { seenFromString(data.seen, world.seen); world.biomesSeen = data.biomesSeen || {}; }
    else { world.seen.fill(255); for (var bi = 0; bi < SB.BIOMES.length; bi++) world.biomesSeen[bi] = 1; } // islands from before the fog: all explored
    world.seenDirty = true;
    return world;
  };
})();
