import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const repo = process.cwd();
const productionRoot = path.join(repo, "case-production/portfolio-additions-sol-v1");

const cases = [
  {
    key: "mustache-matcha",
    name: "大胡子抹茶",
    action: "create",
    sources: ["/Users/chim/Downloads/大胡子抹茶/240905-大胡子全套提案/提案"],
  },
  {
    key: "zhenxin-tea",
    name: "真心茶事",
    action: "create",
    sources: ["/Users/chim/Downloads/真心茶事/提案", "/Users/chim/Downloads/真心茶事/电视机海报12张"],
  },
  {
    key: "chunlai-courtyard",
    name: "春莱小院",
    action: "create",
    sources: ["/Users/chim/Downloads/春莱小院/提案"],
  },
  {
    key: "wenningji",
    name: "文柠记",
    action: "update",
    existingCaseId: "L012",
    sources: ["/Users/chim/Downloads/文柠记/提案"],
  },
  {
    key: "mustache-cocoa-winter",
    name: "大胡子可可 · 冬季热饮新品系列",
    action: "create",
    sources: [
      "/Users/chim/Downloads/大胡子可可/241014-大胡子可可-热饮6款",
      "/Users/chim/Downloads/大胡子可可/241024-大胡子可可-热饮2款",
      "/Users/chim/Downloads/大胡子可可/241105-大胡子可可-新品3个-改1.jpg",
    ],
  },
  {
    key: "mustache-cocoa-tatan",
    name: "大胡子可可 × TATAN",
    action: "create",
    sources: ["/Users/chim/Downloads/大胡子可可/241201-大胡子可可-tatan联名"],
  },
];

const supported = new Set([".jpg", ".jpeg", ".png", ".psd", ".psb", ".pdf", ".ai", ".mp4", ".mov", ".webm"]);
const safeName = (value) => value.normalize("NFKC").replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 110);
const sha256 = async (file) => crypto.createHash("sha256").update(await fs.readFile(file)).digest("hex");

async function walk(target, files = []) {
  const stat = await fs.stat(target);
  if (stat.isFile()) return [target];
  for (const item of await fs.readdir(target, { withFileTypes: true })) {
    const full = path.join(target, item.name);
    if (item.isDirectory()) await walk(full, files);
    else files.push(full);
  }
  return files;
}

const run = (command, args) => spawnSync(command, args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });

