import { test, expect, navTo } from './fixtures';

test('theme: dark mode applies and persists', async ({ page, consoleErrors }) => {
  await navTo(page, '设置');
  await page.locator('.arco-radio-button', { hasText: '深色' }).click();
  await expect(page.locator('body')).toHaveAttribute('arco-theme', 'dark');
  await page.screenshot({ path: 'e2e/.tmp/settings-dark.png', animations: 'disabled' });

  await navTo(page, '下载');
  await page.screenshot({ path: 'e2e/.tmp/download-dark.png', fullPage: true, animations: 'disabled' });

  await navTo(page, '设置');
  await page.locator('.arco-radio-button', { hasText: '浅色' }).click();
  await expect(page.locator('body')).not.toHaveAttribute('arco-theme', 'dark');
  expect(consoleErrors).toEqual([]);
});