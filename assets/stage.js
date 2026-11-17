/* The stage: the cooked-CRT motion layer on every page except game players. On home the embers only show below the
   desk (the desk paints its own background and effects); rims and boot-in work there like everywhere else.
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
  if (html.classList.contains("cc-stage")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  html.classList.add("cc-stage");

  var CARDS = ".game-card-inner, .card2, .feature-card, .lab-item > a, .lab-item > div, .cast-card, .about-card, " +
    ".support-card, .d3-card, .weekly-card, .continue-card, .soon-card, .spot-bezel, .poll-opt, .start-tile, .btn, .cc-next-card, .cc-level, .log-entry";
  var REVEAL = CARDS + ", .page-head, .section-label, .section-head, .shelf-head";
  var fine = matchMedia("(pointer: fine)").matches;

  // game pages: the game is the show. No embers or pointer glow there (they cost frames the game needs); rims and
  // boot-in still run below.
  if (document.getElementById("game-frame")) { rimsAndBoot(); return; }

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
  var tints = {};
  function tint(t, a) {
    var key = (t * 32 | 0) * 16 + (a * 15 | 0);
    return tints[key] || (tints[key] = mix(t, (a * 15 | 0) / 15));
  }
  function mix(t, a) {
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
  addEventListener("pointermove", function (ev) { px = ev.clientX / CELL; py = ev.clientY / CELL; tx = ev.clientX; ty = ev.clientY; }, { passive: true });
  addEventListener("pointerdown", function (ev) {
    for (var j = 0; j < 14; j++) embers.push(spawn(ev.clientX / CELL, ev.clientY / CELL, true));
  }, { passive: true });
  document.addEventListener("pointerleave", function () { px = py = -1e3; });

  // The loop stops while nobody can see it: tab hidden, or (home) the desk still covers (nearly) the whole viewport, since the
  // desk paints over the canvas. It starts again the moment the desk's bottom edge scrolls into view.
  var last = 0, raf = 0, desk = document.getElementById("desk"), covered = false, lgx = -1, lgy = -1;
  function live() { return !document.hidden && !covered; }
  function kick() { if (!raf && live()) raf = requestAnimationFrame(frame); }
  function cover() {
    var was = covered;
    covered = !!desk && desk.getBoundingClientRect().bottom >= innerHeight * .9;   // a sliver under the desk isn't worth 30 fps
    if (covered && !was) ctx.clearRect(0, 0, cols, rows);
    kick();
  }
  if (desk) { cover(); addEventListener("scroll", cover, { passive: true }); addEventListener("resize", cover); }
  document.addEventListener("visibilitychange", kick);
  function frame(t) {
    raf = 0;
    if (!live()) return;
    raf = requestAnimationFrame(frame);
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
    if (!fine) return;                     // touch screens hide the glow (deck.css)
    gx += (tx - gx) * .12; gy += (ty - gy) * .12;
    if ((gx | 0) !== lgx || (gy | 0) !== lgy) {
      lgx = gx | 0; lgy = gy | 0;
      glow.style.transform = "translate3d(" + lgx + "px," + lgy + "px,0)";
    }
  }
  kick();

  rimsAndBoot();

  function rimsAndBoot() {
  // ---------------------------------------------------------------- rims
  var lit = null;
  addEventListener("pointermove", light, { passive: true });
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
  // only what is still below the fold: nothing already on screen ever blinks out.
  // Launch fix (home showed big black gaps under the desk): a booted block used to wait for the observer to see it 6% *inside*
  // the screen, then for an animation frame, then for a stagger of up to 440ms. Anything that broke that chain left it at
  // opacity 0 for good: a renderer that wasn't painting frames (rAF never ran), a fast fling or an anchor jump that skipped
  // a block between two observer checks, or cards in a sideways strip that never "intersect" until you swipe. Now:
  //  - it powers on in the observer callback itself (no frame needed), a little *before* it scrolls in (+12% margin);
  //  - a cheap sweep on scroll, and on a slow timer, shows anything that is on screen or already above it, whatever the
  //    observer did (it reads positions only; it stops once nothing is waiting);
  //  - if anything here throws, every block is shown.
  if (!("IntersectionObserver" in window)) return;
  var waiting = [], sweepT = 0, tickT = 0;
  function show(list) {
    list.forEach(function (el, k) {
      var at = waiting.indexOf(el);
      if (at < 0) return;
      waiting.splice(at, 1);
      io.unobserve(el);
      var d = Math.min(k, 6) * 40;
      el.style.transitionDelay = d + "ms";
      el.classList.add("cc-in");
      setTimeout(function () { el.classList.remove("cc-boot", "cc-in"); el.style.transitionDelay = ""; }, 600 + d);
    });
    if (!waiting.length) { removeEventListener("scroll", soon); clearInterval(tickT); tickT = 0; }
  }
  var io = new IntersectionObserver(function (list) {
    var hit = [];
    list.forEach(function (en) {
      var r = en.rootBounds, bottom = r ? r.bottom : innerHeight;
      if (en.isIntersecting || en.boundingClientRect.top < bottom) hit.push(en.target);
    });
    if (hit.length) show(hit);
  }, { rootMargin: "0px 0px 12% 0px" });
  function sweep() {
    sweepT = 0;
    if (document.hidden) return; // a background tab: nothing to show yet (the scroll / timer sweeps pick it up after)
    var line = innerHeight * 1.1, hit = [];
    for (var i = 0; i < waiting.length; i++) {
      var el = waiting[i];
      if (!el.isConnected || el.getBoundingClientRect().top < line) hit.push(el);
    }
    if (hit.length) show(hit);
  }
  function soon() { if (!sweepT) sweepT = setTimeout(sweep, 120); }
  function arm() {
    if (tickT) return;
    addEventListener("scroll", soon, { passive: true });
    tickT = setInterval(sweep, 1500);
  }
  function release() { // the escape hatch: show everything, stop watching
    waiting.slice().forEach(function (el) { el.classList.remove("cc-boot", "cc-in"); el.style.transitionDelay = ""; });
    waiting = []; try { io.disconnect(); } catch (e) {}
    removeEventListener("scroll", soon); clearInterval(tickT); tickT = 0;
  }
  function watch(root) {
    try {
      var vh = innerHeight;
      (root.querySelectorAll ? root.querySelectorAll(REVEAL) : []).forEach(function (el) {
        if (el.dataset.ccSeen) return;
        el.dataset.ccSeen = "1";
        if (el.getBoundingClientRect().top < vh * 1.05) return;
        el.classList.add("cc-boot");
        waiting.push(el);
        io.observe(el);
      });
      if (waiting.length) arm();
    } catch (e) { release(); }
  }
  watch(document);
  // hub, lab and profile fill in cards after load
  new MutationObserver(function (ms) {
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) { if (n.nodeType === 1) watch(n.parentNode || n); }); });
  }).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
  addEventListener("pagehide", release);
  }
})();
