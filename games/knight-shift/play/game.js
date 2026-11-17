/* knight shift - computer cooked games. vanilla js, no build, no network. */
(function () {
'use strict';
const Q = new URLSearchParams(location.search);
// test hooks also turn on when the player page (which frames /play/ with no query) was opened with ?cctest=1
const TEST = Q.get('cctest') === '1' || (function () { try { return window.parent !== window && new URLSearchParams(parent.location.search).get('cctest') === '1'; } catch (e) { return false; } })();
const SHOT = Q.get('shot') === '1';

/* ---------- sound: CC0 recordings from the computer cooked library (see PLAYTEST.md) ---------- */
const FILES = { move: 'sfx/move.mp3', take: 'sfx/take.mp3', hurt: 'sfx/hurt.mp3', floor: 'sfx/floor.mp3', clear: 'sfx/clear.mp3',
  perk: 'sfx/perk.mp3', die: 'sfx/die.mp3', boss: 'sfx/boss.mp3', buy: 'sfx/buy.mp3' };
// levelled by measurement (ffmpeg ebur128 LUFS; RMS for hurt, 0.27 s): frequent sounds land at -21 to -25 LUFS after volume, big moments (boss, die) near -18.5
const VOL = { move: 1.0, take: 0.68, hurt: 0.53, floor: 0.93, clear: 1.0, perk: 0.75, die: 0.98, boss: 0.94, buy: 0.9 };
let muted = false; // host page mute (cc-mute)
const audioPool = {};
function soundOff() { return muted || !!meta.muted; }
function sfx(name) {
  if (soundOff() || SHOT) return;
  const url = FILES[name];
  if (!url) return;
  try {
    const pool = audioPool[name] || (audioPool[name] = { i: 0, list: [] });
    let a = pool.list[pool.i];
    if (!a) { a = new Audio(url); a.preload = 'auto'; pool.list[pool.i] = a; }
    pool.i = (pool.i + 1) % 3;
    a.volume = VOL[name] || 0.7;
    a.currentTime = 0;
    const p = a.play(); if (p && p.catch) p.catch(function () {});
  } catch (e) {}
}

/* ---------- analytics (defensive) ---------- */
let evCount = 0;
function ccCall(fn, a) { try { if (window.cc && typeof window.cc[fn] === 'function') window.cc[fn](a); } catch (e) {} }
function ccEvent(name, data) {
  if (evCount >= 18) return; evCount++;
  try { if (window.cc && typeof window.cc.event === 'function') window.cc.event(name, data || {}); } catch (e) {}
}

/* ---------- rng ---------- */
function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* ---------- save ---------- */
const SAVE_KEY = 'ks-save';
const meta = { bestFloor: 0, bestScore: 0, totalCaptures: 0, runs: 0, hero: 'knight', startPerk: '', daily: {}, muted: false };
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); if (s) Object.assign(meta, JSON.parse(s)); } catch (e) {} }
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(meta)); } catch (e) {} }
loadSave();

/* ---------- content ---------- */
const T = {
  p: { name: 'pawn', val: 1, col: '#ff7b6b', info: 'pawn: walks down slowly, hits diagonally down. gets promoted at the bottom. take it first.' },
  b: { name: 'bishop', val: 3, col: '#a879ff', info: 'bishop: slides diagonally. emotionally too.' },
  r: { name: 'rook', val: 3, col: '#ff9f1c', info: 'rook: slides straight. basically a building.' },
  n: { name: 'horse', val: 3, col: '#52d68a', info: 'horse: same L as you. different mortgage.' },
  k: { name: 'king', val: 4, col: '#ffd23f', info: 'king: one step any way. very important. ask him.' },
  q: { name: 'queen', val: 5, col: '#ff5fa2', info: 'queen: slides any way. does everything around here.' },
  i: { name: 'intern', val: 2, col: '#7cf29a', info: 'intern: harmless. runs for the bottom row. gets there = promoted to queen. catch it.' }
};
const INTRO = { 1: 'p', 2: 'b', 3: 'r', 4: 'i', 6: 'k', 7: 'q', 8: 'n' };
const INTRO_TXT = {
  p: 'tap a green dot to jump. land on a piece to take it. red squares hit back.',
  b: 'new: bishop. slides diagonally. that whole red line is its.',
  r: 'new: rook. slides straight, whole rows and columns. come at it from an angle.',
  i: 'new: the intern. harmless, but if it reaches the bottom row it becomes a queen. catch it.',
  k: 'new: king. one step any way. hits everything around it.',
  q: 'new: queen. slides any way. respect the red.',
  n: 'new: horse. same L as you. it can hit you where you can hit it.'
};
const INTRO_BARK = { p: 'we are paid hourly', b: 'i only go one way', r: 'i am a building', i: 'hi! first day!', k: 'bow. or whatever.', q: 'who called this meeting', n: 'neigh. to you specifically.' };
const BARK = {
  take: {
    p: ['i was on break', 'tell my union', 'worth it? no.', 'my shift ended 5 min ago', 'ow, sideways'],
    b: ['i only go one way', 'diagonal-ist', 'i saw that coming. i did not.'],
    r: ['i am a building', 'zoning violation', 'structurally ow'],
    n: ['same moves, different mortgage', 'neigh means no', 'hoof'],
    k: ['do you know who i am', 'check. please. anyone.', 'i was mostly hat'],
    q: ['i do everything here', 'who covers my meetings', 'rude and l-shaped'],
    i: ['i was unpaid', 'is this a learning experience', 'can i get a reference']
  },
  hit: ['diagonal. look it up.', 'that square was taken', 'you walked into that', 'we saw you coming', 'noted in your file', 'gotcha, horse'],
  promo: ['promoted. hr is thrilled.', 'i am management now', 'new title, same pawn'],
  boss: ['you missed a spot', 'that was a write-off', 'i will be filing that', 'audit THIS']
};
const FLOOR_NAMES = ['', 'the lobby', 'middle management', 'the break room', 'hr (do not)', 'accounting', 'the printer that hates you',
  'open plan', 'the board room. literally', 'legal', 'the tax office', 'the server closet', 'the other break room', 'synergy',
  'the corner office', 'the trenchcoat floor', 'quarterly review', 'the roof (indoors)', 'the vault', 'the boss of the boss', 'the rook pit'];
function floorName(f) { return FLOOR_NAMES[f] || (f % 5 === 0 ? 'another boss. great.' : 'more of the same, but faster'); }

const BOSSES = [
  { t: 'q', name: "the queen's accountant", hp: 3, look: 'acct', period: 2, plan: 'audits diagonals only, 3 squares, every other turn.' },
  { t: 'k', name: 'a king who is mostly tax', hp: 4, look: 'tax', period: 1, summon: 3, plan: 'steps like a king every turn and levies a pawn every 3 turns. the gold $ square shows where.' },
  { t: 'b', name: 'two bishops in a trenchcoat', hp: 4, look: 'coat', period: 2, twice: true, plan: 'slides like a bishop twice, then argues with itself for a turn.' },
  { t: 'r', name: 'the rook of all evil', hp: 5, look: 'evil', period: 2, plan: 'slides like a rook every other turn. watch the "moves next" tag.' }
];

const PERKS = {
  other:  { name: 'other moves', text: 'once per floor, move like a bishop. it is called range.', ab: true },
  corner: { name: 'corner office', text: 'once per floor, teleport to a corner. management approved it.', ab: true },
  scared: { name: 'pawns are scared of you', text: 'pawns step back instead of forward. they know what they did.' },
  double: { name: 'two in a row', text: 'take on two turns in a row = +1 heart. once per floor.' },
  bomb:   { name: 'bomb square', text: 'a bomb square shows up each floor. land on it. neighbours have a bad day.' },
  shield: { name: 'royal decree', text: 'the first hit each floor is ignored. paperwork pending.' },
  camel:  { name: 'camel legs', text: 'you can also jump 3+1. it is a camel thing.' },
  greed:  { name: 'tax evasion', text: '+50% coins. the king does not need to know.' },
  heart:  { name: 'extra heart', text: '+1 max heart and heal 1. vegetables, probably.', rep: true },
  chain:  { name: 'chain of command', text: 'combo survives 2 more quiet moves.' },
  skip:   { name: 'skip day', text: 'stairs unlock after a single capture.' },
  nap:    { name: 'nap', text: 'heal 2 hearts. you earned it. not really.', rep: true },
  pay:    { name: 'overtime pay', text: '+6 coins. taxed, obviously. still +6.', rep: true },
  glass:  { name: 'glass cannon', text: 'combo climbs twice as fast. -1 max heart.', bad: 1 },
  overtime: { name: 'overtime', text: '+50% score. pawns and interns stop taking breaks.', bad: 1 },
  union:  { name: 'union rep', text: 'pawns never get promoted. interns are not in the union.' },
  intim:  { name: 'intimidation', text: 'after you take a piece, everything next to you freezes for a turn.' },
  chute:  { name: 'golden parachute', text: 'once per run, a hit that would end you leaves you on 1 heart.' },
  desk:   { name: 'clean desk policy', text: 'a clean sweep heals 1 heart.' },
  gamble: { name: 'expense report', text: '+3 coins per take. the vending machine charges 50% more.', bad: 1 }
};
const START_PERKS = [
  { id: '', name: 'none', need: function () { return true; }, lock: '' },
  { id: 'camel', name: 'camel legs', need: function () { return meta.bestFloor >= 3; }, lock: 'reach floor 3' },
  { id: 'shield', name: 'royal decree', need: function () { return meta.totalCaptures >= 40; }, lock: '40 total takes' },
  { id: 'bomb', name: 'bomb square', need: function () { return meta.bestFloor >= 6; }, lock: 'reach floor 6' }
];
function bishopUnlocked() { return meta.bestFloor >= 10; }

/* ---------- game state ---------- */
let G = null;
let runSeedOverride = null;
let dangerOn = true;
let busyUntil = 0;
let kbMode = false;
let selIdx = 0;
let paused = false;

function newRun(opts) {
  opts = opts || {};
  paused = false; lastCombo = 0;
  if (G && G.phase !== 'over' && G.turn > 0 && !SHOT) {
    ccCall('end', { score: Math.max(1, G.score + G.floor), durationMs: Math.round(performance.now() - G.startTime), completed: false });
  }
  const daily = !!opts.daily;
  let seed;
  if (daily) { const d = new Date(); seed = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
  else if (opts.seed != null) seed = opts.seed >>> 0;
  else if (runSeedOverride != null) seed = runSeedOverride >>> 0;
  else seed = (Math.random() * 4294967295) >>> 0;
  const hero = (opts.hero || meta.hero) === 'bishop' && bishopUnlocked() ? 'bishop' : 'knight';
  G = {
    seed: seed, daily: daily, hero: hero, N: 6, floor: 0, kx: 0, ky: 0,
    hearts: 3, maxHearts: 3, score: 0, coins: 0, captures: 0, combo: 0, bestCombo: 0, quiet: 0,
    enemies: [], stairs: null, bomb: null, taken: 0, total: 0, perks: {}, used: {}, mode: null,
    phase: 'play', turn: 0, lastTakeTurn: -9, startTime: performance.now(), rng: mulberry(seed ^ 0x9e3779b9), idc: 1,
    bossName: '', floorTurns: 0, hitsThisFloor: 0, over: false, log: [], chuteUsed: false, intro: null, lastClear: ''
  };
  const sp = opts.startPerk != null ? opts.startPerk : meta.startPerk;
  if (sp && START_PERKS.some(function (s) { return s.id === sp && s.need(); })) G.perks[sp] = 1;
  evCount = 0;
  dyingFx.length = 0; parts.length = 0; floats.length = 0;
  hideOverlay();
  startFloor(1);
  meta.runs++; writeSave();
  ccCall('start');
  ccEvent('run_start', { hero: hero, daily: daily });
}

function cheb(ax, ay, bx, by) { return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); }
function inB(x, y) { return x >= 0 && y >= 0 && x < G.N && y < G.N; }
function enemyAt(x, y) { for (let i = 0; i < G.enemies.length; i++) { const e = G.enemies[i]; if (e.x === x && e.y === y) return e; } return null; }
function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

function mkEnemy(t, x, y, extra) {
  const e = { id: G.idc++, t: t, x: x, y: y, px: x, py: y, dir: 1, hp: 1, maxHp: 1, boss: null, flash: 0, bounce: 0 };
  if (extra) Object.assign(e, extra);
  return e;
}

