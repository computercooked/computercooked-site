/* Site → socials follow loop: the "follow @computercooked" house card and the compact follow row.
   window.ccFollow.card(slot) / .row(slot) return HTML; .bind(el) counts clicks in it (POST /api/follow →
   a cc:follow_click event, follow_clicks in admin metrics + digest). Plain links out (new tab, noopener):
   no pixels, no third-party scripts. Used by games/hub.js (hub card + footer) and games/platform.js (after a run). */
(function () {
  "use strict";
  var LINKS = [
    { id: "tiktok", label: "tiktok", url: "https://www.tiktok.com/@computercooked",
      icon: '<path d="M14 3h3c.3 2 1.6 3.4 3.6 3.6v3c-1.4 0-2.6-.4-3.6-1v6.2A5.8 5.8 0 1 1 11.2 9v3.1a2.7 2.7 0 1 0 2.8 2.7z"/>' },
    { id: "youtube", label: "youtube", url: "https://www.youtube.com/@computercooked?sub_confirmation=1",
      icon: '<path d="M21.6 7.2a2.7 2.7 0 0 0-1.9-1.9C18 4.8 12 4.8 12 4.8s-6 0-7.7.5a2.7 2.7 0 0 0-1.9 1.9C2 8.9 2 12 2 12s0 3.1.4 4.8a2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.7.5 7.7.5s6 0 7.7-.5a2.7 2.7 0 0 0 1.9-1.9c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8zM10 15.1V8.9l5.2 3.1z"/>' },
    { id: "instagram", label: "instagram", url: "https://www.instagram.com/computercooked/",
      icon: '<path d="M12 7.3a4.7 4.7 0 1 0 0 9.4 4.7 4.7 0 0 0 0-9.4zm0 7.7a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM17 6a1.1 1.1 0 1 0 0 2.2A1.1 1.1 0 0 0 17 6zM16.4 2H7.6A5.6 5.6 0 0 0 2 7.6v8.8A5.6 5.6 0 0 0 7.6 22h8.8a5.6 5.6 0 0 0 5.6-5.6V7.6A5.6 5.6 0 0 0 16.4 2zm3.8 14.4a3.8 3.8 0 0 1-3.8 3.8H7.6a3.8 3.8 0 0 1-3.8-3.8V7.6a3.8 3.8 0 0 1 3.8-3.8h8.8a3.8 3.8 0 0 1 3.8 3.8z"/>' },
    { id: "x", label: "x", url: "https://x.com/computercooked",
      icon: '<path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/>' },
  ];
  // UTMs on the way out, so a platform's own link analytics can tell site clicks apart (slot = where the button was)
  function out(l, slot) {
    return l.url + (l.url.indexOf("?") < 0 ? "?" : "&") + "utm_source=computercooked&utm_medium=" + encodeURIComponent(slot) + "&utm_campaign=follow";
  }
  function btn(l, slot) {
    return '<a class="cc-follow-btn" href="' + out(l, slot) + '" target="_blank" rel="noopener" data-follow="' + l.id + '" data-slot="' + slot + '">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + l.icon + "</svg><span>" + l.label + "</span></a>";
  }
  function card(slot) {
    return '<aside class="cc-follow" aria-label="follow computer cooked">' +
      '<p class="cc-follow-k"><span class="cc-follow-dot" aria-hidden="true"></span>new games drop on our tiktok first</p>' +
      '<p class="cc-follow-h">follow <b>@computercooked</b></p>' +
      '<div class="cc-follow-btns">' + LINKS.map(function (l) { return btn(l, slot); }).join("") + "</div></aside>";
  }
  function row(slot) {
    return '<p class="cc-follow-row"><span>follow @computercooked</span> ' + LINKS.map(function (l) { return btn(l, slot); }).join("") + "</p>";
  }
  function anon() { try { return localStorage.getItem("cc-anon"); } catch (e) { return null; } }
  function game() { var m = /^\/games\/([a-z0-9-]+)\//.exec(location.pathname); return m ? m[1] : null; }
  // count the click; the link itself still opens normally (keepalive: survives this page being left)
  function bind(el) {
    if (!el || el._ccFollow) return;
    el._ccFollow = true;
    el.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[data-follow]");
      if (!a) return;
      try {
        fetch("/api/follow", { method: "POST", keepalive: true, headers: { "content-type": "application/json" },
          body: JSON.stringify({ platform: a.dataset.follow, slot: a.dataset.slot, game: game(), anon: anon() }) }).catch(function () {});
      } catch (err) {}
    });
  }
  window.ccFollow = { card: card, row: row, bind: bind, links: LINKS };
})();
