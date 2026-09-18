import type { AssetProvenance, Business, CaseCategory, ContentData, PortfolioCase } from "./types";
import { BUSINESSES, CASE_CATEGORIES } from "./taxonomy";

const slugPattern = /^[\p{L}\p{N}]+(?:[-·][\p{L}\p{N}]+)*$/u;
const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
const businessValues = new Set<string>(BUSINESSES.map((item) => item.value));
const categoryValues = new Set<string>(CASE_CATEGORIES.map((item) => item.value));
const provenance = (value: unknown): AssetProvenance | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const item = value as Record<string, unknown>;
  if (item.finalWorkVerified !== true || (item.classification !== "final_design" && item.classification !== "mixed")) return undefined;
  const boundingBox = Array.isArray(item.boundingBox) && item.boundingBox.length === 4
    ? item.boundingBox.map(Number) as [number, number, number, number]
    : undefined;
  return {
    assetId: String(item.assetId || ""),
    sourceType: item.sourceType === "psd" ? "psd" : item.sourceType === "pdf" ? "pdf" : item.sourceType === "ai" ? "ai" : undefined,
    sourcePdf: typeof item.sourcePdf === "string" && item.sourcePdf ? item.sourcePdf : undefined,
    sourcePage: Number.isFinite(Number(item.sourcePage)) ? Number(item.sourcePage) : undefined,
    sourceObject: typeof item.sourceObject === "string" && item.sourceObject ? item.sourceObject : undefined,
    sourcePsd: typeof item.sourcePsd === "string" && item.sourcePsd ? item.sourcePsd : undefined,
    sourceAi: typeof item.sourceAi === "string" && item.sourceAi ? item.sourceAi : undefined,
    sourceArtboard: Number.isFinite(Number(item.sourceArtboard)) ? Number(item.sourceArtboard) : undefined,
    sourceXref: Number.isFinite(Number(item.sourceXref)) ? Number(item.sourceXref) : undefined,
    sourceLayerCount: Number.isFinite(Number(item.sourceLayerCount)) ? Number(item.sourceLayerCount) : undefined,
    boundingBox,
    extractionMethod: String(item.extractionMethod || ""),
    width: Number(item.width), height: Number(item.height), sha256: String(item.sha256 || ""),
    classification: item.classification, finalWorkVerified: true,
  };
};

export function parseCase(value: unknown, existing?: PortfolioCase): PortfolioCase {
  if (!value || typeof value !== "object") throw new Error("案例数据无效");
  const input = value as Record<string, unknown>;
  const name = String(input.name || "").trim();
  const slug = String(input.slug || "").trim().toLowerCase();
  if (!name) throw new Error("请输入案例名称");
  if (!slugPattern.test(slug)) throw new Error("Slug 仅支持中英文字母、数字、连字符与间隔点");
  const business = String(input.business || "") as Business;
  if (!businessValues.has(business)) throw new Error("请选择所属业务");
  const submittedCategories = [...new Set(strings(input.categories))];
  if (business === "branding" && (!submittedCategories.length || submittedCategories.some((item) => !categoryValues.has(item)))) throw new Error("品牌设计请至少选择一个有效分类");
  const categories = business === "photography" ? [] : submittedCategories;
  const bodyAssets = Array.isArray(input.bodyAssets) ? input.bodyAssets.filter((item) => item && typeof item === "object").map((item, index) => {
    const media = item as Record<string, unknown>;
    return { id: String(media.id || `${Date.now()}-${index}`), type: media.type === "video" ? "video" as const : "image" as const, src: String(media.src || ""), layout: media.layout === "half" ? "half" as const : "full" as const, provenance: provenance(media.provenance) };
  }).filter((item) => item.src) : [];
  return {
    id: existing?.id || String(input.id || `C${Date.now()}`), slug, name,
    intro: String(input.intro || "").trim(), business,
    categories: categories as CaseCategory[], primaryIndustry: String(input.primaryIndustry || "").trim(),
    cover: String(input.cover || ""),
    coverWidth: Number(input.coverWidth) > 0 ? Number(input.coverWidth) : existing?.coverWidth || 1400,
    coverHeight: Number(input.coverHeight) > 0 ? Number(input.coverHeight) : existing?.coverHeight || 1050,
    hero: String(input.hero || ""),
    coverProvenance: provenance(input.coverProvenance),
    heroProvenance: provenance(input.heroProvenance),
    bodyAssets, published: Boolean(input.published),
  };
}

export function assertUniqueSlug(data: ContentData, item: PortfolioCase) {
  if (data.cases.some((entry) => entry.slug === item.slug && entry.id !== item.id)) throw new Error("Slug 已被其他案例使用");
}
