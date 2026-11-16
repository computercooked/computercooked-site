/* /champs/: the wall of epic gamers. src/champs.js renders every plaque on the server; this file only adds:
   1. crown dates in the visitor's own time zone (the server writes them in UTC) and a live "held 3 days";
   2. "your best" on each game this device has played (cc-history, kept by games/platform.js): how far you are from the crown;
   3. Gary's commentator lines: poke him for the next one; they also turn over on their own (not with reduced motion);
   4. sorting the wall (newest crowns / longest reigns / free crowns first);
   5. plaques below the fold power on like a CRT as they scroll in (none with reduced motion).
   No network, nothing stored. Without this file the page still reads fine. */
(function () {
  "use strict";
  var MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
  var DAY = 86400000, HOUR = 3600000;
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };
  var calm = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  var wall = document.getElementById("champ-list");
  if (!wall) return;
  var plaques = Array.prototype.slice.call(wall.querySelectorAll(".plaque[data-slug]"));

  // 1. dates and "held for"
  var held = function (ms) {
    if (!(ms >= 0)) return "";
    if (ms < HOUR) return "held for minutes";
    if (ms < DAY) { var h = Math.floor(ms / HOUR); return "held " + h + " hour" + (h === 1 ? "" : "s"); }
    var d = Math.floor(ms / DAY); return "held " + d + " day" + (d === 1 ? "" : "s");
  };
  var times = wall.querySelectorAll("time[datetime]");
  for (var i = 0; i < times.length; i++) {
    var d = new Date(times[i].getAttribute("datetime"));
    if (isNaN(d)) continue;
    var days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / DAY);
    times[i].textContent = days === 0 ? "today" : days === 1 ? "yesterday" : MONTHS[d.getMonth()] + " " + d.getDate();
    times[i].title = d.toLocaleString();
  }
  var tickHeld = function () {
    var t = Date.now();
    plaques.forEach(function (p) {
      var ts = parseFloat(p.getAttribute("data-ts")), slot = p.querySelector("[data-held]");
      if (slot && ts > 0 && ts <= t) slot.textContent = held(t - ts);
    });
  };
  tickHeld();
  setInterval(tickHeld, 60000);

  // 2. your best, from this device's history
  var hist = {};
  try { hist = JSON.parse(localStorage.getItem("cc-history") || "{}") || {}; } catch (e) { hist = {}; }
  plaques.forEach(function (card) {
    var h = hist[card.getAttribute("data-slug")], slot = card.querySelector(".champ-you");
    if (!slot || !h || typeof h.b !== "number" || !(h.b > 0)) return;
    if (card.classList.contains("is-free")) {
      slot.textContent = "your best: " + fmt(h.b) + ". post a score and it's yours.";
      slot.classList.add("is-there");
    } else {
      var top = parseFloat(card.getAttribute("data-score"));
      if (isNaN(top)) return;
      var gap = Math.round(top) - Math.round(h.b);
      slot.textContent = gap > 0 ? "your best: " + fmt(h.b) + ". " + fmt(gap) + " to go."
        : "your best: " + fmt(h.b) + ". that's crown level. go post it.";
      if (gap <= 0) slot.classList.add("is-there");
      else if (h.b / top >= 0.8) slot.classList.add("is-close");
    }
    slot.hidden = false;
    card.classList.add("has-you");
  });

  // 3. Gary commentating
  var says = document.querySelector("[data-says-text]"), poke = document.querySelector("[data-gary-poke]");
  var box = document.querySelector("[data-champ-says]");
  var lines = Array.prototype.map.call(document.querySelectorAll("[data-says-lines] li"), function (li) { return li.textContent; });
  if (says && poke && lines.length) {
    var at = 0, timer = 0, paused = false;
    var show = function (n, loud) {
      at = (n + lines.length) % lines.length;
      if (box) box.setAttribute("aria-live", loud ? "polite" : "off");
      says.textContent = lines[at];
      if (!calm && box) { box.classList.remove("is-new"); void box.offsetWidth; box.classList.add("is-new"); }
    };
    var auto = function () {
      clearInterval(timer);
      if (calm || lines.length < 2) return;
      timer = setInterval(function () { if (!paused && !document.hidden) show(at + 1, false); }, 9000);
    };
    poke.addEventListener("click", function () {
      show(at + 1, true);
      if (!calm) { poke.classList.remove("is-poked"); void poke.offsetWidth; poke.classList.add("is-poked"); }
      auto();
    });
    var hold = function (v) { return function () { paused = v; }; };
    var head = poke.parentNode;
    head.addEventListener("mouseenter", hold(true)); head.addEventListener("mouseleave", hold(false));
    head.addEventListener("focusin", hold(true)); head.addEventListener("focusout", hold(false));
    auto();
  }

  // 4. sorting the wall
  var tools = document.querySelector("[data-wall-tools]");
  if (tools && plaques.length > 1) {
    var btns = Array.prototype.slice.call(tools.querySelectorAll("[data-sort]"));
    var hasFree = wall.querySelector(".plaque.is-free"), hasHeld = wall.querySelector(".plaque:not(.is-free)");
    btns.forEach(function (b) {
      var k = b.getAttribute("data-sort");
      if ((k === "free" && (!hasFree || !hasHeld)) || (k === "old" && !hasHeld)) b.hidden = true;
      b.addEventListener("click", function () {
        var ts = function (p) { return parseFloat(p.getAttribute("data-ts")) || 0; };
        var idx = function (p) { return parseFloat(p.getAttribute("data-i")) || 0; };
        var free = function (p) { return p.classList.contains("is-free") ? 1 : 0; };
        var by = k === "old" ? function (a, b2) { return free(a) - free(b2) || ts(a) - ts(b2); }
          : k === "free" ? function (a, b2) { return free(b2) - free(a) || idx(a) - idx(b2); }
          : function (a, b2) { return idx(a) - idx(b2); };
        plaques.slice().sort(by).forEach(function (p) { p.classList.remove("is-off"); wall.appendChild(p); });
        btns.forEach(function (o) { o.setAttribute("aria-pressed", o === b ? "true" : "false"); });
      });
    });
    tools.classList.add("is-ready");
  }

  // 5. power on as they scroll in: only plaques that start below the fold, so nothing on screen blinks out
  if (!calm && "IntersectionObserver" in window && plaques.length) {
    var io = new IntersectionObserver(function (entries) {
      var n = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var p = en.target;
        io.unobserve(p);
        if (!p.classList.contains("is-off")) return;
        p.style.animationDelay = Math.min(n++ * 70, 280) + "ms";
        p.classList.remove("is-off");
        p.classList.add("is-on");
        p.addEventListener("animationend", function () { p.classList.remove("is-on"); p.style.animationDelay = ""; }, { once: true });
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    var fold = window.innerHeight || document.documentElement.clientHeight;
    plaques.forEach(function (p) {
      if (p.getBoundingClientRect().top > fold) { p.classList.add("is-off"); io.observe(p); }
    });
    // a plaque that takes keyboard focus while still dark lights up at once
    wall.addEventListener("focusin", function (e) {
      var p = e.target.closest && e.target.closest(".plaque.is-off");
      if (p) { p.classList.remove("is-off"); io.unobserve(p); }
    });
  }
})();
