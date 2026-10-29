// bellchain v2 renderer: a ring of eight bells (one per scale degree), the great bell in the middle,
// notes floating up, the sequencer strip, the band lights and the golden bell. flat 2d canvas, no images.
import { INSTR } from './music.js';

const TAU = Math.PI * 2;
const MONO = 'ui-monospace, Menlo, Consolas, monospace';
const ringIndex = (deg) => { const i = ((deg % 7) + 7) % 7; return deg >= 7 && i === 0 ? 7 : i; };

export class Stage {
  constructor(canvas) {
    this.cv = canvas; this.c = canvas.getContext('2d');
    this.bells = Array.from({ length: 8 }, () => ({ swing: 0, vel: 0, glow: 0, color: '#fff' }));
    this.great = { swing: 0, vel: 0, pulse: 0 };
    this.notes = []; this.pops = []; this.sparks = []; this.lights = {};
    this.golden = null; this.banner = null; this.chain = null; this.flash = 0; this.shake = 0;
    this.theme = null; this.lite = false; this.t = 0; this.stars = Array.from({ length: 40 }, () => [Math.random(), Math.random(), Math.random()]);
    this.seq = { song: null, step: 0 };
    this.resize();
  }
  resize() {
    const r = this.cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.dpr = dpr;
    this.cv.width = Math.round(this.w * dpr); this.cv.height = Math.round(this.h * dpr);
    const top = 64, bottom = 58;
    this.cx = this.w / 2; this.cy = top + (this.h - top - bottom) / 2;
    this.R = Math.max(60, Math.min(this.w * 0.4, (this.h - top - bottom) * 0.43));
    this.bs = Math.max(20, Math.min(46, this.R * 0.26));
    this.gs = Math.max(34, Math.min(92, this.R * 0.5));
  }
  bellPos(i) { const a = -Math.PI / 2 + (i / 8) * TAU; return { x: this.cx + Math.cos(a) * this.R, y: this.cy + Math.sin(a) * this.R }; }

