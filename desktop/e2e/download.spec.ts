import { test, expect, navTo } from './fixtures';

test('download page: offline bundled data + detection + actions', async ({ page, consoleErrors }) => {
  await navTo(page, '下载');
  await expect(page.locator('.dl-title')).toContainText('获取');
  await expect(page.locator('.dl-version')).toHaveText('v1.0.1');
  await expect(page.locator('.dl-card')).toHaveCount(3);
  await expect(page.locator('.dl-card.detected .dl-card-head h3')).toHaveText('macOS');
  await expect(page.locator('.dl-main-btn')).toContainText('下载 macOS 版 (Apple Silicon)');

  // mac card rows: Apple Silicon + Intel
  const macCard = page.locator('.dl-card', { hasText: 'macOS' });
  await expect(macCard.locator('.dl-row')).toHaveCount(2);
  await expect(macCard.locator('.dl-arch').first()).toHaveText('Apple Silicon (arm64)');
  await expect(macCard.locator('.dl-format').first()).toContainText('.dmg');

  // linux card: deb + AppImage rows
  const linuxCard = page.locator('.dl-card', { hasText: 'Linux' });
  await expect(linuxCard.locator('.dl-format', { hasText: '.deb — Debian / Ubuntu' })).toHaveCount(1);
  await expect(linuxCard.locator('.dl-format', { hasText: '.AppImage' })).toHaveCount(1);

  // offline indicator + refresh works
  await expect(page.locator('.dl-offline')).toContainText('离线数据');
  await page.locator('.dl-offline button').click();
  await expect(page.locator('.dl-card')).toHaveCount(3);

  // releases link row
  await expect(page.locator('.dl-foot')).toContainText('GitHub Releases');

  await page.screenshot({ path: 'e2e/.tmp/download-light.png', fullPage: true, animations: 'disabled' });
  expect(consoleErrors).toEqual([]);
});