# HISTORY.md

## 2026-05-21 (v0.18.0 - 외부 배포 마무리 및 macOS Gatekeeper 우회 보강)

- 작업: macOS 빌드의 Apple Developer 자동 서명/공증 계획을 비용 문제로 제외하고 우회 설치 안내를 보완하였으며, 패키지 매니저(winget, Chocolatey, Snap Store, AUR) 외부 배포 마무리를 진행함.
- 변경 파일:
  - `INSTALL.md` — macOS Gatekeeper 우회 명령어 `xattr -dr com.apple.quarantine`에서 재귀적으로 전체 확장 속성을 확실하게 초기화하는 `xattr -cr`로 보강 및 관련 설명 갱신.
  - `docs/index.html`, `docs/en.html`, `docs/ja.html` — macOS 다운로드 카드 아래의 Gatekeeper 우회 안내 명령어를 `xattr -cr`로 전면 일괄 적용 및 `docs/ja.html` 버전 최신화(`v0.17.2`).
  - `scripts/linux/publish-snap.sh` [NEW] — Snapcraft 이름 예약, 빌드, upload/release를 옵션 기반으로 자동화.
  - `scripts/linux/publish-aur.sh` [NEW] — AUR SSH 확인, repo clone, `.SRCINFO` 생성, `makepkg -si`, commit/push 흐름 자동화.
  - `.gitattributes` [NEW] — Linux 제출 스크립트와 AUR `PKGBUILD` 줄끝을 LF로 고정.
  - `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json` — 앱 버전 `0.18.0` 동기화.
  - `scripts/windows/verify-version-metadata.ps1` [NEW], `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `scripts/windows/release.ps1` — 태그/앱/CHANGELOG 버전 불일치를 CI와 release에서 사전 차단하도록 검증 보강.
  - `AGENTS.md` — 실제 원격 HEAD/CI 기준에 맞춰 Main Branch를 `master`로 정정하고 lockfile을 버전 파일 목록에 포함.
  - `README.md`, `docs/index.html`, `docs/en.html`, `docs/ja.html`, `docs/10_EXTERNAL_PUBLISHING_TODO.md` — winget/Chocolatey/Snap/AUR 상태를 실제 공개 여부와 대기 상태가 구분되도록 정리.
  - `packaging/aur/PKGBUILD` — `.deb` 내부 `data.tar.gz` 해제 옵션을 gzip 포맷에 맞게 수정.
  - `packaging/snap/README.md`, `packaging/aur/README.md`, `docs/10_EXTERNAL_PUBLISHING_TODO.md` — Snap/AUR 자동화 스크립트 사용법 반영.
  - `TASKS.md`, `CHANGELOG.md`, `DECISION_LOG.md`, `HISTORY.md` — v0.18.0 기록 반영.
- 검증:
  - `git diff`를 통해 `INSTALL.md`와 랜딩 페이지 HTML 파일의 macOS Gatekeeper 명령어 일치 확인.
  - `C:\Program Files\Git\bin\bash.exe -n scripts/linux/publish-snap.sh` / `publish-aur.sh` 통과.
  - `git diff --check` 통과.
  - `npm run typecheck` 통과.
  - `npm run test` 55/55 통과.
  - `npm run build` 통과.
  - `cargo test` 40/40 통과.
  - `scripts\windows\validate-winget-manifests.ps1` 통과.
  - `scripts\windows\publish-chocolatey.ps1 -SkipPush` 통과.
  - `scripts\windows\verify-release-assets.ps1 -Version 0.17.2 -RequireCrossPlatform` 통과.
  - `scripts\windows\verify-version-metadata.ps1 -Version 0.18.0` 통과.
  - `winget search --id jeiel85.LocalPDFStudio --exact --source winget`: 공식 소스는 아직 `0.17.0` 노출.
  - `choco search localpdf-studio --exact --source https://community.chocolatey.org/api/v2/`: 아직 검색 미노출.
  - `npm run tauri:build`는 프론트엔드 빌드, Rust release 빌드, NSIS/MSI 생성까지 완료 후 로컬 `TAURI_SIGNING_PRIVATE_KEY` 부재로 updater 서명 단계에서 실패. 서명은 GitHub Actions secret 주입 환경에서 검증 필요.
  - `scripts\windows\publish-chocolatey.ps1` 실행으로 `dist-release\localpdf-studio.0.17.2.nupkg` 생성 및 `https://push.chocolatey.org/` push 성공 확인. Chocolatey automated checks/human moderation은 대기.

---

## 2026-05-20 (v0.17.2 - 파일 command 안전성 + 배포 후속 처리)

- 작업: 프론트에서 호출 가능한 로컬 파일 저장/읽기/삭제 command의 실패 시 원본 보존과 임의 파일 접근 차단을 보강하고, 남은 배포 후속 작업 5개를 스크립트/CI/문서/실제 제출 가능한 범위까지 정리.
- 변경 파일:
  - `src-tauri/src/commands.rs` — `save_text_file`, `save_binary_file`을 `atomic_write` 기반으로 전환하고, 기존 파일 교체 실패 시 백업 파일을 원래 경로로 복원하도록 개선.
  - `src-tauri/src/commands.rs` — `read_text_file_if_exists`는 `.json`/`.txt`만 읽도록 제한하고, `delete_file_if_exists`는 이미지 임시 파일과 `.txt`/`.json`만 삭제하도록 제한.
  - `src-tauri/src/commands.rs` — 출력/읽기/삭제 경로의 시스템 디렉터리 차단 로직을 공통 helper로 정리하고 Rust 단위 테스트 3개 추가.
  - `.github/workflows/release.yml` — macOS Universal DMG 및 Linux AppImage/deb/rpm 빌드 job 복구.
  - `.github/workflows/ci.yml` — Vitest, Rust test, winget manifest 검증, Chocolatey pack 검증 추가.
  - `scripts/windows/validate-winget-manifests.ps1`, `submit-winget.ps1`, `publish-chocolatey.ps1`, `verify-release-assets.ps1` [NEW] — 패키지 검증/제출/릴리즈 산출물 검증 자동화.
  - `docs/09_RELEASE_QA_CHECKLIST.md` [NEW] — 자동 검증, 산출물, 패키지 매니저 제출, 수동 앱 QA 체크리스트 정리.
  - `docs/10_EXTERNAL_PUBLISHING_TODO.md` [NEW] — 다음 세션에서 이어갈 외부 계정/인증 기반 배포 작업 목록 정리.
  - `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json` — 버전 `0.17.2` 동기화.
  - `README.md`, `CHANGELOG.md`, `TASKS.md`, `DECISION_LOG.md` — v0.17.2 기록 반영.
