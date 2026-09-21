import { expect, test, type Page } from "@playwright/test";
import { casePath } from "../../lib/case-route";
import { caseFullTitle } from "../../lib/case-title";
import type { CaseCategory } from "../../lib/types";
import { fetchOfficialContent } from "../helpers/official-content";

const content = await fetchOfficialContent();
const published = content.cases.filter((item) => item.published);
const brandingPublished = published.filter((item) => item.business === "branding");
const photographyPublished = published.filter((item) => item.business === "photography");
const categories: CaseCategory[] = ["food", "drinks", "ip", "other"];
test.setTimeout(180_000);

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
}

async function waitForHeaderAnimations(page: Page) {
  await page.locator(".siteHeader").evaluate(async (element) => {
    await Promise.race([
      Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined))),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
  });
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
  const cards = page.locator(".caseCard");
  await expect(cards).toHaveCount(brandingPublished.length);
  const boxes = await cards.evaluateAll((elements) => elements.map((card) => { const box = card.getBoundingClientRect(); const image = card.querySelector("img")!.getBoundingClientRect(); return { left: box.left, top: box.top, bottom: box.bottom, width: box.width, imageRatio: image.height / image.width }; }));
  expect(new Set(boxes.map((box) => Math.round(box.width))).size).toBe(1);
  expect(new Set(boxes.slice(0, 3).map((box) => Math.round(box.left))).size).toBe(3);
  expect(new Set(boxes.slice(0, 8).map((box) => box.imageRatio.toFixed(2))).size).toBeGreaterThan(3);
  const gridBottomGap = await page.locator(".masonryGrid").evaluate((grid) => { const cards = [...grid.querySelectorAll<HTMLElement>(".caseCard")].map((card) => card.offsetTop + card.offsetHeight); return (grid as HTMLElement).offsetHeight - Math.max(...cards); });
  expect(Math.abs(gridBottomGap)).toBeLessThanOrEqual(1);
  for (const left of [...new Set(boxes.map((box) => Math.round(box.left)))]) { const column = boxes.filter((box) => Math.round(box.left) === left).sort((a, b) => a.top - b.top); for (let index = 1; index < column.length; index += 1) expect(column[index].top - column[index - 1].bottom).toBeGreaterThanOrEqual(17); }
  for (let index = 0; index < 6; index += 1) { await cards.nth(index).hover(); await expect(cards.nth(index).locator(".secondaryMedia")).toHaveCount(1); }
  await cards.nth(8).scrollIntoViewIfNeeded(); await expect(cards.nth(8)).toHaveClass(/isVisible/);
});

test("all published case routes resolve with taxonomy metadata and reveal media", async ({ page }) => {
  for (const item of published) {
    const response = await page.goto(casePath(item.id));
    expect(response?.status(), item.id).toBe(200);
    await expect(page.getByRole("heading", { name: caseFullTitle(item) })).toBeVisible();
    const taxonomy = item.business === "photography" ? "商业摄影" : item.categories.map((category) => ({ food: "餐饮", drinks: "饮品", ip: "IP", other: "其他" })[category]).join(" / ");
    await expect(page.locator(".workIntro div>p")).toHaveText(`${taxonomy} · ${item.primaryIndustry}`);
    await expect(page.locator(".workHero img")).toHaveJSProperty("complete", true);
    await expect(page.locator(".mediaFlow figure")).toHaveCount(item.media.length - 2);
    const order = item.business === "photography" ? content.photographyCaseOrder : content.defaultOrder;
    const sameBusiness = published.filter((entry) => entry.business === item.business);
    const ordered = order.map((id) => sameBusiness.find((entry) => entry.id === id)).filter(Boolean);
    const next = ordered[(ordered.findIndex((entry) => entry!.id === item.id) + 1) % ordered.length]!;
    const nextHref = await page.locator(".nextCase").getAttribute("href");
    expect(new URL(nextHref!, page.url()).pathname).toBe("/work");
    expect(new URL(nextHref!, page.url()).searchParams.get("id")).toBe(next.id);
  }
});

test("mobile, tablet and desktop layouts have no overflow and use responsive masonry", async ({ page }) => {
  const viewports = [{ width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 1366 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/food", "/drinks", "/ip", "/other", "/photo", casePath(brandingPublished[0].id), casePath(photographyPublished[0].id), "/admin"]) {
      await page.goto(route); await expectNoHorizontalOverflow(page);
    }
    await page.goto("/");
    const cards = page.locator(".caseCard");
    await expect(cards).toHaveCount(brandingPublished.length);
    const columnCount = await cards.evaluateAll((elements) => new Set(elements.slice(0, 8).map((card) => Math.round(card.getBoundingClientRect().left))).size);
    expect(columnCount).toBe(viewport.width < 768 ? 1 : viewport.width < 1200 ? 2 : 3);
  }
});

