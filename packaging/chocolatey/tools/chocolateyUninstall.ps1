$ErrorActionPreference = 'Stop'

$packageName    = 'localpdf-studio'
$softwareName   = 'LocalPDF Studio*'

[array]$key = Get-UninstallRegistryKey -SoftwareName $softwareName

if ($key.Count -eq 1) {
  $key | ForEach-Object {
    $packageArgs = @{
      packageName    = $packageName
      fileType       = 'EXE'
      silentArgs     = '/S'
      validExitCodes = @(0)
      file           = "$($_.UninstallString)"
    }
    Uninstall-ChocolateyPackage @packageArgs
  }
} elseif ($key.Count -eq 0) {
  Write-Warning "$packageName is not installed."
} else {
  Write-Warning "Multiple installations found, please uninstall manually."
  $key | ForEach-Object { Write-Warning "- $($_.DisplayName)" }
}
