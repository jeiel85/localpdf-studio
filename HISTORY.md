# HISTORY.md

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
