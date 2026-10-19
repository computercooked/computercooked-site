/*
 * FATHOM: every sound is synthesized with WebAudio. No audio files.
 * The context is created on the first user gesture (browsers require that).
 */
(function (root) {
  'use strict';
  let ctx = null, master = null, noiseBuf = null, muted = false, portalMuted = false;

  try { muted = localStorage.getItem('fathom.muted') === '1'; } catch (e) { /* private mode */ }

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 8; comp.ratio.value = 6;
    master = ctx.createGain();
    master.gain.value = (muted || portalMuted) ? 0 : 0.55;
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }

  function tone(type, f0, f1, dur, vol, when, dest) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(dest || master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(filterType, f0, f1, q, dur, vol, when) {
    if (!ctx) return;
    const t = ctx.currentTime + (when || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = filterType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    env(g, t, 0.004, vol, dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  const S = {
    unlock() { ensure(); },
    get muted() { return muted; },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem('fathom.muted', muted ? '1' : '0'); } catch (e) { /* ignore */ }
      if (master) master.gain.setTargetAtTime((muted || portalMuted) ? 0 : 0.55, ctx.currentTime, 0.02);
    },
    /** The portal's own mute setting (CrazyGames muteAudio). Not saved: it is the portal's choice, not the player's. */
    setPortalMuted(m) {
      portalMuted = !!m;
      if (master) master.gain.setTargetAtTime((muted || portalMuted) ? 0 : 0.55, ctx.currentTime, 0.02);
    },
    click() { if (!ensure()) return; tone('square', 900, 1200, 0.04, 0.08); },
    pick() { if (!ensure()) return; tone('triangle', 500, 700, 0.06, 0.12); },
    rotate() { if (!ensure()) return; tone('square', 300, 600, 0.07, 0.07); tone('square', 600, 900, 0.05, 0.05, 0.05); },
    launch() { if (!ensure()) return; tone('square', 1400, 260, 0.18, 0.08); noise('highpass', 3000, 1500, 0.5, 0.12, 0.05); },
    splash(heat) {
      if (!ensure()) return;
      noise('bandpass', 1800, 300, 1.2, 0.35, 0.5);
      for (let i = 0; i < 4; i++) tone('sine', 400 + Math.random() * 500, 900 + Math.random() * 600, 0.05, 0.06, 0.08 + i * 0.05);
      // the echo tick: pitch rises as you get closer, so you can hear hot and cold
      const f = heat === 1 ? 1320 : heat === 2 ? 990 : heat === 3 ? 740 : 330;
      tone('triangle', f, heat ? f : 220, heat ? 0.16 : 0.25, 0.22, 0.22);
      if (heat === 1) tone('triangle', f * 1.5, f * 1.5, 0.12, 0.14, 0.34);
    },
    hit(streak) {
      if (!ensure()) return;
      const s = Math.min(streak || 1, 4);
      noise('lowpass', 4000, 150, 0.8, 0.55 + s * 0.05, 0.9);
      tone('sine', 160, 38, 0.5, 0.9);
      tone('square', 90 + s * 30, 45, 0.25, 0.18);
      if (s >= 2) tone('square', 660 + s * 110, 880 + s * 110, 0.1, 0.07, 0.12);
    },
    sunk() {
      if (!ensure()) return;
      noise('lowpass', 2500, 60, 0.7, 1.3, 1.0);
      tone('sine', 120, 28, 1.1, 1.0);
      [196, 247, 294].forEach((f, i) => tone('square', f, f * 0.5, 0.6, 0.06, 0.25 + i * 0.03));
    },
    decoy() {
      if (!ensure()) return;
      tone('square', 700, 70, 0.55, 0.12);
      noise('bandpass', 2400, 400, 4, 0.5, 0.25);
      tone('sine', 300, 1200, 0.08, 0.1, 0.5); tone('sine', 300, 1300, 0.08, 0.08, 0.6);
    },
    sonar() {
      if (!ensure()) return;
      const t = ctx.currentTime;
      const dl = ctx.createDelay(); dl.delayTime.value = 0.28;
      const fb = ctx.createGain(); fb.gain.value = 0.35;
      dl.connect(fb); fb.connect(dl); dl.connect(master);
      setTimeout(() => { try { dl.disconnect(); fb.disconnect(); } catch (e) { /* gone */ } }, 3000);
      tone('sine', 1480, 1440, 0.9, 0.35, 0, master);
      tone('sine', 1480, 1440, 0.9, 0.2, 0, dl);
      void t;
    },
    blip(i) { if (!ensure()) return; tone('sine', 1760, 1760, 0.08, 0.12, 0.45 + (i || 0) * 0.07); },
    incoming() { if (!ensure()) return; tone('sawtooth', 2000, 300, 0.35, 0.05); },
    alarm() { if (!ensure()) return; tone('square', 440, 440, 0.08, 0.08); tone('square', 330, 330, 0.1, 0.08, 0.1); },
    win() {
      if (!ensure()) return;
      [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone('square', f, f, i === 5 ? 0.5 : 0.12, 0.12, i * 0.11));
      [262, 392].forEach((f, i) => tone('triangle', f, f, 0.9, 0.15, 0.55 + i * 0.01));
    },
    lose() {
      if (!ensure()) return;
      [392, 330, 262, 196].forEach((f, i) => tone('square', f, f * 0.97, 0.26, 0.1, i * 0.22));
      tone('sine', 98, 49, 1.2, 0.3, 0.9);
    },
    yourTurn() { if (!ensure()) return; tone('triangle', 660, 660, 0.05, 0.05); tone('triangle', 880, 880, 0.06, 0.05, 0.06); },
    buzz() { if (!ensure()) return; tone('square', 120, 100, 0.12, 0.1); },
  };

  root.FathomAudio = S;
})(typeof self !== 'undefined' ? self : this);
