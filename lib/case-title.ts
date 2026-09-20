import type { PortfolioCase } from "./types";

export type CaseTitleData = Pick<PortfolioCase, "brandName" | "projectName">;

export function caseFullTitle({ brandName, projectName }: CaseTitleData) {
  return projectName ? `${brandName} · ${projectName}` : brandName;
}

export function caseTitleDensity(item: CaseTitleData) {
  const length = Array.from(caseFullTitle(item)).length;
  if (length > 28) return "isDense";
  if (length > 17) return "isCompact";
  return "";
}
