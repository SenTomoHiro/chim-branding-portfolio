import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
import { parseVersion } from "@/lib/validation";
export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { slug } = await context.params; const data = await readContent(); const index = data.versions.findIndex((item) => item.slug === slug);
  if (index < 0) return NextResponse.json({ error: "版本不存在" }, { status: 404 });
  try { const version = parseVersion(await request.json(), data.versions[index]); if (data.versions.some((item, itemIndex) => itemIndex !== index && item.slug === version.slug)) throw new Error("版本 Slug 已存在"); data.versions[index] = version; await writeContent(data); return NextResponse.json(version); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 }); }
}
