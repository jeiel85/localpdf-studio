# CHANGELOG.md

## v0.16.1 - 2026-05-20

GitHub Release 배포 규칙을 태그 기반 단일 릴리즈 생성 흐름으로 정비.

### Changed
- `.github/workflows/release.yml`을 Windows 빌드 아티팩트 생성 job과 GitHub Release 생성 job으로 분리.
- 릴리즈 노트는 현재 태그 버전의 `CHANGELOG.md` 섹션에서 자동 추출하도록 변경.
- `tauri-action`의 matrix별 Draft Release 직접 조작을 제거하고, `softprops/action-gh-release`가 최종 산출물을 한 번에 게시하도록 변경.
- Windows 릴리즈 산출물 기준을 NSIS setup exe, MSI, updater signature, Portable ZIP, `latest.json`으로 명확화.
- `scripts/windows/generate-latest-json.ps1`의 bundle 경로와 다운로드 URL 생성을 실제 Tauri 산출물 이름 기준으로 수정.
- 참고 프로젝트와 같은 태그 푸시 중심 배포를 위해 `scripts/windows/release.ps1` 릴리즈 보조 스크립트 추가.
- 앱 릴리즈 메타데이터를 v0.16.1로 동기화.

### Verification
- `npm run typecheck`: 통과.
- `npm run build`: 통과.
- `npm run tauri:build`: Rust release build 및 NSIS/MSI 생성 완료 후 로컬 `TAURI_SIGNING_PRIVATE_KEY` 부재로 updater 서명 단계 실패. CI tag build에서 secret 주입 후 최종 산출물 생성 예정.

---

## v0.16.0 - 2026-05-20

패키지 매니저 제출 준비를 자동화하고 v0.15.0 릴리즈 산출물 기준 매니페스트를 최신화.

### Added
- **패키지 매니저 매니페스트 동기화 스크립트** (`scripts/windows/sync-package-manifests.ps1`): GitHub CLI로 릴리즈 asset digest를 조회해 winget, Chocolatey, Homebrew, Snap, AUR 제출 파일의 버전/URL/SHA-256을 일괄 갱신.

### Changed
- `packaging/winget`, `packaging/chocolatey`, `packaging/homebrew`, `packaging/snap`, `packaging/aur` 제출 파일을 v0.15.0 릴리즈 산출물 기준으로 갱신.
- 패키지별 제출 README의 수동 SHA 계산 안내를 동기화 스크립트 중심으로 보강.
- 릴리즈 워크플로에 모든 플랫폼 빌드 성공 후 Draft 릴리즈를 공개로 전환하는 `publish` job 추가.
- 앱 릴리즈 메타데이터를 v0.16.0으로 동기화.

### Verification
- `scripts/windows/sync-package-manifests.ps1 -Version 0.15.0`: GitHub Release asset digest 조회 및 매니페스트 갱신 성공.
- `npm run typecheck`: 통과.
- `npm run test`: 45/45 통과.
- `npm run build`: 통과.
- `cargo check`: 통과.
- `cargo test`: 37/37 통과.

---

## v0.15.0 - 2026-05-20

오프라인 로컬 우선 PDF 개인정보 자동 패턴 탐지 및 마스킹 추천 (Auto-Redaction) 기능 구현 완료.

### Added — 개인정보 자동 패턴 탐지 및 추천 엔진
- **코어 스캔 엔진 개발** ([`src/lib/autoRedaction.ts`](src/lib/autoRedaction.ts)): 5대 개인정보 핵심 패턴(주민등록번호, 휴대전화번호, 이메일 주소, 신용카드 번호, 계좌번호)에 사업자등록번호, 여권번호, 운전면허번호를 더해 8종 민감 식별자를 100% 로컬 오프라인에서 스캔하는 엔진 탑재.
- **중복 탐지 정리**: 계좌번호처럼 넓은 정규식과 사업자등록번호 같은 구조화 식별자가 겹치는 경우 우선순위 기반 dedupe로 더 구체적인 유형을 표시.
- **정밀 문자 비례 배분 좌표 환산 공식**: `pdf.js`가 추출하는 `TextItem`의 `transform` 배열과 `width` 속성을 파싱하여, 텍스트 일부분만 개인정보 패턴에 일치하는 경우에도 정확한 가상 문자 너비(`charWidth`)를 산출 및 배분하여 정확히 밀착되는 `SelectionRect` 바운딩 박스 생성 알고리즘 구현.
- **단위 테스트 통과** ([`src/lib/autoRedaction.test.ts`](src/lib/autoRedaction.test.ts)): 주민번호 단일 탐지, 여러 TextItem에 걸쳐 쪼개진 이메일 주소의 통합/매핑, 매칭 없음 등 3대 시나리오에 대한 수학적 정합성을 검증하는 단위 테스트 통과.

### Added — 프리미엄 추천 UI/UX 확장
- **자동 마스킹 추천 패널 확장** ([`src/components/AdvancedPanel.tsx`](src/components/AdvancedPanel.tsx)): `RedactForm` 컴포넌트 내에 프리미엄 **[🔍 개인정보 자동 탐지]** 액션 버튼 추가.
  - **스캔 진행 인디케이터**: 비동기 텍스트 추출 중 물결치는 Spinner 애니메이션과 로딩 텍스트를 연동하여 시각적 만족도 극대화.
  - **마스킹 추천 리스트업**: 탐지된 결과를 주민번호(보라), 전화번호(청록), 이메일(오렌지), 신용카드(로즈), 계좌번호(에메랄드) 등 HSL 기반 다채로운 배지와 함께 다크모드 특화 카드 리스트로 렌더링.
  - **프라이버시 아스테리스크 보호**: 사용자 화면에 노출되는 개인정보를 아스테리스크 기호(`*`)로 영리하게 필터링(`maskSensitiveText`)하여 표시.
  - **체크박스 및 병합**: 전체 선택/해제 및 개별 토글을 통해 최종 확정된 영역을 unrotated PDF Point 기반 `RedactionArea` 데이터 구조로 변환하여 기존 마스킹 목록에 누적/병합 연동 구현.
  - **OCR 필요 안내 및 되돌리기**: 텍스트 레이어가 없는 스캔 이미지 PDF에서는 OCR → 검색 가능 PDF를 먼저 실행하도록 빈 상태 안내를 제공하고, 자동 탐지로 방금 추가한 영역을 되돌릴 수 있는 안전 장치 추가.
  - **마스킹 적용 전 확인**: 래스터화/벡터 마스킹의 보안 차이를 저장 직전에 확인하여 파괴적 작업을 명확히 고지.
- **다국어 리소스 적용** ([`src/i18n/messages.ts`](src/i18n/messages.ts)): ko, en, ja 언어 사전에 신규 번역 텍스트 일괄 탑재.

### Verification
- `npm run typecheck`: 통과 (TypeScript 컴파일 에러 Zero)
- `npm run test`: 전체 45/45 테스트 통과 (Vitest 100% 성공)
- `npm run build`: 통과 (Vite production build)
- `npm run tauri:build`: Windows exe/NSIS/MSI 산출물 생성 확인. 로컬 updater 서명은 `TAURI_SIGNING_PRIVATE_KEY` 부재로 CI tag build에서 완료 예정.

---

