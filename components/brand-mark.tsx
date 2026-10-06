import Link from "next/link";

export function BrandMark() {
  return <header className="feedMasthead"><Link href="/" className="brandMark" aria-label="CHIM 首页">CHIM<sup>®</sup></Link><span>Selected work</span></header>;
}
