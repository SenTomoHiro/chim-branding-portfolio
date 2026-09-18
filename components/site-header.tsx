import Link from "next/link";
import { readContent } from "@/lib/content";

export async function SiteHeader({ active = "branding" }: { active?: string }) {
  const versions = (await readContent()).versions.filter((item) => item.enabled);
  return <header className="siteHeader">
    <Link className="wordmark" href="/" aria-label="CHIM 首页">CHIM<span>®</span></Link>
    <nav aria-label="案例版本">
      <Link className={active === "branding" ? "active" : ""} href="/">Branding</Link>
      <Link className={active === "photo" ? "active" : ""} href="/photo">Photography</Link>
      {versions.map((version) => <Link key={version.slug} className={active === version.slug ? "active" : ""} href={`/${version.slug}`}>{version.name}</Link>)}
    </nav>
  </header>;
}
