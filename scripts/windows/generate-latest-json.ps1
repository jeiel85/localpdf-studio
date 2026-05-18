param(
  [Parameter(Mandatory=$true)]
  [string]$Version,
  [Parameter(Mandatory=$true)]
  [string]$ReleaseDir
)

$ErrorActionPreference = "Stop"

$setupExe = Join-Path $ReleaseDir "bundled/nsis/*_x64-setup.exe" | Resolve-Path | Select-Object -First 1
$sigFile = "$setupExe.sig"

if (-not (Test-Path $setupExe)) {
  throw "Setup exe not found: $setupExe"
}
if (-not (Test-Path $sigFile)) {
  throw "Signature file not found: $sigFile"
}

$signature = Get-Content $sigFile -Raw
$pubDate = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$versionClean = $Version -replace '^v', ''
$repo = "jeiel85/localpdf-studio"
$downloadUrl = "https://github.com/$repo/releases/download/v$versionClean/localpdf-studio_${versionClean}_x64-setup.exe"

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
