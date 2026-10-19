/*
 * FATHOM: AI opponent. Pure and seeded, so a server can run it too.
 *
 * It only ever reads viewFor(state, p): its own shot results, echoes, sonar and sunk
 * outlines. It never sees the opponent's layout.
 *
 *   easy   : probability density that mostly ignores echo and picks loosely
 *   normal : probability density over every legal sub placement, with echo exclusion
 *            zones and ring bonuses; sometimes "forgets" echoes and picks from its top few
 *   hard   : Monte Carlo (MCMC) over complete hidden layouts (subs AND decoys) that agree
 *            with every observation; fires at the highest P(sub); spends sonar where
 *            uncertainty is highest
 */
(function (root, factory) {
  const L = (typeof module === 'object' && module.exports) ? require('./logic.js') : root.FathomLogic;
  const api = factory(L);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FathomAI = api;
})(typeof self !== 'undefined' ? self : this, function (L) {
  'use strict';

  const LEVELS = ['easy', 'normal', 'hard'];

  // ---------------------------------------------------------------- model
  /** Turns a view into constraint data shared by every level. */
  function buildModel(view, opts) {
    opts = opts || {};
    const useEcho = opts.useEcho !== false;
    const R = view.rules;
    const n = R.size;
    const C = n * n;
    const A = view.attack;
    const shots = A.shots;

    const fixed = new Uint8Array(C); // known contact tiles: sunk subs + found decoys
    for (const s of A.sunk) for (const c of s.cells) fixed[c] = 1;
    for (const d of A.foundDecoys) fixed[d] = 1;

    const hits = [];
    const echoes = [];
    for (let i = 0; i < C; i++) {
      const s = shots[i];
      if (!s) continue;
      if (s.r === 'h' && !fixed[i]) hits.push(i);
      if (s.r === 'm' && useEcho) echoes.push({ c: i, e: s.e, t: s.t });
    }
    const shotT = (i) => (shots[i] ? shots[i].t : Infinity);

    // forb[i] = 1 when no HIDDEN item can occupy tile i
    const forb = new Uint8Array(C);
    for (let i = 0; i < C; i++) {
      const s = shots[i];
      if (s && (s.r === 'm' || s.r === 'd' || fixed[i])) { forb[i] = 1; continue; }
      const ti = shotT(i);
      for (const o of echoes) {
        const req = o.e === 0 ? R.echoMax + 1 : o.e;
        if (ti > o.t && L.cheb(o.c, i, n) < req) { forb[i] = 1; break; }
      }
      if (forb[i]) continue;
      for (const so of A.sonars) {
        if (ti > so.t && so.cells.includes(i) && !so.contacts.includes(i)) { forb[i] = 1; break; }
      }
    }

    // ring constraints: some contact present at time t must sit exactly e away
    const rings = [];
    for (const o of echoes) {
      if (o.e === 0) continue;
      const cells = [];
      let satisfiedByFixed = false;
      for (let i = 0; i < C; i++) {
        if (L.cheb(o.c, i, n) !== o.e) continue;
        if (shotT(i) <= o.t) continue; // was already shot then, so it could not echo
        if (fixed[i]) { satisfiedByFixed = true; break; }
        if (!forb[i]) cells.push(i);
      }
      if (!satisfiedByFixed) rings.push({ c: o.c, e: o.e, cells });
    }

    // sonar contacts not yet shot must hold a hidden item
    const sonarNeed = [];
    for (const so of A.sonars) for (const c of so.contacts) if (!shots[c] && !sonarNeed.includes(c)) sonarNeed.push(c);

    // candidate placements per remaining sub
    const ships = A.remaining.map((f) => {
      const cands = [];
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) for (const v of [false, true]) {
        if (f.len === 1 && v) continue;
        const cells = L.shipCells({ x, y, v }, f.len, n);
        if (!cells || cells.some((c) => forb[c])) continue;
        cands.push(cells);
      }
      return { id: f.id, len: f.len, cands };
    });
    const decoyCands = [];
    for (let i = 0; i < C; i++) if (!shots[i] && !forb[i]) decoyCands.push(i);

    return { n, C, R, shots, fixed, hits, echoes, rings, sonarNeed, ships, decoyCands, decoysLeft: A.decoysLeft, forb };
  }

  // ---------------------------------------------------------------- normal: marginal density
  function densityMap(M, opts) {
    opts = opts || {};
    const ringBonus = opts.ringBonus === undefined ? 1.6 : opts.ringBonus;
    const P = new Float64Array(M.C);
    const hitSet = new Set(M.hits);
    for (const sh of M.ships) {
      for (const cells of sh.cands) {
        let hc = 0;
        for (const c of cells) if (hitSet.has(c)) hc++;
        let w = M.hits.length ? (hc ? Math.pow(40, hc) : 1) : 1;
        if (ringBonus !== 1) {
          for (const r of M.rings) {
            if (cells.some((c) => r.cells.includes(c))) w *= ringBonus;
          }
        }
        for (const c of cells) if (!M.shots[c]) P[c] += w;
      }
    }
    let tot = 0;
    for (let i = 0; i < M.C; i++) tot = Math.max(tot, P[i]);
    if (tot > 0) for (let i = 0; i < M.C; i++) P[i] /= tot;
    return P;
  }

  // ---------------------------------------------------------------- hard: MCMC over full layouts
  function sampleLayouts(M, rng, opts) {
    opts = opts || {};
    const chains = opts.chains || 8;
    const steps = opts.steps || 1600;
    const C = M.C;
    const items = [];
    for (const sh of M.ships) items.push({ ship: true, cands: sh.cands, byTile: null });
    for (let k = 0; k < M.decoysLeft; k++) items.push({ ship: false, cands: M.decoyCands.map((c) => [c]) });
    if (items.some((it) => it.cands.length === 0)) return null;

    // index ship candidates by hit tile so proposals can aim at uncovered hits
    for (const it of items) {
      if (!it.ship || !M.hits.length) continue;
      it.byTile = {};
      it.cands.forEach((cells, ci) => {
        for (const c of cells) if (M.hits.includes(c)) (it.byTile[c] = it.byTile[c] || []).push(ci);
      });
    }

    const grid = new Uint8Array(C);
    const assign = new Int32Array(items.length);
    function energy() {
      grid.fill(0);
      let v = 0;
      for (let j = 0; j < items.length; j++) {
        const cells = items[j].cands[assign[j]];
        for (const c of cells) { if (grid[c]) v++; grid[c] = items[j].ship ? 2 : 1; }
      }
      for (const h of M.hits) if (grid[h] !== 2) v++;
      for (const s of M.sonarNeed) if (!grid[s]) v++;
      for (const r of M.rings) {
        let ok = false;
        for (const c of r.cells) if (grid[c]) { ok = true; break; }
        if (!ok) v++;
      }
      return v;
    }

    const prev = new Uint8Array(C);
    const shipCount = new Float64Array(C);
    const decoyCount = new Float64Array(C);
    let samples = 0;
    function accumulate() {
      for (let c = 0; c < C; c++) {
        if (grid[c] === 2) shipCount[c]++;
        else if (grid[c] === 1) decoyCount[c]++;
      }
      samples++;
    }
    for (let ch = 0; ch < chains; ch++) {
      for (let j = 0; j < items.length; j++) assign[j] = rng.int(items[j].cands.length);
      let v = energy();
      for (let st = 0; st < steps; st++) {
        const j = rng.int(items.length);
        const it = items[j];
        const old = assign[j];
        let prop;
        if (it.byTile && rng.next() < 0.5) {
          const h = M.hits[rng.int(M.hits.length)];
          const list = it.byTile[h];
          prop = list ? list[rng.int(list.length)] : rng.int(it.cands.length);
        } else prop = rng.int(it.cands.length);
        if (prop === old) { if (v === 0 && st > 20) accumulate(); continue; }
        prev.set(grid);
        assign[j] = prop;
        const v2 = energy();
        if (v2 <= v || rng.next() < Math.exp((v - v2) * 1.6)) v = v2;
        else { assign[j] = old; grid.set(prev); } // restore grid to the current state
        if (v === 0 && st > 20) accumulate();
      }
    }
    if (!samples) return null;
    for (let c = 0; c < C; c++) { shipCount[c] /= samples; decoyCount[c] /= samples; }
    return { pShip: shipCount, pDecoy: decoyCount, samples };
  }

  // ---------------------------------------------------------------- analysis (also used by debug overlay)
  function analyze(view, level, rng) {
    const M = buildModel(view);
    if (level === 'hard') {
      const S = sampleLayouts(M, rng, {});
      if (S) return { M, pShip: S.pShip, pDecoy: S.pDecoy, samples: S.samples, exact: true };
    }
    const P = densityMap(M, { ringBonus: level === 'easy' ? 1 : 1.6 });
    return { M, pShip: P, pDecoy: new Float64Array(M.C), samples: 0, exact: false };
  }

  function unshot(view) {
    const out = [];
    view.attack.shots.forEach((s, i) => { if (!s) out.push(i); });
    return out;
  }

  function argmaxCells(P, cells) {
    let best = -1;
    let list = [];
    for (const c of cells) {
      if (P[c] > best + 1e-12) { best = P[c]; list = [c]; } else if (Math.abs(P[c] - best) <= 1e-12) list.push(c);
    }
    return { best, list };
  }

  function bestSonarCenter(view, pContact) {
    const n = view.rules.size;
    const shots = view.attack.shots;
    let best = -1;
    let bestC = L.idx(1, 1, n);
    for (let y = 1; y < n - 1; y++) for (let x = 1; x < n - 1; x++) {
      const area = L.sonarArea(L.idx(x, y, n), n);
      let info = 0;
      for (const c of area.cells) {
        if (shots[c]) continue;
        const p = Math.min(0.999, Math.max(0.001, pContact[c]));
        info += -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p));
      }
      if (info > best) { best = info; bestC = area.center; }
    }
    return { center: bestC, info: best };
  }

  // ---------------------------------------------------------------- levels
  // Tuning knobs for the density player. Normal is deliberately a bit human: it sometimes
  // forgets what the echoes said and it picks from its top few cells instead of the best.
  // Measured by `node tests/sim.js --solo`: turns to sink a fleet alone, median.
  const EASY = { echoUse: 0.1, ringBonus: 1, topK: 16, power: 0.3, sonarAfterMisses: 6, targetTopK: 4, randomShot: 0.3 };
  const NORMAL = { echoUse: 0.45, ringBonus: 1.2, topK: 6, power: 1.3, sonarAfterMisses: 3 };

  function densityAction(view, rng, cfg) {
    const useEcho = rng.next() < cfg.echoUse;
    const M = buildModel(view, { useEcho });
    const P = densityMap(M, { ringBonus: useEcho ? cfg.ringBonus : 1 });
    const free = unshot(view).filter((c) => P[c] > 0);
    const pool = free.length ? free : unshot(view);
    const misses = consecutiveMisses(view);
    if (view.sonarLeft > 0 && !M.hits.length && misses >= cfg.sonarAfterMisses && view.attack.shots.filter(Boolean).length >= 5) {
      const s = bestSonarCenter(view, P);
      return { type: 'sonar', cell: s.center };
    }
    if (!M.hits.length && cfg.randomShot && rng.next() < cfg.randomShot) return { type: 'fire', cell: rng.pick(unshot(view)) };
    const ranked = pool.slice().sort((a, b) => P[b] - P[a]);
    if (M.hits.length) {
      if ((cfg.targetTopK || 1) > 1) return { type: 'fire', cell: rng.pick(ranked.slice(0, cfg.targetTopK)) };
      const top = argmaxCells(P, pool);
      return { type: 'fire', cell: rng.pick(top.list) };
    }
    const top = ranked.slice(0, cfg.topK);
    const w = top.map((c) => Math.pow(P[c] + 1e-6, cfg.power));
    let r = rng.next() * w.reduce((a, b) => a + b, 0);
    for (let k = 0; k < top.length; k++) { r -= w[k]; if (r <= 0) return { type: 'fire', cell: top[k] }; }
    return { type: 'fire', cell: top[0] };
  }

  function normalAction(view, rng) { return densityAction(view, rng, NORMAL); }
  function easyAction(view, rng) { return densityAction(view, rng, EASY); }

  function hardAction(view, rng) {
    const free = unshot(view);
    const an = analyze(view, 'hard', rng);
    const P = an.pShip;
    const top = argmaxCells(P, free);
    if (view.sonarLeft > 0 && !an.M.hits.length && top.best < 0.34 && view.attack.shots.filter(Boolean).length >= 2) {
      const pc = new Float64Array(an.M.C);
      for (let i = 0; i < an.M.C; i++) pc[i] = Math.min(1, P[i] + an.pDecoy[i]);
      const s = bestSonarCenter(view, pc);
      if (s.info >= 3.2) return { type: 'sonar', cell: s.center };
    }
    // tie-break: prefer the cell least likely to be a decoy
    let list = top.list;
    if (list.length > 1) {
      const minD = Math.min(...list.map((c) => an.pDecoy[c]));
      list = list.filter((c) => an.pDecoy[c] <= minD + 1e-9);
    }
    return { type: 'fire', cell: rng.pick(list) };
  }

  function consecutiveMisses(view) {
    const order = view.attack.shots.filter(Boolean).sort((a, b) => b.t - a.t);
    let k = 0;
    for (const s of order) { if (s.r === 'h') break; k++; }
    return k;
  }

  /** Main entry. seed makes it deterministic: same view + same seed = same action. */
  function chooseAction(view, level, seed) {
    const rng = L.makeRng((seed >>> 0) ^ Math.imul(view.t + 1, 0x9e3779b1));
    if (level === 'easy') return easyAction(view, rng);
    if (level === 'hard') return hardAction(view, rng);
    return normalAction(view, rng);
  }

  // ---------------------------------------------------------------- placement
  function layoutScore(rules, layout) {
    const n = rules.size;
    const shipTiles = [];
    const groups = layout.ships.map((s) => L.shipCells(s, L.fleetLen(rules, s.id), n));
    groups.forEach((g) => shipTiles.push(...g));
    let score = 0;
    // decoys far from subs pull echoes the wrong way
    for (const d of layout.decoys) {
      const m = Math.min(...shipTiles.map((c) => L.cheb(c, d, n)));
      score += Math.min(m, 4) * 1.2;
    }
    if (layout.decoys.length === 2) score += Math.min(L.cheb(layout.decoys[0], layout.decoys[1], n), 5) * 0.5;
    // subs that don't touch each other leak less via echo
    for (let a = 0; a < groups.length; a++) for (let b = a + 1; b < groups.length; b++) {
      let m = 99;
      for (const x of groups[a]) for (const y of groups[b]) m = Math.min(m, L.cheb(x, y, n));
      score += Math.min(m, 3) * 0.8;
    }
    return score;
  }

  function chooseLayout(rules, level, seed) {
    const rng = L.makeRng(seed >>> 0);
    if (level === 'easy') return L.randomLayout(rules, rng);
    const tries = level === 'hard' ? 40 : 6;
    let best = null, bestScore = -1;
    for (let k = 0; k < tries; k++) {
      const lay = L.randomLayout(rules, rng);
      const sc = layoutScore(rules, lay) + rng.next() * 1.5;
      if (sc > bestScore) { bestScore = sc; best = lay; }
    }
    return best;
  }

  return { LEVELS, EASY, NORMAL, densityAction, buildModel, densityMap, sampleLayouts, analyze, chooseAction, chooseLayout, layoutScore };
});
