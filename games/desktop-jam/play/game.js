// desktop jam: tap desktop icons to slide them off in their arrow's direction. something in the way = bonk.
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  const LEVELS = 50;
  const LIVES = 3;
  const DAY0 = Date.UTC(2026, 9, 19); // daily desktop #1
  const SLUG_URL = 'computercooked.com/games/desktop-jam';

  // ---------------------------------------------------------------- storage + sdk (both optional)
  const store = {
    get(k, d) { try { const v = localStorage.getItem('dj.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('dj.' + k, JSON.stringify(v)); } catch (e) { /* private mode */ } },
  };
  const cc = {
    call(fn, ...a) { try { if (window.cc && typeof window.cc[fn] === 'function') window.cc[fn](...a); } catch (e) { /* sdk is optional */ } },
    lastScoreAt: 0,
    score(n) { const t = performance.now(); if (t - this.lastScoreAt < 500) return; this.lastScoreAt = t; this.call('score', n); },
  };

  // ---------------------------------------------------------------- rng
  function rngOf(seed) {
    let s = seed >>> 0 || 1;
    return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------------------------------------------------------------- icons
  const NAMES = ['final_FINAL_v3.docx', 'New folder (7)', 'homework', 'taxes_2019.pdf', 'untitled.png', 'do_not_open.exe', 'memes', 'resume_REAL.pdf',
    'Recycle Bin', 'screenshot (412).png', 'passwords.txt', 'setup(2).exe', 'stuff.zip', 'new new folder', 'IMG_0031.jpg', 'notes.txt', 'bangers.mp3',
    'minecraft_backup.zip', 'essay_draft_9.docx', 'free_ram.exe', 'readme.txt', 'tax stuff', 'meme_template.png', 'invoice_OLD.pdf', 'Shortcut to Shortcut.exe'];
  const SYS = ['system32', 'DO_NOT_DELETE.sys', 'boot.ini', 'pagefile.sys', 'kernel.dll', 'hiberfil.sys', 'ntldr', 'registry.dat'];
  const SPIN = ['spinner.exe', 'loading_wheel.exe', 'fidget.exe', 'washing_machine.exe', 'beachball.exe', 'roomba.exe'];
  const WINS = ['zoom (not responding)', 'YOU WON A PRIZE!!', 'update available', 'excel.exe', 'chrome: 87 tabs', 'are you still watching?', 'save changes?', 'printer error'];
  const SPOOKY = ['ghost_v2.exe', 'spells.txt', 'candy_stash.zip', 'costume_FINAL.png', 'haunted folder', 'boo.mp3', 'pumpkin_recipes.pdf', 'not_a_vampire.docx',
    'graveyard', 'skeleton.jpg', 'Recycle Bin (haunted)', 'cursed_final_v2.docx', 'bats', 'witch_taxes.pdf', 'scream.mp3'];
  function kindOf(name) {
    if (/recycle bin/i.test(name)) return 'bin';
    const m = name.match(/\.(\w+)$/);
    const ext = m ? m[1].toLowerCase() : '';
    return { docx: 'doc', pdf: 'pdf', png: 'img', jpg: 'img', exe: 'exe', zip: 'zip', txt: 'txt', mp3: 'mp3' }[ext] || 'folder';
  }

  // ---------------------------------------------------------------- level generation (always solvable)
  // A piece covers 1 or 2 cells (grid cells point at the same piece object). Pieces are inserted one by one and each
  // new piece's lanes to the edge must be clear of pieces already placed, so removing in reverse insertion order always
  // works. Removing a piece only ever frees lanes, walls never move, and the key is inserted after every locked piece
  // (so it comes off first): there are no dead ends.
  const WORLDS = [
    { name: 'desktop', intro: '' },
    { name: 'system32', intro: 'new: system files. they never move and never leave. route around them.' },
    { name: 'big windows', intro: 'new: windows take two spaces. both lanes have to be clear.' },
    { name: 'admin rights', intro: 'new: locked icons won\'t budge until admin.key is off the desktop.' },
    { name: 'spin cycle', intro: 'new: spinning .exe files turn 90° every time anything leaves. order matters now. you can jam yourself.' },
  ];
  // current direction of a piece: spinners turn a quarter clockwise each time any piece leaves
  function dirOf(pc, removed) { return pc.spin ? (pc.d + removed) % 4 : pc.d; }
  // exact search (with a node cap) for a full clear; also counts dead ends met on the way (= how much order matters)
  function solve(grid, cols, rows, cap) {
    const pieces = piecesOf(grid).filter((pc) => !pc.wall);
    const g = grid.slice(), seen = new Set();
    let nodes = 0, dead = 0;
    const keyOf = () => pieces.map((pc) => (g[pc.cells[0]] === pc ? 1 : 0)).join('');
    function rec(removed, keyGone) {
      if (removed === pieces.length) return true;
      if (++nodes > cap) return false;
      const k = keyOf(); if (seen.has(k)) return false; seen.add(k);
      const free = pieces.filter((pc) => g[pc.cells[0]] === pc && movable(pc, keyGone) && !block(g, cols, rows, pc, dirOf(pc, removed)).k);
      if (!free.length) { dead++; return false; }
      free.sort((a, b) => (a.spin ? 1 : 0) - (b.spin ? 1 : 0));
      for (const pc of free) {
        for (const c of pc.cells) g[c] = null;
        const ok = rec(removed + 1, keyGone || !!pc.key);
        for (const c of pc.cells) g[c] = pc;
        if (ok) return true;
      }
      return false;
    }
    const ok = rec(0, !pieces.some((pc) => pc.key));
    return { ok, nodes, dead };
  }
  // share of random (but legal) playthroughs that jam: how much order matters
  function jamRate(grid, cols, rows, seed, n) {
    const r = rngOf(seed); let jams = 0;
    for (let t = 0; t < n; t++) {
      const g = grid.slice(); let removed = 0, keyGone = !g.some((pc) => pc && pc.key);
      for (;;) {
        const live = piecesOf(g).filter((pc) => !pc.wall);
        if (!live.length) break;
        const free = live.filter((pc) => movable(pc, keyGone) && !block(g, cols, rows, pc, dirOf(pc, removed)).k);
        if (!free.length) { jams++; break; }
        const pc = free[Math.floor(r() * free.length)];
        for (const c of pc.cells) g[c] = null; removed++; if (pc.key) keyGone = true;
      }
    }
    return jams / n;
  }
  // turns some pieces into spinners; keeps a solvable variant whose random-play jam rate is closest to the target
  function spinLevel(cols, rows, density, baseSeed, bias, o, spinners, target) {
    let best = null;
    for (let k = 0; k < 18; k++) {
      const g = generate(cols, rows, density, baseSeed + k * 7919, bias, o);
      const r = rngOf(baseSeed + k);
      const cand = shuffle(piecesOf(g).filter((pc) => !pc.wall && !pc.key && !pc.locked && !pc.win), r);
      cand.slice(0, spinners).forEach((pc) => { pc.spin = true; pc.d = Math.floor(r() * 4); });
      const res = solve(g, cols, rows, 4000);
      if (!res.ok) continue;
      const jr = jamRate(g, cols, rows, baseSeed, 30), score = Math.abs(jr - target);
      if (!best || score < best.score) best = { g, score, jr };
    }
    return best ? best.g : generate(cols, rows, density, baseSeed, bias, o);
  }
  function block(grid, cols, rows, pc, d) {
    let best = 0, blocker = null;
    for (const c of pc.cells) {
      let x = c % cols, y = Math.floor(c / cols), k = 0;
      for (;;) {
        x += DX[d]; y += DY[d]; k++;
        if (x < 0 || y < 0 || x >= cols || y >= rows) break;
        const o = grid[y * cols + x];
        if (o && o !== pc) { if (!best || k < best) { best = k; blocker = o; } break; }
      }
    }
    return { k: best, blocker };
  }
  function edgeDist(cols, rows, c, d) { const x = c % cols, y = Math.floor(c / cols); return [y, cols - 1 - x, rows - 1 - y, x][d]; }
  // bias 0..1: how often a piece points the long way across the board (long lanes get blocked more = harder)
  function generate(cols, rows, density, seed, bias, o) {
    o = o || {};
    const r = rngOf(seed);
    const grid = new Array(cols * rows).fill(null);
    const order = [];
    for (let i = 0; i < (o.walls || 0); i++) {
      const c = Math.floor(r() * cols * rows);
      if (!grid[c]) grid[c] = { cells: [c], w: 1, h: 1, d: -1, wall: true };
    }
    const cells = shuffle([...Array(cols * rows).keys()], r);
    const target = Math.round(density * cols * rows);
    let n = 0;
    for (const c of cells) {
      if (n >= target) break;
      if (grid[c]) continue;
      let pc = null;
      if (o.win && r() < o.win) {
        const horiz = r() < 0.5, x = c % cols, y = Math.floor(c / cols);
        const c2 = horiz ? (x + 1 < cols ? c + 1 : -1) : (y + 1 < rows ? c + cols : -1);
        if (c2 >= 0 && !grid[c2]) pc = { cells: [c, c2], w: horiz ? 2 : 1, h: horiz ? 1 : 2, win: true };
      }
      if (!pc) pc = { cells: [c], w: 1, h: 1 };
      const dirs = shuffle([0, 1, 2, 3], r).filter((dd) => !block(grid, cols, rows, pc, dd).k);
      if (!dirs.length) continue;
      if (r() < bias) dirs.sort((a, b) => edgeDist(cols, rows, c, b) - edgeDist(cols, rows, c, a));
      pc.d = dirs[0];
      for (const cc of pc.cells) grid[cc] = pc;
      order.push(pc); n += pc.cells.length;
    }
    if (o.locks && order.length > 4) {
      const key = order[order.length - 1 - Math.floor(r() * Math.max(1, order.length * 0.3))];
      key.key = true;
      const early = shuffle(order.slice(0, Math.floor(order.length * 0.55)).filter((pc) => !pc.key && !pc.win), r);
      early.slice(0, o.locks).forEach((pc) => { pc.locked = true; });
    }
    return grid;
  }
  function piecesOf(grid) { return [...new Set(grid.filter(Boolean))]; }
  function movable(pc, keyGone) { return !pc.wall && !(pc.locked && !keyGone); }
  // average share of pieces that are free to go, over a random clean playthrough (lower = harder)
  function easiness(grid, cols, rows, seed) {
    const g = grid.slice(), r = rngOf(seed);
    let sum = 0, steps = 0, keyGone = !g.some((pc) => pc && pc.key);
    for (let guard = 0; guard < 200; guard++) {
      const live = piecesOf(g).filter((pc) => !pc.wall);
      if (!live.length) break;
      const free = live.filter((pc) => movable(pc, keyGone) && !block(g, cols, rows, pc, dirOf(pc, steps)).k);
      if (!free.length) return 1; // should not happen: treat as broken so it is never picked
      sum += free.length / live.length; steps++;
      const pick = free[Math.floor(r() * free.length)];
      if (pick.key) keyGone = true;
      for (const c of pick.cells) g[c] = null;
    }
    return steps ? sum / steps : 1;
  }
  function pickLevel(cols, rows, density, baseSeed, target, bias, o) {
    const cands = [];
    for (let k = 0; k < 16; k++) {
      const g = generate(cols, rows, density, baseSeed + k * 7919, bias, o);
      cands.push({ g, e: easiness(g, cols, rows, baseSeed) });
    }
    // the candidate whose easiness is closest to the target (0 = hardest possible)
    cands.sort((a, b) => Math.abs(a.e - target) - Math.abs(b.e - target));
    return cands[0].g;
  }
  function singles(arr, cols) { return arr.map((v, c) => (v ? { cells: [c], w: 1, h: 1, d: v.d } : null)); }
  function levelSpec(i) {
    if (i === 0) { // hand-made: teaches "clear the blocker first"
      const g = new Array(9).fill(null);
      g[3] = { d: 0 }; g[4] = { d: 3 }; g[5] = { d: 3 }; g[1] = { d: 1 };
      return { cols: 3, rows: 3, grid: singles(g, 3) };
    }
    if (i === 1) {
      const g = new Array(16).fill(null);
      g[5] = { d: 1 }; g[6] = { d: 0 }; g[2] = { d: 0 }; g[9] = { d: 2 }; g[10] = { d: 3 }; g[13] = { d: 3 }; g[0] = { d: 2 };
      return { cols: 4, rows: 4, grid: singles(g, 4) };
    }
    const w = Math.floor(i / 10), j = i % 10, t = j / 9, seed = hash('desktop-jam-level-' + i);
    if (w === 0) {
      const cols = 4 + Math.floor(j / 4), rows = 5 + Math.floor(j / 3);
      return { cols, rows, grid: pickLevel(cols, rows, 0.55 + 0.35 * t, seed, 0.74 - 0.3 * t, 0.15 + 0.6 * t) };
    }
    if (w === 4) { // spin cycle: smaller boards, real decisions
      const cols = 4 + Math.floor(j / 4), rows = 5 + Math.floor(j / 3);
      return { cols, rows, grid: spinLevel(cols, rows, 0.6 + 0.25 * t, seed, 0.5, { walls: 1 + Math.floor(j / 3) }, 3 + Math.floor(j / 2), 0.25 + 0.5 * t) };
    }
    const cols = Math.min(7, (w === 3 ? 6 : 5) + Math.floor(j / 4)), rows = Math.min(9, (w === 3 ? 7 : 6) + Math.floor(j / 3));
    const o = w === 1 ? { walls: 3 + Math.floor(j / 2) }
      : w === 2 ? { walls: Math.floor(j / 4), win: 0.3 + 0.15 * t }
      : { walls: 2, win: 0.2, locks: 2 + Math.floor(j / 2) };
    if (j >= 5) return { cols, rows, grid: spinLevel(cols, rows, 0.62 + 0.28 * t, seed, 0.3 + 0.6 * t, o, 1 + Math.floor((j - 5) / 2), 0.1 + 0.25 * t) };
    return { cols, rows, grid: pickLevel(cols, rows, 0.62 + 0.28 * t, seed, 0.66 - 0.3 * t, 0.3 + 0.6 * t, o) };
  }
  function dayNo() { const d = new Date(); return Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - DAY0) / 86400000) + 1); }
  function dailySpec() {
    const n = dayNo();
    return { cols: 6, rows: 8, grid: spinLevel(6, 8, 0.8, hash('desktop-jam-daily-' + n), 0.7, { walls: 3, win: 0.15, locks: 2 }, 5, 0.5) };
  }

  // ---------------------------------------------------------------- audio (synth only)
  let actx = null, master = null, muted = store.get('muted', false), hostMuted = false;
  function audio() {
    if (actx) return actx;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain(); master.connect(actx.destination); setGain();
    } catch (e) { actx = null; }
    return actx;
  }
  function setGain() { if (master) master.gain.value = (muted || hostMuted || paused) ? 0 : 0.5; }
  function tone(type, f0, f1, dur, vol, when) {
    const a = audio(); if (!a) return;
    const t = a.currentTime + (when || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  let noiseBuf = null;
  function whoosh(pitch) {
    const a = audio(); if (!a) return;
    if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const t = a.currentTime, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(500 * pitch, t); f.frequency.exponentialRampToValueAtTime(3200 * pitch, t + 0.22);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + 0.3);
    tone('triangle', 420 * pitch, 900 * pitch, 0.12, 0.08);
  }
  const sfx = {
    tap() { tone('square', 660, 520, 0.04, 0.05); },
    nope() { tone('square', 220, 180, 0.08, 0.08); },
    unlock() { [784, 988, 1175, 1568].forEach((f, i) => tone('triangle', f, f, 0.1, 0.08, i * 0.05)); },
    whoosh,
    bonk() { tone('square', 140, 60, 0.18, 0.28); tone('sine', 90, 50, 0.25, 0.35); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.12, 0.09, i * 0.08)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => tone('sawtooth', f, f * 0.98, 0.18, 0.07, i * 0.12)); },
  };

  // ---------------------------------------------------------------- state
  const cv = $('board'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, cs = 40, ox = 0, oy = 0;
  let L = null;          // current level { mode, idx, cols, rows, grid, lives, bonks, start, total, done }
  let anims = [], parts = [], shake = 0, flash = 0, cursor = -1, combo = 0, lastClearAt = 0, crashTimer = 0;
  let paused = false, ui = 'title';
  let level = Math.min(LEVELS - 1, store.get('level', 0));
  const stars = store.get('stars', {});
  const spookyAuto = Date.now() < new Date(2026, 10, 1).getTime();
  let spooky = store.get('spooky', spookyAuto);

  function startLevel(mode, idx) {
    const spec = mode === 'daily' ? dailySpec() : levelSpec(idx);
    const r = rngOf(hash(mode + idx + dayNo()));
    const names = shuffle((spooky ? SPOOKY.concat(NAMES.slice(0, 8)) : NAMES).slice(), r);
    let k = 0, total = 0;
    const pieces = piecesOf(spec.grid);
    pieces.forEach((pc, i) => {
      pc.wob = 0; pc.x = pc.cells[0] % spec.cols; pc.y = Math.floor(pc.cells[0] / spec.cols);
      if (pc.wall) { pc.name = SYS[i % SYS.length]; pc.kind = 'sys'; return; }
      if (pc.key) { pc.name = 'admin.key'; pc.kind = 'key'; }
      else if (pc.win) { pc.name = WINS[i % WINS.length]; pc.kind = 'win'; }
      else if (pc.spin) { pc.name = SPIN[i % SPIN.length]; pc.kind = 'exe'; }
      else { pc.name = names[k++ % names.length]; pc.kind = kindOf(pc.name); }
      total++;
    });
    L = { mode, idx, removed: 0, cols: spec.cols, rows: spec.rows, grid: spec.grid, pieces, keyGone: !pieces.some((pc) => pc.key), lives: mode === 'daily' ? Infinity : LIVES, bonks: 0, start: performance.now(), total, done: false };
    anims = []; parts = []; combo = 0; cursor = -1; L.bornAt = performance.now();
    hideAll(); ui = 'play';
    layout(); hud();
    const world = WORLDS[Math.floor(idx / 10)];
    if (mode === 'level' && idx % 10 === 0 && world && world.intro) { caption('<b>' + world.intro + '</b>'); toast('world ' + (Math.floor(idx / 10) + 1) + ': ' + world.name); }
    else caption(mode === 'daily' ? `daily desktop #${dayNo()}. same mess for everyone. no lives, just shame.` : idx === 0 ? 'tap an icon. it leaves in its <b>arrow</b> direction. start with the one that\'s free.' : pickLine(LINES.start));
    cc.call('start'); cc.call('event', 'level_start', { mode, level: idx + 1 });
  }

  // ---------------------------------------------------------------- layout
  function layout() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    const r = cv.getBoundingClientRect();
    W = Math.max(100, r.width); H = Math.max(100, r.height);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    if (!L) return;
    const pad = 14;
    cs = Math.floor(Math.min((W - pad * 2) / L.cols, (H - pad * 2 - 30) / L.rows, 110));
    ox = Math.round((W - cs * L.cols) / 2);
    oy = Math.round((H - 30 - cs * L.rows) / 2);
  }
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(cv);

  // ---------------------------------------------------------------- hud + text
  const LINES = {
    start: ['another day, another desktop.', 'who saves everything to the desktop. you. you do.', 'clean it up before the screen share.', 'crash is begging you.'],
    exit: ['{n} has left the chat.', '{n} → /dev/null', '{n}: deleted, emotionally.', '{n} yeeted.', 'bye, {n}.', '{n} moved to a farm upstate.'],
    bonk: ['bonk. {n} is in the way.', 'blocked. crash felt that.', 'that path is not clear. look again.', 'bonk. {n} says no.'],
    win: ['desktop: clean. you: unstoppable.', 'zero icons. it\'s beautiful.', 'it\'s giving fresh install.', 'crash can finally see the wallpaper.'],
    lose: ['three bonks. crash needs a minute.', 'the desktop won this round.', 'cooked. try again with feeling.'],
  };
  function pickLine(arr, n) { return arr[Math.floor(Math.random() * arr.length)].replace('{n}', '<em>' + esc(n || '') + '</em>'); }
  function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  function caption(html) { $('cap').innerHTML = html; }
  function remaining() { return L ? L.pieces.filter((pc) => !pc.gone && !pc.wall).length : 0; }
  function hud() {
    if (!L) return;
    $('lvl').textContent = L.mode === 'daily' ? `daily desktop #${dayNo()}` : `level ${L.idx + 1}/${LEVELS} · ${WORLDS[Math.floor(L.idx / 10)].name}`;
    $('lives').innerHTML = L.mode === 'daily' ? `<span style="color:var(--lilac)">bonks ${L.bonks}</span>` : Array.from({ length: LIVES }, (_, i) => `<i class="${i < L.lives ? '' : 'gone'}"></i>`).join('');
    $('left').textContent = remaining() + ' icons left';
  }
  function setCrash(state, ms) {
    $('crash').className = 'crash ' + state;
    clearTimeout(crashTimer);
    if (ms) crashTimer = setTimeout(() => { $('crash').className = 'crash'; }, ms);
  }
  let toastT = 0;
  function toast(t) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 1800); }
  function updateMute() { const m = muted || hostMuted; $('bMute').innerHTML = m ? '&#215;' : '&#9834;'; $('bMute').style.color = m ? 'var(--dim)' : ''; }

  // ---------------------------------------------------------------- moves
  function center(pc) { return [pc.x + (pc.w - 1) / 2, pc.y + (pc.h - 1) / 2]; }
  function tap(c) {
    if (!L || L.done || paused) return;
    const pc = L.grid[c];
    if (!pc || anims.some((a) => a.ic === pc)) return;
    audio();
    if (pc.wall) { pc.wob = 1; sfx.nope(); caption(`<em>${esc(pc.name)}</em> is a system file. it lives here now.`); return; }
    if (pc.locked && !L.keyGone) { pc.wob = 1; sfx.nope(); caption('locked. get <em>admin.key</em> off the desktop first.'); return; }
    const dir = dirOf(pc, L.removed);
    const { k, blocker } = block(L.grid, L.cols, L.rows, pc, dir);
    const [x, y] = center(pc);
    if (k) {
      // bonk: lurch up to the blocker and spring back
      anims.push({ type: 'bonk', ic: pc, x, y, d: dir, reach: k - 1 + 0.32, ext: (dir % 2 ? pc.w : pc.h) / 2, t: 0, blocker });
      L.bonks++; combo = 0;
      if (L.mode !== 'daily') L.lives--;
      sfx.bonk(); shake = 9; flash = 1; vibrate(60);
      setCrash(L.lives <= 0 ? 'cooked' : 'hit', L.lives <= 0 ? 0 : 700);
      caption(pickLine(LINES.bonk, blocker ? blocker.name : ''));
      hud();
      cc.call('event', 'bonk', { mode: L.mode, level: L.idx + 1 });
      if (L.lives <= 0) { L.done = true; const LL = L; setTimeout(() => { if (L === LL) endLevel(false); }, 700); }
      return;
    }
    for (const cc2 of pc.cells) L.grid[cc2] = null;
    pc.gone = true;
    const now = performance.now();
    combo = now - lastClearAt < 1300 ? combo + 1 : 0; lastClearAt = now;
    anims.push({ type: 'exit', ic: pc, x, y, d: dir, t: 0, dist: 0, v: 7 });
    L.removed++;
    for (const q of L.pieces) if (q.spin && !q.gone) q.turn = 1;
    sfx.whoosh(1 + Math.min(combo, 8) * 0.07); vibrate(12);
    if (pc.key) {
      L.keyGone = true; sfx.unlock();
      for (const q of L.pieces) if (q.locked && !q.gone) { q.wob = 1; const [qx, qy] = cellXY(...center(q)); spark(qx, qy, '#ffd84a', 10); }
      caption('<b>admin rights granted.</b> the locks are off.');
    } else caption(combo >= 3 ? `<b>x${combo + 1}</b> clean streak. ` + pickLine(LINES.exit, pc.name) : pickLine(LINES.exit, pc.name));
    hud();
    cc.score(L.mode === 'daily' ? L.total - remaining() : L.idx * 100 + (L.total - remaining()));
    const LL = L;
    if (!remaining()) { L.done = true; setTimeout(() => { if (L === LL) endLevel(true); }, 650); }
    else if (!L.pieces.some((q) => !q.gone && movable(q, L.keyGone) && !block(L.grid, L.cols, L.rows, q, dirOf(q, L.removed)).k)) {
      // jammed: nothing can leave any more (only possible with spinners)
      L.done = true; L.jammed = true; setCrash('cooked');
      setTimeout(() => { if (L === LL) { caption('<b>jammed.</b> nothing can move. the spinners got you.'); sfx.bonk(); shake = 10; } }, 350);
      setTimeout(() => { if (L === LL) endLevel(false); }, 1300);
    }
  }
  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* no */ } }

  // ---------------------------------------------------------------- end of level
  let lastResult = null;
  function starsFor(bonks) { return bonks === 0 ? 3 : bonks === 1 ? 2 : 1; }
  function fmt(ms) { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function endLevel(won) {
    if (!L) return;
    const ms = performance.now() - L.start;
    const st = won ? starsFor(L.bonks) : 0;
    lastResult = { mode: L.mode, idx: L.idx, won, ms, bonks: L.bonks, total: L.total, stars: st, day: dayNo(), jammed: !!L.jammed };
    cc.call('end', { score: L.mode === 'daily' ? L.total : (won ? L.idx + 1 : L.idx) * 100 + (L.total - remaining()), durationMs: Math.round(ms) });
    if (won) { sfx.win(); burstConfetti(); } else sfx.lose();
    if (L.mode === 'level' && won) {
      stars[L.idx] = Math.max(stars[L.idx] || 0, st); store.set('stars', stars);
      if (L.idx + 1 > level && L.idx + 1 < LEVELS) { level = L.idx + 1; store.set('level', level); }
      if (L.idx + 1 >= LEVELS) store.set('level', LEVELS - 1);
      cc.call('event', 'level_reached', { level: L.idx + 2 });
    }
    if (L.mode === 'daily') { store.set('daily2-' + dayNo(), lastResult); cc.call('event', 'daily_done', { day: dayNo(), bonks: L.bonks, ms: Math.round(ms) }); }
    setTimeout(() => showEnd(lastResult), won ? 500 : 200);
  }
  function showEnd(r) {
    ui = 'end';
    const allDone = r.mode === 'level' && r.won && r.idx + 1 >= LEVELS;
    $('endCrash').className = 'bigcrash ' + (r.won ? '' : 'cooked');
    $('endTitle').textContent = r.won ? (r.mode === 'daily' ? 'daily: cleared' : allDone ? 'all ' + LEVELS + ' cleared' : 'desktop cleared') : (r.jammed ? 'jammed' : 'cooked');
    $('endTitle').className = r.won ? '' : 'bad';
    $('endStars').innerHTML = r.mode === 'level' && r.won ? [1, 2, 3].map((i) => `<span class="${i <= r.stars ? '' : 'off'}">&#9733;</span>`).join('') : '';
    $('endMsg').innerHTML = !r.won && r.jammed ? 'jammed. every spinner was pointing at something. order matters here.' : allDone ? 'you beat every desktop. crash is proud and a little scared of you. try the daily.' : r.won ? pickLine(LINES.win) : pickLine(LINES.lose);
    $('endStats').innerHTML = [[fmt(r.ms), 'time'], [r.bonks, 'bonks'], [r.mode === 'daily' ? '#' + r.day : (r.idx + 1) + '/' + LEVELS, r.mode === 'daily' ? 'daily' : 'level']]
      .map(([v, k]) => `<div class="stat"><b>${v}</b><span>${k}</span></div>`).join('');
    $('bNext').textContent = r.mode === 'daily' ? 'play levels' : r.won ? (allDone ? 'replay all' : 'next') : 'retry';
    $('end').classList.add('on');
    setTimeout(() => $('bNext').focus(), 50);
  }

  // ---------------------------------------------------------------- share card
  function shareText(r) {
    const head = r.mode === 'daily' ? `desktop jam · daily #${r.day}` : `desktop jam · level ${r.idx + 1}`;
    const body = r.won ? `cleared ${r.total} icons in ${fmt(r.ms)} with ${r.bonks} bonk${r.bonks === 1 ? '' : 's'}` : `got cooked by a desktop (${r.total} icons)`;
    const bar = r.mode === 'daily' ? '\n' + (r.bonks ? '💥'.repeat(Math.min(r.bonks, 10)) : '✨ zero bonks') : r.won ? '\n' + '⭐'.repeat(r.stars) : '';
    return `${head}\n${body}${bar}\n${SLUG_URL}`;
  }
  function drawCard(r) {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 630;
    const g = c.getContext('2d');
    g.fillStyle = '#101114'; g.fillRect(0, 0, 1200, 630);
    // a little mess of icons on the right
    const rr = rngOf(hash('card' + r.day + r.idx));
    for (let i = 0; i < 14; i++) {
      const x = 720 + (i % 4) * 110 + rr() * 20, y = 60 + Math.floor(i / 4) * 130 + rr() * 20;
      g.globalAlpha = r.won ? 0.22 : 0.9;
      drawIcon(g, ['folder', 'doc', 'img', 'exe', 'zip', 'pdf', 'txt', 'bin'][i % 8], x + 45, y + 45, 80, Math.floor(rr() * 4), false);
    }
    g.globalAlpha = 1;
    if (crashImg.complete && crashImg.naturalWidth) { g.imageSmoothingEnabled = false; g.drawImage(crashImg, r.won ? 0 : 256, 0, 128, 128, 820, 360, 256, 256); }
    g.font = '900 96px ui-monospace, Menlo, Consolas, monospace'; g.fillStyle = '#5e4a9e'; g.fillText('desktop jam', 66, 166); g.fillStyle = '#C5FF49'; g.fillText('desktop jam', 60, 160);
    g.font = '800 40px ui-monospace, Menlo, Consolas, monospace'; g.fillStyle = '#F5F3ED';
    g.fillText(r.mode === 'daily' ? `daily desktop #${r.day}` : `level ${r.idx + 1}`, 60, 250);
    g.fillStyle = r.won ? '#C5FF49' : '#B59AFF';
    g.fillText(r.won ? `cleared in ${fmt(r.ms)}` : 'cooked.', 60, 320);
    g.fillStyle = '#F5F3ED';
    g.fillText(`${r.bonks} bonk${r.bonks === 1 ? '' : 's'} · ${r.total} icons`, 60, 380);
    g.font = '800 26px ui-monospace, Menlo, Consolas, monospace'; g.fillStyle = '#77756e';
    g.fillText(SLUG_URL, 60, 560);
    return c;
  }
  async function share() {
    if (!lastResult) return;
    cc.call('event', 'share_clicked', { mode: lastResult.mode });
    const text = shareText(lastResult);
    try {
      if (navigator.share) {
        const blob = await new Promise((res) => drawCard(lastResult).toBlob(res, 'image/png'));
        const file = blob && new File([blob], 'desktop-jam.png', { type: 'image/png' });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text }); return; }
        await navigator.share({ text }); return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    let ok = false;
    try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); ok = true; } } catch (e) { ok = false; }
    if (!ok) { try { const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch (e) { ok = false; } }
    toast(ok ? 'copied. go brag.' : 'copy blocked. it\'s on the card, copy it by hand.');
    if (!ok) $('endMsg').innerHTML = '<span style="user-select:text;-webkit-user-select:text;white-space:pre-line">' + esc(text) + '</span>';
  }

  // ---------------------------------------------------------------- drawing
  const crashImg = new Image(); crashImg.src = 'crash.png';
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // icon centered at (cx, cy), size s, with its arrow in direction d
  function drawIcon(g, kind, cx, cy, s, d, spk) {
    const u = s / 16, x0 = cx - s / 2, y0 = cy - s / 2;
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x0 + x * u, y0 + y * u, w * u, h * u); };
    // drop shadow
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 + 2 * u, y0 + 3 * u, 13 * u, 13 * u);
    if (kind === 'folder') {
      const a = spk ? '#ff8a1f' : '#ffd84a', b = spk ? '#c95f0a' : '#d9a520', hi = spk ? '#ffb469' : '#ffeb94';
      R(1, 2, 6, 3, b); R(1, 4, 14, 10, b); R(1, 6, 14, 8, a); R(1, 6, 14, 1, hi);
    } else if (kind === 'doc' || kind === 'pdf' || kind === 'txt') {
      R(3, 1, 10, 14, '#F5F3ED'); R(10, 1, 3, 3, '#cfcabd');
      const band = kind === 'doc' ? '#5b8cff' : kind === 'pdf' ? '#ff5a5a' : '#B59AFF';
      R(3, 1, 7, 3, band);
      for (let i = 0; i < 4; i++) R(5, 6 + i * 2, i === 3 ? 4 : 7, 1, kind === 'txt' ? '#9a968b' : '#7c7a73');
    } else if (kind === 'img') {
      R(1, 2, 14, 12, '#F5F3ED'); R(2, 3, 12, 10, spk ? '#3b1f5c' : '#B59AFF'); R(10, 4, 2, 2, spk ? '#ff8a1f' : '#fff6b0');
      g.fillStyle = '#C5FF49'; g.beginPath(); g.moveTo(x0 + 2 * u, y0 + 13 * u); g.lineTo(x0 + 7 * u, y0 + 7 * u); g.lineTo(x0 + 11 * u, y0 + 13 * u); g.fill();
    } else if (kind === 'exe') {
      R(1, 2, 14, 12, '#2a2c33'); R(1, 2, 14, 3, '#B59AFF'); R(12, 3, 2, 1, '#101114');
      R(3, 7, 2, 1, '#C5FF49'); R(4, 8, 2, 1, '#C5FF49'); R(3, 9, 2, 1, '#C5FF49'); R(7, 10, 5, 1, '#C5FF49');
    } else if (kind === 'zip') {
      R(1, 2, 6, 3, '#7a5fd1'); R(1, 4, 14, 10, '#7a5fd1'); R(1, 6, 14, 8, '#B59AFF');
      for (let i = 0; i < 4; i++) R(7, 6 + i * 2, 2, 1, '#F5F3ED'); R(7, 13, 2, 1, '#101114');
    } else if (kind === 'mp3') {
      R(3, 1, 10, 14, '#F5F3ED'); R(8, 4, 1, 7, '#101114'); R(8, 4, 3, 1, '#101114'); R(6, 10, 3, 2, '#101114'); R(3, 1, 10, 2, '#C5FF49');
    } else if (kind === 'sys') {
      R(1, 1, 14, 14, '#3a3c44'); R(2, 2, 12, 12, '#2a2c33');
      R(5, 4, 6, 7, '#77756e'); R(6, 11, 4, 1, '#77756e'); R(7, 12, 2, 1, '#77756e'); R(7, 5, 2, 4, '#2a2c33');
    } else if (kind === 'key') {
      R(2, 5, 6, 6, '#ffd84a'); R(4, 7, 2, 2, '#101114'); R(8, 7, 7, 2, '#ffd84a'); R(12, 9, 1, 3, '#ffd84a'); R(14, 9, 1, 2, '#ffd84a'); R(2, 5, 6, 1, '#fff2a8');
    } else { // bin
      R(3, 3, 10, 2, '#cfd3da'); R(6, 2, 4, 1, '#cfd3da'); R(4, 5, 8, 10, spk ? '#6b4b2a' : '#a9afb9');
      for (let i = 0; i < 3; i++) R(5 + i * 2.5, 6, 1, 8, spk ? '#3f2a14' : '#7d838d');
    }
    drawArrow(g, cx, cy, s * 0.44, s * 0.3, d, u);
  }
  function drawArrow(g, cx, cy, ext, a, d, u) {
    if (d >= 0) {
      const ax = cx + DX[d] * ext, ay = cy + DY[d] * ext;
      const px = -DY[d], py = DX[d];
      g.beginPath();
      g.moveTo(ax + DX[d] * a, ay + DY[d] * a);
      g.lineTo(ax + px * a * 0.85, ay + py * a * 0.85);
      g.lineTo(ax - px * a * 0.85, ay - py * a * 0.85);
      g.closePath();
      g.lineWidth = Math.max(2, u * 1.2); g.strokeStyle = '#101114'; g.lineJoin = 'round'; g.stroke();
      g.fillStyle = '#C5FF49'; g.fill();
    }
  }
  function drawWindow(g, cx, cy, ww, hh, d, name, s) {
    const x0 = cx - ww / 2, y0 = cy - hh / 2, bar = Math.max(8, s * 0.22);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x0 + 4, y0 + 5, ww, hh);
    g.fillStyle = '#F5F3ED'; g.fillRect(x0, y0, ww, hh);
    g.fillStyle = '#B59AFF'; g.fillRect(x0, y0, ww, bar);
    g.fillStyle = '#101114'; g.fillRect(x0 + ww - bar * 0.9, y0 + bar * 0.25, bar * 0.5, bar * 0.5);
    g.strokeStyle = '#101114'; g.lineWidth = 2; g.strokeRect(x0, y0, ww, hh);
    g.fillStyle = '#101114'; g.font = `800 ${Math.max(8, Math.round(s * 0.16))}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = name.split(' '), maxW = ww - 8; let lines = [], line = '';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { lines.push(line); line = wd; } else line = t; }
    lines.push(line); lines = lines.slice(0, hh > ww ? 4 : 2);
    const lh = Math.max(9, s * 0.2), ty = y0 + bar + (hh - bar) / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((ln, i) => g.fillText(ln.length > 14 ? ln.slice(0, 13) + '…' : ln, cx, ty + i * lh));
    g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    drawArrow(g, cx, cy, (d % 2 ? ww : hh) / 2 + s * 0.02, s * 0.3, d, s / 16);
  }
  function drawSpinBadge(g, s) {
    const r = s * 0.17, x = -s * 0.3, y = -s * 0.3;
    g.fillStyle = '#101114'; g.beginPath(); g.arc(x, y, r + 2, 0, 7); g.fill();
    g.strokeStyle = '#ffd84a'; g.lineWidth = Math.max(2, s * 0.06); g.beginPath(); g.arc(x, y, r * 0.65, 0.3, 5.3); g.stroke();
    g.fillStyle = '#ffd84a'; g.beginPath(); g.moveTo(x + r * 0.9, y - r * 0.2); g.lineTo(x + r * 0.35, y + r * 0.35); g.lineTo(x + r * 1.15, y + r * 0.5); g.fill();
  }
  function drawLock(g, cx, cy, s) {
    const u = s / 16;
    g.fillStyle = '#101114'; g.fillRect(cx - 5 * u, cy - 1 * u, 10 * u, 8 * u);
    g.fillStyle = '#ffd84a'; g.fillRect(cx - 4 * u, cy, 8 * u, 6 * u);
    g.strokeStyle = '#ffd84a'; g.lineWidth = 2 * u; g.beginPath(); g.arc(cx, cy - 1 * u, 3 * u, Math.PI, 0); g.stroke();
    g.fillStyle = '#101114'; g.fillRect(cx - 0.75 * u, cy + 2 * u, 1.5 * u, 2.5 * u);
  }
  function drawPiece(g, pc, cx, cy, s, d, ghost) {
    if (pc.kind === 'win') return drawWindow(g, cx, cy, pc.w * cs - cs * 0.16, pc.h * cs - cs * 0.16, ghost ? -1 : d, pc.name, s);
    drawIcon(g, pc.kind, cx, cy, s, ghost || pc.wall ? -1 : d, spooky);
    if (pc.locked && !L.keyGone && !ghost) { g.globalAlpha = 0.55; g.fillStyle = '#101114'; g.fillRect(cx - s / 2, cy - s / 2, s, s); g.globalAlpha = 1; drawLock(g, cx, cy, s * 0.9); }
  }
  function drawWallpaper(now) {
    const g = ctx;
    const grd = g.createLinearGradient(0, 0, W, H);
    if (spooky) { grd.addColorStop(0, '#1b1022'); grd.addColorStop(1, '#2a1406'); } else { grd.addColorStop(0, '#15161b'); grd.addColorStop(1, '#1c1730'); }
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // a giant faint crash logo-ish blob
    g.fillStyle = spooky ? 'rgba(255,138,31,.05)' : 'rgba(197,255,73,.035)';
    g.beginPath(); g.arc(W * 0.78, H * 0.2, Math.min(W, H) * 0.35, 0, 7); g.fill();
    g.fillStyle = 'rgba(181,154,255,.05)';
    g.beginPath(); g.arc(W * 0.15, H * 0.85, Math.min(W, H) * 0.4, 0, 7); g.fill();
    if (spooky) { // bats
      g.fillStyle = 'rgba(16,17,20,.7)';
      for (let i = 0; i < 4; i++) {
        const bx = ((now / 30 + i * 260) % (W + 80)) - 40, by = 30 + i * 40 + Math.sin(now / 300 + i) * 10, f = Math.sin(now / 90 + i) * 5;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 10, by - 4 - f); g.lineTo(bx - 4, by + 2); g.lineTo(bx, by + 4); g.lineTo(bx + 4, by + 2); g.lineTo(bx + 10, by - 4 - f); g.closePath(); g.fill();
      }
    }
    // taskbar
    const tb = 30;
    g.fillStyle = '#0b0b0e'; g.fillRect(0, H - tb, W, tb);
    g.fillStyle = spooky ? '#ff8a1f' : '#C5FF49'; g.fillRect(6, H - tb + 5, 58, tb - 10);
    g.fillStyle = '#101114'; g.font = '900 12px ui-monospace, Menlo, Consolas, monospace'; g.textBaseline = 'middle'; g.fillText(spooky ? 'boo' : 'start', 14, H - tb / 2 + 1);
    const d = new Date();
    g.fillStyle = '#77756e'; g.textAlign = 'right'; g.fillText(d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'), W - 10, H - tb / 2 + 1); g.textAlign = 'left';
  }
  function cellXY(x, y) { return [ox + (x + 0.5) * cs, oy + (y + 0.5) * cs]; }
  function draw(now, dt) {
    const g = ctx;
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawWallpaper(now);
    if (!L) return;
    let sx = 0, sy = 0;
    if (shake > 0.3) { sx = (Math.random() * 2 - 1) * shake; sy = (Math.random() * 2 - 1) * shake; shake *= Math.pow(0.86, dt / 16); } else shake = 0;
    g.save(); g.translate(sx, sy);
    // faint grid dots so the lanes read
    g.fillStyle = 'rgba(245,243,237,.06)';
    for (let y = 0; y <= L.rows; y++) for (let x = 0; x <= L.cols; x++) g.fillRect(ox + x * cs - 1, oy + y * cs - 1, 2, 2);
    const s = cs * 0.64;
    const labels = false; // names live in the caption: on the board they collide with down arrows
    g.font = `700 ${Math.max(9, Math.round(cs * 0.13))}px ui-monospace, Menlo, Consolas, monospace`; g.textAlign = 'center'; g.textBaseline = 'top';
    // cursor (keyboard)
    if (cursor >= 0) {
      const [cx, cy] = cellXY(cursor % L.cols, Math.floor(cursor / L.cols));
      g.strokeStyle = '#B59AFF'; g.lineWidth = 2; g.setLineDash([5, 4]); g.strokeRect(cx - cs / 2 + 2, cy - cs / 2 + 2, cs - 4, cs - 4); g.setLineDash([]);
    }
    const animOf = new Map(anims.map((a) => [a.ic, a]));
    for (const pc of L.pieces) {
      if (pc.gone) continue;
      const [px, py] = center(pc);
      let [cx, cy] = cellXY(px, py);
      const a = animOf.get(pc);
      if (a && a.type === 'bonk') { const p = bonkCurve(a.t); cx += DX[a.d] * a.reach * cs * p; cy += DY[a.d] * a.reach * cs * p; }
      if (pc.wob > 0) { cx += Math.sin(now / 18) * pc.wob * 4; pc.wob = Math.max(0, pc.wob - dt / 400); }
      const born = Math.min(1, Math.max(0, (now - L.bornAt - ((pc.x + pc.y) * 35)) / 260));
      const sc = born < 1 ? easeBack(born) : 1;
      if (sc <= 0) continue;
      g.save(); g.translate(cx, cy); g.scale(sc, sc);
      if (pc.spin) { if (pc.turn > 0) { g.rotate(-pc.turn * Math.PI / 2); pc.turn = Math.max(0, pc.turn - dt / 260); } }
      drawPiece(g, pc, 0, 0, s, dirOf(pc, L.removed), false);
      if (pc.spin) { drawSpinBadge(g, s); g.globalAlpha = 0.28; drawArrow(g, 0, 0, s * 0.44, s * 0.24, dirOf(pc, L.removed + 1), s / 16); g.globalAlpha = 1; }
      g.restore();
    }
    // exiting icons: accelerate off the screen with a smear
    for (const a of anims) {
      if (a.type !== 'exit') continue;
      const [cx, cy] = cellXY(a.x, a.y);
      for (let k = 3; k >= 0; k--) {
        const dd = a.dist - k * 0.18 * Math.min(1, a.v / 10);
        g.globalAlpha = k ? 0.12 * (4 - k) : 1;
        drawPiece(g, a.ic, cx + DX[a.d] * dd * cs, cy + DY[a.d] * dd * cs, s, a.d, !!k);
      }
      g.globalAlpha = 1;
    }
    // particles
    for (const p of parts) { g.globalAlpha = Math.max(0, p.life); g.fillStyle = p.col; g.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); }
    g.globalAlpha = 1;
    g.restore();
    if (flash > 0) { g.fillStyle = `rgba(181,154,255,${flash * 0.18})`; g.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt / 250); }
  }
  function bonkCurve(t) { return t < 0.35 ? easeOut(t / 0.35) : 1 - easeOut((t - 0.35) / 0.65) * 1; }
  function easeOut(t) { t = Math.min(1, Math.max(0, t)); return 1 - (1 - t) * (1 - t); }
  function easeBack(t) { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  function step(dt) {
    for (const a of anims) {
      if (a.type === 'bonk') {
        const before = a.t;
        a.t += dt / 380;
        if (before < 0.35 && a.t >= 0.35 && a.blocker) { a.blocker.wob = 1; const [bx, by] = cellXY(a.x + DX[a.d] * (a.reach + a.ext + 0.2), a.y + DY[a.d] * (a.reach + a.ext + 0.2)); spark(bx, by, '#B59AFF', 8); }
        if (a.t >= 1) a.dead = true;
      } else {
        a.v += dt * 0.07; a.dist += a.v * dt / 1000;
        const [cx, cy] = cellXY(a.x + DX[a.d] * a.dist, a.y + DY[a.d] * a.dist);
        if (!a.edged && (cx < ox || cy < oy || cx > ox + cs * L.cols || cy > oy + cs * L.rows)) { a.edged = true; spark(cx, cy, spooky ? '#ff8a1f' : '#C5FF49', 10); }
        if (cx < -cs || cy < -cs || cx > W + cs || cy > H + cs) a.dead = true;
      }
    }
    anims = anims.filter((a) => !a.dead);
    for (const p of parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 0.0009 * dt; p.life -= dt / p.ttl; }
    parts = parts.filter((p) => p.life > 0);
  }
  function spark(x, y, col, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 7, v = 0.05 + Math.random() * 0.2; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 0.08, s: 3 + Math.random() * 4, col, life: 1, ttl: 420 + Math.random() * 300 }); }
  }
  function burstConfetti() {
    const cols = ['#C5FF49', '#B59AFF', '#F5F3ED', spooky ? '#ff8a1f' : '#ffd84a'];
    for (let i = 0; i < 70; i++) parts.push({ x: W / 2 + (Math.random() - 0.5) * W * 0.6, y: H * 0.45, vx: (Math.random() - 0.5) * 0.5, vy: -0.25 - Math.random() * 0.45, s: 4 + Math.random() * 5, col: cols[i % 4], life: 1, ttl: 1100 + Math.random() * 700 });
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last); last = now;
    if (!paused) step(dt);
    draw(now, paused ? 0 : dt);
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- input
  function cellAt(e) {
    const r = cv.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - ox) / cs), y = Math.floor((e.clientY - r.top - oy) / cs);
    if (!L || x < 0 || y < 0 || x >= L.cols || y >= L.rows) return -1;
    return y * L.cols + x;
  }
  let hoverC = -1;
  cv.addEventListener('pointermove', (e) => {
    if (ui !== 'play' || e.pointerType === 'touch') return;
    const c = cellAt(e);
    if (c === hoverC) return;
    hoverC = c;
    const ic = c >= 0 && L.grid[c];
    cv.style.cursor = ic ? 'pointer' : 'default';
    if (ic) caption(ic.wall ? `<em>${esc(ic.name)}</em> · system file, never moves` : ic.locked && !L.keyGone ? `<em>${esc(ic.name)}</em> · locked until admin.key leaves` : `<em>${esc(ic.name)}</em> · points ${['up', 'right', 'down', 'left'][dirOf(ic, L.removed)]}${ic.spin ? ' (for now)' : ''}`);
  });
  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); if (ui !== 'play') return; const c = cellAt(e); cursor = -1; if (c >= 0) tap(c); });
  window.addEventListener('keydown', (e) => {
    if (ui === 'title' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); $('bPlay').click(); return; }
    if (ui !== 'play' || !L) return;
    if (e.key === 'Escape' || e.key === 'p') { setPause(!paused); return; }
    if (paused) return;
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (mv) {
      e.preventDefault();
      if (cursor < 0) cursor = Math.floor(L.rows / 2) * L.cols + Math.floor(L.cols / 2);
      const x = Math.min(L.cols - 1, Math.max(0, cursor % L.cols + mv[0])), y = Math.min(L.rows - 1, Math.max(0, Math.floor(cursor / L.cols) + mv[1]));
      cursor = y * L.cols + x;
    } else if ((e.key === 'Enter' || e.key === ' ') && cursor >= 0) { e.preventDefault(); tap(cursor); }
    else if (e.key === 'r') restart();
    else if (e.key === 'm') $('bMute').click();
  });

  // ---------------------------------------------------------------- screens + buttons
  function hideAll() { for (const id of ['title', 'levels', 'end', 'pause']) $(id).classList.remove('on'); }
  function toTitle() {
    hideAll(); ui = 'title'; L = null; paused = false; setGain();
    $('title').classList.add('on');
    $('bPlay').textContent = level > 0 ? `play · level ${level + 1}` : 'play';
    const done = store.get('daily2-' + dayNo(), null);
    $('bDaily').textContent = done ? `daily #${dayNo()} ✓` : `daily desktop #${dayNo()}`;
    $('bSpooky').classList.toggle('on', spooky);
    $('bSpooky').textContent = spooky ? '🎃 spooky mode: on' : 'spooky mode: off';
    caption('');
  }
  function restart() { if (!L) return; if (L.mode === 'daily') { toast('no take-backs on the daily.'); return; } startLevel(L.mode, L.idx); sfx.tap(); }
  function setPause(p) {
    if ((ui !== 'play' || (L && L.done)) && p) return;
    if (p === paused) return;
    paused = p; setGain();
    if (p) { L && (L.pausedAt = performance.now()); $('pause').classList.add('on'); }
    else { if (L && L.pausedAt) { L.start += performance.now() - L.pausedAt; L.pausedAt = 0; } $('pause').classList.remove('on'); }
  }
  function openLevels() {
    hideAll(); ui = 'levels';
    $('lvGrid').innerHTML = Array.from({ length: LEVELS }, (_, i) => {
      const open = i <= level, st = stars[i] || 0;
      const head = i % 10 === 0 ? `<div class="wh">world ${i / 10 + 1} · ${WORLDS[i / 10].name}</div>` : '';
      return head + `<button data-i="${i}" class="${open ? '' : 'lock'} ${i === level ? 'cur' : ''}">${i + 1}<small>${open ? '★'.repeat(st) + '·'.repeat(3 - st) : ''}</small></button>`;
    }).join('');
    $('levels').classList.add('on');
  }
  const on = (id, f) => $(id).addEventListener('click', f);
  on('bPlay', () => { audio(); sfx.tap(); startLevel('level', level); });
  on('bDaily', () => {
    audio(); sfx.tap();
    const done = store.get('daily2-' + dayNo(), null);
    if (done) { lastResult = done; hideAll(); showEnd(done); $('endMsg').innerHTML = 'you already did today\'s desktop. it\'s still clean. come back tomorrow.'; return; }
    if (store.get('daily2-started-' + dayNo(), 0)) { // left mid-attempt: the daily is one shot
      const r = { mode: 'daily', idx: 0, won: false, ms: 0, bonks: 0, total: 0, stars: 0, day: dayNo(), jammed: false };
      store.set('daily2-' + dayNo(), r); lastResult = r; hideAll(); showEnd(r); $('endMsg').innerHTML = 'you left today\'s desktop mid-clean. the daily is one shot. tomorrow.'; return;
    }
    startLevel('daily', 0);
    store.set('daily2-started-' + dayNo(), 1);
  });
  on('bLevels', () => { sfx.tap(); openLevels(); });
  on('bLvBack', () => { sfx.tap(); toTitle(); });
  $('lvGrid').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b.classList.contains('lock')) return; audio(); sfx.tap(); startLevel('level', +b.dataset.i); });
  on('bSpooky', () => { spooky = !spooky; store.set('spooky', spooky); sfx.tap(); toTitle(); });
  on('bNext', () => {
    audio(); sfx.tap();
    const r = lastResult;
    if (!r || r.mode === 'daily') { startLevel('level', level); return; }
    if (!r.won) { startLevel('level', r.idx); return; }
    startLevel('level', r.idx + 1 >= LEVELS ? 0 : r.idx + 1);
  });
  on('bShare', share);
  on('bEndMenu', () => { sfx.tap(); toTitle(); });
  on('bRestart', () => { $('bRestart').blur(); if (ui === 'play') restart(); });
  on('bMenu', () => { $('bMenu').blur(); sfx.tap(); toTitle(); });
  on('bResume', () => setPause(false));
  on('bMute', () => { $('bMute').blur(); muted = !muted; store.set('muted', muted); audio(); setGain(); updateMute(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && ui === 'play') setPause(true); });

  // player page hooks
  window.addEventListener('message', (e) => {
    const m = e.data; if (!m || typeof m !== 'object') return;
    if (m.type === 'cc-mute') { hostMuted = !!m.muted; setGain(); updateMute(); }
    else if (m.type === 'cc-restart') { if (L) restart(); else toTitle(); }
    else if (m.type === 'cc-pause') setPause(m.paused === undefined ? true : !!m.paused);
  });

  // test hooks (read-only + a solver for automated playtests)
  window.DJ = {
    ui: () => ui, level: () => (L ? { mode: L.mode, idx: L.idx, cols: L.cols, rows: L.rows, left: remaining(), lives: L.lives, bonks: L.bonks } : null),
    free: () => (L ? L.pieces.filter((pc) => !pc.gone && movable(pc, L.keyGone) && !block(L.grid, L.cols, L.rows, pc, dirOf(pc, L.removed)).k).map((pc) => pc.cells[0]) : []),
    blocked: () => (L ? L.pieces.filter((pc) => !pc.gone && movable(pc, L.keyGone) && block(L.grid, L.cols, L.rows, pc, dirOf(pc, L.removed)).k).map((pc) => pc.cells[0]) : []),
    // a move that keeps the level solvable (for automated tests)
    safe: () => { if (!L) return -1; for (const pc of L.pieces) { if (pc.gone || !movable(pc, L.keyGone) || block(L.grid, L.cols, L.rows, pc, dirOf(pc, L.removed)).k) continue; const g = L.grid.slice(); for (const c of pc.cells) g[c] = null; const rest = piecesOf(g).filter((q) => !q.wall); if (!rest.length) return pc.cells[0]; const sp = rest.map((q) => q.spin ? Object.assign(Object.create(q), { d: dirOf(q, L.removed + 1) }) : q); const g2 = g.map((q) => (q && q.spin ? sp[rest.indexOf(q)] : q)); if (solve(g2, L.cols, L.rows, 3000).ok) return pc.cells[0]; } return -1; },
    check: (i) => { const sp = i < 0 ? dailySpec() : levelSpec(i); return Object.assign(solve(sp.grid, sp.cols, sp.rows, 20000), { jam: jamRate(sp.grid, sp.cols, sp.rows, 7, 40) }); },
    kinds: () => (L ? L.pieces.reduce((m, pc) => { const k = pc.wall ? 'wall' : pc.win ? 'win' : pc.key ? 'key' : pc.locked ? 'locked' : 'icon'; m[k] = (m[k] || 0) + 1; return m; }, {}) : null),
    point: (c) => { const r = cv.getBoundingClientRect(); return { x: r.left + ox + (c % L.cols + 0.5) * cs, y: r.top + oy + (Math.floor(c / L.cols) + 0.5) * cs }; },
    card: () => (lastResult ? drawCard(lastResult).toDataURL('image/png') : null),
    spec: (i) => { const s = levelSpec(i); return { cols: s.cols, rows: s.rows, n: piecesOf(s.grid).filter((pc) => !pc.wall).length, e: +easiness(s.grid, s.cols, s.rows, 1).toFixed(3) }; },
  };

  updateMute();
  toTitle();
  layout();
  requestAnimationFrame(frame);
})();
