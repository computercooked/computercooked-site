/* thin ice — computer cooked games.
   Cozy ice fishing, one frozen night at a time. Hold to drop the line through five layers of the lake; on a bite, a
   one-button reel fight (hold to reel, let go when the fish runs; too much tension snaps the line). Every fish in the
   bucket loads the ice and the cracks spread, glowing cyan: haul the bucket to shore (safe, costs time) or keep
   fishing for the big one. If the ice breaks, the hut dunks: you keep your gear, the bucket is lost. Between nights,
   the bait shop (run by the CRT) sells line, reel, lantern lure, heater, auger, sled and otter helpers. A fish log of
   30 species plus weird finds, and a three-night mystery: the warden, under the deep.
   The world is drawn into a small pixel buffer and scaled up; the UI is DOM on top. No sound is made in code (team
   rule): FILES below takes recorded files when they exist, until then the game is silent. */
(function () {
  "use strict";
  const sdk = (fn) => { try { if (window.cc) fn(window.cc); } catch (e) { /* the game never depends on it */ } };
  const $ = (id) => document.getElementById(id);
  const cv = $("c"), cx = cv.getContext("2d", { alpha: false });
  const qs = new URLSearchParams(location.search);
  // test mode: ?cctest=1 on this frame or on /games/thin-ice/ around it (jumps to night 3 and the deep layer, saves apart)
  let parentQ = ""; try { if (window.parent !== window) parentQ = window.parent.location.search; } catch (e) { /* not same-origin */ }
  const flag = (k) => qs.get(k) === "1" || new RegExp(`[?&]${k}=1(&|$)`).test(parentQ);
  const TEST = flag("cctest");
  // test shortcuts (K-0062): &dunk=1 starts night 1 with a heavy bucket on ice that's about to go; &warden=1 starts
  // night 3 under the deep after midnight with the warden on the next bite
  const T_DUNK = TEST && flag("dunk"), T_WARDEN = TEST && flag("warden");
  const R = Math.random, clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
  const pick = (a) => a[(R() * a.length) | 0];
  const rr = (a, b) => a + R() * (b - a);
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let SHOT = false; // the cover / hover clip scene: a frozen moment, no UI

  // ---------- the lake ----------
  const MPX = 5, PLANE = 44, ICE = 6, BOTTOM = 52; // px per meter, ice plane depth (perspective), ice block, lake depth (m)
  const LAYERS = [
    { n: "shallows", a: 0, b: 6, col: [24, 78, 128] },
    { n: "weed bed", a: 6, b: 14, col: [17, 60, 108] },
    { n: "drop-off", a: 14, b: 24, col: [11, 44, 86] },
    { n: "the deep", a: 24, b: 36, col: [7, 28, 60] },
    { n: "under the deep", a: 36, b: BOTTOM, col: [4, 14, 36] }
  ];
  const layerOf = (m) => { for (let i = LAYERS.length - 1; i >= 0; i--) if (m >= LAYERS[i].a) return i; return 0; };
  const depthY = (m) => ICE + m * MPX;

  // ---------- fish ----------
  // w: weight range (lb), rar: how common, val: $ per lb, pow: fight 1-10, sh: body shape, pat: markings
  const FISH = [
    // shallows
    { id: "perch", n: "yellow perch", L: 0, w: [0.2, 1.6], rar: 10, val: 3, pow: 2, sh: "norm", c1: "#d6b13a", c2: "#f2e3a0", pat: "bars", t: "stripes like a tiny tiger. bites like one too." },
    { id: "bluegill", n: "bluegill", L: 0, w: [0.2, 1.2], rar: 10, val: 3, pow: 2, sh: "round", c1: "#3f6fa0", c2: "#e8a04a", pat: "plain", t: "flat as a pancake, twice as smug." },
    { id: "pumpkinseed", n: "pumpkinseed", L: 0, w: [0.2, 1], rar: 7, val: 4, pow: 2, sh: "round", c1: "#5a8f6a", c2: "#ff9a3c", pat: "spots", t: "shaped like a seed. tastes like a fish. confusing." },
    { id: "crappie", n: "black crappie", L: 0, w: [0.4, 2.5], rar: 6, val: 4, pow: 3, sh: "round", c1: "#3a4048", c2: "#c8ccd2", pat: "spots", t: "the name is unfair. the fish is fine." },
    { id: "shiner", n: "golden shiner", L: 0, w: [0.1, 0.6], rar: 8, val: 3, pow: 1, sh: "norm", c1: "#e6c45a", c2: "#fff3c4", pat: "plain", t: "mostly shine. a little shiner." },
    { id: "rockbass", n: "rock bass", L: 0, w: [0.3, 2], rar: 5, val: 4, pow: 3, sh: "norm", c1: "#7a5a3a", c2: "#d8b080", pat: "spots", eye: "#ff3b3b", t: "red eyes. it has seen things." },
    // weed bed
    { id: "bass", n: "largemouth bass", L: 1, w: [1, 10], rar: 8, val: 5, pow: 5, sh: "norm", c1: "#4f7a3a", c2: "#d8e0a0", pat: "bars", t: "mouth first, questions never." },
    { id: "pike", n: "northern pike", L: 1, w: [2, 25], rar: 6, val: 5, pow: 7, sh: "long", c1: "#4a6a3a", c2: "#e8f0c0", pat: "spots", t: "all teeth and grudges." },
    { id: "pickerel", n: "chain pickerel", L: 1, w: [1, 6], rar: 6, val: 5, pow: 5, sh: "long", c1: "#6a7a3a", c2: "#f0e8b0", pat: "bars", t: "pike's little cousin. it heard you say little." },
    { id: "bullhead", n: "brown bullhead", L: 1, w: [0.5, 4], rar: 7, val: 3, pow: 3, sh: "norm", c1: "#5a4a30", c2: "#c8b080", pat: "plain", whisk: 1, t: "whiskers like your grandpa. attitude too." },
    { id: "sucker", n: "white sucker", L: 1, w: [1, 5], rar: 6, val: 3, pow: 3, sh: "norm", c1: "#8a8f96", c2: "#e0e2e6", pat: "plain", t: "it's had a long day. let it be." },
    { id: "muskie", n: "tiger muskie", L: 1, w: [8, 35], rar: 1.2, val: 9, pow: 9, sh: "long", c1: "#8a8a4a", c2: "#f0f0d0", pat: "bars", t: "the fish of ten thousand casts. you made one." },
    // drop-off
    { id: "walleye", n: "walleye", L: 2, w: [1, 12], rar: 8, val: 6, pow: 5, sh: "norm", c1: "#8a7a3a", c2: "#e8e0b0", pat: "plain", eye: "#e8f0a0", t: "eyes made for the dark. it saw you first." },
    { id: "smallmouth", n: "smallmouth bass", L: 2, w: [1, 7], rar: 6, val: 6, pow: 6, sh: "norm", c1: "#6a5a2a", c2: "#d8c890", pat: "bars", t: "small mouth. big opinions." },
    { id: "whitefish", n: "lake whitefish", L: 2, w: [1, 8], rar: 6, val: 6, pow: 4, sh: "norm", c1: "#b8c4cc", c2: "#f0f4f6", pat: "plain", t: "politely silver." },
    { id: "cisco", n: "cisco", L: 2, w: [0.3, 2], rar: 7, val: 5, pow: 3, sh: "norm", c1: "#9ab0c4", c2: "#eef4f8", pat: "plain", t: "travels in a crowd. you took the slow one." },
    { id: "burbot", n: "burbot", L: 2, w: [1, 10], rar: 5, val: 6, pow: 5, sh: "eel", c1: "#5a5030", c2: "#b8a870", pat: "spots", whisk: 1, t: "it spawns under the ice in january. a bold choice." },
    { id: "sauger", n: "sauger", L: 2, w: [0.5, 4], rar: 5, val: 6, pow: 4, sh: "norm", c1: "#7a6a40", c2: "#d0c8a0", pat: "spots", t: "the walleye's quiet sibling. writes poetry." },
    // the deep
    { id: "laketrout", n: "lake trout", L: 3, w: [3, 40], rar: 7, val: 8, pow: 7, sh: "long", c1: "#4a5a6a", c2: "#d0d8c8", pat: "spots", t: "decades of cold water in one fish." },
    { id: "sturgeon", n: "lake sturgeon", L: 3, w: [10, 80], rar: 2, val: 9, pow: 9, sh: "long", c1: "#5a5a50", c2: "#b0b0a0", pat: "bars", whisk: 1, t: "older than your house. maybe older than the town." },
    { id: "char", n: "arctic char", L: 3, w: [2, 15], rar: 4, val: 9, pow: 6, sh: "norm", c1: "#4a6a8a", c2: "#ff7a4a", pat: "spots", t: "an ice age left it here and never came back." },
    { id: "splake", n: "splake", L: 3, w: [2, 12], rar: 4, val: 8, pow: 6, sh: "norm", c1: "#4a5a4a", c2: "#e0c890", pat: "spots", t: "half lake trout, half brook trout. fully confused." },
    { id: "eel", n: "american eel", L: 3, w: [1, 8], rar: 4, val: 8, pow: 6, sh: "eel", c1: "#3a4a30", c2: "#a8b090", pat: "plain", t: "swam here from the sargasso sea. would like a nap." },
    { id: "sculpin", n: "deepwater sculpin", L: 3, w: [0.1, 0.5], rar: 6, val: 9, pow: 2, sh: "flat", c1: "#6a6050", c2: "#c0b090", pat: "spots", t: "it lives where the light gives up." },
    // under the deep
    { id: "cavefish", n: "blind cavefish", L: 4, w: [0.2, 1.5], rar: 7, val: 14, pow: 3, sh: "norm", c1: "#e0d8d0", c2: "#f8f0ea", pat: "plain", eye: "none", t: "no eyes. it knows exactly where you are." },
    { id: "lanterneel", n: "lantern eel", L: 4, w: [1, 9], rar: 5, val: 14, pow: 6, sh: "eel", c1: "#1a3a4a", c2: "#6ff0ff", pat: "glow", t: "it glows to find snacks. you are the snack." },
    { id: "palepike", n: "pale pike", L: 4, w: [5, 30], rar: 4, val: 12, pow: 8, sh: "long", c1: "#c8d4d8", c2: "#ffffff", pat: "spots", eye: "#9ae6ff", t: "down here so long it forgot what color was." },
    { id: "whiskers", n: "old whiskers", L: 4, w: [20, 90], rar: 2, val: 11, pow: 9, sh: "norm", c1: "#3a3a34", c2: "#8a8a70", pat: "plain", whisk: 1, t: "the bait shop has a photo of this fish from 1962. same fish." },
    { id: "koi", n: "frost koi", L: 4, w: [2, 20], rar: 3, val: 16, pow: 6, sh: "round", c1: "#f0f4ff", c2: "#ff8a5a", pat: "spots", t: "nobody put a koi down here. nobody admits it, anyway." },
    { id: "hollow", n: "hollow perch", L: 4, w: [0.5, 3], rar: 4, val: 15, pow: 4, sh: "norm", c1: "#3a5060", c2: "#9ae0e8", pat: "glow", t: "you can see right through it. it's looking right through you." }
  ];
  const WARDEN = { id: "warden", n: "the warden", L: 4, w: [150, 220], val: 0, pow: 10, sh: "long", c1: "#1c2c3a", c2: "#7ff6ff", pat: "glow", eye: "#ffffff", t: "it let you catch it. remember that." };
  // weird finds: not fish, but they go in the log (and the bucket)
  const WEIRD = [
    { id: "mitten", n: "a single mitten", L: 0, w: 0.2, cash: 4, t: "left hand. someone's still looking." },
    { id: "key", n: "a snowmobile key", L: 1, w: 0.1, cash: 8, t: "the keychain says BRENDA. good luck, brenda." },
    { id: "lantern", n: "a lost lantern", L: 2, w: 1.5, cash: 20, t: "still warm. a note on it: don't fish past midnight on the third night." },
    { id: "bottle", n: "a message in a bottle", L: 3, w: 0.8, cash: 15, t: "\"if you're reading this, the warden is real. - m.\"" },
    { id: "crt", n: "a frozen crt monitor", L: 3, w: 6, cash: 40, t: "frozen solid. the screen flickers on for a second. it says hi." },
    { id: "eye", n: "a glowing eye", L: 4, w: 0.5, cash: 0, t: "it blinks back. you put it back." }
  ];
  const ALL = FISH.concat([WARDEN]);
  const BYID = {}; ALL.forEach((f) => (BYID[f.id] = f)); WEIRD.forEach((f) => { f.weird = true; BYID[f.id] = f; });

  // ---------- the bait shop ----------
  const LINE_M = [12, 24, 36, 50];
  const UPS = [
    { id: "line", n: "longer line", d: (l) => `reach ${LINE_M[Math.min(l + 1, 3)]} m (now ${LINE_M[l]} m) and a stronger line`, cost: [70, 200, 480] },
    { id: "reel", n: "better reel", d: () => "reel faster, less tension", cost: [50, 160, 400] },
    { id: "lantern", n: "lantern lure", d: () => "bites come sooner, rare fish come closer", cost: [70, 200, 500] },
    { id: "heater", n: "hut heater", d: () => "stay out 40 s longer each night", cost: [60, 180] },
    { id: "auger", n: "ice auger", d: () => "drill a new hole mid-night: fresh ice, a new spot", cost: [120] },
    { id: "sled", n: "faster sled", d: () => "haul to shore in less time", cost: [45, 140] },
    { id: "otter", n: "hire an otter", d: (l) => `an otter fishes its own hole and sells its catch (${l}/3 hired)`, cost: [150, 400, 900] }
  ];

  // ---------- sound: recorded files only (none yet), so the game is silent until FILES is filled ----------
  const FILES = { wind: "", music: "", creak: "", crack: "", splash: "", reel: "", plunk: "" };
  let muted = false, loops = {};
  function play(name, vol) {
    if (muted || !FILES[name]) return;
    try { const a = new Audio(FILES[name]); a.volume = vol == null ? 0.7 : vol; a.play().catch(() => {}); } catch (e) { /* fine */ }
  }
  function loopsOn() {
    for (const k of ["wind", "music"]) {
      if (!FILES[k] || loops[k]) continue;
      try { const a = new Audio(FILES[k]); a.loop = true; a.volume = k === "music" ? 0.35 : 0.5; loops[k] = a; } catch (e) { /* fine */ }
    }
    for (const k in loops) { try { if (muted) loops[k].pause(); else loops[k].play().catch(() => {}); } catch (e) { /* fine */ } }
  }
  const muteBtn = $("mute");
  function setMute(m) { muted = m; muteBtn.textContent = m ? "sound off" : "sound on"; try { localStorage.setItem("thinice-mute", m ? "1" : "0"); } catch (e) { /* fine */ } loopsOn(); }
  try { if (localStorage.getItem("thinice-mute") === "1") muted = true; } catch (e) { /* fine */ }
  muteBtn.textContent = muted ? "sound off" : "sound on";
  muteBtn.onclick = () => setMute(!muted);

  // ---------- save ----------
  const KEY = TEST ? "thinice-test" : "thinice-1";
  let S = null;
  function freshS() { return { v: 1, night: 1, cash: 0, up: {}, log: {}, ach: {}, arc: {}, tut: {}, best: 0, seen: Date.now() }; }
  function save() { if (!S) return; S.seen = Date.now(); try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* fine */ } if (!TEST) sdk((c) => c.save && c.save("main", S)); }
  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.v === 1) return s; } catch (e) { /* fine */ }
    return null;
  }
  S = (!TEST && load()) || freshS();
  if (qs.get("fresh") === "1") S = freshS();
  if (!S.tut) S.tut = Object.keys(S.log).length ? { cast: 1, fight: 1, ice: 1 } : {}; // 1.0 saves: old hands skip the coach
  const lv = (id) => S.up[id] || 0;
  function ach(id) { if (S.ach[id]) return; S.ach[id] = 1; sdk((c) => c.achieve && c.achieve(id)); }

  // ---------- view ----------
  let W = 0, H = 0, DPR = 1, PS = 2, BW = 0, BH = 0;
  const buf = document.createElement("canvas"), b = buf.getContext("2d");
  function resize() {
    W = innerWidth; H = innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    PS = Math.max(2, Math.round(Math.min(W, H * 0.62) / 190)); // css px per world pixel
    BW = Math.ceil(W / PS); BH = Math.ceil(H / PS);
    buf.width = BW; buf.height = BH;
    stars = []; for (let k = 0; k < 90; k++) stars.push({ x: R() * BW, y: R(), s: R() < 0.15 ? 2 : 1, p: R() * 6 });
    flakes = []; for (let k = 0; k < Math.round(BW * BH / 900); k++) flakes.push({ x: R() * BW, y: R() * BH, v: rr(6, 16), d: R() * 6 });
    paintBasin();
  }
  let stars = [], flakes = [];
  const hx = () => Math.round(BW / 2);
  const surfCam = () => -PLANE - Math.round(BH * 0.38);
  let camY = 0, shake = 0;

  // the lake bed: deep in the middle, rising to the shores; painted once per size
  const bed = document.createElement("canvas"), bg = bed.getContext("2d");
  const bedDepth = (x) => { const u = Math.abs(x - BW / 2) / (BW / 2); return clamp(BOTTOM - (BOTTOM - 3) * Math.pow(u, 2.1), 3, BOTTOM); };
  function paintBasin() {
    const h = depthY(BOTTOM) + 8;
    bed.width = BW; bed.height = h;
    bg.clearRect(0, 0, BW, h);
    for (const Ly of LAYERS) {
      const y0 = depthY(Ly.a), y1 = depthY(Ly.b), [r, g, bl] = Ly.col;
      const gr = bg.createLinearGradient(0, y0, 0, y1);
      gr.addColorStop(0, `rgb(${r},${g},${bl})`); gr.addColorStop(1, `rgb(${r * 0.82 | 0},${g * 0.82 | 0},${bl * 0.85 | 0})`);
      bg.fillStyle = gr; bg.fillRect(0, y0, BW, y1 - y0 + 1);
    }
    // the bed itself, with a little texture
    for (let x = 0; x < BW; x++) {
      const y = Math.round(depthY(bedDepth(x)));
      bg.fillStyle = "#0b0f1c"; bg.fillRect(x, y, 1, h - y);
      bg.fillStyle = "#1d2236"; bg.fillRect(x, y, 1, 1);
      if (hash(x * 3) < 0.25) { bg.fillStyle = "#2a2f45"; bg.fillRect(x, y + 1 + ((hash(x) * 3) | 0), 1, 1); }
    }
  }
  function hash(i) { let h = (i * 374761393) ^ 0x5bd1e995; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // ---------- fish sprites (pixels, cached) ----------
  const sprites = new Map();
  function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const shade = (h, k) => { const [r, g, bl] = hexRGB(h); return `rgb(${clamp(r * k, 0, 255) | 0},${clamp(g * k, 0, 255) | 0},${clamp(bl * k, 0, 255) | 0})`; };
  function fishSprite(f, len) {
    len = Math.max(6, Math.round(len));
    const key = f.id + "|" + len;
    if (sprites.has(key)) return sprites.get(key);
    const hr = { norm: 0.38, long: 0.25, round: 0.56, eel: 0.15, flat: 0.32 }[f.sh] || 0.38;
    const Hh = Math.max(3, Math.round(len * hr)), T = Math.max(2, Math.round(len * 0.2)), L = len - T;
    const c = document.createElement("canvas"); c.width = len + 4; c.height = Hh + 6;
    const g = c.getContext("2d"), cy = Math.round(c.height / 2);
    const glow = f.pat === "glow";
    // tail (left), fanned
    g.fillStyle = shade(f.c1, 0.8);
    for (let k = 0; k < T; k++) { const hh = Math.max(1, Math.round((1 - k / T) * Hh * 0.55 + 1)); g.fillRect(2 + k, cy - hh, 1, hh * 2); }
    for (let i = 0; i < L; i++) {
      const u = i / L;
      let p;
      if (f.sh === "long") p = Math.min(1, u * 6) * (u > 0.85 ? 1 - (u - 0.85) * 3.5 : 1) * 0.95;
      else if (f.sh === "eel") p = Math.min(1, u * 8) * (u > 0.9 ? 0.75 : 1);
      else if (f.sh === "round") p = Math.pow(Math.sin(Math.PI * clamp(u * 0.92 + 0.06, 0, 1)), 0.55);
      else if (f.sh === "flat") p = (0.45 + 0.55 * u) * (u > 0.88 ? 0.8 : 1);
      else p = Math.pow(Math.sin(Math.PI * (0.12 + 0.86 * u)), 0.7);
      const h = Math.max(1, Math.round(p * Hh)), top = cy - Math.ceil(h / 2), x = 2 + T + i;
      for (let j = 0; j < h; j++) {
        const v = j / h;
        let col = v < 0.62 ? f.c1 : f.c2, k = v < 0.15 ? 0.82 : 1;
        if (f.pat === "bars" && v < 0.7 && i % 5 < 2 && u > 0.15 && u < 0.85) k *= 0.62;
        if (f.pat === "spots" && hash(i * 7 + j * 13 + len) < 0.13 && v < 0.75) k *= f.c1 > "#8" ? 0.7 : 1.45;
        if (glow && (j === 0 || j === h - 1)) { col = f.c2; k = 1; }
        g.fillStyle = shade(col, k); g.fillRect(x, top + j, 1, 1);
      }
      if (u > 0.35 && u < 0.62 && f.sh !== "eel") { g.fillStyle = shade(f.c1, 0.7); g.fillRect(x, top - 1, 1, 1); } // dorsal fin
    }
    if (glow) for (let i = 0; i < L; i += 3) { g.fillStyle = f.c2; g.fillRect(2 + T + i, cy, 1, 1); }
    // eye + whiskers
    const ex = 2 + T + Math.round(L * 0.86), ey = cy - Math.max(0, Math.round(Hh * 0.12));
    if (f.eye !== "none") { g.fillStyle = f.eye || "#101010"; g.fillRect(ex, ey, 1, 1); if (len > 24) g.fillRect(ex + 1, ey, 1, 1); }
    if (f.whisk) { g.fillStyle = shade(f.c1, 0.6); g.fillRect(2 + T + L, cy, 2, 1); g.fillRect(2 + T + L, cy + 2, 2, 1); g.fillRect(2 + T + L + 1, cy + 3, 1, 1); }
    sprites.set(key, c);
    return c;
  }
  function weirdSprite(id) {
    const key = "w|" + id;
    if (sprites.has(key)) return sprites.get(key);
    const c = document.createElement("canvas"); c.width = 16; c.height = 14;
    const g = c.getContext("2d"), px = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w || 1, h || 1); };
    if (id === "mitten") { px("#c8322b", 4, 3, 7, 8); px("#c8322b", 10, 5, 3, 3); px("#f4f0e2", 4, 10, 7, 2); }
    else if (id === "key") { px("#ffd23e", 3, 5, 4, 4); px("#ffd23e", 7, 6, 7, 2); px("#ffd23e", 11, 8, 1, 2); px("#ffd23e", 13, 8, 1, 2); px("#c84a8a", 1, 9, 3, 3); }
    else if (id === "lantern") { px("#3a2a1a", 5, 1, 6, 2); px("#ffb35a", 5, 3, 6, 7); px("#fff0b0", 7, 5, 2, 3); px("#3a2a1a", 4, 10, 8, 2); }
    else if (id === "bottle") { px("#3d8a5a", 4, 4, 9, 6); px("#3d8a5a", 12, 6, 3, 2); px("#f4f0e2", 6, 6, 4, 2); px("#8a6a3a", 14, 6, 1, 2); }
    else if (id === "crt") { px("#e8dcc0", 1, 1, 14, 11); px("#2a2a24", 3, 3, 10, 7); px("#6fd16a", 5, 5, 2, 1); px("#6fd16a", 9, 5, 2, 1); px("#6fd16a", 6, 7, 4, 1); px("#b8ac90", 4, 12, 8, 1); px("#cfe9f5", 1, 1, 14, 1); }
    else if (id === "eye") { px("#f4f8ff", 3, 3, 10, 8); px("#2ad6ff", 6, 4, 4, 6); px("#071026", 7, 5, 2, 4); px("#ffffff", 6, 4, 1, 1); }
    sprites.set(key, c);
    return c;
  }

  // ---------- the night ----------
  let state = "title", N = null, hold = false;
  const nightLen = () => (S.night <= 1 ? 390 : 330) + 40 * lv("heater"); // night 1 runs long: room to get greedy, then haul
  const thickFor = (n) => (n <= 1 ? 30 : n === 2 ? 27 : 24);
  // how many lb the ice holds comfortably: night 1 about 15 lb. Later nights the ice is thinner but the fish are far
  // heavier, so the comfort load grows (K-0062: a greedy night 1 of 3-4 min should end in a dunk)
  const iceCap = () => N.thick * (0.5 + 0.25 * Math.min(3, N.n - 1));
  function newCracks(seed) {
    // a branching crack pattern on the ice plane around the hut, revealed in order as the ice weakens
    let a = (seed * 9301 + 49297) % 233280; const rnd = () => ((a = (a * 9301 + 49297) % 233280) / 233280);
    const segs = [], tips = [];
    for (let k = 0; k < 6; k++) tips.push({ x: 0, y: 0, ang: (k / 6) * Math.PI * 2 + rnd() * 0.6 });
    for (let step = 0; step < 15 && segs.length < 90; step++) {
      const next = [];
      for (const t of tips) {
        const len = 3 + rnd() * 5, ang = t.ang + (rnd() - 0.5) * 0.9;
        const nx = t.x + Math.cos(ang) * len, ny = t.y + Math.sin(ang) * len * 0.38;
        segs.push({ x1: t.x, y1: t.y, x2: nx, y2: ny, o: step + rnd() * 0.9 });
        next.push({ x: nx, y: ny, ang });
        if (rnd() < 0.28) next.push({ x: nx, y: ny, ang: ang + (rnd() < 0.5 ? 0.8 : -0.8) });
      }
      tips.length = 0; tips.push(...next.slice(0, 14));
    }
    segs.sort((p, q) => p.o - q.o);
    return segs;
  }
  function startNight() {
    const n = S.night;
    N = {
      n, t: TEST ? nightLen() * 0.42 : 0, len: nightLen(), bucket: [], lure: { m: 0, mode: "up" }, biteT: 0, fight: null,
      c: 0, thick: thickFor(n), cracks: newCracks((R() * 1e5) | 0), hot: -1, haul: null, drill: null, dunk: null,
      best: 0, caught: 0, hauledLb: 0, earned: 0, news: 0, lost: 0, warned: 0, endWarn: false, otT: [], fx: [], amb: [], warden: false,
      lastFind: null, breath: 1.5, lineEndSaid: false, ottersEarned: 0, scar: 0, forceWarden: false
    };
    for (let k = 0; k < lv("otter"); k++) N.otT.push(rr(8, 20));
    state = "night";
    camY = surfCam();
    if (!SHOT) { sdk((c) => c.start && c.start()); sdk((c) => c.event && c.event("night_start", { night: n })); }
    if (TEST && !T_DUNK) { N.lure.m = Math.min(38, LINE_M[lv("line")]); N.lure.mode = "wait"; N.biteT = 2; }
    loopsOn();
    toast(n === 1 ? "night 1. hold anywhere to drop your line." : `night ${n}. the ice is ${N.thick >= 27 ? "thick" : "thinner"} tonight.`);
    if (!SHOT) save();
    if (!SHOT && !TEST && !S.tut.cast) coach("cast");
  }

  // ---------- fishing ----------
  const reelSpeed = () => 3 + 0.7 * lv("reel");
  const lineMul = () => 1 + 0.22 * lv("line") + 0.1 * lv("reel");
  const maxLine = () => LINE_M[lv("line")];
  function rollCatch(m) {
    const L = layerOf(m), frac = N.t / N.len;
    // the story: the lantern on night 2+, the warden under the deep on night 3+ after midnight
    if (N.forceWarden && L === 4) { N.forceWarden = false; return { fish: WARDEN, w: Math.round(rr(150, 220) * 10) / 10 }; }
    if (N.n >= 2 && !S.arc.lantern && L >= 2 && N.t > 15) return { weird: WEIRD[2] };
    if (N.n >= 3 && !N.warden && L === 4 && frac > 0.4 && R() < 0.4) return { fish: WARDEN, w: Math.round(rr(150, 220) * 10) / 10 };
    const odd = WEIRD.filter((w) => w.L === L && w.id !== "lantern");
    // never junk for the very first catch: the first bite is a real fish with a real fight
    if (Object.keys(S.log).length && odd.length && R() < (odd.some((w) => !S.log[w.id]) ? 0.07 : 0.02)) return { weird: pick(odd) };
    let pool = FISH.filter((f) => f.L === L);
    if (!Object.keys(S.log).length) pool = pool.filter((f) => f.pow <= 3); // the very first fish is a gentle one to learn on
    const boost = (f) => f.rar * (f.rar < 3 ? 1 + 0.5 * lv("lantern") + (N.hot === L ? 1 : 0) : 1);
    let tot = 0; for (const f of pool) tot += boost(f);
    let r = R() * tot, f = pool[0];
    for (const p of pool) { r -= boost(p); if (r <= 0) { f = p; break; } }
    const w = f.w[0] + (f.w[1] - f.w[0]) * Math.pow(R(), 2.3);
    return { fish: f, w: Math.round(w * 10) / 10 };
  }
  function bite() {
    const got = rollCatch(N.lure.m);
    play("plunk");
    N.fx.push({ k: "bang", life: 0.7 });
    if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) { /* fine */ }
    if (got.weird) { // bycatch: junk snags the hook and just comes up, no fight
      N.lure.mode = "land"; N.landing = got; toast("snagged something. bycatch: it comes up without a fight."); return;
    }
    const f = got.fish, big = f === WARDEN;
    const st = big ? 46 : 4 + f.pow * 1.4 + Math.sqrt(got.w) * 0.6;
    N.fight = { f, w: got.w, d: N.lure.m, S: st, Smax: st, ten: 0, run: false, warn: false, ph: rr(1.2, 2.2), wob: 0 };
    N.lure.mode = "fight";
    if (big) { shake = 1; toast("something enormous took the bait.", "warm"); sdk((c) => c.event && c.event("warden_hooked", {})); }
    if (!S.tut.fight) { N.fight.ph = 3; coach("fight"); } // the first fish waits for the coach, then gives a calm few seconds
  }
  function stepFight(dt) {
    const F = N.fight, tired = F.S <= 0, pw = tired ? F.f.pow * 0.3 : F.f.pow;
    F.ph -= dt;
    if (F.ph <= 0) {
      if (tired) { F.run = false; F.warn = false; F.ph = 1; }
      else if (F.run) { F.run = false; F.ph = Math.max(0.9, rr(1.4, 3.6) - F.f.pow * 0.12); }
      else if (F.warn) { F.warn = false; F.run = true; F.ph = 0.5 + F.f.pow * 0.1; play("reel", 0.4); }
      else { F.warn = true; F.ph = 0.45; }
    }
    if (hold) {
      F.d -= reelSpeed() * (F.run ? 0.22 : 1) * dt;
      F.ten += (0.08 + pw * 0.034 * (F.run ? 2.7 : 0.5)) * dt / lineMul();
      F.S -= (F.run ? 1.8 : 1) * dt;
    } else {
      F.d += (F.run ? pw * 0.42 : pw * 0.05) * dt;
      F.ten = Math.max(0, F.ten - 0.85 * dt);
      F.S -= 0.3 * dt;
    }
    F.wob += dt * (F.run ? 22 : 9);
    N.lure.m = Math.max(0, F.d);
    if (F.ten >= 1) { toast(`snap! the ${F.f === WARDEN ? "line" : F.f.n} broke free.`, "bad"); N.fx.push({ k: "snap", life: 0.6 }); N.fight = null; N.lure.mode = "reel"; return; }
    if (F.d > maxLine() + 4) { toast("it took all your line and kept going.", "bad"); N.fight = null; N.lure.mode = "reel"; return; }
    if (F.d <= 0.4) land({ fish: F.f, w: F.w });
  }
  function land(got) {
    N.fight = null; N.lure.mode = "up"; N.lure.m = 0; N.biteT = 0;
    if (got.fish === WARDEN) return wardenCaught(got.w);
    const it = got.weird || got.fish, w = got.weird ? got.weird.w : got.w;
    const isNew = !S.log[it.id];
    const e = S.log[it.id] || (S.log[it.id] = { n: 0, best: 0 });
    e.n++; if (w > e.best) e.best = w;
    const v = got.weird ? got.weird.cash : Math.max(1, Math.round(w * it.val * 0.6));
    if (it.id !== "eye") N.bucket.push({ id: it.id, w, v });
    if (got.weird && it.id === "lantern") S.arc.lantern = 1;
    if (isNew) N.news++;
    N.caught++;
    if (!got.weird && w > N.best) { N.best = w; sdk((c) => c.score && c.score(Math.round(N.best * 10))); }
    if (!got.weird && w > S.best) S.best = w;
    // the ice feels it
    N.c = Math.min(0.999, N.c + 0.015 + 0.12 * Math.min(1, w / iceCap()));
    play("splash", 0.5);
    showCatch(it, w, isNew, !got.weird && w >= it.w[0] + (it.w[1] - it.w[0]) * 0.8);
    ach("first_catch");
    if (!got.weird && w >= it.w[0] + (it.w[1] - it.w[0]) * 0.8) ach("trophy");
    if (Object.keys(S.log).filter((k) => !BYID[k].weird).length >= 12) ach("log_12");
    if (it.id === "eye") toast("you put it back. it keeps blinking.", "warm");
    save();
  }
  function wardenCaught(w) {
    N.warden = true; S.arc.warden = (S.arc.warden || 0) + 1;
    const e = S.log.warden || (S.log.warden = { n: 0, best: 0 });
    e.n++; if (w > e.best) e.best = w;
    if (w > N.best) { N.best = w; sdk((c) => c.score && c.score(Math.round(N.best * 10))); }
    if (w > S.best) S.best = w;
    S.cash += 300; N.earned += 300;
    N.c = 0; N.scar = 0; N.warned = 0; N.cracks = newCracks((R() * 1e5) | 0); // the lake hums and the ice seals
    ach("warden");
    sdk((c) => c.event && c.event("warden", { night: N.n, w }));
    save();
    panel("end", `<h2 class="warm">the warden</h2>${fishCanvasHTML(WARDEN, 64)}<p>${w} lb. older than the lake's name.<br>it looks at you for a long moment.<br>you let it go. it sinks back under the deep, slow as a thought.</p><p>the ice under your hut hums, and the cracks close.<br>someone left <b class="cash">$300</b> in an envelope by your bucket. it says <i>thank you. - m.</i></p><button class="go" id="eGo" type="button">keep fishing</button>`);
    drawPanelFish();
    $("eGo").onclick = () => { $("end").hidden = true; };
  }

  // ---------- the ice ----------
  function stepIce(dt) {
    const load = N.bucket.reduce((s, f) => s + f.w, 0);
    let rate = 0.005 * Math.pow(load / iceCap(), 2);
    if (N.fight) rate += 0.0012 * N.fight.f.pow / 5;
    N.c = Math.min(1, N.c + rate * dt);
    const lvl = warnLvl(N.c);
    if (lvl > N.warned) {
      N.warned = lvl;
      play(lvl >= 2 ? "crack" : "creak");
      shake = 0.4 + lvl * 0.2;
      toast(["", "the ice creaks under the bucket.", "the ice groans. cracks are spreading.", "cracks race outward. haul it now?"][lvl], lvl >= 2 ? "bad" : "warm");
      if (lvl === 1 && !S.tut.ice && !TEST) coach("ice");
    }
    if (N.c >= 1) dunk();
  }
  const warnLvl = (c) => (c >= 0.85 ? 3 : c >= 0.6 ? 2 : c >= 0.35 ? 1 : 0);
  function dunk() {
    N.fight = null; N.haul = null; N.drill = null; N.lure.mode = "up"; N.lure.m = 0;
    N.lost = N.bucket.length; N.lostLb = N.bucket.reduce((s, f) => s + f.w, 0);
    // the bucket's fish swim off
    for (const f of N.bucket) if (!BYID[f.id].weird) N.fx.push({ k: "escape", id: f.id, x: hx() + rr(-6, 6), y: depthY(0.5), vx: rr(-14, 14), vy: rr(8, 20), life: 2.6 });
    N.bucket = [];
    N.dunk = { t: 0 };
    $("catch").hidden = true;
    state = "dunk";
    shake = 1.4;
    play("crack"); play("splash");
    ach("dunked");
    sdk((c) => c.event && c.event("dunk", { night: N.n, t: Math.round(N.t) }));
  }

  // ---------- shore, holes, otters ----------
  function haul() {
    if (!N.bucket.length || N.haul || N.fight || N.drill || state !== "night") return;
    N.lure.mode = "up"; N.lure.m = 0;
    N.haul = { t: 0, dur: [7, 5, 3.6][lv("sled")] };
    play("creak", 0.3);
  }
  function haulDone() {
    const lb = N.bucket.reduce((s, f) => s + f.w, 0), v = N.bucket.reduce((s, f) => s + f.v, 0);
    S.cash += v; N.earned += v; N.hauledLb += lb; N.bucket = []; N.haul = null;
    toast(`sold at the bait shop: ${lb.toFixed(1)} lb for $${v}`, "warm");
    // with the weight gone the ice settles, but it remembers: a scar stays on the meter until you drill a new hole
    const was = N.c;
    N.scar = Math.max(N.scar, was * 0.4);
    N.c = N.scar; N.warned = warnLvl(N.c);
    if (was > 0.2) toast(N.scar > 0.15 ? "the ice settles. it remembers, though (the scar on the meter)." : "the ice settles.");
    if (lb >= 50) ach("haul_50");
    sdk((c) => c.event && c.event("haul", { lb: Math.round(lb), v }));
    save();
  }
  function drill() {
    if (!lv("auger") || N.haul || N.fight || N.drill || state !== "night") return;
    N.lure.mode = "up"; N.lure.m = 0;
    N.drill = { t: 0, dur: 5 };
  }
  function drillDone() {
    N.drill = null; N.c = 0; N.scar = 0; N.warned = 0; N.cracks = newCracks((R() * 1e5) | 0);
    N.thick = Math.round(rr(17, 34));
    N.hot = (R() * 5) | 0;
    toast(`fresh hole. ${N.thick >= 28 ? "thick ice here." : N.thick <= 21 ? "thin ice here. careful." : "the ice feels ok."} the ${LAYERS[N.hot].n} is busy at this spot.`);
  }
  function stepOtters(dt) {
    for (let k = 0; k < N.otT.length; k++) {
      N.otT[k] -= dt;
      if (N.otT[k] <= 0) {
        N.otT[k] = rr(14, 24);
        const f = pick(FISH.filter((x) => x.L <= 1 && x.w[1] < 6)), v = Math.max(1, Math.round(rr(f.w[0], f.w[1]) * f.val * 0.6));
        S.cash += v; N.earned += v; N.ottersEarned += v;
        N.fx.push({ k: "otter", i: k, s: "+$" + v, life: 1.6 });
      }
    }
  }

  // ---------- sim ----------
  function sim(dt) {
    if (SHOT) { if (N) { stepFx(dt); if (N.grow) N.c = Math.min(0.97, N.c + dt * 0.2); if (N.fight) N.fight.wob += dt * 14; } return; }
    if (state === "dunk") { N.dunk.t += dt; stepFx(dt); if (N.dunk.t > 2.8) endNight("ice"); return; }
    if (state !== "night" || coachOn) return;
    N.t += dt;
    stepFx(dt);
    stepOtters(dt);
    if (N.haul) { N.haul.t += dt; if (N.haul.t >= N.haul.dur) haulDone(); }
    else if (N.drill) { N.drill.t += dt; if (N.drill.t >= N.drill.dur) drillDone(); }
    else {
      const L = N.lure;
      if (L.mode === "up" && hold) { L.mode = "drop"; L.from = null; }
      if (L.mode === "drop") {
        if (hold) {
          L.m = Math.min(maxLine(), L.m + 7 * dt);
          if (L.m >= maxLine() && !N.lineEndSaid) { N.lineEndSaid = true; toast(lv("line") < 3 ? `that's all your line (${maxLine()} m). the bait shop sells longer.` : "the bottom of the lake.", "warm"); }
          if (L.m >= 36) ach("deep");
        } else {
          L.mode = L.m < 0.6 ? "up" : "wait";
          // a fresh wait; nudging the line a little keeps the bite that was coming (night 2's taps shouldn't reset it)
          const nb = rr(2, 5) * (1 - 0.15 * lv("lantern"));
          N.biteT = L.from != null && Math.abs(L.m - L.from) < 3 && N.biteT > 0 ? Math.min(N.biteT, nb) : nb;
        }
      } else if (L.mode === "wait") {
        if (hold) { L.mode = "drop"; L.from = L.m; }
        else { N.biteT -= dt; if (N.biteT <= 0) bite(); }
      } else if (L.mode === "reel") {
        L.m -= 10 * dt; if (L.m <= 0) { L.m = 0; L.mode = "up"; }
      } else if (L.mode === "fight") stepFight(dt);
      else if (L.mode === "land") { L.m -= 12 * dt; if (L.m <= 0) land(N.landing); }
    }
    stepIce(dt);
    if (state !== "night") return;
    if (!N.endWarn && N.len - N.t < 30) { N.endWarn = true; toast("the sky's getting light. dawn soon.", "warm"); }
    if (N.t >= N.len && !N.fight) endNight("dawn");
  }
  function stepFx(dt) {
    for (let k = N.fx.length - 1; k >= 0; k--) {
      const f = N.fx[k]; f.life -= dt;
      if (f.k === "escape") { f.x += f.vx * dt; f.y += f.vy * dt; }
      if (f.k === "p") { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 40 * dt; }
      if (f.k === "puff") { f.y -= 6 * dt; f.x += 2 * dt; }
      if (f.life <= 0) N.fx.splice(k, 1);
    }
    N.breath -= dt;
    if (N.breath <= 0) { N.breath = rr(2.2, 3.4); N.fx.push({ k: "puff", x: hx() - 5, y: -16, life: 1.6 }); }
    // ambient fish drifting through the layers
    if (N.amb.length < 9 && R() < dt * 0.8) {
      const f = pick(FISH.filter((x) => x.L <= Math.max(1, layerOf(maxLine())) || R() < 0.3)), dir = R() < 0.5 ? 1 : -1;
      const m = rr(LAYERS[f.L].a + 1, LAYERS[f.L].b - 1);
      N.amb.push({ f, m, x: dir > 0 ? -20 : BW + 20, v: dir * rr(4, 10), len: clamp(Math.round(8 + Math.sqrt(f.w[1]) * 3), 7, 26) });
    }
    for (let k = N.amb.length - 1; k >= 0; k--) { const a = N.amb[k]; a.x += a.v * dt; if (a.x < -40 || a.x > BW + 40) N.amb.splice(k, 1); }
  }

  // ---------- end of a night ----------
  function endNight(why) {
    if (state === "end") return;
    const dawn = why === "dawn";
    let soldLb = 0, soldV = 0;
    if (dawn && N.bucket.length) { soldLb = N.bucket.reduce((s, f) => s + f.w, 0); soldV = N.bucket.reduce((s, f) => s + f.v, 0); S.cash += soldV; N.earned += soldV; N.hauledLb += soldLb; N.bucket = []; }
    state = "end";
    hold = false;
    sdk((c) => c.end && c.end({ score: Math.round(N.best * 10), durationMs: Math.round(N.t * 1000), completed: true }));
    const night = N.n;
    S.night = night + 1;
    save();
    const best = N.best ? `${N.best.toFixed(1)} lb` : "none";
    const rows = [["fish caught", N.caught], ["heaviest", best], ["hauled to shore", N.hauledLb.toFixed(1) + " lb"], ["earned", "$" + N.earned], ["new in the log", N.news]];
    if (N.ottersEarned) rows.push(["your otters", "$" + N.ottersEarned]);
    if (!dawn) rows.splice(3, 0, ["lost with the bucket", `${N.lost} (${(N.lostLb || 0).toFixed(1)} lb)`]);
    panel("end", (dawn
      ? `<h2>dawn</h2><p>${soldLb ? `you walked the bucket in at sunrise: ${soldLb.toFixed(1)} lb for $${soldV}.` : "the sun comes up over the lake."}<br>night ${night} is done.</p>`
      : `<h2 class="warm">the ice broke</h2><p>the hut went in with a crunch and a sploosh.<br>you climbed out soaked. your gear's fine. the bucket is gone.</p>`) +
      `<div class="stats">${rows.map((r) => `<span>${r[0]}</span><b>${r[1]}</b>`).join("")}</div>` +
      `<button class="go" id="eGo" type="button">to the bait shop</button><div id="tipSlot"></div><div class="credit">computer cooked games</div>`);
    $("eGo").onclick = () => { $("end").hidden = true; openShop(); };
    // the shared tip button (assets/tip.js); nothing shows while tips are off
    if (window.ccTip) { try { Promise.resolve(window.ccTip.mount($("tipSlot"), { game: "thin-ice", slot: "game-over" })).catch(() => {}); } catch (e) { /* fine */ } }
  }

  // ---------- drawing ----------
  let simT = 0;
  function draw(dt) {
    simT += dt;
    // camera: the surface when the line is up, else follow the lure
    let target = surfCam();
    if (N && (state === "night" || state === "dunk") && N.lure.m > 2) target = clamp(depthY(N.lure.m) - Math.round(BH * 0.62), surfCam(), depthY(BOTTOM) + 10 - BH); // only scroll once the lure nears the bottom
    if (SHOT) target = surfCam() + Math.round(BH * 0.08);
    camY = lerp(camY, target, Math.min(1, dt * 4));
    shake = Math.max(0, shake - dt * 1.5);
    const sx = reduce ? 0 : Math.round((R() - 0.5) * shake * 3), sy = reduce ? 0 : Math.round((R() - 0.5) * shake * 3);
    const cam = Math.round(camY) + sy;
    b.setTransform(1, 0, 0, 1, sx, -cam);
    b.fillStyle = "#070b1e"; b.fillRect(-4, cam - 4, BW + 8, BH + 8);
    drawSky(cam);
    drawWater();
    drawPlane();
    if (N) drawNight();
    else drawHut(hx(), -6, 0, 0);
    // snow (screen space)
    b.setTransform(1, 0, 0, 1, 0, 0);
    for (const f of flakes) {
      f.y += f.v * dt; f.x += Math.sin(simT * 0.8 + f.d) * dt * 4;
      if (f.y > BH) { f.y = -2; f.x = R() * BW; }
      b.fillStyle = f.v > 12 ? "#ffffffcc" : "#ffffff77"; b.fillRect(f.x | 0, f.y | 0, 1, 1);
    }
    cx.setTransform(1, 0, 0, 1, 0, 0);
    cx.imageSmoothingEnabled = false;
    cx.drawImage(buf, 0, 0, BW * PS * DPR, BH * PS * DPR);
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (N && (state === "night" || state === "dunk") && !SHOT) drawOverlay(cam);
  }
  function drawSky(cam) {
    const top = cam, hor = -PLANE;
    const g = b.createLinearGradient(0, top, 0, hor);
    const dawnK = N ? clamp((N.t - (N.len - 50)) / 50, 0, 1) : 0;
    g.addColorStop(0, dawnK ? `rgb(${lerp(7, 40, dawnK) | 0},${lerp(11, 40, dawnK) | 0},${lerp(30, 90, dawnK) | 0})` : "#060a1c");
    g.addColorStop(1, dawnK ? `rgb(${lerp(19, 230, dawnK) | 0},${lerp(34, 150, dawnK) | 0},${lerp(74, 120, dawnK) | 0})` : "#16285a");
    b.fillStyle = g; b.fillRect(0, top, BW, hor - top);
    const skyH = hor - surfCam();
    for (const s of stars) {
      const y = hor - s.y * skyH * 1.6;
      if (y < top || y > hor - 4) continue;
      b.globalAlpha = (0.5 + 0.5 * Math.sin(simT * 1.7 + s.p)) * (1 - dawnK);
      b.fillStyle = "#fff"; b.fillRect(s.x | 0, y | 0, s.s, s.s);
    }
    b.globalAlpha = 1;
    // the moon
    b.fillStyle = "#f4f0dc"; b.beginPath(); b.arc(BW * 0.8, hor - skyH * 0.78, 6, 0, 6.3); b.fill();
    b.fillStyle = "#16285a"; b.beginPath(); b.arc(BW * 0.8 + 3, hor - skyH * 0.78 - 2, 5, 0, 6.3); b.fill();
    // the aurora: two slow bands of curtain, column by column
    b.globalCompositeOperation = "lighter";
    for (let band = 0; band < 2; band++) {
      const base = hor - skyH * (0.5 + band * 0.17), amp = 7 + band * 4;
      for (let x = 0; x < BW; x++) {
        const y = base + Math.sin(x * 0.035 + simT * 0.22 + band * 2) * amp + Math.sin(x * 0.011 - simT * 0.13) * amp * 1.4;
        const a = (0.12 + 0.1 * Math.sin(x * 0.07 + simT * (0.9 + band * 0.4))) * (1 - dawnK * 0.8);
        const h = 18 + 8 * Math.sin(x * 0.05 + simT * 0.5 + band);
        b.fillStyle = band ? `rgba(150,90,255,${a * 0.8})` : `rgba(80,255,180,${a})`;
        b.fillRect(x, y - h, 1, h * 0.35);
        b.fillStyle = band ? `rgba(120,140,255,${a * 0.6})` : `rgba(90,230,255,${a * 0.75})`;
        b.fillRect(x, y - h * 0.65, 1, h * 0.45);
        b.fillStyle = `rgba(140,255,220,${a * 0.5})`;
        b.fillRect(x, y - h * 0.2, 1, 2);
      }
    }
    b.globalCompositeOperation = "source-over";
    // far shore: treeline and the bait shop's light on the left
    for (let x = 0; x < BW; x++) {
      const h = 3 + Math.round(hash(x) * 2 + (hash((x / 3) | 0) < 0.4 ? 5 * hash(x * 7) : 0));
      b.fillStyle = "#0b1428"; b.fillRect(x, hor - h, 1, h);
    }
    const shopX = Math.max(10, BW * 0.12);
    b.fillStyle = "#1d1810"; b.fillRect(shopX - 5, hor - 7, 10, 6);
    b.fillStyle = "#2a2014"; b.fillRect(shopX - 6, hor - 9, 12, 2);
    b.fillStyle = "#ffb35a"; b.fillRect(shopX - 2, hor - 5, 2, 2);
    b.globalAlpha = 0.25 + 0.1 * Math.sin(simT * 2); b.fillStyle = "#ffb35a"; b.fillRect(shopX - 4, hor - 7, 6, 5); b.globalAlpha = 1;
  }
  function drawPlane() {
    // the frozen lake seen at an angle, far (dim) to near (bright)
    for (let y = -PLANE; y < 0; y++) {
      const t = (y + PLANE) / PLANE;
      b.fillStyle = `rgb(${lerp(40, 150, t * t) | 0},${lerp(62, 194, t * t) | 0},${lerp(104, 220, t * t) | 0})`;
      b.fillRect(0, y, BW, 1);
    }
    for (let k = 0; k < 140; k++) { // snow drifts and glints
      const x = (hash(k * 11) * BW) | 0, y = -PLANE + ((Math.pow(hash(k * 5), 0.7) * PLANE) | 0);
      b.fillStyle = hash(k) < 0.5 ? "#e8f6ff" : "#a8cfe6"; b.fillRect(x, y, 1 + ((hash(k * 3) * 3) | 0), 1);
    }
    // the ice block, cut away at the front
    const g = b.createLinearGradient(0, 0, 0, ICE);
    g.addColorStop(0, "#e8f8ff"); g.addColorStop(1, "#7fbcd8");
    b.fillStyle = g; b.fillRect(0, 0, BW, ICE);
    for (let x = 0; x < BW; x += 7) { b.fillStyle = "#ffffff55"; b.fillRect(x + ((hash(x) * 5) | 0), 2 + ((hash(x * 3) * 3) | 0), 1, 1); }
  }
  function drawWater() {
    b.drawImage(bed, 0, 0);
    const cx0 = hx();
    // light from the hole
    b.globalAlpha = 0.07; b.fillStyle = "#9ae6ff";
    b.beginPath(); b.moveTo(cx0 - 3, ICE); b.lineTo(cx0 + 3, ICE); b.lineTo(cx0 + 26, depthY(20)); b.lineTo(cx0 - 26, depthY(20)); b.fill();
    b.globalAlpha = 1;
    // weeds where the bed is in the weed bed
    for (let x = 2; x < BW; x += 5) {
      const d = bedDepth(x);
      if (d < 5 || d > 16) continue;
      const y0 = depthY(d), h = 6 + ((hash(x) * 16) | 0);
      for (let k = 0; k < h; k++) {
        const sw = Math.sin(simT * 1.3 + x * 0.3 + k * 0.25) * k * 0.12;
        b.fillStyle = k % 3 ? "#2f6a3a" : "#3f8a4a"; b.fillRect((x + sw) | 0, y0 - k, 1, 1);
      }
    }
    // marine snow
    for (let k = 0; k < 50; k++) {
      const x = (hash(k * 13) * BW + Math.sin(simT * 0.3 + k) * 3) | 0, y = ICE + ((hash(k * 7) * depthY(BOTTOM) + simT * 3 * (0.5 + hash(k))) % depthY(BOTTOM)) | 0;
      b.fillStyle = "#9ae6ff33"; b.fillRect(x, y, 1, 1);
    }
    // layer seams
    for (const Ly of LAYERS) if (Ly.a > 0) { b.fillStyle = "#ffffff0d"; b.fillRect(0, depthY(Ly.a) | 0, BW, 1); }
    // under the deep, something watches (until the warden is met)
    if (S.night >= 3 && !S.arc.warden) {
      const blink = Math.sin(simT * 0.7) > 0.96 ? 0 : 1, ey = depthY(47), ex = cx0 + Math.sin(simT * 0.1) * 30;
      b.globalAlpha = 0.6 * blink; b.fillStyle = "#7ff6ff"; b.fillRect(ex - 4, ey, 2, 1); b.fillRect(ex + 3, ey, 2, 1); b.globalAlpha = 1;
    }
  }
  function drawNight() {
    const cx0 = hx();
    // ambient fish
    for (const a of N.amb) {
      if (depthY(a.m) > depthY(bedDepth(a.x)) - 2) continue;
      const sp = fishSprite(a.f, a.len);
      b.globalAlpha = 0.55;
      b.save(); b.translate(a.x | 0, (depthY(a.m) + Math.sin(simT * 2 + a.x * 0.1)) | 0); if (a.v < 0) b.scale(-1, 1);
      b.drawImage(sp, -sp.width / 2, -sp.height / 2); b.restore();
      b.globalAlpha = 1;
    }
    // light spill from the hut onto the ice
    b.save(); b.translate(cx0, -6); b.scale(1, 0.38);
    const lg = b.createRadialGradient(0, 0, 2, 0, 0, 46);
    lg.addColorStop(0, "rgba(255,179,90,.45)"); lg.addColorStop(1, "rgba(255,179,90,0)");
    b.fillStyle = lg; b.beginPath(); b.arc(0, 0, 46, 0, 6.3); b.fill(); b.restore();
    // cracks, glowing cyan, more of them as the ice weakens
    const dk = N.dunk ? Math.min(1, N.dunk.t / 0.5) : 0;
    const show = Math.floor(N.cracks.length * Math.min(1, N.c * 1.05 + dk));
    if (show > 0) {
      const pulse = 0.65 + 0.35 * Math.sin(simT * (2 + N.c * 6));
      b.save(); b.beginPath(); b.rect(0, -PLANE, BW, PLANE + 1); b.clip(); b.translate(cx0, -5);
      for (let pass = 0; pass < 2; pass++) {
        b.strokeStyle = pass ? `rgba(200,250,255,${0.85 * pulse})` : `rgba(90,220,255,${0.3 * pulse})`;
        b.lineWidth = pass ? 1 : 2.4;
        b.beginPath();
        for (let k = 0; k < show; k++) { const s = N.cracks[k]; b.moveTo(s.x1 * 1.6, s.y1 * 1.6); b.lineTo(s.x2 * 1.6, s.y2 * 1.6); }
        b.stroke();
      }
      b.restore();
      if (N.c > 0.5) for (let x = cx0 - 22; x < cx0 + 22; x += 9) { b.fillStyle = "#9ae6ff88"; b.fillRect(x + ((hash(x) * 4) | 0), 1, 1, ICE - 1); }
    }
    // the dunk: open water spreads and the hut tips in
    let sink = 0, tilt = 0;
    if (N.dunk) {
      const t = N.dunk.t;
      sink = Math.min(24, t * t * 10); tilt = Math.min(0.35, t * 0.25);
      b.fillStyle = "#06142c"; b.beginPath(); b.ellipse(cx0, -5, Math.min(30, t * 26), Math.min(10, t * 8), 0, 0, 6.3); b.fill();
      if (t < 1.2 && R() < 0.7) for (let k = 0; k < 4; k++) N.fx.push({ k: "p", x: cx0 + rr(-14, 14), y: -6, vx: rr(-20, 20), vy: rr(-40, -16), c: pick(["#e8f8ff", "#9ae6ff", "#ffffff"]), life: rr(0.5, 1) });
    }
    // otters by their own little holes
    const n = N.otT.length;
    for (let k = 0; k < n; k++) {
      const ox = cx0 + (k % 2 ? 1 : -1) * (30 + ((k / 2) | 0) * 22), oy = -10 - ((k / 2) | 0) * 6;
      b.fillStyle = "#0b1a33"; b.beginPath(); b.ellipse(ox, oy + 2, 4, 1.5, 0, 0, 6.3); b.fill();
      drawOtter(ox + 5, oy, k);
    }
    // the line, from the hut down through the hole
    if (N.lure.m > 0 && !N.haul && !N.drill) {
      const ly = depthY(N.lure.m), F = N.fight;
      const lx = cx0 + (F ? Math.sin(F.wob) * (F.run ? 5 : 2) : Math.sin(simT * 1.5) * 1);
      const ten = F ? F.ten : 0;
      b.strokeStyle = ten > 0.75 ? "#ff6a4a" : ten > 0.45 ? "#ffb35a" : "#e8f6ffaa"; b.lineWidth = 1;
      b.beginPath(); b.moveTo(cx0 + 0.5, -4); b.quadraticCurveTo(cx0 + (lx - cx0) * 0.3 + (F ? 0 : 3), ly * 0.5, lx + 0.5, ly); b.stroke();
      if (lv("lantern")) { const gl = b.createRadialGradient(lx, ly, 0, lx, ly, 8 + 3 * lv("lantern")); gl.addColorStop(0, "rgba(255,190,90,.55)"); gl.addColorStop(1, "rgba(255,190,90,0)"); b.fillStyle = gl; b.fillRect(lx - 14, ly - 14, 28, 28); }
      b.fillStyle = lv("lantern") ? "#ffd27a" : "#d8e4ee"; b.fillRect(lx | 0, ly | 0, 2, 2);
      if (F) {
        const sp = fishSprite(F.f, F.f === WARDEN ? 64 : clamp(10 + Math.sqrt(F.w) * 4, 10, 44));
        b.save(); b.translate(lx | 0, (ly + 2) | 0); b.rotate(Math.sin(F.wob * 0.5) * 0.25 - 0.4); b.scale(-1, 1);
        b.drawImage(sp, -sp.width + 2, -sp.height / 2); b.restore();
      }
      if (N.lure.mode === "land" && N.landing && N.landing.weird) { const ws = weirdSprite(N.landing.weird.id); b.drawImage(ws, (lx - 8) | 0, (ly + 1) | 0); }
    }
    // the hut (and the haul sled heading for shore)
    if (N.haul) {
      const k = N.haul.t / N.haul.dur, far = k < 0.5 ? k * 2 : (1 - k) * 2;
      const sxp = lerp(cx0 - 10, BW * 0.12, far), syp = lerp(-4, -PLANE + 3, far), sc = lerp(1, 0.4, far);
      drawSled(sxp, syp, sc, k < 0.5);
    }
    drawHut(cx0, -6 + sink, tilt, N.haul || N.drill ? 0 : 1);
    if (N.drill) { const k = N.drill.t / N.drill.dur; b.fillStyle = "#ffffff"; for (let j = 0; j < 3; j++) b.fillRect(cx0 + 12 + rr(-3, 3), -8 - rr(0, 6), 1, 1); b.fillStyle = "#8a6a4a"; b.fillRect(cx0 + 12, -16 + Math.sin(k * 40), 1, 10); }
    // the bucket beside the hut
    if (!N.dunk && !N.haul) drawBucket(cx0 + 14, -6);
    // effects
    for (const f of N.fx) {
      if (f.k === "p") { b.fillStyle = f.c; b.fillRect(f.x | 0, f.y | 0, 1, 1); }
      else if (f.k === "puff") { b.globalAlpha = Math.min(0.6, f.life * 0.5); b.fillStyle = "#e8f6ff"; b.fillRect(f.x | 0, f.y | 0, 2, 1); b.fillRect((f.x + 1) | 0, (f.y - 1) | 0, 1, 1); b.globalAlpha = 1; }
      else if (f.k === "escape") { const sp = fishSprite(BYID[f.id], 10); b.globalAlpha = Math.min(1, f.life); b.save(); b.translate(f.x, f.y); if (f.vx < 0) b.scale(-1, 1); b.drawImage(sp, -sp.width / 2, -sp.height / 2); b.restore(); b.globalAlpha = 1; }
    }
  }
  function drawHut(x, y, tilt, lit) {
    b.save(); b.translate(x, y); b.rotate(tilt);
    // chimney smoke when the heater's in
    if (lv("heater") && N && !N.dunk) for (let k = 0; k < 4; k++) { const t = (simT * 0.5 + k / 4) % 1; b.globalAlpha = 0.35 * (1 - t); b.fillStyle = "#c8d4e0"; b.fillRect(7 + t * 6, -24 - t * 14, 2 + t * 2, 2); }
    b.globalAlpha = 1;
    b.fillStyle = "#3a2216"; b.fillRect(-11, -16, 22, 16);          // walls
    b.fillStyle = "#4e2e1c"; for (let k = -11; k < 11; k += 4) b.fillRect(k, -16, 1, 16); // planks
    b.fillStyle = "#e8f6ff"; b.beginPath(); b.moveTo(-14, -15); b.lineTo(0, -24); b.lineTo(14, -15); b.fill(); // snowy roof
    b.fillStyle = "#6a3a24"; b.fillRect(-13, -16, 26, 2);
    if (lv("heater")) { b.fillStyle = "#5a5a5a"; b.fillRect(6, -23, 3, 5); }
    // window and open door, glowing
    const fl = lit ? 0.85 + 0.15 * Math.sin(simT * 9) * Math.sin(simT * 3.1) : 0.4;
    b.fillStyle = `rgba(255,179,90,${fl})`; b.fillRect(-8, -12, 5, 4);
    b.fillStyle = "#3a2216"; b.fillRect(-6, -12, 1, 4);
    b.fillStyle = `rgba(255,150,60,${fl})`; b.fillRect(1, -11, 7, 11);
    // the fisher inside the door: orange hat, little rod
    if (lit) { b.fillStyle = "#1a1210"; b.fillRect(3, -7, 3, 7); b.fillStyle = "#ff7a2a"; b.fillRect(3, -9, 3, 2); b.fillStyle = "#c8a070"; b.fillRect(6, -5, 4, 1); }
    b.restore();
  }
  function drawBucket(x, y) {
    b.fillStyle = "#6a7a8a"; b.fillRect(x - 3, y - 5, 6, 5); b.fillStyle = "#8a9aaa"; b.fillRect(x - 3, y - 5, 6, 1);
    const n = Math.min(5, N.bucket.length);
    for (let k = 0; k < n; k++) { const f = BYID[N.bucket[N.bucket.length - 1 - k].id]; b.fillStyle = f.c1 || "#ffb35a"; b.fillRect(x - 2 + k, y - 7 - (k % 2), 1, 2); }
  }
  function drawSled(x, y, s, out) {
    b.save(); b.translate(x, y); b.scale(s * (out ? -1 : 1), s);
    b.fillStyle = "#8a4a2a"; b.fillRect(-6, -2, 10, 2); b.fillStyle = "#c8d4e0"; b.fillRect(-7, 0, 12, 1);
    if (out) { b.fillStyle = "#6a7a8a"; b.fillRect(-4, -6, 5, 4); }
    b.fillStyle = "#1a1210"; b.fillRect(6, -7, 3, 7); b.fillStyle = "#ff7a2a"; b.fillRect(6, -9, 3, 2);
    b.restore();
  }
  function drawOtter(x, y, k) {
    const bob = Math.sin(simT * 2 + k) > 0.6 ? -1 : 0;
    b.fillStyle = "#5a3a22"; b.fillRect(x - 2, y - 5 + bob, 4, 5); b.fillRect(x - 1, y - 7 + bob, 3, 2);
    b.fillStyle = "#c8a070"; b.fillRect(x - 1, y - 4 + bob, 2, 3);
    b.fillStyle = "#101010"; b.fillRect(x, y - 7 + bob, 1, 1);
  }
  function drawOverlay(cam) {
    const px = (wy) => (wy - cam) * PS;
    cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.textBaseline = "middle"; cx.textAlign = "left";
    // layer names at the seams
    for (const Ly of LAYERS) {
      const y = px(depthY(Ly.a)) + 10;
      if (y < 60 || y > H - (N.fight ? 150 : 90)) continue;
      cx.fillStyle = "#9ae6ff88"; cx.fillText(`${Ly.n} · ${Ly.a} m`, 8, y);
    }
    const lim = depthY(maxLine());
    if (px(lim) > 60 && px(lim) < H - 80) { cx.fillStyle = "#ffb35a66"; cx.fillRect(W / 2 - 40, px(lim), 80, 1); cx.textAlign = "center"; cx.fillText("end of your line", W / 2, px(lim) + 9); }
    // depth by the lure
    const L = N.lure, F = N.fight;
    if (L.m > 0.5 && !N.haul) {
      cx.textAlign = "left"; cx.fillStyle = "#e8f6ff"; cx.fillText(`${L.m.toFixed(0)} m`, W / 2 + 14, px(depthY(L.m)));
      if (L.mode === "wait") { cx.fillStyle = "#e8f6ffaa"; cx.fillText("…", W / 2 + 14, px(depthY(L.m)) + 12); }
    }
    for (const f of N.fx) {
      if (f.k === "bang") { cx.textAlign = "center"; cx.font = "800 26px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#ffb35a"; cx.fillText("!", W / 2 + 10, px(depthY(L.m)) - 18 - (0.7 - f.life) * 20); }
      if (f.k === "snap") { cx.textAlign = "center"; cx.font = "800 22px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#ff6a4a"; cx.fillText("SNAP", W / 2, H * 0.4); }
      if (f.k === "otter") { const k = f.i, ox = hx() + (k % 2 ? 1 : -1) * (30 + ((k / 2) | 0) * 22) + 5; cx.textAlign = "center"; cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#ffb35a"; cx.fillText(f.s, ox * PS, px(-20 - ((k / 2) | 0) * 6) - (1.6 - f.life) * 14); }
    }
    if (N.dunk && N.dunk.t > 0.4) { cx.textAlign = "center"; cx.font = "800 34px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#9ae6ff"; cx.globalAlpha = Math.min(1, (N.dunk.t - 0.4) * 3); cx.fillText("SPLOOSH", W / 2, H * 0.3); cx.globalAlpha = 1; }
    // the fight: big tension and stamina bars, just above the buttons (K-0062: bigger, with the danger zone in red)
    if (F) {
      const w = Math.min(340, W - 32), x = (W - w) / 2, y = H - 150;
      cx.fillStyle = "#0b1430e6"; cx.fillRect(x - 10, y - 30, w + 20, 92);
      cx.strokeStyle = "#9ae6ff44"; cx.lineWidth = 1; cx.strokeRect(x - 9.5, y - 29.5, w + 19, 91);
      cx.textAlign = "left"; cx.font = "800 13px ui-monospace, Menlo, Consolas, monospace"; cx.fillStyle = "#e8f6ff";
      cx.fillText(F.f === WARDEN ? "???" : F.f.n, x, y - 17);
      cx.textAlign = "right"; cx.fillText(`${F.d.toFixed(0)} m down`, x + w, y - 17);
      // tension: 0-45% safe, 45-75% careful, 75-100% the line can snap
      const ty = y - 4, th = 18;
      cx.fillStyle = "#ffffff14"; cx.fillRect(x, ty, w, th);
      cx.fillStyle = "#ffb35a2e"; cx.fillRect(x + w * 0.45, ty, w * 0.3, th);
      cx.fillStyle = "#ff3b3b55"; cx.fillRect(x + w * 0.75, ty, w * 0.25, th);
      const tc = F.ten > 0.75 ? "#ff5a4a" : F.ten > 0.45 ? "#ffb35a" : "#9ae6ff";
      cx.fillStyle = tc; cx.fillRect(x, ty + 3, w * Math.min(1, F.ten), th - 6);
      cx.fillStyle = "#ff5a4a"; cx.fillRect(x + w * 0.75, ty - 2, 2, th + 4);
      cx.font = "700 11px ui-monospace, Menlo, Consolas, monospace"; cx.textAlign = "left"; cx.fillStyle = "#e8f6ffcc";
      cx.fillText("line tension", x + 4, ty + th / 2);
      cx.textAlign = "right"; cx.fillStyle = "#ff8a7a"; cx.fillText("snap", x + w - 4, ty + th / 2);
      // stamina: empty it and the fish gives up
      const sy = ty + th + 8, sh = 12;
      cx.fillStyle = "#ffffff14"; cx.fillRect(x, sy, w, sh);
      cx.fillStyle = "#c5ff49"; cx.fillRect(x, sy, w * clamp(F.S / F.Smax, 0, 1), sh);
      cx.textAlign = "left"; cx.fillStyle = "#0b1430"; cx.font = "800 10px ui-monospace, Menlo, Consolas, monospace";
      if (F.S / F.Smax > 0.3) cx.fillText("fish stamina", x + 4, sy + sh / 2 + 1);
      else { cx.fillStyle = "#c5ff49"; cx.fillText("fish stamina", x + w * clamp(F.S / F.Smax, 0, 1) + 4, sy + sh / 2 + 1); }
      cx.textAlign = "center"; cx.font = "800 17px ui-monospace, Menlo, Consolas, monospace";
      if (F.warn || F.run) { cx.fillStyle = F.run ? "#ff6a4a" : "#ffb35a"; cx.fillText(F.run ? "it's running! let go" : "it's about to run…", W / 2, y - 46); }
      else if (F.S <= 0) { cx.fillStyle = "#c5ff49"; cx.fillText("it's tired. reel!", W / 2, y - 46); }
      else if (F.ten > 0.75) { cx.fillStyle = "#ff6a4a"; cx.fillText("too tight! let go a moment", W / 2, y - 46); }
    }
  }

  // ---------- ui ----------
  const toastBox = $("toast");
  function toast(s, cls) {
    const d = document.createElement("div"); d.textContent = s; if (cls) d.className = cls;
    toastBox.appendChild(d);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
    setTimeout(() => d.remove(), 3800);
  }
  const fmtClock = (k) => { const mins = 20 * 60 + k * 600, h = Math.floor(mins / 60) % 24, m = Math.floor(mins % 60); const h12 = h % 12 || 12; return `${h12}:${String(m - (m % 10)).padStart(2, "0")} ${h >= 12 && h < 24 ? "pm" : "am"}`; };
  function updHud() {
    $("hNight").textContent = N ? N.n : S.night;
    $("hClock").textContent = N ? fmtClock(clamp(N.t / N.len, 0, 1)) : "8:00 pm";
    $("hCash").textContent = Math.floor(S.cash);
    const lb = N ? N.bucket.reduce((s, f) => s + f.w, 0) : 0;
    $("hBucket").textContent = lb.toFixed(1);
    const ice = N ? 1 - N.c : 1;
    $("iceBar").firstElementChild.style.width = Math.round(ice * 100) + "%";
    $("iceScar").style.width = Math.round((N ? N.scar : 0) * 100) + "%";
    $("iceC").className = "chip" + (ice < 0.25 ? " bad" : ice < 0.55 ? " warn" : "");
    const live = N && state === "night" && !N.haul && !N.drill;
    const canAct = live && !N.fight && N.lure.mode !== "land";
    $("bHaul").hidden = !(canAct && N.bucket.length);
    $("haulS").textContent = lb.toFixed(1) + " lb · $" + (N ? N.bucket.reduce((s, f) => s + f.v, 0) : 0);
    $("bHaul").classList.toggle("hot", !!N && N.c > 0.55 && N.bucket.length > 0);
    $("bReel").hidden = !(canAct && (N.lure.mode === "wait" || N.lure.mode === "drop") && N.lure.m > 1);
    $("bHole").hidden = !(canAct && lv("auger"));
    let h = "";
    if (state === "night" && N) {
      const m = N.lure.mode;
      if (N.haul) h = "hauling the bucket to shore…";
      else if (N.drill) h = "drilling a fresh hole…";
      else if (N.fight) h = "hold to reel · let go when it runs";
      else if (m === "up") h = N.caught ? "hold to drop the line" : "hold anywhere to drop your line";
      else if (m === "drop") h = "let go to stop at this depth";
      else if (m === "wait") h = "waiting for a bite… hold to go deeper";
    }
    $("hint").textContent = h;
  }
  let catchT = 0;
  function showCatch(f, w, isNew, trophy) {
    const c = $("catch");
    c.innerHTML = `${isNew ? '<div class="new">new in the log</div>' : ""}<canvas width="80" height="32"></canvas><div class="nm">${f.n}</div><div class="wt">${f.weird ? "bycatch · a weird find, no fight" : w.toFixed(1) + " lb"}${trophy ? " · trophy!" : ""}</div><div class="ln">${f.t}</div>`;
    const g = c.querySelector("canvas").getContext("2d");
    g.imageSmoothingEnabled = false;
    const sp = f.weird ? weirdSprite(f.id) : fishSprite(f, f === WARDEN ? 64 : clamp(10 + Math.sqrt(w) * 4, 12, 44));
    const k = Math.min(78 / sp.width, 30 / sp.height);
    g.drawImage(sp, (80 - sp.width * k) / 2, (32 - sp.height * k) / 2, sp.width * k, sp.height * k);
    c.hidden = false;
    clearTimeout(catchT); catchT = setTimeout(() => (c.hidden = true), 3200);
  }
  function panel(id, html) {
    // nothing from the night shows through a panel (K-0062: a fading catch card sat behind the tip button)
    $("catch").hidden = true; clearTimeout(catchT); toastBox.textContent = "";
    const p = $(id); p.querySelector(".box").innerHTML = html; p.hidden = false;
  }

  // the coach: three one-time cards (first cast, first bite, first creak). The night waits while one is up.
  let coachOn = null;
  const COACH = {
    cast: ["drop your line", `<b>hold anywhere</b> (or space) and the line spools down. <b>let go</b> to stop at that depth and wait for a bite.<br>tonight your line reaches <b>${LINE_M[0]} m</b>: one short hold is enough. deeper water has bigger fish; the bait shop sells longer line.`],
    fight: ["a bite! the fight", `<b>hold to reel</b> the fish up. when it shouts <b class="r">it's running</b>, <b>let go</b>: reeling against a run fills the <b>tension</b> bar, and in the red zone the line snaps.<br>the green bar is the fish's <b>stamina</b>. every run tires it out. when it's empty, just reel.`],
    ice: ["the ice is talking", `every pound in your bucket loads the ice. watch the <b>ice</b> meter up top: it creaks, then groans, then breaks, and the bucket goes in the lake.<br><b>🛷 haul to shore</b> sells the bucket and lets the ice settle. or push your luck.`]
  };
  function coach(k) {
    if (coachOn || S.tut[k]) return;
    S.tut[k] = 1; save();
    coachOn = k; hold = false; holdPtr = null; keyHold = false;
    const [t, body] = COACH[k];
    $("coachBox").innerHTML = `<div class="ct">${t}</div><p>${body}</p><button class="go" id="cGo" type="button">got it</button>`;
    $("coach").hidden = false;
    $("cGo").onclick = coachDone;
    try { $("cGo").focus({ preventScroll: true }); } catch (e) { /* fine */ }
  }
  function coachDone() { if (!coachOn) return; coachOn = null; $("coach").hidden = true; hold = false; }
  function fishCanvasHTML(f, len) { return `<canvas class="pf" data-id="${f.id}" data-len="${len}" width="96" height="40" style="width:192px;height:80px;image-rendering:pixelated"></canvas>`; }
  function drawPanelFish() {
    document.querySelectorAll("canvas.pf").forEach((c) => {
      const f = BYID[c.dataset.id], g = c.getContext("2d"); g.imageSmoothingEnabled = false;
      const sp = f.weird ? weirdSprite(f.id) : fishSprite(f, +c.dataset.len), k = Math.min(c.width / sp.width, c.height / sp.height);
      g.drawImage(sp, (c.width - sp.width * k) / 2, (c.height - sp.height * k) / 2, sp.width * k, sp.height * k);
    });
  }

  // the bait shop
  const SAYS = [
    "welcome to the bait shop. ice is good tonight. don't get greedy: it groans before it breaks.",
    "back again. someone lost a lantern out there last winter. folks say it never went out.",
    "third night of the freeze. the old timers stay home tonight. you're not an old timer, huh?",
    "it's still down there, under the deep. it only bites after midnight, they say."
  ];
  function keeperSays() {
    if (S.arc.warden) return pick(["the lake's been calm since you let it go. the fish are biting, though.", "you look cold. buy something warm. or a longer line. i'm not your mom.", "a kid asked me if the lake has a monster. i said ask the fisher in the orange hat."]);
    return SAYS[Math.min(S.night - 1, 3)];
  }
  let awayNote = "";
  function openShop() {
    state = "shop"; N = null; hold = false;
    const ups = UPS.map((u) => {
      const l = lv(u.id), max = u.cost.length, done = l >= max, c = u.cost[Math.min(l, max - 1)];
      return `<div class="row"><div class="t"><div>${u.n} <span class="lv">${max > 1 ? `${l}/${max}` : done ? "owned" : ""}</span></div><div>${u.d(l)}</div></div><button type="button" data-buy="${u.id}" ${done || S.cash < c ? "disabled" : ""}>${done ? "done" : "$" + c}</button></div>`;
    }).join("");
    panel("shop", `<h2 class="warm">the bait shop</h2>
      <div class="keeper"><img src="/assets/mascot-happy.svg" alt="the shopkeeper, a beige crt with a green face"><div class="say">${awayNote || keeperSays()}</div></div>
      <div style="margin-bottom:8px">you have <b class="cash">$${Math.floor(S.cash)}</b></div>${ups}
      <button class="go" id="sGo" type="button">start night ${S.night}</button><br><button class="alt" id="sLog" type="button">📖 fish log</button>`);
    awayNote = "";
    $("sGo").onclick = () => { $("shop").hidden = true; startNight(); };
    $("sLog").onclick = () => openLog(true);
    $("shopBox").querySelectorAll("[data-buy]").forEach((bt) => (bt.onclick = () => buy(bt.dataset.buy)));
  }
  function buy(id) {
    const u = UPS.find((x) => x.id === id), l = lv(id);
    if (l >= u.cost.length || S.cash < u.cost[l]) return;
    S.cash -= u.cost[l]; S.up[id] = l + 1;
    if (id === "otter") ach("otter");
    sdk((c) => c.event && c.event("buy", { id, lv: l + 1 }));
    save(); openShop();
  }
  function openLog(fromShop) {
    const n = Object.keys(S.log).length;
    let h = `<h2>fish log</h2><div class="muted" style="opacity:.75">${n}/${FISH.length + WEIRD.length + 1} found · heaviest ever ${S.best ? S.best.toFixed(1) + " lb" : "none yet"}</div>`;
    LAYERS.forEach((Ly, i) => {
      h += `<div class="lyr">${Ly.n} · ${Ly.a}-${Ly.b} m</div><div class="grid">`;
      for (const f of FISH.concat(i === 4 ? [WARDEN] : []).filter((f) => f.L === i)) {
        const e = S.log[f.id];
        h += `<div class="${e ? "" : "no"}">${e ? fishCanvasHTML(f, 30).replace('width="96" height="40" style="width:192px;height:80px', 'width="60" height="24" style="') : ""}<b>${e ? f.n : "???"}</b><span>${e ? `best ${e.best.toFixed(1)} lb · ×${e.n}<br>${f.t}` : "still out there"}</span></div>`;
      }
      h += "</div>";
    });
    h += `<div class="lyr">weird finds</div><div class="grid">`;
    for (const f of WEIRD) { const e = S.log[f.id]; h += `<div class="${e ? "" : "no"}">${e ? fishCanvasHTML(f, 0).replace('width="96" height="40" style="width:192px;height:80px', 'width="32" height="16" style="') : ""}<b>${e ? f.n : "???"}</b><span>${e ? f.t : "somewhere in the " + LAYERS[f.L].n}</span></div>`; }
    h += `</div><button class="go" id="lGo" type="button">${fromShop ? "back to the shop" : "back to the ice"}</button>`;
    panel("log", h);
    drawPanelFish();
    $("lGo").onclick = () => { $("log").hidden = true; };
  }
  $("logBtn").onclick = () => openLog(state === "shop");
  $("bHaul").onclick = haul;
  $("bReel").onclick = () => { if (N && (N.lure.mode === "wait" || N.lure.mode === "drop")) N.lure.mode = "reel"; };
  $("bHole").onclick = drill;

  // ---------- input: hold anywhere on the lake (and Space / Enter) ----------
  let holdPtr = null;
  cv.addEventListener("pointerdown", (e) => {
    if (state !== "night" || e.button > 0) return;
    holdPtr = e.pointerId; hold = true;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    loopsOn();
  });
  const release = (e) => { if (e.pointerId === holdPtr) { holdPtr = null; hold = false; } };
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", release);
  cv.addEventListener("lostpointercapture", release);
  cv.addEventListener("contextmenu", (e) => e.preventDefault());
  let keyHold = false;
  addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (state === "title" && (k === "enter" || k === " ")) { e.preventDefault(); begin(); return; }
    if (coachOn) { if (k === "enter" || k === " ") { e.preventDefault(); if (!e.repeat) coachDone(); } return; }
    if (k === "m") setMute(!muted);
    if (state !== "night") return;
    if (k === " " || k === "enter") { e.preventDefault(); if (!e.repeat) { keyHold = true; hold = true; } }
    else if (k === "h") haul();
    else if (k === "r") $("bReel").onclick();
    else if (k === "n") drill();
    else if (k === "l") openLog(false);
  });
  addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); if ((k === " " || k === "enter") && keyHold) { keyHold = false; hold = holdPtr != null; } });
  addEventListener("blur", () => { hold = false; holdPtr = null; keyHold = false; });
  addEventListener("message", (e) => {
    const d = e.data || {};
    if (d.type === "cc-mute") setMute(!!d.muted);
    else if (d.type === "cc-pause") paused = typeof d.paused === "boolean" ? d.paused : !paused;
  });

  // ---------- start ----------
  let paused = false;
  function begin() {
    $("title").hidden = true;
    // otters fished while you were away (two hours at most)
    if (lv("otter") && S.seen) {
      const mins = Math.min(120, (Date.now() - S.seen) / 60000);
      const got = Math.floor(mins * lv("otter") * 0.8);
      if (got >= 5) { S.cash += got; awayNote = `your otters kept fishing while you were gone. they sold $${got} of perch. they want a raise.`; }
    }
    if (T_DUNK) { // night 1, an hour in, a heavy bucket, the ice at its last groan
      S.night = 1; startNight();
      N.t = 60; N.c = 0.8; N.warned = 2;
      N.bucket = [{ id: "pike", w: 7.4, v: 22 }, { id: "bass", w: 4.1, v: 12 }, { id: "perch", w: 1.2, v: 2 }, { id: "bluegill", w: 0.9, v: 2 }, { id: "crappie", w: 1.8, v: 4 }];
      toast("test: heavy bucket, the ice is about to go. keep fishing (or haul).", "bad");
      return;
    }
    if (TEST) {
      S.night = 3; S.cash = Math.max(S.cash, 500); S.up = Object.assign({ line: 3, reel: 2, lantern: 1 }, S.up); startNight();
      if (T_WARDEN) { N.t = N.len * 0.5; N.lure.m = 42; N.biteT = 1.5; N.forceWarden = true; toast("test: under the deep after midnight. the warden bites next.", "warm"); }
      return;
    }
    if (S.night === 1 && !Object.keys(S.log).length) startNight(); else openShop();
  }
  $("start").onclick = begin;
  addEventListener("resize", resize);
  resize();
  camY = surfCam();
  // the cover / clip: a big pike on the line under the aurora, otters out, the ice cracking
  function scene(grow) {
    SHOT = true;
    ["hud", "acts", "hint", "toast", "title", "shop", "end", "log", "catch"].forEach((id) => ($(id).style.display = "none"));
    S = freshS(); S.night = 3; S.up = { line: 2, lantern: 2, heater: 1, otter: 2 };
    startNight();
    N.t = 120; N.c = grow ? 0.25 : 0.62; N.grow = !!grow;
    N.bucket = [{ id: "walleye", w: 6, v: 36 }, { id: "perch", w: 1, v: 3 }, { id: "laketrout", w: 14, v: 112 }];
    N.lure = { m: 8, mode: "fight" };
    N.fight = { f: BYID.pike, w: 19, d: 8, S: 9, Smax: 20, ten: 0.62, run: true, warn: false, ph: 1e9, wob: 0 };
    for (let k = 0; k < 7; k++) { const f = pick(FISH.filter((x) => x.L <= 2)); N.amb.push({ f, m: rr(LAYERS[f.L].a + 1, LAYERS[f.L].b - 1), x: rr(10, BW - 10), v: (R() < 0.5 ? -1 : 1) * rr(3, 6), len: clamp(Math.round(8 + Math.sqrt(f.w[1]) * 3), 7, 22) }); }
    camY = surfCam() + Math.round(BH * 0.08);
  }
  if (qs.get("shot") === "1") setTimeout(() => scene(false), 0);
  if (window.cc && cc.autostart && cc.autostart()) begin();

  const STEP = 1 / 60;
  let last = performance.now(), acc = 0, hudT = 0;
  function frame(t) {
    const raw = Math.min(0.25, Math.max(0, (t - last) / 1000)); last = t;
    if (!paused && !document.hidden) {
      acc += raw;
      let n = 0;
      while (acc >= STEP && n < 20) { sim(STEP); acc -= STEP; n++; }
      if (n >= 20) acc = 0;
    }
    draw(paused ? 0 : raw);
    hudT -= raw;
    if (hudT <= 0) { hudT = 0.15; updHud(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  addEventListener("pagehide", () => { if (state === "night" && N) save(); });

  // test hook
  window.__ti = {
    state: () => ({ state, night: N ? N.n : S.night, t: N ? +N.t.toFixed(1) : 0, len: N ? N.len : 0, mode: N ? N.lure.mode : null, m: N ? +N.lure.m.toFixed(1) : 0, c: N ? +N.c.toFixed(3) : 0, bucket: N ? N.bucket.length : 0, lb: N ? +N.bucket.reduce((q, f) => q + f.w, 0).toFixed(1) : 0, cash: S.cash, caught: N ? N.caught : 0, fight: N && N.fight ? { id: N.fight.f.id, d: +N.fight.d.toFixed(1), ten: +N.fight.ten.toFixed(2), S: +N.fight.S.toFixed(1), run: N.fight.run } : null, log: Object.keys(S.log).length, up: S.up }),
    hold: (v) => { hold = !!v; },
    ff: (sec, fn) => { for (let k = 0; k < sec * 60; k++) { if (fn) fn(); sim(STEP); } },
    give: (n) => { S.cash += n; },
    begin, startNight, openShop, haul, drill, buy,
    crack: (v) => { if (N) N.c = v; },
    coach: () => coachOn, coachDone, scar: () => (N ? N.scar : 0),
    bite: () => { if (N) { N.lure.m = Math.max(N.lure.m, 3); bite(); } },
    S: () => S,
    clip: () => scene(true)
  };
})();
