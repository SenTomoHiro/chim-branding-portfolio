import type { BodyAsset, Business, CaseCategory, ContentData, PortfolioCase } from "./types";
import { getPublishedCases } from "./sort-cases";
import { caseFullTitle } from "./case-title";

export const PDF_HERO_REF = "hero";
export const PDF_COVER_REF = "cover";

export type PdfImage = {
  id: string;
  src: string;
  label: string;
  chapter?: string;
};

export function resolvePortfolioPdfImages(item: PortfolioCase): PdfImage[] {
  const images: PdfImage[] = [];
  if (item.portfolioPdfHeroSelected && item.hero) images.push({ id: PDF_HERO_REF, src: item.hero, label: "Hero / 首图" });
  if (item.portfolioPdfCoverSelected && item.cover) images.push({ id: PDF_COVER_REF, src: item.cover, label: "案例列表封面" });
  let chapter = "";
  item.bodyAssets.forEach((asset, index) => {
    if (asset.section) chapter = asset.section.title;
    if (asset.type === "image" && asset.portfolioPdfSelected) images.push({ id: asset.id, src: asset.src, label: `正文图片 ${index + 1}`, chapter: chapter || undefined });
  });
  return images;
}

export function initializePortfolioPdfSelection(item: PortfolioCase): PortfolioCase {
  if (!item.published) return item;
  const target = item.bodyAssets.length >= 15 || item.bodyAssets.filter((asset) => asset.section).length >= 3 ? 5 : 4;
  const selected = new Set<string>();
  const sources = new Set<string>();
  const add = (id: string, src: string) => {
    if (!src || sources.has(src) || selected.size >= target) return;
    selected.add(id);
    sources.add(src);
  };

  add(PDF_HERO_REF, item.hero);
  let activeChapter = "";
  const chapterRepresentatives = new Map<string, BodyAsset>();
  for (const asset of item.bodyAssets) {
    if (asset.section) activeChapter = asset.id;
    if (asset.type === "image" && activeChapter && !chapterRepresentatives.has(activeChapter)) chapterRepresentatives.set(activeChapter, asset);
  }
  for (const asset of chapterRepresentatives.values()) add(asset.id, asset.src);
  for (const asset of item.bodyAssets) if (asset.type === "image") add(asset.id, asset.src);
  add(PDF_COVER_REF, item.cover);
  return {
    ...item,
    portfolioPdfHeroSelected: selected.has(PDF_HERO_REF),
    portfolioPdfCoverSelected: selected.has(PDF_COVER_REF),
    bodyAssets: item.bodyAssets.map(({ portfolioPdfSelected: _selected, ...asset }) => ({ ...asset, ...(asset.type === "image" && selected.has(asset.id) ? { portfolioPdfSelected: true } : {}) })),
  };
}

export function getPortfolioPdfCases(data: ContentData, business: Business, category?: CaseCategory): PortfolioCase[] {
  return getPublishedCases(data.cases, data, { business, category }).filter((item) => item.includeInPortfolioPdf);
}

export function assertPdfConfiguration(data: ContentData) {
  for (const item of data.cases) {
    if (!item.published || !item.includeInPortfolioPdf) continue;
    if (!resolvePortfolioPdfImages(item).length) throw new Error(`案例“${caseFullTitle(item)}”已加入总作品集 PDF，但没有精选图片`);
  }
}
