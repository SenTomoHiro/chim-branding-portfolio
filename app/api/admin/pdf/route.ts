import { spawn } from "node:child_process";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

function runGenerator(target: string, origin: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(process.cwd(), "scripts", "generate-pdfs.mjs"), "--origin", origin, "--output-dir", path.join(process.cwd(), "output", "pdf"), "--content", process.env.CONTENT_FILE_PATH || path.join(process.cwd(), "data", "content.json"), "--target", target], { cwd: process.cwd(), env: process.env });
    let output = "";
    child.stdout.on("data", (chunk) => { output += String(chunk); });
    child.stderr.on("data", (chunk) => { output += String(chunk); });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(output.trim() || `PDF 生成器退出：${code}`)));
  });
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") return NextResponse.json({ error: "PDF 人工生成仅在本地开发环境可用" }, { status: 404 });
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const { target } = await request.json() as { target?: string };
    if (!target || !/^(?:design|photography|category:(?:food|drinks|ip|other)|case:[A-Za-z0-9_-]+)$/.test(target)) return NextResponse.json({ error: "PDF 生成目标无效" }, { status: 400 });
    await runGenerator(target, new URL(request.url).origin);
    const filename = target === "design" ? "portfolio-design.pdf" : target === "photography" ? "portfolio-photography.pdf" : target.startsWith("category:") ? `portfolio-design-${target.slice(9)}.pdf` : `${target.slice(5).toLowerCase()}.pdf`;
    return NextResponse.json({ target, filename, url: `/api/admin/pdf/file/${encodeURIComponent(target)}` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "PDF 生成失败" }, { status: 500 });
  }
}
