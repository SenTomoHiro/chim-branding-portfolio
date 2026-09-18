import type { MetadataRoute } from "next";
import { casePath } from "@/lib/case-route";
import { readContent } from "@/lib/content";
import { CATEGORY_ROUTES } from "@/lib/taxonomy";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = process.env.SITE_URL || "http://localhost:3000"; const data = await readContent(); return [...["","photo",...CATEGORY_ROUTES].map((route)=>({url:`${base}/${route}`,changeFrequency:"weekly" as const})),...data.cases.filter((item)=>item.published).map((item)=>({url:`${base}${casePath(item.name)}`,changeFrequency:"monthly" as const}))]; }
