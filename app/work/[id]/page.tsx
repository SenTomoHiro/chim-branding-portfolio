import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import { BackToTopButton } from "@/components/back-to-top-button";
import { CaseTitle } from "@/components/case-title";
import { NextCaseLink } from "@/components/next-case-link";
import { RevealMedia } from "@/components/reveal-media";
import { SiteHeader } from "@/components/site-header";
import { caseFullTitle } from "@/lib/case-title";
import { findPublishedCaseById } from "@/lib/case-route";
import { readContent } from "@/lib/content";
import { casePdfPath } from "@/lib/pdf-path";
import { assetPath } from "@/lib/site-path";
import { getPublishedCases } from "@/lib/sort-cases";
import { formatCaseMetadata } from "@/lib/taxonomy";
import { getCaseBodyMedia, getCaseHero } from "@/lib/case-media";

export async function generateStaticParams() {
  return (await readContent()).cases.filter((item) => item.published).map((item) => ({ id: item.id.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const route = await params;
  const item = findPublishedCaseById((await readContent()).cases, route.id);
  return item ? { title: caseFullTitle(item), description: item.intro } : {};
}

export default async function WorkPage({ params }: { params: Promise<{ id: string }> }) {
  const route = await params;
  const data = await readContent();
  const current = findPublishedCaseById(data.cases, route.id);
  if (!current) notFound();
  const ordered = getPublishedCases(data.cases, data, { business: current.business });
  const index = ordered.findIndex((entry) => entry.id === current.id);
  const item = ordered[index];
  const next = ordered[(index + 1) % ordered.length];
  const fullTitle = caseFullTitle(item);
  const hero = getCaseHero(item)!;
  return <main className="workPage"><SiteHeader business={current.business} detail /><BackToTopButton /><ViewTransition name={`case-image-${item.id}`} share="case-morph" default="none"><div className="workHero"><Image src={assetPath(hero.src)} alt={`${fullTitle} 项目主视觉`} fill priority sizes="100vw" /></div></ViewTransition><section className="workIntro"><div><p>{formatCaseMetadata(item)}</p><CaseTitle item={item} as="h1" /></div><section className="workSummary"><p>{item.intro}</p><a className="pdfDownload" href={casePdfPath(item.id)} download>PDF / Download PDF ↓</a></section></section><section className="mediaFlow">{getCaseBodyMedia(item).map((media) => <RevealMedia key={media.id} media={media} caseName={fullTitle} />)}</section><NextCaseLink current={item} next={next} /></main>;
}
