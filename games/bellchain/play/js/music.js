// bellchain v2 music: scales, songs, twelve synthesized bells and a step sequencer. no samples, all webaudio.

// ---------- one theme per recast: a new scale, a new material, new colors ----------
export const THEMES = [
  { name: 'bronze', mode: 'major', scale: [0, 2, 4, 5, 7, 9, 11], root: 60, sky: ['#101114', '#16161d', '#2a2342'], bell: ['#c98a3e', '#f2c16b', '#7a4a22'], acc: '#C5FF49' },
  { name: 'silver', mode: 'minor', scale: [0, 2, 3, 5, 7, 8, 10], root: 57, sky: ['#0d1016', '#121a26', '#1f2c45'], bell: ['#9aa3b5', '#eef2f8', '#566074'], acc: '#B59AFF' },
  { name: 'jade', mode: 'pentatonic', scale: [0, 2, 4, 4, 7, 9, 9], root: 62, sky: ['#0b1210', '#10201a', '#173a2c'], bell: ['#4fb38a', '#a8f0cf', '#1f5c45'], acc: '#C5FF49' },
  { name: 'gold', mode: 'dorian', scale: [0, 2, 3, 5, 7, 9, 10], root: 62, sky: ['#14110a', '#211a0d', '#3d2c10'], bell: ['#e9b93c', '#fff0a6', '#8a6315'], acc: '#F5F3ED' },
  { name: 'obsidian', mode: 'phrygian dominant', scale: [0, 1, 4, 5, 7, 8, 10], root: 64, sky: ['#0a0a0c', '#160e14', '#2e1222'], bell: ['#3a3446', '#a690c9', '#15121c'], acc: '#ff6b9a' },
  { name: 'glass', mode: 'hirajoshi', scale: [0, 2, 3, 3, 7, 8, 8], root: 57, sky: ['#0b1116', '#0f1c25', '#183447'], bell: ['#9fe3ff', '#ffffff', '#4a8fae'], acc: '#9fe3ff' },
  { name: 'neon', mode: 'lydian', scale: [0, 2, 4, 6, 7, 9, 11], root: 65, sky: ['#0c0814', '#170c27', '#2b0f4a'], bell: ['#ff4fd8', '#ffc2f2', '#7a1a68'], acc: '#C5FF49' },
  { name: 'void', mode: 'whole tone', scale: [0, 2, 4, 6, 8, 10, 10], root: 60, sky: ['#000000', '#07070b', '#151526'], bell: ['#1d1d29', '#B59AFF', '#09090d'], acc: '#B59AFF' },
];
export const themeFor = (asc) => THEMES[asc % THEMES.length];

// ---------- songs: melody as [scale degree, length in 16ths] (null = rest), chords as roots per half bar ----------
const q = (d) => [d, 4], h = (d) => [d, 8];
const twinkleA = [q(0), q(0), q(4), q(4), q(5), q(5), h(4), q(3), q(3), q(2), q(2), q(1), q(1), h(0)];
const twinkleB = [q(4), q(4), q(3), q(3), q(2), q(2), h(1)];
const odeA = [q(2), q(2), q(3), q(4), q(4), q(3), q(2), q(1), q(0), q(0), q(1), q(2)];
const frereBars = [[q(0), q(1), q(2), q(0)], [q(2), q(3), h(4)], [[4, 2], [5, 2], [4, 2], [3, 2], q(2), q(0)], [q(0), q(-3), h(0)]];
const SONG_DATA = {
  twinkle: { melody: [...twinkleA, ...twinkleB, ...twinkleB, ...twinkleA], chords: [0, 0, 3, 0, 3, 0, 4, 0, 0, 3, 0, 4, 0, 3, 0, 4, 0, 0, 3, 0, 3, 0, 4, 0] },
  mary: { melody: [q(2), q(1), q(0), q(1), q(2), q(2), h(2), q(1), q(1), h(1), q(2), q(4), h(4), q(2), q(1), q(0), q(1), q(2), q(2), q(2), q(2), q(1), q(1), q(2), q(1), [0, 16]],
    chords: [0, 0, 0, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 0, 0] },
  frere: { melody: frereBars.flatMap((b) => [...b, ...b]), chords: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 4] },
  ode: { melody: [...odeA, [2, 6], [1, 2], h(1), ...odeA, [1, 6], [0, 2], h(0)], chords: [0, 0, 0, 4, 0, 0, 4, 4, 0, 0, 0, 4, 0, 0, 4, 0] },
  jingle: { melody: [q(2), q(2), h(2), q(2), q(2), h(2), q(2), q(4), [0, 6], [1, 2], [2, 16], q(3), q(3), [3, 6], [3, 2], q(3), q(2), q(2), [2, 2], [2, 2], q(2), q(1), q(1), q(2), h(1), h(4)],
    chords: [0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 1, 1, 4, 4] },
  westminster: { melody: [q(2), q(1), q(0), q(-3), q(0), q(2), q(1), q(-3), q(0), q(1), q(2), q(0), q(2), q(0), q(1), q(-3), q(-3), q(1), q(2), q(0), h(-7), h(-7), h(-7), h(null)],
    chords: [0, 0, 0, 4, 0, 0, 4, 4, 4, 0, 0, 0] },
  canon: { melody: [h(9), h(8), h(7), h(6), h(5), h(4), h(5), h(6), q(7), q(6), q(5), q(4), q(3), q(2), q(3), q(1), [7, 2], [9, 2], [11, 2], [10, 2], [9, 2], [7, 2], [9, 2], [8, 2], [7, 2], [5, 2], [7, 2], [4, 2], [3, 2], [5, 2], [4, 2], [3, 2], h(2), h(1), h(0), h(-1)],
    chords: [0, 4, 5, 2, 3, 0, 3, 4] },
};