function startFloor(f) {
  G.floor = f;
  G.N = f <= 3 ? 6 : f <= 7 ? 7 : 8;
  G.used = {}; G.mode = null; G.clockMsg = 0; G.dance = 0; G.taken = 0; G.floorTurns = 0; G.hitsThisFloor = 0; G.bossName = '';
  const r = mulberry((G.seed * 31 + f * 7919) >>> 0);
  const N = G.N;
  const isBoss = f % 5 === 0;
  let count = Math.min(Math.floor(N * N / 4), 3 + Math.floor(f * 0.6));
  const types = ['p'];
  if (f >= 2) types.push('b');
  if (f >= 3) types.push('r');
  if (f >= 4) types.push('i');
  if (f >= 6) types.push('k');
  if (f >= 7) types.push('q');
  if (f >= 8) types.push('n');
  const intro = isBoss ? null : (INTRO[f] || null);
  let ok = false;
  for (let attempt = 0; attempt < 80 && !ok; attempt++) {
    if (attempt > 0 && attempt % 20 === 0 && count > 2) count--;
    G.enemies = [];
    G.kx = 1 + Math.floor(r() * (N - 2)); G.ky = N - 1;
    const occupied = function (x, y) { return (x === G.kx && y === G.ky) || enemyAt(x, y); };
    const place = function (t, rowMin, rowMax, extra) {
      for (let k = 0; k < 40; k++) {
        const x = Math.floor(r() * N), y = rowMin + Math.floor(r() * (rowMax - rowMin + 1));
        if (!occupied(x, y)) { const e = mkEnemy(t, x, y, extra); G.enemies.push(e); return e; }
      }
      return null;
    };
    if (isBoss) {
      const cyc = Math.floor((f / 5 - 1) / BOSSES.length);
      const B = BOSSES[(f / 5 - 1) % BOSSES.length];
      const hp = B.hp + cyc * 2;
      place(B.t, 0, 1, { boss: B, hp: hp, maxHp: hp, slow: f === 5, range: f === 5 ? 3 : 0, mv: f === 5 ? 'b' : null });
      G.bossName = B.name + (cyc ? ' (again)' : '');
      const extra = f === 5 ? 2 : 2 + Math.floor(f / 6);
      for (let i = 0; i < extra; i++) {
        const t = (i === 0 || f === 5) ? 'p' : pick(r, types);
        if (t === 'p') place('p', 1, Math.max(1, N - 4)); else if (t === 'i') place('i', 0, 1); else place(t, 0, N - 3);
      }
    } else {
      let list;
      if (f === 1) list = ['p', 'p', 'p'];
      else if (f === 2) list = ['p', 'p', 'p', 'b'];
      else if (f === 3) list = ['p', 'p', 'p', 'r'];
      else if (f === 4) list = ['p', 'p', 'b', 'i'];
      else {
        list = intro ? [intro] : [];
        const pawnW = Math.max(0.25, 0.8 - f * 0.06);
        while (list.length < count) {
          let t = (list.length < 2 || r() < pawnW) ? 'p' : pick(r, types.slice(1));
          if (t === 'i' && list.filter(function (q) { return q === 'i'; }).length >= 2) t = 'p';
          list.push(t);
        }
      }
      for (const t of list) { if (t === 'p') place('p', 1, Math.max(1, N - 4)); else if (t === 'i') place('i', 0, 1); else place(t, 0, N - 3); }
    }
    // stairs on top row
    G.stairs = null;
    for (let k = 0; k < 30; k++) { const x = Math.floor(r() * N); if (!enemyAt(x, 0)) { G.stairs = { x: x, y: 0 }; break; } }
    if (!G.stairs) continue;
    G.bomb = null;
    if (G.perks.bomb) {
      for (let k = 0; k < 30; k++) {
        const x = Math.floor(r() * N), y = 1 + Math.floor(r() * (N - 3));
        if (!enemyAt(x, y) && !(x === G.kx && y === G.ky)) { G.bomb = { x: x, y: y }; break; }
      }
    }
    // fairness: never spawn threatened, and at least 2 safe moves
    if (attackersOf(G.kx, G.ky, null).length) continue;
    const ms = baseMoves(G.kx, G.ky);
    let safe = 0;
    for (const m of ms) { if (!attackersOf(m.x, m.y, enemyAt(m.x, m.y)).length) safe++; }
    if (safe < 2) continue;
    ok = true;
  }
  G.total = G.enemies.length;
  G.kdx = G.kx; G.kdy = G.ky; G.hop = 1;
  for (const e of G.enemies) { e.px = e.x; e.py = e.y - 0.6; e.bounce = 1; }
  selIdx = 0;
  banner = { text: 'floor ' + f, sub: G.bossName ? 'boss: ' + G.bossName : floorName(f), t: 0 };
  if (G.bossName) { sfx('boss'); }
  G.intro = intro;
  const bossE = G.enemies.find(function (e) { return e.boss; });
  if (f > 1 && !G.bossName) sfx('floor');
  if (f === 1 && G.turn === 0) { toast(INTRO_TXT.p, 0); heroSay(pick(Math.random, ['first day. how hard can chess be.', 'one horse. one shift. lets go.', 'i only move in Ls. its a lifestyle.']), 3.2); }
  else if (bossE) { toast(G.bossName + ' takes ' + bossE.hp + ' hits. ' + bossE.boss.plan + ' at half hp: phase 2, faster.', 7000); }
  else if (intro) { toast(INTRO_TXT[intro], 6000); const ne = G.enemies.find(function (e) { return e.t === intro; }); if (ne) bark(ne, INTRO_BARK[intro]); }
  else clearToast();
  updateHud();
}

/* ---------- movement + threat ---------- */
const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const CAMEL = [[1, 3], [3, 1], [-1, 3], [-3, 1], [1, -3], [3, -1], [-1, -3], [-3, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function occGrid(exclude) {
  const o = new Uint8Array(G.N * G.N);
  for (const e of G.enemies) if (e !== exclude) o[e.y * G.N + e.x] = 1;
  return o;
}
// squares enemy e attacks, given occupancy (knight never blocks: it is the target)
function attackSq(e, occ, out) {
  const N = G.N, x = e.x, y = e.y, mt = e.mv || e.t;
  const add = function (a, b) { if (a >= 0 && b >= 0 && a < N && b < N) out.push(b * N + a); };
  const lim = e.range || 99;
  const ray = function (dx, dy) { let a = x + dx, b = y + dy, k = 0; while (a >= 0 && b >= 0 && a < N && b < N && k < lim) { out.push(b * N + a); if (occ[b * N + a]) break; a += dx; b += dy; k++; } };
  switch (mt) {
    case 'p': add(x - 1, y + e.dir); add(x + 1, y + e.dir); break;
    case 'k': for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) add(x + dx, y + dy); break;
    case 'n': for (const d of KN) add(x + d[0], y + d[1]); break;
    case 'r': for (const d of ORTH) ray(d[0], d[1]); break;
    case 'b': for (const d of DIAG) ray(d[0], d[1]); break;
    case 'q': for (const d of ORTH) ray(d[0], d[1]); for (const d of DIAG) ray(d[0], d[1]); break;
  }
}
function attackersOf(x, y, exclude) {
  const occ = occGrid(exclude), idx = y * G.N + x, res = [], buf = [];
  for (const e of G.enemies) {
    if (e === exclude) continue;
    buf.length = 0; attackSq(e, occ, buf);
    if (buf.indexOf(idx) >= 0) res.push(e);
  }
  return res;
}
function threatMap() {
  const occ = occGrid(null), m = new Uint8Array(G.N * G.N), buf = [];
  for (const e of G.enemies) { buf.length = 0; attackSq(e, occ, buf); for (const i of buf) m[i]++; }
  return m;
}
// hero's normal moves from a square (no abilities)
function baseMoves(x, y) {
  const res = [];
  if (G.hero === 'bishop') {
    for (const d of DIAG) {
      for (let s = 1; s <= 3; s++) {
        const a = x + d[0] * s, b = y + d[1] * s;
        if (!inB(a, b)) break;
        res.push({ x: a, y: b });
        if (enemyAt(a, b)) break;
      }
    }
  } else {
    for (const d of KN) if (inB(x + d[0], y + d[1])) res.push({ x: x + d[0], y: y + d[1] });
  }
  return res;
}
function legalMoves() {
  if (!G || G.phase !== 'play') return [];
  let raw = [];
  const x = G.kx, y = G.ky;
  if (G.mode === 'other') {
    if (G.hero === 'bishop') { for (const d of KN) if (inB(x + d[0], y + d[1])) raw.push({ x: x + d[0], y: y + d[1] }); }
    else for (const d of DIAG) { let a = x + d[0], b = y + d[1]; while (inB(a, b)) { raw.push({ x: a, y: b }); if (enemyAt(a, b)) break; a += d[0]; b += d[1]; } }
  } else if (G.mode === 'corner') {
    const N = G.N;
    [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]].forEach(function (c) { if (c[0] !== x || c[1] !== y) raw.push({ x: c[0], y: c[1] }); });
  } else {
    raw = baseMoves(x, y);
    if (G.perks.camel && G.hero === 'knight') for (const d of CAMEL) if (inB(x + d[0], y + d[1])) raw.push({ x: x + d[0], y: y + d[1] });
  }
  for (const m of raw) {
    m.cap = enemyAt(m.x, m.y);
    m.atk = attackersOf(m.x, m.y, m.cap);
    m.stairs = stairsOpen() && G.stairs && m.x === G.stairs.x && m.y === G.stairs.y;
    if (m.stairs) m.atk = [];
    m.safe = m.atk.length === 0;
    m.ang = Math.atan2(m.y - y, m.x - x);
  }
  raw.sort(function (a, b) { return a.ang - b.ang; });
  return raw;
}
function stairsNeed() { return G.perks.skip ? 1 : Math.max(1, Math.floor(G.total / 2)); }
function stairsOpen() { return G.taken >= stairsNeed() || G.floorTurns >= shiftLimit(); }
function shiftLimit() { return 30 + G.floor * 2; }

/* ---------- player turn ---------- */
let banner = null;
function doMove(m) {
  if (!G || G.phase !== 'play' || paused) return false;
  const cap = enemyAt(m.x, m.y);
  const onStairs = G.stairs && m.x === G.stairs.x && m.y === G.stairs.y && stairsOpen();
  const atk = onStairs ? [] : attackersOf(m.x, m.y, cap);
  const usedMode = G.mode;
  if (G.mode) { G.used[G.mode] = 1; G.mode = null; }
  if (G.floor === 1 && G.turn === 0) toast('nice. pawns hit the two squares diagonally below them. take them before they reach the bottom.', 6000);
  const fx = G.kx, fy = G.ky;
  G.kx = m.x; G.ky = m.y; G.turn++; G.floorTurns++;
  G.hop = 0; G.hopFrom = { x: fx, y: fy }; G.hopDist = Math.hypot(m.x - fx, m.y - fy); G.hopKind = usedMode;
  let tookThisTurn = false;
  if (cap) {
    tookThisTurn = true;
    takePiece(cap, !atk.length, true);
  } else {
    G.quiet++;
    if (G.quiet > (G.perks.chain ? 4 : 2)) G.combo = 0;
    sfx('move');
  }
  // bomb square
  if (G.bomb && G.bomb.x === m.x && G.bomb.y === m.y) {
    const bx = G.bomb.x, by = G.bomb.y; G.bomb = null;
    shake = Math.max(shake, 14);
    burst(bx, by, '#ffd23f', 40, 1.6);
    floatText(bx, by, 'kaboom', '#ffd23f');
    for (const e of G.enemies.slice()) if (cheb(e.x, e.y, bx, by) === 1) { takePiece(e, true, false); tookThisTurn = true; }
    ccEvent('bomb', { floor: G.floor });
  }
  if (tookThisTurn) {
    if (G.perks.double && !G.used.double && G.lastTakeTurn === G.turn - 1 && G.hearts < G.maxHearts) {
      G.used.double = 1; G.hearts++; floatText(G.kx, G.ky, '+1 heart', '#ff5f7e');
    }
    G.lastTakeTurn = G.turn;
  }
  // hit?
  if (atk.length) {
    const a = atk[0];
    if (G.perks.shield && !G.used.shield) {
      G.used.shield = 1; floatText(G.kx, G.ky, 'decree!', '#5ce1ff'); bark(a, 'objection noted');
    } else {
      G.hearts--; G.hitsThisFloor++;
      hudFx('h-hearts', 'shake');
      if (G.hearts <= 0 && G.perks.chute && !G.chuteUsed) { G.hearts = 1; G.chuteUsed = true; floatText(G.kx, G.ky - 0.5, 'golden parachute!', '#ffd23f'); }
      G.combo = 0; G.quiet = 0;
      shake = Math.max(shake, 12); hurtFlash = 1; a.bounce = 1; a.lunge = 1;
      bark(a, pick(Math.random, BARK.hit));
      if (Math.random() < 0.35) heroSay(pick(Math.random, ['rude.', 'ow. noted.', 'that was a test.', 'hr will hear about this.']), 1.3);
      floatText(G.kx, G.ky, '-1', '#ff5f7e');
      sfx('hurt');
    }
  }
  busyUntil = performance.now() + 150;
  if (G.hearts <= 0) { gameOver(); return true; }
  if (G.enemies.length === 0) { floorDone('sweep'); return true; }
  if (G.stairs && G.kx === G.stairs.x && G.ky === G.stairs.y && stairsOpen()) { floorDone('stairs'); return true; }
  if (stairsOpen() && !meta.stairsTold) { meta.stairsTold = 1; writeSave(); toast('stairs open. they are a safe space: nothing can hit you on them.', 4500); }
  if (tookThisTurn && G.perks.intim) for (const e of G.enemies) if (cheb(e.x, e.y, G.kx, G.ky) === 1) e.frozen = 1;
  enemyPhase();
  selIdx = 0;
  updateHud();
  return true;
}

