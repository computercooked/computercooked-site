/* K-0044 redesign, phase 1: the cooked desktop on the homepage.
   - the computer (assets/mascot.js) watches the cursor, talks, and gets cooked when you click it (a count is kept here)
   - game icons can be dragged around the desktop (positions kept on this device) and open on a click;
     hovering one opens a little window playing the game's clip
   - a cpu meter heats up as you move and click, and the computer panics at 100°C
   - a pixel trail follows the pointer
   - shelf cards play their clip on hover (on phones: the card in the middle of the screen)
   Everything still works without this file. prefers-reduced-motion turns off the trail, tilt, clips and dragging. */

/* K-0064: "your desk", a returning player's row above game of the week. Built from this device's history (cc-history,
   written on every game page by games/platform.js; visits from before it only have cc-recent) and the shelf cards
   already on the page, so there's no fetch. Up to 6 games, most recent first, each with a sticker (best / played Nx /
   new since you left / today's daily is fresh); the newest gets "pick up where you left off". ?ccdesk=demo fills it
   with made-up history for playtesting (nothing stored). First visits never see it: <head> only makes room when
   there's history (html.cc-desk). It runs before the shelf code below, so its cards get the same hover clips. */
(function () {
  "use strict";
  var root = document.documentElement, sec = document.getElementById("home-desk"), strip = document.getElementById("desk-strip");
  if (!sec || !strip || !root.classList.contains("cc-desk")) return;
  var demo = /[?&]ccdesk=demo(&|$)/.test(location.search), DAY = 86400000, DAILY = "crash-test-daily", now = Date.now();
  function off() { root.classList.remove("cc-desk"); sec.hidden = true; }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  // every card the server put on the page, by slug (the shelves hold all of our games)
  var cards = {};
  [].forEach.call(document.querySelectorAll("#home-new .card2, #home-shelf .card2"), function (a) { if (a.dataset.slug && !cards[a.dataset.slug]) cards[a.dataset.slug] = a; });
  var added = function (s) { return Date.parse(cards[s].dataset.added || "") || 0; };
  var hist = {}, prev = 0;
  if (demo) {
    // two older games played, the daily played yesterday, and everything from the last 5 days is "new since you left"
    var old = Object.keys(cards).filter(function (s) { return added(s) < now - 6 * DAY && s !== DAILY; });
    if (old[0]) hist[old[0]] = { t: now - 2 * 3600000, n: 3, b: 41 };
    if (cards[DAILY]) hist[DAILY] = { t: now - DAY, n: 5 };
    if (old[1]) hist[old[1]] = { t: now - 2 * DAY, n: 1 };
    if (old[2]) hist[old[2]] = { t: now - 4 * DAY, n: 2, b: 1280 };
    prev = now - 5 * DAY;
  } else {
    try { hist = JSON.parse(get("cc-history") || "null"); } catch (e) { hist = null; }
    if (!hist) { hist = {}; try { JSON.parse(get("cc-recent") || "[]").forEach(function (x) { if (x && x.g && !hist[x.g]) hist[x.g] = { t: x.t, n: 0 }; }); } catch (e) {} }
    prev = +get("cc-desk-seen") || 0; // when this device last saw the homepage
    set("cc-desk-seen", String(now));
  }
  var played = Object.keys(hist).filter(function (s) { return cards[s] && hist[s] && hist[s].t; }).sort(function (a, b) { return hist[b].t - hist[a].t; });
  if (!played.length) { off(); return; }
  var fresh = prev ? Object.keys(cards).filter(function (s) { return !hist[s] && added(s) > prev; }).sort(function (a, b) { return added(b) - added(a); }).slice(0, 2) : [];
  var row = [played[0]].concat(fresh, played.slice(1)).slice(0, 6);
  var today = new Date().toDateString();
  function sticker(s) {
    var h = hist[s];
    if (!h) return ["new since you left", "is-new"];
    if (s === DAILY && new Date(h.t).toDateString() !== today) return ["today's daily is fresh", "is-hot"];
    if (typeof h.b === "number") return ["best: " + (Math.round(h.b * 10) / 10).toLocaleString("en-US"), ""];
    return [h.n > 1 ? "played " + h.n + "x" : "played once", ""];
  }
  strip.innerHTML = "";
  row.forEach(function (s, i) {
    var li = cards[s].parentNode.cloneNode(true), a = li.firstChild, k = sticker(s), tag = a.querySelector(".tag-new");
    if (tag) tag.remove();
    a.href = a.getAttribute("href").replace(/([?&]ref=)[^&#]*/, "$1desk");
    a.setAttribute("data-desk", i ? "card" : "resume");
    a.insertAdjacentHTML("afterbegin", '<span class="desk-stk ' + k[1] + '"></span>');
    a.firstChild.textContent = k[0];
    if (!i) {
      a.classList.add("is-resume");
      a.querySelector(".meta").insertAdjacentHTML("beforeend", '<span class="desk-go">pick up where you left off ▶</span>');
    }
    strip.appendChild(li);
  });
  var LINES = ["welcome back.", "i kept your seat warm.", "the goo has grown.", "you came back. i'm not crying, it's coolant.", "your games missed you. i didn't. (i did.)"];
  var say = document.getElementById("desk-say");
  if (say) say.textContent = LINES[Math.floor(Math.random() * LINES.length)];
  sec.hidden = false;
  // counted with the site's other hits (assets/deck.js runs after this file); a playtest with ?ccdesk=demo isn't
  function hit(kind, extra) { if (!demo && window.ccHit) window.ccHit(kind, extra); }
  document.addEventListener("DOMContentLoaded", function () { hit("desk_shown"); });
  strip.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-desk]");
    if (a) hit("desk_click", { game: a.dataset.slug, slot: a.dataset.desk });
  });
  // K-0066: the hero's "your desk is warm" nudge (shown by CSS while html.cc-desk is on) scrolls down to the row
  var nudge = document.getElementById("desk-nudge");
  if (nudge) nudge.addEventListener("click", function (e) {
    e.preventDefault();
    var calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    sec.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    var h = document.getElementById("desk-heading");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    hit("desk_click", { slot: "nudge" });
  });
  var clear = document.getElementById("desk-clear");
  if (clear) clear.addEventListener("click", function () {
    if (!demo) { set("cc-history", "{}"); set("cc-recent", null); }
    off();
    var h = document.getElementById("feat-heading");
    if (h) { h.setAttribute("tabindex", "-1"); h.focus(); }
  });
})();

