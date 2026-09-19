"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { BUSINESSES, CASE_CATEGORIES } from "@/lib/taxonomy";
import { assetPath } from "@/lib/site-path";
import type { BodyAsset, Business, CaseCategory, PortfolioCase } from "@/lib/types";
import { localPersistence, type AdminPersistence } from "./persistence";

const empty: PortfolioCase = { id: `C${Date.now()}`, name: "", intro: "", business: "branding", categories: [], primaryIndustry: "", cover: "", coverWidth: 1400, coverHeight: 1050, hero: "", bodyAssets: [], published: false };

function MediaInput({ label, value, onChange, uploadFile, caseId }: { label: string; value: string; onChange: (value: string, width?: number, height?: number) => void; uploadFile: AdminPersistence["upload"]; caseId: string }) {
  const [pending, setPending] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setPending(true);
    let body; try { body = await uploadFile(file, caseId); } catch (error) { setPending(false); alert(error instanceof Error ? error.message : "上传失败"); return; } setPending(false);
    if (body.type !== "image") { alert(`${label} 仅支持图片`); return; }
    onChange(body.src, body.width, body.height);
  }
  return <div className="mediaInput"><label>{label}</label>{value ? <><div className="mediaPreview"><Image src={assetPath(value)} alt={`${label}预览`} fill sizes="240px" /></div><p className="mediaPath" title={value}>{value}</p></> : <p className="mediaPath">尚未上传</p>}<label className="uploadButton">{pending ? "处理中…" : "上传文件"}<input type="file" accept="image/*" disabled={pending} onChange={(event) => upload(event.target.files?.[0])} /></label></div>;
}