function takePiece(e, safe, byPlayer) {
  const v = T[e.t].val;
  if (e.boss && e.hp > 1) {
    e.hp--; e.flash = 1;
    shake = Math.max(shake, 10);
    burst(e.x, e.y, T[e.t].col, 22, 1.1);
    rings.push({ x: e.x + 0.5, y: e.y + 0.5, life: 1, col: '#ff5f7e' });
    const mult = safe ? comboMult() : 1;
    const pts = Math.round(v * 10 * mult * (G.perks.overtime ? 1.5 : 1));
    G.score += pts; floatText(e.x, e.y, '+' + pts + (mult > 1 ? ' x' + mult.toFixed(1) : ''), '#ffd23f');
    if (safe && byPlayer) { G.combo += G.perks.glass ? 2 : 1; G.bestCombo = Math.max(G.bestCombo, G.combo); } else if (!safe) G.combo = 0;
    G.quiet = 0;
    // boss relocates far away
    const N = G.N, opts = [];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!enemyAt(x, y) && cheb(x, y, G.kx, G.ky) >= 3 && !(G.stairs && G.stairs.x === x && G.stairs.y === y)) opts.push([x, y]);
    if (opts.length) { const o = pick(G.rng, opts); e.x = o[0]; e.y = o[1]; e.px = o[0]; e.py = o[1] - 0.8; e.bounce = 1; }
    if (bossPhase2(e) && !e.p2) { e.p2 = 1; bark(e, 'phase 2. no more breaks.'); toast(e.boss.name + ' is in phase 2: it acts more often now.', 3500); }
    else bark(e, pick(Math.random, BARK.boss));
    if (e.boss.summon && (G.floorTurns + 1) % levyEvery(e) === 0) pickLevy(e);
    sfx('take');
    return;
  }
  const i = G.enemies.indexOf(e); if (i >= 0) G.enemies.splice(i, 1);
  G.taken++; G.captures++;
  meta.totalCaptures++;
  let mult = 1;
  if (safe && byPlayer) { G.combo += G.perks.glass ? 2 : 1; G.bestCombo = Math.max(G.bestCombo, G.combo); mult = comboMult(); }
  else if (!safe) G.combo = 0;
  G.quiet = 0;
  const pts = Math.round(v * 10 * (e.boss ? 5 : 1) * mult * (G.perks.overtime ? 1.5 : 1));
  G.score += pts;
  let c = v * (e.boss ? 4 : 1); if (e.t === 'i') c += 2; if (G.perks.gamble) c += 3; if (G.perks.greed) c = Math.ceil(c * 1.5);
  G.coins += c;
  dyingFx.push({ t: e.t, x: e.x, y: e.y, vx: (Math.random() - 0.5) * 6, vy: -7 - Math.random() * 3, r: 0, vr: (Math.random() - 0.5) * 0.5, life: 1, boss: e.boss });
  burst(e.x, e.y, T[e.t].col, e.boss ? 60 : 26, e.boss ? 1.8 : 1);
  rings.push({ x: e.x + 0.5, y: e.y + 0.5, life: 1, col: mult > 1 ? '#5ce1ff' : '#ffd23f' });
  shake = Math.max(shake, e.boss ? 16 : 6);
  floatText(e.x, e.y, '+' + pts + (mult > 1 ? ' x' + mult.toFixed(1) : ''), mult > 1 ? '#5ce1ff' : '#ffd23f');
  const lines = BARK.take[e.t];
  if (Math.random() < 0.6 || e.boss) speech.push({ x: e.x, y: e.y, text: e.boss ? 'fine. FINE.' : pick(Math.random, lines), life: 1.6 });
  if (e.boss) ccEvent('boss_down', { floor: G.floor, boss: e.boss.look });
  sfx('take');
}
function comboMult() { return Math.min(5, 1 + 0.5 * Math.max(0, G.combo - 1)); }

/* ---------- enemy turn ---------- */
// called for every candidate square of every enemy each turn, so it builds one threat map and only re-checks the
// capture squares (where the taken piece no longer blocks or attacks); same answer as attackersOf per move, far fewer passes
function countSafeKnight() {
  const tm = threatMap();
  let c = 0;
  for (const m of baseMoves(G.kx, G.ky)) {
    const on = enemyAt(m.x, m.y);
    if (on ? !attackersOf(m.x, m.y, on).length : !tm[m.y * G.N + m.x]) c++;
  }
  return c;
}
function enemyMoves(e) {
  const N = G.N, res = [], x = e.x, y = e.y, mt = e.mv || e.t;
  const free = function (a, b) { return a >= 0 && b >= 0 && a < N && b < N && !enemyAt(a, b) && !(a === G.kx && b === G.ky); };
  const lim = e.range || 99;
  const ray = function (dx, dy) { let a = x + dx, b = y + dy, k = 0; while (free(a, b) && k < lim) { res.push([a, b]); a += dx; b += dy; k++; } };
  switch (mt) {
    case 'k': for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && free(x + dx, y + dy)) res.push([x + dx, y + dy]); break;
    case 'n': for (const d of KN) if (free(x + d[0], y + d[1])) res.push([x + d[0], y + d[1]]); break;
    case 'r': for (const d of ORTH) ray(d[0], d[1]); break;
    case 'b': for (const d of DIAG) ray(d[0], d[1]); break;
    case 'q': for (const d of ORTH) ray(d[0], d[1]); for (const d of DIAG) ray(d[0], d[1]); break;
  }
  return res;
}
function internMove(e) {
  const free = function (a, b) { return inB(a, b) && !enemyAt(a, b) && !(a === G.kx && b === G.ky); };
  let opts = [];
  if (free(e.x, e.y + 1)) opts.push([e.x, e.y + 1]);
  else {
    if (free(e.x - 1, e.y + 1)) opts.push([e.x - 1, e.y + 1]);
    if (free(e.x + 1, e.y + 1)) opts.push([e.x + 1, e.y + 1]);
    if (!opts.length) { if (free(e.x - 1, e.y)) opts.push([e.x - 1, e.y]); if (free(e.x + 1, e.y)) opts.push([e.x + 1, e.y]); }
  }
  if (!opts.length) return;
  const o = pick(G.rng, opts); e.x = o[0]; e.y = o[1]; e.bounce = 0.6;
  if (e.y === G.N - 1) { e.t = 'q'; e.flash = 1; bark(e, 'i got your job'); burst(e.x, e.y, T.q.col, 18, 0.8); }
}
function bossPhase2(e) { return e.maxHp > 1 && e.hp <= Math.floor(e.maxHp / 2); }
function bossPeriod(e) { const p = e.boss.period || 1; return bossPhase2(e) ? Math.max(1, p - 1) : p; }
function bossActs(e, turn) { const p = bossPeriod(e); return p <= 1 || turn % p === 0; }
function levyEvery(e) { return bossPhase2(e) ? 2 : e.boss.summon; }
function pickLevy(e) {
  const opts = [];
  for (let x = 0; x < G.N; x++) for (let y = 0; y <= 1; y++) if (!enemyAt(x, y) && !(x === G.kx && y === G.ky) && cheb(x, y, G.kx, G.ky) > 2 && !(G.stairs && G.stairs.x === x && G.stairs.y === y)) opts.push([x, y]);
  e.levyAt = opts.length ? pick(G.rng, opts) : null;
}
function enemyPhase() {
  const f = G.floor;
  const smart = Math.min(0.85, 0.1 + f * 0.07);
  const activeP = f <= 4 ? 0.45 + (f - 1) * 0.02 : Math.min(0.9, 0.5 + f * 0.04);
  const r = G.rng;
  const list = G.enemies.slice();
  // fair squeeze: if the square you jumped to still has a safe way out, the movers don't close the last one, so a hit
  // comes from your own jump (onto red, or into a dead end). from floor 9 that mercy fades 12% a floor (88% of turns on 9,
  // 52% on 12, gone from 17) so the late floors still bite; before this, a careful player past floor 9 only ever took forced hits
  const hadOut = countSafeKnight() > 0 && (f <= 8 || r() < 1 - (f - 8) * 0.12);
  for (const e of list) {
    if (G.enemies.indexOf(e) < 0) continue;
    if (e.frozen) { e.frozen--; continue; }
    if (e.t === 'i') { if (G.perks.overtime || f > 4 || G.floorTurns % 2 === 0) internMove(e); continue; }
    if (e.t === 'p') {
      const period = G.perks.overtime ? 1 : f <= 2 ? 3 : f <= 7 ? 2 : 1;
      if ((G.turn + e.id) % period !== 0) continue; // pawns are slow (union rules)
      const dy = G.perks.scared ? -e.dir : e.dir;
      const nx = e.x, ny = e.y + dy;
      if (inB(nx, ny) && !enemyAt(nx, ny) && !(nx === G.kx && ny === G.ky)) {
        e.y = ny; e.bounce = 0.6;
        if (!G.perks.scared && !G.perks.union && ny === G.N - 1) {
          e.t = f <= 5 ? 'r' : 'q'; e.flash = 1; bark(e, pick(Math.random, BARK.promo)); burst(e.x, e.y, T[e.t].col, 18, 0.8);
        }
      }
      continue;
    }
    if (e.boss && !bossActs(e, G.floorTurns)) continue;
    const passes = e.boss && e.boss.twice ? 2 : 1;
    for (let pss = 0; pss < passes; pss++) {
      if (!e.boss && r() > activeP) continue;
      const cands = enemyMoves(e);
      const ox = e.x, oy = e.y;
      cands.push([ox, oy]);
      let best = null, bestS = 1e9;
      for (const c of cands) {
        e.x = c[0]; e.y = c[1];
        const safeN = countSafeKnight();
        // would the knight take me for free?
        let hang = 0;
        for (const m of baseMoves(G.kx, G.ky)) if (m.x === e.x && m.y === e.y && !attackersOf(m.x, m.y, e).length) { hang = 1; break; }
        // 0 safe moves means a forced hit: not allowed under the squeeze (hadOut); otherwise the round-3 cost by floor
        const s = safeN * 1.0 + (safeN === 0 ? (hadOut ? 50 : f <= 4 ? 4 : f <= 8 ? 1.6 : 0.4) : 0) + hang * 4 * smart + cheb(e.x, e.y, G.kx, G.ky) * 0.22 + r() * 2.2 * (1 - smart) + (c[0] === ox && c[1] === oy ? 0.15 : 0);
        if (s < bestS) { bestS = s; best = c; }
      }
      e.x = best[0]; e.y = best[1];
      if (e.x !== ox || e.y !== oy) e.bounce = 0.5;
    }
  }
  // overtime: once the shift clock has opened the stairs, management sends more staff every 8 turns
  const over = G.floorTurns - shiftLimit();
  if (over > 0 && over % 8 === 0 && G.enemies.length < G.N * 2) {
    const opts = [];
    for (let x = 0; x < G.N; x++) if (!enemyAt(x, 0) && !(x === G.kx && G.ky === 0) && !(G.stairs && G.stairs.x === x && G.stairs.y === 0) && cheb(x, 0, G.kx, G.ky) > 2) opts.push(x);
    if (opts.length) {
      const x = pick(r, opts), t = f >= 8 ? pick(r, ['r', 'b', 'p']) : 'p';
      const e = mkEnemy(t, x, 0); e.py = -1; e.bounce = 1; G.enemies.push(e); G.total++;
      bark(e, 'overtime. sorry. not sorry.');
    }
  }
  // tax king levies pawns on a square marked one turn ahead
  for (const e of G.enemies.slice()) {
    if (!(e.boss && e.boss.summon)) continue;
    const every = levyEvery(e);
    if (G.floorTurns % every === 0) {
      const pawns = G.enemies.filter(function (q) { return q.t === 'p'; }).length;
      const o = e.levyAt;
      if (pawns < 5 && o && !enemyAt(o[0], o[1]) && !(o[0] === G.kx && o[1] === G.ky)) {
        const p = mkEnemy('p', o[0], o[1]); p.py = o[1] - 1; p.bounce = 1; G.enemies.push(p); G.total++;
        bark(e, 'levy!');
      }
      e.levyAt = null;
    }
    if ((G.floorTurns + 1) % every === 0 && !e.levyAt) pickLevy(e);
  }
}

/* ---------- floors, perks, shop ---------- */
function floorDone(how) {
  const f = G.floor;
  const bonus = (how === 'sweep' ? 25 : 10) * f;
  G.score += bonus;
  G.log.push({ f: f, how: how, taken: G.taken, turns: G.floorTurns, hits: G.hitsThisFloor });
  if (how === 'sweep') { G.coins += 2; G.lastClear = 'clean sweep. +' + bonus + ' and 2c'; if (G.perks.desk && G.hearts < G.maxHearts) { G.hearts++; G.lastClear += ', +1 heart (clean desk)'; } }
  else G.lastClear = 'took the stairs. +' + bonus;
  clearToast();
  if (f % 5 === 0 && G.hearts < G.maxHearts) G.hearts++;
  meta.bestFloor = Math.max(meta.bestFloor, f + 1);
  writeSave();
  ccCall('score', G.score);
  if (f === 10 || f % 5 === 0) ccEvent('floor', { floor: f, score: G.score });
  sfx('clear');
  G.dance = 0.0001;
  heroSay(pick(Math.random, how === 'sweep' ? ['clocked it.', 'next.', 'that is called synergy.', 'horse things.', 'fired. all of them.'] : ['im on break.', 'stairs: undefeated.', 'see you never.']), 1.2);
  G.phase = 'perk';
  currentOffer = perkOffer();
  updateHud();
  setTimeout(function () { if (G && G.phase === 'perk') showPerks(); }, TEST ? 0 : 1050);
}