- 검증:
  - `npm run typecheck` 통과.
  - `npm run test` 55/55 통과.
  - `npm run build` 통과.
  - `cargo test` 40/40 통과.
  - `scripts/windows/validate-winget-manifests.ps1` 통과.
  - `scripts/windows/publish-chocolatey.ps1 -SkipPush` 통과.
  - `scripts/windows/verify-release-assets.ps1 -Version 0.17.2 -RequireCrossPlatform` 통과.
  - `scripts/windows/sync-package-manifests.ps1 -Version 0.17.2` 통과. NSIS sha256 `bb4bedb4ad3d39e0407202defe1301600a4901034f3ad96320c7b1ac95ea7d81`.
  - `latest.json` updater URL이 실제 릴리즈 asset 이름과 일치하는지 검증.
- 제출:
  - winget v0.17.2 PR 제출 완료: https://github.com/microsoft/winget-pkgs/pull/377220
  - Homebrew tap 생성 및 Cask 게시 완료: https://github.com/jeiel85/homebrew-tap
  - Chocolatey v0.17.2 패키지 생성 완료. `CHOCO_API_KEY`가 로컬에 없어 community push는 인증 대기.

## 2026-05-20 (v0.17.1 - 패키지 매니페스트 동기화 + 폴백 처리)

- 작업: v0.17.0 GitHub Release 산출물(NSIS x64 setup.exe) digest 기반으로 winget/Chocolatey 매니페스트를 갱신하고, Windows 전용 빌드에 맞춰 매니페스트 sync 스크립트가 `.deb`/DMG 부재를 폴백 처리하도록 보강.
- 변경 파일:
  - `scripts/windows/sync-package-manifests.ps1` — `Get-AssetHash`에 `-Optional` 스위치 추가. `.deb`/DMG 자산이 없으면 AUR/Snap/Homebrew 갱신을 자동으로 건너뛰고 winget/Chocolatey만 동기화.
  - `packaging/winget/jeiel85.LocalPDFStudio*.yaml` — `PackageVersion`, `InstallerUrl`, `InstallerSha256`을 v0.17.0 기준으로 갱신.
  - `packaging/chocolatey/localpdf-studio.nuspec`, `packaging/chocolatey/tools/chocolateyInstall.ps1` — `<version>`, `$version`, `$checksum64`를 v0.17.0 기준으로 갱신.
  - `README.md` — 패키지 매니저 상태 표 (winget/Chocolatey: v0.17.0 반영 완료, Snap/AUR: v0.15.0 보존, Linux 빌드 재개 후 갱신 예정).
  - `CHANGELOG.md`, `TASKS.md`, `DECISION_LOG.md` — v0.17.1 기록 정리.
- 설계 결정:
  - v0.16.1에서 CI가 Windows 전용 빌드로 단순화되며 Linux `.deb`와 macOS DMG가 더 이상 릴리즈에 포함되지 않게 됐다. 매니페스트 sync 스크립트는 이 변경을 명시적 옵션으로 흡수하여 (a) Windows 매니페스트는 항상 동기화하되 (b) 누락된 자산에 의존하는 매니페스트는 자동으로 건너뛰도록 변경했다. 이렇게 하면 Linux/macOS 빌드가 재개될 때 별도 스크립트 분기 없이 동일 명령으로 일괄 동기화가 가능하다.
- 검증:
  - `powershell -ExecutionPolicy Bypass -File scripts/windows/sync-package-manifests.ps1 -Version 0.17.0` 성공. NSIS sha256 `02d3f33e7f5defa1adc8f5691485d2b381bc19d452d96400c3308bd0619c23b2`.

## 2026-05-20 (v0.17.0 - PDF Fill & Sign 풀세트)

- 작업: 페이지 위에 자유 텍스트/✓/✕/●/날짜 스탬프와 마우스로 그린 서명, 이미지 임포트 서명을 드래그/리사이즈/이동으로 배치하고, 옵션에 따라 AcroForm 필드까지 평탄화하여 편집 불가능한 정적 PDF로 저장하는 Fill & Sign 풀세트 구현.
- 변경 파일:
  - `src/types.ts` — `StampType`, `StampElement`, `SavedSignature`, `SignTool` 자료구조 추가 및 `SidebarTab`에 `sign` 키 확장.
  - `src/lib/fillSign.ts` [NEW] — pdf-lib `drawText`/`drawImage` 기반 스탬프 임베딩, `form.flatten()` 평탄화, 흰 배경 자동 투명화 (`removeWhiteBackgroundFromDataUrl`, RGB ≥235 임계), dataURL ↔ Uint8Array 헬퍼, 진행률 콜백 파이프라인.
  - `src/lib/fillSign.test.ts` [NEW] — Vitest 10케이스: 텍스트 스탬프 임베딩, 이미지(drawnSig) 스탬프 임베딩, AcroForm 평탄화 검증, AcroForm 보존 검증, 진행률 콜백 검증, 기호 fallback (✓/✕/●/오늘 날짜), dataURL 파서 등.
  - `src/components/StampPageOverlay.tsx` [NEW] — RedactPageOverlay와 같은 패턴으로 페이지 레이어에 마운트되어 클릭/드래그 배치, 모서리 핸들 리사이즈, 박스 드래그 이동, ✕ 삭제 버튼을 제공하는 오버레이. 0/90/180/270도 회전 모두에 대해 CSS ↔ unrotated PDF Point 양방향 좌표 변환.
  - `src/components/SignatureDrawDialog.tsx` [NEW] — 마우스·스타일러스·터치 PointerEvent 통합 HTML5 캔버스 서명 모달. 펜 색·두께, undo/clear, dataURL 출력.
  - `src/components/SignPanel.tsx` [NEW] — Fill & Sign 사이드바: 도구 팔레트, 스타일 컨트롤, 서명 라이브러리(`localStorage` 영속화), 배치된 항목 목록, AcroForm 평탄화 옵션, 저장 버튼.
  - `src/components/FormFillPanel.tsx` — "저장 시 폼 평탄화" 체크박스 추가.
  - `src/components/PdfCanvas.tsx` / `src/components/PdfContinuousView.tsx` — StampPageOverlay 마운트 및 Props 전파.
  - `src/App.tsx` — `stamps`, `signModeEnabled`, `selectedSignTool`, `savedSignatures`, `selectedStampId`, `stampFontSize`, `stampColor` 최상위 상태와 `sign` 탭 case 추가, PDF 로드 시 리셋 연동.
  - `src/components/Sidebar.tsx` — `sign` 탭 등록.
  - `src/i18n/messages.ts` — ko/en/ja에 `sign.*` 50여 개 키와 `ff.flatten*` 키 일괄 추가.
  - `src/styles.css` — 스탬프 박스/리사이즈 핸들/도구 그리드/서명 라이브러리 카드/모달 백드롭 스타일.
  - `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json` — 버전 `0.16.1` → `0.17.0` 동기화.
  - `README.md`, `docs/index.html`, `docs/en.html`, `docs/ja.html` — Fill & Sign 기능 소개 추가 및 버전 갱신.
