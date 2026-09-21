"use client";

import { useSearchParams } from "next/navigation";
import { CasePdfDocument, PortfolioPdfDocument } from "./pdf-casebook";
import { RuntimeError, RuntimeLoading } from "./runtime-state";
import { useRuntimeContent } from "@/lib/runtime-content";
import { assertPdfConfiguration, getPortfolioPdfCases } from "@/lib/pdf-portfolio";
import type { Business, CaseCategory } from "@/lib/types";

const kinds = {
  design: { business: "branding" }, photography: { business: "photography" },
  "design-food": { business: "branding", category: "food" }, "design-drinks": { business: "branding", category: "drinks" },
  "design-ip": { business: "branding", category: "ip" }, "design-other": { business: "branding", category: "other" },
} as const satisfies Record<string, { business: Business; category?: CaseCategory }>;

export function RuntimeCasePrintPage() {
  const id = useSearchParams().get("id") || "";
  const { data, error, retry } = useRuntimeContent();
  if (error) return <RuntimeError message={error} retry={retry} />;
  if (!data) return <RuntimeLoading label="正在准备 PDF 案例…" />;
  const item = data.cases.find((entry) => entry.id.toLowerCase() === id.toLowerCase());
  return item ? <CasePdfDocument item={item} /> : <RuntimeError message="找不到 PDF 案例。" retry={retry} />;
}

export function RuntimePortfolioPrintPage() {
  const kind = useSearchParams().get("kind") || "";
  const { data, error, retry } = useRuntimeContent();
  if (error) return <RuntimeError message={error} retry={retry} />;
  if (!data) return <RuntimeLoading label="正在准备 Portfolio…" />;
  const config: { business: Business; category?: CaseCategory } | undefined = kinds[kind as keyof typeof kinds];
  if (!config) return <RuntimeError message="不支持这个 Portfolio 类型。" retry={retry} />;
  try { assertPdfConfiguration(data); }
  catch (reason) { return <RuntimeError message={reason instanceof Error ? reason.message : "PDF 配置无效"} retry={retry} />; }
  return <PortfolioPdfDocument cases={getPortfolioPdfCases(data, config.business, config.category)} kind={config.business} category={config.category} />;
}
