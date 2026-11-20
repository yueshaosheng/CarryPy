import { test, expect, navTo } from './fixtures';
import { _electron as electron } from 'playwright';
import path from 'path';

test('persistence: crash mid-build -> interrupted + full history log', async ({ userData }) => {
  test.setTimeout(180000);
  const launch = (): Promise<import('playwright').ElectronApplication> =>
    electron.launch({
      args: [path.resolve(__dirname, '../out/main/index.js')],
      env: { ...process.env, CARRYPY_USER_DATA: userData, CARRYPY_OFFLINE: '1' }
    });

  const app1 = await launch();
  const page1 = await app1.firstWindow();
  await page1.waitForLoadState('domcontentloaded');
  await page1.locator('.arco-select-view').first().click();
  await page1.locator('.arco-select-option', { hasText: 'ubuntu22_amd64' }).click();
  await page1.locator('button', { hasText: '开始构建' }).click();
  await expect(page1.locator('.log-terminal pre')).toContainText('构建参数', { timeout: 30000 });
  const barText = await page1.locator('.term-bar span').textContent();
  const id = barText?.split('·').pop()?.trim() ?? '';
  expect(id).toMatch(/^[0-9a-f]{12}$/);

  // hard-kill main process = crash (skips before-quit confirmation)
  app1.process().kill('SIGKILL');
  await new Promise((r) => setTimeout(r, 1500));

  const app2 = await launch();
  const page2 = await app2.firstWindow();
  await page2.waitForLoadState('domcontentloaded');
  await navTo(page2, '任务');
  const card = page2.locator('.task-card', { hasText: id });
  await expect(card).toBeVisible();
  await expect(card).toContainText('已中断');
  await card.click();
  await expect(page2.locator('.page-scroll')).toContainText('GUI 服务重启');
  await expect(page2.locator('.log-terminal pre')).toContainText('构建参数');
  await app2.close();
});