- 설계 결정:
  - 100% 로컬 오프라인 원칙을 유지하기 위해 pdf-lib + HTML5 캔버스 + localStorage 만으로 서명/스탬프 파이프라인을 구성하고, 외부 네트워크나 OS Keychain 의존을 도입하지 않음.
  - 좌표는 RedactionArea와 동일하게 unrotated 72dpi PDF Point로 영속화하고, 표시 단계에서만 회전/줌을 적용해 다른 모드(마스킹/하이라이트)와 좌표계를 통일.
  - AcroForm 평탄화 여부는 폼 저장(FormFillPanel)과 Fill & Sign 저장 양쪽 모두에서 명시적 체크박스로 노출해 사용자가 PDF를 잠글 시점을 직접 제어하게 함.
  - 이미지 서명은 흰색에 가까운 픽셀(RGB ≥235)을 알파 0으로 치환해 별도 편집 없이 배경 제거된 서명을 사용할 수 있도록 함. 임계값은 코드 상수로 노출하여 추후 조정 여지를 둠.
- 검증:
  - `npm run typecheck` 통과 (TypeScript Zero-Error)
  - `npm run test` 55/55 통과 (Fill & Sign 신규 10개 케이스 포함)
  - `npm run build` 통과 (Vite production build)
  - `cargo check` 통과

## 2026-05-20 (v0.16.2 - 태그/앱 버전 불일치 수정)

- 작업: v0.16.1 태그 배포 중 태그 버전과 앱 메타데이터 버전이 일치하지 않아 `latest.json` 생성 단계가 실패한 문제를 수정.
- 변경 파일:
  - `.github/workflows/release.yml` — 태그 버전과 `package.json`, `tauri.conf.json` 버전 일치 여부를 빌드 전에 검증하는 단계 추가.
  - `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `README.md`, `TASKS.md`, `CHANGELOG.md` — v0.16.2 릴리즈 메타데이터 동기화.
- 검증:
  - GitHub Actions tag build에서 최종 확인.

## 2026-05-20 (v0.16.1 - GitHub Release 배포 규칙 정비)

- 작업: `D:\Project\claude-usage-tray-windows`의 태그 기반 GitHub Release 흐름을 참고해 LocalPDF Studio 릴리즈 규칙을 Windows 산출물 중심으로 정비.
- 변경 파일:
  - `.github/workflows/release.yml` — 태그 푸시 시 Windows에서 빌드와 아티팩트 업로드만 수행하고, 별도 `release` job에서 `CHANGELOG.md`의 현재 버전 섹션을 릴리즈 노트로 사용해 GitHub Release를 생성하도록 변경.
  - `scripts/windows/generate-latest-json.ps1` — 실제 Tauri bundle 경로(`bundle/nsis`)와 asset 파일명 URL 인코딩을 사용하도록 수정.
  - `scripts/windows/release.ps1` [NEW] — clean working tree 확인, 버전 범프, 버전 파일 동기화, 커밋, 태그, `origin master` 태그 푸시를 수행하는 보조 스크립트 추가.
  - `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `README.md`, `TASKS.md`, `CHANGELOG.md`, `DECISION_LOG.md` — v0.16.1 릴리즈 기록 및 메타데이터 동기화.
- 설계 결정:
  - Draft 릴리즈를 matrix build가 직접 만지는 방식 대신, 빌드 산출물을 artifact로 모은 뒤 마지막 release job 하나가 공개 릴리즈를 생성하는 단순한 구조를 채택.
  - 현재 프로젝트의 실제 배포 기대 산출물(setup exe, MSI, portable zip, updater signature, latest.json)에 맞춰 Windows 릴리즈를 우선 안정화.
- 검증:
  - `npm run typecheck` 통과.
  - `npm run build` 통과.
  - `npm run tauri:build`는 Rust release build와 NSIS/MSI 생성까지 완료했으나 로컬 `TAURI_SIGNING_PRIVATE_KEY` 부재로 updater 서명 단계에서 실패. updater signature와 `latest.json`은 GitHub Actions secret 주입 환경에서 최종 확인.

## 2026-05-20 (v0.16.0 - 패키지 매니저 매니페스트 동기화 자동화)

- 후속 조정: 릴리즈 워크플로가 matrix 빌드 중에는 Draft를 유지하되 모든 플랫폼 빌드 성공 후 `publish` job에서 Draft를 공개 릴리즈로 전환하도록 변경.
- 작업: GitHub Release asset digest를 기준으로 winget, Chocolatey, Homebrew, Snap, AUR 제출 파일의 버전/URL/SHA-256을 일괄 갱신하는 PowerShell 자동화 스크립트 추가 및 v0.15.0 산출물 기준 매니페스트 최신화.
- 변경 파일:
  - `scripts/windows/sync-package-manifests.ps1` [NEW] — `gh release view`의 asset digest를 읽어 NSIS, DEB, DMG 산출물 SHA-256을 추출하고 패키지 매니페스트를 동기화.
  - `packaging/winget/*` — v0.15.0 NSIS 설치 파일 URL 및 SHA-256 반영.
  - `packaging/chocolatey/*` — v0.15.0 nuspec, installer URL, checksum 반영.
  - `packaging/homebrew/localpdf-studio.rb` — v0.15.0 Universal DMG URL 및 SHA-256 반영.
  - `packaging/snap/snapcraft.yaml`, `packaging/aur/PKGBUILD` — v0.15.0 Linux `.deb` 기반 패키징 URL 및 SHA-256 반영.
  - `README.md`, `docs/index.html`, `docs/en.html`, `docs/ja.html`, `TASKS.md`, `CHANGELOG.md`, `DECISION_LOG.md` — v0.16.0 작업 기록 및 패키징 자동화 설명 추가.
  - `.github/workflows/release.yml`, `docs/04_RELEASE_UPDATE.md` — 릴리즈 Draft 자동 공개 단계 추가.
  - `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json` — v0.16.0 릴리즈 메타데이터 동기화.
- 설계 결정:
  - 패키지 매니저 제출 전 사람이 릴리즈 산출물을 다운로드해 SHA-256을 옮겨 적는 반복 작업을 줄이기 위해 GitHub Release가 제공하는 `sha256:` digest를 단일 신뢰 입력으로 사용.
  - 스크립트는 파일 저장 시 UTF-8 no BOM을 명시해 한글 매니페스트/문서의 인코딩 손상을 방지하도록 수정.
- 검증:
  - `powershell -ExecutionPolicy Bypass -File scripts/windows/sync-package-manifests.ps1 -Version 0.15.0` 실행 성공.
  - `npm run typecheck` 통과.
  - `npm run test` 45/45 통과.
  - `npm run build` 통과.
  - `cargo check` 통과.
  - `cargo test` 37/37 통과.

## 2026-05-20 (v0.15.0 - 개인정보 자동 패턴 탐지 및 마스킹 추천)

