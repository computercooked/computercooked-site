/* crash test (daily) — view, input, daily/practice flow, stats, sharing. puzzle logic lives in core.js. */
(() => {
  'use strict';
  const CT = window.CT, N = CT.N;
  const SLUG = 'crash-test-daily', URL_TEXT = 'computercooked.com/games/' + SLUG, KEY = 'cc-crash-test-v1';
  const $ = (id) => document.getElementById(id);
  const cv = $('board'), ctx = cv.getContext('2d'), face = $('face'), fctx = face.getContext('2d');

  // ---------- storage ----------
  let DB = { results: {}, progress: {}, cache: {}, spooky: null, helped: false };
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.results) DB = Object.assign(DB, d); } catch (e) { /* fresh */ }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { /* storage blocked: play on */ } }
  const spookyOn = () => (DB.spooky === null || DB.spooky === undefined ? new Date().getMonth() === 9 : DB.spooky);

  // ---------- sdk ----------
  let ccEvents = 0;
  const cc = (fn, ...a) => { try { if (window.cc && typeof window.cc[fn] === 'function') return window.cc[fn](...a); } catch (e) { /* ignore */ } };
  const ccEvent = (n, d) => { if (ccEvents < 18) { ccEvents++; cc('event', n, d || {}); } };

  // ---------- audio ----------
  let ac = null, master = null, muted = false;
  function initAudio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.4; master.connect(ac.destination); } catch (e) { ac = null; }
  }
  function tone(f, dur, type, vol, f2, delay) {
    if (!ac || muted) return;
    const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  const sfx = {
    pick() { tone(520, 0.04, 'square', 0.04); },
    slide() { tone(220, 0.07, 'triangle', 0.09, 170); },
    bump() { tone(110, 0.05, 'square', 0.05); },
    undo() { tone(400, 0.08, 'triangle', 0.06, 260); },
    win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.16, 'square', 0.06, null, i * 0.08)); tone(90, 0.6, 'sawtooth', 0.04, 45, 0.1); },
    hint() { tone(880, 0.06, 'sine', 0.06); tone(1175, 0.1, 'sine', 0.06, null, 0.06); }
  };

  // ---------- puzzle generation (worker, with main-thread fallback) ----------
  let worker = null, reqId = 0; const pending = new Map();
  try {
    worker = new Worker('core.js');
    worker.onmessage = (e) => { const p = pending.get(e.data.id); if (p) { pending.delete(e.data.id); p(e.data); } };
    worker.onerror = () => { worker = null; for (const [, p] of pending) p(null); pending.clear(); };
  } catch (e) { worker = null; }
  function genRaw(seed, mode) {
    return new Promise((resolve) => {
      const local = () => setTimeout(() => {
        const P = CT.generate(seed, mode);
        resolve({ pieces: P.pieces, walls: P.walls, start: P.start, par: P.par, dist: P.dist });
      }, 30);
      if (!worker) return local();
      const id = ++reqId;
      pending.set(id, (d) => {
        if (!d) return local();
        const dist = new Map(); for (let i = 0; i < d.keys.length; i++) dist.set(d.keys[i], d.vals[i]);
        resolve({ pieces: d.pieces, walls: d.walls, start: d.start, par: d.par, dist });
      });
      worker.postMessage({ seed, mode, id });
    });
  }
  // returns {puzzle, distReady: Promise}
  function getPuzzle(seed, mode) {
    const ck = seed + '|' + mode, cached = DB.cache[ck];
    const full = genRaw(seed, mode).then((P) => {
      DB.cache[ck] = { pieces: P.pieces, walls: P.walls, start: P.start, par: P.par };
      const keys = Object.keys(DB.cache); if (keys.length > 12) delete DB.cache[keys[0]];
      persist(); return P;
    });
    if (cached) { const P = Object.assign({}, cached, { dist: null }); full.then((F) => { P.dist = F.dist; }); return Promise.resolve({ P, full }); }
    return full.then((P) => ({ P, full }));
  }

  // ---------- game state ----------
  const today = CT.todayNo();
  let mode = 'normal';       // tab: normal | hard | practice
  let G = null;              // the puzzle being played
  let say = $('say');
  const decode = (k, n) => { const st = []; for (let i = 0; i < n; i++) { st.push(k % 6); k = Math.floor(k / 6); } return st; };

  function pkey(no, gm) { return no + '|' + gm; }
  async function load(no, gm, practice, seedOverride) {
    $('loading').hidden = false;
    const seed = seedOverride || ('crash-test-' + no);
    const token = {}; loadToken = token;
    const { P, full } = await getPuzzle(seed, gm);
    if (loadToken !== token) return;
    $('loading').hidden = true;
    const key = seedOverride ? null : pkey(no, gm);
    const prog = key && !practice ? DB.progress[key] : null;
    const res = key ? DB.results[key] : null;
    G = {
      no, gm, practice, key, seed, P,
      st: P.start.slice(), keys: [CT.encode(P.start)], undos: 0,
      full, solved: false, solveT: 0, t0: performance.now(), started: false, sel: 0, kbRun: -1, hintT: 0, hint: null,
      locked: !practice && res && res.solved
    };
    if (prog && !G.locked) { G.keys = prog.keys.slice(); G.st = decode(G.keys[G.keys.length - 1], P.pieces.length); G.undos = prog.undos || 0; }
    if (G.locked) { G.keys = res.keys ? res.keys.slice() : [CT.encode(P.start)]; G.st = decode(res.endKey || 0, P.pieces.length); G.solved = true; G.solveT = 9; }
    anim = G.st.map((v) => v);
    updateUI();
    say.textContent = G.locked ? 'already fixed today. come back tomorrow. or practice.' : practice ? (seedOverride ? 'random practice board. par is ' + P.par + '. hints allowed.' : 'archive #' + no + (gm === 'hard' ? ' (hard)' : '') + '. par is ' + P.par + '.') : gm === 'hard' ? 'hard mode. more parts. screws don\'t move. good luck.' : 'crash is overheating. slide the parts. get the hot air out the vent →';
    if (G.locked) setTimeout(() => showResult(true), 300);
    // first-run hint goes in crash's own bubble, once the board exists (it used to be a toast on a fixed
    // timer from boot, which sat on top of the bubble at 375px and never fired if the board built late)
    if (!DB.helped && !G.locked) { const g = G; setTimeout(() => { if (G === g && movesCount() === 0 && $('modal').hidden) { say.textContent = 'drag a part to slide it. free the hot air →. tap ? for rules.'; say.classList.add('nudge'); } }, 1200); }
  }
  let loadToken = null;

  function saveProgress() {
    if (!G || G.practice || !G.key || G.solved) return;
    DB.progress[G.key] = { keys: G.keys, undos: G.undos };
    persist();
  }
  const movesCount = () => G.keys.length - 1;

  function commit(p, np, viaKb) {
    if (!G || G.solved) return;
    if (!G.started) { G.started = true; G.t0 = performance.now(); cc('start'); }
    const merge = viaKb && G.kbRun === p && G.keys.length > 1;
    G.st[p] = np;
    const k = CT.encode(G.st);
    if (merge) {
      G.keys[G.keys.length - 1] = k;
      if (G.keys.length > 1 && G.keys[G.keys.length - 2] === k) { G.keys.pop(); G.kbRun = -1; }
    } else G.keys.push(k);
    if (viaKb) G.kbRun = p; else G.kbRun = -1;
    sfx.slide();
    afterMove();
  }
  function afterMove() {
    quip();
    saveProgress(); updateUI();
    if (CT.isGoal(G.st)) solve();
  }
  function undo() {
    if (!G || G.solved || G.keys.length < 2) return;
    G.kbRun = -1;
    if (G.practice) { G.keys.pop(); }
    else { G.keys.push(G.keys[G.keys.length - 2]); G.undos++; toast('undo costs a move. time only goes forward.'); }
    G.st = decode(G.keys[G.keys.length - 1], G.P.pieces.length);
    sfx.undo(); afterMove();
  }
  function restart() {
    if (!G || G.solved) return;
    G.kbRun = -1;
    if (G.practice) G.keys = [CT.encode(G.P.start)];
    else { G.keys.push(CT.encode(G.P.start)); toast('restart costs a move too. the logs remember.'); }
    G.st = G.P.start.slice(); sfx.undo(); saveProgress(); updateUI();
  }
  function hint() {
    if (!G || !G.practice || G.solved) return;
    if (!G.P.dist) { toast('still thinking. try again in a sec.'); return; }
    const d0 = G.P.dist.get(CT.encode(G.st));
    const mv = CT.moves(G.P.pieces, G.P.walls, G.st);
    for (let j = 0; j < mv.length; j += 2) {
      const s2 = G.st.slice(); s2[mv[j]] = mv[j + 1];
      if (G.P.dist.get(CT.encode(s2)) === d0 - 1) { G.hint = { p: mv[j], to: mv[j + 1] }; G.hintT = 1.6; sfx.hint(); return; }
    }
  }

  const QUIPS = ['is it hot in here or is it me. it\'s me.', 'my fan is making a new noise.', 'that helped. probably.', 'i can smell my own ram.', 'keep going. i believe in you (i\'m at 94°c).', 'please don\'t touch the psu.', 'airflow is a social construct.', 'the vent is right there. →'];
  function quip() { say.classList.remove('nudge'); if (Math.random() < 0.35) say.textContent = QUIPS[(Math.random() * QUIPS.length) | 0]; }

  // ---------- solving ----------
  function solve() {
    G.solved = true; G.solveT = 0; sfx.win();
    say.textContent = 'ahh. airflow. i can feel my capacitors again.';
    const moves = movesCount(), ms = Math.round(performance.now() - G.t0);
    const over = moves - G.P.par;
    cc('end', { score: Math.max(1, 100 - 5 * Math.max(0, over)) + (G.gm === 'hard' ? 50 : 0), durationMs: ms, completed: true });
    ccEvent('solve', { mode: G.practice ? 'practice' : G.gm, over });
    if (G.key && !G.practice) {
      DB.results[G.key] = { moves, par: G.P.par, solved: true, onDay: G.no === CT.todayNo(), endKey: CT.encode(G.st), keys: G.keys, ms };
      delete DB.progress[G.key]; persist();
    } else if (G.key && G.practice && !DB.results[G.key]) {
      DB.results[G.key] = { moves, par: G.P.par, solved: true, onDay: false, endKey: CT.encode(G.st), keys: G.keys, ms };
      persist();
    }
    updateUI();
    setTimeout(() => showResult(false), 1100);
  }
  async function gridFor(keys) {
    if (!G.P.dist) G.P.dist = (await G.full).dist;
    let out = '';
    for (let i = 1; i < keys.length; i++) {
      const a = G.P.dist.get(keys[i - 1]), b = G.P.dist.get(keys[i]);
      out += b < a ? 'g' : b === a ? 'y' : 'r';
    }
    return out;
  }
  const EMO = { g: '🟩', y: '🟨', r: '🟥' };
  const rows = (g) => { let s = ''; for (let i = 0; i < g.length; i += 5) s += [...g.slice(i, i + 5)].map((c) => EMO[c]).join('') + '\n'; return s.trim(); };
  function rating(over) { return over <= 0 ? 'flawless repair' : over <= 2 ? 'clean fix' : over <= 5 ? 'duct tape' : over <= 9 ? 'percussive maintenance' : 'hit it until it worked'; }

  async function showResult(fromLock) {
    const res = G.key ? DB.results[G.key] : null;
    const keys = (fromLock && res && res.keys) ? res.keys : G.keys;
    const moves = keys.length - 1, par = G.P.par, over = moves - par;
    const grid = await gridFor(keys);
    const hard = G.gm === 'hard';
    const title = 'crash test #' + G.no + (hard ? ' (hard)' : '') + (G.practice ? ' · practice' : '');
    const text = `${title} 🔧 ${moves}/${par}${over <= 0 ? ' ⭐' : ''}\n${rows(grid)}\n${URL_TEXT}`;
    lastShare = { text, grid, moves, par, title, over };
    const cd = G.practice ? '' : `<div class="cd" id="cd"></div>`;
    modal(`<div class="tb"><span>${title}</span><button data-m="x">×</button></div><div class="in">
      <h2>${rating(over)}</h2>
      <p>fixed in <b>${moves}</b> moves. the fewest possible was <b>${par}</b>.</p>
      <div class="grid">${rows(grid).replace(/\n/g, '<br>')}</div>
      <p style="color:var(--dim);font-size:11px">🟩 got closer · 🟨 sideways · 🟥 made it worse</p>
      ${cd}
      <div class="acts"><button class="btn alt" data-m="share">share</button><button class="btn ghost2" data-m="stats">stats</button></div>
      ${!G.practice && !hard ? '<div class="acts"><button class="btn" data-m="hard">try today\'s hard one</button></div>' : ''}
      ${G.practice ? '<div class="acts"><button class="btn" data-m="rand">another random board</button></div>' : ''}
    </div>`, '', {
      share, stats: () => showStats(), hard: () => setMode('hard'), rand: () => playRandom(), x: closeModal
    });
    tickCountdown();
  }
  function tickCountdown() {
    const el = $('cd'); if (!el) return;
    const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const s = Math.max(0, Math.floor((next - now) / 1000));
    el.textContent = 'next meltdown in ' + String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    setTimeout(tickCountdown, 1000);
  }

  // ---------- share ----------
  let lastShare = null;
  function shareCard() {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
    const g = c.getContext('2d'), F = 'ui-monospace,Menlo,Consolas,monospace', s = lastShare;
    g.fillStyle = '#101114'; g.fillRect(0, 0, 1080, 1080);
    g.strokeStyle = '#C5FF49'; g.lineWidth = 10; g.strokeRect(40, 40, 1000, 1000);
    g.fillStyle = '#C5FF49'; g.fillRect(40, 40, 1000, 90);
    g.fillStyle = '#101114'; g.font = 'bold 44px ' + F; g.fillText(s.title, 80, 102);
    g.fillStyle = '#F5F3ED'; g.font = 'bold 150px ' + F; g.fillText(s.moves + '/' + s.par, 80, 300);
    g.font = 'bold 50px ' + F; g.fillStyle = '#B59AFF'; g.fillText(rating(s.over), 86, 380);
    const COL = { g: '#6aaa64', y: '#c9b458', r: '#FF5C7A' };
    const sz = 84, gap = 14, per = 10;
    [...s.grid].forEach((ch, i) => {
      const x = 86 + (i % per) * (sz + gap), y = 440 + Math.floor(i / per) * (sz + gap);
      if (y > 860) return;
      g.fillStyle = COL[ch]; g.fillRect(x, y, sz, sz);
    });
    g.font = 'bold 36px ' + F; g.fillStyle = '#C5FF49'; g.fillText(URL_TEXT, 86, 1000);
    return c;
  }
  async function share() {
    ccEvent('share');
    const text = lastShare.text;
    try {
      const blob = await new Promise((r) => shareCard().toBlob(r, 'image/png'));
      const file = blob && new File([blob], 'crash-test.png', { type: 'image/png' });
      if (navigator.share && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) {
        if (file && navigator.canShare && navigator.canShare({ files: [file], text })) { await navigator.share({ files: [file], text }); return; }
        await navigator.share({ text }); return;
      }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    // desktop: the text grid is what people paste into group chats
    try { await navigator.clipboard.writeText(text); toast('copied the grid. go flex.'); } catch (e) { toast('couldn\'t copy. screenshot it.'); }
  }

  // ---------- stats ----------
  function statsFor(gm) {
    const rs = Object.entries(DB.results).filter(([k, r]) => k.endsWith('|' + gm) && r.onDay).map(([k, r]) => Object.assign({ no: +k.split('|')[0] }, r));
    const solvedDays = new Set(rs.map((r) => r.no));
    let cur = 0; for (let d = CT.todayNo(); ; d--) { if (solvedDays.has(d)) cur++; else if (d === CT.todayNo()) continue; else break; if (cur > 999) break; }
    let max = 0, run = 0; const days = [...solvedDays].sort((a, b) => a - b);
    days.forEach((d, i) => { run = i && days[i - 1] === d - 1 ? run + 1 : 1; max = Math.max(max, run); });
    const buckets = [0, 0, 0, 0, 0, 0];
    rs.forEach((r) => { const o = r.moves - r.par; buckets[o <= 0 ? 0 : o === 1 ? 1 : o === 2 ? 2 : o === 3 ? 3 : o <= 6 ? 4 : 5]++; });
    const perfect = rs.filter((r) => r.moves <= r.par).length;
    return { played: rs.length, perfect, cur, max, buckets, todayOver: DB.results[pkey(CT.todayNo(), gm)] ? DB.results[pkey(CT.todayNo(), gm)].moves - DB.results[pkey(CT.todayNo(), gm)].par : null };
  }
  function showStats(gm) {
    gm = gm || (G && !G.practice ? G.gm : 'normal');
    const s = statsFor(gm), mx = Math.max(1, ...s.buckets);
    const labels = ['par', '+1', '+2', '+3', '+4–6', '+7'];
    const hi = s.todayOver === null ? -1 : s.todayOver <= 0 ? 0 : s.todayOver <= 3 ? s.todayOver : s.todayOver <= 6 ? 4 : 5;
    modal(`<div class="tb"><span>stats</span><button data-m="x">×</button></div><div class="in">
      <div class="seg"><button class="btn ${gm === 'normal' ? '' : 'ghost2'}" data-m="sn">daily</button><button class="btn ${gm === 'hard' ? '' : 'ghost2'}" data-m="sh">hard</button></div>
      <div class="stats4"><div><b>${s.played}</b><span>played</span></div><div><b>${s.perfect}</b><span>at par</span></div><div><b>${s.cur}</b><span>streak</span></div><div><b>${s.max}</b><span>best streak</span></div></div>
      <div style="font-size:11px;color:var(--dim);margin-bottom:4px">moves over par</div>
      <div class="hist">${s.buckets.map((v, i) => `<div class="row"><span>${labels[i]}</span><i class="${i === hi ? 'me' : ''}" style="width:${Math.max(8, 100 * v / mx)}%">${v}</i></div>`).join('')}</div>
      <p style="color:var(--dim);font-size:11px;margin-top:10px">only puzzles solved on their own day count. practice is free.</p>
    </div>`, 'lilac', { x: closeModal, sn: () => showStats('normal'), sh: () => showStats('hard') });
  }

  // ---------- archive / practice ----------
  function showArchive(gm) {
    gm = gm || 'normal';
    const t = CT.todayNo(); let btns = '';
    for (let no = t; no >= 1; no--) {
      const r = DB.results[pkey(no, gm)];
      const cls = r ? (r.moves <= r.par ? 'perfect' : 'ok') : '';
      btns += `<button class="${cls}" data-m="p${no}">#${no}</button>`;
    }
    const handlers = { x: closeModal, an: () => showArchive('normal'), ah: () => showArchive('hard'), rand: () => { closeModal(); playRandom(); } };
    for (let no = 1; no <= t; no++) handlers['p' + no] = () => { closeModal(); playArchive(no, gm); };
    modal(`<div class="tb"><span>practice · archive</span><button data-m="x">×</button></div><div class="in">
      <p>replay any past puzzle. practice doesn't touch your streak, undo is free, and you get hints.</p>
      <div class="seg"><button class="btn ${gm === 'normal' ? '' : 'ghost2'}" data-m="an">daily</button><button class="btn ${gm === 'hard' ? '' : 'ghost2'}" data-m="ah">hard</button></div>
      <div class="acts" style="margin-top:0"><button class="btn alt" data-m="rand">random board</button></div>
      <div class="arch">${btns}</div>
      <p style="color:var(--dim);font-size:11px">green = solved at par.</p></div>`, 'lilac', handlers);
  }
  function setModeTabs(m) { for (const b of $('modes').children) b.classList.toggle('on', b.dataset.mode === m); }
  function playArchive(no, gm) { mode = 'practice'; setModeTabs('practice'); ccEvent('archive_play', { no }); load(no, gm, true); }
  function playRandom() { mode = 'practice'; setModeTabs('practice'); closeModal(); const seed = 'random-' + Date.now() + '-' + Math.random(); load(0, Math.random() < 0.3 ? 'hard' : 'normal', true, seed); }
  function setMode(m) {
    closeModal();
    if (m === 'practice') { showArchive(); return; }
    mode = m; setModeTabs(m); load(today, m, false);
  }
  $('modes').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { initAudio(); setMode(b.dataset.mode); } });

  // ---------- modal / toast ----------
  let handlers = {};
  function modal(html, cls, h) { const box = $('box'); box.className = 'box ' + (cls || ''); box.innerHTML = html; $('modal').hidden = false; handlers = h || {}; }
  function closeModal() { $('modal').hidden = true; handlers = {}; }
  $('box').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (b && handlers[b.dataset.m]) handlers[b.dataset.m](); });
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  function toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2200); }

  function help() {
    modal(`<div class="tb"><span>how to play</span><button data-m="x">×</button></div><div class="in">
      <h2>crash test</h2>
      <p>crash is overheating. <b>slide the parts</b> inside him so the <b style="color:#FF8A5C">hot air</b> can escape through the <b>vent →</b> on the right.</p>
      <p>parts only slide the way they point. screws (hard mode) don't move. dragging a part any distance = <b>1 move</b>.</p>
      <p>one new puzzle a day, the same for everyone. fewest moves wins. undo and restart <b>count as moves</b> on daily puzzles.</p>
      <p>your share grid: 🟩 a move that got closer to the fix · 🟨 sideways · 🟥 made it worse.</p>
      <p style="color:var(--dim);font-size:11px">keyboard: tab picks a part, arrows slide it, u = undo, r = restart.</p>
      <div class="acts"><button class="btn" data-m="x">fix crash</button></div></div>`, '', { x: () => { closeModal(); DB.helped = true; persist(); } });
  }
  $('bHelp').onclick = help;
  $('bStats').onclick = () => showStats();
  $('bArchive').onclick = () => showArchive();
  $('bUndo').onclick = undo; $('bReset').onclick = restart; $('bHint').onclick = hint;
  function applySpooky() { document.body.classList.toggle('spooky', spookyOn()); $('bSpooky').classList.toggle('on', spookyOn()); }
  $('bSpooky').onclick = () => { DB.spooky = !spookyOn(); persist(); applySpooky(); toast(spookyOn() ? 'spooky mode: there\'s a ghost in the machine.' : 'spooky mode off.'); };

  function updateUI() {
    $('pno').textContent = G.practice ? (G.no ? '#' + G.no : 'random') : '#' + G.no;
    $('moves').textContent = movesCount();
    const showPar = G.practice || G.solved;
    $('par').textContent = showPar ? G.P.par : '?'; $('par').classList.toggle('known', showPar);
    $('bUndo').disabled = G.solved || G.keys.length < 2; $('bReset').disabled = G.solved;
    $('bHint').hidden = !G.practice;
    for (const b of $('modes').children) {
      const m = b.dataset.mode; b.classList.toggle('done', m !== 'practice' && !!(DB.results[pkey(today, m)] || {}).solved);
    }
  }

  // ---------- board geometry + drawing ----------
  let S = 300, cell = 40, ox = 0, oy = 0, dpr = 1;
  function resize() {
    const wrap = $('boardWrap'), w = wrap.clientWidth, h = wrap.clientHeight - 12;
    S = Math.max(220, Math.min(w, h, 520)); dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.style.width = S + 'px'; cv.style.height = S + 'px'; cv.width = Math.round(S * dpr); cv.height = Math.round(S * dpr);
    cell = S / (N + 0.9); ox = cell * 0.3; oy = cell * 0.45;
  }
  window.addEventListener('resize', resize);

  const KCOL = { ram: '#B59AFF', cable: '#D8CBA6', chip: '#F5F3ED', fan: '#59D9C2', gpu: '#3A3D48', psu: '#C9B98F', drive: '#A9AFBF' };
  let anim = [], t = 0, drag = null;
  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function pieceRect(i, pos) {
    const p = G.P.pieces[i];
    const r = p.dir === 'h' ? p.line : pos, c = p.dir === 'h' ? pos : p.line;
    const w = p.dir === 'h' ? p.len : 1, h = p.dir === 'h' ? 1 : p.len;
    return { x: ox + c * cell, y: oy + r * cell, w: w * cell, h: h * cell };
  }
  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    const spooky = spookyOn();
    // crash's case
    rr(2, 2, S - 4, S - 4, 16); ctx.fillStyle = '#D8CBA6'; ctx.fill();
    rr(ox - 6, oy - 6, cell * N + 12, cell * N + 12, 10); ctx.fillStyle = spooky ? '#1d1426' : '#0d1a12'; ctx.fill();
    // traces
    ctx.strokeStyle = spooky ? 'rgba(255,138,61,.12)' : 'rgba(197,255,73,.12)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { ctx.moveTo(ox + i * cell, oy); ctx.lineTo(ox + i * cell, oy + N * cell); ctx.moveTo(ox, oy + i * cell); ctx.lineTo(ox + N * cell, oy + i * cell); }
    ctx.stroke();
    // label + vent
    ctx.fillStyle = '#7d7056'; ctx.font = 'bold ' + Math.round(cell * 0.22) + 'px ui-monospace,Menlo,Consolas,monospace'; ctx.textAlign = 'left';
    ctx.fillText(G ? 'crash · internal view' : '', ox, oy * 0.62);
    const vx = ox + N * cell + 4, vy = oy + CT.EXIT_ROW * cell;
    ctx.fillStyle = '#101114'; ctx.fillRect(vx, vy + 4, cell * 0.5, cell - 8);
    ctx.fillStyle = G && G.solved ? '#C5FF49' : '#FF5C7A';
    for (let k = 0; k < 4; k++) ctx.fillRect(vx + 3, vy + 9 + k * (cell - 18) / 3.2, cell * 0.5 - 6, 3);
    ctx.fillStyle = '#7d7056'; ctx.textAlign = 'center'; ctx.font = 'bold ' + Math.round(cell * 0.2) + 'px ui-monospace,Menlo,Consolas,monospace';
    ctx.fillText('vent', vx + cell * 0.25, vy - 4);
    if (!G) return;
    // screws
    for (const w of G.P.walls) {
      const x = ox + (w % N) * cell + cell / 2, y = oy + Math.floor(w / N) * cell + cell / 2;
      ctx.fillStyle = '#5a5e6b'; ctx.beginPath(); ctx.arc(x, y, cell * 0.3, 0, 7); ctx.fill();
      ctx.strokeStyle = '#202228'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x - cell * 0.15, y - cell * 0.15); ctx.lineTo(x + cell * 0.15, y + cell * 0.15); ctx.moveTo(x + cell * 0.15, y - cell * 0.15); ctx.lineTo(x - cell * 0.15, y + cell * 0.15); ctx.stroke();
    }
    // hint ghost
    if (G.hint && G.hintT > 0) {
      const R = pieceRect(G.hint.p, G.hint.to);
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 10); rr(R.x + 3, R.y + 3, R.w - 6, R.h - 6, 8); ctx.strokeStyle = '#C5FF49'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // pieces
    G.P.pieces.forEach((p, i) => {
      let pos = anim[i];
      if (i === 0 && G.solved) pos += Math.min(3, G.solveT * 4);
      const R = pieceRect(i, pos), pad = 3;
      ctx.save();
      if (i === 0 && G.solved) { ctx.beginPath(); ctx.rect(ox - 6, 0, N * cell + 6 + cell * 0.55, S); ctx.clip(); }
      if (i === 0) {
        if (spooky) {
          rr(R.x + pad, R.y + pad, R.w - pad * 2, R.h - pad * 2, cell * 0.4); ctx.fillStyle = '#F5F3ED';
          if (!G.solved) { ctx.shadowColor = '#FF8A3D'; ctx.shadowBlur = 14 + 6 * Math.sin(t * 5); }
          ctx.fill(); ctx.shadowBlur = 0; ctx.strokeStyle = '#FF8A3D'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#101114';
          ctx.beginPath(); ctx.ellipse(R.x + R.w * 0.62, R.y + R.h * 0.42, cell * 0.08, cell * 0.13, 0, 0, 7); ctx.ellipse(R.x + R.w * 0.8, R.y + R.h * 0.42, cell * 0.08, cell * 0.13, 0, 0, 7); ctx.fill();
          ctx.beginPath(); ctx.ellipse(R.x + R.w * 0.71, R.y + R.h * 0.7, cell * 0.07, cell * 0.09, 0, 0, 7); ctx.fill();
        } else {
          const gr = ctx.createLinearGradient(R.x, 0, R.x + R.w, 0); gr.addColorStop(0, '#FF5C7A'); gr.addColorStop(1, '#FFB03A');
          rr(R.x + pad, R.y + pad, R.w - pad * 2, R.h - pad * 2, 9); ctx.fillStyle = gr; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5;
          for (let k = 0; k < 3; k++) {
            ctx.beginPath(); const yy = R.y + R.h * (0.3 + k * 0.2);
            for (let xx = 0; xx <= R.w - 20; xx += 4) { const X = R.x + 10 + xx, Y = yy + Math.sin(xx * 0.18 + t * 6 + k) * 2.5; xx ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
            ctx.stroke();
          }
          if (!G.solved) { ctx.shadowColor = '#FF5C7A'; ctx.shadowBlur = 12 + 6 * Math.sin(t * 5); rr(R.x + pad, R.y + pad, R.w - pad * 2, R.h - pad * 2, 9); ctx.strokeStyle = 'rgba(255,92,122,.6)'; ctx.stroke(); ctx.shadowBlur = 0; }
        }
      } else {
        rr(R.x + pad, R.y + pad, R.w - pad * 2, R.h - pad * 2, 7); ctx.fillStyle = KCOL[p.kind] || '#ccc'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
        decorate(p, R);
      }
      if (G.sel === i && kbMode && !G.solved) { rr(R.x + 1, R.y + 1, R.w - 2, R.h - 2, 9); ctx.strokeStyle = '#C5FF49'; ctx.lineWidth = 3; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]); }
      ctx.restore();
    });
    if (G.solved) {
      ctx.fillStyle = 'rgba(197,255,73,' + Math.max(0, 0.25 - G.solveT * 0.1) + ')'; ctx.fillRect(ox - 6, oy - 6, cell * N + 12, cell * N + 12);
    }
  }
  function decorate(p, R) {
    const h = p.dir === 'h', L = h ? R.w : R.h;
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    if (p.kind === 'ram') { for (let k = 0; k < p.len * 2; k++) { const a = 10 + k * (L - 20) / (p.len * 2); h ? ctx.fillRect(R.x + a, R.y + R.h * 0.3, (L - 20) / (p.len * 2) - 4, R.h * 0.4) : ctx.fillRect(R.x + R.w * 0.3, R.y + a, R.w * 0.4, (L - 20) / (p.len * 2) - 4); } }
    else if (p.kind === 'cable') { ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 3; for (let k = 1; k < 4; k++) { ctx.beginPath(); if (h) { ctx.moveTo(R.x + 6, R.y + R.h * k / 4); ctx.lineTo(R.x + R.w - 6, R.y + R.h * k / 4); } else { ctx.moveTo(R.x + R.w * k / 4, R.y + 6); ctx.lineTo(R.x + R.w * k / 4, R.y + R.h - 6); } ctx.stroke(); } }
    else if (p.kind === 'chip') { ctx.fillStyle = '#101114'; ctx.fillRect(R.x + R.w * 0.25, R.y + R.h * 0.25, R.w * 0.5, R.h * 0.5); }
    else if (p.kind === 'fan' || p.kind === 'gpu') {
      const n = p.kind === 'gpu' ? p.len : 1;
      for (let k = 0; k < n; k++) {
        const cx = h ? R.x + (k + 0.5) * R.w / n : R.x + R.w / 2, cy = h ? R.y + R.h / 2 : R.y + (k + 0.5) * R.h / n;
        ctx.strokeStyle = p.kind === 'gpu' ? '#C5FF49' : 'rgba(0,0,0,.4)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(cx, cy, cell * 0.28, 0, 7); ctx.stroke();
        for (let b = 0; b < 3; b++) { const a = t * 3 + b * 2.1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * cell * 0.24, cy + Math.sin(a) * cell * 0.24); ctx.stroke(); }
      }
    } else if (p.kind === 'psu') { ctx.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 0; k < 6; k++) h ? ctx.fillRect(R.x + 10 + k * (R.w - 20) / 6, R.y + 8, 3, R.h - 16) : ctx.fillRect(R.x + 8, R.y + 10 + k * (R.h - 20) / 6, R.w - 16, 3); }
    else if (p.kind === 'drive') { ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.arc(h ? R.x + R.w * 0.3 : R.x + R.w / 2, h ? R.y + R.h / 2 : R.y + R.h * 0.3, cell * 0.25, 0, 7); ctx.fill(); }
  }
  // crash's face: cooked while overheating, calm when fixed
  const crashImg = new Image(); crashImg.src = 'crash.png';
  function drawFace() {
    fctx.imageSmoothingEnabled = false; fctx.clearRect(0, 0, 64, 64);
    const frame = G && G.solved ? 0 : 2;
    if (crashImg.complete && crashImg.naturalWidth) fctx.drawImage(crashImg, frame * 128, 0, 128, 128, 0, 0, 64, 64);
  }

  // ---------- input ----------
  let kbMode = false;
  function cellAt(px, py) { const c = Math.floor((px - ox) / cell), r = Math.floor((py - oy) / cell); return r >= 0 && r < N && c >= 0 && c < N ? r * N + c : -1; }
  function range(i) {
    const g = CT.occupancy(G.P.pieces, G.P.walls, G.st), p = G.P.pieces[i], s0 = G.st[i];
    const cellOf = (a) => (p.dir === 'h' ? p.line * N + a : a * N + p.line);
    let lo = s0, hi = s0;
    while (lo - 1 >= 0 && g[cellOf(lo - 1)] === -1) lo--;
    while (hi + p.len < N && g[cellOf(hi + p.len)] === -1) hi++;
    return [lo, hi];
  }
  cv.addEventListener('pointerdown', (e) => {
    initAudio(); kbMode = false;
    if (!G || G.solved) return;
    const r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
    const c = cellAt(px, py); if (c < 0) return;
    const g = CT.occupancy(G.P.pieces, G.P.walls, G.st), i = g[c];
    if (i < 0 || i === 99) return;
    e.preventDefault(); cv.setPointerCapture(e.pointerId);
    const p = G.P.pieces[i];
    G.sel = i;
    drag = { i, axis0: p.dir === 'h' ? px : py, pos0: G.st[i], range: range(i), moved: false };
    sfx.pick();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = cv.getBoundingClientRect(), p = G.P.pieces[drag.i];
    const a = p.dir === 'h' ? e.clientX - r.left : e.clientY - r.top;
    const f = drag.pos0 + (a - drag.axis0) / cell;
    const cl = Math.max(drag.range[0], Math.min(drag.range[1], f));
    if (Math.abs(f - cl) > 0.15 && !drag.bumped) { drag.bumped = true; sfx.bump(); }
    if (Math.abs(f - cl) < 0.05) drag.bumped = false;
    anim[drag.i] = cl;
  });
  const endDrag = () => {
    if (!drag) return;
    const np = Math.round(anim[drag.i]), i = drag.i; drag = null;
    if (np !== G.st[i]) commit(i, np, false);
  };
  cv.addEventListener('pointerup', endDrag); cv.addEventListener('pointercancel', endDrag);

  window.addEventListener('keydown', (e) => {
    initAudio();
    if (!$('modal').hidden) { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); (handlers.x || closeModal)(); } return; }
    if (!G || G.solved) return;
    if (e.key === 'Tab') {
      e.preventDefault(); kbMode = true;
      const n = G.P.pieces.length; G.sel = (G.sel + (e.shiftKey ? n - 1 : 1)) % n; G.kbRun = -1; sfx.pick(); return;
    }
    const d = { ArrowLeft: [-1, 'h'], ArrowRight: [1, 'h'], ArrowUp: [-1, 'v'], ArrowDown: [1, 'v'] }[e.key];
    if (d) {
      e.preventDefault(); kbMode = true;
      const p = G.P.pieces[G.sel];
      if (p.dir !== d[1]) { sfx.bump(); return; }
      const [lo, hi] = range(G.sel), np = G.st[G.sel] + d[0];
      if (np < lo || np > hi) { sfx.bump(); return; }
      commit(G.sel, np, true); return;
    }
    if (e.key === 'u' || e.key === 'U' || ((e.ctrlKey || e.metaKey) && e.key === 'z')) undo();
    else if (e.key === 'r' || e.key === 'R') restart();
    else if (e.key === 'h' || e.key === 'H') hint();
  });
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || typeof d !== 'object') return;
    if (d.type === 'cc-mute') { muted = !!d.muted; if (master) master.gain.value = muted ? 0 : 0.4; }
    else if (d.type === 'cc-restart') { closeModal(); if (G && !G.solved) restart(); }
    else if (d.type === 'cc-pause') { /* turn-based puzzle: nothing ticks, nothing to pause */ }
  });

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (G) {
      for (let i = 0; i < anim.length; i++) if (!drag || drag.i !== i) anim[i] += (G.st[i] - anim[i]) * Math.min(1, dt * 18);
      if (G.solved) G.solveT += dt;
      if (G.hintT > 0) G.hintT -= dt;
    }
    draw(); drawFace();
    requestAnimationFrame(frame);
  }

  // ---------- boot ----------
  applySpooky();
  resize();
  load(today, 'normal', false);
  if (/[?&]debug/.test(location.search)) window.__ct = { get G() { return G; }, commit, undo, solve, CT, DB: () => DB };
  requestAnimationFrame(frame);
})();
