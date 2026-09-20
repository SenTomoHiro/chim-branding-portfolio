"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatCaseMetadata } from "@/lib/taxonomy";
import { initializePortfolioPdfSelection, resolvePortfolioPdfImages } from "@/lib/pdf-portfolio";
import { assetPath } from "@/lib/site-path";
import { getBrandingCases, getPhotographyCases } from "@/lib/sort-cases";
import type { ContentData, PortfolioCase } from "@/lib/types";
import { localPersistence, type AdminPersistence } from "./persistence";
import { caseFullTitle } from "@/lib/case-title";
import { getCaseCover } from "@/lib/case-media";

function move<T>(items: T[], from: number, to: number) { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }

function OrderSection({ title, description, type, cases, order, onOrder, onToggle, onRemove, persistence }: { title: string; description: string; type: "branding" | "photography"; cases: PortfolioCase[]; order: string[]; onOrder: (order: string[]) => void; onToggle: (item: PortfolioCase) => void; onRemove: (item: PortfolioCase) => void; persistence: AdminPersistence }) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [message, setMessage] = useState(""); const [pending, setPending] = useState(false);
  const [savedOrder, setSavedOrder] = useState(order);
  const dirty = order.join("|") !== savedOrder.join("|");
  const ordered = useMemo(() => { const byId = new Map(cases.map((item) => [item.id, item])); const seen = new Set<string>(); const result: PortfolioCase[] = []; for (const id of order) { const item = byId.get(id); if (item && !seen.has(id)) { result.push(item); seen.add(id); } } for (const item of cases) if (!seen.has(item.id)) result.push(item); return result; }, [cases, order]);
  async function saveOrder() { setPending(true); setMessage(""); try { await persistence.saveOrder(order, type); setSavedOrder(order); setMessage("排序已保存"); } catch (error) { setMessage(`保存失败：${error instanceof Error ? error.message : "请重试"}`); } finally { setPending(false); } }
  return <section className="adminSection" data-order-type={type}><div className="sectionHeading"><div><h2>{title}</h2><p>{description}</p></div><div><button className="primaryButton" disabled={pending || !dirty} onClick={saveOrder}>{pending ? "保存中…" : "保存排序"}</button>{dirty && <span className="saveMessage" role="status">排序有未保存修改</span>}{message && <span className="saveMessage" role="status">{message}</span>}</div></div><div className="adminCaseList">{ordered.map((item, index) => <article key={item.id} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null) onOrder(move(ordered.map((entry) => entry.id), dragged, index)); setDragged(null); }}><span className="dragHandle">⠿</span><div className="adminThumb"><Image src={assetPath(getCaseCover(item)!.src)} alt="" fill sizes="100px" /></div><div className="adminCaseName"><strong>{caseFullTitle(item)}</strong><span>{formatCaseMetadata(item, true)}</span></div><button className={`status ${item.published ? "published" : ""}`} onClick={() => onToggle(item)}>{item.published ? "已发布" : "草稿"}</button><div className="mobileReorder"><button disabled={index === 0} onClick={() => onOrder(move(ordered.map((entry) => entry.id), index, index - 1))}>↑</button><button disabled={index === ordered.length - 1} onClick={() => onOrder(move(ordered.map((entry) => entry.id), index, index + 1))}>↓</button></div><Link href={`/admin/cases/${item.id}`}>编辑</Link><button className="dangerText" onClick={() => onRemove(item)}>删除</button></article>)}</div></section>;
}

export function AdminDashboard({ initial, persistence = localPersistence }: { initial: ContentData; persistence?: AdminPersistence }) {
  const pageRef = useRef<HTMLElement>(null); const titleRef = useRef<HTMLElement>(null);
  const [data, setData] = useState(initial);
  const [brandingOrder, setBrandingOrder] = useState(initial.defaultOrder);
  const [photoOrder, setPhotoOrder] = useState(initial.photographyCaseOrder);
  const brandingCases = getBrandingCases(data.cases);
  const photographyCases = getPhotographyCases(data.cases);
  useEffect(() => { const page = pageRef.current; const title = titleRef.current; if (!page || !title) return; const update = () => page.style.setProperty("--admin-title-height", `${title.getBoundingClientRect().height}px`); update(); const observer = new ResizeObserver(update); observer.observe(title); return () => observer.disconnect(); }, []);
  async function toggle(item: PortfolioCase) { try { let next = { ...item, published: !item.published }; if (next.published && next.includeInPortfolioPdf && !resolvePortfolioPdfImages(next).length) next = initializePortfolioPdfSelection(next); await persistence.saveCase(next, true); setData({ ...data, cases: data.cases.map((entry) => entry.id === item.id ? next : entry) }); } catch {} }
  async function remove(item: PortfolioCase) { if (!confirm(`确认删除“${caseFullTitle(item)}”？媒体文件将保留。`)) return; try { await persistence.deleteCase(item); setData({ ...data, cases: data.cases.filter((entry) => entry.id !== item.id) }); setBrandingOrder(brandingOrder.filter((id) => id !== item.id)); setPhotoOrder(photoOrder.filter((id) => id !== item.id)); } catch {} }
  useEffect(() => { const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext; if (!context?.registerTool) return; const lifecycle = new AbortController(); void Promise.resolve(context.registerTool({ name: "list_portfolio_cases", title: "列出案例", description: "读取后台中的案例名称、发布状态与分类。", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ cases: data.cases.map(({ id, brandName, projectName, published, business, categories }) => ({ id, brandName, projectName, published, business, categories })) }) }, { signal: lifecycle.signal })).catch(() => {}); return () => lifecycle.abort(); }, [data.cases]);
  return <main className="adminPage" ref={pageRef}><section className="adminTitle" ref={titleRef}><div><p>Content / Cases</p><h1>案例管理</h1></div><Link className="primaryButton" href="/admin/cases/new">新建案例</Link></section><OrderSection title="Branding 默认排序" description="Branding 首页及其分类筛选共用这一顺序。" type="branding" cases={brandingCases} order={brandingOrder} onOrder={setBrandingOrder} onToggle={toggle} onRemove={remove} persistence={persistence} /><OrderSection title="Photography 默认排序" description="商业摄影页面 /photo 的正式顺序。" type="photography" cases={photographyCases} order={photoOrder} onOrder={setPhotoOrder} onToggle={toggle} onRemove={remove} persistence={persistence} /></main>;
}
