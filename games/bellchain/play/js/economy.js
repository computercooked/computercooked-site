// bellchain v2 economy. pure logic, no DOM: shared by the game (main.js) and the pacing sim (sim.mjs).

const SUF = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'UDc', 'DDc', 'TDc', 'QaDc', 'QiDc', 'SxDc', 'SpDc', 'OcDc', 'NoDc', 'Vg'];

export const CFG = {
  costGrowth: 1.15,
  tapBase: 1,
  echoBase: 0.35, echoStep: 0.08, echoMax: 0.9,
  crescBase: 0.25, crescStep: 0.15,
  chainMax: 8,            // a full octave run is a perfect peal
  perfectMult: 3,
  prestigeBase: 3e6,      // overtones = floor(cbrt(lifetime / prestigeBase))
  overtoneBonus: 0.1,     // +10% production per overtone level
  achBonus: 0.01,         // +1% production per achievement
  songBonus: 0.04,        // +4% per song in the songbook
  offlineEff: 0.5, offlineCapH: 8,
  goldenMin: 50, goldenMax: 130, goldenLife: 13,
};

// twelve bells. cookie clicker's building curve, re-voiced.
export const BUILDINGS = [
  { id: 'handbell', name: 'handbell', cost: 15, rate: 0.1, role: 'melody', desc: 'plays the tune so you do not have to.' },
  { id: 'cowbell', name: 'cowbell', cost: 100, rate: 1, role: 'beat', desc: 'more cowbell. the people demanded it.' },
  { id: 'glock', name: 'glockenspiel', cost: 1100, rate: 8, role: 'sparkle', desc: 'tiny metal bars. big feelings.' },
  { id: 'church', name: 'church bell', cost: 12000, rate: 47, role: 'bass', desc: 'one note. every bar. very serious.' },
  { id: 'tubular', name: 'tubular bell', plural: 'tubular bells', cost: 2e5, rate: 260, role: 'chords', desc: 'chords now. you are basically a band.' },
  { id: 'steel', name: 'steel drum', cost: 2.1e6, rate: 1400, role: 'arp', desc: 'arpeggios with a vacation attitude.' },
  { id: 'gamelan', name: 'gamelan', cost: 3e7, rate: 7800, role: 'counter', desc: 'a counter-melody that shimmers on purpose.' },
  { id: 'crystal', name: 'crystal bell', cost: 5e8, rate: 44000, role: 'shimmer', desc: 'glass that sings. do not drop it.' },
  { id: 'chip', name: '8-bit bell', cost: 7.7e9, rate: 260000, role: 'chip', desc: 'bleeps from a cartridge you blew into.' },
  { id: 'choir', name: 'choir', cost: 1.1e11, rate: 1.6e6, role: 'pad', desc: 'forty people going "aaah" in your browser.' },
  { id: 'carillon', name: 'carillon tower', cost: 1.5e12, rate: 1e7, role: 'carillon', desc: 'an entire tower. zoning was a nightmare.' },
  { id: 'cosmic', name: 'cosmic bell', cost: 2.1e13, rate: 6.5e7, role: 'cosmic', desc: 'rings once and the universe hears it in 4 billion years.' },
];
for (const b of BUILDINGS) b.plural = b.plural || b.name + 's';
export const BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

export const SONGS = [
  { id: 'twinkle', name: 'twinkle twinkle', cost: 0 },
  { id: 'mary', name: 'mary had a little lamb', cost: 150 },
  { id: 'frere', name: 'frère jacques', cost: 2500 },
  { id: 'ode', name: 'ode to joy', cost: 2.5e4 },
  { id: 'jingle', name: 'jingle bells', cost: 2.5e5 },
  { id: 'westminster', name: 'westminster chimes', cost: 4e6 },
  { id: 'canon', name: 'canon in d (ish)', cost: 8e7 },
  { id: 'improv', name: 'improv.exe', cost: 2e9 },
];

// ---------- upgrades ----------
const TIER_WORDS = ['polished', 'tuned', 'resonant', 'harmonic', 'legendary', 'transcendent', 'illegal', 'bright'];
const TIER_AT = [1, 5, 25, 50, 100, 150, 200, 10];
const TIER_COST = [10, 50, 500, 5e4, 5e6, 5e8, 5e10, 120];

