# Windows Context Menu

## Phase 1

HKCU registry 기반 context menu를 등록합니다.

```powershell
scripts/windows/install-context-menu.ps1 -ExePath "C:\Path\LocalPDFStudio.exe"
```

## Supported Actions

- open
- merge
- split
- compress
- ocr
- rotate
- extract-pages
- convert-images
- extract-text
- encrypt
- watermark
- stamp
- metadata

## CLI Contract

```text
localpdf-studio.exe --context-action <action> --files "C:\file.pdf"
```

## Phase 2

SendTo 메뉴를 추가해 다중 파일 선택 병합 UX를 보완합니다.

## Phase 3

ExplorerCommand COM Shell Extension을 별도 네이티브 모듈로 검토합니다.
