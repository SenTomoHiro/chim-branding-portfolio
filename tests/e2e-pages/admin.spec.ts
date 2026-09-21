import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { pdfSourceHash, type PdfCacheManifest, type PdfTarget } from "../../lib/pdf-cache";
import type { ContentData } from "../../lib/types";

const base = "/chim-branding-portfolio";
const repoApi = "https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio";
const release = "https://github.com/SenTomoHiro/chim-branding-portfolio/releases/download/pdf-cache";
const content = JSON.parse(readFileSync(new URL("../../data/content.json", import.meta.url), "utf8")) as ContentData;
const emptyCache: PdfCacheManifest = { version: 1, targets: {} };
const remote = (value: unknown, sha = "fixture-sha") => ({ content: Buffer.from(JSON.stringify(value)).toString("base64"), sha });

async function mockConnection(page: Page, cache: PdfCacheManifest = emptyCache) {
  await page.route(repoApi, (route) => route.fulfill({ json: { id: 1 } }));
  await page.route(`${repoApi}/contents/data/content.json?ref=main`, (route) => route.fulfill({ json: remote(content) }));
  await page.route(`${repoApi}/contents/data/pdf-cache.json?ref=main`, (route) => route.fulfill({ json: remote(cache, "cache-sha") }));
}

async function connect(page: Page) {
  await page.getByLabel("Fine-grained personal access token").fill("fixture-token");
  await page.getByRole("button", { name: "连接 GitHub" }).click();
}

test("Pages admin keeps Contents-only auth and uses one generic case editor", async ({ page }) => {
  await mockConnection(page);
  await page.goto(`${base}/admin/`);
  await expect(page.locator(".fieldHint")).toContainText("Contents: Read and write");
  await expect(page.locator(".fieldHint")).not.toContainText("Actions");
  await connect(page);
  await expect(page.locator(".adminCaseList article")).toHaveCount(content.cases.length);
  await page.getByRole("link", { name: "新建案例" }).click();
  await expect(page).toHaveURL(`${base}/admin/cases/?new=1`);
  await expect(page.getByRole("heading", { name: "新建案例" })).toBeVisible();
  await page.getByRole("link", { name: "返回后台" }).click();
  const item = content.cases.find((entry) => entry.id === "N014")!;
  await page.locator(".adminCaseList article").filter({ hasText: item.brandName }).getByRole("link", { name: "编辑" }).click();
  await expect(page.getByLabel("品牌名")).toHaveValue(item.brandName);
  expect(new URL(page.url()).pathname).toBe(`${base}/admin/cases/`);
  expect(new URL(page.url()).searchParams.get("id")).toBe(item.id);
});

test("Pages admin uploads case media without calling the Pages or Actions API", async ({ page }) => {
  const uploads: string[] = [];
  let actionsCalls = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname.includes("/actions/")) actionsCalls += 1; });
  await mockConnection(page);
  await page.route(new RegExp(`${repoApi}/contents/public/media/cases/`), async (route) => {
    uploads.push(Buffer.from((route.request().postDataJSON() as { content: string }).content, "base64").toString());
    await route.fulfill({ json: { content: { sha: `upload-${uploads.length}` } } });
  });
  await page.goto(`${base}/admin/cases/?new=1`);
  await connect(page);
  await page.locator('.bodyMediaActions input[type="file"]').setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: Buffer.from("first") },
    { name: "second.png", mimeType: "image/png", buffer: Buffer.from("second") },
  ]);
  await expect(page.locator(".bodyAssetList article")).toHaveCount(2);
  expect(uploads).toEqual(["first", "second"]);
  await expect(page.locator('[data-media-role="cover"]')).toContainText("封面");
  await expect(page.locator('[data-media-role="hero"]')).toContainText("详情页首图");
  expect(actionsCalls).toBe(0);
});

