/* First visit to the homepage: the computer boots. A fast POST screen types out, then the screen powers on into the
   cooked desktop. Only on the very first visit on this device (the head script sets localStorage "cc-booted" the
   moment it decides), never when arriving from bushgrowth.com (that has its own fire), never under reduced motion.
   Any key, click or tap skips it. Loaded async, so it starts as soon as it arrives instead of after the whole page;
   the page is never held past about 1.8 s from navigation (K-0048: a slow test box saw ~4 s). If this script never
   runs, the head style lifts the cover by itself at 2.4 s. */
(function () {
  "use strict";
  var html = document.documentElement;
  if (!html.classList.contains("cc-bootseq")) return;
  function count() {   // read when that line types: the page below may still be arriving
    var g = (document.querySelector("[data-games-count]") || {}).textContent || "";
    return (/(\d+)/.exec(g) || [])[1] || "all the";
  }
  var LINES = [
    ["COOKED BIOS v4.2", "(c) computer cooked"],
    ["CPU: beige-486 @ 98°C", "HOT", "alarm"],
    ["RAM: 640K, +1 every second", "OK"],
    ["GAMES: # found", "OK"],
    ["FANS: screaming", "OK"],
    ["C:\\COOKED> run welcome.exe", ""]
  ];
  var box = document.createElement("div");
  box.className = "cc-post";
  box.setAttribute("aria-hidden", "true");
  var pre = document.createElement("div");
  pre.className = "cc-post-text";
  box.appendChild(pre);
  (document.body || document.documentElement).appendChild(box);

  var i = 0, done = false, timers = [];
  function line() {
    if (done) return;
    if (i >= LINES.length) { timers.push(setTimeout(finish, 180)); return; }
    var l = LINES[i++], row = document.createElement("p");
    row.textContent = l[0].replace("#", count());
    if (l[1]) { var b = document.createElement("b"); b.textContent = l[1]; if (l[2]) b.className = l[2]; row.appendChild(b); }
    if (i === LINES.length) { var c = document.createElement("i"); c.textContent = "_"; row.appendChild(c); }
    pre.appendChild(row);
    timers.push(setTimeout(line, i === 1 ? 110 : 70));
  }
  function finish() {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    html.classList.remove("cc-bootseq");
    box.classList.add("off");
    setTimeout(function () { box.remove(); }, 420);
    ["keydown", "pointerdown"].forEach(function (t) { removeEventListener(t, finish, true); });
  }
  ["keydown", "pointerdown"].forEach(function (t) { addEventListener(t, finish, true); });
  line();
  setTimeout(finish, Math.max(250, 1800 - (window.performance ? performance.now() : 0)));  // ~1.8 s from navigation at most
})();
