/* microwave panic — computer cooked games.
   The computer has become a microwave. Hold anywhere to cook, let go when the food is done. Every item tells you in its
   own way: popcorn pops slow down, the burrito thaws from icy blue, the egg wobbles harder and harder, coffee starts
   to bubble, the fish starts to stink. Let go too early: cold in the middle (streak lost). Too late: burnt, a strike.
   Never microwave the fork: let go at once. Three strikes and the fire alarm wins. Space (hold) cooks too, M mutes.
   Haunted microwave (K-0056, a Halloween mode): the 🎃 button or H on the title. Cursed things join the menu (a
   pumpkin, candy corn, a cursed doll you must not cook), bats, a purple glow, and a light ghost scare when you fail.
   Offered Oct 15 to Nov 7 (or with ?haunted=1); on by default on Oct 31 until the player turns it off. */
(function () {
  "use strict";
  // ---------- platform sdk: optional, every call guarded ----------
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  let lastScoreSent = 0;
  const sdkScore = (n) => { const t = performance.now(); if (t - lastScoreSent > 400) { lastScoreSent = t; sdk((c) => c.score && c.score(n)); } };

  const cv = document.getElementById("c"), cx = cv.getContext("2d", { alpha: false });
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- palette ----------
  const CASE = "#e6d596", SIDE = "#a6975d", INK = "#0b0c0e", LIME = "#a8d533", LIME2 = "#dcff7a", BAD = "#ff4d5e", PAPER = "#f4f1e6", WARN = "#ffb340";

  // Pixel font (5x7 with two descender rows, the same table as the other games), drawn with fillRect.
  const PF = {'A':'50e11111f111111','B':'51e11111e11111e','C':'50e11101010110e','D':'51e11111111111e','E':'51f10101e10101f','F':'51f10101e101010','G':'50e11101711110f','H':'51111111f111111','I':'51f04040404041f','J':'50702020212120c','K':'511121418141211','L':'51010101010101f','M':'5111b1515111111','N':'511191513111111','O':'50e11111111110e','P':'51e11111e101010','Q':'50e11111115120d','R':'51e11111e141211','S':'50f10100e01011e','T':'51f040404040404','U':'51111111111110e','V':'511111111110a04','W':'511111115151b11','X':'511110a040a1111','Y':'511110a04040404','Z':'51f01020408101f','0':'50e11131519110e','1':'5040c040404040e','2':'50e11010204081f','3':'51e01010e01011e','4':'51111111f010101','5':'51f101e0101110e','6':'50e10101e11110e','7':'51f010204080808','8':'50e11110e11110e','9':'50e11110f01010e','a':'500000e010f110f','b':'510101e1111111e','c':'500000e1010100e','d':'501010f1111110f','e':'500000e111f100e','f':'506081e08080808','g':'500000f1111110f010e','h':'510101e11111111','i':'504000c0404040e','j':'502000602020202120c','k':'510101214181412','l':'50c04040404040e','m':'500001a15151515','n':'500001e11111111','o':'500000e1111110e','p':'500001e1111111e1010','q':'500000f1111110f0101','r':'500001619101010','s':'500000f100e011e','t':'508081e08080906','u':'50000111111110f','v':'500001111110a04','w':'50000111115150a','x':'50000110a040a11','y':'50000111111110f010e','z':'500001f0204081f',' ':'30000','.':'100000000000001',',':'20000000000010102',':':'100000100000100','\'':'1010100','’':'1010100','-':'300000000070000','+':'5000004041f0404','!':'101010101010001','?':'50e110204040004','/':'501010204081010','·':'100000000010000','✓':'500010214080000','→':'5000004021f0204','↖':'5001e1814120100','…':'500000000000015','•':'40000060f0f0600','%':'5191a0408161300','=':'500001f001f0000','(':'301020404040201','▲':'50000040e1f0000','∞':'500000a150a0000',')':'304020101010204','🎃':'70c3e5d7f55633e','👻':'73e7f6b7f7f7f55','🦇':'700416b7f3e1400'};
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

  // the microwave's display face (the brand computer's screen), 16x10
  const FACES = {
    sad: ["................", ".##..........##.", "...##......##...", "................", "..###......###..", "..###......###..", "................", ".....######.....", "....#......#....", "................"],
    happy: ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "...#........#...", "....########....", ".....######.....", "................"],
    shock: ["................", "..###......###..", ".#...#....#...#.", ".#...#....#...#.", "..###......###..", "................", "......####......", ".....#....#.....", "......####......", "................"],
    cooked: ["................", "..#...#..#...#..", "...#.#....#.#...", "....#......#....", "...#.#....#.#...", "..#...#..#...#..", "................", "..#.#.#.#.#.#.#.", ".#.#.#.#.#.#.#..", "................"],
  };

  // ---------- the menu ----------
  const ITEMS = {
    popcorn: { name: "popcorn", tip: "let go when the popping slows down" },
    burrito: { name: "frozen burrito", tip: "it thaws from blue. steam means close" },
    egg: { name: "an egg (why)", tip: "it wobbles harder. don't let it pop" },
    coffee: { name: "yesterday's coffee", tip: "let go when it bubbles" },
    fish: { name: "the fish. in the office.", tip: "let go when it starts to stink" },
    soup: { name: "soup", tip: "bubbles, then the splatter" },
    fork: { name: "A FORK", tip: "metal! let go right now", cursed: true },
    phone: { name: "someone's phone", tip: "that's not how charging works. let go", cursed: true },
  };
  ITEMS.pumpkin = { name: "a cursed pumpkin", tip: "let go when it glows" };
  ITEMS.candycorn = { name: "candy corn (haunted)", tip: "it melts from the tip. let go before the white goes" };
  ITEMS.doll = { name: "A CURSED DOLL", tip: "it's watching. let go right now", cursed: true };
  const NORMAL = ["popcorn", "burrito", "egg", "coffee", "fish", "soup"];
  const SPOOKY = NORMAL.concat(["pumpkin", "pumpkin", "candycorn", "candycorn"]);

  // ---------- haunted mode ----------
  const now0 = new Date(), md = (now0.getMonth() + 1) * 100 + now0.getDate();
  const hauntParam = /[?&]haunted=1/.test(location.search) || /[?&]haunted=1/.test((() => { try { return window.parent.location.search; } catch (e) { return ""; } })());
  const hauntSeason = hauntParam || (md >= 1015 && md <= 1107);
  let haunted = false;
  try { const v = localStorage.getItem("mp-haunted"); haunted = hauntSeason && (v === "1" || (v === null && (md === 1031 || hauntParam))); } catch (e) { haunted = hauntParam; }
  let scare = null; // the ghost: { t } while it's up
  const LINES = {
    hello: ["the computer is a microwave now.", "hold to cook. trust your nose."],
    perfect: ["perfect.", "ding! nailed it.", "restaurant quality (gas station)."],
    boo: ["BOO.", "the microwave is haunted now.", "something cooked YOU."],
    good: ["edible.", "close enough.", "it's food."],
    cold: ["cold in the middle.", "still frozen. classic.", "lava outside, ice inside."],
    burnt: ["BURNT.", "the smoke alarm is awake.", "that's charcoal now."],
    safe: ["good call.", "no sparks today.", "the fork lives."],
    sparks: ["SPARKS!", "you microwaved metal.", "the microwave is on fire."],
    end: ["the fire alarm wins.", "the office has been evacuated.", "please use the toaster."],
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- sound ----------
  let actx = null, muted = false, hum = null;
  try { muted = localStorage.getItem("mp-muted") === "1"; } catch (e) {}
  const muteBtn = document.getElementById("mute");
  function syncMute() { muteBtn.textContent = muted ? "sound off" : "sound on"; muteBtn.setAttribute("aria-pressed", muted ? "true" : "false"); }
  syncMute();
  function toggleMute() { muted = !muted; try { localStorage.setItem("mp-muted", muted ? "1" : "0"); } catch (e) {} syncMute(); if (muted) humOff(); }
  muteBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMute(); });
  muteBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  const hauntBtn = document.getElementById("haunt");
  function syncHaunt() { if (!hauntBtn) return; hauntBtn.hidden = !hauntSeason || state === "play"; hauntBtn.textContent = haunted ? "🎃 haunted: on" : "🎃 haunted: off"; hauntBtn.setAttribute("aria-pressed", haunted ? "true" : "false"); }
  function toggleHaunt() {
    if (!hauntSeason || state === "play") return;
    haunted = !haunted; try { localStorage.setItem("mp-haunted", haunted ? "1" : "0"); } catch (e) {}
    syncHaunt(); if (haunted) sfx.boo(true);
    if (!running) draw(performance.now() / 1000);
  }
  if (hauntBtn) { hauntBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleHaunt(); }); hauntBtn.addEventListener("pointerdown", (e) => e.stopPropagation()); }
  function ac() { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); return actx; }
  function tone(freq, dur, type, vol, slide, delay) {
    if (muted) return;
    try {
      const a = ac(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + (delay || 0);
      o.type = type || "square"; o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(vol || 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function humOn() {
    if (muted || hum) return;
    try { const a = ac(), o = a.createOscillator(), g = a.createGain(); o.type = "sawtooth"; o.frequency.value = 60; g.gain.value = 0.018; o.connect(g); g.connect(a.destination); o.start(); hum = { o, g }; } catch (e) {}
  }
  function humOff() { if (!hum) return; try { hum.o.stop(); } catch (e) {} hum = null; }
  const sfx = {
    pop: () => tone(900 + Math.random() * 500, 0.03, "square", 0.04),
    ding: () => tone(1480, 0.5, "sine", 0.08),
    perfect: (n) => { tone(1480, 0.4, "sine", 0.08); tone(1480 * Math.pow(1.06, Math.min(10, n)), 0.2, "square", 0.03, 0, 0.08); },
    cold: () => tone(300, 0.2, "triangle", 0.06, 200),
    burnt: () => { tone(2600, 0.12, "square", 0.05); tone(2600, 0.12, "square", 0.05, 0, 0.2); tone(2600, 0.12, "square", 0.05, 0, 0.4); },
    zap: () => tone(1800 + Math.random() * 1200, 0.04, "sawtooth", 0.03),
    end: () => tone(260, 0.8, "sawtooth", 0.06, 40),
    // a ghostly wail, short and not too loud (soft = the toggle's little hello)
    boo: (soft) => { tone(soft ? 520 : 700, soft ? 0.35 : 0.6, "sine", soft ? 0.04 : 0.07, soft ? 380 : 260); if (!soft) tone(1400, 0.5, "triangle", 0.03, 500, 0.05); },
  };

  // ---------- layout: a microwave, front on ----------
  let W = 0, H = 0, DPR = 1, U = 1, M = {};
  function layout() {
    const phone = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    DPR = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.max(0.75, Math.min(1.6, Math.min(W / 420, H / 720)));
    const mw = Math.min(W * 0.94, 620, H * 1.25), mh = mw * 0.62, mx = (W - mw) / 2, my = Math.max(120 * U, H * 0.5 - mh / 2);
    const ww = mw * 0.64;
    M = { mx, my, mw, mh, wx: mx + mw * 0.05, wy: my + mh * 0.1, ww, wh: mh * 0.8, px: mx + mw * 0.05 + ww + mw * 0.04 };
    M.pw = mx + mw - M.px - mw * 0.04;
  }
  window.addEventListener("resize", layout);
  layout();

  // the counter, wall and the microwave's body and keypad never change for a given size: painted once, then blitted
  let bgCache = null, bgKey = "";
  function shell() {
    const key = W + "x" + H + "@" + DPR;
    if (bgCache && bgKey === key) return bgCache;
    bgKey = key; bgCache = bgCache || document.createElement("canvas");
    bgCache.width = Math.max(1, Math.round(W * DPR)); bgCache.height = Math.max(1, Math.round(H * DPR));
    const g = bgCache.getContext("2d"), R = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    R("#1b1d22", 0, 0, W, H);
    for (let y = 0; y < H; y += 6) R(y % 12 ? "#1d1f24" : "#191b20", 0, y, W, 3);
    const cy = M.my + M.mh;
    R("#3b2a1c", 0, cy + 8, W, H); R("#5a4029", 0, cy + 8, W, 5);
    // body
    R(INK, M.mx - 3, M.my - 3, M.mw + 6, M.mh + 6);
    R(CASE, M.mx, M.my, M.mw, M.mh); R(SIDE, M.mx, M.my + M.mh - 8, M.mw, 8); R("#f1e4ae", M.mx, M.my, M.mw, 4);
    R(INK, M.mx + M.mw * 0.06, cy - 1, 14, 11); R(INK, M.mx + M.mw * 0.94 - 14, cy - 1, 14, 11);
    // door frame and handle
    R(INK, M.wx - 6, M.wy - 6, M.ww + 12, M.wh + 12); R("#c9bb7f", M.wx - 4, M.wy - 4, M.ww + 8, M.wh + 8);
    R(INK, M.wx + M.ww + 6, M.wy + M.wh * 0.15, 6, M.wh * 0.7);
    // keypad
    const kw = M.pw / 3 - 6, kh = Math.min(kw * 0.62, M.mh * 0.09), ky = M.my + M.mh * 0.47;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) { R(INK, M.px + i * (kw + 6) + 2, ky + j * (kh + 6), kw, kh); R("#d6c784", M.px + i * (kw + 6) + 2, ky + j * (kh + 6), kw, kh - 3); }
    R(INK, M.px + 2, ky + 4 * (kh + 6), M.pw - 4, kh * 1.3); R(LIME, M.px + 2, ky + 4 * (kh + 6), M.pw - 4, kh * 1.3 - 3);
    return bgCache;
  }

  // ---------- state ----------
  let state = "title", score = 0, best = 0, prevBest = 0, round = 0, streak = 0, bestStreak = 0, strikes = 0, perfects = 0;
  let item = null, phase = "ready", phaseT = 0, cookT = 0, holding = false, parts = [], fx = [], line = pick(LINES.hello), lineT = 0, face = "happy", faceT = 0, shake = 0, startAt = 0, endAt = 0, popAcc = 0, verdict = null;
  try { best = +localStorage.getItem("mp-best") || 0; } catch (e) {}
  function say(kind, force) { if (force || lineT <= 0.5) { line = pick(LINES[kind]); lineT = 2; } }
  function react(f, s) { face = f; faceT = s; }

  function nextItem() {
    round++;
    let kind;
    if (round === 1) kind = "popcorn";
    else if (round >= 4 && Math.random() < (haunted ? 0.2 : 0.16)) kind = haunted && Math.random() < 0.5 ? "doll" : Math.random() < 0.65 ? "fork" : "phone";
    else { do { kind = pick(haunted ? SPOOKY : NORMAL); } while (item && kind === item.kind); }
    const T = kind === "popcorn" && round === 1 ? 2.6 : 1.5 + Math.random() * 2.6;
    const hw = Math.max(0.22, 0.6 - round * 0.02);
    item = { kind, T, hw, slide: 1 };
    phase = "ready"; phaseT = 0; cookT = 0; popAcc = 0; parts = []; verdict = null;
  }
  function start() {
    state = "play"; score = 0; round = 0; streak = 0; bestStreak = 0; strikes = 0; perfects = 0; fx = []; item = null; scare = null;
    startAt = performance.now(); say("hello", true); react("happy", 0.8); syncHaunt();
    sdk((c) => c.start && c.start());
    if (haunted) sdk((c) => c.event && c.event("haunted_run", {}));
    nextItem();
  }
  function end() {
    state = "over"; endAt = performance.now(); prevBest = best; humOff(); syncHaunt();
    if (score > best) { best = score; try { localStorage.setItem("mp-best", String(best)); } catch (e) {} }
    say("end", true); react("cooked", 99); sfx.end();
    const dur = Math.round(performance.now() - startAt);
    sdk((c) => c.score && c.score(score));
    sdk((c) => c.end && c.end({ score, durationMs: dur, completed: round > 10 }));
  }

  // ---------- cooking ----------
  function judge(forced) {
    holding = false; humOff();
    const it = item, cur = ITEMS[it.kind].cursed, d = cookT - it.T;
    let v;
    if (cur) v = cookT < 0.6 && !forced ? "safe" : "sparks";
    else if (forced || d > it.hw) v = "burnt";
    else if (d < -it.hw) v = "cold";
    else if (Math.abs(d) <= it.hw * 0.35) v = "perfect";
    else v = "good";
    let pts = 0;
    if (v === "perfect") { streak++; perfects++; pts = 10 + Math.min(10, streak) * 2; sfx.perfect(streak); react("happy", 0.9); }
    else if (v === "good") { streak++; pts = 5 + Math.min(10, streak); sfx.ding(); react("happy", 0.6); }
    else if (v === "safe") { pts = 8; sfx.ding(); react("happy", 0.6); }
    else if (v === "cold") { streak = 0; pts = 1; sfx.cold(); react("sad", 0.9); }
    else { streak = 0; strikes++; sfx.burnt(); react("shock", 1); shake = reduce ? 0 : 0.35; if (haunted) { scare = { t: 0 }; sfx.boo(); } }
    bestStreak = Math.max(bestStreak, streak);
    score += pts;
    say(scare && scare.t === 0 ? "boo" : v === "good" ? "good" : v, true);
    verdict = { v, pts };
    fx.push({ s: v === "perfect" ? "PERFECT +" + pts : v === "good" ? "good +" + pts : v === "safe" ? "good call +" + pts : v === "cold" ? "cold +1" : v === "sparks" ? "SPARKS! strike" : "BURNT! strike", x: M.wx + M.ww / 2, y: M.wy - 18,
      col: v === "perfect" || v === "safe" ? LIME2 : v === "good" ? LIME : v === "cold" ? "#9fc3e0" : BAD, life: 1.1, max: 1.1, big: v === "perfect" });
    phase = "result"; phaseT = 0;
    sdkScore(score);
  }

  // ---------- input ----------
  function down() {
    if (state === "title" || (state === "over" && performance.now() - endAt > 700)) { start(); return; }
    if (state === "play" && phase === "ready" && item.slide <= 0) { holding = true; phase = "cook"; humOn(); }
  }
  function up() { if (state === "play" && phase === "cook" && holding) judge(false); }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { window.focus(); cv.setPointerCapture(e.pointerId); } catch (err) {} down(); });
  cv.addEventListener("pointerup", (e) => { e.preventDefault(); up(); });
  cv.addEventListener("pointercancel", () => up());
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  function onKey(e) {
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.type === "keydown" && (e.key === "m" || e.key === "M")) { toggleMute(); return; }
    if (e.type === "keydown" && (e.key === "h" || e.key === "H")) { toggleHaunt(); return; }
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (e.repeat) return; if (e.type === "keydown") down(); else up(); }
  }
  window.addEventListener("keydown", onKey); window.addEventListener("keyup", onKey);
  window.addEventListener("blur", () => up());
  try {
    const host = window.parent !== window && window.frameElement ? window.parent : null;
    if (host) {
      const relay = (e) => {
        if (e.target && (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
        const fr = window.frameElement.getBoundingClientRect();
        if (fr.height < 50 || fr.bottom < 50 || fr.top > host.innerHeight - 50) return;
        onKey(e);
      };
      host.document.addEventListener("keydown", relay); host.document.addEventListener("keyup", relay);
    }
  } catch (e) { /* another origin: keys reach the game once it has focus */ }

  // ---------- update ----------
  function popRate(p) { return p < 0.25 ? 0 : p < 0.8 ? 3 + (p - 0.25) / 0.55 * 12 : p < 1 ? 15 - (p - 0.8) / 0.2 * 13 : p < 1.15 ? 1 : 0; }
  function update(dt) {
    lineT -= dt; faceT -= dt; shake = Math.max(0, shake - dt);
    for (const f of fx) f.life -= dt;
    fx = fx.filter((f) => f.life > 0);
    if (scare && (scare.t += dt) > 0.75) scare = null;
    for (const q of parts) { q.vy += 900 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; if (q.y > M.wy + M.wh * 0.86) { q.y = M.wy + M.wh * 0.86; q.vy *= -0.3; q.vx *= 0.6; } }
    parts = parts.filter((q) => q.life > 0);
    if (faceT <= 0) face = state === "play" && phase === "cook" && item && (ITEMS[item.kind].cursed || cookT > item.T + item.hw * 0.5) ? "shock" : "happy";
    if (state !== "play") return;
    phaseT += dt;
    if (item.slide > 0) item.slide = Math.max(0, item.slide - dt * 4);
    if (phase === "cook") {
      cookT += dt;
      const it = item, p = cookT / it.T, cur = ITEMS[it.kind].cursed;
      if (cur) { if (Math.random() < dt * 30) { sfx.zap(); spark(); } if (cookT > 1.4) judge(true); }
      else {
        if (it.kind === "popcorn") { popAcc += popRate(p) * dt; while (popAcc >= 1) { popAcc--; sfx.pop(); kernel(); } }
        if (cookT > it.T + it.hw + 0.9) judge(true);
      }
    } else if (phase === "result") {
      if (phaseT > 1.05) { if (strikes >= 3) end(); else nextItem(); }
    }
  }
  function kernel() { parts.push({ x: M.wx + M.ww * (0.35 + Math.random() * 0.3), y: M.wy + M.wh * 0.55, vx: (Math.random() - 0.5) * 260, vy: -200 - Math.random() * 260, life: 1.4, c: PAPER, s: 4 * U }); }
  function spark() { parts.push({ x: M.wx + M.ww * (0.4 + Math.random() * 0.2), y: M.wy + M.wh * 0.55, vx: (Math.random() - 0.5) * 500, vy: -150 - Math.random() * 300, life: 0.35, c: Math.random() < 0.5 ? LIME2 : "#7fd4ff", s: 3 * U }); }

  // ---------- draw ----------
  const R = (c, a, b, w, h) => { cx.fillStyle = c; cx.fillRect(a, b, w, h); };
  function mix(a, b, k) {
    k = Math.max(0, Math.min(1, k));
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = ((pa >> 16) & 255) + ((((pb >> 16) & 255) - ((pa >> 16) & 255)) * k), g = ((pa >> 8) & 255) + ((((pb >> 8) & 255) - ((pa >> 8) & 255)) * k), bl = (pa & 255) + (((pb & 255) - (pa & 255)) * k);
    return "rgb(" + (r | 0) + "," + (g | 0) + "," + (bl | 0) + ")";
  }
  function drawFace(x, y, w, h, name) {
    const F = FACES[name] || FACES.sad, cw = w / 16, ch = h / 10;
    cx.fillStyle = LIME;
    for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (F[j][i] === "#") cx.fillRect(Math.round(x + i * cw), Math.round(y + j * ch), Math.ceil(cw), Math.ceil(ch));
  }
  // the food at (x, y) = bottom centre, s = size unit; p = cooked fraction (1 = perfect), burnt past 1 + hw/T
  function drawItem(kind, x, y, s, p, time) {
    const burnt = verdict && (verdict.v === "burnt" || verdict.v === "sparks"), over = Math.max(0, p - 1);
    switch (kind) {
      case "popcorn": {
        const puff = Math.min(1, p * 0.9), bw = s * 1.2, bh = s * (0.35 + puff * 0.65);
        const c1 = burnt ? "#5a3a1e" : PAPER, c2 = burnt ? "#3a2410" : "#e5484d";
        R(INK, x - bw / 2 - 2, y - bh - 2, bw + 4, bh + 2);
        for (let i = 0; i < 6; i++) R(i % 2 ? c2 : c1, x - bw / 2 + i * bw / 6, y - bh, bw / 6 + 0.5, bh);
        if (puff > 0.5) { R(c1, x - bw * 0.3, y - bh - s * 0.12 * puff, bw * 0.6, s * 0.12 * puff); }
        if (!burnt) text("POP", x, y - bh * 0.5, Math.max(9, s * 0.2), INK, "center", 800);
        break;
      }
      case "burrito": {
        const col = burnt ? "#2a1a0e" : p < 1 ? mix("#9fc3e0", "#e8c88a", p) : mix("#e8c88a", "#6b4424", over * 2);
        R(INK, x - s * 0.72, y - s * 0.42, s * 1.44, s * 0.42); R(col, x - s * 0.7, y - s * 0.4, s * 1.4, s * 0.38);
        R(INK, x - s * 0.35, y - s * 0.4, 2, s * 0.38); R(INK, x + s * 0.2, y - s * 0.4, 2, s * 0.38);
        if (p < 0.5) for (let i = 0; i < 4; i++) R("#e8f6ff", x - s * 0.6 + i * s * 0.36, y - s * 0.36, s * 0.08, s * 0.05);
        break;
      }
      case "egg": {
        const wob = burnt ? 0 : Math.sin(time * 30) * Math.pow(Math.min(1.3, p), 3) * s * 0.08;
        if (burnt) { R("#f4f1e6", x - s * 0.8, y - s * 0.12, s * 1.6, s * 0.12); R("#f6c945", x - s * 0.2, y - s * 0.16, s * 0.4, s * 0.12); R("#f4f1e6", x - s * 0.9, y - s * 0.9, s * 0.2, s * 0.15); R("#f6c945", x + s * 0.6, y - s * 0.7, s * 0.15, s * 0.1); break; }
        // stepped oval: half-widths from the top row down
        const rows = [0.12, 0.2, 0.25, 0.28, 0.3, 0.31, 0.31, 0.3, 0.27, 0.22], rh = s * 0.078;
        rows.forEach((hw, i) => { const yy = y - s * 0.8 + i * rh; R(INK, x - s * hw - 2 + wob, yy, s * hw * 2 + 4, rh + 1); });
        rows.forEach((hw, i) => { const yy = y - s * 0.8 + i * rh; R("#f7f1df", x - s * hw + wob, yy + (i === 0 ? 2 : 0), s * hw * 2, rh + 1); });
        R("#ffffff", x - s * 0.16 + wob, y - s * 0.6, s * 0.07, s * 0.14);
        break;
      }
      case "coffee": {
        R(INK, x - s * 0.34, y - s * 0.62, s * 0.68, s * 0.62); R("#e9e6dc", x - s * 0.32, y - s * 0.6, s * 0.64, s * 0.58);
        R(INK, x + s * 0.32, y - s * 0.48, s * 0.16, s * 0.3); R("#e9e6dc", x + s * 0.34, y - s * 0.44, s * 0.1, s * 0.22);
        R("#4a2c17", x - s * 0.28, y - s * 0.56, s * 0.56, s * 0.08);
        if (p > 0.82 && !burnt) for (let i = 0; i < 4; i++) if (Math.sin(time * 18 + i * 2) > 0) R("#7a5232", x - s * 0.24 + i * s * 0.14, y - s * 0.6, s * 0.06, s * 0.05);
        if (burnt) { R("#4a2c17", x - s * 0.5, y - s * 0.04, s * 1.1, s * 0.05); R("#4a2c17", x - s * 0.34, y - s * 0.62, s * 0.06, s * 0.5); }
        break;
      }
      case "fish": {
        const col = burnt ? "#2a2a2a" : mix("#9fb3c8", "#f0ebe0", p);
        R(INK, x - s * 0.62, y - s * 0.34, s * 1.1, s * 0.34); R(col, x - s * 0.6, y - s * 0.32, s * 1.06, s * 0.3);
        R(INK, x + s * 0.48, y - s * 0.4, s * 0.08, s * 0.46); R(col, x + s * 0.5, y - s * 0.38, s * 0.14, s * 0.42);
        R(INK, x - s * 0.48, y - s * 0.24, s * 0.06, s * 0.06);
        break;
      }
      case "soup": {
        R(INK, x - s * 0.5, y - s * 0.4, s, s * 0.4); R("#3d6be0", x - s * 0.48, y - s * 0.38, s * 0.96, s * 0.36);
        R(burnt ? "#5a2a14" : "#e8863a", x - s * 0.44, y - s * 0.36, s * 0.88, s * 0.07);
        const n = burnt ? 0 : Math.floor(Math.max(0, p - 0.6) * 12);
        for (let i = 0; i < n; i++) if (Math.sin(time * 14 + i * 1.7) > 0.2) R("#ffb06a", x - s * 0.4 + ((i * 37) % 80) / 100 * s, y - s * 0.42, s * 0.05, s * 0.05);
        if (burnt) for (let i = 0; i < 7; i++) R("#e8863a", x - s * 0.8 + i * s * 0.26, y - s * (0.6 + (i % 3) * 0.2), s * 0.06, s * 0.06);
        break;
      }
      case "fork": {
        R(INK, x - s * 0.62, y - s * 0.14, s * 1.24, s * 0.14); R("#c9d1d9", x - s * 0.6, y - s * 0.12, s * 0.7, s * 0.1);
        for (let i = 0; i < 4; i++) R("#c9d1d9", x + s * 0.12, y - s * 0.13 + i * s * 0.035, s * 0.46, s * 0.02);
        break;
      }
      case "pumpkin": {
        const col = burnt ? "#2a1a0e" : p < 1 ? mix("#7a4a1c", "#ff9a2e", p) : mix("#ff9a2e", "#5a2a0e", over * 2);
        text("🎃", x, y - s * 0.42, s * 1.15, col, "center", 600);
        if (!burnt && p > 0.75) { cx.globalAlpha = Math.min(1, (p - 0.75) * 3) * (0.6 + 0.4 * Math.sin(time * 9)); R("#fff2a0", x - s * 0.2, y - s * 0.52, s * 0.1, s * 0.1); R("#fff2a0", x + s * 0.1, y - s * 0.52, s * 0.1, s * 0.1); cx.globalAlpha = 1; }
        break;
      }
      case "candycorn": {
        // three bands, widest at the bottom; the white tip melts away as it cooks
        const melt = Math.max(0, Math.min(1, (p - 0.55) / 0.6)), bh = s * 0.2;
        const bands = [[0.42, burnt ? "#3a2410" : "#f6c945"], [0.28, burnt ? "#2a1a0e" : "#ff8a2e"], [0.14 * (1 - melt), burnt ? "#2a1a0e" : "#f7f1df"]];
        bands.forEach((b, i) => { if (b[0] <= 0.01) return; R(INK, x - s * b[0] - 2, y - bh * (i + 1) - 1, s * b[0] * 2 + 4, bh + 2); R(b[1], x - s * b[0], y - bh * (i + 1), s * b[0] * 2, bh); });
        if (!burnt && melt > 0) R("#f7f1df", x - s * 0.3, y - s * 0.03, s * 0.6 * melt, s * 0.03);
        break;
      }
      case "doll": {
        R(INK, x - s * 0.2, y - s * 0.72, s * 0.4, s * 0.72); R("#d9c7b0", x - s * 0.18, y - s * 0.7, s * 0.36, s * 0.3); R("#7a2a3a", x - s * 0.18, y - s * 0.4, s * 0.36, s * 0.38);
        const blink = Math.sin(time * 3) > 0.92;
        R(blink ? "#d9c7b0" : "#ff4d5e", x - s * 0.1, y - s * 0.6, s * 0.06, s * 0.06); R(blink ? "#d9c7b0" : "#ff4d5e", x + s * 0.04, y - s * 0.6, s * 0.06, s * 0.06);
        R("#3a2410", x - s * 0.2, y - s * 0.74, s * 0.4, s * 0.08);
        break;
      }
      case "phone": {
        R(INK, x - s * 0.32, y - s * 0.12, s * 0.64, s * 0.12); R("#1a1b1f", x - s * 0.3, y - s * 0.1, s * 0.6, s * 0.08); R("#3d6be0", x - s * 0.24, y - s * 0.09, s * 0.48, s * 0.05);
        break;
      }
    }
    // the cues that aren't the food itself: steam, stink
    if (!burnt && kind === "burrito" && p > 0.78) steam(x, y - s * 0.4, s, time, 0.6);
    if (!burnt && kind === "fish" && p > 0.88) for (let i = 0; i < 3; i++) { const k = (time * 1.5 + i / 3) % 1; cx.globalAlpha = 1 - k; R("#8fcf3a", x - s * 0.3 + i * s * 0.3 + Math.sin(time * 6 + i) * 4, y - s * 0.45 - k * s * 0.5, s * 0.05, s * 0.14); cx.globalAlpha = 1; }
    if (burnt) steam(x, y - s * 0.3, s, time, 1, "#55585e");
  }
  function steam(x, y, s, time, a, col) {
    for (let i = 0; i < 4; i++) { const k = (time * 0.9 + i / 4) % 1; cx.globalAlpha = (1 - k) * a; R(col || "#e9e6dc", x - s * 0.3 + i * s * 0.2 + Math.sin(time * 4 + i) * s * 0.05, y - k * s * 0.6, s * 0.08, s * 0.08); }
    cx.globalAlpha = 1;
  }
  function draw(time) {
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.drawImage(shell(), 0, 0, W, H);
    if (haunted) {
      cx.globalAlpha = 0.28; R("#2a0f3a", 0, 0, W, H); cx.globalAlpha = 1;
      if (!reduce) for (let i = 0; i < 3; i++) { const k = (time * (0.06 + i * 0.025) + i * 0.37) % 1; text("🦇", k * (W + 60) - 30, 70 + i * 34 + Math.sin(time * 5 + i) * 10, 16 + i * 4, "#6a4a8a", "center", 600); }
    }
    cx.save();
    if (shake > 0) cx.translate((Math.random() - 0.5) * 14 * shake, (Math.random() - 0.5) * 14 * shake);
    // the window: dark when off, lit while cooking
    const on = state === "play" && phase === "cook";
    R(on ? "#3a3418" : "#14140f", M.wx, M.wy, M.ww, M.wh);
    if (on) { cx.globalAlpha = 0.25 + 0.05 * Math.sin(time * 20); R(haunted ? "#b89aff" : "#ffe9a0", M.wx, M.wy, M.ww, M.wh); cx.globalAlpha = 1; }
    // the turntable
    const ty = M.wy + M.wh * 0.86;
    R("#2a2a24", M.wx + M.ww * 0.15, ty, M.ww * 0.7, M.wh * 0.06); R("#47463c", M.wx + M.ww * 0.17, ty, M.ww * 0.66, 3);
    if (item && state !== "title") {
      const s = Math.min(M.ww * 0.32, M.wh * 0.62), sway = on && !reduce ? Math.sin(time * 1.6) * M.ww * 0.08 : 0;
      const slideX = item.slide * M.ww * 0.7;
      cx.save(); cx.beginPath(); cx.rect(M.wx, M.wy, M.ww, M.wh); cx.clip();
      drawItem(item.kind, M.wx + M.ww / 2 + sway - slideX, ty, s, item.T ? cookT / item.T : 0, time);
      for (const q of parts) { R(q.c, q.x - q.s / 2, q.y - q.s / 2, q.s, q.s); }
      cx.restore();
    }
    // glass glare and the mesh dots
    cx.globalAlpha = 0.07; R(PAPER, M.wx + M.ww * 0.08, M.wy, M.ww * 0.12, M.wh); R(PAPER, M.wx + M.ww * 0.24, M.wy, M.ww * 0.04, M.wh); cx.globalAlpha = 1;
    // the display: face and the timer
    const dx = M.px + 2, dy = M.my + M.mh * 0.1, dw = M.pw - 4, dh = M.mh * 0.3;
    R(INK, dx, dy, dw, dh);
    const secs = state === "play" ? cookT : 0;
    if (dw < dh * 1.6) { // narrow display: face on top, the timer underneath
      const fw = Math.min(dw * 0.7, dh * 0.5 * 1.6), fh = fw * 10 / 16;
      drawFace(dx + (dw - fw) / 2, dy + dh * 0.08, fw, fh, face);
      text(secs.toFixed(1), dx + dw / 2, dy + dh * 0.76, Math.min(dh * 0.3, dw * 0.26), on ? LIME2 : LIME, "center", 800);
    } else {
      const fw = Math.min(dw * 0.5, dh * 1.1), fh = fw * 10 / 16;
      drawFace(dx + 5, dy + (dh - fh) / 2, fw, fh, face);
      text(secs.toFixed(1), dx + dw - 6, dy + dh / 2, Math.min(dh * 0.42, dw * 0.13), on ? LIME2 : LIME, "right", 800);
    }
    for (const f of fx) { const k = 1 - f.life / f.max; cx.globalAlpha = 1 - k; text(f.s, f.x, f.y - k * 24, f.big ? 24 : 18, f.col, "center", 900); }
    cx.globalAlpha = 1;
    cx.restore();
    // hud
    text(String(score), 14, 22, 22, CASE, "left", 800);
    text("round " + round + (streak > 1 ? " · streak x" + streak : ""), 14, 44, 12, streak > 1 ? LIME2 : "#8a8e80", "left", 700);
    for (let i = 0; i < 3; i++) { const fxp = W - 28 - i * 22, on2 = i < strikes; R(on2 ? BAD : "#3a3d33", fxp, 54, 14, 14); if (on2) R(WARN, fxp + 4, 58, 6, 8); }
    text("strikes", W - 14, 80, 11, "#8a8e80", "right", 700);
    if (state === "play" && item) {
      const it = ITEMS[item.kind], ny = M.my - 46 * Math.min(1.2, U);
      text(it.name, W / 2, ny, Math.max(14, Math.min(22, W / 22)), it.cursed ? BAD : CASE, "center", 900);
      text(phase === "ready" ? "hold to cook · " + it.tip : it.tip, W / 2, ny + 22, Math.max(11, Math.min(14, W / 34)), it.cursed ? WARN : "#c9c4a8", "center", 700);
      if (lineT > 0) text(line, W / 2, M.my + M.mh + 40, Math.max(12, Math.min(16, W / 28)), /[A-Z]{4}/.test(line) ? BAD : PAPER, "center", 700);
    }
    // the scare: a ghost bursts out of the window, the screen flashes once (no flash with reduced motion)
    if (scare) {
      const k = scare.t / 0.75, grow = reduce ? 1 : Math.min(1, scare.t / 0.12);
      if (!reduce && scare.t < 0.08) { cx.globalAlpha = 0.5; R(PAPER, 0, 0, W, H); cx.globalAlpha = 1; }
      cx.globalAlpha = 1 - Math.max(0, k - 0.6) / 0.4;
      text("👻", M.wx + M.ww / 2 + (reduce ? 0 : Math.sin(scare.t * 40) * 4), M.wy + M.wh * 0.45, Math.min(W, H) * 0.42 * grow, PAPER, "center", 600);
      text("BOO", M.wx + M.ww / 2, M.wy + M.wh * 0.45 + Math.min(W, H) * 0.26 * grow, 26 * grow, BAD, "center", 900);
      cx.globalAlpha = 1;
    }
    if (state === "title" || state === "over") overlay();
  }
  function overlay() {
    R("rgba(8, 9, 7, 0.82)", 0, 0, W, H);
    const big = Math.round(Math.max(28, Math.min(52, W / 9))), mid = H * 0.42;
    if (state === "title") {
      text(haunted ? "haunted" : "microwave", W / 2, mid - big * 2.2, big, haunted ? "#ff9a2e" : CASE, "center", 900);
      text(haunted ? "microwave" : "panic", W / 2, mid - big * 1.1, big, haunted ? "#b89aff" : LIME, "center", 900);
      text(haunted ? "something is in the microwave. it's hungry." : "the computer is a microwave now.", W / 2, mid - big * 0.2, Math.max(12, Math.min(16, W / 30)), "#c9c4a8", "center", 700);
      text("hold to cook. let go when it's done.", W / 2, mid + 30, Math.max(13, Math.min(17, W / 26)), LIME2, "center", 800);
      text("popcorn slows down. the egg wobbles. the fish stinks.", W / 2, mid + 56, Math.max(11, Math.min(14, W / 36)), "#c9c4a8", "center", 700);
      text("burnt = strike. never microwave the fork.", W / 2, mid + 80, Math.max(11, Math.min(14, W / 34)), WARN, "center", 700);
      text("tap to plug it in", W / 2, Math.min(H - 40, mid + 132), 18, LIME, "center", 900);
      if (hauntSeason) text(haunted ? "🎃 haunted mode · H to turn it off" : "🎃 H for the haunted microwave", W / 2, Math.min(H - 14, mid + 160), 13, "#ff9a2e", "center", 700);
    } else {
      text("fire alarm", W / 2, mid - big * 1.6, big, BAD, "center", 900);
      text(round + " things microwaved", W / 2, mid - big * 0.7, Math.round(big * 0.55), PAPER, "center", 800);
      text(String(score), W / 2, mid + big * 0.35, Math.round(big * 1.3), CASE, "center", 900);
      text("best " + best + "  ·  " + perfects + " perfect  ·  best streak " + bestStreak, W / 2, mid + big * 1.25, 14, "#c9c4a8", "center", 700);
      const nudge = score > prevBest ? (prevBest > 0 ? "new best. you beat it by " + (score - prevBest) + "." : "first shift logged. now beat it.")
        : score === prevBest ? "tied your best. one more perfect next time." : (prevBest - score) + " more to beat your best (" + prevBest + ").";
      text(nudge, W / 2, mid + big * 1.25 + 24, 15, score > prevBest ? LIME2 : WARN, "center", 800);
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
  syncHaunt();
  requestAnimationFrame(frame);

  // read-only hooks for the test scripts
  window.__mp = { haunt: toggleHaunt, state: () => ({ haunted, scare: !!scare, state, score, round, streak, strikes, phase, cookT, kind: item && item.kind, T: item && item.T, hw: item && item.hw, slide: item && item.slide, cursed: !!(item && ITEMS[item.kind].cursed) }) };
})();
