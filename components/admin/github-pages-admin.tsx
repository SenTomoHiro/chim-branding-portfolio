"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminDashboard } from "./admin-dashboard";
import { AdminHeader } from "./admin-header";
import { CaseForm } from "./case-form";
import { PdfAdmin } from "./pdf-admin";
import type { PdfGenerator } from "./pdf-generation-panel";
import type { AdminPersistence, UploadedMedia } from "./persistence";
import { caseFullTitle } from "@/lib/case-title";
import { EMPTY_PDF_CACHE, pdfFilename, type PdfCacheManifest, type PdfTarget } from "@/lib/pdf-cache";
import { pdfUrl } from "@/lib/pdf-path";
import type { ContentData } from "@/lib/types";

const api = "https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio";
const contentPath = "data/content.json";
const cachePath = "data/pdf-cache.json";
type RemoteFile = { content: string; sha: string };
let session: { token: string; data?: ContentData; cache: PdfCacheManifest; sha: string } = { token: "", cache: EMPTY_PDF_CACHE, sha: "" };

const decode = <T,>(value: string) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\n/g, "")), (character) => character.charCodeAt(0)))) as T;
const base64 = (bytes: Uint8Array) => { let result = ""; for (let index = 0; index < bytes.length; index += 0x8000) result += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(result); };
const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const responseError = async (response: Response, fallback: string) => { const body = await response.json().catch(() => ({})) as { message?: string }; return `${fallback}（HTTP ${response.status}${body.message ? `：${body.message}` : ""}）`; };

