# computercooked.com

the computer is not handling it well.

Landing page and link-in-bio for Computer Cooked. Plain static files, no framework, no build step, no trackers.

```
index.html        the page
404.html          "this page got cooked"
styles.css        all styles (brand colors are CSS variables at the top)
assets/           logo.svg (also the favicon), og.png, apple-touch-icon.png, fonts/
robots.txt, sitemap.xml, _headers
scripts/          optional: regenerates og.png and the touch icon
```

## Editing the links

Social links live in `index.html` inside `<ul class="link-grid">`. Each one is an `<li>` with an `<a class="btn" href="...">`. Change the `href` to change where it goes. Order on the page is the order in the file. Items with `class="wide"` and `btn-primary` (TikTok, YouTube) are the big lime full-width buttons; the rest sit two per row.

The rotating "system status" lines are in the small `<script>` at the bottom of `index.html` (`var lines = [...]`). The contact email is in the footer.

## Preview locally

Any static server from the repo root works, for example `npx serve .` or `python3 -m http.server`, then open http://localhost:3000 (or :8000).

## Deploy (Cloudflare Pages)

Connected straight to this GitHub repo.

- Framework preset: None
- Build command: (leave empty)
- Build output directory: `/` (the repo root)

Every push to the production branch deploys. Pull requests get preview URLs. Cloudflare Pages automatically serves `404.html` for unknown paths and applies the headers in `_headers`.

## Regenerating the share image

Only needed if the logo or wordmark changes. Edit `scripts/og.html`, then:

```
npm i --no-save playwright
node scripts/render-images.mjs
```

That rewrites `assets/og.png` (1200×630) and `assets/apple-touch-icon.png`.

## Font

JetBrains Mono ExtraBold is self-hosted in `assets/fonts/` (SIL Open Font License, see `OFL.txt`), so the page makes no third-party requests.
