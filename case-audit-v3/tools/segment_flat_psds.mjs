import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import sharp from "sharp";

const run = promisify(execFile);
const root = process.cwd();
const analysisWidth = 800;
const analysisHeight = 1732;

const grid = (columns, rows, x0 = 0, y0 = 0, x1 = analysisWidth, y1 = analysisHeight) => {
  const boxes = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      boxes.push([
        x0 + ((x1 - x0) * column) / columns,
        y0 + ((y1 - y0) * row) / rows,
        x0 + ((x1 - x0) * (column + 1)) / columns,
        y0 + ((y1 - y0) * (row + 1)) / rows,
      ]);
    }
  }
  return boxes;
};
const pairedRows = (ranges) => ranges.flatMap(([top, bottom]) => [
  [0, top, 400, bottom], [400, top, 800, bottom],
]);

const plans = [
  {
    caseId: "L001", psdPage: "02", publish: true, cover: 7, hero: 1,
    boxes: [...pairedRows([[488, 715], [751, 978], [1014, 1240]]), ...grid(3, 3, 0, 1282, 800, 1732)],
  },
  {
    caseId: "L002", psdPage: "04", publish: true, cover: 1, hero: 3,
    boxes: [...pairedRows([[488, 715], [751, 978], [1014, 1240]]), ...grid(3, 3, 0, 1282, 800, 1732)],
  },
  {
    caseId: "L003", psdPage: "05", publish: true, cover: 7, hero: 1,
    boxes: [...pairedRows([[488, 715], [751, 978], [1014, 1240]]), [0, 1282, 800, 1732]],
  },
  {
    caseId: "L004", psdPage: "06", publish: true, cover: 5, hero: 1,
    boxes: [...pairedRows([[488, 715], [751, 978]]), [0, 1102, 800, 1414], [0, 1507, 400, 1732], [400, 1507, 800, 1732]],
  },
  {
    caseId: "L005", psdPage: "07", publish: false, cover: 1, hero: 2,
    boxes: grid(3, 4),
    publicationNote: "Multi-brand logo collection remains Draft even though source assets are now recoverable.",
  },
  {
    caseId: "L006", psdPage: "08", publish: false, cover: 8, hero: 2,
    boxes: [...grid(3, 3, 0, 0, 800, 1299), ...grid(2, 1, 0, 1299, 800, 1732)],
    publicationNote: "Multi-brand logo collection remains Draft even though source assets are now recoverable.",
  },
  {
    caseId: "L007", psdPage: "09", publish: true, cover: 7, hero: 1,
    boxes: [[0, 0, 800, 257], [0, 435, 800, 594], [0, 692, 800, 845], [0, 963, 400, 1257], [400, 963, 800, 1257], [0, 1356, 400, 1677], [400, 1356, 800, 1677]],
  },
  {
    caseId: "L008", psdPage: "10", publish: true, cover: 2, hero: 3,
    boxes: [[0, 0, 800, 338], [0, 339, 800, 783], [0, 816, 800, 1226], [0, 1259, 800, 1732]],
  },
  {
    caseId: "L009", psdPage: "16", publish: true, cover: 1, hero: 3,
    boxes: [[0, 0, 400, 226], [400, 0, 800, 226], [0, 269, 800, 717]],
    publicationNote: "Only the hacinana panels were retained; unrelated Ms.Su and Klinic panels on the mixed PSD board were excluded.",
  },
];

const sourceFor = (page) => path.join(root, `旧案例/平面设计作品/CHIMxEVOK作品集-平面-含报价_页面_${page}.psd`);
const relative = (file) => path.relative(root, file).split(path.sep).join("/");
const digest = async (file) => createHash("sha256").update(await fs.readFile(file)).digest("hex");