## v0.14.0 - 2026-05-20

오프라인 로컬 우선 PDF 개인정보 보안 마스킹 (개인정보 보호 블랙아웃) 기능 구현 완료.

### Added — PDF 개인정보 보안 마스킹 (블랙아웃) 기능

- **마스킹 드래그 캡처 및 화면 매핑** ([`src/components/PdfCanvas.tsx`](src/components/PdfCanvas.tsx) & [`src/components/PdfContinuousView.tsx`](src/components/PdfContinuousView.tsx)): 단일 및 연속 뷰어의 각 페이지 내부에 `RedactPageOverlay` 컴포넌트를 설계하여 드래그 좌표 캡처 구현.
  - **좌표 보정 및 역산**: 줌 배율(`scale`) 및 회전 각도(`rotation`)에 관계없이 드래그한 좌표를 unrotated 72dpi PDF Point 좌표로 완벽하게 복원하여 저장하고, 렌더링 시에는 실시간 보정 계산을 통해 위치 일치성을 보장.
  - **드래프트 및 UI**: 빗금 무늬의 붉은 반투명 블랙아웃 상자로 드래프트 상태 시각화. 개별 상자 삭제를 위해 호버 시 scale up 트랜지션이 적용되는 ✕(삭제) 버튼 컴포넌트 장착.
- **오프라인 보안 마스킹 엔진** ([`src/lib/redaction.ts`](src/lib/redaction.ts)): `pdf-lib`과 HTML5 캔버스를 로컬 결합하여 처리하는 순수 클라이언트사이드 오프라인 마스킹 엔진 설계 및 구현.
  - **영구 래스터화 마스킹 (Secure Rasterization)**: 마스킹할 페이지를 원본 크기 300DPI 고해상도로 캔버스에 렌더링하고, 마스킹 영역을 검은색으로 하드 페인팅한 후 png 바이트로 로드. 기존 페이지를 지우고 고해상도 이미지가 통째로 그려진 신규 페이지를 삽입(`insertPage`)한 다음 구 페이지를 삭제(`removePage`)하는 원자적 교체 전략을 구현하여 기존 텍스트 레이어 및 메타데이터 원천 영구 파괴 보장.
  - **벡터 마스킹**: pdf-lib `drawRectangle` API를 통해 PDF 최상위 레이어에 고속으로 검은색 사각형 영역을 페인팅하는 방식 지원.
- **UI 및 다국어 스위처 연동** ([`src/components/AdvancedPanel.tsx`](src/components/AdvancedPanel.tsx)): `RedactForm` 컴포넌트 추가 및 고급 기능 액션에 `redact` 연동. 마스킹 방식 라디오(래스터/벡터), 지정 목록 요약, 다국어 메시지(`src/i18n/messages.ts` 내 ko/en/ja 키 일괄 탑재) 및 파일 저장 API 연동.
- **드래그 조작성 및 스타일 보완** ([`src/styles.css`](src/styles.css)): 마스킹 모드 켜짐 상태 시 브라우저 텍스트 드래그 간섭을 원천 배제하기 위해 CSS `:has` 가상 선택자로 `.textLayer`와 `.annotationLayer` 무력화 처리, 드래프트 오버레이 박스 및 삭제 버튼에 세련된 애니메이션 적용.
- **단위 테스트 구축** ([`src/lib/redaction.test.ts`](src/lib/redaction.test.ts)): `applyRedactions` 비즈니스 마스킹 엔진에 대한 벡터 방식 검증 및 래스터 방식(canvas 및 drawImage flow 모킹) 검증 테스트 케이스 2종 작성 완료.

### Verification

- `npm run typecheck`: 통과 (TypeScript 무오류)
- `npm test`: 41/41 통과 (Vitest 100% 성공)

---

## v0.13.0 - 2026-05-20

다중 페이지 드래그 선택 하이라이트 지원 및 국제 표준 PDF Highlight 주석(Annotation) 규격 연동 완료.

### Added — 다중 페이지 드래그 선택 지원 (과제 A)

- **다중 페이지 캡처 알고리즘 도입** ([`src/lib/textSelection.ts`](src/lib/textSelection.ts)): `captureCurrentSelection`이 화면 상의 렌더링된 모든 페이지 노드들을 쿼리하고, 드래그 영역의 각 DOMRect 중심 Y축 좌표를 기준으로 해당 페이지 번호에 동적 매핑하여 그룹화하는 구조를 설계하여, `PageSelection[] | null` 타입으로 여러 페이지에 걸친 드래그 선택 영역을 완벽하게 수집하고 반환
- **글로벌 상태 마이그레이션** ([`src/App.tsx`](src/App.tsx)): `lastSelection` 상태 변수 타입을 `PageSelection[] | null`로 확장하여 `AdvancedPanel` 및 하위 폼에 데이터가 유실 없이 전송되도록 마이그레이션

### Added — 표준 PDF Highlight 주석(Annotation) 객체 연동 (과제 B)

- **표준 주석 객체 임베딩** ([`src/components/AdvancedPanel.tsx`](src/components/AdvancedPanel.tsx)): 기존에 PDF 페이지의 배경 콘텐츠 위에 사각형을 직접 덧그려 덧칠하는 `drawRectangle` 방식 대신, `pdf-lib` 저수준 딕셔너리 빌드 API를 사용해 각 페이지의 `/Annots` 목록에 직접 표준 Highlight Annotation 딕셔너리를 빌드하여 등록하는 구조로 전면 개편.
  - **Annotation 딕셔너리 구성**: 전체 사각형 경계를 아우르는 Bounding Box인 `/Rect`, 각 개별 사각형 영역의 꼭짓점을 지정하는 `/QuadPoints` (각 사각형별 [좌상, 우상, 좌하, 우하] 8개 좌표 조합), 색상 `/C` 및 불투명도 `/CA`(0.4), 작성자명 `/T`(`LocalPDF Studio`), 드래그된 주석 텍스트 `/Contents` 등을 표준 양식으로 주입.
  - **뷰어 완벽 호환성 확보**: 이를 통해 생성된 하이라이트 PDF 문서는 **Adobe Acrobat, Chrome 브라우저 내장 뷰어, Edge, macOS Preview** 등 모든 정식 PDF 리더기의 '주석/Annotation 패널'에서 정상적으로 조회, 편집, 삭제, 덧글 작성이 가능.
- **다중 페이지 렌더링 지원 및 UI 갱신**:
  - `lastSelection` props 타입을 `PageSelection[]` 배열로 마이그레이션.
  - 텍스트 선택 미리보기 레이블에 선택된 다중 페이지 목록과 총 사각형 갯수가 직관적으로 표현되도록 고도화.
  - `run()` 함수 내에서 다중 페이지 선택 데이터에 대해 순차적으로 루프를 돌며 각각의 `/Highlight` 주석 객체를 삽입하도록 보완.

### Verification

- `npm run typecheck`: 통과 (TypeScript 컴파일 무오류)
- `npm test`: 39/39 통과 (Vitest 프론트엔드 테스트 100% 성공)
- `cargo test`: 37/37 통과 (Tauri Rust 백엔드 단위 테스트 100% 성공)

---

## v0.12.0 - 2026-05-20

텍스트 선택 기반 하이라이트 기능 페이지 회전 좌표계 보정 완료.

