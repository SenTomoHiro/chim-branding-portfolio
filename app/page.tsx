import { CaseIndex } from "@/components/case-index";
import { readContent } from "@/lib/content";
import { getPublishedCases } from "@/lib/sort-cases";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "品牌设计案例", description: "CHIM 品牌设计案例作品集。" };

export default async function Home() {
  const content = await readContent();
  return <CaseIndex cases={getPublishedCases(content.cases, content, { business: "branding" })} />;
}
