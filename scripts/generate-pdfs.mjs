import { createReadStream } from "node:fs";
import { mkdir, readFile, rm, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

function argument(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const siteDirectory = path.resolve(argument("site-dir", "out"));
const outputDirectory = path.resolve(argument("output-dir", path.join("output", "pdf")));
const contentFile = path.resolve(argument("content", path.join("data", "content.json")));
const basePath = argument("base-path", process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const externalOrigin = argument("origin").replace(/\/$/, "");
const target = argument("target", "all");

if ([path.parse(outputDirectory).root, process.cwd(), siteDirectory].includes(outputDirectory)) throw new Error(`拒绝使用过宽的 PDF 输出目录：${outputDirectory}`);

const content = JSON.parse(await readFile(contentFile, "utf8"));
const publishedCases = content.cases.filter((item) => item.published);
const optimizedImageCache = new Map();

function contentType(filename) {
  const extension = path.extname(filename).toLowerCase();
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".woff2": "font/woff2" })[extension] || "application/octet-stream";
}

async function resolveRequest(urlPath) {
  let pathname = decodeURIComponent(urlPath.split("?")[0]);
  if (basePath && pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length) || "/";
  const relative = pathname.replace(/^\/+/, "");
  const candidates = pathname.endsWith("/") ? [path.join(relative, "index.html")] : [relative, `${relative}.html`, path.join(relative, "index.html")];
  for (const candidate of candidates) {
    const filename = path.resolve(siteDirectory, candidate);
    if (!filename.startsWith(`${siteDirectory}${path.sep}`) && filename !== siteDirectory) continue;
    try { if ((await stat(filename)).isFile()) return filename; } catch {}
  }
  return null;
}

const serveStatic = async (request, response) => {
  try {
    const filename = await resolveRequest(request.url || "/");
    if (!filename) { response.writeHead(404); response.end("Not found"); return; }
    if (/\.(?:jpe?g|png|webp|avif|tiff?)$/i.test(filename)) {
      if (!optimizedImageCache.has(filename)) optimizedImageCache.set(filename, sharp(filename).rotate().resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer());
      const image = await optimizedImageCache.get(filename);
      response.writeHead(200, { "content-type": "image/jpeg", "content-length": image.length, "cache-control": "public, max-age=31536000, immutable" });
      response.end(image);
      return;
    }
    response.writeHead(200, { "content-type": contentType(filename), "cache-control": "no-store" });
    createReadStream(filename).pipe(response);
  } catch (error) {
    response.writeHead(500); response.end(error instanceof Error ? error.message : "Server error");
  }
};

let server;
let origin = externalOrigin;
if (!origin) {
  server = createServer(serveStatic);
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("无法启动 PDF 静态预览服务");
  origin = `http://127.0.0.1:${address.port}${basePath}`;
}

if (target === "all") await rm(outputDirectory, { recursive: true, force: true });
await mkdir(path.join(outputDirectory, "cases"), { recursive: true });
let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("Executable doesn't exist")) throw error;
  process.stderr.write("Playwright Chromium 未安装，改用系统 Google Chrome。\n");
  browser = await chromium.launch({ headless: true, channel: "chrome" });
}

