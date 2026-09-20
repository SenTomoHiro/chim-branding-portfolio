import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

test.setTimeout(600_000);

async function generateAndOpen(page: Page, buttonName: string) {
  const action = page.getByRole("button", { name: buttonName }).locator("xpath=..");
  await action.getByRole("button", { name: buttonName }).click();
  await expect(action.getByRole("status")).toHaveText("生成成功", { timeout: 180_000 });
  const open = action.getByRole("link", { name: "打开 PDF" });
  const href = await open.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  const [popup] = await Promise.all([page.waitForEvent("popup"), open.click()]);
  await popup.close();
}

async function imageSources(locator: Locator) {
  return locator.evaluateAll((images) => images.map((image) => {
    const url = new URL((image as HTMLImageElement).currentSrc || (image as HTMLImageElement).src);
    return url.searchParams.get("url") || url.pathname;
  }));
}

test("local PDF management handles membership, filters, inline selection and every output type", async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("e2e-password");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();

  await expect(page.getByText("本地 PDF 生成")).toHaveCount(0);
  const caseRow = page.locator(".adminCaseList article").filter({ hasText: "华南行" }).first();
  await caseRow.getByRole("link", { name: "编辑" }).click();
  await expect(page.getByRole("heading", { name: "PDF 案例集" })).toHaveCount(0);
  await expect(page.getByText("本地 PDF 生成")).toHaveCount(0);
  await expect(page.getByLabel("加入合集 PDF")).toBeVisible();
  await expect(page.locator(".pdfInlineChoice b, .pdfInlineChoice button")).toHaveCount(0);
  const bodyRows = page.locator(".bodyAssetList article");
  const firstPath = (await bodyRows.nth(0).locator("> div:nth-child(2) span").textContent())!;
  const secondPath = (await bodyRows.nth(1).locator("> div:nth-child(2) span").textContent())!;
  await expect(bodyRows.nth(0).getByRole("checkbox")).toBeChecked();
  await expect(bodyRows.nth(1).getByRole("checkbox")).toBeChecked();
  await bodyRows.nth(0).getByRole("button", { name: "↓", exact: true }).click();
  await expect(page.getByRole("button", { name: "生成案例 PDF" })).toBeDisabled();
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  await page.reload();
  await expect(bodyRows.nth(0).locator("> div:nth-child(2) span")).toHaveText(secondPath!);
  await expect(bodyRows.nth(1).locator("> div:nth-child(2) span")).toHaveText(firstPath!);

  await page.goto("/work/l002");
  expect((await imageSources(page.locator(".mediaFlow figure img"))).slice(0, 2)).toEqual([secondPath, firstPath]);
  await page.goto("/print/case/l002");
  expect((await imageSources(page.locator(".pdfLongWaterfall img"))).slice(0, 2)).toEqual([secondPath, firstPath]);
  await page.goto("/admin/cases/L002");
  await generateAndOpen(page, "生成案例 PDF");

  for (const route of ["/print/portfolio/design", "/print/portfolio/design-food"]) {
    await page.goto(route);
    const portfolioCase = page.locator(".pdfPortfolioLongCase").filter({ hasText: "华南行" });
    const sources = await imageSources(portfolioCase.locator(".pdfPicture"));
    expect(sources.slice(1, 3)).toEqual([secondPath, firstPath]);
  }
  await page.goto("/admin/pdf");
  await generateAndOpen(page, "生成 Design Portfolio");
  await generateAndOpen(page, "生成餐饮合集");

  await page.goto("/admin/cases/L002");
  const excludedPath = (await bodyRows.nth(1).locator("> div:nth-child(2) span").textContent())!;
  await bodyRows.nth(1).getByRole("checkbox").uncheck();
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  await page.goto("/work/l002");
  expect(await imageSources(page.locator(".mediaFlow figure img"))).toContain(excludedPath);
  await page.goto("/print/case/l002");
  expect(await imageSources(page.locator(".pdfLongWaterfall img"))).toContain(excludedPath);
  for (const route of ["/print/portfolio/design", "/print/portfolio/design-food"]) {
    await page.goto(route);
    const sources = await imageSources(page.locator(".pdfPortfolioLongCase").filter({ hasText: "华南行" }).locator(".pdfPicture"));
    expect(sources).not.toContain(excludedPath);
    expect(sources[1]).toBe(secondPath);
  }

  await page.goto("/admin/pdf");
  await generateAndOpen(page, "生成 Design Portfolio");
  await generateAndOpen(page, "生成餐饮合集");
  await expect(page.getByRole("heading", { name: "PDF 生成" })).toBeVisible();
  const managed = page.locator(".pdfCaseManagement article").filter({ hasText: "华南行" }).first();
  const membership = managed.getByRole("checkbox");
  const initiallyIncluded = await membership.isChecked();
  await membership.setChecked(!initiallyIncluded);
  await expect(page.getByText(initiallyIncluded ? "华南行：已移出合集 PDF" : "华南行：已加入合集 PDF")).toBeVisible();
  if (initiallyIncluded) {
    await generateAndOpen(page, "生成餐饮合集");
    const categoryText = execFileSync("pdftotext", [path.join(process.cwd(), "output/pdf/portfolio-design-food.pdf"), "-"], { encoding: "utf8" });
    expect(categoryText).not.toContain("华南行");
  }
  await page.reload();
  const persistedMembership = page.locator(".pdfCaseManagement article").filter({ hasText: "华南行" }).first().getByRole("checkbox");
  if (initiallyIncluded) await expect(persistedMembership).not.toBeChecked(); else await expect(persistedMembership).toBeChecked();
  await page.locator(".pdfCaseManagement article").filter({ hasText: "华南行" }).first().getByRole("checkbox").setChecked(initiallyIncluded);
  await expect(page.getByText(initiallyIncluded ? "华南行：已加入合集 PDF" : "华南行：已移出合集 PDF")).toBeVisible();
  await page.getByLabel("业务").selectOption("branding");
  await page.getByLabel("设计分类").selectOption("drinks");
  expect(await page.locator(".pdfCaseManagement article").count()).toBeGreaterThan(0);
  await page.getByLabel("搜索").fill("华南行");
  await expect(page.locator(".pdfCaseManagement article")).toHaveCount(0);
  await page.getByLabel("设计分类").selectOption("all");
  await expect(page.locator(".pdfCaseManagement article")).toHaveCount(1);
  await generateAndOpen(page, "生成案例 PDF");
  await page.getByLabel("搜索").fill("");
  await generateAndOpen(page, "生成 Photography Portfolio");
});
