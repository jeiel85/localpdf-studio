# E2E 테스트 (Playwright + Tauri WebDriver)

이 디렉터리는 LocalPDF Studio의 end-to-end 테스트를 위한 스캐폴드입니다.
실제 실행하려면 다음 설치가 필요합니다.

## 셋업

```powershell
# Tauri WebDriver 종속성
cargo install tauri-driver --locked

# Playwright + webdriverio
npm install --save-dev @playwright/test webdriverio
npx playwright install
```

## 테스트 실행

```powershell
# 디버그 모드로 앱 빌드
npm run tauri build -- --debug

# 별도 터미널에서 tauri-driver 실행
tauri-driver

# 테스트 실행
npx playwright test e2e/smoke.spec.ts
```

## 현재 상태

- `smoke.spec.ts`: PDF 열기 → 페이지 이동 → 탭 닫기 happy path
- 추가 시나리오 (검색, 페이지 편집, 인쇄)는 추후 확장 예정

## CI 통합

GitHub Actions에서 실행하려면:
1. windows-latest 러너에서 `tauri-driver` 설치
2. xvfb-run (Linux) 또는 WebView2 (Windows) 환경 준비
3. `npx playwright test --reporter=junit`
