param(
  [ValidateSet("patch", "minor", "major")]
  [string]$Bump = "patch",
  [switch]$Yes
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Push-Location $repoRoot
try {
  $status = git status --porcelain
  if ($status) {
    throw "Working tree is not clean. Commit or stash changes before releasing."
  }

  $package = Get-Content "package.json" -Raw | ConvertFrom-Json
  $current = [version]$package.version

  if ($Bump -eq "major") {
    $next = [version]::new($current.Major + 1, 0, 0)
  } elseif ($Bump -eq "minor") {
    $next = [version]::new($current.Major, $current.Minor + 1, 0)
  } else {
    $next = [version]::new($current.Major, $current.Minor, $current.Build + 1)
  }

  $tag = "v$next"
  Write-Host "Release target: $current -> $next ($tag)"

  if (-not $Yes) {
    $confirm = Read-Host "Continue? (Y/N)"
    if ($confirm -ne "Y") {
      Write-Host "Release cancelled."
      exit 0
    }
  }

  npm version $($next.ToString()) --no-git-tag-version

  (Get-Content "src-tauri/Cargo.toml" -Raw) `
    -replace 'version = "[0-9]+\.[0-9]+\.[0-9]+"', "version = `"$next`"" |
    Set-Content "src-tauri/Cargo.toml" -Encoding UTF8

  (Get-Content "src-tauri/tauri.conf.json" -Raw) `
    -replace '"version": "[0-9]+\.[0-9]+\.[0-9]+"', "`"version`": `"$next`"" |
    Set-Content "src-tauri/tauri.conf.json" -Encoding UTF8

  cargo generate-lockfile --manifest-path src-tauri/Cargo.toml

  git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json CHANGELOG.md HISTORY.md TASKS.md DECISION_LOG.md README.md .github/workflows/release.yml scripts/windows/generate-latest-json.ps1 scripts/windows/release.ps1
  git commit -m "chore: release $tag"
  git tag $tag
  git push origin master $tag

  Write-Host "Release pushed: https://github.com/jeiel85/localpdf-studio/actions/workflows/release.yml"
}
finally {
  Pop-Location
}
