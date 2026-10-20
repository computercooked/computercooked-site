# Computer Cooked Games platform API

For the Hermes ccgames bot, the weekly build automation and anyone adding games. Base URL: `https://computercooked.com`. The code lives in `src/` (the Worker) and `games/cc-sdk.js` (the client) in the `computercooked/computercooked-site` repo.

The status check is `GET /api/health`, which returns `{ok, db}`. While `db` is false, the database isn't connected yet. The site then hides accounts, leaderboards and feedback, and games still play normally.

## Reading metrics (automation)

```
GET /api/admin/metrics?since=YYYY-MM-DD
Authorization: Bearer <token>
```

The token is in `C:\Bush Growth\ventures\computer-cooked-games\operations\.metrics-token` (the last line of the file). It's a secret: never commit, paste or log it. If you leave out `since`, it defaults to the last 7 days. The same data is shown as a table at `https://computercooked.com/admin/` (paste the token there).

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
  "next": { "runs_ended": 0, "plays": 0, "ended": 0, "per_run": null, "by_slot": { "challenge": 0, "similar": 0, "new": 0 } },
  "games": [{
    "game": "crash", "title": "CRASH",
    "plays": 0, "unique_players": 0,
    "avg_session_seconds": 41.2,
    "completion_rate": 0.93,          // share of finished plays that ended normally (not quit)
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

## Tip jar (off by default)

A small "keep the games free: tip the computer ↗" link with "18+ / ask a parent" next to it. It shows in the hub footer and at the end of the play-next rail after a run, **only when `TIP_URL` is set**. It's off in the repo: `"vars": { "TIP_URL": "" }` in `wrangler.jsonc`.
- **To switch it on:** put the public Stripe Payment Link in `TIP_URL` and merge. Only `https://buy.stripe.com/<id>` is accepted; any other value (wrong host, http, extra path or query) is treated as off.
- `GET /api/tip` → `{ok, url}`, with `url: null` when it's off. It's cached 5 minutes, so the change shows within 5 minutes of the deploy.
- The link opens in a new tab with `rel="noopener noreferrer"` and no referrer. Clicks aren't logged, and nothing about payments touches our server.
- The privacy page has a "tips" line.

## Share-your-run card

After any accepted run, the dare box on the game page offers **share card ▶** next to the plain link. `games/platform.js` loads `games/share-card.js` (only then) and draws a 1080x1920 PNG in the browser: the game's thumbnail, title, score ("new personal best" when it is one), the all-time rank chip, "can you beat me?" and `computercooked.com/games/<slug>`. Nothing is uploaded; the image is made on the device.

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
