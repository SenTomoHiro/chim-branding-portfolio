import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { casePath } from "../../lib/case-route";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const importMap = JSON.parse(readFileSync(new URL("../../case-production/springlai-sol-v1.1/website-import-map.json", import.meta.url), "utf8")) as {
  importedMediaCount: number;
  cases: { id: string; name: string; bodyAssetCount: number }[];
  assets: { case: string; order: number; websiteAsset: string; sourceFinalAsset: string }[];
};
const springlai = content.cases.filter((item) => item.id.startsWith("SL"));

test.setTimeout(180_000);

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
}

test("the frozen Springlai import contains exactly seven ordered cases and 88 mapped assets", async () => {
  expect(springlai.map((item) => item.name)).toEqual(importMap.cases.map((item) => item.name));
  expect(springlai.map((item) => item.bodyAssets.length)).toEqual([33, 10, 7, 8, 21, 3, 6]);
  expect(springlai.flatMap((item) => item.bodyAssets)).toHaveLength(88);
  expect(importMap.importedMediaCount).toBe(88);
  for (const item of springlai) {
    const mapped = importMap.assets.filter((asset) => asset.case === item.name).sort((a, b) => a.order - b.order);
    expect(item.bodyAssets.map((asset) => asset.src)).toEqual(mapped.map((asset) => asset.websiteAsset));
  }
  expect(content.cases.filter((item) => item.id.startsWith("SL"))).toHaveLength(7);
  expect(content.cases.some((item) => ["L010", "L011", "L030"].includes(item.id))).toBe(false);
});

