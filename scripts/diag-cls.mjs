// temporary diagnostic (never merged): which element shifts on the home page at phone size on the CI box
import { createRequire } from "node:module";
const require = createRequire(process.env.PLAYWRIGHT + "/");
const { chromium } = require("playwright");
const base = process.argv[2];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true,
  userAgent: "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36" });
const page = await ctx.newPage();
await page.route("**/assets/home.js*", async (route) => {
  const r = await route.fetch(); let t = await r.text();
  t = t.replace("var STEP = 4500, MAX = innerWidth < 900 ? 4 : 6", "var STEP = 900, MAX = 99");
  console.log("patched reel:", t.includes("STEP = 900"));
  await route.fulfill({ response: r, body: t });
});
await page.addInitScript(() => {
  window.__shifts = [];
  const d = (n) => !n ? "?" : (n.nodeName + (n.id ? "#" + n.id : "") + (n.className && n.className.baseVal === undefined ? "." + String(n.className).trim().replace(/\s+/g, ".") : ""));
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__shifts.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), input: e.hadRecentInput,
    reel: (document.getElementById("reel-title") || {}).textContent, sy: scrollY, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
    src: (e.sources || []).map((s) => d(s.node) + " " + [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round).join(",") + " -> " + [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round).join(",")) }); }).observe({ type: "layout-shift", buffered: true });
});
await page.goto(base + "/", { waitUntil: "load" });
const dims = () => page.evaluate(() => { const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height].map(Math.round).join(","); };
  return { title: document.getElementById("reel-title").textContent, reel: r("#desk-reel"), cap: r(".reel-cap"), ttl: r("#reel-title"), pitch: r("#reel-pitch"), hello: r(".desk-hello"), pc: r("#desk-pc"), dock: r("#desk-dock"), sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
    fonts: [...document.fonts].map((f) => f.family + ":" + f.status).join(" ") }; });
for (let i = 0; i < 32; i++) { await page.waitForTimeout(900); console.log(JSON.stringify(await dims())); }
console.log("SHIFTS", JSON.stringify(await page.evaluate(() => window.__shifts), null, 1));
await page.screenshot({ path: process.env.OUT + "/diag-end.png" });
await b.close();
