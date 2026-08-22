import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import type { Download, Page } from '@playwright/test';

const storageKey = 'vocabsprite.state.v1';

test.setTimeout(60_000);

async function startFresh(page: Page) {
  await page.goto('/');
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload();
}

async function finishOnboarding(page: Page) {
  await startFresh(page);
  await expect(page.getByText('离线优先')).toBeVisible();
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole('button', { name: /继续/ }).click();
  }
  await page.getByRole('button', { name: /显示第一张卡/ }).click();
  await expect(page.getByRole('article', { name: /学习卡/ })).toBeVisible();
}

function observeRuntimeFailures(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  const offOriginRequests: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !['127.0.0.1', 'localhost'].includes(url.hostname)
    )
      offOriginRequests.push(url.href);
  });
  return { pageErrors, consoleErrors, offOriginRequests };
}

async function revealCurrentQuestion(page: Page, type: string) {
  await expect(page.getByText(type, { exact: true })).toBeVisible();
  if (type === '单词 → 含义') {
    await page.getByRole('button', { name: '显示答案' }).click();
  } else if (type === '易混词辨析') {
    await page.locator('.choice-button').first().click();
  } else {
    await page.getByPlaceholder('点击这里后输入答案').fill('release-check');
    await page.getByRole('button', { name: '检查' }).click();
  }
  await expect(page.locator('[aria-label="复习反馈"]')).toBeVisible();
}

async function downloadContents(download: Download): Promise<string> {
  const path = await download.path();
  if (path === null)
    throw new Error(`download ${download.suggestedFilename()} has no path`);
  return readFile(path, 'utf8');
}

test('all six question modes complete, persist, and stay offline', async ({ page }) => {
  const failures = observeRuntimeFailures(page);
  await finishOnboarding(page);
  const questionTypes = [
    '单词 → 含义',
    '含义 → 单词',
    '情境 → 单词',
    '易混词辨析',
    '听音辨词',
    '图景 → 单词',
  ];

  for (const [index, type] of questionTypes.entries()) {
    await revealCurrentQuestion(page, type);
    await page.getByRole('button', { name: /记得/ }).click();
    if (index < questionTypes.length - 1)
      await page.getByRole('button', { name: /下一张/ }).click();
  }

  const saved = await page.evaluate((key) => localStorage.getItem(key), storageKey);
  expect(saved).not.toBeNull();
  expect(
    (JSON.parse(saved ?? '{}') as { reviewEvents?: unknown[] }).reviewEvents,
  ).toHaveLength(6);
  await page.reload();
  await expect(page.getByText('图景 → 单词', { exact: true })).toBeVisible();
  expect(failures.pageErrors).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
  expect(failures.offOriginRequests).toEqual([]);
});

test('short onboarding windows keep custom high-volume limits usable', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 420 });
  await startFresh(page);
  await page.getByRole('button', { name: /继续/ }).click();
  await page.getByRole('button', { name: /继续/ }).click();
  await page.getByRole('button', { name: '自定义每日新词' }).click();
  await page.getByRole('spinbutton', { name: '每日新词自定义数量' }).fill('120');
  await page.getByRole('button', { name: '自定义每日复习' }).click();
  await page.getByRole('spinbutton', { name: '每日复习自定义数量' }).fill('450');

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  for (let step = 2; step < 5; step += 1) {
    await page.getByRole('button', { name: /继续/ }).click();
  }
  await page.getByRole('button', { name: /显示第一张卡/ }).click();
  await expect(page.getByRole('article', { name: /学习卡/ })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const saved = JSON.parse(raw) as {
          preferences?: { dailyNewLimit?: number; dailyReviewLimit?: number };
        };
        return saved.preferences;
      }, storageKey),
    )
    .toMatchObject({ dailyNewLimit: 120, dailyReviewLimit: 450 });
});

