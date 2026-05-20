param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [string]$Repository = "jeiel85/localpdf-studio",
  [switch]$RequireCrossPlatform
)

$ErrorActionPreference = "Stop"

$versionClean = $Version -replace '^v', ''
$tag = "v$versionClean"

$releaseJson = gh release view $tag --repo $Repository --json assets,isDraft,isPrerelease,publishedAt,tagName
$release = $releaseJson | ConvertFrom-Json
if ($release.isDraft) {
  throw "$tag release is still draft."
}

$assetNames = @($release.assets | ForEach-Object { $_.name })
$required = @(
  "LocalPDF.Studio_${versionClean}_x64-setup.exe",
  "LocalPDF.Studio_${versionClean}_x64-setup.exe.sig",
  "LocalPDF.Studio_${versionClean}_x64_en-US.msi",
  "LocalPDF.Studio_${versionClean}_x64_en-US.msi.sig",
  "LocalPDF.Studio_${versionClean}_x64_ko-KR.msi",
  "LocalPDF.Studio_${versionClean}_x64_ko-KR.msi.sig",
  "LocalPDF-Studio-Portable.zip",
  "latest.json"
)

if ($RequireCrossPlatform) {
  $required += @(
    "LocalPDF.Studio_${versionClean}_universal.dmg",
    "LocalPDF.Studio_${versionClean}_amd64.deb"
  )
}

$missing = $required | Where-Object { $_ -notin $assetNames }
if ($missing) {
  throw "Missing release assets for ${tag}: $($missing -join ', ')"
}

foreach ($asset in $release.assets) {
  if (-not $asset.digest -or -not $asset.digest.StartsWith("sha256:")) {
    throw "Asset has no sha256 digest: $($asset.name)"
  }
}

$latestAsset = $release.assets | Where-Object { $_.name -eq "latest.json" } | Select-Object -First 1
if ($latestAsset) {
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("localpdf-release-verify-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tempDir | Out-Null
  try {
    gh release download $tag --repo $Repository --pattern latest.json --dir $tempDir --clobber | Out-Null
    $latestPath = Join-Path $tempDir "latest.json"
    $latest = Get-Content $latestPath -Raw | ConvertFrom-Json
    $windowsUrl = $latest.platforms.'windows-x86_64'.url
    if (-not $windowsUrl) {
      throw "latest.json does not contain windows-x86_64 URL."
    }
    $latestAssetName = [uri]::UnescapeDataString(($windowsUrl -split '/')[-1])
    if ($latestAssetName -notin $assetNames) {
      throw "latest.json points to a missing release asset: $latestAssetName"
    }
  } finally {
    if (Test-Path $tempDir) {
      Remove-Item -Recurse -Force $tempDir
    }
  }
}

Write-Host "Release asset verification passed for $tag."
Write-Host "Published at: $($release.publishedAt)"
Write-Host "Assets: $($assetNames.Count)"