test("Springlai detail pages load all media without request, console, or layout errors", async ({ page, request }) => {
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  page.on("requestfailed", (request) => { if (!request.failure()?.errorText.includes("ERR_ABORTED")) failures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText || "failed"}`); });
  page.on("response", (response) => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const item of springlai) {
      const response = await page.goto(casePath(item.name), { waitUntil: "networkidle" });
      expect(response?.status(), item.name).toBe(200);
      await expect(page.getByRole("heading", { name: item.name, exact: true })).toBeVisible();
      await expect(page.locator(".mediaFlow figure")).toHaveCount(item.bodyAssets.length);
      await page.locator(".nextCase").scrollIntoViewIfNeeded();
      await expectNoHorizontalOverflow(page);
      await expect(page.locator(".detailHeader")).toHaveCSS("position", "sticky");
      await expect(page.getByRole("button", { name: "返回案例列表" })).toHaveCSS("opacity", "1");
    }
  }

  for (const asset of importMap.assets) {
    const response = await request.get(asset.websiteAsset);
    expect(response.status(), asset.websiteAsset).toBe(200);
    expect(response.headers()["content-type"], asset.websiteAsset).toMatch(/^image\/jpeg/);
  }

  expect(failures).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("Brand Evolution and peach chapters preserve the frozen editorial sequence", async ({ page }) => {
  const brand = springlai.find((item) => item.id === "SL001")!;
  const peach = springlai.find((item) => item.id === "SL005")!;
  expect(brand.bodyAssets.filter((asset) => asset.section).map((asset) => asset.section!.title)).toEqual([
    "夏季视觉体系", "冬季视觉体系", "2023 秋冬 IP 更新", "2025 品牌升级",
  ]);
  expect(peach.bodyAssets.filter((asset) => asset.section).map((asset) => asset.section!.title)).toEqual([
    "桃与乌龙", "桃花艺人", "桂花艺人",
  ]);
  const vi04 = importMap.assets.filter((asset) => asset.case === brand.name && asset.order >= 28).sort((a, b) => a.order - b.order);
  expect(vi04.map((asset) => asset.sourceFinalAsset)).toEqual([
    "final-assets/01-overall-vi/28-VI-04-·-25年品牌升级与2025春夏-品牌升级-电子菜单.jpg",
    "final-assets/01-overall-vi/29-VI-04-·-25年品牌升级与2025春夏-品牌升级-新店围挡.jpg",
    "final-assets/01-overall-vi/30-VI-04-·-25年品牌升级与2025春夏-焕新-IP-海报.jpg",
    "final-assets/01-overall-vi/31-VI-04-·-25年品牌升级与2025春夏-新品线上系统.jpg",
    "final-assets/01-overall-vi/32-VI-04-·-25年品牌升级与2025春夏-泼水节应用.jpg",
    "final-assets/01-overall-vi/33-VI-04-·-25年品牌升级与2025春夏-端午节应用.jpg",
  ]);

  for (const [item, headings] of [[brand, ["夏季视觉体系", "冬季视觉体系", "2023 秋冬 IP 更新", "2025 品牌升级"]], [peach, ["桃与乌龙", "桃花艺人", "桂花艺人"]]] as const) {
    await page.goto(casePath(item.name));
    await expect(page.locator(".mediaSectionHeading h2")).toHaveText([...headings]);
  }
});

test("Springlai cases remain visible and editable in the local Admin", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("e2e-password");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();
  for (const item of springlai) await expect(page.locator(".adminCaseList article").filter({ hasText: item.name })).toHaveCount(1);
  const brandRow = page.locator(".adminCaseList article").filter({ hasText: springlai[0].name });
  await brandRow.getByRole("link", { name: "编辑" }).click();
  await expect(page.getByLabel("名称", { exact: true })).toHaveValue(springlai[0].name);
  await expect(page.locator(".bodyAssetList article")).toHaveCount(33);
});

test("Chapter Admin edits, persists, reorders and removes headers without deleting media", async ({ page }) => {
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("e2e-password");
  await page.getByRole("button", { name: "登录" }).click();
  const brand = springlai.find((item) => item.id === "SL001")!;
  await page.locator(".adminCaseList article").filter({ hasText: brand.name }).getByRole("link", { name: "编辑" }).click();
  await expect(page.locator(".chapterHeader")).toHaveCount(4);
  expect(await page.getByLabel("章节标题").evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).value))).toEqual(["夏季视觉体系", "冬季视觉体系", "2023 秋冬 IP 更新", "2025 品牌升级"]);
  await page.getByLabel("章节标题").first().fill("夏季视觉体系（测试）");
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  await page.reload();
  await expect(page.getByLabel("章节标题").first()).toHaveValue("夏季视觉体系（测试）");

  const mediaCount = await page.locator(".bodyAssetList article").count();
  await page.getByRole("button", { name: "＋ 添加章节" }).click();
  const creator = page.getByRole("group", { name: "添加章节" });
  await creator.getByLabel("章节标题").fill("测试新增章节");
  await creator.getByLabel("章节说明").fill("仅用于临时 E2E fixture。");
  await creator.getByRole("button", { name: "创建章节" }).click();
  await expect(page.locator(".chapterHeader")).toHaveCount(5);
  await expect(page.locator(".bodyAssetList article")).toHaveCount(mediaCount);

  const created = page.locator(".chapterHeader").filter({ has: page.locator('input[value="测试新增章节"]') });
  await created.getByRole("button", { name: "↓ Chapter" }).click();
  await created.getByRole("button", { name: "↑ Chapter" }).click();
  const targetChapter = page.locator(".chapterHeader").last();
  const targetId = await targetChapter.locator("xpath=..").getAttribute("data-chapter-id");
  const movable = created.locator("xpath=..").locator(".bodyAssetList article").last();
  await movable.locator(".chapterMove").selectOption(targetId!);
  await expect(page.locator(".bodyAssetList article")).toHaveCount(mediaCount);

  page.once("dialog", (dialog) => dialog.accept());
  await created.getByRole("button", { name: "移除 Chapter" }).click();
  await expect(page.locator(".chapterHeader")).toHaveCount(4);
  await expect(page.locator(".bodyAssetList article")).toHaveCount(mediaCount);

  await page.setViewportSize({ width: 390, height: 844 });
  await expectNoHorizontalOverflow(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("link", { name: "返回后台" }).click();
  const flat = content.cases.find((item) => item.published && !item.bodyAssets.some((asset) => asset.section) && item.bodyAssets.length > 0)!;
  await page.locator(".adminCaseList article").filter({ hasText: flat.name }).getByRole("link", { name: "编辑" }).click();
  await expect(page.locator(".chapterHeader,.unsectionedHeader")).toHaveCount(0);
  await expect(page.locator(".bodyAssetList article")).toHaveCount(flat.bodyAssets.length);
  await expect(page.getByRole("button", { name: "＋ 添加章节" })).toBeVisible();
});
