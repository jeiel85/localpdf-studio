$ErrorActionPreference = 'Stop'

$packageName  = 'localpdf-studio'
$version      = '0.10.0'
$url64        = "https://github.com/jeiel85/localpdf-studio/releases/download/v$version/LocalPDF.Studio_${version}_x64-setup.exe"
# NOTE: PR 제출 시 release 게시 후 실제 SHA256으로 교체.
#   $sha = (Get-FileHash .\LocalPDF.Studio_$version_x64-setup.exe -Algorithm SHA256).Hash
$checksum64   = 'REPLACE_WITH_ACTUAL_SHA256_FROM_RELEASE_ASSET'
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
