param(
  [Parameter(Mandatory = $true)]
  [string]$Version,

  [string]$Repository = "jeiel85/localpdf-studio",
  [string]$ReleaseTag = "",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not $ReleaseTag) {
  $ReleaseTag = "v$Version"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

function Get-AssetHash {
  param(
    [array]$Assets,
    [string]$Name
  )

  $asset = $Assets | Where-Object { $_.name -eq $Name } | Select-Object -First 1
  if (-not $asset) {
    throw "Release asset not found: $Name"
  }
  if (-not $asset.digest -or -not $asset.digest.StartsWith("sha256:")) {
    throw "Release asset does not expose a sha256 digest: $Name"
  }

  return $asset.digest.Substring("sha256:".Length)
}

function Set-FileText {
  param(
    [string]$Path,
    [string]$Content
  )

  if ($DryRun) {
    Write-Host "[dry-run] would update $Path"
    return
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path $Path), $Content, $utf8NoBom)
}

function Get-FileText {
  param(
    [string]$Path
  )

  $utf8 = New-Object System.Text.UTF8Encoding($false)
  return [System.IO.File]::ReadAllText((Resolve-Path $Path), $utf8)
}

function Replace-InFile {
  param(
    [string]$Path,
    [string]$Pattern,
    [string]$Replacement,
    [switch]$Optional
  )

  $content = Get-FileText -Path $Path
  if (-not [regex]::IsMatch($content, $Pattern)) {
    if ($Optional) {
      return
    }
    throw "Pattern not found in $Path`: $Pattern"
  }

  $updated = [regex]::Replace($content, $Pattern, $Replacement)
  Set-FileText -Path $Path -Content $updated
}

Write-Host "Fetching release assets for $Repository@$ReleaseTag..."
$releaseJson = gh release view $ReleaseTag --repo $Repository --json assets
$release = $releaseJson | ConvertFrom-Json
$assets = $release.assets

$setupAsset = "LocalPDF.Studio_${Version}_x64-setup.exe"
$debAsset = "LocalPDF.Studio_${Version}_amd64.deb"
$dmgAsset = "LocalPDF.Studio_${Version}_universal.dmg"

$setupSha = Get-AssetHash -Assets $assets -Name $setupAsset
$debSha = Get-AssetHash -Assets $assets -Name $debAsset
$dmgSha = Get-AssetHash -Assets $assets -Name $dmgAsset

$wingetVersionFiles = @(
  "packaging\winget\jeiel85.LocalPDFStudio.yaml",
  "packaging\winget\jeiel85.LocalPDFStudio.locale.ko-KR.yaml",
  "packaging\winget\jeiel85.LocalPDFStudio.locale.en-US.yaml",
  "packaging\winget\jeiel85.LocalPDFStudio.installer.yaml"
)

foreach ($file in $wingetVersionFiles) {
  Replace-InFile -Path $file -Pattern "PackageVersion: .+" -Replacement "PackageVersion: $Version"
  Replace-InFile -Path $file -Pattern "releases/tag/v[0-9]+\.[0-9]+\.[0-9]+" -Replacement "releases/tag/$ReleaseTag" -Optional
}

$installerPath = "packaging\winget\jeiel85.LocalPDFStudio.installer.yaml"
Replace-InFile -Path $installerPath -Pattern "releases/download/v[0-9]+\.[0-9]+\.[0-9]+/LocalPDF\.Studio_[0-9]+\.[0-9]+\.[0-9]+_x64-setup\.exe" -Replacement "releases/download/$ReleaseTag/$setupAsset"
Replace-InFile -Path $installerPath -Pattern "InstallerSha256: .+" -Replacement "InstallerSha256: $setupSha"

$chocoInstallPath = "packaging\chocolatey\tools\chocolateyInstall.ps1"
Replace-InFile -Path $chocoInstallPath -Pattern "\`$version\s+=\s+'[0-9]+\.[0-9]+\.[0-9]+'" -Replacement "`$version      = '$Version'"
Replace-InFile -Path $chocoInstallPath -Pattern "\`$checksum64\s+=\s+'.+'" -Replacement "`$checksum64   = '$setupSha'"

$nuspecPath = "packaging\chocolatey\localpdf-studio.nuspec"
Replace-InFile -Path $nuspecPath -Pattern "<version>[0-9]+\.[0-9]+\.[0-9]+</version>" -Replacement "<version>$Version</version>"
Replace-InFile -Path $nuspecPath -Pattern "releases/tag/v[0-9]+\.[0-9]+\.[0-9]+" -Replacement "releases/tag/$ReleaseTag"

$aurPath = "packaging\aur\PKGBUILD"
Replace-InFile -Path $aurPath -Pattern "pkgver=[0-9]+\.[0-9]+\.[0-9]+" -Replacement "pkgver=$Version"
Replace-InFile -Path $aurPath -Pattern "sha256sums_x86_64=\('.*'\)" -Replacement "sha256sums_x86_64=('$debSha')"

$homebrewPath = "packaging\homebrew\localpdf-studio.rb"
Replace-InFile -Path $homebrewPath -Pattern 'version "[0-9]+\.[0-9]+\.[0-9]+"' -Replacement "version `"$Version`""
Replace-InFile -Path $homebrewPath -Pattern 'sha256 ".+"' -Replacement "sha256 `"$dmgSha`""

$snapPath = "packaging\snap\snapcraft.yaml"
Replace-InFile -Path $snapPath -Pattern "version: [0-9]+\.[0-9]+\.[0-9]+" -Replacement "version: $Version"
Replace-InFile -Path $snapPath -Pattern "releases/download/v[0-9]+\.[0-9]+\.[0-9]+/[^`r`n]+" -Replacement "releases/download/$ReleaseTag/$debAsset"

Write-Host "Package manifests synced for $ReleaseTag."
Write-Host "NSIS sha256: $setupSha"
Write-Host "DEB   sha256: $debSha"
Write-Host "DMG   sha256: $dmgSha"
