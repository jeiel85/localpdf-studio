param(
  [Parameter(Mandatory=$true)]
  [string]$Version,
  [Parameter(Mandatory=$true)]
  [string]$ReleaseDir
)

$ErrorActionPreference = "Stop"

$versionClean = $Version -replace '^v', ''
$nsisPattern = Join-Path $ReleaseDir "bundle/nsis/*_${versionClean}_x64-setup.exe"
$setupExe = Resolve-Path $nsisPattern | Select-Object -First 1

if (-not $setupExe) {
  throw "Setup exe not found: $nsisPattern"
}

$setupExePath = $setupExe.Path
$sigFile = "$setupExePath.sig"

if (-not (Test-Path $sigFile)) {
  throw "Signature file not found: $sigFile"
}

$signature = Get-Content $sigFile -Raw
$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$repo = "jeiel85/localpdf-studio"
$assetName = Split-Path $setupExePath -Leaf
$assetNameEncoded = [uri]::EscapeDataString($assetName)
$downloadUrl = "https://github.com/$repo/releases/download/v$versionClean/$assetNameEncoded"

$latest = @{
  version   = "v$versionClean"
  notes     = "LocalPDF Studio v$versionClean - See CHANGELOG.md for details."
  pub_date  = $pubDate
  platforms = @{
    "windows-x86_64" = @{
      signature = $signature
      url       = $downloadUrl
    }
  }
}

$json = $latest | ConvertTo-Json -Depth 4
$outPath = Join-Path $ReleaseDir "latest.json"
$json | Set-Content $outPath -Encoding UTF8

Write-Host "latest.json generated: $outPath"
Write-Host "Version: v$versionClean"
Write-Host "Download URL: $downloadUrl"
