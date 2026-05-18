# LocalPDF Studio

![LocalPDF Studio landing preview](docs/img/landing.png)

LocalPDF Studio는 광고, 계정, 클라우드 업로드 없이 PDF를 열고 정리하고 변환하는 Windows 우선 데스크톱 PDF 앱입니다. 파일은 사용자의 PC 안에서 처리하는 것을 기본 원칙으로 하며, Tauri 기반의 가벼운 데스크톱 경험과 Rust 기반 로컬 PDF 작업 계층을 함께 가져갑니다.

[GitHub Pages 랜딩 페이지](https://jeiel85.github.io/localpdf-studio/)에서 제품 소개 화면을 볼 수 있습니다.

## 핵심 방향

- 로컬 우선: PDF 내용은 기본적으로 외부 서버로 전송하지 않습니다.
- Windows 우선: 설치 파일, MSI, Portable ZIP, 우클릭 메뉴, 자동 업데이트까지 고려합니다.
- 빠른 데스크톱 UI: Tauri 2, React, TypeScript, Rust로 앱 크기와 응답성을 관리합니다.
- PDF 작업 확장: 보기, 탐색, 병합, 분할, OCR, 내보내기 기능을 단계적으로 구현합니다.
- 배포 자동화: GitHub Actions와 Tauri updater 기반 릴리즈 흐름을 준비합니다.

## 현재 구현 범위

- Tauri 2 + React + TypeScript + Rust 기반 데스크톱 앱 구조
- PDF 파일 선택 및 PDF.js 기반 렌더링
- 페이지 이동, 확대/축소, 회전, 사이드바 레이아웃
- Rust command 계층과 PDF 작업 서비스 골격
- qpdf / Tesseract 외부 도구 상태 확인 골격
- Windows 우클릭 메뉴 등록/해제 PowerShell 스크립트
- NSIS / MSI / Portable ZIP 배포 구조 초안
- Tauri updater 기반 자체 업데이트 설정 초안
- GitHub Actions CI / 릴리즈 워크플로 초안
- GitHub Pages용 제품 랜딩 페이지

> 참고: qpdf, Tesseract, OCR, 병합/분할/압축/암호화 기능은 구조와 진입점이 준비되어 있으며, 실제 완성 구현은 `TASKS.md` 순서대로 진행합니다.

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
