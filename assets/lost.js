/* 404 page: "the computer found these instead". Three games picked from /games/games.json, ones this device
   hasn't played first (cc-history, kept by games/platform.js), each with its cover and its 3 second clip on hover.
   Without this file the plain links underneath still work. Nothing is sent or stored. */
(function () {
  "use strict";
  var box = document.getElementById("lost-picks"), list = document.getElementById("lost-pick-list");
  if (!box || !list || !window.fetch) return;
  var still = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var hist = {};
  try { hist = JSON.parse(localStorage.getItem("cc-history") || "{}") || {}; } catch (e) { hist = {}; }
  var shuffle = function (a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  fetch("/games/games.json").then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); }).then(function (d) {
    var games = ((d && d.games) || []).filter(function (g) { return g && g.slug && g.title && g.thumbnail; });
    if (games.length < 3) return;
    var fresh = shuffle(games.filter(function (g) { return !hist[g.slug]; })), old = shuffle(games.filter(function (g) { return hist[g.slug]; }));
    fresh.concat(old).slice(0, 3).forEach(function (g) {
      var a = document.createElement("a");
      a.className = "lost-pick"; a.href = "/games/" + encodeURIComponent(g.slug) + "/?ref=404";
      if (g.theme && /^#[0-9a-f]{3,8}$/i.test(g.theme.accent || "")) a.style.setProperty("--pick-accent", g.theme.accent);
      var shot = document.createElement("span"); shot.className = "lost-pick-shot";
      var im = document.createElement("img"); im.src = g.thumbnail; im.alt = ""; im.width = 320; im.height = 200;
      shot.appendChild(im);
      if (g.clip && !still) {
        var v = document.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true; v.preload = "none"; v.setAttribute("aria-hidden", "true");
        shot.appendChild(v);
        var on = function () { if (!v.src) v.src = g.clip; var p = v.play(); if (p && p.then) p.then(function () { v.classList.add("is-on"); }).catch(function () {}); };
        var off = function () { v.classList.remove("is-on"); v.pause(); };
        a.addEventListener("pointerenter", on); a.addEventListener("focus", on);
        a.addEventListener("pointerleave", off); a.addEventListener("blur", off);
      }
      var t = document.createElement("b"); t.className = "lost-pick-title"; t.textContent = g.title;
      var p = document.createElement("span"); p.className = "lost-pick-pitch"; p.textContent = g.pitch || "";
      a.appendChild(shot); a.appendChild(t); a.appendChild(p);
      var li = document.createElement("li"); li.appendChild(a); list.appendChild(li);
    });
    box.hidden = false;
  }).catch(function () { /* the plain links stay */ });
})();
