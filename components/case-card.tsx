import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import type { PortfolioCase } from "@/lib/types";

export function CaseCard({ item, index, style }: { item: PortfolioCase; index: number; style?: CSSProperties }) {
  return <article className="caseCard" data-case-id={item.id} style={style}>
    <Link href={`/work/${item.slug}`}>
      <div className="caseImage"><Image src={`${item.cover}?v=${item.coverWidth}x${item.coverHeight}`} alt="" width={item.coverWidth} height={item.coverHeight} sizes="(max-width: 767px) 100vw, (max-width: 1199px) 50vw, 33vw" priority={index < 3} /></div>
      <div className="caseMeta"><h2>{item.name}</h2><p>{item.industryPrimary} · {item.designPrimary}</p></div>
    </Link>
  </article>;
}
