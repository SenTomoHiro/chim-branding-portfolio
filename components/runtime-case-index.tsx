"use client";

import { CaseIndex } from "./case-index";
import { RuntimeError, RuntimeLoading } from "./runtime-state";
import { useRuntimeContent } from "@/lib/runtime-content";
import { getPublishedCases } from "@/lib/sort-cases";
import type { Business, CaseCategory } from "@/lib/types";

export function RuntimeCaseIndex({ business = "branding", category, title, subtitle, footer }: { business?: Business; category?: CaseCategory; title?: string; subtitle?: string; footer?: string }) {
  const { data, error, retry } = useRuntimeContent();
  if (error) return <RuntimeError message={error} retry={retry} />;
  if (!data) return <RuntimeLoading />;
  return <CaseIndex business={business} category={category} title={title} subtitle={subtitle} footer={footer} cases={getPublishedCases(data.cases, data, { business, category })} />;
}
