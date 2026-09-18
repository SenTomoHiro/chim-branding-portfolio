import type { PortfolioCase } from "./types";

export const casePath = (name: string) => `/work/${encodeURIComponent(name)}`;

export function findPublishedCaseByName(cases: PortfolioCase[], routeName: string) {
  let name: string;
  try { name = decodeURIComponent(routeName); }
  catch { return undefined; }
  return cases.find((item) => item.name === name && item.published);
}
