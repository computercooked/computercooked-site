/*
 * FATHOM: pure game logic.
 *
 * Contract (keep this true so a server or peer can run the game):
 *   - no DOM, no Math.random, no Date, no timers
 *   - state is plain JSON (JSON.stringify / parse round-trips it exactly)
 *   - every function that changes state returns a NEW state plus an events list;
 *     the input state is never mutated
 *   - the same seed and the same actions always give the same result
 *
 * Works in the browser (window.FathomLogic) and in Node (require('./logic.js')).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FathomLogic = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSION = 1;

  const DEFAULT_RULES = Object.freeze({
    size: 8,
    fleet: [
      { id: 'L', name: 'Leviathan', len: 4 },
      { id: 'H', name: 'Hunter', len: 3 },
      { id: 'S', name: 'Scout', len: 2 },
    ],
    decoys: 2,
    sonar: 1,
    echoMax: 3, // echo shows 1..echoMax; farther than that shows 0 ("cold")
  });

  // ---------- seeded RNG (mulberry32) ----------
  function makeRng(seed) {
    let s = seed >>> 0;
    const r = {
      next() {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      int(n) { return Math.floor(r.next() * n); },
      pick(arr) { return arr[Math.floor(r.next() * arr.length)]; },
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(r.next() * (i + 1));
          const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
        }
        return arr;
      },
      get state() { return s; },
    };
    return r;
  }

  // FNV-1a, for turning strings (like a date) into seeds
  function hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // ---------- geometry ----------
  const idx = (x, y, n) => y * n + x;
  const xOf = (i, n) => i % n;
  const yOf = (i, n) => Math.floor(i / n);
  function cheb(a, b, n) {
    return Math.max(Math.abs(xOf(a, n) - xOf(b, n)), Math.abs(yOf(a, n) - yOf(b, n)));
  }

  /** ship = {id, x, y, v} (v = vertical). Returns cell indices or null if off-board. */
  function shipCells(ship, len, n) {
    const out = [];
    for (let k = 0; k < len; k++) {
      const x = ship.x + (ship.v ? 0 : k);
      const y = ship.y + (ship.v ? k : 0);
      if (x < 0 || y < 0 || x >= n || y >= n) return null;
      out.push(idx(x, y, n));
    }
    return out;
  }

  function sonarArea(center, n) {
    const cx = Math.min(n - 2, Math.max(1, xOf(center, n)));
    const cy = Math.min(n - 2, Math.max(1, yOf(center, n)));
    const cells = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cells.push(idx(cx + dx, cy + dy, n));
    return { center: idx(cx, cy, n), cells };
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function fleetLen(rules, id) {
    const f = rules.fleet.find((s) => s.id === id);
    return f ? f.len : 0;
  }

  // ---------- layouts ----------
  /** layout = { ships: [{id,x,y,v}], decoys: [cellIndex, ...] } */
  function validateLayout(rules, layout) {
    const n = rules.size;
    if (!layout || !Array.isArray(layout.ships) || !Array.isArray(layout.decoys)) return 'layout must have ships and decoys';
    if (layout.ships.length !== rules.fleet.length) return 'wrong number of ships';
    if (layout.decoys.length !== rules.decoys) return 'wrong number of decoys';
    const used = new Set();
    const seen = new Set();
    for (const s of layout.ships) {
      const len = fleetLen(rules, s.id);
      if (!len) return 'unknown ship ' + s.id;
      if (seen.has(s.id)) return 'duplicate ship ' + s.id;
      seen.add(s.id);
      if (!Number.isInteger(s.x) || !Number.isInteger(s.y)) return 'ship position must be integers';
      const cells = shipCells(s, len, n);
      if (!cells) return 'ship ' + s.id + ' is off the board';
      for (const c of cells) {
        if (used.has(c)) return 'ships overlap';
        used.add(c);
      }
    }
    for (const d of layout.decoys) {
      if (!Number.isInteger(d) || d < 0 || d >= n * n) return 'decoy off the board';
      if (used.has(d)) return 'decoy overlaps something';
      used.add(d);
    }
    return null;
  }

  function occFromLayout(rules, layout) {
    const n = rules.size;
    const occ = new Array(n * n).fill(null);
    for (const s of layout.ships) for (const c of shipCells(s, fleetLen(rules, s.id), n)) occ[c] = s.id;
    for (const d of layout.decoys) occ[d] = 'D';
    return occ;
  }

  function randomLayout(rules, rng) {
    const n = rules.size;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const used = new Set();
      const ships = [];
      let ok = true;
      for (const f of rules.fleet) {
        let placed = false;
        for (let k = 0; k < 200 && !placed; k++) {
          const s = { id: f.id, x: rng.int(n), y: rng.int(n), v: rng.next() < 0.5 };
          const cells = shipCells(s, f.len, n);
          if (!cells || cells.some((c) => used.has(c))) continue;
          cells.forEach((c) => used.add(c));
          ships.push(s);
          placed = true;
        }
        if (!placed) { ok = false; break; }
      }
      if (!ok) continue;
      const decoys = [];
      while (decoys.length < rules.decoys) {
        const c = rng.int(n * n);
        if (used.has(c)) continue;
        used.add(c);
        decoys.push(c);
      }
      return { ships, decoys };
    }
    throw new Error('could not build a layout');
  }

  // ---------- game ----------
  function newPlayer(rules) {
    return {
      layout: null,
      occ: null,
      ready: false,
      sonarLeft: rules.sonar,
      shots: new Array(rules.size * rules.size).fill(null), // shots this player FIRED at the opponent
      sonars: [],
      sunk: [], // opponent ships this player has sunk: {id, len, cells}
      foundDecoys: [],
      stats: { shots: 0, hits: 0, decoys: 0, sonar: 0, streak: 0, bestStreak: 0 },
    };
  }

  /**
   * opts: { seed, rules?, first?: 0 | 1 | 'random' }
   */
  function newGame(opts) {
    opts = opts || {};
    const rules = clone(opts.rules || DEFAULT_RULES);
    const seed = (opts.seed >>> 0) || 1;
    let first = opts.first === undefined ? 0 : opts.first;
    if (first === 'random') first = makeRng(seed ^ 0x9e3779b9).int(2);
    return {
      v: VERSION,
      rules,
      seed,
      phase: 'placing',
      first,
      turn: first,
      t: 0,
      winner: null,
      players: [newPlayer(rules), newPlayer(rules)],
      log: [],
    };
  }

  function fail(state, error) { return { ok: false, error, state, events: [] }; }

  function place(state, p, layout) {
    if (state.phase !== 'placing') return fail(state, 'not in placing phase');
    if (p !== 0 && p !== 1) return fail(state, 'bad player');
    const err = validateLayout(state.rules, layout);
    if (err) return fail(state, err);
    const s = clone(state);
    const pl = s.players[p];
    pl.layout = clone(layout);
    pl.occ = occFromLayout(s.rules, layout);
    pl.ready = true;
    const events = [{ type: 'ready', p }];
    if (s.players[0].ready && s.players[1].ready) {
      s.phase = 'battle';
      events.push({ type: 'start', turn: s.turn });
    }
    return { ok: true, state: s, events };
  }

  function echoAt(s, p, cell) {
    const n = s.rules.size;
    const q = 1 - p;
    const occ = s.players[q].occ;
    const shots = s.players[p].shots;
    let best = Infinity;
    for (let i = 0; i < occ.length; i++) {
      if (occ[i] === null || shots[i] !== null) continue;
      const d = cheb(cell, i, n);
      if (d < best) best = d;
    }
    return best <= s.rules.echoMax ? best : 0;
  }

  /**
   * action = { type: 'fire', cell } | { type: 'sonar', cell }
   */
  function act(state, p, action) {
    if (state.phase !== 'battle') return fail(state, 'game is not in battle');
    if (state.turn !== p) return fail(state, 'not your turn');
    if (!action || typeof action.cell !== 'number') return fail(state, 'bad action');
    const n = state.rules.size;
    if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell >= n * n) return fail(state, 'cell off the board');

    const s = clone(state);
    const me = s.players[p];
    const them = s.players[1 - p];
    const t = s.t;
    const events = [];

    if (action.type === 'fire') {
      if (me.shots[action.cell] !== null) return fail(state, 'already fired there');
      const o = them.occ[action.cell];
      const shot = { t, r: 'm' };
      me.shots[action.cell] = shot;
      me.stats.shots++;
      const ev = { type: 'shot', p, cell: action.cell, t };
      if (o === 'D') {
        shot.r = 'd';
        me.foundDecoys.push(action.cell);
        me.stats.decoys++;
        me.stats.streak = 0;
        ev.r = 'd';
      } else if (o) {
        shot.r = 'h';
        me.stats.hits++;
        me.stats.streak++;
        me.stats.bestStreak = Math.max(me.stats.bestStreak, me.stats.streak);
        ev.r = 'h';
        ev.streak = me.stats.streak;
        const shipDef = them.layout.ships.find((x) => x.id === o);
        const cells = shipCells(shipDef, fleetLen(s.rules, o), n);
        if (cells.every((c) => me.shots[c] !== null)) {
          const sunk = { id: o, len: cells.length, cells };
          me.sunk.push(sunk);
          ev.sunk = sunk;
        }
      } else {
        shot.e = echoAt(s, p, action.cell);
        me.stats.streak = 0;
        ev.r = 'm';
        ev.e = shot.e;
      }
      events.push(ev);
      s.log.push({ t, p, a: 'fire', cell: action.cell, r: shot.r, e: shot.e });
      if (me.sunk.length === s.rules.fleet.length) {
        s.phase = 'over';
        s.winner = p;
        s.t++;
        events.push({ type: 'over', winner: p });
        return { ok: true, state: s, events };
      }
    } else if (action.type === 'sonar') {
      if (me.sonarLeft <= 0) return fail(state, 'no sonar left');
      const area = sonarArea(action.cell, n);
      const contacts = area.cells.filter((c) => them.occ[c] !== null && me.shots[c] === null);
      me.sonarLeft--;
      me.stats.sonar++;
      me.sonars.push({ t, center: area.center, cells: area.cells, contacts });
      events.push({ type: 'sonar', p, center: area.center, cells: area.cells, contacts, t });
      s.log.push({ t, p, a: 'sonar', cell: area.center, contacts: contacts.length });
    } else {
      return fail(state, 'unknown action type');
    }

    s.t++;
    if (s.rules.salvo) {
      // salvo: a turn is one shot per sub you still have afloat
      if (s.shotsLeft == null) s.shotsLeft = s.rules.fleet.length - them.sunk.length;
      s.shotsLeft--;
      if (s.shotsLeft > 0) { events.push({ type: 'salvo', p, left: s.shotsLeft }); return { ok: true, state: s, events }; }
      s.shotsLeft = null;
    }
    s.turn = 1 - p;
    events.push({ type: 'turn', turn: s.turn });
    return { ok: true, state: s, events };
  }

  /** Everything player p is allowed to know. Never includes the opponent's layout (until game over). */
  function viewFor(state, p) {
    const q = 1 - p;
    const me = state.players[p];
    const them = state.players[q];
    const sunkIds = new Set(me.sunk.map((x) => x.id));
    return {
      me: p,
      phase: state.phase,
      turn: state.turn,
      myTurn: state.phase === 'battle' && state.turn === p,
      t: state.t,
      winner: state.winner,
      rules: state.rules,
      sonarLeft: me.sonarLeft,
      oppSonarLeft: them.sonarLeft,
      stats: me.stats,
      oppStats: them.stats,
      home: {
        layout: me.layout,
        occ: me.occ,
        incoming: them.shots,
        incomingSonars: them.sonars,
        lost: them.sunk.map((x) => x.id),
      },
      attack: {
        shots: me.shots,
        sonars: me.sonars,
        sunk: me.sunk,
        foundDecoys: me.foundDecoys,
        remaining: state.rules.fleet.filter((f) => !sunkIds.has(f.id)).map((f) => ({ id: f.id, len: f.len })),
        decoysLeft: state.rules.decoys - me.foundDecoys.length,
        // revealed only when the game is over
        reveal: state.phase === 'over' ? them.layout : null,
      },
    };
  }

  function legalCells(state, p) {
    const out = [];
    const shots = state.players[p].shots;
    for (let i = 0; i < shots.length; i++) if (shots[i] === null) out.push(i);
    return out;
  }

  const EMOJI = { h: '\u{1F7E5}', d: '\u{1F7EA}', 1: '\u{1F7E7}', 2: '\u{1F7E8}', 3: '\u{1F7E6}', 0: '⬜', none: '⬛' };

  /** Wordle-style grid of what player p did to the enemy sea. */
  function shareGrid(state, p) {
    const n = state.rules.size;
    const shots = state.players[p].shots;
    const rows = [];
    for (let y = 0; y < n; y++) {
      let row = '';
      for (let x = 0; x < n; x++) {
        const s = shots[idx(x, y, n)];
        if (!s) row += EMOJI.none;
        else if (s.r === 'h') row += EMOJI.h;
        else if (s.r === 'd') row += EMOJI.d;
        else row += EMOJI[s.e] || EMOJI[0];
      }
      rows.push(row);
    }
    return rows.join('\n');
  }

  /** Re-run a game from its seed + action log. Used by tests and later by a server to verify a match. */
  function replay(seed, rules, layouts, log, first) {
    let s = newGame({ seed, rules, first });
    s = place(s, 0, layouts[0]).state;
    s = place(s, 1, layouts[1]).state;
    for (const e of log) {
      const r = act(s, e.p, { type: e.a, cell: e.cell });
      if (!r.ok) throw new Error('replay failed at t=' + e.t + ': ' + r.error);
      s = r.state;
    }
    return s;
  }

  return {
    VERSION, DEFAULT_RULES, makeRng, hashSeed, idx, xOf, yOf, cheb, shipCells, sonarArea, clone, fleetLen,
    validateLayout, occFromLayout, randomLayout, newGame, place, act, viewFor, legalCells, shareGrid, replay, EMOJI,
  };
});
