# DECISION_LOG

## 2026-05-18 - Desktop stack

### Decision

Windows 우선 데스크톱 앱은 **Tauri 2 + React + TypeScript + Rust**로 시작한다.

### Rationale

- 설치 파일과 자체 업데이트 구조를 비교적 빠르게 만들 수 있다.
- Rust backend로 PDF 처리 작업을 UI와 분리하기 좋다.
- React UI는 바이브 코딩 생산성이 높다.
- Windows 우클릭 메뉴와 CLI routing을 구현하기 쉽다.

### Alternatives

- Electron: 생태계는 크지만 앱 크기와 메모리 부담이 큼.
- Qt/C++: 네이티브 품질은 좋지만 1인 개발/바이브 코딩 난이도가 큼.
- .NET/WPF: Windows 전용으로는 좋지만 macOS/Linux 확장성이 낮음.

## 2026-05-18 - PDF library baseline

### Decision

기본 PDF 조합은 PDF.js + PDFium + qpdf + Tesseract로 한다.

### Rationale

- PDF.js: viewer UI에 적합.
- PDFium: native rendering과 썸네일/이미지 렌더링에 적합.
- qpdf: 구조 조작, 병합/분할/암호화에 적합.
- Tesseract: OCR 엔진으로 라이선스가 비교적 활용하기 좋음.

## 2026-05-18 - Exclude risky license components from default bundle

### Decision

Ghostscript, MuPDF, Poppler, PyMuPDF, iText는 기본 번들에 포함하지 않는다.

### Rationale

상용화 가능성을 고려하면 GPL/AGPL 또는 별도 상용 라이선스 검토가 필요한 구성요소는 초기 버전에 포함하지 않는 편이 안전하다.

## 2026-05-18 - Context menu phase strategy

### Decision

우클릭 메뉴는 Registry + SendTo로 시작하고, 다중 선택 고급 메뉴는 ExplorerCommand COM Shell Extension으로 후속 구현한다.

### Rationale

Registry 방식은 빠르게 구현 가능하지만 다중 선택 UX에 제한이 있다. 상용화 수준의 다중 선택 메뉴는 COM shell extension이 더 적합하다.
