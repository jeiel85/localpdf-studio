# LocalPDF Studio

![LocalPDF Studio landing preview](docs/img/landing.png)

LocalPDF Studio는 광고, 계정, 클라우드 업로드 없이 PDF를 열고 정리하고 변환하는 데스크톱 PDF 앱입니다. 파일은 사용자의 PC 안에서 처리하는 것을 기본 원칙으로 하며, Tauri 기반의 가벼운 데스크톱 경험과 Rust 기반 로컬 PDF 작업 계층을 함께 가져갑니다.

**Windows / macOS (Apple Silicon + Intel) / Linux (AppImage / .deb / .rpm)** 모두 지원합니다.
설치 가이드는 [INSTALL.md](INSTALL.md)를 참고하세요.

[GitHub Pages 랜딩 페이지](https://jeiel85.github.io/localpdf-studio/)에서 제품 소개 화면을 볼 수 있습니다.

## 다운로드

[최신 릴리즈](https://github.com/jeiel85/localpdf-studio/releases/latest)에서 OS별 산출물을 받을 수 있습니다.

| 플랫폼 | 산출물 | 설치 |
|---|---|---|
| Windows | NSIS .exe / MSI / Portable ZIP | 더블 클릭 또는 `winget install jeiel85.LocalPDFStudio` |
| macOS Universal (M1/Intel) | `.dmg` ⚠️ 무서명 | DMG 마운트 후 Applications 드래그. 첫 실행 시 우클릭→열기 (자세한 절차 [INSTALL.md](INSTALL.md#macos)) |
| Linux | AppImage / .deb / .rpm | 배포판별 패키지 또는 AppImage 직접 실행 |

> macOS 빌드는 현재 Apple Developer 서명/공증이 없어 첫 실행 시 Gatekeeper 우회가 필요합니다.
> 1인 개발자 비용 부담($99/년)으로 인해 서명은 사용자 수가 의미있게 늘면 도입할 예정입니다.

## 핵심 방향

- 로컬 우선: PDF 내용은 외부 서버로 전송하지 않습니다.
- Cross-platform: Windows (NSIS/MSI/Portable + 우클릭 메뉴 + 자동 업데이트), macOS (Universal DMG), Linux (AppImage/.deb/.rpm).
- 빠른 데스크톱 UI: Tauri 2, React 19, TypeScript, Rust로 앱 크기와 응답성을 관리합니다.
- 완성된 PDF 작업: 보기, 탐색, 병합, 분할, OCR, 변환, 암호화 기능을 갖추고 있습니다.
- 다국어: 한국어/영어/일본어 UI (i18n 적용 중).
- 배포 자동화: GitHub Actions 3-OS 매트릭스, Tauri updater 기반 릴리즈 흐름이 구축되어 있습니다.

## 현재 구현 범위

### PDF 뷰어
- PDF.js 기반 고성능 렌더링 (단일 페이지 / 연속 스크롤 레이아웃)
- 페이지 맞춤 모드 3종 (너비/페이지/실제 크기)
- 확대/축소, 회전, 텍스트 선택 및 복사
- 대용량 PDF(250MB+) 스트리밍 로드 (`pdf-local://` 커스텀 프로토콜, Range 요청)
- 렌더 큐 최적화 (스크롤 중 렌더 일시 정지, 뷰포트 가상화)
- 페이지 썸네일 사이드바, 문서 목차/아웃라인 탐색
- 전문 텍스트 검색 (디바운스 400ms)
- 최근 문서 목록 (최대 개수 설정 가능)
- 다중 문서 탭 (동시 열기, Ctrl+Tab 전환, Ctrl+W 닫기)
- 키보드 단축키 (Ctrl+O/F/B/1~6, Alt+←→, F1 도움말)

### PDF 작업 엔진 (qpdf 기반)
- PDF 병합 (드래그로 순서 변경, 입력 검증, 덮어쓰기 방지)
- PDF 분할 (페이지 단위 개별 파일)
- 페이지 추출 (범위 지정: 1-5, 1,3,5-7)
- 페이지 회전 저장 (90°/180°/270°)
- 암호 설정/해제 (256-bit AES, 사용자/소유자 암호 분리)
- PDF 압축 (linearize + object stream 최적화)
- 메타데이터 읽기 (JSON 출력)
- 작업 큐 상태 관리 인프라

### OCR / 변환 / 고급 기능
- Tesseract OCR (언어 선택, DPI 설정)
- PDF → 이미지 변환 (PNG/JPEG/WebP)
- PDF → TXT 변환 (텍스트 추출)
- 이미지 → PDF 변환 (pdf-lib)
- 워터마크/스탬프 적용 (qpdf overlay/underlay)
- 문서 비교 (텍스트 diff, TXT 출력)

### 앱 설정 (17개 옵션)
- 뷰어: 초기 줌, 배율, 휠 동작, 회전 단위, 렌더 품질, 레이아웃, 맞춤 모드
- 외부 도구: qpdf/tesseract 경로 수동 지정
- 출력: 기본 폴더, 작업 완료 후 폴더 열기
- 개인정보: 최근 파일 기록, 최대 개수, 임시 파일 정리
- OCR: 기본 언어, 성능: 스트리밍 임계값
- 업데이트: 시작 시 자동 확인, UI: 사이드바 접기, 세션 복원

### v0.3.0 뷰어 보강
- 사이드바 접기/열기 (Ctrl+B, localStorage 영속화)
- 키보드 단축키 도움말 다이얼로그 (F1)
- 파일 드래그앤드롭 (Tauri webview 이벤트)
- 탭/뷰 상태 영속화 (tab_state.json, 세션 복원)
- 텍스트 선택/복사 (pdf.js TextLayer 오버레이)

### 배포
- NSIS 설치 파일, MSI, Portable ZIP
- Windows 우클릭 메뉴 통합 (열기/병합/분할/압축/OCR/메타데이터)
- Tauri updater 자동 업데이트 (서명 검증)
- GitHub Actions CI/CD (typecheck + build + cargo check)
- GitHub Release 산출물 자동 업로드

## 기술 스택

```text
Desktop Shell: Tauri 2
Frontend:    React 19 + TypeScript + Vite 7
Backend:     Rust (edition 2021)
PDF Viewer:  PDF.js (pdfjs-dist v5)
PDF Engine:  qpdf CLI wrapper
OCR:         Tesseract CLI wrapper
Image/PDF:   pdf-lib (JS), Canvas API
Installer:   Tauri NSIS / MSI
Updater:     Tauri updater plugin (minisign)
Test:        Vitest, Rust #[test]
CI/CD:       GitHub Actions
OS:          Windows 10/11 x64
```

## 빠른 시작

### 요구 사항

- Node.js LTS
- Rust stable
- Windows 10/11 개발 환경
- Microsoft Edge WebView2 Runtime
- MSI 빌드가 필요하면 WiX Toolset v3

### 설치

```bash
npm install
```

### 개발 실행

```bash
npm run tauri:dev
```

### 정적 검사 / 빌드

```bash
npm run typecheck
npm run build
npm run tauri:build
```

## Windows 우클릭 메뉴 설치

개발 중에는 PowerShell을 관리자 권한 없이 `HKCU`에 등록합니다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/install-context-menu.ps1 `
  -ExePath "$PWD\src-tauri\target\release\localpdf-studio.exe"
```

해제:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/uninstall-context-menu.ps1
```

## 저장소 구조

```text
src/                         React UI
src-tauri/                   Rust/Tauri backend
scripts/windows/             Windows context menu scripts
docs/                        제품/기술/배포 설계 문서와 Pages 랜딩
prompts/                     바이브 코딩 프롬프트
.github/workflows/           CI / release workflow
```

## 릴리즈 정책

- 버전 형식: SemVer `vX.Y.Z`
- 산출물: `setup.exe`, `.msi`, portable `.zip`, updater signature, `latest.json`
- 태그 푸시 기준 릴리즈 자동화
- 업데이트 파일은 Tauri updater 서명 검증을 전제로 함

## 라이선스

기본 앱 코드는 Apache-2.0으로 시작합니다. 외부 바이너리와 라이브러리는 배포 전에 `docs/05_SECURITY_PRIVACY_LICENSE.md` 기준으로 재검토해야 합니다.
