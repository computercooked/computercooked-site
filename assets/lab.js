// /lab vote (K-0031 item 10): one vote per player (the same guest id the games use), changeable; the numbers
// show once you've voted. Server side: src/lab.js.
(function () {
  var list = document.getElementById("poll");
  if (!list) return;
  var status = document.querySelector(".poll-status");
  var anon = null;
  try {
    anon = localStorage.getItem("cc-anon");
    if (!anon || !/^[A-Za-z0-9_-]{8,64}$/.test(anon)) {
      var a = new Uint8Array(12); crypto.getRandomValues(a);
      anon = Array.prototype.map.call(a, function (x) { return "abcdefghijklmnopqrstuvwxyz0123456789"[x % 36]; }).join("");
      localStorage.setItem("cc-anon", anon);
    }
  } catch (e) {}
  function say(t) { if (status) status.textContent = t; }
  function render(d) {
    if (!d || !d.ok) { say("voting is down right now. try again later."); return; }
    var show = !!d.mine;
    list.classList.toggle("has-voted", show);
    list.querySelectorAll(".poll-opt").forEach(function (b) {
      var id = b.getAttribute("data-option"), n = d.counts[id] || 0;
      var pct = d.total ? Math.round(n * 100 / d.total) : 0;
      b.setAttribute("aria-pressed", String(id === d.mine));
      b.querySelector(".poll-bar span").style.width = show ? pct + "%" : "0";
      b.querySelector(".poll-n").textContent = show ? pct + "%" : "";
      b.setAttribute("aria-label", b.querySelector("b").textContent + (show ? ", " + pct + " percent" : ""));
    });
    say(show ? d.total + (d.total === 1 ? " vote" : " votes") + " so far. you can change yours any time." : "");
  }
  function call(opts) {
    return fetch(opts ? "/api/lab/vote" : "/api/lab/votes?anon=" + encodeURIComponent(anon || ""), opts)
      .then(function (r) { return r.json(); }).catch(function () { return null; });
  }
  call().then(function (d) { if (d && d.ok) render(d); });
  list.addEventListener("click", function (e) {
    var b = e.target.closest(".poll-opt");
    if (!b || !anon) return;
    say("voting…");
    call({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anon: anon, option: b.getAttribute("data-option") }) })
      .then(render);
  });
})();
