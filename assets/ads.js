/* Ad layer (audit P0 #6; round 22: ad-ready, switched OFF). platform.js loads this (and consent.js) on the first run
   end and calls ccAds.runEnded(game) after every run; games/player.js asks ccAds.slot(el, game) for the results card.
   The plan, the numbers and what Ashton has to do: Core\AD-SPEND.md, format B3.

   THE SWITCH is CONFIG below. While on is false nothing loads from any ad network and nothing shows; each moment an ad
   WOULD show is still counted (POST /api/hit kind ad_slot), so the decision can be made from real numbers.
   Going live (only with Ashton's yes, after his AdSense + H5 Games Ads approval): set client to his pub id, slot to
   the results-card ad unit id, on to true; add his line to /ads.txt; swap the privacy page's ads section (both are
   marked "B3"); in the EEA/UK/Switzerland turn on Google's certified consent message (AdSense Privacy & messaging).

   The rules any network plugs into:
     - never before this visit's first finished run, never during a run (only at run end, in the results card)
     - a full-screen ad at most once every 3 runs and 3 minutes (H5 Games Ads adds its own frequency control on top)
     - never in team test mode (smoke- id) or for a supporter (window.ccAdFree, for a future Cooked+)
     - only when window.ccConsent.ads() says yes (assets/consent.js): EEA/UK/CH ask first and decline by default
     - non-personalised (child-safe) unless CONFIG.personalised and the visitor said yes (also declines by default)
   Preview without any network: open a game page with ?adpreview=1 (this tab only; ?adpreview=0 ends it). The results
   card then shows a labelled placeholder where the ad goes, from the first run, and the consent banner can be seen
   with ccConsent.preview(). */
