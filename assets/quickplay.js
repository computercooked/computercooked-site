/* Hub quick play: on a computer, every game card grows a "try it here" button when you point at it (or tab to it).
   It opens that game in a window over the hub (the bare player at /games/<slug>/window/, framed), so you can try a
   game and be back at the list in one click. "next game" swaps to the next card on the page; "full page" goes to the
   game's own page; the x, Esc or a click outside closes it and the game stops. Phones, small windows, touch screens
   and browsers without <dialog> keep the plain links. Nothing is sent or stored here; the player counts the play. */
(function () {
  "use strict";
  var probe = document.createElement("dialog");
  if (!probe.showModal || !window.matchMedia) return;
  var fine = matchMedia("(hover: hover) and (pointer: fine)");
  var big = function () { return fine.matches && innerWidth >= 900 && innerHeight >= 560; };
  var win = null, stage, title, full, next, frame = null, cur = "";
  function slugOf(card) {
    var a = card && card.querySelector("a.game-link");
    return a ? (/^\/games\/([a-z0-9-]+)\/?/.exec(a.getAttribute("href") || "") || [])[1] || "" : "";
  }
  function nameOf(card) { var h = card && card.querySelector(".game-name"); return h ? h.textContent.trim() : ""; }
  function arm(card) {
    if (!card || !big() || card.querySelector(".game-try")) return;
    var slug = slugOf(card); if (!slug) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "game-try"; b.dataset.try = slug;
    b.textContent = "▶ try it here"; b.setAttribute("aria-label", "try " + (nameOf(card) || slug) + " here, in a window");
    card.appendChild(b);
  }
  function cards() {
    // every visible card once, in page order
    var seen = {}, list = [];
    [].forEach.call(document.querySelectorAll(".game-card"), function (c) {
      var s = slugOf(c);
      if (s && !seen[s] && !c.hidden && c.offsetParent) { seen[s] = 1; list.push({ slug: s, name: nameOf(c) || s }); }
    });
    return list;
  }
  function build() {
    win = document.createElement("dialog"); win.className = "qp-win"; win.setAttribute("aria-labelledby", "qp-title");
    win.innerHTML = '<div class="qp-bar"><span class="qp-title" id="qp-title"></span><span class="qp-tools">' +
      '<button type="button" class="qp-next" id="qp-next">next game ▶</button><a class="qp-full" id="qp-full" href="/games/">full page ↗</a>' +
      '<button type="button" class="qp-x" id="qp-x" aria-label="close the game">✕</button></span></div>' +
      '<div class="qp-stage" id="qp-stage"><p class="qp-load" aria-hidden="true">C:\\COOKED&gt; loading_</p></div>';
    document.body.appendChild(win);
    stage = win.querySelector("#qp-stage"); title = win.querySelector("#qp-title"); full = win.querySelector("#qp-full"); next = win.querySelector("#qp-next");
    win.querySelector("#qp-x").addEventListener("click", bye);
    win.addEventListener("click", function (e) { if (e.target === win) bye(); }); // the backdrop
    win.addEventListener("cancel", function (e) { e.preventDefault(); bye(); });
    win.addEventListener("close", shut);
    next.addEventListener("click", function () {
      var list = cards(), at = -1;
      list.forEach(function (g, i) { if (g.slug === cur) at = i; });
      if (list.length) load(list[(at + 1) % list.length]);
    });
  }
  function shut() { if (frame) { frame.remove(); frame = null; } cur = ""; }
  function bye() { if (win.open) win.close(); shut(); }
  function load(g) {
    if (frame) frame.remove();
    cur = g.slug;
    title.textContent = "C:\\COOKED\\" + g.name + ".exe";
    full.href = "/games/" + encodeURIComponent(g.slug) + "/";
    frame = document.createElement("iframe");
    frame.title = g.name; frame.allow = "fullscreen; autoplay"; frame.src = "/games/" + encodeURIComponent(g.slug) + "/window/";
    stage.appendChild(frame);
    next.hidden = cards().length < 2;
    frame.focus();
  }
  document.addEventListener("mouseover", function (e) { var c = e.target.closest && e.target.closest(".game-card"); if (c) arm(c); });
  document.addEventListener("focusin", function (e) { var c = e.target.closest && e.target.closest(".game-card"); if (c) arm(c); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest(".game-try"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (!win) build();
    var card = b.closest(".game-card");
    if (!win.open) win.showModal();
    load({ slug: b.dataset.try, name: nameOf(card) || b.dataset.try });
  });
})();