### Added — 하이라이트 회전 보정

- **페이지 회전 좌표계 변환 공식 도입** ([`src/lib/textSelection.ts`](src/lib/textSelection.ts)): PDF.js의 `page.rotate`와 뷰어의 `rotation` 각도가 최종 합산된 `pageRotation`(0도, 90도, 180도, 270도)에 맞춰, 텍스트 선택 픽셀 좌표를 회전하지 않은 PDF 원본 Point(좌하단 원점) 좌표로 정확하게 매핑하는 수학적 역산 공식 구현
- [`PdfCanvas`](src/components/PdfCanvas.tsx) (단일): unrotated viewport(`rotation: 0`) 기준으로 `baseWidth`/`baseHeight`를 전달하도록 구조를 일치시키고, 최종 합산 각도인 `pageRotation`을 dataset에 추가 전송. `effectiveScale` 계산 시에는 뷰어의 `rotation`을 고려하도록 수정
- [`PdfContinuousView`](src/components/PdfContinuousView.tsx) (연속): `ContinuousPage` 내부 `wrapRef` dataset에 최종 합산 각도 `pageRotation`을 추가 전달

### Verification

- `npm run typecheck`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: `src-tauri` 내에서 정상 통과
- `cargo test`: 37/37 통과 (Tauri Rust 단위 테스트)

---

## v0.11.0 - 2026-05-20

i18n 마무리 라운드 + 텍스트 선택 기반 하이라이트 MVP.

### Added — 텍스트 선택 기반 PDF 하이라이트 (MVP)

- 새 모듈 [`src/lib/textSelection.ts`](src/lib/textSelection.ts): `window.getSelection()`의 client rects를 페이지 노드의 `data-base-width`/`data-base-height` dataset 기반으로 PDF point 좌표로 변환
- [`PdfCanvas`](src/components/PdfCanvas.tsx) (단일) + [`PdfContinuousView`](src/components/PdfContinuousView.tsx) (연속) 두 뷰 모두 페이지 컨테이너에 `data-page-index` + `data-base-width` + `data-base-height` 부착
- [`App.tsx`](src/App.tsx): 글로벌 `mouseup` 리스너로 마지막 PDF 텍스트 선택을 캡처해 `lastSelection` 상태로 보존
- [`AdvancedPanel`](src/components/AdvancedPanel.tsx) `HighlightForm`에 **"적용 방식" 선택** 추가:
  - **텍스트 선택 영역 (정확한 위치)** — 캡처된 selection rect들에 정확히 색상 박스. 줄 단위 다중 영역 지원
  - **페이지별 색상 띠 (전체 폭)** — 기존 v0.9.0 방식 보존
- ko/en/ja 사전에 `adv.hl.mode*` / `selectionInfo` / `noSelection` 키 추가

### Known limitations

- 회전된 페이지 (rotation ≠ 0)에서는 PDF 좌표 변환이 어긋남 (baseWidth/Height가 unrotated 기준)
- 페이지 경계를 가로지르는 selection은 첫 페이지의 rect만 적용
- pdf-lib `drawRectangle` 기반이라 다른 PDF 뷰어의 "주석" 패널에는 표시되지 않음 (시각적 색상 박스만). 표준 Highlight Annotation API 마이그레이션은 차기 라운드

### Added — i18n 전면 적용

- 사용자 표시 문자열을 모두 `t()` 라우팅으로 전환. ko/en/ja 사전 일괄 확장 (300+ 키)
- 적용 패널: SettingsPanel, PrintDialog, ShortcutHelp, StatusBar, UpdateNotification, RecentFilesPanel, OutlinePanel, ThumbnailPanel, MergePanel, SearchPanel, MetadataPanel, ToolsPanel, AdvancedPanel(전 11개 폼), BookmarksPanel, ComparePanel, FormFillPanel, PageEditorPanel
- v0.10.0 deferred 항목인 AdvancedPanel/ToolsPanel/MetadataPanel 다국어 적용 마무리. 이로써 모든 UI 패널이 언어 스위처에 즉시 반응
- `useLocale()` 훅을 각 패널에 연결해 언어 변경 시 즉시 리렌더 (구독 패턴 활용)

### Verification

- `npm run typecheck`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `npm run build`: 통과 (메인 번들 179.72 kB / pdfjs 414.93 kB / pdf-lib 428.66 kB / react-vendor 192.55 kB)

---

## v0.10.0 - 2026-05-20

크로스플랫폼 배포 라운드. Mac/Linux 빌드 + 패키지 매니저 5종 + 다국어 랜딩.

### Added — Cross-platform 배포

- **macOS 빌드 (Universal: Apple Silicon + Intel)**: tauri.conf.json `targets`에 `dmg`/`app` 추가. release.yml에 macos-latest 러너 + `--target universal-apple-darwin` 매트릭스. 무서명 (Apple Developer $99/년 비용 부담으로 보류). INSTALL.md에 Gatekeeper 우회 절차 명시
- **Linux 빌드 (AppImage / .deb / .rpm)**: tauri.conf.json `targets`에 `deb`/`rpm`/`appimage` 추가. release.yml에 ubuntu-22.04 매트릭스 + libwebkit2gtk-4.1 등 시스템 의존성 설치
- **CI 3-OS 매트릭스**: release.yml을 `release-windows` 단일 job → `build` strategy.matrix 3종으로 재작성. 각 플랫폼 산출물 자동 게시
- **macOS minimumSystemVersion 10.15 (Catalina)**: 안전한 하한선 설정

### Added — 패키지 매니저 매니페스트 5종

`packaging/` 디렉터리에 첫 제출 가능한 형태로 작성. SHA-256은 v0.10.0 릴리즈 게시 후 채워 PR 제출.

- **[winget](packaging/winget/)** (Windows): `jeiel85.LocalPDFStudio` 4종 매니페스트 (version/installer/locale.en/locale.ko). `winget install jeiel85.LocalPDFStudio`
- **[Chocolatey](packaging/chocolatey/)** (Windows): nuspec + `chocolateyInstall.ps1` / `chocolateyUninstall.ps1`. `choco install localpdf-studio`
- **[Homebrew Cask](packaging/homebrew/)** (macOS): Personal tap 우선, 공증 후 공식 cask 제출 가이드. `brew tap jeiel85/tap && brew install --cask localpdf-studio`
- **[Snap](packaging/snap/)** (Linux): `snapcraft.yaml` core22 + gnome extension. `sudo snap install localpdf-studio`
- **[AUR](packaging/aur/)** (Arch/Manjaro): `localpdf-studio-bin` PKGBUILD (.deb 언패킹). `yay -S localpdf-studio-bin`

각 디렉터리에 제출 절차 + 자동화 GitHub Actions 스니펫 포함.

### Added — 다국어

- **i18n 영어/일본어 사전 대폭 확장**: Toolbar/TabBar/Sidebar/PrintDialog/공통 표현. `useLocale()` 훅으로 언어 변경 즉시 반영 (구독 패턴)
- **브라우저 언어 자동 감지**: `navigator.language` 기준으로 초기 언어 결정 (`localStorage` 우선)
- **랜딩 페이지 다국어**: `docs/en.html` (영어), `docs/ja.html` (일본어). hreflang 메타 + 언어 스위처. 한국어 페이지에도 KO/EN/JA 스위처 추가

