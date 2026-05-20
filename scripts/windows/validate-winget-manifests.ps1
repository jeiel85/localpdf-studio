param(
  [string]$ManifestDir = "packaging\winget"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

$sourceDir = Resolve-Path $ManifestDir
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("localpdf-winget-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  Copy-Item (Join-Path $sourceDir "*.yaml") $tempDir
  winget validate --manifest $tempDir
  if ($LASTEXITCODE -ne 0) {
    throw "winget validate failed with exit code $LASTEXITCODE"
  }
} finally {
  if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
  }
}

