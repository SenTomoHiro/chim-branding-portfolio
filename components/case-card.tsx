import Image from "next/image";
import Link from "next/link";
import type { PortfolioCase } from "@/lib/types";

export function CaseCard({ item, index }: { item: PortfolioCase; index: number }) {
  return <article className={`caseCard card-${index % 7}`}>
    <Link href={`/work/${item.slug}`}>
      <div className="caseImage"><Image src={item.cover} alt="" fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 66vw" priority={index < 2} /></div>
      <div className="caseMeta"><h2>{item.name}</h2><p>{item.industryPrimary} · {item.designPrimary}</p></div>
    </Link>
  </article>;
}
