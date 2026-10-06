import type { Business, CaseCategory } from "./types";

const ENTRY_KEY = "chim-case-list-entry";
const NEXT_KEY = "chim-case-detail-pending";
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
  const [rawPath, rawQuery = ""] = pathname.split("?", 2);
  let value = rawPath.split("#", 1)[0] || "/";
  if (basePath && (value === basePath || value.startsWith(`${basePath}/`))) value = value.slice(basePath.length) || "/";
  if (value.length > 1) value = value.replace(/\/+$/, "");
  if (value === "/work" && rawQuery) {
    const id = new URLSearchParams(rawQuery).get("id");
    if (id) return `${value}?id=${encodeURIComponent(id)}`;
  }
  return value || "/";
}

export function isCaseListRoute(pathname: string) {
  return new Set(["/", "/food", "/drinks", "/ip", "/other", "/photo"]).has(normalizePortfolioPath(pathname).split("?", 1)[0]);
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
    source: normalizePortfolioPath(`${window.location.pathname}${window.location.search}`),
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
  sessionStorage.setItem(NEXT_KEY, JSON.stringify(entry));
  history.replaceState({ ...history.state, chimListEntry: entry }, "");
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

export function advanceCaseListEntry(caseId: string, target: string, _business: Business, _categories: CaseCategory[]) {
  const entry = readCaseListEntry();
  if (!entry || entry.target !== normalizePortfolioPath(`${window.location.pathname}${window.location.search}`)) return;
  const step = { source: entry.source, target: normalizePortfolioPath(target), caseId };
  const trail = [...entry.trail.slice(0, entry.detailDepth), step];
  const next = { ...entry, target: step.target, detailDepth: trail.length, trail };
  writeCaseListEntry(next);
  sessionStorage.setItem(NEXT_KEY, JSON.stringify(next));
}

export function syncCaseListEntry(_caseId: string, target: string, _business: Business, _categories: CaseCategory[]) {
  const normalizedTarget = normalizePortfolioPath(target);
  const stored = parseEntry(JSON.stringify(history.state?.chimDetailEntry || null));
  const pending = parseEntry(sessionStorage.getItem(NEXT_KEY));
  sessionStorage.removeItem(NEXT_KEY);
  const entry = stored?.target === normalizedTarget ? stored : pending?.target === normalizedTarget ? pending : null;
  if (entry) {
    writeCaseListEntry(entry);
    history.replaceState({ ...history.state, chimDetailEntry: entry }, "");
  } else {
    clearCaseListEntry();
  }
}

export function readCaseListEntry() {
  return parseEntry(JSON.stringify(history.state?.chimDetailEntry || null)) || parseEntry(sessionStorage.getItem(ENTRY_KEY));
}

export function requestCaseListReturn(entry: CaseListEntry) {
  sessionStorage.setItem(RETURN_KEY, JSON.stringify(entry));
  sessionStorage.removeItem(ENTRY_KEY);
}

export function readPendingCaseListReturn() {
  return parseEntry(sessionStorage.getItem(RETURN_KEY)) || parseEntry(JSON.stringify(history.state?.chimListEntry || null));
}

export function clearCaseListReturn() {
  sessionStorage.removeItem(ENTRY_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  sessionStorage.removeItem(NEXT_KEY);
}

export function clearCaseListEntry() {
  sessionStorage.removeItem(ENTRY_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  sessionStorage.removeItem(NEXT_KEY);
}
