// Page check for CI (audit P1 #27): the landing, hub, daily 3 and every game page at 390 and 1280 wide.
//   node scripts/page-check.mjs [base]        (default http://127.0.0.1:8787; needs the playwright package)
// Fails on any console error or uncaught page error, and on horizontal scrolling at 390. Saves a screenshot of
// each page and width to dist/page-check/ (CI keeps them as an artifact). Test mode (?cctest=1) so nothing counts.
import { mkdirSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const base = process.argv[2] || "http://127.0.0.1:8787";
const req = createRequire(process.env.PLAYWRIGHT ? join(resolve(process.env.PLAYWRIGHT), "x.js") : import.meta.url);
const { chromium } = req("playwright");
const out = join(ROOT, "dist/page-check");
mkdirSync(out, { recursive: true });

const games = JSON.parse(readFileSync(join(ROOT, "games/games.json"), "utf8")).games.filter((g) => g.made_by === "computer-cooked");
const pages = ["/", "/games/", "/games/daily/", "/about/", ...games.map((g) => `/games/${g.slug}/`)];
// errors that come from things a local run can't have (no Stripe, no outside network) and aren't the page's fault
const IGNORE = [/favicon/i, /net::ERR_/i, /Failed to load resource/i];

const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
let fails = 0;
for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 800 }, isMobile: width < 600, hasTouch: width < 600 });
  for (const p of pages) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error" && !IGNORE.some((r) => r.test(m.text()))) errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    try {
      await page.goto(base + p + (p.includes("?") ? "&" : "?") + "cctest=1", { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(1500);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      if (width === 390 && sw > 392) errors.push(`horizontal scroll: page is ${sw}px wide`);
      await page.screenshot({ path: join(out, `${width}-${p.replace(/\//g, "_") || "root"}.png`) });
    } catch (e) {
      errors.push("load: " + e.message.split("\n")[0]);
    }
    console.log(`${errors.length ? "FAIL" : "PASS"} ${width} ${p}${errors.length ? "  " + errors.slice(0, 3).join(" | ") : ""}`);
    if (errors.length) fails++;
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} FAILED` : "all passed");
process.exit(fails ? 1 : 0);
