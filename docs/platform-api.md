# Computer Cooked Games platform API

For the Hermes ccgames bot, the weekly build automation and anyone adding games. Base URL: `https://computercooked.com`. The code lives in `src/` (the Worker) and `games/cc-sdk.js` (the client) in the `computercooked/computercooked-site` repo.

The status check is `GET /api/health`, which returns `{ok, db}`. While `db` is false, the database isn't connected yet. The site then hides accounts, leaderboards and feedback, and games still play normally.

## Reading metrics (automation)

```
GET /api/admin/metrics?since=YYYY-MM-DD
Authorization: Bearer <token>
```

The token is in `C:\Users\Ashton Bush\Bush Growth\Projects\Computer Cooked\Games\Studio\operations\.metrics-token` (the last line of the file). It's a secret: never commit, paste or log it. If you leave out `since`, it defaults to the last 7 days. The same data is shown as a table at `https://computercooked.com/admin/` (paste the token there).

**Smoke-test traffic is left out.** A guest (no account) whose anon id starts with `smoke` (any case) is test traffic, which is what `scripts/smoke-test.mjs` sends. Its plays are accepted, but its scores are stored with `hidden = 1`, and it's left out of the boards, `/api/stats`, the weekly challenge auto-pick, game of the week, every number in this response, and the dare funnel. It's counted on its own in `test_traffic: {plays, scores, scores_visible, feedback, dares, next}`; `scores_visible` should always be 0. The leaderboard's `you` row still reads a smoke player's own hidden runs, so the smoke checks work.

Response:

```json
{
  "ok": true, "since": "2026-10-12", "generated_at": "…",
  "totals": { "plays": 0, "accounts": 0, "new_accounts": 0, "uploads_pending": 0, "open_reports": 0 },
  // challenge-a-friend funnel for dares made since `since` (open_rate = opened / sent; beat_rate = beaten / opened)
  "dares": { "made": 0, "sent": 0, "via_share": 0, "via_copy": 0, "via_card": 0, "via_download": 0, "opened": 0, "opens": 0, "beaten": 0, "beats": 0,
             "sent_rate": null, "open_rate": null, "beat_rate": null,
             "by_source": { "best": { /* same fields: offered after a new personal best */ }, "button": { /* asked for after any run */ } } },
  // "play next" rail after a run: plays started from it (per_run = plays / runs_ended), by card tapped
  // "share this game" sends after runs with no score (no dare), by method
  "game_shares": { "sent": 0, "via_share": 0, "via_copy": 0, "via_card": 0, "via_download": 0 },
  // "follow @computercooked" button clicks (site → socials)
  "follow_clicks": { "total": 0, "by_platform": { "tiktok": 0, "youtube": 0, "instagram": 0, "x": 0 }, "by_slot": { "hub-card": 0, "hub-footer": 0, "post-run": 0 } },
  // site measurement (POST /api/hit): page views, tip clicks/successes; "none" = no campaign / no slot
  "pageviews": { "total": 0, "by_ref": { "tiktok": 0 }, "by_path": { "/games/": 0 } },
  "tips": { "clicks": 0, "clicks_by_slot": { "hub-top": 0, "hub-footer": 0, "post-run": 0, "other": 0 }, "clicks_by_ref": {}, "successes": 0, "successes_by_ref": {} },
  // real plays by channel (all games), and pageviews / plays / tips per utm_campaign
  "plays_by_ref": { "tiktok": 0, "direct": 0 },
  "campaigns": { "<utm_campaign>": { "pageviews": 0, "plays": 0, "tip_clicks": 0, "tip_successes": 0 } },
  "next": { "runs_ended": 0, "plays": 0, "ended": 0, "per_run": null, "by_slot": { "challenge": 0, "similar": 0, "new": 0 } },
  // the whole-site funnel (first-party events): page views → plays → finished runs → shares (dares sent + game shares)
  // → follow clicks, plus tip clicks, sign-ups (cc:signup) and dares opened (cc:dare_opened). Each game row also has
  // "funnel": { landed (views of /games/<slug>/), played, finished, shared, followed }.
  "funnel": { "landed": 0, "played": 0, "finished": 0, "shared": 0, "dares_opened": 0, "followed": 0, "tip_clicks": 0, "signups": 0 },
  // outbound links are tagged: follow buttons utm_source=computercooked&utm_medium=<slot>&utm_campaign=follow;
  // dare links ...&utm_campaign=dare and share-this-game links ...&utm_campaign=share, so plays they bring land in "campaigns".
  // the test-lab ranking (src/winners.js): which games are catching on, best first; "too early" ones (under 20 real
  // players) go last. score 0-100 = weighted next-day return 25%, week-later return 15%, plays per player 15%,
  // shares per player 20%, avg session 10%, thumbs-up share 10%, outside traffic 5%, each against a "hit" target;
  // signals without enough data drop out and the rest are rescaled. parts = each signal 0-100; weakest = fix first.
  "winners": [{ "game": "crash", "title": "CRASH", "plays": 0, "players": 0, "score": 18, "verdict": "too early | winner: package it | promising | not catching on",
                "parts": { "d1": null, "d7": null, "replay": 25, "share": 0, "session": 3, "rating": null, "outside": 100 }, "players_needed": 16, "weakest": "share" }],
  "games": [{
    "game": "crash", "title": "CRASH",
    "plays": 0, "unique_players": 0,
    "avg_session_seconds": 41.2,
    "completion_rate": 0.93,          // share of finished plays that ended normally (not quit)
    // new: shares per game, plays from outside the site (referrer not "internal"), and total minutes played
    "shares": { "dares_made": 0, "dares_sent": 0, "game_shares": 0, "total": 0 }, "outside_plays": 0, "total_minutes": 0,
    "auto_logged_plays": 0,           // plays logged by the player page because the game has no SDK hooks
    "d1_return_rate": 0.21, "d1_cohort": 140,   // of players whose first play was on/after `since` (and ≥1 day ago), share who played again the next day
    "d7_return_rate": 0.05, "d7_cohort": 60,
    "avg_rating": 0.6,                // (up - down) / rated, from -1 to 1
    "thumbs_up": 0, "thumbs_down": 0, "feedback_count": 0,
    "latest_feedback": [{ "rating": 1, "text": "…", "tester": "sam", "version": "1", "at": "…" }],
    "top_referrers": [{ "referrer": "tiktok", "plays": 0 }],   // tiktok | youtube | instagram | x | threads | bluesky | search | internal | direct | embed | app | other
    "testers": [{ "tester": "sam", "plays": 0 }],
    "devices": { "mobile": 0, "desktop": 0, "tablet": 0 }
  }]
}
```

Notes:
- `unique_players` counts accounts and anonymous ids. One person on two devices counts twice unless they're logged in.
- Days are UTC.
- Playtest traffic carries a `tester` tag. Filter on it when you want public numbers only.

## Follow loop (site → socials)

