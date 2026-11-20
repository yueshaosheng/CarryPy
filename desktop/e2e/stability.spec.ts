import { test, expect, navTo } from './fixtures';

test('stability: repeated detail open/close keeps log intact', async ({ page, consoleErrors }) => {
  test.setTimeout(300000);
  // create a completed task first
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'ubuntu22_amd64' }).click();
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('textarea').first().fill('six');
  await page.locator('button', { hasText: '开始构建' }).click();
  await expect(page.locator('.arco-tag', { hasText: '成功' })).toBeVisible({ timeout: 240000 });
  const fullLen = (await page.locator('.log-terminal pre').textContent())?.length ?? 0;
  expect(fullLen).toBeGreaterThan(100);

  // toggle between list and detail 10 times; log must not duplicate or shrink
  for (let i = 0; i < 10; i++) {
    await page.locator('button', { hasText: '返回' }).click();
    await expect(page.locator('.page-head h1')).toHaveText('任务');
    await page.locator('.task-card').first().click();
    await expect(page.locator('.log-terminal')).toBeVisible();
    const len = (await page.locator('.log-terminal pre').textContent())?.length ?? 0;
    expect(len).toBe(fullLen);
  }

  // artifacts search + filter live
  await navTo(page, '产物');
  await page.locator('.arco-input-search input').fill('six');
  await expect(page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' })).toHaveCount(1);
  await page.locator('.arco-input-search input').fill('nonexistent-xyz');
  await expect(page.locator('.arco-table-tr')).toHaveCount(0);
  await page.locator('.arco-input-search input').fill('');

  expect(consoleErrors).toEqual([]);
});