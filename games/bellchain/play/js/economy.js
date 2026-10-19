// Bellchain economy. Pure logic, no DOM. Shared by the game (main.js) and the pacing sim (sim.mjs),
// so the sim always measures the real numbers.

export const SAVE_VERSION = 1;

export const CFG = {
  startBells: 3,
  maxBells: 24,
  baseValue: 1,
  handMult: 2,                // your own taps strike harder than a hired ringer...
  handPerRinger: 0.15,         // ...plus this much per ringer hired, so tapping stays worth it late in a run
  echoBase: 0.45,
  echoStep: 0.03,
  echoMaxLevel: 15,           // p = 0.90 at max
  bronzeMult: 1.25,
  crescBase: 0.15,
  crescStep: 0.05,
  perfectMult: 3,
  ringerInterval: 3.0,        // seconds between strikes for one ringer
  tempoFactor: 0.92,          // each Tempo level multiplies the interval
  tempoMaxLevel: 25,
  automationUnlockAt: 1000,   // run-earned Resonance that reveals Ringers
  bellwrightCost: 5000,
  prestigeReq: 1e8,           // run-earned Resonance needed for the FIRST Recast (tuned by sim.mjs)
  prestigeGrowth: 8,          // each later Recast needs this many times more
  overtoneValue: 0.25,        // +25% global per Overtone
  offlineEfficiency: 0.5,
  offlineCapSec: 8 * 3600,
  recastStartBells: 5,
  // [base cost, growth per level]. Rule of thumb from sim.mjs: keep each upgrade's
  // ln(benefit)/ln(cost growth) small, or income runs away and the run ends in 5 minutes.
  cost: {
    bell: [10, 1.9], echo: [25, 2.0], bronze: [12, 2.4], cresc: [40, 2.0],
    ringer: [40, 1.35], tempo: [150, 1.65],
  },
};

const costOf = (id, lvl) => CFG.cost[id][0] * Math.pow(CFG.cost[id][1], lvl);

export const TUNINGS = {
  none:  { name: 'plain', desc: 'echoes travel clockwise once around.' },
  round: { name: 'round', desc: 'echoes loop past the last bell, up to 3 laps.', unlockRecasts: 1 },
  twin:  { name: 'twin peal', desc: 'every strike sends echoes both ways at once.', unlockRecasts: 1 },
  choir: { name: 'choir', desc: 'every 4th ring in a chain is a golden note worth x4.', unlockRecasts: 2 },
};

export function newState() {
  return {
    v: SAVE_VERSION,
    res: 0,            // Resonance (spendable)
    runEarned: 0,      // earned this run (drives unlocks + prestige)
    totalEarned: 0,    // lifetime
    bells: CFG.startBells,
    lv: { echo: 0, bronze: 0, cresc: 0, ringer: 0, tempo: 0 },
    bellwright: false,
    autoUnlocked: false,
    overtones: 0,
    recasts: 0,
    tuning: 'none',
    bestChain: 0,
    perfects: 0,
    strikes: 0,
    playSec: 0,
    runSec: 0,
    lastSeen: 0,
    muted: false,
    buys: 0,
  };
}

// ---------- derived values ----------
export const echoChance = (s) => Math.min(0.95, CFG.echoBase + CFG.echoStep * s.lv.echo);
export const crescendo = (s) => CFG.crescBase + CFG.crescStep * s.lv.cresc;
export const globalMult = (s) => 1 + CFG.overtoneValue * s.overtones;
export const ringValue = (s) => CFG.baseValue * Math.pow(CFG.bronzeMult, s.lv.bronze) * globalMult(s);
export const ringerInterval = (s) => CFG.ringerInterval * Math.pow(CFG.tempoFactor, s.lv.tempo);
export const strikesPerSec = (s) => s.lv.ringer / ringerInterval(s);
export const handPower = (s) => CFG.handMult + CFG.handPerRinger * s.lv.ringer;

// value multiplier for the ring at hop k (0 = the struck bell)
function hopWeight(s, k) {
  let w = 1 + crescendo(s) * k;
  if (s.tuning === 'choir' && k % 4 === 3) w *= 4;
  return w;
}

function maxHops(s) {
  if (s.tuning === 'round') return 3 * s.bells - 1;
  return s.bells - 1; // Twin Peal: each arm can travel all the way round
}

// Hop count at which a chain counts as a Perfect Peal (every bell rang). Twin: both arms meet halfway.
function perfectHop(s) {
  if (s.tuning === 'twin') return Math.floor(s.bells / 2);
  return s.bells - 1;
}

