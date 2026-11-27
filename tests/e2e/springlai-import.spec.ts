import { expect, test, type Page } from "@playwright/test";
import { getCaseBodyMedia } from "../../lib/case-media";
import { renumberChapters } from "../../lib/chapters";
import { casePath } from "../../lib/case-route";
import { caseFullTitle } from "../../lib/case-title";
import { fetchOfficialContent, fetchOfficialJson } from "../helpers/official-content";

const content = await fetchOfficialContent();
const importMap = await fetchOfficialJson<{
  importedMediaCount: number;
  cases: { id: string; name: string; bodyAssetCount: number }[];
  assets: { case: string; order: number; websiteAsset: string; sourceFinalAsset: string }[];
}>("case-production/springlai-sol-v1.1/website-import-map.json");
const springlai = content.cases.filter((item) => item.id.startsWith("SL") && item.published);
const retiredProductSheet = "/media/springlai/inner-mongolia/03.jpg";

test.setTimeout(180_000);

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
}

test("the frozen Springlai import records seven cases and 88 original assets", () => {
  expect(importMap.cases.map((item) => item.id)).toEqual(["SL001", "SL002", "SL003", "SL004", "SL005", "SL006", "SL007"]);
  expect(importMap.cases.map((item) => item.bodyAssetCount)).toEqual([33, 10, 7, 8, 21, 3, 6]);
  expect(importMap.assets).toHaveLength(88);
  expect(importMap.importedMediaCount).toBe(88);
  for (const item of importMap.cases) {
    const mapped = importMap.assets.filter((asset) => asset.case === item.name);
    expect(mapped.map((asset) => asset.order)).toEqual(Array.from({ length: item.bodyAssetCount }, (_, index) => index + 1));
  }
  expect(springlai.map((item) => item.id).sort()).toEqual(importMap.cases.map((item) => item.id));
  expect(content.cases.some((item) => item.published && ["L010", "L011", "L030"].includes(item.id))).toBe(false);
  expect(content.cases.flatMap((item) => item.media).some((asset) => asset.src === retiredProductSheet)).toBe(false);
});

test("Springlai detail pages load all media without request, console, or layout errors", async ({ page }) => {
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
      await expect(page.locator(".mediaFlow figure")).toHaveCount(getCaseBodyMedia(item).length);
      for (const asset of item.media.filter((entry) => entry.type === "image")) {
        const image = page.locator(`img[src$="${asset.src}"]`).first();
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((element: HTMLImageElement) => element.decode());
      }
      await page.locator(".nextCase").scrollIntoViewIfNeeded();
      await expectNoHorizontalOverflow(page);
      await expect(page.locator(".detailClose")).toHaveCSS("position", "fixed");
      await expect(page.getByRole("button", { name: "返回案例列表" })).toHaveCSS("opacity", "1");
    }
  }

  expect(failures).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("Brand Evolution and peach chapters follow the current editorial sequence", async ({ page }) => {
  const brand = springlai.find((item) => item.id === "SL001")!;
  const peach = springlai.find((item) => item.id === "SL005")!;
  const vi04 = importMap.assets.filter((asset) => asset.case === caseFullTitle(brand) && asset.order >= 28).sort((a, b) => a.order - b.order);
  expect(vi04.map((asset) => asset.sourceFinalAsset)).toEqual([
    "final-assets/01-overall-vi/28-VI-04-·-25年品牌升级与2025春夏-品牌升级-电子菜单.jpg",
    "final-assets/01-overall-vi/29-VI-04-·-25年品牌升级与2025春夏-品牌升级-新店围挡.jpg",
    "final-assets/01-overall-vi/30-VI-04-·-25年品牌升级与2025春夏-焕新-IP-海报.jpg",
    "final-assets/01-overall-vi/31-VI-04-·-25年品牌升级与2025春夏-新品线上系统.jpg",
    "final-assets/01-overall-vi/32-VI-04-·-25年品牌升级与2025春夏-泼水节应用.jpg",
    "final-assets/01-overall-vi/33-VI-04-·-25年品牌升级与2025春夏-端午节应用.jpg",
  ]);

  for (const item of [brand, peach]) {
    const sections = getCaseBodyMedia({ ...item, media: renumberChapters(item.media) }).flatMap((asset) => asset.section ? [asset.section] : []);
    expect(sections.length).toBeGreaterThan(0);
    await page.goto(casePath(item.id));
    await expect(page.locator(".mediaSectionHeading h2")).toHaveText(sections.map((section) => section.title));
    await expect(page.locator(".mediaSectionHeading p")).toHaveText(sections.map((section) => section.eyebrow));
  }
});
