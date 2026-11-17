/* mow money: a grass-cutting incremental. computer cooked games. vanilla js + canvas, no build step. */
(() => {
'use strict';
const Q = new URLSearchParams(location.search);
const TEST = Q.get('cctest') === '1' || (() => { try { return window.parent !== window && new URLSearchParams(parent.location.search).get('cctest') === '1'; } catch (e) { return false; } })();
const SHOT = Q.get('shot') === '1';
const $ = s => document.querySelector(s);
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];

/* ---------------- data ---------------- */
const CELL_BASE = 0.05;     // $ per fully grown cell, before multipliers
const NCELL = 5200;         // cells per lawn (constant so balance is the same on every screen)
const PAD = 12;             // fence px around the lawn

const LAWNS = [
  { id: 'backyard', short: 'the backyard', name: 'the backyard', cost: 0, mult: 1, grow: 30,
    tall: [36, 124, 44], cl: [134, 210, 96], cd: [82, 160, 64], spec: [0, 0, 0], bg: '#5b3d26', edge: '#e9dcbc',
    gim: 'gnomes hide in the grass. mow into one for a bonus and a page in the gnome book.' },
  { id: 'gary', short: "gary's lawn", name: "gary's front lawn", cost: 1000, mult: 5, grow: 28,
    tall: [64, 128, 36], cl: [168, 214, 92], cd: [112, 170, 58], spec: [0, 0, 0], bg: '#8c9098', edge: '#d8dce2',
    gim: "gary's dog is asleep in the middle. do not wake gary's dog. (you will wake gary's dog.)" },
  { id: 'golf', short: 'the golf course', name: 'the golf course', cost: 8e4, mult: 25, grow: 26,
    tall: [18, 118, 62], cl: [116, 226, 128], cd: [58, 172, 92], spec: [236, 214, 152], bg: '#1d4a2a', edge: '#f4f1e6',
    gim: 'golden grass grows here a lot. it is worth 25x. the sand traps are worth nothing, like sand.' },
  { id: 'moon', short: 'the moon', name: 'the moon', cost: 6e6, mult: 125, grow: 24,
    tall: [64, 150, 176], cl: [196, 226, 232], cd: [138, 176, 190], spec: [52, 58, 74], bg: '#090b18', edge: '#8a90aa',
    gim: 'moon rocks dull your blade. dull blades earn less. clippings float off into space. nasa is aware.' },
  { id: 'crime', short: 'the crime scene', name: 'a lawn that is also a crime scene', cost: 6e7, mult: 625, grow: 22,
    tall: [30, 94, 50], cl: [156, 204, 122], cd: [98, 152, 86], spec: [0, 0, 0], bg: '#24242c', edge: '#ffd400',
    gim: 'do not mow inside the chalk outline. that is evidence. everything else is fine, legally.' },
  { id: 'yours', short: 'your own lawn', name: 'your own lawn, finally', cost: 3e9, mult: 3125, grow: 20, needSale: true,
    tall: [44, 138, 58], cl: [176, 232, 124], cd: [112, 184, 84], spec: [0, 0, 0], bg: '#7a5230', edge: '#f5f3ed',
    gim: 'only for people who have sold a mower business. every gnome retires here eventually. nobody fines you.' },
  { id: 'minigolf', short: 'mini golf', name: 'a mini golf course', cost: 6e10, mult: 15625, grow: 19, needSale: 1,
    tall: [20, 150, 120], cl: [120, 240, 200], cd: [60, 190, 150], spec: [0, 0, 0], wall: [196, 90, 60], bg: '#ff8fab', edge: '#ffd166',
    gim: 'the windmills spin. the windmills hit you. this is mini golf. needs 1 sale.' },
  { id: 'roof', short: 'the roof', name: 'a lawn on a roof', cost: 1.5e12, mult: 78125, grow: 18, needSale: 2,
    tall: [70, 150, 40], cl: [190, 236, 110], cd: [130, 190, 70], spec: [0, 0, 0], wall: [150, 156, 168], bg: '#59606e', edge: '#c9ced6',
    gim: 'wind gusts shove you around. the ac units do not move. the view is nice. needs 2 sales.' },
  { id: 'maze', short: 'the maze', name: 'a hedge maze', cost: 4e13, mult: 390625, grow: 17, needSale: 3,
    tall: [34, 120, 40], cl: [150, 210, 100], cd: [96, 160, 70], spec: [0, 0, 0], wall: [24, 70, 30], bg: '#2b3a22', edge: '#d9c7a3',
    gim: 'hedges are walls. walls are hedges. golden grass grows in the middle. needs 3 sales.' },
];
const lawnReq = i => LAWNS[i].needSale === true ? 1 : (LAWNS[i].needSale || 0);
const maxLawns = () => { let n = 0; while (n < LAWNS.length && lawnReq(n) <= S.prestiges) n++; return n; };

const UPS = [
  { id: 'blade', name: 'a wider blade', base: 10, k: 1.6, max: 25, ds: 'more lawn per lawn.' },
  { id: 'speed', name: 'more horsepower', base: 18, k: 1.6, max: 25, ds: 'it was a one-horse mower. it is now more horses.' },
  { id: 'value', name: 'fancier grass', base: 40, k: 1.85, max: 80, ds: 'same grass. better marketing.' },
  { id: 'sprinkler', name: 'sprinklers', base: 150, k: 2.0, max: 30, ds: 'grass grows back faster. the water bill is not our problem.' },
  { id: 'goat', name: 'a goat', base: 120, k: 1.5, max: 12, ds: 'eats grass for free. does not do stripes.' },
  { id: 'robot', name: 'robot mower', base: 5000, k: 1.9, max: 6, ds: 'bad at its job. spends a lot of time "thinking".' },
  { id: 'doug', name: 'a guy named doug', base: 4e5, k: 2.1, max: 5, ds: "doug has done this before. perfect stripes. doug." },
  { id: 'whetstone', name: 'whetstone subscription', base: 1.5e6, k: 2.2, max: 8, ds: 'your blade sharpens itself. moon rocks hate this.', req: 3 },
];
const UPI = {}; UPS.forEach(u => UPI[u.id] = u);

const PERKS = [
  { id: 'soil', name: 'rich soil', ds: '+20% cash forever, per level.', cost: l => 1 + l, max: 30 },
  { id: 'thumb', name: 'green thumb', ds: 'grass grows 15% faster, per level.', cost: l => 1 + l, max: 12 },
  { id: 'start', name: 'family money', ds: 'start each business with cash and a better mower.', cost: l => 2 + 2 * l, max: 5 },
  { id: 'goats', name: 'unionised goats', ds: 'helpers move 20% faster, per level. they asked nicely.', cost: l => 2 + l, max: 8 },
  { id: 'realtor', name: 'a realtor', ds: 'lawns cost 40% less, per level. do not ask how.', cost: l => 3 + 2 * l, max: 3 },
  { id: 'shed', name: 'a bigger shed', ds: '+1h of offline earnings, per level (base 1h).', cost: l => 2 + l, max: 7 },
  { id: 'nitro', tier: 2, name: 'nitro', ds: 'the mower is 12% faster forever, per level. it smells weird.', cost: l => 4 + 3 * l, max: 5 },
  { id: 'whistle', tier: 2, name: 'gnome whistle', ds: 'gnomes show up 40% more often and stay longer, per level.', cost: l => 3 + 3 * l, max: 3 },
  { id: 'golden', tier: 2, name: 'golden touch', ds: 'golden grass grows 70% more often everywhere, per level.', cost: l => 4 + 3 * l, max: 3 },
  { id: 'flow', tier: 2, name: 'flow state', ds: 'your streak goes 0.25 higher, per level. you are one with the lawn.', cost: l => 5 + 3 * l, max: 4 },
  { id: 'insure', tier: 2, name: 'hazard insurance', ds: 'dogs, rocks, fines, windmills and wind hurt 25% less, per level.', cost: l => 3 + 2 * l, max: 3 },
  { id: 'intern', tier: 2, name: 'an intern', ds: 'buys the cheapest upgrade for you every 4s. unpaid. (that is the perk.)', cost: l => 8, max: 1 },
  // the endless compost sink: never maxes, so late compost always has somewhere to go
  { id: 'goldgnome', tier: 3, name: 'a golden gnome', ds: 'cash x1.5 forever, per level. solid gold. very heavy. nobody knows where they come from.', cost: l => Math.ceil(40 * Math.pow(1.7, l)), max: Infinity },
];
const hurt = () => Math.max(0.2, 1 - 0.25 * (S.perks.insure | 0));

const GNOMES = [
  // backyard
  { n: 'gerald', hat: '#e63946', coat: '#3a6ea5', acc: 0 },
  { n: 'gnome with a fishing rod', hat: '#e63946', coat: '#2a9d8f', acc: 1 },
  { n: 'smug gnome', hat: '#9b5de5', coat: '#3a6ea5', acc: 2 },
  { n: 'gnome with a tiny mower', hat: '#f77f00', coat: '#264653', acc: 3 },
  // gary
  { n: 'gary (the gnome)', hat: '#e63946', coat: '#6d597a', acc: 0 },
  { n: 'gnome in a dog costume', hat: '#8d5524', coat: '#8d5524', acc: 4 },
  { n: 'the gnome that saw something', hat: '#e63946', coat: '#3a6ea5', acc: 5 },
  { n: 'bathrobe gnome', hat: '#ffafcc', coat: '#ffafcc', acc: 0 },
  // golf
  { n: 'caddie gnome', hat: '#ffffff', coat: '#2a9d8f', acc: 6 },
  { n: 'gnome who yells fore', hat: '#e63946', coat: '#ffb703', acc: 5 },
  { n: 'gnome in plaid pants', hat: '#023047', coat: '#c1121f', acc: 2 },
  { n: 'hole-in-one gnome', hat: '#ffd60a', coat: '#3a6ea5', acc: 7 },
  // moon
  { n: 'astronaut gnome', hat: '#e63946', coat: '#e9ecef', acc: 8 },
  { n: 'gnome with no helmet (fine)', hat: '#e63946', coat: '#adb5bd', acc: 5 },
  { n: 'moon gnome', hat: '#8ecae6', coat: '#6c757d', acc: 0 },
  { n: 'gnome planting a flag', hat: '#e63946', coat: '#e9ecef', acc: 9 },
  // crime scene
  { n: 'detective gnome', hat: '#6f4e37', coat: '#c2a878', acc: 10 },
  { n: 'gnome in a trench coat', hat: '#343a40', coat: '#c2a878', acc: 2 },
  { n: 'suspect gnome', hat: '#212529', coat: '#212529', acc: 11 },
  { n: 'gnome in witness protection', hat: '#e63946', coat: '#3a6ea5', acc: 12 },
];

const NOTES = [
  'linda (no. 4): your stripes are "a lot".',
  'hoa: grass must not exceed 4 inches. it is 4.1 inches. we are watching.',
  'neighbour kid: can i ride it. (no.)',
  'anonymous: who mows at this hour.',
  'linda: my lawn looks worse now. thanks.',
  'your mum: proud of you. do the front too.',
  'the grass: we will be back.',
  'hoa: stripes approved. reluctantly.',
  'your accountant: grass is not a currency. (it is now.)',
  'linda: are you a business now.',
  'mailman: i have to walk on that.',
  'local bee: you cut my flower. i have a family.',
  'hoa: please stop waving at us.',
];
const LAWN_NOTES = [
  ['linda: that gnome was there when i moved in.', 'the backyard: ow.'],
  ["gary: have you seen my dog. he is asleep on the lawn. he is fine.", 'gary: the dog is also named gary.', 'gary: do not wake gary.'],
  ['golf guy: you are on the 9th green. that is fine. keep going.', 'groundskeeper: who hired you.', 'club president: please wear a collar.'],
  ['nasa: please stop mowing the moon.', 'nasa: the goats are not cleared for spaceflight.', 'houston: we have a lawn.'],
  ['detective: sir. sir. that is evidence.', 'detective: you can mow around it. around.', 'the victim: (no comment)'],
  ['you: finally.', 'linda: you bought the house next to me. why.', 'doug: nice lawn. i have done this before.', 'the hoa: welcome. we have notes.'],
  ['a child: you are ruining my putt.', 'windmill: whoosh. (threat)', 'mini golf manager: please stop mowing hole 7.'],
  ['building manager: who put a lawn up here.', 'pigeon: this is my roof.', 'the wind: (is about to do something)'],
  ['a voice in the maze: help.', 'the minotaur: nice stripes.', 'doug: i have done this maze before.'],
];
const ROBOT_SAY = ['recalculating', 'is that grass', 'error: lawn', 'i am doing great', 'beep (sad)', 'updating...', 'who am i', 'stuck. emotionally.', 'mowing? mowing.'];
const GOAT_SAY = ['meh', 'bleh', 'mrrh', '*chewing*', 'meh.'];
const DOUG_SAY = ["i've done this before", 'nice day for it', 'doug.', 'see these stripes', 'easy money'];

/* ---------------- state ---------------- */
const SAVE_KEY = 'mm-save';
function fresh() {
  return {
    v: 1, cash: 0, runEarned: 0, lifeEarned: 0, playT: 0, offT: 0, lifeT: 0, lvl: {}, lawn: 0, owned: 1,
    compost: 0, compostTotal: 0, lastSale: 0, perks: {}, gnomes: {}, prestiges: 0, muted: false, t: 0, offRate: 0,
    started: false, best: 0, newG: 0, sellSeen: 0, tut: 0,
  };
}
let S = fresh();
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      if (o && o.v === 1) {
        S = Object.assign(fresh(), o);
        // saves from before lifetime time was kept: this run's time plus 10 min for every past sale (a sale takes 14+ min the first two times)
        if (typeof o.lifeT !== 'number') S.lifeT = (S.playT || 0) + (S.offT || 0) + 600 * (S.prestiges || 0);
      }
    }
  } catch (e) { /* no storage */ }
}
function save() {
  if (SHOT || (TEST && Q.get('nosave') === '1')) return;
  S.t = Date.now();
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
}
const lv = id => S.lvl[id] | 0;
const pk = id => S.perks[id] | 0;
const L = () => LAWNS[S.lawn];

/* ---------------- derived stats ---------------- */
const bladeR = () => 1.6 + 0.3 * lv('blade');
const mowSpeed = () => (13 + 1.15 * lv('speed')) * (1 + 0.12 * (S.perks.nitro | 0));
// sprinklers: +25% regrowth for the first 8, then +6% each (30 levels of +25% made the lawn regrow in ~2 s: no stripes, no bonuses)
const sprF = (l = lv('sprinkler')) => 1 + 0.25 * Math.min(l, 8) + 0.06 * Math.max(0, l - 8);
const growRate = () => (1 / L().grow) * sprF() * (1 + 0.15 * pk('thumb'));
// a cell counts as mowed (for % mowed, immaculate and 100%) below this height; fast regrowth widens it a little so the bonuses stay reachable
const shortH = () => Math.min(0.8, 0.5 * Math.sqrt(sprF() * (1 + 0.15 * pk('thumb'))));
const helperMul = () => 1 + 0.2 * pk('goats');
const uniqueGnomes = () => Object.keys(S.gnomes).length;
function valueMul() {
  return Math.pow(1.25, lv('value')) * (1 + 0.05 * S.compostTotal) * (1 + 0.2 * pk('soil')) * (1 + 0.03 * uniqueGnomes()) * Math.pow(1.5, pk('goldgnome'));
}
const cellVal = () => CELL_BASE * L().mult * valueMul();
const upCost = id => { const u = UPI[id]; return u.base * Math.pow(u.k, lv(id)); };
const lawnCost = i => LAWNS[i].cost * Math.pow(0.6, pk('realtor'));
// compost (Nov 16 ship prep): a sale pays (cash earned this run / $1m) ^ 0.3, and doug never pays more than 2.5x your
// last sale. the old curve (^0.45, uncapped) snowballed: 28 -> 2.4k -> 918k -> 55m compost by the 4th sale.
const COMPOST_DIV = 1e6, COMPOST_Q = 0.3, COMPOST_CAP = 2.5;
const compostRaw = () => Math.floor(Math.pow(Math.max(0, S.runEarned) / COMPOST_DIV, COMPOST_Q));
const compostCap = () => S.lastSale > 0 ? Math.floor(S.lastSale * COMPOST_CAP) : Infinity;
const compostFor = () => Math.min(compostRaw(), compostCap()); // what selling now pays
const compostMore = () => Math.max(0, COMPOST_DIV * Math.pow(compostRaw() + 1, 1 / COMPOST_Q) - S.runEarned); // cash until one more
const offCap = () => 3600 * (1 + pk('shed'));

