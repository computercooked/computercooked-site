// pixel purge · computer cooked games
// color-sort shooter: floppy turrets on a 5-slot bench shoot same-color pixels off a corrupted picture.
(() => {
'use strict';

const URL_TXT = 'computercooked.com/games/pixel-purge';
const CARBON = '#101114', LIME = '#C5FF49', LILAC = '#B59AFF', PAPER = '#F5F3ED';
const FONT = 'ui-monospace,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace';
// bright, well-separated turret colors
const GC = ['#C5FF49', '#B59AFF', '#FF4FA0', '#3FD8FF', '#FF8A2A', '#FFD93D', '#3D63FF', '#F5F3ED'];
const BENCH = 5, FIRE = 0.06, MAXLV_TABLE = 24;

const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
let W = 1, H = 1, DPR = 1;

// ---------- utils ----------
function rng(s) { s >>>= 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hexRgb(h) { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function d2(a, b) { const r = a[0] - b[0], g = a[1] - b[1], bl = a[2] - b[2]; return r * r * 0.9 + g * g * 1.2 + bl * bl * 0.8; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function ease(t) { return 1 - Math.pow(1 - t, 3); }
function rr(g, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function fmtTime(ms) { const s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function dateKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

// ---------- save ----------
let save = { unlocked: 1, last: 1, best: {}, done: {}, daily: {}, hw: null, muted: false };
try { const s = JSON.parse(localStorage.getItem('cc-pixel-purge') || 'null'); if (s && typeof s === 'object') save = Object.assign(save, s); } catch (e) {}
function persist() { try { localStorage.setItem('cc-pixel-purge', JSON.stringify(save)); } catch (e) {} }
const NOW = new Date();
const HW_AUTO = NOW.getMonth() === 9; // october, off from nov 1
let hw = save.hw === null || save.hw === undefined ? HW_AUTO : !!save.hw;
let muted = !!save.muted;

// ---------- sdk ----------
function cc() { return window.cc; }
function ccCall(fn, ...a) { try { const c = cc(); if (c && typeof c[fn] === 'function') c[fn](...a); } catch (e) {} }
let eventsSent = 0;
function ccEvent(name, data) { if (eventsSent >= 18) return; eventsSent++; ccCall('event', name, data || {}); }

// ---------- pictures (64x64, drawn in code) ----------
function painter(buf) {
  const S = 64;
  const P = {
    p(i, j, c) { i |= 0; j |= 0; if (i >= 0 && j >= 0 && i < S && j < S) buf[j * S + i] = c; },
    r(x, y, w, h, c) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) P.p(i, j, c); },
    c(cx, cy, rad, c) { P.e(cx, cy, rad, rad, c); },
    e(cx, cy, rx, ry, c) { for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++) for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++) { const dx = (i + 0.5 - cx) / rx, dy = (j + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) P.p(i, j, c); } },
    ring(cx, cy, r1, r2, c, f) { for (let j = Math.floor(cy - r2 - 1); j <= cy + r2 + 1; j++) for (let i = Math.floor(cx - r2 - 1); i <= cx + r2 + 1; i++) { const dx = i + 0.5 - cx, dy = j + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy); if (d >= r1 && d <= r2 && (!f || f(dx, dy))) P.p(i, j, c); } },
    poly(pts, c) { let y0 = 64, y1 = 0; for (const q of pts) { y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); } for (let j = Math.floor(y0); j <= y1; j++) for (let i = 0; i < 64; i++) { const x = i + 0.5, y = j + 0.5; let ins = false; for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) { const [xa, ya] = pts[a], [xb, yb] = pts[b]; if ((ya > y) !== (yb > y) && x < (xb - xa) * (y - ya) / (yb - ya) + xa) ins = !ins; } if (ins) P.p(i, j, c); } },
    line(x0, y0, x1, y1, w, c) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 1; for (let k = 0; k <= n; k++) { const t = k / n; P.c(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c); } },
  };
  return P;
}

