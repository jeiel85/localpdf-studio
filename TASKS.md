# TASKS.md

## P0 - 저장소 초기 안정화

- [x] GitHub Pages 랜딩 페이지 공개 URL 확인
- [x] GitHub 저장소 토픽 등록 확인
- [x] `npm install` 성공 확인
- [x] `npm run typecheck` 성공 확인
- [x] `npm run build` 성공 확인
- [x] `npm run tauri:dev` (cargo check 검증)
- [x] 기본 PDF 열기/렌더링 확인
- [x] Windows 우클릭 메뉴 등록/해제 스크립트 검증

## P1 - PDF 뷰어 완성도

- [x] 대용량 PDF 스트리밍 로딩 구조로 전환 (`pdf-local://` custom protocol, Range 요청)
- [x] 페이지 썸네일 사이드바 구현
- [x] 문서 목차/아웃라인 구현
- [x] 텍스트 검색 구현
- [x] 최근 문서 목록 구현
- [x] 탭 기반 다중 문서 구현
- [x] 키보드 단축키 구현 (Ctrl+O, Ctrl+F, Ctrl+1~6, Alt+←→, Ctrl+Tab, Ctrl+W)

## P2 - PDF 작업 엔진

- [x] qpdf 설치 경로 탐지 및 설정 UI 구현 (도구 패널에서 상태 확인)
- [x] PDF 병합 구현 (qpdf_service.rs, MergePanel.tsx)
- [x] PDF 분할 구현 (split_pdf command)
- [x] 페이지 추출 구현 (extract_pages command, ExtractForm UI)
- [x] 페이지 회전 저장 구현 (rotate_pages command, RotateForm UI)
- [x] 암호 설정/해제 구현 (encrypt_pdf/decrypt_pdf, EncryptForm/DecryptForm UI)
- [x] 메타데이터 읽기 구현 (read_pdf_metadata command, MetadataForm UI)
- [x] PDF 압축 구현 (compress_pdf command, CompressForm UI)
- [x] 작업 큐 상태 관리 인프라 구현 (job_queue.rs, JobManager, get_job_status/get_active_jobs)

## P3 - OCR / 변환 / 고급 기능

- [x] Tesseract 설치 경로 탐지 및 언어팩 확인 (check_tesseract_available)
- [x] 이미지 PDF OCR 구현 (ocr_service.rs, run_ocr command, OcrForm UI)
- [x] PDF → 이미지 변환 구현 (AdvancedPanel PdfToImageForm, canvas 렌더링 + 저장)
- [x] PDF → TXT 변환 구현 (getTextContent + save_text_file, PdfToTextForm UI)
- [x] 이미지 → PDF 변환 구현 (ImageToPdfForm, pdf-lib으로 이미지 → PDF)
- [x] 워터마크/스탬프 구현 (watermark_service.rs, qpdf overlay/underlay)
- [x] 비교 기능 구현 (CompareForm, 텍스트 diff, TXT 파일 출력)

## P4 - 배포 / 업데이트

- [x] NSIS installer에 context menu 등록 hook 통합 (nsis-hooks.nsh)
- [x] Tauri updater signing key 생성 및 GitHub Secrets 설정 (docs/04_RELEASE_UPDATE.md 문서화 + CI 연동)
- [x] 최신 릴리즈용 `latest.json` 생성 자동화 (scripts/windows/generate-latest-json.ps1 + CI includeUpdaterJson)
- [x] MSI 산출물 확인 (tauri.conf.json targets: nsis + msi)
- [x] Portable ZIP 생성 자동화 (create-portable-zip.ps1 + CI 통합)
- [x] GitHub Release 산출물 업로드 확인 (release.yml: tauri-action + action-gh-release)

## v0.3.0 - Phase 1: 뷰어 핵심 보강

- [x] A5 사이드바 접기/열기 (Ctrl+B, localStorage 영속화)
- [x] A4 단축키 도움말 다이얼로그 (F1, 툴바 ? 버튼)
- [x] A2 파일 드래그앤드롭 (Tauri webview onDragDropEvent)
- [x] A3 탭/뷰 상태 영속화 (tab_state.json, 세션 복원 설정)
- [x] A1 텍스트 선택/복사 (pdf.js TextLayer 오버레이, 단일/연속 레이아웃)

## v0.4.0 - 보안 강화

- [x] validate_pdf_path canonicalize 경로 순회 방지
- [x] save_text_file 보호된 확장자 차단
- [x] decrypt_pdf 비밀번호 --password-file 사용
- [x] pdf-local 프로토콜 PDF 확장자 검증 + canonicalize
- [x] validate_pdf_files 2GB 파일 크기 상한
- [x] 랜딩 페이지/README 최신 기능으로 갱신

## v0.5.0 - 외부 도구 자동 설치

- [x] qpdf 자동 설치 (zip 다운로드 → 압축 해제 → 설정 갱신)
- [x] Tesseract 자동 설치 (설치 파일 다운로드 → UAC 승격 → 무설치 실행 → 경로 탐지)
- [x] 관리자 승격 흐름 (Start-Process -Verb RunAs, 승격 거부 안내)
- [x] ToolsPanel 자동 설치 UI (자동 설치/관리자 권한 설치 버튼 + 수동 다운로드)

## v0.7.0 - UX 완성도

- [x] 라이트 테마 구현 (CSS 변수화, `data-theme` 전환, 시스템 테마 연동)
- [x] 인쇄 기능 (Ctrl+P, 고해상도 전체 페이지 렌더링, 진행률 표시)

## v0.6.0 - PDF 페이지 편집

- [x] 페이지 재정렬 (썸네일 드래그앤드롭, `reorder_pages` command)
- [x] 페이지 삭제 (선택 페이지 제거, `delete_pages` command)
- [x] 페이지 삽입 (다른 PDF에서 페이지 가져오기, `insert_pages` command)
- [x] PageEditorPanel 컴포넌트 (썸네일 기반 편집 UI)
- [x] 사이드바 편집 모드 연동
- [x] 단위 테스트 (qpdf_service 페이지 편집 함수 15개 신규)
