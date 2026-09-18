import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
import { assertUniqueSlug, parseCase } from "@/lib/validation";

const unauthorized = () => NextResponse.json({ error: "请先登录" }, { status: 401 });
export async function GET() { if (!await isAuthenticated()) return unauthorized(); return NextResponse.json(await readContent()); }
export async function POST(request: Request) {
  if (!await isAuthenticated()) return unauthorized();
  try { const data = await readContent(); const item = parseCase(await request.json()); assertUniqueSlug(data, item); data.cases.push(item); if (item.designPrimary === "Photography") data.photographyCaseOrder.push(item.id); else data.defaultOrder.push(item.id); await writeContent(data); return NextResponse.json(item, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 }); }
}
