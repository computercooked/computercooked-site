/* haunted self-checkout — computer cooked games.
   Groceries ride the belt. Tap (or click) one to scan it. Possessed items have eyes: never scan those.
   Missed groceries and scanned ghosts fill the "assistance needed" meter; full meter = the till is cooked.
   A shift is 60 seconds. Space / Enter scans the item nearest the bag (and starts / retries), M mutes. */
(function () {
  "use strict";
  // ---------- platform sdk: optional, every call guarded ----------
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  let lastScoreSent = 0;
  const sdkScore = (n) => { const t = performance.now(); if (t - lastScoreSent > 400) { lastScoreSent = t; sdk((c) => c.score && c.score(n)); } };

  const cv = document.getElementById("c"), cx = cv.getContext("2d");
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SHIFT = 60;

  // ---------- palette (the computer cooked computer) ----------
  const CASE = "#e6d596", CASE2 = "#d8c187", SIDE = "#a6975d", DEEP = "#554e2c", INK = "#0b0c0e", LIME = "#a8d533", LIME2 = "#dcff7a";
  const BAD = "#ff4d5e", GHOST = "#b48cff";

  // ---------- sprites: 12x12 pixel art, drawn by hand ----------
  const PAL = { k: INK, W: "#f4f1e6", w: "#c9c6bb", B: "#3d7be0", b: "#2a55a3", Y: "#f6d84a", y: "#c9a628", R: "#e5484d", r: "#9e2a2e",
    G: "#5fbf3a", g: "#3a8a22", T: "#d79b52", t: "#9c6a2c", S: "#9fb3c8", s: "#5f7387", O: "#ff9a3d", o: "#b8621c", P: "#f2a7c3", K: "#2a2d33" };
  const ART = {
    milk: ["...kkkkkk...", "...kWWWWk...", "..kWWWWWWk..", ".kkkkkkkkkk.", ".kWWWWWWWWk.", ".kBBBBBBBBk.", ".kBWWBBWWBk.", ".kBBBBBBBBk.", ".kWWWWWWWWk.", ".kWwWWWWwWk.", ".kWWWWWWWWk.", ".kkkkkkkkkk."],
    banana: [".........kk.", "........kyk.", "........kYk.", ".......kYYk.", ".......kYYk.", "......kYYyk.", ".....kYYYk..", "...kkYYYyk..", ".kkYYYYyk...", "kYYYYyyk....", ".kkkkkk.....", "............"],
    apple: [".....k......", "......k.kk..", "......kkGGk.", "...kkkkkkk..", "..kRRRkRRRk.", ".kRRWRRRRRrk", ".kRWRRRRRRrk", ".kRRRRRRRRrk", ".kRRRRRRRrrk", "..kRRRRRrrk.", "...kkrkrkk..", "....kk.kk..."],
    can: ["..kkkkkkkk..", ".kwwwwwwwwk.", ".kkkkkkkkkk.", ".kRRRRRRRRk.", ".kRRRRRRRrk.", ".kWWWWWWWWk.", ".kWRRWRRWWk.", ".kWWWWWWWWk.", ".kRRRRRRRrk.", ".kRRRRRRRrk.", ".kwwwwwwwwk.", "..kkkkkkkk.."],
    bread: ["............", "...kkkkkk...", "..kTTTTTTk..", ".kTTtTTtTTk.", "kTTTTTTTTTTk", "kTtTTtTTtTTk", "kTTTTTTTTTtk", "kTTTTTTTTttk", "kttTTTTTtttk", ".kttttttttk.", "..kkkkkkkk..", "............"],
    cheese: ["............", "........kk..", "......kkYYk.", "....kkYYYYk.", "..kkYYYYYYk.", "kkYYYYYYYYk.", "kYYyYYYYyYk.", "kYyyYYYYYYk.", "kYYYYYyYYYk.", "kYYYYYyyYyk.", "kkkkkkkkkkk.", "............"],
    fish: ["............", "............", "....kkkkk...", "..kkSSSSSk.k", ".kSSSSSSSSkk", "kSSSSSSSSSSk", "kSSSSSSSSSSk", ".ksssssssskk", "..kksssssk.k", "....kkkkk...", "............", "............"],
    roll: ["............", "...kkkkkk...", "..kWWWWWWk..", ".kWWwkkwWWk.", ".kWWkKKkWWk.", ".kWWwkkwWWk.", ".kWWWWWWWWk.", ".kWWWWWWWWk.", ".kWwWWWWwWk.", ".kWWWWWWWWk.", "..kkkkkkkk..", "............"],
    pumpkin: [".....kk.....", ".....kgk....", "...kkkgkk...", "..kOOkOkOOk.", ".kOOOkOkOOOk", "kOOOOkOkOOOk", "kOOOOkOkOOok", "kOOOOkOkOOok", "kOOOOkOkOook", ".kooOkOkOok.", "..kkkkkkkk..", "............"],
    ghost: ["....kkkk....", "...kWWWWk...", "..kWWWWWWk..", ".kWWWWWWWWk.", ".kWWWWWWWWk.", ".kWWWWWWWWk.", ".kWWWWWWWWk.", ".kWWWWWWWWk.", ".kWWWWWWWwk.", ".kWWwWWwWWk.", ".kWk.kWk.kk.", "..k...k....."],
  };
  const PRICE = { milk: 1.89, banana: 0.29, apple: 0.79, can: 1.19, bread: 2.49, cheese: 3.99, fish: 6.66, roll: 0.99, pumpkin: 4.50 };
  const GROCERIES = Object.keys(PRICE);
  const sprites = {};
  for (const k in ART) {
    const c = document.createElement("canvas"); c.width = 12; c.height = 12;
    const x = c.getContext("2d");
    ART[k].forEach((row, j) => { for (let i = 0; i < row.length; i++) { const ch = row[i]; if (ch !== ".") { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } } });
    sprites[k] = c;
  }

  // ---------- the till's face (the brand computer's screen) ----------
  const FACES = {
    sad: ["................", ".##..........##.", "...##......##...", "................", "..###......###..", "..###......###..", "................", ".....######.....", "....#......#....", "................"],
    happy: ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "...#........#...", "....########....", ".....######.....", "................"],
    shock: ["................", "..###......###..", ".#...#....#...#.", ".#...#....#...#.", "..###......###..", "................", "......####......", ".....#....#.....", "......####......", "................"],
    cooked: ["................", "..#...#..#...#..", "...#.#....#.#...", "....#......#....", "...#.#....#.#...", "..#...#..#...#..", "................", "..#.#.#.#.#.#.#.", ".#.#.#.#.#.#.#..", "................"],
  };

  // ---------- lines ----------
  const LINES = {
    hello: ["welcome. please scan your first item.", "the till is open. the till is always open."],
    scan: ["beep.", "item scanned. soul not included.", "thank you for shopping at the void.", "nectar points: 666.", "beep. (affectionate)", "that one was normal. nice."],
    wrong: ["UNEXPECTED ITEM IN BAGGING AREA", "that item is looking at me.", "approval needed. from a priest.", "please remove the cursed item.", "why did you scan the haunted one"],
    miss: ["please scan your item.", "item not scanned. it will remember.", "did you forget something?", "the banana got away."],
    hot: ["assistance is on the way. (it isn't)", "my screen is sweating.", "a staff member has been summoned. by me. it's a ghost."],
    over: ["help is on the way. nobody came.", "till closed. forever.", "you have been banned from the void."],
    win: ["shift over. you survived the till.", "receipt printed. it is 4 metres long."],
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- sound (tiny web audio, no files) ----------
  let actx = null, muted = false;
  try { muted = localStorage.getItem("hsc-muted") === "1"; } catch (e) {}
  const muteBtn = document.getElementById("mute");
  function syncMute() { muteBtn.textContent = muted ? "sound off" : "sound on"; muteBtn.setAttribute("aria-pressed", muted ? "true" : "false"); }
  syncMute();
  function toggleMute() { muted = !muted; try { localStorage.setItem("hsc-muted", muted ? "1" : "0"); } catch (e) {} syncMute(); }
  muteBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMute(); });
  muteBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  function tone(freq, dur, type, vol, slide) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const sfx = {
    beep: (m) => tone(1650 + m * 120, 0.08, "square", 0.05),
    wrong: () => { tone(160, 0.35, "sawtooth", 0.08, 70); tone(240, 0.25, "square", 0.04, 120); },
    miss: () => tone(420, 0.18, "triangle", 0.06, 260),
    start: () => { tone(880, 0.07); setTimeout(() => tone(1320, 0.09), 80); },
    over: () => { tone(300, 0.5, "sawtooth", 0.07, 60); },
    win: () => { [880, 1100, 1320, 1760].forEach((f, i) => setTimeout(() => tone(f, 0.1), i * 90)); },
  };

  // ---------- layout ----------
  let W = 0, H = 0, DPR = 1, S = 64, top = 0, lanesY = [], belt = { y0: 0, y1: 0 }, bag = { x: 0, y: 0 };
  function layout() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    top = Math.round(Math.min(H * 0.34, 230));
    S = Math.round(Math.max(46, Math.min(84, W / 6.5, (H - top) / 4.6)));
    const room = H - top - 30;
    const n = 3;
    const gap = Math.min(S * 1.6, room / n);
    const y0 = top + 18 + (room - gap * n) / 2;
    lanesY = [0, 1, 2].map((i) => y0 + gap * (i + 0.5));
    belt = { gap };
    bag = { x: W - Math.max(40, S * 0.75), y: top - 26 };
  }
  window.addEventListener("resize", layout);
  layout();

  // ---------- state ----------
  let state = "title", t = 0, items = [], fx = [], meter = 0, score = 0, combo = 0, mult = 1, spawnIn = 0, best = 0, line = pick(LINES.hello), lineT = 0;
  let prevBest = 0, warnT = 0, face = "sad", faceT = 0, shake = 0, flash = 0, flashCol = BAD, startAt = 0, endAt = 0, scanned = 0, wrongs = 0, misses = 0, won = false, total = 0;
  try { best = +localStorage.getItem("hsc-best") || 0; } catch (e) {}
  const lanesOpen = () => (t < 14 ? 1 : t < 34 ? 2 : 3);
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));

  function bump(n) {
    meter = Math.min(100, meter + n);
    if (meter >= 100 && state === "play") end(false);
  }
  function say(kind, force) { if (force || lineT <= 0.4) { line = pick(LINES[kind]); lineT = 2.4; } }
  function react(f, ms) { face = f; faceT = ms / 1000; }

  function start() {
    state = "play"; t = 0; items = []; fx = []; meter = 0; score = 0; combo = 0; mult = 1; spawnIn = 0.35; scanned = 0; wrongs = 0; misses = 0; won = false; total = 0;
    startAt = performance.now(); say("hello", true); react("happy", 700); sfx.start();
    sdk((c) => c.start && c.start());
  }
  function end(survived) {
    state = "over"; endAt = performance.now(); won = survived; prevBest = best;
    if (score > best) { best = score; try { localStorage.setItem("hsc-best", String(best)); } catch (e) {} }
    say(survived ? "win" : "over", true); react(survived ? "happy" : "cooked", 99999);
    survived ? sfx.win() : sfx.over();
    const dur = Math.round(performance.now() - startAt);
    sdk((c) => c.score && c.score(score));
    sdk((c) => c.end && c.end({ score: score, durationMs: dur, completed: survived }));
  }

  function spawn() {
    const open = lanesOpen();
    const lane = (Math.random() * open) | 0;
    const k = t / SHIFT;
    const possessed = Math.random() < lerp(0.14, 0.36, k);
    const ghostly = possessed && Math.random() < 0.18;
    // late in the shift some possessed groceries only open their eyes now and then
    const sneaky = possessed && !ghostly && t > 26 && Math.random() < 0.45;
    const kind = ghostly ? "ghost" : pick(GROCERIES);
    // don't stack two items on top of each other at the belt start
    if (items.some((it) => it.lane === lane && it.x < S * 0.4)) return;
    items.push({ kind, lane, x: -S, possessed, sneaky, seed: Math.random() * 10, gone: false });
  }

  function scan(it) {
    it.gone = true;
    const cxp = it.x + S / 2, cyp = lanesY[it.lane];
    if (it.possessed) {
      wrongs++; combo = 0; mult = 1;
      shake = reduce ? 0 : 0.35; flash = 0.35; flashCol = BAD; react("shock", 900); say("wrong", true); sfx.wrong();
      fx.push({ type: "text", x: cxp, y: cyp - S * 0.6, s: "NOPE", col: BAD, life: 0.9, max: 0.9 });
      fx.push({ type: "spirit", x: cxp, y: cyp, life: 1.1, max: 1.1 });
      sdk((c) => c.event && c.event("possessed_scanned", { t: Math.round(t) }));
      bump(30);
    } else {
      scanned++; combo++; mult = Math.min(4, 1 + Math.floor(combo / 5));
      score += mult; total += PRICE[it.kind] || 1;
      sfx.beep(mult); if (Math.random() < 0.18) say("scan"); if (faceT <= 0) react("happy", 260);
      fx.push({ type: "laser", x: cxp, y: cyp, life: 0.18, max: 0.18 });
      fx.push({ type: "fly", kind: it.kind, x: it.x, y: cyp - S / 2, life: 0.45, max: 0.45 });
      fx.push({ type: "text", x: cxp, y: cyp - S * 0.65, s: mult > 1 ? "+" + mult : "beep", col: mult > 1 ? LIME2 : CASE, life: 0.6, max: 0.6 });
      if (combo > 0 && combo % 5 === 0 && mult <= 4) fx.push({ type: "text", x: W / 2, y: top + 14, s: "x" + mult + " combo", col: LIME, life: 0.9, max: 0.9, big: true });
      sdkScore(score);
    }
  }

  function hitTest(px, py) {
    let bestIt = null, bd = Infinity;
    for (const it of items) {
      if (it.gone) continue;
      const dx = px - (it.x + S / 2), dy = py - lanesY[it.lane];
      const d = Math.hypot(dx, dy * 1.2);
      if (d < S * 0.72 && d < bd) { bd = d; bestIt = it; }
    }
    return bestIt;
  }

  function press(px, py) {
    if (state !== "play") {
      if (state === "over" && performance.now() - endAt < 700) return;
      start(); return;
    }
    const it = hitTest(px, py);
    if (it) scan(it);
  }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); press(e.clientX, e.clientY); });
  function onKey(e) {
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (e.code === "Space" || e.key === " " || e.key === "Enter") {
      e.preventDefault(); // Space must never scroll the page around the game
      if (e.repeat) return;
      if (state !== "play") { press(-1, -1); return; }
      let r = null;
      for (const it of items) if (!it.gone && (!r || it.x > r.x)) r = it;
      if (r) scan(r);
    }
  }
  window.addEventListener("keydown", onKey);
  // on /games/haunted-self-checkout/ the focus is usually the player page, not this iframe: same origin, so listen
  // there too, while the game is on screen and the key isn't meant for a field or button on the page
  try {
    const host = window.parent !== window && window.frameElement ? window.parent : null;
    if (host) host.document.addEventListener("keydown", (e) => {
      if (e.target && (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
      const fr = window.frameElement.getBoundingClientRect();
      if (fr.height < 50 || fr.bottom < 50 || fr.top > host.innerHeight - 50) return;
      onKey(e);
    });
  } catch (e) { /* another origin (a portal): keys reach the game once it has focus */ }
  cv.addEventListener("pointerdown", () => { try { window.focus(); } catch (e) {} });

  // ---------- update ----------
  function update(dt) {
    lineT -= dt; faceT -= dt; shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt);
    for (const f of fx) f.life -= dt;
    fx = fx.filter((f) => f.life > 0);
    if (state !== "play") return;
    t += dt;
    if (t >= SHIFT) { end(meter < 100); return; }
    const k = t / SHIFT;
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = lerp(0.95, 0.36, k) * (0.75 + Math.random() * 0.5); }
    const speed = W * lerp(0.2, 0.42, k) + 40;
    for (const it of items) {
      if (it.gone) continue;
      it.x += speed * dt;
      if (it.x > W) {
        it.gone = true;
        if (!it.possessed) {
          misses++; combo = 0; mult = 1;
          react("sad", 500); say("miss"); sfx.miss(); flash = 0.2; flashCol = "#ffb340";
          bump(14);
          if (state !== "play") return;
        }
      }
    }
    items = items.filter((it) => !it.gone);
    meter = Math.max(0, meter - dt * 2.6);
    warnT -= dt;
    if (meter >= 75 && warnT <= 0) { warnT = 0.9; tone(980, 0.05, "square", 0.035); }
    if (meter >= 70 && faceT <= 0) { face = "shock"; if (Math.random() < dt * 0.4) say("hot"); }
    else if (faceT <= 0) face = "sad";
    if (meter >= 100) end(false);
  }

  // ---------- draw ----------
  function px(x) { return Math.round(x); }
  function drawFace(x, y, w, h, name) {
    const F = FACES[name] || FACES.sad, cw = w / 16, ch = h / 10;
    cx.fillStyle = LIME;
    for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (F[j][i] === "#") cx.fillRect(px(x + i * cw), px(y + j * ch), Math.ceil(cw), Math.ceil(ch));
  }
  function drawTill(time) {
    // the till is the computer cooked computer, wired into a checkout
    const tw = Math.min(W * 0.36, 210), th = Math.min(top * 0.7, 150), tx = 14, ty = Math.max(12, top - th - 40);
    const hot = state === "play" && meter > 70 && !reduce;
    const jx = hot ? Math.sin(time * 40) * 1.2 : 0;
    cx.save(); cx.translate(jx, 0);
    // steam
    if (!reduce) {
      cx.fillStyle = LIME;
      for (let i = 0; i < 3; i++) {
        const sx = tx + tw * (0.3 + i * 0.2), sy = ty - 6 - ((time * 18 + i * 9) % 22);
        cx.globalAlpha = 0.6 - ((time * 18 + i * 9) % 22) / 40;
        cx.fillRect(px(sx + Math.sin(time * 3 + i) * 3), px(sy), 4, 9);
      }
      cx.globalAlpha = 1;
    }
    cx.fillStyle = INK; cx.fillRect(tx - 3, ty - 3, tw + 6 + 10, th + 6);
    cx.fillStyle = SIDE; cx.fillRect(tx + tw, ty, 10, th);
    cx.fillStyle = CASE; cx.fillRect(tx, ty, tw, th);
    cx.fillStyle = CASE2; cx.fillRect(tx, ty + th - 8, tw, 8);
    const sx = tx + 10, sy = ty + 10, sw = tw - 20, sh = th - 30;
    cx.fillStyle = INK; cx.fillRect(sx, sy, sw, sh);
    cx.fillStyle = "#1d2418"; cx.fillRect(sx + 4, sy + 4, 6, 4);
    // the face, sized to the screen
    const fw = Math.min(sw * 0.8, sh * 1.6 * 0.8), fh = fw * 10 / 16;
    drawFace(sx + (sw - fw) / 2, sy + (sh - fh) / 2, fw, fh, face);
    // card reader slot + lime light
    cx.fillStyle = DEEP; cx.fillRect(tx + 12, ty + th - 16, tw * 0.4, 4);
    cx.fillStyle = state === "play" && meter > 70 ? (Math.floor(time * 6) % 2 ? BAD : DEEP) : LIME;
    cx.fillRect(tx + tw - 24, ty + th - 17, 8, 6);
    cx.restore();
    // speech bubble
    const bx = tx + tw + 24, bw = Math.min(W - bx - 14, 360), by = ty + 6;
    if (bw > 90) {
      cx.font = "700 " + Math.round(Math.max(12, Math.min(16, W / 32))) + "px ui-monospace, Menlo, Consolas, monospace";
      const lines = wrap(line, bw - 20);
      const bh = 14 + lines.length * 19;
      cx.fillStyle = "#f4f1e6"; cx.fillRect(bx, by, bw, bh);
      cx.fillStyle = INK; cx.fillRect(bx, by + bh, bw, 3); cx.fillRect(bx + bw, by + 3, 3, bh);
      cx.beginPath(); cx.moveTo(bx, by + 16); cx.lineTo(bx - 12, by + 24); cx.lineTo(bx, by + 28); cx.fillStyle = "#f4f1e6"; cx.fill();
      cx.fillStyle = /[A-Z]{4}/.test(line) ? "#c0262f" : INK; cx.textBaseline = "top"; cx.textAlign = "left";
      lines.forEach((l, i) => cx.fillText(l, bx + 10, by + 9 + i * 19));
    }
  }
  function wrap(s, w) {
    const out = []; let cur = "";
    for (const word of s.split(" ")) { const tryS = cur ? cur + " " + word : word; if (cx.measureText(tryS).width > w && cur) { out.push(cur); cur = word; } else cur = tryS; }
    if (cur) out.push(cur); return out.slice(0, 3);
  }
  function drawHud() {
    // meter
    const mx = 14, my = top - 18, mw = W - 28;
    cx.fillStyle = "#1c1e18"; cx.fillRect(mx, my, mw, 10);
    const warn = meter >= 75, pulse = warn ? 0.55 + 0.45 * Math.abs(Math.sin(performance.now() / (reduce ? 1e9 : 140))) : 1;
    cx.globalAlpha = pulse;
    cx.fillStyle = meter > 70 ? BAD : meter > 40 ? "#ffb340" : LIME; cx.fillRect(mx, my, mw * meter / 100, 10);
    cx.globalAlpha = 1;
    if (warn) {
      cx.strokeStyle = "rgba(255, 77, 94, " + pulse + ")"; cx.lineWidth = 2; cx.strokeRect(mx - 2, my - 2, mw + 4, 14);
      cx.font = "800 12px ui-monospace, Menlo, Consolas, monospace"; cx.textAlign = "center"; cx.textBaseline = "top"; cx.fillStyle = BAD;
      cx.globalAlpha = pulse; cx.fillText("!! the till is about to cook !!", W / 2, my + 14); cx.globalAlpha = 1;
    }
    cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.textBaseline = "bottom"; cx.textAlign = "left"; cx.fillStyle = "#8a8e80";
    cx.fillText("assistance needed", mx, my - 3);
    // score, combo and time on the meter row, right side
    cx.textAlign = "right"; cx.textBaseline = "bottom";
    const info = (mult > 1 ? "x" + mult + "  " : "") + Math.max(0, Math.ceil(SHIFT - t)) + "s";
    cx.font = "700 12px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = mult > 1 ? LIME2 : "#8a8e80";
    cx.fillText(info, W - 14, my - 3);
    const iw = cx.measureText(info).width;
    cx.font = "800 22px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = CASE;
    cx.fillText(String(score), W - 14 - iw - 10, my - 1);
    // combo badge: big and on the belt side, so it's seen while tapping
    if (mult > 1) {
      const txt = "x" + mult + " combo", by = my + (meter >= 75 ? 32 : 18);
      cx.font = "800 " + Math.round(Math.min(26, W / 15)) + "px ui-monospace, Menlo, Consolas, monospace";
      const tw = cx.measureText(txt).width + 22, th = Math.round(Math.min(26, W / 15)) + 12;
      cx.fillStyle = INK; cx.fillRect(14, by, tw, th);
      cx.fillStyle = mult >= 4 ? LIME2 : LIME; cx.fillRect(16, by + 2, tw - 4, th - 4);
      cx.fillStyle = INK; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(txt, 14 + tw / 2, by + th / 2 + 1);
      cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#8a8e80"; cx.textAlign = "left"; cx.textBaseline = "middle";
      cx.fillText(combo + " in a row", 14 + tw + 8, by + th / 2);
    }
  }
  function drawBelts(time) {
    const open = state === "play" ? lanesOpen() : 1;
    const bh = S * 0.34;
    for (let i = 0; i < 3; i++) {
      const y = lanesY[i] + S * 0.5;
      const on = i < open;
      cx.fillStyle = on ? "#23261d" : "#15160f"; cx.fillRect(0, y - 4, W, bh);
      cx.fillStyle = on ? "#3a3f2e" : "#1c1d16";
      const off = reduce ? 0 : (time * (W * 0.3)) % 28;
      for (let x = -28 + off; x < W; x += 28) cx.fillRect(px(x), y - 4, 10, bh);
      cx.fillStyle = INK; cx.fillRect(0, y - 6, W, 3);
      if (!on && state === "play") { cx.fillStyle = "#3a3d33"; cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText("lane closed (for now)", W / 2, lanesY[i]); }
    }
    // the bag at the end
    const bw = S * 0.7, bh2 = S * 0.62, bx = W - bw - 10, by = top - 4;
    cx.fillStyle = INK; cx.fillRect(bx - 2, by - 2, bw + 4, bh2 + 4);
    cx.fillStyle = "#c9a36a"; cx.fillRect(bx, by, bw, bh2);
    cx.fillStyle = "#a9844d"; cx.fillRect(bx, by, bw, 6); cx.fillRect(bx + bw * 0.7, by + 6, bw * 0.3, bh2 - 6);
    cx.fillStyle = INK; cx.fillRect(bx + bw * 0.3, by + bh2 * 0.45, bw * 0.4, 2);
  }
  function drawItem(it, time) {
    const x = it.x, y = it.y != null ? it.y : lanesY[it.lane] - S / 2;
    const bob = it.possessed && !reduce ? Math.sin(time * 7 + it.seed) * S * 0.05 : 0;
    const jit = it.possessed && !reduce ? (Math.sin(time * 31 + it.seed) > 0.92 ? 2 : 0) : 0;
    const eyesOpen = it.possessed && (!it.sneaky || Math.sin(time * 2.3 + it.seed * 3) > 0.35);
    if (eyesOpen) {
      cx.fillStyle = "rgba(180, 140, 255, 0.18)";
      cx.beginPath(); cx.ellipse(x + S / 2, y + S / 2 + bob, S * 0.62, S * 0.55, 0, 0, Math.PI * 2); cx.fill();
    }
    cx.imageSmoothingEnabled = false;
    cx.drawImage(sprites[it.kind], px(x + jit), px(y + bob), S, S);
    if (it.possessed && it.kind !== "ghost") {
      // eyes: open, or for sneaky ones only now and then
      const open = eyesOpen;
      const e = S / 12, ey = y + bob + S * 0.42, ex1 = x + S * 0.3, ex2 = x + S * 0.58;
      if (open) {
        cx.fillStyle = "#fff"; cx.fillRect(px(ex1), px(ey), Math.ceil(e * 2), Math.ceil(e * 2)); cx.fillRect(px(ex2), px(ey), Math.ceil(e * 2), Math.ceil(e * 2));
        cx.fillStyle = BAD; cx.fillRect(px(ex1 + e), px(ey + e * 0.5), Math.ceil(e), Math.ceil(e)); cx.fillRect(px(ex2 + e), px(ey + e * 0.5), Math.ceil(e), Math.ceil(e));
      } else {
        cx.fillStyle = INK; cx.fillRect(px(ex1), px(ey + e), Math.ceil(e * 2), Math.ceil(e * 0.6)); cx.fillRect(px(ex2), px(ey + e), Math.ceil(e * 2), Math.ceil(e * 0.6));
      }
    }
    if (it.kind === "ghost") {
      const e = S / 12;
      cx.fillStyle = INK; cx.fillRect(px(x + 4 * e), px(y + bob + 4 * e), Math.ceil(e), Math.ceil(e * 2)); cx.fillRect(px(x + 7 * e), px(y + bob + 4 * e), Math.ceil(e), Math.ceil(e * 2));
    }
  }
  function drawFx() {
    for (const f of fx) {
      const k = 1 - f.life / f.max;
      if (f.type === "laser") {
        cx.fillStyle = "rgba(255, 60, 70, " + (1 - k) + ")"; cx.fillRect(f.x - S * 0.6, f.y - 1, S * 1.2, 3);
        cx.fillRect(f.x - 1, f.y - S * 0.6, 3, S * 1.2);
      } else if (f.type === "fly") {
        const tx = W - S * 0.3 - S / 2, ty = top - S * 0.1;
        const x = f.x + (tx - f.x) * k, y = f.y + (ty - f.y) * k - Math.sin(k * Math.PI) * S * 1.2, s = S * (1 - k * 0.6);
        cx.globalAlpha = 1 - k * 0.5; cx.drawImage(sprites[f.kind], px(x), px(y), s, s); cx.globalAlpha = 1;
      } else if (f.type === "text") {
        cx.globalAlpha = 1 - k; cx.fillStyle = f.col; cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.font = "800 " + (f.big ? 22 : 16) + "px ui-monospace, Menlo, Consolas, monospace";
        cx.fillText(f.s, f.x, f.y - k * 26); cx.globalAlpha = 1;
      } else if (f.type === "spirit") {
        cx.globalAlpha = 1 - k; cx.imageSmoothingEnabled = false;
        cx.drawImage(sprites.ghost, px(f.x - S * 0.4 + Math.sin(k * 12) * 6), px(f.y - S * 0.5 - k * S * 1.6), S * 0.8, S * 0.8); cx.globalAlpha = 1;
      }
    }
  }
  function overlay(time) {
    cx.fillStyle = "rgba(8, 9, 7, 0.78)"; cx.fillRect(0, top - 4, W, H - top + 4);
    cx.textAlign = "center"; cx.textBaseline = "middle";
    const mid = top + (H - top) * 0.42, big = Math.round(Math.max(24, Math.min(44, W / 11)));
    if (state === "title") {
      cx.fillStyle = CASE; cx.font = "800 " + big + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillText("haunted", W / 2, mid - big * 1.6); cx.fillText("self-checkout", W / 2, mid - big * 0.55);
      cx.font = "700 " + Math.round(Math.max(13, Math.min(17, W / 26))) + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillStyle = LIME; cx.fillText("tap groceries to scan them.", W / 2, mid + big * 0.6);
      cx.fillStyle = BAD; cx.fillText("never scan the ones with eyes.", W / 2, mid + big * 0.6 + 24);
      // demo sprites: a normal one and a possessed one
      cx.imageSmoothingEnabled = false;
      const d = Math.min(S, 60);
      cx.drawImage(sprites.banana, W / 2 - d * 1.4, mid + big * 0.6 + 44, d, d);
      drawItem({ kind: "apple", lane: 0, x: W / 2 + d * 0.3, y: mid + big * 0.6 + 44 - (S - d) / 2, possessed: true, sneaky: false, seed: 1 }, time);
    } else {
      cx.fillStyle = won ? LIME : BAD; cx.font = "800 " + big + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillText(won ? "shift survived" : "till cooked", W / 2, mid - big * 1.65);
      if (!won) { cx.font = "700 13px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#ffb340"; cx.fillText("the assistance meter filled up. nobody came.", W / 2, mid - big * 1.05); }
      cx.fillStyle = CASE; cx.font = "800 " + Math.round(big * 1.4) + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillText(String(score), W / 2, mid);
      cx.font = "700 14px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#c9c4a8";
      cx.fillText("best " + best + "  ·  " + scanned + " scanned  ·  receipt $" + total.toFixed(2), W / 2, mid + big * 0.95);
      cx.fillText(wrongs + " possessed scanned  ·  " + misses + " got away", W / 2, mid + big * 0.95 + 22);
      // the nudge: how far from the best, or how far past it
      const nudge = score > prevBest ? (prevBest > 0 ? "new best. you beat it by " + (score - prevBest) + "." : "first shift logged. now beat it.")
        : score === prevBest ? "tied your best. one more scan next time." : (prevBest - score) + " more to beat your best (" + prevBest + ").";
      cx.font = "800 15px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = score > prevBest ? LIME2 : "#ffb340";
      cx.fillText(nudge, W / 2, mid + big * 0.95 + 46);
      if (performance.now() - endAt > 700) { cx.fillStyle = LIME; cx.font = "800 17px ui-monospace, Menlo, Consolas, monospace"; cx.fillText("tap to work another shift", W / 2, mid + big * 0.95 + 80); }
    }
    if (state === "title") { cx.fillStyle = LIME; cx.font = "800 17px ui-monospace, Menlo, Consolas, monospace"; cx.fillText("tap to start your shift", W / 2, Math.min(H - 40, mid + big * 0.6 + 44 + Math.min(S, 60) + 40)); }
  }
  function draw(time) {
    cx.save();
    if (shake > 0) cx.translate((Math.random() - 0.5) * 10 * shake, (Math.random() - 0.5) * 10 * shake);
    cx.fillStyle = "#0e0f11"; cx.fillRect(-20, -20, W + 40, H + 40);
    // flickering store lights when the meter is high
    const flick = state === "play" && meter > 70 && !reduce && Math.sin(time * 23) > 0.85;
    const g = cx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, flick ? "#141510" : "#1a1c15"); g.addColorStop(1, "#0b0c09");
    cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    drawTill(time);
    drawBelts(time);
    for (const it of items) drawItem(it, time);
    drawFx();
    if (state === "play") drawHud();
    if (state !== "play") overlay(time);
    if (flash > 0) { cx.globalAlpha = flash * 0.9; cx.fillStyle = flashCol; cx.fillRect(0, 0, W, 6); cx.fillRect(0, H - 6, W, 6); cx.fillRect(0, 0, 6, H); cx.fillRect(W - 6, 0, 6, H); cx.globalAlpha = 1; }
    cx.restore();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    update(dt); draw(now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  // test hook for the smoke/screenshot scripts (no effect on play)
  window.__hsc = { state: () => ({ state, t, score, meter, won, scanned, wrongs, misses, items: items.length }) };
})();
