import { MasonryGrid } from "./masonry-grid";
import { SiteHeader } from "./site-header";
import type { PortfolioCase } from "@/lib/types";

export function CaseIndex({ cases, active = "work", title = "Selected branding works" }: { cases: PortfolioCase[]; active?: string; title?: string }) {
  return <main><SiteHeader active={active} /><section className="indexIntro"><p>Independent design practice · Guangzhou</p><h1>{title}</h1><span>{String(cases.length).padStart(2, "0")} projects</span></section><MasonryGrid cases={cases} /><footer><span>CHIM®</span><span>Brand identity · Art direction · Packaging</span></footer></main>;
}
