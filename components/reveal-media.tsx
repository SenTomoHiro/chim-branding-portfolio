"use client";

import { contentMediaUrl } from "@/lib/runtime-content";
import { Fragment, useEffect, useRef, useState } from "react";
import type { CaseMedia } from "@/lib/types";

export function RevealMedia({ media, caseName }: { media: CaseMedia; caseName: string }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "80px 0px", threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <Fragment>{media.section && <header className="mediaSectionHeading"><p>{media.section.eyebrow}</p><h2>{media.section.title}</h2>{media.section.description && <span>{media.section.description}</span>}</header>}<figure ref={ref} className={`${media.layout} revealMedia ${visible ? "isVisible" : ""}`}>{media.type === "video" ? <video src={contentMediaUrl(media.src)} controls playsInline /> : <img src={contentMediaUrl(media.src)} alt={`${caseName} ${media.section?.title || "设计成果"}`} width={media.width || media.provenance?.width || 1800} height={media.height || media.provenance?.height || 1200} loading="lazy" decoding="async" />}</figure></Fragment>;
}
