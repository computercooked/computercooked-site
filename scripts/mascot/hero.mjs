// Renders scripts/mascot/hero.html to the hero banner (assets/hero-banner.png, 1500x500) and the share image
// (assets/og.png, 1200x630). Needs a local server for the repo root (fetch of the svgs):
//   node scripts/mascot/hero.mjs http://localhost:8798   (CHROME= path to a Chromium, as in the other scripts)
import { chromium } from "playwright";
const base = (process.argv[2] || "http://localhost:8798").replace(/\/$/, "");
const b = await chromium.launch({ executablePath: process.env.CHROME });
for (const [w, h, out] of [[1500, 500, "assets/hero-banner.png"], [1200, 630, "assets/og.png"]]) {
  const pg = await b.newPage({ viewport: { width: w, height: h } });
  pg.setDefaultTimeout(300000);
  await pg.goto(`${base}/scripts/mascot/hero.html?w=${w}&h=${h}`, { timeout: 300000 });
  await pg.waitForSelector("body[data-ready]");
  await pg.screenshot({ path: out, animations: "disabled" });
  console.log("wrote", out);
}
await b.close();
