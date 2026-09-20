import type { Metadata } from "next";
import Image from "next/image";
import { ViewTransition } from "react";
import { notFound } from "next/navigation";
import { RevealMedia } from "@/components/reveal-media";
import { NextCaseLink } from "@/components/next-case-link";
import { SiteHeader } from "@/components/site-header";
import { caseRouteName, findPublishedCaseByName } from "@/lib/case-route";
import { readContent } from "@/lib/content";
import { getPublishedCases } from "@/lib/sort-cases";
import { formatCaseMetadata } from "@/lib/taxonomy";
import { assetPath } from "@/lib/site-path";

export async function generateStaticParams() {
  return (await readContent()).cases
    .filter((item) => item.published)
    .map((item) => ({ name: caseRouteName(item.name) }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> { const route = await params; const item = findPublishedCaseByName((await readContent()).cases, route.name); return item ? { title: item.name, description: item.intro } : {}; }
export default async function WorkPage({ params }: { params: Promise<{ name: string }> }) {
  const route = await params; const data = await readContent(); const current = findPublishedCaseByName(data.cases, route.name); if (!current) notFound(); const ordered = getPublishedCases(data.cases, data, { business: current.business }); const index = ordered.findIndex((entry) => entry.id === current.id); const item = ordered[index]; const next = ordered[(index + 1) % ordered.length];
  return <main className="workPage"><SiteHeader business={current.business} detail /><ViewTransition name={`case-image-${item.id}`} share="case-morph" default="none"><div className="workHero"><Image src={assetPath(item.hero)} alt={`${item.name} 项目主视觉`} fill priority sizes="100vw" /></div></ViewTransition><section className="workIntro"><div><p>{formatCaseMetadata(item)}</p><h1>{item.name}</h1></div><p>{item.intro}</p></section><section className="mediaFlow">{item.bodyAssets.map((media) => <RevealMedia key={media.id} media={media} />)}</section><NextCaseLink current={item} next={next} /></main>;
}