const IMGS = {
  coffee: { file: 'coffee.png', cap: 'coffee. the only thing keeping crash running.',
    pal: ['#2b2d52', '#f5f3ed', '#6b3e26', '#cfd0e0', '#c8c2b4', '#c5ff49', '#8a5a3c', '#a8754f'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(0, 48, 64, 16, 6); p.r(0, 48, 64, 3, 7);
      p.c(45, 34, 9, 1); p.c(45, 34, 4.5, 0); p.r(15, 20, 28, 29, 1); p.r(37, 20, 6, 29, 4); p.r(17, 48, 24, 2, 4);
      p.r(14, 17, 30, 4, 4); p.r(16, 18, 26, 2, 2); p.r(15, 32, 28, 7, 5);
      p.r(22, 24, 2, 3, 0); p.r(32, 24, 2, 3, 0); p.r(25, 28, 6, 1, 0);
      p.r(21, 11, 3, 4, 3); p.r(23, 7, 3, 4, 3); p.r(21, 3, 3, 4, 3); p.r(31, 9, 3, 5, 3); p.r(33, 4, 3, 5, 3); p.r(31, 0, 3, 4, 3); } },
  error: { file: 'error.bmp', cap: 'error: an error occurred while displaying the error.',
    pal: ['#1f8a8a', '#c3c3c3', '#1c2a8c', '#e23b3b', '#f5f3ed', '#3b3b3b', '#e6e6e6'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(3, 3, 6, 5, 4); p.r(3, 11, 6, 5, 6); p.r(3, 55, 6, 5, 4);
      p.r(10, 17, 50, 34, 5); p.r(6, 13, 50, 34, 1); p.r(6, 13, 50, 1, 6); p.r(6, 13, 1, 34, 6);
      p.r(7, 14, 48, 7, 2); p.r(9, 16, 16, 2, 4); p.r(48, 15, 6, 5, 1); p.line(49.5, 16, 52.5, 19, 1, 5); p.line(52.5, 16, 49.5, 19, 1, 5);
      p.c(17, 32, 6.5, 3); p.line(14, 29, 20, 35, 1.8, 4); p.line(20, 29, 14, 35, 1.8, 4);
      p.r(28, 27, 22, 2, 5); p.r(28, 32, 16, 2, 5);
      p.r(34, 38, 16, 6, 1); p.r(34, 43, 16, 1, 5); p.r(49, 38, 1, 6, 5); p.r(34, 38, 16, 1, 6); p.r(39, 40, 2, 2, 5); p.r(43, 40, 2, 2, 5);
      p.poly([[50, 41], [50, 53], [53, 50], [58, 50]], 4); } },
  crash: { file: 'crash_sweating.jpg', cap: 'crash, sweating. normal tuesday.',
    pal: ['#3a2a5c', '#d9c9a3', '#b09f7a', '#c5ff49', '#101114', '#4fe3ff', '#8f7f5c', '#b59aff'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(4, 5, 2, 2, 7); p.r(58, 30, 2, 2, 7); p.r(6, 50, 2, 2, 7); p.r(56, 56, 2, 2, 7);
      p.r(9, 7, 46, 38, 1); p.r(49, 7, 6, 38, 2); p.r(9, 41, 46, 4, 2); p.r(14, 12, 32, 25, 6); p.r(15, 13, 30, 23, 3);
      p.r(21, 19, 4, 6, 4); p.r(35, 19, 4, 6, 4); p.r(19, 16, 6, 2, 4); p.r(23, 15, 2, 1, 4); p.r(35, 16, 6, 2, 4); p.r(35, 15, 2, 1, 4);
      p.r(23, 30, 3, 2, 4); p.r(26, 29, 3, 2, 4); p.r(29, 30, 3, 2, 4); p.r(32, 29, 3, 2, 4); p.r(35, 30, 3, 2, 4);
      p.c(52, 14, 2.3, 5); p.r(51, 9, 2, 3, 5); p.c(12, 23, 2.2, 5); p.r(11, 18, 2, 3, 5); p.c(42, 21, 1.8, 5); p.r(42, 17, 1, 2, 5);
      p.r(40, 42, 8, 1, 6); p.r(26, 45, 12, 6, 2); p.r(16, 51, 32, 5, 1); p.r(16, 55, 32, 1, 2); } },
  cat: { file: 'cat_on_keyboard.gif', cap: 'the cat is typing. do not interrupt.',
    pal: ['#8e78d6', '#5a3d2b', '#2d2f36', '#6b6f7a', '#ff9a3c', '#c4621c', '#101114', '#ff8fb1'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(0, 46, 64, 18, 1); p.r(3, 42, 58, 14, 2);
      for (const y of [44, 48, 52]) for (let x = 5; x < 58; x += 5) p.r(x, y, 4, 3, 3);
      p.line(52, 40, 60, 30, 3.5, 4); p.line(60, 30, 57, 23, 3.5, 4);
      p.e(36, 38, 18, 9, 4); p.c(17, 32, 9, 4); p.poly([[9, 28], [11, 18], [17, 25]], 4); p.poly([[17, 25], [23, 18], [25, 29]], 4);
      p.p(12, 22, 7); p.p(12, 23, 7); p.p(22, 22, 7); p.p(22, 23, 7);
      p.r(30, 30, 2, 7, 5); p.r(36, 29, 2, 8, 5); p.r(42, 30, 2, 7, 5);
      p.r(12, 31, 4, 1, 6); p.r(19, 31, 4, 1, 6); p.r(16, 34, 2, 1, 7); p.r(22, 44, 5, 3, 4); p.r(40, 45, 5, 3, 4); } },
  floppy: { file: 'floppy.ico', cap: '1.44 mb of pure storage. you will never fill it.',
    pal: ['#ff5fa2', '#2d2f36', '#c0c4cc', '#7d828c', '#f5f3ed', '#b59aff', '#101114', '#45484f'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(10, 8, 44, 48, 1); p.r(50, 8, 4, 4, 0); p.r(20, 8, 22, 16, 2); p.r(34, 10, 5, 11, 6); p.r(20, 22, 22, 2, 3);
      p.r(15, 30, 34, 24, 4); p.r(15, 30, 34, 4, 5); p.r(18, 38, 26, 1, 3); p.r(18, 43, 26, 1, 3); p.r(18, 48, 20, 1, 3); p.r(13, 51, 3, 3, 6); p.r(10, 8, 1, 48, 7); } },
  bsod: { file: 'blue_screen.png', cap: 'your pc ran into a problem. so did crash. so did the problem.',
    pal: ['#1e5bd6', '#f5f3ed', '#6f97ef'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(10, 10, 4, 4, 1); p.r(10, 20, 4, 4, 1); p.ring(14, 17, 9, 12, 1, (dx) => dx > 4);
      p.r(10, 33, 44, 2, 1); p.r(10, 37, 36, 2, 1); p.r(10, 41, 40, 2, 2);
      p.r(10, 48, 10, 10, 1); p.r(12, 50, 2, 2, 0); p.r(16, 50, 2, 2, 0); p.r(12, 54, 2, 2, 0); p.r(15, 53, 3, 3, 0); p.r(23, 49, 26, 2, 2); p.r(23, 53, 20, 2, 2); } },
  wifi: { file: 'wifi_one_bar.png', cap: 'one bar. the bar is lying.',
    pal: ['#15161c', '#3a3d47', '#c5ff49', '#ff4d4d', '#b59aff'],
    draw(p) { p.r(0, 0, 64, 64, 0); const f = (dx, dy) => dy < 0 && Math.abs(dx) <= -dy * 1.05;
      p.ring(32, 52, 33, 39, 1, f); p.ring(32, 52, 22, 28, 1, f); p.ring(32, 52, 11, 17, 2, f); p.c(32, 52, 5, 2);
      p.line(46, 6, 56, 16, 3, 3); p.line(56, 6, 46, 16, 3, 3); p.r(4, 58, 2, 2, 4); p.r(58, 40, 2, 2, 4); } },
  battery: { file: 'battery_1pct.png', cap: '1%. crash is running on hope and spite.',
    pal: ['#f5f3ed', '#101114', '#ff4d4d', '#d8d4c8', '#b59aff'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(6, 22, 46, 26, 1); p.r(9, 25, 40, 20, 3); p.r(52, 29, 6, 12, 1); p.r(10, 26, 4, 18, 2);
      p.r(29, 4, 5, 10, 2); p.r(29, 16, 5, 3, 2); p.r(6, 53, 46, 3, 3); p.r(44, 6, 3, 3, 4); p.r(12, 8, 3, 3, 4); } },
  duck: { file: 'rubber_duck.png', cap: 'rubber duck debugging. the duck knows. the duck will not say.',
    pal: ['#4fe3ff', '#ffe14d', '#ff8a2a', '#101114', '#2f6fe0', '#f5f3ed', '#e0b830'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(0, 47, 64, 17, 4); for (let x = 0; x < 64; x += 8) p.r(x, 46, 4, 2, 5);
      p.poly([[50, 38], [60, 27], [57, 41]], 1); p.e(34, 42, 20, 10, 1); p.e(38, 47, 15, 4, 6); p.c(22, 26, 10, 1);
      p.r(5, 27, 8, 4, 2); p.r(7, 31, 6, 2, 2); p.c(20, 23, 2, 3); p.p(19, 22, 5); p.e(39, 40, 9, 5, 6); } },
  recycle: { file: 'recycle_bin_full.png', cap: 'recycle bin: 4,096 items. emptying it is a commitment.',
    pal: ['#2a7d7d', '#b9bec7', '#6e747e', '#f5f3ed', '#b59aff', '#c5ff49'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.c(22, 15, 6, 3); p.c(34, 11, 7, 4); p.c(44, 16, 5.5, 3); p.c(29, 18, 4, 5);
      p.poly([[16, 22], [48, 22], [44, 58], [20, 58]], 1); p.r(24, 26, 2, 28, 2); p.r(31, 26, 2, 29, 2); p.r(38, 26, 2, 28, 2);
      p.r(13, 19, 38, 4, 2); p.r(27, 16, 10, 3, 2); p.r(50, 55, 8, 5, 3); p.r(5, 54, 8, 5, 5); } },
  pizza: { file: 'pizza.zip', cap: 'pizza.zip. extracted successfully. crumbs in the keyboard.',
    pal: ['#15161c', '#c8823c', '#ffd93d', '#e23b3b', '#8a5524', '#f0b52a', '#b59aff'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.poly([[8, 12], [56, 10], [26, 59]], 2); p.line(8, 11, 56, 9, 6, 1); p.line(9, 14, 55, 12, 1, 4);
      p.c(24, 22, 4, 3); p.c(38, 21, 3.6, 3); p.c(28, 35, 3.6, 3); p.c(44, 28, 2.5, 3); p.r(19, 30, 2, 5, 5); p.r(34, 40, 2, 4, 5); p.r(4, 56, 2, 2, 6); p.r(56, 48, 2, 2, 6); } },
  hourglass: { file: 'loading.exe', cap: 'loading... estimated time remaining: yes.',
    pal: ['#1c2a5c', '#8a5a3c', '#cfe6ff', '#ffd93d', '#101114', '#b59aff'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.poly([[22, 11], [42, 11], [33, 31], [31, 31]], 2); p.poly([[31, 33], [33, 33], [42, 53], [22, 53]], 2); p.r(31, 30, 2, 4, 2);
      p.poly([[26, 17], [38, 17], [33, 28], [31, 28]], 3); p.r(31, 29, 2, 16, 3); p.poly([[23, 53], [41, 53], [32, 44]], 3);
      p.r(16, 6, 32, 5, 1); p.r(16, 53, 32, 5, 1); p.r(18, 11, 3, 42, 1); p.r(43, 11, 3, 42, 1); p.r(6, 8, 2, 2, 5); p.r(56, 44, 2, 2, 5); } },
  fine: { file: 'everything_is_fine.mp4', cap: 'crash says everything is fine. crash is on fire.',
    pal: ['#4a1c1c', '#d9c9a3', '#b09f7a', '#c5ff49', '#101114', '#ff8a2a', '#ffd93d', '#e23b3b'],
    draw(p) { p.r(0, 0, 64, 64, 0);
      for (let i = 0; i < 8; i++) { const x = i * 8, hgt = [18, 26, 14, 30, 20, 24, 12, 28][i]; p.poly([[x - 2, 64], [x + 10, 64], [x + 4, 64 - hgt - 14]], 7); }
      p.r(14, 12, 36, 30, 1); p.r(44, 12, 6, 30, 2); p.r(19, 17, 24, 19, 3); p.r(24, 23, 5, 2, 4); p.r(34, 23, 5, 2, 4);
      p.r(26, 30, 11, 2, 4); p.r(25, 29, 2, 1, 4); p.r(36, 29, 2, 1, 4); p.r(26, 42, 12, 5, 2);
      for (let i = 0; i < 8; i++) { const x = i * 8, hgt = [10, 16, 8, 18, 12, 14, 6, 16][i]; p.poly([[x, 64], [x + 8, 64], [x + 4, 64 - hgt - 6]], 5); p.poly([[x + 2, 64], [x + 6, 64], [x + 4, 64 - hgt / 2 - 2]], 6); } } },
  mouse: { file: 'mouse_has_seen_things.png', cap: 'the mouse has seen things. mostly your search history.',
    pal: ['#b59aff', '#f5f3ed', '#c8c2b4', '#101114', '#c5ff49', '#2d2f36'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.r(6, 34, 52, 26, 5); p.line(32, 18, 32, 9, 2, 3); p.line(32, 9, 44, 3, 2, 3); p.line(44, 3, 58, 3, 2, 3);
      p.e(32, 37, 13, 19, 1); p.e(38, 42, 6, 12, 2); p.r(31, 18, 1, 14, 3); p.r(30, 21, 4, 7, 3);
      p.c(27, 41, 2.4, 3); p.c(37, 41, 2.4, 3); p.p(26, 40, 1); p.p(36, 40, 1); p.r(30, 48, 4, 2, 3); p.r(8, 56, 3, 2, 4); } },
  pumpkin: { file: 'crash_o_lantern.png', cap: 'crash-o-lantern. carved with a usb stick.', spooky: true,
    pal: ['#1d1433', '#ff8a2a', '#c4621c', '#3ddc84', '#ffd93d', '#b59aff'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.c(53, 10, 6, 5); p.c(56, 8, 5, 0); p.e(32, 39, 25, 19, 1); p.e(32, 39, 9, 19, 2); p.e(32, 39, 6, 18, 1);
      p.r(30, 15, 5, 7, 3); p.r(19, 30, 8, 7, 4); p.r(37, 30, 8, 7, 4); p.r(20, 44, 24, 5, 4); p.r(25, 44, 3, 2, 1); p.r(35, 47, 3, 2, 1); } },
  ghost: { file: 'ghost_404.png', cap: 'file not found. file is a ghost now.', spooky: true,
    pal: ['#15161c', '#f5f3ed', '#c8c2b4', '#101114', '#c5ff49', '#b59aff'],
    draw(p) { p.r(0, 0, 64, 64, 0); p.c(32, 24, 16, 1); p.r(16, 24, 32, 26, 1); p.r(40, 24, 8, 26, 2);
      for (const x of [20, 28, 36, 44]) p.c(x, 50, 4, x === 44 ? 2 : 1); for (const x of [24, 32, 40]) p.c(x, 54, 3, 0);
      p.r(24, 21, 4, 6, 3); p.r(36, 21, 4, 6, 3); p.c(32, 34, 3, 3); p.r(6, 8, 3, 3, 4); p.r(54, 12, 3, 3, 5); p.r(8, 56, 2, 2, 5); } },
};
const BASE_KEYS = ['coffee', 'error', 'crash', 'cat', 'floppy', 'bsod', 'wifi', 'battery', 'duck', 'recycle', 'pizza', 'hourglass', 'fine', 'mouse'];
const imgCache = {};
function getImg(key) {
  if (imgCache[key]) return imgCache[key];
  const def = IMGS[key]; const buf = new Uint8Array(64 * 64); def.draw(painter(buf));
  const pal = def.pal.map(hexRgb);
  const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
  const id = g.createImageData(64, 64);
  for (let i = 0; i < 4096; i++) { const q = pal[buf[i]]; id.data[i * 4] = q[0]; id.data[i * 4 + 1] = q[1]; id.data[i * 4 + 2] = q[2]; id.data[i * 4 + 3] = 255; }
  g.putImageData(id, 0, 0);
  return (imgCache[key] = { key, def, buf, pal, canvas: c });
}

