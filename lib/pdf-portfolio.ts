import type { BodyAsset, ContentData, PortfolioCase } from "./types";
import { getPublishedCases } from "./sort-cases";

export const PDF_HERO_REF = "hero";
export const PDF_COVER_REF = "cover";

export type PdfImage = {
  id: string;
  src: string;
  label: string;
  chapter?: string;
};

export function getPdfImageCandidates(item: PortfolioCase): PdfImage[] {
  const candidates: PdfImage[] = [];
  const add = (candidate: PdfImage) => {
    if (!candidate.src) return;
    candidates.push(candidate);
  };

  add({ id: PDF_HERO_REF, src: item.hero, label: "Hero / 首图" });
  add({ id: PDF_COVER_REF, src: item.cover, label: "案例列表封面" });
  let chapter = "";
  item.bodyAssets.forEach((asset, index) => {
    if (asset.section) chapter = asset.section.title;
    if (asset.type === "image") add({ id: asset.id, src: asset.src, label: `正文图片 ${index + 1}`, chapter: chapter || undefined });
  });
  return candidates;
}

export function resolvePortfolioPdfImages(item: PortfolioCase): PdfImage[] {
  const candidates = new Map(getPdfImageCandidates(item).map((image) => [image.id, image]));
  return item.portfolioPdfImageIds.map((id) => {
    const image = candidates.get(id);
    if (!image) throw new Error(`案例“${item.name}”的总作品集 PDF 精选图片引用不存在：${id}`);
    return image;
  });
}

export function createInitialPortfolioPdfSelection(item: PortfolioCase): string[] {
  if (!item.published) return [];
  const target = item.bodyAssets.length >= 15 || item.bodyAssets.filter((asset) => asset.section).length >= 3 ? 5 : 4;
  const selected: string[] = [];
  const sources = new Set<string>();
  const add = (id: string, src: string) => {
    if (!src || sources.has(src) || selected.length >= target) return;
    selected.push(id);
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
  return selected;
}

export function getPortfolioPdfCases(data: ContentData): PortfolioCase[] {
  return [
    ...getPublishedCases(data.cases, data, { business: "branding" }),
    ...getPublishedCases(data.cases, data, { business: "photography" }),
  ].filter((item) => item.includeInPortfolioPdf);
}

export function assertPdfConfiguration(data: ContentData) {
  for (const item of data.cases) {
    if (!item.published || !item.includeInPortfolioPdf) continue;
    if (!item.portfolioPdfImageIds.length) throw new Error(`案例“${item.name}”已加入总作品集 PDF，但没有精选图片`);
    if (new Set(item.portfolioPdfImageIds).size !== item.portfolioPdfImageIds.length) throw new Error(`案例“${item.name}”的总作品集 PDF 精选图片存在重复引用`);
    resolvePortfolioPdfImages(item);
  }
}
