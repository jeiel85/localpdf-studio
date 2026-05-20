$ErrorActionPreference = 'Stop'

$packageName  = 'localpdf-studio'
$version      = '0.15.0'
$url64        = "https://github.com/jeiel85/localpdf-studio/releases/download/v$version/LocalPDF.Studio_${version}_x64-setup.exe"
$checksum64   = 'c76076008e979ce653d864b6549e7f813c3e1bfd40fa1320019671e3195fa6a5'
$checksumType = 'sha256'

$packageArgs = @{
  packageName    = $packageName
  unzipLocation  = $(Split-Path -parent $MyInvocation.MyCommand.Definition)
  fileType       = 'EXE'
  url64bit       = $url64
  softwareName   = 'LocalPDF Studio*'
  checksum64     = $checksum64
  checksumType64 = $checksumType
  silentArgs     = '/S'
  validExitCodes = @(0)
}

Install-ChocolateyPackage @packageArgs
