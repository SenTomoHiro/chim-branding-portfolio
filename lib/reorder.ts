export type Identified = { id: string };

export function moveIdToIndex<T extends Identified>(items: readonly T[], activeId: string, toIndex: number): T[] {
  const fromIndex = items.findIndex((item) => item.id === activeId);
  if (fromIndex < 0 || toIndex < 0 || toIndex >= items.length || fromIndex === toIndex) return [...items];
  const next = [...items];
  const [active] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, active);
  return next;
}

export function moveIdOver<T extends Identified>(items: readonly T[], activeId: string, overId: string): T[] {
  const overIndex = items.findIndex((item) => item.id === overId);
  return overIndex < 0 ? [...items] : moveIdToIndex(items, activeId, overIndex);
}

export function moveIdByOffset<T extends Identified>(items: readonly T[], activeId: string, offset: -1 | 1): T[] {
  const fromIndex = items.findIndex((item) => item.id === activeId);
  return fromIndex < 0 ? [...items] : moveIdToIndex(items, activeId, fromIndex + offset);
}
