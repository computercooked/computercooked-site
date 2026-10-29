# Web game portals: what each one needs (K-0013 item 3)

Checked against the portals' own docs on 2026-10-28. Anything we couldn't confirm from an official page is marked
*(unconfirmed)*. **Nothing has been signed up for or submitted.** Every account, contract, tax form and upload below
is Ashton's decision and Ashton's to do.

## At a glance

| portal | how you get in | required SDK | exclusivity | money | first step for us |
|---|---|---|---|---|---|
| **itch.io** | self-serve, instant | none | none, keep our site + branding | sales/donations only (we pick itch's cut, default 10%) | zip upload, no code changes |
| **CrazyGames** | self-serve upload + QA; "basic launch" (no SDK, no ads) → invited "full launch" | SDK v3 for full launch (gameplayStart/Stop, ads via SDK only) | not required by current docs *(unconfirmed)* | ad rev share (% not published), €100 minimum, Tipalti | basic launch needs no SDK |
| **GameDistribution** | self-serve + review (up to 2 weeks) | GD SDK: pre-roll + mid-rolls, pause/resume events | non-exclusive, must match our latest version | 33% of net ad revenue, €100 minimum | SDK + ad breaks |
| **Poki** | curated: apply with a build or video + 3 screenshots | Poki SDK v2: loading, gameplay, commercialBreak, rewardedBreak | **5-year web exclusive by default** (app stores/Steam unaffected); non-exclusive = one-time fee | 100% of traffic we bring, 50/50 on theirs (indicative) | a business decision first |
| **Newgrounds** | self-serve, users vote it up or blam it | none (optional medals/scoreboards API) | none known *(unconfirmed)* | unclear today *(unconfirmed)* | zip upload |
| Y8 / Armor / Kongregate | Y8 self-serve with its own SDK; Armor curated; Kongregate likely closed | | *(all unconfirmed)* | | skip for now |

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
  - **no links to other sites or app stores** (privacy, terms and community links allowed)
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

### GameDistribution
- **SDK:** `GD_OPTIONS` + gameId.
  - `showAd()` from a tap or click handler
  - pre-roll and mid-rolls
  - `SDK_GAME_PAUSE` / `SDK_GAME_START` must mute and resume
  - rewarded is optional
  - approval comes once a pre-roll plays in their iframe
- **Rules:**
  - outside links need their consent (reportedly banned) *(unconfirmed)*
  - the game is hosted on their platform
  - their version must match our latest one
- **Assets:** 512×512, 512×384 and 200×120 thumbnails, mandatory (1280×550 and 1280×720 optional). Description length *(unconfirmed)*.
- **Money:** 33% of net revenue, €100 minimum, paid 60 days after the month. VAT status must be declared (Ashton).

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

### Newgrounds *(all unconfirmed: their pages blocked automated reading)*
- **Upload:** a zip with `index.html` at the root; it goes live into user voting at once.
- **Optional API:** Newgrounds.io for medals, scoreboards and cloud saves.

## Built (2026-10-28)

- `native/portal.js`: the adapter. Our SDK's run start/end become the portal's gameplayStart/Stop. A midroll goes between runs (never before the first run, at most every 3 runs and 3 minutes). Web Audio is suspended and input is blocked while an ad shows. Outside links are off on the ad portals. `cc.rewarded()` is available for games that offer a reward. Drivers: none (itch.io, Newgrounds), CrazyGames v3, GameDistribution and Poki v2. Tested against a stand-in Poki SDK.
- `node scripts/package-portal.mjs <slug> <itch|newgrounds|crazygames|gamedistribution|poki> [--gd-id id]` writes `dist/portals/<portal>/<slug>.zip` with `index.html` at the root and relative paths only. GameDistribution needs its game id from their control panel, so that build waits for the account.
- `node scripts/portal-assets.mjs <slug> [base]` makes the asset kit from the running game into `dist/portal-assets/<slug>/`: covers 1920×1080, 1280×720, 1280×550, 800×1200, 800×800 and 630×500, GD 512×512, 512×384 and 200×120 (the game's og art over blurred gameplay), a 628×628 gameplay square with no title, a 1280×720 gameplay still and a silent 15 s H.264 hover clip. Games with `?autoplay=skilled` (handbag havoc) play themselves for the clip. Made and checked for handbag havoc. The portrait 800×1200 cover is weak (the og art is landscape), so a hand-made portrait is worth it for the first submission. The square shows the in-game HUD.
- Still to do: a 2:3 clip, and a CrazyGames check that no game draws its own fullscreen button.

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

1. **itch.io first:** no SDK, no exclusivity, our branding and links stay, and it's live in minutes. Put up the 4 viral hits plus reel weird as a "computer cooked" collection, and learn which ones get organic plays.
2. **CrazyGames basic launch:** no SDK needed to start. Their test audience gives us retention numbers, a second opinion next to our winners board. Build the adapter while they test, and only add their SDK if they invite a game to full launch.
3. **GameDistribution:** once the adapter exists. It's non-exclusive, so it can carry the long tail.
4. **Poki: hold.** Their exclusive deal is worth considering only for a proven winner, and would mean pulling that game from the other portals and maybe our site. Decide per game after the winners board shows one.

## Waiting on Ashton (STOP)
- [ ] Yes or no to the order above, and which games go first.
- [ ] itch.io account (and its tax interview before any payout).
- [ ] CrazyGames developer account, plus Tipalti tax forms later.
- [ ] GameDistribution account (VAT status) when we get there.
- [ ] Poki: whether to offer any game exclusively, and which one.