### Added — 문서

- **[INSTALL.md](INSTALL.md)**: 플랫폼별 설치 가이드. macOS Gatekeeper 우회 (Finder 우클릭 / `xattr` 두 가지), Linux 의존성, qpdf/Tesseract 수동 설치 명령어, 다운로드 무결성 검증
- **README** 갱신: "Windows 우선" → "Cross-platform" 재정의. 다운로드 표(플랫폼/산출물/설치) 추가. macOS 무서명 안내 명시

### Changed

- `tauri.conf.json` `bundle.targets`: `["nsis", "msi"]` → `["nsis", "msi", "deb", "rpm", "appimage", "dmg", "app"]`
- `bundle.icon`에 `icons/icon.png` 추가 (macOS/Linux 빌드용, 128x128@2x.png를 복사)
- `bundle.linux.deb.depends` 명시: `libwebkit2gtk-4.1-0`, `libgtk-3-0`
- `bundle.macOS.minimumSystemVersion`: 10.15
- release.yml `releaseBody`에 플랫폼별 다운로드 안내 추가

### Verification

- `cargo check`: 통과
- `cargo test`: 37/37 통과
- `npm run typecheck`: 통과
- `npm test`: 39/39 통과
- `npm run build`: 통과

### Known limitations

- **macOS 서명/공증**: Apple Developer Program $99/년 비용으로 미적용. 사용자 첫 실행 시 Gatekeeper 우회 필요 (INSTALL.md 안내). 사용자가 의미 있게 늘면 도입 검토
- **Windows EV 코드 서명**: 연 $300+ 비용으로 미적용. SmartScreen 경고 한 단계 우회 필요. Microsoft Store 등재($19 1회)가 더 가성비 좋아 차후 옵션
- **패키지 매니저 SHA-256**: v0.10.0 GitHub Release 게시 후 실제 해시로 교체 필요 (각 README 절차 참고)
- **첫 제출 검수 기간**: winget 1~3일, Chocolatey 2~3주, Snap Store 수 분, AUR 즉시, Homebrew Cask (tap) 즉시
- **다국어 적용 진행률**: Toolbar/Sidebar/TabBar/PrintDialog 적용. AdvancedPanel/ToolsPanel/MetadataPanel 등은 차기 라운드

---

## v0.9.0 - 2026-05-19

대규모 기능 확장 라운드. 25개 항목(A1~A6 / B1~B6 / C1~C9 / E1~E5)을 일괄 처리.

### Added — 새 기능

- **메타데이터 편집** (`MetadataPanel`, [B1](src/components/MetadataPanel.tsx)): Title/Author/Subject/Keywords/Creator/Producer를 pdf-lib로 편집·저장. 사이드바 "정보" 탭. 디지털 서명 감지 표시 ([C5](src/components/MetadataPanel.tsx))
- **PDF 폼 채우기** (`FormFillPanel`, [C6](src/components/FormFillPanel.tsx)): 텍스트/체크박스/드롭다운/라디오 필드를 자동 검색해 편집 후 저장. 사이드바 "폼" 탭
- **책갈피** (`BookmarksPanel`, [C4](src/components/BookmarksPanel.tsx)): 페이지에 책갈피 추가/이동/삭제. 앱 데이터 경로에 PDF별 저장(원본 미수정). 사이드바 "책갈피" 탭
- **분할 뷰 비교** (`ComparePanel`, [C7](src/components/ComparePanel.tsx)): 두 PDF를 좌/우 동시 표시 + 페이지별 텍스트 차이 분석 + 차이 페이지 빠른 이동. 사이드바 "비교" 탭
- **OCR → 검색 가능 PDF** ([C1](src/components/AdvancedPanel.tsx)): PDF 페이지를 이미지로 렌더 → Tesseract `pdf` 출력 → 텍스트 레이어 합성된 PDF 생성. 새 Rust 명령 `run_ocr_searchable_pdf` (list-file 기반)
- **이미지 OCR** ([C9](src/components/AdvancedPanel.tsx)): PNG/JPG/WEBP/BMP/TIFF 단일 이미지 → TXT
- **페이지별 하이라이트 (MVP)** ([C3](src/components/AdvancedPanel.tsx)): 선택 페이지에 색상 띠(노랑/초록/분홍/파랑) 추가. pdf-lib `drawRectangle`로 적용. 본격 텍스트 주석은 추후 확장 예정
- **PDF 정규화** ([C8](src/components/AdvancedPanel.tsx)): qpdf로 linearize + object stream + 미참조 리소스 제거. 새 Rust 명령 `normalize_pdf`. 완전한 PDF/A 변환은 Ghostscript가 필요해 별도 안내
- **페이지 편집기 인라인 회전** ([B4](src/components/PageEditorPanel.tsx)): 선택 페이지를 90°/-90° 회전 → 썸네일 회전 시각화 → 일괄 적용 (`rotate_pages_individually` 명령, 각도별 그룹화 후 단일 qpdf 호출)
- **자동 백업** ([E3](src/components/PageEditorPanel.tsx)): 페이지 편집기 상태(순서, 회전)를 `%APPDATA%/.../autosave/` 디렉터리에 PDF 경로 해시 기반으로 1.2초 debounce 저장. 다시 열 때 복구 프롬프트
- **인쇄 다이얼로그** ([B3](src/components/PrintDialog.tsx)): 전체/현재 페이지만/지정 페이지 선택. 시스템 인쇄 다이얼로그에서 양면·매수 추가 설정
- **검색 결과 캔버스 하이라이트** ([B2](src/components/PdfCanvas.tsx)): 검색어가 텍스트 레이어 span에 노란색 mark. 단일/연속 뷰 모두 지원, 검색어 변경 시 재렌더 없이 즉시 갱신
- **단축키 보강** ([B6](src/App.tsx)): `Ctrl+=`/`Ctrl+-` 줌, `Ctrl+0` 실제크기, `Ctrl+L` 레이아웃 토글, `Home`/`End` 첫/끝 페이지, `Ctrl+G` 페이지 이동
- **i18n 인프라** ([C2](src/i18n/messages.ts)): 한국어/영어/일본어 사전 + `localStorage` 영속. 설정에서 언어 선택. 사이드바/툴바부터 적용 (전면 적용은 점진적 진행)
- **e2e 스캐폴드** ([E4](e2e/README.md)): Playwright + Tauri WebDriver 셋업 가이드 + smoke happy-path 작성

### Added — 신규 Tauri 명령

- `save_binary_file`, `read_file_bytes`, `delete_file_if_exists`, `read_text_file_if_exists`
- `run_ocr_searchable_pdf`, `rotate_pages_individually`, `normalize_pdf`

### Changed — UX/성능

