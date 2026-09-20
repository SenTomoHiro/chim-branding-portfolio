import { caseFullTitle, type CaseTitleData } from "@/lib/case-title";

export function CaseTitle({ item, as: Tag = "h2", className = "" }: { item: CaseTitleData; as?: "h1" | "h2" | "strong"; className?: string }) {
  return <Tag className={`caseTitle ${className}`.trim()} aria-label={caseFullTitle(item)}><span className="caseTitleBrand">{item.brandName}</span>{item.projectName && <span className="caseTitleProject">{item.projectName}</span>}</Tag>;
}
