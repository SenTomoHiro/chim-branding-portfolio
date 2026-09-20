import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { casePath } from "../../lib/case-route";
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
    const response = await page.goto(casePath(item.name));
    expect(response?.status(), item.id).toBe(200);
    await expect(page.getByRole("heading", { name: item.name })).toBeVisible();
    const taxonomy = item.business === "photography" ? "商业摄影" : item.categories.map((category) => ({ food: "餐饮", drinks: "饮品", ip: "IP", other: "其他" })[category]).join(" / ");
    await expect(page.locator(".workIntro div>p")).toHaveText(`${taxonomy} · ${item.primaryIndustry}`);
    await expect(page.locator(".workHero img")).toHaveJSProperty("complete", true);
    await expect(page.locator(".mediaFlow figure")).toHaveCount(item.bodyAssets.length);
    const order = item.business === "photography" ? content.photographyCaseOrder : content.defaultOrder;
    const sameBusiness = published.filter((entry) => entry.business === item.business);
    const ordered = order.map((id) => sameBusiness.find((entry) => entry.id === id)).filter(Boolean);
    const next = ordered[(ordered.findIndex((entry) => entry!.id === item.id) + 1) % ordered.length]!;
    await expect(page.locator(".nextCase")).toHaveAttribute("href", casePath(next.name));
  }
});

test("mobile, tablet and desktop layouts have no overflow and use responsive masonry", async ({ page }) => {
  const viewports = [{ width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 1366 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/food", "/drinks", "/ip", "/other", "/photo", casePath(brandingPublished[0].name), casePath(photographyPublished[0].name), "/admin"]) {
      await page.goto(route); await expectNoHorizontalOverflow(page);
    }
    await page.goto("/"); await page.waitForTimeout(650);
    const columnCount = await page.locator(".caseCard").evaluateAll((cards) => new Set(cards.slice(0, 8).map((card) => Math.round(card.getBoundingClientRect().left))).size);
    expect(columnCount).toBe(viewport.width < 768 ? 1 : viewport.width < 1200 ? 2 : 3);
  }
});

async function expectStickyHeader(page: Page) {
  await expect(page.getByRole("button", { name: "返回案例列表" })).toHaveCSS("opacity", "1");
  for (const progress of [0.25, 0.5, 0.9]) {
    await page.evaluate((ratio) => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) * ratio), progress);
    await expect(page.locator(".detailHeader")).toBeVisible();
    const position = await page.locator(".detailHeader").evaluate((header) => ({ top: header.getBoundingClientRect().top, position: getComputedStyle(header).position }));
    expect(position.position).toBe("sticky");
    expect(Math.abs(position.top)).toBeLessThanOrEqual(1);
  }
  const closeBox = await page.getByRole("button", { name: "返回案例列表" }).boundingBox();
  expect(closeBox?.width).toBeGreaterThanOrEqual(44); expect(closeBox?.height).toBeGreaterThanOrEqual(44);
}

test("Branding and Photography details keep a sticky header and close to their source lists", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, expectedBusiness] of [["/food", "branding"], ["/photo", "photography"]] as const) {
    await page.goto(route);
    const listHeaderHeight = await page.locator(".siteHeader").evaluate((header) => header.getBoundingClientRect().height);
    const card = page.locator(".caseCard a").first(); const href = await card.getAttribute("href"); await card.click();
    await page.waitForURL((url) => url.pathname === href);
    expect(new URL(page.url()).pathname).toBe(href);
    if (await page.evaluate(() => document.documentElement.matches(":active-view-transition"))) await expect(page.getByRole("button", { name: "返回案例列表" })).toHaveCSS("opacity", "0");
    const headerLayout = await page.locator(".siteHeader").evaluate((header) => {
      const navigation = header.querySelector(".siteNavigation")!.getBoundingClientRect();
      const close = document.querySelector<HTMLElement>(".detailClose")!; const closeBox = close.getBoundingClientRect();
      const headerBox = header.getBoundingClientRect(); const topSpacing = closeBox.top - headerBox.bottom; const rightSpacing = innerWidth - closeBox.right;
      return { headerCount: document.querySelectorAll(".siteHeader").length, sharedNavigation: Boolean(header.querySelector(":scope > .headerActions > .siteNavigation")), closeOutOfFlow: getComputedStyle(close).position === "absolute", closeBelowNavigation: closeBox.top >= navigation.bottom, balancedSpacing: Math.abs(topSpacing - rightSpacing) < .1, headerHeight: headerBox.height };
    });
    expect(headerLayout).toMatchObject({ headerCount: 1, sharedNavigation: true, closeOutOfFlow: true, closeBelowNavigation: true, balancedSpacing: true });
    expect(Math.abs(headerLayout.headerHeight - listHeaderHeight)).toBeLessThanOrEqual(1);
    await expectStickyHeader(page);
    const metadata = await page.locator(".workIntro div>p").textContent();
    if (expectedBusiness === "photography") expect(metadata).toMatch(/^商业摄影 · /); else expect(metadata).not.toMatch(/^ · /);
    await page.getByRole("button", { name: "返回案例列表" }).click();
    await expect(page).toHaveURL(new RegExp(`${route.replace("/", "\\/")}$`));
  }
});