- **SearchPanel 대용량 PDF 최적화** ([A2](src/components/SearchPanel.tsx)): 25페이지 단위 incremental 결과 + `setTimeout(0)` 양보 + 취소 버튼 + 진행률 표시 (`N/M 페이지`)
- **연속 뷰 메모리 해제** ([E1/E2](src/components/PdfContinuousView.tsx)): 가시 영역 3초 이탈 시 canvas/textLayer 비워 GPU/메모리 해제
- **번들 분리** ([A6](vite.config.ts)): `manualChunks`로 pdfjs(415KB)/pdf-lib(429KB)/react-vendor(193KB)/tauri(20KB) 분리. 메인 번들 1,142KB → **114KB**
- **결과 폴더 자동 열기** ([B5](src/lib/revealOutput.ts)): `settings.output.openFolderAfterJob` 설정 ON 시 작업 완료 후 `revealItemInDir` 호출 (ToolsPanel, MetadataPanel, FormFillPanel)
- **PDF.js JavaScript 차단** ([E5](src/App.tsx)): 모든 `getDocument()` 호출에 `isEvalSupported: false` 적용 — 악성 PDF 임베디드 JS 차단

### Security

- **JSON atomic write** ([A1](src-tauri/src/commands.rs)): `recent_files.json`, `tab_state.json`, `settings.json`을 tempfile + rename으로 원자적 저장 → 동시 호출 시 손상 방지
- **`pdf-local://` CORS 제한** ([A3](src-tauri/src/protocol.rs)): `Access-Control-Allow-Origin: *` → Tauri webview origin 화이트리스트 (`tauri://localhost`, `http://tauri.localhost` 등) + `Access-Control-Allow-Headers: range`로 제한
- **PowerShell 환경변수 패턴** ([A4/S-6](src-tauri/src/installer_service.rs)): `-Command` 문자열 보간 제거. `LPDF_SRC` / `LPDF_DST` / `LPDF_EXE` 환경변수로 경로 전달해 쿼팅/이스케이프 우회 위험 제거. `-NonInteractive` 플래그 추가

### Fixed

- `PageEditorPanel.handleResetOrder`의 dead `cancelled` 변수 제거 ([A5](src/components/PageEditorPanel.tsx))

### Verification

- `cargo check`: 통과
- `cargo test`: 37/37 통과
- `npm run typecheck`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `npm run build`: 통과 (메인 113KB / pdfjs 415KB / pdf-lib 429KB / react 193KB / tauri 20KB)

### Known limitations / Deferred

- **본격 주석/하이라이트 (텍스트 선택 기반)**: 현재는 페이지별 색상 띠만. 텍스트 선택 좌표→PDF 좌표 변환과 주석 도구 UI는 차기 라운드 예정
- **완전한 PDF/A 변환**: Ghostscript 필요. 현재는 qpdf 기반 정규화만 제공
- **i18n 전면 적용**: 사이드바/툴바/설정 일부만 적용. 나머지 패널/다이얼로그는 점진적으로 추가
- **e2e 실제 실행**: 셋업/스모크 테스트 골격만 추가. `tauri-driver` + Playwright 설치 후 실행 가능

---

## v0.8.0 - 2026-05-19

### Security

- **자동 설치 SHA-256 무결성 검증**: qpdf/Tesseract 다운로드 후 사전에 임베드된 해시와 비교, 불일치 시 파일 삭제 + 에러. Tesseract는 관리자 권한 실행이므로 가장 중요한 보강
  - `qpdf 12.3.2 msvc64.zip`: `8941870a604e7c87ed24566b038d46c24ce76616254d2383c578f60c0677f202`
  - `tesseract 5.4.0.20240606 setup.exe`: `c885fff6998e0608ba4bb8ab51436e1c6775c2bafc2559a19b423e18678b60c9`
- **Tauri CSP 활성화**: `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self' blob:`, `object-src 'none'`, `frame-ancestors 'none'`. 임의 origin 스크립트/iframe/object 차단
- **경로 검증 일원화**: 모든 qpdf/ocr/watermark 명령 진입에 `validate_pdf_path`(input) + `validate_output_path`(output) 적용. 시스템 디렉터리(`%WINDIR%`, `%PROGRAMFILES%`) 출력 차단. 보호된 확장자 블랙리스트 18개로 확장(`exe/dll/sys/bat/cmd/ps1/psm1/vbs/vbe/js/jse/wsf/wsh/msi/msp/scr/com/cpl/lnk/reg/inf`)
- **암호화 비밀번호 파일 사용**: `encrypt_pdf`도 `--user-password-file` / `--owner-password-file`로 전달 (CLI 인자 노출 방지). 레거시 qpdf fallback 유지
- **임시 비밀번호 파일 무작위화**: UUID v4 + Unix에서 `0o600` 모드로 생성. PID만 사용하던 예측 가능 이름 제거
- **PowerShell/curl 호출에 `CREATE_NO_WINDOW` 적용**: `hidden_cmd` 헬퍼를 installer_service/qpdf_service/ocr_service/watermark_service에 일괄 적용. Windows 콘솔 깜빡임 제거

### Added

- **`save_binary_file` Tauri 명령**: base64 디코딩 후 바이너리 저장. PDF→이미지, 이미지→PDF 출력에 사용
- **`read_file_bytes` Tauri 명령**: 이미지/PDF 파일을 base64로 읽음 (최대 512MB). 이미지→PDF 변환의 입력 fetch 대체

### Fixed

- **PDF → 이미지 변환 깨짐**: 기존 `save_text_file`에 base64 문자열을 그대로 저장해 PNG/JPEG/WebP 파일이 외부 뷰어에서 열리지 않던 문제. `save_binary_file`로 교체
- **이미지 → PDF 변환 실패**: 이미지 fetch를 `pdf-local://` 프로토콜로 시도했지만 프로토콜이 `.pdf`만 허용해 403 응답. `read_file_bytes`로 교체
- **세션 복원 절반만 동작**: `tab_state.json`의 currentPage/scale/rotation/layout/fitMode를 viewer에 실제 적용. `loadPath(path, restoreState)` 시그니처 확장
- **활성 탭 복원 setTimeout 의존 제거**: 모든 탭 로드 결과를 모은 뒤 즉시 setActiveTabId. 0.5초 대기 동안 사용자 조작이 덮어쓰던 race 제거
- **`chrono_now()` 부정확한 날짜**: 자체 구현 윤년/달별 일수 무시 → `chrono::Utc::now()`로 교체. `recent_files.json`의 `openedAt`이 ISO-8601 UTC

### Changed

- **RenderQueue 사이드바 통합**: ThumbnailPanel / PageEditorPanel / AdvancedPanel(PDF→이미지)이 메인 캔버스와 동일한 `pdfRenderQueue` 사용. 사이드바 활성 시 메인 스크롤 끊김 회귀 제거
- `load_pdf_outline` 데드 명령 제거 (PDF.js 프론트엔드에서 처리)
- 의존성 추가: `sha2 = "0.10"`, `chrono = "0.4"` (clock, no default), `uuid = "1"` (v4)

### Verification

- `cargo check`: 통과 (경고 없음)
- `cargo test`: 37/37 통과
- `npm run typecheck`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `npm run build`: 통과 (CSS 25 kB, JS 1.14 MB)

---

## v0.7.0 - 2026-05-19

### Added

- **라이트 테마**: CSS 변수 기반 테마 시스템 도입. `:root[data-theme="dark"]` / `:root[data-theme="light"]`로 다크/라이트 전환 지원. 설정 > UI > 테마에서 변경 가능
- **시스템 테마 연동**: `system` 테마 모드 선택 시 OS의 `prefers-color-scheme` 미디어 쿼리를 실시간 반영
- **인쇄 기능 (Ctrl+P)**: PDF 문서 전체를 고해상도(2x)로 렌더링하여 인쇄. 진행률 표시. 팝업 창 기반 인쇄 흐름
- **`@media print` 스타일**: 브라우저 인쇄 시 사이드바/툴바/상태바를 자동으로 숨기고 PDF 페이지만 출력

