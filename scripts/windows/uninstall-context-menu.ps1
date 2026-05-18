$ErrorActionPreference = "Stop"
$baseKey = "HKCU:\Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio"

if (Test-Path $baseKey) {
  Remove-Item -Path $baseKey -Recurse -Force
  Write-Host "LocalPDF Studio context menu removed."
} else {
  Write-Host "LocalPDF Studio context menu was not registered."
}