// improv.exe: an 8-bar melody on I-vi-IV-V, chord tones on strong beats, steps in between, one motif repeated
export function improvise(seed) {
  let x = (seed * 9301 + 49297) % 233280 || 1;
  const R = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const prog = [0, 5, 3, 4, 0, 5, 3, 4];
  const rhythms = [[4, 4, 4, 4], [2, 2, 4, 4, 4], [4, 2, 2, 8], [6, 2, 4, 4], [2, 2, 2, 2, 8], [4, 4, 8]];
  const motif = rhythms[Math.floor(R() * rhythms.length)], alt = rhythms[Math.floor(R() * rhythms.length)];
  const melody = []; let prev = 4;
  prog.forEach((root, bar) => {
    const rh = bar === 7 ? [8, 8] : bar % 2 ? alt : motif;
    rh.forEach((len, i) => {
      let d;
      if (bar === 7 && i === 1) d = 7;
      else if (i === 0) { const tones = [root, root + 2, root + 4, root + 7].map((t) => t % 7 + (t >= 7 ? 7 : 0)); d = tones.reduce((a, b) => (Math.abs(b - prev) < Math.abs(a - prev) ? b : a)); }
      else d = prev + (R() < 0.5 ? 1 : -1) * (R() < 0.75 ? 1 : 2);
      d = Math.max(-2, Math.min(9, d)); melody.push([d, len]); prev = d;
    });
  });
  return { melody, chords: prog.flatMap((r) => [r, r]) };
}

export function compileSong(id, seed) {
  const src = id === 'improv' ? improvise(seed || 7) : SONG_DATA[id] || SONG_DATA.twinkle;
  const len = src.melody.reduce((a, n) => a + n[1], 0);
  const steps = Math.ceil(len / 16) * 16;
  const at = new Array(steps).fill(undefined), notes = [];
  let t = 0;
  for (const [d, l] of src.melody) { if (d !== null) { at[t] = d; notes.push(d); } t += l; }
  return { id, steps, at, notes, chords: src.chords, chordAt: (step) => src.chords[Math.floor(step / 8) % src.chords.length] };
}

// ---------- instruments ----------
// p: partial ratios, a: amps, d: decay seconds, w: wave. extra flags for the odd ones.
export const INSTR = {
  handbell: { p: [1, 2, 3.01, 4.2], a: [1, 0.45, 0.2, 0.1], d: 1.4, vol: 0.5, color: '#f2c16b' },
  cowbell: { fixed: [587, 845], d: 0.28, vol: 0.18, w: 'square', bp: 2400, color: '#d9d4c7' },
  glock: { p: [1, 2.76, 5.4], a: [1, 0.3, 0.12], d: 1.0, vol: 0.3, oct: 1, color: '#9fe3ff' },
  church: { p: [0.5, 1, 1.19, 1.5, 2], a: [0.5, 1, 0.4, 0.3, 0.22], d: 3.6, vol: 0.32, color: '#c98a3e' },
  tubular: { p: [1, 2, 2.92, 4.15], a: [1, 0.5, 0.3, 0.15], d: 2.6, vol: 0.18, color: '#e6ecf5' },
  steel: { p: [1, 2, 3.9], a: [1, 0.5, 0.2], d: 0.55, vol: 0.22, w2: 'triangle', color: '#ffb86b' },
  gamelan: { p: [1, 1.007, 2.48, 3.95], a: [0.7, 0.7, 0.3, 0.15], d: 2.0, vol: 0.2, color: '#e9b93c' },
  crystal: { p: [1, 2.32, 4.25], a: [1, 0.4, 0.2], d: 2.4, vol: 0.14, color: '#ffffff' },
  chip: { p: [1], a: [1], d: 0.16, vol: 0.06, w: 'square', color: '#C5FF49' },
  choir: { choir: true, d: 1.0, vol: 0.08, color: '#B59AFF' },
  carillon: { p: [0.5, 1, 1.2, 1.5, 2, 3], a: [0.4, 1, 0.5, 0.35, 0.3, 0.12], d: 3.2, vol: 0.28, color: '#ffd98a' },
  cosmic: { p: [1, 2.01], a: [1, 0.4], d: 3.4, vol: 0.2, w2: 'triangle', send: 0.6, color: '#B59AFF' },
  tap: { p: [1, 2, 3, 4.1], a: [1, 0.5, 0.25, 0.12], d: 1.6, vol: 0.55, color: '#C5FF49' },
};

