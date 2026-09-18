import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);
const root = process.cwd();
const discovery = JSON.parse(await fs.readFile(path.join(root, "case-audit-v3/all-pdf-inventory.json"), "utf8"));
const cases = discovery.items
  .filter((item) => item.classification === "NEW_CASE_FINAL" && item.case_ids.length === 1)
  .map((item) => [item.case_ids[0], item.relative_path]);
if (cases.length === 0) throw new Error("No NEW_CASE_FINAL PDFs were discovered.");

async function renderCase([caseId, relativePdf]) {
  const target = path.join(root, "case-audit-v3/pdf-renders", caseId);
  await fs.rm(target, { recursive: true, force: true });
  await fs.mkdir(target, { recursive: true });
  await run("pdftoppm", ["-jpeg", "-jpegopt", "quality=86,optimize=y", "-r", "150", path.join(root, relativePdf), path.join(target, "render")], { maxBuffer: 1024 * 1024 * 10 });
  const rendered = (await fs.readdir(target)).filter((name) => /^render-\d+\.jpg$/.test(name)).sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
  for (let index = 0; index < rendered.length; index += 1) await fs.rename(path.join(target, rendered[index]), path.join(target, `page-${String(index + 1).padStart(3, "0")}.jpg`));

  const tileWidth = 300; const tileHeight = 190; const labelHeight = 28; const columns = 5;
  const rows = Math.ceil(rendered.length / columns); const composites = [];
  for (let index = 0; index < rendered.length; index += 1) {
    const page = index + 1;
    const image = await sharp(path.join(target, `page-${String(page).padStart(3, "0")}.jpg`)).resize(tileWidth, tileHeight, { fit: "contain", background: "#ddd" }).jpeg({ quality: 80 }).toBuffer();
    const label = Buffer.from(`<svg width="${tileWidth}" height="${labelHeight}"><rect width="100%" height="100%" fill="#111"/><text x="10" y="20" fill="white" font-family="Arial" font-size="16">${caseId} · PAGE ${String(page).padStart(3, "0")}</text></svg>`);
    const left = (index % columns) * (tileWidth + 8); const top = Math.floor(index / columns) * (tileHeight + labelHeight + 8);
    composites.push({ input: image, left, top }, { input: label, left, top: top + tileHeight });
  }
  const overviewDir = path.join(root, "case-audit-v3/tmp/page-overviews"); await fs.mkdir(overviewDir, { recursive: true });
  await sharp({ create: { width: columns * tileWidth + (columns - 1) * 8, height: rows * (tileHeight + labelHeight + 8) - 8, channels: 3, background: "#f3f2ee" } }).composite(composites).jpeg({ quality: 88 }).toFile(path.join(overviewDir, `${caseId}.jpg`));
  return { caseId, pages: rendered.length };
}

const results = [];
for (let index = 0; index < cases.length; index += 4) results.push(...await Promise.all(cases.slice(index, index + 4).map(renderCase)));
console.log(JSON.stringify(results, null, 2));
