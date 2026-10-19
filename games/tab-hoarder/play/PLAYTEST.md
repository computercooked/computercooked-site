# tab hoarder: playtest

tested 2026-10-19 at http://127.0.0.1:8765/tab-hoarder/, on mobile (375x812) and desktop (800x600). i read game.js and index.html in full. there were no console errors from the game. the only errors came from my own test scripts.

**method note:** the shared Browser pane was hidden and each tool call took about a second, so my hand-timed taps were close to random (runs 1 and 5). for the real skill runs, a small script read the game's draw calls to find the moving tab and the top of the stack. it then sent real `pointerdown` / `keydown` events with a human-sized timing error (Gaussian σ in ms). i didn't change any game code.

| run | device | input | timing error | score |
|---|---|---|---|---|
| 1 | mobile | real taps | ~1s tool lag | 1 |
| 2 | mobile | real space, then a frame-perfect script | 0 | 54 (i stopped it on purpose. it would never have died) |
| 3 | mobile | script, keys | ±10 world units, flat | **119** (best) |
| 4 | mobile | script, pointer | σ 35ms | 27 |
| 5 | desktop | real click + space | ~1s tool lag | 1 |
| 6 | desktop | script, keys | σ 25ms (skilled) | 53 |
| 7 | desktop | script, keys | σ 50ms (casual) | 20 |
| 8 | desktop | script, pointer | σ 30ms | 33 |

realistic human range: **20–55**. a frame-perfect player never dies, because the speed caps and the perfect window snaps.

## scores

| area | score | why |
|---|---|---|
| first-10-seconds hook | 6 | the title, one-line rules and a tab already sliding on the menu are good. but the first tab enters half off-screen on mobile, and the joke titles are too small to notice at first. |
| fun / feel | 6 | a competent Stack clone. the slice-and-spin of cut pieces feels nice. there is one decision, repeated forever. |
| difficulty curve | 5 | speed goes 115 → 400 u/s and hits the cap at about 37 tabs. after that nothing new happens. the "perfect" window stays a fixed 5 units, which is about 12ms at the cap. a bad early drop gives a sliver run you can't save. |
| juice | 6 | the procedural fan and whine that rise with heat are great. perfect drops step up in pitch, and there is steam, shake and milestone toasts. the placement thud is weak. perfects have no ring or pop. the pitch ladder stops at 12. |
| clarity | 5 | the rules are clear. width regrows on a perfect streak, but nothing on screen says so. CRASH shows X-eyes (looks dead) on every off-centre drop. "0 tabs open" shows while a "new tab" is already on screen. |
| replay value | 4 | the only goal is a best score. there are no power-ups, events, unlocks or stats. every run is the same. |
| clip-worthiness | 5 | the milestone jokes and the "cause of death" line are shareable. the tower is a plain beige column, and the death card has no share button. |
| bugs (10 = none) | 7 | nothing crashes. there are layout and art problems on mobile, plus some edge cases (see below). |
| **overall** | **5.5** | well built and on brand, but shallow. a solid base that needs a second system. |

## bugs (with repro)

1. **mobile: the sliding tab is half off-screen at each turnaround.** `RANGE` 175 + half-width 90 = 265 world units, but at 375px only ±210 is visible. repro: mobile preset, start, then watch the right edge. you can't see the far edge of the tab you're timing.
2. **the stack drifts off-centre and stays there.** perfect drops snap to `top.x`, but the slider still sweeps around x=0. repro: cut a tab hard to the right, then go on a perfect streak. the tower stays at about x=+85 for the rest of the run. on mobile it hugs the right edge, and the two sweep directions have different timing.
3. **the cooked CRASH frame has a black box and black corner squares.** the dark backing and the "smoke" pixels in `crash.png` frame 2 show up as a black rectangle over the lilac heat glow. repro: reach about 20 tabs, then miss.
4. **the hit face reads as death.** frame 1 (X-eyes) shows on every imperfect drop (`crashHit`). the real death frame (index 2) is a sleepy face. repro: drop any tab off-centre. CRASH looks dead while you're still alive.
5. **taps during the result card restart the game.** restart unlocks at `overT > 0.75`, but the card is still fading in until 0.85. repro: miss, then keep tapping. you skip the score card, and "new personal best" is never seen.
6. **perfect forgiveness is ignored on slivers.** the `ov <= 0.5` miss check runs before the `|off| <= PERFECT` check. repro: get the width down to about 4, then drop 4.6 units off. it counts as a miss even though it's inside the perfect window.
7. **the HUD vanishes on death.** the HUD only draws while `state === 'play'`, so for about 0.6s after a miss there's no score on screen.
8. **"new tab" is also in `TITLES`.** the base tab's name can show up again mid-stack.
9. **minor:** the `cc-restart` postMessage mid-run throws the run away without the `best` check. the standalone page has no mute UI or M key, because mute only comes through the hub's postMessage. `computercooked.com/games` on the card is canvas text, not a link.

