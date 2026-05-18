# AGENTS.md

이 문서는 AI 코딩 에이전트가 `LocalPDF Studio` 저장소에서 작업할 때 따라야 하는 공통 규칙입니다.

업로드된 범용 `AGENTS.md`의 핵심 원칙을 이 프로젝트에 맞게 적용했습니다. 특히 자동 진행, 안전한 중단 조건, 문서/이력 갱신, 릴리즈 산출물 검증, 한국어 커뮤니케이션, 시크릿 보호, 라이선스 검토 원칙을 유지합니다.

## 1. 프로젝트 설정값

```text
Project Name: LocalPDF Studio
Repository: https://github.com/jeiel85/localpdf-studio.git
Main Branch: main
Primary Spec: docs/00_PRODUCT_BRIEF.md
Architecture Spec: docs/03_ARCHITECTURE.md
Feature Spec: docs/01_FEATURE_SPEC.md
UI Spec: docs/02_UI_UX_SPEC.md
Task Document: TASKS.md
Decision Log: DECISION_LOG.md
History Document: HISTORY.md
Changelog: CHANGELOG.md
Version Files: package.json, src-tauri/Cargo.toml, src-tauri/tauri.conf.json, CHANGELOG.md
Build/Test Commands:
  - npm run lint
  - npm run typecheck
  - npm run test
  - npm run tauri build
Release Trigger: tag push
CI System: GitHub Actions
Expected Assets:
  - LocalPDF-Studio_x64-setup.exe
  - LocalPDF-Studio_x64.msi
  - LocalPDF-Studio_x64-portable.zip
  - latest.json
  - signature files
```

## 2. 기본 작업 원칙

- 사용자가 명시한 작업 범위 안에서는 분석, 구현, 문서 갱신, 검증, 커밋, 푸시, CI 확인까지 가능한 범위에서 자동 진행한다.
- 보안, 데이터 손실, 라이선스, 비용, 외부 서비스, 파괴적 Git 명령은 자동 진행하지 않는다.
- 설명, 커밋 메시지, 이슈 코멘트, 작업 요약은 한국어를 기본으로 작성한다.
- 불확실한 사실은 추측하지 않고 확인 결과 또는 미확인 상태를 명시한다.
- 코드 변경 시 관련 문서도 함께 갱신한다.

## 3. PDF 앱 특화 금지/주의 항목

사용자 승인 또는 별도 라이선스 검토 없이 아래 항목을 추가하지 않는다.

- 광고 SDK, 분석 SDK, 추적 SDK
- 로그인/계정/클라우드 동기화
- 사용자의 PDF 파일을 외부 서버로 업로드하는 기능
- DRM 우회, 암호 우회, 권한 우회 기능
- Ghostscript, MuPDF, Poppler, PyMuPDF 등 GPL/AGPL 또는 상용 라이선스 검토가 필요한 구성요소의 기본 번들 포함
- 인터넷 기반 OCR 또는 외부 AI API OCR
- 릴리즈 서명 키, 업데이트 개인 키, 인증서, 토큰의 저장소 커밋
- 데이터 삭제 가능성이 있는 마이그레이션

## 4. 구현 원칙

- UI와 PDF 처리 코어를 분리한다.
- 긴 PDF 작업은 Rust worker/task queue에서 비동기 실행하고 UI를 멈추지 않는다.
- 모든 파일 작업은 임시 출력 후 atomic replace 전략을 사용한다.
- 원본 PDF는 기본적으로 덮어쓰지 않는다.
- 작업 전 자동 백업 옵션을 제공한다.
- PDF 처리 실패 시 사용자가 이해할 수 있는 메시지와 개발자가 추적 가능한 로그를 함께 남긴다.
- 사용자 파일 경로, 외부 명령 인자, 업데이트 URL, ZIP 경로는 모두 검증한다.
- PDF 파서는 신뢰할 수 없는 입력을 다루므로 샌드박스, timeout, 파일 크기 제한, 작업 취소를 고려한다.

## 5. 검증 원칙

변경 후 가능한 범위에서 아래 순서로 검증한다.

1. 린트
2. 타입 체크
3. 단위 테스트
4. 통합 테스트
5. 앱 빌드
6. 핵심 플로우 수동 확인
7. GitHub Actions 결과 확인
8. 릴리즈 산출물 유효성 확인

실제로 실행하지 않은 검증을 성공한 것처럼 기록하지 않는다.

## 6. 문서 갱신 규칙

- 기능 명세 변경: `docs/01_FEATURE_SPEC.md`
- UI 변경: `docs/02_UI_UX_SPEC.md`
- 아키텍처 변경: `docs/03_ARCHITECTURE.md`
- 라이브러리/라이선스 변경: `docs/04_PDF_ENGINE_LIBRARIES.md`, `docs/07_SECURITY_PRIVACY_LICENSE.md`
- 우클릭 메뉴 변경: `docs/05_WINDOWS_CONTEXT_MENU.md`
- 배포/업데이트 변경: `docs/06_INSTALLER_UPDATE_RELEASE.md`
- 작업 이력: `HISTORY.md`
- 사용자 영향 변경: `CHANGELOG.md`
- 기술 결정: `DECISION_LOG.md`

## 7. Final Report Format

```text
작업 요약:
-

변경 파일:
-

검증:
- 로컬:
- CI:
- 생략한 검증:

커밋:
-

푸시:
-

후속 작업:
-
```
