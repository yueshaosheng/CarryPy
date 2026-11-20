import { test as base, expect, ElectronApplication, Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';

interface Fixtures {
  app: ElectronApplication;
  page: Page;
  userData: string;
  consoleErrors: string[];
}

export const test = base.extend<Fixtures>({
  userData: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'carrypy-e2e-'));
    await use(dir);
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 });
  },
  app: async ({ userData }, use) => {
    const app = await electron.launch({
      args: [path.resolve(__dirname, '../out/main/index.js')],
      env: {
        ...process.env,
        CARRYPY_USER_DATA: userData,
        CARRYPY_OFFLINE: process.env.CARRYPY_OFFLINE ?? '1'
      }
    });
    await use(app);
    // 强制结束: 避免运行中构建触发退出确认对话框阻塞 teardown
    app.process().kill('SIGKILL');
  },
  page: async ({ app }, use) => {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await use(page);
  },
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });
    await use(errors);
  }
});

export { expect };

export async function navTo(page: Page, label: string): Promise<void> {
  await page.locator('.nav-item', { hasText: label }).click();
}