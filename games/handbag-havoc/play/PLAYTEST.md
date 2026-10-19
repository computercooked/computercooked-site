# Handbag Havoc playtest

Curator-style playtest, 2026-10-19. Played at 1280x720 and 375x812 (mobile, real taps and drag joystick), from a first run with storage cleared, through a full run lost to the King at 56% HP (1:34, 354 yeets, best bowl x28) and a win (`?wave=5`, skilled bot). Also ran headless sims: skilled and random bots (30 seeds each), plus idle, circling and zigzag input (20 seeds each). The Browser pane was hidden, so frames were stepped through the game's own `update`/`render` hooks. The code was not edited.

## before (v1)

| Area | Score | Evidence |
|---|---|---|
| First-10-seconds hook | 6 | Three gnomes spawn in purse range, so the first hit landed at 1.65 s and a "YEET!" popup follows. Wave 1, though, is 3 to 13 slow gnomes on a big empty lawn. The title is a text card with no granny art, and it covers the attract demo. |
| Fun / feel | 5 | Chain bowling is satisfying once the screen fills up (wave 4 onwards). But the purse spins on its own and standing still works better than steering, so your hands do very little. |
| Difficulty curve | 4 | Idle input (no steering at all): median 87 s, reaching wave 4-5. Tight circling: median 35 s. Zigzag: median 38 s. Random bot: median 65 s, 3% wins. Skilled bot: 93% wins. Moving is punished and doing nothing is rewarded. Waves 2-3 feel like wave 1 with recolours. |
| Juice | 7 | Hitstop, shake, zoom-punch, slow-mo on x10+, ceramic shards, and synth bonk, shatter and chain sounds are all there. Missing: music, and any warning before you lose a heart. Popups stack on top of each other (two "BOWL x5" at once, and three overlapping popups at the win). |
| Clarity | 5 | You never see the nibble meter, so hearts disappear without warning. Shards stay on the lawn for the whole run at 0.8 alpha in the gnome hat colours, and by wave 4 the ground is confetti noise that hides enemies. Desktop zoom makes sprites small, about 30 px per gnome at 720p. |
| Replay value | 4 | 14 flat stat upgrades and no evolutions or synergies. No meta progression, no unlocks, nothing to do after a win. The daily seed only fixes the opening: offers split after wave 1, depending on what the player does (verified on 2 headless runs with different steering). |
| Clip-worthiness | 7 | The King kill sends every gnome flying outward at once. "BOWL x60" plus "LONG LIVE GRANNY!" is a strong 3-second clip, and granny on a scooter is a good thumbnail concept. The early waves are not clip material. |
| Bugs | 7 | No crashes. Problems found: daily offers are not shared between players; `?wave=N` debug runs write "new best" and wins to the save; R restarts mid-run without confirming, and each run counts toward the "hide the steer hint after 3 runs" counter; there is no restart on mobile mid-run; the upgrade panel shows a scrollbar while the cards deal in. |
| **Overall** | **5.5/10** | A good concept and good juice, but you can win while barely playing. Below the Poki bar for a roguelite today. |

### Top 5 issues (ranked by impact on fun)
1. **Steering is counterproductive.** A player who never touches the controls survives longer (median 87 s) than one who whips the purse, which the title card tells you to do (35 s). The core verb hurts you.
2. **Hearts disappear without warning.** The nibble meter is invisible, so damage feels random, and you get no tells to react to.
3. **Shallow build variety.** All 14 upgrades are +% stats. Nothing changes how you play, and the picks after the first one barely matter.
4. **The first 40 s are flat.** Waves 1-2 are sparse and samey, and the "chain into others" fantasy only arrives around wave 4. Many Poki players bounce before then.
5. **The late screen is unreadable.** Permanent confetti decals in enemy colours, stacked popups and damage numbers bury the gnomes and the King's slam telegraph.