export const UPGRADES = [];
for (const b of BUILDINGS) {
  TIER_AT.forEach((at, i) => {
    UPGRADES.push({
      id: `${b.id}_${i}`, name: `${TIER_WORDS[i]} ${b.plural}`, cost: b.cost * TIER_COST[i],
      desc: b.id === 'handbell' && i < 3 ? `${b.plural} and your taps x2` : `${b.plural} x2`,
      req: (s) => (s.owned[b.id] || 0) >= at, kind: 'bld', bld: b.id, tapX2: b.id === 'handbell' && i < 3,
    });
  });
}
[[5e4, 1e3], [5e6, 1e5], [5e8, 1e7], [5e10, 1e9], [5e12, 1e11]].forEach(([cost, tapNeed], i) => {
  UPGRADES.push({ id: `baton_${i}`, name: ['plastic baton', 'wooden baton', 'carbon baton', 'gold baton', 'laser baton'][i], cost,
    desc: 'taps also earn +1% of your per-second', req: (s) => s.tapEarned >= tapNeed, kind: 'baton' });
});
[200, 3000, 6e4, 2e6, 8e7].forEach((cost, i) => {
  UPGRADES.push({ id: `echo_${i}`, name: ['better acoustics', 'stone walls', 'cathedral ceiling', 'canyon', 'the void'][i], cost,
    desc: `echo chance +${Math.round(CFG.echoStep * 100)}%`, req: (s) => s.earnedRun >= cost * 0.3, kind: 'echo' });
});
[700, 2e4, 6e5, 3e7].forEach((cost, i) => {
  UPGRADES.push({ id: `cresc_${i}`, name: ['crescendo', 'fortissimo', 'sforzando', 'too loud'][i], cost,
    desc: `each echo hop +${Math.round(CFG.crescStep * 100)}%`, req: (s) => s.earnedRun >= cost * 0.3, kind: 'cresc' });
});
// the first mallet is the first buy (K-0020, K-0029, K-0034): 4, so the 4th tap affords it, doubling a tap in the first seconds
[4, 250, 1200, 6000, 3e4].forEach((cost, i) => {
  UPGRADES.push({ id: `mallet_${i}`, name: ['foam mallet', 'wooden mallet', 'rubber mallet', 'brass mallet', 'sledgehammer'][i], cost,
    desc: 'taps +1 base resonance', req: (s) => s.earnedRun >= cost * 0.3, kind: 'mallet' });
});
// K-0036: a second early buy, so there's something every few taps before the handbell (its own id keeps old saves right)
UPGRADES.push({ id: 'mallet_felt', name: 'felt mallet', cost: 9, desc: 'taps +1 base resonance', req: (s) => !!s.ups.mallet_0, kind: 'mallet' });
[150, 900, 5000, 2.5e4, 1.2e5].forEach((cost, i) => {
  UPGRADES.push({ id: `practice_${i}`, name: ['band practice', 'metronome', 'sheet music', 'rehearsal room', 'a real manager'][i], cost,
    desc: 'everything +5%', req: (s) => s.earnedRun >= cost * 0.3, kind: 'global', mult: 1.05 });
});
[[1e6, 1e5], [1e8, 1e7], [1e10, 1e9], [1e12, 1e11], [1e14, 1e13], [1e16, 1e15]].forEach(([cost, need], i) => {
  UPGRADES.push({ id: `hall_${i}`, name: ['carpet removal', 'vaulted roof', 'concert hall', 'stadium', 'mountain range', 'a whole moon'][i], cost,
    desc: 'everything +15%', req: (s) => s.earnedRun >= need, kind: 'global', mult: 1.15 });
});
UPGRADES.push({ id: 'gold_0', name: 'lucky clapper', cost: 7.7e5, desc: 'golden bells show up twice as often', req: (s) => s.goldenClicks >= 3, kind: 'goldfreq' });
UPGRADES.push({ id: 'gold_1', name: 'gilded rope', cost: 7.7e7, desc: 'golden effects last twice as long', req: (s) => s.goldenClicks >= 10, kind: 'goldlen' });
export const UP_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// ---------- prestige tree (bought with overtone chips) ----------
export const NODES = [
  { id: 'pitch', name: 'perfect pitch', cost: 1, desc: 'taps x3' },
  { id: 'night', name: 'night shift', cost: 10, desc: 'offline earnings 50% → 100%, cap 24h' },
  { id: 'start', name: 'head start', cost: 2, desc: 'every run starts with 10 handbells and 5 cowbells' },
  { id: 'ear', name: 'golden ear', cost: 8, desc: 'golden bells twice as often (stacks)' },
  { id: 'twin', name: 'twin echo', cost: 12, desc: 'echo chance +15%' },
  { id: 'bargain', name: 'bargain bronze', cost: 20, desc: 'all bells 10% cheaper' },
  { id: 'luck', name: 'lucky strike', cost: 30, desc: 'golden effects last twice as long (stacks)' },
  { id: 'conductor', name: 'conductor', cost: 50, desc: 'taps earn +3% of your per-second' },
  { id: 'sustain', name: 'sustain pedal', cost: 80, desc: 'all production x2' },
  { id: 'setlist', name: 'setlist', cost: 120, desc: 'keep your songbook through recasts' },
  { id: 'encore', name: 'standing ovation', cost: 200, desc: 'all production x3' },
  { id: 'choir', name: 'eternal choir', cost: 400, desc: 'each overtone level +15% instead of +10%' },
];