const assets = [];
const cases = [];
for (const plan of plans) {
  const sourcePsd = sourceFor(plan.psdPage);
  const inspection = JSON.parse(await fs.readFile(path.join(root, `case-audit-v2/tmp/psd-inspection/CHIMxEVOK作品集-平面-含报价_页面_${plan.psdPage}.json`), "utf8"));
  if (inspection.top_level_layers !== 1) throw new Error(`${plan.caseId} is not a single-layer PSD`);

  const compositeDirectory = path.join(root, "case-audit-v3/tmp/psd-composites-corrected");
  const composite = path.join(compositeDirectory, `${plan.caseId}.png`);
  await fs.mkdir(compositeDirectory, { recursive: true });
  await run("sips", ["-s", "format", "png", sourcePsd, "--out", composite], { maxBuffer: 1024 * 1024 * 8 });
  const metadata = await sharp(composite).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Cannot read ${composite}`);

  const outputDirectory = path.join(root, "case-audit-v3/extracted-from-psd", plan.caseId);
  await fs.rm(outputDirectory, { recursive: true, force: true });
  await fs.mkdir(outputDirectory, { recursive: true });
  const caseAssets = [];
  for (const [index, box] of plan.boxes.entries()) {
    const [x0, y0, x1, y1] = box;
    const left = Math.max(0, Math.round((x0 / analysisWidth) * metadata.width));
    const top = Math.max(0, Math.round((y0 / analysisHeight) * metadata.height));
    const right = Math.min(metadata.width, Math.round((x1 / analysisWidth) * metadata.width));
    const bottom = Math.min(metadata.height, Math.round((y1 / analysisHeight) * metadata.height));
    const width = right - left;
    const height = bottom - top;
    if (width < 500 || height < 500) throw new Error(`Implausible crop for ${plan.caseId}: ${[left, top, width, height]}`);
    const output = path.join(outputDirectory, `asset_${String(index + 1).padStart(3, "0")}.png`);
    await sharp(composite).extract({ left, top, width, height }).png({ compressionLevel: 9, adaptiveFiltering: true }).toFile(output);
    const outputMetadata = await sharp(output).metadata();
    const record = {
      case_id: plan.caseId,
      asset_id: `${plan.caseId}-PSD-${String(index + 1).padStart(3, "0")}`,
      file: relative(output),
      source_psd: relative(sourcePsd),
      source_layer_count: 1,
      extraction_method: "whitespace_segmentation",
      bounding_box: [left, top, width, height],
      width: outputMetadata.width,
      height: outputMetadata.height,
      sha256: await digest(output),
      final_work_verified: true,
      visual_role: [index + 1 === plan.cover ? "cover_primary" : null, index + 1 === plan.hero ? "hero_primary" : null, "body"].filter(Boolean),
    };
    assets.push(record);
    caseAssets.push(record.file);
  }
  cases.push({
    case_id: plan.caseId,
    source_psd: relative(sourcePsd),
    source_asset_status: "READY_FROM_SOURCE",
    website_assets_ready: true,
    published: plan.publish,
    cover_asset: caseAssets[plan.cover - 1],
    hero_asset: caseAssets[plan.hero - 1],
    body_assets: caseAssets,
    publication_note: plan.publicationNote ?? null,
  });
}

const result = {
  schema_version: 1,
  generated_by: "case-audit-v3/tools/segment_flat_psds.mjs",
  method: "Single-layer PSD composite export followed by visually verified whitespace/grid segmentation.",
  processed_psd_count: plans.length,
  extracted_asset_count: assets.length,
  excluded_regions: [
    { case_id: "L009", source_psd: relative(sourceFor("16")), analysis_box: [0, 775, 800, 451], reason: "Ms.Su panel belongs to another brand and was visually excluded from hacinana." },
    { case_id: "L009", source_psd: relative(sourceFor("16")), analysis_box: [0, 1283, 800, 449], reason: "Klinic panel belongs to another brand and was visually excluded from hacinana." },
  ],
  cases,
  assets,
};
await fs.writeFile(path.join(root, "case-audit-v3/psd-segmentation-manifest.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ processed_psds: plans.length, extracted_assets: assets.length, ready_cases: cases.length, publishable_cases: cases.filter((item) => item.published).length }, null, 2));
