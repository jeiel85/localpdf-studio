# AGENTS.md

이 문서는 AI 코딩 에이전트가 LocalPDF Studio 저장소에서 작업할 때 따라야 할 규칙입니다.

## 프로젝트 설정값

```text
Project Name: LocalPDF Studio
Repository: https://github.com/jeiel85/localpdf-studio.git
Main Branch: master
Primary Spec: README.md
History Document: HISTORY.md
Changelog: CHANGELOG.md
Task Document: TASKS.md
Decision Log: DECISION_LOG.md
Version Files: package.json, package-lock.json, src-tauri/Cargo.toml, src-tauri/Cargo.lock, src-tauri/tauri.conf.json, CHANGELOG.md
Build/Test Commands: npm run typecheck, npm run build, npm run tauri:build
Release Trigger: tag push
CI System: GitHub Actions
Expected Assets: setup.exe, msi, portable zip, updater signature, latest.json
```

## 작업 원칙

- 기본 설명, 커밋 메시지, 작업 보고는 한국어로 작성한다.
- 작업 전 `git status`를 확인하고 기존 사용자 변경을 덮어쓰지 않는다.
- 코드 변경 시 관련 문서, `HISTORY.md`, `CHANGELOG.md`, `TASKS.md`, `DECISION_LOG.md`를 함께 갱신한다.
- 파괴적 명령(`git reset --hard`, `git clean -fd`, `git push --force`, 태그 삭제, 브랜치 삭제)은 사용자 승인 없이 실행하지 않는다.
- 외부 바이너리, SDK, 네트워크 연동, 업데이트 서버, 코드 서명, 인증서, 시크릿 관련 작업은 문서화 후 안전하게 진행한다.
- PDF 파일 내용은 로컬에서만 처리하고, 사용자가 명시하지 않은 외부 전송을 추가하지 않는다.
- 새 의존성은 라이선스, 유지보수 상태, 보안, 앱 크기 영향을 확인한 뒤 추가한다.
- 검증하지 않은 테스트/빌드 성공을 기록하지 않는다.

## 구현 원칙

- UI와 PDF 처리 로직을 분리한다.
- Rust command 계층은 파일 경로, 확장자, 용량, 출력 경로를 검증한다.
- 장시간 PDF 작업은 UI 스레드를 막지 않고 progress event 또는 job queue로 처리한다.
- 파일 덮어쓰기 작업은 임시 파일 생성 후 원자적 교체 전략을 우선한다.
- 실패 메시지는 사용자용 메시지와 개발자 추적 로그를 분리한다.

## 릴리즈 원칙

- 버전은 SemVer `vX.Y.Z`를 사용한다.
- 릴리즈 전 `package.json`, `Cargo.toml`, `tauri.conf.json`, `CHANGELOG.md` 버전이 일치해야 한다.
- Windows 설치 파일, MSI, Portable ZIP, updater signature, latest.json 존재 여부를 확인한다.
- Tauri updater private key는 절대 저장소에 커밋하지 않는다.
