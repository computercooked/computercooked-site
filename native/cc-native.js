/* cc-native.js: the bridge between a packaged game (Capacitor app, see docs/packaging.md) and the phone.
   scripts/package-game.mjs puts it in front of cc-sdk.js in the app's index.html. On the website it is never loaded.
   window.ccNative:
     isNative                  true inside the Android / iOS app
     platform                  "android" | "ios" | "web"
     haptic(kind)              "light" | "medium" | "heavy" tap (no-op without @capacitor/haptics)
     ads.interstitial()        Promise<bool>, AdMob when @capacitor-community/admob is set up, else false
     ads.rewarded()            Promise<bool>  true = the player earned the reward
     iap.buy(productId)        Promise<bool>  false until a purchases plugin is wired (see docs/packaging.md)
   It also: suspends every Web Audio context while the app is in the background (stores reject apps that keep
   playing), and opens links to the website (/games/..., https://computercooked.com/...) in the phone's browser
   instead of a dead page inside the app. */
(function () {
  "use strict";
  var C = window.Capacitor;
  var isNative = !!(C && C.isNativePlatform && C.isNativePlatform());
  var plugins = (C && C.Plugins) || {};
  var SITE = "https://computercooked.com";

  // every AudioContext a game makes, so they can all be paused together
  var ctxs = [];
  ["AudioContext", "webkitAudioContext"].forEach(function (k) {
    var Orig = window[k];
    if (!Orig) return;
    var Wrapped = function (opts) { var c = new Orig(opts); ctxs.push(c); return c; };
    Wrapped.prototype = Orig.prototype;
    window[k] = Wrapped;
  });
  function setAudio(on) {
    ctxs.forEach(function (c) { try { on ? c.resume() : c.suspend(); } catch (e) {} });
    document.querySelectorAll("audio,video").forEach(function (m) { try { if (!on) m.pause(); } catch (e) {} });
  }
  if (isNative && plugins.App && plugins.App.addListener) {
    plugins.App.addListener("appStateChange", function (s) { setAudio(!!s.isActive); });
  }
  document.addEventListener("visibilitychange", function () { setAudio(!document.hidden); });

  // site links out to the browser
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href");
    if (!/^(\/|https?:\/\/(www\.)?computercooked\.com)/.test(href)) return;
    e.preventDefault();
    var url = href[0] === "/" ? SITE + href : href;
    if (plugins.Browser && plugins.Browser.open) plugins.Browser.open({ url: url }); else window.open(url, "_blank");
  }, true);

  var admobReady = null;
  function admob() {
    var A = plugins.AdMob;
    if (!isNative || !A) return Promise.resolve(null);
    if (!admobReady) admobReady = A.initialize({}).then(function () { return A; }, function () { return null; });
    return admobReady;
  }
  var cfg = window.CC_NATIVE || {}; // { admob: { interstitial: "ca-app-pub-…/…", rewarded: "…" } }, set per app

  window.ccNative = {
    isNative: isNative,
    platform: (C && C.getPlatform && C.getPlatform()) || "web",
    haptic: function (kind) {
      var H = plugins.Haptics;
      if (!isNative || !H) return;
      try { H.impact({ style: ({ light: "LIGHT", medium: "MEDIUM", heavy: "HEAVY" })[kind] || "LIGHT" }); } catch (e) {}
    },
    ads: {
      interstitial: function () {
        var id = cfg.admob && cfg.admob.interstitial;
        return admob().then(function (A) {
          if (!A || !id) return false;
          return A.prepareInterstitial({ adId: id }).then(function () { return A.showInterstitial(); }).then(function () { return true; }, function () { return false; });
        });
      },
      rewarded: function () {
        var id = cfg.admob && cfg.admob.rewarded;
        return admob().then(function (A) {
          if (!A || !id) return false;
          return A.prepareRewardVideoAd({ adId: id }).then(function () { return A.showRewardVideoAd(); }).then(function (r) { return !!r; }, function () { return false; });
        });
      }
    },
    iap: { buy: function () { return Promise.resolve(false); } }
  };

  // the site's ad layer (assets/ads.js) is not in the app; games that ask cc for ads get the native ones
  window.ccAds = {
    provider: null,
    runEnded: function () { return Promise.resolve(false); },
    rewarded: function () { return window.ccNative.ads.rewarded(); }
  };
})();
