/* K-0044 redesign, phase 1: the cooked desktop on the homepage.
   - the computer (assets/mascot.js) watches the cursor, talks, and gets cooked when you click it (a count is kept here)
   - the games sit in one quick-launch dock: icons swell under the pointer, hovering one opens a little window playing
     the game's clip, and "surprise me" spins the dock and launches whatever it lands on
   - the start button opens a start menu (games, dailies, search, lab, log, account, and a shut down that won't)
   - a cpu meter heats up as you move and click, and the computer panics at 100°C
   - a pixel trail follows the pointer
   - shelf cards play their clip on hover (on phones: the card in the middle of the screen)
   Everything still works without this file. prefers-reduced-motion turns off the trail, tilt, clips, the swell and the spin. */

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
  var stats = document.getElementById("desk-stats"); // the player card (assets/deck.js window.ccStats)
  if (stats) stats.addEventListener("click", function () { if (window.ccStats) window.ccStats.open(); });
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
  /* ---------- desktop sounds: tiny square-wave blips for the menu, the dice, wallpapers and friends ----------
     Off until the speaker on the taskbar is switched on; the choice is kept on this device (localStorage "cc-sfx").
     Made in the browser (Web Audio), so there are no sound files to download. Sounds only ever follow a click or a key. */
  var AC = window.AudioContext || window.webkitAudioContext, ac = null, sndOn = ls("cc-sfx") === "1", sndBtn = $("#desk-snd");
  var TUNES = { tick: [[880, .03]], pop: [[520, .05], [780, .06]], shut: [[420, .05]], poke: [[196, .07]], fresh: [[988, .04], [1319, .05]],
    wall: [[392, .06], [523, .06], [659, .09]], win: [[523, .08], [659, .08], [784, .08], [1047, .16]], off: [[440, .1], [330, .1], [220, .2]], on: [[659, .07], [988, .12]] };
  function sfx(name) {
    var notes = TUNES[name];
    if (!sndOn || !AC || !notes) return;
    try {
      ac = ac || new AC(); if (ac.state === "suspended") ac.resume();
      var t = ac.currentTime + .01;
      notes.forEach(function (n) {
        var o = ac.createOscillator(), g = ac.createGain();
        o.type = "square"; o.frequency.value = n[0];
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.045, t + .005); g.gain.exponentialRampToValueAtTime(.0001, t + n[1]);
        o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + n[1] + .02); t += n[1];
      });
    } catch (e) {}
  }
  if (sndBtn && AC) {
    var sndShow = function () { sndBtn.setAttribute("aria-pressed", String(sndOn)); sndBtn.title = sndOn ? "desktop sounds: on" : "desktop sounds: off"; };
    sndBtn.hidden = false; sndShow();
    sndBtn.addEventListener("click", function () {
      sndOn = !sndOn; try { if (sndOn) localStorage.setItem("cc-sfx", "1"); else localStorage.removeItem("cc-sfx"); } catch (e) {}
      sndShow(); sfx("on"); say(sndOn ? "sounds on. you asked for this." : "sounds off. bliss.", 2200);
    });
  }
  document.addEventListener("cc:sfx", function (e) { sfx(e.detail); }); // the game window (below) asks from its own block
  var POKES = ["ow.", "that's a fan, not a button.", "please. i have 3 tabs open.", "i'm at 98°C, kevin.", "stop. ok one more.", "you're cooking me.", "error: feelings.exe", "i felt that in my ram."];
  var IDLE = ["hover a game. i'll show you.", "press surprise me. i dare you.", "click a game. it takes 3 seconds.", "is it hot in here or is it me. it's me."];
  var cooked = +ls("cc-cooked") || 0, cookedEl = $("#desk-cooked");
  if (cookedEl) cookedEl.textContent = cooked;
  function mountPc() {
    if (!window.ccMascot) return;
    pc = window.ccMascot.mount($("#desk-mascot"), { mood: "sad", label: "the computer cooked computer. click it, if you must." });
    $("#desk-mascot").addEventListener("ccm:cooked", function () {
      cooked++; ls("cc-cooked", String(cooked));
      if (cookedEl) cookedEl.textContent = cooked;
      heat(14);
      say(POKES[(cooked - 1) % POKES.length], 1800); sfx("poke");
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
  // cools back to 58 and then leaves the DOM alone: an idle page does no style or layout work for the meter
  setInterval(function () { if (temp > 58) { temp = Math.max(58, temp - 0.8); showTemp(); } }, 250);
  var lastX = 0, lastY = 0;
  desk.addEventListener("pointermove", function (e) {
    var d = Math.abs(e.clientX - lastX) + Math.abs(e.clientY - lastY); lastX = e.clientX; lastY = e.clientY;
    if (d < 300) heat(d / 900);
  }, { passive: true });

  /* ---------- clock ---------- */
  var clock = $("#desk-clock");
  function tick() { if (clock) clock.textContent = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase(); }
  tick(); setInterval(tick, 15000);

  /* ---------- the dock: hover peek, the swell, surprise me ---------- */
  var icons = [].slice.call(document.querySelectorAll("a.desk-icon"));
  var dock = $("#desk-dock"), dice = $("#desk-dice");
  try { localStorage.removeItem("cc-desk-v1"); } catch (e) {} // the old dragged-icon positions

  // a little window with the game's clip, above the icon under the pointer
  var peek = document.createElement("div");
  peek.className = "desk-win desk-peek";
  peek.innerHTML = '<div class="win-bar"><span class="win-title"></span><span class="win-dots" aria-hidden="true"><i></i><i></i><i></i></span></div><div class="win-body"><video muted loop playsinline preload="none"></video><img class="peek-still" alt="" hidden><p></p></div>';
  desk.appendChild(peek);
  var pv = peek.querySelector("video"), pimg = peek.querySelector(".peek-still"), spinning = false;
  function showPeek(a) {
    if (!wide() || reduce || !fine || spinning) return;
    var d = desk.getBoundingClientRect(), r = a.getBoundingClientRect(), top = (dock ? dock.getBoundingClientRect().top : r.top) - d.top;
    peek.querySelector(".win-title").textContent = a.querySelector(".lbl").textContent;
    peek.querySelector("p").textContent = a.dataset.pitch || "";
    var clip = a.dataset.clip;
    // games with a clip play it; games without one yet (K-0048: the window opened empty) show their cover, gently panning
    if (clip) { if (pv.getAttribute("src") !== clip) { pv.src = clip; pv.poster = a.querySelector("img").src; } pv.hidden = false; pimg.hidden = true; pv.play().catch(function () {}); }
    else { try { pv.pause(); } catch (e) {} pv.hidden = true; pimg.src = a.querySelector("img").src; pimg.hidden = false; }
    peek.style.left = Math.max(8, Math.min(desk.clientWidth - 268, r.left - d.left + r.width / 2 - 130)) + "px";
    peek.style.top = Math.max(8, top - peek.offsetHeight - 44) + "px";
    peek.classList.add("on");
    if (pc) { pc.react("happy", 1600); }
    if (a.dataset.line) say(a.dataset.line, 2200);
  }
  function hidePeek() { peek.classList.remove("on"); try { pv.pause(); } catch (e) {} }
  icons.forEach(function (a) {
    a.addEventListener("pointerenter", function () { showPeek(a); });
    a.addEventListener("pointerleave", hidePeek);
    a.addEventListener("focus", function () { showPeek(a); });
    a.addEventListener("blur", hidePeek);
    a.addEventListener("dragstart", function (e) { e.preventDefault(); });
  });

  // the swell: icons grow the nearer the pointer is, like a dock should
  if (dock && fine && !reduce) (function () {
    var tiles = [].slice.call(dock.querySelectorAll(".desk-icon")), mids = [], mx = 0, raf = 0;
    function measure() { mids = tiles.map(function (t) { var r = t.getBoundingClientRect(); return r.left + r.width / 2; }); }
    function draw() {
      raf = 0;
      tiles.forEach(function (t, i) {
        var k = Math.max(0, 1 - Math.abs(mx - mids[i]) / 170);
        t.firstElementChild.style.setProperty("--mag", (1 + 0.42 * k * k).toFixed(3));
      });
    }
    dock.addEventListener("pointerenter", measure);
    dock.addEventListener("pointermove", function (e) { if (!wide() || spinning) return; mx = e.clientX; if (!mids.length) measure(); if (!raf) raf = requestAnimationFrame(draw); }, { passive: true });
    dock.addEventListener("pointerleave", function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } tiles.forEach(function (t) { t.firstElementChild.style.removeProperty("--mag"); }); });
    addEventListener("resize", function () { mids = []; });
  })();

  // surprise me: the highlight runs along the dock, slows down, and lands on a game (one you haven't played, if any)
  function played() { try { return JSON.parse(ls("cc-history") || "{}") || {}; } catch (e) { return {}; } }
  function spin() {
    if (spinning || !icons.length) return;
    var h = played(), fresh = icons.filter(function (a) { return !h[a.dataset.slug]; }), pool = fresh.length ? fresh : icons;
    var target = pool[Math.floor(Math.random() * pool.length)], ti = icons.indexOf(target);
    if (reduce) { location.href = target.href; return; }
    spinning = true; desk.classList.add("is-spinning"); hidePeek();
    icons.forEach(function (a) { a.firstElementChild.style.removeProperty("--mag"); });
    say("spinning. no refunds.", 2400);
    var n = icons.length, steps = 2 * n + ti, i = 0, wait = 55, row = dock && dock.querySelector(".dock-row");
    (function step() {
      icons.forEach(function (a) { a.classList.remove("is-picked"); });
      var a = icons[i % n]; a.classList.add("is-picked"); sfx(i === steps ? "win" : "tick");
      // phones: the row follows the highlight (sideways only, so the page doesn't jump)
      if (!wide() && row) row.scrollLeft = a.parentNode.offsetLeft - row.offsetLeft - (row.clientWidth - a.parentNode.offsetWidth) / 2;
      if (i === steps) {
        a.classList.add("is-won");
        if (pc) pc.react("happy", 1500);
        say("it's " + a.querySelector(".lbl").textContent + ". good luck.", 2400);
        setTimeout(function () { location.href = a.href; }, 800);
        return;
      }
      i++; if (steps - i < 9) wait *= 1.3;
      setTimeout(step, wait);
    })();
  }
  function unspin() { spinning = false; desk.classList.remove("is-spinning"); icons.forEach(function (a) { a.classList.remove("is-picked", "is-won"); }); }
  addEventListener("pageshow", function (e) { if (e.persisted) unspin(); }); // back from the game: the dock is ready again
  if (dice && icons.length > 1) { dice.hidden = false; dice.addEventListener("click", spin); }

  /* ---------- the start menu ---------- */
  var start = $("#desk-start"), menu = $("#desk-menu");
  if (start && menu) (function () {
    start.setAttribute("role", "button"); start.setAttribute("aria-expanded", "false");
    function open(on) {
      if (menu.hidden === on) sfx(on ? "pop" : "shut");
      menu.hidden = !on; start.setAttribute("aria-expanded", String(on));
      if (on) { var f = menu.querySelector("a, button"); if (f) f.focus({ preventScroll: true }); say("ooh. the menu.", 1600); }
    }
    start.addEventListener("click", function (e) { e.preventDefault(); open(menu.hidden); });
    start.addEventListener("keydown", function (e) { if (e.key === " ") { e.preventDefault(); open(menu.hidden); } });
    document.addEventListener("pointerdown", function (e) { if (!menu.hidden && !menu.contains(e.target) && !start.contains(e.target)) open(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { open(false); start.focus(); } });
    menu.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var items = [].slice.call(menu.querySelectorAll("a, button")), at = items.indexOf(document.activeElement);
      e.preventDefault(); items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
    });
    menu.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]"); if (!b) return;
      var act = b.dataset.act; open(false);
      run(act);
    });
  })();
  function run(act) {
    if (act === "dice") spin();
    else if (act === "search") { var s = document.querySelector("[data-cmd-open]"); if (s) s.click(); }
    else if (act === "stats") { if (window.ccStats) window.ccStats.open(); } // the player card, assets/deck.js
    else if (act === "off") shutDown();
    else if (act === "saver") document.dispatchEvent(new Event("cc:saver"));
    else if (act === "wall") nextWall();
    else if (act === "tint") document.dispatchEvent(new Event("cc:tint")); // assets/deck.js flips it and answers with cc:tinted
    else if (act === "fresh") { if (!reduce) { desk.classList.remove("is-fresh"); void desk.offsetWidth; desk.classList.add("is-fresh"); } say("refreshed. i feel exactly the same.", 2600); sfx("fresh"); }
  }

  /* ---------- wallpapers: four desktop backgrounds, picked from the start menu or the right-click menu ----------
     The choice is kept on this device only (localStorage "cc-wall"); an inline script in index.html applies it
     before the first paint. */
  document.addEventListener("cc:tinted", function (e) { say("screen colour: " + e.detail + ".", 2000); sfx("wall"); });
  var WALLS = ["", "sunset", "sea", "hills"], WALL_NAMES = { "": "the usual", sunset: "sunset", sea: "deep sea", hills: "night hills" };
  function nextWall() {
    var root = document.documentElement, w = WALLS[(WALLS.indexOf(root.dataset.wall || "") + 1) % WALLS.length];
    if (w) root.dataset.wall = w; else delete root.dataset.wall;
    try { if (w) localStorage.setItem("cc-wall", w); else localStorage.removeItem("cc-wall"); } catch (e) {}
    say("wallpaper: " + WALL_NAMES[w] + ".", 2000); sfx("wall");
  }

  /* ---------- right-click the desktop: a little desktop menu ----------
     Only on a mouse, only on empty desktop (links, buttons, form fields, videos and the game window keep the
     browser's own menu), and holding shift always gives the browser's menu. */
  if (desk && window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) (function () {
    var ctx = null;
    function shut() { if (ctx) { ctx.remove(); ctx = null; } }
    desk.addEventListener("contextmenu", function (e) {
      if (e.shiftKey || e.target.closest("a, button, input, textarea, video, iframe, dialog, .desk-menu")) { shut(); return; }
      e.preventDefault(); shut();
      ctx = document.createElement("div"); ctx.className = "desk-menu desk-ctx"; ctx.setAttribute("role", "menu"); ctx.setAttribute("aria-label", "desktop menu");
      var saver = document.getElementById("menu-saver");
      ctx.innerHTML = '<ul role="none">' +
        '<li role="none"><button type="button" role="menuitem" data-act="dice"><i aria-hidden="true">?</i>surprise me</button></li>' +
        '<li role="none"><button type="button" role="menuitem" data-act="search"><i aria-hidden="true">/</i>find a game</button></li>' +
        '<li role="none"><a role="menuitem" href="/surf/"><i aria-hidden="true">≋</i>channel surf</a></li>' +
        '<li role="none" class="menu-sep"><button type="button" role="menuitem" data-act="wall"><i aria-hidden="true">▧</i>next wallpaper</button></li>' +
        '<li role="none"><button type="button" role="menuitem" data-act="tint"><i aria-hidden="true">◐</i>screen colour</button></li>' +
        (saver && !saver.hidden ? '<li role="none"><button type="button" role="menuitem" data-act="saver"><i aria-hidden="true">☾</i>screensaver</button></li>' : "") +
        '<li role="none"><button type="button" role="menuitem" data-act="fresh"><i aria-hidden="true">↻</i>refresh</button></li></ul>';
      desk.appendChild(ctx); sfx("pop");
      var r = desk.getBoundingClientRect(), w = ctx.offsetWidth, h = ctx.offsetHeight;
      ctx.style.left = Math.max(4, Math.min(e.clientX - r.left, r.width - w - 4)) + "px";
      ctx.style.top = Math.max(4, Math.min(e.clientY - r.top, r.height - h - 44)) + "px";
      ctx.querySelector("button").focus({ preventScroll: true });
    });
    desk.addEventListener("click", function (e) {
      if (!ctx || !ctx.contains(e.target)) return;
      var b = e.target.closest("[data-act]"), keep = b && /^(wall|tint)$/.test(b.dataset.act); // stays open so you can flip through wallpapers
      if (b) run(b.dataset.act);
      if (!keep) shut();
    });
    desk.addEventListener("keydown", function (e) {
      if (!ctx || !ctx.contains(e.target)) return;
      if (e.key === "Escape") { e.stopPropagation(); shut(); return; }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      var items = [].slice.call(ctx.querySelectorAll("a, button")), at = items.indexOf(document.activeElement);
      e.preventDefault(); items[(at + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus();
    });
    document.addEventListener("pointerdown", function (e) { if (ctx && !ctx.contains(e.target)) shut(); });
    addEventListener("scroll", shut, { passive: true }); addEventListener("blur", shut); addEventListener("resize", shut);
  })();
  function shutDown() {
    if (reduce) { say("nice try. i don't have an off switch.", 3000); return; }
    var off = document.createElement("div"); off.className = "desk-off"; desk.appendChild(off); sfx("off");
    setTimeout(function () { off.remove(); if (pc) pc.react("shock", 1400); say("nice try. i don't have an off switch.", 3200); heat(30); }, 1500);
  }

  /* ---------- "happening now": today's dailies and the countdowns ---------- */
  (function () {
    var d3 = window.ccDaily3, dots = document.querySelectorAll("#now-dots i"), meta = $("#now-daily-meta");
    if (d3 && meta) {
      var done = d3.today().length, of = d3.GAMES.length, streak = d3.streak();
      for (var i = 0; i < dots.length; i++) dots[i].classList.toggle("on", i < done);
      meta.textContent = done >= of ? "all three done. " + (streak > 1 ? streak + " days in a row." : "see you after midnight.")
        : done ? done + " of " + of + " done today. " + (of - done) + " to go."
        : streak ? streak + "-day streak. don't break it." : "play all three to start a streak.";
    }
    var outs = [].slice.call(document.querySelectorAll("[data-until]"));
    if (!outs.length) return;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      if (document.hidden) return;
      var t = new Date();
      outs.forEach(function (o) {
        var u = o.getAttribute("data-until"), end = u === "midnight" ? new Date(t.getFullYear(), t.getMonth(), t.getDate() + 1) : new Date(u);
        var s = Math.max(0, Math.floor((end - t) / 1000)), d = Math.floor(s / 86400);
        o.textContent = isNaN(s) ? "" : (d ? d + "d " : "") + pad(Math.floor(s / 3600) % 24) + ":" + pad(Math.floor(s / 60) % 60) + ":" + pad(s % 60);
      });
    }
    tick(); setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
  })();

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
    var PH = "184,242,58"; // the screen colour as r,g,b (the --phosphor token), re-read when it changes
    function readPh() { var v = getComputedStyle(document.documentElement).getPropertyValue("--phosphor").trim(); if (v) PH = v.replace(/\s+/g, ","); }
    readPh(); document.addEventListener("cc:tinted", readPh);
    var last = performance.now();
    function frame(t) {
      raf = 0;
      var dt = Math.min(0.05, (t - last) / 1000); last = t;
      c.clearRect(0, 0, W, H);
      c.fillStyle = "rgba(" + PH + ",.18)";
      for (var i = 0; i < dust.length; i++) { var d = dust[i]; d.y -= d.v * dt; if (d.y < -4) { d.y = H + 4; d.x = Math.random() * W; } c.fillRect(Math.round(d.x), Math.round(d.y), d.s, d.s); }
      for (var j = parts.length - 1; j >= 0; j--) {
        var p = parts[j]; p.t += dt; p.y += 18 * dt;
        if (p.t > p.l) { parts.splice(j, 1); continue; }
        c.fillStyle = "rgba(" + PH + "," + (1 - p.t / p.l).toFixed(2) + ")";
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

/* The hero reel: the little screen in the welcome window. It starts as a link to the game of the week with its cover;
   a moment after the page loads it plays that game's 3 second clip, then flips through a few more games (4 on phones,
   6 on bigger screens, so it never pulls much data), updating the link as it goes. It waits while you hover or focus it,
   while it is off screen and while the tab is hidden. Not under reduced motion or data saver. Nothing is sent or stored.
   Each clip is downloaded once and kept in memory for the visit, the next one fetched while the current one plays, so
   after the first pass the reel loops without touching the network. */
(function () {
  "use strict";
  var reel = document.getElementById("desk-reel"), clip = document.getElementById("reel-clip");
  if (!reel || !clip || !window.fetch || !window.IntersectionObserver) return;
  var conn = navigator.connection;
  if ((window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) || (conn && conn.saveData)) return;
  var cover = document.getElementById("reel-cover"), title = document.getElementById("reel-title"), pitch = document.getElementById("reel-pitch");
  var STEP = 4500, MAX = innerWidth < 900 ? 4 : 6, list = [], at = -1, timer = 0, inView = false, held = false;
  var first = (/\/games\/([^/]+)\//.exec(reel.getAttribute("href") || "") || [])[1] || "";
  function play() { var p = clip.play(); if (p && p.then) p.then(function () { clip.classList.add("is-on"); }).catch(function () {}); }
  function arm() {
    clearTimeout(timer); reel.classList.remove("is-rolling");
    if (!inView || held || document.hidden || list.length < 2) return;
    void reel.offsetWidth; reel.classList.add("is-rolling");
    timer = setTimeout(function () { show(at + 1); }, STEP);
  }
  function ready(g) { // the clip as an in-memory url, downloaded once (falls back to the plain file if that fails)
    return g.got || (g.got = fetch(g.clip).then(function (r) { return r.ok ? r.blob() : Promise.reject(r.status); })
      .then(function (b) { return URL.createObjectURL(b); }).catch(function () { return g.clip; }));
  }
  var turn = 0;
  function show(i) {
    var n = ++turn, g = list[i % list.length];
    clearTimeout(timer);
    ready(g).then(function (src) { if (n === turn) put(i % list.length, g, src); });
  }
  function put(i, g, src) {
    at = i;
    clip.classList.remove("is-on");
    clip.src = src;
    if (cover) cover.style.visibility = g.slug === first ? "" : "hidden"; // the cover is the first game's
    reel.href = "/games/" + encodeURIComponent(g.slug) + "/?ref=reel";
    reel.style.setProperty("--reel-accent", (g.theme && /^#[0-9a-f]{3,8}$/i.test(g.theme.accent || "")) ? g.theme.accent : "");
    if (title) title.textContent = g.title;
    if (pitch) pitch.textContent = g.pitch || "";
    play(); arm();
    if (list.length > 1 && inView && !document.hidden) ready(list[(i + 1) % list.length]); // have the next one waiting
  }
  function sync() {
    if (at < 0) { if (inView && !document.hidden && !turn) show(0); return; }
    if (inView && !document.hidden) play(); else clip.pause();
    arm();
  }
  function start() {
    fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
      var games = ((d && d.games) || []).filter(function (g) { return g && g.slug && g.title && g.clip; });
      var head = games.filter(function (g) { return g.slug === first; }), rest = games.filter(function (g) { return g.slug !== first; });
      for (var i = rest.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = rest[i]; rest[i] = rest[j]; rest[j] = t; }
      list = head.concat(rest).slice(0, MAX);
      if (!list.length) return;
      new IntersectionObserver(function (es) { inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: .5 }).observe(reel);
      document.addEventListener("visibilitychange", sync);
      var hold = function (on) { return function () { held = on; arm(); }; };
      reel.addEventListener("pointerenter", hold(true)); reel.addEventListener("pointerleave", hold(false));
      reel.addEventListener("focus", hold(true)); reel.addEventListener("blur", hold(false));
      reel.addEventListener("cc:hold", function () { held = true; clip.pause(); arm(); });
      reel.addEventListener("cc:release", function () { held = false; sync(); });
    }).catch(function () { /* the plain link stays */ });
  }
  if (document.readyState === "complete") setTimeout(start, 900);
  else window.addEventListener("load", function () { setTimeout(start, 900); });
})();

/* "play it here": on a big screen, clicking the hero reel opens that game in a window on this desktop instead of
   leaving the page (the bare player at /games/<slug>/window/, framed). "full page" goes to the game's own page;
   the x, Esc or a click outside closes it and the game stops. Phones, small windows, modified clicks and browsers
   without <dialog> keep the plain link. Nothing is sent or stored here; the player counts the play as usual. */
(function () {
  "use strict";
  var reel = document.getElementById("desk-reel"), win = document.getElementById("play-win"), stage = document.getElementById("play-win-stage");
  if (!reel || !win || !stage || !win.showModal) return;
  var big = function () { return innerWidth >= 900 && innerHeight >= 560; };
  var title = document.getElementById("play-win-title"), full = document.getElementById("play-win-full"), frame = null;
  var mark = function () { document.documentElement.classList.toggle("cc-playhere", big()); };
  mark(); window.addEventListener("resize", mark);
  function shut() {
    if (frame) { frame.remove(); frame = null; }
    reel.dispatchEvent(new Event("cc:release"));
  }
  reel.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || !big()) return;
    var slug = (/\/games\/([a-z0-9-]+)\//.exec(reel.getAttribute("href") || "") || [])[1];
    if (!slug) return;
    e.preventDefault();
    var name = (document.getElementById("reel-title") || {}).textContent || slug;
    title.textContent = "C:\\COOKED\\" + name + ".exe";
    full.href = "/games/" + slug + "/?ref=reel";
    frame = document.createElement("iframe");
    frame.title = name; frame.allow = "fullscreen; autoplay"; frame.src = "/games/" + slug + "/window/";
    stage.appendChild(frame);
    reel.dispatchEvent(new Event("cc:hold"));
    win.showModal();
    document.dispatchEvent(new CustomEvent("cc:sfx", { detail: "pop" }));
    frame.focus();
  });
  var bye = function () { if (win.open) win.close(); shut(); };
  document.getElementById("play-win-x").addEventListener("click", bye);
  win.addEventListener("click", function (e) { if (e.target === win) bye(); }); // the backdrop
  win.addEventListener("cancel", function (e) { e.preventDefault(); bye(); }); // Esc
  win.addEventListener("close", shut);
})();

/* The screensaver: after a minute with no mouse, key, touch or scroll on the homepage (or from the start menu), the
   screen goes dark and a game cover bounces around it, swapping to another game at every wall. Click the cover to
   play that game (?ref=saver); click anywhere else or press a key to go back. It counts corner hits, because of
   course it does. Never starts while a window or the game window is open, in a hidden tab, or under reduced motion
   (the menu item stays hidden there). Nothing is sent or stored. */
(function () {
  "use strict";
  if (!window.fetch || !window.requestAnimationFrame) return;
  if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var IDLE = 60000, SPEED = 120, timer = 0, box = null, raf = 0, games = null, back = null;
  var item = document.getElementById("menu-saver"); if (item) item.hidden = false;
  var reel = document.getElementById("desk-reel");
  function busy() {
    var a = document.activeElement;
    return document.hidden || document.querySelector("dialog[open]") || document.documentElement.classList.contains("cc-bootseq") || (a && a.tagName === "IFRAME") ||
      (reel && reel.matches(":hover")); // someone is watching the reel's clip
  }
  function arm() { clearTimeout(timer); if (!box) timer = setTimeout(function () { if (busy()) arm(); else start(); }, IDLE); }
  function stop() {
    if (!box) return;
    cancelAnimationFrame(raf); box.remove(); box = null;
    if (reel) reel.dispatchEvent(new Event("cc:release"));
    if (back && back.focus) try { back.focus({ preventScroll: true }); } catch (e) {}
    arm();
  }
  function run(list) {
    if (box || !list.length) return;
    for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = list[i]; list[i] = list[j]; list[j] = t; }
    back = document.activeElement;
    box = document.createElement("div"); box.className = "saver"; box.tabIndex = -1;
    box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "screensaver. press any key to go back.");
    var tile = document.createElement("a"); tile.className = "saver-tile";
    var img = document.createElement("img"); img.alt = ""; img.width = 320; img.height = 200;
    var name = document.createElement("b"), go = document.createElement("span"); go.textContent = "play ▶";
    tile.appendChild(img); tile.appendChild(name); tile.appendChild(go);
    var hint = document.createElement("p"); hint.className = "saver-hint";
    var hits = 0, n = document.createElement("b"); n.textContent = "0";
    hint.appendChild(document.createTextNode("screensaver. click the game to play it, anywhere else to go back. corner hits: ")); hint.appendChild(n);
    box.appendChild(tile); box.appendChild(hint); document.body.appendChild(box);
    var at = -1;
    function next() {
      at = (at + 1) % list.length;
      var g = list[at];
      img.src = g.thumbnail; name.textContent = g.title;
      tile.href = "/games/" + encodeURIComponent(g.slug) + "/?ref=saver";
      tile.setAttribute("aria-label", "play " + g.title);
      tile.style.setProperty("--saver-accent", (g.theme && /^#[0-9a-f]{3,8}$/i.test(g.theme.accent || "")) ? g.theme.accent : "");
      var pre = new Image(); pre.src = list[(at + 1) % list.length].thumbnail;
    }
    next();
    var W = innerWidth, H = innerHeight, w = tile.offsetWidth, h = tile.offsetHeight || w * .9;
    var x = Math.random() * Math.max(1, W - w), y = Math.random() * Math.max(1, H - h);
    var vx = Math.random() < .5 ? SPEED : -SPEED, vy = Math.random() < .5 ? SPEED * .8 : -SPEED * .8, last = 0;
    function step(now) {
      raf = requestAnimationFrame(step);
      var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
      W = innerWidth; H = innerHeight; w = tile.offsetWidth; h = tile.offsetHeight;
      x += vx * dt; y += vy * dt;
      var bx = false, by = false;
      if (x <= 0) { x = 0; vx = Math.abs(vx); bx = true; } else if (x >= W - w) { x = Math.max(0, W - w); vx = -Math.abs(vx); bx = true; }
      if (y <= 0) { y = 0; vy = Math.abs(vy); by = true; } else if (y >= H - h) { y = Math.max(0, H - h); vy = -Math.abs(vy); by = true; }
      if (bx || by) next();
      if (bx && by) { hits++; n.textContent = hits; box.classList.remove("is-corner"); void box.offsetWidth; box.classList.add("is-corner"); }
      tile.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0)";
    }
    raf = requestAnimationFrame(step);
    box.addEventListener("click", function (e) { if (!tile.contains(e.target)) stop(); });
    box.addEventListener("keydown", function (e) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter" && document.activeElement === tile) return; // enter on the cover plays it
      if (e.key === "Tab") { e.preventDefault(); tile.focus(); return; }
      e.preventDefault(); e.stopPropagation(); stop();
    });
    if (reel) reel.dispatchEvent(new Event("cc:hold"));
    box.focus({ preventScroll: true });
  }
  function start() {
    if (box) return;
    if (games) { run(games); return; }
    fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
      games = ((d && d.games) || []).filter(function (g) { return g && g.slug && g.title && g.thumbnail; });
      if (!busy() || document.querySelector(".saver")) run(games);
    }).catch(function () { arm(); });
  }
  ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"].forEach(function (ev) { window.addEventListener(ev, arm, { passive: true, capture: true }); });
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else arm(); });
  window.addEventListener("pagehide", function () { clearTimeout(timer); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) { stop(); arm(); } });
  document.addEventListener("cc:saver", function () { clearTimeout(timer); start(); });
  // a window closing (the game window, search) starts a fresh minute, however it was closed
  document.addEventListener("close", arm, true);
  if (reel) reel.addEventListener("cc:release", arm);
  arm();
})();
