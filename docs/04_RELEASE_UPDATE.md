# Release and Update

## Build

```bash
npm run tauri:build
```

## Windows Artifacts

- NSIS setup executable
- MSI installer
- updater signature
- portable zip

## Updater

Tauri updater를 사용합니다.

필수 작업:

1. signing key 생성
2. public key를 `tauri.conf.json`에 반영
3. private key를 GitHub Secrets에 저장
4. 릴리즈 시 `latest.json` 생성
5. 앱에서 업데이트 확인 및 재시작 처리

## 주의

업데이트 private key는 절대 저장소에 커밋하지 않습니다.
