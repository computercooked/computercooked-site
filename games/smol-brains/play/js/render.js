/* smol brains — render.js
   Everything you see in the valley: sky, parallax, terrain, decor, objects, smols, grumps, the hand,
   speech bubbles, particles, weather, day/night. Procedural canvas 2D only.
   Performance notes: static decor and small icons are baked into sprite canvases (keyed by a zoom
   bucket, LRU-evicted); far layers are cheap single-path polygons; glows are cached radial sprites
   drawn with "lighter" (no shadowBlur anywhere); particles live in a fixed pool. */
(function () {
  "use strict";
  var SB = (window.SB = window.SB || {});
  var R = (SB.Render = {});

  var TAU = Math.PI * 2, PI = Math.PI;
  var ROOMS = SB.ROOMS || [], NR = ROOMS.length || 6;
  var RW = SB.ROOM_W || 900, WW = SB.WORLD_W || 5400, WH = SB.WORLD_H || 600;
  var EMPTY = {};
  var INK = "#2a2340"; // universal soft outline
  var FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", "Trebuchet MS", system-ui, sans-serif';

  /* ---------------- state ---------------- */
  var canvas = null, ctx = null, game = null;
  var W = 800, H = 600, dpr = 1, Z = 1, now = 0, frameNo = 0;
  var cam = (R.camera = { x: SB.HOME_X || 2250, y: 330, zoom: 1, rel: 1, base: 1, follow: null, tx: SB.HOME_X || 2250, ty: 330, oy: 0 });
  var view = (R.view = { x0: 0, x1: 900, y0: 0, y1: 600 });
  R.stats = { fps: 60, drawMs: 0, sprites: 0, particles: 0 };
  var hover = { sx: 0, sy: 0, on: false, id: null, dirty: false };
  var resizeHooked = false, hookedCanvas = null, busHooked = false;
  var light = 1, night = 0, nightK = 0, wind = 0;

  /* ---------------- tiny helpers ---------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ss(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
  function hex(h) {
    h = String(h || "#888").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mixInto(out, a, b, t) { out[0] = a[0] + (b[0] - a[0]) * t; out[1] = a[1] + (b[1] - a[1]) * t; out[2] = a[2] + (b[2] - a[2]) * t; return out; }
  var strCache = new Map();
  function rgb(c, m) {
    m = m == null ? 1 : m;
    var r = clamp(c[0] * m, 0, 255) | 0, g = clamp(c[1] * m, 0, 255) | 0, b = clamp(c[2] * m, 0, 255) | 0;
    var k = (r << 16) | (g << 8) | b, s = strCache.get(k);
    if (!s) { s = "rgb(" + r + "," + g + "," + b + ")"; if (strCache.size > 5000) strCache.clear(); strCache.set(k, s); }
    return s;
  }
  function hsl(h, s, l, a) {
    h = ((h % 360) + 360) % 360;
    return a == null ? "hsl(" + h.toFixed(0) + "," + clamp(s, 0, 100).toFixed(0) + "%," + clamp(l, 0, 100).toFixed(0) + "%)"
      : "hsla(" + h.toFixed(0) + "," + clamp(s, 0, 100).toFixed(0) + "%," + clamp(l, 0, 100).toFixed(0) + "%," + a + ")";
  }
  function hash(n) { n = (n | 0) * 374761393; n = (n ^ (n >>> 13)) * 1274126177; n = n ^ (n >>> 16); return (n >>> 0) / 4294967296; }
  function rr(g, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function ell(g, x, y, rx, ry, rot) { g.moveTo(x + rx * Math.cos(rot || 0), y + rx * Math.sin(rot || 0)); g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); }
  function circ(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, Math.abs(r), 0, TAU); }
  // union of circles with an outer outline: stroke double width, then fill on top
  function blobs(g, a, fill, out, lw) {
    g.beginPath();
    for (var i = 0; i < a.length; i += 3) circ(g, a[i], a[i + 1], a[i + 2]);
    if (out) { g.lineWidth = lw * 2; g.strokeStyle = out; g.lineJoin = "round"; g.stroke(); }
    g.fillStyle = fill; g.fill();
  }
  function fillStroke(g, fill, out, lw) {
    if (out) { g.lineWidth = lw; g.strokeStyle = out; g.lineJoin = "round"; g.lineCap = "round"; }
    g.fillStyle = fill; g.fill(); if (out) g.stroke();
  }
  // jelly-bean: slightly flatter, wider bottom
  function bean(g, cx, cy, w, h) {
    g.moveTo(cx, cy - h);
    g.bezierCurveTo(cx + w * 0.8, cy - h, cx + w, cy - h * 0.38, cx + w, cy + h * 0.18);
    g.bezierCurveTo(cx + w, cy + h * 0.78, cx + w * 0.62, cy + h, cx, cy + h);
    g.bezierCurveTo(cx - w * 0.62, cy + h, cx - w, cy + h * 0.78, cx - w, cy + h * 0.18);
    g.bezierCurveTo(cx - w, cy - h * 0.38, cx - w * 0.8, cy - h, cx, cy - h);
    g.closePath();
  }
  function heartPath(g, x, y, s) {
    g.moveTo(x, y + s * 0.35);
    g.bezierCurveTo(x - s * 1.1, y - s * 0.35, x - s * 0.45, y - s * 1.05, x, y - s * 0.45);
    g.bezierCurveTo(x + s * 0.45, y - s * 1.05, x + s * 1.1, y - s * 0.35, x, y + s * 0.35);
    g.closePath();
  }
  function starPath(g, x, y, r1, r2, n, rot) {
    n = n || 5; rot = rot || -PI / 2;
    for (var i = 0; i < n * 2; i++) {
      var a = rot + (i * PI) / n, r = i % 2 ? r2 : r1;
      if (i === 0) g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
  }

  /* ---------------- ground ---------------- */
  function gy(x) {
    var w = game && game.world;
    if (!w || !w.ground || !w.ground.length) return 470;
    if (SB.World && SB.World.groundY) return SB.World.groundY(w, x);
    var g = w.ground, f = clamp(x, 0, WW) / 10, i = f | 0;
    if (i >= g.length - 1) return g[g.length - 1];
    return g[i] + (g[i + 1] - g[i]) * (f - i);
  }
  function roomIdx(x) { var i = Math.floor(x / RW); return i < 0 ? 0 : i >= NR ? NR - 1 : i; }
  function decorRoom(d) {
    if (typeof d.room === "number") return clamp(d.room, 0, NR - 1);
    if (typeof d.room === "string") for (var i = 0; i < NR; i++) if (ROOMS[i].id === d.room) return i;
    return roomIdx(d.x);
  }

  /* ---------------- palettes ---------------- */
  // render-side extras per biome (index order = SB.ROOMS)
  var BIOME = [
    { lip: "#6a5788", dirt: "#271f33", far: "#47376a", mid: "#33284c", night: ["#0d0a1c", "#1f1734"], cloud: 0 },
    { lip: "#62a052", dirt: "#2b3f2a", far: "#2f6e66", mid: "#255a4c", night: ["#08151a", "#16302e"], cloud: 0.6 },
    { lip: "#94e46f", dirt: "#9a6b45", far: "#a5dba0", mid: "#7cc96f", night: ["#0d1640", "#2a3474"], cloud: 1 },
    { lip: "#b9c1d0", dirt: "#5c6476", far: "#3d4762", mid: "#333c55", night: ["#141826", "#252c40"], cloud: 0 },
    { lip: "#f7e1ac", dirt: "#c9a265", far: "#f1c18f", mid: "#e7b37a", night: ["#141a44", "#3b3a72"], cloud: 1 },
    { lip: "#ffffff", dirt: "#cad8ee", far: "#c4d6f0", mid: "#dde8f8", night: ["#0f1838", "#2c3c70"], cloud: 1 }
  ];
  // decor palettes per biome
  var RP = [
    { leaf: "#7b5aa6", leaf2: "#a585d6", trunk: "#4a3560", rock: "#5d4c74", rock2: "#7d6a98", grass: "#6e5a8c", out: "#21172f" },
    { leaf: "#2e9a83", leaf2: "#62d1b1", trunk: "#5b3f35", rock: "#5f6f6a", rock2: "#86978f", grass: "#4f9a5c", out: "#16292a" },
    { leaf: "#4fbf4a", leaf2: "#93e47c", trunk: "#94603d", rock: "#9aa0a8", rock2: "#c4c9cf", grass: "#5fca4f", out: "#2b3a24" },
    { leaf: "#4fae6a", leaf2: "#8ad99a", trunk: "#6c7385", rock: "#7d8597", rock2: "#a3abbb", grass: "#7fbf6a", out: "#1d2231" },
    { leaf: "#3fae5e", leaf2: "#83d87f", trunk: "#b07b48", rock: "#c9a46e", rock2: "#e8ca95", grass: "#9ccf5c", out: "#4a3420" },
    { leaf: "#3f8a74", leaf2: "#71b89d", trunk: "#6b5446", rock: "#8796ad", rock2: "#b8c6da", grass: "#a9c9b8", out: "#28324a" }
  ];
  var SKY = [], GROUND = [], LIPC = [], DIRTC = [], FARC = [], MIDC = [], NSKY = [];
  for (var bi = 0; bi < NR; bi++) {
    var rm = ROOMS[bi] || { sky: ["#8fd3ff", "#e6f7ff"], ground: "#6cc35a" }, bx = BIOME[bi] || BIOME[2];
    SKY.push([hex(rm.sky[0]), hex(rm.sky[1])]); GROUND.push(hex(rm.ground)); LIPC.push(hex(bx.lip)); DIRTC.push(hex(bx.dirt));
    FARC.push(hex(bx.far)); MIDC.push(hex(bx.mid)); NSKY.push([hex(bx.night[0]), hex(bx.night[1])]);
  }
  var DUSK = [hex("#5a4a9a"), hex("#ffa070")];
  // blended palette at the camera (recomputed per frame, no allocations)
  var cur = { skyT: [0, 0, 0], skyB: [0, 0, 0], far: [0, 0, 0], mid: [0, 0, 0], t1: [0, 0, 0], t2: [0, 0, 0], clouds: 1 };
  function blendAt(x) {
    var f = x / RW - 0.5, i = Math.floor(f), t = ss((f - i - 0.3) / 0.4);
    var a = clamp(i, 0, NR - 1), b = clamp(i + 1, 0, NR - 1);
    var nk = nightK, dusk = clamp(1 - Math.abs(light - 0.5) * 2.6, 0, 1) * (1 - nk * 0.5);
    function sky(out, j) {
      mixInto(cur.t1, SKY[a][j], SKY[b][j], t);
      mixInto(cur.t2, NSKY[a][j], NSKY[b][j], t);
      mixInto(out, cur.t1, cur.t2, nk);
      if (dusk > 0 && (a !== 3 || t > 0.5) && (b !== 3 || t < 0.5)) mixInto(out, out, DUSK[j], dusk * (j ? 0.45 : 0.3));
    }
    sky(cur.skyT, 0); sky(cur.skyB, 1);
    mixInto(cur.far, FARC[a], FARC[b], t); mixInto(cur.far, cur.far, cur.skyB, 0.25);
    mixInto(cur.mid, MIDC[a], MIDC[b], t);
    cur.clouds = lerp(BIOME[a].cloud, BIOME[b].cloud, t);
  }

  /* ---------------- sprite cache ---------------- */
  var cache = new Map(), newSprites = 0;
  function bucket(k) { return Math.pow(1.25, Math.round(Math.log(Math.max(0.05, k)) / Math.log(1.25))); }
  // fn(g, a, b) draws in local units with the anchor at (0,0). w,h,ax,ay in local units.
  function sprite(key, k, w, h, ax, ay, fn, a, b, force) {
    var full = key + "@" + k.toFixed(3), s = cache.get(full);
    if (s) { s.used = frameNo; return s; }
    if (!force && newSprites > 8) return null; // budget: draw live this frame
    newSprites++;
    var c = document.createElement("canvas");
    var pw = Math.max(1, Math.ceil(w * k) + 4), ph = Math.max(1, Math.ceil(h * k) + 4);
    if (pw * ph > 4e6) return null;
    c.width = pw; c.height = ph;
    var g = c.getContext("2d");
    g.setTransform(k, 0, 0, k, ax * k + 2, ay * k + 2);
    fn(g, a, b);
    s = { c: c, ax: ax + 2 / k, ay: ay + 2 / k, w: pw / k, h: ph / k, used: frameNo, px: pw * ph };
    cache.set(full, s);
    if (cache.size > 360) evict();
    return s;
  }
  function evict() {
    var old = [];
    cache.forEach(function (s, k) { if (s.used < frameNo - 30) old.push(k); });
    for (var i = 0; i < old.length; i++) cache.delete(old[i]);
    if (cache.size > 300) { var n = 0; cache.forEach(function (s, k) { if (n++ < 80) cache.delete(k); }); }
  }
  function blit(g, s) { g.drawImage(s.c, -s.ax, -s.ay, s.w, s.h); }

  // glow sprites (radial gradients) per color
  var glowCache = {};
  function glowSprite(col) {
    var s = glowCache[col];
    if (s) return s;
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var g = c.getContext("2d"), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64), rc = hex(col);
    gr.addColorStop(0, "rgba(" + rc + ",1)"); gr.addColorStop(0.25, "rgba(" + rc + ",0.55)");
    gr.addColorStop(0.6, "rgba(" + rc + ",0.15)"); gr.addColorStop(1, "rgba(" + rc + ",0)");
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return (glowCache[col] = c);
  }
  // glow queue: drawn after the night overlay with "lighter"
  var GQ = [], gqn = 0;
  for (var gi = 0; gi < 160; gi++) GQ.push({ x: 0, y: 0, r: 0, c: "", a: 0 });
  function glow(x, y, r, col, a) {
    if (a <= 0.01 || gqn >= GQ.length) return;
    var q = GQ[gqn++]; q.x = x; q.y = y; q.r = r; q.c = col; q.a = a;
  }

  /* ---------------- transforms ---------------- */
  function worldT() { ctx.setTransform(Z * dpr, 0, 0, Z * dpr, (W / 2 - cam.x * Z) * dpr, (H / 2 - cam.y * Z) * dpr); }
  function screenT() { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  // local frame at world point (x,y): rotation, x scale (flip), y scale
  function local(x, y, rot, sx, sy) {
    var k = Z * dpr, c = Math.cos(rot || 0) * k, s = Math.sin(rot || 0) * k;
    sx = sx == null ? 1 : sx; sy = sy == null ? sx : sy;
    ctx.setTransform(c * sx, s * sx, -s * sy, c * sy, (W / 2 + (x - cam.x) * Z) * dpr, (H / 2 + (y - cam.y) * Z) * dpr);
  }
  R.toWorld = function (sx, sy) { return { x: cam.x + (sx - W / 2) / Z, y: cam.y + (sy - H / 2) / Z }; };
  R.toScreen = function (wx, wy) { return { x: W / 2 + (wx - cam.x) * Z, y: H / 2 + (wy - cam.y) * Z }; };
  function sx_(wx) { return W / 2 + (wx - cam.x) * Z; }
  function sy_(wy) { return H / 2 + (wy - cam.y) * Z; }
  function visible(x, y, m) { return x + m > view.x0 && x - m < view.x1 && y + m > view.y0 && y - m < view.y1; }

  /* ---------------- init / resize / camera ---------------- */
  R.init = function (cv, g) {
    if (g) game = g;
    if (cv && cv !== canvas) {
      canvas = cv; ctx = canvas.getContext("2d", { alpha: false }) || canvas.getContext("2d");
      if (hookedCanvas !== canvas) {
        hookedCanvas = canvas;
        canvas.addEventListener("pointermove", function (e) {
          var r = canvas.getBoundingClientRect();
          hover.sx = e.clientX - r.left; hover.sy = e.clientY - r.top; hover.on = e.pointerType !== "touch"; hover.dirty = true;
        });
        canvas.addEventListener("pointerleave", function () { hover.on = false; hover.id = null; });
        if (window.ResizeObserver) try { new ResizeObserver(function () { R.resize(); }).observe(canvas); } catch (e) {}
      }
    }
    if (!resizeHooked) {
      resizeHooked = true;
      window.addEventListener("resize", function () { R.resize(); });
      window.addEventListener("orientationchange", function () { setTimeout(R.resize, 120); });
    }
    hookBus();
    R.resize();
    if (game) {
      cam.follow = null;
      var start = SB.HOME_X || 2250;
      var sel = game.selectedId != null && SB.Game && SB.Game.byId ? SB.Game.byId(game, game.selectedId) : null;
      if (sel && sel.x != null) start = sel.x;
      cam.x = cam.tx = start; cam.oy = 0;
      clampCam(); cam.y = cam.ty = targetY();
    }
  };

  R.resize = function () {
    if (!canvas) return;
    var rect = canvas.getBoundingClientRect();
    var w = rect.width || canvas.clientWidth || window.innerWidth, h = rect.height || canvas.clientHeight || window.innerHeight;
    if (!(w > 0) || !(h > 0)) return;
    var small = Math.min(w, h) < 520;
    var d = Math.min(window.devicePixelRatio || 1, small ? 1.5 : 2);
    if (w === W && h === H && d === dpr && canvas.width === Math.round(w * d)) return;
    W = w; H = h; dpr = d;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    var targetW = W < 700 ? 520 : 900;
    // landscape: ~900 world px across; portrait phones: fill the height, ~300-520 px across
    cam.base = H > W ? Math.min(Math.max(W / targetW, H / 600), W / 280) : Math.max(W / targetW, Math.min(H / 640, W / 420));
    applyZoom();
    clampCam();
  };
  function applyZoom() { cam.zoom = Z = cam.base * cam.rel; }
  function visW() { return W / Z; }
  function visH() { return H / Z; }
  // UI chrome covering the canvas (CSS px); the ground line is placed inside what is left
  var insets = { top: 0, bottom: 0 };
  R.setInsets = function (top, bottom) { insets.top = Math.max(0, +top || 0); insets.bottom = Math.max(0, +bottom || 0); };
  function groundFrac() { return H > W ? 0.66 : 0.77; }
  function targetY() {
    var x = cam.x, g = (gy(x - 220) + gy(x) * 2 + gy(x + 220)) / 4;
    var top = Math.min(insets.top, H * 0.4), bot = Math.min(insets.bottom, H * 0.4);
    var gs = insets.top || insets.bottom ? top + (H - top - bot) * (H > W ? 0.8 : 0.84) : H * groundFrac();
    var y = g - (gs - H / 2) / Z + cam.oy;
    return Math.max(y, -900 + visH() / 2);
  }
  function clampCam() {
    var hw = visW() / 2;
    if (hw * 2 >= WW) { cam.x = cam.tx = WW / 2; return; }
    cam.x = clamp(cam.x, hw, WW - hw); cam.tx = clamp(cam.tx, hw, WW - hw);
  }
  function updateCamera(dt) {
    if (cam.follow != null && game) {
      var c = SB.Game && SB.Game.byId ? SB.Game.byId(game, cam.follow) : null;
      if (!c) { for (var i = 0; i < game.creatures.length; i++) if (game.creatures[i].id === cam.follow) c = game.creatures[i]; }
      if (c && c.x != null && !c.gone) cam.tx = c.x + (c.facing || 0) * 30; else cam.follow = null;
    }
    var k = 1 - Math.exp(-dt * (cam.follow != null ? 3.5 : 6));
    cam.x += (cam.tx - cam.x) * k;
    clampCam();
    cam.ty = targetY();
    cam.y += (cam.ty - cam.y) * (1 - Math.exp(-dt * 5));
    if (!isFinite(cam.x)) cam.x = cam.tx = SB.HOME_X || 2250;
    if (!isFinite(cam.y)) cam.y = 330;
    view.x0 = cam.x - visW() / 2; view.x1 = cam.x + visW() / 2;
    view.y0 = cam.y - visH() / 2; view.y1 = cam.y + visH() / 2;
  }
  R.panBy = function (dx, dy) {
    cam.follow = null;
    cam.x -= dx / Z; cam.tx = cam.x;
    cam.oy = clamp(cam.oy - (dy || 0) / Z, -160, 120);
    clampCam();
  };
  R.zoomAt = function (sx, sy, factor) {
    var wx = cam.x + (sx - W / 2) / Z;
    cam.rel = clamp(cam.rel * factor, 0.5, 2.5);
    applyZoom();
    if (cam.follow == null) { cam.x = cam.tx = wx - (sx - W / 2) / Z; }
    clampCam();
  };
  R.centerOn = function (x, follow) { cam.tx = x; if (follow !== undefined) cam.follow = follow; else cam.follow = null; clampCam(); };
  R.followCreature = function (id) { cam.follow = id; };

  /* ---------------- picking ---------------- */
  function creatureR(c) {
    var st = (SB.STAGES && SB.STAGES[c.stage]) || { scale: 1 };
    var L = c.look || EMPTY;
    return 22 * st.scale * (L.size || 1) * (c.species === "grump" ? 1.05 : 1);
  }
  R.radius = creatureR;
  R.pick = function (g, sx, sy) {
    g = g || game;
    if (!g) return null;
    var p = R.toWorld(sx, sy), pad = Math.max(12, 14 / Z), best = null, bd = 1e9, i;
    var cs = g.creatures || [];
    for (i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c || c.gone || c.dying) continue;
      var r = creatureR(c), cy = c.y - r * 1.05;
      var dx = p.x - c.x, dy = (p.y - cy) * 0.85, d = Math.sqrt(dx * dx + dy * dy);
      if (d < r * 1.15 + pad && d / (r + pad) < bd) { bd = d / (r + pad); best = c; }
    }
    if (best) return { type: "creature", ref: best };
    var os = (g.world && g.world.objects) || [];
    var bo = null; bd = 1e9;
    for (i = 0; i < os.length; i++) {
      var o = os[i], or = o.r || 10, oy = o.y;
      if (o.heldBy === "hand") continue;
      var big = BIG[o.kind];
      if (big) { oy = o.y + or - big * 0.5; or = Math.max(or, big * 0.5); }
      var ddx = p.x - o.x, ddy = p.y - oy, dd = Math.sqrt(ddx * ddx + ddy * ddy), lim = or + Math.max(10, 12 / Z);
      if (dd > lim) continue;
      var score = dd / lim + (o.fixed ? 0.8 : 0);
      if (score < bd) { bd = score; bo = o; }
    }
    return bo ? { type: "object", ref: bo } : null;
  };
  // fixed things that are drawn much taller than their radius (visual height in world px)
  var BIG = { appletree: 130, warpgate: 110, grumpcave: 100, computer: 70, snackbox: 72, medbot: 62, incubator: 56, fan: 64, heater: 48, teleporter: 26 };

  /* ---------------- particles ---------------- */
  var MAXP = 220, P = [], pCur = 0;
  for (var pi = 0; pi < MAXP; pi++) P.push({ on: false, sh: "", col: "", x: 0, y: 0, vx: 0, vy: 0, g: 0, life: 0, max: 1, s: 1, s2: 1, rot: 0, vr: 0, drag: 0, wob: 0, ph: 0 });
  function spawn(sh, col, x, y, vx, vy, life, s, s2, g, rot, vr) {
    var p = null;
    for (var n = 0; n < MAXP; n++) { var q = P[(pCur + n) % MAXP]; if (!q.on) { p = q; pCur = (pCur + n + 1) % MAXP; break; } }
    if (!p) { p = P[pCur]; pCur = (pCur + 1) % MAXP; }
    p.on = true; p.sh = sh; p.col = col; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life;
    p.s = s; p.s2 = s2 == null ? s : s2; p.g = g || 0; p.rot = rot || 0; p.vr = vr || 0; p.drag = 0; p.wob = 0; p.ph = Math.random() * TAU;
    return p;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var CONF = ["#ff5fa2", "#c5ff49", "#ffd166", "#6fd3ff", "#b59aff", "#ff9f43"];
  R.fx = function (kind, x, y, opts) {
    opts = opts || EMPTY;
    if (!isFinite(x) || !isFinite(y)) return;
    var n = opts.n, i, a, sp, p;
    switch (kind) {
      case "hearts":
        n = n || 5;
        for (i = 0; i < n; i++) { p = spawn("heart", opts.color || (i % 3 ? "#ff5fa2" : "#ff8fc0"), x + rnd(-14, 14), y + rnd(-6, 6), rnd(-35, 35), rnd(-70, -110), rnd(1.1, 1.6), rnd(7, 11), rnd(10, 14), -20); p.wob = 2; }
        break;
      case "stars":
        n = n || 8;
        for (i = 0; i < n; i++) { a = (i / n) * TAU + rnd(-0.2, 0.2); sp = rnd(90, 170); spawn("star", opts.color || (i % 2 ? "#ffd166" : "#fff1a8"), x, y, Math.cos(a) * sp, Math.sin(a) * sp - 60, rnd(0.6, 0.9), rnd(7, 10), 3, 260, rnd(0, TAU), rnd(-8, 8)); }
        break;
      case "puff":
        n = n || 9;
        for (i = 0; i < n; i++) { a = (i / n) * TAU; sp = rnd(40, 80); p = spawn("puff", opts.color || "#ffffff", x + Math.cos(a) * 6, y + Math.sin(a) * 4, Math.cos(a) * sp, Math.sin(a) * sp * 0.6 - 15, rnd(0.45, 0.7), rnd(5, 8), rnd(10, 14), -20); p.drag = 3; }
        break;
      case "zzz":
        n = n || 1;
        for (i = 0; i < n; i++) { p = spawn("z", "#8fb8ff", x + rnd(-4, 4), y, rnd(12, 22), rnd(-26, -34), 1.8, 6, 13, 0); p.wob = 1; }
        break;
      case "angry":
        n = n || 3;
        for (i = 0; i < n; i++) spawn("anger", "#ff4d4d", x + rnd(-16, 16), y + rnd(-10, 4), rnd(-20, 20), rnd(-40, -60), 0.8, 6, 12, 0, rnd(-0.4, 0.4));
        break;
      case "sparkle":
        n = n || 10;
        for (i = 0; i < n; i++) { a = rnd(0, TAU); sp = rnd(20, 80); spawn("sparkle", opts.color || ["#c5ff49", "#ffffff", "#ffd166", "#b59aff"][i % 4], x + Math.cos(a) * 8, y + Math.sin(a) * 8, Math.cos(a) * sp, Math.sin(a) * sp - 30, rnd(0.6, 1.1), rnd(6, 10), 2, -10, 0, rnd(-3, 3)); }
        break;
      case "crumbs":
        n = n || 8;
        for (i = 0; i < n; i++) spawn("crumb", opts.color || ["#c98b4a", "#e8b06a", "#8a5a32"][i % 3], x + rnd(-5, 5), y + rnd(-3, 3), rnd(-80, 80), rnd(-160, -60), rnd(0.5, 0.8), rnd(2.5, 4), 2, 600, rnd(0, TAU), rnd(-10, 10));
        break;
      case "bonk":
        spawn("ring", "#ffffff", x, y, 0, 0, 0.35, 6, 30, 0);
        spawn("burst", "#ffd166", x, y, 0, 0, 0.3, 18, 26, 0, rnd(0, TAU));
        for (i = 0; i < 5; i++) { a = (i / 5) * TAU; spawn("star", "#ffd166", x + Math.cos(a) * 10, y + Math.sin(a) * 6, Math.cos(a) * 60, Math.sin(a) * 40 - 30, 0.7, 6, 3, 80, a, 6); }
        break;
      case "notes":
        n = n || 3;
        for (i = 0; i < n; i++) { p = spawn("note", ["#b59aff", "#ff5fa2", "#6fd3ff", "#7cd96b"][(Math.random() * 4) | 0], x + rnd(-10, 10), y + rnd(-4, 4), rnd(-18, 18), rnd(-40, -60), rnd(1.4, 2), 9, 12, -5, rnd(-0.3, 0.3)); p.wob = 3; }
        break;
      case "drops":
        n = n || 5;
        for (i = 0; i < n; i++) spawn("drop", opts.color || "#6fc8ff", x + rnd(-8, 8), y + rnd(-4, 4), rnd(-50, 50), rnd(-90, -30), rnd(0.6, 0.9), rnd(4, 6), 3, 500);
        break;
      case "confetti":
        n = n || 32;
        for (i = 0; i < n; i++) { p = spawn("rect", CONF[i % CONF.length], x + rnd(-8, 8), y + rnd(-8, 8), rnd(-160, 160), rnd(-300, -120), rnd(1.2, 1.9), rnd(4, 6), rnd(4, 6), 380, rnd(0, TAU), rnd(-12, 12)); p.drag = 1.2; p.wob = 1; }
        break;
      case "zap":
        for (i = 0; i < 3; i++) spawn("bolt", i ? "#c5ff49" : "#6fe8ff", x + rnd(-14, 14), y + rnd(-30, 0), 0, 0, 0.28, rnd(26, 40), rnd(26, 40), 0, rnd(-0.4, 0.4));
        for (i = 0; i < 12; i++) { a = rnd(0, TAU); sp = rnd(60, 180); spawn("sparkle", i % 2 ? "#6fe8ff" : "#ffffff", x, y - 14, Math.cos(a) * sp, Math.sin(a) * sp, rnd(0.3, 0.6), rnd(6, 9), 1, 0, 0, 8); }
        spawn("ring", "#6fe8ff", x, y - 14, 0, 0, 0.4, 8, 46, 0);
        break;
      case "splash":
        n = n || 12;
        for (i = 0; i < n; i++) spawn("drop", i % 3 ? "#7fd4ff" : "#d9f4ff", x + rnd(-10, 10), y, rnd(-110, 110), rnd(-260, -120), rnd(0.6, 0.9), rnd(3.5, 6), 2.5, 700);
        spawn("ring", "#d9f4ff", x, y, 0, 0, 0.5, 8, 40, 0);
        break;
      default:
        spawn("sparkle", "#ffffff", x, y, 0, -30, 0.6, 8, 2, 0);
    }
  };

  function particleSprite(sh, col, k) {
    return sprite("p|" + sh + "|" + col, k, 24, 24, 12, 12, drawParticleShape, sh, col, true);
  }
  function drawParticleShape(g, sh, col) {
    // unit: shape fits in radius ~10
    g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath();
    switch (sh) {
      case "heart": heartPath(g, 0, 2, 10); fillStroke(g, col, "rgba(120,20,60,0.55)", 1.6);
        g.beginPath(); ell(g, -4, -3, 2.4, 1.6, -0.6); g.fillStyle = "rgba(255,255,255,0.75)"; g.fill(); break;
      case "star": starPath(g, 0, 0, 10, 4.6, 5); fillStroke(g, col, "rgba(140,90,0,0.5)", 1.4); break;
      case "sparkle": starPath(g, 0, 0, 10, 2.2, 4); g.fillStyle = col; g.fill(); break;
      case "puff": circ(g, 0, 0, 9); g.globalAlpha = 0.75; g.fillStyle = col; g.fill(); g.lineWidth = 1.2; g.strokeStyle = "rgba(120,110,160,0.35)"; g.stroke(); g.globalAlpha = 1; g.beginPath(); circ(g, -3, -3, 3.5); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill(); break;
      case "z": g.font = "900 20px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.lineWidth = 3.5; g.strokeStyle = "#1d2550"; g.strokeText("z", 0, 0); g.fillStyle = col; g.fillText("z", 0, 0); break;
      case "anger":
        g.strokeStyle = col; g.lineWidth = 3.2;
        for (var i = 0; i < 4; i++) { g.save(); g.rotate(i * PI / 2); g.beginPath(); g.moveTo(2.5, -8); g.quadraticCurveTo(2.5, -2.5, 8, -2.5); g.stroke(); g.restore(); }
        break;
      case "note":
        g.beginPath(); ell(g, -3, 5, 4.6, 3.4, -0.4); g.fillStyle = col; g.fill();
        g.beginPath(); g.moveTo(1, 4); g.lineTo(1, -9); g.quadraticCurveTo(5, -6, 8, -3); g.strokeStyle = col; g.lineWidth = 2.4; g.stroke(); break;
      case "drop":
        g.moveTo(0, -9); g.bezierCurveTo(5, -2, 7, 3, 0, 8); g.bezierCurveTo(-7, 3, -5, -2, 0, -9); fillStroke(g, col, "rgba(20,60,120,0.4)", 1.2);
        g.beginPath(); ell(g, -2, 2, 1.4, 2.2, 0); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill(); break;
      case "crumb": rr(g, -5, -4, 10, 8, 2.5); g.fillStyle = col; g.fill(); break;
      case "ring": circ(g, 0, 0, 9); g.strokeStyle = col; g.lineWidth = 1.6; g.stroke(); break;
      case "burst": starPath(g, 0, 0, 10, 5, 8); fillStroke(g, col, "#fff6c8", 1.5); break;
      case "bolt": g.moveTo(1, -10); g.lineTo(-4, 1); g.lineTo(1, 1); g.lineTo(-2, 10); g.lineTo(6, -2); g.lineTo(1, -2); g.lineTo(4, -10); g.closePath(); fillStroke(g, col, "#ffffff", 1.2); break;
      default: circ(g, 0, 0, 8); g.fillStyle = col; g.fill();
    }
  }
  function updateParticles(dt) {
    var n = 0;
    for (var i = 0; i < MAXP; i++) {
      var p = P[i];
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      n++;
      p.vy += p.g * dt;
      if (p.drag) { var d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
      p.x += p.vx * dt + (p.wob ? Math.sin(now * 5 + p.ph) * p.wob * 6 * dt : 0);
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    R.stats.particles = n;
  }
  function drawParticles() {
    var kb = bucket(Z * dpr * 1.2);
    for (var i = 0; i < MAXP; i++) {
      var p = P[i];
      if (!p.on || !visible(p.x, p.y, 40)) continue;
      var t = 1 - p.life / p.max, s = lerp(p.s, p.s2, t);
      var a = p.life < p.max * 0.35 ? p.life / (p.max * 0.35) : 1;
      if (t < 0.12 && (p.sh === "heart" || p.sh === "star" || p.sh === "note")) s *= 0.4 + 5 * t;
      ctx.globalAlpha = a;
      if (p.sh === "rect") {
        local(p.x, p.y, p.rot, 1, Math.abs(Math.cos(now * 9 + p.ph)) + 0.15);
        ctx.fillStyle = p.col; ctx.fillRect(-s / 2, -s * 0.35, s, s * 0.7);
        continue;
      }
      var sp = particleSprite(p.sh, p.col, kb);
      if (!sp) continue;
      local(p.x, p.y, p.rot, s / 10);
      blit(ctx, sp);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- bus hooks ---------------- */
  function headY(c) { return c.y - creatureR(c) * 2.1; }
  function hookBus() {
    if (busHooked || !SB.bus) return;
    busHooked = true;
    var on = SB.bus.on;
    on("tickle", function (e) { if (e && e.c) { R.fx("hearts", e.c.x, headY(e.c), { n: 5 }); } });
    on("tap", function (e) { if (e && e.c) R.fx("bonk", e.c.x, headY(e.c) + 6); });
    on("eat", function (e) { if (e && e.c) { var r = creatureR(e.c); R.fx("crumbs", e.c.x + (e.c.facing || 1) * r * 0.5, e.c.y - r * 0.9); } });
    on("hatch", function (e) { var c = e && (e.c || e.obj); if (c) { R.fx("confetti", c.x, c.y - 20); R.fx("puff", c.x, c.y - 12); } });
    on("learnWord", function (e) { if (e && e.c) R.fx("sparkle", e.c.x, headY(e.c), { n: 12 }); });
    on("egg", function (e) { if (e && e.obj) R.fx("hearts", e.obj.x, e.obj.y - 16, { n: 7 }); });
    on("death", function (e) { if (e && e.c) R.fx("puff", e.c.x, e.c.y - 14, { n: 12 }); });
    on("hit", function (e) { if (e && e.target) R.fx("bonk", e.target.x, headY(e.target) + 10); });
    on("splash", function (e) { if (e && e.x != null) R.fx("splash", e.x, e.y); });
    on("bounce", function (e) { if (e && e.obj && e.v > 400) R.fx("puff", e.obj.x, e.obj.y + e.obj.r, { n: 4 }); });
    on("thud", function (e) { if (e && e.obj) R.fx("puff", e.obj.x, e.obj.y + e.obj.r, { n: 5, color: "#e8dcc8" }); });
    on("spawn", function (e) { if (e && e.from && e.from.fixed && BIG[e.from.kind] && e.from.kind !== "appletree") R.fx("sparkle", e.obj.x, e.obj.y, { n: 5 }); });
    on("eggWarm", function (e) { if (e && e.obj && Math.random() < 0.6) R.fx("hearts", e.obj.x, e.obj.y - 14, { n: 1, color: "#ffb36b" }); });
    on("music", function (e) { if (e && e.obj) R.fx("notes", e.obj.x, e.obj.y - 18, { n: 3 }); });
    on("obey", function (e) { if (e && e.c) R.fx("stars", e.c.x, headY(e.c), { n: 5 }); });
    on("cured", function (e) { if (e && e.c) R.fx("sparkle", e.c.x, headY(e.c) + 10, { n: 10, color: "#8bd450" }); });
    on("use", function (e) {
      if (!e || !e.obj) return;
      var res = e.result || EMPTY, c = e.c;
      if (res.teleport != null) { R.fx("zap", e.obj.x, e.obj.y + (e.obj.r || 10)); R.fx("zap", res.teleport, gy(res.teleport)); }
      else if (res.jump && c) R.fx("stars", c.x, c.y - 10, { n: 6 });
    });
  }

  /* ================================================================
     SKY, CLOUDS, FAR LAYERS
     ================================================================ */
  var STARS = [];
  (function () { var r = SB.rng ? SB.rng(777) : Math.random; for (var i = 0; i < 90; i++) STARS.push(r(), r() * 0.75, 0.5 + r() * 1.3, r() * TAU); })();
  var skyGrad = null, skyKey = "";
  function drawSky() {
    screenT();
    var gs = sy_(gy(cam.x)), key = rgb(cur.skyT) + rgb(cur.skyB) + (gs | 0) + "|" + H;
    if (key !== skyKey) {
      skyKey = key;
      skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(40, gs));
      skyGrad.addColorStop(0, rgb(cur.skyT)); skyGrad.addColorStop(1, rgb(cur.skyB));
    }
    ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, W, H);
    // stars
    var sa = clamp((nightK - 0.25) / 0.5, 0, 1);
    if (sa > 0) {
      ctx.fillStyle = "#fffbe8";
      for (var i = 0; i < STARS.length; i += 4) {
        var tw = 0.55 + 0.45 * Math.sin(now * 1.7 + STARS[i + 3]);
        var x = ((STARS[i] * (W + 200) - cam.x * 0.02) % (W + 200) + W + 200) % (W + 200) - 100, y = STARS[i + 1] * gs;
        ctx.globalAlpha = sa * tw;
        var s = STARS[i + 2];
        if (s > 1.5) { ctx.beginPath(); starPath(ctx, x, y, s * 1.9, s * 0.5, 4, 0); ctx.fill(); }
        else ctx.fillRect(x - s / 2, y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    }
    // sun & moon
    var hour = game && game.world && game.world.hour != null ? game.world.hour : 12;
    var S = Math.min(W, H);
    var dayP = clamp((hour - 5) / 16, 0, 1);
    var sunX = W * (0.12 + 0.76 * dayP), sunY = lerp(gs + 40, H * 0.13, Math.sin(dayP * PI));
    if (dayP > 0 && dayP < 1 && sunY < gs + 30) {
      var sp = sprite("sun", bucket(dpr * S / 500), 160, 160, 80, 80, drawSun, 0, 0, true);
      ctx.save(); ctx.translate(sunX, sunY); var sc = S / 500; ctx.scale(sc, sc); ctx.rotate(Math.sin(now * 0.5) * 0.06);
      var wk0 = game && game.world && game.world.weather ? game.world.weather.kind : "sun";
      ctx.globalAlpha = clamp(light * 1.2, 0, 1) * (wk0 === "storm" ? 0.25 : wk0 === "rain" || wk0 === "snow" ? 0.45 : wk0 === "cloudy" ? 0.8 : 1);
      if (sp) blit(ctx, sp); ctx.restore(); ctx.globalAlpha = 1;
    }
    var np = ((hour + 24 - 19) % 24) / 11; // 19:00 -> 06:00
    if (np >= 0 && np <= 1 && nightK > 0.05) {
      var mx = W * (0.15 + 0.7 * np), my = lerp(gs + 30, H * 0.12, Math.sin(np * PI));
      var ms = sprite("moon", bucket(dpr * S / 500), 140, 140, 70, 70, drawMoon, 0, 0, true);
      ctx.save(); ctx.translate(mx, my); var mc = S / 500; ctx.scale(mc, mc); ctx.globalAlpha = clamp(nightK * 1.4, 0, 1);
      if (ms) blit(ctx, ms); ctx.restore(); ctx.globalAlpha = 1;
    }
  }
  function drawSun(g) {
    var gr = g.createRadialGradient(0, 0, 10, 0, 0, 80);
    gr.addColorStop(0, "rgba(255,240,170,0.9)"); gr.addColorStop(0.45, "rgba(255,220,120,0.25)"); gr.addColorStop(1, "rgba(255,220,120,0)");
    g.fillStyle = gr; g.fillRect(-80, -80, 160, 160);
    g.beginPath(); for (var i = 0; i < 12; i++) { var a = i * TAU / 12; g.moveTo(Math.cos(a - 0.12) * 34, Math.sin(a - 0.12) * 34); g.lineTo(Math.cos(a) * 46, Math.sin(a) * 46); g.lineTo(Math.cos(a + 0.12) * 34, Math.sin(a + 0.12) * 34); }
    g.fillStyle = "#ffd85c"; g.fill();
    g.beginPath(); circ(g, 0, 0, 30); fillStroke(g, "#ffe27a", "#f0a93c", 3);
    g.beginPath(); circ(g, -9, -10, 7); g.fillStyle = "rgba(255,255,255,0.5)"; g.fill();
    g.lineWidth = 3; g.strokeStyle = "#8a4b1c"; g.lineCap = "round";
    g.beginPath(); g.arc(-10, 0, 4.5, PI * 1.1, PI * 1.9); g.stroke(); g.beginPath(); g.arc(10, 0, 4.5, PI * 1.1, PI * 1.9); g.stroke();
    g.beginPath(); g.arc(0, 6, 6, 0.15 * PI, 0.85 * PI); g.stroke();
    g.beginPath(); ell(g, -17, 8, 5, 3, 0); ell(g, 17, 8, 5, 3, 0); g.fillStyle = "rgba(255,120,110,0.45)"; g.fill();
  }
  function drawMoon(g) {
    var gr = g.createRadialGradient(0, 0, 10, 0, 0, 70);
    gr.addColorStop(0, "rgba(220,230,255,0.55)"); gr.addColorStop(0.5, "rgba(200,215,255,0.14)"); gr.addColorStop(1, "rgba(200,215,255,0)");
    g.fillStyle = gr; g.fillRect(-70, -70, 140, 140);
    g.beginPath(); circ(g, 0, 0, 26); fillStroke(g, "#fff4c9", "#d8c98a", 2.5);
    g.beginPath(); circ(g, 9, -9, 5); circ(g, -10, 10, 3.5); circ(g, 12, 9, 2.5); g.fillStyle = "rgba(210,190,120,0.35)"; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = "#7a6a3a"; g.lineCap = "round";
    g.beginPath(); g.arc(-8, -2, 4, 0.1 * PI, 0.9 * PI); g.stroke(); g.beginPath(); g.arc(8, -2, 4, 0.1 * PI, 0.9 * PI); g.stroke();
    g.beginPath(); g.arc(0, 7, 3, 0.2 * PI, 0.8 * PI); g.stroke();
    g.beginPath(); ell(g, -14, 6, 4, 2.4, 0); ell(g, 14, 6, 4, 2.4, 0); g.fillStyle = "rgba(255,140,140,0.4)"; g.fill();
  }

  var CLOUDS = [];
  (function () { for (var i = 0; i < 10; i++) CLOUDS.push({ u: hash(i * 7 + 1), y: 30 + hash(i * 13 + 5) * 170, s: 0.7 + hash(i * 3 + 2) * 0.7, v: i % 3, sp: 4 + hash(i * 11) * 8 }); })();
  function drawCloud(g, v, dark) {
    var a = v === 0 ? [-40, 0, 26, -10, -14, 32, 22, -6, 28, 48, 4, 20, -62, 8, 16]
      : v === 1 ? [-30, 0, 22, 0, -12, 28, 30, 0, 22, 54, 8, 14]
        : [-50, 4, 20, -22, -10, 26, 10, -18, 30, 42, -4, 24, 68, 8, 14];
    blobs(g, a, dark ? "#9aa3b8" : "#ffffff", dark ? "rgba(70,78,100,0.5)" : "rgba(160,190,230,0.55)", 1.6);
    g.beginPath(); for (var i = 0; i < a.length; i += 3) circ(g, a[i] - a[i + 2] * 0.2, a[i + 1] - a[i + 2] * 0.25, a[i + 2] * 0.55); g.fillStyle = dark ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.9)"; g.fill();
  }
  function drawClouds() {
    var w = game && game.world, wk = (w && w.weather && w.weather.kind) || "sun", it = (w && w.weather && w.weather.intensity) || 0.6;
    var count = wk === "sun" ? 4 : wk === "cloudy" ? 8 : 10;
    var dark = wk === "rain" || wk === "storm";
    var alpha = cur.clouds * (wk === "sun" ? 0.9 : 1);
    if (alpha < 0.05) return;
    var span = W + 420, k = bucket(Z * dpr);
    ctx.globalAlpha = alpha * (1 - nightK * 0.55);
    for (var i = 0; i < count; i++) {
      var c = CLOUDS[i];
      var x = ((c.u * span - cam.x * 0.12 * Z + now * c.sp * (1 + Math.abs(wind) * 3) * (wind < 0 ? -1 : 1)) % span + span) % span - 210;
      var y = sy_(c.y - 60 * (1 - (i % 2))) - (cam.y - 330) * Z * 0.6;
      var sp = sprite("cloud" + c.v + (dark ? "d" : ""), k, 190, 110, 95, 60, drawCloud, c.v, dark && it > 0.3);
      if (!sp) continue;
      var sc = c.s * (dark ? 1.25 : 1);
      ctx.setTransform(dpr * Z * sc, 0, 0, dpr * Z * sc, x * dpr, y * dpr);
      blit(ctx, sp);
    }
    ctx.globalAlpha = 1;
  }

  // far band height profiles (band coordinate u ~ world x)
  var BAND_STEP = 16, BAND_PAD = 4000, BAND_N = Math.ceil((WW + BAND_PAD * 2) / BAND_STEP) + 2;
  var bandFar = new Float32Array(BAND_N), bandMid = new Float32Array(BAND_N);
  function tri(x) { x = x - Math.floor(x); return 1 - Math.abs(x - 0.5) * 2; }
  function prof(room, v, layer) {
    var ph = layer * 1.7;
    switch (room) {
      case 0: return 60 + 120 * Math.pow(tri(v / 140 + ph), 1.6) * (0.55 + 0.45 * Math.sin(v * 0.006 + ph)) + 18 * tri(v / 37);
      case 1: return 90 + 26 * Math.abs(Math.sin(v * 0.045 + ph)) + 30 * Math.sin(v * 0.0045 + ph) + 14 * Math.abs(Math.sin(v * 0.11));
      case 2: return 60 + 40 * Math.sin(v * 0.0062 + ph) + 22 * Math.sin(v * 0.017 + 1 + ph);
      case 3: var b = Math.floor(v / 46 + ph * 3); return 70 + 70 * hash(b * 3 + layer) + (hash(b * 7) > 0.7 ? 30 : 0);
      case 4: return 34 + 18 * Math.sin(v * 0.008 + ph) + 8 * Math.sin(v * 0.023);
      default: return 110 + 170 * Math.pow(tri(v / 210 + ph), 1.4) + 30 * tri(v / 61 + ph);
    }
  }
  (function buildBands() {
    for (var i = 0; i < BAND_N; i++) {
      var u = i * BAND_STEP - BAND_PAD, f = u / RW - 0.5, a = Math.floor(f), t = ss((f - a - 0.25) / 0.5);
      var ra = clamp(a, 0, NR - 1), rb = clamp(a + 1, 0, NR - 1);
      bandFar[i] = lerp(prof(ra, u * 0.25, 0), prof(rb, u * 0.25, 0), t);
      bandMid[i] = lerp(prof(ra, u * 0.5, 1), prof(rb, u * 0.5, 1), t) * 0.62;
    }
  })();
  function bandAt(arr, u) {
    var f = (u + BAND_PAD) / BAND_STEP, i = clamp(f | 0, 0, BAND_N - 2), t = f - i;
    return arr[i] + (arr[i + 1] - arr[i]) * t;
  }
  function drawBand(arr, p, col, baseY, hs) {
    screenT();
    var base = sy_(baseY), step = 8;
    ctx.beginPath(); ctx.moveTo(-10, H + 10);
    for (var x = -10; x <= W + step; x += step) {
      var u = cam.x + (x - W / 2) / (p * Z);
      ctx.lineTo(x, base - bandAt(arr, u) * Z * hs);
    }
    ctx.lineTo(W + 10, H + 10); ctx.closePath();
    ctx.fillStyle = rgb(col); ctx.fill();
  }

  /* ================================================================
     TERRAIN, WATER, CEILINGS
     ================================================================ */
  var gGrad = null, gKey = "";
  function roomGradient(x0, x1, arr, key) {
    var g = ctx.createLinearGradient(x0, 0, x1, 0), span = x1 - x0;
    var r0 = roomIdx(x0), r1 = roomIdx(x1);
    g.addColorStop(0, rgb(arr[r0]));
    for (var r = r0 + 1; r <= r1; r++) {
      var b = r * RW;
      g.addColorStop(clamp((b - 70 - x0) / span, 0, 1), rgb(arr[r - 1]));
      g.addColorStop(clamp((b + 70 - x0) / span, 0, 1), rgb(arr[r]));
    }
    g.addColorStop(1, rgb(arr[r1]));
    return g;
  }
  var GS = new Float32Array(1200);
  function drawTerrain() {
    worldT();
    var x0 = Math.floor((view.x0 - 20) / 10) * 10, x1 = Math.ceil((view.x1 + 20) / 10) * 10, bot = view.y1 + 20;
    var n = 0, x;
    for (x = x0; x <= x1 && n < GS.length; x += 10) GS[n++] = gy(x);
    function path(off) {
      ctx.beginPath(); ctx.moveTo(x0, bot);
      for (var i = 0; i < n; i++) ctx.lineTo(x0 + i * 10, GS[i] + off);
      ctx.lineTo(x0 + (n - 1) * 10, bot); ctx.closePath();
    }
    path(0); ctx.fillStyle = roomGradient(x0, x1, GROUND); ctx.fill();
    path(16); ctx.fillStyle = roomGradient(x0, x1, DIRTC); ctx.fill();
    // soil bands & pebbles (deterministic per 40px cell)
    ctx.beginPath();
    for (x = Math.floor(x0 / 40) * 40; x < x1; x += 40) {
      if (x > 3 * RW && x < 4 * RW) continue;
      var h = hash(x * 0.25 | 0), yy = gy(x + 20) + 30 + h * 50;
      ell(ctx, x + 20 + h * 14, yy, 5 + h * 5, 3 + h * 2, 0);
      if (h > 0.5) ell(ctx, x + 6, yy + 34, 3.5, 2.5, 0);
    }
    ctx.fillStyle = "rgba(0,0,0,0.13)"; ctx.fill();
    // grassy / snowy / tiled lip
    ctx.beginPath();
    for (var i = 0; i < n; i++) { if (i === 0) ctx.moveTo(x0, GS[0] + 1); else ctx.lineTo(x0 + i * 10, GS[i] + 1); }
    ctx.lineWidth = 9; ctx.lineJoin = "round"; ctx.strokeStyle = roomGradient(x0, x1, LIPC); ctx.stroke();
    ctx.lineWidth = 2.5; ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    for (i = 0; i < n; i++) { if (i === 0) ctx.moveTo(x0, GS[0] - 2); else ctx.lineTo(x0 + i * 10, GS[i] - 2); }
    ctx.stroke();
    // lab floor: tiles + lime safety stripe
    var lx0 = Math.max(x0, 3 * RW + 10), lx1 = Math.min(x1, 4 * RW - 10);
    if (lx1 > lx0) {
      ctx.beginPath();
      for (x = Math.ceil(lx0 / 60) * 60; x < lx1; x += 60) { var g0 = gy(x); ctx.moveTo(x, g0 + 6); ctx.lineTo(x - 8, g0 + 40); }
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(40,46,62,0.35)"; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx0, gy(lx0) + 9); ctx.lineTo(lx1, gy(lx1) + 9);
      ctx.lineWidth = 2.5; ctx.strokeStyle = "#c5ff49"; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
    }
    // frost peak: sparkly snow glints
    var px0 = Math.max(x0, 5 * RW), px1 = x1;
    if (px1 > px0) {
      ctx.fillStyle = "#ffffff";
      for (x = Math.ceil(px0 / 37) * 37; x < px1; x += 37) {
        var tw = Math.sin(now * 3 + x) * 0.5 + 0.5;
        if (tw > 0.7) { ctx.beginPath(); starPath(ctx, x, gy(x) + 8 + hash(x) * 20, 3 * tw, 0.8, 4, 0); ctx.fill(); }
      }
    }
  }

  function drawWater() {
    var ws = game && game.world && game.world.water;
    if (!ws || !ws.length) return;
    worldT();
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i];
      if (w.x1 < view.x0 || w.x0 > view.x1) continue;
      var x, y = w.y;
      ctx.beginPath(); ctx.moveTo(w.x0 - 6, y);
      for (x = w.x0; x <= w.x1; x += 10) ctx.lineTo(x, y + Math.sin(x * 0.06 + now * 2.2) * 1.6);
      ctx.lineTo(w.x1 + 6, y);
      for (x = w.x1; x >= w.x0; x -= 10) ctx.lineTo(x, Math.max(y, gy(x) + 2));
      ctx.closePath();
      ctx.fillStyle = nightK > 0.5 ? "rgba(40,90,170,0.72)" : "rgba(63,182,232,0.62)"; ctx.fill();
      // surface highlight
      ctx.beginPath();
      for (x = w.x0; x <= w.x1; x += 10) { var yy = y + Math.sin(x * 0.06 + now * 2.2) * 1.6; if (x === w.x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
      ctx.lineWidth = 3; ctx.strokeStyle = "rgba(220,248,255,0.85)"; ctx.stroke();
      // glints
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (x = w.x0 + 20; x < w.x1 - 10; x += 34) {
        var ph = Math.sin(now * 1.5 + x * 0.3);
        if (ph > 0.2) ctx.fillRect(x + Math.sin(now + x) * 6, y + 8 + hash(x) * 14, 10 * ph, 2);
      }
    }
  }

  function drawCeilings() {
    // Grump Hollow: a rocky overhang with stalactites
    if (view.x0 < RW + 60) {
      worldT();
      var top = Math.min(view.y0 - 20, -200);
      ctx.beginPath(); ctx.moveTo(-20, top);
      for (var x = -20; x <= RW + 80; x += 28) {
        var h = hash(Math.floor(x / 28) + 900), taper = x > RW - 160 ? (x - (RW - 160)) * 1.9 : 0;
        var base = 34 + h * 18 - taper, spike = h > 0.55 ? 40 + h * 70 : 8 + h * 12;
        ctx.lineTo(x, base);
        ctx.lineTo(x + 14, base + spike - taper * 0.3);
      }
      ctx.lineTo(RW + 100, top); ctx.closePath();
      ctx.fillStyle = "#231a33"; ctx.fill();
      ctx.lineWidth = 4; ctx.strokeStyle = "#3d2f57"; ctx.stroke();
      // a few glowing drips
      for (var k = 0; k < 7; k++) {
        var gx = 80 + k * 120 + hash(k + 40) * 40;
        if (gx > RW - 140) break;
        glow(gx, 60 + hash(k + 3) * 50, 26, "#b48cff", 0.28 + 0.12 * Math.sin(now * 2 + k));
      }
    }
  }

  /* ================================================================
     DECOR
     ================================================================ */
  // def: [w, h, ax, ay] bounding box in local units (base anchor), sway amount, live?
  var DDEF = {
    tree: [200, 210, 100, 200, 0.025], pine: [120, 190, 60, 182, 0.02], bush: [110, 70, 55, 62, 0.015], rock: [110, 70, 55, 64, 0],
    crystal: [80, 90, 40, 84, 0], mushroom_big: [140, 150, 70, 144, 0.012], lamp: [70, 140, 35, 132, 0], cable: [150, 30, 75, 20, 0],
    cave_mouth: [300, 220, 150, 210, 0], pipe: [60, 330, 30, 50, 0], dock: [200, 80, 100, 18, 0], reeds: [70, 110, 35, 104, 0.06],
    snowdrift: [140, 50, 70, 44, 0], flower: [30, 44, 15, 40, 0.07], grass: [44, 34, 22, 30, 0.08], sign: [70, 80, 35, 74, 0],
    bones: [70, 30, 35, 22, 0], nest: [120, 50, 60, 36, 0], lily: [56, 20, 28, 10, 0], _unk: [60, 50, 30, 44, 0]
  };
  var LIVE_DECOR = { lab_wall: 1, window: 1, screen: 1 };
  // art scale per type so decor sits right next to ~45px-tall smols
  var DSCALE = { snowdrift: 0.7, tree: 0.74, pine: 0.8, bush: 0.85, mushroom_big: 0.8, flower: 0.62, grass: 0.72, reeds: 0.85, cave_mouth: 0.9, rock: 0.85 };
  var BACKMOST = { lab_wall: 1, pipe: 1, cave_mouth: 1 };
  // front decor that something is standing behind gets see-through
  function occluded(x, half, top) {
    var cs = game.creatures, os = game.world.objects, i;
    for (i = 0; i < cs.length; i++) { var c = cs[i]; if (c && !c.gone && Math.abs(c.x - x) < half + creatureR(c) * 0.6 && c.y > top) return true; }
    for (i = 0; i < os.length; i++) { var o = os[i]; if (!o.fixed && o.heldBy == null && Math.abs(o.x - x) < half && o.y + o.r > top) return true; }
    return false;
  }
  function drawDecorPass(layer) {
    var ds = game && game.world && game.world.decor;
    if (!ds) return;
    if (layer === "back") { decorPass(ds, "back", 1); decorPass(ds, "back", 2); }
    else decorPass(ds, layer, 0);
  }
  function decorPass(ds, layer, sub) {
    var kz = Z * dpr;
    for (var i = 0; i < ds.length; i++) {
      var d = ds[i];
      if ((d.layer || "back") !== layer) continue;
      if (sub && (sub === 1) !== !!BACKMOST[d.type]) continue;
      var type = d.type, s = (d.s || 1) * (DSCALE[type] || 1);
      if (type === "lab_wall") { if (d.x + (d.w || 880) / 2 > view.x0 && d.x - (d.w || 880) / 2 < view.x1) drawLabWall(d); continue; }
      var def = DDEF[type] || (LIVE_DECOR[type] ? null : DDEF._unk);
      var y = d.y != null ? d.y : gy(d.x);
      if (!def) { if (visible(d.x, y, 120 * s)) drawLiveDecor(d, y, s); continue; }
      if (d.x + def[0] * s < view.x0 || d.x - def[0] * s > view.x1) continue;
      var ri = decorRoom(d), v = d.v | 0;
      if (type === "lamp" && v === 0 && ri === 3) { drawCeilingLamp(d, y, s); continue; }
      var sp = sprite("d|" + type + "|" + ri + "|" + v + "|" + (d.text || ""), bucket(kz * s), def[0], def[1], def[2], def[3], drawDecor, d, ri);
      var sw = def[4] ? Math.sin(now * 1.3 + d.x * 0.013) * def[4] * (1 + Math.abs(wind) * 2.5) + wind * def[4] * 0.8 : 0;
      local(d.x, y, sw, s);
      var fade = layer === "front" && def[1] * s > 16 && occluded(d.x, def[0] * s * 0.4, y - def[3] * s);
      if (fade) ctx.globalAlpha = 0.45;
      if (sp) blit(ctx, sp); else drawDecor(ctx, d, ri);
      if (fade) ctx.globalAlpha = 1;
      decorLights(d, type, y, s, ri, v);
    }
  }
  function decorLights(d, type, y, s, ri, v) {
    if (type === "lamp") { var on = clamp(1 - light * 1.3 + 0.25, 0, 1); if (on > 0) { glow(d.x, y - 112 * s, 110 * s, "#ffd27a", on * 0.85); local(d.x, y, 0, s); ctx.globalAlpha = on; ctx.beginPath(); circ(ctx, 0, -112, 9); ctx.fillStyle = "#fff3c4"; ctx.fill(); ctx.globalAlpha = 1; } }
    else if (type === "crystal") glow(d.x, y - 30 * s, 70 * s, v === 1 ? "#9fe8ff" : "#c08bff", 0.18 + nightK * 0.5 + 0.08 * Math.sin(now * 2 + d.x));
    else if (type === "mushroom_big" && (ri === 0 || v === 2)) glow(d.x, y - 90 * s, 90 * s, "#5fffe0", 0.15 + nightK * 0.55);
    else if (type === "cave_mouth" && nightK > 0.3) {
      // eyes in the dark
      var bl = (Math.sin(now * 0.7 + d.x) > 0.95) ? 0.1 : 1;
      local(d.x, y, 0, s); ctx.fillStyle = "#ffe14a"; ctx.globalAlpha = nightK * bl;
      ctx.beginPath(); ell(ctx, -16, -60, 5, 3, 0.2); ell(ctx, 6, -60, 5, 3, -0.2); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  function drawDecor(g, d, ri) {
    var P = RP[ri] || RP[2], v = d.v | 0, o = P.out, lw = 2;
    g.lineCap = "round"; g.lineJoin = "round";
    switch (d.type) {
      case "tree":
        if (v === 2 || (ri === 0 && v !== 1)) { // dead twisty tree
          g.strokeStyle = o; g.lineWidth = 15; dTreeBranches(g); g.strokeStyle = "#4b3863"; g.lineWidth = 10; dTreeBranches(g);
          g.beginPath(); circ(g, -38, -128, 7); circ(g, 44, -118, 6); circ(g, 8, -160, 6); g.fillStyle = "#c08bff"; g.fill();
        } else if (v === 3 || ri === 4) { // palm
          g.beginPath(); g.moveTo(-6, 0); g.quadraticCurveTo(-4, -80, 14, -150); g.lineTo(26, -148); g.quadraticCurveTo(10, -80, 10, 0); g.closePath(); fillStroke(g, "#c48d55", o, lw);
          g.beginPath(); for (var k = 1; k < 7; k++) { var yy = -k * 22, xx = (k / 7) * 14; g.moveTo(-4 + xx, yy); g.lineTo(10 + xx, yy - 3); } g.strokeStyle = "rgba(90,50,20,0.35)"; g.stroke();
          for (var f = 0; f < 6; f++) {
            var a = -PI / 2 + (f - 2.5) * 0.55;
            g.beginPath(); g.moveTo(20, -150);
            g.quadraticCurveTo(20 + Math.cos(a) * 50, -150 + Math.sin(a) * 50 - 20, 20 + Math.cos(a) * 82, -150 + Math.sin(a) * 40 + 26);
            g.quadraticCurveTo(20 + Math.cos(a) * 40, -150 + Math.sin(a) * 20, 20, -146); fillStroke(g, f % 2 ? P.leaf : P.leaf2, o, lw);
          }
          g.beginPath(); circ(g, 14, -144, 7); circ(g, 26, -142, 6); fillStroke(g, "#8a5a2b", o, lw);
        } else {
          var dark = v === 1 || ri === 1;
          g.beginPath(); g.moveTo(-9, 0); g.lineTo(-6, -80); g.lineTo(6, -80); g.lineTo(9, 0); g.closePath(); fillStroke(g, P.trunk, o, lw);
          var sc = 1 + (v % 2) * 0.1, c1 = dark ? P.leaf : ri === 5 ? P.leaf : P.leaf;
          var A = [0, -110 * sc, 48, -36, -88, 34, 38, -86, 34, -16, -140 * sc, 32, 22, -130 * sc, 30];
          blobs(g, A, c1, o, lw);
          g.beginPath(); circ(g, -14, -124 * sc, 18); circ(g, -36, -94, 14); circ(g, 18, -138 * sc, 12); g.fillStyle = P.leaf2; g.fill();
          if (ri === 5) { g.beginPath(); ell(g, -10, -150 * sc, 34, 12, 0); ell(g, 26, -134 * sc, 18, 8, 0.2); ell(g, -44, -108, 16, 7, -0.2); g.fillStyle = "#ffffff"; g.fill(); }
          else if (!dark) { g.beginPath(); for (var q = 0; q < 6; q++) circ(g, -36 + hash(q + 5) * 76, -140 + hash(q + 9) * 70, 3); g.fillStyle = "rgba(255,255,255,0.55)"; g.fill(); }
        }
        break;
      case "pine":
        g.beginPath(); g.rect(-7, -26, 14, 26); fillStroke(g, P.trunk, o, lw);
        var pc = ri === 0 ? "#3e2f5c" : ri === 1 ? "#1f6b5c" : ri === 5 ? "#2f7a66" : "#2f8f4f";
        for (var t = 0; t < 3; t++) {
          var by = -22 - t * 42, wv = 50 - t * 12;
          g.beginPath(); g.moveTo(-wv, by); g.quadraticCurveTo(0, by + 10, wv, by); g.lineTo(6, by - 64); g.quadraticCurveTo(0, by - 70, -6, by - 64); g.closePath(); fillStroke(g, pc, o, lw);
          if (ri === 5 || v === 2) { g.beginPath(); g.moveTo(-wv * 0.55, by - 26); g.quadraticCurveTo(0, by - 18, wv * 0.55, by - 26); g.lineTo(5, by - 62); g.quadraticCurveTo(0, by - 68, -5, by - 62); g.closePath(); g.fillStyle = "#f4f8ff"; g.fill(); }
        }
        break;
      case "bush":
        var bc = ri === 0 ? P.leaf : ri === 5 ? "#5f9e86" : P.leaf;
        blobs(g, [-30, -20, 22, 0, -34, 28, 30, -22, 22, -10, -14, 22, 16, -14, 22], bc, o, lw);
        g.beginPath(); circ(g, -8, -44, 12); circ(g, -34, -28, 9); g.fillStyle = P.leaf2; g.fill();
        if (v === 1) { g.beginPath(); for (var b = 0; b < 5; b++) circ(g, -34 + b * 16, -18 - hash(b + 2) * 22, 4); g.fillStyle = "#ff7eb6"; g.fill(); }
        break;
      case "rock":
        g.beginPath(); g.moveTo(-46, 0); g.bezierCurveTo(-50, -30, -26, -52, 0, -50); g.bezierCurveTo(30, -50, 50, -30, 46, 0); g.closePath(); fillStroke(g, P.rock, o, lw);
        g.beginPath(); ell(g, -14, -34, 16, 8, -0.3); g.fillStyle = P.rock2; g.fill();
        g.beginPath(); g.moveTo(10, -18); g.lineTo(20, -10); g.strokeStyle = "rgba(0,0,0,0.2)"; g.lineWidth = 2; g.stroke();
        if (v === 2 || ri === 5) { g.beginPath(); g.moveTo(-40, -22); g.bezierCurveTo(-40, -46, -20, -54, 0, -52); g.bezierCurveTo(26, -52, 42, -38, 42, -22); g.quadraticCurveTo(20, -32, 0, -28); g.quadraticCurveTo(-20, -34, -40, -22); g.fillStyle = "#ffffff"; g.fill(); }
        break;
      case "crystal":
        var cc = v === 1 ? ["#bff0ff", "#7fd0f0"] : ["#d6b4ff", "#9a6ae0"];
        crystalShard(g, -14, 0, 12, 52, -0.3, cc, o); crystalShard(g, 14, 0, 11, 44, 0.35, cc, o); crystalShard(g, 0, 0, 15, 72, 0, cc, o);
        break;
      case "mushroom_big":
        var glowy = ri === 0 || v === 2;
        g.beginPath(); g.moveTo(-12, 0); g.quadraticCurveTo(-8, -60, -10, -92); g.lineTo(10, -92); g.quadraticCurveTo(8, -60, 12, 0); g.closePath(); fillStroke(g, "#f3e6cf", o, lw);
        g.beginPath(); g.moveTo(-62, -84); g.bezierCurveTo(-60, -150, 60, -150, 62, -84); g.quadraticCurveTo(0, -70, -62, -84); g.closePath();
        fillStroke(g, glowy ? "#3fd9c0" : v === 1 ? "#ff9f43" : "#e0566e", o, lw);
        g.beginPath(); circ(g, -30, -112, 9); circ(g, 4, -126, 11); circ(g, 34, -104, 8); circ(g, -6, -96, 6); g.fillStyle = glowy ? "#c8fff4" : "#fff4ea"; g.fill();
        break;
      case "lamp": // standing lamp post
        g.beginPath(); g.rect(-4, -104, 8, 104); fillStroke(g, "#3a3550", o, lw);
        g.beginPath(); ell(g, 0, -2, 14, 5, 0); fillStroke(g, "#3a3550", o, lw);
        g.beginPath(); g.moveTo(-14, -100); g.lineTo(14, -100); g.lineTo(10, -126); g.lineTo(-10, -126); g.closePath(); fillStroke(g, "#fff1c2", o, lw);
        g.beginPath(); g.moveTo(-18, -126); g.lineTo(18, -126); g.lineTo(0, -138); g.closePath(); fillStroke(g, "#3a3550", o, lw);
        break;
      case "cable":
        g.beginPath(); g.moveTo(-70, 2); g.bezierCurveTo(-40, -16, -10, 12, 20, -4); g.bezierCurveTo(40, -14, 52, 0, 62, -2);
        g.lineWidth = 7; g.strokeStyle = o; g.stroke(); g.lineWidth = 4.5; g.strokeStyle = ["#2f3442", "#3a6ea5", "#a03c5a"][v % 3]; g.stroke();
        g.beginPath(); rr(g, 60, -8, 14, 11, 3); fillStroke(g, "#c9ced8", o, 1.5);
        break;
      case "cave_mouth":
        g.beginPath(); g.moveTo(-140, 0); g.bezierCurveTo(-150, -120, -80, -200, 0, -200); g.bezierCurveTo(90, -200, 150, -120, 140, 0); g.closePath(); fillStroke(g, "#4b3c63", o, 3);
        g.beginPath(); ell(g, -60, -150, 30, 16, -0.5); ell(g, 60, -130, 26, 14, 0.5); g.fillStyle = "#5e4c7a"; g.fill();
        g.beginPath(); g.moveTo(-74, 0); g.bezierCurveTo(-80, -80, -40, -120, 0, -120); g.bezierCurveTo(40, -120, 80, -80, 74, 0); g.closePath();
        var cg = g.createRadialGradient(0, -20, 10, 0, -40, 110); cg.addColorStop(0, "#07040c"); cg.addColorStop(1, "#1d1429"); g.fillStyle = cg; g.fill();
        g.beginPath(); for (var tt = 0; tt < 5; tt++) { var tx = -50 + tt * 25; g.moveTo(tx - 7, -112 + Math.abs(tt - 2) * 8); g.lineTo(tx, -96 + Math.abs(tt - 2) * 8); g.lineTo(tx + 7, -112 + Math.abs(tt - 2) * 8); } g.fillStyle = "#4b3c63"; g.fill();
        break;
      case "pipe":
        var pcl = v === 1 ? "#7d8aa3" : "#8f7a6a";
        g.beginPath(); g.rect(-11, -40, 22, 300); fillStroke(g, pcl, o, lw);
        g.beginPath(); g.rect(-6, -40, 5, 300); g.fillStyle = "rgba(255,255,255,0.25)"; g.fill();
        for (var j = 0; j < 3; j++) { g.beginPath(); rr(g, -15, 10 + j * 100, 30, 12, 3); fillStroke(g, "#5d667a", o, lw); }
        g.beginPath(); circ(g, 0, 160, 16); fillStroke(g, "#e8eef7", o, lw);
        g.beginPath(); g.moveTo(0, 160); g.lineTo(8, 152); g.strokeStyle = "#e0566e"; g.lineWidth = 2.5; g.stroke();
        break;
      case "dock":
        var dw = (d.w || 120) / 2 + 20;
        g.fillStyle = "#7a5233";
        for (var pp = -1; pp <= 1; pp++) { g.beginPath(); g.rect(pp * dw * 0.8 - 5, -6, 10, 50); fillStroke(g, "#7a5233", o, lw); }
        g.beginPath(); rr(g, -dw, -14, dw * 2, 12, 3); fillStroke(g, "#b98552", o, lw);
        g.beginPath(); for (var pl = -dw + 18; pl < dw; pl += 18) { g.moveTo(pl, -13); g.lineTo(pl, -3); } g.strokeStyle = "rgba(80,40,20,0.4)"; g.lineWidth = 1.5; g.stroke();
        break;
      case "reeds":
        for (var rd = 0; rd < 6; rd++) {
          var rx = -22 + rd * 9, rh = 60 + hash(rd + v * 7) * 40, bend = (hash(rd + 3) - 0.5) * 16;
          g.beginPath(); g.moveTo(rx, 0); g.quadraticCurveTo(rx + bend * 0.3, -rh * 0.5, rx + bend, -rh); g.lineWidth = 3; g.strokeStyle = "#4f9a4a"; g.stroke();
          if (rd % 2 === 0) { g.beginPath(); rr(g, rx + bend - 3.5, -rh - 4, 7, 20, 3.5); fillStroke(g, "#8a5a32", o, 1.5); }
        }
        break;
      case "snowdrift":
        g.beginPath(); g.moveTo(-64, 2); g.bezierCurveTo(-50, -30, -10, -40, 10, -30); g.bezierCurveTo(30, -42, 60, -24, 64, 2); g.closePath(); fillStroke(g, "#ffffff", "#b8c8e4", 2);
        g.beginPath(); g.moveTo(-40, 0); g.quadraticCurveTo(0, -14, 50, 0); g.fillStyle = "rgba(160,190,235,0.35)"; g.fill();
        break;
      case "flower":
        var FC = ["#ff7eb6", "#ffd166", "#ffffff", "#c8a2ff", "#ff9f43", "#7aa8ff"];
        g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-4, -16, 0, -28); g.lineWidth = 2.4; g.strokeStyle = "#3f9a43"; g.stroke();
        g.beginPath(); ell(g, 5, -12, 5, 2.5, -0.5); g.fillStyle = "#4fb94a"; g.fill();
        if (v === 5) { g.beginPath(); g.moveTo(0, -28); g.bezierCurveTo(-9, -26, -8, -38, 0, -38); g.bezierCurveTo(8, -38, 9, -26, 0, -28); fillStroke(g, "#7aa8ff", "#2c3c78", 1.4); }
        else {
          g.beginPath(); for (var pt = 0; pt < 5; pt++) { var pa = pt * TAU / 5; circ(g, Math.cos(pa) * 5.5, -30 + Math.sin(pa) * 5.5, 4.4); }
          fillStroke(g, FC[v % 5], "rgba(60,30,50,0.45)", 1.2);
          g.beginPath(); circ(g, 0, -30, 3.2); g.fillStyle = v === 1 ? "#ff9f43" : "#ffd166"; g.fill();
        }
        break;
      case "grass":
        var gc = v === 2 ? "#8a7aa0" : v === 3 ? "#c9c06a" : v === 1 ? "#3f8f5a" : ri === 5 ? "#b7d4c6" : P.grass;
        g.beginPath();
        for (var bl = 0; bl < 6; bl++) { var bx = -15 + bl * 6, bh = 14 + hash(bl + v * 3) * 14, lean = (bl - 2.5) * 2.4; g.moveTo(bx - 3, 0); g.quadraticCurveTo(bx + lean * 0.4, -bh * 0.6, bx + lean, -bh); g.quadraticCurveTo(bx + lean * 0.3 + 1, -bh * 0.5, bx + 3, 0); }
        g.fillStyle = gc; g.fill();
        break;
      case "sign":
        g.beginPath(); g.rect(-4, -56, 8, 56); fillStroke(g, "#8a5a32", o, lw);
        g.beginPath(); rr(g, -32, -70, 64, 26, 5); fillStroke(g, "#d9a46a", o, lw);
        var nm = d.text || (ROOMS[v] && ROOMS[v].name) || "";
        g.fillStyle = "#4a2d18"; g.textAlign = "center"; g.textBaseline = "middle";
        var fs = nm.length > 10 ? 7 : 8.5; g.font = "800 " + fs + "px " + FONT;
        var parts = nm.split(" ");
        if (parts.length > 1 && nm.length > 9) { g.fillText(parts[0], 0, -61.5); g.fillText(parts.slice(1).join(" "), 0, -52); } else g.fillText(nm, 0, -57);
        break;
      case "bones":
        g.lineWidth = 6; g.strokeStyle = o; g.beginPath(); g.moveTo(-20, -4); g.lineTo(18, -10); g.stroke();
        g.lineWidth = 4; g.strokeStyle = "#efe6d6"; g.stroke();
        g.beginPath(); circ(g, -21, -1, 4); circ(g, -21, -8, 4); circ(g, 19, -7, 4); circ(g, 19, -14, 4); fillStroke(g, "#efe6d6", o, 1.2);
        if (v === 1) { g.beginPath(); ell(g, 6, -10, 10, 9, 0); fillStroke(g, "#efe6d6", o, 1.5); g.beginPath(); circ(g, 3, -12, 2.2); circ(g, 10, -12, 2.2); g.fillStyle = o; g.fill(); }
        break;
      case "nest":
        g.beginPath(); g.moveTo(-50, -20); g.quadraticCurveTo(0, 26, 50, -20); g.quadraticCurveTo(0, -6, -50, -20); fillStroke(g, "#b98552", o, lw);
        g.beginPath(); for (var ns = 0; ns < 9; ns++) { var nx = -44 + ns * 11; g.moveTo(nx, -16 + Math.abs(ns - 4) * -1); g.lineTo(nx + 14, -4 + (ns % 2) * 4); } g.strokeStyle = "#7a5233"; g.lineWidth = 2; g.stroke();
        break;
      case "lily":
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 18, 0.25, TAU - 0.25); g.closePath(); g.save(); g.scale(1, 0.38); fillStroke(g, "#58b85a", "#2e6e3a", 3); g.restore();
        if (v === 1) { g.beginPath(); for (var lp = 0; lp < 5; lp++) ell(g, Math.cos(lp * 1.25) * 4, -5 + Math.sin(lp * 1.25) * 1.5, 3.5, 6, lp * 1.25); g.fillStyle = "#ffb3d1"; g.fill(); }
        break;
      default:
        g.beginPath(); g.moveTo(-26, 0); g.bezierCurveTo(-28, -30, 28, -30, 26, 0); g.closePath();
        fillStroke(g, (ROOMS[ri] && ROOMS[ri].accent) || "#b59aff", o, lw);
    }
  }
  function dTreeBranches(g) {
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-6, -60, 4, -100);
    g.moveTo(2, -70); g.quadraticCurveTo(-24, -96, -38, -128);
    g.moveTo(4, -96); g.quadraticCurveTo(30, -100, 44, -118);
    g.moveTo(4, -100); g.quadraticCurveTo(0, -136, 8, -160);
    g.moveTo(-20, -102); g.lineTo(-34, -100);
    g.stroke();
  }
  function crystalShard(g, x, y, w, h, rot, cc, o) {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.beginPath(); g.moveTo(-w, 0); g.lineTo(-w, -h * 0.75); g.lineTo(0, -h); g.lineTo(w, -h * 0.75); g.lineTo(w, 0); g.closePath(); fillStroke(g, cc[0], o, 2);
    g.beginPath(); g.moveTo(0, -h); g.lineTo(0, 0); g.lineTo(w, 0); g.lineTo(w, -h * 0.75); g.closePath(); g.fillStyle = cc[1]; g.globalAlpha = 0.6; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(-w * 0.55, -h * 0.25); g.lineTo(-w * 0.55, -h * 0.65); g.strokeStyle = "rgba(255,255,255,0.8)"; g.lineWidth = 2; g.stroke();
    g.restore();
  }
  function drawLabWall(d) {
    var w = d.w || 880, h = d.h || 330, x0 = d.x - w / 2, fy = d.y != null ? d.y : gy(d.x), top = fy - h;
    worldT();
    // ceiling slab above the wall
    var ct = Math.min(view.y0 - 20, top - 400);
    ctx.beginPath(); ctx.moveTo(x0 - 20, ct); ctx.lineTo(x0 + w + 20, ct); ctx.lineTo(x0 + w + 20, top + 4); ctx.lineTo(x0 - 20, top + 4); ctx.closePath();
    ctx.fillStyle = "#262c3d"; ctx.fill();
    // wall
    ctx.fillStyle = "#3f4a63"; ctx.fillRect(x0, top, w, h + 30);
    // panels
    ctx.beginPath();
    for (var x = x0 + 110; x < x0 + w; x += 110) { ctx.moveTo(x, top); ctx.lineTo(x, fy); }
    ctx.moveTo(x0, top + h * 0.55); ctx.lineTo(x0 + w, top + h * 0.55);
    ctx.lineWidth = 3; ctx.strokeStyle = "#35405a"; ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.05)"; ctx.fillRect(x0, top, w, 22);
    // rivets
    ctx.fillStyle = "#56627e";
    for (x = x0 + 14; x < x0 + w; x += 55) { ctx.fillRect(x, top + 30, 4, 4); ctx.fillRect(x, top + h * 0.55 + 10, 4, 4); }
    // trim + hazard stripe at the base
    ctx.fillStyle = "#2b3245"; ctx.fillRect(x0 - 20, top - 4, w + 40, 14);
    ctx.fillStyle = "#c5ff49"; ctx.globalAlpha = 0.85; ctx.fillRect(x0, top + 12, w, 3); ctx.globalAlpha = 1;
    ctx.fillStyle = "#2d3447"; ctx.fillRect(x0, fy - 26, w, 26);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, fy - 22, w, 10); ctx.clip();
    ctx.beginPath(); for (x = x0 - 20; x < x0 + w + 20; x += 24) { ctx.moveTo(x, fy - 12); ctx.lineTo(x + 12, fy - 12); ctx.lineTo(x + 22, fy - 22); ctx.lineTo(x + 10, fy - 22); ctx.closePath(); }
    ctx.fillStyle = "#e8c53a"; ctx.fill(); ctx.restore();
    // side walls
    ctx.fillStyle = "#262c3d"; ctx.fillRect(x0 - 20, top, 22, h + 10); ctx.fillRect(x0 + w - 2, top, 22, h + 10);
  }
  function drawLiveDecor(d, y, s) {
    var ri = decorRoom(d), v = d.v | 0;
    if (d.type === "window") {
      local(d.x, y, 0, s);
      ctx.beginPath(); rr(ctx, -62, -46, 124, 92, 10); fillStroke(ctx, "#262c3d", null, 0);
      ctx.beginPath(); rr(ctx, -54, -38, 108, 76, 6);
      ctx.fillStyle = rgb(mixInto(cur.t1, SKY[2][0], NSKY[2][0], nightK)); ctx.fill();
      // little hills outside
      ctx.save(); ctx.clip();
      ctx.beginPath(); ctx.moveTo(-60, 40); ctx.quadraticCurveTo(-30, 8 + v * 4, 0, 22); ctx.quadraticCurveTo(30, 6, 60, 26); ctx.lineTo(60, 40); ctx.closePath();
      ctx.fillStyle = rgb(mixInto(cur.t2, GROUND[2], NSKY[2][1], nightK * 0.7)); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-40, -38); ctx.lineTo(-10, -38); ctx.lineTo(-44, 38); ctx.lineTo(-74, 38); ctx.closePath(); ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fill();
      if (nightK > 0.4) { ctx.fillStyle = "#fffbe8"; ctx.globalAlpha = nightK; ctx.fillRect(-30, -20, 2, 2); ctx.fillRect(20, -28, 2, 2); ctx.fillRect(36, -8, 1.5, 1.5); ctx.globalAlpha = 1; }
      ctx.restore();
      ctx.beginPath(); ctx.moveTo(0, -38); ctx.lineTo(0, 38); ctx.moveTo(-54, 0); ctx.lineTo(54, 0); ctx.lineWidth = 5; ctx.strokeStyle = "#262c3d"; ctx.stroke();
      ctx.beginPath(); rr(ctx, -66, 42, 132, 9, 3); ctx.fillStyle = "#56627e"; ctx.fill();
    } else if (d.type === "screen") {
      local(d.x, y, 0, s);
      ctx.beginPath(); rr(ctx, -64, -40, 128, 80, 8); fillStroke(ctx, "#1c2130", INK, 3);
      ctx.beginPath(); rr(ctx, -56, -32, 112, 64, 4); ctx.fillStyle = "#0e1a10"; ctx.fill();
      ctx.save(); ctx.beginPath(); ctx.rect(-56, -32, 112, 64); ctx.clip();
      ctx.fillStyle = "#c5ff49";
      if (v === 0) {
        ctx.font = "800 11px ui-monospace, monospace"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        var words = SB.ALL_WORDS || ["food", "ball", "smol"], off = (now * 10) % 16, base = Math.floor(now * 10 / 16);
        for (var i = 0; i < 6; i++) { var wd = words[(base + i) % words.length]; ctx.globalAlpha = 0.5 + 0.5 * (i === 2); ctx.fillText((i === 2 ? "> " : "  ") + wd, -50, -36 + i * 16 - off + 16); }
        ctx.globalAlpha = 1;
      } else if (v === 1) {
        ctx.beginPath(); for (var x = -56; x <= 56; x += 4) { var yy = Math.sin(x * 0.12 + now * 4) * 12 * Math.sin(now * 0.7 + x * 0.02); if (x === -56) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
        ctx.strokeStyle = "#c5ff49"; ctx.lineWidth = 2; ctx.stroke();
      } else {
        for (var bb = 0; bb < 7; bb++) { var hh = 8 + 40 * (0.5 + 0.5 * Math.sin(now * 2 + bb * 1.3)); ctx.fillRect(-50 + bb * 15, 28 - hh, 10, hh); }
      }
      ctx.restore();
      glow(d.x, y, 80 * s, "#c5ff49", 0.12 + nightK * 0.12);
    } else {
      var sp = sprite("d|_unk|" + ri, bucket(Z * dpr * s), 60, 50, 30, 44, drawDecor, { type: "_unk", v: 0 }, ri);
      local(d.x, y, 0, s); if (sp) blit(ctx, sp);
    }
  }
  function drawCeilingLamp(d, y, s) {
    local(d.x, y, Math.sin(now * 0.8 + d.x) * 0.03, s);
    ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 30); ctx.lineWidth = 2; ctx.strokeStyle = "#1c2130"; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-22, 46); ctx.lineTo(22, 46); ctx.lineTo(10, 28); ctx.lineTo(-10, 28); ctx.closePath(); fillStroke(ctx, "#56627e", INK, 2);
    ctx.beginPath(); circ(ctx, 0, 48, 6); ctx.fillStyle = "#f4ffd6"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(-18, 50); ctx.lineTo(18, 50); ctx.lineTo(70, 290); ctx.lineTo(-70, 290); ctx.closePath();
    ctx.fillStyle = "rgba(240,255,200,0.05)"; ctx.fill();
    glow(d.x, y + 48 * s, 70 * s, "#efffc4", 0.35);
  }

  /* ================================================================
     OBJECTS
     ================================================================ */
  var FOODCOL = { apple: "#ff5a5a", berry: "#6b6bff", carrot: "#ff9f43", cake: "#ffb3d1", fish: "#4fc3d9", shroom_red: "#e0566e", shroom_blue: "#3fb6e8", herb: "#7cd96b" };
  var ROT = "#9aa57a";
  function drawObjectsPass(fixedPass) {
    var os = game && game.world && game.world.objects;
    if (!os) return;
    for (var i = 0; i < os.length; i++) {
      var o = os[i];
      if (!!o.fixed !== fixedPass) continue;
      if (typeof o.heldBy === "number") continue; // drawn with its holder
      if (o.heldBy === "hand") continue; // drawn with the hand (on top)
      var m = (BIG[o.kind] || 0) + (o.r || 10) + 40;
      if (!visible(o.x, o.y, m)) continue;
      drawObject(o, o.x, o.y, 1);
    }
  }
  function drawShadows() {
    var os = game && game.world && game.world.objects, i;
    worldT();
    ctx.beginPath();
    if (os) for (i = 0; i < os.length; i++) {
      var o = os[i];
      if (o.fixed || o.heldBy != null || !visible(o.x, o.y, 60) || o.kind === "butterfly") continue;
      var g = gy(o.x), h = g - (o.y + (o.r || 10)), f = clamp(1 - h / 200, 0.2, 1), r = (o.r || 10) * f;
      if (h < -20) continue;
      ell(ctx, o.x, g + 1, r, r * 0.28, 0);
    }
    var cs = game.creatures || [];
    for (i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c || c.gone || !visible(c.x, c.y, 80)) continue;
      var cg = gy(c.x), ch = cg - c.y, cf = clamp(1 - ch / 260, 0.25, 1), cr = creatureR(c) * 0.95 * cf;
      if (ch < -20) continue;
      ell(ctx, c.x, cg + 1, cr, cr * 0.26, 0);
    }
    ctx.fillStyle = "rgba(20,10,40,0.2)"; ctx.fill();
  }
  function drawObject(o, x, y, sc) {
    var d = o.data || EMPTY, k = o.kind, r = o.r || 10, t = now, rot = 0;
    if (d.wobble > 0.01) rot = Math.sin(t * 18 + o.id) * d.wobble * 0.25;
    if (k === "ball") rot = (x / r) % TAU;
    if (d.flop > 0) rot = Math.sin(t * 25) * 0.6;
    if (d.shake > 0) rot = Math.sin(t * 40) * 0.05 * d.shake;
    local(x, y, rot, sc);
    var f = OBJ[k];
    if (f) f(ctx, o, d, r, t); else genericObj(ctx, o, r);
    // rotten flies
    if (d.rotten) {
      ctx.fillStyle = "#2a2340";
      for (var i = 0; i < 2; i++) {
        var a = t * (5 + i * 2) + i * 3, fx = Math.cos(a) * (r + 6), fy = -r - 6 + Math.sin(a * 1.7) * 6;
        ctx.beginPath(); circ(ctx, fx, fy, 1.6); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.beginPath(); ell(ctx, fx - 1, fy - 2, 1.5, 1, Math.sin(t * 60)); ctx.fill(); ctx.fillStyle = "#2a2340";
      }
    }
  }
  function genericObj(g, o, r) {
    g.beginPath(); circ(g, 0, 0, r); fillStroke(g, "#b59aff", INK, 2);
    var em = SB.KINDS && SB.KINDS[o.kind] && SB.KINDS[o.kind].label;
    if (em) { g.fillStyle = INK; g.font = "800 7px " + FONT; g.textAlign = "center"; g.fillText(em.slice(0, 6), 0, 3); }
  }
  function shine(g, x, y, rx, ry) { g.beginPath(); ell(g, x, y, rx, ry, -0.6); g.fillStyle = "rgba(255,255,255,0.6)"; g.fill(); }
  var OBJ = {
    apple: function (g, o, d, r) {
      g.beginPath(); g.moveTo(0, -r * 0.6); g.bezierCurveTo(r * 1.1, -r * 1.25, r * 1.35, r * 0.6, 0, r); g.bezierCurveTo(-r * 1.35, r * 0.6, -r * 1.1, -r * 1.25, 0, -r * 0.6);
      fillStroke(g, d.rotten ? ROT : "#ff5a5a", INK, 1.8); shine(g, -r * 0.4, -r * 0.15, r * 0.25, r * 0.16);
      g.beginPath(); g.moveTo(0, -r * 0.55); g.lineTo(r * 0.1, -r * 1.05); g.lineWidth = 2; g.strokeStyle = "#6b4226"; g.stroke();
      g.beginPath(); ell(g, r * 0.4, -r * 0.95, r * 0.35, r * 0.16, -0.4); fillStroke(g, "#5fca4f", INK, 1.2);
    },
    berry: function (g, o, d, r) {
      var c = d.rotten ? ROT : "#6b6bff";
      g.beginPath(); circ(g, -r * 0.45, r * 0.2, r * 0.55); circ(g, r * 0.45, r * 0.2, r * 0.55); circ(g, 0, -r * 0.35, r * 0.55); fillStroke(g, c, INK, 1.6);
      g.beginPath(); circ(g, -r * 0.6, 0, r * 0.15); circ(g, r * 0.3, 0, r * 0.15); circ(g, -r * 0.15, -r * 0.55, r * 0.15); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill();
      g.beginPath(); ell(g, r * 0.1, -r * 0.95, r * 0.4, r * 0.15, 0.3); g.fillStyle = "#4fb94a"; g.fill();
    },
    carrot: function (g, o, d, r) {
      g.save(); g.rotate(0.5);
      g.beginPath(); g.moveTo(-r * 0.55, -r * 0.6); g.quadraticCurveTo(0, -r * 0.85, r * 0.55, -r * 0.6); g.quadraticCurveTo(r * 0.3, r * 0.4, 0, r * 1.15); g.quadraticCurveTo(-r * 0.3, r * 0.4, -r * 0.55, -r * 0.6); fillStroke(g, d.rotten ? ROT : "#ff9f43", INK, 1.6);
      g.beginPath(); g.moveTo(-r * 0.3, -r * 0.1); g.lineTo(-r * 0.05, -r * 0.1); g.moveTo(r * 0.2, r * 0.3); g.lineTo(-r * 0.05, r * 0.3); g.lineWidth = 1.2; g.strokeStyle = "rgba(120,50,0,0.5)"; g.stroke();
      g.beginPath(); ell(g, -r * 0.25, -r * 1.0, r * 0.15, r * 0.4, -0.4); ell(g, r * 0.1, -r * 1.1, r * 0.15, r * 0.45, 0); ell(g, r * 0.4, -r * 0.95, r * 0.15, r * 0.4, 0.4); fillStroke(g, "#5fca4f", INK, 1.2);
      g.restore();
    },
    cake: function (g, o, d, r) {
      g.beginPath(); g.moveTo(-r * 0.8, -r * 0.05); g.lineTo(r * 0.8, -r * 0.05); g.lineTo(r * 0.6, r); g.lineTo(-r * 0.6, r); g.closePath(); fillStroke(g, d.rotten ? "#8a8f7a" : "#6fd3ff", INK, 1.6);
      g.beginPath(); g.moveTo(-r * 0.3, 0); g.lineTo(-r * 0.25, r); g.moveTo(r * 0.3, 0); g.lineTo(r * 0.25, r); g.lineWidth = 1; g.strokeStyle = "rgba(0,0,0,0.2)"; g.stroke();
      g.beginPath(); circ(g, -r * 0.45, -r * 0.2, r * 0.42); circ(g, r * 0.45, -r * 0.2, r * 0.42); circ(g, 0, -r * 0.55, r * 0.5); fillStroke(g, d.rotten ? ROT : "#ffb3d1", INK, 1.6);
      g.beginPath(); circ(g, r * 0.1, -r * 1.05, r * 0.24); fillStroke(g, "#ff4d6d", INK, 1.2);
      g.fillStyle = "#ffffff"; g.fillRect(-r * 0.5, -r * 0.5, 2, 2); g.fillStyle = "#c5ff49"; g.fillRect(r * 0.4, -r * 0.35, 2, 2); g.fillStyle = "#ffd166"; g.fillRect(-r * 0.1, -r * 0.3, 2, 2);
    },
    fish: function (g, o, d, r) {
      g.beginPath(); g.moveTo(r * 0.6, 0); g.lineTo(r * 1.2, -r * 0.5); g.lineTo(r * 1.2, r * 0.5); g.closePath(); fillStroke(g, d.rotten ? ROT : "#ff9f43", INK, 1.6);
      g.beginPath(); ell(g, -r * 0.1, 0, r * 0.85, r * 0.55, 0); fillStroke(g, d.rotten ? ROT : "#4fc3d9", INK, 1.6);
      g.beginPath(); ell(g, -r * 0.1, r * 0.2, r * 0.6, r * 0.22, 0); g.fillStyle = "rgba(255,255,255,0.4)"; g.fill();
      g.beginPath(); circ(g, -r * 0.55, -r * 0.1, r * 0.16); g.fillStyle = "#fff"; g.fill(); g.beginPath(); circ(g, -r * 0.58, -r * 0.1, r * 0.09); g.fillStyle = INK; g.fill();
    },
    shroom_red: function (g, o, d, r) { shroom(g, r, d.rotten ? ROT : "#e0566e", "#fff4ea"); },
    shroom_blue: function (g, o, d, r) {
      shroom(g, r, d.rotten ? ROT : "#3fb6e8", "#c8f4ff");
      glow(o.x, o.y - r * 0.3, r * 3.2, "#5fe8ff", 0.12 + nightK * 0.6);
    },
    herb: function (g, o, d, r) {
      g.beginPath(); g.moveTo(0, r * 0.2); g.quadraticCurveTo(-r * 0.3, r * 0.9, r * 0.1, r * 1.1); g.lineWidth = 3; g.strokeStyle = "#e8a0b8"; g.stroke();
      g.beginPath(); ell(g, -r * 0.45, -r * 0.3, r * 0.35, r * 0.7, -0.5); ell(g, r * 0.45, -r * 0.3, r * 0.35, r * 0.7, 0.5); ell(g, 0, -r * 0.6, r * 0.35, r * 0.75, 0); fillStroke(g, d.rotten ? ROT : "#7cd96b", INK, 1.5);
      g.beginPath(); g.moveTo(0, r * 0.2); g.lineTo(0, -r * 1.1); g.strokeStyle = "rgba(30,90,40,0.6)"; g.lineWidth = 1; g.stroke();
    },
    medkit: function (g, o, d, r) {
      g.save(); g.rotate(-0.5);
      g.beginPath(); rr(g, -r * 1.1, -r * 0.5, r * 2.2, r, r * 0.5); fillStroke(g, "#ffffff", INK, 1.6);
      g.beginPath(); g.moveTo(0, -r * 0.5); g.lineTo(-r * 0.6, -r * 0.5); g.arcTo(-r * 1.1, -r * 0.5, -r * 1.1, 0, r * 0.5); g.arcTo(-r * 1.1, r * 0.5, -r * 0.6, r * 0.5, r * 0.5); g.lineTo(0, r * 0.5); g.closePath(); fillStroke(g, "#ff4d6d", INK, 1.6);
      shine(g, -r * 0.6, -r * 0.2, r * 0.3, r * 0.1);
      g.restore();
    },
    ball: function (g, o, d, r) {
      g.beginPath(); circ(g, 0, 0, r); fillStroke(g, "#ffffff", INK, 1.8);
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, 0, PI / 3); g.closePath(); g.moveTo(0, 0); g.arc(0, 0, r, (2 * PI) / 3, PI); g.closePath(); g.moveTo(0, 0); g.arc(0, 0, r, (4 * PI) / 3, (5 * PI) / 3); g.closePath(); g.fillStyle = "#ff5a5a"; g.fill();
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, PI / 3, (2 * PI) / 3); g.closePath(); g.moveTo(0, 0); g.arc(0, 0, r, PI, (4 * PI) / 3); g.closePath(); g.fillStyle = "#ffd166"; g.fill();
      g.beginPath(); circ(g, 0, 0, r); g.lineWidth = 1.8; g.strokeStyle = INK; g.stroke();
      g.beginPath(); circ(g, 0, 0, r * 0.22); fillStroke(g, "#6fd3ff", INK, 1.2);
    },
    plush: function (g, o, d, r) {
      g.beginPath(); circ(g, -r * 0.6, -r * 0.75, r * 0.32); circ(g, r * 0.6, -r * 0.75, r * 0.32); fillStroke(g, "#d9a77a", INK, 1.5);
      g.beginPath(); bean(g, 0, 0, r * 0.95, r * 0.95); fillStroke(g, "#e8bb8e", INK, 1.6);
      g.beginPath(); ell(g, 0, r * 0.4, r * 0.5, r * 0.38, 0); g.fillStyle = "#f6dcc0"; g.fill();
      g.beginPath(); circ(g, -r * 0.35, -r * 0.15, r * 0.12); circ(g, r * 0.35, -r * 0.15, r * 0.12); g.fillStyle = INK; g.fill();
      g.beginPath(); g.moveTo(-r * 0.15, r * 0.1); g.lineTo(r * 0.15, r * 0.1); g.lineTo(0, r * 0.25); g.closePath(); g.fillStyle = "#8a5a3c"; g.fill();
      g.beginPath(); g.moveTo(-r * 0.75, r * 0.1); g.lineTo(-r * 0.6, r * 0.2); g.moveTo(r * 0.6, -r * 0.5); g.lineTo(r * 0.72, -r * 0.4); g.lineWidth = 1; g.strokeStyle = "#8a5a3c"; g.stroke();
    },
    top: function (g, o, d, r, t) {
      var sp = d.spin > 0 ? Math.min(1, d.spin) : 0, sq = sp ? 0.75 + 0.25 * Math.abs(Math.sin(t * 30)) : 1;
      if (sp) g.rotate(Math.sin(t * 7) * 0.12 * sp);
      g.save(); g.scale(sq, 1);
      g.beginPath(); g.moveTo(-r, -r * 0.2); g.quadraticCurveTo(0, -r * 0.7, r, -r * 0.2); g.quadraticCurveTo(r * 0.5, r * 0.5, 0, r); g.quadraticCurveTo(-r * 0.5, r * 0.5, -r, -r * 0.2); fillStroke(g, "#b59aff", INK, 1.6);
      g.beginPath(); g.moveTo(-r * 0.9, -r * 0.15); g.quadraticCurveTo(0, r * 0.25, r * 0.9, -r * 0.15); g.lineWidth = 3; g.strokeStyle = sp ? "#ffd166" : "#ff5fa2"; g.stroke();
      g.beginPath(); g.rect(-r * 0.12, -r * 0.85, r * 0.24, r * 0.5); fillStroke(g, "#ff5fa2", INK, 1.2);
      g.restore();
      if (sp) { g.beginPath(); g.arc(0, 0, r * 1.35, -0.4, 0.5); g.moveTo(-r * 1.35, 0); g.arc(0, 0, r * 1.35, PI - 0.4, PI + 0.5); g.lineWidth = 1.6; g.strokeStyle = "rgba(255,255,255," + (0.8 * sp) + ")"; g.stroke(); }
    },
    musicbox: function (g, o, d, r, t) {
      var pl = d.playing > 0, lid = pl ? Math.abs(Math.sin(t * 8)) * 0.25 : 0;
      g.beginPath(); rr(g, -r, -r * 0.45, r * 2, r * 1.4, 3); fillStroke(g, "#ff7eb6", INK, 1.8);
      g.beginPath(); g.rect(-r, r * 0.05, r * 2, r * 0.18); g.fillStyle = "#ffd166"; g.fill();
      g.save(); g.translate(-r, -r * 0.45); g.rotate(-lid);
      g.beginPath(); rr(g, 0, -r * 0.4, r * 2, r * 0.42, 3); fillStroke(g, "#ff9fcb", INK, 1.6); g.restore();
      g.beginPath(); g.moveTo(r, r * 0.3); g.lineTo(r * 1.4, r * 0.3); g.lineTo(r * 1.4, r * 0.3 + Math.sin(pl ? t * 10 : 0) * r * 0.35); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
      if (pl && Math.random() < 0.04) R.fx("notes", o.x, o.y - r, { n: 1 });
      g.beginPath(); heartPath(g, 0, r * 0.6, r * 0.3); g.fillStyle = "#fff"; g.fill();
    },
    egg: function (g, o, d, r, t) {
      var es = rs(o), hue = es.hue;
      if (hue == null) {
        hue = 40;
        try { if (d.genome && SB.Genome && SB.Genome.look) hue = SB.Genome.look(d.genome).hue; } catch (e) {}
        es.hue = hue;
      }
      var pr = d.progress || 0, wob = Math.max(d.wobble || 0, pr > 0.6 ? 0.15 : 0);
      g.rotate(Math.sin(t * 10 + o.id) * wob * 0.22);
      var warm = d.warmth || 0;
      if (warm > 0.05) glow(o.x, o.y, r * 3, "#ffb35c", warm * 0.4);
      g.beginPath(); g.moveTo(0, -r * 1.2); g.bezierCurveTo(r * 0.95, -r * 1.2, r * 1.05, r, 0, r); g.bezierCurveTo(-r * 1.05, r, -r * 0.95, -r * 1.2, 0, -r * 1.2);
      fillStroke(g, hsl(hue, 45, 93), INK, 1.8);
      g.save(); g.clip();
      g.beginPath(); ell(g, r * 0.45, r * 0.35, r * 0.7, r * 0.9, 0); g.fillStyle = hsl(hue, 50, 80, 0.55); g.fill();
      g.beginPath(); circ(g, -r * 0.3, -r * 0.4, r * 0.16); circ(g, r * 0.35, -r * 0.1, r * 0.12); circ(g, -r * 0.1, r * 0.35, r * 0.18); circ(g, r * 0.1, -r * 0.8, r * 0.1); circ(g, -r * 0.6, r * 0.1, r * 0.1);
      g.fillStyle = hsl(hue, 60, 62); g.fill();
      g.restore();
      shine(g, -r * 0.4, -r * 0.55, r * 0.2, r * 0.3);
      if (pr > 0.5) {
        var c = (pr - 0.5) * 2;
        g.beginPath(); g.moveTo(-r * 0.8, -r * 0.1); g.lineTo(-r * 0.45, -r * 0.3); g.lineTo(-r * 0.2, 0); g.lineTo(r * 0.05, -r * 0.25 * c);
        if (c > 0.35) { g.lineTo(r * 0.3, 0); g.lineTo(r * 0.55, -r * 0.3); }
        if (c > 0.7) { g.lineTo(r * 0.85, -r * 0.05); g.moveTo(-r * 0.2, 0); g.lineTo(-r * 0.25, r * 0.35); }
        g.lineWidth = 1.6; g.strokeStyle = INK; g.stroke();
      }
    },
    butterfly: function (g, o, d, r, t) {
      var fl = d.landed > 0 ? 0.6 + 0.4 * Math.sin(t * 2) : Math.abs(Math.sin(t * 16 + o.id));
      var hue = (o.id * 67) % 360;
      g.save(); g.scale(0.25 + 0.75 * fl, 1);
      g.beginPath(); ell(g, -r * 0.7, -r * 0.4, r * 0.75, r * 0.6, -0.5); ell(g, r * 0.7, -r * 0.4, r * 0.75, r * 0.6, 0.5); fillStroke(g, hsl(hue, 85, 70), INK, 1.4);
      g.beginPath(); ell(g, -r * 0.5, r * 0.45, r * 0.45, r * 0.35, 0.4); ell(g, r * 0.5, r * 0.45, r * 0.45, r * 0.35, -0.4); fillStroke(g, hsl(hue + 40, 85, 75), INK, 1.4);
      g.beginPath(); circ(g, -r * 0.75, -r * 0.45, r * 0.2); circ(g, r * 0.75, -r * 0.45, r * 0.2); g.fillStyle = "rgba(255,255,255,0.75)"; g.fill();
      g.restore();
      g.beginPath(); ell(g, 0, 0, r * 0.18, r * 0.75, 0); g.fillStyle = INK; g.fill();
      g.beginPath(); g.moveTo(0, -r * 0.7); g.quadraticCurveTo(-r * 0.3, -r * 1.2, -r * 0.45, -r * 1.25); g.moveTo(0, -r * 0.7); g.quadraticCurveTo(r * 0.3, -r * 1.2, r * 0.45, -r * 1.25); g.lineWidth = 1; g.strokeStyle = INK; g.stroke();
    },
    beetle: function (g, o, d, r, t) {
      var dir = o.vx < 0 ? -1 : 1, lp = Math.sin(t * 20) * (Math.abs(o.vx || 0) > 1 ? 1 : 0);
      g.scale(dir, 1);
      g.beginPath(); for (var i = -1; i <= 1; i++) { g.moveTo(i * r * 0.5, r * 0.2); g.lineTo(i * r * 0.5 + (i % 2 ? lp : -lp) * 2, r * 0.95); } g.lineWidth = 1.4; g.strokeStyle = INK; g.stroke();
      g.beginPath(); circ(g, r * 0.85, r * 0.1, r * 0.4); g.fillStyle = INK; g.fill();
      g.beginPath(); g.moveTo(-r, r * 0.4); g.bezierCurveTo(-r, -r * 0.9, r, -r * 0.9, r, r * 0.4); g.closePath(); fillStroke(g, "#ff4d4d", INK, 1.5);
      g.beginPath(); g.moveTo(0, -r * 0.55); g.lineTo(0, r * 0.4); g.lineWidth = 1.2; g.stroke();
      g.beginPath(); circ(g, -r * 0.45, -r * 0.05, r * 0.16); circ(g, r * 0.4, -r * 0.1, r * 0.16); circ(g, -r * 0.15, -r * 0.4, r * 0.12); g.fillStyle = INK; g.fill();
      g.beginPath(); circ(g, r * 1.05, 0, r * 0.12); g.fillStyle = "#fff"; g.fill();
    },
    bed: function (g, o, d, r) {
      var b = r; g.translate(0, r);
      g.beginPath(); rr(g, -b * 1.2, -b * 0.95, b * 0.22, b * 0.95, 3); rr(g, b * 0.98, -b * 0.7, b * 0.22, b * 0.7, 3); fillStroke(g, "#9a6b45", INK, 1.8);
      g.beginPath(); rr(g, -b * 1.05, -b * 0.55, b * 2.1, b * 0.36, 4); fillStroke(g, "#ffffff", INK, 1.6);
      g.beginPath(); rr(g, -b * 0.95, -b * 0.85, b * 0.6, b * 0.32, b * 0.15); fillStroke(g, "#fff8e6", INK, 1.5);
      g.beginPath(); g.moveTo(-b * 0.3, -b * 0.62); g.quadraticCurveTo(b * 0.4, -b * 0.8, b * 1.05, -b * 0.6); g.lineTo(b * 1.05, -b * 0.25); g.lineTo(-b * 0.3, -b * 0.25); g.closePath(); fillStroke(g, "#b59aff", INK, 1.6);
      g.beginPath(); for (var i = 0; i < 4; i++) circ(g, -b * 0.1 + i * b * 0.3, -b * 0.42, b * 0.05); g.fillStyle = "#fff"; g.fill();
      g.beginPath(); g.rect(-b * 1.05, -b * 0.2, b * 2.1, b * 0.08); g.fillStyle = "#7a5233"; g.fill();
      g.beginPath(); g.rect(-b * 1.05, -b * 0.12, b * 0.12, b * 0.12); g.rect(b * 0.93, -b * 0.12, b * 0.12, b * 0.12); g.fillStyle = "#6b4226"; g.fill();
    },
    snackbox: function (g, o, d, r, t) {
      var pop = d.pop > 0 ? Math.sin(d.pop * 20) * 0.04 : 0;
      g.translate(0, r); g.scale(1 - pop, 1 + pop);
      g.beginPath(); rr(g, -r * 0.95, -r * 3, r * 1.9, r * 3, 8); fillStroke(g, "#ff5fa2", INK, 2);
      g.beginPath(); rr(g, -r * 0.75, -r * 2.75, r * 1.05, r * 1.7, 4); fillStroke(g, "#d9f4ff", INK, 1.5);
      for (var i = 0; i < 3; i++) for (var j = 0; j < 2; j++) { g.beginPath(); circ(g, -r * 0.5 + j * r * 0.52, -r * 2.45 + i * r * 0.5, r * 0.15); g.fillStyle = ["#ffb3d1", "#ffd166", "#c5ff49"][(i + j) % 3]; g.fill(); }
      g.beginPath(); g.moveTo(-r * 0.7, -r * 2.6); g.lineTo(-r * 0.4, -r * 1.2); g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineWidth = 2; g.stroke();
      g.beginPath(); circ(g, r * 0.6, -r * 2.4, r * 0.14); g.fillStyle = (Math.sin(t * 4) > 0) ? "#c5ff49" : "#7a9a30"; g.fill();
      g.beginPath(); circ(g, r * 0.6, -r * 2.0, r * 0.12); g.fillStyle = "#ffd166"; g.fill();
      g.beginPath(); rr(g, -r * 0.6, -r * 0.75, r * 1.2, r * 0.35, 3); fillStroke(g, "#2a2340", null, 0);
      g.fillStyle = "#fff"; g.font = "900 " + (r * 0.32).toFixed(1) + "px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SNACK", 0, -r * 1.25 + 0);
    },
    computer: function (g, o, d, r, t) {
      g.translate(0, r);
      g.beginPath(); rr(g, -r * 1.3, -r * 0.6, r * 2.6, r * 0.6, 4); fillStroke(g, "#9aa3b8", INK, 1.8);
      g.beginPath(); g.rect(-r * 0.2, -r * 1.0, r * 0.4, r * 0.45); fillStroke(g, "#7d8597", INK, 1.5);
      g.beginPath(); rr(g, -r * 1.2, -r * 2.9, r * 2.4, r * 1.95, 8); fillStroke(g, "#e8e2d4", INK, 2);
      g.beginPath(); rr(g, -r * 1.0, -r * 2.7, r * 2.0, r * 1.5, 5); g.fillStyle = "#0e1a10"; g.fill();
      g.save(); g.beginPath(); g.rect(-r * 1.0, -r * 2.7, r * 2.0, r * 1.5); g.clip();
      g.fillStyle = "#c5ff49"; g.textAlign = "left"; g.textBaseline = "middle";
      if (d.wordT > 0 && d.word) {
        g.font = "900 " + (r * 0.42).toFixed(1) + "px ui-monospace, monospace"; g.textAlign = "center";
        g.globalAlpha = 0.6 + 0.4 * Math.sin(t * 10); g.fillText(String(d.word), 0, -r * 1.95); g.globalAlpha = 1;
      } else {
        g.font = "800 " + (r * 0.26).toFixed(1) + "px ui-monospace, monospace";
        var words = SB.ALL_WORDS || ["food", "ball"], lh = r * 0.34, off = (t * 12) % lh, base = Math.floor(t * 12 / lh) + o.id;
        for (var i = 0; i < 6; i++) { g.globalAlpha = i === 2 ? 1 : 0.55; g.fillText((i === 2 ? ">" : " ") + words[(base + i) % words.length], -r * 0.9, -r * 2.75 + (i + 0.5) * lh - off + lh); }
        g.globalAlpha = 1;
        if (Math.sin(t * 6) > 0) g.fillRect(r * 0.55, -r * 1.42, r * 0.22, r * 0.08);
      }
      g.restore();
      g.beginPath(); rr(g, -r * 1.0, -r * 0.5, r * 2.0, r * 0.25, 3); g.fillStyle = "#cfd5e0"; g.fill();
      g.beginPath(); circ(g, r * 1.0, -r * 1.05, r * 0.08); g.fillStyle = "#c5ff49"; g.fill();
      glow(o.x, o.y + r - r * 1.95, r * 2.4, "#c5ff49", 0.12 + nightK * 0.25);
    },
    appletree: function (g, o, d, r, t) {
      var P2 = RP[roomIdx(o.x)] || RP[2];
      g.translate(0, r); g.scale(0.82, 0.82);
      g.beginPath(); g.moveTo(-13, 0); g.quadraticCurveTo(-8, -50, -10, -90); g.lineTo(10, -90); g.quadraticCurveTo(8, -50, 13, 0); g.closePath(); fillStroke(g, "#94603d", INK, 2);
      g.beginPath(); g.moveTo(-2, -60); g.quadraticCurveTo(-20, -70, -30, -86); g.lineWidth = 6; g.strokeStyle = "#94603d"; g.stroke();
      var A = [0, -120, 50, -42, -100, 36, 42, -104, 38, -18, -152, 32, 22, -148, 32];
      blobs(g, A, P2.leaf === RP[4].leaf ? "#4fbf4a" : P2.leaf, INK, 2);
      g.beginPath(); circ(g, -14, -138, 20); circ(g, -40, -108, 15); circ(g, 20, -160, 12); g.fillStyle = "#93e47c"; g.fill();
      var n = clamp(Math.round(d.stock || 0), 0, 6), spots = [-30, -96, 26, -112, -4, -124, 38, -88, -20, -146, 14, -82];
      for (var i = 0; i < n; i++) {
        var ax = spots[i * 2], ay = spots[i * 2 + 1] + Math.sin(t * 2 + i) * 1;
        g.beginPath(); circ(g, ax, ay, 8); fillStroke(g, "#ff4d4d", INK, 1.5);
        g.beginPath(); circ(g, ax - 3, ay - 3, 2.4); g.fillStyle = "rgba(255,255,255,0.7)"; g.fill();
      }
    },
    berrybush: function (g, o, d, r) {
      g.translate(0, r);
      var bc = roomIdx(o.x) === 1 ? "#2e9a83" : "#3fae4a";
      blobs(g, [-22, -14, 16, 0, -24, 20, 22, -14, 16, -8, -6, 14, 12, -8, 14], bc, INK, 1.8);
      g.beginPath(); circ(g, -6, -32, 9); circ(g, -26, -20, 7); g.fillStyle = "rgba(255,255,255,0.22)"; g.fill();
      var n = clamp(Math.round(d.stock || 0), 0, 5), sp = [-16, -20, 10, -28, 20, -12, -4, -10, -24, -8];
      for (var i = 0; i < n; i++) { g.beginPath(); circ(g, sp[i * 2], sp[i * 2 + 1], 4.5); circ(g, sp[i * 2] + 5, sp[i * 2 + 1] + 2, 4.5); fillStroke(g, "#6b6bff", INK, 1.2); }
    },
    carrotpatch: function (g, o, d, r) {
      g.translate(0, r);
      g.beginPath(); g.moveTo(-r * 1.1, 2); g.quadraticCurveTo(0, -r * 0.55, r * 1.1, 2); g.closePath(); fillStroke(g, "#8a5a32", INK, 1.8);
      g.beginPath(); for (var j = -2; j <= 2; j++) circ(g, j * r * 0.4, -r * 0.15 + Math.abs(j) * 2, 1.6); g.fillStyle = "rgba(0,0,0,0.25)"; g.fill();
      var n = clamp(Math.round(d.stock || 0), 0, 4);
      for (var i = 0; i < Math.max(n, 1); i++) {
        var x = (i - (Math.max(n, 1) - 1) / 2) * r * 0.6, small = n === 0;
        if (!small) { g.beginPath(); g.moveTo(x - 5, -r * 0.18); g.lineTo(x + 5, -r * 0.18); g.lineTo(x, -r * 0.18 + 6); g.closePath(); fillStroke(g, "#ff9f43", INK, 1.2); }
        g.beginPath(); ell(g, x - 3, -r * 0.18 - 8, 2.5, 7, -0.4); ell(g, x + 3, -r * 0.18 - 9, 2.5, 8, 0.3); fillStroke(g, "#5fca4f", INK, 1.1);
      }
    },
    herbpatch: function (g, o, d, r) {
      g.translate(0, r);
      g.beginPath(); g.moveTo(-r * 1.1, 2); g.quadraticCurveTo(0, -r * 0.5, r * 1.1, 2); g.closePath(); fillStroke(g, "#6b4a32", INK, 1.6);
      var n = clamp(Math.round(d.stock || 0), 0, 3) + 1;
      for (var i = 0; i < n; i++) {
        var x = (i - (n - 1) / 2) * r * 0.6;
        g.beginPath(); ell(g, x - 4, -r * 0.3 - 6, 3.5, 7, -0.6); ell(g, x + 4, -r * 0.3 - 6, 3.5, 7, 0.6); ell(g, x, -r * 0.3 - 10, 3.5, 8, 0); fillStroke(g, "#7cd96b", INK, 1.1);
      }
    },
    shroomring: function (g, o, d, r, t) {
      g.translate(0, r);
      var ri = roomIdx(o.x);
      for (var i = 0; i < 7; i++) {
        var a = (i / 7) * TAU, x = Math.cos(a) * r * 1.3, y = Math.sin(a) * 3 - 3, s = 0.5 + hash(i + o.id) * 0.25;
        g.save(); g.translate(x, y); g.scale(s, s);
        var blue = (i + ri) % 3 === 0;
        shroom(g, 9, blue ? "#3fb6e8" : "#e0566e", "#fff4ea");
        g.restore();
        if (blue) glow(o.x + x, o.y + r + y - 6, 18, "#5fe8ff", nightK * 0.5);
      }
      g.beginPath(); for (var k = 0; k < 6; k++) { var ka = now * 0.4 + k; circ(g, Math.cos(ka) * r * 0.8, -12 - Math.abs(Math.sin(ka * 1.3)) * 18, 1.4); } g.fillStyle = "rgba(255,255,220,0.8)"; g.fill();
    },
    heater: function (g, o, d, r, t) {
      var on = d.on > 0 ? 1 : 0.4, fl = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
      glow(o.x, o.y - r * 0.2, r * 4.2, "#ff8a3d", (0.25 + 0.35 * on) * fl * (0.6 + nightK * 0.6));
      g.translate(0, r);
      g.beginPath(); rr(g, -r * 1.15, -r * 2.1, r * 2.3, r * 2.1, 8); fillStroke(g, "#e0566e", INK, 2);
      g.beginPath(); rr(g, -r * 0.85, -r * 1.65, r * 1.7, r * 1.15, 5); g.fillStyle = "#3a1d2a"; g.fill();
      g.beginPath(); g.moveTo(-r * 0.5, -r * 0.55); g.quadraticCurveTo(-r * 0.6, -r * 1.1 * fl, -r * 0.2, -r * 1.45 * fl); g.quadraticCurveTo(-r * 0.1, -r * 1.0, 0, -r * 1.25 * fl); g.quadraticCurveTo(r * 0.15, -r * 0.95, r * 0.3, -r * 1.5 * fl); g.quadraticCurveTo(r * 0.7, -r * 0.9, r * 0.5, -r * 0.55); g.closePath();
      g.fillStyle = "#ffb03a"; g.fill();
      g.beginPath(); g.moveTo(-r * 0.25, -r * 0.55); g.quadraticCurveTo(-r * 0.2, -r * 0.95 * fl, 0, -r * 1.05 * fl); g.quadraticCurveTo(r * 0.25, -r * 0.9, r * 0.25, -r * 0.55); g.closePath(); g.fillStyle = "#fff1a8"; g.fill();
      g.beginPath(); for (var i = -2; i <= 2; i++) { g.moveTo(i * r * 0.32, -r * 1.65); g.lineTo(i * r * 0.32, -r * 0.5); } g.lineWidth = 2; g.strokeStyle = "#2a2340"; g.stroke();
      g.beginPath(); circ(g, -r * 0.6, -r * 0.25, r * 0.12); circ(g, r * 0.6, -r * 0.25, r * 0.12); g.fillStyle = "#ffd166"; g.fill();
    },
    fan: function (g, o, d, r, t) {
      var spd = d.on > 0 ? 22 : 3;
      g.translate(0, r);
      g.beginPath(); ell(g, 0, -2, r * 0.8, r * 0.22, 0); fillStroke(g, "#56627e", INK, 1.8);
      g.beginPath(); g.rect(-r * 0.09, -r * 2.0, r * 0.18, r * 1.95); fillStroke(g, "#7d8597", INK, 1.5);
      g.save(); g.translate(0, -r * 2.3);
      g.beginPath(); circ(g, 0, 0, r * 0.95); fillStroke(g, "rgba(200,230,255,0.35)", INK, 2);
      g.rotate(t * spd);
      g.beginPath(); for (var i = 0; i < 3; i++) { var a = i * TAU / 3; ell(g, Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.42, r * 0.2, a); } fillStroke(g, "#6fd3ff", INK, 1.4);
      g.beginPath(); circ(g, 0, 0, r * 0.15); fillStroke(g, "#ffffff", INK, 1.4);
      g.restore();
      g.beginPath(); for (var k = 0; k < 6; k++) { g.moveTo(-r * 0.8 + k * r * 0.32, -r * 2.3 - r * 0.9); g.lineTo(-r * 0.8 + k * r * 0.32, -r * 2.3 + r * 0.9); } g.lineWidth = 0.8; g.strokeStyle = "rgba(42,35,64,0.35)"; g.stroke();
    },
    trampoline: function (g, o, d, r, t) {
      var b = d.boing > 0 ? Math.sin(d.boing * 30) * d.boing * 14 : 0;
      g.translate(0, r);
      g.beginPath(); g.moveTo(-r * 0.8, -r * 0.5); g.lineTo(-r * 0.95, 0); g.moveTo(r * 0.8, -r * 0.5); g.lineTo(r * 0.95, 0); g.moveTo(-r * 0.2, -r * 0.5); g.lineTo(-r * 0.25, 0); g.moveTo(r * 0.2, -r * 0.5); g.lineTo(r * 0.25, 0);
      g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      g.beginPath(); g.moveTo(-r, -r * 0.55); g.quadraticCurveTo(0, -r * 0.55 + b, r, -r * 0.55); g.lineWidth = 6; g.strokeStyle = "#2a2340"; g.stroke();
      g.beginPath(); ell(g, 0, -r * 0.55, r * 1.05, r * 0.18, 0); g.lineWidth = 5; g.strokeStyle = "#ff5fa2"; g.stroke();
      g.beginPath(); for (var i = -3; i <= 3; i++) circ(g, i * r * 0.3, -r * 0.55 + (i % 2 ? -1 : 1) * r * 0.12, 2); g.fillStyle = "#ffd166"; g.fill();
    },
    teleporter: function (g, o, d, r, t) {
      var z = d.zap > 0 ? d.zap : 0;
      glow(o.x, o.y + r * 0.2 - 10, r * 2.6, "#6fe8ff", 0.25 + 0.2 * Math.sin(t * 3) + z);
      g.translate(0, r);
      g.beginPath(); ell(g, 0, -4, r * 1.2, r * 0.38, 0); fillStroke(g, "#56627e", INK, 2);
      g.beginPath(); ell(g, 0, -7, r * 0.95, r * 0.26, 0); g.fillStyle = "#6fe8ff"; g.fill();
      g.beginPath(); for (var i = 0; i < 3; i++) { var p = ((t * 0.8 + i / 3) % 1); ell(g, 0, -8 - p * 50, r * 0.9 * (1 - p * 0.3), r * 0.22 * (1 - p * 0.3), 0); }
      g.lineWidth = 2; g.strokeStyle = "rgba(160,250,255,0.6)"; g.stroke();
      g.fillStyle = INK; g.font = "900 9px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(d.pad || "", 0, -4);
    },
    medbot: function (g, o, d, r, t) {
      var bob = Math.sin(t * 2.4 + o.id) * 2, pop = d.pop > 0 ? 3 : 0;
      g.translate(0, r);
      g.beginPath(); ell(g, 0, -3, r * 0.6, r * 0.18, 0); fillStroke(g, "#56627e", INK, 1.6);
      g.translate(0, bob - pop);
      g.beginPath(); rr(g, -r * 0.85, -r * 1.65, r * 1.7, r * 1.45, 10); fillStroke(g, "#ffffff", INK, 2);
      g.beginPath(); g.rect(-r * 0.12, -r * 1.05, r * 0.24, r * 0.64); g.rect(-r * 0.32, -r * 0.85, r * 0.64, r * 0.24); g.fillStyle = "#ff4d6d"; g.fill();
      g.beginPath(); rr(g, -r * 0.7, -r * 2.65, r * 1.4, r * 0.95, 9); fillStroke(g, "#e8eef7", INK, 2);
      g.beginPath(); rr(g, -r * 0.55, -r * 2.5, r * 1.1, r * 0.65, 6); g.fillStyle = "#1c2130"; g.fill();
      var bl = Math.sin(t * 1.3 + o.id) > 0.96;
      g.fillStyle = "#6fe8ff";
      if (bl) { g.fillRect(-r * 0.35, -r * 2.18, r * 0.22, r * 0.05); g.fillRect(r * 0.13, -r * 2.18, r * 0.22, r * 0.05); }
      else { g.beginPath(); circ(g, -r * 0.24, -r * 2.18, r * 0.11); circ(g, r * 0.24, -r * 2.18, r * 0.11); g.fill(); }
      g.beginPath(); g.arc(0, -r * 2.05, r * 0.15, 0.2, PI - 0.2); g.strokeStyle = "#6fe8ff"; g.lineWidth = 1.5; g.stroke();
      g.beginPath(); g.moveTo(0, -r * 2.65); g.lineTo(0, -r * 2.95); g.strokeStyle = INK; g.lineWidth = 2; g.stroke();
      g.beginPath(); circ(g, 0, -r * 3.0, r * 0.12); g.fillStyle = Math.sin(t * 5) > 0 ? "#ff4d6d" : "#ffb3c0"; g.fill();
    },
    incubator: function (g, o, d, r, t) {
      glow(o.x, o.y + r * 0.1, r * 3, "#ffb35c", 0.35 + 0.1 * Math.sin(t * 2) + nightK * 0.25);
      g.translate(0, r);
      g.beginPath(); rr(g, -r * 1.15, -r * 0.55, r * 2.3, r * 0.55, 6); fillStroke(g, "#ffd166", INK, 2);
      g.beginPath(); for (var i = 0; i < 3; i++) circ(g, -r * 0.6 + i * r * 0.6, -r * 0.27, r * 0.09); g.fillStyle = i ? "#ff7a3d" : "#ff7a3d"; g.fill();
      g.beginPath(); ell(g, 0, -r * 0.55, r * 0.95, r * 0.22, 0); g.fillStyle = "#fff1c2"; g.fill();
      // glass dome (drawn translucent, the egg sits inside visually)
      g.beginPath(); g.moveTo(-r, -r * 0.55); g.bezierCurveTo(-r, -r * 2.5, r, -r * 2.5, r, -r * 0.55);
      g.fillStyle = "rgba(220,240,255,0.18)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "rgba(42,35,64,0.6)"; g.stroke();
      g.beginPath(); g.moveTo(-r * 0.65, -r * 0.9); g.quadraticCurveTo(-r * 0.7, -r * 1.7, -r * 0.2, -r * 1.95); g.lineWidth = 3; g.strokeStyle = "rgba(255,255,255,0.7)"; g.stroke();
      g.beginPath(); circ(g, 0, -r * 2.05, r * 0.12); fillStroke(g, "#ff7a3d", INK, 1.5);
    },
    warpgate: function (g, o, d, r, t) {
      glow(o.x, o.y - r * 0.6, r * 3.4, "#b59aff", 0.35 + nightK * 0.3);
      g.translate(0, r);
      g.beginPath(); g.moveTo(-r * 1.25, 0); g.lineTo(-r * 1.25, -r * 2.6); g.arc(0, -r * 2.6, r * 1.25, PI, 0); g.lineTo(r * 1.25, 0); g.lineTo(r * 0.85, 0); g.lineTo(r * 0.85, -r * 2.6); g.arc(0, -r * 2.6, r * 0.85, 0, PI, true); g.lineTo(-r * 0.85, 0); g.closePath();
      fillStroke(g, "#56627e", INK, 2);
      g.save(); g.beginPath(); g.moveTo(-r * 0.85, 0); g.lineTo(-r * 0.85, -r * 2.6); g.arc(0, -r * 2.6, r * 0.85, PI, 0); g.lineTo(r * 0.85, 0); g.closePath(); g.clip();
      g.fillStyle = "#2a1d5a"; g.fillRect(-r, -r * 3.6, r * 2, r * 3.6);
      g.translate(0, -r * 1.7);
      for (var i = 0; i < 4; i++) {
        g.rotate(t * 1.6 + i * 0.4);
        g.beginPath(); for (var a = 0; a < 5.5; a += 0.25) { var rad = a * r * 0.28; if (a === 0) g.moveTo(Math.cos(a) * rad, Math.sin(a) * rad * 1.4); else g.lineTo(Math.cos(a) * rad, Math.sin(a) * rad * 1.4); }
        g.lineWidth = 3; g.strokeStyle = ["#b59aff", "#6fe8ff", "#ff5fa2", "#c5ff49"][i]; g.globalAlpha = 0.75; g.stroke();
      }
      g.globalAlpha = 1; g.restore();
      g.beginPath(); for (var k = 0; k < 5; k++) circ(g, Math.cos(k * 1.3) * r * 1.05, -r * 2.6 + Math.sin(k * 1.3) * r * 1.05 - (k > 2 ? 0 : 0), 2.2); g.fillStyle = "#c5ff49"; g.fill();
    },
    grumpcave: function (g, o, d, r, t) {
      g.translate(0, r);
      g.beginPath(); g.moveTo(-r * 1.8, 0); g.bezierCurveTo(-r * 1.9, -r * 2.4, r * 1.9, -r * 2.4, r * 1.8, 0); g.closePath(); fillStroke(g, "#4b3c63", INK, 2.5);
      g.beginPath(); ell(g, -r * 0.8, -r * 1.4, r * 0.4, r * 0.2, -0.4); g.fillStyle = "#5e4c7a"; g.fill();
      g.beginPath(); g.moveTo(-r * 0.9, 0); g.bezierCurveTo(-r, -r * 1.5, r, -r * 1.5, r * 0.9, 0); g.closePath(); g.fillStyle = "#0e0816"; g.fill();
      g.beginPath(); for (var i = 0; i < 5; i++) { var x = -r * 0.6 + i * r * 0.3; g.moveTo(x - 5, -r * 1.05 + Math.abs(i - 2) * 5); g.lineTo(x, -r * 0.8 + Math.abs(i - 2) * 5); g.lineTo(x + 5, -r * 1.05 + Math.abs(i - 2) * 5); } g.fillStyle = "#4b3c63"; g.fill();
      if (nightK > 0.2 || (game && game.world && game.world.night)) {
        var bl = Math.sin(t * 0.9 + 2) > 0.93 ? 0.15 : 1;
        g.globalAlpha = bl; g.beginPath(); ell(g, -r * 0.25, -r * 0.45, 3.5, 2.4, 0.25); ell(g, r * 0.12, -r * 0.45, 3.5, 2.4, -0.25); g.fillStyle = "#ffe14a"; g.fill(); g.globalAlpha = 1;
      }
      g.fillStyle = "#c5ff49"; g.font = "800 8px " + FONT; g.textAlign = "center";
      g.beginPath(); g.moveTo(r * 1.15, -r * 0.2); g.lineTo(r * 1.15, -r * 1.0); g.lineWidth = 3; g.strokeStyle = "#5b3f35"; g.stroke();
      g.beginPath(); rr(g, r * 0.75, -r * 1.25, r * 0.8, r * 0.4, 3); fillStroke(g, "#a07a5a", INK, 1.5);
      g.fillStyle = "#2a1a10"; g.textBaseline = "middle"; g.fillText("KEEP OUT", r * 1.15, -r * 1.05);
    }
  };
  function shroom(g, r, cap, dots) {
    g.beginPath(); g.moveTo(-r * 0.3, r); g.quadraticCurveTo(-r * 0.35, 0, -r * 0.25, -r * 0.1); g.lineTo(r * 0.25, -r * 0.1); g.quadraticCurveTo(r * 0.35, 0, r * 0.3, r); g.closePath(); fillStroke(g, "#f3e6cf", INK, 1.5);
    g.beginPath(); g.moveTo(-r * 1.05, -r * 0.05); g.bezierCurveTo(-r, -r * 1.2, r, -r * 1.2, r * 1.05, -r * 0.05); g.quadraticCurveTo(0, r * 0.15, -r * 1.05, -r * 0.05); g.closePath(); fillStroke(g, cap, INK, 1.6);
    g.beginPath(); circ(g, -r * 0.45, -r * 0.45, r * 0.18); circ(g, r * 0.2, -r * 0.65, r * 0.2); circ(g, r * 0.6, -r * 0.3, r * 0.13); g.fillStyle = dots; g.fill();
  }

  /* ================================================================
     CREATURES
     ================================================================ */
  var lookCache = new WeakMap();
  // render-only per-entity state (kept off the sim objects so saves stay clean)
  var RS = new WeakMap();
  function rs(c) { var s = RS.get(c); if (!s) { s = { re: null, reT: 0, st: null, stT: 0, zT: 0, look: null, hue: null }; RS.set(c, s); } return s; }
  var DEFAULT_LOOK = { hue: 160, hue2: 330, sat: 70, light: 64, pattern: 3, ears: 0, eyes: 1, tail: 1, body: 1, size: 1, spotsSeed: 7, cheeks: true, antenna: false };
  function lookOf(c) {
    if (c.look) return c.look;
    var st = rs(c);
    if (!st.look) { try { st.look = c.genome && SB.Genome && SB.Genome.look ? SB.Genome.look(c.genome) : null; } catch (e) {} if (!st.look) st.look = DEFAULT_LOOK; }
    return st.look;
  }
  function colorsOf(L, species) {
    var C = lookCache.get(L);
    if (C) return C;
    var h = L.hue == null ? 160 : L.hue <= 1 && L.hue % 1 !== 0 ? L.hue * 360 : L.hue;
    var h2 = L.hue2 == null ? h + 150 : L.hue2 <= 1 && L.hue2 % 1 !== 0 ? L.hue2 * 360 : L.hue2;
    var s = L.sat == null ? 70 : L.sat <= 1 ? L.sat * 100 : L.sat;
    var l = L.light == null ? 64 : L.light <= 1 ? L.light * 100 : L.light;
    var grump = (L.species || species) === "grump";
    C = {};
    if (grump) {
      var gh = 268 + ((h % 60) - 30) * 0.5, gs = clamp(s + 18, 45, 68), gl = clamp(l + 12, 40, 52);
      C.body = hsl(gh, gs, gl); C.dark = hsl(gh, gs, gl - 12); C.out = hsl(gh, 45, 14); C.belly = hsl(gh + 20, gs - 10, gl + 14);
      C.spike = hsl(88 + ((h2 % 40) - 20) * 0.5, 62, 56); C.spikeD = hsl(100, 50, 30); C.feet = hsl(gh, gs, gl - 8);
    } else {
      s = clamp(s, 40, 92); l = clamp(l, 52, 78);
      C.body = hsl(h, s, l); C.elder = hsl(h, s * 0.45, l + 6); C.sick = hsl(lerp(h, 95, 0.6), s * 0.7, l - 4);
      C.dark = hsl(h, s * 0.9, l - 14); C.out = hsl(h, Math.min(60, s * 0.7), 24);
      C.belly = hsl(h, s * 0.6, Math.min(94, l + 20)); C.pat = hsl(h2, clamp(s, 50, 90), clamp(l - 10, 45, 70));
      C.patBelly = hsl(h2, 60, 88); C.feet = hsl(h, s, l - 10); C.inner = hsl(345, 85, 82);
      var r = SB.rng ? SB.rng((L.spotsSeed | 0) * 9973 + 1) : Math.random, sp = [];
      for (var i = 0; i < 6; i++) sp.push(r() * 1.6 - 0.8, r() * 1.5 - 0.95, 0.12 + r() * 0.13);
      C.spots = sp;
    }
    lookCache.set(L, C);
    return C;
  }

  // pose state (reused, no per-frame allocation)
  var PS = { look: null, col: null, R: 22, facing: 1, walk: 0, moving: false, blink: 0, squash: 0, emote: null, mouth: "smile", lookX: 0, stage: 3,
    asleep: false, sick: false, elder: false, dead: false, held: false, t: 0, id: 0, bob: 0, alpha: 1, eat: false, holding: false, statik: false, scared: false };
  function poseFrom(c) {
    var L = lookOf(c), an = c.anim || EMPTY, ch = c.chem || EMPTY;
    PS.look = L; PS.col = colorsOf(L, c.species); PS.R = creatureR(c); PS.facing = c.facing < 0 ? -1 : 1;
    PS.walk = an.walk || 0; PS.moving = !!c.moving && !c.asleep && c.onGround !== false && !c.heldBy;
    PS.blink = an.blink != null ? an.blink : (((now + (c.id || 0) * 1.37) % 3.7) < 0.12 ? 1 : 0);
    PS.squash = an.squash || 0; PS.emote = an.emoteT > 0 || an.emoteT == null ? an.emote : null;
    PS.mouth = an.mouth || "smile"; PS.lookX = an.lookX || an.look || 0; PS.stage = c.stage == null ? 3 : c.stage;
    PS.asleep = !!c.asleep; PS.sick = (ch.sick || 0) > 0.45 || PS.emote === "sick"; PS.elder = PS.stage >= 4;
    PS.dead = !c.alive || !!c.dying; PS.held = c.heldBy === "hand"; PS.t = now; PS.id = c.id || 0; PS.bob = an.bob || 0;
    PS.alpha = PS.dead ? clamp(1 - (c.fade || 0), 0, 1) : 1; PS.holding = c.holding != null; PS.statik = false;
    PS.scared = (ch.fear || 0) > 0.6 || PS.emote === "scared";
  }

  function drawCreatures() {
    var cs = game.creatures || [], sel = null;
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c || c.gone || c.x == null) continue;
      if (!visible(c.x, c.y, 90)) continue;
      if (c.id === game.selectedId) { sel = c; continue; }
      drawCreatureAt(c);
    }
    if (sel) drawCreatureAt(sel);
  }
  function drawSelectionRing(c) {
    var r = creatureR(c), g0 = c.heldBy ? c.y : Math.min(c.y, gy(c.x));
    worldT();
    var pul = 1 + Math.sin(now * 4) * 0.06;
    ctx.beginPath(); ell(ctx, c.x, g0 + 1, r * 1.25 * pul, r * 0.38 * pul, 0);
    ctx.fillStyle = "rgba(197,255,73,0.18)"; ctx.fill();
    ctx.lineWidth = 3 / Z + 1.2; ctx.strokeStyle = "#c5ff49"; ctx.stroke();
    // little chevron above head
    var hy = c.y - r * 2.5 - 10 + Math.sin(now * 5) * 3;
    ctx.beginPath(); ctx.moveTo(c.x - 6, hy - 6); ctx.lineTo(c.x, hy); ctx.lineTo(c.x + 6, hy - 6);
    ctx.lineWidth = 3.5; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#c5ff49"; ctx.stroke();
  }
  function drawCreatureAt(c) {
    if (c.id === game.selectedId) drawSelectionRing(c);
    poseFrom(c);
    var rot = 0, x = c.x, y = c.y;
    if (PS.held) rot = Math.sin(now * 6 + PS.id) * 0.18;
    if (PS.dead) rot = PS.facing * -1.35 * ss((c.fade || 0) * 3 + 0.3);
    if (PS.scared && !PS.dead && !PS.asleep) x += Math.sin(now * 60) * 0.6;
    ctx.globalAlpha = PS.alpha;
    local(x, y, rot, PS.facing, 1);
    if (c.species === "grump") drawGrump(ctx, PS); else drawSmol(ctx, PS);
    ctx.globalAlpha = 1;
    // night glow for grump eyes
    if (c.species === "grump" && !PS.dead) glow(x + PS.facing * PS.R * 0.25, y - PS.R * 1.25, PS.R * 1.1, "#ffe14a", 0.15 + nightK * 0.55);
    // held object in front
    if (c.holding != null) {
      var o = byId(c.holding);
      if (o && o.heldBy === c.id) drawObject(o, o.x, o.y, 0.9);
    }
    // sleeping zzz
    if (PS.asleep && !PS.dead) { var st = rs(c); st.zT -= dtFrame; if (st.zT <= 0) { st.zT = 1.3; R.fx("zzz", x + PS.facing * PS.R * 0.4, y - PS.R * 2); } }
  }
  var dtFrame = 0;
  var idMap = new Map();
  function byId(id) {
    if (!idMap.size && game && game.world && game.world.objects) { var os = game.world.objects; for (var i = 0; i < os.length; i++) idMap.set(os[i].id, os[i]); }
    return idMap.get(id) || null;
  }

  function drawSmol(g, P) {
    var L = P.look, C = P.col, Rr = P.R, t = P.t;
    var body = L.body || 1, st = P.stage;
    if (st === 0) body = (body + 1) / 2;
    var bw = Rr * Math.sqrt(body), bh = Rr / Math.sqrt(body);
    if (st === 0) { bw *= 1.06; bh *= 1.0; }
    var eyeMul = st === 0 ? 1.45 : st === 1 ? 1.2 : st === 2 ? 1.07 : 1;
    var breathe = P.statik || P.dead ? 0 : Math.sin(P.bob * 0.8 + P.id) * 0.03 * (P.asleep ? 1.6 : 1);
    var sq = clamp(P.squash, -0.6, 0.6);
    var hop = P.moving ? Math.abs(Math.sin(P.walk * 2)) * Rr * 0.16 : 0;
    var sx = 1 + sq * 0.3 + breathe, sy = 1 - sq * 0.3 - breathe;
    if (P.moving) { var hs = Math.cos(P.walk * 4) * 0.045; sx -= hs; sy += hs; }
    if (P.held) { sx *= 0.94; sy *= 1.08; }
    var footH = Rr * (st === 0 ? 0.1 : 0.15), BW = bw * sx, BH = bh * sy;
    var cy = -footH - BH - hop;
    var lw = Math.max(1.5, Rr * 0.085), o = C.out;
    var fill = P.dead ? C.elder : P.sick ? C.sick : P.elder ? C.elder : C.body;
    g.lineJoin = "round"; g.lineCap = "round";

    // tail (behind)
    var tail = L.tail | 0, wag = Math.sin(t * (P.emote === "happy" || P.emote === "love" ? 14 : 3) + P.id) * 0.3;
    if (tail > 0) {
      g.save(); g.translate(-BW * 0.88, cy + BH * 0.45); g.rotate(-0.4 + wag);
      if (tail === 1) { g.beginPath(); circ(g, -Rr * 0.08, 0, Rr * 0.22); fillStroke(g, C.pat, o, lw); }
      else if (tail === 2) {
        g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(-Rr * 0.5, 0, -Rr * 0.7, -Rr * 0.5, -Rr * 0.45, -Rr * 0.65); g.bezierCurveTo(-Rr * 0.25, -Rr * 0.75, -Rr * 0.15, -Rr * 0.45, -Rr * 0.35, -Rr * 0.4);
        g.lineWidth = Rr * 0.2 + lw * 2; g.strokeStyle = o; g.stroke(); g.lineWidth = Rr * 0.2; g.strokeStyle = fill; g.stroke();
      } else { g.beginPath(); ell(g, -Rr * 0.45, -Rr * 0.25, Rr * 0.45, Rr * 0.26, -0.5); fillStroke(g, C.pat, o, lw); g.beginPath(); ell(g, -Rr * 0.7, -Rr * 0.4, Rr * 0.18, Rr * 0.12, -0.5); g.fillStyle = C.patBelly; g.fill(); }
      g.restore();
    }
    // antenna
    if (L.antenna) {
      var aw = Math.sin(t * 3 + P.id) * Rr * 0.15, ax = BW * 0.15, ay = cy - BH * 0.92;
      g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(ax + Rr * 0.05, ay - Rr * 0.5, ax + Rr * 0.2 + aw, ay - Rr * 0.75);
      g.lineWidth = lw * 1.1; g.strokeStyle = o; g.stroke();
      g.beginPath(); circ(g, ax + Rr * 0.2 + aw, ay - Rr * 0.8, Rr * 0.14); fillStroke(g, C.pat, o, lw);
      g.beginPath(); circ(g, ax + Rr * 0.16 + aw, ay - Rr * 0.85, Rr * 0.05); g.fillStyle = "#fff"; g.fill();
    }
    // ears (behind body)
    var ears = L.ears | 0, es = st === 0 ? 0.8 : 1;
    if (ears !== 4) {
      var flop = P.moving ? Math.sin(P.walk * 2) * 0.15 : Math.sin(t * 1.5 + P.id) * 0.04;
      for (var side = -1; side <= 1; side += 2) {
        g.save();
        if (ears === 0) {
          g.translate(side * BW * 0.6, cy - BH * 0.72); g.beginPath(); circ(g, 0, 0, Rr * 0.3 * es); fillStroke(g, fill, o, lw);
          g.beginPath(); circ(g, side * Rr * 0.02, Rr * 0.02, Rr * 0.16 * es); g.fillStyle = C.inner; g.fill();
        } else if (ears === 1) {
          g.translate(side * BW * 0.5, cy - BH * 0.72); g.rotate(side * 0.35 + flop * 0.3);
          g.beginPath(); g.moveTo(-Rr * 0.3 * es, Rr * 0.2); g.quadraticCurveTo(-Rr * 0.1, -Rr * 0.6 * es, 0, -Rr * 0.68 * es); g.quadraticCurveTo(Rr * 0.1, -Rr * 0.6 * es, Rr * 0.3 * es, Rr * 0.2); g.closePath(); fillStroke(g, fill, o, lw);
          g.beginPath(); g.moveTo(-Rr * 0.15 * es, Rr * 0.05); g.quadraticCurveTo(0, -Rr * 0.4 * es, Rr * 0.15 * es, Rr * 0.05); g.closePath(); g.fillStyle = C.inner; g.fill();
        } else if (ears === 2) {
          g.translate(side * BW * 0.82, cy - BH * 0.45); g.rotate(side * (0.45 + flop));
          g.beginPath(); ell(g, side * Rr * 0.08, Rr * 0.28 * es, Rr * 0.22 * es, Rr * 0.46 * es, 0); fillStroke(g, C.dark, o, lw);
        } else {
          g.translate(side * BW * 0.32, cy - BH * 0.8); g.rotate(side * 0.2 + flop * side);
          g.beginPath(); ell(g, 0, -Rr * 0.5 * es, Rr * 0.19 * es, Rr * 0.56 * es, 0); fillStroke(g, fill, o, lw);
          g.beginPath(); ell(g, 0, -Rr * 0.5 * es, Rr * 0.09 * es, Rr * 0.38 * es, 0); g.fillStyle = C.inner; g.fill();
        }
        g.restore();
      }
    }
    // feet
    var fw = Rr * (st === 0 ? 0.2 : 0.24), fh = Rr * 0.13;
    g.beginPath();
    for (var fi = 0; fi < 2; fi++) {
      var ph = P.walk * 2 + fi * PI, lift = P.moving ? Math.max(0, Math.sin(ph)) * Rr * 0.18 : 0;
      var fxo = (fi ? 1 : -1) * BW * 0.42 + (P.moving ? Math.cos(ph) * Rr * 0.12 : 0) + Rr * 0.06;
      var fyo = -fh * 0.7 - lift - (P.held ? Math.abs(Math.sin(t * 12 + fi * 2)) * Rr * 0.2 : 0);
      ell(g, fxo, fyo, fw, fh, 0);
    }
    fillStroke(g, C.feet, o, lw);

    // body
    g.beginPath(); bean(g, 0, cy, BW, BH);
    g.lineWidth = lw * 2; g.strokeStyle = o; g.stroke();
    g.fillStyle = fill; g.fill();
    g.save(); g.clip();
    var pat = L.pattern | 0;
    // belly
    g.beginPath(); ell(g, BW * 0.12, cy + BH * (pat === 3 ? 0.42 : 0.55), BW * (pat === 3 ? 0.7 : 0.62), BH * (pat === 3 ? 0.62 : 0.5), 0);
    g.fillStyle = pat === 3 ? C.patBelly : C.belly; g.globalAlpha = pat === 3 ? 1 : 0.75; g.fill(); g.globalAlpha = 1;
    if (pat === 1 && C.spots) {
      g.beginPath(); var spt = C.spots;
      for (var k = 0; k < spt.length; k += 3) circ(g, spt[k] * BW, cy + spt[k + 1] * BH, spt[k + 2] * Rr);
      g.fillStyle = C.pat; g.fill();
    } else if (pat === 2) {
      g.beginPath();
      for (var sI = -1; sI <= 1; sI++) { g.moveTo(sI * BW * 0.42 - BW * 0.05, cy - BH * 1.1); g.quadraticCurveTo(sI * BW * 0.5, cy - BH * 0.65, sI * BW * 0.34 - BW * 0.05, cy - BH * 0.38); }
      g.lineWidth = Rr * 0.17; g.strokeStyle = C.pat; g.stroke();
    }
    // shading + highlight
    g.beginPath(); ell(g, -BW * 0.1, cy + BH * 1.05, BW * 1.2, BH * 0.42, 0); g.fillStyle = "rgba(40,20,80,0.13)"; g.fill();
    g.beginPath(); ell(g, -BW * 0.42, cy - BH * 0.52, BW * 0.24, BH * 0.15, -0.6); g.fillStyle = "rgba(255,255,255,0.45)"; g.fill();
    g.beginPath(); circ(g, -BW * 0.2, cy - BH * 0.72, Rr * 0.05); g.fillStyle = "rgba(255,255,255,0.5)"; g.fill();
    g.restore();

    // arms (little nubs)
    var armY = cy + BH * 0.3, wave = P.emote === "happy" || P.emote === "love" ? Math.sin(t * 12) * 0.5 : 0;
    g.beginPath();
    ell(g, BW * 0.95, armY - (P.holding ? Rr * 0.12 : 0), Rr * 0.16, Rr * 0.12, P.holding ? -0.6 : 0.5 + wave);
    fillStroke(g, fill, o, lw);

    // face
    var fx = BW * 0.18 + (P.lookX || 0) * P.facing * BW * 0.06, ey = cy - BH * (st === 0 ? 0.02 : 0.12);
    var er = Rr * 0.2 * (L.eyes || 1) * eyeMul, ex = BW * 0.3 + er * 0.25;
    var em = P.emote, closed = P.asleep || P.blink > 0.5 || em === "happy" && !P.dead;
    var px = (0.2 + (P.lookX || 0) * P.facing * 0.25) * er;
    // cheeks
    if (L.cheeks || st <= 1) { g.beginPath(); ell(g, fx - ex - er * 0.15, ey + er * 1.05, er * 0.55, er * 0.32, 0); ell(g, fx + ex + er * 0.3, ey + er * 1.05, er * 0.5, er * 0.3, 0); g.fillStyle = "rgba(255,105,150,0.42)"; g.fill(); }
    for (var e = -1; e <= 1; e += 2) {
      var exx = fx + e * ex, eyx = er * (e > 0 ? 0.92 : 1); // far eye a touch smaller (3/4 view)
      if (P.dead) {
        g.beginPath(); g.moveTo(exx - er * 0.5, ey - er * 0.5); g.lineTo(exx + er * 0.5, ey + er * 0.5); g.moveTo(exx + er * 0.5, ey - er * 0.5); g.lineTo(exx - er * 0.5, ey + er * 0.5);
        g.lineWidth = lw * 1.2; g.strokeStyle = o; g.stroke(); continue;
      }
      if (closed) {
        g.beginPath();
        if (em === "happy" && !P.asleep) g.arc(exx, ey + er * 0.25, er * 0.6, PI * 1.15, PI * 1.85);
        else g.arc(exx, ey - er * 0.15, er * 0.6, PI * 0.15, PI * 0.85);
        g.lineWidth = lw * 1.15; g.strokeStyle = o; g.stroke(); continue;
      }
      var sqz = P.blink > 0.05 ? 1 - P.blink * 0.8 : 1;
      g.save(); g.translate(exx, ey); g.scale(1, sqz);
      g.beginPath(); ell(g, 0, 0, eyx * 0.92, er * 1.05, 0); fillStroke(g, "#ffffff", o, lw * 0.8);
      if (em === "love") { g.beginPath(); heartPath(g, px * 0.6, er * 0.3, er * 0.7); g.fillStyle = "#ff3d7f"; g.fill(); }
      else {
        var pr = P.scared ? 0.42 : 0.7;
        g.beginPath(); ell(g, px, er * 0.08, eyx * pr, er * pr * 1.08, 0); g.fillStyle = "#1d1a2e"; g.fill();
        g.beginPath(); circ(g, px - er * 0.22, -er * 0.25, er * 0.27); g.fillStyle = "#ffffff"; g.fill();
        g.beginPath(); circ(g, px + er * 0.22, er * 0.32, er * 0.11); g.fill();
      }
      if (P.sick) { g.beginPath(); g.rect(-er * 1.1, -er * 1.2, er * 2.2, er * 0.95); g.fillStyle = fill; g.fill(); g.beginPath(); g.moveTo(-er, -er * 0.25); g.lineTo(er, -er * 0.25); g.lineWidth = lw * 0.8; g.strokeStyle = o; g.stroke(); }
      g.restore();
      // brows
      if (em === "angry" || em === "sad" || em === "scared" || P.elder) {
        var by = ey - er * 1.25, tilt = em === "angry" ? 0.35 : em === "sad" || em === "scared" ? -0.3 : 0;
        g.beginPath(); g.moveTo(exx - er * 0.6, by - e * tilt * er * 0.6 * -1); g.lineTo(exx + er * 0.6, by + e * tilt * er * 0.6 * -1);
        g.lineWidth = P.elder ? lw * 2.2 : lw * 1.2; g.strokeStyle = P.elder ? "#f2f0ea" : o; g.stroke();
        if (P.elder) { g.lineWidth = lw * 0.6; g.strokeStyle = o; g.stroke(); }
      }
    }
    // mouth
    var mx = fx + Rr * 0.02, my = ey + er * 1.15 + Rr * 0.06, mw = Rr * (st === 0 ? 0.11 : 0.14);
    var mouth = P.dead ? "o" : P.mouth;
    if (em === "yum") mouth = "chew"; else if (em === "sad" || em === "angry") mouth = "frown"; else if (em === "scared" || em === "ouch" || em === "huh") mouth = "o"; else if (em === "happy" || em === "love") mouth = "open";
    if (P.asleep) mouth = "sleep";
    g.lineWidth = lw; g.strokeStyle = o;
    g.beginPath();
    switch (mouth) {
      case "open":
        g.moveTo(mx - mw * 1.2, my - mw * 0.2); g.quadraticCurveTo(mx, my + mw * 2, mx + mw * 1.2, my - mw * 0.2); g.closePath();
        g.fillStyle = "#6a2342"; g.fill(); g.stroke();
        g.beginPath(); ell(g, mx, my + mw * 0.7, mw * 0.55, mw * 0.3, 0); g.fillStyle = "#ff7e9e"; g.fill(); break;
      case "frown": g.arc(mx, my + mw * 0.9, mw, PI * 1.2, PI * 1.8); g.stroke(); break;
      case "o": ell(g, mx, my + mw * 0.3, mw * 0.5, mw * 0.6, 0); g.fillStyle = "#6a2342"; g.fill(); g.stroke(); break;
      case "sleep": ell(g, mx, my + mw * 0.2, mw * 0.35, mw * 0.3 + Math.sin(t * 2) * mw * 0.12, 0); g.fillStyle = "#6a2342"; g.fill(); break;
      case "chew": var cw = 0.5 + Math.abs(Math.sin(t * 14)) * 0.6; ell(g, mx, my + mw * 0.2, mw * cw, mw * (1.1 - cw) * 0.8 + 0.5, 0); g.fillStyle = "#6a2342"; g.fill(); g.stroke(); break;
      default:
        if (st <= 1) { g.moveTo(mx - mw, my); g.quadraticCurveTo(mx - mw * 0.5, my + mw * 0.8, mx, my); g.quadraticCurveTo(mx + mw * 0.5, my + mw * 0.8, mx + mw, my); }
        else g.arc(mx, my - mw * 0.3, mw, PI * 0.2, PI * 0.8);
        g.stroke();
    }
    // elder whiskers
    if (P.elder) {
      g.beginPath(); g.moveTo(mx + mw * 1.6, my - mw * 0.2); g.lineTo(mx + mw * 3.6, my - mw * 0.6); g.moveTo(mx + mw * 1.6, my + mw * 0.3); g.lineTo(mx + mw * 3.6, my + mw * 0.5);
      g.moveTo(mx - mw * 1.6, my - mw * 0.2); g.lineTo(mx - mw * 3.2, my - mw * 0.6); g.moveTo(mx - mw * 1.6, my + mw * 0.3); g.lineTo(mx - mw * 3.2, my + mw * 0.5);
      g.lineWidth = lw * 0.6; g.strokeStyle = "rgba(42,35,64,0.6)"; g.stroke();
    }
    // sick sweat drop
    if (P.sick && !P.dead) {
      var dy2 = (t * 0.8 + P.id) % 1;
      g.beginPath(); var sdx = -BW * 0.55, sdy = cy - BH * 0.55 + dy2 * Rr * 0.3;
      g.moveTo(sdx, sdy - Rr * 0.16); g.bezierCurveTo(sdx + Rr * 0.1, sdy, sdx + Rr * 0.1, sdy + Rr * 0.12, sdx, sdy + Rr * 0.12); g.bezierCurveTo(sdx - Rr * 0.1, sdy + Rr * 0.12, sdx - Rr * 0.1, sdy, sdx, sdy - Rr * 0.16);
      g.globalAlpha *= 1 - dy2 * 0.6; fillStroke(g, "#8fd9ff", "#3a6ea5", lw * 0.6); g.globalAlpha = P.alpha;
    }
  }

  function drawGrump(g, P) {
    var C = P.col, Rr = P.R, t = P.t, lw = Math.max(1.6, Rr * 0.08), o = C.out;
    var hop = P.moving ? Math.abs(Math.sin(P.walk * 2)) * Rr * 0.1 : 0;
    var sq = clamp(P.squash, -0.6, 0.6), breathe = P.statik ? 0 : Math.sin(P.bob + P.id) * 0.03;
    var sx = 1 + sq * 0.25 + breathe, sy = 1 - sq * 0.25 - breathe;
    var bw = Rr * 1.0 * sx, bh = Rr * 0.82 * sy, cy = -Rr * 0.32 - bh - hop;
    g.lineJoin = "round"; g.lineCap = "round";
    // tail: scrappy zigzag
    var wg = Math.sin(t * 4 + P.id) * 0.25;
    g.save(); g.translate(-bw * 0.8, cy + bh * 0.4); g.rotate(-0.5 + wg);
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-Rr * 0.35, -Rr * 0.18); g.lineTo(-Rr * 0.3, -Rr * 0.32); g.lineTo(-Rr * 0.7, -Rr * 0.45);
    g.lineWidth = Rr * 0.14 + lw * 2; g.strokeStyle = o; g.stroke(); g.lineWidth = Rr * 0.14; g.strokeStyle = C.dark; g.stroke();
    g.beginPath(); g.moveTo(-Rr * 0.62, -Rr * 0.38); g.lineTo(-Rr * 0.95, -Rr * 0.62); g.lineTo(-Rr * 0.82, -Rr * 0.4); g.lineTo(-Rr * 1.0, -Rr * 0.32); g.lineTo(-Rr * 0.7, -Rr * 0.3); g.closePath(); fillStroke(g, C.spike, o, lw);
    g.restore();
    // legs
    g.beginPath();
    for (var i = 0; i < 2; i++) {
      var ph = P.walk * 2 + i * PI, lift = P.moving ? Math.max(0, Math.sin(ph)) * Rr * 0.16 : 0, lx = (i ? 0.38 : -0.32) * Rr + (P.moving ? Math.cos(ph) * Rr * 0.14 : 0);
      g.moveTo(lx - Rr * 0.12, cy + bh * 0.7); g.lineTo(lx - Rr * 0.13, -lift - Rr * 0.05); g.lineTo(lx + Rr * 0.22, -lift - Rr * 0.05); g.lineTo(lx + Rr * 0.12, cy + bh * 0.7);
    }
    fillStroke(g, C.feet, o, lw);
    // body (hunched, leaning forward)
    g.save(); g.translate(0, cy); g.rotate(0.22);
    // spikes along the back
    g.beginPath();
    for (var s = 0; s < 6; s++) {
      var a = -PI * 0.98 + s * 0.27, nx = Math.cos(a), ny = Math.sin(a), len = Rr * (0.34 + 0.12 * ((s + 1) % 2)) * (s === 5 ? 0.7 : 1);
      var bx = nx * bw * 0.92, by = ny * bh * 0.92, tx = -ny, ty = nx;
      g.moveTo(bx - tx * Rr * 0.16, by - ty * Rr * 0.16); g.lineTo(bx + nx * len - tx * Rr * 0.08, by + ny * len - ty * Rr * 0.08); g.lineTo(bx + tx * Rr * 0.16, by + ty * Rr * 0.16);
    }
    fillStroke(g, C.spike, o, lw);
    g.beginPath(); bean(g, 0, 0, bw, bh); g.lineWidth = lw * 2; g.strokeStyle = o; g.stroke(); g.fillStyle = P.dead ? C.dark : C.body; g.fill();
    g.save(); g.clip();
    g.beginPath(); ell(g, bw * 0.3, bh * 0.5, bw * 0.6, bh * 0.55, 0.2); g.fillStyle = C.belly; g.fill();
    g.beginPath(); ell(g, -bw * 0.1, bh * 1.05, bw * 1.2, bh * 0.4, 0); g.fillStyle = "rgba(0,0,0,0.18)"; g.fill();
    g.beginPath(); ell(g, -bw * 0.35, -bh * 0.55, bw * 0.22, bh * 0.12, -0.5); g.fillStyle = "rgba(255,255,255,0.22)"; g.fill();
    // warts
    g.beginPath(); circ(g, -bw * 0.5, -bh * 0.1, Rr * 0.07); circ(g, -bw * 0.2, -bh * 0.4, Rr * 0.05); g.fillStyle = C.dark; g.fill();
    g.restore();
    // bat ears pointing back
    g.beginPath(); g.moveTo(-bw * 0.2, -bh * 0.85); g.lineTo(-bw * 0.95, -bh * 1.35); g.lineTo(-bw * 0.6, -bh * 0.95); g.lineTo(-bw * 0.9, -bh * 0.9); g.lineTo(-bw * 0.35, -bh * 0.6); g.closePath(); fillStroke(g, C.dark, o, lw);
    g.restore();
    // face (in un-rotated frame, front-top)
    var fy = cy - bh * 0.3, ex1 = bw * 0.55, ex2 = bw * 0.15, er = Rr * 0.17;
    if (P.dead) {
      g.beginPath(); for (var d = 0; d < 2; d++) { var exx = d ? ex1 : ex2; g.moveTo(exx - er * 0.6, fy - er * 0.6); g.lineTo(exx + er * 0.6, fy + er * 0.6); g.moveTo(exx + er * 0.6, fy - er * 0.6); g.lineTo(exx - er * 0.6, fy + er * 0.6); }
      g.lineWidth = lw; g.strokeStyle = "#ffe14a"; g.stroke();
    } else {
      var bl = P.blink > 0.5 || P.asleep;
      for (var e = 0; e < 2; e++) {
        var x = e ? ex1 : ex2, rs = e ? 1 : 0.88;
        if (bl) { g.beginPath(); g.moveTo(x - er, fy); g.lineTo(x + er, fy); g.lineWidth = lw; g.strokeStyle = o; g.stroke(); continue; }
        g.beginPath(); ell(g, x, fy, er * 1.15 * rs, er * 0.85 * rs, e ? -0.25 : 0.25); fillStroke(g, "#ffe14a", o, lw * 0.8);
        g.beginPath(); ell(g, x + er * 0.25 + (P.lookX || 0) * P.facing * er * 0.2, fy + er * 0.05, er * 0.22, er * 0.62 * rs, 0); g.fillStyle = "#1a0d14"; g.fill();
        g.beginPath(); circ(g, x - er * 0.4, fy - er * 0.3, er * 0.2); g.fillStyle = "#ffffff"; g.fill();
        // heavy brow, slanting down toward the middle
        g.beginPath(); g.moveTo(x - er * 1.3, fy - er * (e ? 1.25 : 0.6)); g.lineTo(x + er * 1.3, fy - er * (e ? 0.6 : 1.25));
        g.lineWidth = lw * 2; g.strokeStyle = o; g.stroke();
      }
      // grin with little teeth
      var mx = bw * 0.42, my = cy + bh * 0.22, mw = Rr * 0.38, open = P.emote === "angry" || (P.mouth === "open") ? 1.6 : 1;
      g.beginPath(); g.moveTo(mx - mw, my - Rr * 0.04); g.quadraticCurveTo(mx, my + Rr * 0.28 * open, mx + mw * 0.9, my - Rr * 0.12); g.quadraticCurveTo(mx, my + Rr * 0.06, mx - mw, my - Rr * 0.04); g.closePath();
      g.fillStyle = "#3a0f1e"; g.fill(); g.lineWidth = lw; g.strokeStyle = o; g.stroke();
      g.beginPath();
      for (var k = 0; k < 4; k++) { var tx = mx - mw * 0.7 + k * mw * 0.45, ty = my + Rr * 0.02 - k * Rr * 0.025; g.moveTo(tx - Rr * 0.06, ty - Rr * 0.02); g.lineTo(tx, ty + Rr * 0.11); g.lineTo(tx + Rr * 0.06, ty - Rr * 0.03); }
      g.moveTo(mx + mw * 0.45, my + Rr * 0.08 * open); g.lineTo(mx + mw * 0.55, my - Rr * 0.04); g.lineTo(mx + mw * 0.65, my + Rr * 0.06 * open);
      g.fillStyle = "#fffbe8"; g.fill();
      // nose
      g.beginPath(); ell(g, bw * 0.78, fy + er * 0.9, Rr * 0.12, Rr * 0.09, 0.3); fillStroke(g, C.dark, o, lw * 0.8);
    }
    // arm (dangly, swinging)
    var sw = P.moving ? Math.sin(P.walk * 2) * 0.5 : Math.sin(t * 1.5 + P.id) * 0.12;
    g.save(); g.translate(bw * 0.25, cy + bh * 0.3); g.rotate(-0.35 + sw);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(Rr * 0.12, Rr * 0.25, Rr * 0.16, Rr * 0.42); g.lineWidth = Rr * 0.22 + lw * 2; g.strokeStyle = o; g.stroke(); g.lineWidth = Rr * 0.22; g.strokeStyle = C.body; g.stroke();
    g.beginPath(); for (var cI = -1; cI <= 1; cI++) { g.moveTo(Rr * 0.16 + cI * Rr * 0.08, Rr * 0.5); g.lineTo(Rr * 0.17 + cI * Rr * 0.12, Rr * 0.66); } g.lineWidth = lw * 1.1; g.strokeStyle = o; g.stroke();
    g.beginPath(); circ(g, Rr * 0.16, Rr * 0.48, Rr * 0.15); fillStroke(g, C.belly, o, lw);
    g.restore();
  }

  /* ---------------- portrait (UI) ---------------- */
  var MOOD_EMOTE = { happy: "happy", ok: null, sad: "sad", sick: "sick", scared: "scared", angry: "angry", sleepy: null, love: "love" };
  R.portrait = function (g, look, cx, cy, size, opts) {
    if (!g) return;
    opts = opts || EMPTY;
    look = look || DEFAULT_LOOK;
    var species = look.species || opts.species || "smol";
    var stage = opts.stage == null ? 3 : opts.stage;
    var st = (SB.STAGES && SB.STAGES[stage]) || { scale: 1 };
    var Rr = 22 * st.scale * (look.size || 1) * (species === "grump" ? 1.05 : 1);
    var span = species === "grump" ? Rr * 2.6 : Rr * (2.4 + (look.ears === 3 ? 0.6 : look.ears === 1 ? 0.35 : 0.15) + (look.antenna ? 0.5 : 0));
    var sc = (size * 0.86) / Math.max(span, 22 * 2.2), em = opts.mood ? (MOOD_EMOTE[opts.mood] !== undefined ? MOOD_EMOTE[opts.mood] : opts.mood) : null;
    var save = { look: PS.look, col: PS.col };
    PS.look = look; PS.col = colorsOf(look, species); PS.R = Rr; PS.facing = opts.facing || 1; PS.walk = 0; PS.moving = false;
    PS.blink = opts.eyesClosed ? 1 : 0; PS.squash = 0; PS.emote = em; PS.mouth = opts.mouth || (em === "sad" ? "frown" : "smile");
    PS.lookX = 0; PS.stage = stage; PS.asleep = !!opts.eyesClosed || opts.mood === "sleepy"; PS.sick = opts.mood === "sick"; PS.elder = stage >= 4;
    PS.dead = !!opts.dead; PS.held = false; PS.t = opts.t || 0; PS.id = 0; PS.bob = 0; PS.alpha = 1; PS.holding = false; PS.statik = true; PS.scared = opts.mood === "scared";
    g.save();
    g.translate(cx, cy + span * sc * 0.5);
    g.scale(sc * PS.facing, sc);
    if (species === "grump") drawGrump(g, PS); else drawSmol(g, PS);
    g.restore();
    PS.look = save.look; PS.col = save.col;
  };

  /* ---------------- minimap (UI) ---------------- */
  R.minimap = function (g, w, h, gm) {
    gm = gm || game;
    if (!g || !gm) return;
    var sx = w / WW, gyTop = 360, gyBot = 560, i;
    var my = function (y) { return clamp(((y - gyTop) / (gyBot - gyTop)) * h, 0, h); };
    for (i = 0; i < NR; i++) {
      g.fillStyle = rgb(mixInto(cur.t1, SKY[i][1], NSKY[i][1], nightK * 0.7)); g.fillRect(i * RW * sx, 0, RW * sx + 1, h);
    }
    g.beginPath(); g.moveTo(0, h);
    for (var x = 0; x <= WW; x += 60) g.lineTo(x * sx, my(gy(x)));
    g.lineTo(w, h); g.closePath();
    var gr = g.createLinearGradient(0, 0, w, 0);
    for (i = 0; i < NR; i++) { gr.addColorStop(clamp((i + 0.1) / NR, 0, 1), rgb(GROUND[i])); gr.addColorStop(clamp((i + 0.9) / NR, 0, 1), rgb(GROUND[i])); }
    g.fillStyle = gr; g.fill();
    var ws = gm.world && gm.world.water;
    if (ws) for (i = 0; i < ws.length; i++) { g.fillStyle = "#3fb6e8"; g.fillRect(ws[i].x0 * sx, my(ws[i].y), (ws[i].x1 - ws[i].x0) * sx, 3); }
    g.strokeStyle = "rgba(0,0,0,0.25)"; g.lineWidth = 1;
    g.beginPath(); for (i = 1; i < NR; i++) { g.moveTo(i * RW * sx + 0.5, 0); g.lineTo(i * RW * sx + 0.5, h); } g.stroke();
    // viewport
    g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.5;
    var vx0 = clamp(view.x0, 0, WW) * sx, vx1 = clamp(view.x1, 0, WW) * sx;
    g.strokeRect(vx0 + 0.75, 0.75, Math.max(3, vx1 - vx0 - 1.5), h - 1.5);
    // creatures
    var cs = gm.creatures || [];
    for (i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c || c.gone) continue;
      var sel = c.id === gm.selectedId, r = sel ? 3.5 : 2.5;
      g.beginPath(); g.arc(c.x * sx, Math.min(h - r, my(c.y) - r), r, 0, TAU);
      g.fillStyle = sel ? "#ffffff" : c.species === "grump" ? "#e0466e" : "#c5ff49"; g.fill();
      g.lineWidth = 1; g.strokeStyle = "rgba(0,0,0,0.5)"; g.stroke();
    }
  };

  /* ================================================================
     WEATHER, NIGHT OVERLAY
     ================================================================ */
  var RAIN = [], NRAIN = 160;
  for (var ri0 = 0; ri0 < NRAIN; ri0++) RAIN.push({ x: Math.random(), y: Math.random(), z: 0.5 + Math.random() * 0.5, p: Math.random() * TAU });
  var bolt = { t: 0, x: 0, seed: 0 }, lastFlash = 0;
  function drawWeather(dt) {
    var w = game && game.world && game.world.weather;
    if (!w) return;
    var kind = w.kind, it = clamp(w.intensity == null ? 0.7 : w.intensity, 0, 1);
    screenT();
    var wet = kind === "rain" || kind === "storm", snow = kind === "snow";
    if ((wet || snow) && it > 0.05) {
      var n = Math.floor(NRAIN * it * (snow ? 0.8 : 1)), wx = wind * 140;
      var rainPath = false, snowPath = false;
      // rain streaks
      ctx.beginPath();
      for (var i = 0; i < n; i++) {
        var d = RAIN[i], spd = snow ? 40 + 30 * d.z : 520 + 380 * d.z;
        d.y += (spd * dt) / H; d.x += ((snow ? Math.sin(now + d.p) * 18 + wx * 0.4 : wx) * dt) / W;
        if (d.y > 1) { d.y -= 1.05; d.x = Math.random(); }
        d.x = ((d.x % 1) + 1) % 1;
        var px = d.x * (W + 40) - 20, py = d.y * H;
        var wxw = cam.x + (px - W / 2) / Z, room = roomIdx(wxw);
        if (room === 3) continue; // the Lab is indoors
        var isSnow = snow || room === 5;
        if (isSnow) { snowPath = true; continue; }
        rainPath = true;
        var len = 10 + 12 * d.z;
        ctx.moveTo(px, py); ctx.lineTo(px - wx * 0.03, py + len);
      }
      if (rainPath) { ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(200,225,255,0.55)"; ctx.stroke(); }
      if (snowPath) {
        ctx.beginPath();
        for (i = 0; i < n; i++) {
          var q = RAIN[i], qx = q.x * (W + 40) - 20, qy = q.y * H, rm = roomIdx(cam.x + (qx - W / 2) / Z);
          if (rm === 3 || !(snow || rm === 5)) continue;
          circ(ctx, qx, qy, 1.4 + q.z * 2);
        }
        ctx.fillStyle = "rgba(255,255,255,0.9)"; ctx.fill();
      }
      if (wet && it > 0.3) { ctx.fillStyle = "rgba(60,80,120," + (0.08 * it) + ")"; ctx.fillRect(0, 0, W, H); }
    }
    // lightning
    var fl = w.flash || 0;
    if (fl > 0.6 && lastFlash <= 0.6) { bolt.t = 0.25; bolt.x = W * (0.15 + Math.random() * 0.7); bolt.seed = Math.random() * 1000; }
    lastFlash = fl;
    if (bolt.t > 0 && roomIdx(cam.x) !== 3) {
      bolt.t -= dt;
      ctx.beginPath(); var bx = bolt.x, by = 0; ctx.moveTo(bx, by);
      for (var s = 0; s < 8; s++) { bx += (hash(bolt.seed + s) - 0.5) * 60; by += H * 0.07; ctx.lineTo(bx, by); }
      ctx.lineWidth = 4; ctx.strokeStyle = "rgba(255,255,230,0.95)"; ctx.stroke(); ctx.lineWidth = 9; ctx.strokeStyle = "rgba(200,220,255,0.3)"; ctx.stroke();
    }
    if (fl > 0) { ctx.fillStyle = "rgba(235,240,255," + (fl * 0.45) + ")"; ctx.fillRect(0, 0, W, H); }
  }
  function drawOverlay() {
    screenT();
    if (nightK > 0.01) { ctx.fillStyle = "rgba(14,18,60," + (nightK * 0.52) + ")"; ctx.fillRect(0, 0, W, H); }
    var dusk = clamp(1 - Math.abs(light - 0.55) * 3, 0, 1) * (1 - nightK);
    if (dusk > 0.02) { ctx.fillStyle = "rgba(255,130,70," + (dusk * 0.12) + ")"; ctx.fillRect(0, 0, W, H); }
    var hol = clamp(1 - Math.abs(cam.x - RW * 0.5) / (RW * 0.75), 0, 1);
    if (hol > 0) { ctx.fillStyle = "rgba(30,10,60," + (hol * 0.18) + ")"; ctx.fillRect(0, 0, W, H); }
  }
  function drawGlows() {
    if (!gqn) return;
    worldT();
    ctx.globalCompositeOperation = "lighter";
    var gk = 0.35 + 0.65 * Math.max(nightK, 1 - light); // additive light washes out bright daytime scenes
    for (var i = 0; i < gqn; i++) {
      var q = GQ[i];
      if (!visible(q.x, q.y, q.r)) continue;
      ctx.globalAlpha = clamp(q.a * gk, 0, 1);
      ctx.drawImage(glowSprite(q.c), q.x - q.r, q.y - q.r, q.r * 2, q.r * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  /* ================================================================
     SCREEN-SPACE UI: bubbles, emotes, names, the hand
     ================================================================ */
  var bubbleCache = new Map();
  function bubbleSprite(text, kind, big) {
    var key = kind + "|" + (big ? 1 : 0) + "|" + text + "|" + dpr;
    var s = bubbleCache.get(key);
    if (s) { s.used = frameNo; return s; }
    var fs = big ? 16 : 13, font = (kind === "babble" ? "italic 700 " : kind === "think" ? "italic 600 " : big ? "900 " : "700 ") + fs + "px " + FONT;
    var mc = document.createElement("canvas").getContext("2d"); mc.font = font;
    var words = String(text).split(" "), lines = [String(text)], maxW = big ? 220 : 170;
    if (mc.measureText(text).width > maxW && words.length > 1) {
      lines = [""]; for (var i = 0; i < words.length; i++) { var tl = lines[lines.length - 1] ? lines[lines.length - 1] + " " + words[i] : words[i]; if (mc.measureText(tl).width > maxW && lines[lines.length - 1]) lines.push(words[i]); else lines[lines.length - 1] = tl; }
      if (lines.length > 3) { lines.length = 3; lines[2] += "…"; }
    }
    var tw = 0; for (i = 0; i < lines.length; i++) tw = Math.max(tw, mc.measureText(lines[i]).width);
    var padX = big ? 12 : 9, lh = fs + 3, bw = Math.ceil(tw + padX * 2), bh = Math.ceil(lines.length * lh + (big ? 12 : 9)), tail = kind === "think" ? 14 : 9;
    var cw = bw + 16, ch = bh + tail + 10;
    var c = document.createElement("canvas"); c.width = Math.ceil(cw * dpr); c.height = Math.ceil(ch * dpr);
    var g = c.getContext("2d"); g.scale(dpr, dpr); g.translate(8, 4);
    g.lineJoin = "round";
    if (kind === "think") {
      g.beginPath(); rr(g, 0, 0, bw, bh, bh / 2);
      for (var k = 0; k < bw; k += 16) { circ(g, k + 8, 2, 8); circ(g, k + 8, bh - 2, 8); }
      g.fillStyle = "#f4f1ff"; g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke(); g.fill();
      g.beginPath(); circ(g, bw / 2 - 4, bh + 6, 4); circ(g, bw / 2 - 9, bh + 12, 2.5); g.fill(); g.stroke();
    } else {
      g.beginPath(); rr(g, 0, 0, bw, bh, Math.min(14, bh / 2));
      g.moveTo(bw / 2 - 7, bh - 1); g.lineTo(bw / 2 - 2, bh + tail); g.lineTo(bw / 2 + 6, bh - 1);
      if (big) { g.save(); g.translate(3, 3); g.fillStyle = "#c5ff49"; g.fill(); g.restore(); }
      g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = big ? 3 : 2; g.stroke(); g.fill();
      g.beginPath(); g.rect(bw / 2 - 6, bh - 4, 11, 5); g.fill();
    }
    g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = kind === "think" ? "#5a4f7a" : INK;
    for (i = 0; i < lines.length; i++) g.fillText(lines[i], bw / 2, (big ? 6 : 4.5) + lh * (i + 0.5));
    s = { c: c, w: cw, h: ch, ax: 8 + bw / 2, ay: 4 + bh + tail, used: frameNo };
    bubbleCache.set(key, s);
    if (bubbleCache.size > 90) { var old = []; bubbleCache.forEach(function (v, kk) { if (v.used < frameNo - 60) old.push(kk); }); for (i = 0; i < old.length; i++) bubbleCache.delete(old[i]); }
    return s;
  }
  function drawBubbleAt(s, x, y, scale, rot) {
    ctx.setTransform(dpr * scale * Math.cos(rot), dpr * scale * Math.sin(rot), -dpr * scale * Math.sin(rot), dpr * scale * Math.cos(rot), x * dpr, y * dpr);
    ctx.drawImage(s.c, -s.ax, -s.ay, s.w, s.h);
  }
  function easeBack(t) { t = clamp(t, 0, 1); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  var EMO = ["happy", "love", "sad", "angry", "scared", "sick", "zzz", "huh", "yum", "ouch", "idea", "music"];
  function emoteSprite(e) { return sprite("emo|" + e, dpr, 40, 40, 20, 20, drawEmote, e, 0, true); }
  function drawEmote(g, e) {
    g.lineJoin = "round"; g.lineCap = "round";
    g.beginPath(); circ(g, 0, 0, 15); g.fillStyle = "#ffffff"; g.strokeStyle = INK; g.lineWidth = 2.2; g.stroke(); g.fill();
    g.beginPath(); g.moveTo(-5, 13); g.lineTo(-9, 19); g.lineTo(0, 14.5); g.fill(); g.stroke();
    g.beginPath(); circ(g, 0, 0, 13.6); g.fillStyle = "#ffffff"; g.fill();
    g.beginPath();
    switch (e) {
      case "happy": circ(g, 0, 0, 9); fillStroke(g, "#ffd166", INK, 1.6); g.beginPath(); g.arc(-3.5, 0, 2, PI * 1.1, PI * 1.9); g.moveTo(5.5, 0); g.arc(3.5, 0, 2, PI * 1.1, PI * 1.9); g.moveTo(-3.5, 2.5); g.quadraticCurveTo(0, 7, 3.5, 2.5); g.lineWidth = 1.6; g.stroke(); break;
      case "love": heartPath(g, 0, 3, 10); fillStroke(g, "#ff5fa2", INK, 1.6); break;
      case "sad": g.moveTo(0, -9); g.bezierCurveTo(6, -1, 7, 4, 0, 9); g.bezierCurveTo(-7, 4, -6, -1, 0, -9); fillStroke(g, "#6fc8ff", INK, 1.6); break;
      case "angry": g.strokeStyle = "#ff3d3d"; g.lineWidth = 3; for (var i = 0; i < 4; i++) { g.save(); g.rotate(i * PI / 2); g.beginPath(); g.moveTo(2, -8); g.quadraticCurveTo(2, -2, 8, -2); g.stroke(); g.restore(); } break;
      case "scared": g.font = "900 18px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#8a5cff"; g.fillText("!!", 0, 1); break;
      case "sick": circ(g, 0, 0, 9); fillStroke(g, "#9be36a", INK, 1.6); g.beginPath(); g.moveTo(-5, -2); g.lineTo(-2, -2); g.moveTo(2, -2); g.lineTo(5, -2); g.moveTo(-4, 4); g.quadraticCurveTo(-2, 2, 0, 4); g.quadraticCurveTo(2, 6, 4, 4); g.lineWidth = 1.5; g.stroke(); break;
      case "zzz": g.font = "900 13px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#5b7bff"; g.fillText("z", -4, 3); g.font = "900 9px " + FONT; g.fillText("z", 4, -4); break;
      case "huh": g.font = "900 19px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText("?", 0, 1); break;
      case "yum": circ(g, 0, 0, 9); fillStroke(g, "#ffb36b", INK, 1.6); g.beginPath(); g.arc(-3.5, -1, 2, PI * 1.1, PI * 1.9); g.moveTo(5.5, -1); g.arc(3.5, -1, 2, PI * 1.1, PI * 1.9); g.lineWidth = 1.5; g.stroke(); g.beginPath(); ell(g, 2, 4.5, 2.6, 2.2, 0); g.fillStyle = "#ff5f7e"; g.fill(); break;
      case "ouch": starPath(g, 0, 0, 11, 5, 7); fillStroke(g, "#ff7a3d", INK, 1.5); break;
      case "idea": circ(g, 0, -2, 7); fillStroke(g, "#fff06a", INK, 1.6); g.beginPath(); g.rect(-3, 5, 6, 4); fillStroke(g, "#b9c1d0", INK, 1.2); break;
      case "music": g.beginPath(); ell(g, -3, 5, 4, 3, -0.4); g.fillStyle = "#b59aff"; g.fill(); g.beginPath(); g.moveTo(0.5, 4); g.lineTo(0.5, -8); g.quadraticCurveTo(5, -5, 7, -2); g.strokeStyle = "#b59aff"; g.lineWidth = 2.4; g.stroke(); break;
      default: g.font = "900 14px " + FONT; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = INK; g.fillText(String(e).slice(0, 2), 0, 1);
    }
  }
  var nameCache = new Map();
  function nameSprite(text, sel) {
    var key = text + "|" + sel + "|" + dpr, s = nameCache.get(key);
    if (s) return s;
    var font = "800 11px " + FONT, mc = document.createElement("canvas").getContext("2d"); mc.font = font;
    var tw = Math.ceil(mc.measureText(text).width), w = tw + 16, h = 18;
    var c = document.createElement("canvas"); c.width = Math.ceil((w + 4) * dpr); c.height = Math.ceil((h + 4) * dpr);
    var g = c.getContext("2d"); g.scale(dpr, dpr); g.translate(2, 2);
    g.beginPath(); rr(g, 0, 0, w, h, 9); g.fillStyle = "rgba(23,24,29,0.85)"; g.fill();
    if (sel) { g.lineWidth = 1.5; g.strokeStyle = "#c5ff49"; g.stroke(); }
    g.font = font; g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = sel ? "#c5ff49" : "#f5f3ed"; g.fillText(text, w / 2, h / 2 + 0.5);
    s = { c: c, w: w + 4, h: h + 4 };
    if (nameCache.size > 80) nameCache.clear();
    nameCache.set(key, s);
    return s;
  }
  var placed = new Float32Array(64), nPlaced = 0;
  // nudge a bubble (x center, bottom y, w, h) up until it no longer overlaps earlier ones this frame
  function placeBubble(x, y, w, h) {
    for (var pass = 0; pass < 6; pass++) {
      var hit = false;
      for (var i = 0; i < nPlaced; i += 4) {
        var px = placed[i], py = placed[i + 1], pw = placed[i + 2], ph = placed[i + 3];
        if (Math.abs(px - x) < (pw + w) / 2 && y > py - ph && y - h < py) { y = py - ph - 2; hit = true; }
      }
      if (!hit) break;
    }
    if (nPlaced < placed.length) { placed[nPlaced++] = x; placed[nPlaced++] = y; placed[nPlaced++] = w; placed[nPlaced++] = h; }
    return y;
  }
  function drawCreatureUI() {
    var cs = game.creatures || [];
    nPlaced = 0;
    var ui = clamp(Z / cam.base, 0.85, 1.15) * (W < 500 ? 0.92 : 1);
    for (var i = 0; i < cs.length; i++) {
      var c = cs[i];
      if (!c || c.gone || !visible(c.x, c.y, 120)) continue;
      var r = creatureR(c), sx = sx_(c.x), top = sy_(c.y - r * (c.species === "grump" ? 2.0 : 2.3) - ((c.look && c.look.ears === 3) ? r * 0.5 : 0));
      var an = c.anim || EMPTY;
      // name tag
      var sel = c.id === game.selectedId;
      if ((sel || c.id === hover.id) && c.species !== "grump" && c.name) {
        var ns = nameSprite(c.name, sel), ny = sy_(Math.max(c.y, c.heldBy ? c.y : gy(c.x))) + 8;
        ctx.setTransform(dpr, 0, 0, dpr, (sx - ns.w / 2) * dpr, ny * dpr); ctx.drawImage(ns.c, 0, 0, ns.w, ns.h);
      }
      // emote
      var st = rs(c), em = an.emoteT > 0 || an.emoteT == null ? an.emote : null;
      if (em !== st.re) { st.re = em; st.reT = now; }
      var bubbleUp = 0;
      if (em && !c.dying) {
        var es = emoteSprite(em), p = easeBack((now - st.reT) / 0.3), fade = an.emoteT != null && an.emoteT < 0.25 ? an.emoteT / 0.25 : 1;
        var ex = sx + r * Z * 0.75 + 10, ey = top - 10 + Math.sin(now * 4 + c.id) * 2;
        ctx.globalAlpha = fade;
        drawBubbleAt(es, ex, ey, ui * p * (W < 500 ? 0.85 : 1), Math.sin(now * 3 + c.id) * 0.08);
        ctx.globalAlpha = 1;
        bubbleUp = 6;
      }
      // speech
      var sp = c.speech;
      if (sp && sp.text && !c.dying) {
        var kind = sp.kind || "say", txt = String(sp.text);
        if (txt !== st.st) { st.st = txt; st.stT = now; }
        var bs = bubbleSprite(txt, kind, false), pp = easeBack((now - st.stT) / 0.25), f2 = sp.t != null && sp.t < 0.3 ? clamp(sp.t / 0.3, 0, 1) : 1;
        var wob = kind === "babble" ? Math.sin(now * 9 + c.id) * 0.05 : 0;
        var bwid = (bs.w - 16) * ui, bx = clamp(sx, bwid / 2 + 6, W - bwid / 2 - 6);
        var by = placeBubble(bx, top - 6 - bubbleUp, bwid, (bs.h - 4) * ui);
        ctx.globalAlpha = f2;
        drawBubbleAt(bs, bx, by + (kind === "babble" ? Math.sin(now * 7) * 1.5 : 0), ui * pp, wob);
        ctx.globalAlpha = 1;
      }
    }
  }

  // the hand
  function drawGlove(g, pose) {
    // local unit: hand ~ 48px tall, (0,0) = palm center
    g.lineJoin = "round"; g.lineCap = "round";
    var o = INK, lw = 2.6, fill = "#ffffff";
    function finger(x, y, len, ang, w) {
      g.save(); g.translate(x, y); g.rotate(ang);
      g.beginPath(); rr(g, -w / 2, -len, w, len + w / 2, w / 2); fillStroke(g, fill, o, lw); g.restore();
    }
    // cuff
    g.beginPath(); rr(g, -12, 13, 24, 11, 4); fillStroke(g, "#c5ff49", o, lw);
    g.beginPath(); g.moveTo(-10, 18.5); g.lineTo(10, 18.5); g.lineWidth = 1.5; g.strokeStyle = "rgba(42,35,64,0.35)"; g.stroke();
    if (pose === "open" || pose === "talk") {
      finger(-9, -6, 15, -0.32, 8.5); finger(-3, -9, 19, -0.1, 8.5); finger(4, -9, 18, 0.1, 8.5); finger(10, -6, 14, 0.32, 8);
      g.beginPath(); rr(g, -14, -10, 28, 26, 11); fillStroke(g, fill, o, lw);
      finger(-12, 4, 13, -1.15, 8.5);
      g.beginPath(); g.moveTo(-6, 2); g.quadraticCurveTo(0, 6, 6, 2); g.lineWidth = 1.5; g.strokeStyle = "rgba(42,35,64,0.3)"; g.stroke();
      if (pose === "talk") {
        g.beginPath(); rr(g, 12, -34, 28, 19, 9); g.moveTo(17, -16); g.lineTo(14, -9); g.lineTo(23, -15.5); fillStroke(g, "#ffffff", o, 2.2);
        g.beginPath(); rr(g, 13.2, -32.8, 25.6, 16.6, 8); g.fillStyle = "#fff"; g.fill();
        g.beginPath(); circ(g, 20, -24.5, 2); circ(g, 26, -24.5, 2); circ(g, 32, -24.5, 2); g.fillStyle = o; g.fill();
      }
    } else if (pose === "fist") {
      g.beginPath(); rr(g, -14, -10, 28, 26, 11); fillStroke(g, fill, o, lw);
      g.beginPath(); for (var i = 0; i < 4; i++) { circ(g, -9 + i * 6, -10, 4.4); } fillStroke(g, fill, o, lw);
      g.beginPath(); rr(g, -14, -10, 28, 10, 5); g.fillStyle = fill; g.fill();
      g.beginPath(); for (i = 1; i < 4; i++) { g.moveTo(-12 + i * 6, -12); g.lineTo(-12 + i * 6, -7); } g.lineWidth = 1.5; g.strokeStyle = "rgba(42,35,64,0.4)"; g.stroke();
      g.beginPath(); rr(g, -16, -4, 16, 8, 4); fillStroke(g, fill, o, lw);
    } else if (pose === "point") {
      // index finger up, (0,0) still palm center; fingertip at (−2,−30)
      finger(-2, -8, 24, -0.05, 8.5);
      g.beginPath(); rr(g, -14, -10, 28, 26, 11); fillStroke(g, fill, o, lw);
      g.beginPath(); for (var j = 0; j < 3; j++) circ(g, 4 + j * 4.5, -9 + j * 1.5, 4); fillStroke(g, fill, o, lw);
      g.beginPath(); rr(g, -2, -10, 16, 9, 4); g.fillStyle = fill; g.fill();
      g.beginPath(); rr(g, -17, -2, 15, 8, 4); fillStroke(g, fill, o, lw);
    }
  }
  function drawFeather(g, t) {
    g.save(); g.rotate(-0.5 + Math.sin(t * 14) * 0.18);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-1, -20, 0, -40); g.lineWidth = 2; g.strokeStyle = "#8a5a3c"; g.stroke();
    g.beginPath(); g.moveTo(0, -6); g.bezierCurveTo(-14, -14, -12, -34, 0, -42); g.bezierCurveTo(12, -34, 14, -14, 0, -6); fillStroke(g, "#ff8fc0", INK, 2);
    g.beginPath(); for (var i = 0; i < 5; i++) { g.moveTo(0, -12 - i * 6); g.lineTo(-7 + i * 0.6, -16 - i * 6); g.moveTo(0, -12 - i * 6); g.lineTo(7 - i * 0.6, -16 - i * 6); } g.lineWidth = 1.1; g.strokeStyle = "rgba(160,40,90,0.45)"; g.stroke();
    g.restore();
  }
  function drawHand() {
    var h = game && game.hand;
    if (!h) return;
    var heldObj = h.heldId != null ? byId(h.heldId) : null;
    if (heldObj && heldObj.heldBy === "hand") { worldT(); drawObject(heldObj, heldObj.x, heldObj.y, 1); }
    if (!h.visible) { if (h.saying) drawHandSaying(h, sx_(h.x), sy_(h.y)); return; }
    var x = sx_(h.x), y = sy_(h.y), tool = h.tool || "grab";
    var S = clamp(Z / cam.base, 0.85, 1.2) * (W < 500 ? 0.95 : 1.25);
    var pose = tool === "tap" ? "point" : tool === "talk" ? "talk" : tool === "tickle" ? "fist" : h.heldId != null ? "fist" : "open";
    var sp = sprite("glove|" + pose, dpr * S, 80, 80, 40, 46, drawGlove, pose, 0, true);
    var bob = Math.sin(now * 3) * 1.2, rot = -0.18;
    var ox = 0, oy = 0;
    if (pose === "point") { ox = 2; oy = 34; } // fingertip on the cursor
    else if (pose === "fist" && tool !== "tickle") oy = 4;
    else if (tool === "tickle") { ox = 30; oy = 52; }
    // shadow
    var gyS = sy_(gy(h.x));
    if (gyS > y) { ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.beginPath(); ell(ctx, x, gyS, 14 * S * clamp(1 - (gyS - y) / 300, 0.3, 1), 4 * S, 0); ctx.fillStyle = "rgba(20,10,40,0.15)"; ctx.fill(); }
    ctx.setTransform(dpr * S * Math.cos(rot), dpr * S * Math.sin(rot), -dpr * S * Math.sin(rot), dpr * S * Math.cos(rot), (x + ox * S) * dpr, (y + oy * S + bob) * dpr);
    if (tool === "tickle") { ctx.save(); ctx.translate(-12, -8); ctx.scale(1.35, 1.35); drawFeather(ctx, now); ctx.restore(); }
    blit(ctx, sp);
    if (h.saying) drawHandSaying(h, x, y);
  }
  function drawHandSaying(h, x, y) {
    if (h.saying !== R._hs) { R._hs = h.saying; R._hsT = now; }
    var bs = bubbleSprite(String(h.saying), "say", true), p = easeBack((now - R._hsT) / 0.25);
    var S2 = W < 500 ? 0.95 : 1.25;
    drawBubbleAt(bs, clamp(x + 34 * S2, bs.w / 2, W - bs.w / 2), Math.max(bs.h, y - 54 * S2), p, -0.04);
  }

  /* ================================================================
     FRAME
     ================================================================ */
  var fpsAcc = 0, fpsN = 0, lastStatT = 0;
  R.frame = function (g, dt) {
    if (!ctx) return;
    var t0 = performance.now();
    if (g && g !== game) game = g;
    if (!game || !game.world) return;
    dt = dt > 0 ? Math.min(dt, 0.1) : 0;
    dtFrame = dt; now += dt; frameNo++; newSprites = 0; gqn = 0;
    idMap.clear();
    var w = game.world;
    light = w.light == null ? 1 : clamp(w.light, 0, 1);
    var dl = w.daylight != null ? w.daylight : light;
    nightK = clamp(1 - dl, 0, 1);
    wind = w.wind || 0;
    updateCamera(dt);
    blendAt(cam.x);
    // hover pick (cheap, throttled)
    if (hover.on && (hover.dirty || frameNo % 6 === 0)) { hover.dirty = false; var pk = R.pick(game, hover.sx, hover.sy); hover.id = pk && pk.type === "creature" ? pk.ref.id : null; }

    drawSky();
    drawClouds();
    var gb = gy(cam.x);
    drawBand(bandFar, 0.25, cur.far, gb - 30, 0.85);
    drawBand(bandMid, 0.5, cur.mid, gb - 8, 0.9);
    drawCeilings();
    drawDecorPass("back");
    drawTerrain();
    worldT();
    drawObjectsPass(true);
    drawShadows();
    drawObjectsPass(false);
    drawCreatures();
    drawWater();
    drawDecorPass("front");
    drawOverlay();
    drawGlows();
    updateParticles(dt);
    worldT();
    drawParticles();
    drawWeather(dt);
    screenT();
    drawCreatureUI();
    drawHand();
    ctx.globalAlpha = 1;

    // stats
    var ms = performance.now() - t0;
    R.stats.drawMs = R.stats.drawMs * 0.9 + ms * 0.1;
    if (dt > 0) { fpsAcc += dt; fpsN++; }
    if (fpsAcc >= 0.5) { R.stats.fps = Math.round(fpsN / fpsAcc); fpsAcc = 0; fpsN = 0; }
    R.stats.sprites = cache.size;
  };
})();
