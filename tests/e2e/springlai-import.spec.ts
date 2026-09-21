import { expect, test, type Page } from "@playwright/test";
import { casePath } from "../../lib/case-route";
import { caseFullTitle } from "../../lib/case-title";
import { fetchOfficialContent, fetchOfficialJson } from "../helpers/official-content";

const content = await fetchOfficialContent();
const importMap = await fetchOfficialJson<{
  importedMediaCount: number;
  cases: { id: string; name: string; bodyAssetCount: number }[];
  assets: { case: string; order: number; websiteAsset: string; sourceFinalAsset: string }[];
}>("case-production/springlai-sol-v1.1/website-import-map.json");
const springlai = content.cases.filter((item) => item.id.startsWith("SL"));

test.setTimeout(180_000);

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
}

test("the frozen Springlai import contains exactly seven ordered cases and 88 mapped assets", async () => {
  expect(springlai.map((item) => caseFullTitle(item))).toEqual(importMap.cases.map((item) => item.name));
  expect(springlai.map((item) => item.media.length)).toEqual([33, 10, 7, 8, 21, 3, 6]);
  expect(springlai.flatMap((item) => item.media)).toHaveLength(88);
  expect(importMap.importedMediaCount).toBe(88);
  for (const item of springlai) {
    const mapped = importMap.assets.filter((asset) => asset.case === caseFullTitle(item)).sort((a, b) => a.order - b.order);
    const legacyOrder = mapped.map((asset) => asset.websiteAsset);
    const roleSources = item.media.slice(0, 2).map((asset) => asset.src);
    expect(roleSources.every((src) => legacyOrder.includes(src))).toBe(true);
    expect(item.media.slice(2).map((asset) => asset.src)).toEqual(legacyOrder.filter((src) => !roleSources.includes(src)));
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
      const response = await page.goto(casePath(item.id), { waitUntil: "networkidle" });
      expect(response?.status(), caseFullTitle(item)).toBe(200);
      await expect(page.getByRole("heading", { name: caseFullTitle(item), exact: true })).toBeVisible();
      await expect(page.locator(".mediaFlow figure")).toHaveCount(item.media.length - 2);
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
  expect(brand.media.filter((asset) => asset.section).map((asset) => asset.section!.title)).toEqual([
    "夏季视觉体系", "冬季视觉体系", "2023 秋冬 IP 更新", "2025 品牌升级",
  ]);
  expect(peach.media.filter((asset) => asset.section).map((asset) => asset.section!.title)).toEqual([
    "桃与乌龙", "桃花艺人", "桂花艺人",
  ]);
  const vi04 = importMap.assets.filter((asset) => asset.case === caseFullTitle(brand) && asset.order >= 28).sort((a, b) => a.order - b.order);
  expect(vi04.map((asset) => asset.sourceFinalAsset)).toEqual([
    "final-assets/01-overall-vi/28-VI-04-·-25年品牌升级与2025春夏-品牌升级-电子菜单.jpg",
    "final-assets/01-overall-vi/29-VI-04-·-25年品牌升级与2025春夏-品牌升级-新店围挡.jpg",
    "final-assets/01-overall-vi/30-VI-04-·-25年品牌升级与2025春夏-焕新-IP-海报.jpg",
    "final-assets/01-overall-vi/31-VI-04-·-25年品牌升级与2025春夏-新品线上系统.jpg",
    "final-assets/01-overall-vi/32-VI-04-·-25年品牌升级与2025春夏-泼水节应用.jpg",
    "final-assets/01-overall-vi/33-VI-04-·-25年品牌升级与2025春夏-端午节应用.jpg",
  ]);

  for (const [item, headings] of [[brand, ["夏季视觉体系", "冬季视觉体系", "2023 秋冬 IP 更新", "2025 品牌升级"]], [peach, ["桃与乌龙", "桃花艺人", "桂花艺人"]]] as const) {
    await page.goto(casePath(item.id));
    await expect(page.locator(".mediaSectionHeading h2")).toHaveText([...headings]);
    await expect(page.locator(".mediaSectionHeading p")).toHaveText(headings.map((_, index) => `CHAPTER ${String(index + 1).padStart(2, "0")}`));
  }
});
