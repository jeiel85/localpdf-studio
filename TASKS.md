# TASKS.md

## v0.18.0 - 외부 배포 마무리 (v0.18.0) 및 macOS Gatekeeper 우회 보강

- [x] macOS Gatekeeper 우회 가이드 보강 (`INSTALL.md`, 랜딩 페이지 `index.html`, `en.html`, `ja.html`에 `xattr -cr` 일괄 적용)
- [ ] winget PR 머지 후 배포 상태 확인
- [x] Chocolatey 커뮤니티 배포 제출 완료 (choco push, moderation 대기)
- [x] Snap/AUR 제출 자동화 스크립트 추가 (`scripts/linux/publish-snap.sh`, `publish-aur.sh`)
- [x] v0.18.0 변경분 로컬 검증 (`git diff --check`, Bash 문법 검사, `npm run typecheck`, `npm run test`, `npm run build`, `cargo test`, winget/Chocolatey 로컬 검증, 릴리즈 산출물 검증)
- [x] v0.18.0 앱 버전 메타데이터 동기화 및 CI/release 버전 검증 보강
- [x] AGENTS.md 배포 브랜치/버전 파일 기준 정정
- [x] README/랜딩 페이지 패키지 매니저 상태를 실제 공개/대기 상태로 정리
- [x] v0.18.0 태그 배포 및 GitHub Release 산출물 검증
- [x] v0.18.0 릴리즈 산출물 SHA-256으로 winget/Chocolatey/Homebrew/Snap/AUR 매니페스트 갱신
- [ ] Snap Store 정식 등록 완료
- [ ] AUR 패키지(localpdf-studio-bin) 정식 등록 및 검증

## v0.17.2 - 파일 command 안전성 + 배포 후속 처리

- [x] `save_text_file` / `save_binary_file` 직접 쓰기를 임시 파일 기반 교체 저장으로 변경
- [x] `read_text_file_if_exists` 허용 확장자와 시스템 디렉터리 접근 검증 추가
- [x] `delete_file_if_exists` 임시 파일 삭제 용도에 맞게 허용 확장자 제한 및 보호 확장자 삭제 차단
- [x] winget 매니페스트 검증 스크립트 추가 및 v0.17.2 PR 제출
- [x] Chocolatey 패키지 생성 스크립트 추가 및 v0.17.2 `.nupkg` 생성 검증
- [x] 릴리즈 워크플로 macOS/Linux 빌드 job 복구
- [x] 릴리즈 산출물 검증 스크립트 추가
- [x] v0.17.2 릴리즈 산출물 SHA-256으로 winget/Chocolatey/Homebrew/Snap/AUR 매니페스트 갱신
- [x] Homebrew tap 저장소 생성 및 v0.17.2 Cask 게시
- [x] v0.17.2 `latest.json` updater URL 수정 및 검증
- [x] QA 체크리스트 최신화
- [x] 외부 계정/인증이 필요한 후속 작업 문서화 (`docs/10_EXTERNAL_PUBLISHING_TODO.md`)

## v0.17.1 - 패키지 매니페스트 동기화 + 폴백 처리

- [x] v0.17.0 GitHub Release 산출물 SHA-256으로 winget/Chocolatey 매니페스트 갱신
- [x] `scripts/windows/sync-package-manifests.ps1`이 `.deb`/DMG 부재 시 AUR/Snap/Homebrew를 건너뛰도록 폴백 추가
- [x] README 패키지 매니저 상태 표 v0.17.0 반영

## v0.17.0 - PDF Fill & Sign 풀세트 (자유 스탬프 + 손글씨/이미지 서명 + Flatten)

