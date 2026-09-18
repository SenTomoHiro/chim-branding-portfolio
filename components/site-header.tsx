import Link from "next/link";
import { BUSINESSES, CASE_CATEGORIES } from "@/lib/taxonomy";
import type { Business, CaseCategory } from "@/lib/types";

export function SiteHeader({ business = "branding", category }: { business?: Business; category?: CaseCategory }) {
  return <header className="siteHeader">
    <Link className="wordmark" href="/" aria-label="CHIM 首页">CHIM<span>®</span></Link>
    <div className="siteNavigation">
      <nav className="businessNav" aria-label="所属业务">
        {BUSINESSES.map((item) => <Link key={item.value} className={business === item.value ? "active" : ""} href={item.value === "branding" ? "/" : "/photo"}><strong>{item.zh}</strong><span>{item.en}</span></Link>)}
      </nav>
      {business === "branding" && <nav className="categoryNav" aria-label="品牌设计分类">
        {CASE_CATEGORIES.map((item) => <Link key={item.value} className={category === item.value ? "active" : ""} href={`/${item.value}`}><strong>{item.zh}</strong><span>{item.en}</span></Link>)}
      </nav>}
    </div>
  </header>;
}
