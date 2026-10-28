# smol brains helper tools (not uploaded to the site; `docs/` is in .assetsignore)

These came from the cloud build sessions. Paths inside them are hard-coded to that cloud box
(`/tmp/claude-0/...scratchpad`, `/home/user/computercooked-site/.claude/worktrees/...`, `/opt/node22/lib/node_modules/playwright`).
Edit the constants at the top of each file before running locally (repo root, an output folder, and `require('playwright')`).

- `browser/look.js` — loads the game through the site page (`/games/smol-brains/` iframe), skips the intro, possesses a smol and checks mouse/drag/arrow look; screenshots. `hdsmoke.js` is the same with the hd look set (`localStorage smolbrains-look = "hd"`). Needs a static server on 127.0.0.1:8963 from the repo root.
- `sims/ladder.js` + `run.sh` + `sum.js` — the engaged-bot evolution ladder (200 sim-min, seeded per run) used to check pacing; `sum.js` tabulates logs. `lad-asc.js` is the older ascension-timing variant. `tests.sh` runs the suite in parallel.
- `hdart/` — the hd pixel look pipeline: `jobs.py` (Higgsfield generations, style ref = `../style-ref-pov.jpg`), `build.py` (chroma-key, seam-fix, NEAREST downscale, atlas), `contact.py` (contact sheet), `shots.js` / `perf.js` (screenshots, frame cost), `patch_*.py` (one-off code patches, historical).
