# Packaging a winner for Google Play and the App Store

The site is the test lab. When a game scores "winner: package it" on /admin (src/winners.js), this is how it becomes an
app. Facts checked against official docs on 2026-10-28; things we couldn't confirm are marked *(unconfirmed)*.

**Who does what:** the repo side (steps 1–3) is code and can be done any time. Store accounts, fees, ID checks,
signing keys and submissions are Ashton's (steps 4–6), and nothing here creates an account or spends money.

## 1. Why the games are already packaging-ready

- Every game's `games/<slug>/play/` folder is self-contained: its own `index.html`, JS and art. The only outside file
  is `/games/cc-sdk.js`, and the only site links are "play next" links (reel weird).
- No CDN scripts or remote fonts, so the app works offline, which Apple's 2.5.2 rule needs (no downloaded code).
- `native/cc-native.js` is the phone bridge. It is put in front of the SDK in app builds only:
  - pauses every Web Audio context when the app goes to the background (reviewers check this)
  - opens website links in the phone's browser instead of a dead page
  - `ccNative.haptic()`, `ccNative.ads.interstitial()` / `.rewarded()` (AdMob), and `ccNative.iap.buy()` (stub)
  - `ccNative.isNative` / `.platform`, so a game can hide web-only bits (the "play next" links, for example)
- Inside the app the SDK's calls to `/api/...` fail quietly (no site there), so the game runs the same with no
  scores sent. Wiring scores back to computercooked.com would need CORS on the Worker; leave it until an app proves itself.

## 2. Make the project

```bash
node scripts/package-game.mjs one-percent-popup
```

This writes `dist/apps/<slug>/` (git-ignored, never deployed):

| path | what |
|---|---|
| `www/` | the game, with `cc-native.js` and `cc-sdk.js` next to it |
| `capacitor.config.json` | appId `com.computercooked.<slug>`, the game's title, dark splash |
| `package.json` | Capacitor 8 + app, haptics, browser, splash-screen, status-bar |
| `store/listing.md` | a listing draft from games.json and the asset checklist |
| `store/thumb.*` | the thumbnail, the start point for the icon and screenshots |

Then, on a machine with the tools below:

```bash
cd dist/apps/one-percent-popup
npm install
npx cap add android
npx cap add ios        # Mac only
npx cap sync           # after every change to www/
```

**One app or one per game?** Apple can treat several near-identical single-game apps as spam (rule 4.3), and
small one-screen games are the most likely to fail "minimum functionality" (4.2) *(reviewer judgement)*. The safer
first app is **a compilation** ("computer cooked arcade") of the 3–5 winners with a simple menu. The script does
single games today; a compilation menu is a small follow-up once we know which games go in.

## 3. Toolchain (Capacitor 8)

| | minimum |
|---|---|
| Node | 22+ |
| Android Studio | Otter 2025.2.1+, JDK 21 *(unconfirmed)* |
| Android SDK | minSdk 24, compile/target 36 |
| Xcode (Mac) | 26+, iOS deployment target 15.0 |

Plugins to add when needed: `@capacitor/preferences` (saves), `@capacitor/screen-orientation`,
`@capacitor-community/admob` v8 (ads, includes Google's consent form and the iOS tracking prompt),
`@revenuecat/purchases-capacitor` or `cordova-plugin-purchase` (in-app purchases; check Capacitor 8 support first
*(unconfirmed)*). Install plugins as `npm i @capacitor/<name>@latest-8`.

### Builds

- **Android (AAB):** `npx cap build android --androidreleasetype AAB --keystorepath … --keystorealias …`, or
  Android Studio → Generate Signed Bundle. Google holds the app signing key; we keep an **upload key**. Back the
  keystore and its passwords up somewhere safe, never in botcomms or the repo.
- **iOS (IPA):** `npx cap build ios --xcode-team-id … --xcode-export-method app-store-connect`, or Xcode →
  Product → Archive → upload. Needs a Mac.

## 4. Before you submit: app quality checklist

- [ ] airplane-mode test: the game loads and plays with no network
- [ ] audio stops when the app is backgrounded, and resumes after
- [ ] Android back button does something sensible (pause, or leave from the menu)
- [ ] no text selection, long-press menu, pinch zoom or overscroll bounce
- [ ] safe areas: nothing under the notch or the home bar
- [ ] status bar hidden or styled; splash is the dark brand colour, not white
- [ ] haptics on hits and wins (`ccNative.haptic("light")`)
- [ ] web-only links hidden in the app (`if (ccNative.isNative)`); privacy policy opens in the in-app browser
- [ ] settings: sound on/off; progress saved

## 5. Google Play (Ashton: account and submission)

- **Account:** US$25 one time; Google may ask for government ID and a card in the legal name. Personal accounts
  also verify an Android device.
- **New personal accounts must run a closed test with at least 12 testers opted in for 14 days in a row** before
  production. Start recruiting testers early; it's the longest wait.
- **Target API 36** for new apps and updates (in force since Aug 31, 2026); Capacitor 8 meets it.
- **Listing:**
  - icon 512×512 PNG
  - feature graphic 1024×500 (no transparency)
  - 2–8 phone screenshots; at least 4 at 1080×1920 to be eligible for recommendations
  - name ≤30 characters, short description ≤80, full description ≤4000
- **Forms:**
  - **Data safety:** include what AdMob and any purchases SDK collect.
  - **Content rating:** the IARC questionnaire.
  - **Target audience:** pick **13+** unless a game is really for kids. Under-13 audiences bring the Families policy (certified ad SDKs only, no personalised ads, no advertising ID).

## 6. Apple App Store (Ashton: account and submission)

- **Account:** US$99 a year. As an individual: no D-U-N-S number. As a company: D-U-N-S, a legal entity and a website.
- **Rules that matter for wrapped web games:**
  - **4.2:** more than a repackaged website.
  - **2.5.2:** self-contained, no downloaded code.
  - **4.3:** no near-duplicate apps.
  - **3.1.1:** tips, remove-ads and unlocks must use Apple in-app purchase, with no Stripe link in the app. The site's tip jar must not appear in iOS builds.
  - **4.8:** Sign in with Apple only if we add a social login.
- **Listing:**
  - icon 1024×1024 (no transparency)
  - iPhone screenshots 1179×2556 or 1206×2622 portrait (or landscape)
  - iPad sizes only if iPad is supported
- **Forms:**
  - **Privacy labels:** they cover SDKs too. Xcode builds a privacy report from the SDK manifests.
  - **Ads that track:** they need the App Tracking Transparency prompt. The AdMob plugin has it.
  - **Age rating:** the new questionnaire (4+/9+/13+/16+/18+).

## 7. Money hooks, in order

1. **Rewarded ads** (a continue, a hint): `ccNative.ads.rewarded()`.
   - Needs an AdMob account, which is Ashton's.
   - Put the unit ids in `window.CC_NATIVE = { admob: { interstitial, rewarded } }` before `cc-native.js`.
2. **Interstitials** use the same caps as the site (assets/ads.js): never before the first run, at most every 3 runs and 3 minutes.
3. **Remove ads / tip** through in-app purchase: `ccNative.iap.buy(id)`.
   - Wire a purchases plugin.
   - Create the products in both store consoles (Ashton).

Sources: capacitorjs.com docs (environment setup, 8.0 upgrade, cli build, apis), Play Console Help (target API,
app signing, testing requirements, account, listing assets, families), Apple developer (enrol, App Review
Guidelines, privacy, screenshot specs, age ratings).
