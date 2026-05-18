# CHANGELOG.md

## v0.2.0 - 2026-05-18

### Added

- **설정 화면**: 사이드바에 "설정" 탭 추가. 자동 저장. 8개 섹션 / 17개 옵션
  - 뷰어: 초기 줌 모드, 사용자 지정 배율, 휠 동작, 회전 단위, 렌더 품질, 기본 페이지 레이아웃, 기본 맞춤 모드
  - 외부 도구: qpdf/tesseract 실행 파일 경로 수동 지정 (PATH 미등록 시 fallback)
  - 출력: 기본 출력 폴더, 작업 완료 후 결과 폴더 자동 열기
  - 개인정보: 최근 파일 기록 토글, 최대 개수, 임시 파일 정리 정책, 최근 파일 일괄 삭제
  - OCR: 기본 언어 프리셋
  - 성능: 대용량 PDF 스트리밍 임계값 (10~1000 MB)
  - 업데이트: 시작 시 자동 확인 토글
  - UI: 테마(다크/라이트/시스템 — 라이트/시스템은 향후), 단축키 안내 표시
- **백엔드 settings 모듈** (`settings.rs`): JSON 영속화, 부분 업데이트 시 결손 필드 기본값 fallback
- **새 Tauri 명령**: `get_settings`, `update_settings`, `reset_settings`, `clear_recent_files`, `get_app_data_path`
- **외부 도구 패널 강화**: "다시 확인" 버튼, 버전·경로·역할 표시, 미설치 시 다운로드 가이드와 "다운로드 페이지 열기" 버튼 (시스템 브라우저), URL 복사용 박스
- **PDF 로딩 진행률 오버레이**: pdf.js `loadingTask.onProgress` 연동. % + MB/MB 표시. 스트리밍 시 indeterminate 애니메이션
- **연속 스크롤 레이아웃**: Adobe식 Continuous 모드. IntersectionObserver 기반 가상화 (보이는 영역 ±400px만 렌더). 스크롤 위치로 현재 페이지 자동 추적. 썸네일 클릭 시 해당 페이지로 자동 스크롤
- **페이지 맞춤 모드 3종**: 너비에 맞춤 (`↔`), 페이지에 맞춤 (`⤢`), 실제 크기 (`1:1`). 컨테이너 크기 기반 동적 배율 계산
- **툴바 토글 그룹**: 단일/연속 레이아웃, 너비/페이지/실제 맞춤 — active 표시 + 호버 효과
- **테스트 인프라**: Vitest + Testing Library + jsdom 셋업. Tauri invoke 모킹 패턴 (`vi.hoisted`)
- **Rust 단위 테스트**: settings, qpdf_service, ocr_service — 총 18개
- **프론트엔드 컴포넌트 테스트**: base64, ToolsPanel, SettingsPanel, Sidebar, PdfCanvas, Toolbar — 총 35개

### Fixed

- **`qpdf_service::validate_pdf_files` 1개 파일 거부 버그**: 모든 단일 파일 명령(`encrypt`, `decrypt`, `extract`, `rotate`, `compress`, `metadata`)에서 무조건 "병합할 PDF 2개 이상 필요" 오류가 나던 문제 수정. 2개 이상 검사는 `merge_pdfs` 진입부로 이동
- **뷰어 영역 스크롤 동작**: `.viewer-stage` / `.main-pane`에 `min-height: 0` 추가. CSS Grid의 `1fr` 행이 콘텐츠로 인해 늘어나면서 `overflow: auto`가 무력화되던 문제 해결
- **PdfCanvas 렌더링 루프**: `onFittedScale`/`onPageChange`/`loadProgress`가 useEffect 의존성에 들어가 매 렌더마다 effect가 재실행되며 "렌더링 중..." 메시지가 잠기고 UI가 반응하지 않던 문제. 콜백을 `useRef`로 stash하여 effect deps 제거

### Changed

- 하드코딩 값을 설정 기반으로 라우팅:
  - `MAX_INITIAL_VIEWER_LOAD_BYTES (250 MB)` → `settings.performance.streamingThresholdMb`
  - `RECENT_FILES_LIMIT (20)` → `settings.privacy.recentFilesLimit`
  - 뷰어 초기 배율 (`1.2`) → `settings.viewer.initialScale`
  - 회전 단위 (`90°`) → `settings.viewer.rotationStep`
  - PDF 초기 레이아웃 → `settings.viewer.pageLayout`
- qpdf/tesseract 탐지 로직 확장: 설정의 override 경로 우선 사용, 없으면 `which::which` fallback
- `add_recent_file`: `record_recent_files=false` 시 기록 건너뛰고 기존 목록만 반환
- 의존성 추가: `@tauri-apps/plugin-opener` (이미 Rust/capability 등록돼 있었으나 JS 패키지만 누락)
- 의존성 추가: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과 (메인 번들 1.10 MB, pdf.worker 2.16 MB)
- `npm test`: 35/35 통과 (6개 테스트 파일)
- `cargo test`: 18/18 통과
- `cargo check`: 통과 (경고 없음)

