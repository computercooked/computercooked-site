# smol brains: is it time for a real engine?

Tech-lead recommendation, 21 Oct 2026. Based on reading `DESIGN.md`, `play/js/*` (21,168 lines across 38 files, about 1.4 MB unminified), the site's `_headers`, `wrangler.jsonc` and `src/saves.js`, plus web research (sources at the end).

## TL;DR

**Not yet, and the browser is not the main problem.** Three things limit the new vision:

1. **Architecture.** The whole sim runs on the main thread. Terrain is a heightmap. Everything is a global script.
2. **Scope.** The new vision is roughly 5-10x the current game.
3. **A few real browser walls.** The iOS memory ceiling, no shared-memory threads inside your embeddable iframe, the 512 KB cloud-save cap, and Esc/Ctrl+W behaviour in first-person play.

None of these needs an engine today. All of them need the same refactor whichever engine you pick.

**Plan.** Stay in the browser and do the engine-agnostic refactor now. Build a first-person "dig and build" vertical slice in the browser. Ship to Steam in an **Electron wrapper** while keeping the free web version. Move to **Godot 4** only when a named trigger fires (section 4). That mirrors Vampire Survivors: it shipped on Steam as a Phaser/web-tech game and moved to Unity (v1.6, Aug 2023) once it had proved itself and needed consoles and performance [1].

---

## 0. What the code actually is today (facts that change the answer)

Some of the brief doesn't match the code.

- **No Web Worker is used anywhere.** There is no `new Worker(` in the codebase. World generation (`worldgen.js`), every creature's brain (`brain.js`), pathfinding, social life and rendering all share the main thread through one `requestAnimationFrame` fixed-step loop (`main.js`).
- **The population is capped at 36 smols** (`Game.POP_CAP = 36`, `main.js:9`), plus grumps and ambient critters. "Hundreds of agents" is the target, not the present. Each brain is small (61+ inputs, 6-90 hidden units, 18 outputs, `Float32Array`s, no allocation in hot paths). That is cheap: 300 such nets at 10 Hz is well under 1 ms of maths. The real per-agent cost is the rest of the creature: `creature.js` (105 KB), `mind.js` (88 KB), `social.js`, planning and A*.
- **Terrain is a 2.5D heightmap** (`tileH`, `Float32Array(N*N)`, 32×32 render chunks with LOD in `render.js`). It cannot represent caves, tunnels, overhangs or mine shafts. **This is the biggest technical wall for the survival game, and it is a data-model problem, not a browser problem.** Every engine would need a new voxel/volume layer too.
- **The renderer is custom and hand-written** (`gl.js`: WebGL2 or WebGL1 + instancing, GLSL ES 1.00). It has a pixel-art low-res pass with ID outlines, instanced bodies, 8 point lights, fog of war, dynamic resolution, and a first-person camera already (`cam.pov`, `possess.js`). It is good and cheap: about 63k triangles on phone in 3D, 8.5 ms of JS per frame at 4× CPU throttle, and a 0.7 s boot.
- **Saves.** localStorage is the live slot (40-100 KB). IndexedDB holds a copy per island. Cloud saves go through `cc.save`, capped at **512 KB per slot and 5 slots** (`src/saves.js` `MAX_BYTES`), rate-limited.
- **Site rules.** No CDN ("nothing from a CDN", `gl.js` header). No build step. The play page is served with `frame-ancestors *` so the embed player can sit on any site (`_headers`, `src/embed.js`). The iframe has `allow="fullscreen; autoplay"`.
- **Strengths worth protecting.** 25+ node test suites (deterministic sim, save migration v1→v2, soak sims), deterministic seeds/world codes, and instant load.

## 1. The real limits of a browser game for this vision

