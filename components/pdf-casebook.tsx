import { groupBodyAssets } from "@/lib/chapters";
import { getPdfMediaInfo, type PdfMediaInfo } from "@/lib/pdf-media";
import { pdfOrientation } from "@/lib/pdf-layout";
import { caseFullTitle, caseTitleDensity } from "@/lib/case-title";
import { resolvePortfolioPdfImages } from "@/lib/pdf-portfolio";
import { assetPath } from "@/lib/site-path";
import { categoryLabel, formatCaseMetadata } from "@/lib/taxonomy";
import type { Business, CaseCategory, PortfolioCase } from "@/lib/types";

function PdfFooter({ project, page, total }: { project: string; page: number; total: number }) {
  return <footer className="pdfFooter"><span>CHIM® / {project}</span><span>{String(page).padStart(2, "0")} / {String(total).padStart(2, "0")}</span></footer>;
}

function PdfCaseContentFooter({ project, trailing }: { project: string; trailing: string }) {
  return <footer className="pdfCaseContentFooter"><span>CHIM® / {project}</span><span>{trailing}</span></footer>;
}

function PdfPage({ children, className = "", project, page, total }: { children: React.ReactNode; className?: string; project: string; page: number; total: number }) {
  return <section className={`pdfPage ${className}`} data-pdf-page={page}>{children}<PdfFooter project={project} page={page} total={total} /></section>;
}

function Picture({ image, mode = "cover" }: { image: PdfMediaInfo; mode?: "cover" | "contain" }) {
  return <img src={assetPath(image.src)} alt="" className={`pdfPicture is-${mode}`} width={image.width} height={image.height} />;
}

function EditorialTitle({ item, className = "" }: { item: PortfolioCase; className?: string }) {
  return <h1 className={`${className} ${caseTitleDensity(item)}`} aria-label={caseFullTitle(item)}><span className="pdfTitlePrimary">{item.brandName}</span>{item.projectName && <span className="pdfTitleSecondary">{item.projectName}</span>}</h1>;
}

function WaterfallColumns({ images }: { images: PdfMediaInfo[] }) {
  const columns: PdfMediaInfo[][] = [[], []];
  const heights = [0, 0];
  images.forEach((image) => {
    const column = heights[0] <= heights[1] ? 0 : 1;
    columns[column].push(image);
    heights[column] += 1 / image.ratio + .06;
  });
  return <div className="pdfLongWaterfall">{columns.map((column, index) => <div className="pdfLongWaterfallColumn" key={index}>{column.map((image) => <figure key={image.id}><Picture image={image} mode="contain" /></figure>)}</div>)}</div>;
}

export async function CasePdfDocument({ item }: { item: PortfolioCase }) {
  const hero = await getPdfMediaInfo("hero", item.hero);
  const groups = groupBodyAssets(item.bodyAssets);
  const resolvedGroups = await Promise.all(groups.map(async (group) => ({
    ...group,
    images: await Promise.all(group.assets.filter((asset) => asset.type === "image").map((asset) => getPdfMediaInfo(asset.id, asset.src))),
  })));
  return <main className="pdfDocument pdfLongDocument" data-pdf-ready="true">
    <article className="pdfLongCase">
      <header className="pdfLongHero">
        <div className="pdfLongHeroMeta" data-single-case-edge-meta="true"><b>CHIM®</b><span>Project / {item.id}</span></div>
        <Picture image={hero} mode="contain" />
      </header>
      <section className="pdfLongCaseInfo" data-single-case-info="true">
        <div><p>{formatCaseMetadata(item, true)}</p><EditorialTitle item={item} /></div>
        <p>{item.intro}</p>
      </section>
      <div className="pdfLongContent">
        {resolvedGroups.map((group) => <section className={`pdfLongChapter ${group.section ? "" : "isUnsectioned"}`} key={group.id}>
          {group.section && <header><div><p>{group.section.eyebrow}</p><h2>{group.section.title}</h2></div>{group.section.description && <p>{group.section.description}</p>}</header>}
          <WaterfallColumns images={group.images} />
        </section>)}
      </div>
      <PdfCaseContentFooter project={caseFullTitle(item)} trailing="Project casebook" />
    </article>
  </main>;
}

