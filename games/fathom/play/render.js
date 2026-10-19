/*
 * FATHOM: canvas pixel-art renderer. Reads state, never changes it.
 *
 * Each board is drawn on a tiny "art" canvas (11 px per cell) and scaled up by CSS with
 * image-rendering: pixelated, so every art pixel stays a crisp square. No image files:
 * subs, buoys, fire and the 5x7 font are all drawn from code.
 */
(function (root) {
  'use strict';

  const CELL = 11;
  const BORDER = 2;

  const PAL = {
    frameOuter: '#08090b', frameAttack: '#3a2a4a', frameHome: '#1d4a4a',
    seaA: '#123a57', seaB: '#113653', murkA: '#0d2b45', murkB: '#0c2840',
    grid: '#0a2238', wave: '#1d5679', waveMurk: '#163f5e',
    foam: '#cfefff', white: '#ffffff', ink: '#06101c',
    hull: '#7d8f99', hullHi: '#b8cbd3', hullLo: '#46565f', tower: '#5d707a', port: '#d8f3ff',
    eHull: '#8a4b4b', eHullHi: '#c47c6f', eHullLo: '#4e2629', eTower: '#6d3838',
    char: '#2b2f38', charHi: '#3f4552',
    fire1: '#fff3a8', fire2: '#ffcf4a', fire3: '#ff8a2b', fire4: '#e8432e', smoke: '#4a5060',
    decoy: '#B59AFF', decoyLo: '#6f55c9', decoyHi: '#e6dcff',
    sonar: '#C5FF49', sonarLo: '#4d6b12',
    heat: { 1: '#ff5a3c', 2: '#ffc23d', 3: '#4fd1ff', 0: '#6d87a0' },
    heatBg: { 1: '#3b1c27', 2: '#33301f', 3: '#123d55', 0: '#0f2a40' },
    enemyAim: '#ff4d4d',
  };

  // ------------------------------------------------------------- 5x7 bitmap font
  const GLYPHS = {
    A: '.###.#...##...#######...##...##...#', B: '####.#...##...#####.#...##...#####.', C: '.###.#...##....#....#....#...#.###.',
    D: '####.#...##...##...##...##...#####.', E: '######....#....####.#....#....#####', F: '######....#....####.#....#....#....',
    G: '.###.#...##....#.####...##...#.####', H: '#...##...##...#######...##...##...#', I: '.###...#....#....#....#....#...###.',
    J: '..###...#....#....#....#.#..#..##..', K: '#...##..#.#.#..##...#.#..#..#.#...#', L: '#....#....#....#....#....#....#####',
    M: '#...###.###.#.##.#.##...##...##...#', N: '#...##...###..##.#.##..###...##...#', O: '.###.#...##...##...##...##...#.###.',
    P: '####.#...##...#####.#....#....#....', Q: '.###.#...##...##...##.#.##..#..##.#', R: '####.#...##...#####.#.#..#..#.#...#',
    S: '.#####....#.....###.....#....#####.', T: '#####..#....#....#....#....#....#..', U: '#...##...##...##...##...##...#.###.',
    V: '#...##...##...##...##...#.#.#...#..', W: '#...##...##...##.#.##.#.##.#.#.#.#.', X: '#...##...#.#.#...#...#.#.#...##...#',
    Y: '#...##...#.#.#...#....#....#....#..', Z: '#####....#...#...#...#...#....#####',
    0: '.###.#...##..###.#.###..##...#.###.', 1: '..#...##....#....#....#....#...###.', 2: '.###.#...#....#...#...#...#...#####',
    3: '####.....#....#.###.....#....#####.', 4: '...#...##..#.#.#..#.#####...#....#.', 5: '######....####.....#....##...#.###.',
    6: '.###.#....#....####.#...##...#.###.', 7: '#####....#...#...#...#....#....#...', 8: '.###.#...##...#.###.#...##...#.###.',
    9: '.###.#...##...#.####....#....#.###.', '!': '..#....#....#....#....#.........#..', '?': '.###.#...#....#...#...#.........#..',
    '+': '.......#....#..#####..#....#.......', '-': '................###................', '.': '................................#..',
    ':': '.......#..............#............', "'": '..#....#...#.......................', ' ': '...................................',
    '/': '....#...#....#...#....#...#....#...', 'x': '.....#...#.#.#...#...#.#.#...#.....',
  };
  const FONT = {};
  for (const k in GLYPHS) {
    const g = GLYPHS[k];
    const px = [];
    for (let i = 0; i < 35; i++) if (g[i] === '#') px.push([i % 5, Math.floor(i / 5)]);
    FONT[k] = px;
  }

  function textWidth(str, s) { return str.length * 6 * s - s; }

  function drawText(ctx, str, x, y, color, s, outline) {
    s = s || 1;
    str = String(str).toUpperCase();
    const pass = (dx, dy, col) => {
      ctx.fillStyle = col;
      let cx = x;
      for (const ch of str) {
        const g = FONT[ch] || FONT['?'];
        for (const [gx, gy] of g) ctx.fillRect(cx + gx * s + dx, y + gy * s + dy, s, s);
        cx += 6 * s;
      }
    };
    if (outline !== null) {
      const o = outline || PAL.ink;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) pass(dx * Math.max(1, s >> 1), dy * Math.max(1, s >> 1), o);
    }
    pass(0, 0, color);
  }

  function hash(i) {
    let h = (i + 1) * 374761393;
    h = (h ^ (h >>> 13)) * 1274126177;
    return (h ^ (h >>> 16)) >>> 0;
  }

  // ------------------------------------------------------------- sprites
  /** along/cross helper so one routine draws horizontal and vertical subs */
  function subPainter(ctx, x0, y0, v) {
    return (a, b, la, lb, col) => {
      ctx.fillStyle = col;
      if (v) ctx.fillRect(x0 + b, y0 + a, lb, la);
      else ctx.fillRect(x0 + a, y0 + b, la, lb);
    };
  }

  function drawSub(ctx, x0, y0, len, v, enemy, alpha) {
    const P = subPainter(ctx, x0, y0, v);
    const L = len * CELL;
    const hull = enemy ? PAL.eHull : PAL.hull, hi = enemy ? PAL.eHullHi : PAL.hullHi;
    const lo = enemy ? PAL.eHullLo : PAL.hullLo, tw = enemy ? PAL.eTower : PAL.tower;
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    // shadow in the water
    P(3, 9, L - 5, 1, 'rgba(0,0,0,0.35)');
    // hull body with rounded ends
    P(3, 2, L - 6, 7, hull);
    P(2, 3, 1, 5, hull); P(L - 3, 3, 1, 5, hull);
    P(1, 4, 1, 3, hull); P(L - 2, 4, 1, 2, lo);
    // light along the top, dark along the bottom
    P(3, 2, L - 6, 1, hi); P(2, 3, 1, 1, hi);
    P(3, 8, L - 6, 1, lo); P(2, 7, 1, 1, lo);
    // conning tower
    const tA = len === 2 ? 5 : CELL + 2;
    P(tA, 1, 5, 3, tw); P(tA + 1, 0, 2, 1, tw); P(tA, 1, 5, 1, hi);
    P(tA + 4, -1, 1, 2, lo); // periscope
    // portholes
    for (let a = 6; a < L - 5; a += 4) if (a < tA - 1 || a > tA + 5) P(a, 5, 1, 1, PAL.port);
    // propeller
    P(L - 1, 3, 1, 1, lo); P(L - 1, 6, 1, 1, lo);
    ctx.globalAlpha = 1;
  }

  function drawBuoy(ctx, x, y, t, seed, alpha) {
    const bob = Math.round(Math.sin(t / 380 + seed) * 0.8);
    const cx = x + 3, cy = y + 2 + bob;
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(cx, cy + 7, 5, 1);
    ctx.fillStyle = (Math.floor(t / 400 + seed) % 2) ? '#fff6a0' : '#7a6a30'; ctx.fillRect(cx + 2, cy - 1, 1, 1);
    ctx.fillStyle = PAL.decoyLo; ctx.fillRect(cx + 2, cy, 1, 1);
    ctx.fillStyle = PAL.decoy; ctx.fillRect(cx + 1, cy + 1, 3, 1); ctx.fillRect(cx, cy + 2, 5, 2);
    ctx.fillStyle = PAL.decoyHi; ctx.fillRect(cx, cy + 4, 5, 1);
    ctx.fillStyle = PAL.decoyLo; ctx.fillRect(cx, cy + 5, 5, 1);
    ctx.fillStyle = PAL.foam; ctx.fillRect(cx - 1, cy + 6, 1, 1); ctx.fillRect(cx + 5, cy + 6, 1, 1);
    ctx.fillStyle = PAL.decoy; ctx.fillRect(cx + 1, cy + 1, 1, 1);
    ctx.globalAlpha = 1;
  }

  function drawPopped(ctx, x, y) {
    ctx.fillStyle = PAL.decoyLo; ctx.fillRect(x + 2, y + 6, 7, 2);
    ctx.fillStyle = PAL.decoy; ctx.fillRect(x + 3, y + 5, 5, 1);
    ctx.fillStyle = PAL.decoyHi; ctx.fillRect(x + 4, y + 3, 1, 1); ctx.fillRect(x + 6, y + 3, 1, 1); ctx.fillRect(x + 5, y + 4, 1, 1);
    ctx.fillRect(x + 4, y + 5, 1, 0); ctx.fillRect(x + 6, y + 2, 1, 1); ctx.fillRect(x + 4, y + 2, 1, 1);
  }

  function drawFire(ctx, x, y, t, seed, small) {
    // wreck plate
    ctx.fillStyle = PAL.char; ctx.fillRect(x + 2, y + 7, 7, 2);
    ctx.fillStyle = PAL.charHi; ctx.fillRect(x + 3, y + 7, 5, 1);
    const f = Math.floor(t / 90);
    const cols = small ? [-1, 0, 1] : [-2, -1, 0, 1, 2];
    for (const k of cols) {
      const h0 = (small ? 2 : 4) - Math.abs(k) + ((hash(seed * 7 + k + f) >> 3) % 3);
      const cx = x + 5 + k;
      for (let j = 0; j < h0; j++) {
        const yy = y + 7 - j;
        const r = j / h0;
        ctx.fillStyle = r < 0.34 ? PAL.fire4 : r < 0.6 ? PAL.fire3 : r < 0.85 ? PAL.fire2 : PAL.fire1;
        ctx.fillRect(cx, yy, 1, 1);
      }
    }
  }

  // ------------------------------------------------------------- board
  class Board {
    constructor(canvas, opts) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.kind = opts.kind; // 'attack' | 'home'
      this.n = opts.size || 8;
      this.W = this.n * CELL + BORDER * 2;
      canvas.width = this.W; canvas.height = this.W;
      this.ctx.imageSmoothingEnabled = false;
      this.parts = [];
      this.rings = [];
      this.pops = [];
      this.sweeps = [];
      this.drops = [];
      this.flashes = [];
      this.shakeAmt = 0;
      this.data = null;
      this.aim = -1;
      this.inspect = -1;
      this.enemyAim = null;
      this.lastT = 0;
      this.durScale = 1; // the page sets this lower in fast/QA mode
    }
    cx(c) { return BORDER + (c % this.n) * CELL; }
    cy(c) { return BORDER + Math.floor(c / this.n) * CELL; }
    cellFromClient(px, py) {
      const r = this.cv.getBoundingClientRect();
      const ax = ((px - r.left) / r.width) * this.W - BORDER;
      const ay = ((py - r.top) / r.height) * this.W - BORDER;
      const x = Math.floor(ax / CELL), y = Math.floor(ay / CELL);
      if (x < 0 || y < 0 || x >= this.n || y >= this.n) return -1;
      return y * this.n + x;
    }
    /** fractional cell coords (for dragging) */
    cellCoordsFromClient(px, py) {
      const r = this.cv.getBoundingClientRect();
      return { x: (((px - r.left) / r.width) * this.W - BORDER) / CELL, y: (((py - r.top) / r.height) * this.W - BORDER) / CELL };
    }
    clientPoint(c) {
      const r = this.cv.getBoundingClientRect();
      const s = r.width / this.W;
      return { x: r.left + (this.cx(c) + CELL / 2) * s, y: r.top + (this.cy(c) + CELL / 2) * s };
    }

    // ---- effects
    shake(a) { this.shakeAmt = Math.min(6, Math.max(this.shakeAmt, a)); }
    flash(color, dur) { this.flashes.push({ color: color || '#ffffff', t0: performance.now(), dur: dur || 120 }); }
    burst(c, count, colors, speed, grav, size) {
      const x = this.cx(c) + CELL / 2, y = this.cy(c) + CELL / 2;
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = speed * (0.3 + Math.random() * 0.9);
        this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (grav ? speed * 0.6 : 0), g: grav || 0, life: 0, max: 380 + Math.random() * 420, col: colors[(Math.random() * colors.length) | 0], s: size || (Math.random() < 0.3 ? 2 : 1) });
      }
    }
    explode(c, power) {
      power = power || 1;
      this.burst(c, 18 * power, [PAL.fire1, PAL.fire2, PAL.fire3, PAL.fire4], 0.07 * (0.8 + power * 0.3), 0.00012);
      this.burst(c, 8 * power, [PAL.char, PAL.smoke, '#222831'], 0.05, 0.00018, 2);
      this.rings.push({ c, r0: 1, r1: CELL * (0.9 + power * 0.4), t0: performance.now(), dur: 260, col: PAL.fire1, hold: 0 });
      this.flashCell(c);
      this.shake(2 + power * 1.5);
    }
    flashCell(c) { this.pops.push({ kind: 'cellflash', c, t0: performance.now(), dur: 140 }); }
    splash(c, e) {
      this.burst(c, 14, [PAL.foam, '#8fd8ff', PAL.white, '#4aa8d8'], 0.055, 0.00022);
      this.rings.push({ c, r0: 1, r1: CELL * 0.8, t0: performance.now(), dur: 300, col: PAL.foam, hold: 0 });
      if (e > 0) this.rings.push({ c, r0: 2, r1: (e + 0.5) * CELL, t0: performance.now() + 60 * this.durScale, dur: 420 * this.durScale, col: PAL.heat[e], hold: 700 * this.durScale, dashed: true });
    }
    decoyPop(c) {
      this.burst(c, 22, [PAL.decoy, PAL.decoyHi, PAL.decoyLo, PAL.white], 0.06, 0.00015);
      this.rings.push({ c, r0: 1, r1: CELL * 1.2, t0: performance.now(), dur: 320, col: PAL.decoy, hold: 0 });
      this.shake(1.5);
    }
    popup(c, text, color, scale, dur) {
      // one floating word at a time keeps it readable: a new one replaces the old
      this.pops = this.pops.filter((p) => p.kind !== 'text');
      this.pops.push({ kind: 'text', c, text: String(text), col: color || PAL.white, s: scale || 1, t0: performance.now(), dur: (dur || 900) * this.durScale });
    }
    banner(text, color, scale, dur) {
      this.pops = this.pops.filter((p) => p.kind !== 'text' && p.kind !== 'banner');
      this.pops.push({ kind: 'banner', text: String(text), col: color || PAL.white, s: scale || 2, t0: performance.now(), dur: (dur || 1100) * this.durScale });
    }
    sonarSweep(center, cells, contacts) {
      this.sweeps.push({ center, cells, contacts, t0: performance.now(), dur: 900 * this.durScale });
    }
    drop(c, dur, enemy) { this.drops.push({ c, t0: performance.now(), dur, enemy }); }
    setEnemyAim(path, dur) {
      this.enemyAim = path ? { path, t0: performance.now(), dur } : null;
    }

    // ---- drawing
    draw(now) {
      const ctx = this.ctx;
      const dt = Math.min(50, now - (this.lastT || now));
      this.lastT = now;
      const W = this.W, n = this.n;
      const d = this.data || {};
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = PAL.frameOuter;
      ctx.fillRect(0, 0, W, W);
      let ox = 0, oy = 0;
      if (this.shakeAmt > 0.15) {
        ox = Math.round((Math.random() * 2 - 1) * this.shakeAmt);
        oy = Math.round((Math.random() * 2 - 1) * this.shakeAmt);
        this.shakeAmt *= Math.pow(0.86, dt / 16);
      } else this.shakeAmt = 0;
      ctx.translate(ox, oy);

      // frame
      ctx.fillStyle = this.kind === 'attack' ? PAL.frameAttack : PAL.frameHome;
      ctx.fillRect(0, 0, W, W);
      ctx.fillStyle = PAL.frameOuter;
      ctx.fillRect(1, 1, W - 2, W - 2);

      const murk = this.kind === 'attack';
      // water
      for (let c = 0; c < n * n; c++) {
        const x = this.cx(c), y = this.cy(c);
        const odd = ((c % n) + Math.floor(c / n)) % 2;
        ctx.fillStyle = murk ? (odd ? PAL.murkB : PAL.murkA) : (odd ? PAL.seaB : PAL.seaA);
        ctx.fillRect(x, y, CELL, CELL);
        const h = hash(c);
        const wx = Math.floor((h % CELL) + now / (520 + (h % 300))) % (CELL - 2);
        const wy = (h >> 5) % (CELL - 2) + 1;
        ctx.fillStyle = murk ? PAL.waveMurk : PAL.wave;
        ctx.fillRect(x + wx, y + wy, 2, 1);
      }
      // grid lines
      ctx.fillStyle = PAL.grid;
      for (let k = 0; k <= n; k++) {
        ctx.fillRect(BORDER + k * CELL - (k === n ? 1 : 0), BORDER, 1, n * CELL);
        ctx.fillRect(BORDER, BORDER + k * CELL - (k === n ? 1 : 0), n * CELL, 1);
      }

      if (this.kind === 'home') this.drawHome(ctx, d, now);
      else this.drawAttack(ctx, d, now);

      this.drawFx(ctx, now, dt);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    drawMiss(ctx, c, e, dim) {
      const x = this.cx(c), y = this.cy(c);
      ctx.fillStyle = PAL.heatBg[e] || PAL.heatBg[0];
      ctx.fillRect(x + 1, y + 1, CELL - 1, CELL - 1);
      if (e > 0) {
        drawText(ctx, String(e), x + 3, y + 2, dim ? shade(PAL.heat[e]) : PAL.heat[e], 1, PAL.ink);
      } else {
        ctx.fillStyle = PAL.heat[0];
        ctx.fillRect(x + 5, y + 5, 2, 2);
        ctx.fillStyle = '#2c4660';
        ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + 8, y + 8, 1, 1); ctx.fillRect(x + 8, y + 2, 1, 1); ctx.fillRect(x + 2, y + 8, 1, 1);
      }
    }

    drawHome(ctx, d, now) {
      const n = this.n;
      if (!d.layout) return;
      const fleet = d.fleet || [];
      const inc = d.incoming || [];
      // sonar areas the enemy scanned
      for (const s of d.incomingSonars || []) {
        for (const c of s.cells) { ctx.fillStyle = 'rgba(197,255,73,0.10)'; ctx.fillRect(this.cx(c) + 1, this.cy(c) + 1, CELL - 1, CELL - 1); }
      }
      // decoys
      d.layout.decoys.forEach((c, i) => {
        if (d.drag && d.drag.decoy === i) return;
        if (inc[c] && inc[c].r === 'd') drawPopped(ctx, this.cx(c), this.cy(c));
        else drawBuoy(ctx, this.cx(c), this.cy(c), now, i * 2.1);
      });
      // subs
      for (const s of d.layout.ships) {
        if (d.drag && d.drag.id === s.id) continue;
        const len = (fleet.find((f) => f.id === s.id) || { len: 2 }).len;
        const sunk = d.lost && d.lost.includes(s.id);
        drawSub(ctx, BORDER + s.x * CELL, BORDER + s.y * CELL, len, s.v, false, sunk ? 0.45 : 1);
        if (d.selected === s.id) this.outlineShip(ctx, s, len, PAL.white, now);
      }
      // drag ghost
      if (d.drag) {
        const g = d.drag;
        if (g.decoy !== undefined) {
          drawBuoy(ctx, BORDER + g.x * CELL, BORDER + g.y * CELL, now, 0, 0.9);
          this.outlineRect(ctx, g.x, g.y, 1, 1, g.valid ? PAL.white : PAL.fire4);
        } else {
          const len = (fleet.find((f) => f.id === g.id) || { len: 2 }).len;
          drawSub(ctx, BORDER + g.x * CELL, BORDER + g.y * CELL, len, g.v, false, 0.85);
          this.outlineRect(ctx, g.x, g.y, g.v ? 1 : len, g.v ? len : 1, g.valid ? PAL.white : PAL.fire4);
        }
      }
      // incoming fire
      for (let c = 0; c < inc.length; c++) {
        const s = inc[c];
        if (!s) continue;
        if (s.r === 'h') drawFire(ctx, this.cx(c), this.cy(c), now, c, false);
        else if (s.r === 'm') this.drawMiss(ctx, c, s.e, true);
      }
      // enemy crosshair
      if (this.enemyAim) {
        const a = this.enemyAim;
        const k = Math.min(1, (now - a.t0) / a.dur);
        const seg = a.path.length - 1;
        const f = k * seg;
        const i0 = Math.min(seg, Math.floor(f)), i1 = Math.min(seg, i0 + 1);
        const tt = easeInOut(f - i0);
        const x = lerp(this.cx(a.path[i0]), this.cx(a.path[i1]), tt);
        const y = lerp(this.cy(a.path[i0]), this.cy(a.path[i1]), tt);
        this.brackets(ctx, Math.round(x), Math.round(y), CELL, CELL, PAL.enemyAim, now, true);
      }
    }

    drawAttack(ctx, d, now) {
      const n = this.n;
      const shots = d.shots || [];
      // scanned sonar area tint
      for (const s of d.sonars || []) {
        for (const c of s.cells) {
          if (shots[c]) continue;
          if (!s.contacts.includes(c)) { ctx.fillStyle = 'rgba(197,255,73,0.10)'; ctx.fillRect(this.cx(c) + 1, this.cy(c) + 1, CELL - 1, CELL - 1); }
        }
      }
      // end-of-game reveal of what you missed
      if (d.reveal) {
        const sunkIds = new Set((d.sunk || []).map((x) => x.id));
        for (const s of d.reveal.ships) {
          if (sunkIds.has(s.id)) continue;
          const len = (d.fleet.find((f) => f.id === s.id) || { len: 2 }).len;
          drawSub(ctx, BORDER + s.x * CELL, BORDER + s.y * CELL, len, s.v, true, 0.55 + 0.2 * Math.sin(now / 300));
        }
        d.reveal.decoys.forEach((c, i) => { if (!shots[c]) drawBuoy(ctx, this.cx(c), this.cy(c), now, i, 0.7); });
      }
      // sunk subs revealed
      for (const s of d.sunk || []) {
        const c0 = s.cells[0], c1 = s.cells[1];
        const v = c1 - c0 === n;
        drawSub(ctx, this.cx(c0), this.cy(c0), s.len, v, true, 0.9);
      }
      // shots
      for (let c = 0; c < shots.length; c++) {
        const s = shots[c];
        if (!s) continue;
        if (s.r === 'h') drawFire(ctx, this.cx(c), this.cy(c), now, c, (d.sunkCells || []).includes(c));
        else if (s.r === 'd') drawPopped(ctx, this.cx(c), this.cy(c));
        else this.drawMiss(ctx, c, s.e, false);
      }
      // unresolved sonar contacts
      for (const s of d.sonars || []) {
        for (const c of s.contacts) {
          if (shots[c]) continue;
          const x = this.cx(c), y = this.cy(c);
          const p = (Math.sin(now / 220 + c) + 1) / 2;
          ctx.fillStyle = PAL.sonarLo; ctx.fillRect(x + 2, y + 2, 7, 7);
          ctx.fillStyle = PAL.sonar; ctx.fillRect(x + 4, y + 4, 3, 3);
          ctx.globalAlpha = 0.4 + 0.6 * p;
          this.outlinePx(ctx, x + 1, y + 1, 9, 9, PAL.sonar);
          ctx.globalAlpha = 1;
        }
      }
      // echo rings: the latest one, or the one being inspected
      const ringCells = [];
      if (d.lastMiss >= 0 && shots[d.lastMiss] && shots[d.lastMiss].e > 0) ringCells.push(d.lastMiss);
      if (this.inspect >= 0 && shots[this.inspect] && shots[this.inspect].r === 'm' && shots[this.inspect].e > 0 && this.inspect !== d.lastMiss) ringCells.push(this.inspect);
      for (const c of ringCells) this.echoSquare(ctx, c, shots[c].e, now, c === this.inspect ? 0.9 : 0.55);
      // last shot ticks
      if (d.lastShot >= 0) {
        const x = this.cx(d.lastShot), y = this.cy(d.lastShot);
        ctx.fillStyle = PAL.white;
        ctx.fillRect(x, y, 2, 1); ctx.fillRect(x, y, 1, 2);
        ctx.fillRect(x + CELL - 1, y + CELL - 2, 1, 2); ctx.fillRect(x + CELL - 2, y + CELL - 1, 2, 1);
      }
      // before the first shot: a slow sonar scan line and a pulsing target invite the tap
      if (d.invite) {
        const W = this.W;
        const x = Math.floor((now / 14) % (W + 20)) - 10;
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = PAL.sonar;
        ctx.fillRect(x, BORDER, 1, n * CELL);
        ctx.globalAlpha = 0.08;
        ctx.fillRect(x - 6, BORDER, 6, n * CELL);
        ctx.globalAlpha = 1;
        if (this.aim < 0) {
          const k = (Math.sin(now / 260) + 1) / 2;
          const c0 = (n >> 1) * n + (n >> 1) - n - 1;
          ctx.globalAlpha = 0.35 + 0.5 * k;
          this.brackets(ctx, this.cx(c0) + 4, this.cy(c0) + 4, CELL * 2 - 8 + 8, CELL * 2 - 8 + 8, PAL.white, now);
          ctx.globalAlpha = 1;
        }
      }
      // aim
      if (this.aim >= 0 && d.canAct) {
        if (d.mode === 'sonar') {
          const cx = Math.min(n - 2, Math.max(1, this.aim % n)), cy = Math.min(n - 2, Math.max(1, Math.floor(this.aim / n)));
          ctx.fillStyle = 'rgba(197,255,73,0.14)';
          ctx.fillRect(BORDER + (cx - 1) * CELL, BORDER + (cy - 1) * CELL, CELL * 3, CELL * 3);
          this.brackets(ctx, BORDER + (cx - 1) * CELL, BORDER + (cy - 1) * CELL, CELL * 3, CELL * 3, PAL.sonar, now);
        } else {
          const taken = !!shots[this.aim];
          this.brackets(ctx, this.cx(this.aim), this.cy(this.aim), CELL, CELL, taken ? '#5d7891' : PAL.white, now);
        }
      }
    }

    echoSquare(ctx, c, e, now, alpha) {
      const n = this.n;
      const x0 = Math.max(0, (c % n) - e), x1 = Math.min(n - 1, (c % n) + e);
      const y0 = Math.max(0, Math.floor(c / n) - e), y1 = Math.min(n - 1, Math.floor(c / n) + e);
      const px = BORDER + x0 * CELL, py = BORDER + y0 * CELL;
      const w = (x1 - x0 + 1) * CELL, h = (y1 - y0 + 1) * CELL;
      ctx.globalAlpha = alpha;
      const off = Math.floor(now / 120) % 4;
      ctx.fillStyle = PAL.heat[e];
      // marching-ants outline of the ring the contact must be on
      for (let i = 0; i < w; i++) if ((i + off) % 4 < 2) { ctx.fillRect(px + i, py, 1, 1); ctx.fillRect(px + w - 1 - i, py + h - 1, 1, 1); }
      for (let j = 0; j < h; j++) if ((j + off) % 4 < 2) { ctx.fillRect(px + w - 1, py + j, 1, 1); ctx.fillRect(px, py + h - 1 - j, 1, 1); }
      ctx.globalAlpha = 1;
    }

    brackets(ctx, x, y, w, h, col, now, enemy) {
      const p = Math.floor(now / 160) % 2;
      const l = 3;
      ctx.fillStyle = col;
      const o = enemy ? 0 : -p;
      const X0 = x + o, Y0 = y + o, X1 = x + w - 1 - o, Y1 = y + h - 1 - o;
      ctx.fillRect(X0, Y0, l, 1); ctx.fillRect(X0, Y0, 1, l);
      ctx.fillRect(X1 - l + 1, Y0, l, 1); ctx.fillRect(X1, Y0, 1, l);
      ctx.fillRect(X0, Y1, l, 1); ctx.fillRect(X0, Y1 - l + 1, 1, l);
      ctx.fillRect(X1 - l + 1, Y1, l, 1); ctx.fillRect(X1, Y1 - l + 1, 1, l);
      if (enemy) { ctx.fillRect(x + (w >> 1), y + 2, 1, 2); ctx.fillRect(x + (w >> 1), y + h - 4, 1, 2); ctx.fillRect(x + 2, y + (h >> 1), 2, 1); ctx.fillRect(x + w - 4, y + (h >> 1), 2, 1); }
    }
    outlinePx(ctx, x, y, w, h, col) {
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
    }
    outlineRect(ctx, cx, cy, w, h, col) { this.outlinePx(ctx, BORDER + cx * CELL, BORDER + cy * CELL, w * CELL, h * CELL, col); }
    outlineShip(ctx, s, len, col, now) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now / 150);
      this.outlineRect(ctx, s.x, s.y, s.v ? 1 : len, s.v ? len : 1, col);
      ctx.globalAlpha = 1;
    }

    drawFx(ctx, now, dt) {
      // shell drops: shadow grows, shell falls
      this.drops = this.drops.filter((dr) => {
        const k = (now - dr.t0) / dr.dur;
        if (k >= 1) return false;
        const x = this.cx(dr.c), y = this.cy(dr.c);
        const r = Math.round(1 + k * 3);
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x + 5 - r, y + 5 - (r >> 1), r * 2 + 1, r + 1);
        const sy = Math.round(lerp(-12, 4, k * k));
        ctx.fillStyle = dr.enemy ? PAL.enemyAim : PAL.white;
        ctx.fillRect(x + 5, y + sy, 1, 3);
        ctx.fillStyle = PAL.fire2;
        ctx.fillRect(x + 5, y + sy - 1, 1, 1);
        return true;
      });
      // sonar sweeps
      this.sweeps = this.sweeps.filter((sw) => {
        const k = (now - sw.t0) / sw.dur;
        if (k >= 1.6) return false;
        const n = this.n;
        const cx = this.cx(sw.center) + CELL / 2, cy = this.cy(sw.center) + CELL / 2;
        if (k < 1) {
          const r = Math.round(k * CELL * 1.6);
          ctx.globalAlpha = 1 - k * 0.6;
          this.outlinePx(ctx, Math.round(cx - r), Math.round(cy - r), r * 2 + 1, r * 2 + 1, PAL.sonar);
          ctx.globalAlpha = 0.25 * (1 - k);
          ctx.fillStyle = PAL.sonar;
          ctx.fillRect(BORDER + ((sw.center % n) - 1) * CELL, BORDER + (Math.floor(sw.center / n) - 1) * CELL, CELL * 3, CELL * 3);
          ctx.globalAlpha = 1;
        }
        return true;
      });
      // rings
      this.rings = this.rings.filter((r) => {
        const age = now - r.t0;
        if (age < 0) return true;
        if (age > r.dur + r.hold) return false;
        const k = Math.min(1, age / r.dur);
        const rad = Math.round(lerp(r.r0, r.r1, 1 - Math.pow(1 - k, 3)));
        const x = this.cx(r.c) + (CELL >> 1), y = this.cy(r.c) + (CELL >> 1);
        ctx.globalAlpha = age > r.dur ? Math.max(0, 1 - (age - r.dur) / r.hold) : 1;
        if (r.dashed) {
          ctx.fillStyle = r.col;
          const w = rad * 2 + 1;
          for (let i = 0; i < w; i += 2) {
            ctx.fillRect(x - rad + i, y - rad, 1, 1); ctx.fillRect(x - rad + i, y + rad, 1, 1);
            ctx.fillRect(x - rad, y - rad + i, 1, 1); ctx.fillRect(x + rad, y - rad + i, 1, 1);
          }
        } else this.outlinePx(ctx, x - rad, y - rad, rad * 2 + 1, rad * 2 + 1, r.col);
        ctx.globalAlpha = 1;
        return true;
      });
      // particles
      this.parts = this.parts.filter((p) => {
        p.life += dt;
        if (p.life > p.max) return false;
        p.vy += p.g * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= 0.985; p.vy *= 0.985;
        ctx.fillStyle = p.col;
        const s = p.life > p.max * 0.7 ? 1 : p.s;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), s, s);
        return true;
      });
      // flashes
      this.flashes = this.flashes.filter((f) => {
        const k = (now - f.t0) / f.dur;
        if (k >= 1) return false;
        ctx.globalAlpha = 0.55 * (1 - k);
        ctx.fillStyle = f.color;
        ctx.fillRect(0, 0, this.W, this.W);
        ctx.globalAlpha = 1;
        return true;
      });
      // popups and banners
      this.pops = this.pops.filter((p) => {
        const age = now - p.t0;
        if (age > p.dur) return false;
        const k = age / p.dur;
        if (p.kind === 'cellflash') {
          ctx.fillStyle = PAL.white;
          ctx.globalAlpha = 1 - k;
          ctx.fillRect(this.cx(p.c), this.cy(p.c), CELL, CELL);
          ctx.globalAlpha = 1;
          return true;
        }
        const s = p.s;
        const pop = age < 80 && s >= 2 ? s + 1 : s; // scale punch on entry for big words
        const w = textWidth(p.text, pop);
        let x, y;
        if (p.kind === 'banner') {
          x = Math.round((this.W - w) / 2);
          y = Math.round(this.W / 2 - 4 * pop - k * 4);
        } else {
          x = Math.round(this.cx(p.c) + CELL / 2 - w / 2);
          y = Math.round(this.cy(p.c) - 3 - 7 * pop - easeOut(k) * 7);
          if (y < 2) y = this.cy(p.c) + CELL + 2;
        }
        x = Math.max(2, Math.min(this.W - w - 2, x));
        ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
        drawText(ctx, p.text, x, y, age < 70 ? PAL.white : p.col, pop, PAL.ink); // white flash frame first
        ctx.globalAlpha = 1;
        return true;
      });
    }
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOut(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function shade(hex) {
    const v = parseInt(hex.slice(1), 16);
    const r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
    const f = 0.78;
    return '#' + [r, g, b].map((x) => Math.round(x * f).toString(16).padStart(2, '0')).join('');
  }

  // ------------------------------------------------------------- logo + background
  function drawLogo(canvas, now) {
    const ctx = canvas.getContext('2d');
    const text = 'FATHOM';
    const s = 3;
    const w = textWidth(text, s) + 8, h = 7 * s + 10;
    if (canvas.width !== w) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    const rows = ['#F5F3ED', '#eef7d6', '#e2fbb0', '#d6fd88', '#C5FF49', '#b3ef35', '#9bd426'];
    let x = 4;
    for (let i = 0; i < text.length; i++) {
      const g = FONT[text[i]];
      const bob = Math.round(Math.sin(now / 420 + i * 0.7) * 1.2);
      for (const [gx, gy] of g) {
        ctx.fillStyle = '#5e4a9e';
        ctx.fillRect(x + gx * s + 1, 4 + bob + gy * s + 2, s, s);
      }
      for (const [gx, gy] of g) {
        ctx.fillStyle = rows[gy];
        ctx.fillRect(x + gx * s, 4 + bob + gy * s, s, s);
      }
      x += 6 * s;
    }
    // sonar sweep glint
    const sx = Math.floor(((now / 6) % (w + 40)) - 20);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(181,154,255,0.8)';
    ctx.fillRect(sx, 0, 3, h);
    ctx.globalCompositeOperation = 'source-over';
  }

  class Background {
    constructor(canvas) {
      this.cv = canvas;
      this.ctx = canvas.getContext('2d');
      this.bubbles = [];
      this.resize();
    }
    resize() {
      const w = Math.max(80, Math.ceil(window.innerWidth / 4));
      const h = Math.max(80, Math.ceil(window.innerHeight / 4));
      this.cv.width = w; this.cv.height = h;
      this.w = w; this.h = h;
      this.ctx.imageSmoothingEnabled = false;
    }
    draw(now, dt) {
      const { ctx, w, h } = this;
      const bands = ['#17181d', '#16171b', '#141519', '#131417', '#121316', '#111215', '#101114'];
      const bh = Math.ceil(h / bands.length);
      bands.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(0, i * bh, w, bh); });
      // light rays
      ctx.fillStyle = 'rgba(197,255,73,0.025)';
      for (let k = 0; k < 4; k++) {
        const x0 = ((k * 53 + now / 90) % (w + 60)) - 30;
        for (let y = 0; y < h * 0.7; y += 2) ctx.fillRect(Math.round(x0 + y * 0.35), y, 6 + k * 2, 2);
      }
      if (this.bubbles.length < 26 && Math.random() < 0.08) this.bubbles.push({ x: Math.random() * w, y: h + 2, v: 0.008 + Math.random() * 0.02, s: Math.random() < 0.3 ? 2 : 1, ph: Math.random() * 6 });
      ctx.fillStyle = 'rgba(181,154,255,0.35)';
      this.bubbles = this.bubbles.filter((b) => {
        b.y -= b.v * dt;
        const x = Math.round(b.x + Math.sin(now / 500 + b.ph) * 1.5);
        ctx.fillRect(x, Math.round(b.y), b.s, b.s);
        return b.y > -3;
      });
    }
  }

  function vibrate(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not supported */ } }

  root.FathomRender = { CELL, BORDER, PAL, Board, Background, drawLogo, drawText, textWidth, drawSub, drawBuoy, vibrate };
})(typeof self !== 'undefined' ? self : this);
