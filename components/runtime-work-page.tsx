"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { BackToTopButton } from "./back-to-top-button";
import { CaseTitle } from "./case-title";
import { NextCaseLink } from "./next-case-link";
import { RevealMedia } from "./reveal-media";
import { RuntimeError, RuntimeLoading } from "./runtime-state";
import { SiteHeader } from "./site-header";
import { getCaseBodyMedia, getCaseHero } from "@/lib/case-media";
import { caseFullTitle } from "@/lib/case-title";
import { findPublishedCaseById } from "@/lib/case-route";
import { contentMediaUrl, useRuntimeContent } from "@/lib/runtime-content";
import { getPublishedCases } from "@/lib/sort-cases";
import { formatCaseMetadata } from "@/lib/taxonomy";

export function RuntimeWorkPage() {
  const id = useSearchParams().get("id") || "";
  const { data, error, retry } = useRuntimeContent();
  const current = data ? findPublishedCaseById(data.cases, id) : undefined;
  useEffect(() => {
    if (!current) return;
    document.title = `${caseFullTitle(current)} — CHIM`;
    document.querySelector('meta[name="description"]')?.setAttribute("content", current.intro);
  }, [current]);
  if (error) return <RuntimeError message={error} retry={retry} />;
  if (!data) return <RuntimeLoading />;
  if (!current) return <RuntimeError message="找不到这个案例，或案例尚未发布。" retry={retry} />;
  const ordered = getPublishedCases(data.cases, data, { business: current.business });
  const index = ordered.findIndex((entry) => entry.id === current.id);
  const item = ordered[index];
  const next = ordered[(index + 1) % ordered.length];
  const fullTitle = caseFullTitle(item);
  const hero = getCaseHero(item);
  if (!hero) return <RuntimeError message="案例缺少详情首图。" retry={retry} />;
  return <main className="workPage"><SiteHeader business={current.business} detail /><BackToTopButton /><div className="workHero"><img src={contentMediaUrl(hero.src)} alt={`${fullTitle} 项目主视觉`} /></div><section className="workIntro"><div><p>{formatCaseMetadata(item)}</p><CaseTitle item={item} as="h1" /></div><section className="workSummary"><p>{item.intro}</p></section></section><section className="mediaFlow">{getCaseBodyMedia(item).map((media) => <RevealMedia key={media.id} media={media} caseName={fullTitle} />)}</section><NextCaseLink current={item} next={next} /></main>;
}
