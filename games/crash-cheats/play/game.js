/* crash cheats at tic tac toe — computer cooked games. vanilla js + canvas, no deps. */
(() => {
  'use strict';

  // ---------- palette / constants ----------
  const COL = {
    carbon: '#101114', lime: '#C5FF49', lilac: '#B59AFF', paper: '#F5F3ED', beige: '#D8CBA6',
    panel: '#17181d', line: '#2a2c33', dim: 'rgba(245,243,237,0.55)', coffee: '#7a5a3a',
    bsod: '#1f4fd6', pumpkin: '#FF8A3D'
  };
  const FONT = 'ui-monospace,"SF Mono",Menlo,Consolas,"Courier New",monospace';
  const SLUG = 'crash-cheats';
  const URL_TEXT = 'computercooked.com/games/' + SLUG;
  const REC_KEY = 'cc-crash-cheats-record';
  const SPOOKY_KEY = 'cc-crash-cheats-spooky';
  const CRASH_TO_WIN = 3, YOU_TO_WIN = 3, MAX_TOKENS = 3;
  // suspicion each cheat adds. at 100 the anticheat catches him and the round is yours.
  const SUS = { delete: 22, swap: 26, lag: 22, coffee: 18, rules: 28, bsod: 34 };
  const VERB = { delete: 'delete your x', swap: 'recolor your x', lag: 'lag-move twice', coffee: 'spill coffee', rules: 'rewrite the rules', bsod: 'blue-screen the board' };
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

  // per-round difficulty: crash blunders less and his cheats fail less
  const BLUNDER = [0.32, 0.22, 0.14, 0.09];
  const CHEAT_FAIL = [0.25, 0.15, 0.09, 0.05];
  const PRO_CHANCE = [0.2, 0.3, 0.4, 0.5];
  const PRO_MAX = [1, 2, 3, 4];
  const diff = (arr) => arr[Math.min(arr.length - 1, round - 1)];

  const LINES_TXT = {
    start: ['let\'s play. i\'m o. you go first. i\'m very fair.', 'tic tac toe. classic. nothing weird will happen.', 'go ahead. i won\'t cheat. (i will cheat.)'],
    round: ['new round. same rules. my rules.', 'round {r}. i\'ve been practicing.', 'round {r}. i updated my drivers.'],
    crashWin: ['gg. it was close. it wasn\'t.', 'skill issue (yours).', 'i\'d like to thank my cheats.', 'calculated.', 'clean win. no notes.', 'another one for the highlight reel.'],
    draw: ['draw. i\'ll allow it. this time.', 'draw. i was being nice.', 'draw. my fans needed a break.'],
    delete: ['oops. ctrl+z.', 'that x looked suspicious.', 'deleted for your safety.', 'that x violated community guidelines.'],
    lag: ['s-s-sorry. lag.', 'my wifi did that.', 'buffering... (i moved twice)'],
    coffee: ['oops. coffee.', 'that square is closed for cleaning.', 'spilled. totally by accident.'],
    swap: ['that one was always mine.', 'recolored. it\'s an o now.', 'x? i only see o.'],
    rules: ['terms updated: diagonals are premium now.', 'patch notes: diagonals removed. read them.'],
    bsodWin: ['restored from a backup where i won.', 'rebooted. checked the logs. i won.'],
    block: ['nice try.', 'saw that coming.', 'no.'],
    idle: ['take your time. i\'m only aging.', 'any day now.', 'i could run a full scan in this time.'],
    meltdown: ['no. no no no. this is fine.', 'this never happened.', 'i demand a recount.'],
    spooky: ['boo. also i cheat.', 'happy halloween. your x is a ghost now.'],
    caught: ['that wasn’t me. that was a different crash.', 'i was framed. by me.', 'the anticheat is biased against computers.'],
    blocked: ['firewall?? who taught you that.', 'rude. very rude.', 'access denied? to ME?'],
    missed: ['wait. there were two lines??', 'i only deleted one. you made two. unfair.', 'two lines is cheating.'],
    undone: ['you can’t ctrl+z ME.', 'hey. that was my cheat.', 'reverting my hard work. wow.'],
    reported: ['reported?? for what.', 'the mods love me. probably.', 'ok but have you considered: no.'],
    fwUp: ['what’s that wall for.', 'a firewall. cute.', 'i can see through walls. (i can’t.)'],
    roundLost: ['that round didn’t count. i was buffering.', 'fine. one round. enjoy it.', 'i let you have that one.']
  };
  const pick = (k) => { const a = LINES_TXT[k]; return a[(Math.random() * a.length) | 0].replace('{r}', round); };

  // ---------- canvas ----------
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, u = 1;
  let lay = null;
  function resize() {
    const r = cv.getBoundingClientRect();
    W = r.width || window.innerWidth; H = r.height || window.innerHeight;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.max(1, Math.round(W * dpr)); cv.height = Math.max(1, Math.round(H * dpr));
    u = Math.max(0.85, Math.min(1.45, Math.min(W, H) / 420));
    layout();
  }
  window.addEventListener('resize', resize);

  function layout() {
    const pad = 16, top = 72 * u, chipH = 50 * u;
    const land = W > H * 1.15 && W > 560;
    if (!land) {
      let cs = Math.min(W * 0.34, H * 0.2, 170);
      let bs = Math.min(W - pad * 2, H - top - cs - 26 - 34 - chipH);
      if (bs < 230) { cs = Math.max(70, cs - (230 - bs)); bs = Math.min(W - pad * 2, H - top - cs - 26 - 34 - chipH); }
      const free = Math.max(0, H - top - 34 - cs - 22 - bs - chipH), oy = top + free * 0.35;
      const bx = (W - bs) / 2, by = oy + cs + 22;
      lay = { land, board: { x: bx, y: by, s: bs }, crash: { x: pad, y: oy, s: cs }, bubble: { x: pad + cs + 10, y: oy + 4, w: W - pad * 2 - cs - 10 } };
    } else {
      const bs = Math.min(H - top - 50 - chipH, W * 0.52);
      const bx = W - pad * 2 - bs - Math.max(0, (W - bs - 520) * 0.25), by = top + (H - top - 30 - bs - chipH) / 2;
      const col = bx - pad * 2;
      const cs = Math.min(col * 0.55, H * 0.36, 220);
      const cx = pad + (col - cs) / 2;
      lay = { land, board: { x: bx, y: by, s: bs }, crash: { x: cx, y: by + 10, s: cs }, bubble: { x: pad + 8, y: by + cs + 30, w: col - 16 } };
    }
  }

  const crashImg = new Image(); let crashReady = false;
  crashImg.onload = () => { crashReady = true; }; crashImg.src = 'crash.png';
  const coffeeImg = new Image(); let coffeeReady = false;
  coffeeImg.onload = () => { coffeeReady = true; }; coffeeImg.src = 'coffee.png';

  // ---------- storage ----------
  function loadRec() { try { const v = JSON.parse(localStorage.getItem(REC_KEY)); if (v && typeof v.w === 'number') return v; } catch (e) { /* ignore */ } return { w: 0, l: 0 }; }
  function saveRec() { try { localStorage.setItem(REC_KEY, JSON.stringify(record)); } catch (e) { /* ignore */ } }
  function loadSpooky() {
    try { const v = localStorage.getItem(SPOOKY_KEY); if (v === '1') return true; if (v === '0') return false; } catch (e) { /* ignore */ }
    return new Date().getMonth() === 9; // auto-on through october
  }
  function saveSpooky() { try { localStorage.setItem(SPOOKY_KEY, spooky ? '1' : '0'); } catch (e) { /* ignore */ } }

  // ---------- sdk (optional) ----------
  const sdk = (fn, ...a) => { try { if (window.cc && typeof window.cc[fn] === 'function') window.cc[fn](...a); } catch (e) { /* ignore */ } };

  // ---------- audio ----------
  let ac = null, master = null, muted = false, noiseBuf = null;
  function initAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  function setMuted(m) { muted = !!m; if (ac && master) master.gain.setTargetAtTime(muted ? 0 : 0.5, ac.currentTime, 0.02); }
  function tone(f, dur, type, vol, f2, delay) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function hiss(dur, vol, freq, type, delay) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0), s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type || 'highpass'; f.frequency.value = freq;
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  const sfx = {
    x() { tone(520, 0.07, 'square', 0.09, 700); },
    o() { tone(300, 0.09, 'triangle', 0.12, 220); },
    blip() { tone(260 + Math.random() * 180, 0.035, 'square', 0.035); },
    glitch() { for (let i = 0; i < 6; i++) tone(200 + Math.random() * 1400, 0.04, 'sawtooth', 0.05, null, i * 0.04); hiss(0.25, 0.12, 3000); },
    lag() { for (let i = 0; i < 5; i++) tone(440, 0.05, 'square', 0.05, null, i * 0.17); },
    splash() { hiss(0.4, 0.25, 700, 'lowpass'); tone(180, 0.2, 'sine', 0.1, 60); },
    swap() { tone(700, 0.12, 'square', 0.06, 200); },
    popup() { tone(880, 0.08, 'square', 0.07); tone(660, 0.12, 'square', 0.07, null, 0.09); },
    bsod() { tone(110, 0.9, 'sawtooth', 0.12, 55); hiss(0.6, 0.15, 400, 'lowpass'); },
    boot() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.25, 'triangle', 0.07, null, i * 0.1)); },
    crashWin() { [392, 330, 262].forEach((f, i) => tone(f, 0.18, 'square', 0.07, null, i * 0.12)); },
    draw() { tone(330, 0.15, 'triangle', 0.07); tone(330, 0.15, 'triangle', 0.07, null, 0.17); },
    error() { tone(440, 0.15, 'square', 0.09); tone(311, 0.25, 'square', 0.09, null, 0.16); },
    win() {
      [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, 0.2, 'square', 0.07, null, i * 0.07));
      hiss(1.2, 0.2, 1200, 'bandpass', 0.4); tone(120, 1.2, 'sawtooth', 0.1, 30, 0.4);
    },
    lose() { [294, 277, 262, 196].forEach((f, i) => tone(f, i === 3 ? 0.6 : 0.22, 'square', 0.07, i === 3 ? 150 : null, i * 0.24)); }
  };

  // ---------- timing (pause-aware) ----------
  let timers = [], gen = 0, paused = false;
  function wait(ms) { return new Promise((r) => timers.push({ t: ms / 1000, r })); }

  // ---------- state ----------
  let cells, blocked, anims, round = 1, youPts = 0, crashPts = 0, draws = 0, cheats = 0;
  let proUsed = 0, crashTurns = 0, diagBan = false, phase = 'player'; // player | busy | over
  let result = null; // 'win' | 'loss'
  let record = loadRec();
  let spooky = loadSpooky();
  let bubble = { text: '', shown: 0, life: 0 };
  let fx = { shake: 0, flash: 0, flashCol: COL.paper, lag: 0, bsod: 0, boot: 0, popup: null, melt: 0, winLine: null, winT: 0 };
  let confetti = [], floaters = [], ghosts = [];
  let cursor = 4, showCursor = false, hover = -1;
  let t = 0, overT = 0, idleT = 0, idleSaid = false, matchStart = 0;
  let crashFace = 0, crashFaceT = 0;
  let toast = { text: '', life: 0 };
  let sus = 0, susFlash = 0, tokens = 1, firewall = false, undoSnap = null, caughtN = 0;
  let buttons = [];

  function resetBoard() {
    cells = Array(9).fill(''); blocked = Array(9).fill(false); anims = Array(9).fill(null);
    diagBan = false; proUsed = 0; crashTurns = 0; fx.winLine = null; undoSnap = null;
  }
  let firstMatch = true;
  const COARSE = (() => { try { return matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  function newMatch() {
    gen++; timers = [];
    round = 1; youPts = 0; crashPts = 0; draws = 0; cheats = 0; result = null; overT = 0;
    confetti = []; floaters = []; fx.melt = 0; fx.bsod = 0; fx.boot = 0; fx.popup = null; fx.lag = 0;
    crashFace = 0; idleT = 0; idleSaid = false;
    sus = 0; tokens = 1; firewall = false; caughtN = 0;
    resetBoard();
    phase = 'player';
    matchStart = performance.now();
    // the first match always says whose move it is (the spooky openers don't); after that, either
    say(firstMatch || !(spooky && Math.random() < 0.5) ? pick('start') + (firstMatch ? ' tap a square.' : '') : pick('spooky'));
    firstMatch = false;
    if (document.readyState === 'complete') sdk('start');
    else window.addEventListener('load', () => sdk('start'), { once: true });
  }

  // ---------- board logic ----------
  const empties = () => { const r = []; for (let i = 0; i < 9; i++) if (!cells[i] && !blocked[i]) r.push(i); return r; };
  function lineFor(m) {
    for (let k = 0; k < LINES.length; k++) {
      if (m === 'X' && diagBan && k >= 6) continue;
      const [a, b, c] = LINES[k];
      if (cells[a] === m && cells[b] === m && cells[c] === m) return LINES[k];
    }
    return null;
  }
  function wouldWin(i, m) { cells[i] = m; const w = !!lineFor(m); cells[i] = ''; return w; }
  function threats(m) { // empty squares that would complete a line for m
    return empties().filter((i) => wouldWin(i, m));
  }
  function aiMove() {
    const e = empties(); if (!e.length) return -1;
    const blunder = diff(BLUNDER);
    for (const i of e) if (wouldWin(i, 'O')) return i;
    const blk = threats('X');
    if (blk.length && Math.random() > blunder) return blk[0];
    if (Math.random() > blunder) {
      for (const i of e) { cells[i] = 'O'; const n = threats('O').length; cells[i] = ''; if (n >= 2) return i; }
      if (e.includes(4)) return 4;
      const corners = e.filter((i) => i % 2 === 0 && i !== 4);
      if (corners.length) return corners[(Math.random() * corners.length) | 0];
    }
    return e[(Math.random() * e.length) | 0];
  }

  function place(i, m) {
    cells[i] = m; anims[i] = { kind: 'in', t: 0 };
    if (m === 'X') sfx.x(); else sfx.o();
  }

  // ---------- speech ----------
  function say(text, hold) {
    bubble = { text, shown: 0, life: (hold || 2.6) + text.length * 0.03 };
  }
  function float(text, i, color) {
    const c = cellRect(i);
    floaters.push({ text, x: c.x + c.s / 2, y: c.y + c.s / 2, life: 1.3, color: color || COL.lilac });
  }

  // ---------- player turn ----------
  async function playerMove(i) {
    if (phase !== 'player' || i < 0 || cells[i] || blocked[i]) {
      if (phase === 'player' && i >= 0 && blocked[i]) { float('sticky', i, COL.beige); sfx.error(); }
      return;
    }
    const g = gen;
    idleT = 0; idleSaid = false;
    place(i, 'X'); undoSnap = null;
    phase = 'busy';
    const line = lineFor('X');
    if (line) {
      await reactiveCheat(line, g);
      return;
    }
    if (!empties().length) { await endRound('draw', g); return; }
    await crashTurn(g);
  }

  // crash tries to stop a completed line. usually works.
  // every cheat goes through here: snapshot for ctrl+z, suspicion, firewall.
  async function cheatGate(kind, g, evidence) {
    undoSnap = { cells: cells.slice(), blocked: blocked.slice(), diagBan };
    cheats++;
    sus = Math.min(100, sus + (SUS[kind] || 20) + (evidence || 0)); susFlash = 1;
    if (sus >= 100) return 'caught';
    if (firewall) {
      firewall = false; undoSnap = null;
      fx.popup = { title: 'firewall.exe', body: 'blocked: crash.exe tried to ' + VERB[kind] + '. connection refused.', t: 0 };
      sfx.popup(); fx.shake = Math.max(fx.shake, 5); crashFace = 2; crashFaceT = 1.4; say(pick('blocked'));
      sdk('event', 'blocked', { kind, round });
      await wait(1400); if (g !== gen) return 'gone';
      fx.popup = null;
      return 'blocked';
    }
    return 'ok';
  }
  async function caught(g) {
    phase = 'busy';
    fx.popup = { title: 'anticheat.exe', body: 'violation detected: crash.exe (' + cheats + ' cheats logged). round awarded to the human.', t: 0 };
    sfx.error(); fx.shake = 12; fx.flash = 0.5; fx.flashCol = COL.lilac; crashFace = 2; crashFaceT = 2.5; say(pick('caught'));
    caughtN++; sus = 0; firewall = false;
    sdk('event', 'caught', { round });
    await wait(1900); if (g !== gen) return;
    fx.popup = null; fx.winLine = null;
    await endRound('win', g);
  }

  // player counter-cheats. each costs one token.
  function useTool(k) {
    if (phase !== 'player') { sfx.error(); return; }
    if (tokens < 1) { sfx.error(); showToast('no tokens. draws and lost rounds earn them.'); return; }
    if (k === 'firewall') {
      if (firewall) { showToast('firewall already up.'); return; }
      tokens--; firewall = true; sfx.popup(); say(pick('fwUp'), 1.6);
    } else if (k === 'undo') {
      if (!undoSnap) { sfx.error(); showToast('nothing to undo. ctrl+z his next cheat.'); return; }
      tokens--;
      cells = undoSnap.cells; blocked = undoSnap.blocked; diagBan = undoSnap.diagBan; anims = Array(9).fill(null); undoSnap = null;
      sfx.glitch(); fx.shake = 8; crashFace = 1; crashFaceT = 1.2; say(pick('undone'));
      for (let i = 0; i < 9; i++) if (cells[i]) anims[i] = { kind: 'in', t: 0.15 };
      const ln = lineFor('X');
      if (ln) { phase = 'busy'; fx.winLine = ln; fx.winT = 0; const g = gen; wait(700).then(() => { if (g === gen) endRound('win', g); }); return; }
      if (!empties().length) { phase = 'busy'; endRound('draw', gen); }
    } else if (k === 'report') {
      tokens--; sus = Math.min(100, sus + 34); susFlash = 1; sfx.popup();
      if (sus >= 100) { caught(gen); return; }
      say(pick('reported'));
    }
    sdk('event', 'tool', { kind: k, round });
  }

  async function reactiveCheat(line, g) {
    fx.winLine = line; fx.winT = 0; // the "you had it" beat
    crashFace = 1; crashFaceT = 1.2;
    await wait(500); if (g !== gen) return;
    if (Math.random() < diff(CHEAT_FAIL)) {
      fx.popup = { title: 'cheat.exe', body: 'cheat.exe has stopped responding.', t: 0 };
      sfx.error(); say('wait. no. hold on.');
      cheats++;
      await wait(1500); if (g !== gen) return;
      fx.popup = null;
      fx.winLine = line; fx.winT = 0;
      await endRound('win', g);
      return;
    }
    const diag = LINES.indexOf(line) >= 6;
    const opts = ['delete', 'delete'];
    if (round >= 2) opts.push('swap');
    if (round >= 2 && diag && !diagBan) opts.push('rules', 'rules', 'rules');
    if (round >= 3 || crashPts === CRASH_TO_WIN - 1) opts.push('bsod');
    if (round >= 4) opts.push('bsod');
    const kind = opts[(Math.random() * opts.length) | 0];
    const gate = await cheatGate(kind, g, 12); // +evidence: you had a line
    if (gate === 'gone' || g !== gen) return;
    if (gate === 'caught') { await caught(g); return; }
    if (gate === 'blocked') { await wait(200); if (g !== gen) return; await endRound('win', g); return; }
    fx.winLine = null;
    sdk('event', 'cheat', { kind, round, reactive: true });
    if (kind === 'bsod') { await bsodWin(g); return; }
    if (kind === 'rules') {
      fx.popup = { title: 'terms of service', body: 'update: diagonals are now a premium feature. by continuing to exist you agree.', t: 0 };
      sfx.popup(); say(pick('rules'));
      diagBan = true;
      await wait(2100); if (g !== gen) return;
      fx.popup = null;
    } else if (kind === 'swap') {
      const j = line[(Math.random() * 3) | 0];
      await swapCell(j, g); if (g !== gen) return;
      say(pick('swap'));
      if (lineFor('O')) { await wait(500); if (g !== gen) return; await endRound('loss', g); return; }
    } else {
      // delete the cell shared by every finished line if there is one
      const all = LINES.filter((k) => k.every((i) => cells[i] === 'X'));
      const shared = line.filter((i) => all.every((k) => k.includes(i)));
      const j = shared.length ? shared[(Math.random() * shared.length) | 0] : line[(Math.random() * 3) | 0];
      await deleteCell(j, g); if (g !== gen) return;
      say(pick('delete'));
    }
    // a second line survived the cheat: it counts
    const still = lineFor('X');
    if (still) {
      fx.winLine = still; fx.winT = 0; say(pick('missed'));
      await wait(800); if (g !== gen) return;
      await endRound('win', g); return;
    }
    await wait(500); if (g !== gen) return;
    await crashTurn(g, true);
  }

  async function deleteCell(j, g) {
    anims[j] = { kind: 'glitch', t: 0 }; sfx.glitch(); fx.shake = Math.max(fx.shake, 6);
    float('ctrl+z', j, COL.lilac);
    await wait(550); if (g !== gen) return;
    cells[j] = ''; anims[j] = null;
  }
  async function swapCell(j, g) {
    anims[j] = { kind: 'glitch', t: 0 }; sfx.swap(); fx.shake = Math.max(fx.shake, 4);
    await wait(450); if (g !== gen) return;
    cells[j] = 'O'; anims[j] = { kind: 'in', t: 0 };
    float('mine now', j, COL.lilac);
  }

  async function bsodWin(g) {
    fx.bsod = 0.001; sfx.bsod(); crashFace = 2; crashFaceT = 3;
    await wait(1700); if (g !== gen) return;
    fx.bsod = 0; fx.boot = 0.001; sfx.boot();
    // "restore from backup": a board where crash obviously won
    resetBoard();
    const ln = LINES[(Math.random() * 8) | 0];
    ln.forEach((i) => { cells[i] = 'O'; });
    const rest = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => !ln.includes(i));
    for (let k = 0; k < 2; k++) cells[rest.splice((Math.random() * rest.length) | 0, 1)[0]] = 'X';
    await wait(1200); if (g !== gen) return;
    fx.boot = 0;
    say(pick('bsodWin'));
    await endRound('loss', g);
  }

  // ---------- crash turn ----------
  async function crashTurn(g, afterCheat) {
    phase = 'busy';
    crashTurns++;
    await wait(afterCheat ? 250 : 420 + Math.random() * 380); if (g !== gen) return;
    // proactive cheat? guaranteed at least once per round by crash's 2nd turn
    const canPro = proUsed < diff(PRO_MAX) && !afterCheat;
    const force = canPro && proUsed === 0 && crashTurns >= 2 && round <= 2;
    if (canPro && (force || Math.random() < diff(PRO_CHANCE))) {
      const xs = []; for (let i = 0; i < 9; i++) if (cells[i] === 'X') xs.push(i);
      const opts = ['lag', 'coffee'];
      if (xs.length) opts.push('delete');
      if (round >= 3 && xs.length) opts.push('swap');
      if (empties().length < 2) { const k = opts.indexOf('lag'); if (k >= 0) opts.splice(k, 1); }
      if (empties().length < 2) { const k = opts.indexOf('coffee'); if (k >= 0) opts.splice(k, 1); }
      if (opts.length) {
        const kind = opts[(Math.random() * opts.length) | 0];
        proUsed++;
        crashFace = 1; crashFaceT = 1;
        const gate = await cheatGate(kind, g);
        if (gate === 'gone' || g !== gen) return;
        if (gate === 'caught') { await caught(g); return; }
        if (gate === 'blocked') { await wait(200); if (g !== gen) return; }
        else {
        sdk('event', 'cheat', { kind, round, reactive: false });
        if (kind === 'lag') {
          fx.lag = 0.001; sfx.lag(); say(pick('lag'));
          await wait(950); if (g !== gen) return;
          fx.lag = 0;
          for (let k = 0; k < 2; k++) {
            const m = aiMove(); if (m < 0) break;
            place(m, 'O'); float(String(k + 1), m, COL.paper);
            if (lineFor('O')) break;
            await wait(180); if (g !== gen) return;
          }
          return afterCrashMove(g);
        }
        if (kind === 'coffee') {
          const th = threats('X');
          const e = empties();
          const target = th.length ? th[0] : (e.includes(4) && Math.random() < 0.5 ? 4 : e[(Math.random() * e.length) | 0]);
          blocked[target] = true; anims[target] = { kind: 'spill', t: 0 }; sfx.splash(); fx.shake = Math.max(fx.shake, 5);
          say(pick('coffee'));
          await wait(600); if (g !== gen) return;
        } else if (kind === 'delete') {
          const th = threats('X');
          let j = xs[(Math.random() * xs.length) | 0];
          // prefer an x that is part of a threat
          for (const k of LINES) { const xsIn = k.filter((i) => cells[i] === 'X'); if (xsIn.length === 2 && k.some((i) => !cells[i] && !blocked[i])) { j = xsIn[0]; break; } }
          void th;
          await deleteCell(j, g); if (g !== gen) return;
          say(pick('delete'));
          await wait(300); if (g !== gen) return;
        } else if (kind === 'swap') {
          const j = xs[(Math.random() * xs.length) | 0];
          await swapCell(j, g); if (g !== gen) return;
          say(pick('swap'));
          if (lineFor('O')) return afterCrashMove(g);
          await wait(300); if (g !== gen) return;
        }
        }
      }
    }
    const m = aiMove();
    if (m >= 0) {
      const wasBlock = threats('X').includes(m);
      place(m, 'O');
      if (wasBlock && Math.random() < 0.35) say(pick('block'), 1.4);
    }
    return afterCrashMove(g);
  }
  async function afterCrashMove(g) {
    const ln = lineFor('O');
    if (ln) { fx.winLine = ln; fx.winT = 0; await wait(500); if (g !== gen) return; await endRound('loss', g); return; }
    if (!empties().length) { await wait(300); if (g !== gen) return; await endRound('draw', g); return; }
    phase = 'player';
  }

  // ---------- round / match ----------
  async function endRound(kind, g) {
    phase = 'busy';
    if (kind === 'win') {
      youPts++;
      if (youPts >= YOU_TO_WIN) { await victory(g); return; }
      fx.flash = 0.5; fx.flashCol = COL.lime; fx.shake = 8; crashFace = 2; crashFaceT = 1.6;
      sfx.boot(); burstConfetti(70);
      say(pick('roundLost'));
      sdk('event', 'roundwin', { round });
    } else if (kind === 'loss') {
      crashPts++; tokens = Math.min(MAX_TOKENS, tokens + 1);
      if (!fx.winLine) fx.winLine = lineFor('O');
      fx.winT = 0;
      sfx.crashWin();
      if (!bubble.text || bubble.life < 1 || !/backup|logs/.test(bubble.text)) say(pick('crashWin'));
    } else {
      draws++; tokens = Math.min(MAX_TOKENS, tokens + 1);
      sfx.draw(); say(pick('draw'));
    }
    sdk('score', score());
    if (crashPts >= CRASH_TO_WIN) {
      await wait(1300); if (g !== gen) return;
      finishMatch('loss');
      return;
    }
    await wait(1700); if (g !== gen) return;
    round++;
    sdk('event', 'round', { round });
    resetBoard();
    say(pick('round'));
    phase = 'player';
  }

  async function victory(g) {
    fx.melt = 0.001; crashFace = 2; crashFaceT = 99;
    fx.flash = 1; fx.flashCol = COL.lime; fx.shake = 18;
    sfx.win();
    say(pick('meltdown'), 4);
    burstConfetti(260);
    sdk('event', 'win', { round, cheats });
    await wait(600); if (g !== gen) return;
    burstConfetti(160);
    await wait(2200); if (g !== gen) return;
    finishMatch('win');
  }

  function finishMatch(res) {
    result = res; phase = 'over'; overT = 0;
    if (res === 'win') record.w++; else { record.l++; sfx.lose(); }
    saveRec();
    sdk('score', score());
    sdk('end', { score: score(), durationMs: Math.round(performance.now() - matchStart) });
  }
  // leaderboard score: rounds you took, how often you got him caught, a match win is worth a lot. stalling scores nothing.
  function score() { return youPts * 100 + caughtN * 50 + (result === 'win' ? 500 : 0); }

  function burstConfetti(n) {
    const cols = spooky ? [COL.lime, COL.lilac, COL.paper, COL.pumpkin] : [COL.lime, COL.lilac, COL.paper, COL.beige];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 250 + Math.random() * 700;
      confetti.push({ x: W / 2, y: H * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 300, r: Math.random() * 6, vr: (Math.random() - 0.5) * 14, c: cols[i % cols.length], s: 5 + Math.random() * 7, life: 2.5 + Math.random() * 1.5 });
    }
    if (confetti.length > 900) confetti.splice(0, confetti.length - 900);
  }

  // ---------- share ----------
  function shareText() {
    const ct = caughtN ? ' got him caught ' + caughtN + (caughtN === 1 ? ' time.' : ' times.') : '';
    return result === 'win'
      ? 'i beat crash ' + youPts + '–' + crashPts + ' at tic tac toe. he cheated ' + cheats + (cheats === 1 ? ' time.' : ' times.') + ct + ' ' + URL_TEXT
      : 'crash cheated ' + cheats + (cheats === 1 ? ' time' : ' times') + ' and beat me ' + crashPts + '–' + youPts + ' at tic tac toe.' + ct + ' ' + URL_TEXT;
  }
  async function share() {
    sdk('event', 'share', { result });
    const text = shareText();
    let blobUrl = null;
    try {
      const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
      const x = c.getContext('2d');
      drawCard(x, 0, 0, 1080, 1080, 2.6, true);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const file = blob && new File([blob], 'crash-cheats.png', { type: 'image/png' });
      if (blob) blobUrl = URL.createObjectURL(blob);
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    let copied = false;
    try { await navigator.clipboard.writeText(text); copied = true; } catch (e) { /* ignore */ }
    if (blobUrl) {
      try { const a = document.createElement('a'); a.href = blobUrl; a.download = 'crash-cheats.png'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { /* ignore */ }
      setTimeout(() => URL.revokeObjectURL(blobUrl), 4000);
      showToast(copied ? 'text copied + card saved. go post it.' : 'card saved. go post it.');
    } else showToast(copied ? 'copied. go post it.' : 'couldn\'t copy. screenshot it.');
  }
  function showToast(s) { toast = { text: s, life: 2 }; }

  // ---------- input ----------
  function cellRect(i) {
    const b = lay.board, pad = b.s * 0.04, top = 30 * u, inner = b.s - top;
    const s = (Math.min(b.s, inner) - pad * 2) / 3;
    const ox = b.x + (b.s - s * 3) / 2, oy = b.y + top + (inner - s * 3) / 2;
    return { x: ox + (i % 3) * s, y: oy + ((i / 3) | 0) * s, s };
  }
  function cellAt(px, py) {
    for (let i = 0; i < 9; i++) { const c = cellRect(i); if (px >= c.x && px < c.x + c.s && py >= c.y && py < c.y + c.s) return i; }
    return -1;
  }
  function hitButton(px, py) {
    for (const b of buttons) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return b;
    return null;
  }
  function setPaused(p) { paused = p; if (ac) { if (paused) ac.suspend(); else ac.resume(); } }

  cv.addEventListener('pointerdown', (e) => {
    e.preventDefault(); cv.focus({ preventScroll: true });
    initAudio();
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    if (paused) { setPaused(false); return; }
    showCursor = false;
    const b = hitButton(px, py);
    if (b) { b.fn(); return; }
    if (phase === 'over') { if (overT > 0.8 && py > lay.board.y - 40) { /* taps outside buttons do nothing */ } return; }
    playerMove(cellAt(px, py));
  });
  cv.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = cv.getBoundingClientRect(); hover = cellAt(e.clientX - r.left, e.clientY - r.top);
  });
  cv.addEventListener('pointerleave', () => { hover = -1; });
  window.addEventListener('keydown', (e) => {
    initAudio();
    if (paused) { if (e.key === 'p' || e.key === 'Escape' || e.code === 'Space') { setPaused(false); e.preventDefault(); } return; }
    if (phase === 'over') {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (overT > 0.8) newMatch(); }
      else if (e.key === 's' || e.key === 'S') share();
      return;
    }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 9) { showCursor = false; playerMove(n - 1); return; }
    const mv = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }[e.key];
    if (mv !== undefined) {
      e.preventDefault(); showCursor = true;
      const nc = cursor + mv;
      if (nc >= 0 && nc < 9 && !(Math.abs(mv) === 1 && ((nc / 3) | 0) !== ((cursor / 3) | 0))) cursor = nc;
      return;
    }
    if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); if (!showCursor) { showCursor = true; return; } playerMove(cursor); return; }
    const tk = { q: 'firewall', f: 'firewall', w: 'undo', z: 'undo', e: 'report', r: 'report' }[e.key.toLowerCase()];
    if (tk && !e.ctrlKey && !e.metaKey) { useTool(tk); return; }
    if (e.key === 'p') setPaused(true);
  });
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') setMuted(d.muted);
    else if (d.type === 'cc-restart') { setPaused(false); newMatch(); }
    else if (d.type === 'cc-pause') setPaused(typeof d.paused === 'boolean' ? d.paused : !paused);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && ac) ac.suspend(); else if (!document.hidden && ac && !paused) ac.resume(); });

  // ---------- update ----------
  function update(dt) {
    t += dt;
    for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { const r = timers[i].r; timers.splice(i, 1); r(); } }
    for (let i = 0; i < 9; i++) if (anims[i]) anims[i].t += dt;
    if (bubble.text) {
      const before = Math.floor(bubble.shown);
      bubble.shown = Math.min(bubble.text.length, bubble.shown + dt * 45);
      if (Math.floor(bubble.shown) !== before && Math.floor(bubble.shown) % 2 === 0) sfx.blip();
      bubble.life -= dt;
    }
    if (phase === 'player') {
      idleT += dt;
      if (idleT > 7 && !idleSaid) { idleSaid = true; say(pick('idle')); }
    }
    fx.shake = Math.max(0, fx.shake - dt * 30);
    fx.flash = Math.max(0, fx.flash - dt * 2);
    if (fx.lag) fx.lag += dt;
    if (fx.bsod) fx.bsod += dt;
    if (fx.boot) fx.boot += dt;
    if (fx.melt) fx.melt += dt;
    if (fx.popup) fx.popup.t += dt;
    if (fx.winLine) fx.winT += dt;
    if (crashFaceT > 0) { crashFaceT -= dt; if (crashFaceT <= 0) crashFace = 0; }
    if (phase === 'over') overT += dt;
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i]; p.vy += 900 * dt; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.vr * dt; p.life -= dt;
      if (p.life <= 0 || p.y > H + 40) confetti.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) { floaters[i].life -= dt; floaters[i].y -= 30 * dt; if (floaters[i].life <= 0) floaters.splice(i, 1); }
    if (toast.life > 0) toast.life -= dt;
    susFlash = Math.max(0, susFlash - dt * 2);
    if (spooky) {
      if (ghosts.length < 4 && Math.random() < dt * 0.5) ghosts.push({ x: Math.random() * W, y: H + 40, s: 18 + Math.random() * 16, vy: 14 + Math.random() * 18, ph: Math.random() * 6 });
      for (let i = ghosts.length - 1; i >= 0; i--) { const gh = ghosts[i]; gh.y -= gh.vy * dt; if (gh.y < -60) ghosts.splice(i, 1); }
    } else ghosts.length = 0;
  }

  // ---------- render helpers ----------
  function text(str, x, y, size, color, align, weight, c) {
    c = c || ctx;
    c.font = (weight || 'bold') + ' ' + size + 'px ' + FONT; c.textAlign = align || 'left'; c.fillStyle = color; c.fillText(str, x, y);
  }
  function wrap(str, size, maxW, weight, c) {
    c = c || ctx;
    c.font = (weight || 'bold') + ' ' + size + 'px ' + FONT;
    const words = str.split(' '), lines = []; let line = '';
    for (const w of words) { const tt = line ? line + ' ' + w : w; if (c.measureText(tt).width > maxW && line) { lines.push(line); line = w; } else line = tt; }
    if (line) lines.push(line); return lines;
  }
  function rr(x, y, w, h, r, c) {
    c = c || ctx; r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }

  function drawX(cx, cy, s, k, color) {
    const a = s * 0.28, p1 = Math.min(1, k * 2), p2 = Math.max(0, Math.min(1, k * 2 - 1));
    ctx.strokeStyle = color || COL.lime; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - a, cy - a); ctx.lineTo(cx - a + 2 * a * p1, cy - a + 2 * a * p1);
    if (p2 > 0) { ctx.moveTo(cx + a, cy - a); ctx.lineTo(cx + a - 2 * a * p2, cy - a + 2 * a * p2); }
    ctx.stroke();
  }
  function drawO(cx, cy, s, k) {
    const r = s * 0.28;
    if (spooky) {
      const sc = Math.min(1, k * 1.3);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc);
      ctx.fillStyle = COL.pumpkin; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.08, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(16,17,20,0.35)'; ctx.lineWidth = s * 0.02;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.45, r * 0.95, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = COL.lime; ctx.fillRect(-s * 0.025, -r * 1.2, s * 0.05, r * 0.3);
      ctx.fillStyle = COL.carbon;
      const tri = (x, y, w) => { ctx.beginPath(); ctx.moveTo(x - w, y + w * 0.6); ctx.lineTo(x + w, y + w * 0.6); ctx.lineTo(x, y - w * 0.7); ctx.closePath(); ctx.fill(); };
      tri(-r * 0.4, -r * 0.2, r * 0.22); tri(r * 0.4, -r * 0.2, r * 0.22);
      ctx.fillRect(-r * 0.5, r * 0.3, r, r * 0.16);
      ctx.restore();
      return;
    }
    ctx.strokeStyle = COL.lilac; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, k * 1.6)); ctx.stroke();
  }

  // ---------- render ----------
  function drawBackground() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COL.carbon; ctx.fillRect(0, 0, W, H);
    const g = 34;
    ctx.strokeStyle = 'rgba(197,255,73,0.045)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = (t * 6) % g; y < H; y += g) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    for (let x = (W / 2) % g; x < W; x += g) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    ctx.stroke();
    for (const gh of ghosts) {
      const x = gh.x + Math.sin(t * 1.3 + gh.ph) * 14, y = gh.y, s = gh.s;
      ctx.globalAlpha = 0.16; ctx.fillStyle = COL.paper;
      ctx.beginPath(); ctx.arc(x, y, s, Math.PI, 0); ctx.lineTo(x + s, y + s * 1.1);
      for (let k = 0; k < 4; k++) ctx.lineTo(x + s - (k + 0.5) * s / 2, y + s * (k % 2 ? 1.1 : 0.8));
      ctx.lineTo(x - s, y + s * 1.1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.35; ctx.fillStyle = COL.carbon;
      ctx.fillRect(x - s * 0.4, y - s * 0.2, s * 0.22, s * 0.3); ctx.fillRect(x + s * 0.18, y - s * 0.2, s * 0.22, s * 0.3);
      ctx.globalAlpha = 1;
    }
  }

  function drawHUD() {
    const pad = 16;
    text('round ' + round + (draws ? ' · draws ' + draws : ''), pad, 26 * u, Math.round(13 * u), COL.dim, 'left', 'normal');
    // score pips: crash needs 3
    const sz = Math.round(16 * u);
    text('you ' + youPts, pad, 48 * u, sz, COL.lime);
    ctx.font = 'bold ' + sz + 'px ' + FONT;
    const wYou = ctx.measureText('you ' + youPts).width;
    text(' · ' + crashPts + ' crash', pad + wYou, 48 * u, sz, COL.lilac);
    ctx.font = 'bold ' + sz + 'px ' + FONT;
    const wC = ctx.measureText(' · ' + crashPts + ' crash').width;
    text('(first to 3)', pad + wYou + wC + 8, 48 * u, Math.round(10 * u), COL.dim, 'left', 'normal');
    text(recText(), W - pad, 26 * u, Math.round(12 * u), 'rgba(245,243,237,0.7)', 'right', 'normal');
    // spooky toggle
    const label = spooky ? 'spooky: on' : 'spooky: off';
    ctx.font = 'bold ' + Math.round(11 * u) + 'px ' + FONT;
    const lw = ctx.measureText(label).width + 16, lh = 22 * u, lx = W - pad - lw, ly = 34 * u;
    rr(lx, ly, lw, lh, 6); ctx.fillStyle = spooky ? 'rgba(255,138,61,0.18)' : 'rgba(245,243,237,0.06)'; ctx.fill();
    text(label, lx + lw / 2, ly + lh * 0.68, Math.round(11 * u), spooky ? COL.pumpkin : COL.dim, 'center');
    buttons.push({ x: lx, y: ly, w: lw, h: lh, fn: () => { spooky = !spooky; saveSpooky(); } });
    text('computer cooked games', pad, H - 10, Math.round(10 * u), 'rgba(245,243,237,0.4)', 'left', 'normal');
  }

  function recText() { return record.w + (record.w === 1 ? ' win' : ' wins') + ' · ' + record.l + (record.l === 1 ? ' loss' : ' losses'); }

  // suspicion meter under crash
  function drawSus() {
    const c = lay.crash, w = c.s * 0.62, h = 7 * u, x = c.x, y = c.y + c.s + 3 * u;
    const k = sus / 100, hot = sus >= 70;
    rr(x, y, w, h, h / 2); ctx.fillStyle = 'rgba(245,243,237,0.1)'; ctx.fill();
    if (k > 0) { rr(x, y, Math.max(h, w * k), h, h / 2); ctx.fillStyle = hot ? (Math.sin(t * 12) > 0 ? COL.pumpkin : '#ff5a5a') : COL.lilac; ctx.fill(); }
    if (susFlash > 0) { ctx.globalAlpha = susFlash; rr(x - 2, y - 2, w + 4, h + 4, h); ctx.strokeStyle = COL.paper; ctx.lineWidth = 2; ctx.stroke(); ctx.globalAlpha = 1; }
    text('sus ' + Math.round(sus) + '%', x + w + 6, y + h, Math.round(10 * u), hot ? COL.pumpkin : COL.dim, 'left', 'normal');
  }

  // counter-cheat chips under the board
  const TOOLS = [
    { k: 'firewall', label: 'firewall', key: 'q', tip: 'block 1 cheat' },
    { k: 'undo', label: 'ctrl+z', key: 'w', tip: 'undo cheat' },
    { k: 'report', label: 'report', key: 'e', tip: '+34% sus' }
  ];
  function drawTools() {
    const b = lay.board, gap = 8, y = b.y + b.s + 10 * u, h = 36 * u;
    // token pips
    const pipW = 54 * u;
    for (let i = 0; i < MAX_TOKENS; i++) {
      const px = b.x + 6 + i * 16 * u, py = y + h / 2 - 8 * u;
      ctx.fillStyle = i < tokens ? COL.lime : 'rgba(245,243,237,0.15)';
      ctx.save(); ctx.translate(px + 6 * u, py + 6 * u); ctx.rotate(Math.PI / 4); ctx.fillRect(-4.5 * u, -4.5 * u, 9 * u, 9 * u); ctx.restore();
    }
    text('tokens', b.x + 4, y + h / 2 + 16 * u, Math.max(10, Math.round(9 * u)), COL.dim, 'left', 'normal');
    const x0 = b.x + pipW, cw = (b.s - pipW - gap * 2) / 3;
    TOOLS.forEach((tl, i) => {
      const x = x0 + i * (cw + gap);
      const armed = tl.k === 'firewall' && firewall;
      const ok = phase === 'player' && tokens > 0 && !armed && (tl.k !== 'undo' || !!undoSnap);
      const glow = tl.k === 'undo' && undoSnap && tokens > 0 && phase === 'player';
      rr(x, y, cw, h, 8);
      ctx.fillStyle = armed ? 'rgba(197,255,73,0.25)' : ok ? (glow ? 'rgba(181,154,255,' + (0.25 + 0.15 * Math.sin(t * 8)) + ')' : 'rgba(245,243,237,0.1)') : 'rgba(245,243,237,0.04)';
      ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = armed ? COL.lime : ok ? 'rgba(245,243,237,0.35)' : 'rgba(245,243,237,0.1)'; ctx.stroke();
      const fg = armed ? COL.lime : ok ? COL.paper : 'rgba(245,243,237,0.3)';
      text(armed ? 'firewall: up' : tl.label, x + cw / 2, y + h * 0.45, Math.round(12 * u), fg, 'center');
      // phones: no keyboard hint, and never smaller than 10px (it was ~8px at 375 wide)
      text(armed ? 'armed' : (COARSE ? '' : '[' + tl.key + '] ') + tl.tip, x + cw / 2, y + h * 0.8, Math.max(10, Math.round(8.5 * u)), armed ? COL.lime : 'rgba(245,243,237,' + (ok ? 0.55 : 0.25) + ')', 'center', 'normal');
      buttons.push({ x, y, w: cw, h, fn: () => useTool(tl.k) });
    });
    if (record.w + record.l < 3 && round <= 2) {
      text('+1 token per draw or lost round · fill his sus · first to 3', b.x + b.s / 2, y + h + 15 * u, Math.round(9.5 * u), 'rgba(245,243,237,0.5)', 'center', 'normal');
    }
  }

  function drawCrash() {
    const c = lay.crash;
    let frame = crashFace;
    if (phase === 'over' && result === 'loss') frame = 0;
    let jx = 0, jy = 0;
    if (fx.melt) { jx = (Math.random() - 0.5) * 8; jy = (Math.random() - 0.5) * 8; }
    else if (crashFace === 1) { jx = (Math.random() - 0.5) * 3; }
    else if (phase === 'busy') jy = Math.sin(t * 10) * 1.5;
    if (crashReady) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(crashImg, frame * 128, 0, 128, 128, c.x + jx, c.y + jy, c.s, c.s);
    }
    if (spooky) { // tiny witch hat
      const hx = c.x + c.s * 0.5 + jx, hy = c.y + c.s * 0.12 + jy;
      ctx.fillStyle = '#2b2236';
      ctx.beginPath(); ctx.moveTo(hx - c.s * 0.22, hy); ctx.lineTo(hx + c.s * 0.22, hy); ctx.lineTo(hx + c.s * 0.04, hy - c.s * 0.26); ctx.closePath(); ctx.fill();
      ctx.fillStyle = COL.pumpkin; ctx.fillRect(hx - c.s * 0.13, hy - c.s * 0.06, c.s * 0.26, c.s * 0.04);
    }
    if (fx.melt) { // sparks + smoke
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = i % 2 ? COL.lime : COL.lilac;
        ctx.fillRect(c.x + Math.random() * c.s, c.y + Math.random() * c.s * 0.6, 4, 4);
      }
    }
  }

  function drawBubble() {
    if (!bubble.text || bubble.life <= 0) return;
    const b = lay.bubble, size = Math.round(14 * u);
    const shown = bubble.text.slice(0, Math.floor(bubble.shown));
    const lines = wrap(bubble.text, size, b.w - 24);
    const h = lines.length * size * 1.3 + 18;
    const a = Math.min(1, bubble.life / 0.3);
    ctx.globalAlpha = a;
    rr(b.x, b.y, b.w, h, 10); ctx.fillStyle = COL.paper; ctx.fill();
    // tail toward crash
    ctx.beginPath();
    if (lay.land) { const tx = lay.crash.x + lay.crash.s / 2; ctx.moveTo(tx - 8, b.y + 1); ctx.lineTo(tx, b.y - 10); ctx.lineTo(tx + 8, b.y + 1); }
    else { ctx.moveTo(b.x + 1, b.y + 14); ctx.lineTo(b.x - 10, b.y + 22); ctx.lineTo(b.x + 1, b.y + 26); }
    ctx.fill();
    let n = shown.length, y = b.y + 9 + size;
    for (const ln of lines) {
      const part = ln.slice(0, Math.max(0, n)); n -= ln.length + 1;
      text(part, b.x + 12, y, size, COL.carbon, 'left', 'bold'); y += size * 1.3;
    }
    ctx.globalAlpha = 1;
  }

  function drawBoard() {
    const b = lay.board;
    let sx = fx.shake ? (Math.random() - 0.5) * fx.shake : 0, sy = fx.shake ? (Math.random() - 0.5) * fx.shake : 0;
    if (fx.lag) { sx += Math.sin(t * 60) * 2; }
    ctx.save(); ctx.translate(sx, sy);
    // window chrome
    rr(b.x, b.y, b.s, b.s, 12); ctx.fillStyle = COL.panel; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = fx.lag ? COL.dim : COL.lime; ctx.stroke();
    ctx.save(); rr(b.x, b.y, b.s, 30 * u, 12); ctx.clip();
    ctx.fillStyle = fx.lag ? '#9aa07f' : COL.lime; ctx.fillRect(b.x, b.y, b.s, 30 * u); ctx.restore();
    ctx.fillStyle = fx.lag ? '#9aa07f' : COL.lime; ctx.fillRect(b.x, b.y + 18 * u, b.s, 12 * u);
    for (let i = 0; i < 3; i++) { ctx.fillStyle = COL.carbon; ctx.beginPath(); ctx.arc(b.x + (16 + i * 14) * u, b.y + 15 * u, 4 * u, 0, Math.PI * 2); ctx.fill(); }
    text(fx.lag ? 'tic_tac_toe.exe (not responding)' : 'tic_tac_toe.exe', b.x + b.s - 12 * u, b.y + 20 * u, Math.round(11 * u), COL.carbon, 'right');
    // grid
    const c0 = cellRect(0), s = c0.s;
    ctx.strokeStyle = COL.line; ctx.lineWidth = Math.max(3, s * 0.045); ctx.lineCap = 'round';
    ctx.beginPath();
    for (let k = 1; k < 3; k++) {
      ctx.moveTo(c0.x + k * s, c0.y + 8); ctx.lineTo(c0.x + k * s, c0.y + 3 * s - 8);
      ctx.moveTo(c0.x + 8, c0.y + k * s); ctx.lineTo(c0.x + 3 * s - 8, c0.y + k * s);
    }
    ctx.stroke();
    if (diagBan) {
      text('diagonals: premium only', c0.x + 1.5 * s, c0.y + 3 * s + 16 * u, Math.round(10 * u), COL.lilac, 'center', 'normal');
    }
    // cells
    for (let i = 0; i < 9; i++) {
      const c = cellRect(i), cx = c.x + s / 2, cy = c.y + s / 2, an = anims[i];
      if (phase === 'player' && !cells[i] && !blocked[i] && (i === hover || (showCursor && i === cursor))) {
        rr(c.x + 6, c.y + 6, s - 12, s - 12, 8); ctx.fillStyle = 'rgba(197,255,73,0.08)'; ctx.fill();
        ctx.globalAlpha = 0.25; drawX(cx, cy, s, 1); ctx.globalAlpha = 1;
      }
      if (showCursor && i === cursor && phase === 'player') { rr(c.x + 4, c.y + 4, s - 8, s - 8, 8); ctx.strokeStyle = COL.lime; ctx.lineWidth = 2; ctx.stroke(); }
      if (blocked[i]) {
        const k = an && an.kind === 'spill' ? Math.min(1, an.t * 4) : 1;
        ctx.fillStyle = COL.coffee; ctx.globalAlpha = 0.9;
        ctx.beginPath();
        for (let a = 0; a <= 12; a++) { const ang = a / 12 * Math.PI * 2, rad = s * 0.36 * k * (0.8 + 0.25 * Math.sin(a * 2.7 + i)); ctx[a ? 'lineTo' : 'moveTo'](cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad); }
        ctx.closePath(); ctx.fill();
        ctx.fillRect(cx + s * 0.1, cy + s * 0.1, s * 0.05, s * 0.22 * k);
        ctx.globalAlpha = 1;
        if (coffeeReady) { ctx.imageSmoothingEnabled = false; const is = s * 0.42; ctx.drawImage(coffeeImg, cx - is / 2, cy - is / 2 - s * 0.05, is, is); }
      }
      if (!cells[i]) continue;
      const k = an && an.kind === 'in' ? Math.min(1, an.t * 4) : 1;
      if (an && an.kind === 'glitch') {
        const j = 8;
        ctx.save(); ctx.globalAlpha = 0.85 - an.t;
        for (let q = 0; q < 3; q++) {
          ctx.save(); ctx.translate((Math.random() - 0.5) * j * 2, (Math.random() - 0.5) * j);
          ctx.beginPath(); ctx.rect(c.x, c.y + Math.random() * s, s, s * 0.3); ctx.clip();
          if (cells[i] === 'X') drawX(cx, cy, s, 1, q === 0 ? COL.lilac : q === 1 ? COL.lime : COL.paper); else drawO(cx, cy, s, 1);
          ctx.restore();
        }
        ctx.restore();
        continue;
      }
      if (cells[i] === 'X') drawX(cx, cy, s, k); else drawO(cx, cy, s, k);
    }
    // winning line
    if (fx.winLine) {
      const a = cellRect(fx.winLine[0]), z = cellRect(fx.winLine[2]);
      const k = Math.min(1, fx.winT * 3);
      const x1 = a.x + s / 2, y1 = a.y + s / 2, x2 = z.x + s / 2, y2 = z.y + s / 2;
      ctx.strokeStyle = cells[fx.winLine[0]] === 'X' ? COL.lime : COL.lilac; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + (x2 - x1) * k, y1 + (y2 - y1) * k); ctx.stroke();
    }
    // lag spinner
    if (fx.lag) {
      ctx.fillStyle = 'rgba(16,17,20,0.45)'; ctx.fillRect(c0.x, c0.y, s * 3, s * 3);
      const cx = b.x + b.s / 2, cy = c0.y + s * 1.5;
      ctx.strokeStyle = COL.lime; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, t * 8, t * 8 + Math.PI * 1.3); ctx.stroke();
      text('lagging...', cx, cy + s * 0.55, Math.round(13 * u), COL.paper, 'center');
    }
    ctx.restore();
    // floaters
    for (const f of floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.font = 'bold ' + Math.round(16 * u) + 'px ' + FONT; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = COL.carbon; ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawPopup() {
    const p = fx.popup; if (!p) return;
    const w = Math.min(W - 40, 330 * u), size = Math.round(13 * u);
    const lines = wrap(p.body, size, w - 32, 'normal');
    const h = 40 * u + lines.length * size * 1.35 + 52 * u;
    const k = Math.min(1, p.t * 6), sc = 0.85 + 0.15 * k;
    const b = lay.board, x = b.x + b.s / 2, y = b.y + b.s / 2;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); ctx.globalAlpha = k;
    rr(-w / 2, -h / 2, w, h, 8); ctx.fillStyle = COL.paper; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = COL.carbon; ctx.stroke();
    ctx.fillStyle = COL.lilac; ctx.fillRect(-w / 2 + 2, -h / 2 + 2, w - 4, 26 * u);
    text(p.title, -w / 2 + 12, -h / 2 + 19 * u, Math.round(12 * u), COL.carbon);
    text('×', w / 2 - 14, -h / 2 + 20 * u, Math.round(16 * u), COL.carbon, 'center');
    let yy = -h / 2 + 40 * u + size;
    for (const ln of lines) { text(ln, -w / 2 + 16, yy, size, COL.carbon, 'left', 'normal'); yy += size * 1.35; }
    const bw = 90 * u, bh = 26 * u;
    rr(w / 2 - bw - 14, h / 2 - bh - 12, bw, bh, 4); ctx.fillStyle = COL.carbon; ctx.fill();
    text('ok', w / 2 - bw / 2 - 14, h / 2 - 12 - bh * 0.32, Math.round(12 * u), COL.paper, 'center');
    ctx.restore();
    if (k >= 1) buttons.push({ x: x - w / 2, y: y - h / 2, w, h, fn: () => { fx.popup = null; } });
  }

  function drawBsod() {
    if (fx.bsod) {
      ctx.fillStyle = COL.bsod; ctx.fillRect(0, 0, W, H);
      const pad = Math.max(24, W * 0.08), size = Math.round(15 * u);
      text(':(', pad, H * 0.28, Math.round(90 * u), '#ffffff');
      let y = H * 0.28 + 50 * u;
      for (const ln of wrap('your pc ran into a problem and crash won. we\'re just collecting some excuses, and then we\'ll restart for you.', size, W - pad * 2, 'normal')) { text(ln, pad, y, size, '#ffffff', 'left', 'normal'); y += size * 1.4; }
      y += 10;
      text(Math.min(100, Math.floor(fx.bsod * 70)) + '% complete', pad, y, size, '#ffffff', 'left', 'normal');
      text('stop code: YOU_WERE_WINNING', pad, y + size * 2.4, Math.round(11 * u), 'rgba(255,255,255,0.75)', 'left', 'normal');
    }
    if (fx.boot) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;
      text('crash os', cx, cy - 20, Math.round(26 * u), COL.lime, 'center');
      text('restoring from backup...', cx, cy + 12, Math.round(12 * u), COL.dim, 'center', 'normal');
      const bw = Math.min(260, W * 0.6);
      ctx.fillStyle = '#222'; ctx.fillRect(cx - bw / 2, cy + 30, bw, 6);
      ctx.fillStyle = COL.lime; ctx.fillRect(cx - bw / 2, cy + 30, bw * Math.min(1, fx.boot / 1.1), 6);
    }
  }

  function drawMelt() {
    if (!fx.melt || phase === 'over') return;
    const a = Math.max(0, Math.min(1, (2.8 - fx.melt) / 0.5));
    ctx.globalAlpha = Math.min(1, fx.melt * 3) * a;
    const size = Math.round(Math.min(W / 9, 64 * u));
    ctx.font = 'bold ' + size + 'px ' + FONT; ctx.textAlign = 'center';
    const y = lay.board.y + lay.board.s * 0.55 + Math.sin(t * 20) * 3;
    ctx.lineWidth = 8; ctx.strokeStyle = COL.carbon; ctx.strokeText('you beat crash.', W / 2, y);
    ctx.fillStyle = COL.lime; ctx.fillText('you beat crash.', W / 2, y);
    ctx.globalAlpha = 1;
  }

  // the share card. drawn to the screen and to a 1080x1080 image.
  function drawCard(c, x, y, w, h, k, solid) {
    const win = result === 'win';
    if (solid) { c.fillStyle = COL.carbon; c.fillRect(0, 0, w, h); }
    rr(x, y, w, h, 12 * k, c); c.fillStyle = COL.carbon; c.fill(); c.lineWidth = 2 * k; c.strokeStyle = win ? COL.lime : COL.lilac; c.stroke();
    c.save(); rr(x, y, w, 30 * k, 12 * k, c); c.clip(); c.fillStyle = win ? COL.lime : COL.lilac; c.fillRect(x, y, w, 30 * k); c.restore();
    c.fillStyle = win ? COL.lime : COL.lilac; c.fillRect(x, y + 18 * k, w, 12 * k);
    for (let i = 0; i < 3; i++) { c.fillStyle = COL.carbon; c.beginPath(); c.arc(x + (16 + i * 14) * k, y + 15 * k, 4 * k, 0, Math.PI * 2); c.fill(); }
    text(win ? 'status: crash.exe defeated' : 'status: cooked', x + w - 12 * k, y + 20 * k, Math.round(12 * k), COL.carbon, 'right', 'bold', c);
    const mid = x + w / 2;
    let yy = y + 30 * k + (h - 30 * k) * 0.08;
    // crash face
    if (crashReady) {
      c.imageSmoothingEnabled = false;
      const cs = Math.min(110 * k, h * 0.26);
      c.drawImage(crashImg, (win ? 2 : 0) * 128, 0, 128, 128, mid - cs / 2, yy, cs, cs);
      yy += cs + 8 * k;
    }
    const big = win ? youPts + ' – ' + crashPts : youPts + ' – ' + crashPts;
    text(big, mid, yy + 52 * k, Math.round(58 * k), win ? COL.lime : COL.lilac, 'center', 'bold', c);
    yy += 84 * k;
    const msg = win ? 'i beat crash at tic tac toe.' : 'crash beat me at tic tac toe.';
    for (const ln of wrap(msg, Math.round(17 * k), w - 40 * k, 'bold', c)) { text(ln, mid, yy, Math.round(17 * k), COL.paper, 'center', 'bold', c); yy += 23 * k; }
    const sub = win ? 'he cheated ' + cheats + (cheats === 1 ? ' time' : ' times') + '. it wasn\'t enough.' : 'he cheated ' + cheats + (cheats === 1 ? ' time.' : ' times.') + ' he says he didn\'t.';
    for (const ln of wrap(sub, Math.round(13 * k), w - 40 * k, 'normal', c)) { text(ln, mid, yy, Math.round(13 * k), COL.dim, 'center', 'normal', c); yy += 18 * k; }
    yy += 6 * k;
    if (caughtN) { text('got him caught by anticheat ' + caughtN + (caughtN === 1 ? ' time' : ' times'), mid, yy, Math.round(12 * k), COL.pumpkin, 'center', 'normal', c); yy += 18 * k; }
    text('lifetime: ' + recText(), mid, yy, Math.round(12 * k), win ? COL.lime : 'rgba(245,243,237,0.75)', 'center', 'normal', c);
    text(URL_TEXT, mid, y + h - 16 * k, Math.round(13 * k), win ? COL.lime : COL.lilac, 'center', 'bold', c);
    return yy;
  }

  function drawOver() {
    if (phase !== 'over') return;
    const k = Math.min(1, overT / 0.3), e = 1 - Math.pow(1 - k, 3);
    ctx.fillStyle = 'rgba(16,17,20,' + (0.7 * e) + ')'; ctx.fillRect(0, 0, W, H);
    const cw = Math.min(W - 32, 380 * u), ch = Math.min(H - 110 * u, 390 * u);
    const cx = (W - cw) / 2, cy = Math.max(12, (H - ch - 64 * u) / 2) + (1 - e) * 30;
    ctx.globalAlpha = e;
    drawCard(ctx, cx, cy, cw, ch, u * Math.min(1, ch / (390 * u)), false);
    // buttons
    const bh = 46 * u, gap = 10, bw = (cw - gap) / 2, by = cy + ch + 12;
    const btn = (bx, label, fill, fg, fn) => {
      rr(bx, by, bw, bh, 10); ctx.fillStyle = fill; ctx.fill();
      text(label, bx + bw / 2, by + bh * 0.62, Math.round(15 * u), fg, 'center');
      buttons.push({ x: bx, y: by, w: bw, h: bh, fn });
    };
    if (overT > 0.5) {
      btn(cx, 'share', COL.lilac, COL.carbon, share);
      btn(cx + bw + gap, 'rematch', COL.lime, COL.carbon, () => { if (overT > 0.8) newMatch(); });
    }
    ctx.globalAlpha = 1;
  }

  function drawConfetti() {
    for (const p of confetti) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (fx.flash > 0) { ctx.globalAlpha = fx.flash * 0.6; ctx.fillStyle = fx.flashCol; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  }

  function drawToast() {
    if (toast.life <= 0) return;
    ctx.globalAlpha = Math.min(1, toast.life * 3);
    const size = Math.round(13 * u); ctx.font = 'bold ' + size + 'px ' + FONT;
    const w = ctx.measureText(toast.text).width + 28, h = size + 20, x = (W - w) / 2, y = lay.board.y + 36 * u;
    rr(x, y, w, h, 8); ctx.fillStyle = COL.paper; ctx.fill();
    text(toast.text, W / 2, y + h * 0.66, size, COL.carbon, 'center');
    ctx.globalAlpha = 1;
  }
  function drawPause() {
    if (!paused) return;
    ctx.fillStyle = 'rgba(16,17,20,0.8)'; ctx.fillRect(0, 0, W, H);
    text('paused', W / 2, H / 2, Math.round(30 * u), COL.lime, 'center');
    text('crash is also resting. (plotting.)', W / 2, H / 2 + 28 * u, Math.round(12 * u), COL.dim, 'center', 'normal');
  }

  // ---------- loop ----------
  let last = performance.now(), timeScale = 1;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) update(dt * timeScale);
    render();
    requestAnimationFrame(frame);
  }
  function render() {
    buttons = [];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textBaseline = 'alphabetic';
    drawBackground();
    drawHUD();
    drawBoard();
    if (phase !== 'over') drawTools();
    drawCrash();
    drawSus();
    drawBubble();
    drawPopup();
    drawMelt();
    drawConfetti();
    drawOver();
    drawBsod();
    drawToast();
    drawPause();
  }

  if (/[?&]debug/.test(location.search) && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) window.__ccDebug = { get cells() { return cells; }, get blocked() { return blocked; }, get phase() { return phase; }, get round() { return round; }, get score() { return [youPts, crashPts, draws, cheats]; }, get result() { return result; }, get sus() { return sus; }, get tokens() { return tokens; }, get canUndo() { return !!undoSnap; }, get undoWins() { if (!undoSnap) return false; const c = cells, d = diagBan; cells = undoSnap.cells; diagBan = undoSnap.diagBan; const w = !!lineFor('X'); cells = c; diagBan = d; return w; }, get firewall() { return firewall; }, get caught() { return caughtN; }, useTool, move: playerMove, newMatch, set timeScale(v) { timeScale = v; }, step(sec) { for (let k = 0; k < sec * 60; k++) update(1 / 60); render(); } };
  resize();
  newMatch();
  requestAnimationFrame(frame);
})();