// Expected Resonance from one strike (closed form, used for offline, sim decisions and UI rate).
export function expectedStrike(s, hand = false) {
  const p = echoChance(s), H = maxHops(s), P = perfectHop(s), v = ringValue(s) * (hand ? handPower(s) : 1);
  // single directional chain
  const chain = () => {
    let e = 0, reach = 1, sumToP = 0;
    for (let k = 0; k <= H; k++) {
      const w = hopWeight(s, k);
      e += reach * w;
      if (k <= P) sumToP += w;
      if (k < H) reach *= p;
    }
    // Perfect bonus: chain reached hop P with prob p^P. Bonus pays (perfectMult-1) x the rings up to P.
    const pP = Math.pow(p, P);
    e += pP * (CFG.perfectMult - 1) * sumToP;
    return e;
  };
  if (s.tuning === 'twin') {
    // two arms share the struck bell. Perfect needs both arms to reach P (they meet).
    let arm = 0, reach = 1, sumToP = 0;
    for (let k = 1; k <= H; k++) { reach *= p; const w = hopWeight(s, k); arm += reach * w; if (k <= P) sumToP += w; }
    const both = Math.pow(p, 2 * P);
    const base = hopWeight(s, 0) + 2 * arm;
    return v * (base + both * (CFG.perfectMult - 1) * (hopWeight(s, 0) + 2 * sumToP));
  }
  return v * chain();
}

// Stochastic cascade for real play. Returns the ring sequence so the game can animate it.
export function cascade(s, startBell, rng = Math.random, hand = false) {
  const p = echoChance(s), H = maxHops(s), P = perfectHop(s), v = ringValue(s) * (hand ? handPower(s) : 1), n = s.bells;
  const rings = [{ bell: startBell, hop: 0, arm: 0, value: v * hopWeight(s, 0) }];
  const arms = s.tuning === 'twin' ? [1, -1] : [1];
  const reached = [];
  for (const dir of arms) {
    let k = 0;
    while (k < H && rng() < p) {
      k++;
      const bell = (((startBell + dir * k) % n) + n) % n;
      rings.push({ bell, hop: k, arm: dir, value: v * hopWeight(s, k) });
    }
    reached.push(k);
  }
  const perfect = reached.every((k) => k >= P);
  if (perfect) {
    for (const r of rings) if (r.hop <= P) r.value *= CFG.perfectMult;
  }
  const total = rings.reduce((a, r) => a + r.value, 0);
  const length = rings.length;
  return { rings, perfect, total, length };
}

// ---------- shop ----------
export const SHOP = [
  { id: 'bell', layer: 1, name: 'bell', icon: 'bell',
    desc: (s) => `+1 bell. longer chains. (${s.bells}/${CFG.maxBells})`,
    cost: (s) => costOf('bell', s.bells - CFG.startBells),
    can: (s) => s.bells < CFG.maxBells,
    buy: (s) => { s.bells++; } },
  { id: 'echo', layer: 1, name: 'echo', icon: 'echo',
    desc: (s) => `jump chance ${pct(echoChance(s))} → ${pct(Math.min(0.95, echoChance(s) + CFG.echoStep))}`,
    cost: (s) => costOf('echo', s.lv.echo),
    can: (s) => s.lv.echo < CFG.echoMaxLevel,
    buy: (s) => { s.lv.echo++; } },
  { id: 'bronze', layer: 1, name: 'bronze', icon: 'bronze',
    desc: (s) => `every ring x${CFG.bronzeMult} (lv ${s.lv.bronze})`,
    cost: (s) => costOf('bronze', s.lv.bronze),
    can: () => true,
    buy: (s) => { s.lv.bronze++; } },
  { id: 'cresc', layer: 1, name: 'crescendo', icon: 'cresc',
    desc: (s) => `each hop +${pct(crescendo(s))} → +${pct(crescendo(s) + CFG.crescStep)}`,
    cost: (s) => costOf('cresc', s.lv.cresc),
    can: () => true,
    buy: (s) => { s.lv.cresc++; } },
  { id: 'ringer', layer: 2, name: 'ringer', icon: 'ringer',
    desc: (s) => `hits a bell every ${ringerInterval(s).toFixed(1)}s (${s.lv.ringer} hired). your taps x${handPower(s).toFixed(2).replace(/\.?0+$/, '')}`,
    cost: (s) => costOf('ringer', s.lv.ringer),
    can: () => true,
    buy: (s) => { s.lv.ringer++; } },
  { id: 'tempo', layer: 2, name: 'tempo', icon: 'tempo',
    desc: (s) => `ringers ${Math.round((1 / CFG.tempoFactor - 1) * 100)}% faster (lv ${s.lv.tempo})`,
    cost: (s) => costOf('tempo', s.lv.tempo),
    can: (s) => s.lv.tempo < CFG.tempoMaxLevel,
    buy: (s) => { s.lv.tempo++; } },
  { id: 'bellwright', layer: 2, name: 'bellwright', icon: 'wright',
    desc: () => 'buys bells for you. all run. no questions.',
    cost: () => CFG.bellwrightCost,
    can: (s) => !s.bellwright,
    buy: (s) => { s.bellwright = true; } },
];

