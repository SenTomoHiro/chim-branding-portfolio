import { CaseIndex } from "@/components/case-index";
import { readContent } from "@/lib/content";
import { getBrandingCases, sortPublishedCases } from "@/lib/sort-cases";

export const dynamic = "force-dynamic";

export default async function Home() {
  const content = await readContent();
  return <CaseIndex cases={sortPublishedCases(getBrandingCases(content.cases), content.defaultOrder)} />;
}
