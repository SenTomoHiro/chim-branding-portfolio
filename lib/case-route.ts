import type { PortfolioCase } from "./types";

export const casePath = (id: string) => `/work/?id=${encodeURIComponent(id)}`;

export function findPublishedCaseById(cases: PortfolioCase[], routeId: string) {
  let id: string;
  try { id = decodeURIComponent(routeId).toLowerCase(); }
  catch { return undefined; }
  return cases.find((item) => item.id.toLowerCase() === id && item.published);
}
