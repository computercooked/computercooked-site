/* Share-my-week card: a 1080x1920 (story-size) PNG of a weekly recap, made in the browser. me.js loads this when
   "share my week" is pressed and calls
     window.ccRecapCard(recap) -> Promise<Blob>
   recap: one week from GET /api/me/recap (runs, minutes, games, days, xp, top, bests, level, challenge, from, to,
   complete). Nothing is uploaded: the image is drawn here (same look as games/share-card.js) and goes only where the
   player sends it. No network but the logo, the mascot and the font. */
(function () {
  "use strict";
  var W = 1080, H = 1920;
  var C = { bg: "#101114", panel: "#17181d", line: "#2a2c33", lime: "#C5FF49", lilac: "#B59AFF", paper: "#F5F3ED", dim: "#a9a7a0" };
  var MONO = '"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace';
  var MON = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

  function load(src) {
    return new Promise(function (ok) {
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
  // largest font size (<= max, >= min) at which text fits in width; still too long at min: trimmed with "..."
  function fit(g, text, max, width, min) {
    var s = max, t = text;
    min = min || 24;
    for (; s > min; s -= 2) { g.font = "800 " + s + "px " + MONO; if (g.measureText(t).width <= width) return t; }
    g.font = "800 " + min + "px " + MONO;
    if (g.measureText(t).width <= width) return t;
    while (t.length > 4 && g.measureText(t + "...").width > width) t = t.slice(0, -1);
    return t.replace(/\s+$/, "") + "...";
  }
  function num(n) { return Math.round(n).toLocaleString("en-US"); }
  function day(d) { var t = new Date(d + "T00:00:00Z"); return MON[t.getUTCMonth()] + " " + t.getUTCDate(); }

  window.ccRecapCard = function (r) {
    var font = document.fonts && document.fonts.load ? document.fonts.load("800 80px \"JetBrains Mono\"").catch(function () {}) : Promise.resolve();
    var proud = (r.challenge && r.challenge.done) || r.bests_total > 0 || r.level.to > r.level.from;
    return Promise.all([load("/assets/logo.svg"), load("/assets/mascot/" + (proud ? "trophy" : "gamer") + ".png"), font]).then(function (res) {
      var logo = res[0], mascot = res[1];
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var g = cv.getContext("2d");
      g.textBaseline = "alphabetic";

      // background: the run card's dark, lime glow and grid floor
      g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
      var glow = g.createRadialGradient(W / 2, 640, 60, W / 2, 640, 900);
      glow.addColorStop(0, "rgba(197,255,73,0.18)"); glow.addColorStop(1, "rgba(197,255,73,0)");
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      g.strokeStyle = "rgba(181,154,255,0.10)"; g.lineWidth = 2;
      for (var x = 0; x <= W; x += 90) { g.beginPath(); g.moveTo(x, 1540); g.lineTo(W / 2 + (x - W / 2) * 2.2, H); g.stroke(); }
      for (var y = 1540; y < H; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }

      // header
      if (logo) g.drawImage(logo, 80, 90, 96, 96);
      g.fillStyle = C.lilac; g.font = "800 38px " + MONO; g.textAlign = "left";
      g.fillText("computer cooked games", 200, 152);
      if (mascot) { g.imageSmoothingEnabled = false; g.drawImage(mascot, W - 80 - 150, 46, 150, 174); g.imageSmoothingEnabled = true; }

      // "my week" + the dates
      g.textAlign = "center";
      g.fillStyle = C.lime; g.font = "800 112px " + MONO; g.fillText("my week", W / 2, 360);
      g.fillStyle = C.dim; g.font = "800 40px " + MONO;
      g.fillText(day(r.from) + " - " + day(r.to) + (r.complete ? "" : " (so far)"), W / 2, 430);

      // the big number: runs
      g.fillStyle = C.paper; g.font = "800 260px " + MONO;
      g.shadowColor = "rgba(197,255,73,0.45)"; g.shadowBlur = 40;
      var runs = fit(g, num(r.runs), 260, W - 200, 120);
      g.fillText(runs, W / 2, 680);
      g.shadowBlur = 0;
      g.fillStyle = C.dim; g.font = "800 44px " + MONO; g.fillText(r.runs === 1 ? "run" : "runs", W / 2, 750);

      // four tiles: minutes, games, days, xp
      var tiles = [[r.minutes < 1 ? "<1" : num(r.minutes), r.minutes === 1 ? "minute" : "minutes"], [num(r.games), r.games === 1 ? "game" : "games"],
        [r.days + "/7", "days played"], ["+" + num(r.xp), "xp"]];
      var tw = (W - 160 - 40) / 2, th = 170;
      tiles.forEach(function (t, i) {
        var tx = 80 + (i % 2) * (tw + 40), ty = 810 + Math.floor(i / 2) * (th + 30);
        round(g, tx, ty, tw, th, 28); g.fillStyle = C.panel; g.fill();
        g.lineWidth = 3; g.strokeStyle = C.line; g.stroke();
        g.fillStyle = i === 3 ? C.lime : C.paper; g.fillText(fit(g, t[0], 84, tw - 60, 40), tx + tw / 2, ty + 98);
        g.fillStyle = C.dim; g.font = "800 34px " + MONO; g.fillText(t[1], tx + tw / 2, ty + 146);
      });

      // highlights: the challenge, the best new best, a level up, the most played game (up to 4 lines)
      var lines = [];
      if (r.challenge && r.challenge.done) lines.push([C.lime, "weekly challenge done: " + r.challenge.title]);
      if (r.bests && r.bests[0]) {
        var b = r.bests[0];
        lines.push([C.paper, (b.prev === null ? "first score on " : "new best on ") + b.title + ": " + num(b.score)]);
        if (r.bests_total > 1) lines.push([C.dim, "+" + (r.bests_total - 1) + " more new " + (r.bests_total === 2 ? "best" : "bests")]);
      }
      if (r.level.to > r.level.from) lines.push([C.lilac, "level " + r.level.from + " -> " + r.level.to + ": " + r.level.title]);
      if (r.top) lines.push([C.paper, "most played: " + r.top.title]);
      g.textAlign = "left";
      lines.slice(0, 4).forEach(function (l, i) {
        var ly = 1250 + i * 78;
        g.fillStyle = l[0];
        g.beginPath(); g.arc(104, ly - 15, 10, 0, Math.PI * 2); g.fill();
        g.fillText(fit(g, l[1], 44, W - 210, 28), 136, ly);
      });

      // the ask
      g.textAlign = "center";
      g.fillStyle = C.paper; g.font = "800 84px " + MONO; g.fillText("your turn.", W / 2, 1660);
      g.fillStyle = C.lilac; g.font = "800 40px " + MONO; g.fillText("computercooked.com/games", W / 2, 1740);
      g.fillStyle = C.dim; g.font = "800 30px " + MONO;
      g.fillText("@computercooked · free · plays on your phone", W / 2, 1806);

      return new Promise(function (ok, bad) { cv.toBlob(function (bl) { bl ? ok(bl) : bad(new Error("no image")); }, "image/png"); });
    });
  };
})();
