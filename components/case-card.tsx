"use client";
import { contentMediaUrl } from "@/lib/runtime-content";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { casePath } from "@/lib/case-route";
import { saveCaseListEntry } from "@/lib/return-context";
import { formatCaseMetadata } from "@/lib/taxonomy";
import type { PortfolioCase } from "@/lib/types";
import { caseFullTitle } from "@/lib/case-title";
import { CaseTitle } from "./case-title";
import { getCaseCover, getCaseHero } from "@/lib/case-media";

export function CaseCard({ item, index, style }: { item: PortfolioCase; index: number; style?: CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [visible, setVisible] = useState(index < 3);
  const ref = useRef<HTMLElement>(null);
  const cover = getCaseCover(item)!;
  const hero = getCaseHero(item);
  const secondary = hero?.src !== cover.src ? hero?.src : item.media.find((asset) => asset.type === "image" && asset.src !== cover.src)?.src;
  useEffect(() => {
    if (!ref.current || visible || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "100px 0px", threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  const href = casePath(item.id);
  return <article ref={ref} className={`caseCard ${visible ? "isVisible" : ""}`} data-case-id={item.id} style={{ ...style, "--reveal-delay": `${(index % 3) * 70}ms` } as CSSProperties}>
    <Link href={href} onNavigate={() => saveCaseListEntry(item.id, href, ref.current)} onPointerEnter={(event) => { if (event.pointerType !== "mouse") return; setSecondaryLoaded(true); setHovered(true); }} onPointerLeave={() => setHovered(false)}>
      <div className="caseImage"><img className="primaryMedia" src={contentMediaUrl(cover.src)} alt={`${caseFullTitle(item)} 案例封面`} width={cover.width || cover.provenance?.width || 1400} height={cover.height || cover.provenance?.height || 1050} loading={index < 3 ? "eager" : "lazy"} decoding="async" />{secondary && secondaryLoaded && <img className={`secondaryMedia ${hovered ? "isActive" : ""}`} src={contentMediaUrl(secondary)} alt="" loading="lazy" decoding="async" />}</div>
      <div className="caseMeta"><CaseTitle item={item} /><p>{formatCaseMetadata(item)}</p></div>
    </Link>
  </article>;
}
