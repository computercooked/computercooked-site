#!/usr/bin/env node
// Build one game for one web portal (docs/portals.md): a folder and a zip with index.html at the root.
//   node scripts/package-portal.mjs <slug> <itch|newgrounds|crazygames|gamedistribution|poki> [--gd-id <gameId>]
// Makes dist/portals/<portal>/<slug>/ and dist/portals/<portal>/<slug>.zip:
//   the game's play/ folder + cc-sdk.js + native/portal.js (the adapter), relative paths only, plus the portal's
//   own SDK script for CrazyGames and Poki (GameDistribution's is loaded by portal.js, after its options).
// itch.io and Newgrounds need no SDK: the adapter runs as "none" and links stay allowed there.
// Nothing is uploaded: accounts and submissions are Ashton's (docs/portals.md, "waiting on Ashton").
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
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
const cfg = JSON.stringify({ name: DRIVER[portal], gdGameId: gdId || undefined });
const sdkTag = html.match(/<script src="\/games\/cc-sdk\.js"([^>]*)><\/script>/);
if (!sdkTag) { console.error("index.html doesn't load /games/cc-sdk.js; check it by hand"); process.exit(1); }
// the adapter loads the same way the SDK did (defer or not), straight after it, so the game sees both in order
const tags = `<script>window.CC_PORTAL = ${cfg};</script>\n` +
  (SDK[portal] ? `<script src="${SDK[portal]}"></script>\n` : "") +
  `<script src="cc-sdk.js"${sdkTag[1]}></script>\n<script src="portal.js"${sdkTag[1]}></script>`;
html = html.replace(sdkTag[0], tags).replace(/\s*<link rel="icon" href="\/favicon\.ico"[^>]*>/, "");
const left = html.match(/(src|href)="\/[^"]*"/g);
if (left) console.warn("warning: site paths still in index.html: " + left.join(", "));
writeFileSync(join(out, "index.html"), html);

// zip with index.html at the root (bsdtar on Windows/macOS, zip on Linux)
const zip = out + ".zip";
rmSync(zip, { force: true });
// Windows' own tar.exe (bsdtar) writes zips; Git Bash's GNU tar on the PATH can't, so name it outright
const tar = process.platform === "win32" ? join(process.env.SystemRoot || "C:/Windows", "System32", "tar.exe") : "tar";
try { execFileSync(tar, ["-a", "-cf", zip, "."], { cwd: out }); }
catch (e) { rmSync(zip, { force: true }); execFileSync("zip", ["-qr", zip, "."], { cwd: out }); }
if (portal === "gamedistribution" && !gdId) console.warn("note: GameDistribution needs --gd-id <gameId> from their control panel before it can serve ads");
console.log(`built ${slug} for ${portal} → ${zip}`);
