/* /surf/: channel surf. One game per channel: its 3 second clip on a little TV, flip with the buttons, the arrow keys
   or a swipe, enter (or a tap on the screen) plays it. Channels follow games.json order, so a game keeps its number.
   "auto surf" (the button, or the a key) flips by itself every 5 seconds; it is not offered under reduced motion.
   Opens on #<slug> when the link has one, otherwise on a random game this device hasn't played yet.
   Reads cc-history (kept by games/platform.js) for "played" marks and your best. Nothing is sent or stored. */
(function () {
  "use strict";
  var tv = document.getElementById("tv");
  if (!tv || !window.fetch) return;
  var $ = function (id) { return document.getElementById(id); };
  var screen = $("tv-screen"), cover = $("tv-cover"), clip = $("tv-clip"), ch = $("tv-ch"), seen = $("tv-seen"),
    title = $("tv-title"), pitch = $("tv-pitch"), tags = $("tv-tags"), best = $("tv-best"), play = $("tv-play"), guide = $("tv-guide");
  var still = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var hist = {};
  try { hist = JSON.parse(localStorage.getItem("cc-history") || "{}") || {}; } catch (e) { hist = {}; }
  var games = [], at = -1, flipTimer = 0;
  // auto surf: flips to the next channel every few seconds until you turn it off, play something or leave the tab
  var AUTO_MS = 5000, autoBtn = $("tv-auto"), bar = $("tv-timer-bar"), autoOn = false, autoTimer = 0;
  function autoArm() {
    clearTimeout(autoTimer);
    if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
    if (autoOn && !document.hidden) autoTimer = setTimeout(function () { show(at + 1); }, AUTO_MS);
  }
  function autoSet(on) {
    autoOn = !!on;
    tv.classList.toggle("is-auto", autoOn);
    if (autoBtn) { autoBtn.setAttribute("aria-pressed", autoOn ? "true" : "false"); autoBtn.textContent = "auto surf: " + (autoOn ? "on" : "off"); }
    autoArm();
  }
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };
  var href = function (g) { return "/games/" + encodeURIComponent(g.slug) + "/?ref=surf"; };

  function show(i, quiet) {
    var n = games.length;
    i = ((i % n) + n) % n;
    if (i === at) return;
    var g = games[i], h = hist[g.slug], prev = guide.children[at], cur = guide.children[i];
    at = i;
    tv.style.setProperty("--tv-accent", (g.theme && /^#[0-9a-f]{3,8}$/i.test(g.theme.accent || "")) ? g.theme.accent : "");
    clip.classList.remove("is-on"); clip.pause();
    cover.src = g.thumbnail; cover.alt = g.title + " cover";
    if (g.clip && !still) {
      clip.src = g.clip;
      var p = clip.play();
      if (p && p.then) p.then(function () { if (games[at] === g) clip.classList.add("is-on"); }).catch(function () {});
    } else clip.removeAttribute("src");
    ch.textContent = "CH " + pad(i + 1);
    seen.hidden = !h;
    title.textContent = g.title;
    pitch.textContent = g.pitch || "";
    tags.textContent = (g.tags || []).slice(0, 3).join(" · ");
    best.hidden = !(h && typeof h.b === "number" && h.b > 0);
    if (!best.hidden) best.textContent = "♛ your best: " + fmt(h.b);
    play.href = screen.href = href(g);
    play.textContent = "play " + g.title + " ▶";
    screen.setAttribute("aria-label", "play " + g.title);
    if (prev) prev.firstChild.removeAttribute("aria-current");
    if (cur) {
      cur.firstChild.setAttribute("aria-current", "true");
      // keep the current channel in view without moving the page
      guide.scrollLeft = cur.offsetLeft - guide.offsetLeft - (guide.clientWidth - cur.offsetWidth) / 2;
    }
    try { history.replaceState(null, "", "#" + g.slug); } catch (e) {}
    if (!quiet && !still) {
      tv.classList.remove("is-flipping"); void tv.offsetWidth; tv.classList.add("is-flipping");
      clearTimeout(flipTimer); flipTimer = setTimeout(function () { tv.classList.remove("is-flipping"); }, 260);
    }
    var next = games[(i + 1) % n];
    if (next) { var im = new Image(); im.src = next.thumbnail; }
    autoArm();
  }

  fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
    games = ((d && d.games) || []).filter(function (g) { return g && g.slug && g.title && g.thumbnail; });
    if (!games.length) return;
    games.forEach(function (g, i) {
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", "channel " + (i + 1) + ": " + g.title);
      if (hist[g.slug]) b.className = "is-seen";
      var im = document.createElement("img"); im.src = g.thumbnail; im.alt = ""; im.loading = "lazy"; im.width = 96; im.height = 60;
      var s = document.createElement("span"); s.textContent = pad(i + 1);
      b.appendChild(im); b.appendChild(s);
      b.addEventListener("click", function () { show(i); });
      var li = document.createElement("li"); li.appendChild(b); guide.appendChild(li);
    });
    var start = -1, want = decodeURIComponent((location.hash || "").slice(1));
    if (want) games.forEach(function (g, i) { if (g.slug === want) start = i; });
    if (start < 0) {
      var fresh = []; games.forEach(function (g, i) { if (!hist[g.slug]) fresh.push(i); });
      start = fresh.length ? fresh[Math.floor(Math.random() * fresh.length)] : Math.floor(Math.random() * games.length);
    }
    tv.hidden = false;
    var empty = $("tv-empty"); if (empty) empty.hidden = true;
    show(start, true);

    $("tv-prev").addEventListener("click", function () { show(at - 1); });
    $("tv-next").addEventListener("click", function () { show(at + 1); });
    document.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || document.querySelector("dialog[open]")) return;
      var t = e.target;
      if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName))) return;
      if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1); }
      else if (e.key === "Enter" && !(t && /^(a|button)$/i.test(t.tagName))) { e.preventDefault(); location.href = play.href; }
      else if ((e.key === "a" || e.key === "A") && autoBtn && !autoBtn.hidden) { e.preventDefault(); autoSet(!autoOn); }
    });
    if (autoBtn && !still) {
      autoBtn.hidden = false;
      autoBtn.addEventListener("click", function () { autoSet(!autoOn); });
      document.addEventListener("visibilitychange", autoArm);
      window.addEventListener("pagehide", function () { clearTimeout(autoTimer); });
    }
    // swipe the screen sideways to flip; a swipe never counts as a tap on the screen
    var x0 = null, y0 = 0, swiped = false;
    screen.addEventListener("touchstart", function (e) { var p = e.touches[0]; x0 = p.clientX; y0 = p.clientY; swiped = false; }, { passive: true });
    screen.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var p = e.changedTouches[0], dx = p.clientX - x0, dy = p.clientY - y0; x0 = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = true; show(at + (dx < 0 ? 1 : -1)); }
    }, { passive: true });
    screen.addEventListener("click", function (e) { if (swiped) { e.preventDefault(); swiped = false; } });
  }).catch(function () { /* the plain link to every game stays */ });
})();
