import { expect, test } from "@playwright/test";
import { fetchOfficialContent } from "../helpers/official-content";
import { getCaseBodyMedia } from "../../lib/case-media";
import { groupBodyAssets } from "../../lib/chapters";

const content = await fetchOfficialContent();
const caseIds = ["SL004", "N025", "L021", "L016"];
test.setTimeout(120_000);

test("print route loads the bundled CJK font and renders N013 source text", async ({ page }) => {
  const item = content.cases.find((entry) => entry.id === "N013")!;
  await page.goto("/print/case/?id=N013", { waitUntil: "networkidle" });
  await expect(page.locator("[data-pdf-ready='true']")).toBeVisible();
  expect(await page.evaluate(async () => {
    await document.fonts.ready;
    const sample = "中文品牌设计餐饮案例";
    await document.fonts.load("16px 'Noto Sans SC Variable'", sample);
    return document.fonts.check("16px 'Noto Sans SC Variable'", sample);
  })).toBe(true);
  await expect(page.locator(".pdfDocument")).toContainText("堡乎乎");
  await expect(page.locator(".pdfDocument")).toContainText("Manual Burger");
  await expect(page.locator(".pdfDocument")).toContainText("餐饮");
  await expect(page.locator(".pdfDocument")).toContainText("品牌设计");
  await expect(page.locator(".pdfDocument")).toContainText(item.intro);
});

test("single-case PDF keeps the hero clean and moves case copy into a separate section", async ({ page }) => {
  for (const id of caseIds) {
    const item = content.cases.find((entry) => entry.id === id)!;
    await page.goto(`/print/case/?id=${id}`);

    const hero = page.locator(".pdfLongHero");
    const heroImage = hero.locator(":scope > .pdfPicture");
    await expect.poll(() => heroImage.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
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

async function verifyWaterfallGeometry(page: import("@playwright/test").Page, id: string) {
  const item = content.cases.find((entry) => entry.id === id)!;
  const expectedGroups = groupBodyAssets(getCaseBodyMedia(item)).map((group) => group.assets.filter((asset) => asset.type === "image").map((asset) => asset.id));
  await page.goto(`/print/case/?id=${id}`, { waitUntil: "networkidle" });
  await expect(page.locator("[data-pdf-ready='true']")).toBeVisible();
  await expect(page.locator(".pdfLongWaterfall")).toHaveCount(expectedGroups.length);
  await expect.poll(() => page.locator(".pdfLongWaterfall img").evaluateAll((images: HTMLImageElement[]) => images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);

  const geometry = await page.locator(".pdfLongWaterfall").evaluateAll((containers) => containers.map((container) => {
    const containerBox = container.getBoundingClientRect();
    const figures = [...container.querySelectorAll<HTMLElement>(":scope > figure")].map((figure) => {
      const box = figure.getBoundingClientRect();
      const image = figure.querySelector("img") as HTMLImageElement;
      return {
        id: figure.dataset.mediaId,
        column: Number(figure.dataset.masonryColumn),
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        ratioDelta: Math.abs(box.width / box.height - image.naturalWidth / image.naturalHeight),
      };
    });
    const columns = [0, 1].map((column) => figures.filter((figure) => figure.column === column));
    const gaps = columns.flatMap((column) => column.slice(1).map((figure, index) => figure.top - column[index].bottom));
    return {
      ids: figures.map((figure) => figure.id),
      gaps,
      ratioDeltas: figures.map((figure) => figure.ratioDelta),
      horizontalSeparation: !columns[0].length || !columns[1].length || Math.max(...columns[0].map((figure) => figure.right)) <= Math.min(...columns[1].map((figure) => figure.left)) + 1,
      inside: figures.every((figure) => figure.left >= containerBox.left - 1 && figure.right <= containerBox.right + 1 && figure.top >= containerBox.top - 1 && figure.bottom <= containerBox.bottom + 1),
      containerCoversColumns: !figures.length || containerBox.bottom >= Math.max(...figures.map((figure) => figure.bottom)) - 1,
    };
  }));

  expect(geometry.map((group) => group.ids)).toEqual(expectedGroups);
  const gaps = geometry.flatMap((group) => group.gaps);
  expect(gaps.length).toBeGreaterThan(0);
  const formalGapPx = 5 * 96 / 25.4;
  expect(Math.max(...gaps.map((gap) => Math.abs(gap - formalGapPx)))).toBeLessThanOrEqual(2);
  expect(geometry.every((group) => group.horizontalSeparation && group.inside && group.containerCoversColumns)).toBe(true);
  expect(Math.max(...geometry.flatMap((group) => group.ratioDeltas))).toBeLessThan(0.01);
  const contentBottom = await page.locator(".pdfLongContent").evaluate((element) => element.getBoundingClientRect().bottom);
  const footerTop = await page.locator(".pdfCaseContentFooter").evaluate((element) => element.getBoundingClientRect().top);
  expect(footerTop).toBeGreaterThanOrEqual(contentBottom - 1);
}

test("N003 uses true waterfall geometry without grid-row holes", async ({ page }) => {
  await verifyWaterfallGeometry(page, "N003");
});

test("N024 resets deterministic waterfall geometry at every chapter", async ({ page }) => {
  await verifyWaterfallGeometry(page, "N024");
});

test("portfolio PDF reuses the true waterfall implementation", async ({ page }) => {
  await page.goto("/print/portfolio/?kind=design-food", { waitUntil: "networkidle" });
  await expect(page.locator("[data-pdf-ready='true']")).toBeVisible();
  const waterfalls = page.locator(".pdfPortfolioLongBody [data-pdf-waterfall='true']");
  await expect(waterfalls.first()).toBeVisible();
  expect(await waterfalls.count()).toBeGreaterThan(0);
  await expect(page.locator(".pdfPortfolioLongBody .pdfLongWaterfall").first()).toHaveCSS("position", "relative");
  await expect(page.locator(".pdfPortfolioLongBody .pdfLongWaterfall figure").first()).toHaveCSS("position", "absolute");
});
