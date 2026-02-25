import { test, expect } from '@playwright/test';

test.describe('ReviewBoost E2E Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/ReviewBoost/i);
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: '로그인', exact: true })).toBeVisible();
  });

  test('signup page loads', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('heading', { name: '회원가입', exact: true })).toBeVisible();
  });

  test('pricing page loads', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: '요금제 (MVP)', exact: true })).toBeVisible();
  });

  test('homepage has no critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(e => !e.includes('favicon') && !e.includes('manifest'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('dashboard shell and tabs are operable', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: '리뷰 CSV 분석' })).toBeVisible();

    const drawerToggleClose = page.getByRole('button', { name: '사이드바 닫기' });
    await drawerToggleClose.click();
    await expect(page.getByRole('button', { name: '사이드바 펼치기' })).toBeVisible();

    const resultsTab = page.getByRole('tab', { name: '결과 보기' });
    await resultsTab.click();
    await expect(page.getByRole('heading', { name: '아직 분석 결과가 없습니다' })).toBeVisible();

    await page.getByRole('tab', { name: '분석하기' }).click();
    await expect(page.getByRole('tab', { name: '분석하기' })).toHaveAttribute('aria-selected', 'true');

    const openToggle = page.getByRole('button', { name: '사이드바 펼치기' });
    await openToggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: '사이드바 닫기' })).toBeVisible();
  });
});
