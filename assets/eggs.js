/* Launch: the homepage's easter eggs and the taskbar news (homepage only; loaded after assets/home.js, before deck.js).
   - cooked news: a ticker in the desktop taskbar. Jokey headlines plus real ones read off the page (game of the week,
     the newest game, today's dailies, your own poking and playing). Pauses on hover and while the desk is off screen;
     with reduced motion it doesn't scroll, it shows one headline at a time. Hidden on narrow phones (home.css).
   - the konami code (up up down down left right left right b a) with the desk on screen: the whole desktop is fully
     cooked for a few seconds and the computer reboots. The site-wide crash screen (assets/deck.js) still shows when the
     desk is scrolled away.
   - type "gary" anywhere on the page (not in a field): the computer waves. "g" is also the deck's "go to games" key, so
     here a lone "g" waits half a second for an "a" and then does exactly what it always did.
   Uses window.ccDesk from assets/home.js; without it nothing here runs. Nothing is sent or stored. */
(function () {
  "use strict";
  var D = window.ccDesk, desk = document.getElementById("desk");
  if (!D || !desk) return;
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function txt(sel) { var n = document.querySelector(sel); return n ? n.textContent.trim() : ""; }
  var deskOn = true;
  if ("IntersectionObserver" in window) new IntersectionObserver(function (es) { deskOn = es[es.length - 1].isIntersecting; news.sync(); }, { threshold: .25 }).observe(desk);

  /* ---------- cooked news ---------- */
  var news = (function () {
    var box = document.getElementById("desk-news"), track = box && box.querySelector(".news-track");
    var api = { sync: function () {}, flash: function () {} };
    if (!box || !track) return api;
    var JOKES = [
      "BREAKING: local computer still cooked. more at 11.", "scientists confirm the fan is not a button.", "computer asks for one (1) day off. request denied.",
      "weather: 98°C and steamy. bring a towel.", "markets: ram up 1 mb a second. analysts bloated.", "update available: no.", "the goose still has a lawyer.",
      "experts agree: press surprise me.", "recycle bin reaches capacity. bin refuses comment.", "printer jams. nation unsurprised.",
      "study: 9 out of 10 computers would rather be a toaster.", "your cursor looks great today. the computer has been staring.", "local man closes pop-up. it was the 1%. it was not."
    ];
    function real() {
      var out = [], feat = txt("#home-featured .game-name"), fresh = txt("#home-new .card2 b"), all = txt("[data-games-count]");
      if (feat) out.push("game of the week: " + feat + ". the computer is nervous.");
      if (fresh) out.push("just cooked: " + fresh + ". still warm.");
      var d3 = window.ccDaily3;
      try {
        if (d3) {
          var done = d3.today().length, of = d3.GAMES.length, st = d3.streak();
          out.push(done >= of ? "daily 3: all done. " + (st > 1 ? st + "-day streak. the computer is proud. weirdly." : "see you after midnight.")
            : "daily 3: " + done + " of " + of + " done today. new ones every midnight.");
        }
      } catch (e) {}
      var n = (/\d+/.exec(all) || [])[0];
      if (n) out.push(n + " games installed. 0 virus scans run.");
      var c = D.cooked();
      if (c > 0) out.push("local computer poked " + c + (c === 1 ? " time" : " times") + " by you. family worried.");
      try { // the game you've played most on this device
        var h = JSON.parse(ls("cc-history") || "{}") || {}, top = null;
        Object.keys(h).forEach(function (s) { if (h[s] && h[s].n > 1 && (!top || h[s].n > h[top].n)) top = s; });
        var card = top && document.querySelector('.card2[data-slug="' + top.replace(/[^a-z0-9-]/g, "") + '"] b');
        if (card) out.push("local user has played " + card.textContent.trim() + " " + h[top].n + " times. sources say: one more.");
      } catch (e) {}
      return out;
    }
    function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
    var lines = [], at = 0, swapT = 0;
    function build() {
      var r = real(), j = shuffle(JOKES.slice());
      lines = [];
      while (r.length || j.length) { if (j.length) lines.push(j.shift()); if (r.length) lines.push(r.shift()); if (j.length > 6 && !r.length) break; }
      track.textContent = "";
      if (reduce) { var one = document.createElement("span"); one.className = "news-run"; one.textContent = lines[0]; track.appendChild(one); return; }
      for (var k = 0; k < 2; k++) { // two copies, so the loop never shows a seam
        var run = document.createElement("span"); run.className = "news-run";
        lines.forEach(function (l) { var s = document.createElement("span"); s.className = "news-item"; s.textContent = l; run.appendChild(s); });
        track.appendChild(run);
      }
      // a steady ~55px a second, whatever the length
      var w = track.firstChild.offsetWidth || 2400;
      track.style.setProperty("--news-t", Math.round(w / 55) + "s");
    }
    // speed pass: built when the browser is idle, not during start-up (it measures the strip, a forced layout); the
    // static headline in the HTML holds the same 28px row until then, so nothing moves.
    function go() {
      build();
      box.classList.add("is-on");
      if (reduce) swapT = setInterval(swap, 7000);
    }
    if ("requestIdleCallback" in window) requestIdleCallback(go, { timeout: 3000 }); else setTimeout(go, 1500);
    function swap() { if (document.hidden || box.classList.contains("is-breaking")) return; at = (at + 1) % lines.length; track.firstChild.textContent = lines[at]; }
    api.sync = function () { box.classList.toggle("is-off", !deskOn); };
    var flashT = 0;
    api.flash = function (t, ms) {
      var f = box.querySelector(".news-flash");
      if (!f) { f = document.createElement("span"); f.className = "news-flash"; box.appendChild(f); }
      f.textContent = t; box.classList.add("is-breaking");
      clearTimeout(flashT); flashT = setTimeout(function () { box.classList.remove("is-breaking"); }, ms || 4000);
    };
    return api;
  })();
  document.addEventListener("cc:melt", function (e) { news.flash(e.detail === "konami" ? "BREAKING: computer fully cooked. cheat code suspected." : "BREAKING: computer melts after repeated poking. user unrepentant.", 4400); });

  /* ---------- konami: the desk is fully cooked ---------- */
  var SEQ = ["arrowup", "arrowup", "arrowdown", "arrowdown", "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"], kAt = 0;
  function inField(t) { return t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.tagName)); }
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || window.ccGameActive || inField(e.target)) { kAt = 0; return; }
    var k = String(e.key).toLowerCase();
    if (k === SEQ[kAt]) kAt++;
    else if (k === "arrowup") kAt = kAt === 2 ? 2 : 1;
    else kAt = 0;
    if (kAt < SEQ.length) return;
    kAt = 0;
    if (!deskOn || document.querySelector("dialog[open]")) return; // deck.js shows its crash screen instead
    e.stopImmediatePropagation(); // just this key: one meltdown, not two (deck.js listens after us)
    // deck.js never saw the "a", so its own count still waits on it: a key nobody uses puts it back to zero
    try { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Unidentified" })); } catch (err) {}
    D.melt();
  });

  /* ---------- type "gary" ---------- */
  var WORD = "gary", typed = "", gT = 0;
  var HI = ["oh. hi. you know my name.", "gary.exe has responded.", "hello. yes. gary. 61% fan noise.", "you typed my name. nobody types my name.", "hi! sorry. hi. i'm warm."];
  var hiN = 0, toast = null, toastT = 0;
  function goGames() { var a = document.querySelector('.deck .deck-link[data-key="g"]'); if (a) a.click(); }
  function wave() {
    var line = HI[hiN++ % HI.length];
    D.react("happy", 2200); D.sfx("fresh");
    document.dispatchEvent(new CustomEvent("cc:secret", { detail: "gary" })); // collected in assets/deck.js
    if (deskOn) {
      D.say(line, 2800);
      if (!reduce) { desk.classList.remove("gary-wave"); void desk.offsetWidth; desk.classList.add("gary-wave"); setTimeout(function () { desk.classList.remove("gary-wave"); }, 1300); }
      return;
    }
    // scrolled away: a little computer pops up in the corner instead
    if (!toast) {
      toast = document.createElement("div"); toast.className = "gary-toast"; toast.setAttribute("role", "status");
      toast.innerHTML = '<img src="/assets/mascot-happy.svg" alt="" width="34" height="48" decoding="async"><span></span>';
      document.body.appendChild(toast);
    }
    toast.lastChild.textContent = line + " i'm up top.";
    toast.classList.remove("on"); void toast.offsetWidth; toast.classList.add("on");
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove("on"); }, 3200);
  }
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || window.ccGameActive || inField(e.target) || document.querySelector("dialog[open]")) { typed = ""; return; }
    var k = String(e.key).toLowerCase();
    if (k.length !== 1) { if (k !== "shift") typed = ""; return; }
    if (gT) { // a "g" is waiting
      clearTimeout(gT); gT = 0;
      if (k === "a") { typed = "ga"; return; }
      typed = ""; goGames(); return; // anything else: the "g" goes to the games, as it always did
    }
    if (k === "g" && !e.defaultPrevented && document.querySelector('.deck .deck-link[data-key="g"]')) {
      e.preventDefault(); // held for half a second; deck.js skips a handled key
      typed = "g";
      gT = setTimeout(function () { gT = 0; typed = ""; goGames(); }, 500);
      return;
    }
    if (typed && k === WORD.charAt(typed.length)) {
      typed += k;
      if (typed === WORD) { typed = ""; wave(); }
      return;
    }
    typed = "";
  });
})();
