import { test, expect } from '@playwright/test';
import path from 'path';

const PAGE_URL = 'file://' + path.resolve(__dirname, '../../docs/download.html');

test('repo download page: renders, detects, fetches release', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(PAGE_URL);

  await expect(page.locator('h1')).toContainText('获取');
  await expect(page.locator('.card')).toHaveCount(3);
  // chromium on Apple Silicon reports arm64 via userAgentData
  await expect(page.locator('.card.detected .card-head h3')).toHaveText('macOS');
  await expect(page.locator('.badge')).toHaveText('已检测');
  await expect(page.locator('#main-label')).toContainText('下载 macOS 版 (Apple Silicon)');
  // online fetch resolves to latest gui-v release with real sizes
  await expect(page.locator('#main-size')).toContainText('MB', { timeout: 15000 });
  await expect(page.locator('#offline')).toBeHidden();
  await expect(page.locator('#version')).toHaveText(/v\d+\.\d+\.\d+/);
  const href = await page.locator('#main-btn').getAttribute('href');
  expect(href).toContain('github.com/yueshaosheng/CarryPy/releases/download/gui-v');

  // copy link toast
  await page.locator('#copy-link').click();
  await expect(page.locator('.toast')).toHaveClass(/show/);

  await page.screenshot({ path: 'e2e/.tmp/repo-download-page.png', fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('repo download page: offline fallback to bundled manifest', async ({ page }) => {
  await page.route('**/api.github.com/**', (route) => route.abort());
  await page.goto(PAGE_URL);
  await expect(page.locator('.card')).toHaveCount(3);
  await expect(page.locator('#offline')).toBeVisible();
  await expect(page.locator('#version')).toHaveText(/v\d+\.\d+\.\d+/);
  await expect(page.locator('.card.detected')).toHaveCount(1);
});