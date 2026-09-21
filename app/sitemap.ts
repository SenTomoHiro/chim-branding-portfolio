import type { MetadataRoute } from "next";
import { CATEGORY_ROUTES } from "@/lib/taxonomy";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.SITE_URL || "http://localhost:3000"; return ["", "photo", ...CATEGORY_ROUTES].map((route) => ({ url: `${base}/${route}`, changeFrequency: "weekly" as const })); }
