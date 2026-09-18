import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { saveUploadedMedia } from "@/lib/media";
export async function POST(request: Request) {
  if (!await isAuthenticated()) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try { const form = await request.formData(); const file = form.get("file"); if (!(file instanceof File)) throw new Error("请选择文件"); return NextResponse.json(await saveUploadedMedia(file), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "上传失败" }, { status: 400 }); }
}