test('compact quick settings persist size, color, opacity, modes, and opt-in hints', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 520 });
  await finishOnboarding(page);
  await expect(page.getByRole('button', { name: '给我一点提示' })).toHaveCount(0);

  await page.getByRole('button', { name: '打开卡片快捷设置' }).click();
  await expect(page.getByRole('region', { name: '卡片快捷设置' })).toBeVisible();
  await page.getByRole('button', { name: '紧凑' }).click();
  await expect
    .poll(() =>
      page
        .getByRole('article', { name: /学习卡/ })
        .evaluate((element) => element.getBoundingClientRect().width),
    )
    .toBe(304);
  await page.getByRole('button', { name: '宽大' }).click();
  await page.getByRole('button', { name: '薄荷绿' }).click();
  await page.getByRole('slider', { name: '卡片透明度' }).fill('0.8');
  await page.getByRole('combobox', { name: '卡片动态模式' }).selectOption('off');
  await page.getByRole('checkbox', { name: '想不起来时提供提示' }).check();
  await page.getByRole('button', { name: '完成' }).click();

  const card = page.getByRole('article', { name: /学习卡/ });
  await expect(card).toHaveAttribute('data-size', 'large');
  await expect(card).toHaveAttribute('data-color', 'green');
  await expect(card).toHaveCSS('opacity', '0.8');
  await page.getByRole('button', { name: '给我一点提示' }).click();
  await expect(page.getByRole('status')).toContainText(/常见搭配|先从词性/);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);

  await page.reload();
  await expect(card).toHaveAttribute('data-size', 'large');
  await expect(card).toHaveAttribute('data-color', 'green');
  await expect(page.getByRole('button', { name: '给我一点提示' })).toBeVisible();
  await page.setViewportSize({ width: 800, height: 600 });
  await expect
    .poll(() => card.evaluate((element) => element.getBoundingClientRect().width))
    .toBe(400);
  await page.getByRole('button', { name: '打开卡片快捷设置' }).click();
  await page.getByRole('button', { name: /打开全部设置/ }).click();
  await expect(page.getByRole('heading', { name: '设置' })).toBeVisible();
  await expect(page.getByLabel('小屏卡片大小')).toHaveValue('large');
  await expect(page.getByLabel('小屏卡片配色')).toHaveValue('green');
  await expect(page.getByLabel('想不起来时提供提示')).toBeChecked();
});

test('expanded pages, word detail, import, backup, and exports form a usable flow', async ({
  page,
}) => {
  const failures = observeRuntimeFailures(page);
  await finishOnboarding(page);
  await page.getByRole('button', { name: '显示答案' }).click();
  await page.getByRole('button', { name: /记得/ }).click();
  await page.getByRole('button', { name: '展开详细面板' }).click();

  await expect(page.getByRole('heading', { name: /今天，稳稳记住/ })).toBeVisible();
  await page.getByRole('button', { name: '学习模块' }).click();
  await expect(page.getByRole('heading', { name: '学习模块' })).toBeVisible();
  await expect(page.getByText(/个原始模块条目/)).toBeVisible();
  await page.getByRole('button', { name: /易混图谱/ }).click();
  await expect(page.getByRole('heading', { name: '个人易混词图谱' })).toBeVisible();
  await page.getByRole('button', { name: '词库' }).click();
  await page.getByPlaceholder('搜索英文、中文或释义').fill('adapt');
  await expect(page.getByText(/显示 \d+ \/ \d+ 个融合义项/)).toBeVisible();
  await page.locator('button.library-row[role="row"]').first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '编辑个人笔记' }).click();
  await page.getByRole('textbox', { name: '个人笔记' }).fill('发布前安装与使用验证。');
  await page.getByRole('button', { name: '保存笔记' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: '设置' }).click();
  const csv = [
    'lemma,partOfSpeech,senseKey,definitionZh,definitionEn,example,translation',
    'harbor,noun,sheltered-water,港湾,a sheltered area of water,The boat rested in the harbor.,小船停在港湾里。',
  ].join('\n');
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'qa-pack.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page.getByRole('button', { name: '仅预览与验证' }).click();
  await expect(page.getByText('验证通过，可提交')).toBeVisible();
  await page.getByRole('button', { name: /原子提交 1 个义项/ }).click();
  await expect(page.locator('.global-status')).toContainText('导入成功：1 个义项');

  const [backupDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /导出全部数据/ }).click(),
  ]);
  expect(backupDownload.suggestedFilename()).toBe('vocabsprite-backup.json');
  const backup = JSON.parse(await downloadContents(backupDownload)) as {
    format?: string;
    state?: { reviewEvents?: unknown[]; importedSenses?: unknown[] };
  };
  expect(backup.format).toBe('VocabSpriteBackup');
  expect(backup.state?.reviewEvents).toHaveLength(1);
  expect(backup.state?.importedSenses).toHaveLength(1);

  const [learningDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /导出学习记录/ }).click(),
  ]);
  expect(await downloadContents(learningDownload)).toContain(
    'eventId,senseId,direction,feedback,reviewedAtUtc,stageAfter,reason',
  );
  const [packDownload] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /导出自定义词包/ }).click(),
  ]);
  const exportedPack = JSON.parse(await downloadContents(packDownload)) as {
    senses?: unknown[];
  };
  expect(exportedPack.senses).toHaveLength(1);

  await page.locator('.restore-button input[type="file"]').setInputFiles({
    name: 'invalid-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ format: 'VocabSpriteBackup', schemaVersion: 1, state: null }),
    ),
  });
  await expect(page.locator('.global-status')).toContainText('备份状态结构无效');
  expect(failures.pageErrors).toEqual([]);
  expect(failures.consoleErrors).toEqual([]);
  expect(failures.offOriginRequests).toEqual([]);
});

