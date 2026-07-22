import { test, expect } from "vitest";
import { dropArgs, insertOrder, computeReorder, insertAt } from "./boardDrag.js";

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

test("computeReorder normalizes the column so a moved item can land below an unordered tail", () => {
  // "a" and "b" have real order values; "x" and "y" are legacy items with no
  // order, so orderedColumn floats them after every ordered item regardless of
  // magnitude. Dragging "b" past them to the bottom therefore cannot be done
  // with a single numeric write (any number sorts "b" back above x and y).
  // computeReorder must instead normalize the whole column to gap-spaced orders
  // so "b" genuinely lands last, matching where it was dropped.
  const items = [
    { id: "a", order: 10 },
    { id: "b", order: 20 },
    { id: "x" },
    { id: "y" },
  ];
  const writes = computeReorder(items, "b", 4);
  expect(writes).not.toBeNull();
  expect(writes).toHaveLength(4);
  const byId = new Map(writes!.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed(items.map((i) => ({ id: i.id, order: byId.get(i.id) }))).map((i) => i.id);
  expect(resorted).toEqual(["a", "x", "y", "b"]);
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

// insertAt places a card arriving from ANOTHER column at a slot among the
// target column's existing items (the cross-column drop). Same order math as
// computeReorder, but the moved item is not part of `existing`, so there is no
// self-removal to adjust for.

test("insertAt places a cross-column card between two ordered neighbors", () => {
  const existing = [
    { id: "a", order: 1000 },
    { id: "b", order: 2000 },
    { id: "c", order: 3000 },
  ];
  const writes = insertAt(existing, "new", 2);
  expect(writes).toHaveLength(1);
  expect(writes[0]!.id).toBe("new");
  const resorted = sortDisplayed([...existing, writes[0]!]).map((i) => i.id);
  expect(resorted).toEqual(["a", "b", "new", "c"]);
});

test("insertAt appends a cross-column card to the bottom of an all-ordered column", () => {
  const existing = [
    { id: "a", order: 1000 },
    { id: "b", order: 2000 },
  ];
  const writes = insertAt(existing, "new", 2);
  expect(writes).toHaveLength(1);
  const resorted = sortDisplayed([...existing, writes[0]!]).map((i) => i.id);
  expect(resorted).toEqual(["a", "b", "new"]);
});

test("insertAt normalizes so a cross-column card can land below an unordered tail", () => {
  // The user-reported case: the target column has ordered items followed by a
  // legacy unordered item that orderedColumn always floats last. Dropping the
  // arriving card at the bottom cannot be a single numeric write (any number
  // sorts it back above the unordered item), so insertAt normalizes the whole
  // column, letting the card genuinely land last where it was dropped.
  const existing = [
    { id: "a", order: 1000 },
    { id: "b", order: 2000 },
    { id: "legacy" },
  ];
  const writes = insertAt(existing, "new", 3);
  expect(writes).toHaveLength(4);
  const byId = new Map(writes.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed(
    [...existing, { id: "new" }].map((i): { id: string; order?: number } => ({ id: i.id, order: byId.get(i.id) })),
  ).map((i) => i.id);
  expect(resorted).toEqual(["a", "b", "legacy", "new"]);
});

test("insertAt normalizes an all-unordered target column", () => {
  const existing = [{ id: "a" }, { id: "b" }];
  const writes = insertAt(existing, "new", 1);
  expect(writes).toHaveLength(3);
  const byId = new Map(writes.map((w) => [w.id, w.order]));
  const resorted = sortDisplayed(
    [...existing, { id: "new" }].map((i): { id: string; order?: number } => ({ id: i.id, order: byId.get(i.id) })),
  ).map((i) => i.id);
  expect(resorted).toEqual(["a", "new", "b"]);
});

test("insertAt places a card at the top of an all-ordered column", () => {
  const existing = [
    { id: "a", order: 1000 },
    { id: "b", order: 2000 },
  ];
  const writes = insertAt(existing, "new", 0);
  expect(writes).toHaveLength(1);
  const resorted = sortDisplayed([...existing, writes[0]!]).map((i) => i.id);
  expect(resorted).toEqual(["new", "a", "b"]);
});
