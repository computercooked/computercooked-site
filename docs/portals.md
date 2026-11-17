# Web game portals: what each one needs (K-0013 item 3)

Checked against the portals' own docs on 2026-10-28, and again on 2026-11-17 (round 23). Anything we couldn't confirm
from an official page is marked *(unconfirmed)*. **Nothing has been signed up for or submitted.** Every account,
contract, tax form and upload below is Ashton's decision and Ashton's to do.

**The Nov 17 research and plan** (more portals, our 26 games matched, the first candidates, what Ashton has to do) is in
`Website\Ideas\distribution-research-2026-11-17.md` in the project folder. Corrections from it are made below and marked
*(Nov 17)*.

## At a glance

| portal | how you get in | required SDK | exclusivity | money | first step for us |
|---|---|---|---|---|---|
| **itch.io** | self-serve, instant | none | none, keep our site + branding | sales/donations only (we pick itch's cut, default 10%) | zip upload, no code changes |
| **CrazyGames** | self-serve upload + QA; "basic launch" (no SDK, no ads) → full launch by their selection | SDK v3 for full launch (gameplayStart/Stop, ads via SDK only) | non-exclusive by default (terms §3.1); optional +50% pay for 2 months' browser exclusivity *(Nov 17)* | ad rev share (% not published), €100 minimum, Tipalti | basic launch needs no SDK |
| **GameDistribution** | self-serve + review (first review up to a week *(Nov 17)*) | GD SDK: pre-roll + mid-rolls **mandatory**, pause/resume events | non-exclusive, must match our latest version | **33% of net revenue is our share** *(Nov 17)*, €100 minimum | SDK + ad breaks; no links, logins or trackers |
| **Poki** | curated: apply with a build or video + 3 screenshots | Poki SDK v2: loading, gameplay, commercialBreak, rewardedBreak | **5-year web exclusive by default** (incl. Discord, YouTube Playables; app stores/Steam unaffected); non-exclusive = one-time fee | 100% of traffic we bring, 50/50 on theirs (indicative) | a business decision first |
| **Newgrounds** | self-serve, users vote it up or blam it | none (optional medals/scoreboards API) | none | **no revenue share** (legacy, inactive) *(Nov 17)* | **skip: bans games "generated via an AI prompt"** *(Nov 17)* |
| Y8 / Kongregate / Playgama | Y8 self-serve (50%); Kongregate reopened in 2026 (70% for now); Playgama self-serve aggregator (70-90%) | their own SDKs | see the Nov 17 research | | Playgama after CrazyGames *(Nov 17)* |

## Per-portal checklists

### itch.io
- **Build:** a zip with `index.html` at the root.
  - up to 1,000 files and 500 MB extracted
  - relative paths, case-sensitive names
  - HTTPS for any request to another domain
- **Page:**
  - cover at 315:250 (630×500 recommended)
  - 3–5 screenshots
  - genre plus up to 10 tags
  - embed size set; "mobile friendly" ticked
- **Rules:** our ads, analytics, branding and links back to computercooked.com are all allowed, and the game stays on our site.
  - **AI-made work must be tagged** on the project's edit page (it then shows under "AI Assisted"). Mass-produced pages are dropped from browse, so upload a few at a time *(Nov 17)*.
- **Our build (K-0030 step 7):** progress stays on the player's device. After the 1st run and every 5th, a small closable card links to the game on computercooked.com (`?ref=portal&utm_campaign=portal-itch`) for xp, levels and boards. Newgrounds builds do the same (`portal-newgrounds`). Ad portals never show it.
- **Money:** only from sales or donations.
  - payouts from $5 by PayPal or Payoneer
  - a **tax interview** is required (Ashton)

### CrazyGames
- **Basic launch:** no SDK, no ads.
  - A limited audience plays it for 7–21 days, with at least 500 plays.
  - Good numbers bring an invite to full launch, which is where money starts.
- **Full launch:**
  - SDK v3 (`SDK.init()`), gameplayStart/Stop, and midroll/rewarded only through their SDK
  - Data module if the game saves progress
  - **no other ads**
  - **no cross-promotion** of other games or platforms; **app-store links never**; community links only on the main menu, store links only for desktop games *(Nov 17: limited, not banned outright)*
- **Technical:**
  - ≤250 MB, ≤1,500 files, relative paths
  - initial download ≤20 MB to be eligible for the mobile homepage
  - Chrome/Edge, a 4 GB RAM device
  - **no custom fullscreen button**
  - safe areas respected; iOS audio resumes on a tap
  - English; PEGI 12 content
- **Assets:**
  - covers 1920×1080, 800×1200 and 800×800, title text only
  - a silent 15–20 s preview video in 1080p 16:9 and 2:3
- **Sitelock:** the SDK locks to their domains. An iframe-hosted build needs `frame-ancestors *.crazygames.com`.
- **Money:** €100 minimum, monthly, through Tipalti (tax forms and address: Ashton).
- **Basic launch benchmarks** *(Nov 17)*: 10+ min average playtime, 10–15% day-1 return, 80%+ conversion. From Nov 23 2026, click-through rate counts too, so the cover matters.

### GameDistribution
- **SDK:** `GD_OPTIONS` + gameId.
  - `showAd()` from a tap or click handler
  - pre-roll and mid-rolls
  - `SDK_GAME_PAUSE` / `SDK_GAME_START` must mute and resume
  - rewarded is optional
  - approval comes once a pre-roll plays in their iframe
- **Rules** *(Nov 17, from their 2025 licence agreement and guidelines)*:
  - **no outgoing links** (social, store, share, affiliate), branding not clickable
  - **no logins, no third-party ads, analytics or trackers**; our builds are guest-only already (see "Built")
  - ads only on a player's input, outside gameplay; a pause screen that waits for input after each ad
  - the game is hosted on their platform
  - their version must match our latest one
- **Assets:** 512×512, 512×384 and 200×120 thumbnails, mandatory (1280×550 and 1280×720 optional). Description length *(unconfirmed)*.
- **Money:** **we get 33%** of net revenue (licence §3.1), €100 minimum, paid within 60 days of the monthly report. VAT status must be declared (Ashton).

### Poki
- **Apply:** a form with a playable build or video, 3 screenshots, team info, and whether the game is out elsewhere.
- **Steps:** contract → QA → soft release (2–3 weeks) → global release.
- **SDK v2:**
  - `init`, `gameLoadingFinished`, `gameplayStart`/`Stop`, `commercialBreak` before each `gameplayStart`, `rewardedBreak`
  - mute and block input during breaks; must still work with an ad blocker
  - links only through `openExternalLink`
  - external requests blocked by default (analytics case by case; never Google Analytics)
- **Technical:**
  - 16:9 scaling to 640×360 / 836×470 / 1031×580
  - mobile and tablet, full screen
  - fonts and libraries bundled
  - loads in under ~10 s
- **Assets:** a square thumbnail ≥628×628 with no text. A hover video is needed before global release.
- **Exclusivity:** a 5-year web exclusive by default (all web portals, Discord, YouTube Playables). Keeping it on our own site probably conflicts *(unconfirmed)*. The non-exclusive deal pays a one-time fee.
- **AI** *(Nov 17)*: allowed but strict: no raw AI output "dropped in as-is", and we must be able to show which tools and prompts were used.

### Newgrounds *(read in a browser on Nov 17)*
- **Skip:** the game guidelines ask creators not to share games "generated via an AI prompt", AI thumbnails are banned, and there is no active revenue share.
- **Upload:** a zip with `index.html` at the root; it goes live into user voting at once. Two uploads a day.
- **Optional API:** Newgrounds.io for medals, scoreboards and cloud saves.

## Built (2026-10-28)

- `native/portal.js`: the adapter. Our SDK's run start/end become the portal's gameplayStart/Stop. A midroll goes between runs (never before the first run, at most every 3 runs and 3 minutes). Web Audio is suspended and input is blocked while an ad shows. Outside links are off on the ad portals. `cc.rewarded()` is available for games that offer a reward. Drivers: none (itch.io, Newgrounds), CrazyGames v3, GameDistribution and Poki v2. Tested against a stand-in Poki SDK.
- `node scripts/package-portal.mjs <slug> <itch|newgrounds|crazygames|gamedistribution|poki> [--gd-id id]` writes `dist/portals/<portal>/<slug>.zip` with `index.html` at the root and relative paths only. GameDistribution needs its game id from their control panel, so that build waits for the account.
- `node scripts/portal-assets.mjs <slug> [base]` makes the asset kit from the running game into `dist/portal-assets/<slug>/`: covers 1920×1080, 1280×720, 1280×550, 800×1200, 800×800 and 630×500, GD 512×512, 512×384 and 200×120 (the game's og art over blurred gameplay), a 628×628 gameplay square with no title, a 1280×720 gameplay still and a silent 15 s H.264 hover clip. Games with `?autoplay=skilled` (handbag havoc) play themselves for the clip. Made and checked for handbag havoc. The portrait 800×1200 cover is weak (the og art is landscape), so a hand-made portrait is worth it for the first submission. The square shows the in-game HUD.
- Still to do: a 2:3 clip, and a CrazyGames check that no game draws its own fullscreen button (only crash does, Nov 17).

## Clean portal builds (round 24, 2026-11-17)

- **No tip jar:** `package-portal.mjs` drops `/assets/tip.js` from every portal build (it's a payment link, and the path only exists on our site). Every game already checks `window.ccTip` before using it.
- **Shares carry no link on ad portals** (CrazyGames, GameDistribution, Poki): each game writes its own share text, so `portal.js` cleans it where it leaves. `navigator.share` loses its `url`, and links are taken out of the title and text. `navigator.clipboard.writeText` and `document.execCommand("copy")` lose links from the copied text. The share itself still works ("my village survived 12 days"). itch.io and Newgrounds shares keep their link. `ccPortal.scrub(text)` is the cleaner.
- **Guest-only:** with `window.CC_PORTAL` set, cc-sdk never calls our API. No login, cloud saves, boards or event posts; bests and saves stay on the device.
- **Other site files** that a game's `index.html` loads from `/assets/` are copied into `cc-assets/` and pointed at relatively.
- **Leftover check:** after each build, every html/js/css/json file is scanned for paths that only exist on computercooked.com (`/api/`, `/games/`, `/assets/`…), and the packager lists them. On Nov 17 the 5 candidates (smol brains, keyboard escape, bellchain, pixel purge, overdue notice) had none. thin-ice (`/assets/mascot-happy.svg`) and cooked-sweeper (`/games/games.json`) have some in game code, which cc-games would fix before either goes to a portal.
- **Zip on Linux:** uses `zip` (GNU tar's `-a` would write a plain tar named .zip). Windows still uses its own tar.exe.
- **CI:** the smoke test builds keyboard escape for crazygames and itch and checks each zip and folder. It also runs `portal.js` in a vm with a stand-in share and clipboard.

## What we build once (code, no accounts)

1. **`portal.js` adapter:** one interface (init, loading done, gameplay start/stop, midroll, rewarded, save, open link) with drivers for none (our site / itch / Newgrounds), CrazyGames, GameDistribution and Poki. It bridges to our existing `cc` SDK, which already marks run start and end in every game.
2. **Ad-break safety in each game:** pause, mute and block input on a break, then resume. Midrolls only at game over or level end. This is the same moment `assets/ads.js` already uses on our site.
3. **`scripts/package-portal.mjs <slug> <portal>`:** like `package-game.mjs`.
   - copies the play folder and inlines the SDK + adapter
   - strips our analytics, tip links and "play next" links for portals that ban them
   - removes custom fullscreen buttons for CrazyGames
   - zips with `index.html` at the root
4. **An asset kit per game:**
   - covers 1920×1080, 800×1200, 800×800, 630×500
   - square 628×628 with no text
   - GD 512×512, 512×384, 200×120
   - a silent 15–20 s clip in 16:9 and 2:3
   - 3–5 screenshots
   - Most of these can be made from `scripts/render-images.mjs` + `make-og.mjs`; the clips need a capture pass.
5. **Privacy policy:** already live at /privacy/; link it in-game where a portal asks.

## Suggested order (for Ashton to approve)

**Superseded on Nov 17** by `Website\Ideas\distribution-research-2026-11-17.md`:
1. **itch.io first** with 5 games (smol brains, keyboard escape, bellchain, pixel purge, overdue notice), AI tagged.
2. **CrazyGames basic launch** with smol brains and keyboard escape; no SDK until a full launch.
3. **One aggregator after that: Playgama** (70-90%, reaches YouTube Playables, MSN and more), rather than GameDistribution (33%, no logins or links).
4. **Poki: hold. Newgrounds: skip** (AI-prompted games banned). **Never level-devil-exe** on any portal (its name points at Poki's "Level Devil").

## Waiting on Ashton (STOP)
- [ ] Yes or no to the order above, and which games go first.
- [ ] itch.io account (and its tax interview before any payout).
- [ ] CrazyGames developer account, plus Tipalti tax forms later.
- [ ] GameDistribution account (VAT status) when we get there.
- [ ] Poki: whether to offer any game exclusively, and which one.