// ---------- level config ----------
const LV_IMG = ['coffee', 'error', 'crash', 'cat', 'floppy', 'bsod', 'wifi', 'battery', 'duck', 'pizza', 'recycle', 'hourglass', 'fine', 'mouse', 'crash', 'coffee', 'error', 'cat', 'floppy', 'fine', 'bsod', 'duck', 'pizza', 'cat'];
const LV_N = [10, 12, 12, 14, 14, 16, 16, 16, 18, 18, 18, 20, 20, 20, 20, 22, 22, 22, 22, 24, 24, 24, 24, 24];
const LV_K = [2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6];
const LV_L = [2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
const HARD = { 10: 1, 15: 1, 20: 1, 24: 1 };
let LV_SEED = {"1":7932,"2":15851,"3":23770,"4":31689,"5":39608,"6":48537,"7":55446,"8":63567,"9":71284,"10":80213,"11":87223,"12":96152,"13":103061,"14":111687,"15":120515,"16":127020,"17":135646,"18":143464,"19":151080,"20":158797,"21":167423,"22":174332,"23":182352,"24":190069}; // picked by bot win-rate against a difficulty curve
const LV_R = [1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4];
function levelCfg(lv) {
  const i = Math.min(lv, MAXLV_TABLE) - 1;
  let img = LV_IMG[(lv - 1) % 24];
  if (lv > 24) img = BASE_KEYS[(lv * 5) % BASE_KEYS.length];
  if (hw && lv === 3) img = 'pumpkin';
  if (hw && lv === 7) img = 'ghost';
  const ammo = lv <= 3 ? [10, 15, 20] : lv <= 10 ? [10, 15, 20, 25, 30] : [5, 10, 20, 30, 40];
  const blind = lv <= 3 ? 0 : HARD[lv] ? 0.6 : Math.min(0.5, 0.1 + lv * 0.02);
  const seed = LV_SEED[lv] !== undefined ? LV_SEED[lv] : lv * 7919 + 13;
  return { lv, n: LV_N[i], k: LV_K[i] + (HARD[lv] && lv < 19 ? 1 : 0), L: LV_L[i], ref: Math.min(4, LV_R[i] + (HARD[lv] ? 1 : 0)), ammo, img, seed, sides: false, blind, hard: !!HARD[lv] && lv <= 24 };
}
const DAILY_EPOCH = new Date(2026, 9, 19);
function dailyNum() { return Math.max(1, Math.round((new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate()) - DAILY_EPOCH) / 864e5) + 1); }
function dailyCfg() {
  const seed = NOW.getFullYear() * 10000 + (NOW.getMonth() + 1) * 100 + NOW.getDate();
  const r = rng(seed * 31 + 7);
  const pool = BASE_KEYS.concat(hw ? ['pumpkin', 'ghost', 'pumpkin'] : []);
  return { lv: 0, daily: true, n: 20, k: 5, L: 3, ref: 3, ammo: [10, 20, 30], sides: false, blind: 0.3, img: pool[Math.floor(r() * pool.length)], seed: seed };
}

// ---------- exposure ----------
// a pixel is exposed if it has a clear line to the left, right or bottom edge
let SIDES = true;
function exposure(grid, n, out) {
  out.fill(0);
  if (SIDES) for (let y = 0; y < n; y++) { const row = y * n;
    for (let x = 0; x < n; x++) if (grid[row + x] >= 0) { out[row + x] = 1; break; }
    for (let x = n - 1; x >= 0; x--) if (grid[row + x] >= 0) { out[row + x] = 1; break; } }
  for (let x = 0; x < n; x++) for (let y = n - 1; y >= 0; y--) if (grid[y * n + x] >= 0) { out[y * n + x] = 1; break; }
}

// ---------- level build ----------
function buildLevel(cfg) {
  SIDES = cfg.sides !== false;
  const im = getImg(cfg.img), n = cfg.n, np = im.pal.length;
  const pidx = new Uint8Array(n * n), counts = new Array(np).fill(0), tally = new Array(np);
  for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
    tally.fill(0);
    const x0 = Math.floor(gx * 64 / n), x1 = Math.max(x0 + 1, Math.floor((gx + 1) * 64 / n));
    const y0 = Math.floor(gy * 64 / n), y1 = Math.max(y0 + 1, Math.floor((gy + 1) * 64 / n));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const v = im.buf[y * 64 + x]; tally[v] += (x === (x0 + x1 >> 1) && y === (y0 + y1 >> 1)) ? 1.5 : 1; }
    let b = 0; for (let i = 1; i < np; i++) if (tally[i] > tally[b]) b = i;
    pidx[gy * n + gx] = b; counts[b]++;
  }
  // cluster palette entries into k groups (weighted k-means)
  const pts = []; counts.forEach((c, i) => { if (c > 0) pts.push({ i, c, rgb: im.pal[i] }); });
  pts.sort((a, b) => b.c - a.c);
  let k = Math.min(cfg.k, pts.length);
  const centers = [pts[0].rgb.slice()];
  while (centers.length < k) { let best = null, bd = -1; for (const p of pts) { let d = Infinity; for (const c of centers) d = Math.min(d, d2(p.rgb, c)); const s = d * Math.sqrt(p.c); if (s > bd) { bd = s; best = p; } } centers.push(best.rgb.slice()); }
  let asg = new Array(pts.length).fill(0);
  for (let it = 0; it < 12; it++) {
    asg = pts.map(p => { let b = 0, bd = Infinity; centers.forEach((c, j) => { const d = d2(p.rgb, c); if (d < bd) { bd = d; b = j; } }); return b; });
    for (let j = 0; j < k; j++) { let s = [0, 0, 0], w = 0; pts.forEach((p, q) => { if (asg[q] === j) { s[0] += p.rgb[0] * p.c; s[1] += p.rgb[1] * p.c; s[2] += p.rgb[2] * p.c; w += p.c; } }); if (w) centers[j] = [s[0] / w, s[1] / w, s[2] / w]; }
  }
  // drop empty clusters
  const usedC = [...new Set(asg)]; k = usedC.length;
  const remap = {}; usedC.forEach((c, j) => remap[c] = j);
  const palToCol = new Array(np).fill(0); pts.forEach((p, q) => palToCol[p.i] = remap[asg[q]]);
  const cent = usedC.map(c => centers[c]);
  // assign distinct game colors (greedy by distance)
  const pairs = []; cent.forEach((c, j) => GC.forEach((h, g) => pairs.push([d2(c, hexRgb(h)), j, g])));
  pairs.sort((a, b) => a[0] - b[0]);
  const hex = new Array(k), taken = new Set();
  for (const [, j, g] of pairs) if (!hex[j] && !taken.has(g)) { hex[j] = GC[g]; taken.add(g); }
  const col = new Int8Array(n * n); for (let i = 0; i < n * n; i++) col[i] = palToCol[pidx[i]];

  // generate a solvable turret sequence by simulating a patient player
  const r = rng(cfg.seed);
  const sim = Int8Array.from(col), ex = new Uint8Array(n * n);
  const una = new Array(k).fill(0); for (let i = 0; i < n * n; i++) una[col[i]]++;
  const bench = [], seq = [];
  const tx = n / 2, ty = n + 3;
  function target(c) { exposure(sim, n, ex); let b = -1, bd = Infinity; for (let i = 0; i < n * n; i++) if (ex[i] && sim[i] === c) { const dx = (i % n) - tx, dy = ((i / n) | 0) - ty, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = i; } } return b; }
  function settle() { let fired = true; while (fired) { fired = false; for (const t of bench) { if (t.left <= 0) continue; const i = target(t.c); if (i >= 0) { sim[i] = -1; t.left--; t.fired++; fired = true; } } for (let q = bench.length - 1; q >= 0; q--) if (bench[q].left <= 0) bench.splice(q, 1); } }
  let guard = 0;
  while (una.some(v => v > 0) && guard++ < 2000) {
    exposure(sim, n, ex);
    const exCount = new Array(k).fill(0); for (let i = 0; i < n * n; i++) if (ex[i] && sim[i] >= 0) exCount[sim[i]]++;
    let cand = [];
    // sometimes deal a disk whose color is buried for now: it blocks its lane or naps on the bench
    if (cfg.blind && bench.length < cfg.ref - 1 && r() < cfg.blind) for (let c = 0; c < k; c++) if (una[c] > 0 && exCount[c] === 0) cand.push(c);
    if (!cand.length) for (let c = 0; c < k; c++) if (una[c] > 0 && exCount[c] > 0) cand.push(c);
    if (!cand.length) for (let c = 0; c < k; c++) if (una[c] > 0) cand.push(c);
    const c = cand[Math.floor(r() * cand.length)];
    let a = cfg.ammo[Math.floor(r() * cfg.ammo.length)];
    if (a > una[c]) a = una[c];
    if (una[c] - a < 4) a = una[c];
    const t = { c, left: a, fired: 0 }; bench.push(t); una[c] -= a; settle();
    if (t.left > 0 && bench.length > cfg.ref && t.fired > 0) { una[c] += t.left; a = t.fired; bench.splice(bench.indexOf(t), 1); }
    if (a > 0) seq.push({ c, a });
  }
  // deal into lanes, keeping order inside each lane
  const lanes = []; for (let i = 0; i < cfg.L; i++) lanes.push([]);
  for (const s of seq) { let tot = 0; const w = lanes.map(l => { const v = 1 / (1 + l.length * 0.6); tot += v; return v; }); let x = r() * tot, li = 0; while (x > w[li] && li < lanes.length - 1) { x -= w[li]; li++; } lanes[li].push(s); }
  return { cfg, im, n, k, hex, col, lanes, turrets: seq.length };
}

