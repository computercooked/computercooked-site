/* Consent for ads (audit P0 #7; round 22: declines by default). Nothing shows while ads are off (assets/ads.js CONFIG).
   Two separate answers, both "no" until the visitor says yes:
     - ads at all, where the law asks first (EU/EEA, UK, Switzerland: GET /api/geo from Cloudflare's country). Elsewhere
       ads may run without asking, but only non-personalised (child-safe), the B3.0 setup.
     - personalised ads, only offered when ads.js CONFIG.personalised is on (a later B3.x test).
   A Google-certified consent message (IAB TCF) is required for personalised ads in the EEA/UK/CH; when Ashton's AdSense
   "Privacy & messaging" EU message is on, Google shows it and this banner stays out of the way (window.__tcfapi present).
   API:
     ccConsent.ads()          -> Promise<boolean>  may ads run here? (asks once where the law requires; no answer = no)
     ccConsent.personalised() -> Promise<boolean>  did the visitor say yes to personalised ads? (no answer = no)
     ccConsent.choices()      -> opens the banner again so a choice can be changed (privacy page "your ad choices")
     ccConsent.state()        -> { ads: "granted" | "denied" | null, personalised: "granted" | "denied" | null }
     ccConsent.preview()      -> shows the banner with nothing stored (for checking the design)
     ccConsent.reset()        -> forgets both answers */
(function () {
  "use strict";
  if (window.ccConsent) return;
  var KEY ="cc-consent-ads", PKEY = "cc-consent-pers", geo = null;
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function cfg() { return (window.ccAds && window.ccAds.config && window.ccAds.config()) || { on: false, personalised: false }; }
  function required() {
    if (!geo) geo = fetch("/api/geo").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return !j || j.consent_required !== false; }) // unknown: treat as required
      .catch(function () { return true; });
    return geo;
  }
  var open = null;
  // the banner: one small bar at the bottom, never over the game's controls for long, and closing it means "no"
  function banner(o, dry) {
    if (open) return open;
    open = new Promise(function (done) {
      var b = document.createElement("div");
      b.className = "cc-consent";
      b.setAttribute("role", "dialog");
      b.setAttribute("aria-label", "ads and privacy");
      var pers = o.personalised;
      b.innerHTML = '<button type="button" class="cc-consent-x" data-c="denied" aria-label="close: no">×</button>' +
        "<p>" + (o.ads
          ? "the games are free because of ads. ok to show ads here? they may use cookies. <a href=\"/privacy/#ads\">how ads work</a>"
          : "ads keep the games free. ok to make them personalised (picked from what ads know about you)? no means plain ads. <a href=\"/privacy/#ads\">how ads work</a>") +
        "</p><div>" +
        '<button type="button" data-c="granted">' + (o.ads ? (pers ? "ok, personalised is fine" : "ok") : "yes, personalise") + "</button>" +
        (o.ads && pers ? '<button type="button" data-c="plain">ok, but not personalised</button>' : "") +
        '<button type="button" data-c="denied">' + (o.ads ? "no ads" : "no thanks") + "</button></div>";
      b.addEventListener("click", function (e) {
        var c = e.target.getAttribute && e.target.getAttribute("data-c");
        if (!c) return;
        if (!dry) {
          if (o.ads) put(KEY, c === "denied" ? "denied" : "granted");
          if (pers) put(PKEY, c === "granted" ? "granted" : "denied");
        }
        b.remove(); open = null; done(c !== "denied");
      });
      (document.body || document.documentElement).appendChild(b);
      var first = b.querySelector('[data-c="denied"]:not(.cc-consent-x)');
      try { first.focus({ preventScroll: true }); } catch (e) {}
    });
    return open;
  }
  function certified() { return typeof window.__tcfapi === "function"; } // Google's (or another certified) CMP handles it
  window.ccConsent = {
    ads: function () {
      if (!cfg().on) return Promise.resolve(false);
      var s = get(KEY);
      if (s) return Promise.resolve(s === "granted");
      return required().then(function (need) {
        if (!need) return true; // non-personalised ads, no cookies consent needed here
        if (certified()) return true; // the certified CMP decides; Google reads its answer itself
        return banner({ ads: true, personalised: cfg().personalised });
      });
    },
    personalised: function () {
      var c = cfg();
      if (!c.on || !c.personalised) return Promise.resolve(false);
      var s = get(PKEY);
      if (s) return Promise.resolve(s === "granted");
      return required().then(function (need) {
        if (need) return false; // EEA/UK/CH: personalised only through the certified CMP (Google reads it directly)
        return banner({ ads: false, personalised: true });
      });
    },
    choices: function () {
      var c = cfg();
      return required().then(function (need) { return banner({ ads: need || !c.on, personalised: c.personalised || !c.on }, false); });
    },
    state: function () { return { ads: get(KEY), personalised: get(PKEY) }; },
    preview: function () { return banner({ ads: true, personalised: true }, true); },
    reset: function () { try { localStorage.removeItem(KEY); localStorage.removeItem(PKEY); } catch (e) {} }
  };
})();
