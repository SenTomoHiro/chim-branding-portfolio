import { expect, test, type Locator, type Page } from "@playwright/test";
import type { ContentData, PortfolioCase } from "../../lib/types";

const api = "https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio";
const media = (id: string, section?: PortfolioCase["media"][number]["section"]) => ({
  id, type: "image" as const, src: "/favicon.svg", layout: id.endsWith("4") ? "half" as const : "full" as const,
  portfolioPdfSelected: id.endsWith("2") || id.endsWith("4"), section,
});
const makeCase = (id: string, business: PortfolioCase["business"] = "branding", withChapters = false): PortfolioCase => ({
  id, brandName: `Case ${id}`, projectName: "", intro: `Intro ${id}`, business,
  categories: business === "branding" ? ["food"] : [], primaryIndustry: "餐饮", published: true, includeInPortfolioPdf: true,
  media: withChapters ? [
    media(`${id}-1`), media(`${id}-2`), media(`${id}-3`, { eyebrow: "CHAPTER 01", title: "First" }), media(`${id}-4`), media(`${id}-5`),
    media(`${id}-6`, { eyebrow: "CHAPTER 02", title: "Second" }), media(`${id}-7`),
  ] : [media(`${id}-1`), media(`${id}-2`)],
});
const unsectionedCase: PortfolioCase = {
  ...makeCase("U"),
  media: [media("U-1"), media("U-2"), media("U-3"), media("U-4", { eyebrow: "CHAPTER 01", title: "Only" }), media("U-5")],
};
const content: ContentData = {
  cases: [makeCase("A"), makeCase("B", "branding", true), makeCase("C"), makeCase("D"), unsectionedCase, makeCase("P", "photography")],
  defaultOrder: ["A", "B", "C", "D", "U"], photographyCaseOrder: ["P"],
};
const remote = (value: unknown, sha = "fixture-sha") => ({ content: Buffer.from(JSON.stringify(value)).toString("base64"), sha });

async function connect(page: Page) {
  await page.route(api, (route) => route.fulfill({ json: { id: 1 } }));
  await page.route(`${api}/contents/data/content.json?ref=main`, (route) => route.fulfill({ json: remote(content) }));
  await page.route(`${api}/contents/data/pdf-cache.json?ref=main`, (route) => route.fulfill({ status: 404 }));
  await page.getByLabel("Fine-grained personal access token").fill("fixture-token");
  await page.getByRole("button", { name: "连接 GitHub" }).click();
  await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();
}

async function startBrowserDrag(page: Page, handle: Locator, target: Locator) {
  await target.scrollIntoViewIfNeeded();
  await handle.scrollIntoViewIfNeeded();
  const sourceBox = await handle.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("sortable row is not visible");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 12, sourceBox.y + sourceBox.height / 2 + 12, { steps: 8 });
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 16 });
}

const ids = (rows: Locator) => rows.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-sortable-id")));

test("local GitHub admin uses a full-row preview and live stable-id case sorting", async ({ page }) => {
  await page.addInitScript(() => {
    const original = DataTransfer.prototype.setDragImage;
    DataTransfer.prototype.setDragImage = function (element, x, y) {
      (window as typeof window & { dragPreview?: unknown }).dragPreview = {
        tag: element.tagName, title: element.textContent, hasThumbnail: Boolean(element.querySelector(".adminThumb")), x, y,
      };
      return original.call(this, element, x, y);
    };
  });
  await page.goto("/admin/");
  await connect(page);
  const branding = page.locator('[data-order-type="branding"] .adminCaseList article');
  const photography = page.locator('[data-order-type="photography"] .adminCaseList article');
  await startBrowserDrag(page, branding.nth(1).getByRole("button", { name: "拖动Case B" }), branding.nth(2));
  await expect.poll(() => ids(branding)).toEqual(["A", "C", "B", "D", "U"]);
  const dBox = await branding.filter({ hasText: "Case D" }).boundingBox();
  if (!dBox) throw new Error("D row missing");
  await page.mouse.move(dBox.x + dBox.width / 2, dBox.y + dBox.height / 2, { steps: 16 });
  await expect.poll(() => ids(branding)).toEqual(["A", "C", "D", "B", "U"]);
  expect(await page.evaluate(() => (window as typeof window & { dragPreview?: { tag: string; title: string; hasThumbnail: boolean } }).dragPreview)).toMatchObject({ tag: "ARTICLE", hasThumbnail: true });
  await page.mouse.up();
  await expect.poll(() => ids(branding)).toEqual(["A", "C", "D", "B", "U"]);
  expect(await ids(photography)).toEqual(["P"]);
});

