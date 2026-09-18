export type MediaType = "image" | "video";
export type MediaLayout = "full" | "half";

export type BodyAsset = {
  id: string;
  type: MediaType;
  src: string;
  layout: MediaLayout;
};

export type PortfolioCase = {
  id: string;
  slug: string;
  name: string;
  intro: string;
  industryPrimary: string;
  industryTags: string[];
  designPrimary: string;
  designTags: string[];
  cover: string;
  coverWidth: number;
  coverHeight: number;
  hero: string;
  bodyAssets: BodyAsset[];
  published: boolean;
};

export type ShowcaseVersion = {
  slug: string;
  name: string;
  enabled: boolean;
  priorityCaseIds: string[];
};

export type ContentData = {
  cases: PortfolioCase[];
  defaultOrder: string[];
  versions: ShowcaseVersion[];
};
