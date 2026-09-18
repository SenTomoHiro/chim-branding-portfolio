import type { CSSProperties } from "react";
import { CaseCard } from "./case-card";
import { createMasonryLayout, type MasonryLayout } from "@/lib/masonry";
import type { PortfolioCase } from "@/lib/types";

type MasonryStyle = CSSProperties & Record<`--${string}`, string | number>;
const leftValue = (column: number, columns: 2 | 3) => {
  if (column === 0) return "0px";
  if (columns === 2) return "calc(50cqw + 9px)";
  return column === 1 ? "calc(33.333cqw + 6px)" : "calc(66.667cqw + 12px)";
};
const topValue = (ratio: number, count: number, columns: 1 | 2 | 3) => {
  if (columns === 1) return `calc(${ratio * 100}cqw + ${count * 70}px)`;
  if (columns === 2) return `calc(${ratio * 50}cqw + ${count * 70 - ratio * 9}px)`;
  return `calc(${ratio * (100 / 3)}cqw + ${count * 70 - ratio * 12}px)`;
};
const heightValue = (ratio: number, count: number, columns: 1 | 2 | 3) => {
  const finalGap = count ? 18 : 0;
  if (columns === 1) return `calc(${ratio * 100}cqw + ${count * 70 - finalGap}px)`;
  if (columns === 2) return `calc(${ratio * 50}cqw + ${count * 70 - ratio * 9 - finalGap}px)`;
  return `calc(${ratio * (100 / 3)}cqw + ${count * 70 - ratio * 12 - finalGap}px)`;
};
const layoutHeight = (layout: MasonryLayout, columns: 1 | 2 | 3) => `max(${layout.columnTotals.map((column) => heightValue(column.ratio, column.count, columns)).join(", ")})`;

export function MasonryGrid({ cases }: { cases: PortfolioCase[] }) {
  const three = createMasonryLayout(cases, 3, 1370);
  const two = createMasonryLayout(cases, 2, 980);
  const one = createMasonryLayout(cases, 1, 390);
  const containerStyle: MasonryStyle = {
    "--height-3": layoutHeight(three, 3),
    "--height-2": layoutHeight(two, 2),
    "--height-1": layoutHeight(one, 1),
  };
  return <section className="masonryViewport" aria-label="案例作品"><div className="masonryGrid" style={containerStyle}>{cases.map((item, index) => {
    const p3 = three.placements[index]; const p2 = two.placements[index]; const p1 = one.placements[index];
    const style: MasonryStyle = {
      "--top-3": topValue(p3.ratioBefore, p3.countBefore, 3), "--left-3": leftValue(p3.column, 3),
      "--top-2": topValue(p2.ratioBefore, p2.countBefore, 2), "--left-2": leftValue(p2.column, 2),
      "--top-1": topValue(p1.ratioBefore, p1.countBefore, 1),
    };
    return <CaseCard key={item.id} item={item} index={index} style={style} />;
  })}</div></section>;
}
