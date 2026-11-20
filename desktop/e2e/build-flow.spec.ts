import { test, expect, navTo } from './fixtures';

test('build flow: addon six -> live log -> artifact -> delete', async ({ page, consoleErrors }) => {
  test.setTimeout(300000);
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'ubuntu22_amd64' }).click();
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('textarea').first().fill('six');
  await page.locator('button', { hasText: '开始构建' }).click();

  // navigated to task detail, log streams
  await expect(page.locator('.log-terminal')).toBeVisible();
  await expect(page.locator('.page-head')).toContainText('增量包 · ubuntu22_amd64');
  const len1 = (await page.locator('.log-terminal pre').textContent())?.length ?? 0;
  await page.waitForTimeout(3000);
  const len2 = (await page.locator('.log-terminal pre').textContent())?.length ?? 0;
  expect(len2).toBeGreaterThan(len1);

  // wait for success
  await expect(page.locator('.arco-tag', { hasText: '成功' })).toBeVisible({ timeout: 240000 });
  await expect(page.locator('#root')).toContainText('addon-ubuntu22_amd64-six.tar.gz');

  // artifact appears in artifacts page
  await navTo(page, '产物');
  const row = page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' });
  await expect(row).toBeVisible();

  // delete via popconfirm
  await row.locator('button.arco-btn-status-danger').click();
  await page.locator('.arco-popconfirm .arco-btn-primary').click();
  await expect(page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' })).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});