/* ---------------- grid ---------------- */
const cv = $('#cv'), ctx = cv.getContext('2d');
const gc = document.createElement('canvas'), gx = gc.getContext('2d');
let DPR = 1, VW = 300, VH = 300;
let W = 0, H = 0, N = 0, cs = 6, ox = 0, oy = 0;
let gcut = null, dir = null, type = null, noiseA = null, noiseB = null, img = null;
let rowDirty = null, grassFull = true, grassPhase = 0; // grass bitmap cache: rows to redraw
let G = 0; // growth clock: a cell is h = min(1, G - gcut[i]) tall
let layout = null; // normalized lawn features
const SH = new Float32Array(256); // stripe shade per heading byte
for (let i = 0; i < 256; i++) SH[i] = 0.5 + 0.5 * Math.cos(i / 256 * TAU - (-Math.PI / 3));
const angB = a => ((Math.round(((a % TAU) + TAU) % TAU / TAU * 256)) & 255);

function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function makeLayout(li) {
  const r = seeded(li * 7919 + 13);
  const o = { sand: [], craters: [], chalk: null, flag: null, mills: null, flags: null, boxes: null, maze: false };
  if (li === 2) {
    for (let i = 0; i < 3; i++) o.sand.push({ x: 0.18 + r() * 0.64, y: 0.15 + r() * 0.7, rx: 0.07 + r() * 0.06, ry: 0.05 + r() * 0.04 });
    o.flag = { x: 0.5 + (r() - 0.5) * 0.4, y: 0.5 + (r() - 0.5) * 0.4 };
  }
  if (li === 3) for (let i = 0; i < 6; i++) o.craters.push({ x: 0.1 + r() * 0.8, y: 0.1 + r() * 0.8, rx: 0.04 + r() * 0.05, ry: 0 });
  if (li === 6) { o.mills = [{ x: 0.3, y: 0.28 }, { x: 0.7, y: 0.5 }, { x: 0.32, y: 0.75 }]; o.flags = [{ x: 0.75, y: 0.2 }, { x: 0.62, y: 0.86 }]; }
  if (li === 7) { o.boxes = [{ x: 0.22, y: 0.3, w: 0.14, h: 0.08 }, { x: 0.7, y: 0.62, w: 0.12, h: 0.1 }, { x: 0.4, y: 0.82, w: 0.1, h: 0.06 }]; }
  if (li === 8) o.maze = true;
  if (li === 4) {
    const head = []; for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; head.push([0.5 + Math.cos(a) * 0.075, 0.2 + Math.sin(a) * 0.075]); }
    const body = [[0.44, 0.28], [0.3, 0.33], [0.2, 0.46], [0.27, 0.49], [0.38, 0.39], [0.4, 0.56], [0.33, 0.8], [0.4, 0.82], [0.5, 0.62], [0.6, 0.82], [0.67, 0.8], [0.6, 0.56], [0.62, 0.39], [0.73, 0.49], [0.8, 0.46], [0.7, 0.33], [0.56, 0.28]];
    o.chalk = [head, body];
  }
  return o;
}
function chalkPts(poly) { // normalized → cell coords, outline box in the middle of the lawn
  return poly.map(p => [W * (0.2 + p[0] * 0.6), H * (0.1 + p[1] * 0.8)]);
}
function applyLayout() {
  type.fill(0);
  const lo = layout;
  const ell = (e, t) => {
    const ar = e.ry ? e.ry : e.rx * W / H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x + 0.5) / W - e.x, dy = (y + 0.5) / H - e.y;
      if ((dx / e.rx) ** 2 + (dy / ar) ** 2 <= 1) type[y * W + x] = t;
    }
  };
  lo.sand.forEach(e => ell(e, 2));
  const box = (x0, y0, x1, y1) => { for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) type[y * W + x] = 4; };
  if (lo.mills) lo.mills.forEach(m => box(m.x * W - 1.5, m.y * H - 1.5, m.x * W + 1.5, m.y * H + 1.5));
  if (lo.boxes) lo.boxes.forEach(b => box(b.x * W, b.y * H, (b.x + b.w) * W, (b.y + b.h) * H));
  if (lo.maze) {
    const rg = seeded(4242), cx = Math.max(3, Math.round(W / 11)), cy = Math.max(3, Math.round(H / 11)), cw = W / cx, ch = H / cy, th = 0.8;
    const seen = new Uint8Array(cx * cy), east = new Uint8Array(cx * cy).fill(1), south = new Uint8Array(cx * cy).fill(1);
    const stack = [0]; seen[0] = 1;
    while (stack.length) {
      const c = stack[stack.length - 1], i = c % cx, j = (c / cx) | 0, nb = [];
      if (i > 0 && !seen[c - 1]) nb.push(c - 1);
      if (i < cx - 1 && !seen[c + 1]) nb.push(c + 1);
      if (j > 0 && !seen[c - cx]) nb.push(c - cx);
      if (j < cy - 1 && !seen[c + cx]) nb.push(c + cx);
      if (!nb.length) { stack.pop(); continue; }
      const n = nb[(rg() * nb.length) | 0];
      if (n === c + 1) east[c] = 0; else if (n === c - 1) east[n] = 0; else if (n === c + cx) south[c] = 0; else south[n] = 0;
      seen[n] = 1; stack.push(n);
    }
    for (let c = 0; c < cx * cy; c++) { if (rg() < 0.18) east[c] = 0; if (rg() < 0.18) south[c] = 0; }
    for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
      const c = j * cx + i;
      if (east[c] && i < cx - 1) box((i + 1) * cw - th, j * ch - th, (i + 1) * cw + th, (j + 1) * ch + th);
      if (south[c] && j < cy - 1) box(i * cw - th, (j + 1) * ch - th, (i + 1) * cw + th, (j + 1) * ch + th);
    }
    for (let y = Math.floor(H / 2 - 3); y < H / 2 + 3; y++) for (let x = Math.floor(W / 2 - 3); x < W / 2 + 3; x++) if (type[y * W + x] === 4) type[y * W + x] = 0;
  }
  lo.craters.forEach(e => ell({ x: e.x, y: e.y, rx: e.rx, ry: e.rx * W / H }, 2));
  if (lo.chalk) {
    for (const poly of lo.chalk) {
      const pts = chalkPts(poly);
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k], b = pts[(k + 1) % pts.length];
        const x0 = Math.floor(Math.min(a[0], b[0]) - 2), x1 = Math.ceil(Math.max(a[0], b[0]) + 2);
        const y0 = Math.floor(Math.min(a[1], b[1]) - 2), y1 = Math.ceil(Math.max(a[1], b[1]) + 2);
        for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
          if (segDist(x + 0.5, y + 0.5, a[0], a[1], b[0], b[1]) < 0.95) type[y * W + x] = 3;
        }
      }
    }
  }
}
const solidAt = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; return type[(y | 0) * W + (x | 0)] === 4; };
function moveTo(o, nx, ny) { // slide along walls
  nx = clamp(nx, 0.6, W - 0.6); ny = clamp(ny, 0.6, H - 0.6);
  if (!solidAt(nx, ny) || solidAt(o.x, o.y)) { o.x = nx; o.y = ny; return true; } // (already inside a hedge or an ac unit: let it walk out)
  if (!solidAt(nx, o.y)) { o.x = nx; return false; }
  if (!solidAt(o.x, ny)) { o.y = ny; return false; }
  return false;
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}
function makeNoise() {
  noiseA = new Float32Array(N); noiseB = new Float32Array(N * 4);
  const p1 = rnd(0, 9), p2 = rnd(0, 9), p3 = rnd(0, 9);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    noiseA[y * W + x] = Math.sin(x * 0.33 + p1) * Math.sin(y * 0.29 + p2) * 0.45 + Math.sin((x + y) * 0.13 + p3) * 0.3 + (Math.random() - 0.5) * 0.5;
  }
  for (let i = 0; i < N * 4; i++) noiseB[i] = Math.random() * 2 - 1;
}
function stageSize() {
  const r = $('#stage').getBoundingClientRect();
  VW = Math.max(100, r.width); VH = Math.max(100, r.height);
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(VW * DPR); cv.height = Math.round(VH * DPR);
}
function setupGrid(force) {
  const aw = VW - 2 * PAD, ah = VH - 2 * PAD, asp = aw / ah;
  const nW = Math.max(24, Math.round(Math.sqrt(NCELL * asp))), nH = Math.max(24, Math.round(NCELL / nW));
  if (!force && nW === W && nH === H) { layoutPx(); return; }
  const oW = W, oH = H, og = gcut, od = dir;
  W = nW; H = nH; N = W * H;
  gcut = new Float64Array(N); dir = new Uint8Array(N); type = new Uint8Array(N);
  if (og && !force) {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const j = Math.min(oH - 1, (y * oH / H) | 0) * oW + Math.min(oW - 1, (x * oW / W) | 0);
      gcut[y * W + x] = og[j]; dir[y * W + x] = od[j];
    }
    const sx = W / oW, sy = H / oH;
    const sc = o => { o.x *= sx; o.y *= sy; if (o.tx !== undefined) { o.tx *= sx; o.ty *= sy; } if (o.hx !== undefined) { o.hx *= sx; o.hy *= sy; } };
    sc(P); helpers.forEach(sc); if (gnome) sc(gnome); if (dog) sc(dog); rocks.forEach(sc);
    if (target) { target.x *= sx; target.y *= sy; }
  } else {
    gcut.fill(G - 1.5);
    for (let i = 0; i < N; i++) dir[i] = 64;
  }
  layout = makeLayout(S.lawn);
  makeNoise(); applyLayout();
  gc.width = W * 2; gc.height = H * 2; img = gx.createImageData(W * 2, H * 2);
  rowDirty = new Uint8Array(H); grassFull = true;
  layoutPx();
}
function layoutPx() {
  cs = Math.min((VW - 2 * PAD) / W, (VH - 2 * PAD) / H);
  ox = (VW - W * cs) / 2; oy = (VH - H * cs) / 2;
}
const hAt = (x, y) => { const i = (y | 0) * W + (x | 0); if (i < 0 || i >= N) return 0; return Math.min(1, G - gcut[i]); };

/* ---------------- entities ---------------- */
const P = { x: 10, y: 10, a: -Math.PI / 2, v: 0, stun: 0, sharp: 1, streak: 1, idle: 0 };
let target = null; // {x,y,follow}
const keys = {};
let helpers = [];
let gnome = null, gnomeT = 6;
let dog = null, rocks = [];
let goldT = 10;
let parts = [], pops = [];
let STR = { a: 0, d: 0, cash: 0, tall: 0 }, stripes = 0, fullReady = true, millCD = 0, gust = { t: 8, ph: 'idle', a: 0 }, internT = 4, cashTarget = { x: 40, y: -24 };
let shake = 0, rings = [], puffT = 0, mowedFrac = 0, immReady = true, immHint = false, immCount = 0;
let pend = 0, pendT = 0, popT = 0;
let rateWin = 0, rateWinH = 0, rateWinT = 0, rateEMA = 0, rateH = 0;
let noteT = 18, fineCD = 0, robotNoteDone = false;
let paused = false, autopilot = false, AP = { y: 1.5, d: 1, stuck: 0 };
let lastMoveT = 0, introGone = false;
let evCount = 0;
let timeNow = 0;

function resetLawnObjects() {
  P.x = W / 2; P.y = H * 0.62; P.a = -Math.PI / 2; P.v = 0; P.sharp = 1; P.stun = 0;
  for (let k = 1; k < 40 && solidAt(P.x, P.y); k++) P.y = H * 0.62 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5; // never start inside a hedge
  target = null; gnome = null; gnomeT = 5; dog = null; rocks = []; goldT = 8; fineCD = 0; millCD = 0; gust = { t: 6, ph: 'idle', a: 0 }; STR.d = 0;
  if (S.lawn === 1) dog = { x: W * 0.5, y: H * 0.32, hx: W * 0.5, hy: H * 0.32, st: 'sleep', t: 0, warn: 0, a: 0 };
  if (S.lawn === 3) for (let i = 0; i < 7; i++) rocks.push(newRock());
  helpers.forEach(h => { h.x = rnd(2, W - 2); h.y = rnd(2, H - 2); h.tx = rnd(2, W - 2); h.ty = rnd(2, H - 2); h.st = 'go'; h.t = rnd(0, 3); h.lane = null; });
}
function newRock() {
  for (let k = 0; k < 30; k++) {
    const x = rnd(3, W - 3), y = rnd(3, H - 3);
    if (Math.hypot(x - P.x, y - P.y) > 8 && type[(y | 0) * W + (x | 0)] === 0) return { x, y, r: rnd(0.9, 1.5), off: 0, seed: Math.random() };
  }
  return { x: rnd(3, W - 3), y: rnd(3, H - 3), r: 1, off: 0, seed: Math.random() };
}
function syncHelpers() {
  for (const k of ['goat', 'robot', 'doug']) {
    const want = lv(k), have = helpers.filter(h => h.k === k).length;
    for (let i = have; i < want; i++) helpers.push({ k, x: rnd(2, W - 2), y: rnd(2, H - 2), a: rnd(0, TAU), st: 'go', t: rnd(0, 2), tx: rnd(2, W - 2), ty: rnd(2, H - 2), bub: '', bubT: 0, lane: null, spin: 0 });
    if (have > want) helpers = helpers.filter(h => h.k !== k).concat(helpers.filter(h => h.k === k).slice(0, want));
  }
}
const H_STATS = { goat: { r: 1.35, sp: 3.4 }, robot: { r: 2.1, sp: 7.5 }, doug: { r: 3.0, sp: 10 } };

/* ---------------- cutting ---------------- */
let CT = 0, CG = 0, CE = 0;
function cut(cx, cy, r, a, messy) {
  const x0 = Math.max(0, Math.floor(cx - r)), x1 = Math.min(W - 1, Math.ceil(cx + r));
  const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(H - 1, Math.ceil(cy + r));
  const r2 = r * r; let db = angB(a), e = 0; CT = 0; CG = 0; CE = 0;
  if (rowDirty) for (let y = y0, ye = Math.min(H - 1, y1 + 1); y <= ye; y++) rowDirty[y] = 1; // (+1: the row below shades off this one)
  for (let y = y0; y <= y1; y++) {
    const dy = y + 0.5 - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x + 0.5 - cx; if (dx * dx + dy * dy > r2) continue;
      const i = y * W + x, t = type[i]; if (t === 2 || t === 4) continue;
      let h = G - gcut[i]; if (h > 1) h = 1;
      if (h > 0.03) {
        let v = h;
        if (t === 1) { v *= 25; CG++; type[i] = 0; }
        else if (t === 3) CE++;
        e += v; if (h > 0.45) CT++;
        gcut[i] = G;
      }
      dir[i] = messy ? (db + ((Math.random() * 90) | 0) - 45) & 255 : db;
    }
  }
  return e;
}
function earn(v, isPlayer) {
  if (v <= 0) return;
  S.cash += v; S.runEarned += v; S.lifeEarned += v; rateWin += v;
  if (!isPlayer) rateWinH += v;
}

/* ---------------- update ---------------- */
function update(dt) {
  timeNow += dt;
  S.playT += dt; S.lifeT += dt;
  G += dt * growRate();
  if (S.started) updPlayer(dt);
  updHelpers(dt);
  updObjects(dt);
  // rate tracking
  rateWinT += dt;
  if (rateWinT >= 0.5) {
    const r = rateWin / rateWinT, rh = rateWinH / rateWinT;
    rateEMA += (r - rateEMA) * 0.25; rateH += (rh - rateH) * 0.25;
    S.offRate = rateH + 0.15 * Math.max(0, rateEMA - rateH);
    rateWin = 0; rateWinH = 0; rateWinT = 0;
    let sh = 0, tot = 0; const sH = shortH();
    for (let i = 0; i < N; i++) { if (type[i] === 2 || type[i] === 4) continue; tot++; if (G - gcut[i] < sH) sh++; }
    mowedFrac = tot ? sh / tot : 0;
    if (S.started && mowedFrac >= 0.7 && immReady) immaculate();
    else if (mowedFrac < 0.4) immReady = true;
    if (S.started && mowedFrac >= 0.95 && fullReady) fullLawn();
    else if (mowedFrac < 0.6) fullReady = true;
    if (!immHint && mowedFrac > 0.4 && S.started && !SKIPPING) { immHint = true; note('tip: get <b>70%</b> of the lawn short at once for an <b>immaculate lawn</b> bonus.'); }
  }
  if (S.runEarned > S.best) S.best = S.runEarned;
  fineCD -= dt;
  if (!SKIPPING && S.started) tutorial();
  if (pk('intern') && S.started) {
    internT -= dt;
    if (internT <= 0) {
      internT = 4;
      let cb = null; for (const u of visibleUps()) if (canBuyUp(u) && (!cb || upCost(u.id) < upCost(cb.id))) cb = u;
      if (cb && buyUp(cb.id) && !SKIPPING && Math.random() < 0.15) note('the intern bought <b>' + cb.name + '</b>. they want "exposure".');
    }
  }
  noteT -= dt;
  if (noteT <= 0) { noteT = rnd(32, 48); if (S.started) note(Math.random() < 0.5 ? pick(LAWN_NOTES[S.lawn]) : pick(NOTES)); }
}

