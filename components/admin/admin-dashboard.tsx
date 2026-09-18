"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatCaseMetadata } from "@/lib/taxonomy";
import { getBrandingCases, getPhotographyCases } from "@/lib/sort-cases";
import type { ContentData, PortfolioCase } from "@/lib/types";

function move<T>(items: T[], from: number, to: number) { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }

function OrderSection({ title, description, type, cases, order, onOrder, onToggle, onRemove }: { title: string; description: string; type: "branding" | "photography"; cases: PortfolioCase[]; order: string[]; onOrder: (order: string[]) => void; onToggle: (item: PortfolioCase) => void; onRemove: (item: PortfolioCase) => void }) {
  const [dragged, setDragged] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const ordered = useMemo(() => { const byId = new Map(cases.map((item) => [item.id, item])); const seen = new Set<string>(); const result: PortfolioCase[] = []; for (const id of order) { const item = byId.get(id); if (item && !seen.has(id)) { result.push(item); seen.add(id); } } for (const item of cases) if (!seen.has(item.id)) result.push(item); return result; }, [cases, order]);
  async function saveOrder() { const response = await fetch("/api/admin/order", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ order, type }) }); setMessage(response.ok ? "排序已保存" : "保存失败"); }
  return <section className="adminSection" data-order-type={type}><div className="sectionHeading"><div><h2>{title}</h2><p>{description}</p></div><div><button className="primaryButton" onClick={saveOrder}>保存排序</button><span className="saveMessage">{message}</span></div></div><div className="adminCaseList">{ordered.map((item, index) => <article key={item.id} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null) onOrder(move(ordered.map((entry) => entry.id), dragged, index)); setDragged(null); }}><span className="dragHandle">⠿</span><div className="adminThumb"><Image src={item.cover} alt="" fill sizes="100px" /></div><div className="adminCaseName"><strong>{item.name}</strong><span>{formatCaseMetadata(item, true)}</span></div><button className={`status ${item.published ? "published" : ""}`} onClick={() => onToggle(item)}>{item.published ? "已发布" : "草稿"}</button><div className="mobileReorder"><button disabled={index === 0} onClick={() => onOrder(move(ordered.map((entry) => entry.id), index, index - 1))}>↑</button><button disabled={index === ordered.length - 1} onClick={() => onOrder(move(ordered.map((entry) => entry.id), index, index + 1))}>↓</button></div><Link href={`/admin/cases/${item.id}`}>编辑</Link><button className="dangerText" onClick={() => onRemove(item)}>删除</button></article>)}</div></section>;
}

export function AdminDashboard({ initial }: { initial: ContentData }) {
  const [data, setData] = useState(initial);
  const [brandingOrder, setBrandingOrder] = useState(initial.defaultOrder);
  const [photoOrder, setPhotoOrder] = useState(initial.photographyCaseOrder);
  const brandingCases = getBrandingCases(data.cases);
  const photographyCases = getPhotographyCases(data.cases);
  async function toggle(item: PortfolioCase) { const response = await fetch(`/api/admin/cases/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...item, published: !item.published }) }); if (response.ok) setData({ ...data, cases: data.cases.map((entry) => entry.id === item.id ? { ...entry, published: !entry.published } : entry) }); }
  async function remove(item: PortfolioCase) { if (!confirm(`确认删除“${item.name}”？媒体文件将保留。`)) return; const response = await fetch(`/api/admin/cases/${item.id}`, { method: "DELETE" }); if (response.ok) { setData({ ...data, cases: data.cases.filter((entry) => entry.id !== item.id) }); setBrandingOrder(brandingOrder.filter((id) => id !== item.id)); setPhotoOrder(photoOrder.filter((id) => id !== item.id)); } }
  useEffect(() => { const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => void | Promise<void> } }).modelContext; if (!context?.registerTool) return; const lifecycle = new AbortController(); void Promise.resolve(context.registerTool({ name: "list_portfolio_cases", title: "列出案例", description: "读取后台中的案例名称、发布状态与分类。", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: false }, execute: () => ({ cases: data.cases.map(({ id, name, slug, published, business, categories }) => ({ id, name, slug, published, business, categories })) }) }, { signal: lifecycle.signal })).catch(() => {}); return () => lifecycle.abort(); }, [data.cases]);
  return <main className="adminPage"><section className="adminTitle"><div><p>Content / Cases</p><h1>案例管理</h1></div><Link className="primaryButton" href="/admin/cases/new">新建案例</Link></section><OrderSection title="Branding 默认排序" description="Branding 首页及其分类筛选共用这一顺序。" type="branding" cases={brandingCases} order={brandingOrder} onOrder={setBrandingOrder} onToggle={toggle} onRemove={remove} /><OrderSection title="Photography 默认排序" description="商业摄影页面 /photo 的正式顺序。" type="photography" cases={photographyCases} order={photoOrder} onOrder={setPhotoOrder} onToggle={toggle} onRemove={remove} /></main>;
}
