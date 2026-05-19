# CHANGELOG.md

## v0.6.0 - 2026-05-19

### Added

- **PDF 페이지 편집**: 썸네일 드래그앤드롭으로 페이지 재정렬, 삭제, 다른 PDF에서 페이지 삽입
  - `reorder_pages` command: qpdf `--pages` 옵션으로 페이지 순서 변경
  - `delete_pages` command: 선택한 페이지 제거 (전체 페이지 수에서 complement 계산)
  - `insert_pages` command: 다른 PDF에서 페이지 삽입 (지정 위치 앞/뒤/중간)
  - `PageEditorPanel` 컴포넌트: 썸네일 그리드 기반 편집 UI, 드래그앤드롭 재정렬, 선택 삭제, PDF 삽입, 순서 초기화
  - `pages_to_qpdf_spec` / `compute_page_complement` 헬퍼 함수 (페이지 목록 → qpdf 범위 사양 변환)
- 사이드바에 "편집" 탭 추가

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: 통과
- `cargo test`: 37/37 통과 (qpdf_service 신규 15개 테스트 포함)

---

## v0.5.0 - 2026-05-19

### Added

- **외부 도구 자동 설치**: qpdf와 Tesseract를 앱 내에서 자동 다운로드 및 설치 지원
  - **qpdf 자동 설치**: GitHub에서 zip 다운로드 → `%APPDATA%/LocalPDF Studio/tools/qpdf/`에 압축 해제 → 설정 자동 갱신. 관리자 권한 불필요
  - **Tesseract 자동 설치**: GitHub에서 설치 파일 다운로드 → 관리자 승격(UAC) 후 무설치(`/S`) 실행 → 설치 경로 자동 탐지 → 설정 자동 갱신
  - **관리자 승격 흐름**: Tesseract 설치 시 UAC 프롬프트 안내 → `powershell Start-Process -Verb RunAs -Wait`로 승격 → 승격 거부 시 명확한 오류 안내
  - **새 Tauri 명령**: `install_qpdf_auto`, `install_tesseract_auto`, `check_elevation`

### Changed

- `ToolsPanel.tsx`: 미설치 도구 표시를 "다운로드 페이지 열기" 링크에서 "자동 설치" / "관리자 권한으로 자동 설치" 버튼 + "수동 다운로드" 버튼으로 변경
- `styles.css`: `.tool-install-actions` flex 레이아웃, `.primary` 버튼 스타일, `.tool-install-error` 에러 메시지 스타일 추가

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: 통과
- `cargo test`: 22/22 통과 (installer_service 4개 신규 테스트 포함)

---

## v0.4.0 - 2026-05-19

### Security

- **`validate_pdf_path` 경로 검증 강화**: `canonicalize()`로 경로 순회/심볼릭 링크 공격 방지
- **`save_text_file` 보호된 확장자 차단**: `.exe`, `.dll`, `.sys`, `.bat`, `.cmd`, `.ps1`, `.vbs`, `.com` 확장자로 저장 불가
- **`decrypt_pdf` 비밀번호 노출 방지**: CLI 인자 대신 `--password-file`로 임시 파일 전달
- **`pdf-local` 프로토콜 핸들러 강화**: PDF 확장자 검증 및 canonicalize 적용, 경로 순회 방지
- **`validate_pdf_files` 파일 크기 상한 추가**: 최대 2GB 제한으로 DoS 방지

### Changed

- `docs/index.html` 랜딩 페이지: 완료된 기능 목록으로 갱신 (12개 기능 카드, 로드맵 완료 ✓ 표시, CTA 문구)
- `README.md`: 현재 구현 범위 섹션을 완성된 기능 상세 목록으로 대체, 기술 스택 테이블 갱신
- 보안 감사 수행: 0 Critical, 0 High, 5 Medium 이슈 전체 수정

### Verification

- `npm run typecheck`: 통과
- `npm run build`: 통과
- `npm test`: 39/39 통과 (7개 파일)
- `cargo check`: 통과
- `cargo test`: 18/18 통과

---

## v0.3.0 - 2026-05-18

### Added

- **사이드바 접기/열기**: `Ctrl+B` 단축키 또는 좌측 가장자리 화살표 버튼으로 사이드바 접기/열기 지원. 접기 상태는 localStorage에 자동 저장
- **키보드 단축키 도움말 다이얼로그**: `F1` 키 또는 툴바 우측 `?` 버튼으로 전체 단축키 목록 표시
- **파일 드래그앤드롭**: 탐색기에서 PDF 파일을 앱 창으로 드래그앤드롭하여 열기 (Tauri webview drag-drop 이벤트)
- **탭/뷰 상태 영속화**: 앱 종료 시 열려 있던 PDF, 페이지 번호, 배율, 회전, 레이아웃을 `tab_state.json`에 저장. `세션 복원` 설정 활성화 시 재시작 후 자동 복원
- **텍스트 선택/복사**: PDF.js TextLayer 오버레이를 캔버스 위에 렌더링하여 텍스트 드래그 선택 및 복사(Ctrl+C) 지원 (단일/연속 레이아웃 모두)
- **세션 복원 설정**: `settings.session.restoreTabs` 설정 추가 (기본값 true). 설정 패널에서 토글 가능

### Changed

- `AppShell` 컴포넌트에 `sidebarCollapsed` / `onToggleSidebar` props 추가
- `Toolbar` 컴포넌트에 `onHelp` prop 및 `?` 도움말 버튼 추가
- `AppSettings`에 `session` 필드 추가 (Rust + TypeScript)

## v0.2.5 - 2026-05-18

### Added

