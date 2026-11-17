// Daily analytics file (K-0065): node scripts/export-analytics.mjs <base> <token file> <out dir> [days]
//   node scripts/export-analytics.mjs https://computercooked.com "<path to .metrics-token>" "<folder>" 7
// Saves GET /api/admin/digest as <out dir>/cc-analytics-latest.json and cc-analytics-<Pacific date>.json, for readers
// that can't hold the admin token. The digest has counts only: no player ids, names or feedback text.
// The token is read from the file and only sent in the Authorization header; it is never printed or written.
import { readFileSync, writeFileSync, renameSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const [base, tokenFile, outDir, days = "7"] = process.argv.slice(2);
if (!base || !tokenFile || !outDir) {
  console.error("usage: node scripts/export-analytics.mjs <base> <token file> <out dir> [days]");
  process.exit(2);
}
// the file may have # comment lines; the token is the one line left. Errors never include it.
const lines = readFileSync(tokenFile, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
const token = lines.length === 1 && /^[A-Za-z0-9_-]{24,200}$/.test(lines[0]) ? lines[0] : null;
if (!token) {
  console.error("token file: expected one token line (comments with # are skipped)");
  process.exit(2);
}
let res;
try {
  res = await fetch(base.replace(/\/$/, "") + "/api/admin/digest?days=" + encodeURIComponent(days), { headers: { authorization: "Bearer " + token } });
} catch (e) {
  console.error("digest failed: network error");
  process.exit(1);
}
if (!res.ok) {
  console.error("digest failed: HTTP " + res.status);
  process.exit(1);
}
const d = await res.json();
const out = {
  about: "computercooked.com analytics, one row per Pacific day (the last row is today so far). Fields: docs/platform-api.md, \"Daily digest\".",
  ...d,
};
mkdirSync(outDir, { recursive: true });
const text = JSON.stringify(out, null, 2) + "\n";
for (const name of ["cc-analytics-" + d.to + ".json", "cc-analytics-latest.json"]) {
  const tmp = join(outDir, name + ".tmp");
  writeFileSync(tmp, text);
  renameSync(tmp, join(outDir, name));
}
console.log(`saved ${d.from} to ${d.to} (${d.rows.length} days) in ${outDir}`);

// round 21: the TikTok funnel, one line per Pacific day (newest first) for cc-social to paste next to each post's
// numbers. Asks for 15 days so the older lines have their full 7 days of "back" counted.
const f = await fetch(base.replace(/\/$/, "") + "/api/admin/digest?days=15", { headers: { authorization: "Bearer " + token } })
  .then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (f && f.ok) {
  const pc = (a, b) => (b ? ` (${Math.round((a / b) * 100)}%)` : "");
  const line = (label, t) => {
    if (!t || (!t.landed && !t.played)) return `${label} · landed 0 · played 0`;
    const back = t.played ? ` · back within 7 days ${t.back_7d} of ${t.played}${t.still_open ? ` (${t.still_open} still have days left)` : ""}` : "";
    return `${label} · landed ${t.landed} · played ${t.played}${pc(t.played, t.landed)} · 2nd game ${t.second_game}${pc(t.second_game, t.played)}${back}`;
  };
  const tt = f.funnel?.tiktok;
  const text2 = [
    `# TikTok → computercooked.com, one line per Pacific day, newest first. Written ${new Date().toISOString()} by scripts/export-analytics.mjs.`,
    "# landed = visits that arrived from TikTok (tagged link, tiktok.com or the TikTok app's browser) · played = people whose first play from TikTok was that day",
    "# 2nd game = of them, played 2+ different games that day · back within 7 days = of them, played again on one of the next 7 days (from anywhere)",
    line(`last ${f.days} days`, tt),
    ...(f.funnel?.tiktok_landing_pages?.length ? ["# landed on: " + f.funnel.tiktok_landing_pages.slice(0, 5).map((x) => `${x.path} ${x.n}`).join(", ")] : []),
    ...f.rows.slice().reverse().map((r) => line(r.date + (r.partial ? " (today so far)" : ""), r.funnel?.tiktok)),
  ].join("\n") + "\n";
  const tmp = join(outDir, "tiktok-funnel.txt.tmp");
  writeFileSync(tmp, text2);
  renameSync(tmp, join(outDir, "tiktok-funnel.txt"));
  console.log("tiktok funnel: " + line("last 15 days", tt));
} else console.error("tiktok funnel: digest (15 days) failed, tiktok-funnel.txt not updated");
