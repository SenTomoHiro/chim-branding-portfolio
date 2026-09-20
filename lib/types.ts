export type MediaType = "image" | "video";
export type MediaLayout = "full" | "half";
export type Business = "branding" | "photography";
export type CaseCategory = "food" | "drinks" | "ip" | "other";

export type AssetProvenance = {
  assetId: string;
  sourceType?: "pdf" | "psd" | "ai";
  sourcePdf?: string;
  sourcePage?: number;
  sourceObject?: string;
  sourcePsd?: string;
  sourceAi?: string;
  sourceArtboard?: number;
  sourceXref?: number;
  sourceLayerCount?: number;
  boundingBox?: [number, number, number, number];
  extractionMethod: string;
  width: number;
  height: number;
  sha256: string;
  classification: "final_design" | "mixed";
  finalWorkVerified: true;
};

export type CaseMedia = {
  id: string;
  type: MediaType;
  src: string;
  layout: MediaLayout;
  width?: number;
  height?: number;
  portfolioPdfSelected?: boolean;
  section?: {
    eyebrow: string;
    title: string;
    description?: string;
  };
  provenance?: AssetProvenance;
};

export type PortfolioCase = {
  id: string;
  brandName: string;
  projectName: string;
  intro: string;
  business: Business;
  categories: CaseCategory[];
  primaryIndustry: string;
  media: CaseMedia[];
  published: boolean;
  includeInPortfolioPdf: boolean;
};

export type ContentData = {
  cases: PortfolioCase[];
  defaultOrder: string[];
  photographyCaseOrder: string[];
};