test("Pages admin detects fresh and stale PDF cache entries before generation", async ({ page }) => {
  const cache: PdfCacheManifest = { version: 1, targets: {
    design: { sourceHash: pdfSourceHash(content, "design"), filename: "portfolio-design.pdf", generatedAt: "2026-09-20T00:00:00.000Z" },
    photography: { sourceHash: "stale", filename: "portfolio-photography.pdf", generatedAt: "2026-09-20T00:00:00.000Z" },
  } };
  await mockConnection(page, cache);
  await page.goto(`${base}/admin/pdf/`); await connect(page);
  const design = page.locator(".pdfAdminActions .pdfGenerateAction").nth(0);
  await expect(design.getByRole("button", { name: "重新生成", exact: true })).toBeVisible();
  await expect(design.getByRole("link", { name: "打开 PDF" })).toHaveAttribute("href", `${release}/portfolio-design.pdf`);
  const photography = page.locator(".pdfAdminActions .pdfGenerateAction").nth(1);
  await expect(photography.getByText("PDF 已过期")).toBeVisible();
  await expect(photography.getByRole("button", { name: "重新生成 PDF" })).toBeVisible();
  await expect(photography.getByRole("link", { name: "打开 PDF" })).toHaveCount(0);
});

test("Pages admin dispatches unique single targets and waits for matching Contents manifest without Actions API", async ({ page }) => {
  const dispatches: Array<{ event_type: string; client_payload: { request_id: string; target: PdfTarget } }> = [];
  const attempts = new Map<PdfTarget, number>();
  let actionsCalls = 0;
  page.on("request", (request) => { if (new URL(request.url()).pathname.includes("/actions/")) actionsCalls += 1; });
  await mockConnection(page);
  await page.route(`${repoApi}/dispatches`, async (route) => { dispatches.push(route.request().postDataJSON() as typeof dispatches[number]); await route.fulfill({ status: 204 }); });
  await page.route(new RegExp(`${repoApi}/contents/data/pdf-cache.json\\?ref=main&v=`), async (route) => {
    const target = dispatches.at(-1)!.client_payload.target;
    const attempt = (attempts.get(target) || 0) + 1; attempts.set(target, attempt);
    const hash = attempt === 1 ? "wrong-request-source" : pdfSourceHash(content, target);
    await route.fulfill({ json: remote({ version: 1, targets: { [target]: { sourceHash: hash, filename: target.startsWith("case:") ? `${target.slice(5).toLowerCase()}.pdf` : target.startsWith("category:") ? `portfolio-design-${target.slice(9)}.pdf` : `portfolio-${target}.pdf`, generatedAt: `2026-09-21T00:00:0${attempt}.000Z` } } }) });
  });
  await page.clock.install();
  await page.goto(`${base}/admin/pdf/`); await connect(page);
  const actions = [
    { locator: page.locator(".pdfAdminActions .pdfGenerateAction").nth(0), target: "design" as PdfTarget, href: `${release}/portfolio-design.pdf` },
    { locator: page.locator(".pdfAdminActions .pdfGenerateAction").nth(1), target: "photography" as PdfTarget, href: `${release}/portfolio-photography.pdf` },
    { locator: page.locator(".pdfCategoryGrid article").filter({ hasText: "餐饮" }).locator(".pdfGenerateAction"), target: "category:food" as PdfTarget, href: `${release}/portfolio-design-food.pdf` },
    { locator: page.locator(".pdfCaseManagement article").filter({ hasText: content.cases.find((item) => item.id === "N014")!.brandName }).locator(".pdfGenerateAction"), target: "case:N014" as PdfTarget, href: `${release}/n014.pdf` },
  ];
  for (const action of actions) {
    await action.locator.getByRole("button").click();
    await expect.poll(() => attempts.get(action.target)).toBe(1);
    await expect(action.locator.getByRole("status")).toHaveText("正在生成…");
    await page.clock.fastForward(7500);
    await expect(action.locator.getByRole("status")).toHaveText("生成成功");
    await expect(action.locator.getByRole("link", { name: "打开 PDF" })).toHaveAttribute("href", action.href);
  }
  expect(dispatches.map((entry) => entry.event_type)).toEqual(actions.map(() => "admin_pdf_generate"));
  expect(dispatches.map((entry) => entry.client_payload.target)).toEqual(actions.map((entry) => entry.target));
  expect(new Set(dispatches.map((entry) => entry.client_payload.request_id)).size).toBe(actions.length);
  expect(actionsCalls).toBe(0);
});

test("Pages admin reports the repository dispatch error", async ({ page }) => {
  await mockConnection(page);
  await page.route(`${repoApi}/dispatches`, (route) => route.fulfill({ status: 403, json: { message: "Resource not accessible by personal access token" } }));
  await page.goto(`${base}/admin/pdf/`); await connect(page);
  await page.getByRole("button", { name: "生成 Design Portfolio" }).click();
  await expect(page.getByRole("status")).toContainText("HTTP 403：Resource not accessible by personal access token");
});
