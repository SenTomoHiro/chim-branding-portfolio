"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CasePdfDocument, PortfolioPdfDocument, type PdfMediaDimensions } from "./pdf-casebook";
import { RuntimeError, RuntimeLoading } from "./runtime-state";
import { contentMediaUrl, useRuntimeContent } from "@/lib/runtime-content";
import { assertPdfConfiguration, getPortfolioPdfCases, resolvePortfolioPdfImages } from "@/lib/pdf-portfolio";
import type { Business, CaseCategory, CaseMedia, PortfolioCase } from "@/lib/types";

const kinds = {
  design: { business: "branding" }, photography: { business: "photography" },
  "design-food": { business: "branding", category: "food" }, "design-drinks": { business: "branding", category: "drinks" },
  "design-ip": { business: "branding", category: "ip" }, "design-other": { business: "branding", category: "other" },
} as const satisfies Record<string, { business: Business; category?: CaseCategory }>;

function usePdfMediaDimensions(media: CaseMedia[]) {
  const missing = useMemo(() => {
    const bySource = new Map<string, string>();
    for (const item of media) {
      if (item.type !== "image") continue;
      const width = item.width || item.provenance?.width;
      const height = item.height || item.provenance?.height;
      if (!width || !height) bySource.set(item.src, item.id);
    }
    return [...bySource].map(([src, id]) => ({ src, id }));
  }, [media]);
  const key = missing.map((item) => item.src).join("\n");
  const [state, setState] = useState<{ key: string; dimensions?: PdfMediaDimensions; error?: string }>({ key: "" });

  useEffect(() => {
    let cancelled = false;
    if (!missing.length) {
      setState({ key, dimensions: new Map() });
      return () => { cancelled = true; };
    }
    Promise.all(missing.map(({ src, id }) => new Promise<[string, { width: number; height: number }]>((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => image.naturalWidth && image.naturalHeight
        ? resolve([src, { width: image.naturalWidth, height: image.naturalHeight }])
        : reject(new Error(`PDF 图片尺寸无效：${id}`));
      image.onerror = () => reject(new Error(`PDF 图片加载失败：${id}`));
      image.src = contentMediaUrl(src);
    }))).then((entries) => {
      if (!cancelled) setState({ key, dimensions: new Map(entries) });
    }).catch((reason) => {
      if (!cancelled) setState({ key, error: reason instanceof Error ? reason.message : "PDF 图片尺寸获取失败" });
    });
    return () => { cancelled = true; };
  }, [key, missing]);

  return state.key === key ? state : { key };
}

function RuntimeCaseDocument({ item }: { item: PortfolioCase }) {
  const resolved = usePdfMediaDimensions(item.media);
  if (resolved.error) return <RuntimeError message={resolved.error} retry={() => window.location.reload()} />;
  if (!resolved.dimensions) return <RuntimeLoading label="正在读取图片真实尺寸…" />;
  return <CasePdfDocument item={item} dimensions={resolved.dimensions} />;
}

function RuntimePortfolioDocument({ cases, kind, category }: { cases: PortfolioCase[]; kind: Business; category?: CaseCategory }) {
  const media = useMemo(() => cases.flatMap((item) => {
    const selected = new Set(resolvePortfolioPdfImages(item).map((image) => image.id));
    return item.media.filter((asset) => selected.has(asset.id));
  }), [cases]);
  const resolved = usePdfMediaDimensions(media);
  if (resolved.error) return <RuntimeError message={resolved.error} retry={() => window.location.reload()} />;
  if (!resolved.dimensions) return <RuntimeLoading label="正在读取图片真实尺寸…" />;
  return <PortfolioPdfDocument cases={cases} kind={kind} category={category} dimensions={resolved.dimensions} />;
}

export function RuntimeCasePrintPage() {
  const id = useSearchParams().get("id") || "";
  const { data, error, retry } = useRuntimeContent();
  if (error) return <RuntimeError message={error} retry={retry} />;
  if (!data) return <RuntimeLoading label="正在准备 PDF 案例…" />;
  const item = data.cases.find((entry) => entry.id.toLowerCase() === id.toLowerCase());
  return item ? <RuntimeCaseDocument item={item} /> : <RuntimeError message="找不到 PDF 案例。" retry={retry} />;
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
  return <RuntimePortfolioDocument cases={getPortfolioPdfCases(data, config.business, config.category)} kind={config.business} category={config.category} />;
}
