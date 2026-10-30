// "What should we make next?" submissions, newest first: node scripts/ideas.mjs <base> <admin token> [days]
//   node scripts/ideas.mjs https://computercooked.com "$TOKEN" 14
// Reads GET /api/admin/ideas. Add --json for the raw response. The token is only sent in the Authorization header.
const args = process.argv.slice(2).filter((a) => a !== "--json");
const [base, token, days = "14"] = args;
if (!base || !token) {
  console.error("usage: node scripts/ideas.mjs <base> <admin token> [days] [--json]");
  process.exit(2);
}
const res = await fetch(base.replace(/\/$/, "") + "/api/admin/ideas?days=" + encodeURIComponent(days), { headers: { authorization: "Bearer " + token } });
if (!res.ok) {
  console.error("ideas failed: HTTP " + res.status);
  process.exit(1);
}
const d = await res.json();
if (process.argv.includes("--json")) {
  console.log(JSON.stringify(d, null, 2));
  process.exit(0);
}
console.log(`game ideas, last ${d.days} days: ${d.count}\n`);
for (const i of d.ideas) console.log(`${i.at.slice(0, 16).replace("T", " ")} UTC  ${i.handle ? "@" + i.handle : "(no handle)"}  [${i.page}]\n  ${i.text}\n`);
