"use client";

import Image from "next/image";
import { assetPath } from "@/lib/site-path";
import { useEffect, useRef, useState } from "react";
import type { BodyAsset } from "@/lib/types";

export function RevealMedia({ media }: { media: BodyAsset }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!ref.current || matchMedia("(prefers-reduced-motion: reduce)").matches) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } }, { rootMargin: "80px 0px", threshold: 0.08 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <figure ref={ref} className={`${media.layout} revealMedia ${visible ? "isVisible" : ""}`}>{media.type === "video" ? <video src={assetPath(media.src)} controls playsInline /> : <Image src={assetPath(media.src)} alt="" width={1800} height={1200} sizes={media.layout === "half" ? "(max-width: 700px) 100vw, 50vw" : "100vw"} />}</figure>;
}