### 5 highest-value improvements
1. **Make whipping the power source.** Cut idle spin hard (`TUNE.spin` 4.8 -> ~2.5, so the idle tip speed of about 220 sits below `launchSpeed` 230 and a stationary purse can't yeet). Give a "whip meter" that charges from angular change of input and multiplies damage and launch speed. Show the purse trail colour going from white to orange to blue at speed tiers so players can see they are winning.
2. **Telegraph damage.** Draw a red ring that fills around granny while `p.nibble > 0` (nibble / `TUNE.nibble`), add a gnome "chomp" sound, and pulse the screen edge red at 1 heart. Add a ground marker for flamingo dashes that matches the King's slam circle.
3. **Add synergy upgrades and evolutions.** For example: League Bowler 3 + Fireworks gives "Strike!" (exploding flyers chain-launch); Rubber Fence + Ceramics gives "Pinball Wizard"; Spare Purse x2 + Windmill gives "Nunchuck Nana". Add 2-3 behaviour cards: a purse boomerang throw on a sharp reverse, a drift-boost when releasing a hard turn, and a gnome magnet. Show "evolves with X" on the cards.
4. **Re-pace the run.** Start wave 1 at about 4 spawns/s with a pre-placed cluster of 8 gnomes in a line so the first chain lands by 5 s. Give each wave one new behaviour (sprinters flank, chonks shield, gnomes with rakes that throw). Add a mop-up moment at wave end: all remaining gnomes topple as one chain into the upgrade screen.
5. **Clean up readability and add retention.** Fade decals to 0.35 alpha and desaturate them. Merge popups into a single combo counter near the HUD. Add a music loop that gets more intense with chain length. Make daily mode use a separate RNG for offers and spawns so everyone gets the same day. After the first win, unlock an "Endless / Bingo Night" mode and cosmetic scooters to give players a meta goal.

## after (v1.1)

What changed:
- **Whipping is the power source.** Idle spin is cut from 4.8 to 2.3, so a still purse no longer launches gnomes. A new whip meter fills from turning while moving and drains when you drive straight or stop. It adds up to +4.2 spin and up to +50% damage, and shows as a lime arc under the scooter. The steer hint now says "turning powers the purse".
- **Damage is telegraphed.** A red ring fills around granny while gnomes nibble, and the screen edge pulses red at 1 heart.
- **Two combo upgrades** are always offered once their requirements are met: STRIKE! (League Bowler 2 + Fireworks: explosions launch every gnome they touch) and Pinball Wizard (Rubber Fence + Ceramics: +2 bounces, and each bounce speeds the gnome up 30%).
- **Faster start.** Wave 1 spawns at 2.2–3.2/s instead of 1.2–2.4, and a line of 8 gnomes waits to be bowled, so the first chain lands within seconds.
- **Readability.** Shard decals on the lawn are at 0.28 alpha instead of 0.8.
- **Bugs fixed.** Upgrade offers use their own RNG stream, so a daily garden deals the same cards to everyone. `?wave=N` test runs no longer write bests or wins to the save.

Re-test (headless sims, 12 seeds each, same input scripts as the v1 test):

| input | v1 median | v1.1 median |
|---|---|---|
| idle (no steering) | 87 s, wave 4-5 | 52 s, wave 3, 11 yeets |
| circling | 35 s | 53 s, 150 yeets |
| random bot | 65 s, 3% wins | 64 s, 1/12 wins, chain x12 |
| skilled bot | 93% wins | 12/12 wins, chain x126 |

| Area | before | after | why |
|---|---|---|---|
| First-10-seconds hook | 6 | 7 | The pin line and busier wave 1 put a chain in the first seconds. |
| Fun / feel | 5 | 7 | Steering now matters, and turning visibly charges the purse. |
| Difficulty curve | 4 | 6 | Idle play loses, and active play is rewarded. The skilled bot is still too strong. |
| Juice | 7 | 7 | Still no music. |
| Clarity | 5 | 7 | Nibble ring, low-HP pulse and faint decals. |
| Replay value | 4 | 5 | Two combo upgrades. Still no meta progression or endless mode. |
| Clip-worthiness | 7 | 7.5 | STRIKE! explosions launch every gnome they touch. |
| Bugs | 7 | 8 | Daily RNG and debug saves fixed. Still no mid-run restart button on mobile (the player page's restart covers it). |
| **Overall** | **5.5** | **6.8** | Re-scored by the developer from sims and screenshots, not a fresh blind playtest. |
