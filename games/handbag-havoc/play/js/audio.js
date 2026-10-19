/* Handbag Havoc: synthesized sound effects (WebAudio, no assets). */
(function () {
  'use strict';
  const HH = (window.HH = window.HH || {});

  let ctx = null, master = null, comp = null, noiseBuf = null;
  let muted = false;
  const lastPlay = {};           // rate limiting per sound name
  const MIN_GAP = { bonk: 0.035, shatter: 0.03, whoosh: 0.09, chain: 0.04, needle: 0.05, hurt: 0.1, boom: 0.05 };

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 6;
    comp.attack.value = 0.003; comp.release.value = 0.15;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.0, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function ok(name) {
    if (!ctx || muted) return false;
    const t = ctx.currentTime, g = MIN_GAP[name] || 0.02;
    if (lastPlay[name] && t - lastPlay[name] < g) return false;
    lastPlay[name] = t;
    return true;
  }

  function env(gainNode, t, a, peak, dcy) {
    const g = gainNode.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(peak, t + a);
    g.exponentialRampToValueAtTime(0.0001, t + a + dcy);
  }

  function tone(type, f0, f1, dur, vol, when) {
    const t = (when || ctx.currentTime);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.004, vol, dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(dur, vol, ftype, f0, f1, q, when) {
    const t = (when || ctx.currentTime);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter(); f.type = ftype; f.Q.value = q || 1;
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.003, vol, dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  const SFX = {
    init,
    setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.55; },
    isMuted() { return muted; },
    // bag smacks a gnome; power 0..1
    bonk(power) {
      if (!ok('bonk')) return;
      const p = Math.min(1, power), v = 0.92 + Math.random() * 0.16;   // +-8% pitch so a stream of smacks never sounds like one sample
      tone('sine', (220 + 180 * p) * v, 70 * v, 0.12 + 0.06 * p, 0.35 + 0.3 * p);
      noise(0.05, 0.18 + 0.2 * p, 'bandpass', 1800, 600, 1.2);
    },
    // ceramic shatter
    shatter(big) {
      if (!ok('shatter')) return;
      noise(big ? 0.28 : 0.16, big ? 0.38 : 0.24, 'highpass', 2600 + Math.random() * 1500, 5000, 0.7);
      tone('triangle', 1700 + Math.random() * 900, 900, 0.07, 0.07);
    },
    // chain ladder: pitch climbs with chain count
    chain(n) {
      if (!ok('chain')) return;
      const steps = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
      const semi = steps[Math.min(steps.length - 1, n - 1)] + Math.max(0, n - steps.length) * 0.5;
      const f = 392 * Math.pow(2, semi / 12);
      tone('square', f, null, 0.09, 0.09);
      tone('sine', f * 2, null, 0.12, 0.06);
    },
    milestone(n) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      const base = n >= 40 ? 523 : n >= 20 ? 440 : 392;
      [0, 4, 7, 12].forEach((s, i) => tone('sawtooth', base * Math.pow(2, s / 12), null, 0.16, 0.08, t + i * 0.055));
      noise(0.4, 0.15, 'lowpass', 600, 120, 0.8, t);
    },
    whoosh(speed) {
      if (!ok('whoosh')) return;
      noise(0.16, Math.min(0.12, speed / 9000), 'bandpass', 500 + speed, 1500 + speed, 2.5);
    },
    hurt() {
      if (!ok('hurt')) return;
      tone('sawtooth', 300, 60, 0.35, 0.32);
      noise(0.25, 0.25, 'lowpass', 900, 100, 1);
    },
    boom() {
      if (!ok('boom')) return;
      tone('sine', 140, 35, 0.35, 0.5);
      noise(0.35, 0.3, 'lowpass', 2200, 90, 0.8);
    },
    needle() { if (ok('needle')) tone('triangle', 1400, 2400, 0.05, 0.06); },
    pickup() { if (!ctx || muted) return; const t = ctx.currentTime; tone('sine', 880, null, 0.08, 0.15, t); tone('sine', 1320, null, 0.12, 0.15, t + 0.07); },
    squeal() { if (!ctx || muted) return; tone('sine', 2600, 3400, 0.25, 0.08); tone('sine', 2610, 3420, 0.25, 0.05); noise(0.2, 0.1, 'lowpass', 800, 100, 1); },
    waveStart() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      [0, 7, 12].forEach((s, i) => tone('square', 262 * Math.pow(2, s / 12), null, 0.12, 0.08, t + i * 0.09));
    },
    waveClear() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      [0, 4, 7, 11, 12].forEach((s, i) => tone('triangle', 392 * Math.pow(2, s / 12), null, 0.18, 0.13, t + i * 0.07));
    },
    pick() { if (!ctx || muted) return; const t = ctx.currentTime; tone('square', 660, null, 0.06, 0.08, t); tone('square', 990, null, 0.1, 0.08, t + 0.05); },
    select() { if (ok('needle')) tone('sine', 520, null, 0.04, 0.06); },
    bossSlam() { if (!ctx || muted) return; tone('sine', 90, 30, 0.6, 0.6); noise(0.5, 0.35, 'lowpass', 400, 60, 1); },
    gameOver() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      [7, 4, 0, -5].forEach((s, i) => tone('triangle', 330 * Math.pow(2, s / 12), null, 0.3, 0.14, t + i * 0.16));
    },
    victory() {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      [0, 4, 7, 12, 7, 12, 16, 19].forEach((s, i) => tone('square', 392 * Math.pow(2, s / 12), null, 0.18, 0.09, t + i * 0.09));
    },
  };
  HH.SFX = SFX;
})();