| Area | 2026 reality | Where smol brains hits it |
|---|---|---|
| **GPU API** | WebGL2 is universal. WebGPU now ships by default in Chrome/Edge, Firefox, and Safari 26 on macOS/iOS/iPadOS (Sept 2025) [2][3]. Engine support is still uneven, and WebGL2 is the safe fallback [4]. | No GPU wall yet. WebGPU would only matter for GPU compute (voxel meshing, thousands of agents, GPU particles). Not needed for the next year. |
| **iOS memory** | iOS Safari kills a tab silently at a browser-imposed cap. Developers report about 300-500 MB as the danger zone. No OOM error and no `webglcontextlost` fires first, so users can get reload loops [5][6]. | Today's game is small. A 1024² island with voxel caves, a city and hundreds of agents could cross it. A Godot/Unity wasm build starts with a 30-100 MB heap plus engine code, so **an engine makes this worse on iPhone, not better**. |
| **Threads / SharedArrayBuffer** | SAB needs cross-origin isolation (`COOP: same-origin` + `COEP: require-corp`). `credentialless` is Chrome/Firefox only, not Safari [7][8]. An isolated iframe also needs an isolated parent. | Your play page is meant to be framed by **any** site. Third-party embeds can't be made isolated, so **plan for Workers with `postMessage` + transferable ArrayBuffers, not SAB**. That is plenty: run the sim in one worker and send render snapshots (positions, poses, dirty chunks) each tick. This is also why Godot made single-threaded web export the default from 4.3 [9]. |
| **CPU for many agents** | V8/JSC JIT is fast for typed-array numeric code. GDScript, especially as wasm on the web, is much slower for the same loops. | The 36→300 agent jump needs: the sim off the main thread, structure-of-arrays for hot state, LOD thinking (far agents already think at half rate; push to 1/8), and a coarser-cell A*/flow-field. This is work in any engine. |
| **Modifiable terrain** | Browser voxel games work (Minecraft Classic in browser, many three.js voxel projects). Chunk meshing in a worker with transferables is a standard pattern. | Needs a new terrain layer: heightmap kept for the surface, plus sparse voxel chunks (for example 16³) where digging happened, saved as compressed deltas. About 6-10 person-weeks (pw) in JS. The same cost exists in Godot/Unity unless you buy a voxel plugin. |
| **Storage** | localStorage is about 5 MB. IndexedDB/OPFS quota in Safari 17+ is up to 60% of disk for the browser app [10]. **But Safari wipes script-writable storage for a site not interacted with for 7 days** [10][11], and `persist()` is auto-decided and unreliable on Safari [10]. Third-party iframes get **partitioned** storage, so an embed on someone else's site has its own save. | A city plus dug terrain will blow past localStorage and the **512 KB cloud cap** quickly. Move the live save to IndexedDB with `CompressionStream` deltas. Raise or chunk the cloud slot (R2 for blobs, D1 for the index). Tell players "log in to keep your island" for iOS. |
| **Input** | Pointer Lock works on desktop and has no role on phones (touch). **Esc always releases pointer lock first** (browser-reserved). **Ctrl+W / Ctrl+T / Ctrl+N close or open tabs.** The Keyboard Lock API that fixes this is Chromium-only and needs fullscreen. | `possess.js` already uses pointer lock and Esc to leave. Rust/Minecraft habits (Ctrl to crouch while pressing W) will close the tab in a browser. Bind crouch to C/Shift and use fullscreen + `navigator.keyboard.lock()` where available. **A desktop wrapper removes this whole class of problem.** Gamepad API works in all browsers. |
| **Audio** | Web Audio is fine. It needs a gesture to unlock (already handled by "tap to begin"). On iOS the hardware mute switch silences Web Audio unless `navigator.audioSession.type = "playback"` (Safari 16.4+). | The procedural music engine (`music.js`) is a strength. Add the audioSession line. Positional 3D audio (gunfire, cars) is available through PannerNode. |
| **Download / boot** | The browser is your advantage: 1.5 MB and 0.7 s to play. Engine web builds are typically 10-40 MB+ (wasm + pck/data). | Keep this as the top-of-funnel. |

**Verdict on section 1:** the browser can carry god-sim + a voxel survival mode + a few hundred agents on desktop and recent phones, provided the sim moves to a worker and memory is budgeted. The browser genuinely cannot do these:

