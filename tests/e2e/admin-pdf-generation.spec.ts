import { expect, test, type Page } from "@playwright/test";

test.setTimeout(600_000);

async function generateAndOpen(page: Page, buttonName: string) {
  await page.getByRole("button", { name: buttonName }).click();
  await expect(page.locator(".pdfGeneration [role='status']")).toHaveText("生成成功", { timeout: 180_000 });
  const open = page.getByRole("link", { name: "打开 PDF" });
  const href = await open.getAttribute("href");
  expect(href).toBeTruthy();
  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toBe("application/pdf");
  expect((await response.body()).byteLength).toBeGreaterThan(10_000);
  const [popup] = await Promise.all([page.waitForEvent("popup"), open.click()]);
  await popup.close();
}

test("local Admin generates and opens single-case and portfolio PDFs", async ({ page }) => {
  test.setTimeout(600_000);
  await page.goto("/admin");
  await page.getByLabel("管理员密码").fill("e2e-password");
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByRole("heading", { name: "案例管理" })).toBeVisible();

  const caseRow = page.locator(".adminCaseList article").filter({ hasText: "华南行" });
  await caseRow.getByRole("link", { name: "编辑" }).click();
  await generateAndOpen(page, "生成当前案例 PDF");

  await page.getByRole("link", { name: "返回后台" }).click();
  await generateAndOpen(page, "生成 Design Portfolio");
  await generateAndOpen(page, "生成 Photography Portfolio");
});