function perkOffer() {
  const r = G.rng;
  const pool = Object.keys(PERKS).filter(function (k) { return PERKS[k].rep || !G.perks[k]; })
    .filter(function (k) { return !(k === 'nap' && G.hearts >= G.maxHearts); })
    .filter(function (k) { return !(k === 'heart' && G.maxHearts >= 6); })
    .filter(function (k) { return k !== 'pay'; })
    .filter(function (k) { return !(k === 'glass' && G.maxHearts < 3); });
  const out = [];
  if (G.hearts < G.maxHearts - 1 && r() < 0.7) out.push('nap');
  while (out.length < 3 && pool.length) {
    const k = pool.splice(Math.floor(r() * pool.length), 1)[0];
    if (out.indexOf(k) < 0) out.push(k);
  }
  if (out.length < 3) out.push('pay');
  return out;
}
function perkName(k) { return k === 'other' && G.hero === 'bishop' ? 'horse day' : PERKS[k].name; }
function perkText(k) { return k === 'other' && G.hero === 'bishop' ? 'once per floor, jump like a knight. nostalgic.' : PERKS[k].text; }
function applyPerk(k) {
  if (k === 'heart') { G.maxHearts = Math.min(6, G.maxHearts + 1); G.hearts = Math.min(G.maxHearts, G.hearts + 1); }
  else if (k === 'nap') { G.hearts = Math.min(G.maxHearts, G.hearts + 2); }
  else if (k === 'pay') { G.coins += 6; }
  else {
    G.perks[k] = (G.perks[k] || 0) + 1;
    if (k === 'glass') { G.maxHearts = Math.max(1, G.maxHearts - 1); G.hearts = Math.min(G.hearts, G.maxHearts); }
  }
  sfx('perk');
}
let currentOffer = [];
function showPerks() {
  if (!currentOffer.length) currentOffer = perkOffer();
  const ov = $('ov');
  ov.className = '';
  let h = '<h2>floor ' + G.floor + ' cleared</h2><p class="sub">' + (G.lastClear ? G.lastClear + '<br>' : '') + 'pick a perk. they are all legal. mostly.</p><div class="cards">';
  currentOffer.forEach(function (k, i) {
    h += '<button class="card" type="button" data-i="' + i + '"><span class="k">' + (i + 1) + '</span><div><b>' + perkName(k) + (PERKS[k].bad ? ' <i class="bad">downside</i>' : '') + '</b><span>' + perkText(k) + '</span></div></button>';
  });
  h += '</div><p class="sub" style="margin-top:10px">hearts ' + G.hearts + '/' + G.maxHearts + ' &middot; coins ' + G.coins + '</p>';
  ov.innerHTML = h;
  ov.querySelectorAll('.card').forEach(function (b) { b.onclick = function () { choosePerk(+b.dataset.i); }; });
  const first = ov.querySelector('.card'); if (first && kbMode) first.focus();
}
function choosePerk(i) {
  if (!G || G.phase !== 'perk') return;
  const k = currentOffer[i]; if (!k) return;
  applyPerk(k);
  currentOffer = [];
  ccEvent('perk', { k: k, floor: G.floor });
  if (G.floor % 3 === 0) { G.phase = 'shop'; showShop(); }
  else nextFloor();
}
const SHOP = [
  { id: 'heal', name: 'coffee', text: 'heal 1 heart.', cost: 4 },
  { id: 'max', name: 'better chair', text: '+1 max heart (and heal 1).', cost: 10 },
  { id: 'perk', name: 'mystery envelope', text: 'a random perk. could be anything. it is a perk.', cost: 8 }
];
function costOf(s) { return G.perks.gamble ? Math.ceil(s.cost * 1.5) : s.cost; }
function showShop() {
  const ov = $('ov'); ov.className = '';
  let h = '<h2>the vending machine</h2><p class="sub">coins: <b style="color:#7cf29a">' + G.coins + '</b> &middot; hearts ' + G.hearts + '/' + G.maxHearts + '</p><div class="cards">';
  SHOP.forEach(function (s, i) {
    const can = G.coins >= costOf(s) && !(s.id === 'heal' && G.hearts >= G.maxHearts) && !(s.id === 'max' && G.maxHearts >= 6);
    h += '<button class="card' + (can ? '' : ' dis') + '" type="button" data-i="' + i + '"' + (can ? '' : ' disabled') + '><span class="k">' + (i + 1) + '</span><div><b>' + s.name + ' &middot; ' + costOf(s) + 'c</b><span>' + s.text + '</span></div></button>';
  });
  h += '<button class="card" type="button" data-i="leave"><span class="k">4</span><div><b>back to work</b><span>descend. the stairs await. they always do.</span></div></button></div>';
  ov.innerHTML = h;
  ov.querySelectorAll('.card').forEach(function (b) { b.onclick = function () { if (b.disabled) return; shopBuy(b.dataset.i === 'leave' ? 'leave' : +b.dataset.i); }; });
}
function shopBuy(i) {
  if (!G || G.phase !== 'shop') return false;
  if (i === 'leave' || i === 3) { nextFloor(); return true; }
  const s = SHOP[i]; if (!s || G.coins < costOf(s)) return false;
  if (s.id === 'heal') { if (G.hearts >= G.maxHearts) return false; G.hearts++; }
  if (s.id === 'max') { if (G.maxHearts >= 6) return false; G.maxHearts++; G.hearts = Math.min(G.maxHearts, G.hearts + 1); }
  if (s.id === 'perk') { const o = perkOffer(); applyPerk(o[0]); toast('envelope: ' + perkName(o[0]), 1800); }
  G.coins -= costOf(s);
  sfx('buy');
  ccEvent('buy', { id: s.id });
  showShop(); updateHud();
  return true;
}
function nextFloor() {
  hideOverlay();
  G.phase = 'play';
  startFloor(G.floor + 1);
}

/* ---------- game over ---------- */
let resultImg = '';
function gameOver() {
  G.phase = 'over'; G.over = true;
  G.log.push({ f: G.floor, how: 'died', taken: G.taken, turns: G.floorTurns, hits: G.hitsThisFloor });
  clearToast();
  const dur = Math.round(performance.now() - G.startTime);
  const score = Math.max(1, G.score + G.floor);
  G.score = score;
  const newBest = score > meta.bestScore;
  meta.bestScore = Math.max(meta.bestScore, score);
  meta.bestFloor = Math.max(meta.bestFloor, G.floor);
  if (G.daily) { const k = String(G.seed); meta.daily[k] = Math.max(meta.daily[k] || 0, score); }
  writeSave();
  sfx('die');
  shake = 20;
  dyingFx.push({ t: 'hero', x: G.kx, y: G.ky, vx: 2, vy: -9, r: 0, vr: 0.3, life: 1.4 });
  G.dead = true;
  ccEvent('death', { floor: G.floor, score: score });
  ccCall('end', { score: score, durationMs: dur, completed: G.floor > 5 });
  setTimeout(function () { showEnd(newBest, dur); }, TEST ? 0 : 900);
}
function deathLine() {
  const f = G.floor;
  if (f <= 1) return 'fired on day one. classic.';
  if (f <= 3) return 'the knight clocked out early.';
  if (f <= 5) return 'audited into the ground.';
  if (f <= 9) return 'a solid shift. still cooked.';
  if (f <= 14) return 'employee of the month (posthumous).';
  return 'the board would like a word. you are the word.';
}
function dateLabel() { return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase(); }
function todaySeed() { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function dailyCard(id) {
  const best = meta.daily[String(todaySeed())];
  return '<button class="card daily" type="button" id="' + id + '"><span class="k">d</span><div><b>daily shift &middot; ' + dateLabel() + '</b><span>same floors for everyone today. ' + (best ? 'your best today: ' + best + '.' : 'no shift logged today yet.') + '</span></div></button>';
}
function optsHtml() {
  let h = '<div class="opts"><span class="lbl">hero:</span><button class="opt' + (meta.hero !== 'bishop' ? ' sel' : '') + '" data-hero="knight" type="button">knight</button><button class="opt' + (meta.hero === 'bishop' ? ' sel' : '') + '" data-hero="bishop" type="button"' + (bishopUnlocked() ? '' : ' disabled') + '>bishop' + (bishopUnlocked() ? '' : ' (reach floor 10)') + '</button></div>';
  h += '<div class="opts"><span class="lbl">start perk:</span>';
  START_PERKS.forEach(function (sp) { const ok = sp.need(); h += '<button class="opt' + (meta.startPerk === sp.id ? ' sel' : '') + '" data-sp="' + sp.id + '" type="button"' + (ok ? '' : ' disabled') + '>' + sp.name + (ok ? '' : ' (' + sp.lock + ')') + '</button>'; });
  return h + '</div>';
}
function bindOpts(ov, redraw) {
  ov.querySelectorAll('[data-hero]').forEach(function (b) { b.onclick = function () { meta.hero = b.dataset.hero; writeSave(); redraw(); }; });
  ov.querySelectorAll('[data-sp]').forEach(function (b) { b.onclick = function () { meta.startPerk = b.dataset.sp; writeSave(); redraw(); }; });
}
const HOW = { sweep: ['swept', 'sw'], stairs: ['stairs', 'st'], died: ['cooked', 'dd'] };
function logHtml() {
  const L = G.log.slice(-12);
  let h = '<table class="flog"><tr><th>floor</th><th>result</th><th>taken</th><th>moves</th><th>hits</th></tr>';
  if (G.log.length > 12) h += '<tr><td colspan="5" class="more">...' + (G.log.length - 12) + ' earlier floors</td></tr>';
  L.forEach(function (l) { h += '<tr><td>' + l.f + (l.f % 5 === 0 ? ' (boss)' : '') + '</td><td class="' + HOW[l.how][1] + '">' + HOW[l.how][0] + '</td><td>' + l.taken + '</td><td>' + l.turns + '</td><td>' + (l.hits ? l.hits : '-') + '</td></tr>'; });
  return h + '</table>';
}
function showEnd(newBest, dur) {
  if (!G || G.phase !== 'over') return;
  resultImg = drawResultCard();
  const ov = $('ov'); ov.className = 'end';
  const sec = Math.round(dur / 1000);
  let h = '<h2>' + deathLine() + '</h2><p class="sub">' + (G.daily ? 'daily shift ' + dateLabel() + ' &middot; ' : '') + (newBest ? 'new best!' : 'best ' + meta.bestScore) + '</p>';
  h += '<div class="stats"><span>floor</span><b>' + G.floor + '</b><span>score</span><b>' + G.score + '</b><span>pieces taken</span><b>' + G.captures + '</b><span>best combo</span><b>x' + G.bestCombo + '</b><span>shift length</span><b>' + Math.floor(sec / 60) + 'm ' + (sec % 60) + 's</b><span>best floor ever</span><b>' + meta.bestFloor + '</b></div>';
  h += '<div class="row"><button class="btn big" id="e-again" type="button">run it back</button><button class="btn alt" id="e-share" type="button">share</button></div>';
  h += '<div class="cards" style="margin-bottom:8px">' + dailyCard('e-daily') + '</div>';
  h += logHtml();
  h += '<img class="rc" alt="result card" src="' + resultImg + '"><p class="sub" id="e-sharetxt"></p>';
  h += optsHtml();
  h += '<div class="tip" id="tipjar"></div><div class="credit">computer cooked games &middot; computercooked.com</div>';
  ov.innerHTML = h;
  ov.scrollTop = 0;
  $('e-again').onclick = function () { newRun({}); };
  $('e-daily').onclick = function () { newRun({ daily: true }); };
  $('e-share').onclick = share;
  bindOpts(ov, function () { const st = ov.scrollTop; showEnd(newBest, dur); ov.scrollTop = st; });
  try { if (window.ccTip && typeof window.ccTip.mount === 'function') window.ccTip.mount($('tipjar'), { game: 'knight-shift', slot: 'game-over' }); } catch (e) {}
  if (kbMode) $('e-again').focus();
}
function showMenu() {
  if (!G || G.phase !== 'play') return;
  paused = true;
  const ov = $('ov'); ov.className = 'menu';
  let h = '<h2 class="title">knight shift</h2><p class="sub">one horse. all of management.</p>';
  h += '<div class="row"><button class="btn big" id="m-resume" type="button">back to work</button></div>';
  h += '<div class="cards">' + dailyCard('m-daily') + '<button class="card" type="button" id="m-new"><span class="k">n</span><div><b>new run</b><span>fresh seed. same management.</span></div></button></div>';
  h += '<p class="sub" style="margin-top:10px">picks below apply to your next run</p>' + optsHtml();
  h += '<div class="stats" style="margin-top:8px"><span>best floor</span><b>' + meta.bestFloor + '</b><span>best score</span><b>' + meta.bestScore + '</b><span>pieces taken</span><b>' + meta.totalCaptures + '</b><span>shifts worked</span><b>' + meta.runs + '</b></div>';
  h += '<p class="sub">jump in an L. land on a piece to take it. red squares are where they can hit you. clear the floor or take the stairs once half are gone.</p>';
  h += '<div class="credit">computer cooked games</div>';
  ov.innerHTML = h;
  $('m-resume').onclick = closeMenu;
  $('m-daily').onclick = function () { newRun({ daily: true }); };
  $('m-new').onclick = function () { newRun({}); };
  bindOpts(ov, function () { const st = ov.scrollTop; showMenu(); ov.scrollTop = st; });
  if (kbMode) $('m-resume').focus();
}
function closeMenu() { hideOverlay(); paused = false; }
function shareText() {
  return 'knight shift: i reached floor ' + G.floor + ' with ' + G.score + ' points (' + G.captures + ' pieces taken, best combo x' + G.bestCombo + ')' + (G.daily ? ' on the daily' : '') + '. ' + deathLine() + ' computercooked.com/games/knight-shift';
}
function share() {
  const text = shareText();
  const done = function (msg, full) { const b = $('e-share'); if (b) b.textContent = msg; const t = $('e-sharetxt'); if (t && full) t.textContent = full; };
  try {
    if (navigator.share) {
      let data = { title: 'knight shift', text: text };
      const fallback = function () { navigator.share({ title: 'knight shift', text: text }).catch(function () {}); };
      fetch(resultImg).then(function (r) { return r.blob(); }).then(function (blob) {
        const file = new File([blob], 'knight-shift.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { data.files = [file]; navigator.share(data).catch(function () {}); }
        else fallback();
      }).catch(fallback);
      return;
    }
  } catch (e) {}
  try {
    navigator.clipboard.writeText(text).then(function () { done('copied!'); }, function () { done('copy this:', text); });
  } catch (e) { done('copy this:', text); }
}
function drawResultCard() {
  const c = document.createElement('canvas'); c.width = 600; c.height = 340;
  const x = c.getContext('2d');
  x.fillStyle = '#1b1f3b'; x.fillRect(0, 0, 600, 340);
  const cb = 32, ox = 398, oy = 22;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { x.fillStyle = (i + j) % 2 ? '#3f7f78' : '#2b3160'; x.fillRect(ox + i * cb, oy + j * cb, cb, cb); }
  drawPiece(x, 'hero', ox + 2.5 * cb, oy + 3.5 * cb, 66, '#5ce1ff', { eyes: 1, lookX: 1, lookY: -1, hero: G.hero });
  drawPiece(x, 'q', ox + 4.5 * cb, oy + 1.5 * cb, 44, T.q.col, { eyes: 1, lookX: -1, lookY: 1 });
  drawPiece(x, 'p', ox + 1.5 * cb, oy + 0.5 * cb, 36, T.p.col, { eyes: 1, lookX: 1, lookY: 1 });
  drawPiece(x, 'i', ox + 4.5 * cb, oy + 4.5 * cb, 36, T.i.col, { eyes: 1, lookX: -1, lookY: -1 });
  x.textBaseline = 'top'; x.textAlign = 'left';
  x.fillStyle = '#ffd23f'; x.font = '900 44px system-ui, sans-serif';
  x.fillText('knight shift', 26, 22);
  x.fillStyle = '#fff8ec'; x.font = '800 23px system-ui, sans-serif';
  x.fillText('floor ' + G.floor + (G.daily ? '  \u00b7 daily ' + dateLabel() : ''), 28, 82);
  x.fillText(G.score + ' pts', 28, 112);
  x.font = '700 17px system-ui, sans-serif'; x.fillStyle = '#5ce1ff';
  x.fillText(G.captures + ' taken  /  best combo x' + G.bestCombo, 28, 146);
  x.fillStyle = '#ff9f8f'; x.font = 'italic 700 16px system-ui, sans-serif';
  wrapText(x, deathLine(), 28, 176, 350, 20);
  // floor-by-floor strip
  const cols = { sweep: '#ffd23f', stairs: '#a879ff', died: '#ff5f7e' };
  const L = G.log.slice(-21);
  x.font = '800 11px system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  L.forEach(function (l, i) {
    const px = 28 + i * 26, py = 236;
    x.fillStyle = cols[l.how]; rr(x, px, py, 22, 22, 5); x.fill();
    x.fillStyle = l.how === 'stairs' ? '#fff' : '#1b1f3b'; x.fillText(String(l.f), px + 11, py + 11.5);
  });
  x.textAlign = 'left'; x.textBaseline = 'top'; x.font = '700 12px system-ui, sans-serif'; x.fillStyle = 'rgba(255,248,236,.65)';
  x.fillText('each square is a floor:  gold swept  \u00b7  purple stairs  \u00b7  red cooked', 28, 266);
  x.fillStyle = '#7cf29a'; x.font = '800 17px system-ui, sans-serif';
  x.fillText('computercooked.com/games/knight-shift', 28, 302);
  return c.toDataURL('image/png');
}
function wrapText(x, t, px, py, w, lh) {
  const words = t.split(' '); let line = '';
  for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (x.measureText(tst).width > w && line) { x.fillText(line, px, py); py += lh; line = wd; } else line = tst; }
  if (line) x.fillText(line, px, py);
}

