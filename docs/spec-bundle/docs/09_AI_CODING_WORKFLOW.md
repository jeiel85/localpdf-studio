# 09. AI Coding Workflow

## 1. 에이전트 분담

| 역할 | 권장 AI/도구 | 담당 |
|---|---|---|
| PM/설계 | ChatGPT | 제품 명세, 기능 범위, 로드맵, 우선순위 |
| 구현 에이전트 | Cursor / Windsurf / Claude Code / Gemini CLI | 코드 작성, 리팩터링, 테스트 |
| 코드 리뷰 | ChatGPT / Claude | 변경 검토, 리스크 체크 |
| UI 제작 | v0 / Figma / ChatGPT | 화면 와이어프레임, 컴포넌트 구조 |
| 릴리즈 운영 | GitHub Actions + AI | 태그, 릴리즈 노트, 산출물 검증 |

## 2. 작업 단위

한 번에 하나의 기능만 구현한다.

좋은 작업 단위:

- PDF 열기 화면 구현
- PDF.js viewer integration
- 최근 파일 저장
- qpdf 병합 command 구현
- 병합 마법사 UI 구현
- updater manifest 검증 구현

나쁜 작업 단위:

- PDF 앱 전체 구현
- 모든 기능 한 번에 만들기
- UI 전면 개선
- 전체 구조 갈아엎기

## 3. 프롬프트 기본 형식

```text
너는 이 저장소의 구현 에이전트다.
반드시 AGENTS.md, docs/00_PRODUCT_BRIEF.md, docs/03_ARCHITECTURE.md, TASKS.md를 먼저 읽고 작업해라.

이번 작업:
-

완료 조건:
-

범위 제한:
-

검증:
-

작업 후 HISTORY.md와 CHANGELOG.md를 갱신해라.
```

## 4. 구현 순서

1. 프로젝트 스캐폴딩
2. PDF 열기/보기
3. 최근 파일/설정 저장
4. 페이지 썸네일
5. 병합
6. 분할
7. 회전/추출
8. 압축
9. OCR
10. 우클릭 메뉴
11. 설치 파일
12. 자동 업데이트
13. 테스트/문서/릴리즈 안정화

## 5. 코드 리뷰 체크리스트

- 요청 범위 안에서만 변경했는가
- 새 의존성 라이선스를 확인했는가
- UI thread를 막지 않는가
- 원본 PDF를 안전하게 보존하는가
- 실패 시 사용자 메시지가 명확한가
- 로그에 민감정보가 남지 않는가
- 테스트가 추가되었는가
- 문서가 갱신되었는가
