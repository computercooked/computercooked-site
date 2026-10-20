// smol brains — the opening. Year 3127: the smol ark is caught by a grump warship, breaks apart, and its
// escape pods scatter. One falls toward an island no smol has ever seen. All pixel art drawn in code at
// 320×180, captions in smol-speak with subtitles, each word blipped by the smol voice. Tap to skip.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var IN = SB.Intro = {};
  var W = 320, H = 180;

  var LINES = [
    { at: 0.6, smol: "zo'mi tak… smol-ark nua vesh.", sub: "the year 3127. the smol ark carries the last smols, far from home." },
    { at: 6.2, smol: "GRUMPA! grumpa vesh!!", sub: "a grump warship found them." },
    { at: 11.4, smol: "pip-pods! pip-pods go go!", sub: "the ark is lost. its escape pods scatter into the dark." },
    { at: 16.4, smol: "nua… nua mola?", sub: "one pod falls toward a world no smol has ever seen." }
  ];
  var DUR = 22;
  // the ending: the spire's signal reaches the old ark, and it comes back for them
  var END = [
    { at: 0.6, smol: "brrrm… zo'mi tak. zo'mi TAK!", sub: "every smol mind on the island thinks one thought, all at once." },
    { at: 6.4, smol: "smol-ark? smol-ark nua!", sub: "far out in the dark, the old ark hears it. and turns around." },
    { at: 12.6, smol: "mola… mola nua.", sub: "some smols fly home. some stay. the island is theirs now." },
    { at: 18.6, smol: "vesh nua, pip.", sub: "you raised a civilisation, from one cold egg." }
  ];
  var END_DUR = 24;

  function rng(seed) { var s = seed >>> 0; return function () { s = (s + 0x6d2b79f5) >>> 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function ease(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }

  IN.play = function (opts) {
    opts = opts || {};
    var ending = opts.scene === "end", lines = ending ? END : LINES, dur = ending ? END_DUR : DUR;
    var root = document.getElementById("ui") || document.body;
    var wrap = document.createElement("div"); wrap.className = "intro live";
    var cv = document.createElement("canvas"); cv.width = W; cv.height = H; cv.className = "introcv";
    var cap = document.createElement("div"); cap.className = "introcap";
    var smolEl = document.createElement("div"); smolEl.className = "smol";
    var subEl = document.createElement("div"); subEl.className = "sub";
    cap.appendChild(smolEl); cap.appendChild(subEl);
    var skip = document.createElement("button"); skip.className = "introskip"; skip.textContent = "skip ▸";
    // a title card first: the tap that starts the story is also what lets the browser play sound
    var gate = document.createElement("div"); gate.className = "introgate";
    gate.innerHTML = '<h1>smol<br><span>brains</span></h1><p>▶ tap to begin</p>';
    wrap.appendChild(cv); wrap.appendChild(cap); wrap.appendChild(skip); wrap.appendChild(gate);
    root.appendChild(wrap);
    IN.covering = true;
    var started = false;
    gate.onclick = function (e) { e.stopPropagation(); if (started) return; started = true; gate.classList.add("out"); setTimeout(function () { gate.remove(); }, 600); t0 = performance.now(); requestAnimationFrame(frame); };
    var ctx = cv.getContext("2d");
    var r = rng(3127), stars = [];
    for (var i = 0; i < 140; i++) stars.push({ x: r() * W, y: r() * H, z: 0.2 + r() * r() * 1.6, c: r() < 0.1 ? "#b59aff" : r() < 0.2 ? "#ffd84a" : "#ffffff" });
    var bolts = [], bits = [], pods = [], t0 = performance.now(), done = false, lineI = -1, typed = 0, typeT = 0;
    var cur = null;

    function finish() {
      if (done) return;
      done = true;
      IN.covering = false;
      wrap.classList.add("out");
      setTimeout(function () { wrap.remove(); }, 700);
      document.removeEventListener("keydown", key, true);
      if (opts.done) opts.done();
    }
    function key(e) { if (e.key === "Escape" || e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); if (!started) gate.onclick(e); else finish(); } }
    skip.onclick = function (e) { e.stopPropagation(); finish(); };
    document.addEventListener("keydown", key, true);

    function px(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); }
    function oval(cx, cy, rx, ry, c) { ctx.fillStyle = c; for (var y = -ry; y <= ry; y++) { var hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry)))); ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2 + 1, 1); } }

    // the smol ark: round, friendly, teal with warm windows and a lime engine
    function ark(x, y, t, dmg) {
      oval(x, y, 38, 13, "#1a1222");
      oval(x, y, 37, 12, "#5fc9c0");
      oval(x + 4, y - 3, 30, 7, "#8fe6dc");
      oval(x + 8, y - 11, 12, 6, "#1a1222"); oval(x + 8, y - 11, 11, 5, "#c9f3ff"); px(x + 3, y - 14, 3, 2, "#ffffff");
      for (var i = 0; i < 7; i++) px(x - 22 + i * 8, y + 2, 3, 3, (i + Math.floor(t * 3)) % 5 === 0 ? "#fff6c0" : "#ffd84a");
      px(x - 30, y + 7, 60, 2, "#3f9a8f");
      var fl = 3 + Math.round(Math.sin(t * 30) * 1.5);
      px(x - 44 - fl, y - 3, 7 + fl, 7, "#c5ff49"); px(x - 41 - fl, y - 1, 5 + fl, 3, "#ffffff");
      if (dmg) for (var j = 0; j < dmg * 6; j++) { var a = j * 2.4; px(x + Math.cos(a) * 20 * (j % 3 + 1) / 3, y + Math.sin(a) * 8, 3, 2, j % 2 ? "#ff9f43" : "#3a2a33"); }
    }
    // the grump warship: jagged, purple, red eyes
    function warship(x, y, t) {
      ctx.fillStyle = "#1a1222";
      for (var i = 0; i < 46; i++) { var hh = Math.round(14 - Math.abs(i - 30) * 0.45 + (i % 6 < 2 ? 3 : 0)); ctx.fillRect(Math.round(x - 23 + i), Math.round(y - hh / 2 - 1), 1, hh + 2); }
      ctx.fillStyle = "#5a2d78";
      for (i = 0; i < 46; i++) { var h2 = Math.round(12 - Math.abs(i - 30) * 0.45 + (i % 6 < 2 ? 3 : 0)); ctx.fillRect(Math.round(x - 23 + i), Math.round(y - h2 / 2), 1, h2); }
      px(x - 20, y - 1, 38, 2, "#3a1d52");
      for (i = 0; i < 4; i++) px(x - 14 + i * 8, y - 4, 3, 2, Math.sin(t * 6 + i) > 0 ? "#ff3b4f" : "#b8233a");
      px(x + 12, y - 9, 6, 3, "#3a1d52"); px(x + 2, y + 6, 10, 3, "#3a1d52");
      for (i = 0; i < 3; i++) { px(x - 8 + i * 9, y - 11 - (i % 2) * 2, 1, 4, "#1a1222"); }
      var fl = 2 + Math.round(Math.sin(t * 25 + 1) * 1.5);
      px(x + 24, y - 2, 5 + fl, 4, "#ff6ff0");
    }
    var FIRE = ["#ffffff", "#ffd84a", "#ff9f43", "#ff4f5e", "#8fe6dc", "#3a2a33"], GLOW = ["#ffffff", "#ffd84a", "#c5ff49", "#e6dcff"];
    function boom(x, y, n, sz, pal) {
      pal = pal || FIRE;
      for (var i = 0; i < n; i++) { var a = r() * 6.283, s = (0.3 + r()) * sz; bits.push({ x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.6 + r() * 1.2, t: 0, c: pal[Math.floor(r() * pal.length)], w: r() < 0.2 ? 3 : r() < 0.5 ? 2 : 1 }); }
    }
    // the planet is painted once, big, into its own canvas; each frame just draws it at the right size
    var planetCv = null;
    function planet(cx, cy, R, t) {
      if (!planetCv) {
        var PR = 150; planetCv = document.createElement("canvas"); planetCv.width = planetCv.height = PR * 2 + 1;
        var keep = ctx; ctx = planetCv.getContext("2d"); paintPlanet(PR, PR, PR, 0); ctx = keep;
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(planetCv, Math.round(cx - R), Math.round(cy - R), R * 2 + 1, R * 2 + 1);
    }
    function paintPlanet(cx, cy, R, t) {
      for (var y = -R; y <= R; y++) {
        var hw = Math.round(R * Math.sqrt(Math.max(0, 1 - (y * y) / (R * R))));
        for (var x = -hw; x <= hw; x++) {
          var nx = x / R, ny = y / R;
          var u = nx * 3 + t * 0.05, v = ny * 3;
          var land = Math.sin(u * 1.7 + 1.3) * Math.cos(v * 1.9 - 0.4) + Math.sin(u * 3.1 + v * 2.3) * 0.5;
          var light = -nx * 0.6 - ny * 0.5 + 0.3;
          var c;
          if (land > 0.55) c = light > 0.3 ? "#9ee07a" : light > -0.2 ? "#6cc25a" : "#3f7a46";
          else if (land > 0.42) c = light > 0 ? "#f2dc9a" : "#b39a63";
          else c = light > 0.35 ? "#6fc8ff" : light > -0.2 ? "#3f8fe0" : "#24508f";
          if (Math.sin(u * 5 + v * 7 + t * 0.2) > 0.85 && (x + y) % 2 === 0) c = "#ffffff";
          if (nx * nx + ny * ny > 0.86 && light > -0.1) c = "#c8f0ff";
          ctx.fillStyle = c; ctx.fillRect(cx + x, cy + y, 1, 1);
        }
      }
    }

    // the ending, in three shots: the signal leaves the island, the ark comes back, pods rise to meet it
    var rise = [];
    function beam(x, y0, y1, t, wMax) {
      var w = Math.max(1, Math.round(wMax * (0.75 + Math.sin(t * 9) * 0.25)));
      px(x - w, y1, w * 2 + 1, y0 - y1, "#b59aff");
      px(x - Math.max(1, w >> 1), y1, Math.max(1, w >> 1) * 2 + 1, y0 - y1, "#e6dcff");
      px(x, y1, 1, y0 - y1, "#ffffff");
      for (var i = 0; i < 3; i++) { var ry = y0 - ((t * 120 + i * 60) % (y0 - y1)); px(x - w - 2, ry, w * 2 + 5, 2, "#ffffff"); }
    }
    function drawEnd(t, dt) {
      if (t < 6.4) {
        // the island from orbit, a light climbing out of it and up into the dark
        var R = 70, cx = W / 2, cy = H + 30;
        planet(cx, cy, R + Math.round(t * 2), t);
        var top = Math.round(cy - R - t * 2 - 2), grow = ease((t - 0.8) / 2.5);
        if (t > 0.8) beam(cx - 6, top, Math.round(top - grow * top), t, 3);
        if (t > 0.8 && t < 1.1) boom(cx - 6, top, 8, 40, GLOW);
        if (t > 3.4) { for (var i = 0; i < 4; i++) { var rr = ((t - 3.4) * 70 + i * 25) % 110; ctx.strokeStyle = "rgba(181,154,255," + Math.max(0, 1 - rr / 110) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx - 6, 0, rr, 0, 6.283); ctx.stroke(); } }
      } else if (t < 12.6) {
        // the old ark, patched up, comes about and races back
        var lt = t - 6.4, ax = -50 + ease(lt / 5) * 200, ay = 86 + Math.sin(t * 1.4) * 3;
        beam(W - 20, H, 0, t, 2);
        ark(ax, ay, t, 0);
        if (lt > 1 && lt < 1.3) boom(ax + 40, ay - 16, 5, 20, GLOW);
      } else {
        // home: the ark hangs over the island and pods climb up to it
        var lt2 = t - 12.6, R2 = 110, cx2 = W / 2 + 10, cy2 = H + 60;
        planet(cx2, cy2, R2, t);
        var ax2 = W / 2 + 10, ay2 = 34 + Math.sin(t * 1.2) * 2;
        ark(ax2, ay2, t, 0);
        if (lt2 < 6 && r() < 0.18) rise.push({ x: cx2 - 70 + r() * 140, y: cy2 - R2 + 18 + r() * 10, tx: ax2 + (r() - 0.5) * 30, ty: ay2 + 6, t: 0 });
        rise = rise.filter(function (p) { p.t += dt * 0.5; if (p.t >= 1) { boom(p.tx, p.ty, 3, 12, GLOW); return false; } var e = ease(p.t), x = p.x + (p.tx - p.x) * e, y = p.y + (p.ty - p.y) * e; px(x, y + 2, 1, 2, "#ffd84a"); px(x - 1, y, 3, 2, "#c5ff49"); return true; });
        if (lt2 > 6) { var a = Math.min(1, (lt2 - 6) * 0.7); ctx.fillStyle = "rgba(7,6,13," + a + ")"; ctx.fillRect(0, 0, W, H); if (a > 0.6) { ctx.fillStyle = "rgba(255,216,74," + (a - 0.6) * 2.5 + ")"; ctx.font = "bold 16px monospace"; ctx.textAlign = "center"; ctx.fillText("the end", W / 2, H / 2 - 20); ctx.font = "9px monospace"; ctx.fillStyle = "rgba(232,228,240," + (a - 0.6) * 2.5 + ")"; ctx.fillText("(of the beginning)", W / 2, H / 2 - 6); } }
      }
    }

    var lastF = 0;
    function frame() {
      if (done) return;
      try { draw(); } catch (e) { if (window.console) console.warn("[smol] intro", e); finish(); } // never leave the island hidden
    }
    function draw() {
      var now = performance.now(), t = (now - t0) / 1000;
      var dt = lastF ? Math.min(0.1, (now - lastF) / 1000) : 1 / 60; // real time, so slow devices keep pace
      lastF = now;
      if (t > dur) { finish(); return; }
      ctx.fillStyle = "#07060d"; ctx.fillRect(0, 0, W, H);
      var warp = ending ? (t > 6 && t < 12 ? 2.5 : 0.4) : t < 16 ? 1 : 1 + (t - 16) * 0.6;
      stars.forEach(function (s) {
        var x = ((s.x - t * 9 * s.z * warp) % W + W) % W;
        ctx.fillStyle = s.c; ctx.globalAlpha = Math.min(1, 0.35 + s.z * 0.5);
        ctx.fillRect(Math.round(x), Math.round(s.y), s.z > 1.2 ? 2 : 1, 1);
      });
      ctx.globalAlpha = 1;
      if (ending) drawEnd(t, dt);
      else if (t < 11.5) {
        // scene 1–2: the chase and the battle
        var ax = 110 + Math.sin(t * 0.8) * 6, ay = 92 + Math.sin(t * 1.3) * 4;
        var gx = 330 - ease(t / 4) * 90 + Math.sin(t * 0.7) * 5, gy = 70 + Math.cos(t * 1.1) * 5;
        if (t > 2 && r() < 0.12) bolts.push({ x: gx - 22, y: gy + (r() - 0.5) * 6, vx: -260, c: "#ff3b4f", hit: ax + 30 });
        if (t > 2.5 && t < 9 && r() < 0.06) bolts.push({ x: ax + 36, y: ay - 2, vx: 240, c: "#c5ff49", hit: gx - 18 });
        var hitBig = t > 8.2 && t < 8.4;
        if (hitBig && r() < 0.8) boom(ax + (r() - 0.5) * 50, ay + (r() - 0.5) * 16, 6, 60);
        if (t > 7.4 && t < 8.2) { var bw = Math.round((t - 7.4) * 30); px(ax + 30, gy + 6 + (ay - gy) * 0.5 - bw / 6, gx - ax - 50, Math.max(1, bw / 3), "#ff6ff0"); px(ax + 30, gy + 7 + (ay - gy) * 0.5 - bw / 6, gx - ax - 50, 1, "#ffffff"); }
        if (t < 9.6) ark(ax, ay, t, t > 8 ? Math.min(3, (t - 8) * 2) : 0);
        if (t > 9.4 && t < 9.7) boom(ax, ay, 40, 90);
        if (t > 9.6 && t < 9.65) { for (var p = 0; p < 7; p++) pods.push({ x: ax + (r() - 0.5) * 20, y: ay + (r() - 0.5) * 10, vx: -20 + r() * 50, vy: -30 + r() * 60, hero: p === 3 }); }
        warship(gx, gy, t);
        if (t > 9.6) { ctx.fillStyle = "rgba(255,255,255," + Math.max(0, 1 - (t - 9.6) * 2) + ")"; ctx.fillRect(0, 0, W, H); }
      } else if (t < 16) {
        // scene 3: pods scatter from the wreck
        var lt = t - 11.5;
        warship(330 - 90 + lt * 30, 70, t);
      } else {
        // scene 4: one pod falls toward the island world
        var pt = t - 16, R = Math.round(40 + ease(pt / 6) * 110);
        planet(Math.round(W / 2 + 20), Math.round(H + R * 0.55 - ease(pt / 6) * 40), R, t);
        var fx = W / 2 - 40 + pt * 18, fy = 30 + pt * 16;
        for (var k = 0; k < 14; k++) { px(fx - k * 2.2 - (k % 2), fy - k * 1.8, Math.max(1, 3 - k / 5), Math.max(1, 3 - k / 5), k < 3 ? "#ffffff" : k < 7 ? "#ffd84a" : "#ff9f43"); }
        px(fx, fy, 4, 3, "#1a1222"); px(fx + 1, fy, 2, 2, "#e8e4f0");
        if (pt > 5.2) { ctx.fillStyle = "rgba(255,255,255," + Math.min(1, (pt - 5.2) * 1.4) + ")"; ctx.fillRect(0, 0, W, H); }
      }
      // shared particles
      bolts = bolts.filter(function (b) { b.x += b.vx * dt; if ((b.vx < 0 && b.x < b.hit) || (b.vx > 0 && b.x > b.hit)) { boom(b.x, b.y, 4, 30); return false; } px(b.x, b.y, 6, 1, b.c); px(b.x + (b.vx < 0 ? 0 : 4), b.y, 2, 1, "#ffffff"); return true; });
      bits = bits.filter(function (b) { b.t += dt; b.x += b.vx * dt; b.y += b.vy * dt; b.vx *= 0.97; b.vy *= 0.97; if (b.t > b.life) return false; px(b.x, b.y, b.w, b.w, b.c); return true; });
      if (t > 9.6 && t < 16) pods.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; for (var k2 = 0; k2 < 5; k2++) px(p.x - p.vx * 0.02 * k2, p.y - p.vy * 0.02 * k2, 1, 1, k2 < 2 ? "#ffd84a" : "#ff9f43"); px(p.x, p.y, 3, 2, p.hero ? "#c5ff49" : "#e8e4f0"); });
      // captions: smol-speak typed out word by word (each word blipped), then the subtitle
      var li = -1;
      for (var q = 0; q < lines.length; q++) if (t >= lines[q].at) li = q;
      if (li !== lineI) { lineI = li; cur = lines[li]; typed = 0; typeT = 0; subEl.textContent = ""; smolEl.textContent = ""; cap.classList.toggle("on", !!cur); }
      if (cur) {
        var words = cur.smol.split(" ");
        var should = Math.min(words.length, Math.floor((t - cur.at) / 0.22) + 1);
        if (typed < should) {
          typed++;
          smolEl.textContent = words.slice(0, typed).join(" ");
          if (SB.Audio && SB.Audio.voice) SB.Audio.voice(words[typed - 1], /GRUMP/.test(words[typed - 1]) ? -0.4 : 0.55);
        }
        if (typed >= words.length && !subEl.textContent) subEl.textContent = cur.sub;
      }
      requestAnimationFrame(frame);
    }
    // draw one still frame of stars behind the title
    ctx.fillStyle = "#07060d"; ctx.fillRect(0, 0, W, H);
    stars.forEach(function (s) { ctx.fillStyle = s.c; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); });
    if (opts.noGate) gate.onclick({ stopPropagation: function () {} });
    return { skip: finish };
  };
})();
