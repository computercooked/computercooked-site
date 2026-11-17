/* Card preview loops, shared by the hub (games/hub.js) and the home page.

   window.ccPreview.attach(rootEl, cardSelector)
     Every element inside rootEl that matches cardSelector and carries data-clip="<mp4 url>" (and data-slug) gets a
     muted loop of that clip over its art: the [data-preview-art] element if there is one, else .game-thumb, else
     the first <img>. Cards added to rootEl later are picked up too, so re-rendering a grid needs no second call.
     Calling attach() again on the same root does nothing.

   How it plays:
   - mouse / trackpad (fine pointer): hover or keyboard focus plays the loop, leaving stops it;
   - touch screens: the one card most in view (more than 60% visible) plays, one at a time, while you scroll;
   - never under prefers-reduced-motion or Save-Data (the static art just stays);
   - nothing downloads until a card asks: the <video> is made on first use with preload="none", fades in only once
     it is really playing (the art underneath is the fallback), and is removed again when its card leaves the screen.
   The video is decorative (aria-hidden, no tab stop, no pointer events), so links and buttons on the card still work.
   Self-contained: no stylesheet needed, no dependencies. */
(function () {
  "use strict";
  if (window.ccPreview) return;

  function mq(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
  var off = mq("(prefers-reduced-motion: reduce)") || !!(navigator.connection && navigator.connection.saveData);
  var fine = mq("(hover: hover) and (pointer: fine)");
  var HOVER_WAIT = 120;  // ms: sweeping the mouse across a grid shouldn't start a download on every card
  var SCROLL_WAIT = 260; // ms: a fling past a card shouldn't either
  var SHOW = 0.6;        // touch: a card has to be this much on screen to play

  var playing = null; // the one card playing right now, page-wide

  function art(card) {
    return card.querySelector("[data-preview-art]") || card.querySelector(".game-thumb") || card.querySelector("img");
  }
  // sit exactly on the art (siblings share an offsetParent, so this works in cards, rows and list views alike)
  function place(v, img) {
    v.style.left = img.offsetLeft + "px"; v.style.top = img.offsetTop + "px";
    v.style.width = img.offsetWidth + "px"; v.style.height = img.offsetHeight + "px";
  }
  function make(card) {
    var v = card._ccClip;
    if (v && v.parentNode) return v;
    var src = card.getAttribute("data-clip"), img = art(card);
    if (!src || !img || !img.parentNode) return null;
    v = document.createElement("video");
    v.className = "cc-preview-clip";
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none";
    v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("loop", "");
    v.setAttribute("aria-hidden", "true"); v.setAttribute("tabindex", "-1");
    v.setAttribute("disablepictureinpicture", ""); v.setAttribute("disableremoteplayback", "");
    var s = v.style;
    s.position = "absolute"; s.zIndex = "1"; s.objectFit = "cover"; s.pointerEvents = "none";
    s.opacity = "0"; s.transition = "opacity .2s ease"; s.background = "transparent"; s.margin = "0";
    // fade in once frames are really coming, so a slow network shows the art, never a black box
    v.addEventListener("playing", function () { if (playing === card) { v.style.opacity = "1"; card.classList.add("is-clip-on"); } });
    v.addEventListener("error", function () { // a missing clip: art only, for good (not the src we take away in drop())
      if (card._ccClip !== v) return;
      drop(card); card.removeAttribute("data-clip");
    });
    v.src = src;
    img.insertAdjacentElement("afterend", v);
    card._ccClip = v;
    return v;
  }
  function start(card) {
    if (playing === card) return;
    if (playing) stop(playing);
    var v = make(card);
    if (!v) return;
    playing = card;
    place(v, art(card));
    var p = v.play();
    if (p && p.catch) p.catch(function () { if (playing === card) stop(card); });
  }
  function stop(card) {
    if (playing === card) playing = null;
    card.classList.remove("is-clip-on");
    var v = card._ccClip;
    if (v) { v.style.opacity = "0"; try { v.pause(); } catch (e) {} }
  }
  // off screen: let the browser have the decoder and the memory back
  function drop(card) {
    stop(card);
    var v = card._ccClip;
    card._ccClip = null;
    if (v) { v.removeAttribute("src"); try { v.load(); } catch (e) {} if (v.parentNode) v.parentNode.removeChild(v); }
  }

  var io = null, ratio = [], timer = 0;
  function ensureIO() {
    if (io || !("IntersectionObserver" in window)) return io;
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var card = e.target;
        card._ccRatio = e.isIntersecting ? e.intersectionRatio : 0;
        if (!e.isIntersecting) drop(card);
      });
      if (!fine) { clearTimeout(timer); timer = setTimeout(pick, SCROLL_WAIT); }
    }, { threshold: [0, 0.3, SHOW, 0.8, 1] });
    return io;
  }
  // touch: the card most in view plays; a tie goes to the one nearest the middle of the screen. Never before the page's
  // load event (round 20): the first screen on a phone is the page itself, the clip comes after
  var loadWait = false;
  function pick() {
    if (document.readyState !== "complete") {
      if (!loadWait) { loadWait = true; window.addEventListener("load", function () { setTimeout(pick, SCROLL_WAIT); }, { once: true }); }
      return;
    }
    var best = null, bestR = 0, bestD = 1e9, mid = (window.innerHeight || 0) / 2;
    ratio = ratio.filter(function (c) { return c.isConnected; });
    ratio.forEach(function (c) {
      var r = c._ccRatio || 0;
      if (r < SHOW || c.hidden || !c.getAttribute("data-clip")) return;
      var b = c.getBoundingClientRect(), d = Math.abs(b.top + b.height / 2 - mid);
      if (r > bestR + 0.05 || (Math.abs(r - bestR) <= 0.05 && d < bestD)) { best = c; bestR = r; bestD = d; }
    });
    if (best) start(best); else if (playing) stop(playing);
  }

  function attach(root, sel) {
    if (off || !root || !sel || root._ccPreview) return;
    root._ccPreview = true;
    function scan() {
      var o = ensureIO();
      [].forEach.call(root.querySelectorAll(sel), function (c) {
        if (c._ccSeen || !c.getAttribute("data-clip")) return;
        c._ccSeen = true;
        if (o) { o.observe(c); ratio.push(c); }
      });
    }
    scan();
    if ("MutationObserver" in window) {
      var queued = false;
      new MutationObserver(function () {
        if (queued) return;
        queued = true;
        setTimeout(function () { queued = false; scan(); }, 50);
      }).observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-clip"] }); // a clip added later (home.js, from games.json)
    }
    if (!fine) return;
    var wait = 0;
    function cardOf(t) {
      var c = t && t.closest ? t.closest(sel) : null;
      return c && root.contains(c) && c.getAttribute("data-clip") ? c : null;
    }
    root.addEventListener("mouseover", function (e) {
      var c = cardOf(e.target);
      if (!c || c === playing) return;
      clearTimeout(wait);
      wait = setTimeout(function () { if (c.matches(":hover")) start(c); }, HOVER_WAIT);
    });
    root.addEventListener("mouseout", function (e) {
      var c = cardOf(e.target);
      if (!c || (e.relatedTarget && c.contains(e.relatedTarget))) return;
      clearTimeout(wait);
      if (c === playing && !c.contains(document.activeElement)) stop(c);
    });
    root.addEventListener("focusin", function (e) { var c = cardOf(e.target); if (c) start(c); });
    root.addEventListener("focusout", function (e) {
      var c = cardOf(e.target);
      if (c && c === playing && !(e.relatedTarget && c.contains(e.relatedTarget)) && !c.matches(":hover")) stop(c);
    });
  }

  document.addEventListener("visibilitychange", function () {
    if (document.hidden && playing) stop(playing);
    else if (!document.hidden && !fine && io) pick();
  });
  window.addEventListener("resize", function () {
    if (playing && playing._ccClip) { var a = art(playing); if (a) place(playing._ccClip, a); }
  }, { passive: true });

  window.ccPreview = { attach: attach, enabled: !off };
})();
