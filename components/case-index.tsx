import { MasonryGrid } from "./masonry-grid";
import { SiteHeader } from "./site-header";
import { CaseListRestoration } from "./case-list-restoration";
import { BackToTopButton } from "./back-to-top-button";
import type { Business, CaseCategory, PortfolioCase } from "@/lib/types";
import { portfolioPdfPath } from "@/lib/pdf-path";

export function CaseIndex({ cases, business = "branding", category, title = "Branding Works", subtitle = "品牌设计案例", footer = "Brand identity · Art direction · Packaging" }: { cases: PortfolioCase[]; business?: Business; category?: CaseCategory; title?: string; subtitle?: string; footer?: string }) {
  return <main><CaseListRestoration /><SiteHeader business={business} category={category} /><BackToTopButton /><section className="indexIntro"><p className="introEyebrow">Independent design practice · Guangzhou</p><div className="titleGroup"><h1><span>{title}</span></h1><p className="titleChinese">{subtitle}</p></div><div className="indexUtility"><span className="projectCount">{String(cases.length).padStart(2, "0")} projects</span>{business === "branding" && !category && <a className="pdfDownload" href={portfolioPdfPath()} download>Portfolio PDF ↓</a>}</div></section><MasonryGrid cases={cases} /><footer><span>CHIM®</span><span>{footer}</span></footer></main>;
}
