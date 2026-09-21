import { pdfFilename, type PdfTarget } from "./pdf-cache";
import { pdfOrigin } from "./origins";

export const casePdfFilename = (id: string) => `${id.toLowerCase()}.pdf`;
export const pdfUrl = (target: PdfTarget) => `${pdfOrigin}/${pdfFilename(target)}`;
export const casePdfPath = (id: string) => pdfUrl(`case:${id}`);
export const portfolioPdfPath = (kind: "design" | "photography") => pdfUrl(kind);
