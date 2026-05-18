# LocalPDF Studio

LocalPDF Studio는 광고, 계정, 클라우드 업로드 없이 로컬에서 PDF를 열고 정리하고 변환하는 Windows 우선 데스크톱 PDF 앱입니다.

이 저장소는 **상용화 가능한 앱으로 확장하기 위한 초기 코드 골격**입니다. 현재 포함된 구현은 다음 범위까지 동작하도록 구성되어 있습니다.

- Tauri 2 + React + TypeScript + Rust 기반 데스크톱 앱 구조
- PDF 파일 선택 및 PDF.js 기반 렌더링
- 페이지 이동, 확대/축소, 회전, 사이드바 레이아웃
- Rust command 계층과 PDF 작업 서비스 골격
- qpdf / Tesseract 외부 도구 상태 확인 골격
- Windows 우클릭 메뉴 등록/해제 PowerShell 스크립트
- NSIS / MSI / Portable ZIP 배포 구조 초안
- Tauri updater 기반 자체 업데이트 설정 초안
- GitHub Actions CI / 릴리즈 워크플로 초안
- 바이브 코딩용 작업 문서, 설계 문서, 에이전트 규칙

> 주의: qpdf, Tesseract, OCR, 병합/분할/압축/암호화 기능은 구조와 진입점이 준비되어 있으며, 실제 완성 구현은 `TASKS.md` 순서대로 진행합니다.

## 기술 스택

```text
Desktop Shell: Tauri 2
Frontend: React + TypeScript + Vite
Backend: Rust
PDF Viewer: PDF.js via pdfjs-dist
PDF Operations: qpdf wrapper planned
OCR: Tesseract wrapper planned
Installer: Tauri NSIS / MSI
Updater: Tauri updater plugin
Primary OS: Windows 10/11 x64
```

## 빠른 시작

### 1. 요구 사항

- Node.js LTS
- Rust stable
- Windows 10/11 개발 환경
- Microsoft Edge WebView2 Runtime
- MSI 빌드가 필요하면 WiX Toolset v3

### 2. 설치

```bash
npm install
```

### 3. 개발 실행

```bash
npm run tauri:dev
```

### 4. 정적 검사 / 빌드

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
docs/                        제품/기술/배포 설계 문서
prompts/                     바이브 코딩 프롬프트
.github/workflows/           CI / release workflow
```

## 릴리즈 정책

- 버전 형식: SemVer `vX.Y.Z`
- 산출물: `setup.exe`, `.msi`, portable `.zip`, updater signature
- 태그 푸시 기준 릴리즈 자동화
- 업데이트 파일은 Tauri updater 서명 검증을 전제로 함

## 라이선스

기본 앱 코드는 Apache-2.0으로 시작합니다. 외부 바이너리와 라이브러리는 배포 전에 `docs/07_SECURITY_PRIVACY_LICENSE.md` 기준으로 재검토해야 합니다.
