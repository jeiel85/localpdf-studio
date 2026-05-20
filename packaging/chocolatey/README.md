# Chocolatey 패키지 제출 가이드

이 디렉터리는 [community.chocolatey.org](https://community.chocolatey.org/)에 제출할
LocalPDF Studio 패키지입니다. 등록되면 사용자가 다음 명령으로 설치:

```powershell
choco install localpdf-studio
choco upgrade localpdf-studio
```

## 제출 절차

### 1. 새 버전 게시 후 SHA-256 업데이트

```powershell
# GitHub Release에서 NSIS .exe 다운로드 후
$hash = (Get-FileHash .\LocalPDF.Studio_<버전>_x64-setup.exe -Algorithm SHA256).Hash
Write-Host $hash
```

- `localpdf-studio.nuspec`의 `<version>` 갱신
- `tools\chocolateyInstall.ps1`의 `$version`, `$checksum64` 갱신

### 2. 패키지 빌드 + 로컬 테스트

```powershell
# Chocolatey CLI 설치 (있다면 생략)
Set-ExecutionPolicy Bypass -Scope Process -Force
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# 패키지 빌드
cd .\packaging\chocolatey
choco pack

# 결과: localpdf-studio.<버전>.nupkg

# 로컬 설치 테스트
choco install localpdf-studio -s . -y --force

# 제거 테스트
choco uninstall localpdf-studio -y
```

### 3. community 저장소 제출

```powershell
# API 키 등록 (1회)
choco apikey --key <YOUR_API_KEY> --source https://push.chocolatey.org/
# API 키는 https://community.chocolatey.org/account 에서 발급

# 제출
choco push localpdf-studio.<버전>.nupkg --source https://push.chocolatey.org/
```

### 4. 검수

Chocolatey community 검수는 **2~3주 ~ 1개월**까지 걸릴 수 있습니다 (모더레이터 큐).
첫 제출 시 더 엄격하게 검토합니다 (모든 외부 다운로드, 설치 동작 검증).

이후 버전부터는 자동 보조 검수.

## 자동화

GitHub Actions에서 자동 push:

```yaml
- name: Publish to Chocolatey
  if: matrix.platform == 'windows-latest' && startsWith(github.ref, 'refs/tags/')
  shell: pwsh
  run: |
    choco apikey --key ${{ secrets.CHOCO_API_KEY }} --source https://push.chocolatey.org/
    cd .\packaging\chocolatey
    # 릴리즈 산출물 SHA256을 매니페스트에 동기화
    powershell -ExecutionPolicy Bypass -File ..\..\scripts\windows\sync-package-manifests.ps1 -Version $env:GITHUB_REF_NAME.TrimStart('v')
    choco pack
    choco push *.nupkg --source https://push.chocolatey.org/
```

`CHOCO_API_KEY` Secret 등록 필요.