function updPlayer(dt) {
  if (P.stun > 0) { P.stun -= dt; P.v = 0; STR.d = 0; STR.cash = 0; STR.tall = 0; return; }
  const sp = mowSpeed(), r = bladeR();
  let dx = 0, dy = 0, want = false, dist = 1e9;
  const kx = (keys.r ? 1 : 0) - (keys.l ? 1 : 0), ky = (keys.d ? 1 : 0) - (keys.u ? 1 : 0);
  if (kx || ky) { dx = kx; dy = ky; want = true; target = null; }
  else if (autopilot) {
    const tx = AP.d > 0 ? W - 1.2 : 1.2;
    dx = tx - P.x; dy = AP.y - P.y;
    if ((Math.abs(dx) < 0.8 && Math.abs(dy) < 0.8) || AP.stuck > 1.2) { AP.stuck = 0; AP.d = -AP.d; AP.y += r * 1.75; if (AP.y > H - 1) AP.y = 1 + Math.random() * r; }
    want = true;
  } else if (target) {
    dx = target.x - P.x; dy = target.y - P.y; dist = Math.hypot(dx, dy);
    if (dist > 0.35) want = true; else if (!target.follow) target = null;
  }
  if (want) {
    const ang = Math.atan2(dy, dx);
    let da = ang - P.a; da = Math.atan2(Math.sin(da), Math.cos(da));
    const turn = 13 * dt;
    P.a += clamp(da, -turn, turn);
    const align = Math.cos(da);
    const goal = sp * Math.max(0.3, align);
    P.v += clamp(goal - P.v, -60 * dt, 45 * dt);
    if (dist < 3) P.v = Math.min(P.v, Math.max(2, dist * 6));
    P.idle = 0;
  } else { P.v = Math.max(0, P.v - 70 * dt); P.idle += dt; }
  if (P.v > 0.05) {
    const step = P.v * dt, px0 = P.x, py0 = P.y;
    const n = Math.max(1, Math.ceil(step / (r * 0.6)));
    let e = 0, tall = 0, gold = 0, evid = 0;
    for (let s = 0; s < n; s++) {
      if (!moveTo(P, P.x + Math.cos(P.a) * step / n, P.y + Math.sin(P.a) * step / n)) AP.stuck += dt / n;
      e += cut(P.x, P.y, r, P.a, false); tall += CT; gold += CG; evid += CE;
    }
    if (tall > 0) P.streak = Math.min(2 + 0.25 * pk('flow'), P.streak + 0.4 * dt); else P.streak = Math.max(1, P.streak - 0.9 * dt);
    const v = e * cellVal() * P.streak * P.sharp;
    earn(v, true); pend += v;
    let dA = P.a - STR.a; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
    if (Math.abs(dA) < 0.1) { STR.d += Math.hypot(P.x - px0, P.y - py0); STR.cash += v; STR.tall += tall; }
    else { endStripe(); STR.a = P.a; }
    if (tall && !SKIPPING) spawnClippings(Math.min(5, 1 + (tall >> 1)), false);
    if (gold) {
      if (!SKIPPING) { spawnClippings(Math.min(8, gold), true); if (timeNow - lastGoldSnd > 0.4) { play('ding', 0.3, rnd(1, 1.3)); lastGoldSnd = timeNow; } }
    }
    if (evid && fineCD <= 0 && S.lawn === 4) {
      fineCD = 2.5;
      const f = Math.min(S.cash, Math.max(5, rateEMA * 4) * hurt());
      S.cash -= f;
      if (!SKIPPING) {
        addPop(P.x, P.y, '-$' + fmt(f) + ' tampering with evidence', '#ff5d5d', 1.1);
        play('sting', 0.5); shake = 0.25;
        if (Math.random() < 0.35) note(pick(LAWN_NOTES[4]));
      }
    }
    puffT -= dt;
    if (puffT <= 0 && !SKIPPING && parts.length < PMAX) {
      puffT = 0.12;
      const bx = P.x - Math.cos(P.a) * r * 0.75 + Math.sin(P.a) * r * 0.4, by = P.y - Math.sin(P.a) * r * 0.75 - Math.cos(P.a) * r * 0.4;
      parts.push({ puff: true, x: sx(bx), y: sy(by), vx: -Math.cos(P.a) * 25 + rnd(-8, 8), vy: -Math.sin(P.a) * 25 + rnd(-8, 8) - 10, z: 0, vz: 0, life: 0.6, max: 0.6, c: '#c9ced6', s: clamp(r * cs * 0.1, 2.5, 6) });
    }
  } else {
    P.streak = Math.max(1, P.streak - 0.9 * dt);
    if (STR.d > 0) endStripe();
  }
  // sharpness regen
  P.sharp = Math.min(1, P.sharp + dt * (0.012 + 0.03 * lv('whetstone')));
  // pop the pending cash
  popT -= dt;
  if (popT <= 0 && pend > 0) {
    popT = 0.32;
    if (!SKIPPING) {
      addPop(P.x, P.y - 1, '+$' + fmt(pend), P.streak > 1.6 ? '#ffd23f' : '#c5ff49', 0.7 + Math.min(0.6, P.streak - 1));
      play('pop', 0.25, rnd(0.85, 1.35));
      if (parts.length < PMAX) for (let k = 0; k < 2; k++) parts.push({ home: true, x0: sx(P.x) + rnd(-8, 8), y0: sy(P.y) + rnd(-8, 8), x: 0, y: 0, t: -k * 0.08, life: 9, c: k ? '#c5ff49' : '#8bd450', s: 5 });
    }
    pend = 0;
  }
}
let lastGoldSnd = 0;
function endStripe() {
  const ext = Math.abs(Math.cos(STR.a)) * W + Math.abs(Math.sin(STR.a)) * H;
  if (S.started && STR.d >= ext * 0.75 && STR.tall > ext * 1.5) {
    const bonus = STR.cash * 0.35 + 1;
    earn(bonus, true); stripes++;
    if (!SKIPPING) {
      addPop(P.x, P.y - 2.5, 'perfect stripe! +$' + fmt(bonus), '#b59aff', 1.3);
      play('ding', 0.4, 1.25); addRing(P.x, P.y, '#c5ff49');
      if (stripes === 1) { evt('perfect_stripe'); note('<b>perfect stripe.</b> long straight passes through long grass pay +35%.'); }
    }
  }
  STR.d = 0; STR.cash = 0; STR.tall = 0;
}
let SKIPPING = false;

function updHelpers(dt) {
  const hm = helperMul();
  const cvv = cellVal();
  for (const h of helpers) {
    const st = H_STATS[h.k];
    const sp = st.sp * hm;
    h.bubT -= dt;
    let moving = false;
    if (h.k === 'goat') {
      h.t -= dt;
      if (h.st === 'eat') { if (h.t <= 0) { h.st = 'go'; h.tx = clamp(h.x + rnd(-14, 14), 1, W - 1); h.ty = clamp(h.y + rnd(-14, 14), 1, H - 1); } }
      else {
        const dx = h.tx - h.x, dy = h.ty - h.y, d = Math.hypot(dx, dy);
        if (d < 0.5 || h.t < -12) { h.st = 'eat'; h.t = rnd(0.4, 1.6); if (Math.random() < 0.08 && !SKIPPING) say(h, pick(GOAT_SAY)); }
        else { const ta = Math.atan2(dy, dx); h.a += clamp(Math.atan2(Math.sin(ta - h.a), Math.cos(ta - h.a)), -5 * dt, 5 * dt); moving = true; }
      }
      if (h.st === 'eat') { const e = cut(h.x + Math.cos(h.a) * 0.6, h.y + Math.sin(h.a) * 0.6, st.r, h.a, true); earn(e * cvv, false); }
    } else {
      // lane mowers: robot (horizontal, unreliable) and doug (vertical, perfect)
      const vert = h.k === 'doug';
      if (!h.lane) h.lane = { p: rnd(1, vert ? W - 1 : H - 1), d: Math.random() < 0.5 ? 1 : -1, turning: 0 };
      h.t -= dt;
      if (h.k === 'robot' && h.st === 'go' && h.t <= 0) {
        h.t = rnd(4, 8);
        const roll = Math.random();
        if (roll < 0.22) { h.st = 'think'; h.t = rnd(1.5, 3); if (!SKIPPING) say(h, pick(ROBOT_SAY)); }
        else if (roll < 0.36) { h.st = 'spin'; h.t = rnd(1.2, 2.2); if (!SKIPPING) say(h, pick(ROBOT_SAY)); }
        else if (roll < 0.46) { h.st = 'lost'; h.t = rnd(1.5, 2.5); h.a = rnd(0, TAU); }
      } else if (h.st !== 'go' && h.t <= 0) { h.st = 'go'; h.t = rnd(4, 8); h.lane.p = vert ? clamp(h.x, 1, W - 1) : clamp(h.y, 1, H - 1); }
      if (h.k === 'doug' && h.t <= 0) { h.t = rnd(10, 20); if (Math.random() < 0.3 && !SKIPPING) say(h, pick(DOUG_SAY)); }
      if (h.st === 'think') { /* nothing */ }
      else if (h.st === 'spin') { h.a += 7 * dt; cut(h.x, h.y, st.r, h.a, true); }
      else if (h.st === 'lost') { moving = true; if (h.x < 1 || h.x > W - 1 || h.y < 1 || h.y > H - 1) { h.a += Math.PI; h.st = 'go'; } }
      else {
        const ln = h.lane;
        let tx, ty;
        if (vert) { tx = ln.p; ty = ln.d > 0 ? H - 1 : 1; } else { tx = ln.d > 0 ? W - 1 : 1; ty = ln.p; }
        const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy);
        if (d < 0.6) { ln.d = -ln.d; ln.p += st.r * 1.8 * (ln.step || 1); const lim = vert ? W - 1 : H - 1; if (ln.p > lim || ln.p < 1) { ln.step = -(ln.step || 1); ln.p = clamp(ln.p, 1, lim); } }
        else { const ta = Math.atan2(dy, dx); h.a += clamp(Math.atan2(Math.sin(ta - h.a), Math.cos(ta - h.a)), -9 * dt, 9 * dt); moving = true; }
      }
    }
    if (moving) {
      const s = sp * dt;
      if (!moveTo(h, h.x + Math.cos(h.a) * s, h.y + Math.sin(h.a) * s)) {
        h.bump = (h.bump || 0) + dt;
        if (h.bump > 0.6) {
          h.bump = 0;
          if (h.k === 'goat') { h.tx = clamp(h.x + rnd(-14, 14), 1, W - 1); h.ty = clamp(h.y + rnd(-14, 14), 1, H - 1); h.t = 0; }
          else if (h.lane) { h.lane.d = -h.lane.d; h.lane.p += st.r * 1.8 * (h.lane.step || 1); h.lane.p = clamp(h.lane.p, 1, (h.k === 'doug' ? W : H) - 1); if (h.k === 'robot' && !SKIPPING && Math.random() < 0.3) say(h, 'hedge.'); }
        }
      }
      if (h.k !== 'goat') { const e = cut(h.x, h.y, st.r, h.a, h.k === 'robot' && h.st === 'lost'); earn(e * cvv, false); if (CT && !SKIPPING && Math.random() < 0.3) spawnClipAt(h.x, h.y, h.a, 1, false); }
    }
  }
}

function updObjects(dt) {
  // gnomes
  if (!gnome) {
    gnomeT -= dt;
    if (gnomeT <= 0) {
      const base = S.lawn < 5 ? S.lawn * 4 : 4 * ((Math.random() * 5) | 0); // your own lawn: retired gnomes from anywhere
      const ws = [0, 1, 2, 3].map(k => S.gnomes[base + k] ? 1 : 3);
      let r = Math.random() * ws.reduce((a, b) => a + b), k = 0; while (r > ws[k]) { r -= ws[k]; k++; }
      for (let tries = 0; tries < 20; tries++) {
        const x = rnd(3, W - 3), y = rnd(3, H - 3);
        if (type[(y | 0) * W + (x | 0)] === 0 && Math.hypot(x - P.x, y - P.y) > 10) { gnome = { x, y, id: base + k, life: 30 * (1 + 0.3 * pk('whistle')), t: 0 }; break; }
      }
      gnomeT = rnd(16, 28) / (1 + 0.4 * pk('whistle'));
    }
  } else {
    gnome.life -= dt; gnome.t += dt;
    if (gnome.life <= 0) gnome = null;
    else if (S.started && Math.hypot(gnome.x - P.x, gnome.y - P.y) < bladeR() + 1.2) collectGnome();
  }
  // golden grass patches
  goldT -= dt;
  if (goldT <= 0) {
    goldT = (S.lawn === 2 ? rnd(4, 7) : S.lawn === 8 ? rnd(6, 10) : rnd(30, 50)) / (1 + 0.7 * pk('golden'));
    let cx = rnd(3, W - 3), cy = rnd(3, H - 3); const rr = rnd(1.6, S.lawn === 2 || S.lawn === 8 ? 3.2 : 2.4);
    if (S.lawn === 8) { cx = W / 2 + rnd(-2, 2); cy = H / 2 + rnd(-2, 2); }
    for (let y = Math.floor(cy - rr); y <= cy + rr; y++) for (let x = Math.floor(cx - rr); x <= cx + rr; x++) {
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const i = y * W + x; if (type[i] !== 0) continue;
      if (Math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= rr) { type[i] = 1; gcut[i] = G - 1.5; grassFull = true; }
    }
  }
  // dog
  if (dog && S.started) {
    const d = Math.hypot(P.x - dog.x, P.y - dog.y);
    if (dog.st === 'sleep') {
      if (d < 7) { dog.warn += dt; if (dog.warn > 0.7) { dog.st = 'chase'; dog.t = 4.5; if (!SKIPPING) { play('gasp', 0.55); addPop(dog.x, dog.y - 2, 'woof', '#ffffff', 1); if (Math.random() < 0.5) note(pick(LAWN_NOTES[1])); } } }
      else dog.warn = Math.max(0, dog.warn - dt);
    } else if (dog.st === 'chase') {
      dog.t -= dt;
      const sp = Math.max(13.5, mowSpeed() * 0.78);
      const a = Math.atan2(P.y - dog.y, P.x - dog.x); dog.a = a;
      dog.x += Math.cos(a) * sp * dt; dog.y += Math.sin(a) * sp * dt;
      if (d < 1.4 + bladeR() * 0.4) {
        P.stun = 1.1 * hurt(); P.streak = 1; dog.st = 'home'; dog.warn = 0;
        if (!SKIPPING) { play('oof', 0.6); shake = 0.35; addPop(P.x, P.y - 1, 'chomp', '#ff7a59', 1.2); evt('dog_bite'); }
      } else if (dog.t <= 0) dog.st = 'home';
    } else {
      const dx = dog.hx - dog.x, dy = dog.hy - dog.y, dd = Math.hypot(dx, dy);
      if (dd < 0.4) { dog.st = 'sleep'; dog.warn = 0; }
      else { dog.a = Math.atan2(dy, dx); dog.x += dx / dd * Math.min(dd, 6 * dt); dog.y += dy / dd * Math.min(dd, 6 * dt); }
    }
  }
  // windmills (mini golf)
  millCD -= dt;
  if (layout.mills && S.started && P.stun <= 0 && millCD <= 0) {
    for (let k = 0; k < layout.mills.length; k++) {
      const m = layout.mills[k], mx = m.x * W, my = m.y * H, d = Math.hypot(P.x - mx, P.y - my);
      if (d < 1.6 || d > 6.2) continue;
      const pa = Math.atan2(P.y - my, P.x - mx), base = timeNow * 1.4 + k * 0.7;
      for (let b = 0; b < 4; b++) {
        let da = pa - (base + b * Math.PI / 2); da = Math.atan2(Math.sin(da), Math.cos(da));
        if (Math.abs(da) < 0.18) {
          P.stun = 0.7 * hurt(); millCD = 1.4; P.streak = 1;
          moveTo(P, P.x + Math.cos(pa) * 3, P.y + Math.sin(pa) * 3);
          if (!SKIPPING) { play('bonk', 0.55, 1.2); shake = 0.3; addPop(P.x, P.y - 1.5, 'windmilled', '#ff7a59', 1.2); }
          break;
        }
      }
    }
  }
  // wind gusts (roof)
  if (S.lawn === 7 && S.started) {
    gust.t -= dt;
    if (gust.ph === 'idle' && gust.t <= 0) { gust.ph = 'warn'; gust.t = 1.4; gust.a = rnd(0, TAU); }
    else if (gust.ph === 'warn' && gust.t <= 0) { gust.ph = 'blow'; gust.t = 2.4; if (!SKIPPING) play('whoosh', 0.55, 0.7); }
    else if (gust.ph === 'blow') {
      const f = 8 * hurt() * dt, gx2 = Math.cos(gust.a) * f, gy2 = Math.sin(gust.a) * f;
      moveTo(P, P.x + gx2, P.y + gy2);
      for (const h of helpers) moveTo(h, h.x + gx2 * 0.7, h.y + gy2 * 0.7);
      if (!SKIPPING) for (const q of parts) if (!q.home && !q.fall) { q.vx += Math.cos(gust.a) * 500 * dt; q.vy += Math.sin(gust.a) * 500 * dt; }
      if (gust.t <= 0) { gust.ph = 'idle'; gust.t = rnd(7, 12); }
    }
  } else gust.ph = 'idle';
  // rocks
  for (const k of rocks) {
    if (k.off > 0) { k.off -= dt; if (k.off <= 0) Object.assign(k, newRock()); continue; }
    if (S.started && Math.hypot(k.x - P.x, k.y - P.y) < k.r + bladeR() * 0.75) {
      P.sharp = Math.max(0.25, P.sharp - 0.22 * hurt()); k.off = 10; P.v *= 0.3;
      if (!SKIPPING) { play('bonk', 0.55); shake = 0.25; addPop(k.x, k.y - 1, 'blade dulled', '#ff7a59', 1); for (let i = 0; i < 8; i++) parts.push({ x: sx(k.x), y: sy(k.y), vx: rnd(-90, 90), vy: rnd(-90, 90), z: 0, vz: rnd(40, 120), life: 0.8, c: '#9aa0aa', s: 3 }); }
    }
  }
}
let tutT = 0;
function tutorial() {
  tutT += 1 / 60;
  if (S.tut === 0 && tutT > 1.5) { S.tut = 1; noteT = Math.max(noteT, 14); note('cut grass = <b>cash</b>. long grass pays more. keep cutting for a <b>streak</b>.'); }
  else if (S.tut === 1 && S.cash >= upCost('blade') && !lv('blade')) { S.tut = 2; noteT = Math.max(noteT, 14); note('you can afford <b>a wider blade</b>. ' + (wide ? 'it is on the right.' : 'tap <b>upgrades</b> down below.')); }
  else if (S.tut === 2 && S.owned === 1 && S.cash >= lawnCost(1) * 0.4) { S.tut = 3; noteT = Math.max(noteT, 14); note('the bar up top is your next lawn. <b>' + LAWNS[1].name + '</b> pays 5x.'); }
  else if (S.tut === 3 && S.owned >= 3 && compostFor() >= 1) { S.tut = 4; note('when the lawns run out, <b>sell</b> the business for compost. compost is forever.'); }
}
function immaculate() {
  immReady = false; immCount++;
  const bonus = Math.max(25, rateEMA * 25);
  earn(bonus, true);
  if (SKIPPING) return;
  play('yay', 0.27); shake = 0.15;
  addPop(W / 2, H * 0.45, 'immaculate lawn! +$' + fmt(bonus), '#ffd23f', 1.7);
  confetti(70);
  note(pick(['hoa: stripes approved. reluctantly.', 'linda: ok that is actually nice.', 'the grass: we will be back. (it is a threat.)', 'a passing golfer: wow.']));
  if (immCount === 1) evt('immaculate');
}
function fullLawn() {
  fullReady = false;
  const bonus = Math.max(100, rateEMA * 45);
  earn(bonus, true);
  if (SKIPPING) return;
  play('cheer', 0.3); setTimeout(() => play('tada', 0.7), 250); shake = 0.35;
  addPop(W / 2, H * 0.38, '100% mowed', '#f5f3ed', 2.2);
  addPop(W / 2, H * 0.5, '+$' + fmt(bonus), '#ffd23f', 1.9);
  confetti(150);
  for (let k = 0; k < 4; k++) rings.push({ x: VW / 2, y: VH / 2, c: k % 2 ? '#c5ff49' : '#b59aff', life: 0.5 + k * 0.15 });
  note(pick(['hoa: we have nothing to say. this has never happened.', 'linda: i am calling a realtor.', 'the grass: ...', 'doug: even i have not done this before.']));
  evt('full_lawn');
}
function confetti(n) {
  n = Math.min(n, Math.max(0, PMAX + 40 - parts.length));
  const cols = ['#c5ff49', '#b59aff', '#ffd23f', '#ff5d8f', '#4cc9f0', '#f5f3ed'];
  for (let i = 0; i < n; i++) parts.push({ fall: true, x: rnd(0, VW), y: rnd(-40, VH * 0.2), vx: rnd(-40, 40), vy: rnd(20, 120), z: 0, vz: 0, life: rnd(1.6, 2.6), c: pick(cols), s: rnd(3, 6) });
}
function addRing(x, y, c) { rings.push({ x: sx(x), y: sy(y), c, life: 0.5 }); }
function collectGnome() {
  const g = gnome; gnome = null;
  const first = !S.gnomes[g.id];
  S.gnomes[g.id] = (S.gnomes[g.id] | 0) + 1;
  const bonus = Math.max(10, rateEMA * 12) * (first ? 2 : 1);
  earn(bonus, true);
  if (SKIPPING) return;
  play('gnome', 0.75, rnd(0.95, 1.1));
  addPop(g.x, g.y - 2, (first ? 'new gnome! ' : 'gnome ') + '+$' + fmt(bonus), '#ffd23f', 1.4);
  for (let i = 0; i < 14; i++) parts.push({ x: sx(g.x), y: sy(g.y), vx: rnd(-140, 140), vy: rnd(-160, 40), z: 0, vz: rnd(60, 180), life: 1, c: pick(['#ffd23f', '#e63946', '#ffffff']), s: 4 });
  if (first) { S.newG = 1; note('gnome book: <b>' + GNOMES[g.id].n + '</b> (' + uniqueGnomes() + '/20, +3% cash each)'); evt('gnome_new', { id: g.id }); }
  dirtyUI = true;
}

