/* The Computer Cooked computer: the one mascot (K-0044). Pixel art redrawn from the brand avatar, built by
   scripts/mascot/mascot2.py (body, steam, flame and slime from the art; faces drawn so they can change).
   window.ccMascot.mount(el, { track: true, size: 240, mood: "sad", interactive: true }) -> controller
     controller.mood("sad" | "happy" | "shock" | "cooked")   change face (blinks only when sad)
     controller.look(x, y)                                     look at a point on the page (clientX/Y)
     controller.react("cooked" | "happy" | "shock", ms)        a face for a moment, then back
     controller.el                                             the svg
   Eyes follow the pointer, it blinks, the steam rises and the flame flickers. With prefers-reduced-motion it
   stays still (no tracking, no animation). Clicking it cooks it a little more. */
(function () {
  "use strict";
  var P = __PARTS__;
  var NS = "http://www.w3.org/2000/svg";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  function rects(runs) {
    var s = "";
    for (var i = 0; i < runs.length; i++) { var r = runs[i]; s += '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="1" fill="' + r[3] + '"/>'; }
    return s;
  }
  var STATIC = (function () {
    var steam = P.steam.map(function (w, i) { return '<g class="ccm-wisp ccm-wisp' + i + '">' + rects(w) + "</g>"; }).join("");
    return { steam: steam, body: rects(P.body), flame: rects(P.flame), slime: rects(P.slime) };
  })();
  var FACE = {};
  Object.keys(P.faces).forEach(function (k) { FACE[k] = rects(P.faces[k]); });

  var css = ".ccm{display:block;overflow:visible;image-rendering:pixelated}" +
    ".ccm .ccm-wisp{transform-box:fill-box;transform-origin:50% 100%}" +
    ".ccm .ccm-flame{transform-box:fill-box;transform-origin:50% 100%}" +
    ".ccm-face{transition:transform .12s steps(2)}" +
    "@media (prefers-reduced-motion:no-preference){" +
    ".ccm .ccm-wisp{animation:ccm-steam 2.4s ease-in-out infinite}" +
    ".ccm .ccm-wisp1{animation-delay:-.8s}.ccm .ccm-wisp2{animation-delay:-1.6s}" +
    ".ccm .ccm-flame{animation:ccm-flame .5s steps(3) infinite alternate}" +
    ".ccm .ccm-slime{animation:ccm-slime 3.2s ease-in-out infinite}" +
    ".ccm.is-cooking .ccm-all{animation:ccm-shake .08s steps(2) 6}" +
    ".ccm.is-cooking .ccm-wisp{animation-duration:.7s}" +
    ".ccm.is-cooking .ccm-flame{animation:ccm-flame-big .18s steps(2) infinite alternate}}" +
    "@keyframes ccm-steam{0%{transform:translateY(2px) scaleY(.85);opacity:.35}50%{opacity:1}100%{transform:translateY(-3px) scaleY(1.1);opacity:.25}}" +
    "@keyframes ccm-flame{from{transform:scale(1,1)}to{transform:scale(.9,1.12)}}" +
    "@keyframes ccm-flame-big{from{transform:scale(1.1,1.2)}to{transform:scale(1.25,1.6)}}" +
    "@keyframes ccm-slime{0%,100%{transform:translateY(0)}50%{transform:translateY(.6px)}}" +
    "@keyframes ccm-shake{from{transform:translate(-.6px,0)}to{transform:translate(.6px,0)}}";
  function style() {
    if (document.getElementById("ccm-style")) return;
    var s = document.createElement("style"); s.id = "ccm-style"; s.textContent = css; document.head.appendChild(s);
  }

  function svg(mood, label) {
    return '<svg class="ccm" xmlns="' + NS + '" viewBox="0 0 ' + P.w + " " + P.h + '" shape-rendering="crispEdges" role="img" aria-label="' + (label || "the computer cooked computer, steaming") + '">' +
      '<g class="ccm-all"><g class="ccm-steam">' + STATIC.steam + '</g><g class="ccm-body">' + STATIC.body + '</g><g class="ccm-flame">' + STATIC.flame +
      '</g><g class="ccm-slime">' + STATIC.slime + '</g><g class="ccm-face"><g class="ccm-mood">' + FACE[mood || "sad"] + "</g></g></g></svg>";
  }

  var all = [];
  function mount(el, o) {
    o = o || {};
    style();
    el.innerHTML = svg(o.mood, o.label);
    var s = el.firstChild, face = s.querySelector(".ccm-face"), moodEl = s.querySelector(".ccm-mood");
    if (o.size) { s.style.width = o.size + "px"; s.style.height = "auto"; }
    var base = o.mood || "sad", cur = base, back = null;
    function set(m) { if (m === cur || !FACE[m]) return; cur = m; moodEl.innerHTML = FACE[m]; }
    var c = {
      el: s,
      mood: function (m) { base = m; if (!back) set(m); },
      react: function (m, ms) { clearTimeout(back); set(m); back = setTimeout(function () { back = null; set(base); }, ms || 900); },
      look: function (x, y) {
        if (reduce) return;
        var r = s.getBoundingClientRect();
        if (!r.width) return;
        var cx = r.left + r.width * 0.43, cy = r.top + r.height * 0.52;
        var dx = Math.max(-1, Math.min(1, (x - cx) / Math.max(80, r.width * 0.55))), dy = Math.max(-1, Math.min(1, (y - cy) / Math.max(80, r.height * 0.45)));  // K-0048: bigger tracking
        face.style.transform = "translate(" + Math.round(dx * 4) + "px," + Math.round(dy * 3) + "px)";
      }
    };
    // blinks now and then, only with the resting face
    if (!reduce) (function blink() {
      setTimeout(function () {
        if (cur === "sad" && !back) { set("blink"); setTimeout(function () { if (cur === "blink") set("sad"); blink(); }, 140); }
        else blink();
      }, 2200 + Math.random() * 3800);
    })();
    if (o.interactive !== false) {
      s.style.cursor = "pointer";
      s.addEventListener("click", function () {
        c.react("cooked", 1400);
        s.classList.remove("is-cooking"); void s.getBoundingClientRect(); s.classList.add("is-cooking");
        setTimeout(function () { s.classList.remove("is-cooking"); }, 1400);
        el.dispatchEvent(new CustomEvent("ccm:cooked", { bubbles: true }));
      });
    }
    if (o.track !== false) all.push(c);
    return c;
  }

  // one pointer listener for every mounted mascot, throttled to a frame
  var px = -1, py = -1, raf = 0;
  if (!reduce) window.addEventListener("pointermove", function (e) {
    px = e.clientX; py = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; for (var i = 0; i < all.length; i++) all[i].look(px, py); });
  }, { passive: true });

  window.ccMascot = { mount: mount, svg: svg, moods: Object.keys(FACE) };
  // <span data-mascot data-mood="happy" data-size="120"></span> mounts itself
  function auto() {
    var els = document.querySelectorAll("[data-mascot]:not([data-mascot-on])");
    for (var i = 0; i < els.length; i++) {
      var e = els[i]; e.setAttribute("data-mascot-on", "");
      mount(e, { mood: e.getAttribute("data-mood") || "sad", size: +e.getAttribute("data-size") || 0, interactive: e.hasAttribute("data-poke"), track: !e.hasAttribute("data-still"), label: e.getAttribute("data-label") });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", auto); else auto();
})();
