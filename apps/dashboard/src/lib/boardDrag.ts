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

// Integer gap between normalized slots. Midpoints of integers spaced this far
// apart stay exactly representable in a float for far more than the ~50
// same-gap inserts a column sees in practice, so repeated drops into the same
// slot do not collapse into each other before a full rebalance is warranted.
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

// orderedColumn (contentLibrary.ts) sorts every ranked item ahead of every
// unranked one, regardless of magnitude, and only falls back to id order
// among items that share ranked-ness. So a ranked neighbor is the only thing
// that can anchor a numeric midpoint; an unranked neighbor never needs one,
// because any number the moved item receives already sorts correctly against
// it. Walks outward from `from` (inclusive) in `dir` and returns the first
// ranked item, or null if the column has no ranked item on that side.
function nearestRanked(
  column: { order?: number }[],
  from: number,
  dir: 1 | -1,
): { order?: number } | null {
  for (let i = from; i >= 0 && i < column.length; i += dir) {
    const item = column[i];
    if (item && typeof item.order === "number") return item;
  }
  return null;
}

// True when no item in the column has a stored `order` yet. This is the
// real first-touch state of every existing tenant board: items predate the
// `order` field, so the column is entirely unranked until its first
// reorder. In this case neither nearestRanked walk (from either side of the
// drop) finds an anchor, so there is no ranked neighbor to take a midpoint
// against, and there is no single numeric value that can place the moved
// item between two specific still-unranked siblings: unranked items always
// sort after ranked ones, and among themselves break ties by id rather than
// by any number. The only correct fix is a one-time normalization: assign
// gap-spaced integer orders to every item in the column, in the order the
// board is currently displaying them (id order, since none are ranked yet),
// then slot the moved item at its dropped position among those values. That
// upgrades the whole column into the clean all-ranked regime, so every
// subsequent reorder is an ordinary single-item write.
function isAllUnranked(column: { order?: number }[]): boolean {
  return column.every((i) => typeof i.order !== "number");
}

// Computes the `{ id, order }` writes needed for an item dragged within its
// own column, or `null` when the drop does not actually move the item.
//
// `items` is the column in its CURRENT DISPLAYED order (the order
// orderedColumn already renders, mixing real `order` values and legacy
// items that have none) and `dropIndex` is the drop-slot position in that
// same pre-removal array. A column can mix items that have a real `order`
// with legacy items that do not; reading the new value off whichever
// immediate neighbor happens to have a numeric `order` (ignoring the other
// neighbor's actual screen position) is what produces the wrong placement.
// Instead this looks past an unranked immediate neighbor to the nearest
// ranked item on that side, since that is the only neighbor that can
// constrain where the moved item's numeric order needs to fall; unranked
// neighbors are already correctly positioned relative to any number the
// moved item receives. Ordinarily only the moved item is written; other
// items keep their existing (or absent) order and get a real one lazily on
// their own next move. The one exception is the all-unranked column
// (see isAllUnranked), which returns a write for every item as a one-time
// normalization.
export function computeReorder(
  items: { id: string; order?: number }[],
  draggedId: string,
  dropIndex: number,
): { id: string; order: number }[] | null {
  const draggedIndex = items.findIndex((i) => i.id === draggedId);
  const remaining = items.filter((i) => i.id !== draggedId);
  const adjustedIndex = draggedIndex !== -1 && draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;

  if (draggedIndex !== -1 && adjustedIndex === draggedIndex) return null;

  if (isAllUnranked(items)) {
    const reordered = [...remaining];
    reordered.splice(adjustedIndex, 0, items[draggedIndex]!);
    return reordered.map((item, i) => ({ id: item.id, order: (i + 1) * ORDER_GAP }));
  }

  const immediateBefore = remaining[adjustedIndex - 1];
  const immediateAfter = remaining[adjustedIndex];
  if (
    immediateBefore && immediateAfter &&
    typeof immediateBefore.order === "number" && typeof immediateAfter.order === "number"
  ) {
    return [{ id: draggedId, order: insertOrder(immediateBefore, immediateAfter) }];
  }

  const before = nearestRanked(remaining, adjustedIndex - 1, -1);
  const after = nearestRanked(remaining, adjustedIndex, 1);
  return [{ id: draggedId, order: insertOrder(before, after) }];
}