/* ---------------- particles / pops ---------------- */
const sx = x => ox + x * cs, sy = y => oy + y * cs;
function spawnClippings(n, gold) { spawnClipAt(P.x, P.y, P.a, n, gold); }
const PMAX = 220; // particle cap (clippings, bills, confetti, puffs) so busy late lawns stay smooth on phones
function spawnClipAt(x, y, a, n, gold) {
  if (parts.length > PMAX - 40) return;
  const L0 = L();
  const moon = S.lawn === 3;
  for (let i = 0; i < n; i++) {
    const side = a + Math.PI / 2 + rnd(-0.6, 0.5); // discharge chute on the right
    const sp = rnd(60, 170) * Math.max(0.7, cs / 7);
    const c = gold ? pick(['#ffd23f', '#fff1a8', '#f0b400']) : `rgb(${L0.cl[0] + rnd(-30, 10) | 0},${L0.cl[1] + rnd(-30, 20) | 0},${L0.cl[2] + rnd(-20, 10) | 0})`;
    parts.push({ x: sx(x) + Math.cos(side) * cs, y: sy(y) + Math.sin(side) * cs, vx: Math.cos(side) * sp, vy: Math.sin(side) * sp, z: 0, vz: rnd(30, 110) * (moon ? 1.4 : 1), life: moon ? rnd(1.4, 2.4) : rnd(0.45, 0.9), c, s: gold ? 3.5 : rnd(2, 3.4), rot: rnd(0, 3), g: moon ? 25 : 320 });
  }
}
function addPop(x, y, t, c, sz) { if (pops.length > 26) pops.shift(); pops.push({ x: sx(x), y: sy(y), t, c, sz: sz || 1, life: 1.1 }); }
function say(h, t) { h.bub = t; h.bubT = 2.2; }

