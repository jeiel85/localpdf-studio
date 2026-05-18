# DECISION_LOG.md

## 2026-05-18 - GitHub Pages 랜딩

- 결정: GitHub Pages는 `docs/` 폴더의 정적 HTML을 사용한다.
- 이유: 기존 설계 문서 위치와 GitHub Pages의 branch/docs 배포 방식이 잘 맞고, 별도 빌드 파이프라인 없이 공개 페이지를 유지할 수 있다.
- 대안: React 앱 빌드 결과를 Pages에 배포하거나 별도 `gh-pages` 브랜치를 운영한다.
- 결과: `docs/index.html`과 `docs/img` 이미지 자산을 Pages 진입점으로 사용한다.

## 2026-05-18 - 초기 기술 스택

- 결정: Tauri 2 + React + TypeScript + Rust를 기본 스택으로 사용한다.
- 이유: Windows 데스크톱 앱, 설치 파일, 자체 업데이트, Rust 기반 로컬 파일 처리에 적합하다.
- 대안: Electron, .NET/WPF, Qt.
- 결과: 앱 크기와 보안 경계를 고려해 Tauri를 우선한다.

## 2026-05-18 - PDF 뷰어 엔진

- 결정: 초기 뷰어는 `pdfjs-dist`를 사용한다.
- 이유: 웹 UI와 잘 맞고 라이선스 활용성이 높다.
- 한계: 매우 큰 PDF는 base64 IPC 방식이 비효율적이다.
- 후속: custom protocol 또는 chunk streaming 구조로 전환한다.

## 2026-05-18 - PDF 조작 엔진

- 결정: 병합/분할/암호화/구조 조작은 qpdf wrapper로 시작한다.
- 이유: CLI 기반 통합이 단순하고 라이선스 리스크가 낮다.
- 후속: 기능별 Rust abstraction을 만들고 외부 바이너리 경로 설정 UI를 제공한다.

## 2026-05-18 - Windows 우클릭 메뉴

- 결정: Phase 1은 HKCU registry 기반 context menu 스크립트로 시작한다.
- 이유: 구현 난도가 낮고 설치 권한 부담이 작다.
- 한계: 다중 파일 선택 처리 UX는 제한적이다.
- 후속: SendTo 및 ExplorerCommand COM extension을 검토한다.
