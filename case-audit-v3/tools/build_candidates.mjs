import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { allPageClassifications, pageClassification, pdfSources } from "./v3_config.mjs";

const root = process.cwd();
const auditRoot = path.join(root, "case-audit-v3");
const v2 = JSON.parse(readFileSync(path.join(root, "case-audit-v2/asset-manifest.json"), "utf8"));
const candidatesRoot = path.join(auditRoot, "candidates");
const overviewRoot = path.join(auditRoot, "tmp/candidate-overviews");

rmSync(candidatesRoot, { recursive: true, force: true });
rmSync(overviewRoot, { recursive: true, force: true });
mkdirSync(candidatesRoot, { recursive: true });
mkdirSync(overviewRoot, { recursive: true });

writeFileSync(
  path.join(auditRoot, "pdf-page-classification.json"),
  `${JSON.stringify({ generated_at: new Date().toISOString(), cases: allPageClassifications() }, null, 2)}\n`,
);

const excluded = [];
for (const entry of allPageClassifications()) {
  for (const item of entry.pages) {
    if (item.classification !== "final_design") {
      excluded.push({
        case_id: entry.case_id,
        source: `${entry.source_pdf}#page=${item.page}`,
        reason: item.note ?? `PDF page visually classified as ${item.classification}`,
      });
    }
  }
}
writeFileSync(
  path.join(auditRoot, "excluded-reference-assets.json"),
  `${JSON.stringify({ generated_at: new Date().toISOString(), assets: excluded }, null, 2)}\n`,
);

function svgLabel(text, width) {
  const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  return Buffer.from(`<svg width="${width}" height="34"><rect width="100%" height="100%" fill="#fff"/><text x="8" y="22" font-size="15" font-family="Arial" fill="#111">${escaped}</text></svg>`);
}

async function overview(caseId, items) {
  const cellW = 360;
  const thumbH = 240;
  const labelH = 34;
  const cols = 4;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const composites = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const left = (index % cols) * cellW;
    const top = Math.floor(index / cols) * (thumbH + labelH);
    const thumb = await sharp(item.absolutePath)
      .rotate()
      .resize(cellW, thumbH, { fit: "contain", background: "#e9e7e2" })
      .jpeg({ quality: 82 })
      .toBuffer();
    composites.push({ input: thumb, left, top });
    composites.push({ input: svgLabel(item.label, cellW), left, top: top + thumbH });
  }
  await sharp({ create: { width: cellW * cols, height: rows * (thumbH + labelH), channels: 3, background: "#d4d1ca" } })
    .composite(composites)
    .jpeg({ quality: 86 })
    .toFile(path.join(overviewRoot, `${caseId}.jpg`));
}

const inventory = {};
for (const caseId of Object.keys(pdfSources)) {
  const caseDir = path.join(candidatesRoot, caseId);
  mkdirSync(caseDir, { recursive: true });
  const assets = v2.assets.filter((asset) => {
    if (asset.case_id !== caseId || asset.source_type !== "pdf_image_object") return false;
    const page = asset.source_locator?.page;
    if (!page || pageClassification(caseId, page).classification !== "final_design") return false;
    const { width = 0, height = 0 } = asset;
    return Math.max(width, height) >= 900 && Math.min(width, height) >= 500;
  });

  const items = [];
  for (const [index, asset] of assets.entries()) {
    const source = path.join(root, asset.file);
    if (!existsSync(source)) throw new Error(`Missing V2 PDF extraction: ${asset.file}`);
    const extension = path.extname(source).toLowerCase() || ".png";
    const page = asset.source_locator.page;
    const xref = asset.source_locator.xref;
    const name = `candidate-${String(index + 1).padStart(3, "0")}-p${String(page).padStart(3, "0")}-xref${xref}${extension}`;
    const destination = path.join(caseDir, name);
    cpSync(source, destination);
    const bytes = readFileSync(destination);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    items.push({
      case_id: caseId,
      candidate_id: `${caseId}-C${String(index + 1).padStart(3, "0")}`,
      file: path.relative(root, destination),
      absolutePath: destination,
      label: `C${String(index + 1).padStart(3, "0")} · p${page} · xref ${xref} · ${asset.width}×${asset.height}`,
      source_pdf: pdfSources[caseId],
      source_page: page,
      source_object: `xref:${xref};smask:${asset.source_locator.smask ?? 0}`,
      extraction_method: "pdf_embedded_image_object",
      width: asset.width,
      height: asset.height,
      sha256,
      classification: "final_design",
      final_work_verified: false,
    });
  }
  inventory[caseId] = items.map(({ absolutePath, label, ...item }) => item);
  await overview(caseId, items);
  process.stdout.write(`${caseId}: ${items.length} PDF candidates\n`);
}

writeFileSync(
  path.join(auditRoot, "tmp/candidates.json"),
  `${JSON.stringify(inventory, null, 2)}\n`,
);

execFileSync("/usr/bin/true");
