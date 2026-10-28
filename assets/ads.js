/* Ad layer (audit P0 #6), integration only: no network, no account. platform.js calls ccAds.runEnded(game) after
   every run. The rules live here so any network plugs into the same caps:
     - never before this visit's first finished run
     - an interstitial at most once every 3 runs and 3 minutes
     - never in team test mode (smoke- id) or for a supporter (window.ccAdFree, for a future Cooked+)
     - only after window.ccConsent.ads() says yes (assets/consent.js)
   window.ccAds.provider stays null until a network adapter sets { interstitial(): Promise, rewarded(reason): Promise<bool> }.
   Until then nothing shows; each moment an ad WOULD show is counted (POST /api/hit kind ad_slot), so the ad
   decision can be made from real numbers. rewarded() resolves false with no provider. */
(function () {
  "use strict";
  var EVERY_RUNS = 3, EVERY_MS = 3 * 60 * 1000;
  var runs = 0, lastAd = 0, firstDone = false;
  function test() { try { return /^smoke/i.test(localStorage.getItem("cc-anon") || ""); } catch (e) { return false; } }
  function off() { return test() || !!window.ccAdFree; }
  function count(kind, game) { if (window.ccHit) window.ccHit("ad_slot", { slot: kind, game: game }); }
  function consent() { return window.ccConsent ? window.ccConsent.ads() : Promise.resolve(false); }
  var ads = window.ccAds = {
    provider: null,
    runEnded: function (game) {
      runs++;
      if (!firstDone) { firstDone = true; lastAd = Date.now(); return Promise.resolve(false); } // the first run: never
      if (off() || runs % EVERY_RUNS !== 0 || Date.now() - lastAd < EVERY_MS) return Promise.resolve(false);
      lastAd = Date.now();
      count("interstitial", game);
      if (!ads.provider) return Promise.resolve(false);
      return consent().then(function (ok) {
        return ok ? ads.provider.interstitial().then(function () { return true; }, function () { return false; }) : false;
      });
    },
    rewarded: function (reason, game) {
      if (off()) return Promise.resolve(false);
      count("rewarded", game);
      if (!ads.provider) return Promise.resolve(false);
      return consent().then(function (ok) { return ok ? ads.provider.rewarded(reason) : false; });
    },
    state: function () { return { runs: runs, firstDone: firstDone, lastAd: lastAd, off: off(), provider: !!ads.provider }; }
  };
})();