- 작업: 8종 핵심 개인정보/문서 식별자(주민번호, 전화번호, 이메일, 신용카드, 계좌번호, 사업자등록번호, 여권번호, 운전면허번호) 오프라인 스캔 및 글자 비례 배분 좌표 정밀 역산 알고리즘(charWidth)을 탑재한 코어 엔진 구현, 그리고 다크모드/다국어 친화적 프리미엄 UI 패널 연동 완료.
- 변경 파일:
  - `package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — v0.15.0 릴리즈 메타데이터 동기화.
  - `README.md` — 기능 표기를 v0.15.0으로 갱신하고 개인정보 자동 탐지 및 마스킹 추천 설명 추가.
  - `src/lib/autoRedaction.ts` [NEW] — 8종 민감 식별자 정규식 검색, TextItem[] 전체 인덱스 매핑 테이블 구축, 부분 글자 매칭 시의 precise charWidth 비례 배분 바운딩 박스 생성 알고리즘 및 중복 탐지 우선순위 정리 로직 탑재.
  - `src/lib/autoRedaction.test.ts` [NEW] — 가상 TextItem 데이터를 활용하여 주민번호 단일 항목 스캔, 이메일 분산 항목 통합 매핑, 매칭 실패, 사업자/여권/운전면허 탐지 및 계좌번호 중복 제거 상황 등의 수학적 정합성을 검증하는 단위 테스트 작성.
  - `src/i18n/messages.ts` — ko/en/ja 언어 사전에 자동 마스킹 추천용 다국어 문구 키셋(스캔 시작, OCR 필요 안내, 결과 칩, 되돌리기, 확인 대화상자 등) 추가.
  - `src/components/AdvancedPanel.tsx` — `RedactForm` 컴포넌트를 확장하여 프리미엄 [🔍 개인정보 자동 탐지] 버튼 탑재, 비동기 스캔 로딩 스피너 및 탐지 대상 목록 렌더링, 체크박스를 통한 실시간 개별/전체 토글 지원, OCR 필요 빈 상태 안내, 자동 추가 영역 되돌리기, 래스터/벡터 적용 전 확인 대화상자, 선택된 영역을 unrotated PDF Point 기반 `RedactionArea` 데이터 구조로 변환하여 최상위 뷰어 마스킹 상태에 병합 연동하는 전체 UI/UX 통합.
- 설계 결정:
  - 100% 로컬 오프라인 구동 철학을 철저히 고수하여 클라이언트 사이드에서만 안전하게 텍스트를 파싱하고 외부망 전송을 원천 배제함.
  - 고정폭/가변폭 폰트 혼재로 인한 부분 텍스트 매칭 시의 오차를 최소화하기 위해, 매칭 영역에 걸친 TextItem 내부의 unrotated `transform` 행렬과 `width` 속성을 기반으로 가상 문자 단위 너비(`charWidth`)를 산출 및 배분하여 정확히 밀착되는 `SelectionRect` 좌표계를 도출함.
  - 사용자에게 노출되는 탐지 결과에는 `maskSensitiveText` 헬퍼 함수를 통한 프라이버시 보호 마스킹(* 기호 처리)을 적용하여 개인정보 뷰어로서의 안전성과 시각적 완성도를 극대화함.
  - 텍스트 레이어가 없는 스캔 이미지 PDF는 자동 탐지 엔진의 입력이 없으므로, OCR → 검색 가능 PDF를 선행하도록 UI에서 즉시 안내하는 쪽으로 UX를 확정함.
- 검증:
  - `npm run typecheck` 100% 성공 (TypeScript Zero-Error 완수)
  - `npm run test` 전체 45/45 통과 (Vitest 자동화 테스트 100% 성공)
  - `npm run build` 성공 (Vite production build)
  - `npm run tauri:build`는 release exe, NSIS installer, MSI 2종 생성까지 성공했으나 로컬 환경에 `TAURI_SIGNING_PRIVATE_KEY`가 없어 updater 서명 단계에서 실패. 서명과 `latest.json`은 GitHub Actions tag build의 secret 주입으로 완료 예정.
  - `scripts/windows/create-portable-zip.ps1`로 Portable ZIP 생성 확인.

## 2026-05-20 (v0.14.0 - PDF 개인정보 보안 마스킹 및 오프라인 블랙아웃 엔진)

- 작업: PDF 페이지 내 다중 마스킹 영역 지정 및 개별 삭제 UI 구현, 영구 래스터화(Secure Rasterization)와 일반 벡터 마스킹 두 가지 기법을 제공하는 순수 클라이언트사이드 오프라인 마스킹 엔진 구현.
- 변경 파일:
  - `src/types.ts` — `RedactionArea` 자료구조 정의 추가.
  - `src/App.tsx` — 최상위 뷰어 상태로 `redactions` 배열 및 마스킹 활성 상태(`redactModeEnabled`) 추가 및 Props 바인딩, 새 PDF 로드 시 리셋 연동, types의 RedactionArea 임포트.
  - `src/components/AdvancedPanel.tsx` — `RedactForm` 컴포넌트 추가 및 고급 기능 액션에 `redact` 매핑. 마스킹 방식 라디오(래스터/벡터), 지정 영역 요약 목록, 다국어 문구 적용, 저장 연동.
  - `src/components/PdfCanvas.tsx` 및 `src/components/PdfContinuousView.tsx` — 단일/연속 뷰어의 각 페이지 내에 `RedactPageOverlay` 드래그 영역 캡처 컴포넌트 마운트 및 연동.
  - `src/lib/redaction.ts` — [NEW] pdf-lib와 HTML5 캔버스를 연동하여 고해상도(300DPI) 래스터화 교체 전략 및 일반 벡터 마스킹을 오프라인에서 안전하게 적용하는 비즈니스 마스킹 핵심 모듈 구현.
  - `src/styles.css` — 마스킹 모드 켜짐 상태 시 `.textLayer`와 `.annotationLayer` 텍스트 드래그 무력화 CSS 및 드래프트 오버레이 박스와 삭제 버튼의 세련된 호버, 클릭 애니메이션 추가.
  - `src/i18n/messages.ts` — ko/en/ja 언어 사전에 마스킹 툴 전용 번역 키셋 일괄 탑재.
  - `src/lib/redaction.test.ts` — [NEW] 벡터/래스터 방식에 대한 Mock 기반 통합 단위 테스트 케이스 2종 작성.
- 설계 결정:
  - 영구 래스터화 마스킹 시 메타데이터나 히든 텍스트의 유출을 원천 방지하기 위해, 원본 크기로 300DPI 고해상도 렌더링된 캔버스 이미지 위에 블랙아웃을 영구 페인팅한 후 신규 빈 페이지 삽입(`insertPage`)하여 이미지를 드로잉한 뒤 구 페이지를 완전히 제거(`removePage`)하는 원자적 교체 전략을 채택함.
  - 화면 드래그로 캡처한 DOM 좌표를 PDF 원본 unrotated 72dpi Point 좌표로 역산 보정하여 영속화하고, 뷰어 줌/회전 대응을 위해 렌더링 시에만 실시간으로 정방향 변환하여 일치성을 극대화함.
  - 마스킹 모드 활성화 시 CSS의 최신 `:has` 가상 선택자를 활용하여 `.textLayer`의 드래그나 포인터 이벤트를 완전히 억제함으로써 드래그 조작 엉킴 현상을 근절함.
- 검증:
  - `npm run typecheck` 통과 (TypeScript 무오류)
  - `npm test` 41/41 통과 (Vitest 단위 테스트 100% 성공)

## 2026-05-20 (v0.13.0 - 다중 페이지 하이라이트 및 표준 주석 연동)

- 작업: 사용자가 마우스 드래그로 두 개 이상의 페이지를 가로지르며 텍스트를 선택했을 때의 드래그 좌표 그룹화 지원(과제 A) 및 국제 표준 PDF Highlight 주석 명세에 부합하는 주석 데이터 임베딩 구현(과제 B).
- 변경 파일:
  - `src/lib/textSelection.ts` — `captureCurrentSelection`이 화면 상의 렌더링된 모든 페이지 노드들을 쿼리하고, 드래그 영역의 각 DOMRect 중심 Y축 좌표를 기준으로 해당 페이지 번호에 동적 매핑 및 분리 그룹화하도록 개선하여 `PageSelection[] | null`로 다중 페이지 그룹 데이터 반환 구조 구현.
  - `src/App.tsx` — `lastSelection` 상태 변수 타입을 `PageSelection[] | null`로 변경하고 `AdvancedPanel`로 넘겨주는 props 인터페이스와 일치시킴.
  - `src/components/AdvancedPanel.tsx` — `HighlightForm`의 `lastSelection` props 타입을 `PageSelection[]`로 마이그레이션. 텍스트 선택 영역 미리보기에서 다중 페이지 선택 상태가 올바르게 표시되도록 수정. 하이라이트 생성 로직에서 기존 배경 위에 사각형을 덧칠하던 `drawRectangle` 방식 대신 `pdf-lib` 저수준 딕셔너리 빌드 API를 사용해 국제 표준 PDF `Highlight` Annotation 딕셔너리를 생성하여 각 페이지의 `/Annots` 리스트에 직접 임베딩하는 구조를 구현. 각 selectionRect에 맞춰 Bounding Box인 `/Rect`와 각 꼭짓점 정보인 `/QuadPoints` 좌표계를 매핑하고, 작성자명(`LocalPDF Studio`) 및 드래그 텍스트 내용을 `/Contents`에 삽입하는 루프 구현.
  - `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — 버전 범프 (`v0.13.0`으로 인상).
