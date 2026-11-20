import { test, expect, navTo } from './fixtures';

test('undo: deleted artifact can be restored from message action', async ({ page, consoleErrors }) => {
  test.setTimeout(300000);
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'ubuntu22_amd64' }).click();
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('textarea').first().fill('six');
  await page.locator('button', { hasText: '开始构建' }).click();
  await expect(page.locator('.arco-tag', { hasText: '成功' })).toBeVisible({ timeout: 240000 });

  await navTo(page, '产物');
  const row = page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' });
  await expect(row).toBeVisible();
  await row.locator('button.arco-btn-status-danger').click();
  await page.locator('.arco-popconfirm .arco-btn-primary').click();
  await expect(page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' })).toHaveCount(0);

  // undo via message action
  await page.locator('.arco-message button', { hasText: '撤销' }).click();
  await expect(page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' })).toBeVisible();

  // delete again to clean up
  await page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' }).locator('button.arco-btn-status-danger').click();
  await page.locator('.arco-popconfirm .arco-btn-primary').click();
  await expect(page.locator('.arco-table-tr', { hasText: 'addon-ubuntu22_amd64-six.tar.gz' })).toHaveCount(0);

  expect(consoleErrors).toEqual([]);
});