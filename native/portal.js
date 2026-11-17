/* portal.js: one adapter between our games and a web portal's SDK (docs/portals.md, K-0013 item 3). Only portal builds
   load it (scripts/package-portal.mjs puts it right after cc-sdk.js); the website never does.
   window.CC_PORTAL = { name: "crazygames" | "gamedistribution" | "poki" | "none", gdGameId?: "…" } is set by the build.
   What it does, the same way for every portal:
     - our SDK's run start / end (cc.start / cc.end, which every game already calls) become the portal's
       gameplayStart / gameplayStop
     - a midroll ad between runs, never before the first run, at most every 3 runs and 3 minutes (portals cap too)
     - while an ad shows: all Web Audio suspended, input blocked by a full-screen shield, then everything resumes
     - links out of the game (our "play next" links) do nothing: portals don't allow outside links
     - cc.rewarded() → Promise<bool> for games that offer a reward (true only when the ad finished)
   Scores, saves and accounts on computercooked.com don't exist inside a portal; cc-sdk keeps saves and bests on
   this device and never calls our API (it works offline).
   K-0030 step 7: on itch.io and Newgrounds (outside links allowed), a small card after the 1st run and then every 5th
   offers xp, levels and boards on computercooked.com. It opens in a new tab, never blocks play, and can be closed for
   the session. Ad portals (CrazyGames, GameDistribution, Poki) don't allow outside links, so they never see it.
   Round 24: on ad portals a share carries no link either (CrazyGames bans cross-promotion; GD and Poki ban links out).
   Every game builds its own share text, so the adapter cleans it where it leaves: navigator.share (url dropped, links
   taken out of title and text), navigator.clipboard.writeText and document.execCommand("copy") (links taken out of the
   copied text). itch.io and Newgrounds shares are left as they are. ccPortal.scrub(text) is the cleaner. */