test("detail titles and floating controls remain usable across viewports", async ({ page }) => {
  const longTitle = published.find((item) => item.id === "SL001")!;
  const shortTitle = published.find((item) => item.name.length <= 6)!;
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto(casePath(longTitle.name));
    const titleMetrics = await page.locator(".workIntro h1").evaluate((title) => {
      const style = getComputedStyle(title);
      const box = title.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(title);
      const lines = [...range.getClientRects()];
      return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), lineCount: lines.length, height: box.height };
    });
    expect(titleMetrics.lineHeight).toBeCloseTo(titleMetrics.fontSize, 1);
    expect(titleMetrics.lineCount).toBeGreaterThan(1);
    expect(titleMetrics.height).toBeGreaterThan(titleMetrics.lineHeight);

    const backToTop = page.getByRole("button", { name: "返回顶部" });
    await expect(backToTop).toBeVisible();
    const controlLayout = await backToTop.evaluate((button) => {
      const style = getComputedStyle(button); const box = button.getBoundingClientRect();
      return { position: style.position, zIndex: style.zIndex, width: box.width, height: box.height, right: innerWidth - box.right, bottom: innerHeight - box.bottom };
    });
    expect(controlLayout).toMatchObject({ position: "fixed", zIndex: "30", width: 44, height: 44 });
    expect(controlLayout.right).toBeGreaterThanOrEqual(16);
    expect(controlLayout.bottom).toBeGreaterThanOrEqual(16);
    await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
    await expect.poll(() => backToTop.evaluate((button) => {
      const box = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
    })).toBe(true);
    const beforeUrl = page.url(); const historyLength = await page.evaluate(() => history.length);
    await backToTop.click(); await backToTop.click(); await backToTop.click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
    expect(page.url()).toBe(beforeUrl);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(casePath(shortTitle.name));
  const singleTitleMetrics = await page.locator(".workIntro h1").evaluate((title) => {
    const style = getComputedStyle(title); const box = title.getBoundingClientRect();
    return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), height: box.height };
  });
  expect(singleTitleMetrics.lineHeight).toBeCloseTo(singleTitleMetrics.fontSize, 1);
  expect(singleTitleMetrics.height).toBeCloseTo(singleTitleMetrics.lineHeight, 0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "返回顶部" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
});

test("direct detail URLs close to their business fallback", async ({ page }) => {
  for (const [item, route] of [[brandingPublished[0], "/"], [photographyPublished[0], "/photo"]] as const) {
    await page.goto(casePath(item.name));
    await page.evaluate(() => sessionStorage.removeItem("chim-case-list-entry"));
    await page.getByRole("button", { name: "返回案例列表" }).click();
    await expect(page).toHaveURL(new RegExp(`${route === "/" ? "\\/$" : "\\/photo$"}`));
  }
});