- (a) consoles;
- (b) store-quality iOS presence without a wrapper fight;
- (c) heavy physics with vehicles plus large realistic cities at high fidelity on phones;
- (d) Steam features (overlay, achievements, cloud) without a wrapper.

## 2. Options

Estimates are person-weeks (pw) for one strong developer working with AI coding agents, covering a feature-parity port of the current 21k-line game (not the new vision). The UI alone is big: `ui.js` is 166 KB of custom pixel UI.

### A. Stay vanilla JS (plus refactor)
- **Buys:** zero port cost, the game stays playable every day, instant web load, your tests and saves keep working, and AI agents are very good at plain JS.
- **Cost:** about 4-6 pw for the engine-agnostic refactor.
  - ES modules (native `<script type="module">`, still no build step).
  - Sim in a Worker with snapshot messages.
  - Structure-of-arrays for hot creature state.
  - IndexedDB live save with compressed deltas.
  - A memory budget HUD.
- **Reach:** web, desktop (wrapper), Android (TWA/Capacitor), iOS (wrapper with review risk). **No consoles.**
- **Risk:** you own every rendering feature (shadows, skinned models, physics). Vehicles and guns need a physics library such as Rapier (wasm, vendored).

### B. Adopt a JS engine or library incrementally
- **three.js** (MIT). `WebGPURenderer` falls back to WebGL2, and TSL shaders compile to both [12][13]. Buys glTF models, skinned animation, shadows and a huge ecosystem. Cost: about 3-5 pw to use it only for the first-person mode; about 8-12 pw to replace `render.js`, `meshes.js` and `pixel.js` while keeping the pixel look (ID-outline post pass, sprite atlas). It is a library, not an engine: no editor and no physics. Vendor the files (no CDN rule).
- **Babylon.js** (Apache-2). A fuller engine: Havok physics wasm, GUI, inspector, strong WebGPU. Heavier (several MB). Port cost about 10-14 pw. A better fit than three.js if you want vehicles and physics in-browser.
- **PlayCanvas** (MIT engine, hosted editor). Good mobile performance. Its editor workflow is cloud-centric and sits awkwardly with the git/AI/no-build workflow. About 10-14 pw.
- **Verdict:** only worth it for the first-person survival renderer (models, animation, shadows). It does not solve threading, storage, consoles or app stores. If you take one, take three.js for FPS mode and keep the custom pixel renderer for god view, or Babylon if physics vehicles land in the browser.

