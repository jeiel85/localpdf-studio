# LocalPDF Studio

**LocalPDF Studio**는 개인 사용과 공개 GitHub 포트폴리오를 동시에 목표로 하는 Windows 우선 데스크톱 PDF 앱입니다.

- 저장소명: `localpdf-studio`
- 앱 이름: `LocalPDF Studio`
- 앱 ID: `com.jeiel85.localpdfstudio`
- 기본 언어: 한국어
- 필수 보조 언어: 영어
- 대상 플랫폼 1차: Windows 10/11 x64
- 대상 플랫폼 2차: macOS, Linux
- 개발 방식: AI 에이전트 기반 바이브 코딩
- 제품 방향: 로컬 우선, 광고 없음, 계정 없음, 사용자의 PDF를 외부 서버로 전송하지 않음
- 배포 형태: Windows 설치 파일, Portable ZIP, GitHub Releases, 앱 자체 업데이트

## 핵심 목표

1. 일반 PDF 뷰어 수준을 넘어서 병합, 분할, 회전, 추출, 압축, OCR, 주석, 서명/스탬프, 메타데이터 편집, 페이지 정리까지 포함한다.
2. Windows Explorer 마우스 우클릭 메뉴에서 자주 쓰는 PDF 작업을 바로 실행할 수 있게 한다.
3. 처음부터 릴리즈, 업데이트, 테스트, 문서화, 이력 관리가 가능한 구조로 만든다.
4. 상용화 가능성을 고려하여 라이선스 리스크가 큰 구성요소를 기본 번들에서 제외한다.

## 권장 기술 스택

| 영역 | 선택 |
|---|---|
| Desktop Shell | Tauri 2 |
| Frontend | React + TypeScript + Vite |
| Backend | Rust |
| PDF Viewer | PDF.js |
| Native PDF Rendering / Thumbnail | PDFium via Rust binding |
| PDF Structural Ops | qpdf CLI 또는 qpdf 연동 레이어 |
| OCR | Tesseract OCR |
| Local DB | SQLite |
| Installer | Tauri NSIS setup.exe + MSI |
| Auto Update | Tauri updater plugin + signed GitHub Release manifest |
| CI/CD | GitHub Actions |

## 문서 구조

- `docs/00_PRODUCT_BRIEF.md`: 제품 정의
- `docs/01_FEATURE_SPEC.md`: 전체 기능 명세
- `docs/02_UI_UX_SPEC.md`: 화면 구성 및 UX
- `docs/03_ARCHITECTURE.md`: 아키텍처
- `docs/04_PDF_ENGINE_LIBRARIES.md`: PDF 엔진/라이브러리 전략
- `docs/05_WINDOWS_CONTEXT_MENU.md`: Windows 우클릭 메뉴 설계
- `docs/06_INSTALLER_UPDATE_RELEASE.md`: 설치 파일, 릴리즈, 자체 업데이트
- `docs/07_SECURITY_PRIVACY_LICENSE.md`: 보안, 개인정보, 라이선스
- `docs/08_TEST_PLAN.md`: 테스트 계획
- `docs/09_AI_CODING_WORKFLOW.md`: 바이브 코딩 운영 가이드
- `TASKS.md`: 구현 백로그
- `DECISION_LOG.md`: 기술 결정 기록
- `CHANGELOG.md`: 사용자 관점 변경 로그
- `HISTORY.md`: 작업 이력
- `AGENTS.md`: 에이전트 작업 규칙
