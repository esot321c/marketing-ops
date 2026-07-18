import type { ContentState } from "./contentTypes";

export function dropArgs(
  source: ContentState,
  target: ContentState,
  today: string,
): { to: ContentState; date?: string } | null {
  if (source === target) return null;
  return target === "scheduled" ? { to: target, date: today } : { to: target };
}

// Moves the entry at `from` to sit at `to` in a copy of `order`, leaving the
// array unchanged when the indices are equal or out of range. Used for both
// column reordering and (conceptually) any other freely-reordered list.
export function reorderList<T>(order: T[], from: number, to: number): T[] {
  if (from < 0 || from >= order.length || to < 0 || to >= order.length || from === to) {
    return [...order];
  }
  const next = [...order];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

const ORDER_GAP = 1000;

// Computes a new `order` value for an item dropped between `before` and
// `after` (either may be absent, meaning the drop is at the start/end of the
// column). Falls back to a stable gap-based value when neighbors lack an
// `order` so the moved item still lands in the right slot relative to them.
export function insertOrder(
  before: { order?: number } | null | undefined,
  after: { order?: number } | null | undefined,
): number {
  const beforeOrder = before?.order;
  const afterOrder = after?.order;
  if (typeof beforeOrder === "number" && typeof afterOrder === "number") {
    return (beforeOrder + afterOrder) / 2;
  }
  if (typeof beforeOrder === "number") return beforeOrder + ORDER_GAP;
  if (typeof afterOrder === "number") return afterOrder - ORDER_GAP;
  return 0;
}
