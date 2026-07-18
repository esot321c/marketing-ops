import { test, expect } from "vitest";
import { dropArgs, reorderList, insertOrder, computeReorder } from "./boardDrag.js";

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
// pre-removal drop index, and returns the new order value for the dragged
// item, or null when the drop is a no-op.

test("computeReorder places the moved item between two neighbors that both already have an order", () => {
  const items = [
    { id: "a", order: 10 },
    { id: "b", order: 20 },
    { id: "c", order: 30 },
  ];
  // Drag "a" to between "b" and "c" (drop index 2 in the pre-removal array).
  const result = computeReorder(items, "a", 2);
  expect(result).not.toBeNull();
  const resorted = sortDisplayed([...items.filter((i) => i.id !== "a"), { id: "a", order: result! }]).map((i) => i.id);
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
  const result = computeReorder(items, "b", 3);
  expect(result).not.toBeNull();
  const resorted = sortDisplayed([...items.filter((i) => i.id !== "b"), { id: "b", order: result! }]).map((i) => i.id);
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
  const result = computeReorder(items, "y", 1);
  expect(result).not.toBeNull();
  const resorted = sortDisplayed([...items.filter((i) => i.id !== "y"), { id: "y", order: result! }]).map((i) => i.id);
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
