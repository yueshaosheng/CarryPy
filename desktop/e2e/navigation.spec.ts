import { test, expect, navTo } from './fixtures';

test('navigation: all pages render with key elements', async ({ page, consoleErrors }) => {
  // Build page: 10 platforms + quick-start guide on first view
  await expect(page.locator('.page-head h1')).toHaveText('构建');
  await expect(page.locator('.page-scroll')).toContainText('快速上手');
  await expect(page.locator('.page-scroll')).toContainText('三步得到可离线部署的 Python 环境');
  await page.locator('.arco-select-view').first().click();
  const options = page.locator('.arco-select-option');
  await expect(options).toHaveCount(10);
  await expect(page.locator('.arco-select-option').first()).toContainText('centos6_amd64');
  await page.keyboard.press('Escape');

  // Tasks page
  await navTo(page, '任务');
  await expect(page.locator('.page-head h1')).toHaveText('任务');

  // Artifacts page
  await navTo(page, '产物');
  await expect(page.locator('.page-head h1')).toHaveText('产物');

  // Docker page
  await navTo(page, 'Docker');
  await expect(page.locator('.page-head h1')).toHaveText('Docker');

  // Settings page
  await navTo(page, '设置');
  await expect(page.locator('.page-head h1')).toHaveText('设置');
  await expect(page.locator('.arco-descriptions')).toBeVisible();

  expect(consoleErrors).toEqual([]);
});

test('presets: platform-specific GUI branches', async ({ page }) => {
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'ubuntu24_amd64' }).click();
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('button', { hasText: 'GUI 套' }).click();
  await expect(page.locator('textarea').first()).toHaveValue('pyqt6');
  const sysArea = page.locator('.arco-collapse-item-active textarea');
  await expect(sysArea).toHaveValue(/libglib2\.0-0t64/);
  await expect(sysArea).toHaveValue(/libasound2t64/);

  // rocky8: no xcb-util-cursor; rocky9: has it
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'rocky8_amd64' }).click();
  await page.locator('button', { hasText: 'GUI 套' }).click();
  await expect(page.locator('.arco-collapse-item-active textarea')).not.toHaveValue(/xcb-util-cursor/);
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'rocky9_amd64' }).click();
  await page.locator('button', { hasText: 'GUI 套' }).click();
  await expect(page.locator('.arco-collapse-item-active textarea')).toHaveValue(/xcb-util-cursor/);

  // centos6: GUI disabled with reason; science preset has pinned versions
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'centos6_amd64' }).click();
  await expect(page.locator('button', { hasText: 'GUI 套' })).toBeDisabled();
  await expect(page.locator('.page-scroll')).toContainText('glibc 2.12 无可行 GUI 包');
  await page.getByRole('button', { name: '科学计算套', exact: true }).click();
  await expect(page.locator('textarea').first()).toHaveValue(/numpy==1\.26\.4/);
  await expect(page.locator('textarea').first()).toHaveValue(/h5py==3\.10\.0/);
});

test('validation: illegal package names blocked', async ({ page }) => {
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('textarea').first().fill('foo;rm -rf /');
  await expect(page.locator('.page-scroll')).toContainText('包名非法');
  await expect(page.locator('button', { hasText: '开始构建' })).toBeDisabled();
  await page.locator('textarea').first().fill('');
  await expect(page.locator('button', { hasText: '开始构建' })).toBeDisabled();
});