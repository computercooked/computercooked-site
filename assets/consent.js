/* Consent gate for ads (audit P0 #7). No banner shows yet: it only appears once an ad provider is switched on
   (assets/ads.js, window.ccAds.provider) AND the visitor is somewhere consent is required (EU/EEA, UK,
   Switzerland: GET /api/geo from Cloudflare's country). A certified TCF CMP comes with the ad network Ashton picks
   (AdinPlay and Google H5 Games Ads each ship one); when it's set up, it replaces ask() and this stays the switch.
   window.ccConsent.ads() -> Promise<boolean>: may ads run? (personalised or not is the provider's job) */
(function () {
  "use strict";
  var KEY = "cc-consent-ads", geo = null;
  function stored() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  function required() {
    if (!geo) geo = fetch("/api/geo").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return !j || j.consent_required !== false; }) // unknown: ask
      .catch(function () { return true; });
    return geo;
  }
  // a plain first-party banner (a placeholder until the network's CMP): accept, or no ads
  function ask() {
    return new Promise(function (done) {
      var b = document.createElement("div");
      b.className = "cc-consent";
      b.setAttribute("role", "dialog");
      b.setAttribute("aria-label", "ads and privacy");
      b.innerHTML = "<p>the games are free because of ads. ok to show ads (they may use cookies)? <a href=\"/privacy/\">privacy</a></p>" +
        "<div><button type=\"button\" data-c=\"granted\">ok</button><button type=\"button\" data-c=\"denied\">no ads</button></div>";
      b.addEventListener("click", function (e) {
        var c = e.target.getAttribute && e.target.getAttribute("data-c");
        if (!c) return;
        store(c); b.remove(); done(c === "granted");
      });
      document.body.appendChild(b);
    });
  }
  window.ccConsent = {
    ads: function () {
      var s = stored();
      if (s) return Promise.resolve(s === "granted");
      return required().then(function (need) { return need ? ask() : true; });
    },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
})();
