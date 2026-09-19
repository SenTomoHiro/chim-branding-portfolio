"use client";

import { FormEvent, useState } from "react";
import type { ContentData, PortfolioCase } from "@/lib/types";

const owner = "SenTomoHiro";
const repo = "chim-branding-portfolio";
const branch = "main";
const contentPath = "data/content.json";
const api = `https://api.github.com/repos/${owner}/${repo}`;

type RemoteFile = { content: string; sha: string };
const decode = (value: string) => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\n/g, "")), (character) => character.charCodeAt(0)))) as ContentData;
const encode = (value: ContentData) => btoa(String.fromCharCode(...new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`)));

function newCase(): PortfolioCase {
  return { id: `case-${Date.now()}`, name: "", intro: "", business: "branding", categories: ["other"], primaryIndustry: "", cover: "", coverWidth: 1400, coverHeight: 1050, hero: "", bodyAssets: [], published: false };
}

export function GitHubPagesAdmin() {
  const [token, setToken] = useState("");
  const [data, setData] = useState<ContentData>();
  const [sha, setSha] = useState("");
  const [editor, setEditor] = useState<PortfolioCase>();
  const [status, setStatus] = useState("");
  const headers = () => ({ Accept: "application/vnd.github+json", Authorization: `Bearer ${token}`, "X-GitHub-Api-Version": "2022-11-28" });
  async function load() {
    setStatus("正在验证 Token 与仓库权限…");
    const access = await fetch(api, { headers: headers() });
    if (!access.ok) { setStatus(access.status === 401 ? "Token 无效" : "无权访问此仓库；请检查 Contents: Read and write 权限。"); return; }
    const response = await fetch(`${api}/contents/${contentPath}?ref=${branch}`, { headers: headers() });
    if (!response.ok) { setStatus("无法读取正式内容文件。"); return; }
    const file = await response.json() as RemoteFile;
    setData(decode(file.content)); setSha(file.sha); setStatus("已连接。修改后会创建 Git commit，并自动重新部署 Pages。");
  }
  async function commit(next: ContentData, message: string) {
    setStatus("正在提交到 GitHub…");
    const response = await fetch(`${api}/contents/${contentPath}`, { method: "PUT", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ message, content: encode(next), sha, branch }) });
    if (response.status === 409 || response.status === 422) { setStatus("内容已发生变化，未覆盖。请重新连接以读取最新版本后再保存。"); return false; }
    if (!response.ok) { setStatus("提交失败：请确认 Token 仍有 Contents 写入权限。"); return false; }
    const result = await response.json() as { content: { sha: string }; commit: { sha: string } };
    setData(next); setSha(result.content.sha); setStatus(`GitHub commit 已创建：${result.commit.sha.slice(0, 12)}。GitHub Pages 正在重新部署，稍后刷新前台查看。`); return true;
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!data || !editor) return;
    const exists = data.cases.some((item) => item.id !== editor.id && item.name === editor.name);
    if (exists) { setStatus("案例名称已存在，请使用唯一名称。"); return; }
    const already = data.cases.some((item) => item.id === editor.id);
    const cases = already ? data.cases.map((item) => item.id === editor.id ? editor : item) : [...data.cases, editor];
    const next = { ...data, cases, defaultOrder: editor.business === "branding" && !data.defaultOrder.includes(editor.id) ? [...data.defaultOrder, editor.id] : data.defaultOrder, photographyCaseOrder: editor.business === "photography" && !data.photographyCaseOrder.includes(editor.id) ? [...data.photographyCaseOrder, editor.id] : data.photographyCaseOrder };
    if (await commit(next, `${already ? "Update" : "Add"} portfolio case: ${editor.name}`)) setEditor(undefined);
  }
  if (!data) return <main className="loginPage"><form onSubmit={(event) => { event.preventDefault(); void load(); }}><p>CHIM® / Admin</p><h1>案例管理</h1><label htmlFor="github-token">Fine-grained personal access token</label><input id="github-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" required autoFocus/><p className="fieldHint">仅限此仓库，权限只需 Contents: Read and write。Token 仅保存在当前页面内存中。</p><button disabled={!token}>{status.includes("正在") ? "连接中…" : "连接 GitHub"}</button>{status && <p className="formError" role="alert">{status}</p>}</form></main>;
  return <main className="adminPage"><section className="adminTitle"><div><p>Content / Cases · GitHub Pages</p><h1>案例管理</h1></div><div><button className="primaryButton" onClick={() => setEditor(newCase())}>新建案例</button><button className="dangerText" onClick={() => { setToken(""); setData(undefined); setSha(""); }}>退出</button></div></section><p className="saveMessage">{status}</p><section className="adminSection"><div className="sectionHeading"><div><h2>全部案例</h2><p>保存会直接更新当前仓库的正式内容文件。</p></div></div><div className="adminCaseList">{data.cases.map((item) => <article key={item.id}><div className="adminCaseName"><strong>{item.name}</strong><span>{item.business === "photography" ? "商业摄影" : item.categories.join(" / ")}</span></div><button className={`status ${item.published ? "published" : ""}`} onClick={() => void commit({ ...data, cases: data.cases.map((entry) => entry.id === item.id ? { ...entry, published: !entry.published } : entry) }, `${item.published ? "Unpublish" : "Publish"} portfolio case: ${item.name}`)}>{item.published ? "已发布" : "草稿"}</button><button onClick={() => setEditor(item)}>编辑</button><button className="dangerText" onClick={() => { if (confirm(`确认删除“${item.name}”？媒体文件将保留。`)) void commit({ ...data, cases: data.cases.filter((entry) => entry.id !== item.id), defaultOrder: data.defaultOrder.filter((id) => id !== item.id), photographyCaseOrder: data.photographyCaseOrder.filter((id) => id !== item.id) }, `Delete portfolio case: ${item.name}`); }}>删除</button></article>)}</div></section>{editor && <form className="caseEditor" onSubmit={save}><div className="editorHeading"><div><p>Cases / Edit</p><h1>{data.cases.some((item) => item.id === editor.id) ? "编辑案例" : "新建案例"}</h1></div><button className="primaryButton">保存案例</button></div><section className="formSection"><div className="formGrid"><label className="fullField">名称<input required value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })}/></label><label className="fullField">简介<textarea rows={3} value={editor.intro} onChange={(event) => setEditor({ ...editor, intro: event.target.value })}/></label><label>所属业务<select value={editor.business} onChange={(event) => setEditor({ ...editor, business: event.target.value as PortfolioCase["business"], categories: event.target.value === "photography" ? [] : editor.categories })}><option value="branding">品牌设计</option><option value="photography">商业摄影</option></select></label><label>细分品类<input value={editor.primaryIndustry} onChange={(event) => setEditor({ ...editor, primaryIndustry: event.target.value })}/></label><label className="fullField">封面路径<input value={editor.cover} placeholder="/media/..." onChange={(event) => setEditor({ ...editor, cover: event.target.value })}/></label><label className="fullField">首图路径<input value={editor.hero} placeholder="/media/..." onChange={(event) => setEditor({ ...editor, hero: event.target.value })}/></label><label className="checkLabel"><input type="checkbox" checked={editor.published} onChange={(event) => setEditor({ ...editor, published: event.target.checked })}/>发布到前台</label></div></section><button type="button" onClick={() => setEditor(undefined)}>取消</button></form>}</main>;
}