- [x] `StampElement`, `SavedSignature`, `SignTool` 자료구조 정의 및 `SidebarTab`에 `sign` 키 확장 (`src/types.ts`)
- [x] 마우스·스타일러스·터치 PointerEvent 통합 HTML5 캔버스 서명 모달 컴포넌트 (`src/components/SignatureDrawDialog.tsx`)
- [x] 드래그 배치 / 모서리 핸들 리사이즈 / 박스 이동 / ✕ 삭제를 지원하는 `StampPageOverlay` 신규 작성 (`src/components/StampPageOverlay.tsx`)
- [x] 도구 팔레트, 스타일 컨트롤, 서명 라이브러리(`localStorage` 영속화), 배치 항목 목록, AcroForm 평탄화 옵션을 통합한 `SignPanel` 작성 (`src/components/SignPanel.tsx`)
- [x] pdf-lib `drawText`/`drawImage` 임베딩과 `form.flatten()` 평탄화, 흰 배경 자동 투명화(`removeWhiteBackgroundFromDataUrl`) 코어 라이브러리 (`src/lib/fillSign.ts`)
- [x] PdfCanvas / PdfContinuousView에 StampPageOverlay 통합 및 Props 전파
- [x] App.tsx 최상위 상태(stamps/signMode/selectedTool/savedSignatures 등)와 `sign` 사이드바 case 연결
- [x] FormFillPanel에 "저장 시 폼 평탄화" 체크박스 옵션 추가
- [x] ko/en/ja 다국어 메시지(`sign.*`, `ff.flatten*`) 50여 개 키 일괄 추가
- [x] 스탬프 박스/리사이즈 핸들/도구 그리드/서명 카드/모달 백드롭 스타일 (`src/styles.css`)
- [x] `fillSign` 라이브러리 단위 테스트 10개 추가 (`src/lib/fillSign.test.ts`)
- [x] v0.17.0 릴리즈 메타데이터 동기화 (`package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `README.md`, `docs/index.html`, `docs/en.html`, `docs/ja.html`)
- [x] `npm run typecheck` / `npm run test` / `npm run build` / `cargo check` 통과 확인

## v0.16.2 - 태그/앱 버전 불일치 수정

- [x] v0.16.1 실패 원인 확인: 태그 버전과 앱 메타데이터 버전 불일치
- [x] v0.16.2 릴리즈 메타데이터 동기화
- [x] Release workflow에 태그/앱 버전 사전 검증 추가
- [x] v0.16.2 태그 재배포 준비

## v0.16.1 - GitHub Release 배포 규칙 정비

- [x] 참고 프로젝트(`D:\Project\claude-usage-tray-windows`)의 태그 기반 릴리즈 흐름 확인
- [x] Release workflow를 Windows build job + 단일 GitHub Release job 구조로 정비
- [x] `CHANGELOG.md` 현재 버전 섹션을 릴리즈 노트로 자동 추출
- [x] NSIS setup exe, MSI, updater signature, Portable ZIP, `latest.json`을 릴리즈 필수 산출물로 업로드
- [x] `generate-latest-json.ps1`의 Tauri bundle 경로 및 asset URL 생성 수정
- [x] `scripts/windows/release.ps1` 배포 보조 스크립트 추가
- [x] v0.16.1 릴리즈 메타데이터 동기화 (`package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `README.md`)

## v0.16.0 - 패키지 매니저 매니페스트 동기화 자동화

- [x] GitHub Release asset digest를 조회해 winget/Chocolatey/Homebrew/Snap/AUR 매니페스트 버전, URL, SHA-256을 동기화하는 PowerShell 스크립트 추가 (`scripts/windows/sync-package-manifests.ps1`)
- [x] v0.15.0 공개 산출물 기준 winget, Chocolatey, Homebrew, Snap, AUR 제출 파일 버전 및 SHA-256 갱신
- [x] 패키지 제출 README의 수동 SHA 계산 안내를 동기화 스크립트 중심 흐름으로 보강
- [x] 모든 플랫폼 릴리즈 빌드 성공 후 Draft 릴리즈를 자동 공개하는 publish job 추가
- [x] v0.16.0 릴리즈 메타데이터 동기화 (`package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/Cargo.lock`, `src-tauri/tauri.conf.json`, `README.md`)