export function CaseForm({ initial, persistence = localPersistence }: { initial?: PortfolioCase; persistence?: AdminPersistence }) {
  const [item, setItem] = useState(initial || empty);
  const [isPersisted, setIsPersisted] = useState(Boolean(initial));
  const [savedItem, setSavedItem] = useState(initial || empty);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState(initial ? "已保存" : "有未保存修改");
  const [dragged, setDragged] = useState<number | null>(null);
  const dirty = useMemo(() => JSON.stringify(item) !== JSON.stringify(savedItem), [item, savedItem]);
  const set = (key: keyof PortfolioCase, value: unknown) => setItem((current) => ({ ...current, [key]: value }));
  const setBusiness = (business: Business) => setItem((current) => ({ ...current, business, categories: business === "photography" ? [] : current.categories }));
  const toggleCategory = (category: CaseCategory) => setItem((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((entry) => entry !== category) : [...current.categories, category] }));

  async function addBody(file?: File) {
    if (!file) return;
    let body; try { body = await persistence.upload(file, item.id || `C${Date.now()}`); } catch (error) { alert(error instanceof Error ? error.message : "上传失败"); return; }
    setItem((current) => ({ ...current, bodyAssets: [...current.bodyAssets, { id: `upload-${Date.now()}`, type: body.type, src: body.src, layout: "full" }] }));
  }
  function moveBody(index: number, to: number) { setItem((current) => { const next = [...current.bodyAssets]; const [asset] = next.splice(index, 1); next.splice(to, 0, asset); return { ...current, bodyAssets: next }; }); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setStatus("保存中…");
    try { await persistence.saveCase(item, isPersisted); setIsPersisted(true); setSavedItem(item); setStatus("保存成功"); }
    catch (error) { setStatus(`保存失败：${error instanceof Error ? error.message : "请重试"}`); }
    finally { setPending(false); }
  }

  const leave = (event: React.MouseEvent<HTMLAnchorElement>) => { if (dirty && !confirm("当前有未保存修改，确认离开吗？")) event.preventDefault(); };

  const feedback = pending ? "保存中…" : status.startsWith("保存失败") ? status : dirty ? "有未保存修改" : status;
  return <main className="caseEditor"><div className="editorHeading"><div><p>Cases / {isPersisted ? "Edit" : "New"}</p><h1>{isPersisted ? "编辑案例" : "新建案例"}</h1></div><div className="saveRow"><span className="saveMessage" role="status">{feedback}</span><Link href="/admin" onClick={leave}>返回后台</Link><button form="case-form" className="primaryButton" disabled={pending || !dirty}>{pending ? "保存中…" : "保存案例"}</button></div></div><form id="case-form" onSubmit={submit}>
    <section className="formSection"><h2>基本信息</h2><div className="formGrid">
      <label className="fullField">名称<input required value={item.name} onChange={(event) => set("name", event.target.value)} /></label>
      <label className="fullField">简介<textarea rows={3} value={item.intro} onChange={(event) => set("intro", event.target.value)} /></label>
      <fieldset className="taxonomyField"><legend>所属业务</legend><div className="optionRow">{BUSINESSES.map((business) => <label key={business.value}><input type="radio" name="business" value={business.value} checked={item.business === business.value} onChange={() => setBusiness(business.value)} />{business.zh}</label>)}</div></fieldset>
      <fieldset className="taxonomyField" disabled={item.business === "photography"}><legend>所属分类</legend><div className="optionRow">{CASE_CATEGORIES.map((category) => <label key={category.value}><input type="checkbox" checked={item.categories.includes(category.value)} onChange={() => toggleCategory(category.value)} />{category.zh}</label>)}</div>{item.business === "photography" && <p className="fieldHint">商业摄影无需选择所属分类</p>}</fieldset>
      <label className="fullField">细分品类<input value={item.primaryIndustry} onChange={(event) => set("primaryIndustry", event.target.value)} placeholder="例如：汉堡、水饺、咖啡、奶茶" /></label>
      <label className="checkLabel fullField"><input type="checkbox" checked={item.published} onChange={(event) => set("published", event.target.checked)} /> 发布到前台</label>
    </div></section>
    <section className="formSection"><h2>案例图片</h2><div className="mediaInputs"><MediaInput label="案例列表封面" value={item.cover} caseId={item.id || `C${Date.now()}`} uploadFile={persistence.upload} onChange={(value, width, height) => setItem((current) => ({ ...current, cover: value, coverWidth: width || current.coverWidth, coverHeight: height || current.coverHeight }))} /><MediaInput label="案例详情页首图" value={item.hero} caseId={item.id || `C${Date.now()}`} uploadFile={persistence.upload} onChange={(value) => set("hero", value)} /></div></section>
    <section className="formSection"><div className="sectionHeading"><div><h2>正文媒体</h2><p>可拖动调整顺序；两个相邻的 Half 会并排显示，落单 Half 自动满宽。</p></div><label className="primaryButton">上传媒体<input type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => addBody(event.target.files?.[0])} /></label></div><div className="bodyAssetList">{item.bodyAssets.map((asset: BodyAsset, index) => <article key={asset.id} draggable onDragStart={() => setDragged(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged !== null) moveBody(dragged, index); setDragged(null); }}><div className="assetPreview">{asset.type === "video" ? <video src={assetPath(asset.src)} controls playsInline /> : <Image src={assetPath(asset.src)} alt={`正文媒体 ${index + 1} 预览`} fill sizes="160px" />}</div><div><strong>⠿ 媒体 {index + 1}</strong><span>{asset.src}</span></div><select value={asset.layout} onChange={(event) => { const next = [...item.bodyAssets]; next[index] = { ...asset, layout: event.target.value === "half" ? "half" : "full" }; setItem({ ...item, bodyAssets: next }); }}><option value="full">Full</option><option value="half">Half</option></select><button type="button" disabled={index === 0} onClick={() => moveBody(index, index - 1)}>↑</button><button type="button" disabled={index === item.bodyAssets.length - 1} onClick={() => moveBody(index, index + 1)}>↓</button><button type="button" className="dangerText" onClick={() => setItem({ ...item, bodyAssets: item.bodyAssets.filter((_, itemIndex) => itemIndex !== index) })}>删除</button></article>)}</div></section>
  </form></main>;
}
