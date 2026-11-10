/* /champs/: the wall of epic gamers. Two small things the server can't know:
   1. crown dates in the visitor's own time zone (the server writes them in UTC);
   2. "your best" on each game this device has played (cc-history, kept by games/platform.js): how far you are from the crown.
   No network, nothing stored. Without this file the page still reads fine. */
(function () {
  "use strict";
  var MONTHS = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };

  var times = document.querySelectorAll(".champ-card time[datetime]");
  for (var i = 0; i < times.length; i++) {
    var d = new Date(times[i].getAttribute("datetime"));
    if (isNaN(d)) continue;
    var days = Math.round((new Date().setHours(0, 0, 0, 0) - new Date(d).setHours(0, 0, 0, 0)) / 86400000);
    times[i].textContent = days === 0 ? "today" : days === 1 ? "yesterday" : MONTHS[d.getMonth()] + " " + d.getDate();
    times[i].title = d.toLocaleString();
  }

  var hist = {};
  try { hist = JSON.parse(localStorage.getItem("cc-history") || "{}") || {}; } catch (e) { hist = {}; }
  var cards = document.querySelectorAll(".champ-card[data-slug]");
  for (var j = 0; j < cards.length; j++) {
    var card = cards[j], h = hist[card.getAttribute("data-slug")], top = parseFloat(card.getAttribute("data-score"));
    var slot = card.querySelector(".champ-you");
    if (!slot || !h || typeof h.b !== "number" || !(h.b > 0) || isNaN(top)) continue;
    var gap = Math.round(top) - Math.round(h.b);
    slot.textContent = gap > 0 ? "your best: " + fmt(h.b) + ". " + fmt(gap) + " to go."
      : "your best: " + fmt(h.b) + ". that's crown level. go post it.";
    if (gap <= 0) slot.classList.add("is-there");
    else if (h.b / top >= 0.8) slot.classList.add("is-close");
    slot.hidden = false;
    card.classList.add("has-you");
  }
})();
