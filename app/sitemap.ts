import type { MetadataRoute } from "next";
import { readContent } from "@/lib/content";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> { const base = process.env.SITE_URL || "http://localhost:3000"; const data = await readContent(); return [...["",...data.versions.filter((item)=>item.enabled).map((item)=>item.slug)].map((route)=>({url:`${base}/${route}`,changeFrequency:"weekly" as const})),...data.cases.filter((item)=>item.published).map((item)=>({url:`${base}/work/${item.slug}`,changeFrequency:"monthly" as const}))]; }
