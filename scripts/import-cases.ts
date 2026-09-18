import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { ContentData, PortfolioCase } from "../lib/types";

const PUBLIC_IDS = ["N001","N002","N003","N004","N005","N006","N007","N008","N009","N010","N011","N012","N013","N014","N015","N016","N017","N018","N019","N020","L010","L011","L012"];
const DEFAULT_ORDER = ["N013","N014","N005","N016","N017","N011","N009","N006","N003","N012","N001","N004","N019","N008","N002","N015","N018","N010","N007","N020","L012","L010","L011"];
const VERSIONS = [
  { slug: "food", name: "Food", enabled: true, priorityCaseIds: ["N017","N003","N013","N009","N004","N007","N019","N020","N015","N018","N008","N010"] },
  { slug: "drinks", name: "Drinks", enabled: true, priorityCaseIds: ["N002","N012","L012","N006","L011","N001","L010","N014","N005","N011"] },
  { slug: "ip", name: "IP", enabled: true, priorityCaseIds: ["N013","N011","N006","N001","N020","N005","N012","N004","N008","N010"] },
  { slug: "premium", name: "Premium", enabled: true, priorityCaseIds: ["N014","N016","N009","N003","N015","N018"] },
];

type AuditCase = {
  case_id: string; name: string; industry_primary: string; industry_tags: string[];
  design_primary: string; design_tags: string[]; cover_asset: string; hero_asset: string; body_assets: string[];
};

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || value.toLowerCase();

async function optimize(source: string, targetBase: string, kind: "cover" | "content") {
  const destination = `${targetBase}.webp`;
  await fs.mkdir(path.dirname(destination), { recursive: true });
  let image = sharp(source, { failOn: "none" }).rotate();
  image = kind === "cover"
    ? image.resize({ width: 1400, height: 1800, fit: "inside", withoutEnlargement: true })
    : image.resize({ width: 2200, height: 2600, fit: "inside", withoutEnlargement: true });
  const info = await image.webp({ quality: kind === "cover" ? 84 : 86, alphaQuality: 95, smartSubsample: true }).toFile(destination);
  return { src: `/${path.relative(path.join(process.cwd(), "public"), destination).split(path.sep).join("/")}`, width: info.width, height: info.height };
}

async function main() {
  const root = process.cwd();
  const inventory = JSON.parse(await fs.readFile(path.join(root, "case-audit-v2/case-inventory-v2.json"), "utf8"));
  const selected = (inventory.cases as AuditCase[]).filter((item) => PUBLIC_IDS.includes(item.case_id));
  if (selected.length !== PUBLIC_IDS.length) throw new Error(`Expected ${PUBLIC_IDS.length} cases, found ${selected.length}.`);
  const oldPath = path.join(root, "data/content.json");
  let existing: ContentData | undefined;
  try { existing = JSON.parse(await fs.readFile(oldPath, "utf8")); } catch {}

  const cases: PortfolioCase[] = [];
  for (const item of selected) {
    const directory = path.join(root, "public/media/cases", item.case_id);
    const cover = await optimize(path.join(root, item.cover_asset), path.join(directory, "cover"), "cover");
    const hero = await optimize(path.join(root, item.hero_asset), path.join(directory, "hero"), "content");
    const bodyAssets = [];
    for (const [index, file] of item.body_assets.entries()) {
      const media = await optimize(path.join(root, file), path.join(directory, `body-${String(index + 1).padStart(2, "0")}`), "content");
      bodyAssets.push({ id: `${item.case_id}-body-${index + 1}`, type: "image" as const, src: media.src, layout: index > 0 && index < 5 ? "half" as const : "full" as const });
    }
    const old = existing?.cases.find((entry) => entry.id === item.case_id);
    cases.push({
      id: item.case_id,
      slug: old?.slug || `${item.case_id.toLowerCase()}-${slugify(item.name)}`,
      name: old?.name || item.name,
      intro: old?.intro || `${item.industry_primary}品牌视觉与${item.design_primary}设计。`,
      industryPrimary: old?.industryPrimary || item.industry_primary,
      industryTags: old?.industryTags || item.industry_tags,
      designPrimary: old?.designPrimary || item.design_primary,
      designTags: old?.designTags || item.design_tags,
      cover: cover.src, coverWidth: cover.width, coverHeight: cover.height, hero: hero.src, bodyAssets: old?.bodyAssets || bodyAssets, published: old?.published ?? true,
    });
  }
  const content: ContentData = {
    cases,
    defaultOrder: existing?.defaultOrder?.length ? existing.defaultOrder.filter((id) => cases.some((item) => item.id === id)).concat(cases.map((item) => item.id).filter((id) => !existing!.defaultOrder.includes(id))) : DEFAULT_ORDER,
    versions: existing?.versions?.length ? existing.versions : VERSIONS,
  };
  await fs.mkdir(path.dirname(oldPath), { recursive: true });
  const temp = `${oldPath}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(content, null, 2)}\n`);
  await fs.rename(temp, oldPath);
  console.log(`Imported ${cases.length} cases and ${cases.reduce((sum, item) => sum + item.bodyAssets.length + 2, 0)} optimized media files.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
