import type { Metadata } from "next";
import { assetPath } from "@/lib/site-path";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CHIM — Branding Works", template: "%s — CHIM" },
  description: "CHIM 品牌设计案例作品集。",
  openGraph: { title: "CHIM — Branding Works", description: "品牌设计案例作品集。", type: "website" },
  icons: { icon: assetPath("/favicon.svg") },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
