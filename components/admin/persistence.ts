import type { ContentData, MediaType, PortfolioCase } from "@/lib/types";

export type UploadedMedia = { type: MediaType; src: string; width?: number; height?: number };

export type AdminPersistence = {
  saveCase: (item: PortfolioCase, isEdit: boolean) => Promise<void>;
  deleteCase: (item: PortfolioCase) => Promise<void>;
  saveOrder: (order: string[], type: "branding" | "photography") => Promise<void>;
  upload: (file: File, caseId: string) => Promise<UploadedMedia>;
};