- **자동 업데이트 알림 UX 개선**: 시작 시 백그라운드로 업데이트 확인 (설정의 `update.checkOnStartup` 기준). 사용 가능 시 우하단 토스트로 안내
- **다운로드 → 재시작 분리 흐름**:
  - "지금 다운로드" → 진행률 표시 → "다운로드 완료, 재시작하면 적용됩니다"
  - "설치 및 다시 시작" 버튼으로 사용자가 재시작 시점 선택
  - "나중에" 버튼으로 토스트 닫고 작업 계속 가능 (이미 다운로드한 경우 다시 시작 시 자동 적용)
- 기존 툴바 "업데이트 확인" 버튼도 같은 토스트 흐름으로 통합
- 다운로드/설치 에러 시 토스트에 메시지 표시

### Changed

- `tauri-apps/plugin-updater`의 `downloadAndInstall()` 한 번에 처리하던 흐름 → `download()` + `install()` 분리. 사용자가 다운로드 후 즉시 재시작할지, 작업 마무리 후 재시작할지 선택 가능

---

## v0.2.4 - 2026-05-18

### CI / Release

- Tauri 자동 업데이터 서명 키 쌍 생성 및 GitHub Secrets 등록 완료. v0.2.4부터 `.sig` 파일과 `latest.json` 정상 발행 → 자동 업데이트 동작
- `tauri.conf.json` `createUpdaterArtifacts: true`로 복귀, `pubkey`에 공개키 반영
- `release.yml`에 `TAURI_SIGNING_PRIVATE_KEY` 환경변수 다시 추가, `includeUpdaterJson: true`로 변경
- `ci.yml` 트리거 브랜치 `main` → `master`로 수정 (push마다 typecheck/build/cargo check 자동 실행)
- 이전 실패 태그 v0.2.0/v0.2.1/v0.2.2 정리 (로컬 + 원격)

---

## v0.2.3 - 2026-05-18

### CI / Build

- v0.2.0~v0.2.2 release 워크플로가 Tauri 업데이터 서명 키 미설정으로 실패하던 문제 해결
- `tauri.conf.json` `createUpdaterArtifacts: false`로 임시 비활성화 (NSIS .exe / MSI / Portable ZIP은 정상 생성됨)
- `release.yml`에서 `TAURI_SIGNING_PRIVATE_KEY` 환경변수 제거, `includeUpdaterJson: false`로 변경
- 자동 업데이트 기능은 추후 서명 키 생성/등록 후 재활성화 예정 (`docs/04_RELEASE_UPDATE.md` 참고)

(v0.2.2의 모든 성능 개선 포함)

---

## v0.2.2 - 2026-05-18

### Performance

- **렌더 큐 도입** (`src/lib/renderQueue.ts`): pdf.js의 라스터화는 메인 스레드에서 수행되므로 여러 페이지가 동시에 렌더하면 스크롤·입력 이벤트가 함께 경쟁. 동시 렌더 1개로 직렬화하고, 자기 차례 전 취소된 작업은 실행하지 않도록 처리. 단일 페이지 모드와 연속 페이지 모두 이 큐를 통과
- **스크롤 중 렌더 일시 정지**: 스크롤 발생 시 `isScrolling=true`로 표시. 휠이 멈춘 후 120ms 동안 변화 없으면 정착으로 판단하고 그때 보류된 페이지를 렌더. 빠른 스크롤 시 메인 스레드가 페이지 렌더에 잡혀 있는 시간이 사라져 스크롤 자체가 부드러워짐
- **`rootMargin` 축소**: 600px → 250px. 화면에 안 보이는 페이지를 미리 그리는 범위를 줄여 동시 렌더 부하 감소
- **`ContinuousPage`를 `React.memo`로 감쌈**: 부모(`PdfContinuousView`) 재렌더 시에도 props가 같으면 페이지 컴포넌트 재렌더 차단
- **PDF.js 로더 옵션** `useSystemFonts: true` 적용: 임베디드 폰트 처리 우회로 텍스트 PDF에서 초기 파싱 시간 감소

### Tests

- `RenderQueue` 클래스 단위 테스트 4개 추가 (직렬화 / 동시성 / 큐 취소 / 실행 중 취소 신호). 총 프론트엔드 테스트 39개

---

## v0.2.1 - 2026-05-18

### Fixed

- 설정 화면의 "찾아보기" 버튼이 좁은 그리드 셀에서 한글이 한 글자씩 세로로 잘려 보이던 문제. 모든 설정 버튼에 `white-space: nowrap` 적용 및 `grid-template-columns: minmax(0, 1fr) auto auto`로 input이 우선 축소되도록 변경

### Performance

- 연속 스크롤 뷰의 초기 표시 지연을 크게 단축:
  - 기존: PDF 열면 모든 페이지에 대해 `getPage()` 직렬 호출 (239페이지 = 239번 await) 완료까지 placeholder도 안 보이고 첫 렌더가 멈춤
  - 변경: 1페이지 dim만 즉시 읽어 전체에 적용 → placeholder 그리드 즉시 표시. 각 페이지의 실제 dim은 IntersectionObserver로 스크롤 진입 시 lazy 계산
- 렌더 출력 배율(`renderQualityToScale`) "auto" 모드에 상한 1.5x 도입. 일부 환경의 `devicePixelRatio` 2.0이 캔버스를 4배 크기로 그려 GPU/메모리 부하가 컸음. 선명도는 거의 동등하나 페인트 시간이 크게 감소
- `App.tsx`의 `onPageChange` / `onFittedScale` 콜백을 `useCallback`으로 안정화하여 매 렌더 시 자식의 referential equality 깨짐 방지
- `PdfCanvas`를 `React.memo`로 감싸 props 변경 없을 때 재렌더 차단 (상태바/사이드바 업데이트로 인한 App 재렌더가 캔버스까지 전파되던 문제 해소)

---

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