---

## v0.1.0 - 2026-05-18

### Added

- GitHub README 소개 내용을 제품 중심으로 확장
- GitHub Pages용 `docs/index.html` 랜딩 페이지 추가
- Pages에서 사용할 랜딩 이미지와 앱 아이콘 참조 파일 추가
- Tauri 2 + React + TypeScript + Rust 기반 초기 저장소 코드 추가
- PDF.js 기반 PDF 열기/렌더링 화면 추가
- 기본 앱 레이아웃, 사이드바, 툴바, 상태바 추가
- Rust command 계층 추가
- qpdf/Tesseract 외부 도구 탐지 골격 추가
- Windows 우클릭 메뉴 등록/해제 스크립트 추가
- Tauri updater 설정 초안 추가
- GitHub Actions CI/Release 워크플로 초안 추가
- 바이브 코딩용 작업 문서, 의사결정 로그, 설계 문서 추가

### Changed

- `src/components/PdfCanvas.tsx`: PDF.js v5 `page.render()` API 변경 대응 (`canvas` 필드 추가)
- `src/components/Sidebar.tsx`: 탭 기반 사이드바(문서/썸네일/목차/검색/병합/도구)로 재구현
- `src/App.tsx`: 사이드바 탭, 대용량 PDF 스트리밍, 우클릭 action 처리 통합

### Features (세션 4 - P3/P4)

- **OCR**: Tesseract CLI 레퍼 (ocr_service.rs), 언어 목록 확인, DPI 설정 OCR
- **PDF → 이미지**: PDF.js canvas 렌더링으로 PNG/JPEG/WebP 변환
- **PDF → TXT**: PDF.js getTextContent 텍스트 추출 및 .txt 저장
- **이미지 → PDF**: pdf-lib으로 여러 이미지를 PDF 페이지로 변환
- **워터마크/스탬프**: qpdf overlay/underlay 명령 래퍼 (watermark_service.rs)
- **문서 비교**: 두 PDF 텍스트 추출 후 라인 diff, TXT 출력
- **CI 개선**: cargo check 사용 (서명 불필요), release.yml에 latest.json + portable ZIP 통합
- **릴리즈 가이드**: updater key 생성, GitHub Secrets, CI flow 완벽 문서화 (docs/04_RELEASE_UPDATE.md)

### Features (세션 3)

- **다중 문서 탭**: 여러 PDF 동시 열기, TabBar로 전환, Ctrl+W 닫기, Ctrl+Tab 탭 전환
- **키보드 단축키**: Ctrl+O(열기), Ctrl+F(검색), Ctrl+1~6(탭), Alt+←→(페이지), Ctrl+Tab/W
- **PDF 암호화**: qpdf 256-bit AES 암호화 (사용자/소유자 암호 분리)
- **PDF 복호화**: 암호 입력 후 복호화 저장
- **페이지 추출**: 범위 기반 (예: 1-5, 1,3,5-7) 페이지 추출
- **페이지 회전 저장**: 90°/180°/270° 범위 지정 회전
- **PDF 압축**: qpdf linearize + object stream 최적화
- **메타데이터 읽기**: qpdf --json JSON 출력
- **작업 큐 인프라**: JobManager 상태 관리 (get_job_status, get_active_jobs)

- **대용량 PDF 스트리밍**: 250MB 초과 PDF는 `pdf-local://` 커스텀 URI 프로토콜로 Range 요청 기반 스트리밍 로드
- **페이지 썸네일**: PDF.js로 각 페이지 썸네일 생성, 클릭 시 페이지 이동
- **문서 목차**: PDF outline 추출 및 계층 표시, 페이지 번호 resolve 후 이동
- **텍스트 검색**: `getTextContent()` 기반 전문 검색, 디바운스 400ms, 결과 클릭 시 이동
- **최근 문서**: `%APPDATA%/LocalPDF Studio/recent_files.json` 기반 최대 20개 관리
- **PDF 병합**: qpdf CLI 래퍼 `qpdf_service.rs`, 입력 검증, 덮어쓰기 방지, 한글 오류 메시지
- **PDF 분할**: `split_pdf` command, 페이지별 파일 생성
- **Windows 우클릭 메뉴 통합**: NSIS installer hook (`nsis-hooks.nsh`)에서 HKCU 직접 등록/해제
- **CLI startup context**: 우클릭 메뉴 action별 적절한 사이드바 탭 자동 전환

### Verification

- GitHub Pages 랜딩 페이지를 로컬 HTTP 서버에서 렌더링하고 이미지 로딩을 확인
- `npm install`: 80 packages, 0 vulnerabilities
- `npm run typecheck`: 통과
- `npm run build`: 통과 (chunk size warning: pdf.worker 2.1MB)
- `cargo check`: 통과 (rustc 1.95.0)
- 의존성: `http = "1"` 크레이트 추가