(function () {
  "use strict";
  if (window.ccAds) return; // loaded once per page (platform.js at the first run end, player.js in preview)
  var CONFIG = {
    on: false,           // B3 master switch. false = no ad network code ever loads
    client: "",          // AdSense publisher id, "ca-pub-…" (Ashton's account; empty until approved)
    slot: "",            // display ad unit id for the results-card slot
    h5: true,            // full-screen breaks through H5 Games Ads (Ad Placement API: adBreak / adConfig)
    test: true,          // data-adbreak-test="on": Google's test ads, for the first live check
    personalised: false  // B3.x: offer personalised ads (consent banner opt-in). B3.0 is non-personalised for everyone
  };
  var EVERY_RUNS = 3, EVERY_MS = 3 * 60 * 1000;
  var runs = 0, lastAd = 0, firstDone = false, loaded = null;
  function ls(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function test() { return /^smoke/i.test(ls("cc-anon") || ""); }
  function off() { return test() || !!window.ccAdFree; }
  function count(kind, game) { if (window.ccHit) window.ccHit("ad_slot", { slot: kind, game: game }); }
  function consent() { return window.ccConsent ? window.ccConsent.ads() : Promise.resolve(false); }
  function live() { return CONFIG.on && /^ca-pub-\d{10,20}$/.test(CONFIG.client); }
  var preview = (function () {
    try {
      var m = /[?&]adpreview=([01])/.exec(location.search);
      if (m) { if (m[1] === "1") sessionStorage.setItem("cc-adpreview", "1"); else sessionStorage.removeItem("cc-adpreview"); }
      return sessionStorage.getItem("cc-adpreview") === "1";
    } catch (e) { return false; }
  })();

  // Google's tag, once, only when live: H5 Games Ads (adBreak / adConfig) and the display slot share it
  function load() {
    if (loaded || !live()) return loaded;
    loaded = new Promise(function (ok) {
      var s = document.createElement("script");
      s.async = true; s.crossOrigin = "anonymous";
      s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(CONFIG.client);
      s.setAttribute("data-ad-client", CONFIG.client);
      if (CONFIG.test) s.setAttribute("data-adbreak-test", "on");
      s.setAttribute("data-ad-frequency-hint", "180s");
      s.onload = function () { ok(true); }; s.onerror = function () { ok(false); };
      window.adsbygoogle = window.adsbygoogle || [];
      window.adBreak = window.adConfig = function (o) { window.adsbygoogle.push(o); };
      return Promise.resolve(window.ccConsent && window.ccConsent.personalised ? window.ccConsent.personalised() : false).then(function (p) {
        if (!(CONFIG.personalised && p)) window.adsbygoogle.requestNonPersonalizedAds = 1;
        window.adConfig({ preloadAdBreaks: "on", sound: "off" });
        document.head.appendChild(s);
      });
    });
    return loaded;
  }
  // the H5 Games Ads adapter: a full-screen break between runs, and a rewarded break (the game asks; resolves true
  // only if the ad was watched). Set up only when live; until then ccAds.provider stays null.
  function h5Provider() {
    return {
      interstitial: function () {
        return load().then(function (ok) {
          if (!ok) return false;
          return new Promise(function (done) { window.adBreak({ type: "next", name: "run-end", adBreakDone: function (i) { done(!!(i && i.breakStatus === "viewed")); } }); });
        });
      },
      rewarded: function (reason) {
        return load().then(function (ok) {
          if (!ok) return false;
          return new Promise(function (done) {
            var got = false;
            window.adBreak({ type: "reward", name: String(reason || "reward").slice(0, 40),
              beforeReward: function (show) { show(); }, adViewed: function () { got = true; }, adDismissed: function () { got = false; },
              adBreakDone: function () { done(got); } });
          });
        });
      }
    };
  }

  var ads = window.ccAds = {
    provider: live() && CONFIG.h5 ? h5Provider() : null,
    config: function () { return { on: CONFIG.on, live: live(), h5: CONFIG.h5, personalised: CONFIG.personalised, preview: preview }; },
    runEnded: function (game) {
      runs++;
      if (!firstDone) { firstDone = true; lastAd = Date.now(); return Promise.resolve(false); } // the first run: never
      if (off() || runs % EVERY_RUNS !== 0 || Date.now() - lastAd < EVERY_MS) return Promise.resolve(false);
      lastAd = Date.now();
      count("interstitial", game);
      if (!ads.provider) return Promise.resolve(false);
      return consent().then(function (ok) {
        return ok ? ads.provider.interstitial().then(function (v) { return v; }, function () { return false; }) : false;
      });
    },
    rewarded: function (reason, game) {
      if (off()) return Promise.resolve(false);
      count("rewarded", game);
      if (!ads.provider) return Promise.resolve(false);
      return consent().then(function (ok) { return ok ? ads.provider.rewarded(reason) : false; });
    },
    // the results card's ad strip (games/player.js): fills el, or leaves it hidden. A preview placeholder in ?adpreview=1;
    // a real ad only when live, after the first run, with consent. Space is reserved before anything loads (no shift).
    slot: function (el, game) {
      if (!el) return false;
      el.hidden = true; el.className = "ccr-ad"; el.innerHTML = "";
      if (preview && !live()) {
        el.hidden = false; el.classList.add("is-preview");
        el.innerHTML = '<small class="ccr-ad-tag">ad</small><span class="ccr-ad-fill">ad space · 320×100<br><i>preview only: ads are off</i></span>';
        return true;
      }
      if (!live() || !CONFIG.slot || off() || !firstDone || runs < 2) return false;
      el.hidden = false;
      el.innerHTML = '<small class="ccr-ad-tag">ad · keeps the games free</small>';
      consent().then(function (ok) {
        if (!ok) { el.hidden = true; return; }
        return load().then(function (good) {
          if (!good) { el.hidden = true; return; }
          var ins = document.createElement("ins");
          ins.className = "adsbygoogle ccr-ad-fill";
          ins.setAttribute("data-ad-client", CONFIG.client);
          ins.setAttribute("data-ad-slot", CONFIG.slot);
          ins.setAttribute("data-ad-format", "horizontal");
          ins.setAttribute("data-full-width-responsive", "false");
          el.appendChild(ins);
          try { window.adsbygoogle.push({}); } catch (e) { el.hidden = true; }
        });
      });
      count("display", game);
      return true;
    },
    state: function () { return { runs: runs, firstDone: firstDone, lastAd: lastAd, off: off(), provider: !!ads.provider, live: live(), preview: preview }; }
  };
})();
