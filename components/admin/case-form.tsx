"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  addChapter, groupBodyAssets, insertAssetInGroup, moveAssetToGroup,
  moveAssetWithinGroup, moveAssetWithinGroupTo, moveChapter, removeChapter,
  UNSECTIONED_GROUP, updateChapter,
} from "@/lib/chapters";
import { getCaseBodyMedia, getRoleImages, mediaRole, replaceCaseBodyMedia } from "@/lib/case-media";
import { moveIdByOffset, moveIdOver } from "@/lib/reorder";
import { contentMediaUrl } from "@/lib/runtime-content";
import { BUSINESSES, CASE_CATEGORIES } from "@/lib/taxonomy";
import type { CaseMedia, Business, CaseCategory, PortfolioCase } from "@/lib/types";
import { parseCase } from "@/lib/validation";
import { pdfSourceHash, type PdfCacheEntry } from "@/lib/pdf-cache";
import { AdminIconButton, ChapterSplitIcon, TrashIcon } from "./admin-icon-button";
import { navigateAdmin } from "./admin-navigation";
import type { AdminPersistence } from "./persistence";
import { PdfGenerateAction, type PdfGenerator } from "./pdf-generation-panel";
import { useLiveSortable } from "./use-live-sortable";

type ChapterDraft = { assetId: string; title: string; description: string };

const empty: PortfolioCase = {
  id: `C${Date.now()}`, brandName: "", projectName: "", intro: "", business: "branding",
  categories: [], primaryIndustry: "", media: [], published: false, includeInPortfolioPdf: true,
};

function ChapterCreate({ draft, candidates, media, onChange, onCreate, onCancel }: {
  draft: ChapterDraft;
  candidates: CaseMedia[];
  media: CaseMedia[];
  onChange: (draft: ChapterDraft) => void;
  onCreate: () => void;
  onCancel: () => void;
}) {
  return <div className="chapterCreate" role="group" aria-label="添加章节" data-chapter-draft-for={draft.assetId}>
    <label>从媒体开始<select value={draft.assetId} onChange={(event) => onChange({ ...draft, assetId: event.target.value })}>{candidates.map((asset) => <option key={asset.id} value={asset.id}>媒体 {media.findIndex((entry) => entry.id === asset.id) + 1} · {asset.src.split("/").pop()}</option>)}</select></label>
    <label>章节标题<input value={draft.title} onChange={(event) => onChange({ ...draft, title: event.target.value })} /></label>
    <label>章节说明<textarea rows={2} value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></label>
    <div><button type="button" className="primaryButton" disabled={!draft.assetId || !draft.title.trim()} onClick={onCreate}>创建章节</button><button type="button" onClick={onCancel}>取消</button></div>
  </div>;
}

