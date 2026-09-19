"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  addChapter,
  groupBodyAssets,
  insertAssetInGroup,
  moveAssetToGroup,
  moveAssetWithinGroup,
  moveAssetWithinGroupTo,
  moveChapter,
  removeChapter,
  UNSECTIONED_GROUP,
  updateChapter,
} from "@/lib/chapters";
import { BUSINESSES, CASE_CATEGORIES } from "@/lib/taxonomy";
import { assetPath } from "@/lib/site-path";
import type { BodyAsset, Business, CaseCategory, PortfolioCase } from "@/lib/types";
import { parseCase } from "@/lib/validation";
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
  const [dragged, setDragged] = useState<string | null>(null);
  const [chapterDraft, setChapterDraft] = useState<{ assetId: string; title: string; description: string } | null>(null);
  const dirty = useMemo(() => JSON.stringify(item) !== JSON.stringify(savedItem), [item, savedItem]);
  const groups = useMemo(() => groupBodyAssets(item.bodyAssets), [item.bodyAssets]);
  const chapterGroups = groups.filter((group) => group.section);
  const hasChapters = chapterGroups.length > 0;
  const set = (key: keyof PortfolioCase, value: unknown) => setItem((current) => ({ ...current, [key]: value }));
  const setBodyAssets = (bodyAssets: BodyAsset[]) => setItem((current) => ({ ...current, bodyAssets }));
  const setBusiness = (business: Business) => setItem((current) => ({ ...current, business, categories: business === "photography" ? [] : current.categories }));
  const toggleCategory = (category: CaseCategory) => setItem((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((entry) => entry !== category) : [...current.categories, category] }));

  async function addBody(file?: File, groupId = hasChapters ? UNSECTIONED_GROUP : groups[0]?.id || UNSECTIONED_GROUP) {
    if (!file) return;
    let body; try { body = await persistence.upload(file, item.id || `C${Date.now()}`); } catch (error) { alert(error instanceof Error ? error.message : "上传失败"); return; }
    const asset: BodyAsset = { id: `upload-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`, type: body.type, src: body.src, layout: "full" };
    setItem((current) => ({ ...current, bodyAssets: insertAssetInGroup(current.bodyAssets, asset, groupId) }));
  }

  function openChapterDraft(assetId?: string) {
    const candidate = assetId || item.bodyAssets.find((asset) => !asset.section)?.id || "";
    setChapterDraft({ assetId: candidate, title: "", description: "" });
  }

  function createChapter() {
    if (!chapterDraft?.assetId || !chapterDraft.title.trim()) return;
    setBodyAssets(addChapter(item.bodyAssets, chapterDraft.assetId, chapterDraft.title, chapterDraft.description));
    setChapterDraft(null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setStatus("保存中…");
    try {
      const validated = parseCase(item, isPersisted ? item : undefined);
      await persistence.saveCase(validated, isPersisted);
      setItem(validated); setIsPersisted(true); setSavedItem(validated); setStatus("保存成功");
    } catch (error) { setStatus(`保存失败：${error instanceof Error ? error.message : "请重试"}`); }
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
    <section className="formSection chapterEditor"><div className="sectionHeading"><div><h2>正文媒体</h2><p>章节编号随顺序自动更新；媒体可在章节内排序，也可移动到其他章节。</p></div><div><button type="button" className="secondaryButton" disabled={!item.bodyAssets.length} onClick={() => openChapterDraft()}>＋ 添加章节</button><label className="primaryButton">{hasChapters ? "上传未分章节媒体" : "上传媒体"}<input type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => addBody(event.target.files?.[0])} /></label></div></div>
      {chapterDraft && <div className="chapterCreate" role="group" aria-label="添加章节"><label>从正文媒体开始<select value={chapterDraft.assetId} onChange={(event) => setChapterDraft({ ...chapterDraft, assetId: event.target.value })}>{item.bodyAssets.filter((asset) => !asset.section).map((asset) => <option key={asset.id} value={asset.id}>媒体 {item.bodyAssets.indexOf(asset) + 1} · {asset.src.split("/").pop()}</option>)}</select></label><label>章节标题<input value={chapterDraft.title} onChange={(event) => setChapterDraft({ ...chapterDraft, title: event.target.value })} /></label><label>章节说明<textarea rows={2} value={chapterDraft.description} onChange={(event) => setChapterDraft({ ...chapterDraft, description: event.target.value })} /></label><div><button type="button" className="primaryButton" disabled={!chapterDraft.assetId || !chapterDraft.title.trim()} onClick={createChapter}>创建章节</button><button type="button" onClick={() => setChapterDraft(null)}>取消</button></div></div>}
      <div className={`chapterGroups ${hasChapters ? "hasChapters" : ""}`}>{groups.map((group) => {
        const chapterIndex = chapterGroups.findIndex((entry) => entry.id === group.id);
        return <section className={`chapterGroup ${group.section ? "isChapter" : "isUnsectioned"}`} data-chapter-id={group.id} key={group.id}>
          {hasChapters && (group.section ? <header className="chapterHeader"><div className="chapterNumber">{group.section.eyebrow}</div><label>章节标题<input required value={group.section.title} onChange={(event) => setBodyAssets(updateChapter(item.bodyAssets, group.id, { title: event.target.value }))} /></label><label>章节说明<textarea rows={2} value={group.section.description || ""} onChange={(event) => setBodyAssets(updateChapter(item.bodyAssets, group.id, { description: event.target.value }))} /></label><div className="chapterActions"><button type="button" disabled={chapterIndex === 0} onClick={() => setBodyAssets(moveChapter(item.bodyAssets, group.id, -1))}>↑ Chapter</button><button type="button" disabled={chapterIndex === chapterGroups.length - 1} onClick={() => setBodyAssets(moveChapter(item.bodyAssets, group.id, 1))}>↓ Chapter</button><label className="uploadButton">＋ 添加媒体到本章节<input type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => addBody(event.target.files?.[0], group.id)} /></label><button type="button" className="dangerText" onClick={() => { if (confirm("移除章节标题？章节内媒体会保留并合并到前一章节；首个章节会变为未分章节。")) setBodyAssets(removeChapter(item.bodyAssets, group.id)); }}>移除 Chapter</button></div></header> : <header className="unsectionedHeader"><div><p>UNSECTIONED</p><h3>未分章节</h3></div><label className="uploadButton">＋ 添加未分章节媒体<input type="file" accept="image/*,video/mp4,video/webm" onChange={(event) => addBody(event.target.files?.[0], UNSECTIONED_GROUP)} /></label></header>)}
          <div className="bodyAssetList">{group.assets.map((asset, groupIndex) => {
            const index = item.bodyAssets.findIndex((entry) => entry.id === asset.id);
            return <article key={asset.id} draggable onDragStart={() => setDragged(asset.id)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged) setBodyAssets(moveAssetWithinGroupTo(item.bodyAssets, dragged, asset.id)); setDragged(null); }}><div className="assetPreview">{asset.type === "video" ? <video src={assetPath(asset.src)} controls playsInline /> : <Image src={assetPath(asset.src)} alt={`正文媒体 ${index + 1} 预览`} fill sizes="160px" />}</div><div><strong>⠿ 媒体 {index + 1}</strong><span title={asset.src}>{asset.src}</span>{asset.provenance && <small title={asset.provenance.extractionMethod}>来源 {asset.provenance.assetId}</small>}</div><select aria-label={`媒体 ${index + 1} 宽度`} value={asset.layout} onChange={(event) => { const next = [...item.bodyAssets]; next[index] = { ...asset, layout: event.target.value === "half" ? "half" : "full" }; setBodyAssets(next); }}><option value="full">Full</option><option value="half">Half</option></select>{hasChapters && <select className="chapterMove" aria-label={`移动媒体 ${index + 1} 到章节`} value={group.id} onChange={(event) => setBodyAssets(moveAssetToGroup(item.bodyAssets, asset.id, event.target.value))}><option value={UNSECTIONED_GROUP}>未分章节</option>{chapterGroups.map((chapter, number) => <option key={chapter.id} value={chapter.id}>{chapter.section?.eyebrow || `CHAPTER ${String(number + 1).padStart(2, "0")}`} · {chapter.section?.title}</option>)}</select>}<button type="button" disabled={groupIndex === 0} onClick={() => setBodyAssets(moveAssetWithinGroup(item.bodyAssets, asset.id, -1))}>↑</button><button type="button" disabled={groupIndex === group.assets.length - 1} onClick={() => setBodyAssets(moveAssetWithinGroup(item.bodyAssets, asset.id, 1))}>↓</button>{!asset.section && <button type="button" className="chapterFromMedia" onClick={() => openChapterDraft(asset.id)}>从此创建章节</button>}<button type="button" className="dangerText" onClick={() => setBodyAssets(item.bodyAssets.filter((entry) => entry.id !== asset.id))}>删除</button></article>;
          })}</div>
        </section>;
      })}</div>
    </section>
  </form></main>;
}
