// Renders assets/og.png (1200x630) and assets/apple-touch-icon.png (180x180).
// Usage: node scripts/render-images.mjs   (needs the playwright package: npm i --no-save playwright)
// Needs Playwright with Chromium available. Not part of any build; only run when the art changes.
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const browser = await chromium.launch();

const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.goto(pathToFileURL(path.join(root, "scripts/og.html")).href);
await og.evaluate(() => document.fonts.ready);
await og.screenshot({ path: path.join(root, "assets/og.png") });

const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.setContent(
  `<style>html,body{margin:0;background:#101114}img{display:block;width:180px;height:180px}</style>
   <img src="${pathToFileURL(path.join(root, "assets/logo.svg")).href}">`
);
await icon.waitForLoadState("load");
await icon.screenshot({ path: path.join(root, "assets/apple-touch-icon.png") });

await browser.close();
console.log("wrote assets/og.png and assets/apple-touch-icon.png");
