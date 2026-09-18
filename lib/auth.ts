import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "chim_admin";
const maxAge = 60 * 60 * 12;
const secret = () => process.env.SESSION_SECRET || "development-only-secret";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("hex");

export function createSessionValue() {
  const payload = String(Date.now() + maxAge * 1000);
  return `${payload}.${sign(payload)}`;
}

export function verifySessionValue(value?: string) {
  if (!value) return false;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || Number(payload) < Date.now()) return false;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function isAuthenticated() {
  return verifySessionValue((await cookies()).get(COOKIE)?.value);
}

export const sessionCookie = { name: COOKIE, maxAge };
