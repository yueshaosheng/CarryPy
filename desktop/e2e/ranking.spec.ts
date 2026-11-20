import { test, expect } from './fixtures';

test('ranking drawer: browse, search, add packages with dedup', async ({ page, consoleErrors }) => {
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('button', { hasText: '热门包榜' }).click();
  const drawer = page.locator('.arco-drawer');
  await expect(drawer).toBeVisible();
  await expect(drawer).toContainText('PyPI 热门包榜');
  // bundled ranking has 31 packages; rows render
  const rows = drawer.locator('.rise-in');
  await expect(rows.first()).toBeVisible();
  expect(await rows.count()).toBeGreaterThanOrEqual(30);
  // top entry is requests (highest downloads in bundled data)
  await expect(rows.first()).toContainText('requests');

  // search filters
  await drawer.locator('.arco-input-search input').fill('numpy');
  await expect(drawer.locator('.rise-in')).toHaveCount(1);
  // add numpy twice -> dedup
  await drawer.locator('.rise-in button').first().click();
  await drawer.locator('.rise-in button').first().click();
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();
  const val = await page.locator('textarea').first().inputValue();
  expect(val.split(/\s+/).filter((p) => p === 'numpy')).toHaveLength(1);

  // platform info no longer shows 默认 N 包
  await expect(page.locator('#platform-info, .page-scroll')).not.toContainText('默认 8 包');
  expect(consoleErrors).toEqual([]);
});

test('system packages: optional, collapsible, auto-filled by GUI preset', async ({ page }) => {
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  // help text explains optional usage
  const collapse = page.locator('.arco-collapse-item', { hasText: '系统包' });
  await expect(collapse).toContainText('可选');
  // expand manually
  await collapse.locator('.arco-collapse-item-header').click();
  await expect(collapse).toContainText('科学计算套与普通包无需填写');
  const sysArea = collapse.locator('textarea');
  await expect(sysArea).toBeVisible();
  await expect(sysArea).toHaveValue('');
  // collapse again (the bug: onChange first arg is key string, not array)
  await collapse.locator('.arco-collapse-item-header').click();
  await expect(sysArea).toBeHidden();

  // GUI preset auto-fills and expands
  await page.locator('button', { hasText: 'GUI 套' }).click();
  await expect(sysArea).toBeVisible();
  await expect(sysArea).not.toHaveValue('');
  // and can still collapse afterwards
  await collapse.locator('.arco-collapse-item-header').click();
  await expect(sysArea).toBeHidden();
});