import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioPdfDocument } from "@/components/pdf-casebook";
import { readContent } from "@/lib/content";
import { assertPdfConfiguration, getPortfolioPdfCases } from "@/lib/pdf-portfolio";
import type { Business, CaseCategory } from "@/lib/types";

const kinds = {
  design: { business: "branding" },
  photography: { business: "photography" },
  "design-food": { business: "branding", category: "food" },
  "design-drinks": { business: "branding", category: "drinks" },
  "design-ip": { business: "branding", category: "ip" },
  "design-other": { business: "branding", category: "other" },
} as const satisfies Record<string, { business: Business; category?: CaseCategory }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(kinds).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const config: { business: Business; category?: CaseCategory } | undefined = kinds[kind as keyof typeof kinds];
  return { title: config?.business === "photography" ? "Photography Portfolio / PDF" : "Design Portfolio / PDF", robots: { index: false, follow: false } };
}

export default async function PrintPortfolioPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const config: { business: Business; category?: CaseCategory } | undefined = kinds[kind as keyof typeof kinds];
  if (!config) notFound();
  const data = await readContent();
  assertPdfConfiguration(data);
  return <PortfolioPdfDocument cases={getPortfolioPdfCases(data, config.business, config.category)} kind={config.business} category={config.category} />;
}
