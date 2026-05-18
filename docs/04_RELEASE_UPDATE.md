# Release and Update

## Build

```bash
npm run tauri:build
```

## Windows Artifacts

- **setup.exe** - NSIS installer (src-tauri/target/release/bundle/nsis/*_x64-setup.exe)
- **setup.exe.sig** - Tauri updater signature
- **MSI** - WiX installer (src-tauri/target/release/bundle/msi/*.msi)
- **Portable ZIP** - scripts/windows/create-portable-zip.ps1로 생성
- **latest.json** - 업데이터 매니페스트 (scripts/windows/generate-latest-json.ps1)

## Updater Key 생성

```bash
npm run tauri signer generate -w ~/.tauri/myapp.key
```

이 명령으로 생성되는:
- **Private key** (~/.tauri/myapp.key): GitHub Secrets → `TAURI_SIGNING_PRIVATE_KEY`에 저장
- **Public key**: 출력되는 공개키를 `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`에 복사
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 키 생성 시 설정한 비밀번호 (있을 경우)

## GitHub Secrets 설정

Repository Settings → Secrets and variables → Actions:

| Secret | 설명 |
|--------|------|
| `TAURI_SIGNING_PRIVATE_KEY` | 업데이터 서명용 개인키 |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | 개인키 비밀번호 (없으면 생략) |

## CI Release Flow

1. 버전 업데이트: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` 버전 일치 확인
2. CHANGELOG.md 업데이트
3. Git tag: `git tag vX.Y.Z && git push origin vX.Y.Z`
4. GitHub Actions `release.yml` 트리거
5. `tauri-action`이 빌드 + 서명 + draft release 생성
6. `create-portable-zip.ps1`이 portable ZIP 생성
7. `action-gh-release`가 portable ZIP을 release에 추가
8. `includeUpdaterJson: true`로 `latest.json` 자동 생성 및 업로드

## 업데이터 엔드포인트

`src-tauri/tauri.conf.json`의 `plugins.updater.endpoints`:

```json
"endpoints": [
  "https://github.com/jeiel85/localpdf-studio/releases/latest/download/latest.json"
]
```

## 주의

- 업데이터 private key는 절대 저장소에 커밋하지 않습니다.
- `pubkey` 필드는 `REPLACE_WITH_TAURI_UPDATER_PUBLIC_KEY`를 실제 공개키로 교체해야 합니다.
- MSI 빌드에는 WiX Toolset v3가 필요합니다 (GitHub Actions windows-latest에 포함).