/* ---------------- render ---------------- */
function renderGrass() {
  const d = img.data, L0 = L(), W2 = W * 2;
  const [tr0, tg0, tb0] = L0.tall, [lr, lg, lb] = L0.cl, [dr, dg, db] = L0.cd, [pr, pg, pb] = L0.spec;
  const shimmer = timeNow * 5;
  // growth is slow, so untouched rows only refresh every 3rd frame; cut rows refresh at once
  grassPhase = (grassPhase + 1) % 3;
  for (let y = 0; y < H; y++) {
    if (!grassFull && !rowDirty[y] && y % 3 !== grassPhase) continue;
    rowDirty[y] = 0;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, t = type[i];
      let r, g, b, amp;
      if (t === 4) {
        const wc = L0.wall; r = wc[0]; g = wc[1]; b = wc[2]; amp = 10;
        if (y > 0 && type[i - W] !== 4) { r = r * 1.3 + 25; g = g * 1.3 + 25; b = b * 1.3 + 25; }
        else if (y < H - 1 && type[i + W] !== 4) { r *= 0.55; g *= 0.55; b *= 0.55; }
      }
      else if (t === 2) {
        r = pr; g = pg; b = pb; amp = 7;
        if (y > 0 && type[i - W] !== 2) { r *= 0.62; g *= 0.62; b *= 0.62; }       // shadowed top lip
        else if (y < H - 1 && type[i + W] !== 2) { r = r * 1.35 + 20; g = g * 1.35 + 20; b = b * 1.35 + 20; } // lit bottom rim
      }
      else {
        let h = G - gcut[i]; if (h > 1) h = 1;
        const s = SH[dir[i]];
        const cr = dr + (lr - dr) * s, cg = dg + (lg - dg) * s, cb = db + (lb - db) * s;
        let tr, tg, tb;
        const na = noiseA[i];
        if (t === 1) { const sh = Math.sin(shimmer + x * 0.7 + y * 0.5) * 22; tr = 242 + sh; tg = 196 + sh; tb = 40; }
        else { tr = tr0 + na * 16; tg = tg0 + na * 22; tb = tb0 + na * 10; }
        const k = h * h;
        r = cr + (tr - cr) * k; g = cg + (tg - cg) * k; b = cb + (tb - cb) * k;
        if (y > 0) { const j = i - W; if (type[j] !== 2) { let ha = G - gcut[j]; if (ha > 1) ha = 1; const df = ha - h; if (df > 0.3) { const f = 1 - df * 0.32; r *= f; g *= f; b *= f; } } }
        amp = 3 + 15 * k;
      }
      const p = (y * 2 * W2 + x * 2) * 4, q = i * 4;
      let n = noiseB[q] * amp; d[p] = r + n; d[p + 1] = g + n; d[p + 2] = b + n * 0.6; d[p + 3] = 255;
      n = noiseB[q + 1] * amp; d[p + 4] = r + n; d[p + 5] = g + n; d[p + 6] = b + n * 0.6; d[p + 7] = 255;
      const p2 = p + W2 * 4;
      n = noiseB[q + 2] * amp; d[p2] = r + n; d[p2 + 1] = g + n; d[p2 + 2] = b + n * 0.6; d[p2 + 3] = 255;
      n = noiseB[q + 3] * amp; d[p2 + 4] = r + n; d[p2 + 5] = g + n; d[p2 + 6] = b + n * 0.6; d[p2 + 7] = 255;
    }
  }
  grassFull = false;
  gx.putImageData(img, 0, 0);
}
let stars = null;
function render(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const L0 = L();
  ctx.fillStyle = L0.bg; ctx.fillRect(0, 0, VW, VH);
  if (S.lawn === 3) { // space
    if (!stars) { stars = []; for (let i = 0; i < 90; i++) stars.push([Math.random(), Math.random(), Math.random()]); }
    ctx.fillStyle = '#fff';
    for (const s of stars) { ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(timeNow * (0.5 + s[2]) + s[2] * 9)); ctx.fillRect(s[0] * VW, s[1] * VH, 1.5, 1.5); }
    ctx.globalAlpha = 1;
  }
  let shx = 0, shy = 0;
  if (shake > 0) { shake -= dt; shx = rnd(-4, 4) * shake * 3; shy = rnd(-4, 4) * shake * 3; }
  ctx.translate(shx, shy);
  // fence / edge
  const fw = W * cs, fh = H * cs;
  if (S.lawn === 4) {
    ctx.save(); ctx.beginPath(); ctx.rect(ox - 8, oy - 8, fw + 16, fh + 16); ctx.rect(ox, oy, fw, fh); ctx.clip('evenodd');
    ctx.fillStyle = '#ffd400'; ctx.fillRect(ox - 8, oy - 8, fw + 16, fh + 16);
    ctx.fillStyle = '#111'; ctx.font = 'bold 6px monospace';
    for (let k = -fh; k < fw + fh; k += 16) { ctx.beginPath(); ctx.moveTo(ox + k, oy - 8); ctx.lineTo(ox + k + 6, oy - 8); ctx.lineTo(ox + k + 6 - fh - 16, oy + fh + 8); ctx.lineTo(ox + k - fh - 16, oy + fh + 8); ctx.fill(); }
    ctx.restore();
  } else {
    ctx.fillStyle = L0.edge; ctx.fillRect(ox - 4, oy - 4, fw + 8, fh + 8);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(ox - 1, oy - 1, fw + 2, fh + 2);
  }
  renderGrass();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(gc, ox, oy, fw, fh);
  // features
  if (layout.flag) drawFlag(sx(layout.flag.x * W), sy(layout.flag.y * H));
  if (layout.chalk) {
    ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.lineWidth = Math.max(2, cs * 0.45); ctx.lineJoin = 'round';
    for (const poly of layout.chalk) { const pts = chalkPts(poly); ctx.beginPath(); pts.forEach((p, k) => k ? ctx.lineTo(sx(p[0]), sy(p[1])) : ctx.moveTo(sx(p[0]), sy(p[1]))); ctx.closePath(); ctx.stroke(); }
    // evidence markers
    const ms = [[0.3, 0.25], [0.72, 0.62], [0.24, 0.8]];
    ms.forEach((m, k) => drawMarker(sx(W * m[0]), sy(H * m[1]), k + 1));
  }
  for (const k of rocks) if (k.off <= 0) drawRock(sx(k.x), sy(k.y), k.r * cs, k.seed);
  if (layout.flags) layout.flags.forEach(f => drawFlag(sx(f.x * W), sy(f.y * H)));
  if (layout.mills) layout.mills.forEach((m, k) => drawMill(sx(m.x * W), sy(m.y * H), timeNow * 1.4 + k * 0.7));
  if (gnome) drawGnome(ctx, sx(gnome.x), sy(gnome.y) + Math.sin(gnome.t * 4) * 1.5, Math.max(22, cs * 3.4) * (SHOT ? 1.8 : 1), gnome.id, gnome.life < 5 ? (gnome.life * 4 % 1 > 0.5 ? 0.35 : 1) : 1, true);
  if (dog) drawDog();
  // at most 12 helpers get the full drawing each frame (dougs and robots first); extra goats get a cheap two-ellipse goat
  let nFull = 0;
  for (const k of ['doug', 'robot', 'goat']) for (const h of helpers) if (h.k === k) { if (nFull < 12) { drawHelper(h); nFull++; } else drawGoatLite(h); }
  if (S.started || SHOT) drawPlayer();
  // particles
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt; if (p.life <= 0) { parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
    if (p.home) {
      p.t += dt * 1.5;
      if (p.t >= 1) { parts[i] = parts[parts.length - 1]; parts.pop(); bumpCash(); continue; }
      if (p.t < 0) continue;
      const t = p.t, u = 1 - t, cx = (p.x0 + cashTarget.x) / 2 + 60, cy = Math.min(p.y0, cashTarget.y) - 40;
      p.x = u * u * p.x0 + 2 * u * t * cx + t * t * cashTarget.x; p.y = u * u * p.y0 + 2 * u * t * cy + t * t * cashTarget.y;
      ctx.globalAlpha = 1; ctx.fillStyle = '#1b5e20'; ctx.fillRect(p.x - 4, p.y - 2.5, 9, 6); ctx.fillStyle = p.c; ctx.fillRect(p.x - 4, p.y - 3, 8, 5);
      continue;
    }
    if (p.puff) {
      p.x += p.vx * dt; p.y += p.vy * dt; const k = p.life / p.max;
      ctx.globalAlpha = k * 0.4; ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s * (1 + (1 - k) * 1.8), 0, TAU); ctx.fill();
      continue;
    }
    if (p.fall) {
      p.vy += 240 * dt; p.x += p.vx * dt + Math.sin(timeNow * 6 + i) * 0.6; p.y += p.vy * dt;
      ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, p.s, p.s * (0.4 + 0.6 * Math.abs(Math.sin(timeNow * 8 + i))));
      continue;
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= (1 - 3 * dt); p.vy *= (1 - 3 * dt);
    p.vz -= (p.g || 320) * dt; p.z = Math.max(0, p.z + p.vz * dt); if (p.z === 0 && p.vz < 0) { p.vz = 0; p.vx *= 0.5; p.vy *= 0.5; }
    ctx.globalAlpha = Math.min(1, p.life * 3);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(p.x, p.y, p.s, p.s * 0.6);
    ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y - p.z, p.s, p.s * 1.4);
  }
  ctx.globalAlpha = 1;
  for (let i = rings.length - 1; i >= 0; i--) {
    const g = rings[i]; g.life -= dt; if (g.life <= 0) { rings.splice(i, 1); continue; }
    const k = 1 - g.life / 0.5;
    ctx.globalAlpha = 1 - k; ctx.strokeStyle = g.c; ctx.lineWidth = 4 * (1 - k) + 1;
    ctx.beginPath(); ctx.arc(g.x, g.y, 10 + k * 70, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // streak under the mower
  if (S.started && P.streak > 1.15 && !SHOT) {
    const hot = P.streak > 1.6;
    ctx.font = `900 ${hot ? 14 : 12}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ty = sy(P.y) + Math.max(18, bladeR() * cs * 1.2) + 8;
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(16,17,20,.8)'; ctx.strokeText('streak x' + P.streak.toFixed(1), sx(P.x), ty);
    ctx.fillStyle = hot ? '#ffd23f' : '#f5f3ed'; ctx.fillText('streak x' + P.streak.toFixed(1), sx(P.x), ty);
  }
  // gust warning + wind lines
  if (S.lawn === 7 && gust.ph !== 'idle') {
    ctx.save(); ctx.translate(VW / 2, VH / 2); ctx.rotate(gust.a);
    if (gust.ph === 'warn') {
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(timeNow * 10));
      ctx.fillStyle = '#f5f3ed'; ctx.beginPath(); ctx.moveTo(60, 0); ctx.lineTo(10, -30); ctx.lineTo(10, -12); ctx.lineTo(-60, -12); ctx.lineTo(-60, 12); ctx.lineTo(10, 12); ctx.lineTo(10, 30); ctx.closePath(); ctx.fill();
      ctx.rotate(-gust.a); ctx.font = '900 16px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#101114'; ctx.strokeText('gust incoming', 0, 52); ctx.fillText('gust incoming', 0, 52);
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2;
      const D = Math.hypot(VW, VH);
      for (let k = 0; k < 18; k++) { const off = ((timeNow * 900 + k * 173) % (D * 2)) - D, yy = ((k * 97) % D) - D / 2; ctx.beginPath(); ctx.moveTo(off, yy); ctx.lineTo(off + 70, yy); ctx.stroke(); }
    }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // pops
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = pops.length - 1; i >= 0; i--) {
    const p = pops[i]; p.life -= dt; if (p.life <= 0) { pops.splice(i, 1); continue; }
    const age = 1.1 - p.life, sc = age < 0.12 ? 0.6 + age / 0.12 * 0.55 : 1.15 - Math.min(0.15, (age - 0.12));
    const fs = Math.round(13 * p.sz * sc);
    ctx.font = `900 ${fs}px ui-monospace,Menlo,Consolas,monospace`;
    ctx.globalAlpha = Math.min(1, p.life * 2.5);
    const yy = p.y - age * 38;
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(16,17,20,.85)'; ctx.strokeText(p.t, p.x, yy);
    ctx.fillStyle = p.c; ctx.fillText(p.t, p.x, yy);
  }
  ctx.globalAlpha = 1;
  // bubbles
  let nBub = 0; for (const h of helpers) if (h.bubT > 0 && h.bub && nBub++ < 4) bubble(sx(h.x), sy(h.y) - Math.max(16, cs * 2.6), h.bub);
  // idle hint
  if (S.started && P.idle > 7 && !paused) {
    const a = 0.5 + 0.5 * Math.sin(timeNow * 5);
    ctx.strokeStyle = `rgba(197,255,73,${0.4 + a * 0.5})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx(P.x), sy(P.y), bladeR() * cs + 10 + a * 6, 0, TAU); ctx.stroke();
  }
  if (!S.started && !SHOT) {
    const a = 0.5 + 0.5 * Math.sin(timeNow * 4);
    drawPlayerAt(W / 2, H * 0.62, -Math.PI / 2);
    ctx.strokeStyle = `rgba(197,255,73,${0.5 + a * 0.5})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(sx(W / 2), sy(H * 0.62), bladeR() * cs + 12 + a * 8, 0, TAU); ctx.stroke();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function bubble(x, y, t) {
  ctx.font = '700 11px ui-monospace,Menlo,Consolas,monospace';
  const w = ctx.measureText(t).width + 12;
  const bx = clamp(x - w / 2, 2, VW - w - 2);
  ctx.fillStyle = 'rgba(255,255,255,.95)'; rr(ctx, bx, y - 11, w, 20, 8); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - 4, y + 9); ctx.lineTo(x + 4, y + 9); ctx.lineTo(x, y + 14); ctx.fill();
  ctx.fillStyle = '#101114'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, bx + w / 2, y);
}
function drawPlayer() { drawPlayerAt(P.x, P.y, P.a); }
function drawPlayerAt(px, py, a) {
  const x = sx(px), y = sy(py);
  const full = bladeR() * 2 * cs, size = clamp(full, 20, 54);
  const bob = P.v > 0.5 ? Math.sin(timeNow * 45) * 0.7 : 0;
  drawMower(ctx, x + bob, y - bob, a, size, '#e63946', '#c5ff49', P.stun > 0, full > size * 1.08 ? full : 0);
  if (S.lawn === 3 && P.sharp < 0.999 && S.started) { // blade meter
    ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(x - 16, y + size * 0.75, 32, 5);
    ctx.fillStyle = P.sharp > 0.6 ? '#c5ff49' : '#ff7a59'; ctx.fillRect(x - 16, y + size * 0.75, 32 * P.sharp, 5);
  }
}
function drawMower(c, x, y, a, size, body, cap, dizzy, deckW) {
  c.save(); c.translate(x, y); c.rotate(a);
  const Lg = size * 1.05, Wd = size;
  if (deckW) { // wide cutting deck out front, as wide as the blade really is
    const dp = size * 0.34, fx = Lg / 2 - 3;
    c.fillStyle = 'rgba(0,0,0,.25)'; rr(c, fx + 2, -deckW / 2 + 4, dp + 4, deckW, dp * 0.45); c.fill();
    c.strokeStyle = '#2b2d33'; c.lineWidth = Math.max(2, size * 0.08);
    c.beginPath(); c.moveTo(0, -Wd * 0.3); c.lineTo(fx + 2, -deckW * 0.3); c.moveTo(0, Wd * 0.3); c.lineTo(fx + 2, deckW * 0.3); c.stroke();
    c.fillStyle = '#3a3d45'; rr(c, fx, -deckW / 2, dp + 4, deckW, dp * 0.45); c.fill();
    c.fillStyle = body; c.fillRect(fx + dp + 1, -deckW / 2 + 2, 3, deckW - 4);
    const n = Math.max(2, Math.round(deckW / (dp * 1.5)));
    for (let k = 0; k < n; k++) {
      const cy = -deckW / 2 + (k + 0.5) * deckW / n, br = dp * 0.4;
      c.fillStyle = '#5b616d'; c.beginPath(); c.arc(fx + dp / 2 + 2, cy, br, 0, TAU); c.fill();
      const sa = timeNow * 30 + k; c.strokeStyle = '#c9ced6'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(fx + dp / 2 + 2 + Math.cos(sa) * br, cy + Math.sin(sa) * br); c.lineTo(fx + dp / 2 + 2 - Math.cos(sa) * br, cy - Math.sin(sa) * br); c.stroke();
    }
  }
  c.fillStyle = 'rgba(0,0,0,.28)'; rr(c, -Lg / 2 + 2, -Wd / 2 + 4, Lg, Wd, size * 0.22); c.fill();
  c.fillStyle = '#1b1b1f';
  const ww = size * 0.26, wh = size * 0.16;
  c.fillRect(Lg / 2 - ww - 1, -Wd / 2 - wh * 0.45, ww, wh); c.fillRect(Lg / 2 - ww - 1, Wd / 2 - wh * 0.55, ww, wh);
  c.fillRect(-Lg / 2 + 1, -Wd / 2 - wh * 0.45, ww, wh); c.fillRect(-Lg / 2 + 1, Wd / 2 - wh * 0.55, ww, wh);
  c.fillStyle = body; rr(c, -Lg / 2, -Wd / 2, Lg, Wd, size * 0.24); c.fill();
  c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, -Lg / 2 + 2, -Wd / 2 + 2, Lg - 4, Wd * 0.28, size * 0.14); c.fill();
  // chute on the right
  c.fillStyle = '#2b2d33'; c.fillRect(-size * 0.15, Wd / 2 - 2, size * 0.3, size * 0.16);
  // engine
  c.fillStyle = '#2b2d33'; c.beginPath(); c.arc(size * 0.06, 0, size * 0.27, 0, TAU); c.fill();
  c.fillStyle = '#6c7280'; c.beginPath(); c.arc(size * 0.06, 0, size * 0.15, 0, TAU); c.fill();
  // handle + driver
  c.strokeStyle = '#e9ecef'; c.lineWidth = Math.max(2, size * 0.07); c.lineCap = 'round';
  const hx = -Lg / 2 - size * 0.5;
  c.beginPath(); c.moveTo(-Lg / 2 + 2, -Wd * 0.32); c.lineTo(hx, -Wd * 0.26); c.moveTo(-Lg / 2 + 2, Wd * 0.32); c.lineTo(hx, Wd * 0.26); c.moveTo(hx, -Wd * 0.3); c.lineTo(hx, Wd * 0.3); c.stroke();
  if (cap) {
    const hr = Math.max(5, size * 0.2);
    c.fillStyle = '#2b2d33'; c.beginPath(); c.ellipse(hx - hr * 0.9, 0, hr * 0.8, hr * 1.5, 0, 0, TAU); c.fill(); // shoulders
    c.fillStyle = '#f1c27d'; c.beginPath(); c.arc(hx - hr * 0.9, 0, hr * 0.7, 0, TAU); c.fill();
    c.fillStyle = cap; c.beginPath(); c.arc(hx - hr * 0.9, 0, hr * 0.62, Math.PI * 0.5, Math.PI * 1.5); c.fill(); c.fillRect(hx - hr * 0.95, -hr * 0.5, hr * 0.7, hr);
  }
  c.restore();
  if (dizzy) { c.fillStyle = '#ffd23f'; c.font = '900 14px monospace'; c.textAlign = 'center'; for (let i = 0; i < 3; i++) { const t = timeNow * 6 + i * 2.1; c.fillText('*', x + Math.cos(t) * size * 0.6, y - size * 0.6 + Math.sin(t) * 4); } }
}
function drawGoatLite(h) {
  const x = sx(h.x), y = sy(h.y), s = Math.max(16, cs * 2.6), c = Math.cos(h.a), n = Math.sin(h.a);
  ctx.fillStyle = '#f8f9fa'; ctx.beginPath(); ctx.ellipse(x, y, s * 0.55, s * 0.33, h.a, 0, TAU); ctx.fill();
  ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.arc(x + c * s * 0.6, y + n * s * 0.6, s * 0.2, 0, TAU); ctx.fill();
}
function drawHelper(h) {
  const x = sx(h.x), y = sy(h.y), st = H_STATS[h.k];
  if (h.k === 'goat') {
    const s = Math.max(16, cs * 2.6);
    ctx.save(); ctx.translate(x, y); ctx.rotate(h.a);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(1, 3, s * 0.55, s * 0.33, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f8f9fa'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.55, s * 0.33, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.ellipse(-s * 0.1, 0, s * 0.25, s * 0.2, 0, 0, TAU); ctx.fill();
    const bob = h.st === 'eat' ? Math.sin(timeNow * 14) * 1.5 : 0;
    ctx.fillStyle = '#e9ecef'; ctx.beginPath(); ctx.ellipse(s * 0.6 + bob, 0, s * 0.24, s * 0.18, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(s * 0.5, -s * 0.12); ctx.lineTo(s * 0.38, -s * 0.3); ctx.moveTo(s * 0.5, s * 0.12); ctx.lineTo(s * 0.38, s * 0.3); ctx.stroke();
    ctx.fillStyle = '#212529'; ctx.beginPath(); ctx.arc(s * 0.66 + bob, -s * 0.08, 1.6, 0, TAU); ctx.arc(s * 0.66 + bob, s * 0.08, 1.6, 0, TAU); ctx.fill();
    ctx.restore();
  } else if (h.k === 'robot') {
    const s = Math.max(18, st.r * 2 * cs);
    ctx.save(); ctx.translate(x, y); ctx.rotate(h.a);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; rr(ctx, -s / 2 + 2, -s / 2 + 4, s, s, s * 0.3); ctx.fill();
    ctx.fillStyle = '#adb5bd'; rr(ctx, -s / 2, -s / 2, s, s, s * 0.3); ctx.fill();
    ctx.fillStyle = '#6c757d'; rr(ctx, -s * 0.32, -s * 0.32, s * 0.64, s * 0.64, s * 0.2); ctx.fill();
    const blink = h.st === 'think' ? (timeNow * 4 % 1 > 0.5) : true;
    ctx.fillStyle = h.st === 'go' ? '#38b000' : '#ff4d4d';
    if (blink) { ctx.beginPath(); ctx.arc(s * 0.28, 0, s * 0.1, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#4cc9f0'; ctx.fillRect(-s * 0.15, -s * 0.06, s * 0.3, s * 0.12);
    ctx.restore();
  } else {
    const fw = st.r * 2 * cs, sz = clamp(fw, 20, 48);
    drawMower(ctx, x, y, h.a, sz, '#3a86ff', '#f77f00', false, fw > sz * 1.08 ? fw : 0);
  }
}
function drawDog() {
  const x = sx(dog.x), y = sy(dog.y), s = Math.max(20, cs * 3.2);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(2, 4, s * 0.6, s * 0.45, 0, 0, TAU); ctx.fill();
  if (dog.st === 'sleep') {
    ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8b4513'; ctx.beginPath(); ctx.arc(s * 0.2, -s * 0.12, s * 0.26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5c2e0e'; ctx.beginPath(); ctx.ellipse(s * 0.38, -s * 0.28, s * 0.12, s * 0.2, 0.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3b1d08'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s * 0.12, -s * 0.12, 3, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff'; ctx.font = '900 12px monospace'; ctx.textAlign = 'center';
    const zt = timeNow % 2;
    ctx.globalAlpha = dog.warn > 0 ? 1 : 0.85;
    ctx.fillText(dog.warn > 0 ? '!?' : 'z', x + s * 0.5 + zt * 6, y - s * 0.5 - zt * 10);
    if (dog.warn <= 0) ctx.fillText('z', x + s * 0.5 + ((zt + 1) % 2) * 6, y - s * 0.5 - ((zt + 1) % 2) * 10);
    ctx.globalAlpha = 1;
    // wake ring
    ctx.strokeStyle = `rgba(255,122,89,${0.18 + dog.warn * 0.8})`; ctx.setLineDash([5, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 7 * cs, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  } else {
    ctx.rotate(dog.a);
    const leg = Math.sin(timeNow * 22) * s * 0.15;
    ctx.fillStyle = '#5c2e0e';
    ctx.fillRect(s * 0.15 + leg, -s * 0.35, s * 0.12, s * 0.16); ctx.fillRect(s * 0.15 - leg, s * 0.2, s * 0.12, s * 0.16);
    ctx.fillRect(-s * 0.35 - leg, -s * 0.35, s * 0.12, s * 0.16); ctx.fillRect(-s * 0.35 + leg, s * 0.2, s * 0.12, s * 0.16);
    ctx.fillStyle = '#a0522d'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.28, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8b4513'; ctx.beginPath(); ctx.arc(s * 0.55, 0, s * 0.24, 0, TAU); ctx.fill();
    ctx.restore();
    if (dog.st === 'chase') { ctx.fillStyle = '#ff4d4d'; ctx.font = '900 16px monospace'; ctx.textAlign = 'center'; ctx.fillText('!', x, y - s * 0.6); }
  }
}
function drawRock(x, y, r, seed) {
  r = Math.max(7, r);
  ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 3, r, r * 0.8, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#9aa0aa'; ctx.beginPath();
  for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, rr2 = r * (0.8 + 0.25 * Math.sin(seed * 50 + i * 2.3)); i ? ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2) : ctx.moveTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2); }
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#c9ced6'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU); ctx.fill();
}
function drawMill(x, y, a) {
  const L1 = Math.max(26, cs * 6);
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#7b2d26'; ctx.beginPath(); ctx.moveTo(-cs * 1.6, -cs * 1.4); ctx.lineTo(0, -cs * 2.8); ctx.lineTo(cs * 1.6, -cs * 1.4); ctx.closePath(); ctx.fill();
  ctx.rotate(a);
  for (let b = 0; b < 4; b++) {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(cs * 0.8 + 3, -cs * 0.55 + 4, L1 - cs * 0.8, cs * 1.1);
    ctx.fillStyle = b % 2 ? '#f5f3ed' : '#e63946'; ctx.fillRect(cs * 0.8, -cs * 0.55, L1 - cs * 0.8, cs * 1.1);
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.strokeRect(cs * 0.8, -cs * 0.55, L1 - cs * 0.8, cs * 1.1);
  }
  ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(0, 0, Math.max(4, cs * 0.7), 0, TAU); ctx.fill();
  ctx.restore();
}
function drawFlag(x, y) {
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 6, 4, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#f5f3ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 30); ctx.stroke();
  const w = Math.sin(timeNow * 4) * 2;
  ctx.fillStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(x, y - 30); ctx.lineTo(x + 16, y - 25 + w); ctx.lineTo(x, y - 20); ctx.fill();
}
function drawMarker(x, y, n) {
  ctx.fillStyle = '#ffd400'; ctx.beginPath(); ctx.moveTo(x - 7, y + 6); ctx.lineTo(x, y - 9); ctx.lineTo(x + 7, y + 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#111'; ctx.font = '900 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(n, x, y + 1);
}
function drawGnome(c, x, y, s, id, alpha, sparkle) {
  const g = GNOMES[id];
  c.save(); c.globalAlpha = alpha == null ? 1 : alpha; c.translate(x, y);
  if (sparkle) { const a = 0.5 + 0.5 * Math.sin(timeNow * 6); c.fillStyle = `rgba(255,236,120,${0.25 + a * 0.3})`; c.beginPath(); c.arc(0, -s * 0.2, s * 0.75, 0, TAU); c.fill(); }
  c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0, s * 0.42, s * 0.32, s * 0.1, 0, 0, TAU); c.fill();
  // body
  c.fillStyle = g.coat; rr(c, -s * 0.26, -s * 0.05, s * 0.52, s * 0.46, s * 0.14); c.fill();
  if (g.acc === 12) { c.fillStyle = '#212529'; c.fillRect(-s * 0.26, s * 0.12, s * 0.52, s * 0.06); }
  // boots
  c.fillStyle = '#5c3a21'; c.fillRect(-s * 0.24, s * 0.36, s * 0.2, s * 0.08); c.fillRect(s * 0.04, s * 0.36, s * 0.2, s * 0.08);
  // face
  c.fillStyle = '#f4c7a1'; c.beginPath(); c.arc(0, -s * 0.12, s * 0.17, 0, TAU); c.fill();
  // beard
  c.fillStyle = '#f8f9fa'; c.beginPath(); c.moveTo(-s * 0.18, -s * 0.1); c.quadraticCurveTo(0, s * 0.32, s * 0.18, -s * 0.1); c.quadraticCurveTo(0, -s * 0.02, -s * 0.18, -s * 0.1); c.fill();
  // nose
  c.fillStyle = '#e8998d'; c.beginPath(); c.arc(0, -s * 0.1, s * 0.055, 0, TAU); c.fill();
  // eyes
  c.fillStyle = '#212529';
  if (g.acc === 5) { c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * 0.07, -s * 0.18, s * 0.05, 0, TAU); c.arc(s * 0.07, -s * 0.18, s * 0.05, 0, TAU); c.fill(); c.fillStyle = '#212529'; c.beginPath(); c.arc(-s * 0.07, -s * 0.18, s * 0.022, 0, TAU); c.arc(s * 0.07, -s * 0.18, s * 0.022, 0, TAU); c.fill(); }
  else if (g.acc === 2 || g.acc === 12) { c.fillRect(-s * 0.15, -s * 0.21, s * 0.3, s * 0.06); }
  else if (g.acc === 11) { c.fillRect(-s * 0.17, -s * 0.22, s * 0.34, s * 0.07); c.fillStyle = '#fff'; c.fillRect(-s * 0.1, -s * 0.2, s * 0.04, s * 0.03); c.fillRect(s * 0.06, -s * 0.2, s * 0.04, s * 0.03); }
  else { c.fillRect(-s * 0.08, -s * 0.19, s * 0.035, s * 0.035); c.fillRect(s * 0.045, -s * 0.19, s * 0.035, s * 0.035); }
  if (g.acc === 12) { c.fillStyle = '#3b2a1e'; c.fillRect(-s * 0.1, -s * 0.06, s * 0.2, s * 0.04); }
  // hat
  c.fillStyle = g.hat; c.beginPath(); c.moveTo(-s * 0.2, -s * 0.2); c.quadraticCurveTo(0, -s * 0.85, s * 0.06, -s * 0.72); c.lineTo(s * 0.2, -s * 0.2); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,.25)'; c.beginPath(); c.moveTo(-s * 0.12, -s * 0.22); c.quadraticCurveTo(-s * 0.04, -s * 0.6, s * 0.04, -s * 0.7); c.lineTo(-s * 0.02, -s * 0.22); c.fill();
  if (g.acc === 4) { c.fillStyle = '#5c2e0e'; c.beginPath(); c.ellipse(-s * 0.22, -s * 0.3, s * 0.07, s * 0.14, -0.5, 0, TAU); c.ellipse(s * 0.22, -s * 0.3, s * 0.07, s * 0.14, 0.5, 0, TAU); c.fill(); }
  // accessories
  c.lineWidth = Math.max(1.5, s * 0.05); c.lineCap = 'round';
  if (g.acc === 1) { c.strokeStyle = '#8d6e63'; c.beginPath(); c.moveTo(s * 0.24, s * 0.15); c.lineTo(s * 0.55, -s * 0.5); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(s * 0.55, -s * 0.5); c.lineTo(s * 0.6, s * 0.1); c.stroke(); }
  if (g.acc === 3) { c.fillStyle = '#e63946'; c.fillRect(s * 0.22, s * 0.22, s * 0.26, s * 0.16); c.strokeStyle = '#ddd'; c.beginPath(); c.moveTo(s * 0.22, s * 0.25); c.lineTo(s * 0.1, s * 0.05); c.stroke(); }
  if (g.acc === 6) { c.strokeStyle = '#ced4da'; c.beginPath(); c.moveTo(s * 0.26, -s * 0.05); c.lineTo(s * 0.4, s * 0.42); c.lineTo(s * 0.52, s * 0.42); c.stroke(); }
  if (g.acc === 7) { c.fillStyle = '#ffd60a'; c.beginPath(); c.moveTo(s * 0.22, -s * 0.05); c.lineTo(s * 0.5, -s * 0.05); c.lineTo(s * 0.4, s * 0.15); c.lineTo(s * 0.32, s * 0.15); c.fill(); c.fillRect(s * 0.33, s * 0.15, s * 0.06, s * 0.12); }
  if (g.acc === 8) { c.strokeStyle = 'rgba(200,240,255,.9)'; c.lineWidth = 2; c.fillStyle = 'rgba(200,240,255,.25)'; c.beginPath(); c.arc(0, -s * 0.28, s * 0.42, 0, TAU); c.fill(); c.stroke(); }
  if (g.acc === 9) { c.strokeStyle = '#ddd'; c.beginPath(); c.moveTo(s * 0.3, s * 0.4); c.lineTo(s * 0.3, -s * 0.55); c.stroke(); c.fillStyle = '#c5ff49'; c.fillRect(s * 0.3, -s * 0.55, s * 0.3, s * 0.2); }
  if (g.acc === 10) { c.strokeStyle = '#6f4e37'; c.beginPath(); c.moveTo(s * 0.2, s * 0.1); c.lineTo(s * 0.34, -s * 0.05); c.stroke(); c.strokeStyle = '#adb5bd'; c.fillStyle = 'rgba(200,240,255,.5)'; c.beginPath(); c.arc(s * 0.42, -s * 0.14, s * 0.12, 0, TAU); c.fill(); c.stroke(); }
  c.restore();
}

/* ---------------- audio (real cc0 files only) ---------------- */
// call volumes levelled by measurement (ffmpeg ebur128 / rms, Nov 16): frequent sounds ~-21 to -25 LUFS, big moments ~-18.5, the mowing pop tick ~-29.
const FILES = {
  pop: 'sfx/pop.mp3', buy: 'sfx/buy.mp3', gnome: 'sfx/gnome.mp3', bonk: 'sfx/bonk.mp3', gasp: 'sfx/gasp.mp3',
  oof: 'sfx/oof.mp3', ding: 'sfx/ding.mp3', tada: 'sfx/tada.mp3', cheer: 'sfx/cheer.mp3', whoosh: 'sfx/whoosh.mp3',
  fail: 'sfx/fail.mp3', sting: 'sfx/sting.mp3', yay: 'sfx/yay.mp3',
};
const SND = {}; let audioOk = false, hostMuted = false, engine = null;
function initAudio() {
  for (const k in FILES) {
    if (k === 'engine') continue;
    SND[k] = { pool: [], i: 0 };
    for (let n = 0; n < (k === 'pop' ? 3 : 2); n++) { try { const a = new Audio(FILES[k]); a.preload = 'auto'; SND[k].pool.push(a); } catch (e) { } }
  }
  if (FILES.engine) try { engine = new Audio(FILES.engine); engine.loop = true; engine.preload = 'auto'; engine.volume = 0; } catch (e) { engine = null; }
}
const isMuted = () => S.muted || hostMuted;
function play(k, vol, rate) {
  if (!audioOk || isMuted() || SKIPPING || !SND[k]) return;
  const s = SND[k]; const a = s.pool[s.i++ % s.pool.length]; if (!a) return;
  try { a.pause(); a.currentTime = 0; a.volume = clamp(vol == null ? 1 : vol, 0, 1); a.playbackRate = rate || 1; if ('preservesPitch' in a) a.preservesPitch = false; const p = a.play(); if (p && p.catch) p.catch(() => { }); } catch (e) { }
}
function updEngine() {
  if (!engine || !audioOk) return;
  const on = !isMuted() && !paused && S.started && P.v > 0.5 && !document.hidden;
  try {
    if (on) { engine.volume = clamp(0.06 + 0.14 * (P.v / mowSpeed()), 0, 0.22); engine.playbackRate = 0.85 + 0.4 * (P.v / mowSpeed()); if (engine.paused) { const p = engine.play(); if (p && p.catch) p.catch(() => { }); } }
    else if (!engine.paused) engine.pause();
  } catch (e) { }
}
function unlockAudio() { if (audioOk) return; audioOk = true; }
function muteIcon() {
  const m = isMuted();
  $('#mute').innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${m ? '#7a8090' : '#c5ff49'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="${m ? 'none' : '#c5ff49'}"/>${m ? '<path d="M17 9l5 6M22 9l-5 6"/>' : '<path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/>'}</svg>`;
}

/* ---------------- ui ---------------- */
let tab = 'shop', dirtyUI = true, uiT = 0, wide = false, sheetOpen = false;
const app = $('#app');
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 10) return (Math.floor(n * 10) / 10).toFixed(n < 1 && n > 0 ? 2 : 1).replace(/\.0$/, '');
  if (n < 1000) return Math.floor(n) + '';
  const u = ['k', 'm', 'b', 't', 'qa', 'qi', 'sx', 'sp', 'oc', 'no', 'dc'];
  let i = -1; while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
}
function fmtTime(s) { s = Math.floor(s); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return h ? `${h}h ${m}m` : m ? `${m}m ${s % 60}s` : `${s}s`; }
function note(html) {
  const n = $('#note'); n.innerHTML = html; n.classList.remove('hide');
  clearTimeout(note._t); note._t = setTimeout(() => n.classList.add('hide'), 5200);
}
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 1800); }
function upEffect(id) {
  const l = lv(id);
  switch (id) {
    case 'blade': return `${(bladeR() * 2).toFixed(1)} → ${((1.6 + 0.3 * (l + 1)) * 2).toFixed(1)} cells wide`;
    case 'speed': return `${mowSpeed().toFixed(1)} → ${(13 + 1.15 * (l + 1)).toFixed(1)} lawn-mph`;
    case 'value': return `cash x${Math.pow(1.25, l).toFixed(2)} → x${Math.pow(1.25, l + 1).toFixed(2)}`;
    case 'sprinkler': return `regrows in ${(1 / growRate()).toFixed(1)}s → ${(1 / (growRate() / sprF(l) * sprF(l + 1))).toFixed(1)}s`;
    case 'goat': return l ? `goats: ${l}. they have formed a committee.` : 'goats: 0. tragic.';
    case 'robot': return l ? `robots: ${l}. at least one is "thinking".` : 'robots: 0.';
    case 'doug': return l ? `dougs: ${l}. all named doug.` : 'dougs: 0.';
    case 'whetstone': return `blade regrows ${(1.2 + 3 * l).toFixed(1)}%/s → ${(1.2 + 3 * (l + 1)).toFixed(1)}%/s`;
  }
  return '';
}
function iconCanvas(kind) {
  const c = document.createElement('canvas'); c.width = 80; c.height = 80; const g = c.getContext('2d'); g.scale(2, 2);
  g.lineCap = 'round'; g.lineJoin = 'round';
  switch (kind) {
    case 'blade': g.fillStyle = '#c5ff49'; g.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = i % 2 ? 9 : 15; i ? g.lineTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r) : g.moveTo(20 + Math.cos(a) * r, 20 + Math.sin(a) * r); } g.fill(); g.fillStyle = '#2a2e36'; g.beginPath(); g.arc(20, 20, 4, 0, TAU); g.fill(); break;
    case 'speed': g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(23, 5); g.lineTo(10, 22); g.lineTo(19, 22); g.lineTo(16, 35); g.lineTo(30, 17); g.lineTo(21, 17); g.closePath(); g.fill(); break;
    case 'value': g.fillStyle = '#4caf50'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(8 + i * 6, 34); g.lineTo(11 + i * 6, 14 + (i % 2) * 5); g.lineTo(14 + i * 6, 34); g.fill(); } g.fillStyle = '#c5ff49'; g.font = '900 16px monospace'; g.textAlign = 'center'; g.fillText('$', 20, 14); break;
    case 'sprinkler': g.fillStyle = '#4cc9f0'; [[12, 14], [26, 10], [20, 24], [30, 26], [10, 28]].forEach(p => { g.beginPath(); g.moveTo(p[0], p[1] - 6); g.quadraticCurveTo(p[0] + 4, p[1], p[0], p[1] + 3); g.quadraticCurveTo(p[0] - 4, p[1], p[0], p[1] - 6); g.fill(); }); break;
    case 'goat': drawHelperIcon(g, 'goat'); break;
    case 'robot': drawHelperIcon(g, 'robot'); break;
    case 'doug': drawMower(g, 22, 20, -Math.PI / 2, 18, '#3a86ff', '#f77f00', false); break;
    case 'whetstone': g.fillStyle = '#868e96'; g.save(); g.translate(20, 22); g.rotate(-0.4); rr(g, -14, -6, 28, 12, 4); g.fill(); g.restore(); g.fillStyle = '#fff'; g.font = '900 14px monospace'; g.fillText('✦', 24, 12); break;
    case 'lawn': break;
  }
  return c;
}
function drawHelperIcon(g, k) {
  if (k === 'goat') {
    g.fillStyle = '#f8f9fa'; g.beginPath(); g.ellipse(18, 22, 12, 8, 0, 0, TAU); g.fill();
    g.fillStyle = '#e9ecef'; g.beginPath(); g.ellipse(31, 18, 6, 5, 0, 0, TAU); g.fill();
    g.strokeStyle = '#8d6e63'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(29, 14); g.lineTo(26, 7); g.moveTo(33, 14); g.lineTo(35, 7); g.stroke();
    g.fillStyle = '#212529'; g.beginPath(); g.arc(32, 18, 1.4, 0, TAU); g.fill();
  } else {
    g.fillStyle = '#adb5bd'; rr(g, 6, 6, 28, 28, 8); g.fill(); g.fillStyle = '#6c757d'; rr(g, 12, 12, 16, 16, 5); g.fill();
    g.fillStyle = '#ff4d4d'; g.beginPath(); g.arc(28, 20, 3, 0, TAU); g.fill(); g.fillStyle = '#4cc9f0'; g.fillRect(16, 18, 8, 4);
  }
}
function lawnIcon(i) {
  const c = document.createElement('canvas'); c.width = 80; c.height = 80; const g = c.getContext('2d');
  const l = LAWNS[i];
  for (let k = 0; k < 5; k++) { const col = k % 2 ? l.cl : l.cd; g.fillStyle = `rgb(${col})`; g.fillRect(k * 16, 0, 16, 80); }
  g.fillStyle = `rgb(${l.tall})`; g.fillRect(0, 56, 80, 24);
  return c;
}
function gnomeCanvas(id, known) {
  const c = document.createElement('canvas'); c.width = 112; c.height = 112; const g = c.getContext('2d'); g.scale(2, 2);
  if (known) drawGnome(g, 28, 32, 40, id, 1, false);
  else { g.globalAlpha = 0.9; g.filter = 'brightness(0)'; drawGnome(g, 28, 32, 40, id, 0.25, false); }
  return c;
}
function canBuyUp(u) { return lv(u.id) < u.max && S.cash >= upCost(u.id); }
function visibleUps() { return UPS.filter(u => !u.req || S.owned > u.req || lv(u.id) > 0); }
function buildSheet() {
  const b = $('#sheetbody'); b.innerHTML = '';
  $('#sheettitle').textContent = { shop: 'upgrades', lawns: 'lawns', gnomes: 'gnome book', sell: 'sell the mower business' }[tab];
  if (tab === 'shop') {
    for (const u of visibleUps()) {
      const el = document.createElement('button'); el.className = 'item'; el.dataset.buy = u.id;
      el.innerHTML = `<div class="fill"></div><div class="ico"></div><div class="txt"><div class="nm">${u.name}<small></small></div><div class="ds">${u.ds}<br><span class="ef"></span></div></div><div class="pr"></div>`;
      el.querySelector('.ico').appendChild(iconCanvas(u.id));
      b.appendChild(el);
    }
    const next = UPS.find(u => u.req && !(S.owned > u.req) && !lv(u.id));
    if (next) { const s = document.createElement('div'); s.className = 'sec'; s.textContent = 'more upgrades show up on later lawns.'; b.appendChild(s); }
  } else if (tab === 'lawns') {
    LAWNS.forEach((l, i) => {
      const el = document.createElement('button'); el.className = 'item'; el.dataset.lawn = i;
      el.innerHTML = `<div class="fill"></div><div class="ico"></div><div class="txt"><div class="nm">${l.name}<small>x${fmt(l.mult)} cash</small></div><div class="ds">${l.gim}</div></div><div class="pr"></div>`;
      el.querySelector('.ico').appendChild(lawnIcon(i));
      b.appendChild(el);
    });
    const s = document.createElement('div'); s.className = 'sec'; s.innerHTML = 'your upgrades and helpers come with you. the grass does not.'; b.appendChild(s);
  } else if (tab === 'gnomes') {
    S.newG = 0;
    const s = document.createElement('div'); s.className = 'sec';
    s.innerHTML = `<b>${uniqueGnomes()}/20 found</b> · each one is +3% cash forever (even after you sell). 4 live on each lawn. they hide in long grass for about 30s.`;
    b.appendChild(s);
    const grid = document.createElement('div'); grid.className = 'gbook';
    GNOMES.forEach((g, i) => {
      const known = !!S.gnomes[i];
      const el = document.createElement('div'); el.className = 'gcard' + (known ? '' : ' unk');
      el.appendChild(gnomeCanvas(i, known));
      el.insertAdjacentHTML('beforeend', `<div class="gn">${known ? g.n : '???'}</div><div class="gx">${known ? 'x' + S.gnomes[i] : LAWNS[i >> 2].name.replace('a lawn that is also ', '')}</div>`);
      grid.appendChild(el);
    });
    b.appendChild(grid);
  } else if (tab === 'sell') {
    const c = compostFor();
    const more = compostMore(), capped = compostRaw() > compostCap();
    b.insertAdjacentHTML('beforeend', `<div class="sec">sell everything (cash, upgrades, helpers, lawns) for <b>compost</b>. every compost you ever earn is <b>+5% cash forever</b>, and you can spend it on perks below. gnomes stay.</div>
      <div class="sec">this business has earned <b>$${fmt(S.runEarned)}</b>. selling now gets <b id="cpnow">${c} compost</b>. ${capped ? 'that is doug\'s limit: he never pays more than ' + COMPOST_CAP + 'x your last sale (' + S.lastSale + ').' : 'the next one comes at $' + fmt(S.runEarned + more) + '.'}</div>
      <button class="big" id="sellbtn" ${c < 1 ? 'disabled' : ''}>${c < 1 ? 'earn $' + fmt(more) + ' more first' : 'sell for ' + c + ' compost'}</button>
      <div class="sec">compost: <b>${S.compostTotal}</b> earned (+${S.compostTotal * 5}% cash) · <b>${S.compost}</b> to spend</div>`);
    PERKS.forEach(p => {
      if (p.tier === 2 && p.id === 'nitro') b.insertAdjacentHTML('beforeend', '<div class="sec"><b>the back shed</b> · fancier compost perks. they stay forever.</div>');
      if (p.tier === 3) b.insertAdjacentHTML('beforeend', '<div class="sec"><b>the vault</b> · no max. for when you have too much compost.</div>');
      const l = pk(p.id), cost = p.cost(l), mx = l >= p.max;
      const el = document.createElement('button'); el.className = 'item' + (mx ? ' max' : S.compost >= cost ? '' : ' no'); el.dataset.perk = p.id;
      el.innerHTML = `<div class="txt"><div class="nm">${p.name}<small>lv ${l}</small></div><div class="ds">${p.ds}</div></div><div class="pr">${mx ? 'max' : cost + ' compost'}</div>`;
      b.appendChild(el);
    });
    b.insertAdjacentHTML('beforeend', `<div class="sec">businesses sold: <b>${S.prestiges}</b> · lifetime cash: <b>$${fmt(S.lifeEarned)}</b></div><div class="credit">mow money · computer cooked games</div>`);
  }
  dirtyUI = false; refreshUI(true);
}
function refreshUI(force) {
  $('#cash').textContent = '$' + fmt(S.cash);
  $('#rate').textContent = '$' + fmt(Math.max(0, rateEMA)) + '/s';
  // next goal pill
  const targets = [];
  let cu = null; for (const u of visibleUps()) if (lv(u.id) < u.max && (!cu || upCost(u.id) < upCost(cu.id))) cu = u;
  if (S.owned < maxLawns()) { const c = lawnCost(S.owned), sh = LAWNS[S.owned].short; targets.push({ tab: 'lawns', p: S.cash / c, r: S.cash >= c, t: S.cash >= c ? 'buy ' + sh + '!' : sh + ' unlocks at $' + fmt(c) }); }
  else { const c = compostFor(S.runEarned); if (c < 1) targets.push({ tab: 'sell', p: S.runEarned / COMPOST_DIV, r: false, t: 'sell the business at $' + fmt(COMPOST_DIV) + ' earned' }); else targets.push({ tab: 'sell', p: 1, r: c >= 8, t: 'sell for ' + c + ' compost' + (S.owned < LAWNS.length ? ' (unlocks ' + LAWNS[S.owned].short + ')' : '') }); }
  if (cu) { const c = upCost(cu.id); targets.push({ tab: 'shop', p: S.cash / c, r: S.cash >= c, t: S.cash >= c ? 'buy: ' + cu.name + '!' : 'next: ' + cu.name + ' $' + fmt(c) }); }
  let tg = targets.find(x => x.r && x.tab === 'lawns') || targets[Math.floor(timeNow / 3.5) % targets.length];
  goalTab = tg.tab;
  const gt = tg.t, gp = tg.p, ready = tg.r;
  $('#lawnname').textContent = (wide ? L().name : L().short) + (S.started ? ' · ' + Math.round(mowedFrac * 100) + '% mowed' : '');
  $('#goaltxt').textContent = gt; $('#goalfill').style.width = Math.min(100, gp * 100) + '%'; $('#goal').classList.toggle('ready', ready);
  // badges
  const anyUp = visibleUps().some(canBuyUp);
  const nextLawn = S.owned < maxLawns() && S.cash >= lawnCost(S.owned);
  const sellOn = compostFor(S.runEarned) >= Math.max(1, S.sellSeen + 1) && S.owned >= 3;
  setBadge('shop', anyUp); setBadge('lawns', nextLawn); setBadge('gnomes', !!S.newG); setBadge('sell', sellOn);
  if (S.started) {
    if (anyUp) { const cb = visibleUps().filter(canBuyUp).sort((a, b) => upCost(a.id) - upCost(b.id))[0]; nudgeIf('shop', !prevB.shop, 'buy! ' + cb.name); }
    if (nextLawn) nudgeIf('lawns', !prevB.lawns, 'new lawn!');
    if (S.newG) nudgeIf('gnomes', !prevB.gnomes, 'new gnome!');
    if (sellOn) nudgeIf('sell', !prevB.sell, 'sell for compost?');
  }
  prevB = { shop: anyUp, lawns: nextLawn, gnomes: !!S.newG, sell: sellOn };
  if (!wide && !sheetOpen && !force) return;
  const b = $('#sheetbody');
  if (tab === 'shop') {
    b.querySelectorAll('[data-buy]').forEach(el => {
      const id = el.dataset.buy, u = UPI[id], l = lv(id), mx = l >= u.max, c = upCost(id);
      el.classList.toggle('no', !mx && S.cash < c); el.classList.toggle('max', mx);
      el.querySelector('small').textContent = 'lv ' + l;
      el.querySelector('.pr').textContent = mx ? 'max' : '$' + fmt(c);
      el.querySelector('.ef').textContent = mx ? 'maxed. it cannot get more ' + u.name.replace(/^(a |more )/, '') + '.' : upEffect(id);
      el.querySelector('.fill').style.width = mx ? '0' : Math.min(100, S.cash / c * 100) + '%';
    });
  } else if (tab === 'lawns') {
    b.querySelectorAll('[data-lawn]').forEach(el => {
      const i = +el.dataset.lawn, own = i < S.owned, here = i === S.lawn, c = lawnCost(i);
      el.classList.toggle('here', here); el.classList.toggle('locked', i > S.owned);
      el.classList.toggle('no', !own && (i > S.owned || S.cash < c || (lawnReq(i) > S.prestiges)));
      el.querySelector('.pr').textContent = here ? 'you are here' : own ? 'go' : (lawnReq(i) > S.prestiges) ? 'sell ' + lawnReq(i) + 'x' : i === S.owned ? '$' + fmt(c) : 'locked';
      el.querySelector('.fill').style.width = !own && i === S.owned ? Math.min(100, S.cash / c * 100) + '%' : '0';
    });
  } else if (tab === 'sell') {
    const c = compostFor(), btn = $('#sellbtn');
    if (btn) { btn.disabled = c < 1; btn.textContent = c < 1 ? 'earn $' + fmt(compostMore()) + ' more first' : 'sell for ' + c + ' compost'; }
    const cp = $('#cpnow'); if (cp) cp.textContent = c + ' compost';
  }
}
let prevB = { shop: false, lawns: false, gnomes: false, sell: false }; const nudgeAt = {};
function nudgeIf(t, rising, text) {
  if (wide || (sheetOpen && tab === t)) return;
  const now = timeNow, lastT = nudgeAt[t] || -99;
  if (!(rising && now - lastT > 6) && !(now - lastT > 22)) return; // on the rising edge, then a reminder every ~22s
  nudgeAt[t] = now;
  const btn = document.querySelector(`#tabs [data-tab="${t}"]`), nd = $('#nudge'); if (!btn || !nd) return;
  nd.textContent = text;
  const r = btn.getBoundingClientRect(), pr = $('#panel').getBoundingClientRect();
  nd.style.left = clamp(r.left + r.width / 2 - pr.left, 70, pr.width - 70) + 'px';
  nd.classList.add('show'); btn.classList.remove('nudge'); void btn.offsetWidth; btn.classList.add('nudge');
  clearTimeout(nudgeIf._t); nudgeIf._t = setTimeout(() => { nd.classList.remove('show'); btn.classList.remove('nudge'); }, 2600);
}
function setBadge(t, on) { const e = document.querySelector(`#tabs [data-tab="${t}"] .badge`); if (e) e.classList.toggle('show', !!on); }
function openTab(t) {
  if (!wide && sheetOpen && tab === t) { closeSheet(); return; }
  tab = t; document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  if (!wide) { sheetOpen = true; app.classList.add('open'); }
  if (t === 'sell') S.sellSeen = Math.max(S.sellSeen, compostFor(S.runEarned));
  buildSheet(); play('whoosh', 0.25);
}
function closeSheet() { sheetOpen = false; app.classList.remove('open'); if (!wide) document.querySelectorAll('#tabs button').forEach(b => b.classList.remove('on')); }
function buyUp(id) {
  const u = UPI[id]; if (!u || lv(id) >= u.max) return false;
  const c = upCost(id); if (S.cash < c) return false;
  S.cash -= c; S.lvl[id] = lv(id) + 1;
  if (u.id === 'goat' || u.id === 'robot' || u.id === 'doug') {
    syncHelpers();
    if (!SKIPPING) {
      const h = helpers.filter(x => x.k === id).pop();
      if (h) { h.x = P.x + rnd(-3, 3); h.y = P.y + rnd(-3, 3); h.x = clamp(h.x, 1, W - 1); h.y = clamp(h.y, 1, H - 1); say(h, id === 'goat' ? 'meh' : id === 'robot' ? 'hello. i will try' : "i've done this before"); }
      if (id === 'robot' && !robotNoteDone) { robotNoteDone = true; note('hoa: the robot has been reported. twice.'); }
      if (lv(id) === 1) evt('hire_' + id);
    }
  }
  if (!SKIPPING) {
    play('buy', 0.4, rnd(0.95, 1.08));
    addPop(P.x, P.y - 2, u.name + '!', '#b59aff', 1); addRing(P.x, P.y, '#b59aff');
    const el = document.querySelector(`[data-buy="${id}"]`); if (el) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
    bumpCash();
  }
  dirtyUI = true;
  return true;
}
function buyLawn(i) {
  if (i < S.owned) { if (i !== S.lawn) goLawn(i); return true; }
  if (i !== S.owned || i >= maxLawns()) return false;
  const c = lawnCost(i); if (S.cash < c) return false;
  S.cash -= c; S.owned++;
  goLawn(i);
  if (!SKIPPING) { play('tada', 0.7); confetti(90); addPop(W / 2, H * 0.4, 'new lawn! cash x' + LAWNS[i].mult, '#c5ff49', 1.6); evt('lawn_' + LAWNS[i].id, { t: Math.round(S.playT) }); }
  return true;
}
function goLawn(i) {
  S.lawn = i; stars = null;
  setupGrid(true); resetLawnObjects();
  $('#lawnname').textContent = LAWNS[i].name;
  if (!SKIPPING) { note('<b>' + LAWNS[i].name + '</b>: ' + LAWNS[i].gim); play('whoosh', 0.4); if (i === 4) setTimeout(() => play('sting', 0.7), 300); if (!wide) closeSheet(); }
  dirtyUI = true; save();
}
function buyPerk(id) {
  const p = PERKS.find(x => x.id === id); const l = pk(id); if (l >= p.max) return;
  const c = p.cost(l); if (S.compost < c) return;
  S.compost -= c; S.perks[id] = l + 1; play('buy', 0.4); dirtyUI = true; save();
}
function bumpCash() { const c = $('#cash'); c.classList.add('bump'); setTimeout(() => c.classList.remove('bump'), 90); }

