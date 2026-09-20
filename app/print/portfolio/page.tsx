import type { Metadata } from "next";
import { PortfolioPdfDocument } from "@/components/pdf-casebook";
import { readContent } from "@/lib/content";
import { assertPdfConfiguration, getPortfolioPdfCases } from "@/lib/pdf-portfolio";

export const metadata: Metadata = { title: "Selected Works / PDF Portfolio", robots: { index: false, follow: false } };

export default async function PrintPortfolioPage() {
  const data = await readContent();
  assertPdfConfiguration(data);
  return <PortfolioPdfDocument cases={getPortfolioPdfCases(data)} />;
}