// ---------- state ----------
let S = null;
let mode = 'play'; // play | reveal | win | lose | menu
let menuFrom = 'play';
let paused = false;
let T = 0;
let parts = [];
let toastMsg = '', toastT = 0;
let quip = '', quipT = 0, crashFace = 0, crashFaceT = 0;
let shake = 0;
const L = {};

function scramble(name, amt, seed) { const r = rng(seed); const glyph = '#@%&$!?01'; return name.split('').map(ch => ch !== '.' && ch !== '_' && r() < amt ? glyph[Math.floor(r() * glyph.length)] : ch).join(''); }

function say(text, dur, face) { quip = text; quipT = dur || 3.2; if (face !== undefined) { crashFace = face; crashFaceT = dur || 2; } }

function loadLevel(cfg) {
  closeRun(false, mode !== 'lose');
  const b = buildLevel(cfg);
  const n = b.n;
  S = Object.assign(b, {
    grid: Int8Array.from(b.col), vis: new Uint8Array(n * n).fill(1), ex: new Uint8Array(n * n), exList: [], dirty: true,
    bench: new Array(BENCH).fill(null), gone: [], bullets: [], total: n * n, left: n * n, cleared: 0,
    undo: 1, undoUsed: 0, pid: 0, placed: 0, stuck: 0, revealT: 0, startMs: performance.now(), endMs: 0,
    runOpen: false, won: false, warned: false, idleWarned: false, glitchT: 2, glitchOn: 0, rowOff: new Int8Array(n), scoreT: 0, maxBench: 0,
  });
  mode = 'play'; paused = false; parts = []; eventsSent = 0;
  if (cfg.daily) say('daily picture #' + dailyNum() + '. same one for everybody. no pressure.', 4);
  else if (cfg.hard) say('hard level. crash recommends prayer and ctrl+z.', 4, 1);
  else if (cfg.lv === 1) say('tap a floppy. it shoots its color from below. that is the whole job.', 6);
  else if (cfg.lv === 2) say('disks only hit the lowest pixel in each column. dig from the bottom.', 5);
  else if (cfg.lv === 4) say('3 lanes now. plan ahead. or panic. both work sometimes.', 4);
  else if (cfg.k >= 6 && cfg.lv === 19) say('six colors. my gpu is sweating.', 4);
  else say(['restoring ' + b.im.def.file + '...', 'another corrupted file. great.', 'pixels go brrr.', 'do not let the bench fill up. i mean it.'][cfg.lv % 4], 3);
  if (!cfg.daily) { save.last = cfg.lv; persist(); }
  layout();
}

function closeRun(won, quit) {
  if (!S || !S.runOpen) return;
  S.runOpen = false;
  const bonus = won ? (S.cfg.daily ? 300 : Math.min(600, 25 * S.cfg.lv)) : 0;
  const score = S.cleared + bonus;
  S.score = score;
  const durationMs = Math.round((S.endMs || performance.now()) - S.startMs);
  ccCall('end', { score, durationMs, completed: !quit });
}

function slotCenter(i) { return { x: L.slotX[i], y: L.slotCY }; }
function laneGeom(li) {
  const nL = S.lanes.length, inner = L.cw - 2 * L.pad, lw = inner / nL;
  const s = Math.min(lw - 14, L.slot * 1.15, L.laneH * 0.5);
  const x = L.cx + L.pad + lw * (li + 0.5);
  return { x, y: L.laneY + s / 2 + 6, s, lw, x0: L.cx + L.pad + lw * li };
}

function refreshExposure() {
  if (!S.dirty) return; S.dirty = false;
  exposure(S.grid, S.n, S.ex);
  const l = []; for (let i = 0; i < S.ex.length; i++) if (S.ex[i]) l.push(i); S.exList = l;
}
function cellCenter(i) { const n = S.n; return { x: L.gx + ((i % n) + 0.5) * L.cs, y: L.gy + (((i / n) | 0) + 0.5) * L.cs }; }
function findTarget(t, slot) {
  refreshExposure();
  const sc = slotCenter(slot); let b = -1, bd = Infinity;
  for (const i of S.exList) { if (S.grid[i] !== t.c) continue; const p = cellCenter(i); const dx = p.x - sc.x, dy = p.y - sc.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; b = i; } }
  return b;
}

function pickLane(li) {
  if (mode !== 'play' || paused || !S) return;
  const lane = S.lanes[li]; if (!lane || !lane.length) return;
  const slot = S.bench.indexOf(null);
  if (slot < 0) { sfx('full'); shake = 0.25; say('bench full. that is literally how you lose.', 2.4, 1); return; }
  if (!S.runOpen && !S.won && S.placed === 0) { S.runOpen = true; S.startMs = performance.now(); ccCall('start'); }
  const d = lane.shift(); const g = laneGeom(li);
  S.bench[slot] = { c: d.c, a: d.a, lane: li, fx: g.x, fy: g.y, fs: g.s, at: 0, cd: 0.04, kick: 0, idle: false, id: ++S.pid, combo: 0 };
  S.placed++;
  const cnt = S.bench.filter(Boolean).length; S.maxBench = Math.max(S.maxBench, cnt);
  sfx('place');
  if (cnt === 4 && !S.warned) { S.warned = true; say('4 of 5 slots. this is how it starts.', 2.6, 1); }
}

function doUndo() {
  if (!S || S.undo <= 0 || !(mode === 'play' || mode === 'lose')) return;
  let best = -1, bid = -1;
  for (let i = 0; i < BENCH; i++) { const t = S.bench[i]; if (t && t.idle && t.id > bid) { bid = t.id; best = i; } }
  if (best < 0) for (let i = 0; i < BENCH; i++) { const t = S.bench[i]; if (t && t.id > bid) { bid = t.id; best = i; } }
  if (best < 0) { say('nothing to undo. you are doing too well.', 2); return; }
  const t = S.bench[best]; S.lanes[t.lane].unshift({ c: t.c, a: t.a }); S.bench[best] = null;
  S.undo--; S.undoUsed++; S.stuck = 0;
  if (mode === 'lose') mode = 'play';
  sfx('undo'); say('ctrl+z. the only button that loves you back.', 2.6, 0);
  ccEvent('undo', { lv: S.cfg.lv });
}

function fire(t, slot, idx) {
  S.grid[idx] = -1; S.left--; S.dirty = true; t.a--; t.kick = 1; S.cleared++; t.combo++;
  const sc = slotCenter(slot), p = cellCenter(idx);
  const sy = sc.y - L.slot * 0.5;
  const dist = Math.hypot(p.x - sc.x, p.y - sy);
  S.bullets.push({ x0: sc.x, y0: sy, x1: p.x, y1: p.y, t: 0, dur: Math.max(0.07, dist / 1500), idx, c: t.c, note: t.combo });
}

function leave(i) {
  const t = S.bench[i]; const sc = slotCenter(i);
  S.gone.push({ c: t.c, x: sc.x, y: sc.y, gt: 0 });
  S.bench[i] = null; sfx('leave');
}

function lose() {
  mode = 'lose'; S.endMs = performance.now(); sfx('lose'); shake = 0.4;
  say('out of slots. classic.', 99, 2);
  ccEvent('lose', { lv: S.cfg.lv, pct: Math.round(100 * S.cleared / S.total) });
  if (S.undo <= 0) closeRun(false, false);
}

function win() {
  mode = 'reveal'; S.revealT = 0; S.won = true; S.endMs = performance.now();
  closeRun(true, false);
  sfx('win');
  const d = S.cfg;
  if (d.daily) { const k = dateKey(NOW); const prev = save.daily[k]; const ms = S.endMs - S.startMs; if (!prev || ms < prev.t) save.daily[k] = { t: Math.round(ms), u: S.undoUsed }; ccEvent('daily_clear', { n: dailyNum() }); }
  else { save.unlocked = Math.max(save.unlocked, d.lv + 1); save.done[d.lv] = 1; if (!save.best[d.lv] || S.score > save.best[d.lv]) save.best[d.lv] = S.score; ccEvent('level_clear', { lv: d.lv }); }
  persist();
  const lines = ['picture restored. i feel 4% less corrupted.', 'restored. nobody tell IT.', 'every pixel back where it belongs. unlike my life.', 'file recovered. crash is proud. briefly.'];
  say(lines[(d.lv || dailyNum()) % lines.length], 99, 0);
  // confetti
  const c = { x: L.gx + L.cs * S.n / 2, y: L.gy + L.cs * S.n / 2 };
  for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 380; parts.push({ x: c.x, y: c.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 200, life: 1.2 + Math.random() * 0.6, max: 1.8, s: 3 + Math.random() * 5, col: [LIME, LILAC, PAPER, '#FF4FA0', '#3FD8FF'][i % 5] }); }
}