### Changed

- `styles.css`: 30개 이상의 CSS 커스텀 프로퍼티로 색상 체계 전면 변수화
- `SettingsPanel.tsx`: 테마 선택 옵션에서 "(향후 지원)" 문구 제거, 라이트/시스템 테마 정식 지원
- `ShortcutHelp.tsx`: Ctrl+P 단축키 항목 추가

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과 (CSS 25 kB, JS 1.14 MB)
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: 통과
- `cargo test`: 37/37 통과

---

## v0.6.0 - 2026-05-19

### Added

- **PDF 페이지 편집**: 썸네일 드래그앤드롭으로 페이지 재정렬, 삭제, 다른 PDF에서 페이지 삽입
  - `reorder_pages` command: qpdf `--pages` 옵션으로 페이지 순서 변경
  - `delete_pages` command: 선택한 페이지 제거 (전체 페이지 수에서 complement 계산)
  - `insert_pages` command: 다른 PDF에서 페이지 삽입 (지정 위치 앞/뒤/중간)
  - `PageEditorPanel` 컴포넌트: 썸네일 그리드 기반 편집 UI, 드래그앤드롭 재정렬, 선택 삭제, PDF 삽입, 순서 초기화
  - `pages_to_qpdf_spec` / `compute_page_complement` 헬퍼 함수 (페이지 목록 → qpdf 범위 사양 변환)
- 사이드바에 "편집" 탭 추가

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: 통과
- `cargo test`: 37/37 통과 (qpdf_service 신규 15개 테스트 포함)

---

## v0.5.0 - 2026-05-19

### Added

- **외부 도구 자동 설치**: qpdf와 Tesseract를 앱 내에서 자동 다운로드 및 설치 지원
  - **qpdf 자동 설치**: GitHub에서 zip 다운로드 → `%APPDATA%/LocalPDF Studio/tools/qpdf/`에 압축 해제 → 설정 자동 갱신. 관리자 권한 불필요
  - **Tesseract 자동 설치**: GitHub에서 설치 파일 다운로드 → 관리자 승격(UAC) 후 무설치(`/S`) 실행 → 설치 경로 자동 탐지 → 설정 자동 갱신
  - **관리자 승격 흐름**: Tesseract 설치 시 UAC 프롬프트 안내 → `powershell Start-Process -Verb RunAs -Wait`로 승격 → 승격 거부 시 명확한 오류 안내
  - **새 Tauri 명령**: `install_qpdf_auto`, `install_tesseract_auto`, `check_elevation`

### Changed

- `ToolsPanel.tsx`: 미설치 도구 표시를 "다운로드 페이지 열기" 링크에서 "자동 설치" / "관리자 권한으로 자동 설치" 버튼 + "수동 다운로드" 버튼으로 변경
- `styles.css`: `.tool-install-actions` flex 레이아웃, `.primary` 버튼 스타일, `.tool-install-error` 에러 메시지 스타일 추가

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: 통과
- `cargo test`: 22/22 통과 (installer_service 4개 신규 테스트 포함)

---

## v0.4.0 - 2026-05-19

### Security

- **`validate_pdf_path` 경로 검증 강화**: `canonicalize()`로 경로 순회/심볼릭 링크 공격 방지
- **`save_text_file` 보호된 확장자 차단**: `.exe`, `.dll`, `.sys`, `.bat`, `.cmd`, `.ps1`, `.vbs`, `.com` 확장자로 저장 불가
- **`decrypt_pdf` 비밀번호 노출 방지**: CLI 인자 대신 `--password-file`로 임시 파일 전달
- **`pdf-local` 프로토콜 핸들러 강화**: PDF 확장자 검증 및 canonicalize 적용, 경로 순회 방지
- **`validate_pdf_files` 파일 크기 상한 추가**: 최대 2GB 제한으로 DoS 방지

### Changed

- `docs/index.html` 랜딩 페이지: 완료된 기능 목록으로 갱신 (12개 기능 카드, 로드맵 완료 ✓ 표시, CTA 문구)
- `README.md`: 현재 구현 범위 섹션을 완성된 기능 상세 목록으로 대체, 기술 스택 테이블 갱신
- 보안 감사 수행: 0 Critical, 0 High, 5 Medium 이슈 전체 수정

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: 통과
- `cargo test`: 18/18 통과

---

## v0.3.0 - 2026-05-18

### Added

- **사이드바 접기/열기**: `Ctrl+B` 단축키 또는 좌측 가장자리 화살표 버튼으로 사이드바 접기/열기 지원. 접기 상태는 localStorage에 자동 저장
- **키보드 단축키 도움말 다이얼로그**: `F1` 키 또는 툴바 우측 `?` 버튼으로 전체 단축키 목록 표시
- **파일 드래그앤드롭**: 탐색기에서 PDF 파일을 앱 창으로 드래그앤드롭하여 열기 (Tauri webview drag-drop 이벤트)
- **탭/뷰 상태 영속화**: 앱 종료 시 열려 있던 PDF, 페이지 번호, 배율, 회전, 레이아웃을 `tab_state.json`에 저장. `세션 복원` 설정 활성화 시 재시작 후 자동 복원
- **텍스트 선택/복사**: PDF.js TextLayer 오버레이를 캔버스 위에 렌더링하여 텍스트 드래그 선택 및 복사(Ctrl+C) 지원 (단일/연속 레이아웃 모두)
- **세션 복원 설정**: `settings.session.restoreTabs` 설정 추가 (기본값 true). 설정 패널에서 토글 가능

### Changed

- `AppShell` 컴포넌트에 `sidebarCollapsed` / `onToggleSidebar` props 추가
- `Toolbar` 컴포넌트에 `onHelp` prop 및 `?` 도움말 버튼 추가
- `AppSettings`에 `session` 필드 추가 (Rust + TypeScript)

## v0.2.5 - 2026-05-18

### Added

- **자동 업데이트 알림 UX 개선**: 시작 시 백그라운드로 업데이트 확인 (설정의 `update.checkOnStartup` 기준). 사용 가능 시 우하단 토스트로 안내
- **다운로드 → 재시작 분리 흐름**:
  - "지금 다운로드" → 진행률 표시 → "다운로드 완료, 재시작하면 적용됩니다"
  - "설치 및 다시 시작" 버튼으로 사용자가 재시작 시점 선택
  - "나중에" 버튼으로 토스트 닫고 작업 계속 가능 (이미 다운로드한 경우 다시 시작 시 자동 적용)
- 기존 툴바 "업데이트 확인" 버튼도 같은 토스트 흐름으로 통합
- 다운로드/설치 에러 시 토스트에 메시지 표시

### Changed

- `tauri-apps/plugin-updater`의 `downloadAndInstall()` 한 번에 처리하던 흐름 → `download()` + `install()` 분리. 사용자가 다운로드 후 즉시 재시작할지, 작업 마무리 후 재시작할지 선택 가능

---

## v0.2.4 - 2026-05-18

### CI / Release

