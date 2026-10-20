/* CRASH — a Computer Cooked game.
   CRASH is a tired beige CRT computer. Dodge the falling tasks, grab coffee and fans
   to cool down. Max heat = cooked. Vanilla JS + canvas, no dependencies. */
(function () {
  "use strict";

  /* ---------- swappable art + audio ----------
     Pixel art and sounds live in /games/crash/assets/ (from the ccgames pack).
     Swap a file, or point a path somewhere else. Set any path to "" and the
     game falls back to its code-drawn sprite / WebAudio blip for that slot. */
  var A = "assets/";
  var SPRITES = {
    crash: A + "crash-spritesheet.png", // 3 frames of 128x128: idle, hit, cooked
    popup: A + "popup.png",             // task icons, 128x128
    update: A + "update.png",
    tabs: A + "tabs.png",
    email: A + "email.png",
    coffee: A + "coffee.png",           // pickups, 128x128
    fan: A + "fan.png"
  };
  var CRASH_FRAMES = { idle: 0, hit: 1, cooked: 2 }; // frame index in the sheet
  var SOUNDS = {
    music: A + "crash-loop.mp3",  // 62s seamless loop, loaded after the first tap
    hit: A + "hit.mp3",
    pickup: A + "pickup.mp3",
    cooked: A + "game-over.mp3"
  };
  var MUSIC_LOOP_SECONDS = 62;

  var W = 360, H = 560;           // logical playfield; scaled to fit the stage
  var FLOOR = H - 26;

  var TASKS = [
    "popup", "update 1 of 847", "47 tabs", "quick question?", "reply all",
    "captcha", "meeting 4:59pm", "low battery", "accept cookies?", "rate us ★★★★★",
    "new ai feature!", "re: re: re: fwd:", "still watching?", "restart required",
    "password expired", "1 new teams msg", "printer offline", "just circling back"
  ];
  var TASK_COLORS = ["#B59AFF", "#ff6b5b", "#5bc8ff", "#ffb84d", "#B59AFF", "#ff6b5b"];
  var ONE_LINERS = [
    "status: cooked",
    "thermal paste has left the chat",
    "fans: screaming. user: also screaming",
    "it's not a crash, it's a lifestyle",
    "should've closed a tab",
    "cpu temp: lava, basically",
    "we'll circle back. you won't.",
    "task failed successfully",
    "blue screen of emotional damage",
    "have you tried turning yourself off and on"
  ];

  /* ---------- dom ---------- */
  var stage = document.getElementById("stage");
  var player = document.getElementById("player");
  var canvas = document.getElementById("crash-canvas");
  var ctx = canvas.getContext("2d", { alpha: false });
  var ovTitle = document.getElementById("ov-title");
  var ovPause = document.getElementById("ov-pause");
  var ovOver = document.getElementById("ov-over");
  var btnMute = document.getElementById("btn-mute");
  var toastEl = document.getElementById("toast");
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- storage (always wrapped) ---------- */
  function load(k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode etc. */ } }

  var best = +load("cc-crash-best", 0) || 0;
  var bestTime = +load("cc-crash-best-time", 0) || 0;
  var muted = load("cc-crash-muted", "0") === "1";
  var extMuted = false; // host page mute (cc-mute postMessage); never persisted

  /* ---------- sprites ---------- */
  var img = {};
  Object.keys(SPRITES).forEach(function (k) {
    if (!SPRITES[k]) return;
    var i = new Image();
    i.onload = function () { img[k] = i; };
    i.src = SPRITES[k];
  });

  /* ---------- canvas sizing ---------- */
  var scale = 1, dpr = 1;
  function resize() {
    var r = stage.getBoundingClientRect();
    scale = Math.max(0.3, Math.min(r.width / W, r.height / H));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.style.width = Math.round(W * scale) + "px";
    canvas.style.height = Math.round(H * scale) + "px";
    canvas.width = Math.round(W * scale * dpr);
    canvas.height = Math.round(H * scale * dpr);
    makeScanlines();
    if (state !== "play") draw(0);
  }

  var scan = null;
  function makeScanlines() {
    var c = document.createElement("canvas");
    c.width = 1; c.height = 3;
    var x = c.getContext("2d");
    x.fillStyle = "rgba(0,0,0,0.28)";
    x.fillRect(0, 0, 1, 1);
    scan = ctx.createPattern(c, "repeat");
  }

  /* ---------- audio (procedural, WebAudio) ---------- */
  var ac = null, master = null;
  function audio() {
    if (ac) { if (ac.state === "suspended") ac.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = (muted || extMuted) ? 0 : 0.5;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.55;
    musicGain.connect(master);
    Object.keys(SOUNDS).forEach(function (k) {
      if (!SOUNDS[k]) return;
      fetch(SOUNDS[k])
        .then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(r.status); })
        .then(function (b) { return new Promise(function (ok, no) { ac.decodeAudioData(b, ok, no); }); })
        .then(function (buf) { bufs[k] = buf; if (k === "music" && state === "play") startMusic(); })
        .catch(function () { /* keep the procedural fallback */ });
    });
  }
  var musicGain = null, bufs = {}, musicSrc = null;
  function playBuf(k, vol) {
    if (!ac || muted || !bufs[k]) return false;
    var s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = bufs[k];
    g.gain.value = vol || 0.8;
    s.connect(g); g.connect(master);
    s.start();
    return true;
  }
  function startMusic() {
    if (!ac || !bufs.music || musicSrc) return;
    var b = bufs.music;
    musicSrc = ac.createBufferSource();
    musicSrc.buffer = b;
    musicSrc.loop = true;
    // loop exactly the 62s body; skips any encoder padding at either end
    var pad = Math.max(0, (b.duration - MUSIC_LOOP_SECONDS) / 2);
    musicSrc.loopStart = pad;
    musicSrc.loopEnd = Math.min(b.duration, pad + MUSIC_LOOP_SECONDS);
    musicGain.gain.cancelScheduledValues(ac.currentTime);
    musicGain.gain.setValueAtTime(0.55, ac.currentTime);
    musicSrc.connect(musicGain);
    musicSrc.start(0, pad);
  }
  function stopMusic(fade) {
    if (!musicSrc) return;
    var s = musicSrc;
    musicSrc = null;
    var end = ac.currentTime + (fade || 0.05);
    musicGain.gain.setValueAtTime(musicGain.gain.value, ac.currentTime);
    musicGain.gain.linearRampToValueAtTime(0.0001, end);
    s.stop(end + 0.02);
  }
  function tone(f1, f2, dur, type, vol, delay) {
    if (!ac || muted) return;
    var t = ac.currentTime + (delay || 0);
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  var noiseBuf = null;
  function noise(dur, vol) {
    if (!ac || muted) return;
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf;
    f.type = "lowpass"; f.frequency.value = 1800;
    g.gain.setValueAtTime(vol || 0.3, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(); s.stop(ac.currentTime + dur);
  }
  var sfx = {
    start: function () { tone(220, 880, 0.18, "square", 0.15); tone(440, 1320, 0.2, "square", 0.1, 0.12); },
    hit: function () { if (!playBuf("hit", 0.9)) { noise(0.25, 0.35); tone(160, 50, 0.25, "sawtooth", 0.25); } },
    coffee: function () { if (!playBuf("pickup", 0.7)) { tone(520, 1040, 0.09, "square", 0.14); tone(780, 1560, 0.1, "square", 0.1, 0.07); } },
    fan: function () { if (!playBuf("pickup", 0.7)) { tone(300, 1200, 0.25, "triangle", 0.2); noise(0.2, 0.08); } else tone(300, 900, 0.2, "triangle", 0.08); },
    warn: function () { tone(880, 880, 0.06, "square", 0.08); },
    cooked: function () { stopMusic(0.4); if (!playBuf("cooked", 0.9)) { noise(0.6, 0.4); tone(400, 40, 1.1, "sawtooth", 0.3); tone(300, 30, 1.2, "square", 0.15, 0.1); } }
  };
  function setMuted(m) {
    muted = m;
    save("cc-crash-muted", m ? "1" : "0");
    if (master) master.gain.value = (m || extMuted) ? 0 : 0.5;
    if (!btnMute) return;
    btnMute.setAttribute("aria-pressed", String(m));
    btnMute.querySelector(".tool-text").textContent = m ? "sound off" : "sound on";
    btnMute.querySelector(".ico-on").style.display = m ? "none" : "";
    btnMute.querySelector(".ico-off").style.display = m ? "" : "none";
  }

  /* ---------- game state ---------- */
  var state = "title"; // title | play | paused | cooking | over
  var t, heat, score, pickups, hits, spawnT, pickT, warnT, cookT;
  var shake, glitch, flash;
  var crash = { x: W / 2, y: FLOOR, vx: 0, w: 64, h: 56, tilt: 0, step: 0, squash: 0, hurt: 0 };
  var tasks = [], items = [], parts = [], floats = [];
  var keys = { left: false, right: false };
  var pointerX = null;

  function reset() {
    t = 0; heat = 8; score = 0; pickups = 0; hits = 0;
    spawnT = 0.6; pickT = 2.2; warnT = 0; cookT = 0;
    shake = 0; glitch = 0; flash = 0;
    crash.x = W / 2; crash.vx = 0; crash.tilt = 0; crash.squash = 0; crash.hurt = 0;
    tasks.length = 0; items.length = 0; parts.length = 0; floats.length = 0;
  }

  function setState(s) {
    state = s;
    window.ccGameActive = s === "play";
    ovTitle.hidden = s !== "title";
    ovPause.hidden = s !== "paused";
    ovOver.hidden = s !== "over";
    if (s === "play") canvas.focus({ preventScroll: true });
  }

  function start() {
    audio();
    reset();
    setState("play");
    sfx.start();
    stopMusic();
    startMusic();
    last = performance.now();
    lastScoreSent = -1; scoreTick = 0;
    try { if (window.cc && cc.start) cc.start(); } catch (e) {}
  }

  function pause() {
    if (state !== "play") return;
    setState("paused");
    if (ac && ac.state === "running") ac.suspend();
  }
  function resume() { if (state === "paused") { audio(); setState("play"); last = performance.now(); } }

  /* ---------- spawning ---------- */
  ctx.font = "800 11px 'JetBrains Mono', monospace";
  function spawnTask() {
    var label = TASKS[(Math.random() * TASKS.length) | 0];
    ctx.font = "800 11px 'JetBrains Mono', monospace";
    var w = Math.max(64, Math.min(150, ctx.measureText(label).width + 22));
    var big = Math.random() < Math.min(0.25, t / 240);
    if (big) w = Math.min(190, w * 1.3);
    var h = big ? 50 : 40;
    var icon = iconFor(label);
    if (img[icon]) {
      // pixel icon on top, label pill underneath
      w = Math.max(big ? 60 : 48, Math.min(big ? 190 : 150, ctx.measureText(label).width + 14));
      h = big ? 66 : 56;
    }
    tasks.push({
      icon: icon, big: big,
      x: 8 + Math.random() * (W - w - 16), y: -h - 4, w: w, h: h,
      vy: 120 + t * 2.6 + Math.random() * 70,
      vx: Math.random() < 0.18 ? (Math.random() - 0.5) * 70 : 0,
      label: label, color: TASK_COLORS[(Math.random() * TASK_COLORS.length) | 0],
      rot: (Math.random() - 0.5) * 0.12
    });
  }
  function iconFor(label) {
    if (/update|restart|expired|battery|offline/.test(label)) return "update";
    if (/tab|watching|feature/.test(label)) return "tabs";
    if (/re:|reply|question|msg|meeting|circling/.test(label)) return "email";
    return "popup";
  }
  function spawnItem() {
    var fan = Math.random() < 0.3;
    items.push({ kind: fan ? "fan" : "coffee", x: 24 + Math.random() * (W - 48), y: -20, r: 15, vy: 130 + Math.random() * 40, spin: 0 });
  }

  function puff(x, y, n, color, speed, life) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, s = (0.3 + Math.random()) * speed;
      parts.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.4, life: life, max: life, color: color, size: 2 + Math.random() * 3 });
    }
  }
  function floatText(x, y, text, color) {
    floats.push({ x: x, y: y, text: text, color: color, life: 0.9 });
  }

  /* ---------- update ---------- */
  function hitbox() {
    return { x: crash.x - crash.w / 2 + 6, y: crash.y - crash.h + 6, w: crash.w - 12, h: crash.h - 8 };
  }
  function overlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  // live score to the platform, about once a second
  var lastScoreSent = -1, scoreTick = 0;
  function reportScore(dt) {
    scoreTick += dt;
    if (scoreTick < 1) return;
    scoreTick = 0;
    var s = Math.floor(score);
    if (s === lastScoreSent) return;
    lastScoreSent = s;
    try { if (window.cc && cc.score) cc.score(s); } catch (e) {}
  }

  function update(dt) {
    t += dt;

    // movement: pointer drag follows the finger, keys accelerate
    var ax = 0, maxV = 430;
    if (keys.left) ax -= 1;
    if (keys.right) ax += 1;
    if (ax) {
      crash.vx += ax * 2600 * dt;
    } else if (pointerX !== null) {
      var dx = pointerX - crash.x;
      crash.vx = Math.max(-maxV * 1.25, Math.min(maxV * 1.25, dx * 12));
    } else {
      crash.vx *= Math.pow(0.0008, dt);
    }
    if (ax) crash.vx = Math.max(-maxV, Math.min(maxV, crash.vx));
    crash.x += crash.vx * dt;
    var half = crash.w / 2;
    if (crash.x < half) { crash.x = half; crash.vx = 0; }
    if (crash.x > W - half) { crash.x = W - half; crash.vx = 0; }
    crash.tilt += ((crash.vx / maxV) * 0.16 - crash.tilt) * Math.min(1, dt * 12);
    crash.step += Math.abs(crash.vx) * dt * 0.06;
    crash.squash *= Math.pow(0.002, dt);
    crash.hurt = Math.max(0, crash.hurt - dt);

    // heat rises on its own, faster over time
    heat += (0.9 + t * 0.032) * dt;

    // spawns
    spawnT -= dt;
    if (spawnT <= 0) {
      spawnTask();
      if (t > 25 && Math.random() < Math.min(0.35, (t - 25) / 120)) spawnTask();
      spawnT = Math.max(0.3, 0.95 - t * 0.011) * (0.75 + Math.random() * 0.5);
    }
    pickT -= dt;
    if (pickT <= 0) { spawnItem(); pickT = 2.1 + Math.random() * 1.6; }

    var hb = hitbox();

    for (var i = tasks.length - 1; i >= 0; i--) {
      var k = tasks[i];
      k.y += k.vy * dt;
      k.x += k.vx * dt;
      if (k.x < 4 || k.x + k.w > W - 4) k.vx = -k.vx;
      if (crash.hurt <= 0 && overlap(hb, { x: k.x + 3, y: k.y + 3, w: k.w - 6, h: k.h - 6 })) {
        heat += k.big ? 22 : 15;
        hits++;
        crash.hurt = 0.45;
        crash.squash = 1;
        shake = Math.min(1, shake + 0.65);
        glitch = 0.32;
        flash = 0.25;
        puff(k.x + k.w / 2, k.y + k.h, 14, k.color, 160, 0.5);
        floatText(crash.x, crash.y - crash.h - 10, "+" + (k.big ? 22 : 15) + "°", "#ff6b5b");
        sfx.hit();
        if (navigator.vibrate && !reduceMotion && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) { try { navigator.vibrate(40); } catch (e) {} }
        tasks.splice(i, 1);
        continue;
      }
      if (k.y > H + 10) { tasks.splice(i, 1); score += 2; }
    }

    for (var j = items.length - 1; j >= 0; j--) {
      var it = items[j];
      it.y += it.vy * dt;
      it.spin += dt * (it.kind === "fan" ? 18 : 2);
      if (overlap(hb, { x: it.x - it.r, y: it.y - it.r, w: it.r * 2, h: it.r * 2 })) {
        var cool = it.kind === "fan" ? 24 : 11;
        heat -= cool;
        pickups++;
        score += it.kind === "fan" ? 40 : 25;
        puff(it.x, it.y, 10, it.kind === "fan" ? "#B59AFF" : "#C5FF49", 120, 0.45);
        floatText(it.x, it.y - 16, "-" + cool + "°", it.kind === "fan" ? "#B59AFF" : "#C5FF49");
        (it.kind === "fan" ? sfx.fan : sfx.coffee)();
        items.splice(j, 1);
        continue;
      }
      if (it.y > H + 20) items.splice(j, 1);
    }

    heat = Math.max(0, heat);
    score += dt * 10;

    // steam when hot
    if (heat > 60 && Math.random() < dt * (heat - 50) * 0.25) {
      parts.push({ x: crash.x + (Math.random() - 0.5) * 40, y: crash.y - crash.h, vx: (Math.random() - 0.5) * 20, vy: -40 - Math.random() * 40, life: 0.9, max: 0.9, color: "rgba(245,243,237,0.5)", size: 4 + Math.random() * 4, steam: true });
    }
    if (heat > 80) {
      warnT -= dt;
      if (warnT <= 0) { sfx.warn(); warnT = 0.5; }
    }

    if (heat >= 100) {
      heat = 100;
      state = "cooking";
      window.ccGameActive = false;
      cookT = 0;
      shake = 1;
      glitch = 1.2;
      sfx.cooked();
      puff(crash.x, crash.y - crash.h / 2, 40, "#ff6b5b", 220, 1);
    }
  }

  function updateFx(dt) {
    shake = Math.max(0, shake - dt * 2.2);
    glitch = Math.max(0, glitch - dt);
    flash = Math.max(0, flash - dt);
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (!p.steam) p.vy += 300 * dt;
      p.life -= dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
    for (var j = floats.length - 1; j >= 0; j--) {
      floats[j].y -= 40 * dt;
      floats[j].life -= dt;
      if (floats[j].life <= 0) floats.splice(j, 1);
    }
  }

  /* ---------- drawing ---------- */
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawBg(hot) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#101114");
    g.addColorStop(1, hot > 0.6 ? "rgb(" + (30 + hot * 40 | 0) + ",18,20)" : "#15161b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // desk grid
    ctx.strokeStyle = "rgba(197,255,73,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (var x = 0; x <= W; x += 30) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (var y = (t * 20) % 30; y <= H; y += 30) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    // desk
    ctx.fillStyle = "#22242b";
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    ctx.fillStyle = "#C5FF49";
    ctx.fillRect(0, FLOOR, W, 2);
  }

  function drawTask(k) {
    ctx.save();
    ctx.translate(k.x + k.w / 2, k.y + k.h / 2);
    ctx.rotate(k.rot);
    var x = -k.w / 2, y = -k.h / 2;
    var ic = img[k.icon];
    if (ic) {
      var is = k.h - 16;
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(-is / 2 + 4, y + 4, is, is);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(ic, -is / 2, y, is, is);
      ctx.fillStyle = k.color;
      rr(x, y + is - 2, k.w, 17, 5); ctx.fill();
      ctx.fillStyle = "#101114";
      ctx.font = "800 11px 'JetBrains Mono', monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(k.label, 0, y + is + 6.5);
      ctx.restore();
      return;
    }
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    rr(x + 4, y + 4, k.w, k.h, 6); ctx.fill();
    ctx.fillStyle = "#F5F3ED";
    rr(x, y, k.w, k.h, 6); ctx.fill();
    ctx.fillStyle = k.color;
    rr(x, y, k.w, 12, 6); ctx.fill();
    ctx.fillRect(x, y + 6, k.w, 6);
    // close "x"
    ctx.strokeStyle = "#101114"; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x + k.w - 10, y + 3); ctx.lineTo(x + k.w - 4, y + 9);
    ctx.moveTo(x + k.w - 4, y + 3); ctx.lineTo(x + k.w - 10, y + 9);
    ctx.stroke();
    ctx.fillStyle = "#101114";
    ctx.font = "800 11px 'JetBrains Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(k.label, 0, 6 + (k.h > 45 ? 2 : 0));
    ctx.restore();
  }

  function drawItem(it) {
    var s = img[it.kind];
    ctx.save();
    ctx.translate(it.x, it.y + Math.sin(t * 6 + it.x) * 1.5);
    // glow
    ctx.fillStyle = it.kind === "fan" ? "rgba(181,154,255,0.18)" : "rgba(197,255,73,0.18)";
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, Math.PI * 2); ctx.fill();
    if (s) {
      ctx.imageSmoothingEnabled = false;
      if (it.kind === "fan") ctx.rotate(Math.sin(it.spin * 0.5) * 0.25);
      ctx.drawImage(s, -19, -19, 38, 38);
    } else if (it.kind === "coffee") {
      ctx.fillStyle = "#C5FF49";
      rr(-10, -8, 18, 20, 3); ctx.fill();
      ctx.strokeStyle = "#C5FF49"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(9, 2, 5, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      ctx.fillStyle = "#101114"; ctx.fillRect(-8, -6, 14, 3);
      ctx.strokeStyle = "rgba(245,243,237,0.7)"; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -11); ctx.quadraticCurveTo(-7 + Math.sin(t * 8) * 2, -15, -4, -19);
      ctx.moveTo(2, -11); ctx.quadraticCurveTo(-1 + Math.sin(t * 8 + 1) * 2, -15, 2, -19);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "#B59AFF"; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.rotate(it.spin);
      ctx.fillStyle = "#B59AFF";
      for (var b = 0; b < 4; b++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(0, -6.5, 3.6, 6.5, 0.4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#101114";
      ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawCrash(melt) {
    var h = heat / 100;
    var sq = crash.squash * 0.18 + melt * 0.45;
    var bob = state === "play" ? Math.abs(Math.sin(crash.step)) * -3 : Math.sin(performance.now() / 500) * 1.5;
    ctx.save();
    ctx.translate(crash.x, crash.y + bob * (1 - melt));
    ctx.rotate(crash.tilt * (1 - melt));
    ctx.scale(1 + sq * 0.5, 1 - sq);
    var w = crash.w, bh = crash.h;
    var x = -w / 2, y = -bh;

    // shadow
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath(); ctx.ellipse(0, 1, w * 0.48, 5, 0, 0, Math.PI * 2); ctx.fill();

    if (img.crash) {
      var fr = (state === "cooking" || state === "over") ? CRASH_FRAMES.cooked : crash.hurt > 0 ? CRASH_FRAMES.hit : CRASH_FRAMES.idle;
      var fsz = img.crash.height, S = 84;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img.crash, fr * fsz, 0, fsz, fsz, -S / 2, -S + S * 0.1, S, S);
      // heat glow on the screen as it warms up
      if (h > 0.45) {
        ctx.fillStyle = "rgba(255,80,50," + ((h - 0.45) * 0.55).toFixed(3) + ")";
        ctx.fillRect(-S * 0.33, -S * 0.78, S * 0.62, S * 0.42);
      }
      if (h > 0.4) {
        var sy2 = (t * 60) % 18;
        ctx.fillStyle = "#5bc8ff";
        ctx.beginPath(); ctx.arc(-S * 0.42, -S * 0.7 + sy2, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      // feet
      var fs = Math.sin(crash.step * 2) * 3 * (1 - melt);
      ctx.fillStyle = "#bfb18c";
      ctx.fillRect(-18, -6 + Math.min(0, fs), 12, 6);
      ctx.fillRect(6, -6 + Math.min(0, -fs), 12, 6);
      // body
      var hurt = crash.hurt > 0 && ((crash.hurt * 20) | 0) % 2 === 0;
      ctx.fillStyle = hurt ? "#ff9b8f" : "#d8ccab";
      rr(x, y, w - 6, bh - 6, 9); ctx.fill();
      ctx.fillStyle = "#bfb18c";
      rr(x + w - 12, y + 6, 12, bh - 16, 5); ctx.fill();
      // screen: dark green -> angry red as it heats
      var r = (20 + h * 110) | 0, g = (40 - h * 22) | 0;
      ctx.fillStyle = "rgb(" + r + "," + g + ",24)";
      rr(x + 7, y + 7, w - 20, bh - 22, 6); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(x + 10, y + 9, w - 30, 4);
      // face
      var cx = x + 7 + (w - 20) / 2, cy = y + 7 + (bh - 22) / 2;
      ctx.fillStyle = ctx.strokeStyle = h > 0.75 ? "#ffd2c9" : "#C5FF49";
      ctx.lineWidth = 2.4;
      if (state === "cooking" || state === "over") {
        // x x
        ctx.beginPath();
        [-10, 10].forEach(function (ex) {
          ctx.moveTo(cx + ex - 4, cy - 7); ctx.lineTo(cx + ex + 4, cy + 1);
          ctx.moveTo(cx + ex + 4, cy - 7); ctx.lineTo(cx + ex - 4, cy + 1);
        });
        ctx.stroke();
      } else if (crash.hurt > 0 || h > 0.75) {
        // > <
        ctx.beginPath();
        ctx.moveTo(cx - 14, cy - 7); ctx.lineTo(cx - 7, cy - 3); ctx.lineTo(cx - 14, cy + 1);
        ctx.moveTo(cx + 14, cy - 7); ctx.lineTo(cx + 7, cy - 3); ctx.lineTo(cx + 14, cy + 1);
        ctx.stroke();
      } else {
        // tired half-closed eyes; blink now and then
        var blink = (performance.now() % 3400) < 120;
        var eh = blink ? 1 : 4 - h * 2;
        ctx.fillRect(cx - 14, cy - 4, 8, eh);
        ctx.fillRect(cx + 6, cy - 4, 8, eh);
        ctx.fillRect(cx - 15, cy - 6, 10, 1.5);
        ctx.fillRect(cx + 5, cy - 6, 10, 1.5);
      }
      // mouth: flat -> wobbly
      ctx.beginPath();
      if (h > 0.5 || state !== "play") {
        for (var i = 0; i <= 12; i++) {
          var mx = cx - 9 + i * 1.5, my = cy + 8 + Math.sin(i * 1.4 + t * 20) * (h > 0.5 ? 1.6 : 0.6);
          if (i) ctx.lineTo(mx, my); else ctx.moveTo(mx, my);
        }
      } else {
        ctx.moveTo(cx - 7, cy + 8); ctx.lineTo(cx + 7, cy + 8);
      }
      ctx.stroke();
      // power led
      ctx.fillStyle = h > 0.8 && ((t * 6) | 0) % 2 ? "#ff6b5b" : "#C5FF49";
      ctx.fillRect(x + 8, y + bh - 13, 6, 3);
      // sweat
      if (h > 0.4) {
        var sy = (t * 60) % 18;
        ctx.fillStyle = "#5bc8ff";
        ctx.beginPath(); ctx.arc(x + 3, y + 10 + sy, 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawHud() {
    var h = heat / 100;
    // heat meter
    var bx = 12, by = 12, bw = W - 24, bhh = 14;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    rr(bx, by, bw, bhh, 7); ctx.fill();
    var g = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    g.addColorStop(0, "#C5FF49"); g.addColorStop(0.55, "#ffb84d"); g.addColorStop(1, "#ff4b3b");
    ctx.fillStyle = g;
    ctx.save();
    rr(bx, by, bw, bhh, 7); ctx.clip();
    ctx.fillRect(bx, by, bw * h, bhh);
    ctx.restore();
    ctx.strokeStyle = h > 0.8 && ((t * 6) | 0) % 2 ? "#ff6b5b" : "#2c2f38";
    ctx.lineWidth = 2;
    rr(bx, by, bw, bhh, 7); ctx.stroke();
    ctx.font = "800 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#101114";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("HEAT " + Math.round(heat) + "°", bx + 7, by + bhh / 2 + 0.5);

    ctx.font = "800 15px 'JetBrains Mono', monospace";
    ctx.textBaseline = "top";
    ctx.fillStyle = "#F5F3ED";
    ctx.textAlign = "left";
    ctx.fillText(Math.floor(t) + "s", 12, 34);
    ctx.textAlign = "right";
    ctx.fillStyle = "#C5FF49";
    ctx.fillText(String(Math.floor(score)).padStart(5, "0"), W - 12, 34);
    ctx.font = "800 9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "#b9b7b0";
    ctx.fillText("BEST " + best, W - 12, 52);
    if (heat > 80 && ((t * 4) | 0) % 2 === 0) {
      ctx.textAlign = "center";
      ctx.font = "800 12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#ff6b5b";
      ctx.fillText("! CRITICAL TEMPS !", W / 2, 36);
    }
  }

  function draw(dt) {
    var hot = heat / 100;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var melt = state === "cooking" ? Math.min(1, cookT / 1.1) : state === "over" ? 1 : 0;

    ctx.save();
    if (shake > 0 && !reduceMotion) {
      var m = shake * shake * 10;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    drawBg(hot);
    for (var i = 0; i < items.length; i++) drawItem(items[i]);
    for (var j = 0; j < tasks.length; j++) drawTask(tasks[j]);
    drawCrash(melt);
    for (var p = 0; p < parts.length; p++) {
      var q = parts[p];
      ctx.globalAlpha = Math.max(0, q.life / q.max);
      ctx.fillStyle = q.color;
      if (q.steam) { ctx.beginPath(); ctx.arc(q.x, q.y, q.size * (1.6 - q.life / q.max), 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(q.x, q.y, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = "800 13px 'JetBrains Mono', monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (var f = 0; f < floats.length; f++) {
      ctx.globalAlpha = Math.min(1, floats[f].life * 2);
      ctx.fillStyle = floats[f].color;
      ctx.fillText(floats[f].text, floats[f].x, floats[f].y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    if (state !== "title") drawHud();

    // heat haze tint + cooking burn
    if (hot > 0.6) {
      ctx.fillStyle = "rgba(255,80,40," + ((hot - 0.6) * 0.25 + melt * 0.35).toFixed(3) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    if (flash > 0) {
      ctx.fillStyle = "rgba(255,107,91," + (flash * 1.2).toFixed(3) + ")";
      ctx.fillRect(0, 0, W, H);
    }

    // glitch: shift horizontal slices of the frame (device pixels)
    if (glitch > 0 && !reduceMotion) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      var cw = canvas.width, ch = canvas.height;
      var n = 3 + ((glitch * 8) | 0);
      for (var s = 0; s < n; s++) {
        var sy = (Math.random() * ch) | 0, sh = (4 + Math.random() * ch * 0.06) | 0;
        var off = ((Math.random() - 0.5) * 30 * dpr * scale) | 0;
        ctx.drawImage(canvas, 0, sy, cw, sh, off, sy, cw, sh);
      }
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(181,154,255,0.12)";
      ctx.fillRect(0, (Math.random() * ch) | 0, cw, (ch * 0.08) | 0);
      ctx.globalCompositeOperation = "source-over";
    }

    // CRT scanlines + vignette
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (scan) { ctx.fillStyle = scan; ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr); }
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    var v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  /* ---------- game over ---------- */
  function gameOver() {
    var secs = Math.floor(t);
    var final = Math.floor(score);
    var newBest = final > best;
    if (newBest) { best = final; save("cc-crash-best", String(best)); }
    if (secs > bestTime) { bestTime = secs; save("cc-crash-best-time", String(bestTime)); }
    document.getElementById("go-line").textContent = ONE_LINERS[(Math.random() * ONE_LINERS.length) | 0];
    document.getElementById("go-time").textContent = secs + "s";
    document.getElementById("go-score").textContent = final;
    document.getElementById("go-best").textContent = newBest ? "new best!" : "best " + best;
    document.getElementById("go-stats").textContent = hits + " tasks took the hit · " + pickups + " coffees & fans";
    document.getElementById("go-share-text").textContent = "i lasted " + secs + "s before getting cooked. computercooked.com/games";
    setState("over");
    document.getElementById("btn-again").focus({ preventScroll: true });

    var rankEl = document.getElementById("go-rank");
    rankEl.hidden = true;
    try {
      if (window.cc) {
        if (cc.event) cc.event("cooked", { hits: hits, pickups: pickups, secs: secs });
        var p = cc.end ? cc.end({ score: final, durationMs: Math.round(t * 1000), completed: true }) : null;
        if (p && p.then) p.then(function (r) {
          if (r && r.accepted && state === "over") {
            rankEl.textContent = "#" + r.rank + " on the all-time board as " + r.name;
            rankEl.hidden = false;
          }
        }, function () {});
      }
    } catch (e) {}
  }

  /* ---------- loop ---------- */
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === "play") { update(dt); if (state === "play") reportScore(dt); }
    if (state === "cooking") {
      cookT += dt;
      if (Math.random() < 0.5) puff(crash.x + (Math.random() - 0.5) * 50, crash.y - 30, 1, "#ff6b5b", 90, 0.6);
      if (cookT > 1.4) gameOver();
    }
    if (state !== "paused") updateFx(dt);
    if (state !== "paused" || dt === 0) draw(dt);
    requestAnimationFrame(frame);
  }

  /* ---------- input ---------- */
  function toLocalX(e) {
    var r = canvas.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * W;
  }
  stage.addEventListener("pointerdown", function (e) {
    if (e.target.closest(".overlay")) return;
    if (state === "title") { start(); }
    else if (state === "paused") { resume(); return; }
    if (state !== "play") return;
    pointerX = toLocalX(e);
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
  });
  stage.addEventListener("pointermove", function (e) {
    if (pointerX !== null) pointerX = toLocalX(e);
  });
  function release() { pointerX = null; }
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);

  var LEFT = { ArrowLeft: 1, a: 1, A: 1 }, RIGHT = { ArrowRight: 1, d: 1, D: 1 };
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var tg = e.target;
    if (tg && /^(input|textarea|select)$/i.test(tg.tagName)) return;
    if (document.querySelector("dialog[open]")) return;
    // a quick tap still nudges CRASH; holding accelerates
    if (LEFT[e.key]) { keys.left = true; if (state === "play") { e.preventDefault(); if (!e.repeat) crash.vx = Math.min(crash.vx, -260); } }
    else if (RIGHT[e.key]) { keys.right = true; if (state === "play") { e.preventDefault(); if (!e.repeat) crash.vx = Math.max(crash.vx, 260); } }
    else if (e.key === " " || e.key === "Enter") {
      if (tg && /^(button|a)$/i.test(tg.tagName) && tg !== canvas) return; // let buttons work
      if (state === "title" || state === "over") { e.preventDefault(); start(); }
      else if (state === "paused") { e.preventDefault(); resume(); }
      else if (state === "play" && e.key === " ") e.preventDefault();
    }
    else if (e.key === "p" || e.key === "P" || e.key === "Escape") {
      if (state === "play") pause(); else if (state === "paused") resume();
    }
    else if (e.key === "m" || e.key === "M") { audio(); setMuted(!muted); }
  });
  document.addEventListener("keyup", function (e) {
    if (LEFT[e.key]) keys.left = false;
    if (RIGHT[e.key]) keys.right = false;
  });

  document.addEventListener("visibilitychange", function () { if (document.hidden) pause(); });
  window.addEventListener("blur", function () { keys.left = keys.right = false; pause(); });
  document.addEventListener("cc:deck-open", pause);

  /* ---------- buttons ---------- */
  document.getElementById("btn-start").addEventListener("click", start);
  document.getElementById("btn-resume").addEventListener("click", resume);
  document.getElementById("btn-again").addEventListener("click", start);
  function on(id, fn) { var el = document.getElementById(id); if (el) el.addEventListener("click", fn); }
  on("btn-restart", start);
  on("btn-mute", function () { audio(); setMuted(!muted); });

  /* ---------- host page hooks (player frame) ---------- */
  window.addEventListener("message", function (e) {
    var d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "cc-mute") {
      extMuted = !!d.muted;
      if (master) master.gain.value = (muted || extMuted) ? 0 : 0.5;
    } else if (d.type === "cc-restart") {
      start();
    } else if (d.type === "cc-pause") {
      if (d.paused === false) resume(); else pause();
    }
  });

  // messages queue up (board rank, +xp, level up, achievements) instead of replacing each other
  var toastQ = [];
  function toast(msg) {
    if (toastQ.length < 5) toastQ.push(msg);
    if (!toast.t) nextToast();
  }
  function nextToast() {
    var msg = toastQ.shift();
    if (msg == null) { toastEl.classList.remove("show"); toast.t = null; return; }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    toast.t = setTimeout(nextToast, 2200);
  }
  window.ccToast = toast;

  var GAME_URL = "https://computercooked.com/games/crash/";
  function share(text) {
    if (navigator.share) {
      navigator.share({ title: "CRASH — Computer Cooked Games", text: text, url: GAME_URL }).catch(function () {});
      return;
    }
    var full = text.indexOf("computercooked.com") >= 0 ? text : text + " " + GAME_URL;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(full).then(function () { toast("copied. go brag."); }, function () { toast(full); });
    } else {
      toast(full);
    }
  }
  on("btn-share", function () {
    share("play CRASH, a game about a computer that is not handling it well.");
  });
  on("btn-share-score", function () {
    try { if (window.cc && cc.event) cc.event("share_clicked", { score: Math.floor(score) }); } catch (e) {}
    share(document.getElementById("go-share-text").textContent);
  });

  var btnFs = document.getElementById("btn-fs");
  if (btnFs) btnFs.addEventListener("click", function () {
    var real = document.fullscreenEnabled && player.requestFullscreen;
    if (real) {
      if (document.fullscreenElement) document.exitFullscreen();
      else player.requestFullscreen().catch(function () { player.classList.toggle("is-pseudo-fs"); resize(); });
    } else {
      player.classList.toggle("is-pseudo-fs");
      document.body.style.overflow = player.classList.contains("is-pseudo-fs") ? "hidden" : "";
      resize();
    }
  });
  document.addEventListener("fullscreenchange", function () {
    if (btnFs) btnFs.setAttribute("aria-pressed", String(!!document.fullscreenElement));
    setTimeout(resize, 50);
  });

  /* ---------- boot ---------- */
  document.getElementById("title-best").textContent = best ? "best: " + best + (bestTime ? " · " + bestTime + "s" : "") : "no high score yet. be the first casualty.";
  setMuted(muted);
  reset();
  heat = 30;
  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage);
  else window.addEventListener("resize", resize);
  resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { draw(0); });
  setState("title");
  requestAnimationFrame(frame);
})();
