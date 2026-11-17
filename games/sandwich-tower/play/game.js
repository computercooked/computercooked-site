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
  // 1.3: the fridge's finds. The first four are in the fridge from the start; each chef rank puts one more in it.
  const CURSED = ["sock", "phone", "fish", "key", "duck", "floppy", "mug", "remote"];
  const FIND_RANK = { duck: 1, floppy: 2, mug: 3, remote: 4 };
  const KIND = {
    bread: { h: 1.3, name: "bread" }, lettuce: { h: 0.7, name: "lettuce" }, tomato: { h: 0.8, name: "tomato" }, cheese: { h: 0.6, name: "cheese" },
    ham: { h: 0.7, name: "ham" }, pickle: { h: 0.6, name: "pickles" }, sock: { h: 0.9, name: "a sock?" }, phone: { h: 0.6, name: "someone's phone" },
    fish: { h: 0.9, name: "the fish from the elevator" }, key: { h: 1.0, name: "a keyboard key" },
    duck: { h: 1.0, name: "a rubber duck" }, floppy: { h: 0.6, name: "a floppy disk" }, mug: { h: 1.1, name: "a 'best chef' mug" }, remote: { h: 0.7, name: "the tv remote" },
  };
  // 1.3: chef career. Every layer you ever stack counts; ranks put new finds in the fridge.
  const RANKS = [[0, "dishwasher"], [25, "sandwich intern"], [80, "line cook"], [180, "sous chef"], [350, "head chef"], [600, "michelin computer"], [1000, "sandwich god"]];
  const rankOf = (n) => { let i = 0; while (i + 1 < RANKS.length && n >= RANKS[i + 1][0]) i++; return i; };
  // the orders: every 10 layers the chef closes one with bread, and the tickets get sillier
  const ORDERS = ["the blt", "the club", "the triple decker", "the dagwood", "the leaning tower", "the health violation", "the skyscraper", "the forbidden stack", "the one they write about"];
  const orderName = (n) => ORDERS[Math.min(ORDERS.length - 1, n)];
  // how tall the sandwich is, said like a person would say it (2 cm per layer unit)
  const TALL = [[0, "a coaster"], [8, "a phone"], [18, "a cat sitting down"], [32, "a bowling pin"], [48, "a toddler"], [75, "a golden retriever"], [110, "the fridge"], [160, "chef computer"], [240, "a giraffe's neck"]];
  const LINES = {
    hello: ["chef computer is cooking.", "one sandwich. tall."],
    perfect: ["perfect.", "chef's kiss.", "that's the one.", "michelin star (fake)."],
    trim: ["a little off the side.", "trim it.", "close enough.", "rustic."],
    big: ["that's a lot of overhang.", "you sliced half of it.", "skinny sandwich now."],
    order: ["order up!", "ding. sandwich done. keep going."],
    sock: ["that's a sock.", "the fridge gave me a sock."], phone: ["is that my phone.", "it has 3% battery."],
    fish: ["the fish again.", "he escaped the elevator."], key: ["a keyboard key. crunchy.", "it's the any key."],
    duck: ["a rubber duck. squeak.", "the duck is load-bearing now."], floppy: ["a floppy disk. 1.44 mb of lunch.", "it says 'taxes 1997'."],
    mug: ["a 'best chef' mug. he bought it himself.", "the mug is not food. stack it."], remote: ["the tv remote. so that's where it was.", "found the remote. in the fridge."],
    special: ["today's special: done.", "special served. see you tomorrow."], rank: ["promotion!", "new hat. same chef."],
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
  let hostMuted = false; // the player page's own sound button (cc-mute)
  function tone(freq, dur, type, vol, slide, delay) {
    if (muted || hostMuted) return;
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
  let paused = false, crumbs = []; // 1.1: pause (cc-pause / tab hidden); crumbs fly off every landing
  let stack = [], debris = [], fx = [], mover = null, camOff = 0, line = pick(LINES.hello), lineT = 0, face = "happy", faceT = 0, shake = 0, startAt = 0, endAt = 0, endT = 0, sinceCursed = 0;
  try { best = +localStorage.getItem("st-best") || 0; } catch (e) {}
  // 1.3: the career save (st-career, new; st-best and st-muted are untouched): lifetime layers, runs and orders, the
  // fridge finds you have stacked, and today's special (one goal a day, the same for everyone, with a day streak)
  let career = { layers: 0, runs: 0, orders: 0, finds: {}, day: "", done: false, streak: 0, last: "" };
  try { const c = JSON.parse(localStorage.getItem("st-career")); if (c && typeof c === "object") Object.assign(career, c); } catch (e) {}
  if (!career.finds || typeof career.finds !== "object") career.finds = {};
  ["layers", "runs", "orders", "streak"].forEach((k) => { career[k] = Math.max(0, +career[k] || 0); });
  const saveCareer = () => { try { localStorage.setItem("st-career", JSON.stringify(career)); } catch (e) {} };
  const dayKey = (d) => d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  const NOW = new Date(), TODAY = dayKey(NOW), YDAY = dayKey(new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - 1));
  if (career.day !== TODAY) { career.day = TODAY; career.done = false; }
  let runFinds = 0, runPerfects = 0, notes = [], missKind = "", missPiece = null;
  const SPECIALS = [
    ["stack 15 layers in one run", () => layers >= 15], ["land 4 perfects in a row", () => bestCombo >= 4],
    ["stack 2 fridge finds in one run", () => runFinds >= 2], ["fill 2 orders in one run", () => orders >= 2],
    ["score 40 in one run", () => score >= 40], ["land 6 perfects in one run", () => runPerfects >= 6], ["stack 25 layers in one run", () => layers >= 25],
  ];
  const SPECIAL = SPECIALS[Math.floor(Date.UTC(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()) / 864e5) % SPECIALS.length];
  const dayStreak = () => (career.last === TODAY || career.last === YDAY ? career.streak : 0);
  function checkSpecial() {
    if (career.done || !SPECIAL[1]()) return;
    career.done = true; career.streak = career.last === YDAY ? career.streak + 1 : career.last === TODAY ? career.streak : 1; career.last = TODAY;
    saveCareer(); say("special", true); react("happy", 1.2); sfx.order();
    notes.push("today's special: done ✓ · " + career.streak + " day streak");
    fx.push({ s: "today's special: done!", x: W / 2, y: H * 0.3, col: "#ffb340", life: 1.8, max: 1.8, big: true });
  }
  function say(kind, force) { if (force || lineT <= 0.5) { line = pick(LINES[kind]); lineT = 2; } }
  function react(f, s) { face = f; faceT = s; }
  const topY = () => (stack.length ? stack[stack.length - 1].y : 0);
  const top = () => stack[stack.length - 1];

  function nextKind() {
    if (layers > 0 && (layers + 1) % 10 === 0) return "bread";
    sinceCursed++;
    if (layers >= 4 && sinceCursed > 4 && Math.random() < 0.28) {
      sinceCursed = 0;
      const r = rankOf(career.layers), pool = CURSED.filter((k) => !FIND_RANK[k] || r >= FIND_RANK[k]);
      // a find you've never stacked turns up more often, so the collection fills
      const fresh = pool.filter((k) => !career.finds[k]);
      return fresh.length && Math.random() < 0.5 ? pick(fresh) : pick(pool);
    }
    let k; do { k = pick(FOOD); } while (stack.length && k === top().kind);
    return k;
  }
  function spawnMover() {
    const tp = top(), kind = nextKind(), h = KIND[kind].h * LH;
    const fromLeft = layers % 2 === 0, speed = Math.min(W * 1.25, W * (0.42 + layers * 0.025)) * (0.9 + Math.random() * 0.2);
    // Chef: "the first tap bounces back to the title screen". On a wide screen the ingredient used to start off the
    // left edge, a long way from the stack, so a quick first drop missed the sandwich completely and the run ended
    // at once. It now enters already over the stack (30% overlap) and slides on toward it, so no drop can whiff
    // just because it came early.
    const near = tp.w * 0.7;
    const x = fromLeft ? Math.max(-tp.w * 0.6, tp.x - near) : Math.min(W - tp.w * 0.4, tp.x + near);
    mover = { kind, w: tp.w, h, x, y: tp.y - h - LH * 1.8, vx: fromLeft ? speed : -speed, drop: false, vy: 0 };
    if (CURSED.includes(kind)) { say(kind, true); react("shock", 0.8); sfx.cursed(); }
  }
  function board() {
    // the bottom slice of bread sits on the plate
    stack = [{ kind: "bread", x: W / 2 - BASEW / 2, w: BASEW, y: -KIND.bread.h * LH, h: KIND.bread.h * LH, wob: 0 }];
    camOff = targetCam(); spawnMover();
  }
  function start() {
    state = "play"; t = 0; score = 0; layers = 0; combo = 0; bestCombo = 0; orders = 0; debris = []; fx = []; sinceCursed = 0; paused = false; crumbs = [];
    runFinds = 0; runPerfects = 0; notes = []; missKind = ""; missPiece = null; stamp = null;
    startAt = performance.now();
    sdk((c) => c.start && c.start());
    board(); say("hello", true); react("happy", 0.8);
    if (career.orders === 0) line = "10 layers = one order. go.";
  }
  function end() {
    state = "over"; endAt = performance.now(); prevBest = best;
    if (score > best) { best = score; try { localStorage.setItem("st-best", String(best)); } catch (e) {} }
    career.runs++; saveCareer();
    say("end", true); react("cooked", 99); sfx.end();
    const dur = Math.round(performance.now() - startAt);
    sdk((c) => c.score && c.score(score));
    // review r5: a run that ends by missing the sandwich is a finished run (it was only "completed" after an order)
    sdk((c) => c.end && c.end({ score, durationMs: dur, completed: true }));
  }

  // ---------- dropping ----------
  function land() {
    const m = mover, tp = top();
    const l = Math.max(m.x, tp.x), r = Math.min(m.x + m.w, tp.x + tp.w), ov = r - l;
    const y = tp.y - m.h;
    if (ov <= 0) { // missed the sandwich
      debris.push({ kind: m.kind, x: m.x, y, w: m.w, h: m.h, vx: m.vx * 0.3, vy: 0, rot: 0, vr: (m.x < tp.x ? -1 : 1) * 3 });
      mover = null; shake = reduce ? 0 : 0.3; endT = 0.9; state = "falling"; missKind = m.kind;
      missPiece = { kind: m.kind, w: m.w, h: m.h, side: m.x < tp.x ? -1 : 1 };
      return;
    }
    // r5: a kinder perfect window for the first six layers (a stranger learns what "dead on" means), then 4%
    const tol = Math.max(4, tp.w * (layers < 6 ? 0.07 : 0.04));
    let nx = l, nw = ov;
    if (Math.abs(m.x - tp.x) <= tol) {
      combo++; runPerfects++; bestCombo = Math.max(bestCombo, combo); nx = tp.x; nw = tp.w;
      if (combo >= 3) { const g = Math.min(BASEW - nw, BASEW * 0.06); nw += g; nx -= g / 2; }
      score += 1 + Math.min(5, combo); sfx.perfect(combo); say("perfect"); react("happy", 0.6);
      crumble(nx, y, nw, LIME2, combo >= 3 ? 22 : 12); flashT = 0.18;
      fx.push({ s: combo >= 3 ? "perfect x" + combo + " · grows" : "perfect" + (combo > 1 ? " x" + combo : ""), x: tp.x + tp.w / 2, y: y - 14, col: LIME2, life: 1.1, max: 1.1, world: true, size: combo >= 3 ? 20 : 18 });
    } else {
      combo = 0; score += 1; sfx.slice(); sfx.plop();
      const cut = m.w - ov;
      if (m.x < tp.x) debris.push({ kind: m.kind, x: m.x, y, w: cut, h: m.h, vx: -60, vy: -40, rot: 0, vr: -2.5 });
      else debris.push({ kind: m.kind, x: r, y, w: cut, h: m.h, vx: 60, vy: -40, rot: 0, vr: 2.5 });
      if (cut > tp.w * 0.35) { say("big"); react("shock", 0.6); shake = reduce ? 0 : Math.max(shake, 0.15); } else { say("trim"); }
      crumble(m.x < tp.x ? l : r, y, 2, SLABCOL[m.kind] || PAPER, 8);
    }
    stack.push({ kind: m.kind, x: nx, w: nw, y, h: m.h, wob: 0.25 });
    layers++; career.layers++;
    if (m.kind === "bread" && layers > 1) {
      // r5: each order is a named ticket and pays a little more than the last (10, 15, 20 ... 40)
      const bonus = Math.min(40, 10 + 5 * orders);
      orders++; career.orders++; score += bonus; sfx.order(); say("order", true); react("happy", 1);
      stamp = { s: orderName(orders - 1), n: bonus, life: 1.6, max: 1.6 }; shake = reduce ? 0 : Math.max(shake, 0.12);
      crumble(nx, y, nw, LIME2, 26);
      line = "next ticket: " + orderName(orders) + "."; lineT = 2.4;
    }
    if (CURSED.includes(m.kind)) {
      runFinds++;
      if (!career.finds[m.kind]) { career.finds[m.kind] = 1; notes.push("new fridge find: " + KIND[m.kind].name); fx.push({ s: "new find!", x: nx + nw / 2, y: y - 34, col: "#ffb340", life: 1.4, max: 1.4, world: true, size: 18 }); }
    }
    const rk = rankOf(career.layers);
    if (rk > rankOf(career.layers - 1)) {
      notes.push("promoted: " + RANKS[rk][1] + "!" + (CURSED.find((k) => FIND_RANK[k] === rk) ? " the fridge has a new find." : ""));
      say("rank", true); react("happy", 1.2); sfx.order();
      fx.push({ s: "promoted: " + RANKS[rk][1], x: W / 2, y: H * 0.26, col: LIME2, life: 1.8, max: 1.8, big: true });
    }
    checkSpecial();
    sdkScore(score);
    spawnMover();
  }
  // r5: the ORDER UP stamp (drawn over the scene): slams in big, then settles
  let stamp = null;

  // 1.1: a few crumbs off the edge of each landing (perfects throw lime sparks along the whole top)
  const SLABCOL = { bread: "#d9a35b", lettuce: "#6fbf3a", tomato: "#e5484d", cheese: "#f6c945", ham: "#f29bb0", pickle: "#4f8a32", sock: "#e5484d", phone: "#3d6be0", fish: "#9fb3c8", key: PAPER, duck: "#f6d84a", floppy: "#26357a", mug: PAPER, remote: "#26282e" };
  let flashT = 0;
  function crumble(x, y, w, col, n) {
    if (reduce) return;
    for (let i = 0; i < n; i++) { const life = 0.35 + Math.random() * 0.35; crumbs.push({ x: x + Math.random() * w, y, vx: (Math.random() - 0.5) * 320, vy: -80 - Math.random() * 220, life, max: life, col }); }
  }

  // ---------- input ----------
  function press() {
    if (paused) { setPause(false); return; }
    if (state === "title" || (state === "over" && performance.now() - endAt > 700)) { start(); return; }
    // the tap that started the run (or a double-fired one right behind it) never also drops the first layer
    if (state === "play" && mover && !mover.drop && performance.now() - startAt > 220) { mover.drop = true; mover.vy = LH * 30; }
  }
  cv.addEventListener("pointerdown", (e) => { e.preventDefault(); try { window.focus(); } catch (err) {} press(); });
  function onKey(e) {
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (e.key === " " || e.key === "Enter" || e.key === "ArrowDown") { e.preventDefault(); if (!e.repeat) press(); }
  }
  window.addEventListener("keydown", onKey);
  // 1.1: the player page's buttons (sound, restart) and its pause when a menu opens; the tab going away pauses too
  function setPause(on) {
    if (on && state === "play" && !paused) paused = true;
    else if (!on && paused) { paused = false; last = performance.now(); }
  }
  window.addEventListener("message", (e) => {
    const d = e.data; if (!d || typeof d !== "object") return;
    if (d.type === "cc-mute") hostMuted = !!d.muted;
    // r5: a restart while the missed slice is still falling reports that finished run first (it used to be thrown away)
    else if (d.type === "cc-restart") { wake(); if (state === "falling") end(); start(); }
    else if (d.type === "cc-pause") setPause(d.paused !== false);
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { setPause(true); saveCareer(); } });
  // r5: a resize mid-run (going full screen, turning the phone) keeps the sandwich centred instead of stranding it
  let shiftW = W;
  window.addEventListener("resize", () => {
    const dx = (W - shiftW) / 2; shiftW = W;
    if (!dx || state === "title") return;
    for (const s of stack) s.x += dx;
    for (const d of debris) d.x += dx;
    if (mover) mover.x += dx;
  });
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
  // review16r2: the plate used to sit at the very bottom, leaving a big empty wall between the chef and the stack for
  // the first layers. It now starts two thirds of the way down (the counter fills the rest) and climbs as before.
  const targetCam = () => Math.max(Math.min(H - 70 * U, H * 0.66), H * 0.52 - topY());
  function update(dt) {
    lineT -= dt; faceT -= dt; shake = Math.max(0, shake - dt); flashT = Math.max(0, flashT - dt);
    if (stamp && (stamp.life -= dt) <= 0) stamp = null;
    for (const c of crumbs) { c.life -= dt; c.vy += H * 1.8 * dt; c.x += c.vx * dt; c.y += c.vy * dt; }
    crumbs = crumbs.filter((c) => c.life > 0);
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
      case "duck":
        R("#c9a21e", x, y + h * 0.4, w, h * 0.6); R("#f6d84a", x, y + h * 0.4, w, h * 0.45);
        if (w > 16) { const hx = x + w * 0.62, hw = Math.min(w * 0.3, h * 0.9); R("#f6d84a", hx, y, hw, h * 0.5); R(INK, hx + hw * 0.55, y + h * 0.12, Math.max(1, hw * 0.16), Math.max(1, hw * 0.16)); R("#f08a24", hx + hw, y + h * 0.22, Math.min(hw * 0.4, 8), h * 0.16); }
        break;
      case "floppy":
        R("#16204a", x, y, w, h); R("#26357a", x + 1, y + 1, w - 2, h - 3);
        if (w > 20) { R("#b7bcc6", x + w * 0.3, y, w * 0.32, h * 0.45); R(PAPER, x + w * 0.12, y + h * 0.55, w * 0.76, h * 0.35); }
        break;
      case "mug":
        R("#bdb7a5", x, y, w, h); R(PAPER, x + 1, y, w - 2, h - 2); R("#6b4a2e", x + 2, y, w - 4, h * 0.14);
        if (w > 30) text(w > 70 ? "best chef" : "#1", x + w / 2, y + h * 0.56, Math.min(h * 0.45, 12), BAD, "center", 800);
        break;
      case "remote":
        R("#121316", x, y, w, h); R("#26282e", x + 1, y + 1, w - 2, h - 3);
        if (w > 14) { R(BAD, x + 4, y + h * 0.3, 4, 4); for (let i = 14; i < w - 6; i += 10) R(i % 20 ? "#9fb3c8" : "#5f7387", x + i, y + h * 0.3, 5, 4); }
        break;
    }
  }
  // r5: every order's top slice gets a toothpick with a little lime flag, so a tall tower shows its orders
  function flag(x, y, k) {
    cx.fillStyle = "#e9e1c0"; cx.fillRect(x - Math.max(1, k), y - 14 * k, Math.max(1, 2 * k), 16 * k);
    cx.fillStyle = INK; cx.fillRect(x + k, y - 14 * k - 1, 11 * k + 1, 7 * k + 2);
    cx.fillStyle = LIME; cx.fillRect(x + k, y - 14 * k, 11 * k, 7 * k);
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
      // review16r2: cupboard doors under the counter, so the bigger counter reads as a kitchen, not a brown block
      if (H - plateY > 90) { const dw = W / Math.max(2, Math.round(W / 150)), dy = plateY + 34, dh = Math.min(H - dy - 14, 220);
        for (let x = 0; x < W - 1; x += dw) { cx.fillStyle = "#33241a"; cx.fillRect(x + 10, dy, dw - 20, dh); cx.fillStyle = "#47331f"; cx.fillRect(x + 14, dy + 4, dw - 28, dh - 8); cx.fillStyle = "#c9a35b"; cx.fillRect(x + dw / 2 - 12, dy + 16, 24, 5); } }
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
      if (i > 0 && s.kind === "bread") flag(s.x + wob + s.w / 2, sy, 1);
    }
    if (flashT > 0 && stack.length > 1) { const s = top(); cx.globalAlpha = flashT / 0.18 * 0.7; cx.fillStyle = PAPER; cx.fillRect(s.x - 3, s.y + o - 3, s.w + 6, s.h + 6); cx.globalAlpha = 1; }
    for (const c of crumbs) { cx.globalAlpha = Math.min(1, c.life / c.max * 1.5); cx.fillStyle = c.col; cx.fillRect(c.x - 2, c.y + o - 2, 4, 4); }
    cx.globalAlpha = 1;
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
      const k = 1 - f.life / f.max; cx.globalAlpha = Math.min(1, (1 - k) * 2.2);
      // review16r2: bigger, with a dark drop shadow, and it holds before fading (it was faint and gone at once)
      const fs = f.big ? 24 : f.size || 15, fx0 = Math.max(fs * 5, Math.min(W - fs * 5, f.x)), fy0 = (f.world ? f.y + o : f.y) - k * 26;
      text(f.s, fx0 + 2, fy0 + 2, fs, INK, "center", 900); text(f.s, fx0, fy0, fs, f.col, "center", 900);
    }
    cx.globalAlpha = 1;
    cx.restore();
    // r5: ORDER UP stamp: slams down from big, a ticket with the order's name and its bonus
    if (stamp && state !== "over") {
      const k = 1 - stamp.life / stamp.max, sc = reduce ? 1 : k < 0.12 ? 1.8 - k / 0.12 * 0.8 : 1, a = Math.min(1, stamp.life / 0.35);
      const sw = Math.min(W * 0.8, 300) * sc, sh = 74 * sc, sx = W / 2 - sw / 2, sy = H * 0.3 - sh / 2;
      cx.globalAlpha = a;
      cx.fillStyle = INK; cx.fillRect(sx - 3, sy - 3, sw + 6, sh + 6);
      cx.fillStyle = PAPER; cx.fillRect(sx, sy, sw, sh);
      cx.fillStyle = "#d8d3c4"; for (let x = sx; x < sx + sw; x += 10) cx.fillRect(x, sy + sh - 4, 5, 4);
      text("order up!", W / 2, sy + sh * 0.32, Math.round(26 * sc), BAD, "center", 900);
      text(stamp.s + "  +" + stamp.n, W / 2, sy + sh * 0.7, Math.round(14 * sc), INK, "center", 800);
      cx.globalAlpha = 1;
    }
    drawHud(time);
    tipY = -1;
    if (state === "title" || state === "over") overlay();
    if (paused && state === "play") {
      cx.fillStyle = "rgba(8, 9, 7, 0.78)"; cx.fillRect(0, 0, W, H);
      text("paused", W / 2, H * 0.42, Math.max(28, Math.min(48, W / 9)), CASE, "center", 900);
      text("tap or press space to keep going", W / 2, H * 0.42 + 40, 15, LIME, "center", 800);
    }
    tipSync(tipY); // K-0059: shared tip button (assets/tip.js)
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
    // r5: the order ticket: which order you're on and ten pips to the bread that closes it (a goal from the first tap)
    if (state !== "title") {
      const on = layers % 10, pw2 = Math.max(5, Math.min(8, (px - 30) / 10 - 1));
      text("order " + (orders + 1), 14, 42, 12, "#c9c4a8", "left", 700);
      for (let i = 0; i < 10; i++) { cx.fillStyle = i < on ? (i === 9 ? "#d9a35b" : LIME) : i === 9 ? "#5a4029" : "#34372f"; cx.fillRect(14 + i * (pw2 + 2), 53, pw2, pw2); }
    }
    // review16r2: says what the streak does (3 in a row grows the sandwich back), bigger
    if (combo >= 1 && state === "play") { const cs = combo >= 3 ? "streak x" + combo + " · growing" : "streak x" + combo + " · " + (3 - combo) + " more grows it"; text(cs, W / 2, py + ph + 40, Math.max(12, Math.min(15, W / 28)), combo >= 2 ? LIME2 : "#8a8e80", "center", 800); }
    if (lineT > 0 || state === "play") text(line, W / 2, py + ph + 16, Math.max(11, Math.min(15, W / 30)), PAPER, "center", 700);
  }
  // K-0059: shared tip button (assets/tip.js)
  // The game-over card is drawn on the canvas, so the pill lives in a small fixed box (#cc-tip-box, styled in
  // index.html) placed just under the "tap to ... again" line, shown only while that line is, hidden once a run starts.
  // Taps on the box's empty space fall through to the canvas (restart as usual); taps on the pill never reach it.
  let tipBox = null, tipY = -1;
  function tipSync(y) {
    const show = y >= 0;
    if (show && !tipBox && window.ccTip) {
      tipBox = document.createElement("div"); tipBox.id = "cc-tip-box"; tipBox.hidden = true;
      document.body.appendChild(tipBox);
      // after a click the link would keep focus and swallow Space/Enter; hand the keys back to the game
      tipBox.addEventListener("click", () => setTimeout(() => { const a = document.activeElement; if (a && tipBox.contains(a)) a.blur(); }, 0), true);
      try { Promise.resolve(window.ccTip.mount(tipBox, { game: "sandwich-tower", slot: "game-over" })).catch(() => {}); } catch (e) {}
    }
    if (!tipBox) return;
    if (tipBox.hidden === show) tipBox.hidden = !show;
    if (show) { const t = Math.round(Math.max(0, Math.min(y, H - 72))) + "px"; if (tipBox.style.top !== t) tipBox.style.top = t; }
  }
  // r5: the career bar (rank, layers to the next one), used on the title and the end card
  function rankBar(y, size) {
    const r = rankOf(career.layers), nx = RANKS[r + 1], bw = Math.min(W - 60, 280), bx = W / 2 - bw / 2;
    text(nx ? "rank: " + RANKS[r][1] + " · " + (nx[0] - career.layers) + " layers to " + nx[1] : "rank: " + RANKS[r][1] + ". no higher hat exists.", W / 2, y, size, "#c9c4a8", "center", 700);
    const k = nx ? (career.layers - RANKS[r][0]) / (nx[0] - RANKS[r][0]) : 1;
    cx.fillStyle = "#34372f"; cx.fillRect(bx, y + size * 0.8, bw, 6);
    cx.fillStyle = LIME; cx.fillRect(bx, y + size * 0.8, Math.round(bw * Math.max(0, Math.min(1, k))), 6);
  }
  // r5: the fridge-finds shelf: every find you've stacked, a dark "?" for the rest
  function findsRow(y) {
    const n = CURSED.filter((k) => career.finds[k]).length, cw = Math.min(34, (W - 40) / CURSED.length - 6), gap = 6;
    text("fridge finds " + n + "/" + CURSED.length, W / 2, y, 12, "#ffb340", "center", 800);
    let x = W / 2 - (CURSED.length * (cw + gap) - gap) / 2;
    for (const k of CURSED) {
      if (career.finds[k]) drawSlab(k, x, y + 12, cw, 12);
      else { cx.fillStyle = "#26282a"; cx.fillRect(x, y + 12, cw, 12); text("?", x + cw / 2, y + 18, 9, "#6b6e64", "center", 800); }
      x += cw + gap;
    }
  }
  // r5: the whole sandwich, zoomed out to fit a box (the end card's picture: the camera only ever shows the top)
  function miniTower(top0, bot) {
    if (stack.length < 1 || bot - top0 < 70) return;
    const tall = -top().y + 16, k = Math.min(1, (bot - top0 - 8) / tall, (W * 0.86) / (BASEW * 1.36)), py = bot - 6;
    const X = (x) => W / 2 + (x - W / 2) * k;
    cx.fillStyle = INK; cx.fillRect(W / 2 - BASEW * 0.7 * k, py - 1, BASEW * 1.4 * k, 6);
    cx.fillStyle = "#e9e6dc"; cx.fillRect(W / 2 - BASEW * 0.68 * k, py, BASEW * 1.36 * k, 4);
    for (let i = 0; i < stack.length; i++) {
      const s = stack[i];
      drawSlab(s.kind, X(s.x), py + s.y * k, s.w * k, Math.max(1, s.h * k));
      if (i > 0 && s.kind === "bread") flag(X(s.x + s.w / 2), py + s.y * k, Math.max(0.5, k));
    }
    // the one that missed, lying on the counter beside the plate
    if (missPiece) {
      const w = missPiece.w * k, h = Math.max(2, missPiece.h * k), side = missPiece.side;
      const x = Math.max(4, Math.min(W - w - 4, side < 0 ? W / 2 - BASEW * 0.7 * k - w - 6 : W / 2 + BASEW * 0.7 * k + 6));
      cx.save(); cx.translate(x + w / 2, py - h / 2); cx.rotate(side * 0.18); drawSlab(missPiece.kind, -w / 2, -h / 2, w, h); cx.restore();
    }
  }
  function overlay() {
    const over = state === "over";
    cx.fillStyle = over ? "rgba(8, 9, 7, 0.88)" : "rgba(8, 9, 7, 0.8)"; cx.fillRect(0, 0, W, H);
    const big = Math.round(Math.max(26, Math.min(52, W / 9, H / 12))), small = Math.max(11, Math.min(13, W / 34)), roomy = H >= 560;
    if (state === "title") {
      // laid out top-down from a block height, so it fits a 430 px player frame as well as a tall phone
      const block = big * 2.4 + 30 + (roomy ? 96 : 0) + 56 + 26 + (best > 0 ? 20 : 0) + 24 + 32 + 30;
      let y = Math.max(big * 0.6 + 6, (H - block) / 2 + big * 0.5);
      text("sandwich", W / 2, y, big, CASE, "center", 900); y += big * 1.1;
      text("tower", W / 2, y, big, LIME, "center", 900); y += big * 0.75 + 8;
      text("the computer is cooking. you are stacking.", W / 2, y, Math.max(12, Math.min(16, W / 30)), "#c9c4a8", "center", 700); y += 22;
      if (roomy) {
        const sw = Math.min(150, W * 0.4), sx = W / 2 - sw / 2;
        let yy = y + 86;
        [["bread", 0], ["tomato", 6], ["cheese", -4], ["lettuce", 3], ["bread", 0]].forEach(([k, dx]) => { const h = KIND[k].h * 14; yy -= h; drawSlab(k, sx + dx, yy, sw, h); });
        flag(W / 2, yy, 1); y += 96;
      }
      text("tap to drop. whatever hangs over gets sliced off.", W / 2, y, Math.max(11, Math.min(15, W / 31)), LIME2, "center", 800); y += 22;
      text("10 layers fill an order. miss: lunch is over.", W / 2, y, Math.max(11, Math.min(14, W / 33)), "#ffb340", "center", 700); y += 34;
      text("tap to start cooking", W / 2, y, 18, LIME, "center", 900); y += 26;
      if (best > 0) { text("your best: " + best + (dayStreak() > 1 ? " · " + dayStreak() + " day streak" : ""), W / 2, y, small, PAPER, "center", 700); y += 20; }
      text("today's special: " + SPECIAL[0] + (career.done ? " ✓" : ""), W / 2, y, small, career.done ? LIME2 : "#ffb340", "center", 700); y += 24;
      rankBar(y, small); y += 32;
      if (roomy || career.runs > 0) findsRow(y);
    } else {
      // r5: the end card: what fell, the score, how tall it got (in real things), the career bar, what you unlocked,
      // and the whole sandwich zoomed out under it. Worth a screenshot.
      let y = Math.max(big * 0.6 + 6, H * 0.06 + big * 0.5);
      text("lunch is over", W / 2, y, big, BAD, "center", 900); y += big * 0.8;
      text(missKind ? (missKind === "bread" ? "the bread missed. the order was right there." : KIND[missKind].name.replace(/\?$/, "") + " missed the sandwich.") : "the sandwich has left the plate.", W / 2, y, small, "#c9c4a8", "center", 700); y += big * 0.5 + 14;
      text(String(score), W / 2, y, Math.round(big * 1.25), CASE, "center", 900); y += big * 0.9 + 6;
      const units = stack.reduce((a, s) => a + s.h, 0) / LH, cm = Math.round(units * 2);
      let ti = 0; while (ti + 1 < TALL.length && cm >= TALL[ti + 1][0]) ti++;
      text(layers + " layers · " + cm + " cm · " + (cm < TALL[1][0] ? "shorter than a phone" : "taller than " + TALL[ti][1]), W / 2, y, Math.max(11, Math.min(14, W / 33)), PAPER, "center", 800); y += 22;
      text(orders + " order" + (orders === 1 ? "" : "s") + " up · best streak " + bestCombo + " · best " + best, W / 2, y, small, "#c9c4a8", "center", 700); y += 24;
      const nudge = score > prevBest ? (prevBest > 0 ? "new best. you beat it by " + (score - prevBest) + "." : "first sandwich logged. now beat it.")
        : score === prevBest ? "tied your best. one more layer next time." : (prevBest - score) + " more to beat your best (" + prevBest + ").";
      text(nudge, W / 2, y, 15, score > prevBest ? LIME2 : "#ffb340", "center", 800); y += 26;
      rankBar(y, small); y += 30;
      const showNotes = notes.slice(0, roomy ? 3 : 1);
      if (!showNotes.length && !career.done) showNotes.push("today's special: " + SPECIAL[0]);
      for (const n of showNotes) { text(n, W / 2, y, small, n.startsWith("today") && !career.done ? "#ffb340" : LIME2, "center", 800); y += 20; }
      // the tip pill (when the site has one) sits under "tap to cook again"; tipSync keeps it above H - 72
      const tapY = H - (tipBox || window.ccTip ? 96 : 26);
      miniTower(y + 4, tapY - 18);
      if (performance.now() - endAt > 700) { text("tap to cook again", W / 2, tapY, 18, LIME, "center", 900); tipY = tapY + 18; }
    }
  }

  // the title draws one frame, then waits for a tap or key (no demo running while the page loads); play always runs
  let last = performance.now(), frames = 0, awake = false, running = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; frames++;
    if (!paused) update(dt); draw(now / 1000);
    if (!awake && state === "title" && frames > 1) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function wake() { awake = true; if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, wake, true));
  try { if (window.frameElement) window.parent.document.addEventListener("keydown", wake, true); } catch (e) {}
  window.addEventListener("resize", () => { if (!running) draw(performance.now() / 1000); });
  requestAnimationFrame(frame);
  // r5: one tap from a clip (the hub's "tap to play" card): skip the title. Nothing moves toward you until you tap
  // (the slice just slides), so a "tap to play full screen" cover over the game costs nothing; a resize re-centres.
  try { if (window.cc && cc.autostart && cc.autostart()) { wake(); start(); } } catch (e) {}

  // read-only hooks for the test scripts
  window.__st = { state: () => ({ state, t, score, layers, combo, orders, paused, mover: mover && { x: mover.x, w: mover.w, kind: mover.kind, drop: mover.drop }, top: stack.length ? { x: top().x, w: top().w } : null }),
    career: () => JSON.parse(JSON.stringify(career)), special: () => SPECIAL[0] };
})();