export async function PortfolioPdfDocument({ cases, kind, category }: { cases: PortfolioCase[]; kind: Business; category?: CaseCategory }) {
  const portfolioLabel = kind === "photography" ? "Photography Portfolio" : category ? `Design / ${categoryLabel(category)} Portfolio` : "Design Portfolio";
  const coverTitle = kind === "photography" ? <>Photography<br />Portfolio</> : category ? <>{categoryLabel(category)}<br />Portfolio</> : <>Design<br />Portfolio</>;
  const resolved = await Promise.all(cases.map(async (item) => ({ item, images: await Promise.all(resolvePortfolioPdfImages(item).map((image) => getPdfMediaInfo(image.id, image.src))) })));
  const directoryPageCount = Math.max(1, Math.ceil(cases.length / 20));
  const firstCasePage = 2 + directoryPageCount;
  const entries = resolved.map(({ item, images }, index) => ({ item, images, startPage: firstCasePage + index }));
  const total = 1 + directoryPageCount + entries.length;
  const directoryPages = Array.from({ length: directoryPageCount }, (_, index) => entries.slice(index * 20, (index + 1) * 20));
  return <main className="pdfDocument pdfPortfolioDocument" data-pdf-ready="true">
    <PdfPage className={`pdfPortfolioFrontPage pdfPortfolioCover portfolio-${kind}`} project={portfolioLabel} page={1} total={total}><div className="pdfPortfolioMark">CHIM®</div><div><p>{kind === "photography" ? "Commercial photography · Guangzhou" : "Independent design practice · Guangzhou"}</p><h1>{coverTitle}</h1></div><div className="pdfPortfolioYear">{portfolioLabel} / {new Date().getFullYear()}</div></PdfPage>
    {directoryPages.map((pageEntries, directoryIndex) => <PdfPage className="pdfPortfolioFrontPage pdfDirectory" project={portfolioLabel} page={directoryIndex + 2} total={total} key={directoryIndex}><div className="pdfKicker">Index / {String(directoryIndex + 1).padStart(2, "0")}</div><h2>Contents</h2><ol start={directoryIndex * 20 + 1}>{pageEntries.map(({ item, startPage }) => <li key={item.id}><span>{caseFullTitle(item)}</span><i /><b>{String(startPage).padStart(2, "0")}</b></li>)}</ol></PdfPage>)}
    {entries.map(({ item, images, startPage }, caseIndex) => {
      const lead = images[0];
      const leadOrientation = pdfOrientation(lead.ratio);
      return <section className="pdfPortfolioLongCase" data-portfolio-case-page={caseIndex} key={item.id}>
        <header className={`pdfPortfolioCaseLead pdfPortfolioLongLead hero-${leadOrientation}`}>
          <div className="pdfPortfolioCaseIndex" data-portfolio-case-index-label="true">{String(caseIndex + 1).padStart(2, "0")}</div>
          <div className="pdfPortfolioCaseCopy"><p data-portfolio-case-meta="true">{formatCaseMetadata(item, true)}</p><h2 aria-label={caseFullTitle(item)} className={`${caseTitleDensity(item)} ${/^[\x00-\x7F]+$/.test(item.brandName) ? "isLatinTitle" : ""}`}><span>{item.brandName}</span>{item.projectName && <small>{item.projectName}</small>}</h2><p>{item.intro}</p></div>
          <figure><Picture image={lead} mode="cover" /></figure>
        </header>
        {images.length > 1 && <div className="pdfPortfolioLongBody"><WaterfallColumns images={images.slice(1)} /></div>}
        <PdfCaseContentFooter project={caseFullTitle(item)} trailing={`${String(startPage).padStart(2, "0")} / ${String(total).padStart(2, "0")}`} />
      </section>;
    })}
  </main>;
}
