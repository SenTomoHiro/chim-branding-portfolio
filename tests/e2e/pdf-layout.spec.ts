import { expect, test } from "@playwright/test";
import { getCaseBodyMedia } from "../../lib/case-media";
import { groupBodyAssets } from "../../lib/chapters";
import { getPortfolioPdfCases, resolvePortfolioPdfImages } from "../../lib/pdf-portfolio";
import sharp from "sharp";
import path from "node:path";
import { readFile } from "node:fs/promises";
import type { ContentData } from "../../lib/types";

// Freeze layout evidence to this checkout's fetched official baseline. Mixing
// live main JSON with older checkout media invalidates before/after comparisons.
const content: ContentData = JSON.parse(await readFile(new URL("../../data/content.json", import.meta.url), "utf8"));
const caseIds = ["SL004", "N025", "L021", "L016"];
test.setTimeout(120_000);

// Mirror the Node preflight used by the real generator. These layout tests
// exercise the final print page, rather than unrelated remote dimension probes.
test.beforeEach(async ({ page }) => {
  const printContent = structuredClone(content);
  const usedCases = new Set(["N013", "L019", "N003", "N024", "N025", "N027", "SL001", ...caseIds]);
  const portfolioCases = new Set(getPortfolioPdfCases(printContent, "branding").map(item => item.id));
  for (const item of printContent.cases) {
    const selected = new Set(resolvePortfolioPdfImages(item).map(image => image.id));
    for (const asset of item.media) {
      if (asset.type !== "image" || (!usedCases.has(item.id) && !(portfolioCases.has(item.id) && selected.has(asset.id)))) continue;
      if ((asset.width || asset.provenance?.width) && (asset.height || asset.provenance?.height)) continue;
      const metadata = await sharp(path.join(process.cwd(), "public", asset.src)).metadata();
      if (!metadata.width || !metadata.height) throw new Error(`case=${item.id} media=${asset.id} src=${asset.src}`);
      asset.width = metadata.width; asset.height = metadata.height;
    }
  }
  await page.route("**/data/content.json*", route => route.fulfill({ json: printContent }));
  await page.route("**/public/media/**", async route => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const file = path.join(process.cwd(), pathname.slice(pathname.indexOf("/public/media/") + 1));
    const pixels = await sharp(file).rotate().resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer();
    await route.fulfill({ contentType: "image/jpeg", body: pixels });
  });
});

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
  expect(await page.locator(".pdfLongChapter").evaluateAll(groups => groups.map(group => [...group.querySelectorAll<HTMLElement>("figure[data-media-id]")].map(e => e.dataset.mediaId)))).toEqual(expectedGroups);
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
    const gaps = container.getAttribute("data-pdf-composition") === "masonry" ? columns.flatMap((column) => column.slice(1).map((figure, index) => figure.top - column[index].bottom)) : [];
    const overlaps = figures.some((a, i) => figures.slice(i + 1).some(b => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
    return {
      ids: figures.map((figure) => figure.id),
      gaps,
      ratioDeltas: figures.map((figure) => figure.ratioDelta),
      horizontalSeparation: !columns[0].length || !columns[1].length || Math.max(...columns[0].map((figure) => figure.right)) <= Math.min(...columns[1].map((figure) => figure.left)) + 1,
      inside: figures.every((figure) => figure.left >= containerBox.left - 1 && figure.right <= containerBox.right + 1 && figure.top >= containerBox.top - 1 && figure.bottom <= containerBox.bottom + 1),
      containerCoversColumns: !figures.length || containerBox.bottom >= Math.max(...figures.map((figure) => figure.bottom)) - 1,
      overlaps,
    };
  }));

  expect(geometry.flatMap((group) => group.ids)).toEqual(expectedGroups.flat());
  const gaps = geometry.flatMap((group) => group.gaps);
  const formalGapPx = 5 * 96 / 25.4;
  expect(gaps.every(gap => Math.abs(gap - formalGapPx) <= 2)).toBe(true);
  expect(geometry.every((group) => group.horizontalSeparation && group.inside && group.containerCoversColumns && !group.overlaps)).toBe(true);
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

test("height guards preserve N025 and N027 chapter order, ratios, and non-overlapping geometry", async ({ page }) => {
  for (const id of ["N025", "N027"]) {
    await verifyWaterfallGeometry(page, id);
    expect(await page.locator("[data-pdf-reason^='height-guard']").count()).toBeGreaterThan(0);
  }
});

