import type { Business, CaseCategory, ContentData, PortfolioCase } from "./types";
import { getPublishedCases } from "./sort-cases";
import { caseFullTitle } from "./case-title";

export type PdfImage = { id: string; src: string; label: string; chapter?: string };

export function resolvePortfolioPdfImages(item: PortfolioCase): PdfImage[] {
  let chapter = "";
  return item.media.flatMap((asset, index) => {
    if (asset.section) chapter = asset.section.title;
    return asset.type === "image" && asset.portfolioPdfSelected
      ? [{ id: asset.id, src: asset.src, label: `媒体 ${index + 1}`, chapter: chapter || undefined }]
      : [];
  });
}

export function initializePortfolioPdfSelection(item: PortfolioCase): PortfolioCase {
  if (!item.published) return item;
  const target = item.media.length >= 15 || item.media.filter((asset) => asset.section).length >= 3 ? 5 : 4;
  let selected = 0;
  return {
    ...item,
    media: item.media.map(({ portfolioPdfSelected: _selected, ...asset }) => {
      const choose = asset.type === "image" && selected < target;
      if (choose) selected += 1;
      return { ...asset, ...(choose ? { portfolioPdfSelected: true } : {}) };
    }),
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
