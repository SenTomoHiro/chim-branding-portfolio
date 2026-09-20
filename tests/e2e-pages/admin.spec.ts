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
  await expect(page.getByRole("link", { name: /CHIM.*Admin/ })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "后台导航" }).getByRole("link", { name: "案例管理" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "后台导航" }).getByRole("link", { name: "PDF 生成" })).toBeVisible();
  await expect(page.getByRole("link", { name: "查看网站" })).toBeVisible();
  await expect(page.getByRole("button", { name: "退出" })).toBeVisible();
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
  await expect(page.locator(".bodyAssetList article")).toHaveCount(mediaRich.media.length);
  await expect(page.locator(".bodyAssetList img")).toHaveCount(mediaRich.media.filter((asset) => asset.type === "image").length);
  await expect(page.locator(".bodyAssetList select").first()).toHaveValue(mediaRich.media[0].layout);
  const chapterCase = content.cases.find((item) => item.id === "SL001")!;
  await page.getByRole("link", { name: "返回后台" }).click();
  await page.locator(`a[href="${base}/admin/cases/${chapterCase.id}/"]`).click();
  await expect(page).toHaveURL(new RegExp(`${base}/admin/cases/${chapterCase.id}/?$`));
  if (await page.getByLabel("Fine-grained personal access token").isVisible()) { await page.getByLabel("Fine-grained personal access token").fill("fixture-token"); await page.getByRole("button", { name: "连接 GitHub" }).click(); }
  await expect(page.locator(".chapterHeader")).toHaveCount(4);
  await page.getByLabel("章节标题").first().fill("Pages fixture chapter");
  await page.getByRole("button", { name: "保存案例" }).click();
  await expect(page.locator(".saveMessage")).toHaveText("保存成功");
  expect(savedContent?.cases.find((item) => item.id === chapterCase.id)?.media.find((asset) => asset.section)?.section?.title).toBe("Pages fixture chapter");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await page.getByRole("link", { name: "返回后台" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  await expect(page.getByRole("link", { name: "新建案例" })).toBeVisible();
  const removed = content.cases.at(-1)!;
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(".adminCaseList article").filter({ hasText: removed.brandName }).getByRole("button", { name: "删除" }).click();
  await expect(page.locator(".adminCaseList article")).toHaveCount(content.cases.length - 1);
  expect(savedContent?.cases.some((item) => item.id === removed.id)).toBe(false);
  await page.getByRole("navigation", { name: "后台导航" }).getByRole("link", { name: "PDF 生成" }).click();
  await expect(page).toHaveURL(`${base}/admin/pdf/`);
  await expect(page.getByRole("heading", { name: "PDF 生成" })).toBeVisible();
  await expect(page.getByRole("button", { name: "生成 Design Portfolio" })).toBeEnabled();
  expect((await page.request.get(`${base}/admin/pdf/`)).status()).toBe(200);
  await page.getByRole("button", { name: "退出" }).click();
  await expect(page.getByLabel("Fine-grained personal access token")).toBeVisible();
  await expect(page.getByLabel("Fine-grained personal access token")).toHaveValue("");
  expect(errors).toEqual([]);
});

test("Pages admin uploads multiple media sequentially and derives image roles", async ({ page }) => {
  const uploads: string[] = [];
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio", (route) => route.fulfill({ json: { id: 1 } }));
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/contents/data/content.json?ref=main", (route) => route.fulfill({ json: { content: Buffer.from(JSON.stringify(content)).toString("base64"), sha: "fixture-sha" } }));
  await page.route(/https:\/\/api\.github\.com\/repos\/SenTomoHiro\/chim-branding-portfolio\/contents\/public\/media\/cases\//, async (route) => {
    const payload = route.request().postDataJSON() as { content: string };
    uploads.push(Buffer.from(payload.content, "base64").toString("utf8"));
    await route.fulfill({ json: { content: { sha: `upload-${uploads.length}` } } });
  });
  await page.route(`**${base}/media/cases/**`, (route) => route.fulfill({ contentType: "image/gif", body: Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64") }));
  await page.goto(`${base}/admin/cases/new/`);
  await page.getByLabel("Fine-grained personal access token").fill("fixture-token");
  await page.getByRole("button", { name: "连接 GitHub" }).click();
  await page.locator('.bodyMediaActions input[type="file"]').setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: Buffer.from("first") },
    { name: "second.png", mimeType: "image/png", buffer: Buffer.from("second") },
  ]);
  await expect(page.locator(".bodyAssetList article")).toHaveCount(2);
  expect(uploads).toEqual(["first", "second"]);
  await expect(page.locator('[data-media-role="cover"]')).toContainText("封面");
  await expect(page.locator('[data-media-role="hero"]')).toContainText("详情页首图");
});

