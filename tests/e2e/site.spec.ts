import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { CaseCategory, ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const published = content.cases.filter((item) => item.published);
const brandingPublished = published.filter((item) => item.business === "branding");
const photographyPublished = published.filter((item) => item.business === "photography");
const categories: CaseCategory[] = ["food", "drinks", "ip", "other"];
test.setTimeout(180_000);

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
}

test("business and category routes use real filtering while preserving default order", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const routes = ["/", ...categories.map((category) => `/${category}`), "/photo"];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    const category = categories.find((value) => route === `/${value}`);
    const expected = route === "/photo" ? photographyPublished : brandingPublished.filter((item) => !category || item.categories.includes(category));
    const order = route === "/photo" ? content.photographyCaseOrder : content.defaultOrder;
    const expectedIds = order.filter((id) => expected.some((item) => item.id === id));
    await expect(page.locator(".caseCard")).toHaveCount(expected.length);
    expect(await page.locator(".caseCard").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-case-id")))).toEqual(expectedIds);
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }
  expect((await page.goto("/premium"))?.status()).toBe(404);
  const overlapping = brandingPublished.find((item) => item.categories.includes("food") && item.categories.includes("ip"))!;
  for (const route of ["/food", "/ip"]) { await page.goto(route); await expect(page.locator(`[data-case-id="${overlapping.id}"]`)).toHaveCount(1); }
});

test("shared masonry keeps equal columns, natural ratios and scroll reveals", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForTimeout(700);
  const boxes = await page.locator(".caseCard").evaluateAll((cards) => cards.map((card) => { const box = card.getBoundingClientRect(); const image = card.querySelector("img")!.getBoundingClientRect(); return { left: box.left, top: box.top, bottom: box.bottom, width: box.width, imageRatio: image.height / image.width }; }));
  expect(new Set(boxes.map((box) => Math.round(box.width))).size).toBe(1);
  expect(new Set(boxes.slice(0, 3).map((box) => Math.round(box.left))).size).toBe(3);
  expect(new Set(boxes.slice(0, 8).map((box) => box.imageRatio.toFixed(2))).size).toBeGreaterThan(3);
  const gridBottomGap = await page.locator(".masonryGrid").evaluate((grid) => { const cards = [...grid.querySelectorAll<HTMLElement>(".caseCard")].map((card) => card.offsetTop + card.offsetHeight); return (grid as HTMLElement).offsetHeight - Math.max(...cards); });
  expect(Math.abs(gridBottomGap)).toBeLessThanOrEqual(1);
  for (const left of [...new Set(boxes.map((box) => Math.round(box.left)))]) { const column = boxes.filter((box) => Math.round(box.left) === left).sort((a, b) => a.top - b.top); for (let index = 1; index < column.length; index += 1) expect(column[index].top - column[index - 1].bottom).toBeGreaterThanOrEqual(17); }
  const cards = page.locator(".caseCard");
  for (let index = 0; index < 6; index += 1) { await cards.nth(index).hover(); await expect(cards.nth(index).locator(".secondaryMedia")).toHaveCount(1); }
  await cards.nth(8).scrollIntoViewIfNeeded(); await expect(cards.nth(8)).toHaveClass(/isVisible/);
});

test("all published case routes resolve with taxonomy metadata and reveal media", async ({ page }) => {
  for (const item of published) {
    const response = await page.goto(`/work/${item.slug}`);
    expect(response?.status(), item.id).toBe(200);
    await expect(page.getByRole("heading", { name: item.name })).toBeVisible();
    await expect(page.locator(".workIntro div>p")).toContainText(item.primaryIndustry);
    await expect(page.locator(".workHero img")).toHaveJSProperty("complete", true);
    await expect(page.locator(".mediaFlow figure")).toHaveCount(item.bodyAssets.length);
  }
});

test("desktop and mobile navigation, details and admin have no overflow", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/food", "/drinks", "/ip", "/other", "/photo", `/work/${brandingPublished[0].slug}`, `/work/${photographyPublished[0].slug}`, "/admin"]) {
      await page.goto(route); await expectNoHorizontalOverflow(page);
    }
  }
});

test("admin taxonomy mutations are usable and reversible", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("wrong"); await page.getByRole("button", { name: "登录" }).click(); await expect(page.locator(".formError")).toContainText("密码错误");
  await page.getByLabel("管理员密码").fill("e2e-password"); await page.getByRole("button", { name: "登录" }).click(); await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();
  await expect(page.locator('[data-order-type="branding"] .adminCaseList article')).toHaveCount(32);
  await expect(page.locator('[data-order-type="photography"] .adminCaseList article')).toHaveCount(18);
  await expect(page.getByText("行业标签（逗号分隔）")).toHaveCount(0); await expect(page.getByText("设计标签（逗号分隔）")).toHaveCount(0); await expect(page.getByText("主要设计类型")).toHaveCount(0);

  const brandingSection = page.locator('[data-order-type="branding"]'); const firstName = await brandingSection.locator(".adminCaseName strong").first().textContent();
  await brandingSection.locator(".adminCaseList article").nth(1).dragTo(brandingSection.locator(".adminCaseList article").first()); await brandingSection.getByRole("button", { name: "保存排序" }).click(); await expect(brandingSection.locator(".saveMessage")).toContainText("已保存");
  await brandingSection.locator(".adminCaseList article").nth(1).dragTo(brandingSection.locator(".adminCaseList article").first()); await brandingSection.getByRole("button", { name: "保存排序" }).click(); await expect(brandingSection.locator(".adminCaseName strong").first()).toHaveText(firstName || "");

  await page.getByRole("link", { name: "新建案例" }).click();
  await page.getByLabel("名称", { exact: true }).fill("分类验收草稿"); await page.getByLabel("Slug", { exact: true }).fill("taxonomy-acceptance-draft");
  await page.getByLabel("商业摄影").check(); await page.getByLabel("饮品").check(); await page.getByLabel("IP", { exact: true }).check(); await page.getByLabel("主要行业").fill("咖啡");
  const mediaInputs = page.locator('.mediaInput input[type="file"]'); await mediaInputs.first().setInputFiles("public/media/cases/N013/cover.webp"); await mediaInputs.nth(1).setInputFiles("public/media/cases/N013/hero.webp");
  await page.getByRole("button", { name: "保存案例" }).click();
  let row = page.locator(".adminCaseList article").filter({ hasText: "分类验收草稿" }); await expect(row).toContainText("商业摄影 · 饮品 / IP · 咖啡");
  await row.getByRole("link", { name: "编辑" }).click(); await expect(page.getByLabel("商业摄影")).toBeChecked(); await expect(page.getByLabel("饮品")).toBeChecked(); await expect(page.getByLabel("IP", { exact: true })).toBeChecked();
  await page.getByLabel("饮品").uncheck(); await page.getByLabel("其他").check(); await page.getByRole("button", { name: "保存案例" }).click();
  row = page.locator(".adminCaseList article").filter({ hasText: "分类验收草稿" }); await expect(row).toContainText("IP / 其他");
  await row.getByRole("button", { name: "草稿" }).click(); await expect(row.getByRole("button", { name: "已发布" })).toBeVisible();
  await row.getByRole("button", { name: "已发布" }).click(); await expect(row.getByRole("button", { name: "草稿" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept()); await row.getByRole("button", { name: "删除" }).click(); await expect(row).toHaveCount(0);
});