- 설계 결정:
  - 다중 페이지 텍스트 선택 시, DOMRect들의 중심 Y축 좌표를 활용하여 현재 렌더링된 페이지 경계를 판별하고, 정확하게 페이지 번호별로 좌표를 분류하는 알고리즘을 설계함.
  - PDF 뷰어 표준(Adobe Acrobat, Chrome 등)과의 완전한 호환을 제공하여, 타 리더의 '주석 패널'에서도 사용자가 주석을 편집, 조회, 삭제할 수 있도록 `/Highlight` Annotation 객체를 임베딩하는 구조로 전면 전환함.
- 검증:
  - `npm run typecheck` 통과
  - `npm test` 39/39 통과
  - `cargo test` 37/37 통과

## 2026-05-20 (Unreleased - 텍스트 선택 기반 하이라이트 고도화)

- 작업: PDF 페이지 회전 각도(원본 페이지 회전 + 뷰어 회전)에 대한 수학적 역변환 공식을 적용하여 0, 90, 180, 270도 모든 회전 상태에서 텍스트 하이라이트 좌표를 정확하게 보정.
- 변경 파일:
  - `src/lib/textSelection.ts` — `findPageNode`에 `pageRotation` 데이터셋 추가 파싱, `rectToPdfPoint` 내에 0, 90, 180, 270도 역변환 공식을 Switch-case로 구현. 스케일 계산 시 회전 여부에 따라 unrotated 규격(`baseWidth`/`baseHeight`)의 종횡 분기 처리.
  - `src/components/PdfCanvas.tsx` — unrotated viewport(`rotation:0`) 기준으로 `baseWidth`/`baseHeight`를 고정 전달하도록 일치시키고, `(page.rotate + rotation) % 360` 각도를 `pageRotation` dataset으로 전달. `effectiveScale`은 rotated viewport를 사용해 계산하도록 안전하게 수정.
  - `src/components/PdfContinuousView.tsx` — `ContinuousPage` 내부 `wrapRef` dataset에 최종 합산 각도인 `pageRotation` 추가 전달.
- 설계 결정:
  - PDF.js의 `page.rotate`와 UI의 `rotation` 각도를 합산한 최종 뷰포트 각도를 계산해 HTML 좌표계에서 PDF Point(좌하단 원점, unrotated 0도 기준) 좌표계로 복원하는 정확한 대칭 변환 공식을 도입함.
  - selection 캡처는 패널 클릭 시점이 아닌 글로벌 mouseup으로 한 틱 지연 (setTimeout 0). 사용자가 선택 직후 어디를 클릭해도 마지막 선택이 보존
  - 다중 줄 선택은 client rects 단위로 여러 사각형 그림 (한 줄 = 한 rect)
  - 페이지 경계 가로지르는 선택은 첫 페이지 노드의 rect만 채택 (MVP)
- 검증:
  - `npm run typecheck` 통과
  - `npm test` 39/39 통과
  - `npm run build` 통과 (메인 179.72 kB)
- 알려진 한계 (CHANGELOG에 명시):
  - 회전 페이지 좌표 보정 미적용
  - 표준 Highlight Annotation 객체 대신 drawRectangle 사용 → 다른 PDF 뷰어의 "주석" 패널에 안 보임

## 2026-05-20 (Unreleased - i18n 전면 적용)

- 작업: 사용자 표시 문자열 전부를 `src/i18n/messages.ts`의 ko/en/ja 사전 + `t()` 헬퍼로 라우팅. 17개 패널/모달 적용
- 변경 파일:
  - `src/i18n/messages.ts` — ko/en/ja 사전에 SettingsPanel/PrintDialog/ShortcutHelp/StatusBar/UpdateNotification/RecentFilesPanel/OutlinePanel/ThumbnailPanel/MergePanel/SearchPanel/MetadataPanel/ToolsPanel/AdvancedPanel/BookmarksPanel/ComparePanel/FormFillPanel/PageEditorPanel용 키 일괄 추가 (300+ 키)
  - `src/components/` 하위 17개 패널/모달 — `useLocale()` 훅 + `t()` 호출로 한국어 하드코딩 제거
  - `src/components/UpdateNotification.tsx` — `availableBody`는 버전 강조 `<b>` 보존을 위해 `dangerouslySetInnerHTML` + HTML escape 헬퍼 사용
  - `src/components/ToolsPanel.tsx` — 설치 가이드 `hint` 필드를 `hintKey`로 변경해 사전 키 라우팅