async function imageMetadata(file) {
  try {
    const meta = await sharp(file, { limitInputPixels: false }).metadata();
    return { width: meta.width, height: meta.height, space: meta.space, format: meta.format };
  } catch {
    const result = run("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "format", file]);
    const width = Number(result.stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(result.stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
    const format = result.stdout.match(/format:\s*(\S+)/)?.[1];
    return { width: width || undefined, height: height || undefined, format };
  }
}

function pdfInfo(file) {
  const result = run("pdfinfo", [file]);
  const pages = Number(result.stdout.match(/^Pages:\s+(\d+)/m)?.[1]);
  return { pages: pages || 0, ok: result.status === 0, error: result.stderr.trim() };
}

async function renderPsd(file, outDir, ordinal) {
  await fs.mkdir(outDir, { recursive: true });
  const output = path.join(outDir, `${String(ordinal).padStart(2, "0")}-${safeName(path.basename(file))}.jpg`);
  const result = run("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "92", "-Z", "2800", file, "--out", output]);
  const exists = await fs.stat(output).then((stat) => stat.size > 0).catch(() => false);
  return { ok: result.status === 0 && exists, outputs: exists ? [output] : [], error: result.stderr.trim() || result.stdout.trim() };
}

async function renderPdfCompatible(file, outDir, ordinal) {
  await fs.mkdir(outDir, { recursive: true });
  const prefix = path.join(outDir, `${String(ordinal).padStart(2, "0")}-${safeName(path.basename(file))}`);
  const result = run("pdftoppm", ["-jpeg", "-jpegopt", "quality=92", "-scale-to", "2800", file, prefix]);
  const names = await fs.readdir(outDir);
  const outputs = names.filter((name) => name.startsWith(path.basename(prefix) + "-") && name.endsWith(".jpg")).sort().map((name) => path.join(outDir, name));
  return { ok: result.status === 0 && outputs.length > 0, outputs, error: result.stderr.trim() };
}

for (const folder of ["inventory", "rendered", "cropped", "composites", "final-assets", "cases", "review/contact-sheets", "tools"]) {
  await fs.mkdir(path.join(productionRoot, folder), { recursive: true });
}

const manifest = {
  version: "portfolio-additions-sol-v1",
  generatedAt: new Date().toISOString(),
  allowedSources: cases.flatMap((item) => item.sources),
  cases: [],
  renders: [],
  skipped: [],
};

for (const caseInfo of cases) {
  const allFiles = [];
  for (const source of caseInfo.sources) allFiles.push(...await walk(source));
  const files = allFiles.filter((file) => supported.has(path.extname(file).toLowerCase())).sort((a, b) => a.localeCompare(b, "zh-Hans-CN"));
  const records = [];
  let psdOrdinal = 0;
  let pdfOrdinal = 0;
  let aiOrdinal = 0;
  for (const file of files) {
    const extension = path.extname(file).toLowerCase();
    const stat = await fs.stat(file);
    const record = {
      case: caseInfo.name,
      caseKey: caseInfo.key,
      source: file,
      extension: extension.slice(1),
      bytes: stat.size,
      sha256: await sha256(file),
      classification: /样机/i.test(file) ? "mockup" : /提案/i.test(path.basename(file)) ? "proposal" : /海报|主视觉|欢迎/i.test(file) ? "finished visual" : /菜单|杯|袋|贴纸|门头|招牌|线上|美团|点评|饿了么/i.test(file) ? "production artwork" : /IMG_/i.test(file) ? "photo" : extension === ".ai" ? "production artwork" : "other",
    };
    if ([".jpg", ".jpeg", ".png", ".psd", ".psb"].includes(extension)) Object.assign(record, await imageMetadata(file));
    let render;
    if ([".psd", ".psb"].includes(extension)) {
      render = await renderPsd(file, path.join(productionRoot, "rendered", caseInfo.key, "psd"), ++psdOrdinal);
    } else if (extension === ".pdf") {
      Object.assign(record, pdfInfo(file));
      render = await renderPdfCompatible(file, path.join(productionRoot, "rendered", caseInfo.key, "pdf"), ++pdfOrdinal);
    } else if (extension === ".ai") {
      Object.assign(record, pdfInfo(file));
      render = await renderPdfCompatible(file, path.join(productionRoot, "rendered", caseInfo.key, "ai"), ++aiOrdinal);
    }
    if (render) {
      const renderRecord = { case: caseInfo.name, caseKey: caseInfo.key, source: file, sourceType: extension.slice(1), ok: render.ok, outputs: render.outputs.map((output) => path.relative(repo, output)), error: render.ok ? undefined : render.error };
      manifest.renders.push(renderRecord);
      record.renderStatus = render.ok ? "success" : "skipped";
      record.renderedOutputs = renderRecord.outputs;
      if (!render.ok) manifest.skipped.push({ source: file, reason: render.error || "render failed" });
    }
    records.push(record);
  }
  const typeCounts = records.reduce((result, item) => ({ ...result, [item.extension]: (result[item.extension] || 0) + 1 }), {});
  const caseRecord = { ...caseInfo, sourceFileCount: records.length, typeCounts, files: records };
  manifest.cases.push(caseRecord);
  await fs.writeFile(path.join(productionRoot, "inventory", `${caseInfo.key}.json`), `${JSON.stringify(caseRecord, null, 2)}\n`);
}

await fs.writeFile(path.join(productionRoot, "render-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

let summary = "# Portfolio Additions · Source Inventory\n\n";
summary += "范围严格限制为用户指定的 9 个路径；未扫描其他 Downloads 目录。\n\n";
summary += "| 任务 | Action | 源文件 | JPG/JPEG | PNG | PSD/PSB | PDF | AI | Video |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n";
for (const item of manifest.cases) {
  const count = (...keys) => keys.reduce((total, key) => total + (item.typeCounts[key] || 0), 0);
  summary += `| ${item.name} | ${item.action} | ${item.sourceFileCount} | ${count("jpg", "jpeg")} | ${count("png")} | ${count("psd", "psb")} | ${count("pdf")} | ${count("ai")} | ${count("mp4", "mov", "webm")} |\n`;
}
summary += "\n完整文件清单与分类见本目录各案例 JSON；分类用于生产筛选，不替代人工视觉判断。\n";
await fs.writeFile(path.join(productionRoot, "inventory", "summary.md"), summary);

console.log(JSON.stringify({
  cases: manifest.cases.length,
  sourceFiles: manifest.cases.reduce((sum, item) => sum + item.sourceFileCount, 0),
  renderDocuments: manifest.renders.length,
  renderSuccess: manifest.renders.filter((item) => item.ok).length,
  renderedImages: manifest.renders.reduce((sum, item) => sum + item.outputs.length, 0),
  renderSkipped: manifest.skipped.length,
}, null, 2));
