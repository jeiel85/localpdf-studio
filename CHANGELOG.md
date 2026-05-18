# CHANGELOG.md

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
