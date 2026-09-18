import { MasonryGrid } from "./masonry-grid";
import { SiteHeader } from "./site-header";
import type { Business, CaseCategory, PortfolioCase } from "@/lib/types";

export function CaseIndex({ cases, business = "branding", category, title = "Branding Works", subtitle = "品牌设计案例", footer = "Brand identity · Art direction · Packaging" }: { cases: PortfolioCase[]; business?: Business; category?: CaseCategory; title?: string; subtitle?: string; footer?: string }) {
  return <main><SiteHeader business={business} category={category} /><section className="indexIntro"><p className="introEyebrow">Independent design practice · Guangzhou</p><div className="titleGroup"><h1><span>{title}</span></h1><p className="titleChinese">{subtitle}</p></div><span className="projectCount">{String(cases.length).padStart(2, "0")} projects</span></section><MasonryGrid cases={cases} /><footer><span>CHIM®</span><span>{footer}</span></footer></main>;
}