function update(dt) {
  T += dt;
  if (quipT > 0 && quipT < 90) quipT -= dt;
  if (crashFaceT > 0) { crashFaceT -= dt; if (crashFaceT <= 0 && mode !== 'lose') crashFace = 0; }
  if (toastT > 0) toastT -= dt;
  if (shake > 0) shake -= dt;
  for (const p of parts) { p.life -= dt; p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  if (parts.length) parts = parts.filter(p => p.life > 0);
  if (!S || mode === 'menu') return;

  for (let i = 0; i < BENCH; i++) { const t = S.bench[i]; if (!t) continue; t.at = Math.min(1, t.at + dt / 0.16); t.kick = Math.max(0, t.kick - dt * 9); }
  for (const g of S.gone) g.gt += dt; if (S.gone.length) S.gone = S.gone.filter(g => g.gt < 0.32);

  // bullets
  for (const b of S.bullets) {
    b.t += dt;
    if (b.t >= b.dur && !b.hit) {
      b.hit = true; S.vis[b.idx] = 0;
      const p = cellCenter(b.idx), col = S.hex[b.c];
      for (let q = 0; q < 5; q++) { const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160; if (parts.length < 700) parts.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.45 + Math.random() * 0.25, max: 0.7, s: Math.max(2, L.cs * 0.38), col }); }
      parts.push({ x: p.x, y: p.y, vx: 0, vy: -900 * 0.05, life: 0.14, max: 0.14, s: L.cs * 1.3, col: '#ffffff', flash: true });
      sfx('pop', b.c, b.note);
    }
  }
  if (S.bullets.length) S.bullets = S.bullets.filter(b => !b.hit);

  if (mode === 'play') {
    // glitch flicker on the remaining corruption
    S.glitchT -= dt;
    if (S.glitchT <= 0) { S.glitchOn = 0.12; S.glitchT = 1.8 + Math.random() * 2.5; S.rowOff.fill(0); const nr = 1 + Math.floor(Math.random() * 3); for (let q = 0; q < nr; q++) S.rowOff[Math.floor(Math.random() * S.n)] = Math.random() < 0.5 ? -1 : 1; }
    if (S.glitchOn > 0) { S.glitchOn -= dt; if (S.glitchOn <= 0) S.rowOff.fill(0); }

    let allIdle = true, full = true;
    for (let i = 0; i < BENCH; i++) {
      const t = S.bench[i];
      if (!t) { full = false; continue; }
      if (t.at < 1) { allIdle = false; continue; }
      t.cd -= dt;
      let guard = 0;
      while (t.cd <= 0 && guard++ < 6) {
        const tg = findTarget(t, i);
        if (tg < 0) { if (!t.idle) t.combo = 0; t.idle = true; t.cd = 0; break; }
        t.idle = false; fire(t, i, tg); t.cd += FIRE;
        if (t.a <= 0) { leave(i); break; }
      }
      if (S.bench[i] && !S.bench[i].idle) allIdle = false;
    }
    if (full && allIdle && !S.bullets.length) { S.stuck += dt; if (S.stuck > 0.45) lose(); } else S.stuck = 0;
    if (mode === 'play' && !S.idleWarned) { const idle = S.bench.filter(t => t && t.idle && t.at >= 1).length; if (idle >= 2 && S.bench.filter(Boolean).length >= 3) { S.idleWarned = true; say('the sleepy ones have nothing to shoot yet. relatable.', 3, 1); } }
    if (S.left === 0 && !S.bullets.length) win();
    S.scoreT -= dt; if (S.scoreT <= 0) { S.scoreT = 0.3; ccCall('score', S.cleared); }
  } else if (mode === 'reveal') {
    S.revealT += dt; if (S.revealT > 1.1) mode = 'win';
  }
}

// ---------- audio ----------
let AC = null, master = null, lastPop = 0;
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
function ensureAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); master = AC.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(AC.destination); } catch (e) { AC = null; } }
  if (AC && AC.state === 'suspended') AC.resume().catch(() => {});
}
function tone(f, dur, type, vol, f2, delay) {
  if (!AC || muted) return;
  const t0 = AC.currentTime + (delay || 0);
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.02);
}
function sfx(kind, c, note) {
  if (!AC || muted) return;
  if (kind === 'pop') {
    const now = AC.currentTime; if (now - lastPop < 0.028) return; lastPop = now;
    const base = 330 * Math.pow(2, ((c || 0) * 2) / 12);
    const f = base * Math.pow(2, SCALE[(note || 0) % SCALE.length] / 12);
    tone(f, 0.06, 'triangle', 0.09); tone(f * 2, 0.03, 'square', 0.015);
  } else if (kind === 'place') { tone(160, 0.07, 'square', 0.08, 90); tone(900, 0.03, 'triangle', 0.04); }
  else if (kind === 'leave') tone(500, 0.12, 'sine', 0.06, 1400);
  else if (kind === 'full') tone(110, 0.18, 'sawtooth', 0.07, 80);
  else if (kind === 'undo') { tone(700, 0.08, 'triangle', 0.07, 350); }
  else if (kind === 'win') { [0, 4, 7, 12, 16].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.16, 'triangle', 0.1, 0, i * 0.08)); }
  else if (kind === 'lose') { tone(420, 0.5, 'sawtooth', 0.07, 70); tone(210, 0.6, 'square', 0.04, 50, 0.1); }
  else if (kind === 'click') tone(1200, 0.025, 'square', 0.03);
}
function setMuted(m) { muted = !!m; save.muted = muted; persist(); if (master) master.gain.value = muted ? 0 : 0.55; }

// ---------- sprite ----------
const crashImg = new Image(); let crashOk = false;
crashImg.onload = () => { crashOk = true; }; crashImg.src = 'crash.png';

// ---------- layout ----------
function layout() {
  const r = cv.getBoundingClientRect();
  W = Math.max(1, r.width || innerWidth); H = Math.max(1, r.height || innerHeight);
  DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const cw = Math.min(W, Math.max(300, Math.min(480, H * 0.62)));
  L.cw = cw; L.cx = (W - cw) / 2; L.pad = clamp(cw * 0.035, 8, 14);
  L.hudH = Math.round(clamp(H * 0.075, 46, 58));
  L.infoY = L.hudH; L.infoH = 22;
  const top = L.hudH + L.infoH + 4, avail = H - top - 8, inner = cw - 2 * L.pad;
  L.slot = Math.max(34, Math.min(inner / 5 - 8, 66, avail * 0.13));
  const lanesMin = L.slot * 1.7 + 16;
  L.pic = Math.max(120, Math.min(inner, avail - (L.slot + 18) - lanesMin));
  L.picX = L.cx + (cw - L.pic) / 2; L.picY = top;
  L.benchY = top + L.pic + 10; L.benchH = L.slot + 8;
  const gap = (inner - 5 * L.slot) / 4;
  L.slotX = []; for (let i = 0; i < BENCH; i++) L.slotX.push(L.cx + L.pad + L.slot / 2 + i * (L.slot + gap));
  L.slotCY = L.benchY + L.benchH / 2;
  L.laneY = L.benchY + L.benchH + 8; L.laneH = H - L.laneY - 16;
  if (S) { L.cs = Math.max(3, Math.floor(L.pic / S.n)); const sz = L.cs * S.n; L.gx = Math.round(L.cx + (cw - sz) / 2); L.gy = Math.round(L.picY + (L.pic - sz) / 2); }
}

// ---------- drawing ----------
let buttons = [];
function btn(x, y, w, h, label, fn, o) { buttons.push({ x, y, w, h, fn, label, o: o || {} }); drawBtn(x, y, w, h, label, o || {}); }
function drawBtn(x, y, w, h, label, o) {
  ctx.save();
  rr(ctx, x, y, w, h, Math.min(10, h / 3));
  ctx.fillStyle = o.primary ? LIME : o.fill || 'rgba(245,243,237,0.08)'; ctx.fill();
  ctx.strokeStyle = o.primary ? LIME : 'rgba(245,243,237,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = o.primary ? CARBON : o.color || PAPER; ctx.font = 'bold ' + (o.fs || Math.round(Math.min(16, h * 0.42))) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  ctx.restore();
}
function wrap(g, text, maxW) { const words = text.split(' '); const lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; }

function drawDisk(g, x, y, s, col, ammo, o) {
  o = o || {};
  const l = x - s / 2, t = y - s / 2;
  g.save();
  if (o.alpha !== undefined) g.globalAlpha = o.alpha;
  rr(g, l, t, s, s, s * 0.09); g.fillStyle = col; g.fill();
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.moveTo(l + s * 0.86, t); g.lineTo(l + s, t); g.lineTo(l + s, t + s * 0.14); g.closePath(); g.fill();
  g.fillStyle = '#d9dce3'; g.fillRect(l + s * 0.26, t, s * 0.46, s * 0.34);
  g.fillStyle = '#2a2c33'; g.fillRect(l + s * 0.5, t + s * 0.05, s * 0.11, s * 0.23);
  g.fillStyle = PAPER; g.fillRect(l + s * 0.13, t + s * 0.44, s * 0.74, s * 0.5);
  g.fillStyle = col; g.globalAlpha *= 0.55; g.fillRect(l + s * 0.13, t + s * 0.44, s * 0.74, s * 0.06); g.globalAlpha = o.alpha !== undefined ? o.alpha : 1;
  g.fillStyle = CARBON; g.font = 'bold ' + Math.round(s * (String(ammo).length > 2 ? 0.27 : 0.33)) + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(ammo), x, t + s * 0.71);
  rr(g, l, t, s, s, s * 0.09); g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = Math.max(1, s * 0.03); g.stroke();
  g.restore();
}

function drawPicture(g, x, y, cs, o) {
  const n = S.n, size = cs * n;
  g.fillStyle = '#0a0b0d'; g.fillRect(x, y, size, size);
  g.imageSmoothingEnabled = false;
  g.globalAlpha = o.cleanA !== undefined ? o.cleanA : 0.9; g.drawImage(S.im.canvas, x, y, size, size); g.globalAlpha = 1;
  if (o.cells !== false) {
    const off = o.off;
    for (let c = 0; c < S.k; c++) {
      g.fillStyle = S.hex[c];
      for (let j = 0; j < n; j++) { const ox = off ? off[j] * cs : 0; for (let i = 0; i < n; i++) { const id = j * n + i; if (S.vis[id] && S.col[id] === c) g.fillRect(x + i * cs + ox, y + j * cs, cs, cs); } }
    }
    if (o.shade !== false) {
      g.fillStyle = 'rgba(12,13,16,0.24)';
      for (let j = 0; j < n; j++) { const ox = off ? off[j] * cs : 0; for (let i = 0; i < n; i++) { const id = j * n + i; if (S.vis[id] && S.grid[id] >= 0 && !S.ex[id]) g.fillRect(x + i * cs + ox, y + j * cs, cs, cs); } }
      if (cs >= 6) { g.fillStyle = 'rgba(255,255,255,0.38)'; const hs = Math.max(1, Math.round(cs * 0.28)), ho = Math.max(1, Math.round(cs * 0.14));
        for (const id of S.exList) if (S.vis[id] && S.grid[id] >= 0) { const i = id % n, j = (id / n) | 0; g.fillRect(x + i * cs + ho + (off ? off[j] * cs : 0), y + j * cs + ho, hs, hs); } }
    }
    if (cs >= 7) { g.strokeStyle = 'rgba(16,17,20,0.22)'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < n; i++) { g.moveTo(x + i * cs + 0.5, y); g.lineTo(x + i * cs + 0.5, y + size); g.moveTo(x, y + i * cs + 0.5); g.lineTo(x + size, y + i * cs + 0.5); } g.stroke(); }
  }
}