// which instrument plays what, on which steps. returns [[instr, degree, vel, holdSteps?]]
const ROLE_ORDER = ['handbell', 'cowbell', 'glock', 'church', 'tubular', 'steel', 'gamelan', 'crystal', 'chip', 'choir', 'carillon', 'cosmic'];
function partsFor(id, step, song) {
  const m = song.at[step], r = song.chordAt(step), tri = [r, r + 2, r + 4];
  switch (id) {
    case 'handbell': return m !== undefined ? [['handbell', m, 1]] : [];
    case 'cowbell': return step % 4 === 0 ? [['cowbell', 0, step % 16 === 0 ? 1 : 0.55]] : [];
    case 'glock': return m !== undefined && step % 8 === 0 ? [['glock', m + 7, 0.9]] : [];
    case 'church': return step % 8 === 0 ? [['church', r - 7, step % 16 === 0 ? 1 : 0.7]] : [];
    case 'tubular': return step % 8 === 4 ? tri.map((d) => ['tubular', d, 0.8]) : [];
    case 'steel': return step % 2 === 0 ? [['steel', [r, r + 2, r + 4, r + 7][(step / 2) % 4], 0.8]] : [];
    case 'gamelan': return m !== undefined ? [['gamelan', m - 2, 0.8]] : [];
    case 'crystal': return step % 4 === 2 ? [['crystal', tri[(step >> 2) % 3] + 7, 0.8]] : [];
    case 'chip': return [['chip', [r, r + 2, r + 4][step % 3] + 7, step % 4 === 0 ? 1 : 0.6]];
    case 'choir': return step % 8 === 0 ? tri.map((d) => ['choir', d, 0.8, 8]) : [];
    case 'carillon': return step % 16 === 0 && m !== undefined ? [['carillon', m - 7, 1]] : [];
    case 'cosmic': return step % 32 === 12 ? [['cosmic', r + 14, 1]] : [];
    default: return [];
  }
}

const LOW = { chip: 1, crystal: 1, steel: 1, cosmic: 1, gamelan: 1, glock: 1 };