/* ---------------- prestige + end card ---------------- */
function sellBusiness(fromTest) {
  const c = compostFor(S.runEarned);
  if (c < 1 && !fromTest) return;
  const runStats = { earned: S.runEarned, t: S.playT, lawn: S.owned, gnomes: uniqueGnomes(), compost: c };
  // the board score is cumulative (lifetime cash, all sales), so the duration is lifetime too: all play time plus paid offline time
  try { window.cc && cc.end({ score: Math.max(1, boardScore(S.prestiges + 1)), durationMs: Math.round(S.lifeT * 1000), completed: true }); } catch (e) { }
  evt('sold_business', { compost: c, n: S.prestiges + 1 });
  S.compost += c; S.compostTotal += c; S.prestiges++; if (c > 0) S.lastSale = c;
  newRun();
  if (!fromTest) showEndCard(runStats);
}
function newRun() {
  const st = pk('start');
  S.cash = st ? 50 * Math.pow(12, st) : 0; S.runEarned = 0; S.playT = 0; S.offT = 0; S.lvl = {}; S.sellSeen = 0;
  if (st) { S.lvl.blade = st * 2; S.lvl.speed = st * 2; }
  S.owned = 1; helpers = []; syncHelpers(); evCount = 0;
  S.lawn = 0; goLawn(0); rateEMA = 0; rateH = 0;
  ccStart();
  dirtyUI = true; save();
}
function drawCard(st) {
  const c = document.createElement('canvas'); c.width = 1200; c.height = 630; const g = c.getContext('2d');
  for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#7fcf5c' : '#5aa846'; g.fillRect(i * 100, 0, 100, 630); }
  g.fillStyle = 'rgba(16,17,20,.82)'; rr(g, 50, 50, 1100, 530, 36); g.fill();
  g.fillStyle = '#c5ff49'; g.font = '900 64px ui-monospace,Menlo,Consolas,monospace'; g.textBaseline = 'top';
  g.fillText('i sold my mower business', 100, 95);
  g.fillStyle = '#f5f3ed'; g.font = '800 40px ui-monospace,Menlo,Consolas,monospace';
  const lines = [
    `$${fmt(st.earned)} worth of lawn`,
    `in ${fmtTime(st.t)} of mowing`,
    `furthest lawn: ${LAWNS[st.lawn - 1].short}`,
    `gnomes found: ${st.gnomes}/20`,
    `paid in: ${st.compost} compost`,
  ];
  lines.forEach((t, i) => g.fillText(t, 100, 200 + i * 56));
  drawMower(g, 1010, 260, -0.6, 110, '#e63946', '#c5ff49', false);
  drawGnome(g, 1010, 450, 120, 3, 1, false);
  g.fillStyle = '#b59aff'; g.font = '700 30px ui-monospace,Menlo,Consolas,monospace';
  g.fillText('mow money · computercooked.com/games/mow-money', 100, 515);
  return c;
}
function showEndCard(st) {
  play('cheer', 0.3);
  const card = drawCard(st);
  const text = `i mowed $${fmt(st.earned)} of lawn in ${fmtTime(st.t)} and sold the business for ${st.compost} compost. computercooked.com/games/mow-money`;
  showModal(`<h2>business sold.</h2><p>the buyer is a guy named doug. he says he has done this before. you got <b>${st.compost} compost</b> (+${st.compost * 5}% cash forever).${S.prestiges === 1 ? ' also: <b>your own lawn, finally</b> is now for sale.' : ''}</p>
    <img id="cardimg" alt="result card" src="${card.toDataURL('image/png')}">
    <div class="row2"><button class="big alt" id="sharebtn">share</button><button class="big" id="againbtn">mow again</button></div>
    <div id="tipslot"></div>`);
  $('#sharebtn').onclick = () => share(card, text);
  $('#againbtn').onclick = () => { hideModal(); if (!wide) closeSheet(); else buildSheet(); };
  try { window.ccTip && ccTip.mount($('#tipslot'), { game: 'mow-money', slot: 'game-over' }); } catch (e) { }
}
async function share(card, text) {
  try {
    if (navigator.share) {
      let files;
      try { const blob = await new Promise(r => card.toBlob(r, 'image/png')); files = [new File([blob], 'mow-money.png', { type: 'image/png' })]; } catch (e) { }
      if (files && navigator.canShare && navigator.canShare({ files })) await navigator.share({ text, files });
      else await navigator.share({ text });
      return;
    }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('copied. go brag.'); } catch (e) { toast('could not copy. tell them yourself.'); }
}
function showModal(html) { $('#modalbox').innerHTML = html; $('#modal').classList.remove('hide'); paused = true; }
function hideModal() { $('#modal').classList.add('hide'); paused = false; last = performance.now(); }

