/* /admin: reads /api/admin/* with the bearer token (kept in sessionStorage only for this tab). */
(function () {
  "use strict";
  var $ = function (s) { return document.querySelector(s); };
  var token = "";
  try { token = sessionStorage.getItem("cc-admin") || ""; } catch (e) {}
  $("#token").value = token;
  $("#since").value = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pct(x) { return x == null ? "–" : Math.round(x * 100) + "%"; }
  function api(path, body) {
    return fetch(path, {
      method: body ? "POST" : "GET",
      headers: Object.assign({ authorization: "Bearer " + token }, body ? { "content-type": "application/json" } : {}),
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) { return r.json(); });
  }
  function table(el, cols, rows) {
    el.innerHTML = "<thead><tr>" + cols.map(function (c) { return "<th>" + c[0] + "</th>"; }).join("") + "</tr></thead><tbody>" +
      (rows.length ? rows.map(function (r) { return "<tr>" + cols.map(function (c) { var v = c[1](r); return '<td class="' + (c[2] || "") + '">' + v + "</td>"; }).join("") + "</tr>"; }).join("")
        : '<tr><td colspan="' + cols.length + '">nothing here</td></tr>') + "</tbody>";
  }

  function load() {
    $("#msg").textContent = "loading…";
    api("/api/admin/metrics?since=" + $("#since").value).then(function (m) {
      if (!m.ok) { $("#msg").textContent = "token rejected"; $("#dash").hidden = true; return; }
      $("#msg").textContent = "updated " + new Date(m.generated_at).toLocaleTimeString();
      $("#dash").hidden = false;
      var t = m.totals;
      $("#totals").innerHTML = [["plays", t.plays], ["accounts", t.accounts], ["new accounts", t.new_accounts], ["uploads pending", t.uploads_pending], ["open reports", t.open_reports]]
        .map(function (x) { return "<div><b>" + x[1] + "</b><span>" + x[0] + "</span></div>"; }).join("");
      // site funnel strip, then per game, then where the follow / tip / dare / campaign numbers come from
      var f = m.funnel || {};
      var steps = [["landed", f.landed], ["played", f.played], ["finished", f.finished], ["shared", f.shared], ["followed", f.followed]];
      $("#funnel").innerHTML = steps.map(function (s, i) {
        var prev = i ? steps[i - 1][1] : null;
        return "<div><b>" + (s[1] || 0) + "</b><span>" + s[0] + (prev ? " · " + pct(s[1] / prev) : "") + "</span></div>";
      }).join("") + "<div><b>" + (f.tip_clicks || 0) + "</b><span>tip clicks</span></div><div><b>" + (f.signups || 0) + "</b><span>sign-ups</span></div>" +
        "<div><b>" + (f.dares_opened || 0) + "</b><span>dares opened</span></div>";
      var step = function (a, b) { return b ? " <small>" + pct(a / b) + "</small>" : ""; };
      table($("#funnel-table"), [
        ["game", function (g) { return esc(g.title); }],
        ["landed", function (g) { return g.funnel.landed; }, "n"],
        ["played", function (g) { return g.funnel.played + step(g.funnel.played, g.funnel.landed); }, "n"],
        ["finished", function (g) { return g.funnel.finished + step(g.funnel.finished, g.funnel.played); }, "n"],
        ["shared", function (g) { return g.funnel.shared + step(g.funnel.shared, g.funnel.finished); }, "n"],
        ["followed", function (g) { return g.funnel.followed + step(g.funnel.followed, g.funnel.finished); }, "n"]
      ], m.games.filter(function (g) { return g.funnel && (g.funnel.landed || g.funnel.played); }));
      var kv = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k]; }).map(function (k) { return esc(k) + " " + o[k]; }).join(", ") || "–"; };
      var d = m.dares || {}, fc = m.follow_clicks || {}, tp = m.tips || {};
      table($("#extras-table"), [["what", function (x) { return x[0]; }], ["numbers", function (x) { return x[1]; }, "wrap"]], [
        ["dares", d.made + " made → " + d.sent + " sent → " + d.opened + " opened → " + d.beaten + " beaten"],
        ["follow clicks", fc.total + " · " + kv(fc.by_platform) + " · from " + kv(fc.by_slot)],
        ["ad slots (no network yet)", ((m.ad_slots || {}).interstitial || 0) + " interstitial · " + ((m.ad_slots || {}).rewarded || 0) + " rewarded"],
        ["tips", tp.clicks + " clicks (" + kv(tp.clicks_by_slot) + ") · " + tp.successes + " paid"],
        ["page views by channel", kv((m.pageviews || {}).by_ref)],
        ["plays by channel", kv(m.plays_by_ref)],
        ["campaigns", Object.keys(m.campaigns || {}).map(function (c) { var x = m.campaigns[c]; return esc(c) + ": " + x.pageviews + " views, " + x.plays + " plays, " + x.tip_clicks + " tip clicks"; }).join(" · ") || "–"]
      ]);

      var LBL = { d1: "next day", d7: "week later", replay: "replays", share: "shares", session: "session", rating: "rating", outside: "outside traffic" };
      (m.winners || []).forEach(function (w, i) { w.rank = w.verdict === "too early" ? 0 : i + 1; });
      table($("#win-table"), [
        ["#", function (w) { return w.rank || "–"; }],
        ["game", function (w) { return esc(w.title); }],
        ["score", function (w) { return w.score == null ? "–" : '<b class="adm-score s' + (w.score >= 60 ? 3 : w.score >= 40 ? 2 : 1) + '">' + w.score + "</b>"; }, "n"],
        ["verdict", function (w) { return esc(w.verdict) + (w.verdict === "too early" ? " <small>(" + w.players_needed + " more players)</small>" : ""); }],
        ["players", function (w) { return w.players || 0; }, "n"],
        ["plays", function (w) { return w.plays || 0; }, "n"],
        ["fix first", function (w) { return w.weakest ? esc(LBL[w.weakest] || w.weakest) : "–"; }],
        ["signals", function (w) { return Object.keys(LBL).filter(function (k) { return w.parts[k] != null; }).map(function (k) { return esc(LBL[k]) + " " + w.parts[k]; }).join(" · ") || "–"; }]
      ], m.winners || []);
      table($("#games-table"), [
        ["game", function (g) { return esc(g.title); }],
        ["plays", function (g) { return g.plays; }, "n"],
        ["players", function (g) { return g.unique_players; }, "n"],
        ["avg secs", function (g) { return g.avg_session_seconds == null ? "–" : g.avg_session_seconds; }, "n"],
        ["completion", function (g) { return pct(g.completion_rate); }, "n"],
        ["shares", function (g) { return g.shares ? g.shares.total + " <small>(" + g.shares.dares_sent + " dares)</small>" : "–"; }, "n"],
        ["outside", function (g) { return g.plays ? pct(g.outside_plays / g.plays) : "–"; }, "n"],
        ["minutes", function (g) { return g.total_minutes || 0; }, "n"],
        ["D1", function (g) { return pct(g.d1_return_rate) + " <small>(" + g.d1_cohort + ")</small>"; }, "n"],
        ["D7", function (g) { return pct(g.d7_return_rate) + " <small>(" + g.d7_cohort + ")</small>"; }, "n"],
        ["👍/👎", function (g) { return g.thumbs_up + " / " + g.thumbs_down; }, "n"],
        ["feedback", function (g) { return g.feedback_count; }, "n"],
        ["top refs", function (g) { return g.top_referrers.map(function (r) { return esc(r.referrer) + " " + r.plays; }).join(", "); }],
        ["testers", function (g) { return g.testers.map(function (r) { return esc(r.tester) + " " + r.plays; }).join(", ") || "–"; }],
        ["devices", function (g) { return Object.keys(g.devices).map(function (k) { return k + " " + g.devices[k]; }).join(", "); }]
      ], m.games);
      var fb = [];
      m.games.forEach(function (g) { g.latest_feedback.forEach(function (f) { fb.push(Object.assign({ game: g.title }, f)); }); });
      fb.sort(function (a, b) { return a.at < b.at ? 1 : -1; });
      table($("#fb-table"), [
        ["when", function (f) { return esc(f.at.slice(0, 16).replace("T", " ")); }],
        ["game", function (f) { return esc(f.game); }],
        ["", function (f) { return f.rating > 0 ? "👍" : f.rating < 0 ? "👎" : ""; }],
        ["tester", function (f) { return esc(f.tester || ""); }],
        ["text", function (f) { return esc(f.text); }, "wrap"]
      ], fb.slice(0, 50));
    }).catch(function () { $("#msg").textContent = "couldn't reach the api"; });

    // K-0054: plays and sessions by utm_source and utm_campaign, last 7 days (src/utm.js)
    api("/api/admin/utm?days=7").then(function (u) {
      if (!u.ok) return;
      var dash = function (v) { return v ? esc(v) : "–"; };
      $("#utm-site").textContent = "whole site, same 7 days: " + u.site.sessions + " sessions, " + u.site.plays + " plays.";
      table($("#utm-sources"), [
        ["utm_source", function (s) { return dash(s.source); }],
        ["campaigns", function (s) { return s.campaigns; }, "n"],
        ["sessions", function (s) { return s.sessions; }, "n"],
        ["plays", function (s) { return s.plays; }, "n"],
        ["page views", function (s) { return s.page_views; }, "n"],
        ["visitors", function (s) { return s.visitors; }, "n"]
      ], u.sources);
      table($("#utm-table"), [
        ["utm_source", function (r) { return dash(r.source); }],
        ["utm_campaign", function (r) { return dash(r.campaign); }],
        ["medium", function (r) { return dash(r.medium); }],
        ["sessions", function (r) { return r.sessions; }, "n"],
        ["plays", function (r) { return r.plays; }, "n"],
        ["players", function (r) { return r.players; }, "n"],
        ["page views", function (r) { return r.page_views; }, "n"],
        ["landed on", function (r) { return esc(r.landing_pages.join(" ")) || "–"; }, "wrap"],
        ["games played", function (r) { return esc(r.games.join(" ")) || "–"; }, "wrap"]
      ], u.rows);
    });

    api("/api/admin/reports").then(function (r) {
      if (!r.ok) return;
      table($("#reports-table"), [
        ["id", function (x) { return x.id; }], ["kind", function (x) { return esc(x.kind); }], ["target", function (x) { return esc(x.target); }],
        ["reason", function (x) { return esc(x.reason); }, "wrap"], ["when", function (x) { return new Date(x.ts).toISOString().slice(0, 16).replace("T", " "); }]
      ], r.reports);
    });

    api("/api/admin/uploads").then(function (r) {
      var box = $("#uploads");
      if (!r.ok) { box.textContent = "uploads unavailable"; return; }
      var pending = r.uploads.filter(function (u) { return u.status === "pending"; });
      if (!pending.length) { box.innerHTML = "<p>nothing waiting.</p>"; return; }
      box.innerHTML = pending.map(function (u) {
        return '<div class="adm-up" data-id="' + esc(u.id) + '"><b>' + esc(u.title) + "</b> <small>" + esc(u.slug) + " · " + Math.round(u.size / 1024) + " KB · " + u.files + " files</small>" +
          "<p>" + esc(u.pitch || "") + "</p>" +
          (r.preview_base ? '<iframe sandbox="allow-scripts" src="' + esc(r.preview_base + "/" + u.id + "/index.html") + '" title="preview"></iframe>' : "") +
          '<div class="adm-row"><input placeholder="note to uploader (optional)" class="adm-note"><button class="cc-send" data-act="approve">approve</button><button class="tool" data-act="reject">reject</button></div></div>';
      }).join("");
    });
  }

  $("#uploads").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-act]");
    if (!b) return;
    var card = b.closest(".adm-up");
    api("/api/admin/uploads", { id: card.dataset.id, action: b.dataset.act, note: card.querySelector(".adm-note").value }).then(function (r) {
      card.outerHTML = "<p>" + (r.ok ? b.dataset.act + "d." : esc(r.error || "failed")) + "</p>";
    });
  });

  $("#login").addEventListener("submit", function (e) {
    e.preventDefault();
    token = $("#token").value.trim();
    try { sessionStorage.setItem("cc-admin", token); } catch (err) {}
    load();
  });
  $("#mod").addEventListener("submit", function (e) {
    e.preventDefault();
    api("/api/admin/moderate", { action: $("#mod-action").value, id: $("#mod-id").value.trim() }).then(function (r) {
      alert(r.ok ? "done" : r.error || "failed");
      load();
    });
  });
  if (token) load();
})();