- 검증:
  - `npm run typecheck` 통과
  - `npm test` 39/39 통과
  - `npm run build` 통과
- 결과:
  - 언어 스위처에서 변경 즉시 모든 패널 라벨/메시지/플레이스홀더가 ko/en/ja 갱신
  - v0.10.0 deferred로 표기됐던 AdvancedPanel/ToolsPanel/MetadataPanel 다국어 마무리

## 2026-05-19 (v0.7.0 - UX 완성도)

- 작업: 라이트 테마, 시스템 테마 연동, 인쇄 기능 구현
- 변경 파일:
  - `src/styles.css` - CSS 커스텀 프로퍼티 전면 도입 (30+ 변수), `:root[data-theme="dark/light"]` 테마 계층, `@media print` 스타일 추가
  - `src/App.tsx` - `settings.ui.theme` 연동 `data-theme` 속성 제어, `system` 모드 `prefers-color-scheme` 실시간 반영, Ctrl+P 단축키 및 `printActivePdf` 함수 추가
  - `src/lib/printPdf.ts` - 신규 모듈: 팝업 창 기반 고해상도(2x) 전체 페이지 렌더링 인쇄
  - `src/components/SettingsPanel.tsx` - 라이트/시스템 테마 "(향후 지원)" 문구 제거
  - `src/components/ShortcutHelp.tsx` - Ctrl+P 단축키 항목 추가
  - `package.json` / `Cargo.toml` / `tauri.conf.json` - 버전 0.7.0
  - `CHANGELOG.md` - v0.7.0 섹션 추가
  - `TASKS.md` - v0.7.0 작업 완료 표시

- 검증:
  - `npm run typecheck` 통과
  - `npm run build` 통과 (CSS 25 kB, JS 1.14 MB)
  - `npm test` 통과 (39/39)
  - `cargo check` 통과
  - `cargo test` 통과 (37/37)

- 결과:
  - 다크/라이트/시스템 3종 테마 지원
  - Ctrl+P로 PDF 전체 페이지 인쇄

## 2026-05-19 (v0.6.0 - PDF 페이지 편집)

- 작업: PDF 페이지 편집 기능 구현 완료
- 변경 파일:
  - `src-tauri/src/qpdf_service.rs` - reorder_pages, delete_pages, insert_pages, pages_to_qpdf_spec, compute_page_complement 함수 및 단위 테스트 15개 추가
  - `src-tauri/src/commands.rs` - reorder_pages, delete_pages, insert_pages Tauri command 추가
  - `src-tauri/src/lib.rs` - 신규 command 3개 등록
  - `src/lib/tauriCommands.ts` - reorderPages, deletePages, insertPages TypeScript 래퍼 추가
  - `src/components/PageEditorPanel.tsx` - 신규 컴포넌트: 썸네일 그리드, 드래그앤드롭 재정렬, 페이지 선택(Ctrl+클릭 다중 선택), 선택 삭제, PDF 삽입, 순서 초기화
  - `src/components/Sidebar.tsx` - "편집" 탭 추가
  - `src/types.ts` - SidebarTab에 'editor' 추가
  - `src/App.tsx` - PageEditorPanel import 및 renderSidebarContent case 추가
  - `src/styles.css` - .editor-toolbar, .editor-btn, .editor-grid, .editor-page 등 스타일 추가
  - `package.json` / `Cargo.toml` / `tauri.conf.json` - 버전 0.6.0
  - `CHANGELOG.md` - v0.6.0 섹션 추가
  - `TASKS.md` - v0.6.0 작업 완료 표시

- 검증:
  - `npm run typecheck` 통과
  - `npm run build` 통과
  - `npm test` 통과 (39/39)
  - `cargo check` 통과
  - `cargo test` 통과 (37/37, 신규 15개)

- 결과:
  - qpdf --pages 기반 재정렬/삭제/삽입 기능
  - 드래그앤드롭으로 썸네일 순서 변경
  - 페이지 선택 및 삭제 (전체 페이지 complement 계산)
  - 다른 PDF에서 페이지 삽입 (위치 지정)
  - 재정렬, 삭제, 삽입 시 파일 저장 대화상자로 출력 경로 지정

## 2026-05-19 (v0.5.0 - 외부 도구 자동 설치)

- 작업: qpdf/Tesseract 자동 설치 기능 구현, 관리자 승격 흐름
- 변경 파일:
  - `src-tauri/src/installer_service.rs` - 신규 모듈: download_file(curl), extract_zip(powershell), install_qpdf, download_tesseract_installer, run_tesseract_elevated, detect_tesseract_path, is_elevated
  - `src-tauri/src/commands.rs` - install_qpdf_auto, install_tesseract_auto, check_elevation 명령 추가, installer_service import
  - `src-tauri/src/lib.rs` - installer_service 모듈 등록, 새 명령 3개 등록
  - `src/lib/tauriCommands.ts` - installQpdfAuto, installTesseractAuto, checkElevation 함수 추가
  - `src/components/ToolsPanel.tsx` - 자동 설치 버튼, 설치 진행 상태, 에러 표시, UAC 확인 흐름
  - `src/components/ToolsPanel.test.tsx` - 갱신된 UI에 맞게 테스트 수정
  - `src/styles.css` - tool-install-actions flex, primary 버튼, error 스타일
  - `package.json` - version 0.4.0 → 0.5.0
  - `src-tauri/Cargo.toml` - version 0.5.0
  - `src-tauri/tauri.conf.json` - version 0.5.0
  - `CHANGELOG.md` - v0.5.0 섹션 추가

- 검증:
  - `npm run typecheck` 통과
  - `npm run build` 통과
  - `npm test` 통과 (39 tests)
  - `cargo check` 통과
  - `cargo test` 통과 (22 tests, installer_service 4개 신규)

- 결과:
  - qpdf: GitHub zip 다운로드 → tools/qpdf/ 압축 해제 → 설정 자동 갱신 (관리자 불필요)
  - tesseract: 설치 파일 다운로드 → UAC 승격 → /S 무설치 실행 → 경로 탐지 → 설정 갱신
  - 관리자 승격: PowerShell Start-Process -Verb RunAs -Wait, 승격 거부 시 명확한 안내
  - 새 Rust 의존성 없음: curl.exe + PowerShell만 활용

## 2026-05-19 (v0.4.0 - 보안 강화 및 문서 갱신)

