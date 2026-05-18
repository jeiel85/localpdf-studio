# 06. Installer, Update, Release Specification

## 1. 산출물

Windows 1차 릴리즈 산출물:

- `LocalPDF-Studio_x64-setup.exe`
- `LocalPDF-Studio_x64.msi`
- `LocalPDF-Studio_x64-portable.zip`
- `latest.json`
- update signature files
- checksums.txt
- SBOM, optional

## 2. 설치 옵션

Installer 화면:

- 설치 경로 선택
- 바탕화면 바로가기
- 시작 메뉴 바로가기
- PDF 우클릭 메뉴 추가
- SendTo 메뉴 추가
- PDF 기본 앱 설정, 선택
- 자동 업데이트 사용
- 설치 후 실행

## 3. Portable ZIP

Portable 정책:

- 앱 실행 파일과 필요 바이너리를 포함한다.
- 설정과 캐시는 기본적으로 사용자 프로필에 저장한다.
- `--portable` 인자가 있으면 실행 폴더 하위 `data/`에 저장한다.
- 자동 업데이트는 portable 모드에서 기본 비활성화한다.

## 4. 자체 업데이트

업데이트 흐름:

1. 앱 시작 후 백그라운드로 업데이트 확인
2. 사용자가 설정에서 수동 확인 가능
3. `latest.json` 다운로드
4. 버전 비교
5. 서명 검증
6. 릴리즈 노트 표시
7. 다운로드
8. 설치
9. 앱 재시작 안내

필수 정책:

- 서명 검증 실패 시 설치 금지
- prerelease 채널과 stable 채널 분리
- 강제 업데이트는 보안 이슈에 한정
- 업데이트 실패 시 기존 앱 유지
- 업데이트 로그 저장

## 5. latest.json 예시

```json
{
  "version": "0.1.0",
  "notes": "Initial public release",
  "pub_date": "2026-05-18T00:00:00Z",
  "platforms": {
    "windows-x86_64": {
      "signature": "SIGNATURE_HERE",
      "url": "https://github.com/jeiel85/localpdf-studio/releases/download/v0.1.0/LocalPDF-Studio_x64-setup.exe"
    }
  }
}
```

## 6. GitHub Actions 릴리즈 파이프라인

태그 `vX.Y.Z` push 시:

1. checkout
2. setup node
3. setup rust
4. npm ci
5. lint
6. typecheck
7. test
8. tauri build
9. generate checksums
10. generate latest.json
11. upload release assets
12. verify release assets
13. publish GitHub Release

## 7. 버전 동기화

버전 변경 시 아래 파일을 동시에 수정한다.

- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- `CHANGELOG.md`
- `docs/releases/vX.Y.Z.md`, 선택
- update manifest

## 8. 릴리즈 전 체크리스트

- [ ] 앱 실행 가능
- [ ] PDF 열기 가능
- [ ] 병합/분할/압축/OCR 핵심 플로우 확인
- [ ] 우클릭 메뉴 등록/해제 확인
- [ ] 설치/삭제 확인
- [ ] 업데이트 manifest 서명 확인
- [ ] 민감정보가 로그/릴리즈에 포함되지 않음
- [ ] LICENSE/NOTICE 최신화
- [ ] CHANGELOG 최신화
- [ ] HISTORY 최신화
- [ ] GitHub Release assets 확인

## 9. 실패 대응

| 실패 | 대응 |
|---|---|
| 설치 실패 | installer log 저장, 기존 버전 유지 |
| 업데이트 다운로드 실패 | 재시도, 수동 다운로드 링크 표시 |
| 서명 검증 실패 | 업데이트 차단, 보안 경고 |
| 우클릭 메뉴 등록 실패 | 관리자 권한 안내, 설정에서 재시도 |
| 바이너리 누락 | 앱 시작 시 dependency health check 표시 |