test("portfolio PDF preserves selection and bounds in adaptive compositions", async ({ page }) => {
  await page.goto("/print/portfolio/?kind=design-food", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-pdf-ready='true']")).toBeVisible();
  const waterfalls = page.locator(".pdfPortfolioLongBody [data-pdf-waterfall='true']");
  await expect(waterfalls.first()).toBeVisible();
  expect(await waterfalls.count()).toBeGreaterThan(0);
  // Layout readiness plus the inspected chapter's real pixels is deterministic;
  // global network idle also waits for unrelated offscreen portfolio downloads.
  await expect.poll(() => waterfalls.first().locator("img").evaluateAll((images: HTMLImageElement[]) =>
    images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
  await expect(page.locator(".pdfPortfolioLongBody .pdfLongWaterfall").first()).toHaveCSS("position", "relative");
  await expect(page.locator(".pdfPortfolioLongBody .pdfLongWaterfall figure").first()).toHaveCSS("position", "absolute");
  const expected = getPortfolioPdfCases(content, "branding", "food").map(item => ({ id: item.id, sources: resolvePortfolioPdfImages(item).map(image => image.src) }));
  const rendered = await page.locator("[data-portfolio-case-page]").evaluateAll(cases => cases.map(element => ({
    id: element.getAttribute("data-portfolio-case-id"), sources: [...element.querySelectorAll<HTMLImageElement>("img")].map(image => new URL(image.src).pathname.split("/public")[1]),
  })));
  expect(rendered).toEqual(expected);
  // A composition must belong to one formal chapter group, including when a
  // chapter boundary is on an unselected image.
  expect(await page.locator(".pdfPortfolioEditorialGroup [data-pdf-composition]").count()).toBe(await page.locator(".pdfPortfolioLongBody [data-pdf-composition]").count());
});

test("L019 closes its short tail while retaining all three source images in order", async ({ page }) => {
  const item = content.cases.find(entry => entry.id === "L019")!;
  await page.goto("/print/case/?id=L019");
  await expect(page.locator("[data-pdf-ready='true']")).toBeVisible();
  const composition = page.locator(".pdfLongChapter [data-pdf-composition]");
  expect(await composition.evaluateAll(blocks => blocks.map(block => block.getAttribute("data-pdf-composition")))).toEqual(["full", "pair"]);
  expect(await page.locator(".pdfLongChapter figure").evaluateAll(figures => figures.map(figure => figure.getAttribute("data-media-id")))).toEqual(getCaseBodyMedia(item).filter(media => media.type === "image").map(media => media.id));
  const bottoms = await composition.nth(1).locator("figure").evaluateAll(figures => figures.map(figure => figure.getBoundingClientRect().bottom));
  expect(Math.abs(bottoms[0] - bottoms[1])).toBeLessThan(1);
});

test("complete Design Portfolio preserves every official selection and all composition bounds", async ({ page }) => {
  await page.goto("/print/portfolio/?kind=design");
  await expect(page.locator("[data-pdf-ready='true']")).toBeVisible();
  const expected = getPortfolioPdfCases(content, "branding").map(item => ({ id: item.id, sources: resolvePortfolioPdfImages(item).map(image => image.src) }));
  const actual = await page.locator("[data-portfolio-case-page]").evaluateAll(cases => cases.map(element => ({
    id: element.getAttribute("data-portfolio-case-id"), sources: [...element.querySelectorAll<HTMLImageElement>("img")].map(image => new URL(image.src).pathname.split("/public")[1]),
  })));
  expect(actual).toEqual(expected);
  const invalid = await page.locator("[data-pdf-composition]").evaluateAll(blocks => blocks.filter(block => {
    const bounds = block.getBoundingClientRect();
    const figures = [...block.querySelectorAll("figure")].map(f => f.getBoundingClientRect());
    return figures.some((a, i) => a.width <= 0 || a.height <= 0 || a.left < bounds.left - 1 || a.right > bounds.right + 1 || a.top < bounds.top - 1 || a.bottom > bounds.bottom + 1 || figures.slice(i + 1).some(b => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1));
  }).length);
  expect(invalid).toBe(0);
  const narrowStandaloneRows = await page.locator("[data-pdf-composition='full']").evaluateAll(blocks => blocks.filter(block => {
    const bounds = block.getBoundingClientRect();
    const figures = [...block.querySelectorAll("figure")];
    if (figures.length !== 1) return true;
    const image = figures[0].getBoundingClientRect();
    return Math.abs(image.left - bounds.left) > 1 || Math.abs(image.width - bounds.width) > 1;
  }).length);
  expect(narrowStandaloneRows).toBe(0);
  const chapterGroups = await page.locator("[data-portfolio-case-page]").evaluateAll(cases => cases.map(element => ({
    id: element.getAttribute("data-portfolio-case-id"),
    groups: [...element.querySelectorAll(".pdfPortfolioEditorialGroup")].map(group => [...group.querySelectorAll("figure")].map(figure => figure.getAttribute("data-media-id"))),
  })));
  expect(chapterGroups).toEqual(getPortfolioPdfCases(content, "branding").map(item => {
    const selected = new Set(resolvePortfolioPdfImages(item).slice(1).map(image => image.id));
    return { id: item.id, groups: groupBodyAssets(item.media).map(group => group.assets.filter(asset => selected.has(asset.id)).map(asset => asset.id)).filter(group => group.length) };
  }));
});
