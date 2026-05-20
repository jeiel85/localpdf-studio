# 외부 배포 후속 작업 TODO

이 문서는 AI 에이전트가 처리할 수 없는 외부 계정/인증 기반 작업만 모아둔다. 저장소 코드, v0.17.2 GitHub Release, Windows/macOS/Linux 산출물, updater `latest.json`, Homebrew tap, 패키지 매니페스트 동기화, CI 검증은 완료되어 있다.

## 현재 완료 상태

- v0.17.2 GitHub Release 완료: <https://github.com/jeiel85/localpdf-studio/releases/tag/v0.17.2>
- 릴리즈 산출물 17개 업로드 및 검증 완료
- `latest.json` updater URL 검증 완료
- Homebrew tap 게시 완료: <https://github.com/jeiel85/homebrew-tap>
- winget v0.17.2 PR 제출 완료: <https://github.com/microsoft/winget-pkgs/pull/377220>
- Chocolatey v0.17.2 `.nupkg` 생성 검증 완료
- Snap/AUR/Homebrew/winget/Chocolatey 매니페스트는 v0.17.2 SHA 기준으로 동기화 완료

## 사용자가 직접 해야 하는 작업

### 1. winget PR 리뷰/CLA 처리

- PR: <https://github.com/microsoft/winget-pkgs/pull/377220>
- 현재 상태: Microsoft CLA/review 대기
- 해야 할 일:
  - GitHub PR 화면에서 CLA 동의 요청이 뜨면 승인
  - Microsoft validation/review 코멘트가 달리면 해당 코멘트 처리

### 2. Chocolatey community push

- 필요한 것: Chocolatey 계정 API key
- API key 발급 위치: <https://community.chocolatey.org/account>
- 저장소 준비 상태:
  - `packaging/chocolatey/localpdf-studio.nuspec`
  - `packaging/chocolatey/tools/chocolateyInstall.ps1`
  - v0.17.2 SHA 반영 완료
  - `scripts/windows/publish-chocolatey.ps1 -SkipPush` 검증 완료

실행 명령:

```powershell
$env:CHOCO_API_KEY="발급받은_API_KEY"
powershell -ExecutionPolicy Bypass -File scripts\windows\publish-chocolatey.ps1
```

### 3. Snap Store 제출

- 필요한 것: Snapcraft 계정 및 로그인
- 계정/대시보드: <https://snapcraft.io/>
- 저장소 준비 상태:
  - `packaging/snap/snapcraft.yaml`
  - v0.17.2 `.deb` URL/SHA 반영 완료
- 해야 할 일:
  - Snapcraft 로그인
  - package name 등록 가능 여부 확인
  - `packaging/snap/snapcraft.yaml` 기준으로 build/push/release 진행

### 4. AUR 제출

- 필요한 것:
  - aur.archlinux.org 계정
  - SSH public key 등록
- 저장소 준비 상태:
  - `packaging/aur/PKGBUILD`
  - v0.17.2 `.deb` URL/SHA 반영 완료
- 해야 할 일:
  - AUR에 `localpdf-studio-bin` repo 생성
  - `PKGBUILD` 업로드
  - 필요 시 `.SRCINFO` 생성 후 함께 push

### 5. macOS 서명/공증

- 필요한 것:
  - Apple Developer Program 멤버십
  - Developer ID Application 인증서
  - 공증용 App Store Connect API key 또는 Apple ID 인증 설정
- 현재 상태:
  - v0.17.2 Universal DMG 빌드 완료
  - Apple 서명/공증은 미적용
  - README/INSTALL에는 Gatekeeper 우회 안내가 남아 있음
- 해야 할 일:
  - Apple Developer 계정 준비
  - Tauri macOS signing/notarization secrets를 GitHub Actions에 등록
  - release workflow에서 서명/공증 단계 활성화

## 다음 세션 시작 체크

다음 세션에서는 먼저 아래 명령으로 상태를 확인한다.

```powershell
git status --short --branch
gh pr view 377220 --repo microsoft/winget-pkgs --json url,state,reviewDecision,statusCheckRollup
gh release view v0.17.2 --repo jeiel85/localpdf-studio --json url,assets
```

외부 인증 정보가 준비된 항목부터 진행한다.