test("media uses the same live sorter, keeps metadata, and rejects cross-chapter drag", async ({ page }) => {
  let saved: ContentData | undefined;
  await page.setViewportSize({ width: 1440, height: 1800 });
  await page.route(`${api}/contents/data/content.json`, async (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    const body = route.request().postDataJSON() as { content: string };
    saved = JSON.parse(Buffer.from(body.content, "base64").toString()) as ContentData;
    await route.fulfill({ json: { content: { sha: "saved-sha" } } });
  });
  await page.goto("/admin/cases/?id=B");
  await connect(page);
  const firstChapter = page.locator('.chapterGroup[data-chapter-id="B-3"]');
  const rows = firstChapter.locator(".bodyAssetList article");
  await startBrowserDrag(page, rows.nth(2).getByRole("button", { name: "拖动媒体 5" }), rows.nth(1));
  await expect.poll(() => ids(rows)).toEqual(["B-3", "B-5", "B-4"]);
  const movedMedia4 = firstChapter.locator('[data-media-id="B-4"]');
  await expect(movedMedia4.getByRole("checkbox")).toBeChecked();
  await expect(movedMedia4.locator(".mediaLayout")).toHaveValue("half");
  await page.mouse.up();
  const finalOrder = await ids(page.locator(".bodyAssetList article"));
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  expect(saved?.cases.find((item) => item.id === "B")?.media.map((asset) => asset.id)).toEqual(finalOrder);

  const secondChapterRow = page.locator('.chapterGroup[data-chapter-id="B-6"] .bodyAssetList article').first();
  await startBrowserDrag(page, firstChapter.locator('[data-media-id="B-5"] .dragHandle'), secondChapterRow);
  await page.mouse.up();
  expect(new Set(await ids(firstChapter.locator(".bodyAssetList article")))).toEqual(new Set(["B-3", "B-4", "B-5"]));
  expect(await ids(page.locator('.chapterGroup[data-chapter-id="B-6"] .bodyAssetList article'))).toEqual(["B-6", "B-7"]);
  await expect(firstChapter.getByLabel("章节标题")).toHaveValue("First");
});

test("inline chapter draft follows the selected body media and icon controls stay accessible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/admin/cases/?id=B");
  await connect(page);

  const roles = page.locator(".roleAssetList article");
  await expect(roles).toHaveCount(2);
  await expect(roles.nth(0)).toHaveAttribute("data-media-role", "cover");
  await expect(roles.nth(1)).toHaveAttribute("data-media-role", "hero");
  await expect(roles.getByRole("button", { name: "从此创建章节" })).toHaveCount(0);
  await expect(roles.locator(".chapterMove")).toHaveCount(0);
  await expect(page.locator('.chapterGroup[data-chapter-id="unsectioned"]')).toHaveCount(0);

  const media4 = page.locator('[data-media-id="B-4"]');
  await media4.getByRole("button", { name: "从此创建章节" }).click();
  const draft = page.getByRole("group", { name: "添加章节" });
  await expect(draft).toHaveCount(1);
  expect(await media4.evaluate((element) => element.previousElementSibling?.getAttribute("data-chapter-draft-for"))).toBe("B-4");
  await expect(draft.getByLabel("从媒体开始").locator("option")).toHaveCount(3);
  await draft.getByLabel("从媒体开始").selectOption("B-5");
  const media5 = page.locator('[data-media-id="B-5"]');
  expect(await media5.evaluate((element) => element.previousElementSibling?.getAttribute("data-chapter-draft-for"))).toBe("B-5");
  await draft.getByRole("button", { name: "取消" }).click();
  await expect(draft).toHaveCount(0);

  await media4.getByRole("button", { name: "从此创建章节" }).click();
  await draft.getByLabel("章节标题").fill("Inline Chapter");
  const orderBefore = await ids(page.locator(".bodyAssetList article"));
  await draft.getByRole("button", { name: "创建章节" }).click();
  await expect(draft).toHaveCount(0);
  await expect(page.locator('input[value="Inline Chapter"]')).toBeVisible();
  expect(await ids(page.locator(".bodyAssetList article"))).toEqual(orderBefore);

  await expect(media5.getByRole("button", { name: "从此创建章节" })).toHaveAttribute("title", "从此创建章节");
  await expect(media5.getByRole("button", { name: "删除媒体 5" })).toHaveAttribute("title", "删除媒体");
  await expect(media5.getByRole("combobox", { name: "媒体 5 宽度" }).locator("option")).toHaveText(["全屏", "半屏"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  for (const button of [media5.getByRole("button", { name: "从此创建章节" }), media5.getByRole("button", { name: "删除媒体 5" })]) {
    const box = await button.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(36); expect(box?.height).toBeGreaterThanOrEqual(36);
  }
});

test("only real unsectioned body media appears in the unsectioned chapter group", async ({ page }) => {
  await page.goto("/admin/cases/?id=U");
  await connect(page);
  const roles = page.locator(".roleAssetList article");
  await expect(roles).toHaveCount(2);
  await expect(roles.locator(".chapterMove")).toHaveCount(0);
  await expect(roles.getByRole("button", { name: "从此创建章节" })).toHaveCount(0);
  const unsectioned = page.locator('.chapterGroup[data-chapter-id="unsectioned"]');
  await expect(unsectioned).toContainText("UNSECTIONED");
  expect(await ids(unsectioned.locator(".bodyAssetList article"))).toEqual(["U-3"]);
});

test("dragging across the role boundary immediately re-derives cover, hero and chapters", async ({ page }) => {
  await page.goto("/admin/cases/?id=B");
  await connect(page);
  const source = page.locator('[data-media-id="B-2"] .dragHandle');
  const target = page.locator('[data-media-id="B-4"]');
  await startBrowserDrag(page, source, target);
  await expect(page.locator('.roleAssetList article[data-media-id="B-3"]')).toHaveAttribute("data-media-role", "hero");
  await expect(page.locator('.chapterGroup[data-chapter-id="B-3"]')).toHaveCount(0);
  await expect(page.locator('[data-media-id="B-2"]')).not.toHaveAttribute("data-media-role", /.+/);
  await expect(page.locator('[data-media-id="B-2"]')).toContainText("媒体 4");
  await page.mouse.up();
});