async function expectCaseReturnPosition(page: Page, route: string, caseId: string) {
  await page.goto(route);
  const card = page.locator(`[data-case-id="${caseId}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -Math.min(120, innerHeight / 6)));
  const before = await card.evaluate((element) => element.getBoundingClientRect().top);
  await card.locator("a").click();
  await expect(page.getByRole("button", { name: "返回案例列表" })).toHaveCSS("opacity", "1");
  await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await expect(page).toHaveURL(new RegExp(`${route === "/" ? "\\/$" : `${route.replace("/", "\\/")}$`}`));
  await expect(card).toBeInViewport();
  const after = await card.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(48);
  await expectNoHorizontalOverflow(page);
}

test("desktop close restores the origin case position after a long Chapter detail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await expectCaseReturnPosition(page, "/", "SL001");
});

test("category filter and case position survive detail close", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const filtered = brandingPublished.find((item) => item.categories.includes("drinks") && content.defaultOrder.indexOf(item.id) > 3)!;
  await expectCaseReturnPosition(page, "/drinks", filtered.id);
  await expect(page.locator('.categoryNav a[href="/drinks"]')).toHaveClass(/active/);
});

test("mobile close restores the origin card without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expectCaseReturnPosition(page, "/", "SL005");
});

test("browser Back restores the source list and origin card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/food");
  const target = page.locator(".caseCard").nth(7);
  const caseId = await target.getAttribute("data-case-id");
  await target.scrollIntoViewIfNeeded();
  const before = await target.evaluate((element) => element.getBoundingClientRect().top);
  await target.locator("a").click();
  await expect(page.getByRole("button", { name: "返回案例列表" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/food$/);
  const restored = page.locator(`[data-case-id="${caseId}"]`);
  await expect(restored).toBeInViewport();
  const after = await restored.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(48);
});

test("home and details share the SiteHeader structure and name URLs support Chinese with spaces", async ({ page }) => {
  const named = published.find((item) => /[\u3400-\u9fff]/u.test(item.name) && item.name.includes(" "))!;
  for (const route of ["/", casePath(named.name)]) {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator(".siteHeader > .headerActions > .siteNavigation")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  }
  await expect(page.getByRole("heading", { name: named.name })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe(casePath(named.name));
});

test("sitemap publishes name URLs and contains no retired slug URL", async ({ request }) => {
  const response = await request.get("/sitemap.xml"); const xml = await response.text();
  expect(response.ok()).toBe(true);
  expect(xml).toContain(casePath(brandingPublished.find((item) => item.name.includes(" "))!.name).replaceAll("&", "&amp;"));
  expect(xml).not.toContain("/work/n013-manual-burger");
});

test("admin taxonomy mutations are usable and reversible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("wrong"); await page.getByRole("button", { name: "登录" }).click(); await expect(page.locator(".formError")).toContainText("密码错误");
  await page.getByLabel("管理员密码").fill("e2e-password"); await page.getByRole("button", { name: "登录" }).click(); await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();
  await expect(page.locator('[data-order-type="branding"] .adminCaseList article')).toHaveCount(content.cases.filter((item) => item.business === "branding").length);
  await expect(page.locator('[data-order-type="photography"] .adminCaseList article')).toHaveCount(content.cases.filter((item) => item.business === "photography").length);
  await expect(page.getByText("行业标签（逗号分隔）")).toHaveCount(0); await expect(page.getByText("设计标签（逗号分隔）")).toHaveCount(0); await expect(page.getByText("主要设计类型")).toHaveCount(0);

  const brandingSection = page.locator('[data-order-type="branding"]'); const firstName = await brandingSection.locator(".adminCaseName strong").first().textContent();
  await brandingSection.locator(".adminCaseList article").nth(1).dragTo(brandingSection.locator(".adminCaseList article").first()); await brandingSection.getByRole("button", { name: "保存排序" }).click(); await expect(brandingSection.locator(".saveMessage")).toContainText("已保存");
  await brandingSection.locator(".adminCaseList article").nth(1).dragTo(brandingSection.locator(".adminCaseList article").first()); await brandingSection.getByRole("button", { name: "保存排序" }).click(); await expect(brandingSection.locator(".adminCaseName strong").first()).toHaveText(firstName || "");

  await page.getByRole("link", { name: "新建案例" }).click();
  await expect(page.getByLabel("Slug", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("细分品类")).toBeVisible(); await expect(page.getByLabel("主要行业")).toHaveCount(0);
  await expect(page.getByText("案例列表封面", { exact: true })).toBeVisible(); await expect(page.getByText("案例详情页首图", { exact: true })).toBeVisible();
  await page.getByLabel("名称", { exact: true }).fill(brandingPublished[0].name); await page.getByLabel("餐饮").check(); await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存失败：案例名称已存在，请使用唯一名称。");
  await page.locator(".adminHeader .wordmark").click(); await page.getByRole("link", { name: "新建案例" }).click();
  await page.getByLabel("名称", { exact: true }).fill("分类验收草稿");
  await page.getByLabel("饮品").check(); await page.getByLabel("IP", { exact: true }).check();
  await page.getByLabel("商业摄影").check();
  await expect(page.getByLabel("饮品")).not.toBeChecked(); await expect(page.getByLabel("IP", { exact: true })).not.toBeChecked();
  await expect(page.getByLabel("饮品")).toBeDisabled(); await expect(page.getByText("商业摄影无需选择所属分类")).toBeVisible();
  await page.getByLabel("品牌设计").check();
  await expect(page.getByLabel("饮品")).toBeEnabled(); await expect(page.getByLabel("饮品")).not.toBeChecked(); await expect(page.getByLabel("IP", { exact: true })).not.toBeChecked();
  await page.getByLabel("饮品").check(); await page.getByLabel("IP", { exact: true }).check(); await page.getByLabel("商业摄影").check();
  await page.getByLabel("细分品类").fill("咖啡");
  const mediaInputs = page.locator('.mediaInput input[type="file"]'); await mediaInputs.first().setInputFiles("public/media/cases/N013/cover.webp"); await mediaInputs.nth(1).setInputFiles("public/media/cases/N013/hero.webp");
  await expect(page.locator(".mediaPreview")).toHaveCount(2);
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  await page.getByRole("link", { name: "返回后台" }).click();
  let row = page.locator(".adminCaseList article").filter({ hasText: "分类验收草稿" }); await expect(row).toContainText("商业摄影 · 咖啡");
  await page.reload(); row = page.locator(".adminCaseList article").filter({ hasText: "分类验收草稿" }); await row.getByRole("link", { name: "编辑" }).click();
  await expect(page.getByLabel("商业摄影")).toBeChecked(); await expect(page.getByLabel("饮品")).toBeDisabled(); await expect(page.getByLabel("饮品")).not.toBeChecked(); await expect(page.getByLabel("IP", { exact: true })).not.toBeChecked();
  await page.getByLabel("品牌设计").check(); await expect(page.getByLabel("饮品")).toBeEnabled(); await expect(page.getByLabel("饮品")).not.toBeChecked();
  await page.locator(".adminHeader .wordmark").click(); row = page.locator(".adminCaseList article").filter({ hasText: "分类验收草稿" });
  await row.getByRole("button", { name: "草稿" }).click(); await expect(row.getByRole("button", { name: "已发布" })).toBeVisible();
  await row.getByRole("link", { name: "编辑" }).click(); await page.getByLabel("名称", { exact: true }).fill("分类验收案例 改名"); await page.getByRole("button", { name: "保存案例" }).click(); await expect(page.locator(".saveMessage")).toHaveText("保存成功"); await page.getByRole("link", { name: "返回后台" }).click();
  row = page.locator(".adminCaseList article").filter({ hasText: "分类验收案例 改名" }); await expect(row).toBeVisible();
  expect((await page.goto(casePath("分类验收案例 改名")))?.status()).toBe(200); await expect(page.getByRole("heading", { name: "分类验收案例 改名" })).toBeVisible();
  expect((await page.goto(casePath("分类验收草稿")))?.status()).toBe(404);
  await page.goto("/admin"); row = page.locator(".adminCaseList article").filter({ hasText: "分类验收案例 改名" }); await row.getByRole("button", { name: "已发布" }).click(); await expect(row.getByRole("button", { name: "草稿" })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept()); await row.getByRole("button", { name: "删除" }).click(); await expect(row).toHaveCount(0);
});
