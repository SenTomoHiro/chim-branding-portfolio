import type { PdfTarget } from "./pdf-cache";

export type PdfPendingRequest = { target: PdfTarget; requestId: string; sourceHash: string; startedAt: number };

export const PDF_PENDING_TIMEOUT_MS = 10 * 60 * 1000;
const storageKey = "chim.pdf.pending.v1";

function all(): Record<string, PdfPendingRequest> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) || "{}") as Record<string, PdfPendingRequest>;
    return Object.fromEntries(Object.entries(value).filter(([, pending]) => pending && typeof pending.requestId === "string" && typeof pending.sourceHash === "string" && typeof pending.startedAt === "number"));
  } catch { return {}; }
}

function save(value: Record<string, PdfPendingRequest>) {
  if (typeof window !== "undefined") window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function getPdfPending(target: PdfTarget) { return all()[target]; }
export function savePdfPending(pending: PdfPendingRequest) { save({ ...all(), [pending.target]: pending }); }
export function clearPdfPending(target: PdfTarget) { const value = all(); delete value[target]; save(value); }
export function isPdfPendingExpired(pending: PdfPendingRequest, now = Date.now()) { return now - pending.startedAt >= PDF_PENDING_TIMEOUT_MS; }
