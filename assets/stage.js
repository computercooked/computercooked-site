/* The stage: the cooked-CRT motion layer on every page except home (which has its own desk) and game players.
   Loaded by assets/deck.js once the page is idle, so it never competes with the first paint.
   - embers: a quarter-resolution pixel canvas behind the page. Embers drift up from the bottom edge, shy away from
     the pointer, and a click or tap throws a burst of sparks. 30 fps, stops while the tab is hidden.
   - phosphor: a soft lime glow that follows the pointer (one transformed div, compositor only).
   - rims: cards light the edge nearest the pointer (--mx / --my on the hovered card, deck.css draws it).
   - boot-in: cards and section heads below the fold power on as they scroll into view.
   Reduced motion: none of it runs; deck.css keeps the static scanlines and vignette. */
(function () {
  "use strict";
  var html = document.documentElement;
  if (html.classList.contains("cc-stage") || document.getElementById("desk")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  html.classList.add("cc-stage");

  var CARDS = ".game-card-inner, .card2, .feature-card, .lab-item > a, .lab-item > div, .cast-card, .about-card, " +
    ".support-card, .d3-card, .weekly-card, .continue-card, .soon-card, .spot-bezel, .poll-opt, .start-tile, .btn";
  var REVEAL = CARDS + ", .page-head, .section-label, .section-head, .shelf-head";
  var fine = matchMedia("(pointer: fine)").matches;

  // ---------------------------------------------------------------- embers
  var CELL = 4, cv = document.createElement("canvas"), ctx = cv.getContext("2d"), cols = 0, rows = 0;
  cv.className = "cc-embers"; cv.setAttribute("aria-hidden", "true");
  var glow = document.createElement("div");
  glow.className = "cc-phosphor"; glow.setAttribute("aria-hidden", "true");
  document.body.prepend(glow); document.body.prepend(cv);

  function size() {
    cols = Math.ceil(innerWidth / CELL); rows = Math.ceil(innerHeight / CELL);
    cv.width = cols; cv.height = rows;
  }
  size(); addEventListener("resize", size);

  // ember colours: hot orange → beige → lime phosphor → gone
  var RAMP = [[255, 150, 90], [255, 214, 120], [232, 217, 181], [184, 242, 58]];
  function tint(t, a) {
    var i = Math.min(RAMP.length - 2, Math.floor(t * (RAMP.length - 1))), k = t * (RAMP.length - 1) - i;
    var c = RAMP[i], d = RAMP[i + 1];
    return "rgba(" + (c[0] + (d[0] - c[0]) * k | 0) + "," + (c[1] + (d[1] - c[1]) * k | 0) + "," + (c[2] + (d[2] - c[2]) * k | 0) + "," + a.toFixed(3) + ")";
  }
  var embers = [], N = Math.round(Math.min(70, Math.max(24, innerWidth * innerHeight / 22000)));
  function spawn(x, y, burst) {
    return { x: x, y: y, vx: burst ? (Math.random() - .5) * 2.4 : (Math.random() - .5) * .15,
      vy: burst ? -Math.random() * 2.2 - .4 : -(.12 + Math.random() * .3), life: 0,
      max: burst ? 40 + Math.random() * 40 : 260 + Math.random() * 300, ph: Math.random() * 6.28, big: Math.random() < .3 };
  }
  for (var i = 0; i < N; i++) { var e = spawn(Math.random() * cols, Math.random() * rows, false); e.life = Math.random() * e.max; embers.push(e); }

  var px = -1e3, py = -1e3, gx = innerWidth / 2, gy = innerHeight / 2, tx = gx, ty = gy;
  addEventListener("pointermove", function (ev) { px = ev.clientX / CELL; py = ev.clientY / CELL; tx = ev.clientX; ty = ev.clientY; light(ev); }, { passive: true });
  addEventListener("pointerdown", function (ev) {
    for (var j = 0; j < 14; j++) embers.push(spawn(ev.clientX / CELL, ev.clientY / CELL, true));
  }, { passive: true });
  document.addEventListener("pointerleave", function () { px = py = -1e3; });

  var last = 0, run = true;
  document.addEventListener("visibilitychange", function () { run = !document.hidden; if (run) requestAnimationFrame(frame); });
  function frame(t) {
    if (!run) return;
    requestAnimationFrame(frame);
    if (t - last < 32) return;            // 30 fps is plenty for drifting pixels
    last = t;
    ctx.clearRect(0, 0, cols, rows);
    for (var i = embers.length - 1; i >= 0; i--) {
      var e = embers[i];
      e.life++; e.ph += .05;
      var dx = e.x - px, dy = e.y - py, d2 = dx * dx + dy * dy;
      if (d2 < 900) { var f = (900 - d2) / 900 * .35; e.vx += dx * f / 30; e.vy += dy * f / 30; }   // shy of the pointer
      e.vx *= .96; e.vy = e.vy * .985 - .004;
      e.x += e.vx + Math.sin(e.ph) * .12; e.y += e.vy;
      var t01 = e.life / e.max;
      if (t01 >= 1 || e.y < -2 || e.x < -4 || e.x > cols + 4) {
        if (embers.length > N) { embers.splice(i, 1); continue; }
        embers[i] = spawn(Math.random() * cols, rows + Math.random() * 6, false); continue;
      }
      var a = (t01 < .1 ? t01 / .1 : 1 - (t01 - .1) / .9) * .85;
      ctx.fillStyle = tint(t01, a);
      ctx.fillRect(e.x | 0, e.y | 0, 1, 1);
      if (e.big || e.max < 100) ctx.fillRect(e.x | 0, (e.y | 0) + 1, 1, 1);  // sparks and some embers are taller
    }
    // the phosphor glow eases after the pointer
    gx += (tx - gx) * .12; gy += (ty - gy) * .12;
    glow.style.transform = "translate3d(" + (gx | 0) + "px," + (gy | 0) + "px,0)";
  }
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- rims
  var lit = null;
  function light(ev) {
    if (!fine) return;
    var el = ev.target && ev.target.closest ? ev.target.closest(CARDS) : null;
    if (lit && lit !== el) lit.classList.remove("cc-lit");
    lit = el;
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (ev.clientX - r.left) + "px");
    el.style.setProperty("--my", (ev.clientY - r.top) + "px");
    el.classList.add("cc-lit");
  }

  // ---------------------------------------------------------------- boot-in
  // only what is still below the fold: nothing already on screen ever blinks out
  if (!("IntersectionObserver" in window)) return;
  var queue = [], flushing = false;
  var io = new IntersectionObserver(function (list) {
    list.forEach(function (en) { if (en.isIntersecting) { io.unobserve(en.target); queue.push(en.target); } });
    if (!flushing) { flushing = true; requestAnimationFrame(flush); }
  }, { rootMargin: "0px 0px -6% 0px" });
  function flush() {
    queue.forEach(function (el, k) {
      el.style.transitionDelay = Math.min(k, 8) * 55 + "ms";
      el.classList.add("cc-in");
      setTimeout(function () { el.classList.remove("cc-boot", "cc-in"); el.style.transitionDelay = ""; }, 700 + Math.min(k, 8) * 55);
    });
    queue = []; flushing = false;
  }
  function watch(root) {
    var vh = innerHeight;
    (root.querySelectorAll ? root.querySelectorAll(REVEAL) : []).forEach(function (el) {
      if (el.dataset.ccSeen) return;
      el.dataset.ccSeen = "1";
      if (el.getBoundingClientRect().top < vh) return;
      el.classList.add("cc-boot");
      io.observe(el);
    });
  }
  watch(document);
  // hub, lab and profile fill in cards after load
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) watch(n.parentNode || n); }); });
  }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
})();
