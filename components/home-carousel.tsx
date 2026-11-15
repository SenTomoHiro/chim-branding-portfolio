"use client";
import { contentMediaUrl } from "@/lib/runtime-content";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { beginCoverTransition } from "@/lib/cover-transition";
import { useRef } from "react";
import { casePath } from "@/lib/case-route";
import { saveCaseListEntry } from "@/lib/return-context";
import type { PortfolioCase } from "@/lib/types";
import { caseFullTitle } from "@/lib/case-title";
import { getCaseCover } from "@/lib/case-media";
import styles from "./editorial.module.css";

export function HomeFeed({ cases }: { cases: PortfolioCase[] }) {
  return (
    <div className={`homeFeed ${styles.feed}`}>
      {cases.map((item, index) => (
        <CasePreview key={item.id} item={item} index={index} />
      ))}
    </div>
  );
}

function CasePreview({ item, index }: { item: PortfolioCase; index: number }) {
  const router = useRouter();
  const ref = useRef<HTMLElement>(null);
  const cover = getCaseCover(item)!;
  const caseNumber = String(index + 1).padStart(2, "0");
  const href = casePath(item.id);

  // 判断图片比例
  const width = cover.width || cover.provenance?.width || 1400;
  const height = cover.height || cover.provenance?.height || 1800;
  const ratio = height / width;

  const aspectClass = ratio > 1.3 ? "portrait" : ratio < 0.8 ? "landscape" : "square";

  const handleClick = (event: { preventDefault: () => void }) => {
    if (ref.current) {
      const coverElement = ref.current.querySelector<HTMLElement>(".previewCover");
      const navigate = () => {
        saveCaseListEntry(item.id, href, ref.current);
        router.push(href);
      };
      if (coverElement && beginCoverTransition(item.id, coverElement, navigate)) event.preventDefault();
      else saveCaseListEntry(item.id, href, ref.current);
    }
  };

  return (
    <article ref={ref} className={`casePreview ${styles.caseRow}`} data-case-id={item.id}>
      <Link href={href} className={styles.caseLink} onNavigate={handleClick}>
        <div className={`previewCover ${aspectClass} ${styles.coverFrame}`}>
          <img
            className={styles.coverImg}
            src={contentMediaUrl(cover.src)}
            alt={`${caseFullTitle(item)} 封面`}
            style={{ aspectRatio: `${width} / ${height}` }}
            width={width}
            height={height}
            loading={index < 2 ? "eager" : "lazy"}
            decoding="async"
          />
        </div>
        <div className={`previewInfo ${styles.info}`}>
          <span className={`caseNumber ${styles.number}`}>{caseNumber}</span>
          <h2 className={`previewTitle ${styles.title}`}>
            {item.brandName}
            {item.projectName && <span className={`caseTitleProject ${styles.project}`}>{item.projectName}</span>}
          </h2>
          <p className={`previewMeta ${styles.meta}`}>
            {item.business === "branding" ? "品牌设计" : "商业摄影"}
            {item.primaryIndustry && ` / ${item.primaryIndustry}`}
          </p>
          {item.intro && <p className={`previewIntro ${styles.intro}`}>{item.intro}</p>}
        </div>
      </Link>
    </article>
  );
}