export function CaseForm({ initial, persistence, generatePdf, pdfCacheEntry }: { initial?: PortfolioCase; persistence: AdminPersistence; generatePdf?: PdfGenerator; pdfCacheEntry?: PdfCacheEntry }) {
  const [item, setItem] = useState(initial || empty);
  const [isPersisted, setIsPersisted] = useState(Boolean(initial));
  const [savedItem, setSavedItem] = useState(initial || empty);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [status, setStatus] = useState(initial ? "已保存" : "有未保存修改");
  const [chapterDraft, setChapterDraft] = useState<ChapterDraft | null>(null);
  const dirty = useMemo(() => JSON.stringify(item) !== JSON.stringify(savedItem), [item, savedItem]);
  const bodyMedia = useMemo(() => getCaseBodyMedia(item), [item]);
  const groups = useMemo(() => groupBodyAssets(bodyMedia), [bodyMedia]);
  const chapterGroups = groups.filter((group) => group.section);
  const hasChapters = chapterGroups.length > 0;
  const chapterCandidates = useMemo(() => bodyMedia.filter((asset) => !asset.section), [bodyMedia]);
  const candidateKey = chapterCandidates.map((asset) => asset.id).join("|");
  const roleImages = getRoleImages(item.media);
  const roleMedia = [roleImages.cover, roleImages.hero].filter((asset): asset is CaseMedia => Boolean(asset));

  const sortable = useLiveSortable((activeId, overId) => setItem((current) => {
    const body = getCaseBodyMedia(current);
    const bodyIds = new Set(body.map((asset) => asset.id));
    if (bodyIds.has(activeId) && bodyIds.has(overId)) {
      return { ...current, media: replaceCaseBodyMedia(current, moveAssetWithinGroupTo(body, activeId, overId)) };
    }
    return { ...current, media: moveIdOver(current.media, activeId, overId) };
  }));

  useEffect(() => {
    setChapterDraft((current) => {
      if (!current || chapterCandidates.some((asset) => asset.id === current.assetId)) return current;
      return chapterCandidates[0] ? { ...current, assetId: chapterCandidates[0].id } : null;
    });
  }, [candidateKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key: keyof PortfolioCase, value: unknown) => setItem((current) => ({ ...current, [key]: value }));
  const setMedia = (media: CaseMedia[]) => setItem((current) => ({ ...current, media }));
  const transformBody = (transform: (body: CaseMedia[]) => CaseMedia[]) => setItem((current) => ({ ...current, media: replaceCaseBodyMedia(current, transform(getCaseBodyMedia(current))) }));
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
        setItem((current) => ({ ...current, media: replaceCaseBodyMedia(current, insertAssetInGroup(getCaseBodyMedia(current), asset, groupId)) }));
      }
      setUploadProgress(`已上传 ${queued.length} 个文件`);
    } catch (error) { alert(error instanceof Error ? error.message : "上传失败"); }
    finally { setUploading(false); }
  }

  function openChapterDraft(assetId?: string) {
    const candidate = assetId && chapterCandidates.some((asset) => asset.id === assetId) ? assetId : chapterCandidates[0]?.id;
    if (candidate) setChapterDraft({ assetId: candidate, title: "", description: "" });
  }

  function createChapter() {
    if (!chapterDraft?.assetId || !chapterDraft.title.trim()) return;
    const draft = chapterDraft;
    transformBody((body) => addChapter(body, draft.assetId, draft.title, draft.description));
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

  const leave = (event: React.MouseEvent<HTMLAnchorElement>) => { if (dirty && !confirm("当前有未保存修改，确认离开吗？")) { event.preventDefault(); return; } navigateAdmin(event); };
  const feedback = pending ? "保存中…" : status.startsWith("保存失败") ? status : dirty ? "有未保存修改" : status;

  function renderMediaRow(asset: CaseMedia, groupId?: string, groupIndex?: number, groupLength?: number) {
    const index = item.media.findIndex((entry) => entry.id === asset.id);
    const role = mediaRole(item.media, asset);
    const isBody = !role;
    const moveByOffset = (offset: -1 | 1) => isBody
      ? transformBody((body) => moveAssetWithinGroup(body, asset.id, offset))
      : setItem((current) => ({ ...current, media: moveIdByOffset(current.media, asset.id, offset) }));
    return <Fragment key={asset.id}>
      {chapterDraft?.assetId === asset.id && <ChapterCreate draft={chapterDraft} candidates={chapterCandidates} media={item.media} onChange={setChapterDraft} onCreate={createChapter} onCancel={() => setChapterDraft(null)} />}
      <article data-media-id={asset.id} data-media-role={role} {...sortable.rowProps(asset.id)}>
        <div className="assetPreview">{asset.type === "video" ? <video src={contentMediaUrl(asset.src)} controls playsInline /> : <Image src={contentMediaUrl(asset.src)} alt={`媒体 ${index + 1} 预览`} fill sizes="160px" />}</div>
        <div className="mediaDetails"><strong><button type="button" className="dragHandle" aria-label={`拖动媒体 ${index + 1}`} {...sortable.handleProps(asset.id)}>⠿</button> 媒体 {index + 1} {role && <span className="mediaRoleBadge">{role === "cover" ? "封面" : "详情页首图"}</span>}</strong><span title={asset.src}>{asset.src}</span>{asset.provenance && <small title={asset.provenance.extractionMethod}>来源 {asset.provenance.assetId}</small>}</div>
        {asset.type === "image" ? pdfChoice(Boolean(asset.portfolioPdfSelected), (selected) => { const next = [...item.media]; next[index] = { ...asset, portfolioPdfSelected: selected }; setMedia(next); }, `媒体 ${index + 1} 合集精选`) : <span className="pdfUnavailable">视频不进入合集</span>}
        <select className="mediaLayout" aria-label={`媒体 ${index + 1} 宽度`} value={asset.layout} onChange={(event) => { const next = [...item.media]; next[index] = { ...asset, layout: event.target.value === "half" ? "half" : "full" }; setMedia(next); }}><option value="full">全屏</option><option value="half">半屏</option></select>
        {isBody && hasChapters && groupId && <select className="chapterMove" aria-label={`移动媒体 ${index + 1} 到章节`} value={groupId} onChange={(event) => transformBody((body) => moveAssetToGroup(body, asset.id, event.target.value))}><option value={UNSECTIONED_GROUP}>未分章节</option>{chapterGroups.map((chapter, number) => <option key={chapter.id} value={chapter.id}>CHAPTER {String(number + 1).padStart(2, "0")} · {chapter.section?.title}</option>)}</select>}
        <button type="button" className="mediaMoveUp" aria-label={`上移媒体 ${index + 1}`} disabled={isBody ? groupIndex === 0 : index === 0} onClick={() => moveByOffset(-1)}>↑</button>
        <button type="button" className="mediaMoveDown" aria-label={`下移媒体 ${index + 1}`} disabled={isBody ? groupIndex === (groupLength || 0) - 1 : index === item.media.length - 1} onClick={() => moveByOffset(1)}>↓</button>
        {isBody && !asset.section && <AdminIconButton className="chapterSplitButton" label="从此创建章节" icon={<ChapterSplitIcon />} onClick={() => openChapterDraft(asset.id)} />}
        <AdminIconButton className="mediaDeleteButton" tone="danger" label={`删除媒体 ${index + 1}`} title="删除媒体" icon={<TrashIcon />} onClick={() => setMedia(item.media.filter((entry) => entry.id !== asset.id))} />
      </article>
    </Fragment>;
  }

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
      {generatePdf && isPersisted && <PdfGenerateAction generatePdf={generatePdf} target={`case:${item.id}`} label="生成案例 PDF" sourceHash={pdfSourceHash({ cases: [item], defaultOrder: [item.id], photographyCaseOrder: [item.id] }, `case:${item.id}`)} cacheEntry={pdfCacheEntry} disabled={dirty || pending} hint={dirty ? "请先保存" : undefined} />}
      <button type="button" className="secondaryButton" disabled={!chapterCandidates.length} onClick={() => openChapterDraft()}>＋ 添加章节</button>
      <label className="primaryButton">{uploading ? uploadProgress : hasChapters ? "上传未分章节媒体" : "批量上传媒体"}<input type="file" multiple disabled={uploading} accept="image/*,video/mp4,video/webm" onChange={(event) => void addMedia(event.target.files || undefined)} /></label>
    </div></div>
      {uploadProgress && !uploading && <p className="fieldHint uploadStatus" role="status">{uploadProgress}</p>}
      {roleMedia.length > 0 && <div className="bodyAssetList roleAssetList" aria-label="案例结构媒体">{roleMedia.map((asset) => renderMediaRow(asset))}</div>}
      <div className={`chapterGroups ${hasChapters ? "hasChapters" : ""}`}>{groups.map((group) => {
        const chapterIndex = chapterGroups.findIndex((entry) => entry.id === group.id);
        return <section className={`chapterGroup ${group.section ? "isChapter" : "isUnsectioned"}`} data-chapter-id={group.id} key={group.id}>
          {hasChapters && (group.section ? <header className="chapterHeader"><div className="chapterNumber">CHAPTER {String(chapterIndex + 1).padStart(2, "0")}</div><label>章节标题<input required value={group.section.title} onChange={(event) => transformBody((body) => updateChapter(body, group.id, { title: event.target.value }))} /></label><label>章节说明<textarea rows={2} value={group.section.description || ""} onChange={(event) => transformBody((body) => updateChapter(body, group.id, { description: event.target.value }))} /></label><div className="chapterActions"><button type="button" disabled={chapterIndex === 0} onClick={() => transformBody((body) => moveChapter(body, group.id, -1))}>↑ Chapter</button><button type="button" disabled={chapterIndex === chapterGroups.length - 1} onClick={() => transformBody((body) => moveChapter(body, group.id, 1))}>↓ Chapter</button><label className="uploadButton">＋ 添加媒体到本章节<input type="file" multiple disabled={uploading} accept="image/*,video/mp4,video/webm" onChange={(event) => void addMedia(event.target.files || undefined, group.id)} /></label><button type="button" className="dangerText" onClick={() => { if (confirm("移除章节标题？章节内媒体会保留并合并到前一章节；首个章节会变为未分章节。")) transformBody((body) => removeChapter(body, group.id)); }}>移除 Chapter</button></div></header> : <header className="unsectionedHeader"><div><p>UNSECTIONED</p><h3>未分章节</h3></div><label className="uploadButton">＋ 添加未分章节媒体<input type="file" multiple disabled={uploading} accept="image/*,video/mp4,video/webm" onChange={(event) => void addMedia(event.target.files || undefined, UNSECTIONED_GROUP)} /></label></header>)}
          <div className="bodyAssetList">{group.assets.map((asset, groupIndex) => renderMediaRow(asset, group.id, groupIndex, group.assets.length))}</div>
        </section>;
      })}</div>
    </section>
  </form></main>;
}
