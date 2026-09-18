import { CaseIndex } from "@/components/case-index";
import { readContent } from "@/lib/content";
import { getPhotographyCases, sortPublishedCases } from "@/lib/sort-cases";

export const dynamic = "force-dynamic";

export default async function PhotographyPage() {
  const content = await readContent();
  const cases = sortPublishedCases(getPhotographyCases(content.cases), content.photographyCaseOrder);
  return <CaseIndex cases={cases} active="photo" title="Selected photography works" footer="Commercial photography · Art direction" />;
}
