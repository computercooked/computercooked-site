/* Share-your-run clip (K-0055): a 720x1280 (9:16) video of the last seconds of a run, made in the browser.
   platform.js keeps small JPEG frames of the game canvas while a run is on (10 a second, the last 8 s), and loads
   this file only after the run ends, then calls
     window.ccShareClip({ frames: [{ t, blob }], title, slug, score, best }) -> Promise<{ blob, type, ext } | null>
   The frames play back at their own pace inside the brand frame (title, score, mascot corner, computercooked.com,
   @computercooked), then a "can you beat me?" end card (1.5 s, longer so the clip is 5 s at least). Recorded with MediaRecorder from a canvas stream:
   webm where the browser records it, mp4 where only that works (Safari), null where neither does. Nothing leaves
   the device; no network but the mascot image. */
(function () {
  "use strict";
  var W = 720, H = 1280, FPS = 30, MAX_MS = 6500, END_MS = 1500, MIN_MS = 5000;
  var C = { bg: "#101114", panel: "#17181d", lime: "#C5FF49", lilac: "#B59AFF", paper: "#F5F3ED", dim: "#a9a7a0" };
  var MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

  function pickType() {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) return null;
    var types = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4;codecs=avc1", "video/mp4"];
    for (var i = 0; i < types.length; i++) { try { if (MediaRecorder.isTypeSupported(types[i])) return types[i]; } catch (e) {} }
    return null;
  }
  function load(src) {
    return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
  }
  function fit(g, text, max, width) {
    var s = max;
    for (; s > 16; s -= 2) { g.font = "800 " + s + "px " + MONO; if (g.measureText(text).width <= width) break; }
    return s;
  }
  function round(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString("en-US"); }
  // a frame that is all one dark colour (a WebGL canvas read at the wrong moment, or a blank screen)
  function blank(bmp) {
    try {
      var c = document.createElement("canvas"); c.width = 8; c.height = 8;
      var g = c.getContext("2d"); g.drawImage(bmp, 0, 0, 8, 8);
      var d = g.getImageData(0, 0, 8, 8).data, max = 0;
      for (var i = 0; i < d.length; i += 4) max = Math.max(max, d[i], d[i + 1], d[i + 2]);
      return max < 12;
    } catch (e) { return false; }
  }

  window.ccShareClip = function (o) {
    var type = pickType();
    var frames = (o.frames || []).slice();
    if (!type || frames.length < 15) return Promise.resolve(null);
    var last = frames[frames.length - 1].t;
    frames = frames.filter(function (f) { return f.t >= last - MAX_MS; });
    var font = document.fonts && document.fonts.load ? document.fonts.load("800 40px \"JetBrains Mono\"").catch(function () {}) : Promise.resolve();
    return Promise.all([
      Promise.all(frames.map(function (f) { return createImageBitmap(f.blob).catch(function () { return null; }); })),
      load("/assets/mascot/" + (o.best ? "trophy" : "happy") + ".png"), font
    ]).then(function (res) {
      var bmps = res[0], mascot = res[1];
      var shots = [];
      bmps.forEach(function (b, i) { if (b) shots.push({ t: frames[i].t - frames[0].t, b: b }); });
      if (shots.length < 15 || blank(shots[shots.length - 1].b) && blank(shots[0].b)) return null;
      var span = shots[shots.length - 1].t;

      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var g = cv.getContext("2d");
      var title = String(o.title || o.slug || ""), scored = o.score != null && isFinite(o.score);
      // the game window: the frames' own shape, as wide as fits, never taller than 720
      var fw = shots[0].b.width, fh = shots[0].b.height;
      var s = Math.min((W - 80) / fw, 720 / fh), gw = Math.round(fw * s), gh = Math.round(fh * s);
      // centred in the space between the header and the score, which sits right under it
      var gx = Math.round((W - gw) / 2), gy = Math.max(210, Math.round((210 + 1080 - gh - 160) / 2));

      function chrome() {
        g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
        var glow = g.createRadialGradient(W / 2, gy + gh / 2, 40, W / 2, gy + gh / 2, 700);
        glow.addColorStop(0, "rgba(197,255,73,0.16)"); glow.addColorStop(1, "rgba(197,255,73,0)");
        g.fillStyle = glow; g.fillRect(0, 0, W, H);
        g.textAlign = "left"; g.fillStyle = C.lilac; g.font = "800 26px " + MONO;
        g.fillText("computer cooked games", 40, 70);
        g.fillStyle = C.lime; fit(g, title, 64, W - 220); g.fillText(title, 40, 150);
        if (mascot) { g.imageSmoothingEnabled = false; g.drawImage(mascot, W - 40 - 120, 34, 120, 139); g.imageSmoothingEnabled = true; }
        g.textAlign = "center";
        g.fillStyle = C.paper; g.font = "800 34px " + MONO; g.fillText("computercooked.com", W / 2, H - 92);
        g.fillStyle = C.lilac; g.font = "800 28px " + MONO; g.fillText("@computercooked", W / 2, H - 46);
      }
      function scoreLine(big) {
        if (!scored) return;
        g.textAlign = "center"; g.fillStyle = C.dim; g.font = "800 28px " + MONO;
        g.fillText(o.best ? "new personal best" : "scored", W / 2, big ? 640 : gy + gh + 56);
        g.fillStyle = C.paper; fit(g, fmt(o.score), big ? 170 : 84, W - 80);
        g.shadowColor = "rgba(197,255,73,0.45)"; g.shadowBlur = 30;
        g.fillText(fmt(o.score), W / 2, big ? 800 : gy + gh + 140); g.shadowBlur = 0;
      }
      function frameAt(ms) {
        var i = 0;
        while (i + 1 < shots.length && shots[i + 1].t <= ms) i++;
        chrome();
        g.save(); round(g, gx, gy, gw, gh, 18); g.fillStyle = C.panel; g.fill(); g.clip();
        g.drawImage(shots[i].b, gx, gy, gw, gh); g.restore();
        g.lineWidth = 4; g.strokeStyle = C.lime; round(g, gx, gy, gw, gh, 18); g.stroke();
        scoreLine(false);
      }
      function endCard() {
        chrome();
        scoreLine(true);
        g.textAlign = "center"; g.fillStyle = C.lime; g.font = "800 60px " + MONO;
        g.fillText(scored ? "can you beat me?" : "come play.", W / 2, scored ? 960 : 700);
        g.fillStyle = C.dim; g.font = "800 26px " + MONO;
        g.fillText("free · no download · plays on your phone", W / 2, scored ? 1030 : 770);
      }

      return new Promise(function (ok) {
        var stream = cv.captureStream(FPS), chunks = [], rec;
        try { rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2500000 }); } catch (e) { return ok(null); }
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          bmps.forEach(function (b) { if (b && b.close) b.close(); });
          var mime = type.split(";")[0];
          ok(chunks.length ? { blob: new Blob(chunks, { type: mime }), type: mime, ext: mime === "video/mp4" ? "mp4" : "webm" } : null);
        };
        frameAt(0);
        rec.start(500);
        // a short run still makes a clip of 5 s at least: the end card stays up longer
        var t0 = performance.now(), total = Math.max(span + END_MS, MIN_MS);
        // a timer, not animation frames, so it keeps going if the tab is briefly hidden
        var tick = setInterval(function () {
          var ms = performance.now() - t0;
          if (ms >= total) { clearInterval(tick); try { rec.stop(); } catch (e) { ok(null); } return; }
          if (ms < span) frameAt(ms); else endCard();
        }, 1000 / FPS);
      });
    }).catch(function () { return null; });
  };
})();
