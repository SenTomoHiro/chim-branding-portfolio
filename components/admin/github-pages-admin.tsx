"use client";

import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { AdminDashboard } from "./admin-dashboard";
import { CaseForm } from "./case-form";
import type { AdminPersistence, UploadedMedia } from "./persistence";
import type { ContentData, PortfolioCase } from "@/lib/types";
import { caseFullTitle } from "@/lib/case-title";

const api = "https://api.github.com/repos/SenTomoHiro/chim-branding-portfolio";
const contentPath = "data/content.json";
type RemoteFile = { content: string; sha: string };
let session: { token: string; data?: ContentData; sha: string } = { token: "", sha: "" };

const decode = (value: string) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\n/g, "")), (character) => character.charCodeAt(0)))) as ContentData;
const base64 = (bytes: Uint8Array) => { let result = ""; for (let index = 0; index < bytes.length; index += 0x8000) result += String.fromCharCode(...bytes.subarray(index, index + 0x8000)); return btoa(result); };

export function GitHubPagesAdmin() {
  const pathname = usePathname();
  const [token, setToken] = useState(() => session.token);
  const [data, setData] = useState<ContentData | undefined>(() => session.data);
  const [sha, setSha] = useState(() => session.sha);
  const [status, setStatus] = useState("");
  const id = pathname.match(/\/admin\/cases\/([^/]+)\/?$/)?.[1];
  const headers = () => ({ Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" });
  async function save(next: ContentData, message: string) {
    const response = await fetch(`${api}/contents/${contentPath}`, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ message, content: base64(new TextEncoder().encode(`${JSON.stringify(next, null, 2)}\n`)), sha, branch: "main" }) });
    if (response.status === 409 || response.status === 422) throw new Error("内容已发生变化，未覆盖。请重新连接后再保存。");
    if (!response.ok) throw new Error("提交失败：请确认 Token 仍有 Contents 写入权限。");
    const result = await response.json() as { content: { sha: string } }; session = { token, data: next, sha: result.content.sha }; setData(next); setSha(result.content.sha);
  }
  const persistence = useMemo<AdminPersistence>(() => ({
    saveCase: async (item, isEdit) => { if (!data) throw new Error("内容未加载"); const exists = data.cases.some((entry) => entry.id !== item.id && entry.brandName === item.brandName && entry.projectName === item.projectName); if (exists) throw new Error("品牌名与项目名组合已存在，请使用唯一标题。"); const previous = data.cases.find((entry) => entry.id === item.id); const cases = isEdit ? data.cases.map((entry) => entry.id === item.id ? item : entry) : [...data.cases, item]; let defaultOrder = data.defaultOrder.filter((entry) => entry !== item.id); let photographyCaseOrder = data.photographyCaseOrder.filter((entry) => entry !== item.id); if (item.business === "photography") photographyCaseOrder = [...photographyCaseOrder, item.id]; else defaultOrder = [...defaultOrder, item.id]; if (previous?.business === item.business) { defaultOrder = item.business === "branding" ? data.defaultOrder : defaultOrder; photographyCaseOrder = item.business === "photography" ? data.photographyCaseOrder : photographyCaseOrder; } await save({ ...data, cases, defaultOrder, photographyCaseOrder }, `${isEdit ? "Update" : "Add"} portfolio case: ${caseFullTitle(item)}`); },
    deleteCase: async (item) => { if (!data) throw new Error("内容未加载"); await save({ ...data, cases: data.cases.filter((entry) => entry.id !== item.id), defaultOrder: data.defaultOrder.filter((entry) => entry !== item.id), photographyCaseOrder: data.photographyCaseOrder.filter((entry) => entry !== item.id) }, `Delete portfolio case: ${caseFullTitle(item)}`); },
    saveOrder: async (order, type) => { if (!data) throw new Error("内容未加载"); const valid = new Set(data.cases.filter((item) => type === "photography" ? item.business === "photography" : item.business === "branding").map((item) => item.id)); const complete = [...new Set(order.filter((item) => valid.has(item)))].concat([...valid].filter((item) => !order.includes(item))); await save(type === "photography" ? { ...data, photographyCaseOrder: complete } : { ...data, defaultOrder: complete }, `Reorder ${type} portfolio cases`); },
    upload: async (file, caseId) => upload(file, caseId),
  // The adapter is recreated after a committed content revision.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [data, sha, token]);
  async function upload(file: File, caseId: string): Promise<UploadedMedia> {
    if (file.size < 1 || file.size > 25 * 1024 * 1024) throw new Error("文件大小必须在 25MB 以内");
    const type = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : undefined; if (!type) throw new Error("仅支持图片、MP4 或 WebM");
    const safeId = caseId.replace(/[^a-zA-Z0-9_-]/g, "-") || "new-case";
    const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") || (type === "video" ? "mp4" : "webp");
    const path = `public/media/cases/${safeId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const response = await fetch(`${api}/contents/${path}`, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ message: `Upload media for ${safeId}`, content: base64(new Uint8Array(await file.arrayBuffer())), branch: "main" }) });
    if (!response.ok) throw new Error("媒体上传失败");
    return { type, src: `/${path.replace("public/", "")}` };
  }
  async function connect() { setStatus("正在验证 Token 与仓库权限…"); const access = await fetch(api, { headers: headers() }); if (!access.ok) { setStatus(access.status === 401 ? "Token 无效" : "无权访问此仓库；请检查 Contents: Read and write 权限。"); return; } const response = await fetch(`${api}/contents/${contentPath}?ref=main`, { headers: headers() }); if (!response.ok) { setStatus("无法读取正式内容文件。"); return; } const file = await response.json() as RemoteFile; const next = decode(file.content); session = { token, data: next, sha: file.sha }; setData(next); setSha(file.sha); setStatus(""); }
  if (!data) return <main className="loginPage"><form onSubmit={(event) => { event.preventDefault(); void connect(); }}><p>CHIM® / Admin</p><h1>案例管理</h1><label>Fine-grained personal access token<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" required /></label><p className="fieldHint">仅限此仓库，权限只需 Contents: Read and write。Token 仅保存在当前页面内存中。</p><button disabled={!token}>{status.includes("正在") ? "连接中…" : "连接 GitHub"}</button>{status && <p className="formError">{status}</p>}</form></main>;
  if (id) return <CaseForm initial={id === "new" ? undefined : data.cases.find((item) => item.id === decodeURIComponent(id))} persistence={persistence} />;
  return <AdminDashboard initial={data} persistence={persistence} />;
}
