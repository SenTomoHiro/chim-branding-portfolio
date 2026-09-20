"use client";

import { useState } from "react";

type Result = { target: string; url: string; filename: string };
export type PdfGenerator = (target: string) => Promise<Result>;

export function PdfGenerateAction({ target, label, disabled = false, hint, tone = "primary", generatePdf }: { target: string; label: string; disabled?: boolean; hint?: string; tone?: "primary" | "secondary"; generatePdf?: PdfGenerator }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function generate() {
    setPending(true); setMessage("正在生成…"); setResult(null);
    try {
      let body: Result;
      if (generatePdf) body = await generatePdf(target);
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

  return <div className="pdfGenerateAction"><button type="button" className={tone === "primary" ? "primaryButton" : "secondaryButton"} disabled={disabled || pending} onClick={() => void generate()}>{pending ? "生成中…" : label}</button>{hint && <span className="fieldHint">{hint}</span>}{message && <span className={message.startsWith("生成失败") ? "formError" : "saveMessage"} role="status">{message}</span>}{result && <span className="pdfGenerationResult"><a href={result.url} target="_blank" rel="noreferrer">打开 PDF</a><a href={`${result.url}?download=1`} download={result.filename}>下载</a></span>}</div>;
}
