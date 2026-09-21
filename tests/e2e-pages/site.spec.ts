import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { casePath } from "../../lib/case-route";
import type { ContentData } from "../../lib/types";

const base = "/chim-branding-portfolio";
const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;

test("public pages expose no PDF download links", async ({ page }) => {
  const errors: string[] = [];
  const badResponses: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
  for (const route of ["/", "/photo/", "/food/", "/drinks/", "/work/?id=N016"]) {
    await page.goto(`${base}${route}`);
    await expect(page.locator('a[href*="/pdf/"]')).toHaveCount(0);
    await expect(page.getByText("PDF / Download PDF", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Design Portfolio PDF", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Photography Portfolio PDF", { exact: false })).toHaveCount(0);
  }
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
});

test("Pages basePath keeps filtered close return position and direct-detail fallback", async ({ page }) => {
  const errors: string[] = [];
  const badResponses: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", (response) => { if (response.status() >= 400) badResponses.push(`${response.status()} ${response.url()}`); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/drinks/`);
  const targetCase = content.cases.find((item) => item.id === "SL005")!;
  const target = page.locator(`[data-case-id="${targetCase.id}"]`);
  await target.scrollIntoViewIfNeeded();
  const before = await target.evaluate((element) => element.getBoundingClientRect().top);
  await target.locator("a").click();
  await expect(page.getByRole("button", { name: "返回案例列表" })).toHaveCSS("opacity", "1");
  await page.locator(".mediaFlow figure").last().scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/drinks/?$`));
  await expect(target).toBeInViewport();
  const after = await target.evaluate((element) => element.getBoundingClientRect().top);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(48);
  await expect(page.locator('.categoryNav a[href$="/drinks/"]')).toHaveClass(/active/);

  const first = content.cases.find((item) => item.id === "N024")!;
  const second = content.cases.find((item) => item.id === "N025")!;
  await page.goto(`${base}/drinks/`);
  const firstCard = page.locator(`[data-case-id="${first.id}"]`);
  await firstCard.scrollIntoViewIfNeeded();
  const nextAnchor = await firstCard.evaluate((element) => element.getBoundingClientRect().top);
  await firstCard.locator("a").click();
  await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === `${base}/work` && url.searchParams.get("id") === first.id);
  await page.locator(".nextCase").click();
  await page.waitForURL((url) => url.pathname.replace(/\/$/, "") === `${base}/work` && url.searchParams.get("id") === second.id);
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await page.waitForURL(new RegExp(`${base}/drinks/?$`));
  const secondCard = page.locator(`[data-case-id="${second.id}"]`);
  await expect(secondCard).toBeInViewport();
  expect(Math.abs(await secondCard.evaluate((element) => element.getBoundingClientRect().top) - nextAnchor)).toBeLessThanOrEqual(48);

  await page.goto(`${base}${casePath(targetCase.id)}`);
  await page.evaluate(() => { sessionStorage.removeItem("chim-case-list-entry"); sessionStorage.removeItem("chim-case-list-return"); });
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/?$`));
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
});

test("runtime content retries after a fetch failure", async ({ page }) => {
  let attempts = 0;
  await page.route("**/__content-origin/data/content.json*", async (route) => {
    attempts += 1;
    if (attempts === 1) await route.fulfill({ status: 503, body: "Unavailable" });
    else await route.fulfill({ json: content });
  });
  await page.goto(`${base}/food/`);
  await expect(page.getByText("内容加载失败（HTTP 503）")).toBeVisible();
  await page.getByRole("button", { name: "重试" }).click();
  await expect(page.locator(".caseCard").first()).toBeVisible();
  expect(attempts).toBe(2);
});

test("a new case and its media appear through the generic route without rebuilding Pages", async ({ page }) => {
  const fixture = structuredClone(content);
  const source = fixture.cases.find((item) => item.id === "N013")!;
  fixture.cases.push({ ...source, id: "NEW-RUNTIME", brandName: "Runtime Fixture", projectName: "No Build", published: true });
  fixture.defaultOrder.push("NEW-RUNTIME");
  await page.route("**/__content-origin/data/content.json*", (route) => route.fulfill({ json: fixture }));
  await page.goto(`${base}/work/?id=NEW-RUNTIME`);
  await expect(page.getByRole("heading", { name: "Runtime Fixture · No Build" })).toBeVisible();
  const sourceUrl = await page.locator(".workHero img").getAttribute("src");
  expect(sourceUrl).toContain("/__content-origin/public/media/");
  expect(sourceUrl).not.toContain(`${base}/media/`);
});