export const shopItem = (id) => SHOP.find((x) => x.id === id);
export const visible = (s, item) => item.layer === 1 || s.autoUnlocked;

export function tryBuy(s, id) {
  const it = shopItem(id);
  if (!it || !visible(s, it) || !it.can(s)) return false;
  const c = it.cost(s);
  if (s.res < c) return false;
  s.res -= c;
  it.buy(s);
  return true;
}

// ---------- earning / time ----------
export function earn(s, amount) {
  s.res += amount;
  s.runEarned += amount;
  s.totalEarned += amount;
  if (!s.autoUnlocked && s.runEarned >= CFG.automationUnlockAt) s.autoUnlocked = true;
}

export function recordChain(s, c) {
  s.strikes++;
  if (c.length > s.bestChain) s.bestChain = c.length;
  if (c.perfect) s.perfects++;
}

// Bellwright: buy bells whenever affordable. Returns number bought.
export function autoBuy(s) {
  if (!s.bellwright) return 0;
  let n = 0;
  while (n < 5 && tryBuy(s, 'bell')) n++;
  return n;
}

export function incomePerSec(s) {
  return strikesPerSec(s) * expectedStrike(s);
}

export function offlineGain(s, seconds) {
  const sec = Math.max(0, Math.min(seconds, CFG.offlineCapSec));
  const strikes = Math.floor(strikesPerSec(s) * sec * CFG.offlineEfficiency);
  const gain = strikes * expectedStrike(s);
  return { sec, strikes, gain, capped: seconds > CFG.offlineCapSec };
}

// ---------- prestige ----------
export const recastReq = (s) => CFG.prestigeReq * Math.pow(CFG.prestigeGrowth, s.recasts);
export const canRecast = (s) => s.runEarned >= recastReq(s);
export function overtoneGain(s) {
  if (!canRecast(s)) return 0;
  return Math.floor(3 * Math.sqrt(s.runEarned / recastReq(s))) * (1 + s.recasts);
}
export function unlockedTunings(s, recastsAfter = s.recasts) {
  return Object.entries(TUNINGS)
    .filter(([k, t]) => k !== 'none' && recastsAfter >= (t.unlockRecasts || 0))
    .map(([k]) => k);
}
export function recast(s, tuning) {
  const gain = overtoneGain(s);
  if (gain <= 0) return false;
  const keep = {
    overtones: s.overtones + gain, recasts: s.recasts + 1, totalEarned: s.totalEarned,
    bestChain: s.bestChain, perfects: s.perfects, strikes: s.strikes, playSec: s.playSec, muted: s.muted, buys: s.buys,
  };
  const fresh = newState();
  Object.assign(s, fresh, keep);
  s.tuning = unlockedTunings(s).includes(tuning) ? tuning : 'none';
  s.bells = CFG.recastStartBells;
  s.autoUnlocked = true;
  return gain;
}

// ---------- save ----------
export function serialize(s) { return JSON.stringify(s); }
export function deserialize(str) {
  const base = newState();
  try {
    const d = JSON.parse(str);
    if (!d || typeof d !== 'object') return base;
    const out = Object.assign(base, d);
    out.lv = Object.assign(newState().lv, d.lv || {});
    for (const k of ['res', 'runEarned', 'totalEarned', 'overtones']) if (!Number.isFinite(out[k])) out[k] = 0;
    out.bells = Math.max(CFG.startBells, Math.min(CFG.maxBells, out.bells | 0));
    if (!TUNINGS[out.tuning]) out.tuning = 'none';
    return out;
  } catch (e) {
    return base;
  }
}

// ---------- formatting ----------
const SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
export function fmt(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 1000) return n < 10 ? (Math.floor(n * 10) / 10).toString() : Math.floor(n).toString();
  const e = Math.floor(Math.log10(n) / 3);
  if (e >= SUFFIX.length) return n.toExponential(2).replace('+', '');
  const v = n / Math.pow(1000, e);
  return (v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)) + SUFFIX[e];
}
export function pct(x) { return Math.round(x * 100) + '%'; }
export function fmtTime(sec) {
  sec = Math.floor(sec);
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

// Seeded RNG for the sim and tests.
export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