- Tauri 자동 업데이터 서명 키 쌍 생성 및 GitHub Secrets 등록 완료. v0.2.4부터 `.sig` 파일과 `latest.json` 정상 발행 → 자동 업데이트 동작
- `tauri.conf.json` `createUpdaterArtifacts: true`로 복귀, `pubkey`에 공개키 반영
- `release.yml`에 `TAURI_SIGNING_PRIVATE_KEY` 환경변수 다시 추가, `includeUpdaterJson: true`로 변경
- `ci.yml` 트리거 브랜치 `main` → `master`로 수정 (push마다 typecheck/build/cargo check 자동 실행)
- 이전 실패 태그 v0.2.0/v0.2.1/v0.2.2 정리 (로컬 + 원격)

---

## v0.2.3 - 2026-05-18

### CI / Build

- v0.2.0~v0.2.2 release 워크플로가 Tauri 업데이터 서명 키 미설정으로 실패하던 문제 해결
- `tauri.conf.json` `createUpdaterArtifacts: false`로 임시 비활성화 (NSIS .exe / MSI / Portable ZIP은 정상 생성됨)
- `release.yml`에서 `TAURI_SIGNING_PRIVATE_KEY` 환경변수 제거, `includeUpdaterJson: false`로 변경
- 자동 업데이트 기능은 추후 서명 키 생성/등록 후 재활성화 예정 (`docs/04_RELEASE_UPDATE.md` 참고)

(v0.2.2의 모든 성능 개선 포함)

---

## v0.2.2 - 2026-05-18

### Performance

- **렌더 큐 도입** (`src/lib/renderQueue.ts`): pdf.js의 라스터화는 메인 스레드에서 수행되므로 여러 페이지가 동시에 렌더하면 스크롤·입력 이벤트가 함께 경쟁. 동시 렌더 1개로 직렬화하고, 자기 차례 전 취소된 작업은 실행하지 않도록 처리. 단일 페이지 모드와 연속 페이지 모두 이 큐를 통과
- **스크롤 중 렌더 일시 정지**: 스크롤 발생 시 `isScrolling=true`로 표시. 휠이 멈춘 후 120ms 동안 변화 없으면 정착으로 판단하고 그때 보류된 페이지를 렌더. 빠른 스크롤 시 메인 스레드가 페이지 렌더에 잡혀 있는 시간이 사라져 스크롤 자체가 부드러워짐
- **`rootMargin` 축소**: 600px → 250px. 화면에 안 보이는 페이지를 미리 그리는 범위를 줄여 동시 렌더 부하 감소
- **`ContinuousPage`를 `React.memo`로 감쌈**: 부모(`PdfContinuousView`) 재렌더 시에도 props가 같으면 페이지 컴포넌트 재렌더 차단
- **PDF.js 로더 옵션** `useSystemFonts: true` 적용: 임베디드 폰트 처리 우회로 텍스트 PDF에서 초기 파싱 시간 감소

### Tests

- `RenderQueue` 클래스 단위 테스트 4개 추가 (직렬화 / 동시성 / 큐 취소 / 실행 중 취소 신호). 총 프론트엔드 테스트 39개

---

## v0.2.1 - 2026-05-18

### Fixed

- 설정 화면의 "찾아보기" 버튼이 좁은 그리드 셀에서 한글이 한 글자씩 세로로 잘려 보이던 문제. 모든 설정 버튼에 `white-space: nowrap` 적용 및 `grid-template-columns: minmax(0, 1fr) auto auto`로 input이 우선 축소되도록 변경

### Performance

- 연속 스크롤 뷰의 초기 표시 지연을 크게 단축:
  - 기존: PDF 열면 모든 페이지에 대해 `getPage()` 직렬 호출 (239페이지 = 239번 await) 완료까지 placeholder도 안 보이고 첫 렌더가 멈춤
  - 변경: 1페이지 dim만 즉시 읽어 전체에 적용 → placeholder 그리드 즉시 표시. 각 페이지의 실제 dim은 IntersectionObserver로 스크롤 진입 시 lazy 계산
- 렌더 출력 배율(`renderQualityToScale`) "auto" 모드에 상한 1.5x 도입. 일부 환경의 `devicePixelRatio` 2.0이 캔버스를 4배 크기로 그려 GPU/메모리 부하가 컸음. 선명도는 거의 동등하나 페인트 시간이 크게 감소
- `App.tsx`의 `onPageChange` / `onFittedScale` 콜백을 `useCallback`으로 안정화하여 매 렌더 시 자식의 referential equality 깨짐 방지
- `PdfCanvas`를 `React.memo`로 감싸 props 변경 없을 때 재렌더 차단 (상태바/사이드바 업데이트로 인한 App 재렌더가 캔버스까지 전파되던 문제 해소)

---

## v0.2.0 - 2026-05-18

### Added

- **설정 화면**: 사이드바에 "설정" 탭 추가. 자동 저장. 8개 섹션 / 17개 옵션
  - 뷰어: 초기 줌 모드, 사용자 지정 배율, 휠 동작, 회전 단위, 렌더 품질, 기본 페이지 레이아웃, 기본 맞춤 모드
  - 외부 도구: qpdf/tesseract 실행 파일 경로 수동 지정 (PATH 미등록 시 fallback)
  - 출력: 기본 출력 폴더, 작업 완료 후 결과 폴더 자동 열기
  - 개인정보: 최근 파일 기록 토글, 최대 개수, 임시 파일 정리 정책, 최근 파일 일괄 삭제
  - OCR: 기본 언어 프리셋
  - 성능: 대용량 PDF 스트리밍 임계값 (10~1000 MB)
  - 업데이트: 시작 시 자동 확인 토글
  - UI: 테마(다크/라이트/시스템 — 라이트/시스템은 향후), 단축키 안내 표시
- **백엔드 settings 모듈** (`settings.rs`): JSON 영속화, 부분 업데이트 시 결손 필드 기본값 fallback
- **새 Tauri 명령**: `get_settings`, `update_settings`, `reset_settings`, `clear_recent_files`, `get_app_data_path`
- **외부 도구 패널 강화**: "다시 확인" 버튼, 버전·경로·역할 표시, 미설치 시 다운로드 가이드와 "다운로드 페이지 열기" 버튼 (시스템 브라우저), URL 복사용 박스
- **PDF 로딩 진행률 오버레이**: pdf.js `loadingTask.onProgress` 연동. % + MB/MB 표시. 스트리밍 시 indeterminate 애니메이션
- **연속 스크롤 레이아웃**: Adobe식 Continuous 모드. IntersectionObserver 기반 가상화 (보이는 영역 ±400px만 렌더). 스크롤 위치로 현재 페이지 자동 추적. 썸네일 클릭 시 해당 페이지로 자동 스크롤
- **페이지 맞춤 모드 3종**: 너비에 맞춤 (`↔`), 페이지에 맞춤 (`⤢`), 실제 크기 (`1:1`). 컨테이너 크기 기반 동적 배율 계산
- **툴바 토글 그룹**: 단일/연속 레이아웃, 너비/페이지/실제 맞춤 — active 표시 + 호버 효과
- **테스트 인프라**: Vitest + Testing Library + jsdom 셋업. Tauri invoke 모킹 패턴 (`vi.hoisted`)
- **Rust 단위 테스트**: settings, qpdf_service, ocr_service — 총 18개
- **프론트엔드 컴포넌트 테스트**: base64, ToolsPanel, SettingsPanel, Sidebar, PdfCanvas, Toolbar — 총 35개

