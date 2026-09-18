import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { readContent } from "@/lib/content";
import { getBrandingCases, getPhotographyCases, isPhotographyCase, sortPublishedCases } from "@/lib/sort-cases";

export const dynamic = "force-dynamic";
function decodeSlug(value: string) { try { return decodeURIComponent(value); } catch { notFound(); } }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const route = await params; const slug = decodeSlug(route.slug); const data = await readContent(); const item = data.cases.find((entry) => entry.slug === slug && entry.published); return item ? { title: item.name, description: item.intro } : {}; }
export default async function WorkPage({ params }: { params: Promise<{ slug: string }> }) {
  const route = await params; const slug = decodeSlug(route.slug); const data = await readContent(); const current = data.cases.find((entry) => entry.slug === slug && entry.published); if (!current) notFound(); const photo = isPhotographyCase(current); const pool = photo ? getPhotographyCases(data.cases) : getBrandingCases(data.cases); const order = photo ? data.photographyCaseOrder : data.defaultOrder; const ordered = sortPublishedCases(pool, order); const index = ordered.findIndex((entry) => entry.id === current.id); const item = ordered[index]; const next = ordered[(index + 1) % ordered.length];
  return <main className="workPage"><SiteHeader active={photo ? "photo" : "branding"} /><div className="workHero"><Image src={item.hero} alt={`${item.name} 项目主视觉`} fill priority sizes="100vw" /></div><section className="workIntro"><div><p>{item.industryPrimary} · {item.designPrimary}</p><h1>{item.name}</h1></div><p>{item.intro}</p></section><section className="mediaFlow">{item.bodyAssets.map((media) => <figure key={media.id} className={media.layout}>{media.type === "video" ? <video src={media.src} controls playsInline /> : <Image src={media.src} alt="" width={1800} height={1200} sizes={media.layout === "half" ? "(max-width: 700px) 100vw, 50vw" : "100vw"} />}</figure>)}</section><Link className="nextCase" href={`/work/${next.slug}`}><span>Next case</span><strong>{next.name}</strong><span>↗</span></Link></main>;
}
