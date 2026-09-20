import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { ContentData } from "../../lib/types";

const base = "/chim-branding-portfolio";
const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;

test("Pages admin keeps its list readable and navigates to generated editor routes", async ({ page }) => {
  const errors: string[] = [];
  let savedContent: ContentData | undefined;
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio", (route) => route.fulfill({ json: { id: 1 } }));
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/contents/data/content.json?ref=main", (route) => route.fulfill({ json: { content: Buffer.from(JSON.stringify(content)).toString("base64"), sha: "fixture-sha" } }));
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/contents/data/content.json", async (route) => {
    const payload = route.request().postDataJSON() as { content: string };
    savedContent = JSON.parse(Buffer.from(payload.content, "base64").toString("utf8")) as ContentData;
    await route.fulfill({ json: { content: { sha: "fixture-next-sha" } } });
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/admin/`);
  await expect(page.locator('link[rel~="icon"]')).toHaveAttribute("href", `${base}/favicon.svg`);
  expect((await page.request.get(`${base}/favicon.svg`)).status()).toBe(200);
  await page.getByLabel("Fine-grained personal access token").fill("fixture-token");
  await page.getByRole("button", { name: "连接 GitHub" }).click();
  await expect(page.locator(".adminCaseList article")).toHaveCount(content.cases.length);
  expect(await page.locator(".adminCaseList article").first().locator(".adminCaseName").evaluate((cell) => cell.getBoundingClientRect().width)).toBeGreaterThan(180);
  expect(await page.locator(".adminCaseList article").first().getByRole("link", { name: "编辑" }).evaluate((link) => link.getBoundingClientRect().width)).toBeLessThan(100);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.getByRole("link", { name: "新建案例" }).click();
  await expect(page).toHaveURL(`${base}/admin/cases/new/`);
  await expect(page.getByRole("heading", { name: "新建案例" })).toBeVisible();
  for (const item of [content.cases[0], content.cases[17], content.cases[34]]) {
    await page.getByRole("link", { name: "返回后台" }).click();
    await page.locator(`a[href="${base}/admin/cases/${item.id}/"]`).click();
    await expect(page).toHaveURL(new RegExp(`${base}/admin/cases/${item.id}/?$`));
    if (await page.getByLabel("Fine-grained personal access token").isVisible()) {
      await page.getByLabel("Fine-grained personal access token").fill("fixture-token");
      await page.getByRole("button", { name: "连接 GitHub" }).click();
    }
    await expect(page.getByLabel("品牌名")).toHaveValue(item.brandName);
    await expect(page.getByLabel("项目名（可选）")).toHaveValue(item.projectName);
  }
  const mediaRich = content.cases.find((item) => item.id === "N016")!;
  await page.getByRole("link", { name: "返回后台" }).click();
  await page.locator(`a[href="${base}/admin/cases/${mediaRich.id}/"]`).click();
  await expect(page).toHaveURL(new RegExp(`${base}/admin/cases/${mediaRich.id}/?$`));
  if (await page.getByLabel("Fine-grained personal access token").isVisible()) { await page.getByLabel("Fine-grained personal access token").fill("fixture-token"); await page.getByRole("button", { name: "连接 GitHub" }).click(); }
  await expect(page.locator(".bodyAssetList article")).toHaveCount(mediaRich.bodyAssets.length);
  await expect(page.locator(".bodyAssetList img")).toHaveCount(mediaRich.bodyAssets.filter((asset) => asset.type === "image").length);
  await expect(page.locator(".bodyAssetList select").first()).toHaveValue(mediaRich.bodyAssets[0].layout);
  const chapterCase = content.cases.find((item) => item.id === "SL001")!;
  await page.getByRole("link", { name: "返回后台" }).click();
  await page.locator(`a[href="${base}/admin/cases/${chapterCase.id}/"]`).click();
  await expect(page).toHaveURL(new RegExp(`${base}/admin/cases/${chapterCase.id}/?$`));
  if (await page.getByLabel("Fine-grained personal access token").isVisible()) { await page.getByLabel("Fine-grained personal access token").fill("fixture-token"); await page.getByRole("button", { name: "连接 GitHub" }).click(); }
  await expect(page.locator(".chapterHeader")).toHaveCount(4);
  await page.getByLabel("章节标题").first().fill("Pages fixture chapter");
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  expect(savedContent?.cases.find((item) => item.id === chapterCase.id)?.bodyAssets[0].section?.title).toBe("Pages fixture chapter");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.getByRole("link", { name: "返回后台" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.getByRole("link", { name: "新建案例" })).toBeVisible();
  expect(errors).toEqual([]);
});