// ---------- the audio engine ----------
export class Music {
  constructor() {
    this.ctx = null; this.vol = 0.7; this.muted = false; this.ext = false;
    this.theme = THEMES[0]; this.song = compileSong('twinkle');
    this.step = 0; this.nextT = 0; this.bpm = 100; this.tempoMult = 1;
    this.voices = 0; this.maxVoices = 30;
    this.handPtr = 0;            // where taps are in the melody before the band takes over
    this.onNote = null;          // (evt) for visuals: {t, deg, instr, vel, role}
  }
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = (this.ctx = new AC());
        this.comp = c.createDynamicsCompressor();
        this.comp.threshold.value = -18; this.comp.knee.value = 12; this.comp.ratio.value = 6; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
        this.master = c.createGain(); this.master.gain.value = 0;
        this.bus = c.createGain(); this.bus.gain.value = 0.9;
        this.delay = c.createDelay(1); this.delay.delayTime.value = 0.375;
        this.fb = c.createGain(); this.fb.gain.value = 0.38;
        this.send = c.createGain(); this.send.gain.value = 0.5;
        this.send.connect(this.delay); this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.bus);
        this.bus.connect(this.comp); this.comp.connect(this.master); this.master.connect(c.destination);
        this.applyVol();
      }
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    } catch (e) { this.ctx = null; }
  }
  applyVol() { if (this.master) this.master.gain.setTargetAtTime(this.muted || this.ext ? 0 : this.vol * 0.9, this.ctx.currentTime, 0.03); }
  setVolume(v) { this.vol = v; this.applyVol(); }
  setMuted(m) { this.muted = m; this.applyVol(); }
  setExt(m) { this.ext = m; this.applyVol(); }
  setTheme(t) { this.theme = t; }
  setSong(id, seed) { this.song = compileSong(id, seed); this.step = 0; this.handPtr = 0; }
  stepDur() { return 60 / (this.bpm * this.tempoMult) / 4; }
  freq(deg, oct) {
    const sc = this.theme.scale, o = Math.floor(deg / 7), i = ((deg % 7) + 7) % 7;
    return 440 * Math.pow(2, (this.theme.root + 12 * (o + (oct || 0)) + sc[i] - 69) / 12);
  }
  get live() { return !!(this.ctx && this.ctx.state === 'running' && !this.muted && !this.ext); }

  // play one note at performance time t (seconds); vel 0..1
  play(name, deg, t, vel, hold) {
    const I = INSTR[name];
    if (this.onNote) this.onNote({ t, deg, instr: name, vel });
    if (!this.live) return;
    // voice budget: decoration drops out first, the tune and your taps never do
    if (this.voices > this.maxVoices * 0.65 && LOW[name]) return;
    if (this.voices > this.maxVoices && name !== 'tap' && name !== 'handbell') return;
    const c = this.ctx, when = Math.max(c.currentTime, c.currentTime + (t - performance.now() / 1000));
    const f = this.freq(deg, I.oct || 0), v = (I.vol || 0.3) * (vel || 1);
    const out = c.createGain(); out.gain.value = 1; out.connect(this.bus);
    if (I.send) { const s = c.createGain(); s.gain.value = I.send; out.connect(s); s.connect(this.send); }
    let end = when + I.d + 0.05;
    const oscs = [];
    if (I.fixed) {
      const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = I.bp; bp.Q.value = 1.2; bp.connect(out);
      const g = c.createGain(); g.gain.setValueAtTime(v, when); g.gain.exponentialRampToValueAtTime(0.0001, when + I.d); g.connect(bp);
      for (const fr of I.fixed) { const o = c.createOscillator(); o.type = I.w; o.frequency.value = fr; o.connect(g); oscs.push(o); }
    } else if (I.choir) {
      const dur = (hold || 8) * this.stepDur();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1300; lp.Q.value = 0.7; lp.connect(out);
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, when); g.gain.linearRampToValueAtTime(v, when + 0.25);
      g.gain.setValueAtTime(v, when + dur); g.gain.exponentialRampToValueAtTime(0.0001, when + dur + I.d); g.connect(lp);
      for (const det of [-7, 7]) { const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(g); oscs.push(o); }
      end = when + dur + I.d + 0.05;
    } else {
      I.p.forEach((ratio, i) => {
        const o = c.createOscillator(); o.type = i === 1 && I.w2 ? I.w2 : I.w || 'sine'; o.frequency.value = f * ratio;
        const g = c.createGain(), d = I.d / (1 + i * 0.6);
        g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(v * I.a[i], when + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, when + d);
        o.connect(g); g.connect(out); oscs.push(o);
      });
    }
    this.voices++;
    oscs.forEach((o, i) => { o.start(when); o.stop(end); if (i === 0) o.onended = () => { this.voices--; try { out.disconnect(); } catch (e) { /* gone */ } }; });
  }

  // the band: schedule every step that falls inside the lookahead window
  update(nowSec, owned) {
    const look = 0.12;
    if (this.nextT < nowSec - 0.25) this.nextT = nowSec + 0.02; // after a pause, rejoin without a burst
    while (this.nextT < nowSec + look) {
      const st = this.step % this.song.steps;
      for (const id of ROLE_ORDER) {
        const n = owned[id] || 0;
        if (!n) continue;
        const gain = Math.min(1, 0.45 + 0.12 * Math.log2(1 + n));
        for (const [ins, deg, vel, hold] of partsFor(id, st, this.song)) this.play(ins, deg, this.nextT, vel * gain, hold);
      }
      this.step++;
      if (this.onStep) this.onStep(st, this.nextT);
      this.nextT += this.stepDur();
    }
  }
  get curStep() { return ((this.step - 1) % this.song.steps + this.song.steps) % this.song.steps; }

  // degrees for a tap and its echoes. no band yet: the next notes of the tune. with a band: chord tones climbing.
  tapDegrees(n, band) {
    if (!band) {
      const out = [];
      for (let i = 0; i < n; i++) { out.push(this.song.notes[this.handPtr % this.song.notes.length]); this.handPtr++; }
      return out;
    }
    const r = this.song.chordAt(this.curStep), tones = [r, r + 2, r + 4];
    return Array.from({ length: n }, (_, i) => tones[i % 3] + 7 * Math.floor(i / 3) + 7);
  }
}
