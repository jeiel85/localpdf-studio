$ErrorActionPreference = 'Stop'

$packageName  = 'localpdf-studio'
$version      = '0.17.0'
$url64        = "https://github.com/jeiel85/localpdf-studio/releases/download/v$version/LocalPDF.Studio_${version}_x64-setup.exe"
$checksum64   = '02d3f33e7f5defa1adc8f5691485d2b381bc19d452d96400c3308bd0619c23b2'
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
