# winget 매니페스트 제출 가이드

이 디렉터리는 [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs)에 제출할
LocalPDF Studio 매니페스트입니다. 한 번 등록되면 사용자가 다음 명령으로 설치/업데이트할 수 있습니다:

```powershell
winget install jeiel85.LocalPDFStudio
winget upgrade jeiel85.LocalPDFStudio
```

## 제출 절차

### 1. 새 버전이 GitHub Release에 게시된 후

**SHA-256 계산**:

```powershell
# release에서 NSIS .exe 다운로드 후
(Get-FileHash .\LocalPDF.Studio_<버전>_x64-setup.exe -Algorithm SHA256).Hash
```

[installer.yaml](jeiel85.LocalPDFStudio.installer.yaml)의 `InstallerSha256`
및 `InstallerUrl`을 새 버전으로 교체.

### 2. wingetcreate로 자동 제출 (권장)

```powershell
# wingetcreate 설치
winget install wingetcreate

# 새 버전 업데이트 (대화형)
wingetcreate update jeiel85.LocalPDFStudio `
  --urls https://github.com/jeiel85/localpdf-studio/releases/download/v<버전>/LocalPDF.Studio_<버전>_x64-setup.exe `
  --version <버전> `
  --submit
```

이게 가장 빠릅니다. wingetcreate가 SHA-256 자동 계산 + winget-pkgs fork + PR 제출까지 처리.

### 3. 또는 수동 제출

1. [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) fork
2. `manifests/j/jeiel85/LocalPDFStudio/<버전>/` 디렉터리에 위 4개 YAML 파일 복사
3. PR 제목: `New version: jeiel85.LocalPDFStudio version <버전>`
4. Microsoft 자동 검증 (validation pipeline) 통과 후 사람 리뷰
5. 통상 1~3일 내 머지

## 자동화

차후 GitHub Actions로 winget 제출을 자동화하려면:

```yaml
- name: Update winget manifest
  uses: vedantmgoyal2009/winget-releaser@v2
  with:
    identifier: jeiel85.LocalPDFStudio
    token: ${{ secrets.WINGET_TOKEN }}
    installers-regex: '_x64-setup\.exe$'
```

`WINGET_TOKEN`은 Personal Access Token (winget-pkgs PR 권한 필요).

## 검증

매니페스트 로컬 검증:

```powershell
winget validate --manifest .\packaging\winget\
```

설치 테스트:

```powershell
winget install --manifest .\packaging\winget\
```