  // a note sounded (from the band or a tap)
  ring(deg, instr, vel, strong) {
    const i = ringIndex(deg), b = this.bells[i], col = (INSTR[instr] || INSTR.tap).color;
    b.vel += (strong ? 9 : 4) * (vel || 1) * (Math.random() < 0.5 ? -1 : 1); b.glow = Math.max(b.glow, strong ? 1 : 0.55 * (vel || 1)); b.color = col;
    this.lights[instr] = 1;
    if (strong || Math.random() < (this.lite ? 0.15 : 0.45)) {
      const p = this.bellPos(i);
      this.notes.push({ x: p.x + (Math.random() - 0.5) * 10, y: p.y - this.bs * 0.6, vy: -40 - Math.random() * 30, life: 1.4, t: 0, col, ch: Math.random() < 0.5 ? '♪' : '♫', size: strong ? 18 : 13 });
    }
  }
  tapGreat(x, y, text, big) {
    this.great.vel += 10 * (Math.random() < 0.5 ? -1 : 1); this.great.pulse = 1;
    this.pops.push({ x, y, text, t: 0, life: 1, big });
    if (!this.lite) for (let k = 0; k < 6; k++) { const a = Math.random() * TAU, s = 60 + Math.random() * 140; this.sparks.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 40, life: 0.5, t: 0 }); }
  }
  hop(deg, value, n) { const i = ringIndex(deg), p = this.bellPos(i); this.pops.push({ x: p.x, y: p.y - this.bs, text: '+' + value, t: 0, life: 0.9, small: true }); this.chain = { n, t: 0 }; }
  showBanner(text, sub, color, life) { this.banner = { text, sub, color, t: 0, life: life || 2.2 }; }
  hitGolden(x, y) { const g = this.golden; return g && Math.hypot(x - g.x, y - g.y) < this.bs * 1.6 * (g.scale || 1) + 12; }
  hitGreat(x, y) { return Math.hypot(x - this.cx, y - this.cy) < this.gs * 1.2; }

  draw(dt) {
    const c = this.c, th = this.theme;
    this.t += dt;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 8 * this.shake; sy = (Math.random() - 0.5) * 8 * this.shake; }
    c.save(); c.translate(sx, sy);
    // sky
    const g = c.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, th.sky[0]); g.addColorStop(0.6, th.sky[1]); g.addColorStop(1, th.sky[2]);
    c.fillStyle = g; c.fillRect(-10, -10, this.w + 20, this.h + 20);
    if (!this.lite) {
      c.fillStyle = '#ffffff';
      for (const [x, y, z] of this.stars) { c.globalAlpha = 0.15 + 0.25 * Math.abs(Math.sin(this.t * (0.5 + z) + z * 9)); c.fillRect(x * this.w, y * this.h * 0.8, 1.5, 1.5); }
      c.globalAlpha = 1;
    }
    // ring line
    c.strokeStyle = th.acc + '33'; c.lineWidth = 2; c.setLineDash([3, 8]);
    c.beginPath(); c.arc(this.cx, this.cy, this.R, 0, TAU); c.stroke(); c.setLineDash([]);
    // chain arc
    if (this.chain) { this.chain.t += dt; if (this.chain.t > 1.2) this.chain = null; }
    // bells
    for (let i = 0; i < 8; i++) {
      const b = this.bells[i], p = this.bellPos(i);
      b.vel += -b.swing * 60 * dt; b.vel *= Math.pow(0.04, dt); b.swing += b.vel * dt; b.glow = Math.max(0, b.glow - dt * 1.6);
      this.drawBell(p.x, p.y, this.bs, b.swing * 0.08, b.glow, b.color, th);
    }
    // great bell
    const G = this.great;
    G.vel += -G.swing * 40 * dt; G.vel *= Math.pow(0.05, dt); G.swing += G.vel * dt; G.pulse = Math.max(0, G.pulse - dt * 3);
    this.drawBell(this.cx, this.cy - this.gs * 0.1, this.gs * (1 + G.pulse * 0.06), G.swing * 0.04, G.pulse * 0.8 + 0.1, th.acc, th);
    if (this.chain && this.chain.n > 1) {
      const a = 1 - Math.max(0, this.chain.t - 0.8) / 0.4;
      c.globalAlpha = a; c.fillStyle = this.chain.n >= 8 ? th.acc : '#F5F3ED'; c.textAlign = 'center';
      c.font = `800 ${Math.round(this.gs * 0.5)}px ${MONO}`; c.fillText('x' + this.chain.n, this.cx, this.cy + this.gs * 1.05);
      c.font = `700 11px ${MONO}`; c.fillText(this.chain.n >= 8 ? 'perfect peal' : 'chain', this.cx, this.cy + this.gs * 1.05 + 14); c.globalAlpha = 1;
    }
    // golden bell
    const gb = this.golden;
    if (gb) {
      gb.t += dt;
      const a = Math.min(1, gb.t * 3, (gb.life - gb.t) * 2);
      c.globalAlpha = Math.max(0, a);
      const r = this.bs * (gb.scale || 1) * (1.15 + 0.15 * Math.sin(this.t * 7));
      // a ring that keeps pulsing outwards, so it reads as "tap me" (K-0029)
      const ph = (this.t * 1.2) % 1;
      c.strokeStyle = '#ffe14a'; c.lineWidth = 3; c.globalAlpha = Math.max(0, a) * (1 - ph);
      c.beginPath(); c.arc(gb.x, gb.y, r * (1.2 + ph * 1.6), 0, TAU); c.stroke();
      c.globalAlpha = Math.max(0, a);
      const rg = c.createRadialGradient(gb.x, gb.y, 2, gb.x, gb.y, r * 2.2); rg.addColorStop(0, '#fff3a0cc'); rg.addColorStop(1, '#fff3a000');
      c.fillStyle = rg; c.beginPath(); c.arc(gb.x, gb.y, r * 2.2, 0, TAU); c.fill();
      this.drawBell(gb.x, gb.y, r, Math.sin(this.t * 4) * 0.25, 1, '#ffe14a', { bell: ['#ffd23f', '#fff6c2', '#a87a00'], acc: '#ffe14a' });
      c.globalAlpha = 1;
    }
    // floating notes
    c.textAlign = 'center';
    this.notes = this.notes.filter((n) => (n.t += dt) < n.life);
    if (this.notes.length > 80) this.notes.splice(0, this.notes.length - 80);
    for (const n of this.notes) { n.y += n.vy * dt; n.x += Math.sin(n.t * 5 + n.y) * 12 * dt; c.globalAlpha = 1 - n.t / n.life; c.fillStyle = n.col; c.font = `700 ${n.size}px ${MONO}`; c.fillText(n.ch, n.x, n.y); }
    // sparks
    this.sparks = this.sparks.filter((s) => (s.t += dt) < s.life);
    c.fillStyle = th.acc;
    for (const s of this.sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 300 * dt; c.globalAlpha = 1 - s.t / s.life; c.fillRect(s.x, s.y, 3, 3); }
    // pops
    this.pops = this.pops.filter((p) => (p.t += dt) < p.life);
    if (this.pops.length > 40) this.pops.splice(0, this.pops.length - 40);
    for (const p of this.pops) {
      const k = p.t / p.life; c.globalAlpha = 1 - k * k;
      c.font = `800 ${p.big ? 22 : p.small ? 12 : 16}px ${MONO}`;
      c.lineWidth = 3; c.strokeStyle = '#101114cc'; c.strokeText(p.text, p.x, p.y - k * 40);
      c.fillStyle = p.small ? '#B59AFF' : p.big ? th.acc : '#F5F3ED'; c.fillText(p.text, p.x, p.y - k * 40);
    }
    c.globalAlpha = 1;
    this.drawSeq(dt);
    // banner
    if (this.banner) {
      const B = this.banner; B.t += dt;
      if (B.t > B.life) this.banner = null;
      else {
        const a = Math.min(1, B.t * 5, (B.life - B.t) * 3), y = this.cy - this.R - 6 > 70 ? this.cy - this.R * 0.55 : this.cy - this.gs * 1.6;
        c.globalAlpha = a; c.textAlign = 'center';
        c.font = `800 ${Math.round(Math.min(28, this.w * 0.065))}px ${MONO}`; c.lineWidth = 5; c.strokeStyle = '#101114';
        c.strokeText(B.text, this.cx, y); c.fillStyle = B.color || th.acc; c.fillText(B.text, this.cx, y);
        if (B.sub) { c.font = `700 12px ${MONO}`; c.strokeText(B.sub, this.cx, y + 20); c.fillStyle = '#F5F3ED'; c.fillText(B.sub, this.cx, y + 20); }
        c.globalAlpha = 1;
      }
    }
    if (this.flash > 0) { this.flash -= dt; c.fillStyle = `rgba(245,243,237,${Math.min(0.5, this.flash)})`; c.fillRect(0, 0, this.w, this.h); }
    c.restore();
  }

  drawBell(x, y, s, rot, glow, col, th) {
    const c = this.c, [mid, hi, lo] = th.bell;
    c.save(); c.translate(x, y - s * 0.45); c.rotate(rot);
    if (glow > 0.05) { c.globalAlpha = glow * 0.32; c.fillStyle = col; c.beginPath(); c.arc(0, s * 0.45, s * 0.78, 0, TAU); c.fill(); c.globalAlpha = 1; }
    c.fillStyle = lo; c.fillRect(-s * 0.08, -s * 0.12, s * 0.16, s * 0.14);
    const gr = c.createLinearGradient(-s * 0.5, 0, s * 0.5, 0); gr.addColorStop(0, lo); gr.addColorStop(0.35, hi); gr.addColorStop(0.6, mid); gr.addColorStop(1, lo);
    c.fillStyle = gr;
    c.beginPath(); c.moveTo(-s * 0.26, 0); c.quadraticCurveTo(-s * 0.3, s * 0.5, -s * 0.52, s * 0.8); c.lineTo(s * 0.52, s * 0.8); c.quadraticCurveTo(s * 0.3, s * 0.5, s * 0.26, 0);
    c.quadraticCurveTo(0, -s * 0.16, -s * 0.26, 0); c.fill();
    c.fillStyle = lo; c.fillRect(-s * 0.55, s * 0.76, s * 1.1, s * 0.09);
    c.fillStyle = mid; c.beginPath(); c.arc(Math.sin(rot) * s * 0.2, s * 0.9, s * 0.09, 0, TAU); c.fill();
    c.restore();
  }

  // the current bar of the song, the playhead and the band lights
  drawSeq(dt) {
    const c = this.c, S = this.seq, th = this.theme;
    if (!S.song) return;
    const n = 16, pad = 12, w = Math.min(this.w - pad * 2, 520), x0 = (this.w - w) / 2, cw = w / n, y0 = this.h - 34, hgt = 22;
    const bar = Math.floor(S.step / 16) * 16;
    c.fillStyle = '#0006'; c.fillRect(x0 - 4, y0 - 4, w + 8, hgt + 8);
    for (let i = 0; i < n; i++) {
      const st = (bar + i) % S.song.steps, d = S.song.at[st], on = (S.step % 16) === i;
      c.fillStyle = on ? th.acc + '55' : i % 4 === 0 ? '#ffffff14' : '#ffffff08';
      c.fillRect(x0 + i * cw + 1, y0, cw - 2, hgt);
      if (d !== undefined) {
        const lv = Math.max(0, Math.min(1, (d + 3) / 13));
        c.fillStyle = on ? th.acc : '#F5F3EDaa';
        c.fillRect(x0 + i * cw + 3, y0 + hgt - 3 - lv * (hgt - 6), cw - 6, 3);
      }
    }
    // band lights
    const ids = Object.keys(this.lights);
    let x = x0;
    c.font = `700 9px ${MONO}`; c.textAlign = 'left';
    for (const id of this.bandIds || []) {
      const v = this.lights[id] || 0; this.lights[id] = Math.max(0, v - dt * 4);
      c.fillStyle = (INSTR[id] || INSTR.tap).color; c.globalAlpha = 0.25 + 0.75 * v;
      c.beginPath(); c.arc(x + 4, y0 - 12, 3 + v * 1.5, 0, TAU); c.fill(); x += 13;
    }
    c.globalAlpha = 1;
    if (!ids.length && !(this.bandIds || []).length) { c.fillStyle = '#F5F3ED66'; c.fillText('band: just you', x0, y0 - 9); }
  }
}
