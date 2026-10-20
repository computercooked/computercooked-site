# Adds (or updates) an iframe-hosted game on the site from a self-contained folder
# that has index.html + entry.json (slug, title, pitch, thumbnail, made_by, controls, size_kb).
#
#   pwsh scripts/add-game.ps1 "C:\path\to\site-ports\bellchain"
#
# Result: the game is copied to games/<slug>/play/, a player page is generated at
# games/<slug>/index.html from scripts/player-template.html, and games.json + sitemap.xml
# get the entry. CRASH stays first on the shelf.
param([Parameter(Mandatory)][string]$Source)
$ErrorActionPreference = "Stop"

$repo = Split-Path $PSScriptRoot -Parent
$entry = Get-Content -Raw (Join-Path $Source "entry.json") | ConvertFrom-Json
if (-not (Test-Path (Join-Path $Source "index.html"))) { throw "no index.html in $Source" }
$slug = "$($entry.slug)"
if ($slug -notmatch '^[a-z0-9-]+$' -or $slug -eq "crash") { throw "bad slug '$slug'" }

# copy the game
$dest = Join-Path $repo "games\$slug"
$play = Join-Path $dest "play"
if (Test-Path $play) { Remove-Item -Recurse -Force $play }
New-Item -ItemType Directory -Force $play | Out-Null
Copy-Item -Recurse -Force (Join-Path $Source "*") $play -Exclude "PLAYTEST.md", "screenshot-*"

# the SDK goes into the game page so it can report plays/scores to the player page
$gameHtml = Join-Path $play "index.html"
$gh = [IO.File]::ReadAllText($gameHtml)
if ($gh -notmatch "/games/cc-sdk.js") {
  $tag = "<script src=`"/games/cc-sdk.js`"></script>"
  $gh = if ($gh -match "</head>") { $gh -replace "</head>", "$tag`n</head>" } else { "$tag`n$gh" }
  [IO.File]::WriteAllText($gameHtml, $gh)
}

$thumb = "$($entry.thumbnail)"
if (-not $thumb) { $thumb = "thumb.png" }
if (-not $thumb.StartsWith("/")) { $thumb = "/games/$slug/play/" + $thumb.TrimStart(".", "/") }

# player page
function Enc([string]$s) { [System.Net.WebUtility]::HtmlEncode($s) }
$html = Get-Content -Raw (Join-Path $repo "scripts\player-template.html")
$html = $html.Replace("{{SLUG}}", $slug).Replace("{{TITLE}}", (Enc $entry.title)).Replace("{{PITCH}}", (Enc $entry.pitch)).Replace("{{CONTROLS}}", (Enc "$($entry.controls)")).Replace("{{THUMB}}", $thumb).Replace("{{VERSION}}", (Enc $(if ($entry.version) { "$($entry.version)" } else { "1" })))
[IO.File]::WriteAllText((Join-Path $dest "index.html"), $html)

# games.json
$manifestPath = Join-Path $repo "games\games.json"
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$old = @($manifest.games | Where-Object { $_.slug -eq $slug })[0]
$added = if ($entry.added) { "$($entry.added)" } elseif ($old -and $old.added) { "$($old.added)" } else { Get-Date -Format yyyy-MM-dd }
$item = [ordered]@{
  slug = $slug; title = "$($entry.title)"; pitch = "$($entry.pitch)"; thumbnail = $thumb
  made_by = $(if ($entry.made_by) { "$($entry.made_by)" } else { "computer-cooked" })
  tags = @($entry.tags | Where-Object { $_ }); controls = "$($entry.controls)"; size_kb = $entry.size_kb
  version = $(if ($entry.version) { "$($entry.version)" } else { "1" }); added = $added
}
if ($entry.max_score_per_sec) { $item.max_score_per_sec = [double]$entry.max_score_per_sec }
if ($entry.max_score) { $item.max_score = [double]$entry.max_score }
if ($entry.score_slack) { $item.score_slack = [double]$entry.score_slack }
# optional tips for the "how to play" card on the game page (plain text, one short line each)
if ($entry.how_to) { $item.how_to = @($entry.how_to | Where-Object { $_ } | ForEach-Object { "$_" }) }
# achievements the game can unlock with cc.achieve(id); the server only accepts ids listed here
if ($entry.achievements) {
  $item.achievements = @($entry.achievements | Where-Object { "$($_.id)" -match '^[a-z0-9_-]{1,40}$' } | ForEach-Object {
    [ordered]@{ id = "$($_.id)"; name = "$($_.name)"; desc = "$($_.desc)"; xp = [math]::Min(100, [math]::Max(0, [int]$_.xp)); secret = [bool]$_.secret }
  })
}
$games = @($manifest.games | Where-Object { $_.slug -ne $slug }) + @([pscustomobject]$item)
$games = @($games | Where-Object { $_.slug -eq "crash" }) + @($games | Where-Object { $_.slug -ne "crash" })
[IO.File]::WriteAllText($manifestPath, ([ordered]@{ games = $games } | ConvertTo-Json -Depth 6) + "`n")

# sitemap
$smPath = Join-Path $repo "sitemap.xml"
$sm = Get-Content -Raw $smPath
$loc = "https://computercooked.com/games/$slug/"
if ($sm -notmatch [regex]::Escape($loc)) {
  $sm = $sm.Replace("</urlset>", "  <url>`n    <loc>$loc</loc>`n    <lastmod>$(Get-Date -Format yyyy-MM-dd)</lastmod>`n  </url>`n</urlset>")
  [IO.File]::WriteAllText($smPath, $sm)
}

# link-preview cards (og.png, og-vs.png). Without the render tools, the thumbnail stands in so links never 404.
if (Test-Path (Join-Path $repo "scripts\.og-tools\node_modules")) {
  & node (Join-Path $repo "scripts\make-og.mjs") $slug
} else {
  $thumbFile = Join-Path $repo ($thumb.TrimStart("/").Replace("/", "\"))
  foreach ($f in "og.png", "og-vs.png") { Copy-Item $thumbFile (Join-Path $dest $f) -Force }
  Write-Warning "og cards: copied the thumbnail. For real cards: npm install --prefix scripts/.og-tools @resvg/resvg-js@2.6.2 wawoff2@2.0.1, then node scripts/make-og.mjs $slug"
}

"added $slug -> /games/$slug/ ($([math]::Round(((Get-ChildItem -Recurse -File $play | Measure-Object Length -Sum).Sum) / 1KB)) KB)"
