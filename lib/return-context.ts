import type { Business, CaseCategory } from "./types";

const ENTRY_KEY = "chim-case-list-entry";
const RETURN_KEY = "chim-case-list-return";
const MAX_AGE = 12 * 60 * 60 * 1000;
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export type CaseListEntry = {
  source: string;
  target: string;
  caseId: string;
  scrollY: number;
  anchorTop: number;
  historyLength: number;
  savedAt: number;
  detailDepth: number;
  trail: CaseListTrailItem[];
};

type CaseListTrailItem = Pick<CaseListEntry, "source" | "target" | "caseId">;

export function normalizePortfolioPath(pathname: string) {
  let value = pathname.split(/[?#]/, 1)[0] || "/";
  if (basePath && (value === basePath || value.startsWith(`${basePath}/`))) value = value.slice(basePath.length) || "/";
  if (value.length > 1) value = value.replace(/\/+$/, "");
  return value || "/";
}

export function isCaseListRoute(pathname: string) {
  return new Set(["/", "/food", "/drinks", "/ip", "/other", "/photo"]).has(normalizePortfolioPath(pathname));
}

function parseEntry(raw: string | null): CaseListEntry | null {
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as Partial<CaseListEntry>;
    if (!entry.source || !entry.target || !entry.caseId || typeof entry.scrollY !== "number" || typeof entry.anchorTop !== "number" || typeof entry.historyLength !== "number" || typeof entry.savedAt !== "number") return null;
    if (!isCaseListRoute(entry.source) || Date.now() - entry.savedAt > MAX_AGE) return null;
    const fallbackStep = { source: normalizePortfolioPath(entry.source), target: normalizePortfolioPath(entry.target), caseId: entry.caseId };
    const trail = Array.isArray(entry.trail) ? entry.trail.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const step = item as Partial<CaseListTrailItem>;
      if (!step.source || !step.target || !step.caseId || !isCaseListRoute(step.source)) return [];
      return [{ source: normalizePortfolioPath(step.source), target: normalizePortfolioPath(step.target), caseId: step.caseId }];
    }) : [];
    const normalizedTrail = trail.length ? trail : [fallbackStep];
    const detailDepth = typeof entry.detailDepth === "number" && entry.detailDepth >= 1
      ? Math.min(Math.floor(entry.detailDepth), normalizedTrail.length)
      : 1;
    return { ...entry, ...fallbackStep, detailDepth, trail: normalizedTrail } as CaseListEntry;
  } catch { return null; }
}

export function saveCaseListEntry(caseId: string, target: string, card: HTMLElement | null) {
  if (!card) return;
  const entry: CaseListEntry = {
    source: normalizePortfolioPath(window.location.pathname),
    target: normalizePortfolioPath(target),
    caseId,
    scrollY: window.scrollY,
    anchorTop: card.getBoundingClientRect().top,
    historyLength: window.history.length,
    savedAt: Date.now(),
    detailDepth: 1,
    trail: [],
  };
  entry.trail = [{ source: entry.source, target: entry.target, caseId: entry.caseId }];
  sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
}

export function resolveCaseListSource(source: string, business: Business, categories: CaseCategory[]) {
  const normalized = normalizePortfolioPath(source);
  if (business === "photography") return "/photo";
  if (normalized === "/") return "/";
  const category = normalized.slice(1) as CaseCategory;
  return categories.includes(category) ? normalized : categories[0] ? `/${categories[0]}` : "/";
}

function writeCaseListEntry(entry: CaseListEntry) {
  sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
}

export function advanceCaseListEntry(caseId: string, target: string, business: Business, categories: CaseCategory[]) {
  const entry = readCaseListEntry();
  if (!entry || entry.target !== normalizePortfolioPath(window.location.pathname)) return;
  const step: CaseListTrailItem = {
    source: resolveCaseListSource(entry.source, business, categories),
    target: normalizePortfolioPath(target),
    caseId,
  };
  const currentIndex = Math.min(entry.detailDepth - 1, entry.trail.length - 1);
  const trail = [...entry.trail.slice(0, currentIndex + 1), step];
  writeCaseListEntry({ ...entry, ...step, detailDepth: trail.length, trail, savedAt: Date.now() });
}

export function syncCaseListEntry(caseId: string, target: string, business: Business, categories: CaseCategory[]) {
  const entry = readCaseListEntry();
  const normalizedTarget = normalizePortfolioPath(target);
  if (!entry) return;
  if (entry.target === normalizedTarget) {
    const source = resolveCaseListSource(entry.source, business, categories);
    if (entry.caseId === caseId && entry.source === source) return;
    const trail = entry.trail.map((step, index) => index === entry.detailDepth - 1
      ? { ...step, source, target: normalizedTarget, caseId }
      : step);
    writeCaseListEntry({ ...entry, source, target: normalizedTarget, caseId, trail, savedAt: Date.now() });
    return;
  }
  const currentIndex = entry.detailDepth - 1;
  const matches = entry.trail.map((step, index) => step.target === normalizedTarget ? index : -1).filter((index) => index >= 0);
  const index = matches.sort((left, right) => Math.abs(left - currentIndex) - Math.abs(right - currentIndex))[0];
  if (index === undefined) return;
  const step = { ...entry.trail[index], source: resolveCaseListSource(entry.trail[index].source, business, categories), caseId };
  const trail = entry.trail.map((item, trailIndex) => trailIndex === index ? step : item);
  writeCaseListEntry({ ...entry, ...step, trail, detailDepth: index + 1, savedAt: Date.now() });
}

export function readCaseListEntry() {
  return parseEntry(sessionStorage.getItem(ENTRY_KEY));
}

export function requestCaseListReturn(entry: CaseListEntry) {
  sessionStorage.setItem(RETURN_KEY, JSON.stringify(entry));
  sessionStorage.removeItem(ENTRY_KEY);
}

export function readPendingCaseListReturn() {
  return parseEntry(sessionStorage.getItem(RETURN_KEY)) || readCaseListEntry();
}

export function clearCaseListReturn() {
  sessionStorage.removeItem(ENTRY_KEY);
  sessionStorage.removeItem(RETURN_KEY);
}

export function clearCaseListEntry() {
  sessionStorage.removeItem(ENTRY_KEY);
  sessionStorage.removeItem(RETURN_KEY);
}
