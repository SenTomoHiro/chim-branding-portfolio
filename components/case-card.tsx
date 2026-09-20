"use client";
import Image from "next/image";
import { assetPath } from "@/lib/site-path";
import Link from "next/link";
import { ViewTransition, useEffect, useRef, useState, type CSSProperties } from "react";
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
      <ViewTransition name={`case-image-${item.id}`} share="case-morph" default="none">
        <div className="caseImage"><Image className="primaryMedia" src={assetPath(cover.src)} alt={`${caseFullTitle(item)} 案例封面`} width={cover.width || cover.provenance?.width || 1400} height={cover.height || cover.provenance?.height || 1050} sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw" priority={index < 3} />{secondary && secondaryLoaded && <img className={`secondaryMedia ${hovered ? "isActive" : ""}`} src={assetPath(secondary)} alt="" loading="lazy" decoding="async" />}</div>
      </ViewTransition>
      <div className="caseMeta"><CaseTitle item={item} /><p>{formatCaseMetadata(item)}</p></div>
    </Link>
  </article>;
}