/* ---------- ui helpers ---------- */
function $(id) { return document.getElementById(id); }
function hideOverlay() { const ov = $('ov'); ov.className = 'hidden'; ov.innerHTML = ''; }
let toastTimer = 0;
function toast(msg, ms) {
  const t = $('msg'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  if (ms) toastTimer = setTimeout(function () { t.classList.remove('show'); }, ms);
}
function clearToast() { clearTimeout(toastTimer); const t = $('msg'); if (t) t.classList.remove('show'); }
function hudFx(id, cls) { const el = $(id); if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); clearTimeout(el._fx); el._fx = setTimeout(function () { el.classList.remove(cls); }, 600); }
let lastCombo = 0;
function updateHud() {
  if (!G) return;
  let hs = ''; for (let i = 0; i < G.maxHearts; i++) hs += i < G.hearts ? '♥' : '♡';
  $('h-hearts').textContent = hs;
  $('h-floor').textContent = 'f' + G.floor + (G.daily ? ' daily' : '');
  $('h-score').textContent = G.score;
  $('h-coins').textContent = G.coins + 'c';
  const cm = $('h-combo');
  cm.textContent = 'x' + comboMult().toFixed(1).replace('.0', '');
  cm.classList.toggle('hot', G.combo >= 3);
  if (G.combo > lastCombo && G.combo >= 2) { hudFx('h-combo', 'pop'); bigText = { text: 'combo x' + comboMult().toFixed(1).replace('.0', ''), life: 1 }; }
  lastCombo = G.combo;
  const pk = $('perks');
  if (pk) { const names = Object.keys(G.perks).map(perkName); pk.textContent = names.length ? 'perks: ' + names.join(' · ') : 'no perks yet. clear a floor to pick one.'; }
  const sub = $('sub');
  const bE = G.enemies.find(function (q) { return q.boss; });
  if (sub) sub.textContent = 'floor ' + G.floor + ': ' + (G.bossName ? (bE ? 'boss hp ' + bE.hp + '/' + bE.maxHp + (bossPhase2(bE) ? ' \u00b7 phase 2' : ' \u00b7 phase 1') : 'boss down') : floorName(G.floor)) + (G.daily ? ' · daily shift' : '') + ' · stairs ' + (stairsOpen() ? 'open' : 'open after ' + (stairsNeed() - G.taken) + ' more');
  const a1 = $('b-ab1'), a2 = $('b-ab2');
  if (G.perks.other) {
    a1.classList.remove('hidden');
    a1.textContent = (G.hero === 'bishop' ? 'horse' : 'bishop') + (G.used.other ? ' (used)' : '');
    a1.disabled = !!G.used.other || G.phase !== 'play'; a1.classList.toggle('on', G.mode === 'other');
  } else a1.classList.add('hidden');
  if (G.perks.corner) {
    a2.classList.remove('hidden');
    a2.textContent = 'corner' + (G.used.corner ? ' (used)' : '');
    a2.disabled = !!G.used.corner || G.phase !== 'play'; a2.classList.toggle('on', G.mode === 'corner');
  } else a2.classList.add('hidden');
  $('b-danger').textContent = 'danger ' + (dangerOn ? 'on' : 'off');
  $('b-snd').textContent = soundOff() ? '♪ off' : '♪ on';
  $('b-snd').classList.toggle('off', soundOff());
}
function toggleMode(m) {
  if (!G || G.phase !== 'play' || !G.perks[m] || G.used[m]) return;
  G.mode = G.mode === m ? null : m; selIdx = 0; updateHud();
}
function heroSay(text, life) { speech.push({ x: G.kx, y: G.ky, text: text, life: life || 1.6, hero: true }); }
function bark(e, text) { speech.push({ x: e.x, y: e.y, text: text, life: 1.7, follow: e }); }

/* ---------- rendering ---------- */
const cv = $('cv');
const ctx = cv.getContext('2d');
let W = 0, H = 0, dpr = 1, cs = 40, bx = 0, by = 0;
let shake = 0, hurtFlash = 0;
const parts = [], floats = [], speech = [], dyingFx = [], rings = [];
let bigText = null;
function fitStage() {
  const st = $('stage');
  if (SHOT) { st.style.flex = '1 1 auto'; st.style.height = 'auto'; return; }
  const app = $('app');
  const used = $('brand').offsetHeight + $('hud').offsetHeight + $('sub').offsetHeight + $('msg').offsetHeight + $('info').offsetHeight + $('bar').offsetHeight;
  const avail = Math.max(120, app.clientHeight - used);
  const size = Math.min(app.clientWidth - 8, avail - 8);
  st.style.height = Math.floor(Math.min(avail, size + 12)) + 'px';
}
function resize() {
  fitStage();
  const r = cv.getBoundingClientRect();
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = Math.max(1, r.width); H = Math.max(1, r.height);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  layout();
}
function layout() {
  const N = G ? G.N : 6;
  if (SHOT) {
    const size = Math.min(H - 24, W * 0.56);
    cs = Math.floor(size / N); bx = Math.floor(W - cs * N - Math.max(12, W * 0.04)); by = Math.floor((H - cs * N) / 2);
    return;
  }
  const size = Math.min(W - 10, H - 10);
  cs = Math.max(10, Math.floor(size / N));
  bx = Math.floor((W - cs * N) / 2); by = Math.floor((H - cs * N) / 2);
}
function burst(x, y, col, n, power) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = (2 + Math.random() * 5) * (power || 1);
    parts.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 2, life: 0.6 + Math.random() * 0.5, col: Math.random() < 0.3 ? '#fff8ec' : col, sz: 0.06 + Math.random() * 0.08 });
  }
}
function floatText(x, y, text, col) { floats.push({ x: x + 0.5, y: y + 0.2, text: text, col: col, life: 1.2 }); }

function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

