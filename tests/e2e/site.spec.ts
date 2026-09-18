import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const published = content.cases.filter((item) => item.published);
test.setTimeout(120_000);

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
}

test("public versions use an equal-width, tight, natural-ratio masonry", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of ["/", "/food", "/drinks", "/ip", "/premium"]) {
    await page.goto(route);
    await expect(page.locator(".caseCard")).toHaveCount(23);
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
    await page.waitForTimeout(650);
    await expectNoHorizontalOverflow(page);

    const boxes = await page.locator(".caseCard").evaluateAll((cards) => cards.map((card) => {
      const box = card.getBoundingClientRect();
      const image = card.querySelector("img")!.getBoundingClientRect();
      return { left: box.left, top: box.top, bottom: box.bottom, width: box.width, imageRatio: image.height / image.width };
    }));
    expect(new Set(boxes.map((box) => Math.round(box.width))).size).toBe(1);
    expect(new Set(boxes.slice(0, 3).map((box) => Math.round(box.left))).size).toBe(3);
    expect(new Set(boxes.slice(0, 8).map((box) => box.imageRatio.toFixed(2))).size).toBeGreaterThan(3);
    const gridBottomGap = await page.locator(".masonryGrid").evaluate((grid) => {
      const cards = [...grid.querySelectorAll(".caseCard")].map((card) => card.getBoundingClientRect().bottom);
      return grid.getBoundingClientRect().bottom - Math.max(...cards);
    });
    expect(Math.abs(gridBottomGap)).toBeLessThan(1);
    for (const left of [...new Set(boxes.map((box) => Math.round(box.left)))]) {
      const column = boxes.filter((box) => Math.round(box.left) === left).sort((a, b) => a.top - b.top);
      for (let index = 1; index < column.length; index += 1) {
        expect(column[index].top - column[index - 1].bottom).toBeGreaterThanOrEqual(17);
        expect(column[index].top - column[index - 1].bottom).toBeLessThanOrEqual(19);
      }
    }
  }

  await page.goto("/");
  await page.locator('[data-case-id="N013"] a').click();
  await expect(page).toHaveURL(/\/work\/n013-manual-burger$/);
  await expect(page.getByRole("heading", { name: "堡乎乎 Manual Burger" })).toBeVisible();
});

test("all 23 published case routes resolve to their strict canonical detail", async ({ page }) => {
  for (const item of published) {
    const response = await page.goto(`/work/${item.slug}`);
    expect(response?.status(), item.id).toBe(200);
    await expect(page.getByRole("heading", { name: item.name })).toBeVisible();
    const hero = page.locator(".workHero img");
    await expect(hero).toHaveJSProperty("complete", true);
    await expect(page.locator(".mediaFlow figure")).toHaveCount(item.bodyAssets.length);
  }
});

test("representative image, unicode and legacy cases work on desktop and mobile", async ({ page }) => {
  const representatives = ["N013", "N014", "N005", "N009", "L010"];
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const id of representatives) {
      const item = published.find((entry) => entry.id === id)!;
      await page.goto(`/work/${item.slug}`);
      await expect(page.getByRole("heading", { name: item.name })).toBeVisible();
      expect(await page.locator(".workHero img").evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
      await expectNoHorizontalOverflow(page);
    }
    await page.locator("a.nextCase").click();
    await expect(page.locator(".workHero")).toBeVisible();
    await page.locator(".wordmark").click();
    await expect(page).toHaveURL(/\/$/);
  }
});

