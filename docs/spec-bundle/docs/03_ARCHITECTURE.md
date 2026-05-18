# 03. Architecture

## 1. 권장 구조

```text
localpdf-studio/
├─ src/
│  ├─ app/
│  ├─ pages/
│  ├─ features/
│  │  ├─ viewer/
│  │  ├─ organizer/
│  │  ├─ merge/
│  │  ├─ split/
│  │  ├─ ocr/
│  │  ├─ annotations/
│  │  ├─ batch/
│  │  ├─ settings/
│  │  └─ updates/
│  ├─ shared/
│  │  ├─ components/
│  │  ├─ hooks/
│  │  ├─ i18n/
│  │  ├─ styles/
│  │  └─ utils/
│  └─ main.tsx
├─ src-tauri/
│  ├─ src/
│  │  ├─ main.rs
│  │  ├─ commands/
│  │  ├─ pdf/
│  │  │  ├─ mod.rs
│  │  │  ├─ open.rs
│  │  │  ├─ render.rs
│  │  │  ├─ merge.rs
│  │  │  ├─ split.rs
│  │  │  ├─ optimize.rs
│  │  │  ├─ ocr.rs
│  │  │  └─ metadata.rs
│  │  ├─ jobs/
│  │  ├─ settings/
│  │  ├─ context_menu/
│  │  ├─ updates/
│  │  ├─ security/
│  │  └─ telemetry_disabled.rs
│  ├─ capabilities/
│  ├─ tauri.conf.json
│  └─ Cargo.toml
├─ bundled/
│  ├─ pdfium/
│  ├─ qpdf/
│  └─ tesseract/
├─ docs/
├─ prompts/
├─ .github/workflows/
├─ CHANGELOG.md
├─ HISTORY.md
├─ DECISION_LOG.md
└─ AGENTS.md
```

## 2. 계층

### UI Layer

- React + TypeScript
- PDF.js 기반 페이지 표시
- 썸네일/페이지 가상화
- 작업 결과/진행률 표시
- 설정/마법사 UI

### Bridge Layer

- Tauri commands
- 파일 열기, 저장, 작업 요청
- 작업 큐 상태 구독
- 업데이트 상태 확인
- OS integration 호출

### Core Layer

- Rust PDF service
- qpdf wrapper
- PDFium renderer
- Tesseract OCR wrapper
- Job queue
- File safety manager
- Settings repository
- Log service

### Persistence Layer

- SQLite
- 최근 파일
- 작업 이력
- 문서별 보기 상태
- 앱 설정
- 우클릭 메뉴 상태

## 3. 작업 큐 모델

모든 무거운 작업은 job으로 실행한다.

```text
Job
- id
- type
- input_files
- output_path
- options
- status: pending | running | paused | canceled | failed | completed
- progress_current
- progress_total
- message
- error_code
- created_at
- updated_at
```

필수 작업 유형:

- merge_pdf
- split_pdf
- extract_pages
- rotate_pages
- optimize_pdf
- export_images
- extract_text
- ocr_pdf
- create_pdf_from_images
- compare_pdf
- redact_pdf

## 4. 파일 안전 전략

1. 입력 파일은 read-only로 연다.
2. 출력은 앱 임시 디렉터리에 먼저 생성한다.
3. 결과 검증 후 사용자가 지정한 위치로 이동한다.
4. 동일 경로 저장 시 `.bak` 백업 옵션을 제공한다.
5. 실패 시 임시 파일을 삭제하거나 복구 폴더에 보관한다.
6. 작업 로그에는 파일명은 남기되 민감한 전체 경로는 설정에 따라 마스킹한다.

## 5. PDF 렌더링 전략

- 일반 화면 렌더링: PDF.js
- 썸네일/서버형 작업 미리보기: PDFium
- 페이지 오브젝트 변경: qpdf 기반 구조 조작
- OCR용 이미지 렌더링: PDFium 또는 자체 렌더 파이프라인

## 6. 상태 관리

Frontend:

- Zustand 또는 Redux Toolkit
- Document store
- Viewer store
- Job store
- Settings store
- Update store

Backend:

- Rust service registry
- Tokio async runtime
- bounded thread pool for CPU-heavy jobs
- cancellation token

## 7. IPC Command 예시

```ts
open_pdf(path: string): Promise<DocumentInfo>
render_thumbnail(path: string, page: number, width: number): Promise<ImageData>
merge_pdfs(inputs: PdfInput[], output: string, options: MergeOptions): Promise<JobId>
split_pdf(input: string, outputDir: string, options: SplitOptions): Promise<JobId>
ocr_pdf(input: string, output: string, options: OcrOptions): Promise<JobId>
get_job(jobId: string): Promise<JobState>
cancel_job(jobId: string): Promise<void>
check_update(): Promise<UpdateInfo>
install_update(): Promise<void>
set_context_menu_enabled(enabled: boolean): Promise<void>
```

## 8. 오류 코드

| 코드 | 의미 |
|---|---|
| PDF_OPEN_FAILED | PDF 열기 실패 |
| PDF_PASSWORD_REQUIRED | 암호 필요 |
| PDF_PERMISSION_DENIED | 권한 없음 |
| PDF_DAMAGED | 파일 손상 |
| PDF_UNSUPPORTED_FEATURE | 미지원 PDF 기능 |
| JOB_CANCELED | 사용자가 작업 취소 |
| OCR_LANGUAGE_MISSING | OCR 언어 데이터 없음 |
| OUTPUT_WRITE_FAILED | 출력 파일 저장 실패 |
| UPDATE_SIGNATURE_INVALID | 업데이트 서명 검증 실패 |
| CONTEXT_MENU_REGISTRY_FAILED | 우클릭 메뉴 등록 실패 |

## 9. 성능 목표

- 앱 cold start: 3초 이하 목표
- 일반 PDF 첫 페이지 표시: 1초 이하 목표
- 썸네일 렌더링: 보이는 페이지 우선
- 1,000페이지 이상 PDF: 가상 리스트 사용
- 모든 CPU-heavy 작업은 UI thread에서 실행 금지