function drawCrash(x, y, s, face) {
  if (crashOk) { ctx.imageSmoothingEnabled = false; ctx.drawImage(crashImg, face * 128, 0, 128, 128, x, y, s, s); }
  else { ctx.fillStyle = '#d9c9a3'; ctx.fillRect(x + s * 0.1, y + s * 0.1, s * 0.8, s * 0.65); ctx.fillStyle = LIME; ctx.fillRect(x + s * 0.2, y + s * 0.2, s * 0.6, s * 0.42); }
  if (hw) { // tiny witch hat
    ctx.fillStyle = '#2a1846'; ctx.beginPath(); ctx.moveTo(x + s * 0.3, y + s * 0.16); ctx.lineTo(x + s * 0.7, y + s * 0.16); ctx.lineTo(x + s * 0.58, y - s * 0.22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FF8A2A'; ctx.fillRect(x + s * 0.22, y + s * 0.13, s * 0.56, s * 0.06);
  }
}

function draw() {
  buttons = [];
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  // background
  ctx.fillStyle = CARBON; ctx.fillRect(0, 0, W, H);
  if (hw) { const gr = ctx.createRadialGradient(W / 2, H * 0.35, 10, W / 2, H * 0.35, Math.max(W, H) * 0.7); gr.addColorStop(0, 'rgba(255,138,42,0.10)'); gr.addColorStop(0.6, 'rgba(110,60,180,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
  if (!S) return;
  const sx = shake > 0 ? (Math.random() - 0.5) * 8 * shake / 0.4 : 0;
  ctx.save(); ctx.translate(sx, 0);

  drawHud();

  // picture frame
  const size = L.cs * S.n;
  ctx.fillStyle = 'rgba(181,154,255,0.18)'; rr(ctx, L.gx - 5, L.gy - 5, size + 10, size + 10, 8); ctx.fill();
  const revealing = mode === 'reveal' || mode === 'win';
  refreshExposure();
  drawPicture(ctx, L.gx, L.gy, L.cs, { cleanA: revealing ? 1 : 0.88, off: S.glitchOn > 0 ? S.rowOff : null });
  if (mode === 'reveal') { const t = clamp(S.revealT / 0.8, 0, 1); const yy = L.gy + size * t; ctx.fillStyle = 'rgba(197,255,73,0.7)'; ctx.fillRect(L.gx, yy - 2, size, 4); ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - t)) + ')'; ctx.fillRect(L.gx, L.gy, size, size); }
  // scanlines
  ctx.fillStyle = 'rgba(0,0,0,0.10)'; for (let yy = L.gy; yy < L.gy + size; yy += 3) ctx.fillRect(L.gx, yy, size, 1);

  // bullets
  for (const b of S.bullets) {
    const t = clamp(b.t / b.dur, 0, 1), x = b.x0 + (b.x1 - b.x0) * t, y = b.y0 + (b.y1 - b.y0) * t;
    const t2 = clamp(t - 0.25, 0, 1), xt = b.x0 + (b.x1 - b.x0) * t2, yt = b.y0 + (b.y1 - b.y0) * t2;
    ctx.strokeStyle = S.hex[b.c]; ctx.globalAlpha = 0.55; ctx.lineWidth = Math.max(2, L.cs * 0.3); ctx.beginPath(); ctx.moveTo(xt, yt); ctx.lineTo(x, y); ctx.stroke(); ctx.globalAlpha = 1;
    const bs = Math.max(4, L.cs * 0.55); ctx.fillStyle = '#fff'; ctx.fillRect(x - bs / 2, y - bs / 2, bs, bs);
  }

  drawBench();
  drawLanes();

  // particles
  for (const p of parts) { ctx.globalAlpha = clamp(p.life / p.max, 0, 1); ctx.fillStyle = p.col; const s = p.flash ? p.s * (1 + (1 - p.life / p.max)) : p.s; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s); }
  ctx.globalAlpha = 1;
  ctx.restore();

  // side hints on wide screens
  if (W - (L.cx + L.cw) > 190) {
    const x = L.cx + L.cw + 28; let y = L.picY + 10;
    ctx.fillStyle = 'rgba(245,243,237,0.55)'; ctx.font = 'bold 13px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    const lines = ['how it works', '', 'tap a floppy (or 1-' + S.lanes.length + ')', 'it shoots the lowest', 'pixel of its color in', 'any column.', '', 'empty disks leave.', 'full bench of sleepy', 'disks = you lose.', '', 'z  ctrl+z (1 per level)', 'r  restart', 'm  mute', 'esc  levels'];
    lines.forEach((t, i) => { ctx.fillStyle = i === 0 ? LIME : 'rgba(245,243,237,0.55)'; ctx.fillText(t, x, y + i * 18); });
  }
  if (L.cx > 190) {
    const s = Math.min(150, L.cx - 50); const x = L.cx - s - 24, y = L.picY + 30;
    drawCrash(x, y, s, crashFaceT > 0 || mode === 'lose' ? crashFace : 0);
    ctx.fillStyle = 'rgba(245,243,237,0.4)'; ctx.font = 'bold 12px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('crash, your tech support', x + s / 2, y + s + 8);
  }

  // credit
  ctx.fillStyle = 'rgba(245,243,237,0.32)'; ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.fillText('computer cooked games', W / 2, H - 3);

  if (mode === 'win') drawWin();
  else if (mode === 'lose') drawLose();
  else if (mode === 'menu') drawMenu();
  if (paused && mode !== 'menu') { ctx.fillStyle = 'rgba(16,17,20,0.75)'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = LIME; ctx.font = 'bold 22px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('paused', W / 2, H / 2 - 12); ctx.fillStyle = PAPER; ctx.font = 'bold 13px ' + FONT; ctx.fillText('tap to resume', W / 2, H / 2 + 16); }
  if (toastT > 0) { ctx.globalAlpha = clamp(toastT / 0.3, 0, 1); ctx.font = 'bold 13px ' + FONT; const tw = ctx.measureText(toastMsg).width + 28; rr(ctx, W / 2 - tw / 2, H * 0.42, tw, 34, 10); ctx.fillStyle = LILAC; ctx.fill(); ctx.fillStyle = CARBON; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(toastMsg, W / 2, H * 0.42 + 17); ctx.globalAlpha = 1; }
}

function drawHud() {
  const x0 = L.cx + L.pad, x1 = L.cx + L.cw - L.pad, h = L.hudH;
  const bs = Math.min(h - 14, 34), by = Math.round((h - bs) / 2);
  // buttons right
  const uw = Math.round(bs * 1.25);
  let bx = x1 - bs;
  btn(bx, by, bs, bs, muted ? 'off' : 'snd', () => setMuted(!muted), { fs: 11 });
  bx -= bs + 5; btn(bx, by, bs, bs, '↻', () => restart(), { fs: 18 });
  bx -= uw + 5; btn(bx, by, uw, bs, '↶' + S.undo, () => doUndo(), { fs: 12, color: S.undo ? LIME : 'rgba(245,243,237,0.35)' });
  bx -= bs + 5; btn(bx, by, bs, bs, '≡', () => openMenu(), { fs: 18 });
  const lvR = bx;
  // crash + bubble
  const cs = h - 6; const showSideCrash = L.cx > 190;
  let tx = x0;
  if (!showSideCrash) { drawCrash(x0 - 4, 2, cs, crashFaceT > 0 || mode === 'lose' ? crashFace : 0); tx = x0 + cs - 2; }
  const bw = lvR - tx - 6;
  if (bw > 40) {
    const text = quipT > 0 ? quip : (mode === 'play' ? (S.cfg.daily ? 'daily #' + dailyNum() + '. ' : 'lvl ' + S.cfg.lv + '. ') + 'clear every pixel.' : '');
    const bh = h - 8, byy = 4;
    rr(ctx, tx, byy, bw, bh, 9); ctx.fillStyle = 'rgba(245,243,237,0.94)'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx, byy + bh * 0.45); ctx.lineTo(tx - 6, byy + bh * 0.6); ctx.lineTo(tx + 1, byy + bh * 0.68); ctx.fill();
    let fs = 12; ctx.font = 'bold ' + fs + 'px ' + FONT; let lines = wrap(ctx, text, bw - 12);
    if (lines.length > 2) { fs = 10.5; ctx.font = 'bold ' + fs + 'px ' + FONT; lines = wrap(ctx, text, bw - 10); }
    lines = lines.slice(0, 3);
    ctx.fillStyle = CARBON; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const lh = fs + 1.5, y0 = byy + bh / 2 - (lines.length - 1) * lh / 2;
    lines.forEach((l, i) => ctx.fillText(l, tx + 7, y0 + i * lh + 1));
  }
  // info row
  const iy = L.infoY + 2;
  const pct = Math.floor(100 * S.cleared / S.total);
  const name = mode === 'play' || mode === 'lose' ? scramble(S.im.def.file, 0.55 * (S.left / S.total), Math.floor(T * 3) + S.cfg.seed) : S.im.def.file;
  ctx.font = 'bold 12px ' + FONT; ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = S.cfg.hard ? '#FF4FA0' : LIME; const tag = S.cfg.daily ? 'daily #' + dailyNum() : 'lvl ' + S.cfg.lv + (S.cfg.hard ? ' hard' : '');
  ctx.fillText(tag, x0, iy);
  const tw = ctx.measureText(tag + ' ').width;
  ctx.fillStyle = 'rgba(245,243,237,0.7)'; ctx.fillText(name, x0 + tw, iy);
  ctx.textAlign = 'right'; ctx.fillStyle = PAPER; ctx.fillText(pct + '%', x1, iy);
  ctx.fillStyle = 'rgba(245,243,237,0.12)'; ctx.fillRect(x0, iy + 15, x1 - x0, 3);
  ctx.fillStyle = LIME; ctx.fillRect(x0, iy + 15, (x1 - x0) * S.cleared / S.total, 3);
}

