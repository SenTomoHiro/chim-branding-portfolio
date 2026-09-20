import { expect, test, type Page } from "@playwright/test";
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
  const imageChoice = page.locator(".bodyAssetList article").filter({ has: page.locator("img") }).first().getByRole("checkbox");
  const wasSelected = await imageChoice.isChecked();
  await imageChoice.setChecked(!wasSelected);
  await expect(page.getByRole("button", { name: "生成案例 PDF" })).toBeDisabled();
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  await page.reload();
  if (wasSelected) await expect(imageChoice).not.toBeChecked(); else await expect(imageChoice).toBeChecked();
  await imageChoice.setChecked(wasSelected);
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  const movableSelection = page.locator(".bodyAssetList .pdfInlineChoice").filter({ has: page.locator("button[aria-label$='上移']:not(:disabled)") }).first();
  const moveUp = movableSelection.getByRole("button", { name: /上移$/ });
  const moveLabel = await moveUp.getAttribute("aria-label");
  const beforePosition = Number(await movableSelection.locator("b").textContent());
  await moveUp.click();
  await expect(movableSelection.locator("b")).toHaveText(String(beforePosition - 1).padStart(2, "0"));
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  await page.reload();
  await expect(page.getByRole("button", { name: moveLabel! }).locator("xpath=..").locator("b")).toHaveText(String(beforePosition - 1).padStart(2, "0"));
  await generateAndOpen(page, "生成案例 PDF");

  await page.getByRole("link", { name: "PDF 生成" }).click();
  await expect(page.getByRole("heading", { name: "PDF 生成" })).toBeVisible();
  const managed = page.locator(".pdfCaseManagement article").filter({ hasText: "华南行" }).first();
  const membership = managed.getByRole("checkbox");
  const initiallyIncluded = await membership.isChecked();
  await membership.setChecked(!initiallyIncluded);
  await expect(page.getByRole("status")).toContainText(initiallyIncluded ? "已移出合集 PDF" : "已加入合集 PDF");
  if (initiallyIncluded) {
    await generateAndOpen(page, "生成餐饮合集");
    const categoryText = execFileSync("pdftotext", [path.join(process.cwd(), "output/pdf/portfolio-design-food.pdf"), "-"], { encoding: "utf8" });
    expect(categoryText).not.toContain("华南行");
  }
  await page.reload();
  const persistedMembership = page.locator(".pdfCaseManagement article").filter({ hasText: "华南行" }).first().getByRole("checkbox");
  if (initiallyIncluded) await expect(persistedMembership).not.toBeChecked(); else await expect(persistedMembership).toBeChecked();
  await page.locator(".pdfCaseManagement article").filter({ hasText: "华南行" }).first().getByRole("checkbox").setChecked(initiallyIncluded);
  await expect(page.getByRole("status")).toContainText(initiallyIncluded ? "已加入合集 PDF" : "已移出合集 PDF");
  await page.getByLabel("业务").selectOption("branding");
  await page.getByLabel("设计分类").selectOption("drinks");
  expect(await page.locator(".pdfCaseManagement article").count()).toBeGreaterThan(0);
  await page.getByLabel("搜索").fill("华南行");
  await expect(page.locator(".pdfCaseManagement article")).toHaveCount(0);
  await page.getByLabel("设计分类").selectOption("all");
  await expect(page.locator(".pdfCaseManagement article")).toHaveCount(1);
  await generateAndOpen(page, "生成案例 PDF");
  await page.getByLabel("搜索").fill("");
  await generateAndOpen(page, "生成 Design Portfolio");
  await generateAndOpen(page, "生成 Photography Portfolio");
});
