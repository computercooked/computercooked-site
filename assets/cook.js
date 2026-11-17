/* "What should we cook next?" (site-backlog #1): the vote card on the home page and the games hub ([data-cook]).
   One tap votes; one vote per device a week (the cc-anon guest id the games use). After a vote the live split shows
   with a Gary line. Server side: src/cook.js (GET/POST /api/cook). If the API can't be reached the buttons stay and
   say so; nothing else on the page depends on this. */
(function () {
  "use strict";
  var cards = document.querySelectorAll("[data-cook]");
  if (!cards.length) return;

  var GARY = {
    "raccoon-heist": "gary has been practising his sneak. he walked into a bin.",
    "fort-knight": "gary already ordered the cannon. it was not cheap.",
    "tiny-volcano": "gary would also like to be worshipped. noted.",
    "pond-merge": "gary dropped a frog on a frog. it was a bigger frog.",
  };
  var LEAD = "your pick is winning. gary is pretending he picked it too.";
  var BEHIND = "your pick is behind. gary says tell a friend. gary says tell two.";

  var anon = null;
  try {
    anon = localStorage.getItem("cc-anon");
    if (!anon || !/^[A-Za-z0-9_-]{8,64}$/.test(anon)) {
      var a = new Uint8Array(12); crypto.getRandomValues(a);
      anon = Array.prototype.map.call(a, function (x) { return "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]; }).join("");
      localStorage.setItem("cc-anon", anon);
    }
  } catch (e) {}

  function nextMonday() {
    var d = new Date(), day = d.getUTCDay();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + ((8 - day) % 7 || 7)));
  }
  function render(card, d) {
    var say = card.querySelector(".cook-say");
    if (!d || !d.ok) { say.textContent = (d && d.error) || "voting is down right now. try again later."; return; }
    var voted = !!d.mine;
    card.classList.toggle("has-voted", voted);
    var best = 0;
    Object.keys(d.counts).forEach(function (k) { best = Math.max(best, d.counts[k]); });
    card.querySelectorAll(".cook-opt").forEach(function (b) {
      var id = b.getAttribute("data-option"), n = d.counts[id] || 0;
      var pct = d.total ? Math.round(n * 100 / d.total) : 0;
      b.setAttribute("aria-pressed", String(id === d.mine));
      b.classList.toggle("is-lead", voted && n > 0 && n === best);
      b.disabled = voted;
      b.querySelector(".cook-bar span").style.width = voted ? pct + "%" : "0";
      b.querySelector(".cook-n").textContent = voted ? pct + "%" : "";
      b.setAttribute("aria-label", b.querySelector(".cook-name").textContent + (voted ? ", " + pct + " percent" + (id === d.mine ? ", your vote" : "") : ""));
    });
    if (!voted) { say.textContent = ""; return; }
    var mineN = d.counts[d.mine] || 0;
    var when = nextMonday().toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    say.textContent = (GARY[d.mine] || "gary saw that.") + " " + (d.total > 1 ? (mineN === best ? LEAD : BEHIND) + " " : "") +
      d.total + (d.total === 1 ? " vote" : " votes") + " so far. vote again " + when + ".";
  }
  function call(opts) {
    return fetch(opts ? "/api/cook" : "/api/cook?anon=" + encodeURIComponent(anon || ""), opts)
      .then(function (r) { return r.json(); }).catch(function () { return null; });
  }

  call().then(function (d) {
    cards.forEach(function (c) { if (d && d.ok) render(c, d); });
  });
  cards.forEach(function (card) {
    card.addEventListener("click", function (e) {
      var b = e.target.closest(".cook-opt");
      if (!b || b.disabled || card.classList.contains("has-voted")) return;
      if (!anon) { card.querySelector(".cook-say").textContent = "this browser won't keep a vote. try another one."; return; }
      card.querySelector(".cook-say").textContent = "voting…";
      call({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anon: anon, option: b.getAttribute("data-option") }) })
        .then(function (d) { cards.forEach(function (c) { render(c, d); }); });
    });
  });
})();
