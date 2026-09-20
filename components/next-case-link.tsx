"use client";

import Link from "next/link";
import { useLayoutEffect } from "react";
import { casePath } from "@/lib/case-route";
import { advanceCaseListEntry, syncCaseListEntry } from "@/lib/return-context";
import type { Business, CaseCategory } from "@/lib/types";

type CaseTarget = { id: string; name: string; business: Business; categories: CaseCategory[] };

export function NextCaseLink({ current, next }: { current: CaseTarget; next: CaseTarget }) {
  const currentPath = casePath(current.name);
  const nextPath = casePath(next.name);
  useLayoutEffect(() => syncCaseListEntry(current.id, currentPath, current.business, current.categories), [current]);
  return <Link className="nextCase" href={nextPath} onNavigate={() => advanceCaseListEntry(next.id, nextPath, next.business, next.categories)}><span>Next case</span><strong>{next.name}</strong><span>↗</span></Link>;
}
