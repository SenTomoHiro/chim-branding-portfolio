import { layoutPdfMasonry, PDF_CONTENT_WIDTH_MM, PDF_WATERFALL_GAP_MM, PDF_WATERFALL_COLUMN_WIDTH_MM, type PdfMasonryImage } from "./pdf-masonry";

export type EditorialImage = PdfMasonryImage & { layout: "full" | "half" };
export type EditorialComposition = {
  kind: "full" | "pair" | "masonry";
  reason: string;
  images: EditorialImage[];
  height: number;
  placements: { id: string; left: number; top: number; width: number; height: number; column?: 0 | 1 }[];
};
function full(image: EditorialImage, reason: string): EditorialComposition {
  // A standalone row uses the entire content width, never a small centered image.
  const width = PDF_CONTENT_WIDTH_MM;
  const height = width / image.ratio;
  return { kind: "full", reason, images: [image], height, placements: [{ id: image.id, left: (PDF_CONTENT_WIDTH_MM - width) / 2, top: 0, width, height }] };
}

function pair(images: EditorialImage[], reason: string): EditorialComposition {
  // Justified pair: real ratios, equal bottoms, no cropping or vacant half-row.
  const height = (PDF_CONTENT_WIDTH_MM - PDF_WATERFALL_GAP_MM) / (images[0].ratio + images[1].ratio);
  const firstWidth = height * images[0].ratio;
  return { kind: "pair", reason, images, height, placements: images.map((image, column) => ({ id: image.id, left: column === 0 ? 0 : firstWidth + PDF_WATERFALL_GAP_MM, top: 0, width: height * image.ratio, height, column: column as 0 | 1 })) };
}

function run(images: EditorialImage[]): EditorialComposition {
  const result = layoutPdfMasonry(images);
  return { kind: "masonry", reason: "dense-run", images, ...result };
}

type EditorialOptions = { chapter?: boolean; portfolio?: boolean };

function initialPlan(images: EditorialImage[], options: EditorialOptions): EditorialComposition[] {
  for (const image of images) if (!Number.isFinite(image.ratio) || image.ratio <= 0) throw new Error(`PDF 图片尺寸无效：${image.id}`);
  // A lone selection cannot be paired across a chapter boundary. Preserve its
  // intrinsic ratio at full width, even if that costs more vertical space.
  if (options.portfolio && images.length === 1) return [full(images[0], "chapter-single")];
  const result: EditorialComposition[] = [];
  let pending: EditorialImage[] = [];
  const flush = () => {
    if (pending.length === 1) result.push(full(pending[0], "isolated-half"));
    else if (pending.length === 2 && Math.max(...pending.map(i => i.ratio)) / Math.min(...pending.map(i => i.ratio)) <= 2.5) result.push(pair(pending, "balanced-pair"));
    else if (pending.length) result.push(run(pending));
    pending = [];
  };
  // Uniform 'full' on a long legacy group has no relative emphasis signal.
  // Mixed intent is honored; dense uniform groups retain masonry with one ending.
  const mixedIntent = images.some(i => i.layout === "half");
  images.forEach((image, index) => {
    const scalable = image.ratio >= 0.85 && image.ratio <= 2.4;
    const chapterLead = options.chapter && index === 0 && image.ratio >= 1 && scalable;
    const explicitFull = image.layout === "full" && scalable && (mixedIntent || images.length <= 3);
    const ending = !mixedIntent && images.length >= 6 && index === images.length - 1 && image.ratio >= 1.4 && scalable;
    const panorama = image.ratio > 2.4 && image.ratio <= 3.5;
    // Portfolio intent is a compact visual summary: portrait pairs and landscape accents.
    const breakout = options.portfolio ? (images.length === 1 || (image.layout === "full" && image.ratio >= 1.4 && mixedIntent)) : chapterLead || explicitFull || ending || panorama;
    if (breakout) {
      flush();
      result.push(full(image, chapterLead ? "chapter-lead" : ending ? "landscape-ending" : panorama ? "wide-detail" : "full-intent"));
    } else pending.push(image);
  });
  flush();
  return result;
}

