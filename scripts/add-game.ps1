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

$thumb = "$($entry.thumbnail)"
if (-not $thumb) { $thumb = "thumb.png" }
if (-not $thumb.StartsWith("/")) { $thumb = "/games/$slug/play/" + $thumb.TrimStart(".", "/") }

# player page
function Enc([string]$s) { [System.Net.WebUtility]::HtmlEncode($s) }
$html = Get-Content -Raw (Join-Path $repo "scripts\player-template.html")
$html = $html.Replace("{{SLUG}}", $slug).Replace("{{TITLE}}", (Enc $entry.title)).Replace("{{PITCH}}", (Enc $entry.pitch)).Replace("{{CONTROLS}}", (Enc "$($entry.controls)")).Replace("{{THUMB}}", $thumb)
[IO.File]::WriteAllText((Join-Path $dest "index.html"), $html)

# games.json
$manifestPath = Join-Path $repo "games\games.json"
$manifest = Get-Content -Raw $manifestPath | ConvertFrom-Json
$item = [ordered]@{
  slug = $slug; title = "$($entry.title)"; pitch = "$($entry.pitch)"; thumbnail = $thumb
  made_by = $(if ($entry.made_by) { "$($entry.made_by)" } else { "computer-cooked" })
  tags = @($entry.tags | Where-Object { $_ }); controls = "$($entry.controls)"; size_kb = $entry.size_kb
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

"added $slug -> /games/$slug/ ($([math]::Round(((Get-ChildItem -Recurse -File $play | Measure-Object Length -Sum).Sum) / 1KB)) KB)"
