import type { PortfolioCase } from "./types";
import { getCaseCover } from "./case-media";

export type MasonryPlacement = { column: number; ratioBefore: number; countBefore: number };
export type MasonryLayout = { placements: MasonryPlacement[]; columnTotals: { ratio: number; count: number }[] };

const GAP = 18;
const CARD_TAIL = 52;

export function createMasonryLayout(items: PortfolioCase[], columns: number, referenceWidth: number): MasonryLayout {
  const columnWidth = (referenceWidth - GAP * (columns - 1)) / columns;
  const states = Array.from({ length: columns }, () => ({ ratio: 0, count: 0, height: 0 }));
  const placements = items.map((item) => {
    const column = states.reduce((shortest, state, index) => state.height < states[shortest].height ? index : shortest, 0);
    const state = states[column];
    const placement = { column, ratioBefore: state.ratio, countBefore: state.count };
    const cover = getCaseCover(item);
    const width = cover?.width || cover?.provenance?.width || 1400;
    const height = cover?.height || cover?.provenance?.height || 1050;
    const ratio = width > 0 && height > 0 ? height / width : 0.75;
    state.ratio += ratio;
    state.count += 1;
    state.height = state.ratio * columnWidth + state.count * (CARD_TAIL + GAP) - GAP;
    return placement;
  });
  return { placements, columnTotals: states.map(({ ratio, count }) => ({ ratio, count })) };
}