export function pdfEditorialHeight(plan: EditorialComposition[]) {
  return plan.reduce((height, block, i) => height + block.height + (i ? block.kind === "full" || plan[i - 1].kind === "full" ? 8 : PDF_WATERFALL_GAP_MM : 0), 0);
}

function compactRun(images: EditorialImage[], reason: string) {
  const suitablePair = images.length === 2 && Math.max(...images.map(i => i.ratio)) / Math.min(...images.map(i => i.ratio)) <= 2.5;
  return suitablePair ? pair(images, reason) : { ...run(images), reason };
}

function guardGroup(images: EditorialImage[], initial: EditorialComposition[]) {
  let plan = initial;
  const masonryHeight = layoutPdfMasonry(images).height;
  // The ratio is only a candidate signal. Require a material absolute cost,
  // an automatic source, and NO full intent before making a local change.
  const automatic = (block: EditorialComposition) => block.kind === "full" && block.images[0].layout === "half" && ["chapter-lead", "isolated-half", "chapter-single"].includes(block.reason);
  for (const candidate of initial) {
    if (pdfEditorialHeight(plan) <= masonryHeight * 1.2 || pdfEditorialHeight(plan) - masonryHeight <= PDF_WATERFALL_GAP_MM * 2) break;
    if (!automatic(candidate)) continue;
    const index = plan.indexOf(candidate);
    if (index < 0) continue;
    let start = index, end = index + 1;
    if (index > 0 && (plan[index - 1].kind !== "full" || automatic(plan[index - 1]))) start -= 1;
    if (index + 1 < plan.length && (plan[index + 1].kind !== "full" || automatic(plan[index + 1]))) end += 1;
    const joined = plan.slice(start, end).flatMap(block => block.images);
    // Only a same-chapter Pair/Masonry can reduce this cost. If there is no
    // compatible neighbor, keep the standalone image full width.
    if (joined.length === 1) continue;
    const replacement = compactRun(joined, "height-guard-local-run");
    const next = [...plan.slice(0, start), replacement, ...plan.slice(end)];
    if (pdfEditorialHeight(plan) - pdfEditorialHeight(next) > PDF_WATERFALL_GAP_MM * 2) plan = next;
  }
  return plan;
}

export function planPdfEditorial(images: EditorialImage[], options: EditorialOptions = {}) {
  return guardGroup(images, initialPlan(images, options));
}

export function planPdfEditorialGroups(groups: { images: EditorialImage[]; chapter?: boolean }[], options: { portfolio?: boolean } = {}) {
  const initial = groups.map(group => initialPlan(group.images, { ...options, chapter: group.chapter }));
  const plans = groups.map((group, i) => guardGroup(group.images, initial[i]));
  const images = groups.flatMap(group => group.images);
  const masonryHeight = layoutPdfMasonry(images).height; // Reference only: NEVER pair across chapters.
  const initialHeight = initial.reduce((sum, plan) => sum + pdfEditorialHeight(plan), 0) + Math.max(0, groups.length - 1) * 8;
  let gapMm = 8;
  const currentHeight = plans.reduce((sum, plan) => sum + pdfEditorialHeight(plan), 0) + Math.max(0, groups.length - 1) * gapMm;
  const fragmented = groups.length >= 3 && groups.filter(group => group.images.length === 1).length >= 2;
  if (options.portfolio && fragmented && currentHeight > masonryHeight * 1.2 && currentHeight - masonryHeight > PDF_WATERFALL_COLUMN_WIDTH_MM / 3) {
    // Reuse the standard masonry gap, not a threshold-chasing case rollback.
    gapMm = PDF_WATERFALL_GAP_MM;
  }
  const height = plans.reduce((sum, plan) => sum + pdfEditorialHeight(plan), 0) + Math.max(0, groups.length - 1) * gapMm;
  return { plans, gapMm, assessment: { initialHeight, masonryHeight, height, guarded: height < initialHeight - 0.01 } };
}
