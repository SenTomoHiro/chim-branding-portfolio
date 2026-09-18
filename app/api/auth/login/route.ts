import { NextResponse } from "next/server";
import { createSessionValue, sessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!process.env.ADMIN_PASSWORD || body.password !== process.env.ADMIN_PASSWORD) return NextResponse.json({ error: "密码错误" }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookie.name, createSessionValue(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionCookie.maxAge });
  return response;
}
