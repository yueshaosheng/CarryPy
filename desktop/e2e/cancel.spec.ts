import { test, expect } from './fixtures';

test('cancel: base build cancelled with process-group cleanup', async ({ page, app, consoleErrors }) => {
  test.setTimeout(180000);
  // base build on ubuntu22 (default python resolves latest patch -> long compile; we cancel early)
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'ubuntu22_amd64' }).click();
  await page.locator('button', { hasText: '开始构建' }).click();
  await expect(page.locator('.log-terminal')).toBeVisible();
  await expect(page.locator('.log-terminal pre')).toContainText('构建参数', { timeout: 30000 });

  await page.locator('button', { hasText: '取消构建' }).click();
  await page.locator('.arco-popconfirm .arco-btn-primary').click();

  await expect(page.locator('.arco-tag', { hasText: '已取消' })).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.log-terminal pre')).toContainText('任务已取消');

  // no leftover containers from this image
  const { execFileSync } = await import('child_process');
  const ps = execFileSync('docker', ['ps', '-q', '--filter', 'ancestor=mini-py-pack/ubuntu22_amd64:py3.11'], { encoding: 'utf-8' }).trim();
  expect(ps).toBe('');

  expect(consoleErrors).toEqual([]);
  void app;
});