/* Player-page panel: leaderboard, feedback (thumbs + text), favorite heart, account chip.
   Needs cc-sdk.js loaded first. Mount: <div id="cc-panel" data-game="slug"></div> */
(function () {
  "use strict";
  var panel = document.getElementById("cc-panel");
  var cc = window.cc;
  if (!panel || !cc) return;
  var game = panel.dataset.game || cc._game();
  cc._apiReady().then(function (up) { if (up) mount(); });
  function mount() {
  var me = null, info = null, catalog = null, period = "day";

  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function api(path, body) {
    return fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" } : { credentials: "same-origin" })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .catch(function () { return { ok: false, error: "offline?" }; });
  }
  function fmt(n) { return n == null ? "" : (Math.round(n * 10) / 10).toLocaleString("en-US"); }

  panel.innerHTML =
    '<div class="about-card cc-board" hidden>' +
      '<div class="cc-head"><h2>leaderboard</h2>' +
        '<div class="cc-tabs" role="tablist" aria-label="leaderboard period">' +
          '<button type="button" role="tab" data-p="day" aria-selected="true">today</button>' +
          '<button type="button" role="tab" data-p="week" aria-selected="false">week</button>' +
          '<button type="button" role="tab" data-p="all" aria-selected="false">all time</button>' +
          '<button type="button" role="tab" data-p="friends" aria-selected="false" hidden>friends</button>' +
        "</div></div>" +
      '<p class="cc-challenge" hidden></p>' +
      '<ol class="cc-rows" aria-live="polite"><li class="cc-empty">loading…</li></ol>' +
      '<p class="cc-guest" hidden><label>leaderboard name <input type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="guest name"></label> <a href="/me/">or make an account</a></p>' +
    "</div>" +
    '<div class="about-card cc-fb" id="cc-feedback">' +
      '<div class="cc-head"><h2>how was it?</h2>' +
        '<button type="button" class="cc-heart" aria-pressed="false" aria-label="favorite" hidden>♡</button></div>' +
      '<div class="cc-thumbs">' +
        '<button type="button" data-r="1" aria-pressed="false" aria-label="thumbs up"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M7 11v9H3v-9zM7 11l4-8c1.7 0 3 1.3 3 3v3h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>' +
        '<button type="button" data-r="-1" aria-pressed="false" aria-label="thumbs down"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" style="transform:rotate(180deg)"><path d="M7 11v9H3v-9zM7 11l4-8c1.7 0 3 1.3 3 3v3h5a2 2 0 0 1 2 2.3l-1.2 7A2 2 0 0 1 17.8 20H7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>' +
      "</div>" +
      '<label class="cc-label" for="cc-fb-text">what would make this better?</label>' +
      '<textarea id="cc-fb-text" maxlength="1000" rows="3" placeholder="be honest. the computer can take it. (it cannot)"></textarea>' +
      '<div class="cc-row"><button type="button" class="cc-send">send</button><span class="cc-msg" role="status"></span></div>' +
    "</div>";

  /* ---------- this device's recently played list, for "jump back in" on the hub ---------- */
  try {
    var rec = JSON.parse(localStorage.getItem("cc-recent") || "[]").filter(function (x) { return x && x.g !== game; });
    rec.unshift({ g: game, t: Date.now() });
    localStorage.setItem("cc-recent", JSON.stringify(rec.slice(0, 12)));
  } catch (e) {}

  /* ---------- account chip: K-0031 the top bar's "log in" covers this now, so it stays off the page ---------- */
  var chip = el('<a class="cc-chip" href="/me/">log in</a>');

  /* ---------- leaderboard ---------- */
  var board = panel.querySelector(".cc-board");
  var rows = panel.querySelector(".cc-rows");
  var guestBox = panel.querySelector(".cc-guest");
  var guestInput = guestBox.querySelector("input");

  function loadBoard() {
    var friends = period === "friends";
    var url = "/api/leaderboard?game=" + encodeURIComponent(game) + "&period=" + (friends ? "all&friends=1" : period) + "&player=" + encodeURIComponent("a:" + cc._anon);
    api(url).then(function (r) {
      if (!r.ok) { rows.innerHTML = '<li class="cc-empty">leaderboard is napping. try later.</li>'; return; }
      if (!r.rows.length) {
        rows.innerHTML = friends
          ? '<li class="cc-empty">no friend scores yet. <a href="/me/#friends">add friends</a> and dare them.</li>'
          : '<li class="cc-empty">nobody yet. be the first casualty.</li>';
        return;
      }
      rows.innerHTML = r.rows.map(function (x) {
        var name = x.u ? '<a href="/u/' + encodeURIComponent(x.u) + '">' + esc(x.name) + "</a>" : esc(x.name);
        return '<li class="' + (x.me ? "is-me" : "") + '"><span class="cc-rank">' + x.rank + '</span><span class="cc-name">' + name +
          '</span><span class="cc-score">' + fmt(x.score) + '</span><button type="button" class="cc-flag" data-id="' + x.id + '" aria-label="report ' + esc(x.name) + '" title="report">⚑</button></li>';
      }).join("") + (r.you
        // not in the top rows: show where you are anyway
        ? '<li class="cc-gap" aria-hidden="true">⋯</li><li class="is-me cc-you"><span class="cc-rank">' + r.you.rank + '</span><span class="cc-name">you</span><span class="cc-score">' + fmt(r.you.score) + '</span></li>'
        : "");
    });
  }
  panel.querySelectorAll(".cc-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      period = b.dataset.p;
      panel.querySelectorAll(".cc-tabs button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      loadBoard();
    });
  });
  rows.addEventListener("click", function (e) {
    var f = e.target.closest(".cc-flag");
    if (!f || f.disabled) return;
    if (!confirm("report this name or score as offensive or fake?")) return;
    f.disabled = true;
    api("/api/report", { kind: "score", target: f.dataset.id, reason: "player report", anon: cc._anon }).then(function () { f.textContent = "✓"; });
  });
  guestInput.value = cc.guestName() || "";
  guestInput.addEventListener("change", function () { cc.guestName(guestInput.value.trim()); });

  /* ---------- feedback ---------- */
  var rating = 0;
  var fb = panel.querySelector(".cc-fb");
  var msg = fb.querySelector(".cc-msg");
  var ta = fb.querySelector("textarea");
  fb.querySelectorAll(".cc-thumbs button").forEach(function (b) {
    b.addEventListener("click", function () {
      rating = rating === +b.dataset.r ? 0 : +b.dataset.r;
      fb.querySelectorAll(".cc-thumbs button").forEach(function (x) { x.setAttribute("aria-pressed", String(+x.dataset.r === rating)); });
      if (rating && !ta.value.trim()) send(true);
    });
  });
  var sentThumb = false;
  function send(thumbOnly) {
    var text = thumbOnly ? "" : ta.value.trim();
    if (!rating && !text) { msg.textContent = "pick a thumb or type something."; return; }
    if (thumbOnly && sentThumb) return;
    msg.textContent = "sending…";
    api("/api/feedback", { game: game, version: cc._version(), rating: text && sentThumb ? 0 : rating, text: text, tester: cc._tester(), anon: cc._anon, play_id: cc._lastPlay() })
      .then(function (r) {
        if (!r.ok) { msg.textContent = r.error || "couldn't send. try again."; return; }
        if (thumbOnly) { sentThumb = true; msg.textContent = "noted. tell us more below?"; }
        else { ta.value = ""; sentThumb = true; msg.textContent = "got it. thank you. we read every one."; }
      });
  }
  fb.querySelector(".cc-send").addEventListener("click", function () { send(false); });

  /* ---------- favorite + account ---------- */
  var heart = fb.querySelector(".cc-heart");
  function setHeart(on) { heart.setAttribute("aria-pressed", String(on)); heart.textContent = on ? "♥" : "♡"; heart.title = on ? "unfavorite" : "favorite"; }
  heart.addEventListener("click", function () {
    var on = heart.getAttribute("aria-pressed") !== "true";
    setHeart(on);
    api("/api/me/favorite", { game: game, on: on });
  });

  api("/api/me").then(function (r) {
    me = r && r.user;
    if (me) {
      chip.textContent = me.username;
      chip.classList.add("is-in");
      panel.querySelector('.cc-tabs [data-p="friends"]').hidden = false;
      prefetchFriends();
      heart.hidden = false;
      api("/api/me/summary").then(function (s) { if (s.ok) setHeart(s.favorites.indexOf(game) >= 0); });
    } else {
      guestBox.hidden = false;
    }
  });

  /* ---------- does this game have a leaderboard? ---------- */
  fetch("/games/games.json").then(function (r) { return r.json(); }).then(function (d) {
    catalog = d.games || [];
    info = catalog.filter(function (g) { return g.slug === game; })[0];
    if (info && info.version) cc._setGame(game, info.version);
    if (info && info.max_score_per_sec) { board.hidden = false; loadBoard(); loadChallenge(); prefetchFriends(); }
  }).catch(function () {});

  /* ---------- weekly challenge line on the featured game (slice D2) ---------- */
  function loadChallenge() {
    api("/api/challenge").then(function (r) {
      var c = r && r.ok && r.challenge, p = panel.querySelector(".cc-challenge");
      if (!c || c.game !== game) return;
      p.innerHTML = "<b>weekly challenge</b> · " + esc(c.goal) + " · " + (c.done ? "done ✓" : "+" + c.xp + " xp" + (me ? "" : ' · <a href="/me/">log in</a> to earn it'));
      p.hidden = false;
    });
  }

  /* ---------- challenge-a-friend links: /games/<slug>/?vs=<score>&from=<name>&d=<id> ---------- */
  var qs = new URLSearchParams(location.search), dare = null, dareBanner = null, dareOpened = false;
  function showDare(score, from) {
    var layout = document.querySelector(".player-layout");
    if (!layout || !(score > 0)) return;
    if (dareBanner) dareBanner.remove();
    dareBanner = el('<div class="dare" role="note"><span class="dare-tag">challenge</span>' +
      '<span class="dare-text">beat <b></b> from <i></i></span>' +
      '<button type="button" class="dare-x" aria-label="dismiss challenge">✕</button></div>');
    dareBanner.querySelector("b").textContent = fmt(score);
    dareBanner.querySelector("i").textContent = from || "a friend";
    dareBanner.querySelector(".dare-x").addEventListener("click", function () { dareBanner.remove(); });
    layout.insertAdjacentElement("beforebegin", dareBanner);
    if (window.ccToast) window.ccToast("beat " + fmt(score) + " from " + (from || "a friend"));
  }
  if (/^[A-Za-z0-9_-]{6,16}$/.test(qs.get("d") || "")) {
    var did = qs.get("d"), seenKey = "cc-dare-open:" + did, first = true;
    try { first = !sessionStorage.getItem(seenKey); sessionStorage.setItem(seenKey, "1"); } catch (e) {}
    api("/api/dare/" + did + (first ? "?open=1" : "")).then(function (r) {
      if (!r || !r.ok || r.game !== game) return;
      dare = r;
      showDare(r.score, r.from);
      // if this player makes an account later (within 30 days), the dare's sender gets credit for bringing them in
      if (!me) { try { localStorage.setItem("cc-ref-dare", JSON.stringify({ d: did, t: Date.now() })); } catch (e) {} }
    });
  } else if (qs.get("vs")) {
    // a hand-made link without an id: show it, but nothing is verified or rewarded
    var vs = parseFloat(qs.get("vs")), from = (qs.get("from") || "").replace(/[^A-Za-z0-9 _.-]/g, "").slice(0, 24);
    if (vs > 0) showDare(vs, from);
  }
  document.addEventListener("cc:start", function () {
    if (dare && !dareOpened) { dareOpened = true; cc.event("challenge_open", { d: dare.id }); }
  });
  function dareResult(e) {
    var r = e.detail && e.detail.result;
    if (!dare || !r || !r.accepted || !e.detail.playId) return;
    api("/api/dare/" + dare.id + "/beat", { play_id: e.detail.playId, anon: cc._anon }).then(function (b) {
      if (!b || !b.ok) return;
      if (b.beaten) {
        if (window.ccToast) window.ccToast("you beat " + b.from + "'s " + fmt(b.score) + ". dare someone back.");
        if (dareBanner) { dareBanner.querySelector(".dare-text").textContent = "beaten ✓ you topped " + b.from + "'s " + fmt(b.score); dareBanner.classList.add("is-beaten"); }
      } else if (b.need && window.ccToast) window.ccToast(fmt(b.need - e.detail.score) + " short of " + dare.from + "'s " + fmt(b.need) + ". again?");
    });
  }
  // after an accepted run: a button that makes a link for this exact run
  // After an accepted run: a "challenge a friend" box. After a new personal best (not a first run) it is the
  // main ask, and the dare is made up front so the tap can open the share sheet straight away (iOS only allows
  // share() directly inside the tap). A finished share or copy is reported for the funnel in admin metrics.
  // A run with no accepted score (games without a board, or a run that didn't count) gets the same box as
  // "share this game": the card without a score, and a plain link to the game (no dare). Those sends are
  // counted by POST /api/share (admin metrics game_shares).
  function dareButton(e) {
    var r = e.detail && e.detail.result;
    var scored = !!(r && r.accepted && e.detail.playId);
    if (!scored && !info) return;
    var best = scored && r.prev_best != null && e.detail.score > r.prev_best;
    var box = document.getElementById("cc-dare");
    if (!box) { box = document.createElement("div"); box.id = "cc-dare"; (document.getElementById("cc-next") || board).insertAdjacentElement("beforebegin", box); }
    box.className = "cc-levelup cc-dare-box" + (best ? " is-best" : "");
    box.innerHTML = (!scored
      ? "<p>enjoying <b>" + esc(info.title) + "</b>? send it to a friend.</p>"
      : best
      ? "<p><span class=\"cc-dare-kicker\">new best</span> <b>" + esc(fmt(e.detail.score)) + "</b> (was " + esc(fmt(r.prev_best)) + "). dare a friend to beat it.</p>"
      : "<p>scored <b>" + esc(fmt(e.detail.score)) + "</b>. think a friend can beat it?</p>") +
      "<div class=\"cc-dare-btns\"><button type=\"button\" class=\"tool cc-dare-card" + (best ? " cc-dare-go" : "") + "\">share card ▶</button>" +
      "<button type=\"button\" class=\"tool cc-dare-link\">" + (!scored ? "share link" : best ? "just the link" : "challenge a friend") + "</button></div>" +
      "<p class=\"cc-dare-say\" role=\"status\"></p>" +
      "<div class=\"cc-card-out\" hidden><img alt=\"your run as a share card\" width=\"108\" height=\"192\">" +
      "<div><a class=\"tool cc-card-dl\" download>download card</a><button type=\"button\" class=\"tool cc-card-copy\">copy link</button>" +
      "<p class=\"cc-card-tip\">post the card, paste the link.</p></div></div>";
    if (best) pbTip(box);
    var playId = e.detail.playId, out = box.querySelector(".cc-dare-say");
    // what gets sent: a dare for this exact run, or (no score) just the game
    var make = !scored
      ? function () { return Promise.resolve({ ok: true, text: "come play " + info.title + " with me. free, no download.", url: location.origin + "/games/" + game + "/?utm_source=share&utm_medium=" + (navigator.share ? "native" : "link") + "&utm_campaign=share" }); }
      : function () { return api("/api/dare", { play_id: playId, anon: cc._anon, source: best ? "best" : "button" }); };
    var ready = best || !scored ? make() : null, dare = null;
    if (ready) ready.then(function (d) { if (d && d.ok) dare = d; });
    function getDare() {
      return (ready || (ready = make())).then(function (d) {
        if (!d || !d.ok) { ready = null; out.textContent = (d && d.error) || "couldn't make a link. try again."; return null; }
        return (dare = d);
      });
    }
    function sent(how) {
      if (scored) api("/api/dare/" + dare.id + "/shared", { how: how });
      else api("/api/share", { game: game, how: how, anon: cc._anon });
    }
    function done() { out.textContent = !scored ? "sent. thanks for passing it on." : me ? "sent. you'll see it in your feed if they beat it." : "sent. good luck to them."; }

    // the link on its own (as before): share sheet, else copy
    box.querySelector(".cc-dare-link").addEventListener("click", function () {
      if (dare) { sendLink(dare); return; }
      getDare().then(function (d) { if (d) sendLink(d); });
    });
    function sendLink(d) {
      if (navigator.share) {
        navigator.share({ title: info && info.title, text: d.text, url: d.url }).then(function () { sent("share"); done(); }, function () {});
        return;
      }
      copy(d);
    }
    function copy(d) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(d.text + " " + d.url).then(function () { sent("copy"); out.textContent = scored ? "link copied. send it to someone who thinks they're good." : "link copied."; }, function () { out.textContent = d.url; });
      } else out.textContent = d.url;
    }

    // the share card (share-card.js, loaded now): a story-size image of this run + the dare link, drawn while
    // the player looks at their score so the tap can open the share sheet straight away
    var file = null, cardUrl = null;
    // a dare made straight away (a new best) puts its short link on the card; otherwise the card shows the game's address
    var link = ready && scored ? Promise.race([
      ready.then(function (d) { return d && d.ok && d.id ? "computercooked.com/d/" + d.id : null; }, function () { return null; }),
      new Promise(function (res) { setTimeout(function () { res(null); }, 1500); })
    ]) : Promise.resolve(null);
    var card = loadCardMaker().then(function (draw) {
      return link.then(function (l) {
        return draw(scored
          ? { title: info && info.title, slug: game, art: info && info.thumbnail, score: e.detail.score, rank: r.rank, best: best, prev: r.prev_best, link: l }
          : { title: info.title, slug: game, art: info.thumbnail, score: null });
      });
    }).then(function (blob) {
      var name = game + (scored ? "-" + String(Math.round(e.detail.score)) : "") + ".png";
      try { file = new File([blob], name, { type: "image/png" }); } catch (err) { file = null; }
      if (box._cardUrl) URL.revokeObjectURL(box._cardUrl);
      cardUrl = box._cardUrl = URL.createObjectURL(blob);
      var dl = box.querySelector(".cc-card-dl");
      dl.href = cardUrl; dl.setAttribute("download", name);
      box.querySelector(".cc-card-out img").src = cardUrl;
      return blob;
    });
    card.catch(function () {});
    var canFiles = function () { try { return !!(file && navigator.canShare && navigator.canShare({ files: [file] })); } catch (err) { return false; } };
    box.querySelector(".cc-dare-card").addEventListener("click", function () {
      // both ready: share inside this tap (iOS only allows share() straight from the tap)
      if (file && dare) { sendCard(dare); return; }
      out.textContent = "making your card…";
      Promise.all([card, getDare()]).then(function (v) {
        if (!v[1]) return;
        out.textContent = "";
        sendCard(v[1]);
      }, function () { out.textContent = "couldn't draw the card. the link still works."; box.querySelector(".cc-dare-link").focus(); });
    });
    function sendCard(d) {
      if (canFiles()) {
        navigator.share({ files: [file], title: info && info.title, text: d.text + " " + d.url }).then(function () { sent("card"); done(); }, function (err) {
          // the browser wanted a fresh tap (the card or link took a moment): everything's ready now
          if (err && err.name === "NotAllowedError") out.textContent = "card ready. tap share card again.";
          else if (!err || err.name !== "AbortError") showCard(d);
        });
        return;
      }
      showCard(d);
    }
    // no file sharing here (most desktops): show the card with download + copy link
    function showCard(d) {
      var o = box.querySelector(".cc-card-out");
      o.hidden = false;
      out.textContent = "";
      o.querySelector(".cc-card-dl").onclick = function () { sent("download"); };
      o.querySelector(".cc-card-copy").onclick = function () { copy(d); };
    }
  }
  var follow = null;
  function loadFollow() {
    if (!follow) follow = new Promise(function (ok, bad) {
      if (window.ccFollow) return ok(window.ccFollow);
      var s = document.createElement("script");
      s.src = "/assets/follow.js";
      s.onload = function () { window.ccFollow ? ok(window.ccFollow) : bad(new Error("no follow")); };
      s.onerror = function () { follow = null; bad(new Error("no follow")); };
      document.head.appendChild(s);
    });
    return follow;
  }
  var cardMaker = null;
  function loadCardMaker() {
    if (!cardMaker) cardMaker = new Promise(function (ok, bad) {
      if (window.ccShareCard) return ok(window.ccShareCard);
      var s = document.createElement("script");
      s.src = "/games/share-card.js";
      s.onload = function () { window.ccShareCard ? ok(window.ccShareCard) : bad(new Error("no card")); };
      s.onerror = function () { cardMaker = null; bad(new Error("no card")); };
      document.head.appendChild(s);
    });
    return cardMaker;
  }

  // tip jar (off until TIP_URL is a buy.stripe.com Payment Link): a plain link out, no payment here. A click is
  // counted as tip_click (slot post-run, this game) via assets/deck.js → POST /api/hit.
  function tipLine(url) {
    return '<p class="cc-tip"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-tip="post-run">keep the games free: tip the computer ↗</a> <small>18+ / ask a parent</small></p>';
  }
  // after a new personal best (the happiest moment of a run): a small coffee chip under the dare, once per visit.
  // Non-blocking, a plain link out; a click is tip_click slot post-best.
  function pbTip(box) {
    try { if (sessionStorage.getItem("cc-tip-pb")) return; } catch (e) { return; }
    tipUrl().then(function (url) {
      if (!url || !box.isConnected || box.querySelector(".cc-tip-pb")) return;
      try { sessionStorage.setItem("cc-tip-pb", "1"); } catch (e) {}
      box.insertAdjacentHTML("beforeend", '<p class="cc-tip cc-tip-pb"><a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" data-tip="post-best">new best? buy the computer a coffee ↗</a> <small>18+ / ask a parent</small></p>');
      box.querySelector(".cc-tip-pb a").addEventListener("click", function () { if (window.ccHit) window.ccHit("tip_click", { slot: "post-best", game: game }); });
    });
  }
  // the ad layer (assets/ads.js + consent.js): caps and consent only, no network yet; loaded on the first run end
  var adsP = null;
  function adsReady() {
    if (!adsP) adsP = new Promise(function (ok) {
      var n = 0, one = function () { if (++n === 2) ok(window.ccAds || null); };
      ["/assets/consent.js", "/assets/ads.js"].forEach(function (src) {
        var s = document.createElement("script"); s.src = src; s.onload = one; s.onerror = one; document.head.appendChild(s);
      });
    });
    return adsP;
  }
  var tip = null;
  function tipUrl() {
    if (!tip) tip = fetch("/api/tip").then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return j && typeof j.url === "string" && j.url.indexOf("https://buy.stripe.com/") === 0 ? j.url : null; })
      .catch(function () { return null; });
    return tip;
  }

  /* ---------- "play next" rail after a run: the weekly challenge game, one like this, one you haven't tried ---------- */
  // Links carry ?src=next&slot=…; cc-sdk.js tags the next page's first run with it (admin metrics: next).
  function nextRail() {
    if (!catalog || document.getElementById("cc-next")) return;
    var others = catalog.filter(function (g) { return g.slug !== game; });
    if (others.length < 3) return;
    var seen = {};
    try { JSON.parse(localStorage.getItem("cc-recent") || "[]").forEach(function (x, i) { if (x && x.g) seen[x.g] = i + 1; }); } catch (e) {}
    var tags = (info && info.tags) || [];
    var shared = function (g) { return (g.tags || []).filter(function (t) { return tags.indexOf(t) >= 0; }).length; };
    // most shared tags first; then ones not played on this device; then newest
    var alike = others.slice().sort(function (a, b) {
      return shared(b) - shared(a) || (seen[a.slug] ? 1 : 0) - (seen[b.slug] ? 1 : 0) || String(b.added || "").localeCompare(String(a.added || ""));
    });
    var fresh = others.filter(function (g) { return !seen[g.slug]; });
    var taken = {};
    var take = function (g, slot, label) { taken[g.slug] = 1; return { g: g, slot: slot, label: label }; };
    var free = function (g) { return g && !taken[g.slug]; };
    return api("/api/challenge").then(function (r) {
      var c = r && r.ok && r.challenge, picks = [];
      var cg = c && c.game !== game && others.filter(function (g) { return g.slug === c.game; })[0];
      if (cg) picks.push(take(cg, "challenge", "weekly challenge"));
      var nw = fresh.filter(free);
      nw = nw[Math.floor(Math.random() * nw.length)];
      var like = alike.filter(function (g) { return free(g) && g !== nw; })[0];
      if (like) picks.push(take(like, "similar", "more like this"));
      if (nw) picks.push(take(nw, "new", "you haven't tried"));
      // short of three (no challenge card, or everything played): more like this, unplayed first
      alike.filter(free).sort(function (a, b) { return (seen[a.slug] ? 1 : 0) - (seen[b.slug] ? 1 : 0); }).slice(0, 3 - picks.length).forEach(function (g) {
        picks.push(seen[g.slug] ? take(g, "similar", "play again") : take(g, "new", "you haven't tried"));
      });
      if (document.getElementById("cc-next")) return;
      var rail = el('<nav class="cc-next" id="cc-next" aria-label="play next"><h2>play next</h2><div class="cc-next-row">' +
        picks.slice(0, 3).map(function (p) {
          return '<a class="cc-next-card" href="/games/' + encodeURIComponent(p.g.slug) + '/?src=next&amp;slot=' + p.slot + '">' +
            '<img src="' + esc(p.g.thumbnail || "") + '" alt="" loading="lazy" width="160" height="90">' +
            '<span class="cc-next-k">' + esc(p.label) + "</span><b>" + esc(p.g.title) + "</b></a>";
        }).join("") + "</div></nav>");
      rail.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest("a[data-tip]");
        if (a && window.ccHit) window.ccHit("tip_click", { slot: "post-run", game: game });
      });
      houseAsk(rail);
      var dareBox = document.getElementById("cc-dare");
      if (dareBox) dareBox.insertAdjacentElement("afterend", rail);
      else board.insertAdjacentElement("beforebegin", rail);
    });
  }

  // daily 3 (assets/daily3.js, /games/daily/): a run in one of the three counts for today
  function daily3(slug) {
    if (["crash-test-daily", "desktop-jam", "fathom"].indexOf(slug) < 0) return;
    var go = function () {
      var r = window.ccDaily3 && window.ccDaily3.mark(slug);
      if (r && window.ccToast) window.ccToast(r.done < r.of ? "daily 3: " + r.done + "/" + r.of + " today" : "daily 3 done" + (r.streak ? " · " + r.streak + "-day streak" : ""));
    };
    if (window.ccDaily3) return go();
    var s = document.createElement("script"); s.src = "/assets/daily3.js"; s.onload = go; document.head.appendChild(s);
  }

  // the end of the rail holds one house ask. From the 3rd run of a visit (someone who's hooked): the follow card,
  // "this game came from a tiktok trend" (audit P1 #24). Before that: the tip jar when it's on, else the follow card.
  // Never on top of a new-best dare, which is the ask then.
  function visitRuns() { try { return +sessionStorage.getItem("cc-runs") || 0; } catch (e) { return 0; } }
  function houseAsk(rail) {
    if (!rail || rail.querySelector(".cc-follow")) return;
    var d = document.getElementById("cc-dare");
    var follow = function () {
      if (d && d.classList.contains("is-best")) return;
      loadFollow().then(function (f) {
        if (rail.querySelector(".cc-follow")) return;
        var t = rail.querySelector(".cc-tip"); if (t) t.remove();
        rail.insertAdjacentHTML("beforeend", f.card("post-run", visitRuns() >= 3 ? "this game came from a tiktok trend. follow for the next one" : null));
        f.bind(rail);
      }, function () {});
    };
    if (visitRuns() >= 3) return follow();
    tipUrl().then(function (url) {
      if (!url) return follow();
      if (!rail.querySelector(".cc-tip")) rail.insertAdjacentHTML("beforeend", tipLine(url));
    });
  }

  /* ---------- after a run ---------- */
  document.addEventListener("cc:end", function (e) {
    try { sessionStorage.setItem("cc-runs", String(visitRuns() + 1)); } catch (err) {}
    daily3(game);
    houseAsk(document.getElementById("cc-next"));
    if (!board.hidden) setTimeout(loadBoard, 300);
    fb.classList.add("cc-pulse");
    setTimeout(function () { fb.classList.remove("cc-pulse"); }, 2400);
    var r = e.detail && e.detail.result;
    var say = window.ccToast || function () {};
    if (r && r.accepted) say(r.today && r.today.of > 1
      ? "#" + r.today.rank + " of " + r.today.of + " today" + (r.best === e.detail.score ? " · new best" : "") + " · #" + r.rank + " all-time"
      : "#" + r.rank + " on the all-time board" + (r.best === e.detail.score ? " · new best" : ""));
    if (r && r.accepted && me) friendNudge(say);
    dareResult(e);
    dareButton(e);
    nextRail();
    adsReady().then(function (a) { if (a) a.runEnded(game); });
    var x = r && r.xp;
    if (x && x.gained > 0) {
      say("+" + x.gained + " xp" + (x.parts && x.parts.some(function (p) { return p.kind === "first"; }) ? " · first time playing" : ""));
      if (x.parts && x.parts.some(function (p) { return p.kind === "challenge"; })) { say("weekly challenge done ✓"); loadChallenge(); }
      if (x.leveled_up) levelUp(x);
    } else if (x && x.parts && x.parts.some(function (p) { return p.kind === "cap"; })) {
      say("daily xp for this game maxed. try another one.");
    } else if (r && !x && !me && !nudged()) {
      say("log in to earn xp and levels for runs like that.");
    }
  });
  document.addEventListener("cc:achieve", function (e) {
    var a = e.detail;
    if (a && window.ccToast) window.ccToast("unlocked: " + a.name + (a.xp ? " · +" + a.xp + " xp" : ""));
  });
  // friends board before/after a run: "you passed sam" or "sam is 40 ahead"
  var friendsBefore = null;
  function friendRows() {
    return api("/api/leaderboard?game=" + encodeURIComponent(game) + "&period=all&friends=1").then(function (r) { return r && r.ok ? r.rows : null; });
  }
  var prefetched = false;
  function prefetchFriends() {
    if (prefetched || !me || !info || !info.max_score_per_sec) return;
    prefetched = true;
    friendRows().then(function (rows) { if (rows && !friendsBefore) friendsBefore = rows; });
  }
  function friendNudge(say) {
    var before = friendsBefore;
    setTimeout(function () {
      friendRows().then(function (rows) {
        if (!rows || rows.length < 2) return; // no friends with scores here yet
        friendsBefore = rows;
        var mine = rows.filter(function (x) { return x.me; })[0];
        if (!mine) return;
        // friends who were above you before this run (or anyone, if you had no score) and are now below
        var meBefore = before && before.filter(function (b) { return b.me; })[0];
        var passed = before && before.filter(function (b) {
          return !b.me && (!meBefore || b.rank < meBefore.rank) && b.score < mine.score;
        });
        if (passed && passed.length) { say("you passed " + passed[0].name + " on your friends board"); return; }
        var above = rows.filter(function (x) { return x.rank === mine.rank - 1; })[0];
        if (above) say(above.name + " is " + fmt(above.score - mine.score) + " ahead of you. go get them.");
        else say("top of your friends board on this one.");
      });
    }, 400);
  }
  function nudged() {
    try { if (sessionStorage.getItem("cc-xp-nudge")) return true; sessionStorage.setItem("cc-xp-nudge", "1"); } catch (e) {}
    return false;
  }
  // level up: a toast, plus a share button on the panel for the rest of the visit
  function levelUp(x) {
    if (window.ccToast) window.ccToast("level " + x.level + " · " + x.title);
    (x.unlocks || []).forEach(function (u) { if (window.ccToast) window.ccToast("unlocked: " + u.name + " · wear it from your profile"); });
    var box = document.getElementById("cc-levelup");
    if (!box) { box = document.createElement("div"); box.id = "cc-levelup"; box.className = "cc-levelup"; panel.insertBefore(box, panel.firstChild); }
    box.innerHTML = '<p><b>level ' + x.level + '</b> · ' + esc(x.title) + '</p><button type="button" class="tool">share</button>';
    box.querySelector("button").addEventListener("click", function () {
      var text = "just hit level " + x.level + " (" + x.title + ") on computer cooked games.";
      var url = "https://computercooked.com/games/";
      if (navigator.share) navigator.share({ text: text, url: url }).catch(function () {});
      else if (navigator.clipboard) navigator.clipboard.writeText(text + " " + url).then(function () { window.ccToast && window.ccToast("copied."); });
    });
  }
  }
})();
