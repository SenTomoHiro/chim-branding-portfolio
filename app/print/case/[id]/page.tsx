import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CasePdfDocument } from "@/components/pdf-casebook";
import { readContent } from "@/lib/content";
import { caseFullTitle } from "@/lib/case-title";

export const dynamicParams = false;

export async function generateStaticParams() {
  return (await readContent()).cases.filter((item) => item.published).map((item) => ({ id: item.id.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = (await readContent()).cases.find((entry) => entry.id.toLowerCase() === id && (entry.published || process.env.NODE_ENV === "development"));
  return { title: item ? `${caseFullTitle(item)} / PDF Casebook` : "PDF Casebook", robots: { index: false, follow: false } };
}

export default async function PrintCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = (await readContent()).cases.find((entry) => entry.id.toLowerCase() === id && (entry.published || process.env.NODE_ENV === "development"));
  if (!item) notFound();
  return <CasePdfDocument item={item} />;
}
