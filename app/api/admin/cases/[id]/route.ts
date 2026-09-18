import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
import { assertUniqueName, parseCase } from "@/lib/validation";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params; const data = await readContent(); const index = data.cases.findIndex((item) => item.id === id);
  if (index < 0) return NextResponse.json({ error: "案例不存在" }, { status: 404 });
  try { const previous = data.cases[index]; const item = parseCase(await request.json(), previous); assertUniqueName(data, item); data.cases[index] = item; if (previous.business !== item.business) { data.defaultOrder = data.defaultOrder.filter((caseId) => caseId !== id); data.photographyCaseOrder = data.photographyCaseOrder.filter((caseId) => caseId !== id); if (item.business === "photography") data.photographyCaseOrder.push(id); else data.defaultOrder.push(id); } await writeContent(data); return NextResponse.json(item); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 400 }); }
}
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const { id } = await context.params; const data = await readContent();
  if (!data.cases.some((item) => item.id === id)) return NextResponse.json({ error: "案例不存在" }, { status: 404 });
  data.cases = data.cases.filter((item) => item.id !== id); data.defaultOrder = data.defaultOrder.filter((caseId) => caseId !== id); data.photographyCaseOrder = data.photographyCaseOrder.filter((caseId) => caseId !== id);
  await writeContent(data); return NextResponse.json({ ok: true });
}
