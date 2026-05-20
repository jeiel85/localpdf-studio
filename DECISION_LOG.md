# DECISION_LOG.md

## 2026-05-20 - v0.13.0 하이라이트 다중 페이지 캡처 및 표준 주석 연동

- 결정: 다중 페이지 텍스트 캡처를 지원하기 위해 DOMRect의 중심 Y축으로 페이지 엘리먼트 경계를 동적 식별하고, 단순배경 덧칠(`drawRectangle`) 방식 대신 `pdf-lib` 저수준 context API를 활용하여 국제 표준 PDF `/Highlight` Annotation 딕셔너리를 임베딩한다.
- 이유: 사용자가 두 개 이상의 페이지를 가로지르며 텍스트를 드래그하는 UX를 자연스럽게 처리하고, 생성된 하이라이트 PDF가 Adobe Acrobat, Chrome 브라우저 등에서 '주석'으로 정식 인식(편집, 조회, 삭제 가능)되도록 표준 사양의 호환성을 확보하기 위함이다.
- 한계: 저수준 PDF Object 조작이 필요하므로 pdf-lib의 `/Annots` 딕셔너리 구조에 직접 write하며, 이 과정에서 strict typechecking 유지를 위해 low-level context lookup 처리가 요구된다.

## 2026-05-18 - P3 OCR/변환 구현 전략

- 결정: OCR은 Tesseract CLI, PDF↔이미지 변환은 프론트엔드 canvas + pdf-lib 사용.
- 이유: Tesseract는 가장 널리 사용되는 OCR 엔진이며 CLI 통합이 간단하다. 이미지 변환은 PDF.js의 canvas 렌더링 기능을 재활용하고, pdf-lib은 순수 JS로 PDF 생성이 가능하다.
- 한계: 이미지→PDF는 pdf-lib 의존성 추가 필요 (5 packages).

## 2026-05-18 - 워터마크/스탬프 구현

- 결정: qpdf의 `--overlay`(워터마크)와 `--underlay`(스탬프) 옵션을 활용한다.
- 이유: qpdf CLI로 추가 도구 없이 구현 가능. 오버레이 PDF를 미리 생성해야 하는 제약은 있음.
- 한계: 텍스트 워터마크는 오버레이 PDF를 별도 생성해야 하므로, 향후 pdf-lib으로 텍스트 직접 삽입 가능.

## 2026-05-18 - 문서 비교

- 결정: 두 PDF의 텍스트를 추출한 후 라인 단위 diff를 TXT로 출력한다.
- 이유: 간단하고 실용적이며, 외부 diff 도구 없이 구현 가능.
- 한계: 시각적 diff(이미지 비교)는 미지원. 복잡한 레이아웃 비교에는 부적합.

## 2026-05-18 - CI/CD 전략

- 결정: CI는 `cargo check`로 검증, Release는 `tauri-action` + `includeUpdaterJson: true` 사용.
- 이유: CI에서 전체 Tauri 빌드는 서명 키가 없어 실패. cargo check로 충분한 검증 가능.
- Release: tauri-action이 빌드+서명+릴리즈를 자동화, latest.json도 자동 생성 가능.

## 2026-05-18 - 다중 문서 탭 관리

- 결정: `Map<string, PDFDocumentProxy>` ref와 `DocTab[]` state로 분리 관리한다.
- 이유: PDFDocumentProxy는 직렬화 불가능한 클래스 인스턴스이므로 React state 대신 ref에 보관한다.
- 구현: 탭 전환 시 activeTabId만 변경, 탭 닫을 때 `doc.destroy()` 호출로 메모리 해제.

## 2026-05-18 - 키보드 단축키

- 결정: `window.addEventListener('keydown')`으로 App 레벨에서 단축키를 처리한다.
- 이유: 별도 라이브러리 없이 구현 가능하며, input/textarea 포커스 시에는 단축키를 무시한다.
- 구현: Ctrl+O(열기), Ctrl+F(검색), Ctrl+1~6(사이드바 탭), Ctrl+W(탭 닫기), Ctrl+Tab(탭 전환), Alt+←→(페이지 이동)

## 2026-05-18 - 대용량 PDF 로딩 방식

- 결정: 250MB 초과 PDF는 `pdf-local://` 커스텀 URI 프로토콜로 스트리밍 로드한다.
- 이유: PDF.js의 Range 요청 기능을 활용하면 전체 파일을 IPC로 전송하지 않고 필요한 청크만 읽을 수 있다.
- 구현: Tauri 2 `register_uri_scheme_protocol`로 `pdf-local://` 프로토콜 등록, Range 헤더 파싱 후 부분 응답.
- 한계: custom protocol은 `http` crate 의존성이 필요하다.

## 2026-05-18 - 사이드바 탭 구조

- 결정: 사이드바를 문서/썸네일/목차/검색/병합/도구 탭으로 분리한다.
- 이유: 기능이 늘어날수록 단일 패널에 나열하기 어려워지므로 탭으로 관심사를 분리한다.
- 구현: App.tsx에서 `activeTab` 상태로 렌더링 분기, Sidebar 컴포넌트는 탭 네비게이션만 담당.

## 2026-05-18 - 최근 문서 저장소

- 결정: `%APPDATA%/LocalPDF Studio/recent_files.json`에 JSON 파일로 저장한다.
- 이유: 파일 시스템 기반으로 간단하게 구현 가능하며, 별도 DB 의존성이 없다.
- 한계: 동시성 이슈 가능성 (단일 인스턴스 앱이므로 낮음), 대용량 히스토리에는 부적합.

## 2026-05-18 - qpdf wrapper 설계

- 결정: `qpdf_service.rs` 모듈에서 순수 함수로 분리하고, commands.rs는 Tauri command 계층만 담당한다.
- 이유: 테스트 가능성과 관심사 분리를 위해 service 함수를 command와 분리한다.
- 구현: `find_qpdf()`, `merge_pdfs()`, `split_pdf()`, `validate_pdf_files()`, `check_output_overwrite()`.
- 한글 오류 메시지: `QpdfError` enum의 `Display` trait에서 한국어 메시지 제공.

## 2026-05-18 - NSIS context menu 통합

- 결정: PowerShell 스크립트 대신 NSIS 매크로에서 직접 HKCU 레지스트리 등록/해제를 수행한다.
- 이유: PowerShell 의존성 제거, 설치 파일 내 추가 리소스 불필요, 안정성 향상.
- 구현: `NSIS_HOOK_POSTINSTALL`에서 `WriteRegStr`, `NSIS_HOOK_PREUNINSTALL`에서 `DeleteRegKey`.
- action: open, merge, split, compress, ocr, metadata (6개).

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
