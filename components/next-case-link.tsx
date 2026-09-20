"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";
import { casePath } from "@/lib/case-route";
import { advanceCaseListEntry, syncCaseListEntry } from "@/lib/return-context";
import type { Business, CaseCategory } from "@/lib/types";
import { CaseTitle } from "./case-title";

type CaseTarget = { id: string; brandName: string; projectName: string; business: Business; categories: CaseCategory[] };

export function NextCaseLink({ current, next }: { current: CaseTarget; next: CaseTarget }) {
  const currentPath = casePath(current.id);
  const nextPath = casePath(next.id);
  useLayoutEffect(() => syncCaseListEntry(current.id, currentPath, current.business, current.categories), [current]);
  return <Link className="nextCase" href={nextPath} onNavigate={() => advanceCaseListEntry(next.id, nextPath, next.business, next.categories)}><span>Next case</span><CaseTitle item={next} as="strong" /><span>↗</span></Link>;
}