// ---------- achievements: each one is +1% production ----------
export const ACH = [];
const A = (id, name, desc, test) => ACH.push({ id, name, desc, test });
[[100, 'first ding'], [400, 'humming along'], [1e3, 'tinnitus'], [4e3, 'earworm'], [1e4, 'noise complaint'], [4e4, 'hoa letter'], [1e5, 'the neighbors know'], [4e5, 'police were called'], [1e6, 'millionaire mallet'], [1e7, 'local legend'],
  [1e8, 'bell to the chief'], [1e9, 'billion bongs'], [1e11, 'seismic'], [1e13, 'audible from orbit'], [1e15, 'the sun complains'], [1e18, 'heat death soundtrack']]
  .forEach(([n, name]) => A('earn_' + n, name, `ring up ${fmt(n)} resonance, ever`, (s) => s.earnedAll >= n));
[[1, 'hobby'], [5, 'busking'], [10, 'side hustle'], [50, 'wedding gigs'], [100, 'full time'], [500, 'touring'], [1e3, 'franchise'], [5e3, 'arena tour'], [1e4, 'conglomerate'], [1e5, 'monopoly'], [1e6, 'too big to toll'], [1e8, 'post-scarcity']]
  .forEach(([n, name]) => A('rps_' + n, name, `make ${fmt(n)} resonance per second`, (s, rps) => rps >= n));
