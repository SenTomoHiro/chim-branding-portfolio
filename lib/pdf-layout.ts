export type PdfLayoutName =
  | "feature"
  | "duo"
  | "stack-duo"
  | "asym-duo"
  | "dominant-trio"
  | "dominant-trio-reverse"
  | "wide-trio"
  | "mixed-four"
  | "grid-four";

export type RatioItem = { ratio: number };
export type PlannedPdfPage<T> = { images: T[]; layout: PdfLayoutName };
export type PdfPlanningOptions = { chapterStart?: boolean };

export function pdfOrientation(ratio: number) {
  if (ratio >= 1.36) return "wide" as const;
  if (ratio <= .78) return "portrait" as const;
  return "balanced" as const;
}

function isExtreme(item: RatioItem) {
  return item.ratio >= 2.15 || item.ratio <= .52;
}

function canPair([first, second]: RatioItem[]) {
  if (!first || !second) return false;
  const firstOrientation = pdfOrientation(first.ratio);
  const secondOrientation = pdfOrientation(second.ratio);
  const difference = Math.abs(first.ratio - second.ratio);
  if (isExtreme(first) || isExtreme(second)) return firstOrientation === secondOrientation && difference <= .28;
  if (firstOrientation === secondOrientation) return difference <= .55;
  if (firstOrientation === "wide" && secondOrientation === "portrait") return false;
  if (firstOrientation === "portrait" && secondOrientation === "wide") return false;
  return difference <= .82;
}

function canUseTrio(items: RatioItem[]) {
  if (items.length !== 3) return false;
  const orientations = items.map((item) => pdfOrientation(item.ratio));
  const wideCount = orientations.filter((orientation) => orientation === "wide").length;
  const portraitCount = orientations.filter((orientation) => orientation === "portrait").length;
  const ratios = items.map((item) => item.ratio);
  if (orientations[0] === "wide" && wideCount < 3 && items.slice(1).every((item) => !isExtreme(item))) return true;
  if (wideCount === 1 && portraitCount <= 1) {
    const supporting = items.filter((item) => pdfOrientation(item.ratio) !== "wide");
    return supporting.every((item) => !isExtreme(item));
  }
  if (items.some(isExtreme)) return false;
  if (wideCount > 1) return false;
  return Math.max(...ratios) - Math.min(...ratios) <= .62;
}

function canUseGrid(items: RatioItem[]) {
  if (items.length !== 4 || items.some(isExtreme)) return false;
  const ratios = items.map((item) => item.ratio);
  const orientations = new Set(items.map((item) => pdfOrientation(item.ratio)));
  return orientations.size === 1 && Math.max(...ratios) - Math.min(...ratios) <= .34;
}

function canUseMixedFour(items: RatioItem[]) {
  if (items.length !== 4 || pdfOrientation(items[0].ratio) !== "wide") return false;
  const supporting = items.slice(1);
  const ratios = supporting.map((item) => item.ratio);
  return supporting.every((item) => !isExtreme(item)) && Math.max(...ratios) - Math.min(...ratios) <= .55;
}

function batchSize<T extends RatioItem>(remaining: T[], chapterStart: boolean) {
  if (remaining.length === 1) return 1;
  if (chapterStart) return canPair(remaining.slice(0, 2)) ? 2 : 1;
  if (canUseMixedFour(remaining.slice(0, 4))) return 4;
  if (canUseGrid(remaining.slice(0, 4))) return 4;
  if (canUseTrio(remaining.slice(0, 3))) return 3;
  return canPair(remaining.slice(0, 2)) ? 2 : 1;
}

export function selectPdfLayout(items: RatioItem[], sequence: number): PdfLayoutName {
  if (items.length === 1) return "feature";
  if (items.length === 2) {
    const orientations = items.map((item) => pdfOrientation(item.ratio));
    if (orientations.every((orientation) => orientation === "wide")) return "stack-duo";
    if (orientations.every((orientation) => orientation === "portrait")) return "duo";
    return "asym-duo";
  }
  if (items.length === 3) {
    const orientations = items.map((item) => pdfOrientation(item.ratio));
    if (orientations[0] === "wide" && orientations.some((orientation) => orientation !== "wide")) return "wide-trio";
    if (orientations.filter((orientation) => orientation === "wide").length === 1) return "wide-trio";
    return sequence % 2 === 0 ? "dominant-trio" : "dominant-trio-reverse";
  }
  return canUseMixedFour(items) ? "mixed-four" : "grid-four";
}

export function planPdfMediaPages<T extends RatioItem>(items: T[], options: PdfPlanningOptions = {}): PlannedPdfPage<T>[] {
  const pages: PlannedPdfPage<T>[] = [];
  for (let index = 0; index < items.length;) {
    const take = batchSize(items.slice(index), Boolean(options.chapterStart && index === 0));
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
