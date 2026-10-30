/* elevator full of fish — computer cooked games.
   Get to floor 9. At every floor the doors open and fish leap in. Tap a fish to fling it out of the open doors.
   The car only moves when the fish weigh less than the limit; over it, OVERLOAD, the doors stay open and the clock
   keeps running. Golden fish are worth more, pufferfish puff up if you tap them twice (heavier, unflingable for a
   moment), sharks take three taps. The ride is 75 seconds; floor 9 is the goal and the building keeps going.
   Space flings the fish nearest the doors (and starts / retries), M mutes. */
(function () {
  "use strict";
  // ---------- platform sdk: optional, every call guarded ----------
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  let lastScoreSent = 0;
  const sdkScore = (n) => { const t = performance.now(); if (t - lastScoreSent > 400) { lastScoreSent = t; sdk((c) => c.score && c.score(n)); } };

  const cv = document.getElementById("c"), cx = cv.getContext("2d");
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const RIDE = 75, CAP = 10, GOAL = 9;

  // ---------- palette ----------
  const CASE = "#e6d596", SIDE = "#a6975d", INK = "#0b0c0e", LIME = "#a8d533", LIME2 = "#dcff7a", BAD = "#ff4d5e", PAPER = "#f4f1e6";
  const STEEL = "#3a3f47", STEEL2 = "#2b2f36", STEEL3 = "#4c535d", BRASS = "#c9a23f", CARPET = "#5b2a3a", CARPET2 = "#4a2230";

  // ---------- fish, drawn by hand (16x9), built as fillRect runs ----------
  const PAL = { K: INK, w: "#f4f1e6", e: INK, S: "#9fb3c8", s: "#5f7387", T: "#7fbf5a", t: "#4f8a32", P: "#f29bb0", p: "#c4637c",
    G: "#f6d84a", g: "#c9a628", U: "#e8c06a", u: "#b08a3c", X: "#7f8a96", x: "#5a646f", R: "#e5484d" };
  const BODY = [
    "................",
    "....KKKKKK....K.",
    "..KK111111KK.K1K",
    ".K1w11111111K11K",
    "K1ee1111111111K.",
    "K11111222222K11K",
    ".K122222222K.K1K",
    "..KK222222KK..K.",
    "....KKKKKK......",
  ];
  const SHARK = [
    "..........K.........",
    ".........K1K........",
    "........K11K......K.",
    "...KKKKK111KKKK..K1K",
    ".KK1111111111111KK1K",
    "K1w1111111111111111K",
    "K1ee11111111111111K.",
    "KRRR1222222222222K1K",
    ".KK22222222222KKK.K1K",
    "...KKKKKKKKKKK.....K",
  ];
  function build(rows, a, b) {
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length;) {
        let ch = row[x]; if (ch === ".") { x++; continue; }
        let e = x + 1; while (e < row.length && row[e] === ch) e++;
        g.fillStyle = ch === "1" ? a : ch === "2" ? b : PAL[ch]; g.fillRect(x, y, e - x, 1); x = e;
      }
    });
    return c;
  }
  const KINDS = {
    sardine: { spr: build(BODY, PAL.S, PAL.s), w: 1, pts: 1, size: 0.8, taps: 1 },
    trout: { spr: build(BODY, PAL.T, PAL.t), w: 2, pts: 1, size: 1, taps: 1 },
    salmon: { spr: build(BODY, PAL.P, PAL.p), w: 3, pts: 2, size: 1.2, taps: 1 },
    golden: { spr: build(BODY, PAL.G, PAL.g), w: 1, pts: 5, size: 0.9, taps: 1 },
    puffer: { spr: build(BODY, PAL.U, PAL.u), w: 2, pts: 2, size: 0.95, taps: 1 },
    shark: { spr: build(SHARK, PAL.X, PAL.x), w: 6, pts: 6, size: 1.9, taps: 3 },
  };
  // the floor display's face (the brand computer's screen), 16x10
  const FACES = {
    sad: ["................", ".##..........##.", "...##......##...", "................", "..###......###..", "..###......###..", "................", ".....######.....", "....#......#....", "................"],
    happy: ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "...#........#...", "....########....", ".....######.....", "................"],
    shock: ["................", "..###......###..", ".#...#....#...#.", ".#...#....#...#.", "..###......###..", "................", "......####......", ".....#....#.....", "......####......", "................"],
    cooked: ["................", "..#...#..#...#..", "...#.#....#.#...", "....#......#....", "...#.#....#.#...", "..#...#..#...#..", "................", "..#.#.#.#.#.#.#.", ".#.#.#.#.#.#.#..", "................"],
  };
  const FLOORS = ["lobby", "accounting", "the aquarium", "sushi bar", "dentist", "a pond, somehow", "fish market", "hr (fish)", "the roof", "the ocean", "more ocean", "fish heaven", "the sun", "floor ∞"];
  const LINES = {
    hello: ["going up. with fish.", "please fling responsibly."],
    open: ["ding.", "doors opening. brace.", "more fish. great.", "this floor smells."],
    over: ["OVERLOAD. too much fish.", "the cable is groaning.", "remove fish to continue."],
    up: ["going up.", "smooth. smells awful, but smooth."],
    goal: ["floor 9. you made it. it keeps going though."],
    end: ["out of time. the fish win.", "the elevator has retired.", "please take the stairs."],
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- sound ----------
  let actx = null, muted = false;
  try { muted = localStorage.getItem("eff-muted") === "1"; } catch (e) {}
  const muteBtn = document.getElementById("mute");
  function syncMute() { muteBtn.textContent = muted ? "sound off" : "sound on"; muteBtn.setAttribute("aria-pressed", muted ? "true" : "false"); }
  syncMute();
  function toggleMute() { muted = !muted; try { localStorage.setItem("eff-muted", muted ? "1" : "0"); } catch (e) {} syncMute(); }
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
    ding: () => { tone(1320, 0.5, "sine", 0.07); tone(990, 0.6, "sine", 0.05, 0, 0.18); },
    fling: () => tone(520, 0.12, "triangle", 0.06, 1100),
    slap: () => tone(160, 0.07, "square", 0.05, 90),
    bonk: () => tone(120, 0.1, "square", 0.06, 70),
    puff: () => tone(300, 0.2, "sine", 0.06, 700),
    over: () => { tone(110, 0.4, "sawtooth", 0.07); },
    up: () => tone(220, 0.6, "sine", 0.03, 330),
    goal: () => { [880, 1100, 1320, 1760].forEach((f, i) => tone(f, 0.12, "square", 0.05, 0, i * 0.09)); },
    end: () => tone(240, 0.7, "sawtooth", 0.06, 50),
  };

  // ---------- layout: a front view of the car ----------
  let W = 0, H = 0, DPR = 1, U = 1, L = {};
  function layout() {
    const phone = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    DPR = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.max(0.75, Math.min(1.6, Math.min(W / 420, H / 720)));
    const top = 118 * Math.min(1.2, U);
    const carH = H - top - 16;
    L = {
      top, carH,
      backL: W * 0.2, backR: W * 0.8, backT: top + carH * 0.06, backB: top + carH * 0.56,
      floorB: H - 16,
    };
    L.doorL = W * 0.32; L.doorR = W * 0.68; L.doorT = L.backT + carH * 0.07;
    L.fish = Math.round(Math.max(40, Math.min(84, W / 7.5)));
  }
  window.addEventListener("resize", layout);
  layout();

  // ---------- state ----------
  let state = "title", t = 0, floor = 1, score = 0, best = 0, prevBest = 0, flung = 0, fish = [], fx = [];
  let phase = "open", phaseT = 0, door = 0, overloads = 0, reachedGoal = false, line = pick(LINES.hello), lineT = 0, face = "sad", faceT = 0, shake = 0, startAt = 0, endAt = 0, travel = 0;
  try { best = +localStorage.getItem("eff-best") || 0; } catch (e) {}
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  function say(kind, force) { if (force || lineT <= 0.4) { line = pick(LINES[kind]); lineT = 2.2; } }
  function react(f, s) { face = f; faceT = s; }
  const weight = () => fish.reduce((s, f) => s + (f.out ? 0 : KINDS[f.kind].w * (f.puffT > 0 ? 2 : 1)), 0);
  const openTime = () => Math.max(1.7, 3.3 - floor * 0.11);

  function spawnFish() {
    const n = Math.min(9, 2 + Math.floor(floor / 1.6) + (Math.random() < 0.4 ? 1 : 0));
    let sharks = fish.filter((f) => f.kind === "shark" && !f.out).length;
    for (let i = 0; i < n; i++) {
      let kind = "trout";
      const r = Math.random();
      if (floor >= 6 && r < 0.12 && sharks < 2) { kind = "shark"; sharks++; }
      else if (r < 0.2) kind = "golden";
      else if (floor >= 3 && r < 0.38) kind = "puffer";
      else if (r < 0.6) kind = "sardine";
      else if (r < 0.8) kind = "trout";
      else kind = "salmon";
      const k = KINDS[kind];
      fish.push({
        kind, x: W / 2 + (Math.random() - 0.5) * (L.doorR - L.doorL) * 0.6, y: L.doorT + 40, vx: (Math.random() - 0.5) * W * 0.9, vy: -H * (0.25 + Math.random() * 0.2),
        rest: Math.random(), flip: Math.random() < 0.5, flopIn: 0.3 + Math.random(), out: false, outT: 0, hits: 0, puffT: 0, tapT: -9, size: k.size, delay: i * 0.12,
      });
    }
  }

  function start() {
    state = "play"; t = 0; floor = 1; score = 0; flung = 0; fish = []; fx = []; overloads = 0; reachedGoal = false; travel = 0;
    phase = "open"; phaseT = 0; door = 0;
    startAt = performance.now(); say("hello", true); react("happy", 0.6); sfx.ding();
    sdk((c) => c.start && c.start());
    spawnFish();
  }
  function end() {
    state = "over"; endAt = performance.now(); prevBest = best;
    if (score > best) { best = score; try { localStorage.setItem("eff-best", String(best)); } catch (e) {} }
    say("end", true); react("cooked", 99); sfx.end();
    const dur = Math.round(performance.now() - startAt);
    sdk((c) => c.score && c.score(score));
    sdk((c) => c.end && c.end({ score, durationMs: dur, completed: reachedGoal }));
  }

  // ---------- input ----------
  function fishAt(px, py) {
    let best = null, bd = Infinity;
    for (const f of fish) {
      if (f.out || f.delay > 0) continue;
      const s = L.fish * f.size * (f.puffT > 0 ? 1.4 : 1);
      const d = Math.hypot(px - f.x, (py - f.y) * 1.3);
      if (d < s * 0.75 && d < bd) { bd = d; best = f; }
    }
    return best;
  }
  function tapFish(f) {
    const k = KINDS[f.kind];
    if (f.kind === "puffer") {
      if (f.puffT > 0) { sfx.bonk(); fx.push({ type: "text", x: f.x, y: f.y - 30, s: "too puffy", col: "#ffb340", life: 0.6, max: 0.6 }); return; }
      if (t - f.tapT < 0.45) { f.puffT = 2.2; sfx.puff(); fx.push({ type: "text", x: f.x, y: f.y - 30, s: "PUFF", col: "#ffb340", life: 0.7, max: 0.7 }); return; }
    }
    f.tapT = t;
    if (door < 0.6) { // doors shut: the fish bonks off them
      f.vy = -H * 0.5; f.vx = (W / 2 - f.x) * 0.3; sfx.bonk();
      fx.push({ type: "text", x: f.x, y: f.y - 30, s: "bonk", col: PAPER, life: 0.5, max: 0.5 });
      return;
    }
    f.hits++;
    if (f.hits < k.taps) { f.vy = -H * 0.35; sfx.slap(); fx.push({ type: "text", x: f.x, y: f.y - 30, s: (k.taps - f.hits) + " more", col: PAPER, life: 0.5, max: 0.5 }); return; }
    f.out = true; f.outT = 0; f.ox = f.x; f.oy = f.y;
    flung++; score += k.pts; sfx.fling();
    fx.push({ type: "text", x: f.x, y: f.y - 30, s: "+" + k.pts, col: f.kind === "golden" ? "#f6d84a" : LIME2, life: 0.6, max: 0.6 });
    sdkScore(score);
  }
  function press(px, py) {
    if (state !== "play") { if (state === "over" && performance.now() - endAt < 700) return; start(); return; }
    const f = fishAt(px, py);
    if (f) tapFish(f);
  }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { window.focus(); } catch (err) {} press(e.clientX, e.clientY); });
  function onKey(e) {
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault(); if (e.repeat) return;
      if (state !== "play") { press(-1, -1); return; }
      let pickF = null, bd = Infinity;
      for (const f of fish) { if (f.out || f.delay > 0 || f.puffT > 0) continue; const d = Math.abs(f.x - W / 2) + Math.abs(f.y - L.backB); if (d < bd) { bd = d; pickF = f; } }
      if (pickF) tapFish(pickF);
    }
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
  function updateFish(dt) {
    const g = H * 2.2, left = W * 0.06, right = W * 0.94;
    for (const f of fish) {
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (f.out) { f.outT += dt; continue; }
      if (f.puffT > 0) f.puffT -= dt;
      const floorY = lerp(L.backB + L.fish * 0.45, L.floorB - L.fish * 0.35, f.rest);
      f.vy += g * dt; f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.y > floorY) { f.y = floorY; f.vy = -Math.abs(f.vy) * 0.35; f.vx *= 0.8; if (Math.abs(f.vy) < 40) f.vy = 0; }
      if (f.x < left) { f.x = left; f.vx = Math.abs(f.vx) * 0.6; }
      if (f.x > right) { f.x = right; f.vx = -Math.abs(f.vx) * 0.6; }
      f.flopIn -= dt;
      if (f.flopIn <= 0 && f.y >= floorY - 1) {
        f.flopIn = 0.5 + Math.random() * 1.2;
        f.vy = -H * (0.25 + Math.random() * 0.35) * (f.kind === "shark" ? 0.5 : 1); f.vx = (Math.random() - 0.5) * W * 0.6; f.flip = f.vx < 0;
        if (Math.random() < 0.3) sfx.slap();
      }
    }
    fish = fish.filter((f) => !(f.out && f.outT > 0.5));
  }
  function update(dt) {
    lineT -= dt; faceT -= dt; shake = Math.max(0, shake - dt);
    for (const f of fx) f.life -= dt;
    fx = fx.filter((f) => f.life > 0);
    if (state !== "play") { updateFish(dt); door = Math.max(0, door - dt * 3); return; }
    t += dt;
    if (t >= RIDE) { end(); return; }
    phaseT += dt;
    if (phase === "open") {
      door = Math.min(1, door + dt * 3);
      if (phaseT >= openTime()) {
        if (weight() > CAP) { phase = "over"; phaseT = 0; overloads++; say("over", true); react("shock", 0.9); sfx.over(); shake = reduce ? 0 : 0.25; }
        else { phase = "close"; phaseT = 0; }
      }
    } else if (phase === "over") {
      if (phaseT >= 1) { if (weight() > CAP) { phaseT = 0; sfx.over(); say("over"); } else { phase = "close"; phaseT = 0; } }
    } else if (phase === "close") {
      door = Math.max(0, door - dt * 3);
      if (door <= 0) { phase = "travel"; phaseT = 0; sfx.up(); say("up"); }
    } else if (phase === "travel") {
      travel += dt;
      if (phaseT >= 0.8) {
        floor++; score += 10; phase = "open"; phaseT = 0; sfx.ding(); say("open"); react("happy", 0.5);
        fx.push({ type: "text", x: W / 2, y: L.backT + 24, s: "+10 floor " + floor, col: LIME2, life: 0.9, max: 0.9 });
        if (floor === GOAL && !reachedGoal) { reachedGoal = true; score += 50; sfx.goal(); say("goal", true); fx.push({ type: "text", x: W / 2, y: L.backT + L.carH * 0.25, s: "FLOOR 9! +50", col: LIME2, life: 1.8, max: 1.8, big: true }); }
        spawnFish();
        sdkScore(score);
      }
    }
    if (faceT <= 0) face = weight() > CAP ? "shock" : "sad";
    updateFish(dt);
  }

  // ---------- draw ----------
  // Pixel font (5x7 with two descender rows, the same table as keyboard escape), drawn with fillRect. The first canvas
  // fillText in a document resolves the font stack (~100 ms on a phone), so the game never calls it.
  const PF = {'A':'50e11111f111111','B':'51e11111e11111e','C':'50e11101010110e','D':'51e11111111111e','E':'51f10101e10101f','F':'51f10101e101010','G':'50e11101711110f','H':'51111111f111111','I':'51f04040404041f','J':'50702020212120c','K':'511121418141211','L':'51010101010101f','M':'5111b1515111111','N':'511191513111111','O':'50e11111111110e','P':'51e11111e101010','Q':'50e11111115120d','R':'51e11111e141211','S':'50f10100e01011e','T':'51f040404040404','U':'51111111111110e','V':'511111111110a04','W':'511111115151b11','X':'511110a040a1111','Y':'511110a04040404','Z':'51f01020408101f','0':'50e11131519110e','1':'5040c040404040e','2':'50e11010204081f','3':'51e01010e01011e','4':'51111111f010101','5':'51f101e0101110e','6':'50e10101e11110e','7':'51f010204080808','8':'50e11110e11110e','9':'50e11110f01010e','a':'500000e010f110f','b':'510101e1111111e','c':'500000e1010100e','d':'501010f1111110f','e':'500000e111f100e','f':'506081e08080808','g':'500000f1111110f010e','h':'510101e11111111','i':'504000c0404040e','j':'502000602020202120c','k':'510101214181412','l':'50c04040404040e','m':'500001a15151515','n':'500001e11111111','o':'500000e1111110e','p':'500001e1111111e1010','q':'500000f1111110f0101','r':'500001619101010','s':'500000f100e011e','t':'508081e08080906','u':'50000111111110f','v':'500001111110a04','w':'50000111115150a','x':'50000110a040a11','y':'50000111111110f010e','z':'500001f0204081f',' ':'30000','.':'100000000000001',',':'20000000000010102',':':'100000100000100','\'':'1010100','’':'1010100','-':'300000000070000','+':'5000004041f0404','!':'101010101010001','?':'50e110204040004','/':'501010204081010','·':'100000000010000','✓':'500010214080000','→':'5000004021f0204','↖':'5001e1814120100','…':'500000000000015','•':'40000060f0f0600','(':'301020404040201','▲':'50000040e1f0000','∞':'500000a150a0000',')':'304020101010204','🎃':'70c3e5d7f55633e','👻':'73e7f6b7f7f7f55','🦇':'700416b7f3e1400'};
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
  // snap to device pixels so rows never show seams
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
  function drawFace(x, y, w, h, name) {
    const F = FACES[name] || FACES.sad, cw = w / 16, ch = h / 10;
    cx.fillStyle = LIME;
    for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (F[j][i] === "#") cx.fillRect(Math.round(x + i * cw), Math.round(y + j * ch), Math.ceil(cw), Math.ceil(ch));
  }
  // the car's walls, rails, carpet and back wall never change for a given size: painted once, then blitted
  let carCache = null, carKey = "";
  function carShell() {
    const key = W + "x" + H + "@" + DPR;
    if (carCache && carKey === key) return carCache;
    carKey = key; carCache = carCache || document.createElement("canvas");
    carCache.width = Math.max(1, Math.round(W * DPR)); carCache.height = Math.max(1, Math.round(H * DPR));
    const g = carCache.getContext("2d");
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = "#121315"; g.fillRect(0, 0, W, H);
    // walls in perspective
    g.fillStyle = STEEL2; g.fillRect(0, L.top, W, H - L.top);
    g.fillStyle = STEEL; g.beginPath(); g.moveTo(0, L.top); g.lineTo(L.backL, L.backT); g.lineTo(L.backL, L.backB); g.lineTo(0, H); g.fill();
    g.beginPath(); g.moveTo(W, L.top); g.lineTo(L.backR, L.backT); g.lineTo(L.backR, L.backB); g.lineTo(W, H); g.fill();
    // handrails
    g.fillStyle = BRASS;
    g.beginPath(); g.moveTo(0, L.top + L.carH * 0.5); g.lineTo(L.backL, L.backT + (L.backB - L.backT) * 0.62); g.lineTo(L.backL, L.backT + (L.backB - L.backT) * 0.62 + 3); g.lineTo(0, L.top + L.carH * 0.5 + 6); g.fill();
    g.beginPath(); g.moveTo(W, L.top + L.carH * 0.5); g.lineTo(L.backR, L.backT + (L.backB - L.backT) * 0.62); g.lineTo(L.backR, L.backT + (L.backB - L.backT) * 0.62 + 3); g.lineTo(W, L.top + L.carH * 0.5 + 6); g.fill();
    // floor (carpet)
    g.fillStyle = CARPET; g.beginPath(); g.moveTo(0, H); g.lineTo(L.backL, L.backB); g.lineTo(L.backR, L.backB); g.lineTo(W, H); g.fill();
    g.fillStyle = CARPET2; for (let i = 1; i < 6; i++) { const y = L.backB + (H - L.backB) * (i / 6) ** 1.4; g.fillRect(0, y, W, 2); }
    // back wall
    g.fillStyle = STEEL3; g.fillRect(L.backL, L.backT, L.backR - L.backL, L.backB - L.backT);
    return carCache;
  }
  function drawCar(time) {
    const jx = phase === "travel" && state === "play" && !reduce ? Math.sin(time * 50) * 1.5 : 0;
    cx.save(); cx.translate(jx, 0);
    cx.drawImage(carShell(), 0, 0, W, H);
    // the hallway beyond the doors
    const dw = L.doorR - L.doorL, dh = L.backB - L.doorT;
    const hue = (floor * 47) % 360;
    cx.fillStyle = "hsl(" + hue + ", 30%, 22%)"; cx.fillRect(L.doorL, L.doorT, dw, dh);
    cx.fillStyle = "hsl(" + hue + ", 30%, 30%)"; cx.fillRect(L.doorL, L.doorT + dh * 0.72, dw, dh * 0.28);
    text(FLOORS[Math.min(FLOORS.length - 1, floor - 1)], L.doorL + dw / 2, L.doorT + dh * 0.35, Math.max(11, 14 * U), "hsl(" + hue + ", 40%, 70%)", "center", 800);
    // doors sliding
    const half = dw / 2 * (1 - door);
    cx.fillStyle = "#8b939e"; cx.fillRect(L.doorL, L.doorT, half, dh); cx.fillRect(L.doorR - half, L.doorT, half, dh);
    cx.fillStyle = "#6e7680"; cx.fillRect(L.doorL + half - 3, L.doorT, 3, dh); cx.fillRect(L.doorR - half, L.doorT, 3, dh);
    cx.fillStyle = INK; cx.fillRect(L.doorL - 4, L.doorT - 4, dw + 8, 4); cx.fillRect(L.doorL - 4, L.doorT, 4, dh); cx.fillRect(L.doorR, L.doorT, 4, dh);
    // weight gauge on the right wall
    const gx = L.backR + 10, gy = L.backT + 8, gh = (L.backB - L.backT) * 0.8, gw = 14;
    if (W - gx > 30) {
      const wv = weight(), k = Math.min(1.3, wv / CAP);
      cx.fillStyle = INK; cx.fillRect(gx - 2, gy - 2, gw + 4, gh + 4);
      cx.fillStyle = "#1c1e18"; cx.fillRect(gx, gy, gw, gh);
      cx.fillStyle = wv > CAP ? BAD : wv > CAP * 0.75 ? "#ffb340" : LIME;
      const fh = gh * Math.min(1, k / 1.3); cx.fillRect(gx, gy + gh - fh, gw, fh);
      cx.fillStyle = PAPER; cx.fillRect(gx - 4, gy + gh - gh / 1.3, gw + 8, 2);
      text(wv + "/" + CAP, gx + gw / 2, gy + gh + 12, 11, wv > CAP ? BAD : "#c9c4a8", "center", 800);
    }
    cx.restore();
  }
  function drawPanel(time) {
    // the floor display above the car: the computer cooked computer
    const pw = Math.min(170 * U, W * 0.38), ph = pw * 0.6, px = (W - pw) / 2, py = 8;
    cx.fillStyle = INK; cx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    cx.fillStyle = CASE; cx.fillRect(px, py, pw, ph);
    cx.fillStyle = SIDE; cx.fillRect(px + pw - 6, py, 6, ph);
    const sx = px + 7, sy = py + 7, sw = pw - 20, sh = ph - 16;
    cx.fillStyle = INK; cx.fillRect(sx, sy, sw, sh);
    const fw = sw * 0.45, fh = fw * 10 / 16;
    drawFace(sx + 4, sy + (sh - fh) / 2, fw, fh, face);
    text(String(floor), sx + sw * 0.75, sy + sh / 2 + 2, sh * 0.62, LIME, "center", 900);
    text(phase === "travel" && state === "play" ? "▲" : "", sx + sw * 0.75, sy + sh * 0.13, sh * 0.2, LIME2, "center", 900);
    // steam
    if (!reduce) { cx.fillStyle = LIME; for (let i = 0; i < 3; i++) { const p = (time * 16 + i * 8) % 14; cx.globalAlpha = 0.5 - p / 30; cx.fillRect(px + pw * (0.3 + i * 0.2), py - 4 - p, 3, 6); } cx.globalAlpha = 1; }
    // hud: score, clock, goal
    text(String(score), 14, 22, 22, CASE, "left", 800);
    text("goal: floor " + GOAL + (reachedGoal ? " ✓" : ""), 14, 46, 12, reachedGoal ? LIME2 : "#8a8e80", "left", 700);
    const left = Math.max(0, RIDE - t);
    text(Math.ceil(left) + "s", W - 14, 64, 14, left < 10 ? BAD : "#c9c4a8", "right", 800);
    // speech line under the display
    if (lineT > 0 || state === "play") {
      const isWarn = /[A-Z]{4}/.test(line);
      text(line, W / 2, py + ph + 18, Math.max(11, Math.min(15, W / 30)), isWarn ? BAD : PAPER, "center", 700);
    }
    if (phase === "over" && state === "play") {
      const pulse = reduce ? 1 : 0.6 + 0.4 * Math.abs(Math.sin(time * 8));
      cx.globalAlpha = pulse; const oy = L.backB - (L.backB - L.doorT) * 0.18, os = Math.max(24, 34 * U); cx.fillStyle = INK; cx.fillRect(L.doorL - 30, oy - os * 0.65, L.doorR - L.doorL + 60, os * 1.3); text("OVERLOAD", W / 2, oy, os, BAD, "center", 900); cx.globalAlpha = 1;
    }
  }
  function drawFish() {
    cx.imageSmoothingEnabled = false;
    // far (higher on screen) first
    const list = fish.filter((f) => f.delay <= 0).sort((a, b) => a.y - b.y);
    for (const f of list) {
      const k = KINDS[f.kind];
      let s = L.fish * f.size * (f.puffT > 0 ? 1.4 : 1) * (0.8 + 0.3 * f.rest), x = f.x, y = f.y, alpha = 1;
      if (f.out) { const p = Math.min(1, f.outT / 0.45); x = lerp(f.ox, W / 2, p); y = lerp(f.oy, L.doorT + (L.backB - L.doorT) * 0.6, p) - Math.sin(p * Math.PI) * 80; s *= 1 - p * 0.75; alpha = 1 - p * 0.6; }
      const sw = s * (k.spr.width / 16), sh = sw * k.spr.height / k.spr.width;
      cx.globalAlpha = alpha;
      cx.save(); cx.translate(Math.round(x), Math.round(y)); if (f.flip) cx.scale(-1, 1);
      if (f.puffT > 0) { cx.fillStyle = "rgba(255,179,64,0.25)"; cx.beginPath(); cx.arc(0, 0, sw * 0.55, 0, Math.PI * 2); cx.fill(); }
      cx.drawImage(k.spr, Math.round(-sw / 2), Math.round(-sh / 2), Math.round(sw), Math.round(sh));
      cx.restore();
      if (f.kind === "shark" && !f.out && f.hits > 0) text("•".repeat(k.taps - f.hits), x, y - sh * 0.8, 14, PAPER, "center", 900);
    }
    cx.globalAlpha = 1;
  }
  function drawFx() {
    for (const f of fx) { const k = 1 - f.life / f.max; cx.globalAlpha = 1 - k; text(f.s, Math.max(40, Math.min(W - 40, f.x)), f.y - k * 24, f.big ? 26 : 15, f.col, "center", 900); }
    cx.globalAlpha = 1;
  }
  function overlay() {
    cx.fillStyle = "rgba(8, 9, 7, 0.82)"; cx.fillRect(0, 0, W, H);
    const big = Math.round(Math.max(26, Math.min(48, W / 10))), mid = H * 0.42;
    if (state === "title") {
      text("elevator", W / 2, mid - big * 2.4, big, CASE, "center", 900);
      text("full of fish", W / 2, mid - big * 1.4, big, LIME, "center", 900);
      text("get to floor 9. the elevator is full of fish.", W / 2, mid - big * 0.4, Math.max(12, Math.min(16, W / 30)), "#c9c4a8", "center", 700);
      const s = Math.min(70, W * 0.16); cx.imageSmoothingEnabled = false;
      cx.drawImage(KINDS.trout.spr, W / 2 - s * 1.6, mid + 4, s, s * 9 / 16); cx.drawImage(KINDS.golden.spr, W / 2 - s * 0.5, mid - 6, s, s * 9 / 16); cx.drawImage(KINDS.salmon.spr, W / 2 + s * 0.6, mid + 6, s, s * 9 / 16);
      text("tap fish to fling them out the open doors.", W / 2, mid + s * 0.9 + 10, Math.max(12, Math.min(15, W / 30)), LIME2, "center", 800);
      text("over " + CAP + " kg of fish and the car won't move.", W / 2, mid + s * 0.9 + 34, Math.max(11, Math.min(14, W / 32)), "#ffb340", "center", 700);
      text("tap to press the button", W / 2, Math.min(H - 40, mid + s * 0.9 + 84), 18, LIME, "center", 900);
    } else {
      text(reachedGoal ? "you made it" : "out of time", W / 2, mid - big * 1.6, big, reachedGoal ? LIME : BAD, "center", 900);
      text("floor " + floor, W / 2, mid - big * 0.7, Math.round(big * 0.7), PAPER, "center", 800);
      text(String(score), W / 2, mid + big * 0.35, Math.round(big * 1.3), CASE, "center", 900);
      text("best " + best + "  ·  " + flung + " fish flung  ·  " + overloads + " overloads", W / 2, mid + big * 1.25, 14, "#c9c4a8", "center", 700);
      const nudge = score > prevBest ? (prevBest > 0 ? "new best. you beat it by " + (score - prevBest) + "." : "first ride logged. now beat it.")
        : score === prevBest ? "tied your best. one more floor next time." : (prevBest - score) + " more to beat your best (" + prevBest + ").";
      text(nudge, W / 2, mid + big * 1.25 + 24, 15, score > prevBest ? LIME2 : "#ffb340", "center", 800);
      if (performance.now() - endAt > 700) text("tap to ride again", W / 2, mid + big * 1.25 + 66, 18, LIME, "center", 900);
    }
  }
  function draw(time) {
    cx.save();
    if (shake > 0) cx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);
    if (shake > 0 || (phase === "travel" && state === "play")) { cx.fillStyle = "#121315"; cx.fillRect(-12, -12, W + 24, H + 24); }
    drawCar(time);
    drawFish();
    drawPanel(time);
    drawFx();
    cx.restore();
    if (state !== "play") overlay();
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
  window.__eff = { state: () => ({ state, t, floor, score, flung, weight: weight(), phase, door, overloads, reachedGoal, fish: fish.filter((f) => !f.out && f.delay <= 0).map((f) => ({ x: Math.round(f.x), y: Math.round(f.y), kind: f.kind, puff: f.puffT > 0 })) }) };
})();
