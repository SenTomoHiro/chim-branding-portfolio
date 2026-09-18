import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
export async function PUT(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const data = await readContent(); const body = await request.json(); const valid = new Set(data.cases.map((item) => item.id));
  const requested: unknown[] = Array.isArray(body.order) ? body.order : [];
  const order: string[] = [...new Set(requested.filter((id): id is string => typeof id === "string" && valid.has(id)))];
  data.defaultOrder = order.concat(data.cases.map((item) => item.id).filter((id) => !order.includes(id))); await writeContent(data); return NextResponse.json({ ok: true, order: data.defaultOrder });
}
