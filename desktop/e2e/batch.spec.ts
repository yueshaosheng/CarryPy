import { test, expect, navTo } from './fixtures';

async function pinPython(page: import('@playwright/test').Page): Promise<void> {
  // 钉住 3.11.16 命中既有镜像缓存, 避免最新 patch 触发全量 Python 重编译
  await page.locator('.arco-collapse-item-header', { hasText: '高级选项' }).click();
  await page.locator('input[placeholder*="3.12"]').fill('3.11.16');
}

async function openBatchModal(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('button', { hasText: '一键为所有平台构建' }).click();
  await expect(page.locator('.arco-modal')).toBeVisible();
}

async function selectOnly(page: import('@playwright/test').Page, keep: string[]): Promise<void> {
  const boxes = page.locator('.arco-modal .arco-checkbox');
  const count = await boxes.count();
  for (let i = 0; i < count; i++) {
    const box = boxes.nth(i);
    const text = (await box.textContent()) ?? '';
    const name = text.trim();
    const checked = (await box.locator('input').isChecked());
    if (checked && !keep.includes(name)) await box.click();
    if (!checked && keep.includes(name)) await box.click();
  }
}

test('batch: queued tasks run sequentially and all succeed', async ({ page, consoleErrors }) => {
  test.setTimeout(420000);
  await pinPython(page);
  await openBatchModal(page);
  // 打开时默认全选 10 个平台
  await expect(page.locator('.arco-modal .arco-btn-primary')).toContainText('10 个平台');
  await page.locator('.arco-modal .arco-radio', { hasText: '空包基础包' }).click();
  await selectOnly(page, ['ubuntu22_amd64', 'ubuntu20_amd64']);
  await page.locator('.arco-modal .arco-btn-primary').click();
  await expect(page.locator('.page-head h1')).toHaveText('任务');

  const cards = page.locator('.task-card');
  await expect(cards).toHaveCount(2);
  // one running, one queued at start
  await expect(page.locator('.task-card.s-running, .task-card.s-cancelling')).toHaveCount(1);
  await expect(page.locator('.task-card.s-queued')).toHaveCount(1);

  // both eventually succeed (cached images)
  await expect(page.locator('.task-card.s-succeeded')).toHaveCount(2, { timeout: 360000 });
  await expect(page.locator('.task-card.s-queued')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});

test('batch: cancel whole batch stops running and queued', async ({ page, consoleErrors }) => {
  test.setTimeout(180000);
  await pinPython(page);
  await openBatchModal(page);
  await page.locator('.arco-modal .arco-radio', { hasText: '空包基础包' }).click();
  await selectOnly(page, ['ubuntu22_amd64', 'ubuntu20_amd64', 'debian12_amd64']);
  await page.locator('.arco-modal .arco-btn-primary').click();
  await expect(page.locator('.task-card')).toHaveCount(3);

  // open the running task and cancel the batch
  await page.locator('.task-card.s-running').first().click();
  await expect(page.locator('.log-terminal')).toBeVisible();
  await page.locator('button', { hasText: '取消批次' }).click();
  await page.locator('.arco-popconfirm .arco-btn-primary').click();

  await navTo(page, '任务');
  await expect(page.locator('.task-card.s-cancelled')).toHaveCount(3, { timeout: 30000 });
  await expect(page.locator('.task-card.s-queued')).toHaveCount(0);
  expect(consoleErrors).toEqual([]);
});