### Fixed

- **`qpdf_service::validate_pdf_files` 1개 파일 거부 버그**: 모든 단일 파일 명령(`encrypt`, `decrypt`, `extract`, `rotate`, `compress`, `metadata`)에서 무조건 "병합할 PDF 2개 이상 필요" 오류가 나던 문제 수정. 2개 이상 검사는 `merge_pdfs` 진입부로 이동
- **뷰어 영역 스크롤 동작**: `.viewer-stage` / `.main-pane`에 `min-height: 0` 추가. CSS Grid의 `1fr` 행이 콘텐츠로 인해 늘어나면서 `overflow: auto`가 무력화되던 문제 해결
- **PdfCanvas 렌더링 루프**: `onFittedScale`/`onPageChange`/`loadProgress`가 useEffect 의존성에 들어가 매 렌더마다 effect가 재실행되며 "렌더링 중..." 메시지가 잠기고 UI가 반응하지 않던 문제. 콜백을 `useRef`로 stash하여 effect deps 제거

### Changed

- 하드코딩 값을 설정 기반으로 라우팅:
  - `MAX_INITIAL_VIEWER_LOAD_BYTES (250 MB)` → `settings.performance.streamingThresholdMb`
  - `RECENT_FILES_LIMIT (20)` → `settings.privacy.recentFilesLimit`
  - 뷰어 초기 배율 (`1.2`) → `settings.viewer.initialScale`
  - 회전 단위 (`90°`) → `settings.viewer.rotationStep`
  - PDF 초기 레이아웃 → `settings.viewer.pageLayout`
- qpdf/tesseract 탐지 로직 확장: 설정의 override 경로 우선 사용, 없으면 `which::which` fallback
- `add_recent_file`: `record_recent_files=false` 시 기록 건너뛰고 기존 목록만 반환
- 의존성 추가: `@tauri-apps/plugin-opener` (이미 Rust/capability 등록돼 있었으나 JS 패키지만 누락)
- 의존성 추가: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과 (메인 번들 1.10 MB, pdf.worker 2.16 MB)
- `npm test`: 35/35 통과 (6개 테스트 파일)
- `cargo test`: 18/18 통과
- `cargo check`: 통과 (경고 없음)

---

## v0.1.0 - 2026-05-18

### Added

- GitHub README 소개 내용을 제품 중심으로 확장
- GitHub Pages용 `docs/index.html` 랜딩 페이지 추가
- Pages에서 사용할 랜딩 이미지와 앱 아이콘 참조 파일 추가
- Tauri 2 + React + TypeScript + Rust 기반 초기 저장소 코드 추가
- PDF.js 기반 PDF 열기/렌더링 화면 추가
- 기본 앱 레이아웃, 사이드바, 툴바, 상태바 추가
- Rust command 계층 추가
- qpdf/Tesseract 외부 도구 탐지 골격 추가
- Windows 우클릭 메뉴 등록/해제 스크립트 추가
- Tauri updater 설정 초안 추가
- GitHub Actions CI/Release 워크플로 초안 추가
- 바이브 코딩용 작업 문서, 의사결정 로그, 설계 문서 추가

### Changed

- `src/components/PdfCanvas.tsx`: PDF.js v5 `page.render()` API 변경 대응 (`canvas` 필드 추가)
- `src/components/Sidebar.tsx`: 탭 기반 사이드바(문서/썸네일/목차/검색/병합/도구)로 재구현
- `src/App.tsx`: 사이드바 탭, 대용량 PDF 스트리밍, 우클릭 action 처리 통합

### Features (세션 4 - P3/P4)

- **OCR**: Tesseract CLI 레퍼 (ocr_service.rs), 언어 목록 확인, DPI 설정 OCR
- **PDF → 이미지**: PDF.js canvas 렌더링으로 PNG/JPEG/WebP 변환
- **PDF → TXT**: PDF.js getTextContent 텍스트 추출 및 .txt 저장
- **이미지 → PDF**: pdf-lib으로 여러 이미지를 PDF 페이지로 변환
- **워터마크/스탬프**: qpdf overlay/underlay 명령 래퍼 (watermark_service.rs)
- **문서 비교**: 두 PDF 텍스트 추출 후 라인 diff, TXT 출력
- **CI 개선**: cargo check 사용 (서명 불필요), release.yml에 latest.json + portable ZIP 통합
- **릴리즈 가이드**: updater key 생성, GitHub Secrets, CI flow 완벽 문서화 (docs/04_RELEASE_UPDATE.md)

### Features (세션 3)

- **다중 문서 탭**: 여러 PDF 동시 열기, TabBar로 전환, Ctrl+W 닫기, Ctrl+Tab 탭 전환
- **키보드 단축키**: Ctrl+O(열기), Ctrl+F(검색), Ctrl+1~6(탭), Alt+←→(페이지), Ctrl+Tab/W
- **PDF 암호화**: qpdf 256-bit AES 암호화 (사용자/소유자 암호 분리)
- **PDF 복호화**: 암호 입력 후 복호화 저장
- **페이지 추출**: 범위 기반 (예: 1-5, 1,3,5-7) 페이지 추출
- **페이지 회전 저장**: 90°/180°/270° 범위 지정 회전
- **PDF 압축**: qpdf linearize + object stream 최적화
- **메타데이터 읽기**: qpdf --json JSON 출력
- **작업 큐 인프라**: JobManager 상태 관리 (get_job_status, get_active_jobs)

- **대용량 PDF 스트리밍**: 250MB 초과 PDF는 `pdf-local://` 커스텀 URI 프로토콜로 Range 요청 기반 스트리밍 로드
- **페이지 썸네일**: PDF.js로 각 페이지 썸네일 생성, 클릭 시 페이지 이동
- **문서 목차**: PDF outline 추출 및 계층 표시, 페이지 번호 resolve 후 이동
- **텍스트 검색**: `getTextContent()` 기반 전문 검색, 디바운스 400ms, 결과 클릭 시 이동
- **최근 문서**: `%APPDATA%/LocalPDF Studio/recent_files.json` 기반 최대 20개 관리
- **PDF 병합**: qpdf CLI 래퍼 `qpdf_service.rs`, 입력 검증, 덮어쓰기 방지, 한글 오류 메시지
- **PDF 분할**: `split_pdf` command, 페이지별 파일 생성
- **Windows 우클릭 메뉴 통합**: NSIS installer hook (`nsis-hooks.nsh`)에서 HKCU 직접 등록/해제
- **CLI startup context**: 우클릭 메뉴 action별 적절한 사이드바 탭 자동 전환

### Verification

- GitHub Pages 랜딩 페이지를 로컬 HTTP 서버에서 렌더링하고 이미지 로딩을 확인
- `npm install`: 80 packages, 0 vulnerabilities
- `npm run typecheck`: 통과
- `npm run build`: 통과 (chunk size warning: pdf.worker 2.1MB)
- `cargo check`: 통과 (rustc 1.95.0)
- 의존성: `http = "1"` 크레이트 추가
