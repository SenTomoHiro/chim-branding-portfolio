import type { Business, CaseCategory, PortfolioCase } from "./types";

export const isPhotographyCase = (item: PortfolioCase) => item.business === "photography";
export const getBrandingCases = (cases: PortfolioCase[]) => cases.filter((item) => item.business === "branding");
export const getPhotographyCases = (cases: PortfolioCase[]) => cases.filter(isPhotographyCase);

export function sortPublishedCases(
  cases: PortfolioCase[],
  defaultOrder: string[],
) {
  const published = new Map(cases.filter((item) => item.published).map((item) => [item.id, item]));
  const seen = new Set<string>();
  const ordered: PortfolioCase[] = [];

  for (const id of defaultOrder) {
    const item = published.get(id);
    if (item && !seen.has(id)) {
      ordered.push(item);
      seen.add(id);
    }
  }

  for (const item of cases) {
    if (item.published && !seen.has(item.id)) {
      ordered.push(item);
      seen.add(item.id);
    }
  }
  return ordered;
}

export function getPublishedCases(
  cases: PortfolioCase[],
  orders: Pick<import("./types").ContentData, "defaultOrder" | "photographyCaseOrder">,
  { business, category }: { business: Business; category?: CaseCategory },
) {
  const order = business === "photography" ? orders.photographyCaseOrder : orders.defaultOrder;
  return sortPublishedCases(
    cases.filter((item) => item.business === business && (!category || item.categories.includes(category))),
    order,
  );
}
