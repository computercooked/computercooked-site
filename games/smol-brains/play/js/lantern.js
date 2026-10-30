// smol brains — the opening film, "The Last Lantern" (K-0041 P1). The smols live on the back of the Hollow, a
// giant who sleeps. Long ago they lit a Lantern to remember who they are; it's going out, and their memories with it.
// Pip climbs the hill with the last berry, trips, and the berry rolls into the flame with a wish: "somebody…
// remember us." The flame bursts, and its last spark (you) rises into the sky. Then the camera drops onto the
// island and you have control. All pixel art drawn in code at 320×180, captions in smol-speak with subtitles.
// First view on a device: no skip (it's the why of the whole game). After that, or with ?cctest=1: skip any time.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var L = SB.Lantern = {};
  var W = 320, H = 180;
  L.KEY = "smolbrains-lantern";
  L.DUR = 52; // after the ark film (intro.js, 22 s), then the camera drop onto the island (ui.js landing, 5.5 s): control at about 80 s

  L.LINES = [
    { at: 0.6, smol: "hollo… hollo mumu.", sub: "below, on the back of the Hollow, a giant who sleeps, live smols who forget a little more every night." },
    { at: 5.4, smol: "pip-a? mo… mo'pi?", sub: "what they were doing. where they put the berry." },
    { at: 9.6, smol: "lumi! lumi vesh.", sub: "long ago they lit a Lantern on the hill, so they would remember who they are." },
    { at: 14.6, smol: "pip-pod?!", sub: "then the pod fell out of the sky." },
    { at: 18.4, smol: "lumi… lumi nua!", sub: "it hit the hill. the Lantern guttered, nearly out, and as it fades, so do the smols." },
    { at: 22.6, smol: "pip! pip go go!", sub: "Pip, the smallest of them, runs up the hill with the last berry of the day." },
    { at: 28.4, smol: "GRUMPA! shoo! shoo!", sub: "a grump: a smol whose light went out. grumps hunt the light." },
    { at: 33.4, smol: "wa—!", sub: "" },
    { at: 36.5, smol: "mo'pi… nua zo'mi.", sub: "“somebody… remember us.”" },
    { at: 43.4, smol: "", sub: "the wish lifts the Lantern's last spark into the sky." },
    { at: 46.6, smol: "", sub: "you are that spark. watch over them. lend them your light." }
  ];

  L.WARP = [[0, 14, 1.45], [22, 36, 1.5], [43, 52, 1.35]]; // [story from, to, speed]
  L.warp = function (r) { // real seconds into the opening → story seconds
    var st = 0, segs = L.WARP;
    for (var i = 0; i < segs.length; i++) {
      var a = segs[i][0], b = segs[i][1], k = segs[i][2];
      if (r <= a - st) return st + r;
      r -= a - st;
      if (r <= (b - a) / k) return a + r * k;
      r -= (b - a) / k; st = b;
    }
    return st + r;
  };
  L.realDur = function () { var r = 0, segs = L.WARP, st = 0; segs.forEach(function (s) { r += s[0] - st + (s[1] - s[0]) / s[2]; st = s[1]; }); return r + L.DUR - st; };
  L.DAWN_DUR = 20;
  L.DAWN = [
    { at: 0.5, smol: "lumi… lumi!", sub: "dawn. Pip made it through the night." },
    { at: 5.2, smol: "", sub: "a memory comes back: fire. light keeps the dark away." },
    { at: 10.2, smol: "", sub: "it flies to the Lantern: the first memory ember. the flame grows a little." },
    { at: 15, smol: "pip-a vesh!", sub: "Pip remembers. and what one smol remembers, the others can learn." }
  ];
  L.STAGE1_DUR = 24;
  L.STAGE1 = [
    { at: 0.5, smol: "lumi… lumi-a!", sub: "the smols have remembered enough: five memory embers." },
    { at: 5.4, smol: "", sub: "they fly up the hill, one after another, into the Lantern." },
    { at: 11, smol: "LUMI!", sub: "the Lantern catches. its light rolls down over the whole Hollow." },
    { at: 16.6, smol: "hollo… mm.", sub: "and under the island, the giant breathes in, as if it remembered something too." }
  ];
  L.STAGE2 = [
    { at: 0.5, smol: "lumi-a! lumi-a!", sub: "fifteen memories." },
    { at: 5.4, smol: "", sub: "the embers fly up the hill, and the Lantern burns higher." },
    { at: 11, smol: "LUMI!", sub: "its light reaches the edges of the island now." },
    { at: 16.6, smol: "hollo… mm?", sub: "under the island, the giant stirs in its sleep." }
  ];
  L.STAGE3 = [
    { at: 0.5, smol: "lumi vesh!", sub: "thirty memories." },
    { at: 5.4, smol: "", sub: "more embers than the smols can count." },
    { at: 11, smol: "LUMI!", sub: "the Lantern blazes. the night can barely touch the island." },
    { at: 16.6, smol: "HOLLO.", sub: "under the island, the giant's eye opens. just a crack." },
    { at: 22.4, smol: "lumi-nest!", sub: "and the nest glows with the Lantern's light now. grumps won't come near it." }
  ];
  L.SCENES = {
    dawn: { dur: L.DAWN_DUR, lines: L.DAWN, name: "dawn: the first ember" },
    stage1: { dur: L.STAGE1_DUR, lines: L.STAGE1, stage: 1, name: "the Lantern: stage 1" },
    stage2: { dur: L.STAGE1_DUR, lines: L.STAGE2, stage: 2, name: "the Lantern: stage 2" },
    stage3: { dur: 28, lines: L.STAGE3, stage: 3, name: "the Lantern: stage 3" },
    lend: { dur: 11, name: "lend your light", lines: [
      { at: 0.4, smol: "pip… pip-a?", sub: "Pip is frozen. something is watching from the dark." },
      { at: 2.8, smol: "", sub: "your light can't touch the world. but it can lend itself." },
      { at: 5.6, smol: "LUMI!", sub: "for a while, you are Pip." }] },
    baby: { dur: 12, name: "the first baby", lines: [
      { at: 0.5, smol: "mo? mo-mo!", sub: "an egg, nearly ready." },
      { at: 5.6, smol: "pip-pa!", sub: "a new smol." },
      { at: 8.4, smol: "", sub: "born remembering a little more than its parents did." }] },
    grump: { dur: 14, name: "the first grump", lines: [
      { at: 0.5, smol: "mo'pi…?", sub: "a smol, alone in the dark, far from any fire." },
      { at: 5, smol: "", sub: "its light flickers. it can't remember the way back." },
      { at: 9.6, smol: "GRUMPA.", sub: "its light went out. a grump: all it remembers is that it wants the light." }] },
    growup: { dur: 13, name: "Pip grows up", lines: [
      { at: 0.5, smol: "pip! pip-a!", sub: "Pip, the smallest smol, who made the wish." },
      { at: 4.5, smol: "", sub: "isn't the smallest anymore." },
      { at: 8, smol: "pip vesh lumi.", sub: "Pip has a little one now, and tells it about the Lantern." }] },
    wake: { dur: 42, name: "the Hollow wakes", lines: [
      { at: 0.5, smol: "lumi… LUMI!", sub: "fifty memories. the Lantern burns as bright as it did long ago." },
      { at: 7, smol: "", sub: "its light runs down the hill and over the whole back of the Hollow…" },
      { at: 14, smol: "hollo…?", sub: "…and the giant who sleeps beneath them opens its eye." },
      { at: 22, smol: "grumpa… mo?", sub: "in the light, the grumps remember their names." },
      { at: 29, smol: "pip-a vesh. zo'mi vesh.", sub: "the smols remember who they are. and so does the Hollow." },
      { at: 35.5, smol: "", sub: "thank you for lending them your light." }] }
  };
  // a story film, once per island, when nothing else is on screen (not while you're in a body, not during the first night)
  L.queue = [];
  L.moment = function (game, id, opts) {
    if (!game || !L.SCENES[id]) return false;
    var l = game.lantern || (game.lantern = { embers: 0, stage: 0, got: {}, log: [] });
    l.films = l.films || {};
    if (l.films[id]) return false;
    l.films[id] = 1;
    if (game.headless || game.offline || typeof document === "undefined" || !document.createElement || (SB.Possess && SB.Possess.headless)) return true;
    L.queue.push({ id: id, opts: opts || {} });
    pump();
    return true;
  };
  function pump() {
    if (!L.queue.length || L.running || L.waiting) return;
    var g = SB.Game && SB.Game.current;
    var busy = (SB.Possess && SB.Possess.active) || (SB.Intro && SB.Intro.covering) || (g && SB.FirstNight && SB.FirstNight.active(g)) || (typeof document !== "undefined" && document.querySelector && document.querySelector(".modal-wrap"));
    if (busy) { L.waiting = setTimeout(function () { L.waiting = null; pump(); }, 2000); return; }
    var m = L.queue.shift();
    L.play({ scene: m.id, noGate: true, col: m.opts.col, done: function () { if (m.opts.done) try { m.opts.done(); } catch (e) {} setTimeout(pump, 1500); } });
  }
  L.pump = pump;
  function store() { try { return window.localStorage; } catch (e) { return null; } }
  L.seen = function () { var s = store(); try { return !!(s && s.getItem(L.KEY)); } catch (e) { return false; } };
  L.markSeen = function () { var s = store(); try { if (s) s.setItem(L.KEY, "1"); } catch (e) {} };
  // which opening a new island gets: the film the first time on this device (even from "play now": it's the why
  // of the game), then only when you asked for the story (create world). an island you load never replays it
  L.shouldPlay = function (game, quick, auto) {
    if (!game || game.ngPlus) return false;
    if (!L.seen() || SB.TEST) return true; // playtests always get it (K-0051: "the opening film never played"); skippable there
    return !quick && !auto;
  };
  L.skippable = function () { return L.seen() || !!SB.TEST; };

  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6d2b79f5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function mix(c1, c2, k) { // "#rrggbb" blend
    var a = parseInt(c1.slice(1), 16), b = parseInt(c2.slice(1), 16), o = "#";
    [16, 8, 0].forEach(function (s) { var v = Math.round(lerp((a >> s) & 255, (b >> s) & 255, Math.max(0, Math.min(1, k)))); o += (v < 16 ? "0" : "") + v.toString(16); });
    return o;
  }

  L.play = function (opts) {
    opts = opts || {};
    var SC = opts.scene ? L.SCENES[opts.scene] : null, short = !!SC, dawnScene = opts.scene === "dawn", stageN = SC && SC.stage || 0;
    var LINES = SC ? SC.lines : L.LINES, DUR = SC ? SC.dur : L.DUR;
    var root = document.getElementById("ui") || document.body;
    var wrap = document.createElement("div"); wrap.className = "intro live lantern";
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.className = "introcv";
    var cap = document.createElement("div"); cap.className = "introcap";
    var smolEl = document.createElement("div"); smolEl.className = "smol";
    var subEl = document.createElement("div"); subEl.className = "sub";
    cap.appendChild(smolEl); cap.appendChild(subEl);
    var canSkip = short || L.skippable(); // the story films after the opening can always be skipped
    var skip = document.createElement("button"); skip.className = "introskip"; skip.textContent = "skip ▸";
    var gate = document.createElement("div"); gate.className = "introgate";
    gate.innerHTML = '<h1>the last<br><span>lantern</span></h1><p>▶ tap to begin</p>';
    wrap.appendChild(cv); wrap.appendChild(cap); if (canSkip) wrap.appendChild(skip); wrap.appendChild(gate);
    root.appendChild(wrap);
    if (SB.Intro) SB.Intro.covering = true;
    L.running = true;
    if (SB.UI && SB.UI.holdForFilm) try { SB.UI.holdForFilm(); } catch (e) {} // an open window steps aside (K-0048)
    var started = false, done = false, t0 = performance.now(), lastF = 0, lineI = -1, typed = 0, cur = null;
    gate.onclick = function (e) { if (e && e.stopPropagation) e.stopPropagation(); if (started) return; started = true; if (SB.Music && SB.Music.play) try { SB.Music.play(short ? "firstlight" : "bigthought"); } catch (er) {} gate.classList.add("out"); setTimeout(function () { gate.remove(); }, 600); t0 = performance.now(); requestAnimationFrame(frame); };
    function finish() {
      if (done) return;
      done = true; L.running = false;
      if (!short) L.markSeen();
      if (SB.Intro) SB.Intro.covering = false;
      wrap.classList.add("out");
      setTimeout(function () { wrap.remove(); }, 700);
      document.removeEventListener("keydown", key, true);
      if (SB.Music && SB.Music.now && SB.Music.now() && SB.Music.now().id === "bigthought" && SB.Music.skip) SB.Music.skip();
      if (opts.done) opts.done();
    }
    function key(e) {
      if (e.key !== "Escape" && e.key !== " " && e.key !== "Enter") return;
      e.preventDefault(); e.stopPropagation();
      if (!started) gate.onclick(e); else if (canSkip) finish();
    }
    skip.onclick = function (e) { e.stopPropagation(); finish(); };
    document.addEventListener("keydown", key, true);

    var ctx = cv.getContext("2d"), r = rng(41), fired = {}, bits = [], shake = 0;
    var stars = [];
    for (var i = 0; i < 160; i++) stars.push({ x: r() * W, y: r() * H * 3, z: 0.3 + r() * r() * 1.5, c: r() < 0.12 ? "#b59aff" : r() < 0.25 ? "#ffd84a" : "#ffffff" });
    // the smols on the giant's back: each walks its own little circle and keeps losing its berry
    var smols = [];
    for (i = 0; i < 10; i++) smols.push({ x: 70 + i * 44 + r() * 20, ph: r() * 6.28, col: ["#8fe6dc", "#ffd84a", "#ff9fd0", "#b59aff", "#ff9f43"][i % 5], cyc: 4.5 + r() * 3 });
    function sfx(name, v) { if (SB.Audio && SB.Audio.play) try { SB.Audio.play(name, { vol: v == null ? 1 : v }); } catch (e) {} }
    function once(k, name, v, sh) { if (fired[k]) return; fired[k] = 1; sfx(name, v); if (sh) shake = Math.max(shake, sh); }
    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function oval(cx, cy, rx, ry, c) { ctx.fillStyle = c; for (var y = -ry; y <= ry; y++) { var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1); } }
    function glow(x, y, rad, col, a) { if (a <= 0.01) return; ctx.globalAlpha = a * 0.18; for (var k = 3; k >= 1; k--) oval(x, y, Math.round(rad * k / 3), Math.round(rad * k / 3), col); ctx.globalAlpha = 1; }
    function text(s, x, y, size, col, a) { ctx.globalAlpha = Math.max(0, Math.min(1, a == null ? 1 : a)); ctx.fillStyle = "#000"; ctx.font = "bold " + size + "px monospace"; ctx.textAlign = "center"; ctx.fillText(s, x + 1, y + 1); ctx.fillStyle = col; ctx.fillText(s, x, y); ctx.globalAlpha = 1; }
    function boom(x, y, n, sz, pal) { for (var k = 0; k < n; k++) { var a = r() * 6.283, s = (0.3 + r()) * sz; bits.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + r() * 1.2, t: 0, c: pal[Math.floor(r() * pal.length)], w: r() < 0.3 ? 2 : 1 }); } }
    var GLOW = ["#ffffff", "#ffd84a", "#ffb347", "#fff6c0"];
    // a smol: a round blob with eyes, a glow around it as bright as the Lantern lets it be
    function smol(x, y, col, lit, s, face) {
      s = s || 1; face = face == null ? 1 : face;
      glow(x, y - 1 * s, 7 * s, col, lit);
      oval(x, y, 3 * s, 2 * s, "#14101c"); oval(x, y, 3 * s - 1, 2 * s - 1, col);
      px(x + face * s - (s > 1 ? 1 : 0), y - s, s, s, "#14101c"); px(x + face * 2 * s, y - s, s, s, "#14101c");
    }
    function grump(x, y, s, eyes) {
      oval(x, y, 7 * s, 5 * s, "#140c1c"); oval(x, y - 1, 6 * s, 4 * s, "#2a1838");
      for (var k = 0; k < 4; k++) px(x - 6 * s + k * 4 * s, y - 6 * s, s, 2 * s, "#140c1c");
      if (eyes) { px(x - 3 * s, y - 2 * s, 2 * s, s, "#ff3b4f"); px(x + 2 * s, y - 2 * s, 2 * s, s, "#ff3b4f"); }
    }
    // the giant's back: a long breathing ridge; the Lantern's hill stands up near the end of it
    var LX = 520;
    function ground(xw, t) { return 128 - 14 * Math.sin(Math.min(1, Math.max(0, xw / 600)) * Math.PI) - 34 * Math.exp(-Math.pow((xw - LX) / 46, 2)) + Math.sin(t * 0.55) * 1.5; }
    function lanternLight(t) {
      if (t < 17.5) return 0.85 + Math.sin(t * 7) * 0.05;
      if (t < 22) return 0.16 + Math.abs(Math.sin(t * 9)) * 0.14; // knocked down by the pod: nearly out
      if (t < 34.8) return 0.25 + Math.sin(t * 11) * 0.06;
      if (t < 43) return 0.3 + Math.min(1, Math.max(0, t - 34.8)) * 0.25 + Math.sin(t * 13) * 0.08;
      return 1.2;
    }
    function lantern(sx, gy, t, lit) {
      px(sx - 1, gy - 26, 2, 26, "#3a2a33");
      px(sx - 5, gy - 36, 10, 1, "#7a6248"); px(sx - 5, gy - 26, 10, 1, "#7a6248"); px(sx - 5, gy - 36, 1, 10, "#7a6248"); px(sx + 4, gy - 36, 1, 10, "#7a6248");
      glow(sx, gy - 31, Math.round(16 + lit * 26), "#ffd84a", Math.min(1, lit));
      var fh = Math.max(1, Math.round(2 + lit * 4 + Math.sin(t * 17) * 1)); oval(sx, gy - 30 - (fh >> 1), Math.max(1, Math.round(1 + lit * 2)), fh, "#ff9f43");
      oval(sx, gy - 30 - (fh >> 1), 1, Math.max(1, fh - 2), "#fff6c0");
    }
    // the pod hits the Lantern's hill, close up: it buries itself in the slope, the post tilts, the flame gutters
    function closeCrash(ct) {
      if (!fired.crash) { once("crash", "bigboom", 0.8, 6); boom(150, 104, 50, 90, ["#ffffff", "#ffd84a", "#ff9f43", "#8fe6dc"]); }
      sky(ct, 0.55);
      for (var xs = 0; xs < W; xs += 2) { var gy = Math.round(150 - xs * 0.25); px(xs, gy, 2, H - gy, "#251d36"); px(xs, gy, 2, 3, "#4f8a52"); } // the hill's slope, rising to the Lantern
      // the Lantern, knocked crooked, top right
      ctx.save(); ctx.translate(248, 90); ctx.rotate(0.22 + Math.sin(ct * 18) * 0.01 * Math.max(0, 1 - ct));
      px(-3, -44, 6, 46, "#3a2a33"); px(-14, -72, 28, 3, "#7a6248"); px(-14, -46, 28, 3, "#7a6248"); px(-14, -72, 3, 28, "#7a6248"); px(11, -72, 3, 28, "#7a6248");
      var fl = ct < 1.2 ? 1 - ct * 0.6 : 0.25 + Math.abs(Math.sin(ct * 11)) * 0.2;
      glow(0, -58, Math.round(18 + fl * 40), "#ffd84a", fl); var fh = Math.max(2, Math.round(4 + fl * 12)); oval(0, -54 - (fh >> 1), Math.max(2, Math.round(2 + fl * 5)), fh, "#ff9f43"); oval(0, -54 - (fh >> 1), 1, Math.max(1, fh - 4), "#fff6c0");
      ctx.restore();
      // the pod, big, nose-first in the slope: dark hull, a teal window, cracks of light
      ctx.save(); ctx.translate(150, 110); ctx.rotate(-0.55);
      oval(0, 0, 30, 18, "#140c1c"); oval(0, -2, 27, 15, "#2a2238"); oval(8, -4, 9, 7, "#8fe6dc"); oval(10, -6, 3, 2, "#e8fffb");
      px(-20, -2, 14, 2, "#4a3d66"); px(-26, 4, 10, 2, "#4a3d66");
      if (Math.sin(ct * 13) > 0) { px(-6, 8, 2, 7, "#ffd84a"); px(-4, 14, 4, 2, "#ffd84a"); }
      ctx.restore();
      oval(128, 118, 16, 4, "#1a1424"); oval(172, 108, 14, 4, "#1a1424"); // the earth it threw up
      if (Math.random() < 0.6) bits.push({ x: 120 + Math.random() * 50, y: 100, vx: (Math.random() - 0.5) * 6, vy: -12 - Math.random() * 10, life: 1.6, t: 0, c: Math.random() < 0.5 ? "#5a5266" : "#3a3446", w: 3 });
      if (ct < 0.3) { ctx.fillStyle = "rgba(255,246,192," + (0.9 - ct * 3) + ")"; ctx.fillRect(0, 0, W, H); }
    }
    function sky(t, k) { // dusk gradient, darkening with k (0 dusk .. 1 night)
      for (var y = 0; y < H; y += 4) { var f = y / H; ctx.fillStyle = mix(mix("#3a2a5e", "#ff9f6a", f * f), mix("#0b0918", "#1d1636", f), k); ctx.fillRect(0, y, W, 4); }
    }

    // the dawn: Pip, glowing again by the hill; an ember rises off Pip and flies into the Lantern, and it grows
    function sceneDawn(t) {
      sky(t, Math.max(0.05, 0.75 - t / 14));
      var camX = 360, lit = t < 9.5 ? 0.3 + Math.sin(t * 9) * 0.05 : 0.3 + ease((t - 9.5) / 2.5) * 0.5;
      for (var xs = 0; xs < W; xs += 2) { var gy = ground(xs + camX, t); px(xs, gy, 2, H - gy, "#2b2440"); px(xs, gy, 2, 2, "#4f8a52"); }
      var lsx = LX - camX, lgy = ground(LX, t);
      lantern(lsx, lgy, t, lit);
      smols.forEach(function (s) { var x = s.x + Math.cos(t * 0.6 + s.ph) * 5, sx = x - camX; if (sx < -10 || sx > W + 10) return; smol(sx, ground(x, t) - 4, s.col, Math.min(1, 0.4 + t / 12), 2, 1); });
      var pipX = 120, pipY = ground(pipX + camX, t) - 4;
      smol(pipX, pipY - Math.abs(Math.sin(t * 3)) * 2, "#c5ff49", Math.min(1, 0.5 + t / 6), 2, 1); px(pipX - 1, pipY - 10, 3, 2, "#8fd13a");
      if (t > 5 && t < 10.5) { // the ember's flight
        var k = ease((t - 5) / 5), ex = lerp(pipX, lsx, k), ey = lerp(pipY - 8, lgy - 31, k) - Math.sin(k * Math.PI) * 40;
        glow(ex, ey, 9, "#ffb347", 1); px(ex - 1, ey - 1, 3, 3, "#fff6c0");
        if (Math.random() < 0.7) bits.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 6, vy: 6 + Math.random() * 6, life: 0.5, t: 0, c: GLOW[Math.floor(Math.random() * 4)], w: 1 });
      }
      if (t > 10.5) { once("emberin", "achievement", 0.7, 1); if (!fired.burst2) { fired.burst2 = 1; boom(lsx, lgy - 31, 26, 50, GLOW); } }
      if (t > 13) text("1 memory ember", W / 2, 24, 10, "#ffd84a", ease((t - 13) / 1));
      if (t > DUR - 1.2) { ctx.fillStyle = "rgba(255,255,255," + Math.min(1, (t - DUR + 1.2) / 1.2) + ")"; ctx.fillRect(0, 0, W, H); }
    }
    // stage 1: embers stream up from the smols into the Lantern; it catches, its light rolls down over the Hollow,
    // and the giant breathes in. drawn at the same 320×180 as the opening
    function sceneStage(t, n) {
      var wash = t < 11 ? 0 : ease((t - 11) / 4);
      sky(t, Math.max(0, 0.8 - wash * 0.75));
      stars.forEach(function (s) { if (s.y < H) { ctx.globalAlpha = 0.6 * (1 - wash) * s.z; px(s.x, s.y * 0.6, 1, 1, s.c); } }); ctx.globalAlpha = 1;
      var camX = t < 14.5 ? 300 : lerp(300, 0, ease((t - 14.5) / 3)), breath = t > 17 ? Math.sin((t - 17) * 1.4) * 3 : 0;
      function gr(x) { return ground(x, t) - Math.max(0, breath) * (1 - Math.min(1, Math.abs(x - 70) / 300)); }
      var hx = 70 - camX, hy = gr(70);
      if (hx > -90) { oval(hx, hy + 4, 60, 44, "#1e1830"); oval(hx + 2, hy + 2, 56, 40, mix("#2e2440", "#4a3d66", wash)); for (var k = 0; k < 24; k++) px(hx + 14 + k, hy - 12 + Math.round(Math.pow((k - 12) / 12, 2) * (t > 18.5 && t < 19.3 ? 2 : 5)), 1, 1, t > 18.5 && t < 19.3 ? "#ffd84a" : "#4a3d66"); }
      for (var xs = 0; xs < W; xs += 2) { var gx = xs + camX, gy = gr(gx), near = Math.max(0, 1 - Math.abs(gx - LX) / (40 + wash * 600)); px(xs, gy, 2, H - gy, mix("#251d36", "#3a2f52", near * wash)); px(xs, gy, 2, 2, mix("#2c4a33", "#6fd16a", near)); }
      var lsx = LX - camX, lgy = gr(LX), lit = t < 11 ? 0.35 + Math.min(0.3, t / 30) + Math.sin(t * 9) * 0.05 : 0.65 + wash * 0.8;
      if (lsx > -80 && lsx < W + 80) lantern(lsx, lgy, t, lit);
      if (wash > 0) glow(lsx, lgy - 31, Math.round(40 + wash * 200), "#ffd84a", wash * 0.5);
      smols.forEach(function (s, i) {
        var x = s.x + Math.cos(t * 0.7 + s.ph) * 6, sx = x - camX; if (sx < -10 || sx > W + 10) return;
        var gy = gr(x) - 4; smol(sx, gy - (t > 11.5 ? Math.abs(Math.sin(t * 5 + i)) * 3 : 0), s.col, 0.35 + wash * 0.65, 2, x < LX ? 1 : -1);
        if (i < 5) { // each of five smols gives an ember (more at the later stages)
          var t0e = 4.5 + i * 1.2, k = ease((t - t0e) / 2.6);
          if (t > t0e && k < 1) { var ex = lerp(sx, lsx, k), ey = lerp(gy - 8, lgy - 31, k) - Math.sin(k * Math.PI) * 34; glow(ex, ey, 7, "#ffb347", 1); px(ex - 1, ey - 1, 3, 3, "#fff6c0"); if (Math.random() < 0.5) bits.push({ x: ex, y: ey, vx: (Math.random() - 0.5) * 6, vy: 6, life: 0.5, t: 0, c: GLOW[Math.floor(Math.random() * 4)], w: 1 }); }
          if (k >= 1) once("ein" + i, "pop", 0.5);
        }
      });
      if (t > 11) { once("catch", "achievement", 0.8, 3); if (!fired.catchB) { fired.catchB = 1; boom(lsx, lgy - 31, 50, 80, GLOW); } }
      if (n >= 3 && t > 17.6 && t < 22.6) { // stage 3: the giant's eye opens a crack, big and bright, and the ground shakes
        var op = ease((t - 17.6) / 1.2) * (1 - ease((t - 21.4) / 1.2)), ex0 = 70 - camX + 26, ey0 = gr(70) - 8;
        glow(ex0, ey0, 34, "#ffd84a", op * 0.8); oval(ex0, ey0, 13, Math.max(1, Math.round(7 * op)), "#ffd84a"); oval(ex0, ey0, 9, Math.max(1, Math.round(5 * op)), "#ffb347"); oval(ex0 + 1, ey0, 3, Math.max(1, Math.round(5 * op)), "#140c1c");
        once("eye3", "bigboom", 0.6, 4); if (t < 19) shake = Math.max(shake, 2);
      }
      if (n >= 3 && t > 22.4) { // the nest glows: a ring of light the grumps turn away from
        var nx0 = 230, ny0 = gr(230 + camX) - 6, pr = 22 + Math.sin(t * 3) * 2;
        glow(nx0, ny0, Math.round(pr), "#ffd84a", ease((t - 22.4) / 1));
        smol(nx0 - 8, ny0, "#ff9fd0", 1, 2, 1); smol(nx0 + 8, ny0, "#8fe6dc", 1, 2, -1);
        var gx3 = 300 - ease((t - 22.4) / 1.5) * 10 + ease((t - 24) / 2) * 30; grump(gx3, gr(gx3 + camX) - 6, 1.3, true); if (t > 23.6 && t < 25.5) text("!", gx3, gr(gx3 + camX) - 18, 8, "#ff4f5e", 1);
      }
      if (t > 13.5 && t < (n >= 3 ? 17.4 : 21)) text("the Lantern: stage " + n + " of 3", W / 2, 24, 10, "#ffd84a", ease((t - 13.5) / 1) * (1 - ease((t - 20) / 1)));
      if (t > DUR - 1.2) { ctx.fillStyle = "rgba(255,246,192," + Math.min(1, (t - DUR + 1.2) / 1.2) + ")"; ctx.fillRect(0, 0, W, H); }
    }
    function fadeOut(t, col) { if (t > DUR - 1.2) { ctx.fillStyle = "rgba(" + (col || "255,246,192") + "," + Math.min(1, (t - DUR + 1.2) / 1.2) + ")"; ctx.fillRect(0, 0, W, H); } }
    function flat(t, k, base) { for (var xs = 0; xs < W; xs += 2) { var gy = (base || 140) + Math.round(Math.sin(xs / 37) * 3); px(xs, gy, 2, H - gy, "#251d36"); px(xs, gy, 2, 2, mix("#4f8a52", "#22382a", k)); } }
    function starsAt(a) { stars.forEach(function (s) { if (s.y < H) { ctx.globalAlpha = a * s.z * 0.7; px(s.x, s.y * 0.6, 1, 1, s.c); } }); ctx.globalAlpha = 1; }
    // lend your light: the spark (you) circles high over Pip, frozen with a grump's eyes in the dark, then dives in
    function sceneLend(t) {
      sky(t, 0.95); starsAt(1); flat(t, 1, 118);
      var pipX = 160, pipY = 110, k = ease((t - 3) / 2), inside = t >= 5; // K-0048: the dive, centred, then held
      smol(pipX + (inside ? 0 : Math.sin(t * 40) * 0.6), pipY, inside ? "#c5ff49" : "#6f9a3a", inside ? 1 : 0.12, 4, 1);
      if (inside) glow(pipX, pipY - 4, 44, "#c5ff49", 0.45 + 0.15 * Math.sin(t * 4));
      var blink = Math.sin(t * 2.3) > -0.85;
      if (!inside) { if (blink) { px(278, 106, 3, 2, "#ff3b4f"); px(286, 106, 3, 2, "#ff3b4f"); } }
      else grump(286 + ease((t - 5) / 2) * 14, 112, 1.3, true);
      if (!inside) {
        var a0 = t * 2.2, rad = 70 * (1 - k), x = lerp(160 + Math.cos(a0) * rad, pipX, k), y = lerp(34 + Math.sin(a0) * 8, pipY - 4, k);
        glow(x, y, 14 + k * 8, "#fff6c0", 1); px(x - 2, y - 2, 4, 4, "#ffffff");
        if (Math.random() < 0.8) bits.push({ x: x, y: y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 0.6, t: 0, c: GLOW[Math.floor(Math.random() * 4)], w: 2 });
      } else { once("inpip", "achievement", 0.8, 3); if (!fired.inB) { fired.inB = 1; boom(pipX, pipY - 4, 46, 70, GLOW); } }
      if (t > 5 && t < 5.7) { ctx.fillStyle = "rgba(255,246,192," + (5.7 - t) * 1.3 + ")"; ctx.fillRect(0, 0, W, H); }
      if (t > 5.6) text("you are Pip", W / 2, 46, 16, "#c5ff49", ease((t - 5.6) / 0.5));
      fadeOut(t, "0,0,0");
    }
    // the first baby: an egg wobbles, cracks, and a tiny smol pops out between its parents
    function sceneBaby(t) {
      sky(t, 0.05); flat(t, 0, 114);
      var cx = 160, gy = 112, wob = t < 5.6 ? Math.sin(t * 18) * Math.min(1, t / 5) * 2 : 0;
      smol(cx - 44, gy - 4, "#ffd84a", 0.8, 3, 1); smol(cx + 44, gy - 4, "#ff9fd0", 0.8, 3, -1);
      if (t < 5.6) { oval(cx + wob, gy - 8, 7, 9, "#fff8e8"); oval(cx + wob - 2, gy - 11, 2, 2, "#ffffff"); if (t > 3.2) { px(cx - 3 + wob, gy - 10, 2, 1, "#5a4a3a"); px(cx - 1 + wob, gy - 9, 2, 1, "#5a4a3a"); px(cx + 1 + wob, gy - 10, 2, 1, "#5a4a3a"); } }
      else {
        once("pop", "pop", 0.9, 1); if (!fired.popB) { fired.popB = 1; boom(cx, gy - 8, 24, 40, ["#fff8e8", "#ffd84a", "#ffffff"]); }
        oval(cx - 6, gy - 1, 5, 3, "#fff8e8"); oval(cx + 6, gy - 1, 5, 3, "#fff8e8");
        smol(cx, gy - 5 - Math.abs(Math.sin(t * 6)) * 4, "#8fe6dc", 1, 2, 1);
        if (t > 7) { text("♥", cx - 44, gy - 18 - (t - 7) * 3, 9, "#ff4f5e", 1 - ease((t - 9) / 1)); text("♥", cx + 44, gy - 18 - (t - 7.3) * 3, 9, "#ff4f5e", 1 - ease((t - 9.3) / 1)); }
      }
      lantern(286, 116, t, 0.6 + (t > 6 ? ease((t - 6) / 2) * 0.3 : 0));
      fadeOut(t);
    }
    // the first grump: a smol alone in the dark, far from the fire; its light flickers out and it changes
    function sceneGrump(t) {
      sky(t, 1); starsAt(1); flat(t, 1, 112);
      glow(26, 104, 22, "#ff9f43", 0.8 + Math.sin(t * 9) * 0.1); oval(26, 110, 4, 3, "#ff9f43"); oval(26, 109, 2, 2, "#fff6c0"); // the fire, far behind
      var x = lerp(170, 220, ease(t / 6)), y = 108, fade = 1 - ease((t - 3) / 5);
      var flick = t > 4 && t < 8.6 ? (Math.sin(t * 23) > 0.2 ? 1 : 0.3) : 1;
      if (t < 9.6) {
        var col = mix(opts.col || "#8fe6dc", "#2a1838", ease((t - 6.5) / 3));
        smol(x, y, col, Math.max(0, fade * flick), 3, 1);
        if (t > 7.6) for (var k = 0; k < 4; k++) px(x - 8 + k * 5, y - 7 - ease((t - 7.6) / 2) * 3, 1, 2 + Math.round(ease((t - 7.6) / 2) * 2), "#140c1c");
      } else {
        once("growl", "grump", 0.9, 2); grump(x, y - 2, 1.8, Math.sin(t * 2.3) > -0.85);
      }
      fadeOut(t, "0,0,0");
    }
    // Pip grows up: Pip, big now, on the hill by the Lantern with a little one of its own
    function sceneGrow(t) {
      sky(t, 0.35); var camX = 360;
      for (var xs = 0; xs < W; xs += 2) { var gy = ground(xs + camX, t); px(xs, gy, 2, H - gy, "#2b2440"); px(xs, gy, 2, 2, "#4f8a52"); }
      var lsx = LX - camX, lgy = ground(LX, t); lantern(lsx, lgy, t, 1);
      var pipX = 96, s = 1.5 + ease((t - 3.5) / 3) * 2.5, pipY = ground(pipX + camX, t) - 2 - s * 2;
      smol(pipX, pipY, "#c5ff49", 1, s, 1); px(pipX - 1, pipY - 3 * s - 2, 3, 2 + Math.round(s), "#8fd13a");
      if (t > 7.4) { var bx = pipX + 24 + Math.sin(t * 2) * 2, by = ground(bx + camX, t) - 4; smol(bx, by - Math.abs(Math.sin(t * 6)) * 2, "#8fe6dc", 1, 1.5, -1); if (t > 9) text("?", bx, by - 8, 7, "#ffffff", 1 - ease((t - 10.5) / 1)); }
      smols.slice(0, 4).forEach(function (q, i) { var x = 30 + i * 22 + Math.sin(t + i) * 2; if (x > 90 && x < 140) return; smol(x, ground(x + camX, t) - 4, q.col, 0.7, 1.5, 1); });
      fadeOut(t);
    }
    // the finale: the Lantern blazes, the light runs over the Hollow, the giant opens its eye and lifts its head,
    // and in the light the grumps turn back into smols
    function sceneWake(t) {
      var wash = ease((t - 6) / 6), camX = t < 12 ? 360 : t < 16 ? lerp(360, 0, ease((t - 12) / 4)) : 0;
      var lift = t > 18 ? ease((t - 18) / 6) * 18 : 0;
      if (t > 18 && t < 24) shake = Math.max(shake, 1.2);
      sky(t, Math.max(0, 0.9 - wash * 0.85)); starsAt(1 - wash * 0.6);
      function gr(x) { return ground(x, t) - lift * Math.max(0, 1 - Math.abs(x - 70) / 260); }
      var hx = 70 - camX, hy = gr(70) - lift * 0.5;
      if (hx > -90) {
        oval(hx, hy + 4, 60, 44, "#1e1830"); oval(hx + 2, hy + 2, 56, 40, mix("#2e2440", "#5a4d7a", wash));
        var open = t < 15 ? 0 : ease((t - 15) / 3), ex = hx + 26, ey = hy - 8;
        if (open < 0.05) for (var k = 0; k < 24; k++) px(hx + 14 + k, hy - 12 + Math.round(Math.pow((k - 12) / 12, 2) * 5), 1, 1, "#4a3d66");
        else { oval(ex, ey, 11, Math.max(1, Math.round(8 * open)), "#ffd84a"); oval(ex, ey, 7, Math.max(1, Math.round(6 * open)), "#ffb347"); oval(ex + 1, ey, 3, Math.max(1, Math.round(5 * open)), "#140c1c"); px(ex - 4, ey - 3, 2, 2, "#fff6c0"); glow(ex, ey, 30, "#ffd84a", open * 0.6); }
        if (t > 15) once("eye", "bigboom", 0.5, 3);
      }
      for (var xs = 0; xs < W; xs += 2) { var gx = xs + camX, gy = gr(gx), near = Math.min(1, Math.max(0, 1 - Math.abs(gx - LX) / (40 + wash * 900))); px(xs, gy, 2, H - gy, mix("#251d36", "#3a2f52", near * wash)); px(xs, gy, 2, 2, mix("#2c4a33", "#7ee07a", near)); }
      var lsx = LX - camX, lgy = gr(LX);
      if (lsx > -80 && lsx < W + 80) { lantern(lsx, lgy, t, 1.6); glow(lsx, lgy - 31, Math.round(60 + wash * 220), "#ffd84a", 0.5); }
      if (t < 8 && Math.random() < 0.6) bits.push({ x: Math.random() * W, y: H, vx: (lsx - Math.random() * W) * 0.15, vy: -40 - Math.random() * 30, life: 2, t: 0, c: GLOW[Math.floor(Math.random() * 4)], w: 2 });
      // the grumps, and in the light at 24-28 s they turn back
      [[150, "#ff9fd0"], [205, "#b59aff"], [255, "#ffd84a"]].forEach(function (q, i) {
        if (t < 20) return;
        var gx = q[0], gy = gr(gx + camX) - 4, turn = 24 + i * 1.3;
        if (t < turn) { grump(gx, gy - 2, 1.4, true); if (t > turn - 1.5) glow(gx, gy, 16, "#fff6c0", ease((t - turn + 1.5) / 1.5)); }
        else { once("back" + i, "pop", 0.8); if (!fired["bb" + i]) { fired["bb" + i] = 1; boom(gx, gy, 20, 40, GLOW); } smol(gx, gy - Math.abs(Math.sin(t * 5 + i)) * 2, q[1], 1, 2, i % 2 ? -1 : 1); }
      });
      smols.slice(0, 3).forEach(function (q, i) { var x = 40 + i * 30; smol(x, gr(x + camX) - 4 - (t > 28 ? Math.abs(Math.sin(t * 5 + i)) * 3 : 0), q.col, 0.4 + wash * 0.6, 2, 1); });
      if (t > 31 && t < 39) text("THE HOLLOW WAKES", W / 2, 34, 14, "#ffd84a", ease((t - 31) / 1.2) * (1 - ease((t - 38) / 1)));
      fadeOut(t);
    }
    function scene(t, dt) {
      if (dawnScene) { sceneDawn(t); return; }
      if (stageN) { sceneStage(t, stageN); return; }
      if (opts.scene === "lend") { sceneLend(t); return; }
      if (opts.scene === "baby") { sceneBaby(t); return; }
      if (opts.scene === "grump") { sceneGrump(t); return; }
      if (opts.scene === "growup") { sceneGrow(t); return; }
      if (opts.scene === "wake") { sceneWake(t); return; }
      if (t < 0) { // (the heartbeat opening: the ark film opens the story now)
        // 1. black. a heartbeat. "every night, they forget a little more."
        var beat = t % 1.6;
        if (beat < 0.05 && t > 0.3) { if (!fired["b" + Math.floor(t / 1.6)]) { fired["b" + Math.floor(t / 1.6)] = 1; sfx("tap", 0.9); setTimeout(function () { sfx("tap", 0.55); }, 260); } }
        var pulse = Math.max(0, 1 - beat * 3) * 0.12;
        ctx.fillStyle = "rgba(90,20,40," + pulse + ")"; ctx.fillRect(0, 0, W, H);
        text("every night,", W / 2, 80, 10, "#e8e4f0", ease((t - 1) / 1.2) * (1 - ease((t - 6) / 1)));
        text("they forget a little more.", W / 2, 96, 10, "#e8e4f0", ease((t - 2.4) / 1.2) * (1 - ease((t - 6) / 1)));
        return;
      }
      var camX, lit = lanternLight(t);
      if (t < 36) {
        // 2-4. dusk on the Hollow's back, the Lantern, Pip's run
        camX = t < 14 ? ease(t / 14) * 380 : t < 22 ? lerp(380, 360, ease((t - 14) / 2)) : 360;
        var night = t < 14 ? t / 30 : 0.45 + Math.min(0.4, (t - 14) / 30);
        sky(t, night);
        stars.forEach(function (s) { if (s.y < H && night > 0.2) { ctx.globalAlpha = (night - 0.2) * s.z; px((s.x - camX * 0.05 + W) % W, s.y * 0.6, 1, 1, s.c); } }); ctx.globalAlpha = 1;
        // the giant's head, asleep, at the start of its back: a dome with a closed eye that breathes
        var hx = 70 - camX, hy = ground(70, t);
        if (hx > -90) { oval(hx, hy + 4, 60, 44, "#1e1830"); oval(hx + 2, hy + 2, 56, 40, "#2e2440"); for (var k = 0; k < 24; k++) px(hx + 14 + k, hy - 12 + Math.round(Math.pow((k - 12) / 12, 2) * 5), 1, 1, "#4a3d66"); var zt = (t * 0.6) % 3; text("z", hx + 44 + zt * 6, hy - 22 - zt * 8, 7, "#8e86a8", Math.max(0, 1 - zt / 3)); }
        // the back: earth, then grass on top, both breathing
        for (var xs = 0; xs < W; xs += 2) { var gy = ground(xs + camX, t); px(xs, gy, 2, H - gy, "#251d36"); px(xs, gy, 2, 2, mix("#4f8a52", "#22382a", night)); }
        // little trees along the ridge
        for (var tx = 40; tx < 600; tx += 57) { var sx = tx - camX; if (sx < -10 || sx > W + 10 || Math.abs(tx - LX) < 40) continue; var tg = ground(tx, t); px(sx, tg - 8, 2, 8, "#3a2a33"); oval(sx + 1, tg - 11, 5, 4, mix("#3f7a46", "#1c2d22", night)); }
        // the Lantern
        var lsx = LX - camX, lgy = ground(LX, t);
        if (lsx > -60 && lsx < W + 60) lantern(lsx, lgy, t, lit);
        // smols, walking their little circles, forgetting
        smols.forEach(function (s, idx) {
          var x = s.x + Math.cos(t * 0.8 + s.ph) * 7, sx2 = x - camX; if (sx2 < -10 || sx2 > W + 10) return;
          var cyc = (t + s.ph * 2) % s.cyc, gy2 = ground(x, t) - 2, dim = t < 17.5 ? 1 : Math.min(1, lit * 1.3);
          if (t > 22 && Math.abs(x - LX) > 120) dim *= 0.6;
          if (cyc < 3) px(s.x + 6 - camX, ground(s.x + 6, t) - 1, 2, 2, "#ff4f5e"); // the berry it put down somewhere
          smol(sx2, gy2 - 2, s.col, dim, 2, Math.sin(t * 0.8 + s.ph) > 0 ? -1 : 1);
          if (cyc < 1.4 && t < 14.5) text("?", sx2, gy2 - 10, 8, "#ffffff", 1 - cyc / 1.4);
          void idx;
        });
        // the pod: it streaks across the dusk and slams into the Lantern's hill
        var podX = LX - 26, podY = ground(podX, t) - 3;
        if (t >= 15 && t < 17.5) {
          var fk = ease((t - 15) / 2.5), fx = lerp(podX - 260, podX, fk) - camX, fy = lerp(-10, podY, fk);
          for (var k1 = 0; k1 < 16; k1++) px(fx - k1 * 3, fy - k1 * 1.6, Math.max(1, 5 - k1 / 4), Math.max(1, 5 - k1 / 4), k1 < 3 ? "#ffffff" : k1 < 8 ? "#ffd84a" : "#ff9f43");
          px(fx - 3, fy - 3, 7, 6, "#1a1222"); px(fx - 2, fy - 3, 4, 4, "#8fe6dc");
        }
        if (t >= 17.5 && t < 21.4) { closeCrash(t - 17.5); return; } // a close shot of the impact (K-0048)
        if (t >= 17.5) {
          if (!fired.crash) { once("crash", "bigboom", 0.8, 5); boom(podX - camX, podY, 36, 70, ["#ffffff", "#ffd84a", "#ff9f43", "#8fe6dc"]); }
          px(podX - camX - 4, podY - 4, 9, 7, "#1a1222"); px(podX - camX - 3, podY - 4, 6, 5, "#8fe6dc"); px(podX - camX - 1, podY - 3, 2, 2, "#1a1222");
          if (r() < 0.25) bits.push({ x: podX - camX + (r() - 0.5) * 4, y: podY - 6, vx: (r() - 0.5) * 4, vy: -10 - r() * 6, life: 1.4, t: 0, c: r() < 0.5 ? "#5a5266" : "#3a3446", w: 2 });
        }
        if (t >= 22) {
          // 4. Pip runs up the hill with the berry; a grump follows to the edge of the light; Pip trips
          var pt = t - 22, px0 = lerp(380, 506, ease(Math.min(1, pt / 11))), pgy = ground(px0, t) - 2;
          var gxw = lerp(330, 452, ease(Math.min(1, pt / 9))) - (pt > 7 && pt < 10 ? (pt - 7) * 3 : 0), ggy = ground(gxw, t) - 4;
          grump(gxw - camX, ggy - 2, 1.5, true);
          if (pt > 6.5 && pt < 10) text("!", gxw - camX, ggy - 10, 8, "#ff4f5e", 1);
          var tripped = pt > 11.2, pipX = px0 - camX + (tripped ? 3 : 0);
          if (!tripped) { smol(pipX, pgy - 2 + Math.abs(Math.sin(t * 14)) * -1.5, "#c5ff49", 1, 2, 1); px(pipX - 1, pgy - 8, 3, 2, "#8fd13a"); px(pipX + 6, pgy - 5, 2, 2, "#ff4f5e"); }
          else { oval(pipX, pgy, 6, 2, "#14101c"); oval(pipX, pgy, 5, 1, "#c5ff49"); }
          if (pt > 6.5 && pt < 9.5) text("shoo!", pipX - 6, pgy - 10, 7, "#c5ff49", 1);
          if (pt > 11.2) once("trip", "bonk", 0.6, 1.5);
          if (tripped) { // the berry rolls up into the flame
            var bk = ease(Math.min(1, (pt - 11.2) / 1.6)), bx = lerp(pipX + 4, lsx, bk), by = lerp(pgy - 3, lgy - 30, bk) - Math.sin(bk * Math.PI) * 10;
            if (bk < 1) px(bx, by, 2, 2, "#ff4f5e"); else { once("berryin", "pop", 0.8); }
          }
        }
      } else if (t < 43) {
        // 5. close: Pip kneels at the flame and wishes
        var ct = t - 36;
        sky(t, 0.9);
        px(0, 140, W, 40, "#251d36"); px(0, 140, W, 3, "#22382a");
        var fl = 0.5 + Math.sin(t * 13) * 0.1 + ease(ct / 8) * 0.3;
        glow(200, 92, Math.round(50 + fl * 30), "#ffd84a", Math.min(1, fl + 0.2));
        px(198, 100, 5, 40, "#3a2a33"); px(186, 66, 30, 3, "#7a6248"); px(186, 98, 30, 3, "#7a6248"); px(186, 66, 3, 34, "#7a6248"); px(213, 66, 3, 34, "#7a6248");
        var fh2 = Math.round(12 + fl * 8 + Math.sin(t * 17) * 2); oval(201, 92 - (fh2 >> 1), Math.round(4 + fl * 3), fh2, "#ff9f43"); oval(201, 92 - (fh2 >> 1), 2, fh2 - 4, "#fff6c0");
        smol(130, 132 + Math.sin(t * 2) * 0.5, "#c5ff49", 0.5 + fl * 0.4, 4, 1); px(126, 116, 6, 3, "#8fd13a");
        if (ct > 2 && ct < 7) for (var q = 0; q < 2; q++) if (r() < 0.05) bits.push({ x: 132 + r() * 8, y: 126, vx: 0, vy: 8, life: 1, t: 0, c: "#8fe6dc", w: 1 }); // a tear
      } else {
        // 6. the flame bursts and its last spark climbs into the sky: you
        var rt = t - 43, climb = ease(rt / 6) * 360;
        sky(t, 1);
        stars.forEach(function (s) { var y = (s.y - 360 + climb) % (H * 3); if (y < 0) y += H * 3; if (y < H) { ctx.globalAlpha = Math.min(1, 0.3 + s.z * 0.5 + rt * 0.05); px(s.x, y, s.z > 1.2 ? 2 : 1, 1, s.c); } }); ctx.globalAlpha = 1;
        var hill = 150 + climb;
        if (hill < H + 40) { oval(W / 2, hill + 40, 120, 40, "#251d36"); lantern(W / 2, hill, t, 1.4); }
        if (rt < 0.2) { once("burst", "bigboom", 0.6, 4); boom(W / 2, hill - 31, 40, 70, GLOW); }
        var sy = Math.max(70, hill - 31 - rt * 60);
        glow(W / 2, sy, 14, "#fff6c0", 1); px(W / 2 - 1, sy - 1, 3, 3, "#ffffff");
        if (r() < 0.7) bits.push({ x: W / 2 + (r() - 0.5) * 3, y: sy + 2, vx: (r() - 0.5) * 8, vy: 40 + r() * 30, life: 0.6, t: 0, c: GLOW[Math.floor(r() * 4)], w: 1 });
        if (rt < 0.6) { ctx.fillStyle = "rgba(255,246,192," + (0.8 - rt) + ")"; ctx.fillRect(0, 0, W, H); }
        if (rt > 4.6) text("THE LAST LANTERN", W / 2, 40, 13, "#ffd84a", ease((rt - 4.6) / 1.2));
        if (rt > 7.4) { ctx.fillStyle = "rgba(255,255,255," + Math.min(1, (rt - 7.4) * 0.8) + ")"; ctx.fillRect(0, 0, W, H); }
      }
    }
    function frame() {
      if (done) return;
      try { draw(); } catch (e) { if (window.console) console.warn("[smol] lantern", e); finish(); } // never leave the island hidden
    }
    function draw() {
      var now = performance.now(), t = (now - t0) / 1000;
      var dt = lastF ? Math.min(0.1, (now - lastF) / 1000) : 1 / 60;
      lastF = now;
      if (opts.speed) t *= opts.speed; // tests
      if (!short) t = L.warp(t);
      L.t = t;
      if (t > DUR) { finish(); return; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = "#07060d"; ctx.fillRect(0, 0, W, H);
      if (shake > 0.05) { ctx.setTransform(1, 0, 0, 1, Math.round((r() - 0.5) * shake * 2), Math.round((r() - 0.5) * shake * 2)); shake *= Math.pow(0.02, dt); } else shake = 0;
      scene(t, dt);
      bits = bits.filter(function (b) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.97; b.vy *= 0.97; if (b.t > b.life) return false; px(b.x, b.y, b.w, b.w, b.c); return true; });
      // captions: smol-speak typed out word by word, then the subtitle
      var li = -1;
      for (var q = 0; q < LINES.length; q++) if (t >= LINES[q].at) li = q;
      if (short && li >= 0 && li < LINES.length - 1 && t > LINES[li].at + 5.6) li = -2; // a line holds 5.6 s (the last one to the end); in the opening, until the next
      if (li !== lineI) { lineI = li; cur = li >= 0 ? LINES[li] : null; typed = 0; subEl.textContent = ""; smolEl.textContent = ""; cap.classList.toggle("on", !!cur); }
      if (cur) {
        var words = cur.smol ? cur.smol.split(" ") : [];
        var should = Math.min(words.length, Math.floor((t - cur.at) / 0.22) + 1);
        if (typed < should) { typed++; smolEl.textContent = words.slice(0, typed).join(" "); if (SB.Audio && SB.Audio.voice) try { SB.Audio.voice(words[typed - 1], /GRUMP/.test(words[typed - 1]) ? -0.4 : 0.55); } catch (e) {} }
        if (typed >= words.length && !subEl.textContent) subEl.textContent = cur.sub;
      }
      requestAnimationFrame(frame);
    }
    ctx.fillStyle = "#07060d"; ctx.fillRect(0, 0, W, H);
    if (opts.noGate) gate.onclick({ stopPropagation: function () {} });
    return { skip: finish };
  };
})();