// chunky piece art, centred at (cx,cy), cell size s
function drawPiece(c, t, cx, cy, s, col, o) {
  o = o || {};
  const u = s / 100;
  c.save();
  c.translate(cx, cy);
  if (o.sq) c.scale(1 + o.sq * 0.12, 1 - o.sq * 0.12);
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.lineWidth = Math.max(1.5, 5 * u);
  c.strokeStyle = '#1b1f3b';
  c.fillStyle = col;
  // shadow
  c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(0, 36 * u, 32 * u, 8 * u, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = col;
  // base
  rr(c, -30 * u, 22 * u, 60 * u, 14 * u, 6 * u); c.fill(); c.stroke();
  let eyeY = -6 * u, eyeX = 9 * u;
  c.beginPath();
  if (t === 'p') {
    c.moveTo(-18 * u, 22 * u); c.lineTo(-10 * u, -2 * u); c.lineTo(10 * u, -2 * u); c.lineTo(18 * u, 22 * u); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -14 * u, 16 * u, 0, Math.PI * 2); c.fill(); c.stroke();
    eyeY = -15 * u; eyeX = 7 * u;
  } else if (t === 'i') {
    c.moveTo(-15 * u, 22 * u); c.lineTo(-9 * u, 0); c.lineTo(9 * u, 0); c.lineTo(15 * u, 22 * u); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -13 * u, 14 * u, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-7 * u, 1 * u); c.lineTo(0, 9 * u); c.lineTo(7 * u, 1 * u); c.strokeStyle = '#2b6cff'; c.lineWidth = Math.max(1, 2.5 * u); c.stroke();
    c.fillStyle = '#fff'; c.fillRect(-5 * u, 9 * u, 10 * u, 8 * u); c.strokeStyle = '#1b1f3b'; c.lineWidth = Math.max(1, 2 * u); c.strokeRect(-5 * u, 9 * u, 10 * u, 8 * u);
    c.beginPath(); c.moveTo(-10 * u, -26 * u); c.quadraticCurveTo(0, -34 * u, 10 * u, -26 * u); c.stroke();
    c.lineWidth = Math.max(1.5, 5 * u); c.fillStyle = col;
    eyeY = -13 * u; eyeX = 6 * u;
  } else if (t === 'r') {
    c.moveTo(-20 * u, 22 * u); c.lineTo(-17 * u, -14 * u); c.lineTo(17 * u, -14 * u); c.lineTo(20 * u, 22 * u); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-24 * u, -14 * u); c.lineTo(-24 * u, -34 * u); c.lineTo(-13 * u, -34 * u); c.lineTo(-13 * u, -26 * u); c.lineTo(-5 * u, -26 * u); c.lineTo(-5 * u, -34 * u); c.lineTo(5 * u, -34 * u); c.lineTo(5 * u, -26 * u); c.lineTo(13 * u, -26 * u); c.lineTo(13 * u, -34 * u); c.lineTo(24 * u, -34 * u); c.lineTo(24 * u, -14 * u); c.closePath(); c.fill(); c.stroke();
    eyeY = -2 * u;
  } else if (t === 'b') {
    c.ellipse(0, -4 * u, 19 * u, 28 * u, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.arc(0, -36 * u, 7 * u, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(4 * u, -26 * u); c.lineTo(13 * u, -14 * u); c.stroke();
    c.beginPath(); c.moveTo(-14 * u, 22 * u); c.lineTo(-12 * u, 14 * u); c.lineTo(12 * u, 14 * u); c.lineTo(14 * u, 22 * u); c.fill(); c.stroke();
    eyeY = -4 * u; eyeX = 8 * u;
  } else if (t === 'q' || t === 'k') {
    c.moveTo(-22 * u, 22 * u); c.lineTo(-15 * u, -12 * u); c.lineTo(15 * u, -12 * u); c.lineTo(22 * u, 22 * u); c.closePath(); c.fill(); c.stroke();
    if (t === 'q') {
      c.beginPath(); c.moveTo(-22 * u, -12 * u); c.lineTo(-26 * u, -36 * u); c.lineTo(-12 * u, -22 * u); c.lineTo(0, -40 * u); c.lineTo(12 * u, -22 * u); c.lineTo(26 * u, -36 * u); c.lineTo(22 * u, -12 * u); c.closePath(); c.fill(); c.stroke();
      for (const p of [[-26, -38], [0, -42], [26, -38]]) { c.beginPath(); c.arc(p[0] * u, p[1] * u, 4.5 * u, 0, Math.PI * 2); c.fillStyle = '#fff8ec'; c.fill(); c.stroke(); }
      c.fillStyle = col;
    } else {
      c.beginPath(); rr(c, -20 * u, -26 * u, 40 * u, 16 * u, 6 * u); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(0, -28 * u); c.lineTo(0, -46 * u); c.moveTo(-7 * u, -39 * u); c.lineTo(7 * u, -39 * u); c.lineWidth = Math.max(2, 7 * u); c.stroke(); c.lineWidth = Math.max(1.5, 5 * u);
    }
    eyeY = 0;
  } else if (t === 'n' || t === 'hero') {
    if (o.hero === 'bishop') {
      c.ellipse(0, -4 * u, 19 * u, 28 * u, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(-14 * u, 22 * u); c.lineTo(-12 * u, 14 * u); c.lineTo(12 * u, 14 * u); c.lineTo(14 * u, 22 * u); c.fill(); c.stroke();
      eyeY = -6 * u; eyeX = 8 * u;
    } else {
      // horse head facing left
      c.moveTo(-20 * u, 22 * u); c.lineTo(-14 * u, 2 * u); c.lineTo(-30 * u, -4 * u); c.lineTo(-30 * u, -14 * u); c.lineTo(-10 * u, -32 * u); c.lineTo(-4 * u, -40 * u); c.lineTo(4 * u, -32 * u);
      c.quadraticCurveTo(26 * u, -24 * u, 22 * u, 22 * u); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(6 * u, -28 * u); c.quadraticCurveTo(22 * u, -16 * u, 16 * u, 14 * u); c.strokeStyle = 'rgba(27,31,59,.5)'; c.stroke(); c.strokeStyle = '#1b1f3b';
      c.beginPath(); c.arc(-26 * u, -8 * u, 2 * u, 0, Math.PI * 2); c.fillStyle = '#1b1f3b'; c.fill(); c.fillStyle = col;
      eyeY = -20 * u; eyeX = 7 * u;
    }
    if (t === 'hero') {
      // hard hat: it is a shift, after all
      const hy = o.hero === 'bishop' ? -30 * u : -34 * u, hx = o.hero === 'bishop' ? 0 : -6 * u;
      c.beginPath(); c.arc(hx, hy, 15 * u, Math.PI, 0); c.closePath(); c.fillStyle = '#ffd23f'; c.fill(); c.stroke();
      c.beginPath(); rr(c, hx - 21 * u, hy - 1 * u, 42 * u, 6 * u, 3 * u); c.fill(); c.stroke();
      c.fillStyle = col;
    }
  }
  // googly eyes that watch the knight
  if (o.eyes) {
    const lx = o.lookX || 0, ly = o.lookY || 0, ln = Math.hypot(lx, ly) || 1;
    const ex = t === 'n' || (t === 'hero' && o.hero !== 'bishop') ? -8 * u : 0;
    for (const sgn of [-1, 1]) {
      const px = ex + sgn * eyeX, py = eyeY;
      c.beginPath(); c.arc(px, py, 6.5 * u, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill(); c.lineWidth = Math.max(1, 2.5 * u); c.stroke();
      c.beginPath(); c.arc(px + lx / ln * 2.6 * u, py + ly / ln * 2.6 * u, 3.2 * u, 0, Math.PI * 2); c.fillStyle = '#1b1f3b'; c.fill();
    }
    if (o.angry) { c.lineWidth = Math.max(1.5, 3 * u); c.beginPath(); c.moveTo(ex - eyeX - 6 * u, eyeY - 10 * u); c.lineTo(ex - 2 * u, eyeY - 6 * u); c.moveTo(ex + eyeX + 6 * u, eyeY - 10 * u); c.lineTo(ex + 2 * u, eyeY - 6 * u); c.stroke(); }
  }
  // boss accessories
  if (o.look === 'acct') {
    c.lineWidth = Math.max(1.5, 3 * u); c.strokeStyle = '#1b1f3b';
    c.beginPath(); c.rect(-17 * u, -5 * u, 13 * u, 10 * u); c.rect(4 * u, -5 * u, 13 * u, 10 * u); c.moveTo(-4 * u, 0); c.lineTo(4 * u, 0); c.stroke();
    c.beginPath(); c.moveTo(0, 6 * u); c.lineTo(-5 * u, 12 * u); c.lineTo(0, 22 * u); c.lineTo(5 * u, 12 * u); c.closePath(); c.fillStyle = '#2b3160'; c.fill();
  } else if (o.look === 'tax') {
    c.fillStyle = '#1b1f3b'; c.font = '900 ' + Math.round(20 * u) + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('$', 0, 14 * u);
  } else if (o.look === 'coat') {
    c.fillStyle = 'rgba(120,85,50,.85)'; c.beginPath(); c.moveTo(-20 * u, 4 * u); c.lineTo(20 * u, 4 * u); c.lineTo(24 * u, 22 * u); c.lineTo(-24 * u, 22 * u); c.closePath(); c.fill(); c.stroke();
  } else if (o.look === 'evil') {
    c.fillStyle = '#1b1f3b'; c.beginPath(); c.moveTo(-6 * u, 10 * u); c.lineTo(6 * u, 10 * u); c.lineTo(0, 16 * u); c.fill();
  }
  if (o.flash > 0) { c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(255,255,255,' + (o.flash * 0.8) + ')'; c.fillRect(-50 * u, -50 * u, 100 * u, 100 * u); }
  c.restore();
}

let lastT = performance.now();
let moveCache = null, moveCacheKey = '';
function currentMoves() {
  if (!G || G.phase !== 'play') return [];
  const key = G.turn + '|' + G.floor + '|' + G.mode + '|' + G.enemies.length + '|' + G.kx + ',' + G.ky + '|' + G.N;
  if (key !== moveCacheKey) { moveCache = legalMoves(); moveCacheKey = key; }
  return moveCache;
}
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  if (!paused && !shotFrozen) update(dt);
  render(now);
  requestAnimationFrame(frame);
}
function update(dt) {
  if (!G) return;
  const k = 1 - Math.pow(0.0005, dt);
  for (const e of G.enemies) {
    e.px += (e.x - e.px) * k; e.py += (e.y - e.py) * k;
    e.flash = Math.max(0, e.flash - dt * 3); e.bounce = Math.max(0, e.bounce - dt * 3); e.lunge = Math.max(0, (e.lunge || 0) - dt * 3);
  }
  if (G.hop < 1) { G.hop = Math.min(1, G.hop + dt / 0.17); }
  if (G.dance) { G.dance += dt; if (G.dance > 1) G.dance = 0; }
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 14 * dt; p.vx *= 0.97; p.life -= dt; if (p.life <= 0) parts.splice(i, 1); }
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.y -= dt * 0.9; f.life -= dt; if (f.life <= 0) floats.splice(i, 1); }
  for (let i = speech.length - 1; i >= 0; i--) { const s = speech[i]; s.life -= dt; if (s.follow && G.enemies.indexOf(s.follow) >= 0) { s.x = s.follow.px; s.y = s.follow.py; } else if (s.hero && G.kdx != null) { s.x = G.kdx; s.y = G.kdy; } if (s.life <= 0) speech.splice(i, 1); }
  for (let i = dyingFx.length - 1; i >= 0; i--) { const d = dyingFx[i]; d.x += d.vx * dt; d.y += d.vy * dt; d.vy += 22 * dt; d.r += d.vr; d.life -= dt; if (d.life <= 0) dyingFx.splice(i, 1); }
  if (speech.length > 4) speech.splice(0, speech.length - 4);
  shake = Math.max(0, shake - dt * 45);
  hurtFlash = Math.max(0, hurtFlash - dt * 2.5);
  if (banner) { banner.t += dt; if (banner.t > 1.8) banner = null; }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].life -= dt * 2.4; if (rings[i].life <= 0) rings.splice(i, 1); }
  if (bigText) { bigText.life -= dt * 0.9; if (bigText.life <= 0) bigText = null; }
}
function cellXY(x, y) { return [bx + x * cs, by + y * cs]; }
function render(now) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#1b1f3b'; ctx.fillRect(0, 0, W, H);
  if (!G) return;
  layout();
  const N = G.N;
  ctx.save();
  if (shake > 0) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  // board frame
  ctx.fillStyle = '#2b3160'; rr(ctx, bx - 6, by - 6, cs * N + 12, cs * N + 12, 12); ctx.fill();
  const playing = G.phase === 'play';
  // squares + danger tint (cached, see boardLayer)
  ctx.drawImage(boardLayer(N, dangerOn && (playing || SHOT)), bx, by, cs * N, cs * N);
  // stairs
  if (G.stairs) {
    const p = cellXY(G.stairs.x, G.stairs.y), open = stairsOpen();
    if (open) { ctx.fillStyle = '#d9fbe4'; ctx.fillRect(p[0], p[1], cs, cs); ctx.strokeStyle = '#2bd96b'; ctx.lineWidth = Math.max(2, cs * 0.05); ctx.strokeRect(p[0] + 2, p[1] + 2, cs - 4, cs - 4); }
    ctx.save(); ctx.globalAlpha = open ? 1 : 0.45;
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#5b4a9e' : '#7a64d6'; ctx.fillRect(p[0] + cs * 0.15 + i * cs * 0.0, p[1] + cs * (0.2 + i * 0.16), cs * (0.7 - i * 0.12), cs * 0.16); }
    ctx.fillStyle = open ? '#ffd23f' : '#fff8ec'; ctx.font = '900 ' + Math.round(cs * 0.2) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const stl = open ? 'down' : (stairsNeed() - G.taken) + ' more';
    if (open && G.floorTurns === shiftLimit() && !G.clockMsg) { G.clockMsg = 1; toast('shift is over. the stairs are open, take them.', 4000); }
    ctx.globalAlpha = 1; ctx.lineWidth = Math.max(2, cs * 0.05); ctx.strokeStyle = '#1b1f3b'; ctx.strokeText(stl, p[0] + cs / 2, p[1] + cs * 0.12);
    ctx.fillText(stl, p[0] + cs / 2, p[1] + cs * 0.12);
    ctx.restore();
  }
  if (G.bomb) {
    const p = cellXY(G.bomb.x, G.bomb.y), pul = 1 + Math.sin(now / 160) * 0.06;
    ctx.save(); ctx.translate(p[0] + cs / 2, p[1] + cs / 2); ctx.scale(pul, pul);
    ctx.fillStyle = '#1b1f3b'; ctx.beginPath(); ctx.arc(0, cs * 0.05, cs * 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = cs * 0.06; ctx.beginPath(); ctx.moveTo(cs * 0.12, -cs * 0.15); ctx.quadraticCurveTo(cs * 0.25, -cs * 0.35, cs * 0.3, -cs * 0.3); ctx.stroke();
    ctx.restore();
  }
  // legal moves
  const moves = playing && !G.dead && !SHOT ? currentMoves() : [];
  const pulse = 0.5 + 0.5 * Math.sin(now / 220);
  moves.forEach(function (m, i) {
    const p = cellXY(m.x, m.y), cx = p[0] + cs / 2, cy = p[1] + cs / 2;
    const col = !m.safe ? '#ff375f' : m.cap ? '#ffd23f' : m.stairs ? '#a879ff' : '#2bd96b';
    ctx.lineWidth = Math.max(2, cs * 0.08);
    ctx.strokeStyle = col;
    if (m.cap) { ctx.beginPath(); ctx.arc(cx, cy, cs * (0.42 + pulse * 0.03), 0, Math.PI * 2); ctx.stroke(); }
    else {
      ctx.fillStyle = col; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.arc(cx, cy, cs * (0.15 + pulse * 0.03), 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(cx, cy, cs * 0.15, 0, Math.PI * 2); ctx.strokeStyle = '#1b1f3b'; ctx.lineWidth = Math.max(1, cs * 0.03); ctx.stroke();
    }
    if (!m.safe) { ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(cs * 0.2) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; if (!m.cap) ctx.fillText('!', cx, cy + 1); }
    if (kbMode) {
      if (i === selIdx % moves.length) { ctx.strokeStyle = '#1b1f3b'; ctx.lineWidth = Math.max(2, cs * 0.07); ctx.strokeRect(p[0] + 3, p[1] + 3, cs - 6, cs - 6); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1, cs * 0.035); ctx.strokeRect(p[0] + 3, p[1] + 3, cs - 6, cs - 6); }
      ctx.fillStyle = '#1b1f3b'; ctx.font = '900 ' + Math.round(cs * 0.2) + 'px system-ui'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      if (i < 9) ctx.fillText(String(i + 1), p[0] + cs * 0.07, p[1] + cs * 0.05);
    }
  });
  // enemies
  const kdxy = heroDraw();
  // who would hit you: hovered / keyboard-selected / armed red move
  let pv = null;
  if (moves.length) {
    if (armed && armed.turn === G.turn) pv = moves.find(function (q) { return q.x === armed.x && q.y === armed.y; });
    else if (kbMode) pv = moves[selIdx % moves.length];
    else if (hoverCell) pv = moves.find(function (q) { return q.x === hoverCell[0] && q.y === hoverCell[1]; });
  }
  if (pv && !pv.safe) {
    ctx.save(); ctx.strokeStyle = '#ff375f'; ctx.lineWidth = Math.max(2, cs * 0.06); ctx.setLineDash([cs * 0.12, cs * 0.08]); ctx.lineDashOffset = -now / 40;
    for (const a of pv.atk) {
      ctx.beginPath(); ctx.moveTo(bx + (a.px + 0.5) * cs, by + (a.py + 0.5) * cs); ctx.lineTo(bx + (pv.x + 0.5) * cs, by + (pv.y + 0.5) * cs); ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + (a.px + 0.5) * cs, by + (a.py + 0.5) * cs, cs * 0.46, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  const sorted = G.enemies.slice().sort(function (a, b) { return a.py - b.py; });
  for (const e of sorted) {
    let cx = bx + (e.px + 0.5) * cs, cy = by + (e.py + 0.5) * cs;
    if (e.lunge) { cx += (kdxy[0] - cx) * e.lunge * 0.3; cy += (kdxy[1] - cy) * e.lunge * 0.3; }
    const bob = Math.sin(now / 300 + e.id) * cs * 0.015;
    const sc = e.boss ? 1.12 : 0.9;
    drawPiece(ctx, e.t, cx, cy - cs * 0.04 + bob - e.bounce * cs * 0.12, cs * sc, T[e.t].col, { eyes: 1, lookX: kdxy[0] - cx, lookY: kdxy[1] - cy, sq: e.bounce, flash: e.flash, angry: !!e.boss || e.lunge > 0, look: e.boss ? e.boss.look : null });
    if (e.boss) {
      for (let i = 0; i < e.maxHp; i++) {
        ctx.fillStyle = i < e.hp ? '#ff5f7e' : 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.arc(cx - (e.maxHp - 1) * cs * 0.07 + i * cs * 0.14, cy - cs * 0.52, cs * 0.055, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1b1f3b'; ctx.lineWidth = 1.5; ctx.stroke();
      }
      if (playing && !SHOT) {
        const nt = G.floorTurns + 1;
        let tag, tcol;
        if (e.boss.summon) { const k = levyEvery(e) - (G.floorTurns % levyEvery(e)); tag = k === 1 ? 'levy next!' : 'levy in ' + k; tcol = k === 1 ? '#ffd23f' : '#fff8ec'; }
        else if (bossActs(e, nt)) { tag = e.boss.twice ? 'moves x2 next!' : 'moves next!'; tcol = '#ff5f7e'; }
        else { tag = e.boss.twice ? 'arguing...' : 'resting'; tcol = '#c8d0ff'; }
        if (bossPhase2(e)) tag = 'p2 \u00b7 ' + tag;
        ctx.font = '900 ' + Math.round(Math.max(10, cs * 0.17)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3.5; ctx.strokeStyle = '#1b1f3b'; ctx.strokeText(tag, cx, cy + cs * 0.5); ctx.fillStyle = tcol; ctx.fillText(tag, cx, cy + cs * 0.5);
        if (e.levyAt) {
          const lx = bx + e.levyAt[0] * cs, ly = by + e.levyAt[1] * cs;
          ctx.save(); ctx.setLineDash([cs * 0.1, cs * 0.07]); ctx.lineDashOffset = -now / 50; ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = Math.max(2, cs * 0.06);
          ctx.strokeRect(lx + 4, ly + 4, cs - 8, cs - 8); ctx.restore();
          ctx.fillStyle = '#c99a00'; ctx.font = '900 ' + Math.round(cs * 0.4) + 'px system-ui'; ctx.fillText('$', lx + cs / 2, ly + cs / 2);
        }
      }
    }
    if (e.frozen) { ctx.font = '900 ' + Math.round(cs * 0.24) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = '#1b1f3b'; ctx.strokeText('zz', cx + cs * 0.3, cy - cs * 0.38); ctx.fillStyle = '#5ce1ff'; ctx.fillText('zz', cx + cs * 0.3, cy - cs * 0.38); }
  }
  // hero
  if (!G.dead) {
    const hx = kdxy[0], hy = kdxy[1];
    const near = nearestEnemy();
    let dy = 0, rot = 0;
    if (G.dance) { const t = G.dance; dy = -Math.abs(Math.sin(t * Math.PI * 3)) * cs * 0.28; rot = Math.sin(t * Math.PI * 4) * 0.35; }
    ctx.save(); ctx.translate(hx, hy + dy); ctx.rotate(rot); ctx.translate(-hx, -hy);
    drawPiece(ctx, 'hero', hx, hy - cs * 0.04, cs * 0.95, hurtFlash > 0 && Math.floor(now / 60) % 2 ? '#ff5f7e' : '#5ce1ff', { eyes: 1, lookX: near ? near.px - G.kdx : 0, lookY: near ? near.py - G.kdy : -1, hero: G.hero, sq: G.hop < 1 ? -Math.sin(G.hop * Math.PI) * 0.6 : 0 });
    ctx.restore();
  }
  for (const d of dyingFx) {
    ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, d.life));
    const cx = bx + (d.x + 0.5) * cs, cy = by + (d.y + 0.5) * cs;
    ctx.translate(cx, cy); ctx.rotate(d.r);
    drawPiece(ctx, d.t, 0, 0, cs * (d.boss ? 1.1 : 0.9), d.t === 'hero' ? '#5ce1ff' : T[d.t].col, { eyes: 1, lookX: 0, lookY: -1, hero: G.hero, angry: d.t === 'hero' });
    ctx.restore();
  }
  // particles + shockwaves stay inside the board frame
  ctx.save(); ctx.beginPath(); ctx.rect(bx - 6, by - 6, cs * N + 12, cs * N + 12); ctx.clip();
  for (const rg of rings) {
    const t = 1 - rg.life;
    ctx.globalAlpha = Math.max(0, rg.life); ctx.strokeStyle = rg.col; ctx.lineWidth = Math.max(2, cs * 0.12 * rg.life);
    ctx.beginPath(); ctx.arc(bx + rg.x * cs, by + rg.y * cs, cs * (0.25 + t * 0.9), 0, Math.PI * 2); ctx.stroke();
  }
  for (const p of parts) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); ctx.fillStyle = p.col;
    const s = p.sz * cs; ctx.fillRect(bx + p.x * cs - s / 2, by + p.y * cs - s / 2, s, s);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.restore();
  // floating text + speech (not shaken)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const f of floats) {
    ctx.globalAlpha = Math.min(1, f.life * 2);
    ctx.font = '900 ' + Math.round(Math.max(13, cs * 0.3)) + 'px system-ui';
    ctx.lineWidth = 4; ctx.strokeStyle = '#1b1f3b'; ctx.strokeText(f.text, bx + f.x * cs, by + f.y * cs); ctx.fillStyle = f.col; ctx.fillText(f.text, bx + f.x * cs, by + f.y * cs);
  }
  ctx.globalAlpha = 1;
  for (const s of speech) drawSpeech(s);
  if (hurtFlash > 0) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(255,40,70,' + hurtFlash * 0.12 + ')'); g.addColorStop(1, 'rgba(255,20,50,' + hurtFlash * 0.75 + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (bigText) {
    const t = 1 - bigText.life, sc = t < 0.15 ? 0.6 + t / 0.15 * 0.6 : 1.2 - Math.min(0.2, (t - 0.15));
    ctx.save(); ctx.globalAlpha = Math.min(1, bigText.life * 2.5);
    ctx.translate(bx + cs * G.N / 2, SHOT ? by + cs * (G.N - 0.8) : by + cs * 0.9 - t * cs * 0.3); ctx.scale(sc, sc);
    ctx.font = '900 ' + Math.round(Math.max(22, cs * 0.55)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 7; ctx.strokeStyle = '#1b1f3b'; ctx.strokeText(bigText.text, 0, 0); ctx.fillStyle = '#5ce1ff'; ctx.fillText(bigText.text, 0, 0);
    ctx.restore();
  }
  if (banner && !SHOT) {
    const a = banner.t < 0.25 ? banner.t / 0.25 : banner.t > 1.4 ? Math.max(0, (1.8 - banner.t) / 0.4) : 1;
    ctx.globalAlpha = a;
    const bw = Math.min(W - 20, 340), bh = 62, x0 = (W - bw) / 2, y0 = by + cs * G.N / 2 - bh / 2;
    ctx.fillStyle = 'rgba(27,31,59,.92)'; rr(ctx, x0, y0, bw, bh, 14); ctx.fill(); ctx.strokeStyle = G.bossName ? '#ff5f7e' : '#ffd23f'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.font = '900 24px system-ui'; ctx.fillText(banner.text, W / 2, y0 + 22);
    ctx.fillStyle = '#fff8ec'; ctx.font = '700 14px system-ui'; ctx.fillText(banner.sub, W / 2, y0 + 46);
    ctx.globalAlpha = 1;
  }
  if (SHOT) drawShotTitle();
  if (paused) { ctx.fillStyle = 'rgba(17,20,40,.7)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#fff8ec'; ctx.font = '900 28px system-ui'; ctx.fillText('paused', W / 2, H / 2 - 10); ctx.font = '700 14px system-ui'; ctx.fillText('tap to clock back in', W / 2, H / 2 + 18); }
}
// the squares and the danger tint only change when a piece moves, so they are drawn into an offscreen canvas once per
// change instead of every frame (the striped tint, with a clip per red square, was the costliest part of a busy frame)
let boardCv = null, boardKey = '';
function boardLayer(N, tint) {
  let sig = 0;
  for (let i = 0; i < G.enemies.length; i++) { const e = G.enemies[i]; sig = (sig * 31 + e.x * 97 + e.y * 13 + e.t.charCodeAt(0) + (e.range || 0) * 7 + (e.mv ? 3 : 0)) | 0; }
  const key = N + '|' + cs + '|' + dpr + '|' + (tint ? 1 : 0) + '|' + G.enemies.length + '|' + sig;
  if (boardCv && key === boardKey) return boardCv;
  boardKey = key;
  if (!boardCv) boardCv = document.createElement('canvas');
  const px = Math.max(1, Math.round(cs * N * dpr));
  if (boardCv.width !== px || boardCv.height !== px) { boardCv.width = px; boardCv.height = px; }
  const c = boardCv.getContext('2d');
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    c.fillStyle = (x + y) % 2 ? '#7fd1c1' : '#fdf3dc';
    c.fillRect(x * cs, y * cs, cs, cs);
  }
  if (tint) {
    const tm = threatMap();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = tm[y * N + x]; if (!v) continue;
      const p0 = x * cs, p1 = y * cs;
      c.fillStyle = (x + y) % 2 ? (v > 1 ? '#ef6f7f' : '#f4919c') : (v > 1 ? '#ff9aa5' : '#ffc0c5'); c.fillRect(p0, p1, cs, cs);
      c.strokeStyle = 'rgba(160,0,30,.2)'; c.lineWidth = Math.max(1, cs * 0.05);
      c.save(); c.beginPath(); c.rect(p0, p1, cs, cs); c.clip();
      c.beginPath(); for (let s = -cs; s < cs * 2; s += cs / 3) { c.moveTo(p0 + s, p1); c.lineTo(p0 + s - cs, p1 + cs); } c.stroke(); c.restore();
    }
  }
  return boardCv;
}
function heroDraw() {
  const t = G.hop < 1 ? easeOut(G.hop) : 1;
  const f = G.hopFrom || { x: G.kx, y: G.ky };
  let x = f.x + (G.kx - f.x) * t, y = f.y + (G.ky - f.y) * t;
  if (G.hop >= 1) { x = G.kx; y = G.ky; }
  G.kdx = x; G.kdy = y;
  const arc = G.hop < 1 ? Math.sin(t * Math.PI) * cs * (0.35 + (G.hopDist || 2) * 0.06) : 0;
  return [bx + (x + 0.5) * cs, by + (y + 0.5) * cs - arc];
}
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function nearestEnemy() { let b = null, bd = 1e9; for (const e of G.enemies) { const d = Math.abs(e.x - G.kx) + Math.abs(e.y - G.ky); if (d < bd) { bd = d; b = e; } } return b; }
function drawSpeech(s) {
  const a = Math.min(1, s.life * 3);
  ctx.globalAlpha = a;
  ctx.font = '800 ' + Math.round(Math.max(11, Math.min(15, cs * 0.24))) + 'px system-ui';
  const tw = ctx.measureText(s.text).width + 14, th = Math.max(20, cs * 0.36);
  let x = bx + (s.x + 0.5) * cs - tw / 2, y = by + s.y * cs - th - 4;
  x = Math.max(4, Math.min(W - tw - 4, x)); if (y < 2) y = by + (s.y + 1) * cs + 4;
  ctx.fillStyle = '#fff8ec'; rr(ctx, x, y, tw, th, 8); ctx.fill(); ctx.strokeStyle = '#1b1f3b'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#1b1f3b'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s.text, x + tw / 2, y + th / 2 + 1);
  ctx.globalAlpha = 1;
}
function drawShotTitle() {
  const left = Math.max(16, W * 0.05), maxw = bx - left - 16;
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let fs = Math.min(72, maxw / 4.6);
  ctx.font = '900 ' + Math.round(fs) + 'px system-ui';
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#0d1030';
  const y1 = H * 0.42;
  ctx.strokeText('knight', left, y1); ctx.fillStyle = '#ffd23f'; ctx.fillText('knight', left, y1);
  ctx.strokeText('shift', left, y1 + fs * 0.95); ctx.fillStyle = '#5ce1ff'; ctx.fillText('shift', left, y1 + fs * 0.95);
  ctx.font = '700 ' + Math.round(fs * 0.24) + 'px system-ui'; ctx.fillStyle = '#fff8ec';
  ctx.fillText('one horse. all of management.', left, y1 + fs * 1.45);
  ctx.font = '700 ' + Math.round(fs * 0.18) + 'px system-ui'; ctx.fillStyle = 'rgba(255,248,236,.6)';
  ctx.fillText('computer cooked games', left, H - 16);
}

