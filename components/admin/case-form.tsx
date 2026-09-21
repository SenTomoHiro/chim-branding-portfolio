"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  addChapter, groupBodyAssets, insertAssetInGroup, moveAssetToGroup,
  moveAssetWithinGroup, moveAssetWithinGroupTo, moveChapter, removeChapter,
  UNSECTIONED_GROUP, updateChapter,
} from "@/lib/chapters";
import { mediaRole } from "@/lib/case-media";
import { contentMediaUrl } from "@/lib/runtime-content";
import { BUSINESSES, CASE_CATEGORIES } from "@/lib/taxonomy";
import type { CaseMedia, Business, CaseCategory, PortfolioCase } from "@/lib/types";
import { parseCase } from "@/lib/validation";
import { localPersistence, type AdminPersistence } from "./persistence";
import { PdfGenerateAction, type PdfGenerator } from "./pdf-generation-panel";
import { pdfSourceHash, type PdfCacheEntry } from "@/lib/pdf-cache";

const empty: PortfolioCase = {
  id: `C${Date.now()}`, brandName: "", projectName: "", intro: "", business: "branding",
  categories: [], primaryIndustry: "", media: [], published: false, includeInPortfolioPdf: true,
};

export function CaseForm({ initial, persistence = localPersistence, localPdfEnabled = false, generatePdf, pdfCacheEntry }: { initial?: PortfolioCase; persistence?: AdminPersistence; localPdfEnabled?: boolean; generatePdf?: PdfGenerator; pdfCacheEntry?: PdfCacheEntry }) {
  const [item, setItem] = useState(initial || empty);
  const [isPersisted, setIsPersisted] = useState(Boolean(initial));
  const [savedItem, setSavedItem] = useState(initial || empty);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [status, setStatus] = useState(initial ? "已保存" : "有未保存修改");
  const [dragged, setDragged] = useState<string | null>(null);
  const [chapterDraft, setChapterDraft] = useState<{ assetId: string; title: string; description: string } | null>(null);
  const dirty = useMemo(() => JSON.stringify(item) !== JSON.stringify(savedItem), [item, savedItem]);
  const groups = useMemo(() => groupBodyAssets(item.media), [item.media]);
  const chapterGroups = groups.filter((group) => group.section);
  const hasChapters = chapterGroups.length > 0;
  const set = (key: keyof PortfolioCase, value: unknown) => setItem((current) => ({ ...current, [key]: value }));
  const setMedia = (media: CaseMedia[]) => setItem((current) => ({ ...current, media }));
  const setBusiness = (business: Business) => setItem((current) => ({ ...current, business, categories: business === "photography" ? [] : current.categories }));
  const toggleCategory = (category: CaseCategory) => setItem((current) => ({ ...current, categories: current.categories.includes(category) ? current.categories.filter((entry) => entry !== category) : [...current.categories, category] }));
  const pdfChoice = (selected: boolean, onChange: (selected: boolean) => void, label: string) => <div className="pdfInlineChoice"><label className="checkLabel"><input type="checkbox" checked={selected} onChange={(event) => onChange(event.target.checked)} /> {label}</label></div>;

  async function addMedia(files?: FileList | File[], groupId = hasChapters ? UNSECTIONED_GROUP : groups[0]?.id || UNSECTIONED_GROUP) {
    const queued = Array.from(files || []);
    if (!queued.length) return;
    setUploading(true);
    try {
      for (let index = 0; index < queued.length; index += 1) {
        setUploadProgress(`正在上传 ${index + 1} / ${queued.length}`);
        const body = await persistence.upload(queued[index], item.id || `C${Date.now()}`);
        const asset: CaseMedia = { id: `upload-${Date.now()}-${crypto.randomUUID().slice(0, 6)}`, type: body.type, src: body.src, layout: "full", width: body.width, height: body.height };
        setItem((current) => ({ ...current, media: insertAssetInGroup(current.media, asset, groupId) }));
      }
      setUploadProgress(`已上传 ${queued.length} 个文件`);
    } catch (error) { alert(error instanceof Error ? error.message : "上传失败"); }
    finally { setUploading(false); }
  }

  function openChapterDraft(assetId?: string) {
    const candidate = assetId || item.media.find((asset) => !asset.section)?.id || "";
    setChapterDraft({ assetId: candidate, title: "", description: "" });
  }
  function createChapter() {
    if (!chapterDraft?.assetId || !chapterDraft.title.trim()) return;
    setMedia(addChapter(item.media, chapterDraft.assetId, chapterDraft.title, chapterDraft.description));
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

  return <main className="caseEditor"><div className="editorHeading"><div><p>Cases / {isPersisted ? "Edit" : "New"}</p><h1>{isPersisted ? "编辑案例" : "新建案例"}</h1></div><div className="saveRow"><span className="saveMessage" role="status">{feedback}</span><Link href="/admin" onClick={leave}>返回后台</Link><button form="case-form" className="primaryButton" disabled={pending || uploading || !dirty}>{pending ? "保存中…" : "保存案例"}</button></div></div><form id="case-form" onSubmit={submit}>
    <section className="formSection"><h2>基本信息</h2><div className="formGrid">
      <label>品牌名<input required value={item.brandName} onChange={(event) => set("brandName", event.target.value)} /></label>
      <label>项目名（可选）<input value={item.projectName} onChange={(event) => set("projectName", event.target.value)} /></label>
      <label className="fullField">简介<textarea rows={3} value={item.intro} onChange={(event) => set("intro", event.target.value)} /></label>
      <fieldset className="taxonomyField"><legend>所属业务</legend><div className="optionRow">{BUSINESSES.map((business) => <label key={business.value}><input type="radio" name="business" value={business.value} checked={item.business === business.value} onChange={() => setBusiness(business.value)} />{business.zh}</label>)}</div></fieldset>
      <fieldset className="taxonomyField" disabled={item.business === "photography"}><legend>所属分类</legend><div className="optionRow">{CASE_CATEGORIES.map((category) => <label key={category.value}><input type="checkbox" checked={item.categories.includes(category.value)} onChange={() => toggleCategory(category.value)} />{category.zh}</label>)}</div>{item.business === "photography" && <p className="fieldHint">商业摄影无需选择所属分类</p>}</fieldset>
      <label className="fullField">细分品类<input value={item.primaryIndustry} onChange={(event) => set("primaryIndustry", event.target.value)} placeholder="例如：汉堡、水饺、咖啡、奶茶" /></label>
      <label className="checkLabel fullField"><input type="checkbox" checked={item.published} onChange={(event) => set("published", event.target.checked)} /> 发布到前台</label>
    </div></section>
    <section className="formSection chapterEditor"><div className="sectionHeading"><div><h2>案例媒体</h2><p>统一顺序同步网站与所有 PDF；前两张图片自动担任封面与详情页首图，视频不占用这两个角色。</p></div><div className="bodyMediaActions">
      <label className="checkLabel pdfMembership"><input type="checkbox" checked={item.includeInPortfolioPdf} onChange={(event) => set("includeInPortfolioPdf", event.target.checked)} /> 加入合集 PDF</label>
      {(localPdfEnabled || generatePdf) && isPersisted && <PdfGenerateAction generatePdf={generatePdf} target={`case:${item.id}`} label="生成案例 PDF" sourceHash={pdfSourceHash({ cases: [item], defaultOrder: [item.id], photographyCaseOrder: [item.id] }, `case:${item.id}`)} cacheEntry={pdfCacheEntry} disabled={dirty || pending} hint={dirty ? "请先保存" : undefined} />}
      <button type="button" className="secondaryButton" disabled={!item.media.length} onClick={() => openChapterDraft()}>＋ 添加章节</button>
      <label className="primaryButton">{uploading ? uploadProgress : hasChapters ? "上传未分章节媒体" : "批量上传媒体"}<input type="file" multiple disabled={uploading} accept="image/*,video/mp4,video/webm" onChange={(event) => void addMedia(event.target.files || undefined)} /></label>
    </div></div>
      {uploadProgress && !uploading && <p className="fieldHint uploadStatus" role="status">{uploadProgress}</p>}
      {chapterDraft && <div className="chapterCreate" role="group" aria-label="添加章节"><label>从媒体开始<select value={chapterDraft.assetId} onChange={(event) => setChapterDraft({ ...chapterDraft, assetId: event.target.value })}>{item.media.filter((asset) => !asset.section).map((asset) => <option key={asset.id} value={asset.id}>媒体 {item.media.indexOf(asset) + 1} · {asset.src.split("/").pop()}</option>)}</select></label><label>章节标题<input value={chapterDraft.title} onChange={(event) => setChapterDraft({ ...chapterDraft, title: event.target.value })} /></label><label>章节说明<textarea rows={2} value={chapterDraft.description} onChange={(event) => setChapterDraft({ ...chapterDraft, description: event.target.value })} /></label><div><button type="button" className="primaryButton" disabled={!chapterDraft.assetId || !chapterDraft.title.trim()} onClick={createChapter}>创建章节</button><button type="button" onClick={() => setChapterDraft(null)}>取消</button></div></div>}
      <div className={`chapterGroups ${hasChapters ? "hasChapters" : ""}`}>{groups.map((group) => {
        const chapterIndex = chapterGroups.findIndex((entry) => entry.id === group.id);
        return <section className={`chapterGroup ${group.section ? "isChapter" : "isUnsectioned"}`} data-chapter-id={group.id} key={group.id}>
          {hasChapters && (group.section ? <header className="chapterHeader"><div className="chapterNumber">{group.section.eyebrow}</div><label>章节标题<input required value={group.section.title} onChange={(event) => setMedia(updateChapter(item.media, group.id, { title: event.target.value }))} /></label><label>章节说明<textarea rows={2} value={group.section.description || ""} onChange={(event) => setMedia(updateChapter(item.media, group.id, { description: event.target.value }))} /></label><div className="chapterActions"><button type="button" disabled={chapterIndex === 0} onClick={() => setMedia(moveChapter(item.media, group.id, -1))}>↑ Chapter</button><button type="button" disabled={chapterIndex === chapterGroups.length - 1} onClick={() => setMedia(moveChapter(item.media, group.id, 1))}>↓ Chapter</button><label className="uploadButton">＋ 添加媒体到本章节<input type="file" multiple disabled={uploading} accept="image/*,video/mp4,video/webm" onChange={(event) => void addMedia(event.target.files || undefined, group.id)} /></label><button type="button" className="dangerText" onClick={() => { if (confirm("移除章节标题？章节内媒体会保留并合并到前一章节；首个章节会变为未分章节。")) setMedia(removeChapter(item.media, group.id)); }}>移除 Chapter</button></div></header> : <header className="unsectionedHeader"><div><p>UNSECTIONED</p><h3>未分章节</h3></div><label className="uploadButton">＋ 添加未分章节媒体<input type="file" multiple disabled={uploading} accept="image/*,video/mp4,video/webm" onChange={(event) => void addMedia(event.target.files || undefined, UNSECTIONED_GROUP)} /></label></header>)}
          <div className="bodyAssetList">{group.assets.map((asset, groupIndex) => {
            const index = item.media.findIndex((entry) => entry.id === asset.id);
            const role = mediaRole(item.media, asset);
            return <article key={asset.id} data-media-role={role} draggable onDragStart={() => setDragged(asset.id)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragged) setMedia(moveAssetWithinGroupTo(item.media, dragged, asset.id)); setDragged(null); }}><div className="assetPreview">{asset.type === "video" ? <video src={contentMediaUrl(asset.src)} controls playsInline /> : <Image src={contentMediaUrl(asset.src)} alt={`媒体 ${index + 1} 预览`} fill sizes="160px" />}</div><div><strong>⠿ 媒体 {index + 1} {role && <span className="mediaRoleBadge">{role === "cover" ? "封面" : "详情页首图"}</span>}</strong><span title={asset.src}>{asset.src}</span>{asset.provenance && <small title={asset.provenance.extractionMethod}>来源 {asset.provenance.assetId}</small>}</div>{asset.type === "image" ? pdfChoice(Boolean(asset.portfolioPdfSelected), (selected) => { const next = [...item.media]; next[index] = { ...asset, portfolioPdfSelected: selected }; setMedia(next); }, `媒体 ${index + 1} 合集精选`) : <span className="pdfUnavailable">视频不进入合集</span>}<select aria-label={`媒体 ${index + 1} 宽度`} value={asset.layout} onChange={(event) => { const next = [...item.media]; next[index] = { ...asset, layout: event.target.value === "half" ? "half" : "full" }; setMedia(next); }}><option value="full">Full</option><option value="half">Half</option></select>{hasChapters && <select className="chapterMove" aria-label={`移动媒体 ${index + 1} 到章节`} value={group.id} onChange={(event) => setMedia(moveAssetToGroup(item.media, asset.id, event.target.value))}><option value={UNSECTIONED_GROUP}>未分章节</option>{chapterGroups.map((chapter, number) => <option key={chapter.id} value={chapter.id}>{chapter.section?.eyebrow || `CHAPTER ${String(number + 1).padStart(2, "0")}`} · {chapter.section?.title}</option>)}</select>}<button type="button" disabled={groupIndex === 0} onClick={() => setMedia(moveAssetWithinGroup(item.media, asset.id, -1))}>↑</button><button type="button" disabled={groupIndex === group.assets.length - 1} onClick={() => setMedia(moveAssetWithinGroup(item.media, asset.id, 1))}>↓</button>{!asset.section && <button type="button" className="chapterFromMedia" onClick={() => openChapterDraft(asset.id)}>从此创建章节</button>}<button type="button" className="dangerText" onClick={() => setMedia(item.media.filter((entry) => entry.id !== asset.id))}>删除</button></article>;
          })}</div>
        </section>;
      })}</div>
    </section>
  </form></main>;
}
