import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { casePath } from "../../lib/case-route";
import type { ContentData } from "../../lib/types";

const base = "/chim-branding-portfolio";
const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;

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
  await page.waitForURL(new RegExp(`${base}${casePath(first.name)}/?$`));
  await page.locator(".nextCase").click();
  await page.waitForURL(new RegExp(`${base}${casePath(second.name)}/?$`));
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await page.waitForURL(new RegExp(`${base}/drinks/?$`));
  const secondCard = page.locator(`[data-case-id="${second.id}"]`);
  await expect(secondCard).toBeInViewport();
  expect(Math.abs(await secondCard.evaluate((element) => element.getBoundingClientRect().top) - nextAnchor)).toBeLessThanOrEqual(48);

  await page.goto(`${base}${casePath(targetCase.name)}/`);
  await page.evaluate(() => { sessionStorage.removeItem("chim-case-list-entry"); sessionStorage.removeItem("chim-case-list-return"); });
  await page.getByRole("button", { name: "返回案例列表" }).click();
  await expect(page).toHaveURL(new RegExp(`${base}/?$`));
  expect(errors).toEqual([]);
  expect(badResponses).toEqual([]);
});
