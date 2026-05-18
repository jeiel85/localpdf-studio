param(
  [string]$ReleaseDir = "src-tauri\target\release",
  [string]$OutDir = "dist-release"
)

$ErrorActionPreference = "Stop"
$exe = Join-Path $ReleaseDir "localpdf-studio.exe"
if (-not (Test-Path $exe)) {
  throw "Release executable not found: $exe"
}

New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
$portableRoot = Join-Path $OutDir "LocalPDF-Studio-Portable"
if (Test-Path $portableRoot) { Remove-Item $portableRoot -Recurse -Force }
New-Item -ItemType Directory -Path $portableRoot -Force | Out-Null
Copy-Item $exe $portableRoot
Copy-Item "README.md" $portableRoot
Compress-Archive -Path $portableRoot -DestinationPath (Join-Path $OutDir "LocalPDF-Studio-Portable.zip") -Force
Write-Host "Portable ZIP created."
