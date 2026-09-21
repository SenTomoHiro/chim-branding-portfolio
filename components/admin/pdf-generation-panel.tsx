"use client";

import { useState } from "react";
import { pdfUrl } from "@/lib/pdf-path";
import type { PdfCacheEntry, PdfTarget } from "@/lib/pdf-cache";

type Result = { target: string; url: string; filename: string };
export type PdfGenerator = (target: PdfTarget, sourceHash: string) => Promise<Result>;

export function PdfGenerateAction({ target, label, sourceHash, cacheEntry, disabled = false, hint, tone = "primary", generatePdf }: { target: PdfTarget; label: string; sourceHash: string; cacheEntry?: PdfCacheEntry; disabled?: boolean; hint?: string; tone?: "primary" | "secondary"; generatePdf?: PdfGenerator }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const fresh = cacheEntry?.sourceHash === sourceHash;
  const visibleResult = result || (fresh ? { target, url: pdfUrl(target), filename: cacheEntry.filename } : null);
  const buttonLabel = pending ? "生成中…" : cacheEntry ? fresh ? "重新生成" : "重新生成 PDF" : label;

  async function generate() {
    setPending(true); setMessage("正在生成…"); setResult(null);
    try {
      let body: Result;
      if (generatePdf) body = await generatePdf(target, sourceHash);
      else {
        const response = await fetch("/api/admin/pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target }) });
        const result = await response.json().catch(() => ({})) as Partial<Result> & { error?: string };
        if (!response.ok || !result.url || !result.filename) throw new Error(result.error || "PDF 生成失败");
        body = { target, url: result.url, filename: result.filename };
      }
      setResult(body);
      setMessage("生成成功");
    } catch (error) { setMessage(`生成失败：${error instanceof Error ? error.message : "请重试"}`); }
    finally { setPending(false); }
  }

  return <div className="pdfGenerateAction">{cacheEntry && !fresh && !pending && <span className="pdfStale" role="status">PDF 已过期</span>}<button type="button" className={tone === "primary" ? "primaryButton" : "secondaryButton"} disabled={disabled || pending} onClick={() => void generate()}>{buttonLabel}</button>{hint && <span className="fieldHint">{hint}</span>}{message && <span className={message.startsWith("生成失败") ? "formError" : "saveMessage"} role="status">{message}</span>}{visibleResult && <span className="pdfGenerationResult"><a href={visibleResult.url} target="_blank" rel="noreferrer">打开 PDF</a><a href={visibleResult.url} download={visibleResult.filename}>下载</a></span>}</div>;
}
