import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PortfolioPdfDocument } from "@/components/pdf-casebook";
import { readContent } from "@/lib/content";
import { assertPdfConfiguration, getPortfolioPdfCases } from "@/lib/pdf-portfolio";
import type { Business } from "@/lib/types";

const kinds = { design: "branding", photography: "photography" } as const satisfies Record<string, Business>;

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(kinds).map((kind) => ({ kind }));
}

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  const business = kinds[kind as keyof typeof kinds];
  return { title: business === "photography" ? "Photography Portfolio / PDF" : "Design Portfolio / PDF", robots: { index: false, follow: false } };
}

export default async function PrintPortfolioPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const business = kinds[kind as keyof typeof kinds];
  if (!business) notFound();
  const data = await readContent();
  assertPdfConfiguration(data);
  return <PortfolioPdfDocument cases={getPortfolioPdfCases(data, business)} kind={business} />;
}
