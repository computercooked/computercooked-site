/* 404 mini-game "catch the missing page" (docs/platform-api.md). Best in localStorage cc-404-best; no sound, nothing sent.
   Reduced motion: a static "click the 404 to fix it" joke. Without this file the box stays hidden. */
(function () {
  "use strict";
  var box = document.getElementById("lost-game");
  if (!box) return;
  var cv = box.querySelector("canvas"), msg = box.querySelector(".lost-game-msg"), btn = box.querySelector(".lost-game-btn");
  var hud = box.querySelector(".lost-game-hud"), head = box.querySelector("h2");
  if (!cv || !msg || !btn) return;
  box.hidden = false;

  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) {
    var JOKE = [["403", "fixed it. it's a 403 now. that's worse."], ["500", "it's a 500. the computer is not handling it well."],
      ["418", "it's a teapot now. nobody asked for this."], ["404", "back to 404. the computer has given up. try a game below."]];
    var n = 0;
    cv.hidden = true; if (hud) hud.hidden = true;
    if (head) head.textContent = "click the 404 to fix it";
    btn.textContent = "404"; btn.classList.add("lost-fix");
    msg.textContent = "the computer is ready to try.";
    btn.addEventListener("click", function () { var j = JOKE[n++ % JOKE.length]; btn.textContent = j[0]; msg.textContent = j[1]; });
    return;
  }

  var x = cv.getContext && cv.getContext("2d");
  if (!x) return;
  var W = cv.width, H = cv.height, ROUND = 20, GY = H - 24;
  var css = getComputedStyle(document.documentElement);
  var LIME = (css.getPropertyValue("--accent") || "").trim() || "#b8f23a";
  // 3x5 pixel digits
  var GLYPH = { 4: "101101111001001", 0: "111101101101111" };
  var best = 0;
  try { best = parseInt(localStorage.getItem("cc-404-best"), 10) || 0; } catch (e) {}
  var sEl = hud && hud.querySelector("[data-s]"), bEl = hud && hud.querySelector("[data-b]"), tEl = hud && hud.querySelector("[data-t]");
  var state = "idle", score, left, items, pops, gx = W / 2, tx = null, keyL = 0, keyR = 0, spawn, run, raf = 0, last = 0, shown = {};

  function set(el, k, v) { if (el && shown[k] !== v) { el.textContent = v; shown[k] = v; } }
  function hudUp() { set(sEl, "s", String(score || 0)); set(bEl, "b", String(best)); set(tEl, "t", String(Math.ceil(left == null ? ROUND : left))); }

  function px(c, a, b, w, h) { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), w, h); }
  function digit(d, a, b, c) {
    var g = GLYPH[d];
    for (var i = 0; i < 15; i++) if (g[i] === "1") px(c, a + (i % 3) * 3, b + Math.floor(i / 3) * 3, 3, 3);
  }
  function page(a, b) {
    px("#e8e4d8", a, b, 9, 12); px("#07080a", a + 6, b, 3, 3); px("#b9b3a2", a + 6, b + 3, 3, 1);
    px("#8d8878", a + 2, b + 5, 5, 1); px("#8d8878", a + 2, b + 7, 5, 1); px("#8d8878", a + 2, b + 9, 3, 1);
  }
  function bug(a, b, t) {
    var k = Math.floor(t * 8) % 2;
    px("#ff4d4d", a + 1, b + 2, 7, 7); px("#07080a", a + 2, b + 4, 1, 1); px("#07080a", a + 6, b + 4, 1, 1);
    px("#ff4d4d", a - 1, b + 3 + k, 2, 1); px("#ff4d4d", a + 8, b + 3 + k, 2, 1); px("#ff4d4d", a - 1, b + 7 - k, 2, 1); px("#ff4d4d", a + 8, b + 7 - k, 2, 1);
  }
  function gary(t, sad) {
    var a = Math.round(gx - 13), drip = Math.floor(t * 3) % 4;
    px("#d8c9a6", a, GY, 26, 18); px("#b9a985", a, GY + 15, 26, 3);
    px("#101a0c", a + 3, GY + 3, 20, 10);
    px(LIME, a + 7, GY + 6, 3, sad ? 2 : 3); px(LIME, a + 16, GY + 6, 3, sad ? 2 : 3);
    px(LIME, a + 10, GY + (sad ? 11 : 10), 6, 1);
    // melting
    px("#d8c9a6", a + 4, GY + 18, 3, 2 + drip); px("#d8c9a6", a + 18, GY + 18, 2, 1 + (drip + 2) % 4);
    px("#b9a985", a + 9, GY + 18, 8, 3);
  }
  function draw(t) {
    px("#07080a", 0, 0, W, H);
    for (var i = 0; i < W; i += 12) px("#11140f", i, H - 3, 6, 3);
    for (var j = 0; j < items.length; j++) {
      var o = items[j];
      if (o.k === 3) bug(o.x - 4, o.y, t);
      else if (o.k === 2) page(o.x - 4, o.y);
      else digit(o.k ? 0 : 4, o.x - 4, o.y, LIME);
    }
    gary(t, state === "over" && score < 5);
    x.font = "bold 9px monospace"; x.textAlign = "center";
    for (var p = 0; p < pops.length; p++) { x.fillStyle = pops[p].c; x.fillText(pops[p].s, pops[p].x, pops[p].y); }
  }

  function start() {
    score = 0; left = ROUND; items = []; pops = []; spawn = 0.3; run = 0; state = "play";
    window.ccGameActive = true;
    box.classList.add("is-on"); btn.hidden = true;
    msg.textContent = "catch the 4s, 0s and pages. not the bugs.";
    try { cv.focus({ preventScroll: true }); } catch (e) {}
    hudUp(); last = 0; loop(performance.now());
  }
  function end() {
    state = "over"; window.ccGameActive = false; box.classList.remove("is-on");
    var nb = score > best;
    if (nb) { best = score; try { localStorage.setItem("cc-404-best", String(best)); } catch (e) {} }
    msg.textContent = "your page is still lost. but you scored " + score + "." +
      (nb && score ? " new best. the computer is unreasonably proud." : score ? "" : " the computer is staring at the floor.");
    btn.textContent = "again"; btn.hidden = false; hudUp(); draw(run);
  }
  function step(dt) {
    run += dt; left -= dt;
    if (left <= 0) { left = 0; return end(); }
    if (keyL || keyR) { tx = null; gx += (keyR - keyL) * 150 * dt; }
    else if (tx != null) gx += (tx - gx) * Math.min(1, dt * 14);
    gx = Math.max(13, Math.min(W - 13, gx));
    spawn -= dt;
    if (spawn <= 0) {
      spawn = Math.max(0.28, 0.75 - run * 0.025) * (0.7 + Math.random() * 0.6);
      var r = Math.random();
      items.push({ x: 8 + Math.random() * (W - 16), y: -14, v: 42 + run * 3.5 + Math.random() * 24, k: r < 0.16 ? 3 : r < 0.42 ? 2 : r < 0.71 ? 1 : 0 });
    }
    for (var i = items.length - 1; i >= 0; i--) {
      var o = items[i];
      o.y += o.v * dt;
      if (o.y + 12 >= GY && o.y < GY + 8 && Math.abs(o.x - gx) < 16) {
        var bad = o.k === 3;
        score = Math.max(0, score + (bad ? -2 : 1));
        pops.push({ x: o.x, y: GY - 4, t: 0.6, s: bad ? "-2" : "+1", c: bad ? "#ff4d4d" : LIME });
        items.splice(i, 1);
      } else if (o.y > H) items.splice(i, 1);
    }
    for (var p = pops.length - 1; p >= 0; p--) { pops[p].t -= dt; pops[p].y -= 20 * dt; if (pops[p].t <= 0) pops.splice(p, 1); }
  }
  function loop(now) {
    raf = 0;
    if (state !== "play" || document.hidden) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; step(dt);
    if (state !== "play") return;
    draw(run); hudUp();
    raf = requestAnimationFrame(loop);
  }

  function aim(e) {
    var r = cv.getBoundingClientRect();
    if (r.width) tx = (e.clientX - r.left) / r.width * W;
  }
  cv.addEventListener("pointermove", aim);
  cv.addEventListener("pointerdown", function (e) { aim(e); if (state !== "play") start(); });
  cv.addEventListener("keydown", function (e) {
    var k = e.key, hit = true;
    if (k === "ArrowLeft") keyL = 1;
    else if (k === "ArrowRight") keyR = 1;
    else if ((k === " " || k === "Enter") && state !== "play") start();
    else hit = false;
    if (hit) { e.preventDefault(); e.stopPropagation(); }
  });
  cv.addEventListener("keyup", function (e) { if (e.key === "ArrowLeft") keyL = 0; if (e.key === "ArrowRight") keyR = 0; });
  cv.addEventListener("blur", function () { keyL = keyR = 0; });
  btn.addEventListener("click", start);
  document.addEventListener("visibilitychange", function () {
    if (state !== "play") return;
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; msg.textContent = "paused. the page is still lost."; }
    else if (!raf) { msg.textContent = "catch the 4s, 0s and pages. not the bugs."; last = 0; raf = requestAnimationFrame(loop); }
  });

  // idle screen: things mid-fall, the computer waiting
  items = [{ x: 40, y: 30, k: 0 }, { x: 70, y: 70, k: 1 }, { x: 100, y: 22, k: 0 }, { x: 170, y: 52, k: 2 }, { x: 205, y: 88, k: 3 }];
  pops = []; score = 0; hudUp(); draw(0);
})();
