"use client";

import { useState } from "react";

type PdfAction = { target: string; label: string };
type Result = { target: string; url: string; filename: string };

export function PdfGenerationPanel({ actions, disabled = false, hint }: { actions: PdfAction[]; disabled?: boolean; hint?: string }) {
  const [active, setActive] = useState("");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  async function generate(action: PdfAction) {
    setActive(action.target); setMessage("正在生成…"); setResult(null);
    try {
      const response = await fetch("/api/admin/pdf", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: action.target }) });
      const body = await response.json().catch(() => ({})) as Partial<Result> & { error?: string };
      if (!response.ok || !body.url || !body.filename) throw new Error(body.error || "PDF 生成失败");
      setResult({ target: action.target, url: body.url, filename: body.filename });
      setMessage("生成成功");
    } catch (error) { setMessage(`生成失败：${error instanceof Error ? error.message : "请重试"}`); }
    finally { setActive(""); }
  }

  return <section className="formSection pdfGeneration" aria-label="本地 PDF 生成"><div className="sectionHeading"><div><h2>本地 PDF 生成</h2><p>使用当前已保存的正式数据与 PDF 生成器。</p></div></div><div className="pdfGenerationActions">{actions.map((action) => <button type="button" className="primaryButton" key={action.target} disabled={disabled || Boolean(active)} onClick={() => void generate(action)}>{active === action.target ? "生成中…" : action.label}</button>)}</div>{hint && <p className="fieldHint">{hint}</p>}{message && <p className={message.startsWith("生成失败") ? "formError" : "saveMessage"} role="status">{message}</p>}{result && <div className="pdfGenerationResult"><a href={result.url} target="_blank" rel="noreferrer">打开 PDF</a><a href={`${result.url}?download=1`} download={result.filename}>下载 PDF</a></div>}</section>;
}
