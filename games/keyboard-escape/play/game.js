/* +1 speed keyboard escape: crash auto-runs across a giant keyboard. tap to jump. every key landed = +1 speed (x multiplier).
   fall = back to boot (speed is kept). reach esc = escape; reboot = permanent multiplier and a longer, nastier keyboard. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const canvas = $('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const SLUG = 'keyboard-escape';
  const URL_TXT = 'computercooked.com/games/' + SLUG;
  const MONO = 'ui-monospace, "SFMono-Regular", Menlo, Consolas, "Courier New", monospace';
  const C = { carbon: '#101114', lime: '#C5FF49', lilac: '#B59AFF', paper: '#F5F3ED' };

  // ------------------------------------------------------------------ physics constants (world units, y down)
  const G = 2700, VJ = 930, CUT = 270, SPACE_VJ = 1380, PW = 44, PH = 50, KH = 64, VOID = 480;
  const vxOf = (s) => 220 + 720 * (1 - Math.exp(-s / 190));     // speed number -> run velocity: climbs to ~940 so big numbers still feel big
  const AIR = 2 * VJ / G;                                          // flat-jump airtime
  const TIERS = [25, 50, 100, 250, 500, 1000, 2500, 5000];

  // ------------------------------------------------------------------ save (per-viewer convenience only)
  const SKEY = 'cc-keyboard-escape.v1';
  let save = { mult: 1, loop: 1, best: {}, topSpeed: 0, escapes: 0, mute: false, spooky: null };
  try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && s.mult) save = Object.assign(save, s); } catch (e) { /* storage blocked */ }
  const persist = () => { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { /* ignore */ } };
  // 1.7 fields (older saves just gain them): goals done (id -> day), the hat worn, days with an escape, the daily job
  if (!save.goals || typeof save.goals !== 'object') save.goals = {};
  if (!Array.isArray(save.days)) save.days = [];
  save.hat = typeof save.hat === 'string' ? save.hat : '';
  save.jobs = save.jobs | 0; save.jobStreak = save.jobStreak | 0; save.jobDay = save.jobDay || ''; save.jobLast = save.jobLast || '';
  const now0 = new Date();
  const spookyDefault = now0 < new Date(2026, 10, 1) && now0 >= new Date(2026, 9, 1);
  let spooky = save.spooky === null ? spookyDefault : save.spooky;

  // ------------------------------------------------------------------ cc sdk (optional; game works without it)
  const cc = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* never break the game */ } };

  // ------------------------------------------------------------------ 1.7: goals, hats and a daily job (a reason to come back)
  // Goal pace (cc-lead, Nov 17): about 4-5 land in a first session (esc, x2, speed 100, maybe 5 perfects or a clean
  // escape); the rest need more keyboards (5, 10) or more days (2 days, 3 daily jobs, 4 days). Each goal unlocks a hat for crash.
  const dayKey = (d) => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  const TODAY = dayKey(new Date()), YDAY = dayKey(new Date(Date.now() - 864e5));
  const HATS = { party: 'party hat', cap: 'backwards cap', prop: 'propeller cap', phones: 'headphones', halo: 'halo', antenna: 'antenna', esc: 'esc keycap', wizard: 'wizard hat', crown: 'crown', chef: 'chef hat' };
  const GOALS = [
    { id: 'esc', txt: 'reach esc', hat: 'party' },
    { id: 'x2', txt: 'reboot to x2', hat: 'cap' },
    { id: 'spd100', txt: 'hit speed 100', hat: 'prop' },
    { id: 'p5', txt: 'land 5 perfects in a row', hat: 'phones' },
    { id: 'clean', txt: 'escape with 0 falls', hat: 'halo' },
    { id: 'days2', txt: 'escape on 2 different days', hat: 'antenna' },
    { id: 'kb5', txt: 'reach keyboard 5', hat: 'esc' },
    { id: 'jobs3', txt: 'finish 3 daily jobs', hat: 'wizard' },
    { id: 'kb10', txt: 'reach keyboard 10', hat: 'crown' },
    { id: 'days4', txt: 'escape on 4 different days', hat: 'chef' },
  ];
  // the daily job: one a day, the same for everyone that day (local date)
  let runPerf = 0, runGates = 0, runBonks = 0, runLands = 0, runBoings = 0, newGoals = [], jobJust = false;
  const JOBS = [
    { txt: 'escape with 2 falls or fewer', esc: 1, ok: () => falls <= 2 },
    { txt: 'land 4 perfects in a row', ok: () => runPerf >= 4 },
    { txt: 'break 2 firewalls in one run', ok: () => runGates >= 2 },
    { txt: 'escape with no caps lock bonks', esc: 1, ok: () => runBonks === 0 },
    { txt: 'land 40 keys in one run', ok: () => runLands >= 40 },
    { txt: 'boing off 3 space bars in one run', ok: () => runBoings >= 3 },
  ];
  const JOB = JOBS[Math.floor(Date.parse(TODAY + 'T00:00:00Z') / 864e5) % JOBS.length];
  const goalsDone = () => GOALS.filter((g) => save.goals[g.id]).length;
  const nextGoal = () => GOALS.find((g) => !save.goals[g.id]) || null;
  function goalHint(g) { return g.id === 'days2' && save.days.includes(TODAY) ? ' (tomorrow)' : g.id === 'days4' || g.id === 'jobs3' ? ' (one a day)' : ''; }
  function goalDone(id, quiet) {
    if (save.goals[id]) return;
    const g = GOALS.find((x) => x.id === id); if (!g) return;
    save.goals[id] = TODAY;
    if (quiet) return;
    save.hat = g.hat; newGoals.push(g); persist();   // a fresh hat goes straight on, so you see what you won
    say('goal ✓ ' + g.txt, 'new hat: ' + HATS[g.hat], 2.6);
    goalBurst(C.lilac);
    cc((c) => c.event && c.event('goal', { id, n: goalsDone() }));
  }
  function checkGoals(atEsc) {
    if (screen !== 'play' && !atEsc) return;   // never from the title's attract demo
    if (speed >= 100) goalDone('spd100');
    if (runPerf >= 5) goalDone('p5');
    if (save.escapes >= 1) goalDone('esc');
    if (save.mult >= 2) goalDone('x2');
    if (save.loop >= 5) goalDone('kb5');
    if (save.loop >= 10) goalDone('kb10');
    if (atEsc && falls === 0) goalDone('clean');
    if (save.days.length >= 2) goalDone('days2');
    if (save.days.length >= 4) goalDone('days4');
    if (save.jobDay !== TODAY && (!JOB.esc || atEsc) && JOB.ok()) {
      save.jobDay = TODAY; save.jobs++; save.jobStreak = save.jobLast === YDAY ? save.jobStreak + 1 : 1; save.jobLast = TODAY; jobJust = true; persist();
      say('daily job ✓ ' + JOB.txt, save.jobStreak > 1 ? save.jobStreak + ' days in a row' : 'new job tomorrow', 2.6);
      goalBurst(C.lime);
      cc((c) => c.event && c.event('daily_job', { jobs: save.jobs, streak: save.jobStreak }));
      if (save.jobs >= 3) goalDone('jobs3');
    }
  }
  // a save from before 1.7 gets the goals it already earned, without fanfare
  if (save.escapes >= 1) goalDone('esc', true);
  if (save.mult >= 2) goalDone('x2', true);
  if (save.loop >= 5) goalDone('kb5', true);
  if (save.topSpeed >= 100) goalDone('spd100', true);
  if (save.loop >= 10) goalDone('kb10', true);

  // ------------------------------------------------------------------ audio (synth, no files)
  let actx = null, master = null, hostMuted = false;
  function audioInit() {
    if (actx) { if (actx.state === 'suspended') actx.resume(); return; }
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.connect(actx.destination); applyMute(); } catch (e) { actx = null; }
  }
  function applyMute() { if (master) master.gain.value = (save.mute || hostMuted) ? 0 : 0.5; }
  function tone(f, d, type, vol, f2) {
    if (!actx || !master) return;
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
    g.gain.setValueAtTime(vol || 0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + d + 0.02);
  }
  let noiseBuf = null;
  function click(pitch) {
    if (!actx || !master) return;
    if (!noiseBuf) { noiseBuf = actx.createBuffer(1, 2048, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); }
    const t = actx.currentTime, s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = 2500 + pitch * 8; f.Q.value = 2;
    g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
    tone(220 + Math.min(pitch, 600) * 1.4, 0.06, 'triangle', 0.06);
  }
  const SFX = {
    jump: () => tone(300, 0.12, 'square', 0.06, 620),
    land: (s) => click(s),
    boing: () => tone(160, 0.35, 'sine', 0.2, 900),
    bonk: () => { tone(120, 0.2, 'square', 0.14, 50); },
    fall: () => tone(500, 0.6, 'sawtooth', 0.07, 60),
    boot: () => { tone(880, 0.08, 'square', 0.05); setTimeout(() => tone(1320, 0.1, 'square', 0.05), 90); },
    esc: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'square', 0.08), i * 80)); },
  };

  // ------------------------------------------------------------------ rng + course generator
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const LETTERS = 'QWERTYUIOPASDFGHJKLZXCVBNM1234567890';
  const JOKES = ['alt', 'tab', 'ctrl', 'fn', 'del', 'ins', 'home', 'end', 'pgup', 'pgdn', 'shift', 'win', 'enter', 'f1', 'f5', 'f11', 'num', 'scrl', 'prt', 'any'];
  const SPOOK = ['boo', '🎃', 'rip', '👻', 'eek', '🦇'];

  function buildCourse(loop, mult) {
    // two passes: the first finds what this keyboard's gates demand, the second sizes every key for the speed limiter
    const probe = genCourse(loop, mult, 0);
    const cap = Math.round(Math.max(probe.maxNeed, probe.exp) * 1.25 + 30 * mult);
    const c = genCourse(loop, mult, cap); c.cap = cap; return c;
  }
  function genCourse(loop, mult, cap) {
    const rnd = mulberry32(loop * 7919 + 13);
    const keys = [];
    keys.push({ x: -420, y: 0, by: 0, w: 640, type: 'boot', label: 'boot' });
    let x = 220, y = 0, exp = 0, sinceGate = 0, lastType = 'boot', banked = 0, prevNeed = 0, lastGateI = 0, maxNeed = 0;
    const N = 24 + loop * 10;
    const firstGate = 9;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const hard = Math.min(1, 0.2 + t * 0.95 + (loop - 1) * 0.12);
      const vx = vxOf(exp * 0.9);
      let reach = vx * AIR;
      // vertical step
      let dy = (rnd() - 0.5) * 2 * (30 + 80 * hard);
      if (y + dy < -220) dy = Math.abs(dy); if (y + dy > 140) dy = -Math.abs(dy);
      if (dy < 0) reach *= 1 - Math.min(0.45, -dy / 420);              // stepping up shortens the jump
      let gap = (50 + (reach * 0.78 - 50) * hard) * (0.72 + rnd() * 0.28);
      let type = 'key';
      const r = rnd();
      sinceGate++;
      const gateDue = i >= firstGate && sinceGate >= 10 + Math.floor(rnd() * 4) && i < N - 2 && lastType === 'key';   // gates only take off from a plain key
      if (lastType === 'caps') gap *= 0.5;
      const afterSpace = lastType === 'space';
      if (afterSpace) { gap = 50; dy = 0; }   // the pad sits right after the trampoline: wherever the bounce lands, it's enter
      else if (gateDue) {
        // a speed gate: this gap needs more speed than a clean first run gives you. fall, re-run, come back faster.
        type = 'gate';
        // you arrive with the last gate's speed plus ~60% of the keys since (fast runs skip keys); one more lap banks ~60% of the keys before this gate
        const arrive = prevNeed + 0.6 * mult * (i - lastGateI);
        const need = Math.round(prevNeed === 0 ? exp + 8 * mult : arrive + 0.6 * mult * i * 0.75);
        prevNeed = need; lastGateI = i; maxNeed = need; banked = need - exp;
        gap = vxOf(need) * AIR * 0.9 - PW * 0.3; dy = 0; sinceGate = 0;
        keys[keys.length - 1].gateNeed = need;
      } else if (t > 0.12 && r < 0.11) type = 'space';
      else if (t > 0.22 && r < 0.24) type = 'caps';
      else if (t > 0.3 && r < 0.38) type = 'move';
      else if (t > 0.45 && r < 0.46) type = 'del';
      x += Math.max(36, gap); y += dy;
      const vxW = vxOf(cap ? Math.max(cap * 0.8, exp + banked) : exp * 0.9 + 40 * mult);   // keys sized for a player at the limiter
      let w = Math.max(100, vxW * 0.36) * (0.9 + rnd() * 0.5);
      if (type === 'space') w = Math.max(260, w * 1.6);
      if (afterSpace) { type = 'key'; w = Math.max(w, vxOf(cap || exp + 60 * mult) * 1.1 + 80); }   // wide landing pad: the trampoline doesn't care how fast you are
      if (type === 'caps') w = Math.max(w, vxW * 0.75 + 120);
      const label = afterSpace ? 'enter' : type === 'space' ? 'space' : type === 'caps' ? 'caps' : type === 'del' ? 'del' : rnd() < 0.18 ? JOKES[(rnd() * JOKES.length) | 0] : LETTERS[(rnd() * LETTERS.length) | 0];
      const k = { x, y, w, type: type === 'gate' ? 'key' : type, label, by: y };
      if (type === 'move') { k.amp = 40 + 50 * rnd(); k.per = 1.6 + rnd() * 1.2; k.ph = rnd() * 6.28; }
      if (type === 'caps') { k.wall = { x: x + w - 46, w: 46, h: 96 }; }
      keys.push(k);
      x += w; lastType = type === 'gate' ? 'key' : type; exp += mult;
      if (type === 'caps') x += 0; // the wall eats room on the key, the next gap stays normal
    }
    const reach = vxOf(exp * 0.9) * AIR;
    x += reach * 0.5;
    keys.push({ x, y, w: 520, type: 'esc', label: 'esc', by: y });
    for (const k of keys) { k.press = 0; k.hit = 0; k.gone = 0; k.crumble = 0; k.dy = 0; }
    return { keys, len: x, loop, banked, exp, maxNeed };
  }

  // ------------------------------------------------------------------ state
  let vw = 0, vh = 0, dpr = 1, scale = 1, portrait = false, lookF = 0.2;
  function resize() {
    const phone = window.matchMedia && matchMedia('(pointer: coarse)').matches;
    dpr = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    // 1.7: on an upright phone the world was drawn for a 560-unit-wide view (crash ~59 px). Now it's sized for 460
    // units and crash sits further left (12% in, the camera leads by his speed so he stays there), so the world is
    // ~22% bigger and you still see about as far ahead.
    portrait = vh > vw * 1.05;
    scale = portrait ? Math.min(vh / 520, vw / 460) : Math.min(vh / 520, vw / 560);
    lookF = portrait ? 0.12 : 0.2;
  }
  window.addEventListener('resize', resize); resize();

  let screen = 'title';    // title | play | pause | win
  let course = null, p = null, cam = { x: 0, y: 0 }, runT = 0, speed = 0, topSpeed = 0, falls = 0, keysHit = 0;
  let booting = 0, shake = 0, flash = 0, popups = [], parts = [], lastScoreSent = 0, scoreDirty = false, idleT = 0;
  let jumpBuf = 0, holding = false, title = { t: 0 }, tierIdx = 0, perfect = 0, banner = null, wz = 1;
  let furthest = 0, fwTold = false, fwJust = false;   // 1.5: furthest point this run (a tick on the progress bar) + the firewall explainer, once a run

  function newPlayer() { return { x: -60, y: -PH, vx: 0, vy: 0, ground: null, coyote: 0, knock: 0, face: 'idle', faceT: 0, spin: 0 }; }
  let carry = 0;
  // leaderboard score = speed gained in this run. The speed carried over from a reboot is left out, so a
  // run is scored on what it did (the in-game "top speed" still includes the carry).
  let runBase = 0;
  const runScore = () => Math.max(0, Math.round(topSpeed - runBase));
  function startRun(keepSpeed) {
    audioInit();
    if (winT) { clearTimeout(winT); winT = 0; }
    autoReady = false;
    course = buildCourse(save.loop, save.mult);
    p = newPlayer(); runT = 0; falls = 0; keysHit = 0; popups = []; parts = []; furthest = 0; fwTold = false;
    runPerf = 0; runGates = 0; runBonks = 0; runLands = 0; runBoings = 0; newGoals = []; jobJust = false; banner = null; bannerQ = [];
    if (!keepSpeed) { speed = carry; topSpeed = carry; carry = 0; }
    runBase = speed;
    tierIdx = TIERS.filter((t) => speed >= t).length; perfect = 0;
    booting = 0.6; cam.x = p.x; cam.y = p.y;
    screen = 'play'; show('title', false); show('win', false); show('pause', false); $('pauseBtn').style.display = 'block';
    SFX.boot();
    cc((c) => c.start && c.start());
    cc((c) => c.event && c.event('run_start', { loop: save.loop, mult: save.mult }));
  }
  function backToBoot() {
    falls++;
    for (const k of course.keys) { k.hit = 0; k.gone = 0; k.press = 0; k.crumble = 0; k.passed = 0; }
    p = newPlayer(); booting = 0.4; flash = 0.5; shake = Math.max(shake, 0.3);
    if (screen === 'play' && fwJust) { fwJust = false; toast('firewall: you need more speed. every lap banks more. go again.'); }
    else if (screen === 'play') toast(['back to boot. speed kept. dignity not.', 'have you tried turning it off and on again', 'rebooting… your speed survived', 'that gap was a feature'][falls % 4]);
  }
  function manualBoot() { if (screen !== 'play' || !course) return; SFX.fall(); backToBoot(); falls--; }   // a voluntary reboot doesn't count as a fall
  let winLock = 0, winT = 0, autoReady = false;
  function show(id, on) { $(id).classList.toggle('show', on); }
  let toastH = 0, bannerQ = [], jumpsMade = 0;   // 1.7: jumps this visit (the first-run "tap!" cue stops after 3)
  // 1.7: banners queue up instead of overwriting each other (a goal and a speed tier can land on the same key)
  function say(txt, sub, t) { const b = { t: t || 1.6, txt, sub }; if (banner && banner.t > 0.5) { if (bannerQ.length < 4) bannerQ.push(b); } else banner = b; }
  function goalBurst(col) {
    if (!p) return;
    for (let i = 0; i < 30; i++) { const a = Math.random() * 6.283, v = 200 + Math.random() * 380; parts.push({ x: p.x + PW / 2, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 260, t: 0.7 + Math.random() * 0.4, c: i % 3 ? col : C.paper, s: 6 + Math.random() * 6 }); }
    flash = Math.max(flash, 0.6); shake = Math.max(shake, 0.2);
  }
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastH); toastH = setTimeout(() => t.classList.remove('show'), 1500); }

  // ------------------------------------------------------------------ input
  function press() {
    audioInit(); holding = true;
    if (screen === 'title') { startRun(false); return; }
    if (screen !== 'play') return;
    jumpBuf = 0.13;
  }
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); });
  window.addEventListener('pointerup', () => { holding = false; });
  window.addEventListener('pointercancel', () => { holding = false; });
  window.addEventListener('keyup', (e) => { if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') holding = false; });
  window.addEventListener('keydown', (e) => {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Enter') {
      if (screen === 'win') { if (performance.now() > winLock) reboot(); return; }
      if (screen === 'pause') { setPause(false); return; }
      press();
    }
    if (e.code === 'KeyP' || (e.code === 'Escape' && screen !== 'title')) setPause(screen === 'play');
    if (e.code === 'KeyR' && (screen === 'play' || screen === 'pause')) { setPause(false); manualBoot(); }
    if (e.code === 'KeyM') toggleSound();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') setPause(true); });
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  function setPause(on) {
    if (on && screen === 'play') { screen = 'pause'; show('pause', true); }
    else if (!on && screen === 'pause') { screen = 'play'; show('pause', false); last = performance.now(); }
  }
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { hostMuted = !!d.muted; applyMute(); }
    else if (d.type === 'cc-restart') startRun(false);
    else if (d.type === 'cc-pause') { if (d.paused === false) setPause(false); else setPause(true); }
  });

  // ------------------------------------------------------------------ simulation
  function keyY(k, t) { return k.type === 'move' ? k.by + Math.sin(t * 6.283 / k.per + k.ph) * k.amp : k.by; }
  function addSpeed() {
    speed += save.mult; keysHit++;
    if (speed > topSpeed) topSpeed = speed;
    scoreDirty = true;
  }
  function land(k) {
    p.vy = 0; p.ground = k; p.coyote = 0.1; p.spin = 0;
    k.press = 1;
    if (!k.hit) {
      k.hit = 1; addSpeed(); runLands++;
      const off = Math.abs(p.x + PW / 2 - (k.x + k.w / 2)) / (k.w / 2);
      if (k.type === 'key' && off < 0.28) {   // stuck the landing near the middle: bonus + streak
        perfect++; addSpeed(); if (perfect % 5 === 0) addSpeed();   // +1 per perfect, +1 more every 5 in a row
        if (perfect > runPerf) runPerf = perfect;
        popups.push({ x: p.x + PW / 2, y: p.y - 40, t: 0.9, txt: 'perfect x' + perfect, big: 1 });
        for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283; parts.push({ x: p.x + PW / 2, y: k.y - 4, vx: Math.cos(a) * 320, vy: Math.sin(a) * 200 - 120, t: 0.45, c: C.lilac }); }
        shake = Math.max(shake, 0.12); tone(660 + Math.min(perfect, 10) * 60, 0.09, 'triangle', 0.05);
      } else if (k.type === 'key') perfect = 0;
      popups.push({ x: p.x + PW / 2, y: p.y - 10, t: 0.8, txt: '+' + save.mult });
      const ti = TIERS.filter((t) => speed >= t).length;
      if (ti > tierIdx && screen === 'play') { tierIdx = ti; say('speed tier ' + ti + ': ' + ['warm', 'brisk', 'zoomy', 'illegal', 'ludicrous', 'plaid', 'cosmic', 'heat death'][ti - 1], '', 1.6); flash = 0.7; SFX.esc(); cc((c) => c.event && c.event('speed_tier', { tier: ti, speed })); }
      SFX.land(speed);
      checkGoals(false);
    } else SFX.land(speed * 0.5);
    if (vxOf(speed) > 520) shake = Math.max(shake, 0.12);
    for (let i = 0; i < 5; i++) parts.push({ x: p.x + PW / 2, y: k.y, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 220, t: 0.4, c: C.lime });
    if (k.type === 'space') { p.vy = -SPACE_VJ; p.ground = null; p.bounce = true; SFX.boing(); runBoings++; checkGoals(false); popups.push({ x: p.x + PW / 2, y: p.y - 40, t: 0.9, txt: 'boing', big: 1 }); }
    if (k.type === 'del' && !k.crumble) k.crumble = 0.55;
    if (k.type === 'esc') escape();
  }
  function step(dt) {
    const t = runT;
    for (const k of course.keys) {
      const ny = keyY(k, t); k.dy = ny - k.y; k.y = ny;
      if (k.press > 0) k.press = Math.max(0, k.press - dt * 5);
      if (k.crumble > 0) { k.crumble -= dt; if (k.crumble <= 0) { k.gone = 1; if (p.ground === k) p.ground = null; } }
    }
    if (booting > 0) { booting -= dt; p.x = -60; p.y = -PH; p.vx = 0; if (booting > 0) return; }
    runT += dt;
    // horizontal
    const target = vxOf(Math.min(speed, course.cap || speed));   // past the limiter the number still climbs, crash doesn't
    if (p.knock > 0) { p.knock -= dt; p.vx = -260; }
    else p.vx += (target - p.vx) * Math.min(1, dt * 6);
    // jump
    if (jumpBuf > 0) jumpBuf -= dt;
    if (p.ground) p.coyote = 0.1; else p.coyote -= dt;
    if (jumpBuf > 0 && p.coyote > 0) { p.vy = -VJ; p.ground = null; p.coyote = 0; jumpBuf = 0; p.bounce = false; SFX.jump(); if (screen === 'play') jumpsMade++; }
    if (!p.ground && !holding && !p.bounce && p.vy < -CUT) p.vy = -CUT;   // let go early = short hop
    // integrate
    const px = p.x, py = p.y;
    p.x += p.vx * dt;
    if (p.ground) {
      const k = p.ground;
      p.y = k.y - PH;
      if (p.x + PW < k.x || p.x > k.x + k.w || k.gone) { p.ground = null; }
    }
    if (!p.ground) {
      p.vy = Math.min(p.vy + G * dt, 1600); p.y += p.vy * dt;
      p.spin += dt * (p.vy < 0 ? -2 : 2);
      if (p.vy >= 0) {
        for (const k of course.keys) {
          if (k.gone || p.x + PW < k.x + 4 || p.x > k.x + k.w - 4) continue;
          const top = k.y;
          if (py + PH <= top - (k.dy || 0) + 2 && p.y + PH >= top) { p.y = top - PH; land(k); break; }
        }
      }
    }
    // caps lock walls
    for (const k of course.keys) {
      if (!k.wall || k.gone) continue;
      const wx = k.wall.x, wt = k.y - k.wall.h;
      if (p.x + PW > wx && px + PW <= wx + 2 && p.y + PH > wt + 6 && p.y < k.y) {
        p.x = wx - PW; p.knock = 0.28; speed = Math.max(0, speed - 4 * save.mult); scoreDirty = true; runBonks++;
        shake = 0.3; p.face = 'cooked'; p.faceT = 0.6; SFX.bonk();
        popups.push({ x: wx, y: wt - 20, t: 1, txt: 'caps lock’d -' + 4 * save.mult, big: 1 });
      }
      // standing on top of the wall
      if (!p.ground && p.vy >= 0 && p.x + PW > wx && p.x < wx + k.wall.w && py + PH <= wt + 2 && p.y + PH >= wt) { p.y = wt - PH; p.vy = 0; p.ground = { x: wx, w: k.wall.w, y: wt, type: 'wall', by: wt }; }
    }
    // fell into the void
    if (p.y > lowestNear(p.x) + VOID) { SFX.fall(); perfect = 0; backToBoot(); }
    // gate break-through: crossing a gate edge fast enough gets a moment
    for (const k of course.keys) {
      if (!k.gateNeed || k.passed) continue;
      const gx = k.x + k.w + 62;   // the firewall stands just past the takeoff key
      if (px + PW <= gx && p.x + PW > gx) {
        if (speed >= k.gateNeed) {
          k.passed = 1; say('access granted', '', 1.2); shake = 0.3; runGates++;
          // 1.7: the firewall shatters (reads with the sound off)
          for (let i = 0; i < 26; i++) parts.push({ x: gx + (Math.random() - 0.5) * 10, y: k.y - Math.random() * 420, vx: 200 + Math.random() * 520, vy: (Math.random() - 0.6) * 500, t: 0.6 + Math.random() * 0.3, c: Math.random() < 0.5 ? C.lime : '#ff5a5a', s: 5 + Math.random() * 7 });
          flash = Math.max(flash, 0.5); checkGoals(false);
        }
        else { p.x = k.x + k.w + 6; p.vx = 0; p.knock = 0; p.vy = Math.max(p.vy, 250); p.ground = null; jumpBuf = 0; p.coyote = 0; p.face = 'cooked'; p.faceT = 0.8; SFX.bonk(); shake = Math.max(shake, 0.3); popups.push({ x: gx, y: p.y - 30, t: 1.1, txt: 'firewall: need ' + k.gateNeed, big: 1 }); if (!fwTold) { fwTold = true; fwJust = true; } }
      }
    }
    if (screen === 'play' && p.x > furthest) furthest = p.x;
    if (p.faceT > 0) { p.faceT -= dt; if (p.faceT <= 0) p.face = 'idle'; }
    if (!p.ground && p.vy > 200 && p.face === 'idle') p.face = 'hit';
    if (p.ground && p.face === 'hit') p.face = 'idle';
  }
  function lowestNear(x) {
    let m = 0;
    for (const k of course.keys) if (k.x < x + 1400 && k.x + k.w > x - 1400) m = Math.max(m, k.by + (k.amp || 0));
    return m;
  }
  function escape() {
    screen = 'win'; $('pauseBtn').style.display = 'none';
    SFX.esc(); flash = 1;
    const ms = Math.round(runT * 1000), loop = save.loop;
    const prev = save.best[loop];
    const isBest = !prev || ms < prev;
    if (isBest) save.best[loop] = ms;
    save.topSpeed = Math.max(save.topSpeed, topSpeed); save.escapes++;
    if (!save.days.includes(TODAY)) { save.days.push(TODAY); if (save.days.length > 30) save.days.shift(); }
    checkGoals(true);
    persist();
    // 1.7: esc pops: keycap confetti (reads with the sound off)
    for (let i = 0; i < 40; i++) { const a = -Math.random() * 3.14, v = 300 + Math.random() * 600; parts.push({ x: p.x + PW / 2, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0.8 + Math.random() * 0.5, c: [C.lime, C.lilac, C.paper][i % 3], s: 8 + Math.random() * 8 }); }
    cc((c) => c.score && c.score(runScore()));
    cc((c) => c.end && c.end({ score: runScore(), durationMs: ms, completed: true }));
    cc((c) => c.event && c.event('escape', { loop, mult: save.mult, ms, falls, speed: Math.round(topSpeed) }));
    winT = setTimeout(() => { winT = 0; if (screen === 'win') showWin(ms, isBest); }, 650);   // 1.7: a restart in this gap already has its run reported; don't pop the card over the new run
  }
  function fmt(ms) { const s = ms / 1000; return Math.floor(s / 60) + ':' + ('0' + (s % 60).toFixed(1)).slice(-4); }
  let lastResult = null;
  function showWin(ms, isBest) {
    lastResult = { ms, isBest, loop: save.loop, mult: save.mult, speed: Math.round(topSpeed), falls, score: runScore() };
    $('winTitle').textContent = falls === 0 ? 'clean escape. suspicious.' : 'you escaped.';
    $('winSub').textContent = isBest ? 'new best for keyboard ' + save.loop + '. the keyboard is filing a complaint.' : 'best on this keyboard: ' + fmt(save.best[save.loop]) + '. not today.';
    const st = (v, l) => `<div class="stat"><div class="v">${v}</div><div class="l">${l}</div></div>`;
    // 1.7: the first stat is the number the site's board gets (speed gained this run; a reboot's carried speed is left out)
    $('stats').innerHTML = st(lastResult.score, 'score (speed gained)') + st(fmt(ms), 'time to esc') + st(Math.round(topSpeed), 'top speed') + st(falls, (falls === 1 ? 'fall' : 'falls') + ' · x' + save.mult);
    $('goalsW').innerHTML = goalsHtml(true);
    $('rebootBtn').textContent = 'reboot (x' + (save.mult + 1) + ')';
    try { $('card').src = drawCard(lastResult).toDataURL('image/png'); } catch (e) { /* ignore */ }
    winLock = performance.now() + 600;
    show('win', true);
    // K-0059: shared tip button (assets/tip.js)
    if (window.ccTip) window.ccTip.mount(document.querySelector('#win .panel'), { game: 'keyboard-escape', slot: 'game-over' });
  }
  function reboot() {
    save.mult += 1; save.loop += 1; persist();
    cc((c) => c.event && c.event('reboot', { mult: save.mult }));
    carry = Math.floor(topSpeed * 0.1);
    startRun(false);
    checkGoals(false);
    toast('rebooted. x' + save.mult + ' forever. kept ' + speed + ' speed. new keyboard, same problems.');
  }

  // ------------------------------------------------------------------ share card
  function drawCard(r) {
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1080;
    const g = cv.getContext('2d');
    g.fillStyle = C.carbon; g.fillRect(0, 0, 1080, 1080);
    // keyboard strip
    for (let i = 0; i < 9; i++) { drawKeycap(g, 60 + i * 110, 880, 96, 70, i === 8 ? 'esc' : 'QWERTYUI'[i], i === 8 ? 2 : 1, 1); }
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.imageSmoothingEnabled = false;
    if (sprite.complete && sprite.naturalWidth) g.drawImage(sprite, 0, 0, 128, 128, 760, 230, 256, 256);
    g.fillStyle = C.lilac; g.font = `800 44px ${MONO}`; g.fillText('+1 speed keyboard escape', 60, 120);
    g.fillStyle = C.lime; g.font = `800 92px ${MONO}`; g.fillText('i escaped.', 60, 240);
    g.fillStyle = C.paper; g.font = `800 190px ${MONO}`; g.fillText(String(r.speed), 50, 470);
    g.fillStyle = 'rgba(245,243,237,0.6)'; g.font = `700 40px ${MONO}`; g.fillText('top speed', 66, 540);
    g.fillStyle = C.paper; g.font = `700 46px ${MONO}`;
    g.fillText(`${fmt(r.ms)} to esc · ${r.falls} fall${r.falls === 1 ? '' : 's'} · x${r.mult}`, 60, 680);
    g.fillStyle = C.lilac; g.font = `700 40px ${MONO}`; g.fillText('keyboard ' + r.loop + ' escaped', 60, 760);
    g.fillStyle = C.lime; g.font = `700 38px ${MONO}`; g.fillText(URL_TXT, 60, 1030);
    return cv;
  }
  function shareText(r) { return `i escaped the keyboard in ${fmt(r.ms)} at ${r.speed} speed (x${r.mult}, ${r.falls} falls). esc is further than you think.\n${URL_TXT}`; }
  async function share() {
    if (!lastResult) return;
    const text = shareText(lastResult);
    cc((c) => c.event && c.event('share_clicked', { loop: lastResult.loop }));
    try {
      if (navigator.share) {
        let files;
        try { const blob = await new Promise((res) => drawCard(lastResult).toBlob(res, 'image/png')); files = [new File([blob], 'keyboard-escape.png', { type: 'image/png' })]; } catch (e) { files = null; }
        if (files && navigator.canShare && navigator.canShare({ files })) await navigator.share({ text, files });
        else await navigator.share({ text });
        return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('copied. go brag.'); }
    catch (e) { toast('copy failed. screenshot it like it\'s 2009.'); }
  }

  // ------------------------------------------------------------------ rendering
  const sprite = new Image(); sprite.src = 'crash.png';
  const FR = { idle: 0, hit: 128, cooked: 256 };
  function pal() {
    return spooky
      ? { bg1: '#140d1c', bg2: '#22102a', cap: '#ff9a3c', capHit: C.lime, side: '#8a3d0e', txt: '#2a0f05', glow: 'rgba(255,154,60,0.18)', gate: C.lilac }
      : { bg1: '#101114', bg2: '#17181d', cap: C.paper, capHit: C.lime, side: '#9b978a', txt: C.carbon, glow: 'rgba(181,154,255,0.14)', gate: C.lilac };
  }
  // Pixel font (5x7 with two descender rows), drawn with fillRect. The first canvas fillText in a document resolves
  // the font stack (~100 ms on a phone, the long task left after 1.3), so every in-game string is drawn from this
  // table instead and the canvas never touches a font. Each glyph: width digit, then one hex byte per row.
  const PF = {'A':'50e11111f111111','B':'51e11111e11111e','C':'50e11101010110e','D':'51e11111111111e','E':'51f10101e10101f','F':'51f10101e101010','G':'50e11101711110f','H':'51111111f111111','I':'51f04040404041f','J':'50702020212120c','K':'511121418141211','L':'51010101010101f','M':'5111b1515111111','N':'511191513111111','O':'50e11111111110e','P':'51e11111e101010','Q':'50e11111115120d','R':'51e11111e141211','S':'50f10100e01011e','T':'51f040404040404','U':'51111111111110e','V':'511111111110a04','W':'511111115151b11','X':'511110a040a1111','Y':'511110a04040404','Z':'51f01020408101f','0':'50e11131519110e','1':'5040c040404040e','2':'50e11010204081f','3':'51e01010e01011e','4':'51111111f010101','5':'51f101e0101110e','6':'50e10101e11110e','7':'51f010204080808','8':'50e11110e11110e','9':'50e11110f01010e','a':'500000e010f110f','b':'510101e1111111e','c':'500000e1010100e','d':'501010f1111110f','e':'500000e111f100e','f':'506081e08080808','g':'500000f1111110f010e','h':'510101e11111111','i':'504000c0404040e','j':'502000602020202120c','k':'510101214181412','l':'50c04040404040e','m':'500001a15151515','n':'500001e11111111','o':'500000e1111110e','p':'500001e1111111e1010','q':'500000f1111110f0101','r':'500001619101010','s':'500000f100e011e','t':'508081e08080906','u':'50000111111110f','v':'500001111110a04','w':'50000111115150a','x':'50000110a040a11','y':'50000111111110f010e','z':'500001f0204081f',' ':'30000','.':'100000000000001',',':'20000000000010102',':':'100000100000100','\'':'1010100','’':'1010100','-':'300000000070000','+':'5000004041f0404','!':'101010101010001','?':'50e110204040004','/':'501010204081010','·':'100000000010000','✓':'500010214080000','→':'5000004021f0204','↖':'5001e1814120100','…':'500000000000015','(':'301020404040201',')':'304020101010204','🎃':'70c3e5d7f55633e','👻':'73e7f6b7f7f7f55','🦇':'700416b7f3e1400'};
  const PFG = {};
  function pfGlyph(ch) {
    let g = PFG[ch];
    if (g) return g;
    const s = PF[ch] || PF['?'], w = +s[0], runs = [];
    for (let r = 0; 1 + r * 2 < s.length; r++) {
      const b = parseInt(s.substr(1 + r * 2, 2), 16);
      for (let x = 0; x < w;) {
        if (!((b >> (w - 1 - x)) & 1)) { x++; continue; }
        let e = x + 1; while (e < w && ((b >> (w - 1 - e)) & 1)) e++;
        runs.push(r, x, e - x); x = e;
      }
    }
    return (PFG[ch] = { w, runs });
  }
  function pxWidth(str, px) { let n = 0; for (const ch of str) n += pfGlyph(ch).w + 1; return Math.max(0, n - 1) * px / 10; }
  // same arguments as fillText with a monospace font of size px (cap height ~0.7 px, advance 0.6 px); k = device pixels
  // per unit, so cell edges land on whole pixels (no seams between rows)
  function pxText(g, str, x, y, px, col, align, base, k) {
    str = String(str); k = k || dpr;
    const q = (v) => Math.round(v * k) / k;
    const u = px / 10, w = pxWidth(str, px);
    let gx = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    const top = base === 'top' ? y + u : base === 'bottom' ? y - 7 * u : y - 3.5 * u;
    g.fillStyle = col;
    for (const ch of str) {
      const gl = pfGlyph(ch), r = gl.runs;
      for (let i = 0; i < r.length; i += 3) {
        const x0 = q(gx + r[i + 1] * u), y0 = q(top + r[i] * u);
        g.fillRect(x0, y0, q(gx + (r[i + 1] + r[i + 2]) * u) - x0, q(top + (r[i] + 1) * u) - y0);
      }
      gx += (gl.w + 1) * u;
    }
  }
  function rr(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
  function drawKeycap(g, x, y, w, h, label, kind, sc, P) {
    P = P || pal();
    const top = kind === 2 ? C.lilac : kind === 3 ? P.capHit : P.cap;
    g.fillStyle = kind === 2 ? '#6f58c4' : kind === 3 ? '#7fa82a' : P.side; rr(g, x, y, w, h, 10 * sc); g.fill();
    g.fillStyle = top; rr(g, x + 5 * sc, y - 2 * sc, w - 10 * sc, h - 16 * sc, 8 * sc); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; rr(g, x + 9 * sc, y + 1 * sc, w - 18 * sc, 6 * sc, 3 * sc); g.fill();
    if (label) {
      pxText(g, label, x + 14 * sc, y + 8 * sc, Math.round((label.length > 3 ? 18 : 26) * sc), P.txt, 'left', 'top', dpr * scale); // labels are only drawn into the atlas (res = dpr * scale)
    }
  }
  // Paint caches (perf): repainting every keycap's rounded rects and label, a full-screen gradient and ~60 parallax
  // caps every frame kept phones busy while the page loaded. Each is painted once and blitted (same look).
  // One shared atlas canvas: every cached keycap and label is packed (shelf by shelf) into the same canvas.
  // Full = cleared and re-warmed.
  const ATLAS = 1024, atlas = document.createElement('canvas'); atlas.width = atlas.height = ATLAS;
  const atx = atlas.getContext('2d');
  let ax = 0, ay = 0, arow = 0;
  function resetAtlas() { atx.setTransform(1, 0, 0, 1, 0, 0); atx.clearRect(0, 0, ATLAS, ATLAS); ax = ay = arow = 0; capCache.clear(); txtCache.clear(); }
  function alloc(w, h) {
    w = Math.ceil(w) + 2; h = Math.ceil(h) + 2;
    if (w > ATLAS || h > ATLAS) return null;
    if (ax + w > ATLAS) { ax = 0; ay += arow; arow = 0; }
    if (ay + h > ATLAS) resetAtlas();
    const slot = { x: ax, y: ay };
    ax += w; arow = Math.max(arow, h);
    return slot;
  }
  const capCache = new Map();
  let capBudget = 4; // new keycap/label bitmaps per frame (pixel text is cheap, but a fresh keyboard has dozens of caps);
  // keycaps over budget draw label-less until cached, labels a frame or two later
  function keycapImage(w, h, label, kind, P) {
    const res = dpr * scale, key = w + '|' + h + '|' + label + '|' + kind + '|' + P.cap + P.side + P.capHit + P.txt + '|' + res;
    let c = capCache.get(key);
    if (c) return c;
    if (capBudget <= 0) return null;
    capBudget--;
    const pad = 4, cw = Math.ceil((w + pad * 2) * res), ch = Math.ceil((h + pad * 2) * res), slot = alloc(cw, ch);
    if (!slot) return null;
    atx.setTransform(res, 0, 0, res, slot.x + pad * res, slot.y + pad * res);
    drawKeycap(atx, 0, 0, w, h, label, kind, 1, P);
    c = { x: slot.x, y: slot.y, w: cw, h: ch, pad, res };
    capCache.set(key, c);
    return c;
  }
  // in-world labels (CAPS, speed gates, the exit, popups): each string rasterised once, at most 2 new a frame
  const txtCache = new Map();
  function wtext(str, x, y, px, col, align, base) {
    const res = dpr * scale, key = str + '|' + px + '|' + col + '|' + res;
    let t = txtCache.get(key);
    if (!t) {
      if (capBudget <= 0) return;
      capBudget--;
      const w = pxWidth(str, px);
      const pad = Math.ceil(px * 0.3), cw = Math.ceil((w + pad * 2) * res), ch = Math.ceil(px * 1.6 * res), slot = alloc(cw, ch);
      if (!slot) return;
      atx.setTransform(res, 0, 0, res, slot.x, slot.y); pxText(atx, str, pad, px * 0.8, px, col, 'left', 'middle', res);
      t = { x: slot.x, y: slot.y, cw, ch, w, pad, h: px * 1.6, res };
      txtCache.set(key, t);
    }
    const ox = align === 'center' ? t.w / 2 : align === 'right' ? t.w : 0;
    const oy = base === 'top' ? 0 : base === 'bottom' ? t.h * 0.9 : t.h / 2;
    ctx.drawImage(atlas, t.x, t.y, t.cw, t.ch, x - ox - t.pad, y - oy, t.cw / t.res, t.ch / t.res);
  }
  let bgCache = null, bgKey = '', parCache = null, parKey = '';
  function backdrop(P) {
    const key = vw + 'x' + vh + '@' + dpr + P.bg1 + P.bg2;
    if (bgCache && bgKey === key) return bgCache;
    bgKey = key; bgCache = bgCache || document.createElement('canvas');
    bgCache.width = Math.max(1, Math.round(vw * dpr)); bgCache.height = Math.max(1, Math.round(vh * dpr));
    const g = bgCache.getContext('2d'), grd = g.createLinearGradient(0, 0, 0, bgCache.height);
    grd.addColorStop(0, P.bg2); grd.addColorStop(1, P.bg1);
    g.fillStyle = grd; g.fillRect(0, 0, bgCache.width, bgCache.height);
    return bgCache;
  }
  function parallaxStrip(col) {
    const key = vw + '|' + scale + '|' + dpr + '|' + col;
    if (parCache && parKey === key) return parCache;
    parKey = key; parCache = parCache || document.createElement('canvas');
    const w = vw + 180 * scale, h = 40 * scale;
    parCache.width = Math.max(1, Math.ceil(w * dpr)); parCache.height = Math.max(1, Math.ceil(h * dpr));
    const g = parCache.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = col;
    for (let xx = 0; xx < w; xx += 60 * scale) { rr(g, xx, 0, 50 * scale, 38 * scale, 6 * scale); g.fill(); }
    parCache.cssW = w; parCache.cssH = h;
    return parCache;
  }
  function render(dt) {
    const P = pal();
    capBudget = 4;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // backdrop
    ctx.drawImage(backdrop(P), 0, 0, vw, vh);
    // camera
    const vnow = p ? Math.max(0, p.vx) : 0;
    wz += (Math.max(0.6, Math.min(1, 1 - (vnow - 380) / 1500)) - wz) * Math.min(1, dt * 2);
    const ws = scale * wz;
    const lookX = vw / ws * lookF;
    let sx = 0, sy = 0;
    if (shake > 0) { shake -= dt; sx = (Math.random() - 0.5) * 12 * shake * 10; sy = (Math.random() - 0.5) * 12 * shake * 10; }
    // distant parallax keyboard rows
    ctx.save();
    ctx.globalAlpha = 0.07;
    const par = cam.x * 0.15 * scale, strip = parallaxStrip(spooky ? '#ff9a3c' : C.lilac);
    for (let row = 0; row < 4; row++) {
      const yy = vh * 0.18 + row * 46 * scale;
      const off = (par + row * 23 * scale) % (60 * scale);
      ctx.drawImage(strip, -off - 60 * scale, yy, strip.cssW, strip.cssH);
    }
    ctx.restore();
    if (spooky) { ctx.fillStyle = 'rgba(255,230,180,0.85)'; ctx.beginPath(); ctx.arc(vw * 0.82, vh * 0.16, 34 * scale, 0, 6.29); ctx.fill(); ctx.fillStyle = P.bg2; ctx.beginPath(); ctx.arc(vw * 0.82 + 14 * scale, vh * 0.16 - 8 * scale, 30 * scale, 0, 6.29); ctx.fill(); }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(ws, ws);
    ctx.translate(-cam.x + lookX, -cam.y + vh / ws * 0.55);
    const L = cam.x - lookX - 100, R = cam.x - lookX + vw / ws + 100;
    if (course) {
      // the void glow
      for (const k of course.keys) {
        if (k.x > R || k.x + k.w < L || k.gone) continue;
        const kind = k.type === 'esc' ? 2 : k.type === 'boot' ? 0 : k.hit ? 3 : 0;
        const pr = k.press * 6;
        let y = k.y + pr, h = KH;
        if (k.crumble > 0) { ctx.save(); ctx.translate((Math.random() - 0.5) * 6, 0); }
        let label = k.label;
        if (spooky && k.type === 'key' && (k.x | 0) % 5 === 0) label = SPOOK[(k.x | 0) % SPOOK.length];
        if (k.type === 'space') { ctx.fillStyle = 'rgba(197,255,73,0.18)'; ctx.fillRect(k.x + 10, y + KH - 6, k.w - 20, 600); }
        if (k.type === 'del') { ctx.fillStyle = 'rgba(255,70,70,0.35)'; ctx.fillRect(k.x + 6, y + KH - 8, k.w - 12, 14); }
        const cap = keycapImage(k.w, h, label, kind, P);
        if (cap) ctx.drawImage(atlas, cap.x, cap.y, cap.w, cap.h, k.x - cap.pad, y - cap.pad, cap.w / cap.res, cap.h / cap.res);
        else drawKeycap(ctx, k.x, y, k.w, h, null, kind, 1, P); // label arrives a frame or two later, once cached
        if (k.type === 'del') { ctx.strokeStyle = 'rgba(16,17,20,0.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(k.x + k.w * 0.55, y); ctx.lineTo(k.x + k.w * 0.48, y + 18); ctx.lineTo(k.x + k.w * 0.62, y + 30); ctx.lineTo(k.x + k.w * 0.56, y + 44); ctx.stroke(); }
        if (k.type === 'move') { ctx.fillStyle = C.lilac; ctx.fillRect(k.x + k.w / 2 - 3, y + KH - 10, 6, 20 + k.amp); }
        if (k.crumble > 0) ctx.restore();
        if (k.wall) {
          const wx = k.wall.x, wt = k.y - k.wall.h;
          ctx.fillStyle = '#6f58c4'; rr(ctx, wx, wt, k.wall.w, k.wall.h + 6, 8); ctx.fill();
          ctx.fillStyle = C.lilac; rr(ctx, wx + 4, wt - 2, k.wall.w - 8, k.wall.h - 10, 6); ctx.fill();
          wtext('CAPS', wx + k.wall.w / 2, wt + 7, 13, C.carbon, 'center', 'top');
          ctx.fillStyle = C.lime; ctx.beginPath(); ctx.arc(wx + k.wall.w / 2, wt + 34, 4, 0, 6.29); ctx.fill();
        }
        if (k.gateNeed) {
          const gx = k.x + k.w - 4, ok = speed >= k.gateNeed;
          wtext((ok ? 'fast enough ✓ ' : 'need ') + k.gateNeed + ' spd →', gx, k.y - 70, 20, ok ? C.lime : C.lilac, 'right', 'bottom');
          ctx.fillStyle = ok ? C.lime : C.lilac; ctx.fillRect(gx - 2, k.y - 66, 4, 66);
          if (!k.passed) { const fx = k.x + k.w + 62; ctx.globalAlpha = 0.35 + 0.2 * Math.sin(runT * 12); ctx.fillStyle = ok ? C.lime : '#ff5a5a'; ctx.fillRect(fx - 3, k.y - 420, 6, 520); ctx.globalAlpha = 1; }
        }
        if (k.type === 'esc') wtext('↖ the exit. allegedly.', k.x + 8, k.y - 18, 22, C.lime, 'left', 'bottom');
      }
      // particles
      for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.t -= dt; if (q.t <= 0) { parts.splice(i, 1); continue; } q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; ctx.globalAlpha = Math.min(1, q.t / 0.4); ctx.fillStyle = q.c; const qs = q.s || 6; ctx.fillRect(q.x - qs / 2, q.y - qs / 2, qs, qs); }
      ctx.globalAlpha = 1;
      // speed lines
      const v = p ? p.vx : 0;
      if (v > 430 && screen === 'play') {
        ctx.strokeStyle = 'rgba(245,243,237,' + Math.min(0.35, (v - 430) / 700) + ')'; ctx.lineWidth = 3;
        for (let i = 0; i < 7; i++) { const yy = p.y - 60 + ((i * 53 + runT * 900) % 170); const xx = p.x - 40 - ((i * 97 + runT * 1400) % 260); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - 70 - v * 0.08, yy); ctx.stroke(); }
      }
      // crash
      if (p) drawCrash(p);
      // 1.7: a stranger's first run: a "tap!" cue as crash nears the end of a key, for the first 3 jumps
      if (p && screen === 'play' && !save.escapes && jumpsMade < 3 && booting <= 0 && p.ground && p.ground.type !== 'wall') {
        const left = p.ground.x + p.ground.w - (p.x + PW);
        if (left < 150 && left > -PW) { ctx.globalAlpha = 0.65 + 0.35 * Math.sin(runT * 18); wtext('tap!', p.x + PW / 2, p.y - 78, 30, C.lime, 'center', 'middle'); ctx.globalAlpha = 1; }
      }
      // popups
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = popups.length - 1; i >= 0; i--) { const q = popups[i]; q.t -= dt; if (q.t <= 0) { popups.splice(i, 1); continue; } q.y -= 70 * dt; ctx.globalAlpha = Math.min(1, q.t * 2); wtext(q.txt, q.x, q.y, q.big ? 26 : 22, q.big ? C.lilac : C.lime, 'center', 'middle'); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    if (flash > 0) { flash -= dt * 2; ctx.fillStyle = `rgba(197,255,73,${Math.max(0, flash) * 0.25})`; ctx.fillRect(0, 0, vw, vh); }
    if (!banner && bannerQ.length && screen === 'play') banner = bannerQ.shift();
    if (banner && screen === 'play') {
      banner.t -= dt;
      if (banner.t <= 0) banner = null;
      else {
        const bs = Math.round(Math.min(34, vw / 14, (vw - 24) / Math.max(1, pxWidth(banner.txt, 10) / 10))), sub = banner.sub, bh = sub ? 84 : 60;
        ctx.globalAlpha = Math.min(1, banner.t * 3); ctx.fillStyle = 'rgba(16,17,20,0.78)'; ctx.fillRect(0, vh * 0.3 - 30, vw, bh);
        pxText(ctx, banner.txt, vw / 2, vh * 0.3, bs, C.lime, 'center', 'middle');
        if (sub) pxText(ctx, sub, vw / 2, vh * 0.3 + 32, Math.round(Math.min(18, vw / 24)), C.lilac, 'center', 'middle');
        ctx.globalAlpha = 1;
      }
    }
    if (screen !== 'title') drawHud();
    if (booting > 0 && screen === 'play') drawBoot();
    if (screen === 'title' && autoReady) {   // 1.7: came from a hub "tap to play" card: no title card, one tap starts
      ctx.fillStyle = 'rgba(16,17,20,0.72)'; ctx.fillRect(0, vh * 0.5 - 56, vw, 112);
      pxText(ctx, 'tap to run', vw / 2, vh * 0.5 - 14, Math.round(Math.min(40, vw / 10)), C.lime, 'center', 'middle');
      pxText(ctx, 'tap = jump. hold = jump further.', vw / 2, vh * 0.5 + 30, Math.round(Math.min(16, vw / 26)), C.paper, 'center', 'middle');
    }
  }
  function drawCrash(q) {
    const s = 80, cx = q.x + PW / 2, by = q.y + PH;
    ctx.save();
    ctx.translate(cx, by - 26);
    const tilt = q.ground ? Math.sin(runT * 30) * 0.05 + 0.08 : Math.max(-0.5, Math.min(0.5, q.vy / 2200));
    ctx.rotate(tilt);
    // legs
    if (q.ground && booting <= 0) {
      const ph = runT * (10 + q.vx / 40);
      ctx.strokeStyle = '#c9bfa5'; ctx.lineWidth = 5; ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) { const a = Math.sin(ph + i * Math.PI) * 9; ctx.beginPath(); ctx.moveTo(-6 + i * 12, 18); ctx.lineTo(-6 + i * 12 + a, 28); ctx.stroke(); }
    }
    ctx.imageSmoothingEnabled = false;
    if (sprite.complete && sprite.naturalWidth) ctx.drawImage(sprite, FR[q.face] || 0, 0, 128, 128, -s / 2, -s / 2 - 12, s, s);
    else { ctx.fillStyle = '#d8ccae'; ctx.fillRect(-22, -30, 44, 44); }
    if (save.hat) drawHat(save.hat);
    else if (spooky) { ctx.fillStyle = '#5b2f80'; ctx.beginPath(); ctx.moveTo(-20, -44); ctx.lineTo(20, -44); ctx.lineTo(5, -80); ctx.closePath(); ctx.fill(); ctx.fillRect(-27, -46, 54, 5); ctx.fillStyle = '#ff9a3c'; ctx.fillRect(-15, -51, 30, 5); }
    ctx.restore();
  }
  // 1.7: hats won from goals. crash's screen top is at y = -44, his sides at x = +-34 (sprite drawn 80 px at -40,-52)
  function drawHat(h) {
    const L = C.lime, V = C.lilac, Pp = C.paper, D = '#6f58c4';
    const tri = (x1, y1, x2, y2, x3, y3, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill(); };
    const dot = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill(); };
    if (h === 'party') { tri(-15, -43, 15, -43, 2, -82, L); tri(-9, -55, 9, -55, 4, -66, V); dot(2, -83, 5, Pp); }
    else if (h === 'cap') { ctx.fillStyle = V; ctx.beginPath(); ctx.arc(2, -43, 19, Math.PI, 0); ctx.fill(); ctx.fillStyle = D; ctx.fillRect(-38, -47, 22, 6); dot(2, -62, 3, L); }
    else if (h === 'prop') { ctx.fillStyle = L; ctx.beginPath(); ctx.arc(0, -43, 16, Math.PI, 0); ctx.fill(); ctx.fillStyle = Pp; ctx.fillRect(-1.5, -66, 3, 8); const w = Math.cos(runT * 25 + title.t * 25) * 20; ctx.fillStyle = V; ctx.fillRect(-Math.abs(w), -69, Math.abs(w) * 2, 5); }
    else if (h === 'phones') { ctx.strokeStyle = V; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, -36, 34, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.fillStyle = D; ctx.fillRect(-42, -42, 12, 22); ctx.fillRect(30, -42, 12, 22); ctx.fillStyle = L; ctx.fillRect(-40, -38, 4, 12); ctx.fillRect(36, -38, 4, 12); }
    else if (h === 'halo') { ctx.strokeStyle = L; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(0, -60 + Math.sin(runT * 4 + title.t * 4) * 3, 20, 6, 0, 0, 6.29); ctx.stroke(); }
    else if (h === 'antenna') { ctx.strokeStyle = Pp; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -44); ctx.lineTo(-18, -74); ctx.moveTo(6, -44); ctx.lineTo(18, -74); ctx.stroke(); dot(-18, -75, 5, L); dot(18, -75, 5, V); }
    else if (h === 'esc') { drawKeycap(ctx, -22, -70, 44, 32, null, 2, 0.5); pxText(ctx, 'esc', 0, -60, 12, C.carbon, 'center', 'middle', dpr * scale * wz); }
    else if (h === 'wizard') { ctx.fillStyle = D; ctx.fillRect(-28, -47, 56, 6); tri(-18, -45, 18, -45, 8, -92, V); dot(-2, -62, 2.5, L); dot(6, -76, 2, Pp); dot(-6, -52, 2, Pp); }
    else if (h === 'crown') { ctx.fillStyle = L; ctx.beginPath(); ctx.moveTo(-20, -43); ctx.lineTo(-20, -64); ctx.lineTo(-10, -54); ctx.lineTo(0, -68); ctx.lineTo(10, -54); ctx.lineTo(20, -64); ctx.lineTo(20, -43); ctx.closePath(); ctx.fill(); dot(0, -50, 3.5, V); dot(-12, -49, 2.5, V); dot(12, -49, 2.5, V); }
    else if (h === 'chef') { ctx.fillStyle = Pp; ctx.fillRect(-16, -58, 32, 15); dot(-12, -64, 10, Pp); dot(0, -70, 12, Pp); dot(12, -64, 10, Pp); ctx.fillStyle = '#d9d4c7'; ctx.fillRect(-16, -48, 32, 3); }
  }
  function drawHud() {
    const s = portrait ? Math.max(0.75, Math.min(1.3, vw / 400)) : Math.max(0.75, Math.min(1.3, Math.min(vw, vh) / 560));   // 1.7: a bigger HUD on upright phones
    const top = 14 * s;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    // big speed counter
    const spd = Math.round(speed);
    const pulse = 1 + (p && p.ground && p.ground.press ? p.ground.press * 0.12 : 0);
    ctx.save(); ctx.translate(vw / 2, top); ctx.scale(pulse, pulse);
    pxText(ctx, spd, 3, 3, Math.round(54 * s), C.carbon, 'center', 'top');
    pxText(ctx, spd, 0, 0, Math.round(54 * s), C.lime, 'center', 'top');
    ctx.restore();
    pxText(ctx, course && course.cap && speed > course.cap && screen === 'play' ? 'limiter: ' + course.cap + ' · reboot to go faster' : 'speed · x' + save.mult, vw / 2, top + 56 * s, Math.round(12 * s), C.paper, 'center', 'top');
    // progress bar to esc
    if (course && p) {
      const bw = Math.min(vw - 120 * s, 360 * s), bx = vw / 2 - bw / 2, by = top + 76 * s;
      ctx.fillStyle = 'rgba(245,243,237,0.12)'; rr(ctx, bx, by, bw, 8 * s, 4 * s); ctx.fill();
      const pr = Math.max(0, Math.min(1, p.x / course.len));
      ctx.fillStyle = C.lime; rr(ctx, bx, by, Math.max(8 * s, bw * pr), 8 * s, 4 * s); ctx.fill();
      const fr = Math.max(0, Math.min(1, furthest / course.len));
      if (falls > 0 && fr > pr + 0.01) { ctx.fillStyle = C.lilac; ctx.fillRect(bx + bw * fr - 1.5 * s, by - 4 * s, 3 * s, 16 * s); }   // furthest so far this run: something to beat after a fall
      pxText(ctx, 'esc', bx + bw + 6 * s, by + 4 * s, Math.round(11 * s), C.lilac, 'left', 'middle');
    }
    pxText(ctx, fmt(runT * 1000), 14 * s, top, Math.round(13 * s), 'rgba(245,243,237,0.8)', 'left', 'top');
    pxText(ctx, 'kb ' + save.loop + ' · falls ' + falls, 14 * s, top + 18 * s, Math.round(13 * s), 'rgba(245,243,237,0.8)', 'left', 'top');
  }
  function drawBoot() {
    const a = Math.min(1, booting / 0.25);
    ctx.fillStyle = `rgba(16,17,20,${0.7 * a})`; ctx.fillRect(0, 0, vw, vh);
    ctx.globalAlpha = a;
    pxText(ctx, falls ? 'back to boot…' : 'booting crash os…', vw / 2, vh * 0.5, Math.round(Math.min(26, vw / 18)), C.lime, 'center', 'middle');
    pxText(ctx, falls ? 'speed kept: ' + Math.round(speed) : 'tap to jump. hold it to jump further.', vw / 2, vh * 0.5 + 34, Math.round(Math.min(15, vw / 28)), C.paper, 'center', 'middle');
    const ng = nextGoal();   // 1.7: something to aim at on every boot
    if (ng) pxText(ctx, 'goal: ' + ng.txt, vw / 2, vh * 0.5 + 62, Math.round(Math.min(13, vw / 32)), C.lilac, 'center', 'middle');
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------ bot (title attract + QA): jumps at edges, lets go when it'll land on the next key
  let botTarget = null, botWall = null;
  function botThink(err) {
    const k = p.ground, vx = Math.max(p.vx, 150);
    if (k && k.type !== 'wall') {
      const ks = course.keys, i = ks.indexOf(k);
      const edge = k.wall ? k.wall.x - vx * (0.16 + err) : k.x + k.w - PW * 0.5 - vx * (0.02 + err);
      if (p.x + PW > edge && i >= 0 && ks[i + 1]) { jumpBuf = 0.1; holding = true; botTarget = ks[i + 1]; botWall = k.wall || null; }
    } else if (!k && holding && botTarget && !p.bounce && !(botWall && p.x < botWall.x + botWall.w + 10)) {
      const vy = Math.max(p.vy, -CUT), dy = botTarget.y - (p.y + PH);
      const disc = vy * vy + 2 * G * dy;
      if (disc > 0) {
        const t = (-vy + Math.sqrt(disc)) / G;
        const lx = p.x + vx * t;
        if (lx >= botTarget.x + Math.min(botTarget.w * 0.25, 60) * (1 + err * 4)) holding = false;
      }
    }
  }

  // ------------------------------------------------------------------ title attract: crash runs a demo keyboard
  function titleScene(dt) {
    if (!course || !p) { course = buildCourse(1, 1); p = newPlayer(); speed = 120; }
    title.t += dt;
    botThink(0);
    step(dt);
    if (p.x > course.len - 200 || falls > 0) { course = buildCourse(1 + ((Math.random() * 5) | 0), 1); p = newPlayer(); falls = 0; booting = 0; speed = 120; }
  }

  // ------------------------------------------------------------------ loop
  let last = performance.now();
  // the title's attract demo draws a few frames, then waits for a tap/key or 3 s after the page loaded, so the player
  // page's boot screen isn't competing with it; play always runs every frame
  let frames = 0, awake = false, running = true;
  function wake() { awake = true; if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, wake, true));
  try { if (window.frameElement) window.parent.document.addEventListener('keydown', wake, true); } catch (e) { /* other origin */ }
  const wakeLater = () => setTimeout(wake, 3000);
  if (document.readyState === 'complete') wakeLater(); else window.addEventListener('load', wakeLater);
  function frame(now) {
    frames++;
    if (!awake && screen === 'title' && frames > 4) running = false; else requestAnimationFrame(frame);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.05) dt = 0.05;
    try {
      if (screen === 'title') { booting = 0; titleScene(dt); }
      else if (screen === 'play') step(dt);
      if (p) {
        const tx = p.x + (portrait ? Math.max(0, p.vx) / 12 : 0), ty = Math.min(p.y, 120);   // portrait: lead by the follow lag
        cam.x += (tx - cam.x) * Math.min(1, dt * 12);
        if (Math.abs(tx - cam.x) > 600) cam.x = tx;
        cam.y += (ty - cam.y) * Math.min(1, dt * 4);
      }
      render(dt);
      if (screen === 'play' && scoreDirty && now - lastScoreSent > 1000) { scoreDirty = false; lastScoreSent = now; cc((c) => c.score && c.score(runScore())); }
    } catch (err) { console.error(err); }
  }
  requestAnimationFrame(frame);

  // ------------------------------------------------------------------ menus
  function syncToggles() {
    const s = 'sound: ' + (save.mute ? 'off' : 'on');
    $('sndBtn').textContent = s; $('pSndBtn').textContent = s;
    $('spookBtn').textContent = 'spooky: ' + (spooky ? 'on' : 'off');
    const b = save.best[save.loop];
    $('meta').textContent = save.escapes ? `keyboard ${save.loop} · multiplier x${save.mult} · top speed ${Math.round(save.topSpeed)}` + (b ? ` · best ${fmt(b)}` : '') : '';
    $('goalsT').innerHTML = goalsHtml(false);
    const hb = $('hatBtn'), owned = ownedHats();
    hb.style.display = owned.length ? '' : 'none'; hb.textContent = 'hat: ' + (save.hat ? HATS[save.hat] : 'none');
  }
  // 1.7: the goals box (title and end card): progress pips, what just got done, the next goal, today's job
  const esc = (t) => String(t).replace(/[&<>"]/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  function goalsHtml(onWin) {
    const n = goalsDone(), g = nextGoal(), out = [];
    out.push(`<span class="pips">${GOALS.map((x) => save.goals[x.id] ? '■' : '□').join('')}</span> goals ${n}/${GOALS.length}`);
    if (onWin) for (const d of newGoals) out.push(`<b>✓ ${esc(d.txt)}</b> · new hat: <span class="k">${esc(HATS[d.hat])}</span>`);
    if (g) out.push(`next: <b>${esc(g.txt)}</b>${esc(goalHint(g))} → <span class="k">${esc(HATS[g.hat])}</span>`);
    else out.push('<b>every goal done.</b> the keyboard fears you.');
    const jd = save.jobDay === TODAY;
    out.push(jd ? `<b>✓ today's job done</b>${save.jobStreak > 1 ? ' · ' + save.jobStreak + ' days in a row' : ''} · new one tomorrow` : `today's job: <b>${esc(JOB.txt)}</b>`);
    return out.join('<br>');
  }
  function ownedHats() { return GOALS.filter((g) => save.goals[g.id]).map((g) => g.hat); }
  function cycleHat() { const o = [''].concat(ownedHats()); save.hat = o[(o.indexOf(save.hat) + 1) % o.length]; persist(); syncToggles(); }
  function toggleSound() { save.mute = !save.mute; applyMute(); persist(); syncToggles(); }
  $('playBtn').addEventListener('click', (e) => { e.stopPropagation(); startRun(false); });
  $('sndBtn').addEventListener('click', toggleSound);
  $('pSndBtn').addEventListener('click', toggleSound);
  $('hatBtn').addEventListener('click', cycleHat);
  $('spookBtn').addEventListener('click', () => { spooky = !spooky; save.spooky = spooky; persist(); syncToggles(); });
  $('pauseBtn').addEventListener('click', () => setPause(true));
  $('resumeBtn').addEventListener('click', () => setPause(false));
  $('restartBtn').addEventListener('click', () => { setPause(false); manualBoot(); });
  $('rebootBtn').addEventListener('click', reboot);
  $('againBtn').addEventListener('click', () => startRun(false));
  $('shareBtn').addEventListener('click', share);
  syncToggles();
  if (window.__keGo && screen === 'title') startRun(false);   // 1.6: a run tap made before this script loaded
  // 1.7: a hub "tap to play" card sent the player (cc.autostart): skip the title card. The run itself waits for the
  // first tap or key (the player page may still be covering the game), so crash doesn't set off on his own.
  // cc-sdk.js is deferred, so it runs after this file: ask once the document has parsed.
  function tryAutostart() {
    if (screen !== 'title' || window.__keGo) return;
    cc((c) => { if (c.autostart && c.autostart()) { autoReady = true; show('title', false); wake(); } });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryAutostart); else tryAutostart();

  // QA hook (read-only state peek)
  window.__ke = { get screen() { return screen; }, get p() { return p; }, get speed() { return speed; }, get course() { return course; }, get falls() { return falls; }, step: (dt) => step(dt), draw: (dt) => render(dt), bot: (e) => botThink(e || 0), jump: () => { jumpBuf = 0.13; holding = true; }, release: () => { holding = false; }, G, CUT, PW, PH, vxOf, AIR, get save() { return save; }, get runScore() { return runScore(); }, get runT() { return runT; }, get job() { return JOB.txt; }, escape: () => { if (screen === 'play' && course) { p.x = course.keys[course.keys.length - 1].x + 40; p.y = course.keys[course.keys.length - 1].y - PH; p.vy = 0; p.ground = null; } } };
})();