A "new games drop on our tiktok first / follow **@computercooked**" house card with four buttons (tiktok, youtube, instagram, x), from `assets/follow.js`:
- **Hub:** the card fills the reserved `games-hub-bottom` ad slot, below every shelf, so it never pushes a play button down. The footer also gets a compact follow row.
- **After a run:** the card goes at the end of the play-next rail, only when the tip jar is off and the run wasn't a new best (where the dare is the ask). There's only ever one house card on a game page.
- **Links:** tiktok.com/@computercooked, youtube.com/@computercooked?sub_confirmation=1, instagram.com/computercooked/, x.com/computercooked. They open in a new tab with `rel="noopener"`. No pixels, no third-party scripts.
- **Clicks:** `POST /api/follow {platform, slot, game?, anon}` → `{ok}`. It stores one `events` row `cc:follow_click` `{platform, slot}` with no player id (`game` is the game page's slug, or `site`). Smoke anon ids get `{ok, test: true}` and nothing is stored. 400 for an unknown platform or slot. 60 per hour per IP. Counted as `follow_clicks` in admin metrics and in the digest.

## Daily digest

`GET /api/admin/digest?days=7` (Bearer token, `days` 1–31, default 7). One row per **Pacific-time** day (America/Los_Angeles, DST handled), oldest first. The last row is today so far (`partial: true`). Smoke traffic is left out, as in metrics.

```json
{ "ok": true, "version": 2, "tz": "America/Los_Angeles", "days": 7, "from": "2026-10-14", "to": "2026-10-20", "generated_at": "…",
  "rows": [{
    "date": "2026-10-20", "partial": true,
    "plays": 0, "players": 0, "new_players": 0,          // new = first play ever that day
    "d1_return": { "back": 0, "of": 0, "pct": null },     // of that day's new players, how many played the next day (null for today)
    "ref": { "tiktok": 0, "youtube": 0, "instagram": 0, "x": 0, "threads": 0, "bluesky": 0, "search": 0, "other": 0, "direct": 0, "internal": 0, "app": 0, "embed": 0 },
    "next": { "plays": 0, "per_run": null },             // play-next plays / runs ended that day
    "runs_ended": 0,                                     // game overs (plays that reported an end)
    "game_shares": 0,                                    // "share this game" sends
    "tip_clicks": 0,                                     // "Tip the chef" / tip link clicks (outbound to Stripe)
    "desk": { "shown": 0, "clicks": 0, "nudge": 0, "resume": 0 },   // homepage "your desk" row: shown, cards opened (of which the pick-up card), hero nudge clicks
    "follow_clicks": { "tiktok": 0, "youtube": 0, "instagram": 0, "x": 0 },   // follow button clicks
    "dares": { "made": 0, "sent": 0, "opened": 0, "beaten": 0 },   // dares made that day, and what became of them
    "new_accounts": 0,
    "games": [{ "game": "crash", "plays": 0, "players": 0, "completion_pct": 95, "auto_pct": 0 }]   // games played that day
  }],
  "games": [{ "game": "crash", "plays": 0, "players": 0, "completion_pct": 95, "auto_pct": 0,       // whole window
    "runs_ended": 0, "avg_session_s": 41, "avg_score": 12.5, "best_score": 80 }],   // game over: ended runs, their average length and score
  "desk": { "shown": 0, "clicks": 0, "resume": 0, "by_game": { "crash": 0 } }        // whole window; by_game = cards opened
  // also: each row's site {page_views, visitors, returning, returning_pct, avg_time_s}, and utm and game_pages (views per game page)
}
```

Version 2 (K-0065) added `runs_ended`, `tip_clicks` and `desk` to the rows, game-over stats to `games`, and the whole-window `desk`. Admin metrics has the same `desk` block.

**Daily file for readers without the token:** `node scripts/export-analytics.mjs https://computercooked.com <token file> <folder> [days]` saves the digest as `cc-analytics-latest.json` and `cc-analytics-<date>.json` in that folder (counts only: no player ids, names or feedback text). The token is read from the file and never printed or written.

**As a table:** `node scripts/digest.mjs https://computercooked.com "$TOKEN" [days] [--json]`. It prints the day rows (today is marked `*`), the totals (plays, plays from social, game shares, dares sent, new accounts) and the per-game table. The token goes only in the Authorization header and is never printed; a failed request prints the HTTP status and exits 1.

## Link tags (where plays come from)

**Put `?ref=<channel>` on every link we post**, e.g. `https://computercooked.com/games?ref=tiktok` or `https://computercooked.com/games/crash/?ref=yt`. In-app browsers (TikTok, Instagram) usually send no referrer, so without the tag those plays would count as `direct`.

| tag value (case doesn't matter) | counted as (`top_referrers`) |
|---|---|
| `tiktok`, `tt` | `tiktok` |
| `youtube`, `yt` | `youtube` |
| `instagram`, `ig` | `instagram` |
| `x`, `twitter` | `x` |
| `threads` | `threads` |
| `bluesky`, `bsky` | `bluesky` |
| anything else (e.g. `reddit`) | `other` |

- `utm_source=` works the same when there's no `ref`. `utm_medium`, `utm_campaign`, `utm_content` and `utm_term` are accepted and dropped; they aren't stored.
- **First touch wins for the session (browser tab).** The first page of the visit decides, whether it's the hub, the home page or a game: its tag, else an outside referrer (so tiktok.com → hub → game counts as `tiktok`). With neither, a game opened from the hub counts as `internal`, as before. `assets/deck.js` (every page) and `games/cc-sdk.js` (game pages) both do this, into sessionStorage `cc-ref`.
- The tags come off the address bar once read, so a copied or reloaded link doesn't carry them on. Other params (`vs`, `d`, `tester` …) stay.
- `?ref=app` is the installed web app's start URL. It's left alone; app plays count as `app`.
- The play-next rail still marks its plays `internal` (with a `cc:next` event).

### Social landing (tap to play from a clip)

A hub link with a social tag **and** a game hint skips the hero. The visitor gets a full-screen "tap to play <game>" card instead. One tap opens that game in the same tab, scrolled to the player, and a small "more games ↓" link drops them on the normal hub.

- **Caption link for a clip:** `https://computercooked.com/games?ref=<platform>&game=<slug>`, e.g. `https://computercooked.com/games?ref=tiktok&game=smol-brains`. Slugs are the folder names under `/games/` (see `games.json`).
- **Bio link:** `https://computercooked.com/games?ref=tiktok`. With no `game=`, the platform's default is used: `LANDING_DEFAULT` in `games/index.html` (today only `tiktok → smol-brains`; change it when the pinned clip changes). Platforms without a default get the normal hub.
- Only the social tags in the table above trigger it (`reddit`, `app` and untagged visits get the normal hub). An unknown slug also falls back to the hub.
- Attribution is kept: the card's link carries `?ref=` on to the game, so the play counts under that platform. The card never opens a popup or a new window, which matters inside TikTok's and Instagram's in-app browsers.
- **One tap to playing:** the card's tap counts as the game's start tap. It leaves a one-shot flag (sessionStorage `cc-autostart`, `{game, t}`), and a game that calls `cc.autostart()` skips its own title screen. `cc.autostart()` is true once, only on that game, and only within 2 minutes of the tap; otherwise it's false. smol-brains honors it (a new island skips the "tap to begin" gate and opening story and goes straight to the fly-in and tutorial). pixel-purge and level-devil-exe call it too, but they have no title screen: they open straight into level 1, so they were already one tap from the clip. Any other game with a title screen still shows it until it adds the call:

  ```js
  if (window.cc && cc.autostart && cc.autostart()) startGame(); else showTitle();
  ```

  Browsers don't pass the tap's sound permission into the game frame, so audio starts on the player's first tap in the game.

## Playtest links

Add `?tester=<name>` to any game URL, e.g. `https://computercooked.com/games/crash/?tester=sam`. Everything that person plays and every bit of feedback they send in that browser tab is tagged with that name. It shows up under `testers` and `latest_feedback[].tester`.

## Game SDK (for game builders)

Every game page has `/games/cc-sdk.js`. `scripts/add-game.ps1` injects it into ported games, so don't include it yourself. Call it defensively:

```js
window.cc && cc.start();                                   // a run begins
window.cc && cc.score(n);                                   // live score (optional)
window.cc && cc.end({ score, durationMs, completed: true }); // run over -> Promise<{accepted, best, prev_best, rank, name} | null>  (prev_best null = first run on that board)
window.cc && cc.event("boss_beaten", { level: 3 });          // optional, at most 20 per play
```

- Score is a number where higher is better.
- For a leaderboard, add `"max_score_per_sec"` to the game's `entry.json`. It's the most score a perfect player can earn per second. The server rejects anything above `max_score_per_sec × seconds + score_slack` (default slack 50). You can also set `"max_score"` for an absolute cap.
- With no `max_score_per_sec`, the game gets no leaderboard; plays and feedback still work.
- Games without hooks still get basic plays (time played, no score) logged by the player page.
- The player page also sends `{type:"cc-mute", muted}`, `{type:"cc-restart"}` and `{type:"cc-pause"}` messages to the game iframe.

### XP, levels and achievements (slice B)

```js
cc.achieve(id)  // -> Promise<{id, name, desc, xp} | null>; logged-in players only, once per account
```

- **Declaring achievements:** add them to `entry.json` as `"achievements": [{"id":"first_word","name":"first word","desc":"teach a smol a word","xp":25,"secret":false}]`. Ids are `a-z 0-9 _ -`, XP is capped at 100 each, and add-game copies them into games.json. The server ignores ids that aren't declared.
- **What earns XP:** only the server grants it, and only for a logged-in player's completed run of 10 s or more whose score (when the game has a board) passed the bounds check.
- **Amounts:**
  - +10 per run, plus up to +40 for the run's rank against everyone on that game's all-time board;
  - +25 the first time you play a game;
  - a daily streak bonus of +5 × streak days, capped at +50.
  - **Streak saver:** one missed day is forgiven when the day before it was played, at most once per 7 days (`streakFrom` in `src/util.js`). It applies to the XP bonus, seven day uptime and the /me streak; `/api/me/summary` adds `streak_saved` when a saver was used in the last 7 days.
- **Daily cap:** the run part is capped at 150 XP per game per day.
- **Levels:** reaching level L takes 50·(L−1)^1.6 total XP (L2 50, L5 459, L10 1682). Titles: fresh install, warm boot (3), fan noise (5), tab hoarder (8), overclocked (12), thermal throttled (16), blue screen veteran (20), fully cooked (25), the kernel (30).
- **Site-wide achievements:** sampler platter (5 games), seven day uptime (7-day streak), leaderboard material (top 10 on an all-time board), ctrl+s (first cloud save), critic.exe (rate a game).
- **What players see:** the player page toasts board rank, +XP, unlocks and level-ups (with a share button). `/api/me` returns `level, title, xp, floor, next`, and `/api/me/summary` adds `xp, xp_history, achievements` for /me.

### Level unlocks (cosmetics)

Defined in `src/cosmetics.js` (`UNLOCKS`). They're earned by playing only, and everything from before stays free.

| level | unlock |
|---|---|
| 2 | pixel frame |
| 3 | antenna (accessory) |
| 4 | mint profile color |
| 5 | crown |
| 6 | pink profile color |
| 7 | neon frame |
| 8 | halo |
| 9 | circuit frame |
| 10 | gold profile color |
| 12 | on fire (`flames`) |
| 14 | molten frame |
| 16 | chrome profile color |
| 18 | holo frame |
| 20 | chef hat |
| 25 | golden frame |

- The server checks them: `POST /api/me/avatar` and the `theme` or `frame` in `POST /api/me/profile` return 403 below the level.
- `GET /api/me/profile` returns `level` and `cosmetics: [{kind: acc/theme/frame, id, name, level, unlocked}]`.
- **Profile frames** (migration `0011_frames`, table `frames(user_id, frame, updated_at)`): a border around the avatar on /me and /u/<username>. `POST /api/me/profile {frame}` takes `none` (or "") or a frame id; `profile.frame` and the public profile's `frame` return it (`none` when never picked), even for a private profile, like the color. Deleted with the account, included in the export.
- XP progress (in `cc.end` results) includes `unlocks`, the ones just reached, and the player page toasts them.
- To add one: draw it in `assets/avatars.js` (accessories) or add the color to the `THEMES` maps in `me/me.js` and `u/u.js`, then add it to `UNLOCKS`, plus `AVATAR_RE` in `src/auth.js` or `THEMES` in `src/profile.js`.

### Saves and the player (slice A)

```js
cc.save(slot, data)  // -> Promise<{local, cloud}>; writes localStorage now, the account too when logged in
cc.load(slot)        // -> Promise<data | null>; the newer of this device's copy and the account's
cc.saves()           // -> Promise<[{slot, updated_at, bytes, cloud}]>, newest first
cc.user()            // -> {id, name, level, avatar} | null (null until known: use onUser)
cc.onUser(fn)        // fn(user | null) once known, then on every login/logout (any tab)
cc.autostart()       // -> true once if the player came from the hub's "tap to play" card: skip your title screen (see Social landing)
```

- **Slots** are `a-z 0-9 _ -`, up to 32 characters. Each game gets 5 slots, 512 KB of JSON each.
- **Guests** keep saves on the device. On login, saves this device never synced go up to the account; the server keeps whichever copy is newer.
- **Batching:** cloud writes go out about once per 10 s per slot, so calling `cc.save` on every autosave is fine.
- **Clearing:** `cc.save(slot, null)` clears a slot, for example on "erase everything".
- **Player page:** shows one note per visit, "saved to your account ☁" or "saved on this device. log in to keep it everywhere."
- **Example:** smol brains saves to slot `main`. On boot it calls `cc.load('main')`; if the account copy is newer, it asks before loading it.

### Weekly challenge, events and the activity feed (slice D2)

- **Weekly challenge:** one featured game per ISO week (UTC, Monday to Sunday), set in `CHALLENGES` in `src/social.js` as `{week: "2026-W43", game, target, goal, xp}`. A logged-in player's validated run (10 s+, completed, score accepted) on that game scoring at least `target` earns the bonus XP once per week (`xp_events` kind `challenge`, ref = week). A hand pick always wins. A week with no entry gets an **automatic pick**: the leaderboard game with the most unique players in the 7 days before the week started, never last week's game. Its target is about the 60th percentile of that game's scores (or 30 s of perfect play when it has fewer than 10 runs), worth +100 XP. The first request of the week stores it in the `challenges` table (migration `0007_challenges`), so it stays the same all week. To see what next week will be, use `GET /api/admin/challenge` (Bearer token; `?date=YYYY-MM-DD` for another week; returns `source: hand / stored / auto (not stored yet)` and the pick). The hub shows it, and so does the featured game's leaderboard card.
- **Seasonal events:** `EVENTS` in `src/social.js`, `{id, from, until, name, desc, xp, label}`. Any validated run between `from` and `until` (UTC days, until exclusive) unlocks that site badge. It's listed on /me while live, and kept forever once earned. Halloween 2026 (`halloween_2026`, "trick or treat.exe", +31 XP) runs until Nov 1.
- **Activity feed:** /me shows your last 30 days of activity: achievements, challenge wins, and `cc.event`s that are **allow-listed** in `FEED` in `src/social.js` (game → event name → fixed template). Event values are clipped to 24 characters, stripped to letters/numbers and word-filtered; a line whose values don't pass is dropped. Today: smol brains `first_word`/`firstWord` {word}, `egg`/`hatch` {gen}; level devil.exe `milestone` {lv, deaths}, `finish` {t, deaths}. To add one, send a PR adding the template, and keep the event's data to short words and numbers.

## Installable web app (PWA)

- **Manifest:** `/manifest.webmanifest` ("Computer Cooked Games", start `/games/?ref=app`, standalone, icons from `scripts/make-icons.mjs`). The hub, /me, /u/ and every game page link it; the Worker adds the link and `assets/pwa.js` to game pages (`src/seo.js`).
- **Service worker:** `/sw.js` (scope `/`, served `Cache-Control: no-cache`). **Network first, always**: online you get exactly what the server sends; the cache (`cc-v1`) is only the offline fallback. It precaches the hub and site shell (cache `cc-v1`) and saves each page and asset you load (same origin, GET, plain 200). **Game files** (`/games/<slug>/play/…`) go in one cache per game version from games.json, `cc-game-<slug>@<version>`: when games.json shows a new version, that game's old cache is deleted, so an offline copy is never a mix of versions (it's saved again on the next play). Offline, a game frame with no current copy shows the offline page (served without X-Frame-Options so it shows inside the frame). It never touches `/api/*`, `/admin`, other sites, non-GET or range requests. Offline, a page with no saved copy shows `/games/offline`, which lists the games this device has saved. Bump `VERSION` in `sw.js` when the shell list changes.
- **Install card:** on the hub, `#install-card` appears when the browser offers an install prompt (Chrome, Edge, Android) or on iPhone/iPad Safari (share → add to home screen). It can be dismissed for good.
- **Metrics:** plays from the installed app are referrer `app` (cc-sdk.js checks display-mode standalone, plus a `cc-app` sessionStorage flag set by pwa.js for the game frame). Offline runs are not recorded: the SDK doesn't queue events, and the server bounds a run by when it saw the start.

## Play next rail

After every run (scored or not), the shared player (`games/platform.js`) shows **// play next** below the dare box: three game cards.
- **weekly challenge:** this week's challenge game (`/api/challenge`), unless that's the game you just played.
- **more like this:** the game sharing the most tags with this one (games not played on this device first, then newest).
- **you haven't tried:** a random game not in this device's `cc-recent` list. If there's no challenge card or you've played everything, more games like this one fill the rail, labelled "play again" when already played.

Card links are `/games/<slug>/?src=next&slot=challenge|similar|new`. On that page, `cc-sdk.js` counts its plays as referrer `internal`, tags its first run's start event with `src: "next", slot`, and takes the params off the URL, so a reload doesn't count again. The server stores one `events` row per play, `name = 'cc:next'`, `data = {"slot": …}` (no migration). `cc:*` event names are reserved for the platform: `cc.event` calls using them are dropped. Admin metrics `next` gives plays started from the rail per run ended, by slot.

## "Your desk" (returning players, K-0064)

The homepage shows a **your desk** row above game of the week, but only to a browser that has played something.
- **History:** `games/platform.js` keeps `cc-history` in localStorage on every game page: `{slug: {t, n, b}}`. `t` is the last visit, `n` counts visits that started a run, and `b` is the best score from an accepted run (the board's own MAX). There's no server, account or cookie. Browsers from before this only have `cc-recent`, which is used until `cc-history` exists.
- **The row** (`assets/home.js`): up to 6 cards, cloned from the shelf cards on the page, so no fetch. It shows the most recent game first, with "pick up where you left off", then up to 2 games added since the last homepage visit (`cc-desk-seen`), then the rest of the history. Each card has a sticker: `best: 41`, `played 3x`, `new since you left`, or `today's daily is fresh` on Crash Test daily when it hasn't been played today. The CRT mascot says a random line. **clear** wipes `cc-history` and `cc-recent`; **my stats** next to it (and in the start menu) opens the player card (see My stats).
- **The nudge** (K-0066): returning players also get a "your desk is warm ▾" link under the hero buttons, since the row sits below the fold on desktop. It scrolls down to the row and focuses its heading. It's hidden on first visits, like the row.
- **No layout shift:** a tiny `<head>` script adds `html.cc-desk` only when there's history, and CSS reserves the row's height from the first paint. First visits get the page exactly as before.
- **Counted:** `POST /api/hit` kinds `desk_shown` (once per load) and `desk_click` (`game`, `slot` `resume` or `card`; `slot` `nudge` with no game for the hero link), stored as `cc:desk_shown` / `cc:desk_click` events.
- **Playtest:** `/?ccdesk=demo` fills the row with made-up history (nothing stored or counted).

## Homepage: quick launch dock and "happening now"

- **Quick launch dock** (`index.html` `#desk-dock`, `assets/home.js`): the hero's game icons sit in one row under the welcome window, not scattered around it. Hover or focus shows a peek window with the game's cover. On phones the row scrolls sideways. Dock links carry `?ref=desk`.
- **surprise me.exe** (`#desk-dice`): spins through the dock like a slot machine and opens a game, preferring ones this browser hasn't played (`cc-history`). With reduced motion it opens the game straight away.
- **Start menu** (`#desk-start` opens `#desk-menu`): all games, today's dailies, surprise me, search, the lab, the cooked log, my account, and "shut down…" (a joke CRT power-off; a click or key brings the page back). Esc and a click outside close it; arrow keys move through it.
- **Happening now** (`#home-now`, above game of the week): three cards.
  - *Weekly challenge* (`#home-ch`): this week's game, goal, XP and how many players have done it, with a countdown to the week's end. Filled on the server.
  - *Daily 3* (`#home-daily`): three dots for today's three games and the streak, from `window.ccDaily3` in the browser, with a countdown to local midnight.
  - *Top this week* (`#home-top`): the 5 games with the most players over the last 7 days, with places moved against the 7 days before ("new" for a game that wasn't on the chart). Hidden until 3 games have plays. No play counts are shown.
- **Pick a mood** (`#home-moods`, under game of the week): five tiles (60 seconds, arcade, puzzle, chill, rage) that open the hub with that filter on (`/games/?vibe=<id>&ref=mood`). `homePage()` adds three covers and the game count to each from the same vibe rules as the hub (`vibesOf` in `src/seo.js`); a mood with no games is hidden. On the hub, the pressed chip scrolls into view on phones.
- **Latest crowns** (`#home-crowns`, under the three cards): the three newest #1 scores from the wall of epic gamers (`champsData()` in `src/champs.js`), each a chip linking to its game (`?ref=crown`). Hidden when there are no scores.
- **Server side:** `homeNow()` in `src/pages.js` builds the challenge and chart from `plays` and caches them for 5 minutes per isolate. The cards stay hidden if it fails, so the homepage never breaks on it. Links carry `?ref=now`.
- **Countdowns:** any element with `data-until="midnight"` or `data-until="<ISO date>"` is ticked each second by `assets/home.js`.

## Hero reel

The welcome window on the homepage has a little screen (`a#desk-reel`) showing a game. In the HTML it is a plain link to the game of the week with its cover (`src/pages.js` fills it in; link tag `?ref=reel`). About a second after load `assets/home.js` plays that game's clip, then flips to another game every 4.5 seconds, updating the link, title and pitch. It loads at most 4 clips on phones and 6 on bigger screens and loops those. It waits while hovered or focused, off screen, or in a hidden tab. Under reduced motion or data saver it stays a still link.

## Play it here (the homepage game window)

On screens at least 900 px wide and 560 px tall, clicking the hero reel opens that game in a window on the homepage (`dialog#play-win`, `assets/home.js`) instead of leaving the page. The window frames `/games/:slug/window/`: the embed player without the credit link, sent with `frame-ancestors 'self'` so only our own pages can frame it. Because its path is not `/embed/`, `cc-sdk.js` counts those plays under the visit's own ref, not "embed". "full page" links to the game page with `?ref=reel`. The x, Esc or a click outside closes the window and removes the frame, so the game stops. Phones, small windows, modified clicks and browsers without `<dialog>` keep the plain link.

## Hub quick play

On the hub (`/games/`), on a computer with a mouse (at least 900 by 560 px), pointing at or tabbing to a game card adds a "try it here" button (`assets/quickplay.js`, styles in `games/games.css`). It opens the game in a window over the hub: the same `/games/:slug/window/` player the homepage window uses, so plays count under the visit's own ref. "next game" loads the next visible card's game in the same window; "full page" goes to the game page; the x, Esc or a click outside closes it and removes the frame. Touch screens, small windows and browsers without `<dialog>` keep the plain card links.

## My stats (player card)

"my stats" in the command bar (also a did-you-know tip) opens a player card for this device (`dialog.stats`, styled in `assets/deck.css`): level, title and xp, a bar for how many games have been tried out of all of them, six numbers (games tried, runs, time played, games with a best, badges, longest speedrun), the top three games by time and a grid of the last 8 weeks of play days. It reads only what the site already keeps in localStorage: `cc-history`, `cc-time`, `cc-guest-xp` (its level maths copies `xpFor`/`TITLES` from `games/platform.js`, so change both together) and `cc-watch-best`. A logged-in player's account xp isn't in it. "copy" puts a one-line summary on the clipboard. `assets/deck.js` owns it: `window.ccStats.open()`. Nothing is sent; the only request is `/games/games.json` for titles.

## Play on your phone

On screens 900px and wider, the game bar has a phone button (`#btn-phone`, added by `games/player.js`) that shows a QR code of the game's page tagged `?ref=qr` (`dialog.qrbox`, styled in `games/games.css`), so a phone camera can pick the game up there. The code is drawn in the page by `assets/qr.js` (`window.ccQr(text)` returns an SVG; byte mode, level L, versions 1 to 5, about 100 characters at most), which loads on the first click. Narrower screens (phones) don't get the button. Nothing is sent.

## Next game key

On any page, **n** (while the page, not a game, has the keyboard) goes straight to a random game this device hasn't played yet (`cc-history`), or any other game once every one has been played. The link carries `?ref=next`. It is listed in the `?` help and the hub's did-you-know box; `assets/deck.js` owns it (`nextGame()`), and a page's own `n` navigation key would win. Nothing is sent beyond the normal page view.

## Hub list view

The games hub's filter row has a "view" chip (`.chip-view`, `assets/fx.js`) that switches the main grid (`#shelf-computer-cooked`) between the usual cards and a compact list: one line per game with a small cover, the name and a one-line pitch (`.is-list`, styled in `games/games.css`). The choice is kept on the device in localStorage `cc-hub-view` ("list" or absent). The placeholder row in `games/index.html` carries the same chip so the bar keeps its height (no layout shift). Nothing is sent.

## Speedrun timer

"speedrun timer" in the command bar puts a stopwatch in the bottom right of the game (`div.swatch` inside `.player-stage`, so it shows in fullscreen too; styled in `assets/deck.css`). It starts on `cc:start`, freezes on `cc:end` (using the run's own `durationMs`) and then shows that run's time and the device's longest run on this game. On or off is kept in localStorage `cc-watch` (carries from game to game); longest runs in `cc-watch-best` (`{slug: ms}`). `assets/deck.js` owns it: `window.ccWatch.toggle()`. Games need to do nothing. Nothing is sent.

## Pass and play

Two people, one device. On a game page, "pass and play" in the command bar asks for two names (`dialog.pnp-ask`); each player gets one run, a bar near the top (`div.pnp`, styled in `assets/deck.css`) says whose turn it is, and after both runs it names the winner (higher score wins) with "rematch" (the order swaps) and "done". Scores come from the normal end-of-run event (`cc:end`), so games need to do nothing; a run without a number score doesn't count. The match is kept in sessionStorage `cc-pnp` (`{g: slug, n: [a, b], s: [scores]}`) so a reload doesn't lose it. `assets/deck.js` owns it: `window.ccPnp.open()`. Nothing extra is sent.

## Game page keys

On a game page, while the page (not the game) has the keyboard: **f** fullscreen, **r** restart, **w** wide mode. They press the player's own buttons (`#btn-fs`, `#btn-restart`, `#btn-wide`), then hand focus to the game frame (except wide), and are listed in the `?` help. `assets/deck.js` owns them; the site's navigation letters win if one ever clashes. Once the game has focus every key is the game's, so games need to do nothing.

## Welcome back

On a game page, a player who has had a run here before (`cc-history` on this device, kept by `games/platform.js`) and comes back after half an hour or more gets a toast: "welcome back. last played 3 days ago. your best to beat: 1,240." It is read before the visit is stamped, shown about a second after load, and uses only what the device already has. Games need to do nothing. Nothing is sent.

## Ask the computer

"ask the computer" in the command bar is a magic 8-ball: think of a yes or no question, run it, and the bar answers in the computer's voice ("outlook cooked."). Running it again gives a different answer. `assets/deck.js` owns the answers. Nothing is kept or sent.

## Did you know

A small box near the bottom of the games hub (`aside#dyk` in `games/index.html`, styled in `assets/deck.css`) teaches one hidden feature per visit: the command bar, boss key, face-off, old tv mode, play timer, daily spin and so on. "try it" does the thing there and then; "another one" shows the next. `assets/deck.js` owns the list (add a line there when a new feature ships); which one comes next is kept in localStorage `cc-dyk` (a number). Without scripts the box keeps its first line. Nothing is sent.

## New-best confetti

When an accepted run beats the player's previous best (the same moment the dare box says "new best"), `games/platform.js` drops a short burst of pixel confetti over the page (`div.cc-confetti`, styled in `games/games.css`). It is a see-through layer (`pointer-events: none`) that removes itself after a few seconds, is placed inside a fullscreen game so it still shows, and is skipped under reduced motion. A first-ever run does not count as a new best. Games need to do nothing.

## Old tv mode

"old tv mode" in the command bar lays scanlines and dark corners over the running game, like a tube telly. It is only a see-through layer above the game frame (`html.is-crt .player-stage::before` in `games/games.css`, `pointer-events: none`): the game is not touched and needs to do nothing. `assets/deck.js` owns it: `window.ccCrt.toggle()` returns the new state. The choice is kept on the device in localStorage `cc-crt` and carries from game to game. Snap pictures do not include the layer. Nothing is sent.

## Tab-away title

While the tab is in the background its name changes to a short line asking the player back ("the computer misses you"; on a game page sometimes "<game> is still running"), a different one each time. Coming back restores the real title. `assets/deck.js` owns it (a `visibilitychange` listener); it is skipped while the boss key cover is up. Nothing is kept or sent.

## Play timer

"One more game" with an end. The command bar's "play timer: 10 minutes" (or 20) starts a countdown shown as a small pill in the bottom left corner (`button.ptimer`, styled in `assets/deck.css`). It follows the player from page to page in the tab: sessionStorage `cc-timer` holds the end time in ms. When it runs out a note (`div.ptimer-done`, `role="alert"`) says so, with "5 more" and "ok". Clicking the pill or "play timer: off" stops it. `assets/deck.js` owns it: `window.ccTimer.set(minutes)` (0 stops). In a fullscreen game the pill and the note are placed inside the fullscreen element so they still show. Nothing is sent.

## Boss key

The `` ` `` key (or "boss key" in the command bar) covers the whole page with a boring spreadsheet (`div.boss`, styled in `assets/deck.css`), mutes a running game (by pressing the player's own mute button, and un-pressing it after) and renames the tab. `` ` `` or esc brings everything back. `assets/deck.js` owns it: `window.ccBoss.toggle()`. The key is also heard inside a running game: a keydown listener is added to the same-origin game frame, so games should not use the `` ` `` key. It is ignored while typing in a field. Nothing is kept or sent.

## Face-off (this or that)

For people who can't pick: eight random games go head to head, two at a time. You pick one of each pair, winners meet, and after seven picks one game is left with a "play it" link (`?ref=faceoff`) and "go again". `assets/deck.js` owns it: `window.ccDuel.open()` shows the dialog (`dialog.duel`, styled in `assets/deck.css`), opened by the hub's "face-off" chip (`assets/fx.js`) and the command bar's "face-off". With fewer than eight games it runs a bracket of four or two. Nothing is kept or sent.

## Snap (save a picture of the game)

The camera button in the game bar (`#btn-snap`, added by `games/player.js`) saves a PNG of the game as it looks right now: the biggest canvas inside the game frame, scaled up in whole steps to at least 640px wide so pixel art stays crisp, with the game's title and "computercooked.com" along the bottom. The file is named `<slug>-<stamp>.png` and goes to the browser's downloads. On a touch phone (`pointer: coarse`) that can share pictures, the share sheet opens instead (save to photos, send to a friend); if sharing is refused or not possible it falls back to the download, and cancelling the sheet just closes it. If the screen is empty or can't be read, a toast says so instead. A short white flash (`.player.is-snapped` in `games/games.css`, off with reduced motion) marks the shot. Games need to do nothing: the picture is taken right after the game's next frame is drawn, so WebGL screens can be read too. Nothing is uploaded or stored.

## Wide mode

On screens 1000px and wider, every game page has a "wide" button next to the lamp (`#btn-wide`, added by `games/player.js`). It puts `wide-game` on `<html>`, and `games/games.css` gives the game the whole row: the side column drops below it and the screen grows taller. The choice is kept in localStorage `cc-wide` so it carries from game to game. Nothing is sent.

## Mini player

On a game page, scrolling down past the game shrinks the cabinet into the bottom right corner (`.player.is-mini`, styled in `games/games.css`), still running, so the scores and the rest of the page can be read with the game in view. `games/player.js` owns it: only the styles change, so the game never reloads, and a same-height stand-in (`.player-ghost`) holds the page still. Clicking the mini player scrolls back to the game; the x sends it away until the game is scrolled back into view. It is for screens 760px and wider, and never docks in fullscreen. Nothing is stored or sent.

## Daily spin

Once a day a reel runs through the games and lands on one: your game for today on this device. `assets/deck.js` owns it: `window.ccSpin.open()` shows the dialog (`dialog.spin`, styled in `assets/deck.css`), opened by the hub's "daily spin" chip (`assets/fx.js`) and the command bar's "daily spin". The result is kept for the day in localStorage `cc-spin` (`{d: "2026-11-10", slug}`, local date); opening it again that day shows the same game with a "play it" link (`?ref=spin`), and a new spin unlocks at local midnight. Games the device hasn't played (`cc-history`) are picked first. With reduced motion it lands at once. Nothing is sent.

## Play time

`games/player.js` adds up the seconds a run is actually going (between a game's start and end, or from the first input for a game without SDK hooks) while the tab is showing. Totals are kept per game on the device in localStorage `cc-time` (`{slug: seconds}`), written every 15 seconds and when the page is hidden or left. Once a game has a minute, its about card shows "you've played this for 12 min" (`p.play-time`), and a toast marks 10 minutes, 30 minutes and an hour. The command bar's "time played" (`assets/deck.js`) reads the same totals and names the most-played game. Nothing is sent.

## Triple feature (three games in a row)

The hub's "3 in a row" chip and the command bar's "triple feature" pick three random games and play them back to back. `assets/deck.js` owns it: `window.ccFeature.start(slugs)` picks three (from `slugs` when given, which is how the hub chip respects the current filter; from every game otherwise, and never the game you are on), keeps the line-up for this tab in sessionStorage `cc-feature` (a list of `{slug, title}`) and opens the first with `?ref=feature`. On a game page in the line-up, a strip above the game (`.feature-bar`, styled in `games/games.css`) shows "game 2 of 3" and a link to the next; on the last game it offers three more. The × ends it (`ccFeature.end()`). Closing the tab ends it too. Nothing is sent.

## Couch mode (arrow keys and controllers)

`assets/deck.js` lets people move between game cards like a console menu, on any page that has them (`a.game-link`, `a.cc-next-card`, `a.continue-card`, `a.weekly-card`, `a.spotlight`). Once a card has focus, the arrow keys hop to the nearest card in that direction; arrows do nothing special before that, so the page still scrolls. A controller works from anywhere: d-pad or left stick moves (hold to keep moving), A opens the focused game (or picks the first card on screen), B drops focus, or goes back a page when nothing is focused. It is polled only while a controller is connected and the tab is showing. Games own the keys and the controller while running (`window.ccGameActive`), open dialogs block it, and the surf page keeps its own arrows. `html.pad-nav` (ring in `assets/tokens.css`) marks the focused card and is cleared by any mouse or touch press. New kinds of game card should be added to `SEL` in that block. Nothing is sent.

## Lights off

Every game page has a lamp button next to fullscreen (`#btn-lights`, added by `games/player.js`). It puts `lights-off` on `<html>`, and `games/games.css` dims the page with a click-through veil (`.lights-veil`) and lifts `.player` above it, so links still work and the site nav stays lit. The button or Esc turns the lights back on. The choice is kept on the device in localStorage `cc-lights` (`"1"` = off) so it carries from game to game. It does nothing in fullscreen. Nothing is sent.

## Screen colour

The site's accent comes in four phosphors: green (default), amber, ice and pink (`html[data-tint]`, rules at the end of `assets/tokens.css`; everything that uses `--accent` or `--phosphor` follows). Pick it from the command bar ("screen colour", enter flips to the next), the homepage start menu, or a right-click on the homepage desktop. The choice is kept on the device in localStorage `cc-tint`, and a one-line script in each page's head applies it before the first paint (new pages should copy that line, just above the `tokens.css` link). `assets/deck.js` owns it: `window.ccTint()` steps to the next colour and returns its name, a `cc:tint` event on `document` does the same, and `cc:tinted` (detail: the name) fires after each change. Games themselves are not recoloured. Nothing is sent.

## Desktop sounds

The homepage taskbar has a speaker button (`#desk-snd`). Sounds are off until someone switches them on; the choice is kept on the device in localStorage `cc-sfx` (`"1"` = on). When on, `assets/home.js` plays short square-wave blips made with Web Audio (no sound files) for the start menu, the right-click menu, surprise me (a tick per step and a little win tune), wallpaper changes, refresh, poking the computer, shut down and the game window opening. Other blocks can ask for a sound with `document.dispatchEvent(new CustomEvent("cc:sfx", { detail: "pop" }))`. Sounds only follow a click or key press. Nothing is sent.

## Wallpapers and the desktop right-click menu

The homepage desktop has four wallpapers: the usual green one, sunset, deep sea and night hills (`html[data-wall]`, CSS only, in `assets/home.css`). "change wallpaper" in the start menu steps to the next one; the choice is kept on the device in localStorage `cc-wall` and an inline script in `index.html` applies it before the first paint. On a computer with a mouse, right-clicking empty desktop opens a small desktop menu (`div.desk-ctx`, `assets/home.js`): surprise me, find a game, channel surf, next wallpaper, screensaver, refresh. Links, buttons and the game window keep the browser's own menu, and shift + right-click always gives the browser's menu. Nothing is sent.

## Screensaver

After 60 seconds with no mouse, key, touch or scroll on the homepage, `assets/home.js` darkens the screen (`div.saver`) and bounces a game cover around it; the cover swaps to another game at every wall and links to that game with `?ref=saver`. It counts corner hits. A click anywhere else or any key goes back. The start menu's "screensaver" item starts it right away. It never starts while a dialog (the game window, the command bar) is open, while focus is in a frame, while the pointer rests on the hero reel, during the first-visit boot sequence or in a hidden tab; closing a window starts a fresh minute, and it does not exist under reduced motion (the menu item stays hidden). Covers come from `/games/games.json`. Nothing is sent or stored.

## Easter egg: the konami code

Typing up up down down left right left right b a on any page with `assets/deck.js` opens a fake blue crash screen ("your computer is cooked") with a link to channel surf and a button back. It is a modal `<dialog class="cooked">`, so esc closes it. Ignored while typing in a field and while a game is running. The command bar answers `konami` and `cheats` with a hint. It is left out of the `?` list on purpose.

## Keyboard shortcuts list

Pressing `?` on any page with the deck (or picking "keyboard shortcuts" in the command bar) opens a small dialog listing every key that works there. `assets/deck.js` builds it on first open from the deck's own `data-key` links, plus the channel surf keys on `/surf/`. It stays out of the way while a game is running (`window.ccGameActive`) and while typing in a field.

## Instant pages

`assets/deck.js` adds a Speculation Rules block on every page: resting on or pressing a same-site link prefetches that page (prefetch only, so no page script runs early and nothing is counted). `/api/*`, `/admin/*`, `/d/*`, download and new-tab links are left out; add `data-no-prefetch` to a link to opt it out. Skipped in embeds and under Save-Data. Browsers without the API navigate as before.

## 404 page picks

`404.html` shows three games "the computer found instead" (`assets/lost.js`, `assets/lost.css`): picked at random from `/games/games.json`, games this device hasn't played first (`cc-history`), cover plus the 3 second clip on hover, links tagged `?ref=404`, and a link to `/surf/`. Hidden without JavaScript; the plain links underneath stay.

## Channel surf (`/surf/`)

**Auto surf** (`#tv-auto`, or the `a` key): flips to the next channel every 5 seconds with a timer bar under the controls. Any manual flip restarts the timer; it pauses while the tab is hidden and is not offered under reduced motion.

- A static page with a little TV: one game per channel (games.json order, so a game keeps its number). The screen shows the cover, then the game's 3 second clip; title, pitch, tags and "your best" sit under it.
- Flip with the back / next buttons, the left and right arrow keys, a sideways swipe on the screen, or the channel guide strip. Enter or a tap on the screen plays the game (`?ref=surf`).
- Opens on `/surf/#<slug>` when the link has one, otherwise on a random game this device hasn't played. Played games get a tick in the guide (`cc-history`). Nothing is sent or stored.
- Reduced motion: no clip and no static burst, covers only. `assets/surf.js` + `assets/surf.css`; linked from the homepage mood heading and the command bar ("channel surf").

## The wall of epic gamers (`/champs/`)

- One crown per game: whoever holds the all time #1 score (same rule as the EPIC GAMER tag: highest score, a tie goes to whoever set it first). Built on the server by `src/champs.js` from `scores` (hidden rows never count) and kept 5 minutes per isolate.
- Each card: cover, game, the holder (linked to `/u/<username>` when they have an account), the score, the date they took it, this week's leader, and a "take the crown" link (`?ref=champs`). Newest crowns first; one taken in the last 48 hours gets a "new crown" badge.
- `assets/champs.js` shows the dates in the visitor's own time zone ("today", "yesterday", then "nov 9"; the server writes UTC) and, for games this device has played, adds "your best: 1,200. 2,358 to go." from `cc-history`. Nothing is sent or stored.
- "Most crowns" lists players holding more than one. Games with no scores are left off. No play counts are shown.
- With no database or no scores the static page (`champs/index.html`) shows its empty state. Linked from the homepage "happening now" heading and the command bar ("epic gamers").

## Hub: your collection

All in the browser, from `cc-history` (`assets/fx.js` `filters()`); a first visit sees the hub exactly as before.

- **Played sticker** (`.game-played`): games this device has played get "✓ best 1,840" (or "✓ played" with no score) over the cover. It is positioned over the art, so cards keep their size.
- **Count:** the heading reads "25 games · 3 played" when that fits on the same lines; on narrow screens it stays as it was so nothing moves.
- **"not played N" chip:** shows only the games not yet played. Hidden for first visits and once everything is played.
- **Random** picks a game not yet played while there is one in the current filter.
- **Filter links:** the chosen chip and search term live in the address (`/games/?vibe=quick&q=fish`), so a filtered hub can be linked, shared and reloaded. Written with `replaceState` (back still leaves the hub in one press); other parameters such as `ref` are kept. An unknown `vibe` is ignored. A filter link lands on the filtered games, not the hero. Game pages show the game's vibes as these links under the how-to ("more like this", `vibeLinks()` in `src/seo.js`). With a known `vibe`, the Worker (`hubPage()` in `src/hub.js`) sends the grid already filtered and names the vibe in the title and link preview; the canonical address stays `/games/`.
- **Sort chip** (`.chip-sort`): steps through featured, newest, a to z, (once something is played) your recent and (once a game has a minute of play time in `cc-time`) your most played. The cards are moved in the page, and the choice is kept on the device in `cc-hub-sort`.

## Game page: your runs

`games/platform.js` keeps the last 12 accepted scores per game on the device (`cc-history[slug].r`). From the second run on, the leaderboard card shows a bar for each (`.cc-runs`), newest on the right, the best one lit, with how far the last run was off the best. Bars are sized between the player's own lowest and highest score, so it also reads right where a lower score wins. Nothing is sent to the server.

## Tip jar (off by default)

A small "keep the games free: tip the computer ↗" link with "18+ / ask a parent" next to it. It shows in the hub footer and at the end of the play-next rail after a run, **only when `TIP_URL` is set**. It's set in `wrangler.jsonc` (`TIP_URL`, Chef's $3 pay-what-you-want Payment Link since Oct 23); empty means off.
- **To switch it on:** put the public Stripe Payment Link in `TIP_URL` and merge. Only `https://buy.stripe.com/<id>` is accepted; any other value (wrong host, http, extra path or query) is treated as off.
- `GET /api/tip` → `{ok, url}`, with `url: null` when it's off. It's cached 5 minutes, so the change shows within 5 minutes of the deploy.
- The link opens in a new tab with `rel="noopener noreferrer"` and no referrer. Clicks aren't logged, and nothing about payments touches our server.
- The privacy page has a "tips" line.

### The shared "Tip the chef" button (K-0059)

`assets/tip.js` is the one button for every other place: the homepage footer and the games' own game-over screens. It brings its own styles, so it works inside a `play/` page too.
- **Add it:** `<script src="/assets/tip.js" defer></script>`, then on the game-over screen `ccTip.mount(el, { game: "<slug>", slot: "game-over" })`. It appends the button to `el` once and resolves to it, or to `null` while tips are off (then nothing shows).
- **The link** is still only `TIP_URL`. The button adds `?ref=tipjar-<game>&client_reference_id=tipjar-<game>`; Stripe shows `client_reference_id` on each payment, so tips can be told apart by game.
- **Clicks** are `tip_click` with slot `game-over` or `home-footer` and the game's slug (admin metrics `clicks_by_slot`). Test-mode browsers aren't stored.
- **The note** ("keeps the games free · 18+ / ask a parent") takes the surrounding text colour. Where that doesn't read, set `--cc-tip-note: <colour>` on the panel.
- **Slots:** `game-over` for any game; Smol Brains uses `smol-death` and `smol-ending`. Any other slot is stored as `other`.
- **Never in the way:** it opens Stripe in a new tab, no popup, and taps or keys on it stop at the button, so they can't restart the game underneath. It hides itself in the native app builds.

## Share-your-run card

After any accepted run, the dare box on the game page offers **share card ▶** next to the plain link. `games/platform.js` loads `games/share-card.js` (only then) and draws a 1080x1920 PNG in the browser: the game's thumbnail, title, score ("new personal best" when it is one), the all-time rank chip, "can you beat me?" and `computercooked.com/games/<slug>`. Nothing is uploaded; the image is made on the device.

**Runs with no score** (games without a leaderboard, or a run that didn't count) get the same box as **"enjoying X? send it to a friend"**: share card ▶ (the card says "i just played this / your turn. / come play.", with no score or rank) and **share link**, which sends the plain game URL. There's no dare. Sends go to `POST /api/share` and show as `game_shares` in admin metrics.

- **Phones (Web Share with files):** the tap opens the share sheet with the image plus the dare text and link; it counts as `how: card`. The card and the dare link are made while the player looks at their score, so the tap shares straight away (iOS only allows sharing from the tap itself). If the browser still asks for a fresh tap, the box says "tap share card again".
- **Elsewhere (most desktops):** the card shows inline with **download card** (`how: download`) and **copy link** (`how: copy`).
- It works for every game in the shared player. A game with no thumbnail gets the card without art.

## Public endpoints

| method | path | what |
|---|---|---|
| GET | `/api/health` | `{ok, db}` |
| POST | `/api/events` | SDK batches: `{anon, tester, ref, name, events:[{t:"start"/"end"/"event", id, game, …}]}` |
| GET | `/api/leaderboard?game=&period=day/week/all[&friends=1]` | top 10, one row per player: `{rank, name, u, score, id, me}`, plus `you: {rank, score} | null`: your own rank and best on the same board when you are not in the rows (from the login, or `player=a:<anon>`). The game page shows it under a ⋯ row. Account rows use the current display name and carry `u` (username, for `/u/<u>` links); guest rows have no `u`. `friends=1` (login needed) is you plus your friends, up to 50 rows |
| POST | `/api/feedback` | `{game, version, rating: 1/-1/0, text, tester, anon, play_id}` |
| GET | `/api/stats` | play counts per game (total, this week, last week) for the hub |
| GET | `/api/community` | approved community uploads |
| POST | `/api/report` | `{kind: username/score/feedback/upload, target, reason}`; 3 reports hide a score |
| POST | `/api/auth/signup` | `{username, password, birth_month, birth_year, avatar, anon_id, ref_dare?}`; `ref_dare` is a dare id the browser opened in the last 30 days (game pages store it as `cc-ref-dare`), which notes a referral (see `referrals`); 13+ only, under-13 gets `{under13:true}` and nothing is stored |
| POST | `/api/auth/login` · `/api/auth/logout` | session cookie `cc_session` (httpOnly, Secure, SameSite=Lax, 30 days) |
| GET | `/api/me` · `/api/me/summary` | the logged-in user; recent games, bests, favorites, streak, `brought_in: {credited, pending}` (players who joined from your dares), and `saves: [{game, updated_at}]` (newest cloud save per game, for the hub's "jump back in") |
| POST | `/api/me/favorite` · `/api/me/avatar` | `{game, on}` · `{avatar}` |
| POST | `/api/me/delete` | `{password}`: hard-deletes the account, its sessions, saves, favorites, scores and uploads; plays and feedback stay without the link |
| GET · POST | `/api/me/profile` | GET: profile + private settings (email). POST any of `{display_name, bio, fav_game, badges:["game:ach_id"…≤3, unlocked only], theme, frame, public}`. Bios are 160 chars, word-filtered, no links |
| POST | `/api/me/avatar` | a preset (`lime`…) or a built face `x:<mood>-<face 0-7>-<body 0-4>-<accessory>` (moods tired/happy/flat/angry/x; accessories none/headphones/cap/witch/bow/glasses/steam, plus level-locked antenna/crown/halo/flames/chef) |
| POST | `/api/me/email` | `{email, news}`: stored unverified, `""` removes it. Nothing is emailed until verification exists |
| POST | `/api/me/password` | `{current, next}`: also ends every other session |
| POST | `/api/me/logout-all` | ends every session, this one included |
| GET | `/api/me/export` | JSON download of everything stored about the account (no password hash, no session tokens) |
| GET | `/api/u/:username` | public profile: name, avatar, level, title, theme, plus bio, badges, favorite game and best scores when public. Private: `{private:true}` with name, avatar and level only. 404 for unknown or banned. `relation` is the viewer's side: `null` logged out, `self`, `none`, `requested`, `incoming`, `friends`, `blocked` |
| POST | `/api/dare` | `{play_id, anon}` → `{id, url, text}`: a challenge-a-friend link for one of your own accepted runs, `/games/<slug>/?vs=<score>&from=<name>&d=<id>`. One dare per run, 30 per hour |
| GET | `/api/dare/:id[?open=1]` | `{game, title, score, from, beats}`. `open=1` counts a visit (the game page sends it once per tab) |
| POST | `/api/dare/:id/beat` | `{play_id, anon}` → `{beaten, first, from, score, sender_xp}`. Your run must be yours, on that game, accepted and higher. The first beat per player counts; a logged-in sender gets +25 XP per beat (10 per dare, 100 a day). The game page also sends `cc.event('challenge_open', {d})` on the first run from a dare link |
| POST | `/api/dare/:id/shared` | `{how: share/copy/card/download}` → `{ok}`. The game page sends it when the share sheet finishes (`share` for the link, `card` for the share card), the link is copied, or the card is downloaded; the first one per dare counts. `POST /api/dare` takes `source: best` when the dare comes from the new-personal-best prompt (made up front so the tap opens the share sheet at once) |
| POST | `/api/share` | `{game, how: share/copy/card/download, anon}` → `{ok}`. "Share this game" after a run with no accepted score (no dare to attach it to). Stores one `events` row `cc:share` `{how}` with no player id; smoke anon ids get `{ok, test: true}` and nothing stored. 400 for an unknown `how`, 404 for an unknown game. 30 per hour per IP |
| POST | `/api/follow` | `{platform: tiktok/youtube/instagram/x, slot: hub-card/hub-footer/post-run, game?, anon}` → `{ok}`. A follow button click (see "Follow loop"); one `cc:follow_click` event, no player id; smoke not stored |
| GET | `/api/featured` | game of the week for the hub hero: `{featured: {week, game, title, pitch, thumbnail, reason, basis: metrics/rotation}}`. Picked from the 4 weeks before this week (D1 return rate with 8+ new players, plus 0.25 × rating with 5+ ratings), never the weekly challenge's game. With thin data it rotates through the newest games. Cached 5 min |
| GET | `/api/challenge` | `{challenge: {week, game, title, thumbnail, goal, target, xp, ends_at, finishers, done?, best?} | null, events: [{id, label, name, desc, xp, until, got?}]}`. `done`/`best`/`got` only when logged in |
| GET | `/api/me/recap?week=last\|this` | your week in numbers for /me: `{recap: {week, which, from, to, complete, runs, minutes, games, days, xp, prev: {runs, xp}, level: {from, to, title}, top: {game, title, runs, minutes}, bests: [{game, title, score, prev}], bests_total, achievements: [{game, id, name}], achievements_total} \| null}`. `last` (default) is the last full Mon–Sun week (UTC), shown all of the following week; `this` is the week so far. `bests` are games where the week's best beat every earlier score (`prev: null` for a first score), beaten bests first. Computed from plays, xp_events, scores and achievements, nothing stored. `null` when there were no runs |
| GET | `/api/me/feed` | `{items: [{kind: game/achievement/challenge, game, title, text, ts}]}`, newest first, up to 30 |
| GET | `/api/me/friends` | `{friends, incoming, outgoing, blocked}`, each `[{username, name, avatar, level}]` |
| GET | `/api/me/friends/feed` | `{friends, items: [{kind: achievement/challenge/best/level/friend, game, title, text, ts, who: {username, name, avatar, level}}]}`: your friends from the last 14 days (badges, weekly challenge wins, new bests, level-ups, new friendships). Level-ups are worked out from xp_events (the running total crossing a level), one per friend per day at the highest level reached; "is now your friend" uses the later of the two friendship rows. Friends with a private profile are left out, and game moments (smol words etc.) never appear here |
| POST | `/api/me/friends` | `{action: add/accept/decline/cancel/remove/block/unblock, username}` → `{status: requested/friends/none/blocked}`. Adding someone who already asked you accepts. 200 friends max, 20 waiting requests, 30 adds/hour. Blocking removes the friendship, and the blocked player gets "no such player" if they try to add you (a block is never revealed) |
| GET | `/games/:slug/` | every game page runs through `src/seo.js`, which adds VideoGame + BreadcrumbList JSON-LD to `<head>`, fills the `[data-how-to]` card ("how to play X": pitch, controls split into steps, optional `how_to` tips from games.json/entry.json, size and daily facts) and server-renders "games like X" into `[data-more-games]` (3 games by shared vibe, then shared tag, then newest; same vibes as the hub chips in fx.js). Everything comes from games.json |
| GET | `/games/:slug/embed/` | the embed player (`src/embed.js`): the game's `/play/` iframe plus a slim bar (title linking to the game page, restart, sound, fullscreen, "more free games"). Any site may frame it (`frame-ancestors *`, no X-Frame-Options); `noindex`, canonical = the game page. Plays from it carry ref `embed`. 404 for unknown and community games. CRASH embeds its standalone build in `games/crash/play/` (its own page still runs the inline copy). Game pages show an "embed this game" card with the snippet: an iframe to this URL plus a "Play X free on Computer Cooked Games" credit link |
| GET | `/games/:slug/?vs=&from=[&d=]` | the game page with link-preview tags for a dare: `<title>`, og/twitter title "can you beat 1,240 on CRASH? from datz", a dare description, and `og-vs.png`. With a valid `d` the score and name come from the dare, not the URL. Plain game pages carry `og.png`. Both cards are 1200x630, made by `scripts/make-og.mjs` (see its header; `add-game.ps1` runs it) |
| GET | `/u/:username` | the public profile page (the Worker serves `/u/index.html` for it) |
| GET | `/api/saves/:game` | the logged-in player's slots `[{slot, updated_at, bytes, version}]` |
| GET · PUT · DELETE | `/api/saves/:game/:slot` | PUT `{data, updated_at, version}`. Errors: 413 over 512 KB, 409 at 5 slots, 429 over ~1 write/10 s. An older `updated_at` returns `{stale:true}` and changes nothing. Needs login (401) |

POSTs from other sites are refused, and logins, sign-ups, events and feedback are rate-limited. Nothing stores IP addresses.

## Admin endpoints (Bearer token)

| method | path | what |
|---|---|---|
| GET | `/api/admin/metrics?since=` | above |
| GET | `/api/admin/digest?days=7` | daily digest by Pacific day (see "Daily digest") |
| GET | `/api/admin/reports` | open reports |
| GET | `/api/admin/featured?date=` | game-of-the-week preview for that date's week (default: next week). Stores nothing |
| GET | `/api/admin/challenge?date=` | the weekly challenge for that date's week (default: next week): hand pick, stored auto pick, or a preview of the auto pick. Stores nothing |
| POST | `/api/admin/moderate` | `{action: hide-score / show-score / ban-user / restore-user / resolve-report, id}` |
| GET / POST | `/api/admin/uploads` | community upload queue; `{id, action: approve/reject, note}` |

## Database (D1, SQLite)

The schema is in `migrations/0001_init.sql`:

| table | holds |
|---|---|
| `users` | username, PBKDF2 hash + salt, avatar, status |
| `sessions` | SHA-256 of the cookie token |
| `plays` | game, version, anon/user, tester, start/end, duration, score, completed, referrer bucket, device, day |
| `events` | custom SDK events |
| `scores` | leaderboard entries |
| `feedback` | thumbs, text, tester, version |
| `favorites` | a user's favorite games |
| `reports` | player reports |
| `uploads` | community upload queue |
| `dares`, `dare_beats` | challenge-a-friend links, with opens and beats (migration `0008_dares`) |
| `dare_funnel` | per dare: source (`best`/`button`) and whether/how it was sent (migration `0009_dare_funnel`; removed with the sender's account) |
| `referrals` | an account opened from a dare link: `new_user`, `sender` (the dare's account), `dare_id`, `credited_at`. The sender gets +50 XP (`xp_events` kind `referral`, ref `u:<new id>`) when the new player's first XP-earning run lands; 5 a day, extra ones wait for the next run. Only dares made by an account, never your own. Removed when either account is deleted (migration `0010_referrals`) |
| `friends` | one row per direction: `(user_id, friend_id, status pending/accepted/blocked)` (migration `0005_friends`) |

To query it directly, run this with Ashton's Cloudflare login:

```
npx wrangler d1 execute computercooked --remote --command "SELECT …"
```


## Site measurement: page views, tips, campaigns

No cookies, no third-party analytics, no player id stored on these rows.
- **Channel and campaign:** the first page of a visit stores the channel in `sessionStorage` `cc-ref` (a `?ref=` / `utm_source` tag, else the outside referrer) and a valid `utm_campaign` (lowercase `[a-z0-9_.-]`, max 40) in `cc-campaign` (`assets/deck.js`; `games/cc-sdk.js` does the same inside game frames). Tags come off the URL once read. Plays carry the channel in `plays.referrer` and the campaign in `play_tags` (`migrations/0012_measurement.sql`).
- **`POST /api/hit {kind, path, game?, slot?, ref, campaign, anon}`** → `{ok}`. `kind` is `pageview` (one per page load with the control deck), `tip_click` (`slot` = `hub-top` | `hub-footer` | `post-run`) or `tip_success`. Stored as one `events` row `cc:<kind>` `{path, ref, campaign, slot}`. Smoke anon ids get `{ok, test: true}` and nothing is stored. 400 for an unknown kind or a bad path; 120 per minute per IP.
- **Tip success:** set the Stripe Payment Link's after-payment redirect to `https://computercooked.com/games/?tip=thanks`. A page opened with `?tip=thanks` sends one `tip_success` per visit, removes the param, and the hub shows a thank-you line instead of the tip link.
- **Reading it:** `GET /api/admin/metrics?since=YYYY-MM-DD` (admin token) → `pageviews`, `tips`, `plays_by_ref`, `campaigns`, alongside the existing game numbers.
- **Team test visits:** open any page with `?cctest=1` to put that browser in test mode. It gets a `smoke-team-…` anonymous id, so its page views, tips, plays, feedback and scores are left out of every count like other smoke traffic, and a small "test mode: not counted" badge shows. `?cctest=0` turns it off. Signed-in plays still count (the filter is on anonymous ids).
- **Flagging earlier test visits:** `POST /api/admin/test-traffic` (admin token). `{from, to}` (ms, up to 6h apart) lists the page-view/tip rows and plays in that window. `{flag: {events: [id], plays: [id]}}` renames those hit rows `test:cc:<kind>` and gives those plays a `smoke-flag-` anon id; `{unflag: …}` undoes it. Nothing is deleted. Flagged hit rows show in metrics `test_traffic.site_hits`.
