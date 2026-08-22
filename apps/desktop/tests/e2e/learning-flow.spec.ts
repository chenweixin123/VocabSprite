import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function finishOnboarding(page: Page) {
  await page.goto('/');
  await expect(page.getByText('离线优先')).toBeVisible();
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole('button', { name: /继续/ }).click();
  }
  await page.getByRole('button', { name: /显示第一张卡/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
});

test('onboarding, card feedback, dot and expanded modes form one local journey', async ({
  page,
}) => {
  const offOriginRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!['127.0.0.1', 'localhost'].includes(url.hostname))
      offOriginRequests.push(url.href);
  });
  await finishOnboarding(page);
  await expect(page.getByRole('article', { name: /学习卡/ })).toBeVisible();
  await page.getByRole('button', { name: '显示答案' }).click();
  await page.getByRole('button', { name: /记得/ }).click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('vocabsprite.state.v1');
        if (raw === null) return null;
        const state = JSON.parse(raw) as { reviewEvents?: { feedback?: string }[] };
        return state.reviewEvents?.[0]?.feedback ?? null;
      }),
    )
    .toBe('remembered');

  await page.getByRole('button', { name: '关闭并稍后再出现' }).click();
  await expect(page.getByRole('button', { name: /打开 VocabSprite/ })).toBeVisible();
  const persisted = await page.evaluate(() => localStorage.getItem('vocabsprite.state.v1'));
  expect(persisted).toContain('snoozedUntil');
  expect(persisted).not.toContain('deletedSenseIds":["');

  await page.getByRole('button', { name: /打开 VocabSprite/ }).click();
  await page.getByRole('button', { name: '展开详细面板' }).click();
  await expect(page.getByRole('heading', { name: /今天，稳稳记住/ })).toBeVisible();
  await page.getByRole('button', { name: '学习模块' }).click();
  await expect(page.getByRole('heading', { name: /学习模块/ })).toBeVisible();
  expect(offOriginRequests).toEqual([]);
});

test('delete-all requires explicit second confirmation', async ({ page }) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: '展开详细面板' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await page.getByRole('button', { name: '开始删除…' }).click();
  await expect(page.getByText('此操作不可撤销')).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByRole('button', { name: '开始删除…' })).toBeVisible();
});
