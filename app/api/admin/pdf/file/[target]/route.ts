import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ target: string }> }) {
  if (process.env.NODE_ENV !== "development") return new NextResponse(null, { status: 404 });
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { target } = await context.params;
  if (!/^(?:design|photography|case:[A-Za-z0-9_-]+)$/.test(target)) return NextResponse.json({ error: "PDF 文件目标无效" }, { status: 400 });
  const filename = target === "design" ? "portfolio-design.pdf" : target === "photography" ? "portfolio-photography.pdf" : path.join("cases", `${target.slice(5).toLowerCase()}.pdf`);
  try {
    const bytes = await readFile(path.join(process.cwd(), "output", "pdf", filename));
    const download = new URL(request.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(bytes), { headers: { "content-type": "application/pdf", "content-disposition": `${download ? "attachment" : "inline"}; filename="${path.basename(filename)}"`, "cache-control": "no-store" } });
  } catch { return NextResponse.json({ error: "PDF 文件不存在，请先生成" }, { status: 404 }); }
}
