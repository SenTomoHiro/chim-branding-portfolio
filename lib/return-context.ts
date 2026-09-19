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
};

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
    return entry as CaseListEntry;
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
  };
  sessionStorage.setItem(ENTRY_KEY, JSON.stringify(entry));
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
