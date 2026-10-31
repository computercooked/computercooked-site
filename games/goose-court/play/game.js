/* goose court — computer cooked games.
   A goose is on trial. The placard says the charge (bread theft, phone theft...). Look at the beak:
   holding the charged item = GUILTY, anything else (or nothing) = NOT GUILTY. Swipe left/right, tap the buttons,
   or use ←/G and →/N. Wrong verdicts and timeouts are strikes; three and you're disbarred.
   Later: the goose's lawyer shouts OBJECTION! over the beak (tap it to overrule), disguises, sleight-of-beak swaps,
   and double charges. Space / Enter starts and retries, M mutes. */
(function () {
  "use strict";
  // ---------- platform sdk: optional, every call guarded ----------
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  let lastScoreSent = 0;
  const sdkScore = (n) => { const t = performance.now(); if (t - lastScoreSent > 400) { lastScoreSent = t; sdk((c) => c.score && c.score(n)); } };

  const cv = document.getElementById("c"), cx = cv.getContext("2d");
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MONO = "ui-monospace, Menlo, Consolas, monospace";

  // ---------- palette: the computer cooked computer + a courtroom ----------
  const CASE = "#e6d596", CASE2 = "#d8c187", SIDE = "#a6975d", DEEP = "#554e2c", INK = "#0b0c0e", LIME = "#a8d533", LIME2 = "#dcff7a";
  const BAD = "#ff4d5e", GOOD = "#5fd36a", WOOD = "#6b4424", WOOD2 = "#4e301a", WOOD3 = "#8a5a32", PAPER = "#f4f1e6";

  // ---------- sprites, drawn by hand (no canvas read-back: plain fillRect runs) ----------
  const PAL = { K: INK, W: "#f7f5ee", w: "#cfcbbd", O: "#ff9a3d", o: "#c46a1c", k: "#1a1b1f", T: "#d79b52", t: "#9c6a2c", B: "#3d7be0", b: "#9fc2ff",
    Y: "#f6d84a", y: "#c9a628", R: "#e5484d", C: "#7fe0ff", G: "#8a8e98", g: "#5c606a", S: "#2a2d33", s: "#555a66", N: "#e5484d", P: "#b88a52" };
  const ART = {
    goose: [
      "................",
      "..........KKK...",
      ".........KWWWK..",
      ".........KWkWKOO",
      ".........KWWWOOo",
      "..........KWWKK.",
      "..........KWWK..",
      "..........KWWK..",
      "....KKK...KWWK..",
      "...KWWWKKKWWWK..",
      "..KWWWWWWWWWWK..",
      ".KWwWWWWWWWWWK..",
      ".KWwwWWWWWWWK...",
      "..KWwwwWWWWK....",
      "...KKKKKKKK.....",
      ".....OO..OO.....",
    ],
    bread: ["..KKKKK..", ".KTTTTTK.", "KTTtTtTTK", "KTTTTTTTK", "KtTTTTTtK", ".KKKKKKK."],
    phone: [".KKKKK.", "KbBBBBK", "KBBBBBK", "KBBBBBK", "KBBBBBK", "KBBBBBK", "KKKkKKK"],
    crown: ["K..K..K", "KK.K.KK", "KYKYKYK", "KYYYYYK", "KYRYCYK", "KKKKKKK"],
    keys: [".KKK.....", "KYYYK....", "KY.YKKKKK", "KYYYKYYYK", ".KKK.KYKK", "......K.."],
    ring: ["...KK...", "..KCCK..", ".KKKKKK.", "KY....YK", "KY....YK", ".KYYYYK.", "..KKKK.."],
    shoe: ["....KKK..", "...KRRRK.", "..KRRWRK.", "KKKRRRRK.", "KRRRRRRRK", "KWWWWWWWK", "KKKKKKKKK"],
  };
  const ITEMS = ["bread", "phone", "crown", "keys", "ring", "shoe"];
  const NAMES = { bread: "bread theft", phone: "phone theft", crown: "crown theft", keys: "stolen car keys", ring: "ring theft", shoe: "shoe theft" };
  function build(rows) {
    const h = rows.length, w = Math.max(...rows.map((r) => r.length));
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d");
    rows.forEach((row, y) => { for (let x = 0; x < row.length;) { const ch = row[x]; if (ch === ".") { x++; continue; } let e = x + 1; while (e < row.length && row[e] === ch) e++; g.fillStyle = PAL[ch]; g.fillRect(x, y, e - x, 1); x = e; } });
    return c;
  }
  const SPR = {};
  for (const k in ART) SPR[k] = build(ART[k]);

  // the judge's face (the brand computer's screen), 16x10
  const FACES = {
    sad: ["................", ".##..........##.", "...##......##...", "................", "..###......###..", "..###......###..", "................", ".....######.....", "....#......#....", "................"],
    happy: ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "...#........#...", "....########....", ".....######.....", "................"],
    shock: ["................", "..###......###..", ".#...#....#...#.", ".#...#....#...#.", "..###......###..", "................", "......####......", ".....#....#.....", "......####......", "................"],
    cooked: ["................", "..#...#..#...#..", "...#.#....#.#...", "....#......#....", "...#.#....#.#...", "..#...#..#...#..", "................", "..#.#.#.#.#.#.#.", ".#.#.#.#.#.#.#..", "................"],
    stern: ["................", ".###........###.", "....##....##....", "................", "..###......###..", "..###......###..", "................", "....########....", "................", "................"],
  };

  const LINES = {
    hello: ["court is in session.", "all rise. or don't. it's a goose."],
    guilty: ["lock it up.", "the bread has been avenged.", "honk denied.", "guilty as feathered.", "take it away."],
    free: ["free bird.", "case dismissed.", "the goose is innocent. this time.", "you may waddle."],
    wrong: ["the jury is booing.", "that was the wrong call.", "that goose will remember this.", "appeal filed. by the goose."],
    late: ["it walked. on a technicality.", "too slow, your honour.", "the goose left. it had places to be."],
    overruled: ["overruled.", "objection denied. sit down.", "nice try, counsel."],
    over: ["you have been disbarred.", "the geese have taken the court.", "court adjourned. forever."],
  };
  const pick = (a) => a[(Math.random() * a.length) | 0];

  // ---------- sound ----------
  let actx = null, muted = false;
  try { muted = localStorage.getItem("gc-muted") === "1"; } catch (e) {}
  const muteBtn = document.getElementById("mute");
  function syncMute() { muteBtn.textContent = muted ? "sound off" : "sound on"; muteBtn.setAttribute("aria-pressed", muted ? "true" : "false"); }
  syncMute();
  function toggleMute() { muted = !muted; try { localStorage.setItem("gc-muted", muted ? "1" : "0"); } catch (e) {} syncMute(); }
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
    gavel: () => { tone(140, 0.09, "triangle", 0.12, 60); tone(90, 0.12, "sine", 0.1, 50, 0.01); },
    right: (m) => tone(880 + m * 110, 0.09, "square", 0.045),
    wrong: () => { tone(170, 0.35, "sawtooth", 0.07, 80); },
    honk: () => { tone(330, 0.16, "sawtooth", 0.06, 260); tone(345, 0.16, "square", 0.03, 270, 0.02); },
    objection: () => { tone(520, 0.08, "square", 0.05); tone(700, 0.12, "square", 0.05, 0, 0.08); },
    over: () => tone(260, 0.6, "sawtooth", 0.07, 55),
  };

  // ---------- layout ----------
  let W = 0, H = 0, DPR = 1, U = 1, L = {};
  function layout() {
    const phone = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    DPR = Math.min(phone ? 1.5 : 2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    U = Math.max(0.75, Math.min(1.6, Math.min(W / 420, H / 720)));
    const btnH = Math.round(Math.max(64, Math.min(96, H * 0.12)));
    const placardY = 46, placardH = Math.round(74 * Math.min(1.2, U)), timerY = placardY + placardH + 6;
    const judgeTop = timerY + 22, benchW = Math.min(W * 0.42, 190 * U), judgeH = benchW * 0.62 * 0.72, benchH = 30 * U;
    const floorY = H - btnH - 30;
    const room = floorY - (judgeTop + judgeH + benchH + 10);
    L = {
      placardY, placardH, timerY, judgeTop, benchW, judgeH, benchH,
      floorY, btnY: H - btnH - 14, btnH,
      goose: Math.max(48, Math.round(Math.min(W * 0.34, room * 0.75) / 8) * 8),
    };
    L.gooseX = W * 0.56; L.gooseY = L.floorY - L.goose * 0.3;
  }
  window.addEventListener("resize", layout);
  layout();

  // ---------- state ----------
  let state = "title", elapsed = 0, score = 0, best = 0, prevBest = 0, combo = 0, mult = 1, strikes = 0, judged = 0, correct = 0, docket = 0;
  let kase = null, fb = null, fx = [], line = pick(LINES.hello), lineT = 0, face = "stern", faceT = 0, shake = 0, startAt = 0, endAt = 0;
  try { best = +localStorage.getItem("gc-best") || 0; } catch (e) {}
  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));
  function say(kind, force) { if (force || lineT <= 0.5) { line = pick(LINES[kind]); lineT = 2.2; } }
  function react(f, s) { face = f; faceT = s; }

  function newCase() {
    const k = Math.min(1, elapsed / 75);
    const doubleCharge = elapsed > 45 && Math.random() < 0.35;
    const c1 = pick(ITEMS);
    let charges = [c1];
    if (doubleCharge) { let c2 = pick(ITEMS); while (c2 === c1) c2 = pick(ITEMS); charges.push(c2); }
    const guilty = Math.random() < 0.5;
    let item;
    if (guilty) item = pick(charges);
    else item = Math.random() < 0.25 ? null : pick(ITEMS.filter((i) => !charges.includes(i)));
    const dur = lerp(3.4, 1.45, k) + (doubleCharge ? 0.4 : 0);
    const c = { charges, item, dur, t: 0, n: ++docket, disguise: elapsed > 15 && Math.random() < 0.3, swap: null, objection: null, enter: 0 };
    // sleight of beak: the goose swaps what it's holding partway through (judge the final item)
    if (elapsed > 30 && Math.random() < 0.25) {
      const target = Math.random() < 0.5 ? pick(charges) : (Math.random() < 0.3 ? null : pick(ITEMS.filter((i) => !charges.includes(i))));
      if (target !== item) { c.swap = { at: dur * 0.35, to: target, done: false }; c.dur += 0.35; }
    }
    // the lawyer objects: a card over the beak for a moment, tap it to overrule
    if (elapsed > 12 && Math.random() < 0.3) c.objection = { at: dur * 0.12, len: 0.95, cleared: false };
    kase = c;
    sfx.honk();
  }
  function finalItem(c) { return c.swap && c.swap.done ? c.swap.to : c.item; }
  function objectionUp(c) { return c.objection && !c.objection.cleared && c.t >= c.objection.at && c.t < c.objection.at + c.objection.len; }

  function start() {
    state = "play"; elapsed = 0; score = 0; combo = 0; mult = 1; strikes = 0; judged = 0; correct = 0; docket = 0; fx = []; fb = null;
    startAt = performance.now(); say("hello", true); react("stern", 0.8); sfx.gavel();
    sdk((c) => c.start && c.start());
    newCase();
  }
  function end() {
    state = "over"; endAt = performance.now(); prevBest = best;
    if (score > best) { best = score; try { localStorage.setItem("gc-best", String(best)); } catch (e) {} }
    say("over", true); react("cooked", 99); sfx.over();
    const dur = Math.round(performance.now() - startAt);
    sdk((c) => c.score && c.score(score));
    sdk((c) => c.end && c.end({ score, durationMs: dur, completed: false }));
  }

  function verdict(guiltyCall) {
    if (state !== "play" || !kase || fb) return;
    const c = kase;
    // a case is on screen before it can be judged (K-0056): a double tap or a held key from the last verdict used to
    // land on the next goose the moment it appeared, so that case went by unseen (case 1, then case 3)
    if (c.t < 0.15) return;
    if (c.swap && !c.swap.done && c.t < c.swap.at) { /* judged before the swap: the pre-swap item counts */ }
    const isGuilty = c.charges.includes(finalItem(c));
    const ok = guiltyCall === isGuilty;
    judged++;
    sfx.gavel();
    if (ok) {
      correct++; combo++; mult = Math.min(4, 1 + Math.floor(combo / 5));
      const fast = c.t < c.dur * 0.4 ? 1 : 0;
      score += mult + fast;
      sfx.right(mult); say(isGuilty ? "guilty" : "free"); react("happy", 0.5);
      fx.push({ type: "text", x: L.gooseX, y: L.gooseY - L.goose * 1.25, s: "+" + (mult + fast) + (fast ? " quick" : ""), col: LIME2, life: 0.7, max: 0.7 });
      if (combo > 0 && combo % 5 === 0 && mult <= 4) fx.push({ type: "text", x: W / 2, y: L.timerY + 34 * U, s: "x" + mult + " streak", col: LIME, life: 1, max: 1, big: true });
      sdkScore(score);
    } else {
      strikes++; combo = 0; mult = 1;
      sfx.wrong(); say("wrong", true); react("shock", 0.9); shake = reduce ? 0 : 0.35;
    }
    fb = { call: guiltyCall, ok, guilty: isGuilty, t: 0 };
  }
  function timeout() {
    judged++; strikes++; combo = 0; mult = 1;
    sfx.wrong(); say("late", true); react("sad", 0.9);
    fb = { call: null, ok: false, guilty: kase.charges.includes(finalItem(kase)), t: 0, late: true };
  }

  // ---------- input ----------
  let downAt = null;
  function inButton(x, y) {
    if (y < L.btnY || y > L.btnY + L.btnH) return null;
    return x < W / 2 ? "guilty" : "free";
  }
  function onObjection(x, y) {
    if (!kase || !objectionUp(kase)) return false;
    const bx = L.gooseX + L.goose * 0.35, by = L.gooseY - L.goose * 0.8;
    return Math.abs(x - bx) < L.goose * 0.7 && Math.abs(y - by) < L.goose * 0.45;
  }
  cv.addEventListener("pointerdown", (e) => {
    e.preventDefault(); try { window.focus(); } catch (err) {}
    const x = e.clientX, y = e.clientY;
    if (state !== "play") { if (state === "over" && performance.now() - endAt < 700) return; start(); return; }
    if (onObjection(x, y)) { kase.objection.cleared = true; say("overruled", true); sfx.gavel(); react("stern", 0.6); fx.push({ type: "text", x, y: y - 20, s: "overruled", col: LIME2, life: 0.7, max: 0.7 }); sdk((c) => c.event && c.event("objection_overruled", {})); return; }
    const b = inButton(x, y);
    if (b) { verdict(b === "guilty"); return; }
    downAt = { x, y };
  });
  cv.addEventListener("pointerup", (e) => {
    if (!downAt || state !== "play") { downAt = null; return; }
    const dx = e.clientX - downAt.x, dy = e.clientY - downAt.y; downAt = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) verdict(dx < 0);
  });
  function onKey(e) {
    if (e.target && (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable)) return;
    const k = e.key;
    if (k === "m" || k === "M") { toggleMute(); return; }
    if (k === " " || k === "Enter" || /^Arrow/.test(k)) e.preventDefault();
    if (e.repeat) return;
    if (state !== "play") { if (k === " " || k === "Enter") { if (state === "over" && performance.now() - endAt < 700) return; start(); } return; }
    if (k === "ArrowLeft" || k === "g" || k === "G") verdict(true);
    else if (k === "ArrowRight" || k === "n" || k === "N") verdict(false);
    else if ((k === " " || k === "Enter" || k === "o" || k === "O") && kase && objectionUp(kase)) { kase.objection.cleared = true; say("overruled", true); sfx.gavel(); }
  }
  window.addEventListener("keydown", onKey);
  // on the player page the focus is usually the page itself: same origin, so listen there too while the game is on screen
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
  function update(dt) {
    lineT -= dt; faceT -= dt; shake = Math.max(0, shake - dt);
    for (const f of fx) f.life -= dt;
    fx = fx.filter((f) => f.life > 0);
    if (faceT <= 0 && state === "play") face = strikes >= 2 ? "sad" : "stern";
    if (state !== "play") return;
    elapsed += dt;
    if (fb) {
      fb.t += dt;
      if (fb.t > (fb.ok ? 0.42 : 0.75)) { fb = null; if (strikes >= 3) { end(); return; } newCase(); }
      return;
    }
    const c = kase;
    c.t += dt; c.enter = Math.min(1, c.enter + dt * 6);
    if (c.swap && !c.swap.done && c.t >= c.swap.at) { c.swap.done = true; fx.push({ type: "poof", life: 0.3, max: 0.3 }); tone(1200, 0.05, "square", 0.03); }
    if (c.objection && !c.objection.cleared && !c.objection.played && c.t >= c.objection.at) { c.objection.played = true; sfx.objection(); }
    if (c.t >= c.dur) timeout();
  }

  // ---------- draw ----------
  function text(s, x, y, size, col, align, weight) {
    cx.font = (weight || 800) + " " + Math.round(size) + "px " + MONO; cx.fillStyle = col; cx.textAlign = align || "left"; cx.textBaseline = "middle"; cx.fillText(s, x, y);
  }
  function drawFace(x, y, w, h, name) {
    const F = FACES[name] || FACES.stern, cw = w / 16, ch = h / 10;
    cx.fillStyle = LIME;
    for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (F[j][i] === "#") cx.fillRect(Math.round(x + i * cw), Math.round(y + j * ch), Math.ceil(cw), Math.ceil(ch));
  }
  function drawJudge(time) {
    // the bench, with the computer cooked computer presiding in a wig
    const bw = L.benchW, bh = L.benchH, bx = W - bw - 10, jw = bw * 0.62, jh = L.judgeH, jx = bx + (bw - jw) / 2, jy = L.judgeTop;
    const by = jy + jh - 4;
    // wig curls behind
    cx.fillStyle = "#e9e6dc";
    for (let i = 0; i < 4; i++) { cx.fillRect(jx - 10 * U, jy + i * jh * 0.22, 12 * U, jh * 0.2); cx.fillRect(jx + jw - 2 * U, jy + i * jh * 0.22, 12 * U, jh * 0.2); }
    cx.fillStyle = INK; cx.fillRect(jx - 3, jy - 3, jw + 6, jh + 6);
    cx.fillStyle = CASE; cx.fillRect(jx, jy, jw, jh);
    cx.fillStyle = SIDE; cx.fillRect(jx + jw - 6 * U, jy, 6 * U, jh);
    const sx = jx + 7 * U, sy = jy + 7 * U, sw = jw - 20 * U, sh = jh - 18 * U;
    cx.fillStyle = INK; cx.fillRect(sx, sy, sw, sh);
    const fw = Math.min(sw * 0.82, sh * 1.45), fh = fw * 10 / 16;
    drawFace(sx + (sw - fw) / 2, sy + (sh - fh) / 2, fw, fh, face);
    // wig top
    cx.fillStyle = "#e9e6dc"; cx.fillRect(jx - 4 * U, jy - 9 * U, jw + 8 * U, 8 * U);
    cx.fillStyle = "#cfcbbd"; for (let i = 0; i < 6; i++) cx.fillRect(jx + i * jw / 6, jy - 9 * U, 3 * U, 8 * U);
    // steam (it's a stressful job)
    if (!reduce) { cx.fillStyle = LIME; for (let i = 0; i < 3; i++) { const p = (time * 16 + i * 8) % 18; cx.globalAlpha = 0.55 - p / 34; cx.fillRect(jx + jw * (0.3 + i * 0.2) + Math.sin(time * 3 + i) * 2, jy - 14 * U - p, 3, 7); } cx.globalAlpha = 1; }
    // bench
    cx.fillStyle = INK; cx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
    cx.fillStyle = WOOD; cx.fillRect(bx, by, bw, bh);
    cx.fillStyle = WOOD3; cx.fillRect(bx, by, bw, 5 * U);
    cx.fillStyle = WOOD2; cx.fillRect(bx + bw * 0.4, by + 10 * U, bw * 0.2, bh - 16 * U);
    // speech bubble to the left of the bench
    const tw = Math.min(bx - 24, 260 * U);
    if (tw > 90) {
      const size = Math.max(11, Math.min(15, 13 * U));
      cx.font = "700 " + size + "px " + MONO;
      const lines = wrap(line, tw - 16);
      const lh = size + 5, bH = 12 + lines.length * lh, bX = bx - tw - 14, bY = jy + 4;
      cx.fillStyle = PAPER; cx.fillRect(bX, bY, tw, bH);
      cx.fillStyle = INK; cx.fillRect(bX, bY + bH, tw, 3); cx.fillRect(bX + tw, bY + 3, 3, bH);
      cx.beginPath(); cx.moveTo(bX + tw, bY + 10); cx.lineTo(bX + tw + 12, bY + 16); cx.lineTo(bX + tw, bY + 22); cx.fill();
      cx.fillStyle = PAPER; cx.beginPath(); cx.moveTo(bX + tw - 1, bY + 10); cx.lineTo(bX + tw + 10, bY + 16); cx.lineTo(bX + tw - 1, bY + 21); cx.fill();
      lines.forEach((l, i) => text(l, bX + 8, bY + 6 + lh * (i + 0.5), size, INK, "left", 700));
    }
  }
  function wrap(s, w) {
    const out = []; let cur = "";
    for (const word of s.split(" ")) { const t = cur ? cur + " " + word : word; if (cx.measureText(t).width > w && cur) { out.push(cur); cur = word; } else cur = t; }
    if (cur) out.push(cur); return out.slice(0, 3);
  }
  function drawPlacard() {
    const pw = Math.min(W - 24, 520 * U), px = (W - pw) / 2, py = L.placardY, ph = L.placardH;
    cx.fillStyle = INK; cx.fillRect(px - 3, py - 3, pw + 6, ph + 6);
    cx.fillStyle = "#1d1f18"; cx.fillRect(px, py, pw, ph);
    cx.fillStyle = WOOD3; cx.fillRect(px, py, pw, 4);
    if (!kase) return;
    text("the people vs. goose #" + kase.n, px + 10, py + ph * 0.22, Math.max(10, 11 * U), "#8a8e80", "left", 700);
    const charges = kase.charges, isz = Math.round(ph * 0.5);
    let x = px + 10;
    text("charge:", x, py + ph * 0.64, Math.max(13, 16 * U), CASE, "left", 800);
    x += cx.measureText("charge:").width + 10;
    charges.forEach((ch, i) => {
      if (i) { text("or", x, py + ph * 0.64, Math.max(12, 14 * U), "#8a8e80", "left", 700); x += cx.measureText("or").width + 8; }
      const s = SPR[ch]; const k = isz / Math.max(s.width, s.height);
      cx.imageSmoothingEnabled = false; cx.drawImage(s, Math.round(x), Math.round(py + ph * 0.64 - s.height * k / 2), Math.round(s.width * k), Math.round(s.height * k));
      x += s.width * k + 6;
      if (charges.length === 1) { text(NAMES[ch], x, py + ph * 0.64, Math.max(13, 16 * U), LIME, "left", 800); }
    });
    // case clock
    const ty = L.timerY, tw = pw, left = fb ? 0 : Math.max(0, 1 - kase.t / kase.dur);
    cx.fillStyle = "#1c1e18"; cx.fillRect(px, ty, tw, 8);
    cx.fillStyle = left < 0.3 ? BAD : left < 0.6 ? "#ffb340" : LIME; cx.fillRect(px, ty, tw * left, 8);
  }
  function drawHud() {
    text(String(score), 14, 24, 22, CASE, "left", 800);
    const sw = cx.measureText(String(score)).width;
    if (mult > 1) text("x" + mult, 14 + sw + 10, 25, 14, LIME2, "left", 800);
    // strikes: three gavels, struck ones red
    for (let i = 0; i < 3; i++) {
      const x = W / 2 - 36 + i * 26, y = 16;
      cx.fillStyle = i < strikes ? BAD : "#3a3d33"; cx.fillRect(x, y, 16, 8); cx.fillRect(x + 6, y + 8, 4, 10);
    }
  }
  function drawGoose(time) {
    const c = kase; if (!c) return;
    const s = L.goose, k = s / 16;
    let gx = L.gooseX - s / 2, gy = L.gooseY - s;
    // walk in from the left; on a verdict slide out (guilty: down into the cell, free: off to the right)
    if (!fb) gx += (1 - c.enter) * -W * 0.6;
    else {
      const p = Math.min(1, fb.t / 0.4);
      if (fb.call === true && fb.ok) gy += p * s * 0.6;
      else if (fb.call === false && fb.ok) gx += p * W * 0.6;
    }
    const bob = reduce ? 0 : Math.round(Math.sin(time * 8) * k * 0.6);
    // dock
    cx.fillStyle = INK; cx.fillRect(L.gooseX - s * 0.75 - 2, L.floorY - s * 0.38 - 2, s * 1.5 + 4, s * 0.38 + 4);
    cx.imageSmoothingEnabled = false;
    cx.save();
    if (fb && fb.call === true && fb.ok) { cx.beginPath(); cx.rect(0, 0, W, L.floorY - s * 0.38); cx.clip(); }
    cx.drawImage(SPR.goose, Math.round(gx), Math.round(gy + bob), s, s);
    // disguise: sunglasses and a moustache (it changes nothing; judge the beak)
    if (c.disguise) {
      cx.fillStyle = INK; cx.fillRect(Math.round(gx + 9 * k), Math.round(gy + bob + 2.6 * k), Math.round(5 * k), Math.round(1.6 * k));
      cx.fillStyle = "#3b2414"; cx.fillRect(Math.round(gx + 11 * k), Math.round(gy + bob + 5 * k), Math.round(3 * k), Math.round(0.9 * k));
    }
    const it = finalItem(c);
    if (it) { const sp = SPR[it], ik = k * 0.8; cx.drawImage(sp, Math.round(gx + 15 * k), Math.round(gy + bob + 4 * k - sp.height * ik / 2), Math.round(sp.width * ik), Math.round(sp.height * ik)); }
    cx.restore();
    // dock rail (in front)
    cx.fillStyle = WOOD; cx.fillRect(L.gooseX - s * 0.75, L.floorY - s * 0.38, s * 1.5, s * 0.38);
    cx.fillStyle = WOOD3; cx.fillRect(L.gooseX - s * 0.75, L.floorY - s * 0.38, s * 1.5, 4);
    // the lawyer goose, with a tie and a briefcase
    const lk = k * 0.62, ls = 16 * lk, lx = L.gooseX - s * 0.75 - ls - 10, ly = L.floorY - ls + 2;
    if (lx > 4 && lx + ls < gx + s * 0.2) { // only when there's room beside the dock (not on narrow phones)
      cx.save(); cx.translate(Math.round(lx + ls), 0); cx.scale(-1, 1); cx.drawImage(SPR.goose, 0, Math.round(ly), Math.round(ls), Math.round(ls)); cx.restore();
      cx.fillStyle = "#c23b3b"; cx.fillRect(Math.round(lx + ls * 0.36), Math.round(ly + ls * 0.4), Math.max(2, Math.round(lk * 1.2)), Math.round(ls * 0.18));
      cx.fillStyle = "#8a5a32"; cx.fillRect(Math.round(lx - ls * 0.15), Math.round(ly + ls * 0.62), Math.round(ls * 0.36), Math.round(ls * 0.28));
    }
    // OBJECTION! over the beak
    if (objectionUp(c) && !fb) {
      const bx = L.gooseX + s * 0.35, by = L.gooseY - s * 0.8, w = s * 1.35, h = s * 0.62;
      const wob = reduce ? 0 : Math.sin(time * 30) * 2;
      cx.fillStyle = INK; cx.fillRect(bx - w / 2 - 3 + wob, by - h / 2 - 3, w + 6, h + 6);
      cx.fillStyle = PAPER; cx.fillRect(bx - w / 2 + wob, by - h / 2, w, h);
      text("OBJECTION!", bx + wob, by - h * 0.1, Math.max(14, s * 0.2), "#c0262f", "center", 900);
      text("tap to overrule", bx + wob, by + h * 0.28, Math.max(10, s * 0.1), INK, "center", 700);
    }
    // the verdict stamp
    if (fb) {
      const p = Math.min(1, fb.t / 0.12), sc = 1.6 - 0.6 * p;
      const label = fb.late ? "TOO SLOW" : fb.call ? "GUILTY" : "NOT GUILTY";
      const col = fb.ok ? (fb.call ? BAD : GOOD) : "#ffb340";
      cx.save(); cx.translate(W / 2, L.gooseY - s * 0.55); cx.rotate(-0.12); cx.scale(sc, sc);
      text(label, 0, 0, Math.max(26, s * 0.34), col, "center", 900);
      if (!fb.ok) text(fb.guilty ? "it was guilty" : "it was innocent", 0, Math.max(26, s * 0.34) * 0.9, Math.max(12, s * 0.12), PAPER, "center", 700);
      cx.restore();
    }
  }
  function drawButtons() {
    const y = L.btnY, h = L.btnH, gap = 10, w = (W - 14 * 2 - gap) / 2;
    const items = [["GUILTY", "← swipe", BAD, 14], ["NOT GUILTY", "swipe →", GOOD, 14 + w + gap]];
    for (const [label, hint, col, x] of items) {
      cx.fillStyle = INK; cx.fillRect(x - 2, y - 2, w + 4, h + 6);
      cx.fillStyle = col; cx.fillRect(x, y, w, h);
      cx.fillStyle = "rgba(0,0,0,0.18)"; cx.fillRect(x, y + h - 6, w, 6);
      text(label, x + w / 2, y + h * 0.43, Math.max(16, Math.min(24, w / 7)), INK, "center", 900);
      text(hint, x + w / 2, y + h * 0.75, 11, "rgba(0,0,0,0.6)", "center", 700);
    }
  }
  function drawFx() {
    for (const f of fx) {
      const k = 1 - f.life / f.max;
      if (f.type === "text") { cx.globalAlpha = 1 - k; text(f.s, f.x, f.y - k * 24, f.big ? 22 : 15, f.col, "center", 900); cx.globalAlpha = 1; }
      else if (f.type === "poof") { cx.globalAlpha = 1 - k; cx.fillStyle = PAPER; const s = L.goose; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; cx.fillRect(L.gooseX + s * 0.4 + Math.cos(a) * k * s * 0.4, L.gooseY - s * 0.72 + Math.sin(a) * k * s * 0.4, 5, 5); } cx.globalAlpha = 1; }
    }
  }
  function drawRoom() {
    cx.fillStyle = "#14130f"; cx.fillRect(0, 0, W, H);
    // wood panelling
    cx.fillStyle = "#1c1810";
    for (let x = 0; x < W; x += 46) cx.fillRect(x, 0, 2, L.floorY);
    cx.fillStyle = "#211b12"; cx.fillRect(0, L.floorY, W, H - L.floorY);
    cx.fillStyle = INK; cx.fillRect(0, L.floorY - 2, W, 3);
  }
  function overlay(time) {
    cx.fillStyle = "rgba(8, 9, 7, 0.8)"; cx.fillRect(0, 0, W, H);
    const mid = H * 0.42, big = Math.round(Math.max(28, Math.min(52, W / 9)));
    if (state === "title") {
      const y0 = H * 0.16, sub = Math.max(12, Math.min(16, W / 28)), s = Math.min(96, W * 0.22);
      text("goose court", W / 2, y0, big, CASE, "center", 900);
      text("a goose is on trial. you are the judge.", W / 2, y0 + big * 0.95, sub, "#c9c4a8", "center", 700);
      // the rule, shown: guilty if the beak holds the charge
      const cy = y0 + big * 0.95 + 44;
      text("charge: bread theft", W / 2, cy, sub + 2, LIME, "center", 800);
      const gy = cy + 22;
      cx.imageSmoothingEnabled = false;
      const g1 = W / 2 - s - 30, g2 = W / 2 + 10;
      cx.drawImage(SPR.goose, g1, gy, s, s); cx.drawImage(SPR.bread, g1 + s * 0.94, gy + s * 0.25 - s * 0.15, s * 0.45, s * 0.3);
      cx.drawImage(SPR.goose, g2, gy, s, s); cx.drawImage(SPR.phone, g2 + s * 0.94, gy + s * 0.25 - s * 0.17, s * 0.35, s * 0.35);
      text("GUILTY", g1 + s / 2, gy + s + 16, 15, BAD, "center", 900);
      text("NOT GUILTY", g2 + s / 2, gy + s + 16, 15, GOOD, "center", 900);
      text("judge the beak. swipe ← guilty, → not guilty.", W / 2, gy + s + 50, Math.max(11, Math.min(14, W / 32)), "#c9c4a8", "center", 700);
      text("tap to open court", W / 2, Math.min(L.btnY - 24, gy + s + 96), 18, LIME, "center", 900);
    } else {
      text("disbarred", W / 2, mid - big * 1.4, big, BAD, "center", 900);
      text(String(score), W / 2, mid - big * 0.1, Math.round(big * 1.4), CASE, "center", 900);
      text("best " + best + "  ·  " + correct + "/" + judged + " right  ·  " + (judged ? Math.round(correct / judged * 100) : 0) + "% accuracy", W / 2, mid + big * 0.85, 14, "#c9c4a8", "center", 700);
      const nudge = score > prevBest ? (prevBest > 0 ? "new best. you beat it by " + (score - prevBest) + "." : "first trial logged. now beat it.")
        : score === prevBest ? "tied your best. one more verdict next time." : (prevBest - score) + " more to beat your best (" + prevBest + ").";
      text(nudge, W / 2, mid + big * 0.85 + 26, 15, score > prevBest ? LIME2 : "#ffb340", "center", 800);
      if (performance.now() - endAt > 700) text("tap to take another case", W / 2, mid + big * 0.85 + 70, 18, LIME, "center", 900);
    }
  }
  function draw(time) {
    cx.save();
    if (shake > 0) cx.translate((Math.random() - 0.5) * 12 * shake, (Math.random() - 0.5) * 12 * shake);
    drawRoom();
    drawPlacard();
    drawJudge(time);
    drawGoose(time);
    drawButtons();
    drawFx();
    if (state === "play") drawHud();
    cx.restore();
    if (state !== "play") overlay(time);
  }

  // the title draws until it has settled, then waits for a tap/key or 3 s after the page loaded (keeps the player page's
  // boot screen fast); gameplay always runs at full speed
  let last = performance.now(), frames = 0, awake = false, running = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; frames++;
    update(dt); draw(now / 1000);
    if (!awake && state === "title" && frames > 3) { running = false; return; }
    requestAnimationFrame(frame);
  }
  function wake() { awake = true; if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } }
  ["pointerdown", "keydown"].forEach((ev) => window.addEventListener(ev, wake, true));
  try { if (window.frameElement) window.parent.document.addEventListener("keydown", wake, true); } catch (e) {}
  const wakeLater = () => setTimeout(wake, 3000);
  if (document.readyState === "complete") wakeLater(); else window.addEventListener("load", wakeLater);
  requestAnimationFrame(frame);

  // read-only hooks for the test scripts
  window.__gc = { state: () => ({ state, score, strikes, judged, correct, elapsed, kase: kase && { charges: kase.charges, item: finalItem(kase), objection: !!(kase && objectionUp(kase)), fb: !!fb } }) };
})();
