import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { readContent, writeContent } from "@/lib/content";
export async function PUT(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const data = await readContent(); const body = await request.json(); const photography = body.type === "photography"; const valid = new Set(data.cases.filter((item) => photography ? item.business === "photography" : item.business === "branding").map((item) => item.id));
  const requested: unknown[] = Array.isArray(body.order) ? body.order : [];
  const order: string[] = [...new Set(requested.filter((id): id is string => typeof id === "string" && valid.has(id)))];
  const complete = order.concat([...valid].filter((id) => !order.includes(id))); if (photography) data.photographyCaseOrder = complete; else data.defaultOrder = complete; await writeContent(data); return NextResponse.json({ ok: true, order: complete });
}
