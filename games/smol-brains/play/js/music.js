/* smol brains — music.js
   The soundtrack: "songs for small minds", 20 little pieces synthesized live in WebAudio (no files).
   Each song is written by hand as a melody in scale degrees plus a chord per bar; the engine adds the
   band (an accompaniment pattern, a bass, soft strings, a little percussion), plays the tune twice with
   a harmony the second time, and runs it all through a warm hall reverb.
   A playlist picks songs that fit the season, the time of day and the weather, with quiet gaps between
   them, the way a farm-game soundtrack drifts in and out. Some songs only exist in one season. */
(function () {
  "use strict";
  var SB = (window.SB = window.SB || {});
  var M = (SB.Music = {});

  /* ---------------- the album ----------------
     mel: one token per step (an eighth note). 1–7 are scale degrees, ' raises an octave and , lowers one,
     # and b sharpen or flatten, "." holds the note, "-" is a rest. "|" is only there to read the bars.
     chords: one scale degree per bar (built from the scale; "M" forces major, "7" adds the seventh).
     tags: seasons (spring summer autumn winter), time (day night), and rain / grief / late / title. */
  var SONGS = [
    { id: "smolbrains", title: "smol brains", root: 72, scale: "major", bpm: 84, bar: 8, lead: "flute", lead2: "piano", acc: "arp", accI: "piano", perc: 0,
      tags: ["any", "title"],
      A: { ch: "1 6 4 5", mel: "3 . 5 . 1' . 7 6 | 5 . . 3 6 . 5 . | 4 . 6 . 1' . 6 4 | 5 . . . 2 . 3 ." },
      B: { ch: "4 5 6 5", mel: "6 . 5 4 6 . 1' . | 7 . 5 . 2' . 1' 7 | 1' . 6 . 3 . 6 . | 5 . . . . . - ." } },
    { id: "firstlight", title: "first light", root: 67, scale: "major", bpm: 96, bar: 6, lead: "box", lead2: "flute", acc: "waltz", accI: "pluck",
      tags: ["spring", "day"],
      A: { ch: "1 1 4 1 6 2 5 5", mel: "5, . 1 . 2 . | 3 . . . 2 1 | 4 . 3 . 2 . | 3 . . . . . | 6 . 5 . 3 . | 2 . 1 . 6, . | 7, . 2 . 5 . | 5 . . . . ." },
      B: { ch: "4 5 3 6 4 1 2 5", mel: "1' . 7 . 6 . | 5 . . . 2 . | 3 . 5 . 7 . | 6 . . . 3 . | 4 . 6 . 1' . | 5 . 3 . 1 . | 2 . 4 . 6 . | 5 . . . - ." } },
    { id: "petals", title: "petal drift", root: 65, scale: "major", bpm: 76, bar: 8, lead: "piano", lead2: "flute", acc: "arp", accI: "box", strings: 1,
      tags: ["spring"],
      A: { ch: "1 3 4 5", mel: "5 . . 6 5 . 3 . | 3 . . 2 3 . 5 . | 6 . . 5 4 . 1' . | 7 . . . 5 . . ." },
      B: { ch: "6 3 2 5", mel: "1' . . 7 6 . 3 . | 5 . . 4 3 . . . | 4 . 6 . 2' . 1' 6 | 7 . . . 5 . 2 ." } },
    { id: "newegg", title: "a new egg", root: 62, scale: "major", bpm: 100, bar: 8, lead: "marimba", lead2: "box", acc: "bounce", accI: "pluck", perc: 1,
      tags: ["any", "day"],
      A: { ch: "1 4 1 5", mel: "1 . 3 5 1' . 5 . | 6 . 4 . 6 5 4 . | 3 . 5 . 1' 2' 1' 5 | 2 . . 3 2 . 7, ." },
      B: { ch: "6 4 2 5", mel: "6 . 1' 6 5 . 3 . | 4 . 6 4 1 . . . | 2 . 4 6 2' . 1' 6 | 5 . . . 7 . 5 ." } },
    { id: "puddles", title: "puddle hop", root: 72, scale: "major", bpm: 108, bar: 8, lead: "pluck", lead2: "marimba", acc: "bounce", accI: "pluck", perc: 1,
      tags: ["spring", "summer", "rain"],
      A: { ch: "1 6 2 5", mel: "5 3 5 3 6 . 5 . | 3 . 1 . 3 5 6 . | 4 2 4 2 6 . 4 . | 7, . 2 . 5 . . ." },
      B: { ch: "4 5 3 6", mel: "6 . 4 . 1' . 6 . | 7 . 5 . 2' . 7 . | 5 . 3 . 7 . 5 . | 6 . . . 3 . . ." } },
    { id: "sunny", title: "sunny patch", root: 67, scale: "major", bpm: 112, bar: 8, lead: "flute", lead2: "piano", acc: "bounce", accI: "piano", perc: 1,
      tags: ["summer", "day"],
      A: { ch: "1 5 6 4", mel: "1 . 2 3 5 . 3 . | 2 . 7, . 5, . 2 . | 3 . 2 1 6, . 1 . | 4 . 3 . 2 . . ." },
      B: { ch: "2 5 1 6", mel: "6 . 5 . 4 . 2 . | 2 . 4 . 7 . 5 . | 5 . 3 . 1' . 5 . | 6 . . . 3 . 5 ." } },
    { id: "longsummer", title: "long summer", root: 64, scale: "major", bpm: 72, bar: 8, lead: "piano", lead2: "flute", acc: "arp", accI: "piano", strings: 1,
      tags: ["summer"],
      A: { ch: "4 1 5 6", mel: "6 . . 5 6 . 1' . | 5 . . . 3 . 2 . | 2 . . 3 5 . 2' . | 1' . . . . . 7 6" },
      B: { ch: "2 5 3 6", mel: "4 . 6 . 1' . 2' . | 2' . . . 7 . 5 . | 5 . 7 . 3' . 2' . | 1' . . . 6 . . ." } },
    { id: "fireflies", title: "fireflies", root: 72, scale: "major", bpm: 84, bar: 6, lead: "box", lead2: "bell", acc: "waltz", accI: "piano", strings: 1,
      tags: ["summer", "night"],
      A: { ch: "6 4 1 5 6 4 5 5", mel: "3 . . . 6 . | 1' . . . 6 . | 5 . . . 3 . | 2 . . . 7, . | 3 . . . 6 . | 1' . 2' . 1' . | 7 . . . 5 . | 7 . . . . ." },
      B: { ch: "4 5 3 6 4 5 1 1", mel: "6 . 1' . 4' . | 5' . . . 2' . | 3' . . . 7 . | 1' . . . 6 . | 4' . 3' . 1' . | 2' . 1' . 7 . | 1' . . . . . | - . . . . ." } },
    { id: "berries", title: "berry picking", root: 62, scale: "major", bpm: 120, bar: 6, lead: "flute", lead2: "pluck", acc: "jig", accI: "pluck", perc: 1,
      tags: ["summer", "autumn", "day"],
      A: { ch: "1 1 4 5 1 6 2 5", mel: "1 . 3 5 . 3 | 1' . 6 5 . 3 | 4 . 6 1' . 6 | 5 . . 7, . . | 1 . 3 5 . 1' | 6 . 5 3 . 1 | 2 . 4 6 . 4 | 5 . . 7, 1 2" },
      B: { ch: "4 4 1 1 4 5 1 1", mel: "6 . 4 6 . 1' | 2' . 1' 6 . 4 | 5 . 3 1 . 3 | 5 . . . . . | 6 . 4 6 . 1' | 7 . 5 2' . 7 | 1' . . 5 . 3 | 1 . . . . ." } },
    { id: "campfire", title: "the campfire song", root: 67, scale: "major", bpm: 80, bar: 8, lead: "flute", lead2: "piano", acc: "strum", accI: "pluck",
      tags: ["any", "night"],
      A: { ch: "1 4 1 5", mel: "5, . 1 . 1 . 2 3 | 4 . . 3 4 . 6 . | 5 . 3 . 1 . 3 . | 2 . . . . . 5, ." },
      B: { ch: "6 4 1 5", mel: "3 . 3 4 5 . 6 . | 6 . 4 . 1 . . . | 1 . 3 . 5 . 1' . | 7 . . . 6 . 5 4" } },
    { id: "amber", title: "amber leaves", root: 65, scale: "major", bpm: 70, bar: 8, lead: "piano", lead2: "flute", acc: "arp", accI: "box", strings: 1,
      tags: ["autumn"],
      A: { ch: "6 4 1 5", mel: "3 . 6 . 1' . 3' . | 2' . . . 1' . 6 . | 5 . . 6 5 . 3 . | 2 . . . . . 3 ." },
      B: { ch: "4 1 5 6", mel: "4 . 6 . 2' . 1' . | 1' . . 7 1' . 5 . | 5 . 7 . 2' . 7 . | 6 . . . . . - ." } },
    { id: "harvestmoon", title: "harvest moon", root: 72, scale: "major", bpm: 78, bar: 6, lead: "flute", lead2: "box", acc: "harp", accI: "pluck", strings: 1,
      tags: ["autumn", "night"],
      A: { ch: "1 5 6 3 4 1 2 5", mel: "5 . . . 3 . | 2 . . . 7, . | 1 . . . 3 . | 7, . . . 5, . | 6, . 1 . 4 . | 3 . . . 1 . | 2 . . . 4 . | 2 . . . 7, ." },
      B: { ch: "4 5 3 6 2 5 1 1", mel: "1' . . . 6 . | 2' . . . 7 . | 7 . 5 . 3 . | 1' . . . 6 . | 6 . 4 . 2 . | 7 . 2' . 5' . | 3' . . . . . | 1' . . . . ." } },
    { id: "reeds", title: "wind in the reeds", root: 62, scale: "dorian", bpm: 88, bar: 8, lead: "flute", lead2: "pluck", acc: "harp", accI: "pluck", strings: 1,
      tags: ["autumn", "day"],
      A: { ch: "1 4M 1 7", mel: "1 . 2 3 5 . 4 3 | 4 . . 6 5 . 4 . | 3 . 1 . 5 . 3 2 | 2 . . 1 7, . . ." },
      B: { ch: "3 7 4M 1", mel: "5 . 3 . 1' . 7 . | 7 . 5 . 2' . 7 . | 1' . 6 . 4 . 6 . | 5 . . . 1 . . ." } },
    { id: "firstsnow", title: "first snow", root: 76, scale: "major", bpm: 72, bar: 6, lead: "box", lead2: "bell", acc: "waltz", accI: "piano", strings: 1,
      tags: ["winter"],
      A: { ch: "1 1 6 6 4 4 5 5", mel: "5 . . . 3 . | 1' . . . 7 . | 6 . . . 3 . | 1' . . . . . | 6 . 5 . 4 . | 1 . . . 6 . | 7 . . . 2' . | 5 . . . . ." },
      B: { ch: "4 5 3 6 4 5 1 1", mel: "4' . . . 3' . | 2' . . . 7 . | 5 . 7 . 3' . | 3' . . . 1' . | 6 . 1' . 4' . | 5' . . . 2' . | 1' . . . . . | - . . . . ." } },
    { id: "warmhut", title: "warm hut", root: 65, scale: "major", bpm: 76, bar: 8, lead: "piano", lead2: "flute", acc: "block", accI: "piano", strings: 1,
      tags: ["winter", "night"],
      A: { ch: "1 6 2 5", mel: "3 . 2 3 5 . 3 . | 1 . 6, . 1 . 3 . | 2 . 1 2 4 . 6 . | 5 . . . 4 . 2 ." },
      B: { ch: "4 3 2 5", mel: "6 . 1' . 4' . 3' . | 3' . 2' . 7 . 5 . | 4 . 6 . 2' . 1' . | 7 . . . 5 . . ." } },
    { id: "froststars", title: "frost and stars", root: 69, scale: "minor", bpm: 66, bar: 8, lead: "bell", lead2: "box", acc: "arp", accI: "box", strings: 1,
      tags: ["winter", "night"],
      A: { ch: "1 6 3 7", mel: "5 . . . 1' . 7 . | 6 . . . 1' . 3' . | 5' . . . 3' . 1' . | 7 . . . 4 . 2 ." },
      B: { ch: "4 7 3 6", mel: "4' . . . 3' . 1' . | 2' . . . 7 . 4 . | 3' . . . 5' . 3' . | 1' . . . . . 7 ." } },
    { id: "rainyday", title: "rainy day thoughts", root: 63, scale: "major", bpm: 74, bar: 8, lead: "epiano", lead2: "flute", acc: "block", accI: "epiano", needRain: 1,
      tags: ["spring", "summer", "autumn", "rain"],
      A: { ch: "4 3 2 1", mel: "3' . . 2' 1' . 5 . | 5 . . 4 3 . 2 . | 4 . . 3 2 . 6, . | 7, . . . 1 . . ." },
      B: { ch: "6 2 5 1", mel: "1' . 3' . 5' . 3' . | 2' . . 1' 6 . 4 . | 5 . 7 . 2' . 4' . | 3' . . . . . - ." } },
    { id: "missingyou", title: "missing you", root: 69, scale: "minor", bpm: 66, bar: 6, lead: "piano", lead2: "flute", acc: "waltz", accI: "piano", strings: 1,
      tags: ["any", "night", "grief"],
      A: { ch: "1 1 6 6 4 4 5M 5M", mel: "3 . . . 2 . | 1 . . . 5 . | 6 . . . 5 . | 1' . . . . . | 6 . . . 5 . | 4 . . . 3 . | 2 . 3 . 4 . | #7 . . . . ." },
      B: { ch: "6 7 3 6 4 1 5M 1", mel: "1' . . . 6 . | 2' . . . 7 . | 3' . . . 5' . | 3' . . . 1' . | 6 . 1' . 4' . | 3' . . . 1' . | 2' . . . #7 . | 1' . . . . ." } },
    { id: "littlehands", title: "little hands", root: 65, scale: "major", bpm: 104, bar: 8, lead: "marimba", lead2: "pluck", acc: "bounce", accI: "pluck", perc: 1,
      tags: ["any", "day"],
      A: { ch: "1 4 2 5", mel: "1 1 3 . 5 5 3 . | 4 . 6 . 1' . 6 . | 6 5 4 . 2 . 4 . | 5 . . . 7, . . ." },
      B: { ch: "6 3 4 5", mel: "3 . 1 . 6, . 1 . | 3 . 5 . 7 . 5 . | 4 . 6 . 1' . 4' . | 2' . . . 7 . 5 ." } },
    { id: "bigthought", title: "the big thought", root: 62, scale: "major", bpm: 68, bar: 8, lead: "piano", lead2: "flute", acc: "arp", accI: "piano", strings: 1, bellTop: 1,
      tags: ["late", "ending"],
      A: { ch: "1 5 6 3 4 1 4 5", mel: "3' . . . 2' . . . | 2' . . . 7 . . . | 1' . . . 6 . 1' . | 7 . . . 5 . . . | 6 . . . 1' . 6 . | 5 . . . 3 . 1 . | 2 . 4 . 6 . 1' . | 7 . . . . . . ." },
      B: { ch: "4 5 3 6 2 5 1 1", mel: "6 . 1' . 4' . 6' . | 5' . . . 2' . 7 . | 5 . 7 . 3' . 5' . | 3' . . . 1' . 6 . | 6 . 1' . 4' . 2' . | 7 . . . 2' . 5' . | 3' . . . 2' . 1' . | 1' . . . . . . ." } }
  ];
  // cues: music for one scene, never picked by the playlist or listed in the jukebox (v3.6: the ark battle)
  var CUES = [
    { id: "arkfight", title: "the ark falls", root: 69, scale: "minor", bpm: 148, bar: 8, lead: "synth", lead2: "brass", acc: "drive", accI: "pluck", drums: 1, strings: 1,
      tags: ["cue"],
      A: { ch: "1 6 3 5", mel: "1 . 1 5, 1 . 3 . | 3 . 1 . 6, . 1 . | 5 . 5 3 5 . 1' . | 7 . 5 . 2 . 5, ." },
      B: { ch: "4 6 5 5M", mel: "4 . 6 . 1' . 6 . | 3' . . 2' 1' . 6 . | 5 . 7 . 2' . 1' 7 | #7 . . . 5 . . ." } }
  ];
  M.CUES = CUES;
  var SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10] };
  var FORM = ["A", "A", "B", "A"];
  M.SONGS = SONGS;

  /* ---------------- reading the notation ---------------- */
  function degree(tok, scale) {
    var m = /^([#b]?)([1-7])([',]*)$/.exec(tok);
    if (!m) return null;
    var sc = SCALES[scale] || SCALES.major, d = +m[2] - 1, semi = sc[d];
    if (m[1] === "#") semi++; else if (m[1] === "b") semi--;
    for (var i = 0; i < m[3].length; i++) semi += m[3][i] === "'" ? 12 : -12;
    return semi;
  }
  // melody → [{step, len, semi}]
  function parseMel(str, scale) {
    var toks = str.split(/\s+/).filter(function (x) { return x && x !== "|"; }), out = [], cur = null;
    toks.forEach(function (tk, i) {
      if (tk === ".") { if (cur) cur.len++; return; }
      cur = null;
      if (tk === "-") return;
      var s = degree(tk, scale);
      if (s == null) return;
      cur = { step: i, len: 1, semi: s };
      out.push(cur);
    });
    return { notes: out, steps: toks.length };
  }
  // a chord token → semitones above the key root (root position, triad or seventh)
  function chord(tok, scale) {
    var sc = SCALES[scale] || SCALES.major, d = +tok[0] - 1, n = [];
    for (var k = 0; k < (/7/.test(tok) ? 4 : 3); k++) { var di = d + k * 2; n.push(sc[di % 7] + 12 * Math.floor(di / 7)); }
    if (/M/.test(tok)) n[1] = n[0] + 4;
    else if (/m/.test(tok)) n[1] = n[0] + 3;
    return n;
  }

  /* ---------------- building a performance ----------------
     every event: {t (s from the start), i (instrument), m (midi), d (seconds), v (velocity 0..1)} */
  function score(song) {
    var ev = [], step = 60 / song.bpm / 2, barLen = song.bar * step, t = 0;
    var secs = {}, keyRoot = song.root;
    ["A", "B"].forEach(function (k) {
      var s = song[k];
      secs[k] = { mel: parseMel(s.mel, song.scale), ch: s.ch.split(/\s+/).map(function (c) { return chord(c, song.scale); }) };
    });
    function hum() { return (Math.random() - 0.5) * 0.012; }
    function add(i, t2, m, d, v) { ev.push({ t: Math.max(0, t2 + hum()), i: i, m: m, d: d, v: v * (0.88 + Math.random() * 0.2) }); }
    function band(ch, t0, pass, last) {
      var bass = keyRoot - 24 + ch[0], tones = ch.map(function (x) { return keyRoot - 12 + x; }), n = song.bar, a = song.acc, I = song.accI, vA = pass ? 0.5 : 0.42;
      while (bass > keyRoot - 14) bass -= 12;
      if (a === "drive") {
        // action: a pumping eighth-note bass in octaves, and power stabs on the off-beats
        for (var s0 = 0; s0 < n; s0++) add("bass", t0 + s0 * step, bass + (s0 % 2 ? 12 : 0), step * 0.8, s0 % 4 ? 0.45 : 0.62);
        if (pass >= 0) [3, 6].forEach(function (s1) { tones.forEach(function (m, j) { add("brass", t0 + s1 * step + j * 0.004, m, step * 0.9, 0.3); }); });
      } else {
      // bass: the root on the downbeat, the fifth halfway in the faster songs
      add("bass", t0, bass, barLen * (song.bpm > 95 ? 0.45 : 0.9), 0.55);
      if (song.bpm > 95 && n === 8) add("bass", t0 + 4 * step, bass + 7, barLen * 0.4, 0.4);
      }
      if (song.drums) {
        // a big kit: kick on the beat, snare on two and four, hats on every step (the intro bars only tick)
        for (var d0 = 0; d0 < n; d0++) add("hat", t0 + d0 * step, 0, 0.04, d0 % 2 ? 0.3 : 0.5);
        if (pass >= 0) { [0, 2, 4, 6].forEach(function (d1) { add("kick", t0 + d1 * step, 0, 0.2, 0.9); }); [2, 6].forEach(function (d2) { add("snare", t0 + d2 * step, 0, 0.2, 0.7); }); if (last) add("crash", t0, 0, 1.5, 0.6); }
      }
      if (a === "arp") { var pat = [0, 2, 1, 2, 3, 2, 1, 2]; for (var s = 0; s < n; s++) add(I, t0 + s * step, [tones[0], tones[1], tones[2], tones[0] + 12][pat[s % 8]], step * 3, vA * (s === 0 ? 1 : 0.75)); }
      else if (a === "waltz") { [2, 4].forEach(function (s2) { tones.forEach(function (m, j) { add(I, t0 + s2 * step + j * 0.012, m + 12, step * 1.6, vA * 0.55); }); }); }
      else if (a === "jig") { [0, 3].forEach(function (s2) { tones.forEach(function (m, j) { add(I, t0 + s2 * step + j * 0.01, m + 12, step * 1.2, vA * (s2 ? 0.45 : 0.6)); }); }); }
      else if (a === "harp") { for (var s3 = 0; s3 < n; s3++) add(I, t0 + s3 * step, tones[s3 % 3] + (s3 >= n / 2 ? 12 : 0), step * 4, vA * 0.7); }
      else if (a === "strum") { [0, 4, 6].forEach(function (s4, k) { tones.concat([tones[0] + 12]).forEach(function (m, j) { add(I, t0 + s4 * step + j * 0.02, m + 12, step * 3, vA * (k === 0 ? 0.65 : 0.4)); }); }); }
      else if (a === "bounce") { [1, 3, 5, 7].forEach(function (s5) { tones.forEach(function (m, j) { add(I, t0 + s5 * step + j * 0.006, m + 12, step * 0.7, vA * 0.45); }); }); }
      else if (a === "block") { [0, 3, 6].forEach(function (s6, k) { tones.forEach(function (m, j) { add(I, t0 + s6 * step + j * 0.015, m + 12, step * (k === 2 ? 2 : 3), vA * (k ? 0.4 : 0.6)); }); }); }
      if (song.strings && (pass || last)) tones.forEach(function (m) { add("strings", t0, m + 12, barLen * 1.02, 0.32); });
      if (song.perc && pass >= 0) {
        for (var p = 0; p < n; p++) add("shaker", t0 + p * step, 0, 0.05, p % 2 ? 0.35 : 0.55);
        if (pass) { add("kick", t0, 0, 0.2, 0.5); if (n === 8) add("kick", t0 + 4 * step, 0, 0.2, 0.4); }
      }
    }
    // intro: two bars of the band on the first chord
    var first = secs.A.ch[0];
    band(first, t, -1); t += barLen; band(first, t, -1); t += barLen;
    for (var pass = 0; pass < 2; pass++) {
      FORM.forEach(function (k, fi) {
        var sec = secs[k], lead = pass ? song.lead2 : song.lead;
        sec.ch.forEach(function (ch, b) { band(ch, t + b * barLen, pass, false); });
        sec.mel.notes.forEach(function (nt) {
          var m = keyRoot + nt.semi, d = nt.len * step;
          add(lead, t + nt.step * step, m, d, 0.62);
          if (pass && k === "B") add("bell", t + nt.step * step, m + 12, d, 0.18); // a sparkle on the bridge
          if (pass && fi === 3 && song.bellTop) add("bell", t + nt.step * step, m + 12, d, 0.22);
          if (pass && k === "A" && fi > 0) {
            // a harmony a third (in the scale) underneath
            var bar = Math.floor(nt.step / song.bar), ch = sec.ch[bar] || sec.ch[0], best = null;
            ch.forEach(function (c) { for (var o = -24; o <= 12; o += 12) { var hm = keyRoot + c + o; if (hm < m - 2 && hm >= m - 9 && (best == null || hm > best)) best = hm; } });
            if (best != null) add(lead === "flute" ? "flute" : "piano", t + nt.step * step, best, d, 0.28);
          }
        });
        t += sec.ch.length * barLen;
      });
    }
    // outro: the home chord rings out with a music-box arpeggio
    var home = chord("1", song.scale);
    band(home, t, 0, true);
    home.concat([12, 16 - (song.scale === "major" ? 0 : 1)]).forEach(function (s7, j) { add("box", t + j * step, keyRoot + s7, barLen * 1.5, 0.4); });
    add("bass", t, keyRoot - 24, barLen * 2, 0.5);
    if (song.strings) home.forEach(function (m) { add("strings", t, keyRoot + m, barLen * 2.2, 0.3); });
    t += barLen * 2.5;
    ev.sort(function (a, b) { return a.t - b.t; });
    return { ev: ev, dur: t };
  }
  M._score = score; // for tests

  /* ---------------- instruments ---------------- */
  var ctx = null, bus = null, wet = null, dry = null, verb = null;
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function wire() {
    var o = SB.Audio && SB.Audio.musicOut && SB.Audio.musicOut();
    if (!o) return null;
    if (ctx === o.ac && bus) return ctx;
    ctx = o.ac;
    bus = ctx.createGain(); bus.gain.value = 0;
    dry = ctx.createGain(); dry.gain.value = 0.8;
    wet = ctx.createGain(); wet.gain.value = 0.42;
    // a soft hall: a stereo-ish impulse of decaying, darkened noise
    verb = ctx.createConvolver();
    var len = Math.floor(ctx.sampleRate * 2.6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = ir.getChannelData(ch), lp = 0;
      for (var i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, 2.6); }
    }
    verb.buffer = ir;
    var tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 5200;
    bus.connect(tone); tone.connect(dry); tone.connect(verb); verb.connect(wet);
    dry.connect(o.out); wet.connect(o.out);
    noiseBuf = o.noise;
    return ctx;
  }
  var noiseBuf = null;
  function env(g, t, a, v, dec, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + a);
    if (dec) g.gain.setTargetAtTime(v * dec[0], t + a, dec[1]);
    g.gain.setTargetAtTime(0.0001, end, 0.08);
  }
  function osc(type, f, t, end, out, det) {
    var o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (det) o.detune.value = det;
    o.connect(out); o.start(t); o.stop(end + 0.6); return o;
  }
  var INST = {
    box: function (t, f, d, v, out) { // music box: a sine with a bright, quick tine on top
      var g = ctx.createGain(); env(g, t, 0.004, v * 0.32, [0.0001, 0.55], t + Math.max(d, 1.4)); g.connect(out); osc("sine", f, t, t + 2, g);
      var g2 = ctx.createGain(); env(g2, t, 0.002, v * 0.07, [0.0001, 0.08], t + 0.3); g2.connect(out); osc("sine", f * 4, t, t + 0.4, g2);
    },
    bell: function (t, f, d, v, out) {
      var g = ctx.createGain(); env(g, t, 0.003, v * 0.2, [0.0001, 0.9], t + 2.4); g.connect(out); osc("sine", f, t, t + 2.6, g);
      var g2 = ctx.createGain(); env(g2, t, 0.002, v * 0.08, [0.0001, 0.3], t + 1); g2.connect(out); osc("sine", f * 2.76, t, t + 1.2, g2);
    },
    piano: function (t, f, d, v, out) { // soft felt piano: triangle through a closing lowpass
      var g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass";
      lp.frequency.setValueAtTime(Math.min(6000, f * 6), t); lp.frequency.setTargetAtTime(Math.min(2400, f * 2.2), t, 0.25);
      var end = t + Math.min(3.2, Math.max(0.35, d + 0.25));
      env(g, t, 0.006, v * 0.36, [0.25, 0.7], end); lp.connect(g); g.connect(out);
      osc("triangle", f, t, end, lp); osc("sine", f * 2, t, end, lp, 3);
    },
    epiano: function (t, f, d, v, out) {
      var g = ctx.createGain(), end = t + Math.min(3, d + 0.4); env(g, t, 0.005, v * 0.3, [0.35, 0.9], end); g.connect(out);
      osc("sine", f, t, end, g); var g2 = ctx.createGain(); env(g2, t, 0.003, v * 0.08, [0.0001, 0.2], t + 0.5); g2.connect(out); osc("sine", f * 7, t, t + 0.5, g2);
      var trem = ctx.createOscillator(), tg = ctx.createGain(); trem.frequency.value = 4.5; tg.gain.value = v * 0.06; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(end + 0.5);
    },
    flute: function (t, f, d, v, out) { // breathy, with vibrato that blooms on long notes
      var g = ctx.createGain(), end = t + d * 0.96 + 0.05; env(g, t, 0.07, v * 0.24, null, end); g.connect(out);
      var hg = ctx.createGain(); hg.gain.value = 0.12; hg.connect(g);
      var o = osc("sine", f, t, end, g); osc("triangle", f * 2, t, end, hg);
      if (d > 0.35) { var lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + 0.4); lfo.connect(lg); lg.connect(o.frequency); lfo.start(t); lfo.stop(end + 0.5); }
      if (noiseBuf) { var n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noiseBuf; bp.type = "bandpass"; bp.frequency.value = f * 2; bp.Q.value = 2; env(ng, t, 0.03, v * 0.05, [0.2, 0.1], end); n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, Math.random() * 0.5); n.stop(end + 0.3); }
    },
    pluck: function (t, f, d, v, out) { // a nylon-ish pluck
      var g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 2;
      lp.frequency.setValueAtTime(Math.min(7000, f * 8), t); lp.frequency.setTargetAtTime(f * 1.5, t, 0.09);
      var end = t + Math.min(1.6, d + 0.5); env(g, t, 0.003, v * 0.3, [0.0001, 0.45], end); lp.connect(g); g.connect(out); osc("sawtooth", f, t, end, lp);
    },
    marimba: function (t, f, d, v, out) {
      var g = ctx.createGain(); env(g, t, 0.003, v * 0.42, [0.0001, 0.16], t + 0.7); g.connect(out); osc("sine", f, t, t + 0.8, g);
      var g2 = ctx.createGain(); env(g2, t, 0.002, v * 0.08, [0.0001, 0.03], t + 0.1); g2.connect(out); osc("sine", f * 4, t, t + 0.15, g2);
    },
    strings: function (t, f, d, v, out) { // a slow, warm section pad
      var g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = Math.min(1800, f * 3);
      var end = t + d; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v * 0.07, t + Math.min(0.8, d * 0.4)); g.gain.setTargetAtTime(0.0001, end, 0.35);
      lp.connect(g); g.connect(out); osc("sawtooth", f, t, end + 1, lp, -7); osc("sawtooth", f, t, end + 1, lp, 7);
    },
    bass: function (t, f, d, v, out) {
      var g = ctx.createGain(), end = t + d; env(g, t, 0.01, v * 0.45, [0.5, 0.6], end); g.connect(out); osc("triangle", f, t, end, g); osc("sine", f, t, end, g);
    },
    shaker: function (t, f, d, v, out) {
      if (!noiseBuf) return;
      var n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuf; hp.type = "highpass"; hp.frequency.value = 7000;
      env(g, t, 0.004, v * 0.05, [0.0001, 0.02], t + 0.06); n.connect(hp); hp.connect(g); g.connect(out); n.start(t, Math.random() * 0.8); n.stop(t + 0.1);
    },
    synth: function (t, f, d, v, out) { // an 8-bit hero lead: two detuned squares through a bright filter
      var g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 3;
      lp.frequency.setValueAtTime(Math.min(8000, f * 7), t); lp.frequency.setTargetAtTime(Math.min(5000, f * 3.5), t, 0.12);
      var end = t + d * 0.95 + 0.03; env(g, t, 0.006, v * 0.15, [0.7, 0.3], end); lp.connect(g); g.connect(out);
      osc("square", f, t, end, lp, -6); osc("square", f, t, end, lp, 6);
    },
    brass: function (t, f, d, v, out) { // a swelling saw stab
      var g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 1.5;
      lp.frequency.setValueAtTime(f * 1.2, t); lp.frequency.linearRampToValueAtTime(Math.min(6000, f * 6), t + 0.06); lp.frequency.setTargetAtTime(f * 2, t + 0.08, 0.2);
      var end = t + d * 0.95 + 0.04; env(g, t, 0.02, v * 0.2, [0.6, 0.3], end); lp.connect(g); g.connect(out);
      osc("sawtooth", f, t, end, lp, -9); osc("sawtooth", f, t, end, lp, 9); osc("sawtooth", f / 2, t, end, lp);
    },
    snare: function (t, f, d, v, out) {
      var g = ctx.createGain(), o = ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      env(g, t, 0.002, v * 0.2, [0.0001, 0.05], t + 0.12); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.2);
      if (!noiseBuf) return;
      var n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(); n.buffer = noiseBuf; bp.type = "bandpass"; bp.frequency.value = 2600; bp.Q.value = 0.7;
      env(ng, t, 0.002, v * 0.32, [0.0001, 0.07], t + 0.2); n.connect(bp); bp.connect(ng); ng.connect(out); n.start(t, Math.random() * 0.8); n.stop(t + 0.25);
    },
    hat: function (t, f, d, v, out) {
      if (!noiseBuf) return;
      var n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuf; hp.type = "highpass"; hp.frequency.value = 9000;
      env(g, t, 0.002, v * 0.08, [0.0001, 0.015], t + 0.05); n.connect(hp); hp.connect(g); g.connect(out); n.start(t, Math.random() * 0.8); n.stop(t + 0.08);
    },
    crash: function (t, f, d, v, out) {
      if (!noiseBuf) return;
      var n = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain(); n.buffer = noiseBuf; n.loop = true; hp.type = "highpass"; hp.frequency.value = 5000;
      env(g, t, 0.003, v * 0.14, [0.0001, 0.5], t + d); n.connect(hp); hp.connect(g); g.connect(out); n.start(t, Math.random() * 0.5); n.stop(t + d + 0.5);
    },
    kick: function (t, f, d, v, out) {
      var g = ctx.createGain(), o = ctx.createOscillator(); o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      env(g, t, 0.003, v * 0.35, [0.0001, 0.06], t + 0.2); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
    }
  };

  /* ---------------- playback ---------------- */
  var LEVEL = 0.45, KEY = "smolbrains-music", HEARD = "smolbrains-heard";
  var vol = 0.8, heard = {};
  try { var sv = localStorage.getItem(KEY); if (sv != null) vol = Math.max(0, Math.min(1, +sv || 0)); heard = JSON.parse(localStorage.getItem(HEARD) || "{}") || {}; } catch (e) {}
  var cur = null, next = null, gapUntil = 0, recent = [], duck = 1, griefT = -1e9, timer = null, pinned = null;

  function stopCur(fade) {
    if (!cur) return;
    var c = cur; cur = null;
    if (ctx) { var t = ctx.currentTime; c.gain.gain.cancelScheduledValues(t); c.gain.gain.setValueAtTime(c.gain.gain.value, t); c.gain.gain.linearRampToValueAtTime(0.0001, t + (fade == null ? 3 : fade)); }
    setTimeout(function () { try { c.gain.disconnect(); } catch (e) {} }, ((fade == null ? 3 : fade) + 4) * 1000);
  }
  function start(song) {
    if (!wire()) return false;
    stopCur(2.5);
    var sc = score(song), g = ctx.createGain(); g.gain.value = 1; g.connect(bus);
    cur = { song: song, ev: sc.ev, dur: sc.dur, i: 0, t0: ctx.currentTime + 0.25, gain: g };
    recent.push(song.id); if (recent.length > 6) recent.shift();
    if (!heard[song.id]) { heard[song.id] = 1; try { localStorage.setItem(HEARD, JSON.stringify(heard)); } catch (e) {} }
    if (SB.bus) SB.bus.emit("song", { id: song.id, title: song.title });
    return true;
  }
  function pump() {
    if (!cur || !ctx) return;
    var now = ctx.currentTime, ahead = now + 0.5;
    while (cur.i < cur.ev.length && cur.t0 + cur.ev[cur.i].t < ahead) {
      var e = cur.ev[cur.i++], at = cur.t0 + e.t;
      if (at < now - 0.05) continue; // fell behind (tab was asleep): drop it rather than pile notes up
      try { INST[e.i](Math.max(now, at), hz(e.m), e.d, e.v, cur.gain); } catch (er) {}
    }
    if (now > cur.t0 + cur.dur) { cur = null; pinned = null; gapUntil = now + 20 + Math.random() * 40; }
  }

  // which songs fit right now
  function fits(song, game) {
    var w = game && game.world, tags = song.tags;
    if (!w) return tags.indexOf("title") >= 0;
    var season = SB.SEASONS[w.season], night = !!w.night, rain = w.weather ? w.weather.rain || 0 : 0;
    var grieving = (game.playTime || 0) - griefT < 240;
    if (tags.some(function (x) { return SB.SEASONS.indexOf(x) >= 0; }) && tags.indexOf(season) < 0) return false; // season-only songs
    if (tags.indexOf("day") >= 0 && night) return false;
    if (tags.indexOf("night") >= 0 && !night && !(tags.indexOf("grief") >= 0 && grieving)) return false;
    if (song.needRain && rain < 0.25) return false;
    if (tags.indexOf("late") >= 0 && !((game.stats && game.stats.maxTier) >= 5)) return false;
    return true;
  }
  function pick(game) {
    var w = game && game.world, rain = w && w.weather ? w.weather.rain || 0 : 0;
    var pool = SONGS.filter(function (s) { return fits(s, game) && recent.indexOf(s.id) < 0; });
    if (!pool.length) pool = SONGS.filter(function (s) { return fits(s, game); });
    if (!pool.length) return null;
    var tot = 0, wts = pool.map(function (s) {
      var k = 1;
      if (s.tags.some(function (x) { return SB.SEASONS.indexOf(x) >= 0; })) k *= 2.5; // the season's own songs come up most
      if (s.tags.indexOf("rain") >= 0 && rain > 0.25) k *= 3;
      if (s.tags.indexOf("grief") >= 0 && (game.playTime || 0) - griefT < 240) k *= 8;
      if (s.tags.indexOf("title") >= 0) k *= 0.5;
      tot += k; return k;
    });
    var r = Math.random() * tot;
    for (var i = 0; i < pool.length; i++) { r -= wts[i]; if (r <= 0) return pool[i]; }
    return pool[0];
  }

  function tick() {
    if (!wire()) return;
    var game = SB.Game && SB.Game.current, now = ctx.currentTime;
    // raids and storms pull the music right down, so the alarm and thunder carry the moment
    var inc = game && game.dir && game.dir.active, want = vol * (inc && (inc.id === "raid" || inc.id === "storm") ? 0.25 : 1) * (SB.Intro && SB.Intro.covering && (!cur || cur.song.id !== "smolbrains" && cur.song.id !== "bigthought" && cur.song.tags.indexOf("cue") < 0) ? 0 : 1);
    if (Math.abs(want - duck) > 0.001) { duck = want; bus.gain.setTargetAtTime(duck * LEVEL, now, 0.8); }
    if (vol <= 0) return;
    if (cur) return;
    if (next) { var n = next; next = null; start(n); return; }
    if (pinned) return; // a song picked from the jukebox plays once, then the island takes over again
    if (now < gapUntil || !game || !game.world || (SB.Intro && SB.Intro.covering)) return;
    var s = pick(game);
    if (s) start(s);
  }
  M.init = function () {
    if (timer) return;
    timer = setInterval(function () { try { tick(); pump(); } catch (e) {} }, 120);
    if (SB.bus) {
      SB.bus.on("death", function (e) {
        var c = e && e.c;
        if (!c || c.species === "grump" || c.stage === 0) return;
        griefT = (SB.Game.current && SB.Game.current.playTime) || 0;
      });
      SB.bus.on("season", function () { if (cur && !pinned) stopCur(6); gapUntil = ctx ? ctx.currentTime + 8 : 0; });
    }
  };
  // tests: play a whole song straight into a given (offline) context
  M._renderInto = function (ac, out, noise, song) {
    ctx = ac; noiseBuf = noise;
    var sc = score(song);
    sc.ev.forEach(function (e) { INST[e.i](e.t + 0.05, hz(e.m), e.d, e.v, out); });
    return sc.dur;
  };
  M._fits = fits; M._pick = pick; M._grief = function (t) { griefT = t; }; // for tests
  M.byId = function (id) { var all = SONGS.concat(CUES); for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; };
  // cue a song now (the title card, the ending, the jukebox)
  M.play = function (id, opts) {
    var s = M.byId(id);
    if (!s) return;
    pinned = opts && opts.pin ? id : null;
    if (!start(s)) next = s;
  };
  M.stop = function () { pinned = null; stopCur(2); if (ctx) gapUntil = ctx.currentTime + 30; };
  M.skip = function () { pinned = null; stopCur(1.5); gapUntil = 0; };
  M.now = function () { return cur ? cur.song : null; };
  M.heard = function (id) { return !!heard[id]; };
  M.volume = function () { return vol; };
  M.setVolume = function (v) {
    vol = Math.max(0, Math.min(1, v));
    try { localStorage.setItem(KEY, String(vol)); } catch (e) {}
    if (vol <= 0) stopCur(1);
  };
})();
