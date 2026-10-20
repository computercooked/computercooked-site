/* Installable web app: registers /sw.js (offline copies of the games you've played) and, on the hub, shows an
   "add to home screen" card when the browser offers it (Chrome/Edge/Android) or a how-to on iPhone Safari.
   No dependencies. The card can be dismissed for good (localStorage). */
(function () {
  "use strict";
  var standalone = false;
  try { standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true; } catch (e) {}
  // games count plays from the installed app as ref "app" (cc-sdk.js reads this in the game frame too)
  if (standalone) { try { sessionStorage.setItem("cc-app", "1"); } catch (e) {} }

  // browsers only offer service workers in secure contexts (https, localhost)
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("/sw.js").catch(function () {}); });
  }

  var card = document.getElementById("install-card");
  if (!card || standalone) return;
  var KEY = "cc-install-dismissed";
  try { if (localStorage.getItem(KEY)) return; } catch (e) {}
  var go = card.querySelector("[data-install]"), how = card.querySelector("[data-install-how]");
  function show() { card.hidden = false; }
  card.querySelector("[data-install-close]").addEventListener("click", function () {
    card.hidden = true;
    try { localStorage.setItem(KEY, "1"); } catch (e) {}
  });

  var deferred = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    go.hidden = false; how.hidden = true;
    show();
  });
  go.addEventListener("click", function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; card.hidden = true; });
  });
  window.addEventListener("appinstalled", function () { card.hidden = true; });

  // iPhone/iPad Safari has no install prompt: explain the share-sheet route instead
  var ua = navigator.userAgent || "";
  var iOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)) { go.hidden = true; how.hidden = false; show(); }
})();
