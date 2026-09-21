import { expect, test, type Page } from "@playwright/test";
import { casePath } from "../../lib/case-route";
import { caseFullTitle } from "../../lib/case-title";
import { fetchOfficialContent } from "../helpers/official-content";

const content = await fetchOfficialContent();
const ids = ["N021", "N022", "N023", "L012", "N024", "N025"];
const additions = ids.map((id) => content.cases.find((item) => item.id === id)!);
test.setTimeout(180_000);

async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
}

test("all six completed cases render their selected media and Chapters on desktop and mobile", async ({ page }) => {
  const requestErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on("requestfailed", (request) => { if (!request.failure()?.errorText.includes("ERR_ABORTED")) requestErrors.push(`${request.method()} ${request.url()}`); });
  page.on("response", (response) => { if (response.status() >= 400) requestErrors.push(`${response.status()} ${response.url()}`); });
  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    for (const item of additions) {
      expect((await page.goto(casePath(item.id), { waitUntil: "networkidle" }))?.status(), caseFullTitle(item)).toBe(200);
      await expect(page.getByRole("heading", { name: caseFullTitle(item), exact: true })).toBeVisible();
      await expect(page.locator(".mediaFlow figure")).toHaveCount(item.media.length - 2);
      await expect(page.locator(".mediaSectionHeading h2")).toHaveText(item.media.filter((asset) => asset.section).map((asset) => asset.section!.title));
      await page.locator(".nextCase").scrollIntoViewIfNeeded();
      await expectNoOverflow(page);
    }
  }
  expect(requestErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

async function expectReturn(page: Page, viewport: { width: number; height: number }, caseId: string) {
  await page.setViewportSize(viewport);
  await page.goto("/drinks");
  const card = page.locator(`[data-case-id="${caseId}"]`);
  await card.scrollIntoViewIfNeeded();
  await page.evaluate(() => window.scrollBy(0, -Math.min(120, innerHeight / 6)));
  const before = await card.evaluate((element) => element.getBoundingClientRect().top);
  await card.locator("a").click();
  await expect(page.getByRole("button", { name: "返回案例列表" })).toHaveCSS("opacity", "1");
  await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await expect(page).toHaveURL(/\/drinks$/);
  await expect(page.locator('.categoryNav a[href="/drinks"]')).toHaveClass(/active/);
  await expect(card).toBeInViewport();
  const after = await card.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(48);
  await expectNoOverflow(page);
}

test("new long Chapter cases preserve filtered close-return position on desktop and mobile", async ({ page }) => {
  await expectReturn(page, { width: 1440, height: 900 }, "N024");
  await expectReturn(page, { width: 390, height: 844 }, "N025");
});
