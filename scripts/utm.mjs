// Tagged links (K-0054): plays and sessions by utm_source and utm_campaign. node scripts/utm.mjs <base> <admin token> [days]
//   node scripts/utm.mjs https://computercooked.com "$TOKEN" 7
// Reads GET /api/admin/utm (src/utm.js); the same tables are on /admin. Add --json for the raw response.
// The token is only sent in the Authorization header.
const args = process.argv.slice(2).filter((a) => a !== "--json");
const [base, token, days = "7"] = args;
if (!base || !token) {
  console.error("usage: node scripts/utm.mjs <base> <admin token> [days] [--json]");
  process.exit(2);
}
const res = await fetch(base.replace(/\/$/, "") + "/api/admin/utm?days=" + encodeURIComponent(days), { headers: { authorization: "Bearer " + token } });
if (!res.ok) {
  console.error("utm report failed: HTTP " + res.status);
  process.exit(1);
}
const d = await res.json();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(d, null, 2));
  process.exit(0);
}
const dash = (v) => (v == null || v === "" ? "-" : String(v));
function table(head, rows) {
  const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (r) => r.map((c, i) => (typeof c === "number" ? String(c).padStart(w[i]) : String(c).padEnd(w[i]))).join("  ");
  console.log(line(head));
  console.log(w.map((n) => "-".repeat(n)).join("  "));
  rows.forEach((r) => console.log(line(r)));
  if (!rows.length) console.log("(no tagged visits yet)");
}
console.log(`tagged links, last ${d.days} days (${d.from.slice(0, 10)} to ${d.to.slice(0, 10)} UTC)`);
console.log(`whole site: ${d.site.sessions} sessions, ${d.site.plays} plays\n`);
table(["utm_source", "campaigns", "sessions", "plays", "page views", "visitors"],
  d.sources.map((s) => [dash(s.source), s.campaigns, s.sessions, s.plays, s.page_views, s.visitors]));
console.log("");
table(["utm_source", "utm_campaign", "medium", "sessions", "plays", "players", "landed on", "games played"],
  d.rows.map((r) => [dash(r.source), dash(r.campaign), dash(r.medium), r.sessions, r.plays, r.players, r.landing_pages.join(" ") || "-", r.games.join(" ") || "-"]));
const HOWS = ["card", "clip", "clip-download", "download", "share", "copy"];
console.log("\ngame-over shares (K-0055)");
table(["game", "total", ...HOWS], (d.shares || []).map((s) => [s.game, s.total, ...HOWS.map((h) => s.by_how[h] || 0)]));
const fc = d.follow_clicks || { games: [], by_slot: {}, total: 0 };
console.log(`\nfollow link clicks: ${fc.total} (${Object.entries(fc.by_slot).map(([k, v]) => k + " " + v).join(", ") || "none"})`);
table(["page", "total", "tiktok", "instagram", "x", "youtube"], fc.games.map((f) => [f.game, f.total, f.tiktok, f.instagram, f.x, f.youtube]));
