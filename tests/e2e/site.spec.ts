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
    await expect(page.locator(".casePreview")).toHaveCount(expected.length);
    expect(await page.locator(".casePreview").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-case-id")))).toEqual(expectedIds);
    await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  }
  expect((await page.goto("/premium"))?.status()).toBe(404);
  const overlapping = brandingPublished.find((item) => item.categories.includes("food") && item.categories.includes("ip"))!;
  for (const route of ["/food", "/ip"]) { await page.goto(route); await expect(page.locator(`[data-case-id="${overlapping.id}"]`)).toHaveCount(1); }
});

test("editorial feed preserves covers, titles, metadata and continuous reading", async ({ page }) => {
  await page.goto("/");
  const cards = page.locator(".casePreview");
  await expect(cards).toHaveCount(brandingPublished.length);
  for (let i = 0; i < 6; i++) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await expect(card.locator(".previewTitle")).toBeVisible();
    await expect(card.locator(".previewMeta")).toContainText("品牌设计");
    await expect(card.locator(".previewCover img")).toBeVisible();
    expect(await card.locator(".previewCover").evaluate(e => e.getBoundingClientRect().height)).toBeLessThan(1000);
  }
});

test("all published case routes resolve with taxonomy metadata and reveal media", async ({ page }) => {
  for (const item of published) {
    const response = await page.goto(casePath(item.id));
    expect(response?.status(), item.id).toBe(200);
    await expect(page.getByRole("heading", { name: caseFullTitle(item) })).toBeVisible();
    const taxonomy = item.business === "photography" ? "商业摄影" : item.categories.map((category) => ({ food: "餐饮", drinks: "饮品", ip: "IP", other: "其他" })[category]).join(" / ");
    await expect(page.locator(".detailMeta")).toHaveText(`${taxonomy} · ${item.primaryIndustry}`);
    await expect(page.locator(".detailHero img")).toHaveJSProperty("complete", true);
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

test("mobile, tablet and desktop layouts have no overflow and use continuous feed", async ({ page }) => {
  const viewports = [{ width: 375, height: 812 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 820, height: 1180 }, { width: 1024, height: 1366 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/food", "/drinks", "/ip", "/other", "/photo", casePath(brandingPublished[0].id), casePath(photographyPublished[0].id), "/admin"]) {
      await page.goto(route); await expectNoHorizontalOverflow(page);
    }
    await page.goto("/");
    const cards = page.locator(".casePreview");
    await expect(cards).toHaveCount(brandingPublished.length);
    const columnCount = await cards.evaluateAll((elements) => new Set(elements.slice(0, 8).map((card) => Math.round(card.getBoundingClientRect().left))).size);
    expect(columnCount).toBe(1);
  }
});

test("list controls return to top without changing category or history", async ({ page }) => {
  for (const viewport of [{width:390,height:844},{width:430,height:932},{width:820,height:1180},{width:1440,height:900}]) {
    await page.setViewportSize(viewport);
    for (const route of ["/", "/food", "/drinks", "/ip", "/other", "/photo"]) {
      await page.goto(route);
      await expect(page.locator(".casePreview").first()).toBeVisible();
      await expect(page.getByRole("button", {name:"返回顶部"})).toBeVisible();
      const url = page.url(), length = await page.evaluate(() => history.length);
      await page.evaluate(() => window.scrollTo({top:innerHeight * 2,behavior:"instant"}));
      const button = page.getByRole("button", {name:"返回顶部"});
      await expect(button).toBeVisible();
      const pill = await page.locator(".categoryPill").boundingBox();
      const box = (await button.boundingBox())!;
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width - 16);
      expect(pill!.y + pill!.height).toBe(box.y + box.height);
      expect(pill!.x + pill!.width).toBeLessThan(box.x);
      expect(pill!.height).toBe(box.height);
      await button.click();
      await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      expect(page.url()).toBe(url); expect(await page.evaluate(() => history.length)).toBe(length);
    }
  }
});

test("detail titles and floating controls remain usable across viewports", async ({ page }) => {
  const longTitle = published.find((item) => item.id === "SL005")!;
  const shortTitle = published.find((item) => caseFullTitle(item).length <= 6)!;
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 430, height: 932 }]) {
    await page.setViewportSize(viewport);
    await page.goto(casePath(longTitle.id));
    const titleMetrics = await page.locator(".detailIntro h1").evaluate((title) => {
      const style = getComputedStyle(title);
      const box = title.getBoundingClientRect();
      const range = document.createRange(); range.selectNodeContents(title);
      const lines = [...range.getClientRects()];
      return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), lineCount: lines.length, height: box.height };
    });
    expect(titleMetrics.lineHeight).toBeCloseTo(titleMetrics.fontSize * 1.2, 1);
    expect(titleMetrics.lineCount).toBeGreaterThan(1);
    expect(titleMetrics.height).toBeGreaterThan(titleMetrics.lineHeight);

    const backToTop = page.getByRole("button", { name: "返回顶部" });
    await page.evaluate(() => window.scrollTo({top:innerHeight * 2,behavior:"instant"}));
    await expect(backToTop).toBeVisible();
    await expect(backToTop.locator(".chevronUp")).toHaveCount(1);
    const controlLayout = await backToTop.evaluate((button) => {
      const style = getComputedStyle(button.closest(".floatingControlsGroup")!); const box = button.getBoundingClientRect();
      return { position: style.position, zIndex: style.zIndex, width: box.width, height: box.height, right: innerWidth - box.right, bottom: innerHeight - box.bottom };
    });
    expect(controlLayout).toMatchObject({ position: "fixed", zIndex: "10", width: 44, height: 44 });
    expect(controlLayout.right).toBeGreaterThanOrEqual(16);
    expect(controlLayout.bottom).toBeGreaterThanOrEqual(16);
    await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
    await expect.poll(() => backToTop.evaluate((button) => {
      const box = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2));
    })).toBe(true);
    const beforeUrl = page.url(); const historyLength = await page.evaluate(() => history.length);
    await backToTop.click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThanOrEqual(1);
    expect(page.url()).toBe(beforeUrl);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
    await expectNoHorizontalOverflow(page);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(casePath(shortTitle.id));
  const singleTitleMetrics = await page.locator(".detailIntro h1").evaluate((title) => {
    const style = getComputedStyle(title); const box = title.getBoundingClientRect();
    return { fontSize: Number.parseFloat(style.fontSize), lineHeight: Number.parseFloat(style.lineHeight), height: box.height };
  });
  expect(singleTitleMetrics.lineHeight).toBeCloseTo(singleTitleMetrics.fontSize * 1.2, 1);
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
  await page.evaluate(() => window.scrollBy({top:-Math.min(120, innerHeight / 6),behavior:"instant"}));
  const before = await card.evaluate((element) => element.getBoundingClientRect().top);
  await card.locator(".previewCover img").click();
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
  await expect(page.locator(".categoryPill")).toContainText("饮品");
});

test("mobile close restores the origin card without overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expectCaseReturnPosition(page, "/", "SL005");
});

test("browser Back restores the source list and origin card", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/food");
  const target = page.locator(".casePreview").nth(7);
  const caseId = await target.getAttribute("data-case-id");
  await target.scrollIntoViewIfNeeded();
  const before = await target.evaluate((element) => element.getBoundingClientRect().top);
  await target.locator(".previewCover img").click();
  await expect(page.getByRole("button", { name: "返回案例列表" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/food$/);
  const restored = page.locator(`[data-case-id="${caseId}"]`);
  await expect(restored).toBeInViewport();
  const after = await restored.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(48);
});

test("home keeps its wordmark; details keep category controls and stable id URLs", async ({ page }) => {
  const named = published.find((item) => /[\u3400-\u9fff]/u.test(caseFullTitle(item)) && caseFullTitle(item).includes(" "))!;
  for (const route of ["/", casePath(named.id)]) {
    expect((await page.goto(route))?.status()).toBe(200);
    await expect(page.locator(".brandMark")).toHaveCount(route === "/" ? 1 : 0);
    await expect(page.locator(".categoryPill")).toBeVisible();
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