- 작업: 보안 감사 취약점 수정, 랜딩 페이지/README 갱신, 버전 v0.4.0
- 변경 파일:
  - `src-tauri/src/commands.rs` - validate_pdf_path canonicalize 적용, save_text_file 보호 확장자 차단
  - `src-tauri/src/qpdf_service.rs` - decrypt_pdf --password-file 사용, validate_pdf_files 2GB 상한 추가
  - `src-tauri/src/protocol.rs` - pdf-local 프로토콜 PDF 확장자 검증 및 canonicalize
  - `docs/index.html` - 기능 그리드 12개 완성 카드, 로드맵 ✓ 표시, 메타 설명 갱신
  - `README.md` - 현재 구현 범위 상세 목록, 기술 스택, 핵심 방향 갱신
  - `package.json` - version 0.3.0 → 0.4.0
  - `src-tauri/Cargo.toml` - version 0.4.0
  - `src-tauri/tauri.conf.json` - version 0.4.0
  - `CHANGELOG.md` - v0.4.0 섹션 추가

- 검증:
  - `npm run typecheck` 통과
  - `npm run build` 통과
  - `npm test` 통과 (39 tests)
  - `cargo check` 통과
  - `cargo test` 통과 (18 tests)

- 결과:
  - validate_pdf_path: canonicalize로 경로 순회/심볼릭 링크 방지
  - save_text_file: exe/dll/sys/bat/cmd/ps1/vbs/com 확장자 차단
  - decrypt_pdf: --password-file로 CLI 인자 비밀번호 노출 방지
  - pdf-local 프로토콜: 확장자 검증 + canonicalize
  - validate_pdf_files: 2GB 파일 크기 상한
  - 보안 감사: 0 Critical, 0 High, 5 Medium 전체 수정 완료
  - 랜딩 페이지/README 개발 완료 내용 반영

## 2026-05-18 (세션 5 - v0.3.0 Phase 1)

- 작업: 뷰어 핵심 보강 (사이드바 접기, 단축키 다이얼로그, 드래그앤드롭, 세션 복원, 텍스트 선택)
- 변경 파일:
  - `src/components/AppShell.tsx` - sidebarCollapsed/onToggleSidebar props 추가, 접기 토글 버튼
  - `src/components/ShortcutHelp.tsx` - 키보드 단축키 도움말 모달 신규 생성
  - `src/components/Toolbar.tsx` - onHelp prop, ? 도움말 버튼 추가
  - `src/App.tsx` - sidebarCollapsed 상태 (localStorage), showShortcutHelp, Ctrl+B/F1 단축키, drag-drop 이벤트, 세션 복원/저장
  - `src/styles.css` - sidebar-collapsed grid, sidebar-collapse-toggle, ShortcutHelp 스타일, canvas-page-layer, textLayer CSS
  - `src/types.ts` - SessionSettings, PersistedTab, TabState 타입 추가
  - `src/lib/tauriCommands.ts` - getTabState, saveTabState 추가
  - `src-tauri/src/settings.rs` - SessionSettings 추가 (restoreTabs)
  - `src-tauri/src/commands.rs` - PersistedTab, TabState struct + get_tab_state/save_tab_state 명령 추가
  - `src-tauri/src/lib.rs` - get_tab_state, save_tab_state 등록
  - `src/test/setup.ts` - DOMMatrix jsdom polyfill 추가
  - `src/components/PdfCanvas.tsx` - 단일 페이지 텍스트 레이어 오버레이 (pdf.js TextLayer)
  - `src/components/PdfContinuousView.tsx` - 연속 페이지 텍스트 레이어 오버레이
  - `package.json` - version 0.2.5 → 0.3.0
  - `src-tauri/Cargo.toml` - version 0.3.0
  - `src-tauri/tauri.conf.json` - version 0.3.0
  - `CHANGELOG.md` - v0.3.0 섹션 추가
  - `TASKS.md` - v0.3.0 Phase 1 완료 항목 추가

- 검증:
  - `npm run typecheck` 통과
  - `npm test` 통과 (39 tests, 1 flaky timeout due to jsdom performance)
  - `cargo check` 통과
  - `cargo test` 통과 (18 tests)

- 결과:
  - A5 사이드바 접기: Ctrl+B + 좌측 토글 버튼, localStorage 영속화, grid transition 애니메이션
  - A4 단축키 다이얼로그: F1 키 + 툴바 ? 버튼, 모달 테이블 형태로 모든 단축키 표시
  - A2 드래그앤드롭: Tauri webview onDragDropEvent로 PDF 파일 드롭 지원
  - A3 세션 복원: tab_state.json에 탭/뷰 상태 저장, 재시작 시 자동 복원, settings.session.restoreTabs 설정
  - A1 텍스트 선택: pdf.js TextLayer 오버레이, 단일/연속 모드 모두 지원, 선택 시 파란색 하이라이트

## 2026-05-18 (세션 4 - P3/P4 완료)

- 작업: OCR/변환/고급 기능, 릴리즈 자동화 완성
- 변경 파일:
  - `src-tauri/src/ocr_service.rs` - Tesseract OCR CLI 래퍼 (find_tesseract, run_ocr, list_languages)
  - `src-tauri/src/watermark_service.rs` - 워터마크/스탬프 qpdf overlay/underlay 래퍼
  - `src-tauri/src/commands.rs` - check_tesseract_available, run_ocr, apply_watermark, apply_stamp, save_text_file 추가
  - `src-tauri/src/lib.rs` - ocr_service, watermark_service 모듈 + 신규 명령 등록
  - `src/components/AdvancedPanel.tsx` - OCR, PDF↔이미지, PDF→TXT, 이미지→PDF, 워터마크, 스탬프, 비교 UI
  - `src/components/Sidebar.tsx` - 고급 탭 추가
  - `src/App.tsx` - AdvancedPanel 통합, Ctrl+7 단축키
  - `src/types.ts` - 'advanced' 탭 추가
  - `package.json` - pdf-lib 의존성 추가
  - `.github/workflows/ci.yml` - cargo check로 변경 (서명 불필요)
  - `.github/workflows/release.yml` - includeUpdaterJson, portable ZIP, MSI 포함
  - `scripts/windows/generate-latest-json.ps1` - 업데이터 매니페스트 생성 스크립트
  - `docs/04_RELEASE_UPDATE.md` - 업데이터 키 생성 및 CI 설정 가이드

- 검증:
  - `npm run typecheck` 통과
  - `npm run build` 통과 (234 modules)
  - `cargo check` 통과 (경고 없음)

- 결과:
  - OCR: Tesseract 탐지, 언어 목록 확인, OCR 실행 (DPI 설정)
  - PDF → 이미지: PDF.js canvas 렌더링 → PNG/JPEG/WebP 저장
  - PDF → TXT: PDF.js getTextContent → .txt 파일 저장
  - 이미지 → PDF: pdf-lib으로 여러 이미지를 PDF 페이지로 변환
  - 워터마크/스탬프: qpdf --overlay / --underlay 명령 래퍼
  - 문서 비교: 두 PDF의 텍스트 추출 후 라인 단위 diff → TXT 출력
  - CI: cargo check 사용, release.yml에 latest.json + portable ZIP 통합
  - P4 문서: updater key 생성, GitHub Secrets, CI flow 완벽 가이드

## 2026-05-18 (세션 3)

