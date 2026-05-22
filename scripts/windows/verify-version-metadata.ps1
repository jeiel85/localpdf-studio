param(
  [Parameter(Mandatory = $true)]
  [string]$Version
)

$ErrorActionPreference = "Stop"

$versionClean = $Version -replace '^v', ''
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$packageVersion = (Get-Content "package.json" -Raw | ConvertFrom-Json).version
$tauriVersion = (Get-Content "src-tauri\tauri.conf.json" -Raw | ConvertFrom-Json).version
$cargoToml = Get-Content "src-tauri\Cargo.toml" -Raw
$cargoVersion = [regex]::Match($cargoToml, '(?m)^version = "([^"]+)"').Groups[1].Value
$changelog = Get-Content "CHANGELOG.md" -Raw

$mismatches = @()
if ($packageVersion -ne $versionClean) { $mismatches += "package.json=$packageVersion" }
if ($tauriVersion -ne $versionClean) { $mismatches += "tauri.conf.json=$tauriVersion" }
if ($cargoVersion -ne $versionClean) { $mismatches += "Cargo.toml=$cargoVersion" }
if (-not [regex]::IsMatch($changelog, "(?m)^## v$([regex]::Escape($versionClean))\b")) {
  $mismatches += "CHANGELOG.md missing ## v$versionClean section"
}

if ($mismatches.Count -gt 0) {
  throw "Version metadata mismatch for v${versionClean}: $($mismatches -join ', ')"
}

Write-Host "Version metadata verified for v$versionClean."
