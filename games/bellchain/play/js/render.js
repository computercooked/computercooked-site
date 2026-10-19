// Bellchain renderer: the belfry on a canvas. Flat 2D shapes, no image files.

const TAU = Math.PI * 2;
const COL = {
  sky0: '#101114', sky1: '#17171f', sky2: '#2a2342',
  stone: '#0b0c0e', stoneLine: '#1e2027',
  bronze: '#c98a3e', bronzeHi: '#f2c16b', bronzeLo: '#7a4a22', bronzeRing: '#ffd98a',
  echo: '#b59aff', echoHand: '#c5ff49', gold: '#c5ff49', ink: '#f5f3ed', muted: '#9c98ab',
  molten: '#ff9d2e', moltenHi: '#ffd36b', perfect: '#c5ff49',
};

export class Belfry {
  constructor(canvas) {
    this.cv = canvas;
    this.cx2 = canvas.getContext('2d');
    this.bells = [];
    this.ripples = [];
    this.sparks = [];
    this.pops = [];
    this.comets = [];
    this.stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random() * 0.75, r: Math.random() * 1.3 + 0.3, ph: Math.random() * TAU }));
    this.shake = 0;
    this.time = 0;
    this.chain = { n: 0, t: 0, best: false, perfect: 0 };
    this.banner = null;
    this.greatPulse = 0;
    this.hint = null;
    this.lite = false; // set by main.js when frames run slow: fewer background effects
    try { this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { this.reduced = false; }
    this.resize();
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.cv.width = Math.round(this.w * dpr);
    this.cv.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    this.layout(this.bells.length || 3);
  }

  layout(n) {
    const prev = this.bells;
    // keep the ring clear of the HUD at the top
    const top = this.w < 560 ? 92 : 64, bottom = 18;
    const avail = Math.max(120, this.h - top - bottom);
    this.cx = this.w / 2;
    this.cy = top + avail / 2;
    let R = Math.min(this.w * 0.4, avail / 2 - 26);
    const arc0 = (TAU * R) / n;
    this.bellSize = Math.max(14, Math.min(44, arc0 * 0.55, R * 0.3));
    this.R = Math.max(60, Math.min(this.w * 0.42, avail / 2 - this.bellSize * 0.6));
    this.bells = Array.from({ length: n }, (_, i) => {
      const a = -Math.PI / 2 + (i / n) * TAU;
      const old = prev[i];
      return {
        a, x: this.cx + Math.cos(a) * this.R, y: this.cy + Math.sin(a) * this.R,
        swing: old ? old.swing : 0, vel: old ? old.vel : 0, glow: old ? old.glow : 0,
        born: old ? old.born : (prev.length ? 1 : 0),
      };
    });
    this.greatSize = this.R * 0.62;
  }

  // ----- effects API -----
  ring(i, opts = {}) {
    const b = this.bells[i];
    if (!b) return;
    const s = opts.hand ? 1 : 0.6;
    b.vel += (opts.dir || 1) * (opts.hand ? 9 : 6) * (0.6 + Math.random() * 0.5);
    if (opts.quiet || (this.lite && !opts.hand && !opts.perfect)) { b.glow = Math.min(0.6, b.glow + 0.25); return; } // background strike: swing only
    b.glow = Math.min(1.4, b.glow + (opts.hand ? 1 : 0.7));
    const color = opts.golden ? COL.gold : opts.perfect ? COL.perfect : opts.hand ? COL.echoHand : COL.echo;
    if (this.ripples.length < 28 && !(opts.light && Math.random() < 0.5)) this.ripples.push({ x: b.x, y: b.y + this.bellSize * 0.2, r: this.bellSize * 0.35, max: this.bellSize * (opts.perfect ? 2.2 : 0.9 + 0.6 * s), t: 0, life: opts.hand ? 0.55 : 0.4, color, a: opts.hand ? 0.85 : 0.45 });
    const nSparks = opts.light ? 0 : opts.perfect ? 10 : opts.hand ? 5 : 2;
    for (let k = 0; k < nSparks && this.sparks.length < 260; k++) {
      const ang = Math.random() * TAU, sp = 60 + Math.random() * 140;
      this.sparks.push({ x: b.x, y: b.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, t: 0, life: 0.5 + Math.random() * 0.4, color });
    }
  }

  comet(from, to, dir, dur, hand, total) {
    if (this.comets.length > 40) return;
    this.comets.push({ from, to, dir, dur, t: 0, hand, n: total });
  }

  pop(i, text, opts = {}) {
    const b = this.bells[i];
    if (!b) return;
    if (this.pops.length > 45) this.pops.shift();
    const out = this.cy - b.y < 0 ? 1 : -1;
    const size = opts.big ? 22 : opts.hand ? 17 : 13;
    let y = b.y - this.bellSize * 0.9 * (out < 0 ? 1 : -0.2);
    // stack on a fresh pop at the same bell instead of printing over it (e.g. "+7.8" and "PERFECT x3")
    for (const q of this.pops) if (q.t < 0.3 && Math.abs(q.x - b.x) < 24 && Math.abs(q.y - y) < size) y = q.y - (q.size + size) * 0.6 - 4;
    this.pops.push({
      x: b.x + (Math.random() - 0.5) * 10, y,
      text, t: 0, life: opts.big ? 1.3 : 0.9, size,
      color: opts.color || (opts.hand ? COL.echoHand : COL.ink),
    });
  }

  setChain(n, isBest) {
    this.chain.n = n;
    this.chain.t = 0;
    this.chain.best = !!isBest;
    if (n >= 8) this.shake = Math.min(9, this.shake + 0.5 + n * 0.04);
  }

  perfectPeal() {
    this.chain.perfect = 1.2;
    this.shake = Math.min(12, this.shake + 7);
    this.flash = 0.5;
    this.banner = { text: 'perfect peal', sub: 'x3', t: 0, life: 1.4, color: COL.perfect };
  }

  showBanner(text, sub = '', color = COL.gold, life = 2.2) {
    this.banner = { text, sub, t: 0, life, color };
  }

  recastFx() {
    this.flash = 1;
    this.shake = 14;
    for (let k = 0; k < 120; k++) {
      const ang = Math.random() * TAU, sp = 80 + Math.random() * 380;
      this.sparks.push({ x: this.cx, y: this.cy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, t: 0, life: 1 + Math.random(), color: Math.random() < 0.5 ? COL.gold : COL.molten });
    }
  }

  // ----- input -----
  hit(px, py) {
    const dx = px - this.cx, dy = py - this.cy;
    if (Math.hypot(dx, dy) < this.greatSize * 0.55) return { great: true };
    let best = -1, bd = Infinity;
    this.bells.forEach((b, i) => {
      const d = Math.hypot(px - b.x, py - b.y);
      if (d < bd) { bd = d; best = i; }
    });
    return { bell: best, near: bd < this.bellSize * 1.4 };
  }

  // ----- frame -----
  draw(dt, view) {
    this.time += dt;
    const c = this.cx2;
    if (view.bells !== this.bells.length) this.layout(view.bells);
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.lineJoin = 'round';

    // shake
    this.shake = Math.max(0, this.shake - dt * 22);
    const amp = this.shake * (this.reduced ? 0.2 : 1);
    const sx = (Math.random() - 0.5) * amp, sy = (Math.random() - 0.5) * amp;

    this.drawSky(c);
    c.save();
    c.translate(sx, sy);
    this.drawFrame(c);
    this.drawRing(c, view);
    this.drawGreat(c, view, dt);
    this.drawComets(c, dt);
    this.drawRipples(c, dt);
    this.drawBells(c, dt);
    this.drawSparks(c, dt);
    this.drawPops(c, dt);
    this.drawChain(c, dt, view);
    this.drawHint(c);
    c.restore();
    this.drawBanner(c, dt);
    if (this.flash > 0) {
      c.fillStyle = `rgba(255,236,190,${Math.min(0.55, this.flash)})`;
      c.fillRect(0, 0, this.w, this.h);
      this.flash -= dt * 1.6;
    }
  }

  // Static layers are painted once per layout into offscreen canvases (cheap on low-end phones).
  cached(name, paint) {
    const key = `${this.w}x${this.h}@${this.dpr}:${this.cx},${this.cy},${this.R}`;
    if (this[name] && this[name].key === key) return this[name].cv;
    const cv = document.createElement('canvas');
    cv.width = Math.round(this.w * this.dpr); cv.height = Math.round(this.h * this.dpr);
    const g = cv.getContext('2d');
    g.scale(this.dpr, this.dpr);
    paint(g);
    this[name] = { key, cv };
    return cv;
  }

  drawSky(c) {
    c.drawImage(this.cached('_sky', (g) => {
      const gr = g.createLinearGradient(0, 0, 0, this.h);
      gr.addColorStop(0, COL.sky0); gr.addColorStop(0.6, COL.sky1); gr.addColorStop(1, COL.sky2);
      g.fillStyle = gr;
      g.fillRect(0, 0, this.w, this.h);
    }), 0, 0, this.w, this.h);
    for (const s of this.stars) {
      const a = 0.35 + 0.35 * Math.sin(this.time * 1.3 + s.ph);
      c.fillStyle = `rgba(245,243,237,${a})`;
      c.fillRect(Math.round(s.x * this.w), Math.round(s.y * this.h), s.r * 1.4, s.r * 1.4);
    }
  }

  // stone arch of the belfry, flat silhouette
  drawFrame(c) {
    c.drawImage(this.cached('_frame', (g) => this.paintFrame(g)), 0, 0, this.w, this.h);
  }

  paintFrame(c) {
    const w = this.w, h = this.h, pad = Math.max(10, w * 0.04);
    c.fillStyle = COL.stone;
    c.beginPath();
    c.rect(-20, -20, w + 40, h + 40);
    const top = this.cy - this.R - this.bellSize * 1.8;
    const archR = Math.min(w / 2 - pad, this.R + this.bellSize * 1.6);
    c.moveTo(this.cx - archR, h - pad * 0.5);
    c.lineTo(this.cx - archR, Math.max(pad, top + archR));
    c.arc(this.cx, Math.max(pad, top + archR), archR, Math.PI, 0);
    c.lineTo(this.cx + archR, h - pad * 0.5);
    c.closePath();
    c.fill('evenodd');
    // brick lines
    c.strokeStyle = COL.stoneLine;
    c.lineWidth = 2;
    for (let y = 18; y < h; y += 22) {
      c.beginPath(); c.moveTo(0, y); c.lineTo(this.cx - archR - 4, y); c.moveTo(this.cx + archR + 4, y); c.lineTo(w, y); c.stroke();
    }
    // floor beam
    c.fillStyle = '#1b1c22';
    c.fillRect(this.cx - archR, h - pad * 0.5 - 6, archR * 2, 6);
  }

  drawRing(c, view) {
    c.strokeStyle = 'rgba(181,154,255,0.18)';
    c.lineWidth = 2;
    c.setLineDash([3, 7]);
    c.beginPath(); c.arc(this.cx, this.cy, this.R, 0, TAU); c.stroke();
    c.setLineDash([]);
    if (view.tuning === 'round') {
      c.strokeStyle = 'rgba(181,154,255,0.12)';
      c.beginPath(); c.arc(this.cx, this.cy, this.R + 6, 0, TAU); c.stroke();
    }
  }

  bellPath(c, s) {
    // unit bell, pivot at (0,0), mouth at y = s
    c.beginPath();
    c.moveTo(-s * 0.16, s * 0.08);
    c.bezierCurveTo(-s * 0.36, s * 0.08, -s * 0.36, s * 0.45, -s * 0.4, s * 0.72);
    c.quadraticCurveTo(-s * 0.44, s * 0.9, -s * 0.56, s * 0.98);
    c.lineTo(s * 0.56, s * 0.98);
    c.quadraticCurveTo(s * 0.44, s * 0.9, s * 0.4, s * 0.72);
    c.bezierCurveTo(s * 0.36, s * 0.45, s * 0.36, s * 0.08, s * 0.16, s * 0.08);
    c.closePath();
  }

  // Pre-rendered bell sprites (body, lit body, halo) so 24 bells cost a few drawImage calls per frame.
  bellSprites() {
    const s = this.bellSize, key = Math.round(s * this.dpr);
    if (this._spr && this._spr.key === key) return this._spr;
    const pad = Math.ceil(s * 0.7), W = Math.ceil(s * 1.2 + pad * 2), H = Math.ceil(s * 1.1 + pad * 2);
    const make = (fn) => {
      const cv = document.createElement('canvas');
      cv.width = Math.ceil(W * this.dpr); cv.height = Math.ceil(H * this.dpr);
      const g = cv.getContext('2d');
      g.scale(this.dpr, this.dpr);
      g.translate(W / 2, pad);
      fn(g);
      return cv;
    };
    const body = (lit) => (g) => {
      this.bellPath(g, s);
      const gr = g.createLinearGradient(-s * 0.5, 0, s * 0.5, 0);
      gr.addColorStop(0, COL.bronzeLo); gr.addColorStop(0.35, lit ? COL.bronzeRing : COL.bronzeHi);
      gr.addColorStop(0.7, lit ? COL.bronzeHi : COL.bronze); gr.addColorStop(1, COL.bronzeLo);
      g.fillStyle = gr; g.fill();
      g.fillStyle = 'rgba(255,240,200,0.25)'; g.fillRect(-s * 0.5, s * 0.84, s, s * 0.05);
      g.fillStyle = COL.bronzeLo; g.fillRect(-s * 0.08, -s * 0.02, s * 0.16, s * 0.12);
      if (lit) { this.bellPath(g, s); g.fillStyle = 'rgba(255,236,170,0.35)'; g.fill(); }
    };
    const halo = (g) => {
      const gr = g.createRadialGradient(0, s * 0.55, s * 0.1, 0, s * 0.55, s * 1.05);
      gr.addColorStop(0, 'rgba(255,217,138,0.75)'); gr.addColorStop(1, 'rgba(255,217,138,0)');
      g.fillStyle = gr; g.fillRect(-W / 2, -pad, W, H);
    };
    this._spr = { key, W, H, pad, body: make(body(false)), lit: make(body(true)), halo: make(halo) };
    return this._spr;
  }

  drawBells(c, dt) {
    const s = this.bellSize, sp = this.bellSprites();
    for (const b of this.bells) {
      // damped spring swing
      b.vel += -b.swing * 60 * dt - b.vel * 4.5 * dt;
      b.swing += b.vel * dt;
      b.glow = Math.max(0, b.glow - dt * 2.2);
      b.born = Math.max(0, b.born - dt * 2);
      const scale = 1 - b.born * 0.6 + Math.sin(b.born * 9) * b.born * 0.2;
      c.save();
      c.translate(b.x, b.y - s * 0.5);
      c.scale(scale, scale);
      c.fillStyle = '#2c2d36';
      c.fillRect(-s * 0.32, -s * 0.06, s * 0.64, s * 0.1); // yoke
      c.rotate(Math.max(-0.7, Math.min(0.7, b.swing * 0.12)));
      if (b.glow > 0.02 && !this.lite) {
        c.globalAlpha = Math.min(1, b.glow);
        c.drawImage(sp.halo, -sp.W / 2, -sp.pad, sp.W, sp.H);
        c.globalAlpha = 1;
      }
      c.fillStyle = COL.bronzeLo; // clapper
      c.beginPath(); c.arc(-b.swing * 0.4, s * 0.98, s * 0.09, 0, TAU); c.fill();
      c.drawImage(sp.body, -sp.W / 2, -sp.pad, sp.W, sp.H);
      if (b.glow > 0.05) {
        c.globalAlpha = Math.min(1, b.glow * 0.8);
        c.drawImage(sp.lit, -sp.W / 2, -sp.pad, sp.W, sp.H);
        c.globalAlpha = 1;
      }
      c.restore();
    }
  }

  drawGreat(c, view, dt) {
    const s = this.greatSize, x = this.cx, y = this.cy - s * 0.5;
    const p = Math.max(0, Math.min(1, view.progress || 0));
    this.greatPulse += dt;
    c.save();
    c.translate(x, y);
    // outline
    this.bellPath(c, s);
    c.fillStyle = 'rgba(16,17,20,0.55)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = view.ready ? COL.gold : view.showGreat ? 'rgba(181,154,255,0.35)' : 'rgba(181,154,255,0.14)';
    c.stroke();
    // molten fill from the mouth up, with a moving surface
    if (p > 0) {
      c.save();
      this.bellPath(c, s);
      c.clip();
      const top = s * 0.98 - p * s * 0.92;
      c.beginPath();
      c.moveTo(-s, s * 1.2);
      for (let k = -s; k <= s; k += 6) c.lineTo(k, top + Math.sin(k * 0.06 + this.greatPulse * 3) * 2.5);
      c.lineTo(s, s * 1.2);
      c.closePath();
      const g = c.createLinearGradient(0, top, 0, s);
      g.addColorStop(0, COL.moltenHi); g.addColorStop(1, COL.molten);
      c.fillStyle = g;
      c.globalAlpha = 0.85;
      c.fill();
      c.restore();
    }
    if (view.ready) {
      const a = 0.4 + 0.3 * Math.sin(this.greatPulse * 4);
      c.shadowColor = COL.gold; c.shadowBlur = 24;
      c.strokeStyle = `rgba(197,255,73,${a + 0.3})`;
      c.lineWidth = 3;
      this.bellPath(c, s);
      c.stroke();
      c.shadowBlur = 0;
    }
    c.restore();
    // label
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (view.showGreat) {
      c.font = `700 ${Math.round(Math.max(11, s * 0.12))}px ui-monospace, Menlo, Consolas, monospace`;
      c.fillStyle = view.ready ? COL.gold : COL.muted;
      c.fillText(view.ready ? 'recast ready · tap' : `great bell ${Math.floor(p * 100)}%`, x, y + s * 1.18);
    }
  }

  drawComets(c, dt) {
    for (let k = this.comets.length - 1; k >= 0; k--) {
      const m = this.comets[k];
      m.t += dt;
      const u = Math.min(1, m.t / m.dur);
      const A = this.bells[m.from], B = this.bells[m.to];
      if (!A || !B) { this.comets.splice(k, 1); continue; }
      let a0 = A.a, a1 = B.a;
      if (m.dir > 0 && a1 <= a0) a1 += TAU;
      if (m.dir < 0 && a1 >= a0) a1 -= TAU;
      const head = a0 + (a1 - a0) * u;
      const tail = a0 + (a1 - a0) * Math.max(0, u - 0.6);
      c.strokeStyle = m.hand ? COL.echoHand : COL.echo;
      c.lineWidth = m.hand ? 4 : 2.5;
      c.lineCap = 'round';
      c.globalAlpha = 0.85 * (1 - Math.max(0, m.t - m.dur) / 0.15);
      c.beginPath();
      if (m.dir > 0) c.arc(this.cx, this.cy, this.R, tail, head);
      else c.arc(this.cx, this.cy, this.R, head, tail);
      c.stroke();
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(this.cx + Math.cos(head) * this.R, this.cy + Math.sin(head) * this.R, m.hand ? 4 : 3, 0, TAU); c.fill();
      c.globalAlpha = 1;
      if (m.t > m.dur + 0.15) this.comets.splice(k, 1);
    }
  }

  drawRipples(c, dt) {
    for (let k = this.ripples.length - 1; k >= 0; k--) {
      const r = this.ripples[k];
      r.t += dt;
      const u = r.t / r.life;
      if (u >= 1) { this.ripples.splice(k, 1); continue; }
      c.strokeStyle = r.color;
      c.globalAlpha = (1 - u) * (r.a || 0.8);
      c.lineWidth = 2.5 * (1 - u) + 0.5;
      c.beginPath(); c.arc(r.x, r.y, r.r + (r.max - r.r) * (1 - Math.pow(1 - u, 3)), 0, TAU); c.stroke();
    }
    c.globalAlpha = 1;
  }

  drawSparks(c, dt) {
    for (let k = this.sparks.length - 1; k >= 0; k--) {
      const p = this.sparks[k];
      p.t += dt;
      if (p.t > p.life) { this.sparks.splice(k, 1); continue; }
      p.vy += 260 * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      c.fillStyle = p.color;
      c.globalAlpha = 1 - p.t / p.life;
      c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    c.globalAlpha = 1;
  }

  drawPops(c, dt) {
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (let k = this.pops.length - 1; k >= 0; k--) {
      const p = this.pops[k];
      p.t += dt;
      const u = p.t / p.life;
      if (u >= 1) { this.pops.splice(k, 1); continue; }
      const sc = u < 0.15 ? 0.6 + (u / 0.15) * 0.6 : 1.2 - Math.min(0.2, (u - 0.15) * 0.6);
      c.font = `800 ${Math.round(p.size * sc)}px ui-monospace, Menlo, Consolas, monospace`;
      c.globalAlpha = u > 0.7 ? (1 - u) / 0.3 : 1;
      const y = p.y - u * 34;
      c.lineWidth = 4;
      c.strokeStyle = 'rgba(16,17,20,0.85)';
      c.strokeText(p.text, p.x, y);
      c.fillStyle = p.color;
      c.fillText(p.text, p.x, y);
    }
    c.globalAlpha = 1;
  }

  drawChain(c, dt, view) {
    const ch = this.chain;
    ch.t += dt;
    if (ch.perfect > 0) ch.perfect -= dt;
    if (ch.n < 2 || ch.t > 1.6) return;
    const a = ch.t < 1.1 ? 1 : 1 - (ch.t - 1.1) / 0.5;
    const pulse = 1 + Math.max(0, 0.25 - ch.t) * 1.2;
    const size = Math.min(64, 22 + ch.n * 1.6) * pulse;
    const y = this.cy + this.greatSize * 0.12;
    c.globalAlpha = Math.max(0, a);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${Math.round(size)}px ui-monospace, Menlo, Consolas, monospace`;
    c.lineWidth = 6;
    c.strokeStyle = 'rgba(16,17,20,0.9)';
    const txt = `x${ch.n}`;
    c.strokeText(txt, this.cx, y);
    c.fillStyle = ch.perfect > 0 ? COL.perfect : ch.n >= 12 ? COL.gold : COL.ink;
    c.fillText(txt, this.cx, y);
    c.font = `700 ${Math.round(11 + Math.min(4, ch.n * 0.2))}px ui-monospace, Menlo, monospace`;
    c.fillStyle = ch.best ? COL.gold : COL.muted;
    c.fillText(ch.best && ch.n >= 4 ? 'new record chain' : 'chain', this.cx, y + size * 0.62);
    c.globalAlpha = 1;
  }

  drawBanner(c, dt) {
    const b = this.banner;
    if (!b) return;
    b.t += dt;
    if (b.t > b.life) { this.banner = null; return; }
    const u = b.t / b.life;
    const a = u < 0.1 ? u / 0.1 : u > 0.8 ? (1 - u) / 0.2 : 1;
    const sc = u < 0.1 ? 0.7 + u * 3 : 1;
    const y = this.cy - this.greatSize * 0.82;
    c.globalAlpha = a;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${Math.round(Math.min(34, this.w * 0.075) * sc)}px ui-monospace, Menlo, Consolas, monospace`;
    c.lineWidth = 7;
    c.strokeStyle = 'rgba(16,17,20,0.92)';
    c.strokeText(b.text, this.w / 2, y);
    c.fillStyle = b.color;
    c.fillText(b.text, this.w / 2, y);
    if (b.sub) {
      c.font = `700 14px ui-monospace, Menlo, monospace`;
      c.strokeText(b.sub, this.w / 2, y + 26);
      c.fillStyle = COL.ink;
      c.fillText(b.sub, this.w / 2, y + 26);
    }
    c.globalAlpha = 1;
  }

  drawHint(c) {
    if (!this.hint) return;
    const b = this.bells[this.hint.bell];
    if (!b) return;
    const t = this.time;
    const r = this.bellSize * (1.1 + 0.25 * Math.sin(t * 5));
    c.strokeStyle = `rgba(197,255,73,${0.6 + 0.3 * Math.sin(t * 5)})`;
    c.lineWidth = 3;
    c.beginPath(); c.arc(b.x, b.y, r, 0, TAU); c.stroke();
    c.font = '800 15px ui-monospace, Menlo, Consolas, monospace';
    c.textAlign = 'center';
    c.lineWidth = 5;
    c.strokeStyle = 'rgba(16,17,20,0.9)';
    const y = b.y - this.bellSize * 1.7;
    c.strokeText(this.hint.text, b.x, y);
    c.fillStyle = COL.echoHand;
    c.fillText(this.hint.text, b.x, y);
  }
}
