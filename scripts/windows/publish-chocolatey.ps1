param(
  [string]$PackageDir = "packaging\chocolatey",
  [string]$OutputDir = "dist-release",
  [string]$ApiKey = $env:CHOCO_API_KEY,
  [switch]$SkipPush
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$nuspec = Resolve-Path (Join-Path $PackageDir "localpdf-studio.nuspec")
choco pack $nuspec --out $OutputDir
if ($LASTEXITCODE -ne 0) {
  throw "choco pack failed with exit code $LASTEXITCODE"
}

$package = Get-ChildItem $OutputDir -Filter "localpdf-studio.*.nupkg" |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $package) {
  throw "Chocolatey package was not created."
}

if ($SkipPush) {
  Write-Host "Chocolatey package ready: $($package.FullName)"
  return
}

if (-not $ApiKey) {
  throw "CHOCO_API_KEY가 없어 Chocolatey push를 진행할 수 없습니다. 패키지: $($package.FullName)"
}

choco push $package.FullName --source https://push.chocolatey.org/ --api-key $ApiKey
if ($LASTEXITCODE -ne 0) {
  throw "choco push failed with exit code $LASTEXITCODE"
}