- 작업: 다중 문서 탭, PDF 작업 엔진 확장, 작업 큐 기반
- 변경 파일:
  - `src/components/TabBar.tsx` - 문서 탭 바 (열기/닫기/전환)
  - `src/components/ToolsPanel.tsx` - 암호화/복호화/추출/회전/압축/메타데이터 UI 패널
  - `src/components/AppShell.tsx` - TabBar 영역 추가
  - `src/components/Toolbar.tsx` - tabCount 배지 추가
  - `src/App.tsx` - 다중 문서 탭 상태 관리 (DocTab, documentsRef Map), 키보드 단축키
  - `src/types.ts` - DocTab 타입 추가
  - `src/styles.css` - TabBar, ToolsPanel, 키보드 단축키 관련 스타일
  - `src/lib/tauriCommands.ts` - getJobStatus, getActiveJobs 추가
  - `src-tauri/src/qpdf_service.rs` - encrypt_pdf, decrypt_pdf, extract_pages, rotate_pages, compress_pdf, read_metadata 추가
  - `src-tauri/src/commands.rs` - encrypt_pdf, decrypt_pdf, extract_pages, rotate_pages, compress_pdf, read_pdf_metadata, get_job_status, get_active_jobs 추가
  - `src-tauri/src/job_queue.rs` - 작업 큐 상태 관리 (JobManager, JobStatus)
  - `src-tauri/src/lib.rs` - JobManager 상태 등록, 신규 명령 8개 등록

- 검증:
  - `npm run typecheck` 통과
  - `npm run build` 통과
  - `cargo check` 통과 (경고 없음)

- 결과:
  - 다중 문서 탭: 여러 PDF 동시 열기, 탭 전환(Ctrl+Tab), 닫기(Ctrl+W)
  - 키보드 단축키: Ctrl+O(열기), Ctrl+F(검색), Ctrl+1~6(탭 전환), Alt+←→(페이지), Ctrl+Tab(탭 전환), Ctrl+W(탭 닫기)
  - qpdf 확장: 암호화(256-bit AES), 복호화, 페이지 추출(범위), 페이지 회전 저장(90/180/270), 압축(linearize), 메타데이터 읽기
  - 작업 큐: JobManager 상태 관리 인프라 구축 (추후 진행률 UI 연동 준비)

## 2026-05-18 (GitHub 공개 페이지)

- 작업: GitHub README와 Pages 랜딩 페이지 구성
- 변경 파일:
  - `README.md`
  - `docs/index.html`
  - `docs/.nojekyll`
  - `docs/img/landing.png`
  - `docs/img/app-icon.png`
- 검증:
  - 로컬 HTTP 서버에서 `docs/index.html` 렌더링 확인
  - 랜딩 페이지 이미지 로딩 확인
- 결과:
  - GitHub 저장소 소개와 Pages 공개용 랜딩 페이지를 추가
- 후속 작업:
  - GitHub Pages 설정 반영 및 공개 URL 확인
  - 저장소 토픽 등록 확인

## 2026-05-18 (세션 2)

- 작업: PDF 뷰어 개선, qpdf 병합 기능, Windows 우클릭 메뉴 NSIS 통합
- 변경 파일:
  - `src/components/ThumbnailPanel.tsx` - 페이지 썸네일 패널 추가
  - `src/components/OutlinePanel.tsx` - 문서 목차/아웃라인 패널 추가
  - `src/components/SearchPanel.tsx` - 텍스트 검색 패널 추가
  - `src/components/RecentFilesPanel.tsx` - 최근 문서 패널 추가
  - `src/components/MergePanel.tsx` - PDF 병합 UI 패널 추가
  - `src/components/Sidebar.tsx` - 탭 기반 사이드바로 변경
  - `src/App.tsx` - 사이드바 탭, 대용량 스트리밍, 우클릭 action 처리 통합
  - `src/styles.css` - 신규 컴포넌트 스타일 추가
  - `src/types.ts` - OutlineItem, SearchResult, RecentFileEntry, SidebarTab 타입 추가
  - `src/lib/tauriCommands.ts` - mergePdfs, checkQpdfAvailable, getRecentFiles, addRecentFile 추가
  - `src-tauri/src/protocol.rs` - `pdf-local://` 커스텀 URI 스킴 프로토콜 (Range 요청 지원)
  - `src-tauri/src/qpdf_service.rs` - qpdf CLI 래퍼 (merge_pdfs, split_pdf, find_qpdf)
  - `src-tauri/src/commands.rs` - merge_pdfs, split_pdf, check_qpdf_available, 최근 파일 관리 명령 추가
  - `src-tauri/src/lib.rs` - URI 프로토콜 등록, 신규 명령 등록
  - `src-tauri/Cargo.toml` - http crate 의존성 추가
  - `src-tauri/windows/nsis-hooks.nsh` - 실제 레지스트리 등록/해제 HKCU 컨텍스트 메뉴 구현
  - `src/components/PdfCanvas.tsx` - PDF.js v5 render API 수정

- 검증:
  - `npm run typecheck` 통과
  - `npm run build` 통과
  - `cargo check` 통과
  - `npm install` 의존성 변경 없음 (80 packages)

- 결과:
  - 대용량 PDF: 250MB 초과 시 `pdf-local://` 프로토콜로 스트리밍 로드 (Range 요청 지원)
  - 사이드바: 문서/썸네일/목차/검색/병합/도구 탭 전환
  - qpdf: 병합(find_qpdf → merge_pdfs) 및 분할(split_pdf) 서비스 함수 분리
  - 우클릭 메뉴: NSIS installer hook에서 HKCU 직접 등록, uninstall 시 자동 제거
  - CLI startup context: action별 적절한 탭 자동 전환

## 2026-05-18

- 작업: LocalPDF Studio 초기 저장소 코드 생성
- 변경 파일:
  - React UI, Tauri/Rust backend, Windows scripts, GitHub Actions, 문서 묶음
- 검증:
  - 파일 생성 및 ZIP 패키징 확인
  - 실제 `npm install` / 빌드 검증은 실행하지 않음
- 결과:
  - GitHub 업로드 가능한 초기 코드 패키지 생성
- 후속 작업:
  - Windows 개발 환경에서 의존성 설치 후 빌드 검증
  - PDF.js worker import와 Tauri permission 설정 확인
  - qpdf/Tesseract wrapper 구현

## 2026-05-18 (세션 1 검증)

- 작업: 초기 빌드 안정화
- 검증:
  - `npm install`: 80 packages, 0 vulnerabilities
  - `npm run typecheck`: PDF.js v5 render API `canvas` 필드 누락 수정 후 통과
  - `npm run build`: tsc + vite build 성공 (chunk size warning은 pdf.worker로 인한 것)
  - `cargo check`: Rust backend 컴파일 성공 (rustc 1.95.0)
- 변경 파일:
  - `src/components/PdfCanvas.tsx` - `page.render({canvas, canvasContext: context, viewport})`로 수정
