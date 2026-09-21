import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentData } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const caseIds = ["SL004", "N025", "L021", "L016"];
test.setTimeout(120_000);

test("single-case PDF keeps the hero clean and moves case copy into a separate section", async ({ page }) => {
  for (const id of caseIds) {
    const item = content.cases.find((entry) => entry.id === id)!;
    await page.goto(`/print/case/?id=${id}`);

    const hero = page.locator(".pdfLongHero");
    const heroImage = hero.locator(":scope > .pdfPicture");
    const info = page.locator("[data-single-case-info='true']");
    await expect(hero.locator("h1, .pdfLongHeroOverlay, .pdfLongHeroCopy")).toHaveCount(0);
    await expect(hero.locator("[data-single-case-edge-meta='true']")).toContainText(`Project / ${id}`);
    await expect(info.locator(".pdfTitlePrimary")).toHaveText(item.brandName);
    if (item.projectName) await expect(info.locator(".pdfTitleSecondary")).toHaveText(item.projectName);
    else await expect(info.locator(".pdfTitleSecondary")).toHaveCount(0);
    await expect(info.locator(":scope > p")).toHaveText(item.intro);

    const layout = await heroImage.evaluate((image: HTMLImageElement) => {
      const box = image.getBoundingClientRect();
      const heroBox = image.parentElement!.getBoundingClientRect();
      const infoBox = image.parentElement!.nextElementSibling!.getBoundingClientRect();
      return {
        objectFit: getComputedStyle(image).objectFit,
        displayedRatio: box.width / box.height,
        naturalRatio: image.naturalWidth / image.naturalHeight,
        separated: infoBox.top >= heroBox.bottom - 1,
      };
    });
    expect(layout.objectFit).toBe("contain");
    expect(layout.displayedRatio).toBeCloseTo(layout.naturalRatio, 2);
    expect(layout.separated).toBe(true);

    const chapterCount = item.media.filter((asset, index) => index >= 2 && asset.section).length;
    const imageCount = item.media.filter((asset) => asset.type === "image").length - 2;
    await expect(page.locator(".pdfLongChapter > header")).toHaveCount(chapterCount);
    await expect(page.locator(".pdfLongWaterfall figure")).toHaveCount(imageCount);
  }
});
