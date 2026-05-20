param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [string]$ManifestDir = "packaging\winget",
  [string]$PackageIdentifier = "jeiel85.LocalPDFStudio",
  [string]$GitHubToken = $env:WINGET_TOKEN,
  [switch]$NoOpen
)

$ErrorActionPreference = "Stop"

if (-not $GitHubToken) {
  try {
    $GitHubToken = gh auth token
  } catch {
    throw "WINGET_TOKEN 또는 gh auth token이 필요합니다."
  }
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

& "$PSScriptRoot\validate-winget-manifests.ps1" -ManifestDir $ManifestDir

$sourceDir = Resolve-Path $ManifestDir
$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("localpdf-winget-submit-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
  Copy-Item (Join-Path $sourceDir "*.yaml") $tempDir
  $args = @(
    "submit",
    $tempDir,
    "--prtitle",
    "New version: $PackageIdentifier version $Version",
    "--token",
    $GitHubToken
  )
  if ($NoOpen) {
    $args += "--no-open"
  }
  wingetcreate @args
  if ($LASTEXITCODE -ne 0) {
    throw "wingetcreate submit failed with exit code $LASTEXITCODE"
  }
} finally {
  if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
  }
}