[[100, 'warm hands'], [1000, 'carpal tunnel'], [5000, 'the clicker']].forEach(([n, name]) => A('tap_' + n, name, `tap ${fmt(n)} times`, (s) => s.taps >= n));
for (const b of BUILDINGS) {
  A(`own1_${b.id}`, `first ${b.name}`, `own a ${b.name}`, (s) => (s.owned[b.id] || 0) >= 1);
  A(`own5_${b.id}`, `${b.name} duet`, `own 5 ${b.plural}`, (s) => (s.owned[b.id] || 0) >= 5);
  A(`own10_${b.id}`, `${b.name} ensemble`, `own 10 ${b.plural}`, (s) => (s.owned[b.id] || 0) >= 10);
  A(`own25_${b.id}`, `${b.name} choir practice`, `own 25 ${b.plural}`, (s) => (s.owned[b.id] || 0) >= 25);
  A(`own50_${b.id}`, `${b.name} section`, `own 50 ${b.plural}`, (s) => (s.owned[b.id] || 0) >= 50);
  A(`own100_${b.id}`, `${b.name} orchestra`, `own 100 ${b.plural}`, (s) => (s.owned[b.id] || 0) >= 100);
}
A('chain5', 'echo chamber', 'land a chain of 5', (s) => s.bestChain >= 5);
A('chain8', 'perfect peal', 'land a full 8-note chain', (s) => s.bestChain >= 8);
A('peal10', 'peal regular', '10 perfect peals', (s) => s.perfects >= 10);
A('peal100', 'peal addict', '100 perfect peals', (s) => s.perfects >= 100);
[[1, 'shiny'], [7, 'lucky number'], [27, 'golden hour'], [77, 'midas mallet']].forEach(([n, name]) => A('gold_' + n, name, `catch ${n} golden bell${n > 1 ? 's' : ''}`, (s) => s.goldenClicks >= n));
A('songs3', 'cover band', 'learn 3 songs', (s) => s.songs.length >= 3);
A('songsall', 'jukebox', 'learn every song', (s) => s.songs.length >= SONGS.length);
[[1, 'recast'], [3, 'minor inconvenience'], [5, 'modal jazz'], [8, 'full circle']].forEach(([n, name]) => A('asc_' + n, name, `recast ${n} time${n > 1 ? 's' : ''}`, (s) => s.ascensions >= n));
[[1e3, 'hands on'], [1e6, 'handmade millions'], [1e9, 'artisanal billions']].forEach(([n, name]) => A('tapE_' + n, name, `earn ${fmt(n)} from taps`, (s) => s.tapEarned >= n));
A('veteran', 'old bones', 'played bellchain v1', (s) => !!s.veteran);
export const ACH_BY_ID = Object.fromEntries(ACH.map((a) => [a.id, a]));

// ---------- state ----------
export function newState() {
  return {
    v: 2, res: 0, earnedRun: 0, earnedAll: 0, owned: {}, ups: {}, ach: {}, songs: ['twinkle'], song: 'twinkle',
    taps: 0, tapEarned: 0, bestChain: 0, perfects: 0, goldenClicks: 0, playSec: 0, runSec: 0,
    ascensions: 0, otLevel: 0, otChips: 0, nodes: {}, lastSeen: Date.now(), buyAmt: 1,
    volume: 0.7, muted: false, veteran: false, started: Date.now(),
  };
}

// ---------- math ----------
const has = (s, id) => !!s.ups[id];
const node = (s, id) => !!s.nodes[id];
const count = (s, kind) => UPGRADES.reduce((n, u) => n + (u.kind === kind && s.ups[u.id] ? 1 : 0), 0);

export const otPer = (s) => (node(s, 'choir') ? 0.15 : CFG.overtoneBonus);
export function bldMult(s, id) {
  let m = 1;
  for (let i = 0; i < TIER_AT.length; i++) if (has(s, `${id}_${i}`)) m *= 2;
  return m;
}
export function globalMult(s) {
  let m = 1 + CFG.achBonus * Object.keys(s.ach).length;
  m *= 1 + otPer(s) * s.otLevel;
  m *= 1 + CFG.songBonus * (s.songs.length - 1);
  for (const u of UPGRADES) if (u.kind === 'global' && s.ups[u.id]) m *= u.mult;
  if (node(s, 'sustain')) m *= 2;
  if (node(s, 'encore')) m *= 3;
  return m;
}
export function bldRate(s, id) { return BY_ID[id].rate * bldMult(s, id) * globalMult(s); }
export function baseRps(s) {
  let r = 0;
  for (const b of BUILDINGS) r += (s.owned[b.id] || 0) * b.rate * bldMult(s, b.id);
  return r * globalMult(s);
}
// buffs: [{kind, mult, until}] in seconds of s.playSec
export function rps(s, buffs) {
  let r = baseRps(s);
  r *= Math.max(1, ...(buffs || []).filter((b) => b.kind === 'frenzy').map((b) => b.mult));
  return r;
}
export function tapValue(s, buffs) {
  let v = CFG.tapBase + count(s, 'mallet');
  for (const u of UPGRADES) if (u.tapX2 && s.ups[u.id]) v *= 2;
  if (node(s, 'pitch')) v *= 3;
  v *= 1 + CFG.achBonus * Object.keys(s.ach).length;
  const frac = 0.01 * count(s, 'baton') + (node(s, 'conductor') ? 0.03 : 0);
  v += baseRps(s) * frac;
  v *= Math.max(1, ...(buffs || []).filter((b) => b.kind === 'clickfrenzy').map((b) => b.mult));
  return v;
}
export const echoChance = (s, buffs) => ((buffs || []).some((b) => b.kind === 'encore') ? 0.97 : Math.min(CFG.echoMax, CFG.echoBase + CFG.echoStep * count(s, 'echo') + (node(s, 'twin') ? 0.15 : 0)));
export const crescendo = (s) => CFG.crescBase + CFG.crescStep * count(s, 'cresc');

