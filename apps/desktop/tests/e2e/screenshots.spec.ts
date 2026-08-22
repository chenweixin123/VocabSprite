import { expect, test } from '@playwright/test';

test('capture reproducible onboarding, compact card and dashboard', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '让单词出现得刚刚好。' })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/01-onboarding.png', fullPage: true });
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole('button', { name: /继续/ }).click();
  }
  await page.getByRole('button', { name: /显示第一张卡/ }).click();
  await expect(page.getByRole('article', { name: /学习卡/ })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/02-compact-card.png', fullPage: true });
  await page.getByRole('button', { name: '打开卡片快捷设置' }).click();
  await page
    .getByRole('article', { name: /学习卡/ })
    .screenshot({ path: 'docs/screenshots/02b-compact-quick-settings.png' });
  await page.getByRole('button', { name: '完成' }).click();
  await page.getByRole('button', { name: '展开详细面板' }).click();
  await expect(page.getByRole('heading', { name: /今天，稳稳记住/ })).toBeVisible();
  await page.screenshot({ path: 'docs/screenshots/03-dashboard.png', fullPage: true });
});
