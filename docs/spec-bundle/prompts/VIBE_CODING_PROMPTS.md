# Vibe Coding Prompts

## 1. 저장소 초기화

```text
너는 LocalPDF Studio 저장소의 구현 에이전트다.
반드시 AGENTS.md, README.md, docs/00_PRODUCT_BRIEF.md, docs/03_ARCHITECTURE.md, TASKS.md를 먼저 읽어라.

이번 작업:
Tauri 2 + React + TypeScript + Rust 기반 프로젝트를 초기화하고 문서에 정의된 폴더 구조를 만든다.

완료 조건:
- 앱이 개발 모드로 실행된다.
- 기본 Home 화면이 표시된다.
- lint/typecheck 명령이 정의된다.
- HISTORY.md와 CHANGELOG.md가 갱신된다.

범위 제한:
- PDF 기능은 아직 구현하지 않는다.
- 새 외부 서비스나 분석 SDK를 추가하지 않는다.
```

## 2. PDF.js Viewer 구현

```text
이번 작업:
PDF.js를 사용해서 로컬 PDF 파일을 열고 첫 페이지를 렌더링하는 viewer foundation을 구현한다.

완료 조건:
- 파일 열기 버튼으로 PDF를 선택할 수 있다.
- 첫 페이지가 canvas에 표시된다.
- 페이지 수와 현재 페이지가 상태바에 표시된다.
- 확대/축소가 동작한다.
- 실패 시 사용자 메시지를 표시한다.

범위 제한:
- 병합/분할/OCR은 구현하지 않는다.
- 원본 파일을 수정하지 않는다.
```

## 3. qpdf 병합 기능

```text
이번 작업:
Rust backend에서 qpdf를 호출해 여러 PDF를 병합하는 기능을 구현한다.

완료 조건:
- Merge Wizard에서 여러 PDF를 추가할 수 있다.
- 순서를 변경할 수 있다.
- 출력 파일을 지정할 수 있다.
- 병합 작업은 job queue에서 실행된다.
- 작업 진행률과 완료/실패 상태가 표시된다.
- 실패 시 원본 파일은 변경되지 않는다.

검증:
- 2개 PDF 병합 테스트
- 한글 경로 PDF 병합 테스트
- 없는 파일 입력 실패 테스트
```

## 4. Windows 우클릭 메뉴

```text
이번 작업:
Windows Explorer 우클릭 메뉴와 SendTo 바로가기를 등록/해제하는 기능을 구현한다.

완료 조건:
- Settings > Context Menu에서 on/off 가능하다.
- PDF 파일 우클릭에 LocalPDF Studio > Open, Compress PDF 메뉴가 표시된다.
- SendTo 바로가기가 생성된다.
- uninstall 시 등록 항목이 제거된다.
- CLI open/compress command가 동작한다.

주의:
- Registry 작업 전 사용자 범위 HKCU를 우선 사용한다.
- 관리자 권한이 필요한 HKLM 등록은 하지 않는다.
```

## 5. 자체 업데이트

```text
이번 작업:
Tauri updater plugin을 사용해 업데이트 확인 UI를 구현한다.

완료 조건:
- Settings > Updates에서 수동 업데이트 확인 가능
- 업데이트가 없을 때 명확한 메시지 표시
- 업데이트가 있을 때 버전과 릴리즈 노트 표시
- 서명 검증 실패 시 설치 차단
- 업데이트 로그 저장

범위 제한:
- 실제 배포 키는 저장소에 넣지 않는다.
- 테스트용 로컬 manifest만 사용한다.
```
