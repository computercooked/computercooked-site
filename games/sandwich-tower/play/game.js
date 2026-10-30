/* sandwich tower — computer cooked games.
   The computer is cooking. Each ingredient slides across above the sandwich; tap to drop it. Whatever hangs over the
   edge is sliced off, so the sandwich gets narrower. Land it dead on for a perfect (three in a row grows it back).
   Miss the sandwich completely and lunch is over. Every 10 layers the chef closes it with bread: order up.
   Sometimes the fridge hands over something that isn't food. Space or Enter drops, M mutes. */
(function () {
  "use strict";
  // ---------- platform sdk: optional, every call guarded ----------
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  let lastScoreSent = 0;
  const sdkScore = (n) => { const t = performance.now(); if (t - lastScoreSent > 400) { lastScoreSent = t; sdk((c) => c.score && c.score(n)); } };

  const cv = document.getElementById("c"), cx = cv.getContext("2d", { alpha: false });
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- palette ----------
  const CASE = "#e6d596", SIDE = "#a6975d", INK = "#0b0c0e", LIME = "#a8d533", LIME2 = "#dcff7a", BAD = "#ff4d5e", PAPER = "#f4f1e6";

  // Pixel font (5x7 with two descender rows, the same table as keyboard escape and elevator), drawn with fillRect.
  const PF = {'A':'50e11111f111111','B':'51e11111e11111e','C':'50e11101010110e','D':'51e11111111111e','E':'51f10101e10101f','F':'51f10101e101010','G':'50e11101711110f','H':'51111111f111111','I':'51f04040404041f','J':'50702020212120c','K':'511121418141211','L':'51010101010101f','M':'5111b1515111111','N':'511191513111111','O':'50e11111111110e','P':'51e11111e101010','Q':'50e11111115120d','R':'51e11111e141211','S':'50f10100e01011e','T':'51f040404040404','U':'51111111111110e','V':'511111111110a04','W':'511111115151b11','X':'511110a040a1111','Y':'511110a04040404','Z':'51f01020408101f','0':'50e11131519110e','1':'5040c040404040e','2':'50e11010204081f','3':'51e01010e01011e','4':'51111111f010101','5':'51f101e0101110e','6':'50e10101e11110e','7':'51f010204080808','8':'50e11110e11110e','9':'50e11110f01010e','a':'500000e010f110f','b':'510101e1111111e','c':'500000e1010100e','d':'501010f1111110f','e':'500000e111f100e','f':'506081e08080808','g':'500000f1111110f010e','h':'510101e11111111','i':'504000c0404040e','j':'502000602020202120c','k':'510101214181412','l':'50c04040404040e','m':'500001a15151515','n':'500001e11111111','o':'500000e1111110e','p':'500001e1111111e1010','q':'500000f1111110f0101','r':'500001619101010','s':'500000f100e011e','t':'508081e08080906','u':'50000111111110f','v':'500001111110a04','w':'50000111115150a','x':'50000110a040a11','y':'50000111111110f010e','z':'500001f0204081f',' ':'30000','.':'100000000000001',',':'20000000000010102',':':'100000100000100','\'':'1010100','’':'1010100','-':'300000000070000','+':'5000004041f0404','!':'101010101010001','?':'50e110204040004','/':'501010204081010','·':'100000000010000','✓':'500010214080000','→':'5000004021f0204','↖':'5001e1814120100','…':'500000000000015','•':'40000060f0f0600','%':'5191a0408161300','(':'301020404040201','▲':'50000040e1f0000','∞':'500000a150a0000',')':'304020101010204','🎃':'70c3e5d7f55633e','👻':'73e7f6b7f7f7f55','🦇':'700416b7f3e1400'};
  const PFG = {};
  function pfGlyph(ch) {
    let g = PFG[ch];
    if (g) return g;
    const s = PF[ch] || PF["?"], w = +s[0], runs = [];
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
  // like fillText with a monospace font of this size, middle baseline; heavy = strokes half a cell wider; cell edges
  // snap to device pixels so rows never show seams. The game never calls fillText (its first call costs ~100 ms).
  function text(str, x, y, size, col, align, weight) {
    str = String(str);
    const u = size / 10, heavy = (weight || 800) >= 800 ? u * 0.45 : 0, q = (v) => Math.round(v * DPR) / DPR;
    let n = 0; for (const ch of str) n += pfGlyph(ch).w + 1;
    const w = Math.max(0, n - 1) * u + heavy;
    let gx = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    const top = y - 3.5 * u;
    cx.fillStyle = col;
    for (const ch of str) {
      const gl = pfGlyph(ch), r = gl.runs;
      for (let i = 0; i < r.length; i += 3) {
        const x0 = q(gx + r[i + 1] * u), y0 = q(top + r[i] * u);
        cx.fillRect(x0, y0, Math.max(1 / DPR, q(gx + (r[i + 1] + r[i + 2]) * u + heavy) - x0), q(top + (r[i] + 1) * u) - y0);
      }
      gx += (gl.w + 1) * u;
    }
  }

  // the chef's face (the brand computer's screen), 16x10
  const FACES = {
    sad: ["................", ".##..........##.", "...##......##...", "................", "..###......###..", "..###......###..", "................", ".....######.....", "....#......#....", "................"],
    happy: ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "...#........#...", "....########....", ".....######.....", "................"],
    shock: ["................", "..###......###..", ".#...#....#...#.", ".#...#....#...#.", "..###......###..", "................", "......####......", ".....#....#.....", "......####......", "................"],
    cooked: ["................", "..#...#..#...#..", "...#.#....#.#...", "....#......#....", "...#.#....#.#...", "..#...#..#...#..", "................", "..#.#.#.#.#.#.#.", ".#.#.#.#.#.#.#..", "................"],
  };

  // ---------- ingredients (h = thickness in layer units) ----------
  const FOOD = ["lettuce", "tomato", "cheese", "ham", "pickle", "lettuce", "cheese", "ham"];
  const CURSED = ["sock", "phone", "fish", "key"];
  const KIND = {
    bread: { h: 1.3, name: "bread" }, lettuce: { h: 0.7, name: "lettuce" }, tomato: { h: 0.8, name: "tomato" }, cheese: { h: 0.6, name: "cheese" },
    ham: { h: 0.7, name: "ham" }, pickle: { h: 0.6, name: "pickles" }, sock: { h: 0.9, name: "a sock?" }, phone: { h: 0.6, name: "someone's phone" },
    fish: { h: 0.9, name: "the fish from the elevator" }, key: { h: 1.0, name: "a keyboard key" },
  };
  const LINES = {
    hello: ["chef computer is cooking.", "one sandwich. tall."],
    perfect: ["perfect.", "chef's kiss.", "that's the one.", "michelin star (fake)."],
    trim: ["a little off the side.", "trim it.", "close enough.", "rustic."],
    big: ["that's a lot of overhang.", "you sliced half of it.", "skinny sandwich now."],
    order: ["order up!", "ding. sandwich done. keep going."],
    sock: ["that's a sock.", "the fridge gave me a sock."], phone: ["is that my phone.", "it has 3% battery."],
    fish: ["the fish again.", "he escaped the elevator."], key: ["a keyboard key. crunchy.", "it's the any key."],
    end: ["lunch is over.", "it fell off. like my career.", "the sandwich has left the plate."],
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- sound ----------
  let actx = null, muted = false;
  try { muted = localStorage.getItem("st-muted") === "1"; } catch (e) {}
  const muteBtn = document.getElementById("mute");
  function syncMute() { muteBtn.textContent = muted ? "sound off" : "sound on"; muteBtn.setAttribute("aria-pressed", muted ? "true" : "false"); }
  syncMute();
  function toggleMute() { muted = !muted; try { localStorage.setItem("st-muted", muted ? "1" : "0"); } catch (e) {} syncMute(); }
  muteBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMute(); });
  muteBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  function tone(freq, dur, type, vol, slide, delay) {
    if (muted) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + (delay || 0);
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  const sfx = {
    plop: () => tone(180, 0.1, "square", 0.06, 110),
    slice: () => tone(900, 0.08, "sawtooth", 0.04, 300),
    perfect: (n) => tone(660 * Math.pow(1.06, Math.min(12, n)), 0.14, "square", 0.05),
    order: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.1, "square", 0.05, 0, i * 0.08)); },
    cursed: () => tone(140, 0.25, "triangle", 0.06, 90),
    end: () => tone(260, 0.8, "sawtooth", 0.06, 40),
  };

  // ---------- layout ----------
  let W = 0, H = 0, DPR = 1, U = 1, LH = 18, BASEW = 240;
  function layout() {
    const phone = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    DPR = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.max(0.75, Math.min(1.6, Math.min(W / 420, H / 720)));
    LH = Math.max(14, Math.min(26, H / 30));
    BASEW = Math.min(W * 0.62, 300);
  }
  window.addEventListener("resize", layout);
  layout();

  // the kitchen wall never changes for a given size: painted once, then blitted
  let bgCache = null, bgKey = "";
  function wall() {
    const key = W + "x" + H + "@" + DPR;
    if (bgCache && bgKey === key) return bgCache;
    bgKey = key; bgCache = bgCache || document.createElement("canvas");
    bgCache.width = Math.max(1, Math.round(W * DPR)); bgCache.height = Math.max(1, Math.round(H * DPR));
    const g = bgCache.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = "#1a1c1a"; g.fillRect(0, 0, W, H);
    const t = Math.round(28 * U);
    for (let y = 0, row = 0; y < H; y += t, row++) for (let x = (row % 2) * -t / 2; x < W; x += t) {
      g.fillStyle = (Math.floor(x / t) + row) % 2 ? "#202321" : "#1d1f1d"; g.fillRect(x + 1, y + 1, t - 2, t - 2);
    }
    // a window with a sliver of moon, a shelf with jars
    const wx = W - 110 * U, wy = 120 * U;
    if (W > 330) {
      g.fillStyle = INK; g.fillRect(wx - 4, wy - 4, 78 * U + 8, 60 * U + 8);
      g.fillStyle = "#14203a"; g.fillRect(wx, wy, 78 * U, 60 * U);
      g.fillStyle = "#e9e1c0"; [[8, 10], [52, 8], [22, 40], [62, 44], [48, 34]].forEach(([a, b]) => g.fillRect(wx + a * U, wy + b * U, 2, 2));
      g.fillStyle = INK; g.fillRect(wx + 38 * U, wy, 3, 60 * U); g.fillRect(wx, wy + 29 * U, 78 * U, 3);
    }
    g.fillStyle = "#4a3320"; g.fillRect(12 * U, 140 * U, 96 * U, 6 * U);
    [["#a8d533", 18], ["#e5484d", 46], ["#f6d84a", 74]].forEach(([c, x]) => { g.fillStyle = INK; g.fillRect(x * U, 112 * U, 22 * U, 28 * U); g.fillStyle = c; g.fillRect(x * U + 2, 118 * U, 22 * U - 4, 20 * U); g.fillStyle = "#c9c4a8"; g.fillRect(x * U + 3, 112 * U + 2, 22 * U - 6, 5 * U); });
    return bgCache;
  }

  // ---------- state ----------
  let state = "title", t = 0, score = 0, best = 0, prevBest = 0, layers = 0, combo = 0, bestCombo = 0, orders = 0;
  let stack = [], debris = [], fx = [], mover = null, camOff = 0, line = pick(LINES.hello), lineT = 0, face = "happy", faceT = 0, shake = 0, startAt = 0, endAt = 0, endT = 0, sinceCursed = 0;
  try { best = +localStorage.getItem("st-best") || 0; } catch (e) {}
  function say(kind, force) { if (force || lineT <= 0.5) { line = pick(LINES[kind]); lineT = 2; } }
  function react(f, s) { face = f; faceT = s; }
  const topY = () => (stack.length ? stack[stack.length - 1].y : 0);
  const top = () => stack[stack.length - 1];

  function nextKind() {
    if (layers > 0 && (layers + 1) % 10 === 0) return "bread";
    sinceCursed++;
    if (layers >= 4 && sinceCursed > 4 && Math.random() < 0.28) { sinceCursed = 0; return pick(CURSED); }
    let k; do { k = pick(FOOD); } while (stack.length && k === top().kind);
    return k;
  }
  function spawnMover() {
    const tp = top(), kind = nextKind(), h = KIND[kind].h * LH;
    const fromLeft = layers % 2 === 0, speed = Math.min(W * 1.25, W * (0.42 + layers * 0.025)) * (0.9 + Math.random() * 0.2);
    mover = { kind, w: tp.w, h, x: fromLeft ? -tp.w * 0.6 : W - tp.w * 0.4, y: tp.y - h - LH * 1.8, vx: fromLeft ? speed : -speed, drop: false, vy: 0 };
    if (CURSED.includes(kind)) { say(kind, true); react("shock", 0.8); sfx.cursed(); }
  }
  function start() {
    state = "play"; t = 0; score = 0; layers = 0; combo = 0; bestCombo = 0; orders = 0; debris = []; fx = []; sinceCursed = 0;
    // the bottom slice of bread sits on the plate
    stack = [{ kind: "bread", x: W / 2 - BASEW / 2, w: BASEW, y: -KIND.bread.h * LH, h: KIND.bread.h * LH, wob: 0 }];
    camOff = targetCam();
    startAt = performance.now(); say("hello", true); react("happy", 0.8);
    sdk((c) => c.start && c.start());
    spawnMover();
  }
  function end() {
    state = "over"; endAt = performance.now(); prevBest = best;
    if (score > best) { best = score; try { localStorage.setItem("st-best", String(best)); } catch (e) {} }
    say("end", true); react("cooked", 99); sfx.end();
    const dur = Math.round(performance.now() - startAt);
    sdk((c) => c.score && c.score(score));
    sdk((c) => c.end && c.end({ score, durationMs: dur, completed: orders > 0 }));
  }

  // ---------- dropping ----------
  function land() {
    const m = mover, tp = top();
    const l = Math.max(m.x, tp.x), r = Math.min(m.x + m.w, tp.x + tp.w), ov = r - l;
    const y = tp.y - m.h;
    if (ov <= 0) { // missed the sandwich
      debris.push({ kind: m.kind, x: m.x, y, w: m.w, h: m.h, vx: m.vx * 0.3, vy: 0, rot: 0, vr: (m.x < tp.x ? -1 : 1) * 3 });
      mover = null; shake = reduce ? 0 : 0.3; endT = 0.9; state = "falling";
      return;
    }
    const tol = Math.max(3, tp.w * 0.035);
    let nx = l, nw = ov;
    if (Math.abs(m.x - tp.x) <= tol) {
      combo++; bestCombo = Math.max(bestCombo, combo); nx = tp.x; nw = tp.w;
      if (combo >= 3) { const g = Math.min(BASEW - nw, BASEW * 0.06); nw += g; nx -= g / 2; }
      score += 1 + Math.min(5, combo); sfx.perfect(combo); say("perfect"); react("happy", 0.6);
      fx.push({ s: combo >= 3 ? "perfect x" + combo + (combo >= 3 ? " · grows" : "") : "perfect" + (combo > 1 ? " x" + combo : ""), x: tp.x + tp.w / 2, y: y - 10, col: LIME2, life: 0.9, max: 0.9, world: true });
    } else {
      combo = 0; score += 1; sfx.slice(); sfx.plop();
      const cut = m.w - ov;
      if (m.x < tp.x) debris.push({ kind: m.kind, x: m.x, y, w: cut, h: m.h, vx: -60, vy: -40, rot: 0, vr: -2.5 });
      else debris.push({ kind: m.kind, x: r, y, w: cut, h: m.h, vx: 60, vy: -40, rot: 0, vr: 2.5 });
      if (cut > tp.w * 0.35) { say("big"); react("shock", 0.6); } else { say("trim"); }
    }
    stack.push({ kind: m.kind, x: nx, w: nw, y, h: m.h, wob: 0.25 });
    layers++;
    if (m.kind === "bread" && layers > 1) {
      orders++; score += 10; sfx.order(); say("order", true); react("happy", 1);
      fx.push({ s: "order up! +10", x: W / 2, y: H * 0.34, col: LIME2, life: 1.4, max: 1.4, big: true });
    }
    sdkScore(score);
    spawnMover();
  }

  // ---------- input ----------
  function press() {
    if (state === "title" || (state === "over" && performance.now() - endAt > 700)) { start(); return; }
    if (state === "play" && mover && !mover.drop) { mover.drop = true; mover.vy = LH * 30; }
  }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { window.focus(); } catch (err) {} press(); });
  function onKey(e) {
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); if (!e.repeat) press(); }
  }
  window.addEventListener("keydown", onKey);
  try {
    const host = window.parent !== window && window.frameElement ? window.parent : null;
    if (host) host.document.addEventListener("keydown", (e) => {
      if (e.target && (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
      const fr = window.frameElement.getBoundingClientRect();
      if (fr.height < 50 || fr.bottom < 50 || fr.top > host.innerHeight - 50) return;
      onKey(e);
    });
  } catch (e) { /* another origin: keys reach the game once it has focus */ }

  // ---------- update ----------
  const targetCam = () => Math.max(H - 70 * U, H * 0.6 - topY());
  function update(dt) {
    lineT -= dt; faceT -= dt; shake = Math.max(0, shake - dt);
    for (const f of fx) f.life -= dt;
    fx = fx.filter((f) => f.life > 0);
    for (const d of debris) { d.vy += H * 2.4 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt; }
    debris = debris.filter((d) => d.y + camOff < H + 200);
    for (const s of stack) if (s.wob > 0) s.wob = Math.max(0, s.wob - dt);
    camOff += (targetCam() - camOff) * Math.min(1, dt * 6);
    if (faceT <= 0) face = combo >= 2 ? "happy" : "sad";
    if (state === "falling") { endT -= dt; if (endT <= 0) end(); return; }
    if (state !== "play") return;
    t += dt;
    const m = mover;
    if (!m) return;
    if (m.drop) {
      m.y += m.vy * dt;
      if (m.y + m.h >= topY()) { m.y = topY() - m.h; land(); }
    } else {
      m.x += m.vx * dt;
      const lo = -m.w * 0.6, hi = W - m.w * 0.4;
      if (m.x < lo) { m.x = lo; m.vx = Math.abs(m.vx); }
      if (m.x > hi) { m.x = hi; m.vx = -Math.abs(m.vx); }
    }
  }

  // ---------- draw ----------
  function drawFace(x, y, w, h, name) {
    const F = FACES[name] || FACES.sad, cw = w / 16, ch = h / 10;
    cx.fillStyle = LIME;
    for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (F[j][i] === "#") cx.fillRect(Math.round(x + i * cw), Math.round(y + j * ch), Math.ceil(cw), Math.ceil(ch));
  }
  // one ingredient slab with its top-left at (x, y)
  function drawSlab(kind, x, y, w, h) {
    const R = (c, a, b, ww, hh) => { cx.fillStyle = c; cx.fillRect(a, b, ww, hh); };
    if (w <= 0) return;
    switch (kind) {
      case "bread":
        R("#8a5a2b", x, y, w, h); R("#d9a35b", x + 2, y + 2, w - 4, h - 4); R("#efcf95", x + 4, y + h * 0.35, w - 8, h * 0.45);
        for (let i = 9; i < w - 6; i += 17) R("#d9a35b", x + i, y + h * 0.45 + (i % 3), 3, 3);
        break;
      case "lettuce":
        R("#3f7f22", x, y, w, h * 0.7); R("#6fbf3a", x, y, w, h * 0.5);
        for (let i = 0; i < w; i += 8) R(i % 16 ? "#6fbf3a" : "#3f7f22", x + i, y + h * 0.6, Math.min(6, w - i), h * (i % 16 ? 0.4 : 0.25));
        break;
      case "tomato":
        R("#9e2a2e", x, y, w, h); R("#e5484d", x + 1, y + 1, w - 2, h - 3);
        for (let i = 6; i < w - 4; i += 13) R("#f6d84a", x + i, y + h * 0.4, 3, 2);
        break;
      case "cheese":
        R("#c99a1e", x, y, w, h); R("#f6c945", x, y, w, h - 2);
        for (let i = 10; i < w - 8; i += 29) { R("#f6c945", x + i, y + h, 8, h * 0.6); R("#f6c945", x + i + 2, y + h * 1.6, 4, h * 0.4); }
        break;
      case "ham":
        R("#c4637c", x, y, w, h); R("#f29bb0", x, y, w, h - 2);
        for (let i = 4; i < w - 10; i += 22) R("#f7c6d2", x + i, y + h * 0.35, 9, 2);
        break;
      case "pickle":
        R("#2f5e1c", x, y, w, h); R("#4f8a32", x, y + 1, w, h - 3);
        for (let i = 5; i < w - 3; i += 11) R("#7fbf5a", x + i, y + 2, 3, 3);
        break;
      case "sock":
        for (let i = 0; i < w; i += 10) R((i / 10) % 2 ? "#e5484d" : PAPER, x + i, y, Math.min(10, w - i), h);
        R(INK, x, y + h - 2, w, 2);
        break;
      case "phone":
        R("#1a1b1f", x, y, w, h); R("#3d6be0", x + 6, y + 2, Math.max(0, w - 12), h - 4);
        if (w > 20) R(LIME, x + w - 12, y + 3, 3, 3);
        break;
      case "fish":
        R("#5f7387", x, y, w, h); R("#9fb3c8", x + 2, y + 1, w - 4, h * 0.6);
        if (w > 24) { R(INK, x + w - 9, y + h * 0.25, 3, 3); R("#5f7387", x - 6, y + 2, 6, h - 4); R("#5f7387", x - 10, y, 4, h); }
        break;
      case "key":
        R("#9b978a", x, y, w, h); R(PAPER, x + 3, y, Math.max(0, w - 6), h * 0.7);
        if (w > 18) text(w > 60 ? "any" : "Q", x + w / 2, y + h * 0.36, Math.min(h * 0.55, 14), INK, "center", 800);
        break;
    }
  }
  function draw(time) {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.drawImage(wall(), 0, 0, W, H);
    cx.save();
    if (shake > 0) cx.translate((Math.random() - 0.5) * 14 * shake, (Math.random() - 0.5) * 14 * shake);
    const o = camOff;
    // counter and plate
    const plateY = o;
    if (plateY < H + 40) {
      cx.fillStyle = "#3b2a1c"; cx.fillRect(0, plateY + 10, W, H);
      cx.fillStyle = "#5a4029"; cx.fillRect(0, plateY + 10, W, 6);
      cx.fillStyle = INK; cx.fillRect(W / 2 - BASEW * 0.68, plateY - 1, BASEW * 1.36, 10);
      cx.fillStyle = "#e9e6dc"; cx.fillRect(W / 2 - BASEW * 0.66, plateY, BASEW * 1.32, 6);
      cx.fillStyle = "#c9c4b4"; cx.fillRect(W / 2 - BASEW * 0.5, plateY + 6, BASEW, 3);
    }
    // the stack (only what's on screen)
    for (let i = stack.length - 1; i >= 0; i--) {
      const s = stack[i], sy = s.y + o;
      if (sy > H + 10) break;
      if (sy + s.h < -40) continue;
      const wob = s.wob > 0 && !reduce ? Math.sin(s.wob * 40) * s.wob * 6 : 0;
      drawSlab(s.kind, s.x + wob, sy, s.w, s.h);
    }
    // the falling ones
    for (const d of debris) {
      cx.save(); cx.translate(d.x + d.w / 2, d.y + o + d.h / 2); cx.rotate(d.rot);
      cx.translate(-d.x - d.w / 2, -d.y - o - d.h / 2); drawSlab(d.kind, d.x, d.y + o, d.w, d.h); cx.restore();
    }
    // the next ingredient, with a shadow guide where it would land
    if (mover && state === "play") {
      const m = mover, tp = top();
      cx.globalAlpha = 0.18; cx.fillStyle = PAPER; cx.fillRect(m.x, tp.y + o - 3, m.w, 3); cx.globalAlpha = 1;
      drawSlab(m.kind, m.x, m.y + o, m.w, m.h);
      if (!m.drop && CURSED.includes(m.kind)) text(KIND[m.kind].name, Math.max(70, Math.min(W - 70, m.x + m.w / 2)), m.y + o - 14, 13, "#ffb340", "center", 800);
    }
    for (const f of fx) {
      const k = 1 - f.life / f.max; cx.globalAlpha = 1 - k;
      text(f.s, Math.max(60, Math.min(W - 60, f.x)), (f.world ? f.y + o : f.y) - k * 26, f.big ? 24 : 15, f.col, "center", 900);
    }
    cx.globalAlpha = 1;
    cx.restore();
    drawHud(time);
    if (state === "title" || state === "over") overlay();
  }
  function drawHud(time) {
    // the chef: the computer cooked computer in a chef's hat, top centre
    const pw = Math.min(150 * U, W * 0.34), ph = pw * 0.6, px = (W - pw) / 2, py = pw * 0.24 + 12;
    cx.fillStyle = INK; cx.fillRect(px + pw * 0.2 - 3, py - pw * 0.24 - 3, pw * 0.56 + 6, pw * 0.27 + 6);
    cx.fillStyle = PAPER; cx.fillRect(px + pw * 0.2, py - pw * 0.24, pw * 0.56, pw * 0.27);
    cx.fillStyle = "#d8d3c4"; cx.fillRect(px + pw * 0.2, py - 6, pw * 0.56, 4);
    cx.fillStyle = INK; cx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    cx.fillStyle = CASE; cx.fillRect(px, py, pw, ph);
    cx.fillStyle = SIDE; cx.fillRect(px + pw - 6, py, 6, ph);
    cx.fillStyle = INK; cx.fillRect(px + 7, py + 7, pw - 20, ph - 16);
    const fw = (pw - 20) * 0.7, fh = fw * 10 / 16;
    drawFace(px + 7 + (pw - 20 - fw) / 2, py + 7 + (ph - 16 - fh) / 2, fw, fh, face);
    text(String(score), 14, 22, 22, CASE, "left", 800);
    text(layers + " layers" + (orders ? " · " + orders + " order" + (orders > 1 ? "s" : "") : ""), 14, 44, 12, "#8a8e80", "left", 700);
    if (combo >= 2 && state === "play") text("perfect x" + combo, W - 14, 64, 13, LIME2, "right", 800);
    if (lineT > 0 || state === "play") text(line, W / 2, py + ph + 16, Math.max(11, Math.min(15, W / 30)), PAPER, "center", 700);
  }
  function overlay() {
    cx.fillStyle = "rgba(8, 9, 7, 0.8)"; cx.fillRect(0, 0, W, H);
    const big = Math.round(Math.max(28, Math.min(52, W / 9))), mid = H * 0.44;
    if (state === "title") {
      text("sandwich", W / 2, mid - big * 2.2, big, CASE, "center", 900);
      text("tower", W / 2, mid - big * 1.1, big, LIME, "center", 900);
      text("the computer is cooking. you are stacking.", W / 2, mid - big * 0.2, Math.max(12, Math.min(16, W / 30)), "#c9c4a8", "center", 700);
      const sw = Math.min(150, W * 0.4), sx = W / 2 - sw / 2;
      let y = mid + 64;
      [["bread", 0], ["tomato", 6], ["cheese", -4], ["lettuce", 3], ["bread", 0]].forEach(([k, dx]) => { const h = KIND[k].h * 14; y -= h; drawSlab(k, sx + dx, y, sw, h); });
      text("tap to drop. whatever hangs over gets sliced off.", W / 2, mid + 92, Math.max(11, Math.min(15, W / 31)), LIME2, "center", 800);
      text("land it dead on: perfect. miss: lunch is over.", W / 2, mid + 116, Math.max(11, Math.min(14, W / 33)), "#ffb340", "center", 700);
      text("tap to start cooking", W / 2, Math.min(H - 40, mid + 166), 18, LIME, "center", 900);
    } else {
      text("lunch is over", W / 2, mid - big * 1.6, big, BAD, "center", 900);
      text(layers + " layers tall", W / 2, mid - big * 0.7, Math.round(big * 0.6), PAPER, "center", 800);
      text(String(score), W / 2, mid + big * 0.35, Math.round(big * 1.3), CASE, "center", 900);
      text("best " + best + "  ·  best streak " + bestCombo + "  ·  " + orders + " order" + (orders === 1 ? "" : "s") + " up", W / 2, mid + big * 1.25, 14, "#c9c4a8", "center", 700);
      const nudge = score > prevBest ? (prevBest > 0 ? "new best. you beat it by " + (score - prevBest) + "." : "first sandwich logged. now beat it.")
        : score === prevBest ? "tied your best. one more layer next time." : (prevBest - score) + " more to beat your best (" + prevBest + ").";
      text(nudge, W / 2, mid + big * 1.25 + 24, 15, score > prevBest ? LIME2 : "#ffb340", "center", 800);
      if (performance.now() - endAt > 700) text("tap to cook again", W / 2, mid + big * 1.25 + 66, 18, LIME, "center", 900);
    }
  }

  // the title draws one frame, then waits for a tap or key (no demo running while the page loads); play always runs
  let last = performance.now(), frames = 0, awake = false, running = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; frames++;
    update(dt); draw(now / 1000);
    if (!awake && state === "title" && frames > 1) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function wake() { awake = true; if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, wake, true));
  try { if (window.frameElement) window.parent.document.addEventListener("keydown", wake, true); } catch (e) {}
  window.addEventListener("resize", () => { if (!running) draw(performance.now() / 1000); });
  requestAnimationFrame(frame);

  // read-only hooks for the test scripts
  window.__st = { state: () => ({ state, t, score, layers, combo, orders, mover: mover && { x: mover.x, w: mover.w, kind: mover.kind, drop: mover.drop }, top: stack.length ? { x: top().x, w: top().w } : null }) };
})();
