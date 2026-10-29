/* First visit to the homepage: the computer boots. A fast POST screen types out (under a second), then the screen
   powers on into the cooked desktop. Only on the very first visit on this device (localStorage "cc-booted"), never
   when arriving from bushgrowth.com (that has its own fire), never under reduced motion. Any key, click or tap skips.
   The head script in index.html sets html.cc-bootseq before the first paint so the desk never flashes first. */
(function () {
  "use strict";
  var html = document.documentElement;
  if (!html.classList.contains("cc-bootseq")) return;
  try { localStorage.setItem("cc-booted", "1"); } catch (e) {}

  var games = (document.querySelector("[data-games-count]") || {}).textContent || "";
  var n = (/(\d+)/.exec(games) || [])[1] || "17";
  var LINES = [
    ["COOKED BIOS v4.2", "(c) computer cooked"],
    ["CPU: beige-486 @ 98°C", "HOT", "alarm"],
    ["RAM: 640K, +1 every second", "OK"],
    ["GAMES: " + n + " found", "OK"],
    ["FANS: screaming", "OK"],
    ["C:\\COOKED> run welcome.exe", ""]
  ];
  var box = document.createElement("div");
  box.className = "cc-post";
  box.setAttribute("aria-hidden", "true");
  var pre = document.createElement("div");
  pre.className = "cc-post-text";
  box.appendChild(pre);
  document.body.appendChild(box);

  var i = 0, done = false, timers = [];
  function line() {
    if (done) return;
    if (i >= LINES.length) { timers.push(setTimeout(finish, 180)); return; }
    var l = LINES[i++], row = document.createElement("p");
    row.textContent = l[0];
    if (l[1]) { var b = document.createElement("b"); b.textContent = l[1]; if (l[2]) b.className = l[2]; row.appendChild(b); }
    if (i === LINES.length) { var c = document.createElement("i"); c.textContent = "_"; row.appendChild(c); }
    pre.appendChild(row);
    timers.push(setTimeout(line, i === 1 ? 140 : 85));
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
  setTimeout(finish, 2200);  // never hold the page longer than this, whatever happens
})();
