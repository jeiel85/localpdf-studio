$ErrorActionPreference = 'Stop'

$packageName  = 'localpdf-studio'
$version      = '0.18.0'
$url64        = "https://github.com/jeiel85/localpdf-studio/releases/download/v$version/LocalPDF.Studio_${version}_x64-setup.exe"
$checksum64   = '62cf45f8be320b07a29cae31bf9fd5622842f833f25084560533d529e3b36186'
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
