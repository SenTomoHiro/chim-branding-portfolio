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

export type BodyAsset = {
  id: string;
  type: MediaType;
  src: string;
  layout: MediaLayout;
  provenance?: AssetProvenance;
};

export type PortfolioCase = {
  id: string;
  slug: string;
  name: string;
  intro: string;
  business: Business;
  categories: CaseCategory[];
  primaryIndustry: string;
  cover: string;
  coverWidth: number;
  coverHeight: number;
  hero: string;
  coverProvenance?: AssetProvenance;
  heroProvenance?: AssetProvenance;
  bodyAssets: BodyAsset[];
  published: boolean;
};

export type ContentData = {
  cases: PortfolioCase[];
  defaultOrder: string[];
  photographyCaseOrder: string[];
};