// roll a chain for one tap: returns [{hop, value}], total and whether it was perfect
export function rollChain(s, buffs, rand) {
  const R = rand || Math.random;
  const tap = tapValue(s, buffs), p = echoChance(s, buffs), c = crescendo(s);
  const rings = [{ hop: 0, value: tap }];
  while (rings.length < CFG.chainMax && R() < p) rings.push({ hop: rings.length, value: tap * (1 + c * rings.length) });
  const perfect = rings.length >= CFG.chainMax;
  if (perfect) for (const r of rings) r.value *= CFG.perfectMult;
  return { rings, total: rings.reduce((a, r) => a + r.value, 0), perfect };
}

export function costOf(s, id, n) {
  const b = BY_ID[id], k = s.owned[id] || 0, g = CFG.costGrowth;
  const disc = node(s, 'bargain') ? 0.9 : 1;
  return b.cost * disc * Math.pow(g, k) * (Math.pow(g, n) - 1) / (g - 1);
}
export function buyBld(s, id, n) {
  const c = costOf(s, id, n);
  if (s.res < c) return false;
  s.res -= c; s.owned[id] = (s.owned[id] || 0) + n;
  return true;
}
export function upgradeVisible(s, u) { return !s.ups[u.id] && u.req(s); }
export function availableUpgrades(s) { return UPGRADES.filter((u) => upgradeVisible(s, u)).sort((a, b) => a.cost - b.cost); }
export function buyUpgrade(s, id) {
  const u = UP_BY_ID[id];
  if (!u || s.ups[id] || !u.req(s) || s.res < u.cost) return false;
  s.res -= u.cost; s.ups[id] = true;
  return true;
}
export function buySong(s, id) {
  const so = SONGS.find((x) => x.id === id);
  if (!so || s.songs.includes(id) || s.res < so.cost) return false;
  s.res -= so.cost; s.songs.push(id); s.song = id;
  return true;
}
export function earn(s, v) { s.res += v; s.earnedRun += v; s.earnedAll += v; }

// achievements: returns the newly earned list
export function checkAch(s, buffs) {
  const r = baseRps(s), got = [];
  for (const a of ACH) if (!s.ach[a.id] && a.test(s, r)) { s.ach[a.id] = true; got.push(a); }
  return got;
}

// ---------- golden bells ----------
export function goldenDelay(s, rand) {
  const R = rand || Math.random;
  let d = CFG.goldenMin + R() * (CFG.goldenMax - CFG.goldenMin);
  if (has(s, 'gold_0')) d /= 2;
  if (node(s, 'ear')) d /= 2;
  return d;
}
export function goldenEffect(s, rand) {
  const R = rand || Math.random;
  const len = (has(s, 'gold_1') ? 2 : 1) * (node(s, 'luck') ? 2 : 1);
  const r = R();
  if (r < 0.45) return { kind: 'frenzy', mult: 7, dur: 77 * len, label: 'frenzy · x7 for ' + Math.round(77 * len) + 's' };
  if (r < 0.88) {
    const gain = Math.min(s.res * 0.15, baseRps(s) * 900) + 13;
    return { kind: 'lucky', gain, label: 'lucky · +' + fmt(gain) };
  }
  if (r < 0.95 && s.earnedRun > 1e4) return { kind: 'clickfrenzy', mult: 77, dur: 13 * len, label: 'tap frenzy · taps x77' };
  return { kind: 'encore', mult: 1, dur: 30 * len, label: 'encore · every tap chains' };
}

