import { getPortfolioPdfCases, resolvePortfolioPdfImages } from "./pdf-portfolio";
import type { ContentData, PortfolioCase } from "./types";

export type PdfTarget = `case:${string}` | "design" | "photography" | `category:${"food" | "drinks" | "ip" | "other"}`;
export type PdfCacheEntry = { sourceHash: string; filename: string; generatedAt: string; requestId?: string };
export type PdfCacheManifest = { version: 1; targets: Record<string, PdfCacheEntry> };

export const EMPTY_PDF_CACHE: PdfCacheManifest = { version: 1, targets: {} };
export const PDF_RENDER_VERSION = 2;

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

export function stableSha256(message: string) {
  const rightRotate = (value: number, amount: number) => (value >>> amount) | (value << (32 - amount));
  const words: number[] = [];
  const bytes = new TextEncoder().encode(message);
  const bitLength = bytes.length * 8;
  const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(bytes); padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  const primes: number[] = [];
  for (let candidate = 2; primes.length < 64; candidate += 1) if (primes.every((prime) => candidate % prime)) primes.push(candidate);
  const hash = primes.slice(0, 8).map((prime) => (Math.sqrt(prime) * 0x100000000) >>> 0);
  const constants = primes.map((prime) => (Math.cbrt(prime) * 0x100000000) >>> 0);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const x = words[index - 15]; const y = words[index - 2];
      const s0 = rightRotate(x, 7) ^ rightRotate(x, 18) ^ (x >>> 3);
      const s1 = rightRotate(y, 17) ^ rightRotate(y, 19) ^ (y >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = hash;
    for (let index = 0; index < 64; index += 1) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + choice + constants[index] + words[index]) >>> 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    [a, b, c, d, e, f, g, h].forEach((value, index) => { hash[index] = (hash[index] + value) >>> 0; });
  }
  return hash.map((value) => value.toString(16).padStart(8, "0")).join("");
}

function portfolioCaseSource(item: PortfolioCase) {
  const selected = new Set(resolvePortfolioPdfImages(item).map((image) => image.id));
  return {
    id: item.id, brandName: item.brandName, projectName: item.projectName, intro: item.intro,
    business: item.business, categories: item.categories, primaryIndustry: item.primaryIndustry,
    media: item.media.filter((media) => selected.has(media.id)).map(pdfMediaSource),
  };
}

function pdfMediaSource(media: PortfolioCase["media"][number]) {
  const { provenance: _provenance, ...source } = media;
  return {
    ...source,
    width: media.width || media.provenance?.width,
    height: media.height || media.provenance?.height,
  };
}

function caseSource(item: PortfolioCase) {
  return {
    id: item.id, brandName: item.brandName, projectName: item.projectName, intro: item.intro,
    business: item.business, categories: item.categories, primaryIndustry: item.primaryIndustry,
    media: item.media.map((media) => {
      const { portfolioPdfSelected: _selected, ...source } = pdfMediaSource(media);
      return source;
    }),
  };
}

export function pdfSourceValue(content: ContentData, target: PdfTarget) {
  if (target.startsWith("case:")) {
    const id = target.slice(5).toLowerCase();
    const item = content.cases.find((entry) => entry.id.toLowerCase() === id);
    if (!item) throw new Error(`找不到案例：${target.slice(5)}`);
    return { renderVersion: PDF_RENDER_VERSION, target, item: caseSource(item) };
  }
  const category = target.startsWith("category:") ? target.slice(9) as "food" | "drinks" | "ip" | "other" : undefined;
  const business = target === "photography" ? "photography" : "branding";
  return { renderVersion: PDF_RENDER_VERSION, target, cases: getPortfolioPdfCases(content, business, category).map(portfolioCaseSource) };
}

export function pdfSourceHash(content: ContentData, target: PdfTarget) {
  return stableSha256(canonical(pdfSourceValue(content, target)));
}

export function pdfFilename(target: PdfTarget) {
  if (target.startsWith("case:")) return `${target.slice(5).toLowerCase()}.pdf`;
  if (target === "design" || target === "photography") return `portfolio-${target}.pdf`;
  return `portfolio-design-${target.slice(9)}.pdf`;
}
