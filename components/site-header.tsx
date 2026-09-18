import Link from "next/link";
import { readContent } from "@/lib/content";

export async function SiteHeader({ active = "work" }: { active?: string }) {
  const versions = (await readContent()).versions.filter((item) => item.enabled);
  return <header className="siteHeader">
    <Link className="wordmark" href="/" aria-label="CHIM 首页">CHIM<span>®</span></Link>
    <nav aria-label="案例版本">
      <Link className={active === "work" ? "active" : ""} href="/">Work</Link>
      {versions.map((version) => <Link key={version.slug} className={active === version.slug ? "active" : ""} href={`/${version.slug}`}>{version.name}</Link>)}
    </nav>
  </header>;
}