test("admin login and every requested mutation are usable and reversible", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("wrong");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.locator(".formError")).toContainText("密码错误");
  await page.getByLabel("管理员密码").fill("e2e-password");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();
  await expect(page.locator(".adminCaseList article")).toHaveCount(23);

  const n009 = page.locator(".adminCaseList article").filter({ hasText: "饭点时光" });
  await n009.getByRole("link", { name: "编辑" }).click();
  const intro = page.getByLabel("简介");
  const originalIntro = await intro.inputValue();
  await intro.fill(`${originalIntro} 浏览器验收`);
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();
  await page.locator(".adminCaseList article").filter({ hasText: "饭点时光" }).getByRole("link", { name: "编辑" }).click();
  await expect(page.getByLabel("简介")).toHaveValue(`${originalIntro} 浏览器验收`);
  await page.getByLabel("简介").fill(originalIntro);
  await page.getByRole("button", { name: "保存案例" }).click();

  const n009Restored = page.locator(".adminCaseList article").filter({ hasText: "饭点时光" });
  await n009Restored.getByRole("button", { name: "已发布" }).click();
  await expect(n009Restored.getByRole("button", { name: "草稿" })).toBeVisible();
  await n009Restored.getByRole("button", { name: "草稿" }).click();
  await expect(n009Restored.getByRole("button", { name: "已发布" })).toBeVisible();

  const firstName = await page.locator(".adminCaseName strong").first().textContent();
  await page.locator(".adminCaseList article").nth(1).dragTo(page.locator(".adminCaseList article").first());
  await page.getByRole("button", { name: "保存排序" }).click();
  await expect(page.locator(".saveMessage")).toContainText("已保存");
  await page.locator(".adminCaseList article").nth(1).dragTo(page.locator(".adminCaseList article").first());
  await page.getByRole("button", { name: "保存排序" }).click();
  await expect(page.locator(".adminCaseName strong").first()).toHaveText(firstName || "");

  const drinks = page.locator(".versionCard").filter({ hasText: "Drinks" });
  await drinks.locator("summary").click();
  const priority = drinks.locator(".priorityList li");
  const firstPriority = await priority.first().locator("span").nth(1).textContent();
  await priority.nth(1).getByRole("button", { name: "↑" }).click();
  let versionSaved = page.waitForResponse((response) => response.url().endsWith("/api/admin/versions/drinks") && response.request().method() === "PUT");
  await drinks.getByRole("button", { name: "保存版本" }).click();
  expect((await versionSaved).ok()).toBe(true);
  await priority.nth(1).getByRole("button", { name: "↑" }).click();
  versionSaved = page.waitForResponse((response) => response.url().endsWith("/api/admin/versions/drinks") && response.request().method() === "PUT");
  await drinks.getByRole("button", { name: "保存版本" }).click();
  expect((await versionSaved).ok()).toBe(true);
  await expect(priority.first().locator("span").nth(1)).toHaveText(firstPriority || "");

  await page.getByRole("link", { name: "新建案例" }).click();
  await expect(page).toHaveURL(/\/admin\/cases\/new$/);
  const editor = page.locator("main.caseEditor");
  await editor.getByLabel("名称", { exact: true }).fill("浏览器验收草稿");
  await editor.getByLabel("Slug", { exact: true }).fill("browser-acceptance-draft");
  await editor.getByLabel("主要行业").fill("测试");
  const mediaInputs = editor.locator('.mediaInput input[type="file"]');
  await mediaInputs.first().setInputFiles("public/media/cases/N013/cover.webp");
  await expect(editor.locator(".mediaPreview")).toHaveCount(1);
  await mediaInputs.nth(1).setInputFiles("public/media/cases/N013/hero.webp");
  await expect(editor.locator(".mediaPreview")).toHaveCount(2);
  await page.locator('.sectionHeading input[type="file"]').setInputFiles("public/media/cases/N013/cover.webp");
  await expect(page.locator(".bodyAssetList article")).toHaveCount(1);
  await page.locator(".bodyAssetList article").getByRole("button", { name: "删除" }).click();
  await expect(page.locator(".bodyAssetList article")).toHaveCount(0);
  await page.getByRole("button", { name: "保存案例" }).click();
  const testRow = page.locator(".adminCaseList article").filter({ hasText: "浏览器验收草稿" });
  await expect(testRow.getByRole("button", { name: "草稿" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await testRow.getByRole("button", { name: "删除" }).click();
  await expect(testRow).toHaveCount(0);
});
