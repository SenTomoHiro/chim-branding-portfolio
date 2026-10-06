import { test, expect } from '@playwright/test';

test.describe('Home Feed', () => {
  test('should display editorial feed layout', async ({ page }, testInfo) => {
    await page.goto('/');

    // 等待内容加载
    await page.waitForSelector('.homeFeed', { timeout: 10000 });

    // 检查是否使用新的 Feed 布局
    const feedExists = await page.locator('.homeFeed').count();
    expect(feedExists).toBeGreaterThan(0);

    // 检查案例预览
    const casePreview = await page.locator('.casePreview').first();
    await expect(casePreview).toBeVisible();

    // 检查封面图
    const cover = await casePreview.locator('.previewCover img');
    await expect(cover).toBeVisible();

    // 检查标题
    const title = await casePreview.locator('.previewTitle');
    await expect(title).toBeVisible();

    // 截图
    await page.screenshot({ path: testInfo.outputPath('home-feed.png'), fullPage: true });
  });

  test('should show brand mark', async ({ page }) => {
    await page.goto('/');
    const brandMark = await page.locator('.brandMark');
    await expect(brandMark).toBeVisible();
    await expect(brandMark).toHaveText(/CHIM/);
  });

  test('should show category pill', async ({ page }) => {
    await page.goto('/');
    const pill = await page.locator('.categoryPill');
    await expect(pill).toBeVisible();
  });
});