### C. Godot 4 (current stable 4.6.x; 4.7 out June 2026) [14]
- **Buys:**
  - Free and MIT, no royalties.
  - A real editor; text scenes (`.tscn`) that AI agents can read and edit.
  - Native desktop and mobile; Jolt physics as the default for new 3D projects in 4.6 [14].
  - Consoles through W4 Games' official middleware (Switch, Xbox Series, PS5; Switch 2 in beta, Oct 2025) [15].
  - Strong voxel plugins (Zylann's godot_voxel, as a module/GDExtension).
- **Web:** web export exists. Single-threaded is the default since 4.3 and runs on iOS/macOS [9]. Limits:
  - Compatibility renderer (WebGL2) only.
  - **C# can't export to web** [9].
  - Safari has more WebGL2 issues than Chromium [9].
  - Builds are tens of MB.
  - It would be a *worse* phone-browser game than the current one.
- **Cost:**
  - Logic port 12-16 pw.
  - Renderer and pixel look (shaders, sprite atlas, outlines) 6-8 pw.
  - UI 6-8 pw.
  - Saves/migration/cloud 2 pw.
  - Tests 3-4 pw.
  - **Total about 30-40 pw.** Add 4-6 pw for performance work: hot sim loops (brains, A*, social) in C++/Rust GDExtension, because GDScript is too slow for 300 agents. GDExtension on web is fiddly.
- **Store path:** Steam (GodotSteam), iOS/Android native (no 4.2 wrapper risk), consoles via W4.
- **Risks:** a 7-10 month freeze on new features if done all at once. Web quality drops. You're on the engine's release train.

### D. Unity 6
- **Buys:**
  - The strongest console and mobile pipeline.
  - C# with Burst/Jobs/Entities, the best tool on this list for thousands of agents.
  - The biggest asset store (vehicles, guns, building systems).
  - Unity 6 officially supports Android/iOS browsers [16].
- **Pricing:** the runtime fee was cancelled. Personal is free up to $200k revenue/funding. Pro is $2,310/seat/yr from 2026 [17].
- **Cost:** about 35-45 pw (same pieces as Godot, plus a C# rewrite). DOTS for agents adds 4-8 pw but buys the most headroom.
- **Risks:**
  - Web builds are heavy and memory-hungry on iOS (Unity forums are where the 300-500 MB crash reports come from [5][6]).
  - Binary scenes and prefabs are less AI-friendly.
  - Vendor and licence trust history.
  - Overkill until consoles are a real business goal.

### E. Unreal 5
- No web export at all (HTML5 was removed in UE 4.24). Phone performance is poor for this art style. C++/Blueprint port about 50+ pw. 5% royalty after $1M.
- **Not recommended.** It kills the web game and fights the pixel aesthetic.

### F. Bevy (Rust ECS)
- **Buys:** ECS is a natural fit for hundreds of agents. Rust compiles to fast wasm and native. Both WebGL2 and WebGPU backends exist [18].
- **Cost:** about 40-50 pw. There is no editor. UI is immature (your UI is the largest file). Breaking changes every release (pre-1.0). No official console path. The web build is single-threaded.
- **Not recommended** for a content-heavy, lore-heavy game with a small team.

### Summary table

| Option | Port pw | Web/phone | Desktop/Steam | Mobile stores | Consoles | Main risk |
|---|---|---|---|---|---|---|
| A. Vanilla + refactor | 4-6 | best (1.5 MB) | wrapper | wrapper (iOS 4.2 risk) | no | you build every feature |
| B. +three.js (FPS) | 3-5 / 8-12 full | very good | wrapper | wrapper | no | two render paths |
| B. Babylon | 10-14 | good | wrapper | wrapper | no | weight, port |
| C. Godot 4 | 30-40 (+4-6 perf) | OK, heavier | native | native | W4 middleware | freeze, GDScript speed |
| D. Unity 6 | 35-45 (+4-8 DOTS) | heavy | native | native | best | iOS web memory, cost, lock-in |
| E. Unreal 5 | 50+ | none | native | weak | yes | wrong tool |
| F. Bevy | 40-50 | OK | native | weak | no | immaturity, UI |

## 3. Distribution from the current codebase

- **itch.io:** upload the `play/` folder as an HTML5 zip, or a downloadable Electron build. About 0.5 pw. Good for a paid "supporter" build or demo.
- **Steam via Electron (recommended wrapper):**
  - Bundled Chromium means the same WebGL everywhere, including Steam Deck/Linux.
  - steamworks.js for achievements (map `cc.event`), Steam Cloud (replaces the 512 KB cap) and the overlay. The overlay is the known flaky part in Electron [19][20].
  - Fullscreen with no Esc or Ctrl+W problems.
  - Unlimited disk saves.
  - Steam Direct fee $100, 30% cut.
  - About 1.5-3 pw including Deck testing, a store page and a build pipeline.
- **Tauri:** about 10x smaller binaries [21]. But it uses the OS webview (WebView2 / WKWebView / **WebKitGTK on Linux and Steam Deck**), so WebGL performance and bugs vary by OS [21]. **Prefer Electron for a WebGL game.**
- **Android (Play Store):** a Trusted Web Activity (Bubblewrap) or Capacitor. Low risk. About 1-2 pw.
- **iOS App Store:**
  - Capacitor/WKWebView keeps the same memory ceiling as Safari.
  - Thin wrappers get rejected under guideline 4.2 (minimum functionality) [22].
  - To pass: bundle files offline and add Game Center, IAP and haptics. About 2-4 pw, with review risk.
  - This is the strongest single argument for a native engine *later*.
- **Hybrid: yes, do it.** The free web version on computercooked.com (god-sim plus a taste of possession) is the funnel and the place to test ideas. The paid Steam build is the same code plus the survival depth, Steam Cloud, bigger worlds and no browser input limits. One codebase, two shells: feature flags by `window.__STEAM__`.

## 4. Recommendation, trigger point, phased path

**Rule:** stay in the browser until the first-person dig-and-build slice either holds the budget below on target phones or proves it can't. Move to Godot 4 when any one of these triggers fires:

- **T1 (performance).** After the worker refactor and one optimisation pass, the slice can't hold **30 fps with 200 agents and 1 km² of dug, voxelised terrain within 400 MB on an iPhone 13 / Pixel 7-class phone**, and dropping phone support for survival mode is not acceptable.
- **T2 (platform).** Consoles become a funded goal, or Apple rejects the wrapped iOS build twice.
- **T3 (business).** The Steam build sells well enough (as a rough marker, around $50k or 20k units) to fund a 6-9 month port without freezing the live game, the Vampire Survivors sequence [1].
- **T4 (scope).** Physics vehicles, guns and realistic-size cities are actually scheduled, not just envisioned, and a JS physics library (Rapier/Havok wasm) can't meet them.

**Why Godot over Unity at that point:**
- Free and MIT.
- Text scenes suit AI-assisted work.
- Native mobile avoids App Store problems.
- A console path through W4.
- A good voxel ecosystem.

Choose Unity instead only if T2 (consoles) is the trigger *and* agent count needs DOTS-scale numbers (thousands).

### Phased path (never unplayable)

1. **Phase 0, now (4-6 pw): engine-agnostic refactor in place.** Every step ships behind the same URL and the same tests.
   - ES modules.
   - Sim in a Web Worker (transferables, no SAB), with render snapshots.
   - Hot creature state in structure-of-arrays.
   - IndexedDB live save with compressed deltas; cloud save via R2 or chunking above 512 KB.
   - A memory and frame budget HUD (`performance.measureUserAgentSpecificMemory` where available).
   - `audioSession`.
   - Raise `POP_CAP` gradually (36 → 100 → 200) with the soak tests.

   This work carries straight into any engine: the sim's data model and tests are the real asset.
2. **Phase 1 (8-12 pw): survival vertical slice in the browser.**
   - Sparse voxel chunks layered on the heightmap (dig, mine shaft, cave).
   - Chunk meshing in the worker.
   - Free-form piece building on a grid.
   - Optionally three.js for the first-person renderer only.

   Measure against T1 on real phones.
3. **Phase 2 (2-4 pw): ship.** Electron Steam build (Early Access or a "smol brains: god-sim" 1.0) plus an itch build. The web version stays free. Android TWA. Hold iOS for now.
4. **Phase 3 (ongoing): tech arc and lore in JS** (roads, carts, then cars), until a trigger fires. Keep game rules in plain data (ideas, recipes, lore, cards) as JSON-like tables. They port unchanged.
5. **Phase 4 (on trigger, about 30-40 pw plus perf): Godot port, run in parallel.**
   - Port sim modules one by one against the same JS test fixtures (golden-file sim outputs from fixed seeds), with hot loops in GDExtension.
   - The JS web version stays live as the demo and funnel the whole time.
   - The Godot build replaces the Steam/native builds only at parity, with a save importer for JS saves (they're JSON deltas from a seed, so this is feasible if worldgen is ported bit-exact or the generated arrays are shipped in the save).

**Bottom line for the owner:** you don't need an engine yet. You need to (1) get the sim off the main thread, (2) give the world real depth (voxels), and (3) put the game on Steam in a wrapper. Do those this quarter. Re-ask "engine?" when one of T1-T4 fires. If one does, the answer is Godot 4, ported alongside the live web game, not instead of it.

---

## Sources

1. Vampire Survivors engine history (Phaser → Unity v1.6) and ports: https://en.wikipedia.org/wiki/Vampire_Survivors ; https://www.gamingonlinux.com/2023/08/vampire-survivors-co-op-and-new-game-engine-upgrade-is-live
2. WebGPU in all major browsers incl. iOS 26: https://web.dev/blog/webgpu-supported-major-browsers
3. WebGPU in iOS 26: https://appdevelopermagazine.com/webgpu-in-ios-26/
4. WebGPU vs WebGL for games (2026): https://app.cinevva.com/guides/webgpu-vs-webgl-games
5. WebKit bug 300782 (silent tab kill at memory cap, reload loops): https://bugs.webkit.org/show_bug.cgi?id=300782
6. Unity forum, iOS WebGL memory crashes at 300-500 MB: https://discussions.unity.com/t/webgl-memory-increment-issue-and-crash-on-ios/894771 ; https://discussions.unity.com/t/webgl-deliver-for-all-platforms-including-iphones-930374/930374
7. COEP (MDN): https://developer.mozilla.org/docs/Web/HTTP/Reference/Headers/Cross-Origin-Embedder-Policy
8. COEP credentialless (Chrome; not Safari): https://developer.chrome.com/blog/coep-credentialless-origin-trial ; https://next.centralcsp.com/en/docs/web-security/policies/cross-origin-embedder-policy
9. Godot 4.6 "Exporting for the Web" (single-thread default since 4.3, WebGL2, no C# on web, Safari caveats): https://docs.godotengine.org/en/4.6/tutorials/export/exporting_for_web.html ; https://forum.godotengine.org/t/godot-4-3-will-finally-fix-web-builds-no-sharedarraybuffers-required/38885
10. Storage quotas and eviction (MDN) and WebKit storage policy: https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria ; https://webkit.org/?p=14403
11. Safari 7-day storage cap: https://searchengineland.com/what-safaris-7-day-cap-on-script-writeable-storage-means-for-pwa-developers-332519
12. three.js WebGPURenderer manual (WebGL2 fallback): https://threejs.org/manual/en/webgpurenderer.html
13. three.js WebGPU migration (2026): https://www.utsubo.com/blog/webgpu-threejs-migration-guide
14. Godot 4.6 release (Jolt default, Jan 2026), maintenance releases: https://godotengine.org/releases/4.6/ ; https://gamefromscratch.com/godot-4-6-released/ ; https://forum.godotengine.org/t/maintenance-release-godot-4-6-3/138950
15. Godot console support / W4 Games (Switch 2 beta): https://docs.godotengine.org/de/4.5/tutorials/platform/consoles.html ; https://www.w4games.com/blog/w4-games-news-1/tag/nintendo-104
16. Unity web runtime, mobile browser support in Unity 6: https://unity.com/blog/engine-platform/web-runtime-updates-enhance-browser-experience
17. Unity pricing (runtime fee cancelled, Personal $200k, Pro 2026): https://unity.com/en/blog/unity-is-canceling-the-runtime-fee ; https://unity.com/runtime-fee
18. Bevy + WebGPU: https://bevy.org/news/bevy-webgpu/
19. Shipping three.js/web games on Steam (steamworks.js): https://www.summerengine.com/make-great-games/threejs-game-on-steam ; https://www.drawize.com/blog/tech-how-to-release-html5-game-on-steam
20. Steam achievements/overlay in Electron: https://smjn.itch.io/hivepvs/devlog/364303/adding-steam-achievements-to-an-electron-game ; https://forum.gdevelop.io/t/steam-overlay-and-leaderboards/60725
21. Tauri vs Electron 2026 (system webviews, sizes): https://tech-insider.org/tauri-vs-electron-2026/ ; https://www.abratabia.com/native-wrappers/tauri-vs-capacitor.php
22. App Store 4.2 and web wrappers: https://developer.apple.com/forums/thread/812889 ; https://www.mobiloud.com/blog/app-store-review-guidelines-webview-wrapper

Notes on confidence:
- The 300-500 MB iOS figure is developer-reported, not an Apple specification.
- Person-week estimates are judgement for an AI-assisted single developer, ±30%.
- I could not fetch the Godot docs page directly (DNS blocked here). Its content comes from search snippets of the 4.6 docs.
- No repo files were changed.
