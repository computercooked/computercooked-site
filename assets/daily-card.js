/* Daily 3 result card (K-0032 phase three): a 1080x1080 image of today's three games, done or not, the streak and
   the computer. window.ccDailyCard({ games: [slugs], done: [slugs], streak, date }) -> Promise<Blob>.
   Everything is drawn here from the token palette and the games' own covers; nothing leaves the device. */
(function () {
  "use strict";
  var C = { bg: "#0E0F11", surface: "#17181C", s2: "#202228", line: "#2A2D34", text: "#F3F1EA", dim: "#A3A09A", accent: "#B8F23A", beige: "#E8D9B5", shade: "#C9B791" };
  var COMPUTER = [
    ".BBBBBBBBBBBBBBBBBB.", "BBBBBBBBBBBBBBBBBBBB", "BBKKKKKKKKKKKKKKKKBB", "BBKKKKKKKKKKKKKKKKBB",
    "BBKKAKKKKKKKKXKXKKBB", "BBKKKAKKKKKKKKXKKKBB", "BBKKAKKKKKKKKXKXKKBB", "BBKKKKKKKKKKKKKKKKBB",
    "BBKKKKKAAAAKKKKKKKBB", "BBKKKKKKKKKKKKKKKKBB", "BBBBBBBBBBBBBBBBBBBB", "ssssssssssssssssssss",
    "ssssssssssssssAsAsss", "........ssss........", "......ssssssss......"
  ];
  var PAL = { B: C.beige, s: C.shade, K: C.bg, A: C.accent, X: C.accent };
  var NAMES = { "crash-test-daily": "crash test", "desktop-jam": "desktop jam", "fathom": "fathom" };

  function sprite(ctx, rows, x, y, s) {
    rows.forEach(function (r, j) {
      for (var i = 0; i < r.length; i++) if (PAL[r[i]]) { ctx.fillStyle = PAL[r[i]]; ctx.fillRect(x + i * s, y + j * s, s, s); }
    });
  }
  function img(src) {
    return new Promise(function (ok) { var im = new Image(); im.onload = function () { ok(im); }; im.onerror = function () { ok(null); }; im.src = src; });
  }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }

  window.ccDailyCard = function (st) {
    var fonts = document.fonts ? Promise.all([document.fonts.load("600 64px 'Pixelify Sans'"), document.fonts.load("600 32px Inter"), document.fonts.load("800 40px 'JetBrains Mono'")]).catch(function () {}) : Promise.resolve();
    return Promise.all([fonts].concat(st.games.map(function (g) { return img("/games/" + g + "/cover.png"); }))).then(function (res) {
      var covers = res.slice(1), W = 1080, H = 1080;
      var cv = document.createElement("canvas"); cv.width = W; cv.height = H;
      var ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = C.surface; rr(ctx, 48, 48, W - 96, H - 96, 24); ctx.fill();
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; rr(ctx, 48, 48, W - 96, H - 96, 24); ctx.stroke();

      sprite(ctx, COMPUTER, 96, 104, 8);
      ctx.fillStyle = C.beige; ctx.font = "600 28px Inter"; ctx.textBaseline = "alphabetic";
      ctx.fillText("DAILY 3 · " + st.date.toUpperCase(), 296, 150);
      ctx.fillStyle = C.text; ctx.font = "600 72px 'Pixelify Sans', monospace";
      var done = st.done.length, all = done === st.games.length;
      ctx.fillText(all ? "all three done." : done + " of " + st.games.length + " done.", 296, 232);

      // the three games
      var tw = 280, th = 175, gap = 36, x0 = (W - (tw * 3 + gap * 2)) / 2, y0 = 360;
      st.games.forEach(function (g, i) {
        var x = x0 + i * (tw + gap), on = st.done.indexOf(g) >= 0;
        ctx.save(); rr(ctx, x, y0, tw, th, 12); ctx.clip();
        if (covers[i]) ctx.drawImage(covers[i], x, y0, tw, th); else { ctx.fillStyle = C.s2; ctx.fillRect(x, y0, tw, th); }
        if (!on) { ctx.fillStyle = "rgba(14,15,17,0.72)"; ctx.fillRect(x, y0, tw, th); }
        ctx.restore();
        ctx.strokeStyle = on ? C.accent : C.line; ctx.lineWidth = on ? 6 : 2; rr(ctx, x, y0, tw, th, 12); ctx.stroke();
        ctx.fillStyle = on ? C.text : C.dim; ctx.font = "600 30px Inter";
        ctx.fillText(NAMES[g] || g, x, y0 + th + 48);
        ctx.fillStyle = on ? C.accent : C.dim; ctx.font = "800 30px 'JetBrains Mono', monospace";
        ctx.fillText(on ? "done" : "not yet", x, y0 + th + 88);
      });

      // streak
      ctx.fillStyle = C.dim; ctx.font = "600 30px Inter"; ctx.fillText("streak", 96, 800);
      ctx.fillStyle = st.streak ? C.accent : C.text; ctx.font = "800 120px 'JetBrains Mono', monospace";
      ctx.fillText(String(st.streak), 96, 920);
      var sw = ctx.measureText(String(st.streak)).width;
      ctx.fillStyle = C.text; ctx.font = "600 40px Inter"; ctx.fillText(st.streak === 1 ? "day" : "days", 96 + sw + 20, 916);

      ctx.fillStyle = C.dim; ctx.font = "600 30px Inter"; ctx.textAlign = "right";
      ctx.fillText("computercooked.com/games/daily", W - 96, 916);
      ctx.textAlign = "left";
      return new Promise(function (ok) { cv.toBlob(ok, "image/png"); });
    });
  };
})();
