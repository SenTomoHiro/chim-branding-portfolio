import type { PortfolioCase } from "./types";

export const isPhotographyCase = (item: PortfolioCase) => item.designPrimary === "Photography";
export const getBrandingCases = (cases: PortfolioCase[]) => cases.filter((item) => !isPhotographyCase(item));
export const getPhotographyCases = (cases: PortfolioCase[]) => cases.filter(isPhotographyCase);

export function sortPublishedCases(
  cases: PortfolioCase[],
  defaultOrder: string[],
  priorityCaseIds: string[] = [],
) {
  const published = new Map(cases.filter((item) => item.published).map((item) => [item.id, item]));
  const seen = new Set<string>();
  const ordered: PortfolioCase[] = [];

  for (const id of [...priorityCaseIds, ...defaultOrder]) {
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