/* ---------- input ---------- */
function cellFromEvent(ev) {
  const r = cv.getBoundingClientRect();
  const x = Math.floor((ev.clientX - r.left - bx) / cs), y = Math.floor((ev.clientY - r.top - by) / cs);
  return [x, y];
}
let armed = null, hoverCell = null;
cv.addEventListener('pointermove', function (ev) { if (ev.pointerType === 'mouse') { hoverCell = cellFromEvent(ev); } });
cv.addEventListener('pointerleave', function () { hoverCell = null; });
cv.addEventListener('pointerdown', function (ev) {
  if (!G) return;
  if (paused) { setPaused(false); return; }
  kbMode = false;
  if (G.phase !== 'play' || performance.now() < busyUntil) return;
  const c = cellFromEvent(ev);
  const moves = currentMoves();
  const m = moves.find(function (q) { return q.x === c[0] && q.y === c[1]; });
  if (m) {
    // first tap on a red move shows who would hit you; second tap commits
    if (!m.safe && ev.pointerType !== 'mouse' && !(armed && armed.x === m.x && armed.y === m.y && armed.turn === G.turn)) {
      armed = { x: m.x, y: m.y, turn: G.turn };
      toast('the ' + m.atk.map(function (a) { return a.boss ? 'boss' : T[a.t].name; }).join(' and the ') + ' would hit you there. tap again to do it anyway.', 3000);
      return;
    }
    armed = null; doMove(m); return;
  }
  if (G.mode && !(c[0] === G.kx && c[1] === G.ky)) { /* keep mode */ }
  const e = G.enemies.find(function (q) { return q.x === c[0] && q.y === c[1]; });
  if (e) toast(e.boss ? e.boss.name + ' (' + e.hp + ' hp). ' + e.boss.plan : T[e.t].info, 3500);
  else if (c[0] === G.kx && c[1] === G.ky) toast(G.hero === 'bishop' ? 'you: diagonal, up to 3. a bishop in a hard hat.' : 'you: the L. only the L. always the L.', 2000);
});
window.addEventListener('keydown', function (ev) {
  if (!G) return;
  const k = ev.key;
  if ($('ov').className === 'menu') { if (k === 'Escape' || k === 'm' || k === 'M') closeMenu(); return; }
  if ((k === 'm' || k === 'M' || k === 'Escape') && G.phase === 'play') { showMenu(); return; }
  if (k === 'p' || k === 'P') { if (G.phase === 'play') setPaused(!paused); return; }
  if (paused) { if (k === 'Enter' || k === ' ') setPaused(false); return; }
  if (G.phase === 'perk') { if (k >= '1' && k <= '3') { choosePerk(+k - 1); ev.preventDefault(); } return; }
  if (G.phase === 'shop') { if (k >= '1' && k <= '4') { shopBuy(k === '4' ? 'leave' : +k - 1); ev.preventDefault(); } return; }
  if (G.phase === 'over') { if ((k === 'Enter' || k === 'r') && document.activeElement === document.body) newRun({}); return; }
  if (G.phase !== 'play') return;
  if (k === 'd' || k === 'D') { toggleDanger(); return; }
  if (k === 's' || k === 'S') { toggleSound(); return; }
  if (k === 'b' || k === 'B') { toggleMode('other'); return; }
  if (k === 'c' || k === 'C') { toggleMode('corner'); return; }
  const moves = currentMoves(); if (!moves.length) return;
  if (k.indexOf('Arrow') === 0) {
    ev.preventDefault();
    if (!kbMode) { kbMode = true; selIdx = 0; return; }
    selIdx = (selIdx + (k === 'ArrowLeft' || k === 'ArrowUp' ? -1 : 1) + moves.length) % moves.length; return;
  }
  if (k >= '1' && k <= '9') { const m = moves[+k - 1]; kbMode = true; if (m && performance.now() >= busyUntil) doMove(m); return; }
  if (k === 'Enter' || k === ' ') { ev.preventDefault(); if (!kbMode) { kbMode = true; return; } if (performance.now() >= busyUntil) doMove(moves[selIdx % moves.length]); }
});
function toggleDanger() { dangerOn = !dangerOn; updateHud(); }
function setPaused(v) { if (!v && $('ov').className === 'menu') return; paused = !!v && G && G.phase === 'play'; }
$('b-danger').onclick = toggleDanger;
$('b-snd').onclick = toggleSound;
function toggleSound() { meta.muted = !meta.muted; writeSave(); updateHud(); if (!soundOff()) sfx('perk'); }
$('b-pause').onclick = function () { setPaused(!paused); };
$('b-menu').onclick = function () { showMenu(); };
$('b-ab1').onclick = function () { toggleMode('other'); };
$('b-ab2').onclick = function () { toggleMode('corner'); };
window.addEventListener('message', function (ev) {
  const d = ev.data; if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') { muted = !!d.muted; updateHud(); }
  else if (d.type === 'cc-restart') newRun({});
  else if (d.type === 'cc-pause') setPaused(d.paused === undefined ? true : !!d.paused);
});
document.addEventListener('visibilitychange', function () { if (document.hidden && G && G.phase === 'play') setPaused(true); });
window.addEventListener('resize', resize);
if (window.ResizeObserver) new ResizeObserver(resize).observe($('app'));