(function () {
  "use strict";
  var cfg = window.CC_PORTAL || { name: "none" };
  var name = cfg.name || "none";
  var site = cfg.portal || name; // which portal this build is for (itch and newgrounds run the "none" driver)

  // every AudioContext the game makes, so an ad can silence them all
  var ctxs = [];
  ["AudioContext", "webkitAudioContext"].forEach(function (k) {
    var Orig = window[k];
    if (!Orig) return;
    var Wrapped = function (o) { var c = new Orig(o); ctxs.push(c); return c; };
    Wrapped.prototype = Orig.prototype;
    window[k] = Wrapped;
  });
  var shield = null;
  function hold(on) {
    ctxs.forEach(function (c) { try { on ? c.suspend() : c.resume(); } catch (e) {} });
    if (on && !shield) {
      shield = document.createElement("div");
      shield.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:transparent";
      ["pointerdown", "touchstart", "keydown", "mousedown"].forEach(function (ev) {
        shield.addEventListener(ev, function (e) { e.stopPropagation(); e.preventDefault(); }, true);
      });
      document.body.appendChild(shield);
    } else if (!on && shield) { shield.remove(); shield = null; }
  }
  var keyBlock = function (e) { if (shield) { e.stopPropagation(); e.preventDefault(); } };
  window.addEventListener("keydown", keyBlock, true);
  window.addEventListener("keyup", keyBlock, true);

  // ---- round 24: shares carry no link on ad portals ----
  var LINK_PORTALS = { itch: 1, newgrounds: 1 };
  var LINK_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b[a-z0-9.-]*computercooked\.com[^\s<>"']*/gi;
  function scrub(s) {
    if (typeof s !== "string") return s;
    return s.replace(LINK_RE, "")
      .replace(/[ \t]*[\u00b7|:\u2192\u2013\u2014-]+[ \t]*(?=\n|$)/g, "") // a separator the link used to follow ("go → ", "x · ")
      .replace(/[ \t]+(\n|$)/g, "$1").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  }
  if (!LINK_PORTALS[site]) {
    var nav = window.navigator;
    if (nav && typeof nav.share === "function") {
      var share0 = nav.share;
      try {
        nav.share = function (d) {
          d = d || {};
          var o = {}, t = scrub(d.title || ""), x = scrub(d.text || "");
          if (t) o.title = t;
          if (x) o.text = x;
          if (d.files) o.files = d.files;
          if (!o.title && !o.text && !o.files) o.text = "computer cooked";
          return share0.call(nav, o);
        };
      } catch (e) {}
    }
    var clip = nav && nav.clipboard;
    if (clip && typeof clip.writeText === "function") {
      var write0 = clip.writeText;
      try { clip.writeText = function (t) { return write0.call(clip, scrub(String(t))); }; } catch (e) {}
    }
    if (typeof document.execCommand === "function") {
      var exec0 = document.execCommand;
      document.execCommand = function (cmd) {
        if (String(cmd).toLowerCase() === "copy") {
          var el = document.activeElement;
          if (el && typeof el.value === "string" && LINK_RE.test(el.value)) {
            el.value = scrub(el.value);
            try { el.select(); } catch (e) {}
          }
          LINK_RE.lastIndex = 0;
        }
        return exec0.apply(document, arguments);
      };
    }
  }

  // no links out of the game
  if (name !== "none") document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest && e.target.closest("a[href]");
    if (a && !/^#/.test(a.getAttribute("href") || "")) e.preventDefault();
  }, true);

  // ---- drivers: init, start, stop, midroll() -> Promise, rewarded() -> Promise<bool> ----
  var none = { init: function () { return Promise.resolve(); }, start: function () {}, stop: function () {},
    midroll: function () { return Promise.resolve(); }, rewarded: function () { return Promise.resolve(false); } };
  var drivers = {
    none: none,
    crazygames: {
      sdk: function () { return window.CrazyGames && window.CrazyGames.SDK; },
      init: function () { var s = this.sdk(); return s ? s.init().then(function () { try { s.game.loadingStop(); } catch (e) {} }) : Promise.resolve(); },
      start: function () { var s = this.sdk(); try { s && s.game.gameplayStart(); } catch (e) {} },
      stop: function () { var s = this.sdk(); try { s && s.game.gameplayStop(); } catch (e) {} },
      ad: function (kind) {
        var s = this.sdk();
        return new Promise(function (done) {
          if (!s) return done(false);
          try {
            s.ad.requestAd(kind, { adStarted: function () { hold(true); }, adFinished: function () { hold(false); done(true); }, adError: function () { hold(false); done(false); } });
          } catch (e) { hold(false); done(false); }
        });
      },
      midroll: function () { return this.ad("midgame"); },
      rewarded: function () { return this.ad("rewarded"); }
    },
    gamedistribution: {
      init: function () {
        window.GD_OPTIONS = { gameId: cfg.gdGameId || "", onEvent: function (ev) {
          if (ev.name === "SDK_GAME_PAUSE") hold(true);
          if (ev.name === "SDK_GAME_START") hold(false);
        } };
        // GD's SDK reads GD_OPTIONS when it loads, so it's added here rather than in the HTML
        return new Promise(function (ok) {
          var t = document.createElement("script"); t.src = "https://html5.api.gamedistribution.com/main.min.js";
          t.onload = ok; t.onerror = ok; document.head.appendChild(t);
        });
      },
      start: function () {}, stop: function () {},
      show: function (type) {
        var g = window.gdsdk;
        if (!g || !g.showAd) return Promise.resolve(false);
        return g.showAd(type).then(function () { hold(false); return true; }, function () { hold(false); return false; });
      },
      midroll: function () { return this.show(); },
      rewarded: function () { return this.show("rewarded"); }
    },
    poki: {
      sdk: function () { return window.PokiSDK; },
      init: function () { var s = this.sdk(); return s ? s.init().then(function () { s.gameLoadingFinished(); }, function () { s.gameLoadingFinished(); }) : Promise.resolve(); },
      start: function () { var s = this.sdk(); try { s && s.gameplayStart(); } catch (e) {} },
      stop: function () { var s = this.sdk(); try { s && s.gameplayStop(); } catch (e) {} },
      midroll: function () {
        var s = this.sdk();
        if (!s) return Promise.resolve(false);
        return s.commercialBreak(function () { hold(true); }).then(function () { hold(false); return true; });
      },
      rewarded: function () {
        var s = this.sdk();
        if (!s) return Promise.resolve(false);
        return s.rewardedBreak(function () { hold(true); }).then(function (ok) { hold(false); return !!ok; });
      }
    }
  };
  var d = drivers[name] || none;
  var ready = d.init().catch(function () {});

  // ---- K-0030 step 7: "play on computercooked.com" (itch.io and Newgrounds only) ----
  function siteCard() {
    if (!LINK_PORTALS[site] || !/^[a-z0-9-]{1,40}$/.test(cfg.slug || "")) return;
    try { if (sessionStorage.getItem("cc-portal-card-off")) return; } catch (e) {}
    if (document.getElementById("cc-site-card")) return;
    var url = "https://computercooked.com/games/" + cfg.slug + "/?ref=portal&utm_campaign=portal-" + site;
    var box = document.createElement("div");
    box.id = "cc-site-card";
    box.setAttribute("role", "status");
    box.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;display:flex;align-items:center;gap:10px;" +
      "max-width:calc(100% - 32px);padding:8px 8px 8px 14px;border:1px solid #2A2D34;border-radius:12px;background:#17181C;color:#F5F3ED;" +
      "font:600 14px/1.3 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.45)";
    var a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener";
    a.style.cssText = "color:#C5FF49;text-decoration:none";
    a.textContent = "want xp, levels and leaderboards? play on computercooked.com \u2197";
    var x = document.createElement("button");
    x.type = "button"; x.setAttribute("aria-label", "close"); x.textContent = "\u00d7";
    x.style.cssText = "min-width:32px;min-height:32px;border:0;border-radius:8px;background:#2A2D34;color:#F5F3ED;font:700 18px/1 system-ui,sans-serif;cursor:pointer";
    x.addEventListener("click", function () { box.remove(); try { sessionStorage.setItem("cc-portal-card-off", "1"); } catch (e) {} });
    box.appendChild(a); box.appendChild(x);
    document.body.appendChild(box);
    setTimeout(function () { box.remove(); }, 9000);
  }

  // ---- hook our SDK ----
  var runs = 0, lastAd = Date.now(), playing = false;
  function wrap(cc) {
    if (!cc || cc.__portal) return;
    cc.__portal = true;
    var start = cc.start, end = cc.end;
    cc.start = function () {
      var r = start.apply(cc, arguments);
      ready.then(function () { if (!playing) { playing = true; d.start(); } });
      return r;
    };
    cc.end = function () {
      var r = end.apply(cc, arguments);
      ready.then(function () {
        if (playing) { playing = false; d.stop(); }
        runs++;
        if (runs === 1 || runs % 5 === 0) siteCard();
        if (runs >= 2 && runs % 3 === 0 && Date.now() - lastAd >= 180000) { lastAd = Date.now(); return d.midroll(); }
      }).catch(function () { hold(false); });
      return r;
    };
    cc.rewarded = function () { return ready.then(function () { return d.rewarded(); }).catch(function () { hold(false); return false; }); };
  }
  wrap(window.cc);
  if (!window.cc) document.addEventListener("DOMContentLoaded", function () { wrap(window.cc); });
  window.ccPortal = { name: name, portal: site, scrub: scrub, state: function () { return { runs: runs, playing: playing, holding: !!shield }; } };
})();
