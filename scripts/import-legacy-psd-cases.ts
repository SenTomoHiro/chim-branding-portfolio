import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { AssetProvenance, ContentData, PortfolioCase } from "../lib/types";
import { INITIAL_CATEGORIES } from "./taxonomy-map";

type SegmentAsset = {
  case_id: string; asset_id: string; file: string; source_psd: string; source_layer_count: number;
  extraction_method: "whitespace_segmentation"; bounding_box: [number, number, number, number];
  width: number; height: number; sha256: string; final_work_verified: true;
};
type SegmentCase = {
  case_id: string; published: boolean; cover_asset: string; hero_asset: string; body_assets: string[];
};
type LegacyAudit = {
  case_id: string; name: string; industry_primary: string;
};

const slugs: Record<string, string> = {
  L001: "l001-space-bunnies", L002: "l002-huananxing", L003: "l003-coffee-forty",
  L004: "l004-maxdona", L005: "l005-logo-collection-1", L006: "l006-logo-collection-2",
  L007: "l007-dimai-cat-food", L008: "l008-pangfu-mooncake", L009: "l009-hacinana",
};
const root = process.cwd();

async function optimize(source: string, destination: string, kind: "cover" | "content") {
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const info = await sharp(source).rotate().resize(kind === "cover"
    ? { width: 1400, height: 1800, fit: "inside", withoutEnlargement: true }
    : { width: 2200, height: 2600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: kind === "cover" ? 84 : 86, alphaQuality: 95, smartSubsample: true })
    .toFile(destination);
  return { src: `/${path.relative(path.join(root, "public"), destination).split(path.sep).join("/")}`, width: info.width, height: info.height };
}

function provenance(asset: SegmentAsset): AssetProvenance {
  if (!/\.psd$/i.test(asset.source_psd) || asset.extraction_method !== "whitespace_segmentation" || asset.final_work_verified !== true) {
    throw new Error(`Invalid PSD provenance for ${asset.asset_id}`);
  }
  return {
    assetId: asset.asset_id, sourceType: "psd", sourcePsd: asset.source_psd,
    sourceLayerCount: asset.source_layer_count, boundingBox: asset.bounding_box,
    extractionMethod: asset.extraction_method, width: asset.width, height: asset.height,
    sha256: asset.sha256, classification: "final_design", finalWorkVerified: true,
  };
}

async function main() {
  const contentPath = path.join(root, "data/content.json");
  const content = JSON.parse(await fs.readFile(contentPath, "utf8")) as ContentData;
  const segmentation = JSON.parse(await fs.readFile(path.join(root, "case-audit-v3/psd-segmentation-manifest.json"), "utf8")) as { cases: SegmentCase[]; assets: SegmentAsset[] };
  const v2 = JSON.parse(await fs.readFile(path.join(root, "case-audit-v2/case-inventory-v2.json"), "utf8")) as { cases: LegacyAudit[] };
  const assetByFile = new Map(segmentation.assets.map((asset) => [asset.file, asset]));
  const auditById = new Map(v2.cases.map((item) => [item.case_id, item]));
  const currentById = new Map(content.cases.map((item) => [item.id, item]));
  const imported: PortfolioCase[] = [];

  for (const recovered of segmentation.cases) {
    const audit = auditById.get(recovered.case_id);
    if (!audit) throw new Error(`Missing V2 metadata for ${recovered.case_id}`);
    const current = currentById.get(recovered.case_id);
    const coverAsset = assetByFile.get(recovered.cover_asset);
    const heroAsset = assetByFile.get(recovered.hero_asset);
    if (!coverAsset || !heroAsset) throw new Error(`Missing cover/hero asset for ${recovered.case_id}`);
    const mediaDirectory = path.join(root, "public/media/cases", recovered.case_id);
    const cover = await optimize(path.join(root, coverAsset.file), path.join(mediaDirectory, "psd-cover.webp"), "cover");
    const hero = await optimize(path.join(root, heroAsset.file), path.join(mediaDirectory, "psd-hero.webp"), "content");
    const bodyAssets = [];
    for (const [index, file] of recovered.body_assets.entries()) {
      const asset = assetByFile.get(file);
      if (!asset) throw new Error(`Missing segmented asset ${file}`);
      const media = await optimize(path.join(root, file), path.join(mediaDirectory, `psd-body-${String(index + 1).padStart(2, "0")}.webp`), "content");
      bodyAssets.push({ id: asset.asset_id, type: "image" as const, src: media.src, layout: index > 0 && index < 5 ? "half" as const : "full" as const, provenance: provenance(asset) });
    }
    imported.push({
      id: recovered.case_id,
      slug: current?.slug ?? slugs[recovered.case_id],
      name: current?.name ?? audit.name,
      intro: current?.intro ?? `${audit.name}的品牌视觉与平面设计案例。`,
      business: "branding",
      categories: current?.categories ?? INITIAL_CATEGORIES[recovered.case_id],
      primaryIndustry: current?.primaryIndustry ?? audit.industry_primary,
      cover: cover.src, coverWidth: cover.width, coverHeight: cover.height, hero: hero.src,
      coverProvenance: provenance(coverAsset), heroProvenance: provenance(heroAsset), bodyAssets,
      published: current?.published ?? recovered.published,
    });
  }

  const importedById = new Map(imported.map((item) => [item.id, item]));
  const cases = content.cases.map((item) => importedById.get(item.id) ?? item);
  for (const item of imported) if (!content.cases.some((current) => current.id === item.id)) cases.push(item);
  const defaultOrder = [...content.defaultOrder];
  for (const item of imported) if (!defaultOrder.includes(item.id)) defaultOrder.push(item.id);
  const result: ContentData = { ...content, cases, defaultOrder };
  const temporary = `${contentPath}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`);
  await fs.rename(temporary, contentPath);
  console.log(`Imported ${imported.length} recovered PSD cases; ${imported.filter((item) => item.published).length} published and ${imported.filter((item) => !item.published).length} draft. Existing taxonomy and ordering were preserved.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
