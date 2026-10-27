/* tab hoarder — computer cooked games. vanilla js + canvas, no deps. */
(() => {
  'use strict';

  // ---------- palette / constants ----------
  const COL = {
    carbon: '#101114', lime: '#C5FF49', lilac: '#B59AFF', paper: '#F5F3ED',
    paper2: '#E6E1D3', beige: '#D8CBA6', ink: '#1b1c21', grid: 'rgba(197,255,73,0.05)'
  };
  const FONT = 'ui-monospace,"SF Mono",Menlo,Consolas,"Courier New",monospace';
  const WORLD_W = 420, WORLD_H = 620;     // design space the view is fitted to
  const TAB_H = 30;                        // tab height (world units)
  const BASE_W = 180;                      // starting tab width
  const CRASH_W = 200;                     // CRASH sprite drawn size (128px source)
  const CRASH_TOP = CRASH_W - 13 * (CRASH_W / 128); // monitor top edge in world y
  const RANGE = 175;                       // slider travels +-RANGE around center
  const PERFECT = 5;                       // world units of forgiveness that snap to perfect
  const BEST_KEY = 'cc-tab-hoarder-best-pts'; // v2: best is points, not tabs

  const TITLES = [
    'how to stop procrastinating', 'quick question', 'untitled spreadsheet (14)',
    'is it normal for laptop to be hot', 'inbox (4,028)', 'cheap flights to anywhere',
    'how to center a div', 'do fish sleep', 'recipe i will never make', 'you are on mute',
    'terms and conditions', 'free ram download', 'why is my computer slow',
    'article i\'ll read later', 'final_FINAL_v3.pdf', 'meeting notes (blank)', '404 not found',
    'lofi beats to panic to', 'list of lists - wiki', 'cart (1) - expires soon', 'is cereal soup',
    '500 tabs is fine right', 'login', 'login (2)', 'captcha: select all fans',
    'how long can a pc run hot', 'how to close tabs', 'productivity tips (unread)',
    'screenshot 2026-10-19', 'do i need all these tabs', 'symptoms of tab addiction', 'new tab',
    'budget.xlsx (do not open)', 'your session has expired', 'cookies? accept all',
    'house i can\'t afford', '1 unread message (spam)', 'uhh what was this tab',
    'nearest pizza - maps', 'speedrun of a game i don\'t play', 'how hot is too hot (cpu)',
    'something is playing audio', 'loading...', 'download (17).zip', 'calendar: you\'re late',
    'online course - 2% done', 'forum thread from 2011', 'should i restart my computer',
    'no', 'help', 'tab i opened to close tabs', 'how to be less online', 'reply-all disaster',
    'weather (it\'s raining)', 'job application (step 9/9)', 'password reset (again)',
    'video: 10 hrs of fan noise', 'wait why is this open'
  ];
  const MILESTONES = {
    5: 'ok that\'s a few tabs', 10: 'fan has entered the chat', 15: 'ram: concerned',
    20: 'the browser is eating', 25: 'computer is praying', 30: 'bookmarks? never heard of them',
    40: 'this is a cry for help', 50: 'fan is now a jet engine', 60: 'smells like toast',
    75: 'legally a server farm', 100: 'you are the cloud now', 150: 'please. close one.'
  };
  const FAVS = [COL.lime, COL.lilac, COL.carbon, COL.beige];

  // ---------- canvas ----------
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, S = 1;
  function resize() {
    const r = cv.getBoundingClientRect();
    W = r.width || window.innerWidth; H = r.height || window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
    S = Math.min(W / WORLD_W, H / WORLD_H);
    titleCache = new Map();
  }
  window.addEventListener('resize', resize);

  const crashImg = new Image();
  let crashReady = false;
  crashImg.onload = () => { crashReady = true; };
  crashImg.src = 'crash.png';

  // ---------- storage ----------
  function loadBest() { try { return parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) { /* ignore */ } }

  // ---------- audio (procedural) ----------
  let ac = null, master = null, muted = false, noiseBuf = null;
  let fanGain, fanFilter, whine, whineGain;
  function initAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const fan = ac.createBufferSource(); fan.buffer = noiseBuf; fan.loop = true;
      fanFilter = ac.createBiquadFilter(); fanFilter.type = 'bandpass'; fanFilter.frequency.value = 250; fanFilter.Q.value = 0.9;
      fanGain = ac.createGain(); fanGain.gain.value = 0;
      fan.connect(fanFilter); fanFilter.connect(fanGain); fanGain.connect(master); fan.start();
      whine = ac.createOscillator(); whine.type = 'triangle'; whine.frequency.value = 160;
      whineGain = ac.createGain(); whineGain.gain.value = 0;
      whine.connect(whineGain); whineGain.connect(master); whine.start();
    } catch (e) { ac = null; }
  }
  function setMuted(m) {
    muted = !!m;
    if (ac && master) master.gain.setTargetAtTime(muted ? 0 : 0.55, ac.currentTime, 0.02);
  }
  function updateFan() {
    if (!ac) return;
    const t = ac.currentTime, h = heat();
    const on = state === 'play';
    fanGain.gain.setTargetAtTime(on ? 0.03 + h * 0.16 : 0, t, on ? 0.4 : 0.15);
    fanFilter.frequency.setTargetAtTime(220 + h * 1500, t, 0.4);
    whine.frequency.setTargetAtTime(150 + h * 650, t, 0.4);
    whineGain.gain.setTargetAtTime(on ? h * h * 0.03 : 0, t, 0.3);
  }
  function tone(f, dur, type, vol, f2, delay) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, freq, type) {
    if (!ac || muted) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  const sfx = {
    place() { tone(170, 0.09, 'square', 0.12, 90); hiss(0.05, 0.08, 2000); },
    perfect(n) { const b = 520 * Math.pow(1.09, Math.min(n, 24)); tone(b, 0.12, 'square', 0.08); tone(b * 1.5, 0.16, 'triangle', 0.08, null, 0.05); },
    slice() { hiss(0.14, 0.18, 1200, 'bandpass'); tone(300, 0.08, 'sawtooth', 0.05, 120); },
    milestone() { [0, 0.07, 0.14].forEach((d, i) => tone(440 * [1, 1.26, 1.5][i], 0.12, 'square', 0.06, null, d)); },
    cooked() { tone(330, 0.9, 'sawtooth', 0.12, 40); hiss(0.9, 0.25, 500, 'lowpass'); tone(90, 0.5, 'square', 0.1, 30, 0.15); },
    collapse() { hiss(0.6, 0.12, 3000); },
    start() { tone(260, 0.08, 'square', 0.08); tone(390, 0.1, 'square', 0.08, null, 0.07); },
    powerup() { [0, 0.05, 0.1, 0.15].forEach((d, i) => tone(600 * [1, 1.25, 1.5, 2][i], 0.09, 'triangle', 0.07, null, d)); }
  };

  // ---------- game state ----------
  let state = 'menu';             // menu | play | over
  let tabs = [], cur = null, debris = [], parts = [], toasts = [];
  let score = 0, best = loadBest(), combo = 0, newBest = false, lastTitle = '';
  let tabsN = 0, bestCombo = 0, slowLeft = 0, nextPower = 6, powersUsed = 0, paused = false, runStart = 0, lastScoreSent = 0;
  const mult = () => Math.min(5, 1 + Math.floor(combo / 3));
  // ---------- power-up tabs ----------
  const POWERS = {
    pin:    { glyph: 'pin', title: 'pinned tab: lands perfect', color: COL.lime },
    reopen: { glyph: 'reopen', title: 'reopen closed tab (ctrl+shift+t)', color: COL.lilac },
    slow:   { glyph: 'slow', title: 'low power mode', color: '#7fd8ff' },
    star:   { glyph: 'star', title: 'bookmark: +10 points', color: '#ffd84a' },
    virus:  { glyph: 'virus', title: 'free_ram_download.exe', color: '#ff5a5a' }
  };
  function rollPower() {
    const pool = ['pin', 'reopen', 'slow', 'star'];
    if (tabsN >= 12) pool.push('virus', 'virus');
    if (topTab().w < BASE_W * 0.45) pool.push('reopen');
    return pool[(Math.random() * pool.length) | 0];
  }
  const cc = (fn, ...a) => { try { if (window.cc && typeof window.cc[fn] === 'function') window.cc[fn](...a); } catch (e) { /* sdk optional */ } };

  let camY = -30, shake = 0, crashHit = 0, overT = 0, t = 0, side = 1;
  let bag = [];
  let titleCache = new Map();

  function nextTitle() {
    if (!bag.length) { bag = TITLES.slice(); for (let i = bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; } }
    return bag.pop();
  }
  function heat() { return Math.min(1, tabsN / 55); }
  // speed curve (world units / sec): gentle start, ramps, caps.
  function speedFor(n) { return Math.min(400, 115 + n * 7.5 + (n > 25 ? (n - 25) * 3 : 0)); }

  function makeTab(x, w, y, title) {
    return { x, w, y, title: title || nextTitle(), fav: FAVS[(Math.random() * FAVS.length) | 0], flash: 0, perfect: false };
  }
  function topTab() { return tabs[tabs.length - 1]; }

  function reset(toState) {
    tabs = [makeTab(0, BASE_W, CRASH_TOP, 'new tab')];
    tabs[0].fav = COL.lime;
    debris = []; parts = []; toasts = [];
    score = 0; tabsN = 0; bestCombo = 0; slowLeft = 0; nextPower = 5 + ((Math.random() * 3) | 0); powersUsed = 0; combo = 0; newBest = false; shake = 0; crashHit = 0; side = Math.random() < 0.5 ? -1 : 1;
    state = toState;
    spawn();
    updateFan();
  }
  function spawn() {
    const top = topTab();
    cur = makeTab(top.x + side * sweep(top.w), top.w, top.y + TAB_H);
    cur.dir = -side;
    if (state === 'play' && tabsN >= 28 && Math.random() < 0.22) cur.lag = { at: top.x + (Math.random() - 0.5) * 120, left: 0.32 }; // lag spike
    if (state === 'play' && --nextPower <= 0) {
      cur.power = rollPower();
      cur.joke = cur.title; cur.title = POWERS[cur.power].title;
      nextPower = 6 + ((Math.random() * 4) | 0);
    }
    side = -side;
  }
  // how far the slider travels either side of the stack, limited so it never leaves the screen
  function sweep(w) { const half = (W && S ? W / S : WORLD_W) / 2; return Math.max(60, Math.min(RANGE, half - w / 2 - 8)); }
  function startGame() {
    initAudio();
    reset('play');
    sfx.start();
    paused = false; runStart = performance.now();
    cc('start');
  }
  function curSpeed() {
    let sp = speedFor(tabsN);
    if (slowLeft > 0) sp *= 0.6;
    if (cur && cur.power === 'virus') sp *= 1.45;
    return sp;
  }
  function addPoints(n) {
    score += n;
    const now = performance.now();
    if (now - lastScoreSent > 400) { lastScoreSent = now; cc('score', score); }
  }

  function drop() {
    if (state !== 'play' || !cur) return;
    const top = topTab();
    const off = cur.x - top.x;
    const l = Math.max(cur.x - cur.w / 2, top.x - top.w / 2);
    const r = Math.min(cur.x + cur.w / 2, top.x + top.w / 2);
    const ov = r - l;
    const pw = cur.power;
    if (ov <= 0.5 && !(Math.abs(off) <= PERFECT)) { // missed completely
      lastTitle = cur.joke || cur.title;
      debris.push(Object.assign(cur, { vx: cur.dir * curSpeed() * 0.4, vy: 40, rot: 0, vr: cur.dir * 2.5 }));
      cur = null;
      gameOver();
      return;
    }
    let placed;
    if (Math.abs(off) <= PERFECT || pw === 'pin') {
      combo++;
      bestCombo = Math.max(bestCombo, combo);
      let w = cur.w;
      if (combo >= 2 && w < BASE_W) w = Math.min(BASE_W, w + 6 + combo * 2);  // perfect streaks regrow the tab
      if (combo === 5 || combo === 10 || combo === 15) { toast(combo === 5 ? 'on fire. x2 → x' + mult() : combo === 10 ? 'ten perfect. crash is crying.' : 'are you a robot', COL.lilac, 1.4, false); sfx.milestone(); shake = Math.max(shake, 4); }
      placed = makeTab(top.x, w, cur.y, cur.title); placed.fav = cur.fav; placed.perfect = true;
      sfx.perfect(combo);
      toast(combo > 1 ? 'perfect x' + combo + (mult() > 1 ? '  ·  ' + mult() + 'x pts' : '') : 'perfect', COL.lime, 0.8, true);
      burst(top.x, cur.y + TAB_H / 2, w, COL.lime, 14 + Math.min(combo, 10) * 3);
      if (combo >= 2 && w > cur.w + 0.5) { placed.grow = 1; toast('+' + Math.round(w - cur.w) + ' width', COL.lime, 0.6, true); }
    } else {
      if (Math.abs(off) <= 14 && combo >= 2) toast('so close. streak gone.', COL.paper, 0.9, true);
      combo = 0;
      placed = makeTab((l + r) / 2, ov, cur.y, cur.title); placed.fav = cur.fav;
      const cutW = cur.w - ov;
      const cutX = off > 0 ? r + cutW / 2 : l - cutW / 2;
      const piece = makeTab(cutX, cutW, cur.y, cur.title);
      piece.fav = cur.fav; piece.cut = off > 0 ? 'left' : 'right';
      piece.vx = Math.sign(off) * (40 + Math.random() * 40); piece.vy = 60; piece.rot = 0; piece.vr = Math.sign(off) * (1.5 + Math.random() * 2);
      debris.push(piece);
      sfx.slice(); sfx.place();
      if (cutW > cur.w * 0.4) crashHit = 0.3;
      shake = Math.max(shake, 3);
      burst(off > 0 ? r : l, cur.y + TAB_H / 2, 4, COL.paper, 6);
    }
    placed.flash = 1;
    if (pw) { placed.power = pw; powersUsed++; }
    const dbl = pw && pw !== 'pin' && Math.abs(off) <= PERFECT ? 2 : 1;
    if (dbl > 1) toast('perfect power-up: double', COL.lime, 1, true);
    if (pw === 'reopen') { const nw = Math.min(BASE_W, placed.w + 70 * dbl); toast('tab restored. +' + Math.round(nw - placed.w) + ' width', COL.lilac, 1.2, true); placed.w = nw; burst(placed.x, cur.y + TAB_H / 2, nw, COL.lilac, 18); sfx.powerup(); }
    if (pw === 'slow') { slowLeft = 6 * dbl; toast('low power mode: ' + slowLeft + ' slow tabs', '#7fd8ff', 1.2, true); sfx.powerup(); }
    if (pw === 'star') { addPoints(10 * dbl); toast('bookmarked. +' + 10 * dbl, '#ffd84a', 1.2, true); burst(placed.x, cur.y + TAB_H / 2, placed.w, '#ffd84a', 18); sfx.powerup(); }
    if (pw === 'virus') { addPoints(5 * dbl); toast('survived the download. +' + 5 * dbl, '#ff5a5a', 1.2, true); shake = Math.max(shake, 6); sfx.powerup(); }
    if (pw === 'pin') toast('pinned.', COL.lime, 0.8, true);
    if (slowLeft > 0 && pw !== 'slow') slowLeft--;
    tabs.push(placed);
    tabsN++;
    addPoints(mult());
    const m = MILESTONES[tabsN];
    if (m) { toast(m, COL.lilac, 1.8, false); sfx.milestone(); }
    updateFan();
    spawn();
  }

  function gameOver() {
    state = 'over';
    overT = 0;
    crashHit = 0;
    shake = 10;
    if (score > best) { best = score; newBest = score > 0; saveBest(best); }
    sfx.cooked();
    cc('end', { score, durationMs: Math.round(performance.now() - runStart) });
    cc('event', 'run_over', { tabs: tabsN, bestCombo, powersUsed });
    updateFan();
  }
  function collapse() {
    // the whole tower gives up at once
    for (let i = 1; i < tabs.length; i++) {
      const tb = tabs[i];
      tb.vx = (Math.random() - 0.5) * 260 + tb.x * 0.8;
      tb.vy = 80 + Math.random() * 220;
      tb.rot = 0; tb.vr = (Math.random() - 0.5) * 8;
      debris.push(tb);
    }
    tabs.length = 1;
    sfx.collapse();
  }

  function toast(text, color, life, small) { toasts.push({ text, color, life, max: life, small }); if (toasts.length > 4) toasts.shift(); }
  function burst(x, y, w, color, n) {
    for (let i = 0; i < n; i++) {
      parts.push({ x: x + (Math.random() - 0.5) * w, y, vx: (Math.random() - 0.5) * 160, vy: Math.random() * 140, life: 0.5 + Math.random() * 0.3, color, sz: 3 + Math.random() * 3 });
    }
  }

  // ---------- input ----------
  let lastPress = 0;
  let btns = {}; // screen rects of drawn buttons: mute, share, again
  const inRect = (r, x, y) => r && x >= r.x && y >= r.y && x <= r.x + r.w && y <= r.y + r.h;
  function press(x, y) {
    const now = performance.now();
    if (now - lastPress < 60) return; // debounce
    lastPress = now;
    initAudio();
    if (x !== undefined && inRect(btns.mute, x, y)) { userMuted = !userMuted; applyMute(); return; }
    if (paused) { setPause(false); return; }
    if (state === 'menu') startGame();
    else if (state === 'play') drop();
    else if (state === 'over' && overT > 1.1) {
      if (x !== undefined && inRect(btns.share, x, y)) { share(); return; }
      startGame();
    }
  }
  let userMuted = false, hostMuted = false;
  try { userMuted = localStorage.getItem('cc-tab-hoarder-muted') === '1'; } catch (e) { /* ignore */ }
  function applyMute() { setMuted(userMuted || hostMuted); try { localStorage.setItem('cc-tab-hoarder-muted', userMuted ? '1' : '0'); } catch (e) { /* ignore */ } }
  function setPause(p) { if (state !== 'play') p = false; paused = p; if (ac) { if (p) ac.suspend(); else ac.resume(); } }
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.focus({ preventScroll: true }); const r = cv.getBoundingClientRect(); press(e.clientX - r.left, e.clientY - r.top); });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter' || e.key === ' ') { e.preventDefault(); if (!e.repeat) press(); }
    else if (e.key === 'm' || e.key === 'M') { userMuted = !userMuted; initAudio(); applyMute(); }
    else if (e.key === 'p' || e.key === 'Escape') setPause(!paused);
    else if ((e.key === 's' || e.key === 'S') && state === 'over') share();
  });
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { hostMuted = !!d.muted; applyMute(); }
    else if (d.type === 'cc-restart') startGame();
    else if (d.type === 'cc-pause') setPause(d.paused === undefined ? true : !!d.paused);
  });

  // ---------- share card ----------
  let shareMsg = '', shareMsgT = 0;
  // the streak counts PERFECT drops only (a run with no perfect drop is "no perfect drops", not a confusing "streak 0")
  function streakText() { return bestCombo ? 'best perfect streak ' + bestCombo : 'no perfect drops'; }
  function shareText() { return `tab hoarder: ${score} pts · ${tabsN} tabs · ${streakText()}\ncause of death: "${lastTitle}"\ncomputercooked.com/games/tab-hoarder`; }
  function card() {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
    const g = c.getContext('2d');
    g.fillStyle = COL.carbon; g.fillRect(0, 0, 1200, 630);
    for (let i = 0; i < Math.min(14, tabsN); i++) { // a little tower
      const w = 260 - i * 6 + Math.sin(i * 1.7) * 20, y = 560 - i * 34, x = 900 + Math.sin(i * 2.3) * 18;
      g.fillStyle = i % 2 ? COL.paper : COL.paper2; g.fillRect(x - w / 2, y - 30, w, 30); g.strokeStyle = COL.carbon; g.lineWidth = 3; g.strokeRect(x - w / 2, y - 30, w, 30);
    }
    if (crashReady) { g.imageSmoothingEnabled = false; g.drawImage(crashImg, 256, 0, 128, 128, 780, 560 - 0, 240, 70); }
    g.font = '900 88px ' + FONT; g.fillStyle = '#5e4a9e'; g.fillText('tab hoarder', 66, 146); g.fillStyle = COL.lime; g.fillText('tab hoarder', 60, 140);
    g.font = '900 150px ' + FONT; g.fillStyle = COL.paper; g.fillText(String(score), 60, 320);
    g.font = '800 34px ' + FONT; g.fillStyle = COL.lilac; g.fillText(`${tabsN} tabs · ${streakText()}`, 60, 390);
    g.font = '700 26px ' + FONT; g.fillStyle = 'rgba(245,243,237,.6)'; g.fillText(('cause of death: "' + lastTitle + '"').slice(0, 52), 60, 450);
    g.font = '800 28px ' + FONT; g.fillStyle = '#77756e'; g.fillText('computercooked.com/games/tab-hoarder', 60, 570);
    return c;
  }
  async function share() {
    cc('event', 'share_clicked', { score });
    const text = shareText();
    try {
      if (navigator.share) {
        const blob = await new Promise((r) => card().toBlob(r, 'image/png'));
        const file = blob && new File([blob], 'tab-hoarder.png', { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
        await navigator.share({ text }); return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    let saved = false;
    try { const a = document.createElement('a'); a.href = card().toDataURL('image/png'); a.download = 'tab-hoarder-' + score + '.png'; document.body.appendChild(a); a.click(); a.remove(); saved = true; } catch (e) { saved = false; }
    shareMsg = saved ? (ok ? 'image saved + text copied' : 'image saved') : ok ? 'text copied' : 'screenshot it'; shareMsgT = 2.5;
  }
  window.TH = { state: () => state, score: () => score, tabs: () => tabsN, combo: () => combo, cur: () => cur && { x: cur.x, power: cur.power || null }, top: () => ({ x: topTab().x, w: topTab().w }), card: () => card().toDataURL(), drop: () => press() };
  document.addEventListener('visibilitychange', () => {
    if (!ac) return;
    if (document.hidden) ac.suspend(); else ac.resume();
  });

  // ---------- update ----------
  function update(dt) {
    t += dt;
    if (shareMsgT > 0) shareMsgT -= dt;
    if (paused) return;
    if (cur) {
      const sp = state === 'menu' ? 110 : curSpeed();
      const cx0 = state === 'menu' ? 0 : topTab().x, R = sweep(cur.w);
      if (cur.lag && cur.lag.left > 0 && Math.abs(cur.x - cur.lag.at) < 6) { cur.lag.left -= dt; if (!cur.lag.shown) { cur.lag.shown = true; toast('lag spike', '#7fd8ff', 0.6, true); } }
      else cur.x += cur.dir * sp * dt;
      if (cur.x > cx0 + R) { cur.x = cx0 + R; cur.dir = -1; }
      if (cur.x < cx0 - R) { cur.x = cx0 - R; cur.dir = 1; }
      const edge = (W && S ? W / S : WORLD_W) / 2 - cur.w / 2 - 6;
      if (state === 'play' && edge > 20) { if (cur.x > edge) { cur.x = edge; cur.dir = -1; } if (cur.x < -edge) { cur.x = -edge; cur.dir = 1; } }
      if (state === 'menu' && Math.abs(cur.x) < 1 && Math.random() < 0.02) { /* demo idles */ }
    }
    if (state === 'over') {
      const before = overT;
      overT += dt;
      if (before < 0.4 && overT >= 0.4) collapse();
    }
    for (const tb of tabs) if (tb.flash > 0) tb.flash = Math.max(0, tb.flash - dt * 3);
    for (let i = debris.length - 1; i >= 0; i--) {
      const d = debris[i];
      d.vy -= 900 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      if (d.y < camY - 300) debris.splice(i, 1);
    }
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt; p.vy -= 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
    // steam off CRASH as it heats up
    const h = heat();
    if (state === 'play' && h > 0.25 && Math.random() < h * 0.5) {
      parts.push({ x: (Math.random() - 0.5) * 150, y: CRASH_TOP - 20, vx: (Math.random() - 0.5) * 40, vy: 60 + Math.random() * 60, life: 0.9, color: COL.lilac, sz: 4 + Math.random() * 4, steam: true });
    }
    for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].life -= dt; if (toasts[i].life <= 0) toasts.splice(i, 1); }
    shake = Math.max(0, shake - dt * 25);
    crashHit = Math.max(0, crashHit - dt);

    // camera: keep the active row ~38% from the top; fall back to CRASH on game over
    const viewH = H / S;
    let target;
    if (state === 'over' && overT > 0.4) target = -30;
    else {
      const topY = (cur ? cur.y : topTab().y) + TAB_H;
      target = Math.max(-30, topY - viewH * 0.62);
    }
    camY += (target - camY) * Math.min(1, dt * (state === 'over' ? 3 : 6));
  }

  // ---------- render ----------
  function fitTitle(title, maxW) {
    const key = title + '|' + Math.round(maxW);
    let v = titleCache.get(key);
    if (v !== undefined) return v;
    if (maxW < 14) v = '';
    else if (ctx.measureText(title).width <= maxW) v = title;
    else {
      let lo = 0, hi = title.length;
      while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (ctx.measureText(title.slice(0, mid) + '…').width <= maxW) lo = mid; else hi = mid - 1; }
      v = lo > 0 ? title.slice(0, lo) + '…' : '';
    }
    if (titleCache.size > 600) titleCache.clear();
    titleCache.set(key, v);
    return v;
  }

  function tabPath(l, top, w, h, cut) {
    const r = Math.min(7, w / 2, h / 2);
    const rl = cut === 'left' ? 0 : r, rr = cut === 'right' ? 0 : r;
    ctx.beginPath();
    ctx.moveTo(l, top + h);
    ctx.lineTo(l, top + rl);
    if (rl) ctx.quadraticCurveTo(l, top, l + rl, top); else ctx.lineTo(l, top);
    ctx.lineTo(l + w - rr, top);
    if (rr) ctx.quadraticCurveTo(l + w, top, l + w, top + rr); else ctx.lineTo(l + w, top);
    ctx.lineTo(l + w, top + h);
    ctx.closePath();
  }

  // draws a tab in world space (ctx already transformed, y flipped so we draw at -y)
  function drawTab(tb, active, idx) {
    const l = -tb.w / 2, top = -TAB_H, w = tb.w;
    let fill = active ? COL.lime : (idx % 2 ? COL.paper : COL.paper2);
    if (tb.power) fill = active ? POWERS[tb.power].color : (idx % 2 ? '#e9e2ff' : '#ddd3ff');
    tabPath(l, top, w, TAB_H - 2, tb.cut);
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = COL.carbon; ctx.stroke();
    if (tb.flash > 0) {
      ctx.globalAlpha = tb.flash * (tb.perfect ? 0.9 : 0.5);
      ctx.fillStyle = tb.perfect ? COL.lime : '#ffffff'; ctx.fill();
      ctx.globalAlpha = 1;
    }
    // favicon (power tabs get a glyph)
    if (tb.power && w > 22) {
      const gx = l + 14, gy = top + 14, k = tb.power;
      ctx.fillStyle = COL.carbon; ctx.strokeStyle = COL.carbon; ctx.lineWidth = 2;
      if (k === 'pin') { ctx.beginPath(); ctx.arc(gx, gy - 2, 4, 0, 7); ctx.fill(); ctx.fillRect(gx - 1, gy, 2, 7); }
      else if (k === 'reopen') { ctx.beginPath(); ctx.arc(gx, gy, 5, 0.6, 5.6); ctx.stroke(); ctx.fillRect(gx + 2, gy - 7, 4, 4); }
      else if (k === 'slow') { ctx.fillRect(gx - 5, gy - 6, 10, 2); ctx.fillRect(gx - 5, gy + 4, 10, 2); ctx.beginPath(); ctx.moveTo(gx - 4, gy - 4); ctx.lineTo(gx + 4, gy - 4); ctx.lineTo(gx - 4, gy + 4); ctx.lineTo(gx + 4, gy + 4); ctx.fill(); }
      else if (k === 'star') { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 2.6 : 6.5; ctx.lineTo(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(gx, gy, 4.5, 0, 7); ctx.fill(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.fillRect(gx + Math.cos(a) * 6 - 1, gy + Math.sin(a) * 6 - 1, 2.5, 2.5); } }
    } else if (w > 22) {
      ctx.fillStyle = active && tb.fav === COL.lime ? COL.carbon : tb.fav;
      ctx.fillRect(l + 8, top + 8, 12, 12);
      if (tb.fav !== COL.carbon && !(active && tb.fav === COL.lime)) { ctx.strokeStyle = COL.carbon; ctx.lineWidth = 1.5; ctx.strokeRect(l + 8, top + 8, 12, 12); }
    }
    const hasX = w > 80;
    if (hasX) {
      ctx.strokeStyle = COL.ink; ctx.lineWidth = 1.8;
      const cx = l + w - 14, cy = top + 14;
      ctx.beginPath(); ctx.moveTo(cx - 4, cy - 4); ctx.lineTo(cx + 4, cy + 4); ctx.moveTo(cx + 4, cy - 4); ctx.lineTo(cx - 4, cy + 4); ctx.stroke();
    }
    const txt = fitTitle(tb.title, w - 28 - (hasX ? 24 : 6));
    if (txt) { ctx.fillStyle = COL.ink; ctx.fillText(txt, l + 26, top + 18.5); }
  }

  function worldTransform(sx, sy) {
    // world x=0 at center; world y up. screen = H - (y - camY)*S
    ctx.setTransform(dpr * S, 0, 0, dpr * S, dpr * (W / 2 + sx), dpr * (H + camY * S + sy));
  }

  function drawBackground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.carbon; ctx.fillRect(0, 0, W, H);
    // parallax grid
    const g = 36 * S;
    ctx.strokeStyle = COL.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    const oy = ((camY * S * 0.5) % g + g) % g;
    for (let y = oy; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    const ox = (W / 2) % g;
    for (let x = ox; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    ctx.stroke();
    // heat glow from the bottom
    const h = heat();
    if (h > 0.05) {
      const grd = ctx.createLinearGradient(0, H, 0, H * 0.3);
      grd.addColorStop(0, 'rgba(181,154,255,' + (0.22 * h) + ')');
      grd.addColorStop(1, 'rgba(181,154,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
    }
  }

  function drawWorld() {
    const sh = shake > 0 ? (Math.random() - 0.5) * shake * S : 0;
    const shy = shake > 0 ? (Math.random() - 0.5) * shake * S : 0;
    const h = heat();
    const viewTop = camY + H / S + 60, viewBot = camY - 60;
    ctx.font = 'bold 11px ' + FONT;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    // floor line
    worldTransform(sh, shy);
    ctx.fillStyle = 'rgba(197,255,73,0.25)';
    ctx.fillRect(-WORLD_W, 0, WORLD_W * 2, 2);

    // CRASH
    if (viewBot < CRASH_W) {
      const jit = state === 'play' && h > 0.35 ? (Math.random() - 0.5) * h * 3 : 0;
      worldTransform(sh + jit * S, shy);
      let frame = 0;
      if (state === 'over') frame = 2; else if (crashHit > 0 || (h > 0.7 && Math.sin(t * 9) > 0.6)) frame = 1;
      if (crashReady) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(crashImg, frame * 128, 0, 128, 128, -CRASH_W / 2, -CRASH_W, CRASH_W, CRASH_W);
      } else {
        ctx.fillStyle = COL.beige; ctx.fillRect(-80, -CRASH_W + 15, 160, 130);
      }
    }

    // tower
    for (let i = 0; i < tabs.length; i++) {
      const tb = tabs[i];
      if (tb.y > viewTop || tb.y + TAB_H < viewBot) continue;
      worldTransform(sh, shy);
      ctx.translate(tb.x, -tb.y);
      drawTab(tb, false, i);
    }
    // active tab
    if (cur && state !== 'over') {
      worldTransform(sh, shy);
      ctx.translate(cur.x, -cur.y);
      // drop shadow guide
      ctx.fillStyle = 'rgba(197,255,73,0.10)';
      ctx.fillRect(-cur.w / 2, 0, cur.w, 3);
      drawTab(cur, true, 0);
    }
    // debris
    for (const d of debris) {
      worldTransform(sh, shy);
      ctx.translate(d.x, -(d.y + TAB_H / 2));
      ctx.rotate(-d.rot);
      ctx.translate(0, TAB_H / 2);
      drawTab(d, false, 1);
    }
    // particles
    worldTransform(sh, shy);
    for (const p of parts) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * (p.steam ? 0.6 : 2)));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.sz / 2, -p.y - p.sz / 2, p.sz, p.sz);
    }
    ctx.globalAlpha = 1;
  }

  function text(str, x, y, size, color, align, weight) {
    ctx.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }
  // wraps text to maxW, returns lines
  function wrap(str, size, maxW) {
    ctx.font = 'bold ' + size + 'px ' + FONT;
    const words = str.split(' '), lines = [];
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  function drawHUD() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = 'alphabetic';
    const pad = 16;
    const u = Math.max(0.8, Math.min(1.4, S * 1.1)); // ui scale
    if (state === 'play') {
      text(String(score), pad, pad + 40 * u, Math.round(44 * u), COL.lime);
      text('pts · ' + tabsN + (tabsN === 1 ? ' tab open' : ' tabs open'), pad + 2, pad + 58 * u, Math.round(12 * u), COL.paper);
      if (mult() > 1 || combo >= 2) {
        const pulse = 1 + Math.sin(t * 10) * 0.06;
        text('streak ' + combo + (mult() > 1 ? '  ' + mult() + 'x' : ''), pad, pad + 118 * u, Math.round(18 * u * pulse), mult() > 1 ? COL.lilac : COL.lime, 'left');
      }
      if (slowLeft > 0) text('low power: ' + slowLeft, pad, pad + 138 * u, Math.round(12 * u), '#7fd8ff', 'left', 'normal');
      // temp meter
      const h = heat();
      const bw = 110 * u, by = pad + 68 * u;
      ctx.fillStyle = 'rgba(245,243,237,0.12)'; ctx.fillRect(pad, by, bw, 6 * u);
      ctx.fillStyle = h > 0.7 ? COL.lilac : COL.lime; ctx.fillRect(pad, by, bw * Math.max(0.04, h), 6 * u);
      const temp = Math.round(41 + tabsN * 1.3);
      const rpm = (1200 + tabsN * 95).toLocaleString('en-US');
      text('cpu ' + temp + '°c · fan ' + rpm + ' rpm', pad, by + 20 * u, Math.round(10 * u), 'rgba(245,243,237,0.6)', 'left', 'normal');
      text('best ' + best, W - pad - 44, pad + 18 * u, Math.round(13 * u), COL.paper, 'right');
    }
    // mute button (top right)
    const mb = { x: W - 44, y: 10, w: 34, h: 34 };
    btns.mute = mb;
    ctx.fillStyle = 'rgba(245,243,237,0.08)'; ctx.fillRect(mb.x, mb.y, mb.w, mb.h);
    ctx.strokeStyle = 'rgba(245,243,237,0.25)'; ctx.lineWidth = 1.5; ctx.strokeRect(mb.x + 0.5, mb.y + 0.5, mb.w - 1, mb.h - 1);
    text(userMuted || hostMuted ? 'x' : '♪', mb.x + mb.w / 2, mb.y + 23, 16, userMuted || hostMuted ? 'rgba(245,243,237,0.4)' : COL.paper, 'center');
    if (paused) {
      ctx.fillStyle = 'rgba(16,17,20,0.75)'; ctx.fillRect(0, 0, W, H);
      text('paused', W / 2, H / 2, 32, COL.lime, 'center');
      text('tap to resume', W / 2, H / 2 + 28, 14, COL.paper, 'center', 'normal');
    }
    // toasts
    let ty = H * 0.30;
    for (const tt of toasts) {
      const a = Math.min(1, tt.life / 0.3, (tt.max - tt.life) / 0.1 + 0.2);
      ctx.globalAlpha = Math.max(0, a);
      const size = Math.round((tt.small ? 16 : 20) * u);
      const lines = wrap(tt.text, size, W - 40);
      for (const ln of lines) {
        const rise = (1 - tt.life / tt.max) * 18;
        ctx.font = 'bold ' + size + 'px ' + FONT;
        ctx.textAlign = 'center';
        ctx.lineWidth = 5; ctx.strokeStyle = COL.carbon; ctx.strokeText(ln, W / 2, ty - rise);
        ctx.fillStyle = tt.color; ctx.fillText(ln, W / 2, ty - rise);
        ty += size * 1.25;
      }
      ty += 6;
    }
    ctx.globalAlpha = 1;
    // credit
    text('computer cooked games', pad, H - 12, Math.round(10 * u), 'rgba(245,243,237,0.45)', 'left', 'normal');
  }

  function drawMenu() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const u = Math.max(0.85, Math.min(1.5, S * 1.15));
    const cx = W / 2;
    let y = Math.max(70, H * 0.14);
    text('computer cooked games presents', cx, y - 34 * u, Math.round(10 * u), 'rgba(245,243,237,0.55)', 'center', 'normal');
    text('tab hoarder', cx, y + 10 * u, Math.round(46 * u), COL.lime, 'center');
    y += 44 * u;
    const lines = wrap('drop browser tabs onto crash. overhang gets cut. perfect drops grow the tab back and stack a multiplier. colored tabs are power-ups. miss once and you\'re cooked.', Math.round(13 * u), Math.min(W - 40, 360 * u));
    for (const ln of lines) { text(ln, cx, y, Math.round(13 * u), COL.paper, 'center', 'normal'); y += 19 * u; }
    y += 18 * u;
    const blink = Math.sin(t * 5) > -0.3;
    if (blink) text('tap / click / space to start', cx, y, Math.round(14 * u), COL.lilac, 'center');
    if (best > 0) text('best: ' + best + ' pts', cx, y + 26 * u, Math.round(12 * u), 'rgba(245,243,237,0.7)', 'center', 'normal');
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function drawOver() {
    if (overT < 0.6) return;
    const k = Math.min(1, (overT - 0.6) / 0.25);
    const e = 1 - Math.pow(1 - k, 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const u = Math.max(0.85, Math.min(1.4, S * 1.1));
    const cw = Math.min(W - 32, 400 * u);
    const ch = 372 * u;
    const cx = (W - cw) / 2;
    const cy = Math.max(12, Math.min(H * 0.1, (H - ch) * 0.35)) + (1 - e) * 30;
    ctx.globalAlpha = e;
    // card: looks like a browser window
    roundRect(cx, cy, cw, ch, 12 * u);
    ctx.fillStyle = COL.carbon; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = COL.lime; ctx.stroke();
    // title bar
    ctx.save(); roundRect(cx, cy, cw, 30 * u, 12 * u); ctx.clip();
    ctx.fillStyle = COL.lime; ctx.fillRect(cx, cy, cw, 30 * u); ctx.restore();
    ctx.fillStyle = COL.lime; ctx.fillRect(cx, cy + 18 * u, cw, 12 * u);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = COL.carbon; ctx.beginPath(); ctx.arc(cx + (16 + i * 14) * u, cy + 15 * u, 4 * u, 0, Math.PI * 2); ctx.fill(); }
    text('status: cooked', cx + cw - 12 * u, cy + 20 * u, Math.round(12 * u), COL.carbon, 'right');

    const mid = W / 2;
    let y = cy + 30 * u;
    text(String(score), mid, y + 96 * u, Math.round(96 * u), COL.lime, 'center');
    y += 122 * u;
    const msg = 'i hoarded ' + tabsN + (tabsN === 1 ? ' tab' : ' tabs') + ' (' + score + ' pts, ' + streakText() + ') before getting cooked.';
    const lines = wrap(msg, Math.round(16 * u), cw - 36 * u);
    for (const ln of lines) { text(ln, mid, y, Math.round(16 * u), COL.paper, 'center'); y += 22 * u; }
    y += 4 * u;
    const cod = wrap('cause of death: "' + lastTitle + '"', Math.round(11 * u), cw - 36 * u);
    for (const ln of cod) { text(ln, mid, y, Math.round(11 * u), 'rgba(245,243,237,0.55)', 'center', 'normal'); y += 16 * u; }
    y += 8 * u;
    text(newBest ? 'new personal best' : 'best: ' + best, mid, y, Math.round(12 * u), newBest ? COL.lilac : 'rgba(245,243,237,0.6)', 'center', newBest ? 'bold' : 'normal');
    y = cy + ch - 24 * u;
    ctx.fillStyle = 'rgba(245,243,237,0.15)'; ctx.fillRect(cx + 18 * u, y - 20 * u, cw - 36 * u, 1);
    text('computercooked.com/games', mid, y, Math.round(13 * u), COL.lilac, 'center');
    // share button
    const sb = { w: 200 * u, h: 30 * u }; sb.x = mid - sb.w / 2; sb.y = cy + ch - 104 * u;
    btns.share = sb;
    ctx.fillStyle = COL.lilac; ctx.fillRect(sb.x, sb.y, sb.w, sb.h);
    text(shareMsgT > 0 ? shareMsg : 'share (s)', mid, sb.y + sb.h * 0.68, Math.round(13 * u), COL.carbon, 'center');
    if (overT > 1.1 && Math.sin(t * 5) > -0.3) {
      text('tap anywhere else / space to go again', mid, cy + ch - 56 * u, Math.round(12 * u), COL.lime, 'center');
    }
    ctx.globalAlpha = 1;
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    drawBackground();
    drawWorld();
    if (state === 'menu') drawMenu();
    drawHUD();
    if (state === 'over') drawOver();
    requestAnimationFrame(frame);
  }

  resize();
  reset('menu');
  requestAnimationFrame(frame);

})();
