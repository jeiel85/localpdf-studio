# 릴리즈 QA 체크리스트

이 문서는 태그 릴리즈 전후에 LocalPDF Studio의 핵심 배포 품질을 확인하기 위한 최신 체크리스트다.

외부 계정/인증이 필요한 남은 작업은 [10_EXTERNAL_PUBLISHING_TODO.md](10_EXTERNAL_PUBLISHING_TODO.md)에 따로 정리한다.

## 자동 검증

- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- [x] `cargo test`
- [x] `scripts/windows/validate-winget-manifests.ps1`
- [x] `scripts/windows/publish-chocolatey.ps1 -SkipPush`
- [x] `scripts/windows/verify-release-assets.ps1 -Version 0.17.2 -RequireCrossPlatform`
- [x] `latest.json` updater URL이 실제 GitHub Release asset을 가리키는지 검증

## 태그 릴리즈 산출물

- [x] Windows NSIS setup exe
- [x] Windows NSIS updater signature
- [x] Windows MSI ko-KR/en-US
- [x] Windows MSI updater signatures
- [x] Portable ZIP
- [x] `latest.json`
- [x] macOS Universal DMG
- [x] Linux AppImage / deb / rpm

macOS/Linux 산출물은 v0.17.2 태그 빌드에서 복구 검증됐다.

## 패키지 매니저 제출

- [x] winget 매니페스트 로컬 검증
- [x] winget PR 제출: <https://github.com/microsoft/winget-pkgs/pull/377220>
- [x] Chocolatey `.nupkg` 생성
- [x] Homebrew tap 게시: <https://github.com/jeiel85/homebrew-tap>
- [ ] Chocolatey community push
- [ ] Snap Store push
- [ ] AUR push

남은 3개는 외부 계정 인증이 필요하다. Chocolatey push는 `CHOCO_API_KEY`가 필요하다. 키가 있는 환경에서는 다음 명령으로 제출한다.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows/publish-chocolatey.ps1
```

Snap Store는 Snapcraft 로그인, AUR은 aur.archlinux.org SSH 계정/키가 필요하다.

## 수동 앱 QA

- [ ] 첫 실행 화면 정상
- [ ] 한국어/영어/일본어 UI 전환 정상
- [ ] 다크/라이트/시스템 테마 정상
- [ ] PDF 열기 및 대용량 PDF 스트리밍 정상
- [ ] 암호 PDF 열기/복호화 오류 메시지 정상
- [ ] 검색, 썸네일, 목차, 최근 문서 정상
- [ ] 병합/분할/추출/회전/압축 정상
- [ ] OCR 및 검색 가능 PDF 생성 정상
- [ ] Fill & Sign 저장 및 평탄화 정상
- [ ] 자동 마스킹 추천 및 래스터/벡터 마스킹 저장 정상
- [ ] 인쇄 미리보기 및 출력 정상
- [ ] 설정 저장, 앱 재시작 후 복원 정상
- [ ] 업데이트 확인 실패 시 기존 앱 유지 및 사용자 메시지 정상
- [ ] 설치/삭제 후 우클릭 메뉴 정리 정상