// ---------- offline ----------
export function offlineGain(s, sec) {
  const cap = (node(s, 'night') ? 24 : CFG.offlineCapH) * 3600;
  const t = Math.min(sec, cap);
  return { sec: t, capped: sec > cap, gain: baseRps(s) * t * (node(s, 'night') ? 1 : CFG.offlineEff) };
}

// ---------- prestige ----------
export const otPotential = (s) => Math.floor(Math.cbrt(s.earnedAll / CFG.prestigeBase));
export const otGain = (s) => Math.max(0, otPotential(s) - s.otLevel);
// earnedAll needed for the next overtone
export const nextOtAt = (s) => Math.pow(otPotential(s) + 1, 3) * CFG.prestigeBase;
export function ascend(s) {
  const g = otGain(s);
  if (g < 1) return 0;
  const keep = { earnedAll: s.earnedAll, ach: s.ach, taps: s.taps, tapEarned: s.tapEarned, bestChain: s.bestChain, perfects: s.perfects,
    goldenClicks: s.goldenClicks, playSec: s.playSec, nodes: s.nodes, volume: s.volume, muted: s.muted, veteran: s.veteran, started: s.started,
    otLevel: s.otLevel + g, otChips: s.otChips + g, ascensions: s.ascensions + 1, songs: node(s, 'setlist') ? s.songs : ['twinkle'], buyAmt: s.buyAmt };
  const n = Object.assign(newState(), keep);
  n.song = n.songs.includes(s.song) ? s.song : 'twinkle';
  if (node(n, 'start')) { n.owned.handbell = 10; n.owned.cowbell = 5; }
  Object.keys(n).forEach((k) => { s[k] = n[k]; });
  Object.keys(s).forEach((k) => { if (!(k in n)) delete s[k]; });
  return g;
}
export function buyNode(s, id) {
  const nd = NODES.find((x) => x.id === id);
  if (!nd || s.nodes[id] || s.otChips < nd.cost) return false;
  s.otChips -= nd.cost; s.nodes[id] = true;
  return true;
}

// ---------- numbers ----------
export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n));
  const e = Math.floor(Math.log10(n) / 3);
  if (e >= SUF.length) return n.toExponential(2).replace('+', '');
  const v = n / Math.pow(1000, e);
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + SUF[e];
}
export function fmtTime(sec) {
  sec = Math.floor(sec);
  if (sec < 60) return sec + 's';
  if (sec < 3600) return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's';
  if (sec < 86400) return Math.floor(sec / 3600) + 'h ' + Math.floor((sec % 3600) / 60) + 'm';
  return Math.floor(sec / 86400) + 'd ' + Math.floor((sec % 86400) / 3600) + 'h';
}

// ---------- save ----------
export function serialize(s) { return JSON.stringify(s); }
export function deserialize(raw) {
  try {
    const o = JSON.parse(raw);
    if (!o || o.v !== 2) return null;
    const s = Object.assign(newState(), o);
    if (!Array.isArray(s.songs) || !s.songs.length) s.songs = ['twinkle'];
    for (const k of ['res', 'earnedRun', 'earnedAll', 'otLevel', 'otChips']) if (!isFinite(s[k]) || s[k] < 0) s[k] = 0;
    return s;
  } catch (e) { return null; }
}
export function exportCode(s) {
  const json = serialize(s);
  const b64 = typeof btoa === 'function' ? btoa(unescape(encodeURIComponent(json))) : Buffer.from(json).toString('base64');
  return 'BELL2-' + b64;
}
export function importCode(code) {
  try {
    const b64 = String(code).trim().replace(/^BELL2-/, '');
    const json = typeof atob === 'function' ? decodeURIComponent(escape(atob(b64))) : Buffer.from(b64, 'base64').toString();
    return deserialize(json);
  } catch (e) { return null; }
}

// monotonic site score: 100 points per order of magnitude of lifetime resonance
export const siteScore = (s) => Math.floor(Math.log10(s.earnedAll + 1) * 100);
