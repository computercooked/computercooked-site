#!/usr/bin/env node
// Check a built portal folder before upload (docs/portals.md, "Checking a build"):
//   node scripts/package-portal.mjs <slug> <portal> [--no-links]   (makes dist/portals/<portal>/<slug>/)
//   node scripts/portal-check.mjs dist/portals/<portal>/<slug>
// Needs Playwright (PLAYWRIGHT=<folder with node_modules/playwright>, CHROME=<chrome.exe> if Playwright's own browser
// isn't installed).
//
// 1. Lists every line in the build's game code that holds "computercooked" (portal.js and cc-sdk.js left out: their
//    hits are comments, the link scrubber and the link-back card, which never runs on ad portals or --no-links
//    builds). Each one must be guarded so it never shows on that portal (smol brains: SB.UI.adPortal()).
// 2. Serves the folder on a throwaway local port and loads it headless at desktop 1280x720 and phone 390x844. It
//    blocks every request to another host (the portal's SDK fails to load, as it would off their domain) and lists
//    those hosts. Then it reports page errors, and any computercooked.com text or "copy world link" button on screen.
// Exit 1 when a load shows an error, the site address or that button, or asks a host other than the portal SDK's.
// It reads nothing from computercooked.com and sends nothing anywhere.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, extname, resolve, relative } from "node:path";
import { createRequire } from "node:module";

const DIR = resolve(process.argv[2] || "");
if (!process.argv[2] || !existsSync(join(DIR, "index.html"))) { console.error("usage: node scripts/portal-check.mjs <built portal folder with index.html>"); process.exit(2); }
const req = createRequire(process.env.PLAYWRIGHT ? join(resolve(process.env.PLAYWRIGHT), "x.js") : import.meta.url);
const { chromium } = req("playwright");
const SDK_HOSTS = ["sdk.crazygames.com", "game-cdn.poki.com", "html5.api.gamedistribution.com"];

// 1. strings
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const lines = [];
for (const f of walk(DIR).filter((f) => /\.(js|html|json|css)$/.test(f) && !/(^|[\\/])(portal|cc-sdk)\.js$/.test(f))) {
  readFileSync(f, "utf8").split(/\r?\n/).forEach((l, i) => { if (/computercooked/i.test(l)) lines.push(`${relative(DIR, f)}:${i + 1}: ${l.trim().slice(0, 160)}`); });
}
const cfg = (readFileSync(join(DIR, "index.html"), "utf8").match(/window\.CC_PORTAL = (\{[^}]*\})/) || [])[1] || "(none)";
console.log(`CC_PORTAL = ${cfg}`);
console.log(lines.length ? `game-code lines with the site address (each must be guarded on this portal):\n  ${lines.join("\n  ")}` : "game code: no site address");

// 2. headless loads
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav" };
const srv = createServer((q, r) => {
  let p = join(DIR, decodeURIComponent(new URL(q.url, "http://x").pathname));
  if (!p.startsWith(DIR)) { r.writeHead(403); return r.end(); }
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[extname(p)] || "application/octet-stream" });
  r.end(readFileSync(p));
});
await new Promise((ok) => srv.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${srv.address().port}`;
const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let failed = false;
try {
  for (const [name, opts] of [["desktop", { viewport: { width: 1280, height: 720 } }], ["phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
    const ctx = await b.newContext(opts);
    const outside = new Set();
    await ctx.route("**/*", (r) => { const u = r.request().url(); if (u.startsWith(origin + "/")) return r.continue(); outside.add(new URL(u).host); return r.abort(); });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message.slice(0, 140)));
    await page.goto(origin + "/", { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(6000);
    const text = await page.evaluate(() => document.body.innerText);
    const site = /computercooked\.com/i.test(text), btn = /copy world link/i.test(text);
    const extra = [...outside].filter((h) => !SDK_HOSTS.includes(h));
    const ok = !errors.length && !site && !btn && !extra.length;
    if (!ok) failed = true;
    console.log(`${name}: ${ok ? "ok" : "FAIL"} ${JSON.stringify({ errors, siteOnScreen: site, copyWorldButton: btn, outside: [...outside] })}`);
    await ctx.close();
  }
} finally { await b.close(); srv.close(); }
console.log(failed ? "SOMETHING FAILED" : "ALL PASS");
process.exit(failed ? 1 : 0);
