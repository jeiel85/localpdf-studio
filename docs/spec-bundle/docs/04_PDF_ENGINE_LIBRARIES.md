# 04. PDF Engine and Library Strategy

## 1. 라이브러리 선택 원칙

- 상용화 가능성을 해치지 않는 라이선스를 우선한다.
- PDF 렌더링, 구조 조작, OCR을 하나의 라이브러리에 몰아넣지 않는다.
- 기능별로 가장 안전하고 유지보수 가능한 도구를 조합한다.
- GPL/AGPL 계열은 기본 번들에서 제외한다.
- 선택적 외부 도구로 제공할 경우에도 설정 화면에서 라이선스와 책임 범위를 명확히 표시한다.

## 2. 기본 채택 후보

| 영역 | 후보 | 용도 | 라이선스 관점 | 채택 |
|---|---|---|---|---|
| Viewer | PDF.js | 화면 렌더링, 텍스트 레이어, 검색 | Apache-2.0 | 기본 |
| Native render | PDFium | 썸네일, 이미지 렌더링, 일부 메타/폼 | BSD-3-Clause | 기본 |
| PDF 구조 조작 | qpdf | 병합, 분할, 암호화, linearize, repair | Apache-2.0 | 기본 |
| Python wrapper 후보 | pikepdf | qpdf 기반 PDF 조작 | MPL-2.0 | 선택 |
| OCR | Tesseract | OCR 엔진 | Apache-2.0 | 기본 |
| OCR workflow | OCRmyPDF | OCR PDF 생성 | MPL-2.0, 외부 의존성 주의 | 선택 |
| Installer/update | Tauri | 데스크톱 shell, installer, updater | 프로젝트별 라이선스 확인 | 기본 |

## 3. 기본 제외 또는 주의 후보

| 후보 | 이유 |
|---|---|
| Ghostscript | AGPL 또는 상용 라이선스 선택이 필요하므로 기본 번들 제외 |
| MuPDF | AGPL 또는 상용 라이선스 검토 필요 |
| Poppler | GPL 계열 구성 검토 필요 |
| PyMuPDF | AGPL 또는 상용 라이선스 검토 필요 |
| iText | AGPL 또는 상용 라이선스 검토 필요 |
| PDFsharp/MigraDoc | .NET 스택이면 검토 가능하지만 Tauri/Rust 기본안에서는 제외 |

## 4. 기능별 구현 전략

### 열람/검색

- PDF.js viewer를 커스터마이징한다.
- `file://` 직접 접근 대신 Tauri의 안전한 로컬 파일 제공 또는 backend stream을 사용한다.
- 텍스트 레이어를 켜서 검색/선택/복사를 지원한다.

### 썸네일

- PDFium으로 페이지 이미지를 생성하고 캐싱한다.
- 캐시 키:
  - file hash
  - page number
  - render size
  - theme option
- 캐시는 앱 캐시 폴더에 저장한다.

### 병합/분할/회전/추출

- qpdf를 우선 사용한다.
- Rust에서 qpdf CLI를 안전하게 호출한다.
- 인자는 shell string이 아니라 argument array로 전달한다.
- 작업 전 입력 파일 존재/확장자/크기/권한을 확인한다.

### 암호화/암호 해제

- qpdf 기반.
- 암호 해제는 사용자가 알고 있는 암호를 입력한 경우에만 허용한다.
- 암호 우회, brute-force, 권한 우회 기능은 금지한다.

### OCR

- 1차: PDFium으로 페이지 이미지 생성 → Tesseract OCR → 텍스트 레이어 PDF 생성.
- 2차: OCRmyPDF 연동은 선택 기능으로 검토한다.
- Ghostscript 의존성 때문에 OCRmyPDF를 앱에 기본 번들하는 것은 보류한다.

### 압축

- 1차 안전 압축:
  - qpdf linearization
  - object stream 생성
  - 중복 구조 정리
  - 메타데이터 제거
- 2차 고급 압축:
  - 이미지 다운샘플링
  - JPEG 품질 변경
  - 흑백/그레이스케일 변환
  - 이 단계는 별도 라이선스 검토 후 구현한다.

## 5. 라이선스 검토 체크리스트

새 라이브러리 추가 전 확인:

- SPDX license
- 의존성 license
- 바이너리 번들 가능 여부
- 정적 링크/동적 링크 차이
- 수정 소스 공개 의무
- 상업적 배포 가능 여부
- Windows installer에 포함 가능 여부
- NOTICE 파일 필요 여부
- 앱 About 화면에 고지 필요 여부

## 6. 권장 NOTICE 구조

```text
LocalPDF Studio uses the following open source components:
- PDF.js
- PDFium
- qpdf
- Tesseract OCR
- Tauri
...
```

각 항목에는 이름, 버전, 라이선스, 원본 URL, 저작권 고지를 포함한다.
