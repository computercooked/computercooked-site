/* cooked sweeper (minesweeper.exe has a virus) — computer cooked games.
   Tap a tile to reveal it. Numbers are the TOTAL power of the viruses touching that tile.
   A virus is a fight: lose hp equal to its power, gain the same in xp (popups are free: 0 hp, 1 xp). Spend xp to level up (full heal, +1 max hp).
   Beaten viruses drop ram (heal) or a scan (shows a clean tile). Beat KERNEL PANIC (13) to win. 0 hp = bluescreen.
   Right-click / long-press / flag mode flags a tile with a guessed power. Keys: arrows move, space/enter reveal, f or 1-9 flag,
   l level up, n new run, d today's disk, m mute. The rules live in core.js. */
(function () {
  "use strict";
  const CS = window.CS;
  // ---------- platform sdk: optional, every call guarded ----------
  const sdk = (fn) => { try { if (window.cc) return fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  let evCount = 0;
  const ccEvent = (n, d) => { if (evCount < 18) { evCount++; sdk((c) => c.event && c.event(n, d || {})); } };
  const reduce = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const $ = (id) => document.getElementById(id);
  const store = {
    get(k, d) { try { const v = localStorage.getItem("cc-cooked-sweeper:" + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("cc-cooked-sweeper:" + k, JSON.stringify(v)); } catch (e) {} },
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- pixel sprites (10x10, drawn by hand) ----------
  const PAL = { k: "#120c08", W: "#fffaf0", w: "#c9c2ad", R: "#e5302a", r: "#8e1a14", G: "#5fbf3a", g: "#2f7a1c", B: "#3d6be0", b: "#203f94", Y: "#f6d84a", y: "#b8941c",
    P: "#a35ce0", p: "#5a2a8a", O: "#ff8a2a", o: "#b0501a", S: "#9a9a9a", s: "#555", L: "#a8d533", C: "#57c7e0", E: "#ff2a2a", T: "#d8b25a", K: "#2a2d33" };
  const ART = {
    popup: ["kkkkkkkkkk", "kBBBBBBkRk", "kkkkkkkkkk", "kWWWWWWWWk", "kWYYYYYYWk", "kWWWWWWWWk", "kWYYYYWWWk", "kWWWWWWWWk", "kWWGGGGWWk", "kkkkkkkkkk"],
    adware: ["..........", "kkkkkkkkkk", "kOOOOOOOOk", "kOWWOWWOOk", "kOWOWOWOWk", "kOWWWOWOWk", "kOWOWOWWOk", "kOOOOOOOOk", "kkkkkkkkkk", "...kk....."],
    worm: ["..........", "......kk..", ".....kGGk.", ".....kGEk.", "..kk.kGGk.", ".kGGkkGgk.", "kGgGGGGk..", "kGGgGgk...", ".kkkkk....", ".........."],
    keylogger: ["..........", ".kkkkkkkk.", "kSSSSSSSSk", "kSWWWWWWsk", "kSWkEEkWsk", "kSWWWWWWsk", "kSSSSSSSsk", "kssssssssk", ".kkkkkkkk.", ".........."],
    trojan: ["...kk.kk..", "..kRRkRRk.", "...kRRk...", "kkkkkkkkkk", "kYYYRRYYYk", "kYEYRRYEYk", "kYYYRRYYYk", "kyyyRRyyyk", "kyyyRRyyyk", "kkkkkkkkkk"],
    spyware: ["..........", "...kkkk...", ".kkWWWWkk.", "kWWWCCWWWk", "kWWCkkCWWk", "kWWCkkCWWk", "kWWWCCWWWk", ".kkWWWWkk.", "...kkkk...", ".........."],
    rootkit: ["...kkkk...", "..kPPPPk..", ".kPEPPEPk.", ".kPPPPPPk.", ".kPkPPkPk.", "..kPPPPk..", "..kpkkpk..", ".kp.kk.pk.", "kp..kp..pk", "k...k....k"],
    ransomware: ["...kkkk...", "..kSkkSk..", "..kSk.kSk.", "..kSk.kSk.", "kkkkkkkkkk", "kYYYkkYYYk", "kYYkEEkYYk", "kYYYkkYYYk", "kyyyyyyyyk", "kkkkkkkkkk"],
    botnet: ["k.......k.", ".k.....k..", "kkkkkkkkkk", "kSSSSSSSSk", "kSEkSSEkSk", "kSSSSSSSSk", "kSkkkkkkSk", "kSSSSSSSSk", "kkkkkkkkkk", ".kk....kk."],
    kernel: ["..kkkkkk..", ".kWWWWWWk.", "kWWWWWWWWk", "kWkkWWkkWk", "kWkEWWEkWk", "kWWWkkWWWk", ".kWWWWWWk.", "..kWkWkWk.", "..kkkkkkk.", "...R.R.R.."],
    ram: ["..........", "..........", "kkkkkkkkkk", "kgGKGKGKgk", "kGGGGGGGGk", "kgKGKGKGgk", "kkkkkkkkkk", ".kYkYkYkY.", "..........", ".........."],
    scan: ["..........", "..kkkk....", ".kCCCCk...", "kCWCCCCk..", "kCCCCCCk..", "kCCCCCCk..", ".kCCCCk...", "..kkkkkk..", "......kkk.", ".......kk."],
  };
  // sprites become tiny svg data urls: plain strings, no canvas readback (that stalled the gpu on slow phones)
  const SPR = {};
  for (const k in ART) {
    let r = "";
    ART[k].forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== ".") r += '<rect x="' + i + '" y="' + j + '" width="1" height="1" fill="' + PAL[ch] + '"/>'; } });
    SPR[k] = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10" shape-rendering="crispEdges">' + r + "</svg>");
  }
  const sheet = document.createElement("style");
  sheet.textContent = Object.keys(SPR).map((k) => ".sp-" + k + "{background-image:url(\"" + SPR[k] + "\")}").join("");
  document.head.appendChild(sheet);
  $("ico").src = SPR.kernel;

  // ---------- the mascot: the computer cooked computer, where the smiley button used to be ----------
  const CASE = "#e6d596", SIDE = "#a6975d", DEEP = "#554e2c", INK = "#0b0c0e", LIME = "#a8d533", LIME2 = "#dcff7a";
  const mg = $("mascot").getContext("2d");
  let mood = "happy", moodT = 0;
  function drawMascot(g, m, t) {
    g.clearRect(0, 0, 24, 24);
    const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    const melt = m === "melt";
    const sag = melt ? Math.min(3, Math.floor(t * 2)) : 0;
    // case
    r(2, 2 + sag, 19, 15, INK); r(3, 3 + sag, 17, 13, CASE); r(19, 3 + sag, 1, 13, SIDE); r(3, 15 + sag, 17, 1, SIDE);
    // screen
    r(5, 5 + sag, 13, 9, INK);
    // base
    r(6, 18, 11, 1, INK); r(4, 19, 15, 3, INK); r(5, 19, 13, 2, CASE); r(5, 21, 13, 0.5, SIDE); r(7, 20, 4, 1, DEEP); r(14, 20, 1, 1, LIME);
    const f = (x, y, c) => r(5 + x, 5 + sag + y, 1, 1, c || LIME);
    const nervous = m === "nervous";
    const jit = nervous && Math.sin(t * 30) > 0.6 ? 1 : 0;
    if (m === "happy") { f(2, 2); f(3, 1); f(4, 2); f(8, 2); f(9, 1); f(10, 2); f(3, 5); f(4, 6); f(5, 6); f(6, 6); f(7, 6); f(8, 6); f(9, 5); }
    else if (m === "ouch") { f(2, 1); f(3, 2); f(2, 3); f(10, 1); f(9, 2); f(10, 3); f(5, 5); f(6, 5); f(7, 5); f(5, 6); f(7, 6); f(5, 7); f(6, 7); f(7, 7); }
    else if (nervous) {
      f(2, 1 + jit); f(3, 1 + jit); f(2, 2 + jit); f(3, 2 + jit, LIME2); f(9, 1 + jit); f(10, 1 + jit); f(9, 2 + jit, LIME2); f(10, 2 + jit);
      f(3, 6); f(4, 5); f(5, 6); f(6, 5); f(7, 6); f(8, 5); f(9, 6);
      const d = Math.floor(t * 6) % 5; r(20, 4 + d + sag, 2, 2, "#7fd8ff"); // sweat
    } else if (m === "cool") {
      r(6, 6, 11, 1, LIME); r(6, 7, 4, 2, LIME); r(11, 7, 4, 2, LIME); r(7, 7, 2, 1, INK); r(12, 7, 2, 1, INK); r(10, 6, 1, 1, LIME);
      f(4, 6); f(5, 6); f(6, 6); f(7, 6); f(8, 5); f(9, 5); // smirk
      if (Math.floor(t * 2) % 4 === 0) r(8, 7, 1, 1, "#fff");
    } else if (melt) {
      f(2, 1); f(4, 1); f(3, 2); f(2, 3); f(4, 3); f(8, 1); f(10, 1); f(9, 2); f(8, 3); f(10, 3);
      f(4, 6); f(5, 5); f(6, 5); f(7, 5); f(8, 6);
    }
    // slime drips off the bottom of the screen (the brand look); a melt pours
    const drips = melt ? [[3, 4 + Math.floor(t * 5) % 7], [6, 2 + Math.floor(t * 4) % 9], [9, 3 + Math.floor(t * 6) % 6], [12, 1 + Math.floor(t * 3) % 8]] : [[4, nervous ? 2 : 1], [8, 2], [11, 1]];
    for (const [x, len] of drips) { r(5 + x - 1, 13 + sag, 1, Math.min(len, 10 - sag), LIME); if (melt) r(5 + x - 1, 13 + sag + len, 1, 1, LIME2); }
    if (melt) { r(3, 22, 18, 2, LIME); r(1, 23, 22, 1, "#7fa82a"); }
    // steam off the top when it's hot
    if (m === "nervous" || melt) { g.globalAlpha = 0.7; for (let i = 0; i < 3; i++) { const y = ((t * 8 + i * 3) % 4); r(7 + i * 4 + (Math.sin(t * 5 + i) > 0 ? 1 : 0), 1 - y + sag, 1, 1, "#fff"); } g.globalAlpha = 1; }
  }
  // the face button grows and shakes when the computer is nervous or melting, so it reads mid-fight
  function setMood(m, ms) { mood = m; moodT = ms ? ms / 1000 : 0; const f = $("face"); if (f) f.dataset.mood = m; }

  // ---------- sound: tiny web audio, same chiptune family as the other games ----------
  let actx = null, master = null, muted = store.get("muted", false), paused = false;
  const muteBtn = $("mute");
  function syncMute() { muteBtn.textContent = muted ? "♪ off" : "♪ on"; muteBtn.setAttribute("aria-pressed", muted ? "true" : "false"); if (master) master.gain.value = muted ? 0 : 0.9; }
  syncMute();
  function setMuted(m) { muted = m; store.set("muted", muted); syncMute(); }
  muteBtn.addEventListener("click", (e) => { e.stopPropagation(); setMuted(!muted); });
  function ac() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); master = actx.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(actx.destination); } catch (e) { actx = null; }
    }
    if (actx && actx.state === "suspended") actx.resume();
    return actx;
  }
  function tone(freq, dur, type, vol, slide, when) {
    if (muted || !ac()) return;
    try {
      const o = actx.createOscillator(), g = actx.createGain(), t = (when || actx.currentTime);
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  let noiseBuf = null;
  function noise(dur, vol, hp, when) {
    if (muted || !ac()) return;
    try {
      if (!noiseBuf) { noiseBuf = actx.createBuffer(1, actx.sampleRate * 0.5, actx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain(), t = when || actx.currentTime;
      s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp || 1200;
      g.gain.setValueAtTime(vol || 0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const sfx = {
    pop: (k) => tone(520 + Math.min(k, 14) * 70, 0.05, "square", 0.035),
    cascade: (n) => { if (!ac()) return; const t = actx.currentTime; for (let i = 0; i < Math.min(8, 2 + (n >> 2)); i++) tone(660 * Math.pow(1.122, i), 0.06, "square", 0.03, 0, t + i * 0.035); },
    hit: (p) => { tone(220 - p * 9, 0.28, "sawtooth", 0.07, 50); noise(0.16, 0.05, 900); },
    xp: () => { tone(1320, 0.06, "square", 0.035); setTimeout(() => tone(1760, 0.08, "square", 0.035), 60); },
    level: () => { if (!ac()) return; const t = actx.currentTime; [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.1, "square", 0.045, 0, t + i * 0.07)); },
    ram: () => { tone(300, 0.12, "triangle", 0.07, 900); setTimeout(() => tone(900, 0.1, "triangle", 0.05), 90); },
    scan: () => tone(400, 0.35, "sine", 0.06, 2400),
    flag: () => tone(1800, 0.03, "square", 0.03),
    no: () => tone(140, 0.12, "square", 0.05),
    boss: () => { tone(80, 0.7, "sawtooth", 0.09, 40); noise(0.5, 0.06, 300); },
    bsod: () => { tone(440, 0.9, "sawtooth", 0.08, 55); noise(0.9, 0.05, 200); },
    win: () => { if (!ac()) return; const t = actx.currentTime; [784, 988, 1175, 1568, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.13, "square", 0.05, 0, t + i * 0.1)); },
  };
  // the quiet loop: a little bass arp, faster and more sour as the hp drops
  let loopOn = false, step = 0, nextT = 0;
  const ROOT = [110, 110, 131, 98], SOUR = [116.5, 110, 123.5, 104];
  function loopTick() {
    if (!loopOn || muted || paused || !actx || document.hidden) return;
    const h = heat();
    const bpm = 92 + h * 60, dt = 60 / bpm / 2;
    while (nextT < actx.currentTime + 0.12) {
      if (nextT < actx.currentTime) nextT = actx.currentTime + 0.01;
      const bar = (step >> 3) % 4, s = step % 8;
      const root = (h > 0.6 && s % 2 ? SOUR : ROOT)[bar];
      const arp = [1, 1.5, 2, 1.5, 1.2, 1.5, 2, 2.4][s];
      tone(root * (s === 0 ? 1 : arp), dt * 0.9, s === 0 ? "triangle" : "square", s === 0 ? 0.03 : 0.011, 0, nextT);
      if (h > 0.45 && s % 2 === 0) noise(0.03, 0.012 + h * 0.012, 6000, nextT);
      if (h > 0.75 && s === 4) tone(1760, 0.05, "square", 0.012, 0, nextT);
      nextT += dt; step++;
    }
  }
  setInterval(loopTick, 50);

  // ---------- state ----------
  const board = $("board"), win = $("win"), app = $("app");
  let mode = "endless", run = null, tiles = [], startAt = 0, endAt = 0, started = false, cursor = -1, ended = false;
  let confirmFight = { i: -1, t: 0 }, pickerFor = -1;
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  const heat = () => (run ? Math.max(0, Math.min(1, 1 - run.hp / run.max)) : 0);
  const portrait = () => window.innerWidth < window.innerHeight * 0.95;

  function dims() {
    // today's disk is 8x10 for everyone, so every phone and desktop gets the same board
    if (mode === "daily") return { cols: 8, rows: 10 };
    return portrait() ? { cols: 8, rows: 10 } : { cols: 10, rows: 10 };
  }

  function newRun(m) {
    if (m) mode = m;
    if (run && started && !ended) finish(false, true);
    const d = dims();
    const seed = mode === "daily" ? "disk-" + today() : "r" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    run = CS.newRun({ cols: d.cols, rows: d.rows, seed, daily: mode === "daily" });
    started = false; ended = false; startAt = 0; cursor = -1; confirmFight = { i: -1, t: 0 };
    $("m-endless").setAttribute("aria-pressed", mode === "endless" ? "true" : "false");
    $("m-daily").setAttribute("aria-pressed", mode === "daily" ? "true" : "false");
    $("m-toggle").textContent = mode === "daily" ? "endless" : "today's disk";
    $("ttl").textContent = mode === "daily" ? "today's infected disk · " + today() : "minesweeper.exe has a virus";
    $("bsod").hidden = true; $("receipt").hidden = true; closePicker();
    build();
    render();
    setMood("happy");
    if (mode === "daily") {
      // the same board and the same first tap for everyone: the boot sector is already recovered
      const start = dailyStart(d.cols, d.rows);
      CS.generate(run, start);
      render();
      const att = store.get("daily", {});
      begin();
      apply(CS.reveal(run, start), start);
      quip("today's disk: same board for everyone." + (att.date === today() && att.tries ? " attempt " + (att.tries + 1) + "." : " boot sector recovered."), "good");
    } else {
      quip(store.get("runs", 0) ? "tap any tile. numbers = total virus power touching it." : "tap any tile to boot. numbers = total virus power nearby. popups are free xp.");
      if (!store.get("rules", false)) showRules();
    }
    hud();
  }
  function dailyStart(cols, rows) {
    const r = CS.mulberry32(CS.hashStr("start-" + today()));
    const x = 2 + ((r() * (cols - 4)) | 0), y = 3 + ((r() * (rows - 6)) | 0);
    return y * cols + x;
  }

  function build() {
    board.style.setProperty("--cols", run.cols);
    board.innerHTML = "";
    tiles = [];
    const frag = document.createDocumentFragment();
    for (let i = 0; i < run.cells.length; i++) {
      const el = document.createElement("div");
      el.className = "c h"; el.dataset.i = i; el.setAttribute("role", "gridcell");
      frag.appendChild(el); tiles.push(el);
    }
    board.appendChild(frag);
    layout();
  }

  function layout() {
    if (!run) return;
    const W = window.innerWidth, H = window.innerHeight;
    document.body.classList.toggle("short", H < 470);
    // the window's chrome (title, hud, status) measured, so the board takes whatever is left; the board sets the width
    const chromeH = win.offsetHeight - board.offsetHeight;
    const t = Math.floor(Math.max(18, Math.min(64, (W - 22) / run.cols, (H - chromeH - 10) / run.rows)));
    document.documentElement.style.setProperty("--t", t + "px");
    win.style.width = t * run.cols + 6 + 10 + "px";
    win.style.visibility = "visible";
  }
  window.addEventListener("resize", () => {
    layout();
    // an untouched endless board follows the phone's rotation
    if (run && !started && mode === "endless") { const d = dims(); if (d.cols !== run.cols) newRun(); }
  });

  // ---------- drawing the board ----------
  function numClass(n) { return n >= 15 ? "nX" : "n" + n; }
  function paint(i, fresh) {
    const c = run.cells[i], el = tiles[i];
    let cls = "c", html = "";
    if (!c.open && c.seen) {
      cls += " h seen";
      html = '<span class="s sp-popup"></span><span class="pw">1</span>';
    } else if (!c.open) {
      cls += " h";
      if (c.flag) html = '<span class="fl">' + (c.flag === 13 ? "K" : c.flag) + "</span>";
    } else if (c.v) {
      const V = CS.VIRUSES[c.v];
      cls += " o v" + (c.v === CS.BOSS ? " boss" : "") + (fresh ? " fresh" : "") + (c.dead && !(run.over && !run.won && i === run.killedBy) ? "" : " alive");
      html = '<span class="s sp-' + V.id + '"></span><span class="pw">' + c.v + "</span>";
      if (c.drop && c.dead && !run.over) html += '<span class="dr sp-' + c.drop + '"></span>';
    } else {
      cls += " o" + (c.n ? " n " + numClass(c.n) : "");
      html = c.n ? String(c.n) : "";
    }
    if (i === cursor) cls += " cur";
    el.className = cls; el.innerHTML = html;
    el.setAttribute("aria-label", label(i));
  }
  function label(i) {
    const c = run.cells[i];
    if (!c.open) return c.seen ? "a popup, power 1" : c.flag ? "hidden, flagged " + c.flag : "hidden";
    if (c.v) return "beaten " + CS.VIRUSES[c.v].name + " " + c.v + (c.drop ? ", has " + c.drop : "");
    return c.n ? "power " + c.n + " nearby" : "clean";
  }
  function render() {
    for (let i = 0; i < tiles.length; i++) paint(i);
    hud();
  }
  function hud() {
    $("hpv").textContent = run.hp + "/" + run.max;
    $("hpm").firstChild.style.width = (100 * run.hp / run.max) + "%";
    $("hp").classList.toggle("low", !run.over && run.hp <= 2 && started);
    const need = CS.cost(run.level);
    $("lvv").textContent = run.level;
    $("xpv").textContent = run.xp + "/" + need;
    $("xpm").firstChild.style.width = Math.min(100, 100 * run.xp / need) + "%";
    $("lvl").classList.toggle("on", CS.canLevel(run));
    const h = heat();
    app.style.setProperty("--heat", started && !run.won ? h.toFixed(2) : 0);
    win.classList.toggle("hot", started && !run.over && h >= 0.5 && h < 0.8 && !reduce);
    win.classList.toggle("cooking", started && !run.over && h >= 0.8 && !reduce);
    win.classList.toggle("warm", started && !run.won && h > 0);
    if (!run.over && moodT <= 0) setMood(started && (run.hp <= 2 || h >= 0.5) ? "nervous" : "happy");
  }

  // ---------- status line ----------
  let quipT = 0;
  function quip(s, kind) { const q = $("quip"); q.textContent = s; q.className = "q" + (kind ? " " + kind : ""); quipT = performance.now(); }
  const TIPS = [
    "numbers = the total power of the viruses touching that tile.",
    "a fight costs hp equal to the virus's power. power ≥ hp = bluescreen.",
    "popups always show themselves: 0 hp, 1 xp. free. eat them.",
    "weak viruses are free xp. eat them first.",
    "level up = full heal and +1 max hp. spend it when you're hurt.",
    "right-click, long-press or ⚑ flag mode: flag a tile with your guess.",
    "tap a number when its flags + beaten viruses add up: opens the rest.",
    "KERNEL PANIC is 13. you need 14 hp to survive it.",
  ];

  // ---------- floating text + steam ----------
  function floatAt(i, text, color) {
    const r = tiles[i].getBoundingClientRect(), el = document.createElement("div");
    el.className = "float"; el.textContent = text; el.style.color = color;
    el.style.left = r.left + r.width / 2 + "px"; el.style.top = r.top - 4 + "px";
    app.appendChild(el); setTimeout(() => el.remove(), 950);
  }
  let puffAcc = 0;
  function steam(dt) {
    if (reduce || !run || !started || run.won) return;
    const h = run.over ? 1 : heat();
    if (h < 0.2) return;
    puffAcc += dt * h * (run.over ? 14 : 9);
    if (puffAcc < 1) return;
    const r = win.getBoundingClientRect();
    while (puffAcc >= 1) {
      puffAcc -= 1;
      if (app.querySelectorAll(".puff").length > 26) break;
      const p = document.createElement("div");
      p.className = "puff";
      p.style.left = r.left + Math.random() * r.width + "px"; p.style.top = r.top - 6 + Math.random() * 10 + "px";
      p.style.setProperty("--dx", (Math.random() * 40 - 20).toFixed(0) + "px");
      app.appendChild(p); setTimeout(() => p.remove(), 1850);
    }
  }
  function shake() { if (reduce) return; win.classList.remove("shake"); void win.offsetWidth; win.classList.add("shake"); }

  // ---------- playing ----------
  function begin() {
    if (started) return;
    started = true; startAt = performance.now(); evCount = 0;
    sdk((c) => c.start && c.start());
    if (mode === "daily") { const a = store.get("daily", {}); store.set("daily", { date: today(), tries: (a.date === today() ? a.tries || 0 : 0) + 1, best: a.date === today() ? a.best || 0 : 0, streak: a.streak || 0, last: a.last || "" }); ccEvent("daily_run", { date: today() }); }
    ac(); loopOn = true; nextT = 0;
    focusMe();
  }
  function apply(ev, at) {
    for (const e of ev) {
      if (e.type === "open") {
        const cells = e.cells;
        if (cells.length > 6) sfx.cascade(cells.length); else sfx.pop(run.cells[at] ? run.cells[at].n : 0);
        for (const o of cells) {
          paint(o.i);
          const el = tiles[o.i];
          if (!reduce) { el.style.animationDelay = Math.min(o.d * 26, 500) + "ms"; el.classList.add("pop"); }
        }
        if (cells.length > 12) quip(pick(["cascade! fresh memory recovered.", "ooh, clean sectors.", "defrag speedrun."]), "good");
        else if (!started || performance.now() - quipT > 4000) quip(pick(TIPS));
      } else if (e.type === "fight") {
        const V = CS.VIRUSES[e.p];
        paint(e.i, true);
        shake();
        if (e.p === CS.BOSS) sfx.boss(); else sfx.hit(e.p);
        floatAt(e.i, e.hp ? "-" + e.hp + " hp" : "free!", e.hp ? "#ff5a3a" : "#7fd8ff");
        if (!e.dead) {
          setTimeout(() => { floatAt(e.i, "+" + e.p + " xp", LIME2); sfx.xp(); }, 260);
          setMood("ouch", 600);
          quip(pick(V.quips), "bad");
          if (CS.canLevel(run) && run.hp <= 3) setTimeout(() => !run.over && quip("you can level up: full heal + 1 max hp. tap level up ▲", "good"), 1200);
        }
      } else if (e.type === "lose") { setTimeout(() => finish(false), 350); }
      else if (e.type === "win") { setTimeout(() => finish(true), 450); }
    }
    hud();
  }

  function tap(i) {
    if (!run || run.over || i < 0) return;
    closePicker();
    const c = run.cells[i];
    if (flagMode && !c.open && !c.seen) { openPicker(i); return; }
    if (!started) begin();
    if (c.open) {
      if (c.dead && c.drop) {
        const r = CS.collect(run, i);
        paint(i);
        if (r.type === "ram") { sfx.ram(); floatAt(i, r.healed ? "+" + r.healed + " hp" : "full hp", "#ffb13a"); quip(r.healed ? "ram stick: +" + r.healed + " hp. tasty." : "ram stick wasted. you were full.", "good"); ccEvent("ram"); }
        else {
          sfx.scan();
          if (r.target >= 0) { const ev = CS.reveal(run, r.target); apply(ev, r.target); tiles[r.target].classList.add("scanned"); quip("scan: found clean memory.", "good"); }
          else quip("scan: nothing left to scan.");
        }
        hud();
        return;
      }
      const ch = CS.chord(run, i);
      if (ch) for (const j of ch) { if (run.over) break; apply(CS.reveal(run, j), j); }
      return;
    }
    // a flag is a note, not a lock: but if you flagged it as something that would cook you, ask once more
    if (c.flag && c.flag >= run.hp) {
      const now = performance.now();
      if (confirmFight.i !== i || now - confirmFight.t > 1800) { confirmFight = { i, t: now }; sfx.no(); quip("you flagged that " + c.flag + ". you have " + run.hp + " hp. tap again to fight anyway.", "bad"); return; }
    }
    confirmFight = { i: -1, t: 0 };
    if (!run.placed) { CS.generate(run, i); render(); } // the board is built around the first tap; popups show up
    apply(CS.reveal(run, i), i);
  }

  function levelUp() {
    if (!run || !CS.levelUp(run)) return;
    sfx.level(); setMood("happy", 900);
    quip("level " + run.level + ": full heal, max hp " + run.max + ".", "good");
    if (run.level === 3 || run.level === 6 || run.level === 10) ccEvent("level", { level: run.level });
    hud();
  }
  $("lvl").addEventListener("click", (e) => { e.stopPropagation(); levelUp(); });

  // ---------- the end ----------
  function finish(won, quiet) {
    if (ended) return;
    ended = true; endAt = performance.now(); loopOn = false;
    const secs = Math.round((endAt - startAt) / 1000);
    const score = CS.score(run, secs);
    if (quiet) { sdk((c) => c.end && c.end({ score: score, durationMs: Math.round(endAt - startAt), completed: false })); return; }
    const key = mode === "daily" ? "bestDaily" : "best";
    const prev = store.get(key, 0);
    if (score > prev) store.set(key, score);
    store.set("runs", store.get("runs", 0) + 1);
    let streak = 0;
    if (mode === "daily") {
      const a = store.get("daily", {});
      const y = new Date(); y.setDate(y.getDate() - 1);
      const yest = y.getFullYear() + "-" + String(y.getMonth() + 1).padStart(2, "0") + "-" + String(y.getDate()).padStart(2, "0");
      streak = a.last === today() ? a.streak || 1 : a.last === yest ? (a.streak || 0) + 1 : 1;
      store.set("daily", { date: today(), tries: a.tries || 1, best: Math.max(a.best || 0, score), streak, last: today() });
    }
    ccEvent(won ? "kernel_beaten" : "bluescreen", { power: run.cause || 13, level: run.level, s: secs });
    sdk((c) => c.score && c.score(score));
    const endP = sdk((c) => c.end && c.end({ score: score, durationMs: Math.round(endAt - startAt), completed: true }));
    const info = { won, score, prev, secs, streak };
    pending = info;
    if (won) {
      sfx.win(); setMood("cool"); quip("virus scan complete. 0 threats remain. the computer is less cooked.", "good");
      app.style.setProperty("--heat", 0); win.classList.remove("hot", "cooking");
      // the rest of the board shows itself
      run.cells.forEach((c, i) => { if (!c.open) { c.open = true; paint(i); if (!reduce) { tiles[i].style.animationDelay = (i % run.cols) * 30 + "ms"; tiles[i].classList.add("pop"); } } });
      setTimeout(() => receipt(info), 1500);
    } else {
      sfx.bsod(); setMood("melt"); bsod(info);
      run.cells.forEach((c, i) => { if (c.v && (!c.open || !c.dead)) { c.open = true; paint(i); } });
      setTimeout(() => receipt(info), reduce ? 400 : 2300);
    }
    if (endP && endP.then) endP.then((r) => { if (r && r.rank && !$("receipt").hidden) { const el = $("rank"); if (el) el.textContent = "#" + r.rank + " on the board"; } }, () => {});
  }

  function bsod(info) {
    const b = $("bsod");
    const V = CS.VIRUSES[run.cause] || CS.VIRUSES[13];
    b.innerHTML = '<div class="in"><canvas id="melt" width="24" height="24"></canvas><span class="tag">COOKED</span><br>A fatal exception 0E has occurred at 0028:C00CED' + run.cause + '.<br><br>* ' + esc(V.name) + " hit for " + run.cause + " hp. you had " + run.lastHp + ".<br>* the computer is cooked.<br><br>receipt printing" + '<span id="dots">...</span></div>';
    b.hidden = false;
    b.onclick = () => receipt(info);
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const mmss = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");

  let pending = null;
  function receipt(info) {
    if (!$("receipt").hidden || !ended || !run.over) return;
    $("bsod").hidden = true;
    const { won, score, prev, secs, streak } = info;
    const total = run.viruses, cleared = run.killed;
    const nudge = score > prev ? (prev > 0 ? "new best. you beat it by " + (score - prev) + "." : "first run logged. now beat it.")
      : score === prev ? "tied your best. so close." : (prev - score) + " more to beat your best (" + prev + ").";
    const rows = [
      ["mode", mode === "daily" ? "today's disk " + today().slice(5) : "endless"],
      ["viruses cleared", cleared + "/" + total],
      ["KERNEL PANIC", won ? "BEATEN" : "still running"],
      ["level", String(run.level)],
      ["time", mmss(secs)],
      ["ram eaten", String(run.ramUsed)],
      ["memory recovered", run.opened + "/" + run.safe],
    ];
    if (!won) rows.splice(3, 0, ["cooked by", CS.VIRUSES[run.cause].name + " (" + run.cause + ")"]);
    if (streak) rows.push(["daily streak", streak + (streak === 1 ? " day" : " days")]);
    const portal = !!window.CC_PORTAL;
    $("receipt").innerHTML = '<div class="paper" role="dialog" aria-label="run receipt">' +
      "<h2>" + (won ? "THREAT REMOVED" : "SYSTEM COOKED") + "</h2><div class='sub'>cooked sweeper · receipt #" + ((Math.random() * 9000 + 1000) | 0) + "</div>" +
      rows.map((r) => '<div class="row"><span>' + esc(r[0]) + "</span><span></span><span>" + esc(r[1]) + "</span></div>").join("") +
      '<div class="row tot"><span>SCORE</span><span></span><span>' + score + "</span></div>" +
      '<div class="row"><span>best</span><span></span><span>' + Math.max(prev, score) + "</span></div>" +
      '<div class="nudge' + (score > prev ? " best" : "") + '">' + esc(nudge) + ' <span id="rank"></span></div>' +
      '<div class="btns"><button class="go" id="r-again" type="button">' + (won ? "play again" : "reboot") + "</button>" +
      '<button id="r-mode" type="button">' + (mode === "daily" ? "endless run" : "today's disk") + "</button>" +
      '<button id="r-share" type="button">share card</button>' +
      (portal ? '<button id="r-close" type="button">look at board</button>' : '<button id="r-next" type="button">play next ▶</button>') + "</div>" +
      '<div class="foot">thank you for shopping at the void · computercooked.com</div></div>';
    $("receipt").hidden = false;
    $("r-again").onclick = () => newRun();
    $("r-mode").onclick = () => newRun(mode === "daily" ? "endless" : "daily");
    $("r-share").onclick = () => share(info);
    if ($("r-next")) $("r-next").onclick = playNext;
    if ($("r-close")) $("r-close").onclick = () => { $("receipt").hidden = true; };
    setTimeout(() => { try { $("r-again").focus({ preventScroll: true }); } catch (e) {} }, 60);
  }

  function playNext() {
    const go = (slug) => { try { (window.top || window).location.href = "/games/" + slug + "/?ref=next"; } catch (e) { location.href = "/games/" + slug + "/"; } };
    fetch("/games/games.json").then((r) => r.json()).then((j) => {
      const list = (j.games || []).filter((g) => g.made_by === "computer-cooked" && g.slug !== "cooked-sweeper");
      go(list.length ? pick(list).slug : "");
    }).catch(() => go(""));
  }

  // ---------- share card: a 1080x1080 receipt, drawn here ----------
  function share(info) {
    const S = 1080, cv = document.createElement("canvas"); cv.width = S; cv.height = S;
    const g = cv.getContext("2d"), F = (w, s) => w + " " + s + "px ui-monospace, Menlo, Consolas, monospace";
    const grd = g.createRadialGradient(S / 2, S * 0.55, 50, S / 2, S / 2, S * 0.75); grd.addColorStop(0, "#7a2a0c"); grd.addColorStop(1, "#140806");
    g.fillStyle = grd; g.fillRect(0, 0, S, S);
    // the window
    const x = 90, y = 110, w = S - 180, h = S - 230;
    g.fillStyle = "#000"; g.fillRect(x - 6, y - 6, w + 12, h + 12);
    g.fillStyle = "#f3ead2"; g.fillRect(x, y, w, h);
    const tb = g.createLinearGradient(x, 0, x + w, 0); tb.addColorStop(0, "#7a1d0a"); tb.addColorStop(0.55, "#ff5a1f"); tb.addColorStop(1, "#ffb03a");
    g.fillStyle = tb; g.fillRect(x + 8, y + 8, w - 16, 62);
    g.fillStyle = "#fff"; g.font = F(800, 34); g.textBaseline = "middle"; g.fillText("minesweeper.exe has a virus", x + 28, y + 40);
    // mascot
    const mc = document.createElement("canvas"); mc.width = 24; mc.height = 24; drawMascot(mc.getContext("2d"), info.won ? "cool" : "melt", 1.2);
    g.imageSmoothingEnabled = false; g.drawImage(mc, x + w - 250, y + 100, 216, 216);
    g.fillStyle = info.won ? "#2f6b0c" : "#b51d1d"; g.font = F(800, 64); g.textBaseline = "top";
    g.fillText(info.won ? "THREAT REMOVED" : "SYSTEM COOKED", x + 40, y + 110);
    g.fillStyle = "#120c08"; g.font = F(800, 150); g.fillText(String(info.score), x + 40, y + 190);
    g.font = F(700, 36); g.fillStyle = "#3a2a16";
    const lines = [
      "viruses cleared  " + run.killed + "/" + run.viruses,
      info.won ? "KERNEL PANIC     beaten" : "cooked by        " + CS.VIRUSES[run.cause].name,
      "level            " + run.level,
      "time             " + mmss(info.secs),
      mode === "daily" ? "today's disk     " + today() : "mode             endless",
    ];
    lines.forEach((l, i) => g.fillText(l, x + 40, y + 380 + i * 56));
    g.fillStyle = "#b5410d"; g.font = F(800, 40);
    g.fillText(info.won ? "beat that." : "can you beat KERNEL PANIC?", x + 40, y + h - 80);
    g.fillStyle = "#a8d533"; g.font = F(800, 40); g.textBaseline = "middle"; g.textAlign = "center";
    g.fillText("computercooked.com/games/cooked-sweeper", S / 2, S - 60);
    const text = (info.won ? "i beat KERNEL PANIC in cooked sweeper: " : "KERNEL PANIC cooked me in cooked sweeper: ") + info.score + " pts. computercooked.com/games/cooked-sweeper/";
    cv.toBlob((blob) => {
      try {
        const file = blob && new File([blob], "cooked-sweeper.png", { type: "image/png" });
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text }).catch(() => {}); ccEvent("share", { via: "card" }); return; }
        if (navigator.share) { navigator.share({ text, url: "https://computercooked.com/games/cooked-sweeper/" }).catch(() => {}); ccEvent("share", { via: "share" }); return; }
      } catch (e) {}
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cooked-sweeper.png"; document.body.appendChild(a); a.click(); a.remove();
      try { navigator.clipboard && navigator.clipboard.writeText(text); } catch (e) {}
      quip("share card saved. text copied.", "good"); ccEvent("share", { via: "download" });
    }, "image/png");
  }

  // ---------- flag picker ----------
  const picker = $("picker");
  function openPicker(i) {
    if (!run || run.over) return;
    const c = run.cells[i];
    if (c.open || c.seen) return;
    pickerFor = i;
    const opts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 13];
    picker.innerHTML = '<div class="ph">flag it: guessed power</div>' + opts.map((p) => '<button type="button" data-p="' + p + '"' + (p === 13 ? ' class="k"' : "") + ">" + (p === 13 ? "K" : p) + "</button>").join("") +
      '<button type="button" class="x" data-p="0" aria-label="clear flag">✕</button><button type="button" class="w" data-p="-1">fight it</button>';
    picker.hidden = false;
    // above the tile (a finger covers what's below it), below only when there's no room up there
    const r = tiles[i].getBoundingClientRect(), pw = picker.offsetWidth, ph = picker.offsetHeight;
    let left = r.left + r.width / 2 - pw / 2, top = r.top - ph - 8;
    if (top < 4) top = r.bottom + 8;
    if (top + ph > window.innerHeight - 4) top = window.innerHeight - ph - 4;
    left = Math.max(4, Math.min(window.innerWidth - pw - 4, left)); top = Math.max(4, top);
    picker.style.left = left + "px"; picker.style.top = top + "px";
    sfx.flag();
    const first = picker.querySelector('button[data-p="' + (c.flag || 1) + '"]');
    if (first) try { first.focus({ preventScroll: true }); } catch (e) {}
  }
  function closePicker() { if (!picker.hidden) { picker.hidden = true; pickerFor = -1; } }
  function setFlag(i, p) {
    const c = run.cells[i];
    if (c.open) return;
    if (!started) begin();
    c.flag = p > 0 ? p : null; paint(i); sfx.flag();
  }
  picker.addEventListener("pointerdown", (e) => e.stopPropagation());
  picker.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const p = +b.dataset.p, i = pickerFor;
    closePicker();
    if (i < 0) return;
    if (p === -1) { const c = run.cells[i]; c.flag = null; confirmFight = { i: -1, t: 0 }; tap(i); return; }
    setFlag(i, p);
  });

  // ---------- flag mode: on a phone, taps flag instead of fight (long-press alone is hard to find) ----------
  let flagMode = false;
  const flagBtn = $("flagmode");
  function setFlagMode(on) {
    flagMode = on; flagBtn.setAttribute("aria-pressed", on ? "true" : "false"); win.classList.toggle("flagging", on);
    if (on) quip("flag mode: tap a tile to flag your guess. tap ⚑ again to fight.", "good");
  }
  flagBtn.addEventListener("click", (e) => { e.stopPropagation(); setFlagMode(!flagMode); sfx.flag(); });

  // ---------- the rules, inside the window, on the first run (and from the ? button) ----------
  const rules = $("rules");
  function showRules() { rules.hidden = false; }
  function hideRules() { if (rules.hidden) return; rules.hidden = true; store.set("rules", true); focusMe(); }
  rules.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); });
  rules.addEventListener("click", (e) => { e.stopPropagation(); hideRules(); });
  $("help").addEventListener("click", (e) => { e.stopPropagation(); rules.hidden ? showRules() : hideRules(); });

  // ---------- input: tap, right-click, long-press ----------
  let press = null;
  const LONG = 380;
  function cellAt(e) { const el = e.target.closest && e.target.closest(".c"); return el ? +el.dataset.i : -1; }
  board.addEventListener("pointerdown", (e) => {
    focusMe();
    if (e.button === 2) return; // contextmenu handles it
    const i = cellAt(e); if (i < 0) return;
    e.preventDefault();
    const timer = e.pointerType !== "mouse" ? setTimeout(() => { if (press && press.i === i) { press.long = true; if (navigator.vibrate) try { navigator.vibrate(18); } catch (er) {} openPicker(i); } }, LONG) : 0;
    press = { i, x: e.clientX, y: e.clientY, long: false, timer };
  });
  board.addEventListener("pointermove", (e) => { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 14) { clearTimeout(press.timer); press = null; } });
  board.addEventListener("pointerup", (e) => {
    if (!press) return;
    clearTimeout(press.timer);
    const p = press; press = null;
    if (p.long) return;
    if (cellAt(e) !== p.i && e.pointerType === "mouse") return;
    cursor = -1;
    tap(p.i);
  });
  board.addEventListener("pointercancel", () => { if (press) clearTimeout(press.timer); press = null; });
  board.addEventListener("contextmenu", (e) => { e.preventDefault(); const i = cellAt(e); if (i >= 0) openPicker(i); });
  document.addEventListener("pointerdown", (e) => { if (!picker.contains(e.target)) closePicker(); });
  // no page scroll or rubber-banding while playing (the receipt can still scroll on a short screen)
  document.addEventListener("touchmove", (e) => { if (!(e.target.closest && e.target.closest(".paper"))) e.preventDefault(); }, { passive: false });
  $("face").addEventListener("click", () => newRun());
  $("m-endless").addEventListener("click", () => newRun("endless"));
  $("m-daily").addEventListener("click", () => newRun("daily"));
  $("m-toggle").addEventListener("click", () => newRun(mode === "daily" ? "endless" : "daily"));

  // keyboard: arrows move a cursor, space/enter reveal, f / 1-9 / k flag
  function onKey(e) {
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    const k = e.key;
    const nav = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
    if (nav || k === " " || e.code === "Space") e.preventDefault(); // never scroll the page around the game
    if (!rules.hidden) { if (nav || k === " " || k === "Enter" || k === "Escape" || e.code === "Space") { e.preventDefault(); hideRules(); } return; }
    if (!picker.hidden) {
      if (k === "Escape") { closePicker(); return; }
      const n = k === "k" || k === "K" ? 13 : /^[0-9]$/.test(k) ? +k : null;
      if (n !== null && pickerFor >= 0) { const i = pickerFor; closePicker(); setFlag(i, n); return; }
      if (nav) { const bs = [...picker.querySelectorAll("button")], at = bs.indexOf(document.activeElement); const nx = Math.max(0, Math.min(bs.length - 1, at + nav[0] + nav[1] * 4)); try { bs[nx].focus({ preventScroll: true }); } catch (er) {} return; }
      return; // enter/space press the focused picker button
    }
    if (!$("receipt").hidden) {
      if (e.target && e.target.tagName === "BUTTON") return;
      if (k === "Enter" || k === " " || e.code === "Space" || k === "r" || k === "R") { e.preventDefault(); newRun(); }
      return;
    }
    if (!$("bsod").hidden) { if (pending && (k === "Enter" || k === " " || e.code === "Space")) receipt(pending); return; }
    if (k === "m" || k === "M") { setMuted(!muted); return; }
    if (k === "n" || k === "N") { newRun(); return; }
    if (k === "d" || k === "D") { newRun(mode === "daily" ? "endless" : "daily"); return; }
    if (k === "l" || k === "L") { levelUp(); return; }
    if (k === "?" || k === "h" || k === "H") { showRules(); return; }
    if (!run) return;
    if (nav) {
      if (cursor < 0) cursor = ((run.rows / 2) | 0) * run.cols + ((run.cols / 2) | 0);
      else {
        const x = Math.max(0, Math.min(run.cols - 1, (cursor % run.cols) + nav[0])), y = Math.max(0, Math.min(run.rows - 1, ((cursor / run.cols) | 0) + nav[1]));
        const old = cursor; cursor = y * run.cols + x; paint(old);
      }
      paint(cursor); return;
    }
    if (cursor < 0) return;
    if (k === " " || e.code === "Space" || k === "Enter") { if (!e.repeat) tap(cursor); paint(cursor); return; }
    if (k === "f" || k === "F") { openPicker(cursor); return; }
    if (/^[0-9]$/.test(k)) { setFlag(cursor, +k); return; }
    if (k === "k" || k === "K") { setFlag(cursor, 13); return; }
  }
  window.addEventListener("keydown", onKey);
  // on /games/cooked-sweeper/ the focus is often the player page, not this iframe: same origin, so listen there
  // too while the game is on screen, and keep Space / arrows from scrolling that page
  try {
    const host = window.parent !== window && window.frameElement ? window.parent : null;
    if (host) host.document.addEventListener("keydown", (e) => {
      if (e.target && (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
      const fr = window.frameElement.getBoundingClientRect();
      if (fr.height < 50 || fr.bottom < 50 || fr.top > host.innerHeight - 50) return;
      if (e.target === window.frameElement) return; // the iframe has it already
      onKey(e);
    });
  } catch (e) { /* another origin (a portal): keys reach the game once it has focus */ }
  function focusMe() { try { window.focus(); } catch (e) {} try { board.focus({ preventScroll: true }); } catch (e) {} }

  // ---------- player page hooks ----------
  window.addEventListener("message", (e) => {
    const d = e.data; if (!d || typeof d !== "object") return;
    if (d.type === "cc-mute") setMuted(!!d.muted);
    else if (d.type === "cc-pause") paused = typeof d.paused === "boolean" ? d.paused : !paused;
    else if (d.type === "cc-restart") newRun();
  });
  window.addEventListener("pagehide", () => { if (run && started && !ended) finish(false, true); });

  // ---------- frame loop: mascot, timer, steam ----------
  // ~12 fps is plenty for a pixel mascot; the dom only changes when something did (keeps phones cool and lighthouse happy)
  let last = performance.now(), lastDraw = 0, lastSec = -1, lastFace = "";
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    // a short mood (ouch, a level-up grin) ends: back to how the hp actually feels
    if (moodT > 0 && (moodT -= dt) <= 0 && run) hud();
    if (now - lastDraw > 83) {
      lastDraw = now;
      const animated = mood === "nervous" || mood === "melt" || mood === "cool";
      if (animated || lastFace !== mood) {
        lastFace = mood;
        const mt = mood === "melt" ? (now - endAt) / 1000 : now / 1000;
        drawMascot(mg, mood, mt);
        const m2 = document.getElementById("melt"); if (m2 && !$("bsod").hidden) drawMascot(m2.getContext("2d"), "melt", mt);
      }
      if (run) {
        const s = started ? Math.floor(((ended ? endAt : now) - startAt) / 1000) : 0;
        if (s !== lastSec) { lastSec = s; $("tm").textContent = mmss(s); }
        if (started && !run.over && now - quipT > 9000) quip(pick(TIPS));
      }
    }
    steam(dt);
    requestAnimationFrame(frame);
  }

  newRun("endless");
  requestAnimationFrame(frame);
  // test hook for the smoke/screenshot scripts (no effect on play)
  window.__cs = { run: () => run, tap, levelUp, newRun, flag: setFlag, finish: (w) => finish(w), flagMode: setFlagMode, hideRules, mood: () => mood };
})();