function drawBench() {
  const s = L.slot, cnt = S.bench.filter(Boolean).length;
  const warn = cnt >= 4;
  for (let i = 0; i < BENCH; i++) {
    const x = L.slotX[i] - s / 2 - 3, y = L.benchY + 1;
    rr(ctx, x, y, s + 6, s + 6, 9);
    ctx.fillStyle = 'rgba(245,243,237,0.05)'; ctx.fill();
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
    ctx.strokeStyle = cnt === 5 ? 'rgba(255,79,90,' + (0.5 + 0.4 * Math.sin(T * 10)) + ')' : warn ? 'rgba(255,138,42,0.7)' : 'rgba(245,243,237,0.18)';
    ctx.stroke(); ctx.setLineDash([]);
  }
  for (const g of S.gone) { const t = g.gt / 0.32; drawDisk(ctx, g.x, g.y - 40 * ease(t), s * (1 - 0.4 * t), S.hex[g.c], 0, { alpha: 1 - t }); }
  for (let i = 0; i < BENCH; i++) {
    const t = S.bench[i]; if (!t) continue;
    const e = ease(t.at), sc = slotCenter(i);
    const x = t.fx + (sc.x - t.fx) * e, y = t.fy + (sc.y - t.fy) * e - t.kick * 3;
    const sz = t.fs + (s - t.fs) * e;
    const sleepy = t.idle && t.at >= 1;
    drawDisk(ctx, x, y + (sleepy ? Math.sin(T * 3 + i) * 1.5 : 0), sz, S.hex[t.c], t.a, { alpha: sleepy ? 0.62 : 1 });
    if (sleepy) { ctx.fillStyle = LILAC; ctx.font = 'bold ' + Math.round(s * 0.26) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const zz = (T * 1.2 + i * 0.3) % 1; ctx.globalAlpha = 1 - zz; ctx.fillText('z', x + s * 0.34, y - s * 0.5 - zz * 12); ctx.globalAlpha = 1; }
  }
}

function drawLanes() {
  const nL = S.lanes.length;
  for (let li = 0; li < nL; li++) {
    const g = laneGeom(li), lane = S.lanes[li];
    ctx.fillStyle = 'rgba(245,243,237,0.035)'; rr(ctx, g.x0 + 3, L.laneY, g.lw - 6, L.laneH, 10); ctx.fill();
    if (!lane.length) { ctx.fillStyle = 'rgba(245,243,237,0.2)'; ctx.font = 'bold 11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('empty', g.x, g.y); continue; }
    const ps = g.s * 0.62, maxPeek = clamp(Math.floor((L.laneH - g.s - 12) / (ps * 0.62)), 1, 4);
    const step = Math.min(ps * 0.66, (L.laneH - g.s - ps * 0.5 - 10) / Math.max(1, maxPeek - 0.4));
    const peeks = Math.min(maxPeek, lane.length - 1);
    for (let k = peeks; k >= 1; k--) { const d = lane[k]; drawDisk(ctx, g.x, g.y + g.s / 2 + ps / 2 - ps * 0.25 + step * (k - 1) + 4, ps, S.hex[d.c], d.a, { alpha: 0.82 }); }
    const d = lane[0]; const bob = mode === 'play' ? Math.sin(T * 4 + li) * 1.2 : 0;
    drawDisk(ctx, g.x, g.y + bob, g.s, S.hex[d.c], d.a);
    if (lane.length > peeks + 1) { ctx.fillStyle = 'rgba(245,243,237,0.45)'; ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText('+' + (lane.length - 1 - peeks), g.x0 + g.lw - 8, L.laneY + L.laneH - 4); }
    if (W > 600 && nL <= 4) { ctx.fillStyle = 'rgba(245,243,237,0.3)'; ctx.font = 'bold 10px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(String(li + 1), g.x0 + 9, L.laneY + 5); }
  }
  // first-level hint
  if (S.cfg.lv === 1 && S.placed < 2 && mode === 'play') {
    const g = laneGeom(0); const b = Math.sin(T * 6) * 5;
    ctx.fillStyle = LIME; ctx.beginPath(); const ax = g.x + g.s * 0.35, ay = g.y + g.s * 0.2 + b;
    ctx.moveTo(ax, ay); ctx.lineTo(ax + 14, ay + 26); ctx.lineTo(ax + 6, ay + 24); ctx.lineTo(ax + 3, ay + 34); ctx.lineTo(ax - 2, ay + 33); ctx.lineTo(ax + 1, ay + 23); ctx.lineTo(ax - 7, ay + 25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = CARBON; ctx.lineWidth = 1.5; ctx.stroke();
  }
}

function cardRect() { const x = L.cx + L.pad, y = Math.max(L.benchY - 4, H * 0.42), w = L.cw - 2 * L.pad, h = H - y - 16; return { x, y, w, h }; }
function drawCard(title, lines, btns) {
  const r = cardRect();
  ctx.fillStyle = 'rgba(16,17,20,0.94)'; rr(ctx, r.x, r.y, r.w, r.h, 14); ctx.fill();
  ctx.strokeStyle = mode === 'lose' ? 'rgba(255,79,160,0.7)' : LIME; ctx.lineWidth = 2; ctx.stroke();
  let y = r.y + 14;
  ctx.fillStyle = mode === 'lose' ? '#FF4FA0' : LIME; ctx.font = 'bold ' + (r.w < 340 ? 17 : 19) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  ctx.fillText(title, r.x + r.w / 2, y); y += 28;
  ctx.font = 'bold 13px ' + FONT;
  for (const ln of lines) { const parts2 = wrap(ctx, ln.t, r.w - 28); ctx.fillStyle = ln.c || 'rgba(245,243,237,0.85)'; for (const p of parts2) { ctx.fillText(p, r.x + r.w / 2, y); y += 18; } y += 3; }
  const bh = Math.min(44, Math.max(34, (r.y + r.h - y - 14) / 2 - 4));
  const rows = btns.length > 2 ? 2 : 1;
  const by = Math.max(y + 4, r.y + r.h - 12 - rows * bh - (rows - 1) * 8);
  const bw = (r.w - 28 - 8) / 2;
  if (btns.length === 1) btn(r.x + 14, by, r.w - 28, bh, btns[0].l, btns[0].f, { primary: true });
  else {
    btn(r.x + 14, by, btns.length === 3 ? r.w - 28 : bw, bh, btns[0].l, btns[0].f, { primary: true });
    if (btns.length === 2) btn(r.x + 14 + bw + 8, by, bw, bh, btns[1].l, btns[1].f);
    else { btn(r.x + 14, by + bh + 8, bw, bh, btns[1].l, btns[1].f); btn(r.x + 14 + bw + 8, by + bh + 8, bw, bh, btns[2].l, btns[2].f); }
  }
}
function drawWin() {
  const d = S.cfg, ms = S.endMs - S.startMs;
  const lines = [{ t: S.im.def.cap }, { t: S.score + ' pts · ' + fmtTime(ms) + (S.undoUsed ? ' · used ctrl+z' : ' · no ctrl+z'), c: PAPER }];
  if (!d.daily && save.best[d.lv]) lines.push({ t: 'best ' + save.best[d.lv], c: 'rgba(245,243,237,0.5)' });
  drawCard('restored: ' + S.im.def.file, lines, d.daily ? [{ l: 'share card', f: share }, { l: 'levels', f: openMenu }, { l: 'play lvl ' + save.last, f: () => loadLevel(levelCfg(save.last)) }] : [{ l: 'next ▸', f: () => loadLevel(levelCfg(d.lv + 1)) }, { l: 'share', f: share }, { l: 'replay', f: restart }]);
}
function drawLose() {
  const pct = Math.floor(100 * S.cleared / S.total);
  const lines = [{ t: 'all 5 slots full and nobody has a clear shot.' }, { t: pct + '% restored · ' + S.cleared + ' pixels', c: PAPER }];
  const b = S.undo > 0 ? [{ l: 'ctrl+z (1 left)', f: doUndo }, { l: 'retry', f: restart }, { l: 'share', f: share }] : [{ l: 'retry', f: restart }, { l: 'share', f: share }, { l: 'levels', f: openMenu }];
  drawCard('out of slots. classic.', lines, b);
}

function drawMenu() {
  buttons = [];
  ctx.fillStyle = 'rgba(16,17,20,0.96)'; ctx.fillRect(0, 0, W, H);
  const x0 = L.cx + L.pad, w = L.cw - 2 * L.pad; let y = 16;
  ctx.fillStyle = LIME; ctx.font = 'bold 24px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText('pixel purge', x0, y);
  btn(x0 + w - 40, y - 4, 40, 36, '×', closeMenu, { fs: 20 });
  y += 34;
  ctx.fillStyle = 'rgba(245,243,237,0.6)'; ctx.font = 'bold 12px ' + FONT; ctx.fillText('crash\'s pictures got corrupted. shoot them clean.', x0, y); y += 26;
  const dk = save.daily[dateKey(NOW)];
  btn(x0, y, w, 46, 'daily picture #' + dailyNum() + (dk ? '  ✓ ' + fmtTime(dk.t) : ''), () => loadLevel(dailyCfg()), { primary: true, fs: 15 }); y += 58;
  const total = Math.max(24, Math.ceil((save.unlocked + 1) / 6) * 6);
  const cols = 6, gap = 6, bw = (w - gap * (cols - 1)) / cols, bh = Math.min(bw, 44);
  const rowsFit = Math.floor((H - y - 70) / (bh + gap));
  const start = Math.max(0, Math.ceil(save.unlocked / cols) - rowsFit) * cols;
  for (let i = start; i < Math.min(total, start + rowsFit * cols); i++) {
    const lv = i + 1, r = Math.floor((i - start) / cols), c = (i - start) % cols;
    const bx = x0 + c * (bw + gap), by = y + r * (bh + gap);
    const open = lv <= save.unlocked;
    if (open) btn(bx, by, bw, bh, save.done[lv] ? lv + '✓' : String(lv), () => loadLevel(levelCfg(lv)), { fs: 13, color: save.done[lv] ? LIME : PAPER });
    else drawBtn(bx, by, bw, bh, String(lv), { fs: 13, color: 'rgba(245,243,237,0.25)', fill: 'rgba(245,243,237,0.03)' });
  }
  y += rowsFit * (bh + gap) + 6;
  btn(x0, Math.min(y, H - 56), w, 40, 'spooky mode: ' + (hw ? 'on 🎃' : 'off'), () => { hw = !hw; save.hw = hw; persist(); }, { fs: 13 });
}

function openMenu() { if (mode === 'menu') return; menuFrom = mode; mode = 'menu'; sfx('click'); }
function closeMenu() { mode = menuFrom === 'menu' ? 'play' : menuFrom; }
function restart() { if (!S) return; if (S.runOpen) closeRun(false, mode === 'play'); loadLevel(S.cfg); }

// ---------- share card ----------
function makeCard() {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d');
  g.fillStyle = CARBON; g.fillRect(0, 0, 1080, 1080);
  g.fillStyle = LIME; g.font = 'bold 84px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('pixel purge', 70, 60);
  const won = S.won;
  g.fillStyle = won ? PAPER : '#FF4FA0'; g.font = 'bold 40px ' + FONT;
  const head = S.cfg.daily ? 'daily #' + dailyNum() + (won ? ' · restored' : ' · out of slots') : 'lvl ' + S.cfg.lv + (won ? ' · restored' : ' · out of slots. classic.');
  g.fillText(head, 70, 160);
  const ps = 600, cs = Math.floor(ps / S.n), sz = cs * S.n, px = (1080 - sz) / 2, py = 240;
  g.fillStyle = 'rgba(181,154,255,0.3)'; g.fillRect(px - 10, py - 10, sz + 20, sz + 20);
  drawPicture(g, px, py, cs, { cleanA: 1, cells: !won, shade: false });
  g.fillStyle = PAPER; g.font = 'bold 38px ' + FONT; g.textAlign = 'center';
  const ms = (S.endMs || performance.now()) - S.startMs;
  const stat = won ? (S.score + ' pts · ' + fmtTime(ms) + (S.undoUsed ? ' · used ctrl+z' : ' · no ctrl+z')) : Math.floor(100 * S.cleared / S.total) + '% restored · ' + S.cleared + ' pixels';
  g.fillText(stat, 540, py + sz + 36);
  g.fillStyle = LIME; g.font = 'bold 36px ' + FONT; g.fillText(URL_TXT, 540, 990);
  g.fillStyle = 'rgba(245,243,237,0.45)'; g.font = 'bold 24px ' + FONT; g.fillText('computer cooked games', 540, 1036);
  if (crashOk) { g.imageSmoothingEnabled = false; g.drawImage(crashImg, (won ? 0 : 2) * 128, 0, 128, 128, 880, 30, 140, 140); }
  return c;
}
function shareText() {
  const ms = (S.endMs || performance.now()) - S.startMs;
  if (S.cfg.daily) return S.won ? 'pixel purge daily #' + dailyNum() + ': restored ' + S.im.def.file + ' in ' + fmtTime(ms) + (S.undoUsed ? ' (needed ctrl+z)' : ' (no ctrl+z)') + '. ' + URL_TXT : 'pixel purge daily #' + dailyNum() + ': out of slots at ' + Math.floor(100 * S.cleared / S.total) + '%. classic. ' + URL_TXT;
  return S.won ? 'i restored ' + S.im.def.file + ' in pixel purge (lvl ' + S.cfg.lv + ', ' + S.score + ' pts). ' + URL_TXT : 'out of slots on lvl ' + S.cfg.lv + ' of pixel purge with ' + Math.floor(100 * S.cleared / S.total) + '% restored. classic. ' + URL_TXT;
}
function toast(m) { toastMsg = m; toastT = 2.2; }
async function share() {
  ccEvent('share', { lv: S.cfg.lv, won: S.won });
  const text = shareText(); let blob = null;
  try { blob = await new Promise(r => makeCard().toBlob(r, 'image/png')); } catch (e) {}
  try {
    if (blob && navigator.canShare) { const file = new File([blob], 'pixel-purge.png', { type: 'image/png' }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'pixel purge' }); return; } }
    if (navigator.share) { await navigator.share({ text, title: 'pixel purge' }); return; }
  } catch (e) { if (e && e.name === 'AbortError') return; }
  try { if (blob && navigator.clipboard && window.ClipboardItem) { await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob, 'text/plain': new Blob([text], { type: 'text/plain' }) })]); toast('card + text copied'); return; } } catch (e) {}
  try { await navigator.clipboard.writeText(text); toast('copied to clipboard'); } catch (e) { toast('could not copy. screenshot it.'); }
}


