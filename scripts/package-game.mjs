#!/usr/bin/env node
// Turn one game into a Capacitor app project (Android + iOS), ready for `npm install` and `npx cap add`.
//   node scripts/package-game.mjs <slug> [--out dist/apps]
// Makes dist/apps/<slug>/:
//   www/                  the game's play/ folder, with cc-sdk.js and native/cc-native.js next to it (no /games/... paths)
//   capacitor.config.json appId com.computercooked.<slug>, the game's title, dark splash colour
//   package.json          Capacitor + the plugins docs/packaging.md uses
//   store/listing.md      a store listing draft from games.json (title, pitch, how to play, tags) + the asset checklist
//   store/thumb.*         the game's thumbnail, the start point for the icon and screenshots
// Nothing is uploaded or signed here: building, signing and store accounts are in docs/packaging.md and are Ashton's.
import { readFileSync, writeFileSync, mkdirSync, cpSync, existsSync, rmSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAP = "^8.0.0"; // Capacitor major in docs/packaging.md; bump both together

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
const outIdx = args.indexOf("--out");
const outRoot = join(ROOT, outIdx >= 0 ? args[outIdx + 1] : "dist/apps");
if (!slug || !/^[a-z0-9-]+$/.test(slug)) { console.error("usage: node scripts/package-game.mjs <slug> [--out dir]"); process.exit(1); }

const { games } = JSON.parse(readFileSync(join(ROOT, "games/games.json"), "utf8"));
const g = games.find((x) => x.slug === slug);
const play = join(ROOT, "games", slug, "play");
if (!g || !existsSync(join(play, "index.html"))) { console.error(`no game "${slug}" with a play/index.html`); process.exit(1); }

const out = join(outRoot, slug), www = join(out, "www");
rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
cpSync(play, www, { recursive: true });
cpSync(join(ROOT, "games/cc-sdk.js"), join(www, "cc-sdk.js"));
cpSync(join(ROOT, "native/cc-native.js"), join(www, "cc-native.js"));

// index.html: local script paths, the bridge first, no site favicon
let html = readFileSync(join(www, "index.html"), "utf8");
if (!html.includes('src="/games/cc-sdk.js"')) console.warn("warning: index.html doesn't load /games/cc-sdk.js; check it by hand");
html = html.replace(/<script src="\/games\/cc-sdk\.js"([^>]*)><\/script>/, '<script src="cc-native.js"></script>\n<script src="cc-sdk.js"$1></script>')
  .replace(/\s*<link rel="icon" href="\/favicon\.ico"[^>]*>/, "");
const left = html.match(/(src|href)="\/[^"]*"/g);
if (left) console.warn("warning: site paths still in index.html: " + left.join(", "));
writeFileSync(join(www, "index.html"), html);

const id = "com.computercooked." + slug.replace(/[^a-z0-9]/g, "");
writeFileSync(join(out, "capacitor.config.json"), JSON.stringify({
  appId: id, appName: g.title, webDir: "www",
  backgroundColor: "#101114",
  plugins: { SplashScreen: { launchShowDuration: 600, backgroundColor: "#101114", showSpinner: false } },
}, null, 2) + "\n");

if (!existsSync(join(out, "package.json"))) {
  writeFileSync(join(out, "package.json"), JSON.stringify({
    name: "cc-" + slug, private: true, version: "1.0.0",
    scripts: { sync: "cap sync", android: "cap open android", ios: "cap open ios" },
    dependencies: {
      "@capacitor/core": CAP, "@capacitor/android": CAP, "@capacitor/ios": CAP,
      "@capacitor/app": CAP, "@capacitor/haptics": CAP, "@capacitor/browser": CAP,
      "@capacitor/splash-screen": CAP, "@capacitor/status-bar": CAP,
    },
    devDependencies: { "@capacitor/cli": CAP },
  }, null, 2) + "\n");
}

mkdirSync(join(out, "store"), { recursive: true });
const thumb = g.thumbnail && join(ROOT, g.thumbnail.replace(/^\//, ""));
if (thumb && existsSync(thumb)) cpSync(thumb, join(out, "store", "thumb" + extname(thumb)));
const listing = `# ${g.title}: store listing draft

app id: \`${id}\`

## short description (Play: 80 chars max)
${g.pitch.length <= 80 ? g.pitch : g.pitch.slice(0, 77) + "..."}

## full description
${g.pitch}

how to play:
${(g.how_to || []).map((s) => "- " + s).join("\n") || "- " + (g.controls || "")}

free. made by computer cooked. more games at computercooked.com

## tags / category
${(g.tags || []).join(", ")}

## assets checklist (see docs/packaging.md for exact sizes)
- [ ] icon 1024x1024 (iOS) and 512x512 (Play), no transparency on iOS
- [ ] Play feature graphic 1024x500
- [ ] phone screenshots (portrait or landscape to match the game), 3 to 8
- [ ] privacy policy URL: https://computercooked.com/privacy/
- [ ] content rating questionnaire (IARC on Play, age rating on iOS)
- [ ] Play data safety form / Apple privacy labels
`;
writeFileSync(join(out, "store", "listing.md"), listing);
console.log(`packaged ${slug} → ${out}\nnext: cd ${out} && npm install && npx cap add android && npx cap add ios && npx cap sync`);
