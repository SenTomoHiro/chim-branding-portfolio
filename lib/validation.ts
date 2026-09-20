import type { AssetProvenance, Business, CaseCategory, ContentData, PortfolioCase } from "./types";
import { renumberChapters } from "./chapters";
import { BUSINESSES, CASE_CATEGORIES } from "./taxonomy";
import { resolvePortfolioPdfImages } from "./pdf-portfolio";
import { getRoleImages } from "./case-media";

const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
const businessValues = new Set<string>(BUSINESSES.map((item) => item.value));
const categoryValues = new Set<string>(CASE_CATEGORIES.map((item) => item.value));
const mediaSection = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;
  const section = value as Record<string, unknown>;
  const title = String(section.title || "").trim();
  if (!title) return undefined;
  const description = String(section.description || "").trim();
  return { eyebrow: String(section.eyebrow || "").trim(), title, description: description || undefined };
};
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
  const brandName = String(input.brandName || "").trim();
  const projectName = String(input.projectName || "").trim();
  if (!brandName) throw new Error("请输入品牌名");
  const business = String(input.business || "") as Business;
  if (!businessValues.has(business)) throw new Error("请选择所属业务");
  const submittedCategories = [...new Set(strings(input.categories))];
  if (business === "branding" && (!submittedCategories.length || submittedCategories.some((item) => !categoryValues.has(item)))) throw new Error("品牌设计请至少选择一个有效分类");
  const categories = business === "photography" ? [] : submittedCategories;
  const media = renumberChapters(Array.isArray(input.media) ? input.media.filter((item) => item && typeof item === "object").map((item, index) => {
    const media = item as Record<string, unknown>;
    const type = media.type === "video" ? "video" as const : "image" as const;
    return { id: String(media.id || `${Date.now()}-${index}`), type, src: String(media.src || ""), layout: media.layout === "half" ? "half" as const : "full" as const, width: Number(media.width) > 0 ? Number(media.width) : undefined, height: Number(media.height) > 0 ? Number(media.height) : undefined, ...(type === "image" && Boolean(media.portfolioPdfSelected) ? { portfolioPdfSelected: true } : {}), section: mediaSection(media.section), provenance: provenance(media.provenance) };
  }).filter((item) => item.src) : []);
  const result: PortfolioCase = {
    id: existing?.id || String(input.id || `C${Date.now()}`), brandName, projectName,
    intro: String(input.intro || "").trim(), business,
    categories: categories as CaseCategory[], primaryIndustry: String(input.primaryIndustry || "").trim(),
    media, published: Boolean(input.published),
    includeInPortfolioPdf: Boolean(input.includeInPortfolioPdf),
  };
  const roles = getRoleImages(result.media);
  if (result.published && (!roles.cover || !roles.hero)) throw new Error("已发布案例至少需要 2 张图片（封面与详情页首图）");
  if (result.includeInPortfolioPdf && result.published && !resolvePortfolioPdfImages(result).length) throw new Error("加入总作品集 PDF 的已发布案例至少需要选择一张精选图片");
  return result;
}

export function assertUniqueTitle(data: ContentData, item: PortfolioCase) {
  if (data.cases.some((entry) => entry.brandName === item.brandName && entry.projectName === item.projectName && entry.id !== item.id)) throw new Error("品牌名与项目名组合已存在，请使用唯一标题。");
}
