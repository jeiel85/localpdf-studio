# CHANGELOG.md

## v0.1.0 - 2026-05-18

### Added

- Tauri 2 + React + TypeScript + Rust 기반 초기 저장소 코드 추가
- PDF.js 기반 PDF 열기/렌더링 화면 추가
- 기본 앱 레이아웃, 사이드바, 툴바, 상태바 추가
- Rust command 계층 추가
- qpdf/Tesseract 외부 도구 탐지 골격 추가
- Windows 우클릭 메뉴 등록/해제 스크립트 추가
- Tauri updater 설정 초안 추가
- GitHub Actions CI/Release 워크플로 초안 추가
- 바이브 코딩용 작업 문서, 의사결정 로그, 설계 문서 추가

### Verification

- 생성 시점에는 의존성 설치와 빌드를 실행하지 않았다.
- 최초 클론 후 `npm install`, `npm run typecheck`, `npm run build`, `npm run tauri:dev` 검증이 필요하다.
