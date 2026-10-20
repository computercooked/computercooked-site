/* smol brains — audio.js
   All sound is synthesized with WebAudio (no files): little sfx, a music box, Animal-Crossing-style
   babble voices, and a very quiet ambience (birds by day, crickets by night, rain hiss).
   The AudioContext is created lazily on the first user gesture. Muted if the host page OR the
   player muted us; the player's choice persists in localStorage ("smolbrains-muted"). */
(function () {
  "use strict";
  var SB = (window.SB = window.SB || {});
  var A = (SB.Audio = {});

  var ac = null, master = null, sfxBus = null, voiceBus = null, ambBus = null, noiseBuf = null;
  var mutedHost = false, mutedUser = false, ambOn = true, hooked = false, busHooked = false;
  var MASTER = 0.5, KEY = "smolbrains-muted";
  var sfxEnds = [], voiceEnds = [], lastVoice = 0, lastByName = {}, musicUntil = 0;
  var MAX_SFX = 10, MAX_VOICES = 3;

  try { mutedUser = localStorage.getItem(KEY) === "1"; } catch (e) {}

  function muted() { return mutedHost || mutedUser; }
  function T() { return ac ? ac.currentTime : 0; }

  function ensure() {
    if (ac) { if (ac.state === "suspended" && !muted() && !document.hidden) ac.resume().catch(function () {}); return ac; }
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { ac = new Ctx(); } catch (e) { ac = null; return null; }
    master = ac.createGain(); master.gain.value = muted() ? 0 : MASTER;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ac.destination);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    voiceBus = ac.createGain(); voiceBus.gain.value = 0.75; voiceBus.connect(master);
    ambBus = ac.createGain(); ambBus.gain.value = 0.5; ambBus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    startAmbience();
    return ac;
  }

  A.init = function () {
    if (hooked) return;
    hooked = true;
    // every gesture may (re)start the context: browsers only allow that inside a user gesture
    var go = function () { ensure(); };
    window.addEventListener("pointerdown", go, true);
    window.addEventListener("keydown", go, true);
    window.addEventListener("touchend", go, true);
    document.addEventListener("visibilitychange", function () {
      if (!ac) return;
      if (document.hidden) ac.suspend().catch(function () {});
      else if (!muted()) ac.resume().catch(function () {});
    });
    hookBus();
  };

  function applyMute() {
    if (!ac) return;
    var t = T();
    master.gain.cancelScheduledValues(t);
    master.gain.setTargetAtTime(muted() ? 0 : MASTER, t, 0.05);
    if (muted()) { /* keep running briefly so the fade completes, then suspend */ setTimeout(function () { if (muted() && ac) ac.suspend().catch(function () {}); }, 250); }
    else if (!document.hidden) ac.resume().catch(function () {});
  }
  A.setMuted = function (m, source) {
    if (source === "host") mutedHost = !!m;
    else { mutedUser = !!m; try { localStorage.setItem(KEY, mutedUser ? "1" : "0"); } catch (e) {} }
    applyMute();
  };
  A.isMuted = function () { return muted(); };
  A.isUserMuted = function () { return mutedUser; };

  /* ---------------- voice management ---------------- */
  function prune(arr) { var t = T(); for (var i = arr.length - 1; i >= 0; i--) if (arr[i] < t) arr.splice(i, 1); }
  // never create the context here (that must happen in a gesture), just use it when it is live
  function live() { return !!ac && !muted() && ac.state === "running"; }
  function canPlay(dur) {
    if (!live()) return false;
    prune(sfxEnds);
    if (sfxEnds.length >= MAX_SFX) return false;
    sfxEnds.push(T() + dur);
    return true;
  }

  // one enveloped oscillator
  function tone(f, dur, o) {
    o = o || {};
    var t = T() + (o.delay || 0), osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + (o.slide || dur));
    if (o.detune) osc.detune.value = o.detune;
    var v = o.vol == null ? 0.3 : o.vol, a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = g;
    osc.connect(g);
    if (o.filter) { var bq = ac.createBiquadFilter(); bq.type = o.filter; bq.frequency.value = o.ff || 1200; bq.Q.value = o.q || 1; g.connect(bq); node = bq; }
    node.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
    return osc;
  }
  function noise(dur, o) {
    o = o || {};
    var t = T() + (o.delay || 0), src = ac.createBufferSource(), g = ac.createGain(), bq = ac.createBiquadFilter();
    src.buffer = noiseBuf; src.loop = dur > 0.9;
    src.playbackRate.value = o.rate || 1;
    bq.type = o.filter || "bandpass"; bq.frequency.setValueAtTime(o.ff || 2000, t); bq.Q.value = o.q || 1;
    if (o.fTo) bq.frequency.exponentialRampToValueAtTime(o.fTo, t + dur);
    var v = o.vol == null ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bq); bq.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }
  function note(n) { return 440 * Math.pow(2, (n - 69) / 12); } // midi -> Hz

  /* ---------------- sfx ---------------- */
  var SFX = {
    pop: function (v) { tone(500, 0.12, { to: 1100, slide: 0.06, vol: 0.28 * v, type: "sine" }); tone(1400, 0.05, { vol: 0.08 * v, type: "triangle", delay: 0.02 }); return 0.15; },
    click: function (v) { tone(1200, 0.04, { vol: 0.12 * v, type: "triangle" }); return 0.05; },
    hatch: function (v) {
      noise(0.08, { ff: 3000, q: 0.8, vol: 0.25 * v }); // crack
      [72, 76, 79, 84, 88].forEach(function (n, i) { tone(note(n), 0.25, { delay: 0.08 + i * 0.06, vol: 0.14 * v, type: "triangle" }); });
      tone(600, 0.14, { to: 1300, slide: 0.07, vol: 0.25 * v, delay: 0.42 });
      return 0.6;
    },
    eat: function (v) {
      for (var i = 0; i < 3; i++) noise(0.06, { delay: i * 0.13 + Math.random() * 0.03, ff: 1400 + Math.random() * 1200, q: 2, vol: 0.32 * v, filter: "bandpass" });
      tone(180, 0.08, { delay: 0.4, to: 120, vol: 0.12 * v }); // gulp
      return 0.5;
    },
    tickle: function (v) {
      for (var i = 0; i < 5; i++) { var f = 900 + Math.random() * 500 + i * 60; tone(f, 0.07, { delay: i * 0.075, to: f * 1.35, vol: 0.12 * v, type: "triangle" }); }
      return 0.45;
    },
    tap: function (v) { tone(220, 0.16, { to: 90, slide: 0.12, vol: 0.32 * v, type: "sine" }); noise(0.05, { ff: 800, vol: 0.15 * v, filter: "lowpass" }); tone(1800, 0.12, { delay: 0.03, vol: 0.05 * v, type: "triangle" }); return 0.2; },
    learn: function (v) { [79, 83, 86, 91].forEach(function (n, i) { tone(note(n), 0.28, { delay: i * 0.07, vol: 0.13 * v, type: "sine" }); tone(note(n + 12), 0.15, { delay: i * 0.07, vol: 0.04 * v, type: "triangle" }); }); return 0.6; },
    achievement: function (v) {
      var seq = [[72, 0], [76, 0.1], [79, 0.2], [84, 0.32], [79, 0.46], [84, 0.56]];
      seq.forEach(function (s) { tone(note(s[0]), 0.22, { delay: s[1], vol: 0.15 * v, type: "square", filter: "lowpass", ff: 2400 }); tone(note(s[0] - 12), 0.22, { delay: s[1], vol: 0.08 * v, type: "triangle" }); });
      return 0.85;
    },
    egg: function (v) { tone(note(84), 0.6, { vol: 0.12 * v }); tone(note(91), 0.5, { delay: 0.12, vol: 0.09 * v }); return 0.7; },
    grump: function (v) {
      tone(85, 0.6, { to: 60, vol: 0.22 * v, type: "sawtooth", filter: "lowpass", ff: 380, q: 4, attack: 0.05 });
      noise(0.5, { ff: 220, q: 3, vol: 0.12 * v, filter: "bandpass", attack: 0.06 });
      return 0.65;
    },
    thunder: function (v) {
      noise(2.2, { ff: 380, fTo: 70, q: 0.7, vol: 0.45 * v, filter: "lowpass", attack: 0.02, rate: 0.6 });
      noise(0.25, { ff: 1500, q: 0.5, vol: 0.18 * v, filter: "lowpass" });
      return 2.3;
    },
    boing: function (v) { tone(140, 0.45, { to: 520, slide: 0.18, vol: 0.25 * v, type: "triangle" }); tone(70, 0.3, { to: 260, slide: 0.15, vol: 0.12 * v }); return 0.5; },
    zap: function (v) { tone(1800, 0.3, { to: 200, slide: 0.28, vol: 0.12 * v, type: "sawtooth", filter: "bandpass", ff: 1500, q: 2 }); noise(0.25, { ff: 4000, q: 1, vol: 0.1 * v }); tone(300, 0.2, { to: 1600, delay: 0.25, vol: 0.12 * v, type: "square", filter: "lowpass", ff: 3000 }); return 0.5; },
    sad: function (v) { [76, 72, 69, 64].forEach(function (n, i) { tone(note(n), 0.5, { delay: i * 0.28, vol: 0.12 * v, type: "triangle", attack: 0.04 }); }); return 1.5; },
    sick: function (v) { tone(260, 0.4, { to: 110, slide: 0.35, vol: 0.18 * v, type: "sawtooth", filter: "lowpass", ff: 700, q: 6 }); noise(0.3, { delay: 0.05, ff: 500, q: 4, vol: 0.12 * v }); return 0.45; },
    whoosh: function (v) { noise(0.35, { ff: 600, fTo: 2500, q: 1.5, vol: 0.18 * v, attack: 0.08 }); return 0.4; },
    snore: function (v) { noise(0.9, { ff: 300, fTo: 180, q: 5, vol: 0.06 * v, attack: 0.3 }); tone(90, 0.8, { vol: 0.04 * v, type: "sawtooth", filter: "lowpass", ff: 300, attack: 0.3 }); return 1; },
    splash: function (v) { noise(0.35, { ff: 1800, fTo: 600, q: 0.8, vol: 0.2 * v }); return 0.4; },
    bonk: function (v) { return SFX.tap(v * 0.7); },
    eureka: function (v) {
      [72, 79, 84, 88, 91, 96].forEach(function (n, i) { tone(note(n), 0.5, { delay: i * 0.06, vol: 0.12 * v, type: "sine" }); tone(note(n + 7), 0.3, { delay: i * 0.06 + 0.03, vol: 0.04 * v, type: "triangle" }); });
      return 0.9;
    },
    tierup: function (v) {
      var seq = [[60, 0], [67, 0.12], [72, 0.24], [76, 0.36], [79, 0.48], [84, 0.64], [88, 0.8]];
      seq.forEach(function (s2) { tone(note(s2[0]), 0.5, { delay: s2[1], vol: 0.13 * v, type: "triangle" }); tone(note(s2[0] + 12), 0.3, { delay: s2[1], vol: 0.05 * v, type: "sine" }); });
      noise(1.2, { delay: 0.6, ff: 6000, fTo: 9000, q: 0.5, vol: 0.05 * v, attack: 0.3 });
      return 1.6;
    },
    craft: function (v) { for (var i = 0; i < 3; i++) { tone(700 + Math.random() * 300, 0.05, { delay: i * 0.12, vol: 0.12 * v, type: "triangle" }); noise(0.04, { delay: i * 0.12, ff: 2500, q: 2, vol: 0.12 * v, filter: "bandpass" }); } return 0.4; },
    build: function (v) { tone(160, 0.1, { to: 90, vol: 0.2 * v, type: "sine" }); noise(0.06, { ff: 900, q: 1.5, vol: 0.15 * v, filter: "bandpass" }); return 0.15; },
    built: function (v) { [67, 72, 76, 79].forEach(function (n, i) { tone(note(n), 0.35, { delay: i * 0.09, vol: 0.12 * v, type: "triangle" }); }); tone(110, 0.2, { vol: 0.2 * v, type: "sine" }); return 0.7; },
    magic: function (v) { for (var i = 0; i < 8; i++) tone(note(84 + [0, 4, 7, 11, 12, 16, 19, 24][i]), 0.3, { delay: i * 0.04, vol: 0.06 * v, type: "sine" }); noise(0.6, { ff: 5000, fTo: 2000, q: 1, vol: 0.06 * v, attack: 0.05 }); return 0.7; },
    chime: function (v) { tone(note(88), 0.8, { vol: 0.08 * v, type: "sine" }); tone(note(95), 0.6, { delay: 0.1, vol: 0.05 * v, type: "sine" }); return 0.9; },
    fire: function (v) { noise(0.5, { ff: 900, fTo: 300, q: 0.7, vol: 0.18 * v, attack: 0.02 }); tone(120, 0.3, { to: 60, vol: 0.12 * v }); return 0.5; },
    species: function (v) { tone(300, 0.25, { to: 900, slide: 0.2, vol: 0.15 * v, type: "sine" }); tone(450, 0.25, { delay: 0.12, to: 1300, slide: 0.2, vol: 0.12 * v, type: "sine" }); return 0.45; },
    music: function (v) {
      if (T() < musicUntil) return 0;
      // a little music-box tune: pentatonic, with a bell-ish partial
      var mel = [76, 79, 81, 84, 81, 79, 76, 74, 76, 79, 76, 72, 74, 76];
      var dur = [1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 1, 3], t = 0, b = 0.24;
      for (var i = 0; i < mel.length; i++) {
        tone(note(mel[i]), b * dur[i] + 0.4, { delay: t, vol: 0.11 * v, type: "sine" });
        tone(note(mel[i] + 19), 0.25, { delay: t, vol: 0.025 * v, type: "sine" });
        if (i % 4 === 0) tone(note(mel[i] - 24), 0.6, { delay: t, vol: 0.05 * v, type: "triangle" });
        t += b * dur[i];
      }
      musicUntil = T() + t;
      return t;
    }
  };
  var SFX_COOLDOWN = { eureka: 0.5, tierup: 2, craft: 0.3, build: 0.15, built: 1, magic: 0.3, chime: 0.4, fire: 1, species: 1, eat: 0.2, tickle: 0.25, tap: 0.12, learn: 0.3, egg: 0.5, grump: 1.5, thunder: 1, boing: 0.2, zap: 0.3, sad: 1, sick: 1, music: 0.5, snore: 2, splash: 0.3, pop: 0.05, click: 0.03 };

  A.play = function (name, opts) {
    var f = SFX[name];
    if (!f || !live()) return;
    var cd = SFX_COOLDOWN[name] || 0.05, t = T();
    if (lastByName[name] && t - lastByName[name] < cd) return;
    if (!canPlay(0.8)) return;
    lastByName[name] = t;
    try { var dur = f(opts && opts.vol != null ? opts.vol : 1); if (dur > 0.8) sfxEnds[sfxEnds.length - 1] = t + dur; } catch (e) {}
  };

  /* ---------------- babble voices ---------------- */
  var VOWEL = { a: [1, 800], e: [1.12, 1900], i: [1.26, 2600], o: [0.92, 600], u: [0.84, 450], y: [1.2, 2300] };
  function syllables(text) {
    var s = String(text || "").toLowerCase().replace(/[^a-z!?. ]/g, "");
    var out = [], m = s.match(/[^aeiouy !?.]*[aeiouy]+|[^ !?.]+/g) || [];
    for (var i = 0; i < m.length && out.length < 10; i++) {
      var vs = m[i].match(/[aeiouy]/), v = vs ? vs[0] : "a";
      out.push({ v: v, hard: /^[kptbdgcq]/.test(m[i]) });
    }
    if (!out.length) out.push({ v: "a", hard: false });
    return { syl: out, ask: /\?\s*$/.test(s), excl: /!\s*$/.test(s) };
  }
  A.voice = function (text, pitch) {
    if (!live()) return;
    var t = T();
    prune(voiceEnds);
    if (voiceEnds.length >= MAX_VOICES || t - lastVoice < 0.12) return;
    lastVoice = t;
    pitch = pitch == null ? 0.5 : pitch;
    var grump = pitch < 0;
    var base = grump ? 95 + (pitch + 1) * 60 : 300 + Math.max(0, Math.min(1, pitch)) * 500;
    var info = syllables(text), syl = info.syl, step = grump ? 0.12 : 0.085, len = grump ? 0.1 : 0.068;
    for (var i = 0; i < syl.length; i++) {
      var sv = VOWEL[syl[i].v] || VOWEL.a, last = i === syl.length - 1;
      var f = base * sv[0] * (0.94 + Math.random() * 0.12);
      if (last && info.ask) f *= 1.3; else if (last && info.excl) f *= 1.15; else if (last) f *= 0.92;
      var at = i * step;
      if (grump) {
        tone(f, len, { delay: at, to: f * 0.85, vol: 0.2, type: "sawtooth", filter: "lowpass", ff: sv[1] * 0.6, q: 3, bus: voiceBus });
        noise(len, { delay: at, ff: 300, q: 2, vol: 0.06, bus: voiceBus });
      } else {
        tone(f, len, { delay: at, to: f * (syl[i].hard ? 0.9 : 1.04), vol: 0.17, type: "triangle", filter: "bandpass", ff: sv[1], q: 1.2, bus: voiceBus });
        tone(f * 2, len * 0.8, { delay: at, vol: 0.03, type: "sine", bus: voiceBus });
      }
    }
    voiceEnds.push(t + syl.length * step + 0.1);
  };

  /* ---------------- ambience ---------------- */
  var ambTimer = null, rainSrc = null, rainGain = null;
  function startAmbience() {
    if (ambTimer || !ac) return;
    // soft rain bed (gain follows weather)
    rainSrc = ac.createBufferSource(); rainSrc.buffer = noiseBuf; rainSrc.loop = true;
    var bq = ac.createBiquadFilter(); bq.type = "lowpass"; bq.frequency.value = 1400;
    rainGain = ac.createGain(); rainGain.gain.value = 0;
    rainSrc.connect(bq); bq.connect(rainGain); rainGain.connect(ambBus); rainSrc.start();
    ambTimer = setInterval(ambTick, 1000);
  }
  var nextCritter = 3, crackleT = 0;
  function ambTick() {
    if (!ac || ac.state !== "running") return;
    var g = SB.Game && SB.Game.current, w = g && g.world;
    if (!w) return;
    var cam = SB.Render && SB.Render.camera;
    var rain = w.weather ? w.weather.rain || 0 : 0, zoomK = cam ? SB.clamp(1.4 - cam.zoom / 40, 0.2, 1) : 1;
    rainGain.gain.setTargetAtTime(ambOn ? 0.06 * rain * zoomK : 0, T(), 1.2);
    if (!ambOn) return;
    // fires crackle nearby
    if (cam && w.fires && w.fires.some(function (f) { return Math.abs(f.x - cam.x) < cam.halfW && Math.abs(f.z - cam.z) < cam.halfH * 1.5; })) {
      for (var c = 0; c < 4; c++) noise(0.02, { delay: Math.random() * 0.9, ff: 2500 + Math.random() * 2500, q: 3, vol: 0.03 * zoomK, filter: "bandpass", bus: ambBus });
    }
    nextCritter -= 1;
    if (nextCritter > 0) return;
    nextCritter = 3 + Math.random() * 6;
    var tday = (w.time / SB.DAY_LENGTH) % 1, night = tday < 0.18 || tday > 0.82;
    if (night) {
      if (w.season === 3) return;
      var f = 4200 + Math.random() * 600;
      for (var i = 0; i < 6; i++) tone(f, 0.035, { delay: i * 0.06 + (i > 2 ? 0.15 : 0), vol: 0.018 * zoomK, type: "sine", bus: ambBus });
    } else if (rain < 0.3) {
      var b = 2200 + Math.random() * 1400;
      tone(b, 0.09, { to: b * 1.4, vol: 0.025 * zoomK, type: "sine", bus: ambBus });
      tone(b * 1.1, 0.12, { delay: 0.14, to: b * 0.8, vol: 0.022 * zoomK, type: "sine", bus: ambBus });
      if (Math.random() < 0.5) tone(b * 1.2, 0.08, { delay: 0.32, to: b * 1.5, vol: 0.02 * zoomK, type: "sine", bus: ambBus });
    }
  }
  A.ambience = function (on) { ambOn = !!on; if (!ambOn && rainGain && ac) rainGain.gain.setTargetAtTime(0, T(), 0.3); };

  /* ---------------- bus ---------------- */
  // volume falloff for things off camera (silence when far)
  function near(c) {
    var cam = SB.Render && SB.Render.camera;
    if (!cam || !c || c.x == null || c.z == null) return 1;
    var dx = Math.abs(c.x - cam.x) - cam.halfW, dz = Math.abs(c.z - cam.z) - cam.halfH * 1.6;
    var d = Math.max(dx, dz);
    var zk = SB.clamp(1.5 - cam.zoom / 40, 0.15, 1);
    if (d <= 0) return zk;
    return d > 20 ? 0 : 0.35 * (1 - d / 20) * zk;
  }
  function at(name, c, base) { var v = near(c) * (base || 1); if (v > 0.03) A.play(name, { vol: v }); }
  function hookBus() {
    if (busHooked || !SB.bus) return;
    busHooked = true;
    var on = SB.bus.on;
    on("say", function (e) {
      if (!e || !e.c || near(e.c) < 1) return;
      var c = e.c, p;
      if (c.species === "grump") p = -0.5;
      else p = c.genome && c.genome.genes && c.genome.genes.voice != null ? c.genome.genes.voice : 0.5;
      if (c.stage === 0 && p >= 0) p = Math.min(1, p + 0.25);
      A.voice(e.text, p);
    });
    on("hatch", function (e) { at("hatch", e && e.c); });
    on("eat", function (e) { at("eat", e && e.c); });
    on("tickle", function () { A.play("tickle"); });
    on("tap", function () { A.play("tap"); });
    on("learnWord", function (e) { at("learn", e && e.c); });
    on("egg", function (e) { at("egg", e && e.obj); });
    on("achievement", function () { A.play("achievement"); });
    on("grumpArrive", function () { A.play("grump", { vol: 0.8 }); });
    on("thunder", function (e) { A.play("thunder", { vol: e && e.power != null ? 0.5 + 0.5 * e.power : 1 }); });
    on("death", function (e) { at("sad", e && e.c); });
    on("sick", function (e) { at("sick", e && e.c); });
    on("hit", function (e) { at("bonk", e && e.c, 0.8); });
    on("splash", function (e) { at("splash", e, 0.7); });
    on("eureka", function (e) { at("eureka", e && e.c, 1.2); });
    on("tierUp", function () { A.play("tierup"); });
    on("craft", function (e) { at("craft", e && e.c); });
    on("deliver", function (e) { at("build", e && e.c); });
    on("built", function (e) { at("built", e && e.st); });
    on("lightning", function (e) { at("zap", e, 0.8); setTimeout(function () { at("thunder", e, 1); }, 200); });
    on("wildfire", function (e) { at("fire", e && e.node); });
    on("fireLit", function (e) { at("fire", e && e.st, 0.6); });
    on("pray", function (e) { at("chime", e && e.c, 0.6); });
    on("prayerAnswered", function (e) { at("magic", e && e.c, 0.6); });
    on("miracle", function () { A.play("magic"); });
    on("newSpecies", function () { A.play("species"); });
    on("village", function () { A.play("achievement"); });
    on("ideaLost", function () { A.play("sad", { vol: 0.6 }); });
  }
  if (SB.bus) hookBus();
})();
