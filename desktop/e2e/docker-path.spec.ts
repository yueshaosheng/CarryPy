import { test, expect } from './fixtures';
import { _electron as electron } from 'playwright';
import path from 'path';
import fs from 'fs';

// Finder/Dock 启动的 GUI 应用只有最小 PATH; docker 装在 /usr/local/bin 等位置。
// 主进程必须在启动时补全 PATH, 否则查询与构建脚本全部 ENOENT。
test('docker works under Finder-like minimal PATH', async ({ userData }) => {
  test.setTimeout(300000);
  const app = await electron.launch({
    args: [path.resolve(__dirname, '../out/main/index.js')],
    env: {
      ...process.env,
      PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
      CARRYPY_USER_DATA: userData,
      CARRYPY_OFFLINE: '1'
    }
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');

  const status = await page.evaluate(() => window.carrypy.dockerStatus());
  expect(status.ok).toBe(true);
  expect(status.version).toBeTruthy();

  // 完整构建链路在最小 PATH 下也必须工作 (build.sh 内部同样调用 docker)
  await page.locator('.arco-select-view').first().click();
  await page.locator('.arco-select-option', { hasText: 'ubuntu22_amd64' }).click();
  await page.locator('.arco-radio-button', { hasText: '增量包' }).click();
  await page.locator('textarea').first().fill('six');
  await page.locator('button', { hasText: '开始构建' }).click();
  await expect(page.locator('.arco-tag', { hasText: '成功' })).toBeVisible({ timeout: 240000 });
  await expect(page.locator('#root')).toContainText('addon-ubuntu22_amd64-six.tar.gz');
  await app.close();
});