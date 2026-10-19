/* crash test (daily) — puzzle generator + solver. no DOM. */
(function (root) {
  'use strict';
  const N = 6, EXIT_ROW = 2, GOAL_COL = N - 2;

  // ---------- seeded rng ----------
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // ---------- board model ----------
  // piece: {dir:'h'|'v', len, line} — line is the fixed row (h) or col (v). position along the axis lives in the state array.
  const POW6 = []; for (let i = 0, p = 1; i < 20; i++, p *= 6) POW6.push(p);
  function encode(st) { let k = 0; for (let i = 0; i < st.length; i++) k += st[i] * POW6[i]; return k; }
  function occupancy(pieces, walls, st) {
    const g = new Int8Array(N * N).fill(-1);
    for (const w of walls) g[w] = 99;
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i], s = st[i];
      for (let k = 0; k < p.len; k++) g[p.dir === 'h' ? p.line * N + s + k : (s + k) * N + p.line] = i;
    }
    return g;
  }
  // every legal move from st: [pieceIndex, newPos]
  function moves(pieces, walls, st, g) {
    g = g || occupancy(pieces, walls, st);
    const out = [];
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i], s = st[i];
      const cell = (a) => (p.dir === 'h' ? p.line * N + a : a * N + p.line);
      for (let a = s - 1; a >= 0 && g[cell(a)] === -1; a--) out.push(i, a);
      for (let a = s + p.len; a < N && g[cell(a)] === -1; a++) out.push(i, a - p.len + 1);
    }
    return out;
  }
  function isGoal(st) { return st[0] === GOAL_COL; }

  // whole connected component from a start state, as a graph (states + adjacency), explored once
  function explore(pieces, walls, start, cap) {
    const P = pieces.length;
    const seen = new Map(); const states = []; const adjStart = [0]; const adj = [];
    seen.set(encode(start), 0); states.push(Int8Array.from(start));
    const g = new Int8Array(N * N);
    const wallSet = new Int8Array(N * N); for (const w of walls) wallSet[w] = 1;
    for (let qi = 0; qi < states.length; qi++) {
      if (states.length > cap) return null;
      const st = states[qi];
      g.fill(-1); for (const w of walls) g[w] = 99;
      for (let i = 0; i < P; i++) { const p = pieces[i], s0 = st[i]; for (let k = 0; k < p.len; k++) g[p.dir === 'h' ? p.line * N + s0 + k : (s0 + k) * N + p.line] = i; }
      let base = 0; for (let i = 0; i < P; i++) base += st[i] * POW6[i];
      for (let i = 0; i < P; i++) {
        const p = pieces[i], s0 = st[i], h = p.dir === 'h';
        for (let dir = -1; dir <= 1; dir += 2) {
          for (let a = dir < 0 ? s0 - 1 : s0 + p.len; a >= 0 && a < N; a += dir) {
            if (g[h ? p.line * N + a : a * N + p.line] !== -1) break;
            const np = dir < 0 ? a : a - p.len + 1;
            const k = base + (np - s0) * POW6[i];
            let idx = seen.get(k);
            if (idx === undefined) { idx = states.length; seen.set(k, idx); const ns = Int8Array.from(st); ns[i] = np; states.push(ns); }
            adj.push(idx);
          }
        }
      }
      adjStart.push(adj.length);
    }
    return { states, adjStart, adj, seen };
  }
  // distance to the nearest solved state for every state (moves are reversible, so the graph is undirected)
  function distances(G) {
    const n = G.states.length, dist = new Int16Array(n).fill(-1), q = new Int32Array(n);
    let qh = 0, qt = 0;
    for (let i = 0; i < n; i++) if (G.states[i][0] === GOAL_COL) { dist[i] = 0; q[qt++] = i; }
    while (qh < qt) {
      const v = q[qh++];
      for (let e = G.adjStart[v]; e < G.adjStart[v + 1]; e++) { const w = G.adj[e]; if (dist[w] < 0) { dist[w] = dist[v] + 1; q[qt++] = w; } }
    }
    return dist;
  }

  const KINDS_2 = ['ram', 'cable', 'chip', 'ram', 'cable', 'fan'];
  const KINDS_3 = ['gpu', 'psu', 'drive'];
  function randomLayout(rng, nPieces, nWalls) {
    const g = new Int8Array(N * N).fill(-1);
    const pieces = [], st = [], walls = [];
    // the hot air: horizontal, exit row, starts in the left half
    const tc = Math.floor(rng() * 2);
    pieces.push({ dir: 'h', len: 2, line: EXIT_ROW, kind: 'heat' }); st.push(tc);
    g[EXIT_ROW * N + tc] = 0; g[EXIT_ROW * N + tc + 1] = 0;
    let tries = 0;
    while (pieces.length < nPieces && tries++ < 300) {
      const dir = rng() < 0.5 ? 'h' : 'v', len = rng() < 0.28 ? 3 : 2;
      const line = Math.floor(rng() * N), pos = Math.floor(rng() * (N - len + 1));
      if (dir === 'h' && line === EXIT_ROW) continue; // would block the exit forever
      const cells = []; for (let k = 0; k < len; k++) cells.push(dir === 'h' ? line * N + pos + k : (pos + k) * N + line);
      if (cells.some((c) => g[c] !== -1)) continue;
      const id = pieces.length;
      cells.forEach((c) => { g[c] = id; });
      pieces.push({ dir, len, line, kind: len === 3 ? KINDS_3[Math.floor(rng() * KINDS_3.length)] : KINDS_2[Math.floor(rng() * KINDS_2.length)] });
      st.push(pos);
    }
    tries = 0;
    while (walls.length < nWalls && tries++ < 100) {
      const c = Math.floor(rng() * N * N);
      if (g[c] !== -1 || Math.floor(c / N) === EXIT_ROW) continue;
      g[c] = 99; walls.push(c);
    }
    return { pieces, walls, st };
  }

  const MODES = {
    normal: { pieces: [9, 12], walls: [0, 0], depth: [9, 13], cap: 12000 },
    hard: { pieces: [12, 14], walls: [1, 2], depth: [15, 22], cap: 14000 }
  };
  function generate(seedStr, mode) {
    const M = MODES[mode] || MODES.normal;
    const rng = mulberry32(hashStr(seedStr + '|' + mode));
    let best = null;
    for (let attempt = 0; attempt < 900; attempt++) {
      const np = M.pieces[0] + Math.floor(rng() * (M.pieces[1] - M.pieces[0] + 1));
      const nw = M.walls[0] + Math.floor(rng() * (M.walls[1] - M.walls[0] + 1));
      const L = randomLayout(rng, np, nw);
      const G = explore(L.pieces, L.walls, L.st, M.cap);
      if (!G) continue;
      const dist = distances(G);
      let maxD = -1; for (let i = 0; i < dist.length; i++) if (dist[i] > maxD) maxD = dist[i];
      if (maxD < 1) continue;
      const cand = { L, G, dist, maxD, attempt };
      if (!best || maxD > best.maxD) best = cand;
      if (maxD >= M.depth[0]) return finish(cand, rng, M);
    }
    best.attempt = -1;
    return finish(best, rng, M); // fallback: the deepest board we saw
  }
  function finish(b, rng, M) {
    const want = M.depth[0] + Math.floor(rng() * (M.depth[1] - M.depth[0] + 1));
    const D = Math.min(want, b.maxD);
    // among states at depth D, prefer ones with the hot air far from the vent
    let cands = [];
    for (let i = 0; i < b.dist.length; i++) if (b.dist[i] === D) cands.push(i);
    const minCol = Math.min(...cands.map((i) => b.G.states[i][0]));
    cands = cands.filter((i) => b.G.states[i][0] === minCol);
    const start = b.G.states[cands[Math.floor(rng() * cands.length)]];
    const distMap = new Map();
    b.G.seen.forEach((idx, key) => { if (b.dist[idx] >= 0) distMap.set(key, b.dist[idx]); });
    return { pieces: b.L.pieces, walls: b.L.walls, start: Array.from(start), par: D, dist: distMap, attempt: b.attempt };
  }

  // ---------- dates ----------
  const EPOCH = Date.UTC(2026, 9, 1); // puzzle #1 = oct 1 2026
  function todayNo(d) {
    d = d || new Date();
    return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000) + 1;
  }
  function dateOf(no) { const d = new Date(EPOCH + (no - 1) * 86400000); return d.toISOString().slice(0, 10); }

  const api = { N, EXIT_ROW, GOAL_COL, generate, moves, occupancy, encode, isGoal, todayNo, dateOf, mulberry32, hashStr, MODES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CT = api;
})(this);

// web worker entry: generate off the main thread
if (typeof window === 'undefined' && typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof module === 'undefined') {
  self.onmessage = (e) => {
    const { seed, mode, id } = e.data;
    const P = self.CT.generate(seed, mode);
    const keys = new Float64Array(P.dist.size), vals = new Int8Array(P.dist.size);
    let i = 0; P.dist.forEach((v, k) => { keys[i] = k; vals[i] = v; i++; });
    self.postMessage({ id, pieces: P.pieces, walls: P.walls, start: P.start, par: P.par, keys, vals }, [keys.buffer, vals.buffer]);
  };
}
