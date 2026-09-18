import { CaseIndex } from "@/components/case-index";
import { readContent } from "@/lib/content";
import { getPublishedCases } from "@/lib/sort-cases";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "商业摄影案例", description: "CHIM 商业摄影案例作品集。" };

export default async function PhotographyPage() {
  const content = await readContent();
  const cases = getPublishedCases(content.cases, content, { business: "photography" });
  return <CaseIndex cases={cases} business="photography" title="Photography Works" subtitle="商业摄影案例" footer="Commercial photography · Art direction" />;
}
