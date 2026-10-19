# One-time Cloudflare setup for the games platform. Needs `npx wrangler login` first (Ashton's account).
#   pwsh scripts/setup-cloudflare.ps1
# 1. creates (or finds) the D1 database "computercooked" and writes its id into wrangler.jsonc
# 2. applies migrations/ to the live database
# 3. creates a random ADMIN_TOKEN Worker secret and saves a copy outside the repo for the automation
# Then commit wrangler.jsonc and merge: the next deploy turns accounts, leaderboards and feedback on.
param([string]$TokenFile = "C:\Bush Growth\ventures\computer-cooked-games\operations\.metrics-token")
$ErrorActionPreference = "Stop"
$repo = Split-Path $PSScriptRoot -Parent
Set-Location $repo
$w = @("--yes", "wrangler@4")

& npx @w whoami | Out-Host
if ($LASTEXITCODE) { throw "not logged in: run npx wrangler login first" }

# --- database
$list = (& npx @w d1 list --json) | Out-String | ConvertFrom-Json
$db = $list | Where-Object { $_.name -eq "computercooked" } | Select-Object -First 1
if (-not $db) {
  & npx @w d1 create computercooked | Out-Host
  $list = (& npx @w d1 list --json) | Out-String | ConvertFrom-Json
  $db = $list | Where-Object { $_.name -eq "computercooked" } | Select-Object -First 1
}
if (-not $db) { throw "could not create or find the D1 database" }
$id = $db.uuid
"database id: $id"

$cfgPath = Join-Path $repo "wrangler.jsonc"
$cfg = [IO.File]::ReadAllText($cfgPath)
$block = "  `"d1_databases`": [{ `"binding`": `"DB`", `"database_name`": `"computercooked`", `"database_id`": `"$id`", `"migrations_dir`": `"migrations`" }],"
$cfg = [regex]::Replace($cfg, '(?m)^\s*//\s*"d1_databases".*$', $block)
if ($cfg -notmatch [regex]::Escape($id)) { throw "couldn't place the database id in wrangler.jsonc" }
[IO.File]::WriteAllText($cfgPath, $cfg)
"wrangler.jsonc updated"

& npx @w d1 migrations apply computercooked --remote | Out-Host
if ($LASTEXITCODE) { throw "migrations failed" }

# --- admin token (secret on the Worker + a copy for the automation; never committed)
$bytes = New-Object byte[] 32
[Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
$token = ([Convert]::ToBase64String($bytes)).TrimEnd("=").Replace("+", "-").Replace("/", "_")
$token | & npx @w secret put ADMIN_TOKEN | Out-Host
if ($LASTEXITCODE) { throw "secret put failed" }
New-Item -ItemType Directory -Force (Split-Path $TokenFile) | Out-Null
@"
# computercooked.com admin metrics token. SECRET: do not commit, paste or share.
# Use as: Authorization: Bearer <token>  (GET https://computercooked.com/api/admin/metrics?since=YYYY-MM-DD)
# Rotate: pwsh scripts/setup-cloudflare.ps1 (creates a new one and replaces the Worker secret).
$token
"@ | Set-Content -Encoding utf8 $TokenFile
try { icacls $TokenFile /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null } catch {}
"admin token saved to $TokenFile"
"done. commit wrangler.jsonc and merge to deploy."
