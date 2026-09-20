import { expect, test, type Browser, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { casePath } from "../../lib/case-route";
import type { ContentData, PortfolioCase } from "../../lib/types";

const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const byId = (id: string) => content.cases.find((item) => item.id === id)!;
const longTitle = byId("SL001");
const shortTitle = byId("N003");
const mixedTitle = byId("N005");
const first = byId("N024");
const second = byId("N025");
const third = byId("N013");
test.setTimeout(180_000);

async function titleMetrics(page: Page, item: PortfolioCase, viewport: { width: number; height: number }) {
  await page.setViewportSize(viewport);
  await page.goto(casePath(item.name));
  const metrics = await page.locator(".workIntro h1").evaluate((element) => {
    const style = getComputedStyle(element);
    const fontSize = Number.parseFloat(style.fontSize);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const node = element.firstChild;
    const tops: number[] = [];
    if (node?.nodeType === Node.TEXT_NODE) {
      for (let index = 0; index < (node.textContent?.length || 0); index += 1) {
        if (!node.textContent?.[index].trim()) continue;
        const range = document.createRange();
        range.setStart(node, index); range.setEnd(node, index + 1);
        const top = range.getBoundingClientRect().top;
        if (!tops.some((value) => Math.abs(value - top) < 1)) tops.push(top);
      }
    }
    tops.sort((left, right) => left - right);
    const box = element.getBoundingClientRect();
    return {
      fontSize, lineHeight, lines: tops.length,
      minimumLineStep: tops.length > 1 ? Math.min(...tops.slice(1).map((top, index) => top - tops[index])) : lineHeight,
      clipped: (style.overflowX !== "visible" && element.scrollWidth > element.clientWidth + 1)
        || (style.overflowY !== "visible" && element.scrollHeight > element.clientHeight + 1),
      outsideViewport: box.left < -1 || box.right > innerWidth + 1,
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(metrics.clipped, `${item.name} at ${viewport.width}`).toBe(false);
  expect(metrics.outsideViewport, `${item.name} at ${viewport.width}`).toBe(false);
  expect(metrics.overflow, `${item.name} at ${viewport.width}`).toBe(false);
  expect(metrics.minimumLineStep, `${item.name} at ${viewport.width}`).toBeGreaterThanOrEqual(metrics.fontSize * (viewport.width < 768 ? 0.95 : 0.84));
  if (item.id === longTitle.id && viewport.width < 768) expect(metrics.lines).toBeGreaterThanOrEqual(2);
}

test("detail titles keep readable line boxes at 390, 430 and desktop widths", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }, { width: 1440, height: 900 }]) {
    for (const item of [longTitle, shortTitle, mixedTitle]) await titleMetrics(page, item, viewport);
  }
});

async function openFromDrinks(page: Page, item: PortfolioCase) {
  await page.goto("/drinks");
  const card = page.locator(`[data-case-id="${item.id}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -Math.min(120, innerHeight / 6)));
  const anchorTop = await card.evaluate((element) => element.getBoundingClientRect().top);
  await card.locator("a").click();
  await page.waitForURL(casePath(item.name));
  return anchorTop;
}

async function followNext(page: Page, item: PortfolioCase) {
  await page.locator(".nextCase").click();
  await page.waitForURL(casePath(item.name));
  await expect(page.getByRole("heading", { name: item.name, exact: true })).toBeVisible();
}

async function closeToCase(page: Page, route: string, item: PortfolioCase, anchorTop: number) {
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await page.waitForURL(new RegExp(`${route.replace("/", "\\/")}$`));
  const card = page.locator(`[data-case-id="${item.id}"]`);
  await expect(card).toBeInViewport();
  const top = await card.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(top - anchorTop)).toBeLessThanOrEqual(48);
}

test("Next Case updates the close anchor for A to B and A to B to C", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  let anchorTop = await openFromDrinks(page, first);
  await followNext(page, second);
  await closeToCase(page, "/drinks", second, anchorTop);

  anchorTop = await openFromDrinks(page, first);
  await followNext(page, second);
  await followNext(page, third);
  await closeToCase(page, "/food", third, anchorTop);
  await expect(page.locator(`[data-case-id="${first.id}"]`)).toHaveCount(0);
});

test("browser Back traverses Next Case history once and then restores the list", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const anchorTop = await openFromDrinks(page, first);
  await followNext(page, second);
  await page.goBack();
  await page.waitForURL(casePath(first.name));
  await page.goBack();
  await page.waitForURL(/\/drinks$/);
  const card = page.locator(`[data-case-id="${first.id}"]`);
  await expect(card).toBeInViewport();
  expect(Math.abs(await card.evaluate((element) => element.getBoundingClientRect().top) - anchorTop)).toBeLessThanOrEqual(48);
});

async function mobilePage(browser: Browser) {
  const context = await browser.newContext({ baseURL: "http://localhost:3100", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  return { context, page: await context.newPage() };
}

test("mobile quick tap enters once, follows Next and closes to the current case", async ({ browser }) => {
  const { context, page } = await mobilePage(browser);
  await page.goto("/drinks");
  const card = page.locator(`[data-case-id="${first.id}"]`);
  await card.scrollIntoViewIfNeeded();
  const anchorTop = await card.evaluate((element) => element.getBoundingClientRect().top);
  await card.locator("a").tap();
  await page.waitForURL(casePath(first.name));
  await expect(page.locator(`[data-case-id="${first.id}"]`)).toHaveCount(0);
  await followNext(page, second);
  await closeToCase(page, "/drinks", second, anchorTop);
  await context.close();
});

test("mobile longer tap enters while a drag gesture stays on the list", async ({ browser }) => {
  const { context, page } = await mobilePage(browser);
  const session = await context.newCDPSession(page);
  await page.goto("/drinks");
  const link = page.locator(`[data-case-id="${first.id}"] a`);
  await link.scrollIntoViewIfNeeded();
  let box = (await link.boundingBox())!;
  let x = box.x + box.width / 2; let y = box.y + Math.min(box.height / 2, 160);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await page.waitForTimeout(360);
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForURL(casePath(first.name));

  await page.goto("/drinks");
  await link.scrollIntoViewIfNeeded();
  box = (await link.boundingBox())!; x = box.x + box.width / 2; y = box.y + Math.min(box.height / 2, 220);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - 130 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/drinks$/);
  await context.close();
});

test("desktop hover still previews Hero and one click enters detail", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/drinks");
  const card = page.locator(`[data-case-id="${first.id}"]`);
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await expect(card.locator(".secondaryMedia")).toHaveCount(1);
  await expect(card.locator(".secondaryMedia")).toHaveClass(/isActive/);
  await card.locator("a").click();
  await page.waitForURL(casePath(first.name));
});
