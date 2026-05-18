# Vibe Coding Prompts

## 1. 초기 빌드 안정화

```text
이 저장소는 LocalPDF Studio입니다. AGENTS.md를 먼저 읽고 규칙을 따르세요.
목표는 초기 Tauri 2 + React + TypeScript + Rust 앱이 Windows에서 실행되도록 만드는 것입니다.
작업 순서:
1. npm install
2. npm run typecheck
3. npm run build
4. npm run tauri:dev
5. 실패하면 원인 수정
6. HISTORY.md와 CHANGELOG.md에 실제 검증 결과 기록
파괴적 git 명령은 사용하지 마세요.
```

## 2. PDF 뷰어 개선

```text
PDF.js 기반 현재 뷰어를 상용화 가능한 구조로 개선하세요.
목표:
- 페이지 썸네일
- 목차/outline
- 텍스트 검색
- 최근 문서
- 대용량 PDF 로딩 방식 개선 설계와 구현
작업 후 typecheck/build 검증 결과를 기록하세요.
```

## 3. qpdf 병합 기능

```text
qpdf wrapper를 구현해서 여러 PDF 병합 기능을 추가하세요.
요구사항:
- 입력 파일 검증
- 출력 경로 선택
- 덮어쓰기 방지
- 실패 메시지 한국어 처리
- UI 작업 패널 연결
- 테스트 가능한 service 함수 분리
```

## 4. Windows 우클릭 메뉴 통합

```text
scripts/windows/install-context-menu.ps1을 실제 설치 프로그램 hook과 통합하세요.
요구사항:
- HKCU 등록 우선
- uninstall 시 제거
- open/split/compress/ocr/metadata action 처리
- CLI startup context가 frontend로 정상 전달되는지 확인
```