async function render(route, filename) {
  const page = await browser.newPage({ viewport: { width: 1120, height: 1584 }, deviceScaleFactor: 1 });
  if (externalOrigin) await page.route("**/*", async (browserRoute) => {
    const requestUrl = new URL(browserRoute.request().url());
    if (requestUrl.origin !== new URL(origin).origin || !/\.(?:jpe?g|png|webp|avif|tiff?)$/i.test(requestUrl.pathname)) return browserRoute.continue();
    let pathname = decodeURIComponent(requestUrl.pathname);
    if (basePath && pathname.startsWith(basePath)) pathname = pathname.slice(basePath.length) || "/";
    const filename = path.resolve(process.cwd(), "public", `.${pathname}`);
    const publicRoot = path.resolve(process.cwd(), "public");
    if (!filename.startsWith(`${publicRoot}${path.sep}`)) return browserRoute.continue();
    try {
      if (!optimizedImageCache.has(filename)) optimizedImageCache.set(filename, sharp(filename).rotate().resize({ width: 1800, height: 2400, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80, progressive: true, mozjpeg: true }).toBuffer());
      const image = await optimizedImageCache.get(filename);
      await browserRoute.fulfill({ status: 200, contentType: "image/jpeg", body: image, headers: { "cache-control": "public, max-age=31536000, immutable" } });
    } catch { await browserRoute.continue(); }
  });
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") browserErrors.push(message.text()); });
  const response = await page.goto(`${origin}${route}`, { waitUntil: "networkidle", timeout: 120_000 });
  if (!response?.ok()) throw new Error(`PDF 页面加载失败 ${route}：HTTP ${response?.status() || "unknown"}`);
  await page.emulateMedia({ media: "print" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    await Promise.all(images.map((image) => image.complete ? Promise.resolve() : new Promise((resolve, reject) => { image.addEventListener("load", resolve, { once: true }); image.addEventListener("error", reject, { once: true }); })));
    const broken = images.filter((image) => !image.naturalWidth).map((image) => image.currentSrc || image.src);
    if (broken.length) throw new Error(`图片加载失败：${broken.join("、")}`);
    if (!document.querySelector("[data-pdf-ready='true']")) throw new Error("PDF 页面未完成渲染");
  });
  if (browserErrors.length) throw new Error(`PDF 页面运行错误 ${route}：${browserErrors.join(" | ")}`);
  const isLongCase = route.startsWith("/print/case/");
  const isPortfolio = route.startsWith("/print/portfolio/");
  const longPageHeight = isLongCase ? await page.evaluate(() => {
    const documentRoot = document.querySelector("[data-pdf-ready='true']");
    if (!documentRoot) throw new Error("PDF 长页根节点不存在");
    return Math.ceil(Math.max(
      documentRoot.scrollHeight,
      documentRoot.getBoundingClientRect().height,
    ) + 2);
  }) : 0;
  if (isLongCase) {
    const longPageHeightMm = (longPageHeight * 25.4 / 96).toFixed(3);
    await page.addStyleTag({ content: `@page { size: 210mm ${longPageHeightMm}mm; margin: 0; }` });
  }
  if (isPortfolio) {
    const caseHeights = await page.evaluate(() => [...document.querySelectorAll("[data-portfolio-case-page]")].map((element) => ({
      index: element.getAttribute("data-portfolio-case-page"),
      height: Math.ceil(Math.max(element.scrollHeight, element.getBoundingClientRect().height) + 2),
    })));
    if (!caseHeights.length) throw new Error(`Portfolio 没有可生成的案例页：${route}`);
    const rules = [
      "@page portfolioFront { size: A4 portrait; margin: 0; }",
      ".pdfPortfolioFrontPage { page: portfolioFront; }",
      ...caseHeights.flatMap(({ index, height }) => {
        const pageName = `portfolioCase${index}`;
        const pageHeightMm = (height * 25.4 / 96).toFixed(3);
        return [`@page ${pageName} { size: 210mm ${pageHeightMm}mm; margin: 0; }`, `[data-portfolio-case-page='${index}'] { page: ${pageName}; }`];
      }),
    ];
    await page.addStyleTag({ content: rules.join("\n") });
  }
  await page.pdf(isLongCase || isPortfolio ? {
    path: filename,
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    tagged: true,
    outline: true,
  } : {
    path: filename,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
    tagged: true,
    outline: true,
  });
  await page.close();
  const info = await stat(filename);
  if (info.size < 10_000) throw new Error(`PDF 输出异常（文件过小）：${filename}`);
  process.stdout.write(`PDF ${route} -> ${path.relative(process.cwd(), filename)} (${(info.size / 1024 / 1024).toFixed(1)} MB)\n`);
}

try {
  if (target === "all" || target === "design") await render("/print/portfolio/design/", path.join(outputDirectory, "portfolio-design.pdf"));
  if (target === "all" || target === "photography") await render("/print/portfolio/photography/", path.join(outputDirectory, "portfolio-photography.pdf"));
  if (target === "all") {
    for (const item of publishedCases) await render(`/print/case/${item.id.toLowerCase()}/`, path.join(outputDirectory, "cases", `${item.id.toLowerCase()}.pdf`));
  } else if (target.startsWith("case:")) {
    const id = target.slice(5).toLowerCase();
    const item = publishedCases.find((candidate) => candidate.id.toLowerCase() === id);
    if (!item) throw new Error(`找不到已发布案例：${id}`);
    await render(`/print/case/${id}/`, path.join(outputDirectory, "cases", `${id}.pdf`));
  } else if (target !== "design" && target !== "photography") throw new Error(`不支持的 PDF 生成目标：${target}`);
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}

console.log(`Generated PDF target: ${target}.`);