## top 5 issues (by impact)

1. **no depth.** it's one timing check, repeated. after about 37 tabs the speed is capped and nothing changes. a skilled player has no new reason to start another run.
2. **the one skill mechanic is hidden.** perfect streaks regrow width (`combo >= 3`, +6+combo px), but nothing shows it. perfects don't add points, so score is just the tab count. players will never learn that perfects matter.
3. **mobile layout.** the slider is off-screen (bug 1) and the tower drifts to the edge (bug 2). on desktop the opposite happens: fitting to height leaves a small column with big empty sides.
4. **the death flow loses the moment.** the restart lockout is too short, there's no share button, no stats (perfects, best streak), and the URL isn't clickable. the "cause of death" joke deserves a share.
5. **CRASH's expressions are wrong.** X-eyes show on every off-centre drop, and the death frame has black-box artifacts. the mascot is the brand, so it has to read right.

## top 5 improvements (vanilla JS, about 20 min each)

1. **perfect streaks you can see, with a chain multiplier.** *(highest value per minute)* add `points` alongside the tab count: each drop gives `1 × mult`, and `mult = 1 + floor(combo/3)`. regrow on every perfect from combo 2 (`w += 8 + combo*2`, capped at `BASE_W`), and show the new width growing in with a lime outline. draw a streak meter under the HUD ("x3 chain"). let `sfx.perfect` keep climbing past 12 by wrapping an octave and adding a third note. at combo 5, 10 and 15, show a bigger toast plus a 40-particle ring.
2. **special tabs (power-ups).** *(adds the most depth; build it on top of #1)* on `spawn()`, roll `cur.kind` with about a 12% chance after 8 tabs, and give each kind its own fill colour and favicon:
   - `incognito`: a dark ghost tab. it lands at full `BASE_W` no matter how much overlaps, which buys back width.
   - `reopen` (ctrl+shift+t): on landing, sets the top width back to `BASE_W` and plays a rewind sweep of the last 3 cut pieces flying back in.
   - `pinned`: auto-snaps to perfect if `|off| < 30`, with a pin icon. it's a safety net.
   - `buffering`: slow-mo. `speedFor × 0.5` for the next 3 tabs, with a "buffering…" spinner toast.
   - make streaks earn them too: combo 5 guarantees the next tab is `pinned` or `reopen`. that ties #1 and #2 into one loop.
3. **a second difficulty layer after the speed cap.** from 30 tabs on, add one-drop events: `lag spike` (the tab freezes for 150ms mid-sweep), `pop-up` (the tab enters from the near edge at 1.3× speed), and `auto-play video` (the slider wobbles ±8px). show a toast for each. about one in five drops after the cap.
4. **a death card worth sharing.** lock restart until `overT > 1.1`. add stats lines: perfects, best streak, power-ups used. add a canvas "share" hit-box that calls `navigator.share` or the clipboard with `i hoarded N tabs. cause of death: "<title>". computercooked.com/games`. make the URL line a real link.
5. **fit and readability fixes.** centre the slider sweep on `topTab().x` (clamped), or ease the tower back to x=0 by a few px per perfect. widen `WORLD_W` to about 540, or scale `RANGE` so the whole sweep is visible at 375px. swap the hit frame to a squint (or tint frame 0) and keep X-eyes for death. clear the black backing in `crash.png`, or draw a carbon plate behind the sprite.

**what would add the most:** #2 special tabs, wired to #1's streaks. together they turn "tap on time" into "build a streak so you earn a pinned or reopen tab, then spend it to survive a sliver." the game has no such risk-and-reward layer today. if there's only time for one, do #1: it's the cheapest and makes every drop feel better.
