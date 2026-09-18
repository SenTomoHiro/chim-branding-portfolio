import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { AssetProvenance, ContentData } from "../lib/types";

type AuditCase = { case_id: string; cover_asset: string; hero_asset: string; body_assets: string[] };
type AuditAsset = {
  asset_id: string; file: string; source_pdf: string; source_page: number; source_object: string;
  extraction_method: string; width: number; height: number; sha256: string;
  classification: "final_design" | "mixed"; final_work_verified: true;
};

async function optimize(source: string, destination: string, kind: "cover" | "content") {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  let image = sharp(source, { failOn: "none" }).rotate();
  image = kind === "cover"
    ? image.resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
    : image.resize({ width: 2200, height: 2600, fit: "inside", withoutEnlargement: true });
  const info = await image.webp({ quality: kind === "cover" ? 84 : 86, alphaQuality: 95, smartSubsample: true }).toFile(destination);
  return { src: `/${path.relative(path.join(process.cwd(), "public"), destination).split(path.sep).join("/")}`, width: info.width, height: info.height };
}

function provenance(asset: AuditAsset): AssetProvenance {
  if (!asset.source_pdf.toLowerCase().endsWith(".pdf")) throw new Error(`Non-PDF V3 source rejected: ${asset.source_pdf}`);
  if (!asset.final_work_verified || asset.classification !== "final_design") throw new Error(`Unverified V3 asset rejected: ${asset.asset_id}`);
  return {
    assetId: asset.asset_id, sourceType: "pdf", sourcePdf: asset.source_pdf, sourcePage: asset.source_page,
    sourceObject: asset.source_object, extractionMethod: asset.extraction_method,
    width: asset.width, height: asset.height, sha256: asset.sha256,
    classification: asset.classification, finalWorkVerified: true,
  };
}

async function main() {
  const root = process.cwd();
  const contentPath = path.join(root, "data/content.json");
  const existing = JSON.parse(await fs.readFile(contentPath, "utf8")) as ContentData;
  const inventory = JSON.parse(await fs.readFile(path.join(root, "case-audit-v3/case-inventory-v3.json"), "utf8")) as { cases: AuditCase[] };
  const manifest = JSON.parse(await fs.readFile(path.join(root, "case-audit-v3/asset-manifest-v3.json"), "utf8")) as { assets: AuditAsset[] };
  const assetByFile = new Map(manifest.assets.map((asset) => [asset.file, asset]));
  const auditById = new Map(inventory.cases.map((item) => [item.case_id, item]));
  const newCaseIds = new Set(inventory.cases.map((item) => item.case_id));
  if (newCaseIds.size === 0) throw new Error("V3 inventory contains no discovered new cases.");

  const cases = [];
  for (const current of existing.cases) {
    if (!newCaseIds.has(current.id)) { cases.push(current); continue; }
    const audit = auditById.get(current.id);
    if (!audit) throw new Error(`Missing V3 audit for ${current.id}`);
    const mediaDirectory = path.join(root, "public/media/cases", current.id);
    const coverAsset = assetByFile.get(audit.cover_asset);
    const heroAsset = assetByFile.get(audit.hero_asset);
    if (!coverAsset || !heroAsset) throw new Error(`Missing V3 cover/hero provenance for ${current.id}`);
    const cover = await optimize(path.join(root, audit.cover_asset), path.join(mediaDirectory, "v3-cover.webp"), "cover");
    const hero = await optimize(path.join(root, audit.hero_asset), path.join(mediaDirectory, "v3-hero.webp"), "content");
    const bodyAssets = [];
    for (const [index, file] of audit.body_assets.entries()) {
      const asset = assetByFile.get(file);
      if (!asset) throw new Error(`Missing V3 body provenance: ${file}`);
      const media = await optimize(path.join(root, file), path.join(mediaDirectory, `v3-body-${String(index + 1).padStart(2, "0")}.webp`), "content");
      bodyAssets.push({ id: asset.asset_id, type: "image" as const, src: media.src, layout: index > 0 && index < 5 ? "half" as const : "full" as const, provenance: provenance(asset) });
    }
    cases.push({
      ...current,
      cover: cover.src, coverWidth: cover.width, coverHeight: cover.height,
      hero: hero.src, coverProvenance: provenance(coverAsset), heroProvenance: provenance(heroAsset), bodyAssets,
    });
  }

  const migratedIds = new Set(cases.filter((item) => newCaseIds.has(item.id)).map((item) => item.id));
  const missing = [...newCaseIds].filter((id) => !migratedIds.has(id));
  if (missing.length) throw new Error(`Existing content.json is missing discovered new cases: ${missing.join(", ")}`);
  const content: ContentData = { ...existing, cases };
  const temporary = `${contentPath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`);
  await fs.rename(temporary, contentPath);
  console.log(`Migrated ${newCaseIds.size} discovered new cases to V3 PDF-only assets; preserved business fields, ordering, versions, and legacy cases.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
