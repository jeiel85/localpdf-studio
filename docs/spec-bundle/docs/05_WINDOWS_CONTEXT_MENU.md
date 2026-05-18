# 05. Windows Context Menu Specification

## 1. 목표

Windows Explorer에서 PDF 파일을 우클릭했을 때 LocalPDF Studio의 핵심 기능을 바로 실행할 수 있게 한다.

## 2. 접근 방식

### Phase 1: Registry 기반 단일/간단 메뉴

- 구현 난이도 낮음
- NSIS installer에서 등록 가능
- 단일 파일 작업에 적합
- 다중 선택은 제한적일 수 있음

### Phase 2: SendTo 바로가기

- 여러 파일을 앱 인자로 전달하기 쉬움
- 사용자가 `Send to > LocalPDF Studio`로 병합/배치 작업 시작 가능
- 안정성이 높고 구현 난이도 낮음

### Phase 3: ExplorerCommand COM Shell Extension

- 상용화 수준의 진짜 다중 선택 우클릭 메뉴
- C++ 또는 Rust COM 구현 필요
- 설치/해제/서명/Explorer 재시작 이슈를 고려해야 함
- Phase 1 안정화 이후 후속으로 진행

## 3. 메뉴 구성

### PDF 파일 우클릭

```text
LocalPDF Studio
├─ Open
├─ Merge PDFs...
├─ Split PDF...
├─ Compress PDF...
├─ OCR PDF...
├─ Rotate Pages...
├─ Extract Pages...
├─ Convert to Images...
├─ Extract Text...
├─ Protect / Encrypt...
├─ Remove Password...
├─ Add Watermark...
├─ Sign / Stamp...
├─ Compare with...
└─ Properties / Metadata...
```

### 여러 PDF 선택 우클릭

```text
LocalPDF Studio
├─ Merge selected PDFs...
├─ Batch Compress...
├─ Batch OCR...
├─ Batch Convert to Images...
├─ Batch Extract Text...
└─ Open in Batch Jobs...
```

### 폴더 우클릭

```text
LocalPDF Studio
├─ Merge PDFs in this folder...
├─ Batch Compress PDFs...
├─ Batch OCR PDFs...
├─ Convert PDFs to Images...
└─ Watch folder, optional
```

### 빈 공간 우클릭

```text
LocalPDF Studio
├─ Create PDF from Images...
├─ Open LocalPDF Studio
└─ New Blank PDF, optional
```

## 4. 명령행 인터페이스

앱은 우클릭 메뉴와 자동화를 위해 CLI 인자를 지원한다.

```bash
localpdf-studio.exe open "file.pdf"
localpdf-studio.exe merge --inputs "a.pdf" "b.pdf" --output "merged.pdf"
localpdf-studio.exe split "file.pdf" --range "1-5,8,10-12"
localpdf-studio.exe compress "file.pdf" --output "file.compressed.pdf"
localpdf-studio.exe ocr "scan.pdf" --lang kor+eng --output "scan.ocr.pdf"
localpdf-studio.exe export-images "file.pdf" --format png --dpi 200
localpdf-studio.exe extract-text "file.pdf" --output "file.txt"
localpdf-studio.exe protect "file.pdf" --password-prompt
localpdf-studio.exe metadata "file.pdf"
localpdf-studio.exe batch --mode compress --inputs ...
```

## 5. 파일 연결

설치 시 선택 옵션:

- PDF 기본 앱으로 설정하지 않음, 기본값
- PDF 기본 앱으로 설정
- `Open with LocalPDF Studio`만 추가

## 6. 등록/해제 UX

Settings > Context Menu:

- 우클릭 메뉴 사용
- PDF 메뉴 등록
- 폴더 메뉴 등록
- SendTo 바로가기 등록
- 고급 메뉴 표시
- 우클릭 메뉴 초기화
- 관리자 권한 필요 여부 표시

## 7. 안전 규칙

- 우클릭으로 실행해도 원본 파일을 기본 덮어쓰지 않는다.
- 출력 파일명은 기본적으로 `원본명.action.pdf` 형식으로 생성한다.
- 여러 파일 처리 중 실패해도 나머지 작업은 계속 진행하고 결과 리포트를 제공한다.
- 인자로 전달된 파일 경로는 반드시 normalize/canonicalize한다.
- UNC path, 긴 경로, 공백, 특수문자, 한글 파일명을 테스트한다.

## 8. Registry 예시, Phase 1

실제 구현 시 installer template에서 경로를 주입한다.

```reg
Windows Registry Editor Version 5.00

[HKEY_CURRENT_USER\Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio]
"MUIVerb"="LocalPDF Studio"
"Icon"="C:\\Program Files\\LocalPDF Studio\\localpdf-studio.exe"
"SubCommands"=""

[HKEY_CURRENT_USER\Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\open]
"MUIVerb"="Open"

[HKEY_CURRENT_USER\Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\open\command]
@="\"C:\\Program Files\\LocalPDF Studio\\localpdf-studio.exe\" open \"%1\""

[HKEY_CURRENT_USER\Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\compress]
"MUIVerb"="Compress PDF..."

[HKEY_CURRENT_USER\Software\Classes\SystemFileAssociations\.pdf\shell\LocalPDFStudio\shell\compress\command]
@="\"C:\\Program Files\\LocalPDF Studio\\localpdf-studio.exe\" compress \"%1\""
```

## 9. 구현 순서

1. CLI 인자 파서 구현
2. 앱 내부 routing 구현
3. 단일 PDF 우클릭 메뉴 등록
4. SendTo 바로가기 등록
5. 폴더 메뉴 등록
6. Settings에서 on/off 제공
7. installer install/uninstall hook 구현
8. ExplorerCommand COM 확장 검토
