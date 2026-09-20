"use client";
import Image from "next/image";
import { assetPath } from "@/lib/site-path";
import Link from "next/link";
import { ViewTransition, useEffect, useRef, useState, type CSSProperties } from "react";
import { casePath } from "@/lib/case-route";
import { saveCaseListEntry } from "@/lib/return-context";
import { formatCaseMetadata } from "@/lib/taxonomy";
import type { PortfolioCase } from "@/lib/types";

export function CaseCard({ item, index, style }: { item: PortfolioCase; index: number; style?: CSSProperties }) {
  const [hovered, setHovered] = useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [visible, setVisible] = useState(index < 3);
  const ref = useRef<HTMLElement>(null);
  const secondary = item.hero !== item.cover ? item.hero : item.bodyAssets.find((asset) => asset.type === "image" && asset.src !== item.cover)?.src;
  useEffect(() => {
    if (!ref.current || visible || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "100px 0px", threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [visible]);
  const href = casePath(item.name);
  return <article ref={ref} className={`caseCard ${visible ? "isVisible" : ""}`} data-case-id={item.id} style={{ ...style, "--reveal-delay": `${(index % 3) * 70}ms` } as CSSProperties}>
    <Link href={href} onNavigate={() => saveCaseListEntry(item.id, href, ref.current)} onPointerEnter={(event) => { if (event.pointerType !== "mouse") return; setSecondaryLoaded(true); setHovered(true); }} onPointerLeave={() => setHovered(false)}>
      <ViewTransition name={`case-image-${item.id}`} share="case-morph" default="none">
        <div className="caseImage"><Image className="primaryMedia" src={`${assetPath(item.cover)}?v=${item.coverWidth}x${item.coverHeight}`} alt="" width={item.coverWidth} height={item.coverHeight} sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw" priority={index < 3} />{secondary && secondaryLoaded && <img className={`secondaryMedia ${hovered ? "isActive" : ""}`} src={assetPath(secondary)} alt="" loading="lazy" decoding="async" />}</div>
      </ViewTransition>
      <div className="caseMeta"><h2>{item.name}</h2><p>{formatCaseMetadata(item)}</p></div>
    </Link>
  </article>;
}
