/* reel weird — computer cooked games. a 60-second fishing run in a cursed pond: cast far for weirder stuff,
   hook on the real bite, reel without snapping the line, fill the book. vanilla js + canvas, no deps, all art
   drawn in code (16x16 pixel sprites with an auto outline). */
(() => {
  'use strict';

  // ---------- palette / constants ----------
  const COL = {
    carbon: '#101114', lime: '#C5FF49', lilac: '#B59AFF', paper: '#F5F3ED', dim: 'rgba(245,243,237,0.6)',
    red: '#ff5a5a', gold: '#ffd84a', beige: '#D8CBA6', sky1: '#171230', sky2: '#26304d', water1: '#173b4c', water2: '#06111a'
  };
  const FONT = 'ui-monospace,"SF Mono",Menlo,Consolas,"Courier New",monospace';
  const RUN_SECS = 60;
  const LOCK_MS = 800;                       // end card ignores input this long (a mashed key can't skip it)
  const BEST_KEY = 'cc-reel-weird-best', BOOK_KEY = 'cc-reel-weird-book', MUTE_KEY = 'cc-reel-weird-muted';

  const TIERS = [
    { name: 'common', col: '#c9c6bd', pts: 10 },
    { name: 'uncommon', col: '#7fd8ff', pts: 25 },
    { name: 'rare', col: '#C5FF49', pts: 60 },
    { name: 'epic', col: '#B59AFF', pts: 150 },
    { name: 'legendary', col: '#ffd84a', pts: 500 }
  ];

  // sprite colours (single letters keep the drawings short)
  const c = {
    w: '#F5F3ED', g: '#a8adb5', G: '#6b7079', d: '#3a3d44', b: '#9a6638', B: '#6b4424', t: '#d9a35b',
    y: '#ffd84a', Y: '#e0a91f', o: '#ff9a3c', r: '#ff5a5a', R: '#c23b3b', p: '#ff9fd2', P: '#e070b0',
    l: '#C5FF49', v: '#B59AFF', V: '#7b4fe0', cy: '#7fd8ff', C: '#3a7fd6', n: '#3fae6a', N: '#25784a',
    s: '#D8CBA6', S: '#b8a87f', k: '#101114', f: '#f2c9a0', scr: '#13281a'
  };

  // 24 catches. pull = how hard it fights (0..1). draw(R, C, P) paints a 16x16 grid: R rect, C circle, P pixel.
  const ITEMS = [
    { id: 'boot', name: 'old boot', tier: 0, pull: 0.15, line: 'size 11. no owner. no regrets.',
      draw: (R, C, P) => { R(5, 2, 4, 9, c.b); R(5, 9, 8, 3, c.b); R(4, 12, 10, 2, c.B); P(6, 4, c.t); P(7, 6, c.t); P(6, 8, c.t); } },
    { id: 'sock', name: 'soggy sock', tier: 0, pull: 0.12, line: 'the other one is still out there.',
      draw: (R) => { R(5, 1, 5, 9, c.w); R(5, 3, 5, 1, c.r); R(5, 6, 5, 1, c.r); R(5, 9, 8, 4, c.w); R(11, 10, 2, 3, c.g); } },
    { id: 'can', name: 'tin can', tier: 0, pull: 0.14, line: 'contains: pond.',
      draw: (R) => { R(4, 3, 8, 11, c.g); R(4, 3, 8, 1, c.w); R(4, 6, 8, 4, c.r); R(5, 7, 6, 1, c.w); R(4, 13, 8, 1, c.G); } },
    { id: 'duck', name: 'rubber duck', tier: 0, pull: 0.18, line: 'it has seen things.',
      draw: (R, C, P) => { C(7, 10, 4.5, c.y); C(10, 5, 3, c.y); R(13, 5, 2, 2, c.o); R(4, 9, 4, 2, c.Y); P(11, 4, c.k); } },
    { id: 'remote', name: 'lost remote', tier: 0, pull: 0.16, line: 'found it. it was in the pond the whole time.',
      draw: (R, C, P) => { R(6, 1, 5, 14, c.d); P(7, 3, c.r); [6, 8, 10].forEach((y) => { P(7, y, c.w); P(9, y, c.w); }); R(7, 12, 3, 1, c.G); } },
    { id: 'seaweed', name: 'sad seaweed', tier: 0, pull: 0.1, line: 'it just wanted to be a salad.',
      draw: (R) => { for (let y = 2; y < 15; y++) R(6 + Math.round(Math.sin(y * 0.8)), y, 2, 1, c.n); for (let y = 5; y < 15; y++) R(10 + Math.round(Math.sin(y * 0.8 + 2)), y, 2, 1, c.N); } },
    { id: 'toaster', name: 'toaster', tier: 1, pull: 0.3, line: 'still warm. somehow.',
      draw: (R) => { R(4, 2, 3, 4, c.t); R(9, 2, 3, 4, c.t); R(2, 5, 12, 8, c.g); R(2, 5, 12, 1, c.w); R(4, 5, 3, 1, c.d); R(9, 5, 3, 1, c.d); R(14, 8, 1, 2, c.d); R(3, 13, 2, 1, c.d); R(11, 13, 2, 1, c.d); } },
    { id: 'floppy', name: 'floppy disk', tier: 1, pull: 0.28, line: '1.44 mb of pure secrets.',
      draw: (R, C, P) => { R(2, 2, 12, 12, c.C); R(5, 2, 6, 4, c.g); P(9, 3, c.d); R(4, 8, 8, 6, c.w); R(5, 9, 6, 1, c.g); R(5, 11, 5, 1, c.g); } },
    { id: 'cone', name: 'traffic cone', tier: 1, pull: 0.26, line: 'the pond is under construction.',
      draw: (R) => { for (let y = 2; y < 13; y++) { const w = 2 + Math.round((y - 2) * 0.8); R(8 - w / 2, y, w, 1, (y === 6 || y === 9) ? c.w : c.o); } R(3, 13, 10, 2, c.R); } },
    { id: 'pizza', name: 'pond pizza', tier: 1, pull: 0.3, line: 'extra anchovies. very fresh.',
      draw: (R, C) => { for (let y = 3; y < 14; y++) { const w = 13 - (y - 3); R(8 - w / 2, y, w, 1, c.y); } R(1, 2, 14, 2, c.t); C(5, 6, 1.3, c.r); C(10, 6, 1.3, c.r); C(8, 10, 1.2, c.r); R(6, 8, 3, 1, c.g); } },
    { id: 'gnome', name: 'garden gnome', tier: 1, pull: 0.34, line: 'he swam here. on purpose.',
      draw: (R) => { for (let y = 1; y < 7; y++) { const w = 1 + (y - 1); R(8 - w / 2, y, w, 1, c.r); } R(6, 7, 4, 2, c.f); R(5, 8, 6, 4, c.w); R(5, 11, 6, 3, c.C); R(5, 14, 2, 1, c.B); R(9, 14, 2, 1, c.B); } },
    { id: 'shark', name: 'shark in sunglasses', tier: 2, pull: 0.55, line: 'too cool to bite.',
      draw: (R, C, P) => { R(3, 7, 10, 5, c.g); C(4, 9, 2.4, c.g); R(7, 4, 2, 3, c.g); R(6, 6, 4, 1, c.g); R(13, 5, 2, 3, c.G); R(13, 10, 2, 3, c.G); R(4, 11, 8, 1, c.w); R(3, 8, 3, 2, c.k); R(7, 8, 3, 2, c.k); R(6, 8, 1, 1, c.k); P(4, 8, c.cy); P(8, 8, c.cy); } },
    { id: 'chair', name: 'office chair', tier: 2, pull: 0.5, line: 'it rolled here from a meeting.',
      draw: (R, C, P) => { R(5, 1, 6, 6, c.d); R(4, 7, 8, 2, c.G); R(7, 9, 2, 3, c.g); R(3, 12, 10, 1, c.g); P(3, 13, c.k); P(8, 13, c.k); P(12, 13, c.k); } },
    { id: 'laptop', name: 'laptop (still on)', tier: 2, pull: 0.5, line: '47 tabs open. battery: 2%.',
      draw: (R) => { R(3, 2, 10, 7, c.d); R(4, 3, 8, 5, c.cy); R(4, 3, 2, 1, c.l); R(6, 3, 2, 1, c.v); R(8, 3, 2, 1, c.y); R(1, 10, 14, 2, c.g); R(1, 12, 14, 1, c.G); R(6, 10, 4, 1, c.G); } },
    { id: 'disco', name: 'disco ball', tier: 2, pull: 0.48, line: 'the fish were having a party.',
      draw: (R, C, P) => { R(8, 0, 1, 3, c.g); C(8, 9, 5.5, c.g); for (let y = 4; y < 15; y++) for (let x = 3; x < 14; x++) if ((x + y) % 2 === 0 && (x - 8) ** 2 + (y - 9) ** 2 < 28) P(x, y, c.w); P(6, 7, c.cy); P(10, 11, c.p); } },
    { id: 'router', name: 'wifi router', tier: 3, pull: 0.7, line: '5 bars. underwater. explain that.',
      draw: (R, C, P) => { R(2, 9, 12, 5, c.d); R(4, 3, 1, 6, c.d); R(11, 3, 1, 6, c.d); P(4, 11, c.l); P(6, 11, c.l); P(8, 11, c.l); P(11, 11, c.r); R(6, 4, 4, 1, c.v); R(7, 6, 2, 1, c.v); } },
    { id: 'vending', name: 'vending machine', tier: 3, pull: 0.75, line: 'b4 is a fish.',
      draw: (R, C, P) => { R(3, 1, 10, 14, c.r); R(4, 2, 6, 10, c.d); R(5, 3, 1, 1, c.y); R(7, 3, 1, 1, c.l); R(5, 5, 1, 1, c.v); R(7, 5, 1, 1, c.o); R(5, 8, 3, 1, c.cy); P(8, 8, c.cy); R(4, 13, 6, 1, c.k); R(11, 3, 1, 6, c.g); } },
    { id: 'ufo', name: 'tiny ufo', tier: 3, pull: 0.72, line: 'it asked to be put back.',
      draw: (R, C, P) => { C(8, 6, 3, c.cy); P(7, 5, c.w); R(2, 8, 12, 3, c.g); R(4, 11, 8, 1, c.G); P(4, 9, c.y); P(8, 9, c.y); P(12, 9, c.y); } },
    { id: 'trophy', name: 'golden trophy', tier: 3, pull: 0.68, line: 'awarded for: being in a pond.',
      draw: (R) => { R(4, 2, 8, 5, c.y); R(5, 7, 6, 2, c.y); R(2, 3, 2, 3, c.Y); R(12, 3, 2, 3, c.Y); R(7, 9, 2, 3, c.Y); R(4, 12, 8, 2, c.B); R(5, 3, 1, 3, c.w); } },
    { id: 'cursed', name: 'the cursed fish', tier: 4, pull: 1, line: 'it knows your search history.',
      draw: (R, C, P) => { R(3, 6, 9, 5, c.V); C(5, 8, 2.6, c.V); R(12, 5, 2, 7, c.v); R(6, 4, 4, 2, c.v); R(4, 7, 2, 2, c.l); P(5, 8, c.k); R(2, 9, 2, 1, c.w); P(8, 7, c.v); P(10, 9, c.v); } },
    { id: 'crown', name: "pond king's crown", tier: 4, pull: 0.9, line: 'you are the pond king now.',
      draw: (R, C, P) => { R(3, 8, 10, 4, c.y); R(3, 4, 2, 4, c.y); R(7, 3, 2, 5, c.y); R(11, 4, 2, 4, c.y); R(3, 12, 10, 1, c.Y); P(4, 9, c.r); P(8, 9, c.cy); P(11, 9, c.l); } },
    { id: 'twin', name: "crash's twin", tier: 4, pull: 0.85, line: 'a beige computer. wet. confused.',
      draw: (R, C, P) => { R(3, 2, 10, 8, c.s); R(4, 3, 8, 6, c.scr); P(6, 5, c.l); P(9, 5, c.l); R(6, 7, 4, 1, c.l); R(6, 10, 4, 1, c.S); R(2, 11, 12, 3, c.s); R(2, 13, 12, 1, c.S); P(13, 1, c.cy); P(1, 6, c.cy); } },
    { id: 'kraken', name: 'baby kraken', tier: 4, pull: 0.95, line: 'it wants a hug. 8 hugs.',
      draw: (R, C, P) => { C(8, 6, 4.5, c.p); P(6, 6, c.k); P(10, 6, c.k); P(6, 5, c.w); P(10, 5, c.w); for (let i = 0; i < 5; i++) for (let y = 10; y < 15; y++) P(3 + i * 2.5 + Math.round(Math.sin(y + i)), y, c.P); } },
    { id: 'goldduck', name: 'golden duck', tier: 4, pull: 0.88, line: 'it has seen everything.',
      draw: (R, C, P) => { C(7, 10, 4.5, c.Y); C(10, 5, 3, c.Y); R(13, 5, 2, 2, c.o); R(4, 9, 4, 2, c.y); P(11, 4, c.k); P(5, 8, c.w); P(1, 3, c.w); P(14, 12, c.w); } }
  ];
  const BYID = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
  const CRASH = {
    id: 'crash', draw: (R, C, P) => { R(2, 1, 12, 9, c.s); R(3, 2, 10, 7, c.scr); R(6, 10, 4, 1, c.S); R(1, 11, 14, 3, c.s); R(1, 13, 14, 1, c.S); R(10, 12, 3, 1, c.G); }
  };

  // ---------- sprites: 16x16 → outlined canvas, cached ----------
  const SP = 16, cache = {};
  function sprite(it, mode) {
    const key = it.id + (mode || 'n');
    if (cache[key]) return cache[key];
    const cv2 = document.createElement('canvas'); cv2.width = cv2.height = SP + 2;
    const g = cv2.getContext('2d');
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x) + 1, Math.round(y) + 1, Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); };
    const P = (x, y, col) => R(x, y, 1, 1, col);
    const Ci = (cx, cy, r, col) => { const m = Math.ceil(r); for (let y = -m; y <= m; y++) for (let x = -m; x <= m; x++) if (x * x + y * y <= r * r + 0.3) P(cx + x, cy + y, col); };
    it.draw(R, Ci, P);
    const n = SP + 2, im = g.getImageData(0, 0, n, n), a = im.data, edge = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (a[(y * n + x) * 4 + 3]) continue;
      const on = (xx, yy) => xx >= 0 && yy >= 0 && xx < n && yy < n && a[(yy * n + xx) * 4 + 3] > 0;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) edge.push(y * n + x);
    }
    for (const i of edge) { a[i * 4] = 16; a[i * 4 + 1] = 17; a[i * 4 + 2] = 20; a[i * 4 + 3] = 255; }
    if (mode === 's') for (let i = 0; i < n * n; i++) if (a[i * 4 + 3]) { a[i * 4] = 46; a[i * 4 + 1] = 49; a[i * 4 + 2] = 58; }
    g.putImageData(im, 0, 0);
    return (cache[key] = cv2);
  }
  function drawSprite(g, it, x, y, size, mode) {
    g.imageSmoothingEnabled = false;
    g.drawImage(sprite(it, mode), Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size), Math.round(size));
  }

  // ---------- storage ----------
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  let best = +store.get(BEST_KEY, '0') || 0;
  let book = {};
  try { book = JSON.parse(store.get(BOOK_KEY, '{}')) || {}; } catch (e) { book = {}; }
  const bookCount = () => ITEMS.filter((it) => book[it.id]).length;

  // today's rare: one rare/epic catch per day (same for everyone), 3x as likely and worth 2x
  const today = (() => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); })();
  const daily = (() => {
    const pool = ITEMS.filter((it) => it.tier === 2 || it.tier === 3);
    let h = 2166136261;
    for (const ch of today) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return pool[(h >>> 0) % pool.length];
  })();

  // ---------- canvas ----------
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, S = 1;
  let waterY = 0, dockR = 0, tipX = 0, tipY = 0, crashX = 0, crashY = 0, crashSize = 64;
  function resize() {
    const r = cv.getBoundingClientRect();
    W = r.width || window.innerWidth; H = r.height || window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
    S = Math.max(0.7, Math.min(1.6, Math.min(W / 420, H / 640)));
    waterY = Math.round(H * 0.4);
    dockR = Math.round(Math.max(90 * S, W * 0.24));
    crashSize = Math.round(64 * S);
    crashX = Math.round(dockR * 0.45);
    crashY = waterY - 10 * S - crashSize / 2;
    tipX = dockR + 14 * S; tipY = waterY - 96 * S;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---------- audio (tiny webaudio blips) ----------
  let ac = null, master = null, userMuted = store.get(MUTE_KEY, '0') === '1', hostMuted = false;
  function initAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); master = ac.createGain(); master.connect(ac.destination); applyMute(); } catch (e) { ac = null; }
  }
  function applyMute() { if (master) master.gain.value = (userMuted || hostMuted) ? 0 : 0.35; store.set(MUTE_KEY, userMuted ? '1' : '0'); }
  function tone(f1, f2, dur, type, vol, delay) {
    if (!ac || !master) return;
    const t0 = ac.currentTime + (delay || 0), o = ac.createOscillator(), gn = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f1, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t0 + dur);
    gn.gain.setValueAtTime(vol || 0.2, t0); gn.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(gn); gn.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const sfx = {
    cast: () => tone(700, 180, 0.28, 'sawtooth', 0.12),
    plop: () => tone(320, 110, 0.16, 'sine', 0.3),
    nibble: () => tone(500, 420, 0.05, 'sine', 0.12),
    bite: () => { tone(180, 70, 0.14, 'sine', 0.4); tone(880, 880, 0.08, 'square', 0.24); tone(1320, 1320, 0.11, 'square', 0.22, 0.08); },
    hook: () => tone(400, 900, 0.1, 'square', 0.16),
    tick: () => tone(1500, 1400, 0.025, 'square', 0.05),
    snap: () => { tone(260, 50, 0.35, 'sawtooth', 0.25); },
    away: () => tone(500, 200, 0.3, 'triangle', 0.18),
    catch: (tier) => { const base = [523, 587, 659, 784, 880][tier]; [0, 1, 2].forEach((i) => tone(base * [1, 1.25, 1.5][i], base * [1, 1.25, 1.5][i], 0.12, 'square', 0.16, i * 0.08)); if (tier >= 3) tone(base * 2, base * 2, 0.3, 'square', 0.14, 0.26); },
    timer: () => tone(1000, 1000, 0.05, 'square', 0.1),
    end: () => { tone(660, 330, 0.25, 'square', 0.18); tone(440, 220, 0.35, 'square', 0.16, 0.2); },
    click: () => tone(900, 700, 0.04, 'square', 0.1)
  };

  // ---------- platform (cc-sdk) ----------
  const cc = (m, ...a) => { try { if (window.cc && typeof window.cc[m] === 'function') return window.cc[m](...a); } catch (e) { /* ignore */ } return null; };

  // ---------- game state ----------
  // title | book | aim | cast | wait | bite | reel | catch | over
  let state = 'title', bookFrom = 'title', paused = false;
  let timeLeft = RUN_SECS, score = 0, streak = 0, bestStreak = 0, catches = [], newOnes = 0, runStart = 0, lastScoreSent = 0;
  let down = false, charging = false, chargeT = 0, power = 0;
  let cast = null;          // { x, d, t, dur, fromX, fromY }
  let bobX = 0, bobY = 0, bobDip = 0;
  let waitT = 0, nibbles = [], biteT = 0, biteWin = 0;
  let hooked = null, perfectHook = false;
  let tension = 0, progress = 0, slackT = 0, surgeT = 0, surgeLeft = 0, tickT = 0;
  let reveal = null, revealT = 0, overAt = 0, newBest = false, lastCall = false;
  let t = 0, shake = 0, msg = '', msgT = 0, msgCol = COL.paper;
  let floats = [], parts = [];
  let bookSel = null, btns = {}, shareMsg = '', shareMsgT = 0;
  const shadows = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), d: 0.15 + i * 0.14, v: (Math.random() < 0.5 ? -1 : 1) * (0.02 + Math.random() * 0.04), s: 0.6 + Math.random() * 0.8 }));
  const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() }));

  function say(text, col, life) { msg = text; msgCol = col || COL.paper; msgT = life || 1.2; }
  function floatText(x, y, text, col) { floats.push({ x, y, text, col, life: 1.1 }); }
  function splash(x, y, n, col) {
    for (let i = 0; i < n; i++) { const a = -Math.PI * (0.15 + Math.random() * 0.7); const v = (60 + Math.random() * 120) * S; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6, max: 0.6, col: col || '#9fd6e8', size: (2 + Math.random() * 2) * S }); }
  }

  function mult() { return Math.min(3, 1 + 0.25 * Math.max(0, streak - 1)); }
  function castMinX() { return dockR + 34 * S; }
  function castMaxX() { return W - 26 * S; }
  function depthY(d) { return waterY + 34 * S + d * (H - waterY - 110 * S); }

  function startRun() {
    if (state === 'over' && performance.now() - overAt < LOCK_MS) return;
    initAudio();
    timeLeft = RUN_SECS; score = 0; streak = 0; bestStreak = 0; catches = []; newOnes = 0; lastCall = false;
    floats = []; parts = []; reveal = null; newBest = false; paused = false;
    runStart = performance.now(); lastScoreSent = 0;
    toAim();
    say('hold to charge · let go to cast', COL.lime, 2.2);
    cc('start');
  }
  function toAim() { state = 'aim'; charging = false; chargeT = 0; power = 0; hooked = null; bobDip = 0; } // a new press charges (not the tap that closed the card)

  function doCast() {
    charging = false;
    const d = power;
    const x = castMinX() + d * (castMaxX() - castMinX());
    cast = { x, d, t: 0, dur: 0.45, fromX: tipX, fromY: tipY };
    state = 'cast';
    sfx.cast();
  }
  function landed() {
    bobX = cast.x; bobY = waterY;
    splash(bobX, waterY, 8);
    sfx.plop();
    state = 'wait';
    waitT = 0.7 + Math.random() * 1.5 + cast.d * 0.6;
    // fake nibbles before the real bite: small twitches that bait an early tap
    nibbles = [];
    const nn = Math.random() < 0.35 ? 0 : Math.random() < 0.6 ? 1 : 2;
    for (let i = 0; i < nn; i++) nibbles.push(waitT * (0.25 + 0.5 * Math.random()));
  }
  function rollItem(d) {
    const wts = [60 - 45 * d, 28 - 6 * d, 9 + 16 * d, 2.6 + 9 * d, 0.2 + 1.8 * d];
    wts[daily.tier] *= 1.15;
    let r = Math.random() * wts.reduce((s, v) => s + v, 0), tier = 0;
    for (; tier < 4; tier++) { r -= wts[tier]; if (r < 0) break; }
    const pool = ITEMS.filter((it) => it.tier === tier);
    const pw = pool.map((it) => (it === daily ? 3 : 1));
    let q = Math.random() * pw.reduce((s, v) => s + v, 0);
    for (let i = 0; i < pool.length; i++) { q -= pw[i]; if (q < 0) return pool[i]; }
    return pool[pool.length - 1];
  }
  function bite() {
    hooked = rollItem(cast.d);
    state = 'bite';
    // generous on the first casts (~0.95s), tighter as the streak grows; deeper (rarer) things are a bit quicker
    biteWin = Math.max(0.45, 0.95 - streak * 0.07 - hooked.tier * 0.05);
    biteT = 0;
    bobDip = 1;
    splash(bobX, waterY, 10, '#cfefff');
    shake = Math.max(shake, 0.35);
    sfx.bite();
  }
  function hook() {
    perfectHook = biteT <= Math.min(0.28, biteWin * 0.45); // "perfect" stays as tight as before
    state = 'reel';
    tension = 0.3; progress = 0; slackT = 0; surgeT = 0.5 + Math.random() * 0.8; surgeLeft = 0; tickT = 0;
    sfx.hook();
    if (perfectHook) floatText(bobX, waterY - 40 * S, 'perfect hook!', COL.lime);
  }
  function fail(text) {
    if (streak >= 2) text += ' · streak lost';
    streak = 0;
    say(text, COL.red, 1.4);
    afterAttempt();
  }
  function landCatch() {
    const it = hooked, tier = TIERS[it.tier];
    const isNew = !book[it.id];
    book[it.id] = (book[it.id] || 0) + 1;
    store.set(BOOK_KEY, JSON.stringify(book));
    streak++; bestStreak = Math.max(bestStreak, streak);
    const isDaily = it === daily;
    const pts = Math.round(tier.pts * mult() * (perfectHook ? 1.25 : 1) * (isDaily ? 2 : 1) * (isNew ? 1.5 : 1));
    score += pts;
    if (isNew) newOnes++;
    catches.push({ it, pts });
    reveal = { it, pts, isNew, isDaily, perfect: perfectHook, mult: mult() };
    revealT = 0;
    state = 'catch';
    sfx.catch(it.tier);
    splash(bobX, waterY, 14, tier.col);
    if (it.tier >= 3) shake = Math.max(shake, 0.5);
    cc('event', 'catch', { item: it.id, tier: tier.name, depth: Math.round(cast.d * 100) / 100 });
    if (performance.now() - lastScoreSent > 400) { lastScoreSent = performance.now(); cc('score', score); }
  }
  function afterAttempt() {
    hooked = null;
    if (timeLeft <= 0) { endRun(); return; }
    toAim();
  }
  function endRun() {
    state = 'over';
    overAt = performance.now();
    charging = false; down = false;
    if (score > best) { best = score; newBest = score > 0; store.set(BEST_KEY, String(best)); }
    sfx.end();
    const top = bestCatch();
    cc('end', { score, durationMs: Math.round(performance.now() - runStart), completed: true });
    cc('event', 'run_over', { catches: catches.length, best: top ? top.it.id : null, new_entries: newOnes, book: bookCount(), streak: bestStreak });
  }
  function bestCatch() {
    let b = null;
    for (const x of catches) if (!b || x.it.tier > b.it.tier || (x.it.tier === b.it.tier && x.pts > b.pts)) b = x;
    return b;
  }

  // ---------- update ----------
  function update(dt) {
    t += dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 2.5);
    if (msgT > 0) msgT -= dt;
    if (shareMsgT > 0) shareMsgT -= dt;
    for (const s of shadows) { s.x += s.v * dt; if (s.x < -0.1) s.x = 1.1; if (s.x > 1.1) s.x = -0.1; }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.y -= 30 * S * dt; if (f.life <= 0) floats.splice(i, 1); }
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * S * dt; if (p.life <= 0) parts.splice(i, 1); }
    if (paused) return;

    const timed = state === 'aim' || state === 'cast' || state === 'wait' || state === 'bite' || state === 'reel';
    if (timed && timeLeft > 0) {
      const before = timeLeft;
      timeLeft = Math.max(0, timeLeft - dt);
      if (Math.ceil(before) !== Math.ceil(timeLeft) && timeLeft <= 5 && timeLeft > 0) sfx.timer();
      if (timeLeft <= 0) {
        // a cast that's already biting or on the line gets to finish ("last call"); otherwise time's up
        if (state === 'bite' || state === 'reel') { lastCall = true; say('last call!', COL.gold, 1.2); }
        else { endRun(); return; }
      }
    }

    if (state === 'aim') {
      if (charging) { chargeT += dt; power = 0.5 - 0.5 * Math.cos(chargeT * Math.PI / 0.8); } // swings 0→1→0 every 1.6 s
    } else if (state === 'cast') {
      cast.t += dt;
      if (cast.t >= cast.dur) landed();
    } else if (state === 'wait') {
      waitT -= dt;
      bobDip = Math.max(0, bobDip - dt * 4);
      for (let i = nibbles.length - 1; i >= 0; i--) if (waitT <= nibbles[i]) { nibbles.splice(i, 1); bobDip = 0.35; sfx.nibble(); }
      if (waitT <= 0) bite();
    } else if (state === 'bite') {
      biteT += dt;
      if (biteT > biteWin) { sfx.away(); fail('too slow. it got away'); }
    } else if (state === 'reel') {
      const pull = hooked.pull;
      surgeT -= dt;
      if (surgeT <= 0) { surgeLeft = 0.35; surgeT = 0.7 + Math.random() * 1.1 - pull * 0.3; }
      const surging = surgeLeft > 0;
      if (surging) surgeLeft -= dt;
      if (down) {
        tension += (0.85 + 0.6 * pull + (surging ? 1.6 + 1.4 * pull : 0)) * dt;
        progress += (0.72 - 0.34 * pull) * dt * (tension > 0.88 ? 0.5 : 1);
        tickT -= dt; if (tickT <= 0) { tickT = 0.08; sfx.tick(); }
      } else {
        tension -= (1.5 - 0.3 * pull) * dt;
        progress -= 0.06 * dt;
      }
      tension = Math.max(0, tension); progress = Math.max(0, progress);
      if (tension >= 1) { shake = 0.7; sfx.snap(); splash(bobX, waterY, 10, COL.paper); fail('snap! the line broke'); return; }
      if (tension <= 0.02 && !down) slackT += dt; else slackT = 0;
      if (slackT > 1.3) { sfx.away(); fail('slack line. it swam off'); return; }
      if (progress >= 1) landCatch();
    } else if (state === 'catch') {
      revealT += dt;
      if (revealT > 1.9) nextAfterReveal();
    }
  }
  function nextAfterReveal() { reveal = null; afterAttempt(); }

  // ---------- input ----------
  const inRect = (r, x, y) => r && x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
  function press(x, y) {
    initAudio();
    if (paused) { paused = false; return; }
    if (x !== undefined && inRect(btns.mute, x, y)) { userMuted = !userMuted; applyMute(); return; }
    switch (state) {
      case 'title':
        if (x !== undefined && inRect(btns.book, x, y)) { openBook(); return; }
        startRun(); return;
      case 'book': pressBook(x, y); return;
      case 'aim': charging = true; chargeT = 0; power = 0; return;
      case 'wait': sfx.away(); fail('too early. it saw you'); return;
      case 'bite': hook(); return;
      case 'catch': if (revealT > 0.35) nextAfterReveal(); return;
      case 'over':
        if (performance.now() - overAt < LOCK_MS) return;
        if (x !== undefined && inRect(btns.share, x, y)) { share(); return; }
        if (x !== undefined && inRect(btns.book, x, y)) { openBook(); return; }
        if (x !== undefined && inRect(btns.next, x, y)) { playNext(); return; }
        startRun(); return;
      default:
    }
  }
  function release() {
    if (state === 'aim' && charging) doCast();
  }
  function openBook() { bookFrom = state; state = 'book'; bookSel = null; sfx.click(); }
  function closeBook() { state = bookFrom; if (state === 'over') overAt = Math.min(overAt, performance.now() - LOCK_MS); sfx.click(); }
  function pressBook(x, y) {
    if (x === undefined || inRect(btns.close, x, y)) { closeBook(); return; }
    for (const tl of btns.tiles || []) if (inRect(tl, x, y)) { bookSel = tl.it; sfx.click(); return; }
    if (!inRect(btns.bookPanel, x, y)) closeBook();
  }
  function playNext() {
    // the page under the game has a "play next" rail after a run; jump to it (fallback: the hub)
    try {
      const doc = window.top.document, rail = doc.getElementById('cc-next');
      if (rail) { rail.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      window.top.location.href = '/games/?src=next&slot=reel-weird';
    } catch (e) { location.href = '/games/'; }
  }

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); cv.focus({ preventScroll: true });
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const r = cv.getBoundingClientRect();
    down = true;
    press(e.clientX - r.left, e.clientY - r.top);
  });
  const up = () => { if (!down) return; down = false; release(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (e.repeat) return;
      down = true; press();
    } else if (e.key === 'm' || e.key === 'M') { initAudio(); userMuted = !userMuted; applyMute(); }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (state === 'book') closeBook(); else if (isActive()) paused = !paused;
    } else if ((e.key === 'b' || e.key === 'B') && (state === 'title' || state === 'over')) openBook();
    else if ((e.key === 'b' || e.key === 'B') && state === 'book') closeBook();
    else if ((e.key === 's' || e.key === 'S') && state === 'over' && performance.now() - overAt >= LOCK_MS) share();
  });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'Enter') up(); });
  // inside the player frame focus can bounce for a moment after a click; only pause if it really left
  let blurT = null;
  window.addEventListener('blur', () => {
    down = false; if (state === 'aim') charging = false;
    clearTimeout(blurT); blurT = setTimeout(() => { if (!document.hasFocus() && isActive()) paused = true; }, 250);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && isActive()) paused = true; });
  function isActive() { return state === 'aim' || state === 'cast' || state === 'wait' || state === 'bite' || state === 'reel'; }
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { hostMuted = !!d.muted; applyMute(); }
    else if (d.type === 'cc-restart') startRun();
    else if (d.type === 'cc-pause') { if (isActive()) paused = d.paused === undefined ? true : !!d.paused; }
  });

  // ---------- drawing helpers ----------
  function text(s, x, y, size, col, align, weight) {
    ctx.font = (weight || '800') + ' ' + Math.round(size) + 'px ' + FONT;
    ctx.textAlign = align || 'left'; ctx.fillStyle = col; ctx.fillText(s, x, y);
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function button(key, label, x, y, w, h, fill, ink) {
    btns[key] = { x, y, w, h };
    roundRect(x, y, w, h, 8 * S); ctx.fillStyle = fill; ctx.fill();
    text(label, x + w / 2, y + h * 0.66, Math.round(14 * S), ink || COL.carbon, 'center');
  }
  function wrap(s, size, maxW) {
    ctx.font = '700 ' + Math.round(size) + 'px ' + FONT;
    const out = []; let cur = '';
    for (const w of s.split(' ')) { const n = cur ? cur + ' ' + w : w; if (ctx.measureText(n).width > maxW && cur) { out.push(cur); cur = w; } else cur = n; }
    if (cur) out.push(cur);
    return out;
  }

  // ---------- scene ----------
  function drawScene() {
    // sky
    let gr = ctx.createLinearGradient(0, 0, 0, waterY);
    gr.addColorStop(0, COL.sky1); gr.addColorStop(1, COL.sky2);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, waterY);
    for (const s of stars) { ctx.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t * 0.8 + s.s * 9)); ctx.fillStyle = COL.paper; ctx.fillRect(s.x * W, s.y * waterY * 0.8, s.s > 0.8 ? 2 : 1, s.s > 0.8 ? 2 : 1); }
    ctx.globalAlpha = 1;
    // moon (a little too green)
    const mx = W * 0.82, my = waterY * 0.28, mr = 26 * S;
    ctx.fillStyle = '#e9f5c9'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,190,120,0.5)'; ctx.beginPath(); ctx.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.22, 0, Math.PI * 2); ctx.arc(mx + mr * 0.35, my + mr * 0.25, mr * 0.15, 0, Math.PI * 2); ctx.fill();
    // far shore
    ctx.fillStyle = '#141a2c';
    ctx.beginPath(); ctx.moveTo(0, waterY);
    for (let x = 0; x <= W; x += 20) ctx.lineTo(x, waterY - 14 * S - Math.abs(Math.sin(x * 0.013) * 22 * S) - Math.abs(Math.sin(x * 0.041)) * 8 * S);
    ctx.lineTo(W, waterY); ctx.fill();
    // water
    gr = ctx.createLinearGradient(0, waterY, 0, H);
    gr.addColorStop(0, COL.water1); gr.addColorStop(1, COL.water2);
    ctx.fillStyle = gr; ctx.fillRect(0, waterY, W, H - waterY);
    // moon reflection
    ctx.fillStyle = 'rgba(233,245,201,0.12)';
    for (let i = 0; i < 6; i++) ctx.fillRect(mx - (18 - i * 2) * S + Math.sin(t * 2 + i) * 4 * S, waterY + 6 * S + i * 9 * S, (36 - i * 4) * S, 2 * S);
    // depth zones (the farther the cast, the deeper the hook)
    const zones = ['shallow', 'murky', 'deep', '???'];
    for (let i = 0; i < 4; i++) {
      const y = depthY((i + 0.5) / 4);
      ctx.fillStyle = 'rgba(245,243,237,0.05)'; ctx.fillRect(castMinX(), depthY(i / 4), castMaxX() - castMinX(), 1);
      text(zones[i], W - 8 * S, y, 10 * S, i === 3 ? 'rgba(181,154,255,0.55)' : 'rgba(245,243,237,0.25)', 'right', '700');
    }
    // things swimming down there
    for (const s of shadows) {
      const x = s.x * W, y = depthY(s.d);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.18 + s.d * 0.18) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, 18 * S * s.s, 6 * S * s.s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - Math.sign(s.v) * 16 * S * s.s, y); ctx.lineTo(x - Math.sign(s.v) * 26 * S * s.s, y - 6 * S * s.s); ctx.lineTo(x - Math.sign(s.v) * 26 * S * s.s, y + 6 * S * s.s); ctx.fill();
    }
    // waves
    ctx.strokeStyle = 'rgba(159,214,232,0.35)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, waterY + Math.sin(x * 0.05 + t * 2) * 2 * S);
    ctx.stroke();
    // dock
    ctx.fillStyle = '#4a3220'; for (let i = 0; i < 3; i++) ctx.fillRect(dockR * (0.18 + i * 0.36), waterY - 8 * S, 6 * S, 46 * S);
    ctx.fillStyle = '#7a5434'; ctx.fillRect(0, waterY - 12 * S, dockR, 8 * S);
    ctx.fillStyle = '#5e4128'; for (let x = 0; x < dockR; x += 18 * S) ctx.fillRect(x, waterY - 12 * S, 2, 8 * S);
  }

  function drawCrashAndLine() {
    // CRASH with its face (sleepy while waiting, wide-eyed on a bite, happy on a catch, sad on a fail)
    const bob = Math.sin(t * 2) * 1.5 * S;
    drawSprite(ctx, CRASH, crashX, crashY + bob, crashSize);
    const px = crashSize / 18, fx = crashX - crashSize / 2 + px, fy = crashY + bob - crashSize / 2 + px;
    const P = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(fx + x * px), Math.round(fy + y * px), Math.ceil(px), Math.ceil(px)); };
    const face = state === 'catch' ? 'happy' : state === 'bite' || state === 'reel' ? 'focus' : msgT > 0 && msgCol === COL.red ? 'sad' : state === 'over' ? 'sleep' : 'idle';
    if (face === 'happy') { P(5, 4, c.l); P(10, 4, c.l); P(5, 6, c.l); P(6, 7, c.l); P(7, 7, c.l); P(8, 7, c.l); P(9, 7, c.l); P(10, 6, c.l); }
    else if (face === 'focus') { P(5, 4, c.l); P(6, 4, c.l); P(9, 4, c.l); P(10, 4, c.l); P(5, 5, c.l); P(10, 5, c.l); P(7, 7, c.l); P(8, 7, c.l); }
    else if (face === 'sad') { P(5, 5, c.l); P(10, 5, c.l); P(6, 7, c.l); P(7, 6, c.l); P(8, 6, c.l); P(9, 7, c.l); }
    else if (face === 'sleep') { P(5, 5, c.l); P(6, 5, c.l); P(9, 5, c.l); P(10, 5, c.l); P(7, 7, c.l); P(8, 7, c.l); }
    else { P(5, 5, c.l); P(10, 5, c.l); P(6, 7, c.l); P(7, 7, c.l); P(8, 7, c.l); P(9, 7, c.l); }
    // rod
    const hx = crashX + crashSize * 0.42, hy = crashY + bob + crashSize * 0.25;
    const bend = state === 'reel' ? (0.15 + tension * 0.5) : state === 'bite' ? 0.2 : 0;
    const rtx = tipX, rty = tipY + bend * 40 * S;
    ctx.strokeStyle = '#c8a46a'; ctx.lineWidth = 3 * S; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo((hx + rtx) / 2, (hy + rty) / 2 - 10 * S + bend * 20 * S, rtx, rty); ctx.stroke();
    // line + bobber
    let bx = rtx, by = rty + 26 * S;
    if (state === 'cast' && cast) {
      const k = Math.min(1, cast.t / cast.dur);
      bx = cast.fromX + (cast.x - cast.fromX) * k;
      by = cast.fromY + (waterY - cast.fromY) * k - Math.sin(k * Math.PI) * 70 * S;
    } else if (state === 'wait' || state === 'bite' || state === 'reel' || state === 'catch') {
      bx = bobX; by = waterY + Math.sin(t * 3) * 1.5 * S + bobDip * 7 * S;
      if (state === 'bite') by += 7 * S + Math.sin(t * 40) * 2 * S; // the bobber dunks under and jerks
    }
    const taut = state === 'reel' || state === 'bite';
    ctx.strokeStyle = state === 'reel' && tension > 0.85 ? COL.red : 'rgba(245,243,237,0.75)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(rtx, rty);
    ctx.quadraticCurveTo((rtx + bx) / 2, Math.max(rty, by) + (taut ? 0 : 30 * S), bx, by); ctx.stroke();
    if (state !== 'catch') {
      ctx.fillStyle = COL.red; ctx.beginPath(); ctx.arc(bx, by - 3 * S, 5 * S, Math.PI, 0); ctx.fill();
      ctx.fillStyle = COL.paper; ctx.beginPath(); ctx.arc(bx, by - 3 * S, 5 * S, 0, Math.PI); ctx.fill();
    }
    // the catch coming up from its depth while reeling
    if (state === 'reel' && hooked) {
      const fromY = depthY(cast.d), y = fromY + (waterY + 16 * S - fromY) * progress;
      const wob = Math.sin(t * 14) * (surgeLeft > 0 ? 7 : 2) * S;
      ctx.strokeStyle = 'rgba(245,243,237,0.4)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + wob, y); ctx.stroke();
      drawSprite(ctx, hooked, bx + wob, y + 14 * S, 40 * S, 's');
      if (surgeLeft > 0) text('!!', bx + 26 * S, y, 16 * S, COL.red, 'center');
    }
    if (state === 'bite') {
      const k = 1 - biteT / biteWin;
      text('!', bx, waterY - 30 * S - (1 - k) * 6 * S, (34 + 14 * Math.max(0, 1 - biteT * 5)) * S, COL.gold, 'center', '900');
    }
  }

  function drawHUD() {
    const pad = 12 * S;
    // time bar
    const bw = W - pad * 2, bh = 8 * S, k = timeLeft / RUN_SECS;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(pad, pad, bw, bh);
    ctx.fillStyle = timeLeft <= 10 && Math.sin(t * 10) > 0 ? COL.red : COL.lime; ctx.fillRect(pad, pad, bw * k, bh);
    text(Math.ceil(timeLeft) + 's', pad, pad + bh + 16 * S, 13 * S, COL.paper, 'left');
    text(String(score), W - pad, pad + bh + 26 * S, 26 * S, COL.lime, 'right', '900');
    if (streak >= 2) text('x' + mult().toFixed(2).replace(/0$/, '').replace(/\.0$/, '') + ' streak ' + streak, W - pad, pad + bh + 44 * S, 12 * S, COL.lilac, 'right');
    // mute toggle
    const ms = 26 * S; btns.mute = { x: pad, y: pad + bh + 24 * S, w: ms, h: ms };
    text(userMuted ? '🔇' : '🔊', pad + ms / 2, pad + bh + 24 * S + ms * 0.75, 15 * S, COL.paper, 'center', '400');
  }

  function drawPrompt() {
    const cy = H - 22 * S;
    if (state === 'aim') {
      // power meter: the farther, the deeper (and weirder)
      const w = Math.min(W - 40 * S, 340 * S), x = (W - w) / 2, y = H - 64 * S, h = 16 * S;
      roundRect(x, y, w, h, 6 * S); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();
      const zc = ['#3b6b7a', '#2f5466', '#2a3f66', '#5a3f8f'];
      for (let i = 0; i < 4; i++) { ctx.fillStyle = zc[i]; ctx.fillRect(x + 2 + (w - 4) * i / 4, y + 2, (w - 4) / 4 - 1, h - 4); }
      ctx.fillStyle = COL.lime; ctx.fillRect(x + 2 + (w - 4) * power - 2 * S, y - 4 * S, 4 * S, h + 8 * S);
      ['shallow', 'murky', 'deep', '???'].forEach((z, i) => text(z, x + (w * (i + 0.5)) / 4, y - 6 * S, 10 * S, i === 3 ? COL.lilac : COL.dim, 'center', '700'));
      text(charging ? 'let go to cast' : 'hold to charge · let go to cast', W / 2, cy, 13 * S, COL.paper, 'center');
    } else if (state === 'wait') {
      text('wait for the big bite. small twitches are fakes.', W / 2, cy, 12 * S, COL.dim, 'center', '700');
    } else if (state === 'bite') {
      text('NOW! tap / space', W / 2, cy, 18 * S, COL.gold, 'center', '900');
    } else if (state === 'reel') {
      const w = Math.min(W - 40 * S, 340 * S), x = (W - w) / 2, y = H - 64 * S, h = 16 * S;
      roundRect(x, y, w, h, 6 * S); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
      ctx.fillStyle = 'rgba(197,255,73,0.25)'; ctx.fillRect(x + w * 0.2, y + 2, w * 0.62, h - 4);
      ctx.fillStyle = 'rgba(255,90,90,0.45)'; ctx.fillRect(x + w * 0.88, y + 2, w * 0.12 - 2, h - 4);
      ctx.fillStyle = tension > 0.88 ? COL.red : COL.paper; ctx.fillRect(x + w * Math.min(1, tension) - 2 * S, y - 4 * S, 4 * S, h + 8 * S);
      text('line tension', x, y - 6 * S, 10 * S, COL.dim, 'left', '700');
      text(Math.round(progress * 100) + '% reeled', x + w, y - 6 * S, 10 * S, COL.lime, 'right', '700');
      text(down ? 'reeling… ease off before the red' : 'hold to reel · let go to ease', W / 2, cy, 13 * S, COL.paper, 'center');
    }
    if (msgT > 0 && state !== 'over' && state !== 'title') {
      ctx.globalAlpha = Math.min(1, msgT * 2);
      text(msg, W / 2, waterY - 130 * S, 15 * S, msgCol, 'center');
      ctx.globalAlpha = 1;
    }
  }

  function drawReveal() {
    if (!reveal) return;
    const it = reveal.it, tier = TIERS[it.tier];
    const k = Math.min(1, revealT / 0.25), e = 1 - Math.pow(1 - k, 3);
    const cw = Math.min(W - 32 * S, 320 * S), ch = 250 * S, cx = (W - cw) / 2, cy = Math.max(60 * S, waterY - ch * 0.62);
    ctx.globalAlpha = e;
    roundRect(cx, cy + (1 - e) * 20 * S, cw, ch, 14 * S); ctx.fillStyle = 'rgba(16,17,20,0.94)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = tier.col; ctx.stroke();
    const yy = cy + (1 - e) * 20 * S;
    text(tier.name.toUpperCase() + (reveal.isDaily ? ' · DAILY RARE' : ''), W / 2, yy + 24 * S, 12 * S, tier.col, 'center', '900');
    // legendary glow
    if (it.tier >= 3) { ctx.fillStyle = tier.col; ctx.globalAlpha = e * (0.12 + 0.08 * Math.sin(t * 6)); ctx.beginPath(); ctx.arc(W / 2, yy + 92 * S, 58 * S, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = e; }
    drawSprite(ctx, it, W / 2, yy + 92 * S + Math.sin(t * 3) * 3 * S, 104 * S);
    text(it.name, W / 2, yy + 168 * S, 18 * S, COL.paper, 'center', '900');
    text('"' + it.line + '"', W / 2, yy + 188 * S, 11 * S, COL.dim, 'center', '700');
    const bits = ['+' + reveal.pts];
    if (reveal.isNew) bits.push('NEW!');
    if (reveal.perfect) bits.push('perfect hook');
    if (reveal.mult > 1) bits.push('x' + reveal.mult.toFixed(2).replace(/0$/, '').replace(/\.0$/, ''));
    text(bits.join(' · '), W / 2, yy + 216 * S, 15 * S, reveal.isNew ? COL.gold : COL.lime, 'center', '900');
    if (revealT > 0.35) text('tap to cast again', W / 2, yy + ch - 10 * S, 10 * S, COL.dim, 'center', '700');
    ctx.globalAlpha = 1;
  }

  function drawTitle() {
    ctx.fillStyle = 'rgba(16,17,20,0.55)'; ctx.fillRect(0, 0, W, H);
    const y0 = Math.max(70 * S, H * 0.16);
    text('reel weird', W / 2 + 4 * S, y0 + 4 * S, 46 * S, '#5e4a9e', 'center', '900');
    text('reel weird', W / 2, y0, 46 * S, COL.lime, 'center', '900');
    text('60 seconds. one cursed pond. no idea what bites.', W / 2, y0 + 30 * S, 12 * S, COL.paper, 'center', '700');
    // a few things from the pond, floating
    const show = [BYID.boot, BYID.toaster, BYID.shark, BYID.cursed];
    show.forEach((it, i) => drawSprite(ctx, it, W / 2 + (i - 1.5) * 70 * S, y0 + 84 * S + Math.sin(t * 2 + i) * 5 * S, 58 * S, book[it.id] || i < 2 ? 'n' : 's'));
    // today's rare
    const ry = Math.max(y0 + 140 * S, Math.min(H - 290 * S, waterY + 30 * S)); // tall screens: below the dock
    roundRect(W / 2 - 150 * S, ry, 300 * S, 50 * S, 10 * S); ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill(); ctx.strokeStyle = TIERS[daily.tier].col; ctx.lineWidth = 2; ctx.stroke();
    drawSprite(ctx, daily, W / 2 - 122 * S, ry + 25 * S, 36 * S, book[daily.id] ? 'n' : 's');
    text("today's rare (2x pts)", W / 2 - 96 * S, ry + 20 * S, 11 * S, COL.dim, 'left', '700');
    text(book[daily.id] ? daily.name : '??? (' + TIERS[daily.tier].name + ')', W / 2 - 96 * S, ry + 38 * S, 14 * S, TIERS[daily.tier].col, 'left', '900');
    const by = ry + 70 * S;
    const bw = Math.min(260 * S, W - 40 * S);
    button('start', 'cast off ▶', W / 2 - bw / 2, by, bw, 40 * S, COL.lime);
    button('book', 'collection book ' + bookCount() + '/' + ITEMS.length + ' (b)', W / 2 - bw / 2, by + 50 * S, bw, 34 * S, COL.lilac);
    text('best: ' + best, W / 2, by + 106 * S, 12 * S, COL.dim, 'center', '700');
    const tips = 'hold to charge, let go to cast. far = deep = weird. tap on the BIG bite. hold to reel, let go before the line snaps.';
    wrap(tips, 11 * S, Math.min(W - 40 * S, 360 * S)).forEach((ln, i) => text(ln, W / 2, by + 130 * S + i * 16 * S, 11 * S, 'rgba(245,243,237,0.5)', 'center', '700'));
  }

  function drawBook() {
    ctx.fillStyle = 'rgba(16,17,20,0.97)'; ctx.fillRect(0, 0, W, H);
    const cols = W > H ? 8 : 4, rows = Math.ceil(ITEMS.length / cols);
    const pw = Math.min(W - 24 * S, cols * 86 * S), tile = (pw - (cols - 1) * 6 * S) / cols;
    const ph = 70 * S + rows * (tile + 6 * S) + 70 * S;
    const px = (W - pw) / 2, py = Math.max(10 * S, (H - ph) / 2);
    btns.bookPanel = { x: px, y: py, w: pw, h: ph };
    text('collection book', px, py + 26 * S, 20 * S, COL.lime, 'left', '900');
    text(bookCount() + '/' + ITEMS.length + ' found', px, py + 46 * S, 12 * S, COL.dim, 'left', '700');
    button('close', 'close', px + pw - 70 * S, py + 8 * S, 70 * S, 30 * S, COL.paper);
    btns.tiles = [];
    ITEMS.forEach((it, i) => {
      const x = px + (i % cols) * (tile + 6 * S), y = py + 60 * S + Math.floor(i / cols) * (tile + 6 * S);
      const got = book[it.id];
      roundRect(x, y, tile, tile, 8 * S); ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill();
      ctx.lineWidth = bookSel === it ? 3 : 1.5; ctx.strokeStyle = got ? TIERS[it.tier].col : '#2a2c33'; ctx.stroke();
      drawSprite(ctx, it, x + tile / 2, y + tile * 0.45, tile * 0.62, got ? 'n' : 's');
      if (got) text('x' + got, x + tile - 5 * S, y + tile - 6 * S, 10 * S, COL.dim, 'right', '700');
      if (it === daily) text('★', x + 6 * S, y + 14 * S, 11 * S, COL.gold, 'left', '900');
      btns.tiles.push({ x, y, w: tile, h: tile, it });
    });
    const sy = py + 60 * S + rows * (tile + 6 * S) + 18 * S;
    if (bookSel) {
      const got = book[bookSel.id];
      text(got ? bookSel.name : '???', px, sy, 15 * S, got ? TIERS[bookSel.tier].col : COL.dim, 'left', '900');
      text(TIERS[bookSel.tier].name + (got ? ' · caught x' + got : ' · not caught yet'), px, sy + 18 * S, 11 * S, COL.dim, 'left', '700');
      if (got) wrap('"' + bookSel.line + '"', 11 * S, pw).slice(0, 2).forEach((ln, i) => text(ln, px, sy + 36 * S + i * 15 * S, 11 * S, COL.paper, 'left', '700'));
    } else wrap('tap a tile. ★ = today\'s rare. legendaries live in the ??? zone.', 11 * S, pw).forEach((ln, i) => text(ln, px, sy + i * 15 * S, 11 * S, COL.dim, 'left', '700'));
  }

  function drawOver() {
    const k = Math.min(1, (performance.now() - overAt) / 300), e = 1 - Math.pow(1 - k, 3);
    ctx.fillStyle = 'rgba(16,17,20,' + (0.7 * e) + ')'; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = e;
    const cw = Math.min(W - 28 * S, 360 * S), ch = 410 * S, cx = (W - cw) / 2, cy = Math.max(10 * S, (H - ch) / 2) + (1 - e) * 24 * S;
    roundRect(cx, cy, cw, ch, 14 * S); ctx.fillStyle = '#16171c'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = COL.lime; ctx.stroke();
    text("time's up", W / 2, cy + 30 * S, 14 * S, COL.lilac, 'center', '900');
    text(String(score), W / 2, cy + 82 * S, 52 * S, COL.lime, 'center', '900');
    text(newBest ? 'new personal best!' : 'best: ' + best, W / 2, cy + 104 * S, 12 * S, newBest ? COL.gold : COL.dim, 'center', '700');
    const top = bestCatch();
    if (top) {
      drawSprite(ctx, top.it, W / 2, cy + 160 * S + Math.sin(t * 3) * 3 * S, 72 * S);
      text('best catch: ' + top.it.name, W / 2, cy + 214 * S, 14 * S, TIERS[top.it.tier].col, 'center', '900');
    } else {
      drawSprite(ctx, BYID.seaweed, W / 2, cy + 160 * S, 72 * S, 's');
      text('caught: nothing. the pond wins.', W / 2, cy + 214 * S, 13 * S, COL.dim, 'center', '900');
    }
    text(catches.length + (catches.length === 1 ? ' catch' : ' catches') + ' · best streak ' + bestStreak + ' · ' + newOnes + ' new', W / 2, cy + 236 * S, 11 * S, COL.paper, 'center', '700');
    text('book ' + bookCount() + '/' + ITEMS.length, W / 2, cy + 254 * S, 11 * S, COL.dim, 'center', '700');
    const bw = (cw - 48 * S) / 2, bx = cx + 16 * S, by = cy + 272 * S;
    button('again', 'again (space)', bx, by, cw - 32 * S, 40 * S, COL.lime);
    button('share', shareMsgT > 0 ? shareMsg : 'share (s)', bx, by + 50 * S, bw, 34 * S, COL.lilac);
    button('book', 'book (b)', bx + bw + 16 * S, by + 50 * S, bw, 34 * S, COL.paper);
    btns.next = { x: bx, y: by + 92 * S, w: cw - 32 * S, h: 26 * S };
    text('play next ▸', W / 2, by + 110 * S, 13 * S, COL.lime, 'center', '900');
    ctx.globalAlpha = 1;
  }

  // ---------- share card ----------
  function shareText() {
    const top = bestCatch();
    return `reel weird: ${score} pts · ${catches.length} catches${top ? ' · best catch: ' + top.it.name + ' (' + TIERS[top.it.tier].name + ')' : ''}\ncan you fish up something weirder? computercooked.com/games/reel-weird`;
  }
  function card() {
    const cvs = document.createElement('canvas'); cvs.width = 1080; cvs.height = 1350;
    const g = cvs.getContext('2d');
    let gr = g.createLinearGradient(0, 0, 0, 1350); gr.addColorStop(0, COL.sky1); gr.addColorStop(0.42, COL.sky2); gr.addColorStop(0.42, COL.water1); gr.addColorStop(1, COL.water2);
    g.fillStyle = gr; g.fillRect(0, 0, 1080, 1350);
    g.font = '900 110px ' + FONT; g.textAlign = 'center';
    g.fillStyle = '#5e4a9e'; g.fillText('reel weird', 548, 168); g.fillStyle = COL.lime; g.fillText('reel weird', 540, 160);
    const top = bestCatch();
    const it = top ? top.it : BYID.seaweed;
    if (top && it.tier >= 2) { g.fillStyle = TIERS[it.tier].col; g.globalAlpha = 0.16; g.beginPath(); g.arc(540, 520, 300, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
    drawSprite(g, it, 540, 520, 460, top ? 'n' : 's');
    g.font = '900 60px ' + FONT; g.fillStyle = top ? TIERS[it.tier].col : COL.dim;
    g.fillText(top ? it.name : 'caught nothing', 540, 840);
    g.font = '800 38px ' + FONT; g.fillStyle = COL.dim; g.fillText(top ? TIERS[it.tier].name + ' catch' : 'the pond wins', 540, 896);
    g.font = '900 170px ' + FONT; g.fillStyle = COL.paper; g.fillText(String(score), 540, 1080);
    g.font = '800 40px ' + FONT; g.fillStyle = COL.lilac; g.fillText(catches.length + ' catches · book ' + bookCount() + '/' + ITEMS.length, 540, 1150);
    g.font = '800 34px ' + FONT; g.fillStyle = 'rgba(245,243,237,0.55)'; g.fillText('computercooked.com/games/reel-weird', 540, 1270);
    return cvs;
  }
  async function share() {
    cc('event', 'share_clicked', { score });
    const txt = shareText();
    try {
      if (navigator.share) {
        const blob = await new Promise((r) => card().toBlob(r, 'image/png'));
        const file = blob && new File([blob], 'reel-weird.png', { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: txt }); return; }
        await navigator.share({ text: txt }); return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(txt); ok = true; } } catch (e) { ok = false; }
    let saved = false;
    try { const a = document.createElement('a'); a.href = card().toDataURL('image/png'); a.download = 'reel-weird-' + score + '.png'; document.body.appendChild(a); a.click(); a.remove(); saved = true; } catch (e) { saved = false; }
    shareMsg = saved ? (ok ? 'saved + copied' : 'image saved') : ok ? 'text copied' : 'screenshot it'; shareMsgT = 2.5;
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    btns = { mute: btns.mute };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (shake > 0) ctx.translate((Math.random() - 0.5) * 10 * shake * S, (Math.random() - 0.5) * 10 * shake * S);
    drawScene();
    drawCrashAndLine();
    for (const p of parts) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.col; ctx.fillRect(p.x, p.y, p.size, p.size); }
    ctx.globalAlpha = 1;
    for (const f of floats) { ctx.globalAlpha = Math.min(1, f.life * 2); text(f.text, f.x, f.y, 14 * S, f.col, 'center', '900'); }
    ctx.globalAlpha = 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const onTitle = state === 'title' || (state === 'book' && bookFrom === 'title');
    if (!onTitle) drawHUD();
    drawPrompt();
    if (state === 'catch') drawReveal();
    if (state === 'title') drawTitle();
    if (state === 'over') drawOver();
    if (state === 'book') drawBook();
    if (paused) { ctx.fillStyle = 'rgba(16,17,20,0.7)'; ctx.fillRect(0, 0, W, H); text('paused', W / 2, H / 2, 30 * S, COL.lime, 'center', '900'); text('tap / space to keep fishing', W / 2, H / 2 + 26 * S, 12 * S, COL.paper, 'center', '700'); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // hub thumbnail / link-preview art, made from the game's own sprites (RW.poster(640, 360) in the console)
  function poster(w, h) {
    const cvs = document.createElement('canvas'); cvs.width = w; cvs.height = h;
    const g = cvs.getContext('2d'), u = h / 360, wy = h * 0.52;
    let gr = g.createLinearGradient(0, 0, 0, wy); gr.addColorStop(0, COL.sky1); gr.addColorStop(1, COL.sky2);
    g.fillStyle = gr; g.fillRect(0, 0, w, wy);
    gr = g.createLinearGradient(0, wy, 0, h); gr.addColorStop(0, COL.water1); gr.addColorStop(1, COL.water2);
    g.fillStyle = gr; g.fillRect(0, wy, w, h - wy);
    for (const s of stars) { g.fillStyle = 'rgba(245,243,237,0.6)'; g.fillRect(s.x * w, s.y * wy * 0.8, 2 * u, 2 * u); }
    g.fillStyle = '#e9f5c9'; g.beginPath(); g.arc(w * 0.88, h * 0.16, 22 * u, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#7a5434'; g.fillRect(0, wy - 10 * u, w * 0.2, 8 * u);
    g.fillStyle = '#4a3220'; g.fillRect(w * 0.05, wy - 2 * u, 6 * u, 40 * u); g.fillRect(w * 0.15, wy - 2 * u, 6 * u, 40 * u);
    drawSprite(g, CRASH, w * 0.09, wy - 40 * u, 64 * u);
    g.fillStyle = c.l; [[5, 5], [10, 5], [5, 6], [6, 7], [7, 7], [8, 7], [9, 7], [10, 6]].forEach(([x, y]) => g.fillRect(w * 0.09 - 32 * u + (x + 1) * 64 * u / 18, wy - 72 * u + (y + 1) * 64 * u / 18, 64 * u / 18 + 1, 64 * u / 18 + 1));
    g.strokeStyle = '#c8a46a'; g.lineWidth = 4 * u; g.beginPath(); g.moveTo(w * 0.13, wy - 40 * u); g.quadraticCurveTo(w * 0.2, wy - 120 * u, w * 0.27, wy - 130 * u); g.stroke();
    // a shark in sunglasses, mid-jump on the line
    g.strokeStyle = 'rgba(245,243,237,0.8)'; g.lineWidth = 1.5 * u; g.beginPath(); g.moveTo(w * 0.27, wy - 130 * u); g.quadraticCurveTo(w * 0.5, wy - 150 * u, w * 0.66, wy - 60 * u); g.stroke();
    g.fillStyle = 'rgba(159,214,232,0.5)'; for (let i = 0; i < 14; i++) g.fillRect(w * 0.6 + Math.sin(i * 7) * 50 * u, wy - Math.abs(Math.cos(i * 3)) * 30 * u, 4 * u, 4 * u);
    drawSprite(g, BYID.shark, w * 0.68, wy - 50 * u, 150 * u);
    [[BYID.boot, 0.66, 0.8, 50], [BYID.toaster, 0.77, 0.9, 50], [BYID.duck, 0.87, 0.74, 46], [BYID.cursed, 0.94, 0.9, 54]].forEach(([it, x, y, s]) => drawSprite(g, it, w * x, h * y, s * u));
    g.textAlign = 'left'; g.font = '900 ' + Math.round(58 * u) + 'px ' + FONT;
    g.fillStyle = '#5e4a9e'; g.fillText('reel weird', w * 0.05 + 4 * u, h - 52 * u); g.fillStyle = COL.lime; g.fillText('reel weird', w * 0.05, h - 56 * u);
    g.font = '800 ' + Math.round(16 * u) + 'px ' + FONT; g.fillStyle = COL.paper; g.fillText('60 seconds. one cursed pond.', w * 0.05, h - 26 * u);
    return cvs;
  }

  // test/debug hooks (read-only state + the same actions the inputs use)
  window.RW = {
    state: () => state, score: () => score, time: () => timeLeft, streak: () => streak, catches: () => catches.map((x) => x.it.id),
    power: () => power, tension: () => tension, progress: () => progress, daily: () => daily.id, book: () => ({ ...book }),
    items: () => ITEMS.map((it) => ({ id: it.id, tier: it.tier })), press: (x, y) => { down = true; press(x, y); }, release: () => up(),
    card: () => card().toDataURL('image/png'), poster: (w, h) => poster(w || 640, h || 360).toDataURL('image/png')
  };
})();
