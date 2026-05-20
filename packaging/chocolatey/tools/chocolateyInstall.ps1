$ErrorActionPreference = 'Stop'

$packageName  = 'localpdf-studio'
$version      = '0.17.2'
$url64        = "https://github.com/jeiel85/localpdf-studio/releases/download/v$version/LocalPDF.Studio_${version}_x64-setup.exe"
$checksum64   = 'bb4bedb4ad3d39e0407202defe1301600a4901034f3ad96320c7b1ac95ea7d81'
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
