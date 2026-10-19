// Bellchain sound. Everything is synthesized with WebAudio: no audio files.
// Bells use inharmonic partials on a pentatonic scale so overlapping chains always sound consonant.

const PENT = [0, 2, 4, 7, 9];
// bell-ish partial ratios and relative levels (hum, prime, minor-third-ish tierce, quint, nominal)
const PARTIALS = [
  [0.5, 0.35, 2.6],
  [1.0, 1.0, 1.6],
  [1.19, 0.32, 1.1],
  [1.5, 0.22, 0.9],
  [2.0, 0.42, 0.8],
  [2.74, 0.12, 0.45],
];

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.recent = [];       // timestamps of recent notes, for the limiter
    this.maxPer100ms = 9;
  }

  // Must be called from a user gesture (browsers block audio until then).
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.comp.connect(this.master);
      this.master.connect(this.ctx.destination);
      // gentle room: a short feedback delay
      this.delay = this.ctx.createDelay(1);
      this.delay.delayTime.value = 0.19;
      this.fb = this.ctx.createGain();
      this.fb.gain.value = 0.28;
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.22;
      this.delay.connect(this.fb); this.fb.connect(this.delay);
      this.delay.connect(this.wet); this.wet.connect(this.comp);
    } catch (e) {
      this.ctx = null;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }

  ok() {
    return this.ctx && !this.muted && this.ctx.state === 'running';
  }

  // limiter: drop notes when too many land at once (30 ringers must not become noise)
  allow(priority) {
    const now = performance.now();
    this.recent = this.recent.filter((t) => now - t < 100);
    const cap = priority ? this.maxPer100ms + 4 : this.maxPer100ms;
    if (this.recent.length >= cap) return false;
    this.recent.push(now);
    return true;
  }

  noteFreq(step) {
    const deg = PENT[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5);
    let f = 392 * Math.pow(2, deg / 12); // G4 root
    while (f > 2400) f /= 4;
    return f;
  }

  // step: scale step (rises with hop), vel 0..1, pan -1..1, golden adds a shimmer
  bell(step, vel = 0.6, pan = 0, golden = false, priority = false) {
    if (!this.ok() || !this.allow(priority)) return;
    const c = this.ctx, t = c.currentTime + 0.005;
    const f = this.noteFreq(step);
    const out = c.createGain();
    out.gain.value = vel * 0.32;
    let node = out;
    if (c.createStereoPanner) {
      const p = c.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      out.connect(p);
      node = p;
    }
    node.connect(this.comp);
    node.connect(this.delay);
    const parts = golden ? PARTIALS.concat([[4.0, 0.25, 0.6], [5.4, 0.12, 0.4]]) : PARTIALS;
    for (const [ratio, amp, dec] of parts) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f * ratio * (1 + (Math.random() - 0.5) * 0.002);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dec * (0.6 + vel * 0.6));
      o.connect(g); g.connect(out);
      o.start(t);
      o.stop(t + dec * 1.3 + 0.05);
    }
    // strike transient: a tiny filtered click
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(f * 4, t);
    o.frequency.exponentialRampToValueAtTime(f * 2, t + 0.03);
    g.gain.setValueAtTime(0.12 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
    o.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.06);
  }

  // Perfect Peal: a quick major chord bloom on top of the chain
  perfect(step) {
    if (!this.ok()) return;
    [0, 2, 4, 5].forEach((d, i) => setTimeout(() => this.bell(step + d, 0.55, (i - 1.5) * 0.4, true, true), i * 55));
  }

  buy(level = 0) {
    if (!this.ok() || !this.allow(true)) return;
    const c = this.ctx, t = c.currentTime;
    [0, 1].forEach((i) => {
      const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
      o.type = 'square';
      o.frequency.value = this.noteFreq(5 + (level % 5) + i * 2);
      lp.type = 'lowpass'; lp.frequency.value = 1800;
      g.gain.setValueAtTime(0, t + i * 0.06);
      g.gain.linearRampToValueAtTime(0.07, t + i * 0.06 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0005, t + i * 0.06 + 0.12);
      o.connect(lp); lp.connect(g); g.connect(this.comp);
      o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.14);
    });
  }

  deny() {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(120, t + 0.1);
    g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.12);
    o.connect(g); g.connect(this.comp); o.start(t); o.stop(t + 0.13);
  }

  unlockChime() {
    if (!this.ok()) return;
    [0, 2, 4, 7].forEach((d, i) => setTimeout(() => this.bell(d + 3, 0.5, 0, true, true), i * 110));
  }

  // The Great Bell: low gong with a slow bloom
  gong() {
    if (!this.ok()) return;
    const c = this.ctx, t = c.currentTime;
    const out = c.createGain(); out.gain.value = 0.55; out.connect(this.comp); out.connect(this.delay);
    for (const [ratio, amp, dec] of [[1, 1, 5], [2.0, 0.5, 4], [2.4, 0.35, 3.2], [3.0, 0.2, 2.6], [4.2, 0.15, 2], [0.5, 0.6, 6]]) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.value = 98 * ratio;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0005, t + dec);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + dec + 0.1);
    }
  }
}