/* ---------------- analytics ---------------- */
let ccStarted = false;
function ccStart() { try { window.cc && cc.start(); } catch (e) { } ccStarted = true; }
// the leaderboard score is bounded (it stays in the thousands): 100 per power of ten of lifetime cash, plus 500 per sale.
// the end card and share text keep the big cash number; only cc.score / cc.end use this.
const boardScore = sales => Math.round(100 * Math.log10(Math.max(0, S.lifeEarned) + 1)) + 500 * sales;
function evt(name, data) { if (evCount >= 18 || SKIPPING) return; evCount++; try { window.cc && cc.event(name, data || {}); } catch (e) { } }

/* ---------------- input ---------------- */
function toCell(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - ox) / cs, y: (e.clientY - r.top - oy) / cs }; }
function startMowing() {
  if (S.started) return;
  S.started = true; P.x = W / 2; P.y = H * 0.62;
  $('#intro').classList.add('gone'); introGone = true;
  ccStart();
}
let dragging = false;
cv.addEventListener('pointerdown', e => {
  unlockAudio();
  if (paused && !$('#modal').classList.contains('hide')) return;
  if (paused) { setPaused(false); return; }
  if (!wide && sheetOpen) closeSheet();
  startMowing();
  dragging = true; try { cv.setPointerCapture(e.pointerId); } catch (er) { }
  const p = toCell(e); target = { x: clamp(p.x, 0.6, W - 0.6), y: clamp(p.y, 0.6, H - 0.6), follow: e.pointerType === 'mouse' };
  e.preventDefault();
});
cv.addEventListener('pointermove', e => {
  if (!S.started && e.pointerType === 'mouse' && paused === false && $('#modal').classList.contains('hide')) startMowing();
  if (dragging || (e.pointerType === 'mouse' && S.started)) {
    const p = toCell(e); target = { x: clamp(p.x, 0.6, W - 0.6), y: clamp(p.y, 0.6, H - 0.6), follow: e.pointerType === 'mouse' };
  }
});
const endDrag = e => { dragging = false; if (target) target.follow = false; };
cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);
cv.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse' && !dragging) target = null; });
const KMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
addEventListener('keydown', e => {
  unlockAudio();
  if (KMAP[e.code]) { keys[KMAP[e.code]] = true; if (!$('#modal').classList.contains('hide')) return; if (paused) setPaused(false); startMowing(); e.preventDefault(); return; }
  if (e.code === 'KeyM') toggleMute();
  else if (e.code === 'KeyU') openTab('shop');
  else if (e.code === 'KeyL') openTab('lawns');
  else if (e.code === 'KeyG') openTab('gnomes');
  else if (e.code === 'Escape') { if (!wide) closeSheet(); }
  else if (e.code === 'KeyP') setPaused(!paused);
});
addEventListener('keyup', e => { if (KMAP[e.code]) keys[KMAP[e.code]] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
$('#tabs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { unlockAudio(); openTab(b.dataset.tab); } });
$('#sheetclose').addEventListener('click', closeSheet);
let goalTab = 'shop';
$('#goal').addEventListener('click', () => { unlockAudio(); openTab(goalTab); });
$('#sheetbody').addEventListener('click', e => {
  unlockAudio();
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.buy) { if (!buyUp(b.dataset.buy)) { play('fail', 0.25, 1.4); } else refreshUI(true); if (dirtyUI && b.dataset.buy && visibleUps().length !== $('#sheetbody').querySelectorAll('[data-buy]').length) buildSheet(); }
  else if (b.dataset.lawn) { buyLawn(+b.dataset.lawn); buildSheet(); }
  else if (b.dataset.perk) { buyPerk(b.dataset.perk); buildSheet(); }
  else if (b.id === 'sellbtn') {
    const c = compostFor(S.runEarned);
    showModal(`<h2>sell the business?</h2><p>you get <b>${c} compost</b>. you lose your cash, upgrades, helpers and lawns. the goats will be rehomed. gnomes stay.</p><div class="row2"><button class="big ghost" id="nobtn">keep mowing</button><button class="big" id="yesbtn">sell it</button></div>`);
    $('#nobtn').onclick = hideModal;
    $('#yesbtn').onclick = () => { hideModal(); sellBusiness(false); };
  }
});
$('#mute').addEventListener('click', () => { unlockAudio(); toggleMute(); });
function toggleMute() { S.muted = !S.muted; muteIcon(); updEngine(); save(); }
function setPaused(p) { paused = p; $('#pausecover').classList.toggle('hide', !p || !$('#modal').classList.contains('hide')); if (!p) last = performance.now(); updEngine(); }
$('#pausecover').addEventListener('pointerdown', () => setPaused(false));

addEventListener('message', e => {
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') { hostMuted = !!d.muted; muteIcon(); updEngine(); }
  else if (d.type === 'cc-pause') { setPaused(d.paused === undefined ? true : !!d.paused); }
  else if (d.type === 'cc-restart') {
    // incremental game: restart = fresh lawn, keep progress (a wipe would be cruel)
    hideModal(); setPaused(false); goLawn(S.lawn); ccStart();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); hiddenAt = Date.now(); updEngine(); }
  else if (hiddenAt && Date.now() - hiddenAt > 60000) { offline(Date.now() - hiddenAt); hiddenAt = 0; }
  else if (hiddenAt) { offline(Date.now() - hiddenAt, true); hiddenAt = 0; } // a short switch-away: paid quietly
});
let hiddenAt = 0;
addEventListener('pagehide', save);

function offline(ms, quiet) {
  const secs = Math.min(offCap(), ms / 1000);
  const gain = (S.offRate || 0) * secs;
  if (quiet) { if (gain > 0 && S.started) { earn(gain, false); S.offT = (S.offT || 0) + secs; S.lifeT += secs; G += secs * growRate(); } return; }
  if (gain < 1 || secs < 30) return;
  earn(gain, false); S.offT = (S.offT || 0) + secs; S.lifeT += secs;
  G += secs * growRate(); // the lawn grows back while you're away
  const who = lv('doug') ? 'doug' : lv('robot') ? 'the robot' : lv('goat') ? 'the goats' : 'the lawn, somehow,';
  showModal(`<h2>welcome back.</h2><p>you were gone <b>${fmtTime(ms / 1000)}</b>${ms / 1000 > offCap() ? ' (the shed only holds ' + fmtTime(offCap()) + ')' : ''}. ${who} kept going and made <b>$${fmt(gain)}</b>.</p><button class="big" id="okbtn">collect</button>`);
  $('#okbtn').onclick = () => { hideModal(); play('buy', 0.5); bumpCash(); };
  play('ding', 0.5);
}

/* ---------------- layout ---------------- */
function relayout() {
  const w = innerWidth, h = innerHeight;
  const nw = w >= 760 && h >= 380;
  if (nw !== wide) { wide = nw; app.classList.toggle('wide', wide); if (wide) { sheetOpen = true; app.classList.remove('open'); document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); buildSheet(); } else closeSheet(); }
  stageSize(); setupGrid(false);
  try { const cr = $('#cash').getBoundingClientRect(), st = $('#stage').getBoundingClientRect(); cashTarget = { x: cr.left + cr.width / 2 - st.left, y: cr.top + cr.height / 2 - st.top }; } catch (e) { }
}
addEventListener('resize', () => { clearTimeout(relayout._t); relayout._t = setTimeout(relayout, 60); });

