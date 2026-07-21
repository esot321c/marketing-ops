import { test, expect } from "vitest";
import {
  dropArgs, reorderList, insertOrder, computeReorder,
  columnDragId, columnStateFromDragId, columnBodyDropId, columnStateFromBodyDropId,
  resolveItemDropTarget,
} from "./boardDrag.js";

// Mirrors contentLibrary's orderedColumn comparator (ordered items sort by
// value and always precede unordered ones, which sort by id) so these tests
// can assert on the same displayed order the board reload would produce,
// without depending on the full ContentItem shape.
function sortDisplayed<T extends { id: string; order?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aOrdered = typeof a.order === "number";
    const bOrdered = typeof b.order === "number";
    if (aOrdered && bOrdered) {
      if (a.order !== b.order) return a.order! - b.order!;
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    }
    if (aOrdered !== bOrdered) return aOrdered ? -1 : 1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

test("dropArgs no-ops when the card is dropped on its own column", () => {
  expect(dropArgs("idea", "idea", "2026-07-10")).toBeNull();
});

test("dropArgs defaults the date to today when moving to scheduled", () => {
  expect(dropArgs("approved", "scheduled", "2026-07-10")).toEqual({ to: "scheduled", date: "2026-07-10" });
});

test("dropArgs omits the date for non-scheduled targets", () => {
  expect(dropArgs("idea", "approved", "2026-07-10")).toEqual({ to: "approved" });
});

test("reorderList moves an entry earlier in the list", () => {
  expect(reorderList(["a", "b", "c", "d"], 3, 1)).toEqual(["a", "d", "b", "c"]);
});

test("reorderList moves an entry later in the list", () => {
  expect(reorderList(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
});

test("reorderList is a no-op when from equals to", () => {
  const order = ["a", "b", "c"];
  const next = reorderList(order, 1, 1);
  expect(next).toEqual(order);
  expect(next).not.toBe(order);
});

test("reorderList returns a copy unchanged for out-of-range indices", () => {
  const order = ["a", "b", "c"];
  expect(reorderList(order, -1, 1)).toEqual(order);
  expect(reorderList(order, 0, 9)).toEqual(order);
});

test("insertOrder takes the midpoint of two ordered neighbors", () => {
  expect(insertOrder({ order: 10 }, { order: 20 })).toBe(15);
});

test("insertOrder drops at the start of the column", () => {
  expect(insertOrder(null, { order: 20 })).toBe(20 - 1000);
});

test("insertOrder drops at the end of the column", () => {
  expect(insertOrder({ order: 20 }, null)).toBe(20 + 1000);
});

test("insertOrder falls back to zero when neither neighbor has an order", () => {
  expect(insertOrder({}, {})).toBe(0);
});

test("insertOrder anchors off the ordered neighbor when the other lacks one", () => {
  expect(insertOrder({ order: 5 }, {})).toBe(5 + 1000);
  expect(insertOrder({}, { order: 5 })).toBe(5 - 1000);
});

// computeReorder takes the column's items in CURRENT DISPLAYED order (as
// orderedColumn already renders them), the id of the dragged item, and the
// pre-removal drop index, and returns the list of { id, order } writes needed
// to realize the drop, or null when the drop is a no-op. Ordinary drops in a
// column that already has a ranked neighbor on one side of the slot need
// only write the moved item, so the array has a single entry.

test("computeReorder places the moved item between two neighbors that both already have an order", () => {
  const items = [
    { id: "a", order: 10 },
    { id: "b", order: 20 },
    { id: "c", order: 30 },
  ];
  // Drag "a" to between "b" and "c" (drop index 2 in the pre-removal array).
  const writes = computeReorder(items, "a", 2);
  expect(writes).not.toBeNull();
  expect(writes).toHaveLength(1);
  const byId = new Map(writes!.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed([...items.filter((i) => i.id !== "a"), { id: "a", order: byId.get("a")! }]).map((i) => i.id);
  expect(resorted).toEqual(["b", "a", "c"]);
});

test("computeReorder gives a moved ordered item a value that still sorts ahead of the unordered tail it was dropped into", () => {
  // "a" and "b" have real order values; "x" and "y" are legacy items with no
  // order, so orderedColumn already displays them after "a" and "b". Any
  // numeric order sorts ahead of an absent one, so dropping "b" among the
  // unordered tail can only land it right after the last ordered neighbor,
  // never literally between two still-unordered siblings.
  const items = [
    { id: "a", order: 10 },
    { id: "b", order: 20 },
    { id: "x" },
    { id: "y" },
  ];
  const writes = computeReorder(items, "b", 3);
  expect(writes).not.toBeNull();
  expect(writes).toHaveLength(1);
  const byId = new Map(writes!.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed([...items.filter((i) => i.id !== "b"), { id: "b", order: byId.get("b")! }]).map((i) => i.id);
  expect(resorted).toEqual(["a", "b", "x", "y"]);
});

test("computeReorder sorts a moved unordered (legacy) item to sit between two ordered neighbors", () => {
  // Displayed order: a, b, x, y (x, y unordered, trailing). Drag "y" to sit
  // between "a" and "b".
  const items = [
    { id: "a", order: 10 },
    { id: "b", order: 20 },
    { id: "x" },
    { id: "y" },
  ];
  const writes = computeReorder(items, "y", 1);
  expect(writes).not.toBeNull();
  expect(writes).toHaveLength(1);
  const byId = new Map(writes!.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed([...items.filter((i) => i.id !== "y"), { id: "y", order: byId.get("y")! }]).map((i) => i.id);
  expect(resorted).toEqual(["a", "y", "b", "x"]);
});

test("computeReorder returns null for a true no-op drop (item dropped back on its own slot)", () => {
  const items = [
    { id: "a", order: 10 },
    { id: "b", order: 20 },
    { id: "c", order: 30 },
  ];
  // "b" is already at index 1; dropping it back at index 1 is a no-op.
  expect(computeReorder(items, "b", 1)).toBeNull();
});

test("computeReorder returns null when a single-item column is dropped on itself", () => {
  const items = [{ id: "only", order: 10 }];
  expect(computeReorder(items, "only", 0)).toBeNull();
});

test("computeReorder returns null when dropped at the end but the item is already last", () => {
  const items = [
    { id: "a", order: 10 },
    { id: "b", order: 20 },
  ];
  expect(computeReorder(items, "b", 2)).toBeNull();
});

// First-touch case: no item in the column has a stored `order` yet (the real
// state of every existing tenant board before its first reorder). Neither
// nearestRanked walk finds an anchor, so there is no ranked neighbor to take
// a midpoint against. Dropping the moved item among still-unranked siblings
// can only be expressed by giving every item in the column a fresh
// gap-spaced order in its current displayed order (id order, since none are
// ranked), because unranked items always sort after ranked ones and by id
// among themselves. That means a first-touch reorder is a one-time
// normalization: it returns a write for every item in the column, not just
// the moved one.

test("computeReorder normalizes an all-unordered column when dragging to the end", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const writes = computeReorder(items, "a", 3);
  expect(writes).not.toBeNull();
  const byId = new Map(writes!.map((w) => [w.id, w.order]));
  expect(byId.size).toBe(3);
  const resorted = sortDisplayed(items.map((i) => ({ id: i.id, order: byId.get(i.id) }))).map((i) => i.id);
  expect(resorted).toEqual(["b", "c", "a"]);
});

test("computeReorder normalizes an all-unordered column when dragging to the middle", () => {
  const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
  // Drop "a" between "b" and "c" (drop index 2 in the pre-removal array).
  const writes = computeReorder(items, "a", 2);
  expect(writes).not.toBeNull();
  const byId = new Map(writes!.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed(items.map((i) => ({ id: i.id, order: byId.get(i.id) }))).map((i) => i.id);
  expect(resorted).toEqual(["b", "a", "c"]);
});

test("computeReorder normalizes a 2-item all-unordered column when dragging to the end", () => {
  const items = [{ id: "a" }, { id: "b" }];
  const writes = computeReorder(items, "a", 2);
  expect(writes).not.toBeNull();
  const byId = new Map(writes!.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed(items.map((i) => ({ id: i.id, order: byId.get(i.id) }))).map((i) => i.id);
  expect(resorted).toEqual(["b", "a"]);
});

// dnd-kit shares one DndContext for column headers and cards, so ids need a
// namespace prefix. columnDragId/columnBodyDropId round-trip through their
// matching parsers and reject ids from the other namespace or unrelated ids.

test("columnDragId round-trips through columnStateFromDragId", () => {
  expect(columnStateFromDragId(columnDragId("idea"))).toBe("idea");
});

test("columnStateFromDragId returns null for a non-column id", () => {
  expect(columnStateFromDragId("idea-1")).toBeNull();
  expect(columnStateFromDragId(columnBodyDropId("idea"))).toBeNull();
});

test("columnBodyDropId round-trips through columnStateFromBodyDropId", () => {
  expect(columnStateFromBodyDropId(columnBodyDropId("parked"))).toBe("parked");
});

test("columnStateFromBodyDropId returns null for a non-body id", () => {
  expect(columnStateFromBodyDropId("parked-1")).toBeNull();
  expect(columnStateFromBodyDropId(columnDragId("parked"))).toBeNull();
});

// resolveItemDropTarget turns a dnd-kit `over.id` into the column + index
// pair the rest of the drop pipeline (computeReorder, handleItemDrop) expects.

test("resolveItemDropTarget finds the index of a card id within its column", () => {
  const board = { idea: [{ id: "a" }, { id: "b" }, { id: "c" }], drafting: [] };
  expect(resolveItemDropTarget(board, "b")).toEqual({ column: "idea", index: 1 });
});

test("resolveItemDropTarget resolves a column body id to the end of that column", () => {
  const board = { idea: [{ id: "a" }, { id: "b" }], drafting: [] };
  expect(resolveItemDropTarget(board, columnBodyDropId("idea"))).toEqual({ column: "idea", index: 2 });
});

test("resolveItemDropTarget resolves an empty column's body id to index 0", () => {
  const board = { idea: [{ id: "a" }], drafting: [] };
  expect(resolveItemDropTarget(board, columnBodyDropId("drafting"))).toEqual({ column: "drafting", index: 0 });
});

test("resolveItemDropTarget returns null for an id that matches no card or column body", () => {
  const board = { idea: [{ id: "a" }], drafting: [] };
  expect(resolveItemDropTarget(board, "nonexistent")).toBeNull();
});
