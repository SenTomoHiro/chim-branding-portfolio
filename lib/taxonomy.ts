import type { Business, CaseCategory, PortfolioCase } from "./types";

export const BUSINESSES: ReadonlyArray<{ value: Business; zh: string; en: string }> = [
  { value: "branding", zh: "品牌设计", en: "BRANDING" },
  { value: "photography", zh: "商业摄影", en: "PHOTOGRAPHY" },
];

export const CASE_CATEGORIES: ReadonlyArray<{ value: CaseCategory; zh: string; en: string }> = [
  { value: "food", zh: "餐饮", en: "FOOD" },
  { value: "drinks", zh: "饮品", en: "DRINKS" },
  { value: "ip", zh: "IP", en: "IP" },
  { value: "other", zh: "其他", en: "OTHER" },
];

export const CATEGORY_ROUTES = CASE_CATEGORIES.map(({ value }) => value);
export const businessLabel = (business: Business) => BUSINESSES.find((item) => item.value === business)?.zh ?? business;
export const categoryLabel = (category: CaseCategory) => CASE_CATEGORIES.find((item) => item.value === category)?.zh ?? category;
export const categoryLabels = (categories: CaseCategory[]) => categories.map(categoryLabel).join(" / ");
export const formatCaseMetadata = ({ business, categories, primaryIndustry }: Pick<PortfolioCase, "business" | "categories" | "primaryIndustry">, includeBusiness = false) => {
  const taxonomy = business === "photography" ? [businessLabel(business)] : [includeBusiness ? businessLabel(business) : "", categoryLabels(categories)];
  return [...taxonomy, primaryIndustry].filter(Boolean).join(" · ");
};