test("case lists keep the shared sticky header and Back To Top without changing filters or history", async ({ page }) => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/drinks");
    await expect(page.locator(".caseCard").first()).toBeVisible();
    await waitForHeaderAnimations(page);
    const beforeUrl = page.url();
    const historyLength = await page.evaluate(() => history.length);
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const header = await page.locator(".siteHeader").evaluate((element) => ({ position: getComputedStyle(element).position, top: element.getBoundingClientRect().top, zIndex: getComputedStyle(element).zIndex }));
    expect(header.position).toBe("sticky");
    expect(Math.abs(header.top)).toBeLessThanOrEqual(1);
    expect(header.zIndex).toBe("20");

    const backToTop = page.getByRole("button", { name: "返回顶部" });
    await expect(backToTop).toBeVisible();
    const control = await backToTop.evaluate((button) => {
      const chevron = button.querySelector<HTMLElement>(".chevronUp")!;
      const style = getComputedStyle(button); const iconStyle = getComputedStyle(chevron); const box = button.getBoundingClientRect();
      return { position: style.position, zIndex: style.zIndex, width: box.width, height: box.height, text: button.textContent, borderTop: iconStyle.borderTopWidth, borderLeft: iconStyle.borderLeftWidth };
    });
    expect(control).toMatchObject({ position: "fixed", zIndex: "30", width: 44, height: 44, text: "", borderTop: "1px", borderLeft: "1px" });
    await backToTop.click(); await backToTop.click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
    expect(page.url()).toBe(beforeUrl);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await expect(page.locator('.categoryNav a[href="/drinks"]')).toHaveClass(/active/);
    await expectNoHorizontalOverflow(page);
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
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [route, expectedBusiness, indexTitle] of [["/food", "branding", "Food Branding"], ["/photo", "photography", "Photography Works"]] as const) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: indexTitle })).toBeVisible({ timeout: 15_000 });
    const expectedFirstId = expectedBusiness === "photography" ? content.photographyCaseOrder[0] : content.defaultOrder.find((id) => content.cases.find((item) => item.id === id)?.categories.includes("food"))!;
    await expect(page.locator(".caseCard").first()).toHaveAttribute("data-case-id", expectedFirstId, { timeout: 15_000 });
    await waitForHeaderAnimations(page);
    const listHeaderHeight = await page.locator(".siteHeader").evaluate((header) => header.getBoundingClientRect().height);
    const card = page.locator(".caseCard a").first(); const href = await card.getAttribute("href"); const target = new URL(href!, page.url()); await card.click();
    await page.waitForURL((url) => url.pathname === target.pathname && url.searchParams.get("id") === target.searchParams.get("id"));
    await expect(page.locator(".detailHeader")).toBeVisible();
    await waitForHeaderAnimations(page);
    expect(new URL(page.url()).pathname).toBe(target.pathname);
    expect(new URL(page.url()).searchParams.get("id")).toBe(target.searchParams.get("id"));
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
    await expect(page.getByRole("heading", { name: indexTitle })).toBeVisible({ timeout: 15_000 });
    await waitForHeaderAnimations(page);
  }
});

test("detail titles and floating controls remain usable across viewports", async ({ page }) => {
  const longTitle = published.find((item) => item.id === "SL005")!;
  const shortTitle = published.find((item) => caseFullTitle(item).length <= 6)!;
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto(casePath(longTitle.id));
    const titleMetrics = await page.locator(".workIntro h1").evaluate((title) => {
      const style = getComputedStyle(title);
      const box = title.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(title);
      const lines = [...range.getClientRects()];
      return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), lineCount: lines.length, height: box.height };
    });
    expect(titleMetrics.lineHeight).toBeCloseTo(titleMetrics.fontSize * 1.1, 1);
    expect(titleMetrics.lineCount).toBeGreaterThan(1);
    expect(titleMetrics.height).toBeGreaterThan(titleMetrics.lineHeight);

    const backToTop = page.getByRole("button", { name: "返回顶部" });
    await expect(backToTop).toBeVisible();
    await expect(backToTop.locator(".chevronUp")).toHaveCount(1);
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
  await page.goto(casePath(shortTitle.id));
  const singleTitleMetrics = await page.locator(".workIntro h1").evaluate((title) => {
    const style = getComputedStyle(title); const box = title.getBoundingClientRect();
    return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), height: box.height };
  });
  expect(singleTitleMetrics.lineHeight).toBeCloseTo(singleTitleMetrics.fontSize * 1.1, 1);
  expect(singleTitleMetrics.height).toBeCloseTo(singleTitleMetrics.lineHeight, 0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "返回顶部" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
});

test("direct detail URLs close to their business fallback", async ({ page }) => {
  for (const [item, route] of [[brandingPublished[0], "/"], [photographyPublished[0], "/photo"]] as const) {
    await page.goto(casePath(item.id));
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

test("home and details share the SiteHeader structure and stable id URLs", async ({ page }) => {
  const named = published.find((item) => /[\u3400-\u9fff]/u.test(caseFullTitle(item)) && caseFullTitle(item).includes(" "))!;
  for (const route of ["/", casePath(named.id)]) {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator(".siteHeader > .headerActions > .siteNavigation")).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
  }
  await expect(page.getByRole("heading", { name: caseFullTitle(named) })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/work");
  expect(new URL(page.url()).searchParams.get("id")).toBe(named.id);
});

test("sitemap publishes fixed runtime list routes without build-time case URLs", async ({ request }) => {
  const response = await request.get("/sitemap.xml"); const xml = await response.text();
  expect(response.ok()).toBe(true);
  expect(xml).toContain("/food");
  expect(xml).toContain("/photo");
  expect(xml).not.toContain("/work/");
});
