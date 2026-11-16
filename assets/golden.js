/* Golden gary (golden.css; deck.js loads it when idle). First after 40-90 s visible, then 3+ min apart, 5 a day.
   +25 xp to cc-guest-xp (.xp only), cc-golden {caught, firstAt, lastAt}; 1 in 20 cursed (+50). Test: ?golden=now|cursed */
(function () {
  "use strict";
  var D = document;
  if (window.ccGolden || self != top || D.getElementById("game-frame")) return;
  function st(s) { return s ? sessionStorage : localStorage; }
  function rd(k, d, s) { try { return JSON.parse(st(s).getItem(k)) || d; } catch (e) { return d; } }
  function wr(k, v, s) { try { st(s).setItem(k, JSON.stringify(v)); } catch (e) {} }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  var still = matchMedia("(prefers-reduced-motion: reduce)").matches, G = "golden gary caught. +25 xp. ", X = "+25 xp. ", C = "+50 xp. ";
  var LINES = [G + "he's fine. he's gold now.", X + "gary has been gilded. he did not consent. he's thriving.",
    G + "he's worth more than the computer now.", X + "gary says the gold is load-bearing.",
    X + "he's been returned to the vault. there is no vault.", X + "he went gold by overheating in a very specific way.",
    G + "do not bite him to check.", X + "that was 24 karat gary. the fans are louder now.",
    X + "he's asking about his pension.", X + "gary is gold for one more second. there. beige again."];
  var CURSED = ["cursed gary caught. " + C + "he's warm. he shouldn't be this warm.", C + "that was not gary. gary is fine. stop asking about gary.",
    C + "the computer has filed a complaint with the computer.", C + "you touched the cursed one. the fans spin backwards now.",
    C + "cursed gary says hi. in all caps. we lowercased it for you."];
  var css = D.createElement("link"), q = /[?&]golden=(now|cursed)/.exec(location.search);
  css.rel = "stylesheet"; css.href = "/assets/golden.css";
  css.onload = function () { if (q) spawn(q[1] == "cursed" || null); };
  D.head.appendChild(css);
  var tst = D.createElement("p"), tt = 0, btn = null;
  tst.className = "gg-toast"; tst.setAttribute("role", "status");
  D.body.appendChild(tst);

  function field() {
    var a = D.activeElement;
    return a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) ? a.getBoundingClientRect() : null;
  }
  function over(f, l, r, t, b) { return f && f.left < r && f.right > l && f.top < b && f.bottom > t; }
  function spawn(cursed) {
    if (btn) return false;
    if (cursed == null) cursed = rnd(0, 1) < .05;
    var W = innerWidth, ph = W < 768, top = ph ? 24 : 76, y = Math.round(rnd(top, Math.max(top, innerHeight - 53 - (ph ? 100 : 72)))),
      side = rnd(0, 1) < .5 ? "l" : "r", drift = !still && rnd(0, 1) < .4, f = field();
    function hits(sd) { var x = drift || sd == "l" ? 0 : W - 72; return over(f, x, drift ? W : x + 72, y - 8, y + 61); }
    if (hits(side)) side = side == "l" ? "r" : "l";
    if (hits(side)) return false;
    btn = D.createElement("button");
    btn.className = "gg gg-" + (drift ? "drift" : "peek") + " gg-" + side + (cursed ? " gg-cursed" : "") + (still ? " gg-still" : "");
    btn.setAttribute("aria-label", "golden gary: click for xp");
    btn.style.top = y + "px";
    if (drift) btn.style.setProperty("--dx", (side == "l" ? 1 : -1) * (W + 72) + "px");
    btn.innerHTML = '<img src="/assets/gary.svg" alt="" width="48" height="53">';
    btn.onclick = caught;
    btn.onanimationend = function (e) { if (e.target == this) { this.remove(); btn = null; } };
    D.body.appendChild(btn);
    return true;
  }
  function caught() {
    if (this.dataset.done) return;
    this.dataset.done = 1;
    var r = this.getBoundingClientRect(), cursed = this.classList.contains("gg-cursed"), g = rd("cc-guest-xp", {}), c = rd("cc-golden", {}), now = Date.now(), l = cursed ? CURSED : LINES;
    this.style.cssText = "left:" + r.left + "px;top:" + r.top + "px;right:auto";
    this.classList.add("gg-caught");
    if (!still) burst(r.left + 24, r.top + 26, cursed);
    if (typeof g != "object") g = {};
    g.xp = (+g.xp || 0) + (cursed ? 50 : 25); wr("cc-guest-xp", g);
    c.caught = (+c.caught || 0) + 1; c.firstAt = c.firstAt || now; c.lastAt = now; wr("cc-golden", c);
    tst.textContent = l[Math.floor(Math.random() * l.length)];
    tst.classList.add("on"); clearTimeout(tt);
    tt = setTimeout(function () { tst.classList.remove("on"); }, 4200);
  }
  function burst(x, y, cursed) {
    var b = D.createElement("div"), h = "", i, a, d;
    b.className = "gg-burst" + (cursed ? " gg-cursed" : "");
    b.style.cssText = "left:" + x + "px;top:" + y + "px";
    for (i = 0; i < 12; i++) { a = i * 0.52; d = 28 + i % 3 * 12; h += '<i style="--x:' + Math.round(Math.cos(a) * d) + "px;--y:" + Math.round(Math.sin(a) * d) + 'px"></i>'; }
    b.innerHTML = h;
    D.body.appendChild(b);
    setTimeout(function () { b.remove(); }, 800);
  }
  D.addEventListener("visibilitychange", function () { if (btn) btn.classList.toggle("gg-paused", D.hidden); });
  D.addEventListener("focusin", function () {
    var r = btn && !btn.dataset.done && btn.getBoundingClientRect();
    if (r && over(field(), r.left, r.right, r.top, r.bottom)) { btn.dataset.done = 1; btn.classList.add("gg-shoo"); }
  });

  // t: visible seconds this visit (sessionStorage); cc-golden-day: shown today, last shown (any tab)
  // the 1 s clock only runs while the tab is visible (speed pass: no wake-ups in a background tab); the count is saved
  // every 5 s and when the tab hides or the page goes, not on every tick
  var t = rd("cc-golden-t", null, 1) || { s: 0, due: Math.round(rnd(40, 90)) }, clk = 0;
  function save() { wr("cc-golden-t", t, 1); }
  function run() { if (!clk && !D.hidden) clk = setInterval(tick, 1000); }
  D.addEventListener("visibilitychange", function () { if (D.hidden) { clearInterval(clk); clk = 0; save(); } else run(); });
  addEventListener("pagehide", save);
  run();
  function tick() {
    if (D.hidden) return;
    t.s++;
    if (!btn && t.s >= t.due) {
      var d = rd("cc-golden-day", {}), now = Date.now(), k = new Date().toDateString();
      if (d.d != k) d = { d: k, n: 0, t: 0 };
      if (d.n >= 5) t.due = t.s + 600;
      else if (now - d.t < 180000) t.due = t.s + 30;
      else if (D.querySelector("dialog[open], .is-boss") || !spawn(null)) t.due = t.s + 15;
      else { d.n++; d.t = now; wr("cc-golden-day", d); t.due = t.s + Math.round(rnd(180, 300)); }
    }
    if (t.s % 5 === 0) save();
  }
  window.ccGolden = { spawn: function (c) { return spawn(c == null ? null : !!c); } };
})();
