import type { PortfolioCase } from "./types";

export const caseRouteName = (name: string) => name.replaceAll("/", "／");
export const casePath = (name: string) => `/work/${encodeURIComponent(caseRouteName(name))}`;

export function findPublishedCaseByName(cases: PortfolioCase[], routeName: string) {
  let name: string;
  try { name = decodeURIComponent(routeName); }
  catch { return undefined; }
  return cases.find((item) => caseRouteName(item.name) === name && item.published);
}
