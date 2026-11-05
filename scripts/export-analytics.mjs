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