test("Pages admin generates PDFs through a precisely correlated repository dispatch", async ({ page }) => {
  let dispatchPayload: { event_type: string; client_payload: { request_id: string; target: string } } | undefined;
  let workflowDispatchCalls = 0;
  let runAuthorization: string | undefined;
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio", (route) => route.fulfill({ json: { id: 1 } }));
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/contents/data/content.json?ref=main", (route) => route.fulfill({ json: { content: Buffer.from(JSON.stringify(content)).toString("base64"), sha: "fixture-sha" } }));
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/dispatches", async (route) => {
    dispatchPayload = route.request().postDataJSON() as typeof dispatchPayload;
    await route.fulfill({ status: 204 });
  });
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/actions/workflows/deploy-pages.yml/dispatches", async (route) => {
    workflowDispatchCalls += 1;
    await route.fulfill({ status: 500 });
  });
  await page.route(/\/actions\/workflows\/deploy-pages\.yml\/runs\?/, async (route) => {
    runAuthorization = route.request().headers().authorization;
    const requestId = dispatchPayload?.client_payload.request_id;
    await route.fulfill({ json: { workflow_runs: [
      { id: 41, html_url: "https://github.com/example/run/41", status: "completed", conclusion: "failure", display_title: "Admin PDF another-request · design" },
      { id: 42, html_url: "https://github.com/example/run/42", status: "completed", conclusion: "success", display_title: `Admin PDF ${requestId} · design` },
    ] } });
  });

  await page.goto(`${base}/admin/pdf/`);
  await expect(page.locator(".fieldHint")).toContainText("权限只需 Contents: Read and write");
  await expect(page.locator(".fieldHint")).not.toContainText("Actions");
  await page.getByLabel("Fine-grained personal access token").fill("fixture-token");
  await page.getByRole("button", { name: "连接 GitHub" }).click();
  await page.getByRole("button", { name: "生成 Design Portfolio" }).click();
  await expect(page.getByRole("status")).toHaveText("生成成功");

  expect(dispatchPayload?.event_type).toBe("admin_pdf_generate");
  expect(dispatchPayload?.client_payload.target).toBe("design");
  expect(dispatchPayload?.client_payload.request_id).toMatch(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i);
  expect(workflowDispatchCalls).toBe(0);
  expect(runAuthorization).toBeUndefined();
  await expect(page.getByRole("link", { name: "打开 PDF" })).toHaveAttribute("href", `${base}/pdf/portfolio-design.pdf`);
  await expect(page.getByRole("link", { name: "下载" })).toHaveAttribute("href", `${base}/pdf/portfolio-design.pdf?download=1`);
});

test("Pages admin reports the real repository dispatch error", async ({ page }) => {
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio", (route) => route.fulfill({ json: { id: 1 } }));
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/contents/data/content.json?ref=main", (route) => route.fulfill({ json: { content: Buffer.from(JSON.stringify(content)).toString("base64"), sha: "fixture-sha" } }));
  await page.route("https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio/dispatches", (route) => route.fulfill({ status: 403, json: { message: "Resource not accessible by personal access token" } }));

  await page.goto(`${base}/admin/pdf/`);
  await page.getByLabel("Fine-grained personal access token").fill("fixture-token");
  await page.getByRole("button", { name: "连接 GitHub" }).click();
  await page.getByRole("button", { name: "生成 Design Portfolio" }).click();
  await expect(page.getByRole("status")).toContainText("HTTP 403：Resource not accessible by personal access token");
  await expect(page.getByRole("status")).not.toContainText("Actions");
});
