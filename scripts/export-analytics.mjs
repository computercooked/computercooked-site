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
const token = readFileSync(tokenFile, "utf8").trim();
const res = await fetch(base.replace(/\/$/, "") + "/api/admin/digest?days=" + encodeURIComponent(days), { headers: { authorization: "Bearer " + token } });
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
