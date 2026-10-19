/* +1 ram every second: you gain +1 mb per second, eat smaller processes, flee bigger ones.
   four zones behind firewalls (desktop → recycle bin → the cloud → the kernel). rival processes play by the same rules.
   between runs, spend cache on permanent upgrades. leaderboard score = max ram. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const SLUG = 'plus-one-ram';
  const URL_TXT = 'computercooked.com/games/' + SLUG;
  const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Courier New", monospace';
  const C = { carbon: '#101114', lime: '#C5FF49', lilac: '#B59AFF', paper: '#F5F3ED', red: '#ff5a5a' };
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);

  // ------------------------------------------------------------------ world
  const WH = 9000;   // world height
  const ZONES = [
    { name: 'desktop', x0: 0, x1: 3400, need: 0, min: 1, max: 400, bg: '#1d3b5c', bg2: '#16304d', tint: '#5ec8ff' },
    { name: 'recycle bin', x0: 3400, x1: 8600, need: 150, min: 40, max: 5000, bg: '#2c3a1f', bg2: '#243119', tint: '#9be36a' },
    { name: 'the cloud', x0: 8600, x1: 17500, need: 1500, min: 500, max: 70000, bg: '#3b3466', bg2: '#312b58', tint: '#c9b8ff' },
    { name: 'the kernel', x0: 17500, x1: 34000, need: 15000, min: 6000, max: 3e6, bg: '#4a1f24', bg2: '#3d191d', tint: '#ff8a7a' },
  ];
  const zoneAt = (x) => { for (let i = ZONES.length - 1; i >= 0; i--) if (x >= ZONES[i].x0) return i; return 0; };
  const rOf = (v) => 7 * Math.pow(Math.max(1, v), 0.36);
  const BIG = 1.1;   // something must be 10% bigger than you to eat you
  const speedOf = (r) => 160 * Math.pow(r / 7, 0.5);
  const relSpeed = (R, r) => R.pspd * clamp(Math.pow(R.p.r / r, 0.35), 0.55, 1.25);
  const fmt = (v) => { v = Math.floor(v); return v < 1000 ? '' + v : v < 1e6 ? (v / 1000).toFixed(v < 1e4 ? 1 : 0) + 'k' : (v / 1e6).toFixed(v < 1e7 ? 2 : 1) + 'm'; };
  const mb = (v) => { v = Math.floor(v); return v < 1024 ? v + ' mb' : v < 1048576 ? (v / 1024).toFixed(v < 10240 ? 1 : 0) + ' gb' : (v / 1048576).toFixed(2) + ' tb'; };

  // ------------------------------------------------------------------ save
  const SKEY = 'cc-plus-one-ram.v1';
  let save = { cache: 0, best: 0, runs: 0, up: {}, mute: false, spooky: null, zoneBest: 0 };
  try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && typeof s.cache === 'number') save = Object.assign(save, s); } catch (e) { /* blocked */ }
  const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
  const now0 = new Date();
  let spooky = save.spooky === null ? (now0.getMonth() === 9) : save.spooky;

  const UPS = [
    { id: 'growth', name: 'more ram sticks', desc: '+1 mb per second per level', max: 9, base: 12 },
    { id: 'speed', name: 'overclock', desc: '+8% move speed', max: 6, base: 15 },
    { id: 'magnet', name: 'garbage collector', desc: 'pulls smaller things in from further away', max: 5, base: 20 },
    { id: 'digest', name: 'compression', desc: '+15% ram from everything you eat', max: 6, base: 18 },
    { id: 'backup', name: 'system restore', desc: 'survive one bite per run (keeps half)', max: 2, base: 90 },
    { id: 'head', name: 'fast boot', desc: 'start bigger', max: 5, base: 25 },
  ];
  const lvl = (id) => save.up[id] || 0;
  const cost = (u) => Math.round(u.base * Math.pow(2.1, lvl(u.id)));

  // ------------------------------------------------------------------ cc sdk (optional)
  const cc = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* never break the game */ } };
  let ccEvents = 0;
  const ccEvent = (n, d) => { if (ccEvents++ < 18) cc((c) => c.event && c.event(n, d)); };

  // ------------------------------------------------------------------ audio
  let actx = null, master = null, hostMuted = false;
  function audioInit() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.connect(actx.destination); applyMute(); } catch (e) { actx = null; }
  }
  function applyMute() { if (master) master.gain.value = (save.mute || hostMuted) ? 0 : 0.45; }
  function tone(f, d, type, vol, f2) {
    if (!actx || !master) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(vol || 0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  let lastEat = 0;
  const SFX = {
    eat: (k) => { const n = performance.now(); if (n - lastEat < 45) return; lastEat = n; tone(330 + Math.min(900, k * 600), 0.07, 'triangle', 0.09, 660 + Math.min(1200, k * 900)); },
    big: () => { tone(220, 0.15, 'square', 0.09, 440); setTimeout(() => tone(660, 0.12, 'square', 0.07), 90); },
    hurt: () => tone(300, 0.4, 'sawtooth', 0.12, 60),
    die: () => { tone(400, 0.7, 'sawtooth', 0.14, 40); },
    unlock: () => [392, 523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'square', 0.07), i * 75)),
    warn: () => tone(140, 0.12, 'square', 0.05),
  };

  // ------------------------------------------------------------------ canvas
  let vw = 0, vh = 0, dpr = 1;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
  }
  window.addEventListener('resize', resize); resize();

  // ------------------------------------------------------------------ names + looks
  const RIVAL_NAMES = ['updatr.exe', 'toolbar_v9', 'cryptominr', 'printr_drv', 'screensavr', 'popupd', 'telemetry', 'autoplay.dll', 'bloatware', 'helper_helper', 'idle_task', 'spinner.gif', 'reg_cleanr', 'cookie_jar', 'buffering'];
  const SPOOK_NAMES = ['boo.exe', 'ghostd', 'pumpkin.dll', 'cursed_tab', 'zombie_proc', 'haunted_drv'];
  const RIVAL_COLS = ['#ff9f43', '#4ecdc4', '#ff6b9d', '#ffd23f', '#a29bfe', '#55efc4', '#fd79a8', '#74b9ff'];
  const KINDS = [
    ['bug', 'cookie', 'popup'], ['trash', 'bug', 'file'], ['packet', 'cloudlet', 'file'], ['daemon', 'packet', 'virus'],
  ];

  // ------------------------------------------------------------------ run state
  let screen = 'title';  // title | play | pause | over | shop
  let run = null;
  function newRun(demo) {
    const head = demo ? 0 : lvl('head');
    const v0 = [1, 12, 40, 110, 260, 600][head];
    const z0 = ZONES[0];
    const p = { me: true, name: 'you', v: v0, x: 700, y: WH / 2, vx: 0, vy: 0, r: rOf(v0), inv: 1.5, col: C.lime, face: 'idle', faceT: 0 };
    const R = {
      demo: !!demo, safe: !demo, t: 0, p, creatures: [], rivals: [], parts: [], pops: [], maxV: v0, kills: 0, rivalKills: 0,
      rate: 1 + (demo ? 2 : lvl('growth')), backups: demo ? 0 : lvl('backup'), zoneMax: 0, unlocked: 0, cam: { x: p.x, y: p.y, z: 1 },
      pspd: 160, shake: 0, banner: null, spawnT: 0, danger: 0, killer: null, lastScore: 0, z0,
    };
    R.cam.z = targetZoom(p.r);
    for (let i = 0; i < 6; i++) R.rivals.push(makeRival(R, true));
    for (let i = 0; i < 50; i++) spawnCreature(R, true);
    return R;
  }
  function targetZoom(r) { return (Math.min(vw, vh) * 0.06 + 14) / r; }
  function viewR(R) { return Math.hypot(vw, vh) / 2 / R.cam.z; }

  function spawnPos(R, near) {
    const p = R.p, vr = viewR(R);
    const a = Math.random() * TAU, d = near ? rnd(p.r * 3, vr * 1.4) : rnd(vr * 1.05, vr * 1.6);
    return { x: clamp(p.x + Math.cos(a) * d, 30, ZONES[ZONES.length - 1].x1 - 30), y: clamp(p.y + Math.sin(a) * d, 30, WH - 30) };
  }
  function spawnCreature(R, near) {
    const pos = spawnPos(R, near);
    const zi = zoneAt(pos.x), z = ZONES[zi];
    // values cluster around yours: mostly snacks, some threats
    let v = R.p.v * Math.pow(2, rnd(-3.4, R.t < 20 ? 1.2 : 1.7));
    if (v > R.p.v && Math.hypot(pos.x - R.p.x, pos.y - R.p.y) < viewR(R) * 0.9) v = R.p.v * rnd(0.1, 0.7);
    v = Math.round(clamp(v, z.min, z.max));
    if (v < 1) v = 1;
    const r = rOf(v);
    const x = clamp(pos.x, z.x0 + r + 4, z.x1 - r - 4);
    const kinds = KINDS[zi];
    R.creatures.push({ v, r, x, y: pos.y, vx: 0, vy: 0, zi, kind: kinds[(Math.random() * kinds.length) | 0], dir: Math.random() * TAU, dirT: rnd(1, 3), chase: 0, cool: 0, wob: Math.random() * TAU, born: 0.5 });
  }
  let rivalSeq = 0;
  function makeRival(R, near) {
    const pos = spawnPos(R, near);
    const p = R.p;
    let v = Math.max(3, Math.round(p.v * Math.pow(2, rnd(-1.2, 1.6))));
    const names = spooky ? SPOOK_NAMES.concat(RIVAL_NAMES) : RIVAL_NAMES;
    const zi = Math.min(zoneAt(pos.x), unlockedFor(v));
    const z = ZONES[zi];
    return { rival: true, name: names[(rivalSeq++) % names.length], v, r: rOf(v), x: clamp(pos.x, z.x0 + 40, z.x1 - 40), y: pos.y, vx: 0, vy: 0, rate: rnd(0.8, 2.2) * (1 + p.v / 400), col: RIVAL_COLS[rivalSeq % RIVAL_COLS.length], think: 0, tx: 0, ty: 0, mode: 'wander', inv: 1, dead: 0 };
  }
  const unlockedFor = (v) => { let u = 0; for (let i = 1; i < ZONES.length; i++) if (v >= ZONES[i].need) u = i; return u; };

  // ------------------------------------------------------------------ input
  const keys = new Set();
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
  let mouse = null;   // desktop: steer toward the cursor
  function inputVec() {
    let x = 0, y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    if (joy.active) return { x: joy.x, y: joy.y };
    if (mouse) {
      const dx = mouse.x - vw / 2, dy = mouse.y - vh / 2, d = Math.hypot(dx, dy);
      const k = clamp((d - 8) / (Math.min(vw, vh) * 0.18), 0, 1);
      return d > 0 ? { x: dx / d * k, y: dy / d * k } : { x: 0, y: 0 };
    }
    return { x: 0, y: 0 };
  }
  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code); audioInit();
    if (e.repeat) return;
    if (e.code === 'KeyM') toggleSound();
    if ((e.code === 'KeyP' || e.code === 'Escape') && (screen === 'play' || screen === 'pause')) setPause(screen === 'play');
    if ((e.code === 'Enter' || e.code === 'Space') && (screen === 'title' || screen === 'over')) startRun();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); joy.active = false; joy.id = null; if (screen === 'play') setPause(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') setPause(true); });
  canvas.addEventListener('pointerdown', (e) => {
    audioInit();
    if (e.pointerType === 'mouse') { mouse = { x: e.clientX, y: e.clientY }; return; }
    if (joy.id !== null) return;
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; joy.active = true; mouse = null;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') { mouse = { x: e.clientX, y: e.clientY }; return; }
    if (e.pointerId !== joy.id) return;
    const R0 = Math.max(40, Math.min(vw, vh) * 0.09);
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > R0) { joy.ox += dx / d * (d - R0); joy.oy += dy / d * (d - R0); dx = e.clientX - joy.ox; dy = e.clientY - joy.oy; }
    const k = Math.min(1, Math.hypot(dx, dy) / R0), a = Math.atan2(dy, dx);
    joy.x = k < 0.1 ? 0 : Math.cos(a) * k; joy.y = k < 0.1 ? 0 : Math.sin(a) * k;
  });
  const endJoy = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.active = false; joy.x = joy.y = 0; } };
  canvas.addEventListener('pointerup', endJoy); canvas.addEventListener('pointercancel', endJoy);
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') mouse = null; });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { hostMuted = !!d.muted; applyMute(); }
    else if (d.type === 'cc-restart') startRun();
    else if (d.type === 'cc-pause') { if (d.paused === false) setPause(false); else setPause(true); }
  });

  // ------------------------------------------------------------------ bot (title attract + QA)
  function botVec(R) {
    const p = R.p; let fx = 0, fy = 0, best = null, bestS = 0;
    const sense = p.r * 8 + 260;
    const all = R.creatures.concat(R.rivals);
    for (const e of all) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      if (d > sense + e.r) continue;
      if (e.v > p.v * BIG) { const w = Math.pow(sense / Math.max(20, d - e.r - p.r), 2); fx -= dx / d * w; fy -= dy / d * w; }
      else if (e.rival ? e.v * BIG < p.v : e.v < p.v) { const s = e.v / (d + 50); if (s > bestS) { bestS = s; best = e; } }
    }
    if (best) { const dx = best.x - p.x, dy = best.y - p.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * 1.5; fy += dy / d * 1.5; }
    // head for the next unlocked zone
    const zi = zoneAt(p.x), uz = unlockedFor(p.v);
    if (uz > zi) fx += 0.8;
    if (p.y < 300) fy += 1; if (p.y > WH - 300) fy -= 1;
    const l = Math.hypot(fx, fy);
    return l > 0.01 ? { x: fx / l, y: fy / l } : { x: Math.cos(R.t * 0.3), y: Math.sin(R.t * 0.4) };
  }

  // ------------------------------------------------------------------ simulation
  function moveEnt(e, ix, iy, spd, dt, zMax) {
    const k = Math.min(1, dt * 6);
    e.vx += (ix * spd - e.vx) * k; e.vy += (iy * spd - e.vy) * k;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.y = clamp(e.y, e.r, WH - e.r);
    const xmax = ZONES[zMax].x1 - e.r;
    e.x = clamp(e.x, e.r, Math.min(xmax, ZONES[ZONES.length - 1].x1 - e.r));
  }
  function grow(R, e, add) { e.v += add; e.r = rOf(e.v); }
  function step(R, dt, input) {
    R.t += dt;
    const p = R.p;
    // player
    if (!R.dead) {
      grow(R, p, R.rate * dt);
      const spd = speedOf(p.r) * (1 + 0.08 * (R.demo ? 2 : lvl('speed')));
      R.pspd = spd;
      moveEnt(p, input.x, input.y, spd, dt, unlockedFor(p.v));
      if (p.inv > 0) p.inv -= dt;
      if (p.v > R.maxV) R.maxV = p.v;
      const zi = zoneAt(p.x); if (zi > R.zoneMax) R.zoneMax = zi;
      const uz = unlockedFor(p.v);
      if (uz > R.unlocked) { R.unlocked = uz; if (!R.demo) { R.banner = { t: 2.6, a: 'firewall down', b: ZONES[uz].name + ' is open →' }; SFX.unlock(); ccEvent('zone_unlocked', { zone: uz, t: Math.round(R.t) }); } }
    }
    const magR = p.r * (1.6 + 0.6 * (R.demo ? 1 : lvl('magnet'))) + 30;
    // creatures
    let danger = 0;
    for (const c of R.creatures) {
      if (c.dead) continue;
      if (c.born > 0) c.born -= dt;
      c.wob += dt * 5;
      const dx = p.x - c.x, dy = p.y - c.y, d = Math.hypot(dx, dy) || 1;
      const sense = c.r * 5 + 240;
      let ix = Math.cos(c.dir), iy = Math.sin(c.dir), sp = 0.35;
      c.dirT -= dt; if (c.dirT <= 0) { c.dir += rnd(-1.4, 1.4); c.dirT = rnd(1, 3); }
      if (c.cool > 0) c.cool -= dt;
      if (!R.dead && d < sense) {
        if (c.v > p.v * BIG && p.inv <= 0) {   // hunt you (for a while)
          if (c.chase <= 0 && c.cool <= 0) c.chase = rnd(2, 3.5);
          if (c.chase > 0) { c.chase -= dt; ix = dx / d; iy = dy / d; sp = 0.8; if (c.chase <= 0) c.cool = rnd(2, 4); if (d < p.r + c.r + 160) danger = Math.max(danger, 1 - (d - p.r - c.r) / 160); }
        } else if (c.v < p.v) {   // flee, and the magnet drags it in
          ix = -dx / d; iy = -dy / d; sp = 0.55;
          if (d < magR + c.r) { const pull = (1 - d / (magR + c.r)) * 900 * dt; c.x += dx / d * pull; c.y += dy / d * pull; }
        }
      }
      const spd = relSpeed(R, c.r) * sp;
      const k = Math.min(1, dt * 4);
      c.vx += (ix * spd - c.vx) * k; c.vy += (iy * spd - c.vy) * k;
      c.x += c.vx * dt; c.y += c.vy * dt;
      const z = ZONES[c.zi];
      if (c.x < z.x0 + c.r) { c.x = z.x0 + c.r; c.dir = 0; } if (c.x > z.x1 - c.r) { c.x = z.x1 - c.r; c.dir = Math.PI; }
      if (c.y < c.r) { c.y = c.r; c.dir = Math.PI / 2; } if (c.y > WH - c.r) { c.y = WH - c.r; c.dir = -Math.PI / 2; }
    }
    R.danger = danger;
    // rivals
    for (const rv of R.rivals) {
      if (rv.dead) { rv.dead -= dt; if (rv.dead <= 0) Object.assign(rv, makeRival(R, false)); continue; }
      grow(R, rv, rv.rate * dt);
      if (rv.inv > 0) rv.inv -= dt;
      rv.think -= dt;
      if (rv.think <= 0) {
        rv.think = rnd(0.2, 0.4);
        const sense = rv.r * 7 + 260;
        let fx = 0, fy = 0, best = null, bestS = 0;
        const consider = (e) => {
          if (e === rv || e.dead) return;
          const dx = e.x - rv.x, dy = e.y - rv.y, d = Math.hypot(dx, dy) || 1;
          if (d > sense + e.r) return;
          if (e.v > rv.v * BIG) { const w = Math.pow(sense / Math.max(20, d - e.r - rv.r), 2); fx -= dx / d * w; fy -= dy / d * w; }
          else if (e.v * BIG < rv.v || (!e.rival && !e.me && e.v < rv.v)) { const s = e.v / (d + 60) * (e.me ? 1.4 : 1); if (s > bestS) { bestS = s; best = e; } }
        };
        for (const c of R.creatures) consider(c);
        for (const o of R.rivals) consider(o);
        if (!R.dead && p.inv <= 0) consider(p);
        if (best) { const dx = best.x - rv.x, dy = best.y - rv.y, d = Math.hypot(dx, dy) || 1; fx += dx / d * 1.4; fy += dy / d * 1.4; }
        if (unlockedFor(rv.v) > zoneAt(rv.x)) fx += 0.6;
        const l = Math.hypot(fx, fy);
        if (l > 0.01) { rv.tx = fx / l; rv.ty = fy / l; } else { const a = Math.random() * TAU; rv.tx = Math.cos(a) * 0.5; rv.ty = Math.sin(a) * 0.5; }
      }
      moveEnt(rv, rv.tx, rv.ty, relSpeed(R, rv.r) * (rv.v > p.v ? 0.86 : 1), dt, unlockedFor(rv.v));
      // far-away rivals get recycled near you so the leaderboard stays alive
      if (Math.hypot(rv.x - p.x, rv.y - p.y) > viewR(R) * 3.5) Object.assign(rv, makeRival(R, false));
    }
    // eating
    const eaters = R.dead ? R.rivals : [p].concat(R.rivals);
    for (const a of eaters) {
      if (a.dead) continue;
      for (const c of R.creatures) {
        if (c.dead || c.v >= a.v || c.born > 0) continue;
        const d = Math.hypot(c.x - a.x, c.y - a.y);
        if (d < a.r + c.r * 0.2) eat(R, a, c);
      }
    }
    // rivals vs rivals vs you
    const fighters = R.dead ? R.rivals : [p].concat(R.rivals);
    for (let i = 0; i < fighters.length; i++) {
      const a = fighters[i]; if (a.dead) continue;
      for (let j = 0; j < fighters.length; j++) {
        const b = fighters[j]; if (i === j || b.dead || a.dead || b.v * BIG >= a.v || (b.inv > 0)) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < a.r - b.r * 0.3) eat(R, a, b);
      }
    }
    // creatures bite you
    if (!R.dead && p.inv <= 0) {
      for (const c of R.creatures) {
        if (c.dead || c.v <= p.v * BIG) continue;
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        if (d < c.r - p.r * 0.3) { bitten(R, c); break; }
      }
    }
    // housekeeping: despawn far creatures, keep the population topped up
    const vr = viewR(R);
    R.creatures = R.creatures.filter((c) => !c.dead && Math.hypot(c.x - p.x, c.y - p.y) < vr * 2.2);
    const want = Math.round(48 + 24 * Math.min(1, vw * vh / 900000));
    R.spawnT -= dt;
    while (R.creatures.length < want && R.spawnT <= 0) { spawnCreature(R, false); if (R.creatures.length > want - 8) R.spawnT = 0.08; }
    // fx
    for (let i = R.parts.length - 1; i >= 0; i--) { const q = R.parts[i]; q.t -= dt; if (q.t <= 0) { R.parts.splice(i, 1); continue; } q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.9; q.vy *= 0.9; }
    for (let i = R.pops.length - 1; i >= 0; i--) { const q = R.pops[i]; q.t -= dt; q.y -= 40 * dt / R.cam.z; if (q.t <= 0) R.pops.splice(i, 1); }
    if (R.shake > 0) R.shake -= dt;
    if (R.banner) { R.banner.t -= dt; if (R.banner.t <= 0) R.banner = null; }
    if (p.faceT > 0) { p.faceT -= dt; if (p.faceT <= 0) p.face = 'idle'; }
    // camera
    const z = targetZoom(p.r);
    R.cam.z += (z - R.cam.z) * Math.min(1, dt * 2);
    R.cam.x += (p.x - R.cam.x) * Math.min(1, dt * 8);
    R.cam.y += (p.y - R.cam.y) * Math.min(1, dt * 8);
  }
  function eat(R, a, b) {
    if (b.me) { bitten(R, a); return; } // the player is never marked eaten here: bitten() decides (safe mode / restore / death)
    b.dead = b.rival ? 3 : 1;
    const gain = b.v * (a.me ? 0.5 * (1 + 0.15 * (R.demo ? 1 : lvl('digest'))) : 0.32) + 1;
    grow(R, a, gain);
    if (a.me) {
      R.kills++;
      const k = b.v / a.v;
      SFX.eat(k);
      if (b.rival) { R.rivalKills++; SFX.big(); R.shake = 0.25; R.pops.push({ x: b.x, y: b.y, t: 1.4, txt: 'ate ' + b.name, big: 1 }); ccEvent('ate_rival', { v: Math.round(b.v) }); }
      else R.pops.push({ x: a.x + rnd(-0.4, 0.4) * a.r, y: a.y - a.r * 1.25, t: 0.7, txt: '+' + fmt(gain) });
      for (let i = 0; i < 6; i++) { const ang = Math.random() * TAU, s = rnd(40, 160) / R.cam.z * 0.6; R.parts.push({ x: b.x, y: b.y, vx: Math.cos(ang) * s, vy: Math.sin(ang) * s, t: 0.35, c: b.rival ? b.col : ZONES[zoneAt(b.x)].tint, s: Math.max(2, b.r * 0.25) }); }
    }
  }
  function bitten(R, by) {
    const p = R.p;
    if (R.dead || p.inv > 0) return;
    const safe = R.safe && R.t < 25;
    if (safe || R.backups > 0) {
      if (safe) R.safe = false; else R.backups--;
      p.v = Math.max(1, p.v * (safe ? 0.7 : 0.5)); p.r = rOf(p.v); p.inv = 2.5; p.face = 'hit'; p.faceT = 1;
      R.shake = 0.4; SFX.hurt(); R.banner = safe ? { t: 2.2, a: 'safe mode', b: 'first bite is free. red = bigger. run.' } : { t: 2, a: 'system restore', b: 'you lost half. you are alive. ish.' };
      ccEvent('backup_used', { v: Math.round(p.v) });
      // shove away from the biter
      const dx = p.x - by.x, dy = p.y - by.y, d = Math.hypot(dx, dy) || 1; p.x += dx / d * (by.r + p.r); p.y += dy / d * (by.r + p.r);
      return;
    }
    R.dead = true; R.killer = by; p.face = 'cooked'; R.shake = 0.5; SFX.die();
    R.deadT = 1.2;
  }

  // ------------------------------------------------------------------ run flow
  let lastScoreSent = 0;
  function startRun() {
    audioInit();
    run = newRun(false);
    screen = 'play'; ccEvents = 0;
    ['title', 'over', 'shop', 'pause'].forEach((id) => show(id, false));
    $('pauseBtn').style.display = 'block';
    save.runs++; persist();
    cc((c) => c.start && c.start());
  }
  function endRun(completed) {
    const R = run;
    screen = 'over'; $('pauseBtn').style.display = 'none';
    const score = Math.floor(R.maxV);
    const earned = Math.round(Math.pow(R.maxV, 0.4) + R.kills * 0.2 + R.rivalKills * 3);
    save.cache += earned;
    const isBest = score > save.best;
    if (isBest) save.best = score;
    save.zoneBest = Math.max(save.zoneBest, R.zoneMax);
    persist();
    cc((c) => c.score && c.score(score));
    cc((c) => c.end && c.end({ score, durationMs: Math.round(R.t * 1000), completed: !!completed }));
    const rank = 1 + R.rivals.filter((r) => !r.dead && r.v > R.maxV).length;
    lastResult = { score, t: R.t, zone: R.zoneMax, kills: R.kills, rivalKills: R.rivalKills, killer: R.killer ? (R.killer.rival ? R.killer.name : 'a ' + R.killer.kind + ' (' + fmt(R.killer.v) + ')') : null, isBest };
    $('overTitle').textContent = completed === false ? 'run ended.' : R.killer && R.killer.rival ? 'eaten by ' + R.killer.name + '.' : 'process terminated.';
    $('overSub').textContent = isBest ? 'new best. the task manager is concerned.' : 'best: ' + mb(save.best) + '. so close. relatively.';
    const st = (v, l) => `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`;
    $('stats').innerHTML = st(mb(score), 'max ram') + st(fmtT(R.t), 'uptime') + st(ZONES[R.zoneMax].name.replace('the ', ''), 'deepest zone') + st(R.kills, 'eaten') + st(R.rivalKills, 'rivals eaten') + st('#' + rank, 'final rank');
    $('earnTxt').textContent = earned;
    try { $('card').src = drawCard(lastResult).toDataURL('image/png'); } catch (e) { /* ignore */ }
    show('over', true);
  }
  const fmtT = (t) => Math.floor(t / 60) + ':' + ('0' + Math.floor(t % 60)).slice(-2);
  function setPause(on) {
    if (on && screen === 'play') { screen = 'pause'; show('pause', true); keys.clear(); joy.active = false; joy.id = null; }
    else if (!on && screen === 'pause') { screen = 'play'; show('pause', false); last = performance.now(); }
  }
  function show(id, on) { $(id).classList.toggle('show', on); }
  let toastH = 0;
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastH); toastH = setTimeout(() => t.classList.remove('show'), 1600); }

  // ------------------------------------------------------------------ shop
  function renderShop() {
    $('cacheTxt').textContent = save.cache + ' cache';
    const g = $('shopGrid'); g.innerHTML = '';
    for (const u of UPS) {
      const L = lvl(u.id), max = L >= u.max, c = cost(u);
      const b = document.createElement('button');
      b.className = 'up' + (max ? ' max' : save.cache < c ? ' cant' : '');
      let pips = ''; for (let i = 0; i < u.max; i++) pips += `<i class="pip${i < L ? ' on' : ''}"></i>`;
      b.innerHTML = `<div class="n">${u.name}<span class="pips">${pips}</span></div><div class="d">${u.desc}</div><div class="c">${max ? 'maxed' : c + ' cache'}</div>`;
      b.addEventListener('click', () => {
        if (max) return;
        if (save.cache < c) { toast('not enough cache. go get eaten some more.'); return; }
        save.cache -= c; save.up[u.id] = L + 1; persist(); SFX.big(); renderShop(); syncMeta();
      });
      g.appendChild(b);
    }
  }
  function openShop() { audioInit(); renderShop(); screen = 'shop'; ['title', 'over'].forEach((id) => show(id, false)); show('shop', true); }

  // ------------------------------------------------------------------ share card
  let lastResult = null;
  const sprite = new Image(); sprite.src = 'crash.png';
  function drawCard(r) {
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1080;
    const g = cv.getContext('2d');
    g.fillStyle = C.carbon; g.fillRect(0, 0, 1080, 1080);
    // a ring of little numbers you ate
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU, rr = 430, x = 540 + Math.cos(a) * rr, y = 560 + Math.sin(a) * rr * 0.75, s = 22 + (i % 5) * 7;
      g.fillStyle = ZONES[i % 4].tint; g.globalAlpha = 0.35; g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill(); g.globalAlpha = 1;
    }
    g.fillStyle = C.lime; g.beginPath(); g.arc(540, 520, 190, 0, TAU); g.fill();
    g.imageSmoothingEnabled = false;
    if (sprite.complete && sprite.naturalWidth) g.drawImage(sprite, 0, 0, 128, 128, 420, 400, 240, 240);
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.fillStyle = C.lilac; g.font = `800 46px ${MONO}`; g.fillText('+1 ram every second', 60, 110);
    g.fillStyle = C.paper; g.font = `800 120px ${MONO}`; g.textAlign = 'center'; g.fillText(mb(r.score), 540, 830);
    g.font = `700 38px ${MONO}`; g.fillStyle = 'rgba(245,243,237,0.7)';
    g.fillText(`${fmtT(r.t)} uptime · reached ${ZONES[r.zone].name} · ate ${r.kills}`, 540, 900);
    g.fillStyle = C.lime; g.font = `700 38px ${MONO}`; g.fillText(URL_TXT, 540, 1030);
    return cv;
  }
  async function share() {
    if (!lastResult) return;
    const text = `i grew to ${mb(lastResult.score)} of ram in ${fmtT(lastResult.t)} and reached ${ZONES[lastResult.zone].name}. +1 every second. ${URL_TXT}`;
    ccEvent('share_clicked', { score: lastResult.score });
    try {
      if (navigator.share) {
        let files = null;
        try { const blob = await new Promise((res) => drawCard(lastResult).toBlob(res, 'image/png')); files = [new File([blob], SLUG + '.png', { type: 'image/png' })]; } catch (e) { files = null; }
        if (files && navigator.canShare && navigator.canShare({ files })) await navigator.share({ text, files }); else await navigator.share({ text });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('copied. go brag.'); } catch (e) { toast('copy blocked. screenshot it.'); }
  }

  // ------------------------------------------------------------------ rendering
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function render(R, dt) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cam = R.cam, z = cam.z, p = R.p;
    const zi = zoneAt(cam.x), Z = ZONES[zi];
    ctx.fillStyle = Z.bg2; ctx.fillRect(0, 0, vw, vh);
    let sx = 0, sy = 0; if (R.shake > 0) { sx = rnd(-1, 1) * R.shake * 18; sy = rnd(-1, 1) * R.shake * 18; }
    ctx.save();
    ctx.translate(vw / 2 + sx, vh / 2 + sy); ctx.scale(z, z); ctx.translate(-cam.x, -cam.y);
    const hw = vw / 2 / z, hh = vh / 2 / z, L = cam.x - hw, Rr = cam.x + hw, T = cam.y - hh, B = cam.y + hh;
    // zone backgrounds
    for (const zz of ZONES) {
      if (zz.x1 < L || zz.x0 > Rr) continue;
      ctx.fillStyle = zz.bg; ctx.fillRect(Math.max(zz.x0, L), Math.max(0, T), Math.min(zz.x1, Rr) - Math.max(zz.x0, L), Math.min(WH, B) - Math.max(0, T));
    }
    // grid that keeps a readable spacing at any zoom
    const step = Math.pow(2, Math.round(Math.log2(70 / z)));
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1.5 / z; ctx.beginPath();
    for (let x = Math.floor(L / step) * step; x < Rr; x += step) { ctx.moveTo(x, Math.max(0, T)); ctx.lineTo(x, Math.min(WH, B)); }
    for (let y = Math.floor(Math.max(0, T) / step) * step; y < Math.min(WH, B); y += step) { ctx.moveTo(L, y); ctx.lineTo(Rr, y); }
    ctx.stroke();
    // world edges
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; if (T < 0) ctx.fillRect(L, T, Rr - L, -T); if (B > WH) ctx.fillRect(L, WH, Rr - L, B - WH);
    // firewalls
    for (let i = 1; i < ZONES.length; i++) {
      const zz = ZONES[i]; if (zz.x0 < L - 400 / z || zz.x0 > Rr + 400 / z) continue;
      const open = p.v >= zz.need;
      ctx.fillStyle = open ? 'rgba(197,255,73,0.25)' : 'rgba(255,90,90,0.55)';
      const w = 14 / z; ctx.fillRect(zz.x0 - w / 2, Math.max(0, T), w, Math.min(WH, B) - Math.max(0, T));
      ctx.save(); ctx.translate(zz.x0, cam.y); ctx.scale(1 / z, 1 / z);
      ctx.fillStyle = open ? C.lime : C.red; ctx.font = `800 15px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(open ? zz.name + ' →' : 'firewall · need ' + mb(zz.need), 0, -vh * 0.32);
      ctx.restore();
    }
    // creatures
    const pv = p.v;
    for (const c of R.creatures) {
      if (c.dead || c.x + c.r < L || c.x - c.r > Rr || c.y + c.r < T || c.y - c.r > B) continue;
      drawBlob(c.x, c.y, c.r, c.v, c.v < pv ? 'food' : c.v > pv * BIG ? 'threat' : 'even', ZONES[c.zi].tint, c.kind, c.wob, z, c.chase > 0 && c.v > pv * BIG);
    }
    // rivals
    for (const rv of R.rivals) {
      if (rv.dead || rv.x + rv.r < L || rv.x - rv.r > Rr || rv.y + rv.r < T || rv.y - rv.r > B) continue;
      drawBlob(rv.x, rv.y, rv.r, rv.v, rv.v * BIG < pv ? 'food' : rv.v > pv * BIG ? 'threat' : 'even', rv.col, 'rival', 0, z, false);
      ctx.save(); ctx.translate(rv.x, rv.y - rv.r); ctx.scale(1 / z, 1 / z);
      ctx.fillStyle = C.paper; ctx.font = `700 12px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(rv.name, 0, -6); ctx.restore();
    }
    // particles
    for (const q of R.parts) { ctx.globalAlpha = q.t / 0.35; ctx.fillStyle = q.c; ctx.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
    ctx.globalAlpha = 1;
    // you
    if (!R.dead || R.deadT > 0.6) drawPlayer(p, z, R);
    // popups
    for (const q of R.pops) {
      ctx.save(); ctx.translate(q.x, q.y); ctx.scale(1 / z, 1 / z); ctx.globalAlpha = Math.min(1, q.t * 2);
      ctx.fillStyle = q.big ? C.lilac : C.lime; ctx.font = `800 ${q.big ? 20 : 15}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(q.txt, 0, 0); ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // danger vignette
    if (R.danger > 0 && !R.dead) {
      const a = 0.28 * R.danger * (0.7 + 0.3 * Math.sin(R.t * 14));
      const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.3, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
      g.addColorStop(0, 'rgba(255,60,60,0)'); g.addColorStop(1, `rgba(255,60,60,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh);
    }
    if (spooky) { const g = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.25, vw / 2, vh / 2, Math.max(vw, vh) * 0.75); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,0,30,0.55)'); ctx.fillStyle = g; ctx.fillRect(0, 0, vw, vh); }
    if (!R.demo) drawHud(R);
  }
  function drawBlob(x, y, r, v, rel, col, kind, wob, z, hunting) {
    ctx.save(); ctx.translate(x, y);
    const ring = rel === 'food' ? '#3ddc84' : rel === 'threat' ? C.red : '#cfcfcf';
    // body
    if (kind === 'virus' || kind === 'bug' || kind === 'daemon') {
      ctx.fillStyle = col; ctx.beginPath();
      const n = kind === 'bug' ? 6 : 10;
      for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU + wob * 0.1, rr2 = i % 2 ? r : r * 0.82; ctx.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); }
      ctx.fill();
    } else if (kind === 'file' || kind === 'popup' || kind === 'packet') {
      ctx.fillStyle = col; rr(ctx, -r * 0.82, -r * 0.82, r * 1.64, r * 1.64, r * 0.3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(-r * 0.82, -r * 0.82, r * 1.64, r * 0.35);
    } else {
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r * (1 + Math.sin(wob) * 0.03), 0, TAU); ctx.fill();
    }
    if (spooky && kind !== 'rival') { ctx.fillStyle = '#ff9a3c'; ctx.fillRect(-r * 0.08, -r * 1.12, r * 0.16, r * 0.28); }
    ctx.lineWidth = Math.max(2.5 / z, r * 0.1); ctx.strokeStyle = ring; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    // eyes
    const ey = -r * 0.18, ex = r * 0.3, es = r * 0.16;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-ex, ey, es, 0, TAU); ctx.arc(ex, ey, es, 0, TAU); ctx.fill();
    ctx.fillStyle = C.carbon; ctx.beginPath(); ctx.arc(-ex, ey + es * 0.2, es * 0.55, 0, TAU); ctx.arc(ex, ey + es * 0.2, es * 0.55, 0, TAU); ctx.fill();
    if (rel === 'threat') { ctx.strokeStyle = C.carbon; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.moveTo(-ex - es, ey - es * 1.4); ctx.lineTo(-ex + es, ey - es * 0.7); ctx.moveTo(ex + es, ey - es * 1.4); ctx.lineTo(ex - es, ey - es * 0.7); ctx.stroke(); }
    // number
    const fs = Math.max(9 / z, r * 0.5);
    ctx.fillStyle = C.carbon; ctx.font = `800 ${fs}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(v), 0, r * 0.38);
    if (hunting) { ctx.fillStyle = C.red; ctx.font = `800 ${Math.max(14 / z, r * 0.6)}px ${MONO}`; ctx.fillText('!', 0, -r - Math.max(10 / z, r * 0.4)); }
    ctx.restore();
  }
  function drawPlayer(p, z, R) {
    ctx.save(); ctx.translate(p.x, p.y);
    if (p.inv > 0 && ((R.t * 12) | 0) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(197,255,73,0.18)'; ctx.beginPath(); ctx.arc(0, 0, p.r * 1.25, 0, TAU); ctx.fill();
    ctx.fillStyle = C.lime; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, TAU); ctx.fill();
    ctx.imageSmoothingEnabled = false;
    const fr = p.face === 'hit' ? 128 : p.face === 'cooked' ? 256 : 0;
    if (sprite.complete && sprite.naturalWidth) ctx.drawImage(sprite, fr, 0, 128, 128, -p.r * 0.62, -p.r * 0.86, p.r * 1.24, p.r * 1.24);
    if (spooky) { ctx.fillStyle = '#5b2f80'; ctx.beginPath(); ctx.moveTo(-p.r * 0.5, -p.r * 0.82); ctx.lineTo(p.r * 0.5, -p.r * 0.82); ctx.lineTo(p.r * 0.1, -p.r * 1.6); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff9a3c'; ctx.fillRect(-p.r * 0.38, -p.r * 0.97, p.r * 0.76, p.r * 0.12); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.carbon; ctx.font = `800 ${Math.max(10 / z, p.r * 0.34)}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(fmt(p.v), 0, p.r * 0.6);
    ctx.restore();
  }
  function drawHud(R) {
    const s = Math.max(0.8, Math.min(1.25, Math.min(vw, vh) / 600)), p = R.p;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.font = `800 ${Math.round(40 * s)}px ${MONO}`; ctx.fillStyle = C.carbon; ctx.fillText(mb(p.v), vw / 2 + 2, 12 + 2);
    ctx.fillStyle = C.lime; ctx.fillText(mb(p.v), vw / 2, 12);
    ctx.font = `700 ${Math.round(12 * s)}px ${MONO}`; ctx.fillStyle = C.paper;
    const zi = zoneAt(p.x);
    ctx.fillText(`+${R.rate}/s · ${ZONES[zi].name}` + (R.backups ? ` · ${R.backups} restore${R.backups > 1 ? 's' : ''}` : ''), vw / 2, 14 + 42 * s);
    // next firewall progress
    const nz = ZONES[R.unlocked + 1];
    if (nz) {
      const bw = Math.min(vw - 40, 240 * s), bx = vw / 2 - bw / 2, by = 32 + 50 * s;
      const prev = ZONES[R.unlocked].need || 0, f = clamp((p.v - prev) / (nz.need - prev), 0, 1);
      ctx.fillStyle = 'rgba(245,243,237,0.15)'; rr(ctx, bx, by, bw, 6 * s, 3 * s); ctx.fill();
      ctx.fillStyle = C.lilac; rr(ctx, bx, by, Math.max(6, bw * f), 6 * s, 3 * s); ctx.fill();
      ctx.font = `700 ${Math.round(10 * s)}px ${MONO}`; ctx.fillStyle = 'rgba(245,243,237,0.7)'; ctx.fillText(nz.name + ' at ' + mb(nz.need), vw / 2, by + 9 * s);
    }
    // leaderboard
    const board = [p].concat(R.rivals.filter((r) => !r.dead)).sort((a, b) => b.v - a.v);
    const rank = board.indexOf(p) + 1;
    const rows = board.slice(0, 5); if (rank > 5) rows.push(p);
    const lw = 150 * s, lx = vw - lw - 10, ly = 10;
    ctx.fillStyle = 'rgba(16,17,20,0.55)'; rr(ctx, lx, ly, lw, (rows.length * 15 + 22) * s, 8 * s); ctx.fill();
    ctx.textAlign = 'left'; ctx.font = `800 ${Math.round(10 * s)}px ${MONO}`; ctx.fillStyle = C.lilac; ctx.fillText('top processes', lx + 8 * s, ly + 6 * s);
    ctx.font = `700 ${Math.round(11 * s)}px ${MONO}`;
    rows.forEach((e, i) => {
      const y = ly + (20 + i * 15) * s, rk = board.indexOf(e) + 1;
      ctx.fillStyle = e.me ? C.lime : C.paper;
      const nm = (rk + '. ' + e.name).slice(0, 15);
      ctx.textAlign = 'left'; ctx.fillText(nm, lx + 8 * s, y);
      ctx.textAlign = 'right'; ctx.fillText(fmt(e.v), lx + lw - 8 * s, y);
    });
    // time
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(245,243,237,0.75)'; ctx.font = `700 ${Math.round(12 * s)}px ${MONO}`;
    ctx.fillText(fmtT(R.t), 12, 12);
    ctx.fillText('max ' + mb(R.maxV), 12, 12 + 16 * s);
    // arrow toward an open zone you haven't entered
    if (R.unlocked > zi && !R.dead) {
      const a = 0.6 + 0.4 * Math.sin(R.t * 6);
      ctx.globalAlpha = a; ctx.fillStyle = C.lime; ctx.font = `800 ${Math.round(16 * s)}px ${MONO}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(ZONES[zi + 1].name + ' →', vw - 14, vh / 2); ctx.globalAlpha = 1;
    }
    // banner
    if (R.banner) {
      const b = R.banner; ctx.globalAlpha = Math.min(1, b.t * 2);
      ctx.fillStyle = 'rgba(16,17,20,0.75)'; ctx.fillRect(0, vh * 0.32 - 34 * s, vw, 68 * s);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = C.lime; ctx.font = `800 ${Math.round(24 * s)}px ${MONO}`; ctx.fillText(b.a, vw / 2, vh * 0.32 - 10 * s);
      ctx.fillStyle = C.paper; ctx.font = `700 ${Math.round(13 * s)}px ${MONO}`; ctx.fillText(b.b, vw / 2, vh * 0.32 + 16 * s);
      ctx.globalAlpha = 1;
    }
    // first-run hint
    if (R.t < 6 && save.runs <= 2) {
      ctx.globalAlpha = Math.min(1, (6 - R.t) / 1.5);
      ctx.fillStyle = 'rgba(16,17,20,0.8)'; const tw = Math.min(vw - 24, 360 * s); rr(ctx, vw / 2 - tw / 2, vh - 92 * s, tw, 40 * s, 10 * s); ctx.fill();
      ctx.fillStyle = C.paper; ctx.font = `700 ${Math.round(13 * s)}px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('eat green. flee red. you grow every second.', vw / 2, vh - 72 * s);
      ctx.globalAlpha = 1;
    }
    // joystick
    if (joy.active) {
      const R0 = Math.max(40, Math.min(vw, vh) * 0.09);
      ctx.globalAlpha = 0.45; ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, R0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.fillStyle = C.paper; ctx.beginPath(); ctx.arc(joy.ox + joy.x * R0, joy.oy + joy.y * R0, R0 * 0.42, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------------ loop
  let last = performance.now();
  let demo = null;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    try { tick(dt); } catch (err) { console.error(err); }
  }
  function tick(dt) {
    if (screen === 'play' && run) {
      step(run, dt, run.dead ? { x: 0, y: 0 } : inputVec());
      if (!run.dead) {
        const t = performance.now();
        if (t - lastScoreSent > 1000) { lastScoreSent = t; cc((c) => c.score && c.score(Math.floor(run.maxV))); }
      } else { run.deadT -= dt; if (run.deadT <= 0) endRun(true); }
      render(run, dt);
    } else if ((screen === 'pause' || screen === 'over') && run) {
      render(run, 0);
    } else {
      if (!demo || demo.dead || demo.t > 70) demo = newRun(true);
      step(demo, dt, botVec(demo));
      render(demo, dt);
    }
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------------ menus
  function syncMeta() {
    const s = 'sound: ' + (save.mute ? 'off' : 'on');
    $('sndBtn').textContent = s; $('pSndBtn').textContent = s;
    $('spookBtn').textContent = 'spooky: ' + (spooky ? 'on' : 'off');
    $('meta').textContent = save.runs ? `best ${mb(save.best)} · ${save.cache} cache to spend` : '';
  }
  function toggleSound() { save.mute = !save.mute; applyMute(); persist(); syncMeta(); }
  $('playBtn').addEventListener('click', startRun);
  $('shopPlayBtn').addEventListener('click', startRun);
  $('againBtn').addEventListener('click', startRun);
  $('shopBtn').addEventListener('click', openShop);
  $('overShopBtn').addEventListener('click', openShop);
  $('shopBackBtn').addEventListener('click', () => { show('shop', false); screen = run && run.dead ? 'over' : 'title'; show(screen === 'over' ? 'over' : 'title', true); syncMeta(); });
  $('sndBtn').addEventListener('click', toggleSound);
  $('pSndBtn').addEventListener('click', toggleSound);
  $('spookBtn').addEventListener('click', () => { spooky = !spooky; save.spooky = spooky; persist(); syncMeta(); });
  $('pauseBtn').addEventListener('click', () => setPause(true));
  $('resumeBtn').addEventListener('click', () => setPause(false));
  $('quitBtn').addEventListener('click', () => { if (screen !== 'pause') return; show('pause', false); run.dead = true; endRun(false); });
  $('shareBtn').addEventListener('click', share);
  syncMeta();

  // QA hook
  window.__ram = { get screen() { return screen; }, get run() { return run; }, step: (dt, v) => step(run, dt, v || botVec(run)), bot: () => botVec(run), draw: () => render(run, 1 / 60), newRun, startRun, endRun, save: () => save, ZONES, rOf, speedOf };
})();