/* ---------------- loop ---------------- */
let workMs = 0, last = performance.now(), saveT = 0, fpsN = 0, fpsT = 0, fps = 60, scoreT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  if (document.hidden) { last = now; return; } // hidden: skip all work (the time away is paid on return)
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
  fpsN++; fpsT += dt; if (fpsT >= 1) { fps = fpsN / fpsT; fpsN = 0; fpsT = 0; }
  const t0 = performance.now();
  if (!paused && !SHOT) update(dt);
  render(paused || SHOT ? 0 : dt);
  workMs += (performance.now() - t0 - workMs) * 0.05;
  if (SHOT) return;
  uiT -= dt;
  if (uiT <= 0) { uiT = 0.2; if (dirtyUI && (wide || sheetOpen)) buildSheet(); else refreshUI(false); }
  updEngine();
  saveT += dt; if (saveT > 5) { saveT = 0; save(); }
  scoreT += dt; if (scoreT > 5 && S.started) { scoreT = 0; try { window.cc && cc.score(boardScore(S.prestiges)); } catch (e) { } }
}

/* ---------------- test hooks ---------------- */
function skip(secs) {
  SKIPPING = true; autopilot = true; S.started = true; introGone = true; $('#intro').classList.add('gone');
  const dt = 0.1; let t = 0; const logBuys = __log;
  while (t < secs) {
    update(dt); t += dt;
    if (autoBuy && (Math.round(t / dt) % 5 === 0)) {
      // sensible greedy play: next lawn if affordable, else the cheapest affordable upgrade
      if (S.owned < maxLawns() && S.cash >= lawnCost(S.owned)) { buyLawn(S.owned); logBuys.push([Math.round(S.playT), 'lawn' + S.owned]); }
      let best = null;
      for (const u of visibleUps()) if (lv(u.id) < u.max && (!best || upCost(u.id) < upCost(best.id))) best = u;
      // save up for the next lawn if it is close
      const nl = S.owned < maxLawns() ? lawnCost(S.owned) : Infinity;
      if (best && S.cash >= upCost(best.id) && !(nl < upCost(best.id) * 6 && S.cash < nl)) { buyUp(best.id); logBuys.push([Math.round(S.playT), best.id]); }
      else if (best && S.cash >= upCost(best.id) && S.cash - upCost(best.id) > nl * 0.5) { buyUp(best.id); logBuys.push([Math.round(S.playT), best.id]); }
    }
  }
  SKIPPING = false; autopilot = false; dirtyUI = true;
  return S.cash;
}
let autoBuy = false; const __log = [];
if (TEST) {
  window.__mm = {
    state: () => ({ score: boardScore(S.prestiges), lastSale: S.lastSale, lifeT: S.lifeT, cash: S.cash, runEarned: S.runEarned, lifeEarned: S.lifeEarned, playT: S.playT, lvl: Object.assign({}, S.lvl), lawn: S.lawn, owned: S.owned, compost: S.compost, compostTotal: S.compostTotal, prestiges: S.prestiges, gnomes: uniqueGnomes(), rate: rateEMA, rateH, fps, W, H, cs, cellVal: cellVal(), compostNow: compostFor(S.runEarned), parts: parts.length, imm: immCount, mowed: mowedFrac, workMs, stripes, goal: document.querySelector('#goaltxt').textContent, paused, muted: isMuted() }),
    cash: n => { S.cash += n; S.runEarned += n; S.lifeEarned += n; dirtyUI = true; return S.cash; },
    lawn: n => { S.owned = Math.max(S.owned, n + 1); goLawn(n); return S.lawn; },
    prestige: () => { const c = compostFor(S.runEarned); sellBusiness(true); return c; },
    sellCard: () => showEndCard({ earned: S.runEarned || 1234567, t: S.playT || 960, lawn: S.owned, gnomes: uniqueGnomes(), compost: compostFor(S.runEarned) || 7 }),
    skip, buy: id => buyUp(id), buyLawn: i => buyLawn(i), autobuy: on => { autoBuy = !!on; }, log: () => __log.slice(),
    offline: secs => offline(secs * 1000), perk: (id, n) => { S.perks[id] = n; },
    wipe: () => { S = fresh(); helpers = []; goLawn(0); },
    auto: on => { autopilot = !!on; startMowing(); AP.y = 1.5; },
    tab: t => openTab(t), gnome: () => { gnomeT = 0; updObjects(0.01); return gnome && gnome.id; },
  };
}

/* ---------------- shot mode (cover image) ---------------- */
function setupShot() {
  app.classList.add('shot');
  $('#hud').classList.add('hide'); $('#panel').classList.add('hide'); $('#intro').classList.add('hide');
  stageSize(); setupGrid(true);
  S.lvl = { blade: 9, goat: 1 }; S.lawn = 0; S.started = true;
  resetLawnObjects();
  // mow lanes: alternating stripes over most of the lawn, last lane half done
  const r = bladeR(), lane = r * 2 * 0.95;
  let y = r, d = 1, k = 0;
  G = 10;
  while (y < H * 0.6) {
    for (let x = 0; x < W; x += 0.4) cut(d > 0 ? x : W - x, y, r, d > 0 ? 0 : Math.PI, false);
    y += lane; d = -d; k++;
  }
  G = 10.02;
  // partial pass
  const py = y; for (let x = 0; x < W * 0.55; x += 0.4) cut(x, py, r, 0, false);
  P.x = W * 0.55; P.y = py; P.a = 0;
  // goat in the uncut patch, gnome peeking
  syncHelpers(); helpers.forEach(h => { h.x = W * 0.82; h.y = H * 0.93; h.a = Math.PI; h.st = 'eat'; });
  gnome = { x: W * 0.8, y: H * 0.18, id: 3, life: 30, t: 0.4 };
  // clippings flying out the side + pops
  for (let i = 0; i < 70; i++) {
    const side = Math.PI / 2 + rnd(-0.9, 0.6), dist = rnd(cs * 4, cs * 4 + 70);
    parts.push({ x: sx(P.x) + Math.cos(side) * dist - rnd(0, 20), y: sy(P.y) + Math.sin(side) * dist, vx: 0, vy: 0, z: rnd(0, 26), vz: 0, life: 9e9, c: `rgb(${120 + rnd(-30, 20) | 0},${205 + rnd(-30, 20) | 0},${90 + rnd(-20, 10) | 0})`, s: rnd(2.5, 4.5), g: 0 });
  }
  pops.push({ x: sx(P.x) - 10, y: sy(P.y) - 34, t: '+$1.2k', c: '#ffd23f', sz: 1.9, life: 1.0 });
  pops.push({ x: sx(W * 0.28), y: sy(py) - 60, t: '+$380', c: '#c5ff49', sz: 1.3, life: 0.9 });
  // freeze the pops at their pretty size
  const _r = render;
  timeNow = 0.4;
  _r(0);
  // big title
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  const fs = Math.min(VW * 0.13, VH * 0.2);
  ctx.font = `900 ${fs}px ui-monospace,Menlo,Consolas,monospace`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.lineWidth = fs * 0.14; ctx.strokeStyle = '#101114'; ctx.lineJoin = 'round';
  ctx.strokeText('mow money', VW * 0.06, VH * 0.07); ctx.fillStyle = '#c5ff49'; ctx.fillText('mow money', VW * 0.06, VH * 0.07);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* ---------------- boot ---------------- */
load();
if (TEST && Q.get('fresh') === '1') S = fresh();
initAudio(); muteIcon();
relayout();
if (!wide) closeSheet();
syncHelpers();
resetLawnObjects();
$('#lawnname').textContent = L().name;
if (S.started) { $('#intro').classList.add('gone'); introGone = true; ccStart(); }
if (S.t && !SHOT) { const away = Date.now() - S.t; if (away > 60000) offline(away); }
if (SHOT) { setupShot(); const once = () => { }; requestAnimationFrame(once); }
else requestAnimationFrame(t => { last = t; frame(t); });
})();
