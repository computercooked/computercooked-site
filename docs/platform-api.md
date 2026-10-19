# Computer Cooked Games platform API

For the Hermes ccgames bot, the weekly build automation and anyone adding games. Base URL: `https://computercooked.com`. The code lives in `src/` (the Worker) and `games/cc-sdk.js` (the client) in the `computercooked/computercooked-site` repo.

The status check is `GET /api/health`, which returns `{ok, db}`. While `db` is false, the database isn't connected yet. The site then hides accounts, leaderboards and feedback, and games still play normally.

## Reading metrics (automation)

```
GET /api/admin/metrics?since=YYYY-MM-DD
Authorization: Bearer <token>
```

The token is in `C:\Bush Growth\ventures\computer-cooked-games\operations\.metrics-token` (the last line of the file). It's a secret: never commit, paste or log it. If you leave out `since`, it defaults to the last 7 days. The same data is shown as a table at `https://computercooked.com/admin/` (paste the token there).

Response:

```json
{
  "ok": true, "since": "2026-10-12", "generated_at": "…",
  "totals": { "plays": 0, "accounts": 0, "new_accounts": 0, "uploads_pending": 0, "open_reports": 0 },
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
    "top_referrers": [{ "referrer": "tiktok", "plays": 0 }],   // tiktok | youtube | instagram | x | threads | bluesky | search | internal | direct | other
    "testers": [{ "tester": "sam", "plays": 0 }],
    "devices": { "mobile": 0, "desktop": 0, "tablet": 0 }
  }]
}
```

Notes:
- `unique_players` counts accounts and anonymous ids. One person on two devices counts twice unless they're logged in.
- Days are UTC.
- Playtest traffic carries a `tester` tag. Filter on it when you want public numbers only.

## Playtest links

Add `?tester=<name>` to any game URL, e.g. `https://computercooked.com/games/crash/?tester=sam`. Everything that person plays and every bit of feedback they send in that browser tab is tagged with that name. It shows up under `testers` and `latest_feedback[].tester`.

## Game SDK (for game builders)

Every game page has `/games/cc-sdk.js`. `scripts/add-game.ps1` injects it into ported games, so don't include it yourself. Call it defensively:

```js
window.cc && cc.start();                                   // a run begins
window.cc && cc.score(n);                                   // live score (optional)
window.cc && cc.end({ score, durationMs, completed: true }); // run over -> Promise<{accepted, best, rank, name} | null>
window.cc && cc.event("boss_beaten", { level: 3 });          // optional, at most 20 per play
```

- Score is a number where higher is better.
- For a leaderboard, add `"max_score_per_sec"` to the game's `entry.json`. It's the most score a perfect player can earn per second. The server rejects anything above `max_score_per_sec × seconds + score_slack` (default slack 50). You can also set `"max_score"` for an absolute cap.
- With no `max_score_per_sec`, the game gets no leaderboard; plays and feedback still work.
- Games without hooks still get basic plays (time played, no score) logged by the player page.
- The player page also sends `{type:"cc-mute", muted}`, `{type:"cc-restart"}` and `{type:"cc-pause"}` messages to the game iframe.

## Public endpoints

| method | path | what |
|---|---|---|
| GET | `/api/health` | `{ok, db}` |
| POST | `/api/events` | SDK batches: `{anon, tester, ref, name, events:[{t:"start"/"end"/"event", id, game, …}]}` |
| GET | `/api/leaderboard?game=&period=day/week/all` | top 10, one row per player |
| POST | `/api/feedback` | `{game, version, rating: 1/-1/0, text, tester, anon, play_id}` |
| GET | `/api/stats` | play counts per game (total, this week, last week) for the hub |
| GET | `/api/community` | approved community uploads |
| POST | `/api/report` | `{kind: username/score/feedback/upload, target, reason}`; 3 reports hide a score |
| POST | `/api/auth/signup` | `{username, password, birth_month, birth_year, avatar, anon_id}`; 13+ only, under-13 gets `{under13:true}` and nothing is stored |
| POST | `/api/auth/login` · `/api/auth/logout` | session cookie `cc_session` (httpOnly, Secure, SameSite=Lax, 30 days) |
| GET | `/api/me` · `/api/me/summary` | the logged-in user; recent games, bests, favorites, streak |
| POST | `/api/me/favorite` · `/api/me/avatar` | `{game, on}` · `{avatar}` |

POSTs from other sites are refused, and logins, sign-ups, events and feedback are rate-limited. Nothing stores IP addresses.

## Admin endpoints (Bearer token)

| method | path | what |
|---|---|---|
| GET | `/api/admin/metrics?since=` | above |
| GET | `/api/admin/reports` | open reports |
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

To query it directly, run this with Ashton's Cloudflare login:

```
npx wrangler d1 execute computercooked --remote --command "SELECT …"
```
