#!/usr/bin/env node
// Build one game for one web portal (docs/portals.md): a folder and a zip with index.html at the root.
//   node scripts/package-portal.mjs <slug> <itch|newgrounds|crazygames|gamedistribution|poki> [--gd-id <gameId>] [--no-links]
// --no-links (Nov 17, for itch.io / Newgrounds if Ashton says "no outside links" there too): no "play on
// computercooked.com" card, and shares and copies lose their links, as on the ad portals. Ad portals are always like that.
// Makes dist/portals/<portal>/<slug>/ and dist/portals/<portal>/<slug>.zip:
//   the game's play/ folder + cc-sdk.js + native/portal.js (the adapter), relative paths only, plus the portal's
//   own SDK script for CrazyGames and Poki (GameDistribution's is loaded by portal.js, after its options).
// itch.io and Newgrounds need no SDK: the adapter runs as "none" and links stay allowed there. On those two only, after
// a run, a small card offers "xp, levels and boards: play on computercooked.com" (K-0030 step 7); ad portals get none.
// Round 24: no portal build carries the tip jar (/assets/tip.js, a payment link; every game already checks window.ccTip
// before using it, so it simply isn't there). Any other /assets/ file index.html loads is copied into cc-assets/ and
// pointed at relatively. Ad-portal shares lose their link in native/portal.js. Afterwards every text file in the build
// is scanned for paths that only exist on computercooked.com ("/api/…", "/games/…", "/assets/…") and they're listed.
// Accounts, saves and boards: cc-sdk sees window.CC_PORTAL and never calls our API (guest-only, saves on the device).
// Nothing is uploaded: accounts and submissions are Ashton's (docs/portals.md, "waiting on Ashton").
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync, readdirSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SDK = {
  crazygames: "https://sdk.crazygames.com/crazygames-sdk-v3.js",
  poki: "https://game-cdn.poki.com/scripts/v2/poki-sdk.js",
};
const DRIVER = { itch: "none", newgrounds: "none", crazygames: "crazygames", gamedistribution: "gamedistribution", poki: "poki" };

const [slug, portal] = process.argv.slice(2).filter((a, i, all) => !a.startsWith("--") && all[i - 1] !== "--gd-id");
const gdIdx = process.argv.indexOf("--gd-id");
const gdId = gdIdx > 0 ? process.argv[gdIdx + 1] : "";
if (!slug || !DRIVER[portal]) { console.error("usage: node scripts/package-portal.mjs <slug> <" + Object.keys(DRIVER).join("|") + "> [--gd-id id]"); process.exit(1); }
const play = join(ROOT, "games", slug, "play");
if (!existsSync(join(play, "index.html"))) { console.error(`no games/${slug}/play/index.html`); process.exit(1); }

const out = join(ROOT, "dist/portals", portal, slug);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(play, out, { recursive: true });
rmSync(join(out, "entry.json"), { force: true }); // our catalog file, not part of the game
cpSync(join(ROOT, "games/cc-sdk.js"), join(out, "cc-sdk.js"));
cpSync(join(ROOT, "native/portal.js"), join(out, "portal.js"));

let html = readFileSync(join(out, "index.html"), "utf8");
const noLinks = process.argv.includes("--no-links");
const cfg = JSON.stringify({ name: DRIVER[portal], portal, slug, gdGameId: gdId || undefined, links: noLinks ? false : undefined });
const sdkTag = html.match(/<script src="\/games\/cc-sdk\.js"([^>]*)><\/script>/);
if (!sdkTag) { console.error("index.html doesn't load /games/cc-sdk.js; check it by hand"); process.exit(1); }
// the adapter loads the same way the SDK did (defer or not), straight after it, so the game sees both in order
const tags = `<script>window.CC_PORTAL = ${cfg};</script>\n` +
  (SDK[portal] ? `<script src="${SDK[portal]}"></script>\n` : "") +
  `<script src="cc-sdk.js"${sdkTag[1]}></script>\n<script src="portal.js"${sdkTag[1]}></script>`;
html = html.replace(sdkTag[0], tags).replace(/\s*<link rel="icon" href="\/favicon\.ico"[^>]*>/, "");
// the tip jar never goes to a portal (a payment link, and /assets/ isn't there)
html = html.replace(/\s*<script[^>]*\bsrc="\/assets\/tip\.js"[^>]*><\/script>/g, "");
// any other site asset index.html loads comes along, relatively
html = html.replace(/(src|href)="\/assets\/([A-Za-z0-9_.\/-]+)"/g, (m, attr, file) => {
  const from = join(ROOT, "assets", file);
  if (!existsSync(from) || file.includes("..")) return m;
  mkdirSync(dirname(join(out, "cc-assets", file)), { recursive: true });
  cpSync(from, join(out, "cc-assets", file));
  return `${attr}="cc-assets/${file}"`;
});
const left = html.match(/(src|href)="\/[^"]*"/g);
if (left) console.warn("warning: site paths still in index.html: " + left.join(", "));
writeFileSync(join(out, "index.html"), html);

// paths that only exist on computercooked.com, anywhere in the build (cc-sdk.js only reaches /api when there's no
// CC_PORTAL, so it's left out). Listed, not fixed: they're in game code, which cc-games owns.
const SITE_PATH = /["'`](\/(?:api|games|assets|u|d|g)\/[^"'`\s]*)["'`]/g;
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const leftovers = [];
for (const f of walk(out)) {
  if (!/\.(html|js|css|json)$/.test(f) || /[\\/](cc-sdk|portal)\.js$/.test(f)) continue;
  for (const m of readFileSync(f, "utf8").matchAll(SITE_PATH)) leftovers.push(relative(out, f).replace(/\\/g, "/") + ": " + m[1]);
}
if (leftovers.length) console.warn("warning: site-only paths in the build (they'll 404 on a portal):\n  " + [...new Set(leftovers)].join("\n  "));

// zip with index.html at the root (bsdtar on Windows/macOS, zip on Linux)
const zip = out + ".zip";
rmSync(zip, { force: true });
// Windows' own tar.exe (bsdtar) writes zips; Git Bash's GNU tar on the PATH can't, so name it outright. Elsewhere use
// zip: GNU tar's -a doesn't know .zip and would quietly write a plain tar with a .zip name.
// Name the top-level entries rather than "." so bsdtar doesn't prefix every path with "./" (a zip whose index.html is
// "./index.html" may not count as "index.html at the root" on itch.io or CrazyGames).
if (process.platform === "win32") execFileSync(join(process.env.SystemRoot || "C:/Windows", "System32", "tar.exe"), ["-a", "-cf", zip, ...readdirSync(out)], { cwd: out });
else execFileSync("zip", ["-qr", zip, "."], { cwd: out });
if (portal === "gamedistribution" && !gdId) console.warn("note: GameDistribution needs --gd-id <gameId> from their control panel before it can serve ads");
console.log(`built ${slug} for ${portal} → ${zip}`);
