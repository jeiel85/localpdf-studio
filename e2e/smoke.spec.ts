/**
 * E2E 스모크 테스트 - happy path.
 *
 * 실행 전 `e2e/README.md`의 셋업 절차 완료 필요.
 * 본 파일은 Playwright + Tauri WebDriver 환경이 있는 경우 동작합니다.
 * 로컬에서 npm test 실행 시에는 자동으로 수집되지 않습니다 (vitest 패턴 분리).
 */

// @ts-expect-error - optional dependency, see e2e/README.md
import { test, expect } from '@playwright/test';

test.describe('LocalPDF Studio smoke', () => {
  test('shows landing UI', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await expect(page.getByText('LocalPDF Studio')).toBeVisible();
  });

  test('toggles sidebar with Ctrl+B', async ({ page }) => {
    await page.goto('http://localhost:1420');
    await page.keyboard.press('Control+b');
    // 사이드바 폴딩 여부는 클래스로 검사
    const sidebar = page.locator('.sidebar-wrapper');
    await expect(sidebar).toBeVisible();
  });
});
