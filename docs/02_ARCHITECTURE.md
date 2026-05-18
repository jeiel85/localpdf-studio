# Architecture

## Layers

```text
React UI
  ↓ invoke
Tauri IPC Commands
  ↓
Rust Services
  ↓
PDF Engine Wrappers / File System / Job Queue
```

## Frontend

- 문서 상태 관리
- PDF.js canvas rendering
- 툴바/사이드바/작업 패널
- 업데이트 확인 UI

## Backend

- 파일 검증
- PDF 작업 command
- 외부 도구 탐지
- CLI startup context parsing
- 향후 작업 큐와 progress event 제공

## Current Limitation

초기 구현은 PDF 파일을 Rust에서 base64로 읽어 frontend에 전달합니다. 이 방식은 구현이 단순하지만 대용량 PDF에 비효율적입니다. 상용화 단계에서는 custom protocol 또는 chunk streaming으로 전환합니다.
