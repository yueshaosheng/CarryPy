import { test, expect } from './fixtures';

test('quick-start guide: toggle button keeps it accessible after builds', async ({ page, consoleErrors }) => {
  test.setTimeout(300000);
  // first view: guide open by default
  await expect(page.locator('.page-scroll')).toContainText('三步得到可离线部署的 Python 环境');
  const toggle = page.getByRole('button', { name: '快速上手' });
  await expect(toggle).toBeVisible();

  // run a build; guide must remain reachable afterwards
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('textarea').first().fill('six');
  await page.locator('button', { hasText: '开始构建' }).click();
  await expect(page.locator('.arco-tag', { hasText: '成功' })).toBeVisible({ timeout: 240000 });
  await page.locator('.nav-item', { hasText: '构建' }).click();
  await expect(page.locator('.task-card').first()).toBeVisible();

  // hide via toggle
  await toggle.click();
  await expect(page.locator('.page-scroll')).not.toContainText('三步得到可离线部署的 Python 环境');
  // bring back via toggle
  await toggle.click();
  await expect(page.locator('.page-scroll')).toContainText('三步得到可离线部署的 Python 环境');

  // hide again, reload -> persisted hidden
  await toggle.click();
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('.page-scroll')).not.toContainText('三步得到可离线部署的 Python 环境');
  await page.getByRole('button', { name: '快速上手' }).click();
  await expect(page.locator('.page-scroll')).toContainText('三步得到可离线部署的 Python 环境');

  expect(consoleErrors).toEqual([]);
});