test('responsive layouts avoid horizontal clipping and reduced motion wins', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await finishOnboarding(page);
  await expect(page.locator('.motion-word')).toHaveClass(/motion-reduced/);
  await expect(page.locator('.motion-word')).toHaveCSS('animation-name', 'none');
  await page.getByRole('button', { name: '展开详细面板' }).click();

  for (const viewport of [
    { width: 1440, height: 980 },
    { width: 1024, height: 768 },
    { width: 1024, height: 420 },
    { width: 650, height: 800 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole('heading', { name: /今天，稳稳记住/ })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(
      overflow,
      `horizontal overflow at ${viewport.width}x${viewport.height}`,
    ).toBeLessThanOrEqual(1);
  }

  await page.setViewportSize({ width: 1024, height: 420 });
  const sidebar = page.locator('.sidebar');
  const sidebarSize = await sidebar.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(sidebarSize.scrollHeight).toBeGreaterThan(sidebarSize.clientHeight);
  const compactButton = page.getByRole('button', { name: /显示桌角卡片/ });
  await compactButton.scrollIntoViewIfNeeded();
  await expect(compactButton).toBeVisible();
  await expect(page.locator('.global-status')).toHaveCSS('pointer-events', 'none');
});

test('corrupted snapshots and oversized imports fail closed without a crash', async ({
  page,
}) => {
  await page.goto('/');
  await page.evaluate(
    ({ key }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 1,
          onboardingComplete: true,
          preferences: { selectedStages: 'cet4' },
          reviewEvents: null,
        }),
      ),
    { key: storageKey },
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: '让单词出现得刚刚好。' })).toBeVisible();
  await finishOnboarding(page);
  await page.getByRole('button', { name: '展开详细面板' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await page.locator('.file-drop input[type="file"]').setInputFiles({
    name: 'oversized.csv',
    mimeType: 'text/csv',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 120),
  });
  await expect(page.getByRole('alert')).toContainText('5 MiB');
});

test('explicit delete-all clears personal state and returns to onboarding', async ({
  page,
}) => {
  await finishOnboarding(page);
  await page.getByRole('button', { name: '显示答案' }).click();
  await page.getByRole('button', { name: /记得/ }).click();
  await page.getByRole('button', { name: '展开详细面板' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await page.getByRole('button', { name: '开始删除…' }).click();
  await page.getByRole('button', { name: '确认删除全部个人数据' }).click();
  await expect(page.getByRole('heading', { name: '让单词出现得刚刚好。' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate((key) => {
        const raw = localStorage.getItem(key);
        if (raw === null) return null;
        const state = JSON.parse(raw) as {
          onboardingComplete?: boolean;
          reviewEvents?: unknown[];
        };
        return {
          onboardingComplete: state.onboardingComplete,
          reviewCount: state.reviewEvents?.length,
        };
      }, storageKey),
    )
    .toEqual({ onboardingComplete: false, reviewCount: 0 });
});
