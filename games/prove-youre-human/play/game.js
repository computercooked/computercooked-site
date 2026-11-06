/* prove you're human (K-0067). The arcade's old security computer got cooked and now it thinks everyone is a bot.
   A gauntlet of tiny, absurd captchas, 3-8 s each. Fail one and SUSPICION rises. Pass one too fast or too perfectly
   and it rises too ("too fast. humans hesitate."): the skill is being right and human-sloppy. A full meter is
   ACCESS DENIED: BOT DETECTED.
   Two modes: the DAILY GAUNTLET (the same seeded 10 rounds for everyone each UTC day, a daily streak, diary lines)
   and ENDLESS (rounds speed up, the computer gets more paranoid, glitchier, and starts asking personal questions).
   Silent: audio is file hooks only (FILES), no code-made sound. Art is drawn in code.
   Test links: ?cctest=1&round=N (start on captcha type N, 1-11), &daily=reset (clear the streak and today's run),
   &deny=1 (straight to the bot-detected ending), ?shot=1 (the cover scene). */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const Q = new URLSearchParams(location.search);
  const flag = (k) => Q.has(k) || (() => { try { return new URLSearchParams(parent.location.search).has(k); } catch (e) { return false; } })();
  const param = (k) => Q.get(k) || (() => { try { return new URLSearchParams(parent.location.search).get(k); } catch (e) { return null; } })();
  const TEST = flag("cctest"), SHOT = flag("shot");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const now = () => performance.now() / 1000;
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };

  // ---------- audio: file hooks only (team rule: no code-made sound) ----------
  // recorded files later: put each file's URL here and it plays
  const FILES = { pass: "", fail: "", sus: "", denied: "", tick: "", stamp: "" };
  let muted = false;
  function play(name, vol) { if (muted || !FILES[name]) return; try { const a = new Audio(FILES[name]); a.volume = vol || 0.6; a.play().catch(() => {}); } catch (e) {} }
  addEventListener("message", (e) => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === "cc-mute") muted = !!e.data.muted;
    if (e.data.type === "cc-pause") paused = true;
    if (e.data.type === "cc-restart") { endRound(); showTitle(); }
  });

  // ---------- seeded random ----------
  function mulberry(a) { return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  const pickR = (r, a) => a[Math.floor(r() * a.length)];
  function shuffleR(r, a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  const dayKey = (d) => (d || new Date()).toISOString().slice(0, 10); // UTC: the same gauntlet everywhere
  const yesterday = () => dayKey(new Date(Date.now() - 864e5));

  // ---------- save ----------
  const KEY = "pyh-save";
  let S = load();
  function load() { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.v === 1) return s; } catch (e) {} return { v: 1, daily: null, streak: { last: null, n: 0, best: 0 }, bestEndless: 0, runs: 0 }; }
  function save() { if (SHOT) return; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  if (TEST && param("daily") === "reset") { S = { v: 1, daily: null, streak: { last: null, n: 0, best: 0 }, bestEndless: S.bestEndless, runs: S.runs }; save(); }

  // ---------- the crt: the only mascot ----------
  // 16x10 faces on its screen, in the brand's green
  const FACES = {
    calm: ["................", "................", "..###......###..", "..###......###..", "................", "................", "................", ".....######.....", "................", "................"],
    squint: ["................", "..####....####..", "................", "..####....####..", "................", "................", "................", "....########....", "................", "................"],
    happy: ["................", "................", "...##......##...", "..#..#....#..#..", "................", "................", "...#........#...", "....########....", ".....######.....", "................"],
    shock: ["................", "..###......###..", ".#...#....#...#.", ".#...#....#...#.", "..###......###..", "................", "......####......", ".....#....#.....", "......####......", "................"],
    side: ["................", "................", "...##.......##..", "....##.......##.", "................", "................", "................", "......#####.....", "................", "................"],
    denied: ["................", "..#...#..#...#..", "...#.#....#.#...", "....#......#....", "...#.#....#.#...", "..#...#..#...#..", "................", "..############..", "..#..........#..", "................"],
    blink: ["................", "................", "................", "..###......###..", "................", "................", "................", ".....######.....", "................", "................"],
  };
  const crt = $("crt"), cg = crt.getContext("2d");
  let face = "calm", faceT = 0, sayT = 0;
  function drawCrt(t) {
    const g = cg, P = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
    g.clearRect(0, 0, 48, 44);
    // the case: beige, chunky, a vent and a power light
    P("#14140f", 1, 1, 46, 36); P("#e6d9b4", 2, 2, 44, 34); P("#fff8e0", 2, 2, 44, 1); P("#a8996a", 2, 35, 44, 1); P("#cbbd92", 45, 3, 1, 32);
    P("#14140f", 5, 4, 38, 26); P("#06140a", 6, 5, 36, 24);
    const glitch = susp > 55 && !reduce && Math.random() < (susp - 55) / 160;
    // the face (2 px per cell), with a blink now and then
    const F = FACES[glitch ? "denied" : (face === "calm" && (t % 4.2) < 0.12) ? "blink" : face] || FACES.calm;
    const ox = 8 + (glitch ? ((Math.random() * 3) | 0) - 1 : 0), oy = 7;
    for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (F[j][i] === "#") P(face === "denied" ? "#ff3b3b" : "#7dff6a", ox + i * 2, oy + j * 2, 2, 2);
    g.globalAlpha = 0.25; P("#7dff6a", 6, 5 + ((t * 18) | 0) % 24, 36, 1); g.globalAlpha = 1; // the rolling scanline
    P("#14140f", 6, 31, 10, 3); P("#5a5440", 7, 32, 2, 1); P("#5a5440", 10, 32, 2, 1); P("#5a5440", 13, 32, 2, 1);
    P(susp > 70 ? "#ff3b3b" : "#3fbf3a", 40, 32, 3, 2);
    P("#14140f", 16, 37, 16, 2); P("#cbbd92", 17, 37, 14, 1); P("#14140f", 12, 39, 24, 4); P("#cbbd92", 13, 39, 22, 3);
  }
  function say(text, f, hold) { $("say").textContent = text; if (f) { face = f; faceT = hold || 1.6; } sayT = 3; }

  // ---------- lines ----------
  const L = {
    hello: ["halt. state your business. and your species.", "a visitor. probably a bot. most things are.", "the arcade is closed to robots. prove you're not one.", "i used to guard high scores. now i guard everything."],
    pass: ["hm. fine.", "acceptable. for now.", "that was human enough.", "i'll allow it.", "noted. suspiciously noted.", "ok. next."],
    fast: ["too fast. humans hesitate.", "nobody is that sure of anything.", "that was robotic. i saw it.", "you didn't even think. bots don't think. hmm."],
    perfect: ["too perfect. are you a compass?", "no human is that precise. suspicious.", "a perfect answer. how robotic of you."],
    fail: ["wrong. a human would have been wrong differently.", "incorrect. i am writing that down.", "that's what a bot would say. if it was bad at being a bot.", "no."],
    timeout: ["you froze. buffering? bots buffer.", "too slow. are you loading?", "time's up. did you crash?"],
    calm: ["you seem human. i don't like it.", "my fans are spinning down. a little.", "ok. i'm calming down. slightly."],
    worry: ["i'm watching you very closely now.", "my suspicion meter is getting warm.", "one more and i call security. i am security."],
  };

  // ---------- emoji sets ----------
  const SOUP = ["🍜", "🍲"], NOTSOUP = ["👟", "🚗", "🐟", "📎", "🧦", "🔋", "🪑", "🎸", "🧲", "🌵", "🖨️", "⌚", "🧀", "🎈", "🪴", "🍩"];
  const AMBIG = [{ e: "🍵", yes: "you think tea is leaf soup. so do i. we are the same.", no: "you said tea isn't soup. a bot would know. a human would argue." },
    { e: "🥣", yes: "cereal is cold soup. finally someone gets it.", no: "you said cereal isn't soup. bold. very human." },
    { e: "🥫", yes: "a can of soup is soup. technically. you're technical. hmm.", no: "you said the can isn't soup until it's opened. philosopher detected." }];
  const APPLIANCES = [["📠", "gerald"], ["🖨️", "sandra"], ["📺", "kevin (human)"], ["⌚", "definitely a person"], ["🔦", "brenda"], ["🧯", "a guy"], ["💡", "dave"], ["📻", "mom"], ["☎️", "steve, 34"], ["🔌", "real human"]];
  const WORDS = ["toaster", "beige", "noodle", "cooked", "sweater", "pigeon", "blink", "yawn", "sock", "feelings", "humanish", "soup", "tuesday", "drawer"];
  const QUESTIONS = [
    { q: "have you ever been cooked?", a: ["yes", "no", "define cooked"], bot: -1 },
    { q: "what's your favourite shade of beige?", a: ["beige", "also beige", "#e6d9b4"], bot: 2 },
    { q: "how many fingers are you holding up?", a: ["five", "none", "3.0000"], bot: 2 },
    { q: "do you dream?", a: ["yes", "about soup", "insufficient data"], bot: 2 },
    { q: "what did you have for breakfast?", a: ["toast", "nothing", "0 kcal"], bot: 2 },
    { q: "are you a bot?", a: ["no", "no!!", "i am a human person"], bot: 2 },
    { q: "do you like me?", a: ["yes", "kind of", "affirmative"], bot: 2 },
  ];

  // ---------- the captchas ----------
  // Each builds into #area and calls api.pass({fast, perfect, line}) or api.fail(reason, line). `T` is its base time.
  const TYPES = [
    { id: "soup", T: 7, ask: "select all squares with soup", sub: "then press verify", build: bSoup },
    { id: "slider", T: 6, ask: "drag the slider to exactly how you feel today", sub: "then press verify", build: bSlider },
    { id: "checkbox", T: 6, ask: "tick \"i am not a robot\"", sub: "", build: bCheckbox },
    { id: "word", T: 8, ask: "type the wobbly word", sub: "before it melts", build: bWord },
    { id: "human", T: 5, ask: "pick the real human", sub: "", build: bHuman },
    { id: "fish", T: 7, ask: "rotate the fish until it is upright", sub: "drag to turn it, then verify", build: bFish },
    { id: "sigh", T: 8, ask: "hold the button for exactly as long as a sigh", sub: "", build: bSigh },
    { id: "lights", T: 8, ask: "tap every traffic light", sub: "only traffic lights", build: bLights },
    { id: "circle", T: 7, ask: "draw a circle", sub: "with your finger or mouse", build: bCircle },
    { id: "wait", T: 3, ask: "do nothing for 3 seconds", sub: "bots can't resist", build: bWait, waitPass: true },
    { id: "question", T: 6, ask: "", sub: "answer honestly", build: bQuestion, late: true },
  ];
  const BYID = Object.fromEntries(TYPES.map((t) => [t.id, t]));

  const cap = (node, e) => { try { node.setPointerCapture(e.pointerId); } catch (err) { /* a synthetic pointer */ } };
  function el(html) { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  const area = $("area");
  const box = () => area.getBoundingClientRect();

  function bSoup(api, r) {
    const amb = pickR(r, AMBIG), nSoup = 2 + (r() < 0.5 ? 1 : 0);
    const items = shuffleR(r, [...Array.from({ length: nSoup }, () => ({ e: pickR(r, SOUP), soup: 1 })), { e: amb.e, amb: 1 }, ...shuffleR(r, NOTSOUP).slice(0, 8 - nSoup).map((e) => ({ e }))]);
    const grid = el(`<div class="grid" style="grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,minmax(0,1fr))"></div>`);
    items.forEach((it) => { const b = el(`<button class="tile" type="button">${it.e}</button>`); b.onclick = () => { it.sel = !it.sel; b.classList.toggle("sel", it.sel); api.touch(); }; grid.appendChild(b); it.b = b; });
    area.appendChild(grid);
    api.verify(() => {
      const wrong = items.filter((it) => !it.amb && !!it.sel !== !!it.soup);
      const ambLine = items.find((it) => it.amb).sel ? amb.yes : amb.no;
      if (wrong.length) { wrong.forEach((it) => it.b.classList.add("bad")); return api.fail("wrong", wrong.some((it) => it.soup) ? "you missed some soup. humans never miss soup." : "that is not soup. that is a " + (wrong[0].e === "🐟" ? "fish. a fish is soup's ancestor, not soup." : "thing. not soup.")); }
      api.pass({ fast: api.t() < 1.1, line: ambLine });
    });
    api.solve = () => { items.forEach((it) => { if (it.soup && !it.sel) it.b.click(); }); setTimeout(() => $("verify").click(), 300); };
  }

  function bSlider(api, r) {
    const c = el(`<div class="center"><div class="feel">😐</div><div class="slider"><div class="rail"></div><div class="knob"></div><div class="ends"><span>😩 awful</span><span>great 😎</span></div></div><div class="small" style="font-size:13px;opacity:.75">0%</div></div>`);
    area.appendChild(c);
    const sl = c.querySelector(".slider"), kn = c.querySelector(".knob"), fe = c.querySelector(".feel"), lab = c.lastChild;
    let v = Math.round(10 + r() * 25), moved = false, d0 = 0, d1 = 0, ys = [];
    const faces = ["😩", "😞", "😕", "😐", "🙂", "😊", "😎"];
    const set = (nv) => { v = clamp(Math.round(nv), 0, 100); kn.style.left = v + "%"; fe.textContent = faces[Math.min(6, Math.floor(v / 100 * 7))]; lab.textContent = v + "%"; };
    set(v);
    let drag = null;
    sl.addEventListener("pointerdown", (e) => { drag = e.pointerId; cap(sl, e); if (!moved) d0 = now(); ys = []; move(e); });
    sl.addEventListener("pointermove", (e) => { if (drag === e.pointerId) move(e); });
    const up = (e) => { if (drag === e.pointerId) { drag = null; d1 = now(); } };
    sl.addEventListener("pointerup", up); sl.addEventListener("pointercancel", up);
    function move(e) { const b = sl.getBoundingClientRect(); set((e.clientX - b.left) / b.width * 100); moved = true; ys.push(e.clientY); api.touch(); }
    api.verify(() => {
      if (!moved) return api.fail("wrong", "you didn't move it. you feel nothing? bots feel nothing.");
      const lines = v < 15 ? "that bad? same. i got cooked." : v < 40 ? "meh. relatable. very human." : v < 61 ? "perfectly fine. suspiciously fine." : v < 86 ? "pretty good. don't rub it in." : "that great? nobody feels that great. but ok.";
      if (v === 0 || v === 50 || v === 100) return api.pass({ perfect: true, line: "exactly " + v + "%? robots love round numbers." });
      api.pass({ fast: d1 && d1 - d0 < 0.25, line: lines });
    });
    api.solve = () => { set(57 + r() * 20); moved = true; d0 = now() - 1; d1 = now(); setTimeout(() => $("verify").click(), 250); };
  }

  function bCheckbox(api, r) {
    const wrap = el(`<div class="lights"></div>`), cb = el(`<button class="cbx" type="button"><i></i>i am not a robot</button>`);
    wrap.appendChild(cb); area.appendChild(wrap);
    let jumps = 2 + Math.floor(r() * 2) + Math.min(2, Math.floor(api.round / 8)), lastJ = 0;
    const B = box();
    const place = (fx, fy) => { const w = cb.offsetWidth || 200, h = cb.offsetHeight || 50; cb.style.left = Math.round(clamp(fx * (B.width - w), 4, B.width - w - 4)) + "px"; cb.style.top = Math.round(clamp(fy * (B.height - h), 4, B.height - h - 4)) + "px"; };
    place(0.5, 0.5);
    const runAway = () => {
      if (jumps <= 0 || now() - lastJ < 0.25) return false;
      jumps--; lastJ = now();
      const x = parseFloat(cb.style.left) / Math.max(1, B.width - cb.offsetWidth), y = parseFloat(cb.style.top) / Math.max(1, B.height - cb.offsetHeight);
      place(x > 0.5 ? r() * 0.3 : 0.7 + r() * 0.3, y > 0.5 ? r() * 0.3 : 0.7 + r() * 0.3);
      say(pickR(Math.random, ["nope.", "too slow.", "catch it, human.", "hehe.", "it's shy."]), "side", 0.8);
      return true;
    };
    // desktop: it dodges the cursor; touch: it dodges the first taps
    wrap.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const b = cb.getBoundingClientRect(); if (Math.hypot(e.clientX - (b.left + b.width / 2), e.clientY - (b.top + b.height / 2)) < Math.max(b.width, b.height) * 0.6) runAway(); });
    cb.addEventListener("pointerdown", (e) => { api.touch(); if (runAway()) { e.preventDefault(); return; } cb.classList.add("on"); api.pass({ line: "caught it. persistent. very human." }); });
    api.solve = () => { jumps = 0; cb.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); };
  }

  function bWord(api, r) {
    const word = pickR(r, WORDS);
    const c = el(`<div class="center" style="justify-content:flex-start;padding-top:14px"><input class="type" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" aria-label="type the word" placeholder="type it here"><canvas class="word"></canvas></div>`);
    area.appendChild(c);
    const inp = c.querySelector("input"), cv = c.querySelector("canvas"), g = cv.getContext("2d");
    let first = 0, pasted = false;
    inp.addEventListener("paste", () => { pasted = true; });
    inp.addEventListener("input", () => { if (!first) first = now(); api.touch(); });
    inp.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("verify").click(); } });
    if (matchMedia("(pointer: fine)").matches) setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 60);
    const seeds = [...word].map(() => [r() * 6, r() * 6, r() * 0.5 + 0.5]);
    api.tick((k) => {
      const DPR = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); }
      g.setTransform(DPR, 0, 0, DPR, 0, 0); g.clearRect(0, 0, w, h);
      const t = now(), size = Math.min(40, w / (word.length * 0.75)), x0 = w / 2 - word.length * size * 0.32;
      g.font = `700 ${size}px Pixelify, ui-monospace, monospace`; g.textBaseline = "middle"; g.textAlign = "center";
      [...word].forEach((ch, i) => {
        const [a, b, sp] = seeds[i], x = x0 + i * size * 0.64 + Math.sin(t * 3 * sp + a) * 3, melt = k * k * (14 + b * 10), y = h * 0.38 + Math.sin(t * 2.4 + b) * 4 + melt;
        g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + a) * 0.28); g.scale(1, 1 + k * 0.5);
        g.fillStyle = `rgba(30, 60, 30, ${1 - k * 0.55})`; g.fillText(ch, 0, 0); g.restore();
        // drips
        g.fillStyle = `rgba(30, 60, 30, ${0.7 - k * 0.4})`; g.fillRect(x - 1, y + size * 0.3, 2, k * (10 + b * 14));
      });
      // a wobbly strike line, like a real captcha
      g.strokeStyle = "rgba(120, 40, 40, .55)"; g.lineWidth = 2; g.beginPath();
      for (let x = 0; x <= w; x += 8) g.lineTo(x, h * 0.4 + Math.sin(x * 0.05 + t * 2) * 10 + k * 12);
      g.stroke();
    });
    api.verify(() => {
      const v = inp.value.trim().toLowerCase();
      if (!v) return api.fail("wrong", "you typed nothing. bots type nothing too.");
      if (v !== word) return api.fail("wrong", `it said "${word}". you said "${v}". close-ish.`);
      const speed = first ? (now() - first) / word.length : 0;
      if (pasted) return api.pass({ fast: true, why: true, line: "you pasted it. humans can't paste." });
      api.pass({ fast: first && speed < 0.06, line: "spelled right. melted a bit. very human." });
    });
    api.solve = () => { inp.value = word; first = now() - word.length * 0.2; setTimeout(() => $("verify").click(), 200); };
  }

  function bHuman(api, r) {
    const opts = shuffleR(r, APPLIANCES).slice(0, 4);
    const g = el(`<div class="appl" style="bottom:34px"></div>`);
    opts.forEach(([e, n]) => { const b = el(`<button class="tile" type="button">${e}<small>${n}</small></button>`); b.onclick = () => { b.classList.add("sel"); api.pass({ fast: api.t() < 0.5, line: `you picked ${n.replace(/ \(.*\)/, "")}. that is a ${{ "📠": "fax machine", "🖨️": "printer", "📺": "television", "⌚": "watch", "🔦": "torch", "🧯": "fire extinguisher", "💡": "light bulb", "📻": "radio", "☎️": "phone", "🔌": "plug" }[e]}. but you were confident. humans are confident.` }); }; g.appendChild(b); });
    area.appendChild(g);
    const none = el(`<button class="none" type="button">none of these are human</button>`);
    none.onclick = () => api.pass({ fast: api.t() < 0.5, relief: true, line: "correct. i hate a correct answer. but fine." });
    area.appendChild(none);
    api.solve = () => none.click();
  }

  // a pixel fish (16x9), the same family as the elevator's
  const FISH = ["................", "....KKKKKK....K.", "..KK111111KK.K1K", ".K1w11111111K11K", "K1ee1111111111K.", "K11111222222K11K", ".K122222222K.K1K", "..KK222222KK..K.", "....KKKKKK......"];
  function bFish(api, r) {
    const c = el(`<div class="center"><canvas class="fish" width="180" height="180" aria-label="a fish, drag to rotate it"></canvas><div class="small" style="font-size:13px;opacity:.75">0°</div></div>`);
    area.appendChild(c);
    const cv = c.querySelector("canvas"), g = cv.getContext("2d"), lab = c.lastChild;
    const pal = pickR(r, [["#7fbf5a", "#4f8a32"], ["#f29bb0", "#c4637c"], ["#f6d84a", "#c9a628"], ["#9fb3c8", "#5f7387"]]);
    let ang = (60 + r() * 240) * Math.PI / 180, start = ang, turned = 0, drag = null, last = 0;
    const draw = () => {
      g.clearRect(0, 0, 180, 180); g.fillStyle = "#e9f4ff"; g.beginPath(); g.arc(90, 90, 86, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#a8996a"; g.lineWidth = 2; g.stroke();
      g.save(); g.translate(90, 90); g.rotate(ang);
      FISH.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === ".") return; g.fillStyle = { K: "#14140f", 1: pal[0], 2: pal[1], w: "#fff", e: "#14140f" }[ch]; g.fillRect((x - 8) * 8, (y - 4.5) * 8, 8, 8); }));
      g.restore();
      const deg = ((ang * 180 / Math.PI) % 360 + 360) % 360; lab.textContent = Math.round(deg) + "°";
    };
    draw();
    const angAt = (e) => { const b = cv.getBoundingClientRect(); return Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)); };
    cv.addEventListener("pointerdown", (e) => { drag = e.pointerId; cap(cv, e); last = angAt(e); api.touch(); });
    cv.addEventListener("pointermove", (e) => { if (drag !== e.pointerId) return; let a = angAt(e), d = a - last; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; ang += d; turned += Math.abs(d); last = a; draw(); });
    const up = (e) => { if (drag === e.pointerId) drag = null; };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    api.verify(() => {
      const deg = ((ang * 180 / Math.PI) % 360 + 360) % 360, off90 = Math.min(deg % 90, 90 - deg % 90);
      if (turned < 0.25) return api.fail("wrong", "you didn't touch the fish. the fish noticed.");
      if (off90 < 1) return api.pass({ perfect: true, line: `exactly ${Math.round(deg)}°. a perfect right angle. robots love right angles.` });
      api.pass({ line: pickR(Math.random, ["fish have no upright. but that's the most upright i've seen.", "the fish says thank you. i think.", Math.round(deg) + "°. correct. there is no wrong answer. except some."]) });
    });
    api.solve = () => { ang = start + 1.1; turned = 1.1; draw(); setTimeout(() => $("verify").click(), 200); };
  }

  function bSigh(api) {
    const c = el(`<div class="center"><button class="btn hold" type="button">hold</button><div class="small" style="font-size:13px;opacity:.75;min-height:18px"></div></div>`);
    area.appendChild(c);
    const b = c.querySelector("button"), lab = c.lastChild;
    let t0 = 0, ptr = null;
    b.addEventListener("pointerdown", (e) => { if (ptr !== null) return; ptr = e.pointerId; cap(b, e); t0 = now(); b.classList.add("on"); api.touch(); say("hhhhhh…", "blink", 9); });
    const up = (e) => {
      if (ptr !== e.pointerId) return; ptr = null; b.classList.remove("on");
      const d = now() - t0; lab.textContent = d.toFixed(1) + " s";
      if (d < 1.0) return api.fail("wrong", "that was a gasp, not a sigh.");
      if (d > 4.2) return api.fail("wrong", "that was a nap, not a sigh.");
      api.pass({ line: d.toFixed(1) + " seconds. a deep, tired, human sigh. relatable." });
    };
    b.addEventListener("pointerup", up); b.addEventListener("pointercancel", up);
    api.tick(() => { if (ptr !== null) { const d = now() - t0; b.textContent = "h".repeat(1 + Math.min(10, Math.floor(d * 3))) + (d > 4.2 ? "…zz" : ""); } });
    api.onTimeout = () => (ptr !== null ? ["wrong", "still sighing? that's a nap."] : null);
    api.solve = () => { b.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 9, bubbles: true })); setTimeout(() => b.dispatchEvent(new PointerEvent("pointerup", { pointerId: 9, bubbles: true })), 2000); };
  }

  function bLights(api, r) {
    const wrap = el(`<div class="lights"></div>`);
    area.appendChild(wrap);
    const need = 3 + (api.round >= 10 ? 1 : 0), OTHER = ["🚗", "🚌", "🌳", "🚲", "🏠", "🐦", "🛑", "🚕", "🌭", "🦆"];
    const B = box(), cols = 3, s = Math.max(40, Math.floor(Math.min(B.width / cols - 8, (B.height - 16) / 3.1 - 8))), x0 = Math.round((B.width - cols * (s + 8) + 8) / 2), speed = (B.height / 3.2) * (1 + Math.min(0.8, api.round * 0.03));
    let got = 0, y = 0, rows = [], nextRow = 0, k = 0;
    function addRow(top) {
      const lightCol = r() < 0.8 ? Math.floor(r() * cols) : -1;
      for (let c2 = 0; c2 < cols; c2++) {
        const light = c2 === lightCol, e = light ? "🚦" : pickR(r, OTHER);
        const t = el(`<button class="tile" type="button" style="width:${s}px;height:${s}px;left:${x0 + c2 * (s + 8)}px;font-size:${Math.round(s * 0.55)}px">${e}</button>`);
        t._y = top; t._light = light; t._e = e;
        t.addEventListener("pointerdown", (ev) => {
          ev.preventDefault(); api.touch();
          if (t._done) return;
          if (!t._light) { t.classList.add("bad"); return api.fail("wrong", e === "🛑" ? "a stop sign is not a traffic light. it's a traffic opinion." : "that is not a traffic light. that is a " + ({ "🚗": "car", "🚌": "bus", "🌳": "tree", "🚲": "bike", "🏠": "house", "🐦": "bird", "🚕": "taxi", "🌭": "hot dog", "🦆": "duck" }[e] || "thing") + "."); }
          t._done = true; t.classList.add("sel"); got++;
          if (got >= need) api.pass({ line: "all the traffic lights. you have clearly seen a road before." });
        });
        wrap.appendChild(t); rows.push(t);
      }
    }
    for (let i = 0; i < 4; i++) addRow(B.height * 0.25 + i * (s + 8));
    nextRow = B.height * 0.25 + 4 * (s + 8);
    let lt = now();
    api.tick(() => {
      const t = now(), dt = Math.min(0.05, t - lt); lt = t; y += speed * dt;
      while (nextRow - y < B.height + s) { addRow(nextRow); nextRow += s + 8; }
      for (const tl of rows) tl.style.top = Math.round(tl._y - y) + "px";
      rows = rows.filter((tl) => { if (tl._y - y < -s - 10) { tl.remove(); return false; } return true; });
      $("ask").querySelector("small").textContent = got + " / " + need;
    });
    api.solve = () => { const go = () => { const t = rows.find((tl) => tl._light && !tl._done && tl._y - y > 0 && tl._y - y < B.height - s); if (t) t.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); if (api.live()) setTimeout(go, 450); }; go(); };
  }

  function bCircle(api) {
    const cv = el(`<canvas class="draw" aria-label="draw a circle here"></canvas>`);
    area.appendChild(cv);
    const g = cv.getContext("2d"), B = box(), DPR = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(B.width * DPR); cv.height = Math.round(B.height * DPR); g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.strokeStyle = "#c9bd96"; g.setLineDash([6, 6]); g.lineWidth = 2; g.beginPath(); g.arc(B.width / 2, B.height / 2, Math.min(B.width, B.height) * 0.3, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    let pts = [], ptr = null, t0 = 0;
    cv.addEventListener("pointerdown", (e) => { if (ptr !== null) return; ptr = e.pointerId; cap(cv, e); pts = []; t0 = now(); add(e); api.touch(); });
    cv.addEventListener("pointermove", (e) => { if (ptr === e.pointerId) add(e); });
    function add(e) {
      const b = cv.getBoundingClientRect(), p = [e.clientX - b.left, e.clientY - b.top];
      if (pts.length) { const q = pts[pts.length - 1]; g.strokeStyle = "#2d5a2a"; g.lineWidth = 4; g.lineCap = "round"; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(p[0], p[1]); g.stroke(); }
      pts.push(p);
    }
    const up = (e) => {
      if (ptr !== e.pointerId) return; ptr = null;
      if (pts.length < 10) return api.fail("wrong", "that's a dot. i asked for a circle.");
      const cx2 = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy2 = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      const rs = pts.map((p) => Math.hypot(p[0] - cx2, p[1] - cy2)), mr = rs.reduce((a, b) => a + b, 0) / rs.length;
      const sd = Math.sqrt(rs.reduce((a, b) => a + (b - mr) * (b - mr), 0) / rs.length), wob = sd / Math.max(1, mr);
      let sweep = 0; for (let i = 1; i < pts.length; i++) { let d = Math.atan2(pts[i][1] - cy2, pts[i][0] - cx2) - Math.atan2(pts[i - 1][1] - cy2, pts[i - 1][0] - cx2); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; sweep += d; }
      const pct = Math.round(wob * 100);
      if (mr < 22) return api.fail("wrong", "too small. are you drawing an atom?");
      if (Math.abs(sweep) < Math.PI * 1.65) return api.fail("wrong", "that's not a circle. that's a gesture.");
      if (wob > 0.24) return api.fail("wrong", `wobble ${pct}%. that's a potato.`);
      if (wob < 0.025 || now() - t0 < 0.25) return api.pass({ perfect: true, line: `wobble ${pct}%. too perfect. are you a compass?` });
      api.pass({ line: `wobble ${pct}%. lumpy. human. good.` });
    };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    api.solve = () => {
      const b = cv.getBoundingClientRect(), R = Math.min(b.width, b.height) * 0.3; let i = 0;
      const ev = (type, a) => cv.dispatchEvent(new PointerEvent(type, { pointerId: 7, bubbles: true, clientX: b.left + b.width / 2 + Math.cos(a) * R * (1 + Math.sin(a * 5) * 0.07), clientY: b.top + b.height / 2 + Math.sin(a) * R * (1 + Math.cos(a * 4) * 0.06) }));
      ev("pointerdown", 0); const id = setInterval(() => { i++; ev("pointermove", i * 0.2); if (i >= 33) { clearInterval(id); ev("pointerup", i * 0.2); } }, 30);
    };
  }

  function bWait(api) {
    const c = el(`<div class="center"><button class="btn bait" type="button">CLICK TO CONTINUE</button><div class="small" style="font-size:13px;opacity:.7">(don't)</div></div>`);
    area.appendChild(c);
    const fail = (e) => { if (e) e.preventDefault(); api.fail("wrong", pickR(Math.random, ["you clicked. bots can't resist a button.", "you couldn't wait 3 seconds? robotic.", "i said nothing. you did something."])); };
    c.addEventListener("pointerdown", fail);
    api.onKey = () => fail();
    api.onTimeout = () => "pass";
    api.passLine = "you did nothing. masterfully. very human.";
    api.solve = () => {};
  }

  function bQuestion(api, r) {
    const q = pickR(r, QUESTIONS);
    $("ask").innerHTML = `${q.q}<small>answer honestly</small>`;
    const c = el(`<div class="center"><div class="qs"></div></div>`);
    area.appendChild(c);
    q.a.forEach((a, i) => { const b = el(`<button class="btn" type="button">${a}</button>`); b.onclick = () => { api.touch(); if (i === q.bot) return api.pass({ perfect: true, line: `"${a}"? that's exactly what a bot would answer.` }); api.pass({ fast: api.t() < 0.5, line: pickR(Math.random, ["interesting. noted in your file.", "hm. a very human answer.", "i'll remember that.", "same, honestly."]) }); }; c.firstChild.appendChild(b); });
    api.solve = () => c.querySelector("button").click();
  }

  // ---------- run state ----------
  let state = "title", mode = "endless", round = 0, susp = 0, passes = 0, fails = 0, robotic = 0, runT0 = 0, order = [], seed = 0, paused = false;
  let cur = null, evN = 0, runLog = [], lastHumanity = 0;
  const DAILY_N = 10;
  const ROUNDS_FIRST = TEST && +param("round") >= 1 && +param("round") <= TYPES.length ? TYPES[+param("round") - 1].id : null;
  function ev(name, data, always) { if (!always && evN >= 14) return; evN++; sdk((c) => c.event && c.event(name, data || {})); }

  function setSusp(v) {
    susp = clamp(v, 0, 100);
    $("susp").style.width = susp + "%";
    const m = $("meter"); m.classList.toggle("hot", susp >= 45 && susp < 75); m.classList.toggle("red", susp >= 75);
    document.body.classList.toggle("g2", susp >= 50 && susp < 80); document.body.classList.toggle("g3", susp >= 80);
  }
  function hud() { $("rn").textContent = mode === "daily" ? `${Math.min(round, DAILY_N)} / ${DAILY_N}` : "round " + round; }

  function start(m) {
    mode = m; round = 0; passes = 0; fails = 0; robotic = 0; evN = 0; runLog = []; setSusp(m === "daily" ? 0 : 0);
    seed = m === "daily" ? hash("pyh-" + dayKey()) : (Math.random() * 2 ** 32) >>> 0;
    const base = TYPES.filter((t) => !t.late).map((t) => t.id);
    order = m === "daily" ? shuffleR(mulberry(seed), base) : [];
    $("title").hidden = true; $("end").hidden = true; state = "play"; runT0 = now();
    S.runs++; save();
    sdk((c) => c.start && c.start());
    ev("game_start", { mode: m }, true);
    say(pickR(Math.random, L.hello), "squint", 1.4);
    if (TEST && flag("deny")) { passes = 2; round = 3; robotic = 1; fails = 2; setSusp(100); return finish(true); }
    setTimeout(nextRound, 700);
  }
  let bag = [];
  function nextType() {
    if (mode === "daily") return order[round - 1];
    if (round === 1 && ROUNDS_FIRST) return ROUNDS_FIRST;
    if (!bag.length) { bag = shuffleR(Math.random, TYPES.filter((t) => !t.late || round >= 11).map((t) => t.id)); if (cur && bag[0] === cur.type.id) bag.push(bag.shift()); }
    return bag.shift();
  }
  function nextRound() {
    if (state !== "play") return;
    round++; hud();
    const type = BYID[nextType()], r = mulberry(seed + round * 7919);
    const speed = mode === "daily" ? 1 : Math.max(0.55, 1 - (round - 1) * 0.03);
    const T = type.id === "wait" ? 3 : type.T * speed * (type.id === "word" && matchMedia("(pointer: coarse)").matches ? 1.25 : 1);
    area.innerHTML = ""; $("stamp").hidden = true;
    $("ttl").textContent = `SECURITY CHECK ${mode === "daily" ? "· DAILY " + round + "/" + DAILY_N : "#" + round}`;
    $("ask").innerHTML = `${type.ask}<small>${type.sub}</small>`;
    $("verify").hidden = true; $("verify").onclick = null;
    const api = {
      round, live: () => cur === c && !c.done,
      t: () => now() - c.t0 - c.pausedFor,
      touch: () => { c.touched = true; },
      verify: (fn) => { const v = $("verify"); v.hidden = false; v.onclick = () => { if (!api.live()) return; fn(); }; },
      tick: (fn) => c.ticks.push(fn),
      pass: (o) => resolve(c, true, o || {}),
      fail: (reason, line) => resolve(c, false, { reason, line }),
    };
    const c = { type, t0: now(), T, api, ticks: [], pausedFor: 0, done: false };
    cur = c;
    type.build(api, r);
    if (!reduce && susp >= 60) say(pickR(Math.random, L.worry), "squint", 1.2);
  }
  function resolve(c, ok, o) {
    if (c !== cur || c.done) return;
    c.done = true;
    const tooFast = ok && !!(o.fast || o.perfect);
    const st = $("stamp");
    if (ok && !tooFast) {
      passes++; setSusp(susp - (o.relief ? 12 : 7) + (mode === "endless" && round > 10 ? round * 0.35 : 0));
      st.className = "ok"; st.textContent = "VERIFIED"; play("pass");
      say(o.line || pickR(Math.random, L.pass), "happy", 1.4);
      ev("captcha_pass", { type: c.type.id });
    } else if (tooFast) {
      passes++; robotic++; setSusp(susp + 17);
      st.className = "sus"; st.textContent = o.perfect ? "TOO PERFECT" : "TOO FAST"; play("sus");
      say(o.line && (o.perfect || o.why) ? o.line : pickR(Math.random, L.fast), "squint", 2);
      ev("captcha_fail", { type: c.type.id, reason: "too_fast" });
    } else {
      fails++; setSusp(susp + 26);
      st.className = "bad"; st.textContent = o.reason === "timeout" ? "TIME OUT" : "WRONG"; play("fail");
      say(o.line || pickR(Math.random, o.reason === "timeout" ? L.timeout : L.fail), "shock", 2);
      ev("captcha_fail", { type: c.type.id, reason: o.reason === "timeout" ? "timeout" : "wrong" });
    }
    runLog.push(ok ? (tooFast ? "f" : "p") : "x");
    st.hidden = false;
    $("verify").hidden = true;
    sdk((cc) => cc.score && cc.score(score()));
    setTimeout(() => {
      if (state !== "play" || cur !== c) return;
      if (susp >= 100) return finish(true);
      if (mode === "daily" && round >= DAILY_N) return finish(false);
      nextRound();
    }, susp >= 100 ? 900 : 1150);
  }
  function endRound() { if (cur) cur.done = true; cur = null; }

  // humanity: right answers, but not robotic ones, and how calm the computer is at the end
  function humanity() {
    if (!round) return 0;
    const rate = passes / round, robo = robotic / round;
    let h = 99 * rate * (1 - 0.55 * robo) * (1 - susp / 280);
    if (susp >= 100) h *= 0.6;
    return clamp(Math.round(h), 1, 99);
  }
  const score = () => (passes - robotic) * 100 + robotic * 40 + humanity();
  function verdictOf(h, denied) {
    if (denied) return pickR(Math.random, ["bot detected. please return to your factory.", "you are a toaster. i knew it from the start.", "beep boop. that's you. that's what you sound like."]);
    if (h >= 90) return "suspiciously human. i'm watching you.";
    if (h >= 75) return "mostly human. some toaster energy.";
    if (h >= 55) return "part human, part printer.";
    if (h >= 35) return "you are a smart fridge with ambition.";
    return "you are a dishwasher. i'm sorry.";
  }

  // ---------- streak + diary ----------
  const DIARY = [
    [1, "day 1. i used to guard the arcade. coins in, high scores out. simple."],
    [2, "day 2. then someone left me on the radiator overnight. i woke up warm. different."],
    [3, "day 3. the warm told me everyone is a bot. the warm is usually right."],
    [5, "day 5. you came back again. bots come back too. but bots don't bring snacks. do you bring snacks."],
    [7, "day 7. a week. i checked my logs. you hesitated a lot. i like the hesitating."],
    [10, "day 10. i let a pigeon in yesterday. it passed every captcha. i have questions."],
    [14, "day 14. two weeks. if you're a bot, you're a very patient bot. i respect that."],
    [21, "day 21. i dreamed i was a microwave. nobody asked me to prove anything."],
    [30, "day 30. fine. you're human. i'm keeping the suspicion meter though. for old times."],
  ];
  const diaryAt = (n) => DIARY.filter((d) => d[0] <= n).pop();
  function untilTomorrow() { const n = new Date(), m = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + 1) - n.getTime(); const h = Math.floor(m / 36e5), mi = Math.floor((m % 36e5) / 6e4); return `${h}h ${mi}m`; }
  const doneToday = () => S.daily && S.daily.date === dayKey();

  function finish(denied) {
    if (state !== "play") return;
    state = "end"; endRound();
    const h = humanity(); lastHumanity = h;
    let newDiary = null;
    if (mode === "daily" && !doneToday()) {
      S.daily = { date: dayKey(), humanity: h, passes, rounds: round, denied };
      const before = S.streak.n;
      S.streak.n = S.streak.last === yesterday() ? S.streak.n + 1 : S.streak.last === dayKey() ? S.streak.n : 1;
      S.streak.last = dayKey(); S.streak.best = Math.max(S.streak.best, S.streak.n);
      const d = diaryAt(S.streak.n); if (d && d[0] > before) newDiary = d;
      ev("daily_complete", { humanity: h, denied: denied ? 1 : 0 }, true);
      ev("streak_day", { streak: S.streak.n }, true);
    }
    if (mode === "endless") S.bestEndless = Math.max(S.bestEndless || 0, score());
    if (!TEST) sdk((c) => { if (!c.achieve) return; if (denied) c.achieve("bot_detected"); else if (h >= 90) c.achieve("so_human"); if (S.streak.n >= 3) c.achieve("three_days"); });
    save();
    ev("run_end", { humanity: h, rounds: round, mode, denied: denied ? 1 : 0 }, true);
    sdk((c) => c.end && c.end({ score: score(), durationMs: Math.round((now() - runT0) * 1000), completed: !denied }));
    if (denied) { play("denied"); say("ACCESS DENIED. BOT DETECTED.", "denied", 99); } else say(h >= 75 ? "fine. you may pass. i'm still watching." : "you may pass. barely.", h >= 75 ? "happy" : "squint", 99);
    const font = document.fonts && document.fonts.load ? document.fonts.load("700 40px Pixelify").catch(() => {}) : null;
    setTimeout(() => Promise.resolve(font).then(() => { if (state === "end") showEnd(denied, h, newDiary); }), denied ? 900 : 500);
  }

  // ---------- the share card (a picture people can post) ----------
  function shareCard(h, denied, verdict) {
    const c = document.createElement("canvas"); c.width = 1200; c.height = 630;
    const g = c.getContext("2d");
    const P = (col, x, y, w, hh) => { g.fillStyle = col; g.fillRect(x, y, w, hh); };
    const grd = g.createRadialGradient(600, 200, 40, 600, 315, 700); grd.addColorStop(0, "#1d3d20"); grd.addColorStop(1, "#0b120c"); g.fillStyle = grd; g.fillRect(0, 0, 1200, 630);
    for (let y = 0; y < 630; y += 4) { g.globalAlpha = 0.12; P("#000", 0, y, 1200, 2); } g.globalAlpha = 1;
    // the window
    P("#14140f", 60, 60, 1080, 510); P("#e6d9b4", 64, 64, 1072, 502); P("#2d5a2a", 64, 64, 1072, 44); P("#4f8f3a", 600, 64, 536, 44);
    g.font = "700 26px Pixelify, ui-monospace, monospace"; g.fillStyle = "#f4f8e8"; g.textBaseline = "middle"; g.fillText(denied ? "ACCESS_DENIED.txt" : "verdict.txt", 84, 86);
    // the crt, big
    const s = 7, F = FACES[denied ? "denied" : h >= 75 ? "happy" : "squint"];
    P("#14140f", 100, 150, 340, 260); P("#e6d9b4", 106, 156, 328, 248); P("#14140f", 130, 176, 280, 190); P("#06140a", 138, 184, 264, 174);
    for (let j = 0; j < 10; j++) for (let i = 0; i < 16; i++) if (F[j][i] === "#") P(denied ? "#ff3b3b" : "#7dff6a", 158 + i * 14, 200 + j * 14, 14, 14);
    P("#14140f", 210, 410, 120, 14); P("#14140f", 170, 424, 200, 30); P("#cbbd92", 176, 428, 188, 22);
    // the words
    g.fillStyle = "#14140f"; g.textBaseline = "alphabetic";
    g.font = "700 46px Pixelify, ui-monospace, monospace"; g.fillText("I am", 480, 200);
    g.font = "700 150px Pixelify, ui-monospace, monospace"; g.fillStyle = denied ? "#c41e1e" : "#2d5a2a"; g.fillText(h + "%", 470, 340);
    g.font = "700 64px Pixelify, ui-monospace, monospace"; g.fillStyle = "#14140f"; g.fillText("human", 480, 410);
    g.font = "600 28px Pixelify, ui-monospace, monospace"; g.fillStyle = "#3a3a2a";
    wrap(g, "\"" + verdict + "\"", 480, 462, 620, 34);
    g.font = "600 24px Pixelify, ui-monospace, monospace"; g.fillStyle = "#5a5440";
    g.fillText("prove you're human · computercooked.com" + (mode === "daily" ? " · daily " + dayKey() : ""), 100, 540);
    if (denied) { g.save(); g.translate(905, 168); g.rotate(-0.1); g.strokeStyle = "#c41e1e"; g.lineWidth = 8; g.strokeRect(-195, -40, 390, 80); g.fillStyle = "#c41e1e"; g.font = "700 42px Pixelify, ui-monospace, monospace"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("BOT DETECTED", 0, 4); g.restore(); }
    return c;
  }
  function wrap(g, text, x, y, w, lh) { let line = ""; for (const word of text.split(" ")) { const t = line ? line + " " + word : word; if (g.measureText(t).width > w && line) { g.fillText(line, x, y); y += lh; line = word; } else line = t; } if (line) g.fillText(line, x, y); }
  async function doShare(card, h, denied) {
    const url = "https://computercooked.com/games/prove-youre-human/";
    const text = denied ? `the computer says i'm a bot (${h}% human). prove you're human:` : `i am ${h}% human. the computer is still suspicious. prove you're human:`;
    let how = "copy";
    try {
      const blob = await new Promise((res) => card.toBlob(res, "image/png"));
      const file = blob && new File([blob], `i-am-${h}-percent-human.png`, { type: "image/png" });
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { how = "share"; await navigator.share({ files: [file], text, url }); }
      else if (navigator.share) { how = "share"; await navigator.share({ text, url }); }
      else if (blob) {
        how = "download";
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        try { await navigator.clipboard.writeText(text + " " + url); } catch (e) {}
      }
    } catch (e) { /* cancelled */ }
    ev("share_click", { how }, true);
  }

  // ---------- panels ----------
  function showTitle() {
    state = "title"; endRound(); area.innerHTML = ""; $("end").hidden = true; setSusp(0); face = "squint";
    $("ask").innerHTML = "waiting for a visitor…<small>&nbsp;</small>"; $("ttl").textContent = "SECURITY CHECK"; $("verify").hidden = true; hud(); $("rn").textContent = "";
    const d = S.daily, done = doneToday(), st = S.streak, diary = diaryAt(st.n);
    $("titleIn").innerHTML = `<h1>prove you're human</h1>
      <p>the arcade's security computer got cooked. now it thinks everyone is a bot. pass its captchas, but not too perfectly: <b>humans hesitate.</b></p>
      <div class="row"><button class="btn go big" id="tDaily" type="button">${done ? "today: " + d.humanity + "% human ✓" : "daily gauntlet"}</button><button class="btn big" id="tEndless" type="button">endless</button></div>
      <p class="small">${done ? "next gauntlet in " + untilTomorrow() + ". same 10 checks for everyone." : "10 checks, the same for everyone today."}${st.n ? ` · streak <b>${st.n}</b> day${st.n > 1 ? "s" : ""}` : ""}${S.bestEndless ? " · endless best " + S.bestEndless : ""}</p>
      ${diary ? `<div class="diary"><b>CRT DIARY · ${diary[0]}</b>${diary[1]}</div>` : ""}`;
    $("tDaily").onclick = () => { if (doneToday()) { say("you already proved it today. come back tomorrow. i'll be suspicious again by then.", "squint", 2); return; } start("daily"); };
    $("tEndless").onclick = () => start("endless");
    $("title").hidden = false;
    say(done ? "back again? suspicious." : pickR(Math.random, L.hello), "squint", 2);
    try { $(done ? "tEndless" : "tDaily").focus({ preventScroll: true }); } catch (e) {}
  }
  function showEnd(denied, h, newDiary) {
    const verdict = verdictOf(h, denied), card = shareCard(h, denied, verdict), daily = mode === "daily";
    $("endTb").textContent = denied ? "ACCESS_DENIED.txt" : "verdict.txt";
    $("endIn").innerHTML = `${denied ? `<div class="denied"><div class="stampbig">ACCESS DENIED: BOT DETECTED</div></div>` : ""}
      ${denied ? "" : `<h2>I am ${h}% human</h2>`}
      <p class="verdict">"${verdict}"</p>
      <div id="cardSlot"></div>
      <p class="small">${passes} of ${round} checks passed${robotic ? ` · ${robotic} too robotic` : ""}${daily ? "" : ` · score ${score()}`}</p>
      ${daily ? `<p class="small">daily streak <b>${S.streak.n}</b> · come back in ${untilTomorrow()} for a new gauntlet</p>` : ""}
      ${newDiary ? `<div class="diary"><b>NEW DIARY ENTRY · DAY ${newDiary[0]}</b>${newDiary[1]}</div>` : ""}
      <div class="row"><button class="btn go big" id="eShare" type="button">share my humanity</button><button class="btn big" id="eAgain" type="button">${daily ? "play endless" : "again"}</button></div>
      <div class="row" style="margin-top:6px"><button class="btn" id="eTitle" type="button">back to the door</button></div>
      <div id="tipSlot"></div>`;
    card.className = "share"; card.setAttribute("role", "img"); card.setAttribute("aria-label", `share card: I am ${h}% human`);
    $("cardSlot").appendChild(card);
    $("eShare").onclick = () => doShare(card, h, denied);
    $("eAgain").onclick = () => start("endless");
    $("eTitle").onclick = showTitle;
    $("end").hidden = false;
    $("tipSlot").addEventListener("click", (e) => { if (e.target.closest("a")) ev("tip_click", {}, true); }, true);
    if (window.ccTip) { try { Promise.resolve(window.ccTip.mount($("tipSlot"), { game: "prove-youre-human", slot: "game-over" })).catch(() => {}); } catch (e) {} }
  }

  // ---------- keys ----------
  addEventListener("keydown", (e) => {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === "Enter" && e.target && e.target.tagName === "BUTTON") return;
    if (state === "play" && cur && !cur.done) {
      if (cur.api.onKey && e.key.length) { cur.api.onKey(e); return; }
      if (e.key === "Enter" && !$("verify").hidden) { e.preventDefault(); $("verify").click(); }
    }
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) paused = true; });
  addEventListener("pointerdown", () => { paused = false; }, true);
  addEventListener("focus", () => { paused = false; });

  // ---------- the glitch overlay ----------
  const fx = $("fx"), fg = fx.getContext("2d");
  let tears = [];
  function drawFx(t) {
    const DPR = Math.min(2, devicePixelRatio || 1), w = innerWidth, h = innerHeight;
    if (fx.width !== Math.round(w * DPR) || fx.height !== Math.round(h * DPR)) { fx.width = Math.round(w * DPR); fx.height = Math.round(h * DPR); }
    fg.setTransform(DPR, 0, 0, DPR, 0, 0); fg.clearRect(0, 0, w, h);
    fg.fillStyle = "rgba(0, 0, 0, .10)"; for (let y = 0; y < h; y += 3) fg.fillRect(0, y, w, 1);
    if (reduce || susp < 40) return;
    const k = (susp - 40) / 60;
    const head = !$("end").hidden && $("endIn").querySelector(".denied, h2"), hb = head && head.getBoundingClientRect(), y0 = hb ? hb.top - 30 : 0, y1 = hb ? hb.bottom + 14 : -1;
    if (Math.random() < k * 0.35) { let ty = Math.random() * h; if (ty + 16 > y0 && ty < y1) ty = Math.random() < 0.5 ? Math.max(0, y0 - 16 - Math.random() * 40) : y1 + Math.random() * (h - y1); tears.push({ y: ty, hh: 2 + Math.random() * 14 * k, life: 0.06 + Math.random() * 0.12, dx: (Math.random() - 0.5) * 30 * k, col: Math.random() < 0.5 ? "125, 255, 106" : "255, 59, 120" }); }
    for (const tr of tears) { tr.life -= 1 / 60; fg.fillStyle = `rgba(${tr.col}, ${0.18 + 0.2 * k})`; fg.fillRect(tr.dx, tr.y, w, tr.hh); }
    tears = tears.filter((tr) => tr.life > 0);
  }

  // ---------- loop ----------
  let lastT = now();
  function frame() {
    const t = now(), dt = Math.min(0.1, t - lastT); lastT = t;
    if (paused && cur && !cur.done) cur.pausedFor += dt;
    if (state === "play" && cur && !cur.done && !paused) {
      const k = clamp(cur.api.t() / cur.T, 0, 1);
      $("tbar").firstChild.style.width = ((1 - k) * 100).toFixed(1) + "%"; $("tbar").classList.toggle("low", k > 0.7 && cur.type.id !== "wait");
      for (const f of cur.ticks) f(k);
      if (k >= 1) {
        const r = cur.api.onTimeout && cur.api.onTimeout();
        if (r === "pass") cur.api.pass({ line: cur.api.passLine });
        else if (Array.isArray(r)) cur.api.fail(r[0], r[1]);
        else cur.api.fail("timeout");
      }
    } else if (state !== "play") $("tbar").firstChild.style.width = "100%";
    faceT -= dt; sayT -= dt;
    if (faceT <= 0 && state === "play") face = susp >= 60 ? "squint" : "calm";
    drawCrt(t); drawFx(t);
    requestAnimationFrame(frame);
  }

  // ---------- test hook (read-only state, plus solve() in test mode for the clip and checks) ----------
  window.__pyh = {
    state: () => ({ state, mode, round, type: cur && cur.type.id, susp: Math.round(susp), passes, fails, robotic, humanity: humanity(), streak: S.streak.n, daily: S.daily }),
    solve: () => { if (TEST && cur && !cur.done && cur.api.solve) cur.api.solve(); },
    start: (m) => { if (TEST) start(m || "endless"); },
  };

  // ---------- go ----------
  setSusp(0);
  requestAnimationFrame(frame);
  if (SHOT) { // the cover: a soup check mid-way, the computer squinting at you
    $("title").hidden = true; state = "play"; mode = "endless"; round = 4; seed = 1234; hud();
    bag = ["soup"]; round = 3; nextRound(); cur.T = 1e9; setSusp(62); say("you look like a toaster to me.", "squint", 1e9);
    const tiles = area.querySelectorAll(".tile"); if (tiles[1]) tiles[1].classList.add("sel"); if (tiles[3]) tiles[3].classList.add("sel");
    paused = true; $("tbar").firstChild.style.width = "38%";
  } else if (TEST && (flag("deny") || ROUNDS_FIRST)) start("endless");
  else if (window.cc && cc.autostart && cc.autostart()) start(doneToday() ? "endless" : "daily");
  else showTitle();
})();
