/* haunted self-checkout — computer cooked games.
   Groceries ride the belt. Tap (or click) one to scan it. Possessed items have eyes: never scan those.
   Missed groceries and scanned ghosts fill the "assistance needed" meter; full meter = the till is cooked.
   A shift is 60 seconds. Space / Enter scans the item nearest the bag that isn't looking at you (and starts / retries), M mutes.
   1.2 (K-0071): misses fill the meter less (and the intro and meter say so); Space skips open-eyed items and flashes them;
   closed lanes say what opens them (scanned-item milestones) and unlock with a flash; streak counter + "perfect" bursts
   every 10 in a row; possessed items pulse harder as the belt speeds up. Test link: ?cctest=1 (the platform's test mode).
   1.3 (Nov 16 review): the player page's sound / restart / pause buttons work (cc-mute, cc-restart, cc-pause) and a hidden
   tab pauses; closed lanes are thin strips that grow as they open; bigger groceries on tall phones; a job rank with the
   next one to chase on the end card and title; "got away" pops, bag squash, score pop; __hsc.target() for bots.
   1.4 (Nov 17 review): nights. Each shift has a quota (night 1: 40 points); meet it and the next night unlocks, with a
   higher quota (saved as hsc-night; old players start at the night their best already clears). The job rank now comes
   from nights cleared, so it only goes up. "QUOTA MET" moment mid-shift, quota on the HUD from second one, bigger NOPE.
   A cooked till is a finished run too (cc.end completed: true), so it counts like a survived one. */
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
    if (muted || hostMuted) return;
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
  let W = 0, H = 0, DPR = 1, S = 64, top = 0, lanesY = [0, 0, 0], belt = { y0: 0, y1: 0 }, bag = { x: 0, y: 0 };
  // 1.3: a closed lane is a thin strip (weight 0.4) and grows to full height when it opens, so early on the open
  // belt gets the room instead of two empty lanes taking half a phone screen. laneK eases 0 (closed) -> 1 (open).
  const laneK = [1, 0, 0];
  function placeLanes() {
    const room = H - top - 30;
    const wts = laneK.map((k) => 0.4 + 0.6 * k), sum = wts[0] + wts[1] + wts[2];
    const unit = Math.min(S * (H > W * 1.5 ? 2 : 1.6), room / sum);
    let y = top + 18 + (room - unit * sum) * 0.22;
    for (let i = 0; i < 3; i++) { lanesY[i] = y + unit * wts[i] * (0.3 + 0.2 * laneK[i]); y += unit * wts[i]; }
    belt = { gap: unit };
  }
  function layout() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    top = Math.round(Math.min(H * 0.34, 230));
    // tall phones get bigger groceries (easier to tap); the belt speed is screen-width based, so timing is unchanged
    S = Math.round(Math.max(46, Math.min(84, W / (H > W * 1.5 ? 5.6 : 6.5), (H - top) / 4.6)));
    placeLanes();
    bag = { x: W - Math.max(40, S * 0.75), y: top - 26 };
  }
  window.addEventListener("resize", layout);
  layout();

  // ---------- state ----------
  let state = "title", t = 0, items = [], fx = [], meter = 0, score = 0, combo = 0, mult = 1, spawnIn = 0, best = 0, line = pick(LINES.hello), lineT = 0;
  let paused = false, hostMuted = false, bagT = 0, scoreT = 0;
  let bestStreak = 0, prevBest = 0, warnT = 0, face = "sad", faceT = 0, shake = 0, flash = 0, flashCol = BAD, startAt = 0, endAt = 0, scanned = 0, wrongs = 0, misses = 0, won = false, total = 0;
  try { best = +localStorage.getItem("hsc-best") || 0; } catch (e) {}
  const LANE_AT = [0, 10, 25], LANE_T = [0, 24, 42]; let lanes = 1;
  const lanesOpen = () => lanes;
  function checkLanes() {
    while (lanes < 3 && (scanned >= LANE_AT[lanes] || t >= LANE_T[lanes])) {
      lanes++;
      fx.push({ type: "text", x: W / 2, y: lanesY[lanes - 1], s: "lane " + lanes + " open!", col: LIME2, life: 1.3, max: 1.3, big: true });
      fx.push({ type: "burst", x: W / 2, y: lanesY[lanes - 1], life: 0.6, max: 0.6, col: LIME });
      flash = 0.3; flashCol = LIME;
    }
  }
  // 1.4: nights. Meet a night's quota (points in one shift) and the next night unlocks. The ladder was set with a
  // model of the shift (r4n sim.mjs): a slow newbie scores ~100, a casual player ~140, a good one ~170, a great one
  // ~190, a perfect bot ~240-290. The rank is nights cleared, so it never goes down.
  const QUOTA = [40, 65, 90, 110, 130, 150, 165, 180, 195, 210];
  const quotaOf = (n) => (n <= QUOTA.length ? QUOTA[n - 1] : QUOTA[QUOTA.length - 1] + (n - QUOTA.length) * 10);
  const RANKS = [[0, "bagging trainee"], [2, "cashier"], [4, "shift lead"], [6, "night manager"], [8, "store exorcist"], [10, "the till's favourite"]];
  const rankOf = (cleared) => { let r = 0; while (r + 1 < RANKS.length && cleared >= RANKS[r + 1][0]) r++; return r; };
  let night = 1, nightRun = 1, quotaHit = false, promoted = false, runBest = 0, bestPopped = false;
  try {
    const v = parseInt(localStorage.getItem("hsc-night"), 10);
    if (v >= 1) night = v;
    else if (best > 0) { while (best >= quotaOf(night)) night++; localStorage.setItem("hsc-night", String(night)); } // 1.3 players keep credit
  } catch (e) {}
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));

  function bump(n) {
    meter = Math.min(100, meter + n);
    if (meter >= 100 && state === "play") end(false);
  }
  function say(kind, force) { if (force || lineT <= 0.4) { line = pick(LINES[kind]); lineT = 2.4; } }
  function react(f, ms) { face = f; faceT = ms / 1000; }

  function start() {
    state = "play"; t = 0; items = []; fx = []; meter = 0; score = 0; combo = 0; mult = 1; spawnIn = 0.35; scanned = 0; wrongs = 0; misses = 0; won = false; total = 0; lanes = 1; bestStreak = 0;
    nightRun = night; quotaHit = false; promoted = false; runBest = best; bestPopped = false;
    startAt = performance.now(); say("hello", true); react("happy", 700); sfx.start();
    sdk((c) => c.start && c.start());
  }
  function end(survived) {
    state = "over"; endAt = performance.now(); won = survived; prevBest = best;
    if (score > best) { best = score; try { localStorage.setItem("hsc-best", String(best)); } catch (e) {} }
    say(survived ? "win" : "over", true); react(survived ? "happy" : "cooked", 99999);
    survived ? sfx.win() : sfx.over();
    if (survived) { flash = 0.5; flashCol = LIME; } else { shake = reduce ? 0 : 0.5; flash = 0.7; flashCol = BAD; } // 1.4: the end lands with the sound off too
    const dur = Math.round(performance.now() - startAt);
    sdk((c) => c.score && c.score(score));
    // 1.4: a cooked till is a finished run, not a quit one (completed: false told the site it was abandoned)
    sdk((c) => c.event && c.event("shift_over", { night: nightRun, quota: quotaHit ? 1 : 0, survived: survived ? 1 : 0 }));
    sdk((c) => c.end && c.end({ score: score, durationMs: dur, completed: true }));
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
      fx.push({ type: "text", x: cxp, y: cyp - S * 0.6, s: "NOPE", col: BAD, life: 1, max: 1, mid: true });
      fx.push({ type: "spirit", x: cxp, y: cyp, life: 1.1, max: 1.1 });
      sdk((c) => c.event && c.event("possessed_scanned", { t: Math.round(t) }));
      bump(30);
    } else {
      scanned++; combo++; mult = Math.min(4, 1 + Math.floor(combo / 5));
      score += mult; total += PRICE[it.kind] || 1;
      sfx.beep(mult); if (Math.random() < 0.18) say("scan"); if (faceT <= 0) react("happy", 260);
      bagT = 0.7; scoreT = 0.22;
      fx.push({ type: "laser", x: cxp, y: cyp, life: 0.18, max: 0.18 });
      fx.push({ type: "fly", kind: it.kind, x: it.x, y: cyp - S / 2, life: 0.45, max: 0.45 });
      fx.push({ type: "text", x: cxp, y: cyp - S * 0.65, s: mult > 1 ? "+" + mult : "beep", col: mult > 1 ? LIME2 : CASE, life: 0.6, max: 0.6 });
      if (combo > 0 && combo % 5 === 0 && mult <= 4) fx.push({ type: "text", x: W / 2, y: top + 14, s: "x" + mult + " combo", col: LIME, life: 0.9, max: 0.9, big: true });
      bestStreak = Math.max(bestStreak, combo);
      if (combo % 10 === 0) { // a perfect run of ten: a lime burst where it happened, the till beams, the frame glows
        fx.push({ type: "burst", x: cxp, y: cyp, life: 0.7, max: 0.7, col: LIME2 });
        fx.push({ type: "text", x: Math.max(80, Math.min(W - 80, cxp)), y: cyp - S * 1.1, s: "PERFECT " + combo, col: LIME2, life: 1.4, max: 1.4, big: true });
        react("happy", 900); flash = Math.max(flash, 0.25); flashCol = LIME;
      }
      checkLanes();
      if (!quotaHit && score >= quotaOf(nightRun)) quotaMet();
      else if (!bestPopped && runBest > 0 && score > runBest) { // 1.4: passing your best mid-shift gets its own moment
        bestPopped = true;
        fx.push({ type: "text", x: W / 2, y: lanesY[0] - S * 0.2, s: "NEW BEST", col: GHOST, life: 1.4, max: 1.4, big: true });
        fx.push({ type: "burst", x: W / 2, y: lanesY[0] - S * 0.2, life: 0.8, max: 0.8, col: GHOST });
      }
      sdkScore(score);
    }
  }

  // 1.4: the quota for tonight is met: the next night unlocks at once (it's banked even if the till cooks later)
  function quotaMet() {
    quotaHit = true;
    const before = rankOf(night - 1);
    night = Math.max(night, nightRun + 1);
    try { localStorage.setItem("hsc-night", String(night)); } catch (e) {}
    promoted = rankOf(night - 1) > before;
    const y = lanesY[0] - S * 0.2;
    fx.push({ type: "text", x: W / 2, y: y, s: "QUOTA MET", col: LIME2, life: 1.8, max: 1.8, big: true });
    fx.push({ type: "text", x: W / 2, y: y + Math.max(30, Math.min(44, W / 14)) * 0.95, s: promoted ? "promoted: " + RANKS[rankOf(night - 1)][1] : "night " + night + " unlocked", col: promoted ? GHOST : CASE, life: 1.8, max: 1.8, mid: true });
    fx.push({ type: "burst", x: W * 0.3, y: y, life: 0.8, max: 0.8, col: LIME2 });
    fx.push({ type: "burst", x: W * 0.7, y: y, life: 0.8, max: 0.8, col: LIME });
    fx.push({ type: "burst", x: W / 2, y: y, life: 1, max: 1, col: GHOST });
    flash = 0.5; flashCol = LIME; react("happy", 1600); sfx.win();
    line = promoted ? "promotion. you are now " + RANKS[rankOf(night - 1)][1] + ". no raise." : "quota met. the till is pleased. keep scanning."; lineT = 2.8;
    sdk((c) => c.event && c.event("quota_met", { night: nightRun, t: Math.round(t) }));
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
    if (paused) { paused = false; return; } // the first tap after a pause only resumes
    if (state !== "play") {
      if (state === "over" && performance.now() - endAt < 1200) return;
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
      if (paused || state !== "play") { press(-1, -1); return; }
      const now = performance.now() / 1000;
      let r = null, eyed = null;
      for (const it of items) {
        if (it.gone) continue;
        if (eyesOpen(it, now)) { if (!eyed || it.x > eyed.x) eyed = it; continue; }
        if (!r || it.x > r.x) r = it;
      }
      if (eyed && (!r || eyed.x > r.x) && !eyed.warned) { // the nearest one is looking at you: warn, don't scan it
        eyed.warned = true; eyed.redT = 0.45;
        fx.push({ type: "text", x: eyed.x + S / 2, y: lanesY[eyed.lane] - S * 0.7, s: "eyes! skipped", col: "#ff4d5e", life: 1.1, max: 1.1, mid: true });
      }
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
  // 1.3: the player page's sound, restart and pause (menu open) buttons, plus a pause when the tab is hidden
  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "cc-mute") hostMuted = !!d.muted;
    else if (d.type === "cc-restart") { paused = false; start(); }
    else if (d.type === "cc-pause") { if (state === "play") paused = d.paused === undefined ? true : !!d.paused; }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") paused = true; });

  // ---------- update ----------
  function update(dt) {
    if (paused) return;
    for (let i = 0; i < 3; i++) { const goal = i < (state === "play" ? lanes : 1) ? 1 : 0; laneK[i] += (goal - laneK[i]) * Math.min(1, dt * 5); }
    placeLanes();
    lineT -= dt; faceT -= dt; shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); bagT = Math.max(0, bagT - dt); scoreT = Math.max(0, scoreT - dt);
    for (const f of fx) f.life -= dt;
    fx = fx.filter((f) => f.life > 0);
    if (state !== "play") return;
    t += dt;
    if (t >= SHIFT) { end(meter < 100); return; }
    checkLanes();
    const k = t / SHIFT;
    spawnIn -= dt;
    if (spawnIn <= 0) { spawn(); spawnIn = lerp(0.95, 0.36, k) * (0.75 + Math.random() * 0.5); }
    const speed = W * lerp(0.2, 0.42, k) + 40;
    for (const it of items) {
      if (it.gone) continue;
      it.x += speed * dt;
      if (it.redT) it.redT = Math.max(0, it.redT - dt);
      if (it.x > W) {
        it.gone = true;
        if (!it.possessed) {
          misses++; combo = 0; mult = 1;
          react("sad", 500); say("miss"); sfx.miss(); flash = 0.2; flashCol = "#ffb340";
          fx.push({ type: "text", x: W - Math.max(56, S * 0.9), y: lanesY[it.lane] - S * 0.55, s: "got away", col: "#ffb340", life: 0.9, max: 0.9 });
          bump(9);
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
  function eyesOpen(it, time) { return it.possessed && (!it.sneaky || Math.sin(time * 2.3 + it.seed * 3) > 0.35); }
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
    cx.fillText(W >= 520 ? "assistance needed · misses + eyes fill it" : W >= 330 ? "assistance · misses + eyes fill it" : "misses + eyes fill it", mx, my - 3);
    // score, combo and time on the meter row, right side
    cx.textAlign = "right"; cx.textBaseline = "bottom";
    const info = (mult > 1 ? "x" + mult + "  " : "") + Math.max(0, Math.ceil(SHIFT - t)) + "s";
    cx.font = "700 12px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = mult > 1 ? LIME2 : "#8a8e80";
    cx.fillText(info, W - 14, my - 3);
    const iw = cx.measureText(info).width;
    // 1.4: tonight's quota sits right after the score ("23/40"), lime with a tick once it's met
    const q = quotaOf(nightRun), qs = quotaHit ? "/" + q + " ✓" : "/" + q;
    cx.font = "800 13px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = quotaHit ? LIME2 : "#8a8e80";
    cx.fillText(qs, W - 14 - iw - 8, my - 3);
    const qw = cx.measureText(qs).width;
    cx.font = "800 " + Math.round(22 + (reduce ? 0 : scoreT * 30)) + "px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = scoreT > 0 || quotaHit ? LIME2 : CASE;
    cx.fillText(String(score), W - 14 - iw - 8 - qw - 2, my - 1);
    const sw = cx.measureText(String(score)).width;
    // "night N" just left of the score, when the row has room for it beside the meter's own label
    cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace";
    const nt = "night " + nightRun, nx0 = W - 14 - iw - 8 - qw - 2 - sw - 8;
    const lab = W >= 520 ? 290 : W >= 330 ? 240 : 150; // roughly where the meter label ends
    if (nx0 - cx.measureText(nt).width > lab) { cx.fillStyle = quotaHit ? LIME : GHOST; cx.fillText(nt, nx0, my - 3); }
    // and a thin quota bar under the meter, so the goal is in sight from the first second
    cx.fillStyle = "#1c1e18"; cx.fillRect(mx, my + 11, mw, 3);
    cx.fillStyle = quotaHit ? LIME2 : GHOST; cx.fillRect(mx, my + 11, mw * Math.min(1, score / q), 3);
    // combo badge: big and on the belt side, so it's seen while tapping
    if (combo >= 3 && mult === 1) {
      cx.font = "800 13px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = LIME; cx.textAlign = "left"; cx.textBaseline = "top";
      cx.fillText("streak " + combo, 14, my + (meter >= 75 ? 32 : 18));
    }
    if (mult > 1) {
      const txt = "x" + mult + " combo", by = my + (meter >= 75 ? 32 : 18);
      cx.font = "800 " + Math.round(Math.min(26, W / 15)) + "px ui-monospace, Menlo, Consolas, monospace";
      const tw = cx.measureText(txt).width + 22, th = Math.round(Math.min(26, W / 15)) + 12;
      cx.fillStyle = INK; cx.fillRect(14, by, tw, th);
      cx.fillStyle = mult >= 4 ? LIME2 : LIME; cx.fillRect(16, by + 2, tw - 4, th - 4);
      cx.fillStyle = INK; cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillText(txt, 14 + tw / 2, by + th / 2 + 1);
      cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#8a8e80"; cx.textAlign = "left"; cx.textBaseline = "middle";
      cx.fillText("streak " + combo + (combo >= 10 ? "  ·  perfect" : ""), 14 + tw + 8, by + th / 2);
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
      if (!on && state === "play") {
        const next = i === open; // only the next lane to open counts up
        cx.fillStyle = next ? "#6f7560" : "#3a3d33"; cx.font = "700 " + (next ? 12 : 11) + "px ui-monospace, Menlo, Consolas, monospace"; cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.fillText("lane " + (i + 1) + " opens at " + LANE_AT[i] + " scanned" + (next ? "  (" + scanned + "/" + LANE_AT[i] + ")" : ""), W / 2, lanesY[i]);
      }
    }
    // the bag at the end
    // the bag squashes a little as each scanned item lands in it
    const bk = !reduce && bagT > 0 && bagT < 0.25 ? Math.sin((bagT / 0.25) * Math.PI) : 0;
    const bw = S * 0.7 + bk * 6, bh2 = S * 0.62 - bk * 5, bx = W - bw - 10 + bk * 3, by = top - 4 + bk * 5;
    cx.fillStyle = INK; cx.fillRect(bx - 2, by - 2, bw + 4, bh2 + 4);
    cx.fillStyle = "#c9a36a"; cx.fillRect(bx, by, bw, bh2);
    cx.fillStyle = "#a9844d"; cx.fillRect(bx, by, bw, 6); cx.fillRect(bx + bw * 0.7, by + 6, bw * 0.3, bh2 - 6);
    cx.fillStyle = INK; cx.fillRect(bx + bw * 0.3, by + bh2 * 0.45, bw * 0.4, 2);
  }
  function drawItem(it, time) {
    const x = it.x, y = it.y != null ? it.y : lanesY[it.lane] - S / 2;
    const heat = state === "play" ? Math.min(1, t / SHIFT) : 0;
    const bob = it.possessed && !reduce ? Math.sin(time * (7 + heat * 5) + it.seed) * S * (0.05 + heat * 0.06) : 0;
    const jit = it.possessed && !reduce ? (Math.sin(time * 31 + it.seed) > 0.92 ? 2 : 0) : 0;
    const eyes = eyesOpen(it, time);
    if (eyes) {
      const pulse = reduce ? 0 : (0.5 + 0.5 * Math.sin(time * (6 + heat * 8) + it.seed)) * heat;
      cx.fillStyle = it.redT ? "rgba(255, 77, 94, " + (0.25 + it.redT) + ")" : "rgba(180, 140, 255, " + (0.18 + pulse * 0.3) + ")";
      const g = 1 + pulse * 0.18;
      cx.beginPath(); cx.ellipse(x + S / 2, y + S / 2 + bob, S * 0.62 * g, S * 0.55 * g, 0, 0, Math.PI * 2); cx.fill();
    }
    cx.imageSmoothingEnabled = false;
    cx.drawImage(sprites[it.kind], px(x + jit), px(y + bob), S, S);
    if (it.possessed && it.kind !== "ghost") {
      // eyes: open, or for sneaky ones only now and then
      const open = eyes;
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
        const fs = f.big ? Math.round(Math.max(30, Math.min(44, W / 14))) : f.mid ? Math.round(Math.max(20, Math.min(26, W / 22))) : 16;
        const pop = (f.big || f.mid) ? 1 + Math.max(0, 0.25 - k) * 1.2 : 1;
        cx.globalAlpha = (f.big || f.mid) ? Math.min(1, (1 - k) * 2) : 1 - k; cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.font = "900 " + Math.round(fs * pop) + "px ui-monospace, Menlo, Consolas, monospace";
        const tx = (f.big || f.mid) ? Math.max(fs * 3.2, Math.min(W - fs * 3.2, f.x)) : f.x, ty = f.y - k * 26;
        if (f.big || f.mid) { cx.lineJoin = "round"; cx.lineWidth = Math.max(4, fs * 0.22); cx.strokeStyle = "#08090a"; cx.strokeText(f.s, tx, ty); cx.shadowColor = f.col; cx.shadowBlur = 14; }
        cx.fillStyle = f.col; cx.fillText(f.s, tx, ty); cx.shadowBlur = 0; cx.globalAlpha = 1;
      } else if (f.type === "burst") {
        cx.globalAlpha = 1 - k; cx.fillStyle = f.col;
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, d = S * (0.3 + k * 1.3); cx.fillRect(px(f.x + Math.cos(a) * d - 3), px(f.y + Math.sin(a) * d - 3), 6, 6); }
        cx.globalAlpha = 1;
      } else if (f.type === "spirit") {
        cx.globalAlpha = 1 - k; cx.imageSmoothingEnabled = false;
        cx.drawImage(sprites.ghost, px(f.x - S * 0.4 + Math.sin(k * 12) * 6), px(f.y - S * 0.5 - k * S * 1.6), S * 0.8, S * 0.8); cx.globalAlpha = 1;
      }
    }
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
      try { Promise.resolve(window.ccTip.mount(tipBox, { game: "haunted-self-checkout", slot: "game-over" })).catch(() => {}); } catch (e) {}
    }
    if (!tipBox) return;
    if (tipBox.hidden === show) tipBox.hidden = !show;
    if (show) { const t = Math.round(Math.max(0, Math.min(y, H - 112))) + "px"; if (tipBox.style.top !== t) tipBox.style.top = t; }
  }
  function overlay(time) {
    cx.fillStyle = "rgba(8, 9, 7, 0.78)"; cx.fillRect(0, top - 4, W, H - top + 4);
    cx.textAlign = "center"; cx.textBaseline = "middle";
    const big = Math.round(Math.max(24, Math.min(44, W / 11)));
    // 1.4: in a short frame the title block climbs so its last lines (quota, best) clear the sound button
    const mid = Math.max(top + big * 2.2, Math.min(top + (H - top) * 0.42, H - 40 - 84 - Math.min(S, 60) - 62 - big * 0.6));
    if (state === "title") {
      cx.fillStyle = CASE; cx.font = "800 " + big + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillText("haunted", W / 2, mid - big * 1.6); cx.fillText("self-checkout", W / 2, mid - big * 0.55);
      cx.font = "700 " + Math.round(Math.max(13, Math.min(17, W / 26))) + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillStyle = LIME; cx.fillText("tap groceries to scan them.", W / 2, mid + big * 0.6);
      cx.fillStyle = BAD; cx.fillText("never scan the ones with eyes.", W / 2, mid + big * 0.6 + 24);
      cx.fillStyle = "#ffb340"; cx.font = "700 " + Math.round(Math.max(11, Math.min(14, W / 32))) + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillText("misses fill the meter too.", W / 2, mid + big * 0.6 + 46);
      // demo sprites: a normal one and a possessed one
      cx.imageSmoothingEnabled = false;
      const d = Math.max(26, Math.min(S, 60, H - 34 - 40 - (mid + big * 0.6 + 62)));
      cx.drawImage(sprites.banana, W / 2 - d * 1.4, mid + big * 0.6 + 62, d, d);
      // 1.4: drawn at the demo size (it used to be full grocery size, so in a short landscape frame it sat on the text)
      const S0 = S; S = d;
      drawItem({ kind: "apple", lane: 0, x: W / 2 + d * 0.3, y: mid + big * 0.6 + 62, possessed: true, sneaky: false, seed: 1 }, time);
      S = S0;
    } else {
      // the end card fits above the tip pill (tipSync keeps it at least 112px off the bottom): in a short player frame
      // it climbs over the till and tightens up, and every line shrinks to the width (K-0071)
      let b = big, c = 1, y0 = top;
      const need = (bb, cc) => 3.1 * bb + 122 * cc + 4;
      if (need(b, 1) > H - 112 - y0) { y0 = 8; c = 0.8; }
      if (need(b, c) > H - 112 - y0) b = Math.max(18, Math.floor((H - 112 - y0 - 4 - 122 * c) / 3.1));
      const m = Math.max(y0 + 2.15 * b + 4, Math.min(y0 + (H - y0) * 0.42, H - 112 - 0.95 * b - 122 * c));
      if (y0 < top) { cx.fillStyle = "rgba(8, 9, 7, 0.86)"; cx.fillRect(0, 0, W, top - 4); }
      const fit = (wt, size, s) => { let f = size; do { cx.font = wt + " " + f + "px ui-monospace, Menlo, Consolas, monospace"; } while (cx.measureText(s).width > W - 16 && --f > 9); };
      const head = won ? "shift survived" : "till cooked";
      cx.fillStyle = won ? LIME : BAD; fit(800, b, head); cx.fillText(head, W / 2, m - b * 1.65);
      if (!won) { const why = misses * 9 > wrongs * 30 ? "the meter filled up: too many got away." : "the meter filled up: you scanned the haunted ones."; fit(700, 13, why); cx.fillStyle = "#ffb340"; cx.fillText(why, W / 2, m - b * 1.05); }
      cx.fillStyle = CASE; cx.font = "800 " + Math.round(b * 1.4) + "px ui-monospace, Menlo, Consolas, monospace";
      cx.fillText(String(score), W / 2, m);
      const s1 = (score > prevBest && prevBest > 0 ? "new best (was " + prevBest + ")" : "best " + best) + "  ·  " + scanned + " scanned  ·  receipt $" + total.toFixed(2), s2 = wrongs + " possessed scanned  ·  " + misses + " got away  ·  best streak " + bestStreak;
      cx.fillStyle = "#c9c4a8"; fit(700, 14, s1.length > s2.length ? s1 : s2);
      cx.fillText(s1, W / 2, m + b * 0.95); cx.fillText(s2, W / 2, m + b * 0.95 + 22 * c);
      // 1.4: the nudge is tonight's quota: met (and what the next night asks), or how short it fell
      const q = quotaOf(nightRun);
      const nudge = quotaHit ? "night " + nightRun + " cleared! next: night " + (nightRun + 1) + ", quota " + quotaOf(nightRun + 1) + "."
        : "night " + nightRun + " quota " + q + ": " + (q - score) + " short. same night again.";
      fit(800, 15, nudge); cx.fillStyle = quotaHit ? LIME2 : "#ffb340";
      cx.fillText(nudge, W / 2, m + b * 0.95 + 46 * c);
      // the job title comes from nights cleared, and says when the next one comes
      const rk = rankOf(night - 1), nx = RANKS[rk + 1];
      const rs = promoted ? "promoted! you are now " + RANKS[rk][1] + "." : "rank: " + RANKS[rk][1] + (nx ? "  ·  " + nx[1] + " after night " + nx[0] : "  ·  top of the till");
      fit(700, 14, rs); cx.fillStyle = promoted ? LIME2 : GHOST; cx.fillText(rs, W / 2, m + b * 0.95 + 68 * c);
      if (performance.now() - endAt > 1200) { cx.fillStyle = LIME; cx.font = "800 17px ui-monospace, Menlo, Consolas, monospace"; cx.fillText((quotaHit ? "tap to start night " : "tap to try night ") + night, W / 2, m + b * 0.95 + 98 * c); tipY = m + b * 0.95 + 122 * c; }
    }
    if (state === "title") {
      const ty = Math.min(H - 34, mid + big * 0.6 + 62 + Math.max(26, Math.min(S, 60, H - 34 - 40 - (mid + big * 0.6 + 62))) + 40);
      const pulse = reduce ? 1 : 0.75 + 0.25 * Math.sin(time * 4);
      cx.globalAlpha = pulse; cx.fillStyle = LIME; cx.font = "800 17px ui-monospace, Menlo, Consolas, monospace"; cx.fillText(night > 1 ? "tap to start night " + night : "tap to start your shift", W / 2, ty); cx.globalAlpha = 1;
      if (ty + 24 < H - 8) { // 1.4: tonight's quota, and for a returning player their best and job
        const fit = (s, f) => { do { cx.font = "700 " + f + "px ui-monospace, Menlo, Consolas, monospace"; } while (cx.measureText(s).width > W - 16 && --f > 9); };
        const s1 = "night " + night + " · quota: " + quotaOf(night) + " points in one shift";
        cx.fillStyle = GHOST; fit(s1, 13); cx.fillText(s1, W / 2, ty + 24);
        if (best > 0 && ty + 44 < H - 6) { const s2 = "best " + best + " · " + RANKS[rankOf(night - 1)][1]; cx.fillStyle = "#8a8e80"; fit(s2, 12); cx.fillText(s2, W / 2, ty + 43); }
        // the ladder: ten nights, cleared ones lit, tonight outlined (past ten it just says "overtime")
        const py = ty + (best > 0 ? 64 : 46), pw = Math.min(22, (W - 60) / 10), gap = 4;
        if (py + 8 < H - 44) {
          const x0 = W / 2 - (pw * 10 + gap * 9) / 2;
          for (let i = 0; i < 10; i++) {
            const x = x0 + i * (pw + gap);
            if (i + 1 < night) { cx.fillStyle = LIME; cx.fillRect(x, py, pw, 8); }
            else { cx.fillStyle = "#23261d"; cx.fillRect(x, py, pw, 8); if (i + 1 === night) { cx.strokeStyle = GHOST; cx.lineWidth = 2; cx.strokeRect(x - 1, py - 1, pw + 2, 10); } }
          }
          if (night > 10) { cx.fillStyle = LIME2; cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.fillText("overtime: night " + night, W / 2, py + 22); }
        }
      }
    }
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
    if (state !== "over") for (const it of items) drawItem(it, time);
    drawFx();
    if (state === "play") drawHud();
    if (paused && state === "play") {
      cx.fillStyle = "rgba(8, 9, 7, 0.72)"; cx.fillRect(0, top + 4, W, H - top - 4);
      cx.textAlign = "center"; cx.textBaseline = "middle"; cx.fillStyle = CASE; cx.font = "800 26px ui-monospace, Menlo, Consolas, monospace";
      cx.fillText("paused", W / 2, lanesY[0]);
      cx.fillStyle = LIME; cx.font = "800 16px ui-monospace, Menlo, Consolas, monospace"; cx.fillText("tap to carry on", W / 2, lanesY[0] + 34);
    }
    tipY = -1;
    if (state !== "play") overlay(time);
    tipSync(tipY); // K-0059: shared tip button (assets/tip.js)
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
  window.__hsc = { state: () => ({ state, t, score, meter, won, scanned, wrongs, misses, items: items.length, lanes, combo, bestStreak, night, nightRun, quota: quotaOf(nightRun), quotaHit, promoted }) };
  // test-only hooks (?cctest=1): pop the two hook texts, end the shift
  if (/[?&]cctest=1/.test(location.search + (() => { try { return parent.location.search; } catch (e) { return ""; } })())) Object.assign(window.__hsc, {
    pop: () => { fx.push({ type: "text", x: W - 20, y: lanesY[0] - S * 1.1, s: "PERFECT 10", col: LIME2, life: 1.4, max: 1.4, big: true }); fx.push({ type: "text", x: W / 2, y: lanesY[lanesY.length - 1] - S * 0.7, s: "eyes! skipped", col: "#ff4d5e", life: 1.1, max: 1.1, mid: true }); },
    end: (w) => { if (state === "play") end(!!w); },
    // 1.4: jump to a night (and its quota) for screenshots; score(n) sets the score as if scanned
    night: (n) => { night = Math.max(1, n | 0); },
    score: (n) => { if (state === "play") { score = n | 0; if (!quotaHit && score >= quotaOf(nightRun)) quotaMet(); } },
    // 1.3: where to tap for the safe item nearest the bag (null if none), and the lane layout, for playtest bots
    target: () => { let r = null; for (const it of items) if (!it.gone && !it.possessed && it.x > -S * 0.3 && it.x < W - S && (!r || it.x > r.x)) r = it; return r ? [Math.round(r.x + S / 2), Math.round(lanesY[r.lane])] : null; },
    lanes: () => ({ S, lanesY: lanesY.map(Math.round), laneK: laneK.slice(), paused }),
  });
})();
