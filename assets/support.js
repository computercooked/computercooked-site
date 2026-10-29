// /support: the tip button follows the live TIP_URL (/api/tip). If tips are switched off it becomes "coming soon".
(function () {
  var a = document.getElementById("tip-link");
  if (!a) return;
  a.addEventListener("click", function () { if (window.ccHit) window.ccHit("tip_click", { slot: "support" }); });
  fetch("/api/tip").then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j) return; // offline or no API: keep the link the page shipped with
    if (typeof j.url === "string" && j.url.indexOf("https://buy.stripe.com/") === 0) { a.href = j.url; return; }
    var b = document.createElement("button");
    b.type = "button"; b.className = "ghost-btn"; b.disabled = true; b.setAttribute("aria-disabled", "true"); b.textContent = "coming soon";
    a.replaceWith(b);
  }).catch(function () {});
})();
