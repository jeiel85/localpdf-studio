param(
  [Parameter(Mandatory=$true)]
  [string]$ExePath
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ExePath)) {
  throw "ExePath does not exist: $ExePath"
}

$baseKey = "HKCU:\Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio"
New-Item -Path $baseKey -Force | Out-Null
Set-ItemProperty -Path $baseKey -Name "MUIVerb" -Value "LocalPDF Studio"
Set-ItemProperty -Path $baseKey -Name "SubCommands" -Value ""
Set-ItemProperty -Path $baseKey -Name "Icon" -Value $ExePath

$commands = @(
  @{ Key = "Open"; Label = "Open in LocalPDF Studio"; Action = "open" },
  @{ Key = "Merge"; Label = "Merge PDFs..."; Action = "merge" },
  @{ Key = "Split"; Label = "Split PDF..."; Action = "split" },
  @{ Key = "Compress"; Label = "Compress PDF..."; Action = "compress" },
  @{ Key = "OCR"; Label = "OCR PDF..."; Action = "ocr" },
  @{ Key = "Rotate"; Label = "Rotate Pages..."; Action = "rotate" },
  @{ Key = "ExtractPages"; Label = "Extract Pages..."; Action = "extract-pages" },
  @{ Key = "ConvertImages"; Label = "Convert to Images..."; Action = "convert-images" },
  @{ Key = "ExtractText"; Label = "Extract Text..."; Action = "extract-text" },
  @{ Key = "Protect"; Label = "Protect / Encrypt..."; Action = "encrypt" },
  @{ Key = "Watermark"; Label = "Add Watermark..."; Action = "watermark" },
  @{ Key = "Stamp"; Label = "Sign / Stamp..."; Action = "stamp" },
  @{ Key = "Metadata"; Label = "Properties / Metadata..."; Action = "metadata" }
)

foreach ($command in $commands) {
  $itemKey = Join-Path $baseKey "shell\$($command.Key)"
  $commandKey = Join-Path $itemKey "command"
  New-Item -Path $commandKey -Force | Out-Null
  Set-ItemProperty -Path $itemKey -Name "MUIVerb" -Value $command.Label
  (Get-Item $commandKey).SetValue("", "`"$ExePath`" --context-action $($command.Action) --files `"%1`"")
}

Write-Host "LocalPDF Studio context menu installed under HKCU."
