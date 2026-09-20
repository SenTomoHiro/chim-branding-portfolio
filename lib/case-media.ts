import type { CaseMedia, PortfolioCase } from "./types";

export function getRoleImages(media: CaseMedia[]) {
  const images = media.filter((asset) => asset.type === "image");
  return { cover: images[0], hero: images[1] };
}

export function getCaseCover(item: PortfolioCase) {
  return getRoleImages(item.media).cover;
}

export function getCaseHero(item: PortfolioCase) {
  return getRoleImages(item.media).hero;
}

export function getCaseBodyMedia(item: PortfolioCase): CaseMedia[] {
  const { cover, hero } = getRoleImages(item.media);
  return item.media.filter((asset) => asset.id !== cover?.id && asset.id !== hero?.id);
}

export function mediaRole(media: CaseMedia[], asset: CaseMedia): "cover" | "hero" | undefined {
  const roles = getRoleImages(media);
  return asset.id === roles.cover?.id ? "cover" : asset.id === roles.hero?.id ? "hero" : undefined;
}
