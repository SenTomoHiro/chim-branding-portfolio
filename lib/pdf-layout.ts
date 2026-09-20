export type PdfLayoutName =
  | "feature"
  | "duo"
  | "asym-duo"
  | "dominant-trio"
  | "dominant-trio-reverse"
  | "grid-four"
  | "asym-quad"
  | "contact-five"
  | "contact-six";

export type RatioItem = { ratio: number };
export type PlannedPdfPage<T> = { images: T[]; layout: PdfLayoutName };

export function pdfOrientation(ratio: number) {
  if (ratio >= 1.36) return "wide" as const;
  if (ratio <= .78) return "portrait" as const;
  return "balanced" as const;
}

function canUseContactSheet(items: RatioItem[]) {
  if (items.length < 5 || items.length > 6) return false;
  const ratios = items.map((item) => item.ratio);
  return Math.max(...ratios) - Math.min(...ratios) <= .55 && ratios.every((ratio) => ratio >= .68 && ratio <= 1.55);
}

function batchSize<T extends RatioItem>(remaining: T[]) {
  if (remaining.length <= 4) return remaining.length;
  if (remaining.length <= 6 && canUseContactSheet(remaining)) return remaining.length;
  if (remaining.length === 5 || remaining.length === 6) return 3;
  return 4;
}

export function selectPdfLayout(items: RatioItem[], sequence: number): PdfLayoutName {
  if (items.length === 1) return "feature";
  if (items.length === 2) {
    const orientations = new Set(items.map((item) => pdfOrientation(item.ratio)));
    return orientations.size > 1 || sequence % 2 === 1 ? "asym-duo" : "duo";
  }
  if (items.length === 3) return sequence % 2 === 0 ? "dominant-trio" : "dominant-trio-reverse";
  if (items.length === 4) {
    const orientations = new Set(items.map((item) => pdfOrientation(item.ratio)));
    return orientations.size > 1 || sequence % 2 === 1 ? "asym-quad" : "grid-four";
  }
  return items.length === 5 ? "contact-five" : "contact-six";
}

export function planPdfMediaPages<T extends RatioItem>(items: T[]): PlannedPdfPage<T>[] {
  const pages: PlannedPdfPage<T>[] = [];
  for (let index = 0; index < items.length;) {
    const take = batchSize(items.slice(index));
    const images = items.slice(index, index + take);
    pages.push({ images, layout: selectPdfLayout(images, pages.length) });
    index += take;
  }
  return pages;
}

export function splitPdfTitle(title: string) {
  const spacedSeparator = title.match(/^(.+?)\s+[·/]\s+(.+)$/);
  if (spacedSeparator) return { primary: spacedSeparator[1].trim(), secondary: spacedSeparator[2].trim() };
  const compactSeparator = title.match(/^(.+?)[·×](.+)$/);
  if (compactSeparator) return { primary: compactSeparator[1].trim(), secondary: compactSeparator[2].trim() };
  const mixedLanguage = title.match(/^(.+?[\p{Script=Han}])\s+([A-Za-z0-9].+)$/u);
  if (mixedLanguage) return { primary: mixedLanguage[1].trim(), secondary: mixedLanguage[2].trim() };
  return { primary: title.trim(), secondary: "" };
}

export function pdfTitleDensity(title: string) {
  const length = Array.from(title).length;
  if (length > 28) return "isDense";
  if (length > 17) return "isCompact";
  return "";
}
