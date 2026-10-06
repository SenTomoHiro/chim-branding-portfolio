import type { CaseMedia } from "./types";

// Pair consecutive Half items only within the same chapter; never reorder media.
export function pairedHalfIds(media: CaseMedia[]) {
  const paired = new Set<string>();
  for (let index = 0; index < media.length - 1; index++) {
    const left = media[index], right = media[index + 1];
    if (left.layout === "half" && right.layout === "half" && !right.section) {
      paired.add(left.id); paired.add(right.id); index++;
    }
  }
  return paired;
}