/* ---------- cover shot ---------- */
let shotFrozen = false;
function setupShot() {
  newRun({ seed: 77 });
  G.floor = 6; G.N = 6; G.enemies = [];
  const add = function (t, x, y, ex) { const e = mkEnemy(t, x, y, ex); G.enemies.push(e); return e; };
  add('q', 4, 0, { boss: BOSSES[0], hp: 2, maxHp: 3 });
  add('r', 0, 2); add('b', 5, 4); add('p', 1, 1); add('i', 2, 0); add('k', 0, 5);
  G.stairs = { x: 5, y: 0 }; G.total = 8; G.taken = 2;
  G.score = 1240; G.combo = 4;
  hideOverlay(); banner = null; clearToast(); speech.length = 0;
  // the knight is mid-jump onto a pawn it just took
  G.kx = 3; G.ky = 2; G.hopFrom = { x: 2, y: 4 }; G.hop = 0; G.hopDist = Math.hypot(1, 2);
  dyingFx.push({ t: 'p', x: 3, y: 2, vx: 7, vy: -9, r: 0, vr: 0.3, life: 1 });
  burst(3, 2, '#ffd23f', 26, 1.2); burst(3, 2, '#ff7b6b', 12, 1.0);
  rings.push({ x: 3.5, y: 2.5, life: 1, col: '#5ce1ff' });
  floatText(3, 2.9, '+30', '#ffd23f');
  bigText = { text: 'combo x2.5', life: 0.95 };
  speech.push({ x: 4, y: 0, text: 'audit THIS', life: 99, follow: G.enemies[0] });
  dangerOn = false;
  ['hud', 'bar', 'sub', 'msg', 'info', 'brand'].forEach(function (id) { $(id).classList.add('hidden'); });
  resize();
  for (let i = 0; i < 4; i++) update(1 / 60);
  G.hop = 0.24; shake = 0; shotFrozen = true;
}

/* ---------- test hooks ---------- */
if (TEST) {
  window.__ks = {
    state: function () {
      if (!G) return null;
      return { phase: G.phase, floor: G.floor, N: G.N, kx: G.kx, ky: G.ky, hearts: G.hearts, maxHearts: G.maxHearts, score: G.score, coins: G.coins,
        captures: G.captures, combo: G.combo, intro: G.intro, log: G.log.slice(), paused: paused, turn: G.turn, floorTurns: G.floorTurns, taken: G.taken, total: G.total, stairs: G.stairs, stairsOpen: stairsOpen(), seed: G.seed, perks: Object.assign({}, G.perks),
        enemies: G.enemies.map(function (e) { return { t: e.t, x: e.x, y: e.y, hp: e.hp, boss: !!e.boss }; }), threatenedNow: attackersOf(G.kx, G.ky, null).length };
    },
    legal: function () { return legalMoves().map(function (m) { return { x: m.x, y: m.y, safe: m.safe, cap: m.cap ? m.cap.t : null, capBoss: !!(m.cap && m.cap.boss), stairs: !!m.stairs }; }); },
    move: function (i) { const ms = legalMoves(); return ms[i] ? doMove(ms[i]) : false; },
    perk: function (i) { choosePerk(i || 0); },
    shop: function (i) { return shopBuy(i == null ? 'leave' : i); },
    menu: function () { showMenu(); },
    geom: function () { const r = cv.getBoundingClientRect(); return { left: r.left + bx, top: r.top + by, size: cs * G.N, cs: cs, N: G.N }; },
    log: function () { return G ? G.log.slice() : []; },
    clear: function () { if (!G || G.phase !== 'play') return; const n = G.enemies.length; G.enemies = []; G.taken += n; floorDone('sweep'); },
    floor: function (n) { if (!G) newRun({}); hideOverlay(); G.phase = 'play'; startFloor(Math.max(1, n | 0)); },
    die: function () { if (!G || G.phase === 'over') return; G.hearts = 0; gameOver(); },
    seed: function (n) { runSeedOverride = n >>> 0; newRun({ seed: n >>> 0 }); },
    restart: function (o) { newRun(o || {}); },
    meta: function () { return JSON.parse(JSON.stringify(meta)); },
    hero: function (h) { meta.hero = h; },
    unlockAll: function () { meta.bestFloor = Math.max(meta.bestFloor, 10); meta.totalCaptures = Math.max(meta.totalCaptures, 40); },
    shareText: function () { return G ? shareText() : ''; }
  };
}

resize();
if (SHOT) setupShot(); else newRun({});
requestAnimationFrame(frame);
})();
