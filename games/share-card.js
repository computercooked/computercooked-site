/* Share-your-run card: a 1080x1920 (story-size) PNG of a run, for the share sheet, made in the browser.
   platform.js loads this after a run and calls
     window.ccShareCard({ title, slug, art, score, rank, best, prev }) -> Promise<Blob>
   score null/undefined: a "come play" card for a run with no score (no rank, no "beat me").
   art: same-origin image URL (the game's thumbnail). Everything else is drawn here; no network but the art + font. */
(function () {
  "use strict";
  var W = 1080, H = 1920;
  var C = { bg: "#101114", panel: "#17181d", line: "#2a2c33", lime: "#C5FF49", lilac: "#B59AFF", paper: "#F5F3ED", dim: "#a9a7a0" };
  var MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';

  function load(src) {
    return new Promise(function (ok) {
      if (!src) return ok(null);
      var i = new Image();
      i.onload = function () { ok(i); };
      i.onerror = function () { ok(null); };
      i.src = src;
    });
  }
  function round(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  // largest font size (<= max) at which text fits in width
  function fit(g, text, max, width, weight) {
    var s = max;
    for (; s > 20; s -= 4) { g.font = (weight || 800) + " " + s + "px " + MONO; if (g.measureText(text).width <= width) break; }
    return s;
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString("en-US"); }

  window.ccShareCard = function (o) {
    var font = document.fonts && document.fonts.load ? document.fonts.load("800 80px \"JetBrains Mono\"").catch(function () {}) : Promise.resolve();
    return Promise.all([load(o.art), load("/assets/logo.svg"), font]).then(function (res) {
      var art = res[0], logo = res[1];
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var g = cv.getContext("2d");
      g.textBaseline = "alphabetic";

      // background: dark with a lime glow and a faint grid floor
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      var glow = g.createRadialGradient(W / 2, 760, 60, W / 2, 760, 900);
      glow.addColorStop(0, "rgba(197,255,73,0.20)"); glow.addColorStop(1, "rgba(197,255,73,0)");
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(181,154,255,0.10)"; g.lineWidth = 2;
      for (var x = 0; x <= W; x += 90) { g.beginPath(); g.moveTo(x, 1500); g.lineTo(W / 2 + (x - W / 2) * 2.2, H); g.stroke(); }
      for (var y = 1500; y < H; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

      // header
      if (logo) g.drawImage(logo, 80, 90, 96, 96);
      g.fillStyle = C.lilac; g.font = "800 38px " + MONO; g.textAlign = "left";
      g.fillText("computer cooked games", 200, 152);

      // game art in a rounded frame
      var ax = 90, ay = 250, aw = W - 180, ah = Math.round(aw * 0.75);
      g.save(); round(g, ax, ay, aw, ah, 36); g.fillStyle = C.panel; g.fill(); g.clip();
      if (art) {
        var s = Math.max(aw / art.width, ah / art.height), dw = art.width * s, dh = art.height * s;
        g.imageSmoothingEnabled = !/\.svg$/.test(o.art || "");
        g.drawImage(art, ax + (aw - dw) / 2, ay + (ah - dh) / 2, dw, dh);
      }
      g.restore();
      g.lineWidth = 6; g.strokeStyle = C.lime; round(g, ax, ay, aw, ah, 36); g.stroke();

      // title
      var title = String(o.title || o.slug || "");
      g.fillStyle = C.lime; g.textAlign = "center";
      fit(g, title, 96, W - 160); g.fillText(title, W / 2, ay + ah + 130);

      // the score (or, for a run with no score, an invite)
      var scored = o.score != null && isFinite(o.score);
      g.fillStyle = C.dim; g.font = "800 40px " + MONO; g.fillText(!scored ? "i just played this" : o.best ? "new personal best" : "i scored", W / 2, ay + ah + 230);
      var sc = scored ? fmt(o.score) : "your turn.";
      g.fillStyle = C.paper; fit(g, sc, 230, W - 160);
      g.shadowColor = "rgba(197,255,73,0.45)"; g.shadowBlur = 40;
      g.fillText(sc, W / 2, ay + ah + 440);
      g.shadowBlur = 0;

      // rank chip (+ previous best)
      var chip = scored && o.rank ? "#" + o.rank + " on the all-time board" : "";
      if (scored && o.best && o.prev != null) chip += (chip ? " · " : "") + "was " + fmt(o.prev);
      if (chip) {
        g.font = "800 40px " + MONO;
        var cw = Math.min(W - 160, g.measureText(chip).width + 70), cy = ay + ah + 500;
        round(g, (W - cw) / 2, cy, cw, 78, 39); g.fillStyle = C.lime; g.fill();
        g.fillStyle = C.bg; fit(g, chip, 40, cw - 60); g.fillText(chip, W / 2, cy + 53);
      }

      // the ask
      g.fillStyle = C.paper; g.font = "800 84px " + MONO;
      g.fillText(scored ? "can you beat me?" : "come play.", W / 2, 1640);
      g.fillStyle = C.lilac; var url = "computercooked.com/games/" + (o.slug || "");
      fit(g, url, 40, W - 160); g.fillText(url, W / 2, 1730);
      g.fillStyle = C.dim; g.font = "800 30px " + MONO;
      g.fillText("free · no download · plays on your phone", W / 2, 1800);

      return new Promise(function (ok, bad) { cv.toBlob(function (b) { b ? ok(b) : bad(new Error("no image")); }, "image/png"); });
    });
  };
})();
