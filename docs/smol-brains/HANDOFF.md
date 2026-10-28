# smol brains — handoff prompt for a new Claude Code session

Paste everything below the line into a fresh local Claude Code session opened in a clone of `computercooked/computercooked-site`.

---

You're taking over development of **smol brains**, a browser game on my site (computercooked.com), from a long cloud session. Read this whole brief, then `games/smol-brains/DESIGN.md` (the living design doc, sections 0.x list what every version added), then the plan in `docs/smol-brains/plans/plan-combined.md`. Don't start building until you've read those. Then tell me in a few lines what you understood and what you'll do first.

## How I want you to work with me
- Keep answers short and plain. Lead with the answer, then only what changes what I'd do next. Say risks and decisions first. Minimal formatting.
- Never say it's impossible to make smols as smart as humans; frame it as "we're on that path".
- I play the game and give notes; you turn notes into shipped versions. When I'm away or asleep, make sensible decisions yourself and tell me what you decided.
- Use parallel subagents in separate git worktrees for independent pieces of work, give each clear file ownership to avoid merge conflicts, then merge, test and ship yourself. Review screenshots yourself before shipping anything visual.

## The project rules (strict)
- Game lives in `games/smol-brains`. Vanilla JS, **no build step**, everything on `window.SB` (event bus `SB.bus`). Must run on phones.
- Keep the site postMessage hooks and `cc-sdk` working. **Don't edit other games.** Total game size under 5 MB.
- Keep the tests (`games/smol-brains/tests/*.test.js`, run with `node`); add tests for new systems.
- Every release: bump the version in **all three places**: `games/smol-brains/play/entry.json` (`version`, `size_kb`, update `controls`/`how_to` when they change), `games/games.json` (the smol-brains entry: `version`, `size_kb`), and `games/smol-brains/index.html` (`data-version`). `size_kb` = bytes of `games/smol-brains` excluding `tests/`, `screenshots/`, `DESIGN.md` and `og*.png`, /1024, rounded.
- Every release: a `DESIGN.md` section "What vX added", and screenshots in `games/smol-brains/screenshots/` (named `vNN-*.png`).
- No model identifiers (Claude/Opus etc.) in anything committed.
- Ship flow: branch → commit → push → PR → merge with a merge commit titled `Merge PR #N: …` (merging is pre-authorised). The Cloudflare Workers Builds check fails on every PR; ignore it. The site deploys on merge to main. Tell me when it's live.
- `docs/`, `games/smol-brains/tests/`, `DESIGN.md` and `screenshots/` aren't uploaded to the live site (see `.assetsignore`).
- Other sessions also commit to this repo (other games, site branding — one touched smol-brains' share card in `8ba9e18`), so always start from a fresh `origin/main`.

## What the game is
A god-sim: tiny pixel creatures ("smols") with real neural-net brains crash-land in pods on a procedural island. You teach them (talk/word book, tickle to reward, tap to scold, miracles that cost prayer "sparks", orders), and they evolve through tiers: blob → critter → tool-user → tribe → builder → thinker → ascended. They invent ideas, build villages, grow into towns and cities, pray, grieve, and can ascend (the ending, plus new game+). You can also **possess** one smol and play it in first person, and its brain learns from how you drive it.

Vision ("two games in one"): the sim stays for people who like watching and teaching, and possessing a smol turns it into a real survival game (Minecraft / Terraria / Rust / RimWorld / Valheim). On top of that, a tech arc through real human history up to the Industrial Revolution and beyond (paved roads, cars built over generations, guns, realistic-size cities). The game should be challenging, not cosy. Lots of lore.

## Current state: v4.4.1 live (merged PR #76)
Version history (all in DESIGN.md §0.x):
- 4.0: title screen, many saves, create world (sizes S 384 / M 544 default / L 768 / XL 1024), 21 biomes, possession, orders, minds, collectibles, Stardew-like art.
- 4.1: first-person look fix (mouse listens on `#view`; `#overlay` has `pointer-events:none`), arrow keys turn the head, pixel HUD.
- 4.2: readability pass (outlines, distinct trees and pickups, wind, squash/stretch, smoother ground, art hooks `SB.Render.loadArt`, `SB.Pixel.override`, `GL.loadImage`).
- 4.3: towns, money, eras (band → village → town → city), market, jobs, roads, districts, council and the Law of the Sky (`economy.js`, `civ.js`); grump threats (raids, theft, kidnaps to camps, burning) and rare local disasters (`threats.js`).
- 4.3.1: **hd pixel look** (`hd.js`; settings → look cycles pixel → ✨ hd pixel → classic 3D; opt-in, default is still pixel; generated tiles and item sprites, warm light, depth of field, bloom; auto-off blur/glow on weak phones) and **grown-up faces** (tribe+ smols taller, neutral at rest, face follows mood via `SB.Chem.face`, no flicker).
- 4.4: **first tool** (`survival.js`, `povhud.js`, `survival-art.js`, `possess.js`): 9-slot hotbar, bag (Tab) with drag and drop and crafting, Minecraft controls (left use, right place/eat/give, F pick up, Q drop, B build plans), pixel hearts/drumsticks/flames→snowflakes/pep rows, vines; stick + vine + rock = rock-on-a-stick, chopping (trees topple to logs and stumps), mining, splitting, tool wear, building ghosts (green/red, R rotates) and sites, lean-to, a first-tool quest tracker with world markers, real death at zero hearts. Plus **3D voxel smols** (`voxel.js`) built from each smol's own pixel sprite, used in first person and in the hd look up close; they fade within 0.4 units instead of vanishing and you can't walk into them.
- 4.4.1: **less cuddling**: slow love for settled adults, partners from tribe on (courtship, rejection, jealousy, breakups), hearts only between partners and toward kids, ~15 min between eggs, eggs cost food, housing limit; builders now really rebuild raided huts; late-game pacing retuned (crystal patch near home, stronger inheritance, more room before villages).

Pacing targets (engaged-bot sims): builders ~60–80 min, town 75–110, city 120–160, ascended 125–150. Judge medians across seeds, not a single run: one run swings ±30 min by chance. Last measured (4.4.1, 9 seeded runs): city median 127, ascended median 125.

## Owner decisions (approved)
1. Less cuddling: done in 4.4.1.
2. Possessed smol at zero health dies for real, you're ejected (no faint first): done in 4.4.
3. Copper ore mineable with a stone pick by tool-users; smelting stays thinker.
4. Real height edits on the surface plus stacked underground tunnel levels ("2.5D caves"); no voxel blocks.
5. Grump lore: grumps are the warship crew from the intro, shrunk by the island over generations; the sky god (the player) feeds on the smols' thinking, resolved by the player's choice at the end.
6. Guns on both sides, real deaths, no gore (beaten grumps flee carrying their wounded); smol-vs-smol war only from thinkers on, behind a setting.
7. "Survival mode has no god hand": **on hold**, ask me later.
8. **Changed:** the long road to cars, guns and cities is part of the normal game and reachable before the end game (not a world option). I said it'll make the game much bigger, and that's the point.
9. Steam Early Access at 5.0, web stays free, stay in the browser (refactor: move the sim to a worker, IndexedDB saves). Move to Godot 4 only if: <30 fps with 200 smols under 400 MB on an iPhone-13-class phone after the refactor; consoles become a funded goal; Apple rejects the iOS app twice; or vehicles/cities are scheduled and the browser can't carry them.
10. Features never wait on art: build in code first, then add hd art. Also: give the smols the hd pixel treatment (partly done in 4.4: hd sprite shading plus voxel models).

## My notes that still matter
- I want survival in first person to be clear and fun: toolbar, inventory, building like the big survival games. I'm about to replay 4.4.1 and have my girlfriend play it; expect playtest notes, and treat first-time clarity as the top priority.
- Chop trees, mine ores, pick stone, dig dirt, but dirt has to *mean* something (fields, irrigation, moats, wells, root cellars, mud bricks, roads), never "dig a block, place a block". Mine shafts eventually.
- Tool progression gated by evolution: hands and legs first, then stick + vine + rock = primitive tool (also a weapon), then axe, pickaxe, and so on.
- Free-form building when possessed (logs/pieces, Valheim-style). Smols build preset structures, visibly piece by piece, not a progress bar.
- Bigger mountains: they're small now (peaks ~26–31 tiles on every map size).
- Grumps: primitive natives with spears and bows who raid and defend their camps, getting harder over time. Multiple kinds of challenge, RimWorld-style.
- Smols cute in early stages, normal from tribe on, smiling only when happy: done.
- Lots of lore, delivered in play (ruins, relics, elders' stories, visions, chronicle), not walls of text.
- Keep the retro pixel style; hd pixel is the approved direction (see the style references in `docs/smol-brains/style-ref-*.jpg`; the first-person one, `style-ref-pov.jpg`, is the one I loved).

## Roadmap (from plan-combined.md; decision 8 changes the later ones)
- **4.5 Spears and bows (next):** grump roles (scouts, spear-carriers, archers, shield brutes, drumming shamans), arrows both ways, morale and fleeing, camps as real villages, kidnapped kids come back raised by grumps, fight beside the tribe while possessed.
- 4.6 First night: real darkness in first person, hunting grumps you can dodge, wounds, fire drill, tribe quests at the campfire.
- 4.7 Watch them invent: an "Age" track beside the eras, tinkering with clues, pressures that drive inventions, the cart over three generations.
- 4.8 Piece by piece: visible construction stages; mystery board and ark logs (lore).
- 4.9 The war moon: storyteller personas, warned threats, sieges, long winter, gates/towers/guards/training yard.
- 4.10 Dig and till · 4.11 Grand mountains · 5.0 Two games in one (free building, Survival mode, Steam) · 5.1 Mines · 5.2 Bronze and iron · 5.3 Clans and the Iron Hill · 5.4 Cities (do a 10k-building phone test early) · 5.5 Mills, powder and print · 5.6 Steam · 5.7 Motor and spark · 6.0 The signal (ending).
- Since decision 8 makes the tech arc core, re-plan 5.x so the industrial and motor ages are a normal path to the ending.
- Details per pillar are in `docs/smol-brains/plans/`: `plan-survival.md`, `plan-terrain.md`, `plan-tech.md`, `plan-challenge-lore.md` (includes a lore bible), `plan-engine.md`.

## Known issues and follow-ups
- Flaky tests (unseeded randomness): civ "forget writing and the city falls back to a town", orders "smols keep out of a no-go zone", threats "tornado / shelter: nobody dies", director "…and the raid ends". Seed them and fix the real causes.
- `R.pickGround` only searches up to y=32, so taps on volcano tops (43–50) land behind the peak.
- The hd look and voxel smols were only measured on a software renderer; check frame rate on a real phone.
- In the hd look, trees don't cast real shadows.
- Pixel look 3D smols are opt-in via `?smols=3d` / `smolbrains-smols` but have no settings button yet.
- Older notes: close-up sprites a bit large, rain looks thin, popups queue up during possession, check the phone HUD layout.
- Nothing yet uses autosprite for smol animation: generated sheets would lose the gene variety and mood faces, so the procedural sprite/voxel route was kept on purpose.

## Testing
- Headless: `cd games/smol-brains && node tests/<name>.test.js` (32 files; `tests/_load.js` lists the loaded modules). Some suites take 10+ minutes; run them in parallel in the background.
- Sims: the engaged-bot ladder in `docs/smol-brains/tools/sims/` (edit the paths first). Seed the randomness per run when comparing before and after.
- Browser: serve the repo root (`python3 -m http.server 8963 --bind 127.0.0.1`), open `/games/smol-brains/` (the site page embeds the game in an iframe `#game-frame` → `/games/smol-brains/play/`). With Playwright: click `.introgate`, then `.introskip`, then the "no, i know how to play" button. Debug helpers: `SB.Debug.spawnTier(tier, n)`, `SB.Debug.reveal()`, `SB.Possess.enter(SB.Game.current, c)`. The intro (`SB.Intro.covering`) blocks frames until skipped. Tools in `docs/smol-brains/tools/browser/`.

## Art pipeline (Higgsfield)
- Account: now on the **Plus** plan (~839 credits as of 2026-10-28). Models tagged "unlimited" (Nano Banana 2, GPT Image 2, Seedream 4.5, FLUX.2) may be free on Plus — check with `higgsfield generate cost` and the account transactions before assuming. 4 concurrent jobs max on Starter; check Plus limits.
- Locally: install the CLI (`curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh`), `higgsfield auth login`, `higgsfield workspace set <id>` (the "Private" workspace). The Higgsfield MCP/skills may also be available.
- Model: `nano_banana_flash` (Nano Banana 2) for all image art, always with `docs/smol-brains/style-ref-pov.jpg` as `--image` style reference. `autosprite` for sprite-sheet animation if ever needed; `meshy_v7_image_to_3d` (low-poly) only for a few hero props. Check `higgsfield generate cost` before batches.
- The pipeline that made the hd look is in `docs/smol-brains/tools/hdart/` (chroma-key, seamless tiling, NEAREST downscale, atlas, contact sheet). Art must stay small (the current hd art is 150 KB) and lazy-load only in the hd look.

## First thing to do
Pull `origin/main`, read DESIGN.md and plan-combined.md, run a quick subset of tests (`possess`, `survival`, `voxel`, `hd`) to check your setup, then ask me for my 4.4.1 playtest notes. If I haven't played yet, start 4.5 "Spears and bows", and fix the flaky tests along the way.
