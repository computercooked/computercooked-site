// Daily digest as a readable table: node scripts/digest.mjs <base> <admin token> [days]
//   node scripts/digest.mjs https://computercooked.com "$TOKEN" 7
// Reads GET /api/admin/digest (Pacific-time days, smoke traffic left out). Add --json for the raw response.
// The token is only sent in the Authorization header; it is never printed.
const args = process.argv.slice(2).filter((a) => a !== "--json");
const raw = process.argv.includes("--json");
const [base, token, days = "7"] = args;
if (!base || !token) {
  console.error("usage: node scripts/digest.mjs <base> <admin token> [days] [--json]");
  process.exit(2);
}

const res = await fetch(base.replace(/\/$/, "") + "/api/admin/digest?days=" + encodeURIComponent(days), { headers: { authorization: "Bearer " + token } });
if (!res.ok) {
  console.error("digest failed: HTTP " + res.status);
  process.exit(1);
}
const d = await res.json();
if (raw) {
  console.log(JSON.stringify(d, null, 2));
  process.exit(0);
}

function table(head, rows) {
  const w = head.map((h, i) => Math.max(String(h).length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => r.map((c, i) => (i === 0 ? String(c).padEnd(w[i]) : String(c).padStart(w[i]))).join("  ");
  console.log(line(head));
  console.log(w.map((n) => "-".repeat(n)).join("  "));
  rows.forEach((r) => console.log(line(r)));
}
const dash = (v) => (v == null ? "-" : v);
const social = (r) => r.ref.tiktok + r.ref.youtube + r.ref.instagram + r.ref.x + r.ref.threads + r.ref.bluesky;

console.log(`computer cooked games: daily digest, ${d.from} to ${d.to} (${d.tz}; the last day is so far)\n`);
table(
  ["day", "plays", "players", "new", "d1 back", "tiktok", "yt", "ig", "x", "thr/bsky", "search", "other", "direct", "internal", "app", "embed", "next/run", "shares", "follows tt/yt/ig/x", "dares m/s/o/b", "accts"],
  d.rows.map((r) => [
    r.date + (r.partial ? "*" : ""), r.plays, r.players, r.new_players,
    r.d1_return ? `${r.d1_return.back}/${r.d1_return.of}` : "-",
    r.ref.tiktok, r.ref.youtube, r.ref.instagram, r.ref.x, r.ref.threads + r.ref.bluesky, r.ref.search, r.ref.other, r.ref.direct, r.ref.internal, r.ref.app, r.ref.embed,
    dash(r.next.per_run), r.game_shares, r.follow_clicks ? `${r.follow_clicks.tiktok}/${r.follow_clicks.youtube}/${r.follow_clicks.instagram}/${r.follow_clicks.x}` : "-", `${r.dares.made}/${r.dares.sent}/${r.dares.opened}/${r.dares.beaten}`, r.new_accounts,
  ])
);
const tot = d.rows.reduce((a, r) => ({ plays: a.plays + r.plays, social: a.social + social(r), shares: a.shares + r.game_shares, follows: a.follows + (r.follow_clicks ? Object.values(r.follow_clicks).reduce((s, n) => s + n, 0) : 0), dares: a.dares + r.dares.sent, accts: a.accts + r.new_accounts }), { plays: 0, social: 0, shares: 0, follows: 0, dares: 0, accts: 0 });
console.log(`\ntotal: ${tot.plays} plays (${tot.social} from social), ${tot.shares} game shares, ${tot.follows} follow clicks, ${tot.dares} dares sent, ${tot.accts} new accounts\n`);

console.log("by game (whole window)");
table(
  ["game", "plays", "players", "completion %", "auto %"],
  d.games.map((g) => [g.game, g.plays, g.players, dash(g.completion_pct), dash(g.auto_pct)])
);

if (d.rows[0] && d.rows[0].site) {
  console.log("\nsite visits (visitors = browsers seen that day; returning = seen on an earlier day; time = visible time per page)");
  table(
    ["day", "page views", "visitors", "returning", "returning %", "avg time s"],
    d.rows.map((r) => [r.date + (r.partial ? "*" : ""), r.site.page_views, r.site.visitors, r.site.returning, dash(r.site.returning_pct), dash(r.site.avg_time_s)])
  );
}
if (d.rows[0] && d.rows[0].returning_players != null) {
  console.log("\nplayers (returning = had played before that day)");
  table(["day", "players", "new", "returning"], d.rows.map((r) => [r.date + (r.partial ? "*" : ""), r.players, r.new_players, r.returning_players]));
}
if (d.utm && d.utm.length) {
  console.log("\ntagged links (utm_source / utm_medium / utm_campaign, whole window)");
  table(["source", "medium", "campaign", "page views", "visitors", "plays", "games played"],
    d.utm.map((u) => [dash(u.source), dash(u.medium), dash(u.campaign), u.page_views, u.visitors, u.plays, u.games.join(" ") || "-"]));
}
if (d.game_pages && d.game_pages.length) {
  console.log("\ngame pages (whole window)");
  table(["game", "page views", "avg time s"], d.game_pages.map((g) => [g.game, g.views, dash(g.avg_time_s)]));
}
