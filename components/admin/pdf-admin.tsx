"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { caseFullTitle } from "@/lib/case-title";
import { pdfSourceHash, type PdfCacheManifest, type PdfTarget } from "@/lib/pdf-cache";
import { CASE_CATEGORIES, categoryLabels } from "@/lib/taxonomy";
import type { CaseCategory, ContentData, PortfolioCase } from "@/lib/types";
import type { AdminPersistence } from "./persistence";
import { PdfGenerateAction, type PdfGenerator } from "./pdf-generation-panel";
import { navigateAdmin } from "./admin-navigation";

type BusinessFilter = "all" | "branding" | "photography";

export function PdfAdmin({ initial, cache = { version: 1, targets: {} }, persistence, generatePdf }: { initial: ContentData; cache?: PdfCacheManifest; persistence: AdminPersistence; generatePdf: PdfGenerator }) {
  const [cases, setCases] = useState(initial.cases);
  const [business, setBusiness] = useState<BusinessFilter>("all");
  const [category, setCategory] = useState<"all" | CaseCategory>("all");
  const [query, setQuery] = useState("");
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const content = useMemo(() => ({ ...initial, cases }), [cases, initial]);
  const visible = useMemo(() => cases.filter((item) => {
    if (business !== "all" && item.business !== business) return false;
    if (category !== "all" && (item.business !== "branding" || !item.categories.includes(category))) return false;
    return caseFullTitle(item).toLowerCase().includes(query.trim().toLowerCase());
  }), [business, cases, category, query]);
  const action = (target: PdfTarget, label: string, tone: "primary" | "secondary" = "primary") => <PdfGenerateAction generatePdf={generatePdf} target={target} label={label} sourceHash={pdfSourceHash(content, target)} cacheEntry={cache.targets[target]} tone={tone} />;

  async function toggleMembership(item: PortfolioCase) {
    const next = { ...item, includeInPortfolioPdf: !item.includeInPortfolioPdf };
    setPendingIds((ids) => [...ids, item.id]); setMessage("");
    setCases((items) => items.map((entry) => entry.id === item.id ? next : entry));
    try { await persistence.saveCase(next, true); setMessage(`${caseFullTitle(item)}：${next.includeInPortfolioPdf ? "已加入" : "已移出"}合集 PDF`); }
    catch (error) { setCases((items) => items.map((entry) => entry.id === item.id ? item : entry)); setMessage(`保存失败：${error instanceof Error ? error.message : "请重试"}`); }
    finally { setPendingIds((ids) => ids.filter((id) => id !== item.id)); }
  }

  return <main className="adminPage pdfAdmin">
    <section className="adminTitle"><div><p>Content / PDF</p><h1>PDF 生成</h1></div><Link href="/admin" onClick={navigateAdmin}>返回案例管理</Link></section>
    <section className="formSection pdfAdminSection"><div className="sectionHeading"><div><h2>合集生成</h2><p>按当前已保存的合集成员和精选图片生成。</p></div></div><div className="pdfAdminActions">{action("design", "生成 Design Portfolio")}{action("photography", "生成 Photography Portfolio")}</div></section>
    <section className="formSection pdfAdminSection"><div className="sectionHeading"><div><h2>设计分类生成</h2><p>输出文件名固定，可重复覆盖缓存。</p></div></div><div className="pdfCategoryGrid">{CASE_CATEGORIES.map((entry) => { const target = `category:${entry.value}` as PdfTarget; return <article key={entry.value}><div><strong>{entry.zh}</strong><span>portfolio-design-{entry.value}.pdf</span></div>{action(target, `生成${entry.zh}合集`, "secondary")}</article>; })}</div></section>
    <section className="formSection pdfAdminSection"><div className="sectionHeading"><div><h2>案例与合集成员</h2><p>成员开关直接保存到案例；单案例 PDF 不受合集成员状态影响。</p></div><span>{visible.length} / {cases.length}</span></div>
      <div className="pdfAdminFilters"><label>业务<select value={business} onChange={(event) => setBusiness(event.target.value as BusinessFilter)}><option value="all">全部</option><option value="branding">品牌设计</option><option value="photography">商业摄影</option></select></label><label>设计分类<select value={category} onChange={(event) => setCategory(event.target.value as "all" | CaseCategory)}><option value="all">全部</option>{CASE_CATEGORIES.map((entry) => <option key={entry.value} value={entry.value}>{entry.zh}</option>)}</select></label><label>搜索<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="品牌名或项目名" /></label></div>
      {message && <p className={message.startsWith("保存失败") ? "formError" : "saveMessage"} role="status">{message}</p>}
      <div className="pdfCaseManagement">{visible.map((item) => <article key={item.id}><div><strong>{caseFullTitle(item)}</strong><span>{item.business === "branding" ? "Design" : "Photography"}{item.categories.length ? ` · ${categoryLabels(item.categories)}` : ""}{!item.published ? " · 草稿" : ""}</span></div><label className="checkLabel"><input type="checkbox" checked={item.includeInPortfolioPdf} disabled={pendingIds.includes(item.id)} onChange={() => void toggleMembership(item)} /> 加入合集</label>{action(`case:${item.id}`, "生成案例 PDF", "secondary")}<Link href={`/admin/cases/?id=${encodeURIComponent(item.id)}`} onClick={navigateAdmin}>编辑</Link></article>)}</div>
      {!visible.length && <p className="pdfEmpty">没有符合筛选条件的案例。</p>}
    </section>
  </main>;
}