## v0.15.0 - 개인정보 자동 패턴 탐지 및 마스킹 추천 (Auto-Redaction)

- [x] 8종 개인정보/문서 식별자 정규식 패턴(주민번호, 전화번호, 이메일, 신용카드, 계좌번호, 사업자등록번호, 여권번호, 운전면허번호) 코어 검색 로직 정립 (`src/lib/autoRedaction.ts`)
- [x] 부분 문자열 매칭 시 오프셋 및 너비를 charWidth 비율로 정밀 역산하는 Bounding Box 환산 수식 적용
- [x] 주민번호 단일 탐지, 분산 이메일 통합 매핑 등의 정합성을 확보하는 단위 테스트 3종 구축 (`src/lib/autoRedaction.test.ts`)
- [x] 9개 테스트 스위트의 45개 테스트 케이스 100% 무결성 통과 (Vitest 검증 완수)
- [x] ko, en, ja 3개 국어 번역 리소스 연동 (`src/i18n/messages.ts` 내 9개 신규 키 연동)
- [x] AdvancedPanel 내의 RedactForm UI 확장 및 [🔍 개인정보 자동 탐지] 프리미엄 그라데이션 버튼 탑재
- [x] 로딩 Spinner 애니메이션 및 유형별 HSL 배지 적용, 아스테리스크 프라이버시 필터링 구현
- [x] 체크박스를 이용한 개별/전체 선택 제어 및 unrotated PDF Point 기반 RedactionArea 최상위 상태 누적/병합 연동
- [x] 텍스트 레이어 없는 스캔 이미지 PDF에 OCR → 검색 가능 PDF 선행 안내 추가
- [x] 자동 탐지 영역 추가 후 되돌리기 및 마스킹 적용 전 래스터/벡터 확인 대화상자 추가
- [x] `npm run typecheck` 타입 검증 Zero-Error 무오류 완수
- [x] v0.15.0 릴리즈 메타데이터 동기화 (`package.json`, `package-lock.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, `README.md`)

## v0.14.0 - PDF 개인정보 보안 마스킹 (블랙아웃)

- [x] 오프라인 마스킹 드래그 캡처 및 화면 매핑 (PdfCanvas / PdfContinuousView)
- [x] 줌 및 회전 상태 동적 대응 unrotated PDF Point 좌표 역산 및 정방향 렌더링 수식 설계
- [x] 영구 래스터화 마스킹 (Secure Rasterization) 엔진 구현 (300DPI 이미지 대체 및 insertPage/removePage 원자적 교체 전략)
- [x] 일반 벡터 마스킹 구현 (pdf-lib drawRectangle 오버레이)
- [x] 고급 기능 탭 내 RedactForm UI 구현 (모드 토글, 방식 지정 라디오, 지정 요약 리스트, 저장 연동)
- [x] 마스킹 모드 켜짐 상태 시 textLayer/annotationLayer 텍스트 드래그 비활성화 CSS 및 인터랙션 애니메이션 연동
- [x] ko/en/ja 다국어 번역 리소스 연동
- [x] Mocking 기반 벡터 및 래스터 방식 통합 테스트 케이스 2종 작성 및 Vitest 41개 테스트 전체 검증
- [x] tsc typecheck 컴파일 에러 Zero 달성 검증

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

## v0.13.0 - 다중 페이지 하이라이트 및 표준 주석 연동

- [x] 다중 페이지 드래그 선택 지원 (Y축 좌표 기반 페이지 매핑 알고리즘)
- [x] 표준 PDF Highlight 주석(Annotation) 임베딩 (/Annots 내 /Highlight 딕셔너리 생성)
- [x] pdf-lib 저수준 API를 활용한 QuadPoints 및 Rect 매핑
- [x] Adobe Acrobat 및 Chrome 등 타 PDF 뷰어의 주석 패널 호환성 확보

## v0.8.0 - 하이라이트 고도화

- [x] 페이지 회전 좌표계 보정 (0도, 90도, 180도, 270도 역변환 수학 공식 적용)

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