(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches;
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  var desk = $("#desk");
  if (!desk) return;
  var wide = function () { return innerWidth >= 900; };

  /* ---------- the computer ---------- */
  var pc = null, bubble = $("#desk-bubble"), bubbleT = 0;
  function say(t, ms) {
    if (!bubble) return;
    bubble.textContent = t; bubble.classList.add("on");
    clearTimeout(bubbleT); bubbleT = setTimeout(function () { bubble.classList.remove("on"); }, ms || 2600);
  }
  var POKES = ["ow.", "that's a fan, not a button.", "please. i have 3 tabs open.", "i'm at 98°C, kevin.", "stop. ok one more.", "you're cooking me.", "error: feelings.exe", "i felt that in my ram."];
  var IDLE = ["hover a game. i'll show you.", "drag the icons. i don't care. (i care.)", "click a game. it takes 3 seconds.", "is it hot in here or is it me. it's me."];
  var cooked = +ls("cc-cooked") || 0, cookedEl = $("#desk-cooked");
  if (cookedEl) cookedEl.textContent = cooked;
  function mountPc() {
    if (!window.ccMascot) return;
    pc = window.ccMascot.mount($("#desk-mascot"), { mood: "sad", label: "the computer cooked computer. click it, if you must." });
    $("#desk-mascot").addEventListener("ccm:cooked", function () {
      cooked++; ls("cc-cooked", String(cooked));
      if (cookedEl) cookedEl.textContent = cooked;
      heat(14);
      say(POKES[(cooked - 1) % POKES.length], 1800);
    });
  }
  if (window.ccMascot) mountPc(); else addEventListener("load", mountPc);
  setTimeout(function () { say("hi. please don't click me.", 3200); }, 700);
  var idleN = 0;
  setInterval(function () { if (!document.hidden && !bubble.classList.contains("on")) say(IDLE[idleN++ % IDLE.length], 3200); }, 11000);

  /* ---------- cpu temperature ---------- */
  var temp = 61, cpuEl = $("#desk-cpu"), cpuBar = $("#desk-cpu-bar"), hot = false;
  function showTemp() {
    if (cpuEl) cpuEl.textContent = Math.round(temp) + "°C";
    if (cpuBar) cpuBar.style.width = Math.max(4, Math.min(100, (temp - 40) / 60 * 100)) + "%";
    var h = temp >= 99;
    if (h !== hot) {
      hot = h; desk.classList.toggle("is-hot", hot);
      if (hot) { if (pc) pc.react("shock", 1600); say("THERMAL THROTTLING. go play something.", 2600); }
    }
  }
  function heat(n) { temp = Math.min(100, temp + n); showTemp(); }
  setInterval(function () { temp = Math.max(58, temp - 0.8); showTemp(); }, 250);
  var lastX = 0, lastY = 0;
  desk.addEventListener("pointermove", function (e) {
    var d = Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY); lastX = e.clientX; lastY = e.clientY;
    if (d < 300) heat(d / 900);
  }, { passive: true });

  /* ---------- clock ---------- */
  var clock = $("#desk-clock");
  function tick() { if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase(); }
  tick(); setInterval(tick, 15000);

  /* ---------- icons: free layout, drag, hover peek ---------- */
  var icons = [].slice.call(document.querySelectorAll(".desk-icon"));
  var KEY = "cc-desk-v1", saved = {};
  try { saved = JSON.parse(ls(KEY) || "{}") || {}; } catch (e) { saved = {}; }
  function slots() {
    var W = desk.clientWidth, H = desk.clientHeight, hello = $(".desk-hello").getBoundingClientRect(), d = desk.getBoundingClientRect();
    var pcR = $("#desk-pc").getBoundingClientRect();
    var out = [], hx = hello.left - d.left, hb = hello.bottom - d.top, hr = hello.right - d.left;
    // a row under the welcome window
    for (var x = hx; x + 112 < Math.min(W, pcR.left - d.left - 20) && out.length < 4; x += 124) out.push([x, Math.min(H - 170, hb + 28)]);
    // a column between the window and the computer
    var cx = hr + 36;
    if (cx + 112 < pcR.left - d.left - 10) for (var y = 70; y + 110 < H - 60 && out.length < 9; y += 118) out.push([cx, y]);
    // otherwise along the right edge
    for (var y2 = 70; out.length < 9 && y2 + 110 < H - 60; y2 += 118) out.push([W - 140, y2]);
    return out;
  }
  function place() {
    if (!wide()) { icons.forEach(function (a) { a.parentNode.style.left = a.parentNode.style.top = ""; }); return; }
    var W = desk.clientWidth, H = desk.clientHeight, s = slots();
    icons.forEach(function (a, i) {
      var li = a.parentNode, p = saved[a.dataset.slug], x, y;
      if (p) { x = p[0] * W; y = p[1] * H; } else if (s[i]) { x = s[i][0]; y = s[i][1]; } else { x = 24 + (i % 6) * 120; y = H - 170; }
      li.style.left = Math.max(4, Math.min(W - 116, x)) + "px";
      li.style.top = Math.max(4, Math.min(H - 150, y)) + "px";
    });
  }
  place();
  // the welcome window grows once the pixel font loads; lay the icons out again then
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  addEventListener("load", place);
  var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(place, 120); });

  // a little window with the game's clip, next to the icon under the pointer
  var peek = document.createElement("div");
  peek.className = "desk-win desk-peek";
  peek.innerHTML = '<div class="win-bar"><span class="win-title"></span><span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span></div><div class="win-body"><video muted loop playsinline preload="none"></video><img class="peek-still" alt="" hidden><p></p></div>';
  desk.appendChild(peek);
  var pv = peek.querySelector("video"), pimg = peek.querySelector(".peek-still");
  function showPeek(a) {
    if (!wide() || reduce || !fine) return;
    var li = a.parentNode, x = li.offsetLeft + 124, y = li.offsetTop - 20;
    if (x + 270 > desk.clientWidth) x = li.offsetLeft - 270;
    peek.style.left = Math.max(8, x) + "px"; peek.style.top = Math.max(8, Math.min(desk.clientHeight - 260, y)) + "px";
    peek.querySelector(".win-title").textContent = a.querySelector(".lbl").textContent;
    peek.querySelector("p").textContent = a.dataset.pitch || "";
    var clip = a.dataset.clip;
    // games with a clip play it; games without one yet (K-0048: the window opened empty) show their cover, gently panning
    if (clip) { if (pv.getAttribute("src") !== clip) { pv.src = clip; pv.poster = a.querySelector("img").src; } pv.hidden = false; pimg.hidden = true; pv.play().catch(function () {}); }
    else { try { pv.pause(); } catch (e) {} pv.hidden = true; pimg.src = a.querySelector("img").src; pimg.hidden = false; }
    peek.classList.add("on");
    if (pc) { pc.react("happy", 1600); }
    if (a.dataset.line) say(a.dataset.line, 2200);
  }
  function hidePeek() { peek.classList.remove("on"); try { pv.pause(); } catch (e) {} }

  icons.forEach(function (a) {
    var li = a.parentNode, sx = 0, sy = 0, ox = 0, oy = 0, drag = false, down = false, moved = false;
    a.addEventListener("pointerenter", function () { if (!down) showPeek(a); });
    a.addEventListener("pointerleave", function () { if (!down) hidePeek(); });
    a.addEventListener("focus", function () { showPeek(a); });
    a.addEventListener("blur", hidePeek);
    a.addEventListener("dragstart", function (e) { e.preventDefault(); });
    if (reduce) return;
    a.addEventListener("pointerdown", function (e) {
      if (!wide() || e.button !== 0) return;
      down = true; moved = false; sx = e.clientX; sy = e.clientY; ox = li.offsetLeft; oy = li.offsetTop;
      a.setPointerCapture(e.pointerId);
    });
    a.addEventListener("pointermove", function (e) {
      if (!down) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (!drag && Math.abs(dx) + Math.abs(dy) > 6) { drag = true; moved = true; a.classList.add("is-dragging"); li.style.zIndex = 8; hidePeek(); if (pc) pc.react("shock", 700); }
      if (!drag) return;
      li.style.left = Math.max(4, Math.min(desk.clientWidth - 116, ox + dx)) + "px";
      li.style.top = Math.max(4, Math.min(desk.clientHeight - 150, oy + dy)) + "px";
      heat(0.3);
    });
    function up() {
      if (!down) return;
      down = false;
      if (drag) {
        drag = false; a.classList.remove("is-dragging"); li.style.zIndex = 4;
        saved[a.dataset.slug] = [li.offsetLeft / desk.clientWidth, li.offsetTop / desk.clientHeight];
        ls(KEY, JSON.stringify(saved));
        say(["new spot. bold.", "feng shui: cooked.", "i liked it there.", "fine. there."][Math.floor(Math.random() * 4)], 1600);
      }
    }
    a.addEventListener("pointerup", up);
    a.addEventListener("pointercancel", up);
    // a drag isn't a click
    a.addEventListener("click", function (e) { if (moved) { e.preventDefault(); moved = false; } });
  });

  /* ---------- pixel trail ---------- */
  var cv = $("#desk-fx");
  if (cv && !reduce && fine) (function () {
    var c = cv.getContext("2d"), dpr = Math.min(2, devicePixelRatio || 1), parts = [], dust = [], on = true, raf = 0, W = 0, H = 0;
    function size() { W = desk.clientWidth; H = desk.clientHeight; cv.width = W * dpr; cv.height = H * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener("resize", size);
    for (var i = 0; i < 28; i++) dust.push({ x: Math.random() * W, y: Math.random() * H, v: 6 + Math.random() * 14, s: Math.random() < 0.3 ? 3 : 2 });
    desk.addEventListener("pointermove", function (e) {
      var r = desk.getBoundingClientRect();
      for (var k = 0; k < 2; k++) parts.push({ x: e.clientX - r.left + (Math.random() - 0.5) * 10, y: e.clientY - r.top + (Math.random() - 0.5) * 10, t: 0, l: 0.5 + Math.random() * 0.4, s: Math.random() < 0.5 ? 4 : 3 });
      if (parts.length > 160) parts.splice(0, parts.length - 160);
      if (!raf && on) raf = requestAnimationFrame(frame);
    }, { passive: true });
    var last = performance.now();
    function frame(t) {
      raf = 0;
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      c.clearRect(0, 0, W, H);
      c.fillStyle = "rgba(184,242,58,.18)";
      for (var i = 0; i < dust.length; i++) { var d = dust[i]; d.y -= d.v * dt; if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; } c.fillRect(Math.round(d.x), Math.round(d.y), d.s, d.s); }
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j]; p.t += dt; p.y += 18 * dt;
        if (p.t > p.l) { parts.splice(j, 1); continue; }
        c.fillStyle = "rgba(184,242,58," + (1 - p.t / p.l).toFixed(2) + ")";
        c.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, p.s, p.s);
      }
      if (on && !document.hidden) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { on = es[0].isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame); }).observe(desk);
    document.addEventListener("visibilitychange", function () { if (!document.hidden && on && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } });
  })();

  /* ---------- shelf cards: clip on hover, tilt toward the pointer ---------- */
  var cards = [].slice.call(document.querySelectorAll(".card2"));
  function play(card, on) {
    var v = card.querySelector("video");
    if (!v || reduce) return;
    if (on) { if (!v.src) v.src = v.dataset.src; card.classList.add("is-playing"); v.play().catch(function () {}); }
    else { card.classList.remove("is-playing"); try { v.pause(); } catch (e) {} }
  }
  cards.forEach(function (card) {
    card.addEventListener("pointerenter", function () { if (fine) play(card, true); });
    card.addEventListener("pointerleave", function () { play(card, false); card.style.removeProperty("--rx"); card.style.removeProperty("--ry"); });
    card.addEventListener("focus", function () { play(card, true); });
    card.addEventListener("blur", function () { play(card, false); });
    if (fine && !reduce) card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      card.style.setProperty("--ry", (x * 8).toFixed(2) + "deg"); card.style.setProperty("--rx", (-y * 8).toFixed(2) + "deg");
    });
  });
  // phones: the card nearest the middle of the screen plays
  if (!fine && !reduce && "IntersectionObserver" in window && cards.length) {
    var vis = new Map(), cur = null;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio > 0.75) vis.set(e.target, e.boundingClientRect.top); else vis.delete(e.target); });
      var best = null, bd = 1e9, mid = innerHeight / 2;
      vis.forEach(function (top, el) { var d = Math.abs(top + el.offsetHeight / 2 - mid); if (d < bd) { bd = d; best = el; } });
      if (best !== cur) { if (cur) play(cur, false); cur = best; if (cur) play(cur, true); }
    }, { threshold: [0, 0.75, 1] });
    cards.forEach(function (c) { io.observe(c); });
  }
})();

// the tip jar in the footer (K-0059): the shared button from assets/tip.js, only while TIP_URL is a Stripe link
if (window.ccTip) ccTip.mount(document.getElementById("footer-tip"), { game: "home", slot: "home-footer" });