function makeThumb() {
  const cfg = Object.assign(levelCfg(15), { img: 'crash', n: 20, k: 5, sides: false });
  loadLevel(cfg); const n = S.n;
  // carve a believable half-played state: bottom rows and a few columns cleared
  for (let i = 0; i < n * n; i++) { const x = i % n, y = (i / n) | 0; const h = 8 + Math.round(3 * Math.sin(x * 0.9) + 2 * Math.cos(x * 0.37)); if (n - 1 - y < h) { S.grid[i] = -1; S.vis[i] = 0; } }
  S.dirty = true; refreshExposure();
  const c = document.createElement('canvas'); c.width = 640; c.height = 360; const g = c.getContext('2d');
  g.fillStyle = CARBON; g.fillRect(0, 0, 640, 360);
  const cs = 15, px = 30, py = 30;
  g.fillStyle = 'rgba(181,154,255,0.3)'; g.fillRect(px - 6, py - 6, cs * n + 12, cs * n + 12);
  drawPicture(g, px, py, cs, { cleanA: 1 });
  // bullets streaking up
  const cols = [[4, 0], [9, 2], [14, 3]];
  for (const [x, ci] of cols) { g.strokeStyle = S.hex[ci % S.k]; g.lineWidth = 4; g.globalAlpha = 0.8; g.beginPath(); g.moveTo(px + x * cs + cs / 2, py + n * cs - 6); g.lineTo(px + x * cs + cs / 2, py + n * cs - 70); g.stroke(); g.globalAlpha = 1; }
  g.fillStyle = LIME; g.font = 'bold 50px ' + FONT; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText('pixel', 360, 34); g.fillText('purge', 360, 86);
  g.fillStyle = PAPER; g.font = 'bold 15px ' + FONT; g.fillText('shoot the corruption off', 362, 148); g.fillText("crash's pictures.", 362, 168);
  for (let i = 0; i < 4; i++) drawDisk(g, 390 + i * 64, 228, 54, S.hex[i % S.k], [20, 15, 30, 10][i], {});
  g.strokeStyle = 'rgba(245,243,237,0.3)'; g.setLineDash([4, 4]); rr(g, 357, 196, 252, 64, 8); g.stroke(); g.setLineDash([]);
  if (crashOk) { g.imageSmoothingEnabled = false; g.drawImage(crashImg, 128, 0, 128, 128, 520, 268, 88, 88); }
  g.fillStyle = 'rgba(245,243,237,0.5)'; g.font = 'bold 12px ' + FONT; g.fillText('computer cooked games', 362, 330);
  return c.toDataURL('image/png');
}

// ---------- input ----------
function laneAt(x, y) {
  if (!S || y < L.laneY - 6) return -1;
  for (let li = 0; li < S.lanes.length; li++) { const g = laneGeom(li); if (x >= g.x0 && x < g.x0 + g.lw) return li; }
  return -1;
}
cv.addEventListener('pointerdown', (e) => {
  e.preventDefault(); ensureAudio(); cv.focus();
  const r = cv.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
  if (paused) { paused = false; return; }
  for (let i = buttons.length - 1; i >= 0; i--) { const b = buttons[i]; if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { sfx('click'); b.fn(); return; } }
  if (mode === 'menu') return;
  if (mode === 'play') { const li = laneAt(x, y); if (li >= 0) pickLane(li); }
});
window.addEventListener('keydown', (e) => {
  ensureAudio();
  const k = e.key.toLowerCase();
  if (paused) { paused = false; return; }
  if (k >= '1' && k <= '4') { pickLane(+k - 1); e.preventDefault(); }
  else if (k === 'z') doUndo();
  else if (k === 'r') restart();
  else if (k === 'm') setMuted(!muted);
  else if (k === 'escape') { if (mode === 'menu') closeMenu(); else openMenu(); }
  else if (k === 'enter' || k === ' ') { const p = buttons.find(b => b.o.primary); if (p && mode !== 'play') { p.fn(); e.preventDefault(); } }
});
window.addEventListener('message', (e) => {
  const d = e.data; if (!d || typeof d !== 'object') return;
  if (d.type === 'cc-mute') setMuted(!!d.muted);
  else if (d.type === 'cc-restart') restart();
  else if (d.type === 'cc-pause') paused = true;
});
document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'play') paused = true; });
window.addEventListener('resize', layout);

// ---------- loop ----------
let last = performance.now(), speed = 1;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000) * speed; last = now;
  if (!paused) { if (speed > 1) { for (let i = 0; i < speed; i++) update(dt / speed); } else update(dt); }
  draw();
  requestAnimationFrame(frame);
}
loadLevel(levelCfg(clamp(save.last || 1, 1, save.unlocked)));
requestAnimationFrame(frame);

// test hooks (harmless outside dev)
window.__pp = { get S() { return S; }, get mode() { return mode; }, pickLane, doUndo, loadLevel, levelCfg, dailyCfg, buildLevel, setSpeed(v) { speed = v; }, setSeeds(o) { LV_SEED = o; }, step(dt) { update(dt); }, makeCard, makeThumb, refreshExposure };
})();