export function GitHubPagesAdmin() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [token, setToken] = useState(() => session.token);
  const [data, setData] = useState<ContentData | undefined>(() => session.data);
  const [cache, setCache] = useState<PdfCacheManifest>(() => session.cache);
  const [sha, setSha] = useState(() => session.sha);
  const [status, setStatus] = useState("");
  const isCaseEditor = /\/admin\/cases\/?$/.test(pathname);
  const id = isCaseEditor ? search.get("id") || undefined : undefined;
  const isNew = isCaseEditor && search.get("new") === "1";
  const headers = () => ({ Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" });

  async function save(next: ContentData, message: string) {
    const response = await fetch(`${api}/contents/${contentPath}`, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ message, content: base64(new TextEncoder().encode(`${JSON.stringify(next, null, 2)}\n`)), sha, branch: "main" }) });
    if (response.status === 409 || response.status === 422) throw new Error("内容已发生变化，未覆盖。请重新连接后再保存。");
    if (!response.ok) throw new Error("提交失败：请确认 Token 仍有 Contents 写入权限。");
    const result = await response.json() as { content: { sha: string } };
    session = { token, data: next, cache, sha: result.content.sha }; setData(next); setSha(result.content.sha);
  }

  async function upload(file: File, caseId: string): Promise<UploadedMedia> {
    if (file.size < 1 || file.size > 25 * 1024 * 1024) throw new Error("文件大小必须在 25MB 以内");
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : undefined;
    if (!type) throw new Error("仅支持图片、MP4 或 WebM");
    const safeId = caseId.replace(/[^a-zA-Z0-9_-]/g, "-") || "new-case";
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || (type === "video" ? "mp4" : "webp");
    const path = `public/media/cases/${safeId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const response = await fetch(`${api}/contents/${path}`, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ message: `Upload media for ${safeId}`, content: base64(new Uint8Array(await file.arrayBuffer())), branch: "main" }) });
    if (!response.ok) throw new Error("媒体上传失败");
    return { type, src: `/${path.replace("public/", "")}` };
  }

  const persistence = useMemo<AdminPersistence>(() => ({
    saveCase: async (item, isEdit) => { if (!data) throw new Error("内容未加载"); const exists = data.cases.some((entry) => entry.id !== item.id && entry.brandName === item.brandName && entry.projectName === item.projectName); if (exists) throw new Error("品牌名与项目名组合已存在，请使用唯一标题。"); const previous = data.cases.find((entry) => entry.id === item.id); const cases = isEdit ? data.cases.map((entry) => entry.id === item.id ? item : entry) : [...data.cases, item]; let defaultOrder = data.defaultOrder.filter((entry) => entry !== item.id); let photographyCaseOrder = data.photographyCaseOrder.filter((entry) => entry !== item.id); if (item.business === "photography") photographyCaseOrder = [...photographyCaseOrder, item.id]; else defaultOrder = [...defaultOrder, item.id]; if (previous?.business === item.business) { defaultOrder = item.business === "branding" ? data.defaultOrder : defaultOrder; photographyCaseOrder = item.business === "photography" ? data.photographyCaseOrder : photographyCaseOrder; } await save({ ...data, cases, defaultOrder, photographyCaseOrder }, `${isEdit ? "Update" : "Add"} portfolio case: ${caseFullTitle(item)}`); },
    deleteCase: async (item) => { if (!data) throw new Error("内容未加载"); await save({ ...data, cases: data.cases.filter((entry) => entry.id !== item.id), defaultOrder: data.defaultOrder.filter((entry) => entry !== item.id), photographyCaseOrder: data.photographyCaseOrder.filter((entry) => entry !== item.id) }, `Delete portfolio case: ${caseFullTitle(item)}`); },
    saveOrder: async (order, type) => { if (!data) throw new Error("内容未加载"); const valid = new Set(data.cases.filter((item) => type === "photography" ? item.business === "photography" : item.business === "branding").map((item) => item.id)); const complete = [...new Set(order.filter((item) => valid.has(item)))].concat([...valid].filter((item) => !order.includes(item))); await save(type === "photography" ? { ...data, photographyCaseOrder: complete } : { ...data, defaultOrder: complete }, `Reorder ${type} portfolio cases`); },
    upload,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, sha, token, cache]);

  const generatePdf = useMemo<PdfGenerator>(() => async (target: PdfTarget, sourceHash: string) => {
    const requestId = crypto.randomUUID();
    const previousGeneratedAt = cache.targets[target]?.generatedAt;
    const dispatch = await fetch(`${api}/dispatches`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ event_type: "admin_pdf_generate", client_payload: { request_id: requestId, target } }) });
    if (!dispatch.ok) throw new Error(await responseError(dispatch, "无法启动 PDF 生成"));
    for (let attempt = 0; attempt < 81; attempt += 1) {
      const response = await fetch(`${api}/contents/${cachePath}?ref=main&v=${Date.now()}-${attempt}`, { headers: headers(), cache: "no-store" });
      if (response.ok) {
        const file = await response.json() as RemoteFile;
        const next = decode<PdfCacheManifest>(file.content);
        const entry = next.targets[target];
        if (entry?.sourceHash === sourceHash && entry.generatedAt !== previousGeneratedAt) {
          session = { ...session, cache: next }; setCache(next);
          return { target, filename: pdfFilename(target), url: pdfUrl(target) };
        }
      } else if (response.status !== 404) throw new Error(await responseError(response, "无法确认 PDF 缓存"));
      if (attempt < 80) await wait(7500);
    }
    throw new Error("PDF 生成超时，请检查 GitHub Actions。");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, cache]);

  async function connect() {
    setStatus("正在验证 Token 与仓库权限…");
    const access = await fetch(api, { headers: headers() });
    if (!access.ok) { setStatus(access.status === 401 ? "Token 无效" : "无权访问此仓库；请检查 Contents 权限。"); return; }
    const [contentResponse, cacheResponse] = await Promise.all([
      fetch(`${api}/contents/${contentPath}?ref=main`, { headers: headers(), cache: "no-store" }),
      fetch(`${api}/contents/${cachePath}?ref=main`, { headers: headers(), cache: "no-store" }),
    ]);
    if (!contentResponse.ok) { setStatus("无法读取正式内容文件。"); return; }
    const file = await contentResponse.json() as RemoteFile;
    const nextData = decode<ContentData>(file.content);
    const nextCache = cacheResponse.ok ? decode<PdfCacheManifest>(((await cacheResponse.json()) as RemoteFile).content) : EMPTY_PDF_CACHE;
    session = { token, data: nextData, cache: nextCache, sha: file.sha };
    setData(nextData); setCache(nextCache); setSha(file.sha); setStatus("");
  }
  function logout() { session = { token: "", cache: EMPTY_PDF_CACHE, sha: "" }; setToken(""); setData(undefined); setCache(EMPTY_PDF_CACHE); setSha(""); setStatus(""); }

  if (!data) return <main className="loginPage"><form onSubmit={(event) => { event.preventDefault(); void connect(); }}><p>CHIM® / Admin</p><h1>案例管理</h1><label>Fine-grained personal access token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" required /></label><p className="fieldHint">仅限此仓库；权限只需 Contents: Read and write。Token 仅保存在当前页面内存中。</p><button disabled={!token}>{status.includes("正在") ? "连接中…" : "连接 GitHub"}</button>{status && <p className="formError">{status}</p>}</form></main>;

  let content: React.ReactNode;
  if (/\/admin\/pdf\/?$/.test(pathname)) content = <PdfAdmin initial={data} cache={cache} persistence={persistence} enabled generatePdf={generatePdf} />;
  else if (isCaseEditor) { const item = id ? data.cases.find((entry) => entry.id === id) : undefined; content = <CaseForm initial={isNew ? undefined : item} persistence={persistence} generatePdf={generatePdf} pdfCacheEntry={id ? cache.targets[`case:${id}`] : undefined} />; }
  else content = <AdminDashboard initial={data} persistence={persistence} />;
  return <><AdminHeader onLogout={logout} />{content}</>;
}
