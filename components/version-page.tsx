import { notFound } from "next/navigation";
import { CaseIndex } from "./case-index";
import { readContent } from "@/lib/content";
import { sortPublishedCases } from "@/lib/sort-cases";
export async function VersionPage({ slug }: { slug: string }) { const content = await readContent(); const version = content.versions.find((item) => item.slug === slug && item.enabled); if (!version) notFound(); return <CaseIndex active={slug} title={`${version.name} branding works`} cases={sortPublishedCases(content.cases, content.defaultOrder, version.priorityCaseIds)} />; }
