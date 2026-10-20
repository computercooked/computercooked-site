/* Handbag Havoc: boot, input, frame loop, menus, share line. */
(function () {
  'use strict';
  const HH = window.HH;
  const $ = (id) => document.getElementById(id);
  const canvas = $('c');
  const ctx = canvas.getContext('2d', { alpha: false });
  const params = new URLSearchParams(location.search);
  const STEP = 1 / 60;

  // ---------------------------------------------------------- storage (per-viewer conveniences only)
  const SKEY = 'handbag-havoc.v1';
  let save = { best: { wave: 0, time: 0, yeets: 0, chain: 0, mph: 0 }, wins: 0, runs: 0, daily: {}, settings: { mute: false, shake: true } };
  try { const s = JSON.parse(localStorage.getItem(SKEY) || 'null'); if (s && s.best) save = Object.assign(save, s); } catch (e) { /* storage blocked */ }
  function persist() { try { localStorage.setItem(SKEY, JSON.stringify(save)); } catch (e) { /* ignore */ } }
  if (params.get('mute') === '1') save.settings.mute = true;

  // no analytics and no portal SDKs on computercooked.com: kept as no-ops so the rest of the code reads the same
  const track = () => {};
  const P = null;
  const portal = () => {};
  // cc-sdk (injected by the site, missing elsewhere): one start/end pair per run, score = gnomes yeeted
  const ccCall = (fn) => { try { if (window.cc) fn(window.cc); } catch (err) { /* never break the game */ } };
  let ccLive = false;
  function ccEnd(g, completed) {
    if (!ccLive || !g) return;
    ccLive = false;
    ccCall((c) => c.end && c.end({ score: g.stats.yeets, durationMs: Math.round(g.t * 1000), completed }));
  }
  let hostMuted = false;   // the player page's mute button (postMessage cc-mute) always wins
  const mq = (q) => { try { return window.matchMedia(q).matches; } catch (err) { return false; } };
  const reducedMotion = mq('(prefers-reduced-motion: reduce)');
  const coarse = mq('(pointer: coarse)');
  function applyMute() { HH.SFX.setMuted(save.settings.mute || hostMuted); }
  applyMute();

  // ---------------------------------------------------------- canvas sizing
  let vw = 0, vh = 0, dpr = 1;
  const safe = { t: 0, r: 0, b: 0, l: 0 };   // notch / home-bar insets, read from CSS env() so the canvas HUD avoids them
  function readSafe() {
    try { const cs = getComputedStyle($('safe')); safe.t = parseFloat(cs.paddingTop) || 0; safe.r = parseFloat(cs.paddingRight) || 0; safe.b = parseFloat(cs.paddingBottom) || 0; safe.l = parseFloat(cs.paddingLeft) || 0; } catch (e) { /* keep zeros */ }
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    readSafe();
  }
  window.addEventListener('resize', resize); resize();

  // ---------------------------------------------------------- state
  let screen = 'title';           // title | play | upgrade | summary | pause
  let game = null, demo = null, demoMem = {}, mode = 'run';
  let acc = 0, last = performance.now(), overT = 0, upLock = 0, selIdx = 0;
  const botName = params.get('autoplay');   // random | skilled: lets a bot drive (attract/QA)
  const speed = Math.max(1, Math.min(8, +params.get('speed') || 1));
  const dailyNo = () => { const d = new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 9, 1)) / 86400000) + 1; };
  const dailySeed = () => { const d = new Date(); return (d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) * 2654435761 >>> 0; };

  // ---------------------------------------------------------- QA / perf hooks
  const perf = { frames: 0, secT: 0, fpsLog: [], ftMax: 0, ft: [] };
  window.__hh = {
    get screen() { return screen; }, get game() { return game; }, perf,
    info() { const g = game; return { screen, mode, state: g && g.state, t: g ? +g.t.toFixed(2) : 0, wave: g ? g.wave + 1 : 0, hp: g ? g.player.hp : 0, enemies: g ? g.enemies.length : 0, yeets: g ? g.stats.yeets : 0, bestChain: g ? g.stats.bestChain : 0, win: g ? g.win : false, offers: g && g.offers, firstHit: g ? g.stats.firstHit : null }; },
  };

  // ---------------------------------------------------------- input
  const keys = new Set();
  const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0, active: false };
  function inputVec() {
    if (joy.active) return { x: joy.x, y: joy.y };
    let x = 0, y = 0;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) x -= 1;
    if (keys.has('ArrowRight') || keys.has('KeyD')) x += 1;
    if (keys.has('ArrowUp') || keys.has('KeyW')) y -= 1;
    if (keys.has('ArrowDown') || keys.has('KeyS')) y += 1;
    const l = Math.hypot(x, y) || 1;
    return { x: x / l, y: y / l };
  }
  window.addEventListener('keydown', (e) => {
    HH.SFX.init();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (e.repeat) return;
    if (e.code === 'KeyM') toggleSound();
    if (screen === 'title' && (e.code === 'Enter' || e.code === 'Space')) startRun('run');
    else if (screen === 'upgrade') {
      if (performance.now() < upLock) return;
      if (e.code === 'Digit1' || e.code === 'Numpad1') pickCard(0);
      if (e.code === 'Digit2' || e.code === 'Numpad2') pickCard(1);
      if (e.code === 'Digit3' || e.code === 'Numpad3') pickCard(2);
      if (e.code === 'ArrowLeft' || e.code === 'ArrowUp' || e.code === 'KeyA' || e.code === 'KeyW') selectCard(selIdx - 1);
      if (e.code === 'ArrowRight' || e.code === 'ArrowDown' || e.code === 'KeyD' || e.code === 'KeyS') selectCard(selIdx + 1);
      if (e.code === 'Enter' || e.code === 'Space') pickCard(selIdx);
    } else if (screen === 'summary') {
      if (performance.now() < upLock) return;
      if (e.code === 'KeyR' || e.code === 'Enter' || e.code === 'Space') startRun(mode);
      if (e.code === 'Escape') toTitle();
    } else if (screen === 'play') {
      if (e.code === 'Escape' || e.code === 'KeyP') setPause(true);
      if (e.code === 'KeyR') startRun(mode);
    } else if (screen === 'pause') {
      if (e.code === 'Escape' || e.code === 'KeyP' || e.code === 'Enter' || e.code === 'Space') setPause(false);
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); joy.active = false; joy.id = null; if (screen === 'play') setPause(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') setPause(true); });

  canvas.addEventListener('pointerdown', (e) => {
    HH.SFX.init();
    if (screen !== 'play' || joy.id !== null) return;
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0; joy.active = true;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerId !== joy.id) return;
    const R = Math.max(44, Math.min(vw, vh) * 0.1);
    let dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
    const d = Math.hypot(dx, dy);
    if (d > R) { joy.ox += (dx / d) * (d - R); joy.oy += (dy / d) * (d - R); dx = e.clientX - joy.ox; dy = e.clientY - joy.oy; } // floating base follows the thumb
    const k = Math.min(1, Math.hypot(dx, dy) / R);
    const a = Math.atan2(dy, dx);
    const dead = 0.12;
    joy.x = k < dead ? 0 : Math.cos(a) * k; joy.y = k < dead ? 0 : Math.sin(a) * k;
  });
  const endJoy = (e) => { if (e.pointerId === joy.id) { joy.id = null; joy.active = false; joy.x = joy.y = 0; } };
  canvas.addEventListener('pointerup', endJoy); canvas.addEventListener('pointercancel', endJoy);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  function drawJoystick() {
    if (!joy.active || screen !== 'play') return;
    const R = Math.max(44, Math.min(vw, vh) * 0.1);
    ctx.save(); ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.arc(joy.ox, joy.oy, R, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff6e6';
    ctx.beginPath(); ctx.arc(joy.ox + joy.x * R, joy.oy + joy.y * R, R * 0.42, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // first-run hint: what to touch, until the player has steered once (cleared on first real input)
  function drawSteerHint(now) {
    if (!game || game.moved || game.t > 12 || save.runs > 3 || game.state !== 'play') return;
    const s = Math.max(0.8, Math.min(1.3, Math.min(vw, vh) / 600));
    const y = vh - safe.b - 120 * s, a = 0.75 + 0.25 * Math.sin(now / 180);
    const txt = coarse ? 'drag in circles. turning powers the purse' : 'steer in circles. turning powers the purse';
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = `900 ${Math.round(20 * s)}px ${HH.FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const w = ctx.measureText(txt).width + 36 * s, h = 44 * s;
    ctx.fillStyle = 'rgba(16,17,20,0.85)'; ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(vw / 2 - w / 2, y - h / 2, w, h, h / 2); else ctx.rect(vw / 2 - w / 2, y - h / 2, w, h);
    ctx.fill();
    ctx.fillStyle = '#C5FF49'; ctx.fillText(txt, vw / 2, y + 1);
    // a ghost thumb sliding side to side above the label
    const fx = vw / 2 + Math.sin(now / 420) * 60 * s, fy = y - 52 * s;
    ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#fff6e6';
    ctx.beginPath(); ctx.arc(fx, fy, 14 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,246,230,0.6)'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(vw / 2 - 60 * s, fy); ctx.lineTo(vw / 2 + 60 * s, fy); ctx.stroke();
    ctx.restore();
  }

  // ---------------------------------------------------------- screens
  function show(id, on) { $(id).classList.toggle('show', on); }
  function toTitle() {
    if (game && (screen === 'play' || screen === 'pause' || screen === 'upgrade')) { track('level_end', runProps(game, 'quit')); ccEnd(game, false); }
    portal((p) => p.gameplayStop());
    screen = 'title'; game = null;
    show('summary', false); show('upgrade', false); show('pause', false); show('title', true);
    $('pauseBtn').style.display = 'none';
    renderBests();
  }
  // level_end props follow the template (games/_templates/web/web-game/README.md): level, result win|lose, score, ms.
  // A run quit or restarted mid-way is a lose with a reason, so the five events keep one vocabulary across Lab games.
  function runProps(g, result) {
    const r = result === 'win' || result === 'lose' ? result : 'lose';
    return { level: g.win ? 6 : g.wave + 1, result: r, reason: result, score: g.stats.yeets, ms: Math.round(g.t * 1000), mode, best_chain: g.stats.bestChain, daily: g.daily || 0 };
  }
  function startRun(m) {
    HH.SFX.init();
    const isRetry = !!game && (screen === 'summary' || screen === 'play' || screen === 'pause');
    if (isRetry) {
      if (screen !== 'summary') { track('level_end', runProps(game, 'restart')); ccEnd(game, false); }
      track('retry', { level: game.win ? 6 : game.wave + 1, mode: m, from: screen });
      // a natural break: portals may show an ad here (CrazyGames Basic Launch has ads off; local is instant)
      if (P && P.name !== 'local') { portal((p) => p.gameplayStop()); screen = 'title'; P.breakAd().then(() => beginRun(m)); return; }
    }
    beginRun(m);
  }
  function beginRun(m) {
    mode = m;
    const seed = m === 'daily' ? dailySeed() : (+params.get('seed') || 0);
    game = new HH.Game({ seed, daily: m === 'daily' ? dailyNo() : 0, sfx: HH.SFX });
    // debug: ?wave=N starts at wave N with sensible upgrades already picked
    const skip = Math.min(5, +params.get('wave') || 1);
    game.debug = skip > 1;   // test jumps never write bests
    for (let i = 1; i < skip; i++) { game.state = 'upgrade'; game.offers = game.makeOffers(); game.choose(HH.Bots.skilled.pick(game)); }
    window.__hh.botMem = {};
    acc = 0; overT = 0; joy.active = false; joy.id = null;
    screen = 'play';
    show('title', false); show('summary', false); show('upgrade', false); show('pause', false);
    $('pauseBtn').style.display = 'block';
    save.runs++; persist();
    track('level_start', { level: game.wave + 1, mode: m, run: save.runs, daily: game.daily || 0 });
    if (!game.debug) { ccLive = true; ccCall((c) => c.start && c.start()); }
    portal((p) => p.gameplayStart());
  }
  function setPause(on) {
    if (on && screen === 'play') { screen = 'pause'; show('pause', true); keys.clear(); joy.active = false; joy.id = null; portal((p) => p.gameplayStop()); }
    else if (!on && screen === 'pause') { screen = 'play'; show('pause', false); last = performance.now(); portal((p) => p.gameplayStart()); }
  }

  const iconCache = {};
  const icon = (id, s) => iconCache[id + s] || (iconCache[id + s] = HH.upgradeIcon(id, s));

  function showUpgrade() {
    screen = 'upgrade';
    portal((p) => p.gameplayStop());
    keys.clear(); joy.active = false; joy.id = null;
    $('upHead').textContent = `wave ${game.wave + 1} cleared`;
    const cards = $('cards'); cards.innerHTML = '';
    game.offers.forEach((id, i) => {
      const u = HH.UP_BY_ID[id], lv = game.up[id];
      const b = document.createElement('button');
      b.className = 'card' + (u.sig ? ' sig' : '');
      b.dataset.i = i;
      let pips = '';
      for (let k = 0; k < u.max; k++) pips += `<span class="pip ${k < lv ? 'on' : k === lv ? 'new' : ''}"></span>`;
      b.innerHTML = `<span class="key">${i + 1}</span><img alt="" src="${icon(id, 64)}"><div class="nm">${u.name}</div><div class="ds">${u.desc}</div><div class="pips">${pips}</div>`;
      b.addEventListener('click', () => { if (performance.now() >= upLock) pickCard(i); });
      b.addEventListener('pointerenter', () => selectCard(i, true));
      cards.appendChild(b);
    });
    selIdx = 0; selectCard(0, true);
    upLock = performance.now() + 380;
    show('upgrade', true);
  }
  function selectCard(i, silent) {
    const n = game && game.offers ? game.offers.length : 0; if (!n) return;
    selIdx = (i + n) % n;
    [...$('cards').children].forEach((c, k) => c.classList.toggle('sel', k === selIdx));
    if (!silent) HH.SFX.select && HH.SFX.select();
  }
  function pickCard(i) {
    if (screen !== 'upgrade' || !game.offers || !game.offers[i]) return;
    game.choose(game.offers[i]);
    show('upgrade', false);
    screen = 'play'; last = performance.now(); acc = 0;
    portal((p) => p.gameplayStart());
  }

  function shareLine(g) {
    const s = g.stats, mph = Math.round(s.topSpeed * HH.MPH);
    const sq = [0, 1, 2, 3, 4].map((w) => (g.win ? '🟩' : w < g.wave ? '🟩' : w === g.wave ? '🟥' : '⬛')).join('') + (g.win ? '👑' : '');
    const head = g.daily ? `handbag havoc · daily garden #${g.daily}` : 'handbag havoc';
    const res = g.win ? `toppled the gnome king in ${HH.fmtTime(s.time)}` : `wave ${g.wave + 1}/5 · ${HH.fmtTime(s.time)}`;
    return `${head}\n${sq} ${res}\n${s.yeets} gnomes yeeted · best bowl x${s.bestChain} · purse hit ${mph} mph\ncomputercooked.com/games/handbag-havoc`;
  }

  function showSummary() {
    const g = game, s = g.stats, mph = Math.round(s.topSpeed * HH.MPH);
    screen = 'summary';
    $('pauseBtn').style.display = 'none';
    portal((p) => p.gameplayStop());
    track('level_end', runProps(g, g.win ? 'win' : 'lose'));
    ccEnd(g, true);
    if (g.win) portal((p) => p.happytime());
    const B = g.debug ? JSON.parse(JSON.stringify(save.best)) : save.best, nb = {};
    const reached = g.win ? 6 : g.wave + 1;
    if (reached > B.wave) { nb.wave = 1; B.wave = reached; }
    if (s.time > B.time) { nb.time = 1; B.time = s.time; }
    if (s.yeets > B.yeets) { nb.yeets = 1; B.yeets = s.yeets; }
    if (s.bestChain > B.chain) { nb.chain = 1; B.chain = s.bestChain; }
    if (mph > B.mph) { nb.mph = 1; B.mph = mph; }
    if (g.win && !g.debug) save.wins++;
    if (g.daily) { const d = save.daily[g.daily] || { yeets: 0 }; if (s.yeets > d.yeets) save.daily[g.daily] = { yeets: s.yeets, win: g.win }; }
    persist();
    const first = save.runs <= 1;
    $('sumTitle').textContent = g.win ? 'the king has fallen.' : 'granny got gnomed.';
    $('sumTitle').classList.toggle('win', g.win);
    let sub;
    if (g.win) sub = `${s.yeets} gnomes yeeted in ${HH.fmtTime(s.time)}. long live granny.`;
    else if (g.king) sub = `the gnome king had ${Math.max(1, Math.round(s.bossHp * 100))}% left. so close. not close enough.`;
    else { const W = HH.WAVES[g.wave]; const left = Math.max(0, Math.ceil(W.dur - g.waveT)); sub = left <= 5 ? `wave ${g.wave + 1} had ${left}s left. painful.` : `${4 - g.wave} more wave${g.wave === 3 ? '' : 's'} to the gnome king. she believes in you.`; }
    $('sumSub').textContent = sub;
    $('squares').innerHTML = [0, 1, 2, 3, 4].map((w) => `<span class="sq ${g.win ? (w === 4 ? 'crown' : 'ok') : w < g.wave ? 'ok' : w === g.wave ? 'dead' : ''}"></span>`).join('');
    const stat = (v, l, k, wide) => `<div class="stat${wide ? ' wide' : ''}"><div class="v">${v}</div><div class="l">${l}</div>${nb[k] && !first ? '<span class="nb">new best</span>' : ''}</div>`;
    $('stats').innerHTML = stat(s.yeets, 'gnomes yeeted', 'yeets') + stat('x' + s.bestChain, 'best bowl', 'chain') + stat(HH.fmtTime(s.time), 'survived', 'time') + stat(mph + ' mph', 'purse top speed', 'mph');
    const counts = {}; s.picks.forEach((p) => (counts[p] = (counts[p] || 0) + 1));
    $('build').innerHTML = Object.keys(counts).map((id) => `<img alt="${HH.UP_BY_ID[id].name}" title="${HH.UP_BY_ID[id].name} x${counts[id]}" src="${icon(id, 30)}">`).join('');
    $('shareText').textContent = shareLine(g);
    $('shareBtn').style.display = navigator.share && (!P || P.allowShare) ? 'inline-block' : 'none';
    upLock = performance.now() + 300;
    show('summary', true);
    setTimeout(() => { try { $('againBtn').focus({ preventScroll: true }); } catch (e) { /* ignore */ } }, 50);
  }

  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1400); }
  function copyText(txt) {
    const fallback = () => { const ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('copied. go brag.'); } catch (e) { toast('select it and copy it yourself'); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(() => toast('copied. go brag.'), fallback); else fallback();
  }

  function renderBests() {
    const B = save.best;
    if (!save.runs) { $('bests').textContent = ''; return; }
    const w = B.wave >= 6 ? 'king toppled' : `best wave ${B.wave}`;
    const d = save.daily[dailyNo()];
    $('bests').textContent = `${w} · ${B.yeets} gnomes · best bowl x${B.chain} · ${B.mph} mph` + (d ? ` · today: ${d.yeets} gnomes` : '');
    $('dailyBtn').textContent = `daily garden #${dailyNo()}`;
  }

  function toggleSound() { save.settings.mute = !save.settings.mute; applyMute(); persist(); syncToggles(); }
  function toggleShake() { save.settings.shake = !save.settings.shake; persist(); syncToggles(); }
  function syncToggles() {
    const snd = 'sound: ' + (save.settings.mute ? 'off' : 'on'), shk = 'shake: ' + (save.settings.shake ? 'on' : 'off');
    $('sndBtn').textContent = snd; $('pSndBtn').textContent = snd; $('shakeBtn').textContent = shk; $('pShakeBtn').textContent = shk;
  }
  $('playBtn').addEventListener('click', () => startRun('run'));
  $('dailyBtn').addEventListener('click', () => startRun('daily'));
  $('sndBtn').addEventListener('click', toggleSound);
  $('shakeBtn').addEventListener('click', toggleShake);
  $('pSndBtn').addEventListener('click', toggleSound);
  $('pShakeBtn').addEventListener('click', toggleShake);
  $('againBtn').addEventListener('click', () => { if (performance.now() >= upLock) startRun(mode); });
  $('menuBtn').addEventListener('click', toTitle);
  $('copyBtn').addEventListener('click', () => { copyText($('shareText').textContent); track('share', { method: 'copy', mode }); });
  $('shareBtn').addEventListener('click', () => {
    track('share', { method: 'native', mode });
    try { navigator.share({ text: $('shareText').textContent }).catch(() => {}); } catch (e) { copyText($('shareText').textContent); }
  });
  $('pauseBtn').addEventListener('click', () => setPause(true));
  $('resumeBtn').addEventListener('click', () => setPause(false));
  $('quitBtn').addEventListener('click', toTitle);
  syncToggles(); renderBests();
  $('dailyBtn').textContent = `daily garden #${dailyNo()}`;

  // ---------------------------------------------------------- attract-mode demo behind the title
  function newDemo() { demo = new HH.Game({ seed: (Math.random() * 1e9) | 0, demo: true }); demoMem = {}; }
  function stepDemo(dt) {
    if (!demo || demo.state === 'over') newDemo();
    if (demo.state === 'upgrade') { demo.choose(HH.Bots.skilled.pick(demo)); return; }
    const v = HH.Bots.skilled.move(demo, demoMem, dt);
    demo.input.x = v.x; demo.input.y = v.y;
    demo.update(dt);
  }

  // ---------------------------------------------------------- frame loop
  const botRnd = HH.mulberry32(12345);
  function frame(now) {
    requestAnimationFrame(frame);   // schedule first so one bad frame can never freeze the game
    try { tick(now); } catch (err) { console.error('frame error:', err && err.stack || err); }
  }
  function tick(now) {
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    // perf log (frames per wall-clock second)
    perf.frames++; perf.secT += dt; perf.ft.push(dt * 1000);
    if (perf.secT >= 1) { perf.fpsLog.push(Math.round(perf.frames / perf.secT)); perf.frames = 0; perf.secT = 0; if (perf.fpsLog.length > 600) perf.fpsLog.shift(); if (perf.ft.length > 4000) perf.ft.splice(0, 2000); }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const opts = { shake: save.settings.shake, shakeScale: reducedMotion ? 0.25 : 1, dpr, safe };
    if (screen === 'title') {
      if (params.get('noattract') !== '1') {
        demo && demo.tickReal(dt);
        for (let i = 0; i < 1; i++) stepDemo(STEP);
        demo.render(ctx, vw, vh, { shake: false, noHud: true, dpr });
        ctx.fillStyle = 'rgba(16,17,20,0.5)'; ctx.fillRect(0, 0, vw, vh);
      } else { ctx.fillStyle = '#2f5e2a'; ctx.fillRect(0, 0, vw, vh); }
    } else if (game) {
      if (screen === 'play') {
        // optional bot driver (QA / attract recording)
        if (botName && HH.Bots[botName]) {
          const v = HH.Bots[botName].move(game, window.__hh.botMem, dt, botRnd);
          game.input.x = v.x; game.input.y = v.y;
        } else { const v = inputVec(); game.input.x = v.x; game.input.y = v.y; if (!game.moved && Math.hypot(v.x, v.y) > 0.3) game.moved = true; }
        if (game.tickReal(dt)) {
          acc += dt * game.timeScale() * speed;
          let n = 0;
          while (acc >= STEP && n < 6 * speed) { game.update(STEP); acc -= STEP; n++; }
          if (n >= 6 * speed) acc = 0;
        }
        if (game.state === 'upgrade') {
          if (botName && HH.Bots[botName]) { game.choose(HH.Bots[botName].pick(game, botRnd)); }
          else showUpgrade();
        }
        if (game.state === 'over') { overT += dt; if (overT > 0.15) showSummary(); }
      } else if (screen === 'summary' || screen === 'upgrade' || screen === 'pause') {
        game.tickReal(dt);
      }
      opts.noHud = screen === 'summary';
      game.render(ctx, vw, vh, opts);
      drawJoystick();
      if (screen === 'play' && !botName) drawSteerHint(now);
    }
  }
  requestAnimationFrame(frame);

  // ---------------------------------------------------------- player page (computercooked.com/games) controls
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { hostMuted = !!d.muted; applyMute(); }
    else if (d.type === 'cc-restart') startRun(screen === 'title' ? 'run' : mode);
  });

  if (params.get('autostart') === '1' || botName) startRun(params.get('daily') === '1' ? 'daily' : 'run');
})();
